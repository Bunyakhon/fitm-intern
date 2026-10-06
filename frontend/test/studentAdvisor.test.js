import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/pages/student_coop.js", import.meta.url), "utf8");
const CURRENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const teachers = [
  { id: CURRENT_ID, first_name: "Current", last_name: "Advisor" },
  { id: OTHER_ID, first_name: "Other", last_name: "Advisor" },
];

function sourceBetween(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing frontend function boundary: ${start}`);
  return source.slice(from, to);
}

// Execute the page's actual profile/Teacher/save functions with a controlled DOM.
// No copied payload implementation, browser, HTTP requests or database writes.
const profileCode = sourceBetween("function populateStudentInfoForm(", "function clearProfileImageObjectUrl(");
const saveCode = sourceBetween("async function saveStudentInfo(", 'profileImageInput?.addEventListener("change"');

class Select {
  options = [];
  disabled = false;
  attributes = {};
  listeners = new Map();
  selectedIndex = -1;
  get value() { return this.options[this.selectedIndex]?.value ?? ""; }
  set value(value) { this.selectedIndex = this.options.findIndex((option) => option.value === value); }
  replaceChildren() { this.options = []; this.selectedIndex = -1; }
  appendChild(option) {
    this.options.push(option);
    if (this.selectedIndex === -1 && !option.disabled) this.selectedIndex = this.options.length - 1;
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  choose(value) {
    assert.equal(this.disabled, false, "The user cannot change a disabled directory");
    assert.ok(this.options.some((option) => option.value === value && !option.disabled));
    this.value = value;
    this.listeners.get("change")?.({ target: this });
  }
}

class Input {
  get value() { return this.currentValue ?? ""; }
  set value(value) { this.currentValue = String(value); }
}

function createPage({ advisorId = CURRENT_ID, directory = { teachers } } = {}) {
  const student = {
    advisor_teacher_id: advisorId,
    advisorTeacher: advisorId ? teachers[0] : null,
    first_name: "Student", last_name: "Fixture", student_id: "fixture-id",
    email: "fixture@example.invalid", major: "IT", year_level: 3, gpa: "3.00",
  };
  const advisorInput = new Select();
  const majorInput = new Select();
  const payloads = [];
  let directoryResult = directory;
  const context = {
    currentStudent: student,
    isStudentInfoSaving: false,
    isTeacherDirectoryLoaded: false,
    hasAdvisorSelectionChanged: false,
    studentAdvisorInput: advisorInput,
    studentFullNameInput: {}, studentIdInput: {}, studentEmailInput: {},
    studentMajorInput: majorInput, studentYearLevelInput: new Input(), studentGpaInput: new Input(),
    studentCoopAdvisorInput: {}, studentInfoMessage: {},
    document: { createElement: () => ({ value: "", textContent: "", disabled: false }), getElementById: () => ({}) },
    localStorage: { getItem: () => "in-memory-fixture" },
    console: { error() {} },
    formatTeacherName: (teacher) => `${teacher.first_name} ${teacher.last_name}`,
    getStudentCode: (record) => record.student_id,
    getTeachers: async () => {
      if (directoryResult instanceof Error) throw directoryResult;
      return directoryResult;
    },
    updateStudentInfo: async (payload) => {
      payloads.push(JSON.parse(JSON.stringify(payload)));
      Object.assign(student, payload); // Controlled persistence fake; omission preserves fields.
    },
    loadStudentProfile: async () => {
      context.populateStudentInfoForm(student);
      return student;
    },
    clearMessage() {}, showMessage() {}, showToast() {},
    setStudentInfoButtonState() {}, clearAuthentication() {}, redirectToLogin() {},
  };
  vm.createContext(context);
  vm.runInContext(profileCode + saveCode, context);
  context.populateStudentInfoForm(student);
  return {
    student, advisorInput, majorInput, payloads,
    load: () => context.loadTeachers(),
    save: () => context.saveStudentInfo({ preventDefault() {} }),
    setDirectory: (result) => { directoryResult = result; },
  };
}

test("existing advisor with directory success and no change remains unchanged", async () => {
  const page = createPage();
  await page.load();
  assert.equal(page.advisorInput.value, CURRENT_ID);
  page.majorInput.value = "IT";
  await page.save();
  assert.equal(page.student.advisor_teacher_id, CURRENT_ID);
  assert.equal(Object.hasOwn(page.payloads[0], "advisor_teacher_id"), false);
});

test("directory failure preserves the displayed existing advisor and unrelated saves omit the advisor", async () => {
  const page = createPage({ directory: new Error("Directory unavailable") });
  await page.load();
  assert.equal(page.advisorInput.value, CURRENT_ID);
  assert.equal(page.advisorInput.disabled, true);
  assert.equal(page.advisorInput.attributes["aria-busy"], "false");
  assert.equal(page.advisorInput.options.find((option) => option.value === CURRENT_ID).textContent, "Current Advisor");
  // Unrelated profile edits remain possible while the directory is unavailable.
  page.majorInput.appendChild({ value: "INE" });
  page.majorInput.value = "INE";
  await page.save();
  assert.equal(page.payloads[0].major, "INE");
  assert.equal(Object.hasOwn(page.payloads[0], "advisor_teacher_id"), false);
  assert.equal(page.student.advisor_teacher_id, CURRENT_ID);
  assert.equal(page.student.major, "INE");
});

test("explicit advisor change sends and persists the selected Teacher ID", async () => {
  const page = createPage();
  await page.load();
  page.advisorInput.choose(OTHER_ID);
  await page.save();
  assert.equal(page.payloads[0].advisor_teacher_id, OTHER_ID);
  assert.equal(page.student.advisor_teacher_id, OTHER_ID);
  assert.equal(page.advisorInput.value, OTHER_ID);
});

test("explicit clear sends and persists null only after the user selects the empty option", async () => {
  const page = createPage();
  await page.load();
  page.advisorInput.choose("");
  await page.save();
  assert.equal(Object.hasOwn(page.payloads[0], "advisor_teacher_id"), true);
  assert.equal(page.payloads[0].advisor_teacher_id, null);
  assert.equal(page.student.advisor_teacher_id, null);
});

test("Student without an advisor stays unassigned and can explicitly select a Teacher", async () => {
  const page = createPage({ advisorId: null });
  await page.load();
  assert.equal(page.advisorInput.value, ""); // Never select the first Teacher automatically.
  await page.save();
  assert.equal(Object.hasOwn(page.payloads[0], "advisor_teacher_id"), false);
  assert.equal(page.student.advisor_teacher_id, null);
  page.advisorInput.choose(OTHER_ID);
  await page.save();
  assert.equal(page.payloads[1].advisor_teacher_id, OTHER_ID);
  assert.equal(page.student.advisor_teacher_id, OTHER_ID);
});

test("a persisted advisor absent from the active directory remains displayed and unchanged", async () => {
  const page = createPage({ directory: { teachers: [teachers[1]] } });
  await page.load();
  assert.equal(page.advisorInput.value, CURRENT_ID);
  await page.save();
  assert.equal(Object.hasOwn(page.payloads[0], "advisor_teacher_id"), false);
  assert.equal(page.student.advisor_teacher_id, CURRENT_ID);
});

test("malformed directory response cannot enable an accidental clear", async () => {
  const page = createPage({ directory: {} });
  await page.load();
  assert.equal(page.advisorInput.disabled, true);
  assert.equal(page.advisorInput.value, CURRENT_ID);
  await page.save();
  assert.equal(Object.hasOwn(page.payloads[0], "advisor_teacher_id"), false);
  assert.equal(page.student.advisor_teacher_id, CURRENT_ID);
});

test("Student without an advisor can save unrelated fields after a directory failure", async () => {
  const page = createPage({ advisorId: null, directory: new Error("Directory unavailable") });
  await page.load();
  await page.save();
  assert.equal(Object.hasOwn(page.payloads[0], "advisor_teacher_id"), false);
  assert.equal(page.student.advisor_teacher_id, null);
});
