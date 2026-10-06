const test = require("node:test");
const assert = require("node:assert/strict");
const models = require("../src/models");
const { updateStudentInfo } = require("../src/controllers/studentProfile.controller");

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const CURRENT_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ID = "33333333-3333-4333-8333-333333333333";

async function update(t, body) {
  const student = { advisor_teacher_id: CURRENT_ID, major: "IT" };
  let saved;
  let teacherQuery;
  t.mock.method(models.Student, "findByPk", async (id) => {
    assert.equal(id, STUDENT_ID);
    return {
      async update(values) {
        saved = values;
        Object.assign(student, values);
      },
    };
  });
  t.mock.method(models.Teacher, "findOne", async (query) => {
    teacherQuery = query;
    return { id: OTHER_ID };
  });
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await updateStudentInfo({ user: { id: STUDENT_ID }, body }, res);
  return { res, student, saved, teacherQuery };
}

test("omitting advisor_teacher_id preserves the existing advisor while saving unrelated fields", async (t) => {
  const result = await update(t, { major: "INE", year_level: 4, gpa: 3.5 });
  assert.equal(result.res.statusCode, 200);
  assert.deepEqual(result.saved, { major: "INE", year_level: 4, gpa: 3.5 });
  assert.equal(result.student.advisor_teacher_id, CURRENT_ID);
  assert.equal(result.student.major, "INE");
  assert.equal(result.teacherQuery, undefined);
});

test("explicit advisor change persists the ID using migration-compatible active-Teacher validation", async (t) => {
  const result = await update(t, { advisor_teacher_id: OTHER_ID });
  assert.equal(result.res.statusCode, 200);
  assert.equal(result.student.advisor_teacher_id, OTHER_ID);
  assert.deepEqual(result.teacherQuery, { attributes: ["id"], where: { id: OTHER_ID, status: "active" } });
});

test("explicit null remains supported for clearing the class advisor", async (t) => {
  const result = await update(t, { advisor_teacher_id: null });
  assert.equal(result.res.statusCode, 200);
  assert.deepEqual(result.saved, { advisor_teacher_id: null });
  assert.equal(result.student.advisor_teacher_id, null);
  assert.equal(result.teacherQuery, undefined);
});
