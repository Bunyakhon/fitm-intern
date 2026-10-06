const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const Company = require("../src/models").Company;
const models = require("../src/models");
const coopController = require("../src/controllers/coopRequest.controller");
const coopRoutes = require("../src/routes/coopRequest.routes");

process.env.JWT_SECRET = process.env.JWT_SECRET || "coop-request-test-secret";

async function withServer(run) {
  const app = express();
  app.use("/api/coop-requests", coopRoutes);
  const server = app.listen(0);
  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function studentToken() {
  return jwt.sign({ id: "student-1", student_id: "S-1" }, process.env.JWT_SECRET);
}

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const REQUEST_ID = "33333333-3333-4333-8333-333333333333";
const company = { id: COMPANY_ID, name: "Database Company", province: "Bangkok", address_no: "99", moo: null, subdistrict: "Subdistrict", district: "District" };
const requestBody = {
  prerequisite_courses: require('../src/services/coopPrerequisites').CATALOG.IT.map(([course_code]) => ({course_code, status: 'unselected', grade: null})),
  company_name: "Untrusted browser name", company_province: "Wrong Province", company_address: "Wrong address",
  letter_recipient_name: "Recipient", letter_recipient_position_department: "HR",
  work_start_date: "2026-11-01", work_end_date: "2027-01-31", delivery_methods: ["email"],
};

async function callCreate(body, { companyRecord = company, jobRecord = null } = {}) {
  const saved = {
    transaction: models.sequelize.transaction,
    student: models.Student.findByPk,
    company: Company.findByPk,
    job: models.JobPosting.findByPk,
    findOne: models.CoopRequest.findOne,
    create: models.CoopRequest.create,
    delivery: models.CoopRequestDeliveryMethod.bulkCreate,
    prerequisites: models.CoopRequestPrerequisiteCourse.bulkCreate,
    review: models.CoopRequestReview.create,
  };
  const transaction = { LOCK: { UPDATE: "UPDATE" }, finished: null, async commit() { this.finished = "commit"; }, async rollback() { this.finished = "rollback"; } };
  let createValues;
  let findCount = 0;
  try {
    models.sequelize.transaction = async () => transaction;
    models.Student.findByPk = async () => ({ id: "student-from-jwt", major: 'IT' });
    models.CoopRequestPrerequisiteCourse.bulkCreate = async () => [];
    models.CoopRequestReview.create = async () => ({});
    Company.findByPk = async () => companyRecord;
    models.JobPosting.findByPk = async () => jobRecord;
    models.CoopRequest.findOne = async () => (++findCount === 1 ? null : { id: REQUEST_ID, ...createValues, deliveryMethods: [] });
    models.CoopRequest.create = async (values) => { createValues = values; return { id: REQUEST_ID }; };
    models.CoopRequestDeliveryMethod.bulkCreate = async () => [];
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(bodyValue) { this.body = bodyValue; return this; } };
    await coopController.createCoopRequest({ body, user: { id: "student-from-jwt" } }, res);
    return { res, createValues, transaction };
  } finally {
    models.sequelize.transaction = saved.transaction;
    models.Student.findByPk = saved.student;
    Company.findByPk = saved.company;
    models.JobPosting.findByPk = saved.job;
    models.CoopRequest.findOne = saved.findOne;
    models.CoopRequest.create = saved.create;
    models.CoopRequestDeliveryMethod.bulkCreate = saved.delivery;
    models.CoopRequestPrerequisiteCourse.bulkCreate = saved.prerequisites;
    models.CoopRequestReview.create = saved.review;
  }
}

test("company search requires student authentication", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/coop-requests/companies/search?q=AB`);
    assert.equal(response.status, 401);
  });
});

test("company search performs partial matching and requests safe UI fields", async () => {
  const original = Company.findAll;
  let options;
  Company.findAll = async (value) => { options = value; return [{ id: "company-1", name: "ABC Ltd", province: "Bangkok" }]; };
  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/coop-requests/companies/search?q=BC`, { headers: { Authorization: `Bearer ${studentToken()}` } });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.data[0].name, "ABC Ltd");
      assert.deepEqual(options.attributes, ["id", "name", "province", "address_no", "moo", "subdistrict", "district"]);
      const pattern = options.where.name[Object.getOwnPropertySymbols(options.where.name)[0]];
      assert.equal(pattern, "%BC%");
    });
  } finally { Company.findAll = original; }
});

test("manual duplicate check normalizes whitespace and case without matching different names", async () => {
  const original = Company.findAll;
  let options;
  const fixtures = [
    { id: "same", name: "  Example   Company ", province: "Bangkok", address_no: "1", moo: null, subdistrict: "Sub", district: "District" },
    { id: "different", name: "Example Company Group", province: "Bangkok", address_no: "2", moo: null, subdistrict: "Other", district: "District" },
  ];
  Company.findAll = async (value) => { options = value; return value.where.normalized_name === "example company" ? fixtures.slice(0, 1) : []; };
  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/coop-requests/companies/duplicate-check?name=example%20company`, { headers: { Authorization: `Bearer ${studentToken()}` } });
      const result = await response.json();
      assert.deepEqual(result.data.map((company) => company.id), ["same"]);
      assert.equal(options.where.normalized_name, "example company");
      assert.deepEqual(Object.keys(result.data[0]).sort(), ["address_no", "district", "id", "moo", "name", "province", "subdistrict"].sort());
    });
  } finally { Company.findAll = original; }
});

test("existing-company request resolves trusted snapshots and student identity on the backend", async () => {
  const { res, createValues } = await callCreate({ ...requestBody, company_id: COMPANY_ID });
  assert.equal(res.statusCode, 201);
  assert.equal(createValues.student_id, "student-from-jwt");
  assert.equal(createValues.company_id, COMPANY_ID);
  assert.equal(createValues.company_name, company.name);
  assert.equal(createValues.company_province, company.province);
  assert.equal(createValues.company_address, "99 Subdistrict District Bangkok");
});

test("manual request preserves snapshot workflow without creating a Company", async () => {
  const saved = Company.findByPk;
  let lookups = 0;
  Company.findByPk = async () => { lookups += 1; return null; };
  try {
    const { res, createValues } = await callCreate({ ...requestBody });
    assert.equal(res.statusCode, 201);
    assert.equal(createValues.company_id, null);
    assert.equal(createValues.company_name, requestBody.company_name);
    assert.equal(lookups, 0);
  } finally { Company.findByPk = saved; }
});

test("published job request must exist, be published, and belong to its selected company", async () => {
  const accepted = await callCreate({ ...requestBody, company_id: COMPANY_ID, job_posting_id: JOB_ID }, { jobRecord: { id: JOB_ID, status: "published", company_id: COMPANY_ID } });
  assert.equal(accepted.res.statusCode, 201);
  assert.equal(accepted.createValues.job_posting_id, JOB_ID);

  for (const jobRecord of [null, { id: JOB_ID, status: "pending_review", company_id: COMPANY_ID }, { id: JOB_ID, status: "published", company_id: "44444444-4444-4444-8444-444444444444" }]) {
    const rejected = await callCreate({ ...requestBody, company_id: COMPANY_ID, job_posting_id: JOB_ID }, { jobRecord });
    assert.equal(rejected.res.statusCode, 400);
    assert.equal(rejected.transaction.finished, "rollback");
  }
});
