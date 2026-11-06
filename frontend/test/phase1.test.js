import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { supportsStudentDashboard, canUseCoopFeatures, canOpenStudentPanel, applyStudentDashboardAccess } from '../src/pages/studentDashboardAccess.js';
import { createStudentAuthStorage } from '../src/auth/studentAuthStorage.js';
import { mountStudentOverview, selectOverviewRequest } from '../src/pages/studentOverview.js';

const storage = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }; };
const token = patch => [Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url'), Buffer.from(JSON.stringify({ id: 'fixture', student_id: 'fixture-code', actor_type: 'student', role: 'student', exp: 2000, ...patch })).toString('base64url'), 'synthetic'].join('.');

test('Co-op Only: Dashboard rejects internship; existing adapters preserve expiry, roles and cross-tab revocation', () => {
  for (const track of ['internship', 'co_op']) {
    const student = { id: 'fixture', student_id: 'fixture-code', track };
    assert.equal(supportsStudentDashboard(student), track === 'co_op');
    assert.equal(canOpenStudentPanel(student, 'panel-profile'), track === 'co_op');
    assert.equal(canOpenStudentPanel(student, 'panel-google-account'), track === 'co_op');
    assert.equal(canUseCoopFeatures(student), track === 'co_op');
    for (const panel of ['panel-request', 'panel-coop', 'panel-daily', 'panel-evaluate', 'panel-transfer']) assert.equal(canOpenStudentPanel(student, panel), track === 'co_op');
    const shared = storage(), tab = storage(); let now = 1000000;
    shared.setItem('profileDraft:fixture', 'preserved-draft');
    const session = createStudentAuthStorage({ persistentStorage: shared, tabStorage: tab, now: () => now, generation: () => 'fixture-generation' });
    session.save({ token: token({ track }), student, remember: true }); assert.ok(session.getToken());
    const other = createStudentAuthStorage({ persistentStorage: shared, tabStorage: storage(), now: () => now, generation: () => 'other' });
    assert.ok(other.getToken()); other.clear(); assert.equal(session.getToken(), null);
    assert.equal(shared.getItem('profileDraft:fixture'), 'preserved-draft');
    session.save({ token: token({ track }), student }); now = 2000000; assert.equal(session.getToken(), null);
    assert.throws(() => session.save({ token: token({ role: 'teacher' }), student }));
  }
  for (const track of [null, '', 'other']) assert.equal(supportsStudentDashboard({ track }), false);
});

test('Co-op Only: actual Dashboard admits co_op and clears internship before rendering or initialization', async () => {
  const source = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
  const start = source.indexOf('async function checkAuthentication()');
  const end = source.indexOf('\n// ==============================', start);
  for (const track of ['internship', 'co_op', 'invalid']) {
    const events = [], student = { id: 'fixture', track }, sandbox = {
      getStudentToken: () => 'fixture-session', getCurrentStudent: async () => ({ data: student }),
      supportsStudentDashboard, canUseCoopFeatures, canOpenStudentPanel,
      updateStoredStudent: () => events.push('store'), renderStudent: () => events.push('render'),
      applyStudentDashboardAccess: () => {}, activateDashboardPanel: () => {},
      studentOverview: { load() {}, clear() {} },
      mountStudentGoogleAccount: () => ({}), studentGoogleAccount: null,
      loadStudentProfile: async () => ({}), loadTeachers: async () => {}, loadStudentCoopProjectSections: async () => events.push('project'),
      initStudentInternshipLog: () => events.push('log'), initStudentSupervision: () => events.push('supervision'), coopWidgetsInitialized: false,
      document: { getElementById: () => null, querySelector: () => ({ id: 'panel-overview' }) },
      clearAuthentication: () => events.push('clear'), window: { location: {} },
      showActionModal: () => assert.fail('unexpected failure'), console,
    };
    vm.runInNewContext(source.slice(start, end), sandbox); await sandbox.checkAuthentication();
    if (track !== 'co_op') { assert.deepEqual(events, ['clear']); assert.equal(sandbox.window.location.href, '/login.html'); }
    else { assert.ok(events.includes('render')); assert.ok(!events.includes('clear')); assert.equal(events.includes('project'), track === 'co_op'); assert.equal(events.includes('log'), track === 'co_op'); }
  }
});

test('Co-op Only: retained access controls still enable every existing Co-op panel', () => {
  const nav = ['panel-request', 'panel-profile'].map(target => ({ dataset: { target }, setAttribute() {} }));
  const nodes = new Map(['panel-request', 'panel-coop', 'panel-daily', 'panel-evaluate', 'panel-transfer', 'dailyCount'].map(key => [key, {}]));
  const supervision = {}; nodes.set('studentSupervisionStatus', { closest: () => supervision });
  const document = { querySelectorAll: () => nav, getElementById: id => nodes.get(id) };
  applyStudentDashboardAccess(document, { track: 'internship' });
  assert.equal(nav[0].disabled, true); assert.equal(nodes.get('panel-request').hidden, true); assert.equal(supervision.hidden, true); assert.equal(nav[1].disabled, undefined);
  applyStudentDashboardAccess(document, { track: 'co_op' }); assert.equal(nav[0].disabled, false); assert.equal(nodes.get('panel-request').hidden, false);
});

test('Co-op Only: actual Dashboard clears rejected sessions and retains sessions on connection failures', async () => {
  const source = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
  const start = source.indexOf('async function checkAuthentication()'), end = source.indexOf('\n// ==============================', start);
  for (const status of [401, 403, 404, 503, undefined]) {
    let token = 'existing-session', clears = 0, redirects = 0, retries = 0;
    const sandbox = { getStudentToken: () => token, studentOverview: { clear() {} }, getCurrentStudent: async () => { throw Object.assign(Error('synthetic failure'), { status }); },
      clearStudentSession(options) { assert.equal(options.expectedToken, token); token = null; clears++; },
      redirectToLogin() { redirects++; }, showActionModal() { retries++; }, handleStudentSessionChange() { assert.fail('unexpected session change'); } };
    vm.runInNewContext(source.slice(start, end), sandbox); await sandbox.checkAuthentication();
    const denied = [401, 403, 404].includes(status);
    assert.equal(clears, denied ? 1 : 0); assert.equal(redirects, denied ? 1 : 0); assert.equal(retries, denied ? 0 : 1);
    assert.equal(token, denied ? null : 'existing-session');
  }
});

test('mentor rotation: actual save/confirm handlers replace the capability and keep existing response fields', async () => {
  const source = fs.readFileSync(new URL('../src/pages/mentor.js', import.meta.url), 'utf8');
  const start = source.indexOf('async function saveProfile(event)'), end = source.indexOf('\nfunction confirmProfile()', start);
  const profile = { email: 'fixture@example.invalid', first_name: 'Fixture', last_name: 'Mentor', position: 'Fixture', status: 'verified' };
  const calls = [], sandbox = { verificationToken: 'old-fixture', isSaving: false, isConfirming: false, isVerified: false,
    getProfileData: () => profile, validateProfile: () => true, fieldset: {}, confirmButton: {}, saveButton: {}, defaultSaveLabel: 'save', defaultConfirmLabel: 'confirm',
    setButtonLoading() {}, setState() {}, populateProfile(value) { assert.equal(value, profile); }, setFormEnabled() {}, showToast() {}, startAutoClose() {}, clearTokenFromAddressBar() {},
    form: {}, summary: {}, actions: {}, closeButton: {},
    disableAfterTerminalTokenError() {}, getErrorMessage: () => 'unexpected error', URL, document: { title: 'fixture', getElementById: () => ({}) },
    window: { location: { href: 'http://fixture.invalid/verify?token=old-fixture' }, history: { replaceState(_, __, url) { calls.push(url); } } },
    async updateMentorProfile(value) { assert.equal(value, 'old-fixture'); return { data: { mentor: profile, verification_token: 'new-fixture' } }; },
    async confirmMentorVerification(value) { assert.equal(value, 'new-fixture'); return { success: true, data: { mentor: profile } }; },
  };
  vm.runInNewContext(source.slice(start, end), sandbox);
  await sandbox.saveProfile({ preventDefault() {} }); assert.equal(sandbox.verificationToken, 'new-fixture'); assert.ok(calls[0].includes('token=new-fixture'));
  await sandbox.submitConfirmation(); assert.equal(sandbox.verificationToken, null); assert.equal(sandbox.isVerified, true);
});

function overviewFixture(list) {
  function node() { return { textContent: '', hidden: false, dataset: {}, attributes: {}, children: [], handlers: {},
    setAttribute(key, value) { this.attributes[key] = value; }, append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; }, addEventListener(key, fn) { this.handlers[key] = fn; } }; }
  const html = fs.readFileSync(new URL('../src/student_coop/student_coop.html', import.meta.url), 'utf8');
  const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match => [match[1], node()]));
  let currentToken = 'fixture-session';
  const document = { getElementById: id => elements.get(id), createElement: node };
  const overview = mountStudentOverview({ document, list, getToken: () => currentToken, statusLabel: value => `status:${value}`, formatDate: value => value });
  return { overview, elements, setToken(value) { currentToken = value; } };
}
const overviewStudent = { id: 'fixture-student', track: 'co_op' };
const requestRow = patch => ({ id: 'fixture-request', student_id: overviewStudent.id, company_name: 'Fixture Company', company_province: 'Fixture', status: 'advisor_review', submitted_at: '2026-11-01T00:00:00Z', ...patch });

