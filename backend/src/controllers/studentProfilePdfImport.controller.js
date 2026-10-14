const models = require("../models");
const { createStudentProfileAggregateService } = require("../services/studentProfileAggregate.service");
const { createStudentProfilePdfImportService } = require("../services/studentProfilePdfImport.service");
const rules = require("../services/studentProfileValidation");
const service = createStudentProfilePdfImportService(models, createStudentProfileAggregateService(models));
function respond(action) {
  return async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    try {
      const result = await action(req);
      return res.status(result.status || 200).json(result.body || result);
    } catch (error) {
      if (error.latest) return res.status(409).json({ ...error.latest, code: error.code, message: error.message });
      return res.status(error.status || 500).json({ code: error.status ? error.code || "PDF_IMPORT_REQUEST_FAILED" : "PDF_IMPORT_FAILED", message: error.status ? error.message : "ไม่สามารถยืนยันผลนำเข้าได้ กรุณาตรวจสถานะก่อนลองอีกครั้ง" });
    }
  };
}
const preview = respond(req => { rules.object(req.body || {}, []); return service.preview(req.user.id, req.file); });
const commit = respond(req => {
  rules.object(req.body || {}, ["receipt", "changes"]);
  let changes; try { changes = JSON.parse(req.body.changes); } catch { rules.fail("ข้อมูลที่ยืนยันนำเข้าไม่ถูกต้อง"); }
  return service.commit(req.user.id, req.file, { receipt: req.body.receipt, changes }, req.get("If-Match"));
});
const status = respond(req => service.status(req.user.id, req.body));
const history = respond(req => service.history(req.user.id));
const review = respond(req => service.review(req.user.id, req.body));
module.exports = { preview, commit, status, history, review };
