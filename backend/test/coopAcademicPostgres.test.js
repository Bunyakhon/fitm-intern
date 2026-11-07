// Opt-in real HTTP/JWT/PG16 against a fresh restored disposable database only.
const test = require('node:test'), assert = require('node:assert/strict');
const { randomUUID, randomBytes, createHmac } = require('node:crypto');
test('academic courses: restored PG16, actual API/RBAC, additive upgrade and immutable snapshots', { skip: process.env.FITM_ACADEMIC_POSTGRES_TESTS !== '1', timeout: 120000 }, async t => {
  const database = process.env.FITM_ACADEMIC_TEST_DATABASE;
  assert.equal(process.env.NODE_ENV, 'test'); assert.match(database || '', /^fitm_academic_test_[a-z0-9_]+$/);
  assert.equal(process.env.DB_NAME, database); assert.equal(process.env.DB_HOST, '127.0.0.1'); assert.equal(process.env.DB_PORT, '5432');
  const dotenv = require('dotenv'); dotenv.config = o => dotenv.configDotenv({ ...o, path: '/nonexistent/fitm-academic.env' });
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  const m = require('../src/models'), db = m.sequelize, { installAcademic } = require('../src/db/coopAcademicDevelopment');
  const rules = require('../src/db/coopAcademicIntegrity'), { CATALOG } = require('../src/services/coopPrerequisites');
  const rows = async (sql, bind) => (await db.query(sql, { bind }))[0], install = () => installAcademic(m, { expectedDatabase: database });
  const hashKey = randomBytes(32), digest = value => createHmac('sha256', hashKey).update(value).digest('hex');
  const quote = value => '"' + value.replace(/"/g, '""') + '"';
  async function inventory() {
    const tables = await rows("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    const schema = await rows("SELECT c.relname,k.conname,k.convalidated,pg_get_constraintdef(k.oid) definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname");
    const indexes = await rows("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname");
    const data = {};
    for (const { tablename } of tables) data[tablename] = (await rows('SELECT to_jsonb(t)::text value FROM ONLY public.' + quote(tablename) + ' t ORDER BY to_jsonb(t)::text COLLATE "C"')).map(r => digest(r.value));
    return { tables, schema, indexes, data };
  }
  let server;
  try {
    const [identity] = await rows("SELECT current_database() db,current_schema() schema,current_setting('server_version_num')::int version,host(inet_server_addr()) host,inet_server_port() port");
    assert.deepEqual(identity, { db: database, schema: 'public', version: 160015, host: '127.0.0.1', port: 5432 });
    const restored = await inventory(); assert.equal(restored.tables.length, 51, 'Requires a new restore of the verified pre-Catalog backup');
    assert.equal((await rows("SELECT to_regclass('public.coop_request_academic_states') state,to_regclass('public.coop_prerequisite_catalog_programs') catalog"))[0].state, null);
    const suffix = randomBytes(4).toString('hex');
    const makeTeacher = (key, head = false, department = 'Fixture Academic') => m.Teacher.create({ first_name: 'Fixture', last_name: key, email: key + suffix + '@example.test', password: randomBytes(18).toString('base64url'), status: 'active', department, is_department_head: head });
    const advisor = await makeTeacher('Advisor'), projectAdvisor = await makeTeacher('Project'), head = await makeTeacher('Head', true), otherHead = await makeTeacher('OtherHead', true, 'Other Department');
    const students = [];
    for (let i = 0; i < 6; i++) students.push(await m.Student.create({ student_id: '989' + String(Date.now()).slice(-8) + String(i).padStart(2, '0'), email: 'academic' + i + suffix + '@email.kmutnb.ac.th', first_name: 'Fixture', last_name: 'Academic',
      password: randomBytes(18).toString('base64url'), track: 'co_op', status: 'searching', major: i === 3 ? 'INE' : 'IT', advisor_teacher_id: advisor.id, coop_advisor_teacher_id: projectAdvisor.id }));
    const staff = await m.DepartmentStaff.create({ first_name: 'Fixture', last_name: 'Staff', email: 'academicstaff' + suffix + '@example.test', password: randomBytes(18).toString('base64url'), is_active: true });
    const fields = { company_name: 'Academic Fixture Company', company_province: 'Bangkok', company_address: 'Fixture only', letter_recipient_name: 'Fixture Recipient', work_start_date: '2027-01-01', work_end_date: '2027-05-01', delivery_methods: ['email'] };
    const legacy = await m.CoopRequest.create({ ...fields, student_id: students[0].id, status: 'cancelled' });
    for (const [i, grade] of ['F', 'legacy 2.5'].entries()) await db.getQueryInterface().bulkInsert('coop_request_prerequisite_courses', [{ id: randomUUID(), coop_request_id: legacy.id, program: 'IT', course_code: CATALOG.IT[i][0], course_name: 'Legacy fixture', status: 'passed', grade, created_at: new Date(), updated_at: new Date() }]);
    const legacyRows = () => rows('SELECT * FROM coop_request_prerequisite_courses WHERE coop_request_id=$1 ORDER BY course_code', [legacy.id]);
    const legacyBefore = await legacyRows();
    await t.test('additive installer rolls back tables/checks on injected failure without rewriting restored/legacy data', async () => {
      const before = await inventory(), original = db.query;
      db.query = function(sql, options) { if (typeof sql === 'string' && sql.startsWith('CREATE OR REPLACE FUNCTION public.coop_academic_history_insert_guard')) throw Error('Injected academic schema failure'); return original.call(this, sql, options); };
      try { await assert.rejects(install, /Injected academic schema failure/); } finally { db.query = original; }
      assert.deepEqual(await inventory(), before); assert.deepEqual(await legacyRows(), legacyBefore);
    });
    let schemaVerified = false;
    await t.test('additive installer and rerun preserve legacy F/free-text snapshots and create immutable contracts', async () => {
      assert.deepEqual(await install(), { database, installed: true, tablesAdded: 2, snapshotRowsUpdated: 0, grantsAdded: 0 });
      const before = await inventory(); assert.equal((await install()).tablesAdded, 0); assert.deepEqual(await inventory(), before);
      const previous = rules.previousFunctionSpecs[0];
      await db.query(`CREATE OR REPLACE FUNCTION public.${previous.name}() RETURNS trigger LANGUAGE plpgsql AS $academic$${previous.body}$academic$`);
      assert.equal((await install()).tablesAdded, 0);
      const [installedFunction] = await rows('SELECT prosrc FROM pg_proc WHERE oid=\'public.coop_academic_history_insert_guard()\'::regprocedure');
      assert.equal(installedFunction.prosrc.trim(), rules.functionSpecs.find(f => f.name === previous.name).body.trim());
      assert.deepEqual(await inventory(), before);
      assert.deepEqual(await legacyRows(), legacyBefore);
      const [r] = await rows("SELECT (SELECT count(*)::int FROM pg_trigger WHERE tgname LIKE 'coop_academic_%') triggers,(SELECT count(*)::int FROM coop_request_academic_history) history,(SELECT count(*)::int FROM coop_request_academic_states) states,to_regclass('public.coop_prerequisite_catalog_programs') catalog");
      assert.deepEqual(r, { triggers: 4, history: 0, states: 0, catalog: null });
      for (const c of rules.constraints) assert.ok((await rows('SELECT convalidated FROM pg_constraint WHERE conname=$1', [c.name]))[0].convalidated);
      schemaVerified = true;
    });
    assert.ok(schemaVerified, 'Do not run dependent HTTP scenarios when the additive schema precondition failed');
    const express = require('express'), jwt = require('jsonwebtoken'), app = express(); app.use(express.json());
    app.use('/api/coop-requests', require('../src/routes/coopRequest.routes'));
    app.use('/api/teachers', require('../src/routes/roleWorkflow.routes').createRoleWorkflowRouter('teacher', m));
    app.use('/api/department-head', require('../src/routes/roleWorkflow.routes').createRoleWorkflowRouter('department_head', m));
    app.use('/api/staff', require('../src/routes/roleWorkflow.routes').createRoleWorkflowRouter('department_staff', m));
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = 'http://127.0.0.1:' + server.address().port;
    const token = (actor, type) => jwt.sign({ id: actor.id, actor_type: type, role: type === 'teacher' && actor.is_department_head ? 'department_head' : type, ...(type === 'student' ? { student_id: actor.student_id } : type === 'department_staff' ? { staff_id: actor.id } : { teacher_id: actor.id }) }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const call = async (actor, type, method, path, body) => { const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: 'Bearer ' + token(actor, type) } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); return { status: r.status, body: await r.json(), cache: r.headers.get('cache-control') }; };
    const studentCall = (i, method, path, body) => call(students[i], 'student', method, '/api/coop-requests' + path, body);
    const payload = (i, studying = 0, failed = false) => ({ ...fields, prerequisite_courses: CATALOG[students[i].major].map(([course_code], index) => ({ course_code, status: failed && index === 0 ? 'failed' : index < studying ? 'studying' : 'passed', grade: failed && index === 0 ? 'F' : index < studying ? null : 'D+' })) });
    const created = [];
    await t.test('real submission accepts all-passed, studying, failed F and saved INE major without inventing grades', async () => {
      for (const [i, studying, failed] of [[0, 0, false], [1, 2, false], [2, 0, true], [3, 5, false], [5, 2, false]]) {
        const response = await studentCall(i, 'POST', '', payload(i, studying, failed)); assert.equal(response.status, 201, JSON.stringify(response.body)); created[i] = response.body.data;
        assert.equal(created[i].status, 'advisor_review'); assert.equal(created[i].academic.counts.studying, studying); assert.equal(created[i].academic.verification.can_verify, false);
        assert.ok(created[i].prerequisite_courses.every(c => c.program === students[i].major && (c.status !== 'studying' || c.grade === null)));
        assert.equal(created[i].academic.status, studying ? 'pending_grades' : 'pending_verification');
      }
      const duplicate = await Promise.all([studentCall(0, 'POST', '', payload(0)), studentCall(0, 'POST', '', payload(0))]); assert.deepEqual(duplicate.map(r => r.status), [409, 409]);
    });
    await t.test('grade validation rejects studying+grade, passed+F, failed+non-F and forged certification at real API', async () => {
      for (const changes of [{ status: 'studying', grade: 'B' }, { status: 'passed', grade: 'F' }, { status: 'failed', grade: 'A' }, { status: 'unselected', grade: 'F' }, { status: 'passed', grade: 4 }]) {
        const body = payload(4); Object.assign(body.prerequisite_courses[0], changes); assert.equal((await studentCall(4, 'POST', '', body)).status, 400);
      }
      const body = payload(4); body.prerequisite_courses[0] = { course_code: body.prerequisite_courses[0].course_code, status: 'unselected', grade: null };
      const valid = await studentCall(4, 'POST', '', body); assert.equal(valid.status, 201); created[4] = valid.body.data; assert.equal(valid.body.data.academic.counts.unselected, 1);
    });
    const request = created[1], course = request.prerequisite_courses.find(c => c.status === 'studying'), academicPath = '/' + request.id + '/academic-courses';
    const change = (revision, status = 'passed', grade = 'B+', expected_request_status = 'advisor_review') => ({ status, grade, expected_revision: revision, expected_request_status, operation_id: randomUUID() });
    const originalSnapshots = await rows('SELECT * FROM coop_request_prerequisite_courses WHERE coop_request_id=$1 ORDER BY course_code', [request.id]);
    await t.test('JWT/ownership/role guards deny outsiders and client-defined verified status without writes', async () => {
      const path = '/api/coop-requests' + academicPath + '/' + course.course_code;
      for (const [actor, type, status] of [[null, null, 401], [advisor, 'teacher', 403], [head, 'teacher', 403], [staff, 'department_staff', 403], [students[0], 'student', 404]]) assert.equal((await call(actor, type, 'PATCH', path, change(0))).status, status);
      assert.equal((await studentCall(0, 'GET', academicPath)).status, 404);
      assert.equal((await studentCall(1, 'PATCH', academicPath + '/' + course.course_code, { ...change(0), verified_eligible: true })).status, 400);
      assert.equal((await studentCall(1, 'PATCH', academicPath + '/999999999', change(0))).status, 404);
      assert.equal(await m.CoopRequestAcademicHistory.count(), 0);
    });
    let firstPayload;
    await t.test('studying -> passed appends actor/time/revision history; original submission stays unchanged', async () => {
      firstPayload = change(0); const response = await studentCall(1, 'PATCH', academicPath + '/' + course.course_code, firstPayload);
      assert.equal(response.status, 200, JSON.stringify(response.body)); assert.equal(response.cache, 'no-store'); const a = response.body.data.academic;
      assert.equal(a.revision, 1); assert.equal(a.counts.studying, 1); assert.equal(a.history.length, 1); assert.equal(a.history[0].actor_student_id, students[1].id);
      assert.equal(a.history[0].old_status, 'studying'); assert.equal(a.history[0].old_grade, null); assert.equal(a.history[0].new_grade, 'B+'); assert.ok(Number.isFinite(Date.parse(a.history[0].created_at)));
      assert.deepEqual(await rows('SELECT * FROM coop_request_prerequisite_courses WHERE coop_request_id=$1 ORDER BY course_code', [request.id]), originalSnapshots);
      assert.equal((await m.CoopRequest.findByPk(request.id)).status, 'advisor_review');
    });
    await t.test('idempotent retry reuses the event; reused key with another payload conflicts', async () => {
      const retry = await studentCall(1, 'PATCH', academicPath + '/' + course.course_code, firstPayload); assert.equal(retry.status, 200); assert.equal(retry.body.data.replayed, true);
      assert.equal((await studentCall(1, 'PATCH', academicPath + '/' + course.course_code, { ...firstPayload, grade: 'A' })).status, 409); assert.equal(await m.CoopRequestAcademicHistory.count(), 1);
    });
    await t.test('concurrent grades admit one winner and one conflict without duplicate history', async () => {
      const second = request.prerequisite_courses.filter(c => c.status === 'studying')[1];
      const results = await Promise.all(['A', 'B'].map(grade => studentCall(1, 'PATCH', academicPath + '/' + second.course_code, change(1, 'passed', grade))));
      assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
      const state = (await studentCall(1, 'GET', academicPath)).body.data; assert.equal(state.revision, 2); assert.equal(state.history.length, 2); assert.equal(state.status, 'pending_verification');
    });
    await t.test('Teacher/Head see latest states/history through existing class-advisor/department scope', async () => {
      for (const [actor, prefix] of [[advisor, '/api/teachers'], [head, '/api/department-head']]) {
        const response = await call(actor, 'teacher', 'GET', prefix + '/coop-requests/' + request.id); assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal(response.body.data.request.academic.revision, 2); assert.equal(response.body.data.request.academic.history.length, 2);
        assert.equal(response.body.data.request.prerequisite_courses.filter(c => c.status === 'studying').length, 2);
      }
      assert.equal((await call(projectAdvisor, 'teacher', 'GET', '/api/teachers/coop-requests/' + request.id)).status, 403);
      assert.equal((await call(otherHead, 'teacher', 'GET', '/api/department-head/coop-requests/' + request.id)).status, 403);
      const staffRead = await call(staff, 'department_staff', 'GET', '/api/staff/coop-requests/' + request.id); assert.equal(staffRead.status, 200); assert.equal(staffRead.body.data.request.academic.verification.can_verify, false);
    });
    await t.test('approval is independent: studying requests can be approved and later report passed/F before documents', async () => {
      const target = created[3], path = '/' + target.id + '/academic-courses';
      assert.equal((await call(advisor, 'teacher', 'POST', '/api/teachers/coop-requests/' + target.id + '/approve', {})).status, 200);
      assert.equal((await call(head, 'teacher', 'POST', '/api/department-head/coop-requests/' + target.id + '/approve', {})).status, 200);
      const approved = (await studentCall(3, 'GET', '/' + target.id)).body.data; assert.equal(approved.status, 'approved'); assert.equal(approved.academic.status, 'pending_grades');
      for (const [i, c] of target.prerequisite_courses.entries()) {
        const result = await studentCall(3, 'PATCH', path + '/' + c.course_code, change(i, i ? 'passed' : 'failed', i ? 'D' : 'F', 'approved'));
        assert.equal(result.status, 200, JSON.stringify(result.body)); if (i === 4) { assert.equal(result.body.data.academic.status, 'pending_verification'); assert.equal(result.body.data.academic.counts.failed, 1); }
      }
      const final = (await studentCall(3, 'GET', '/' + target.id)).body.data; assert.equal(final.status, 'approved'); assert.equal(final.academic.verification.can_verify, false); assert.ok(final.prerequisite_courses.every(c => c.status === 'studying' && c.grade === null));
    });
    await t.test('cancelled/rejected/issued/started windows and already-reported courses reject new writes', async () => {
      assert.equal((await studentCall(1, 'PATCH', '/' + request.id + '/cancel')).status, 200);
      assert.equal((await studentCall(1, 'PATCH', academicPath + '/' + course.course_code, change(2))).status, 409);
      assert.equal((await studentCall(1, 'PATCH', academicPath + '/' + course.course_code, firstPayload)).body.data.replayed, true);
      for (const status of ['rejected', 'document_issued', 'in_progress']) {
        const r = await m.CoopRequest.create({ ...fields, student_id: students[4].id, status, ...(status === 'document_issued' ? { document_issued_at: new Date() } : {}) });
        await m.CoopRequestPrerequisiteCourse.create({ coop_request_id: r.id, program: 'IT', course_code: CATALOG.IT[0][0], course_name: 'Closed fixture', status: 'studying', grade: null });
        assert.equal((await studentCall(4, 'PATCH', '/' + r.id + '/academic-courses/' + CATALOG.IT[0][0], change(0))).status, 409);
      }
      assert.equal((await studentCall(3, 'PATCH', '/' + created[3].id + '/academic-courses/' + created[3].prerequisite_courses[0].course_code, change(5, 'passed', 'A', 'approved'))).status, 409);
    });
    await t.test('failure after inserting history rolls back header/event; review and grade locks serialize safely', async () => {
      const r = created[5], code = r.prerequisite_courses.find(c => c.status === 'studying').course_code, path = '/' + r.id + '/academic-courses/' + code;
      m.CoopRequestAcademicHistory.addHook('afterCreate', 'fixtureFail', () => { throw Error('Injected history failure'); });
      try { assert.equal((await studentCall(5, 'PATCH', path, change(0))).status, 500); } finally { m.CoopRequestAcademicHistory.removeHook('afterCreate', 'fixtureFail'); }
      assert.equal(await m.CoopRequestAcademicState.findByPk(r.id), null); assert.equal(await m.CoopRequestAcademicHistory.count({ where: { coop_request_id: r.id } }), 0);
      const result = await Promise.all([studentCall(5, 'PATCH', path, change(0)), call(advisor, 'teacher', 'POST', '/api/teachers/coop-requests/' + r.id + '/approve', {})]);
      assert.ok([200, 409].includes(result[0].status)); assert.equal(result[1].status, 200); assert.equal((await m.CoopRequest.findByPk(r.id)).status, 'department_head_review');
    });
    await t.test('database guards prohibit silent snapshot/history changes and invalid revisions', async () => {
      for (const query of ["UPDATE coop_request_prerequisite_courses SET grade=grade WHERE coop_request_id=$1", 'DELETE FROM coop_request_prerequisite_courses WHERE coop_request_id=$1', 'UPDATE coop_request_academic_history SET new_grade=new_grade WHERE coop_request_id=$1', 'DELETE FROM coop_request_academic_history WHERE coop_request_id=$1', 'UPDATE coop_request_academic_states SET revision=revision+2 WHERE coop_request_id=$1']) await assert.rejects(rows(query, [request.id]), e => e.original?.code === '23514');
      assert.deepEqual(await rows('SELECT * FROM coop_request_prerequisite_courses WHERE coop_request_id=$1 ORDER BY course_code', [request.id]), originalSnapshots);
    });
    await t.test('legacy API/grades remain readable; all original restored rows survive without Catalog installation', async () => {
      const response = await studentCall(0, 'GET', '/' + legacy.id); assert.equal(response.status, 200); assert.deepEqual(response.body.data.prerequisite_courses.map(c => c.grade), ['F', 'legacy 2.5']);
      assert.equal(response.body.data.academic.counts.legacy_unconfirmed, 2); assert.equal(response.body.data.academic.status, 'pending_grades'); assert.deepEqual(await legacyRows(), legacyBefore);
      const after = await inventory();
      for (const [table, hashes] of Object.entries(restored.data)) { const remaining = [...after.data[table]]; for (const hash of hashes) { const index = remaining.indexOf(hash); assert.ok(index >= 0, 'Original restored row changed in ' + table); remaining.splice(index, 1); } }
      assert.equal((await rows("SELECT to_regclass('public.coop_prerequisite_catalog_programs') catalog"))[0].catalog, null);
    });
  } finally { if (server) await new Promise(resolve => server.close(resolve)); await db.close(); }
});
