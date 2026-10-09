const express = require("express");
const { authenticateStudentToken } = require("../middlewares/auth.middleware");
const { createInternshipLogService } = require("../services/internshipLog.service");
function createInternshipLogsRouter({ models = require("../models"), sendEmail = require("../services/email.service").sendMentorReviewEmail } = {}) {
  const router = express.Router(), service = createInternshipLogService(models);
  const action = fn => async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    try { await fn(req, res); }
    catch (error) { res.status(error.status || (error.name === "SequelizeUniqueConstraintError" ? 409 : 500)).json({ code: error.code || "INTERNSHIP_LOG_ERROR", message: error.status ? error.message : "ไม่สามารถดำเนินการได้ กรุณาลองใหม่", ...(error.missing_dates && { missing_dates: error.missing_dates }) }); }
  };
  const deliver = async delivery => { try { await sendEmail(delivery); return true; } catch { return false; } };
  const token = req => /^Bearer /.test(req.headers.authorization || "") ? req.headers.authorization.slice(7) : null;
  router.get("/mentor/weeks", action(async (req, res) => res.json(await service.list(token(req)))));
  router.get("/mentor/weeks/:id", action(async (req, res) => res.json(await service.detail(token(req), req.params.id))));
  router.post("/mentor/weeks/:id/review", action(async (req, res) => res.json(await service.review(token(req), req.params.id, req.body))));
  router.use(authenticateStudentToken);
  router.get("/overview", action(async (req, res) => res.json(await service.overview(req.user.id, req.query.date))));
  router.get("/days/:date", action(async (req, res) => res.json(await service.read(req.user.id, req.params.date))));
  router.post("/days/:date", action(async (req, res) => res.status(201).json(await service.save(req.user.id, req.params.date, req.body, true))));
  router.put("/days/:date", action(async (req, res) => res.json(await service.save(req.user.id, req.params.date, req.body, false))));
  router.post("/weeks/:date/submit", action(async (req, res) => { const { submission, delivery } = await service.submit(req.user.id, req.params.date, req.body); res.json({ submission, email_sent: await deliver(delivery) }); }));
  router.post("/mentor-link", action(async (req, res) => { require("../services/internshipLogRules").body(req.body, []); res.json({ email_sent: await deliver(await service.resend(req.user.id)) }); }));
  return router;
}
module.exports = { createInternshipLogsRouter };
