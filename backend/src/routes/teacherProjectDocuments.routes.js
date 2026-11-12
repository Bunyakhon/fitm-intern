const express = require('express');
const path = require('node:path');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { createRequireTeacher } = require('../middlewares/teacherAuth.middleware');
const { createTeacherProjectDocumentsService } = require('../services/teacherProjectDocuments.service');

function createTeacherProjectDocumentsRouter({ models = require('../models'), service = createTeacherProjectDocumentsService(models), authenticate = authenticateToken } = {}) {
  const router = express.Router();
  router.use((req, res, next) => { res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }); next(); });
  // Public, allowlisted library code already installed with pdf-parse. This is
  // never a storage directory or a student document route.
  const viewerAsset = (req, res) => {
    const group = req.params.group, asset = req.params.asset;
    const permitted = !group ? ['pdf.mjs', 'pdf.worker.mjs'].includes(asset)
      : group === 'cmaps' ? /^[a-z0-9_-]+\.bcmap$/i.test(asset)
      : group === 'standard_fonts' && /^[a-z0-9_-]+\.(pfb|ttf)$/i.test(asset);
    if (!permitted) return res.status(404).json({ message: 'ไม่พบส่วนประกอบตัวแสดง PDF' });
    try {
      const root = path.dirname(require.resolve('pdfjs-dist/package.json'));
      res.type(group ? 'application/octet-stream' : 'text/javascript');
      res.sendFile(path.join(root, group || 'build', asset), error => {
        if (error && !res.headersSent) res.status(503).json({ message: 'ตัวแสดง PDF ยังไม่พร้อม กรุณาลองใหม่หรือดาวน์โหลดไฟล์' });
      });
    } catch { res.status(503).json({ message: 'ตัวแสดง PDF ยังไม่พร้อม กรุณาลองใหม่หรือดาวน์โหลดไฟล์' }); }
  };
  router.get('/viewer-assets/:asset', viewerAsset);
  router.get('/viewer-assets/:group/:asset', viewerAsset);
  // No manager/admin capability branch. Even a Head/Teacher admin member must
  // have an actual Teacher session AND the student's explicit coop assignment.
  router.use(authenticate, createRequireTeacher({ TeacherModel: models.Teacher }));
  const wrap = action => async (req, res) => {
    try { await action(req, res); }
    catch (error) {
      const pg = error.original?.code || error.parent?.code;
      const status = ['42P01','42703'].includes(pg) ? 503 : [400,401,403,404,409,503].includes(error.status) ? error.status : 500;
      const code = error.status && error.code ? error.code : status === 503 ? 'DOCUMENTS_SCHEMA_NOT_READY' : 'DOCUMENTS_ERROR';
      res.status(status).json({ code, message: error.status ? error.message : status === 503 ? 'ระบบเอกสารยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ' : 'โหลดเอกสารไม่สำเร็จ กรุณาลองอีกครั้ง' });
    }
  };
  router.get('/students', wrap(async (req,res) => res.json(await service.list(req.teacher.id,req.query))));
  router.get('/students/:studentId', wrap(async (req,res) => res.json(await service.detail(req.teacher.id,req.params.studentId,req.query))));
  for (const action of ['preview','download']) router.get(`/students/:studentId/documents/:category/files/:fileId/${action}`, wrap(async (req,res) => {
    const file = await service.file(req.teacher.id,req.params.studentId,req.params.category,req.params.fileId,req.query.revision);
    const name = encodeURIComponent(file.name.replace(/[\r\n\\/]/g,'_')).replace(/['()*]/g,char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    res.set({ 'Content-Type': file.mime, 'Content-Disposition': `${action === 'preview' ? 'inline' : 'attachment'}; filename*=UTF-8''${name}`,
      'Content-Security-Policy': "sandbox; default-src 'none'" });
    res.send(file.buffer);
  }));
  return router;
}
module.exports = { createTeacherProjectDocumentsRouter };
