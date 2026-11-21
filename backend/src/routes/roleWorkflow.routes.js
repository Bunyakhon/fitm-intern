const express = require("express");
const {
  authenticateToken,
  createRequireDepartmentStaff,
} = require("../middlewares/auth.middleware");
const {
  createRequireTeacher,
} = require("../middlewares/teacherAuth.middleware");
const {
  createTeacherLoginHandler,
} = require("../controllers/teacherAuth.controller");
const {
  createRoleWorkflowController,
} = require("../controllers/roleWorkflow.controller");
const {
  createRoleWorkflowService,
} = require("../services/roleWorkflow.service");
const models = require("../models");
const { rateLimit } = require("express-rate-limit");
const { createCoopProjectAdvisorService } = require("../services/coopProjectAdvisor.service");
const { createCoopProjectAdvisorController } = require("../controllers/coopProjectAdvisor.controller");
function createLoginRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many login attempts; please try again later" },
  });
}
function createRoleWorkflowRouter(role, registry = models) {
  const router = express.Router();
  const controller = createRoleWorkflowController(
    createRoleWorkflowService(registry),
  );
  if (role !== "department_staff")
    router.post(
      "/auth/login",
      createLoginRateLimiter(),
      createTeacherLoginHandler({
        models: registry,
        TeacherModel: registry.Teacher,
        headOnly: role === "department_head",
      }),
    );
  router.use(
    authenticateToken,
    role === "department_staff"
      ? createRequireDepartmentStaff({ StaffModel: registry.DepartmentStaff })
      : createRequireTeacher({
          TeacherModel: registry.Teacher,
          headOnly: role === "department_head",
        }),
  );
  router.get("/me", controller.profile(role));
  if (['teacher', 'department_head'].includes(role)) router.patch('/me', controller.updateOwnProfile(role));
  if (['teacher', 'department_head'].includes(role)) {
    router.get('/me/profile-options', controller.profileOptions(role));
    router.use('/me/profile-image', require('./teacherProfileImage.routes').createTeacherProfileImageRouter(registry));
  }
  if (role === "teacher") {
    const password = require('../controllers/teacherPassword.controller').createTeacherPasswordController(
      require('../services/teacherPassword.service').createTeacherPasswordService(registry));
    router.get('/account-security', password.status);
    router.post('/account-security', createLoginRateLimiter(), password.change);
    router.post('/account-security/logout', password.logout);
    router.get('/admin-access', (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ available: process.env.NODE_ENV === 'development' && !!req.superAdmin?.is_active }); });
    const advisor = createCoopProjectAdvisorController(createCoopProjectAdvisorService(registry));
    router.get("/project-advisor-requests", advisor.list);
    router.get("/project-advisor-requests/:id", advisor.detail);
    router.post("/project-advisor-requests/:id/accept", advisor.accept);
    router.post("/project-advisor-requests/:id/reject", advisor.reject);
  }
  router.get("/coop-requests", controller.listRequests(role));
  router.get("/coop-requests/:id", controller.requestDetail(role));
  if (role !== 'department_staff') router.post(
    "/coop-requests/:id/approve",
    controller.reviewRequest(role, "approve"),
  );
  if (role !== 'department_staff') router.post(
    "/coop-requests/:id/reject",
    controller.reviewRequest(role, "reject"),
  );
  if (role === "department_staff") {
    const teachers = require('../controllers/staffTeachers.controller').createStaffTeachersController(
      require('../services/staffTeachers.service').createStaffTeachersService(registry));
    router.get('/teachers', controller.listStaffTeachers);
    router.get('/teachers/options', teachers.options);
    router.get('/teachers/:id', controller.staffTeacherDetail);
    router.post('/teachers', teachers.create);
    router.patch('/teachers/:id', teachers.update);
    router.patch('/teachers/:id/deactivate', teachers.deactivate);
    router.post('/teachers/:id/reset-password', createLoginRateLimiter(), teachers.resetPassword);
    router.use('/coop-prerequisite-catalog', require('./coopPrerequisiteCatalog.routes').createCatalogRouter(registry));
    router.use('/document-requests', require('./staffDocuments.routes').createStaffDocumentsRouter(registry));
    router.post('/coop-requests/:id/cancel', controller.reviewRequest(role, 'cancel'));
    router.get("/job-postings", controller.listJobs);
    router.get("/job-postings/:id", controller.jobDetail);
    router.post("/job-postings/:id/publish", controller.reviewJob("approve"));
    router.post("/job-postings/:id/reject", controller.reviewJob("reject"));
  }
  if (role === "department_head") {
    router.get("/teachers", controller.listTeachers);
    router.patch("/teachers/:id", controller.updateTeacher);
    router.patch("/students/:id/coop-advisor", controller.assignProjectAdvisor);
  }
  return router;
}
module.exports = { createRoleWorkflowRouter, createLoginRateLimiter };
