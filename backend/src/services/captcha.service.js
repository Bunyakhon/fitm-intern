const { getRecruitmentSecurityConfig } = require("../config/recruitment");

const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

class CaptchaVerificationError extends Error {
  constructor(message, status, category) {
    super(message);
    this.name = "CaptchaVerificationError";
    this.status = status;
    this.category = category;
  }
}

function normalizeCaptchaToken(token) {
  if (typeof token !== "string") {
    throw new CaptchaVerificationError(
      "CAPTCHA verification failed",
      400,
      "missing_token",
    );
  }
  const normalized = token.trim();
  if (!normalized || normalized.length > 2048) {
    throw new CaptchaVerificationError(
      "CAPTCHA verification failed",
      400,
      "invalid_token_shape",
    );
  }
  return normalized;
}

async function verifyTurnstileToken(token, requestContext = {}, options = {}) {
  const normalizedToken = normalizeCaptchaToken(token);
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new CaptchaVerificationError(
      "CAPTCHA verification is unavailable",
      503,
      "missing_configuration",
    );
  }

  const { turnstileTimeoutMs } = getRecruitmentSecurityConfig();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs || turnstileTimeoutMs,
  );

  try {
    const form = new URLSearchParams({ secret, response: normalizedToken });
    if (requestContext.ip) form.set("remoteip", requestContext.ip);

    const response = await (options.fetch || fetch)(
      options.url || TURNSTILE_SITEVERIFY_URL,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form,
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      throw new CaptchaVerificationError(
        "CAPTCHA verification is unavailable",
        503,
        "provider_http_error",
      );
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new CaptchaVerificationError(
        "CAPTCHA verification is unavailable",
        503,
        "malformed_response",
      );
    }
    if (!result || result.success !== true) {
      throw new CaptchaVerificationError(
        "CAPTCHA verification failed",
        403,
        "verification_failed",
      );
    }

    const expectedHostname = process.env.TURNSTILE_EXPECTED_HOSTNAME;
    const expectedAction = process.env.TURNSTILE_EXPECTED_ACTION;
    if (
      (expectedHostname && result.hostname !== expectedHostname) ||
      (expectedAction && result.action !== expectedAction)
    ) {
      throw new CaptchaVerificationError(
        "CAPTCHA verification failed",
        403,
        "claim_mismatch",
      );
    }

    return true;
  } catch (error) {
    if (error instanceof CaptchaVerificationError) throw error;
    const category =
      error && error.name === "AbortError"
        ? "timeout"
        : "provider_network_error";
    throw new CaptchaVerificationError(
      "CAPTCHA verification is unavailable",
      503,
      category,
    );
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  CaptchaVerificationError,
  verifyTurnstileToken,
};
