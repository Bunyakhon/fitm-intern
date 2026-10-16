const { randomUUID, randomBytes, createHash, createHmac, timingSafeEqual } = require("node:crypto");
const { Op, QueryTypes } = require("sequelize");
const jwt = require("jsonwebtoken");
const { getGoogleConfig, checkGoogleIdentity, ROLES } = require("../config/oauth");
const { createGoogleTokenVerifier } = require("./googleToken.service");
const { requireDevelopment } = require("../db/initialize");
const { issueTeacherToken, toSafeTeacherProfile } = require("./teacherAuth.service");
const { issueDepartmentStaffToken, toSafeDepartmentStaffProfile } = require("./staffAuth.service");
const { createUnifiedAuthService, applicationSession, authorizeActor } = require("./unifiedAuth.service");
const { studentIdFromEmail } = require("./studentIdentity");
const hash = value => createHash("sha256").update(value).digest("hex");
const fail = (status, code, message) => { throw Object.assign(new Error(message), { status, code }); };
const actorType = role => role === "department_head" ? "teacher" : role;
const actorFields = { student: "student_id", teacher: "teacher_id", department_staff: "staff_id" };
// Seed only verified, explicitly separated Latin-script name claims on creation.
// Missing/non-Latin names stay null; never infer parts from claims.name.
function englishNameFromClaim(value) {
  if (typeof value !== "string") return null;
  const characters = [...value.trim()];
  if (!characters.length || characters.length > 255) return null;
  let hasBase = false, afterSpace = false;
  for (const character of characters) {
    if (/\p{Default_Ignorable_Code_Point}/u.test(character)) return null;
    if (/\p{L}/u.test(character) && /\p{Script_Extensions=Latin}/u.test(character)) {
      hasBase = true; afterSpace = false;
    } else if (/^[\p{Mn}\p{Mc}]$/u.test(character) && hasBase
      && /^[\p{Script_Extensions=Latin}\p{Script=Inherited}]$/u.test(character)) {
      // Preserve case and combining sequences exactly as supplied.
    } else if ([" ", "-", "'", "\u2018", "\u2019", "\u2010", "\u2011"].includes(character) && hasBase) {
      hasBase = false; afterSpace = character === " ";
    } else if (character !== " " || !afterSpace) return null;
  }
  return hasBase ? value.trim() : null;
}
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
  async function previewLink(actor, type, role, identity, transaction, context) {
    const expiresAt = new Date(now() + 2 * 60 * 1000), requestId = randomUUID();
    const payload = Buffer.from(JSON.stringify({ kind: "confirmation", requestId, type, role, actorId: actor.id,
      subject: identity.subject, email: identity.email, hostedDomain: identity.hostedDomain,
      ...(context ? { dashboard: true, session: hash(context.token) } : {}),
      ownership: hash(actor.password_hash), target: targetFingerprint(actor, type), expiresAt: expiresAt.getTime() })).toString("base64url");
    const confirmationToken = payload + "." + signReceipt(payload);
    await models.GoogleAuthRequest.create({ id: requestId, secret_hash: hash(confirmationToken),
      nonce_hash: hash(identity.subject), role, purpose: "link", expires_at: expiresAt }, { transaction });
    return { confirmationRequired: true, confirmationToken, expiresAt: expiresAt.toISOString(),
      target: { role: authorizeActor(actor, type), email: actor.email,
        name: `${actor.first_name || ""} ${actor.last_name || ""}`.trim(),
        ...(type === "student" ? { student_id: actor.student_id } : {}) }, googleEmail: identity.email };
  }
  function readReceipt(token, kind = "confirmation") {
    try {
      if (typeof token !== "string" || token.length > 4096 || !/^[\w-]+\.[\w-]{43}$/.test(token)) throw Error();
      const [payload, signature] = token.split(".");
      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(signReceipt(payload)))) throw Error();
      const receipt = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (receipt.kind !== kind || !Number.isFinite(receipt.expiresAt) || receipt.expiresAt <= now()
        || (kind === "confirmation" && !actorModels[receipt.type]) || ![...ROLES, "auto"].includes(receipt.role)) throw Error();
      return receipt;
    } catch { fail(401, "GOOGLE_LINK_CONFIRMATION_INVALID", "การยืนยันผูกบัญชีหมดอายุหรือไม่ถูกต้อง กรุณาเริ่มใหม่"); }
  }
  async function requireLink(identity, role, cfg, transaction) {
    if (!cfg.linkingEnabled) fail(503, "GOOGLE_LINK_APPROVAL_REQUIRED", "พบบัญชีที่ต้องยืนยันเจ้าของ แต่การผูก Google ยังไม่เปิดใช้งาน");
    const requestId = randomUUID(), expiresAt = new Date(now() + 5 * 60 * 1000);
    const payload = Buffer.from(JSON.stringify({ kind: "ownership", requestId, role,
      subject: identity.subject, email: identity.email, hostedDomain: identity.hostedDomain,
      expiresAt: expiresAt.getTime() })).toString("base64url");
    const linkToken = payload + "." + signReceipt(payload);
    await models.GoogleAuthRequest.create({ id: requestId, secret_hash: hash(linkToken),
      nonce_hash: hash(identity.subject), role, purpose: "link", expires_at: expiresAt }, { transaction });
    return { linkRequired: true, linkToken, expiresAt: expiresAt.toISOString(), googleEmail: identity.email,
      message: "กรุณายืนยันเจ้าของบัญชีเว็บไซต์เดิม แล้วตรวจสอบและยืนยันการเชื่อม Google" };
  }
  async function unmapped(identity, role, cfg, transaction, claims) {
    if (["auto", "student"].includes(role)) {
      const studentId = studentIdFromEmail(identity.email);
      // Every Google decision already holds the subject lock. Serialize different
      // subjects competing for the same student ID before testing account existence.
      if (studentId) await models.sequelize.query("SELECT pg_advisory_xact_lock(hashtextextended(:student, 0))", {
        replacements: { student: "fitm-google-student:" + studentId }, transaction,
      });
      // Legacy role=student must not register a subject already owned by another actor.
      if (role === "student" && (await models.GoogleIdentity.findAll({ where: { subject: identity.subject }, transaction })).length)
        fail(409, "GOOGLE_IDENTITY_CONFLICT", "บัญชี Google นี้เชื่อมกับบัญชีอื่นแล้ว กรุณาเข้าสู่ระบบจากหน้า Login");
      const existing = await models.Student.findOne({ where: { [Op.or]: [
        { email: identity.email }, ...(studentId ? [{ student_id: studentId }] : []),
      ] }, transaction });
      if (existing) fail(409, "GOOGLE_DASHBOARD_LINK_REQUIRED", "พบบัญชีเว็บไซต์เดิม กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่านเดิม แล้วไปที่ จัดการบัญชี → เชื่อมต่อ Google OAuth ใน Student Dashboard");
      if (studentId) {
        if (role === "auto") {
          for (const type of ["teacher", "department_staff"]) {
            if (await actorModels[type].findOne({ where: { email: identity.email }, transaction }))
              return requireLink(identity, role, cfg, transaction);
          }
        }
        checkGoogleIdentity(verifiedPayload(identity), cfg, "student");
        if (!cfg.onboardingEnabled) fail(503, "GOOGLE_ONBOARDING_DISABLED", "ยังไม่เปิดรับสมัครนักศึกษาใหม่ด้วย Google กรุณาสมัครด้วยอีเมลและรหัสผ่านก่อน");
        try { requireDevelopment(models.sequelize); }
        catch { fail(503, "GOOGLE_ONBOARDING_ENVIRONMENT", "การสมัครนักศึกษาใหม่ด้วย Google ยังไม่พร้อมใช้งานในระบบนี้"); }
        const actor = await models.Student.create({ student_id: studentId, email: identity.email,
          first_name: null, last_name: null, password_hash: null, track: "co_op", status: "pending" },
        { transaction, googleOnlyCreation: true });
        await models.StudentProfile.create({ student_id: actor.id,
          english_first_name: englishNameFromClaim(claims.given_name),
          english_last_name: englishNameFromClaim(claims.family_name) }, { transaction });
        await models.GoogleIdentity.create({ subject: identity.subject, actor_type: "student", student_id: actor.id }, { transaction });
        return { ...applicationSession(actor, "student"), message: "สมัครสมาชิกด้วย Google สำเร็จ" };
      }
      if (role === "student") fail(403, "GOOGLE_STUDENT_EMAIL", "สมัครด้วย Google ต้องใช้อีเมล s ตามด้วยรหัสนักศึกษา 13 หลัก @email.kmutnb.ac.th");
    }
    // Existing personnel linking keeps its original ownership/role policies.
    return requireLink(identity, role, cfg, transaction);
  }
  async function dashboardActor(context, transaction) {
    if (!context || context.user?.actor_type !== "student" || context.user?.role !== "student"
      || typeof context.token !== "string" || !context.token) fail(401, "GOOGLE_SESSION_REQUIRED", "กรุณาเข้าสู่ระบบบัญชีนักศึกษาก่อน");
    const actor = await models.Student.findByPk(context.user.id, {
      ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
    });
    active(actor, "student");
    if (actor.student_id !== context.user.student_id) fail(401, "GOOGLE_SESSION_CHANGED", "ข้อมูลบัญชีเปลี่ยนแปลง กรุณาเข้าสู่ระบบใหม่");
    return actor;
  }
  function dashboardBinding(receipt, context) {
    if (!context?.token || receipt.actorId !== context.user?.id || receipt.session !== hash(context.token))
      fail(403, "GOOGLE_LINK_OWNERSHIP", "คำขอเชื่อม Google ไม่ตรงกับบัญชีที่เข้าสู่ระบบ กรุณาเริ่มใหม่");
  }
  function studentLinkOnlyInDashboard(type) {
    if (type === "student") fail(403, "GOOGLE_DASHBOARD_LINK_REQUIRED", "กรุณาเชื่อม Google จาก จัดการบัญชี ใน Student Dashboard หลังเข้าสู่ระบบด้วยอีเมลและรหัสผ่านเดิม");
  }
  return {
    async studentStatus(_input, context) {
      const actor = await dashboardActor(context);
      const cfg = config();
      await ready();
      const mapping = await models.GoogleIdentity.findOne({ where: { student_id: actor.id } });
      return { linked: !!mapping, enabled: cfg.enabled === true && cfg.linkingEnabled === true,
        canLink: !mapping && !!actor.password_hash && cfg.enabled === true && cfg.linkingEnabled === true };
    },
    async studentChallenge(_input, context) {
      const cfg = enabled();
      if (!cfg.linkingEnabled) fail(503, "GOOGLE_LINK_APPROVAL_REQUIRED", "การเชื่อม Google ยังไม่เปิดใช้งาน");
      const actor = await dashboardActor(context);
      if (!actor.password_hash) fail(409, "GOOGLE_ALREADY_LINKED", "บัญชีนี้ใช้ Google อยู่แล้ว ไม่ต้องเชื่อมซ้ำ");
      await ready();
      if (await models.GoogleIdentity.findOne({ where: { student_id: actor.id } })) fail(409, "GOOGLE_ALREADY_LINKED", "บัญชีนี้เชื่อม Google แล้ว");
      const requestId = randomUUID(), nonce = randomBytes(32).toString("base64url"), expiresAt = new Date(now() + 5 * 60 * 1000);
      const payload = Buffer.from(JSON.stringify({ kind: "dashboard-challenge", requestId, actorId: actor.id,
        role: "student", session: hash(context.token), expiresAt: expiresAt.getTime() })).toString("base64url");
      const requestToken = payload + "." + signReceipt(payload);
      await models.GoogleAuthRequest.create({ id: requestId, secret_hash: hash(requestToken), nonce_hash: hash(nonce),
        role: "student", purpose: "link", expires_at: expiresAt });
      return { requestId, requestToken, nonce, expiresAt: expiresAt.toISOString() };
    },
    async linkStudent(input, context) {
      const cfg = enabled();
      if (!cfg.linkingEnabled) fail(503, "GOOGLE_LINK_APPROVAL_REQUIRED", "การเชื่อม Google ยังไม่เปิดใช้งาน");
      const receipt = readReceipt(input.requestToken, "dashboard-challenge");
      dashboardBinding(receipt, context);
      if (input.requestId !== receipt.requestId || typeof input.password !== "string" || !input.password || input.password.length > 100)
        fail(400, "GOOGLE_INPUT", "กรุณายืนยันรหัสผ่านบัญชีเว็บไซต์ปัจจุบัน");
      const identity = checkGoogleIdentity(await verify(input.credential, cfg.clientId), cfg, "student");
      await ready();
      return models.sequelize.transaction(async transaction => {
        await consume({ ...input, role: "student", purpose: "link" }, identity, transaction);
        await models.sequelize.query("SELECT pg_advisory_xact_lock(hashtextextended(:subject, 0))", {
          replacements: { subject: identity.subject }, transaction,
        });
        const actor = await dashboardActor(context, transaction);
        if (!actor.password_hash || !(await actor.comparePassword(input.password)))
          fail(401, "GOOGLE_OWNERSHIP", "รหัสผ่านบัญชีปัจจุบันไม่ถูกต้อง กรุณาลองใหม่");
        const mappings = await models.GoogleIdentity.findAll({ where: { subject: identity.subject }, transaction });
        if (mappings.length > 1) fail(409, "AUTH_CONTEXT_AMBIGUOUS", "บัญชี Google เชื่อมกับหลายบัญชี กรุณาติดต่อผู้ดูแลระบบ");
        const existing = await models.GoogleIdentity.findOne({ where: { student_id: actor.id }, transaction });
        if ((mappings.length && (mappings[0].actor_type !== "student" || mappings[0].student_id !== actor.id))
          || (existing && existing.subject !== identity.subject)) fail(409, "GOOGLE_IDENTITY_CONFLICT", "บัญชี Google หรือบัญชีปัจจุบันเชื่อมกับบัญชีอื่นแล้ว");
        if (existing) fail(409, "GOOGLE_ALREADY_LINKED", "บัญชีนี้เชื่อม Google แล้ว");
        return previewLink(actor, "student", "student", identity, transaction, context);
      });
    },
    async configuration() {
      const cfg = config();
      if (!cfg.enabled) return { enabled: false };
      await ready();
      return { enabled: true, clientId: cfg.clientId, linkingEnabled: cfg.linkingEnabled === true,
        onboardingEnabled: cfg.onboardingEnabled === true,
        ...(!cfg.onboardingEnabled ? { onboardingBlockedCode: "GOOGLE_ONBOARDING_DISABLED" } : {}) };
    },
    async challenge({ role, purpose }) {
      const cfg = enabled();
      if (![...ROLES, "auto"].includes(role) || !["login", "link"].includes(purpose)) fail(400, "GOOGLE_INPUT", "คำขอ Google ไม่ถูกต้อง");
      if (role === "student" && purpose === "link") studentLinkOnlyInDashboard("student");
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
      if (input.purpose === "link" && input.role === "student") studentLinkOnlyInDashboard("student");
      const claims = await verify(input.credential, cfg.clientId);
      const identity = checkGoogleIdentity(claims, cfg, input.role === "auto" ? undefined : input.role);
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
              if (!mappings.length) return unmapped(identity, input.role, cfg, transaction, claims);
              type = mappings[0].actor_type;
              if (!actorModels[type]) fail(403, "GOOGLE_ACCOUNT_UNAUTHORIZED", "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน");
              actor = await actorModels[type].findByPk(mappings[0][actorFields[type]], { transaction, lock: transaction.LOCK.UPDATE });
            } else {
              ({ actor, type } = await unified.resolveCredentials({ email: input.email, password: input.password }, { transaction, lock: transaction.LOCK.UPDATE }));
              studentLinkOnlyInDashboard(type);
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
            if (!mapping) return unmapped(identity, input.role, cfg, transaction, claims);
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
    async continueLink({ linkToken, email, password }) {
      const cfg = enabled();
      if (!cfg.linkingEnabled) fail(503, "GOOGLE_LINK_APPROVAL_REQUIRED", "การผูกบัญชีรออนุมัตินโยบาย");
      const receipt = readReceipt(linkToken, "ownership");
      const identity = { subject: receipt.subject, email: receipt.email, hostedDomain: receipt.hostedDomain };
      checkGoogleIdentity(verifiedPayload(identity), cfg, receipt.role === "auto" ? undefined : receipt.role);
      await ready();
      return models.sequelize.transaction(async transaction => {
        await consume({ requestId: receipt.requestId, requestToken: linkToken, role: receipt.role, purpose: "link" },
          { nonce: receipt.subject }, transaction);
        await models.sequelize.query("SELECT pg_advisory_xact_lock(hashtextextended(:subject, 0))", {
          replacements: { subject: receipt.subject }, transaction,
        });
        let actor, type;
        if (receipt.role === "auto") {
          ({ actor, type } = await unified.resolveCredentials({ email, password }, { transaction, lock: transaction.LOCK.UPDATE }));
        } else {
          type = actorType(receipt.role);
          if (typeof email !== "string" || !email.trim() || email.length > 254 || typeof password !== "string" || !password
            || password.length > 100 || (type !== "student" && Buffer.byteLength(password, "utf8") > 72))
            fail(400, "GOOGLE_INPUT", "กรุณากรอกอีเมลและรหัสผ่านบัญชีเว็บไซต์เดิม");
          actor = await actorModels[type].findOne({ where: { email: email.trim().toLowerCase() }, transaction, lock: transaction.LOCK.UPDATE });
          if (!actor?.password_hash || !(await actor.comparePassword(password))) fail(401, "GOOGLE_OWNERSHIP", "ไม่สามารถยืนยันเจ้าของบัญชีได้");
        }
        const role = receipt.role === "auto" ? authorizeActor(actor, type) : receipt.role;
        studentLinkOnlyInDashboard(type);
        active(actor, role);
        checkGoogleIdentity(verifiedPayload(identity), cfg, authorizeActor(actor, type));
        const mappings = await models.GoogleIdentity.findAll({ where: { subject: receipt.subject }, transaction });
        if (receipt.role === "auto" && mappings.length > 1) fail(409, "AUTH_CONTEXT_AMBIGUOUS", "บัญชี Google เชื่อมกับหลายบัญชี กรุณาติดต่อผู้ดูแลระบบ");
        const mapping = receipt.role === "auto" ? mappings[0] : mappings.find(row => row.actor_type === type);
        const existing = await models.GoogleIdentity.findOne({ where: { [actorFields[type]]: actor.id }, transaction });
        if ((mapping && (mapping.actor_type !== type || mapping[actorFields[type]] !== actor.id))
          || (existing && existing.subject !== receipt.subject)) fail(409, "GOOGLE_IDENTITY_CONFLICT", "บัญชี Google หรือบัญชีภายในถูกผูกกับบัญชีอื่นแล้ว");
        return previewLink(actor, type, receipt.role, identity, transaction);
      });
    },
    async confirmLink({ confirmationToken }, context) {
      const cfg = enabled();
      if (!cfg.linkingEnabled) fail(503, "GOOGLE_LINK_APPROVAL_REQUIRED", "การผูกบัญชีรออนุมัตินโยบาย");
      const receipt = readReceipt(confirmationToken);
      if (context && !receipt.dashboard) fail(403, "GOOGLE_LINK_OWNERSHIP", "คำขอนี้ไม่ใช่การเชื่อม Google ของบัญชีปัจจุบัน");
      if (receipt.dashboard) {
        dashboardBinding(receipt, context);
        await dashboardActor(context);
      } else studentLinkOnlyInDashboard(receipt.type);
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
          if (!actor.password_hash || hash(actor.password_hash) !== receipt.ownership || targetFingerprint(actor, receipt.type) !== receipt.target)
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
          return receipt.dashboard ? { linked: true, message: "เชื่อมต่อ Google สำเร็จ" }
            : receipt.role === "auto" ? applicationSession(actor, receipt.type) : session(actor, receipt.role);
        });
      } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") fail(409, "GOOGLE_IDENTITY_CONFLICT", "บัญชีถูกผูกแล้ว กรุณาลองเข้าสู่ระบบใหม่");
        throw error;
      }
    },
    async onboard(input) {
      if (input.role !== "student" || input.purpose !== "login") fail(400, "GOOGLE_INPUT", "การสมัคร Google รองรับเฉพาะนักศึกษา");
      return this.authenticate(input);
    },
  };
}
// No identity is reconstructed from untrusted input. Keep verified claims for
// role-policy checks (including hd, which may differ from the email domain).
function verifiedPayload(identity) {
  return { sub: identity.subject, email: identity.email, email_verified: true, hd: identity.hostedDomain };
}
module.exports = { createGoogleAuthService, hash, studentIdFromEmail };
