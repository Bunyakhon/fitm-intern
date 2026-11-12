const { Op } = require("sequelize");
const { WorkflowError, uuid, object, decisionPayload } = require("../validators/roleWorkflow.validator");
const { assertAccountAccess } = require("./adminAccountAccess.service");
const { teacherPage } = require('./teacherSearch.service');
const TEACHER_FIELDS = ["id", "academic_title", "first_name", "last_name"];
const safeTeacher = teacher => teacher ? { id: teacher.id, name: `${teacher.academic_title || ""}${teacher.first_name} ${teacher.last_name}`.trim() } : null;
const advisorError = (message, status, code) => Object.assign(new WorkflowError(message, status), { code });

function createCoopProjectAdvisorService(m) {
  const R = m.CoopProjectAdvisorRequest;
  async function student(id, transaction, lock = true) {
    uuid(id);
    const owner = await m.Student.findByPk(id, { attributes: ["id", "track", "coop_advisor_teacher_id"], transaction, ...(transaction && lock ? { lock: transaction.LOCK.UPDATE } : {}) });
    if (!owner) throw new WorkflowError("Student was not found", 404);
    if (owner.track !== "co_op") throw new WorkflowError("Co-op student authorization is required", 403);
    return owner;
  }
  async function teacher(id, transaction) {
    uuid(id);
    const actor = await m.Teacher.findOne({ where: { id, status: "active" }, attributes: ["id"], transaction, ...(transaction ? { lock: transaction.LOCK.SHARE } : {}) });
    if (!actor) throw new WorkflowError("Active Teacher authorization is required", 403);
    return actor;
  }
  async function teacherAccess(id, transaction) {
    try { await assertAccountAccess(m, "teacher", id, { transaction }); return true; }
    catch (error) { if (error.code === "ACCOUNT_UNAUTHORIZED") return false; throw error; }
  }
  async function directory(studentId) {
    await student(studentId);
    const teachers = await m.Teacher.findAll({ where: { status: "active" }, attributes: TEACHER_FIELDS, order: [["first_name", "ASC"], ["last_name", "ASC"], ["id", "ASC"]] });
    const accessible = await Promise.all(teachers.map(actor => teacherAccess(actor.id)));
    return { success: true, teachers: teachers.filter((actor, index) => accessible[index]) };
  }
  async function read(studentId, transaction) {
    if (!transaction) return m.sequelize.transaction(async transaction => {
      // One snapshot avoids mixing a pre-accept request with a post-accept advisor.
      await m.sequelize.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY", { transaction });
      return read(studentId, transaction);
    });
    const owner = await student(studentId, transaction, false);
    const request = await R.findOne({ where: { student_id: studentId, status: { [Op.ne]: "superseded" } }, include: [{ model: m.Teacher, as: "requestedTeacher", attributes: TEACHER_FIELDS }], transaction });
    const confirmed = owner.coop_advisor_teacher_id ? await m.Teacher.findByPk(owner.coop_advisor_teacher_id, { attributes: TEACHER_FIELDS, transaction }) : null;
    return { advisor_request: request ? { id: request.id, status: request.status, teacher: safeTeacher(request.requestedTeacher), requested_at: request.requested_at, confirmed_at: request.confirmed_at, rejected_at: request.rejected_at, rejection_reason: request.rejection_reason } : { id: null, status: confirmed ? "confirmed" : "none", teacher: null }, confirmed_advisor: safeTeacher(confirmed) };
  }
  async function select(studentId, body) {
    object(body, ["teacher_id"]); const teacherId = uuid(body.teacher_id, "teacher_id");
    let readyToCommit = false;
    try {
      return await m.sequelize.transaction(async transaction => {
        const owner = await student(studentId, transaction);
        const current = await R.findOne({ where: { student_id: studentId, status: { [Op.ne]: "superseded" } }, transaction, lock: transaction.LOCK.UPDATE });
        if (owner.coop_advisor_teacher_id || current?.status === "confirmed") throw advisorError("ไม่สามารถเปลี่ยนอาจารย์ที่ยืนยันแล้วได้", 409, "ADVISOR_CONFIRMED");
        await teacher(teacherId, transaction);
        if (!await teacherAccess(teacherId, transaction)) throw advisorError("อาจารย์ที่เลือกไม่พร้อมรับคำขอ กรุณาโหลดรายชื่อใหม่", 403, "ADVISOR_TARGET_UNAVAILABLE");
        if (!(current?.status === "pending" && current.requested_advisor_teacher_id === teacherId)) {
          if (current) await current.update({ status: "superseded", superseded_at: new Date() }, { transaction });
          await R.create({ student_id: studentId, requested_advisor_teacher_id: teacherId, status: "pending", requested_at: new Date() }, { transaction });
        }
        const result = await read(studentId, transaction);
        readyToCommit = true;
        return result;
      });
    } catch (error) {
      if (readyToCommit) throw advisorError("ยังยืนยันผลส่งคำขอไม่ได้ กรุณาโหลดสถานะล่าสุดก่อนลองใหม่", 503, "ADVISOR_COMMIT_UNCERTAIN");
      throw error;
    }
  }
  async function list(teacherId, query = {}) {
    await teacher(teacherId);
    const status = query?.status ?? "all";
    if (!["all", "pending", "confirmed", "rejected"].includes(status)) throw new WorkflowError("Invalid current advisor request status");
    const result = await teacherPage(m, 'advisor', teacherId, { ...query, status }, (ids, transaction) => hydrate(teacherId, ids, transaction));
    return query.metadata === '1' ? result : result.rows;
  }
  async function hydrate(teacherId, ids, transaction) {
      const requests = await R.findAll({ where: { id: { [Op.in]: ids }, requested_advisor_teacher_id: teacherId }, include: [{ model: m.Student, as: "student", attributes: ["id", "student_id", "first_name", "last_name", "major"] }, { model: m.CoopAcademicPeriod, as: 'academicPeriod' }], order: [["requested_at", "ASC"], ["id", "ASC"]], transaction });
      const projects = await m.CoopProject.findAll({ where: { student_id: { [Op.in]: requests.map(r => r.student_id) } }, attributes: ["student_id", "topic"], transaction });
      return requests.map(r => ({ id: r.id, status: r.status, requested_at: r.requested_at, confirmed_at: r.confirmed_at, rejected_at: r.rejected_at, superseded_at: r.superseded_at, rejection_reason: r.rejection_reason, student: r.student.toJSON(), topic: projects.find(p => p.student_id === r.student_id)?.topic || "", academicPeriod: r.academicPeriod?.toJSON() || null }));
  }
  async function detail(teacherId, requestId) {
    uuid(requestId); await teacher(teacherId);
    const [row] = await hydrate(teacherId, [requestId]);
    if (!row) throw new WorkflowError('Advisor request was not found', 404);
    return row;
  }
  async function decide(teacherId, requestId, decision, body) {
    uuid(teacherId); uuid(requestId); if (!["accept", "reject"].includes(decision)) throw new WorkflowError("Unsupported decision");
    const reason = decisionPayload(body || {}, decision === "reject" ? "reject" : "approve");
    // Discovery only. Re-read authorization/state after locking the Student first,
    // matching selection/topic's lock order. A new request has a new immutable ID.
    const found = await R.findByPk(requestId, { attributes: ["student_id", "requested_advisor_teacher_id"] });
    if (!found || found.requested_advisor_teacher_id !== teacherId) throw new WorkflowError("Advisor request was not found", 404);
    return m.sequelize.transaction(async transaction => {
      const owner = await student(found.student_id, transaction);
      const request = await R.findByPk(requestId, { transaction, lock: transaction.LOCK.UPDATE });
      await teacher(teacherId, transaction);
      if (!request || request.requested_advisor_teacher_id !== teacherId) throw new WorkflowError("Advisor request was not found", 404);
      if (request.status !== "pending" || owner.coop_advisor_teacher_id) throw new WorkflowError("Advisor request is no longer pending", 409);
      const now = new Date();
      await request.update(decision === "accept" ? { status: "confirmed", confirmed_at: now } : { status: "rejected", rejected_at: now, rejection_reason: reason }, { transaction });
      // Static Student.update validates a newly built instance and runs the
      // new-account password hook. Save only the advisor on the locked owner.
      if (decision === "accept") await owner.update({ coop_advisor_teacher_id: teacherId }, { fields: ["coop_advisor_teacher_id"], returning: false, transaction });
      return { id: request.id, status: request.status };
    });
  }
  return { read, select, directory, list, detail, decide };
}
module.exports = { createCoopProjectAdvisorService };
