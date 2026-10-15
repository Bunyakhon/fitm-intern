const { randomUUID, randomBytes, createHash, createHmac, timingSafeEqual } = require("node:crypto");
const { Op, QueryTypes } = require("sequelize");
const jwt = require("jsonwebtoken");
const { getGoogleConfig, checkGoogleIdentity, ROLES } = require("../config/oauth");
const { createGoogleTokenVerifier } = require("./googleToken.service");
const { issueTeacherToken, toSafeTeacherProfile } = require("./teacherAuth.service");
const { issueDepartmentStaffToken, toSafeDepartmentStaffProfile } = require("./staffAuth.service");
const { createUnifiedAuthService, applicationSession, authorizeActor } = require("./unifiedAuth.service");
const hash = value => createHash("sha256").update(value).digest("hex");
const fail = (status, code, message) => { throw Object.assign(new Error(message), { status, code }); };
const actorType = role => role === "department_head" ? "teacher" : role;
const actorFields = { student: "student_id", teacher: "teacher_id", department_staff: "staff_id" };

function createGoogleAuthService({ models = require("../models"), config = getGoogleConfig,
  verify = createGoogleTokenVerifier(), now = Date.now } = {}) {
  const actorModels = { student: models.Student, teacher: models.Teacher, department_staff: models.DepartmentStaff };
  const unified = createUnifiedAuthService({ models });
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
  // A two-part, short-lived receipt is deliberately not an Application JWT.
  // No password or provider credential is retained in it or in the database.
  const signReceipt = payload => createHmac("sha256", process.env.JWT_SECRET)
    .update("fitm-google-link-confirmation-v1:" + payload).digest("base64url");
  const targetFingerprint = (actor, type) => hash(JSON.stringify([actor.id, actor.email,
    actor.first_name, actor.last_name, type === "student" ? actor.student_id : null, authorizeActor(actor, type)]));
  async function previewLink(actor, type, role, identity, transaction) {
    const expiresAt = new Date(now() + 2 * 60 * 1000), requestId = randomUUID();
    const payload = Buffer.from(JSON.stringify({ requestId, type, role, actorId: actor.id,
      subject: identity.subject, email: identity.email, hostedDomain: identity.hostedDomain,
      ownership: hash(actor.password_hash), target: targetFingerprint(actor, type), expiresAt: expiresAt.getTime() })).toString("base64url");
    const confirmationToken = payload + "." + signReceipt(payload);
    await models.GoogleAuthRequest.create({ id: requestId, secret_hash: hash(confirmationToken),
      nonce_hash: hash(identity.subject), role, purpose: "link", expires_at: expiresAt }, { transaction });
    return { confirmationRequired: true, confirmationToken, expiresAt: expiresAt.toISOString(),
      target: { role: authorizeActor(actor, type), email: actor.email,
        name: `${actor.first_name || ""} ${actor.last_name || ""}`.trim(),
        ...(type === "student" ? { student_id: actor.student_id } : {}) }, googleEmail: identity.email };
  }
  function readReceipt(token) {
    try {
      if (typeof token !== "string" || token.length > 4096 || !/^[\w-]+\.[\w-]{43}$/.test(token)) throw Error();
      const [payload, signature] = token.split(".");
      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(signReceipt(payload)))) throw Error();
      const receipt = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (!Number.isFinite(receipt.expiresAt) || receipt.expiresAt <= now()
        || !actorModels[receipt.type] || ![...ROLES, "auto"].includes(receipt.role)) throw Error();
      return receipt;
    } catch { fail(401, "GOOGLE_LINK_CONFIRMATION_INVALID", "การยืนยันผูกบัญชีหมดอายุหรือไม่ถูกต้อง กรุณาเริ่มใหม่"); }
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
      if (![...ROLES, "auto"].includes(role) || !["login", "link"].includes(purpose)) fail(400, "GOOGLE_INPUT", "คำขอ Google ไม่ถูกต้อง");
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
      if (![...ROLES, "auto"].includes(input.role) || !["login", "link"].includes(input.purpose)
        || !/^[0-9a-f-]{36}$/i.test(input.requestId || "") || !/^[\w-]{43}$/.test(input.requestToken || "")) fail(400, "GOOGLE_INPUT", "คำขอ Google ไม่ถูกต้อง");
      if (input.purpose === "link" && !cfg.linkingEnabled) fail(503, "GOOGLE_LINK_APPROVAL_REQUIRED", "การผูกบัญชีรออนุมัตินโยบาย");
      const identity = checkGoogleIdentity(await verify(input.credential, cfg.clientId), cfg, input.role === "auto" ? undefined : input.role);
      await ready();
      try {
        return await models.sequelize.transaction(async transaction => {
          await consume(input, identity, transaction);
          // Serialize subject decisions across automatic and legacy login/link
          // requests; the existing per-actor uniqueness constraints still apply.
          await models.sequelize.query("SELECT pg_advisory_xact_lock(hashtextextended(:subject, 0))", {
            replacements: { subject: identity.subject }, transaction,
          });
          if (input.role === "auto") {
            // Subject mappings remain separate actors. There is no configured
            // default context, so never choose or merge multiple mappings.
            const mappings = await models.GoogleIdentity.findAll({ where: { subject: identity.subject }, transaction });
            if (mappings.length > 1) fail(409, "AUTH_CONTEXT_AMBIGUOUS", "บัญชี Google เชื่อมกับหลายบัญชี กรุณาติดต่อผู้ดูแลระบบเพื่อยืนยันบัญชีที่ต้องการใช้งาน");
            let actor, type;
            if (input.purpose === "login") {
              if (!mappings.length) fail(409, "GOOGLE_LINK_REQUIRED", "กรุณายืนยันบัญชีเดิมด้วยอีเมลและรหัสผ่านก่อนผูก Google หากยังไม่มีบัญชีให้ติดต่อผู้ดูแลระบบ");
              type = mappings[0].actor_type;
              if (!actorModels[type]) fail(403, "GOOGLE_ACCOUNT_UNAUTHORIZED", "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน");
              actor = await actorModels[type].findByPk(mappings[0][actorFields[type]], { transaction, lock: transaction.LOCK.UPDATE });
            } else {
              ({ actor, type } = await unified.resolveCredentials({ email: input.email, password: input.password }, { transaction, lock: transaction.LOCK.UPDATE }));
              const existing = await models.GoogleIdentity.findOne({ where: { [actorFields[type]]: actor.id }, transaction });
              if ((mappings.length && (mappings[0].actor_type !== type || mappings[0][actorFields[type]] !== actor.id))
                || (existing && existing.subject !== identity.subject)) fail(409, "GOOGLE_IDENTITY_CONFLICT", "บัญชี Google หรือบัญชีภายในถูกผูกกับบัญชีอื่นแล้ว");
            }
            const role = authorizeActor(actor, type);
            active(actor, role);
            checkGoogleIdentity(verifiedPayload(identity), cfg, role);
            if (input.purpose === "link") return previewLink(actor, type, input.role, identity, transaction);
            return applicationSession(actor, type);
          }
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
          return previewLink(actor, type, input.role, identity, transaction);
        });
      } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") fail(409, "GOOGLE_IDENTITY_CONFLICT", "บัญชีถูกผูกแล้ว กรุณาลองเข้าสู่ระบบใหม่");
        throw error;
      }
    },
    async confirmLink({ confirmationToken }) {
      const cfg = enabled();
      if (!cfg.linkingEnabled) fail(503, "GOOGLE_LINK_APPROVAL_REQUIRED", "การผูกบัญชีรออนุมัตินโยบาย");
      const receipt = readReceipt(confirmationToken);
      const identity = { subject: receipt.subject, email: receipt.email, hostedDomain: receipt.hostedDomain };
      checkGoogleIdentity(verifiedPayload(identity), cfg, receipt.role === "auto" ? undefined : receipt.role);
      await ready();
      try {
        return await models.sequelize.transaction(async transaction => {
          await consume({ requestId: receipt.requestId, requestToken: confirmationToken, role: receipt.role, purpose: "link" },
            { nonce: receipt.subject }, transaction);
          await models.sequelize.query("SELECT pg_advisory_xact_lock(hashtextextended(:subject, 0))", {
            replacements: { subject: receipt.subject }, transaction,
          });
          const actor = await actorModels[receipt.type].findByPk(receipt.actorId, { transaction, lock: transaction.LOCK.UPDATE });
          active(actor, receipt.role === "auto" ? authorizeActor(actor, receipt.type) : receipt.role);
          if (hash(actor.password_hash) !== receipt.ownership || targetFingerprint(actor, receipt.type) !== receipt.target)
            fail(401, "GOOGLE_OWNERSHIP", "บัญชีเปลี่ยนแปลงแล้ว กรุณายืนยันเจ้าของบัญชีใหม่");
          checkGoogleIdentity(verifiedPayload(identity), cfg, authorizeActor(actor, receipt.type));
          const field = actorFields[receipt.type];
          const mappings = await models.GoogleIdentity.findAll({ where: { subject: receipt.subject }, transaction });
          if (receipt.role === "auto" && mappings.length > 1) fail(409, "AUTH_CONTEXT_AMBIGUOUS", "บัญชี Google เชื่อมกับหลายบัญชี กรุณาติดต่อผู้ดูแลระบบ");
          const mapping = receipt.role === "auto" ? mappings[0] : mappings.find(row => row.actor_type === receipt.type);
          const existing = await models.GoogleIdentity.findOne({ where: { [field]: actor.id }, transaction });
          if ((mapping && (mapping.actor_type !== receipt.type || mapping[field] !== actor.id))
            || (existing && existing.subject !== receipt.subject)) fail(409, "GOOGLE_IDENTITY_CONFLICT", "บัญชี Google หรือบัญชีภายในถูกผูกกับบัญชีอื่นแล้ว");
          if (!mapping) await models.GoogleIdentity.create({ subject: receipt.subject, actor_type: receipt.type, [field]: actor.id }, { transaction });
          return receipt.role === "auto" ? applicationSession(actor, receipt.type) : session(actor, receipt.role);
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
