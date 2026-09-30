const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");

const {
  createJobSubmissionHandler,
  createResendVerificationHandler,
} = require("../src/controllers/jobSubmission.controller");
const {
  CaptchaVerificationError,
  verifyTurnstileToken,
} = require("../src/services/captcha.service");
const {
  CompanyVerificationError,
} = require("../src/services/companyVerification.service");
const {
  createResendRateLimiter,
  createSubmissionRateLimiter,
} = require("../src/middlewares/recruitmentRateLimit.middleware");
const {
  JobSubmissionValidationError,
  validateJobSubmissionPayload,
} = require("../src/validators/jobSubmission.validator");

function validPayload() {
  return {
    company: {
      name: "Example Company",
      email: "hr@example.test",
      phone: "02-123-4567",
      addressNo: "12",
      moo: null,
      subdistrict: "Bang Sue",
      district: "Bang Sue",
      province: "Bangkok",
    },
    jobPostings: [
      {
        title: "Software Engineer Intern",
        category: "information_technology",
        description:
          "Build and test web application features with the engineering team.",
        quota: 1,
        compensation: "Negotiable",
        workDaysPerWeek: 5,
        workModes: ["onsite"],
      },
    ],
    captchaToken: "deterministic-test-captcha-token",
  };
}

function responseCollector() {
  return {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("missing CAPTCHA is rejected before CAPTCHA service or database creation", async () => {
  const payload = validPayload();
  delete payload.captchaToken;
  assert.throws(
    () => validateJobSubmissionPayload(payload),
    (error) =>
      error instanceof JobSubmissionValidationError &&
      error.errors.some((item) => item.path === "captchaToken"),
  );
});

test("Turnstile service accepts success and safely classifies invalid/provider responses", async () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  let posted;
  await verifyTurnstileToken(
    "test-token",
    {},
    {
      fetch: async (url, options) => {
        posted = options.body;
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      },
    },
  );
  assert.equal(posted.get("response"), "test-token");
  await assert.rejects(
    () =>
      verifyTurnstileToken(
        "test-token",
        {},
        {
          fetch: async () =>
            new Response(
              JSON.stringify({
                success: false,
                "error-codes": ["invalid-input-response"],
              }),
              { status: 200 },
            ),
        },
      ),
    (error) =>
      error instanceof CaptchaVerificationError &&
      error.status === 403 &&
      error.message === "CAPTCHA verification failed",
  );
  await assert.rejects(
    () =>
      verifyTurnstileToken(
        "test-token",
        {},
        {
          fetch: async () => {
            throw new Error("network unavailable");
          },
        },
      ),
    (error) =>
      error instanceof CaptchaVerificationError &&
      error.status === 503 &&
      error.message === "CAPTCHA verification is unavailable",
  );
  if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalSecret;
});

test("valid CAPTCHA persists first, sends one email after it, and never returns a raw token", async () => {
  const calls = [];
  const handler = createJobSubmissionHandler({
    verifyCaptcha: async () => calls.push("captcha"),
    createSubmission: async () => {
      calls.push("database");
      return {
        company: { name: "Example Company", email: "hr@example.test" },
        submission: {
          id: "submission-1",
          verification_status: "pending_email_verification",
        },
        jobPostings: [{}],
        verificationToken: "raw-token-never-returned",
      };
    },
    sendVerificationEmail: async ({ token }) => {
      calls.push(`email:${token}`);
    },
  });
  const res = responseCollector();
  await handler({ body: validPayload(), ip: "127.0.0.1" }, res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(calls, [
    "captcha",
    "database",
    "email:raw-token-never-returned",
  ]);
  assert.equal(
    JSON.stringify(res.body).includes("raw-token-never-returned"),
    false,
  );
  assert.equal(JSON.stringify(res.body).includes("token_hash"), false);
});

test("invalid CAPTCHA prevents database work and email failure retains the committed submission", async () => {
  let created = false;
  const blocked = createJobSubmissionHandler({
    verifyCaptcha: async () => {
      throw new CaptchaVerificationError(
        "CAPTCHA verification failed",
        403,
        "verification_failed",
      );
    },
    createSubmission: async () => {
      created = true;
    },
  });
  const blockedResponse = responseCollector();
  await blocked({ body: validPayload(), ip: "127.0.0.1" }, blockedResponse);
  assert.equal(blockedResponse.statusCode, 403);
  assert.equal(created, false);

  const accepted = createJobSubmissionHandler({
    verifyCaptcha: async () => {},
    createSubmission: async () => ({
      company: { name: "Example Company", email: "hr@example.test" },
      submission: {
        id: "submission-1",
        verification_status: "pending_email_verification",
      },
      jobPostings: [{}],
      verificationToken: "raw-token",
    }),
    sendVerificationEmail: async () => {
      throw new Error("SMTP unavailable");
    },
  });
  const acceptedResponse = responseCollector();
  await accepted({ body: validPayload(), ip: "127.0.0.1" }, acceptedResponse);
  assert.equal(acceptedResponse.statusCode, 202);
  assert.equal(
    acceptedResponse.body.submission.status,
    "pending_email_verification",
  );
});

test("resend requires a valid verification capability and does not expose it", async () => {
  const handler = createResendVerificationHandler({
    getResendableVerification: async (token) => ({
      token,
      company: { name: "Example Company" },
      submission: {
        id: "submission-1",
        submitted_email: "hr@example.test",
        verification_status: "pending_email_verification",
      },
    }),
    sendVerificationEmail: async () => {},
  });
  const response = responseCollector();
  await handler({ body: { token: "existing-opaque-capability" } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(
    JSON.stringify(response.body).includes("existing-opaque-capability"),
    false,
  );

  const rejected = createResendVerificationHandler({
    getResendableVerification: async () => {
      throw new CompanyVerificationError("Verification token has expired", 410);
    },
  });
  const rejectedResponse = responseCollector();
  await rejected({ body: { token: "expired" } }, rejectedResponse);
  assert.equal(rejectedResponse.statusCode, 410);
});

test("submission limiter returns 429 before the protected handler", async () => {
  const app = express();
  let protectedCalls = 0;
  app.post(
    "/",
    createSubmissionRateLimiter({ windowMs: 60_000, limit: 2 }),
    (req, res) => {
      protectedCalls += 1;
      res.status(204).end();
    },
  );
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    assert.equal((await fetch(url, { method: "POST" })).status, 204);
    assert.equal((await fetch(url, { method: "POST" })).status, 204);
    const limited = await fetch(url, { method: "POST" });
    assert.equal(limited.status, 429);
    assert.match(
      await limited.text(),
      /Too many recruitment submission attempts/,
    );
    assert.equal(protectedCalls, 2);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("resend limiter has an isolated conservative limit", async () => {
  const app = express();
  let protectedCalls = 0;
  app.post(
    "/",
    createResendRateLimiter({ windowMs: 60_000, limit: 1 }),
    (req, res) => {
      protectedCalls += 1;
      res.status(204).end();
    },
  );
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    assert.equal((await fetch(url, { method: "POST" })).status, 204);
    assert.equal((await fetch(url, { method: "POST" })).status, 429);
    assert.equal(protectedCalls, 1);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
