const express = require('express');
const { createStaffDocumentsService } = require('../services/staffDocuments.service');
function createStaffDocumentsRouter(registry) {
  const router = express.Router(), service = createStaffDocumentsService(registry);
  function handler(action) {
    return async (req, res) => {
      try { await action(req, res); }
      catch (error) {
        const status = [400, 403, 404, 409].includes(error.status) ? error.status : error.name === 'SequelizeUniqueConstraintError' || ['40001', '40P01'].includes(error.parent?.code) ? 409 : 500;
        res.status(status).json({ success: false, message: error.status === status ? error.message : status === 409 ? 'ข้อมูลขัดแย้ง กรุณาโหลดข้อมูลล่าสุด' : 'ไม่สามารถดำเนินการเอกสารได้', ...(error.code && error.status === status ? { code: error.code } : {}), ...(error.missing_fields ? { missing_fields: error.missing_fields } : {}) });
      }
    };
  }
  router.get('/', handler(async (req, res) => res.json({ success: true, data: await service.list(req.user.id, req.query) })));
  router.get('/:id', handler(async (req, res) => res.json({ success: true, data: await service.detail(req.user.id, req.params.id) })));
  router.get('/:id/company-response', handler(async (req, res) => res.json({ success: true, data: await service.getCompanyResponse(req.user.id, req.params.id) })));
  router.get('/:id/company-response/history', handler(async (req, res) => res.json({ success: true, data: (await service.getCompanyResponse(req.user.id, req.params.id)).history })));
  router.post('/:id/company-response', handler(async (req, res) => res.json({ success: true, data: await service.recordCompanyResponse(req.user.id, req.params.id, req.body) })));
  router.put('/:id/company-response', handler(async (req, res) => res.json({ success: true, data: await service.recordCompanyResponse(req.user.id, req.params.id, req.body, true) })));
  router.get('/:id/placement-eligibility', handler(async (req, res) => res.json({ success: true, data: (await service.detail(req.user.id, req.params.id)).placement })));
  for (const [method, suffix, action] of [['post', '', 'create'], ['put', '', 'edit'], ['post', '/generate', 'generate']])
    router[method]('/:id/documents/:type' + suffix, handler(async (req, res) => res.json({ success: true, data: await service.mutate(req.user.id, req.params.id, req.params.type, action, req.body) })));
  for (const mode of ['preview', 'download']) router.get('/:id/documents/:type/' + mode, handler(async (req, res) => {
    const result = await service.content(req.user.id, req.params.id, req.params.type, req.query);
    res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `${mode === 'download' ? 'attachment' : 'inline'}; filename="${result.filename}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; sandbox allow-modals" });
    res.send(result.html);
  }));
  return router;
}
module.exports = { createStaffDocumentsRouter };
