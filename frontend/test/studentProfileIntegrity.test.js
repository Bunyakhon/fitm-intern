import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { StudentProfileDraft, PROFILE_INPUTS, readProfileInputs, writeProfileInputs, validateProfileBirthDate } from "../src/pages/studentProfileDraft.js";

const source = readFileSync(new URL("../src/pages/student_coop.js", import.meta.url), "utf8").replaceAll("\r\n", "\n");
const helperUrl = new URL("./studentCoopAcceptance.test.js", import.meta.url);
const helperSource = readFileSync(helperUrl, "utf8");
const prefix = helperSource.slice(0, helperSource.indexOf("for (const [program, codes, foreign]"))
  .replace(/^import .*;\r?\n/gm, "").replaceAll("import.meta.url", JSON.stringify(helperUrl.href));
const helper = vm.createContext({ readFileSync, vm, assert, URL, console });
vm.runInContext(prefix, helper);
const between = (start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing page boundary: ${start}`);
  return source.slice(from, to);
};
const clone = value => JSON.parse(JSON.stringify(value));
const initial = () => ({
  ...Object.fromEntries(Object.keys(PROFILE_INPUTS).map(field => [field, null])),
  prefix: "นาย", birth_date: "2000-02-29", height_cm: "170.00", weight_kg: "60.50",
  religion: "Fixture Religion", current_phone: "0000000000", parent_contact_address: "Fixture Address",
  medical_conditions: "Fixture Health", related_skills: "Fixture Skill", father_age: 60,
});

// Execute actual page functions and HTML-derived controls, with no network/DB.
// This models interactions, not CSS or native browser rendering.
function fixture({ profile = initial(), loaded = true } = {}) {
  const document = helper.createDocument(), calls = [], messages = [], timers = [], events = new Map();
  let stored = clone(profile), revision = '"fixture-1"', version = 1, getFailure = false, confirm;
  const student = () => ({ first_name: "Safe", last_name: "Fixture", student_id: "fixture", major: "IT", year_level: 3, gpa: "3.00", profile: clone(stored) });
  const get = id => document.getElementById(id);
  const context = vm.createContext({ document, console: { error() {}, log() {} }, Intl,
    StudentProfileDraft, PROFILE_INPUTS, readProfileInputs, writeProfileInputs,
    localStorage: { getItem: () => "in-memory-fixture" },
    getStudentToken: () => "in-memory-fixture",
    window: { addEventListener: (name, callback) => events.set(name, callback), setTimeout: callback => timers.push(callback) },
    setTimeout: callback => timers.push(callback),
    getMyStudentProfile: async () => {
      if (getFailure || !loaded) throw new Error("Fixture GET failed");
      return { student: student(), profile_revision: revision };
    },
    updateMyStudentProfile: async (patch, expected) => {
      calls.push({ patch: clone(patch), revision: expected });
      if (expected !== revision) throw Object.assign(new Error("Fixture conflict"), { status: 409 });
      stored ??= {};
      Object.assign(stored, clone(patch));
      for (const field of ["height_cm", "weight_kg"]) if (stored[field] != null) stored[field] = Number(stored[field]).toFixed(2);
      revision = `"fixture-${++version}"`;
      return { profile: clone(stored), profile_revision: revision };
    },
    setProfileLoading() {}, renderStudent() {}, renderStudentProfile() {}, syncCoopPrerequisiteProgram() {},
    loadProfileImage: async () => {},
    populateStudentInfoForm: data => {
      get("studentMajorInput").value = data.major;
      get("studentYearLevelInput").value = String(data.year_level);
      get("studentGpaInput").value = data.gpa;
    },
    clearMessage: target => { if (target) target.textContent = ""; },
    showMessage: (target, text, type) => { if (target) target.textContent = text; messages.push({ text, type }); },
    showToast() {}, clearAuthentication() {}, redirectToLogin() {},
    showConfirmModal: options => { confirm = options; },
  });
  vm.runInContext(`
    let currentStudent = null, currentStudentProfile = null, studentProfileRevision = null,
      hasLoadedStudentProfile = false, studentProfileDraft = null, studentProfileLoadSequence = 0, studentInfoRevision = null, selectedProfileImageFile = null;
    let isStudentProfileSaving = false, isProfileImageUploading = false, hasAdvisorSelectionChanged = false;
    const profileLoadMessage = document.getElementById("profileLoadMessage"),
      profileEditMessage = document.getElementById("profileEditMessage"),
      profileEditModal = document.getElementById("profileEditModal"),
      btnEditProfile = document.getElementById("btnEditProfile"),
      saveProfileBtn = document.getElementById("saveProfileBtn"),
      profileAvatarButton = document.getElementById("profileAvatarButton"),
      profileImageEditorSection = document.getElementById("profileImageEditorSection"),
      closeProfileEditModal = document.getElementById("closeProfileEditModal"),
      cancelProfileEditBtn = document.getElementById("cancelProfileEditBtn"),
      studentInfoForm = document.getElementById("studentInfoForm"),
      studentMajorInput = document.getElementById("studentMajorInput"),
      studentYearLevelInput = document.getElementById("studentYearLevelInput"),
      studentGpaInput = document.getElementById("studentGpaInput"),
      studentAdvisorInput = document.getElementById("studentAdvisorInput");
    ${between("// Profile tabs only change visibility", "function formatTeacherName(")}
    ${between("function setInputElementValue(", "function preserveCurrentAdvisorOption(")}
    ${between("async function loadStudentProfile()", "\nfunction setProfileLoading(")}
    ${between("function profileRequestDiagnostic(", "async function loadProfileImage(")}
    ${between("function calculateAge(", "function setText(")}
    ${between("function openProfileEditModal()", "// ==============================\n// Translate Status")}
  `, context);
  const run = code => vm.runInContext(code, context);
  return { document, get, calls, messages, context, run,
    load: () => run("loadStudentProfile()"), open: () => run("openProfileEditModal()"),
    save: () => run("saveStudentProfile()"), close: () => run("closeProfileModal()"),
    value: (field, value) => { get(PROFILE_INPUTS[field]).value = value; },
    stored: () => clone(stored), failRefresh: () => { getFailure = true; },
    remote: patch => { stored = { ...stored, ...patch }; revision = `"fixture-${++version}"`; },
    async flushTimers() { for (const callback of timers.splice(0)) await callback(); },
    beforeUnload: () => { const event = { prevented: false, preventDefault() { this.prevented = true; } }; events.get("beforeunload")?.(event); return event; },
    confirmReload: async () => { run("reloadStudentProfileAfterConflict()"); await confirm.onConfirm(); },
  };
}

test("academic refresh keeps dirty fields bound to their original aggregate revision", async () => {
  const f = fixture(); await f.load();
  assert.equal(f.run("studentInfoRevision"), '"fixture-1"');
  f.get("studentMajorInput").value = "INE";
  f.remote({ religion: "Changed remotely" }); await f.load();
  assert.equal(f.get("studentMajorInput").value, "INE");
  assert.equal(f.run("studentInfoRevision"), '"fixture-1"');
  assert.equal(f.run("studentProfileRevision"), '"fixture-2"');
  f.get("studentMajorInput").value = "IT"; await f.load();
  assert.equal(f.run("studentInfoRevision"), '"fixture-2"');
});

for (const [label, patch] of [
  ["personal only", { religion: "Updated Religion", birth_date: "2004-02-29" }],
  ["contact only", { current_phone: "0000000001", parent_contact_address: "Updated Address", emergency_contact_name: "Safe Contact" }],
  ["both categories", { related_skills: "Updated Skill", emergency_contact_phone: "0000000002" }],
]) test(`${label}: page submits only dirty API fields and refresh preserves the rest`, async () => {
  const f = fixture(), before = f.stored(); await f.load(); f.open();
  for (const [field, value] of Object.entries(patch)) f.value(field, value);
  await f.save();
  assert.deepEqual(f.calls[0].patch, patch);
  assert.equal(f.calls[0].revision, '"fixture-1"');
  assert.deepEqual(f.stored(), { ...before, ...patch });
  await f.load();
  for (const field of Object.keys(PROFILE_INPUTS)) assert.equal(String(f.get(PROFILE_INPUTS[field]).value), String(f.stored()[field] ?? ""), field);
});

test("switching visible tabs retains both dirty categories; close/reopen also retains the draft", async () => {
  const f = fixture(); await f.load(); f.open();
  f.value("religion", "Dirty Personal");
  f.run('studentProfileEditTabs.select("profileEditContactTab")');
  f.value("current_phone", "0000000001");
  f.run('studentProfileEditTabs.select("profileEditPersonalTab")');
  assert.equal(f.get("editReligion").value, "Dirty Personal");
  assert.equal(f.get("editCurrentPhone").value, "0000000001");
  f.close(); f.open();
  assert.equal(f.get("editReligion").value, "Dirty Personal");
  assert.equal(f.beforeUnload().prevented, true);
  await f.save();
  assert.deepEqual(f.calls[0].patch, { religion: "Dirty Personal", current_phone: "0000000001" });
  assert.equal(f.beforeUnload().prevented, false);
});

test("unchanged values, formatting-only changes, read-only and missing controls do not become patches", async () => {
  const f = fixture(); await f.load(); f.open();
  f.value("height_cm", "170"); f.value("religion", "  Fixture Religion  ");
  f.get("editAge").value = "999";
  f.get("studentIdInput").value = "spoofed-owner";
  await f.save();
  assert.equal(f.calls.length, 0);
  const original = f.document.getElementById;
  f.document.getElementById = id => id === "editCurrentPhone" ? null : original(id);
  f.value("allergies", "Safe Allergy"); await f.save();
  assert.deepEqual(f.calls[0].patch, { allergies: "Safe Allergy" });
  assert.equal(f.stored().current_phone, "0000000000");
});

test("intentional clear sends null for only the changed optional field", async () => {
  const f = fixture(); await f.load(); f.open(); f.value("medical_conditions", " ");
  await f.save();
  assert.deepEqual(f.calls[0].patch, { medical_conditions: null });
  assert.equal(f.stored().related_skills, "Fixture Skill");
  assert.equal(f.stored().medical_conditions, null);
});

test("initial load failure blocks modal editing and writes", async () => {
  const f = fixture({ loaded: false }); await f.load(); f.open(); await f.save();
  assert.equal(f.calls.length, 0);
  assert.equal(f.get("profileEditModal").classList.contains("open"), false);
});

test("successful and failed API refreshes preserve unsaved values and their original revision", async () => {
  const f = fixture(); await f.load(); f.open(); f.value("religion", "Local Dirty");
  f.remote({ current_phone: "0000000001" }); await f.load();
  assert.equal(f.get("editReligion").value, "Local Dirty");
  assert.equal(f.run("studentProfileDraft.revision"), '"fixture-1"');
  f.failRefresh(); await f.load(); f.close(); f.open();
  assert.equal(f.get("editReligion").value, "Local Dirty");
  assert.equal(f.run("currentStudentProfile.current_phone"), "0000000001");
});

test("save success with failed refresh uses committed response and reports refresh failure separately", async () => {
  const f = fixture(); await f.load(); f.open(); f.value("religion", "Committed"); f.failRefresh();
  await f.save();
  assert.equal(f.stored().religion, "Committed");
  assert.equal(f.run("currentStudentProfile.religion"), "Committed");
  assert.match(f.get("profileEditMessage").textContent, /บันทึกสำเร็จ.*โหลดข้อมูลซ้ำไม่สำเร็จ/);
  assert.equal(f.run("studentProfileDraft.hasChanges(readProfileInputs(document))"), false);
});

test("typing during save and refresh stays dirty and does not get auto-closed or overwritten", async () => {
  const f = fixture(); await f.load(); f.open(); f.value("religion", "Submitted");
  const original = f.context.updateMyStudentProfile;
  let resolvePut;
  f.context.updateMyStudentProfile = async (...args) => { await new Promise(resolve => { resolvePut = resolve; }); return original(...args); };
  const pending = f.save();
  f.value("religion", "Typed During PUT"); f.value("current_phone", "0000000001");
  f.get("studentGpaInput").value = "3.75";
  resolvePut(); await pending; await f.flushTimers();
  assert.equal(f.stored().religion, "Submitted");
  assert.equal(f.get("editReligion").value, "Typed During PUT");
  assert.equal(f.get("editCurrentPhone").value, "0000000001");
  assert.equal(f.get("studentGpaInput").value, "3.75");
  assert.equal(f.get("profileEditModal").classList.contains("open"), true);
  f.context.updateMyStudentProfile = original;
  await f.save();
  assert.deepEqual(f.calls[1].patch, { religion: "Typed During PUT", current_phone: "0000000001" });
});

test("edit during GET refresh after save stays dirty", async () => {
  const f = fixture(); await f.load(); f.open(); f.value("religion", "Submitted");
  const original = f.context.getMyStudentProfile;
  let resolveGet;
  f.context.getMyStudentProfile = async () => { await new Promise(resolve => { resolveGet = resolve; }); return original(); };
  const pending = f.save();
  while (!resolveGet) await Promise.resolve();
  f.value("allergies", "Typed During GET"); resolveGet(); await pending;
  assert.equal(f.get("editAllergies").value, "Typed During GET");
  assert.equal(f.run("studentProfileDraft.hasChanges(readProfileInputs(document))"), true);
});

test("failed PUT preserves both dirty categories; reverting during a successful PUT remains a new edit", async () => {
  const f = fixture(); await f.load(); f.open();
  f.value("religion", "Pending Personal"); f.value("current_phone", "0000000001");
  const original = f.context.updateMyStudentProfile;
  f.context.updateMyStudentProfile = async () => { throw new Error("Fixture write failure"); };
  await f.save();
  assert.equal(f.get("editReligion").value, "Pending Personal");
  assert.equal(f.get("editCurrentPhone").value, "0000000001");
  assert.equal(f.stored().religion, "Fixture Religion");
  let release;
  f.context.updateMyStudentProfile = async (...args) => { await new Promise(resolve => { release = resolve; }); return original(...args); };
  const pending = f.save();
  f.value("religion", "Fixture Religion"); release(); await pending;
  assert.equal(f.stored().religion, "Pending Personal");
  assert.equal(f.get("editReligion").value, "Fixture Religion");
  assert.equal(f.run("studentProfileDraft.hasChanges(readProfileInputs(document))"), true);
});

test("stale browser tab gets conflict, preserves draft, and discards only after explicit reload confirmation", async () => {
  const f = fixture(); await f.load(); f.open(); f.value("religion", "Stale Local");
  f.remote({ current_phone: "0000000001" });
  await f.save();
  assert.equal(f.stored().religion, "Fixture Religion");
  assert.equal(f.get("editReligion").value, "Stale Local");
  assert.equal(f.get("reloadProfileConflictBtn").hidden, false);
  await f.save(); assert.equal(f.calls.length, 1);
  await f.confirmReload();
  assert.equal(f.get("editReligion").value, "Fixture Religion");
  assert.equal(f.get("editCurrentPhone").value, "0000000001");
  assert.equal(f.get("reloadProfileConflictBtn").hidden, true);
  f.value("religion", "Reviewed New Edit"); await f.save();
  assert.equal(f.stored().religion, "Reviewed New Edit");
  assert.equal(f.stored().current_phone, "0000000001");
});

test("a failed conflict reload keeps the original draft", async () => {
  const f = fixture(); await f.load(); f.open(); f.value("religion", "Local Draft");
  f.remote({ current_phone: "0000000001" }); await f.save(); f.failRefresh();
  await assert.rejects(f.confirmReload(), /โหลดข้อมูลไม่สำเร็จ/);
  assert.equal(f.get("editReligion").value, "Local Draft");
  assert.equal(f.get("reloadProfileConflictBtn").hidden, false);
});

test("out-of-order GET responses cannot replace newer loaded data", async () => {
  const f = fixture(); await f.load();
  const original = f.context.getMyStudentProfile;
  let release;
  const old = await original();
  f.context.getMyStudentProfile = async () => { await new Promise(resolve => { release = resolve; }); return old; };
  const pending = f.load();
  f.remote({ religion: "Newer Data" }); f.context.getMyStudentProfile = original;
  await f.load(); release(); await pending;
  assert.equal(f.run("currentStudentProfile.religion"), "Newer Data");
});

test("client calendar rejects invalid dates/centuries/future and accepts leap dates, null and Bangkok today", async () => {
  for (const date of ["2023-02-30", "2023-02-29", "1900-02-29", "2100-02-29", "2024-04-31", "0000-01-01", "2024-13-01", "2024-00-01", "2024-01-00", "2024-01-32", "2024-2-01", "9999-12-31"]) {
    assert.throws(() => validateProfileBirthDate(date), undefined, date);
  }
  for (const date of [null, "", "2000-02-29", "2024-02-29", "2023-02-28"]) assert.doesNotThrow(() => validateProfileBirthDate(date));
  const midnight = new Date("2026-10-09T17:00:00Z");
  assert.doesNotThrow(() => validateProfileBirthDate("2026-10-10", midnight));
  assert.throws(() => validateProfileBirthDate("2026-10-11", midnight));
  const f = fixture(); await f.load(); f.open(); f.value("birth_date", "2023-02-30");
  await f.save(); assert.equal(f.calls.length, 0);
  f.value("birth_date", "2024-02-29"); await f.save();
  assert.equal(f.calls[0].patch.birth_date, "2024-02-29");
});

test("native date badInput cannot be serialized as an intentional clear", async () => {
  const f = fixture(); await f.load(); f.open();
  f.get("editBirthDate").value = "";
  f.get("editBirthDate").validity = { badInput: true };
  await f.save(); assert.equal(f.calls.length, 0);
  assert.equal(f.stored().birth_date, "2000-02-29");
});
