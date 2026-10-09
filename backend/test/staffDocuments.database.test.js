const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const express = require('express');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const { createRoleWorkflowRouter } = require('../src/routes/roleWorkflow.routes');
const { createStaffLoginHandler } = require('../src/controllers/staffAuth.controller');
const migration = require('../src/db/migrations/016_add_coop_documents');

test('Staff documents: migration, authenticated HTTP/SQL, immutable snapshots and actual UI', { skip: !process.env.STAFF_DOCUMENTS_DISPOSABLE_DATABASE_URL }, async t => {
  const db = new Sequelize(process.env.STAFF_DOCUMENTS_DISPOSABLE_DATABASE_URL, { logging: false, pool: { max: 8 } });
  const previousSecret = process.env.JWT_SECRET; process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  let server;
  try {
    const [[guard]] = await db.query("SELECT current_database() AS db,current_setting('fitm.a013_disposable',true) AS marker");
    assert.equal(guard.db, 'fitm_documents_test'); assert.equal(guard.marker, 'on');
    const m = { sequelize: db };
    for (const file of fs.readdirSync(path.join(__dirname, '../src/models')).filter(file => file.endsWith('.model.js'))) { const model = require(`../src/models/${file}`)(db); m[model.name] = model; }
    for (const model of Object.values(m)) model.associate?.(m);
    const umzug = new Umzug({ migrations: { glob: ['*.js', { cwd: path.join(__dirname, '../src/db/migrations') }] }, context: db.getQueryInterface(), storage: new SequelizeStorage({ sequelize: db, tableName: 'sequelize_meta' }), logger: undefined });
    await umzug.up({ to: '015_add_company_evaluations.js' });
    const qi = db.getQueryInterface();
    await t.test('016 empty UP/DOWN/UP and atomic DDL failure preserve earlier schema', async () => {
      const imported = await import(pathToFileURL(require.resolve('../src/db/migrations/016_add_coop_documents')).href);
      assert.equal(typeof imported.up, 'function'); assert.equal(typeof imported.down, 'function');
      const [[before]] = await db.query("SELECT md5(COALESCE(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) AS fingerprint FROM student_files t");
      await migration.up({ context: qi }); await migration.down({ context: qi });
      const original = qi.createTable; qi.createTable = async (...args) => { if (args[0] === 'coop_document_revisions') throw Error('injected DDL failure'); return original.apply(qi, args); };
      try { await assert.rejects(migration.up({ context: qi }), /injected DDL/); } finally { qi.createTable = original; }
      assert.equal((await db.query("SELECT to_regclass('coop_documents') AS name"))[0][0].name, null);
      await umzug.up({ to: '016_add_coop_documents.js' }); assert.equal((await umzug.executed()).length, 17); assert.equal((await umzug.pending()).length, 5);
      assert.equal((await db.query("SELECT md5(COALESCE(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) AS fingerprint FROM student_files t"))[0][0].fingerprint, before.fingerprint);
    });
    await t.test('017 empty UP/DOWN and injected partial DDL rollback preserve prior schema', async () => {
      const responseMigration = require('../src/db/migrations/017_add_company_responses');
      const imported = await import(pathToFileURL(require.resolve('../src/db/migrations/017_add_company_responses')).href);
      assert.equal(typeof imported.up, 'function'); assert.equal(typeof imported.down, 'function');
      await responseMigration.up({ context: qi }); await responseMigration.down({ context: qi });
      const original = qi.createTable;
      qi.createTable = async (...args) => { if (args[0] === 'company_response_history') throw Error('injected 017 DDL failure'); return original.apply(qi, args); };
      try { await assert.rejects(responseMigration.up({ context: qi }), /injected 017/); } finally { qi.createTable = original; }
      assert.equal((await db.query("SELECT to_regclass('company_responses') AS name"))[0][0].name, null);
      await umzug.up(); assert.equal((await umzug.executed()).length, 22); assert.equal((await umzug.pending()).length, 0);
    });
    const password = crypto.randomBytes(24).toString('base64url'), suffix = crypto.randomUUID();
    const classTeacher = await m.Teacher.create({ first_name: 'Class', last_name: 'Advisor', department: 'FITM', email: `class-${suffix}@fixture.invalid`, password });
    const projectTeacher = await m.Teacher.create({ first_name: 'Project', last_name: 'Advisor', department: 'FITM' });
    const head = await m.Teacher.create({ first_name: 'Head', last_name: 'Approved', department: 'FITM', is_department_head: true, email: `head-${suffix}@fixture.invalid`, password });
    const staff = await m.DepartmentStaff.create({ first_name: 'Staff', last_name: 'Creator', email: `staff-${suffix}@fixture.invalid`, password });
    const secondStaff = await m.DepartmentStaff.create({ first_name: 'Staff', last_name: 'Editor', email: `editor-${suffix}@fixture.invalid`, password });
    const registryPath = require.resolve('../src/models'), originalRegistry = require.cache[registryPath].exports;
    function controller(file) {
      const key = require.resolve(file), cached = require.cache[key];
      try { require.cache[registryPath].exports = m; delete require.cache[key]; return require(key); }
      finally { require.cache[registryPath].exports = originalRegistry; if (cached) require.cache[key] = cached; else delete require.cache[key]; }
    }
    const studentAuth = controller('../src/controllers/auth.controller'), studentRequests = controller('../src/controllers/coopRequest.controller');
    const { authenticateStudentToken } = require('../src/middlewares/auth.middleware');
    const app = express(); app.use(express.json());
    app.post('/api/auth/login', studentAuth.loginStudent);
    app.post('/api/coop-requests', authenticateStudentToken, studentRequests.createCoopRequest);
    app.get('/api/coop-requests/:id', authenticateStudentToken, studentRequests.getCoopRequestById);
    app.get('/api/coop-requests/:id/company-response', authenticateStudentToken, require('../src/controllers/companyResponse.controller').createStudentCompanyResponseHandler(m));
    app.post('/api/staff/auth/login', createStaffLoginHandler({ DepartmentStaff: m.DepartmentStaff }));
    app.use('/api/staff', createRoleWorkflowRouter('department_staff', m));
    app.use('/api/teachers', createRoleWorkflowRouter('teacher', m));
    app.use('/api/department-head', createRoleWorkflowRouter('department_head', m));
    server = http.createServer(app); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    async function call(url, token, body, method = body === undefined ? 'GET' : 'POST') {
      const response = await fetch(base + url, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
      assert.doesNotMatch(text, /password_hash|storage_path|token_hash/); return { status: response.status, data, headers: response.headers, text };
    }
    async function ok(promise) { const result = await promise; assert.equal(result.status, 200, typeof result.data === 'object' ? result.data.message : 'Unexpected HTTP response'); return result.data; }
    const login = async (url, email) => (await ok(call(url, null, { email, password }))).token;
    const tokenA = await login('/api/teachers/auth/login', classTeacher.email), tokenH = await login('/api/department-head/auth/login', head.email), tokenStaff = await login('/api/staff/auth/login', staff.email), tokenEditor = await login('/api/staff/auth/login', secondStaff.email);
    const endpoint = id => `/api/staff/document-requests/${id}`, docUrl = (id, type = 'cooperation') => `${endpoint(id)}/documents/${type}`;
    const fixtures = [];
    async function fixture(status = 'approved') {
      const run = crypto.randomUUID(), student = await m.Student.create({ student_id: `docs-${run}`, first_name: 'นักศึกษา', last_name: 'Fixture', major: 'IT', email: `docs-${run}@email.kmutnb.ac.th`, track: 'co_op', advisor_teacher_id: classTeacher.id, coop_advisor_teacher_id: projectTeacher.id, password });
      const token = await login('/api/auth/login', student.email), { CATALOG } = require('../src/services/coopPrerequisites');
      const response = await call('/api/coop-requests', token, { company_name: 'บริษัท snapshot <script>bad()</script>', company_address: 'Snapshot address', company_province: 'Bangkok', letter_recipient_name: 'Fixture HR', work_start_date: '2026-11-01', work_end_date: '2027-02-01', delivery_methods: ['email'], prerequisite_courses: CATALOG.IT.map(([course_code]) => ({ course_code, status: 'passed', grade: 'A' })) });
      assert.equal(response.status, 201); const id = response.data.data.id;
      if (status !== 'advisor_review') await ok(call(`/api/teachers/coop-requests/${id}/approve`, tokenA, {}));
      if (!['advisor_review', 'department_head_review'].includes(status)) await ok(call(`/api/department-head/coop-requests/${id}/${status === 'rejected' ? 'reject' : 'approve'}`, tokenH, status === 'rejected' ? { reason: 'Rejected fixture' } : {}));
      const result = { id, student, token }; fixtures.push(result); return result;
    }
    const owner = await fixture();
    await t.test('Staff queue search/status/page, detail and actual approval actors are safe', async () => {
      const queue = await ok(call('/api/staff/document-requests?search=นักศึกษา&limit=1&offset=0', tokenStaff)); assert.equal(queue.data.length, 1); assert.equal(queue.data[0].id, owner.id);
      const detail = (await ok(call(endpoint(owner.id), tokenStaff))).data; assert.equal(detail.eligible, true); assert.deepEqual(detail.missing_fields, []); assert.equal(detail.reviews[1].teacher.id, classTeacher.id); assert.equal(detail.reviews[2].teacher.id, head.id); assert.equal(detail.template.official, false);
      assert.equal((await call('/api/staff/document-requests?status=advisor_review', tokenStaff)).status, 400); assert.equal((await call('/api/staff/document-requests?limit=101', tokenStaff)).status, 400);
      assert.equal((await ok(call('/api/staff/document-requests?search=%25', tokenStaff))).data.length, 0);
      assert.equal((await ok(call('/api/staff/document-requests?search=' + encodeURIComponent('นักศึกษา Fixture'), tokenStaff))).data.length, 1);
    });
    let doc;
    await t.test('Concurrent create persists one request-owned draft and authenticated Staff actor once', async () => {
      const results = await Promise.all([call(docUrl(owner.id), tokenStaff, { issue_date: '2026-10-07', notes: 'Draft' }), call(docUrl(owner.id), tokenStaff, { issue_date: '2026-10-07', notes: 'Draft' })]);
      assert.deepEqual(results.map(result => result.status).sort(), [200, 409]); doc = results.find(result => result.status === 200).data.data;
      assert.equal(doc.status, 'draft'); assert.equal(doc.created_by, staff.id); assert.equal(doc.updated_by, staff.id); assert.equal(doc.snapshot.student.id, owner.student.id); assert.equal(doc.snapshot.approval.head.teacher_id, head.id); assert.equal(doc.snapshot.approval.class.teacher_id, classTeacher.id);
      assert.equal(await m.CoopDocument.count({ where: { coop_request_id: owner.id } }), 1); assert.equal(await m.CoopDocumentRevision.count({ where: { coop_document_id: doc.id } }), 1);
      assert.equal((await call(docUrl(owner.id) + '/preview', tokenStaff)).status, 409);
    });
    await t.test('Metadata edit and concurrent generation use optimistic version and audit once', async () => {
      doc = (await ok(call(docUrl(owner.id), tokenEditor, { version: doc.version, notes: '<img src=x onerror=bad()>', document_number: `DEV-${suffix}` }, 'PUT'))).data; assert.equal(doc.updated_by, secondStaff.id);
      const results = await Promise.all([call(docUrl(owner.id) + '/generate', tokenStaff, { version: doc.version }), call(docUrl(owner.id) + '/generate', tokenStaff, { version: doc.version })]); assert.deepEqual(results.map(result => result.status).sort(), [200, 409]); doc = results.find(result => result.status === 200).data.data;
      assert.equal(doc.status, 'generated'); assert.equal(await m.CoopDocumentRevision.count({ where: { coop_document_id: doc.id } }), 3);
      assert.equal((await ok(call('/api/staff/document-requests?document_status=generated', tokenStaff))).data.length, 1);
    });
    await t.test('Authenticated preview/download return persisted dev HTML bytes, safe CSP and no raw path', async () => {
      const preview = await call(docUrl(owner.id) + '/preview', tokenStaff), download = await call(docUrl(owner.id) + '/download', tokenStaff);
      assert.equal(preview.status, 200); assert.equal(download.status, 200); assert.equal(download.text, preview.text); assert.match(preview.headers.get('content-type'), /^text\/html/); assert.match(download.headers.get('content-disposition'), /attachment; filename="cooperation-[a-f0-9-]+-v3\.html"/); assert.match(preview.headers.get('content-security-policy'), /default-src 'none'/); assert.equal(preview.headers.get('cache-control'), 'no-store');
      assert.match(preview.text, /ฉบับตัวอย่าง/); assert.match(preview.text, /&lt;script&gt;bad\(\)&lt;\/script&gt;/); assert.doesNotMatch(preview.text, /<script>|<img src=x/); assert.match(preview.text, /&lt;img/);
      assert.equal(crypto.createHash('sha256').update(preview.text).digest('hex'), doc.content_sha256);
    });
    await t.test('Regeneration preserves original source snapshot, previous generated revision and request status', async () => {
      await db.query('UPDATE coop_requests SET company_address=:address WHERE id=:id', { replacements: { address: 'Changed source after creation', id: owner.id } });
      await db.query('UPDATE students SET major=NULL WHERE id=:id', { replacements: { id: owner.student.id } });
      assert.deepEqual((await ok(call(endpoint(owner.id), tokenStaff))).data.missing_fields, []);
      doc = (await ok(call(docUrl(owner.id) + '/generate', tokenStaff, { version: doc.version }))).data;
      assert.equal(doc.snapshot.request.company_address, 'Snapshot address'); assert.match((await call(docUrl(owner.id) + '/preview', tokenStaff)).text, /Snapshot address/); assert.equal((await call(docUrl(owner.id) + '/preview?version=3', tokenStaff)).status, 200);
      const history = (await ok(call(endpoint(owner.id), tokenStaff))).data.revisions; assert.deepEqual(history.map(row => row.action), ['create', 'edit', 'generate', 'regenerate']); assert.equal(history[1].staff.id, secondStaff.id);
      assert.equal((await m.CoopRequest.findByPk(owner.id)).status, 'approved'); assert.equal(await m.CoopRequestReview.count({ where: { coop_request_id: owner.id } }), 3);
      await db.query("UPDATE students SET major='IT' WHERE id=:id", { replacements: { id: owner.student.id } });
    });
    await t.test('Edit invalidates current generated artifact but preserves old version; stale write cannot overwrite', async () => {
      const oldVersion = doc.version; doc = (await ok(call(docUrl(owner.id), tokenStaff, { version: oldVersion, notes: 'Updated draft' }, 'PUT'))).data; assert.equal(doc.status, 'draft'); assert.equal(doc.generated_at, null); assert.equal((await call(docUrl(owner.id) + '/preview', tokenStaff)).status, 409); assert.equal((await call(docUrl(owner.id) + `/preview?version=${oldVersion}`, tokenStaff)).status, 200);
      assert.equal((await call(docUrl(owner.id), tokenEditor, { version: oldVersion, notes: 'Stale overwrite' }, 'PUT')).status, 409);
    });
    await t.test('Audit/render failure rolls back artifact metadata/version atomically', async () => {
      const original = m.CoopDocumentRevision.create; m.CoopDocumentRevision.create = async () => { throw Error('injected audit failure'); };
      try { assert.equal((await call(docUrl(owner.id) + '/generate', tokenStaff, { version: doc.version })).status, 500); } finally { m.CoopDocumentRevision.create = original; }
      assert.equal((await m.CoopDocument.findByPk(doc.id)).version, doc.version); assert.equal((await m.CoopDocument.findByPk(doc.id)).rendered_html, null);
      const broken = require('../src/services/staffDocuments.service').createStaffDocumentsService(m, { render: () => { throw Error('injected render failure'); } });
      await assert.rejects(broken.mutate(staff.id, owner.id, 'cooperation', 'generate', { version: doc.version }), /render failure/); assert.equal((await m.CoopDocument.findByPk(doc.id)).version, doc.version);
    });
    await t.test('Rejected/Class-pending/Head-pending requests cannot create documents or become approved by Staff', async () => {
      for (const status of ['rejected', 'advisor_review', 'department_head_review']) {
        const bad = await fixture(status); assert.equal((await call(docUrl(bad.id), tokenStaff, {})).status, 409); assert.equal((await call(`/api/staff/coop-requests/${bad.id}/approve`, tokenStaff, {})).status, 404); assert.equal((await m.CoopRequest.findByPk(bad.id)).status, status); assert.equal(await m.CoopDocument.count({ where: { coop_request_id: bad.id } }), 0);
      }
    });
    await t.test('Missing data, invalid metadata/type, spoofed identity/request and duplicate manual number are refused', async () => {
      const bad = await fixture(); await db.query('UPDATE students SET major=NULL WHERE id=:id', { replacements: { id: bad.student.id } }); const response = await call(docUrl(bad.id), tokenStaff, {}); assert.equal(response.status, 400); assert.ok(response.data.missing_fields.includes('student.major'));
      for (const body of [{ staff_id: secondStaff.id }, { student_id: bad.student.id }, { coop_request_id: bad.id }, { status: 'approved' }, { issue_date: '2026-02-31' }, { document_number: 'x'.repeat(81) }]) assert.equal((await call(docUrl(owner.id), tokenStaff, body)).status, 400);
      assert.equal((await call(docUrl(owner.id, 'unsupported'), tokenStaff, {})).status, 400); assert.equal((await call(docUrl(crypto.randomUUID()), tokenStaff, {})).status, 404); assert.equal((await call(docUrl('../outside'), tokenStaff, {})).status, 404);
      const another = await fixture(); assert.equal((await call(docUrl(another.id), tokenStaff, { document_number: `DEV-${suffix}` })).status, 409); assert.equal(await m.CoopDocument.count({ where: { coop_request_id: another.id } }), 0);
    });
    await t.test('Placement without completed cooperation or saved acceptance fails closed', async () => {
      const response = await call(docUrl(owner.id, 'placement'), tokenStaff, {}); assert.equal(response.status, 409); assert.equal(response.data.code, 'COOPERATION_LETTER_REQUIRED');
      doc = (await ok(call(docUrl(owner.id) + '/generate', tokenStaff, { version: doc.version }))).data;
      const missing = await call(docUrl(owner.id, 'placement'), tokenStaff, {}); assert.equal(missing.status, 409); assert.equal(missing.data.code, 'COMPANY_RESPONSE_REQUIRED');
      assert.equal(await m.CoopDocument.count({ where: { document_type: 'placement' } }), 0);
    });
    const responseUrl = id => `${endpoint(id)}/company-response`;
    const acceptedBody = { status: 'accepted', responded_at: '2026-01-02', note: 'Acceptance received' };
    let companyResponse, placement;
    await t.test('Company response enforces authenticated Staff, approval, cooperation and validation', async () => {
      for (const token of [null, owner.token, tokenA, tokenH]) assert.equal((await call(responseUrl(owner.id), token, acceptedBody)).status, token ? 403 : 401);
      assert.equal((await call(responseUrl(crypto.randomUUID()), tokenStaff, acceptedBody)).status, 404);
      const pending = await fixture('department_head_review'), noLetter = await fixture();
      assert.equal((await call(responseUrl(pending.id), tokenStaff, acceptedBody)).status, 409);
      assert.equal((await call(responseUrl(noLetter.id), tokenStaff, acceptedBody)).data.code, 'COOPERATION_LETTER_REQUIRED');
      for (const body of [{}, { ...acceptedBody, status: 'pending' }, { ...acceptedBody, responded_at: '2026-02-31' }, { ...acceptedBody, responded_at: '2999-01-01' }, { ...acceptedBody, staff_id: secondStaff.id }, { status: 'accepted' }]) assert.equal((await call(responseUrl(owner.id), tokenStaff, body)).status, 400);
      await staff.update({ is_active: false }); assert.equal((await call(responseUrl(owner.id), tokenStaff, acceptedBody)).status, 403); await staff.update({ is_active: true });
    });
    await t.test('Concurrent acceptance inserts one response/history and verifies Staff and Student read-back', async () => {
      const results = await Promise.all([call(responseUrl(owner.id), tokenStaff, acceptedBody), call(responseUrl(owner.id), tokenEditor, acceptedBody)]);
      assert.deepEqual(results.map(row => row.status).sort(), [200, 409]); companyResponse = results.find(row => row.status === 200).data.data;
      assert.equal(companyResponse.coop_request_id, owner.id); assert.equal(companyResponse.cooperation_version, doc.version);
      const saved = (await ok(call(responseUrl(owner.id), tokenStaff))).data;
      assert.equal(saved.history.length, 1); assert.equal(saved.history[0].department_staff_id, companyResponse.department_staff_id); assert.equal(saved.response.staff.id, companyResponse.department_staff_id);
      assert.equal((await ok(call(`/api/coop-requests/${owner.id}/company-response`, owner.token))).data.status, 'accepted');
      const other = await fixture(); assert.equal((await call(`/api/coop-requests/${owner.id}/company-response`, other.token)).status, 404);
      assert.equal((await ok(call(`${endpoint(owner.id)}/placement-eligibility`, tokenStaff))).data.available, true);
      assert.equal((await call(responseUrl(owner.id), tokenStaff, acceptedBody)).status, 409);
    });
    await t.test('Response correction to rejection keeps immutable history and blocks placement', async () => {
      companyResponse = (await ok(call(responseUrl(owner.id), tokenEditor, { ...acceptedBody, status: 'rejected', version: companyResponse.version, correction_reason: 'Company corrected decision' }, 'PUT'))).data;
      assert.equal(companyResponse.version, 2); assert.equal(companyResponse.department_staff_id, secondStaff.id);
      assert.equal((await call(docUrl(owner.id, 'placement'), tokenStaff, {})).data.code, 'COMPANY_RESPONSE_REJECTED');
      const history = (await ok(call(responseUrl(owner.id) + '/history', tokenStaff))).data;
      assert.deepEqual(history.map(row => row.status), ['accepted', 'rejected']); assert.equal(history[1].correction_reason, 'Company corrected decision');
      await assert.rejects(db.query("UPDATE company_response_history SET note='tampered' WHERE id=:id", { replacements: { id: history[0].id } }), /immutable/);
      await assert.rejects(db.query('DELETE FROM company_response_history WHERE id=:id', { replacements: { id: history[0].id } }), /immutable/);
      assert.equal((await call(responseUrl(owner.id), tokenStaff, { ...acceptedBody, version: 1, correction_reason: 'Stale' }, 'PUT')).status, 409);
    });
    await t.test('Company response audit failure rolls back correction and optimistic version', async () => {
      const original = m.CompanyResponseHistory.create; m.CompanyResponseHistory.create = async () => { throw Error('injected response audit'); };
      try { assert.equal((await call(responseUrl(owner.id), tokenStaff, { ...acceptedBody, version: companyResponse.version, correction_reason: 'Correction' }, 'PUT')).status, 500); } finally { m.CompanyResponseHistory.create = original; }
      assert.equal((await m.CompanyResponse.findByPk(companyResponse.id)).status, 'rejected'); assert.equal((await m.CompanyResponse.findByPk(companyResponse.id)).version, 2);
      companyResponse = (await ok(call(responseUrl(owner.id), tokenStaff, { ...acceptedBody, version: companyResponse.version, correction_reason: 'Reinstated acceptance' }, 'PUT'))).data;
    });
    await t.test('Concurrent placement create/generate, frozen acceptance and version history are safe', async () => {
      const results = await Promise.all([call(docUrl(owner.id, 'placement'), tokenStaff, {}), call(docUrl(owner.id, 'placement'), tokenEditor, {})]);
      assert.deepEqual(results.map(row => row.status).sort(), [200, 409]); placement = results.find(row => row.status === 200).data.data;
      assert.equal(placement.coop_request_id, owner.id); assert.equal(placement.snapshot.company_response.id, companyResponse.id); assert.equal(placement.snapshot.company_response.version, 3); assert.equal(placement.snapshot.cooperation_document.id, doc.id);
      const snapshot = JSON.stringify(placement.snapshot);
      const generations = await Promise.all([call(docUrl(owner.id, 'placement') + '/generate', tokenStaff, { version: placement.version }), call(docUrl(owner.id, 'placement') + '/generate', tokenStaff, { version: placement.version })]);
      assert.deepEqual(generations.map(row => row.status).sort(), [200, 409]); placement = generations.find(row => row.status === 200).data.data;
      await db.query("UPDATE coop_requests SET company_name='Changed source' WHERE id=:id", { replacements: { id: owner.id } });
      placement = (await ok(call(docUrl(owner.id, 'placement') + '/generate', tokenEditor, { version: placement.version }))).data;
      assert.equal(JSON.stringify(placement.snapshot), snapshot); assert.equal(placement.version, 3);
      assert.equal((await call(docUrl(owner.id, 'placement') + '/preview?version=2', tokenStaff)).status, 200);
      assert.match((await call(docUrl(owner.id, 'placement') + '/download', tokenStaff)).headers.get('content-disposition'), /placement-.*-v3.html/);
      assert.equal(await m.CoopDocumentRevision.count({ where: { coop_document_id: placement.id } }), 3);
      assert.equal((await m.CoopRequest.findByPk(owner.id)).status, 'approved');
    });
    await t.test('Existing placement draft or generated letter locks response correction without altering evidence', async () => {
      const correction = await call(responseUrl(owner.id), tokenStaff, { ...acceptedBody, status: 'rejected', version: companyResponse.version, correction_reason: 'Cannot silently revoke' }, 'PUT');
      assert.equal(correction.status, 409); assert.equal(correction.data.code, 'COMPANY_RESPONSE_LOCKED_BY_PLACEMENT');
      assert.equal((await m.CompanyResponse.findByPk(companyResponse.id)).status, 'accepted'); assert.equal((await m.CoopDocument.findByPk(placement.id)).status, 'generated');
      await assert.rejects(require('../src/db/migrations/017_add_company_responses').down({ context: qi }), /rollback refused/);
    });
    await t.test('017 PostgreSQL tables, FKs, UNIQUE/CHECK constraints and same-request revision protection', async () => {
      const [[tables]] = await db.query("SELECT to_regclass('company_responses') IS NOT NULL AS response, to_regclass('company_response_history') IS NOT NULL AS history");
      assert.equal(tables.response, true); assert.equal(tables.history, true);
      const [constraints] = await db.query("SELECT conname,contype FROM pg_constraint WHERE conrelid IN ('company_responses'::regclass,'company_response_history'::regclass)");
      for (const name of ['company_responses_values_check', 'company_response_history_values_check', 'company_response_history_action_check', 'company_responses_cooperation_revision_fk', 'company_response_history_cooperation_revision_fk']) assert.ok(constraints.some(row => row.conname === name), `Missing constraint ${name}`);
      const response = await m.CompanyResponse.findByPk(companyResponse.id);
      const payload = Object.fromEntries(['coop_request_id', 'status', 'responded_at', 'note', 'version', 'department_staff_id', 'cooperation_document_id', 'cooperation_version'].map(key => [key, response[key]]));
      const pgError = code => error => error.parent?.code === code;
      await assert.rejects(m.CompanyResponse.create(payload), pgError('23505'));
      await assert.rejects(db.query("UPDATE company_responses SET status='pending' WHERE id=:id", { replacements: { id: response.id } }), pgError('23514'));
      await assert.rejects(db.query('UPDATE company_responses SET version=0 WHERE id=:id', { replacements: { id: response.id } }), pgError('23514'));
      await assert.rejects(db.query('UPDATE company_responses SET department_staff_id=:actor WHERE id=:id', { replacements: { actor: crypto.randomUUID(), id: response.id } }), pgError('23503'));
      const other = await fixture();
      await assert.rejects(m.CompanyResponse.create({ ...payload, coop_request_id: other.id }), /same request/);
      await assert.rejects(m.CompanyResponse.create({ ...payload, cooperation_version: 1, coop_request_id: other.id }), /generated cooperation revision/);
      const latest = (await m.CompanyResponseHistory.findAll({ where: { company_response_id: response.id }, order: [['version', 'DESC']] }))[0];
      const event = Object.fromEntries(['company_response_id', 'status', 'responded_at', 'note', 'version', 'department_staff_id', 'cooperation_document_id', 'cooperation_version', 'action', 'correction_reason'].map(key => [key, latest[key]]));
      await assert.rejects(m.CompanyResponseHistory.create(event), pgError('23505'));
      await assert.rejects(m.CompanyResponseHistory.create({ ...event, version: event.version + 1, cooperation_version: 999 }), pgError('23503'));
      await assert.rejects(m.CompanyResponseHistory.create({ ...event, version: event.version + 1, action: 'invalid' }), pgError('23514'));
      await response.reload(); assert.equal(response.status, 'accepted'); assert.equal(response.version, companyResponse.version);
    });
    await t.test('Concurrent SQL-backed response corrections commit one version/history with the authenticated winner', async () => {
      const owner = await fixture(); let letter = (await ok(call(docUrl(owner.id), tokenStaff, {}))).data;
      letter = (await ok(call(docUrl(owner.id) + '/generate', tokenStaff, { version: letter.version }))).data;
      const response = (await ok(call(responseUrl(owner.id), tokenStaff, { ...acceptedBody, status: 'rejected' }))).data;
      const results = await Promise.all([tokenStaff, tokenEditor].map(token => call(responseUrl(owner.id), token, { ...acceptedBody, version: 1, correction_reason: 'Verified correction' }, 'PUT')));
      assert.deepEqual(results.map(row => row.status).sort(), [200, 409]);
      const winner = results.find(row => row.status === 200).data.data;
      const saved = await m.CompanyResponse.findByPk(response.id); assert.equal(saved.version, 2); assert.equal(saved.department_staff_id, winner.department_staff_id);
      const events = await m.CompanyResponseHistory.findAll({ where: { company_response_id: response.id }, order: [['version', 'ASC']] });
      assert.deepEqual(events.map(row => row.status), ['rejected', 'accepted']); assert.equal(events[1].department_staff_id, winner.department_staff_id);
    });
    await t.test('SQL race between acceptance revocation and placement draft cannot create inconsistent state', async () => {
      const owner = await fixture(); let letter = (await ok(call(docUrl(owner.id), tokenStaff, {}))).data;
      letter = (await ok(call(docUrl(owner.id) + '/generate', tokenStaff, { version: letter.version }))).data;
      await ok(call(responseUrl(owner.id), tokenStaff, acceptedBody));
      const results = await Promise.all([call(responseUrl(owner.id), tokenEditor, { ...acceptedBody, status: 'rejected', version: 1, correction_reason: 'Company revocation' }, 'PUT'), call(docUrl(owner.id, 'placement'), tokenStaff, {})]);
      assert.deepEqual(results.map(row => row.status).sort(), [200, 409]);
      const saved = await m.CompanyResponse.findOne({ where: { coop_request_id: owner.id } });
      const count = await m.CoopDocument.count({ where: { coop_request_id: owner.id, document_type: 'placement' } });
      assert.equal(count, saved.status === 'accepted' ? 1 : 0);
      assert.equal(results.find(row => row.status === 409).data.code, saved.status === 'accepted' ? 'COMPANY_RESPONSE_LOCKED_BY_PLACEMENT' : 'COMPANY_RESPONSE_REJECTED');
    });
    await t.test('Anonymous, Student, Teacher, Head and revoked Staff cannot list/write/preview/download', async () => {
      for (const token of [null, owner.token, tokenA, tokenH]) for (const [url, body] of [[endpoint(owner.id), undefined], [docUrl(owner.id), {}], [docUrl(owner.id) + '/preview', undefined], [docUrl(owner.id) + '/download', undefined]]) assert.equal((await call(url, token, body)).status, token ? 403 : 401);
      await staff.update({ is_active: false }); assert.equal((await call(endpoint(owner.id), tokenStaff)).status, 403); assert.equal((await call(docUrl(owner.id), tokenStaff, { version: doc.version, notes: 'revoked' }, 'PUT')).status, 403); await staff.update({ is_active: true });
    });
    await t.test('Actual Staff UI/modal/API -> PostgreSQL -> preview/download -> Student approved read-back', async () => {
      const uiOwner = await fixture();
      const { staffFixture } = await import(pathToFileURL(path.join(__dirname, '../../frontend/test/helpers/staffDocumentsFixture.js')).href);
      const ui = staffFixture({ me: () => ok(call('/api/staff/me', tokenStaff)), list: query => ok(call('/api/staff/document-requests?' + new URLSearchParams(query), tokenStaff)), detail: id => ok(call(endpoint(id), tokenStaff)), save: (id, type, action, body) => ok(call(docUrl(id, type) + (action === 'generate' ? '/generate' : ''), tokenStaff, body, action === 'edit' ? 'PUT' : 'POST')), content: async (id, type, mode) => { const result = await call(docUrl(id, type) + '/' + mode, tokenStaff); assert.equal(result.status, 200); return new Blob([result.text], { type: 'text/html' }); } });
      await ui.app.ready; await ui.app.openDetail(uiOwner.id); ui.get('staffNotes').value = 'Actual modal saved'; await ui.get('staffDocumentForm').dispatch('submit'); await ui.confirm(); assert.match(ui.get('staffDocumentState').textContent, /ร่าง.*1/);
      await ui.get('staffGenerate').dispatch('click'); await ui.confirm(); assert.match(ui.get('staffDocumentState').textContent, /ตัวอย่าง.*2/); await ui.get('staffPreview').dispatch('click'); await ui.get('staffDownload').dispatch('click'); assert.equal(ui.downloads.length, 1); assert.match(await ui.downloads[0].blob.text(), /Actual modal saved/);
      const studentResult = (await ok(call(`/api/coop-requests/${uiOwner.id}`, uiOwner.token))).data; assert.equal(studentResult.status, 'approved'); assert.equal(studentResult.reviews.length, 3); const student = await uiOwner.student.reload(); assert.equal(student.advisor_teacher_id, classTeacher.id); assert.equal(student.coop_advisor_teacher_id, projectTeacher.id);
      const persisted = await m.CoopDocument.findOne({ where: { coop_request_id: uiOwner.id } }); assert.equal(persisted.created_by, staff.id); assert.equal(persisted.metadata.notes, 'Actual modal saved');
    });
    await t.test('DB constraints/FKs and evidence-preserving rollback do not erase saved documents', async () => {
      await assert.rejects(migration.down({ context: qi }), /rollback refused/); await assert.rejects(staff.destroy());
      const row = await m.CoopDocument.findByPk(doc.id); await assert.rejects(db.query('UPDATE coop_documents SET content_sha256=NULL,status=\'generated\',generated_at=now(),rendered_html=\'bad\' WHERE id=:id', { replacements: { id: row.id } }));
      await assert.rejects(db.query('UPDATE coop_documents SET document_type=\'invalid\' WHERE id=:id', { replacements: { id: row.id } }));
    });
    // Immutable evidence remains in this guarded disposable DB. The isolated
    // runner removes its owned tmpfs PostgreSQL container after the test run.
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await db.close(); process.env.JWT_SECRET = previousSecret;
  }
});
