const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const p = require('./superAdmin.policy');
const { createUnifiedAuthService, applicationSession } = require('./unifiedAuth.service');
const { createAuthenticateToken } = require('../middlewares/auth.middleware');
const { createSuperAdminRouter } = require('../routes/superAdmin.routes');
const { createSuperAdminService } = require('./superAdmin.service');
const { assertAccountAccess } = require('./adminAccountAccess.service');
const { bootstrap } = require('../seeders/bootstrapSuperAdmin');

test('permission, password, payload and query allowlists fail closed', () => {
  assert.throws(() => p.permissions(['*']));
  assert.throws(() => p.permissions(['audit.read', 'audit.read']));
  assert.throws(() => p.strongPassword('123456789'));
  assert.throws(() => p.strongPassword('ร'.repeat(40)));
  assert.throws(() => p.listQuery({ page: '-1' }));
  assert.throws(() => p.listQuery({ limit: '101' }));
  assert.throws(() => p.listQuery({ role: 'root' }));
  assert.throws(() => p.listQuery({ active: ['true'] }));
  assert.throws(() => p.listQuery({ sql: 'anything' }));
  assert.throws(() => p.settingValue('JWT_SECRET', 25));
  assert.throws(() => p.settingValue('constructor', 25));
  assert.throws(() => p.settingValue('__proto__', 25));
  assert.throws(() => p.settingValue('admin.page_size', 9));
  assert.throws(() => p.settingValue('admin.page_size', 10.5));
  assert.throws(() => p.privilegedBody({ password: 'fixture', confirmed: false }));
  assert.throws(() => p.developmentOnly({ NODE_ENV: 'production' }));
  assert.equal(p.settingValue('admin.page_size', 50), 50);
  assert.equal(p.allowed({ is_active: false, permissions: p.ALL_PERMISSIONS }, 'accounts.read'), false);
});

test('existing four roles preserve unified resolution and reject ambiguous credentials', async () => {
  const previous = process.env.JWT_SECRET; process.env.JWT_SECRET = randomBytes(32).toString('hex');
  try {
    for (const role of ['student', 'teacher', 'department_head', 'department_staff']) {
      const type = role === 'department_head' ? 'teacher' : role, id = randomUUID();
      const actor = { id, email: 'fixture@example.test', password_hash: 'fixture-marker', comparePassword: async () => true, student_id: '9900000000001', status: type === 'student' ? 'pending' : 'active', is_active: true, is_department_head: role === 'department_head', department: 'FIXTURE', track: 'co_op' };
      const empty = { findAll: async () => [] }, own = { findAll: async () => [actor] };
      const models = { Student: type === 'student' ? own : empty, Teacher: type === 'teacher' ? own : empty, DepartmentStaff: type === 'department_staff' ? own : empty };
      const result = await createUnifiedAuthService({ models }).login({ email: actor.email, password: 'synthetic-only' });
      assert.equal(result.role, role); assert.equal(result.actor_type, type); assert.equal(typeof result.token, 'string');
      const claims = jwt.verify(result.token, process.env.JWT_SECRET); assert.equal(claims.role, role);
      assert.equal(JSON.stringify(result).includes('fixture-marker'), false);
      await assert.rejects(createUnifiedAuthService({ models }).login({ email: actor.email, password: 'synthetic-only', role: 'super_admin' }), error => error.status === 400);
    }
    const actor = { password_hash: 'fixture', comparePassword: async () => true }, own = { findAll: async () => [actor] };
    await assert.rejects(createUnifiedAuthService({ models: { Student: own, Teacher: own, DepartmentStaff: { findAll: async () => [] } } }).login({ email: 'fixture@example.test', password: 'synthetic' }), error => error.status === 409);
  } finally { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; }
});

