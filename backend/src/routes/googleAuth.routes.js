const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { createGoogleAuthController } = require("../controllers/googleAuth.controller");
const { authenticateStudentToken, authenticateToken } = require("../middlewares/auth.middleware");
const { requireTeacher } = require('../middlewares/teacherAuth.middleware');
function createGoogleAuthRouter(dependencies) {
  const router = express.Router(), controller = createGoogleAuthController(dependencies);
  router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: "draft-7", legacyHeaders: false,
    message: { code: "GOOGLE_RATE_LIMIT", message: "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่" } }));
  router.get("/config", controller.configuration);
  router.post("/challenge", controller.challenge);
  router.post("/login", controller.login);
  router.post("/link/verify", controller.continueLink);
  router.post("/link/confirm", controller.confirmLink);
  router.post("/onboard", controller.onboard);
  router.get("/student/status", authenticateStudentToken, controller.studentStatus);
  router.post("/student/challenge", authenticateStudentToken, controller.studentChallenge);
  router.post("/student/link", authenticateStudentToken, controller.linkStudent);
  router.post("/student/link/confirm", authenticateStudentToken, controller.studentConfirm);
  router.get('/teacher/status', authenticateToken, requireTeacher, controller.teacherStatus);
  router.post('/teacher/challenge', authenticateToken, requireTeacher, controller.teacherChallenge);
  router.post('/teacher/link', authenticateToken, requireTeacher, controller.linkTeacher);
  router.post('/teacher/link/confirm', authenticateToken, requireTeacher, controller.teacherConfirm);
  return router;
}
module.exports = { createGoogleAuthRouter };
