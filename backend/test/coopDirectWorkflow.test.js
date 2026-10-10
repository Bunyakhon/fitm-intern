const test = require('node:test'); const assert = require('node:assert/strict');
const {createRoleWorkflowService} = require('../src/services/roleWorkflow.service');
const {createRoleWorkflowRouter} = require('../src/routes/roleWorkflow.routes');
const ID = n => `${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
function fixture(status = 'advisor_review') {
  let state = {status, updatedAt: new Date('2026-10-09T00:00:00.000Z'), reviews: []}; let queue = Promise.resolve(); const locks = [];
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
      locks.push(['request', options.lock]); const row = {status: options.transaction.staged.status, updatedAt: options.transaction.staged.updatedAt};
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

test('Staff stale stage or timestamp rejects without changing request or history', async () => {
  for (const expected of [
    {expected_status:'submitted', expected_updated_at:'2026-10-09T00:00:00.000Z'},
    {expected_status:'advisor_review', expected_updated_at:'2026-10-08T00:00:00.000Z'},
  ]) {
    const f = fixture();
    await assert.rejects(f.service.reviewRequest('department_staff', ID(3), ID(5), 'cancel', {reason:'Changed plan', ...expected}), {status:409});
    assert.equal(f.state().status,'advisor_review'); assert.equal(f.state().reviews.length,0);
  }
  const f = fixture(); await f.service.reviewRequest('department_staff', ID(3), ID(5), 'cancel', {reason:'  Changed plan  ', expected_status:'advisor_review', expected_updated_at:'2026-10-09T00:00:00.000Z'});
  assert.equal(f.state().reviews[0].reason,'Changed plan'); assert.equal(f.state().reviews[0].department_staff_id,ID(3));
});

test('Staff cancellation validates reason, preconditions, unsupported fields and UUIDs', async () => {
  const f = fixture();
  for (const body of [null, [], {}, {reason:null}, {reason:42}, {reason:''}, {reason:'   '}, {reason:'x'.repeat(2001)}, {reason:'OK', staff_id:ID(3)}, {reason:'OK', expected_status:'advisor_review'}, {reason:'OK', expected_updated_at:'2026-10-09T00:00:00.000Z'}, {reason:'OK', expected_status:'unknown', expected_updated_at:'2026-10-09T00:00:00.000Z'}, {reason:'OK', expected_status:'advisor_review', expected_updated_at:'2026-02-31T00:00:00.000Z'}]) {
    await assert.rejects(f.service.reviewRequest('department_staff', ID(3), ID(5), 'cancel', body), {status:400});
  }
  await assert.rejects(f.service.reviewRequest('department_staff', ID(3), 'invalid', 'cancel', {reason:'OK'}), {status:400});
  assert.equal(f.state().reviews.length,0);
});

test('Staff audit failure rolls back cancellation status and server timestamp', async () => {
  const f = fixture(); f.models.CoopRequestReview.create = async () => { throw Error('audit unavailable'); };
  await assert.rejects(f.service.reviewRequest('department_staff', ID(3), ID(5), 'cancel', {reason:'Changed plan'}), /audit unavailable/);
  assert.equal(f.state().status,'advisor_review'); assert.equal(f.state().cancelled_at,undefined); assert.equal(f.state().reviews.length,0);
});

test('Staff cancellation against Class or Head approval uses stale preconditions', async () => {
  for (const [role, status, id] of [['teacher','advisor_review',1], ['department_head','department_head_review',2]]) {
    const f = fixture(status), body = {reason:'Changed plan', expected_status:status, expected_updated_at:'2026-10-09T00:00:00.000Z'};
    const results = await Promise.allSettled([f.service.reviewRequest(role,ID(id),ID(5),'approve',{}), f.service.reviewRequest('department_staff',ID(3),ID(5),'cancel',body)]);
    assert.equal(results[0].status,'fulfilled'); assert.equal(results[1].reason.status,409); assert.equal(f.state().reviews.length,1);
  }
});

test('Staff search/list/detail reuse request records and expose only safe named actors', async () => {
  const {Op} = require('sequelize');
  const f = fixture(); let searchQuery, reviewQuery;
  const row = {id:ID(5),status:'advisor_review',updatedAt:new Date('2026-10-09T00:00:00.000Z'),student:{student_id:'66001'},toJSON(){return {id:this.id,status:this.status,updatedAt:this.updatedAt,student:this.student};}};
  f.models.CoopRequest.findAll = async query => {searchQuery=query;return [row];};
  const rows = await f.service.listRequests('department_staff',ID(3),{search:'  66001%_  ',offset:25,limit:26});
  assert.equal(rows[0].cancellation.allowed,true);assert.equal(rows[0].cancellation.expected_status,'advisor_review');assert.equal(searchQuery.offset,25);assert.equal(searchQuery.limit,26);
  assert.equal(searchQuery.where[Op.or].find(item=>item['$student.student_id$'])['$student.student_id$'][Op.iLike],'%66001\\%\\_%');
  await assert.rejects(f.service.listRequests('department_staff',ID(3),{search:['invalid']}),{status:400});
  f.models.CoopRequest.findByPk = async()=>row;
  f.models.CoopRequestReview.findAll = async query=>{reviewQuery=query;return [];};
  const detail = await f.service.requestDetail('department_staff',ID(3),ID(5));assert.equal(detail.cancellation.allowed,true);
  assert.deepEqual(reviewQuery.include.find(item=>item.as==='staff').attributes,['id','first_name','last_name']);
  row.status='approved';assert.equal((await f.service.requestDetail('department_staff',ID(3),ID(5))).cancellation.allowed,false);
});
