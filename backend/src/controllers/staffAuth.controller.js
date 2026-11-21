const models = require("../models");
const { assertAccountAccess } = require("../services/adminAccountAccess.service");
const { uuid } = require("../validators/roleWorkflow.validator");
const {
  issueDepartmentStaffToken,
  toSafeDepartmentStaffProfile,
} = require("../services/staffAuth.service");

function createStaffLoginHandler(dependencies = {}) {
  const registry = dependencies.models || models;
  const StaffModel = dependencies.DepartmentStaff || registry.DepartmentStaff;
  const issueToken = dependencies.issueToken || issueDepartmentStaffToken;
  const checkAccountAccess = dependencies.checkAccountAccess
    || ((type, id) => assertAccountAccess(registry, type, id));

  return async function loginDepartmentStaff(req, res) {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).some(key => !["email", "password"].includes(key)) || email.length > 254 || Buffer.byteLength(password, "utf8") > 72) return res.status(400).json({ message: "Invalid login payload" });

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    try {
      const staff = await StaffModel.findOne({ where: { email } });
      if (!staff || staff.is_active !== true || !(await staff.comparePassword(password))) {
        return res.status(401).json({ message: "Invalid staff credentials" });
      }

      uuid(staff.id, "staff id");
      // This is a new login: revoked_before applies to existing sessions, not
      // the new JWT. Lookup errors propagate and never reach the token issuer.
      await checkAccountAccess("department_staff", staff.id);

      return res.status(200).json({
        message: "Staff login successful",
        token: issueToken(staff),
        staff: toSafeDepartmentStaffProfile(staff),
      });
    } catch (error) {
      if (error.status === 403 && error.code === "ACCOUNT_UNAUTHORIZED") {
        return res.status(403).json({ message: "บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ" });
      }
      return res.status(500).json({ message: "Unable to complete staff login" });
    }
  };
}

const loginDepartmentStaff = createStaffLoginHandler();

module.exports = { createStaffLoginHandler, loginDepartmentStaff };
