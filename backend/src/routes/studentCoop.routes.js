const express = require("express");
const { authenticateStudentToken } = require("../middlewares/auth.middleware");
const { createSingleFileUpload } = require("../middlewares/upload.middleware");
const { createStudentCoopProjectService } = require("../services/studentCoopProject.service");
const { createCoopProjectAdvisorService } = require("../services/coopProjectAdvisor.service");
const { createCoopProjectAdvisorController } = require("../controllers/coopProjectAdvisor.controller");
const { createCompanyEvaluationService } = require("../services/companyEvaluation.service");
const { createCompanyEvaluationController } = require("../controllers/companyEvaluation.controller");

function createStudentCoopRouter({ models = require("../models"), storage, authenticate = authenticateStudentToken, uploads } = {}) {
  const service = createStudentCoopProjectService(models, storage);
  const router = express.Router();
  router.use(authenticate);
  const evaluation = createCompanyEvaluationController(createCompanyEvaluationService(models));
  router.get("/company-evaluation", evaluation.read);
  router.put("/company-evaluation", evaluation.save);
  const advisor = createCoopProjectAdvisorController(createCoopProjectAdvisorService(models));
  router.get("/project-advisor-request", advisor.read);
  router.post("/project-advisor-request", advisor.select);
  const action = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : "ไม่สามารถดำเนินการโครงการสหกิจศึกษาได้" }); }
  };
  router.get("/project", action(async (req, res) => res.json(await service.readProject(req.user.id))));
  router.put("/project", action(async (req, res) => res.json(await service.saveTopic(req.user.id, req.body))));
  router.get("/project-files", action(async (req, res) => res.json({ files: await service.listFiles(req.user.id) })));
  for (const [endpoint, type, directory, mime] of [
    ["project-book", "coop_project_book", "projectBooks", { "application/pdf": ".pdf" }],
    ["poster", "coop_poster", "posters", { "application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg" }],
  ]) {
    const upload = uploads?.[type] || createSingleFileUpload(directory, mime, 10 * 1024 * 1024, { preservePath: true, storageConfig: storage });
    router.post(`/${endpoint}`, (req, res, next) => upload.single("file")(req, res, error => {
      if (error) return res.status(400).json({ message: "ไฟล์ต้องเป็นประเภทที่รองรับและขนาดไม่เกิน 10MB" });
      next();
    }), action(async (req, res) => res.json({ file: await service.upload(req.user.id, type, req.file, req.body), message: "อัปโหลดสำเร็จ" })));
  }
  router.get("/project-files/:id/preview", action(async (req, res) => {
    const { file, path } = await service.preview(req.user.id, req.params.id);
    const name = encodeURIComponent(file.original_name).replace(/['()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    res.set({ "Content-Type": file.mime_type, "Content-Disposition": `inline; filename*=UTF-8''${name}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    res.sendFile(path, error => { if (error && !res.headersSent) res.status(404).json({ message: "ไม่พบไฟล์" }); });
  }));
  return router;
}
module.exports = { createStudentCoopRouter };
