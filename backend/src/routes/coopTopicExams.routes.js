const express = require('express');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const { authenticateToken, requireCoopStudent } = require('../middlewares/auth.middleware');
const { createCoopTopicExamService } = require('../services/coopTopicExam.service');
const policy = require('../services/coopTopicExam.policy');
const rules = require('../services/coopTopicExam.rules');
function createCoopTopicExamsRouter({ models = require('../models'), authenticate = authenticateToken, service = createCoopTopicExamService(models), limits = true } = {}) {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  router.use(authenticate);
  if (limits) router.use(rateLimit({ windowMs: 60000, limit: 90, standardHeaders: 'draft-7', legacyHeaders: false }));
  const wrap = fn => async (req, res, next) => {
    try { await fn(req, res, next); } catch (error) {
      const pg = error.original?.code || error.parent?.code;
      const status = error.status || (['42P01','42703','57014'].includes(pg) ? 503 : ['55P03','40P01','40001','23505'].includes(pg) || error.name === 'SequelizeUniqueConstraintError' ? 409 : error.name === 'SequelizeValidationError' ? 400 : 500);
      const code = error.code && error.status ? error.code : pg === '57014' ? 'CO09_TIMEOUT' : status === 503 ? 'CO09_SCHEMA_NOT_READY' : status === 409 ? 'CO09_CONFLICT' : 'CO09_ERROR';
      res.status([400,401,403,404,409,413,428,503].includes(status) ? status : 500).json({ success: false, code, message: error.status ? error.message : code === 'CO09_TIMEOUT' ? 'การบันทึกใช้เวลานานเกินกำหนด กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่' : status === 503 ? 'CO-09 ยังไม่พร้อมใช้งาน: รออนุญาตติดตั้ง Schema' : status === 409 ? 'ข้อมูลขัดแย้ง กรุณาโหลดข้อมูลล่าสุด' : 'ไม่สามารถดำเนินการ CO-09 ได้ กรุณาลองใหม่' });
    }
  };
  const result = (res, data) => { if (data.version !== undefined) res.set('ETag', `"${data.version}"`); res.json({ success: true, data }); };
  const manager = wrap(async (req, res, next) => { req.topicExamActor = await policy.manager(req, models); next(); });
  router.get('/me', requireCoopStudent, wrap(async (req, res) => result(res, await service.detail(req.user.id))));
  router.put('/me/document-url', requireCoopStudent, wrap(async (req, res) => result(res, await service.saveDocument(req.user.id, req.body, req.get('If-Match')))));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: rules.MAX_PDF_BYTES, files: 1, fields: 0, parts: 2 }, fileFilter: (req, file, done) => done(null, file.mimetype === 'application/pdf' && /\.pdf$/i.test(file.originalname)) }).single('file');
  router.post('/me/document', requireCoopStudent, (req, res, next) => upload(req, res, error => error ? res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, code: 'CO09_FILE_INVALID', message: 'รองรับ PDF เท่านั้น ขนาดไม่เกิน 10MB' }) : next()), wrap(async (req, res) => {
    rules.pdf(req.file); result(res, await service.saveDocument(req.user.id, req.body || {}, req.get('If-Match'), req.file));
  }));
  const send = (id, disposition) => wrap(async (req, res) => {
    const file = await service.file(id(req));
    const name = encodeURIComponent(file.name).replace(/['()*]/g, char => '%' + char.charCodeAt(0).toString(16));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `${disposition}; filename*=UTF-8''${name}`, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" }); res.send(file.buffer);
  });
  router.get('/me/document/preview', requireCoopStudent, send(req => req.user.id, 'inline'));
  router.get('/me/document/download', requireCoopStudent, send(req => req.user.id, 'attachment'));
  router.use('/manage', manager);
  router.get('/manage/students', wrap(async (req, res) => res.json({ success: true, ...await service.list(req.query) })));
  router.get('/manage/teachers', wrap(async (req, res) => res.json({ success: true, ...await service.directory() })));
  router.get('/manage/students/:id', wrap(async (req, res) => result(res, await service.detail(req.params.id, true))));
  router.put('/manage/students/:id/review', wrap(async (req, res) => result(res, await service.review(req.params.id, req.body, req.get('If-Match'), req.topicExamActor))));
  router.put('/manage/students/:id/schedule', wrap(async (req, res) => result(res, await service.saveSchedule(req.params.id, req.body, req.get('If-Match'), req.topicExamActor))));
  router.get('/manage/students/:id/document/preview', send(req => req.params.id, 'inline'));
  router.get('/manage/students/:id/document/download', send(req => req.params.id, 'attachment'));
  return router;
}
module.exports = { createCoopTopicExamsRouter };
