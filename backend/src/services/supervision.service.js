const crypto = require("node:crypto");
const { Op } = require("sequelize");
const R = require("./supervisionRules");
const hash = token => crypto.createHash("sha256").update(token).digest("hex");
const plain = row => row.toJSON();
const name = row => [row.first_name, row.last_name].join(" ");
const mentorData = row => ({ id: row.id, email: row.email, first_name: row.first_name, last_name: row.last_name, position: row.position, verified_at: row.verified_at ? new Date(row.verified_at).toISOString() : null, status: row.status });
function createSupervisionService(m, { now = () => new Date() } = {}) {
  const { sequelize, Student, Teacher, Mentor, CoopRequest, SupervisionAppointment: Appointment, SupervisionEvent: Event, SupervisionToken: Token } = m;
  async function ready() {
    const [[row]] = await sequelize.query("SELECT to_regclass('public.supervision_appointments') AS name");
    if (!row.name) R.fail(503, "SUPERVISION_SCHEMA_REQUIRED", "ระบบนัดนิเทศรอการติดตั้ง migration 019");
  }
  async function teacher(id, transaction) {
    const row = await Teacher.findOne({ where: { id, status: "active" }, transaction, ...(transaction && { lock: transaction.LOCK.SHARE }) });
    if (!row) R.fail(403, "TEACHER_INACTIVE", "บัญชีอาจารย์ไม่มีสิทธิ์ใช้งาน");
    return row;
  }
  async function owner(id, teacherId, transaction) {
    R.uuid(id);
    const row = await Student.findByPk(id, { transaction, ...(transaction && { lock: transaction.LOCK.UPDATE }) });
    if (!row || (teacherId && row.coop_advisor_teacher_id !== teacherId)) R.fail(404, "STUDENT_NOT_FOUND", "ไม่พบนักศึกษาในความดูแล");
    if (row.track !== "co_op") R.fail(403, "COOP_REQUIRED", "สำหรับนักศึกษาสหกิจศึกษา");
    return row;
  }
  async function context(student, transaction) {
    const mentor = await Mentor.findOne({ where: { student_id: student.id }, transaction, ...(transaction && { lock: transaction.LOCK.UPDATE }) });
    const requests = await CoopRequest.findAll({ where: { student_id: student.id, status: { [Op.in]: ["approved", "document_issued", "in_progress"] } }, transaction, ...(transaction && { lock: transaction.LOCK.UPDATE }) });
    return { mentor, requests };
  }
  async function listTeacher(id, query = {}) {
    await ready(); await teacher(id);
    R.body(query, ["offset", "limit"]);
    const offset = query.offset === undefined ? 0 : Number(query.offset), limit = query.limit === undefined ? 26 : Number(query.limit);
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 50) R.fail(400, "INVALID_PAGE", "หน้ารายการไม่ถูกต้อง");
    const rows = await Student.findAll({ where: { coop_advisor_teacher_id: id, track: "co_op" }, attributes: ["id", "student_id", "first_name", "last_name"], order: [["student_id", "ASC"], ["id", "ASC"]], offset, limit });
    return { students: rows.map(plain) };
  }
  async function detail(studentId, teacherId) {
    await ready();
    return sequelize.transaction(async transaction => {
      if (teacherId) await teacher(teacherId, transaction);
      const student = await owner(studentId, teacherId, transaction), ctx = await context(student, transaction);
      const appointments = await Appointment.findAll({ where: { student_id: studentId }, order: [["created_at", "ASC"], ["visit_number", "ASC"]], transaction });
      const events = appointments.length ? await Event.findAll({ where: { appointment_id: { [Op.in]: appointments.map(a => a.id) } }, order: [["created_at", "ASC"], ["version", "ASC"]], transaction }) : [];
      return { student: { id: student.id, name: name(student), code: student.student_id }, mentor: ctx.mentor ? mentorData(ctx.mentor) : null,
        requests: ctx.requests.map(row => ({ id: row.id, company_name: row.company_name, company_address: row.company_address, work_start_date: row.work_start_date, work_end_date: row.work_end_date })),
        appointments: appointments.map(plain), history: events.map(plain) };
    });
  }
  async function issue(row, transaction) {
    await Token.update({ revoked_at: now() }, { where: { appointment_id: row.id, revoked_at: null, consumed_at: null }, transaction });
    const token = crypto.randomBytes(32).toString("hex");
    await Token.create({ appointment_id: row.id, version: row.version, token_hash: hash(token), expires_at: new Date(Math.min(now().getTime() + 7 * 86400000, new Date(row.scheduled_at).getTime())) }, { transaction });
    return { to: row.snapshot.attending_mentor.email, token };
  }
  async function event(row, action, actorName, teacherId, reason, transaction) {
    await Event.create({ appointment_id: row.id, version: row.version, action, actor_name: actorName, teacher_id: teacherId || null, reason, snapshot: plain(row) }, { transaction });
  }
  async function save(teacherId, studentId, visit, input, update) {
    await ready();
    if (![1, 2].includes(visit)) R.fail(400, "INVALID_VISIT", "ครั้งนิเทศต้องเป็น 1 หรือ 2");
    const clean = R.schedule(input, now());
    if (update ? !Number.isInteger(input.version) || input.version < 1 : input.version !== undefined || input.reason !== undefined) R.fail(400, "INVALID_VERSION", "เวอร์ชันไม่ถูกต้อง");
    const reason = update ? R.text(input.reason, true) : "";
    return sequelize.transaction(async transaction => {
      const actor = await teacher(teacherId, transaction), student = await owner(studentId, teacherId, transaction), ctx = await context(student, transaction);
      if (ctx.requests.length !== 1 || !ctx.requests[0].work_start_date || !ctx.requests[0].work_end_date || !ctx.requests[0].company_name?.trim()) R.fail(409, "PLACEMENT_REQUIRED", "ต้องมีคำร้องที่อนุมัติ พร้อมบริษัทและช่วงฝึกงานชัดเจนเพียงรายการเดียว");
      const request = ctx.requests[0], mentor = ctx.mentor;
      if (!mentor || mentor.status !== "verified" || !mentor.verified_at) R.fail(409, "VERIFIED_MENTOR_REQUIRED", "พี่เลี้ยงต้องยืนยันข้อมูลก่อนนัดนิเทศ");
      if (new Date(mentor.verified_at).getTime() !== Date.parse(input.mentor_verified_at)) R.fail(409, "MENTOR_CHANGED", "ข้อมูลพี่เลี้ยงเปลี่ยนแล้ว กรุณาตรวจสอบใหม่");
      if (input.date < request.work_start_date || input.date > request.work_end_date) R.fail(400, "OUTSIDE_INTERNSHIP", "วันนิเทศอยู่นอกช่วงฝึกงาน");
      if (clean.substitute?.email === mentor.email) R.fail(400, "INVALID_SUBSTITUTE", "พี่เลี้ยงแทนต้องเป็นคนละอีเมลกับพี่เลี้ยงเดิม");
      let row = await Appointment.findOne({ where: { request_id: request.id, visit_number: visit }, transaction, lock: transaction.LOCK.UPDATE });
      if (!update && row) R.fail(409, "DUPLICATE_APPOINTMENT", "มีนัดหมายสำหรับครั้งนี้แล้ว");
      if (update && !row) R.fail(404, "APPOINTMENT_NOT_FOUND", "ไม่พบนัดหมาย");
      if (row && (row.version !== input.version || row.teacher_id !== teacherId || row.mentor_id !== mentor.id)) R.fail(409, "STALE_APPOINTMENT", "ข้อมูลหรือผู้ดูแลเปลี่ยนแล้ว กรุณาโหลดใหม่");
      if (row && new Date(row.scheduled_at) <= now()) R.fail(409, "APPOINTMENT_PASSED", "นัดที่ถึงเวลาแล้วแก้ไขไม่ได้");
      if (row) {
        const [[schema]] = await sequelize.query("SELECT to_regclass('public.supervision_results') AS name", { transaction });
        if (schema.name && await m.SupervisionResult.count({ where: { appointment_id: row.id }, transaction })) R.fail(409, "APPOINTMENT_HAS_RESULT", "นัดมีบันทึกผลนิเทศแล้ว เลื่อนหรือแก้ไขนัดไม่ได้");
      }
      const snapshot = { student: { id: student.id, name: name(student), code: student.student_id }, company: { id: request.company_id, name: request.company_name, address: request.company_address }, teacher: { id: actor.id, name: name(actor) }, original_mentor: mentorData(mentor), attending_mentor: clean.substitute || mentorData(mentor), is_substitute: !!clean.substitute };
      const data = { student_id: student.id, request_id: request.id, teacher_id: actor.id, mentor_id: mentor.id, visit_number: visit, scheduled_at: clean.scheduled_at, notes: clean.notes, snapshot, status: "pending_confirmation", version: row ? row.version + 1 : 1, confirmed_at: null };
      row = row ? await row.update(data, { transaction }) : await Appointment.create(data, { transaction });
      await event(row, update ? "rescheduled" : "scheduled", name(actor), actor.id, reason, transaction);
      return { appointment: plain(row), delivery: await issue(row, transaction) };
    });
  }
  async function live(row, student, mentor, requests) {
    if (row.teacher_id !== student.coop_advisor_teacher_id || !mentor || row.mentor_id !== mentor.id || Object.entries(mentorData(mentor)).some(([key, value]) => row.snapshot.original_mentor[key] !== value) || !requests.some(r => r.id === row.request_id)) R.fail(403, "APPOINTMENT_SCOPE_CHANGED", "ผู้ดูแล ข้อมูลพี่เลี้ยง หรือคำร้องเปลี่ยนแล้ว กรุณาติดต่ออาจารย์");
    if (new Date(row.scheduled_at) <= now()) R.fail(410, "APPOINTMENT_PASSED", "นัดหมายถึงเวลาแล้ว ไม่สามารถยืนยันผ่านลิงก์ได้");
  }
  async function resend(teacherId, studentId, id, input) {
    await ready(); R.uuid(id); R.body(input, ["version"]);
    if (!Number.isInteger(input.version)) R.fail(400, "INVALID_VERSION", "เวอร์ชันไม่ถูกต้อง");
    return sequelize.transaction(async transaction => {
      await teacher(teacherId, transaction); const student = await owner(studentId, teacherId, transaction), ctx = await context(student, transaction);
      const row = await Appointment.findOne({ where: { id, student_id: studentId, teacher_id: teacherId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!row) R.fail(404, "APPOINTMENT_NOT_FOUND", "ไม่พบนัดหมาย");
      if (row.status !== "pending_confirmation" || row.version !== input.version) R.fail(409, "STALE_APPOINTMENT", "ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่");
      await live(row, student, ctx.mentor, ctx.requests); return issue(row, transaction);
    });
  }
  async function scope(token, input) {
    await ready();
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) R.fail(401, "INVALID_APPOINTMENT_TOKEN", "ลิงก์นัดหมายไม่ถูกต้อง");
    const candidate = await Token.findOne({ where: { token_hash: hash(token) }, include: [{ model: Appointment }] });
    if (!candidate) R.fail(401, "INVALID_APPOINTMENT_TOKEN", "ลิงก์นัดหมายไม่ถูกต้อง");
    return sequelize.transaction(async transaction => {
      const preliminary = candidate.SupervisionAppointment;
      await teacher(preliminary.teacher_id, transaction);
      const student = await owner(preliminary.student_id, preliminary.teacher_id, transaction), ctx = await context(student, transaction);
      const row = await Appointment.findByPk(preliminary.id, { transaction, lock: transaction.LOCK.UPDATE });
      const access = await Token.findByPk(candidate.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!access || access.revoked_at || access.consumed_at || new Date(access.expires_at) <= now() || access.version !== row.version || row.status !== "pending_confirmation") R.fail(410, "APPOINTMENT_TOKEN_EXPIRED", "ลิงก์หมดอายุ ถูกใช้ หรือถูกแทนที่ กรุณาขอลิงก์ล่าสุด");
      await live(row, student, ctx.mentor, ctx.requests);
      if (input !== undefined) {
        R.body(input, ["version", "confirm_identity"]);
        if (input.confirm_identity !== true) R.fail(400, "IDENTITY_CONFIRMATION_REQUIRED", "กรุณาตรวจสอบและยืนยันข้อมูลส่วนบุคคลของคุณ");
        if (input.version !== row.version) R.fail(409, "STALE_APPOINTMENT", "ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่");
        await row.update({ status: "confirmed", confirmed_at: now(), version: row.version + 1 }, { transaction });
        await access.update({ consumed_at: now() }, { transaction });
        await event(row, "confirmed", name(row.snapshot.attending_mentor), null, "ยืนยันข้อมูลส่วนบุคคลและนัดหมาย", transaction);
      }
      return { appointment: plain(row) };
    });
  }
  return { listTeacher, detail, save, resend, scope };
}
module.exports = { createSupervisionService };
