const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const path = require('node:path');
const { Op } = require('sequelize');
const { randomUUID } = require('node:crypto');

// Real controllers/policies, strictly injected in-memory persistence. Never load models/config.
function isolated(file, dependencies = {}, globals = {}) {
  const filename = path.resolve(__dirname, '../src', file), module = { exports: {} };
  const localRequire = createRequire(filename);
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports,
    Buffer, console, Date, process: { env: { NODE_ENV: 'production' } },
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      assert.ok(!name.startsWith('.'), `Uninjected dependency: ${file}: ${name}`);
      return localRequire(name);
    }, ...globals }, { filename });
  return module.exports;
}
const response = () => ({ code: 200, set() { return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
function matches(row, condition) {
  return Reflect.ownKeys(condition).every(key => {
    const value = condition[key];
    if (key === Op.and) return value.every(part => matches(row, part));
    if (key === Op.or) return value.some(part => matches(row, part));
    if (value && typeof value === 'object') return Reflect.ownKeys(value).every(op => {
      if (op === Op.notIn) return !value[op].includes(row[key]);
      if (op === Op.gt) return row[key] != null && new Date(row[key]) > value[op];
      throw Error(`Unsupported fixture operator ${String(op)}`);
    });
    return row[key] === value;
  });
}
function fixture({ development = false, expireDuringLock = false } = {}) {
  let now = Date.UTC(2026, 10, 13, 12), writes = 0, created;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const data = isolated('services/internthDevelopmentData.js', {}, { process: { env: { NODE_ENV: development ? 'development' : 'production' } } });
  const database = { config: { database: 'intern_system', host: 'localhost', port: 5432 } };
  const policy = isolated('services/jobEligibility.js', { './internthDevelopmentData': data, '../config/database': database }, { Date: Clock });
  const company = { id: randomUUID(), name: 'Fixture company', province: 'กรุงเทพมหานคร', address_no: 'Fixture' };
  const hidden = { ...company, id: data.companyId('itsmart'), name: 'Development fixture' };
  const companies = [company, hidden];
  const job = { id: randomUUID(), title: 'Backend Developer', company_id: company.id, company, status: 'published', expires_at: new Date(now + 1000) };
  job.get = () => ({ ...job });
  const student = { id: randomUUID(), major: 'IT', track: 'co_op', status: 'searching' };
  const transaction = { LOCK: { SHARE: 'SHARE', UPDATE: 'UPDATE' }, async commit() { this.finished = true; }, async rollback() { this.finished = true; } };
  const models = {
    Company: { async findOne({ where }) { return companies.find(row => matches(row, where)) || null; } },
    JobPosting: { async findByPk(id) { return id === job.id ? job : null; }, async findOne({ where, include }) {
      return matches(job, where) && matches(job.company, include[0].where) ? job : null;
    } },
    Student: { async findByPk(id) { assert.equal(id, student.id); if (expireDuringLock) now += 1000; return student; } },
    CoopRequest: { async findOne({ where }) { return where.id && created?.student_id === where.student_id ? created : null; },
      async create(values) { writes++; created = { id: randomUUID(), ...values }; return created; },
      async findAll({ where }) { return created && created.student_id === where.student_id ? [created] : []; } },
    CoopRequestDeliveryMethod: { async bulkCreate() { writes++; } },
    CoopRequestPrerequisiteCourse: { async bulkCreate() { writes++; } }, CoopRequestReview: { async create() { writes++; } },
    sequelize: { ...database, async transaction() { return transaction; } },
  };
  const auth = isolated('services/unifiedAuth.service.js', Object.fromEntries([
    './teacherAuth.service', './staffAuth.service', './superAdminAuth.service', './adminAccountAccess.service', './teacherAdminGrant.service',
  ].map(name => [name, {}])));
  const controller = isolated('controllers/coopRequest.controller.js', {
    '../models': models, '../services/internthDevelopmentData': data, '../services/jobEligibility': policy,
    '../services/coopPrerequisites': { normalizePrerequisites: () => [], prerequisiteInclude: () => ({}) },
    '../services/coopAcademic.service': { createAcademicService: () => ({ attach: async rows => rows, ready: async () => true }) },
    '../services/coopClassAdvisor.service': { requireClassAdvisor: async () => ({}) },
    '../services/coopPrerequisiteCatalog.service': { readStudentCatalog: async () => ({ revision: 'fixture', courses: [] }) },
    '../services/coopDepartmentHead.service': { readDepartmentHead: async () => null }, '../services/unifiedAuth.service': auth,
  }, { Date: Clock });
  const req = { user: { id: student.id }, params: { id: job.id }, query: {}, body: {
    company_id: company.id, job_posting_id: job.id, company_name: 'Untrusted client name', company_province: 'Fixture', company_address: 'Client address',
    letter_recipient_name: 'Fixture', work_start_date: '2026-12-01', work_end_date: '2027-03-31', delivery_methods: ['email'], prerequisite_courses: [],
  } };
  return { data, database, policy, companies, company, hidden, job, student, req, controller, get writes() { return writes; },
    async submit() { const res = response(); await controller.createCoopRequest(req, res); return res; },
    async readJob() { const res = response(); await controller.getPublishedJobPostingForCoopRequest(req, res); return res; } };
}

test('direct company ID: hidden and missing have identical responses; never substitute another visible company', async () => {
  const f = fixture(); delete f.req.body.job_posting_id;
  f.req.body.company_id = f.hidden.id; const hidden = await f.submit();
  f.req.body.company_id = randomUUID(); const missing = await f.submit();
  assert.equal(hidden.code, 404); assert.equal(hidden.body.code, 'COMPANY_UNAVAILABLE');
  assert.deepEqual(hidden.body, missing.body); assert.equal(f.writes, 0);
});
test('job-only and both IDs enforce company visibility and relationship', async () => {
  for (const mode of ['job', 'both']) {
    const f = fixture(); f.job.company_id = f.hidden.id; f.job.company = f.hidden;
    if (mode === 'job') delete f.req.body.company_id; else f.req.body.company_id = f.hidden.id;
    assert.equal((await f.submit()).body.code, 'COMPANY_UNAVAILABLE'); assert.equal(f.writes, 0);
  }
  const f = fixture(); f.job.company_id = randomUUID();
  assert.equal((await f.submit()).body.code, 'JOB_COMPANY_MISMATCH'); assert.equal(f.writes, 0);
});
test('published read and submit share publication, NULL deadline, expiry and hidden job policy', async () => {
  for (const patch of [{ status: 'draft' }, { expires_at: new Date('2026-11-13T12:00:00Z') },
    { expires_at: new Date('2026-11-12') }, { id: fixture().data.jobId(16858) }]) {
    const f = fixture(); Object.assign(f.job, patch); f.req.params.id = f.req.body.job_posting_id = f.job.id;
    assert.equal((await f.readJob()).code, 404); assert.equal((await f.submit()).body.code, 'JOB_POSTING_UNAVAILABLE'); assert.equal(f.writes, 0);
  }
  const f = fixture(); f.job.expires_at = null;
  assert.equal((await f.readJob()).code, 200); assert.equal((await f.submit()).code, 201);
  const waiting = fixture({ expireDuringLock: true }); assert.equal((await waiting.submit()).body.code, 'JOB_POSTING_UNAVAILABLE'); assert.equal(waiting.writes, 0);
});
test('published read conceals hidden associated company and unknown ID identically; malformed IDs return 400', async () => {
  const f = fixture(); f.job.company = f.hidden;
  const hidden = await f.readJob(); f.req.params.id = randomUUID();
  assert.equal(hidden.code, 404); assert.deepEqual(hidden.body, (await f.readJob()).body);
  f.req.params.id = 'bad'; assert.equal((await f.readJob()).body.code, 'COOP_REFERENCE_INVALID');
  f.req.body.company_id = 'bad'; assert.equal((await f.submit()).code, 400); assert.equal(f.writes, 0);
});
test('visible company-only, job-only and both canonicalize snapshot and keep authenticated ownership', async () => {
  for (const mode of ['company', 'job', 'both']) {
    const f = fixture(); if (mode === 'company') delete f.req.body.job_posting_id; if (mode === 'job') delete f.req.body.company_id;
    const res = await f.submit(); assert.equal(res.code, 201); assert.equal(res.body.data.student_id, f.student.id);
    assert.equal(res.body.data.company_name, f.company.name); assert.equal(res.body.data.company_id, f.company.id);
    assert.match(res.body.data.company_address, /ข้อมูลที่อยู่ยังไม่ได้รับการยืนยัน/);
    const saved = res.body.data.company_address; f.company.address_no = 'Changed after submission';
    const read = response(); await f.controller.getMyCoopRequests(f.req, read); assert.equal(read.body.data[0].company_address, saved);
  }
});
test('manual company input, account guards and rejected owner injection remain intact', async () => {
  const f = fixture(); delete f.req.body.company_id; delete f.req.body.job_posting_id;
  const res = await f.submit(); assert.equal(res.code, 201); assert.equal(res.body.data.company_address, 'Client address');
  const disabled = fixture(); disabled.student.status = 'inactive'; assert.equal((await disabled.submit()).code, 403); assert.equal(disabled.writes, 0);
  const injection = fixture(); injection.req.body.student_id = randomUUID(); assert.equal((await injection.submit()).code, 400); assert.equal(injection.writes, 0);
});
test('new Development snapshots retain synthetic label; Focal address is source-backed only while exact fields agree', async () => {
  const f = fixture({ development: true }); f.req.body.company_id = f.hidden.id; delete f.req.body.job_posting_id;
  const res = await f.submit(); assert.equal(res.code, 201); assert.match(res.body.data.company_address, /^ข้อมูลจำลองสำหรับ Development:/);
  const focal = { ...f.data.FOCAL_SOURCE, id: f.data.companyId('focal'), name: f.data.FOCAL_SOURCE.company_name };
  const snapshot = f.data.companyRequestAddress(focal); assert.match(snapshot, /https:\/\/focalsolution.com\//); assert.match(snapshot, /ไม่ยืนยันการเปิดรับ/); assert.doesNotMatch(snapshot, /ข้อมูลจำลอง/);
  focal.moo = 'Unverified extra'; assert.equal(f.data.companyAddressProvenance(focal).classification, 'SYNTHETIC'); delete focal.moo;
  focal.address_no = 'Changed'; assert.equal(f.data.companyAddressProvenance(focal).classification, 'SYNTHETIC');
});
test('field provenance distinguishes missing, synthetic, unverified and exact source-backed Focal contact', () => {
  const f = fixture({ development: true });
  const sample = f.data.jobDisplayInformation({ id: f.data.jobId(10323), company: { ...f.hidden, phone: 'sample', email: 'sample@example.test' } }, f.database);
  assert.equal(sample.contact.provenance.phone, 'SYNTHETIC'); assert.equal(sample.contact.email_verified, false);
  const ordinary = f.data.jobDisplayInformation({ company: { phone: 'fixture', email: 'fixture@company.invalid-domain' } }, f.database);
  assert.equal(ordinary.contact.provenance.phone, 'UNVERIFIED'); assert.equal(ordinary.contact.provenance.office_address, 'MISSING');
  const focal = f.data.jobDisplayInformation({ id: f.data.jobId(16858), description: f.data.FOCAL_PROVENANCE_LINE,
    company: { ...f.data.FOCAL_SOURCE, id: f.data.companyId('focal'), name: f.data.FOCAL_SOURCE.company_name } }, f.database);
  assert.equal(focal.contact.provenance.phone, 'VERIFIED_SOURCE'); assert.equal(focal.contact.email_verified, false);
  assert.equal(focal.hiring_status, 'UNKNOWN / UNVERIFIED');
});

const filters = require('../src/services/jobSearchFilters');
test('search filters use 5 stored categories, 16 specializations and parameterized AND conditions', () => {
  assert.equal(filters.CATEGORIES.length, 5); assert.equal(Object.keys(filters.SPECIALIZATIONS).length, 16);
  const conditions = filters.jobSearchConditions({ q: '100%_', category: 'information_technology', specialization: 'network', province: 'จ. กรุงเทพมหานคร' });
  assert.equal(conditions.length, 4); assert.equal(conditions[0][Op.or][0].title[Op.iLike], '%100\\%\\_%');
  assert.equal(conditions[1].category, 'information_technology'); assert.equal(conditions[2][Op.or][0].title[Op.iRegexp], filters.specializationPattern('network'));
  assert.equal(conditions[3].logic[Op.in][0], 'กรุงเทพมหานคร');
  assert.equal(filters.jobSearchConditions({ specialization: 'other' })[0].category, 'other');
});
test('keyword boundaries avoid AI/UI/QA fragments, use title/description aliases and normalize provinces without writes', () => {
  const regex = key => new RegExp(filters.specializationPattern(key).replaceAll('[:alnum:]', '\\p{L}\\p{N}'), 'iu');
  assert.equal(regex('ai_ml').test('Email operations'), false); assert.equal(regex('ai_ml').test('AI Engineer'), true);
  assert.equal(regex('ui_ux').test('Build engineer'), false); assert.equal(regex('software_testing').test('QA engineer'), true);
  assert.equal(regex('network').test('Network Engineer'), true); assert.equal(regex('system_administration').test('System Admin'), true);
  assert.equal(regex('cloud_devops').test('Cloud DevOps'), true);
  for (const value of ['จังหวัด กรุงเทพมหานคร', 'จ. กทม.', 'กรุงเทพฯ', 'กรุงเทพ']) assert.equal(filters.normalizeProvince(value), 'กรุงเทพมหานคร');
  assert.equal(filters.normalizeProvince('จังหวัด เชียงราย'), 'เชียงราย'); assert.equal(filters.normalizeProvince('ทุกจังหวัด'), '');
});
test('unknown/array/object/oversized filter inputs fail closed with 400 and specific code', () => {
  for (const query of [{ category: 'network' }, { specialization: '__proto__' }, { specialization: 'invalid' }, { q: ['SQL'] }, { province: {} }, { q: 'x'.repeat(256) }, { q: '\u0000' }]) {
    assert.throws(() => filters.jobSearchConditions(query), error => error.status === 400 && error.code === 'JOB_FILTER_INVALID');
  }
});
test('actual browse controller combines keyword/category/specialization/province with filtered totals and pagination', async () => {
  const f = fixture(), regex = value => new RegExp(value.replaceAll('[:alnum:]', '\\p{L}\\p{N}'), 'iu');
  const rows = Array.from({ length: 15 }, (_, index) => ({ id: randomUUID(), company_id: f.company.id, company: { ...f.company, province: 'จังหวัด กรุงเทพมหานคร' },
    title: 'Network Engineer', description: 'TCP/IP and networking', category: 'information_technology', status: 'published', expires_at: null, workModes: [], ...index === 14 ? { title: 'IT Support', description: 'Helpdesk user support' } : {} }));
  rows.push({ ...rows[0], id: randomUUID(), title: 'Cybersecurity', description: 'Firewall SIEM', company: { ...f.company, province: 'เชียงราย' } },
    { ...rows[0], id: randomUUID(), title: 'Software Engineer', description: 'Programming' },
    { ...rows[0], id: randomUUID(), company: { ...f.hidden } },
    { ...rows[0], id: randomUUID(), status: 'draft' });
  function searchMatch(row, condition) {
    if (condition.attribute) return condition.logic[Op.in].includes(filters.normalizeProvince(row.company.province));
    return Reflect.ownKeys(condition).every(key => {
      const value = condition[key];
      if (key === Op.and) return value.every(part => searchMatch(row, part));
      if (key === Op.or) return value.some(part => searchMatch(row, part));
      const actual = key === '$company.name$' ? row.company.name : row[key];
      if (value && typeof value === 'object' && value[Op.iLike]) return String(actual).toLowerCase().includes(value[Op.iLike].slice(1, -1).replace(/\\(.)/g, '$1').toLowerCase());
      if (value && typeof value === 'object' && value[Op.iRegexp]) return regex(value[Op.iRegexp]).test(actual);
      return matches(row, { [key]: value });
    });
  }
  let calls = 0;
  const controller = isolated('controllers/jobMatching.controller.js', {
    '../models': { Company: {}, JobPostingWorkMode: {}, JobPosting: { sequelize: f.database, async findAndCountAll(options) {
      calls++; assert.equal(options.include[0].required, true); assert.equal(options.limit, 12);
      const found = rows.filter(row => searchMatch(row, options.where) && matches(row.company, options.include[0].where));
      return { count: found.length, rows: found.slice(options.offset, options.offset + options.limit) };
    } } }, '../services/internthDevelopmentData': f.data, '../services/jobEligibility': f.policy,
    '../services/jobSearchFilters': filters, '../services/nlpMatching.client': {}, '../services/resumeText.service': {},
    '../services/jobMatchingProfile.service': {}, '../services/jobMatchingExplanation.service': {},
  });
  const req = { query: { q: 'network', category: 'information_technology', specialization: 'network', province: 'จ. กทม.', page: '1' } };
  let res = response(); await controller.listPublishedJobs(req, res); assert.equal(res.code, 200); assert.equal(res.body.total, 14); assert.equal(res.body.jobs.length, 12);
  req.query.page = '2'; res = response(); await controller.listPublishedJobs(req, res); assert.equal(res.body.total, 14); assert.equal(res.body.jobs.length, 2); assert.equal(res.body.page, 2);
  for (const [specialization, province, total] of [['cybersecurity', 'เชียงราย', 1], ['it_support', 'กรุงเทพมหานคร', 1], ['software_development', 'กรุงเทพมหานคร', 1], ['network', 'ภูเก็ต', 0]]) {
    req.query = { specialization, province }; res = response(); await controller.listPublishedJobs(req, res); assert.equal(res.body.total, total); assert.equal(res.body.jobs.length, total);
  }
  const before = calls; req.query = { specialization: 'invalid' }; res = response(); await controller.listPublishedJobs(req, res);
  assert.equal(res.code, 400); assert.equal(res.body.code, 'JOB_FILTER_INVALID'); assert.equal(calls, before);
});
test('advisor confirmed guard preserves confirmed request, timestamp and active pointer while schema blocks reassignment', async () => {
  const owner = { id: randomUUID(), track: 'co_op', coop_advisor_teacher_id: randomUUID() };
  const current = { status: 'confirmed', confirmed_at: new Date('2026-11-01'), async update() { assert.fail('Must not supersede confirmed history'); } };
  const service = isolated('services/coopProjectAdvisor.service.js', {
    '../validators/roleWorkflow.validator': require('../src/validators/roleWorkflow.validator'),
    './adminAccountAccess.service': {}, './teacherSearch.service': {},
  }).createCoopProjectAdvisorService({ Student: { findByPk: async () => owner }, CoopProjectAdvisorRequest: { findOne: async () => current, create: async () => assert.fail('Must not insert pending request') },
    sequelize: { transaction: async callback => callback({ LOCK: { UPDATE: 'UPDATE' } }) } });
  const pointer = owner.coop_advisor_teacher_id;
  await assert.rejects(service.select(owner.id, { teacher_id: randomUUID() }), error => error.code === 'ADVISOR_CONFIRMED' && error.status === 409);
  assert.equal(owner.coop_advisor_teacher_id, pointer); assert.equal(current.confirmed_at.toISOString(), '2026-11-01T00:00:00.000Z'); assert.equal(current.status, 'confirmed');
});
