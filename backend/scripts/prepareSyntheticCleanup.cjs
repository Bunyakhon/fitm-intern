// Phase A only: SELECT inspection and private manifests. No apply/delete mode.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client } = require('pg');
const { spawn } = require('node:child_process');
const { pipeline } = require('node:stream/promises');
const root = path.resolve(__dirname, '../..');
const digest = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const qi = name => '"' + name.replace(/"/g, '""') + '"';
const env = require('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
const fail = code => { throw Object.assign(new Error(code), { publicCode: code }); };
if (!process.argv[2] || !path.isAbsolute(process.argv[2]) || process.argv.length > 4 || (process.argv[3] && process.argv[3] !== '--backup')) fail('EXPLICIT_PRIVATE_OUTPUT_DIRECTORY_REQUIRED');
const output = path.resolve(process.argv[2]);
if (output.toLowerCase() === root.toLowerCase() || output.toLowerCase().startsWith(root.toLowerCase() + path.sep)) fail('PRIVATE_ARTIFACTS_MUST_BE_OUTSIDE_REPOSITORY');
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
if (fs.readdirSync(output).length) fail('OUTPUT_DIRECTORY_MUST_BE_EMPTY_NO_OVERWRITE');
const write = (name, value) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const connectionHost = env.DB_HOST === 'postgres' ? '127.0.0.1' : env.DB_HOST;
const client = new Client({ host: connectionHost, port: Number(env.DB_PORT), database: env.DB_NAME, user: env.DB_USER,
  password: env.DB_PASSWORD, connectionTimeoutMillis: 5000, application_name: 'fitm_cleanup_phase_a_select_only' });
async function docker(args, input, destination) {
  const child = spawn('docker', args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let text = ''; child.stderr.on('data', () => {}); // Never return provider/environment output.
  const complete = new Promise((resolve, reject) => {
    child.on('error', () => reject(Object.assign(new Error('DOCKER_UNAVAILABLE'), { publicCode: 'DOCKER_UNAVAILABLE' })));
    child.on('close', code => code === 0 ? resolve() : reject(Object.assign(new Error('BACKUP_COMMAND_FAILED'), { publicCode: 'BACKUP_COMMAND_FAILED' })));
  });
  if (input) fs.createReadStream(input).pipe(child.stdin); else child.stdin.end();
  if (destination) await Promise.all([complete, pipeline(child.stdout, fs.createWriteStream(destination, { flags: 'wx', mode: 0o600 }))]);
  else { child.stdout.on('data', chunk => { if (text.length < 1024 * 1024) text += chunk; }); await complete; }
  return text;
}
async function main() {
  if (env.NODE_ENV !== 'development' || !['localhost', '127.0.0.1', 'postgres'].includes(env.DB_HOST) || Number(env.DB_PORT) !== 5432 || env.DB_NAME !== 'intern_system') fail('DEVELOPMENT_CONFIG_REQUIRED');
  await client.connect();
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const select = async (sql, values = []) => (await client.query(sql, values)).rows;
  const [target] = await select(`SELECT current_database() database,current_schema() schema,inet_server_addr()::text server_address,
    inet_server_port() server_port,current_setting('server_version_num')::int version,current_setting('transaction_read_only') read_only,
    pg_is_in_recovery() recovery`);
  if (target.database !== 'intern_system' || target.schema !== 'public' || Math.floor(target.version / 10000) !== 16 || target.read_only !== 'on' || target.recovery
    || !/^(127\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|10\.)/.test(target.server_address || '')) fail('LIVE_DEVELOPMENT_TARGET_REQUIRED');
  const protectedRows = await select('SELECT id,student_id FROM public.students WHERE student_id=$1', ['6706022510107']);
  if (protectedRows.length !== 1) fail('PROTECTED_STUDENT_NOT_UNIQUE_STOP');
  const [identityCounts] = await select(`SELECT (SELECT count(*)::int FROM teachers) teachers,
    (SELECT count(*)::int FROM teachers WHERE is_department_head) department_heads,
    (SELECT count(*)::int FROM department_staffs) department_staffs,(SELECT count(*)::int FROM super_admins) super_admins`);
  const externalReferences = await select(`SELECT cn.nspname child_schema,c.relname child_table,pn.nspname parent_schema,p.relname parent_table,k.conname,
    pg_get_constraintdef(k.oid,true) definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
    JOIN pg_namespace cn ON cn.oid=c.relnamespace JOIN pg_class p ON p.oid=k.confrelid JOIN pg_namespace pn ON pn.oid=p.relnamespace
    WHERE k.contype='f' AND (cn.nspname='public' OR pn.nspname='public') AND cn.nspname<>pn.nspname`);
  const tables = await select(`SELECT c.oid::int oid,c.relname name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname`);
  const columns = await select(`SELECT c.relname table_name,a.attname name,format_type(a.atttypid,a.atttypmod) type FROM pg_attribute a
    JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`);
  const keys = await select(`SELECT c.relname table_name,k.contype, k.conname name,
    ARRAY(SELECT a.attname::text FROM unnest(k.conkey) WITH ORDINALITY u(num,ord) JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=u.num ORDER BY u.ord) columns,
    p.relname parent_table,pn.nspname parent_schema,
    ARRAY(SELECT a.attname::text FROM unnest(k.confkey) WITH ORDINALITY u(num,ord) JOIN pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=u.num ORDER BY u.ord) parent_columns,
    k.confdeltype delete_action,k.confupdtype update_action,pg_get_constraintdef(k.oid,true) definition
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_class p ON p.oid=k.confrelid LEFT JOIN pg_namespace pn ON pn.oid=p.relnamespace
    WHERE n.nspname='public' ORDER BY c.relname,k.conname`);
  const triggers = await select(`SELECT c.relname table_name,t.tgname name,t.tgenabled enabled,t.tgtype::int type,
    pg_get_triggerdef(t.oid,true) definition,p.proname function_name,pg_get_functiondef(p.oid) function_definition
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid
    WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`);
  const rows = {};
  for (const table of tables) {
    const keyFields = keys.filter(k => k.table_name === table.name && ['p','f'].includes(k.contype)).flatMap(k => k.columns);
    const keep = columns.filter(c => c.table_name === table.name && (keyFields.includes(c.name) || c.type === 'uuid'
      || /^(actor_type|target_type|target_id|role|status|storage_path|file_path|original_name|file_type|mime_type|file_size|version|document_version|is_current)$/.test(c.name))).map(c => c.name);
    rows[table.name] = await select(`SELECT (SELECT jsonb_object_agg(key,value) FROM jsonb_each(to_jsonb(t)) WHERE key=ANY($1::text[])) data,
      ARRAY(SELECT DISTINCT captures[1] FROM regexp_matches(to_jsonb(t)::text,'([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})','g') AS captures) uuid_refs,
      encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') fingerprint FROM public.${qi(table.name)} t`, [keep]);
  }
  const students = await select('SELECT id,student_id,first_name,last_name,email FROM public.students ORDER BY student_id,id');
  const receipts = [];
  for (const name of fs.readdirSync(path.join(root, '.local-dev-accounts')).filter(name => /teacher-demo\.json$|teacher-search-v1\.json$/.test(name))) {
    const text = fs.readFileSync(path.join(root, '.local-dev-accounts', name), 'utf8'); const r = JSON.parse(text);
    receipts.push({ name, file_sha256: digest(text), marker: r.marker, status: r.status, rows: r.rows, baseline: r.baseline });
  }
  const inventory = { created_at: new Date().toISOString(), phase: 'A_SELECT_ONLY', target: { environment: env.NODE_ENV, configured_host: env.DB_HOST, connection_host: connectionHost, port: Number(env.DB_PORT), ...target },
    protected_student: protectedRows[0], identity_counts: identityCounts, external_references: externalReferences, tables, columns, keys, triggers, rows, students, receipts };
  write('inventory.private.json', inventory);
  if (process.argv.includes('--backup')) {
    if (output.startsWith(root + path.sep)) fail('BACKUP_MUST_BE_OUTSIDE_REPOSITORY');
    const version = (await docker(['exec','intern_postgres','pg_dump','--version'])).trim();
    if (!/PostgreSQL\) 16\./.test(version)) fail('PG_DUMP_16_REQUIRED');
    const [{ snapshot }] = await select('SELECT pg_export_snapshot() snapshot');
    const dumpFile = path.join(output, 'intern_system.dump');
    await docker(['exec','intern_postgres','sh','-c','exec pg_dump -U "$POSTGRES_USER" -d intern_system -Fc --no-password --snapshot="$1"','fitm-phase-a',snapshot], null, dumpFile);
    if (!fs.statSync(dumpFile).size) fail('EMPTY_BACKUP');
    const listing = await docker(['exec','-i','intern_postgres','pg_restore','--list'], dumpFile);
    fs.writeFileSync(path.join(output,'backup.toc.txt'), listing, { flag: 'wx', mode: 0o600 });
    // Archive decompression/readback only. SQL output is discarded, never run.
    await docker(['exec','-i','intern_postgres','pg_restore','--file=/dev/null'], dumpFile);
    const hash = crypto.createHash('sha256'); for await (const chunk of fs.createReadStream(dumpFile)) hash.update(chunk);
    const backup = { status: 'DUMP_CREATED_ARCHIVE_READBACK_COMPLETED', database: target.database, version,
      file: dumpFile, bytes: fs.statSync(dumpFile).size, sha256: hash.digest('hex'), exported_snapshot: snapshot,
      created_at: new Date().toISOString(), restore_executed: false, storage_files_in_pg_dump: false };
    write('backup.private.json', backup); console.log(JSON.stringify({ backup }));
  }
  await client.query('ROLLBACK');
  console.log(JSON.stringify({ phase: inventory.phase, target: inventory.target, protected_student: protectedRows[0],
    identity_counts: identityCounts, external_references: externalReferences, table_counts: Object.fromEntries(tables.map(t => [t.name,rows[t.name].length])), foreign_keys: keys.filter(k => k.contype === 'f').length,
    triggers: triggers.map(t => ({ table: t.table_name,name:t.name })), private_output: path.relative(root,output), database_deletes: 0 }, null, 2));
}
main().catch(error => { console.error(JSON.stringify({ error: error.publicCode || error.code || error.name, database_deletes: 0 })); process.exitCode = 1; }).finally(() => client.end());
