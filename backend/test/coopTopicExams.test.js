const test = require('node:test'), assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const r = require('../src/services/coopTopicExam.rules');
const teacher = randomUUID();
const valid = () => ({ status: 'scheduled', starts_at: '2026-12-01T09:00:00+07:00', ends_at: '2026-12-01T10:00:00+07:00', mode: 'onsite', location: 'A101', meeting_url: '', notes: '', reason: '', committee: [{ teacher_id: teacher, role: 'chair' }] });
test('strict Bangkok dates/times and separate exam transitions', () => {
  assert.equal(r.schedule(valid()).status, 'scheduled');
  for (const starts_at of ['2026-02-30T09:00:00+07:00','2026-12-01T09:00','2026-13-01T09:00:00+07:00']) assert.throws(() => r.schedule({ ...valid(), starts_at }));
  assert.throws(() => r.schedule({ ...valid(), ends_at: valid().starts_at }));
  assert.throws(() => r.schedule(valid(), 'completed'));
  for (const status of ['rescheduled','cancelled']) assert.throws(() => r.schedule({ ...valid(), status }, 'scheduled'));
  assert.equal(r.schedule({ ...valid(), status: 'rescheduled', reason: 'ปรับกำหนดการ' }, 'scheduled').reason, 'ปรับกำหนดการ');
  assert.throws(() => r.schedule({ ...valid(), status: 'confirmed' }));
});
test('URL validation has no fetch and does not treat URL as file', () => {
  for (const url of ['http://example.com','javascript:alert(1)','data:text/plain,a','https://u:p@example.com','https://example.com/ a','https://' + 'a'.repeat(2100)]) assert.throws(() => r.httpsUrl(url));
  assert.equal(r.httpsUrl('https://example.com/co09.pdf'), 'https://example.com/co09.pdf'); assert.equal(r.httpsUrl(''), '');
});
test('PDF validates MIME extension signature length; revision requires exact If-Match', () => {
  const file = { originalname: 'CO-09.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n%%EOF') };
  r.pdf(file);
  for (const changed of [{ originalname: 'co09.exe' }, { mimetype: 'text/plain' }, { buffer: Buffer.from('not PDF') }, { buffer: Buffer.alloc(r.MAX_PDF_BYTES+1) }]) assert.throws(() => r.pdf({ ...file, ...changed }));
  assert.throws(() => r.revision(undefined,0), error => error.status === 428);
  assert.throws(() => r.revision('"1"',2), error => error.status === 409); r.revision('"0"',0);
});
test('duplicate committee, unauthorized fields and unsupported modes fail; no invented academic count', () => {
  assert.throws(() => r.schedule({ ...valid(), committee: [...valid().committee, ...valid().committee] }));
  assert.throws(() => r.schedule({ ...valid(), student_id: randomUUID() }));
  assert.throws(() => r.schedule({ ...valid(), mode: 'hybrid' }));
  assert.equal(r.schedule({ ...valid(), committee: [] }).committee.length, 0);
});
test('capability policy preserves development restriction and denies ordinary teachers/students', async () => {
  const { manager, CAPABILITY } = require('../src/services/coopTopicExam.policy');
  const models = { DepartmentStaff: { findOne: async () => ({ id: randomUUID() }) } };
  for (const actor_type of ['teacher','student']) await assert.rejects(manager({ user: { actor_type, role: actor_type, id: teacher } }, models), error => error.status === 403);
  const id = randomUUID(); assert.equal(await manager({ user: { actor_type: 'department_staff', role: 'department_staff', staff_id: id, id } }, models), `department_staff:${id}`);
  const before = process.env.NODE_ENV; process.env.NODE_ENV = 'development';
  try {
    await assert.rejects(manager({ user: {}, superAdmin: { id, is_active: true, permissions: [] } }, models));
    assert.equal(await manager({ user: {}, superAdmin: { id, is_active: true, permissions: [CAPABILITY] } }, models), `super_admin:${id}`);
    process.env.NODE_ENV = 'production'; await assert.rejects(manager({ user: {}, superAdmin: { id, is_active: true, permissions: [CAPABILITY] } }, models));
  } finally { if (before === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = before; }
});
