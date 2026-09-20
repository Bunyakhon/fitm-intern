const express = require("express");
const router = express.Router();

const {
  registerStudent,
  loginStudent,
  getCurrentStudent,
} = require("../controllers/auth.controller");

const {
  authenticateToken,
} = require("../middlewares/auth.middleware");

router.post("/register", registerStudent);

router.post("/login", loginStudent);

router.get("/me", authenticateToken, getCurrentStudent);

module.exports = router;