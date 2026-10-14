const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { createGoogleAuthController } = require("../controllers/googleAuth.controller");
function createGoogleAuthRouter(dependencies) {
  const router = express.Router(), controller = createGoogleAuthController(dependencies);
  router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: "draft-7", legacyHeaders: false,
    message: { code: "GOOGLE_RATE_LIMIT", message: "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่" } }));
  router.get("/config", controller.configuration);
  router.post("/challenge", controller.challenge);
  router.post("/login", controller.login);
  router.post("/onboard", controller.onboard);
  return router;
}
module.exports = { createGoogleAuthRouter };
