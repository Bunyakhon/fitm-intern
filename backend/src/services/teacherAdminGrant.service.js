const { createHmac, timingSafeEqual } = require('node:crypto');
const { QueryTypes } = require('sequelize');
const p = require('./superAdmin.policy');
const { assertAccountAccess } = require('./adminAccountAccess.service');
function credentialStamp(teacher) {
  if (!process.env.JWT_SECRET || !teacher?.password_hash || !teacher.id) throw Error('Credential context required');
  return createHmac('sha256', process.env.JWT_SECRET).update('teacher-admin-v1\0' + teacher.id + '\0' + teacher.password_hash).digest('hex');
}
function stampMatches(grant, teacher) {
  const actual = credentialStamp(teacher), expected = grant.credential_stamp;
  return typeof expected === 'string' && expected.length === actual.length && timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
async function membershipReady(models, transaction) {
  if (!models.SuperAdmin?.rawAttributes?.teacher_id) return false;
  const [row] = await models.sequelize.query("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='super_admins' AND column_name='teacher_id') AS ready", { type: QueryTypes.SELECT, transaction });
  return row.ready;
}
async function passwordGrant(models, teacher, transaction) {
  if (process.env.NODE_ENV !== 'development' || teacher.is_department_head || teacher.status !== 'active' || !await membershipReady(models, transaction)) return null;
  const grant = await models.SuperAdmin.findOne({ where: { teacher_id: teacher.id, is_active: true }, transaction });
  if (!grant || !stampMatches(grant, teacher)) return null;
  await assertAccountAccess(models, 'super_admin', grant.id, { transaction });
  return grant;
}
function principal(grant, teacher) {
  return { id: grant.id, teacher_id: teacher.id, identity_id: teacher.id, identity_actor_type: 'teacher', email: teacher.email, first_name: teacher.first_name, last_name: teacher.last_name,
    is_active: grant.is_active && teacher.status === 'active', permissions: grant.permissions, session_version: grant.session_version,
    comparePassword: password => teacher.comparePassword(password), grant, teacher };
}
async function resolveAdminPrincipal(models, claims, { transaction, lock } = {}) {
  if (process.env.NODE_ENV !== 'development') return null;
  if (claims.actor_type === 'super_admin' && claims.role === 'super_admin') {
    const admin = await models.SuperAdmin.findByPk(claims.id, { transaction, ...(lock ? { lock } : {}) });
    if (!admin || admin.teacher_id || !admin.is_active || admin.session_version !== claims.session_version) return null;
    await assertAccountAccess(models, 'super_admin', admin.id, { transaction, issuedAt: claims.iat });
    return admin;
  }
  // Membership alone is insufficient: only a fresh password-verified JWT
  // carrying this exact grant/version can use privileged APIs.
  if (claims.actor_type !== 'teacher' || claims.role !== 'teacher' || claims.teacher_id !== claims.id
    || typeof claims.admin_grant_id !== 'string' || !Number.isInteger(claims.admin_session_version) || !Number.isFinite(claims.iat) || !Number.isFinite(claims.exp) || claims.exp - claims.iat > 901) return null;
  try { p.uuid(claims.admin_grant_id); } catch { return null; }
  const teacher = await models.Teacher.findByPk(claims.id, { transaction, ...(lock ? { lock } : {}) });
  if (!teacher || teacher.status !== 'active' || teacher.is_department_head) return null;
  await assertAccountAccess(models, 'teacher', teacher.id, { transaction, issuedAt: claims.iat });
  const grant = await models.SuperAdmin.findByPk(claims.admin_grant_id, { transaction, ...(lock ? { lock } : {}) });
  if (!grant || !grant.is_active || grant.teacher_id !== teacher.id || grant.session_version !== claims.admin_session_version || !stampMatches(grant, teacher)) return null;
  await assertAccountAccess(models, 'super_admin', grant.id, { transaction, issuedAt: claims.iat });
  return principal(grant, teacher);
}
module.exports = { credentialStamp, stampMatches, membershipReady, passwordGrant, principal, resolveAdminPrincipal };
