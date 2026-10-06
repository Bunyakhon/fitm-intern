const { Op } = require("sequelize");
const { WorkflowError, uuid, object, decisionPayload, page } = require("../validators/roleWorkflow.validator");
const TEACHER_FIELDS = ["id", "academic_title", "first_name", "last_name"];
const safeTeacher = teacher => teacher ? { id: teacher.id, name: `${teacher.academic_title || ""}${teacher.first_name} ${teacher.last_name}`.trim() } : null;

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
  async function read(studentId) {
    return m.sequelize.transaction(async transaction => {
      // One snapshot avoids mixing a pre-accept request with a post-accept advisor.
      await m.sequelize.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY", { transaction });
      const owner = await student(studentId, transaction, false);
      const request = await R.findOne({ where: { student_id: studentId, status: { [Op.ne]: "superseded" } }, include: [{ model: m.Teacher, as: "requestedTeacher", attributes: TEACHER_FIELDS }], transaction });
      const confirmed = owner.coop_advisor_teacher_id ? await m.Teacher.findByPk(owner.coop_advisor_teacher_id, { attributes: TEACHER_FIELDS, transaction }) : null;
      return { advisor_request: request ? { id: request.id, status: request.status, teacher: safeTeacher(request.requestedTeacher), requested_at: request.requested_at, confirmed_at: request.confirmed_at, rejected_at: request.rejected_at, rejection_reason: request.rejection_reason } : { id: null, status: confirmed ? "confirmed" : "none", teacher: null }, confirmed_advisor: safeTeacher(confirmed) };
    });
  }
  async function select(studentId, body) {
    object(body, ["teacher_id"]); const teacherId = uuid(body.teacher_id, "teacher_id");
    await m.sequelize.transaction(async transaction => {
      const owner = await student(studentId, transaction);
      const current = await R.findOne({ where: { student_id: studentId, status: { [Op.ne]: "superseded" } }, transaction, lock: transaction.LOCK.UPDATE });
      if (owner.coop_advisor_teacher_id || current?.status === "confirmed") throw new WorkflowError("A confirmed project advisor cannot be replaced", 409);
      await teacher(teacherId, transaction);
      if (current?.status === "pending" && current.requested_advisor_teacher_id === teacherId) return;
      if (current) await current.update({ status: "superseded", superseded_at: new Date() }, { transaction });
      await R.create({ student_id: studentId, requested_advisor_teacher_id: teacherId, status: "pending", requested_at: new Date() }, { transaction });
    });
    return read(studentId);
  }
  async function list(teacherId, query) {
    await teacher(teacherId); const pagination = page(query);
    const requests = await R.findAll({ where: { requested_advisor_teacher_id: teacherId, status: "pending" }, include: [{ model: m.Student, as: "student", attributes: ["id", "student_id", "first_name", "last_name"] }], order: [["requested_at", "ASC"], ["id", "ASC"]], ...pagination });
    const projects = requests.length ? await m.CoopProject.findAll({ where: { student_id: { [Op.in]: requests.map(r => r.student_id) } }, attributes: ["student_id", "topic"] }) : [];
    return requests.map(r => ({ id: r.id, requested_at: r.requested_at, student: r.student.toJSON(), topic: projects.find(p => p.student_id === r.student_id)?.topic || "" }));
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
      if (decision === "accept") await m.Student.update({ coop_advisor_teacher_id: teacherId }, { where: { id: owner.id }, transaction });
      return { id: request.id, status: request.status };
    });
  }
  return { read, select, list, decide };
}
module.exports = { createCoopProjectAdvisorService };
