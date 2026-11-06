const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const nodemailer = require('nodemailer');

// Actual controllers/template + local stream transport; no .env, SMTP or DB.
const plain = value => JSON.parse(JSON.stringify(value));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const subject = 'ยืนยันข้อมูลพี่เลี้ยงนักศึกษาสหกิจศึกษา';
function isolated(file, dependencies, globals = {}) {
  const filename = path.join(__dirname, '../src', file), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, URL, process: { env: {} }, console: { error() {}, log() {}, warn() {} },
    require(name) { if (Object.hasOwn(dependencies, name)) return dependencies[name]; throw Error('Undeclared dependency: ' + name); }, ...globals }, { filename });
  return module.exports;
}
function emailHarness() {
  const mails = [], mime = [], logs = []; let failure = null;
  const logger = Object.fromEntries(['log', 'error', 'warn', 'info', 'debug'].map(key => [key, (...args) => logs.push(args.join(' '))]));
  const service = isolated('services/email.service.js', { nodemailer: { createTransport(options) {
    assert.equal(options.host, 'smtp.example.invalid');
    const stream = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
    return { async sendMail(message) { mails.push(message); if (failure) throw failure; const result = await stream.sendMail(message); mime.push(result.message.toString('utf8')); return result; } };
  } } }, { console: logger, process: { env: { SMTP_HOST: 'smtp.example.invalid', SMTP_PORT: '587', SMTP_USER: 'fixture', SMTP_PASS: 'fixture-only', SMTP_FROM: 'system@example.invalid', SMTP_FROM_NAME: 'FITM Internship System', FRONTEND_URL: 'https://portal.example.invalid' } } });
  return { service, mails, mime, logs, logger, fail(error) { failure = error; } };
}
const response = () => ({ code: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
function fixture() {
  const email = emailHarness(), a = randomUUID(), b = randomUUID(), mentors = new Map(), tokens = [], lookups = [], lookupOptions = [], transactions = [];
  const students = new Map([[a, { id: a, first_name: 'สมชาย', last_name: 'ใจดี', major: 'เทคโนโลยีสารสนเทศ', faculty: 'เทคโนโลยีและการจัดการอุตสาหกรรม', profile: { prefix: 'นาย' } }],
    [b, { id: b, first_name: 'บุคคลอื่น', last_name: 'นักศึกษาอื่น', major: 'สาขาของคนอื่น', faculty: 'คณะของคนอื่น', profile: { prefix: 'นางสาว' } }]]);
  let tokenFailure = null, studentFailure = null;
  const models = {
    StudentProfile: {},
    Student: { async findByPk(id, options) {
      assert.deepEqual(plain(options.attributes), ['id', 'first_name', 'last_name', 'major', 'faculty']);
      assert.equal(options.include[0].model, models.StudentProfile); assert.equal(options.include[0].as, 'profile');
      assert.deepEqual(plain(options.include[0].attributes), ['prefix']); assert.equal(options.include[0].required, false);
      assert.equal(transactions.at(-1).finished, 'commit', 'Read email context after existing mutation commits');
      lookups.push(id); lookupOptions.push(options); if (studentFailure) throw studentFailure; return students.has(id) ? structuredClone(students.get(id)) : null;
    } },
    Mentor: {
      async findOne(options) { if (options.transaction) assert.equal(options.lock, options.transaction.LOCK.UPDATE); return mentors.get(options.where.student_id) || null; },
      async create(values, options) {
        assert.ok(options.transaction); const row = { id: randomUUID(), ...values, async save(saveOptions) { assert.ok(saveOptions.transaction); } }; mentors.set(values.student_id, row); return row;
      },
    },
    sequelize: { async transaction() { const before = new Map([...mentors].map(([id, row]) => [id, { ...row }])); const transaction = { LOCK: { UPDATE: 'UPDATE' }, finished: null,
      async commit() { this.finished = 'commit'; }, async rollback() { mentors.clear(); for (const [id, row] of before) mentors.set(id, row); this.finished = 'rollback'; } }; transactions.push(transaction); return transaction; } },
  };
  const controller = isolated('controllers/mentor.controller.js', { '../models': models, '../services/mentorToken.service': { async createMentorVerificationToken(id, options) {
    assert.ok(options.transaction); assert.equal(options.transaction.finished, null); if (tokenFailure) throw tokenFailure;
    const token = 'synthetic-mentor-' + randomUUID(); tokens.push({ mentorId: id, token }); return { token };
  } }, '../services/email.service': email.service }, { console: email.logger });
  const mentorData = { email: 'mentor@example.invalid', first_name: 'พี่เลี้ยง', last_name: 'ทดสอบ', position: 'Mentor' };
  const call = async (action, body = mentorData, owner = a) => { const res = response(); await controller[action]({ user: { id: owner }, body }, res); return res; };
  return { ...email, a, b, students, mentors, tokens, lookups, lookupOptions, transactions, mentorData, call, failToken(error) { tokenFailure = error; }, failStudent(error) { studentFailure = error; } };
}
function assertMail(message, values, token) {
  assert.equal(message.subject, subject);
  assert.ok(message.text.includes('เรียน คุณ' + values.mentor)); assert.ok(message.html.includes('เรียน คุณ' + escape(values.mentor)));
  for (const [label, value] of [['ชื่อ–นามสกุล', values.name], ['สาขาวิชา', values.major], ['คณะ', values.faculty]]) {
    assert.ok(message.text.includes(label + ': ' + value)); assert.ok(message.html.includes('<strong>' + label + ':</strong> ' + escape(value)));
  }
  assert.ok(message.text.indexOf('ข้อมูลนักศึกษาที่ท่านจะดูแล') < message.text.indexOf('https://'));
  assert.ok(message.html.indexOf('ข้อมูลนักศึกษาที่ท่านจะดูแล') < message.html.indexOf('<a href='));
  const href = message.html.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&');
  const url = new URL(href); assert.equal(url.pathname, '/src/mentor_coop/mentor_verify_user.html');
  assert.ok(url.searchParams.get('token') === token, 'Original verification token is preserved in URL');
  assert.ok(message.text.includes(href), 'Text and HTML use the same verification link');
}

test('Student Mentor status read is owner-scoped, uncached and reflects confirmed server state', async () => {
  const f = fixture(); await f.call('createMentor');
  f.mentors.get(f.a).status = 'verified';
  const res = await f.call('getMyMentor');
  assert.equal(res.headers['Cache-Control'], 'no-store'); assert.equal(res.body.data.status, 'verified');
  assert.equal((await f.call('getMyMentor', {}, f.b)).body.data, null);
});

test('create/update/resend use persisted Mentor owner and fresh Student/Profile data; body cannot spoof student identity', async () => {
  const f = fixture(), forged = { ...f.mentorData, student_id: f.b, student: f.students.get(f.b), student_first_name: 'forged', student_major: 'forged', major: 'forged', faculty: 'forged', prefix: 'forged' };
  let res = await f.call('createMentor', forged); assert.equal(res.code, 201); assert.equal(res.body.data.verification_email_sent, true);
  assert.equal(f.mentors.get(f.a).student_id, f.a); assert.equal(f.mentors.has(f.b), false);
  const expected = { mentor: 'พี่เลี้ยง ทดสอบ', name: 'นายสมชาย ใจดี', major: 'เทคโนโลยีสารสนเทศ', faculty: 'เทคโนโลยีและการจัดการอุตสาหกรรม' };
  assertMail(f.mails[0], expected, f.tokens[0].token);
  res = await f.call('updateMyMentor', { ...forged, first_name: 'พี่เลี้ยงใหม่' }); assert.equal(res.code, 200); assert.equal(res.body.data.verification_email_sent, true);
  assertMail(f.mails[1], { ...expected, mentor: 'พี่เลี้ยงใหม่ ทดสอบ' }, f.tokens[1].token);
  // Current frontend resend uses PUT /me with the saved mentor values.
  f.students.get(f.a).major = 'สาขาปรับปรุงล่าสุด';
  res = await f.call('updateMyMentor', { ...f.mentorData, first_name: 'พี่เลี้ยงใหม่', ...{ student_id: f.b, student: f.students.get(f.b) } });
  assert.equal(res.code, 200); assertMail(f.mails[2], { ...expected, mentor: 'พี่เลี้ยงใหม่ ทดสอบ', major: 'สาขาปรับปรุงล่าสุด' }, f.tokens[2].token);
  assert.deepEqual(f.lookups, [f.a, f.a, f.a]); assert.equal(f.mentors.get(f.a).status, 'pending'); assert.equal(f.mentors.get(f.a).verified_at, null);
  assert.ok(f.mails.every(mail => !mail.text.includes('forged') && !mail.text.includes('บุคคลอื่น') && !mail.html.includes('คณะของคนอื่น')));
  assert.ok(f.mime.every(value => value.includes('multipart/alternative') && value.includes('charset=utf-8')));
});

test('NULL/blank major, faculty, names and missing optional prefix use independent fallbacks in both email parts', async () => {
  for (const fields of [{ major: null }, { faculty: null }, { major: null, faculty: '  ', profile: null }, { first_name: null }, { last_name: null }, { first_name: null, last_name: null }, { first_name: null, last_name: null, profile: null }]) {
    const f = fixture(); Object.assign(f.students.get(f.a), fields); await f.call('createMentor');
    const row = f.students.get(f.a), expectedName = (row.profile?.prefix || '') + (!row.first_name && !row.last_name ? 'ยังไม่ระบุ' : (row.first_name || 'ยังไม่ระบุ') + ' ' + (row.last_name || 'ยังไม่ระบุ'));
    assertMail(f.mails[0], { mentor: 'พี่เลี้ยง ทดสอบ', name: expectedName, major: row.major?.trim() || 'ยังไม่ระบุ', faculty: row.faculty?.trim() || 'ยังไม่ระบุ' }, f.tokens[0].token);
  }
});

test('actual Sequelize projection selects the scoped-out faculty and joins only the owner profile prefix', async () => {
  const f = fixture(); await f.call('createMentor');
  const sequelizeLibrary = require('sequelize'), db = new sequelizeLibrary.Sequelize('postgres://fixture:fixture@127.0.0.1/fixture', { logging: false });
  try {
    const models = { Student: isolated('models/student.model.js', { sequelize: sequelizeLibrary, bcrypt: {} })(db),
      StudentProfile: require('../src/models/studentProfile.model')(db), StudentFile: require('../src/models/studentFile.model')(db) };
    require('../src/models/registerStudentProfileAggregate').registerStudentProfileAggregate(models, db);
    models.Student.hasOne(models.StudentProfile, { foreignKey: 'student_id', as: 'profile' });
    let statement;
    db.query = async sql => { statement = sql; return null; }; // Query boundary only; never opens a connection.
    const options = f.lookupOptions[0];
    await models.Student.findByPk(f.a, { ...options, include: options.include.map(item => ({ ...item, model: models.StudentProfile })) });
    assert.ok(statement.includes('"Student"."faculty"')); assert.ok(statement.includes('"Student"."major"'));
    assert.ok(statement.includes('"profile"."prefix"')); assert.ok(statement.includes('"Student"."id" = "profile"."student_id"'));
    assert.ok(statement.includes('"Student"."id" = ')); assert.ok(statement.includes(f.a));
    for (const field of ['password_hash', 'national_id_ciphertext', 'student_line_id']) assert.equal(statement.includes(field), false);
  } finally { await db.close(); }
});

test('all database text is HTML escaped, Thai text stays readable and plain text matches decoded HTML values', async () => {
  const f = fixture(); Object.assign(f.students.get(f.a), { first_name: 'สมชาย <img src=x onerror="x">', last_name: "ใจดี & 'ทดสอบ'", major: '<script>test</script>', faculty: 'คณะ "A&B"', profile: { prefix: 'นาย<&>' } });
  await f.call('createMentor', { ...f.mentorData, first_name: '<b>พี่เลี้ยง</b>', last_name: 'A&B' });
  assertMail(f.mails[0], { mentor: '<b>พี่เลี้ยง</b> A&B', name: 'นาย<&>สมชาย <img src=x onerror="x"> ใจดี & \'ทดสอบ\'', major: '<script>test</script>', faculty: 'คณะ "A&B"' }, f.tokens[0].token);
  for (const tag of ['<script>', '<img ', '<b>']) assert.equal(f.mails[0].html.includes(tag), false);
  assert.ok(f.mails[0].html.includes('&quot;')); assert.ok(f.mails[0].html.includes('&#39;')); assert.ok(f.mails[0].html.includes('&amp;'));
});

test('missing or mismatched database owner never falls back to request data or sends another student', async () => {
  for (const mismatch of [false, true]) {
    const f = fixture(); if (mismatch) f.students.set(f.a, structuredClone(f.students.get(f.b))); else f.students.delete(f.a);
    const result = await f.call('createMentor', { ...f.mentorData, student_id: f.b, student: f.students.get(f.b) });
    assert.equal(result.code, 201); assert.equal(result.body.data.verification_email_sent, false); assert.equal(f.mails.length, 0);
    assert.equal(f.transactions[0].finished, 'commit'); assert.equal(f.mentors.get(f.a).student_id, f.a);
  }
  const other = fixture(); await other.call('createMentor');
  const res = await other.call('updateMyMentor', { ...other.mentorData, student_id: other.a }, other.b);
  assert.equal(res.code, 404); assert.equal(other.mails.length, 1); assert.deepEqual(other.lookups, [other.a]);
});

test('SMTP/query/token failures preserve existing response/commit behavior and never log token/JWT/verification URL', async () => {
  const f = fixture(), secret = 'synthetic-private-verification-value', jwt = 'synthetic.private.jwt', link = 'https://portal.example.invalid/verify?token=' + secret;
  f.fail(Error('Synthetic transport failure ' + secret + ' ' + jwt + ' ' + link));
  const created = await f.call('createMentor'); assert.equal(created.code, 201); assert.equal(created.body.data.verification_email_sent, false);
  const updated = await f.call('updateMyMentor'); assert.equal(updated.code, 200); assert.equal(updated.body.data.verification_email_sent, false);
  assert.ok(f.transactions.every(tx => tx.finished === 'commit'));
  f.failStudent(Error('Synthetic query failure ' + secret + ' ' + jwt + ' ' + link));
  const queryFailed = await f.call('updateMyMentor'); assert.equal(queryFailed.code, 200); assert.equal(queryFailed.body.data.verification_email_sent, false);
  assert.equal(f.transactions.at(-1).finished, 'commit'); assert.equal(f.mails.length, 2);
  f.failToken(Error('Synthetic token failure ' + secret + ' ' + jwt + ' ' + link));
  assert.equal((await f.call('updateMyMentor')).code, 500); assert.equal(f.transactions.at(-1).finished, 'rollback');
  const output = f.logs.join('\n'); for (const value of [secret, jwt, link, ...f.tokens.map(item => item.token)]) assert.equal(output.includes(value), false);
  assert.ok(f.logs.includes('MENTOR VERIFICATION EMAIL ERROR')); assert.ok(f.logs.includes('UPDATE MENTOR ERROR'));
  const createFailure = fixture(); createFailure.failToken(Error(secret + ' ' + link));
  assert.equal((await createFailure.call('createMentor')).code, 500); assert.equal(createFailure.transactions[0].finished, 'rollback');
  assert.equal(createFailure.logs.join('\n').includes(secret), false); assert.equal(createFailure.logs.join('\n').includes(link), false);
});

test('verification URL encoding is unchanged and company verification template keeps its existing contract', async () => {
  const h = emailHarness(), token = 'synthetic+/=?&value';
  await h.service.sendMentorVerificationEmail({ to: 'mentor@example.invalid', firstName: 'พี่เลี้ยง', lastName: 'ทดสอบ', token, student: { firstName: 'สมชาย', lastName: 'ใจดี', major: null, faculty: null } });
  assertMail(h.mails[0], { mentor: 'พี่เลี้ยง ทดสอบ', name: 'สมชาย ใจดี', major: 'ยังไม่ระบุ', faculty: 'ยังไม่ระบุ' }, token);
  await assert.rejects(() => h.service.sendMentorVerificationEmail({ to: 'mentor@example.invalid', token }));
  await h.service.sendCompanyVerificationEmail({ to: 'company@example.invalid', companyName: '<Company & Co>', token });
  assert.equal(h.mails[1].subject, 'ยืนยันอีเมลสำหรับประกาศรับนักศึกษาสหกิจศึกษา'); assert.ok(h.mails[1].html.includes('&lt;Company &amp; Co&gt;'));
  assert.equal(new URL(h.service.buildCompanyVerificationUrl(token)).searchParams.get('token'), token);
});
