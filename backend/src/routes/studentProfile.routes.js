const express = require("express");

const {
  getStudentProfile,
  upsertStudentProfile,
} = require("../controllers/studentProfile.controller");

const {
  authenticateToken,
} = require("../middlewares/auth.middleware");

const router = express.Router();

// ดูข้อมูลประวัตินักศึกษาของผู้ที่ Login อยู่
router.get("/", authenticateToken, getStudentProfile);

// เพิ่มหรือแก้ไขข้อมูลประวัตินักศึกษาของผู้ที่ Login อยู่
router.put("/", authenticateToken, upsertStudentProfile);

module.exports = router;