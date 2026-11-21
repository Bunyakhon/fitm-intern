const p = require('./teacherPassword.policy');
const { assertAccountAccess } = require('./adminAccountAccess.service');
const { membershipReady, credentialStamp, stampMatches } = require('./teacherAdminGrant.service');
function createTeacherPasswordService(m) {
  function session(claims) {
    if (claims?.actor_type !== 'teacher' || claims.role !== 'teacher' || claims.teacher_id !== claims.id)
      p.fail(403, 'PASSWORD_FORBIDDEN', 'ใช้ได้เฉพาะบัญชีอาจารย์ของตนเอง');
    if (!Number.isFinite(claims.iat) || !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000)
      p.fail(401, 'PASSWORD_SESSION_REQUIRED', 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }
  async function work(claims, operation) {
    session(claims);
    return m.sequelize.transaction(async transaction => {
      await m.sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await m.sequelize.query("SET LOCAL statement_timeout = '15s'", { transaction });
      await m.sequelize.query('SELECT pg_advisory_xact_lock(63828018)', { transaction });
      const teacher = await m.Teacher.findByPk(claims.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!teacher || teacher.status !== 'active' || teacher.is_department_head) p.fail(403, 'PASSWORD_FORBIDDEN', 'บัญชีนี้ไม่มีสิทธิ์จัดการรหัสผ่านในหน้านี้');
      await assertAccountAccess(m, 'teacher', teacher.id, { transaction, issuedAt: claims.iat });
      const result = await operation(teacher, transaction);
      session(claims);
      return result;
    });
  }
  const status = claims => work(claims, async (teacher, transaction) => {
    await p.requireRevocationStorage(m, transaction);
    return { must_change_password: await p.mustChangePassword(teacher) };
  });
  const change = (claims, body) => {
    const values = p.passwordPayload(body);
    return work(claims, async (teacher, transaction) => {
      await p.requireRevocationStorage(m, transaction);
      if (!teacher.password_hash || !await teacher.comparePassword(values.current_password))
        p.fail(400, 'PASSWORD_CURRENT_INVALID', 'รหัสผ่านปัจจุบันไม่ถูกต้อง', 'current_password');
      if (await teacher.comparePassword(values.new_password)) p.fail(400, 'PASSWORD_REUSED', 'กรุณาใช้รหัสผ่านใหม่ที่ต่างจากเดิม', 'new_password');
      const grant = await membershipReady(m, transaction) ? await m.SuperAdmin.findOne({ where: { teacher_id: teacher.id }, transaction, lock: transaction.LOCK.UPDATE }) : null;
      const preserveGrant = grant && stampMatches(grant, teacher);
      // Keep the existing stronger Admin password/membership contract when the
      // same Teacher identity also owns that membership. No new grant is made.
      if (grant) {
        try { require('./superAdmin.policy').strongPassword(values.new_password); }
        catch (error) { p.fail(400, 'PASSWORD_INPUT', error.message, 'new_password'); }
      }
      await teacher.update({ password: values.new_password }, { transaction, fields: ['password', 'password_hash', 'updatedAt'] });
      if (preserveGrant) await grant.update({ credential_stamp: credentialStamp(teacher), session_version: grant.session_version + 1 }, { transaction });
      await p.revokeTeacherSessions(m, teacher.id, transaction);
      transaction.afterCommit(() => { console.info(JSON.stringify({ event: 'teacher.password.changed', actor_id: teacher.id, time: new Date().toISOString() })); });
      return { sign_in_required: true, must_change_password: false, message: 'เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่ด้วยรหัสผ่านใหม่' };
    });
  };
  const logout = claims => work(claims, async (teacher, transaction) => {
    await p.revokeTeacherSessions(m, teacher.id, transaction);
    return { signed_out: true };
  });
  return { status, change, logout };
}
module.exports = { createTeacherPasswordService };
