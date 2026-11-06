import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { setButtonLoading } from '../src/ui/feedback.js';
import { createMentorStatusSync } from '../src/pages/studentMentorSync.js';

const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function events() {
  const listeners = new Map();
  return { addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); }, emit(type) { for (const fn of listeners.get(type) || []) fn({ preventDefault() {} }); },
    count() { return [...listeners.values()].reduce((n, rows) => n + rows.size, 0); } };
}
function node() {
  const classes = new Set(), attributes = new Map();
  return { ...events(), hidden: false, disabled: false, dataset: {}, value: '', textContent: '', validity: { valid: true },
    classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value), toggle(value, on) { on ? classes.add(value) : classes.delete(value); } },
    setAttribute(key, value) { attributes.set(key, value); }, getAttribute: key => attributes.get(key), removeAttribute: key => attributes.delete(key), focus() {}, querySelector: () => node(), querySelectorAll: () => [],
  };
}
const mentor = { id: 'mentor-fixture', email: 'mentor@example.invalid', first_name: 'สมชาย', last_name: 'ใจดี', position: 'ผู้ดูแล', status: 'pending', student: { first_name: 'นักศึกษา', last_name: 'ทดสอบ' } };
function publicPage({ verify = async () => ({ data: { mentor } }), save, confirm, hash = '' } = {}) {
  const nodes = new Map(), timers = new Map(), calls = [], logs = []; let nextTimer = 0, closed = 0;
  const document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); }, querySelector: () => document.getElementById('page'), title: 'Fixture' };
  const window = { ...events(), location: new URL('https://fixture.invalid/verify?token=fixture-only' + hash),
    history: { replaceState(_, __, path) { window.location = new URL(path, window.location); } },
    setTimeout(fn) { timers.set(++nextTimer, fn); return nextTimer; }, clearTimeout: id => timers.delete(id), close() { closed++; } };
  const context = { document, window, URL, URLSearchParams, setButtonLoading,
    console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    showToast() {}, showConfirmModal(options) { calls.push(options); },
    verifyMentorToken: verify, updateMentorProfile: save || (async () => ({ data: { mentor, verification_token: 'rotated-fixture' } })),
    confirmMentorVerification: confirm || (async () => ({ success: true, data: { mentor: { ...mentor, status: 'verified' } } })),
    initMentorInternshipReview: token => calls.push(['review', token]), initMentorSupervision: token => calls.push(['appointment', token]),
  };
  const source = fs.readFileSync(new URL('../src/pages/mentor.js', import.meta.url), 'utf8').replace(/^import[\s\S]*?from ["'][^"']+["'];\s*/gm, '');
  vm.createContext(context); vm.runInContext(source, context);
  return { context, nodes, document, window, timers, calls, logs, closed: () => closed, read: expression => vm.runInContext(expression, context) };
}

test('public verification: Ready, save rotation, Confirming, server Verified clears ALL loading state and disallows repeats', async () => {
  const confirmation = deferred(); let confirms = 0;
  const p = publicPage({ confirm: () => { confirms++; return confirmation.promise; } }); await tick();
  const get = id => p.document.getElementById(id);
  assert.equal(get('mentorContent').hidden, false); assert.equal(get('mentorFieldset').disabled, false);
  await p.context.saveProfile({ preventDefault() {} }); assert.equal(p.window.location.search, '?token=rotated-fixture');
  p.context.confirmProfile(); p.context.confirmProfile(); assert.equal(p.calls.length, 1, 'one modal');
  const pending = p.calls[0].onConfirm(); p.context.submitConfirmation(); assert.equal(confirms, 1);
  assert.equal(get('confirmVerificationButton').getAttribute('aria-busy'), 'true');
  confirmation.resolve({ success: true, data: { mentor: { ...mentor, status: 'verified' } } }); await pending;
  for (const id of ['saveProfileButton', 'confirmVerificationButton']) {
    assert.equal(get(id).getAttribute('aria-busy'), 'false'); assert.equal(get(id).classList.contains('is-loading'), false); assert.equal(get(id).disabled, true);
  }
  assert.equal(get('verificationState').getAttribute('aria-busy'), 'false');
  assert.equal(get('mentorVerificationForm').hidden, true); assert.equal(get('mentorVerifiedSummary').hidden, false);
  assert.equal(get('closeVerificationButton').hidden, false); assert.equal(p.window.location.search, '');
  assert.equal(get('verifiedMentorEmail').textContent, mentor.email); await p.context.submitConfirmation(); assert.equal(confirms, 1);
  for (const fn of [...p.timers.values()]) fn(); assert.equal(p.closed(), 1);
  get('closeVerificationButton').emit('click'); assert.equal(p.closed(), 2); assert.match(get('verificationStateMessage').textContent, /ปิดแท็บ/);
  p.window.emit('pagehide'); assert.equal(p.timers.size, 0); assert.equal(p.logs.length, 0);
});

test('public verification: API errors reset spinner; terminal save/confirm cannot re-enable form in finally', async () => {
  for (const status of [400, 401, 403, 404, 410, 500, undefined]) {
    const error = Object.assign(new Error('synthetic'), { status, data: { message: status === 410 ? 'expired' : 'synthetic' } });
    for (const action of ['save', 'confirm']) {
      const p = publicPage({ [action]: async () => { throw error; } }); await tick();
      await (action === 'save' ? p.context.saveProfile({ preventDefault() {} }) : p.context.submitConfirmation());
      for (const id of ['saveProfileButton', 'confirmVerificationButton']) assert.notEqual(p.document.getElementById(id).getAttribute('aria-busy'), 'true');
      assert.equal(p.document.getElementById('mentorFieldset').disabled, [401, 403, 404, 410].includes(status));
      assert.match(p.document.getElementById('verificationState').className, /is-error/); assert.equal(p.logs.length, 0);
    }
  }
});

