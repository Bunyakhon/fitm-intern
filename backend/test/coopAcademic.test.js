const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { normalizeNewCourseGrade, normalizePrerequisites, CATALOG } = require('../src/services/coopPrerequisites');
const { updateWindow, normalizeAcademicUpdate, academicSummary } = require('../src/services/coopAcademic.rules');
const { installAcademic } = require('../src/db/coopAcademicDevelopment');

test('reported grades validate independently of unconfirmed academic eligibility criteria', () => {
  for (const grade of ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D']) assert.equal(normalizeNewCourseGrade('passed', grade), grade);
  assert.equal(normalizeNewCourseGrade('failed', 'F'), 'F');
  for (const [status, grade] of [['passed', 'F'], ['failed', 'A'], ['failed', null], ['studying', 'A'], ['unselected', 'F'], ['unknown', null]]) assert.throws(() => normalizeNewCourseGrade(status, grade));
  const input = CATALOG.IT.map(([course_code], i) => ({ course_code, status: i < 2 ? 'studying' : 'passed', grade: i < 2 ? null : 'D' }));
  assert.equal(normalizePrerequisites('IT', input).filter(c => c.status === 'studying').length, 2);
});
test('approved and complete D/D+ grades remain pending verification; failed F never auto-certifies', () => {
  for (const course of [{ status: 'passed', grade: 'D' }, { status: 'passed', grade: 'D+' }, { status: 'failed', grade: 'F' }]) {
    const value = academicSummary({ status: 'approved' }, [{ course_code: '060243102', ...course }]);
    assert.equal(value.status, 'pending_verification'); assert.equal(value.verification.can_verify, false); assert.equal(value.verification.policy_status, 'pending_decision');
  }
});
test('latest state derives from append-only events without mutating legacy/original snapshot values', () => {
  const original = [{ course_code: '060243102', status: 'studying', grade: null }, { course_code: '060243104', status: 'passed', grade: 'legacy 2.5' }], before = JSON.stringify(original);
  const events = [{ course_code: '060243102', revision: 1, new_status: 'passed', new_grade: 'B+', created_at: '2026-11-07T00:00:00Z' }];
  const value = academicSummary({ status: 'approved' }, original, events, { available: true, revision: 1, history: true });
  assert.equal(value.latest_courses[0].original_status, 'studying'); assert.equal(value.latest_courses[0].status, 'passed');
  assert.equal(value.latest_courses[1].grade, 'legacy 2.5'); assert.equal(value.counts.legacy_unconfirmed, 1); assert.equal(value.status, 'pending_grades'); assert.equal(JSON.stringify(original), before);
});
test('update window includes approved before documents and blocks cancelled/rejected/issued/started requests', () => {
  for (const status of ['advisor_review', 'department_head_review', 'approved']) assert.ok(updateWindow({ status }));
  for (const status of ['submitted', 'staff_review', 'cancelled', 'rejected', 'document_issued', 'in_progress']) assert.equal(updateWindow({ status }), false);
  assert.equal(updateWindow({ status: 'approved', document_issued_at: new Date() }), false);
  assert.equal(updateWindow({ status: 'approved', started_at: new Date() }), false);
});
test('academic write contract rejects forged verification, malformed operation/version and invalid grade transitions', () => {
  const valid = { status: 'passed', grade: 'B+', expected_revision: 0, expected_request_status: 'approved', operation_id: randomUUID() };
  assert.deepEqual(normalizeAcademicUpdate(valid), valid);
  for (const patch of [{ verified_eligible: true }, { expected_revision: '0' }, { expected_revision: -1 }, { expected_revision: 2147483647 }, { operation_id: 'bad' }, { status: 'studying' }, { grade: 'F' }, { expected_request_status: 'cancelled' }]) assert.throws(() => normalizeAcademicUpdate({ ...valid, ...patch }));
});
test('additive installer target guards reject unsafe/ambiguous configuration before connecting', async () => {
  let connections = 0; const database = 'fitm_academic_test_guard';
  const cases = [{ name: 'intern_system' }, { environment: 'production' }, { flag: '0' }, { host: 'production.example' }, { port: 5433 }, { target: 'fitm_academic_test_other' }];
  for (const c of cases) {
    const m = { sequelize: { config: { database: c.name || database, host: c.host || '127.0.0.1', port: c.port || 5432 }, getDialect: () => 'postgres', transaction: () => { connections++; throw Error('Must not connect'); } } };
    await assert.rejects(() => installAcademic(m, { expectedDatabase: c.target || c.name || database, env: { NODE_ENV: c.environment || 'test', FITM_ACADEMIC_POSTGRES_TESTS: c.flag || '1', FITM_ACADEMIC_TEST_DATABASE: c.name || database } }), /Explicit academic/);
  }
  assert.equal(connections, 0);
});
