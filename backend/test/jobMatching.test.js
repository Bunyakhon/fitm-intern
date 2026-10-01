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
const USABLE_RESUME_TEXT = "Experienced software engineer with Python, SQL, Node.js, React, and database development skills for production web services and reliable cloud applications.";

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
    StudentFileModel: { async findOne() { return null; } },
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

test("omitted source keeps the default profile and ready cached Resume weighted sources", async () => {
  let payload;
  const handler = createJobMatchingHandler({
    StudentModel: { async findByPk() { return { id: "11111111-1111-4111-8111-111111111111", major: "IT", profile: { related_skills: "Python SQL" } }; } },
    StudentFileModel: { async findOne() { return { extraction_status: "ready", extracted_text: USABLE_RESUME_TEXT, get() { return { extraction_status: "ready", extracted_text: USABLE_RESUME_TEXT }; } }; } },
    JobPostingModel: { async findAll() { return [job()]; } },
    callNlp: async (value) => { payload = value; return { schema_version: "job-matching.v1", matches: [] }; },
  });
  const res = responseCollector();
  await handler({ user: { id: "11111111-1111-4111-8111-111111111111" } }, res);
  assert.equal(payload.candidate.text, "IT Python SQL");
  assert.equal(payload.candidate.resume_text, USABLE_RESUME_TEXT);
  assert.equal(JSON.stringify(res.body).includes(USABLE_RESUME_TEXT), false);
  assert.equal(res.statusCode, 200);
});

test("skills mode sends only profile text and never queries Resume", async () => {
  let payload;
  const handler = createJobMatchingHandler({
    StudentModel: { async findByPk(_id, query) {
      assert.deepEqual(query.attributes, ["id", "major"]);
      assert.equal(query.include.length, 1);
      return { id: "student-1", major: "IT", profile: { related_skills: "Python SQL" } };
    } },
    StudentFileModel: { async findOne() { assert.fail("skills mode must not query Resume"); } },
    JobPostingModel: { async findAll() { return [job()]; } },
    callNlp: async (value) => { payload = value; return { schema_version: "job-matching.v1", matches: [] }; },
  });
  const res = responseCollector();
  await handler({ user: { id: "student-1" }, query: { source: "skills" } }, res);
  assert.deepEqual(payload.candidate, { text: "IT Python SQL" });
  assert.equal(res.statusCode, 200);
});

test("resume mode sends only persisted Resume text and excludes profile fields", async () => {
  let payload;
  let fileQuery;
  const handler = createJobMatchingHandler({
    StudentModel: { async findByPk(_id, query) {
      assert.deepEqual(query.attributes, ["id"]);
      assert.deepEqual(query.include, []);
      return { id: "student-1", major: "must not use", profile: { related_skills: "must not use" } };
    } },
    StudentFileModel: { async findOne(query) {
      fileQuery = query;
      return {
        extraction_status: "ready",
        extracted_text: USABLE_RESUME_TEXT,
        storage_path: "private/internal/resume.pdf",
        get() { return this; },
      };
    } },
    JobPostingModel: { async findAll() { return [job()]; } },
    callNlp: async (value) => { payload = value; return { schema_version: "job-matching.v1", matches: [] }; },
  });
  const res = responseCollector();
  await handler({ user: { id: "student-1" }, query: { source: "resume" } }, res);
  assert.deepEqual(fileQuery.where, { student_id: "student-1", file_type: "resume" });
  assert.deepEqual(payload.candidate, { text: USABLE_RESUME_TEXT });
  assert.equal("resume_text" in payload.candidate, false);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.stringify(res.body).includes(USABLE_RESUME_TEXT), false);
  assert.equal(JSON.stringify(res.body).includes("private/internal/resume.pdf"), false);
  assert.equal(JSON.stringify(res.body).includes("extracted_text"), false);
  assert.equal(JSON.stringify(res.body).includes("JWT"), false);
});

test("skills mode with empty profile returns its specific 422 without Resume fallback", async () => {
  const handler = createJobMatchingHandler({
    StudentModel: { async findByPk() { return { id: "student-1", major: "", profile: { related_skills: "" } }; } },
    StudentFileModel: { async findOne() { assert.fail("skills mode must not query Resume"); } },
    callNlp: async () => assert.fail("NLP must not be called"),
  });
  const res = responseCollector();
  await handler({ user: { id: "student-1" }, query: { source: "skills" } }, res);
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.code, "MATCH_PROFILE_TEXT_REQUIRED");
});

