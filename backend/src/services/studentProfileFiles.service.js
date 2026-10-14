const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const storageDefault = require("../config/storage");
const specs = require("../db/prepared/student-profile-phase2a/schema");
const rules = require("./studentProfileValidation");
const { FILE_ATTRIBUTES } = require("./studentProfileAggregate.service");
const DOCUMENT_MIME = { "application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg" };
const IMAGE_MIME = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };
function signature(bytes, mime) {
  if (mime === "application/pdf") return bytes.subarray(0, 5).equals(Buffer.from("%PDF-"));
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/jpeg") return bytes.subarray(0, 3).equals(Buffer.from([255,216,255]));
  if (mime === "image/webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  return false;
}
function createStudentProfileFilesService(models, aggregate, storage = storageDefault) {
  async function ownedPath(id, directory, stored) {
    const absolute = storage.resolveStoragePath(stored);
    const expected = storage.getStudentStoragePaths(id)[directory];
    if (path.dirname(absolute) !== expected || !/^[a-f0-9-]{36}\.(pdf|jpg|png|webp)$/i.test(path.basename(absolute))) rules.fail("ตำแหน่งไฟล์ไม่ถูกต้อง", 404);
    const [real, root] = await Promise.all([fs.realpath(absolute), fs.realpath(storage.STORAGE_ROOT)]);
    if (path.relative(root, real) !== path.relative(storage.STORAGE_ROOT, absolute) || !(await fs.stat(real)).isFile()) rules.fail("ตำแหน่งไฟล์ไม่ถูกต้อง", 404);
    return real;
  }
  async function discardStaged(id, directory, file) {
    if (!file) return;
    try { await fs.unlink(await ownedPath(id, directory, storage.toStorageRelativePath(file.path))); }
    catch { /* Never unlink a path that did not pass the private owner/root guard. */ }
  }
  async function discardUnreferencedStaged(id, directory, file, priorCounter) {
    // A COMMIT acknowledgement can fail after PostgreSQL committed. Wait for
    // the owner lock and verify durable references before removing new bytes.
    // If verification is unavailable, retaining bytes is safer than data loss.
    try {
      const stored = storage.toStorageRelativePath(file.path);
      const referenced = await models.sequelize.transaction(async transaction => {
        const student = await models.Student.findByPk(id, {
          attributes: ["id", "profile_image", "profile_data_revision"], transaction, lock: transaction.LOCK.SHARE,
        });
        if (directory === "profile") {
          // Photos have no historical metadata rows. A changed counter cannot
          // prove rollback: a later upload may have replaced a committed photo.
          return student?.profile_image === stored || (student && String(student.profile_data_revision) !== priorCounter);
        }
        return !!await models.StudentFile.findOne({
          where: { student_id: id, storage_path: stored }, attributes: ["id"], transaction,
        });
      });
      if (!referenced) await discardStaged(id, directory, file);
    } catch { /* Unknown commit outcome: retain staged bytes for reconciliation. */ }
  }
  async function validateFile(id, directory, file, mime, max) {
    if (!file) rules.fail("กรุณาแนบไฟล์");
    const stored = storage.toStorageRelativePath(file.path);
    const absolute = await ownedPath(id, directory, stored);
    const bytes = await fs.readFile(absolute);
    let original = file.originalname;
    if (typeof original === "string" && [...original].every(char => char.codePointAt(0) <= 255)) {
      try { original = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(original, "latin1")); } catch { /* Preserve Latin-1. */ }
    }
    if (typeof original !== "string" || !original || [...original].length > 255 || /[\\/\u0000-\u001f\u007f]/.test(original) || original.includes("..")) rules.fail("ชื่อไฟล์ไม่ถูกต้อง");
    const allowedExtensions = file.mimetype === "image/jpeg" ? [".jpg", ".jpeg"] : [mime[file.mimetype]];
    if (!Object.hasOwn(mime, file.mimetype) || !allowedExtensions.includes(path.extname(original).toLowerCase()) || bytes.length < 1 || bytes.length > max || bytes.length !== file.size || !signature(bytes, file.mimetype)) rules.fail("ประเภท เนื้อหา หรือขนาดไฟล์ไม่ถูกต้อง");
    return { original_name: original, storage_path: stored, mime_type: file.mimetype, file_size: bytes.length, content_sha256: createHash("sha256").update(bytes).digest("hex") };
  }
  async function upload(id, type, file, body, expected) {
    let committed = false, persistenceAttempted = false;
    try {
      rules.revision(expected);
      if (!specs.newFileTypes.includes(type)) rules.fail("ประเภทเอกสารไม่ถูกต้อง");
      if (type === "external_profile_pdf" && file?.mimetype !== "application/pdf") rules.fail("ต้นฉบับ Profile PDF ต้องเป็น PDF");
      rules.object(body || {}, ["document_label"]);
      const label = body?.document_label === undefined ? null : rules.text(body.document_label, "document_label");
      if (type === "supporting_other" && !label) rules.fail("เอกสารอื่นต้องมีชื่อกำกับ");
      const metadata = await validateFile(id, "profileDocuments", file, DOCUMENT_MIME, 10 * 1024 * 1024);
      persistenceAttempted = true;
      const result = await aggregate.mutate(id, expected, async context => {
        return persistDocument(context, type, metadata, label);
      });
      committed = true;
      // Retain previous rows and bytes; no retention/deletion policy is invented.
      return result;
    } finally {
      if (!committed) {
        if (persistenceAttempted) await discardUnreferencedStaged(id, "profileDocuments", file);
        else await discardStaged(id, "profileDocuments", file);
      }
    }
  }
  async function persistDocument({ student, transaction }, type, metadata, label, extra = {}) {
        let previous = null;
        if (type !== "supporting_other") {
          previous = await models.StudentFile.findOne({ where: { student_id: student.id, file_type: type }, attributes: [...FILE_ATTRIBUTES, "storage_path"], order: [["document_version", "DESC"], ["id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE });
          const active = await models.StudentFile.findAll({ where: { student_id: student.id, file_type: type, is_current: true }, attributes: FILE_ATTRIBUTES, transaction });
          for (const record of active) await record.update({ is_current: false }, { transaction, fields: ["is_current"] });
        }
        const version = previous ? previous.document_version + 1 : 1;
        if (version > 2147483647) rules.fail("Document version exhausted", 503);
        const document = await models.StudentFile.create({ ...metadata, ...extra, student_id: student.id, file_type: type, document_label: label, document_version: version, supersedes_file_id: previous?.id || null, is_current: true }, { transaction });
        const dto = Object.fromEntries(FILE_ATTRIBUTES.map(key => [key, document[key] ?? null]));
        return { changed: true, status: 201, response: { document: dto } };
  }
  async function uploadImport(id, file, expected, prepared, importId, method, validateDuplicates) {
    let committed = false, persistenceAttempted = false;
    try {
      rules.revision(expected);
      const metadata = await validateFile(id, "profileDocuments", file, { "application/pdf": ".pdf" }, 10 * 1024 * 1024);
      persistenceAttempted = true;
      const result = await aggregate.mutate(id, expected, async context => {
        validateDuplicates(context.before, prepared);
        await aggregate.applyAggregate(context, prepared);
        const saved = await persistDocument(context, "external_profile_pdf", metadata, "Profile PDF ที่ยืนยันนำเข้า", {
          id: importId, extraction_method: method, extraction_status: "ready", extracted_at: new Date(),
        });
        return { ...saved, response: { ...saved.response, import_status: "committed", import_id: importId } };
      });
      committed = true;
      return result;
    } finally {
      if (!committed) {
        if (persistenceAttempted) await discardUnreferencedStaged(id, "profileDocuments", file);
        else await discardStaged(id, "profileDocuments", file);
      }
    }
  }
  async function documentRecord(id, fileId, transaction) {
    if (!rules.UUID.test(fileId || "")) rules.fail("รหัสเอกสารไม่ถูกต้อง");
    const { Op } = require("sequelize");
    const record = await models.StudentFile.findOne({ where: { id: fileId, student_id: id, file_type: { [Op.in]: specs.newFileTypes } }, attributes: [...FILE_ATTRIBUTES, "storage_path"], transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
    if (!record) rules.fail("ไม่พบเอกสาร", 404);
    return record;
  }
  function changeDocument(id, fileId, body, expected, removing = false) {
    rules.object(body, removing ? [] : ["document_label"]);
    const patch = removing ? { is_current: false } : body.document_label === undefined ? {} : { document_label: rules.text(body.document_label, "document_label") };
    return aggregate.mutate(id, expected, async ({ transaction }) => {
      const record = await documentRecord(id, fileId, transaction);
      if (!removing && !record.is_current) rules.fail("แก้ชื่อได้เฉพาะเอกสารปัจจุบัน", 409);
      if (!removing && record.file_type === "supporting_other" && patch.document_label === null) rules.fail("เอกสารอื่นต้องมีชื่อกำกับ");
      const changes = Object.fromEntries(Object.entries(patch).filter(([key, value]) => record[key] !== value));
      if (Object.keys(changes).length) await record.update(changes, { transaction, fields: Object.keys(changes) });
      return { changed: !!Object.keys(changes).length, response: { document_id: record.id } };
    });
  }
  async function preview(id, fileId) {
    const record = await documentRecord(id, fileId);
    if (!DOCUMENT_MIME[record.mime_type]) rules.fail("ไม่พบเอกสาร", 404);
    return { path: await ownedPath(id, "profileDocuments", record.storage_path), mime: record.mime_type, name: record.original_name };
  }
  async function uploadImage(id, file, body, expected) {
    let committed = false, persistenceAttempted = false;
    let priorCounter;
    try {
      rules.revision(expected); rules.object(body || {}, []);
      const metadata = await validateFile(id, "profile", file, IMAGE_MIME, 5 * 1024 * 1024);
      const result = await aggregate.mutate(id, expected, async ({ student, transaction }) => {
        priorCounter = String(student.profile_data_revision ?? "0");
        persistenceAttempted = true;
        await student.update({ profile_image: metadata.storage_path }, { transaction, fields: ["profile_image"] });
        return { changed: true, response: { profile_image: metadata.storage_path } };
      });
      committed = true;
      // Keep old bytes; a concurrent reader and future retention policy stay safe.
      return result;
    } finally {
      if (!committed) {
        if (persistenceAttempted) await discardUnreferencedStaged(id, "profile", file, priorCounter);
        else await discardStaged(id, "profile", file);
      }
    }
  }
  async function image(id) {
    const record = await models.Student.findByPk(id, { attributes: ["id", "profile_image"] });
    if (!record?.profile_image) rules.fail("ไม่พบรูปโปรไฟล์", 404);
    return ownedPath(id, "profile", record.profile_image);
  }
  return { upload, changeDocument, preview, uploadImage, image, uploadImport, discardStaged: file => discardStaged(file.owner, "profileDocuments", file) };
}
module.exports = { createStudentProfileFilesService, DOCUMENT_MIME, IMAGE_MIME, signature };
