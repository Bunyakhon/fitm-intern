import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { teacherFixture } from "./helpers/teacherCoopFixture.js";
const fixture = adapters => teacherFixture(adapters, false, true);
const action = (f, choice) => f.buttons().find(button => button.dataset.coopAction === choice);
const commit = f => f.modal().querySelector(".app-confirm-modal__confirm").dispatch("click");

test("Class approval list uses real snapshots, safe text, initial loading and empty state", async () => {
  const f = fixture(); assert.equal(f.get("teacherCoopRefresh").disabled, true); assert.match(f.get("teacherCoopMessage").textContent, /กำลังตรวจสอบ/);
  await f.app.ready; assert.match(f.get("teacherCoopList").textContent, /66001.*IT.*Snapshot Company.*060243102.*เกรด A/s);
  f.rows([{ id: "x", status: "advisor_review", student: { first_name: "<script>bad()</script>" }, company_name: "<img src=x onerror=bad()>" }]);
  await f.app.refresh(); assert.equal(f.get("teacherCoopList").querySelector("script"), null); assert.equal(f.get("teacherCoopList").querySelector("img"), null);
  f.rows([]); await f.app.refresh(); assert.match(f.get("teacherCoopMessage").textContent, /ยังไม่มีคำร้องสหกิจที่รอ/);
});
test("Approve confirmation blocks duplicates, reloads server and stops at Head", async () => {
  let finish, count = 0; const blocked = new Promise(resolve => { finish = resolve; });
  const f = fixture({ decide: async id => { count++; await blocked; f.rows([{ id, status: "department_head_review", student: {} }]); } });
  await f.app.ready; await action(f, "approve").dispatch("click"); assert.ok(f.modal()); assert.equal(count, 0);
  const button = f.modal().querySelector(".app-confirm-modal__confirm"), saving = button.dispatch("click");
  await button.listeners.get("click")[0](); assert.equal(count, 1); assert.equal(button.disabled, true); assert.ok(f.buttons().every(button => button.disabled));
  finish(); await saving; assert.equal(f.modal(), undefined); assert.equal(f.buttons().length, 0); assert.ok(f.calls.filter(call => call.list).length >= 2);
  assert.match(f.toasts.at(-1).message, /ส่งต่อให้หัวหน้าภาควิชา/); await f.filter("department_head_review"); assert.equal(action(f, "approve"), undefined);
});
test("Reject requires trimmed reason and reloads rejected state", async () => {
  const f = fixture(); await f.app.ready; await action(f, "reject").dispatch("click");
  await commit(f); assert.equal(f.calls.filter(call => call.decision).length, 0);
  f.modal().querySelector("textarea").value = "  Please correct work period  "; await commit(f);
  assert.equal(f.calls.find(call => call.decision).reason, "Please correct work period"); await f.filter("rejected"); assert.equal(action(f, "reject"), undefined);
});
test("Detail whitelist renders company snapshot, job, work period, courses and rejection history", async () => {
  const f = fixture({ detail: async id => ({ success: true, data: { request: { id, status: "rejected", company_name: "Original snapshot", company_address: "Saved address", work_start_date: "2026-11-01", work_end_date: "2027-02-01", student: { student_id: "66001", first_name: "Student", major: "IT", password_hash: "private-hash", profile_image: "private-path", email: "unrelated-private-email" }, company: { name: "Renamed current company" }, jobPosting: { title: "Developer", description: "Saved job" }, prerequisite_courses: [{ program: "IT", course_code: "060243102", course_name: "Programming", status: "passed", grade: "B+" }] }, reviews: [{ actor_role: "teacher", decision: "reject", to_status: "rejected", reason: "Fix these dates", createdAt: "2026-10-07T00:00:00Z" }] } }) });
  await f.app.ready; await f.buttons()[0].dispatch("click"); assert.equal(f.get("teacherCoopDetail").hidden, false);
  assert.match(f.get("teacherCoopDetailBody").textContent, /Original snapshot.*Developer.*060243102.*B\+.*Fix these dates/s);
  assert.doesNotMatch(f.get("teacherCoopDetailBody").textContent, /private-hash|private-path|unrelated-private-email|Renamed/);
  assert.equal(f.get("teacherCoopDetailBody").querySelectorAll("button").length, 0);
  await f.get("teacherCoopCloseDetail").dispatch("click"); assert.equal(f.get("teacherCoopDetail").hidden, true);
});
test("Decision from detail re-fetches both list and detail without stale actions", async () => {
  const f = fixture(); await f.app.ready; await f.app.openDetail("request-a");
  await f.get("teacherCoopDetailBody").querySelectorAll("button")[0].dispatch("click"); await commit(f);
  assert.match(f.get("teacherCoopDetailBody").textContent, /รอหัวหน้าภาควิชาพิจารณา/); assert.equal(f.get("teacherCoopDetailBody").querySelectorAll("button").length, 0);
  assert.equal(f.calls.filter(call => call.detail).length, 2);
});
for (const state of ["submitted", "staff_review", "department_head_review", "approved", "rejected", "cancelled", "document_issued", "in_progress"]) test(`${state} has detail only and no decision controls`, async () => {
  const f = fixture(); f.rows([{ id: "x", status: state, student: {} }]); await f.app.ready; await f.filter(state);
  assert.equal(f.buttons().length, 1); assert.equal(action(f, "approve"), undefined); assert.equal(action(f, "reject"), undefined);
});
test("Stale decision reloads, closes confirmation and discards cached detail", async () => {
  const f = fixture({ decide: async () => { f.rows([]); throw Object.assign(Error("stale"), { status: 409 }); } });
  await f.app.ready; await action(f, "approve").dispatch("click"); await commit(f);
  assert.match(f.get("teacherCoopMessage").textContent, /เปลี่ยนสถานะ/); assert.equal(f.buttons().length, 0); assert.equal(f.modal(), undefined); assert.equal(f.toasts.at(-1).type, "error");
});
test("Committed approval with failed refresh reports saved result truthfully", async () => {
  let count = 0; const f = fixture({ list: async () => { if (++count > 1) throw Error("offline"); return { success: true, data: [{ id: "x", status: "advisor_review", student: {} }] }; } });
  await f.app.ready; await action(f, "approve").dispatch("click"); await commit(f);
  assert.match(f.get("teacherCoopMessage").textContent, /อนุมัติแล้ว.*โหลดข้อมูลล่าสุดไม่สำเร็จ/); assert.equal(f.buttons().length, 0); assert.equal(f.get("teacherCoopRefresh").disabled, false);
});
for (const status of [401, 403]) test(`Class decision ${status} revokes Teacher session and private rows`, async () => {
  const f = fixture({ decide: async () => { throw Object.assign(Error("auth"), { status }); } }); await f.app.ready;
  await action(f, "approve").dispatch("click"); await commit(f); assert.equal(f.storage.getItem("teacherToken"), undefined); assert.equal(f.storage.getItem("token"), "student-token-untouched");
  assert.equal(f.buttons().length, 0); assert.equal(f.get("teacherCoopRefresh").disabled, true); assert.equal(f.get("teacherCoopSignIn").hidden, false);
});
test("Pagination and filter use server offsets; unavailable API can retry", async () => {
  const f = fixture(); f.rows(Array.from({ length: 27 }, (_, i) => ({ id: String(i), status: "advisor_review", student: {} }))); await f.app.ready;
  assert.equal(f.get("teacherCoopList").children.length, 25); await f.get("teacherCoopNext").dispatch("click"); assert.equal(f.get("teacherCoopList").children.length, 2);
  await f.filter("rejected"); assert.equal(f.calls.at(-1).list.offset, 0);
  let failed = true; const retry = fixture({ list: async () => { if (failed) throw Error("offline"); return { success: true, data: [] }; } }); await retry.app.ready;
  assert.match(retry.get("teacherCoopMessage").textContent, /รีเฟรช/); failed = false; await retry.app.refresh(); assert.match(retry.get("teacherCoopMessage").textContent, /ยังไม่มี/);
  const missing = fixture({ storage: { getItem: () => null } }); await missing.app.ready; assert.deepEqual(missing.redirects, ["/teacher-login.html"]);
});
test("Actual Coop adapter uses separate Teacher bearer and sends reason without identity", async () => {
  const requests = [], ctx = vm.createContext({ sessionStorage: { getItem: () => "teacher-token" }, URLSearchParams, apiRequest: async (path, options) => { requests.push({ path, options }); } });
  vm.runInContext(readFileSync(new URL("../src/api/teacherProjectAdvisor.api.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/export /g, ""), ctx);
  await ctx.getTeacherCoopRequests({ status: "advisor_review", offset: 25 }); await ctx.getTeacherCoopRequest("id"); await ctx.decideTeacherCoopRequest("id", "reject", "Correction");
  for (const { path, options } of requests) { assert.equal(options.auth, false); assert.equal(options.headers.Authorization, "Bearer teacher-token"); assert.doesNotMatch(path, /teacher_id/); }
  assert.match(requests[0].path, /status=advisor_review.*offset=25/); assert.deepEqual(JSON.parse(JSON.stringify(requests[2].options.body)), { reason: "Correction" });
});
test("Revoking Class session prevents an in-flight Project list from restoring private rows", async () => {
  let finish; const blocked = new Promise(resolve => { finish = resolve; });
  const project = teacherFixture({ list: async () => blocked });
  const coop = fixture({ storage: project.storage, me: async () => { throw Object.assign(Error("expired"), { status: 401 }); } });
  await coop.app.ready; finish([{ id: "old", status: "pending", student: { first_name: "Private old row" } }]); await project.app.ready;
  assert.equal(project.get("teacherRequestList").children.length, 0); assert.equal(project.get("teacherRefresh").disabled, true);
  assert.equal(project.storage.getItem("token"), "student-token-untouched");
});
