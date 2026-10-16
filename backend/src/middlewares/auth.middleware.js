const jwt = require("jsonwebtoken");
const { Student, Teacher, DepartmentStaff } = require("../models");
const { authorizeActor } = require("../services/unifiedAuth.service");
const { uuid } = require("../validators/roleWorkflow.validator");
const {
  DEPARTMENT_STAFF_ACTOR_TYPE,
  DEPARTMENT_STAFF_ROLE,
} = require("../services/staffAuth.service");

function createAuthenticateToken({
  StudentModel = Student,
  TeacherModel = Teacher,
  StaffModel = DepartmentStaff,
} = {}) {
  const actors = {
    student: { Model: StudentModel, fields: ["id", "student_id", "status"] },
    teacher: { Model: TeacherModel, fields: ["id", "status", "is_department_head", "department"] },
    department_staff: { Model: StaffModel, fields: ["id", "is_active"] },
  };
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: "ไม่พบ Token สำหรับการเข้าสู่ระบบ",
        });
      }

      const parts = authHeader.split(" ");

      if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
          success: false,
          message: "รูปแบบ Token ไม่ถูกต้อง",
        });
      }

      const token = parts[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET,
        { algorithms: ["HS256"] }
      );

      if (!decoded || typeof decoded !== "object" || !Number.isFinite(decoded.exp)) {
        throw new jwt.JsonWebTokenError("Invalid application token");
      }
      try { uuid(decoded.id); } catch {
        throw new jwt.JsonWebTokenError("Invalid application identity");
      }

      // Legacy Student sessions may omit actor_type/role. Resolve only this
      // existing claim shape, then prove its identity against the Student row.
      const legacyStudent = decoded.actor_type === undefined
        && decoded.role === undefined && typeof decoded.student_id === "string"
        && decoded.teacher_id === undefined && decoded.staff_id === undefined;
      const type = legacyStudent ? "student" : decoded.actor_type;
      if (typeof type !== "string" || !Object.hasOwn(actors, type)
        || (type === "student" && (typeof decoded.student_id !== "string" || !decoded.student_id
          || decoded.teacher_id !== undefined || decoded.staff_id !== undefined))
        || (type === "teacher" && (decoded.teacher_id !== decoded.id
          || decoded.student_id !== undefined || decoded.staff_id !== undefined))
        || (type === "department_staff" && (decoded.staff_id !== decoded.id
          || decoded.student_id !== undefined || decoded.teacher_id !== undefined))) {
        throw new jwt.JsonWebTokenError("Invalid application identity");
      }

      // No cache: deletion, disabling and role changes take effect on the next
      // protected request. Never load password hashes or infer roles from email.
      const { Model, fields } = actors[type];
      const actor = await Model.findByPk(decoded.id, { attributes: fields });
      if (!actor) {
        return res.status(401).json({ success: false, message: "Token ไม่ถูกต้อง" });
      }
      const role = authorizeActor(actor, type);
      if (!legacyStudent && decoded.role !== role) {
        return res.status(403).json({ success: false, message: "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานบทบาทที่ระบุ" });
      }
      if (type === "student" && decoded.student_id !== actor.student_id) {
        return res.status(401).json({ success: false, message: "Token ไม่ถูกต้อง" });
      }

      req.user = { ...decoded, actor_type: type, role };
      return next();
    } catch (error) {

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token หมดอายุ กรุณาเข้าสู่ระบบใหม่",
        });
      }

      if (["JsonWebTokenError", "NotBeforeError"].includes(error.name)) {
        return res.status(401).json({
          success: false,
          message: "Token ไม่ถูกต้อง",
        });
      }

      if (error.code === "ACCOUNT_UNAUTHORIZED" && error.status === 403) {
        return res.status(403).json({ success: false, message: error.message });
      }

      return res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์",
      });
    }
  };
}

const authenticateToken = createAuthenticateToken();

function createRequireDepartmentStaff({ StaffModel = DepartmentStaff } = {}) {
  return async (req, res, next) => {
    const staffId = req.user?.id;
    if (
      req.user?.actor_type !== DEPARTMENT_STAFF_ACTOR_TYPE ||
      req.user?.role !== DEPARTMENT_STAFF_ROLE ||
      req.user?.staff_id !== staffId ||
      typeof staffId !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(staffId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Department staff authorization is required",
      });
    }

    try {
      const staff = await StaffModel.findOne({
        where: { id: staffId, is_active: true },
        attributes: ["id"],
      });
      if (!staff) {
        return res.status(403).json({
          success: false,
          message: "Department staff authorization is required",
        });
      }
      req.departmentStaff = staff;
      return next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Unable to verify department staff authorization",
      });
    }
  };
}

const requireDepartmentStaff = createRequireDepartmentStaff();

function requireStudentActor(req, res, next) {
  const claims = req.user;
  if (typeof claims?.id !== "string" || typeof claims.student_id !== "string" || ![undefined, "student"].includes(claims.actor_type) || (claims.role !== undefined && claims.role !== "student")) {
    return res.status(403).json({ message: "Student authorization is required" });
  }
  return next();
}
function authenticateStudentToken(req, res, next) {
  return authenticateToken(req, res, () => requireStudentActor(req, res, next));
}

module.exports = {
  createAuthenticateToken,
  authenticateToken,
  createRequireDepartmentStaff,
  requireDepartmentStaff,
  requireStudentActor,
  authenticateStudentToken,
};
