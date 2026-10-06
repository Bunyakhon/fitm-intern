import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectFixture } from "./helpers/studentCoopProjectFixture.js";

const pdf = { name: "book.pdf", type: "application/pdf", size: 200 };
test("Existing confirmed advisor is locked and topic survives fixture reload", async () => {
  const f = projectFixture(); await f.load();
  assert.equal(f.get("projectAdvisor").disabled, true); assert.equal(f.get("projectAdvisor").value, "assigned-teacher");
  assert.match(f.get("projectAdvisor").textContent, /Assigned Advisor/);
  f.get("projectTitle").value = "  Topic  "; await f.save(); assert.deepEqual(f.calls, [{ topic: "Topic" }]);
  f.get("projectTitle").value = ""; await f.load(); assert.equal(f.get("projectTitle").value, "Topic");
  f.get("projectTitle").value = "Edited topic"; await f.save(); await f.load(); assert.equal(f.get("projectTitle").value, "Edited topic");
});

test("Student without advisor selects and changes pending Teacher; topic remains independent", async () => {
  const names = JSON.parse(readFileSync(new URL("../../backend/test/fixtures/coopFaculty.json", import.meta.url), "utf8"));
  const teachers = names.map(([academic_title, first_name, last_name], i) => ({ id: `teacher-${i}`, academic_title, first_name, last_name }));
  let topic = "";
  const f = projectFixture({ getTeachers: async () => ({ teachers }), getMyCoopProject: async () => ({ topic, confirmed_advisor: null }), saveMyCoopProject: async value => { topic = value; return { topic }; } });
  await f.load(); assert.equal(f.get("projectAdvisor").disabled, false); assert.equal(f.get("projectAdvisor").options.length, 24);
  assert.match(f.get("projectAdvisorStatus").textContent, /ยังไม่ได้เลือก/);
  f.get("projectTitle").value = "ระบบจัดการนักศึกษาสหกิจศึกษา"; await f.save(); assert.equal(topic, "ระบบจัดการนักศึกษาสหกิจศึกษา");
  f.get("projectAdvisor").value = teachers[0].id; await f.get("projectAdvisor").dispatch("change");
  assert.deepEqual(f.calls, [{ teacher_id: teachers[0].id }]); assert.match(f.get("projectAdvisorStatus").textContent, /รออาจารย์ยืนยัน/);
  await f.load(); assert.equal(f.get("projectAdvisor").value, teachers[0].id); assert.equal(f.get("projectTitle").disabled, false);
  f.get("projectTitle").value = "การพัฒนาระบบจัดการนักศึกษาสหกิจศึกษา"; await f.save(); await f.load(); assert.equal(f.get("projectTitle").value, "การพัฒนาระบบจัดการนักศึกษาสหกิจศึกษา");
  f.get("projectAdvisor").value = teachers[1].id; await f.get("projectAdvisor").dispatch("change");
  assert.equal(f.get("projectAdvisor").value, teachers[1].id); assert.match(f.get("projectAdvisorStatus").textContent, new RegExp(teachers[1].first_name));
});

for (const status of ["none", "pending", "rejected", "confirmed"]) test(`Advisor ${status} display and independent topic save/edit/read-back`, async () => {
  let topic = "", confirmed = status === "confirmed" ? { id: "a", name: "Accepted Teacher" } : null;
  const request = { status, teacher: status === "none" ? null : { id: "a", name: "Requested Teacher" }, rejection_reason: status === "rejected" ? "Cannot supervise" : null };
  const f = projectFixture({ getTeachers: async () => ({ teachers: [{ id: "a", first_name: "Requested", last_name: "Teacher" }] }), getMyCoopProject: async () => ({ topic, confirmed_advisor: confirmed }), getMyProjectAdvisorRequest: async () => ({ advisor_request: request, confirmed_advisor: confirmed }), saveMyCoopProject: async value => { topic = value; return { topic }; } });
  await f.load(); assert.equal(f.get("projectAdvisor").disabled, status === "confirmed"); assert.equal(f.get("projectTitle").disabled, false); assert.equal(f.get("saveProjectBtn").disabled, false);
  const label = { none: "ยังไม่ได้เลือก", pending: "รออาจารย์ยืนยัน", rejected: "อาจารย์ปฏิเสธคำขอ", confirmed: "อาจารย์ยืนยันแล้ว" }[status]; assert.match(f.get("projectAdvisorStatus").textContent, new RegExp(label));
  if (status === "rejected") assert.match(f.get("projectAdvisorStatus").textContent, /Cannot supervise/);
  f.get("projectTitle").value = "Topic"; await f.save(); f.get("projectTitle").value = "Edited topic"; await f.save(); await f.load(); assert.equal(f.get("projectTitle").value, "Edited topic");
});

