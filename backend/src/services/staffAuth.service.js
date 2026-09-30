const jwt = require("jsonwebtoken");

const DEPARTMENT_STAFF_ACTOR_TYPE = "department_staff";
const DEPARTMENT_STAFF_ROLE = "department_staff";

function issueDepartmentStaffToken(staff, { sign = jwt.sign } = {}) {
  if (!staff?.id || !staff?.email) {
    throw new Error("An active department staff identity is required");
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }

  return sign(
    {
      id: staff.id,
      staff_id: staff.id,
      email: staff.email,
      actor_type: DEPARTMENT_STAFF_ACTOR_TYPE,
      role: DEPARTMENT_STAFF_ROLE,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
}

function toSafeDepartmentStaffProfile(staff) {
  return {
    id: staff.id,
    first_name: staff.first_name,
    last_name: staff.last_name,
    email: staff.email,
    is_active: staff.is_active,
  };
}

module.exports = {
  DEPARTMENT_STAFF_ACTOR_TYPE,
  DEPARTMENT_STAFF_ROLE,
  issueDepartmentStaffToken,
  toSafeDepartmentStaffProfile,
};
