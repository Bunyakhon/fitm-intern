const express = require('express');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { createRequireTeacher } = require('../middlewares/teacherAuth.middleware');
const { createTeacherDashboardService } = require('../services/teacherDashboard.service');

function createTeacherDashboardRouter({ models = require('../models'), service = createTeacherDashboardService(models), authenticate = authenticateToken } = {}) {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  // Reuse signature, live role/account/revocation and active Teacher guards.
  router.use(authenticate, createRequireTeacher({ TeacherModel: models.Teacher }));
  router.get('/', async (req, res) => {
    try { res.json({ success: true, data: await service.read(req.teacher.id, req.query) }); }
    catch (error) {
      const pg = error.original?.code || error.parent?.code;
      const status = ['42P01', '42703'].includes(pg) ? 503 : [400, 403].includes(error.status) ? error.status : 500;
      res.status(status).json({ success: false, code: status === 503 ? 'DASHBOARD_NOT_READY' : 'DASHBOARD_ERROR',
        message: status === 400 ? 'ตัวกรองหรือหน้ารายการไม่ถูกต้อง' : status === 403 ? 'บัญชีนี้ไม่มีสิทธิ์อ่านภาพรวม' : 'โหลดภาพรวมไม่สำเร็จ กรุณาลองอีกครั้ง' });
    }
  });
  return router;
}
module.exports = { createTeacherDashboardRouter };
