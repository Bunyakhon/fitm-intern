// Read-only development metadata/checksums; never read/export personal rows.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {Client}=require('pg');const {readSnapshot,settings,validateTarget}=require('./installStudentProfilePhase2B2');
const workspace=path.resolve(__dirname,'../..'),digest=data=>crypto.createHash('sha256').update(data).digest('hex');
async function main(){
 validateTarget();const installation=JSON.parse(fs.readFileSync(path.join(workspace,'docs/audits/FITM_STUDENT_PROFILE_PHASE2B2_RESULTS.json'),'utf8'));
 const manifest=JSON.parse(fs.readFileSync(path.join(installation.backup.directory,'recovery-manifest.json'),'utf8'));
 const current=await readSnapshot(),legacy=await readSnapshot('intern_system',manifest.baseline.metadata.columns);
 assert.deepEqual(legacy.rows,manifest.baseline.rows);
 const prior=JSON.parse(fs.readFileSync(path.join(workspace,'docs/audits/FITM_STUDENT_PROFILE_PHASE4_DATABASE_VERIFICATION.json'),'utf8'));
 assert.equal(digest(JSON.stringify(current.metadata)),prior.metadata_sha256);
 assert.equal(current.metadata.ledger.filter(name=>/^(022|023|024|025)_/.test(name)).length,4);assert.equal(current.metadata.ledger.some(name=>/^(019|020|021)_/.test(name)),false);
 const client=new Client({...settings,database:'postgres',options:'-c default_transaction_read_only=on'});let roles;
 try{await client.connect();roles=(await client.query("SELECT rolname AS name,NOT rolcanlogin AS login_disabled,rolpassword IS NULL AS password_null FROM pg_authid WHERE rolname~'^fitm_p5_[a-f0-9]{32}$' ORDER BY rolname")).rows;assert.ok(roles.every(role=>role.login_disabled&&role.password_null));}finally{await client.end();}
 const baseline=JSON.parse(fs.readFileSync(path.join(workspace,'docs/audits/evidence/student-profile-phase5/source-baseline.json'),'utf8'));
 const changed=[],missing=[];for(const [name,hash]of Object.entries(baseline)){const absolute=path.join(workspace,name);if(!fs.existsSync(absolute))missing.push(name);else if(digest(fs.readFileSync(absolute))!==hash)changed.push(name);}
 assert.deepEqual(missing,[]);assert.deepEqual(changed,['frontend/src/pages/student_coop.js','frontend/test/studentProfileAggregateCompatibility.test.js','frontend/test/studentProfileIntegrity.test.js','nlp-service/app/services/profile_pdf.py']);
 const evidence={status:'PASS',verified_at:new Date().toISOString(),read_only:true,migration_executions:0,metadata_sha256:digest(JSON.stringify(current.metadata)),ledger:current.metadata.ledger,totals:Object.fromEntries(['tables','columns','constraints','indexes','triggers'].map(key=>[key,current.metadata[key].length])),all_28_legacy_table_counts_checksums_unchanged:true,development_counts:Object.fromEntries(Object.entries(current.rows).map(([name,row])=>[name,row.count])),synthetic_roles:roles,source_preservation:{baseline_files:Object.keys(baseline).length,changed,missing,other_files_unchanged:Object.keys(baseline).length-changed.length}};
 fs.writeFileSync(path.join(workspace,'docs/audits/FITM_STUDENT_PROFILE_PHASE5_DATABASE_VERIFICATION.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}
main().catch(error=>{console.error(error.code||error.message);process.exitCode=1;});
