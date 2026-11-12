function createCoopProjectAdvisorController(service) {
  const action = fn => async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    try { return res.json(await fn(req)); }
    catch (error) {
      const pg = error.original?.code || error.parent?.code;
      const missingSchema = ["42P01", "42703"].includes(pg);
      const status = missingSchema ? 503 : [400, 401, 403, 404, 409, 503].includes(error.status) ? error.status
        : error.name === "SequelizeUniqueConstraintError" || ["40001", "40P01", "55P03"].includes(pg) ? 409 : 500;
      const codes = { 400: "ADVISOR_INVALID_INPUT", 401: "ADVISOR_SESSION_REQUIRED", 403: "ADVISOR_FORBIDDEN", 404: "ADVISOR_NOT_FOUND", 409: "ADVISOR_CONFLICT", 500: "ADVISOR_ERROR", 503: "ADVISOR_UNAVAILABLE" };
      const messages = { 400: "ข้อมูลคำขออาจารย์ไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่", 401: "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่", 403: "ไม่สามารถดำเนินการคำขออาจารย์นี้ได้", 404: "ไม่พบข้อมูลคำขออาจารย์", 409: "สถานะคำขอเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด", 500: "ไม่สามารถดำเนินการคำขออาจารย์ได้ กรุณาลองใหม่", 503: "บริการคำขออาจารย์ยังไม่พร้อม กรุณาลองใหม่ภายหลัง" };
      const safeErrors = { ADVISOR_TARGET_UNAVAILABLE: "อาจารย์ที่เลือกไม่พร้อมรับคำขอ กรุณาโหลดรายชื่อใหม่", ADVISOR_CONFIRMED: "ไม่สามารถเปลี่ยนอาจารย์ที่ยืนยันแล้วได้", ADVISOR_COMMIT_UNCERTAIN: "ยังยืนยันผลส่งคำขอไม่ได้ กรุณาโหลดสถานะล่าสุดก่อนลองใหม่" };
      const code = missingSchema ? "ADVISOR_SCHEMA_NOT_READY" : Object.hasOwn(safeErrors, error.code) ? error.code : codes[status];
      return res.status(status).json({ code, message: missingSchema ? "บริการคำขออาจารย์ยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ" : safeErrors[code] || messages[status] });
    }
  };
  return {
    read: action(req => service.read(req.user.id)),
    select: action(req => service.select(req.user.id, req.body)),
    directory: action(req => service.directory(req.user.id)),
    list: action(req => service.list(req.user.id, req.query)),
    detail: action(req => service.detail(req.user.id, req.params.id)),
    accept: action(req => service.decide(req.user.id, req.params.id, "accept", req.body)),
    reject: action(req => service.decide(req.user.id, req.params.id, "reject", req.body)),
  };
}
module.exports = { createCoopProjectAdvisorController };
