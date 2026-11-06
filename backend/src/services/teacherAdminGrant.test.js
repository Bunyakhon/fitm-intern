const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Op, QueryTypes } = require('sequelize');
const { credentialStamp, stampMatches, resolveAdminPrincipal } = require('./teacherAdminGrant.service');
const { createSuperAdminService } = require('./superAdmin.service');
const { createUnifiedAuthService, applicationSession } = require('./unifiedAuth.service');
const { createAuthenticateToken } = require('../middlewares/auth.middleware');
const { createRequireTeacher } = require('../middlewares/teacherAuth.middleware');
const { createSuperAdminRouter } = require('../routes/superAdmin.routes');
const { assertAccountAccess } = require('./adminAccountAccess.service');
const { assignTeacherAdmin, findTarget } = require('../seeders/assignTeacherAdmin');
test('membership evidence requires fresh bound Teacher JWT, not a client role flag', async () => {
  const oldMode = process.env.NODE_ENV, oldSecret = process.env.JWT_SECRET; process.env.NODE_ENV = 'development'; process.env.JWT_SECRET = randomBytes(32).toString('hex');
  const teacher = { id: randomUUID(), status: 'active', password_hash: 'synthetic-hash', comparePassword: async () => true };
  const grant = { id: randomUUID(), teacher_id: teacher.id, is_active: true, permissions: ['accounts.read'], session_version: 3, credential_stamp: credentialStamp(teacher) };
  const models = { Teacher: { findByPk: async () => teacher }, SuperAdmin: { findByPk: async () => grant } };
  const claims = { id: teacher.id, teacher_id: teacher.id, actor_type: 'teacher', role: 'teacher', iat: 100, exp: 1000, admin_grant_id: grant.id, admin_session_version: 3 };
  try {
    assert.equal((await resolveAdminPrincipal(models, claims)).teacher_id, teacher.id);
    assert.equal(await resolveAdminPrincipal(models, { ...claims, admin_grant_id: undefined, super_admin: true }), null);
    assert.equal(await resolveAdminPrincipal(models, { ...claims, admin_session_version: 2 }), null);
    assert.equal(await resolveAdminPrincipal(models, { ...claims, role: 'department_head' }), null);
    assert.equal(await resolveAdminPrincipal(models, { ...claims, admin_grant_id: 'invalid' }), null);
    assert.equal(await resolveAdminPrincipal(models, { ...claims, exp: 10000 }), null);
    teacher.password_hash = 'rotated-synthetic'; assert.equal(stampMatches(grant, teacher), false); assert.equal(await resolveAdminPrincipal(models, claims), null);
    process.env.NODE_ENV = 'production'; assert.equal(await resolveAdminPrincipal(models, claims), null);
  } finally { if (oldMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldMode; if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; }
});
test('actual SQL/API Teacher+Admin assignment is atomic, unique, and entirely rolled back', { skip: process.env.FITM_ADMIN_SQL_TEST !== '1' }, async context => {
  const { localConnection, preflight, preservedAccounts } = require('../db/prepareSuperAdminSchema');
  const db = localConnection(); let outer, server, stage = 'preflight', original, originalAdminCount;
  const oldSecret = process.env.JWT_SECRET; process.env.JWT_SECRET = randomBytes(32).toString('hex');
  try {
    await preflight(db); original = await preservedAccounts(db); outer = await db.transaction();
    const actual = {};
    for (const [name, file] of Object.entries({ Teacher: 'teacher', SuperAdmin: 'superAdmin', Student: 'student', DepartmentStaff: 'departmentStaff', AdminAccountControl: 'adminAccountControl', AdminAuditLog: 'adminAuditLog', SystemSetting: 'systemSetting', CoopProjectAdvisorRequest: 'coopProjectAdvisorRequest' })) actual[name] = require(`../models/${file}.model`)(db);
    const methods = new Set(['findByPk', 'findOne', 'findAll', 'findAndCountAll', 'count', 'create']);
    const models = { sequelize: new Proxy(db, { get(target, key) { if (key === 'query') return (sql, options = {}) => target.query(sql, { ...options, transaction: options.transaction || outer }); if (key === 'transaction') return (options, fn) => typeof options === 'function' ? target.transaction({ transaction: outer }, options) : target.transaction({ ...options, transaction: outer }, fn); const value = target[key]; return typeof value === 'function' ? value.bind(target) : value; } }) };
    for (const [name, Model] of Object.entries(actual)) models[name] = new Proxy(Model, { get(target, key) { if (methods.has(key)) return (...args) => { const index = ['findByPk', 'create'].includes(key) ? 1 : 0; args[index] = { ...args[index], transaction: args[index]?.transaction || outer }; return target[key](...args); }; return target[key]; } });
    originalAdminCount = await models.SuperAdmin.count();
    if (originalAdminCount) { context.skip('Existing grants/admins preserved; fixture requires pre-assignment database'); return; }
    const target = await findTarget(models), teacherId = target.id, oldToken = applicationSession(target, 'teacher').token;
    const password = randomBytes(24).toString('base64url');
    const authenticate = createAuthenticateToken({ StudentModel: models.Student, TeacherModel: models.Teacher, StaffModel: models.DepartmentStaff, SuperAdminModel: models.SuperAdmin,
      checkAccountAccess: (type, id, issuedAt) => assertAccountAccess(models, type, id, { transaction: outer, issuedAt }), resolveTeacherAdmin: claims => resolveAdminPrincipal(models, claims, { transaction: outer }) });
    const service = createSuperAdminService({ models });
    const app = express(); app.use(express.json());
    app.post('/api/auth/unified-login', require('../controllers/unifiedAuth.controller').createUnifiedLoginHandler({ service: createUnifiedAuthService({ models }) }));
    app.get('/teacher', authenticate, createRequireTeacher({ TeacherModel: models.Teacher }), (req, res) => res.json({ teacher: true, admin: !!req.superAdmin }));
    app.use('/api/admin', createSuperAdminRouter({ authenticate, service, limits: false }));
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const http = async (path, token, method = 'GET', body, version) => { const response = await fetch(origin + path, { method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json', ...(version ? { 'If-Match': version } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: response.status, body: await response.json() }; };
    assert.equal((await http('/teacher', oldToken)).status, 200); assert.equal((await http('/api/admin/me', oldToken)).status, 403);
    stage = 'assignment confirmation';
    await assert.rejects(assignTeacherAdmin(models, { teacherId, password, confirmation: 'WRONG' }), error => error.status === 400);
    const assigned = await assignTeacherAdmin(models, { teacherId, password, confirmation: 'GRANT ' + teacherId }); assert.equal(assigned.status, 'granted');
    const grant = await models.SuperAdmin.findOne({ where: { teacher_id: teacherId } });
    stage = 'persisted rotated password'; assert.equal(await (await models.Teacher.findByPk(teacherId)).comparePassword(password), true);
    assert.equal(!grant.email && !grant.password_hash && !grant.first_name && !grant.last_name, true);
    await assert.rejects(models.sequelize.transaction(transaction => models.SuperAdmin.create({ teacher_id: teacherId, credential_stamp: grant.credential_stamp, permissions: grant.permissions }, { transaction })), error => error.name === 'SequelizeUniqueConstraintError');
    const beforeDuplicate = (await models.Teacher.findByPk(teacherId)).password_hash;
    assert.equal((await assignTeacherAdmin(models, { teacherId, password: 'ignored', confirmation: 'ignored' })).status, 'already_granted');
    assert.equal((await models.Teacher.findByPk(teacherId)).password_hash === beforeDuplicate, true);
    stage = 'old sessions cannot gain privilege'; assert.equal((await http('/api/admin/me', oldToken)).status, 403); assert.equal((await http('/teacher', oldToken)).status, 403);
    // JWT iat is second-granularity; ensure the new password login follows the
    // committed revocation second. This wait is fixture-only, not app behavior.
    await new Promise(resolve => setTimeout(resolve, 1100));
    stage = 'fresh unified login and both dashboards';
    const login = await http('/api/auth/unified-login', null, 'POST', { email: target.email, password }); stage = 'unified password login status'; assert.equal(login.status, 200); assert.equal(login.body.role, 'teacher'); assert.equal(login.body.redirect, '/src/teacher_coop/teacher_coop.html');
    let token = login.body.token;
    assert.equal(jwt.verify(token, process.env.JWT_SECRET).admin_grant_id, grant.id);
    stage = 'Teacher access with grant'; const teacherAccess = await http('/teacher', token); assert.equal(teacherAccess.status, 200); assert.equal(teacherAccess.body.admin, true);
    stage = 'Admin access with same token'; const adminAccess = await http('/api/admin/me', token); assert.equal(adminAccess.status, 200); assert.equal(adminAccess.body.data.id, teacherId);
    const stats = await http('/api/admin/overview', token); assert.equal(stats.body.total, 32); assert.equal(stats.body.teachers, 23); assert.equal(stats.body.students, 7); assert.equal(stats.body.department_staff, 2); assert.equal(stats.body.super_admins, 1);
    const list = await http('/api/admin/accounts?role=super_admin', token); assert.equal(list.body.total, 1); assert.equal(list.body.rows[0].actor_type, 'teacher'); assert.equal(list.body.rows[0].id, teacherId);
    stage = 'all other actors denied';
    const teachers = await models.Teacher.findAll({ where: { id: { [Op.ne]: teacherId } }, attributes: ['id', 'email', 'status', 'department', 'is_department_head'] }); assert.equal(teachers.length, 22);
    for (const teacher of teachers) assert.equal((await http('/api/admin/overview', applicationSession(teacher, 'teacher').token)).status, 403);
    const student = await models.Student.findOne({ where: { track: 'co_op' }, attributes: ['id', 'email', 'student_id', 'track', 'status'] }); assert.ok(student, 'An authorized Co-op fixture is required'); assert.equal((await http('/api/admin/overview', applicationSession(student, 'student').token)).status, 403);
    for (const staff of await models.DepartmentStaff.findAll({ attributes: ['id', 'email', 'is_active'] })) assert.equal((await http('/api/admin/overview', applicationSession(staff, 'department_staff').token)).status, 403);
    const me = await http('/api/admin/me', token), confirmation = { password, confirmed: true };
    stage = 'last admin, versions, settings and audit';
    assert.equal((await http('/api/admin/memberships/teacher/' + teacherId + '/status', token, 'POST', { ...confirmation, enabled: false }, me.body.version)).status, 409);
    assert.equal((await http('/api/admin/accounts/teacher/' + teacherId + '/permissions', token, 'PUT', { ...confirmation, permissions: [] }, me.body.version)).status, 409);
    assert.equal((await http('/api/admin/settings/admin.page_size', token, 'PUT', { ...confirmation, value: 10 }, '"0"')).status, 200);
    const audits = await http('/api/admin/audit', token); assert.equal(audits.status, 200); assert.equal(audits.body.rows.some(row => row.action === 'membership.assign'), true); assert.equal(JSON.stringify(audits.body).includes('credential_stamp'), false); assert.equal(JSON.stringify(audits.body).includes(password), false);
    stage = 'permission revocation retains Teacher identity';
    assert.equal((await http('/api/admin/accounts/teacher/' + teacherId + '/permissions', token, 'PUT', { ...confirmation, permissions: [...grant.permissions] }, me.body.version)).status, 200);
    assert.equal((await http('/api/admin/me', token)).status, 403); assert.equal((await http('/teacher', token)).status, 200);
    const relogin = await http('/api/auth/unified-login', null, 'POST', { email: target.email, password }); token = relogin.body.token; assert.equal((await http('/api/admin/me', token)).status, 200);
    stage = 'native password rotation revokes both views';
    const own = await http('/api/admin/me', token), nextPassword = randomBytes(24).toString('base64url');
    assert.equal((await http('/api/admin/me/password', token, 'POST', { password, confirmed: true, new_password: nextPassword }, own.body.version)).status, 200);
    assert.equal([401, 403].includes((await http('/api/admin/me', token)).status), true);
    await new Promise(resolve => setTimeout(resolve, 1100));
    const finalLogin = await http('/api/auth/unified-login', null, 'POST', { email: target.email, password: nextPassword }); token = finalLogin.body.token; assert.equal((await http('/api/admin/me', token)).status, 200);
    assert.equal((await http('/api/admin/logout', token, 'POST', {})).status, 200); assert.equal([401, 403].includes((await http('/teacher', token)).status), true);
  } catch (error) { throw Error('Teacher membership rollback verification failed at ' + stage + '; ' + error.name + '; code=' + (error.original?.code || error.code || 'none') + (typeof error.actual === 'number' ? '; actual=' + error.actual : '')); }
  finally {
    if (server) await new Promise(resolve => server.close(resolve)); if (outer) await outer.rollback();
    try { if (original) { assert.equal(JSON.stringify(await preservedAccounts(db)) === JSON.stringify(original), true); const [row] = await db.query('SELECT count(*)::int AS count FROM super_admins', { type: QueryTypes.SELECT }); if (originalAdminCount !== undefined) assert.equal(row.count, originalAdminCount); } }
    finally { await db.close(); if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; }
  }
});
