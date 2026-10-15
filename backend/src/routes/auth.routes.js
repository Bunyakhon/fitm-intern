const express = require("express");
const router = express.Router();
const { rateLimit } = require("express-rate-limit");

const {
  registerStudent,
  loginStudent,
  getCurrentStudent,
} = require("../controllers/auth.controller");

const {
  authenticateStudentToken: authenticateToken,
} = require("../middlewares/auth.middleware");

router.use("/google", require("./googleAuth.routes").createGoogleAuthRouter());
const studentLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false,
  message: { message: "Too many authentication attempts; please try again later" } });
router.post("/register", studentLoginLimiter, registerStudent);

router.post("/login", studentLoginLimiter, loginStudent);
router.post("/unified-login", studentLoginLimiter, require("../controllers/unifiedAuth.controller").createUnifiedLoginHandler());

router.get("/me", authenticateToken, getCurrentStudent);

module.exports = router;
