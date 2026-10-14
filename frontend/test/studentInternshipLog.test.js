import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { projectFixture } from "./helpers/studentCoopProjectFixture.js";
const source = readFileSync(new URL("../src/pages/studentInternshipLog.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
const view = readFileSync(new URL("../src/pages/internshipLogView.js", import.meta.url), "utf8").replace(/export /g, "");
async function fixture(status = null, logs = [], adapters = {}) {
  const base = projectFixture(), calls = [], toasts = [], state = { student: { name: "Student", code: "fixture" }, today: "2026-10-08", period: { start: "2026-09-23", end: "2026-09-24" }, week: { start: "2026-09-21", end: "2026-09-27" }, required_dates: ["2026-09-23", "2026-09-24"], logs, submission: status ? { id: "week", status, version: 2 } : null, history: [], total_logs: logs.length };
  let modal;
  const context = base.context;
  Object.assign(context, {
    getLogOverview: async () => ({ ...state, logs: [...state.logs], missing_dates: state.required_dates.filter(date => !state.logs.some(log => log.log_date === date)) }),
    getMyMentor: async () => ({ data: { first_name: "Test", last_name: "Mentor", position: "Supervisor", status: "verified", verified_at: "2026-09-01T00:00:00Z" } }),
    saveDailyLog: async (date, body, existing) => { calls.push({ date, body, existing }); const log = { ...body, log_date: date, version: (body.version || 0) + 1 }; state.logs = state.logs.filter(l => l.log_date !== date).concat(log); state.total_logs = state.logs.length; return { log }; },
    submitLogWeek: async (date, version) => { calls.push({ submit: date, version }); state.submission = { status: "submitted", version: version + 1 }; return { email_sent: false }; },
    resendMentorLink: async () => ({ email_sent: true }),
    showToast: (message, type) => toasts.push({ message, type }),
    showConfirmModal: options => { modal = options; },
    ...adapters,
  });
  vm.runInContext(view + "\n" + source + "\ninitStudentInternshipLog();", context);
  await new Promise(resolve => setImmediate(resolve));
  return { ...base, state, calls, toasts, modal: () => modal, reload: () => base.get("dailyReload").dispatch("click"), row: index => base.get("dailyLogTableBody").children[index].querySelector("button") };
}
const work = { kind: "working", log_date: "2026-09-23", assigned_work: "งาน", work_result: "ผล", problems: "ไม่มีปัญหา", solutions: "ไม่ต้องแก้ไข", notes: "", version: 3 };
test("Student missing dates render safe buttons and save actual daily fields then reload", async () => {
  const f = await fixture(); assert.match(f.get("dailyStatus").textContent, /วันที่ยังขาด/); assert.equal(f.get("submitDailyWeek").disabled, true);
  await f.row(0).dispatch("click"); for (const [field, value] of Object.entries(work).filter(([key]) => !["kind", "log_date", "version"].includes(key))) f.get("daily_" + field).value = value;
  await f.get("dailyForm").dispatch("submit"); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].date, "2026-09-23"); assert.equal(f.calls[0].body.problems, "ไม่มีปัญหา"); assert.equal(f.calls[0].existing, false); assert.equal(f.get("dailyCount").textContent, "1"); assert.equal(f.get("dailyEditor").hidden, true);
});
test("Student nonworking form sends reason without inventing work", async () => {
  const f = await fixture(); await f.row(0).dispatch("click"); f.get("dailyKind").value = "non_working"; await f.get("dailyKind").dispatch("change"); f.get("daily_non_working_reason").value = "วันหยุด";
  await f.get("dailyForm").dispatch("submit"); assert.equal(f.calls[0].body.non_working_reason, "วันหยุด"); assert.equal(f.calls[0].body.assigned_work, undefined); assert.equal(f.get("dailyWorkingFields").hidden, true);
});
test("Student submitted/reviewed entries freeze; requested revisions enable controlled versioned edits", async () => {
  for (const status of ["submitted", "reviewed"]) { const f = await fixture(status, [work]); await f.row(0).dispatch("click"); assert.equal(f.get("dailyFieldset").disabled, true); await f.get("dailyForm").dispatch("submit"); assert.equal(f.calls.length, 0); }
  const f = await fixture("revision_requested", [work]); await f.row(0).dispatch("click"); assert.equal(f.get("dailyFieldset").disabled, false); f.get("daily_work_result").value = "แก้แล้ว"; await f.get("dailyForm").dispatch("submit"); assert.equal(f.calls[0].body.version, 3); assert.equal(f.calls[0].existing, true);
});
test("Student weekly confirmation includes all dates and truthful committed email failure", async () => {
  const f = await fixture(null, [work, { kind: "non_working", log_date: "2026-09-24", non_working_reason: "ลา", notes: "", version: 1 }]); assert.equal(f.get("submitDailyWeek").disabled, false);
  await f.get("submitDailyWeek").dispatch("click"); assert.match(f.modal().message, /รวม 2 วัน/); await f.modal().onConfirm(); assert.equal(f.calls[0].submit, "2026-09-21"); assert.equal(f.calls[0].version, 0); assert.equal(f.get("submitDailyWeek").disabled, true); assert.match(f.toasts[0].message, /บันทึกถูกส่งแล้ว/); assert.equal(f.toasts[0].type, "warning");
});
test("Student retry recovers load errors and expired authorization clears private data", async () => {
  const f = await fixture(null, [work]); const good = f.context.getLogOverview;
  f.context.getLogOverview = async () => { throw Object.assign(Error("Offline fixture"), { status: 500 }); }; await f.reload(); assert.equal(f.get("dailyLogTableBody").children.length, 0); assert.match(f.get("dailyStatus").textContent, /เชื่อมต่อระบบบันทึกไม่ได้/);
  f.context.getLogOverview = good; await f.reload(); assert.equal(f.get("dailyLogTableBody").children.length, 2);
  await f.row(0).dispatch("click"); f.context.saveDailyLog = async () => { throw Object.assign(Error("Expired fixture"), { status: 401 }); }; await f.get("dailyForm").dispatch("submit"); assert.equal(f.get("dailyEditor").hidden, true); assert.equal(f.get("dailyLogTableBody").children.length, 0); assert.equal(f.get("dailyCount").textContent, "0"); assert.equal(f.get("submitDailyWeek").disabled, true);
});
test("Student must save daily edits before the weekly submission confirmation", async () => {
  const f = await fixture(null, [work, { kind: "non_working", log_date: "2026-09-24", non_working_reason: "ลา", version: 1 }]);
  await f.row(0).dispatch("click"); f.get("daily_work_result").value = "ยังไม่ได้บันทึก"; await f.get("submitDailyWeek").dispatch("click");
  assert.equal(f.modal(), undefined); assert.equal(f.calls.length, 0); assert.match(f.toasts[0].message, /กรุณาบันทึก/);
});

