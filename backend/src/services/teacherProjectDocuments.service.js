const fs = require('node:fs/promises');
const { Op } = require('sequelize');
const { uuid, object } = require('../validators/roleWorkflow.validator');
const { teacherPage } = require('./teacherSearch.service');
const { createStudentCoopProjectService, FILE_POLICY, MAX_FILE_SIZE } = require('./studentCoopProject.service');
const { createTopicDocumentStorage } = require('./coopTopicDocumentStorage');
const defaultStorage = require('../config/storage');
const { documentUrl } = require('./projectDocumentUrl.rules');
const { httpsUrl } = require('./coopTopicExam.rules');
const KINDS = { 'project-book': 'coop_project_book', poster: 'coop_poster', co09: null };
const fail = (status, code, message) => { throw Object.assign(new Error(message), { status, code }); };
const stamp = value => value ? new Date(value).toISOString() : '';
function safeLink(raw, provider, legacy = false) {
  if (!raw) return { url: '', invalid_link: false };
  try { return { url: documentUrl(raw, provider), invalid_link: false }; }
  catch {
    // CO-09's existing read contract retains legacy HTTPS links. Never rewrite
    // them or label a different provider as Overleaf.
    if (legacy) { try { return { url: httpsUrl(raw), invalid_link: false, legacy_link: true }; } catch { /* Reject unsafe legacy URL. */ } }
    return { url: '', invalid_link: true };
  }
}

