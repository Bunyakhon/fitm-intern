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
  router.get("/coop-requests", controller.listRequests(role));
  router.get("/coop-requests/:id", controller.requestDetail(role));
  router.post(
    "/coop-requests/:id/approve",
    controller.reviewRequest(role, "approve"),
  );
  router.post(
    "/coop-requests/:id/reject",
    controller.reviewRequest(role, "reject"),
  );
  if (role === "department_staff") {
    router.get("/job-postings", controller.listJobs);
    router.get("/job-postings/:id", controller.jobDetail);
    router.post("/job-postings/:id/publish", controller.reviewJob("approve"));
    router.post("/job-postings/:id/reject", controller.reviewJob("reject"));
  }
  if (role === "department_head") {
    router.patch("/me", controller.updateOwnProfile);
    router.get("/teachers", controller.listTeachers);
    router.patch("/teachers/:id", controller.updateTeacher);
    router.patch("/students/:id/coop-advisor", controller.assignProjectAdvisor);
  }
  return router;
}
module.exports = { createRoleWorkflowRouter, createLoginRateLimiter };
