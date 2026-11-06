const { uuid } = require('../validators/roleWorkflow.validator');
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const EXAM_STATUSES = ['unscheduled', 'scheduled', 'rescheduled', 'cancelled', 'completed'];
const REVIEW_STATUSES = ['missing', 'pending', 'needs_revision', 'approved'];
const TRANSITIONS = {
  unscheduled: ['scheduled', 'cancelled'], scheduled: ['scheduled', 'rescheduled', 'cancelled', 'completed'],
  rescheduled: ['scheduled', 'rescheduled', 'cancelled', 'completed'], cancelled: ['scheduled'], completed: [],
};
function fail(message, status = 400, code = 'CO09_VALIDATION') { throw Object.assign(Error(message), { status, code }); }
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail('ข้อมูลไม่ถูกต้องหรือมีฟิลด์ที่ไม่อนุญาต');
}
function text(value, max, required = false) {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value) || (required && !value.trim())) fail('ข้อความไม่ถูกต้องหรือยาวเกินกำหนด');
  return value.trim();
}
function httpsUrl(value) {
  const raw = text(value, 2000);
  if (!raw) return '';
  let url; try { url = new URL(raw); } catch { fail('URL ต้องเป็น HTTPS ที่ถูกต้อง'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || /\s/.test(raw)) fail('URL ต้องเป็น HTTPS และไม่มีข้อมูลเข้าสู่ระบบ');
  return raw;
}
function revision(header, current) {
  if (header == null) fail('กรุณาโหลดข้อมูลก่อนบันทึก', 428, 'CO09_REVISION_REQUIRED');
  if (header !== `"${current}"`) fail('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุดและตรวจสอบร่างก่อนบันทึก', 409, 'CO09_REVISION_CONFLICT');
}
function dateTime(value) {
  // The form supplies Bangkok local times; reject implicit host-timezone parsing.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+07:00$/.test(value)) fail('วันเวลาต้องระบุเขตเวลา Asia/Bangkok');
  const parsed = new Date(value);
  const local = new Date(parsed.getTime() + 7 * 3600000);
  if (!Number.isFinite(parsed.getTime()) || local.toISOString().slice(0, 19) + '+07:00' !== value) fail('วันเวลาไม่ถูกต้อง');
  return parsed;
}
function schedule(body, previous = 'unscheduled') {
  object(body, ['status', 'starts_at', 'ends_at', 'mode', 'location', 'meeting_url', 'notes', 'reason', 'committee']);
  if (!TRANSITIONS[previous]?.includes(body.status)) fail('ไม่อนุญาตให้เปลี่ยนสถานะสอบตามที่ระบุ', 409, 'CO09_TRANSITION');
  const reason = text(body.reason, 2000);
  if (['rescheduled', 'cancelled'].includes(body.status) && !reason) fail('กรุณาระบุเหตุผลเลื่อนหรือยกเลิกการสอบ');
  const starts = body.starts_at ? dateTime(body.starts_at) : null, ends = body.ends_at ? dateTime(body.ends_at) : null;
  if (body.status !== 'cancelled' && (!starts || !ends)) fail('กรุณาระบุวันเวลาเริ่มและสิ้นสุด');
  if (!!starts !== !!ends || (starts && starts >= ends)) fail('เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด');
  if (starts && new Date(starts.getTime()+25200000).toISOString().slice(0,10) !== new Date(ends.getTime()+25200000).toISOString().slice(0,10)) fail('การสอบต้องเริ่มและสิ้นสุดในวันเดียวกัน');
  if (!['onsite', 'online'].includes(body.mode)) fail('รูปแบบการสอบไม่ถูกต้อง');
  const location = text(body.location, 500), meeting_url = httpsUrl(body.meeting_url);
  if (body.status !== 'cancelled' && (body.mode === 'onsite' ? !location : !meeting_url)) fail('กรุณาระบุห้องสอบหรือ URL ประชุมตามรูปแบบสอบ');
  // 100 is a request-size bound, not an academic committee-count requirement.
  if (!Array.isArray(body.committee) || body.committee.length > 100) fail('รายชื่อกรรมการไม่ถูกต้อง');
  const committee = body.committee.map((member, display_order) => {
    object(member, ['teacher_id', 'role']); uuid(member.teacher_id);
    if (!['chair', 'member', 'advisor'].includes(member.role)) fail('บทบาทกรรมการไม่ถูกต้อง');
    return { teacher_id: member.teacher_id, role: member.role, display_order };
  });
  if (new Set(committee.map(item => item.teacher_id)).size !== committee.length) fail('กรรมการซ้ำในตารางสอบเดียวกัน');
  return { status: body.status, starts_at: starts, ends_at: ends, mode: body.mode, location, meeting_url, notes: text(body.notes, 5000), reason, committee };
}
function pdf(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length || file.buffer.length > MAX_PDF_BYTES || file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname || '') || !/^%PDF-1\.[0-9]|^%PDF-2\.0/.test(file.buffer.subarray(0, 8).toString('ascii'))) fail('รองรับ PDF เท่านั้น ขนาดไม่เกิน 10MB');
}
module.exports = { MAX_PDF_BYTES, EXAM_STATUSES, REVIEW_STATUSES, TRANSITIONS, fail, object, text, httpsUrl, revision, dateTime, schedule, pdf };
