const bcrypt = require('bcrypt');
const { QueryTypes } = require('sequelize');
// Explicit user policy. Never include this value or its hash in a DTO/log.
const INITIAL_TEACHER_PASSWORD = '123456789';
const FIRST_PASSWORD_PAGE = '/src/teacher_coop/first_password_change.html';
const fail = (status, code, message, field) => { throw Object.assign(new Error(message), { status, code, field }); };
async function mustChangePassword(teacher) {
  // The persisted bcrypt credential itself is authoritative: reset installs a
  // fresh hash of the initial password; successful change replaces that hash.
  // No client flag, token flag, overloaded version column or schema change.
  return !!teacher && !teacher.is_department_head && !!teacher.password_hash
    && await bcrypt.compare(INITIAL_TEACHER_PASSWORD, teacher.password_hash);
}
async function requireChangedPassword(teacher) {
  if (await mustChangePassword(teacher)) fail(403, 'TEACHER_PASSWORD_CHANGE_REQUIRED', 'กรุณาเปลี่ยนรหัสผ่านเริ่มต้นก่อนใช้งานระบบ');
}
async function requireRevocationStorage(models, transaction) {
  const [row] = await models.sequelize.query("SELECT to_regclass('public.admin_account_controls') IS NOT NULL AS ready", { type: QueryTypes.SELECT, transaction });
  if (!models.AdminAccountControl || !row.ready)
    fail(503, 'TEACHER_PASSWORD_STORAGE_REQUIRED', 'ยังไม่พร้อมจัดการรหัสผ่าน เนื่องจากไม่มีที่เก็บสถานะเพิกถอน Session ที่ระบบรองรับ');
}
async function revokeTeacherSessions(models, id, transaction) {
  await requireRevocationStorage(models, transaction);
  const [control] = await models.AdminAccountControl.findOrCreate({ where: { actor_type: 'teacher', actor_id: id }, transaction });
  await control.update({ revoked_before: Math.max(Number(control.revoked_before), Math.floor(Date.now() / 1000)), version: control.version + 1 }, { transaction });
}
function passwordPayload(body) {
  const keys = ['current_password', 'new_password', 'confirm_password'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !keys.includes(key)))
    fail(400, 'PASSWORD_INPUT', 'ข้อมูลคำขอไม่ถูกต้อง');
  if (typeof body.current_password !== 'string' || !body.current_password)
    fail(400, 'PASSWORD_INPUT', 'กรุณากรอกรหัสผ่านปัจจุบัน', 'current_password');
  if (Buffer.byteLength(body.current_password, 'utf8') > 72)
    fail(400, 'PASSWORD_INPUT', 'รหัสผ่านปัจจุบันยาวเกินขนาดที่ระบบรองรับ (72 ไบต์) กรุณาลดความยาว โดยภาษาไทยอาจใช้หลายไบต์ต่อตัว', 'current_password');
  if (typeof body.new_password !== 'string' || !body.new_password)
    fail(400, 'PASSWORD_INPUT', 'กรุณากรอกรหัสผ่านใหม่', 'new_password');
  if (body.new_password.length < 8)
    fail(400, 'PASSWORD_INPUT', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร', 'new_password');
  if (body.new_password.length > 100 || Buffer.byteLength(body.new_password, 'utf8') > 72)
    fail(400, 'PASSWORD_INPUT', 'รหัสผ่านใหม่ยาวเกินขนาดที่ระบบรองรับ (72 ไบต์) กรุณาลดความยาว โดยภาษาไทยอาจใช้หลายไบต์ต่อตัว', 'new_password');
  if (body.new_password === INITIAL_TEACHER_PASSWORD) fail(400, 'PASSWORD_INPUT', 'ห้ามใช้รหัสผ่านเริ่มต้นซ้ำ', 'new_password');
  if (body.new_password !== body.confirm_password) fail(400, 'PASSWORD_INPUT', 'ยืนยันรหัสผ่านใหม่ไม่ตรงกัน', 'confirm_password');
  return body;
}
module.exports = { INITIAL_TEACHER_PASSWORD, FIRST_PASSWORD_PAGE, mustChangePassword, requireChangedPassword, requireRevocationStorage, revokeTeacherSessions, passwordPayload, fail };