test("Period-required response clears prior data and disables actions without exposing backend text", async () => {
  const f = await fixture(null, [work]);
  f.context.getLogOverview = async () => { throw Object.assign(Error("raw backend validation"), { status: 409, data: { code: "INTERNSHIP_PERIOD_REQUIRED" } }); };
  await f.reload();
  assert.match(f.get("dailyStatus").textContent, /คำร้องสหกิจศึกษาที่อนุมัติ/);
  assert.doesNotMatch(f.get("dailyStatus").textContent, /raw backend/);
  assert.equal(f.get("dailyEmpty").hidden, false);
  assert.equal(f.get("dailyTableWrapper").hidden, true);
  assert.equal(f.get("dailyLogTableBody").children.length, 0);
  for (const id of ["submitDailyWeek", "dailyResendLink", "dailyAddLog"]) assert.equal(f.get(id).disabled, true);
  for (const id of ["dailySubmissionStatus", "dailyMentorName", "dailyLastUpdated"]) assert.equal(f.get(id).textContent, "ยังไม่พร้อมเริ่มบันทึก");
  assert.equal(f.get("dailyReload").disabled, false);
});

test("Empty overview shows truthful summary and Add opens the existing daily editor", async () => {
  const f = await fixture();
  assert.equal(f.get("dailySubmissionStatus").textContent, "ยังไม่ส่ง");
  assert.equal(f.get("dailyLastUpdated").textContent, "ยังไม่มีการบันทึก");
  assert.equal(f.get("dailyEmpty").hidden, false);
  assert.match(f.get("dailyHistory").textContent, /ยังไม่มีประวัติการส่ง/);
  assert.match(f.get("dailyWeekSummary").textContent, /2569/);
  await f.get("dailyAddLog").dispatch("click");
  assert.equal(f.get("dailyDate").value, "2026-09-23");
  assert.equal(f.get("dailyEditor").hidden, false);
  assert.equal(f.document.activeElement, f.get("dailyEditorTitle"));
});

test("Mentor prerequisites match verified status and timestamp; daily recording stays available", async () => {
  for (const mentor of [null, { first_name: "Pending", status: "pending" }, { first_name: "Unverified", status: "verified", verified_at: null }]) {
    const f = await fixture(null, [work], { getMyMentor: async () => ({ data: mentor }) });
    assert.equal(f.get("submitDailyWeek").disabled, true);
    assert.equal(f.get("dailyResendLink").disabled, true);
    assert.equal(f.get("dailyAddLog").disabled, false);
    assert.match(f.get("dailyActionHelp").textContent, /ยืนยันข้อมูล/);
    if (!mentor) assert.equal(f.get("dailyMentorName").textContent, "ยังไม่มีข้อมูลพี่เลี้ยง");
    await f.row(0).dispatch("click"); assert.equal(f.get("dailyFieldset").disabled, false);
  }
});