test("advisor load/save failures preserve topic and confirmed race locks selector", async () => {
  const f = projectFixture({ getMyCoopProject: async () => ({ topic: "Existing topic", confirmed_advisor: null }), getMyProjectAdvisorRequest: async () => { throw Error("Migration required"); } });
  await f.load(); assert.equal(f.get("projectAdvisor").disabled, true); assert.equal(f.get("saveProjectBtn").disabled, false); assert.equal(f.get("projectTitle").value, "Existing topic"); assert.match(f.get("projectAdvisorHelp").textContent, /Migration required/);
  f.adapters({ getMyProjectAdvisorRequest: async () => ({ advisor_request: { status: "pending", teacher: { id: "a", name: "Teacher A" } }, confirmed_advisor: null }), getTeachers: async () => ({ teachers: [{ id: "a", first_name: "Teacher", last_name: "A" }, { id: "b", first_name: "Teacher", last_name: "B" }] }), requestMyProjectAdvisor: async () => { f.adapters({ getMyProjectAdvisorRequest: async () => ({ advisor_request: { status: "confirmed", teacher: { id: "a", name: "Teacher A" } }, confirmed_advisor: { id: "a", name: "Teacher A" } }) }); throw Error("Already confirmed"); } });
  await f.load(); f.get("projectAdvisor").value = "b"; await f.get("projectAdvisor").dispatch("change"); assert.equal(f.get("projectAdvisor").value, "a"); assert.equal(f.get("projectAdvisor").disabled, true); assert.equal(f.get("projectTitle").disabled, false); assert.match(f.get("projectAdvisorMessage").textContent, /Already confirmed/);
});

test("pending selection blocks duplicate requests while topic remains saveable; rejected selection can retry", async () => {
  const f = projectFixture({ getMyCoopProject: async () => ({ topic: "", confirmed_advisor: null }), getTeachers: async () => ({ teachers: [{ id: "a", first_name: "Teacher", last_name: "A" }, { id: "b", first_name: "Teacher", last_name: "B" }] }) });
  await f.load(); let finish; const pending = new Promise(resolve => { finish = resolve; }); const original = f.context.requestMyProjectAdvisor;
  let requests = 0; f.adapters({ requestMyProjectAdvisor: async id => { requests++; await pending; return original(id); } });
  f.get("projectAdvisor").value = "a"; const selection = f.get("projectAdvisor").dispatch("change"); await f.run("requestProjectAdvisor()");
  assert.equal(requests, 1); assert.equal(f.get("projectAdvisor").disabled, true); assert.equal(f.get("projectTitle").disabled, false);
  f.get("projectTitle").value = "Topic during selection"; await f.save(); assert.ok(f.calls.some(call => call.topic === "Topic during selection"));
  finish(); await selection; assert.equal(f.get("projectAdvisor").disabled, false);
  f.adapters({ getMyProjectAdvisorRequest: async () => ({ advisor_request: { status: "rejected", teacher: { id: "a", name: "Teacher A" }, rejection_reason: "Capacity" }, confirmed_advisor: null }), requestMyProjectAdvisor: async id => { f.calls.push({ teacher_id: id }); const result = { advisor_request: { status: "pending", teacher: { id, name: "Teacher B" } }, confirmed_advisor: null }; f.adapters({ getMyProjectAdvisorRequest: async () => result }); return result; } });
  await f.load(); f.get("projectAdvisor").value = "b"; await f.get("projectAdvisor").dispatch("change"); assert.match(f.get("projectAdvisorStatus").textContent, /รออาจารย์ยืนยัน/); assert.equal(f.get("projectAdvisor").value, "b");
});