test('overview binding: loading uses no zero; empty/single/multiple show owner API data and canonical active/latest request', async () => {
  let resolve;
  const f = overviewFixture(() => new Promise(done => { resolve = done; }));
  const pending = f.overview.load(overviewStudent);
  assert.equal(f.elements.get('requestCount').textContent, '—'); assert.equal(f.elements.get('coopOverview').dataset.state, 'loading');
  resolve({ data: [] }); assert.equal(await pending, true);
  assert.equal(f.elements.get('requestCount').textContent, '0'); assert.equal(f.elements.get('coopOverviewEmpty').hidden, false);
  const row = requestRow({ work_start_date: '2026-12-01', work_end_date: '2026-12-31' });
  assert.equal(f.overview.accept([row], 'fixture-session'), true); assert.equal(f.elements.get('requestCount').textContent, '1');
  assert.equal(f.elements.get('coopOverviewDetails').children[0].children[1].textContent, row.company_name);
  const oldActive = requestRow({ id: 'old-active', submitted_at: '2026-10-01', status: 'approved' });
  const recentRejected = requestRow({ id: 'new-rejected', status: 'rejected', submitted_at: '2026-11-02' });
  assert.equal(selectOverviewRequest([recentRejected, oldActive]).id, 'old-active');
  assert.equal(f.overview.accept([recentRejected, oldActive], 'fixture-session'), true);
  assert.equal(f.elements.get('requestCount').textContent, '2');
  assert.equal(f.elements.get('coopOverviewDetails').children[2].children[1].textContent, 'status:approved');
  assert.equal(selectOverviewRequest([recentRejected, requestRow({ id: 'older', status: 'cancelled' })]).id, 'new-rejected');
});

