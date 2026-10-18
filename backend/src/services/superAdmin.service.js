const { createHash } = require('node:crypto');
const { QueryTypes, Op } = require('sequelize');
const p = require('./superAdmin.policy');
const { accountControl, assertAccountAccess } = require('./adminAccountAccess.service');
const { toSafeTeacherProfile } = require('./teacherAuth.service');
const { toSafeDepartmentStaffProfile } = require('./staffAuth.service');
const { resolveAdminPrincipal, stampMatches, credentialStamp } = require('./teacherAdminGrant.service');
const ADMIN_LOCK = 'SELECT pg_advisory_xact_lock(63828018)';
const BASE_FIELDS = ['id', 'first_name', 'last_name', 'email'];
const ACCOUNT_UNION = `
 SELECT id,email,first_name,last_name,'student'::text AS actor_type,'student'::text AS role,true AS native_active FROM public.students
 UNION ALL SELECT id,email,first_name,last_name,'teacher',CASE WHEN is_department_head THEN 'department_head' ELSE 'teacher' END,status='active' FROM public.teachers
 UNION ALL SELECT id,email,first_name,last_name,'department_staff','department_staff',is_active FROM public.department_staffs
 UNION ALL SELECT id,email,first_name,last_name,'super_admin','super_admin',is_active FROM public.super_admins WHERE teacher_id IS NULL`;
const ACCOUNT_VIEW = `SELECT a.*,a.native_active AND COALESCE(c.enabled,true) AS active,g.id AS admin_grant_id,
 COALESCE(g.is_active,false) AS admin_enabled FROM (${ACCOUNT_UNION}) a LEFT JOIN public.admin_account_controls c ON c.actor_type=a.actor_type AND c.actor_id=a.id
 LEFT JOIN public.super_admins g ON a.actor_type='teacher' AND g.teacher_id=a.id`;
