const express = require("express");

const {
  verifyMentorToken,
  updateMentorProfile,
  confirmMentor,
} = require("../controllers/mentorVerification.controller");

const router = express.Router();

/**
 * Public Routes
 *
 * Mentor ไม่มี Account Login
 * จึงไม่ใช้ authenticateToken
 */

router.get(
  "/verify",
  verifyMentorToken,
);

router.put(
  "/profile",
  updateMentorProfile,
);

router.post(
  "/confirm",
  confirmMentor,
);

module.exports = router;