test('overview binding: errors and malformed responses clear stale data; retry reloads rather than displaying fake zero', async () => {
  let calls = 0;
  const f = overviewFixture(async () => { if (++calls === 1) throw Error('synthetic network failure'); return { data: [requestRow()] }; });
  assert.equal(await f.overview.load(overviewStudent), false);
  assert.equal(f.elements.get('coopOverview').dataset.state, 'error'); assert.equal(f.elements.get('requestCount').textContent, '—');
  assert.equal(f.elements.get('coopOverviewEmpty').hidden, true); assert.equal(f.elements.get('coopOverviewRetry').hidden, false);
  await f.elements.get('coopOverviewRetry').handlers.click(); assert.equal(calls, 2); assert.equal(f.elements.get('requestCount').textContent, '1');
  f.overview.accept([requestRow({ student_id: 'other-owner' })], 'fixture-session');
  assert.equal(f.elements.get('coopOverview').dataset.state, 'error'); assert.equal(f.elements.get('coopOverviewDetails').children.length, 0);
  const bad = overviewFixture(async () => ({ data: null })); await bad.overview.load(overviewStudent); assert.equal(bad.elements.get('requestCount').textContent, '—');
});

test('overview binding: late success/failure and retry cannot cross session/owner boundaries', async () => {
  for (const failure of [false, true]) {
    let resolve, reject, calls = 0;
    const f = overviewFixture(() => { calls++; return new Promise((done, fail) => { resolve = done; reject = fail; }); });
    const pending = f.overview.load(overviewStudent); f.setToken('other-session'); f.overview.clear();
    if (failure) reject(Error('late')); else resolve({ data: [requestRow()] });
    assert.equal(await pending, false); assert.equal(f.elements.get('requestCount').textContent, '—');
    await f.elements.get('coopOverviewRetry').handlers.click(); assert.equal(calls, 1);
    assert.equal(f.overview.accept([requestRow()], 'fixture-session'), false);
  }
  let calls = 0; const f = overviewFixture(async () => { calls++; return { data: [] }; });
  await f.overview.load({ id: 'internship-owner', track: 'internship' }); assert.equal(calls, 0); assert.equal(f.elements.get('requestCount').textContent, '—');
  assert.equal(f.elements.get('coopOverview').dataset.state, 'unavailable');
});
