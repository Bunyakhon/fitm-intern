const { Teacher } = require("../models");
const { TEACHER_PROFILE_FIELDS } = require("../services/teacherAuth.service");
const { uuid } = require("../validators/roleWorkflow.validator");
function createRequireTeacher({
  TeacherModel = Teacher,
  headOnly = false,
} = {}) {
  return async (req, res, next) => {
    const claims = req.user;
    try {
      uuid(claims?.id);
    } catch {
      return res
        .status(403)
        .json({ message: "Teacher authorization is required" });
    }
    if (
      claims.actor_type !== "teacher" ||
      claims.teacher_id !== claims.id ||
      !["teacher", "department_head"].includes(claims.role) ||
      (headOnly && claims.role !== "department_head")
    )
      return res
        .status(403)
        .json({ message: "Teacher role is not authorized" });
    try {
      const teacher = await TeacherModel.findOne({
        where: { id: claims.id, status: "active" },
        attributes: TEACHER_PROFILE_FIELDS,
      });
      if (
        !teacher ||
        (claims.role === "department_head" && !teacher.is_department_head) ||
        (headOnly && !teacher.department?.trim())
      )
        return res
          .status(403)
          .json({ message: "Teacher role is not authorized" });
      req.teacher = teacher;
      return next();
    } catch {
      return res
        .status(500)
        .json({ message: "Unable to verify teacher authorization" });
    }
  };
}
module.exports = {
  createRequireTeacher,
  requireTeacher: createRequireTeacher(),
  requireDepartmentHead: createRequireTeacher({ headOnly: true }),
};
