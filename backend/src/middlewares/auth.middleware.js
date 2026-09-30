const jwt = require("jsonwebtoken");
const { DepartmentStaff } = require("../models");
const {
  DEPARTMENT_STAFF_ACTOR_TYPE,
  DEPARTMENT_STAFF_ROLE,
} = require("../services/staffAuth.service");

const authenticateToken = (req, res, next) => {
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
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token หมดอายุ กรุณาเข้าสู่ระบบใหม่",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token ไม่ถูกต้อง",
      });
    }

    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์",
    });
  }
};

function createRequireDepartmentStaff({ StaffModel = DepartmentStaff } = {}) {
  return async (req, res, next) => {
    const staffId = req.user?.id;
    if (
      req.user?.actor_type !== DEPARTMENT_STAFF_ACTOR_TYPE ||
      req.user?.role !== DEPARTMENT_STAFF_ROLE ||
      req.user?.staff_id !== staffId ||
      typeof staffId !== "string"
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
      console.error("DEPARTMENT STAFF AUTHORIZATION ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to verify department staff authorization",
      });
    }
  };
}

const requireDepartmentStaff = createRequireDepartmentStaff();

module.exports = {
  authenticateToken,
  createRequireDepartmentStaff,
  requireDepartmentStaff,
};
