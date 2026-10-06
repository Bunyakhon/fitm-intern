const { Teacher } = require("../models");
const {
  issueTeacherToken,
  toSafeTeacherProfile,
} = require("../services/teacherAuth.service");
const { object } = require("../validators/roleWorkflow.validator");
function createTeacherLoginHandler({
  TeacherModel = Teacher,
  headOnly = false,
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
      return res.json({
        token: issueTeacherToken(teacher),
        teacher: toSafeTeacherProfile(teacher),
      });
    } catch (error) {
      return res
        .status(error.status === 400 ? 400 : 500)
        .json({
          message:
            error.status === 400
              ? error.message
              : "Unable to complete teacher login",
        });
    }
  };
}
module.exports = { createTeacherLoginHandler };
