// Explicit real-Chrome/real-API runner. Never selects a configured Local DB.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const { validateDisposableTarget, browserArtifactRoot } = require('./staffBrowserEnvironment');
const { clickMouse, pressKey } = require('./staffBrowserInput');
const { createBrowserEvaluate } = require('./staffBrowserEvaluation');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await pause(100); }
  throw Error(`Timed out: ${label}`);
}
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}
function cdp(socket) {
  let id = 0; const pending = new Map(), listeners = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const job = pending.get(message.id); if (job) { pending.delete(message.id); clearTimeout(job.timer); message.error ? job.reject(Error(message.error.message)) : job.resolve(message.result); } }
    else for (const listener of listeners.get(message.method) || []) listener(message.params);
  });
  return {
    on(method, listener) { const list = listeners.get(method) || []; list.push(listener); listeners.set(method, list); },
    send(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; const timer = setTimeout(() => { pending.delete(key); reject(Error(`CDP timeout: ${method}`)); }, 20000); pending.set(key, { resolve, reject, timer }); socket.send(JSON.stringify({ id: key, method, params })); }); },
  };
}

const calendarMode = process.env.FITM_ACTIVITY_CALENDAR_BROWSER === '1';
const dailyLogMode = process.env.FITM_DAILY_LOG_BROWSER === '1';
const resultMode = process.env.FITM_SUPERVISION_RESULTS_BROWSER === '1';
const supervisionMode = process.env.FITM_SUPERVISION_BROWSER === '1';
const cancellationMode = process.env.FITM_STAFF_CANCELLATION_BROWSER === '1';
test(`Real Chrome ${cancellationMode ? 'Staff Coop Cancellation' : calendarMode ? 'Activity Calendar' : resultMode ? 'Supervision Results' : supervisionMode ? 'Supervision' : dailyLogMode ? 'Daily Log / Mentor' : 'Staff'} acceptance with isolated PostgreSQL and production API/UI`, async t => {
  const databaseUrl = process.env.FITM_STAFF_BROWSER_DATABASE_URL;
  const target = validateDisposableTarget(process.env);
  const root = path.resolve(__dirname, '../..'), artifactRoot = browserArtifactRoot(root, process.env);
  const documentMode = !cancellationMode && !calendarMode && !supervisionMode && !dailyLogMode;
  const documentSteps = [];
  async function documentTest(id, description, action) {
    const entry = { id, description, status: 'RUNNING', startedAt: new Date().toISOString() };
    documentSteps.push(entry);
    let failure;
    await t.test(description, async () => {
      try { await action(); entry.status = 'PASS'; }
      catch (error) {
        failure = error; entry.status = 'FAIL';
        try {
          await evaluate("document.querySelectorAll('input[type=password]').forEach(input=>{input.value=''})");
          const shot = await browser.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
          await fs.writeFile(path.join(artifactRoot, `failure-${id}.png`), Buffer.from(shot.data, 'base64'));
        } catch { entry.screenshot = 'unavailable'; }
        throw error;
      }
      finally { entry.finishedAt = new Date().toISOString(); }
    });
    if (failure) throw Error(`Document acceptance stopped after ${id}`);
  }
  console.log(`Browser evidence: ${path.relative(root, artifactRoot)}`);
  await fs.mkdir(artifactRoot, { recursive: true });
  const profile = await fs.mkdtemp(path.join(artifactRoot, 'owned-chrome-profile-'));
  const privateStorage = await fs.mkdtemp(path.join(artifactRoot, 'owned-private-storage-'));
  const previousStorage = process.env.STORAGE_ROOT; process.env.STORAGE_ROOT = privateStorage;
  const db = new Sequelize(databaseUrl, { logging: false });
  let apiProcess, browserProcess, vite, socket, browser, evaluate, models, browserProduct, runPassed = false;
  const runtimeErrors = [], consoleErrors = [], failedResponses = [];
  try {
    const [[guard]] = await db.query("SELECT current_database() AS db, current_setting('fitm.a017_disposable',true) AS marker");
    assert.equal(guard.db, 'fitm_staff_browser_test'); assert.equal(guard.marker, 'on');
    const umzug = new Umzug({ migrations: { glob: ['*.js', { cwd: path.join(root, 'backend/src/db/migrations') }] }, context: db.getQueryInterface(), storage: new SequelizeStorage({ sequelize: db, tableName: 'sequelize_meta' }), logger: undefined });
    await umzug.up(); assert.equal((await umzug.executed()).length, 22); assert.equal((await umzug.pending()).length, 0);
    const m = require('../src/models'); models = m; await m.sequelize.authenticate();
    const [[actual]] = await m.sequelize.query('SELECT current_database() AS db'); assert.equal(actual.db, guard.db);
    const run = crypto.randomUUID(), password = crypto.randomBytes(24).toString('base64url');
    const teacher = await m.Teacher.create({ first_name: 'Browser Class', last_name: 'Fixture', department: 'FITM', email: `class-${run}@fixture.invalid`, password });
    const project = await m.Teacher.create({ first_name: 'Browser Project', last_name: 'Fixture', department: 'FITM', ...(supervisionMode && { email: `project-${run}@fixture.invalid`, password }) });
    const head = await m.Teacher.create({ first_name: 'Browser Head', last_name: 'Fixture', department: 'FITM', is_department_head: true, email: `head-${run}@fixture.invalid`, password });
    const staff = await m.DepartmentStaff.create({ first_name: 'Browser Staff', last_name: 'Fixture', email: `staff-${run}@fixture.invalid`, password });
    const apiPort = await freePort(), apiUrl = `http://127.0.0.1:${apiPort}`;
    const { createServer } = await import(pathToFileURL(path.join(root, 'frontend/node_modules/vite/dist/node/index.js')).href);
    process.env.VITE_API_URL = apiUrl;
    vite = await createServer({ root: path.join(root, 'frontend'), configFile: path.join(root, 'frontend/vite.config.js'), configLoader: 'native', server: { host: '127.0.0.1', port: 0, strictPort: true } });
    await vite.listen(); const frontendUrl = `http://127.0.0.1:${vite.httpServer.address().port}`;
    apiProcess = spawn(process.execPath, ['src/app.js'], { cwd: path.join(root, 'backend'), windowsHide: true, env: { ...process.env, PORT: String(apiPort), FRONTEND_URL: frontendUrl, SMTP_HOST: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let apiDiagnostics = '';
    const collectApi = chunk => { apiDiagnostics = (apiDiagnostics + chunk.toString()).slice(-3000); };
    apiProcess.stdout.on('data', collectApi); apiProcess.stderr.on('data', collectApi);
    apiProcess.on('error', error => { apiDiagnostics += ` API launch ${error.code}`; });
    try { await until(async () => { try { return (await fetch(`${apiUrl}/health/db`)).ok; } catch { return false; } }, 'isolated API health', 30000); }
    catch (error) {
      // Diagnostics describe only this disposable process; redact generated secrets.
      let safe = apiDiagnostics; for (const secret of [target.password, process.env.DB_PASSWORD, process.env.JWT_SECRET, password]) if(secret) safe = safe.replaceAll(secret,'[redacted]');
      throw Error(`${error.message}; process exit=${apiProcess.exitCode}; ${safe}`);
    }
    async function api(endpoint, token, body, method = body === undefined ? 'GET' : 'POST') {
      const response = await fetch(apiUrl + endpoint, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : { message: 'Route unavailable' };
      return { status: response.status, data };
    }
    async function ok(call) { const result = await call; assert.ok([200, 201].includes(result.status), `API returned ${result.status}: ${result.data.message || 'operation failed'}`); return result.data; }
    const login = async (endpoint, email) => (await ok(api(endpoint, null, { email, password }))).token;
    const classToken = await login('/api/teachers/auth/login', teacher.email), headToken = await login('/api/department-head/auth/login', head.email), staffToken = await login('/api/staff/auth/login', staff.email);
    async function fixture(name, dates = {}) {
      const id = crypto.randomUUID(), student = await m.Student.create({ student_id: `browser-${id}`, first_name: name, last_name: 'Fixture', major: 'IT', email: `${id}@email.kmutnb.ac.th`, password, track: 'co_op', advisor_teacher_id: teacher.id, coop_advisor_teacher_id: project.id });
      const token = await login('/api/auth/login', student.email), { CATALOG } = require('../src/services/coopPrerequisites');
      const request = (await ok(api('/api/coop-requests', token, { company_name: `${name} Company`, company_address: 'Browser frozen address', company_province: 'Bangkok', letter_recipient_name: 'HR Fixture', work_start_date: '2026-11-01', work_end_date: '2027-02-01', ...dates, delivery_methods: ['email'], prerequisite_courses: CATALOG.IT.map(([course_code]) => ({ course_code, status: 'passed', grade: 'A' })) }))).data;
      await ok(api(`/api/teachers/coop-requests/${request.id}/approve`, classToken, {})); await ok(api(`/api/department-head/coop-requests/${request.id}/approve`, headToken, {}));
      return { student, token, id: request.id };
    }
    const accepted = await fixture('Browser Accepted'), rejected = await fixture('Browser Rejected');
    const endpoint = owner => `/api/staff/document-requests/${owner.id}`;
    const rejectDoc = (await ok(api(`${endpoint(rejected)}/documents/cooperation`, staffToken, {}))).data;
    await ok(api(`${endpoint(rejected)}/documents/cooperation/generate`, staffToken, { version: rejectDoc.version }));
    browserProcess = spawn(process.env.FITM_STAFF_BROWSER_CHROME, ['--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    browserProcess.on('error', error => runtimeErrors.push(`Chrome launch: ${error.code}`));
    await until(async () => { try { return !!(await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')); } catch { return false; } }, 'Chrome debugging endpoint');
    const debugPort = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
    const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    browser = cdp(socket); browser.on('Runtime.exceptionThrown', event => runtimeErrors.push(event.exceptionDetails.text));
    browser.on('Runtime.consoleAPICalled', event => { if (event.type === 'error') runtimeErrors.push('Application console.error'); });
    browser.on('Log.entryAdded', ({ entry }) => { if (entry.level === 'error') consoleErrors.push({ source: entry.source, text: entry.text }); });
    browser.on('Network.responseReceived', ({ response }) => { if (response.status >= 400) failedResponses.push({ url: new URL(response.url).pathname, status: response.status }); });
    for (const domain of ['Page', 'Runtime', 'Network', 'Log']) await browser.send(`${domain}.enable`);
    const browserVersion = await browser.send('Browser.getVersion'); console.log(`Real browser: ${browserVersion.product}`);
    browserProduct = browserVersion.product;
    await browser.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: artifactRoot, eventsEnabled: true });
    await browser.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    const evaluationFailures = [];
    evaluate = createBrowserEvaluate(browser, { onException: async diagnostic => {
      evaluationFailures.push(diagnostic);
      await fs.writeFile(path.join(artifactRoot, 'evaluation-errors.json'), JSON.stringify(evaluationFailures, null, 2));
    } });
    const value = (id, input) => evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(input)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const click = selector => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)throw Error('Unavailable control');e.click();})()`);
    const wait = (expression, label) => until(() => evaluate(expression), label);
    async function confirm() { await wait("!!document.querySelector('.app-confirm-overlay:not(.is-leaving) .app-confirm-modal__confirm')", 'confirmation'); await click('.app-confirm-overlay:not(.is-leaving) .app-confirm-modal__confirm'); await wait("!document.querySelector('.app-confirm-overlay:not(.is-leaving)')", 'save and modal close'); await wait("!document.getElementById('staffSave').disabled", 'detail reload'); }
    async function open(owner) { await value('staffSearch', owner.student.first_name); await click('#staffSearchButton'); await wait("document.querySelectorAll('#staffDocumentList article').length===1", 'filtered queue'); await click('#staffDocumentList article button'); await wait("!document.getElementById('staffDocumentForm').hidden", 'request detail'); }
    async function respond(status, reason) { await value('staffCompanyResponseStatus', status); await value('staffCompanyRespondedAt', '2026-01-02'); if (reason) await value('staffCompanyCorrectionReason', reason); await click('#staffCompanyResponseSave'); await confirm(); }

    if (cancellationMode) {
      await require('./staffCoopCancellationBrowserScenarios')({ t, m, teacher, head, staff, password, staffToken, classToken, headToken, accepted, rejected, api, ok, login, frontendUrl, apiUrl, browser, browserProduct: browserVersion.product, evaluate, value, click, wait, until, artifactRoot, runtimeErrors, consoleErrors, failedResponses });
    } else if (calendarMode) {
      await require('./coopActivityBrowserScenarios')({ t,m,owner:accepted,staff,password,staffToken,api,ok,frontendUrl,browser,evaluate,value,click,wait,until,artifactRoot,runtimeErrors });
    } else if (supervisionMode) {
      await require('./supervisionBrowserScenarios')({ t, m, owner: accepted, otherOwner: rejected, project, teacher, password, run, api, ok, login, frontendUrl, browser, evaluate, value, click, wait, until, pause, artifactRoot, runtimeErrors, consoleErrors, failedResponses });
    } else if (!dailyLogMode) {
    await documentTest('login', 'Real password login and approved document queue', async () => {
      await browser.send('Page.navigate', { url: `${frontendUrl}/staff-login.html` }); await wait("!!document.getElementById('staffLoginForm')", 'Staff login');
      await value('staffEmail', staff.email); await value('staffPassword', password); await click('#staffLoginForm button[type=submit]');
      await wait("location.pathname.includes('department_staff') && document.querySelectorAll('#staffDocumentList article').length===2", 'authenticated queue');
      assert.match(await evaluate("document.getElementById('staffName').textContent"), /Browser Staff/);
    });
    let cooperation, placement, savedSnapshot;
    async function modalDismissal(opener) {
      const modelsToSnapshot = [m.CoopRequest, m.CoopRequestReview, m.CoopDocument, m.CoopDocumentRevision, m.CompanyResponse, m.CompanyResponseHistory];
      const snapshot = () => Promise.all(modelsToSnapshot.map(model => model.findAll({ raw: true, order: [['id', 'ASC']] })));
      const before = await snapshot(), writes = [];
      const focus = [];
      let sqlUnchanged = null;
      const recordFocus = async phase => {
        focus.push({ opener, phase, ...await evaluate(`(() => {
          const active = document.activeElement, modal = document.querySelector('.app-confirm-overlay:not(.is-leaving)');
          const trigger = document.querySelector(${JSON.stringify(opener)});
          return { activeControl: active === trigger ? 'opener'
            : active === modal?.querySelector('.app-confirm-modal__confirm') ? 'confirm'
              : active === modal?.querySelector('.app-confirm-modal__cancel') ? 'back' : 'other',
            modalPresent: !!modal, triggerConnected: !!trigger?.isConnected,
            triggerDisabled: !!trigger?.disabled, documentHasFocus: document.hasFocus() };
        })()`) });
      };
      let monitoring = true;
      browser.on('Network.requestWillBeSent', ({ request }) => {
        if (monitoring && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && new URL(request.url).pathname.startsWith('/api/staff/')) writes.push(request.method);
      });
      try {
      await wait("!document.querySelector('.app-confirm-overlay')", 'previous document modal removed');
      for (const dismissal of ['Back', 'Escape']) {
        await clickMouse(browser, evaluate, opener);
        await wait("!!document.querySelector('.app-confirm-overlay:not(.is-leaving)')", 'document modal opened');
        await recordFocus(`${dismissal}: opened`);
        assert.equal(await evaluate("document.activeElement===document.querySelector('.app-confirm-overlay:not(.is-leaving) .app-confirm-modal__confirm')"), true, 'Document modal initially focuses Confirm, as defined by the shared modal');
        if (dismissal === 'Back') await clickMouse(browser, evaluate, '.app-confirm-overlay:not(.is-leaving) .app-confirm-modal__cancel');
        else await pressKey(browser, 'Escape');
        await wait("!document.querySelector('.app-confirm-overlay')", 'document modal removed');
        await recordFocus(`${dismissal}: closed`);
        assert.equal(await evaluate(`document.activeElement===document.querySelector(${JSON.stringify(opener)})`), true);
      }
      assert.deepEqual(writes, [], 'Document dismissal sends no mutation');
      assert.deepEqual(await snapshot(), before, 'Document dismissal preserves SQL records/history');
      sqlUnchanged = true;
      } finally {
        monitoring = false;
        try { await fs.writeFile(path.join(artifactRoot, `document-input-${opener.slice(1)}.json`), JSON.stringify({
          focus, mutationCount: writes.length, mutationMethods: writes, sqlUnchanged,
        }, null, 2)); } catch { /* Diagnostics must not replace the original assertion. */ }
      }
    }
    await documentTest('document-modal-focus', 'Document Back/Escape restores opener without HTTP or SQL writes', async () => {
      await open(accepted); await modalDismissal('#staffSave');
    });
    await documentTest('cooperation', 'Cooperation draft/edit/generate uses real Staff UI and PostgreSQL', async () => {
      await open(accepted); assert.equal(await evaluate("document.getElementById('staffCompanyResponseSave').disabled"), true);
      await value('staffNotes', 'Browser cooperation draft'); await click('#staffSave'); await confirm();
      await value('staffNotes', 'Browser cooperation edit'); await click('#staffSave'); await confirm(); await click('#staffGenerate'); await confirm();
      cooperation = await m.CoopDocument.findOne({ where: { coop_request_id: accepted.id, document_type: 'cooperation' } });
      assert.equal(cooperation.status, 'generated'); assert.equal(cooperation.version, 3); assert.equal(cooperation.updated_by, staff.id);
    });
    await documentTest('response-modal-focus', 'Generate and Company Response Back/Escape restore openers without HTTP or SQL writes', async () => {
      await modalDismissal('#staffGenerate');
      await value('staffCompanyRespondedAt', '2026-01-02'); await modalDismissal('#staffCompanyResponseSave');
    });
    await documentTest('response-validation', 'Invalid response date shows backend error in real modal', async () => {
      await value('staffCompanyRespondedAt', '2999-01-01'); await click('#staffCompanyResponseSave'); await click('.app-confirm-overlay:not(.is-leaving) .app-confirm-modal__confirm');
      await wait("document.querySelector('.app-confirm-modal__error')?.textContent.includes('อนาคต')", 'business error feedback');
      assert.equal(await m.CompanyResponse.count(), 0); await click('.app-confirm-overlay:not(.is-leaving) .app-confirm-modal__cancel');
    });
    await documentTest('response-history', 'Acceptance/corrections/history persist; UI eligibility follows backend', async () => {
      await respond('accepted'); assert.equal(await evaluate("document.getElementById('staffPlacementCreate').disabled"), false);
      await respond('rejected', 'Browser correction to rejection'); assert.equal(await evaluate("document.getElementById('staffPlacementCreate').disabled"), true);
      await respond('accepted', 'Browser corrected acceptance'); const response = await m.CompanyResponse.findOne({ where: { coop_request_id: accepted.id } });
      assert.equal(response.version, 3); assert.equal(response.department_staff_id, staff.id);
      assert.deepEqual((await m.CompanyResponseHistory.findAll({ where: { company_response_id: response.id }, order: [['version', 'ASC']] })).map(row => row.status), ['accepted', 'rejected', 'accepted']);
      assert.match(await evaluate("document.getElementById('staffCompanyResponseHistory').textContent"), /Browser corrected acceptance/);
    });
    await documentTest('placement', 'Placement draft locks response; edit/generate freeze accepted evidence', async () => {
      await click('#staffPlacementCreate'); await value('staffNotes', 'Browser placement draft'); await click('#staffSave'); await confirm();
      placement = await m.CoopDocument.findOne({ where: { coop_request_id: accepted.id, document_type: 'placement' } });
      const locked = await api(`${endpoint(accepted)}/company-response`, staffToken, { status: 'rejected', responded_at: '2026-01-02', version: 3, correction_reason: 'Direct API attempt' }, 'PUT'); assert.equal(locked.status, 409); assert.equal(locked.data.code, 'COMPANY_RESPONSE_LOCKED_BY_PLACEMENT');
      assert.equal(await evaluate("document.getElementById('staffCompanyResponseSave').disabled"), true);
      await value('staffNotes', 'Browser placement edited'); await click('#staffSave'); await confirm(); await click('#staffGenerate'); await confirm();
      await placement.reload(); assert.equal(placement.status, 'generated'); assert.equal(placement.version, 3); assert.equal(placement.snapshot.company_response.version, 3); savedSnapshot = JSON.stringify(placement.snapshot);
    });
    await documentTest('document-controls', 'Native HTML preview/download/print controls execute in Chrome', async () => {
      await click('#staffPreview'); await wait("!document.getElementById('staffPreviewFrame').hidden && document.getElementById('staffPreviewFrame').contentDocument?.body?.textContent.includes('Browser placement edited')", 'real iframe preview');
      await evaluate("window.__nativePrintEvents=0;document.getElementById('staffPreviewFrame').contentWindow.addEventListener('beforeprint',()=>window.__nativePrintEvents++);");
      await click('#staffPrint'); await wait('window.__nativePrintEvents>0', 'native beforeprint event');
      const expected = `placement-${placement.id}-v3.html`; await fs.rm(path.join(artifactRoot, expected), { force: true }); await click('#staffDownload'); await until(async () => { try { return (await fs.readFile(path.join(artifactRoot, expected), 'utf8')).includes('Browser placement edited'); } catch { return false; } }, 'real downloaded HTML');
      assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(artifactRoot, expected))).digest('hex'), placement.content_sha256);
      await evaluate("document.querySelectorAll('.app-toast__close').forEach(button=>button.click())"); await wait("!document.querySelector('.app-toast')", 'dismiss transient feedback');
      await evaluate('window.scrollTo(0,0)'); await pause(100);
      const screenshot = await browser.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await fs.writeFile(path.join(artifactRoot, 'staff-desktop.png'), Buffer.from(screenshot.data, 'base64'));
    });
    await documentTest('immutable-revisions', 'Regeneration preserves snapshot and old generated revision after source changes', async () => {
      await m.CoopRequest.update({ company_address: 'Changed disposable source' }, { where: { id: accepted.id } });
      await click('#staffGenerate'); await confirm(); await placement.reload(); assert.equal(placement.version, 4); assert.equal(JSON.stringify(placement.snapshot), savedSnapshot);
      const old = await m.CoopDocumentRevision.findOne({ where: { coop_document_id: placement.id, version: 3 } }); assert.equal(old.status, 'generated'); assert.match(old.rendered_html, /Browser frozen address/);
    });
    await documentTest('rejected-response', 'Rejected response saves through UI and blocks direct Placement API', async () => {
      await value('staffDocumentType', 'cooperation'); await open(rejected); await respond('rejected');
      const response = await m.CompanyResponse.findOne({ where: { coop_request_id: rejected.id } }); assert.equal(response.status, 'rejected'); assert.equal(response.department_staff_id, staff.id);
      assert.equal(await evaluate("document.getElementById('staffPlacementCreate').disabled"), true);
      const blocked = await api(`${endpoint(rejected)}/documents/placement`, staffToken, {}); assert.equal(blocked.status, 409); assert.equal(blocked.data.code, 'COMPANY_RESPONSE_REJECTED');
    });
    await documentTest('mobile', 'Responsive mobile page keeps controls within viewport', async () => {
      await browser.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await evaluate("document.querySelectorAll('.app-toast__close').forEach(button=>button.click())"); await wait("!document.querySelector('.app-toast')", 'dismiss mobile feedback');
      await evaluate('window.scrollTo(0,0)'); await pause(100);
      await pause(200); assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), 'Staff page overflows mobile viewport');
      const screenshot = await browser.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await fs.writeFile(path.join(artifactRoot, 'staff-mobile.png'), Buffer.from(screenshot.data, 'base64'));
    });
    await documentTest('network-recovery', 'Actual loading and network-error feedback recover on refresh', async () => {
      await browser.send('Network.emulateNetworkConditions', { offline: false, latency: 800, downloadThroughput: -1, uploadThroughput: -1 }); await click('#staffRefresh');
      assert.equal(await evaluate("document.getElementById('staffRefresh').disabled"), true); assert.match(await evaluate("document.getElementById('staffMessage').textContent"), /กำลังโหลด/);
      await wait("!document.getElementById('staffRefresh').disabled", 'loading completes');
      await browser.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await click('#staffRefresh');
      await wait("document.getElementById('staffMessage').textContent.includes('โหลดคำร้องไม่สำเร็จ')", 'network failure feedback');
      await browser.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await click('#staffRefresh'); await wait("!document.getElementById('staffRefresh').disabled && document.querySelectorAll('#staffDocumentList article').length===1", 'network recovery');
    });
    await documentTest('integrity', 'No unexpected console/runtime/API errors; authenticated SQL associations remain correct', async () => {
      assert.deepEqual(runtimeErrors, []);
      assert.deepEqual(failedResponses.filter(row => !(row.status === 400 && row.url.endsWith('/company-response')) && !row.url.endsWith('/favicon.ico')), []);
      assert.deepEqual(consoleErrors.filter(row => row.source !== 'network'), []);
      assert.equal(await m.StudentFile.count(), 0); assert.equal((await m.CoopRequest.findByPk(accepted.id)).status, 'approved');
      assert.equal((await m.Student.findByPk(accepted.student.id)).advisor_teacher_id, teacher.id); assert.equal((await m.Student.findByPk(accepted.student.id)).coop_advisor_teacher_id, project.id);
      const associated = await m.CompanyResponse.findOne({ where: { coop_request_id: accepted.id }, include: [{ model: m.CoopRequest, as: 'request' }, { model: m.DepartmentStaff, as: 'staff', attributes: ['id'] }, { model: m.CoopDocument, as: 'cooperationDocument' }] });
      assert.equal(associated.request.id, accepted.id); assert.equal(associated.staff.id, staff.id); assert.equal(associated.cooperationDocument.id, cooperation.id);
    });
    } else {
      let dailyFailed = false;
      const dailyTest = (name, fn) => t.test(name, { skip: dailyFailed }, async () => {
        try { await fn(); } catch (error) {
          dailyFailed = true;
          console.log('Daily browser diagnostic:', await evaluate("JSON.stringify({path:location.pathname,status:document.getElementById('dailyStatus')?.textContent,login:document.getElementById('loginMessage')?.textContent,verification:document.getElementById('verificationStateMessage')?.textContent,rows:document.querySelectorAll('#dailyLogTableBody tr').length,editorHidden:document.getElementById('dailyEditor')?.hidden,saveDisabled:document.getElementById('saveDailyLogBtn')?.disabled})"));
          throw error;
        }
      });
      const owner = await fixture('Browser Daily', { work_start_date: '2026-09-23', work_end_date: '2026-10-08' });
      const mentor = await m.Mentor.create({ student_id: owner.student.id, first_name: 'Browser Mentor', last_name: 'Fixture', position: 'Fixture', email: `mentor-${run}@fixture.invalid` });
      const verification = await require('../src/services/mentorToken.service').createMentorVerificationToken(mentor.id);
      const loadedDocuments = new Set();
      browser.on('Page.lifecycleEvent', event => { if (event.name === 'DOMContentLoaded') loadedDocuments.add(event.loaderId); });
      await browser.send('Page.setLifecycleEventsEnabled', { enabled: true });
      const navigate = async url => { const navigation = await browser.send('Page.navigate', { url }); if (navigation.loaderId) await until(() => loadedDocuments.has(navigation.loaderId), 'new browser document loaded'); };
      async function modalConfirm() { await wait("!!document.querySelector('.app-confirm-overlay:not(.is-leaving) .app-confirm-modal__confirm')", 'weekly confirmation'); await click('.app-confirm-overlay:not(.is-leaving) .app-confirm-modal__confirm'); await wait("!document.querySelector('.app-confirm-overlay:not(.is-leaving)')", 'weekly confirmation committed'); }
      async function studentPage() { await navigate(`${frontendUrl}/src/student_coop/student_coop.html`); await wait("!!document.getElementById('dailyWeekDate')", 'Student dashboard'); await click('[data-target="panel-daily"]'); await value('dailyWeekDate', '2026-09-23'); await wait("document.querySelectorAll('#dailyLogTableBody tr').length===5", 'five applicable dates'); }
      async function editFirst(result) { await wait("!document.getElementById('saveDailyLogBtn').disabled", 'daily save idle'); await click('#dailyLogTableBody tr:first-child button'); await wait("!document.getElementById('dailyEditor').hidden", 'daily editor opened'); for (const [field, text] of Object.entries({ assigned_work: 'Browser daily work', work_result: result, problems: 'ไม่มีปัญหา', solutions: 'ไม่ต้องแก้ไข', notes: 'Browser note' })) await value('daily_' + field, text); await click('#saveDailyLogBtn'); await wait("document.getElementById('dailyEditor').hidden && !document.getElementById('saveDailyLogBtn').disabled", 'daily saved and refreshed'); }
      let access, weekId;
      await dailyTest('Existing Mentor verification still confirms once through real UI', async () => {
        await navigate(`${frontendUrl}/src/mentor_coop/mentor_verify_user.html?token=${verification.token}`); await wait("!document.getElementById('mentorFieldset').disabled", 'verification loaded'); await click('#confirmVerificationButton'); await modalConfirm(); await mentor.reload(); assert.equal(mentor.status, 'verified'); assert.ok(mentor.verified_at);
      });
      await dailyTest('Student password login opens existing Daily menu and missing partial-week dates', async () => {
        await navigate(`${frontendUrl}/login.html`); await wait("!!document.getElementById('loginForm')", 'Student login'); await value('loginEmail', owner.student.email); await value('loginPassword', password); await click('#loginForm button[type=submit]'); await wait("location.pathname.includes('student_coop')", 'Student password login'); await studentPage(); assert.match(await evaluate("document.getElementById('dailyStatus').textContent"), /วันที่ยังขาด/);
      });
      await dailyTest('Daily create/edit persists real fields without problem fabrication', async () => {
        await editFirst('Browser initial result'); await editFirst('Browser corrected result'); const row = await m.InternshipDailyLog.findOne({ where: { student_id: owner.student.id, log_date: '2026-09-23' } }); assert.equal(row.version, 2); assert.equal(row.work_result, 'Browser corrected result'); assert.equal(row.problems, 'ไม่มีปัญหา');
      });
      await dailyTest('Missing-day submit denied; remaining working/holiday days complete via UI', async () => {
        assert.equal(await evaluate("document.getElementById('submitDailyWeek').disabled"), true);
        const missing = await api('/api/internship-logs/weeks/2026-09-21/submit', owner.token, { version: 0 }); assert.equal(missing.status, 400); assert.equal(missing.data.missing_dates.length, 4);
        for (let index = 1; index < 5; index++) { await click(`#dailyLogTableBody tr:nth-child(${index + 1}) button`); await value('dailyKind', 'non_working'); await value('daily_non_working_reason', index > 2 ? 'วันหยุด' : 'ลา'); await click('#saveDailyLogBtn'); await wait("document.getElementById('dailyEditor').hidden && !document.getElementById('saveDailyLogBtn').disabled", 'nonworking saved'); }
        assert.equal(await evaluate("document.getElementById('submitDailyWeek').disabled"), false);
      });
      await dailyTest('Weekly submit confirmation freezes all five logs and survives failed fixture email', async () => {
        await click('#submitDailyWeek'); await modalConfirm(); await wait("document.getElementById('dailyWeekSummary').textContent.includes('ส่งประเมินแล้ว')", 'submitted state'); const row = await m.InternshipWeek.findOne({ where: { student_id: owner.student.id } }); weekId = row.id; assert.equal(row.snapshot.logs.length, 5); await click('#dailyLogTableBody tr:first-child button'); assert.equal(await evaluate("document.getElementById('dailyFieldset').disabled"), true);
        // Fixture-only capture of the same production capability issuer, without SMTP or exposing a token in evidence.
        access = (await require('../src/services/internshipLog.service').createInternshipLogService(m).resend(owner.student.id)).token;
      });
      await dailyTest('Mentor weekly link scopes Student and requests revisions for entire week', async () => {
        await navigate(`${frontendUrl}/src/mentor_coop/mentor_verify_user.html#review_token=${access}`); await wait("document.querySelectorAll('#mentorWeekList button').length===1", 'Mentor weekly list'); assert.equal(await evaluate('location.hash'), ''); await click('#mentorWeekList button'); await wait("document.querySelectorAll('#mentorReviewEntries article').length===5", 'weekly daily snapshots'); await value('mentorWeeklyFeedback', 'เพิ่มผลการปฏิบัติงาน'); await click('#mentorRequestRevision'); await modalConfirm(); await wait("document.getElementById('mentorReviewWeekTitle').textContent.includes('ต้องแก้ไข')", 'revision state'); assert.equal((await m.InternshipWeek.findByPk(weekId)).status, 'revision_requested');
      });
      await dailyTest('Student reads feedback, corrects/resubmits and keeps original snapshot', async () => {
        await studentPage(); await wait("document.getElementById('dailyHistory').textContent.includes('เพิ่มผลการปฏิบัติงาน')", 'Student feedback'); await editFirst('Browser revision result'); await click('#submitDailyWeek'); await modalConfirm(); await wait("document.getElementById('dailyWeekSummary').textContent.includes('ส่งประเมินแล้ว')", 'resubmitted'); const events = await m.InternshipWeekEvent.findAll({ where: { week_id: weekId }, order: [['version', 'ASC']] }); assert.equal(events.length, 3); assert.equal(events[0].snapshot.logs[0].work_result, 'Browser corrected result'); assert.equal(events[2].snapshot.logs[0].work_result, 'Browser revision result'); access = (await require('../src/services/internshipLog.service').createInternshipLogService(m).resend(owner.student.id)).token;
      });
      await dailyTest('Mentor confirms weekly review with name/date; Student reads final history', async () => {
        await navigate(`${frontendUrl}/src/mentor_coop/mentor_verify_user.html#review_token=${access}`); await wait("document.querySelectorAll('#mentorWeekList button').length===1", 'review list'); await click('#mentorWeekList button'); await wait("!document.getElementById('mentorReviewDetail').hidden && !document.getElementById('mentorReviewActions').hidden", 'review controls'); await value('mentorWeeklyFeedback', 'ตรวจแล้วครบถ้วน'); await click('#mentorMarkReviewed'); await modalConfirm(); await wait("document.getElementById('mentorReviewWeekTitle').textContent.includes('ตรวจแล้ว')", 'reviewed'); assert.match(await evaluate("document.getElementById('mentorReviewHistory').textContent"), /Browser Mentor/);
        await studentPage(); await wait("document.getElementById('dailyWeekSummary').textContent.includes('ตรวจแล้ว')", 'Student reviewed'); assert.match(await evaluate("document.getElementById('dailyHistory').textContent"), /ตรวจแล้วครบถ้วน/);
      });
      await dailyTest('Student desktop/mobile and Mentor mobile render within viewport', async () => {
        const capture = async name => { await evaluate("document.querySelectorAll('.app-toast__close').forEach(button=>button.click());window.scrollTo(0,0)"); await pause(300); const shot = await browser.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await fs.writeFile(path.join(artifactRoot, name), Buffer.from(shot.data, 'base64')); };
        await capture('student-daily-desktop.png'); await browser.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1')); await capture('student-daily-mobile.png');
        await navigate(`${frontendUrl}/src/mentor_coop/mentor_verify_user.html#review_token=${access}`); await wait("document.querySelectorAll('#mentorWeekList button').length===1", 'Mentor mobile'); await click('#mentorWeekList button'); await wait("!document.getElementById('mentorReviewDetail').hidden", 'Mentor mobile detail'); assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1')); await capture('mentor-week-mobile.png');
      });
      await dailyTest('Actual offline feedback recovers without stale review controls', async () => {
        await browser.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await click('#mentorReviewReload'); await wait("document.getElementById('verificationStateMessage').textContent.includes('Unable to connect')", 'offline feedback'); assert.equal(await evaluate("document.getElementById('mentorReviewDetail').hidden"), true);
        await browser.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await click('#mentorReviewReload'); await wait("document.querySelectorAll('#mentorWeekList button').length===1", 'network recovery');
      });
      await dailyTest('No unexpected runtime errors; Mentor deletion preserves weekly evidence and unrelated data', async () => { const deletion = await api('/api/mentors/me', owner.token, undefined, 'DELETE'); assert.equal(deletion.status, 409); assert.equal(deletion.data.code, 'MENTOR_HISTORY_EXISTS'); assert.ok(await m.Mentor.findByPk(mentor.id)); assert.deepEqual(runtimeErrors, []); assert.deepEqual(consoleErrors.filter(row => row.source !== 'network'), []); assert.deepEqual(failedResponses.filter(row => !row.url.endsWith('/favicon.ico')), []); assert.equal((await m.CoopRequest.findByPk(owner.id)).status, 'approved'); assert.equal(await m.StudentFile.count(), 0); assert.equal((await m.Student.findByPk(owner.student.id)).advisor_teacher_id, teacher.id); });
    }
    runPassed = true;
  } catch (error) {
    if (cancellationMode || documentMode) {
      const summaryPath = path.join(artifactRoot, 'summary.json');
      try { await fs.access(summaryPath); }
      catch {
        await fs.writeFile(summaryPath, JSON.stringify({ status: 'FAIL', stage: 'setup', pass: 0, fail: 0, skip: 0,
          finishedAt: new Date().toISOString(), error: 'Acceptance prerequisites or setup failed before scenarios; see test log' }, null, 2));
      }
    }
    throw error;
  } finally {
    const cleanupErrors = [];
    if (socket?.readyState === WebSocket.OPEN) { try { await browser.send('Browser.close'); } catch { /* process termination below remains mandatory */ } socket.close(); }
    for (const child of [browserProcess, apiProcess]) {
      if (child && child.exitCode === null && child.signalCode === null) {
        try { child.kill(); await until(() => child.exitCode !== null || child.signalCode !== null, 'owned process exit', 5000); }
        catch { cleanupErrors.push('owned process cleanup failed'); }
      }
    }
    for (const [label, close] of [['Vite', () => vite?.close()], ['models', () => models?.sequelize.close()], ['database', () => db.close()]]) {
      try { await close(); } catch { cleanupErrors.push(`${label} cleanup failed`); }
    }
    if (previousStorage === undefined) delete process.env.STORAGE_ROOT; else process.env.STORAGE_ROOT = previousStorage;
    // Only exclusively created directories under the exact artifact directory.
    for (const [directory, prefix] of [[privateStorage, 'owned-private-storage-'], [profile, 'owned-chrome-profile-']]) {
      try {
        assert.ok(path.dirname(path.resolve(directory)) === path.resolve(artifactRoot) && path.basename(directory).startsWith(prefix), 'Owned temporary path guard');
        await fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
      } catch { cleanupErrors.push(`${prefix} cleanup failed`); }
    }
    if (documentMode) {
      await fs.writeFile(path.join(artifactRoot, 'summary.json'), JSON.stringify({
        suite: 'Staff Document Regression', type: 'real Chrome + production API + disposable PostgreSQL',
        runId: process.env.FITM_STAFF_BROWSER_RUN_ID, browserProduct,
        status: runPassed && documentSteps.every(row => row.status === 'PASS') ? 'PASS' : 'FAIL',
        pass: documentSteps.filter(row => row.status === 'PASS').length,
        fail: documentSteps.filter(row => row.status === 'FAIL').length, skip: 0, steps: documentSteps,
        runtimeErrorCount: runtimeErrors.length, consoleErrorCount: consoleErrors.filter(row => row.source !== 'network').length,
      }, null, 2));
    }
    if (cancellationMode || documentMode) {
      await fs.writeFile(path.join(artifactRoot, 'runner.json'), JSON.stringify({ status: runPassed && !cleanupErrors.length ? 'PASS' : 'FAIL',
        scenarioStatus: runPassed ? 'PASS' : 'FAIL', cleanupStatus: cleanupErrors.length ? 'FAIL' : 'PASS',
        runId: process.env.FITM_STAFF_BROWSER_RUN_ID,
        finishedAt: new Date().toISOString(), cleanupErrors, databaseCleanup: 'PowerShell owner-label check/removal follows Node exit; require overall exit 0' }, null, 2));
    }
    console.log(`Browser owned-process/profile/storage cleanup: ${cleanupErrors.length ? 'FAIL' : 'PASS'}`);
    assert.deepEqual(cleanupErrors, [], 'Cleanup must complete before acceptance can succeed');
  }
});
