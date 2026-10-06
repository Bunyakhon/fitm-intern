import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const helperUrl = new URL("../studentCoopAcceptance.test.js", import.meta.url);
const helperSource = readFileSync(helperUrl, "utf8");
const prefix = helperSource.slice(0, helperSource.indexOf("for (const [program, codes, foreign]"))
  .replace(/^import .*;\r?\n/gm, "").replaceAll("import.meta.url", JSON.stringify(helperUrl.href));
const helper = vm.createContext({ readFileSync, vm, assert, URL, console });
vm.runInContext(prefix, helper);
const page = readFileSync(new URL("../../src/pages/student_coop.js", import.meta.url), "utf8").replaceAll("\r\n", "\n");
const projectCode = page.slice(page.indexOf("// Project and project files"), page.indexOf("// Mentor", page.indexOf("// Project and project files")));
const dateCode = page.match(/function formatDate\(dateValue\) \{[\s\S]*?\n\}/)[0];
const feedback = readFileSync(new URL("../../src/ui/feedback.js", import.meta.url), "utf8").replace(/export /g, "");
const messageCode = page.slice(page.indexOf("function showMessage("), page.indexOf("// Initial", page.indexOf("function showMessage(")));

// Shared HTML-derived DOM simulation only: does not assert browser rendering.
export function projectFixture(adapters = {}) {
  const document = helper.createDocument();
  const Element = document.constructor;
  Element.prototype.appendChild = function (child) { this.append(child); return child; };
  const intervals = new Map(), events = new Map(), revoked = [], tabs = [], calls = [], toasts = [];
  let nextTimer = 0, topic = "", files = [], advisorRequest = null;
  const assigned = { id: "assigned-teacher", name: "Assigned Advisor" };
  const context = vm.createContext({ document, console, Intl, Blob,
    getMyCoopProject: async () => ({ topic, coop_advisor_teacher: assigned }),
    getMyProjectAdvisorRequest: async () => {
      const project = await context.getMyCoopProject();
      const confirmed = project.confirmed_advisor || project.coop_advisor_teacher || null;
      return { advisor_request: advisorRequest || { status: confirmed ? "confirmed" : "none", teacher: null }, confirmed_advisor: confirmed };
    },
    requestMyProjectAdvisor: async teacherId => {
      calls.push({ teacher_id: teacherId });
      const teacher = (await context.getTeachers()).teachers.find(t => t.id === teacherId);
      advisorRequest = { id: "fixture-request", status: "pending", teacher: { id: teacherId, name: context.formatTeacherName(teacher) } };
      return { advisor_request: advisorRequest, confirmed_advisor: null };
    },
    saveMyCoopProject: async value => { calls.push({ topic: value }); topic = value; return { topic }; },
    getTeachers: async () => ({ teachers: [{ id: assigned.id, first_name: "Assigned", last_name: "Advisor" }] }),
    getMyCoopProjectFiles: async () => ({ files }),
    uploadMyCoopProjectFile: async (category, file) => {
      calls.push({ category, name: file.name });
      const type = category === "project-book" ? "coop_project_book" : "coop_poster";
      files = files.filter(value => value.file_type !== type).concat({ id: category, file_type: type, original_name: file.name, mime_type: file.type });
    },
    previewMyCoopProjectFile: async id => { calls.push({ preview: id }); return new Blob(["fixture"], { type: "application/pdf" }); },
    formatTeacherName: teacher => [teacher.academic_title, teacher.first_name, teacher.last_name].filter(Boolean).join(" "),
    URL: { createObjectURL: () => "blob:fixture-" + tabs.length, revokeObjectURL: url => revoked.push(url) },
    setInterval: callback => { intervals.set(++nextTimer, callback); return nextTimer; }, clearInterval: id => intervals.delete(id),
    window: {
      setTimeout: () => ++nextTimer, clearTimeout() {},
      addEventListener: (name, callback) => events.set(name, callback),
      open: (...args) => { const tab = { args, closed: false, location: { replace(value) { tab.url = value; } }, close() { this.closed = true; } }; tabs.push(tab); return tab; },
    },
    ...adapters,
  });
  vm.runInContext(feedback + "\n" + messageCode + "\n" + dateCode + "\n" + projectCode, context);
  const get = id => document.getElementById(id);
  return { get, document, context, calls, revoked, tabs, toasts,
    run: code => vm.runInContext(code, context),
    load: () => context.loadStudentCoopProjectSections(),
    save: () => get("saveProjectBtn").dispatch("click"),
    upload: () => get("uploadProjectBtn").dispatch("click"),
    select: (id, file) => { get(id).files = file ? [file] : []; },
    async preview(category = "projectBookCurrent") { await get(category).querySelector("button").dispatch("click"); },
    closeTab() { tabs.at(-1).close(); for (const callback of [...intervals.values()]) callback(); },
    pagehide: () => events.get("pagehide")(),
    setFiles: value => { files = value; },
    adapters: value => Object.assign(context, value),
  };
}
