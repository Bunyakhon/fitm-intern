const path = require('node:path');
const R = require('./supervisionRules');
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
function resultInput(input, multipart = false) {
  R.body(input, ['version', 'appointment_version', 'visited_on', 'summary', 'issues', 'recommendations']);
  const number = value => multipart && typeof value === 'string' && /^[0-9]+$/.test(value) ? Number(value) : value;
  const version = number(input.version), appointment_version = number(input.appointment_version);
  if (!Number.isInteger(version) || version < 0 || !Number.isInteger(appointment_version) || appointment_version < 1) R.fail(400, 'INVALID_VERSION', 'เวอร์ชันไม่ถูกต้อง');
  const visited_on = input.visited_on || null;
  if (visited_on && (typeof visited_on !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(visited_on) || !Number.isFinite(Date.parse(visited_on)) || new Date(visited_on).toISOString().slice(0,10) !== visited_on)) R.fail(400, 'INVALID_VISIT_DATE', 'วันที่นิเทศจริงไม่ถูกต้อง');
  return { version, appointment_version, visited_on, ...Object.fromEntries(['summary','issues','recommendations'].map(key => [key, R.text(input[key], false, 5000)])) };
}
function validateImage(file) {
  const extensions = { 'image/png': ['.png'], 'image/jpeg': ['.jpg','.jpeg'] };
  if (!file || !Buffer.isBuffer(file.buffer) || file.size !== file.buffer.length || !file.size || file.size > MAX_IMAGE_SIZE) R.fail(400, 'INVALID_IMAGE_SIZE', 'ภาพต้องมีขนาดไม่เกิน 5 MB');
  let original = file.originalname;
  if (typeof original === 'string' && [...original].every(c => c.codePointAt(0) <= 255)) {
    try { original = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(original, 'latin1')); } catch { /* Preserve real Latin-1. */ }
  }
  if (typeof original !== 'string' || original.length > 255 || /[\\/\u0000-\u001f\u007f]/.test(original) || original.includes('..') || !extensions[file.mimetype]?.includes(path.extname(original).toLowerCase())) R.fail(400, 'INVALID_IMAGE_TYPE', 'รองรับเฉพาะภาพ PNG / JPEG ที่มีนามสกุลตรงกับชนิดไฟล์');
  const matches = file.mimetype === 'image/png' ? file.buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : file.buffer.subarray(0,3).equals(Buffer.from([255,216,255]));
  if (!matches) R.fail(400, 'INVALID_IMAGE_SIGNATURE', 'เนื้อหาภาพไม่ตรงกับชนิดไฟล์');
  return { original_name: original, mime_type: file.mimetype, file_size: file.size };
}
module.exports = { resultInput, validateImage, MAX_IMAGE_SIZE };
