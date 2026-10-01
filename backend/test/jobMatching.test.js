const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createCandidateText,
  createJobMatchingHandler,
} = require("../src/controllers/jobMatching.controller");
const {
  NlpMatchingConnectionError,
  NlpMatchingResponseError,
  NlpMatchingTimeoutError,
} = require("../src/services/nlpMatching.client");
const { requireStudentActor } = require("../src/routes/jobMatching.routes");

const JOB_ID_A = "11111111-1111-4111-8111-111111111111";
const JOB_ID_B = "22222222-2222-4222-8222-222222222222";

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

function job(id = JOB_ID_A, overrides = {}) {
  return {
    id,
    title: "Backend Developer Intern",
    description: "Build Node.js APIs with PostgreSQL and SQL.",
    category: "information_technology",
    quota: 2,
    compensation_text: "500 baht per day",
    work_days_per_week: 5,
    company: { name: "Example Co.", province: "Bangkok", email: "private@example.test" },
    workModes: [{ mode: "hybrid", created_at: "internal" }],
    ...overrides,
  };
}

function createHandler({ student, jobs = [job()], callNlp, captureQuery } = {}) {
  return createJobMatchingHandler({
    StudentModel: {
      async findByPk() {
        return student === undefined
          ? { id: "student-1", major: "Computer Science", profile: { related_skills: "Python SQL" } }
          : student;
      },
    },
    JobPostingModel: {
      async findAll(query) {
        if (captureQuery) captureQuery(query);
        return jobs;
      },
    },
    callNlp,
  });
}

