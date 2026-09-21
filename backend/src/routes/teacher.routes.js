const express = require("express");

const {
  getTeachers,
} = require("../controllers/teacher.controller");

const {
  authenticateToken,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  getTeachers,
);

module.exports = router;