function isRecruitmentSubmissionEnabled() {
  return (
    String(process.env.RECRUITMENT_SUBMISSION_ENABLED || "").toLowerCase() ===
    "true"
  );
}

function readIntegerEnv(name, fallback, minimum, maximum) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function getRecruitmentSecurityConfig() {
  return {
    submissionRateLimit: {
      windowMs: readIntegerEnv(
        "RECRUITMENT_SUBMISSION_RATE_LIMIT_WINDOW_MS",
        15 * 60 * 1000,
        60 * 1000,
        24 * 60 * 60 * 1000,
      ),
      limit: readIntegerEnv("RECRUITMENT_SUBMISSION_RATE_LIMIT_MAX", 5, 1, 100),
    },
    resendRateLimit: {
      windowMs: readIntegerEnv(
        "RECRUITMENT_RESEND_RATE_LIMIT_WINDOW_MS",
        30 * 60 * 1000,
        60 * 1000,
        24 * 60 * 60 * 1000,
      ),
      limit: readIntegerEnv("RECRUITMENT_RESEND_RATE_LIMIT_MAX", 3, 1, 100),
    },
    turnstileTimeoutMs: readIntegerEnv(
      "TURNSTILE_TIMEOUT_MS",
      5000,
      1000,
      15000,
    ),
    verificationTokenTtlHours: readIntegerEnv(
      "RECRUITMENT_VERIFICATION_TOKEN_TTL_HOURS",
      24,
      1,
      168,
    ),
  };
}

module.exports = {
  getRecruitmentSecurityConfig,
  isRecruitmentSubmissionEnabled,
};
