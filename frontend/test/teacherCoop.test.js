import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { teacherFixture } from "./helpers/teacherCoopFixture.js";

test("Teacher identity, safe text fields, loading/empty and retry states", async () => {
  const f = teacherFixture();
  assert.equal(f.get("teacherRequestList").getAttribute("aria-busy"), "true");
  await f.app.ready;
  assert.match(f.get("teacherName").textContent, /Teacher One/);
  assert.match(f.get("teacherRequestList").textContent, /66001.*IT.*Project/s);
  f.rows([{ id: "x", status: "pending", student: { first_name: '<script>bad()</script>' }, topic: '<img src=x onerror=bad()>', requested_at: "invalid" }]);
  await f.app.refresh();
  assert.equal(f.get("teacherRequestList").querySelector("script"), null);
  assert.equal(f.get("teacherRequestList").querySelector("img"), null);
  assert.match(f.get("teacherRequestList").textContent, /<img src=x/);
  f.rows([]); await f.app.refresh(); assert.match(f.get("teacherRequestMessage").textContent, /ยังไม่มีคำขอ/);
});

test("Accept uses shared confirmation, prevents duplicate submit and re-fetches confirmed server state", async () => {
  let finish, count = 0;
  const blocked = new Promise(resolve => { finish = resolve; });
  const f = teacherFixture({ decide: async (...args) => { count++; await blocked; f.rows([{ id: args[0], status: "confirmed", student: { first_name: "Student" } }]); } });
  await f.app.ready;
  await f.buttons()[0].dispatch("click");
  const modal = f.modal(), confirm = modal.querySelector(".app-confirm-modal__confirm");
  assert.ok(modal); assert.equal(count, 0); assert.ok(f.buttons().every(button => button.disabled));
  const saving = confirm.dispatch("click");
  // Invoke the event handler directly to model even programmatic duplicate events.
  await confirm.listeners.get("click")[0]();
  assert.equal(count, 1); assert.equal(confirm.disabled, true);
  assert.equal(modal.querySelector(".app-confirm-modal__cancel").disabled, true);
  finish(); await saving;
  assert.equal(f.modal(), undefined); assert.equal(f.buttons().length, 0);
  assert.ok(f.calls.filter(call => call.list).length >= 2);
  assert.equal(f.toasts.at(-1).type, "success");
  await f.filter("confirmed"); assert.match(f.get("teacherRequestList").textContent, /ยืนยันรับ/); assert.equal(f.buttons().length, 0);
});

test("Reject requires a reason, trims it and displays rejected data after server reload", async () => {
  const f = teacherFixture(); await f.app.ready;
  await f.buttons()[1].dispatch("click");
  const modal = f.modal(), button = modal.querySelector(".app-confirm-modal__confirm"), reason = modal.querySelector("textarea");
  await button.dispatch("click"); assert.equal(f.calls.filter(call => call.decision).length, 0);
  assert.match(modal.querySelector(".app-confirm-modal__error").textContent, /กรุณาระบุเหตุผล/);
  reason.value = "  Full capacity  "; await button.dispatch("click");
  assert.equal(f.calls.find(call => call.decision)?.reason, "Full capacity");
  await f.filter("rejected"); assert.equal(f.buttons().length, 0); assert.match(f.get("teacherRequestList").textContent, /Full capacity/);
});

test("Cancel/Escape restore controls and clean listeners; failed confirmation allows retry", async () => {
  const f = teacherFixture(); await f.app.ready;
  await f.buttons()[0].dispatch("click");
  await f.document.dispatch("keydown", { key: "Escape" });
  assert.equal(f.modal(), undefined); assert.equal(f.buttons()[0].disabled, false);
  assert.equal(f.document.listeners.get("keydown").length, 0);
  let attempts = 0;
  f.context.showConfirmModal({ title: "Test", message: "Message", onConfirm: async () => { if (++attempts === 1) throw Error("Retry this action"); } });
  const modal = f.modal(), button = modal.querySelector(".app-confirm-modal__confirm");
  await button.dispatch("click"); assert.match(modal.querySelector(".app-confirm-modal__error").textContent, /Retry/); assert.equal(button.disabled, false);
  await button.dispatch("click"); assert.equal(f.modal(), undefined); assert.equal(attempts, 2);
});

test("Stale request displays readable error, fetches current rows and closes old modal", async () => {
  const f = teacherFixture({ decide: async () => { f.rows([]); throw Object.assign(Error("No longer pending"), { status: 409 }); } });
  await f.app.ready; await f.buttons()[0].dispatch("click"); await f.modal().querySelector(".app-confirm-modal__confirm").dispatch("click");
  assert.match(f.get("teacherRequestMessage").textContent, /เปลี่ยนแปลง/); assert.equal(f.buttons().length, 0); assert.equal(f.modal(), undefined); assert.equal(f.toasts.at(-1).type, "error");
});

test("Successful commit with failed reload shows truthful result and permits refresh", async () => {
  let reads = 0;
  const f = teacherFixture({ list: async () => { if (++reads > 1) throw Error("Offline"); return [{ id: "x", status: "pending", student: {} }]; } });
  await f.app.ready; await f.buttons()[0].dispatch("click"); await f.modal().querySelector(".app-confirm-modal__confirm").dispatch("click");
  assert.match(f.get("teacherRequestMessage").textContent, /ยืนยัน.*โหลดรายการล่าสุดไม่สำเร็จ/); assert.equal(f.buttons().length, 0); assert.equal(f.get("teacherRefresh").disabled, false);
});

