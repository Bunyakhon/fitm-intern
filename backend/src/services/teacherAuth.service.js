const jwt = require("jsonwebtoken");
const TEACHER_PROFILE_FIELDS = [
  "id",
  "academic_title",
  "first_name",
  "last_name",
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
function issueTeacherToken(teacher) {
  return jwt.sign(
    {
      id: teacher.id,
      teacher_id: teacher.id,
      actor_type: "teacher",
      role: teacher.is_department_head ? "department_head" : "teacher",
    },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
}
module.exports = {
  TEACHER_PROFILE_FIELDS,
  toSafeTeacherProfile,
  issueTeacherToken,
};
