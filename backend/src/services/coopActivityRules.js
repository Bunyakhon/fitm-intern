const { fail, body, uuid, text } = require('./supervisionRules');
const categories = ['orientation', 'training', 'presentation', 'other'];
function dateTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\+07:00$/.test(value)) fail(400, 'INVALID_DATE', 'กรุณาระบุวันเวลาในเขตเวลา Asia/Bangkok (+07:00)');
  const date = new Date(value), local = new Date(date.getTime() + 7 * 3600000);
  if (!Number.isFinite(+date) || local.toISOString().slice(0, 16) !== value.slice(0, 16)) fail(400, 'INVALID_DATE', 'วันเวลาไม่ถูกต้อง');
  return date;
}
function activityInput(input, editing = false) {
  body(input, ['title','description','category','starts_at','ends_at','location','meeting_url','internal_notes','status', ...(editing ? ['version','reason'] : ['creation_key'])]);
  if (!categories.includes(input.category) || !['draft','published'].includes(input.status)) fail(400, 'INVALID_INPUT', 'ประเภทหรือสถานะกิจกรรมไม่ถูกต้อง');
  const starts_at = dateTime(input.starts_at), ends_at = dateTime(input.ends_at);
  if (ends_at <= starts_at) fail(400, 'INVALID_RANGE', 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม');
  const meeting_url = text(input.meeting_url, false, 1000);
  if (meeting_url) { let url; try { url = new URL(meeting_url); } catch { fail(400, 'INVALID_URL', 'ลิงก์ประชุมไม่ถูกต้อง'); } if (url.protocol !== 'https:' || url.username || url.password) fail(400, 'INVALID_URL', 'ลิงก์ประชุมต้องใช้ https และไม่มีรหัสผ่านใน URL'); }
  return { title: text(input.title, true, 200), description: text(input.description, false, 10000), category: input.category, starts_at, ends_at, location: text(input.location, false, 500), meeting_url, internal_notes: text(input.internal_notes, false, 5000), status: input.status };
}
function version(value) { if (!Number.isSafeInteger(value) || value < 1) fail(400, 'INVALID_VERSION', 'เวอร์ชันไม่ถูกต้อง'); return value; }
module.exports = { categories, dateTime, activityInput, version, fail, body, uuid, text };