test("resume mode requires a ready usable persisted Resume", async () => {
  for (const file of [
    null,
    { extraction_status: "failed", extracted_text: "old text" },
    { extraction_status: "pending", extracted_text: "text not ready" },
    { extraction_status: "ready", extracted_text: "   " },
    { extraction_status: "ready", extracted_text: "Node.js React" },
  ]) {
    const handler = createJobMatchingHandler({
      StudentModel: { async findByPk() { return { id: "student-1" }; } },
      StudentFileModel: { async findOne() { return file && { ...file, get() { return this; } }; } },
      callNlp: async () => assert.fail("NLP must not be called"),
    });
    const res = responseCollector();
    await handler({ user: { id: "student-1" }, query: { source: "resume" } }, res);
    assert.equal(res.statusCode, 422);
    assert.equal(res.body.code, "MATCH_RESUME_TEXT_REQUIRED");
  }
});

test("rejects an invalid source without querying student or NLP", async () => {
  const handler = createJobMatchingHandler({
    StudentModel: { async findByPk() { assert.fail("invalid source must be rejected first"); } },
    callNlp: async () => assert.fail("NLP must not be called"),
  });
  const res = responseCollector();
  await handler({ user: { id: "student-1" }, query: { source: "invalid" } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "MATCH_SOURCE_INVALID");
});

test("uses resume text when profile fields are empty", async () => {
  let candidate;
  const handler = createJobMatchingHandler({
    StudentModel: { async findByPk() { return { id: "11111111-1111-4111-8111-111111111111", major: "", profile: { related_skills: "" } }; } },
    StudentFileModel: { async findOne() { return { extraction_status: "ready", extracted_text: USABLE_RESUME_TEXT, get() { return { extraction_status: "ready", extracted_text: USABLE_RESUME_TEXT }; } }; } },
    JobPostingModel: { async findAll() { return [job()]; } },
    callNlp: async (value) => { candidate = value.candidate; return { schema_version: "job-matching.v1", matches: [] }; },
  });
  const res = responseCollector();
  await handler({ user: { id: "11111111-1111-4111-8111-111111111111" } }, res);
  assert.deepEqual(candidate, { text: USABLE_RESUME_TEXT });
  assert.equal(res.statusCode, 200);
});

test("falls back safely for missing, failed, and empty resume extraction", async () => {
  for (const extractor of [async () => { throw new Error("private path and text"); }, async () => "   "]) {
    const handler = createJobMatchingHandler({
      StudentModel: { async findByPk() { return { id: "11111111-1111-4111-8111-111111111111", major: "IT", profile: { related_skills: "SQL" } }; } },
      StudentFileModel: { async findOne() { return { storage_path: "students/11111111-1111-4111-8111-111111111111/resume/r.pdf", mime_type: "application/pdf" }; } },
      extractResumeText: extractor,
      JobPostingModel: { async findAll() { return [job()]; } },
      callNlp: async (value) => { assert.equal(value.candidate.text, "IT SQL"); return { schema_version: "job-matching.v1", matches: [] }; },
    });
    const res = responseCollector();
    await handler({ user: { id: "11111111-1111-4111-8111-111111111111" } }, res);
    assert.equal(res.statusCode, 200);
  }
  const handler = createHandler({ callNlp: async () => ({ schema_version: "job-matching.v1", matches: [] }) });
  const res = responseCollector();
  await handler({ user: { id: "student-1" } }, res);
  assert.equal(res.statusCode, 200);
});

test("requires some candidate text when profile and resume are unusable", async () => {
  const handler = createJobMatchingHandler({
    StudentModel: { async findByPk() { return { id: "11111111-1111-4111-8111-111111111111", major: "", profile: { related_skills: "" } }; } },
    StudentFileModel: { async findOne() { return { storage_path: "students/11111111-1111-4111-8111-111111111111/resume/r.pdf", mime_type: "application/pdf" }; } },
    extractResumeText: async () => "",
    callNlp: async () => assert.fail("NLP must not be called"),
  });
  const res = responseCollector();
  await handler({ user: { id: "11111111-1111-4111-8111-111111111111" } }, res);
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
