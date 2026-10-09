const express = require("express");
const rateLimit = require("express-rate-limit");
const { authenticateToken, authenticateStudentToken } = require("../middlewares/auth.middleware");
const { createRequireTeacher } = require("../middlewares/teacherAuth.middleware");
const { createSupervisionService } = require("../services/supervision.service");
const { createSupervisionResultService } = require("../services/supervisionResult.service");
const multer = require("multer");
const { MAX_IMAGE_SIZE } = require("../services/supervisionResultRules");
function createSupervisionRouter({ models = require("../models"), sendEmail = require("../services/email.service").sendSupervisionEmail, now, storage } = {}) {
  const router = express.Router(), service = createSupervisionService(models, { now });
  const results = createSupervisionResultService(models, { now, storage });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE, files: 2, fields: 6, fieldSize: 21000, parts: 9 } }).fields([{ name: "image_1", maxCount: 1 }, { name: "image_2", maxCount: 1 }]);
  const uploadImages = (req, res, next) => upload(req, res, error => error ? res.status(400).json({ code: "INVALID_IMAGES", message: "รองรับ PNG / JPEG ช่องละหนึ่งภาพ สูงสุดภาพละ 5 MB" }) : next());
  router.use((req, res, next) => { res.set({ "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" }); next(); });
  const action = fn => async (req, res) => { try { await fn(req, res); } catch (error) { res.status(error.status || (error.name === "SequelizeUniqueConstraintError" ? 409 : 500)).json({ code: error.code || "SUPERVISION_ERROR", message: error.status ? error.message : "ไม่สามารถดำเนินการนัดนิเทศได้ กรุณาลองใหม่" }); } };
  const token = req => /^Bearer /.test(req.headers.authorization || "") ? req.headers.authorization.slice(7) : null;
  const deliver = async value => { try { await sendEmail(value); return true; } catch { return false; } };
  router.use("/mentor", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: "draft-8", legacyHeaders: false }));
  router.get("/mentor/appointment", action(async (req, res) => res.json(await service.scope(token(req)))));
  router.post("/mentor/confirm", action(async (req, res) => res.json(await service.scope(token(req), req.body))));
  router.get("/student", authenticateStudentToken, action(async (req, res) => res.json(await service.detail(req.user.id))));
  router.get("/student/appointments/:appointment/visits/:visit/result", authenticateStudentToken, action(async (req, res) => res.json(await results.read(req.user.id, req.params.appointment, Number(req.params.visit)))));
  router.get("/student/appointments/:appointment/visits/:visit/result/images/:image", authenticateStudentToken, action(async (req, res) => {
    const file = await results.image(req.user.id, req.params.appointment, Number(req.params.visit), null, req.params.image);
    res.set({ "Content-Type": file.mime, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" }).sendFile(file.path, error => { if (error && !res.headersSent) res.status(404).end(); });
  }));
  router.use("/teacher", authenticateToken, createRequireTeacher({ TeacherModel: models.Teacher }));
  const resultRoot = "/teacher/students/:id/appointments/:appointment/visits/:visit/result";
  const args = req => [req.params.id, req.params.appointment, Number(req.params.visit), req.teacher.id];
  router.get(resultRoot, action(async (req, res) => res.json(await results.read(...args(req)))));
  router.put(resultRoot, rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: "draft-8", legacyHeaders: false }), uploadImages, action(async (req, res) => res.json(await results.save(...args(req), req.body, req.files))));
  router.post(`${resultRoot}/complete`, action(async (req, res) => res.json(await results.complete(...args(req), req.body))));
  router.get(`${resultRoot}/images/:image`, action(async (req, res) => {
    const file = await results.image(...args(req), req.params.image);
    res.set({ "Content-Type": file.mime, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" }).sendFile(file.path, error => { if (error && !res.headersSent) res.status(404).end(); });
  }));
  router.get("/teacher/students", action(async (req, res) => res.json(await service.listTeacher(req.teacher.id, req.query))));
  router.get("/teacher/students/:id", action(async (req, res) => res.json(await service.detail(req.params.id, req.teacher.id))));
  for (const method of ["post", "put"]) router[method]("/teacher/students/:id/visits/:visit", action(async (req, res) => {
    const { appointment, delivery } = await service.save(req.teacher.id, req.params.id, Number(req.params.visit), req.body, method === "put");
    res.status(method === "post" ? 201 : 200).json({ appointment, email_sent: await deliver(delivery) });
  }));
  router.post("/teacher/students/:id/appointments/:appointment/link", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false }), action(async (req, res) => res.json({ email_sent: await deliver(await service.resend(req.teacher.id, req.params.id, req.params.appointment, req.body)) })));
  return router;
}
module.exports = { createSupervisionRouter };
