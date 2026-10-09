// Explicit Local HTTP/SQL acceptance. No valid login JWTs are fabricated.
// Only owned Students/requests/documents and a temporary Staff account are removed.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createTeacherCredentialManager } = require('../src/seeders/devTeacherCredential');
const { CATALOG } = require('../src/services/coopPrerequisites');
async function run(m) {
  assert.equal(process.env.NODE_ENV, 'development'); assert.equal(process.env.FITM_LOCAL_STAFF_DOCUMENT_ACCEPTANCE, '1');
  const [[database]] = await m.sequelize.query('SELECT current_database() AS name'); assert.equal(database.name, 'intern_system');
  const a = await m.Teacher.findByPk(process.env.TEACHER_TEST_ID); assert.ok(a?.status === 'active' && a.email && a.password_hash);
  const heads = await m.Teacher.findAll({ where: { status: 'active', is_department_head: true } }); assert.equal(heads.length, 1); const h = heads[0]; assert.equal(h.department, a.department);
  const b = await m.Teacher.findOne({ where: { status: 'active', is_department_head: false, email: null, password_hash: null }, order: [['id', 'ASC']] }); assert.ok(b && b.id !== a.id);
  async function passwordFile(file) { assert.ok(file && path.isAbsolute(file)); const info = await fs.lstat(file); assert.ok(info.isFile() && !info.isSymbolicLink()); assert.equal(info.mode & 0o077, 0); return (await fs.readFile(file, 'utf8')).trim(); }
  const passwordA = await passwordFile(process.env.TEACHER_TEST_PASSWORD_PATH);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fitm-local-staff-documents-')), fixtures = [], checks = [], installed = [];
  const manager = createTeacherCredentialManager(m); let ownedStaff, failure;
  const mark = value => { checks.push(value); console.log('PASS ' + value); };
  async function snapshot() {
    return m.sequelize.transaction(async transaction => {
      await m.sequelize.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY', { transaction });
      const [tables] = await m.sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", { transaction }); const result = {};
      for (const { tablename } of tables) { assert.match(tablename, /^[a-z_]+$/); const [[row]] = await m.sequelize.query(`SELECT count(*)::int AS rows,md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY to_jsonb(t)::text), '')) AS fingerprint FROM public.${tablename} t`, { transaction }); result[tablename] = row; }
      return result;
    });
  }
  const before = await snapshot(); assert.equal(Object.keys(before).length, 25); assert.equal(before.teachers.rows, 23); assert.equal(before.sequelize_meta.rows, 18); assert.equal(before.student_files.rows, 3); assert.equal(before.student_files.fingerprint, '7d0bf012a44869f32fd415f75b08471c');
  await fs.writeFile(path.join(root, 'before.json'), JSON.stringify(before), { flag: 'wx', mode: 0o600 });
  async function api(url, token, body, method = body === undefined ? 'GET' : 'POST') {
    const response = await fetch('http://127.0.0.1:5000' + url, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
    assert.doesNotMatch(text, /password_hash|token_hash|storage_path/); return { status: response.status, data, text, headers: response.headers };
  }
  async function ok(promise) { const response = await promise; assert.equal(response.status, 200); return response.data; }
  const endpoint = id => `/api/staff/document-requests/${id}`, documentUrl = (id, type = 'cooperation') => `${endpoint(id)}/documents/${type}`;
  async function logOwners() { await fs.writeFile(path.join(root, 'owned-fixtures.json'), JSON.stringify({ students: fixtures.map(({ student, requestId }) => ({ id: student.id, email: student.email, student_id: student.student_id, requestId })), staff: ownedStaff ? { id: ownedStaff.id, email: ownedStaff.email } : null }), { mode: 0o600 }); }
  try {
    const tokenA = (await ok(api('/api/teachers/auth/login', null, { email: a.email, password: passwordA }))).token;
    let headEmail = h.email, headPassword;
    if (h.id === a.id) headPassword = passwordA;
    else if (h.email && h.password_hash) headPassword = await passwordFile(process.env.HEAD_TEST_PASSWORD_PATH);
    else { const credential = { environment: 'development', teacherId: h.id, email: `staff-doc-head-${crypto.randomUUID()}@fixture.invalid`, password: crypto.randomBytes(24).toString('base64url'), backupPath: path.join(root, 'head-original.json') }; await manager.provision(credential); installed.push(credential); headEmail = credential.email; headPassword = credential.password; }
    const tokenH = (await ok(api('/api/department-head/auth/login', null, { email: headEmail, password: headPassword }))).token;
    const staffPassword = crypto.randomBytes(24).toString('base64url');
    ownedStaff = await m.DepartmentStaff.create({ first_name: 'Local document acceptance', last_name: 'Temporary owned fixture', email: `local-staff-documents-${crypto.randomUUID()}@fixture.invalid`, password: staffPassword, is_active: true }); await logOwners();
    const staffLogin = await ok(api('/api/staff/auth/login', null, { email: ownedStaff.email, password: staffPassword })), tokenStaff = staffLogin.token;
    assert.equal(staffLogin.staff.id, ownedStaff.id); assert.equal((await ok(api('/api/staff/me', tokenStaff))).data.id, ownedStaff.id); mark('Actual owned Staff password login/live profile; existing Class and real Head login');
    async function fixture(status = 'approved') {
      const suffix = crypto.randomUUID(), password = crypto.randomBytes(24).toString('base64url');
      const student = await m.Student.create({ student_id: `local-staff-doc-${suffix}`, email: `local-staff-doc-${suffix}@email.kmutnb.ac.th`, first_name: 'Local document fixture', last_name: 'Temporary', major: 'IT', track: 'co_op', advisor_teacher_id: a.id, coop_advisor_teacher_id: b.id, password });
      const owner = { student }; fixtures.push(owner); await logOwners();
      owner.token = (await ok(api('/api/auth/login', null, { email: student.email, password }))).token;
      const response = await api('/api/coop-requests', owner.token, { company_name: 'Local document snapshot company', company_address: 'Local owned snapshot address', company_province: 'Bangkok', letter_recipient_name: 'Fixture HR', work_start_date: '2026-11-01', work_end_date: '2027-02-01', delivery_methods: ['email'], prerequisite_courses: CATALOG.IT.map(([course_code]) => ({ course_code, status: 'passed', grade: 'A' })) });
      assert.equal(response.status, 201); owner.requestId = response.data.data.id; await logOwners();
      if (status !== 'advisor_review') await ok(api(`/api/teachers/coop-requests/${owner.requestId}/approve`, tokenA, {}));
      if (!['advisor_review', 'department_head_review'].includes(status)) await ok(api(`/api/department-head/coop-requests/${owner.requestId}/${status === 'rejected' ? 'reject' : 'approve'}`, tokenH, status === 'rejected' ? { reason: 'Owned rejected fixture' } : {}));
      assert.equal((await m.CoopRequest.findByPk(owner.requestId)).status, status); return owner;
    }
    const owner = await fixture(), id = owner.requestId;
    const queue = await ok(api('/api/staff/document-requests?search=Local%20document%20fixture', tokenStaff)); assert.ok(queue.data.some(row => row.id === id));
    const detail = (await ok(api(endpoint(id), tokenStaff))).data; assert.equal(detail.eligible, true); assert.deepEqual(detail.missing_fields, []); assert.equal(detail.reviews.find(row => row.actor_role === 'teacher').teacher.id, a.id); assert.equal(detail.reviews.find(row => row.actor_role === 'department_head').teacher.id, h.id); mark('Owned Student submit -> Class approve -> Head approved -> Staff queue/detail/named history');
    let doc = (await ok(api(documentUrl(id), tokenStaff, { notes: 'Local owned draft', issue_date: '2026-10-07' }))).data;
    assert.equal(doc.status, 'draft'); assert.equal(doc.created_by, ownedStaff.id); assert.equal(doc.coop_request_id, id); assert.equal(doc.snapshot.student.id, owner.student.id); assert.equal(doc.snapshot.request.company_name, 'Local document snapshot company');
    assert.equal((await api(documentUrl(id), tokenStaff, {})).status, 409); assert.equal((await api(documentUrl(id) + '/preview', tokenStaff)).status, 409); mark('Cooperation draft persisted with server-owned request/student/snapshot/Staff; duplicate create refused');
    doc = (await ok(api(documentUrl(id), tokenStaff, { version: doc.version, notes: '<script>escaped dev fixture</script>', document_number: `DEV-${crypto.randomUUID()}` }, 'PUT'))).data;
    const oldVersion = doc.version, generated = await Promise.all([api(documentUrl(id) + '/generate', tokenStaff, { version: oldVersion }), api(documentUrl(id) + '/generate', tokenStaff, { version: oldVersion })]);
    assert.deepEqual(generated.map(row => row.status).sort(), [200, 409]); doc = generated.find(row => row.status === 200).data.data;
    const preview = await api(documentUrl(id) + '/preview', tokenStaff), download = await api(documentUrl(id) + '/download', tokenStaff);
    assert.equal(preview.status, 200); assert.equal(download.status, 200); assert.equal(preview.text, download.text); assert.match(preview.headers.get('content-type'), /^text\/html/); assert.match(download.headers.get('content-disposition'), /attachment.*\.html/); assert.match(preview.text, /ฉบับตัวอย่าง/); assert.match(preview.text, /&lt;script&gt;/); assert.doesNotMatch(preview.text, /<script>/); assert.equal(crypto.createHash('sha256').update(preview.text).digest('hex'), doc.content_sha256);
    mark('Concurrent generation commits one persisted dev HTML artifact/audit; authenticated preview/download match SHA256; escaping/CSP safe');
    const priorVersion = doc.version, savedSnapshot = doc.snapshot;
    doc = (await ok(api(documentUrl(id) + '/generate', tokenStaff, { version: priorVersion }))).data; assert.deepEqual(doc.snapshot, savedSnapshot);
    assert.equal((await api(documentUrl(id) + '/generate', tokenStaff, { version: priorVersion })).status, 409);
    assert.equal((await api(documentUrl(id) + `/preview?version=${priorVersion}`, tokenStaff)).status, 200);
    doc = (await ok(api(documentUrl(id), tokenStaff, { version: doc.version, notes: 'Updated Local draft' }, 'PUT'))).data; assert.equal(doc.status, 'draft'); assert.equal((await api(documentUrl(id) + '/preview', tokenStaff)).status, 409);
    doc = (await ok(api(documentUrl(id) + '/generate', tokenStaff, { version: doc.version }))).data;
    const history = (await ok(api(endpoint(id), tokenStaff))).data.revisions; assert.deepEqual(history.map(row => row.action), ['create', 'edit', 'generate', 'regenerate', 'edit', 'generate']); assert.ok(history.every(row => row.department_staff_id === ownedStaff.id)); mark('Edit/regenerate/history/old-version preview/stale-write protection; request remains approved');
    for (const token of [null, tokenA, tokenH, owner.token]) for (const [url, body] of [[endpoint(id), undefined], [documentUrl(id), {}], [documentUrl(id) + '/preview', undefined], [documentUrl(id) + '/download', undefined]]) assert.equal((await api(url, token, body)).status, token ? 403 : 401);
    for (const body of [{ staff_id: ownedStaff.id }, { student_id: owner.student.id }, { coop_request_id: crypto.randomUUID() }, { status: 'approved' }, { issue_date: '2026-02-31' }]) assert.equal((await api(documentUrl(id), tokenStaff, body)).status, 400);
    assert.equal((await api(documentUrl(id, 'invalid'), tokenStaff, {})).status, 400); assert.equal((await api(documentUrl(crypto.randomUUID()), tokenStaff, {})).status, 404); assert.equal((await api(documentUrl(id) + '/preview?version=../../', tokenStaff)).status, 400);
    mark('Anonymous/Student/Teacher/Head denied; identity/request/status spoof, invalid type/date/version/unknown request refused');
    for (const status of ['advisor_review', 'department_head_review', 'rejected']) { const bad = await fixture(status); assert.equal((await api(documentUrl(bad.requestId), tokenStaff, {})).status, 409); assert.equal((await api(`/api/staff/coop-requests/${bad.requestId}/approve`, tokenStaff, {})).status, 404); assert.equal((await m.CoopRequest.findByPk(bad.requestId)).status, status); }
    const incomplete = await fixture(); await m.sequelize.query('UPDATE students SET major=NULL WHERE id=:id', { replacements: { id: incomplete.student.id } }); const missing = await api(documentUrl(incomplete.requestId), tokenStaff, {}); assert.equal(missing.status, 400); assert.ok(missing.data.missing_fields.includes('student.major'));
    mark('Rejected/Class-pending/Head-pending document writes refused; Staff cannot approve; missing required data returns field list');
    const placement = await api(documentUrl(id, 'placement'), tokenStaff, {}); assert.equal(placement.status, 409); assert.equal(placement.data.code, 'COMPANY_RESPONSE_REQUIRED'); assert.equal(await m.CoopDocument.count({ where: { coop_request_id: id, document_type: 'placement' } }), 0);
    mark('Placement prerequisite gap fails closed; no fake company acceptance or placement document');
    await ownedStaff.update({ is_active: false }); assert.equal((await api(endpoint(id), tokenStaff)).status, 403); assert.equal((await api(documentUrl(id) + '/preview', tokenStaff)).status, 403); await ownedStaff.update({ is_active: true });
    const readback = (await ok(api(`/api/coop-requests/${id}`, owner.token))).data; assert.equal(readback.status, 'approved'); assert.equal(readback.reviews.length, 3);
    const student = await owner.student.reload(); assert.equal(student.advisor_teacher_id, a.id); assert.equal(student.coop_advisor_teacher_id, b.id); assert.equal((await m.CoopRequest.findByPk(id)).document_issued_at, null);
    mark('Student approved read-back / 3 canonical reviews / both advisor IDs unchanged; revoked Staff denied; no official issue transition');
  } catch (error) { failure = error; }
  finally {
    try {
      await m.sequelize.transaction(async transaction => {
        for (const { student: owner } of fixtures) {
          const identity = { id: owner.id, email: owner.email, student_id: owner.student_id };
          assert.ok(await m.Student.findOne({ where: identity, transaction, lock: transaction.LOCK.UPDATE })); assert.equal(await m.StudentFile.count({ where: { student_id: owner.id }, transaction }), 0);
          const requests = await m.CoopRequest.findAll({ where: { student_id: owner.id }, transaction });
          for (const request of requests) {
            const docs = await m.CoopDocument.findAll({ where: { coop_request_id: request.id }, transaction });
            for (const doc of docs) await m.CoopDocumentRevision.destroy({ where: { coop_document_id: doc.id }, transaction });
            await m.CoopDocument.destroy({ where: { coop_request_id: request.id }, transaction }); await m.CoopRequestReview.destroy({ where: { coop_request_id: request.id }, transaction });
          }
          await m.CoopRequest.destroy({ where: { student_id: owner.id }, transaction }); await m.Student.destroy({ where: identity, transaction });
        }
        if (ownedStaff) { const identity = { id: ownedStaff.id, email: ownedStaff.email }; assert.ok(await m.DepartmentStaff.findOne({ where: identity, transaction, lock: transaction.LOCK.UPDATE })); await m.DepartmentStaff.destroy({ where: identity, transaction }); }
      });
    } finally { for (const credential of installed.reverse()) await manager.restore(credential); }
  }
  const after = await snapshot(); assert.deepEqual(after, before); assert.equal(await m.Teacher.count({ where: { is_department_head: true } }), 1);
  mark('Only owned fixtures cleaned / Head credentials restored / real Head flag retained; all 23 table fingerprints identical');
  const reportPath = path.join(root, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify({ date: '2026-10-07', status: failure ? 'FAIL' : 'PASS', cooperation: failure ? 'FAIL' : 'PASS', placement: 'BLOCKED: unconfirmed prerequisites; Company Acceptance/Response is absent', browser: 'NOT RUN', format: 'Persisted development HTML, not official PDF', checks, before, after, changedTables: [], temporaryStudentsCleaned: fixtures.length, temporaryStaffCleaned: !!ownedStaff, headCredentialsRestored: true, headFlagRetained: true }, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ status: failure ? 'FAIL' : 'PASS', reportPath, placement: 'BLOCKED', credentialsLogged: false }));
  if (failure) throw failure; return { reportPath };
}
if (require.main === module) {
  const m = require('../src/models'); run(m).catch(error => { console.error('Local Staff document acceptance failed:', error.name, '(no secret details logged)'); process.exitCode = 1; }).finally(() => m.sequelize.close());
}
module.exports = { run };
