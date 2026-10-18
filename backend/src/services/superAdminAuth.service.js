const jwt = require('jsonwebtoken');
const { QueryTypes } = require('sequelize');
const { developmentOnly, safeAdmin } = require('./superAdmin.policy');
async function adminReady(models, transaction) {
  if (!models.SuperAdmin || process.env.NODE_ENV !== 'development') return false;
  const [row] = await models.sequelize.query("SELECT to_regclass('public.super_admins') IS NOT NULL AS ready", { type: QueryTypes.SELECT, transaction });
  return row.ready;
}
function superAdminSession(actor) {
  developmentOnly();
  if (!process.env.JWT_SECRET) throw Error('JWT configuration required');
  return { token: jwt.sign({ id: actor.id, super_admin_id: actor.id, actor_type: 'super_admin', role: 'super_admin', session_version: actor.session_version }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '15m' }), admin: safeAdmin(actor) };
}
module.exports = { adminReady, superAdminSession };
