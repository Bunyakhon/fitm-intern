// Opt-in only: a fresh restore of the post-Academic/pre-Catalog Development
// backup in a disposable, network-isolated PostgreSQL 16 container.
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID, createHmac } = require('node:crypto');

test('A01 + Catalog + Academic on a restored disposable PostgreSQL database', {
  skip: process.env.FITM_COOP_SUBMISSION_TESTS !== '1', timeout: 120000,
}, async t => {
  const database = process.env.FITM_COOP_SUBMISSION_DATABASE;
  assert.equal(process.env.NODE_ENV, 'test');
  assert.match(database || '', /^fitm_catalog_test_[a-z0-9_]+$/);
  assert.equal(process.env.DB_NAME, database);
  assert.equal(process.env.DB_HOST, '127.0.0.1');
  assert.equal(process.env.DB_PORT, '5432');
  const dotenv = require('dotenv'); dotenv.config = () => ({});
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  const m = require('../src/models'), db = m.sequelize;
  const { installCatalog } = require('../src/db/coopPrerequisiteCatalog');
  const { requireClassAdvisor } = require('../src/services/coopClassAdvisor.service');
  const { PERMISSION } = require('../src/services/coopPrerequisiteCatalog.service');
  const rows = async (sql, bind) => (await db.query(sql, { bind }))[0];
  const key = randomBytes(32), quote = s => '"' + s.replaceAll('"', '""') + '"';
  async function fingerprints(tables) {
    const result = {};
    for (const table of tables) {
      const values = await rows('SELECT to_jsonb(t)::text value FROM ONLY public.' + quote(table) + ' t ORDER BY to_jsonb(t)::text COLLATE "C"');
      result[table] = { count: values.length, hmac: createHmac('sha256', key).update(JSON.stringify(values)).digest('hex') };
    }
    return result;
  }
  let server;
  try {
    const [identity] = await rows("SELECT current_database() db,current_setting('server_version_num')::int version");
    assert.equal(identity.db, database); assert.equal(Math.floor(identity.version / 10000), 16);
    const tables = (await rows("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).map(r => r.tablename);
    assert.equal(tables.length, 53, 'Requires a new post-Academic backup restore');
    assert.ok(tables.includes('coop_request_academic_history'));
    assert.ok(!tables.includes('coop_prerequisite_catalog_programs'));
    const original = await fingerprints(tables);
    await t.test('Catalog install/rerun seed IT5 + INE5 and preserve all 53 original tables', async () => {
      assert.equal((await installCatalog(m, { expectedDatabase: database })).seeded, 10);
      const catalogTables = ['coop_prerequisite_catalog_programs', 'coop_prerequisite_catalog_courses', 'coop_prerequisite_catalog_grants'];
      const before = await fingerprints(catalogTables);
      assert.equal((await installCatalog(m, { expectedDatabase: database })).seeded, 0);
      assert.deepEqual(await fingerprints(catalogTables), before);
      assert.deepEqual(await fingerprints(tables), original);
      for (const program of ['IT', 'INE']) assert.equal(await m.CoopPrerequisiteCatalogCourse.count({ where: { program } }), 5);
      assert.equal(await m.CoopPrerequisiteCatalogGrant.count(), 0);
    });
    const suffix = randomBytes(5).toString('hex'), password = randomBytes(20).toString('hex');
    const teacher = (name, extra = {}) => m.Teacher.create({ first_name: 'Fixture', last_name: name, email: name + suffix + '@example.test', password, status: 'active', department: 'Fixture Department', ...extra });
    const advisor = await teacher('Advisor'), other = await teacher('Other'), head = await teacher('Head', { is_department_head: true });
    const inactive = await teacher('Inactive', { status: 'inactive' }), noDepartment = await teacher('NoDepartment', { department: null });
    const staff = [];
    for (let i = 0; i < 4; i++) staff.push(await m.DepartmentStaff.create({ first_name: 'Fixture', last_name: 'Staff' + i, email: 'staff' + i + suffix + '@example.test', password, is_active: true }));
    for (const [i, programs] of [[0, ['IT']], [1, ['INE']], [2, ['IT', 'INE']]]) for (const program of programs) await m.CoopPrerequisiteCatalogGrant.create({ department_staff_id: staff[i].id, permission: PERMISSION, program });
    const students = [];
    for (let i = 0; i < 10; i++) students.push(await m.Student.create({ student_id: '986' + String(Date.now()).slice(-8) + String(i).padStart(2, '0'), email: 'student' + i + suffix + '@email.kmutnb.ac.th', password,
      first_name: 'Fixture', last_name: 'Student', major: i === 5 ? 'INE' : 'IT', track: 'co_op', status: 'searching', advisor_teacher_id: advisor.id, coop_advisor_teacher_id: other.id }));
    const express = require('express'), jwt = require('jsonwebtoken'), app = express(); app.use(express.json());
    app.post('/api/auth/unified-login', require('../src/controllers/unifiedAuth.controller').createUnifiedLoginHandler());
    app.use('/api/coop-requests', require('../src/routes/coopRequest.routes'));
    for (const [path, role] of [['teachers', 'teacher'], ['department-head', 'department_head'], ['staff', 'department_staff']]) app.use('/api/' + path, require('../src/routes/roleWorkflow.routes').createRoleWorkflowRouter(role, m));
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = 'http://127.0.0.1:' + server.address().port;
    const token = (actor, type) => jwt.sign({ id: actor.id, actor_type: type, role: type === 'teacher' && actor.is_department_head ? 'department_head' : type,
      ...(type === 'student' ? { student_id: actor.student_id } : type === 'department_staff' ? { staff_id: actor.id } : { teacher_id: actor.id }) }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const call = async (actor, type, method, path, body) => {
      const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: 'Bearer ' + token(actor, type) } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: r.status, body: await r.json(), cache: r.headers.get('cache-control') };
    };
    const studentCall = (i, method, path = '', body) => call(students[i], 'student', method, '/api/coop-requests' + path, body);
    const catalogPath = '/api/staff/coop-prerequisite-catalog';
    const staffCall = (i, method, path = '', body) => call(staff[i], 'department_staff', method, catalogPath + path, body);
    const catalog = async i => { const r = await studentCall(i, 'GET', '/prerequisite-catalog'); assert.equal(r.status, 200); return r.body.data; };
    const payload = async i => {
      const c = await catalog(i);
      return { company_name: 'Fixture Company', company_province: 'กรุงเทพมหานคร', company_address: 'Fixture only', letter_recipient_name: 'Fixture Recipient', work_start_date: '2027-01-01', work_end_date: '2027-05-01', delivery_methods: ['email'],
        prerequisite_catalog_revision: c.revision, prerequisite_courses: c.courses.map(row => ({ course_code: row.course_code, status: 'studying', grade: null })) };
    };
    await t.test('Unified credentials detect Student/Teacher/Head/Staff roles against actual PostgreSQL fixtures', async () => {
      for (const [actor, role] of [[students[0], 'student'], [advisor, 'teacher'], [head, 'department_head'], [staff[0], 'department_staff']]) {
        const r = await call(null, null, 'POST', '/api/auth/unified-login', { email: actor.email, password }); assert.equal(r.status, 200); assert.equal(r.body.role, role); assert.ok(r.body.token);
      }
    });
    const counts = async () => rows('SELECT (SELECT count(*)::int FROM coop_requests) requests,(SELECT count(*)::int FROM coop_request_reviews) reviews,(SELECT count(*)::int FROM coop_request_prerequisite_courses) courses');
    await t.test('Null/project-only/inactive/disabled/missing-department advisors reject direct POST with zero new request/history rows', async () => {
      const body = await payload(0), before = await counts();
      for (const [id, code] of [[null, 'CLASS_ADVISOR_REQUIRED'], [inactive.id, 'CLASS_ADVISOR_NOT_ELIGIBLE'], [noDepartment.id, 'CLASS_ADVISOR_NOT_ELIGIBLE']]) {
        await students[0].update({ advisor_teacher_id: id });
        const r = await studentCall(0, 'POST', '', body); assert.equal(r.status, 400); assert.equal(r.body.code, code);
        const ready = await studentCall(0, 'GET', '/class-advisor'); assert.equal(ready.status, 200); assert.equal(ready.body.data.ready, false); assert.equal(ready.cache, 'no-store');
        assert.deepEqual(await counts(), before);
      }
      await students[0].update({ advisor_teacher_id: advisor.id });
      const control = await m.AdminAccountControl.create({ actor_type: 'teacher', actor_id: advisor.id, enabled: false });
      assert.equal((await studentCall(0, 'POST', '', body)).body.code, 'CLASS_ADVISOR_NOT_ELIGIBLE'); await control.destroy();
      assert.deepEqual(await counts(), before);
      // An orphan assignment cannot be inserted under the real FK. Exercise
      // the missing-record branch with an explicit lookup substitute only.
      await assert.rejects(requireClassAdvisor({ ...m, Teacher: { findByPk: async () => null } }, { advisor_teacher_id: randomUUID() }), e => e.code === 'CLASS_ADVISOR_NOT_FOUND');
      assert.equal((await studentCall(0, 'POST', '', { ...body, advisor_teacher_id: other.id })).status, 400);
    });
    await t.test('Submission reads advisor committed during Student-lock wait; direct API cannot use stale/unsaved choice', async () => {
      const body = await payload(1), tx = await db.transaction(), find = m.Student.findByPk;
      await students[1].update({ advisor_teacher_id: null }, { transaction: tx });
      let reached; const waiting = new Promise(resolve => { reached = resolve; });
      m.Student.findByPk = function(id, options) { if (id === students[1].id && options?.lock === 'UPDATE') reached(); return find.call(this, id, options); };
      try {
        const pending = studentCall(1, 'POST', '', body); await waiting; await tx.commit();
        const r = await pending; assert.equal(r.status, 400); assert.equal(r.body.code, 'CLASS_ADVISOR_REQUIRED');
      } finally { m.Student.findByPk = find; if (!tx.finished) await tx.rollback(); }
    });
    let submitted;
    await t.test('Concurrent first submissions produce one advisor_review and one conflict, one atomic history/snapshot', async () => {
      const body = await payload(2), results = await Promise.all([studentCall(2, 'POST', '', body), studentCall(2, 'POST', '', body)]);
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409]); submitted = results.find(r => r.status === 201).body.data;
      assert.equal(submitted.status, 'advisor_review'); assert.equal(submitted.academic.counts.studying, 5);
      assert.equal(await m.CoopRequestReview.count({ where: { coop_request_id: submitted.id } }), 1);
      assert.equal(await m.CoopRequestPrerequisiteCourse.count({ where: { coop_request_id: submitted.id } }), 5);
    });
    await t.test('Teacher queue/approval is restricted to current class advisor; correct approval advances to Head', async () => {
      const path = '/api/teachers/coop-requests';
      const own = await call(advisor, 'teacher', 'GET', path); assert.ok(own.body.data.some(r => r.id === submitted.id));
      const foreign = await call(other, 'teacher', 'GET', path); assert.ok(!foreign.body.data.some(r => r.id === submitted.id));
      assert.equal((await call(other, 'teacher', 'POST', path + '/' + submitted.id + '/approve', {})).status, 403);
      const r = await call(advisor, 'teacher', 'POST', path + '/' + submitted.id + '/approve', {}); assert.equal(r.status, 200);
      assert.equal((await m.CoopRequest.findByPk(submitted.id)).status, 'department_head_review');
      const detail = await call(advisor, 'teacher', 'GET', path + '/' + submitted.id);
      assert.equal(detail.body.data.reviews.find(e => e.decision === 'approve').teacher.id, advisor.id);
      assert.equal((await call(head, 'teacher', 'POST', '/api/department-head/coop-requests/' + submitted.id + '/approve', {})).status, 200);
    });
    await t.test('Teacher/Head rejection requires a reason and preserves the actual reviewer/time/history', async () => {
      for (const [i, actor, type, path] of [[8, advisor, 'teacher', '/api/teachers/coop-requests/'], [9, head, 'teacher', '/api/department-head/coop-requests/']]) {
        const created = await studentCall(i, 'POST', '', await payload(i)); assert.equal(created.status, 201);
        const id = created.body.data.id;
        if (i === 9) assert.equal((await call(advisor, 'teacher', 'POST', '/api/teachers/coop-requests/' + id + '/approve', {})).status, 200);
        assert.equal((await call(actor, type, 'POST', path + id + '/reject', {})).status, 400);
        assert.equal((await call(actor, type, 'POST', path + id + '/reject', { reason: 'Fixture rejection reason' })).status, 200);
        const read = await studentCall(i, 'GET', '/' + id); assert.equal(read.body.data.status, 'rejected');
        const event = read.body.data.reviews.find(e => e.decision === 'reject');
        assert.equal(event.teacher.id, actor.id); assert.equal(event.reason, 'Fixture rejection reason'); assert.ok(Number.isFinite(Date.parse(event.created_at)));
      }
    });
    await t.test('Failure after request/snapshot writes rolls the entire submission back', async () => {
      const body = await payload(3), before = await counts();
      m.CoopRequestReview.addHook('beforeCreate', 'a01Failure', () => { throw Object.assign(new Error('Fixture rollback'), { status: 400 }); });
      try { assert.equal((await studentCall(3, 'POST', '', body)).status, 400); }
      finally { m.CoopRequestReview.removeHook('beforeCreate', 'a01Failure'); }
      assert.deepEqual(await counts(), before);
    });
    await t.test('response read failure before commit rolls back request, children and submit review', async () => {
      const body = await payload(3), before = await counts(), originalFind = m.CoopRequest.findOne;
      m.CoopRequest.findOne = function(options) {
        if (options.where?.id && options.transaction) throw Object.assign(new Error('Fixture response read failure'), { status: 400 });
        return originalFind.call(this, options);
      };
      try { assert.equal((await studentCall(3, 'POST', '', body)).status, 400); }
      finally { m.CoopRequest.findOne = originalFind; }
      assert.deepEqual(await counts(), before);
    });
    await t.test('Staff IT/INE/both/no grant, anonymous/Student/Teacher denial and live grant revocation', async () => {
      for (const [i, allowed] of [[0, ['IT']], [1, ['INE']], [2, ['INE', 'IT']], [3, []]]) {
        const p = await staffCall(i, 'GET', '/permissions'); assert.equal(p.status, 200); assert.deepEqual(p.body.data.programs, allowed);
        for (const program of ['IT', 'INE']) assert.equal((await staffCall(i, 'GET', '?program=' + program)).status, allowed.includes(program) ? 200 : 403);
      }
      for (const [actor, type, expected] of [[null, null, 401], [students[0], 'student', 403], [advisor, 'teacher', 403]]) assert.equal((await call(actor, type, 'POST', catalogPath, {})).status, expected);
      const grant = await m.CoopPrerequisiteCatalogGrant.findOne({ where: { department_staff_id: staff[0].id, program: 'IT' } });
      await grant.update({ is_active: false }); assert.equal((await staffCall(0, 'GET', '?program=IT')).status, 403); await grant.update({ is_active: true });
    });
    let added;
    await t.test('Catalog create/edit/order/toggle/duplicate/revision conflict and Student latest active dynamic list', async () => {
      const get = async () => (await staffCall(0, 'GET', '?program=IT')).body.data;
      let list = await get(); const body = { program: 'IT', course_code: '999000001', course_name: 'Fixture Extra', english_name: 'Extra', display_order: 8, is_active: true, expected_catalog_revision: list.revision };
      let r = await staffCall(0, 'POST', '', body); assert.equal(r.status, 200); added = r.body.data.course;
      assert.equal((await catalog(4)).courses.length, 6); assert.equal((await catalog(5)).courses.length, 5);
      list = await get(); assert.equal((await staffCall(0, 'POST', '', { ...body, expected_catalog_revision: list.revision })).status, 409);
      const edit = { program: 'IT', version: added.version, course_name: 'Fixture Edited', display_order: 0, expected_catalog_revision: list.revision };
      const competing = await Promise.all([staffCall(0, 'PATCH', '/' + added.id, edit), staffCall(0, 'PATCH', '/' + added.id, edit)]);
      assert.deepEqual(competing.map(r => r.status).sort(), [200, 409]); added = competing.find(r => r.status === 200).body.data.course;
      assert.equal((await get()).courses.find(c => c.id === added.id).course_name, 'Fixture Edited');
      const newRequest = await studentCall(4, 'POST', '', await payload(4)); assert.equal(newRequest.status, 201); assert.equal(newRequest.body.data.prerequisite_courses.length, 6);
      const snapshotBefore = await rows('SELECT * FROM coop_request_prerequisite_courses WHERE coop_request_id=$1 ORDER BY course_code', [newRequest.body.data.id]);
      for (const active of [false, true, false]) {
        list = await get(); r = await staffCall(0, 'PATCH', '/' + added.id, { program: 'IT', version: added.version, is_active: active, expected_catalog_revision: list.revision }); assert.equal(r.status, 200); added = r.body.data.course;
        assert.equal((await catalog(6)).courses.length, active ? 6 : 5);
      }
      const beforeInstall = await fingerprints(['coop_prerequisite_catalog_courses', 'coop_prerequisite_catalog_programs']);
      assert.equal((await installCatalog(m, { expectedDatabase: database })).seeded, 0); assert.deepEqual(await fingerprints(['coop_prerequisite_catalog_courses', 'coop_prerequisite_catalog_programs']), beforeInstall);
      assert.deepEqual(await rows('SELECT * FROM coop_request_prerequisite_courses WHERE coop_request_id=$1 ORDER BY course_code', [newRequest.body.data.id]), snapshotBefore);
    });
    await t.test('Catalog grade rules, studying submission, Academic append/history and original snapshot remain compatible', async () => {
      const body = await payload(5);
      for (const changes of [{ status: 'passed', grade: 'F' }, { status: 'studying', grade: 'A' }, { status: 'failed', grade: 'B' }]) {
        const invalid = structuredClone(body); Object.assign(invalid.prerequisite_courses[0], changes); assert.equal((await studentCall(5, 'POST', '', invalid)).status, 400);
      }
      body.prerequisite_courses[0] = { ...body.prerequisite_courses[0], status: 'failed', grade: 'F' };
      let r = await studentCall(5, 'POST', '', body); assert.equal(r.status, 201); const request = r.body.data;
      const course = request.prerequisite_courses.find(c => c.status === 'studying'), before = await fingerprints(['coop_request_prerequisite_courses']);
      r = await studentCall(5, 'PATCH', '/' + request.id + '/academic-courses/' + course.course_code, { status: 'passed', grade: 'D+', expected_revision: 0, expected_request_status: 'advisor_review', operation_id: randomUUID() });
      assert.equal(r.status, 200); assert.equal(r.body.data.academic.history.length, 1); assert.equal(r.body.data.academic.verification.can_verify, false);
      await installCatalog(m, { expectedDatabase: database });
      const read = await studentCall(5, 'GET', '/' + request.id); assert.equal(read.body.data.academic.history[0].new_grade, 'D+');
      assert.deepEqual(await fingerprints(['coop_request_prerequisite_courses']), before);
    });
    await t.test('Advisor changes during workflow retain existing live scope (separate A08 policy observation)', async () => {
      const r = await studentCall(7, 'POST', '', await payload(7)); assert.equal(r.status, 201);
      assert.equal((await call(advisor, 'teacher', 'POST', '/api/teachers/coop-requests/' + r.body.data.id + '/approve', {})).status, 200);
      await other.update({ department: 'Other Fixture Department' });
      const nextHead = await teacher('TransferHead', { department: 'Other Fixture Department', is_department_head: true });
      await students[7].update({ advisor_teacher_id: other.id });
      assert.equal((await call(advisor, 'teacher', 'GET', '/api/teachers/coop-requests/' + r.body.data.id)).status, 403);
      assert.equal((await call(other, 'teacher', 'GET', '/api/teachers/coop-requests/' + r.body.data.id)).status, 200);
      assert.equal((await call(head, 'teacher', 'POST', '/api/department-head/coop-requests/' + r.body.data.id + '/approve', {})).status, 403);
      assert.equal((await call(nextHead, 'teacher', 'POST', '/api/department-head/coop-requests/' + r.body.data.id + '/approve', {})).status, 200);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await db.close();
  }
});
