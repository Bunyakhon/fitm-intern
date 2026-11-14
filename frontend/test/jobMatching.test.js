import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { addressOptions } from '../src/pages/studentProfileAddress.js';

// Only in-memory DOM/model/API substitutes. No accounts, DB connections or writes.
const dashboard = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
const cards = fs.readFileSync(new URL('../src/pages/studentJobRecommendations.js', import.meta.url), 'utf8').replace(/^export /gm, '');
const start = dashboard.indexOf('const jobMatchingSkillsBtn =');
const block = dashboard.slice(start, dashboard.lastIndexOf('// ==============================', dashboard.indexOf('// Resume', start)));
const savedSource = () => ({ major: 'INE', related_skills: null, computer_skills: [{ id: 'skill', skill_name: 'JavaScript', proficiency: 'good', proficiency_label: 'ดี' }] });
const job = { job_posting_id: '00000000-0000-4000-8000-000000000001', title: 'Frontend', description: 'JavaScript',
  company: { id: 'company', name: 'Company' }, selectable: true, development_data: true,
  contact: { synthetic: true, samples_visible: false }, explanation: { exact_skill_matches: [{ skill_name: 'JavaScript' }] } };
const result = (matches = [], count = 18) => ({ matches, matching_source: savedSource(), matching_analysis: { computed: count > 0, candidate_job_count: count, min_score: 0.05, top_k: 10 } });
const walk = node => [node, ...node.children.flatMap(walk)];

