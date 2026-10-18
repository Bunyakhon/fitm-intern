const test = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const { Sequelize } = require('sequelize');
const { hidden } = require('./bootstrapSuperAdmin');
const { TARGET, assignTeacherAdmin, findTarget, validatePassword, safeError, reportFailure, checkSchema } = require('./assignTeacherAdmin');

// All credentials and identities below are synthetic; no database connection,
// real Teacher update, or grant is used by this suite.
const password = 'Fixture-Unique!2026';
const teacherId = '11111111-1111-4111-8111-111111111111';
function code(expected) { return error => error.code === expected; }
function terminal() {
  const input = new PassThrough(); input.isTTY = true; input.isRaw = false;
  input.setRawMode = value => { input.isRaw = value; };
  const output = { isTTY: true, text: '', write(value) { this.text += value; } };
  return { input, output };
}
function fixture() {
  let state = { password: 'fixture-old', password_hash: 'fixture-old-hash', grant: null, control: null, audit: [], writes: 0 };
  const teacher = { id: teacherId, ...TARGET, status: 'active', is_department_head: false,
    get password_hash() { return state.password_hash; },
    comparePassword: async value => value === state.password,
    update: async ({ password }) => { state.password = password; state.password_hash = 'fixture-hash:' + password; state.writes++; },
  };
  const models = {
    sequelize: {
      config: { host: '127.0.0.1', port: 5432 },
      transaction: async action => { const before = structuredClone(state); try { return await action({ LOCK: { UPDATE: 'UPDATE' } }); } catch (error) { state = before; throw error; } },
      query: async sql => {
        if (sql.includes('to_regclass')) return [{ ready: true }];
        if (sql.includes('current_database()')) return [{ database: 'intern_system', schema: 'public', version: 160000, recovery: false }];
        if (sql.includes('count(*)::int AS count')) return [{ count: 1, fingerprint: sql.includes('public.teachers') ? state.password_hash : 'unchanged' }];
        if (sql.includes('AS digest')) return [{ digest: 'preserved' }];
        return [];
      },
    },
    Teacher: { findAll: async () => [teacher], findByPk: async () => teacher },
    SuperAdmin: { findOne: async () => state.grant, count: async () => state.grant ? 1 : 0,
      create: async values => { state.writes++; return (state.grant = { id: teacherId, ...values }); } },
    AdminAccountControl: { findOne: async () => state.control,
      create: async values => { state.control = { ...values, version: 0 }; return { ...state.control, update: async values => Object.assign(state.control, values) }; } },
    AdminAuditLog: { create: async values => { state.audit.push(values); } },
  };
  return { models, teacher, state: () => state, input: { teacherId, password, confirmation: 'GRANT ' + teacherId } };
}
const oldMode = process.env.NODE_ENV, oldSecret = process.env.JWT_SECRET;
test.before(() => { process.env.NODE_ENV = 'development'; process.env.JWT_SECRET = 'fixture-only-secret-not-a-server-key'; });
test.after(() => { for (const [key, value] of [['NODE_ENV', oldMode], ['JWT_SECRET', oldSecret]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

test('password errors distinguish mismatch, length, UTF-8 bytes, whitespace and existing policy', () => {
  for (const [value, expected] of [['short', 'PASSWORD_TOO_SHORT'], ['ก'.repeat(25), 'PASSWORD_TOO_LONG'], [' ' + password, 'PASSWORD_WHITESPACE'], ['x'.repeat(14), 'PASSWORD_POLICY'], ['ExamplePassword!2026', 'PASSWORD_POLICY']]) assert.throws(() => validatePassword(value), code(expected));
  assert.throws(() => validatePassword(password, password + 'x'), code('PASSWORD_MISMATCH'));
  assert.equal(validatePassword(password), password);
  assert.equal(validatePassword('ก'.repeat(20) + 'Az9!'), 'ก'.repeat(20) + 'Az9!');
});

test('diagnostics classify every database/validation family without exposing exception text, SQL or values', () => {
  const secret = 'DO_NOT_PRINT_FIXTURE_SECRET_OR_SQL';
  for (const [error, stage, expected] of [
    [{ name: 'SequelizeDatabaseError', original: { code: '42703' } }, 'ASSIGNMENT', 'SCHEMA_MISMATCH'],
    [{ name: 'SequelizeDatabaseError', original: { code: '42P01' } }, 'SCHEMA', 'SCHEMA_MISMATCH'],
    [{ name: 'SequelizeDatabaseError', original: { code: '23502' } }, 'ASSIGNMENT', 'SCHEMA_MISMATCH'],
    [{ name: 'SequelizeUniqueConstraintError', original: { code: '23505' } }, 'ASSIGNMENT', 'DATABASE_CONSTRAINT'],
    [{ original: { code: '23514' } }, 'ASSIGNMENT', 'DATABASE_CONSTRAINT'],
    [{ original: { code: '55P03' } }, 'ASSIGNMENT', 'DATABASE_BUSY'],
    [{ original: { code: '40001' } }, 'ASSIGNMENT', 'DATABASE_BUSY'],
    [{ name: 'SequelizeConnectionRefusedError' }, 'PREFLIGHT', 'DATABASE_ERROR'],
    [{ name: 'SequelizeDatabaseError', original: { code: '42501' } }, 'ASSIGNMENT', 'DATABASE_ERROR'],
    [{ name: 'SequelizeValidationError', errors: [{ value: secret }] }, 'ASSIGNMENT', 'MODEL_VALIDATION_FAILED'],
    [{}, 'ENVIRONMENT', 'ENVIRONMENT_BLOCKED'], [{}, 'PREFLIGHT', 'ENVIRONMENT_BLOCKED'],
    [{ name: 'SequelizeConnectionError' }, 'CLOSE', 'DATABASE_CLOSE_ERROR'],
    [{ code: 'INPUT_CANCELLED' }, 'PASSWORD_INPUT', 'INPUT_CANCELLED'],
    [{ code: secret }, 'ASSIGNMENT', 'INTERNAL_ERROR'],
  ]) {
    const safe = safeError({ ...error, message: secret, sql: secret }, stage);
    let output = ''; reportFailure(safe, { write: text => { output += text; } });
    assert.equal(safe.code, expected); assert.ok(output.includes(`stage=${stage}`)); assert.ok(!output.includes(secret));
  }
});

test('hidden input consumes CR, LF and CRLF, handles Unicode backspace, never echoes password, restores raw mode', async () => {
  for (const ending of ['\r', '\n', '\r\n']) {
    const io = terminal(), result = hidden('Fixture: ', io);
    io.input.write(password + '😀\x7f' + ending);
    assert.equal(await result, password); assert.equal(io.input.isRaw, false);
    assert.equal(io.output.text, 'Fixture: \n'); assert.equal(io.input.listenerCount('keypress'), 0);
    assert.equal(io.input.listenerCount('end'), 0); assert.equal(io.input.listenerCount('error'), 0);
    io.input.destroy();
  }
});

test('two consecutive hidden prompts preserve exact passwords and terminal state', async () => {
  const io = terminal();
  for (const label of ['New: ', 'Confirm: ']) { const result = hidden(label, io); io.input.write(password + '\r'); assert.equal(await result, password); }
  assert.equal(io.output.text, 'New: \nConfirm: \n'); io.input.destroy();
});

test('hidden Ctrl+C/Ctrl+D/Ctrl+Z, EOF, stream error and overflow fail safely and restore mode', async () => {
  for (const action of ['\x03', '\x04', '\x1a', 'end', 'error', 'overflow']) {
    const io = terminal(), result = hidden('Fixture: ', io);
    const expected = action === 'error' ? 'INPUT_ERROR' : action === 'overflow' ? 'INPUT_TOO_LONG' : 'INPUT_CANCELLED';
    const rejected = assert.rejects(result, code(expected));
    if (action === 'end') io.input.end();
    else if (action === 'error') io.input.emit('error', Error('sensitive fixture details'));
    else io.input.write(action === 'overflow' ? 'x'.repeat(257) : action);
    await rejected; assert.equal(io.input.isRaw, false); assert.equal(io.input.listenerCount('keypress'), 0); assert.equal(io.output.text, 'Fixture: \n'); io.input.destroy();
  }
  const io = terminal(); io.input.isRaw = true;
  const result = hidden('Fixture: ', io); io.input.write(password + '\r'); await result; assert.equal(io.input.isRaw, true); io.input.destroy();
});

test('hidden input rejects non-TTY and raw-mode failure without exposing input', async () => {
  const io = terminal(); io.input.isTTY = false;
  await assert.rejects(hidden('Fixture: ', io), code('TERMINAL_REQUIRED'));
  io.input.isTTY = true; io.input.setRawMode = () => { throw Error('sensitive details'); };
  await assert.rejects(hidden('Fixture: ', io), code('INPUT_ERROR'));
  assert.equal(io.input.listenerCount('keypress'), 0); io.input.destroy();
});

test('schema precheck detects missing membership column and legacy NOT NULL without any DDL', async () => {
  const db = new Sequelize('fixture', 'fixture', 'fixture', { dialect: 'postgres', logging: false });
  const models = { sequelize: db };
  for (const [name, file] of Object.entries({ Teacher: 'teacher', SuperAdmin: 'superAdmin', AdminAccountControl: 'adminAccountControl', AdminAuditLog: 'adminAuditLog' })) models[name] = require(`../models/${file}.model`)(db);
  const rows = Object.values(models).filter(model => model.rawAttributes).flatMap(model => Object.entries(model.rawAttributes).filter(([, attribute]) => attribute.type.key !== 'VIRTUAL').map(([key, attribute]) => ({ table_name: model.tableName, column_name: attribute.field || key, is_nullable: attribute.allowNull === false ? 'NO' : 'YES' })));
  let current = rows;
  db.query = async sql => { assert.ok(sql.startsWith('SELECT ')); return current; };
  await checkSchema(models);
  current = rows.filter(row => row.column_name !== 'credential_stamp');
  await assert.rejects(checkSchema(models), code('SCHEMA_MISMATCH'));
  current = rows.map(row => row.table_name === 'super_admins' && row.column_name === 'password_hash' ? { ...row, is_nullable: 'NO' } : row);
  await assert.rejects(checkSchema(models), code('SCHEMA_MISMATCH')); await db.close();
});

test('target lookup rejects zero/multiple, inactive, head, missing credentials and title mismatch', async () => {
  for (const rows of [[], [{}, {}]]) await assert.rejects(findTarget({ Teacher: { findAll: async () => rows } }), code('TARGET_NOT_UNIQUE'));
  for (const patch of [{ status: 'inactive' }, { is_department_head: true }, { password_hash: null }, { academic_title: 'other' }]) {
    const row = { ...TARGET, status: 'active', password_hash: 'fixture', ...patch };
    await assert.rejects(findTarget({ Teacher: { findAll: async () => [row] } }), code('TARGET_NOT_ELIGIBLE'));
  }
});

test('assignment validation cannot persist changes; duplicate grant cannot rotate password', async () => {
  for (const [patch, expected] of [[{ teacherId: 'other' }, 'TARGET_CHANGED'], [{ confirmation: 'WRONG' }, 'CONFIRMATION_MISMATCH'], [{ password: 'short' }, 'PASSWORD_TOO_SHORT'], [{ password: 'fixture-old-but-long' }, 'PASSWORD_UNCHANGED']]) {
    const f = fixture(); if (expected === 'PASSWORD_UNCHANGED') f.state().password = patch.password;
    await assert.rejects(assignTeacherAdmin(f.models, { ...f.input, ...patch }), code(expected)); assert.equal(f.state().writes, 0); assert.equal(f.state().grant, null);
  }
  const disabled = fixture(); disabled.state().control = { enabled: false };
  await assert.rejects(assignTeacherAdmin(disabled.models, disabled.input), code('ACCOUNT_DISABLED')); assert.equal(disabled.state().writes, 0);
  const duplicate = fixture(); duplicate.state().grant = { teacher_id: teacherId };
  assert.equal((await assignTeacherAdmin(duplicate.models, { ...duplicate.input, password: 'ignored' })).status, 'already_granted'); assert.equal(duplicate.state().writes, 0);
});

test('fixture transaction rolls back rotation and grant if audit or integrity verification fails', async () => {
  for (const expected of ['DATABASE_ERROR', 'INTEGRITY_CHECK_FAILED']) {
    const f = fixture(), original = structuredClone(f.state());
    if (expected === 'DATABASE_ERROR') f.models.AdminAuditLog.create = async () => { throw Object.assign(Error('sensitive SQL and credential'), { name: 'SequelizeDatabaseError', original: { code: '42501' } }); };
    else f.models.Teacher.findByPk = async () => null;
    await assert.rejects(assignTeacherAdmin(f.models, f.input), error => error.code === expected && (expected !== 'DATABASE_ERROR' || error.stage === 'AUDIT_WRITE')); assert.deepEqual(f.state(), original);
  }
});

test('valid fixture input completes the atomic workflow with one membership and native Teacher credential', async () => {
  const f = fixture();
  assert.equal((await assignTeacherAdmin(f.models, f.input)).status, 'granted');
  assert.equal(f.state().password, password); assert.equal(f.state().grant.teacher_id, teacherId);
  assert.equal(f.state().grant.password_hash, undefined); assert.equal(f.state().grant.email, undefined);
  assert.equal(f.state().audit.length, 1); assert.equal(f.state().control.version, 1);
});

test('environment and missing credential configuration block before a fixture transaction', async () => {
  const f = fixture();
  try {
    process.env.NODE_ENV = 'production'; await assert.rejects(assignTeacherAdmin(f.models, f.input), code('ENVIRONMENT_BLOCKED'));
    process.env.NODE_ENV = 'development'; delete process.env.JWT_SECRET; await assert.rejects(assignTeacherAdmin(f.models, f.input), code('CONFIGURATION_ERROR'));
    assert.equal(f.state().writes, 0);
  } finally { process.env.NODE_ENV = 'development'; process.env.JWT_SECRET = 'fixture-only-secret-not-a-server-key'; }
});
