const express = require('express');
const { authenticateToken, authenticateStudentToken, createRequireDepartmentStaff } = require('../middlewares/auth.middleware');
const { createCoopActivityService } = require('../services/coopActivity.service');
function createCoopActivitiesRouter({ models = require('../models') } = {}) {
  const router = express.Router(), service = createCoopActivityService(models);
  router.use((req,res,next) => { res.set('Cache-Control','private, no-store'); next(); });
  const action = fn => async (req,res) => { try { await fn(req,res); } catch (error) { const duplicate = error.name === 'SequelizeUniqueConstraintError'; res.status(error.status || (duplicate ? 409 : 500)).json({ code: error.code || (duplicate ? 'DUPLICATE_ACTIVITY' : 'ACTIVITY_ERROR'), message: error.status ? error.message : duplicate ? 'มีกิจกรรมชื่อและวันเวลานี้แล้ว กรุณาโหลดข้อมูลล่าสุด' : 'ดำเนินการปฏิทินไม่สำเร็จ กรุณาลองใหม่' }); } };
  router.use('/student', authenticateStudentToken);
  // Student claims alone cannot access the calendar after the account is removed.
  router.use('/student', async (req,res,next) => { try { if (!await models.Student.findOne({ where: { id: req.user.id, student_id: req.user.student_id }, attributes: ['id'] })) return res.status(403).json({ message: 'Student authorization is required' }); next(); } catch { res.status(500).json({ message: 'Unable to verify student authorization' }); } });
  router.get('/student', action(async (req,res) => res.json(await service.list(req.query))));
  router.get('/student/:id', action(async (req,res) => res.json(await service.detail(req.params.id))));
  router.use('/staff', authenticateToken, createRequireDepartmentStaff({ StaffModel: models.DepartmentStaff }));
  router.get('/staff', action(async (req,res) => res.json(await service.list(req.query,true))));
  router.get('/staff/:id', action(async (req,res) => res.json(await service.detail(req.params.id,true))));
  router.post('/staff', action(async (req,res) => { const result = await service.create(req.departmentStaff.id,req.body); res.status(result.replayed ? 200 : 201).json(result); }));
  router.put('/staff/:id', action(async (req,res) => res.json(await service.update(req.departmentStaff.id,req.params.id,req.body))));
  router.post('/staff/:id/cancel', action(async (req,res) => res.json(await service.update(req.departmentStaff.id,req.params.id,req.body,true))));
  return router;
}
module.exports = { createCoopActivitiesRouter };
