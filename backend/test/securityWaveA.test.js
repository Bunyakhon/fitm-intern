// Focused dependency compatibility: real HTTP/JWT/packages, synthetic actors,
// and a hard SQL guard. Never starts the application DB bootstrap or reads .env.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { randomUUID, randomBytes } = require('node:crypto');
const { gzipSync } = require('node:zlib');

test('Security Wave A: installed dependencies and HTTP/auth compatibility without database writes', { timeout: 30000 }, async t => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  process.env.DOTENV_CONFIG_QUIET = 'true';
  const dotenv = require('dotenv');
  dotenv.config = options => dotenv.configDotenv({ ...options, path: '/nonexistent/fitm-wave-a-test.env' });
  const express = require('express'), jwt = require('jsonwebtoken');
  const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
  const models = require('../src/models');
  let sqlCalls = 0;
  models.sequelize.query = async () => { sqlCalls++; throw Error('SQL is forbidden in Wave A compatibility tests'); };
  const servers = [];
  const listen = async app => {
    const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    servers.push(server); return 'http://127.0.0.1:' + server.address().port;
  };
  const packageVersion = name => {
    let directory = path.dirname(require.resolve(name));
    while (true) {
      const manifest = path.join(directory, 'package.json');
      if (fs.existsSync(manifest)) { const value = JSON.parse(fs.readFileSync(manifest)); if (value.name === name) return value.version; }
      const parent = path.dirname(directory); if (parent === directory) throw Error('Cannot locate package ' + name); directory = parent;
    }
  };
  try {
    await t.test('installed Wave A versions match the lock, preserving Express/Sequelize and deferred Wave B', () => {
      const expected = { 'proxy-addr': '2.0.8', 'body-parser': '2.4.0', qs: '6.16.1', 'express-rate-limit': '8.7.3',
        'ip-address': '10.7.4', multer: '2.5.0', nodemailer: '10.1.4', moment: '2.31.0', 'brace-expansion': '5.0.12',
        express: '5.2.1', sequelize: '6.37.8', nodemon: '3.1.14', minimatch: '10.2.6', uuid: '8.3.2' };
      const lock = JSON.parse(fs.readFileSync(path.join(__dirname, '../package-lock.json')));
      for (const [name, version] of Object.entries(expected)) {
        assert.equal(packageVersion(name), version, name); assert.equal(lock.packages['node_modules/' + name].version, version, name);
      }
      assert.equal(JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'))).overrides, undefined);
    });
    await t.test('proxy-addr rejects the advisory short-prefix trust mistake and rate-limit separates mapped IPv4 clients', () => {
      const proxyaddr = require('proxy-addr');
      assert.equal(proxyaddr.compile(['::ffff:10.0.0.0/8'])('198.51.100.1'), false);
      assert.equal(proxyaddr.compile(['10.0.0.0/8'])('10.1.2.3'), true);
      assert.equal(proxyaddr.compile(['10.0.0.0/8'])('198.51.100.1'), false);
      assert.equal(ipKeyGenerator('::ffff:198.51.100.1'), ipKeyGenerator('198.51.100.1'));
      assert.notEqual(ipKeyGenerator('::ffff:198.51.100.1'), ipKeyGenerator('::ffff:198.51.100.2'));
      assert.equal(ipKeyGenerator('2001:db8::1'), ipKeyGenerator('2001:db8::2'));
    });
    await t.test('trust proxy=false ignores spoofed forwarded headers and the same client still receives 429', async () => {
      const app = express(), logged = [];
      assert.equal(app.get('trust proxy'), false);
      app.get('/ip', (req, res) => res.json({ ip: req.ip, ips: req.ips }));
      app.get('/limited', rateLimit({ windowMs: 60000, limit: 2, standardHeaders: 'draft-7', legacyHeaders: false,
        logger: { error: error => logged.push(error.code), warn() {} } }), (req, res) => res.json({ ok: true }));
      app.get('/handler-error', rateLimit({ windowMs: 60000, limit: 1, handler: async () => { throw Error('Synthetic handler failure'); } }), (req, res) => res.sendStatus(200));
      app.use((error, req, res, next) => res.status(503).json({ code: 'HANDLER_FAILED' }));
      const base = await listen(app);
      const response = await fetch(base + '/ip', { headers: { 'X-Forwarded-For': '198.51.100.1', Forwarded: 'for=203.0.113.1' } });
      assert.deepEqual(await response.json(), { ip: '127.0.0.1', ips: [] });
      for (const [index, status] of [200, 200, 429, 429].entries()) {
        const result = await fetch(base + '/limited', { headers: { 'X-Forwarded-For': '198.51.100.' + (index + 1) } });
        assert.equal(result.status, status); assert.ok(result.headers.has('ratelimit'));
        if (status === 429) assert.ok(Number(result.headers.get('retry-after')) > 0);
        await result.text();
      }
      assert.ok(logged.includes('ERR_ERL_UNEXPECTED_X_FORWARDED_FOR'), 'Default config validation remains enabled');
      assert.equal((await fetch(base + '/handler-error')).status, 200);
      const failed = await fetch(base + '/handler-error'); assert.equal(failed.status, 503); assert.deepEqual(await failed.json(), { code: 'HANDLER_FAILED' });
    });
    await t.test('compressed/malformed/trailing-byte/oversized request handling remains bounded and server survives', async () => {
      const app = express(); app.use(express.json({ limit: '2kb' }));
      app.post('/echo', (req, res) => res.json({ success: true, data: req.body }));
      app.get('/healthy', (req, res) => res.json({ ok: true }));
      app.use((error, req, res, next) => res.status(error.status === 413 ? 413 : 400).json({ code: 'INVALID_BODY' }));
      const base = await listen(app), valid = gzipSync(Buffer.from(JSON.stringify({ name: 'วิชาทดสอบ' })));
      const send = body => fetch(base + '/echo', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }, body });
      const ok = await send(valid); assert.equal(ok.status, 200); assert.deepEqual(await ok.json(), { success: true, data: { name: 'วิชาทดสอบ' } });
      for (const body of [gzipSync(Buffer.from('{bad json')), Buffer.concat([valid, Buffer.from('trailing invalid bytes')])]) {
        const response = await send(body); assert.equal(response.status, 400); assert.deepEqual(await response.json(), { code: 'INVALID_BODY' });
        assert.equal((await fetch(base + '/healthy')).status, 200);
      }
      const tooLarge = await send(gzipSync(Buffer.from(JSON.stringify({ name: 'x'.repeat(4096) })))); assert.equal(tooLarge.status, 413);
      assert.equal((await fetch(base + '/healthy')).status, 200);
    });
    await t.test('Multer memory uploads preserve MIME/field/size boundaries and survive an aborted pending file filter', async () => {
      const multer = require('multer'), http = require('node:http'), app = express();
      const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8, fieldSize: 16, fields: 1, parts: 3 },
        fileFilter: (req, file, done) => done(file.mimetype === 'application/pdf' ? null : new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), file.mimetype === 'application/pdf') });
      app.post('/upload', upload.single('document'), (req, res) => res.json({ bytes: req.file.size, name: req.file.originalname, label: req.body.label || null }));
      let entered, finishFilter, completed = false;
      const filterEntered = new Promise(resolve => { entered = resolve; });
      const delayed = multer({ storage: multer.memoryStorage(), limits: { fileSize: 32 }, fileFilter: (req, file, done) => { finishFilter = () => done(null, true); entered(); } });
      app.post('/pending', delayed.single('document'), (req, res) => { completed = true; res.sendStatus(200); });
      app.get('/healthy', (req, res) => res.sendStatus(200));
      app.use((error, req, res, next) => res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ code: error.code }));
      const base = await listen(app);
      const send = async ({ field = 'document', text = '%PDF-1', type = 'application/pdf', label, duplicate = false } = {}) => {
        const body = new FormData(); body.append(field, new Blob([text], { type }), 'fixture.pdf');
        if (label !== undefined) body.append('label', label);
        if (duplicate) body.append(field, new Blob(['%PDF'], { type }), 'other.pdf');
        return fetch(base + '/upload', { method: 'POST', body });
      };
      const valid = await send({ label: 'x'.repeat(16) }); assert.equal(valid.status, 200); assert.deepEqual(await valid.json(), { bytes: 6, name: 'fixture.pdf', label: 'x'.repeat(16) });
      for (const values of [{ type: 'image/png' }, { field: 'other' }, { duplicate: true }, { label: 'x'.repeat(17) }]) assert.equal((await send(values)).status, 400);
      const large = await send({ text: 'x'.repeat(9) }); assert.equal(large.status, 413); assert.equal((await large.json()).code, 'LIMIT_FILE_SIZE');
      const request = http.request(new URL('/pending', base), { method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=wave-a-fixture' } });
      request.on('error', () => {}); // Intentional client disconnect only.
      const closed = new Promise(resolve => request.once('close', resolve));
      request.write('--wave-a-fixture\r\nContent-Disposition: form-data; name="document"; filename="fixture.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF');
      await filterEntered; request.destroy(); await closed;
      finishFilter(); await new Promise(resolve => setImmediate(resolve));
      assert.equal((await fetch(base + '/healthy')).status, 200); assert.equal(completed, false);
    });
    await t.test('Moment timezone and Sequelize UUID/timestamp model defaults retain their contracts without SQL', async () => {
      const moment = require('moment-timezone'), instant = new Date('2026-11-07T00:00:00.000Z');
      assert.equal(moment(instant).tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm'), '2026-11-07 07:00');
      const course = models.CoopPrerequisiteCatalogCourse.build({ program: 'IT', course_code: '999000001', course_name: 'Fixture', createdAt: instant });
      await course.validate(); assert.match(course.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      assert.equal(course.toJSON().createdAt.toISOString(), instant.toISOString());
    });
    await t.test('actual JWT/live Staff guard and Catalog router enforce actor, active status, permission and program scope', async () => {
      const staff = { id: randomUUID(), is_active: true }, student = { id: randomUUID(), student_id: 'fixture', track: 'co_op', status: 'searching' };
      const teacher = { id: randomUUID(), status: 'active', is_department_head: false };
      let grantActive = true, revoked = false;
      const staffModel = { findByPk: async id => id === staff.id ? staff : null,
        findOne: async ({ where }) => where.id === staff.id && staff.is_active ? staff : null };
      const grants = () => grantActive ? [{ program: 'IT' }] : [];
      const memory = { DepartmentStaff: staffModel,
        sequelize: { query: async () => [[{ programs: true, courses: true, grants: true }]], transaction: async action => action({ LOCK: { SHARE: 'SHARE', UPDATE: 'UPDATE' } }) },
        CoopPrerequisiteCatalogGrant: { findAll: async () => grants(), findOne: async ({ where }) => grantActive && where.department_staff_id === staff.id && where.program === 'IT' && where.permission === 'coop_prerequisite_catalog.manage' && where.is_active ? { program: 'IT' } : null },
        CoopPrerequisiteCatalogProgram: { findByPk: async () => ({ revision: '1' }) },
        CoopPrerequisiteCatalogCourse: { findAll: async () => [], create: async () => { throw Error('Writes are forbidden'); } } };
      const { createAuthenticateToken, createRequireDepartmentStaff } = require('../src/middlewares/auth.middleware');
      const authenticate = createAuthenticateToken({ StaffModel: staffModel, StudentModel: { findByPk: async () => student }, TeacherModel: { findByPk: async () => teacher },
        checkAccountAccess: async () => { if (revoked) throw Object.assign(Error('Revoked'), { code: 'ACCOUNT_UNAUTHORIZED', status: 403 }); } });
      const app = express(); app.use(express.json());
      app.use('/catalog', authenticate, createRequireDepartmentStaff({ StaffModel: staffModel }), require('../src/routes/coopPrerequisiteCatalog.routes').createCatalogRouter(memory));
      const base = await listen(app);
      const token = (actor, type, expiresIn = '5m', secret = process.env.JWT_SECRET) => jwt.sign({ id: actor.id, actor_type: type, role: type,
        ...(type === 'department_staff' ? { staff_id: actor.id } : type === 'student' ? { student_id: actor.student_id } : { teacher_id: actor.id }) }, secret, { expiresIn });
      const request = (session, suffix = '?program=IT', method = 'GET', body) => fetch(base + '/catalog' + suffix, { method,
        headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: 'Bearer ' + session } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      assert.equal((await request()).status, 401);
      assert.equal((await request(token(staff, 'department_staff', '-1s'))).status, 401);
      assert.equal((await request(token(staff, 'department_staff', '5m', 'wrong-fixture-secret'))).status, 401);
      for (const [actor, type] of [[student, 'student'], [teacher, 'teacher']]) {
        assert.equal((await request(token(actor, type))).status, 403);
        assert.equal((await request(token(actor, type), '', 'POST', { program: 'IT' })).status, 403);
      }
      const session = token(staff, 'department_staff'), allowed = await request(session); assert.equal(allowed.status, 200); assert.equal(allowed.headers.get('cache-control'), 'no-store');
      assert.equal((await request(session, '?program=INE')).status, 403);
      assert.equal((await request(session, '', 'POST', { program: 'INE', course_code: '999000001', course_name: 'Forbidden', expected_catalog_revision: '1' })).status, 403);
      grantActive = false; assert.equal((await request(session)).status, 403);
      grantActive = true; staff.is_active = false; assert.equal((await request(session)).status, 403);
      staff.is_active = true; revoked = true; assert.equal((await request(session)).status, 403);
    });
    await t.test('actual Backend app routes/middleware load and smoke without DB bootstrap or SQL', async () => {
      const filename = path.resolve(__dirname, '../src/app.js'), source = fs.readFileSync(filename, 'utf8');
      const marker = '// Development schema initialization is explicit:'; assert.ok(source.includes(marker));
      // Keep actual application setup, registered routes and error handling;
      // omit only the authenticate/listen bootstrap, without changing the file.
      const loaded = new Module(filename, module); loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
      loaded._compile(source.slice(0, source.indexOf(marker)) + '\nmodule.exports = app;', filename);
      const app = loaded.exports; assert.equal(app.get('trust proxy'), false); const base = await listen(app);
      const health = await fetch(base + '/'); assert.equal(health.status, 200); assert.equal((await health.json()).message, 'fitm-intern API is running');
      for (const endpoint of ['/api/staff/coop-prerequisite-catalog?program=IT', '/api/coop-requests/prerequisite-catalog', '/api/auth/me'])
        assert.equal((await fetch(base + endpoint)).status, 401);
      const invalidLogin = await fetch(base + '/api/auth/unified-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(invalidLogin.status, 400);
      const malformed = await fetch(base + '/api/auth/unified-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
      assert.equal(malformed.status, 400); assert.deepEqual(await malformed.json(), { message: 'Unable to process request' });
      assert.equal((await fetch(base + '/', { headers: { Origin: 'https://untrusted.example.invalid' } })).status, 403);
      assert.equal(sqlCalls, 0);
    });
  } finally {
    for (const server of servers) await new Promise(resolve => server.close(resolve));
    await models.sequelize.close();
    assert.equal(sqlCalls, 0, 'No SQL, including schema or business writes, may run');
  }
});
