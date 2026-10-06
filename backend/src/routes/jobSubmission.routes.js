const express = require("express");
const { isRecruitmentSubmissionEnabled } = require("../config/recruitment");
const {
  createJobSubmission,
  resendJobSubmissionVerification,
  verifyJobSubmissionEmail,
  createJobSubmissionHandler,
  createResendVerificationHandler,
  createVerifyEmailHandler,
} = require("../controllers/jobSubmission.controller");
const {
  createResendRateLimiter,
  createSubmissionRateLimiter,
} = require("../middlewares/recruitmentRateLimit.middleware");

function requireRecruitmentSubmissionEnabled(req, res, next) {
  if (!isRecruitmentSubmissionEnabled()) {
    return res.status(503).json({
      message: "Recruitment submission is temporarily unavailable",
    });
  }
  return next();
}

function createJobSubmissionRouter(dependencies = {}) {
  const router = express.Router();
  router.post(
    "/",
    requireRecruitmentSubmissionEnabled,
    createSubmissionRateLimiter(),
    dependencies.createSubmission
      ? createJobSubmissionHandler(dependencies)
      : createJobSubmission,
  );
  const verifyEmail = dependencies.verifyEmail
    ? createVerifyEmailHandler(dependencies)
    : verifyJobSubmissionEmail;
  router.get("/verify-email", verifyEmail);
  router.post("/verify-email", verifyEmail);
  router.post(
    "/resend-verification",
    requireRecruitmentSubmissionEnabled,
    createResendRateLimiter(),
    (req, res, next) => {
      // Cookie recovery is available only to the configured frontend origin.
      if (
        req.body?.token === undefined &&
        (!process.env.FRONTEND_URL ||
          req.headers.origin !== new URL(process.env.FRONTEND_URL).origin)
      ) {
        return res
          .status(403)
          .json({ message: "Resend origin is not allowed" });
      }
      next();
    },
    dependencies.recoverVerification
      ? createResendVerificationHandler(dependencies)
      : resendJobSubmissionVerification,
  );
  return router;
}

module.exports = createJobSubmissionRouter();
module.exports.createJobSubmissionRouter = createJobSubmissionRouter;
