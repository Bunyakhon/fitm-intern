const test = require('node:test'); const assert = require('node:assert/strict');
const {createRoleWorkflowService} = require('../src/services/roleWorkflow.service');
const {createRoleWorkflowRouter} = require('../src/routes/roleWorkflow.routes');
const ID = n => `${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
function fixture(status = 'advisor_review') {
  let state = {status, reviews: []}; let queue = Promise.resolve(); const locks = [];
  const actors = {advisor: {id: ID(1), department: 'FITM', status: 'active', is_department_head: false}, head: {id: ID(2), department: 'FITM', status: 'active', is_department_head: true}, staff: {id: ID(3), is_active: true}};
  const m = {
    sequelize: {async transaction(fn) {
      const previous = queue; let release; queue = new Promise(resolve => {release = resolve;}); await previous;
      const transaction = {LOCK: {UPDATE: 'UPDATE', SHARE: 'SHARE'}, staged: structuredClone(state)};
      try {const result = await fn(transaction); state = transaction.staged; return result;} finally {release();}
    }},
    Teacher: {async findOne({where}) {return Object.values(actors).find(actor => actor.id === where.id && actor.status === 'active') || null;}, async findByPk(id) {return id === actors.advisor.id ? actors.advisor : null;}},
    DepartmentStaff: {async findOne({where}) {return actors.staff.is_active && where.id === actors.staff.id ? actors.staff : null;}},
    Student: {async findByPk(_, options) {locks.push(['student', options.lock]); return {advisor_teacher_id: actors.advisor.id, coop_advisor_teacher_id: actors.head.id};}},
    CoopRequest: {async findByPk(_, options) {
      if (options.attributes) return {student_id: ID(4)};
      locks.push(['request', options.lock]); const row = {status: options.transaction.staged.status};
      row.update = async data => {Object.assign(row, data); Object.assign(options.transaction.staged, data);}; return row;
    }},
    CoopRequestReview: {async create(data, {transaction}) {transaction.staged.reviews.push(data); return data;}},
  };
  return {actors, locks, state: () => state, service: createRoleWorkflowService(m), models: m};
}
test('class Advisor approves directly to Head; Head approves; audit and lock order preserved', async () => {
  const f = fixture(); await f.service.reviewRequest('teacher', ID(1), ID(5), 'approve', {});
  assert.equal(f.state().status, 'department_head_review');
  await f.service.reviewRequest('department_head', ID(2), ID(5), 'approve', {}); assert.equal(f.state().status, 'approved');
  assert.deepEqual(f.state().reviews.map(row => [row.actor_role,row.from_status,row.to_status,row.decision]), [['teacher','advisor_review','department_head_review','approve'],['department_head','department_head_review','approved','approve']]);
  assert.deepEqual(f.locks.slice(0,2), [['student','UPDATE'],['request','UPDATE']]);
});
for (const [role, id, status] of [['teacher',1,'advisor_review'],['department_head',2,'department_head_review']]) test(`${role} rejection is reasoned and audited`, async () => {
  const f = fixture(status); await f.service.reviewRequest(role, ID(id), ID(5), 'reject', {reason: 'Correction required'});
  assert.equal(f.state().status, 'rejected'); assert.equal(f.state().reviews[0].reason, 'Correction required');
});
test('unrelated Teacher, project advisor and non-head Teacher cannot approve', async () => {
  const f = fixture(); await assert.rejects(f.service.reviewRequest('teacher', ID(2), ID(5), 'approve', {}), {status:403});
  await assert.rejects(f.service.reviewRequest('department_head', ID(1), ID(5), 'approve', {}), {status:403});
  await assert.rejects(f.service.reviewRequest('teacher', ID(6), ID(5), 'approve', {}), {status:403});
});
test('Staff approve/reject/forward prohibited and request decision routes removed', async () => {
  const f = fixture(); for (const action of ['approve','reject','forward']) await assert.rejects(f.service.reviewRequest('department_staff', ID(3), ID(5), action, {}), {status:403});
  const router = createRoleWorkflowRouter('department_staff'); const paths = router.stack.filter(layer => layer.route).map(layer => layer.route.path);
  assert.ok(paths.includes('/coop-requests/:id/cancel')); assert.ok(!paths.includes('/coop-requests/:id/approve')); assert.ok(!paths.includes('/coop-requests/:id/reject')); assert.ok(!paths.includes('/coop-requests/:id/forward'));
});
for (const status of ['submitted','advisor_review','staff_review','department_head_review']) test(`Staff cancellation of ${status} is authorized, reasoned and audited`, async () => {
  const f = fixture(status); await f.service.reviewRequest('department_staff', ID(3), ID(5), 'cancel', {reason:'Withdrawn at department'});
  assert.equal(f.state().status, 'cancelled'); assert.ok(f.state().cancelled_at); assert.equal(f.state().reviews[0].department_staff_id, ID(3)); assert.equal(f.state().reviews[0].decision, 'cancel');
});
for (const status of ['approved','rejected','cancelled','document_issued','in_progress']) test(`Staff cannot cancel ${status}`, async () => {
  const f = fixture(status); await assert.rejects(f.service.reviewRequest('department_staff', ID(3), ID(5), 'cancel', {reason:'Fixture'}), {status:409}); assert.equal(f.state().reviews.length, 0);
});
test('unauthorized/inactive Staff and missing cancellation reason are rejected', async () => {
  const f = fixture(); await assert.rejects(f.service.reviewRequest('department_staff', ID(3), ID(5), 'cancel', {}), {status:400});
  f.actors.staff.is_active = false; await assert.rejects(f.service.reviewRequest('department_staff', ID(3), ID(5), 'cancel', {reason:'Fixture'}), {status:403});
});
test('serialized competing decisions/cancellations commit only one audit', async () => {
  for (const role of ['teacher','department_staff']) {
    const f = fixture(); const args = role === 'teacher' ? ['approve',{}] : ['cancel',{reason:'Fixture'}];
    const results = await Promise.allSettled([f.service.reviewRequest(role, ID(role === 'teacher' ? 1 : 3), ID(5), ...args), f.service.reviewRequest(role, ID(role === 'teacher' ? 1 : 3), ID(5), ...args)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1); assert.equal(results.find(result => result.status === 'rejected').reason.status, 409); assert.equal(f.state().reviews.length, 1);
  }
});
test('audit write failure rolls back decision', async () => {
  const f = fixture(); f.models.CoopRequestReview.create = async () => {throw new Error('fixture audit failed');};
  await assert.rejects(f.service.reviewRequest('teacher', ID(1), ID(5), 'approve', {}), /fixture audit failed/); assert.equal(f.state().status, 'advisor_review');
});
