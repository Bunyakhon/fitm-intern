const models = require("../models");
const { createStudentProfileAggregateService } = require("../services/studentProfileAggregate.service");
const { createStudentProfileFilesService } = require("../services/studentProfileFiles.service");
const rules = require("../services/studentProfileValidation");
const aggregate = createStudentProfileAggregateService(models);
const files = createStudentProfileFilesService(models, aggregate);
function errorResponse(res, error) {
  // Database diagnostics may contain personal values. Never echo/log raw ORM errors.
  if (error.latest) return res.status(409).json({ ...error.latest, code: error.code, message: error.message });
  if (error.status) return res.status(error.status).json({ code: error.code || "PROFILE_REQUEST_FAILED", message: error.message });
  if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ code: "PROFILE_RECORD_CONFLICT", message: "มีรายการประเภทนี้แล้ว กรุณาตรวจสอบข้อมูลล่าสุด" });
  if (["SequelizeValidationError", "SequelizeForeignKeyConstraintError"].includes(error.name) || error.original?.code === "23514") return res.status(400).json({ code: "PROFILE_VALIDATION_ERROR", message: "ข้อมูลไม่ตรงตามข้อกำหนด" });
  return res.status(500).json({ code: "PROFILE_SAVE_FAILED", message: "ไม่สามารถอ่านหรือบันทึกประวัติได้" });
}
function handler(action) {
  return async (req, res) => {
    try {
      const result = await action(req);
      res.set("Cache-Control", "private, no-store");
      return res.status(result.status || 200).json(result.body ?? result);
    } catch (error) { return errorResponse(res, error); }
  };
}
const getProfile = handler(async req => ({ body: await aggregate.read(req.user.id) }));
const saveProfile = handler(req => aggregate.saveProfile(req.user.id, req.body, req.get("If-Match")));
const saveStudent = handler(req => aggregate.saveStudent(req.user.id, req.body, req.get("If-Match")));
const saveAggregate = handler(req => aggregate.saveAggregate(req.user.id, req.body, req.get("If-Match")));
function children(kind, action) {
  return handler(async req => {
    if (action === "read") {
      const snapshot = await aggregate.read(req.user.id);
      const record = req.params.id ? snapshot[kind].find(row => row.id === req.params.id) : undefined;
      if (req.params.id && !record) rules.fail("ไม่พบรายการของนักศึกษา", 404);
      return { body: { records: snapshot[kind], ...(record ? { record } : {}), profile_revision: snapshot.profile_revision } };
    }
    return aggregate.saveChild(req.user.id, kind, action, req.params.id, req.body ?? {}, req.get("If-Match"));
  });
}
function requireRevision(req, res, next) {
  try { rules.revision(req.get("If-Match")); next(); }
  catch (error) { errorResponse(res, error); }
}
const uploadImage = handler(req => files.uploadImage(req.user.id, req.file, req.body, req.get("If-Match")));
const deleteImage = handler(req => {
  rules.object(req.body ?? {}, []);
  return aggregate.mutate(req.user.id, req.get("If-Match"), async ({ student, transaction }) => {
    const changed = student.profile_image != null;
    if (changed) await student.update({ profile_image: null }, { transaction, fields: ["profile_image"] });
    return { changed, response: { profile_image: null } };
  });
});
const uploadDocument = handler(req => files.upload(req.user.id, req.params.fileType, req.file, req.body, req.get("If-Match")));
const patchDocument = handler(req => files.changeDocument(req.user.id, req.params.id, req.body, req.get("If-Match")));
const deleteDocument = handler(req => files.changeDocument(req.user.id, req.params.id, req.body ?? {}, req.get("If-Match"), true));
const listDocuments = handler(async req => { const snapshot = await aggregate.read(req.user.id); return { body: { documents: snapshot.documents, profile_revision: snapshot.profile_revision } }; });
async function getImage(req, res) {
  try { res.set("Cache-Control", "private, no-store"); res.set("X-Content-Type-Options", "nosniff"); return res.sendFile(await files.image(req.user.id)); }
  catch (error) { return errorResponse(res, error.code === "ENOENT" ? { status: 404, message: "ไม่พบรูปโปรไฟล์" } : error); }
}
async function downloadDocument(req, res) {
  try {
    const file = await files.preview(req.user.id, req.params.id);
    res.set("Cache-Control", "private, no-store"); res.set("X-Content-Type-Options", "nosniff");
    res.type(file.mime);
    // Authenticated attachment, no public URL or storage_path in the DTO.
    return res.download(file.path, file.name);
  } catch (error) { return errorResponse(res, error.code === "ENOENT" ? { status: 404, message: "ไม่พบเอกสาร" } : error); }
}
module.exports = { getProfile, saveProfile, saveStudent, saveAggregate, children, requireRevision, uploadImage, deleteImage, getImage, uploadDocument, patchDocument, deleteDocument, listDocuments, downloadDocument };
