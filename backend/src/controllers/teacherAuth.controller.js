const models = require("../models");
const { assertAccountAccess } = require("../services/adminAccountAccess.service");
const {
  issueTeacherToken,
  toSafeTeacherProfile,
} = require("../services/teacherAuth.service");
const { object } = require("../validators/roleWorkflow.validator");
const { mustChangePassword, FIRST_PASSWORD_PAGE } = require('../services/teacherPassword.policy');
function createTeacherLoginHandler({
  models: registry = models,
  TeacherModel = registry.Teacher,
  headOnly = false,
  checkAccountAccess = (type, id, options) => assertAccountAccess(registry, type, id, options),
} = {}) {
  return async (req, res) => {
    try {
      object(req.body, ["email", "password"]);
      const email =
        typeof req.body.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";
      const password = req.body.password;
      if (
        !email ||
        email.length > 254 ||
        typeof password !== "string" ||
        !password ||
        Buffer.byteLength(password, "utf8") > 72
      )
        return res
          .status(400)
          .json({ message: "Valid email and password are required" });
      const teacher = await TeacherModel.findOne({ where: { email } });
      if (
        !teacher ||
        teacher.status !== "active" ||
        !(await teacher.comparePassword(password))
      )
        return res.status(401).json({ message: "Invalid teacher credentials" });
      if (
        headOnly &&
        (!teacher.is_department_head || !teacher.department?.trim())
      )
        return res
          .status(403)
          .json({ message: "Department head authorization is required" });
      // Teacher and Head are the same actor store. A fresh login checks
      // central enablement without applying revocation of an older session.
      const result = await registry.sequelize.transaction(async transaction => {
        await registry.sequelize.query('SELECT pg_advisory_xact_lock(63828018)', { transaction });
        const current = await TeacherModel.findByPk(teacher.id, { transaction, lock: transaction.LOCK.SHARE });
        if (!current || current.status !== 'active' || !await current.comparePassword(password))
          throw Object.assign(Error('ข้อมูลเข้าสู่ระบบเปลี่ยนแล้ว'), { status: 401 });
        if (headOnly && (!current.is_department_head || !current.department?.trim()))
          throw Object.assign(Error('Department head authorization is required'), { status: 403 });
        await checkAccountAccess('teacher', current.id, { transaction });
        const forced = await mustChangePassword(current);
        return { token: issueTeacherToken(current, { passwordChangeRequired: forced }), teacher: toSafeTeacherProfile(current),
          ...(forced ? { must_change_password: true, redirect: FIRST_PASSWORD_PAGE } : {}) };
      });
      return res.json(result);
    } catch (error) {
      if (error.status === 403 && error.code === "ACCOUNT_UNAUTHORIZED") {
        return res.status(403).json({ message: "บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ" });
      }
      return res
        .status([400, 401, 403].includes(error.status) ? error.status : 500)
        .json({
          message:
            [400, 401, 403].includes(error.status)
              ? error.message
              : "Unable to complete teacher login",
        });
    }
  };
}
module.exports = { createTeacherLoginHandler };
