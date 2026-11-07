// Focused opt-in integration. Run only in a disposable, network-isolated PG16
// container with an empty fitm_catalog_test_* database. Never loads a .env file.
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const enabled = process.env.FITM_CATALOG_POSTGRES_TESTS === '1';

test('Catalog installer / PostgreSQL / live JWT Staff RBAC / request snapshots', { skip: !enabled, timeout: 120000 }, async t => {
  const database = process.env.FITM_CATALOG_TEST_DATABASE;
  assert.equal(process.env.NODE_ENV, 'test');
  assert.match(database || '', /^fitm_catalog_test_[a-z0-9_]+$/);
  assert.equal(process.env.DB_NAME, database);
  assert.equal(process.env.DB_HOST, '127.0.0.1');
  assert.equal(process.env.DB_PORT, '5432');
  // Disable dotenv discovery before loading the actual application registry.
  process.env.DOTENV_CONFIG_QUIET = 'true';
  const dotenv = require('dotenv');
  dotenv.config = options => dotenv.configDotenv({ ...options, path: '/nonexistent/fitm-catalog-test.env' });
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  const m = require('../src/models'), db = m.sequelize, qi = db.getQueryInterface();
  const { installCatalog, CHECKS, SNAPSHOT_CHECK } = require('../src/db/coopPrerequisiteCatalog');
  const { CATALOG, GRADE_OPTIONS, normalizeNewCourseGrade } = require('../src/services/coopPrerequisites');
  const { TABLES, createCatalogService } = require('../src/services/coopPrerequisiteCatalog.service');
  const service = createCatalogService(m);
  const sql = (query, bind) => db.query(query, { bind });
  const rows = async (query, bind) => (await sql(query, bind))[0];
  const fingerprint = async () => {
    const schema = await rows("SELECT c.relname,pg_get_constraintdef(k.oid) definition,k.conname,k.convalidated FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname");
    const tables = await rows("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    const indexes = await rows("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname");
    const columns = await rows("SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,character_maximum_length FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");
    const data = {};
    for (const table of [...TABLES, 'coop_request_prerequisite_courses']) {
      if (tables.some(row => row.tablename === table)) data[table] = await rows('SELECT * FROM public.' + table + ' ORDER BY 1');
    }
    return createHash('sha256').update(JSON.stringify({ schema, tables, indexes, columns, data })).digest('hex');
  };
  const snapshot = async () => rows('SELECT * FROM coop_request_prerequisite_courses ORDER BY id');
  const install = () => installCatalog(m, { expectedDatabase: database });
  let server;
  try {
    const [identity] = await rows("SELECT current_database() db,current_schema() schema,current_setting('server_version_num')::int version,host(inet_server_addr()) host,inet_server_port() port");
    assert.equal(identity.db, database); assert.notEqual(identity.db, 'intern_system');
    assert.equal(identity.schema, 'public'); assert.equal(Math.floor(identity.version / 10000), 16);
    assert.equal(identity.host, '127.0.0.1'); assert.equal(identity.port, 5432);
    assert.equal((await rows("SELECT tablename FROM pg_tables WHERE schemaname='public'")).length, 0, 'Requires a fresh disposable test database');
    console.log('ISOLATION ' + JSON.stringify({ ...identity, environment: process.env.NODE_ENV }));

    // Only prerequisites needed by these routes. Unrelated Company/Job workflows
    // use UUID-only FK anchors; their business APIs are outside this suite.
    await sql('CREATE TABLE companies (id uuid PRIMARY KEY); CREATE TABLE job_postings (id uuid PRIMARY KEY)');
    const create = async name => {
      const model = m[name];
      const attributes = Object.fromEntries(Object.entries(model.rawAttributes).filter(([, value]) => value.type.key !== 'VIRTUAL'));
      await qi.createTable(model.tableName, attributes);
      for (const index of model.options.indexes) await qi.addIndex(model.tableName, index.fields, index);
    };
    for (const name of ['Teacher', 'DepartmentStaff', 'Student', 'CoopRequest', 'CoopRequestReview', 'CoopRequestDeliveryMethod', 'AdminAccountControl']) await create(name);

    await t.test('installer failure after creating tables rolls back all DDL and seeds', async () => {
      const before = await fingerprint();
      await assert.rejects(install(), error => error.original?.code === '42P01'); // required snapshot table intentionally absent
      assert.equal(await fingerprint(), before);
    });
    await create('CoopRequestPrerequisiteCourse');
    const legacyRule = "CHECK ((program='IT' AND course_code IN (" + CATALOG.IT.map(row => "'" + row[0] + "'").join(',') + ")) OR (program='INE' AND course_code IN (" + CATALOG.INE.map(row => "'" + row[0] + "'").join(',') + ')))';
    await sql('ALTER TABLE coop_request_prerequisite_courses ADD CONSTRAINT coop_prerequisites_program_code_check ' + legacyRule);
    const gradeRule = require('../src/db/postgresIntegrity').constraints.find(row => row.name === 'coop_prerequisites_status_grade_check');
    await sql('ALTER TABLE coop_request_prerequisite_courses ADD CONSTRAINT ' + gradeRule.name + ' ' + gradeRule.definition);

    const teacher = await m.Teacher.create({ first_name: 'Fixture', last_name: 'Teacher', status: 'active', department: 'Fixture Catalog' });
    const students = [];
    for (const [index, program] of ['IT', 'INE', 'IT'].entries()) {
      students.push(await m.Student.create({ student_id: '999000000000' + index, email: 'catalog' + index + '@email.kmutnb.ac.th',
        first_name: 'Fixture', last_name: 'Student', track: 'co_op', status: 'searching', major: program,
        advisor_teacher_id: teacher.id, password: randomBytes(18).toString('base64url') }));
    }
    const requestFields = { company_name: 'Fixture Company', company_province: 'กรุงเทพมหานคร', company_address: 'Fixture address',
      letter_recipient_name: 'Fixture Recipient', work_start_date: '2027-01-01', work_end_date: '2027-05-01', delivery_methods: ['email'] };
    const legacyRequest = await m.CoopRequest.create({ ...requestFields, student_id: students[0].id, status: 'cancelled' });
    for (const grade of ['F', 'legacy 2.5']) await qi.bulkInsert('coop_request_prerequisite_courses', [{ id: randomUUID(), coop_request_id: legacyRequest.id,
      program: 'IT', course_code: CATALOG.IT[grade === 'F' ? 0 : 1][0], course_name: 'Legacy snapshot', english_name: null,
      status: 'passed', grade, created_at: new Date(), updated_at: new Date() }]);
    const legacyBefore = await snapshot();

    await t.test('seed failure rolls back Catalog DDL and replacement snapshot CHECK without touching legacy rows', async () => {
      const before = await fingerprint();
      m.CoopPrerequisiteCatalogCourse.addHook('beforeBulkCreate', 'fixtureFailure', () => { throw Error('Injected seed failure'); });
      try { await assert.rejects(install(), /Injected seed failure/); }
      finally { m.CoopPrerequisiteCatalogCourse.removeHook('beforeBulkCreate', 'fixtureFailure'); }
      assert.equal(await fingerprint(), before); assert.deepEqual(await snapshot(), legacyBefore);
    });
    await t.test('first installation creates all 3 tables, seeds 10 courses and preserves legacy snapshots', async () => {
      assert.deepEqual(await install(), { database, installed: true, seeded: 10, grantsAdded: 0, existingSnapshotsUpdated: 0 });
      assert.equal(await m.CoopPrerequisiteCatalogProgram.count(), 2); assert.equal(await m.CoopPrerequisiteCatalogCourse.count(), 10);
      assert.equal(await m.CoopPrerequisiteCatalogGrant.count(), 0); assert.deepEqual(await snapshot(), legacyBefore);
      assert.equal((await rows("SELECT conname FROM pg_constraint WHERE conname='coop_prerequisites_program_code_check'")).length, 0);
    });
    await t.test('rerun is idempotent, with no changes to rows, revisions, timestamps or snapshots', async () => {
      const before = await fingerprint(); assert.equal((await install()).seeded, 0); assert.equal(await fingerprint(), before);
    });
    await t.test('unsafe target/environment/name/host/port are rejected before any transaction', async () => {
      let connections = 0;
      const reject = async (config = {}, env = {}, expectedDatabase = database) => {
        const fake = { ...db.config, ...config };
        await assert.rejects(installCatalog({ sequelize: { config: fake, getDialect: () => 'postgres', transaction: () => { connections++; throw Error('Must not connect'); } } },
          { expectedDatabase, env: { NODE_ENV: 'test', FITM_CATALOG_POSTGRES_TESTS: '1', FITM_CATALOG_TEST_DATABASE: database, ...env } }), /Explicit local/);
      };
      await reject({ database: 'intern_system' }, { FITM_CATALOG_TEST_DATABASE: 'intern_system' }, 'intern_system');
      await reject({}, { NODE_ENV: 'production' }); await reject({}, { FITM_CATALOG_POSTGRES_TESTS: '0' });
      await reject({}, { FITM_CATALOG_TEST_DATABASE: 'fitm_catalog_test_other' }); await reject({}, {}, 'fitm_catalog_test_other');
      await reject({ host: 'production.example' }); await reject({ port: 5433 }); assert.equal(connections, 0);
    });

    // Committed corruptions are visible to the independent installer transaction;
    // each is restored explicitly in this disposable database, without sync/reset.
    const drift = async (mutate, restore, message) => {
      await sql(mutate);
      try { const before = await fingerprint(); await assert.rejects(install(), message); assert.equal(await fingerprint(), before); }
      finally { await sql(restore); }
    };
    await t.test('column/type/nullability/FK/unique/CHECK/PK drift are rejected and rolled back', async () => {
      const table = 'coop_prerequisite_catalog_courses';
      await drift('ALTER TABLE ' + table + ' ADD COLUMN unexpected integer', 'ALTER TABLE ' + table + ' DROP COLUMN unexpected', /columns/);
      await drift('ALTER TABLE ' + table + ' ALTER COLUMN course_name TYPE varchar(256)', 'ALTER TABLE ' + table + ' ALTER COLUMN course_name TYPE varchar(255)', /type\/nullability/);
      await drift('ALTER TABLE ' + table + ' ALTER COLUMN course_name DROP NOT NULL', 'ALTER TABLE ' + table + ' ALTER COLUMN course_name SET NOT NULL', /type\/nullability/);
      await drift('ALTER TABLE ' + table + ' DROP CONSTRAINT coop_prerequisite_catalog_courses_updated_by_fkey',
        'ALTER TABLE ' + table + ' ADD CONSTRAINT coop_prerequisite_catalog_courses_updated_by_fkey FOREIGN KEY(updated_by) REFERENCES department_staffs(id) ON DELETE RESTRICT ON UPDATE CASCADE', /foreign key/);
      await drift('DROP INDEX coop_catalog_program_code_unique; CREATE INDEX coop_catalog_program_code_unique ON ' + table + '(program,course_code)',
        'DROP INDEX coop_catalog_program_code_unique; CREATE UNIQUE INDEX coop_catalog_program_code_unique ON ' + table + '(program,course_code)', /index drift/);
      await drift('DROP INDEX coop_catalog_program_code_unique; CREATE UNIQUE INDEX coop_catalog_program_code_unique ON ' + table + '(program,course_code) WHERE is_active',
        'DROP INDEX coop_catalog_program_code_unique; CREATE UNIQUE INDEX coop_catalog_program_code_unique ON ' + table + '(program,course_code)', /index drift/);
      await drift('ALTER TABLE ' + table + ' DROP CONSTRAINT coop_catalog_course_values_check; ALTER TABLE ' + table + ' ADD CONSTRAINT coop_catalog_course_values_check CHECK(version>0)',
        'ALTER TABLE ' + table + ' DROP CONSTRAINT coop_catalog_course_values_check; ALTER TABLE ' + table + ' ADD CONSTRAINT coop_catalog_course_values_check ' + CHECKS[1][2], /CHECK definition drift/);
      await drift('ALTER TABLE ' + table + ' DROP CONSTRAINT coop_prerequisite_catalog_courses_pkey',
        'ALTER TABLE ' + table + ' ADD CONSTRAINT coop_prerequisite_catalog_courses_pkey PRIMARY KEY(id)', /primary key drift/);
    });
    await t.test('matching NOT VALID CHECKs are validated, without leftover probe constraints', async () => {
      for (const [table, name, rule] of [...CHECKS, ['coop_request_prerequisite_courses', 'coop_prerequisites_program_code_format_check', SNAPSHOT_CHECK]]) {
        await sql('ALTER TABLE ' + table + ' DROP CONSTRAINT ' + name + '; ALTER TABLE ' + table + ' ADD CONSTRAINT ' + name + ' ' + rule + ' NOT VALID');
      }
      await install();
      const checks = await rows("SELECT conname,convalidated FROM pg_constraint WHERE conname LIKE 'coop_catalog_%' OR conname='coop_prerequisites_program_code_format_check'");
      assert.equal(checks.length, 4);
      assert.ok(checks.every(row => row.convalidated)); assert.ok(checks.every(row => !row.conname.startsWith('coop_catalog_verify_')));
    });
    await t.test('partial Catalog and snapshot CHECK drift fail closed with no partial repairs', async () => {
      await drift('ALTER TABLE coop_prerequisite_catalog_grants RENAME TO fixture_hidden_grants',
        'ALTER TABLE fixture_hidden_grants RENAME TO coop_prerequisite_catalog_grants', /Partial Catalog schema/);
      await drift('ALTER TABLE coop_request_prerequisite_courses DROP CONSTRAINT coop_prerequisites_program_code_format_check; ALTER TABLE coop_request_prerequisite_courses ADD CONSTRAINT coop_prerequisites_program_code_format_check CHECK(program IN (\'IT\',\'INE\'))',
        'ALTER TABLE coop_request_prerequisite_courses DROP CONSTRAINT coop_prerequisites_program_code_format_check; ALTER TABLE coop_request_prerequisite_courses ADD CONSTRAINT coop_prerequisites_program_code_format_check ' + SNAPSHOT_CHECK, /CHECK definition drift/);
    });

    const staff = {};
    for (const key of ['it', 'ine', 'both', 'none', 'inactive', 'revoked']) staff[key] = await m.DepartmentStaff.create({
      first_name: 'Fixture', last_name: key, email: key + '@catalog.example.test', password: randomBytes(18).toString('base64url'),
      is_active: key !== 'inactive', department: key === 'none' ? 'IT' : 'unrelated department' });
    const grant = (key, program, is_active = true) => m.CoopPrerequisiteCatalogGrant.create({ department_staff_id: staff[key].id,
      program, permission: 'coop_prerequisite_catalog.manage', is_active });
    for (const [key, programs] of Object.entries({ it: ['IT'], ine: ['INE'], both: ['IT', 'INE'], inactive: ['IT'], revoked: ['IT'] })) {
      for (const program of programs) await grant(key, program, key !== 'revoked');
    }
    const express = require('express'), jwt = require('jsonwebtoken'), app = express(); app.use(express.json());
    // Actual mounted production routers, signature verification and live DB auth.
    app.use('/api/staff', require('../src/routes/roleWorkflow.routes').createRoleWorkflowRouter('department_staff', m));
    app.use('/api/coop-requests', require('../src/routes/coopRequest.routes'));
    server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    const base = 'http://127.0.0.1:' + server.address().port;
    const token = (actor, type) => jwt.sign({ id: actor.id, actor_type: type, role: type,
      ...(type === 'department_staff' ? { staff_id: actor.id } : type === 'student' ? { student_id: actor.student_id } : { teacher_id: actor.id }) }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const call = async (actor, type, method, path, body) => {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: 'Bearer ' + token(actor, type) } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const result = await response.json(); return { status: response.status, body: result, cache: response.headers.get('cache-control') };
    };
    const prefix = '/api/staff/coop-prerequisite-catalog';
    const api = (key, method, path = '', body) => call(staff[key], 'department_staff', method, prefix + path, body);
    const list = async (key, program) => { const response = await api(key, 'GET', '?program=' + program); assert.equal(response.status, 200); return response.body.data; };
    const studentCatalog = async student => {
      const response = await call(student, 'student', 'GET', '/api/coop-requests/prerequisite-catalog?program=INE');
      assert.equal(response.status, 200); assert.equal(response.cache, 'no-store'); return response.body.data;
    };
    const edit = async (key, course, changes = {}) => {
      const state = await list(key, course.program);
      return api(key, 'PATCH', '/' + course.id, { program: course.program, expected_catalog_revision: state.revision, version: course.version, ...changes });
    };
    const integrityFailure = async (query, bind, code) => {
      const before = await fingerprint(); await assert.rejects(sql(query, bind), error => error.original?.code === code); assert.equal(await fingerprint(), before);
    };
    await t.test('database enforces primary keys, foreign keys, unique program/code and grant, and all CHECKs', async () => {
      await integrityFailure("INSERT INTO coop_prerequisite_catalog_programs SELECT * FROM coop_prerequisite_catalog_programs WHERE program='IT'", undefined, '23505');
      await integrityFailure('INSERT INTO coop_prerequisite_catalog_courses SELECT * FROM coop_prerequisite_catalog_courses LIMIT 1', undefined, '23505');
      await integrityFailure('INSERT INTO coop_prerequisite_catalog_grants SELECT * FROM coop_prerequisite_catalog_grants LIMIT 1', undefined, '23505');
      await integrityFailure("UPDATE coop_prerequisite_catalog_courses SET updated_by=$1 WHERE course_code=$2", [randomUUID(), CATALOG.IT[0][0]], '23503');
      await integrityFailure('UPDATE coop_prerequisite_catalog_grants SET department_staff_id=$1 WHERE id=(SELECT id FROM coop_prerequisite_catalog_grants LIMIT 1)', [randomUUID()], '23503');
      await integrityFailure("DELETE FROM coop_prerequisite_catalog_programs WHERE program='IT'", undefined, '23503');
      await integrityFailure("UPDATE coop_prerequisite_catalog_courses SET program='XXX' WHERE course_code=$1", [CATALOG.IT[0][0]], '23514');
      await integrityFailure("UPDATE coop_prerequisite_catalog_courses SET course_code=$1 WHERE course_code=$2", [CATALOG.IT[0][0], CATALOG.IT[1][0]], '23505');
      await integrityFailure("INSERT INTO coop_prerequisite_catalog_grants SELECT $1,department_staff_id,permission,program,is_active,created_at,updated_at FROM coop_prerequisite_catalog_grants LIMIT 1", [randomUUID()], '23505');
      for (const assignment of ["course_code='invalid'", "course_name='   '", 'display_order=-1', 'display_order=10001', 'version=0'])
        await integrityFailure('UPDATE coop_prerequisite_catalog_courses SET ' + assignment + ' WHERE course_code=$1', [CATALOG.IT[0][0]], '23514');
      await integrityFailure("UPDATE coop_prerequisite_catalog_programs SET revision=0 WHERE program='IT'", undefined, '23514');
      await integrityFailure("UPDATE coop_prerequisite_catalog_grants SET permission='other'", undefined, '23514');
    });
    await t.test('live Staff RBAC: IT/INE/both, no grant, inactive/revoked and wrong permission', async () => {
      for (const [key, expected] of Object.entries({ it: ['IT'], ine: ['INE'], both: ['INE', 'IT'], none: [], revoked: [] })) {
        const response = await api(key, 'GET', '/permissions'); assert.equal(response.status, 200);
        assert.equal(response.cache, 'no-store'); assert.deepEqual(response.body.data.programs, expected);
        for (const p of ['IT', 'INE']) assert.equal((await api(key, 'GET', '?program=' + p)).status, expected.includes(p) ? 200 : 403);
      }
      assert.equal((await api('inactive', 'GET', '/permissions')).status, 403);
      await m.CoopPrerequisiteCatalogGrant.update({ is_active: false }, { where: { department_staff_id: staff.it.id } });
      assert.equal((await api('it', 'GET', '?program=IT')).status, 403);
      await m.CoopPrerequisiteCatalogGrant.update({ is_active: true }, { where: { department_staff_id: staff.it.id } });
      await m.DepartmentStaff.update({ is_active: false }, { where: { id: staff.it.id } });
      assert.equal((await api('it', 'GET', '?program=IT')).status, 403);
      await m.DepartmentStaff.update({ is_active: true }, { where: { id: staff.it.id } });
    });
    await t.test('Student/Teacher/anonymous cannot list/create/update; denied writes leave database unchanged', async () => {
      const state = await list('both', 'IT'), course = state.courses[0], before = await fingerprint();
      const body = { program: 'IT', course_code: '999000001', course_name: 'Unauthorized', expected_catalog_revision: state.revision, version: course.version };
      for (const [actor, type, status] of [[students[0], 'student', 403], [teacher, 'teacher', 403], [null, null, 401], [staff.none, 'department_staff', 403], [staff.inactive, 'department_staff', 403], [staff.revoked, 'department_staff', 403]]) {
        for (const [method, suffix] of [['GET', '?program=IT'], ['POST', ''], ['PATCH', '/' + course.id]])
          assert.equal((await call(actor, type, method, prefix + suffix, method === 'GET' ? undefined : body)).status, status);
      }
      assert.equal(await fingerprint(), before);
    });
    await t.test('Catalog create/edit/deactivate/reactivate; Student catalog follows saved major and active rows', async () => {
      let state = await list('it', 'IT');
      const created = await api('it', 'POST', '', { program: 'IT', course_code: '999000001', course_name: 'วิชาทดสอบ', english_name: 'Fixture', display_order: 9, expected_catalog_revision: state.revision });
      assert.equal(created.status, 200); let course = created.body.data.course; assert.equal(course.version, 1);
      const edited = await edit('it', course, { course_name: 'วิชาที่แก้ไข', english_name: 'Edited', display_order: 10 });
      assert.equal(edited.status, 200); course = edited.body.data.course; assert.equal(course.version, 2);
      assert.equal(course.course_name, 'วิชาที่แก้ไข'); assert.equal(course.english_name, 'Edited'); assert.equal(course.display_order, 10);
      const hidden = await edit('it', course, { is_active: false }); assert.equal(hidden.status, 200); course = hidden.body.data.course;
      assert.ok(!(await studentCatalog(students[0])).courses.some(row => row.course_code === course.course_code));
      assert.ok((await list('it', 'IT')).courses.some(row => row.id === course.id && !row.is_active));
      const active = await edit('it', course, { is_active: true }); assert.equal(active.status, 200);
      const itCatalog = await studentCatalog(students[0]), ineCatalog = await studentCatalog(students[1]);
      assert.equal(itCatalog.program, 'IT'); assert.equal(itCatalog.source, 'database'); assert.ok(itCatalog.courses.some(row => row.course_code === course.course_code));
      assert.equal(ineCatalog.program, 'INE'); assert.ok(!ineCatalog.courses.some(row => row.course_code === course.course_code));
    });
    await t.test('duplicate create and edit return 409 without changing revisions or data', async () => {
      const state = await list('it', 'IT'), before = await fingerprint();
      assert.equal((await api('it', 'POST', '', { program: 'IT', course_code: state.courses[0].course_code, course_name: 'Duplicate', expected_catalog_revision: state.revision })).status, 409);
      assert.equal((await edit('it', state.courses[1], { course_code: state.courses[0].course_code })).status, 409);
      assert.equal(await fingerprint(), before);
    });
    await t.test('cross-program reads/creates/edits/moves denied; dual grant can edit and move both directions', async () => {
      const it = await list('both', 'IT'), ine = await list('both', 'INE'), before = await fingerprint();
      for (const [key, source, target] of [['it', ine, 'INE'], ['ine', it, 'IT']]) {
        assert.equal((await api(key, 'POST', '', { program: target, course_code: '999000002', course_name: 'Forbidden', expected_catalog_revision: source.revision })).status, 403);
        assert.equal((await api(key, 'PATCH', '/' + source.courses[0].id, { program: target, course_name: 'Forbidden', version: source.courses[0].version, expected_catalog_revision: source.revision })).status, 403);
      }
      for (const [key, source, target] of [['it', it, 'INE'], ['it', ine, 'IT'], ['ine', ine, 'IT'], ['ine', it, 'INE']])
        assert.equal((await api(key, 'PATCH', '/' + source.courses[0].id, { program: target, version: source.courses[0].version, expected_catalog_revision: source.revision })).status, 403);
      assert.equal(await fingerprint(), before);
      for (const p of ['IT', 'INE']) { const state = await list('both', p); assert.equal((await edit('both', state.courses[0], { english_name: 'Dual grant edit' })).status, 200); }
      let course = (await list('both', 'IT')).courses[0];
      const moved = await edit('both', course, { program: 'INE' }); assert.equal(moved.status, 200); assert.deepEqual(Object.keys(moved.body.data.catalog_revisions).sort(), ['INE', 'IT']);
      course = moved.body.data.course; assert.equal((await edit('both', course, { program: 'IT' })).status, 200);
    });
    await t.test('concurrent updates serialize: exactly one commit and one 409, including stale version/revision', async () => {
      const state = await list('it', 'IT'), course = state.courses[0];
      const payload = { program: 'IT', version: course.version, expected_catalog_revision: state.revision };
      const responses = await Promise.all(['Winner A', 'Winner B'].map(course_name => api('it', 'PATCH', '/' + course.id, { ...payload, course_name })));
      assert.deepEqual(responses.map(row => row.status).sort(), [200, 409]);
      const fresh = await list('it', 'IT'); assert.equal(BigInt(fresh.revision), BigInt(state.revision) + 1n);
      const before = await fingerprint();
      assert.equal((await api('it', 'PATCH', '/' + course.id, { ...payload, expected_catalog_revision: fresh.revision })).status, 409);
      const conflict = await api('it', 'PATCH', '/' + course.id, { ...payload, version: course.version + 1 });
      assert.equal(conflict.status, 409); assert.equal(conflict.body.code, 'COOP_PREREQUISITE_CATALOG_CHANGED'); assert.equal(await fingerprint(), before);
    });
    await t.test('invalid input returns 400; unknown course 404; no data changes', async () => {
      const state = await list('it', 'IT'), course = state.courses[0], before = await fingerprint();
      const body = { program: 'IT', course_code: '999000002', course_name: 'Valid', expected_catalog_revision: state.revision };
      for (const changes of [{ program: 'OTHER' }, { course_code: '123' }, { course_code: 123456789 }, { course_name: '   ' }, { course_name: 'x'.repeat(256) },
        { english_name: {} }, { is_active: 'true' }, { display_order: -1 }, { display_order: 10001 }, { display_order: 1.2 }, { expected_catalog_revision: null }, { updated_by: staff.both.id }])
        assert.equal((await api('it', 'POST', '', { ...body, ...changes })).status, 400);
      assert.equal((await api('it', 'PATCH', '/bad-id', { program: 'IT', version: 1, expected_catalog_revision: state.revision })).status, 400);
      assert.equal((await api('it', 'PATCH', '/' + course.id, { program: 'IT', expected_catalog_revision: state.revision })).status, 400);
      assert.equal((await api('it', 'PATCH', '/' + randomUUID(), { program: 'IT', version: 1, expected_catalog_revision: state.revision })).status, 404);
      assert.equal(await fingerprint(), before);
    });
    await t.test('installer rerun preserves Staff-edited/deactivated Catalog, grants and legacy snapshots', async () => {
      const course = (await list('it', 'IT')).courses[0]; assert.equal((await edit('it', course, { is_active: false })).status, 200);
      const before = await fingerprint(); assert.equal((await install()).seeded, 0); assert.equal(await fingerprint(), before);
      assert.deepEqual(await snapshot(), legacyBefore);
    });
    await t.test('new grades A/B+/B/C+/C/D+/D accepted; F+passed and malformed grades rejected at validator, model and HTTP', async () => {
      assert.deepEqual(GRADE_OPTIONS, ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F']);
      const catalog = await studentCatalog(students[2]);
      assert.deepEqual(catalog.grade_options, GRADE_OPTIONS);
      for (const grade of GRADE_OPTIONS.slice(0, -1)) {
        assert.equal(normalizeNewCourseGrade('passed', grade), grade);
        const row = await m.CoopRequestPrerequisiteCourse.create({ coop_request_id: legacyRequest.id, program: 'IT', course_code: '88800000' + GRADE_OPTIONS.indexOf(grade), course_name: 'Grade fixture', status: 'passed', grade });
        assert.equal((await m.CoopRequestPrerequisiteCourse.findByPk(row.id)).grade, grade);
      }
      for (const grade of ['F', 'E', 'a', 'B-', '2.5', '', null, 4]) {
        assert.throws(() => normalizeNewCourseGrade('passed', grade));
        await assert.rejects(m.CoopRequestPrerequisiteCourse.build({ coop_request_id: legacyRequest.id, program: 'IT', course_code: '888999999', course_name: 'Rejected', status: 'passed', grade }).validate());
        const response = await call(students[2], 'student', 'POST', '/api/coop-requests', { ...requestFields, prerequisite_catalog_revision: catalog.revision,
          prerequisite_courses: catalog.courses.map((row, i) => ({ course_code: row.course_code, status: 'passed', grade: i === 0 ? grade : 'A' })) });
        assert.equal(response.status, 400);
      }
      for (const status of ['studying', 'unselected']) {
        assert.equal(normalizeNewCourseGrade(status, null), null); assert.throws(() => normalizeNewCourseGrade(status, 'A')); assert.throws(() => normalizeNewCourseGrade(status, 'F'));
      }
    });
    await t.test('actual request POST snapshots server names/grades; Catalog edit/deactivation and installer never rewrite old snapshots', async () => {
      const student = students[2], catalog = await studentCatalog(student);
      const payload = { ...requestFields, prerequisite_catalog_revision: catalog.revision,
        prerequisite_courses: catalog.courses.map(row => ({ course_code: row.course_code, status: 'passed', grade: 'A' })) };
      const response = await call(student, 'student', 'POST', '/api/coop-requests', payload);
      assert.equal(response.status, 201); const requestId = response.body.data.id;
      const saved = await snapshot();
      const ownRows = saved.filter(row => row.coop_request_id === requestId);
      assert.equal(ownRows.length, catalog.courses.length);
      for (const row of ownRows) assert.equal(row.course_name, catalog.courses.find(item => item.course_code === row.course_code).course_name);
      const state = await list('it', 'IT'), course = state.courses.find(row => row.course_code === ownRows[0].course_code);
      assert.equal((await edit('it', course, { course_name: 'Changed after submit', course_code: '999999998', is_active: false })).status, 200);
      await install(); assert.deepEqual(await snapshot(), saved);
      const stale = await call(students[0], 'student', 'POST', '/api/coop-requests', payload);
      assert.equal(stale.status, 409); assert.equal(stale.body.code, 'COOP_PREREQUISITE_CATALOG_CHANGED');
      assert.deepEqual((await snapshot()).filter(row => row.coop_request_id === legacyRequest.id && ['F', 'legacy 2.5'].includes(row.grade)), legacyBefore);
    });
    console.log('Catalog integration completed; fixture data remains only in disposable ' + database);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await db.close();
  }
});
