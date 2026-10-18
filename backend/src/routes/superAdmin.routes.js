const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { createSuperAdminService } = require('../services/superAdmin.service');
const p = require('../services/superAdmin.policy');
function createSuperAdminRouter({ authenticate = authenticateToken, service = createSuperAdminService(), limits = true } = {}) {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(authenticate);
  router.use((req, res, next) => {
    if (!req.superAdmin?.is_active) return res.status(403).json({ code: 'ADMIN_FORBIDDEN', message: 'Super Admin authorization required' });
    try { p.developmentOnly(); next(); } catch (error) { res.status(error.status).json({ message: error.message }); }
  });
  if (limits) router.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'เรียกใช้งานถี่เกินกำหนด กรุณารอสักครู่' } }));
  const writes = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'ยืนยันการดำเนินการถี่เกินกำหนด กรุณารอสักครู่' } });
  if (limits) router.use((req, res, next) => ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) ? writes(req, res, next) : next());
  const handle = (permission, fn) => async (req, res) => {
    try { if (permission) p.requirePermission(req.superAdmin, permission); const result = await fn(req); if (result?.version) res.set('ETag', result.version); res.json(result); }
    catch (error) {
      if (['55P03', '40P01', '40001'].includes(error.original?.code)) return res.status(409).json({ message: 'มี workflow อื่นกำลังบันทึก กรุณาโหลดข้อมูลและลองใหม่' });
      const status = [400, 401, 403, 404, 409, 428].includes(error.status) ? error.status : error.name === 'SequelizeValidationError' ? 400 : error.name === 'SequelizeUniqueConstraintError' ? 409 : 500;
      res.status(status).json({ message: status === 500 ? 'ระบบผู้ดูแลยังไม่พร้อมใช้งาน กรุณาลองใหม่' : status === 400 && error.name?.startsWith('Sequelize') ? 'ข้อมูลไม่ผ่าน validation ของระบบ' : status === 409 && error.name?.startsWith('Sequelize') ? 'ข้อมูลซ้ำกับบัญชีที่มีอยู่' : error.message });
    }
  };
  router.get('/me', handle(null, req => service.own(req.user)));
  router.get('/overview', handle('overview.read', () => service.overview()));
  router.get('/accounts', handle('accounts.read', req => service.accounts(req.query)));
  router.get('/accounts/:type/:id', handle('accounts.read', req => service.detail(req.params.type, req.params.id)));
  router.patch('/accounts/:type/:id', handle('accounts.write', req => service.update(req.user, req.params.type, req.params.id, req.body, req.get('If-Match'))));
  router.post('/accounts/:type/:id/status', handle('accounts.status', req => service.status(req.user, req.params.type, req.params.id, req.body, req.get('If-Match'))));
  router.put('/accounts/super_admin/:id/permissions', handle('permissions.write', req => service.changePermissions(req.user, req.params.id, req.body, req.get('If-Match'))));
  router.put('/accounts/teacher/:id/permissions', handle('permissions.write', req => service.changePermissions(req.user, req.params.id, req.body, req.get('If-Match'), 'teacher')));
  router.post('/memberships/teacher/:id/status', handle('accounts.status', req => service.membershipStatus(req.user, req.params.id, req.body, req.get('If-Match'))));
  router.get('/permissions', handle(null, req => ({ permissions: p.PERMISSIONS, own: req.superAdmin.permissions, roles: ['student', 'teacher', 'department_head', 'department_staff', 'super_admin'], pending: 'Teacher + Super Admin ใช้ membership บนบัญชีเดิม; การย้าย Actor/Head/Advisor ยังต้องผ่าน workflow เฉพาะ ไม่ข้าม ownership หรือเปิดเอกสารส่วนตัว' })));
  router.get('/settings', handle('settings.write', () => service.settings()));
  router.put('/settings/:key', handle('settings.write', req => service.updateSetting(req.user, req.params.key, req.body, req.get('If-Match'))));
  router.get('/audit', handle('audit.read', req => service.logs(req.query)));
  router.post('/me/password', handle(null, req => service.ownPassword(req.user, req.body, req.get('If-Match'))));
  router.post('/logout', handle(null, req => service.logout(req.user)));
  return router;
}
module.exports = { createSuperAdminRouter };
