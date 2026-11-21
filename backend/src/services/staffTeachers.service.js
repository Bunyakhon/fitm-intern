const { Op, QueryTypes, where, fn, col } = require('sequelize');
const { WorkflowError, uuid, object } = require('../validators/roleWorkflow.validator');
const { teacherValues } = require('../validators/staffTeachers.validator');
const { TEACHER_PROFILE_FIELDS, toSafeTeacherProfile } = require('./teacherAuth.service');
const { accountControl, assertAccountAccess } = require('./adminAccountAccess.service');
const { ADMIN_LOCK } = require('./superAdmin.service');
const passwordPolicy = require('./teacherPassword.policy');
const { membershipReady } = require('./teacherAdminGrant.service');

function createStaffTeachersService(m = require('../models')) {
  const db = m.sequelize;
  const fail = (message, status = 403) => { throw new WorkflowError(message, status); };
  function session(claims) {
    if (claims?.actor_type !== 'department_staff' || claims.role !== 'department_staff' || claims.staff_id !== claims.id
      || claims.teacher_id !== undefined || claims.student_id !== undefined || claims.super_admin_id !== undefined)
      fail('ไม่มีสิทธิ์จัดการข้อมูลอาจารย์');
    uuid(claims.id);
    if (!Number.isFinite(claims.iat) || !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000)
      fail('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
  }
  async function ready(table, transaction) {
    const [row] = await db.query('SELECT to_regclass(:table) IS NOT NULL AS ready',
      { replacements: { table: `public.${table}` }, type: QueryTypes.SELECT, transaction });
    return row.ready;
  }
  async function scope(claims, transaction) {
    session(claims);
    const staff = await m.DepartmentStaff.findOne({ where: { id: claims.id, is_active: true },
      attributes: ['id', 'department'], transaction, lock: transaction.LOCK.SHARE });
    if (!staff) fail('บัญชีเจ้าหน้าที่ไม่มีสิทธิ์ใช้งาน');
    await assertAccountAccess(m, 'department_staff', staff.id, { transaction, issuedAt: claims.iat });
    if (typeof staff.department !== 'string' || !staff.department.trim()) fail('Staff department scope is not assigned');
    return staff.department;
  }
  async function transaction(claims, work, deactivating = false) {
    session(claims);
    return db.transaction(async tx => {
      await db.query("SET LOCAL lock_timeout = '5s'", { transaction: tx });
      await db.query("SET LOCAL statement_timeout = '15s'", { transaction: tx });
      // Same order as central status/grant writers and CO-09 scheduling.
      await db.query(ADMIN_LOCK, { transaction: tx });
      if (deactivating) {
        await db.query('SELECT pg_advisory_xact_lock(2140909)', { transaction: tx });
        // Advisor writers lock Student before Teacher. Stabilize assignments
        // before locking the target, following the existing admin status guard.
        await db.query('LOCK TABLE public.students IN EXCLUSIVE MODE', { transaction: tx });
      }
      const department = await scope(claims, tx);
      const result = await work(tx, department);
      session(claims); // Expiry may have occurred while waiting for locks.
      return result;
    });
  }
  async function target(id, department, tx) {
    uuid(id);
    const row = await m.Teacher.findOne({ where: { id, department }, attributes: TEACHER_PROFILE_FIELDS,
      transaction: tx, lock: tx.LOCK.UPDATE });
    if (!row) fail('ไม่พบอาจารย์ในภาควิชาที่เข้าถึงได้', 404);
    if (row.is_department_head) fail('บัญชีหัวหน้าภาควิชาอ่านได้เท่านั้น เจ้าหน้าที่แก้ไขหรือปิดใช้งานไม่ได้');
    return row;
  }
  async function majors(tx) {
    if (!await ready('coop_prerequisite_catalog_programs', tx)) return [];
    const rows = await m.CoopPrerequisiteCatalogProgram.findAll({ attributes: ['program'], order: [['program', 'ASC']],
      transaction: tx, lock: tx.LOCK.SHARE });
    return rows.map(row => row.program);
  }
  async function validateMajor(values, previous, tx) {
    if (values.major != null && values.major !== previous && !(await majors(tx)).includes(values.major))
      fail('กรุณาเลือกสาขาจาก Catalog ที่มีอยู่ในระบบ', 400);
  }
  function audit(tx, claims, id, operation, fields) {
    // AdminAuditLog.actor_id references SuperAdmin, so a Staff UUID cannot be
    // inserted there. Emit a safe application event after commit; no names/emails,
    // field values, credentials or tokens. Durable Staff audit needs schema policy.
    tx.afterCommit(() => { console.info(JSON.stringify({ event: 'staff.teacher', actor_type: 'department_staff',
      actor_id: claims.id, target_id: id, operation, fields, time: new Date().toISOString() })); });
  }
  async function options(claims) {
    return transaction(claims, async (tx, department) => {
      await passwordPolicy.requireRevocationStorage(m, tx);
      return { department, majors: await majors(tx), activation_available: true,
        activation_message: 'บัญชีใหม่ต้องเปลี่ยนรหัสผ่านเริ่มต้นก่อนใช้งานระบบ เจ้าหน้าที่ไม่กำหนดรหัสผ่านผ่านฟอร์ม' };
    });
  }
  async function create(claims, body) {
    const values = teacherValues(body, true);
    return transaction(claims, async (tx, department) => {
      await passwordPolicy.requireRevocationStorage(m, tx);
      if (!values.email.endsWith('@itm.kmutnb.ac.th')) passwordPolicy.fail(400, 'TEACHER_EMAIL_INVALID', 'กรุณาใช้อีเมลมหาวิทยาลัย @itm.kmutnb.ac.th', 'email');
      // Serialize teacher email writers, including case-normalized duplicate checks.
      await db.query('LOCK TABLE public.teachers IN SHARE ROW EXCLUSIVE MODE', { transaction: tx });
      await validateMajor(values, null, tx);
      if (await m.Teacher.findOne({ where: where(fn('lower', col('email')), values.email), attributes: ['id'], transaction: tx }))
        passwordPolicy.fail(409, 'TEACHER_EMAIL_UNAVAILABLE', 'ไม่สามารถใช้อีเมลนี้สร้างบัญชีอาจารย์ได้ กรุณาตรวจสอบข้อมูล', 'email');
      const row = await m.Teacher.create({ ...values, department, is_department_head: false, status: 'active', password: passwordPolicy.INITIAL_TEACHER_PASSWORD },
        { transaction: tx, fields: ['id', ...Object.keys(values), 'department', 'is_department_head', 'status', 'password', 'password_hash'] });
      await m.AdminAccountControl.create({ actor_type: 'teacher', actor_id: row.id }, { transaction: tx });
      audit(tx, claims, row.id, 'create', [...Object.keys(values), 'department', 'status']);
      const saved = await m.Teacher.findByPk(row.id, { attributes: TEACHER_PROFILE_FIELDS, transaction: tx });
      return { teacher: toSafeTeacherProfile(saved), activation: { state: 'password_change_required', login_ready: false,
        must_change_password: true, message: 'เพิ่มข้อมูลอาจารย์เรียบร้อย บัญชีใช้งานอยู่และต้องเปลี่ยนรหัสผ่านเริ่มต้นหลังเข้าสู่ระบบ ก่อนใช้งานระบบตามปกติ' } };
    });
  }
  async function update(claims, id, body) {
    const values = teacherValues(body);
    return transaction(claims, async (tx, department) => {
      const row = await target(id, department, tx);
      await validateMajor(values, row.major, tx);
      const changed = Object.keys(values).filter(key => values[key] !== row[key]);
      if (changed.length) {
        await row.update(values, { fields: changed, transaction: tx });
        audit(tx, claims, id, 'update', changed);
      }
      return toSafeTeacherProfile(row);
    });
  }
  async function deactivate(claims, id, body) {
    object(body, [], { empty: true });
    return transaction(claims, async (tx, department) => {
      const row = await target(id, department, tx);
      if (row.status === 'inactive') return toSafeTeacherProfile(row);
      // Never change governance through the Staff workspace, even when a
      // Teacher also has an Admin membership. Central administration owns it.
      if (m.SuperAdmin?.rawAttributes?.teacher_id && await ready('super_admins', tx)
        && await m.SuperAdmin.count({ where: { teacher_id: id, is_active: true }, transaction: tx }))
        fail('บัญชีนี้มีสิทธิ์ผู้ดูแลระบบ ต้องจัดการผ่านกระบวนการผู้ดูแลระบบก่อน', 409);
      if (await m.Student.count({ where: { [Op.or]: [{ advisor_teacher_id: id }, { coop_advisor_teacher_id: id }] }, transaction: tx })
        || await m.CoopProjectAdvisorRequest.count({ where: { requested_advisor_teacher_id: id,
          status: { [Op.in]: ['pending', 'confirmed'] } }, transaction: tx }))
        fail('ยังมีนักศึกษาในความดูแลหรือคำขอที่ปรึกษาค้างอยู่ ต้องจัดการผ่าน workflow เดิมก่อนปิดใช้งาน', 409);
      const supervision = await m.SupervisionAppointment.count({ where: { teacher_id: id, [Op.or]: [
        { status: 'pending_confirmation' }, { status: 'confirmed', [Op.or]: [{ '$result.id$': null }, { '$result.status$': { [Op.ne]: 'completed' } }] }] },
        include: [{ model: m.SupervisionResult, as: 'result', attributes: [], required: false }], transaction: tx });
      if (supervision) fail('ยังมีนัดนิเทศหรือผลนิเทศที่ไม่เสร็จ ต้องจัดการผ่าน workflow เดิมก่อนปิดใช้งาน', 409);
      if (await m.CoopTopicExamCommitteeMember.count({ where: { teacher_id: id },
        include: [{ model: m.CoopTopicExam, as: 'exam', required: true, attributes: [], where: { status: { [Op.in]: ['scheduled', 'rescheduled'] } } }], transaction: tx }))
        fail('ยังเป็นกรรมการสอบที่ยังไม่เสร็จ ต้องจัดการตารางสอบเดิมก่อนปิดใช้งาน', 409);
      await row.update({ status: 'inactive' }, { fields: ['status'], transaction: tx });
      const control = await accountControl(m, 'teacher', id, tx);
      if (control || m.AdminAccountControl && await ready('admin_account_controls', tx)) {
        const revocation = control || await m.AdminAccountControl.create({ actor_type: 'teacher', actor_id: id }, { transaction: tx });
        await revocation.update({ enabled: false, revoked_before: Math.floor(Date.now() / 1000), version: revocation.version + 1 }, { transaction: tx });
      }
      audit(tx, claims, id, 'deactivate', ['status']);
      return toSafeTeacherProfile(row);
    }, true);
  }
  async function resetPassword(claims, id, body) {
    object(body, [], { empty: true });
    return transaction(claims, async (tx, department) => {
      await passwordPolicy.requireRevocationStorage(m, tx);
      const row = await target(id, department, tx);
      if (await membershipReady(m, tx) && await m.SuperAdmin.count({ where: { teacher_id: id }, transaction: tx }))
        fail('เจ้าหน้าที่รีเซ็ตรหัสผ่านบัญชีผู้ดูแลระบบไม่ได้', 403);
      await row.update({ password: passwordPolicy.INITIAL_TEACHER_PASSWORD }, { transaction: tx, fields: ['password', 'password_hash', 'updatedAt'] });
      await passwordPolicy.revokeTeacherSessions(m, id, tx);
      audit(tx, claims, id, 'password.reset', ['credential_changed', 'sessions_revoked']);
      return { teacher: toSafeTeacherProfile(row), must_change_password: true, sessions_revoked: true,
        message: 'รีเซ็ตรหัสผ่านแล้ว Session เดิมถูกเพิกถอน ต้องเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ สถานะเปิดหรือปิดใช้งานบัญชีคงเดิม' };
    });
  }
  return { options, create, update, deactivate, resetPassword };
}
module.exports = { createStaffTeachersService };
