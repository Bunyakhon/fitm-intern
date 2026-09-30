const express = require("express");
const { isRecruitmentSubmissionEnabled } = require("../config/recruitment");
const {
  createJobSubmission,
  resendJobSubmissionVerification,
  verifyJobSubmissionEmail,
} = require("../controllers/jobSubmission.controller");
const {
  createResendRateLimiter,
  createSubmissionRateLimiter,
} = require("../middlewares/recruitmentRateLimit.middleware");

const router = express.Router();

function requireRecruitmentSubmissionEnabled(req, res, next) {
  if (!isRecruitmentSubmissionEnabled()) {
    return res.status(503).json({
      message: "Recruitment submission is temporarily unavailable",
    });
  }
  return next();
}

router.post(
  "/",
  requireRecruitmentSubmissionEnabled,
  createSubmissionRateLimiter(),
  createJobSubmission,
);
router.get("/verify-email", verifyJobSubmissionEmail);
router.post(
  "/resend-verification",
  requireRecruitmentSubmissionEnabled,
  createResendRateLimiter(),
  resendJobSubmissionVerification,
);

module.exports = router;
