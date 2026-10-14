const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const workspace = path.resolve(__dirname, '../../../..');
const dotenv = require(path.join(workspace, 'backend/node_modules/dotenv'));
const docker = process.env.FITM_AUDIT_DOCKER;
const phase = process.argv[2];
assert.ok(docker && ['before', 'after'].includes(phase));
function command(args, input) {
  const result = cp.spawnSync(docker, args, { input, encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw Error('DOCKER_READ_CHECK_FAILED:' + (result.stderr?.match(/SyntaxError|MODULE_NOT_FOUND|permission denied/)?.[0] || 'exit_' + result.status));
  return result.stdout;
}
const inspect = name => JSON.parse(command(['inspect', name]))[0];
const environment = info => Object.fromEntries(info.Config.Env.map(value => {
  const index = value.indexOf('='); return [value.slice(0, index), value.slice(index + 1)];
}));
const backendFile = dotenv.parse(fs.readFileSync(path.join(workspace, 'backend/.env')));
const frontendFile = dotenv.parse(fs.readFileSync(path.join(workspace, 'frontend/.env')));
const postgres = inspect('intern_postgres');
const backend = environment(inspect('intern_backend'));
const frontend = environment(inspect('intern_frontend'));
const postgresEnv = environment(postgres);
assert.equal(backendFile.DB_NAME, 'intern_system');
assert.ok(backendFile.DB_PASSWORD);
if (backendFile.DB_PASSWORD !== postgresEnv.POSTGRES_PASSWORD) throw Error('EXISTING_PASSWORD_MISMATCH');
assert.equal(backendFile.DB_USER, postgresEnv.POSTGRES_USER, 'EXISTING_USERNAME_MISMATCH');
assert.equal(backendFile.DB_NAME, postgresEnv.POSTGRES_DB, 'EXISTING_DATABASE_MISMATCH');
assert.equal(backend.GOOGLE_LOGIN_ENABLED, 'false');
assert.equal(backend.GOOGLE_ACCOUNT_LINKING_ENABLED, 'false');
const databaseScript = `
const {Client}=require('pg'); const crypto=require('node:crypto');
(async()=>{
 const client=new Client({host:'postgres',port:Number(process.env.DB_PORT),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,connectionTimeoutMillis:5000,options:'-c default_transaction_read_only=on'});
 try {
  await client.connect(); await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); await client.query("SET LOCAL statement_timeout='10s'");
  const target=(await client.query("SELECT current_database() AS database,current_user AS username,current_setting('transaction_read_only') AS read_only")).rows[0];
  if(target.database!=='intern_system'||target.read_only!=='on') throw Error('WRONG_READ_ONLY_TARGET');
  const ledger=(await client.query('SELECT name FROM public.sequelize_meta ORDER BY name')).rows.map(r=>r.name);
  const tables=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);
  const data={}; for(const table of tables){const identifier='"'+table.replace(/"/g,'""')+'"'; data[table]=(await client.query("SELECT count(*)::int AS count,md5(coalesce(string_agg(md5(row_to_json(t)::text),'' ORDER BY md5(row_to_json(t)::text)),'')) AS digest FROM public."+identifier+' t')).rows[0];}
  const columns=(await client.query("SELECT table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows;
  const constraints=(await client.query("SELECT c.relname,k.conname,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname")).rows;
  const indexes=(await client.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname")).rows;
  const accounts=(await client.query("SELECT (SELECT count(*)::int FROM students WHERE status IN ('pending','searching','placed','in_progress','completed') AND password_hash IS NOT NULL) AS student,(SELECT count(*)::int FROM teachers WHERE status='active' AND NOT is_department_head AND password_hash IS NOT NULL) AS teacher,(SELECT count(*)::int FROM teachers WHERE status='active' AND is_department_head AND nullif(trim(department),'') IS NOT NULL AND password_hash IS NOT NULL) AS department_head,(SELECT count(*)::int FROM department_staffs WHERE is_active AND password_hash IS NOT NULL) AS department_staff")).rows[0];
  const result={target,ledger,data,schemaDigest:crypto.createHash('sha256').update(JSON.stringify({columns,constraints,indexes})).digest('hex'),accounts};
  await client.query('ROLLBACK'); console.log(JSON.stringify(result));
 } catch {console.log(JSON.stringify({error:'READ_ONLY_DATABASE_VERIFICATION_FAILED'}));process.exitCode=1;} finally{await client.end();}
})();`;
new (require('node:vm').Script)(databaseScript);
const database = JSON.parse(command(['exec', '-i', 'intern_backend', 'node', '-'], databaseScript));
assert.ok(!database.error);
const rootFile = path.join(workspace, '.env');
const root = fs.existsSync(rootFile) ? dotenv.parse(fs.readFileSync(rootFile)) : {};
const result = {
  at: new Date().toISOString(), phase,
  postgres: { id: postgres.Id, startedAt: postgres.State.StartedAt, mounts: postgres.Mounts.map(m => ({type:m.Type,name:m.Name,destination:m.Destination})) },
  passwordVerified: true, passwordAuthentication: 'PASS from Backend container to postgres using existing password',
  rootPasswordStatus: root.POSTGRES_PASSWORD ? (root.POSTGRES_PASSWORD === backendFile.DB_PASSWORD ? 'MATCHES_VERIFIED_EXISTING' : 'MISMATCH_BLOCKED') : 'ABSENT',
  database,
  configuration: {
    DB_HOST: backend.DB_HOST, DB_NAME: backend.DB_NAME, DB_USER: backend.DB_USER, DB_PORT: backend.DB_PORT,
    GOOGLE_CLIENT_ID: backend.GOOGLE_CLIENT_ID ? 'SET_REDACTED' : 'ABSENT',
    clientIdFormatValid: /^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(backend.GOOGLE_CLIENT_ID || ''),
    clientIdsMatch: backend.GOOGLE_CLIENT_ID === frontend.VITE_GOOGLE_CLIENT_ID,
    GOOGLE_ALLOWED_EMAIL_DOMAINS: backend.GOOGLE_ALLOWED_EMAIL_DOMAINS,
    GOOGLE_HOSTED_DOMAIN_POLICY: backend.GOOGLE_HOSTED_DOMAIN_POLICY || 'required (default)',
    GOOGLE_ALLOWED_HOSTED_DOMAINS: backend.GOOGLE_ALLOWED_HOSTED_DOMAINS || 'ABSENT_UNCONFIRMED',
    GOOGLE_LOGIN_ENABLED: backend.GOOGLE_LOGIN_ENABLED, GOOGLE_ACCOUNT_LINKING_ENABLED: backend.GOOGLE_ACCOUNT_LINKING_ENABLED,
    FRONTEND_URL: backend.FRONTEND_URL, VITE_API_URL: frontend.VITE_API_URL,
    backendOAuthFileMatchesContainer: Object.keys(backendFile).filter(k=>/^GOOGLE_|^FRONTEND_URL$|^DB_/.test(k)).every(k=>backendFile[k]===backend[k]),
    frontendFileMatchesContainer: Object.keys(frontendFile).every(k=>frontendFile[k]===frontend[k])
  }
};
if (phase === 'after') {
  const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'runtime-before.json')));
  assert.deepEqual(result.postgres, before.postgres, 'POSTGRES_CONTAINER_OR_VOLUME_CHANGED');
  assert.deepEqual(result.database, before.database, 'DATABASE_SCHEMA_OR_DATA_CHANGED');
  assert.equal(result.configuration.DB_HOST, 'postgres');
  assert.equal(result.rootPasswordStatus, 'MATCHES_VERIFIED_EXISTING');
  result.preservation = 'PASS: PostgreSQL container, mounts, schema, ledger and all table counts/digests unchanged';
}
fs.writeFileSync(path.join(__dirname, 'runtime-' + phase + '.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({phase,passwordVerified:result.passwordVerified,rootPasswordStatus:result.rootPasswordStatus,DB_HOST:backend.DB_HOST,migration026:database.ledger.includes('026_google_identity_mapping.js'),accounts:database.accounts,mappings:database.data.google_identities.count,requests:database.data.google_auth_requests.count,preservation:result.preservation}));
