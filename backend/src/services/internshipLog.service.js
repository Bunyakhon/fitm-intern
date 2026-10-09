const crypto = require("crypto");
const { Op } = require("sequelize");
const R = require("./internshipLogRules");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const plain = row => row?.toJSON() || null;
function createInternshipLogService(m, { now = () => new Date() } = {}) {
  const { sequelize, Student, Mentor, CoopRequest, InternshipDailyLog: Daily, InternshipWeek: Week, InternshipWeekEvent: Event, InternshipReviewToken: Token } = m;
  async function ready() {
    const [rows] = await sequelize.query("SELECT to_regclass('public.internship_daily_logs') AS table_name");
    if (!rows[0].table_name) R.fail(503, "INTERNSHIP_SCHEMA_REQUIRED", "ระบบบันทึกรอการติดตั้ง migration 018");
  }
  async function student(id, transaction) {
    const row = await Student.findByPk(id, { transaction, ...(transaction && { lock: transaction.LOCK.UPDATE }) });
    if (!row) R.fail(404, "STUDENT_NOT_FOUND", "ไม่พบนักศึกษา");
    if (row.track !== "co_op") R.fail(403, "COOP_REQUIRED", "สำหรับนักศึกษาสหกิจศึกษา");
    return row;
  }
  async function period(id, transaction) {
    const rows = await CoopRequest.findAll({ where: { student_id: id, status: { [Op.in]: ["approved", "document_issued", "in_progress"] } }, transaction });
    if (rows.length !== 1 || !rows[0].work_start_date || !rows[0].work_end_date) R.fail(409, "INTERNSHIP_PERIOD_REQUIRED", "ต้องมีคำร้องที่อนุมัติและช่วงฝึกงานที่ชัดเจนเพียงรายการเดียว");
    const start = R.date(rows[0].work_start_date), end = R.date(rows[0].work_end_date);
    if (end < start) R.fail(409, "INTERNSHIP_PERIOD_REQUIRED", "ช่วงฝึกงานไม่ถูกต้อง");
    return { start, end };
  }
  async function verifiedMentor(id, transaction) {
    const row = await Mentor.findOne({ where: { student_id: id }, transaction, ...(transaction && { lock: transaction.LOCK.UPDATE }) });
    if (!row || row.status !== "verified" || !row.verified_at) R.fail(409, "VERIFIED_MENTOR_REQUIRED", "พี่เลี้ยงต้องยืนยันข้อมูลก่อนส่งบันทึก");
    return row;
  }
  async function overview(id, value) {
    await ready(); const owner = await student(id); const p = await period(id); const w = R.week(value || R.today(now()));
    const required_dates = R.dates(w.start > p.start ? w.start : p.start, w.end < p.end ? w.end : p.end);
    const logs = await Daily.findAll({ where: { student_id: id, log_date: { [Op.between]: [w.start, w.end] } }, order: [["log_date", "ASC"]] });
    const submission = await Week.findOne({ where: { student_id: id, week_start: w.start } });
    const history = submission ? await Event.findAll({ where: { week_id: submission.id }, order: [["version", "ASC"]] }) : [];
    return { student: { name: `${owner.first_name} ${owner.last_name}`, code: owner.student_id }, today: R.today(now()), period: p, week: w, required_dates, missing_dates: required_dates.filter(d => !logs.some(l => l.log_date === d)), logs: logs.map(plain), submission: plain(submission), history: history.map(plain), total_logs: await Daily.count({ where: { student_id: id } }) };
  }
  async function read(id, value) { await ready(); await student(id); R.date(value); return { log: plain(await Daily.findOne({ where: { student_id: id, log_date: value } })) }; }
  async function save(id, value, input, create) {
    await ready(); R.date(value); const clean = R.entry(input);
    if (value > R.today(now())) R.fail(400, "FUTURE_DATE", "ยังบันทึกวันที่ในอนาคตไม่ได้");
    if ((!create && (!Number.isInteger(input.version) || input.version < 1)) || (create && input.version !== undefined)) R.fail(400, "INVALID_VERSION", "เวอร์ชันไม่ถูกต้อง");
    return sequelize.transaction(async transaction => {
      await student(id, transaction); const p = await period(id, transaction);
      if (value < p.start || value > p.end) R.fail(400, "OUTSIDE_INTERNSHIP", "วันที่อยู่นอกช่วงฝึกงาน");
      const w = await Week.findOne({ where: { student_id: id, week_start: R.week(value).start }, transaction });
      if (w && w.status !== "revision_requested") R.fail(409, "LOG_FROZEN", "บันทึกที่ส่งหรือตรวจแล้วแก้ไขไม่ได้");
      const row = await Daily.findOne({ where: { student_id: id, log_date: value }, transaction });
      if (create && row) R.fail(409, "DUPLICATE_LOG", "มีบันทึกสำหรับวันนี้แล้ว");
      if (!create && !row) R.fail(404, "LOG_NOT_FOUND", "ไม่พบบันทึก");
      if (row && row.version !== input.version) R.fail(409, "STALE_VERSION", "ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่");
      const result = row ? await row.update({ ...clean, version: row.version + 1 }, { transaction }) : await Daily.create({ ...clean, student_id: id, log_date: value, version: 1 }, { transaction });
      return { log: plain(result) };
    });
  }
  async function issueToken(mentor, transaction) {
    const time = now();
    await Token.update({ revoked_at: time }, { where: { mentor_id: mentor.id, revoked_at: null }, transaction });
    const token = crypto.randomBytes(32).toString("hex");
    await Token.create({ student_id: mentor.student_id, mentor_id: mentor.id, token_hash: hash(token), verified_at: mentor.verified_at, expires_at: new Date(time.getTime() + 7 * 86400000) }, { transaction });
    return { token, to: mentor.email };
  }
  async function submit(id, value, input) {
    await ready(); R.body(input, ["version"]); const w = R.week(value);
    if (value !== w.start) R.fail(400, "INVALID_WEEK", "ระบุวันจันทร์ของสัปดาห์");
    return sequelize.transaction(async transaction => {
      const owner = await student(id, transaction); const mentor = await verifiedMentor(id, transaction); const p = await period(id, transaction);
      const required = R.dates(w.start > p.start ? w.start : p.start, w.end < p.end ? w.end : p.end);
      if (!required.length) R.fail(400, "OUTSIDE_INTERNSHIP", "สัปดาห์อยู่นอกช่วงฝึกงาน");
      if (required.at(-1) > R.today(now())) R.fail(409, "WEEK_INCOMPLETE", "ยังไม่ครบวันของสัปดาห์");
      let row = await Week.findOne({ where: { student_id: id, week_start: w.start }, transaction, lock: transaction.LOCK.UPDATE });
      if (row && row.status !== "revision_requested") R.fail(409, "ALREADY_SUBMITTED", "ส่งสัปดาห์นี้แล้ว");
      if ((row && input.version !== row.version) || (!row && input.version !== 0)) R.fail(409, "STALE_VERSION", "ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่");
      const logs = await Daily.findAll({ where: { student_id: id, log_date: { [Op.in]: required } }, order: [["log_date", "ASC"]], transaction });
      const missing_dates = required.filter(d => !logs.some(l => l.log_date === d));
      if (missing_dates.length) R.fail(400, "MISSING_DAYS", "กรุณาบันทึกวันที่ยังขาดให้ครบ", { missing_dates });
      const snapshot = { student: { name: `${owner.first_name} ${owner.last_name}`, code: owner.student_id }, period: p, required_dates: required, logs: logs.map(plain) };
      const data = { student_id: id, mentor_id: mentor.id, week_start: w.start, week_end: w.end, status: "submitted", version: row ? row.version + 1 : 1, snapshot, submitted_at: now() };
      row = row ? await row.update(data, { transaction }) : await Week.create(data, { transaction });
      await Event.create({ week_id: row.id, version: row.version, action: "submitted", snapshot }, { transaction });
      const delivery = await issueToken(mentor, transaction);
      return { submission: plain(row), delivery };
    });
  }
  async function resend(id) { await ready(); return sequelize.transaction(async transaction => { await student(id, transaction); const mentor = await verifiedMentor(id, transaction); return issueToken(mentor, transaction); }); }
  async function scope(token, fn) {
    await ready();
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) R.fail(401, "INVALID_REVIEW_TOKEN", "ลิงก์ตรวจบันทึกไม่ถูกต้อง");
    const candidate = await Token.findOne({ where: { token_hash: hash(token) } });
    if (!candidate) R.fail(401, "INVALID_REVIEW_TOKEN", "ลิงก์ตรวจบันทึกไม่ถูกต้อง");
    return sequelize.transaction(async transaction => {
      const owner = await student(candidate.student_id, transaction);
      const mentor = await Mentor.findByPk(candidate.mentor_id, { transaction, lock: transaction.LOCK.UPDATE });
      const access = await Token.findByPk(candidate.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!access || access.revoked_at || new Date(access.expires_at) <= now()) R.fail(410, "REVIEW_TOKEN_EXPIRED", "ลิงก์หมดอายุหรือถูกยกเลิก กรุณาขอลิงก์ใหม่");
      if (!mentor || mentor.student_id !== owner.id || mentor.status !== "verified" || !mentor.verified_at || new Date(mentor.verified_at).getTime() !== new Date(access.verified_at).getTime()) R.fail(403, "MENTOR_SCOPE_REVOKED", "สิทธิ์พี่เลี้ยงเปลี่ยนแปลง กรุณายืนยันข้อมูลใหม่");
      return fn({ transaction, owner, mentor });
    });
  }
  async function ownedWeek(owner, mentor, id, transaction) {
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id)) R.fail(404, "WEEK_NOT_FOUND", "ไม่พบสัปดาห์");
    const row = await Week.findOne({ where: { id, student_id: owner.id, mentor_id: mentor.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!row) R.fail(404, "WEEK_NOT_FOUND", "ไม่พบสัปดาห์"); return row;
  }
  const list = token => scope(token, async ({ owner, mentor, transaction }) => ({ student: { name: `${owner.first_name} ${owner.last_name}`, code: owner.student_id }, mentor: { name: `${mentor.first_name} ${mentor.last_name}` }, weeks: (await Week.findAll({ where: { student_id: owner.id, mentor_id: mentor.id }, order: [["week_start", "DESC"]], transaction })).map(plain) }));
  const detail = (token, id) => scope(token, async ({ owner, mentor, transaction }) => { const row = await ownedWeek(owner, mentor, id, transaction); return { submission: plain(row), history: (await Event.findAll({ where: { week_id: row.id }, order: [["version", "ASC"]], transaction })).map(plain) }; });
  async function review(token, id, input) {
    R.body(input, ["version", "action", "feedback"]);
    if (!["reviewed", "revision_requested"].includes(input.action) || !Number.isInteger(input.version)) R.fail(400, "INVALID_REVIEW", "สถานะหรือเวอร์ชันไม่ถูกต้อง");
    const feedback = R.text(input.feedback, input.action === "revision_requested");
    return scope(token, async ({ owner, mentor, transaction }) => {
      const row = await ownedWeek(owner, mentor, id, transaction);
      if (row.status !== "submitted" || row.version !== input.version) R.fail(409, "REVIEW_CONFLICT", "สัปดาห์นี้ถูกดำเนินการแล้ว กรุณาโหลดใหม่");
      await row.update({ status: input.action, version: row.version + 1 }, { transaction });
      await Event.create({ week_id: row.id, version: row.version, action: input.action, mentor_id: mentor.id, mentor_name: `${mentor.first_name} ${mentor.last_name}`, feedback, snapshot: row.snapshot }, { transaction });
      return { submission: plain(row) };
    });
  }
  return { overview, read, save, submit, resend, list, detail, review };
}
module.exports = { createInternshipLogService };
