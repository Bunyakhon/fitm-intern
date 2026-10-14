const crypto = require("node:crypto"), fs = require("node:fs/promises"), path = require("node:path");
const rules = require("./studentProfileValidation");
const storageDefault = require("../config/storage");
const { createStudentProfileFilesService, signature } = require("./studentProfileFiles.service");
const { extractProfilePdf } = require("./studentProfilePdf.client");
const STUDENT = rules.STUDENT_FIELDS.filter(key => key !== "advisor_teacher_id");
const IDENTITY_KEYS = { addresses: ["address_type"], education: ["education_level", "institution_name", "qualification", "major"], training: ["course_name", "institution"], skills: ["category", "skill_name"] };
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
function recordIdentity(kind, row) { return JSON.stringify(IDENTITY_KEYS[kind].map(key => String(row[key] ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en"))); }
function validateDuplicates(snapshot, prepared) {
  const keys = Object.fromEntries(Object.keys(IDENTITY_KEYS).map(kind => [kind, new Map()]));
  for (const kind of Object.keys(keys)) for (const row of snapshot[kind]) {
    const identity = recordIdentity(kind, row); keys[kind].set(identity, (keys[kind].get(identity) || 0) + 1);
  }
  for (const operation of prepared.operations) {
    if (operation.action === "delete") rules.fail("PDF Import ไม่ลบรายการเดิม");
    if (operation.action === "create") {
      const identity = recordIdentity(operation.kind, operation.patch);
      if (keys[operation.kind].get(identity) > 0) rules.fail("มีรายการนี้แล้ว กรุณาเลือกแก้รายการเดิมหรือข้าม", 409, "PDF_IMPORT_DUPLICATE_RECORD");
      keys[operation.kind].set(identity, 1);
    } else {
      const row = snapshot[operation.kind].find(row => row.id === operation.id);
      if (!row) rules.fail("ไม่พบรายการของนักศึกษา", 404);
      const original = recordIdentity(operation.kind, row), next = recordIdentity(operation.kind, { ...row, ...operation.patch });
      if (original !== next && keys[operation.kind].get(next) > 0) rules.fail("การแก้ไขจะสร้างรายการซ้ำ", 409, "PDF_IMPORT_DUPLICATE_RECORD");
      keys[operation.kind].set(original, keys[operation.kind].get(original) - 1); keys[operation.kind].set(next, (keys[operation.kind].get(next) || 0) + 1);
    }
  }
}
function fileInfo(file) {
  if (!file?.buffer || file.mimetype !== "application/pdf" || file.size !== file.buffer.length || file.size < 1 || file.size > 10 * 1024 * 1024 || !signature(file.buffer, file.mimetype)) rules.fail("แนบ PDF ที่ถูกต้อง ขนาดไม่เกิน 10MB");
  let name = file.originalname;
  if (typeof name === "string" && [...name].every(char => char.codePointAt(0) <= 255)) {
    try { name = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(name, "latin1")); } catch { /* Existing filename semantics. */ }
  }
  if (typeof name !== "string" || !name || [...name].length > 255 || /[\\/\u0000-\u001f\u007f]/.test(name) || name.includes("..") || path.extname(name).toLowerCase() !== ".pdf") rules.fail("ชื่อไฟล์ PDF ไม่ถูกต้อง");
  return { name, sha256: hash(file.buffer) };
}
function numericValue(scope, key, value) {
  if (scope === "profile" && ["height_cm", "weight_kg"].includes(key) || ["year_level", "father_age", "mother_age", "graduation_year"].includes(key)) {
    if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())) return Number(value);
  }
  return value;
}
function normalizeField(scope, key, value) {
  value = numericValue(scope, key, value);
  return (scope === "profile" ? rules.normalizeProfile({ [key]: value }) : scope === "student" ? rules.normalizeStudent({ [key]: value }) : rules.normalizeChild(scope, { [key]: value }))[key];
}
function safeExtraction(data) {
  if (data?.template !== "TGDE-COOP-02" || !Number.isInteger(data.page_count) || data.page_count < 1 || data.page_count > 4 || !["pdf_text", "ocr"].includes(data.method)) rules.fail("ผลอ่าน PDF ไม่ตรงข้อกำหนด", 502);
  const candidates = [];
  for (const item of (Array.isArray(data.candidates) ? data.candidates : []).slice(0, 100)) {
    if (!(item.scope === "profile" && rules.EDITABLE_PROFILE_FIELDS.includes(item.key) || item.scope === "student" && STUDENT.includes(item.key))) continue;
    if (item.value === null || item.value === undefined || item.value === "") continue;
    const result = { scope: item.scope, key: item.key, value: item.value, page: item.page, source: item.source, review_required: true };
    try { result.value = normalizeField(item.scope, item.key, item.value); }
    catch (error) { result.validation_error = error.status ? error.message : "ค่าที่อ่านได้ไม่ถูกต้อง"; }
    candidates.push(result);
  }
  const records = {};
  for (const kind of Object.keys(rules.RELATIONS)) {
    const seen = new Set(); records[kind] = [];
    for (const item of (Array.isArray(data.records?.[kind]) ? data.records[kind] : []).slice(0, 100)) {
      const values = {}, errors = {};
      for (const [key, raw] of Object.entries(item.values || {})) {
        if (raw === "" || raw == null) continue;
        try { values[key] = normalizeField(kind, key, raw); }
        catch (error) { if (error.message === "มีฟิลด์ที่ไม่อนุญาตให้แก้ไข") continue; values[key] = raw; errors[key] = error.status ? error.message : "ค่าที่อ่านได้ไม่ถูกต้อง"; }
      }
      if (!Object.keys(values).length) continue;
      try { rules.normalizeChild(kind, values, true); } catch (error) { errors.record = error.message; }
      const fingerprint = JSON.stringify(values); if (seen.has(fingerprint)) continue; seen.add(fingerprint);
      records[kind].push({ values, validation_errors: errors, page: item.page, source: item.source, review_required: true });
    }
  }
  return { template: data.template, page_count: data.page_count, method: data.method, candidates, records,
    warnings: Array.isArray(data.warnings) ? data.warnings.filter(value => typeof value === "string" && /^[A-Z_]{1,80}$/.test(value)).slice(0, 40) : [],
    identity: Object.fromEntries(["student_id", "thai_name", "english_name"].filter(key => typeof data.identity?.[key] === "string").map(key => [key, data.identity[key].slice(0, 255)])) };
}
function createStudentProfilePdfImportService(models, aggregate, { extract = extractProfilePdf, storage = storageDefault, secret = process.env.JWT_SECRET, now = () => Date.now() } = {}) {
  const files = createStudentProfileFilesService(models, aggregate, storage);
  function sign(payload) {
    if (!secret) rules.fail("PDF Import configuration ยังไม่พร้อม", 503);
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return encoded + "." + crypto.createHmac("sha256", secret).update("profile-pdf-v1:" + encoded).digest("base64url");
  }
  function receipt(owner, token, statusOnly = false) {
    if (typeof token !== "string" || token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) rules.fail("Preview ไม่ถูกต้อง กรุณาอ่านไฟล์ใหม่");
    const [encoded, signature] = token.split(".");
    let data; try { data = JSON.parse(Buffer.from(encoded, "base64url")); } catch { rules.fail("Preview ไม่ถูกต้อง"); }
    const expected = sign(data).split(".")[1];
    const a = Buffer.from(signature), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) rules.fail("Preview ไม่ถูกต้อง", 403);
    if (data.kind !== "profile-pdf-v1" || data.owner !== owner || !rules.UUID.test(data.id || "")) rules.fail("Preview ไม่ใช่ของบัญชีนี้", 403);
    if (!Number.isSafeInteger(data.issued) || now() - data.issued > (statusOnly ? 24 * 60 * 60_000 : 30 * 60_000) || data.issued > now() + 5000) rules.fail("Preview หมดอายุ กรุณาอ่านไฟล์ใหม่", 410);
    return data;
  }
  async function committed(owner, data) {
    return aggregate.read(owner, async ({ snapshot, transaction }) => {
      const file = await models.StudentFile.findOne({ where: { id: data.id, student_id: owner, file_type: "external_profile_pdf", content_sha256: data.sha256, extraction_status: "ready" }, attributes: ["id", "original_name", "document_version", "extraction_status"], transaction });
      if (!file) return null;
      return { status: 200, body: { ...snapshot, import_status: "committed", import_id: file.id, replayed: true, document: { id: file.id, original_name: file.original_name, document_version: file.document_version, extraction_status: file.extraction_status } } };
    });
  }
  async function preview(owner, file) {
    const info = fileInfo(file), snapshot = await aggregate.read(owner);
    const result = safeExtraction(await extract(file.buffer));
    if (result.warnings.includes("STUDENT_ID_UNREADABLE")) rules.fail("อ่านรหัสนักศึกษาไม่ได้ จึงยังตรวจเจ้าของเอกสารไม่ได้", 422, "PDF_STUDENT_ID_UNREADABLE");
    if (result.identity.student_id && result.identity.student_id !== String(snapshot.student.student_id).trim()) rules.fail("รหัสนักศึกษาใน PDF ไม่ตรงบัญชี ไม่อนุญาตให้นำเข้า", 422, "PDF_STUDENT_ID_MISMATCH");
    const token = sign({ kind: "profile-pdf-v1", owner, id: crypto.randomUUID(), sha256: info.sha256, name: info.name, revision: snapshot.profile_revision, method: result.method, issued: now() });
    return { ...result, snapshot, receipt: token, original_name: info.name, file_sha256: info.sha256, identity_status: result.identity.student_id ? "matched" : "not_present", expires_in_seconds: 1800, import_status: "preview" };
  }
  async function status(owner, body) {
    rules.object(body, ["receipt"]);
    const data = receipt(owner, body.receipt, true), result = await committed(owner, data);
    return result?.body || { import_status: "not_committed", import_id: data.id };
  }
  async function review(owner, body) {
    rules.object(body, ["receipt"]);
    const data = receipt(owner, body.receipt, true), saved = await committed(owner, data);
    if (saved) return saved.body;
    const snapshot = await aggregate.read(owner);
    return { import_status: "preview", snapshot, receipt: sign({ ...data, revision: snapshot.profile_revision, issued: now() }) };
  }
  async function commit(owner, file, body, expected) {
    rules.revision(expected); rules.object(body, ["receipt", "changes"]);
    const data = receipt(owner, body.receipt), info = fileInfo(file);
    if (expected !== data.revision) rules.fail("Revision ต้องตรงฉบับ Preview กรุณาตรวจใหม่", 409, "PDF_PREVIEW_REVISION_CHANGED");
    if (info.sha256 !== data.sha256 || info.name !== data.name) rules.fail("ไฟล์เปลี่ยนจากฉบับ Preview กรุณาอ่านใหม่");
    rules.object(body.changes, ["student", "profile", ...Object.keys(rules.RELATIONS)]);
    if (body.changes.student) rules.object(body.changes.student, STUDENT);
    const prepared = aggregate.prepareAggregate(body.changes);
    if (prepared.operations.some(op => op.action === "delete")) rules.fail("PDF Import ไม่ลบรายการเดิม");
    const prior = await committed(owner, data); if (prior) return prior;
    const paths = await storage.ensureStudentStorage(owner);
    const [realRoot, realDirectory] = await Promise.all([fs.realpath(storage.STORAGE_ROOT), fs.realpath(paths.profileDocuments)]);
    if (path.relative(realRoot, realDirectory) !== path.relative(storage.STORAGE_ROOT, paths.profileDocuments)) rules.fail("ตำแหน่งเก็บ PDF ส่วนตัวไม่ถูกต้อง", 503);
    const staged = { owner, path: path.join(paths.profileDocuments, crypto.randomUUID() + ".pdf"), originalname: file.originalname, mimetype: file.mimetype, size: file.size };
    let handedToFiles = false;
    try {
      await fs.writeFile(staged.path, file.buffer, { flag: "wx", mode: 0o600 });
      handedToFiles = true;
      return await files.uploadImport(owner, staged, expected, prepared, data.id, data.method, validateDuplicates);
    } catch (error) {
      // Files service reconciles durable references after a COMMIT acknowledgement
      // failure. Never unlink its staged path again without that proof.
      if (!handedToFiles) await files.discardStaged(staged);
      const recovered = await committed(owner, data).catch(() => null);
      if (recovered) return recovered;
      throw error;
    }
  }
  async function history(owner) {
    await aggregate.read(owner);
    return { imports: (await models.StudentFile.findAll({ where: { student_id: owner, file_type: "external_profile_pdf", extraction_status: "ready" }, attributes: ["id", "original_name", "document_version", "is_current", "extraction_method", "extraction_status", "extracted_at"], order: [["extracted_at", "DESC"]], limit: 5 })).map(file => file.get({ plain: true })) };
  }
  return { preview, commit, status, history, review };
}
module.exports = { createStudentProfilePdfImportService, recordIdentity, validateDuplicates, safeExtraction, fileInfo, normalizeField };