test('public verification: invalid/expired/used/server/network loads stay locked and retry only recoverable errors', async () => {
  for (const status of [400, 401, 403, 404, 410, 500, undefined]) {
    const p = publicPage({ verify: async () => { throw Object.assign(new Error('fixture'), { status, data: { message: 'used' } }); } }); await tick();
    assert.equal(p.document.getElementById('mentorFieldset').disabled, true);
    assert.equal(p.document.getElementById('retryVerificationButton').hidden, [400, 401, 403, 404, 410].includes(status));
    assert.equal(p.document.getElementById('verificationState').getAttribute('aria-busy'), 'false');
  }
});

test('public verification: HTTP success without a verified server status never renders success view', async () => {
  const p = publicPage({ confirm: async () => ({ success: true, data: { mentor } }) }); await tick();
  await p.context.submitConfirmation(); assert.equal(p.read('isVerified'), false); assert.equal(p.timers.size, 0);
});

test('public routing: review and appointment use original initializers without verification requests or scoped redesign', async () => {
  for (const [key, name] of [['review_token', 'review'], ['appointment_token', 'appointment']]) {
    const p = publicPage({ hash: '#' + key + '=fixture-capability', verify: () => assert.fail('verification endpoint called') }); await tick();
    assert.deepEqual(p.calls, [[name, 'fixture-capability']]); assert.equal(p.document.getElementById('page').dataset.workflow, undefined);
    assert.equal(p.window.location.hash, '');
  }
});

test('status sync: bounded single flight, focus/visible resume, background/menu exit/verified stop, destroy removes listeners', async t => {
  let clock = 1000, calls = 0, pending = true, busy = false, next = 0, request = deferred(); const timers = new Map();
  t.mock.method(Date, 'now', () => clock);
  const window = { ...events(), setTimeout(fn, ms) { assert.equal(ms, 10000); timers.set(++next, fn); return next; }, clearTimeout: id => timers.delete(id) };
  const document = { ...events(), visibilityState: 'visible' };
  const sync = createMentorStatusSync({ window, document, isPending: () => pending, isBusy: () => busy, refresh: () => { calls++; return request.promise; } });
  const first = sync.setActive(true); await tick(); window.emit('focus'); document.emit('visibilitychange'); await tick(); assert.equal(calls, 1);
  request.resolve(); await first; assert.equal(timers.size, 1);
  document.visibilityState = 'hidden'; document.emit('visibilitychange'); assert.equal(timers.size, 0);
  clock += 1000; request = deferred(); document.visibilityState = 'visible'; document.emit('visibilitychange'); await tick(); assert.equal(calls, 2);
  pending = false; request.resolve(); await tick(); assert.equal(timers.size, 0);
  clock += 1000; window.emit('focus'); await tick(); assert.equal(calls, 3, 'focus rechecks even verified to catch Student edits');
  await tick(); sync.setActive(false); clock += 1000; window.emit('focus'); await tick(); assert.equal(calls, 3);
  pending = true; busy = true; await sync.setActive(true); assert.equal(calls, 3); assert.equal(timers.size, 1);
  busy = false; const fn = [...timers.values()][0]; timers.clear(); fn(); await tick(); assert.equal(calls, 4);
  window.emit('pagehide'); assert.equal(timers.size, 0); clock += 1000; window.emit('pageshow'); await tick(); assert.equal(calls, 5);
  sync.destroy(); assert.equal(timers.size, 0); assert.equal(window.count(), 0); assert.equal(document.count(), 0);
});

test('Student actual loadMentor preserves previous data on API error, exposes Retry, and accepts server-only verified', async () => {
  const source = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
  const start = source.indexOf('async function loadMentor('), end = source.indexOf('\nfunction setMentorFormSubmitting', start);
  let fail = true, nextStatus = 'verified'; const notes = [];
  const context = { mentorLoading: false, mentorSubmitting: false, mentorDeleting: false, mentorResending: false, mentorLoadError: false, mentorLoadController: null,
    currentMentor: mentor, AbortController, renderMentor() {}, mentorMessage: {}, showMessage: (_, text) => notes.push(text), clearMessage() {}, getMentorErrorMessage: () => 'retry',
    getMyMentor: async ({ signal }) => { assert.equal(signal.aborted, false); if (fail) throw new Error('offline'); return { data: { ...mentor, status: nextStatus } }; },
  };
  vm.runInNewContext(source.slice(start, end), context); assert.equal(await context.loadMentor(), false);
  assert.equal(context.currentMentor, mentor); assert.equal(context.mentorLoadError, true); assert.equal(context.mentorLoading, false);
  fail = false; assert.equal(await context.loadMentor({ quiet: true }), true); assert.equal(context.currentMentor.status, 'verified'); assert.equal(context.mentorLoadError, false);
  nextStatus = 'pending'; await context.loadMentor({ quiet: true }); assert.equal(context.currentMentor.status, 'pending');
});
