const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createStaffDocumentsService } = require('../src/services/staffDocuments.service');
const { responseValues, placementEligibility } = require('../src/services/companyResponseRules');
const { createStudentCompanyResponseHandler } = require('../src/controllers/companyResponse.controller');
const ID = n => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;
const body = { status: 'accepted', responded_at: '2026-01-01', note: 'Company decision' };

// Transactional model doubles exercise the real services without connecting to
// any database. PostgreSQL lock/constraint acceptance is a separate opt-in test.
function fixture() {
  const student = { id: ID(1), student_id: '66001', first_name: 'Student', last_name: 'One', major: 'IT', advisor_teacher_id: ID(6), coop_advisor_teacher_id: ID(7) };
  const request = { id: ID(2), student_id: student.id, status: 'approved', company_name: '<script>Company</script>', company_address: 'Frozen address', company_province: 'Bangkok', letter_recipient_name: 'HR', work_start_date: '2026-11-01', work_end_date: '2027-02-01' };
  const reviews = [{ actor_role: 'teacher', teacher_id: ID(6), decision: 'approve', from_status: 'advisor_review', to_status: 'department_head_review' }, { actor_role: 'department_head', teacher_id: ID(8), decision: 'approve', from_status: 'department_head_review', to_status: 'approved' }];
  const snapshot = { student: structuredClone(student), request: structuredClone(request), approval: { class: { teacher_id: ID(6) }, head: { teacher_id: ID(8) } } };
  let state = { student, request, docs: [{ id: ID(3), coop_request_id: request.id, document_type: 'cooperation', status: 'generated', version: 2, generated_at: new Date('2026-01-01'), content_sha256: 'a'.repeat(64), snapshot, metadata: { issue_date: '2026-01-01' } }], responses: [], history: [], revisions: [] };
  let queue = Promise.resolve();
  const staff = { id: ID(4), is_active: true }, editor = { id: ID(5), is_active: true };
  const records = options => options?.transaction?.staged || state;
  const matches = (row, where) => Object.entries(where).every(([key, value]) => row[key] === value);
  const model = name => ({
    async findOne(options) { const row = records(options)[name].find(row => matches(row, options.where)); return row ? wrap(row) : null; },
    async findAll(options) { return records(options)[name].filter(row => matches(row, options.where)).map(wrap); },
    async create(data, options) { const row = { id: crypto.randomUUID(), ...structuredClone(data) }; records(options)[name].push(row); return wrap(row); },
  });
  function wrap(row) { const result = structuredClone(row); result.get = key => result[key]; result.update = async data => { Object.assign(row, structuredClone(data)); Object.assign(result, structuredClone(data)); }; return result; }
  const locks = [];
  const m = {
    sequelize: { async query() { return [[{ ready: true }]]; }, async transaction(fn) {
      const previous = queue; let release; queue = new Promise(resolve => { release = resolve; }); await previous;
      const transaction = { LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' }, staged: structuredClone(state) };
      try { const result = await fn(transaction); state = transaction.staged; return result; } finally { release(); }
    } },
    DepartmentStaff: { async findOne({ where }) { return [staff, editor].find(row => row.id === where.id && row.is_active) || null; } },
    Student: { async findByPk(id, options) { locks.push(['student', options.lock]); return id === records(options).student.id ? structuredClone(records(options).student) : null; } },
    CoopRequest: { async findByPk(id, options) { if (options?.lock) locks.push(['request', options.lock]); return id === records(options).request.id ? { ...structuredClone(records(options).request), ...(options?.include ? { student: structuredClone(records(options).student) } : {}) } : null; }, async findOne(options) { return matches(state.request, options.where) ? state.request : null; } },
    CoopRequestReview: { async findAll() { return reviews; } },
    CoopDocument: model('docs'), CoopDocumentRevision: model('revisions'), CompanyResponse: model('responses'), CompanyResponseHistory: model('history'), Teacher: {},
  };
  return { m, service: createStaffDocumentsService(m), state: () => state, staff, editor, locks, reviews };
}

for (const status of ['accepted', 'rejected']) test(`Authorized Staff persists ${status}, correct request/actor and immutable previous values`, async () => {
  const f = fixture(); const response = await f.service.recordCompanyResponse(ID(4), ID(2), { ...body, status });
  assert.equal(response.status, status); assert.equal(response.coop_request_id, ID(2)); assert.equal(response.department_staff_id, ID(4));
  assert.equal(f.state().history.length, 1); assert.equal(f.state().history[0].department_staff_id, ID(4)); assert.equal(response.cooperation_version, 2);
  assert.deepEqual(f.locks.slice(0, 2), [['student', 'UPDATE'], ['request', 'UPDATE']]);
  assert.equal(f.state().request.status, 'approved'); assert.equal(f.state().student.advisor_teacher_id, ID(6)); assert.equal(f.state().student.coop_advisor_teacher_id, ID(7));
});
test('Response rejects unauthorized/revoked actors, missing request and unapproved requests', async () => {
  const f = fixture(); await assert.rejects(f.service.recordCompanyResponse(ID(1), ID(2), body), { status: 403 });
  f.staff.is_active = false; await assert.rejects(f.service.recordCompanyResponse(ID(4), ID(2), body), { status: 403 }); f.staff.is_active = true;
  await assert.rejects(f.service.recordCompanyResponse(ID(4), ID(99), body), { status: 404 });
  for (const status of ['advisor_review', 'department_head_review', 'rejected', 'cancelled']) { f.state().request.status = status; await assert.rejects(f.service.recordCompanyResponse(ID(4), ID(2), body), { status: 409, code: 'REQUEST_NOT_APPROVED' }); }
  assert.equal(f.state().history.length, 0);
});
test('Missing/draft cooperation and missing actual approval/data cannot record response', async () => {
  for (const change of [f => { f.state().docs = []; }, f => { f.state().docs[0].status = 'draft'; }, f => { f.reviews.pop(); }, f => { f.state().student.major = null; }]) {
    const f = fixture(); change(f); await assert.rejects(f.service.recordCompanyResponse(ID(4), ID(2), body), error => [400, 409].includes(error.status)); assert.equal(f.state().responses.length, 0);
  }
});
test('Response payload validates dates, status, required values and disallows identity spoofing', () => {
  for (const value of [null, {}, { status: 'accepted' }, { ...body, status: 'pending' }, { ...body, responded_at: '2026-02-31' }, { ...body, responded_at: 'tomorrow' }, { ...body, responded_at: '2999-01-01' }, { ...body, responded_at: '0000-01-01' }, { ...body, responded_at: '2026-01-01T24:00:00Z' }, { ...body, note: 3 }, { ...body, note: 'a'.repeat(2001) }, { ...body, staff_id: ID(5) }, { ...body, coop_request_id: ID(99) }]) assert.throws(() => responseValues(value), { status: 400 });
  assert.equal(responseValues({ ...body, responded_at: '2026-01-01T12:00:00+07:00' }).responded_at.toISOString(), '2026-01-01T05:00:00.000Z');
  assert.throws(() => responseValues({ ...body, version: 1 }, true), { status: 400 });
});
test('Concurrent duplicate submissions commit one response and one history', async () => {
  const f = fixture(); const results = await Promise.allSettled([f.service.recordCompanyResponse(ID(4), ID(2), body), f.service.recordCompanyResponse(ID(5), ID(2), body)]);
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 1); assert.equal(results.find(row => row.status === 'rejected').reason.code, 'COMPANY_RESPONSE_EXISTS');
  assert.equal(f.state().responses.length, 1); assert.equal(f.state().history.length, 1);
});
test('Corrections retain old acceptance, authenticated new actor, reason and reject stale/unchanged data', async () => {
  const f = fixture(); await f.service.recordCompanyResponse(ID(4), ID(2), body);
  await f.service.recordCompanyResponse(ID(5), ID(2), { ...body, status: 'rejected', version: 1, correction_reason: 'Company corrected' }, true);
  assert.deepEqual(f.state().history.map(row => row.status), ['accepted', 'rejected']); assert.equal(f.state().history[1].department_staff_id, ID(5)); assert.equal(f.state().history[1].correction_reason, 'Company corrected');
  await assert.rejects(f.service.recordCompanyResponse(ID(4), ID(2), { ...body, version: 1, correction_reason: 'stale' }, true), { code: 'COMPANY_RESPONSE_VERSION_CONFLICT' });
  await assert.rejects(f.service.recordCompanyResponse(ID(4), ID(2), { ...body, status: 'rejected', version: 2, correction_reason: 'duplicate' }, true), { code: 'COMPANY_RESPONSE_UNCHANGED' });
  assert.equal((await f.service.getCompanyResponse(ID(4), ID(2))).history.length, 2);
});
test('Response audit failure rolls back acceptance/correction without changing history', async () => {
  const f = fixture(); const original = f.m.CompanyResponseHistory.create;
  f.m.CompanyResponseHistory.create = async () => { throw Error('audit failed'); };
  await assert.rejects(f.service.recordCompanyResponse(ID(4), ID(2), body), /audit failed/); assert.equal(f.state().responses.length, 0);
  f.m.CompanyResponseHistory.create = original; await f.service.recordCompanyResponse(ID(4), ID(2), body);
  f.m.CompanyResponseHistory.create = async () => { throw Error('audit failed'); };
  await assert.rejects(f.service.recordCompanyResponse(ID(5), ID(2), { ...body, status: 'rejected', version: 1, correction_reason: 'Correction' }, true), /audit failed/);
  assert.equal(f.state().responses[0].status, 'accepted'); assert.equal(f.state().history.length, 1);
});
test('Placement missing/rejected response, unapproved request, missing cooperation and unauthorized actor fail closed', async () => {
  const f = fixture(); await assert.rejects(f.service.mutate(ID(4), ID(2), 'placement', 'create', {}), { code: 'COMPANY_RESPONSE_REQUIRED' });
  await f.service.recordCompanyResponse(ID(4), ID(2), { ...body, status: 'rejected' });
  await assert.rejects(f.service.mutate(ID(4), ID(2), 'placement', 'create', {}), { code: 'COMPANY_RESPONSE_REJECTED' });
  await assert.rejects(f.service.mutate(ID(1), ID(2), 'placement', 'create', {}), { status: 403 });
  f.state().request.status = 'department_head_review'; await assert.rejects(f.service.mutate(ID(4), ID(2), 'placement', 'create', {}), { code: 'REQUEST_NOT_APPROVED' });
  f.state().request.status = 'approved'; f.state().docs[0].status = 'draft'; await assert.rejects(f.service.mutate(ID(4), ID(2), 'placement', 'create', {}), { code: 'COOPERATION_LETTER_REQUIRED' });
  assert.equal(f.state().docs.length, 1);
});
test('Placement create/generate/regenerate freezes evidence, keeps versions and escapes dev HTML', async () => {
  const f = fixture(); await f.service.recordCompanyResponse(ID(4), ID(2), body);
  let doc = await f.service.mutate(ID(4), ID(2), 'placement', 'create', {}); const snapshot = JSON.stringify(doc.snapshot);
  assert.equal(doc.coop_request_id, ID(2)); assert.equal(doc.snapshot.company_response.version, 1); assert.equal(doc.snapshot.cooperation_document.id, ID(3));
  doc = await f.service.mutate(ID(4), ID(2), 'placement', 'generate', { version: doc.version });
  const firstContent = await f.service.content(ID(4), ID(2), 'placement'); assert.match(firstContent.html, /&lt;script&gt;Company&lt;\/script&gt;/); assert.match(firstContent.html, /ฉบับตัวอย่าง/); assert.match(firstContent.html, /หลักฐานผลตอบกลับ/);
  f.state().request.company_name = 'New source'; f.state().student.major = null;
  doc = await f.service.mutate(ID(5), ID(2), 'placement', 'generate', { version: doc.version });
  assert.equal(JSON.stringify(doc.snapshot), snapshot); assert.equal(doc.version, 3); assert.equal(doc.updated_by, ID(5));
  assert.deepEqual(f.state().revisions.map(row => row.action), ['create', 'generate', 'regenerate']);
  assert.equal((await f.service.content(ID(4), ID(2), 'placement', { version: '2' })).html, firstContent.html);
  assert.equal(f.state().request.status, 'approved');
});
test('Placement edit invalidates artifact, preserves old revisions and requires acceptance on every mutation', async () => {
  const f = fixture(); await f.service.recordCompanyResponse(ID(4), ID(2), body);
  await f.service.mutate(ID(4), ID(2), 'placement', 'create', {}); await f.service.mutate(ID(4), ID(2), 'placement', 'generate', { version: 1 });
  const edited = await f.service.mutate(ID(5), ID(2), 'placement', 'edit', { version: 2, notes: 'Corrected' }); assert.equal(edited.status, 'draft');
  await assert.rejects(f.service.content(ID(4), ID(2), 'placement'), { status: 409 }); assert.ok((await f.service.content(ID(4), ID(2), 'placement', { version: '2' })).html);
  f.state().responses[0].status = 'rejected'; await assert.rejects(f.service.mutate(ID(4), ID(2), 'placement', 'generate', { version: 3 }), { code: 'COMPANY_RESPONSE_REJECTED' });
});
test('Concurrent placement draft/generation commit one version and audit; render/audit failures roll back', async () => {
  const f = fixture(); await f.service.recordCompanyResponse(ID(4), ID(2), body);
  for (const [action, payload] of [['create', {}], ['generate', { version: 1 }]]) {
    const results = await Promise.allSettled([f.service.mutate(ID(4), ID(2), 'placement', action, payload), f.service.mutate(ID(5), ID(2), 'placement', action, payload)]);
    assert.equal(results.filter(row => row.status === 'fulfilled').length, 1); assert.equal(results.find(row => row.status === 'rejected').reason.status, 409);
  }
  assert.equal(f.state().revisions.length, 2);
  const broken = createStaffDocumentsService(f.m, { render: () => { throw Error('render failed'); } });
  await assert.rejects(broken.mutate(ID(4), ID(2), 'placement', 'generate', { version: 2 }), /render failed/);
  f.m.CoopDocumentRevision.create = async () => { throw Error('document audit failed'); };
  await assert.rejects(f.service.mutate(ID(4), ID(2), 'placement', 'generate', { version: 2 }), /document audit failed/);
  assert.equal(f.state().docs.find(row => row.document_type === 'placement').version, 2); assert.equal(f.state().revisions.length, 2);
});
test('Acceptance corrections are blocked once a placement draft exists and a concurrent rejection cannot leave inconsistent state', async () => {
  const f = fixture(); await f.service.recordCompanyResponse(ID(4), ID(2), body);
  const results = await Promise.allSettled([f.service.mutate(ID(4), ID(2), 'placement', 'create', {}), f.service.recordCompanyResponse(ID(5), ID(2), { ...body, status: 'rejected', version: 1, correction_reason: 'Revocation' }, true)]);
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 1); assert.equal(results.find(row => row.status === 'rejected').reason.code, 'COMPANY_RESPONSE_LOCKED_BY_PLACEMENT');
  assert.equal(f.state().responses[0].status, 'accepted'); assert.equal(f.state().history.length, 1);
  f.state().docs.find(row => row.document_type === 'placement').snapshot.company_response.version = 99;
  await assert.rejects(f.service.mutate(ID(4), ID(2), 'placement', 'generate', { version: 1 }), { code: 'PLACEMENT_ACCEPTANCE_MISMATCH' });
});
test('Student read-back is owner scoped and omits staff/internal projections', async () => {
  const f = fixture(); await f.service.recordCompanyResponse(ID(4), ID(2), body);
  const original = f.m.CompanyResponse.findOne;
  f.m.CompanyResponse.findOne = async options => { assert.deepEqual(options.attributes, ['id', 'coop_request_id', 'status', 'responded_at', 'note', 'version', 'createdAt', 'updatedAt']); const row = await original(options); return Object.fromEntries(options.attributes.map(key => [key, row[key]])); };
  const handler = createStudentCompanyResponseHandler(f.m);
  let status = 200, result; const res = { status(value) { status = value; return this; }, json(value) { result = value; return this; } };
  await handler({ params: { id: ID(2) }, user: { id: ID(1) } }, res); assert.equal(status, 200); assert.equal(result.data.status, 'accepted'); assert.equal(result.data.department_staff_id, undefined);
  await handler({ params: { id: ID(2) }, user: { id: ID(99) } }, res); assert.equal(status, 404);
});
test('Placement eligibility returns structured persisted prerequisite decisions', () => {
  const request = { status: 'approved' }, cooperation = { status: 'generated', content_sha256: 'hash', generated_at: new Date() };
  assert.equal(placementEligibility(request, cooperation, null).code, 'COMPANY_RESPONSE_REQUIRED'); assert.equal(placementEligibility(request, cooperation, { status: 'rejected' }).code, 'COMPANY_RESPONSE_REJECTED'); assert.equal(placementEligibility(request, cooperation, { status: 'accepted' }).available, true);
});
test('Before 017, Cooperation Letter queue/detail/generation still work and response/placement fail explicitly', async () => {
  const f = fixture(); f.m.sequelize.query = async () => [[{ ready: false }]];
  f.m.CompanyResponse.findOne = async () => { throw Error('Absent response table must not be queried'); };
  f.m.CoopRequest.findAll = async options => { assert.ok(!options.include.some(item => item.as === 'companyResponse')); return [f.state().request]; };
  assert.equal((await f.service.list(ID(4))).length, 1);
  const detail = await f.service.detail(ID(4), ID(2)); assert.equal(detail.eligible, true); assert.equal(detail.company_response_ready, false); assert.equal(detail.placement.code, 'COMPANY_RESPONSE_SCHEMA_REQUIRED');
  const doc = await f.service.mutate(ID(4), ID(2), 'cooperation', 'generate', { version: 2 }); assert.equal(doc.status, 'generated');
  for (const action of [() => f.service.recordCompanyResponse(ID(4), ID(2), body), () => f.service.getCompanyResponse(ID(4), ID(2)), () => f.service.mutate(ID(4), ID(2), 'placement', 'create', {})]) await assert.rejects(action(), { status: 409, code: 'COMPANY_RESPONSE_SCHEMA_REQUIRED' });
});
test('Concurrent response corrections commit one immutable revision with a verified editor', async () => {
  const f = fixture(); await f.service.recordCompanyResponse(ID(4), ID(2), body);
  const changes = [ID(4), ID(5)].map(id => f.service.recordCompanyResponse(id, ID(2), { ...body, status: 'rejected', version: 1, correction_reason: 'Confirmed correction' }, true));
  const results = await Promise.allSettled(changes); assert.equal(results.filter(row => row.status === 'fulfilled').length, 1); assert.equal(results.find(row => row.status === 'rejected').reason.code, 'COMPANY_RESPONSE_VERSION_CONFLICT');
  assert.equal(f.state().history.length, 2); assert.equal(f.state().responses[0].version, 2);
});
test('If company rejection wins a race with placement creation, no placement is created', async () => {
  const f = fixture(); await f.service.recordCompanyResponse(ID(4), ID(2), body);
  const results = await Promise.allSettled([f.service.recordCompanyResponse(ID(5), ID(2), { ...body, status: 'rejected', version: 1, correction_reason: 'Revocation' }, true), f.service.mutate(ID(4), ID(2), 'placement', 'create', {})]);
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 1); assert.equal(results.find(row => row.status === 'rejected').reason.code, 'COMPANY_RESPONSE_REJECTED');
  assert.equal(f.state().responses[0].status, 'rejected'); assert.ok(!f.state().docs.some(row => row.document_type === 'placement'));
});
test('Actual Staff HTTP routes enforce JWT/live actor, structured errors, response read/history and placement generation', async () => {
  const express = require('express'), jwt = require('jsonwebtoken');
  const { createRoleWorkflowRouter } = require('../src/routes/roleWorkflow.routes');
  const f = fixture(), previous = process.env.JWT_SECRET; process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  const app = express(); app.use(express.json()); app.use('/api/staff', createRoleWorkflowRouter('department_staff', f.m));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const token = claims => jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: '5m' });
  const staffToken = token({ id: ID(4), staff_id: ID(4), actor_type: 'department_staff', role: 'department_staff' });
  const endpoint = `/api/staff/document-requests/${ID(2)}`;
  async function call(path, auth, payload, method = payload ? 'POST' : 'GET') {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${endpoint}${path}`, { method, headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(payload ? { 'Content-Type': 'application/json' } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}) });
    const raw = await res.text(); assert.doesNotMatch(raw, /password_hash|storage_path|token_hash/); return { status: res.status, data: raw.startsWith('{') ? JSON.parse(raw) : raw };
  }
  try {
    assert.equal((await call('/company-response', null, body)).status, 401);
    for (const role of ['student', 'teacher', 'department_head']) assert.equal((await call('/company-response', token({ id: ID(4), staff_id: ID(4), actor_type: role, role }), body)).status, 403);
    assert.equal((await call('/company-response', staffToken, { ...body, staff_id: ID(5) })).status, 400);
    const missing = await call('/documents/placement', staffToken, {}); assert.equal(missing.status, 409); assert.equal(missing.data.code, 'COMPANY_RESPONSE_REQUIRED');
    const saved = await call('/company-response', staffToken, body); assert.equal(saved.status, 200); assert.equal(saved.data.data.department_staff_id, ID(4));
    assert.equal((await call('/company-response', staffToken)).data.data.response.status, 'accepted');
    assert.equal((await call('/company-response/history', staffToken)).data.data.length, 1);
    assert.equal((await call('/documents/placement', staffToken, {})).status, 200);
    assert.equal((await call('/documents/placement/generate', staffToken, { version: 1 })).status, 200);
    assert.match((await call('/documents/placement/preview', staffToken)).data, /หลักฐานผลตอบกลับ/);
    const locked = await call('/company-response', staffToken, { ...body, status: 'rejected', version: 1, correction_reason: 'Correction' }, 'PUT'); assert.equal(locked.status, 409); assert.equal(locked.data.code, 'COMPANY_RESPONSE_LOCKED_BY_PLACEMENT');
    f.staff.is_active = false; assert.equal((await call('/documents/placement/generate', staffToken, { version: 2 })).status, 403);
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous;
  }
});
