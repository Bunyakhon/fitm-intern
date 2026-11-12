const express = require('express');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const { createTeacherProfileImageService, MAX_IMAGE } = require('../services/teacherProfileImage.service');

// Mounted only after the existing JWT/live Teacher/Head middleware.
function createTeacherProfileImageRouter(models) {
  const router = express.Router(), service = createTeacherProfileImageService(models);
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE, files: 1, fields: 0, parts: 2 } }).single('profile_image');
  router.use((req, res, next) => { res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }); next(); });
  function error(res, failure) {
    const status = failure.code === 'ENOENT' ? 404 : [400, 401, 403, 404, 409, 503].includes(failure.status) ? failure.status : 500;
    return res.status(status).json({ success: false, message: status === 404 ? 'ไม่พบรูปโปรไฟล์' : status === 500 ? 'ไม่สามารถจัดการรูปโปรไฟล์ได้ กรุณาลองใหม่' : failure.message });
  }
  router.get('/', async (req, res) => {
    try { const file = await service.read(req.user); return res.sendFile(file, err => { if (err && !res.headersSent) error(res, err); }); }
    catch (failure) { return error(res, failure); }
  });
  router.post('/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }), (req, res) => {
    upload(req, res, async failure => {
      if (failure) return res.status(400).json({ success: false, message: 'แนบรูปเดียวในช่อง profile_image ขนาดไม่เกิน 5 MB โดยไม่ส่งข้อมูลบัญชีอื่น' });
      try { return res.json({ success: true, data: await service.save(req.user, req.file) }); }
      catch (err) { return error(res, err); }
    });
  });
  router.delete('/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }), async (req, res) => {
    try { return res.json({ success: true, data: await service.remove(req.user, req.body) }); }
    catch (failure) { return error(res, failure); }
  });
  return router;
}
module.exports = { createTeacherProfileImageRouter };
