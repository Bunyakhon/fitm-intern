import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { acceptGoogleSession } from "../src/auth/googleSession.js";
import { createStudentAuthStorage } from "../src/auth/studentAuthStorage.js";
const memory = () => { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const destinations = { student: "/src/student_coop/student_coop.html", teacher: "/src/teacher_coop/teacher_coop.html", department_head: "/src/department_head/department_head.html", department_staff: "/src/department_staff/department_staff.html" };
function result(role) {
  const profile = { id: "synthetic-account", student_id: "synthetic-code", status: role === "student" ? "pending" : "active", is_active: true, is_department_head: role === "department_head" };
  const actor = role === "department_head" ? "teacher" : role;
  const claims = { ...profile, actor_type: actor, role, teacher_id: profile.id, staff_id: profile.id, exp: Math.floor(Date.now() / 1000) + 3600 };
  const token = [{ alg: "HS256" }, claims, "synthetic-signature"].map(value => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url")).join(".");
  return { role, token, data: profile, teacher: profile, staff: profile, redirect: destinations[role] };
}
for (const role of Object.keys(destinations)) test(`Google session uses the existing storage and safe redirect for ${role}`, () => {
  const local = memory(), session = memory(), auth = createStudentAuthStorage({ persistentStorage: local, tabStorage: session });
  let path;
  acceptGoogleSession(result(role), role, { saveStudentSession: value => auth.save(value), storage: session, remember: true, location: { replace: value => path = value } });
  assert.equal(path, destinations[role]);
  assert.equal(session.getItem(role === "student" ? "token" : role === "department_staff" ? "staffToken" : "teacherToken"), result(role).token);
  assert.equal(local.getItem("token") !== null, role === "student");
});
test("unchecked Google Student login uses sessionStorage and leaves drafts/other roles intact", () => {
  const local = memory(), session = memory(), auth = createStudentAuthStorage({ persistentStorage: local, tabStorage: session });
  session.setItem("draft", "original"); session.setItem("teacherToken", "teacher-original");
  acceptGoogleSession(result("student"), "student", { saveStudentSession: value => auth.save(value), storage: session, remember: false, location: { replace() {} } });
  assert.equal(local.getItem("token"), null); assert.equal(session.getItem("draft"), "original"); assert.equal(session.getItem("teacherToken"), "teacher-original");
});
test("role/identity mismatch, Google tokens, expiration and open redirects never save a session", () => {
  for (const [value, selected] of [[result("department_head"), "student"], [{ ...result("student"), redirect: "https://attacker.invalid" }, "student"],
    [{ ...result("teacher"), teacher: { id: "different" } }, "teacher"], [{ ...result("student"), token: "raw-google-credential" }, "student"]]) {
    const storage = memory(); assert.throws(() => acceptGoogleSession(value, selected, { storage, saveStudentSession: () => assert.fail("Must not save"), location: { replace: () => assert.fail("Must not redirect") } }));
    assert.equal(storage.values.size, 0);
  }
});

const helperSource = readFileSync(new URL("./studentCoopAcceptance.test.js", import.meta.url), "utf8");
const helperPrefix = helperSource.slice(0, helperSource.indexOf("for (const [program, codes, foreign]"))
  .replace(/^import .*;\r?\n/gm, "").replaceAll("import.meta.url", JSON.stringify(new URL("./studentCoopAcceptance.test.js", import.meta.url).href));
const pageSource = readFileSync(new URL("../src/pages/googleLogin.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace(/export /g, "").replace(/if \(typeof document !== "undefined"\).*$/, "");
const tick = () => new Promise(resolve => setImmediate(resolve));
async function fixture({ role = "student", enabled = true, failure, authenticate } = {}) {
  const html = readFileSync(new URL(`../${role === "student" ? "login" : role === "teacher" ? "teacher-login" : role === "department_head" ? "department-head-login" : "staff-login"}.html`, import.meta.url), "utf8");
  const helper = vm.createContext({ readFileSync, vm, assert, URL, console });
  vm.runInContext(helperPrefix.replace(/const html = [^\n]+/, `const html = ${JSON.stringify(html)};`), helper);
  const document = helper.createDocument(), timers = new Map(), requests = [], accepted = [], toasts = [];
  document.querySelector(".auth-form").inert = false; // Native DOM's initial property.
  let initialization, render, sequence = 0;
  const target = { sessionStorage: memory(), location: { replace() {} }, setTimeout: (fn, ms) => { timers.set(++sequence, { fn, ms }); return sequence; }, clearTimeout: id => timers.delete(id) };
  const context = vm.createContext({ document, window: target, googleConfig() {}, googleChallenge() {}, googleAuthenticate() {}, saveStudentSession() {}, showToast() {}, acceptGoogleSession() {} });
  vm.runInContext(pageSource, context);
  const mounted = context.mountGoogleLogin({ document, target, config: async () => { if (failure) throw failure; return { enabled, clientId: "synthetic-client", linkingEnabled: true }; },
    challenge: async body => { requests.push(body); return { nonce: "synthetic-nonce", requestId: "synthetic-request", requestToken: "synthetic-token" }; },
    loadProvider: async () => ({ initialize: value => initialization = value, renderButton: (element, value) => render = value }),
    authenticate: authenticate || (async body => { requests.push(body); return result(role); }),
    accept: (value, selected, options) => accepted.push({ value, selected, options }), toast: (...args) => toasts.push(args), saveStudent() {} });
  await tick();
  return { document, target, timers, requests, accepted, toasts, mounted, init: () => initialization, render: () => render,
    root: document.getElementById("googleLogin"), form: document.querySelector(".auth-form") };
}
for (const role of Object.keys(destinations)) test(`actual ${role} Login HTML mounts GIS with a backend nonce and exchanges only Application sessions`, async () => {
  const f = await fixture({ role }); assert.equal(f.init().nonce, "synthetic-nonce"); assert.equal(f.init().auto_select, false);
  assert.equal(f.requests[0].role, role); f.render().click_listener(); assert.equal(f.form.inert, true);
  await f.init().callback({ credential: "synthetic-google-token" }); assert.equal(f.accepted[0].selected, role);
  assert.equal(f.requests[1].credential, "synthetic-google-token"); assert.equal(f.requests[1].requestToken, "synthetic-token");
  f.mounted.dispose();
});
test("disabled/unavailable Google retains password form and supports retry without loading provider", async () => {
  const disabled = await fixture({ enabled: false }); assert.equal(disabled.init(), undefined); assert.equal(disabled.form.inert, false);
  const failed = await fixture({ failure: Error("Offline") }); assert.equal(failed.init(), undefined); assert.equal(failed.form.inert, false);
  assert.equal(failed.root.querySelector(".google-login__retry").hidden, false);
});
test("double callback, cancellation timeout and late provider responses cannot replace a session", async () => {
  let finish, calls = 0; const pending = new Promise(resolve => finish = resolve);
  const f = await fixture({ authenticate: async () => { calls++; return pending; } });
  const callback = f.init().callback;
  const first = callback({ credential: "synthetic" }); await callback({ credential: "synthetic" }); assert.equal(calls, 1);
  finish(result("student")); await first; await callback({ credential: "late" }); assert.equal(f.accepted.length, 1);
  const cancelled = await fixture(); cancelled.render().click_listener();
  const timeout = [...cancelled.timers.values()].find(timer => timer.ms === 60000); timeout.fn();
  await cancelled.init().callback({ credential: "late" }); assert.equal(cancelled.accepted.length, 0); assert.equal(cancelled.form.inert, false);
});
test("linking is explicit, requires a fresh nonce, clears passwords and preserves retry on failure", async () => {
  const f = await fixture({ authenticate: async () => { throw Object.assign(Error("Reauthenticate"), { data: { code: "GOOGLE_LINK_REQUIRED" } }); } });
  await f.init().callback({ credential: "synthetic" });
  const link = f.root.querySelector(".google-login__link"); assert.equal(link.hidden, false);
  link.querySelector('input[type="email"]').value = "synthetic@example.test"; link.querySelector('input[type="password"]').value = "synthetic-password";
  await f.mounted.retry(); assert.equal(f.requests[1].purpose, "link");
  await f.init().callback({ credential: "synthetic" }); assert.equal(link.querySelector('input[type="password"]').value, "");
  assert.equal(f.form.inert, false);
});
