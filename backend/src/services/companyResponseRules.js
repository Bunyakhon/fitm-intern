const { object, WorkflowError } = require('../validators/roleWorkflow.validator');
const ACCEPTED_REQUEST_STATUSES = ['approved', 'document_issued', 'in_progress'];
function fail(status, code, message) { throw Object.assign(new WorkflowError(message, status), { code }); }
function responseValues(body, correcting = false, now = Date.now()) {
  object(body, ['status', 'responded_at', 'note', ...(correcting ? ['version', 'correction_reason'] : [])]);
  if (!['accepted', 'rejected'].includes(body.status)) fail(400, 'INVALID_COMPANY_RESPONSE_STATUS', 'กรุณาเลือกผลตอบรับหรือปฏิเสธ');
  const stamp = body.responded_at;
  const calendar = typeof stamp === 'string' ? stamp.slice(0, 10) : '';
  if (typeof stamp !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(stamp)
    || Number(calendar.slice(0, 4)) < 1 || (stamp.includes('T') && Number(stamp.slice(11, 13)) > 23)
    || !Number.isFinite(Date.parse(stamp)) || new Date(calendar).toISOString().slice(0, 10) !== calendar || Date.parse(stamp) > now)
    fail(400, 'INVALID_COMPANY_RESPONSE_DATE', 'กรุณาระบุวันที่ตอบกลับที่ถูกต้องและไม่อยู่ในอนาคต');
  function text(value, required = false) {
    if (value !== undefined && value !== null && typeof value !== 'string') fail(400, 'INVALID_COMPANY_RESPONSE_NOTE', 'ข้อความไม่ถูกต้อง');
    const result = value?.trim() || null;
    if ((required && !result) || (result && (result.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result))))
      fail(400, 'INVALID_COMPANY_RESPONSE_NOTE', required ? 'กรุณาระบุเหตุผลแก้ไข (ไม่เกิน 2,000 ตัวอักษร)' : 'หมายเหตุต้องไม่เกิน 2,000 ตัวอักษร');
    return result;
  }
  if (correcting && (!Number.isInteger(body.version) || body.version < 1)) fail(400, 'COMPANY_RESPONSE_VERSION_REQUIRED', 'กรุณาระบุ version ของผลตอบกลับ');
  return { status: body.status, responded_at: new Date(stamp), note: text(body.note), ...(correcting ? { correction_reason: text(body.correction_reason, true) } : {}) };
}
function placementEligibility(request, cooperation, response) {
  if (!ACCEPTED_REQUEST_STATUSES.includes(request.status)) return { available: false, code: 'REQUEST_NOT_APPROVED', message: 'คำร้องยังไม่ได้รับการอนุมัติ' };
  if (cooperation?.status !== 'generated' || !cooperation.content_sha256 || !cooperation.generated_at) return { available: false, code: 'COOPERATION_LETTER_REQUIRED', message: 'กรุณาสร้างฉบับตัวอย่างหนังสือขอความอนุเคราะห์ให้เสร็จก่อน' };
  if (!response) return { available: false, code: 'COMPANY_RESPONSE_REQUIRED', message: 'กรุณาบันทึกผลตอบกลับจากสถานประกอบการก่อนสร้างหนังสือส่งตัว' };
  if (response.status !== 'accepted') return { available: false, code: 'COMPANY_RESPONSE_REJECTED', message: 'สถานประกอบการปฏิเสธ จึงยังสร้างหนังสือส่งตัวไม่ได้' };
  return { available: true, code: 'PLACEMENT_ELIGIBLE', message: 'สถานประกอบการตอบรับแล้ว สามารถจัดทำหนังสือส่งตัวฉบับตัวอย่างได้' };
}
module.exports = { responseValues, placementEligibility, fail };
