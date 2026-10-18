const jwt = require("jsonwebtoken");
const TEACHER_PROFILE_FIELDS = [
  "id",
  "academic_title",
  "first_name",
  "last_name",
  "first_name_en",
  "last_name_en",
  "email",
  "department",
  "major",
  "position",
  "status",
  "is_department_head",
];
function toSafeTeacherProfile(teacher) {
  return Object.fromEntries(
    TEACHER_PROFILE_FIELDS.map((key) => [key, teacher[key]]),
  );
}
function issueTeacherToken(teacher, { adminGrant } = {}) {
  return jwt.sign(
    {
      id: teacher.id,
      teacher_id: teacher.id,
      actor_type: "teacher",
      role: teacher.is_department_head ? "department_head" : "teacher",
      ...(adminGrant ? { admin_grant_id: adminGrant.id, admin_session_version: adminGrant.session_version } : {}),
    },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: adminGrant ? '15m' : process.env.JWT_EXPIRES_IN || "1d" },
  );
}
module.exports = {
  TEACHER_PROFILE_FIELDS,
  toSafeTeacherProfile,
  issueTeacherToken,
};
