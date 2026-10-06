const { Op } = require("sequelize");
const SCORE_FIELDS = [1, 2, 3, 4, 5].map(n => `q${n}_score`);
const PLACEMENT_STATUSES = ["approved", "document_issued", "in_progress"];
const textValue = value => typeof value === "string" && value.trim() ? value.trim() : null;
const fullName = person => [textValue(person?.first_name), textValue(person?.last_name)].filter(Boolean).join(" ");
function dateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}
const COMMENT_LIMIT = 2000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };

function validateEvaluation(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => ![...SCORE_FIELDS, "comment"].includes(key))) {
    fail(400, "กรุณาส่งเฉพาะคะแนนทั้ง 5 ข้อและข้อเสนอแนะ");
  }
  if (SCORE_FIELDS.some(key => !Number.isInteger(body[key]) || body[key] < 1 || body[key] > 10)) fail(400, "กรุณาเลือกคะแนนจำนวนเต็ม 1–10 ให้ครบทั้ง 5 ข้อ");
  if (body.comment !== undefined && typeof body.comment !== "string") fail(400, "ข้อเสนอแนะต้องเป็นข้อความ");
  const comment = (body.comment || "").trim();
  if ([...comment].length > COMMENT_LIMIT || comment.includes("\0")) fail(400, "ข้อเสนอแนะต้องไม่เกิน 2,000 ตัวอักษรและไม่มีอักขระว่าง");
  return { ...Object.fromEntries(SCORE_FIELDS.map(key => [key, body[key]])), comment };
}

function createCompanyEvaluationService(m) {
  async function owner(studentId, transaction, lock = false) {
    if (!UUID.test(studentId || "")) fail(403, "Student authorization is required");
    const student = await m.Student.findByPk(studentId, {
      attributes: ["id", "student_id", "first_name", "last_name", "major", "track"], transaction,
      ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
    });
    if (!student) fail(404, "ไม่พบข้อมูลนักศึกษา");
    if (student.track !== "co_op") fail(403, "สำหรับนักศึกษาสหกิจศึกษาเท่านั้น");
    return student;
  }
  async function currentMentor(studentId, transaction, lock = false) {
    // Existing Mentor menu exposes the Student's current pending or verified row.
    return m.Mentor.findOne({ where: { student_id: studentId }, attributes: ["id", "first_name", "last_name", "position"], transaction,
      ...(lock ? { lock: transaction.LOCK.SHARE } : {}) });
  }
  async function currentPlacement(studentId, transaction) {
    // The workflow treats approved/document-issued/in-progress as active.
    // Without a canonical placement pointer, only one accepted request is safe.
    const requests = await m.CoopRequest.findAll({
      where: { student_id: studentId, status: { [Op.in]: PLACEMENT_STATUSES } },
      attributes: ["company_name", "work_start_date", "work_end_date"],
      include: [{ model: m.Company, as: "company", attributes: ["name"], required: false }],
      limit: 2, transaction,
    });
    return requests.length === 1 ? requests[0] : null;
  }
  function response(student, mentor, evaluation, placement) {
    const scores = evaluation ? Object.fromEntries(SCORE_FIELDS.map(key => [key, evaluation[key]])) : null;
    const total = scores ? Object.values(scores).reduce((sum, score) => sum + score, 0) : 0;
    return {
      student: { name: fullName(student) }, mentor: mentor ? { name: fullName(mentor) } : null,
      display: {
        student_id: textValue(student.student_id), major: textValue(student.major),
        // Preserve the accepted request's company snapshot, including manual companies.
        company_name: textValue(placement?.company_name) || textValue(placement?.company?.name),
        mentor_position: textValue(mentor?.position),
        work_start_date: dateOnly(placement?.work_start_date), work_end_date: dateOnly(placement?.work_end_date),
        evaluation_date: evaluation?.updatedAt instanceof Date && Number.isFinite(evaluation.updatedAt.getTime()) ? evaluation.updatedAt.toISOString() : null,
      },
      evaluation: evaluation ? { id: evaluation.id, ...scores, comment: evaluation.comment, total_score: total, average_score: total / 5 } : null,
    };
  }
  async function read(studentId) {
    return m.sequelize.transaction(async transaction => {
      await m.sequelize.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY", { transaction });
      const student = await owner(studentId, transaction);
      const mentor = await currentMentor(studentId, transaction);
      const evaluation = await m.CompanyEvaluation.findOne({ where: { student_id: student.id }, attributes: ["id", ...SCORE_FIELDS, "comment", "updatedAt"], transaction });
      const placement = await currentPlacement(student.id, transaction);
      return response(student, mentor, evaluation, placement);
    });
  }
  async function save(studentId, body) {
    const values = validateEvaluation(body);
    return m.sequelize.transaction(async transaction => {
      // Serializes first saves and edits; UNIQUE(student_id) also enforces this in SQL.
      const student = await owner(studentId, transaction, true);
      const mentor = await currentMentor(studentId, transaction, true);
      let evaluation = await m.CompanyEvaluation.findOne({ where: { student_id: student.id }, transaction, lock: transaction.LOCK.UPDATE });
      const fields = { ...values, mentor_id: mentor?.id || null };
      if (evaluation) await evaluation.update(fields, { transaction });
      else evaluation = await m.CompanyEvaluation.create({ ...fields, student_id: student.id }, { transaction });
      const placement = await currentPlacement(student.id, transaction);
      return response(student, mentor, evaluation, placement);
    });
  }
  return { read, save };
}
module.exports = { createCompanyEvaluationService, validateEvaluation };
