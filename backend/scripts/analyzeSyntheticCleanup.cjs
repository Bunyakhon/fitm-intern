// Phase A offline dependency analysis + read-only storage inspection/backup.
// Intentionally has no Database connection and no apply/delete implementation.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { pipeline } = require('node:stream/promises');
const root = path.resolve(__dirname, '../..');
if (process.argv.length !== 3 || !path.isAbsolute(process.argv[2] || '')) throw Error('EXPLICIT_PRIVATE_OUTPUT_DIRECTORY_REQUIRED');
const folder = path.resolve(process.argv[2]);
if (folder.toLowerCase() === root.toLowerCase() || folder.toLowerCase().startsWith(root.toLowerCase() + path.sep)) throw Error('PRIVATE_ARTIFACTS_MUST_BE_OUTSIDE_REPOSITORY');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const json = file => JSON.parse(fs.readFileSync(path.join(folder, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(folder, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const x = json('inventory.private.json');
const idFor = (marker, key) => { const h = hash(`${marker}:${key}`); return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`; };
const nodes = new Map(), byTable = new Map();
for (const table of x.tables) {
  const pk = x.keys.find(k => k.table_name === table.name && k.contype === 'p');
  if (!pk) throw Error('TABLE_WITHOUT_PRIMARY_KEY_STOP');
  const values = x.rows[table.name].map(row => {
    const key = Object.fromEntries(pk.columns.map(c => [c,row.data[c]]));
    const node = { table: table.name, key, ref: `${table.name}:${JSON.stringify(key)}`, data: row.data, fingerprint: row.fingerprint, uuid_refs: row.uuid_refs || [] };
    nodes.set(node.ref,node); return node;
  });
  byTable.set(table.name,values);
}
const fkEdges = [];
for (const fk of x.keys.filter(k => k.contype === 'f' && k.parent_schema === 'public')) {
  const parents = new Map(byTable.get(fk.parent_table).map(n => [JSON.stringify(fk.parent_columns.map(c => n.data[c])),n]));
  for (const child of byTable.get(fk.table_name)) {
    const values = fk.columns.map(c => child.data[c]); if (values.some(v => v == null)) continue;
    const parent = parents.get(JSON.stringify(values));
    if (parent) fkEdges.push({ child: child.ref, parent: parent.ref, constraint: fk.name, action: fk.delete_action });
  }
}
const uuidIndex = new Map();
for (const n of nodes.values()) for (const id of Object.values(n.key)) if (typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)) { if (!uuidIndex.has(id)) uuidIndex.set(id,[]); uuidIndex.get(id).push(n); }
const logicalEdges = [];
for (const n of nodes.values()) for (const id of n.uuid_refs) for (const parent of uuidIndex.get(id) || []) {
  if (n.ref !== parent.ref && !fkEdges.some(e => e.child === n.ref && e.parent === parent.ref)) logicalEdges.push({ child: n.ref, parent: parent.ref, relation: 'UUID_REFERENCE_REVIEWED_AS_POTENTIAL_DEPENDENCY' });
}
function closure(seed, edges, upward = false) {
  const result = new Set(seed); let changed = true;
  while (changed) { changed = false; for (const e of edges) {
    const from = upward ? e.child : e.parent, to = upward ? e.parent : e.child;
    if (result.has(from) && !result.has(to)) { result.add(to); changed = true; }
  } }
  return result;
}
const studentNode = id => byTable.get('students').find(n => n.data.id === id);
const combined = [...fkEdges,...logicalEdges];
const evidence = new Map(), receiptIds = new Set();
const receiptSummaries = [];
for (const receipt of x.receipts) {
  const rawText = fs.readFileSync(path.join(root,'.local-dev-accounts',receipt.name),'utf8'), raw = JSON.parse(rawText);
  if (hash(rawText) !== receipt.file_sha256 || raw.status !== 'COMMITTED' || raw.database !== 'intern_system') throw Error('COMMITTED_RECEIPT_TARGET_OR_DIGEST_CHANGED');
  receiptSummaries.push({ name: receipt.name, sha256: receipt.file_sha256, marker: receipt.marker, committed_rows: receipt.rows.length });
  for (const r of receipt.rows) receiptIds.add(`${r.table}:${r.id}`);
  const size = receipt.marker === 'fitm.teacher-demo.v1' ? 15 : receipt.marker === 'fitm.teacher-search.v1' ? 35 : 0;
  for (let i = 0; i < size; i++) {
    const slot = String(i+1).padStart(2,'0'), id = idFor(receipt.marker,`student:${slot}`);
    const student = x.students.find(s => s.id === id);
    const code = String((size === 15 ? 9906990000001 : 9906980000001) + i);
    if (!student || student.student_id !== code || student.email !== `${receipt.marker}.student${slot}@email.kmutnb.ac.th`
      || !receiptIds.has(`students:${id}`) || id === x.protected_student.id) throw Error('SYNTHETIC_STUDENT_EVIDENCE_MISMATCH_STOP');
    evidence.set(id, { category: 'VERIFIED_SYNTHETIC', dataset: size === 15 ? 'TEACHER_DEMO_15' : 'SYNTHETIC_35', marker: receipt.marker,
      receipt_sha256: receipt.file_sha256, deterministic_uuid_verified: true, student_code_verified: true, marker_email_verified: true });
  }
}
const roster = x.students.map(s => ({ id: s.id, student_id: s.student_id, name: [s.first_name,s.last_name].filter(Boolean).join(' '),
  ...(s.id === x.protected_student.id ? { category:'PROTECTED_STUDENT',reason:'EXPLICIT_USER_PROTECTION' } : evidence.get(s.id) || {category:'REAL_OR_UNKNOWN',reason:'NO_INDEPENDENT_COMMITTED_SYNTHETIC_PROVENANCE_DO_NOT_DELETE'}) }));
const protectedOwned = closure([studentNode(x.protected_student.id).ref],combined);
const unknownOwned = closure(roster.filter(s => s.category === 'REAL_OR_UNKNOWN').map(s => studentNode(s.id).ref),combined);
const candidateOwned = closure([...evidence.keys()].map(id => studentNode(id).ref),combined);
const alwaysKeepTables = new Set(['teachers','department_staffs','super_admins','admin_account_controls','admin_audit_logs','google_auth_requests',
  'coop_academic_periods','coop_prerequisite_catalog_courses','coop_prerequisite_catalog_grants','coop_prerequisite_catalog_programs']);
const protectedIdentity = new Set([...nodes.values()].filter(n => alwaysKeepTables.has(n.table)
  || (n.table === 'google_identities' && n.data.actor_type !== 'student')).map(n => n.ref));
// Upward traversal retains shared parents; never expand all children of a
// protected Teacher or shared catalog, which would absorb every student's data.
const retain = closure([...protectedOwned,...unknownOwned,...protectedIdentity],fkEdges,true);
const desired = new Set(candidateOwned);
for (const n of nodes.values()) if (['companies','job_submissions','job_postings','job_posting_work_modes'].includes(n.table) && receiptIds.has(`${n.table}:${n.data.id}`)) desired.add(n.ref);
const shared = [];
for (const ref of [...desired]) if (retain.has(ref)) { shared.push({ref,reason:'PROTECTED_UNKNOWN_OR_ACCOUNT_REFERENCE'}); desired.delete(ref); }
let changed = true;
while (changed) {
  changed = false;
  for (const ref of [...desired]) if (['companies','job_submissions','job_postings','job_posting_work_modes'].includes(nodes.get(ref).table)) {
    const outside = combined.filter(e => e.parent === ref && !desired.has(e.child));
    if (outside.length) { desired.delete(ref); retain.add(ref); shared.push({ref,reason:'REFERENCED_OUTSIDE_TARGET_SET',references:outside}); changed = true; }
  }
}
const immutableTables = new Set(x.triggers.filter(t => t.enabled !== 'D' && /\bDELETE\b/.test(t.definition)
  && /RAISE EXCEPTION/.test(t.function_definition)).map(t => t.table_name));
const blockers = x.triggers.filter(t => t.enabled !== 'D' && /\bDELETE\b/.test(t.definition) && /RAISE EXCEPTION/.test(t.function_definition))
  .map(t => ({type:'IMMUTABLE_TRIGGER',table:t.table_name,trigger:t.name,candidate_rows:[...desired].filter(ref=>nodes.get(ref).table===t.table_name).length,definition:t.definition,function_definition:t.function_definition}));
const retainedChild = fkEdges.filter(e => desired.has(e.parent) && !desired.has(e.child));
const blockedStudents = [];
for (const id of evidence.keys()) {
  const descendants = closure([studentNode(id).ref],combined);
  const immutable = [...descendants].filter(ref => desired.has(ref) && immutableTables.has(nodes.get(ref).table));
  if (immutable.length || retain.has(studentNode(id).ref)) blockedStudents.push({id,reason:immutable.length?'IMMUTABLE_DESCENDANTS':'PROTECTED_SHARED_REFERENCE',immutable_rows:immutable.length});
}
const counts = x.tables.map(t=>({table:t.name,total:byTable.get(t.name).length,
  candidate_intent:[...desired].filter(ref=>nodes.get(ref).table===t.name).length,
  preserve_after_proposed_cleanup:byTable.get(t.name).filter(n=>!desired.has(n.ref)).length,
  protected_student_owned:byTable.get(t.name).filter(n=>protectedOwned.has(n.ref)).length,
  immutable_candidate_rows:byTable.get(t.name).filter(n=>desired.has(n.ref)&&immutableTables.has(n.table)).length}));
const compact = refs => [...refs].sort().map(ref=>{ const n=nodes.get(ref); return {table:n.table,key:n.key,fingerprint_sha256:n.fingerprint}; });
async function docker(args, input, destination) {
  const child=spawn('docker',args,{windowsHide:true,stdio:['pipe','pipe','pipe']}); let text='';child.stderr.on('data',()=>{});
  const complete=new Promise((resolve,reject)=>{child.on('error',()=>reject(Error('DOCKER_UNAVAILABLE')));child.on('close',code=>code===0?resolve():reject(Error('STORAGE_BACKUP_COMMAND_FAILED')));});
  if(input)child.stdin.end(input);else child.stdin.end();
  if(destination)await Promise.all([complete,pipeline(child.stdout,fs.createWriteStream(destination,{flags:'wx',mode:0o600}))]);
  else {child.stdout.on('data',chunk=>{text+=chunk;});await complete;}return text;
}
async function main(){
  const referenced = [];
  for(const n of nodes.values())for(const field of ['storage_path','file_path'])if(n.data[field])referenced.push({ref:n.ref,path:n.data[field],protected:retain.has(n.ref)||!desired.has(n.ref),protected_student:protectedOwned.has(n.ref)});
  const script = `const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const root=fs.realpathSync(path.resolve(process.env.STORAGE_ROOT||'/app/storage'));const wanted=new Set(${JSON.stringify(referenced.map(r=>r.path))});
    function walk(folder){if(!fs.existsSync(folder))return;for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const full=path.join(folder,entry.name);if(entry.isSymbolicLink())throw Error('SYMLINK_REQUIRES_REVIEW');if(entry.isDirectory())walk(full);else if(entry.isFile())wanted.add(path.relative(root,full).split(path.sep).join('/'));}}
    walk(path.join(root,'students'));const files=[];for(const relative of [...wanted].sort()){const full=path.resolve(root,relative),part=path.relative(root,full);if(!part||part.startsWith('..')||path.isAbsolute(part))throw Error('OUTSIDE_STORAGE_ROOT');if(!fs.existsSync(full)){files.push({path:relative,exists:false});continue;}const real=fs.realpathSync(full);if(real!==full)throw Error('SYMLINK_REQUIRES_REVIEW');const bytes=fs.readFileSync(real);files.push({path:relative,exists:true,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}console.log(JSON.stringify({root,files}));`;
  const physical=JSON.parse(await docker(['exec','-i','intern_backend','node'],script));
  const targetIds=new Set(evidence.keys());
  const files=physical.files.map(file=>{const refs=referenced.filter(r=>r.path===file.path),owner=/^students\/([^/]+)\//.exec(file.path)?.[1];
    return {...file,references:refs.map(r=>r.ref),protected_student:owner===x.protected_student.id||refs.some(r=>r.protected_student),
      disposition:owner===x.protected_student.id||refs.some(r=>r.protected)?'PRESERVE':targetIds.has(owner)?'SEPARATE_POST_COMMIT_APPROVAL_REQUIRED':'PRESERVE_UNKNOWN',delete_authorized:false};});
  const backupPaths=files.filter(f=>f.exists).map(f=>f.path);
  const storageFile=path.join(folder,'student-storage.tar');
  if(backupPaths.length)await docker(['exec','intern_backend','tar','-C',physical.root,'-cf','-',...backupPaths],null,storageFile);
  const storageHash=crypto.createHash('sha256');if(backupPaths.length)for await(const chunk of fs.createReadStream(storageFile))storageHash.update(chunk);
  const fileManifest={phase:'A_ONLY_NO_FILE_DELETE',container:'intern_backend',storage_root:physical.root,files,
    backup:backupPaths.length?{file:storageFile,files:backupPaths.length,bytes:fs.statSync(storageFile).size,sha256:storageHash.digest('hex')}:null};
  write('file-cleanup.private.json',fileManifest);
  const fileManifestDigest=hash(fs.readFileSync(path.join(folder,'file-cleanup.private.json')));
  const manifest={version:1,phase:'A_REVIEW_ONLY',created_at:new Date().toISOString(),target:x.target,protected_student:x.protected_student,
    identities:x.identity_counts,roster,receipt_evidence:receiptSummaries,protected_baseline:compact(retain),protected_student_owned_baseline:compact(protectedOwned),
    all_rows_baseline:compact(new Set(nodes.keys())),schema_sha256:hash(JSON.stringify({keys:x.keys,triggers:x.triggers,columns:x.columns})),
    target_students:[...evidence.keys()].sort(),candidate_intent:compact(desired),per_table:counts,shared_preserved:shared,
    foreign_keys:x.keys.filter(k=>k.contype==='f'),fk_row_edges:fkEdges,logical_uuid_edges:logicalEdges,external_references:x.external_references,
    immutable_blockers:blockers,retained_child_blockers:retainedChild,blocked_students:blockedStudents,
    apply_ready:false,apply_authorized:false,database_deletes:0,file_cleanup_manifest_sha256:fileManifestDigest,backup:json('backup.private.json')};
  write('cleanup-manifest.private.json',manifest);write('student-roster.private.json',roster);
  const manifestHash=hash(fs.readFileSync(path.join(folder,'cleanup-manifest.private.json')));
  write('manifest-digests.private.json',{manifest_sha256:manifestHash,file_manifest_sha256:hash(fs.readFileSync(path.join(folder,'file-cleanup.private.json'))),inventory_sha256:hash(fs.readFileSync(path.join(folder,'inventory.private.json')))});
  const summary={target:x.target,protected_student:x.protected_student,identities:x.identity_counts,
    students:{total:roster.length,protected:1,demo15:roster.filter(r=>r.dataset==='TEACHER_DEMO_15').length,synthetic35:roster.filter(r=>r.dataset==='SYNTHETIC_35').length,verified_test:0,real_or_unknown:roster.filter(r=>r.category==='REAL_OR_UNKNOWN').length},
    per_table:counts,candidate_rows:desired.size,protected_student_owned_rows:protectedOwned.size,protected_baseline_rows:retain.size,
    shared_preserved:shared.map(s=>({table:nodes.get(s.ref).table,reason:s.reason})),
    immutable_blockers:blockers.filter(b=>b.candidate_rows).map(({table,trigger,candidate_rows})=>({table,trigger,candidate_rows})),
    blocked_students:blockedStudents.length,retained_child_blockers:retainedChild.length,external_references:x.external_references.length,
    files:{total:files.length,protected_student:files.filter(f=>f.protected_student).length,missing:files.filter(f=>!f.exists).length,post_commit_candidates:files.filter(f=>f.disposition==='SEPARATE_POST_COMMIT_APPROVAL_REQUIRED').length,backup:fileManifest.backup},
    manifest_sha256:manifestHash,backup:manifest.backup,apply_ready:false,database_deletes:0};
  write('summary.safe.json',summary);console.log(JSON.stringify(summary,null,2));
}
main().catch(error=>{console.error(JSON.stringify({error:error.message,database_deletes:0}));process.exitCode=1;});
