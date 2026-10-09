const FIELDS = ["assigned_work", "work_result", "problems", "solutions", "notes"];
function fail(status, code, message, details = {}) { throw Object.assign(new Error(message), { status, code, ...details }); }
function date(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" || value > "2199-12-31" || !Number.isFinite(new Date(`${value}T00:00:00Z`).getTime()) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) fail(400, "INVALID_DATE", "วันที่ไม่ถูกต้อง");
  return value;
}
function today(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
function addDays(value, count) { const d = new Date(`${date(value)}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10); }
function week(value) { const d = new Date(`${date(value)}T00:00:00Z`); const start = addDays(value, -((d.getUTCDay() + 6) % 7)); return { start, end: addDays(start, 6) }; }
function dates(start, end) { const result = []; for (let d = start; d <= end; d = addDays(d, 1)) { result.push(d); if (result.length > 7) fail(400, "INVALID_WEEK", "ช่วงสัปดาห์ไม่ถูกต้อง"); } return result; }
function body(input, allowed) { if (!input || Array.isArray(input) || typeof input !== "object" || Object.keys(input).some(key => !allowed.includes(key))) fail(400, "INVALID_FIELDS", "ข้อมูลหรือฟิลด์ไม่ถูกต้อง"); }
function text(value, required = false) { if (value === undefined && !required) return ""; if (typeof value !== "string" || value.includes("\0") || value.length > 5000 || (required && !value.trim())) fail(400, "INVALID_TEXT", "กรุณากรอกข้อมูลที่จำเป็น ความยาวไม่เกิน 5,000 ตัวอักษร"); return value.trim(); }
function entry(input) {
  body(input, ["version", "kind", "non_working_reason", ...FIELDS]);
  if (!["working", "non_working"].includes(input.kind)) fail(400, "INVALID_KIND", "กรุณาระบุวันทำงานหรือวันที่ไม่ได้ปฏิบัติงาน");
  const result = { kind: input.kind, non_working_reason: text(input.non_working_reason, input.kind === "non_working") };
  for (const field of FIELDS) result[field] = text(input[field], input.kind === "working" && ["assigned_work", "work_result", "problems", "solutions"].includes(field));
  if (result.kind === "non_working" && FIELDS.some(field => field !== "notes" && result[field])) fail(400, "NON_WORKING_CONTENT", "วันที่ไม่ได้ปฏิบัติงานให้ระบุเหตุผลโดยไม่กรอกงานสมมติ");
  if (result.kind === "working" && result.non_working_reason) fail(400, "WORKING_REASON", "วันทำงานไม่ต้องระบุเหตุผลวันหยุด");
  return result;
}
module.exports = { FIELDS, fail, date, today, addDays, week, dates, body, text, entry };
