const fail = (status, code, message) => { throw Object.assign(new Error(message), { status, code }); };
function body(input, fields) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !fields.includes(key))) fail(400, "INVALID_INPUT", "ข้อมูลไม่ถูกต้องหรือมีช่องที่ไม่อนุญาต");
}
function uuid(value) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) fail(400, "INVALID_ID", "รหัสรายการไม่ถูกต้อง");
  return value;
}
function text(value, required = false, max = 2000) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) fail(400, "INVALID_TEXT", "กรุณากรอกข้อมูลให้ครบและไม่เกินความยาวที่กำหนด");
  return value.trim();
}
function schedule(input, now) {
  body(input, ["date", "time", "notes", "mentor_verified_at", "substitute", "version", "reason"]);
  if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date) fail(400, "INVALID_DATE", "วันที่ไม่ถูกต้อง");
  if (typeof input.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) fail(400, "INVALID_TIME", "เวลาไม่ถูกต้อง");
  const at = new Date(`${input.date}T${input.time}:00+07:00`);
  if (at <= now) fail(400, "PAST_APPOINTMENT", "นัดหมายต้องเป็นวันเวลาในอนาคต (Asia/Bangkok)");
  if (typeof input.mentor_verified_at !== "string" || !Number.isFinite(Date.parse(input.mentor_verified_at))) fail(400, "MENTOR_CHECK_REQUIRED", "กรุณาตรวจสอบข้อมูลพี่เลี้ยงก่อนนัดหมาย");
  let substitute = null;
  if (input.substitute !== undefined && input.substitute !== null) {
    body(input.substitute, ["email", "first_name", "last_name", "position", "reason"]);
    substitute = Object.fromEntries(["email", "first_name", "last_name", "position", "reason"].map(key => [key, text(input.substitute[key], true, key === "reason" ? 2000 : 254)]));
    substitute.email = substitute.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(substitute.email)) fail(400, "INVALID_EMAIL", "อีเมลพี่เลี้ยงแทนไม่ถูกต้อง");
  }
  return { scheduled_at: at, notes: text(input.notes), substitute };
}
module.exports = { fail, body, uuid, text, schedule };
