const assert = require("node:assert/strict");
const test = require("node:test");

const {
  JobSubmissionValidationError,
  validateJobSubmissionPayload,
} = require("../src/validators/jobSubmission.validator");
const {
  createPublicJobSubmission,
} = require("../src/services/jobSubmission.service");
const { isRecruitmentSubmissionEnabled } = require("../src/config/recruitment");
const jobSubmissionRouter = require("../src/routes/jobSubmission.routes");

function validPayload(overrides = {}) {
  return {
    company: {
      name: "  Example Co., Ltd.  ",
      email: " CONTACT@EXAMPLE.COM ",
      phone: "02-123-4567",
      addressNo: "12/3",
      moo: "",
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
        quota: 2,
        compensation: "500 baht per day",
        workDaysPerWeek: 5,
        workModes: ["onsite", "hybrid"],
      },
    ],
    captchaToken: "test-captcha-token",
    ...overrides,
  };
}

function expectValidationError(payload, expectedPath) {
  assert.throws(
    () => validateJobSubmissionPayload(payload),
    (error) =>
      error instanceof JobSubmissionValidationError &&
      error.errors.some((item) => item.path === expectedPath),
  );
}

function createFakeModels({ failOnJobNumber, failOnToken } = {}) {
  const committed = {
    companies: [],
    submissions: [],
    jobs: [],
    modes: [],
    tokens: [],
  };
  let jobCount = 0;
  const sequelize = {
    async transaction(work) {
      const staged = {
        companies: [],
        submissions: [],
        jobs: [],
        modes: [],
        tokens: [],
      };
      const transaction = { staged };
      try {
        const result = await work(transaction);
        Object.keys(committed).forEach((key) =>
          committed[key].push(...staged[key]),
        );
        return result;
      } catch (error) {
        throw error;
      }
    },
  };
  return {
    sequelize,
    committed,
    Company: {
      async create(values, { transaction }) {
        const row = { id: "company-1", ...values };
        transaction.staged.companies.push(row);
        return row;
      },
    },
    JobSubmission: {
      async create(values, { transaction }) {
        const row = { id: "submission-1", ...values };
        transaction.staged.submissions.push(row);
        return row;
      },
    },
    JobPosting: {
      async create(values, { transaction }) {
        jobCount += 1;
        if (jobCount === failOnJobNumber)
          throw new Error("forced database error");
        const row = { id: `job-${jobCount}`, ...values };
        transaction.staged.jobs.push(row);
        return row;
      },
    },
    JobPostingWorkMode: {
      async bulkCreate(rows, { transaction }) {
        transaction.staged.modes.push(...rows);
        return rows;
      },
    },
    CompanyAccessToken: {
      async update() {
        return [0];
      },
      async create(values, { transaction }) {
        if (failOnToken) throw new Error("forced token database error");
        const row = { id: "token-1", ...values };
        transaction.staged.tokens = transaction.staged.tokens || [];
        transaction.staged.tokens.push(row);
        return row;
      },
    },
  };
}

test("normalizes a valid company and a single job", () => {
  const result = validateJobSubmissionPayload(validPayload());
  assert.equal(result.company.email, "contact@example.com");
  assert.equal(result.company.moo, null);
  assert.equal(result.jobPostings.length, 1);
});

test("accepts multiple jobs and multiple valid work modes", () => {
  const payload = validPayload();
  payload.jobPostings.push({
    ...payload.jobPostings[0],
    title: "Data Analyst Intern",
    workModes: ["work_from_home", "hybrid"],
  });
  const result = validateJobSubmissionPayload(payload);
  assert.equal(result.jobPostings.length, 2);
  assert.deepEqual(result.jobPostings[1].workModes, [
    "work_from_home",
    "hybrid",
  ]);
});

test("rejects empty jobs, missing company, invalid email, quota and work-day bounds", () => {
  expectValidationError(validPayload({ jobPostings: [] }), "jobPostings");
  expectValidationError(validPayload({ company: undefined }), "company");
  expectValidationError(
    validPayload({
      company: { ...validPayload().company, email: "not-an-email" },
    }),
    "company.email",
  );
  expectValidationError(
    validPayload({
      jobPostings: [{ ...validPayload().jobPostings[0], quota: 0 }],
    }),
    "jobPostings[0].quota",
  );
  expectValidationError(
    validPayload({
      jobPostings: [{ ...validPayload().jobPostings[0], workDaysPerWeek: 0 }],
    }),
    "jobPostings[0].workDaysPerWeek",
  );
  expectValidationError(
    validPayload({
      jobPostings: [{ ...validPayload().jobPostings[0], workDaysPerWeek: 8 }],
    }),
    "jobPostings[0].workDaysPerWeek",
  );
});