test("uses only published postings and sends the minimal normalized NLP payload", async () => {
  let query;
  let payload;
  const handler = createHandler({
    captureQuery: (value) => {
      query = value;
    },
    callNlp: async (value) => {
      payload = value;
      return {
        schema_version: "job-matching.v1",
        matches: [{ job_posting_id: JOB_ID_A, score: 0.8234, rank: 1 }],
      };
    },
  });
  const res = responseCollector();

  await handler({ user: { id: "student-1" } }, res);

  assert.deepEqual(query.where, { status: "published" });
  assert.deepEqual(query.attributes, [
    "id", "title", "description", "category", "quota", "compensation_text", "work_days_per_week",
  ]);
  assert.deepEqual(payload, {
    schema_version: "job-matching.v1",
    candidate: { text: "Computer Science Python SQL" },
    jobs: [{
      job_posting_id: JOB_ID_A,
      text: "Backend Developer Intern information_technology Build Node.js APIs with PostgreSQL and SQL.",
    }],
    options: { top_k: 5, min_score: 0.05 },
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.matches[0], {
    job_posting_id: JOB_ID_A,
    score: 0.8234,
    rank: 1,
    title: "Backend Developer Intern",
    description: "Build Node.js APIs with PostgreSQL and SQL.",
    category: "information_technology",
    quota: 2,
    compensation_text: "500 baht per day",
    work_days_per_week: 5,
    company: { name: "Example Co.", province: "Bangkok" },
    workModes: [{ mode: "hybrid" }],
  });
  assert.equal(JSON.stringify(res.body).includes("private@example.test"), false);
  assert.equal(JSON.stringify(res.body).includes("status"), false);
});

test("returns an empty result without calling NLP when there are no published postings", async () => {
  let called = false;
  const handler = createHandler({ jobs: [], callNlp: async () => { called = true; } });
  const res = responseCollector();

  await handler({ user: { id: "student-1" } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { matches: [] });
  assert.equal(called, false);
});

test("allows only authenticated student-shaped JWT claims", () => {
  let nextCalled = false;
  const allowedResponse = responseCollector();
  requireStudentActor(
    { user: { id: "student-1", student_id: "6500000001" } },
    allowedResponse,
    () => { nextCalled = true; },
  );
  assert.equal(nextCalled, true);

  for (const user of [
    { id: "staff-1", actor_type: "department_staff", role: "department_staff" },
    { id: "unknown-actor" },
  ]) {
    const res = responseCollector();
    requireStudentActor({ user }, res, () => assert.fail("must not authorize"));
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, "STUDENT_AUTHORIZATION_REQUIRED");
  }
});

test("returns a stable 404 when the authenticated student record no longer exists", async () => {
  const handler = createHandler({ student: null });
  const res = responseCollector();

  await handler({ user: { id: "missing-student" } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, "MATCH_STUDENT_NOT_FOUND");
});

test("normalizes candidate text and rejects an empty usable candidate", async () => {
  assert.equal(
    createCandidateText({ major: "  IT ", profile: { related_skills: "  Python  " } }),
    "IT Python",
  );
  assert.equal(createCandidateText({ major: " ", profile: { related_skills: null } }), "");

  const handler = createHandler({
    student: { id: "student-1", major: null, profile: { related_skills: " " } },
    callNlp: async () => assert.fail("NLP must not be called"),
  });
  const res = responseCollector();

  await handler({ user: { id: "student-1" } }, res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.code, "MATCH_CANDIDATE_TEXT_REQUIRED");
});

test("maps NLP timeout and connection failures to safe dependency statuses", async () => {
  for (const [error, expectedStatus, expectedCode] of [
    [new NlpMatchingTimeoutError(), 504, "NLP_MATCHING_TIMEOUT"],
    [new NlpMatchingConnectionError(), 503, "NLP_MATCHING_UNAVAILABLE"],
    [new NlpMatchingResponseError(), 502, "NLP_MATCHING_INVALID_RESPONSE"],
  ]) {
    const handler = createHandler({ callNlp: async () => { throw error; } });
    const res = responseCollector();
    await handler({ user: { id: "student-1" } }, res);
    assert.equal(res.statusCode, expectedStatus);
    assert.equal(res.body.code, expectedCode);
  }
});

test("rejects malformed, unknown, duplicate, invalid-score, and invalid-rank NLP results", async () => {
  const invalidResponses = [
    {},
    { schema_version: "job-matching.v1", matches: [{ job_posting_id: "unknown", score: 0.5, rank: 1 }] },
    {
      schema_version: "job-matching.v1",
      matches: [
        { job_posting_id: JOB_ID_A, score: 0.5, rank: 1 },
        { job_posting_id: JOB_ID_A, score: 0.4, rank: 2 },
      ],
    },
    { schema_version: "job-matching.v1", matches: [{ job_posting_id: JOB_ID_A, score: 1.1, rank: 1 }] },
    { schema_version: "job-matching.v1", matches: [{ job_posting_id: JOB_ID_A, score: 0.01, rank: 1 }] },
    { schema_version: "job-matching.v1", matches: [{ job_posting_id: JOB_ID_A, score: 0.12345, rank: 1 }] },
    { schema_version: "job-matching.v1", matches: [{ job_posting_id: JOB_ID_A, score: 0.5, rank: 2 }] },
  ];

  for (const response of invalidResponses) {
    const handler = createHandler({ callNlp: async () => response });
    const res = responseCollector();
    await handler({ user: { id: "student-1" } }, res);
    assert.equal(res.statusCode, 502);
  }
});

test("rejects an NLP ordering violation before enriching results", async () => {
  const handler = createHandler({
    jobs: [job(JOB_ID_A), job(JOB_ID_B)],
    callNlp: async () => ({
      schema_version: "job-matching.v1",
      matches: [
        { job_posting_id: JOB_ID_A, score: 0.5, rank: 1 },
        { job_posting_id: JOB_ID_B, score: 0.6, rank: 2 },
      ],
    }),
  });
  const res = responseCollector();

  await handler({ user: { id: "student-1" } }, res);

  assert.equal(res.statusCode, 502);
});

test("rejects more than top_k matches and an equal-score tie in descending ID order", async () => {
  const ids = Array.from(
    { length: 6 },
    (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  );
  const tooMany = createHandler({
    jobs: ids.map((id) => job(id)),
    callNlp: async () => ({
      schema_version: "job-matching.v1",
      matches: ids.map((id, index) => ({
        job_posting_id: id,
        score: Number((0.9 - index * 0.1).toFixed(1)),
        rank: index + 1,
      })),
    }),
  });
  const tooManyResponse = responseCollector();
  await tooMany({ user: { id: "student-1" } }, tooManyResponse);
  assert.equal(tooManyResponse.statusCode, 502);

  const tieViolation = createHandler({
    jobs: [job(JOB_ID_A), job(JOB_ID_B)],
    callNlp: async () => ({
      schema_version: "job-matching.v1",
      matches: [
        { job_posting_id: JOB_ID_B, score: 0.5, rank: 1 },
        { job_posting_id: JOB_ID_A, score: 0.5, rank: 2 },
      ],
    }),
  });
  const tieResponse = responseCollector();
  await tieViolation({ user: { id: "student-1" } }, tieResponse);
  assert.equal(tieResponse.statusCode, 502);
});

test("maps unexpected database failures to a safe 500 response", async () => {
  const handler = createJobMatchingHandler({
    StudentModel: { async findByPk() { throw new Error("sensitive SQL detail"); } },
  });
  const res = responseCollector();

  await handler({ user: { id: "student-1" } }, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    message: "Unable to get job matches",
    code: "JOB_MATCHING_INTERNAL_ERROR",
  });
  assert.equal(JSON.stringify(res.body).includes("SQL"), false);
});
