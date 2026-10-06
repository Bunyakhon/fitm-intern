const fs = require("node:fs/promises");
const path = require("node:path");
const { Op } = require("sequelize");
const defaultStorage = require("../config/storage");

const FILE_POLICY = {
  coop_project_book: { directory: "projectBooks", mime: { "application/pdf": [".pdf"] } },
  coop_poster: { directory: "posters", mime: { "application/pdf": [".pdf"], "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] } },
};
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function onlyTopic(body) {
  if (!body || Object.keys(body).some(key => key !== "topic") || typeof body.topic !== "string") fail(400, "กรุณาส่งเฉพาะหัวข้อโครงการ");
  const topic = body.topic.trim();
  if (!topic || [...topic].length > 500 || /[\u0000-\u001f\u007f]/.test(topic)) fail(400, "หัวข้อโครงการต้องมีความยาว 1–500 ตัวอักษร");
  return topic;
}
function publicFile(file) {
  return { id: file.id, file_type: file.file_type, original_name: file.original_name, mime_type: file.mime_type, file_size: Number(file.file_size), updated_at: file.updatedAt || file.updated_at };
}

function createStudentCoopProjectService(models, storage = defaultStorage) {
  const { Student, Teacher, CoopProject, StudentFile, sequelize } = models;
  async function student(studentId, transaction) {
    if (!UUID.test(studentId || "")) fail(403, "Student authorization is required");
    const record = await Student.findByPk(studentId, {
      attributes: ["id", "track", "coop_advisor_teacher_id"], transaction,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
    if (!record) fail(404, "ไม่พบข้อมูลนักศึกษา");
    if (record.track !== "co_op") fail(403, "สำหรับนักศึกษาสหกิจศึกษาเท่านั้น");
    return record;
  }
  async function readProject(studentId) {
    const owner = await student(studentId);
    const project = await CoopProject.findOne({ where: { student_id: owner.id } });
    const teacher = owner.coop_advisor_teacher_id ? await Teacher.findByPk(owner.coop_advisor_teacher_id, { attributes: ["id", "academic_title", "first_name", "last_name"] }) : null;
    const confirmed = teacher ? { id: teacher.id, name: `${teacher.academic_title || ""}${teacher.first_name} ${teacher.last_name}`.trim() } : null;
    return { topic: project?.topic || "", coop_advisor_teacher: confirmed, confirmed_advisor: confirmed };
  }
  async function saveTopic(studentId, body) {
    const topic = onlyTopic(body);
    await sequelize.transaction(async transaction => {
      const owner = await student(studentId, transaction);
      const project = await CoopProject.findOne({ where: { student_id: owner.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (project) await project.update({ topic }, { transaction });
      else await CoopProject.create({ student_id: owner.id, topic }, { transaction });
    });
    return readProject(studentId);
  }
  async function listFiles(studentId) {
    await student(studentId);
    return (await StudentFile.findAll({ where: { student_id: studentId, file_type: { [Op.in]: Object.keys(FILE_POLICY) } }, order: [["file_type", "ASC"]] })).map(publicFile);
  }
  // Both lexical and real paths must stay inside the authenticated owner's category.
  async function ownedPath(studentId, type, storedPath) {
    const policy = FILE_POLICY[type];
    if (!policy) fail(400, "ประเภทไฟล์ไม่ถูกต้อง");
    const resolved = storage.resolveStoragePath(storedPath);
    const directory = storage.getStudentStoragePaths(studentId)[policy.directory];
    if (path.dirname(resolved) !== directory || !/^[0-9a-f-]{36}\.(pdf|png|jpg)$/i.test(path.basename(resolved))) fail(400, "ตำแหน่งจัดเก็บไฟล์ไม่ถูกต้อง");
    const [real, realRoot] = await Promise.all([fs.realpath(resolved), fs.realpath(storage.STORAGE_ROOT)]);
    const relative = path.relative(realRoot, real);
    if (relative !== path.relative(storage.STORAGE_ROOT, resolved) || relative.startsWith("..") || path.isAbsolute(relative)) fail(400, "ตำแหน่งจัดเก็บไฟล์ไม่ถูกต้อง");
    if (!(await fs.stat(real)).isFile()) fail(400, "ไฟล์ไม่ถูกต้อง");
    return real;
  }
  async function cleanup(studentId, type, storedPath) {
    try { await fs.unlink(await ownedPath(studentId, type, storedPath)); }
    catch (error) { if (error.code !== "ENOENT") console.error("Co-op project file cleanup failed"); }
  }
  async function upload(studentId, type, file, body = {}) {
    let committed = false, stagedPath;
    try {
      if (!FILE_POLICY[type] || !file) fail(400, "กรุณาเลือกไฟล์");
      stagedPath = storage.toStorageRelativePath(file.path);
      const physicalPath = await ownedPath(studentId, type, stagedPath);
      if (Object.keys(body).length) fail(400, "ไม่รับข้อมูลนักศึกษาหรือฟิลด์เพิ่มเติม");
      let original = file.originalname;
      // Browser multipart filenames use UTF-8; Multer's parameter parser defaults
      // to Latin-1. Decode only valid UTF-8 bytes and preserve explicit Unicode.
      if (typeof original === "string" && [...original].every(character => character.codePointAt(0) <= 255)) {
        try { original = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(original, "latin1")); } catch { /* Actual Latin-1 filename. */ }
      }
      if (typeof original !== "string" || original.length > 255 || /[\\/\u0000-\u001f\u007f]/.test(original) || original.includes("..")) fail(400, "ชื่อไฟล์ไม่ถูกต้อง");
      const extensions = FILE_POLICY[type].mime[file.mimetype];
      if (!extensions?.includes(path.extname(original).toLowerCase()) || file.size < 1 || file.size > MAX_FILE_SIZE) fail(400, "ประเภทหรือขนาดไฟล์ไม่ถูกต้อง (สูงสุด 10MB)");
      const handle = await fs.open(physicalPath, "r");
      const header = Buffer.alloc(16);
      try { await handle.read(header, 0, header.length, 0); } finally { await handle.close(); }
      const matches = file.mimetype === "application/pdf" ? header.subarray(0, 5).equals(Buffer.from("%PDF-"))
        : file.mimetype === "image/png" ? header.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        : header.subarray(0, 3).equals(Buffer.from([255,216,255]));
      if (!matches || (await fs.stat(physicalPath)).size !== file.size) fail(400, "เนื้อหาไฟล์ไม่ตรงกับประเภทที่อนุญาต");
      const result = await sequelize.transaction(async transaction => {
        await student(studentId, transaction); // Serializes first upload and concurrent replacements.
        const existing = await StudentFile.findOne({ where: { student_id: studentId, file_type: type }, transaction, lock: transaction.LOCK.UPDATE });
        const previous = existing?.storage_path;
        const metadata = { original_name: original, storage_path: stagedPath, mime_type: file.mimetype, file_size: file.size };
        const current = existing ? await existing.update(metadata, { transaction }) : await StudentFile.create({ student_id: studentId, file_type: type, ...metadata }, { transaction });
        return { current, previous };
      });
      committed = true; // Subsequent failures must never remove this committed file.
      if (result.previous && result.previous !== stagedPath) await cleanup(studentId, type, result.previous);
      return publicFile(result.current);
    } catch (error) {
      if (!committed && stagedPath) await cleanup(studentId, type, stagedPath);
      throw error;
    }
  }
  async function preview(studentId, fileId) {
    await student(studentId);
    if (!UUID.test(fileId || "")) fail(400, "รหัสไฟล์ไม่ถูกต้อง");
    const file = await StudentFile.findOne({ where: { id: fileId, student_id: studentId, file_type: { [Op.in]: Object.keys(FILE_POLICY) } } });
    if (!file) fail(404, "ไม่พบไฟล์");
    if (!FILE_POLICY[file.file_type].mime[file.mime_type]) fail(404, "ไม่พบไฟล์ที่เปิดดูได้");
    try { return { file: publicFile(file), path: await ownedPath(studentId, file.file_type, file.storage_path) }; }
    catch { fail(404, "ไม่พบไฟล์"); }
  }
  return { readProject, saveTopic, listFiles, upload, preview };
}
module.exports = { createStudentCoopProjectService, FILE_POLICY, MAX_FILE_SIZE };
