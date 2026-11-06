const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const jobPolicy = require('../src/services/jobEligibility');
const { randomUUID, randomBytes, createHash } = require('node:crypto');

// Load actual application modules with explicit model/config substitutes. Never load .env or a DB pool.
function isolated(file, dependencies = {}, globals = {}) {
  const filename = path.resolve(__dirname, '../src', file);
  const module = { exports: {} };
  const sandbox = { module, exports: module.exports, Buffer, Date, process: { env: {} }, console,
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name.startsWith('node:') || ['crypto', 'sequelize', 'jsonwebtoken'].includes(name)) return require(name);
      throw new Error(`Undeclared isolated dependency: ${name}`);
    }, ...globals };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  return module.exports;
}
const authDependencies = {
  './teacherAuth.service': {}, './staffAuth.service': {}, './superAdminAuth.service': {},
  './adminAccountAccess.service': {}, './teacherAdminGrant.service': {},
};
function response() {
  return { code: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

function authHarness() {
  const env = { JWT_SECRET: randomBytes(32).toString('hex'), NODE_ENV: 'development' };
  const globals = { process: { env } };
  const teacher = isolated('services/teacherAuth.service.js', {}, globals);
  const staff = isolated('services/staffAuth.service.js', {}, globals);
  const auth = isolated('services/unifiedAuth.service.js', { ...authDependencies,
    './teacherAuth.service': teacher, './staffAuth.service': staff,
    './superAdminAuth.service': { adminReady: async () => false },
    './adminAccountAccess.service': { assertAccountAccess: async () => {} },
    './teacherAdminGrant.service': { membershipReady: async () => false },
  }, globals);
  return { auth, teacher, staff, globals, env };
}

test('Co-op Only: actual Unified and Legacy controllers preserve Co-op contracts and reject internship before signing', async () => {
  for (const track of ['co_op', 'internship']) {
    const h = authHarness(), student = { id: randomUUID(), student_id: 'fixture', email: 'student@example.invalid', track,
      status: 'searching', password_hash: 'synthetic', comparePassword: async value => value === 'synthetic-password' };
    let comparisons = 0;
    const models = { Student: { findAll: async () => { comparisons++; return [student]; }, findOne: async () => student },
      Teacher: { findAll: async () => { comparisons++; return []; } }, DepartmentStaff: { findAll: async () => { comparisons++; return []; } } };
    const service = h.auth.createUnifiedAuthService({ models });
    const unified = isolated('controllers/unifiedAuth.controller.js', { '../services/unifiedAuth.service': h.auth });
    const legacy = isolated('controllers/auth.controller.js', { '../models': models, '../services/unifiedAuth.service': h.auth,
      '../services/studentIdentity': require('../src/services/studentIdentity'),
      '../validators/personName.validator': require('../src/validators/personName.validator'),
    }, h.globals);
    for (const handler of [unified.createUnifiedLoginHandler({ service }), legacy.loginStudent]) {
      const res = response(); await handler({ body: { email: student.email, password: 'synthetic-password' } }, res);
      assert.equal(res.code, track === 'co_op' ? 200 : 403);
      if (track === 'co_op') {
        const claims = jwt.verify(res.body.token, h.env.JWT_SECRET); assert.equal(claims.track, 'co_op');
        assert.equal(claims.actor_type, 'student'); assert.equal(res.body.data.id, student.id);
      } else { assert.equal(res.body.code, 'ACCOUNT_UNAUTHORIZED'); assert.equal(res.body.token, undefined); }
    }
    assert.equal(comparisons, 3, 'Unified must examine every account store before eligibility');
    const wrong = response(); await legacy.loginStudent({ body: { email: student.email, password: 'wrong' } }, wrong); assert.equal(wrong.code, 401);
    models.Teacher.findAll = async () => [{ id: randomUUID(), status: 'active', password_hash: 'synthetic', comparePassword: async () => true }];
    const ambiguous = response(); await unified.createUnifiedLoginHandler({ service })({ body: { email: student.email, password: 'synthetic-password' } }, ambiguous);
    assert.equal(ambiguous.code, 409); assert.equal(ambiguous.body.code, 'AUTH_CONTEXT_AMBIGUOUS'); assert.equal(ambiguous.body.token, undefined);
  }
});

test('Co-op Only: actual Registration creates co_op and rejects client track without writes', async () => {
  const h = authHarness(), creates = [], transaction = {};
  const models = { Student: { findOne: async () => null, create: async (values, options) => {
    assert.equal(options.transaction, transaction); creates.push(values); return { id: randomUUID(), ...values };
  } }, sequelize: { transaction: async action => action(transaction) } };
  const controller = isolated('controllers/auth.controller.js', { '../models': models, '../services/unifiedAuth.service': h.auth,
    '../services/studentIdentity': require('../src/services/studentIdentity'),
    '../validators/personName.validator': require('../src/validators/personName.validator'),
  }, h.globals);
  const body = { first_name: 'ทดสอบ', last_name: 'ระบบ', email: 's0000000000001@email.kmutnb.ac.th', password: 'synthetic-password' };
  const accepted = response(); await controller.registerStudent({ body }, accepted);
  assert.equal(accepted.code, 201); assert.equal(creates.length, 1); assert.equal(creates[0].track, 'co_op');
  assert.equal(jwt.verify(accepted.body.token, h.env.JWT_SECRET).track, 'co_op');
  for (const track of ['internship', 'co_op']) { const res = response(); await controller.registerStudent({ body: { ...body, track } }, res); assert.equal(res.code, 400); }
  assert.equal(creates.length, 1);
});

function googleFixture({ track = 'co_op', mapped = true, ambiguous = false, onboarding = true, enabled = true, role = 'student' } = {}) {
  const h = authHarness(), id = randomUUID(), requests = new Map(), creates = [], profiles = [];
  let claims = { sub: 'synthetic-google-subject', email: 's0000000000001@email.kmutnb.ac.th', email_verified: true, hd: 'kmutnb.ac.th', given_name: 'Fixture', family_name: 'Student' };
  const actor = { id, student_id: '0000000000001', email: claims.email, track, status: 'searching', is_active: true, is_department_head: role === 'department_head', department: 'Fixture' };
  if (role !== 'student') actor.status = 'active';
  const type = role === 'department_head' ? 'teacher' : role;
  const field = { student: 'student_id', teacher: 'teacher_id', department_staff: 'staff_id' }[type];
  const mappings = mapped ? [{ subject: claims.sub, actor_type: type, [field]: id }] : [];
  if (ambiguous) mappings.push({ subject: claims.sub, actor_type: 'teacher', teacher_id: randomUUID() });
  const models = {
    Student: { findByPk: async () => actor, findOne: async () => mapped ? actor : null, findAll: async () => [],
      create: async (values, options) => { assert.equal(options.googleOnlyCreation, true); creates.push(values); return { id, ...values }; } },
    Teacher: { findByPk: async () => actor, findOne: async () => null, findAll: async () => [] },
    DepartmentStaff: { findByPk: async () => actor, findOne: async () => null, findAll: async () => [] },
    StudentProfile: { create: async values => profiles.push(values) },
    GoogleIdentity: { findAll: async () => mappings, findOne: async options => mappings.find(row => Object.entries(options.where).every(([key, value]) => row[key] === value)),
      create: async values => mappings.push(values) },
    GoogleAuthRequest: { destroy: async () => {}, create: async values => requests.set(values.id, { ...values }),
      update: async (values, options) => {
        const row = requests.get(options.where.id);
        if (!row || row.consumed_at || new Date(row.expires_at) <= new Date()
          || ['secret_hash', 'nonce_hash', 'role', 'purpose'].some(key => row[key] !== options.where[key])) return [0];
        Object.assign(row, values); return [1];
      } },
    sequelize: { query: async () => [{ ready: true }], transaction: async action => {
      const before = [...requests].map(([key, value]) => [key, { ...value }]);
      try { return await action({ LOCK: { UPDATE: 'UPDATE' } }); }
      catch (error) { requests.clear(); before.forEach(([key, value]) => requests.set(key, value)); throw error; }
    } },
  };
  const policy = isolated('config/oauth.js', { './allowedOrigins': {} });
  const allowedDomains = new Set(['email.kmutnb.ac.th']);
  const cfg = { enabled, onboardingEnabled: onboarding, linkingEnabled: false, clientId: 'synthetic-client', allowedDomains,
    roleDomains: Object.fromEntries(policy.ROLES.map(key => [key, allowedDomains])), hostedDomains: new Set(['kmutnb.ac.th']), policy: 'required' };
  const module = isolated('services/googleAuth.service.js', {
    '../config/oauth': policy, './googleToken.service': {}, '../db/initialize': { requireDevelopment: value => assert.equal(value, models.sequelize) },
    './teacherAuth.service': h.teacher, './staffAuth.service': h.staff, './unifiedAuth.service': h.auth,
    './studentIdentity': require('../src/services/studentIdentity'),
  }, h.globals);
  const service = module.createGoogleAuthService({ models, config: () => cfg, verify: async () => claims });
  const input = async (selected = 'auto') => {
    const challenge = await service.challenge({ role: selected, purpose: 'login' }); claims.nonce = challenge.nonce;
    return { ...challenge, role: selected, purpose: 'login', credential: 'synthetic-provider-credential' };
  };
  return { ...h, service, input, claims, creates, profiles, mappings };
}

test('Co-op Only: Google auto/legacy mapped Login use live eligibility and keep subject ambiguity', async () => {
  for (const selected of ['auto', 'student']) for (const track of ['co_op', 'internship']) {
    const f = googleFixture({ track }), input = await f.input(selected);
    if (track === 'internship') await assert.rejects(f.service.authenticate(input), error => error.status === 403 && error.code === 'ACCOUNT_UNAUTHORIZED');
    else { const session = await f.service.authenticate(input); assert.equal(session.redirect, '/src/student_coop/student_coop.html'); assert.equal(jwt.verify(session.token, f.env.JWT_SECRET).track, 'co_op'); }
    assert.equal(f.creates.length, 0); assert.equal(f.mappings.length, 1);
  }
  const f = googleFixture({ track: 'internship', ambiguous: true });
  await assert.rejects(f.service.authenticate(await f.input()), error => error.status === 409 && error.code === 'AUTH_CONTEXT_AMBIGUOUS');
});

test('Co-op Only: Google onboarding creates only co_op; identity/nonce/replay/disabled policies remain enforced', async () => {
  for (const selected of ['auto', 'student']) {
    const f = googleFixture({ mapped: false }), input = await f.input(selected);
    const session = selected === 'student' ? await f.service.onboard(input) : await f.service.authenticate(input);
    assert.equal(f.creates.length, 1); assert.equal(f.creates[0].track, 'co_op'); assert.equal(f.profiles.length, 1);
    assert.equal(jwt.verify(session.token, f.env.JWT_SECRET).track, 'co_op');
    await assert.rejects(f.service.authenticate(input), error => error.status === 401 && error.code === 'GOOGLE_REQUEST_INVALID');
  }
  for (const patch of [{ email_verified: false }, { email: 'fixture@denied.invalid' }, { hd: 'denied.invalid' }, { nonce: 'wrong' }]) {
    const f = googleFixture(), input = await f.input(); Object.assign(f.claims, patch);
    await assert.rejects(f.service.authenticate(input), error => [401, 403].includes(error.status)); assert.equal(f.creates.length, 0);
  }
  const off = googleFixture({ enabled: false }); await assert.rejects(off.service.challenge({ role: 'auto', purpose: 'login' }), error => error.code === 'GOOGLE_DISABLED');
  const closed = googleFixture({ mapped: false, onboarding: false }); await assert.rejects(closed.service.authenticate(await closed.input()), error => error.code === 'GOOGLE_ONBOARDING_DISABLED');
  assert.equal(closed.creates.length, 0);
});

test('Co-op Only: Teacher/Head/Staff password and Google sessions keep roles and destinations', async () => {
  for (const role of ['teacher', 'department_head', 'department_staff']) {
    const f = googleFixture({ role }), result = await f.service.authenticate(await f.input());
    assert.equal(result.role, role); assert.equal(jwt.verify(result.token, f.env.JWT_SECRET).role, role);
    const h = authHarness(), type = role === 'department_head' ? 'teacher' : role;
    const actor = { id: randomUUID(), email: 'personnel@example.invalid', status: 'active', is_active: true, is_department_head: role === 'department_head', department: 'Fixture', password_hash: 'synthetic', comparePassword: async () => true };
    const models = Object.fromEntries(['Student', 'Teacher', 'DepartmentStaff'].map(key => [key, { findAll: async () => key === (type === 'teacher' ? 'Teacher' : 'DepartmentStaff') ? [actor] : [] }]));
    const session = await h.auth.createUnifiedAuthService({ models }).login({ email: actor.email, password: 'synthetic-password' });
    assert.equal(session.role, role); assert.equal(session.redirect, result.redirect);
  }
  const auth = isolated('services/unifiedAuth.service.js', authDependencies, { process: { env: { NODE_ENV: 'development' } } });
  assert.equal(auth.authorizeActor({ is_active: true }, 'super_admin'), 'super_admin');
});

test('Co-op Only: application sessions reject internship and invalid track/status', () => {
  const auth = isolated('services/unifiedAuth.service.js', { ...authDependencies, jsonwebtoken: { sign: () => 'synthetic-session' } });
  for (const track of ['co_op']) {
    const result = auth.applicationSession({ id: randomUUID(), student_id: 'fixture', track, status: 'searching' }, 'student');
    assert.equal(result.redirect, '/src/student_coop/student_coop.html');
    assert.equal(result.role, 'student'); assert.equal(result.data.track, track);
  }
  for (const track of ['internship', undefined, null, '', 'teacher', 'CO_OP']) {
    assert.throws(() => auth.applicationSession({ track, status: 'searching' }, 'student'), error => error.status === 403);
  }
  assert.throws(() => auth.applicationSession({ track: 'co_op', status: 'disabled' }, 'student'), error => error.status === 403);
});

test('student tracks: live middleware rejects expired/wrong-role sessions and never trusts token track', async () => {
  const auth = isolated('services/unifiedAuth.service.js', authDependencies);
  const secret = randomBytes(32).toString('hex'), id = randomUUID();
  const middleware = isolated('middlewares/auth.middleware.js', {
    '../models': {}, '../services/adminAccountAccess.service': {}, '../services/teacherAdminGrant.service': {},
    '../services/unifiedAuth.service': auth,
    '../validators/roleWorkflow.validator': { uuid(value) { assert.match(value, /^[0-9a-f-]{36}$/); } },
    '../services/staffAuth.service': { DEPARTMENT_STAFF_ACTOR_TYPE: 'department_staff', DEPARTMENT_STAFF_ROLE: 'department_staff' },
  }, { process: { env: { JWT_SECRET: secret } } });
  let track = 'internship', reads = 0;
  const authenticate = middleware.createAuthenticateToken({
    StudentModel: { async findByPk(_, options) { reads++; assert.ok(options.attributes.includes('track')); return { id, student_id: 'fixture', track, status: 'searching' }; } },
    TeacherModel: { async findByPk() { return { id, status: 'active', is_department_head: false, department: 'IT' }; } },
    StaffModel: { async findByPk() { return { id, is_active: true }; } },
    checkAccountAccess: async () => {},
  });
  const claims = { id, student_id: 'fixture', actor_type: 'student', role: 'student', track: 'co_op' };
  const token = body => jwt.sign(body, secret, { algorithm: 'HS256', expiresIn: '5m' });
  for (const expected of ['internship', 'co_op']) {
    track = expected; const req = { headers: { authorization: `Bearer ${token(claims)}` } }, res = response(); let passed = false;
    await authenticate(req, res, () => { passed = true; }); assert.equal(passed, expected === 'co_op');
    if (!passed) { assert.equal(res.code, 403); continue; }
    assert.equal(req.user.track, expected);
    let coop = false; middleware.requireCoopStudent(req, res, () => { coop = true; });
    assert.equal(coop, expected === 'co_op'); if (!coop) assert.equal(res.code, 403);
  }
  for (const body of [{ ...claims, role: 'teacher' }, { ...claims, track: 'co_op', exp: 1 }]) {
    const encoded = body.exp ? jwt.sign(body, secret) : token(body), res = response(); let passed = false;
    await authenticate({ headers: { authorization: `Bearer ${encoded}` } }, res, () => { passed = true; });
    assert.equal(passed, false); assert.ok([401, 403].includes(res.code));
  }
  for (const expected of ['internship', 'co_op']) {
    track = expected; const req = { headers: { authorization: `Bearer ${token({ id, student_id: 'fixture', track: 'co_op' })}` } }, res = response(); let passed = false;
    await authenticate(req, res, () => { passed = true; }); assert.equal(passed, expected === 'co_op');
    if (!passed) assert.equal(res.code, 403);
  }
  const before = reads, res = response(); await authenticate({ headers: { authorization: 'Bearer malformed' } }, res, () => assert.fail('invalid token passed'));
  assert.equal(res.code, 401); assert.equal(reads, before);
  middleware.requireCoopStudent({ user: { id, teacher_id: id, actor_type: 'teacher', role: 'teacher', track: 'co_op' } }, response(), () => assert.fail('teacher passed Student guard'));
  for (const [type, identity] of [['teacher', 'teacher_id'], ['department_staff', 'staff_id']]) {
    const req = { headers: { authorization: `Bearer ${token({ id, [identity]: id, actor_type: type, role: type, track: 'co_op' })}` } }, res = response(); let passed = false;
    await authenticate(req, res, () => { passed = true; }); assert.equal(passed, true);
    middleware.requireCoopStudent(req, res, () => assert.fail('non-Student entered Coop')); assert.equal(res.code, 403);
  }
  track = 'invalid'; const invalid = response(); await authenticate({ headers: { authorization: `Bearer ${token(claims)}` } }, invalid, () => assert.fail('invalid live track passed'));
  assert.equal(invalid.code, 403);
});

test('Co-op Only: actual protected routers reject old internship JWTs before handlers and retain Co-op endpoints', async () => {
  const h = authHarness(), id = randomUUID(); let track = 'co_op', calls = 0;
  const models = { Student: { findByPk: async () => ({ id, student_id: 'fixture', track, status: 'searching' }), findOne: async () => ({ id }) } };
  const middleware = isolated('middlewares/auth.middleware.js', {
    '../models': {}, '../services/unifiedAuth.service': h.auth, '../services/adminAccountAccess.service': {}, '../services/teacherAdminGrant.service': {},
    '../validators/roleWorkflow.validator': require('../src/validators/roleWorkflow.validator'), '../services/staffAuth.service': h.staff,
  }, h.globals);
  const authenticate = middleware.createAuthenticateToken({ StudentModel: models.Student, checkAccountAccess: async () => {} });
  const studentAuth = (req, res, next) => authenticate(req, res, () => middleware.requireStudentActor(req, res, next));
  const auth = { ...middleware, authenticateToken: authenticate, authenticateStudentToken: studentAuth };
  const pass = (req, res, next) => next();
  const handler = (req, res) => { calls++; assert.equal(req.user.id, id); res.json({ success: true, owner: req.user.id }); };
  const controllers = new Proxy({ requireRevision: pass }, { get: (value, key) => value[key] || handler });
  const service = new Proxy({}, { get: () => async owner => { calls++; assert.equal(owner, id); return { owner }; } });
  const upload = { single: () => pass, fields: () => pass };
  const multer = Object.assign(() => upload, { memoryStorage: () => ({}) });
  const rateLimit = Object.assign(() => pass, { rateLimit: () => pass });
  const shared = { express: require('express'), '../middlewares/auth.middleware': auth, '../models': models, multer, 'express-rate-limit': rateLimit,
    '../middlewares/upload.middleware': { createSingleFileUpload: () => upload, profileImageUpload: upload, resumeUpload: upload } };
  const profile = isolated('routes/studentProfile.routes.js', { ...shared, '../controllers/studentProfile.controller': controllers,
    '../controllers/studentProfileAggregate.controller': { ...Object.fromEntries(['getProfile', 'saveAggregate', 'listDocuments', 'downloadDocument', 'patchDocument', 'deleteDocument', 'uploadDocument', 'deleteImage'].map(key => [key, handler])), children: () => handler, requireRevision: pass },
    '../services/studentProfileFiles.service': { DOCUMENT_MIME: {} }, '../controllers/studentProfilePdfImport.controller': controllers });
  const matching = isolated('routes/jobMatching.routes.js', { ...shared, '../controllers/jobMatching.controller': { getMyJobMatches: handler } });
  const mentor = isolated('routes/mentor.routes.js', { ...shared, '../controllers/mentor.controller': controllers });
  const requests = isolated('routes/coopRequest.routes.js', { ...shared, '../controllers/coopRequest.controller': controllers,
    '../controllers/companyResponse.controller': { createStudentCompanyResponseHandler: () => handler } });
  const coop = isolated('routes/studentCoop.routes.js', { ...shared,
    '../services/studentCoopProject.service': { createStudentCoopProjectService: () => service },
    '../services/coopProjectAdvisor.service': { createCoopProjectAdvisorService: () => service }, '../controllers/coopProjectAdvisor.controller': { createCoopProjectAdvisorController: () => controllers },
    '../services/companyEvaluation.service': { createCompanyEvaluationService: () => service }, '../controllers/companyEvaluation.controller': { createCompanyEvaluationController: () => controllers },
  }).createStudentCoopRouter({ models });
  const logs = isolated('routes/internshipLogs.routes.js', { ...shared, '../services/internshipLog.service': { createInternshipLogService: () => service } }).createInternshipLogsRouter({ models, sendEmail: async () => {} });
  const supervision = isolated('routes/supervision.routes.js', { ...shared,
    '../middlewares/teacherAuth.middleware': { createRequireTeacher: () => pass }, '../services/supervision.service': { createSupervisionService: () => service },
    '../services/supervisionResult.service': { createSupervisionResultService: () => service }, '../services/supervisionResultRules': { MAX_IMAGE_SIZE: 1 },
  }).createSupervisionRouter({ models, sendEmail: async () => {} });
  const calendar = isolated('routes/coopActivities.routes.js', { ...shared, '../services/coopActivity.service': { createCoopActivityService: () => ({ list: async () => { calls++; return []; } }) } }).createCoopActivitiesRouter({ models });
  const account = isolated('routes/auth.routes.js', { ...shared, '../controllers/auth.controller': { ...controllers, getCurrentStudent: handler, loginStudent: handler, registerStudent: handler },
    './googleAuth.routes': { createGoogleAuthRouter: () => require('express').Router() }, '../controllers/unifiedAuth.controller': { createUnifiedLoginHandler: () => handler } });
  const cases = [[profile, 'GET', '/aggregate'], [profile, 'GET', '/me'], [profile, 'POST', '/pdf-import/status'], [profile, 'POST', '/resume'],
    [matching, 'POST', '/me'], [mentor, 'GET', '/me'], [requests, 'GET', '/companies/search'], [requests, 'GET', '/me'],
    [coop, 'GET', '/project-advisor-request'], [coop, 'GET', '/project'], [coop, 'GET', '/project-files'], [coop, 'POST', '/poster'], [coop, 'POST', '/project-book'], [coop, 'GET', '/company-evaluation'],
    [logs, 'GET', '/overview'], [supervision, 'GET', '/student'], [calendar, 'GET', '/student'], [account, 'GET', '/me']];
  for (const expected of ['co_op', 'internship']) {
    track = expected;
    for (const [router, method, url] of cases) {
      // Deliberately contradictory JWT metadata: only the live row decides access.
      const token = jwt.sign({ id, student_id: 'fixture', actor_type: 'student', role: 'student', track: expected === 'co_op' ? 'internship' : 'co_op' }, h.env.JWT_SECRET, { expiresIn: '5m' });
      const before = calls;
      const result = await new Promise((resolve, reject) => {
        const res = response(); res.json = function(body) { this.body = body; resolve(this); return this; };
        router.handle({ method, url, headers: { authorization: `Bearer ${token}` }, query: {}, body: {} }, res, error => reject(error || Error(`Unmatched ${method} ${url}`)));
      });
      assert.equal(result.code, expected === 'co_op' ? 200 : 403, `${method} ${url}`);
      assert.equal(calls - before, expected === 'co_op' ? 1 : 0, `${method} ${url} handler boundary`);
    }
  }
});

function mentorFixture(track = 'co_op') {
  const id = randomUUID(), studentId = randomUUID(), digest = value => createHash('sha256').update(value).digest('hex');
  let clock = Date.now(), failCreate = false;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  const profile = { id, student_id: studentId, email: 'mentor@example.invalid', first_name: 'Fixture', last_name: 'Mentor', position: 'Fixture', status: 'pending', verified_at: null };
  const tokens = new Map(), tails = new Map(), delivered = [];
  const original = 'synthetic-original';
  tokens.set('original', { id: 'original', mentor_id: id, token_hash: digest(original), expires_at: new Date(clock + 86400000), used_at: null });
  async function lock(key, tx) {
    assert.ok(tx, 'row writes must have a transaction');
    if (tx.held.has(key)) return;
    const previous = tails.get(key) || Promise.resolve(); let release;
    const next = new Promise(resolve => { release = resolve; }); tails.set(key, previous.then(() => next));
    await previous; tx.held.add(key); tx.releases.push(release);
  }
  function tx() {
    return { LOCK: { UPDATE: 'UPDATE' }, held: new Set(), releases: [], undo: [], finished: false,
      async commit() { this.finished = true; this.releases.splice(0).forEach(fn => fn()); },
      async rollback() { this.undo.reverse().forEach(fn => fn()); this.finished = true; this.releases.splice(0).forEach(fn => fn()); } };
  }
  function row(data, transaction) {
    return { ...data, async update(values, options = {}) {
      const currentTx = options.transaction || transaction; assert.ok(currentTx?.held.has(`mentor:${id}`), 'Mentor must be locked before writes');
      const before = { ...data }; currentTx.undo.push(() => { Object.keys(data).forEach(key => delete data[key]); Object.assign(data, before); });
      Object.assign(data, values); Object.assign(this, values); return this;
    }, async save(options) {
      return this.update(Object.fromEntries(Object.keys(data).map(key => [key, this[key]])), options);
    } };
  }
  const models = {
    Student: { async findByPk(key, options) {
      assert.ok(options.attributes.includes('track'));
      return key === studentId ? { id: studentId, track, status: 'searching' } : null;
    } },
    Mentor: {
      async findByPk(key, options = {}) { if (key !== id) return null; if (options.lock) await lock(`mentor:${id}`, options.transaction); return row(profile, options.transaction); },
      async findOne(options) { if (options.where.student_id !== studentId) return null; return this.findByPk(id, options); },
    },
    MentorToken: {
      async findOne(options) {
        assert.ok(!options.lock || !options.include, 'FOR UPDATE cannot include nullable outer joins');
        let data = [...tokens.values()].find(record => Object.entries(options.where).every(([key, value]) => record[key] === value));
        if (!data) return null;
        if (options.lock) { assert.ok(options.transaction.held.has(`mentor:${id}`)); await lock(`token:${data.id}`, options.transaction); data = tokens.get(data.id); }
        const result = row(data, options.transaction);
        if (options.include) result.mentor = { ...profile, student: { first_name: 'Fixture', last_name: 'Student' } };
        return result;
      },
      async update(values, options) {
        assert.ok(options.transaction.held.has(`mentor:${id}`));
        for (const data of tokens.values()) if (data.mentor_id === options.where.mentor_id && data.used_at === null) await row(data).update(values, options);
      },
      async create(values, options) {
        if (failCreate) throw Error('Synthetic storage failure');
        const key = randomUUID(), data = { id: key, ...values }; tokens.set(key, data); options.transaction.undo.push(() => tokens.delete(key)); return row(data, options.transaction);
      },
    },
    sequelize: { async transaction(callback) { const current = tx(); if (!callback) return current; try { const result = await callback(current); await current.commit(); return result; } catch (error) { await current.rollback(); throw error; } } },
  };
  const auth = isolated('services/unifiedAuth.service.js', authDependencies);
  const service = isolated('services/mentorToken.service.js', { '../models': models, './unifiedAuth.service': auth }, { Date: Clock });
  const quiet = { error() {} };
  const controller = isolated('controllers/mentorVerification.controller.js', { '../models': models, '../services/mentorToken.service': service, '../services/unifiedAuth.service': auth }, { Date: Clock, console: quiet });
  const owner = isolated('controllers/mentor.controller.js', { '../models': models, '../services/mentorToken.service': service, '../services/email.service': { async sendMentorVerificationEmail(value) { delivered.push(value.token); } } }, { Date: Clock, console: quiet });
  const call = async (kind, value = original, patch = {}) => {
    const res = response(), body = { token: value, email: 'changed@example.invalid', first_name: 'Changed', last_name: 'Mentor', position: 'New', ...patch };
    if (kind === 'read') await controller.verifyMentorToken({ query: { token: value } }, res);
    else if (kind === 'confirm') await controller.confirmMentor({ body: { token: value } }, res);
    else if (kind === 'resend') await owner.updateMyMentor({ user: { id: studentId }, body: { ...profile, ...patch } }, res);
    else await controller.updateMentorProfile({ body }, res);
    return res;
  };
  async function hold() { const current = await models.sequelize.transaction(); await models.Mentor.findByPk(id, { transaction: current, lock: current.LOCK.UPDATE }); return current; }
  return { models, service, controller, call, hold, profile, tokens, original, delivered, setTrack(value) { track = value; }, setNow(value) { clock = value; }, get now() { return clock; }, failCreate() { failCreate = true; } };
}
const turn = () => new Promise(resolve => setImmediate(resolve));

test('Co-op Only: public Mentor read/update/confirm reject internship legacy links without changing data', async () => {
  for (const kind of ['read', 'update', 'confirm']) {
    const denied = mentorFixture('internship'), before = JSON.stringify({ profile: denied.profile, tokens: [...denied.tokens] });
    const res = await denied.call(kind); assert.equal(res.code, 403); assert.equal(res.body.success, false);
    assert.equal(JSON.stringify({ profile: denied.profile, tokens: [...denied.tokens] }), before);
    const accepted = await mentorFixture().call(kind); assert.equal(accepted.code, 200);
    if (kind === 'read') { assert.equal(accepted.body.data.mentor.student_id, undefined); assert.ok(accepted.body.data.mentor.student); }
    const expired = mentorFixture(); expired.setNow(expired.now + 86400000); assert.equal((await expired.call(kind)).code, 410);
    const used = mentorFixture(); used.tokens.get('original').used_at = new Date(); assert.equal((await used.call(kind)).code, 410);
  }
  const changed = mentorFixture(), held = await changed.hold(), waiting = changed.call('confirm');
  await turn(); changed.setTrack('internship'); await held.commit();
  assert.equal((await waiting).code, 403); assert.equal(changed.tokens.get('original').used_at, null);
});

test('Co-op Only: existing public weekly-review and appointment services reject internship owners', async () => {
  const studentId = randomUUID(), mentorId = randomUUID(), teacherId = randomUUID(), verified = new Date();
  const transaction = { LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' } };
  for (const track of ['internship', 'co_op']) {
    const owner = { id: studentId, student_id: 'fixture', first_name: 'Fixture', last_name: 'Student', track, coop_advisor_teacher_id: teacherId };
    const models = { Student: { findByPk: async () => owner },
      Mentor: { findByPk: async () => ({ id: mentorId, student_id: studentId, status: 'verified', verified_at: verified }) },
      InternshipReviewToken: { findOne: async () => ({ id: randomUUID(), student_id: studentId, mentor_id: mentorId }), findByPk: async () => ({ expires_at: new Date(Date.now() + 60000), verified_at: verified }) },
      InternshipWeek: { findAll: async () => [] },
      sequelize: { query: async () => [[{ table_name: 'fixture', name: 'fixture' }]], transaction: async action => action(transaction) },
    };
    const logs = isolated('services/internshipLog.service.js', { './internshipLogRules': require('../src/services/internshipLogRules') }).createInternshipLogService(models);
    const token = randomBytes(32).toString('hex');
    if (track === 'internship') await assert.rejects(logs.list(token), error => error.status === 403 && error.code === 'COOP_REQUIRED');
    else { const result = await logs.list(token); assert.equal(result.student.code, 'fixture'); assert.equal(result.weeks.length, 0); }
    if (track === 'internship') {
      const supervision = isolated('services/supervision.service.js', { './supervisionRules': require('../src/services/supervisionRules') }).createSupervisionService({ ...models,
        Teacher: { findOne: async () => ({ id: teacherId, status: 'active' }) },
        SupervisionToken: { findOne: async () => ({ SupervisionAppointment: { student_id: studentId, teacher_id: teacherId } }) },
      });
      await assert.rejects(supervision.scope(token), error => error.status === 403 && error.code === 'COOP_REQUIRED');
    }
  }
});

test('mentor concurrency: profile update and confirm serialize in either order; old token cannot confirm changed data', async () => {
  for (const first of ['update', 'confirm']) {
    const f = mentorFixture(), held = await f.hold();
    const one = f.call(first); await turn(); const two = f.call(first === 'update' ? 'confirm' : 'update'); await turn();
    await held.commit(); const results = await Promise.all([one, two]);
    assert.equal(results[0].code, 200); assert.equal(results[1].code, 410);
    if (first === 'update') {
      assert.equal(results[0].headers['Cache-Control'], 'no-store');
      assert.equal(f.profile.status, 'pending'); const fresh = results[0].body.data.verification_token;
      assert.ok(typeof fresh === 'string' && fresh !== f.original);
      assert.equal(new Date(results[0].body.data.expires_at).getTime(), f.now + 86400000);
      assert.equal((await f.call('confirm', fresh)).code, 200);
    }
    assert.equal(f.profile.status, 'verified'); assert.ok(f.profile.verified_at);
    assert.equal((await f.call('confirm')).code, 410);
  }
});

test('mentor concurrency: Student edit/resend and public update/confirm share Mentor-first lock order', async () => {
  for (const pair of [['resend', 'confirm'], ['confirm', 'resend'], ['update', 'resend'], ['resend', 'update']]) {
    const f = mentorFixture(), held = await f.hold();
    const one = f.call(pair[0]); await turn(); const two = f.call(pair[1]); await turn(); await held.commit();
    const result = await Promise.all([one, two]); assert.equal(result[0].code, 200);
    assert.equal(result[1].code, pair[1] === 'resend' ? 200 : 410);
    if (f.profile.status === 'pending') {
      const active = [...f.tokens.values()].filter(row => !row.used_at); assert.equal(active.length, 1);
      const fresh = f.delivered.at(-1) || result[0].body.data.verification_token;
      assert.equal((await f.call('confirm', fresh)).code, 200);
    }
    assert.equal(f.profile.status, 'verified');
  }
});

test('mentor concurrency: double confirm/update admits one winner; transaction failure rolls back profile and revocation', async () => {
  for (const kind of ['confirm', 'update']) {
    const f = mentorFixture(), held = await f.hold(), one = f.call(kind); await turn(); const two = f.call(kind); await turn(); await held.commit();
    assert.deepEqual((await Promise.all([one, two])).map(result => result.code), [200, 410]);
  }
  const f = mentorFixture(), before = { ...f.profile }; f.failCreate();
  assert.equal((await f.call('update')).code, 500); assert.deepEqual(f.profile, before);
  assert.equal(f.tokens.get('original').used_at, null); assert.equal(f.tokens.size, 1);
  assert.equal((await f.call('confirm')).code, 200);
});

test('mentor verification: expiry is rechecked after lock wait; missing/used/unknown/orphan tokens fail closed', async () => {
  const f = mentorFixture(), held = await f.hold(), waiting = f.call('confirm'); await turn();
  f.setNow(f.now + 86400000); await held.commit(); assert.equal((await waiting).code, 410); assert.equal(f.profile.status, 'pending');
  assert.equal((await f.call('update', '')).code, 400); assert.equal((await f.call('confirm', 'unknown')).code, 404);
  const orphan = mentorFixture(); orphan.tokens.get('original').mentor_id = randomUUID(); assert.equal((await orphan.call('confirm')).code, 404);
  const used = mentorFixture(); used.tokens.get('original').used_at = new Date(); assert.equal((await used.call('update')).code, 410);
});

function matchesWhere(row, where) {
  return Reflect.ownKeys(where).every(key => key === Op.or ? where[key].some(branch => matchesWhere(row, branch))
    : where[key] && typeof where[key] === 'object' && Object.hasOwn(where[key], Op.gt) ? row[key] != null && new Date(row[key]) > where[key][Op.gt]
    : row[key] === where[key]);
}
function jobFixture(patch = {}, expireDuringOwnerLock = false) {
  let now = Date.UTC(2026, 10, 4, 12), created = null, writes = 0, committed = false;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const policy = isolated('services/jobEligibility.js', {}, { Date: Clock });
  const company = { id: randomUUID(), name: 'Fixture company', province: 'Fixture', address_no: '1' };
  const job = { id: randomUUID(), title: 'Fixture job', company_id: company.id, company, status: 'published', expires_at: new Date(now + 1000), ...patch };
  const transaction = { LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' }, async commit() { committed = true; this.finished = true; }, async rollback() { this.finished = true; } };
  const models = { Company: { async findByPk() { return company; } },
    JobPosting: { async findAll(options) { return matchesWhere(job, options.where) ? [job] : []; },
      async findOne(options) { return matchesWhere(job, options.where) ? job : null; },
      async findByPk(_, options) { assert.equal(options.lock, 'SHARE'); return job; } },
    Student: { async findByPk() { if (expireDuringOwnerLock) now += 1000; return { id: randomUUID(), major: 'IT', track: 'co_op', profile: { related_skills: 'fixture' } }; } },
    StudentProfile: {}, Teacher: {},
    CoopRequest: { async findOne(options) { return options.where.id ? created : null; }, async create(values) { writes++; created = { id: randomUUID(), ...values }; return created; } },
    CoopRequestDeliveryMethod: { async bulkCreate() { writes++; } }, CoopRequestPrerequisiteCourse: { async bulkCreate() { writes++; } }, CoopRequestReview: { async create() { writes++; } },
    sequelize: { async transaction() { return transaction; } },
  };
  const controllers = isolated('controllers/coopRequest.controller.js', { '../models': models,
    '../services/coopPrerequisites': { normalizePrerequisites: () => [], prerequisiteInclude: () => ({}) }, '../services/jobEligibility': policy }, { Date: Clock });
  const matching = isolated('controllers/jobMatching.controller.js', { '../models': models,
    '../services/resumeText.service': { isUsableResumeText: () => true }, '../services/nlpMatching.client': { NlpMatchingResponseError: class extends Error {} }, '../services/jobEligibility': policy }, { Date: Clock });
  const match = matching.createJobMatchingHandler({ ...Object.fromEntries(Object.entries(models).map(([key, value]) => [key + 'Model', value])), StudentFileModel: {}, callNlp: async () => ({ schema_version: 'job-matching.v1', matches: [{ job_posting_id: job.id, score: 0.5, rank: 1 }] }) });
  return { job, controllers, match, get writes() { return writes; }, get committed() { return committed; },
    request: { user: { id: randomUUID() }, params: { id: job.id }, query: { source: 'skills' }, body: {
      company_id: company.id, job_posting_id: job.id, company_name: company.name, company_province: 'Fixture', company_address: 'Fixture',
      letter_recipient_name: 'Fixture', work_start_date: '2026-12-01', work_end_date: '2026-12-31', delivery_methods: ['email'], prerequisite_courses: [],
    } } };
}

test('job eligibility: active/expired/exact boundary/NULL/unpublished share one policy', async () => {
  const now = new Date(Date.UTC(2026, 10, 4, 12));
  const cases = [
    [{ expires_at: new Date(now.getTime() + 1) }, true], [{ expires_at: new Date(now.getTime() - 1) }, false],
    [{ expires_at: now }, false], [{ expires_at: null }, true],
    ...['pending_review', 'pending_email_verification', 'expired', 'withdrawn', 'rejected'].map(status => [{ status, expires_at: null }, false]),
  ];
  for (const [patch, eligible] of cases) {
    assert.equal(jobPolicy.isPublishedJobAvailable({ status: 'published', ...patch }, now), eligible);
    assert.equal(matchesWhere({ status: 'published', ...patch }, jobPolicy.publishedJobWhere(now)), eligible);
    const f = jobFixture(patch), match = response(), select = response(), submit = response();
    await f.match(f.request, match); assert.equal(match.code, 200); assert.equal(match.body.matches.length, eligible ? 1 : 0);
    await f.controllers.getPublishedJobPostingForCoopRequest(f.request, select); assert.equal(select.code, eligible ? 200 : 404);
    await f.controllers.createCoopRequest(f.request, submit); assert.equal(submit.code, eligible ? 201 : 400);
    assert.equal(f.committed, eligible); assert.equal(f.writes > 0, eligible);
  }
});

test('job eligibility: deadline passing during Student lock wait refuses a new application without writes', async () => {
  const f = jobFixture({}, true), res = response(); await f.controllers.createCoopRequest(f.request, res);
  assert.equal(res.code, 400); assert.equal(f.committed, false); assert.equal(f.writes, 0);
});

test('overview API contract: existing request list is owner-scoped and retains success/data shape', async () => {
  const rows = [{ id: 'one', student_id: 'owner-a', status: 'approved' }, { id: 'two', student_id: 'owner-b', status: 'advisor_review' }];
  const controller = isolated('controllers/coopRequest.controller.js', {
    '../models': { CoopRequest: { async findAll(options) { return rows.filter(row => row.student_id === options.where.student_id); } } },
    '../services/coopPrerequisites': { prerequisiteInclude: () => ({}) }, '../services/jobEligibility': jobPolicy,
  });
  for (const owner of ['owner-a', 'owner-b', 'empty-owner']) {
    const res = response(); await controller.getMyCoopRequests({ user: { id: owner } }, res);
    assert.equal(res.code, 200); assert.equal(res.body.success, true); assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.every(row => row.student_id === owner)); assert.equal(res.body.data.length, owner === 'empty-owner' ? 0 : 1);
  }
});
