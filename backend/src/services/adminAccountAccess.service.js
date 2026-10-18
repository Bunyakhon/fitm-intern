const { QueryTypes } = require('sequelize');
// Missing additive tables keep pre-existing deployments working. Other DB
// failures fail closed. This is not a bypass for an existing disabled account.
async function accountControl(models, type, id, transaction) {
  if (!models.AdminAccountControl) return null;
  const [ready] = await models.sequelize.query("SELECT to_regclass('public.admin_account_controls') IS NOT NULL AS ready", { type: QueryTypes.SELECT, transaction });
  if (!ready.ready) return null;
  return models.AdminAccountControl.findOne({ where: { actor_type: type, actor_id: id }, transaction });
}
async function assertAccountAccess(models, type, id, { transaction, issuedAt } = {}) {
  const control = await accountControl(models, type, id, transaction);
  if (control && (!control.enabled || (issuedAt !== undefined && (!Number.isFinite(issuedAt) || issuedAt <= Number(control.revoked_before))))) {
    throw Object.assign(new Error('บัญชีถูกปิดใช้งานหรือ Session ถูกเพิกถอน กรุณาเข้าสู่ระบบใหม่'), { status: 403, code: 'ACCOUNT_UNAUTHORIZED' });
  }
}
module.exports = { accountControl, assertAccountAccess };
