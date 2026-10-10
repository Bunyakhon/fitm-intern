// Explicit opt-in scenarios: production UI/API/SQL, no mocked successful response.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pressKey, clickMouse, activateButtonWithKey } = require('./staffBrowserInput');
const { withBrowserCleanup } = require('./staffBrowserEvaluation');
const { companyResponseFixtureDate } = require('./staffBrowserFixtureDate');

module.exports = async function staffCoopCancellationScenarios(context) {
  const { t, m, teacher, staff, password, staffToken, classToken, headToken, accepted, rejected,
    api, ok, login, frontendUrl, apiUrl, browser, browserProduct, evaluate, value, click, wait, until,
    artifactRoot, runtimeErrors, consoleErrors, failedResponses } = context;
  const startedAt = new Date().toISOString(), steps = [], interceptorErrors = [];
  const allowed = ['submitted', 'staff_review', 'advisor_review', 'department_head_review'];
  const forbidden = ['approved', 'document_issued', 'in_progress', 'rejected', 'cancelled'];
  const modal = '.app-confirm-overlay:not(.is-leaving)';
  const confirmButton = `${modal} .app-confirm-modal__confirm`;
  const cancelButton = `${modal} .app-confirm-modal__cancel`;
  const cancellationRequests = [], loadedDocuments = new Set();
  const expectedHttpFailures = new Map();
  let interception, completed = false;
  const inputEvidence = { sequence: [], mouse: [], focus: [], secondaryFailures: [], runtimeCursor: 0, consoleCursor: 0 };
  const focusState = () => evaluate(`(() => {
    const active = document.activeElement, trigger = document.getElementById('staffCoopCancel');
    const overlay = document.querySelector('.app-confirm-overlay:not(.is-leaving)');
    const rect = overlay?.getBoundingClientRect();
    return { activeId: active?.id || '', activeTag: active?.tagName || '', documentHasFocus: document.hasFocus(),
      triggerId: trigger?.id || '', triggerTag: trigger?.tagName || '', triggerType: trigger?.type || '',
      triggerConnected: !!trigger?.isConnected, triggerDisabled: trigger?.disabled,
      activeIsTrigger: active === trigger, overlayPresent: !!document.querySelector('.app-confirm-overlay'),
      leavingOverlayPresent: !!document.querySelector('.app-confirm-overlay.is-leaving'),
      modalVisible: !!(rect?.width && rect?.height && getComputedStyle(overlay).visibility !== 'hidden' && getComputedStyle(overlay).display !== 'none') };
  })()`, { operation: 'focus-state' });
  async function keyboard(name, activate = false) {
    inputEvidence.focus.push({ phase: `before ${name}`, ...await focusState() });
    const record = event => inputEvidence.sequence.push(event);
    await withBrowserCleanup(async () => {
      if (activate) await activateButtonWithKey(browser, evaluate, '#staffCoopCancel', name, record);
      else await pressKey(browser, name, record);
    }, async () => { inputEvidence.focus.push({ phase: `after ${name}`, ...await focusState() }); },
    diagnostic => inputEvidence.secondaryFailures.push(diagnostic));
  }

  browser.on('Network.requestWillBeSent', ({ request }) => {
    if (request.method === 'POST' && new URL(request.url).pathname.match(/^\/api\/staff\/coop-requests\/[^/]+\/cancel$/)) {
      // Deliberately omit headers, bearer tokens and request bodies.
      cancellationRequests.push({ path: new URL(request.url).pathname, at: new Date().toISOString() });
    }
  });
  browser.on('Page.lifecycleEvent', event => { if (event.name === 'DOMContentLoaded') loadedDocuments.add(event.loaderId); });
  browser.on('Fetch.requestPaused', event => {
    // Cross-origin API calls may pause OPTIONS too. Faults/holds apply only
    // to the actual POST, so preflight can never consume the one-shot hook.
    Promise.resolve().then(() => event.request.method === 'POST' && interception ? interception(event) : browser.send('Fetch.continueRequest', { requestId: event.requestId }))
      .catch(() => interceptorErrors.push('CDP request interception failed'));
  });
  await browser.send('Page.setLifecycleEventsEnabled', { enabled: true });

  async function navigate(url) {
    const navigation = await browser.send('Page.navigate', { url });
    if (navigation.loaderId) await until(() => loadedDocuments.has(navigation.loaderId), 'new document loaded');
  }
  async function capture(name) {
    // Password inputs are scrubbed; storage, HTML dumps and HAR are never saved.
    await evaluate("document.querySelectorAll('input[type=password]').forEach(e=>e.value='')");
    const shot = await browser.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await fs.writeFile(path.join(artifactRoot, `${name}.png`), Buffer.from(shot.data, 'base64'));
  }
  async function step(id, description, action) {
    let failure;
    const entry = { id, description, startedAt: new Date().toISOString(), status: 'RUNNING' };
    steps.push(entry);
    await t.test(`${id}: ${description}`, async () => {
      console.log(`Cancellation step ${id}`);
      try { await action(); entry.status = 'PASS'; }
      catch (error) {
        failure = error; entry.status = 'FAIL';
        if (id === 'D') {
          try {
            await fs.writeFile(path.join(artifactRoot, 'mouse-D.json'), JSON.stringify({
              sequence: inputEvidence.mouse, failure: error.diagnostic || {message: 'No structured diagnostic available'},
              secondaryFailures: inputEvidence.secondaryFailures,
            }, null, 2));
          } catch { entry.mouseDiagnostic = 'unavailable'; }
          try {
            const focus = { ...await focusState(), keyboardEventSequence: inputEvidence.sequence, focusBeforeAfter: inputEvidence.focus,
              browserEvents: await evaluate('globalThis.__fitmCancellationInputTrace?.events || []'),
              relevantConsoleErrors: { runtimeErrorCount: runtimeErrors.length - inputEvidence.runtimeCursor,
                consoleErrorCount: consoleErrors.length - inputEvidence.consoleCursor,
                runtimeKinds: runtimeErrors.slice(inputEvidence.runtimeCursor).map(error => error === 'Application console.error' ? 'console.error' : 'runtime exception'),
                sources: consoleErrors.slice(inputEvidence.consoleCursor).map(error => ['javascript', 'network', 'security', 'other'].includes(error.source) ? error.source : 'other'),
                messages: 'Raw console text omitted to avoid recording credentials or input values' } };
            await fs.writeFile(path.join(artifactRoot, 'focus-D.json'), JSON.stringify(focus, null, 2));
          } catch { entry.focusDiagnostic = 'unavailable'; }
        }
        // Only a safe label is retained in JSON; node:test prints the assertion.
        entry.error = 'Assertion or browser operation failed; inspect the test log';
        try { await capture(`failure-${id}`); } catch { entry.screenshot = 'unavailable'; }
        throw error;
      } finally { entry.finishedAt = new Date().toISOString(); }
    });
    // Dependent browser steps cannot be accepted after a failed prerequisite.
    if (failure) throw Error(`Cancellation acceptance stopped after ${id}`);
  }
  async function staffLogin() {
    await navigate(`${frontendUrl}/staff-login.html`);
    await wait("!!document.getElementById('staffLoginForm')", 'Staff login form');
    await value('staffEmail', staff.email); await value('staffPassword', password);
    await click('#staffLoginForm button[type=submit]');
    await wait("location.pathname.includes('department_staff') && document.getElementById('staffCoopRefresh')?.disabled===false && document.getElementById('staffRefresh')?.disabled===false", 'active Staff queues ready');
  }
  const ready = () => wait("document.getElementById('staffCoopRefresh')?.disabled===false && document.getElementById('staffCoopList')?.getAttribute('aria-busy')==='false'", 'Staff request list ready');
  async function search(input, status = '') {
    await ready();
    const currentStatus = await evaluate("document.getElementById('staffCoopStatus').value");
    if (currentStatus !== status) { await value('staffCoopStatus', status); await ready(); }
    await value('staffCoopSearch', input); await click('#staffCoopSearchButton'); await ready();
  }
  async function open(owner) {
    await search(owner.student.student_id);
    await wait("document.querySelectorAll('#staffCoopList article').length===1", 'one owner request');
    await click('#staffCoopList article button');
    await wait(`document.getElementById('staffCoopDetail').getAttribute('aria-busy')==='false' && document.getElementById('staffCoopDetailBody').textContent.includes(${JSON.stringify(owner.id)})`, 'current request detail');
  }
  async function ask(owner) {
    await open(owner); await click('#staffCoopCancel');
    await wait(`!!document.querySelector(${JSON.stringify(modal)})`, 'cancellation modal');
  }
  const reason = input => evaluate(`document.querySelector(${JSON.stringify(`${modal} textarea`)}).value=${JSON.stringify(input)}`);
  const noSuccess = async () => assert.equal(await evaluate("!!document.querySelector('.app-toast--success:not(.is-leaving)')"), false);
  const clearToasts = () => evaluate("document.querySelectorAll('.app-toast__close').forEach(e=>e.click())");
  const cancelRoute = id => `/api/staff/coop-requests/${id}/cancel`;
  const cancelAudits = id => m.CoopRequestReview.findAll({ where: { coop_request_id: id, decision: 'cancel' } });
  async function unchanged(owner, previous) {
    assert.deepEqual((await m.CoopRequest.findByPk(owner.id)).toJSON(), previous);
    assert.equal((await cancelAudits(owner.id)).length, 0);
  }
  async function snapshot(owner) { return (await m.CoopRequest.findByPk(owner.id)).toJSON(); }
  async function submitted(name, status = 'advisor_review') {
    const suffix = crypto.randomUUID();
    const student = await m.Student.create({ student_id: `cancel-${suffix}`, first_name: name, last_name: 'Fixture',
      email: `cancel-${suffix}@email.kmutnb.ac.th`, password, major: 'IT', track: 'co_op', advisor_teacher_id: teacher.id });
    const token = await login('/api/auth/login', student.email);
    const { CATALOG } = require('../src/services/coopPrerequisites');
    const request = (await ok(api('/api/coop-requests', token, {
      company_name: `${name} Company`, company_address: 'Cancellation fixture address', company_province: 'Bangkok',
      letter_recipient_name: 'HR Fixture', work_start_date: '2026-11-01', work_end_date: '2027-02-01', delivery_methods: ['email'],
      prerequisite_courses: CATALOG.IT.map(([course_code]) => ({ course_code, status: 'passed', grade: 'A' })),
    }))).data;
    assert.equal(request.status, 'advisor_review');
    if (status === 'department_head_review') await ok(api(`/api/teachers/coop-requests/${request.id}/approve`, classToken, {}));
    // Legacy/terminal eligibility fixtures are deliberately prepared only in
    // the guarded disposable DB. They do not claim a live transition to legacy states.
    else if (status !== 'advisor_review') await m.CoopRequest.update({ status }, { where: { id: request.id } });
    return { student, token, id: request.id };
  }
  function expectHttp(pathname, status) {
    const key = `${pathname}:${status}`; expectedHttpFailures.set(key, (expectedHttpFailures.get(key) || 0) + 1);
  }
  async function interceptOnce(callback) {
    assert.equal(interception, undefined);
    interception = async event => { interception = undefined; await callback(event); };
    await browser.send('Fetch.enable', { patterns: [{ urlPattern: `${apiUrl}/api/staff/coop-requests/*/cancel`, requestStage: 'Request' }] });
  }
  async function stopIntercepting() { interception = undefined; await browser.send('Fetch.disable'); }
  async function responseSeen(pathname, status, cursor) {
    const paths = Array.isArray(pathname) ? pathname : [pathname];
    await until(() => failedResponses.slice(cursor).some(row => paths.includes(row.url) && row.status === status), `real HTTP ${status}`);
    return failedResponses.slice(cursor).find(row => paths.includes(row.url) && row.status === status);
  }

  try {
    const owners = {};
    for (const status of [...allowed, ...forbidden]) owners[status] = await submitted(`Eligibility ${status}`, status);
    const primary = owners.advisor_review;
    // 27 real owner-linked records exercise the actual 25-row UI pagination.
    for (let index = 0; index < 27; index++) await submitted(`Pagination ${String(index).padStart(2, '0')}`);

    await step('A', 'Password login loads active Staff and both live queues', async () => {
      await staffLogin();
      assert.match(await evaluate("document.getElementById('staffName').textContent"), /Browser Staff/);
      assert.equal(await evaluate("document.querySelectorAll('#staffCoopList article').length"), 25);
      assert.equal(await evaluate("document.getElementById('staffCoopNext').disabled"), false);
    });
    await step('B', 'Search by name, Student code and company; filters and pagination', async () => {
      await search('Pagination'); assert.equal(await evaluate("document.querySelectorAll('#staffCoopList article').length"), 25);
      const firstPage = (await ok(api('/api/staff/coop-requests?search=Pagination&limit=25&offset=0', staffToken))).data;
      assert.equal(firstPage.length, 25);
      await click('#staffCoopNext'); await ready();
      assert.equal(await evaluate("document.querySelectorAll('#staffCoopList article').length"), 2);
      assert.match(await evaluate("document.getElementById('staffCoopPage').textContent"), /2/);
      const secondPage = (await ok(api('/api/staff/coop-requests?search=Pagination&limit=26&offset=25', staffToken))).data;
      assert.equal(secondPage.length, 2); assert.ok(secondPage.every(row => !firstPage.some(other => other.id === row.id)));
      await click('#staffCoopPrev'); await ready();
      await search(primary.student.first_name); assert.equal(await evaluate("document.querySelectorAll('#staffCoopList article').length"), 1);
      await search(`${primary.student.first_name} Company`, 'advisor_review');
      assert.equal(await evaluate("document.querySelectorAll('#staffCoopList article').length"), 1);
      await search(primary.student.student_id, 'approved');
      assert.equal(await evaluate("document.querySelectorAll('#staffCoopList article').length"), 0);
      await open(primary);
      assert.match(await evaluate("document.getElementById('staffCoopDetailBody').textContent"), /Eligibility advisor_review.*รออาจารย์/s);
    });
    await step('D', 'Modal identity, reason label, Back/Escape and keyboard focus cause no write', async () => {
      const before = await snapshot(primary), requestCount = cancellationRequests.length;
      inputEvidence.runtimeCursor = runtimeErrors.length; inputEvidence.consoleCursor = consoleErrors.length;
      await evaluate(`(() => {
        const trace = { events: [] }, types = ['keydown', 'keypress', 'keyup', 'click', 'focusin', 'focusout'];
        const record = event => {
          const target = event.target;
          if (target?.id !== 'staffCoopCancel' && !target?.closest?.('.app-confirm-overlay')) return;
          if (event.type.startsWith('key') && !['Enter', ' ', 'Tab', 'Escape'].includes(event.key)) return;
          if (trace.events.length >= 80) return;
          const control = target.id === 'staffCoopCancel' ? 'opener' : target.matches?.('textarea') ? 'reason'
            : target.matches?.('.app-confirm-modal__confirm') ? 'confirm' : target.matches?.('.app-confirm-modal__cancel') ? 'back' : 'modal';
          trace.events.push({ type: event.type, control, key: event.key || '', code: event.code || '',
            charCode: event.charCode || 0, trusted: event.isTrusted, defaultPrevented: event.defaultPrevented });
        };
        types.forEach(type => window.addEventListener(type, record));
        trace.stop = () => types.forEach(type => window.removeEventListener(type, record));
        globalThis.__fitmCancellationInputTrace = trace;
      })()`);
      await withBrowserCleanup(async () => {
        await open(primary);
        await clickMouse(browser, evaluate, '#staffCoopCancel', event => inputEvidence.mouse.push(event));
        await wait(`!!document.querySelector(${JSON.stringify(modal)})`, 'mouse opens cancellation modal');
        const text = await evaluate(`document.querySelector(${JSON.stringify(modal)}).textContent`);
        assert.ok(text.includes(primary.id) && text.includes(primary.student.student_id));
        assert.match(text, /รออาจารย์.*เหตุผลการยกเลิก/s);
        assert.equal(await evaluate(`document.querySelector(${JSON.stringify(`${modal} textarea`)}).maxLength`), 2000);
        assert.equal(await evaluate(`document.querySelector(${JSON.stringify(confirmButton)})===document.activeElement`), true);
        await keyboard('Tab');
        assert.equal(await evaluate(`document.querySelector(${JSON.stringify(`${modal} textarea`)})===document.activeElement`), true);
        await click(cancelButton); await wait(`!document.querySelector(${JSON.stringify(modal)})`, 'Back closes modal');
        const focusRestored = "document.activeElement===document.getElementById('staffCoopCancel') && document.activeElement?.isConnected && document.activeElement?.disabled===false";
        await wait(focusRestored, 'Back focus restored');
        await wait("!document.querySelector('.app-confirm-overlay')", 'Back overlay removed');
        assert.equal(cancellationRequests.length, requestCount); await unchanged(primary, before);
        for (const key of ['Enter', 'Space']) {
          // Native keyboard activation is independent of the mouse path above.
          await evaluate("document.getElementById('staffCoopCancel').focus()");
          await wait(focusRestored, 'keyboard opener focused');
          await keyboard(key, true);
          await wait(`!!document.querySelector(${JSON.stringify(modal)})`, `${key} opens cancellation modal`);
          await wait(`document.querySelector(${JSON.stringify(confirmButton)})===document.activeElement`, 'keyboard modal focused');
          const received = await evaluate('globalThis.__fitmCancellationInputTrace.events');
          assert.ok(received.some(event => event.type === 'keypress' && event.control === 'opener' && event.trusted && event.charCode === (key === 'Enter' ? 13 : 32)), `${key} character event received by native opener`);
          await keyboard('Escape');
          await wait(`!document.querySelector(${JSON.stringify(modal)})`, 'Escape closes modal');
          await wait(focusRestored, 'Escape focus restored');
          await wait("!document.querySelector('.app-confirm-overlay')", 'Escape overlay removed');
          assert.equal(cancellationRequests.length, requestCount); await unchanged(primary, before);
        }
      }, () => evaluate('globalThis.__fitmCancellationInputTrace?.stop()', { operation: 'input-observer-stop' }),
      diagnostic => inputEvidence.secondaryFailures.push(diagnostic));
    });
    await step('E', 'Invalid reasons make no POST; direct API validates independently', async () => {
      const before = await snapshot(primary), requestCount = cancellationRequests.length;
      await ask(primary);
      for (const input of ['', '   ', 'x'.repeat(2001)]) {
        await reason(input); await click(confirmButton);
        await wait(`document.querySelector(${JSON.stringify(`${modal} .app-confirm-modal__error`)})?.textContent.includes('2000')`, 'reason validation');
        assert.equal(cancellationRequests.length, requestCount);
      }
      for (const body of [{}, { reason: '  ' }, { reason: 'x'.repeat(2001) }, { reason: 'OK', actor_role: 'department_staff' }]) {
        assert.equal((await api(cancelRoute(primary.id), staffToken, body)).status, 400);
      }
      await unchanged(primary, before); await click(cancelButton);
    });
    await step('F-G', 'Held real POST suppresses rapid clicks and persists exactly one cancel audit', async () => {
      await clearToasts(); await ask(primary);
      const savedReason = 'Browser cancellation <script>throw Error("unsafe")</script>', beforeTime = Date.now();
      await reason(`  ${savedReason}  `);
      let pausedRequest;
      const cursor = cancellationRequests.length;
      await interceptOnce(async event => { pausedRequest = event.requestId; });
      try {
        await click(confirmButton); await until(() => !!pausedRequest, 'real cancellation POST held');
        await evaluate(`for(let i=0;i<8;i++)document.querySelector(${JSON.stringify(confirmButton)}).click()`);
        assert.equal(cancellationRequests.length - cursor, 1);
        assert.equal(await evaluate(`document.querySelector(${JSON.stringify(confirmButton)}).disabled`), true);
        assert.equal(await evaluate("document.getElementById('staffCoopCancel').disabled"), true);
        await noSuccess(); assert.equal((await cancelAudits(primary.id)).length, 0);
        await browser.send('Fetch.continueRequest', { requestId: pausedRequest }); pausedRequest = undefined;
        await wait(`!document.querySelector(${JSON.stringify(modal)}) && document.getElementById('staffCoopDetailBody').textContent.includes('ยกเลิกแล้ว')`, 'confirmed cancelled detail');
        await ready();
      } finally {
        if (pausedRequest) await browser.send('Fetch.continueRequest', { requestId: pausedRequest });
        await stopIntercepting();
      }
      const row = await m.CoopRequest.findByPk(primary.id), audits = await cancelAudits(primary.id);
      assert.equal(row.status, 'cancelled'); assert.equal(audits.length, 1);
      assert.equal(audits[0].reason, savedReason); assert.equal(audits[0].department_staff_id, staff.id);
      assert.equal(audits[0].actor_role, 'department_staff'); assert.equal(audits[0].teacher_id, null);
      assert.equal(audits[0].from_status, 'advisor_review'); assert.equal(audits[0].to_status, 'cancelled');
      for (const date of [row.cancelled_at, audits[0].createdAt]) assert.ok(new Date(date).getTime() >= beforeTime - 1000 && new Date(date).getTime() <= Date.now() + 1000);
      assert.equal(await evaluate("!!document.querySelector('.app-toast--success:not(.is-leaving)')"), true);
      assert.ok((await evaluate("document.getElementById('staffCoopDetailBody').textContent")).includes(savedReason));
      assert.equal(await evaluate("!!document.querySelector('#staffCoopDetailBody script')"), false);
      assert.equal(await evaluate("document.getElementById('staffCoopCancel').disabled"), true);
      await navigate(`${frontendUrl}/src/department_staff/department_staff.html`); await ready(); await open(primary);
      assert.ok((await evaluate("document.getElementById('staffCoopDetailBody').textContent")).includes(savedReason));
      assert.equal((await api(cancelRoute(primary.id), staffToken, { reason: 'Duplicate' })).status, 409);
      assert.equal((await cancelAudits(primary.id)).length, 1);
      await capture('staff-cancelled-desktop');
    });
    await step('C-advisor_review', 'F-G real UI cancellation covers advisor_review and its saved SQL audit', async () => {
      assert.equal((await m.CoopRequest.findByPk(primary.id)).status, 'cancelled');
      const audits = await cancelAudits(primary.id);
      assert.equal(audits.length, 1);
      assert.equal(audits[0].from_status, 'advisor_review');
      assert.equal(audits[0].to_status, 'cancelled');
      assert.equal(audits[0].department_staff_id, staff.id);
    });
    for (const status of allowed.filter(status => status !== 'advisor_review')) {
      await step(`C-${status}`, `Real UI cancels eligible ${status}`, async () => {
        const owner = owners[status]; await ask(owner); await reason(status === 'submitted' ? 'x'.repeat(2000) : `Cancellation ${status}`);
        await click(confirmButton); await wait(`!document.querySelector(${JSON.stringify(modal)})`, 'allowed cancellation committed'); await ready();
        assert.equal((await m.CoopRequest.findByPk(owner.id)).status, 'cancelled');
        assert.equal((await cancelAudits(owner.id)).length, 1);
        if (status === 'submitted') assert.equal((await cancelAudits(owner.id))[0].reason.length, 2000);
      });
    }
    for (const status of forbidden) {
      await step(`C-${status}`, `Real UI and API refuse ${status} without SQL changes`, async () => {
        const owner = owners[status], before = await snapshot(owner); await open(owner);
        assert.equal(await evaluate("document.getElementById('staffCoopCancel').disabled"), true);
        assert.equal((await api(cancelRoute(owner.id), staffToken, { reason: 'Must refuse' })).status, 409);
        await unchanged(owner, before);
      });
    }
    await step('G-SQL', 'Concurrent real HTTP cancellation writes commit one event', async () => {
      const owner = await submitted('Concurrent');
      const loaded = (await ok(api(`/api/staff/coop-requests/${owner.id}`, staffToken))).data.cancellation;
      const body = { reason: 'Concurrent fixture', expected_status: loaded.expected_status, expected_updated_at: loaded.expected_updated_at };
      const outcomes = await Promise.all([api(cancelRoute(owner.id), staffToken, body), api(cancelRoute(owner.id), staffToken, body)]);
      assert.deepEqual(outcomes.map(result => result.status).sort(), [200, 409]);
      assert.equal((await cancelAudits(owner.id)).length, 1);
    });
    await step('H-status', 'Second authenticated advisor session changes stage; stale UI refreshes without success', async () => {
      const owner = await submitted('Stale stage'); await clearToasts(); await ask(owner); await reason('Old confirmation');
      await ok(api(`/api/teachers/coop-requests/${owner.id}/approve`, classToken, {}));
      const before = await snapshot(owner), cursor = failedResponses.length;
      expectHttp(cancelRoute(owner.id), 409); await click(confirmButton); await responseSeen(cancelRoute(owner.id), 409, cursor);
      await wait(`!document.querySelector(${JSON.stringify(modal)}) && document.getElementById('staffCoopDetailBody').textContent.includes('รอหัวหน้าภาควิชา')`, '409 refreshes latest stage');
      await ready(); await noSuccess(); await unchanged(owner, before);
      assert.equal(await evaluate("document.getElementById('staffCoopCancel').disabled"), false);
    });
    await step('H-time', 'Unchanged status with a new updated_at also refuses stale confirmation', async () => {
      const owner = await submitted('Stale timestamp'); await clearToasts(); await ask(owner); await reason('Old timestamp');
      const row = await m.CoopRequest.findByPk(owner.id);
      await row.update({ company_address: 'Updated by another test session', updatedAt: new Date(new Date(row.updatedAt).getTime() + 1000) });
      const before = await snapshot(owner), cursor = failedResponses.length;
      expectHttp(cancelRoute(owner.id), 409); await click(confirmButton); await responseSeen(cancelRoute(owner.id), 409, cursor);
      await wait(`!document.querySelector(${JSON.stringify(modal)}) && document.getElementById('staffCoopDetailBody').textContent.includes('Updated by another test session')`, 'timestamp conflict reload');
      await ready(); await noSuccess(); await unchanged(owner, before);
    });
    await step('I-400', 'Corrupted transport payload receives real API 400; reason retained and no success', async () => {
      const owner = await submitted('HTTP 400'), before = await snapshot(owner), cursor = failedResponses.length;
      await clearToasts(); await ask(owner); await reason('Keep reason after 400'); expectHttp(cancelRoute(owner.id), 400);
      await interceptOnce(event => browser.send('Fetch.continueRequest', { requestId: event.requestId, postData: Buffer.from(JSON.stringify({ reason: '' })).toString('base64') }));
      try {
        await click(confirmButton); await responseSeen(cancelRoute(owner.id), 400, cursor);
        await wait(`document.querySelector(${JSON.stringify(`${modal} .app-confirm-modal__error`)})?.textContent.includes('2000')`, 'real 400 feedback');
        assert.equal(await evaluate(`document.querySelector(${JSON.stringify(`${modal} textarea`)}).value`), 'Keep reason after 400');
        await noSuccess(); await unchanged(owner, before); await click(cancelButton);
      } finally { await stopIntercepting(); }
    });
    await step('I-404', 'Missing target receives real API 404; original record and audit remain intact', async () => {
      const owner = await submitted('HTTP 404'), before = await snapshot(owner), missing = crypto.randomUUID();
      await clearToasts(); await ask(owner); await reason('Missing target'); const cursor = failedResponses.length;
      await interceptOnce(event => browser.send('Fetch.continueRequest', { requestId: event.requestId, url: apiUrl + cancelRoute(missing) }));
      try {
        await click(confirmButton);
        const observed = await responseSeen([cancelRoute(missing), cancelRoute(owner.id)], 404, cursor);
        expectHttp(observed.url, 404);
        await wait(`!document.querySelector(${JSON.stringify(modal)})`, '404 closes outdated confirmation'); await ready();
        await noSuccess(); await unchanged(owner, before);
      } finally { await stopIntercepting(); }
    });
    await step('I-500', 'Disposable SQL audit fault gives real HTTP 500 and transaction rollback', async () => {
      const owner = await submitted('HTTP 500'), before = await snapshot(owner);
      await clearToasts(); await ask(owner); await reason('Keep reason after 500'); const cursor = failedResponses.length;
      expectHttp(cancelRoute(owner.id), 500);
      // The guard was checked before fixtures. Only this UUID's cancel insert fails;
      // the production Express process remains untouched and returns its real error.
      await m.sequelize.query(`CREATE FUNCTION fitm_cancel_browser_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.coop_request_id = '${owner.id}'::uuid AND NEW.decision = 'cancel' THEN RAISE EXCEPTION 'disposable audit fault'; END IF;
        RETURN NEW; END; $$`);
      try {
        await m.sequelize.query('CREATE TRIGGER fitm_cancel_browser_fault BEFORE INSERT ON coop_request_reviews FOR EACH ROW EXECUTE FUNCTION fitm_cancel_browser_fault()');
        await click(confirmButton); await responseSeen(cancelRoute(owner.id), 500, cursor);
        await wait(`document.querySelector(${JSON.stringify(`${modal} .app-confirm-modal__error`)})?.textContent.includes('ไม่สำเร็จ')`, 'sanitized server error');
        const displayed = await evaluate(`document.querySelector(${JSON.stringify(modal)}).textContent`);
        assert.equal(/disposable audit fault|INSERT INTO|Sequelize|stack|parameters/i.test(displayed), false);
        await noSuccess(); await unchanged(owner, before);
        assert.equal(await evaluate(`document.querySelector(${JSON.stringify(`${modal} textarea`)}).value`), 'Keep reason after 500');
        await click(cancelButton);
      } finally {
        await m.sequelize.query('DROP TRIGGER IF EXISTS fitm_cancel_browser_fault ON coop_request_reviews');
        await m.sequelize.query('DROP FUNCTION fitm_cancel_browser_fault()');
      }
    });
    await step('I-network', 'Injected transport loss keeps modal/reason; retry uses real API and SQL', async () => {
      const owner = await submitted('Network retry'), before = await snapshot(owner);
      await clearToasts(); await ask(owner); await reason('Retry after transport failure');
      await interceptOnce(event => browser.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'ConnectionFailed' }));
      try {
        await click(confirmButton);
        await wait(`document.querySelector(${JSON.stringify(`${modal} .app-confirm-modal__error`)})?.textContent.includes('ไม่สำเร็จ')`, 'transport error feedback');
        await noSuccess(); await unchanged(owner, before);
        assert.equal(await evaluate(`document.querySelector(${JSON.stringify(`${modal} textarea`)}).value`), 'Retry after transport failure');
      } finally { await stopIntercepting(); }
      await click(confirmButton); await wait(`!document.querySelector(${JSON.stringify(modal)})`, 'real retry commit'); await ready();
      assert.equal((await cancelAudits(owner.id)).length, 1);
    });
    await step('I-401', 'Invalid bearer is rejected by real API; only Staff session revoked', async () => {
      const owner = await submitted('Invalid session'), before = await snapshot(owner); await clearToasts(); await ask(owner); await reason('Invalid bearer');
      await evaluate("sessionStorage.setItem('teacherToken','separate-teacher-fixture');localStorage.setItem('token','separate-student-fixture')");
      const cursor = failedResponses.length; expectHttp(cancelRoute(owner.id), 401);
      await interceptOnce(event => browser.send('Fetch.continueRequest', { requestId: event.requestId,
        headers: Object.entries(event.request.headers).filter(([name]) => name.toLowerCase() !== 'authorization').map(([name, input]) => ({ name, value: String(input) })).concat({ name: 'Authorization', value: 'Bearer invalid-test-session' }) }));
      try {
        await click(confirmButton); await responseSeen(cancelRoute(owner.id), 401, cursor);
        await wait("location.pathname==='/staff-login.html'", '401 redirects');
        assert.equal(await evaluate("sessionStorage.getItem('staffToken')"), null);
        assert.equal(await evaluate("sessionStorage.getItem('teacherToken')==='separate-teacher-fixture' && localStorage.getItem('token')==='separate-student-fixture'"), true);
        await noSuccess(); await unchanged(owner, before);
      } finally { await stopIntercepting(); }
      await evaluate("sessionStorage.removeItem('teacherToken');localStorage.removeItem('token')"); await staffLogin();
    });
    await step('I-403', 'Deactivated Staff cannot write with an existing JWT; real UI revokes session', async () => {
      const owner = await submitted('Deactivated Staff'), before = await snapshot(owner); await clearToasts(); await ask(owner); await reason('Deactivated');
      const cursor = failedResponses.length; expectHttp(cancelRoute(owner.id), 403);
      await staff.update({ is_active: false });
      try {
        await click(confirmButton); await responseSeen(cancelRoute(owner.id), 403, cursor);
        await wait("location.pathname==='/staff-login.html'", '403 redirects'); await noSuccess(); await unchanged(owner, before);
      } finally { await staff.update({ is_active: true }); }
      await staffLogin();
    });
    await step('A-security', 'Anonymous, Student, Class and Head cannot access Staff records or cancellation', async () => {
      for (const token of [undefined, primary.token, classToken, headToken, 'invalid-test-session']) {
        const expected = !token || token === 'invalid-test-session' ? 401 : 403;
        for (const endpoint of ['/api/staff/coop-requests', `/api/staff/coop-requests/${primary.id}`]) {
          const result = await api(endpoint, token); assert.equal(result.status, expected); assert.equal(result.data.data, undefined);
        }
        assert.equal((await api(cancelRoute(primary.id), token, { reason: 'Forbidden' })).status, expected);
      }
      assert.equal((await cancelAudits(primary.id)).length, 1);
      await evaluate("sessionStorage.removeItem('staffToken')");
      // Missing-token modules may redirect before DOMContentLoaded. Wait for
      // the destination instead of the abandoned document's lifecycle event.
      await browser.send('Page.navigate', { url: `${frontendUrl}/src/department_staff/department_staff.html` });
      await wait("location.pathname==='/staff-login.html'", 'unauthenticated page rejected');
      await staffLogin();
    });
    await step('K', 'Cooperation, Company Response and Placement evidence survive refused cancellation', async () => {
      const documentRoute = `/api/staff/document-requests/${accepted.id}`;
      const cooperation = (await ok(api(`${documentRoute}/documents/cooperation`, staffToken, {}))).data;
      await ok(api(`${documentRoute}/documents/cooperation/generate`, staffToken, { version: cooperation.version }));
      const today = companyResponseFixtureDate();
      await ok(api(`${documentRoute}/company-response`, staffToken, { status: 'accepted', responded_at: today }));
      const placement = (await ok(api(`${documentRoute}/documents/placement`, staffToken, {}))).data;
      await ok(api(`${documentRoute}/documents/placement/generate`, staffToken, { version: placement.version }));
      const evidence = async () => ({
        request: await snapshot(accepted),
        documents: (await m.CoopDocument.findAll({ where: { coop_request_id: accepted.id }, order: [['id', 'ASC']] })).map(row => row.toJSON()),
        revisions: (await m.CoopDocumentRevision.findAll({ where: { coop_document_id: [cooperation.id, placement.id] }, order: [['id', 'ASC']] })).map(row => row.toJSON()),
        responses: (await m.CompanyResponse.findAll({ where: { coop_request_id: accepted.id } })).map(row => row.toJSON()),
        responseHistory: (await m.CompanyResponseHistory.findAll({ order: [['id', 'ASC']] })).map(row => row.toJSON()),
      });
      const before = await evidence();
      assert.ok(before.documents.length === 2 && before.revisions.length >= 2 && before.responses.length === 1 && before.responseHistory.length >= 1);
      await open(accepted); assert.equal(await evaluate("document.getElementById('staffCoopCancel').disabled"), true);
      assert.equal((await api(cancelRoute(accepted.id), staffToken, { reason: 'Preserve documents' })).status, 409);
      assert.deepEqual(await evidence(), before);
      assert.equal((await m.CoopRequest.findByPk(rejected.id)).status, 'approved');
    });
    await step('L', 'Student submission → Class → Head remains intact; Staff cannot approve', async () => {
      const owner = await submitted('Approval regression');
      const staffAttempt = await api(`/api/staff/coop-requests/${owner.id}/approve`, staffToken, {});
      assert.equal(staffAttempt.status, 404);
      assert.equal((await api(`/api/teachers/coop-requests/${owner.id}/approve`, staffToken, {})).status, 403);
      await ok(api(`/api/teachers/coop-requests/${owner.id}/approve`, classToken, {}));
      assert.equal((await m.CoopRequest.findByPk(owner.id)).status, 'department_head_review');
      await ok(api(`/api/department-head/coop-requests/${owner.id}/approve`, headToken, {}));
      assert.equal((await m.CoopRequest.findByPk(owner.id)).status, 'approved');
      const audits = await m.CoopRequestReview.findAll({ where: { coop_request_id: owner.id }, order: [['created_at', 'ASC'], ['id', 'ASC']] });
      assert.deepEqual(audits.map(row => row.actor_role), ['student', 'teacher', 'department_head']);
      assert.equal((await api(`/api/teachers/coop-requests/${primary.id}/approve`, classToken, {})).status, 409);
      assert.equal((await cancelAudits(primary.id)).length, 1);
    });
    await step('J', 'Student owner password login reads saved cancellation and immutable history after reload', async () => {
      const before = await snapshot(primary), beforeAudit = (await cancelAudits(primary.id)).map(row => row.toJSON());
      const dailyBlocked = await api('/api/internship-logs/overview', primary.token);
      assert.equal(dailyBlocked.status, 409); assert.equal(dailyBlocked.data.code, 'INTERNSHIP_PERIOD_REQUIRED');
      // The existing dashboard eagerly loads daily logs. A cancelled-only
      // owner has no approved period: assert that exact business rejection,
      // rather than mistaking the expected surrounding-panel response for a bug.
      expectHttp('/api/internship-logs/overview', 409);
      await navigate(`${frontendUrl}/login.html`); await wait("!!document.getElementById('loginForm')", 'Student login form');
      await value('loginEmail', primary.student.email); await value('loginPassword', password); await click('#loginForm button[type=submit]');
      await wait("location.pathname.includes('student_coop') && !!document.querySelector('[data-target=\"panel-request\"]')", 'owner Student dashboard');
      async function readback() {
        await wait("document.getElementById('dailyStatus').textContent.includes('ต้องมีคำร้องที่อนุมัติ')", 'cancelled owner has no active daily-log period');
        await click('[data-target="panel-request"]');
        await wait(`!!document.querySelector('#coopRequestHistoryBody button[data-request-id="${primary.id}"]:not(:disabled)')`, 'owner history ready');
        const list = await evaluate(`(()=>{const rows=[...document.querySelectorAll('#coopRequestHistoryBody tr')];return rows.find(row=>row.querySelector('button')?.dataset.requestId===${JSON.stringify(primary.id)})?.textContent})()`);
        assert.match(list, /ยกเลิก/);
        await click(`#coopRequestHistoryBody button[data-request-id="${primary.id}"]`);
        await wait("document.getElementById('coopDetailRequest').textContent.includes('เหตุผลการยกเลิก')", 'saved cancellation detail');
        const text = await evaluate("document.getElementById('coopDetailRequest').textContent");
        assert.match(text, /Browser cancellation.*เจ้าหน้าที่ภาควิชา.*ยกเลิกเมื่อ/s);
        const date = await evaluate(`new Intl.DateTimeFormat('th-TH',{dateStyle:'medium'}).format(new Date(${JSON.stringify(before.cancelled_at)}))`);
        assert.ok(text.includes(date));
        assert.equal(await evaluate("!!document.querySelector('#coopDetailRequest textarea, #coopDetailRequest input, #coopDetailRequest script')"), false);
        assert.equal(await evaluate("document.getElementById('coopRequestCurrent').hidden"), true);
      }
      await readback(); await capture('student-cancellation-desktop');
      const result = await api(`/api/coop-requests/${primary.id}`, primary.token);
      assert.equal(result.status, 200); assert.equal(result.data.data.status, 'cancelled');
      assert.equal(result.data.data.reviews.find(row => row.decision === 'cancel').department_staff_id, staff.id);
      const foreign = await api(`/api/coop-requests/${primary.id}`, accepted.token);
      assert.equal(foreign.status, 404); assert.equal(foreign.data.data, undefined);
      const foreignList = (await ok(api('/api/coop-requests/me', accepted.token))).data;
      assert.ok(foreignList.every(row => row.id !== primary.id));
      assert.equal((await api(`/api/coop-requests/${primary.id}/cancel`, primary.token, undefined, 'PATCH')).status, 400);
      assert.equal((await api(cancelRoute(primary.id), primary.token, { reason: 'Rewrite' })).status, 403);
      expectHttp('/api/internship-logs/overview', 409);
      await navigate(`${frontendUrl}/src/student_coop/student_coop.html`); await readback();
      assert.deepEqual(await snapshot(primary), before); assert.deepEqual((await cancelAudits(primary.id)).map(row => row.toJSON()), beforeAudit);
      await browser.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'Student mobile fits viewport');
      await capture('student-cancellation-mobile');
      await browser.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    });
    await step('UI', 'Staff navigation/mobile and console/network checks', async () => {
      await staffLogin(); await open(primary);
      await browser.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'Staff mobile fits viewport');
      await capture('staff-cancellation-mobile');
      await click('a[href="#activities"]'); await wait("!document.getElementById('activities').hidden", 'original calendar navigation');
      await click('a[href="#documents"]'); await wait("!document.getElementById('documents').hidden", 'original document navigation');
      assert.equal(await evaluate("document.getElementById('staffCoopCancel').disabled"), true);
      assert.deepEqual(runtimeErrors, []); assert.deepEqual(interceptorErrors, []);
      // Chrome logs expected HTTP errors as network entries. Keep the exact
      // asserted failures; reject any other application API error.
      assert.deepEqual(consoleErrors.filter(row => row.source !== 'network'), []);
      const observed = failedResponses.filter(row => row.url.startsWith('/api/'));
      const remaining = new Map(expectedHttpFailures);
      for (const row of observed) {
        const key = `${row.url}:${row.status}`, budget = remaining.get(key) || 0;
        assert.ok(budget > 0, `Unexpected application HTTP failure: ${key}`); remaining.set(key, budget - 1);
      }
      assert.ok([...remaining.values()].every(count => count === 0), 'All planned real error responses were observed');
    });
    completed = true;
  } finally {
    try { await stopIntercepting(); } catch { interceptorErrors.push('CDP interception cleanup failed'); }
    const summary = { suite: 'Staff Coop Cancellation / Scope 2.3.2 (2)', type: 'real Chrome + production API + disposable PostgreSQL',
      browserProduct, runId: process.env.FITM_STAFF_BROWSER_RUN_ID,
      database: { host: '127.0.0.1', name: 'fitm_staff_browser_test', marker: 'fitm.a017_disposable=on' },
      startedAt, finishedAt: new Date().toISOString(), status: completed && !interceptorErrors.length ? 'PASS' : 'FAIL',
      pass: steps.filter(row => row.status === 'PASS').length, fail: steps.filter(row => row.status === 'FAIL').length, skip: 0,
      steps, cancellationPostCount: cancellationRequests.length, runtimeErrorCount: runtimeErrors.length,
      consoleErrorCount: consoleErrors.filter(row => row.source !== 'network').length, interceptorErrors,
      httpFailures: failedResponses.filter(row => row.url.startsWith('/api/')),
      transportFault: 'Fetch.failRequest: deliberate failure only; retry calls production API',
      cleanup: 'Scenario summary precedes resource cleanup; require runner exit 0 and successful owned-resource cleanup for acceptance' };
    await fs.writeFile(path.join(artifactRoot, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log(`Cancellation scenarios: ${summary.pass} PASS / ${summary.fail} FAIL / 0 SKIP; completed=${completed}`);
    if (interceptorErrors.length) throw Error('Cancellation interception or cleanup failed');
  }
};
