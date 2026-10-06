const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/models');
const controller = require('../src/controllers/coopRequest.controller');
const {CATALOG, normalizePrerequisites} = require('../src/services/coopPrerequisites');
const STUDENT = '11111111-1111-4111-8111-111111111111';
const REQUEST = '22222222-2222-4222-8222-222222222222';
const rows = program => CATALOG[program].map(([course_code], index) => ({course_code, status: index === 0 ? 'passed' : index === 1 ? 'studying' : 'unselected', grade: index === 0 ? 'B+' : null}));
const fields = {company_name: 'Fixture', company_province: 'Fixture', company_address: 'Fixture', letter_recipient_name: 'Fixture', work_start_date: '2026-11-01', work_end_date: '2027-01-01', delivery_methods: ['email']};
function response() { return {statusCode: 200, status(code) {this.statusCode = code; return this;}, json(body) {this.body = body; return this;}}; }

function storage(t, program, fail = null) {
  let committed = {request: null, courses: [], reviews: []}; let transaction; let major = program;
  t.mock.method(m.sequelize, 'transaction', async () => {
    const staged = structuredClone(committed);
    transaction = {staged, LOCK: {UPDATE: 'UPDATE'}, finished: null,
      async commit() {committed = staged; this.finished = 'commit';}, async rollback() {this.finished = 'rollback';}};
    return transaction;
  });
  t.mock.method(m.Student, 'findByPk', async (id, options) => {
    assert.equal(id, STUDENT); assert.equal(options.lock, 'UPDATE'); return {id, major};
  });
  t.mock.method(m.CoopRequest, 'findOne', async options => {
    const state = options.transaction?.staged || committed;
    if (options.where.id) return state.request && state.request.student_id === options.where.student_id ? {...state.request, prerequisite_courses: structuredClone(state.courses), reviews: structuredClone(state.reviews)} : null;
    return null;
  });
  t.mock.method(m.CoopRequest, 'create', async (data, options) => {
    options.transaction.staged.request = {id: REQUEST, ...data}; return {id: REQUEST};
  });
  t.mock.method(m.CoopRequestPrerequisiteCourse, 'bulkCreate', async (data, options) => {
    assert.equal(options.transaction, transaction); assert.equal(options.validate, true);
    options.transaction.staged.courses = structuredClone(data);
    if (fail === 'courses') throw new Error('fixture prerequisite insertion failed');
  });
  t.mock.method(m.CoopRequestReview, 'create', async (data, options) => {
    assert.equal(options.transaction, transaction); options.transaction.staged.reviews.push(data);
    if (fail === 'audit') throw new Error('fixture audit insertion failed');
  });
  t.mock.method(m.CoopRequestDeliveryMethod, 'bulkCreate', async (_, options) => {assert.equal(options.transaction, transaction);});
  return {
    state: () => committed, transaction: () => transaction, major: value => {major = value;},
    async create(input = rows(program), user = STUDENT) {const res = response(); await controller.createCoopRequest({body: {...fields, prerequisite_courses: input}, user: {id: user}}, res); return res;},
    async read(user = STUDENT) {const res = response(); await controller.getCoopRequestById({params: {id: REQUEST}, user: {id: user}}, res); return res;},
  };
}
for (const program of ['IT','INE']) test(`${program} saves five snapshots atomically and detail reads historical rows`, async t => {
  const db = storage(t, program); const res = await db.create(); assert.equal(res.statusCode, 201);
  assert.equal(db.state().request.status, 'advisor_review');
  assert.deepEqual(db.state().courses.map(row => row.course_code), CATALOG[program].map(([code]) => code));
  assert.equal(db.state().courses[0].course_name, CATALOG[program][0][1]);
  assert.deepEqual(db.state().reviews[0], {coop_request_id: REQUEST, actor_role: 'student', student_id: STUDENT, teacher_id: null, department_staff_id: null, from_status: 'new', to_status: 'advisor_review', decision: 'submit', reason: null});
  db.major(program === 'IT' ? 'INE' : 'IT'); const detail = await db.read();
  assert.equal(detail.statusCode, 200); assert.equal(detail.body.data.prerequisite_courses[0].program, program);
  assert.equal(detail.body.data.prerequisite_courses[0].grade, 'B+');
  assert.equal((await db.read('other-student')).statusCode, 404);
});
const invalid = [
  ['IT cross-program code', 'IT', input => {input[0].course_code = CATALOG.INE[0][0];}],
  ['INE cross-program code', 'INE', input => {input[0].course_code = CATALOG.IT[0][0];}],
  ['duplicate code', 'IT', input => {input[1].course_code = input[0].course_code;}],
  ['unknown code', 'IT', input => {input[0].course_code = '999999999';}],
  ['missing grade', 'IT', input => {input[0].grade = ' ';}],
  ['studying grade', 'IT', input => {input[1].grade = 'A';}],
  ['unselected grade', 'IT', input => {input[2].grade = 'A';}],
  ['invalid status', 'IT', input => {input[0].status = 'both';}],
  ['client name/program spoof', 'IT', input => {input[0].program = 'INE'; input[0].course_name = 'Spoof';}],
  ['missing course', 'IT', input => input.pop()],
];
for (const [name, program, mutate] of invalid) test(`backend rejects ${name} without persisting request`, async t => {
  const db = storage(t, program); const input = rows(program); mutate(input);
  assert.equal((await db.create(input)).statusCode, 400); assert.equal(db.state().request, null); assert.equal(db.transaction().finished, 'rollback');
});
test('unsupported major and absent Student are rejected independently', async t => {
  const db = storage(t, 'IT'); db.major('UNKNOWN'); assert.equal((await db.create()).statusCode, 400);
  m.Student.findByPk = async () => null; assert.equal((await db.create()).statusCode, 404);
});
for (const failure of ['courses','audit']) test(`${failure} insertion failure rolls back request, snapshots and audit`, async t => {
  t.mock.method(console, 'error', () => {});
  const db = storage(t, 'IT', failure); assert.equal((await db.create()).statusCode, 500);
  assert.deepEqual(db.state(), {request: null, courses: [], reviews: []}); assert.equal(db.transaction().finished, 'rollback');
});
test('blank non-passed grades normalize to null and canonical order ignores client ordering', () => {
  const input = rows('INE').reverse(); input[0].grade = ' ';
  const result = normalizePrerequisites('INE', input);
  assert.deepEqual(result.map(row => row.course_code), CATALOG.INE.map(([code]) => code));
  assert.equal(result[4].grade, null);
});
