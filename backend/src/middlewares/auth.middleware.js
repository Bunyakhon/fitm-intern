const jwt = require("jsonwebtoken");

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

module.exports = {
  authenticateToken,
};