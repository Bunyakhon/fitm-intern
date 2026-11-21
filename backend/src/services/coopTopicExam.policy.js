const p = require('./superAdmin.policy');
const { fail } = require('./coopTopicExam.rules');
const { assertAccountAccess } = require('./adminAccountAccess.service');
const { resolveAdminPrincipal } = require('./teacherAdminGrant.service');
const CAPABILITY = 'topic-exams.manage';
// A request body, actor string or copied object cannot supply this server-only
// handle. Only the route's existing manager guard creates one, after JWT auth.
const managerContexts = new WeakMap();
async function manager(req, models) {
  if (req.user?.actor_type === 'department_staff' && req.user.role === 'department_staff' && req.user.staff_id === req.user.id) {
    if (await models.DepartmentStaff.findOne({ where: { id: req.user.id, is_active: true }, attributes: ['id'] })) return `department_staff:${req.user.id}`;
  } else if (req.superAdmin) {
    p.developmentOnly(); p.requirePermission(req.superAdmin, CAPABILITY);
    return `super_admin:${req.superAdmin.id}`;
  }
  fail('ไม่มีสิทธิ์จัดการสอบหัวข้อโครงการ CO-09', 403, 'CO09_FORBIDDEN');
}
async function managerContext(req, models) {
  const actor = await manager(req, models);
  const fields = ['id', 'actor_type', 'role', 'staff_id', 'teacher_id', 'super_admin_id', 'student_id',
    'session_version', 'admin_grant_id', 'admin_session_version', 'iat', 'exp'];
  const claims = Object.freeze(Object.fromEntries(fields.filter(key => req.user?.[key] !== undefined).map(key => [key, req.user[key]])));
  const context = Object.freeze({ actor });
  managerContexts.set(context, { claims, models });
  return context;
}
function assertManagerSession(context) {
  const state = context && managerContexts.get(context);
  if (!state) fail('ไม่มีสิทธิ์จัดการสอบหัวข้อโครงการ CO-09', 403, 'CO09_FORBIDDEN');
  const { claims } = state;
  if (!Number.isFinite(claims.iat) || !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000)
    fail('Session หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่', 401, 'CO09_SESSION_REQUIRED');
  return claims;
}
async function revalidateManager(context, models, transaction) {
  const claims = assertManagerSession(context);
  if (managerContexts.get(context).models !== models || !transaction)
    fail('ไม่มีสิทธิ์จัดการสอบหัวข้อโครงการ CO-09', 403, 'CO09_FORBIDDEN');
  const deny = () => fail('ไม่มีสิทธิ์จัดการสอบหัวข้อโครงการ CO-09', 403, 'CO09_FORBIDDEN');
  try { p.uuid(claims.id); } catch { deny(); }
  let actor;
  if (claims.actor_type === 'department_staff') {
    if (claims.role !== 'department_staff' || claims.staff_id !== claims.id
      || claims.student_id !== undefined || claims.teacher_id !== undefined || claims.super_admin_id !== undefined) deny();
    const staff = await models.DepartmentStaff.findOne({ where: { id: claims.id, is_active: true },
      attributes: ['id'], transaction, lock: transaction.LOCK.SHARE });
    if (!staff) deny();
    await assertAccountAccess(models, 'department_staff', staff.id, { transaction, issuedAt: claims.iat });
    actor = `department_staff:${staff.id}`;
  } else {
    p.developmentOnly();
    if (claims.student_id !== undefined || claims.staff_id !== undefined) deny();
    if (claims.actor_type === 'super_admin') {
      if (claims.role !== 'super_admin' || claims.super_admin_id !== claims.id || claims.teacher_id !== undefined
        || !Number.isInteger(claims.session_version) || claims.session_version < 0) deny();
    } else if (claims.actor_type === 'teacher') {
      if (claims.role !== 'teacher' || claims.teacher_id !== claims.id || claims.super_admin_id !== undefined
        || !Number.isInteger(claims.admin_session_version) || claims.admin_session_version < 0) deny();
      try { p.uuid(claims.admin_grant_id); } catch { deny(); }
    } else deny();
    // Re-resolve the live native Admin or Teacher membership. Never use the
    // req.superAdmin object cached by middleware before the lock wait.
    const principal = await resolveAdminPrincipal(models, claims, { transaction, lock: transaction.LOCK.SHARE });
    if (!principal) fail('Admin Session ถูกเพิกถอนแล้ว', 401, 'CO09_SESSION_REQUIRED');
    p.requirePermission(principal, CAPABILITY);
    actor = `super_admin:${principal.id}`;
  }
  if (actor !== context.actor) deny();
  // Native/grant row locks and the common revocation-writer advisory protocol
  // hold authorization stable through commit; expiry must still be rechecked.
  assertManagerSession(context);
  return actor;
}
module.exports = { CAPABILITY, manager, managerContext, assertManagerSession, revalidateManager };
