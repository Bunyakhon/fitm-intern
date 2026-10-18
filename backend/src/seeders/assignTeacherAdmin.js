const readline = require('node:readline');
const { Op, QueryTypes } = require('sequelize');
const { localConnection, preflight, preservedAccounts } = require('../db/prepareSuperAdminSchema');
const { credentialStamp, stampMatches } = require('../services/teacherAdminGrant.service');
const { accountControl } = require('../services/adminAccountAccess.service');
const p = require('../services/superAdmin.policy');
// Only these static messages may reach the terminal. Never print exception
// messages, Sequelize validation values, SQL, or driver connection details.
const ERRORS = Object.freeze({
  TERMINAL_REQUIRED: 'Use an interactive terminal without arguments or pipes.',
  INPUT_CANCELLED: 'Input cancelled; no assignment was submitted.',
  INPUT_ERROR: 'Terminal input ended or failed; no assignment was submitted.',
  INPUT_TOO_LONG: 'Input exceeded the supported length; enter it again.',
  ENVIRONMENT_BLOCKED: 'Local development target is required. Check NODE_ENV and local database configuration.',
  CONFIGURATION_ERROR: 'Required server credential configuration is missing.',
  SCHEMA_MISMATCH: 'The assignment schema does not match the models. Do not reset, seed, or change schema automatically.',
  TARGET_NOT_UNIQUE: 'Exactly one approved Teacher must match.',
  TARGET_NOT_ELIGIBLE: 'Teacher identity, status, title, or credentials do not match the approved target.',
  TARGET_CHANGED: 'Teacher target changed; restart and verify the displayed identity.',
  CONFIRMATION_MISMATCH: 'Confirmation must exactly match GRANT and the displayed Teacher ID.',
  PASSWORD_MISMATCH: 'New password and confirmation differ. Enter both again.',
  PASSWORD_TOO_SHORT: 'Use at least 14 characters.',
  PASSWORD_TOO_LONG: 'Use no more than 72 UTF-8 bytes; non-ASCII characters may use multiple bytes.',
  PASSWORD_WHITESPACE: 'Leading or trailing whitespace is not allowed.',
  PASSWORD_POLICY: 'Use a unique password without common or repeated patterns.',
  PASSWORD_UNCHANGED: 'The new password must differ from the current Teacher password.',
  ACCOUNT_DISABLED: 'The Teacher account is disabled.',
  MODEL_VALIDATION_FAILED: 'A model validation rejected the operation; no validation values are displayed.',
  DATABASE_CONSTRAINT: 'A database integrity constraint rejected the operation.',
  DATABASE_BUSY: 'Database lock or concurrent operation prevented assignment. Retry later.',
  DATABASE_ERROR: 'Database access failed. Check local database availability and permissions.',
  DATABASE_CLOSE_ERROR: 'Connection cleanup failed; assignment may already be committed. Re-running checks for an existing grant before any rotation.',
  INTEGRITY_CHECK_FAILED: 'Preservation or persisted credential verification failed.',
  INTERNAL_ERROR: 'An unexpected internal error prevented completion.',
});
class AssignmentError extends Error {
  constructor(code, status = 400, stage) { super(ERRORS[code]); this.code = code; this.status = status; this.stage = stage; }
}
const fail = (code, status) => { throw new AssignmentError(code, status); };
function safeError(error, stage = 'ASSIGNMENT') {
  if (error instanceof AssignmentError) { error.stage ||= stage; return error; }
  const sqlState = error?.original?.code || error?.parent?.code;
  let code = 'INTERNAL_ERROR';
  if (stage === 'CLOSE') code = 'DATABASE_CLOSE_ERROR';
  else if (stage === 'PASSWORD_INPUT' && ['TERMINAL_REQUIRED', 'INPUT_CANCELLED', 'INPUT_ERROR', 'INPUT_TOO_LONG'].includes(error?.code)) code = error.code;
  else if (['42P01', '42703', '42804', '23502'].includes(sqlState)) code = 'SCHEMA_MISMATCH';
  else if (['55P03', '40P01', '40001', '57014'].includes(sqlState)) code = 'DATABASE_BUSY';
  else if (['23505', '23503', '23514'].includes(sqlState) || ['SequelizeUniqueConstraintError', 'SequelizeForeignKeyConstraintError', 'SequelizeExclusionConstraintError'].includes(error?.name)) code = 'DATABASE_CONSTRAINT';
  else if (error?.name === 'SequelizeValidationError') code = 'MODEL_VALIDATION_FAILED';
  else if (/^Sequelize\w*Error$/.test(error?.name || '')) code = 'DATABASE_ERROR';
  else if (stage === 'ENVIRONMENT' || stage === 'PREFLIGHT') code = 'ENVIRONMENT_BLOCKED';
  return new AssignmentError(code, 400, stage);
}
async function atStage(stage, action) { try { return await action(); } catch (error) { throw safeError(error, stage); } }
function reportFailure(error, output = process.stderr) {
  const safe = safeError(error);
  output.write(`BLOCKED [${safe.code}] stage=${safe.stage}: ${ERRORS[safe.code]} No secrets displayed.\n`);
}
function validatePassword(password, repeated = password) {
  if (password !== repeated) fail('PASSWORD_MISMATCH');
  if (typeof password !== 'string') fail('PASSWORD_POLICY');
  if (password.length < 14) fail('PASSWORD_TOO_SHORT');
  if (Buffer.byteLength(password, 'utf8') > 72) fail('PASSWORD_TOO_LONG');
  if (password.trim() !== password) fail('PASSWORD_WHITESPACE');
  try { p.strongPassword(password); } catch { fail('PASSWORD_POLICY'); }
  return password;
}
function checkEnvironment() {
  if (process.env.NODE_ENV !== 'development') fail('ENVIRONMENT_BLOCKED', 403);
  if (!process.env.JWT_SECRET) fail('CONFIGURATION_ERROR');
}
async function checkSchema(models) {
  const rows = await models.sequelize.query("SELECT table_name,column_name,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('teachers','super_admins','admin_account_controls','admin_audit_logs')", { type: QueryTypes.SELECT });
  for (const name of ['Teacher', 'SuperAdmin', 'AdminAccountControl', 'AdminAuditLog']) {
    const model = models[name];
    for (const [key, attribute] of Object.entries(model.rawAttributes)) {
      if (attribute.type.key === 'VIRTUAL') continue;
      const column = rows.find(row => row.table_name === model.tableName && row.column_name === (attribute.field || key));
      if (!column || (name === 'SuperAdmin' && ['email', 'first_name', 'last_name', 'password_hash'].includes(key) && column.is_nullable !== 'YES')) fail('SCHEMA_MISMATCH');
    }
  }
}
const TARGET = Object.freeze({ first_name: 'สุพาภรณ์', last_name: 'ซิ้มเจริญ', academic_title: 'ผศ.ดร.' });
async function findTarget(models, transaction, lock) {
  const rows = await models.Teacher.findAll({ where: { first_name: { [Op.in]: [TARGET.first_name, TARGET.academic_title + TARGET.first_name] }, last_name: TARGET.last_name }, transaction, ...(lock ? { lock } : {}) });
  if (rows.length !== 1) fail('TARGET_NOT_UNIQUE', 409);
  const row = rows[0];
  if (row.status !== 'active' || row.is_department_head || !row.password_hash || row.academic_title?.trim() !== TARGET.academic_title) fail('TARGET_NOT_ELIGIBLE', 409);
  return row;
}
async function assignTeacherAdmin(models, { teacherId, password, confirmation }) {
  checkEnvironment();
  return atStage('ASSIGNMENT', () => models.sequelize.transaction(async transaction => {
    await atStage('PREFLIGHT', () => preflight(models.sequelize, transaction));
    await models.sequelize.query("SET LOCAL lock_timeout='5s'", { transaction });
    await models.sequelize.query('SELECT pg_advisory_xact_lock(63828018)', { transaction });
    const teacher = await findTarget(models, transaction, transaction.LOCK.UPDATE);
    if (teacher.id !== teacherId) fail('TARGET_CHANGED', 409);
    const existing = await models.SuperAdmin.findOne({ where: { teacher_id: teacher.id }, transaction });
    if (existing) return { status: 'already_granted', created: false, password_rotated: false };
    if (confirmation !== 'GRANT ' + teacher.id) fail('CONFIRMATION_MISMATCH');
    validatePassword(password);
    if (await teacher.comparePassword(password)) fail('PASSWORD_UNCHANGED');
    const control = await accountControl(models, 'teacher', teacher.id, transaction);
    if (control?.enabled === false) fail('ACCOUNT_DISABLED', 403);
    const before = await preservedAccounts(models.sequelize, transaction);
    const select = sql => models.sequelize.query(sql, { type: QueryTypes.SELECT, transaction, replacements: { id: teacher.id } });
    const profileFingerprint = async () => (await select("SELECT md5(string_agg((to_jsonb(t)-'password_hash'-'updated_at')::text,'' ORDER BY id)) AS digest FROM teachers t"))[0].digest;
    const otherTeachers = async () => (await select("SELECT md5(string_agg(t::text,'' ORDER BY id)) AS digest FROM teachers t WHERE id <> :id"))[0].digest;
    const profileBefore = await profileFingerprint(), othersBefore = await otherTeachers();
    await atStage('PASSWORD_ROTATION', () => teacher.update({ password }, { transaction, fields: ['password', 'password_hash', 'updatedAt'] }));
    const grant = await atStage('GRANT_CREATE', () => models.SuperAdmin.create({ teacher_id: teacher.id, credential_stamp: credentialStamp(teacher), permissions: [...p.ALL_PERMISSIONS] }, { transaction }));
    const current = control || await atStage('SESSION_REVOKE', () => models.AdminAccountControl.create({ actor_type: 'teacher', actor_id: teacher.id }, { transaction }));
    await atStage('SESSION_REVOKE', () => current.update({ revoked_before: Math.floor(Date.now() / 1000), version: current.version + 1 }, { transaction }));
    await atStage('AUDIT_WRITE', () => models.AdminAuditLog.create({ actor_id: grant.id, action: 'membership.assign', target_type: 'teacher', target_id: teacher.id, changes: { credential_rotated: true, roles: ['teacher', 'super_admin'], permissions: [...p.ALL_PERMISSIONS] } }, { transaction }));
    const after = await preservedAccounts(models.sequelize, transaction);
    for (const key of Object.keys(before)) if (key !== 'teachers' && JSON.stringify(before[key]) !== JSON.stringify(after[key])) fail('INTEGRITY_CHECK_FAILED');
    if (before.teachers.count !== after.teachers.count || profileBefore !== await profileFingerprint() || othersBefore !== await otherTeachers()) fail('INTEGRITY_CHECK_FAILED');
    const persisted = await models.Teacher.findByPk(teacher.id, { transaction });
    if (await models.SuperAdmin.count({ where: { teacher_id: teacher.id }, transaction }) !== 1 || !persisted || !await persisted.comparePassword(password) || !stampMatches(grant, persisted)) fail('INTEGRITY_CHECK_FAILED');
    return { status: 'granted', created: true, password_rotated: true, teacher_id: teacher.id, duplicate_accounts_created: 0 };
  }));
}
async function main() {
  if (process.argv.length !== 2 || !process.stdin.isTTY || !process.stdout.isTTY) throw new AssignmentError('TERMINAL_REQUIRED', 400, 'TERMINAL');
  const db = await atStage('ENVIRONMENT', () => { checkEnvironment(); return localConnection(); }); let password, repeated, failure;
  try {
    await atStage('PREFLIGHT', () => preflight(db));
    const models = { sequelize: db };
    for (const [name, file] of Object.entries({ Teacher: 'teacher', SuperAdmin: 'superAdmin', AdminAccountControl: 'adminAccountControl', AdminAuditLog: 'adminAuditLog' })) models[name] = require(`../models/${file}.model`)(db);
    await atStage('SCHEMA', () => checkSchema(models));
    const teacher = await atStage('TARGET_LOOKUP', () => findTarget(models));
    console.log(`${teacher.academic_title}${teacher.first_name} ${teacher.last_name}\nTeacher ID: ${teacher.id}\nStatus: ${teacher.status}; roles after confirmation: teacher + super_admin`);
    if (await atStage('TARGET_LOOKUP', () => models.SuperAdmin.count({ where: { teacher_id: teacher.id } }))) { console.log('Already granted; no password or permission changes'); return; }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const confirmation = await atStage('CONFIRMATION', () => new Promise((resolve, reject) => {
      rl.once('close', () => reject(new AssignmentError('INPUT_CANCELLED')));
      rl.once('SIGINT', () => { rl.close(); });
      rl.once('error', () => { reject(new AssignmentError('INPUT_ERROR')); rl.close(); });
      rl.question(`Type GRANT ${teacher.id} to confirm (anything else cancels): `, answer => { resolve(answer); rl.close(); });
    }));
    if (confirmation !== 'GRANT ' + teacher.id) { console.log('Cancelled; no changes'); return; }
    const { hidden } = require('./bootstrapSuperAdmin');
    console.log('Password: 14+ characters, at most 72 UTF-8 bytes; no edge whitespace, common/repeated patterns, or reuse of the current password. Input is hidden.');
    password = await atStage('PASSWORD_INPUT', () => hidden('New unique Teacher password (hidden): '));
    repeated = await atStage('PASSWORD_INPUT', () => hidden('Confirm new password (hidden): '));
    await atStage('PASSWORD_VALIDATION', () => validatePassword(password, repeated));
    const result = await assignTeacherAdmin(models, { teacherId: teacher.id, password, confirmation });
    console.log(JSON.stringify(result));
    if (result.created) console.log('Login again at http://localhost:5173/login.html with the SAME Teacher email and the new password. No second account was created.');
    else console.log('Already granted; this invocation made no password or permission changes.');
  } catch (error) { failure = error; throw error; }
  finally { password = repeated = null; try { await atStage('CLOSE', () => db.close()); } catch (error) { if (!failure) throw error; } }
}
if (require.main === module) main().catch(error => { reportFailure(error); process.exitCode = 1; });
module.exports = { TARGET, findTarget, assignTeacherAdmin, main, AssignmentError, safeError, reportFailure, validatePassword, checkSchema };
