const { getGoogleConfig } = require("../config/oauth");
const { createGoogleAuthService } = require("../services/googleAuth.service");
function createGoogleAuthController({ service = createGoogleAuthService(), config = getGoogleConfig } = {}) {
  function handler(action, fields, authenticated = false) {
    return async (req, res) => {
      res.set("Cache-Control", "no-store");
      try {
        if (fields) {
          const cfg = config();
          if (!cfg.enabled) return res.status(503).json({ code: "GOOGLE_DISABLED", message: "Google Login ยังไม่เปิดใช้งาน" });
          if (!cfg.allowedOrigins.has(req.get("origin"))) return res.status(403).json({ code: "GOOGLE_ORIGIN", message: "คำขอ Google ไม่ถูกต้อง" });
          if (!req.is("application/json") || !req.body || typeof req.body !== "object" || Array.isArray(req.body)
            || Object.keys(req.body).some(key => !fields.includes(key))) return res.status(400).json({ code: "GOOGLE_INPUT", message: "คำขอ Google ไม่ถูกต้อง" });
        }
        const context = authenticated ? { user: req.user, token: req.get("authorization")?.slice(7) } : undefined;
        return res.json(await service[action](req.body, context));
      } catch (error) {
        const status = [400, 401, 403, 409, 503].includes(error.status) ? error.status : 500;
        // No raw provider/ORM errors or credentials are logged or serialized.
        return res.status(status).json({ code: status === 500 ? "GOOGLE_UNAVAILABLE" : error.code,
          message: status === 500 ? "ไม่สามารถเชื่อมต่อ Google Login ได้ กรุณาลองใหม่" : error.message });
      }
    };
  }
  return { configuration: handler("configuration"), challenge: handler("challenge", ["role", "purpose"]),
    login: handler("authenticate", ["role", "purpose", "credential", "requestId", "requestToken", "email", "password"]),
    continueLink: handler("continueLink", ["linkToken", "email", "password"]),
    confirmLink: handler("confirmLink", ["confirmationToken"]),
    studentStatus: handler("studentStatus", undefined, true),
    studentChallenge: handler("studentChallenge", [], true),
    linkStudent: handler("linkStudent", ["credential", "requestId", "requestToken", "password"], true),
    studentConfirm: handler("confirmLink", ["confirmationToken"], true),
    onboard: handler("onboard", ["role", "purpose", "credential", "requestId", "requestToken"]) };
}
module.exports = { createGoogleAuthController };
