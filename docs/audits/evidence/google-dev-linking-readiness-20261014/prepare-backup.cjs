// Archive generation and full archive-to-/dev/null validation. No restore to a DB.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const docker = process.env.FITM_AUDIT_DOCKER, destination = process.env.FITM_AUDIT_BACKUP_DIR;
const workspace = path.resolve(__dirname, '../../../..');
if (!docker || !destination || !path.isAbsolute(destination) || !path.relative(workspace,destination).startsWith('..' + path.sep)) throw Error('EXTERNAL_BACKUP_DIRECTORY_REQUIRED');
function run(args,input){const r=cp.spawnSync(docker,args,{input,encoding:null,windowsHide:true,maxBuffer:128*1024*1024});if(r.status!==0)throw Error('BACKUP_TOOL_FAILED');return r.stdout;}
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'runtime-before.json'))).database;
const identity=JSON.parse(run(['exec','-e','PGOPTIONS=-c default_transaction_read_only=on','intern_postgres','psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d','intern_system','-c',"SELECT json_build_object('database',current_database(),'cluster_identifier',(SELECT system_identifier::text FROM pg_control_system()),'version',current_setting('server_version'))"]).toString('utf8'));
if(identity.database!==baseline.target.database||identity.cluster_identifier!==baseline.target.cluster_identifier)throw Error('BACKUP_TARGET_MISMATCH');
const dumpVersion=run(['exec','intern_postgres','pg_dump','--version']).toString('utf8').trim();
const restoreVersion=run(['exec','intern_postgres','pg_restore','--version']).toString('utf8').trim();
if(!/PostgreSQL\) 16\./.test(dumpVersion)||!/PostgreSQL\) 16\./.test(restoreVersion))throw Error('POSTGRES_16_TOOL_REQUIRED');
const archivePath=path.join(destination,'intern_system-before-google-linking.dump');
const bytes=run(['exec','-e','PGOPTIONS=-c default_transaction_read_only=on','intern_postgres','pg_dump','-U','postgres','-d','intern_system','--format=custom']);
if(bytes.length<1000||bytes.subarray(0,5).toString()!=='PGDMP')throw Error('INVALID_BACKUP_ARCHIVE');
fs.writeFileSync(archivePath,bytes,{flag:'wx',mode:0o600});
const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
const toc=run(['exec','-i','intern_postgres','pg_restore','--list'],bytes).toString('utf8');
const tableData=[...toc.matchAll(/^\d+;\s+\d+\s+\d+\s+TABLE DATA public (\S+) /gm)].map(m=>m[1]).sort();
if(JSON.stringify(tableData)!==JSON.stringify(Object.keys(baseline.data).sort()))throw Error('BACKUP_TOC_TABLE_MISMATCH');
// Generates/decompresses all SQL and data into Linux /dev/null; no --dbname option.
run(['exec','-i','intern_postgres','pg_restore','--exit-on-error','--file=/dev/null'],bytes);
const persistedHash=crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
if(persistedHash!==sha256)throw Error('BACKUP_HASH_MISMATCH');
bytes.fill(0);
const summary={status:'PASS_ARCHIVE_PREPARED_AND_FULLY_READ',createdAt:new Date().toISOString(),archivePath,sha256,bytes:fs.statSync(archivePath).size,database:identity.database,postgresVersion:identity.version,dumpVersion,restoreVersion,sourceClusterMatches:true,sourceReadOnly:true,archiveMagic:'PGDMP',tocTableDataCount:tableData.length,tocMatchesAllPublicTables:true,fullArchiveRead:'PASS: pg_restore --exit-on-error --file=/dev/null; no Database connection',restoreTest:'NOT TESTED: separate Database requires approval',sourceRowCounts:Object.fromEntries(Object.entries(baseline.data).map(([t,v])=>[t,v.count])),limitations:['Database snapshot only; excludes uploaded files and PostgreSQL cluster globals','Application/identity recovery not yet rehearsed','New data after backup must not be overwritten']};
fs.writeFileSync(path.join(destination,'backup-manifest.json'),JSON.stringify(summary,null,2),{flag:'wx',mode:0o600});
fs.writeFileSync(path.join(__dirname,'backup-preparation.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({status:summary.status,bytes:summary.bytes,tables:tableData.length,archiveHashVerified:true,fullArchiveRead:'PASS',restoreTest:'NOT TESTED'}));
