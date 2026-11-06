const express = require('express');
const { createCatalogService } = require('../services/coopPrerequisiteCatalog.service');
function createCatalogRouter(models) {
  const router = express.Router(), service = createCatalogService(models);
  const handler = action => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { return res.json({ success: true, data: await action(req) }); }
    catch (error) {
      const status = [400, 403, 404, 409].includes(error.status) ? error.status : error.name === 'SequelizeUniqueConstraintError' ? 409 : error.name === 'SequelizeValidationError' ? 400 : 500;
      return res.status(status).json({ success: false, message: error.status ? error.message : status === 409 ? 'รหัสรายวิชาซ้ำในสาขานี้ กรุณาตรวจสอบข้อมูลล่าสุด' : status === 400 ? 'ข้อมูลรายวิชาไม่ถูกต้อง' : 'ไม่สามารถจัดการ Catalog ได้', ...(error.code?.startsWith('COOP_PREREQUISITE_') ? { code: error.code } : {}) });
    }
  };
  // Mounted only after the live DepartmentStaff/JWT middleware in roleWorkflow.routes.
  router.get('/permissions', handler(req => service.capabilities(req.user.id)));
  router.get('/', handler(req => service.list(req.user.id, req.query.program)));
  router.post('/', handler(req => service.save(req.user.id, null, req.body)));
  router.patch('/:id', handler(req => service.save(req.user.id, req.params.id, req.body)));
  return router;
}
module.exports = { createCatalogRouter };
