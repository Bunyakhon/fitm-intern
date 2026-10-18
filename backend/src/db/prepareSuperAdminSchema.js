const fs = require('node:fs');
const path = require('node:path');
const { Sequelize, QueryTypes } = require('sequelize');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });
const { developmentOnly } = require('../services/superAdmin.policy');
const names = ['super_admins', 'admin_account_controls', 'system_settings', 'admin_audit_logs'];
function localConnection() {
  developmentOnly();
  if (process.env.DB_NAME !== 'intern_system' || !['127.0.0.1', 'localhost', 'postgres'].includes(process.env.DB_HOST) || Number(process.env.DB_PORT || 5432) !== 5432) throw Error('Local target required');
  return new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, { dialect: 'postgres', host: '127.0.0.1', port: 5432, logging: false, dialectOptions: { connectionTimeoutMillis: 5000 }, pool: { acquire: 10000 } });
}
async function preflight(db, transaction) {
  const [row] = await db.query("SELECT current_database() AS database,current_schema() AS schema,current_setting('server_version_num')::int AS version,pg_is_in_recovery() AS recovery,(SELECT system_identifier::text FROM pg_control_system()) AS system_identifier", { type: QueryTypes.SELECT, transaction });
  if (row.database !== 'intern_system' || row.schema !== 'public' || row.version < 160000 || row.version >= 170000 || row.recovery || db.config.host !== '127.0.0.1' || Number(db.config.port) !== 5432) throw Error('Target mismatch');
  return row;
}
async function preservedAccounts(db, transaction) {
  const result = {};
  for (const table of ['students', 'teachers', 'department_staffs', 'student_profiles', 'student_files', 'google_identities']) {
    const [row] = await db.query(`SELECT count(*)::int AS count,md5(COALESCE(string_agg(md5(t::text),'' ORDER BY id),'')) AS fingerprint FROM public.${table} t`, { type: QueryTypes.SELECT, transaction });
    result[table] = row;
  }
  return result;
}
function verifyBackupProof(proof) {
  const root = path.resolve(__dirname, '../../../.local-dev-accounts/super-admin-backups');
  const backup = path.resolve(proof?.backup_file || '');
  if (path.dirname(backup) !== root || !backup.endsWith('.bin') || !fs.statSync(backup).isFile() || fs.statSync(backup).size < 100 || !/^[0-9a-f]{64}$/.test(proof.plain_sha256 || '') || Date.now() - fs.statSync(backup).mtimeMs > 60 * 60 * 1000) throw Error('Fresh verified DPAPI backup required');
}
async function applySchema(db, proof) {
  verifyBackupProof(proof);
  return db.transaction({ isolationLevel: 'REPEATABLE READ' }, async transaction => {
    const target = await preflight(db, transaction);
    if (proof.system_identifier !== target.system_identifier) throw Error('Backup target mismatch');
    await db.query('SELECT pg_advisory_xact_lock(63828018)', { transaction });
    const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN (:names)", { type: QueryTypes.SELECT, replacements: { names }, transaction });
    if (tables.length === names.length) return { status: 'already_present', created: 0 };
    if (tables.length) throw Error('Partial admin schema requires review');
    const before = await preservedAccounts(db, transaction);
    await db.query("SET LOCAL fitm.super_admin_backup_verified = 'on'", { transaction });
    await db.query(fs.readFileSync(path.join(__dirname, 'superAdminDevelopment.sql'), 'utf8'), { transaction });
    const integrity = require('./superAdminIntegrity');
    for (const item of integrity.constraints) await db.query(`ALTER TABLE public.${item.table_name} ADD CONSTRAINT ${item.name} ${item.definition}`, { transaction });
    for (const item of [...integrity.functions, ...integrity.triggers]) await db.query(item.definition, { transaction });
    const after = await preservedAccounts(db, transaction);
    if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('Existing data changed');
    return { status: 'created', tables: names, preserved: true, account_counts: { student: before.students.count, teacher: before.teachers.count, staff: before.department_staffs.count } };
  });
}
async function main() {
  const mode = process.argv[2];
  if (process.argv.length !== 3 || !['--preflight', '--apply-schema'].includes(mode)) throw Error('Use --preflight or verified private --apply-schema');
  const db = localConnection();
  try {
    if (mode === '--preflight') console.log(JSON.stringify(await preflight(db)));
    else { let input = ''; for await (const chunk of process.stdin) { input += chunk; if (input.length > 5000) throw Error('Invalid backup proof'); } console.log(JSON.stringify(await applySchema(db, JSON.parse(input)))); }
  } finally { await db.close(); }
}
if (require.main === module) main().catch(() => { console.error('BLOCKED: ตรวจ Local Development target/verified backup/schema; ไม่มีการ Reset หรือแก้บัญชีเดิม'); process.exitCode = 1; });
module.exports = { localConnection, preflight, preservedAccounts, verifyBackupProof, applySchema };