function frontend({ match = async () => result(), source = async () => ({ matching_source: savedSource() }), browse = async () => ({ jobs: [job], total: 18, page: 1, limit: 12 }), canWrite = true } = {}) {
  class Element {
    constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.children = []; this.textContent = ''; this.className = ''; this.attributes = {}; this.dataset = {}; this.style = {}; this.events = {}; this.hidden = false;
      this.classList = { contains: name => this.className.split(' ').includes(name), add: name => { if (!this.classList.contains(name)) this.className += ' ' + name; }, remove: name => { this.className = this.className.split(' ').filter(value => value !== name).join(' '); } }; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; this.textContent = ''; }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener(type, listener) { this.events[type] = listener; }
    querySelector(selector) { return this.children.find(child => child.tagName === (selector.startsWith('button') ? 'BUTTON' : selector.toUpperCase())); }
  }
  const nodes = new Map([...block.matchAll(/getElementById\("([^"]+)"\)/g)].map(([, id]) => [id, new Element()]));
  const document = { getElementById: id => nodes.get(id), createElement: tag => new Element(tag), createTextNode: text => Object.assign(new Element('#text'), { textContent: text }),
    events: {}, addEventListener(type, listener) { this.events[type] = listener; } };
  nodes.get('panel-job-matching').className = 'active';
  nodes.get('jobMatchingEmpty').append(new Element('h4'), new Element('p'));
  nodes.get('jobBrowserForm').append(new Element('button'));
  nodes.get('jobBrowserForm').filters = { q: '', category: '', province: '' };
  nodes.get('jobMatchingSkillsBtn').textContent = 'วิเคราะห์จากทักษะ'; nodes.get('jobMatchingResumeBtn').textContent = 'วิเคราะห์จาก Resume';
  let token = 'session-a'; const requested = [];
  const context = { document, addressOptions, currentStudent: {}, canUseCoopFeatures: () => canWrite, getStudentToken: () => token,
    getMyJobMatches: async options => { requested.push(options); return match(options); }, getMyJobMatchingSource: source, getPublishedJobs: browse,
    setText: (node, text) => { if (node) node.textContent = text; },
    clearMessage: node => { node.textContent = ''; node.messageType = null; }, showMessage: (node, text, type) => { node.textContent = text; node.messageType = type; },
    setButtonLoading: (node, busy) => { node.disabled = busy; }, clearAuthentication() {}, redirectToLogin() {}, URL,
    FormData: class { constructor(form) { this.fields = form.filters; } get(key) { return this.fields[key]; } },
    window: { clearInterval() {}, clearTimeout() {} } };
  vm.runInNewContext(cards + '\n' + block, context);
  return { context, document, node: id => nodes.get(id), requested, setToken: value => { token = value; } };
}

test('18 eligible jobs with no qualifying scores show info, the threshold explanation and browse guidance without fake cards', async () => {
  const h = frontend(); await h.context.loadJobBrowser(); await h.context.loadJobMatches('skills');
  assert.equal(h.node('jobMatchingResults').children.length, 0); assert.equal(h.node('jobMatchingEmpty').hidden, false);
  assert.equal(h.node('jobMatchingMessage').messageType, 'info');
  assert.equal(h.node('jobMatchingMessage').textContent, 'วิเคราะห์เสร็จแล้ว แต่ยังไม่มีประกาศที่มีคะแนนความสอดคล้องของข้อความถึงเกณฑ์แนะนำ');
  assert.match(h.node('jobMatchingEmpty').querySelector('p').textContent, /ตรวจสอบทักษะ.*ค้นหาประกาศทั้งหมดด้านล่าง/);
  assert.equal(h.node('jobMatchingResultSource').textContent, 'วิเคราะห์จาก: ทักษะ');
  assert.equal(h.node('jobBrowserResults').children.length, 1); assert.match(h.node('jobBrowserMessage').textContent, /18/);
  assert.equal(h.node('jobMatchingResults').attributes['aria-busy'], 'false'); assert.equal(h.node('jobMatchingSkillsBtn').disabled, false);
});

test('zero candidate jobs show a different not-computed state and a later retry can show real ranked results', async () => {
  let response = result([], 0); const h = frontend({ match: async () => response });
  await h.context.loadJobMatches('skills');
  assert.equal(h.node('jobMatchingMessage').textContent, 'ยังไม่มีประกาศที่พร้อมวิเคราะห์'); assert.equal(h.node('jobMatchingMessage').messageType, 'info');
  assert.equal(h.node('jobMatchingEmpty').querySelector('h4').textContent, 'ยังไม่มีประกาศที่พร้อมวิเคราะห์');
  response = result([{ ...job, score: 0.0861, rank: 1 }]); await h.context.loadJobMatches('skills');
  assert.equal(h.node('jobMatchingEmpty').hidden, true); assert.equal(h.node('jobMatchingResults').children.length, 1);
  assert.equal(h.node('jobMatchingMessage').messageType, 'success'); assert.match(h.node('jobMatchingMessage').textContent, /1 ตำแหน่ง/);
  const rendered = walk(h.node('jobMatchingResults')).map(node => node.textContent);
  for (const value of ['#1', 'Frontend', 'Company', '8.6%', 'JavaScript', 'รายละเอียดงาน', 'ดูช่องทางติดต่อสถานประกอบการ', 'เขียนคำร้องสหกิจศึกษา']) assert.ok(rendered.includes(value), value);
  assert.ok(rendered.some(text => /Development/.test(text)));
  assert.equal(walk(h.node('jobMatchingResults')).filter(node => node.tagName === 'A').length, 0);
  assert.equal(h.node('jobMatchingRetry').hidden, true);
});

test('NLP unavailable, invalid response, timeout and analysis errors show error/retry without success or recommendations', async () => {
  for (const status of [503, 502, 504, 500]) {
    let offline = true; const h = frontend({ match: async () => { if (offline) throw Object.assign(Error('offline'), { status }); return result(); } });
    await h.context.loadJobMatches('resume'); assert.equal(h.node('jobMatchingMessage').messageType, 'error');
    assert.equal(h.node('jobMatchingRetry').hidden, false); assert.equal(h.node('jobMatchingResults').children.length, 0);
    assert.equal(h.node('jobMatchingEmpty').hidden, true); assert.equal(h.node('jobMatchingResumeBtn').disabled, false);
    if (status === 503) assert.match(h.node('jobMatchingMessage').textContent, /ไม่พร้อมใช้งาน/);
    if (status === 500) assert.match(h.node('jobMatchingMessage').textContent, /การวิเคราะห์เกิดข้อผิดพลาด/);
    offline = false; await h.node('jobMatchingRetry').events.click();
    await new Promise(resolve => setImmediate(resolve)); assert.equal(h.node('jobMatchingMessage').messageType, 'info');
    assert.deepEqual(h.requested.map(options => options.source), ['resume', 'resume']);
  }
});

test('session changes, saved profile refreshes and stale responses cannot render another account or old saved skills', async () => {
  for (const invalidate of ['session', 'saved']) {
    let finish; const h = frontend({ match: () => new Promise(resolve => { finish = resolve; }) });
    const pending = h.context.loadJobMatches('skills');
    if (invalidate === 'session') h.setToken('session-b'); else h.document.events['student-profile-state']({ detail: { outcome: 'saved' } });
    finish(result([{ ...job, score: 0.5, rank: 1 }])); await pending;
    assert.equal(h.node('jobMatchingResults').children.length, 0); assert.notEqual(h.node('jobMatchingMessage').messageType, 'success');
  }
  let version = 0; const h = frontend({ match: async () => ({ ...result(), matching_source: { ...savedSource(), related_skills: 'saved-' + ++version } }) });
  await h.context.loadJobMatches('skills'); await h.context.loadJobMatches('skills');
  assert.ok(walk(h.node('jobMatchingSkills')).some(node => node.textContent.includes('saved-2')));
});

test('browse filters, resume source and write permission remain separate from scored recommendations', async () => {
  let filters; const h = frontend({ canWrite: false, browse: async query => { filters = query; return { jobs: [job], total: 18, page: query.page, limit: 12 }; }, match: async () => result([{ ...job, score: 0.5, rank: 1 }]) });
  h.node('jobBrowserForm').filters.category = 'information_technology'; await h.context.loadJobBrowser(2);
  assert.equal(filters.category, 'information_technology'); assert.equal(filters.page, 2);
  assert.equal(walk(h.node('jobBrowserResults')).some(node => node.attributes.role === 'progressbar'), false);
  await h.context.loadJobMatches('resume'); assert.equal(h.requested[0].source, 'resume');
  assert.equal(h.node('jobMatchingResultSource').textContent, 'วิเคราะห์จาก: Resume');
  assert.equal(walk(h.node('jobMatchingResults')).find(node => node.className.includes('job-matching-coop-request')).disabled, true);
});

test('matching API adapters keep GET browse filters separate from the skills/resume POST contract', async () => {
  const calls = [], context = { URLSearchParams, apiRequest: async (...args) => { calls.push(args); return {}; } };
  const source = fs.readFileSync(new URL('../src/api/jobMatching.api.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  vm.runInNewContext(source, context);
  await context.getMyJobMatches({ source: 'skills' }); await context.getMyJobMatches({ source: 'resume' });
  await context.getPublishedJobs({ q: 'JavaScript', category: 'information_technology', page: 2 });
  assert.deepEqual(calls.map(([url, options]) => [url, options.method]), [['/api/job-matches/me?source=skills', 'POST'], ['/api/job-matches/me?source=resume', 'POST'], ['/api/job-matches/me/jobs?q=JavaScript&category=information_technology&province=&page=2', 'GET']]);
});

const backendRequire = createRequire(new URL('../../backend/src/controllers/jobMatching.controller.js', import.meta.url));
function backendModule(relative, dependencies = {}) {
  const location = new URL('../../backend/src/' + relative, import.meta.url), module = { exports: {} };
  const require = createRequire(location);
  vm.runInNewContext(fs.readFileSync(location, 'utf8'), { module, exports: module.exports, console,
    require: name => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name) });
  return module.exports;
}
const fakeDatabase = { config: { database: 'fixture', host: 'localhost', port: 5432 } };
const policy = backendRequire('../services/jobEligibility');
const response = () => ({ code: 200, set() { return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('actual matching controller sends all 18 eligible jobs, keeps zero or fewer-than-10 scores and rereads saved skills', async () => {
  let text = 'Express JavaScript HTML/CSS', replies = [], sent = [], resumeReads = 0;
  const rows = Array.from({ length: 18 }, (_, index) => ({ ...job, id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` }));
  const models = { JobPosting: { sequelize: fakeDatabase, findAll: async options => { assert.equal(options.where.status, 'published'); return rows; } }, Student: {}, StudentProfile: {}, StudentSkill: {}, StudentFile: {} };
  const controller = backendModule('controllers/jobMatching.controller.js', { '../models': models,
    '../services/jobEligibility': { publishedJobWhere: now => policy.publishedJobWhere(now, fakeDatabase) } });
  const handler = controller.createJobMatchingHandler({ StudentModel: { findByPk: async () => ({ major: 'INE', profileSkills: [{ category: 'computer', skill_name: text, proficiency: 'very_good' }] }) },
    StudentFileModel: { findOne: async () => { resumeReads++; return { extraction_status: 'ready', extracted_text: 'JavaScript software development experience portfolio '.repeat(3) }; } },
    callNlp: async payload => { sent.push(payload); return { schema_version: 'job-matching.v1', matches: replies }; } });
  const req = { user: { id: 'fixture' }, query: { source: 'skills' } };
  let res = response(); await handler(req, res);
  assert.equal(res.code, 200); assert.equal(res.body.matching_analysis.candidate_job_count, 18); assert.equal(res.body.matches.length, 0);
  assert.equal(sent[0].jobs.length, 18); assert.equal(sent[0].candidate.text, text); assert.equal(resumeReads, 0);
  assert.equal(sent[0].options.min_score, 0.05); assert.equal(sent[0].options.top_k, 10);
  assert.equal(res.body.matching_analysis.program.used_as_text, false); assert.equal(res.body.matching_analysis.proficiency_used_for_score, false);
  text = 'JavaScript'; replies = [{ job_posting_id: rows[0].id, score: 0.0861, rank: 1 }];
  res = response(); await handler(req, res); assert.equal(res.body.matches.length, 1); assert.equal(res.body.matches[0].score, 0.0861); assert.equal(sent[1].candidate.text, text);
  req.query.source = 'resume'; res = response(); await handler(req, res);
  assert.equal(res.code, 200); assert.equal(resumeReads, 1); assert.match(sent[2].candidate.text, /experience portfolio/);
  assert.equal(res.body.matching_analysis.profile_used, false); assert.equal(res.body.matching_analysis.resume_used, true);
  for (const matches of [[{ job_posting_id: rows[0].id, score: 0.0499, rank: 1 }], [{ job_posting_id: rows[0].id, score: 0.5, rank: 2 }], [{ job_posting_id: rows[0].id, score: 0.5, rank: 1 }, { job_posting_id: rows[1].id, score: 0.6, rank: 2 }]]) {
    assert.throws(() => controller.validateNlpResponse({ schema_version: 'job-matching.v1', matches }, new Set(rows.map(row => row.id))));
  }
});

test('actual matching controller skips NLP when no jobs exist and preserves NLP unavailable errors', async () => {
  let jobs = [], calls = 0;
  const models = { JobPosting: { sequelize: fakeDatabase, findAll: async () => jobs }, Student: {}, StudentProfile: {}, StudentSkill: {}, StudentFile: {} };
  const controller = backendModule('controllers/jobMatching.controller.js', { '../models': models });
  const handler = controller.createJobMatchingHandler({ StudentModel: { findByPk: async () => ({ profile: { related_skills: 'JavaScript' } }) },
    callNlp: async () => { calls++; throw Object.assign(Error('offline'), { status: 503, code: 'NLP_MATCHING_UNAVAILABLE' }); } });
  const req = { user: { id: 'fixture' }, query: { source: 'skills' } };
  let res = response(); await handler(req, res); assert.equal(calls, 0); assert.equal(res.body.matching_analysis.computed, false); assert.equal(res.body.matches.length, 0);
  jobs = [{ ...job, id: job.job_posting_id }]; res = response(); await handler(req, res);
  assert.equal(calls, 1); assert.equal(res.code, 503); assert.equal(res.body.code, 'NLP_MATCHING_UNAVAILABLE');
});

test('province picker reuses 77 Thai provinces plus all and preserves searchable native control', () => {
  const h = frontend(), names = h.node('jobProvinceOptions').children.map(node => node.value);
  assert.equal(names.length, 78); assert.equal(new Set(names).size, 78);
  assert.ok(names.includes('ทุกจังหวัด')); assert.ok(names.includes('กรุงเทพมหานคร')); assert.ok(names.includes('เชียงราย')); assert.ok(names.includes('ภูเก็ต'));
  assert.ok(addressOptions({}, 'province', 'เชียง').every(name => name.includes('เชียง')));
  const html = fs.readFileSync(new URL('../src/student_coop/student_coop.html', import.meta.url), 'utf8');
  assert.match(html, /type="search"[^>]*name="province"[^>]*list="jobProvinceOptions"/);
  assert.match(html, /type="reset"[^>]*>ล้างตัวกรอง/);
  const selected = [...html.matchAll(/<select[^>]*name="specialization"[^>]*>([\s\S]*?)<\/select>/g)][0][1];
  const values = [...selected.matchAll(/<option value="([^"]*)"/g)].map(([, value]) => value);
  const { SPECIALIZATIONS } = backendRequire('../services/jobSearchFilters');
  assert.deepEqual(values.filter(Boolean).sort(), Object.keys(SPECIALIZATIONS).sort()); assert.equal(values[0], '');
});

test('all filters travel together, Bangkok aliases normalize and invalid typed province makes no request', async () => {
  const calls = [], h = frontend({ browse: async query => { calls.push(query); return { jobs: [], total: 0, page: query.page, limit: 12 }; } });
  const form = h.node('jobBrowserForm'); Object.assign(form.filters, { q: 'Network', category: 'information_technology', specialization: 'cybersecurity', province: 'จ. กทม.' });
  await h.context.loadJobBrowser();
  assert.equal(calls[0].q, 'Network'); assert.equal(calls[0].specialization, 'cybersecurity'); assert.equal(calls[0].province, 'กรุงเทพมหานคร');
  assert.equal(h.node('jobBrowserMessage').messageType, 'info'); assert.match(h.node('jobBrowserMessage').textContent, /ไม่พบประกาศ/);
  form.filters.province = 'unknown'; await h.context.loadJobBrowser(); assert.equal(calls.length, 1); assert.equal(h.node('jobBrowserMessage').messageType, 'error');
  form.filters.province = 'ทุกจังหวัด'; await h.context.loadJobBrowser(); assert.equal(calls[1].province, '');
});

test('API sends specialization as a separate query without altering matching POST or stored category', async () => {
  let url; const context = { URLSearchParams, apiRequest: async value => { url = value; } };
  vm.runInNewContext(fs.readFileSync(new URL('../src/api/jobMatching.api.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, ''), context);
  await context.getPublishedJobs({ category: 'information_technology', specialization: 'it_support', province: 'ภูเก็ต' });
  const query = new URL(url, 'http://fixture').searchParams;
  assert.equal(query.get('category'), 'information_technology'); assert.equal(query.get('specialization'), 'it_support'); assert.equal(query.get('province'), 'ภูเก็ต');
});

test('pending search cannot overwrite changed filters, reset, latest results or page 1', async () => {
  let finish; const calls = [], h = frontend({ browse: query => {
    calls.push(query); if (calls.length === 1) return new Promise(resolve => { finish = resolve; });
    return Promise.resolve({ jobs: [], total: 0, page: query.page, limit: 12 });
  } });
  const old = h.context.loadJobBrowser(2), form = h.node('jobBrowserForm');
  assert.equal(h.node('jobBrowserResults').attributes['aria-busy'], 'true');
  form.events.submit({ preventDefault() {} }); assert.equal(calls.length, 1); // Repeated submit is ignored while busy.
  form.filters.specialization = 'network'; form.events.input();
  assert.equal(form.querySelector('button').disabled, false); assert.equal(h.node('jobBrowserPage').textContent, '');
  form.events.submit({ preventDefault() {} }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls[1].page, 1); assert.equal(calls[1].specialization, 'network');
  finish({ jobs: [job], total: 99, page: 2, limit: 12 }); await old;
  assert.equal(h.node('jobBrowserResults').children.length, 0); assert.match(h.node('jobBrowserPage').textContent, /หน้า 1 · 0/);
  form.events.reset(); Object.assign(form.filters, { q: '', category: '', specialization: '', province: '' }); // Browser's native reset default action.
  await h.context.loadJobBrowser(); assert.equal(calls[2].page, 1); assert.equal(calls[2].specialization, ''); assert.equal(calls[2].province, '');
});

test('browse pagination uses filtered total and retry keeps filters after failure', async () => {
  let offline = false; const calls = [], h = frontend({ browse: async query => {
    calls.push(query); if (offline) throw Error('fixture unavailable');
    return { jobs: [job], total: 13, page: query.page, limit: 12 };
  } });
  h.node('jobBrowserForm').filters.specialization = 'software_development';
  await h.context.loadJobBrowser(); assert.equal(h.node('jobBrowserNext').disabled, false); assert.equal(h.node('jobBrowserPrevious').disabled, true);
  h.node('jobBrowserNext').events.click(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls[1].page, 2); assert.equal(h.node('jobBrowserNext').disabled, true); assert.equal(h.node('jobBrowserPrevious').disabled, false);
  offline = true; await h.context.loadJobBrowser(); assert.equal(h.node('jobBrowserMessage').messageType, 'error');
  assert.equal(h.node('jobBrowserForm').querySelector('button').disabled, false); assert.equal(h.node('jobBrowserResults').attributes['aria-busy'], 'false');
  offline = false; await h.context.loadJobBrowser(); assert.equal(calls.at(-1).specialization, 'software_development'); assert.equal(h.node('jobBrowserResults').children.length, 1);
});

test('synthetic, unverified, missing and sourced contacts keep exact labels and safe links', () => {
  const h = frontend();
  const display = contact => h.context.contactSection({ ...job, source_url: 'https://internth.com/job/16858', contact });
  const text = node => walk(node).map(part => part.textContent).join(' ');
  const sample = display({ synthetic: true, samples_visible: true, phone: 'fixture', email: 'fixture@example.test', office_address: 'fixture',
    phone_verified: true, email_verified: true, source: { type: 'company_website' }, website: 'https://fixture.example' });
  assert.match(text(sample), /ข้อมูลจำลองสำหรับ Development/);
  assert.equal(walk(sample).some(node => /^(?:tel:|mailto:)/.test(node.href || '')), false);
  const hiddenSample = display({ synthetic: true, samples_visible: false, provenance: { phone: 'SYNTHETIC', email: 'SYNTHETIC' } });
  assert.match(text(hiddenSample), /ข้อมูลจำลองสำหรับ Development/);
  const unknown = display({ provenance: { phone: 'UNVERIFIED', email: 'UNVERIFIED', office_address: 'MISSING' } });
  assert.match(text(unknown), /ข้อมูลติดต่อยังไม่ได้รับการยืนยัน/); assert.match(text(unknown), /ยังไม่มีข้อมูล/);
  const sourced = display({ phone: '021234567', email: 'fixture@company.example', website: 'https://focalsolution.com/',
    phone_source_verified: true, email_source_verified: true, source: { type: 'company_website' } });
  assert.match(text(sourced), /ไม่ใช่การยืนยัน Email Ownership, ผู้ติดต่อ HR หรือการเปิดรับนักศึกษาปัจจุบัน/);
  const external = walk(sourced).filter(node => node.target === '_blank'); assert.equal(external.length, 2);
  assert.ok(external.every(node => node.rel === 'noopener noreferrer'));
  const unsafe = h.context.contactSection({ ...job, source_url: 'javascript:alert(1)', contact: { website: 'javascript:alert(1)', source: { type: 'company_website' } } });
  assert.equal(walk(unsafe).filter(node => node.tagName === 'A').length, 0);
});