test("Mentor API failure is unavailable rather than absent; refresh can recover", async () => {
  const f = await fixture(null, [work], { getMyMentor: async () => { throw Object.assign(Error("offline"), { status: 500 }); } });
  assert.equal(f.get("dailyMentorName").textContent, "ไม่สามารถโหลดข้อมูลพี่เลี้ยง");
  assert.equal(f.get("dailyResendLink").disabled, true);
  assert.equal(f.get("dailyLogTableBody").children.length, 2);
  f.context.getMyMentor = async () => ({ data: { first_name: "Real", position: "Supervisor", status: "verified", verified_at: "2026-09-01T00:00:00Z" } });
  await f.reload(); assert.equal(f.get("dailyMentorName").textContent, "Real"); assert.equal(f.get("dailyResendLink").disabled, false);
});

test("Timeline preserves snapshot details, stored feedback and Bangkok update time safely", async () => {
  const f = await fixture("reviewed", [{ ...work, updatedAt: "2026-09-23T01:00:00Z" }]);
  f.state.submission.updatedAt = "2026-09-25T02:00:00Z";
  f.state.history = [
    { action: "submitted", version: 1, createdAt: "2026-09-24T01:00:00Z", snapshot: { logs: [work] } },
    { action: "reviewed", version: 2, createdAt: "2026-09-25T02:00:00Z", mentor_name: "Stored Reviewer", feedback: "<script>unsafe</script>\nรายละเอียดจริง", snapshot: { logs: [work] } },
  ];
  await f.reload();
  assert.equal(f.get("dailySubmissionStatus").textContent, "พี่เลี้ยงตรวจแล้ว");
  assert.match(f.get("dailyHistory").textContent, /Stored Reviewer/);
  assert.match(f.get("dailyHistory").textContent, /<script>unsafe<\/script>/);
  assert.equal(f.get("dailyHistory").querySelectorAll("script").length, 0);
  assert.equal(f.get("dailyHistory").querySelectorAll("details").length, 1);
  assert.match(f.get("dailyLastUpdated").textContent, /09:00/);
});

test("Unknown backend statuses stay unknown and locked instead of becoming draft", async () => {
  const f = await fixture("unknown_status", [work]);
  assert.equal(f.get("dailySubmissionStatus").textContent, "ไม่ทราบสถานะการส่ง");
  assert.doesNotMatch(f.get("dailyActionHelp").textContent, /ส่งบันทึกแล้ว/);
  assert.equal(f.get("submitDailyWeek").disabled, true);
  await f.row(0).dispatch("click"); assert.equal(f.get("dailyFieldset").disabled, true);
});

test("Future and outside-period dates cannot create or submit logs", async () => {
  const f = await fixture(); f.state.today = "2026-09-22"; await f.reload();
  assert.equal(f.row(0).disabled, true); assert.equal(f.get("dailyAddLog").disabled, true); assert.equal(f.get("submitDailyWeek").disabled, true);
  f.state.required_dates = []; f.state.logs = []; await f.reload();
  assert.equal(f.get("dailyTableWrapper").hidden, true); assert.equal(f.get("dailyAddLog").disabled, true);
  assert.match(f.get("dailyEmptyDescription").textContent, /นอกช่วงฝึกงาน/);
});

test("Unsaved edits survive reload, date change and row change until explicitly confirmed", async () => {
  const f = await fixture(); await f.row(0).dispatch("click"); f.get("daily_assigned_work").value = "ยังไม่ได้บันทึก";
  let requests = 0; const original = f.context.getLogOverview;
  f.context.getLogOverview = async date => { requests++; return original(date); };
  await f.reload(); assert.equal(requests, 0); assert.equal(f.get("daily_assigned_work").value, "ยังไม่ได้บันทึก");
  await f.row(1).dispatch("click"); assert.equal(f.get("dailyDate").value, "2026-09-23");
  const selectedDate = f.get("dailyWeekDate").value;
  f.get("dailyWeekDate").value = "2026-09-24"; await f.get("dailyWeekDate").dispatch("change");
  assert.equal(f.get("dailyWeekDate").value, selectedDate); assert.equal(requests, 0);
  await f.modal().onConfirm(); assert.equal(requests, 1); assert.equal(f.get("dailyWeekDate").value, "2026-09-24");
});

test("Loading and resend lock competing controls and duplicate initialization adds no requests", async () => {
  const f = await fixture(); let resolveSend, count = 0;
  f.context.resendMentorLink = () => { count++; return new Promise(resolve => { resolveSend = resolve; }); };
  const handler = f.get("dailyResendLink").listeners.get("click")[0], pending = handler();
  for (const id of ["dailyReload", "dailyWeekDate", "dailyAddLog", "dailyResendLink"]) assert.equal(f.get(id).disabled, true);
  assert.equal(f.get("dailyResendLink").getAttribute("aria-busy"), "true");
  assert.equal(f.row(0).disabled, true);
  await handler(); assert.equal(count, 1);
  resolveSend({ email_sent: true }); await pending;
  assert.equal(f.get("dailyResendLink").disabled, false); assert.equal(f.row(0).disabled, false);
  let loads = 0; f.context.getLogOverview = async () => { loads++; return f.state; };
  f.run("initStudentInternshipLog();"); assert.equal(loads, 0);
  assert.equal(f.get("dailyReload").listeners.get("click").length, 1);
});
