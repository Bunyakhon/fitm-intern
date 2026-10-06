const express = require("express");
const { loginDepartmentStaff } = require("../controllers/staffAuth.controller");
const { authenticateToken, requireDepartmentStaff } = require("../middlewares/auth.middleware");
const { createRoleWorkflowController } = require("../controllers/roleWorkflow.controller");
const { createLoginRateLimiter } = require("./roleWorkflow.routes");

const router = express.Router();

router.post("/login", createLoginRateLimiter(), loginDepartmentStaff);
router.get("/me", authenticateToken, requireDepartmentStaff, createRoleWorkflowController().profile("department_staff"));

module.exports = router;