function createSuperAdminService({ models = require('../models'), now = Date.now } = {}) {
  const db = models.sequelize;
  const types = { student: models.Student, teacher: models.Teacher, department_staff: models.DepartmentStaff, super_admin: models.SuperAdmin };
  const select = (sql, replacements = {}, transaction) => db.query(sql, { type: QueryTypes.SELECT, replacements, transaction });
  function model(type) { if (!Object.hasOwn(types, type)) p.fail('ประเภทบัญชีไม่ถูกต้อง'); return types[type]; }
  async function settingRows(transaction) { return models.SystemSetting.findAll({ transaction }); }
  async function pageSize() { const row = await models.SystemSetting.findByPk('admin.page_size'); return row && Number.isInteger(row.value) && row.value >= 10 && row.value <= 100 ? row.value : p.SETTINGS['admin.page_size'].default; }
  async function overview() {
    const [counts] = await select(`SELECT count(*)::int AS total,count(*) FILTER(WHERE actor_type='student')::int AS students,
      count(*) FILTER(WHERE actor_type='teacher')::int AS teachers,count(*) FILTER(WHERE role='department_head')::int AS department_heads,
      count(*) FILTER(WHERE actor_type='department_staff')::int AS department_staff,count(*) FILTER(WHERE actor_type='super_admin' OR admin_enabled)::int AS super_admins,
      count(*) FILTER(WHERE active)::int AS active,count(*) FILTER(WHERE NOT active)::int AS inactive FROM (${ACCOUNT_VIEW}) a`);
    return counts;
  }
  async function accounts(query) {
    const q = p.listQuery(query, await pageSize());
    const where = `(:role = 'all' OR role = :role OR (:role = 'super_admin' AND admin_grant_id IS NOT NULL)) AND (:active = 'all' OR active = CAST(NULLIF(:active,'all') AS boolean))
      AND (:search = '' OR concat_ws(' ',first_name,last_name,email) ILIKE :pattern ESCAPE '!')`;
    const replacements = { ...q, pattern: `%${q.search.replace(/[!%_]/g, '!$&')}%` };
    const [count] = await select(`SELECT count(*)::int AS total FROM (${ACCOUNT_VIEW}) a WHERE ${where}`, replacements);
    const rows = await select(`SELECT id,email,first_name,last_name,actor_type,role,active,admin_grant_id,admin_enabled FROM (${ACCOUNT_VIEW}) a WHERE ${where} ORDER BY role,email NULLS LAST,id LIMIT :limit OFFSET :offset`, replacements);
    return { rows, total: count.total, page: q.page, limit: q.limit };
  }
  async function detail(type, id, transaction) {
    p.uuid(id); const row = await model(type).findByPk(id, { transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
    if (!row) p.fail('ไม่พบบัญชี', 404);
    if (type === 'super_admin' && row.teacher_id) p.fail('Membership นี้ใช้ Teacher Identity เดิม กรุณาเปิดบัญชีอาจารย์', 409);
    const grant = type === 'teacher' && models.SuperAdmin.rawAttributes?.teacher_id ? await models.SuperAdmin.findOne({ where: { teacher_id: id }, transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) }) : null;
    const control = await accountControl(models, type, id, transaction);
    const data = type === 'teacher' ? toSafeTeacherProfile(row) : type === 'department_staff' ? toSafeDepartmentStaffProfile(row)
      : type === 'super_admin' ? p.safeAdmin(row) : Object.fromEntries([...BASE_FIELDS, 'student_id', 'major', 'track', 'status'].map(key => [key, row[key]]));
    const nativeActive = type === 'teacher' ? row.status === 'active' : type === 'student' ? true : row.is_active;
    const result = { ...data, actor_type: type, role: type === 'teacher' && row.is_department_head ? 'department_head' : type, active: !!nativeActive && control?.enabled !== false };
    if (grant) Object.assign(result, { teacher_id: row.id, admin_grant_id: grant.id, admin_enabled: grant.is_active, permissions: grant.permissions });
    const version = '"' + createHash('sha256').update(JSON.stringify({ data: result, updatedAt: row.updatedAt, grant_version: grant?.session_version, control: control ? { version: control.version, enabled: control.enabled, revoked_before: control.revoked_before } : null })).digest('hex') + '"';
    return { data: result, version, row, control, grant };
  }
  const publicDetail = ({ data, version }) => ({ data, version });
  function expected(actual, supplied) { if (!supplied) p.fail('ต้องส่ง If-Match ก่อนแก้ไข', 428); if (typeof supplied !== 'string' || supplied !== actual) p.fail('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดและตรวจสอบใหม่', 409); }
  async function audit(admin, action, type, id, changes, transaction) {
    await models.AdminAuditLog.create({ actor_id: admin.id, action, target_type: type, target_id: id, changes }, { transaction });
  }
  async function privileged(claims, permission, body, extra, operation) {
    p.developmentOnly(); p.privilegedBody(body, extra);
    return db.transaction(async transaction => {
      // All admin changes (including bootstrap/logout) share this lock. It
      // serializes last-admin checks and prevents concurrent permission races.
      await db.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await db.query(ADMIN_LOCK, { transaction });
      const actor = await resolveAdminPrincipal(models, claims, { transaction, lock: transaction.LOCK.UPDATE });
      if (!actor) p.fail('Admin Session ถูกเพิกถอนแล้ว', 401);
      if (permission) p.requirePermission(actor, permission);
      if (!await actor.comparePassword(body.password)) p.fail('รหัสผ่านยืนยันไม่ถูกต้อง', 403);
      return operation(actor, transaction);
    });
  }
  async function protectGovernance(transaction) {
    const candidates = await models.SuperAdmin.findAll({ where: { is_active: true }, transaction });
    for (const admin of candidates) {
      if (admin.teacher_id) {
        const teacher = await models.Teacher.findByPk(admin.teacher_id, { transaction });
        if (!teacher || teacher.status !== 'active' || teacher.is_department_head || !stampMatches(admin, teacher) || (await accountControl(models, 'teacher', teacher.id, transaction))?.enabled === false) continue;
      }
      const control = await accountControl(models, 'super_admin', admin.id, transaction);
      if (control?.enabled !== false && p.GOVERNANCE.every(key => p.allowed(admin, key))) return;
    }
    p.fail('ห้ามปิดใช้งานหรือลดสิทธิ์ Super Admin ผู้ดูแลสิทธิ์คนสุดท้าย', 409);
  }
  async function update(claims, type, id, body, version) {
    return privileged(claims, 'accounts.write', body, ['changes'], async (admin, transaction) => {
      const current = await detail(type, id, transaction); expected(current.version, version);
      const fields = type === 'student' ? [] : type === 'teacher' ? ['first_name', 'last_name', 'first_name_en', 'last_name_en', 'academic_title', 'position']
        : type === 'department_staff' ? ['first_name', 'last_name', 'first_name_en', 'last_name_en', 'position'] : ['first_name', 'last_name'];
      if (!fields.length) p.fail('การแก้ Student Profile เป็น Pending: ต้องผ่าน owner aggregate revision และ validation เดิม', 409);
      p.object(body.changes, fields);
      const changes = {}, values = {};
      for (const [key, value] of Object.entries(body.changes)) {
        values[key] = value === null && !['first_name', 'last_name'].includes(key) ? null : p.text(value, key, type === 'super_admin' || type === 'department_staff' && ['first_name', 'last_name'].includes(key) ? 100 : 255);
        changes[key] = { before: current.row[key] ?? null, after: values[key] };
      }
      await current.row.update(values, { transaction });
      await audit(admin, 'account.update', type, id, changes, transaction);
      return publicDetail(await detail(type, id, transaction));
    });
  }
  async function status(claims, type, id, body, version) {
    return privileged(claims, 'accounts.status', body, ['enabled'], async (admin, transaction) => {
      if (typeof body.enabled !== 'boolean') p.fail('สถานะต้องเป็น boolean');
      // Owner Profile/Advisor writers lock Student before checking Teacher.
      // This table lock follows that order and closes the assignment race
      // without changing those workflows. Read-only Student pages still work.
      if (type === 'teacher') await db.query('LOCK TABLE public.students IN EXCLUSIVE MODE', { transaction });
      const current = await detail(type, id, transaction); expected(current.version, version);
      if (current.data.active === body.enabled) p.fail('สถานะตรงกับข้อมูลปัจจุบันแล้ว กรุณาโหลดใหม่', 409);
      if (type === 'teacher' && !body.enabled && (current.row.is_department_head
        || await models.Student.count({ where: { [Op.or]: [{ advisor_teacher_id: id }, { coop_advisor_teacher_id: id }] }, transaction })
        || await models.CoopProjectAdvisorRequest.count({ where: { requested_advisor_teacher_id: id, status: { [Op.in]: ['pending', 'confirmed'] } }, transaction }))) p.fail('บัญชีมีบทบาท Head/Advisor หรือคำขอที่ปรึกษา ต้องจัดการ workflow เดิมก่อนปิดใช้งาน', 409);
      if (body.enabled && (type === 'teacher' && current.row.status !== 'active' || type === 'department_staff' && !current.row.is_active) && current.control?.enabled !== false) p.fail('สถานะเดิมใน Actor Model ไม่เปิดใช้งาน ต้องผ่าน workflow เดิมก่อน', 409);
      const control = current.control || await models.AdminAccountControl.create({ actor_type: type, actor_id: id }, { transaction });
      await control.update({ enabled: body.enabled, revoked_before: Math.floor(now() / 1000), version: control.version + 1 }, { transaction });
      if (type === 'super_admin') await current.row.update({ is_active: body.enabled, session_version: current.row.session_version + 1 }, { transaction });
      if (type === 'teacher') await current.row.update({ status: body.enabled ? 'active' : 'inactive' }, { transaction });
      if (type === 'department_staff') await current.row.update({ is_active: body.enabled }, { transaction });
      await protectGovernance(transaction);
      await audit(admin, 'account.status', type, id, { active: { before: current.data.active, after: body.enabled } }, transaction);
      return publicDetail(await detail(type, id, transaction));
    });
  }
  async function changePermissions(claims, id, body, version, type = 'super_admin') {
    return privileged(claims, 'permissions.write', body, ['permissions'], async (admin, transaction) => {
      const value = p.permissions(body.permissions), current = await detail(type, id, transaction); expected(current.version, version);
      const grant = current.grant || (type === 'super_admin' ? current.row : null);
      if (!grant) p.fail('ไม่พบ Admin membership', 404);
      const before = grant.permissions;
      await grant.update({ permissions: value, session_version: grant.session_version + 1 }, { transaction });
      await protectGovernance(transaction);
      await audit(admin, 'account.permissions', type, id, { permissions: { before, after: value } }, transaction);
      return publicDetail(await detail(type, id, transaction));
    });
  }
  async function settings() {
    const rows = await settingRows();
    return Object.entries(p.SETTINGS).map(([key, spec]) => { const row = rows.find(r => r.key === key); return { key, ...spec, value: row?.value ?? spec.default, version: String(row?.version ?? 0) }; });
  }
  async function updateSetting(claims, key, body, version) {
    return privileged(claims, 'settings.write', body, ['value'], async (admin, transaction) => {
      const value = p.settingValue(key, body.value), row = await models.SystemSetting.findByPk(key, { transaction });
      expected('"' + (row?.version ?? 0) + '"', version);
      const before = row?.value ?? p.SETTINGS[key].default;
      if (row) await row.update({ value, version: row.version + 1, updated_by: admin.id }, { transaction });
      else await models.SystemSetting.create({ key, value, version: 1, updated_by: admin.id }, { transaction });
      await audit(admin, 'setting.update', 'setting', key, { value: { before, after: value } }, transaction);
      return { key, value, activation: 'immediate' };
    });
  }
  async function logs(query) {
    p.object(query, ['page', 'limit'], { empty: true }); const q = p.listQuery(query);
    const result = await models.AdminAuditLog.findAndCountAll({ attributes: ['id', 'actor_id', 'action', 'target_type', 'target_id', 'changes', 'createdAt'], order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: q.limit, offset: q.offset });
    return { rows: result.rows, total: result.count, page: q.page, limit: q.limit };
  }
  async function ownPassword(claims, body, version) {
    return privileged(claims, null, body, ['new_password'], async (admin, transaction) => {
      const type = admin.teacher_id ? 'teacher' : 'super_admin', id = admin.teacher_id || admin.id;
      const current = await detail(type, id, transaction); expected(current.version, version);
      p.strongPassword(body.new_password);
      if (await admin.comparePassword(body.new_password)) p.fail('ใช้รหัสผ่านใหม่ที่ต่างจากเดิม');
      if (admin.teacher_id) {
        await admin.teacher.update({ password: body.new_password }, { transaction, fields: ['password', 'password_hash', 'updatedAt'] });
        const persisted = await models.Teacher.findByPk(admin.teacher_id, { transaction });
        if (!await persisted.comparePassword(body.new_password)) throw Error('Credential persistence verification failed');
        await admin.grant.update({ credential_stamp: credentialStamp(persisted), session_version: admin.grant.session_version + 1 }, { transaction });
        await revokeTeacher(admin.teacher_id, transaction);
      } else await admin.update({ password: body.new_password, session_version: admin.session_version + 1 }, { transaction, fields: ['password', 'password_hash', 'session_version', 'updatedAt'] });
      await audit(admin, 'account.password', type, id, { credential_changed: true }, transaction);
      return { sign_in_required: true };
    });
  }
  async function logout(claims) {
    return db.transaction(async transaction => {
      await db.query(ADMIN_LOCK, { transaction });
      const admin = await resolveAdminPrincipal(models, claims, { transaction, lock: transaction.LOCK.UPDATE });
      if (!admin) p.fail('Admin Session ถูกเพิกถอนแล้ว', 401);
      const grant = admin.grant || admin;
      await grant.update({ session_version: grant.session_version + 1 }, { transaction });
      if (admin.teacher_id) await revokeTeacher(admin.teacher_id, transaction);
      await audit(admin, 'session.logout', admin.teacher_id ? 'teacher' : 'super_admin', admin.teacher_id || admin.id, {}, transaction);
      return { success: true };
    });
  }
  async function revokeTeacher(id, transaction) {
    const current = await accountControl(models, 'teacher', id, transaction) || await models.AdminAccountControl.create({ actor_type: 'teacher', actor_id: id }, { transaction });
    await current.update({ revoked_before: Math.floor(now() / 1000), version: current.version + 1 }, { transaction });
  }
  async function own(claims) {
    const admin = await resolveAdminPrincipal(models, claims);
    if (!admin) p.fail('Admin Session ถูกเพิกถอนแล้ว', 403);
    return publicDetail(await detail(admin.teacher_id ? 'teacher' : 'super_admin', admin.teacher_id || admin.id));
  }
  async function membershipStatus(claims, id, body, version) {
    return privileged(claims, 'accounts.status', body, ['enabled'], async (admin, transaction) => {
      if (typeof body.enabled !== 'boolean') p.fail('สถานะต้องเป็น boolean');
      const current = await detail('teacher', id, transaction); expected(current.version, version);
      if (!current.grant) p.fail('ไม่พบ Admin membership', 404);
      if (body.enabled && (current.row.status !== 'active' || current.row.is_department_head || current.control?.enabled === false || !stampMatches(current.grant, current.row))) p.fail('ต้องยืนยันตัวตนใหม่ผ่าน Secure Terminal', 409);
      await current.grant.update({ is_active: body.enabled, session_version: current.grant.session_version + 1 }, { transaction });
      await protectGovernance(transaction);
      await audit(admin, 'membership.status', 'teacher', id, { enabled: body.enabled }, transaction);
      return publicDetail(await detail('teacher', id, transaction));
    });
  }
  return { overview, accounts, own, detail: async (type, id) => publicDetail(await detail(type, id)), update, status, changePermissions, membershipStatus, settings, updateSetting, logs, ownPassword, logout };
}
module.exports = { createSuperAdminService, ADMIN_LOCK };
