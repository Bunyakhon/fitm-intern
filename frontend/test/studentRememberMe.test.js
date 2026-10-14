import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createStudentAuthStorage, STUDENT_AUTH_EVENT_KEY } from "../src/auth/studentAuthStorage.js";

const clock = { value: 1800000000000 };
const student = id => ({ id, student_id: "synthetic-code", first_name: "Synthetic", track: "co_op" });
const token = (id = "student-a", extra = {}) => [
  { alg: "HS256", typ: "JWT" },
  { ...student(id), actor_type: "student", role: "student", exp: clock.value / 1000 + 3600, ...extra },
].map(part => Buffer.from(JSON.stringify(part)).toString("base64url")).join(".") + ".synthetic-signature";
function memory(entries = []) {
  const values = new Map(entries);
  return { values, getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}
let serial = 0;
function fixture(local = memory(), session = memory()) {
  const options = { persistentStorage: local, tabStorage: session, now: () => clock.value, generation: () => `generation-${++serial}` };
  const auth = createStudentAuthStorage(options);
  return { local, session, auth, reload: () => createStudentAuthStorage(options), newTab: () => fixture(local) };
}
const save = (f, remember = false, id = "student-a") => {
  const jwt = token(id); f.auth.save({ token: jwt, student: student(id), remember }); return jwt;
};

test("unchecked login removes legacy local credentials, survives reload and ends with the tab session", () => {
  const f = fixture(memory([["token", token("old")], ["student", JSON.stringify(student("old"))]]));
  const jwt = save(f);
  assert.equal(f.local.getItem("token"), null); assert.equal(f.local.getItem("student"), null);
  assert.equal(f.session.getItem("token"), jwt); assert.equal(f.reload().getToken(), jwt);
  assert.equal(f.newTab().auth.getToken(), null);
  assert.equal(f.newTab().local.getItem("token"), null);
});
test("checked login survives a simulated new browser session only until the issued exp", () => {
  const f = fixture(), jwt = save(f, true), originalTime = clock.value;
  assert.equal(f.local.getItem("token"), jwt); assert.equal(f.newTab().auth.getToken(), jwt);
  clock.value += 3600000;
  try { assert.equal(f.auth.getToken(), null); assert.equal(f.local.getItem("token"), null); assert.equal(f.session.getItem("token"), null); }
  finally { clock.value = originalTime; }
});
test("session metadata in local storage contains no JWT, identity, password or profile", () => {
  const f = fixture(); save(f);
  assert.deepEqual([...f.local.values.keys()], [STUDENT_AUTH_EVENT_KEY]);
  assert.deepEqual(Object.keys(JSON.parse(f.local.getItem(STUDENT_AUTH_EVENT_KEY))).sort(), ["generation", "mode", "version"]);
});
for (const remember of [false, true]) test(`logout clears both credential stores, preserves other roles/drafts, mode=${remember}`, () => {
  const f = fixture(); save(f, remember);
  for (const s of [f.local, f.session]) for (const key of ["profileDraft", "teacherToken", "staffToken"]) s.setItem(key, "untouched");
  f.auth.clear();
  for (const s of [f.local, f.session]) {
    assert.equal(s.getItem("token"), null); assert.equal(s.getItem("student"), null);
    for (const key of ["profileDraft", "teacherToken", "staffToken"]) assert.equal(s.getItem(key), "untouched");
  }
  assert.equal(f.reload().getToken(), null);
});
test("a valid legacy local JWT is migrated to this session without granting implicit Remember Me", () => {
  const jwt = token(), f = fixture(memory([["token", jwt], ["student", JSON.stringify(student("wrong-account"))]]));
  assert.equal(f.auth.getToken(), jwt); assert.equal(f.local.getItem("token"), null);
  assert.equal(JSON.parse(f.session.getItem("student")).id, "student-a");
  assert.equal(f.reload().getToken(), jwt); assert.equal(f.newTab().auth.getToken(), null);
});
test("unknown dual-storage tokens prefer the tab identity and remove stale local credentials", () => {
  const tabToken = token("tab-account"), f = fixture(memory([["token", token("local-account")]]), memory([["token", tabToken]]));
  assert.equal(f.auth.getToken(), tabToken); assert.equal(f.local.getItem("token"), null);
});
test("expired selected tab token cannot fall back to a different valid persistent token", () => {
  const f = fixture(memory([["token", token("other-account")]]), memory([["token", token("expired", { exp: 1 })]]));
  assert.equal(f.auth.getToken(), null); assert.equal(f.reload().getToken(), null);
  assert.equal(f.local.getItem("token"), null);
});
test("malformed/expired/Google credentials are rejected and do not create an application session", () => {
  for (const jwt of ["invalid", token("a", { exp: 1 }), token("a", { exp: undefined }), token("a", { id: undefined, sub: "google-sub" }), token("a", { role: "department_head" })]) {
    const f = fixture(); assert.throws(() => f.auth.save({ token: jwt, student: student("a"), remember: true }));
    assert.equal(f.local.getItem("token"), null); assert.equal(f.session.getItem("token"), null);
  }
});
test("both persistent copies must match: an unannounced local token replacement never switches accounts", () => {
  const f = fixture(); save(f, true); f.local.setItem("token", token("other"));
  assert.equal(f.auth.getToken(), null); assert.equal(f.reload().getToken(), null);
});
test("a mixed persistent token/generation from concurrent writes cannot be adopted by a new tab", () => {
  const f = fixture(); save(f, true);
  f.local.setItem("studentAuthPersistent", JSON.stringify({ generation: "other-generation", token: token() }));
  assert.equal(f.newTab().auth.getToken(), null);
});
test("session-only peers cloned from an opener are invalidated by logout", () => {
  const f = fixture(); save(f);
  const peer = fixture(f.local, memory([...f.session.values]));
  assert.equal(peer.auth.getToken(), f.auth.getToken()); f.auth.clear(); assert.equal(peer.auth.getToken(), null);
});
test("multiple tabs share persistent login, logout invalidates peers without fallback", () => {
  const f = fixture(), jwt = save(f, true), peer = f.newTab();
  assert.equal(peer.auth.getToken(), jwt); f.auth.clear();
  assert.equal(peer.auth.getToken(), null); assert.equal(peer.session.getItem("token"), null);
});
test("a new login in another tab invalidates the old tab across reload without account switching", () => {
  const f = fixture(); save(f, true); const peer = f.newTab(); peer.auth.getToken();
  const other = save(peer, true, "other");
  assert.equal(f.auth.getToken(), null); assert.equal(f.reload().getToken(), null);
  assert.equal(peer.auth.getToken(), other); assert.equal(f.local.getItem("token"), other);
});
test("delayed rejection/cache updates from an old login cannot clear or overwrite a newer login", () => {
  const f = fixture(), old = save(f, true), latest = save(f, true, "new");
  assert.equal(f.auth.clear({ expectedToken: old }), false);
  assert.equal(f.auth.updateStudent(student("student-a"), old), false);
  assert.equal(f.auth.getToken(), latest); assert.equal(JSON.parse(f.local.getItem("student")).id, "new");
});
test("stored student snapshot excludes password, Google credentials, refresh tokens and private profile", () => {
  const f = fixture(); f.auth.save({ token: token(), student: { ...student("student-a"), password: "synthetic", googleCredential: "synthetic", refreshToken: "synthetic", profile: { private: true } }, remember: true });
  assert.deepEqual(JSON.parse(f.local.getItem("student")), student("student-a"));
});
test("storage quota failure never leaves a partially saved persistent session", () => {
  const local = memory(); const original = local.setItem;
  local.setItem = (key, value) => { if (key === "studentAuthPersistent") throw Error("Quota"); original(key, value); };
  const f = fixture(local); assert.throws(() => save(f, true), /ไม่สามารถเก็บ/);
  assert.equal(local.getItem("token"), null); assert.equal(f.session.getItem("token"), null);
});

test("actual storage-event subscription invalidates a changed account once and can unsubscribe", () => {
  const f = fixture(); let listener, changes = 0;
  const source = readFileSync(new URL("../src/auth/studentAuthStorage.js", import.meta.url), "utf8").replace(/export /g, "");
  const context = vm.createContext({ localStorage: f.local, sessionStorage: f.session, atob,
    crypto: { randomUUID: () => `event-${++serial}` },
    window: { addEventListener(name, callback) { assert.equal(name, "storage"); listener = callback; }, removeEventListener(name, callback) { assert.equal(callback, listener); listener = null; } },
  });
  context.nextSession = { token: token(), student: student("student-a"), remember: true };
  vm.runInContext(source + "\nsaveStudentSession(nextSession);", context);
  const stop = context.subscribeStudentSession(next => { assert.equal(next, null); changes++; });
  save(f.newTab(), true, "other"); listener({ key: STUDENT_AUTH_EVENT_KEY }); listener({ key: "token" });
  assert.equal(changes, 1); assert.equal(vm.runInContext("getStudentToken()", context), null); stop(); assert.equal(listener, null);
});
test("an open page expires at the issued JWT exp without extending it or waiting for an API request", () => {
  const f = fixture(), source = readFileSync(new URL("../src/auth/studentAuthStorage.js", import.meta.url), "utf8").replace(/export /g, "");
  let timer, delay, changes = 0;
  const context = vm.createContext({ localStorage: f.local, sessionStorage: f.session, atob, Date: { now: () => clock.value },
    crypto: { randomUUID: () => `expiry-${++serial}` },
    window: { addEventListener() {}, removeEventListener() {}, setTimeout(callback, milliseconds) { timer = callback; delay = milliseconds; return 1; }, clearTimeout() {} },
    nextSession: { token: token(), student: student("student-a"), remember: true },
  });
  vm.runInContext(source + "\nsaveStudentSession(nextSession);", context);
  const stop = context.subscribeStudentSession(next => { assert.equal(next, null); changes++; });
  assert.equal(delay, 3600000); const originalTime = clock.value; clock.value += 3600000;
  try { timer(); assert.equal(changes, 1); assert.equal(f.local.getItem("token"), null); assert.equal(f.session.getItem("token"), null); }
  finally { clock.value = originalTime; stop(); }
});

// Exercise actual Login HTML/module and shared Feedback with the repository's DOM
// simulation. This is deliberately not a browser/provider acceptance claim.
const helperUrl = new URL("./studentCoopAcceptance.test.js", import.meta.url);
const helperSource = readFileSync(helperUrl, "utf8");
const prefix = helperSource.slice(0, helperSource.indexOf("for (const [program, codes, foreign]"))
  .replace(/^import .*;\r?\n/gm, "").replaceAll("import.meta.url", JSON.stringify(helperUrl.href));
const loginSource = readFileSync(new URL("../src/pages/login.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
const feedback = readFileSync(new URL("../src/ui/feedback.js", import.meta.url), "utf8").replace(/export /g, "");
function loginFixture(login, remember = false) {
  const html = readFileSync(new URL("../login.html", import.meta.url), "utf8");
  const helper = vm.createContext({ readFileSync, vm, assert, URL, console });
  vm.runInContext(prefix.replace(/const html = [^\n]+/, `const html = ${JSON.stringify(html)};`), helper);
  const document = helper.createDocument(), f = fixture(), timers = [], location = { href: "" }, calls = [];
  const context = vm.createContext({ document, console: { log() {}, error() {} },
    window: { location, setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {} },
    setTimeout: fn => timers.push(fn), saveStudentSession: session => f.auth.save(session),
    loginStudent: async body => { calls.push(body); return login ? login(body) : { token: token(), data: student("student-a") }; },
  });
  vm.runInContext(feedback + "\n" + loginSource, context);
  const get = id => document.getElementById(id);
  get("loginEmail").value = " SYNTHETIC@EXAMPLE.TEST "; get("loginPassword").value = "synthetic-password";
  get("rememberMe").checked = remember;
  return { ...f, document, get, calls, timers, location, submit: () => get("loginForm").dispatch("submit") };
}
for (const remember of [false, true]) test(`actual Login checkbox selects storage mode and clears password, remember=${remember}`, async () => {
  const f = loginFixture(undefined, remember); await f.submit();
  assert.equal(f.local.getItem("token") !== null, remember); assert.equal(f.session.getItem("token"), token());
  assert.equal(f.get("rememberMe").checked, remember); assert.equal(f.get("loginPassword").value, "");
  assert.equal(f.calls[0].email, "synthetic@example.test"); assert.equal(f.calls[0].remember, undefined);
  assert.ok(f.get("loginMessage").classList.contains("success"));
});
test("failed Login preserves checkbox and permits retry without creating a session", async () => {
  const f = loginFixture(async () => { throw Object.assign(Error("Rejected"), { status: 401 }); }, true);
  await f.submit(); await f.submit(); assert.equal(f.calls.length, 2); assert.equal(f.get("rememberMe").checked, true);
  assert.equal(f.auth.getToken(), null); assert.equal(f.local.getItem("token"), null);
});
test("double submission is blocked during request and successful navigation delay; shared loading is used", async () => {
  let finish; const pending = new Promise(resolve => { finish = resolve; });
  const f = loginFixture(async () => pending, true), first = f.submit();
  assert.equal(f.get("loginForm").getAttribute("aria-busy"), "true"); await f.submit(); assert.equal(f.calls.length, 1);
  finish({ token: token(), data: student("student-a") }); await first; await f.submit(); assert.equal(f.calls.length, 1);
  assert.equal(f.get("loginForm").getAttribute("aria-busy"), "false");
});

const dashboard = readFileSync(new URL("../src/pages/student_coop.js", import.meta.url), "utf8").replaceAll("\r\n", "\n");
function fragment(start, end) { const from = dashboard.indexOf(start), to = dashboard.indexOf(end, from); assert.ok(from >= 0 && to > from); return dashboard.slice(from, to); }
function dashboardFixture(f, load, dirty = false) {
  let rendered = 0, redirected = 0, modal, confirmation;
  const context = vm.createContext({
    getStudentToken: () => f.auth.getToken(), clearStudentSession: options => f.auth.clear(options),
    updateStoredStudent: (value, jwt) => f.auth.updateStudent(value, jwt), getCurrentStudent: load,
    renderStudent: () => rendered++, loadStudentProfile: async () => ({}), loadTeachers: async () => {}, loadStudentCoopProjectSections: async () => {},
    showActionModal: options => { modal = options; }, showConfirmModal: options => { confirmation = options; },
    studentProfileDraft: { hasChanges: () => dirty }, readProfileInputs: () => ({}), document: {},
    captureStudentInfoDraft: () => null, selectedProfileImageFile: null, profileWorkspace: null, profilePdfImport: null,
    window: { location: { set href(value) { if (value === "/login.html") redirected++; } } }, console: { warn() {} },
  });
  vm.runInContext(fragment("async function checkAuthentication()", "// Load Student Profile")
    + fragment("function hasUnsavedStudentProfile()", "logoutBtn?.addEventListener("), context);
  return { context, check: () => context.checkAuthentication(), rendered: () => rendered, redirected: () => redirected,
    modal: () => modal, confirmation: () => confirmation };
}
test("dashboard subscribes on startup, keeps Calendar hidden, and re-verifies history restoration", () => {
  const handlers = new Map(), calls = [], context = vm.createContext({
    document: { addEventListener: (name, callback) => handlers.set(name, callback), getElementById: () => ({ hidden: true }) },
    window: { addEventListener: (name, callback) => handlers.set(name, callback) },
    renderMentor() {}, subscribeStudentSession: callback => { assert.equal(typeof callback, "function"); calls.push("subscribe"); },
    handleStudentSessionChange() {}, checkAuthentication: () => calls.push("verify"), initStudentInternshipLog() {}, initStudentSupervision() {},
    mountCoopActivities: () => assert.fail("Hidden Calendar must not mount"),
  });
  vm.runInContext(dashboard.slice(dashboard.lastIndexOf('document.addEventListener(\n  "DOMContentLoaded"')), context);
  handlers.get("DOMContentLoaded")(); assert.deepEqual(calls, ["subscribe", "verify"]);
  handlers.get("pageshow")({ persisted: false }); assert.equal(calls.length, 2);
  handlers.get("pageshow")({ persisted: true }); assert.deepEqual(calls, ["subscribe", "verify", "verify"]);
});
test("dashboard startup verifies a restored persistent token with backend before rendering", async () => {
  const f = fixture(); save(f, true); const fresh = f.newTab(); let inspected = 0;
  const page = dashboardFixture(fresh, async () => { inspected++; assert.equal(page.rendered(), 0); return { data: student("student-a") }; });
  await page.check(); assert.equal(inspected, 1); assert.equal(page.rendered(), 1);
});
for (const status of [401, 403, 404]) test(`backend rejection ${status} clears credentials and redirects without rendering`, async () => {
  const f = fixture(); save(f, true); const page = dashboardFixture(f, async () => { throw Object.assign(Error("Rejected"), { status }); });
  await page.check(); assert.equal(f.auth.getToken(), null); assert.equal(f.local.getItem("token"), null);
  assert.equal(page.rendered(), 0); assert.equal(page.redirected(), 1);
});
for (const status of [undefined, 500, 503]) test(`network/temporary failure ${status} preserves session and offers retry`, async () => {
  const f = fixture(), jwt = save(f, true), page = dashboardFixture(f, async () => { throw Object.assign(Error("Offline"), { status }); }, true);
  await page.check(); assert.equal(f.auth.getToken(), jwt); assert.equal(page.redirected(), 0); assert.equal(page.rendered(), 0);
  assert.equal(page.modal().actionLabel, "ลองอีกครั้ง"); assert.equal(typeof page.modal().onAction, "function");
});
test("Student logout keeps dirty Draft/session until explicit shared confirmation", () => {
  const f = fixture(), jwt = save(f), page = dashboardFixture(f, async () => ({}), true);
  page.context.logout(); assert.equal(f.auth.getToken(), jwt); assert.equal(page.redirected(), 0);
  page.confirmation().onConfirm(); assert.equal(f.auth.getToken(), null); assert.equal(page.redirected(), 1);
});
test("a directory/resource 404 after successful auth does not delete a valid session", async () => {
  const f = fixture(), jwt = save(f), page = dashboardFixture(f, async () => ({ data: student("student-a") }));
  page.context.loadTeachers = async () => { throw Object.assign(Error("Resource not found"), { status: 404 }); };
  await page.check(); assert.equal(f.auth.getToken(), jwt); assert.equal(page.redirected(), 0); assert.equal(page.modal().title, "ยังโหลดข้อมูลไม่ครบ");
});
test("account changes preserve an unsaved Profile view and cannot render a late account response", async () => {
  const f = fixture(); save(f, true); let finish; const pending = new Promise(resolve => { finish = resolve; });
  const page = dashboardFixture(f, () => pending, true), checking = page.check();
  save(f.newTab(), true, "other"); finish({ data: student("student-a") }); await checking;
  assert.equal(page.rendered(), 0); assert.equal(page.redirected(), 0); assert.equal(page.modal().actionLabel, "ไปหน้าเข้าสู่ระบบ");
});

const client = readFileSync(new URL("../src/api/client.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replaceAll("import.meta.env.VITE_API_URL", '"http://synthetic.test"').replace(/export /g, "");
function clientFixture(f, response) {
  let intercept; const requests = [];
  const api = { interceptors: { request: { use: callback => { intercept = callback; } } }, request: async config => {
    config.headers = new Map(Object.entries(config.headers || {})); config = intercept(config); requests.push(config);
    if (response) return response(config); return { config, data: { ok: true } };
  } };
  const context = vm.createContext({ axios: { create: () => api }, getStudentToken: () => f.auth.getToken() });
  vm.runInContext(client, context); return { request: context.apiRequest, requests };
}
for (const remember of [false, true]) test(`actual API Bearer interceptor reads Student JWT in mode=${remember}`, async () => {
  const f = fixture(), jwt = save(f, remember), api = clientFixture(f); await api.request("/api/auth/me");
  assert.equal(api.requests[0].headers.get("Authorization"), `Bearer ${jwt}`);
  await api.request("/public", { auth: false }); assert.equal(api.requests[1].headers.get("Authorization"), undefined);
  await api.request("/api/teachers/me", { auth: false, headers: { Authorization: "Bearer teacher-only" } });
  assert.equal(api.requests[2].headers.get("Authorization"), "Bearer teacher-only");
});
for (const rejected of [false, true]) test(`actual API client blocks late old-account ${rejected ? "401" : "success"}`, async () => {
  const f = fixture(); save(f, true); let finish; const pending = new Promise(resolve => { finish = resolve; });
  const api = clientFixture(f, async config => { await pending; if (rejected) throw { config, response: { status: 401 } }; return { config, data: { private: true } }; });
  const request = api.request("/api/auth/me"); const latest = save(f, true, "new"); finish();
  await assert.rejects(request, error => error.status === 409 && error.data.code === "STUDENT_SESSION_CHANGED");
  assert.equal(f.auth.getToken(), latest);
});
