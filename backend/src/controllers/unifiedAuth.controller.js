const { createUnifiedAuthService } = require("../services/unifiedAuth.service");
function createUnifiedLoginHandler({ service = createUnifiedAuthService() } = {}) {
  return async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      return res.json(await service.login(req.body));
    } catch (error) {
      const status = [400, 401, 403, 409].includes(error.status) ? error.status : 500;
      return res.status(status).json({ success: false, code: status === 500 ? "LOGIN_UNAVAILABLE" : error.code,
        message: status === 500 ? "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่" : error.message });
    }
  };
}
module.exports = { createUnifiedLoginHandler };
