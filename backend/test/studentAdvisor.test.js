const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, OTHER } = require("./helpers/studentProfileIntegrityFixture");
const NEXT = "33333333-3333-4333-8333-333333333333";
async function update(t, body) {
  const f = await fixture(t);
  const before = f.row();
  const revision = (await f.request("GET")).body.profile_revision;
  const response = await f.request("PUT", body, revision, { path: "/student-info" });
  assert.deepEqual(f.row(), before, "academic updates preserve every existing profile field");
  return { f, response };
}
test("omitting advisor preserves the existing advisor under the aggregate revision", async t => {
  const { f, response } = await update(t, { major: "INE", year_level: 4, gpa: 3.5 });
  assert.equal(response.status, 200);
  assert.equal(f.studentRow().advisor_teacher_id, OTHER);
  assert.deepEqual(f.studentWrites, [{ major: "INE", year_level: 4, gpa: "3.50" }]);
  assert.equal(f.teacherQueries.length, 0);
});
test("explicit advisor change validates active Teacher within the same transaction", async t => {
  const { f, response } = await update(t, { advisor_teacher_id: NEXT });
  assert.equal(response.status, 200);
  assert.equal(f.studentRow().advisor_teacher_id, NEXT);
  assert.deepEqual(f.teacherQueries[0].where, { id: NEXT, status: "active" });
  assert.deepEqual(f.teacherQueries[0].attributes, ["id"]);
  assert.ok(f.teacherQueries[0].transaction.ownerLocked);
});
test("explicit null clears only the advisor and changes the aggregate revision", async t => {
  const { f, response } = await update(t, { advisor_teacher_id: null });
  assert.equal(response.status, 200);
  assert.deepEqual(f.studentWrites, [{ advisor_teacher_id: null }]);
  assert.equal(f.studentRow().advisor_teacher_id, null);
  assert.equal(f.teacherQueries.length, 0);
});
