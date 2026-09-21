const express = require("express");

const {
  getStudentProfile,
  upsertStudentProfile,
  updateStudentInfo,
  uploadProfileImage,
  getProfileImage,
  uploadResume,
} = require("../controllers/studentProfile.controller");

const {
  authenticateToken,
} = require("../middlewares/auth.middleware");
const {
  profileImageUpload,
  resumeUpload,
} = require("../middlewares/upload.middleware");

const router = express.Router();

// ดูข้อมูลประวัตินักศึกษาของผู้ที่ Login อยู่
router.get("/", authenticateToken, getStudentProfile);

router.get("/profile-image", authenticateToken, getProfileImage);

router.put("/student-info", authenticateToken, updateStudentInfo);

router.post(
  "/profile-image",
  authenticateToken,
  (req, res, next) => {
    profileImageUpload.single("profile_image")(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "ขนาดรูปต้องไม่เกิน 5MB" });
      }

      return res.status(400).json({
        message: "รองรับเฉพาะไฟล์ image/jpeg, image/png และ image/webp",
      });
    });
  },
  uploadProfileImage,
);

router.post(
  "/resume",
  authenticateToken,
  (req, res, next) => {
    resumeUpload.single("resume")(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "ไฟล์ Resume ต้องไม่เกิน 10MB" });
      }

      return res.status(400).json({
        message: "รองรับเฉพาะไฟล์ PDF (application/pdf)",
      });
    });
  },
  uploadResume,
);

// เพิ่มหรือแก้ไขข้อมูลประวัตินักศึกษาของผู้ที่ Login อยู่
router.put("/", authenticateToken, upsertStudentProfile);

module.exports = router;
