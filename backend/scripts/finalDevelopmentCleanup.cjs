// Explicit one-shot Development maintenance. Never imported by application startup.
// Private artifacts contain IDs/fingerprints; no credentials or personal rows are logged.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { pipeline } = require('node:stream/promises');
const { Client } = require('pg');
const root = path.resolve(__dirname, '../..');
const env = require('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
const folder = 'C:/Users/suran/Documents/FITM-INTERN-Backups/final-cleanup-20261112';
const previous = 'C:/Users/suran/Documents/FITM-INTERN-Backups/cleanup-phase-a-20261112-000024/approved-review';
const protectedId = 'aaf35e5d-d7a6-43ef-b86b-afaefb95730a';
const copyName = 'intern_cleanup_final_20261112';
const mode = process.argv[2];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const q = value => '"' + value.replace(/"/g, '""') + '"';
const literal = value => "'" + String(value).replace(/'/g, "''") + "'";
const assert = (condition, code) => { if (!condition) throw Object.assign(new Error(code), { safeCode: code }); };
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(folder, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const publicLog = value => console.log(JSON.stringify(value));
const cfg = database => ({ host: env.DB_HOST === 'postgres' ? '127.0.0.1' : env.DB_HOST,
  port: Number(env.DB_PORT), database, user: env.DB_USER, password: env.DB_PASSWORD,
  connectionTimeoutMillis: 5000, application_name: 'fitm_final_development_cleanup' });
async function connect(database) { const c = new Client(cfg(database)); await c.connect(); return c; }
async function docker(args, inputFile, outputFile, inputText) {
  const child = spawn('docker', args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let result = '';
  child.stderr.on('data', () => {});
  child.stdin.on('error', () => {});
  const done = new Promise((resolve, reject) => {
    child.on('error', () => reject(Object.assign(new Error('DOCKER_UNAVAILABLE'), { safeCode: 'DOCKER_UNAVAILABLE' })));
    child.on('close', code => code === 0 ? resolve() : reject(Object.assign(new Error('DOCKER_COMMAND_FAILED'), { safeCode: 'DOCKER_COMMAND_FAILED' })));
  });
  const input = inputFile ? pipeline(fs.createReadStream(inputFile), child.stdin) : Promise.resolve(child.stdin.end(inputText));
  if (outputFile) await Promise.all([done, input, pipeline(child.stdout, fs.createWriteStream(outputFile, { flags: 'wx', mode: 0o600 }))]);
  else { child.stdout.on('data', data => { result += data; }); await Promise.all([done, input]); }
  return result;
}
async function hashFile(file) { const h = crypto.createHash('sha256'); for await (const chunk of fs.createReadStream(file)) h.update(chunk); return h.digest('hex'); }
async function backendNode(code) { return JSON.parse(await docker(['exec', '-i', 'intern_backend', 'node'], null, null, code)); }
const x = read('inventory.private.json');
const old = JSON.parse(fs.readFileSync(path.join(previous, 'cleanup-manifest.private.json')));
const nodes = new Map(), byTable = new Map();
for (const t of x.tables) {
  const pk = x.keys.find(k => k.table_name === t.name && k.contype === 'p');
  assert(pk, 'PRIMARY_KEY_REQUIRED');
  const rows = x.rows[t.name].map(row => {
    const key = Object.fromEntries(pk.columns.map(c => [c, row.data[c]]));
    const n = { table: t.name, key, data: row.data, fingerprint: row.fingerprint, uuid_refs: row.uuid_refs,
      ref: t.name + ':' + JSON.stringify(key) };
    nodes.set(n.ref, n); return n;
  });
  byTable.set(t.name, rows);
}
const fks = x.keys.filter(k => k.contype === 'f');
assert(x.external_references.length === 0, 'CROSS_SCHEMA_REFERENCE_STOP');
const edges = [];
for (const fk of fks) {
  const parents = new Map(byTable.get(fk.parent_table).map(n => [JSON.stringify(fk.parent_columns.map(c => n.data[c])), n]));
  for (const child of byTable.get(fk.table_name)) {
    const values = fk.columns.map(c => child.data[c]);
    if (values.some(v => v == null)) continue;
    const parent = parents.get(JSON.stringify(values));
    assert(parent, 'EXISTING_ORPHAN_STOP');
    edges.push({ child: child.ref, parent: parent.ref, constraint: fk.name });
  }
}
const index = new Map();
for (const n of nodes.values()) for (const id of Object.values(n.key)) if (typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)) {
  if (!index.has(id)) index.set(id, []); index.get(id).push(n);
}
const logical = [];
for (const n of nodes.values()) for (const id of n.uuid_refs) for (const p of index.get(id) || []) {
  if (p.ref !== n.ref && !edges.some(e => e.child === n.ref && e.parent === p.ref)) logical.push({ child: n.ref, parent: p.ref });
}
const combined = [...edges, ...logical];
function closure(seed, graph = combined, upward = false) {
  const set = new Set(seed); let changed = true;
  while (changed) { changed = false; for (const e of graph) {
    const from = upward ? e.child : e.parent, to = upward ? e.parent : e.child;
    if (set.has(from) && !set.has(to)) { set.add(to); changed = true; }
  } }
  return set;
}
const studentNode = id => byTable.get('students').find(n => n.data.id === id);
const protectedOwned = closure([studentNode(protectedId).ref]);
const targets = x.students.filter(s => s.id !== protectedId).map(s => s.id).sort();
assert(targets.length === 56 && old.target_students.length === 50 && old.target_students.every(id => targets.includes(id)), 'EXACT_STUDENT_SCOPE_REQUIRED');
assert(x.protected_student.id === protectedId && x.protected_student.student_id === '6706022510107', 'PROTECTED_IDENTITY_STOP');
assert(x.identity_counts.teachers === 23 && x.identity_counts.department_heads === 1 && x.identity_counts.department_staffs === 2, 'ACCOUNT_COUNTS_STOP');
const keepTables = new Set(['teachers', 'department_staffs', 'super_admins', 'admin_audit_logs', 'coop_academic_periods',
  'coop_prerequisite_catalog_courses', 'coop_prerequisite_catalog_grants', 'coop_prerequisite_catalog_programs', 'google_auth_requests']);
const retained = closure([...protectedOwned, ...[...nodes.values()].filter(n => keepTables.has(n.table)).map(n => n.ref)], edges, true);
const desired = closure(targets.map(id => studentNode(id).ref));
const receiptOwned = new Set(x.receipts.flatMap(r => r.rows.map(n => n.table + ':' + n.id)));
const syntheticParents = new Set(['companies', 'job_submissions', 'job_postings', 'job_posting_work_modes']);
for (const n of nodes.values()) if (syntheticParents.has(n.table) && receiptOwned.has(n.table + ':' + n.data.id)) desired.add(n.ref);
for (const ref of [...desired]) if (retained.has(ref)) desired.delete(ref);
let reduced = true;
while (reduced) { reduced = false; for (const ref of [...desired]) if (syntheticParents.has(nodes.get(ref).table)
  && combined.some(e => e.parent === ref && !desired.has(e.child))) { desired.delete(ref); reduced = true; } }
assert(targets.every(id => desired.has(studentNode(id).ref)), 'TARGET_HAS_PROTECTED_DEPENDENCY_STOP');
assert(!combined.some(e => desired.has(e.parent) && !desired.has(e.child)), 'RETAINED_CHILD_OR_LOGICAL_REFERENCE_STOP');
assert(![...desired].some(ref => protectedOwned.has(ref)), 'PROTECTED_DELETE_STOP');
const staff = byTable.get('department_staffs').map(n => ({ id: n.data.id,
  action: combined.some(e => e.parent === n.ref && !desired.has(e.child)) ? 'DISABLE_LOGIN_RETAIN_HISTORICAL_ACTOR' : 'DELETE_UNREFERENCED_ACTOR' }));
for (const s of staff) if (s.action === 'DELETE_UNREFERENCED_ACTOR') desired.add(byTable.get('department_staffs').find(n => n.data.id === s.id).ref);
const compact = n => ({ table: n.table, key: n.key, fingerprint_sha256: n.fingerprint });
const planned = [...desired].sort().map(ref => compact(nodes.get(ref)));
const immutableRows = planned.filter(n => ['coop_request_prerequisite_courses', 'coop_request_academic_history'].includes(n.table));
const immutableTriggers = x.triggers.filter(t => immutableRows.some(r => r.table === t.table_name) && /UPDATE OR DELETE|DELETE OR UPDATE/.test(t.definition));
assert(immutableTriggers.length === 2 && immutableTriggers.every(t => t.function_name === 'coop_academic_immutable' && t.enabled === 'O'), 'UNKNOWN_IMMUTABLE_DEFINITION_STOP');
assert(!planned.some(n => x.triggers.some(t => t.table_name === n.table && t.enabled !== 'D' && /RAISE EXCEPTION/.test(t.function_definition)
  && /\bDELETE\b/.test(t.definition) && t.function_name !== 'coop_academic_immutable')), 'ADDITIONAL_IMMUTABLE_POLICY_STOP');
const persistentDrift = old.all_rows_baseline.filter(r => r.table !== 'google_auth_requests'
  && !x.rows[r.table].some(n => n.fingerprint === r.fingerprint_sha256));
const persistentAdded = [...nodes.values()].filter(n => n.table !== 'google_auth_requests'
  && !old.all_rows_baseline.some(r => r.table === n.table && r.fingerprint_sha256 === n.fingerprint));
assert(persistentDrift.length === 0 && persistentAdded.length === 0, 'PERSISTENT_BASELINE_DRIFT_STOP');
const spec = { version: 1, protected_id: protectedId, target_students: targets, staff, planned,
  protected_owned: [...protectedOwned].sort().map(ref => compact(nodes.get(ref))),
  before: [...nodes.values()].map(compact), schema: { keys: x.keys, columns: x.columns, triggers: x.triggers },
  immutable_rows: immutableRows, original_function: immutableTriggers[0].function_definition,
  copy_database: copyName, target: 'intern_system/public', historical_persistent_drift: 0 };
const specDigest = sha(JSON.stringify(spec));
const keyWhere = (key, offset = 0, alias = '') => Object.keys(key).map((k, i) => `${alias}${q(k)}=$${i + offset + 1}`).join(' AND ');
async function metadata(c) {
  const keys = (await c.query(`SELECT c.relname table_name,k.contype,k.conname name,
    ARRAY(SELECT a.attname::text FROM unnest(k.conkey) WITH ORDINALITY u(num,ord) JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=u.num ORDER BY u.ord) columns,
    p.relname parent_table,pn.nspname parent_schema,
    ARRAY(SELECT a.attname::text FROM unnest(k.confkey) WITH ORDINALITY u(num,ord) JOIN pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=u.num ORDER BY u.ord) parent_columns,
    k.confdeltype delete_action,k.confupdtype update_action,pg_get_constraintdef(k.oid,true) definition
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_class p ON p.oid=k.confrelid LEFT JOIN pg_namespace pn ON pn.oid=p.relnamespace
    WHERE n.nspname='public' ORDER BY c.relname,k.conname`)).rows;
  const triggers = (await c.query(`SELECT c.relname table_name,t.tgname name,t.tgenabled enabled,t.tgtype::int type,
    pg_get_triggerdef(t.oid,true) definition,p.proname function_name,pg_get_functiondef(p.oid) function_definition
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid
    WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`)).rows;
  const columns = (await c.query(`SELECT c.relname table_name,a.attname name,format_type(a.atttypid,a.atttypmod) type FROM pg_attribute a
    JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`)).rows;
  return { keys, columns, triggers };
}
async function snapshot(c) {
  const result = [];
  for (const t of x.tables) {
    const pk = x.keys.find(k => k.table_name === t.name && k.contype === 'p');
    const rows = (await c.query(`SELECT ${pk.columns.map(q).join(',')},encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') fingerprint FROM public.${q(t.name)} t`)).rows;
    result.push(...rows.map(r => ({ table: t.name, key: Object.fromEntries(pk.columns.map(k => [k, r[k]])), fingerprint_sha256: r.fingerprint })));
  }
  return result;
}
const rowRef = r => r.table + ':' + JSON.stringify(r.key);
function compareRows(expected, actual, code) {
  const a = new Map(actual.map(r => [rowRef(r), r.fingerprint_sha256]));
  assert(expected.length === actual.length && expected.every(r => a.get(rowRef(r)) === r.fingerprint_sha256), code);
}
async function authMetadata(c) {
  return (await c.query('SELECT id,role,purpose,expires_at,consumed_at FROM public.google_auth_requests ORDER BY id')).rows;
}
function authDrift(beforeRows, nowRows, beforeMeta, nowMeta) {
  const b = new Map(beforeRows.map(r => [r.key.id, r])); const a = new Map(nowRows.map(r => [r.key.id, r]));
  const now = Date.now(); const removed = [], added = [], consumed = [];
  for (const [id, r] of b) {
    const meta = beforeMeta.find(m => m.id === id);
    if (!a.has(id)) { assert(meta && new Date(meta.expires_at).getTime() < now, 'UNEXPIRED_CHALLENGE_DISAPPEARED_STOP'); removed.push(id); }
    else if (a.get(id).fingerprint_sha256 !== r.fingerprint_sha256) {
      const current = nowMeta.find(m => m.id === id);
      assert(meta && current && meta.consumed_at == null && current.consumed_at != null
        && meta.expires_at === current.expires_at && meta.role === current.role && meta.purpose === current.purpose,
      'CHALLENGE_MUTATION_STOP');
      // Fingerprint alone cannot prove only consumed_at changed: fail closed on updates.
      assert(false, 'CHALLENGE_CONSUMPTION_REQUIRES_FULL_ROW_REVIEW_STOP');
    }
  }
  for (const [id] of a) if (!b.has(id)) {
    const m = nowMeta.find(m => m.id === id);
    assert(m && ['login', 'link'].includes(m.purpose) && ['auto', 'student', 'teacher', 'department_staff', 'department_head', 'super_admin'].includes(m.role)
      && new Date(m.expires_at).getTime() <= now + 301000, 'UNKNOWN_NEW_CHALLENGE_STOP'); added.push(id);
  }
  return { expired_removed: removed, new_challenges: added, consumed };
}
async function integrity(c) {
  for (const fk of fks) {
    const predicate = fk.columns.map(k => `c.${q(k)} IS NOT NULL`).join(' AND ');
    const join = fk.columns.map((k, i) => `c.${q(k)}=p.${q(fk.parent_columns[i])}`).join(' AND ');
    const { rows } = await c.query(`SELECT count(*)::int n FROM public.${q(fk.table_name)} c WHERE ${predicate}
      AND NOT EXISTS(SELECT 1 FROM public.${q(fk.parent_table)} p WHERE ${join})`);
    assert(rows[0].n === 0, 'FOREIGN_KEY_ORPHAN_STOP');
  }
  const unvalidated = (await c.query(`SELECT c.relname table_name,k.conname name,k.contype,pg_get_expr(k.conbin,k.conrelid) expression
    FROM pg_constraint k JOIN pg_namespace n ON n.oid=k.connamespace JOIN pg_class c ON c.oid=k.conrelid
    WHERE n.nspname='public' AND NOT convalidated ORDER BY c.relname,k.conname`)).rows;
  const existing = x.keys.filter(k => k.contype === 'c' && / NOT VALID$/.test(k.definition));
  assert(unvalidated.length === existing.length && unvalidated.every(k => k.contype === 'c'
    && existing.some(e => e.table_name === k.table_name && e.name === k.name)), 'NEW_UNVALIDATED_CONSTRAINT_STOP');
  for (const k of unvalidated) {
    const violations = (await c.query(`SELECT count(*)::int n FROM public.${q(k.table_name)} WHERE NOT (${k.expression})`)).rows[0].n;
    assert(violations === 0, 'LEGACY_CHECK_DATA_VIOLATION_STOP');
  }
  return { foreign_keys_checked: fks.length, orphans: 0, unchanged_legacy_not_valid_checks: unvalidated.length, legacy_check_violations: 0 };
}
async function counts(c) {
  return (await c.query(`SELECT (SELECT count(*)::int FROM students) students,
    (SELECT count(*)::int FROM students WHERE id=$1 AND student_id='6706022510107') protected_student,
    (SELECT count(*)::int FROM teachers) teachers,(SELECT count(*)::int FROM teachers WHERE status='active') active_teachers,
    (SELECT count(*)::int FROM teachers WHERE is_department_head) heads,
    (SELECT count(*)::int FROM department_staffs WHERE is_active) staff_logins,
    (SELECT count(*)::int FROM department_staffs) staff_historical_records,
    (SELECT count(*)::int FROM super_admins WHERE is_active AND teacher_id IN (SELECT id FROM teachers)) teacher_admin_memberships,
    (SELECT count(*)::int FROM super_admins WHERE is_active AND teacher_id IS NULL) independent_admin_logins,
    (SELECT count(*)::int FROM admin_account_controls WHERE actor_type IN ('teacher','student') AND NOT enabled) disabled_retained_accounts`, [protectedId])).rows[0];
}
async function targetGuard(c, db) {
  const r = (await c.query(`SELECT current_database() db,current_schema() schema,current_setting('server_version_num')::int version,
    inet_server_addr()::text address,pg_is_in_recovery() recovery`)).rows[0];
  assert(r.db === db && r.schema === 'public' && Math.floor(r.version / 10000) === 16 && !r.recovery
    && r.address === x.target.server_address, 'DATABASE_TARGET_STOP');
}
async function verifyStorage(manifest, directory) {
  const actual = await backendNode(`const fs=require('fs'),path=require('path'),crypto=require('crypto');const root=fs.realpathSync(${JSON.stringify(directory)}),files=[];
    function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('SYMLINK_STOP');if(entry.isDirectory())walk(full);else if(entry.isFile()){const b=fs.readFileSync(full);files.push({path:path.relative(root,full).split(path.sep).join('/'),bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});}else throw Error('SPECIAL_FILE_STOP');}}walk(root);console.log(JSON.stringify({root,files}));`);
  assert(actual.files.length === manifest.files.length && manifest.files.every(f => actual.files.some(a => a.path === f.path && a.bytes === f.bytes && a.sha256 === f.sha256)), 'STORAGE_FINGERPRINT_DRIFT_STOP');
  return actual;
}
async function prepare() {
  assert(!fs.existsSync(path.join(folder, 'final-manifest.private.json')), 'FINAL_MANIFEST_EXISTS_NO_OVERWRITE');
  const c = await connect('intern_system');
  try {
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); await targetGuard(c, 'intern_system');
    assert(sha(JSON.stringify(await metadata(c))) === sha(JSON.stringify(spec.schema)), 'SCHEMA_DRIFT_STOP');
    compareRows(spec.before, await snapshot(c), 'FRESH_BACKUP_SNAPSHOT_DRIFT_STOP');
    const auth = await authMetadata(c); await c.query('ROLLBACK');
    const b = read('backup.private.json'); assert(await hashFile(b.file) === b.sha256, 'BACKUP_HASH_STOP');
    const fullStorage = await backendNode(`const fs=require('fs'),path=require('path'),crypto=require('crypto');const root=fs.realpathSync(process.env.STORAGE_ROOT||'/app/storage'),files=[];
      function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('SYMLINK_STOP');if(e.isDirectory())walk(f);else if(e.isFile()){const b=fs.readFileSync(f);files.push({path:path.relative(root,f).split(path.sep).join('/'),bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});}else throw Error('SPECIAL_FILE_STOP');}}walk(root);console.log(JSON.stringify({root,files}));`);
    const tar = path.join(folder, 'full-storage.tar'); await docker(['exec', 'intern_backend', 'tar', '-C', fullStorage.root, '-cf', '-', '.'], null, tar);
    await verifyStorage(fullStorage, fullStorage.root);
    const restoreDir = '/tmp/fitm-final-cleanup-restore-20261112';
    await backendNode(`const fs=require('fs');fs.mkdirSync(${JSON.stringify(restoreDir)},{mode:0o700});console.log('{}');`);
    await docker(['exec', '-i', 'intern_backend', 'tar', '-C', restoreDir, '-xf', '-'], tar);
    await verifyStorage(fullStorage, restoreDir);
    const refs = [];
    for (const n of nodes.values()) for (const field of ['storage_path', 'file_path']) if (n.data[field]) refs.push({ path: n.data[field], ref: n.ref });
    const filePlan = fullStorage.files.map(f => {
      const owner = /^students\/([^/]+)\//.exec(f.path)?.[1];
      const references = refs.filter(r => r.path === f.path);
      return { ...f, action: targets.includes(owner) && references.every(r => desired.has(r.ref)) ? 'DELETE_AFTER_COMMIT' : 'PRESERVE', references };
    });
    // Read the old dump's challenge metadata only; never print credential-bearing COPY values.
    const oldBackup = old.backup; assert(await hashFile(oldBackup.file) === oldBackup.sha256, 'OLD_BACKUP_HASH_STOP');
    const authSql = await docker(['exec', '-i', 'intern_postgres', 'pg_restore', '--data-only', '--table=google_auth_requests', '--file=-'], oldBackup.file);
    const match = /COPY public\.google_auth_requests \(([^)]+)\) FROM stdin;\r?\n([\s\S]*?)\\\./.exec(authSql);
    assert(match, 'HISTORICAL_CHALLENGE_METADATA_REQUIRED');
    const columns = match[1].split(', ');
    const oldAuth = match[2].trim().split(/\r?\n/).filter(Boolean).map(line => {
      const parts = line.split('\t'); const get = k => parts[columns.indexOf(k)];
      return { id: get('id'), expires_at: get('expires_at'), consumed_at: get('consumed_at') === '\\N' ? null : get('consumed_at') };
    });
    const missingHistorical = old.all_rows_baseline.filter(r => r.table === 'google_auth_requests' && !spec.before.some(n => rowRef(n) === rowRef(r)));
    assert(missingHistorical.every(r => oldAuth.some(a => a.id === r.key.id && new Date(a.expires_at).getTime() < Date.now())), 'HISTORICAL_AUTH_DRIFT_UNEXPLAINED_STOP');
    const manifest = { ...spec, spec_sha256: specDigest, created_at: new Date().toISOString(), auth_metadata: auth,
      backup: b, storage: { ...fullStorage, archive: tar, archive_sha256: await hashFile(tar), restore_directory: restoreDir },
      files: filePlan, historical_auth: { metadata: oldAuth, expired_missing: missingHistorical.map(r => r.key.id), persistent_drift: 0 } };
    write('final-manifest.private.json', manifest);
    write('final-manifest-sha256.private.json', { sha256: await hashFile(path.join(folder, 'final-manifest.private.json')) });
    publicLog({ stage: 'PREPARED', students: targets.length, staff: staff.map(s => s.action), rows: planned.length,
      tables: new Set(planned.map(r => r.table)).size, immutable_rows: immutableRows.length,
      storage_files: fullStorage.files.length, file_delete_candidates: filePlan.filter(f => f.action === 'DELETE_AFTER_COMMIT').length,
      storage_restore: 'PASS', historical_persistent_drift: 0, historical_expired_challenges_missing: missingHistorical.length });
  } finally { await c.end(); }
}
async function loadManifest() {
  const m = read('final-manifest.private.json');
  assert(await hashFile(path.join(folder, 'final-manifest.private.json')) === read('final-manifest-sha256.private.json').sha256, 'MANIFEST_HASH_STOP');
  assert(m.spec_sha256 === specDigest && await hashFile(m.backup.file) === m.backup.sha256
    && await hashFile(m.storage.archive) === m.storage.archive_sha256, 'PLAN_OR_BACKUP_DRIFT_STOP');
  return m;
}
// pg_dump/restore reparses varchar literal arrays, distributing ::text[] over
// their elements. Canonicalize only that exact, lossless CHECK representation.
function canonicalRestoredSchema(schema) {
  return { ...schema, keys: schema.keys.map(k => k.contype !== 'c' ? k : { ...k,
    definition: k.definition.replace(/ARRAY\[((?:'(?:[^']|'')*'::character varying)(?:, '(?:[^']|'')*'::character varying)*)\]::text\[\]/g,
      (_, values) => 'ARRAY[' + values.replace(/::character varying/g, '::character varying::text') + ']') }) };
}
function expectedSchema(db, m) { return db === copyName ? read('restored-schema.private.json') : m.schema; }
async function restoreCopy(m) {
  const admin = await connect('postgres');
  let exists;
  try {
    exists = (await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [copyName])).rowCount > 0;
    assert(!fs.existsSync(path.join(folder, 'rehearsal-precommit.private.json')), 'COPY_CLEANUP_ALREADY_ATTEMPTED_STOP');
    if (!exists) await admin.query(`CREATE DATABASE ${q(copyName)} TEMPLATE template0`);
  } finally { await admin.end(); }
  if (!exists) await docker(['exec', '-i', 'intern_postgres', 'sh', '-c',
    'exec pg_restore -U "$POSTGRES_USER" -d "$1" --exit-on-error --single-transaction --no-owner --no-privileges', 'fitm-final-restore', copyName], m.backup.file);
  const c = await connect(copyName);
  try {
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); await targetGuard(c, copyName);
    compareRows(m.before, await snapshot(c), 'RESTORED_DATABASE_ROWS_MISMATCH_STOP');
    const restoredSchema = await metadata(c);
    if (sha(JSON.stringify(canonicalRestoredSchema(restoredSchema))) !== sha(JSON.stringify(canonicalRestoredSchema(m.schema)))) {
      write('restore-schema-differences.private.json', Object.fromEntries(Object.keys(m.schema).map(section => [section,
        restoredSchema[section].flatMap((value, i) => JSON.stringify(value) === JSON.stringify(m.schema[section][i]) ? [] : [{ before: m.schema[section][i], restored: value }])])));
      assert(false, 'RESTORED_SCHEMA_MISMATCH_STOP');
    }
    if (fs.existsSync(path.join(folder, 'restored-schema.private.json')))
      assert(sha(JSON.stringify(read('restored-schema.private.json'))) === sha(JSON.stringify(restoredSchema)), 'RESTORED_SCHEMA_CHANGED_ON_RESUME_STOP');
    else write('restored-schema.private.json', restoredSchema);
    const fk = await integrity(c); await c.query('ROLLBACK');
    write('restore-result.private.json', { status: 'PASS', restored_rows: m.before.length, tables: x.tables.length, ...fk, database: copyName,
      reused_fully_restored_copy: exists, check_cast_canonicalization: true, schema_sha256: sha(JSON.stringify(restoredSchema)) });
    publicLog({ stage: 'DATABASE_RESTORE', result: 'PASS', rows: m.before.length, tables: x.tables.length });
  } finally { await c.end(); }
}
async function expectedPost(c, m, staffUpdated) {
  const actual = await snapshot(c); const deleted = new Set(m.planned.map(rowRef));
  const changed = new Set(staffUpdated.map(rowRef));
  const expected = m.before.filter(r => r.table !== 'google_auth_requests' && !deleted.has(rowRef(r)) && !changed.has(rowRef(r)));
  compareRows(expected, actual.filter(r => r.table !== 'google_auth_requests' && !changed.has(rowRef(r))), 'RETAINED_FULL_ROW_DRIFT_STOP');
  compareRows(staffUpdated, actual.filter(r => changed.has(rowRef(r))), 'STAFF_DISABLE_DRIFT_STOP');
  compareRows(m.protected_owned, actual.filter(r => m.protected_owned.some(b => rowRef(b) === rowRef(r))), 'PROTECTED_STUDENT_DRIFT_STOP');
  assert(!actual.some(r => deleted.has(rowRef(r))), 'TARGET_ROWS_REMAIN_STOP');
  const db = (await c.query('SELECT current_database() db')).rows[0].db;
  assert(sha(JSON.stringify(await metadata(c))) === sha(JSON.stringify(expectedSchema(db, m))), 'POST_SCHEMA_OR_TRIGGER_DRIFT_STOP');
  const count = await counts(c);
  assert(count.students === 1 && count.protected_student === 1 && count.teachers === 23 && count.active_teachers === 23
    && count.heads === 1 && count.staff_logins === 0 && count.teacher_admin_memberships === x.identity_counts.super_admins
    && count.independent_admin_logins === 0 && count.disabled_retained_accounts === 0, 'FINAL_LOGIN_COUNTS_STOP');
  const fk = await integrity(c);
  return { counts: count, integrity: fk, retained_rows: actual.length, protected_owned: m.protected_owned.length };
}
async function expectImmutableRejection(c, sql, values) {
  await c.query('SAVEPOINT reject_immutable'); let rejected = false;
  try { await c.query(sql, values); } catch (e) { rejected = e.code === '23514'; }
  await c.query('ROLLBACK TO SAVEPOINT reject_immutable'); await c.query('RELEASE SAVEPOINT reject_immutable');
  assert(rejected, 'IMMUTABLE_SCOPE_NEGATIVE_GUARD_FAILED');
}
async function cleanup(db, m, stage) {
  const c = await connect(db); let committed = false; let commitAttempted = false;
  try {
    await c.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    await c.query("SET LOCAL lock_timeout='5s'"); await c.query("SET LOCAL statement_timeout='60s'");
    await c.query('SELECT pg_advisory_xact_lock(63828018)');
    await c.query(`LOCK TABLE ${x.tables.map(t => 'public.' + q(t.name)).join(',')} IN EXCLUSIVE MODE`);
    await targetGuard(c, db);
    assert(sha(JSON.stringify(await metadata(c))) === sha(JSON.stringify(expectedSchema(db, m))), 'PRE_SCHEMA_DRIFT_STOP');
    const before = await snapshot(c);
    compareRows(m.before.filter(r => r.table !== 'google_auth_requests'), before.filter(r => r.table !== 'google_auth_requests'), 'PERSISTENT_ACCOUNT_OR_BUSINESS_DRIFT_STOP');
    const authNow = await authMetadata(c);
    const ephemeral = authDrift(m.before.filter(r => r.table === 'google_auth_requests'), before.filter(r => r.table === 'google_auth_requests'), m.auth_metadata, authNow);
    await verifyStorage(m.storage, m.storage.root);
    await integrity(c);
    const context = (await c.query('SELECT pg_backend_pid()::int pid,txid_current()::text xid')).rows[0];
    const idsFor = table => m.immutable_rows.filter(r => r.table === table).map(r => r.key.id);
    const scopeArray = ids => 'ARRAY[' + ids.map(literal).join(',') + ']::uuid[]';
    const body = `BEGIN
      IF TG_OP='DELETE' AND current_database()=${literal(db)} AND pg_backend_pid()=${context.pid}
        AND txid_current()=${literal(context.xid)}::bigint AND current_user=${literal(env.DB_USER)}
        AND TG_TABLE_SCHEMA='public' AND (
          (TG_TABLE_NAME='coop_request_prerequisite_courses' AND OLD.id=ANY(${scopeArray(idsFor('coop_request_prerequisite_courses'))})) OR
          (TG_TABLE_NAME='coop_request_academic_history' AND OLD.id=ANY(${scopeArray(idsFor('coop_request_academic_history'))})))
        AND EXISTS(SELECT 1 FROM public.coop_requests r WHERE r.id=OLD.coop_request_id
          AND r.student_id=ANY(${scopeArray(m.target_students)}) AND r.student_id<>${literal(protectedId)}::uuid)
      THEN RETURN OLD; END IF;
      RAISE EXCEPTION 'Submitted course snapshots and academic history are immutable' USING ERRCODE='23514';
    END`;
    await c.query(`CREATE OR REPLACE FUNCTION public.coop_academic_immutable() RETURNS trigger LANGUAGE plpgsql AS $final_cleanup$${body}$final_cleanup$`);
    const protectedCourse = m.protected_owned.find(r => r.table === 'coop_request_prerequisite_courses');
    const targetCourse = m.immutable_rows.find(r => r.table === 'coop_request_prerequisite_courses');
    assert(protectedCourse && targetCourse, 'IMMUTABLE_NEGATIVE_GUARD_ROWS_REQUIRED');
    await expectImmutableRejection(c, 'DELETE FROM public.coop_request_prerequisite_courses WHERE id=$1', [protectedCourse.key.id]);
    await expectImmutableRejection(c, 'UPDATE public.coop_request_prerequisite_courses SET grade=grade WHERE id=$1', [targetCourse.key.id]);
    const remaining = new Set(m.planned.map(rowRef)); const deletedPerTable = {};
    while (remaining.size) {
      const leaves = [...remaining].filter(ref => !edges.some(e => e.parent === ref && remaining.has(e.child)));
      assert(leaves.length > 0, 'DEPENDENCY_CYCLE_STOP');
      for (const ref of leaves) {
        const n = nodes.get(ref);
        const result = await c.query(`DELETE FROM public.${q(n.table)} WHERE ${keyWhere(n.key)}`, Object.values(n.key));
        assert(result.rowCount === 1, 'EXACT_DELETE_COUNT_STOP');
        deletedPerTable[n.table] = (deletedPerTable[n.table] || 0) + 1; remaining.delete(ref);
      }
    }
    const staffUpdated = [];
    for (const s of m.staff.filter(s => s.action === 'DISABLE_LOGIN_RETAIN_HISTORICAL_ACTOR')) {
      const baseline = (await c.query('SELECT to_jsonb(t)-\'is_active\'-\'updated_at\' data FROM public.department_staffs t WHERE id=$1', [s.id])).rows[0];
      const result = await c.query(`UPDATE public.department_staffs t SET is_active=false,updated_at=clock_timestamp() WHERE id=$1
        RETURNING to_jsonb(t)-'is_active'-'updated_at' data,encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') fingerprint`, [s.id]);
      assert(result.rowCount === 1 && JSON.stringify(result.rows[0].data) === JSON.stringify(baseline.data), 'STAFF_HISTORICAL_RECORD_DRIFT_STOP');
      staffUpdated.push({ table: 'department_staffs', key: { id: s.id }, fingerprint_sha256: result.rows[0].fingerprint });
    }
    // The exception is visible only in this writer transaction; restore the exact original before COMMIT.
    await c.query(m.original_function);
    await expectImmutableRejection(c, 'DELETE FROM public.coop_request_prerequisite_courses WHERE id=$1', [protectedCourse.key.id]);
    await c.query('SET CONSTRAINTS ALL IMMEDIATE');
    const verified = await expectedPost(c, m, staffUpdated);
    const authAfter = await snapshot(c);
    compareRows(before.filter(r => r.table === 'google_auth_requests'), authAfter.filter(r => r.table === 'google_auth_requests'), 'AUTH_CHANGED_DURING_LOCKED_CLEANUP_STOP');
    const receipt = { stage, database: db, spec_sha256: specDigest, started_at: new Date().toISOString(),
      deleted_students: 56, deleted_rows: m.planned.length, deleted_tables: Object.keys(deletedPerTable).length,
      deleted_per_table: deletedPerTable, immutable_rows: m.immutable_rows.length, staff_updated: staffUpdated,
      auth_lifecycle_drift: ephemeral, precommit: verified, commit_attempted: true };
    write(stage + '-precommit.private.json', receipt);
    commitAttempted = true; await c.query('COMMIT'); committed = true;
    await c.end();
    const verify = await connect(db);
    try {
      await verify.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const post = await expectedPost(verify, m, staffUpdated);
      const authPost = (await snapshot(verify)).filter(r => r.table === 'google_auth_requests');
      const postAuth = authDrift(before.filter(r => r.table === 'google_auth_requests'), authPost, authNow, await authMetadata(verify));
      await verify.query('ROLLBACK');
      const result = { ...receipt, committed: true, postcommit: post, postcommit_auth_lifecycle: postAuth,
        original_function_restored: true, immutable_negative_guards: 'PASS', verified_at: new Date().toISOString() };
      write(stage + '-result.private.json', result);
      publicLog({ stage, committed: true, counts: post.counts, deleted_students: 56, deleted_rows: receipt.deleted_rows,
        affected_tables: receipt.deleted_tables, immutable_rows: receipt.immutable_rows, integrity: post.integrity,
        protected_owned_rows: post.protected_owned, original_function_restored: true });
      return result;
    } finally { await verify.end(); }
  } catch (e) {
    if (!committed && !commitAttempted) { try { await c.query('ROLLBACK'); } catch {} }
    write(stage + '-failure-' + Date.now() + '.private.json', { error: e.safeCode || e.code || e.name, committed,
      commit_attempted: commitAttempted, deletes_committed: committed ? m.planned.length : commitAttempted ? 'UNKNOWN_VERIFY_BEFORE_RETRY' : 0 });
    throw e;
  } finally { try { await c.end(); } catch {} }
}
async function deleteFiles(m) {
  const live = read('live-result.private.json'); assert(live.committed && live.original_function_restored, 'VERIFIED_COMMIT_REQUIRED');
  const c = await connect('intern_system');
  try {
    await c.query('BEGIN ISOLATION LEVEL SERIALIZABLE'); await c.query("SET LOCAL lock_timeout='5s'");
    await c.query(`LOCK TABLE ${x.tables.map(t => 'public.' + q(t.name)).join(',')} IN EXCLUSIVE MODE`);
    await expectedPost(c, m, live.staff_updated); await verifyStorage(m.storage, m.storage.root);
    const candidates = m.files.filter(f => f.action === 'DELETE_AFTER_COMMIT');
    for (const f of candidates) for (const t of x.tables) {
      // Search every text/json field, including embedded history paths, before unlink.
      const found = await c.query(`SELECT EXISTS(SELECT 1 FROM public.${q(t.name)} t WHERE strpos(to_jsonb(t)::text,$1)>0) used`, [f.path]);
      assert(!found.rows[0].used, 'POSTCOMMIT_FILE_REFERENCE_STOP');
    }
    await verifyStorage(m.storage, m.storage.restore_directory);
    const result = await backendNode(`const fs=require('fs'),path=require('path'),crypto=require('crypto');const root=fs.realpathSync(${JSON.stringify(m.storage.root)}),files=${JSON.stringify(candidates)},deleted=[];
      for(const f of files){const target=path.resolve(root,f.path),relative=path.relative(root,target);if(!relative||relative.startsWith('..')||path.isAbsolute(relative)||fs.realpathSync(target)!==target)throw Error('FILE_SCOPE_STOP');
        const owner=/^students\\/([^/]+)\\//.exec(f.path)?.[1];if(!${JSON.stringify(m.target_students)}.includes(owner))throw Error('FILE_OWNER_STOP');
        const b=fs.readFileSync(target);if(b.length!==f.bytes||crypto.createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error('FILE_DRIFT_STOP');}
      for(const f of files){fs.unlinkSync(path.resolve(root,f.path));deleted.push(f.path);}console.log(JSON.stringify({deleted}));`);
    const kept = { ...m.storage, files: m.files.filter(f => f.action !== 'DELETE_AFTER_COMMIT') };
    await verifyStorage(kept, m.storage.root); await expectedPost(c, m, live.staff_updated);
    await c.query('COMMIT');
    write('files-result.private.json', { deleted: result.deleted, deleted_count: result.deleted.length, retained_files: kept.files.length,
      protected_files_unchanged: true, backup_archive_sha256: m.storage.archive_sha256 });
    publicLog({ stage: 'FILES', deleted: result.deleted.length, preserved: kept.files.length, protected_files_unchanged: true });
  } catch (e) { try { await c.query('ROLLBACK'); } catch {} throw e; } finally { await c.end(); }
}
async function main() {
  assert(env.NODE_ENV === 'development' && ['postgres', '127.0.0.1', 'localhost'].includes(env.DB_HOST)
    && env.DB_NAME === 'intern_system' && Number(env.DB_PORT) === 5432, 'DEVELOPMENT_CONFIG_REQUIRED');
  assert(['prepare', 'rehearse', 'apply', 'files', 'summary'].includes(mode) && process.argv.length === 3, 'EXPLICIT_MODE_REQUIRED');
  if (mode === 'prepare') return prepare();
  const m = await loadManifest();
  if (mode === 'rehearse') { await restoreCopy(m); return cleanup(copyName, m, 'rehearsal'); }
  if (mode === 'apply') {
    const rehearsal = read('rehearsal-result.private.json');
    assert(rehearsal.committed && rehearsal.spec_sha256 === specDigest && rehearsal.original_function_restored
      && rehearsal.immutable_negative_guards === 'PASS' && read('restore-result.private.json').status === 'PASS', 'SUCCESSFUL_RESTORE_REHEARSAL_REQUIRED');
    assert(!fs.existsSync(path.join(folder, 'live-precommit.private.json')), 'LIVE_ALREADY_ATTEMPTED_NO_AUTOMATIC_RETRY');
    return cleanup('intern_system', m, 'live');
  }
  if (mode === 'files') return deleteFiles(m);
  const live = read('live-result.private.json');
  publicLog({ ...Object.fromEntries(Object.entries(live).filter(([k]) => !['staff_updated', 'auth_lifecycle_drift', 'postcommit_auth_lifecycle'].includes(k))),
    backup_sha256: m.backup.sha256, storage_sha256: m.storage.archive_sha256, files: read('files-result.private.json').deleted_count });
}
main().catch(e => { publicLog({ error: e.safeCode || e.code || e.name, cleanup_success: false }); process.exitCode = 1; });
