const { DepartmentStaff } = require("../models");
const {
  issueDepartmentStaffToken,
  toSafeDepartmentStaffProfile,
} = require("../services/staffAuth.service");

function createStaffLoginHandler(dependencies = {}) {
  const StaffModel = dependencies.DepartmentStaff || DepartmentStaff;
  const issueToken = dependencies.issueToken || issueDepartmentStaffToken;

  return async function loginDepartmentStaff(req, res) {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).some(key => !["email", "password"].includes(key)) || email.length > 254 || Buffer.byteLength(password, "utf8") > 72) return res.status(400).json({ message: "Invalid login payload" });

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    try {
      const staff = await StaffModel.findOne({ where: { email } });
      if (!staff || !staff.is_active || !(await staff.comparePassword(password))) {
        return res.status(401).json({ message: "Invalid staff credentials" });
      }

      return res.status(200).json({
        message: "Staff login successful",
        token: issueToken(staff),
        staff: toSafeDepartmentStaffProfile(staff),
      });
    } catch (error) {
      return res.status(500).json({ message: "Unable to complete staff login" });
    }
  };
}

const loginDepartmentStaff = createStaffLoginHandler();

module.exports = { createStaffLoginHandler, loginDepartmentStaff };