test('all admin endpoints reject unauthenticated/non-admin actors and missing permissions', async () => {
  const app = express(); app.use(express.json());
  let mode = 'missing';
  const authenticate = (req, res, next) => {
    if (mode === 'missing') return res.status(401).json({ message: 'Authentication required' });
    req.user = { id: randomUUID(), actor_type: mode, role: mode }; req.superAdmin = mode === 'super_admin' ? { is_active: true, permissions: [] } : undefined; next();
  };
  const oldMode = process.env.NODE_ENV; process.env.NODE_ENV = 'development';
  app.use('/api/admin', createSuperAdminRouter({ authenticate, service: {}, limits: false }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/api/admin';
  try {
    const routes = [['GET', '/me'], ['GET', '/overview'], ['GET', '/accounts'], ['GET', '/permissions'], ['GET', '/settings'], ['GET', '/audit'], ['POST', '/logout'], ['POST', '/me/password'], ['PATCH', '/accounts/student/' + randomUUID()], ['POST', '/accounts/student/' + randomUUID() + '/status'], ['PUT', '/accounts/super_admin/' + randomUUID() + '/permissions'], ['PUT', '/settings/admin.page_size']];
    routes.push(['PUT', '/accounts/teacher/' + randomUUID() + '/permissions'], ['POST', '/memberships/teacher/' + randomUUID() + '/status']);
    for (const [method, route] of routes) for (const actor of ['missing', 'student', 'teacher', 'department_head', 'department_staff']) {
      mode = actor; const response = await fetch(url + route, { method, headers: { 'Content-Type': 'application/json' }, ...(method !== 'GET' ? { body: '{}' } : {}) }); assert.equal(response.status, actor === 'missing' ? 401 : 403);
    }
    mode = 'super_admin'; assert.equal((await fetch(url + '/accounts')).status, 403);
    process.env.NODE_ENV = 'production'; assert.equal((await fetch(url + '/me')).status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); if (oldMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldMode; }
});

test('signed admin JWT requires a live active actor, current session version and account access', async () => {
  const oldSecret = process.env.JWT_SECRET, oldMode = process.env.NODE_ENV; process.env.JWT_SECRET = randomBytes(32).toString('hex'); process.env.NODE_ENV = 'development';
  const id = randomUUID(); let row = { id, is_active: true, permissions: [], session_version: 1 };
  const invoke = async (token, revoked = false) => {
    let status = 200, passed = false;
    const res = { status(value) { status = value; return this; }, json() {} };
    const auth = createAuthenticateToken({ SuperAdminModel: { findByPk: async () => row }, checkAccountAccess: async () => { if (revoked) throw Object.assign(Error('revoked'), { code: 'ACCOUNT_UNAUTHORIZED', status: 403 }); } });
    await auth({ headers: { authorization: 'Bearer ' + token } }, res, () => { passed = true; });
    return { status, passed };
  };
  try {
    const make = extra => jwt.sign({ id, super_admin_id: id, actor_type: 'super_admin', role: 'super_admin', session_version: 1, ...extra }, process.env.JWT_SECRET, extra?.exp === undefined ? { expiresIn: '15m' } : {});
    assert.equal((await invoke(make())).passed, true);
    assert.equal((await invoke(make({ session_version: 0 }))).status, 401);
    assert.equal((await invoke(make({ student_id: 'fake' }))).status, 401);
    assert.equal((await invoke(make().split('.').slice(0, 2).join('.') + '.invalid-signature')).status, 401);
    assert.equal((await invoke(make(), true)).status, 403);
    row = { ...row, is_active: false }; assert.equal((await invoke(make())).status, 403);
    row = null; assert.equal((await invoke(make())).status, 401);
    assert.equal((await invoke(make({ exp: 1, iat: 0 })) ).passed, false);
  } finally { if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; if (oldMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldMode; }
});

test('account status keeps native Teacher/Staff gates and refuses advisor dependencies', async () => {
  const oldMode = process.env.NODE_ENV; process.env.NODE_ENV = 'development';
  const admin = { id: randomUUID(), is_active: true, session_version: 0, permissions: p.ALL_PERMISSIONS, comparePassword: async () => true };
  const teacher = { id: randomUUID(), status: 'active', is_department_head: false, email: 'fixture@example.test', updatedAt: new Date(0) };
  const staff = { id: randomUUID(), is_active: true, updatedAt: new Date(0) };
  for (const row of [admin, teacher, staff]) row.update = async values => { Object.assign(row, values); return row; };
  let assigned = 0, pending = 0; const controls = new Map(), statements = [];
  const models = {
    sequelize: { query: async sql => { statements.push(sql); return [{ ready: true }]; }, transaction: async fn => fn({ LOCK: { UPDATE: 'UPDATE' } }) },
    SuperAdmin: { findByPk: async () => admin, findAll: async () => [admin] },
    Teacher: { findByPk: async () => teacher }, DepartmentStaff: { findByPk: async () => staff },
    Student: { count: async () => assigned }, CoopProjectAdvisorRequest: { count: async () => pending },
    AdminAccountControl: { findOne: async ({ where }) => controls.get(where.actor_type + ':' + where.actor_id) || null,
      create: async values => { const row = { ...values, enabled: true, revoked_before: 0, version: 0 }; row.update = async values => { Object.assign(row, values); return row; }; controls.set(row.actor_type + ':' + row.actor_id, row); return row; } },
    AdminAuditLog: { create: async () => ({}) },
  };
  try {
    const service = createSuperAdminService({ models }), claims = { id: admin.id, actor_type: 'super_admin', role: 'super_admin', session_version: 0, iat: Math.floor(Date.now() / 1000) + 1 }, body = { password: 'synthetic-only', confirmed: true };
    for (const [type, row] of [['teacher', teacher], ['department_staff', staff]]) {
      let current = await service.detail(type, row.id);
      await service.status(claims, type, row.id, { ...body, enabled: false }, current.version);
      assert.equal(type === 'teacher' ? row.status : row.is_active, type === 'teacher' ? 'inactive' : false);
      current = await service.detail(type, row.id);
      await service.status(claims, type, row.id, { ...body, enabled: true }, current.version);
      assert.equal(type === 'teacher' ? row.status : row.is_active, type === 'teacher' ? 'active' : true);
    }
    assert.equal(statements.includes('LOCK TABLE public.students IN EXCLUSIVE MODE'), true);
    const current = await service.detail('teacher', teacher.id);
    assigned = 1; await assert.rejects(service.status(claims, 'teacher', teacher.id, { ...body, enabled: false }, current.version), error => error.status === 409);
    assigned = 0; pending = 1; await assert.rejects(service.status(claims, 'teacher', teacher.id, { ...body, enabled: false }, current.version), error => error.status === 409);
    assert.equal(teacher.status, 'active');
  } finally { if (oldMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldMode; }
});

test('actual PostgreSQL/API: rollback-only admin fixtures, audit, optimistic conflicts, settings and preserved data', { skip: process.env.FITM_ADMIN_SQL_TEST !== '1' }, async context => {
  // Only explicitly requested local verification. No persisted accounts, seed,
  // schema changes or mutations to any pre-existing Teacher/Student/Staff row.
  const { localConnection, preflight, preservedAccounts } = require('../db/prepareSuperAdminSchema');
  const db = localConnection(); let outer, server, stage = 'preflight';
  const oldSecret = process.env.JWT_SECRET, oldMode = process.env.NODE_ENV; process.env.JWT_SECRET = randomBytes(32).toString('hex'); process.env.NODE_ENV = 'development';
  try {
    await preflight(db); outer = await db.transaction(); const before = await preservedAccounts(db, outer);
    const actual = { sequelize: db };
    for (const [name, file] of Object.entries({ Student: 'student', Teacher: 'teacher', DepartmentStaff: 'departmentStaff', SuperAdmin: 'superAdmin', AdminAccountControl: 'adminAccountControl', AdminAuditLog: 'adminAuditLog', SystemSetting: 'systemSetting' })) actual[name] = require(`../models/${file}.model`)(db);
    const methods = new Set(['findByPk', 'findOne', 'findAll', 'findAndCountAll', 'count', 'create']);
    const models = { sequelize: new Proxy(db, { get(target, key) { if (key === 'query') return (sql, options = {}) => target.query(sql, { ...options, transaction: options.transaction || outer }); if (key === 'transaction') return (options, fn) => typeof options === 'function' ? target.transaction({ transaction: outer }, options) : target.transaction({ ...options, transaction: outer }, fn); const value = target[key]; return typeof value === 'function' ? value.bind(target) : value; } }) };
    for (const [name, Model] of Object.entries(actual)) if (name !== 'sequelize') models[name] = new Proxy(Model, { get(target, key) { if (methods.has(key)) return (...args) => { const index = ['findByPk', 'create'].includes(key) ? 1 : 0; args[index] = { ...args[index], transaction: args[index]?.transaction || outer }; return target[key](...args); }; return target[key]; } });
    if (await models.SuperAdmin.count()) { context.skip('SQL fixture requires unbootstrapped admin tables; existing admin accounts are preserved'); return; }
    const password = randomBytes(24).toString('base64url');
    stage = 'bootstrap fixture';
    const initial = await bootstrap(models, { email: 'rollback-admin@example.test', first_name: 'ROLLBACK', last_name: 'FIXTURE', password }); assert.equal(initial.created, true);
    assert.equal((await bootstrap(models, {})).status, 'already_bootstrapped');
    const actor = await models.SuperAdmin.findOne({ where: { email: 'rollback-admin@example.test' } });
    const adminId = actor.id; const session = applicationSession(actor, 'super_admin'), claims = jwt.verify(session.token, process.env.JWT_SECRET);
    const auth = createAuthenticateToken({ StudentModel: models.Student, TeacherModel: models.Teacher, StaffModel: models.DepartmentStaff, SuperAdminModel: models.SuperAdmin, checkAccountAccess: (type, id, issuedAt) => assertAccountAccess(models, type, id, { transaction: outer, issuedAt }) });
    const service = createSuperAdminService({ models }); const app = express(); app.use(express.json()); app.get('/fixture-actor', auth, (req, res) => res.json({ type: req.user.actor_type, role: req.user.role })); app.use('/api/admin', createSuperAdminRouter({ authenticate: auth, service, limits: false }));
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const url = 'http://127.0.0.1:' + server.address().port + '/api/admin';
    const http = async (path, method = 'GET', body, version, token = session.token) => { const response = await fetch(url + path, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(version ? { 'If-Match': version } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: response.status, body: await response.json() }; };
    stage = 'login'; const loggedIn = await createUnifiedAuthService({ models }).login({ email: actor.email, password }); assert.equal(loggedIn.role, 'super_admin'); assert.equal(JSON.stringify(loggedIn).includes('password_hash'), false);
    stage = 'existing SQL-backed actor authorization';
    const existingActors = [
      ['student', await models.Student.findOne({ attributes: ['id', 'email', 'student_id', 'track', 'status'] })],
      ['teacher', await models.Teacher.findOne({ where: { is_department_head: false, status: 'active' }, attributes: ['id', 'email', 'status', 'is_department_head', 'department'] })],
      ['teacher', await models.Teacher.findOne({ where: { is_department_head: true, status: 'active' }, attributes: ['id', 'email', 'status', 'is_department_head', 'department'] })],
      ...(await models.DepartmentStaff.findAll({ attributes: ['id', 'email', 'is_active'] })).map(row => ['department_staff', row]),
    ];
    for (const [type, existing] of existingActors) {
      const response = await fetch('http://127.0.0.1:' + server.address().port + '/fixture-actor', { headers: { Authorization: 'Bearer ' + applicationSession(existing, type).token } }); assert.equal(response.status, 200);
      const value = await response.json(); assert.equal(value.type, type);
    }
    stage = 'overview/list/query';
    const stats = await http('/overview'); stage = 'overview HTTP status'; assert.equal(stats.status, 200); stage = 'overview student count'; assert.equal(stats.body.students, before.students.count); stage = 'overview teacher count'; assert.equal(stats.body.teachers, before.teachers.count); stage = 'overview staff count'; assert.equal(stats.body.department_staff, before.department_staffs.count);
    stage = 'account list/query';
    stage = 'direct account all'; assert.equal((await service.accounts({})).total, before.students.count + before.teachers.count + before.department_staffs.count + 1);
    stage = 'direct account role'; assert.equal((await service.accounts({ role: 'super_admin' })).total, 1);
    stage = 'direct account search'; assert.equal((await service.accounts({ role: 'super_admin', search: 'rollback-admin' })).total, 1);
    stage = 'HTTP account search'; const listing = await http('/accounts?role=super_admin&search=rollback-admin'); assert.equal(listing.status, 200); assert.equal(listing.body.total, 1); assert.equal((await http('/accounts?limit=101')).status, 400); assert.equal((await http('/accounts?role=root')).status, 400);
    const own = await http('/me'); assert.equal(own.status, 200); assert.equal(JSON.stringify(own.body).includes('password_hash'), false);
    const privileged = { password, confirmed: true };
    stage = 'optimistic account edit and denial';
    assert.equal((await http(`/accounts/super_admin/${adminId}`, 'PATCH', { password: 'synthetic-wrong', confirmed: true, changes: { first_name: 'DENIED' } }, own.body.version)).status, 403);
    assert.equal((await http(`/accounts/super_admin/${adminId}`, 'PATCH', { password, confirmed: false, changes: { first_name: 'DENIED' } }, own.body.version)).status, 400);
    assert.equal((await http(`/accounts/super_admin/${adminId}`, 'PATCH', { ...privileged, changes: { first_name: 'RENAMED' } })).status, 428);
    assert.equal((await http(`/accounts/super_admin/${adminId}`, 'PATCH', { ...privileged, changes: { first_name: 'RENAMED' } }, '"stale"')).status, 409);
    assert.equal((await http(`/accounts/super_admin/${adminId}`, 'PATCH', { ...privileged, changes: { role: 'teacher' } }, own.body.version)).status, 400);
    const renamed = await http(`/accounts/super_admin/${adminId}`, 'PATCH', { ...privileged, changes: { first_name: 'RENAMED' } }, own.body.version); assert.equal(renamed.status, 200); assert.equal(renamed.body.data.first_name, 'RENAMED');
    stage = 'last administrator guard';
    assert.equal((await http(`/accounts/super_admin/${adminId}/status`, 'POST', { ...privileged, enabled: false }, renamed.body.version)).status, 409);
    assert.equal((await http(`/accounts/super_admin/${adminId}/permissions`, 'PUT', { ...privileged, permissions: [] }, renamed.body.version)).status, 409);
    assert.equal((await http('/me')).body.data.active, true);
    stage = 'preserved Student/Head workflow protection';
    const studentId = existingActors[0][1].id, headId = existingActors[2][1].id;
    const studentDetail = await http('/accounts/student/' + studentId), headDetail = await http('/accounts/teacher/' + headId);
    assert.equal((await http('/accounts/student/' + studentId, 'PATCH', { ...privileged, changes: { first_name: 'DENIED' } }, studentDetail.body.version)).status, 409);
    assert.equal((await http('/accounts/teacher/' + headId + '/status', 'POST', { ...privileged, enabled: false }, headDetail.body.version)).status, 409);
    stage = 'settings and audit';
    assert.equal((await http('/settings/JWT_SECRET', 'PUT', { ...privileged, value: 10 }, '"0"')).status, 400);
    assert.equal((await http('/settings/admin.page_size', 'PUT', { ...privileged, value: 101 }, '"0"')).status, 400);
    const settings = await http('/settings'), defaultSetting = settings.body.find(row => row.key === 'admin.page_size');
    assert.equal((await http('/settings/admin.page_size', 'PUT', { ...privileged, value: 10 }, '"' + defaultSetting.version + '"')).status, 200);
    assert.equal((await http('/accounts')).body.limit, 10);
    const audit = await http('/audit'); assert.equal(audit.status, 200); assert.equal(audit.body.rows.some(row => row.action === 'setting.update'), true); assert.equal(JSON.stringify(audit.body).includes(password), false); assert.equal(audit.body.rows.some(row => row.action === 'account.status'), false);
    stage = 'actual audit immutability';
    await assert.rejects(models.sequelize.transaction(async transaction => {
      const row = await models.AdminAuditLog.findOne({ transaction });
      await row.update({ changes: { denied_rewrite: true } }, { transaction });
    }), error => error.original?.code === 'P0001');
    stage = 'permission/session revocation';
    const secondary = await models.SuperAdmin.create({ email: 'rollback-limited@example.test', first_name: 'LIMITED', last_name: 'FIXTURE', password, permissions: ['accounts.read'] });
    const limitedToken = applicationSession(secondary, 'super_admin').token;
    assert.equal((await http('/accounts', 'GET', null, null, limitedToken)).status, 200); assert.equal((await http('/settings', 'GET', null, null, limitedToken)).status, 403);
    const limited = await http(`/accounts/super_admin/${secondary.id}`);
    assert.equal((await http(`/accounts/super_admin/${secondary.id}/status`, 'POST', { ...privileged, enabled: false }, limited.body.version)).status, 200);
    assert.equal((await http('/accounts', 'GET', null, null, limitedToken)).status, 403);
    assert.equal((await http('/logout', 'POST', {})).status, 200); assert.equal((await http('/me')).status, 401);
    stage = 'preservation'; assert.deepEqual(await preservedAccounts(db, outer), before);
  } catch (error) { throw Error('Rollback-only SQL/API verification failed at: ' + stage + '; ' + error.name + '; code=' + (error.original?.code || error.code || 'none') + (typeof error.actual === 'number' ? '; actual=' + error.actual : '')); }
  finally { if (server) await new Promise(resolve => server.close(resolve)); if (outer) await outer.rollback(); await db.close(); if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; if (oldMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldMode; }
});
