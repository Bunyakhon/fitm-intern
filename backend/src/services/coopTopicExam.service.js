const { Op, QueryTypes, Transaction } = require('sequelize');
const r = require('./coopTopicExam.rules');
const { uuid } = require('../validators/roleWorkflow.validator');
const { createTopicDocumentStorage } = require('./coopTopicDocumentStorage');
const ACTIVE = ['scheduled', 'rescheduled'];
const studentFields = ['id','student_id','first_name','last_name','major','coop_advisor_teacher_id'];
const teacherFields = ['id','academic_title','first_name','last_name'];
function createCoopTopicExamService(models, { storage = createTopicDocumentStorage() } = {}) {
  const { sequelize, Student, Teacher, CoopProject, CoopTopicDocument: Document, CoopTopicExam: Exam, CoopTopicExamCommitteeMember: Member, CoopTopicExamHistory: History } = models;
  async function tx(work) {
    const transaction = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
    let committing = false;
    try {
      await sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await sequelize.query("SET LOCAL statement_timeout = '15s'", { transaction });
      // One common lock for scheduling/review/upload prevents cross-student room /
      // teacher phantoms across concurrent requests and application instances.
      await sequelize.query('SELECT pg_advisory_xact_lock(2140909)', { transaction });
      const result = await work(transaction);
      committing = true; await transaction.commit(); return result;
    } catch (error) {
      if (!transaction.finished) await transaction.rollback().catch(() => {});
      if (committing) r.fail('ผลบันทึกยังไม่แน่ชัด กรุณาโหลดข้อมูลล่าสุดก่อนลองใหม่ ไฟล์ถูกเก็บไว้เพื่อตรวจสอบ', 503, 'CO09_COMMIT_UNCERTAIN');
      throw error;
    }
  }
  async function owner(studentId, transaction, lock = false) {
    uuid(studentId);
    const student = await Student.findOne({ where: { id: studentId, track: 'co_op' }, attributes: studentFields, transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) });
    if (!student) r.fail('ไม่พบนักศึกษาสหกิจศึกษาในขอบเขต', 404, 'CO09_NOT_FOUND');
    return student;
  }
  const documentDTO = row => row ? {
    id: row.id, version: row.version, document_url: row.document_url, review_status: row.review_status,
    review_reason: row.review_reason, reviewed_at: row.reviewed_at,
    file: row.storage_path ? { original_name: row.original_name, file_size: Number(row.file_size), mime_type: row.mime_type, uploaded_at: row.uploaded_at } : null,
  } : { version: 0, document_url: '', review_status: 'missing', review_reason: '', reviewed_at: null, file: null };
  async function examDTO(row, transaction, history = false) {
    if (!row) return { version: 0, status: 'unscheduled', committee: [] };
    const members = await Member.findAll({ where: { exam_id: row.id }, include: [{ model: Teacher, as: 'teacher', attributes: teacherFields }], order: [['display_order','ASC']], transaction });
    const data = Object.fromEntries(['id','version','status','starts_at','ends_at','mode','location','meeting_url','notes','reason'].map(key => [key, row[key]]));
    data.timezone = 'Asia/Bangkok';
    data.committee = members.map(item => ({ teacher_id: item.teacher_id, role: item.role, display_order: item.display_order, teacher: item.teacher }));
    if (history) data.history = (await History.findAll({ where: { exam_id: row.id }, attributes: ['version','snapshot','createdAt'], order: [['version','DESC']], transaction })).map(item => item.toJSON());
    return data;
  }
  async function detail(studentId, history = false, transaction) {
    // Repeatable snapshot: schedule and committee cannot come from two revisions.
    if (!transaction) return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, readOnly: true }, t => detail(studentId, history, t));
    const student = await owner(studentId, transaction);
    const project = await CoopProject.findOne({ where: { student_id: studentId }, attributes: ['id','topic'], transaction });
    const advisor = student.coop_advisor_teacher_id ? await Teacher.findByPk(student.coop_advisor_teacher_id, { attributes: teacherFields, transaction }) : null;
    return { student, project, advisor, document: documentDTO(await Document.findOne({ where: { student_id: studentId }, transaction })), exam: await examDTO(await Exam.findOne({ where: { student_id: studentId }, transaction }), transaction, history) };
  }
  async function saveDocument(studentId, body, header, file) {
    r.object(body, file ? [] : ['document_url']);
    if (!file && !Object.hasOwn(body, 'document_url')) r.fail('กรุณาระบุ document_url ให้ชัดเจน');
    const url = file ? undefined : r.httpsUrl(body.document_url);
    if (file) r.pdf(file);
    return tx(async transaction => {
      await owner(studentId, transaction, true);
      let row = await Document.findOne({ where: { student_id: studentId }, transaction, lock: transaction.LOCK.UPDATE });
      r.revision(header, row?.version || 0);
      const changes = { review_reason: '', reviewed_at: null, reviewed_by: null, version: (row?.version || 0) + 1 };
      if (file) {
        changes.storage_path = await storage.write(studentId, file.buffer);
        // Avoid user-supplied path components in displayed/downloaded filenames.
        changes.original_name = file.originalname.replaceAll('\\', '/').split('/').pop().replace(/[\x00-\x1f\x7f]/g, '').slice(0,255) || 'CO-09.pdf';
        Object.assign(changes, { file_size: file.buffer.length, mime_type: 'application/pdf', uploaded_at: new Date() });
      } else changes.document_url = url;
      changes.review_status = (file || row?.storage_path || url) ? 'pending' : 'missing';
      if (row) await row.update(changes, { transaction }); else row = await Document.create({ student_id: studentId, ...changes }, { transaction });
      return documentDTO(row);
    });
  }
  async function review(studentId, body, header, actor) {
    r.object(body, ['review_status','review_reason']);
    if (!['needs_revision','approved'].includes(body.review_status)) r.fail('สถานะตรวจเอกสารไม่ถูกต้อง');
    const reason = r.text(body.review_reason, 2000, body.review_status === 'needs_revision');
    return tx(async transaction => {
      await owner(studentId, transaction, true);
      const row = await Document.findOne({ where: { student_id: studentId }, transaction, lock: transaction.LOCK.UPDATE });
      r.revision(header, row?.version || 0);
      if (!row || (!row.storage_path && !row.document_url)) r.fail('ยังไม่มีเอกสารให้ตรวจ', 409);
      await row.update({ review_status: body.review_status, review_reason: reason, reviewed_at: new Date(), reviewed_by: actor, version: row.version + 1 }, { transaction });
      return documentDTO(row);
    });
  }
  async function saveSchedule(studentId, body, header, actor) {
    return tx(async transaction => {
      await owner(studentId, transaction, true);
      let row = await Exam.findOne({ where: { student_id: studentId }, transaction, lock: transaction.LOCK.UPDATE });
      r.revision(header, row?.version || 0);
      const values = r.schedule(body, row?.status || 'unscheduled');
      const project = await CoopProject.findOne({ where: { student_id: studentId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!project?.topic?.trim()) r.fail('กรุณาบันทึกหัวข้อโครงการก่อนจัดตารางสอบ', 409);
      for (const id of values.committee.map(item => item.teacher_id).sort()) {
        if (!await Teacher.findOne({ where: { id, status: 'active' }, attributes: ['id'], transaction, lock: transaction.LOCK.SHARE })) r.fail('ไม่พบอาจารย์กรรมการที่ใช้งานอยู่');
      }
      const location_key = values.mode === 'onsite' ? values.location.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() : '';
      if (ACTIVE.includes(values.status)) {
        const overlapping = await Exam.findAll({ where: { status: { [Op.in]: ACTIVE }, starts_at: { [Op.lt]: values.ends_at }, ends_at: { [Op.gt]: values.starts_at }, ...(row ? { id: { [Op.ne]: row.id } } : {}) }, transaction });
        const teacherIds = new Set(values.committee.map(item => item.teacher_id));
        for (const other of overlapping) {
          if (location_key && location_key === other.location_key) r.fail('ห้องสอบมีตารางซ้อนในช่วงเวลานี้', 409, 'CO09_ROOM_CONFLICT');
          const others = await Member.findAll({ where: { exam_id: other.id }, attributes: ['teacher_id'], transaction });
          if (others.some(item => teacherIds.has(item.teacher_id))) r.fail('กรรมการมีตารางสอบซ้อนในช่วงเวลานี้', 409, 'CO09_COMMITTEE_CONFLICT');
        }
      }
      const { committee, ...changes } = values;
      Object.assign(changes, { location_key, project_id: project.id, updated_by: actor, version: (row?.version || 0) + 1 });
      if (row) await row.update(changes, { transaction });
      else row = await Exam.create({ student_id: studentId, created_by: actor, ...changes }, { transaction });
      await Member.destroy({ where: { exam_id: row.id }, transaction });
      if (committee.length) await Member.bulkCreate(committee.map(item => ({ ...item, exam_id: row.id })), { transaction, validate: true });
      const result = await examDTO(row, transaction);
      await History.create({ exam_id: row.id, version: row.version, actor, snapshot: { ...result, topic: project.topic } }, { transaction });
      return result;
    });
  }
  async function list(query) {
    r.object(query, ['search','page']);
    const search = r.text(query.search, 100), page = query.page === undefined ? 1 : Number(query.page);
    if (!Number.isInteger(page) || page < 1 || page > 10000) r.fail('หน้าข้อมูลไม่ถูกต้อง');
    const where = { track: 'co_op' };
    if (search) where[Op.or] = ['student_id','first_name','last_name'].map(key => ({ [key]: { [Op.iLike]: `%${search.replace(/[\\%_]/g, '\\$&')}%` } }));
    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, readOnly: true }, async transaction => {
      const rows = await Student.findAll({ where, attributes: studentFields, order: [['student_id','ASC']], offset: (page - 1) * 25, limit: 26, transaction });
      const data = [];
      for (const row of rows.slice(0,25)) data.push(await detail(row.id, false, transaction));
      return { data, page, has_next: rows.length > 25 };
    });
  }
  async function directory() { return { data: await Teacher.findAll({ where: { status: 'active' }, attributes: teacherFields, order: [['first_name','ASC'],['id','ASC']] }) }; }
  async function file(studentId) {
    await owner(studentId);
    const row = await Document.findOne({ where: { student_id: studentId } });
    if (!row?.storage_path) r.fail('ไม่พบไฟล์ CO-09', 404);
    return { buffer: await storage.read(studentId, row.storage_path), name: row.original_name };
  }
  return { detail, list, directory, saveDocument, review, saveSchedule, file };
}
module.exports = { createCoopTopicExamService };
