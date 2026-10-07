import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { teacherFixture } from "./helpers/teacherCoopFixture.js";
const fixture = (adapters = {}, login = false) => teacherFixture(adapters, login, true, true);
const action = (f, choice) => f.buttons().find(button => button.dataset.coopAction === choice);
const commit = f => f.modal().querySelector(".app-confirm-modal__confirm").dispatch("click");

test("Head live profile, default queue, Class Advisor actor/date and safe detail", async () => {
  const f = fixture(); await f.app.ready; assert.match(f.get("headName").textContent, /Teacher One/);
  assert.equal(f.calls[0].list.status, "department_head_review"); assert.match(f.get("teacherCoopList").textContent, /Snapshot Company.*Class Advisor/s);
  await f.app.openDetail("request-a"); assert.match(f.get("teacherCoopDetailBody").textContent, /Class Advisor.*060243102.*อาจารย์ที่ปรึกษาประจำชั้น \(Class Advisor\).*รออาจารย์ที่ปรึกษาพิจารณา → รอหัวหน้าภาควิชาพิจารณา/s);
});
for (const flag of [false, undefined, "true"]) test(`Head page fails closed for server flag ${String(flag)}`, async () => {
  const f = fixture({ me: async () => ({ success: true, data: { id: "teacher", is_department_head: flag, position: "หัวหน้าภาควิชา" } }) });
  await f.app.ready; assert.equal(f.calls.length, 0); assert.equal(f.get("teacherCoopRefresh").disabled, true); assert.equal(f.storage.getItem("teacherToken"), undefined);
  assert.match(f.get("teacherCoopMessage").textContent, /ไม่มีสิทธิ์หัวหน้าภาควิชา/); assert.equal(f.get("teacherCoopSignIn").hidden, false);
});
test("Head approval modal prevents duplicates, re-fetches approved detail and clears review actions", async () => {
  let finish, count = 0; const blocked = new Promise(resolve => { finish = resolve; });
  const f = fixture({ decide: async id => { count++; await blocked; f.rows([{ id, status: "approved", student: {} }]); } }); await f.app.ready; await f.app.openDetail("request-a");
  await f.get("teacherCoopDetailBody").querySelectorAll("button")[0].dispatch("click"); assert.ok(f.modal()); assert.equal(count, 0);
  const button = f.modal().querySelector(".app-confirm-modal__confirm"), saving = button.dispatch("click"); await button.listeners.get("click")[0]();
  assert.equal(count, 1); assert.equal(button.disabled, true); assert.ok(f.buttons().every(button => button.disabled)); finish(); await saving;
  assert.equal(f.buttons().length, 0); assert.equal(f.get("teacherCoopDetailBody").querySelectorAll("button").length, 0); assert.match(f.get("teacherCoopDetailBody").textContent, /อนุมัติแล้ว/);
  assert.match(f.toasts.at(-1).message, /คำร้องได้รับการอนุมัติแล้ว/); assert.equal(f.calls.filter(call => call.detail).length, 2);
});
test("Head rejection requires reason and refreshes rejected server state", async () => {
  const f = fixture(); await f.app.ready; await action(f, "reject").dispatch("click"); await commit(f);
  assert.equal(f.calls.filter(call => call.decision).length, 0); f.modal().querySelector("textarea").value = "  Head correction  "; await commit(f);
  assert.equal(f.calls.find(call => call.decision).reason, "Head correction"); await f.filter("rejected"); assert.equal(action(f, "approve"), undefined); assert.equal(action(f, "reject"), undefined);
});
for (const state of ["submitted", "staff_review", "advisor_review", "approved", "rejected", "cancelled", "document_issued", "in_progress"]) test(`Head cannot act on ${state} in list or detail`, async () => {
  const f = fixture(); f.rows([{ id: "x", status: state, student: {} }]); await f.app.ready; await f.filter(state);
  assert.equal(f.buttons().length, 1); await f.app.openDetail("x"); assert.equal(f.get("teacherCoopDetailBody").querySelectorAll("button").length, 0);
});
test("Head session expiry clears data, Student session survives, logout/missing token use Head login", async () => {
  const f = fixture({ decide: async () => { throw Object.assign(Error("expired"), { status: 401 }); } }); await f.app.ready;
  await action(f, "approve").dispatch("click"); await commit(f); assert.equal(f.storage.getItem("teacherToken"), undefined); assert.equal(f.storage.getItem("token"), "student-token-untouched"); assert.equal(f.buttons().length, 0);
  const missing = fixture({ storage: { getItem: () => null } }); await missing.app.ready; assert.deepEqual(missing.redirects, ["/department-head-login.html"]);
  const logout = fixture(); await logout.app.ready; await logout.get("headLogout").dispatch("click"); assert.deepEqual(logout.redirects, ["/department-head-login.html"]); assert.equal(logout.storage.getItem("token"), "student-token-untouched");
});
test("Head empty/API retry, pagination, filter reset and stale error use server state", async () => {
  const f = fixture(); f.rows([]); await f.app.ready; assert.match(f.get("teacherCoopMessage").textContent, /ยังไม่มีคำร้อง.*หัวหน้าภาควิชา/);
  f.rows(Array.from({ length: 27 }, (_, i) => ({ id: String(i), status: "department_head_review", student: {} }))); await f.app.refresh(); assert.equal(f.get("teacherCoopList").children.length, 25);
  await f.get("teacherCoopNext").dispatch("click"); assert.equal(f.get("teacherCoopList").children.length, 2); await f.filter("approved"); assert.equal(f.calls.at(-1).list.offset, 0);
  let offline = true; const retry = fixture({ list: async () => { if (offline) throw Error("offline"); return { success: true, data: [] }; } }); await retry.app.ready; assert.match(retry.get("teacherCoopMessage").textContent, /รีเฟรช/); offline = false; await retry.app.refresh(); assert.match(retry.get("teacherCoopMessage").textContent, /ยังไม่มีคำร้อง/);
  const stale = fixture({ decide: async () => { stale.rows([]); throw Object.assign(Error("stale"), { status: 409 }); } }); await stale.app.ready; await action(stale, "approve").dispatch("click"); await commit(stale); assert.equal(stale.buttons().length, 0); assert.match(stale.get("teacherCoopMessage").textContent, /เปลี่ยนสถานะ/);
});
test("Head detail renders only safe fields and authoritative Class actor history", async () => {
  const f = fixture({ detail: async id => ({ success: true, data: { request: { id, status: "approved", company_name: "Original company", student: { first_name: "<script>bad()</script>", password_hash: "hidden-secret", email: "private-email", advisorTeacher: { first_name: "Current", last_name: "Advisor" } }, jobPosting: { title: "Real job" } }, reviews: [{ actor_role: "teacher", decision: "approve", from_status: "advisor_review", to_status: "department_head_review", teacher: { first_name: "Actual", last_name: "Approver", password_hash: "hidden-secret" }, createdAt: "2026-10-07T00:00:00Z" }, { actor_role: "department_head", decision: "approve", from_status: "department_head_review", to_status: "approved", teacher: { first_name: "Head", last_name: "Actor" } }] } }) });
  await f.app.ready; await f.app.openDetail("request-a"); const body = f.get("teacherCoopDetailBody");
  assert.match(body.textContent, /Current Advisor.*Original company.*Real job.*Actual Approver.*Head Actor/s); assert.doesNotMatch(body.textContent, /hidden-secret|private-email/); assert.equal(body.querySelector("script"), null);
});
test("Head login validates server flag, reuses Teacher session and blocks non-Head without navigation", async () => {
  const f = fixture({}, true); f.get("teacherEmail").value = " Head@Fixture.invalid "; f.get("teacherPassword").value = "fixture-password"; await f.get("teacherLoginForm").dispatch("submit");
  assert.equal(f.calls[0].email, "head@fixture.invalid"); assert.deepEqual(f.redirects, ["/src/department_head/department_head.html"]); assert.equal(f.storage.getItem("token"), "student-token-untouched"); assert.equal(f.get("teacherPassword").value, "");
  const denied = fixture({ login: async () => ({ token: "normal-teacher", teacher: { is_department_head: false, position: "หัวหน้าภาควิชา" } }) }, true);
  denied.get("teacherEmail").value = "teacher@fixture.invalid"; denied.get("teacherPassword").value = "fixture-password"; await denied.get("teacherLoginForm").dispatch("submit");
  assert.equal(denied.redirects.length, 0); assert.notEqual(denied.storage.getItem("teacherToken"), "normal-teacher"); assert.match(denied.get("teacherLoginMessage").textContent, /ไม่มีสิทธิ์หัวหน้าภาควิชา/);
});
test("Actual Head API uses Teacher bearer, proper namespace, reason-only body and no client identity", async () => {
  const requests = [], ctx = vm.createContext({ sessionStorage: { getItem: () => "head-token" }, URLSearchParams, apiRequest: async (path, options) => { requests.push({ path, options }); } });
  for (const file of ["teacherProjectAdvisor.api.js", "departmentHead.api.js"]) vm.runInContext(readFileSync(new URL(`../src/api/${file}`, import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/export /g, ""), ctx);
  await ctx.loginDepartmentHead({ email: "head@fixture.invalid", password: "fixture-password" }); await ctx.getCurrentDepartmentHead(); await ctx.getHeadCoopRequests(); await ctx.getHeadCoopRequest("id"); await ctx.decideHeadCoopRequest("id", "reject", "Correction");
  for (const { path, options } of requests) { assert.match(path, /^\/api\/department-head\//); assert.equal(options.auth, false); assert.doesNotMatch(path, /teacher_id|is_department_head/); }
  for (const req of requests.slice(1)) assert.equal(req.options.headers.Authorization, "Bearer head-token"); assert.equal(requests[0].options.headers, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).options.body)), { reason: "Correction" }); assert.match(requests[2].path, /status=department_head_review/);
});
