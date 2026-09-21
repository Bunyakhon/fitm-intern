const express = require("express");

const {
  getMyMentor,
  createMentor,
  updateMyMentor,
  deleteMyMentor,
} = require("../controllers/mentor.controller");

const {
  authenticateToken,
} = require("../middlewares/auth.middleware");

const router = express.Router();

// ==============================
// ดูข้อมูลพี่เลี้ยง
// ของนักศึกษาที่ Login อยู่
// ==============================

router.get(
  "/me",
  authenticateToken,
  getMyMentor,
);

// ==============================
// เพิ่มข้อมูลพี่เลี้ยง
// ==============================

router.post(
  "/",
  authenticateToken,
  createMentor,
);

// ==============================
// แก้ไขข้อมูลพี่เลี้ยง
// ==============================

router.put(
  "/me",
  authenticateToken,
  updateMyMentor,
);

// ==============================
// ลบข้อมูลพี่เลี้ยง
// ==============================

router.delete(
  "/me",
  authenticateToken,
  deleteMyMentor,
);

module.exports = router;