test("project timestamps accept ISO/date-only values and tolerate null/invalid metadata", async () => {
  const f = projectFixture();
  for (const value of ["2026-10-07T00:00:00.000Z", "2026-10-07", null, undefined, "", "not-a-date"]) {
    f.setFiles([{ id: "file", file_type: "coop_project_book", original_name: "book.pdf", updated_at: value }]); await f.load();
    assert.doesNotMatch(f.get("projectBookCurrent").textContent, /Invalid time value|Invalid Date/); assert.match(f.get("projectBookCurrent").textContent, /book.pdf/);
    const date = f.get("projectBookCurrent").querySelector(".project-file-date").textContent;
    if (!value || value === "not-a-date") assert.equal(date, "ไม่ระบุวันที่");
    else assert.match(date, /^อัปเดต /);
  }
  assert.equal(f.run("formatDate(null)"), "-"); assert.equal(f.run("formatDate('not-a-date')"), "-"); assert.notEqual(f.run("formatDate('2026-10-07T00:00:00.000Z')"), "-");
});

test("both current-file cards preserve long filenames as text and accessible Blob previews", async () => {
  const f = projectFixture();
  const name = 'รายงานโครงการ_' + 'ชื่อไฟล์ยาว'.repeat(40) + '<script>alert(1)</script>.pdf';
  f.setFiles([
    { id: "book", file_type: "coop_project_book", original_name: name, updated_at: "2026-10-07T00:00:00.000Z" },
    { id: "poster", file_type: "coop_poster", original_name: name, updated_at: null },
  ]);
  await f.load();
  for (const id of ["projectBookCurrent", "posterCurrent"]) {
    const current = f.get(id);
    assert.equal(current.querySelector(".project-file-name").textContent, name);
    assert.equal(current.querySelector("script"), null);
    assert.equal(current.querySelector("button").getAttribute("aria-label"), `เปิดดู ${name}`);
    await f.preview(id);
    assert.match(f.tabs.at(-1).url, /^blob:/);
    f.closeTab();
  }
  assert.deepEqual(f.calls.filter(call => call.preview), [{ preview: "book" }, { preview: "poster" }]);
});
test("23 faculty names load without Staff choices or hardcoded IDs", async () => {
  const names = JSON.parse(readFileSync(new URL("../../backend/test/fixtures/coopFaculty.json", import.meta.url), "utf8"));
  const f = projectFixture({ getTeachers: async () => ({ teachers: names.map(([academic_title, first_name, last_name], index) => ({ id: "fixture-" + index, academic_title, first_name, last_name })) }), getMyCoopProject: async () => ({ topic: "", coop_advisor_teacher: null }) });
  await f.load(); assert.equal(f.get("projectAdvisor").options.length, 24);
  for (const [title, first, last] of names) assert.ok(f.get("projectAdvisor").options.some(option => option.textContent === `${title} ${first} ${last}`));
  assert.doesNotMatch(f.get("projectAdvisor").textContent, /ลัดดา|อุไรวรรณ/);
});
test("directory failure preserves assigned advisor and topic remains saveable", async () => {
  const f = projectFixture({ getTeachers: async () => { throw Error("Directory failed"); } }); await f.load();
  assert.equal(f.get("projectAdvisor").value, "assigned-teacher"); assert.equal(f.get("projectAdvisor").disabled, true);
  assert.match(f.get("projectAdvisorHelp").textContent, /ไม่สำเร็จ/);
  f.get("projectTitle").value = "Topic without directory"; await f.save(); assert.equal(f.calls.length, 1);
});
test("blank/long topic rejected, failed initial read disables save, save failure restores controls", async () => {
  const f = projectFixture(); await f.load();
  for (const topic of [" ", "x".repeat(501)]) { f.get("projectTitle").value = topic; await f.save(); }
  assert.equal(f.calls.length, 0);
  f.adapters({ saveMyCoopProject: async () => { throw Error("Save failed"); } });
  f.get("projectTitle").value = "Topic"; await f.save(); assert.match(f.get("projectMessage").textContent, /Save failed/);
  assert.equal(f.get("saveProjectBtn").disabled, false); assert.equal(f.get("projectTitle").disabled, false);
  f.adapters({ getMyCoopProject: async () => { throw Error("Load failed"); } }); await f.load(); assert.equal(f.get("saveProjectBtn").disabled, true);
});
test("Book/Poster uploads refresh names, loading blocks duplicates and inputs reset", async () => {
  const f = projectFixture(); await f.load();
  let finish; const pending = new Promise(resolve => { finish = resolve; });
  f.adapters({ uploadMyCoopProjectFile: async category => { assert.equal(f.get("uploadProjectBtn").disabled, true); assert.equal(f.get("projectBookFile").disabled, true); await pending; f.calls.push({ category }); } });
  f.select("projectBookFile", pdf); f.select("posterFile", { name: "poster.png", type: "image/png", size: 100 });
  f.setFiles([{ id: "book", file_type: "coop_project_book", original_name: "book.pdf" }, { id: "poster", file_type: "coop_poster", original_name: "poster.png" }]);
  const upload = f.upload(); await f.run("uploadCoopProjectFiles()"); finish(); await upload;
  assert.equal(f.calls.length, 2); assert.match(f.get("projectBookCurrent").textContent, /book.pdf.*เปิดดู/); assert.match(f.get("posterCurrent").textContent, /poster.png/);
  assert.equal(f.get("uploadProjectBtn").disabled, false); assert.equal(f.get("projectBookFile").value, "");
});
test("unsupported type/size/name rejected before upload; partial success remains visible", async () => {
  const f = projectFixture(); await f.load();
  for (const file of [{ ...pdf, name: "book.exe" }, { ...pdf, size: 11 * 1024 * 1024 }, { ...pdf, type: "text/html" }, { ...pdf, name: "../book.pdf" }]) {
    f.select("projectBookFile", file); await f.upload();
  }
  assert.equal(f.calls.length, 0);
  f.select("projectBookFile", pdf); f.select("posterFile", { name: "poster.jpg", type: "image/jpeg", size: 100 });
  f.adapters({ uploadMyCoopProjectFile: async category => { if (category === "poster") throw Error("Poster failed; Book saved"); f.setFiles([{ id: "saved", file_type: "coop_project_book", original_name: "book.pdf" }]); } });
  await f.upload(); assert.match(f.get("projectBookCurrent").textContent, /book.pdf/); assert.match(f.get("projectUploadMessage").textContent, /Poster failed/); assert.equal(f.get("uploadProjectBtn").disabled, false);
});
test("preview fetches Blob and opens reserved new tab; URL lives until tab closes", async () => {
  const f = projectFixture(); await f.load(); f.select("projectBookFile", pdf); await f.upload(); await f.preview();
  assert.deepEqual(f.tabs[0].args, ["", "_blank"]); assert.equal(f.tabs[0].opener, null); assert.match(f.tabs[0].url, /^blob:/);
  assert.equal(f.calls.at(-1).preview, "project-book"); assert.equal(f.revoked.length, 0);
  f.closeTab(); assert.deepEqual(f.revoked, [f.tabs[0].url]);
  await f.preview(); f.pagehide(); assert.equal(f.revoked.length, 2);
});
test("preview auth failure, invalid Blob and popup blocker show errors without orphan tabs", async () => {
  const f = projectFixture(); await f.load(); f.select("projectBookFile", pdf); await f.upload();
  f.adapters({ previewMyCoopProjectFile: async () => { throw Error("Unauthorized"); } }); await f.preview();
  assert.equal(f.tabs[0].closed, true); assert.match(f.get("projectUploadMessage").textContent, /Unauthorized/);
  f.adapters({ previewMyCoopProjectFile: async () => new Blob(["HTML"], { type: "text/html" }) }); await f.preview(); assert.equal(f.tabs[1].closed, true);
  f.context.window.open = () => null; await f.preview(); assert.match(f.get("projectUploadMessage").textContent, /อนุญาต/);
});
