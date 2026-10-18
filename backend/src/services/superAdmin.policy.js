const { object, text, uuid, WorkflowError } = require('../validators/roleWorkflow.validator');
const PERMISSIONS = Object.freeze({
  'overview.read': 'ดูภาพรวมระบบ', 'accounts.read': 'ดูข้อมูลบัญชีพื้นฐาน',
  'accounts.write': 'แก้ไขชื่อและตำแหน่งบัญชีที่รองรับ', 'accounts.status': 'เปิด/ปิดบัญชี',
  'permissions.write': 'จัดการสิทธิ์ Super Admin', 'settings.write': 'แก้ไขค่าระบบที่อนุญาต',
  'audit.read': 'ดูประวัติการดำเนินการ',
});
const ALL_PERMISSIONS = Object.freeze(Object.keys(PERMISSIONS));
const GOVERNANCE = ['accounts.read', 'accounts.status', 'permissions.write'];
const SETTINGS = Object.freeze({ 'admin.page_size': { label: 'จำนวนบัญชีต่อหน้าเริ่มต้น', type: 'integer', min: 10, max: 100, default: 25, activation: 'immediate' } });
const fail = (message, status = 400) => { throw new WorkflowError(message, status); };
function developmentOnly(env = process.env) { if (env.NODE_ENV !== 'development') fail('Super Admin ยังไม่เปิดนอก Local Development ต้องมี Strong Authentication/MFA ก่อน', 403); }
function permissions(value) {
  if (!Array.isArray(value) || value.length > ALL_PERMISSIONS.length || new Set(value).size !== value.length || value.some(key => !Object.hasOwn(PERMISSIONS, key))) fail('Permission ไม่อยู่ใน allowlist');
  return [...value].sort();
}
function allowed(admin, permission) { return admin?.is_active === true && Array.isArray(admin.permissions) && admin.permissions.includes(permission); }
function requirePermission(admin, permission) { if (!allowed(admin, permission)) fail('ไม่มีสิทธิ์ดำเนินการนี้', 403); }
function strongPassword(value) {
  if (typeof value !== 'string' || value.length < 14 || Buffer.byteLength(value, 'utf8') > 72 || value.trim() !== value || /^(.)(\1)+$/u.test(value) || /123456789|password|qwerty/i.test(value)) fail('ใช้รหัสผ่านเฉพาะบัญชีอย่างน้อย 14 ตัวอักษร ไม่เกิน 72 UTF-8 bytes และไม่ใช้รหัสผ่านทั่วไป');
  return value;
}
function settingValue(key, value) {
  const spec = Object.hasOwn(SETTINGS, key) ? SETTINGS[key] : null;
  if (!spec || !Number.isInteger(value) || value < spec.min || value > spec.max) fail('ค่าการตั้งค่าไม่อยู่ในช่วงที่อนุญาต');
  return value;
}
function privilegedBody(body, extra = []) {
  object(body, ['password', 'confirmed', ...extra]);
  if (body.confirmed !== true || typeof body.password !== 'string' || !body.password || Buffer.byteLength(body.password, 'utf8') > 72) fail('ต้องยืนยันการดำเนินการและรหัสผ่านปัจจุบัน');
  return body;
}
function listQuery(query, defaultLimit = 25) {
  object(query, ['search', 'role', 'active', 'page', 'limit'], { empty: true });
  const integer = (value, fallback, max) => { if (value === undefined) return fallback; if (typeof value !== 'string' || !/^[1-9]\d{0,5}$/.test(value) || Number(value) > max) fail('Pagination ไม่ถูกต้อง'); return Number(value); };
  const page = integer(query.page, 1, 10000), limit = integer(query.limit, defaultLimit, 100);
  if (query.search !== undefined && (typeof query.search !== 'string' || query.search.length > 100)) fail('คำค้นหายาวเกินกำหนด');
  const role = query.role || 'all', active = query.active || 'all';
  if (!['all', 'student', 'teacher', 'department_head', 'department_staff', 'super_admin'].includes(role) || !['all', 'true', 'false'].includes(active)) fail('ตัวกรองไม่ถูกต้อง');
  return { page, limit, offset: (page - 1) * limit, search: query.search?.trim() || '', role, active };
}
const safeAdmin = row => Object.fromEntries(['id', 'email', 'first_name', 'last_name', 'is_active', 'permissions', 'createdAt', 'updatedAt'].map(key => [key, row[key]]));
module.exports = { PERMISSIONS, ALL_PERMISSIONS, GOVERNANCE, SETTINGS, fail, developmentOnly, permissions, allowed, requirePermission, strongPassword, settingValue, privilegedBody, listQuery, safeAdmin, object, text, uuid };
