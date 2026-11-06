const jwt = require("jsonwebtoken");
const { issueTeacherToken, toSafeTeacherProfile } = require("./teacherAuth.service");
const { issueDepartmentStaffToken, toSafeDepartmentStaffProfile } = require("./staffAuth.service");
const { adminReady, superAdminSession } = require('./superAdminAuth.service');
const { assertAccountAccess } = require('./adminAccountAccess.service');
const { passwordGrant, membershipReady } = require('./teacherAdminGrant.service');

const destinations = {
  student: "/src/student_coop/student_coop.html",
  teacher: "/src/teacher_coop/teacher_coop.html",
  department_head: "/src/department_head/department_head.html",
  department_staff: "/src/department_staff/department_staff.html",
  super_admin: "/src/super_admin/super_admin.html",
};
const fail = (status, code, message) => {
  throw Object.assign(new Error(message), { status, code });
};
function authorizeActor(actor, type) {
  if (!actor || (type === "student" && (actor.track !== "co_op"
      || !["pending", "searching", "placed", "in_progress", "completed"].includes(actor.status)))
    || (type === "teacher" && (actor.status !== "active" || (actor.is_department_head && !actor.department?.trim())))
    || (type === "department_staff" && actor.is_active !== true)
    || (type === 'super_admin' && (actor.is_active !== true || process.env.NODE_ENV !== 'development'))) {
    fail(403, "ACCOUNT_UNAUTHORIZED", "บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
  }
  if (!Object.hasOwn(destinations, type)) fail(403, "ACCOUNT_UNAUTHORIZED", "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน");
  return type === "teacher" && actor.is_department_head === true ? "department_head" : type;
}
function applicationSession(actor, type, { adminGrant } = {}) {
  const role = authorizeActor(actor, type);
  const result = { success: true, message: "เข้าสู่ระบบสำเร็จ", role, actor_type: type, redirect: destinations[role] };
  if (type === "student") {
    result.token = jwt.sign({ id: actor.id, student_id: actor.student_id, email: actor.email, track: actor.track,
      actor_type: type, role }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: process.env.JWT_EXPIRES_IN || "1d" });
    result.data = Object.fromEntries(["id", "student_id", "first_name", "last_name", "email", "track", "status"].map(key => [key, actor[key]]));
  } else if (type === "teacher") {
    result.token = issueTeacherToken(actor, { adminGrant });
    result.teacher = toSafeTeacherProfile(actor);
  } else if (type === 'super_admin') {
    Object.assign(result, superAdminSession(actor));
  } else {
    result.token = issueDepartmentStaffToken(actor);
    result.staff = toSafeDepartmentStaffProfile(actor);
  }
  return result;
}
function createUnifiedAuthService({ models = require("../models") } = {}) {
  const actors = { student: models.Student, teacher: models.Teacher, department_staff: models.DepartmentStaff };
  async function resolveCredentials(input, options = {}) {
    const { email, password } = input || {};
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !["email", "password"].includes(key))
      || typeof email !== "string" || !email.trim() || email.length > 254
      || typeof password !== "string" || !password || password.length > 100) {
      fail(400, "LOGIN_INPUT", "กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง");
    }
    const matches = [];
    // Check every account store before issuing any token. Credentials, rather
    // than email patterns or caller roles, prove ownership of each candidate.
    for (const [type, Model] of Object.entries(actors)) {
      const candidates = await Model.findAll({ where: { email: email.trim().toLowerCase() }, ...options });
      for (const actor of candidates) {
        if (type !== "student" && Buffer.byteLength(password, "utf8") > 72) continue;
        if (actor.password_hash && await actor.comparePassword(password)) matches.push({ actor, type });
      }
    }
    if (await adminReady(models, options.transaction)) {
      const candidates = await models.SuperAdmin.findAll({ where: { email: email.trim().toLowerCase() }, ...options });
      for (const actor of candidates) if (actor.password_hash && Buffer.byteLength(password, 'utf8') <= 72 && await actor.comparePassword(password)) matches.push({ actor, type: 'super_admin' });
    }
    if (!matches.length) fail(401, "LOGIN_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    if (matches.length !== 1) fail(409, "AUTH_CONTEXT_AMBIGUOUS", "ข้อมูลเข้าสู่ระบบตรงกับหลายบัญชี กรุณาติดต่อผู้ดูแลระบบเพื่อยืนยันบัญชีที่ต้องการใช้งาน");
    const match = matches[0];
    await assertAccountAccess(models, match.type, match.actor.id, options);
    return { ...match, role: authorizeActor(match.actor, match.type) };
  }
  return { resolveCredentials, async login(input) {
    const { actor, type } = await resolveCredentials(input);
    if (type === 'teacher' && await membershipReady(models)) return models.sequelize.transaction(async transaction => {
      await models.sequelize.query('SELECT pg_advisory_xact_lock(63828018)', { transaction });
      const teacher = await models.Teacher.findByPk(actor.id, { transaction, lock: transaction.LOCK.SHARE });
      authorizeActor(teacher, type);
      if (!await teacher.comparePassword(input.password)) fail(401, 'LOGIN_CREDENTIALS', 'ข้อมูลเข้าสู่ระบบเปลี่ยนแล้ว');
      await assertAccountAccess(models, type, teacher.id, { transaction });
      const grant = await passwordGrant(models, teacher, transaction);
      const result = applicationSession(teacher, type, { adminGrant: grant });
      if (grant) await models.AdminAuditLog.create({ actor_id: grant.id, action: 'session.login', target_type: 'teacher', target_id: teacher.id, changes: { roles: ['teacher', 'super_admin'] } }, { transaction });
      return result;
    });
    if (type === 'super_admin') return models.sequelize.transaction(async transaction => {
      await models.sequelize.query('SELECT pg_advisory_xact_lock(63828018)', { transaction });
      const current = await models.SuperAdmin.findByPk(actor.id, { transaction, lock: transaction.LOCK.UPDATE });
      authorizeActor(current, type);
      if (!await current.comparePassword(input.password)) fail(401, 'LOGIN_CREDENTIALS', 'ข้อมูลเข้าสู่ระบบเปลี่ยนแล้ว');
      await assertAccountAccess(models, type, current.id, { transaction });
      const result = applicationSession(current, type);
      await models.AdminAuditLog.create({ actor_id: current.id, action: 'session.login', target_type: type, target_id: current.id, changes: {} }, { transaction });
      return result;
    });
    return applicationSession(actor, type);
  } };
}
module.exports = { createUnifiedAuthService, applicationSession, authorizeActor };