for (const status of [401, 403]) test(`Teacher session ${status} clears own token/data and leaves Student session unchanged`, async () => {
  const f = teacherFixture({ decide: async () => { throw Object.assign(Error("Auth"), { status }); } });
  await f.app.ready; await f.buttons()[0].dispatch("click"); await f.modal().querySelector(".app-confirm-modal__confirm").dispatch("click");
  assert.equal(f.storage.getItem("teacherToken"), undefined); assert.equal(f.storage.getItem("token"), "student-token-untouched");
  assert.equal(f.buttons().length, 0); assert.equal(f.get("teacherSignIn").hidden, false); assert.equal(f.get("teacherRefresh").disabled, true);
});

test("Unauthenticated/foreign startup and transient API failure fail closed", async () => {
  const missing = teacherFixture({ storage: { getItem: () => null } }); await missing.app.ready;
  assert.deepEqual(missing.redirects, ["/teacher-login.html"]); assert.equal(missing.calls.length, 0);
  const f = teacherFixture({ me: async () => { throw Object.assign(Error("Denied"), { status: 403 }); } }); await f.app.ready;
  assert.equal(f.calls.length, 0); assert.equal(f.get("teacherSignIn").hidden, false);
  let failed = true;
  const offline = teacherFixture({ list: async () => { if (failed) throw Error("Offline"); return []; } }); await offline.app.ready;
  assert.match(offline.get("teacherRequestMessage").textContent, /รีเฟรช/); assert.equal(offline.get("teacherRefresh").disabled, false);
  failed = false; await offline.app.refresh(); assert.match(offline.get("teacherRequestMessage").textContent, /ยังไม่มีคำขอ/);
  await offline.get("teacherLogout").dispatch("click"); assert.equal(offline.storage.getItem("teacherToken"), undefined); assert.equal(offline.storage.getItem("token"), "student-token-untouched"); assert.deepEqual(offline.redirects, ["/teacher-login.html"]);
});

test("Paginated queue reaches later requests and resets filter offset", async () => {
  const f = teacherFixture(); f.rows(Array.from({ length: 27 }, (_, i) => ({ id: `row-${i}`, status: "pending", student: { first_name: `Student ${i}` } })));
  await f.app.ready; assert.equal(f.get("teacherRequestList").children.length, 25); assert.equal(f.get("teacherNext").disabled, false);
  await f.get("teacherNext").dispatch("click"); assert.equal(f.get("teacherRequestList").children.length, 2); assert.equal(f.get("teacherNext").disabled, true);
  await f.filter("confirmed"); assert.equal(f.calls.at(-1).list.offset, 0);
});

test("Teacher login normalizes email, prevents double submission, stores separate session and handles failure", async () => {
  let resolve, requests = 0;
  const blocked = new Promise(done => { resolve = done; });
  const f = teacherFixture({ login: async body => { requests++; assert.equal(body.email, "teacher@example.test"); await blocked; return { token: "teacher-only" }; } }, true);
  f.get("teacherEmail").value = " Teacher@Example.test "; f.get("teacherPassword").value = "test-password";
  const save = f.get("teacherLoginForm").dispatch("submit"); await f.get("teacherLoginForm").dispatch("submit"); assert.equal(requests, 1);
  resolve(); await save; assert.equal(f.storage.getItem("teacherToken"), "teacher-only"); assert.equal(f.storage.getItem("token"), "student-token-untouched"); assert.match(f.redirects[0], /teacher_coop/);
  const failed = teacherFixture({ login: async () => { throw Object.assign(Error("Bad login"), { status: 401 }); } }, true);
  failed.get("teacherEmail").value = "teacher@example.test"; failed.get("teacherPassword").value = "password"; await failed.get("teacherLoginForm").dispatch("submit");
  assert.equal(failed.redirects.length, 0); assert.match(failed.get("teacherLoginMessage").textContent, /ไม่ถูกต้อง/); assert.equal(failed.get("teacherPassword").value, "");
});

test("Actual Teacher API adapter never attaches Student token or caller-supplied Teacher identity", async () => {
  const requests = [];
  const ctx = vm.createContext({ sessionStorage: { getItem: () => "teacher-token" }, URLSearchParams, apiRequest: async (path, options) => { requests.push({ path, options }); } });
  const code = readFileSync(new URL("../src/api/teacherProjectAdvisor.api.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
  vm.runInContext(code, ctx);
  await ctx.loginTeacher({ email: "teacher@test.invalid", password: "test" }); await ctx.getCurrentTeacher(); await ctx.getTeacherAdvisorRequests({ status: "confirmed", offset: 25 }); await ctx.decideTeacherAdvisorRequest("request", "reject", "Reason");
  assert.equal(requests[0].options.headers, undefined);
  for (const { path, options } of requests) { assert.equal(options.auth, false); assert.doesNotMatch(path, /teacher_id/); }
  assert.equal(requests[1].options.headers.Authorization, "Bearer teacher-token"); assert.match(requests[2].path, /status=confirmed.*offset=25/);
  assert.deepEqual(JSON.parse(JSON.stringify(requests[3].options.body)), { reason: "Reason" });
});
