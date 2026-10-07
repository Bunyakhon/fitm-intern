import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

// Reuse the existing HTML-derived DOM simulation. This is not a real browser.
const helperUrl = new URL("../studentCoopAcceptance.test.js", import.meta.url);
const source = readFileSync(helperUrl, "utf8");
const prefix = source.slice(0, source.indexOf("for (const [program, codes, foreign]"))
  .replace(/^import .*;\r?\n/gm, "").replaceAll("import.meta.url", JSON.stringify(helperUrl.href));

export function teacherFixture(adapters = {}, login = false, coop = false, head = false) {
  if (head) coop = true;
  const html = readFileSync(new URL(head ? login ? "../../department-head-login.html" : "../../src/department_head/department_head.html" : login ? "../../teacher-login.html" : "../../src/teacher_coop/teacher_coop.html", import.meta.url), "utf8");
  const helper = vm.createContext({ readFileSync, vm, assert, URL, console });
  vm.runInContext(prefix.replace(/const html = [^\n]+/, `const html = ${JSON.stringify(html)};`), helper);
  const document = helper.createDocument();
  const values = new Map([["teacherToken", "fixture-teacher-token"], ["token", "student-token-untouched"]]);
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const redirects = [], calls = [], toasts = [], timers = [];
  const context = vm.createContext({ console, Intl, Date, TEACHER_TOKEN_KEY: "teacherToken", window: { setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {} } });
  vm.runInContext(readFileSync(new URL("../../src/ui/feedback.js", import.meta.url), "utf8").replace(/export /g, ""), context);
  const controller = readFileSync(new URL(login ? "../../src/pages/teacherLogin.js" : coop ? "../../src/pages/teacherCoopRequests.js" : "../../src/pages/teacherCoop.js", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace(/export /g, "").replace(/^if \(typeof document.*$/gm, "");
  vm.runInContext(controller, context);
  // Set the document after evaluation to keep the page's automatic mount disabled.
  context.document = document;
  let rows = [{ id: "request-a", status: "pending", student: { student_id: "66001", first_name: "Student", last_name: "One", major: "IT" }, topic: "Project", requested_at: "2026-10-07T00:00:00Z" }];
  if (coop) rows = rows.map(row => ({ ...row, status: "advisor_review", company_name: "Snapshot Company", submitted_at: row.requested_at, prerequisite_courses: [{ program: "IT", course_code: "060243102", course_name: "Programming", status: "passed", grade: "A" }] }));
  if (head) rows = rows.map(row => ({ ...row, status: "department_head_review", student: { ...row.student, advisorTeacher: { id: "class-a", first_name: "Class", last_name: "Advisor" } }, reviews: [{ actor_role: "teacher", decision: "approve", from_status: "advisor_review", to_status: "department_head_review", createdAt: "2026-10-07T01:00:00Z", teacher: { id: "class-a", first_name: "Class", last_name: "Advisor" } }] }));
  const options = { document, storage, location: { replace: path => redirects.push(path) },
    me: async () => ({ success: true, data: { id: "teacher-a", first_name: "Teacher", last_name: "One", ...(head ? { is_department_head: true } : {}) } }),
    list: async query => { calls.push({ list: { ...query } }); const data = rows.filter(row => row.status === query.status).slice(query.offset, query.offset + query.limit); return coop ? { success: true, data } : data; },
    detail: async id => { calls.push({ detail: id }); const request = rows.find(row => row.id === id); return { success: true, data: { request, reviews: request?.reviews || [] } }; },
    decide: async (id, decision, reason) => { calls.push({ id, decision, reason }); rows = rows.map(row => row.id === id ? { ...row, status: decision === "approve" ? head ? "approved" : "department_head_review" : decision === "accept" ? "confirmed" : "rejected", rejection_reason: reason } : row); },
    login: async body => { calls.push(body); return { token: "logged-in-teacher-token", ...(head ? { teacher: { is_department_head: true } } : {}) }; },
    toast: (message, type) => toasts.push({ message, type }),
    confirm: context.showConfirmModal, loading: context.setButtonLoading,
    ...adapters,
  };
  if (head) {
    Object.assign(context, { getCurrentDepartmentHead: options.me, getHeadCoopRequests: options.list, getHeadCoopRequest: options.detail, decideHeadCoopRequest: options.decide });
    const wrapper = readFileSync(new URL(login ? "../../src/pages/departmentHeadLogin.js" : "../../src/pages/departmentHead.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/export /g, "").replace(/^if \(typeof document.*$/gm, "");
    vm.runInContext(wrapper, context);
  }
  const app = head ? login ? context.mountDepartmentHeadLogin(options) : context.mountDepartmentHead(options) : login ? context.mountTeacherLogin(options) : coop ? context.mountTeacherCoopRequests(options) : context.mountTeacherCoop(options);
  const get = id => document.getElementById(id);
  return { app, context, document, get, storage, redirects, calls, toasts, options,
    rows: data => { rows = data; },
    buttons: () => get(coop ? "teacherCoopList" : "teacherRequestList").querySelectorAll("button"),
    modal: () => document.querySelectorAll(".app-confirm-overlay").find(node => !node.classList.contains("is-leaving")),
    flush: () => { for (const fn of timers.splice(0)) fn(); },
    async filter(status) { const select = get(coop ? "teacherCoopStatus" : "teacherRequestStatus"); select.value = status; await select.dispatch("change"); },
  };
}