function createTeacherProjectDocumentsService(m, { storage = defaultStorage, topicStorage = createTopicDocumentStorage(storage.STORAGE_ROOT) } = {}) {
  const files = createStudentCoopProjectService(m, storage);
  async function teacher(id) {
    uuid(id);
    if (!await m.Teacher.findOne({ where: { id, status: 'active' }, attributes: ['id'], useMaster: true })) fail(403, 'DOCUMENTS_FORBIDDEN', 'บัญชีอาจารย์ไม่มีสิทธิ์ใช้งาน');
  }
  async function owner(teacherId, studentId) {
    uuid(studentId); await teacher(teacherId);
    const student = await m.Student.findOne({ where: { id: studentId, track: 'co_op', coop_advisor_teacher_id: teacherId }, attributes: ['id'], useMaster: true });
    if (!student) fail(404, 'DOCUMENTS_STUDENT_NOT_FOUND', 'ไม่พบนักศึกษาในความดูแลหรือสิทธิ์เข้าถึงเปลี่ยนแล้ว');
  }
  async function ready() {
    const [rows] = await m.sequelize.query(`SELECT to_regclass('public.student_files') IS NOT NULL
      AND to_regclass('public.coop_projects') IS NOT NULL AND to_regclass('public.coop_project_links') IS NOT NULL
      AND to_regclass('public.coop_topic_documents') IS NOT NULL AND to_regclass('public.coop_academic_periods') IS NOT NULL AS ready`);
    if (!rows[0]?.ready) fail(503, 'DOCUMENTS_SCHEMA_NOT_READY', 'ระบบเอกสารยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ');
  }
  function category(kind) { if (!Object.hasOwn(KINDS, kind)) fail(400, 'DOCUMENTS_CATEGORY_INVALID', 'ประเภทเอกสารไม่ถูกต้อง'); }
  async function physical(studentId, kind, row) {
    if (kind === 'co09') {
      if (row.mime_type !== 'application/pdf') fail(404, 'DOCUMENTS_FILE_NOT_FOUND', 'ไม่พบ PDF ที่รองรับ');
      return topicStorage.inspect(studentId, row.storage_path);
    }
    if (!FILE_POLICY[KINDS[kind]].mime[row.mime_type]) fail(404, 'DOCUMENTS_FILE_NOT_FOUND', 'ไม่พบไฟล์ที่รองรับ');
    const path = await files.ownedPath(studentId, KINDS[kind], row.storage_path);
    const stat = await fs.stat(path);
    return { path, size: stat.size };
  }
  const revision = (kind, row) => kind === 'co09' ? String(row.version) : stamp(row.updatedAt);
  async function document(studentId, kind, file, link, detailed) {
    const external = safeLink(kind === 'co09' ? file?.document_url : link?.document_url, kind === 'poster' ? 'drive' : 'overleaf', kind === 'co09');
    const hasMetadata = Boolean(file?.storage_path);
    let available = false, unavailable = false;
    if (hasMetadata) {
      try {
        const physicalFile = await physical(studentId, kind, file);
        available = physicalFile.size > 0 && physicalFile.size <= MAX_FILE_SIZE && physicalFile.size === Number(file.file_size);
        unavailable = !available;
      } catch { unavailable = true; }
    }
    const value = { category: kind, has_file: available, has_link: Boolean(external.url), file_unavailable: unavailable,
      invalid_link: external.invalid_link, state: unavailable || external.invalid_link ? 'unavailable' : available && external.url ? 'file_and_link' : available ? 'file' : external.url ? 'link' : 'missing',
      ...(kind === 'co09' ? { exists: Boolean(file), review_status: file?.review_status || 'missing' } : {}) };
    if (!detailed) return value;
    return { ...value, document_url: external.url, legacy_link: Boolean(external.legacy_link),
      updated_at: file?.updatedAt || link?.updatedAt || null,
      link_updated_at: kind === 'co09' ? file?.updatedAt || null : link?.updatedAt || null,
      ...(kind === 'co09' ? { review_reason: file?.review_reason || '', reviewed_at: file?.reviewed_at || null } : {}),
      file: hasMetadata ? { id: file.id, original_name: file.original_name, mime_type: file.mime_type, file_size: Number(file.file_size),
        uploaded_at: kind === 'co09' ? file.uploaded_at : file.createdAt, updated_at: file.updatedAt, revision: revision(kind, file) } : null };
  }
  async function page(teacherId, query, detailed = false, studentId) {
    await teacher(teacherId); await ready();
    object(query, ['search','year','semester','major','sort','offset','limit','metadata'], { empty: true });
    const result = await teacherPage(m, 'documents', teacherId, query, async (ids, transaction) => {
      // Five bounded bulk queries for one page. No per-student DB/detail calls.
      const students = await m.Student.findAll({ where: { id: { [Op.in]: ids }, track: 'co_op', coop_advisor_teacher_id: teacherId }, attributes: ['id','student_id','first_name','last_name','major'], transaction });
      const projects = await m.CoopProject.findAll({ where: { student_id: { [Op.in]: ids } }, attributes: ['student_id','topic'], transaction });
      const storedFiles = await m.StudentFile.findAll({ where: { student_id: { [Op.in]: ids }, file_type: { [Op.in]: ['coop_project_book','coop_poster'] } }, attributes: ['id','student_id','file_type','original_name','mime_type','file_size','storage_path','createdAt','updatedAt'], transaction });
      const links = await m.CoopProjectLink.findAll({ where: { student_id: { [Op.in]: ids }, category: { [Op.in]: ['project-book','poster'] } }, transaction });
      const co09 = await m.CoopTopicDocument.findAll({ where: { student_id: { [Op.in]: ids } }, transaction });
      return Promise.all(students.map(async student => {
        const documents = {};
        for (const kind of Object.keys(KINDS)) documents[kind] = await document(student.id, kind,
          kind === 'co09' ? co09.find(row => row.student_id === student.id) : storedFiles.find(row => row.student_id === student.id && row.file_type === KINDS[kind]),
          links.find(row => row.student_id === student.id && row.category === kind), detailed);
        return { ...student.toJSON(), topic: projects.find(row => row.student_id === student.id)?.topic || '', documents };
      }));
    }, { studentId });
    return result;
  }
  async function detail(teacherId, studentId, query = {}) {
    await owner(teacherId, studentId);
    const result = await page(teacherId, { ...query, offset: 0, limit: 1 }, true, studentId);
    const student = result.rows[0];
    if (!student) fail(404, 'DOCUMENTS_STUDENT_NOT_FOUND', 'นักศึกษาไม่อยู่ในผลลัพธ์ล่าสุด กรุณาโหลดรายการใหม่');
    const placements = await m.CoopRequest.findAll({ where: { student_id: studentId, status: { [Op.in]: ['approved','document_issued','in_progress'] },
      ...(student.academicRequestId ? { id: student.academicRequestId } : {}) }, attributes: ['company_name'], limit: 2 });
    await owner(teacherId, studentId);
    return { student: { ...student, company_name: placements.length === 1 ? placements[0].company_name : null } };
  }
  async function file(teacherId, studentId, kind, fileId, expectedRevision) {
    category(kind); uuid(fileId); await owner(teacherId, studentId); await ready();
    if (typeof expectedRevision !== 'string' || !expectedRevision || expectedRevision.length > 50) fail(400, 'DOCUMENTS_REVISION_REQUIRED', 'กรุณาโหลดรายละเอียดเอกสารก่อนเปิดไฟล์');
    const model = kind === 'co09' ? m.CoopTopicDocument : m.StudentFile;
    const where = { id: fileId, student_id: studentId, ...(kind !== 'co09' ? { file_type: KINDS[kind] } : {}) };
    const row = await model.findOne({ where, useMaster: true });
    if (!row?.storage_path) fail(404, 'DOCUMENTS_FILE_NOT_FOUND', 'ไม่พบไฟล์เอกสาร');
    if (revision(kind, row) !== expectedRevision) fail(409, 'DOCUMENTS_FILE_CHANGED', 'ไฟล์เปลี่ยนแล้ว กรุณาโหลดรายละเอียดล่าสุด');
    let buffer;
    try {
      const located = await physical(studentId, kind, row);
      if (located.size < 1 || located.size > MAX_FILE_SIZE || located.size !== Number(row.file_size)) throw Error('File size differs');
      buffer = kind === 'co09' ? await topicStorage.read(studentId, row.storage_path) : await fs.readFile(located.path);
    } catch { fail(404, 'DOCUMENTS_FILE_NOT_FOUND', 'ไฟล์ไม่พบหรือถูกเปลี่ยนแล้ว กรุณาโหลดรายละเอียดล่าสุด'); }
    const valid = row.mime_type === 'application/pdf' ? buffer.subarray(0,5).equals(Buffer.from('%PDF-'))
      : row.mime_type === 'image/png' ? buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : row.mime_type === 'image/jpeg' && buffer.subarray(0,3).equals(Buffer.from([255,216,255]));
    if (!valid || buffer.length !== Number(row.file_size)) fail(404, 'DOCUMENTS_FILE_NOT_FOUND', 'เนื้อหาไฟล์ไม่ตรงกับประเภทเอกสาร');
    const latest = await model.findOne({ where, useMaster: true });
    if (!latest || latest.storage_path !== row.storage_path || revision(kind, latest) !== expectedRevision) fail(409, 'DOCUMENTS_FILE_CHANGED', 'ไฟล์เปลี่ยนแล้ว กรุณาโหลดรายละเอียดล่าสุด');
    await owner(teacherId, studentId);
    return { buffer, name: row.original_name || 'document.pdf', mime: row.mime_type };
  }
  return { list: (id, query = {}) => page(id, query), detail, file };
}
module.exports = { createTeacherProjectDocumentsService };