test("rejects unknown/internal fields, invalid work modes, and duplicate work modes", () => {
  expectValidationError(validPayload({ status: "published" }), "status");
  expectValidationError(
    validPayload({
      jobPostings: [{ ...validPayload().jobPostings[0], status: "published" }],
    }),
    "jobPostings[0].status",
  );
  expectValidationError(
    validPayload({
      jobPostings: [
        { ...validPayload().jobPostings[0], workModes: ["remote"] },
      ],
    }),
    "jobPostings[0].workModes[0]",
  );
  expectValidationError(
    validPayload({
      jobPostings: [
        { ...validPayload().jobPostings[0], workModes: ["onsite", "onsite"] },
      ],
    }),
    "jobPostings[0].workModes",
  );
});

test("service atomically creates company, submission, jobs, and child work modes", async () => {
  const models = createFakeModels();
  const payload = validPayload();
  payload.jobPostings.push({
    ...payload.jobPostings[0],
    title: "QA Engineer Intern",
    workModes: ["work_from_home"],
  });
  const result = await createPublicJobSubmission(
    validateJobSubmissionPayload(payload),
    models,
  );

  assert.equal(result.company.id, "company-1");
  assert.equal(models.committed.companies.length, 1);
  assert.equal(models.committed.submissions.length, 1);
  assert.equal(models.committed.jobs.length, 2);
  assert.equal(models.committed.modes.length, 3);
  assert.equal(models.committed.tokens.length, 1);
  assert.match(models.committed.tokens[0].token_hash, /^[a-f0-9]{64}$/);
  assert.equal(
    models.committed.tokens[0].token_hash.includes(result.verificationToken),
    false,
  );
  assert.equal(models.committed.jobs[0].status, "pending_email_verification");
});

test("service rolls back every staged write when a later job insert fails", async () => {
  const models = createFakeModels({ failOnJobNumber: 2 });
  const payload = validPayload();
  payload.jobPostings.push({
    ...payload.jobPostings[0],
    title: "QA Engineer Intern",
  });

  await assert.rejects(
    () =>
      createPublicJobSubmission(validateJobSubmissionPayload(payload), models),
    /forced database error/,
  );
  assert.deepEqual(models.committed, {
    companies: [],
    submissions: [],
    jobs: [],
    modes: [],
    tokens: [],
  });
});

test("service rolls back every staged write when token persistence fails", async () => {
  const models = createFakeModels({ failOnToken: true });
  await assert.rejects(
    () =>
      createPublicJobSubmission(
        validateJobSubmissionPayload(validPayload()),
        models,
      ),
    /forced token database error/,
  );
  assert.deepEqual(models.committed, {
    companies: [],
    submissions: [],
    jobs: [],
    modes: [],
    tokens: [],
  });
});

test("recruitment submissions are disabled unless explicitly enabled", () => {
  const original = process.env.RECRUITMENT_SUBMISSION_ENABLED;
  delete process.env.RECRUITMENT_SUBMISSION_ENABLED;
  assert.equal(isRecruitmentSubmissionEnabled(), false);
  process.env.RECRUITMENT_SUBMISSION_ENABLED = "true";
  assert.equal(isRecruitmentSubmissionEnabled(), true);
  if (original === undefined) delete process.env.RECRUITMENT_SUBMISSION_ENABLED;
  else process.env.RECRUITMENT_SUBMISSION_ENABLED = original;
});

test("disabled route rejects before the controller can write to the database", async () => {
  const original = process.env.RECRUITMENT_SUBMISSION_ENABLED;
  delete process.env.RECRUITMENT_SUBMISSION_ENABLED;
  const securityGate = jobSubmissionRouter.stack[0].route.stack[0].handle;
  let statusCode;
  let response;
  await securityGate(
    {},
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        response = body;
      },
    },
    () => assert.fail("disabled gate must not call next"),
  );
  assert.equal(statusCode, 503);
  assert.match(response.message, /temporarily unavailable/);
  if (original === undefined) delete process.env.RECRUITMENT_SUBMISSION_ENABLED;
  else process.env.RECRUITMENT_SUBMISSION_ENABLED = original;
});
