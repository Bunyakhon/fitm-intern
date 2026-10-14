const { randomUUID, randomBytes, createHash } = require("node:crypto");
const { Op, QueryTypes } = require("sequelize");
const jwt = require("jsonwebtoken");
const { getGoogleConfig, checkGoogleIdentity, ROLES } = require("../config/oauth");
const { createGoogleTokenVerifier } = require("./googleToken.service");
const { issueTeacherToken, toSafeTeacherProfile } = require("./teacherAuth.service");
const { issueDepartmentStaffToken, toSafeDepartmentStaffProfile } = require("./staffAuth.service");
const hash = value => createHash("sha256").update(value).digest("hex");
const fail = (status, code, message) => { throw Object.assign(new Error(message), { status, code }); };
const actorType = role => role === "department_head" ? "teacher" : role;
const actorFields = { student: "student_id", teacher: "teacher_id", department_staff: "staff_id" };

function createGoogleAuthService({ models = require("../models"), config = getGoogleConfig,
  verify = createGoogleTokenVerifier(), now = Date.now } = {}) {
  const actorModels = { student: models.Student, teacher: models.Teacher, department_staff: models.DepartmentStaff };
  function enabled() {
    const cfg = config();
    if (!cfg.enabled) fail(503, "GOOGLE_DISABLED", "Google Login ยังไม่เปิดใช้งาน");
    return cfg;
  }
  async function ready() {
    const [row] = await models.sequelize.query("SELECT to_regclass('public.google_identities') IS NOT NULL AND to_regclass('public.google_auth_requests') IS NOT NULL AS ready", { type: QueryTypes.SELECT });
    if (!row?.ready) fail(503, "GOOGLE_SCHEMA_REQUIRED", "Google Login รอการติดตั้งที่ได้รับอนุมัติ");
  }
  function active(actor, role) {
    if (!actor || (role === "student" && !["pending", "searching", "placed", "in_progress", "completed"].includes(actor.status))
      || (actorType(role) === "teacher" && actor.status !== "active")
      || (role === "department_staff" && actor.is_active !== true)
      || (role === "department_head" && actor.is_department_head !== true)
      || (actorType(role) === "teacher" && actor.is_department_head && !actor.department?.trim())) {
      fail(403, "GOOGLE_ACCOUNT_UNAUTHORIZED", "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานบทบาทที่เลือก");
    }
  }
  function session(actor, role) {
    if (role === "student") {
      const fields = ["id", "student_id", "first_name", "last_name", "email", "track", "status"];
      return { success: true, role: "student", token: jwt.sign({ id: actor.id, student_id: actor.student_id,
        email: actor.email, track: actor.track, actor_type: "student", role: "student" }, process.env.JWT_SECRET,
      { algorithm: "HS256", expiresIn: process.env.JWT_EXPIRES_IN || "1d" }),
      data: Object.fromEntries(fields.map(key => [key, actor[key]])), redirect: "/src/student_coop/student_coop.html" };
    }
    if (role === "department_staff") return { role, token: issueDepartmentStaffToken(actor), staff: toSafeDepartmentStaffProfile(actor), redirect: "/src/department_staff/department_staff.html" };
    // Preserve the existing Teacher JWT's live DB role contract. Destination is
    // selected from that authorized role, never from a domain or caller redirect.
    const authorizedRole = actor.is_department_head ? "department_head" : "teacher";
    return { role: authorizedRole, token: issueTeacherToken(actor), teacher: toSafeTeacherProfile(actor),
      redirect: authorizedRole === "department_head" ? "/src/department_head/department_head.html" : "/src/teacher_coop/teacher_coop.html" };
  }
  async function consume(input, identity, transaction) {
    const [count] = await models.GoogleAuthRequest.update({ consumed_at: new Date(now()) }, {
      where: { id: input.requestId, secret_hash: hash(input.requestToken), nonce_hash: hash(identity.nonce),
        role: input.role, purpose: input.purpose, consumed_at: null, expires_at: { [Op.gt]: new Date(now()) } }, transaction,
    });
    if (count !== 1) fail(401, "GOOGLE_REQUEST_INVALID", "คำขอ Google หมดอายุหรือถูกใช้แล้ว กรุณาลองใหม่");
  }
  return {
    async configuration() {
      const cfg = config();
      if (!cfg.enabled) return { enabled: false };
      await ready();
      return { enabled: true, clientId: cfg.clientId, linkingEnabled: cfg.linkingEnabled === true,
        onboardingEnabled: false };
    },
    async challenge({ role, purpose }) {
      const cfg = enabled();
      if (!ROLES.includes(role) || !["login", "link"].includes(purpose)) fail(400, "GOOGLE_INPUT", "คำขอ Google ไม่ถูกต้อง");
      if (purpose === "link" && !cfg.linkingEnabled) fail(503, "GOOGLE_LINK_APPROVAL_REQUIRED", "การผูกบัญชีรออนุมัตินโยบาย กรุณาติดต่อผู้ดูแลระบบ");
      await ready();
      const nonce = randomBytes(32).toString("base64url"), requestToken = randomBytes(32).toString("base64url"), requestId = randomUUID();
      const expiresAt = new Date(now() + 5 * 60 * 1000);
      // Expired anonymous requests contain only hashes and may be pruned here.
      await models.GoogleAuthRequest.destroy({ where: { expires_at: { [Op.lt]: new Date(now()) } } });
      await models.GoogleAuthRequest.create({ id: requestId, secret_hash: hash(requestToken), nonce_hash: hash(nonce), role, purpose, expires_at: expiresAt });
      return { requestId, requestToken, nonce, expiresAt: expiresAt.toISOString() };
    },
    async authenticate(input) {
      const cfg = enabled();
      if (!ROLES.includes(input.role) || !["login", "link"].includes(input.purpose)
        || !/^[0-9a-f-]{36}$/i.test(input.requestId || "") || !/^[\w-]{43}$/.test(input.requestToken || "")) fail(400, "GOOGLE_INPUT", "คำขอ Google ไม่ถูกต้อง");
      if (input.purpose === "link" && !cfg.linkingEnabled) fail(503, "GOOGLE_LINK_APPROVAL_REQUIRED", "การผูกบัญชีรออนุมัตินโยบาย");
      const identity = checkGoogleIdentity(await verify(input.credential, cfg.clientId), cfg, input.role);
      await ready();
      try {
        return await models.sequelize.transaction(async transaction => {
          await consume(input, identity, transaction);
          const type = actorType(input.role), field = actorFields[type], Actor = actorModels[type];
          const mapping = await models.GoogleIdentity.findOne({ where: { subject: identity.subject, actor_type: type }, transaction });
          if (input.purpose === "login") {
            if (!mapping) fail(409, "GOOGLE_LINK_REQUIRED", "กรุณายืนยันบัญชีเดิมด้วยอีเมลและรหัสผ่านก่อนผูก Google หากยังไม่มีบัญชีให้ติดต่อผู้ดูแลระบบ");
            const actor = await Actor.findByPk(mapping[field], { transaction, lock: transaction.LOCK.UPDATE });
            active(actor, input.role);
            // Recheck the current role policy when a Teacher account is a Head.
            if (type === "teacher" && actor.is_department_head) checkGoogleIdentity(verifiedPayload(identity), cfg, "department_head");
            return session(actor, input.role);
          }
          const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
          if (!email || email.length > 254 || typeof input.password !== "string" || !input.password || input.password.length > 100
            || (type !== "student" && Buffer.byteLength(input.password, "utf8") > 72)) fail(400, "GOOGLE_INPUT", "กรุณากรอกอีเมลและรหัสผ่านบัญชีเดิม");
          const actor = await Actor.findOne({ where: { email }, transaction, lock: transaction.LOCK.UPDATE });
          if (!actor?.password_hash || !(await actor.comparePassword(input.password))) fail(401, "GOOGLE_OWNERSHIP", "ไม่สามารถยืนยันเจ้าของบัญชีได้");
          active(actor, input.role);
          if (type === "teacher" && actor.is_department_head) checkGoogleIdentity(verifiedPayload(identity), cfg, "department_head");
          const existing = await models.GoogleIdentity.findOne({ where: { [field]: actor.id }, transaction });
          if ((mapping && mapping[field] !== actor.id) || (existing && existing.subject !== identity.subject)) fail(409, "GOOGLE_IDENTITY_CONFLICT", "บัญชี Google หรือบัญชีภายในถูกผูกกับบัญชีอื่นแล้ว");
          if (!mapping) await models.GoogleIdentity.create({ subject: identity.subject, actor_type: type, [field]: actor.id }, { transaction });
          return session(actor, input.role);
        });
      } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") fail(409, "GOOGLE_IDENTITY_CONFLICT", "บัญชีถูกผูกแล้ว กรุณาลองเข้าสู่ระบบใหม่");
        throw error;
      }
    },
    async onboard() { fail(503, "GOOGLE_ONBOARDING_APPROVAL_REQUIRED", "สมัครนักศึกษาใหม่ด้วย Google รออนุมัติวิธียืนยันรหัสนักศึกษา กรุณาติดต่อผู้ดูแลระบบ"); },
  };
}
// No identity is reconstructed from untrusted input. Keep verified claims for
// role-policy checks (including hd, which may differ from the email domain).
function verifiedPayload(identity) {
  return { sub: identity.subject, email: identity.email, email_verified: true, hd: identity.hostedDomain };
}
module.exports = { createGoogleAuthService, hash };
