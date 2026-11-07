const { Op } = require('sequelize');
const { WorkflowError, uuid } = require('../validators/roleWorkflow.validator');
const { normalizeAcademicUpdate, academicSummary, updateWindow } = require('./coopAcademic.rules');
const TABLES = ['coop_request_academic_states', 'coop_request_academic_history'];
const plain = row => row?.toJSON ? row.toJSON() : row;
const conflict = (message, code = 'COOP_ACADEMIC_CHANGED') => { throw Object.assign(new WorkflowError(message, 409), { code }); };
function createAcademicService(m) {
  async function ready(transaction) {
    if (!m.CoopRequestAcademicState || !m.CoopRequestAcademicHistory) return false;
    const [[r]] = await m.sequelize.query('SELECT to_regclass(:s) IS NOT NULL AS state, to_regclass(:h) IS NOT NULL AS history', {
      replacements: { s: 'public.' + TABLES[0], h: 'public.' + TABLES[1] }, transaction });
    return Boolean(r.state && r.history);
  }
  async function attach(requests, { history = false, transaction } = {}) {
    if (!requests.length) return [];
    if (!transaction && m.CoopRequestAcademicState && m.CoopRequestAcademicHistory) return m.sequelize.transaction({ isolationLevel: 'REPEATABLE READ', readOnly: true }, t => attach(requests, { history, transaction: t }));
    const data = requests.map(plain), available = await ready(transaction), ids = data.map(r => r.id);
    let states = [], events = [];
    if (available) {
      states = await m.CoopRequestAcademicState.findAll({ where: { coop_request_id: { [Op.in]: ids } }, transaction });
      events = await m.CoopRequestAcademicHistory.findAll({ where: { coop_request_id: { [Op.in]: ids } }, order: [['revision', 'ASC']], transaction });
    }
    return data.map(request => ({ ...request, academic: academicSummary(request, request.prerequisite_courses || [], events.filter(e => e.coop_request_id === request.id).map(plain), {
      available, revision: states.find(s => s.coop_request_id === request.id)?.revision ?? 0, history }) }));
  }
  async function owned(studentId, requestId, transaction, lock) {
    uuid(studentId); uuid(requestId);
    const request = await m.CoopRequest.findOne({ where: { id: requestId, student_id: studentId }, transaction, ...(lock ? { lock } : {}) });
    if (!request) throw new WorkflowError('ไม่พบคำร้องของคุณ', 404);
    return request;
  }
  async function read(studentId, requestId, transaction) {
    if (!transaction) return m.sequelize.transaction({ isolationLevel: 'REPEATABLE READ', readOnly: true }, t => read(studentId, requestId, t));
    const request = plain(await owned(studentId, requestId, transaction));
    request.prerequisite_courses = await m.CoopRequestPrerequisiteCourse.findAll({ where: { coop_request_id: requestId }, order: [['course_code', 'ASC']], transaction }).then(rows => rows.map(plain));
    return (await attach([request], { history: true, transaction }))[0].academic;
  }
  async function update(studentId, requestId, code, input) {
    uuid(studentId); uuid(requestId);
    if (typeof code !== 'string' || !/^[0-9]{9}$/.test(code)) throw new WorkflowError('รหัสรายวิชาไม่ถูกต้อง');
    const body = normalizeAcademicUpdate(input);
    return m.sequelize.transaction(async transaction => {
      // Match review/submission lock order: Student -> Request. No request status writes.
      const student = await m.Student.findByPk(studentId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!student || student.track !== 'co_op') throw new WorkflowError('Student authorization is required', 403);
      const request = await owned(studentId, requestId, transaction, transaction.LOCK.UPDATE);
      if (!await ready(transaction)) conflict('ยังไม่เปิดให้อัปเดตผลการเรียน กรุณาติดต่อเจ้าหน้าที่', 'COOP_ACADEMIC_SCHEMA_REQUIRED');
      const duplicate = await m.CoopRequestAcademicHistory.findOne({ where: { coop_request_id: requestId, operation_id: body.operation_id }, transaction });
      if (duplicate) {
        if (duplicate.course_code !== code || duplicate.new_status !== body.status || duplicate.new_grade !== body.grade
          || duplicate.revision !== body.expected_revision + 1 || duplicate.request_status_at_change !== body.expected_request_status || duplicate.actor_student_id !== studentId) conflict('รหัสการบันทึกนี้ถูกใช้กับข้อมูลอื่นแล้ว');
        return { academic: await read(studentId, requestId, transaction), replayed: true };
      }
      if (!updateWindow(request) || request.status !== body.expected_request_status) conflict('คำร้องเปลี่ยนสถานะหรือพ้นช่วงอัปเดต กรุณาโหลดข้อมูลล่าสุด');
      const state = await m.CoopRequestAcademicState.findByPk(requestId, { transaction, lock: transaction.LOCK.UPDATE });
      if ((state?.revision ?? 0) !== body.expected_revision) conflict('ผลการเรียนเปลี่ยนแปลงแล้ว กรุณาโหลดข้อมูลล่าสุด');
      const original = await m.CoopRequestPrerequisiteCourse.findOne({ where: { coop_request_id: requestId, course_code: code }, transaction });
      if (!original) throw new WorkflowError('รายวิชาไม่ได้อยู่ในคำร้องนี้', 404);
      const previous = await m.CoopRequestAcademicHistory.findOne({ where: { coop_request_id: requestId, course_code: code }, transaction, order: [['revision', 'DESC']] });
      if (original.status !== 'studying' || original.grade != null || previous) conflict('เปิดให้อัปเดตเฉพาะรายวิชาที่กำลังศึกษาและยังไม่ได้บันทึกผลการเรียน');
      const revision = body.expected_revision + 1;
      if (state) await state.update({ revision }, { transaction });
      else await m.CoopRequestAcademicState.create({ coop_request_id: requestId, revision }, { transaction });
      await m.CoopRequestAcademicHistory.create({ coop_request_id: requestId, prerequisite_course_id: original.id, course_code: code,
        actor_student_id: studentId, operation_id: body.operation_id, revision, old_status: original.status, old_grade: original.grade,
        new_status: body.status, new_grade: body.grade, request_status_at_change: request.status }, { transaction });
      return { academic: await read(studentId, requestId, transaction), replayed: false };
    });
  }
  return { ready, attach, read, update };
}
module.exports = { createAcademicService, TABLES };
