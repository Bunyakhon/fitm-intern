const test = require("node:test");
const assert = require("node:assert/strict");
const { Op } = require("sequelize");
const { createCompanyEvaluationService } = require("../src/services/companyEvaluation.service");

test("evaluation context safely handles missing fields, placement dates and explicit query attributes", async () => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const student = { id, track: "co_op", first_name: null, last_name: "  ", student_id: " ", major: null };
  let mentor = { first_name: null, last_name: "", position: "  " }, requests = [], evaluation = null;
  const transaction = {};
  const m = {
    sequelize: { transaction: fn => fn(transaction), query: async sql => assert.match(sql, /READ ONLY/) },
    Student: { findByPk: async (owner, options) => {
      assert.equal(owner, id); assert.deepEqual(options.attributes, ["id", "student_id", "first_name", "last_name", "major", "track"]); return student;
    } },
    Mentor: { findOne: async options => {
      assert.equal(options.where.student_id, id); assert.deepEqual(options.attributes, ["id", "first_name", "last_name", "position"]); return mentor;
    } },
    Company: {},
    CoopRequest: { findAll: async options => {
      assert.equal(options.where.student_id, id); assert.deepEqual(options.where.status[Op.in], ["approved", "document_issued", "in_progress"]);
      assert.equal(options.limit, 2); assert.deepEqual(options.include[0].attributes, ["name"]); return requests;
    } },
    CompanyEvaluation: { findOne: async options => { assert.equal(options.where.student_id, id); assert.ok(options.attributes.includes("updatedAt")); return evaluation; } },
  };
  const service = createCompanyEvaluationService(m);
  let result = await service.read(id);
  assert.equal(result.student.name, ""); assert.equal(result.mentor.name, "");
  assert.ok(Object.values(result.display).every(value => value === null));
  mentor = null; student.student_id = "67000000001-1"; student.major = "IT";
  requests = [{ company_name: " ", company: { name: " Linked company " }, work_start_date: "2026-02-31", work_end_date: null }];
  result = await service.read(id); assert.equal(result.mentor, null);
  assert.equal(result.display.company_name, "Linked company"); assert.equal(result.display.work_start_date, null); assert.equal(result.display.work_end_date, null);
  assert.equal(result.display.student_id, "67000000001-1"); assert.equal(result.display.major, "IT");
  evaluation = { id: "saved", q1_score: 8, q2_score: 9, q3_score: 8, q4_score: 9, q5_score: 8, comment: "", updatedAt: new Date("2026-10-07T03:04:05Z") };
  requests[0].work_start_date = "2026-06-01"; requests[0].work_end_date = "2026-09-30";
  result = await service.read(id);
  assert.equal(result.display.evaluation_date, "2026-10-07T03:04:05.000Z");
  assert.equal(result.display.work_start_date, "2026-06-01"); assert.equal(result.display.work_end_date, "2026-09-30");
  assert.equal(result.evaluation.total_score, 42); assert.equal(result.evaluation.average_score, 8.4);
  evaluation.updatedAt = new Date("invalid"); assert.equal((await service.read(id)).display.evaluation_date, null);
});
