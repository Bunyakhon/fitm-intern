const { rateLimit } = require("express-rate-limit");
const { getRecruitmentSecurityConfig } = require("../config/recruitment");

function createRecruitmentRateLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler(req, res, next, options) {
      res.status(options.statusCode).json({ message });
    },
  });
}

function createSubmissionRateLimiter(overrides = {}) {
  const { submissionRateLimit } = getRecruitmentSecurityConfig();
  return createRecruitmentRateLimiter({
    ...submissionRateLimit,
    ...overrides,
    message:
      "Too many recruitment submission attempts. Please try again later.",
  });
}

function createResendRateLimiter(overrides = {}) {
  const { resendRateLimit } = getRecruitmentSecurityConfig();
  return createRecruitmentRateLimiter({
    ...resendRateLimit,
    ...overrides,
    message:
      "Too many verification email resend attempts. Please try again later.",
  });
}

module.exports = {
  createResendRateLimiter,
  createSubmissionRateLimiter,
};
