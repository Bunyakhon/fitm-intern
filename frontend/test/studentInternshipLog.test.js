import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { projectFixture } from "./helpers/studentCoopProjectFixture.js";
const source = readFileSync(new URL("../src/pages/studentInternshipLog.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
const view = readFileSync(new URL("../src/pages/internshipLogView.js", import.meta.url), "utf8").replace(/export /g, "");
async function fixture(status = null, logs = []) {
  const base = projectFixture(), calls = [], toasts = [], state = { student: { name: "Student", code: "fixture" }, today: "2026-10-08", period: { start: "2026-09-23", end: "2026-09-24" }, week: { start: "2026-09-21", end: "2026-09-27" }, required_dates: ["2026-09-23", "2026-09-24"], logs, submission: status ? { id: "week", status, version: 2 } : null, history: [], total_logs: logs.length };
  let modal;
  const context = base.context;
  Object.assign(context, {
    getLogOverview: async () => ({ ...state, logs: [...state.logs], missing_dates: state.required_dates.filter(date => !state.logs.some(log => log.log_date === date)) }),
    saveDailyLog: async (date, body, existing) => { calls.push({ date, body, existing }); const log = { ...body, log_date: date, version: (body.version || 0) + 1 }; state.logs = state.logs.filter(l => l.log_date !== date).concat(log); state.total_logs = state.logs.length; return { log }; },
    submitLogWeek: async (date, version) => { calls.push({ submit: date, version }); state.submission = { status: "submitted", version: version + 1 }; return { email_sent: false }; },
    resendMentorLink: async () => ({ email_sent: true }),
    showToast: (message, type) => toasts.push({ message, type }),
    showConfirmModal: options => { modal = options; },
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
  f.context.getLogOverview = async () => { throw Object.assign(Error("Offline fixture"), { status: 500 }); }; await f.reload(); assert.equal(f.get("dailyLogTableBody").children.length, 0); assert.equal(f.get("dailyStatus").textContent, "Offline fixture");
  f.context.getLogOverview = good; await f.reload(); assert.equal(f.get("dailyLogTableBody").children.length, 2);
  await f.row(0).dispatch("click"); f.context.saveDailyLog = async () => { throw Object.assign(Error("Expired fixture"), { status: 401 }); }; await f.get("dailyForm").dispatch("submit"); assert.equal(f.get("dailyEditor").hidden, true); assert.equal(f.get("dailyLogTableBody").children.length, 0); assert.equal(f.get("dailyCount").textContent, "0"); assert.equal(f.get("submitDailyWeek").disabled, true);
});
test("Student must save daily edits before the weekly submission confirmation", async () => {
  const f = await fixture(null, [work, { kind: "non_working", log_date: "2026-09-24", non_working_reason: "ลา", version: 1 }]);
  await f.row(0).dispatch("click"); f.get("daily_work_result").value = "ยังไม่ได้บันทึก"; await f.get("submitDailyWeek").dispatch("click");
  assert.equal(f.modal(), undefined); assert.equal(f.calls.length, 0); assert.match(f.toasts[0].message, /กรุณาบันทึก/);
});
