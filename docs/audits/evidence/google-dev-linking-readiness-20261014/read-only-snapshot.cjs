const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const phase = process.argv[2];
if (!['before', 'after'].includes(phase) || !process.env.FITM_AUDIT_DOCKER) throw Error('READ_ONLY_ARGUMENTS_REQUIRED');
const script = String.raw`
const {Client}=require('pg');
const crypto=require('node:crypto');
const core=require('./src/db/googleOAuth026');
(async()=>{
 const client=new Client({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,connectionTimeoutMillis:5000,options:'-c default_transaction_read_only=on'});
 try{
  core.flagsOff();await client.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await client.query("SET LOCAL statement_timeout='10s'");
  const target=(await client.query("SELECT current_database() AS database,current_setting('transaction_read_only') AS read_only,current_setting('server_version') AS version,(SELECT system_identifier::text FROM pg_control_system()) AS cluster_identifier")).rows[0];
  if(target.database!=='intern_system'||target.read_only!=='on')throw Error('TARGET_GUARD');
  const catalog=await core.inspect({query:async sql=>(await client.query(sql)).rows},null);
  const migrationState=core.state(catalog);
  const tables=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);
  const data={};for(const table of tables){const identifier='"'+table.replace(/"/g,'""')+'"';data[table]=(await client.query("SELECT count(*)::int AS count,md5(coalesce(string_agg(md5(row_to_json(t)::text),'' ORDER BY md5(row_to_json(t)::text)),'')) AS digest FROM public."+identifier+' t')).rows[0];}
  const verificationColumns=catalog.columns.filter(c=>c.table==='students'&&/email.*verif|verif.*email|is_verified/.test(c.name)).map(c=>c.name);
  const students=(await client.query("SELECT 'S'||lpad(row_number() OVER(ORDER BY s.id)::text,2,'0') AS alias,s.status,s.id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AS uuid_valid,nullif(trim(s.student_id),'') IS NOT NULL AS student_id_present,nullif(trim(s.email),'') IS NOT NULL AS email_present,s.password_hash IS NOT NULL AND length(s.password_hash)>0 AS password_hash_present,substring(s.password_hash,1,4) IN ('$2a$','$2b$','$2y$') AND length(s.password_hash)=60 AS bcrypt_format,EXISTS(SELECT 1 FROM student_profiles p WHERE p.student_id=s.id) AS profile_present,EXISTS(SELECT 1 FROM google_identities g WHERE g.student_id=s.id) AS already_mapped,(SELECT coalesce(jsonb_object_agg(k,to_jsonb(s)->k),'{}'::jsonb) FROM unnest($1::text[]) k) AS email_verification_flags FROM students s ORDER BY s.id",[verificationColumns])).rows;
  for(const row of students)row.eligible_by_source=['pending','searching','placed','in_progress','completed'].includes(row.status)&&row.uuid_valid&&row.student_id_present&&row.email_present&&row.password_hash_present&&!row.already_mapped;
  const accounts=(await client.query("SELECT (SELECT count(*)::int FROM teachers WHERE status='active' AND NOT is_department_head AND password_hash IS NOT NULL) AS teacher,(SELECT count(*)::int FROM teachers WHERE status='active' AND is_department_head AND nullif(trim(department),'') IS NOT NULL AND password_hash IS NOT NULL) AS department_head,(SELECT count(*)::int FROM department_staffs WHERE is_active AND password_hash IS NOT NULL) AS department_staff")).rows[0];
  const schema=core.existingSchema(catalog);
  const result={target,ledger:catalog.ledger,migrationState,sourceMigrationHash:core.sourceHash(),data,schemaDigest:crypto.createHash('sha256').update(JSON.stringify(schema)).digest('hex'),googleConstraints:catalog.constraints.filter(c=>core.TABLES.includes(c.table)),googleIndexes:catalog.indexes.filter(c=>core.TABLES.includes(c.table)),studentVerificationColumns:verificationColumns,students,accounts};
  await client.query('ROLLBACK');console.log(JSON.stringify(result));
 }catch{console.log(JSON.stringify({error:'READ_ONLY_VERIFICATION_FAILED'}));process.exitCode=1;}finally{await client.end();}
})();`;
const docker = process.env.FITM_AUDIT_DOCKER;
function execute(args,input){const result=cp.spawnSync(docker,args,{input,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(result.status!==0)throw Error('READ_ONLY_DOCKER_CHECK_FAILED');return result.stdout;}
const database=JSON.parse(execute(['exec','-i','intern_backend','node','-'],script));
if(database.error)throw Error('READ_ONLY_DATABASE_CHECK_FAILED');
const inspect=name=>JSON.parse(execute(['inspect',name]))[0];
const containers={};for(const name of ['intern_postgres','intern_backend','intern_frontend']){const c=inspect(name);containers[name]=JSON.parse(JSON.stringify({id:c.Id,startedAt:c.State.StartedAt,mounts:c.Mounts.map(m=>({type:m.Type,name:m.Name,destination:m.Destination})).sort((a,b)=>a.destination.localeCompare(b.destination))}));}
const backend=Object.fromEntries(inspect('intern_backend').Config.Env.map(v=>{const i=v.indexOf('=');return[v.slice(0,i),v.slice(i+1)]}));
const frontend=Object.fromEntries(inspect('intern_frontend').Config.Env.map(v=>{const i=v.indexOf('=');return[v.slice(0,i),v.slice(i+1)]}));
const config=Object.fromEntries(['GOOGLE_HOSTED_DOMAIN_POLICY','GOOGLE_ALLOWED_HOSTED_DOMAINS','GOOGLE_ALLOWED_EMAIL_DOMAINS','GOOGLE_LOGIN_ENABLED','GOOGLE_ACCOUNT_LINKING_ENABLED'].map(k=>[k,backend[k]]));
config.clientIdsMatch=!!backend.GOOGLE_CLIENT_ID&&backend.GOOGLE_CLIENT_ID===frontend.VITE_GOOGLE_CLIENT_ID;
if(backend.GOOGLE_LOGIN_ENABLED!=='false'||backend.GOOGLE_ACCOUNT_LINKING_ENABLED!=='false')throw Error('LIVE_FLAGS_DRIFT');
const result={database,containers,config};
if(phase==='after'){const before=JSON.parse(fs.readFileSync(path.join(__dirname,'runtime-before.json')));if(JSON.stringify(before)!==JSON.stringify(result))throw Error('RUNTIME_OR_DATABASE_CHANGED');result.preservation='PASS';}
fs.writeFileSync(path.join(__dirname,'runtime-'+phase+'.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({phase,migrationState:database.migrationState,executed:database.ledger.length,mappingRows:database.data.google_identities.count,requestRows:database.data.google_auth_requests.count,studentEligibility:database.students.map(s=>({alias:s.alias,status:s.status,eligible:s.eligible_by_source,passwordFormat:s.bcrypt_format,profile:s.profile_present})),studentVerificationColumns:database.studentVerificationColumns,preservation:result.preservation}));
