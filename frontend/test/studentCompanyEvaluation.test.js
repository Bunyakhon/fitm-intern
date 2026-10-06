import test from "node:test";
import assert from "node:assert/strict";
import { evaluationFixture } from "./helpers/studentCompanyEvaluationFixture.js";

test("all eight context labels consume backend values and safe Thai dates", async () => {
  const f = evaluationFixture({ getEvaluation: async () => ({
    student: { name: " นักศึกษา จริง " }, mentor: { name: "พี่เลี้ยง จริง" },
    display: { student_id: "67000000001-1", major: "INE", company_name: "บริษัทจริง", mentor_position: "Software Engineer", work_start_date: "2026-06-01", work_end_date: "2026-09-30", evaluation_date: "2026-10-07T03:04:05Z" }, evaluation: null,
  }) });
  assert.equal(await f.load(), true);
  assert.deepEqual(Array.from(f.get("evaluationStudentName").closest("dl").querySelectorAll("dt"), label => label.textContent).sort(), ["ชื่อนักศึกษา", "รหัสนักศึกษา", "สาขาวิชา", "ชื่อสถานประกอบการ", "ชื่อพี่เลี้ยง", "ตำแหน่งพี่เลี้ยง", "ช่วงเวลาปฏิบัติงาน", "วันที่ประเมิน"].sort());
  for (const [id, value] of Object.entries({ evaluationStudentName: "นักศึกษา จริง", evaluationStudentId: "67000000001-1", evaluationMajor: "INE", evaluationCompany: "บริษัทจริง", evaluationMentorName: "พี่เลี้ยง จริง", evaluationMentorPosition: "Software Engineer", evaluationWorkPeriod: "1 มิ.ย. 2569 - 30 ก.ย. 2569", evaluationDate: "7 ต.ค. 2569" })) assert.equal(f.get(id).textContent, value);
  await f.scores([8, 9, 8, 9, 8]); assert.equal(f.get("evaluationTotal").textContent, "42 / 50");
});

test("missing context and incomplete, invalid or reversed dates render a dash", async () => {
  const display = { student_id: null, major: " ", company_name: undefined, mentor_position: "", work_start_date: null, work_end_date: null, evaluation_date: null };
  const f = evaluationFixture({ getEvaluation: async () => ({ student: { name: " " }, mentor: null, display, evaluation: null }) });
  await f.load();
  for (const id of ["evaluationStudentName", "evaluationStudentId", "evaluationMajor", "evaluationCompany", "evaluationMentorName", "evaluationMentorPosition", "evaluationWorkPeriod", "evaluationDate"]) assert.equal(f.get(id).textContent, "-");
  for (const [start, end, date] of [["2026-06-01", null, "invalid"], ["2026-02-31", "2026-09-30", "2026-02-31"], ["2026-02-31", "2026-09-30", "2026-02-31T03:00:00Z"], ["2026-09-30", "2026-06-01", 0], ["invalid", "2026-09-30", ""]]) {
    Object.assign(display, { work_start_date: start, work_end_date: end, evaluation_date: date }); await f.load();
    assert.equal(f.get("evaluationWorkPeriod").textContent, "-"); assert.equal(f.get("evaluationDate").textContent, "-");
    assert.doesNotMatch(f.get("evaluationDate").textContent, /Invalid/);
  }
});

test("the last saved evaluation date changes on backend refresh while scores still reload", async () => {
  const f = evaluationFixture(); await f.load(); assert.equal(f.get("evaluationDate").textContent, "-");
  await f.scores([8, 9, 8, 9, 8]); await f.save();
  const evaluation = { q1_score: 8, q2_score: 9, q3_score: 8, q4_score: 9, q5_score: 8, comment: "Saved" };
  const display = { evaluation_date: "2026-10-07T03:00:00Z" };
  f.adapters({ getEvaluation: async () => ({ student: { name: "Student" }, mentor: null, display, evaluation }) });
  await f.load(); assert.equal(f.get("evaluationDate").textContent, "7 ต.ค. 2569"); assert.equal(f.get("evaluationQ1").value, "8");
  display.evaluation_date = "2026-10-08T03:00:00Z"; await f.load(); assert.equal(f.get("evaluationDate").textContent, "8 ต.ค. 2569");
  assert.equal(f.get("evaluationComment").value, "Saved");
});

test("authenticated context names, pending/no Mentor and unavailable information render as text", async () => {
  const f = evaluationFixture(); await f.load();
  assert.equal(f.get("evaluationStudentName").textContent, "นักศึกษา ทดสอบ");
  assert.equal(f.get("evaluationMentorName").textContent, "พี่เลี้ยง ทดสอบ");
  for (const id of ["evaluationStudentId", "evaluationMajor", "evaluationCompany", "evaluationMentorPosition", "evaluationWorkPeriod", "evaluationDate"]) assert.equal(f.get(id).textContent, "-");
  f.adapters({ getEvaluation: async () => ({ student: { name: "<script>name</script>" }, mentor: null, display: {}, evaluation: null }) });
  await f.load(); assert.equal(f.get("evaluationMentorName").textContent, "-");
  assert.equal(f.get("evaluationStudentName").querySelector("script"), null);
  assert.equal(f.get("evaluationStudentName").textContent, "<script>name</script>");
});

test("five existing Thai questions have labelled 1–10 selectors and responsive card structure", async () => {
  const f = evaluationFixture(); await f.load();
  const questions = f.get("companyEvaluationForm").querySelectorAll(".evaluation-question");
  assert.equal(questions.length, 5);
  assert.equal(f.get("companyEvaluationForm").querySelectorAll("fieldset").length, 2);
  assert.match(questions[0].textContent, /ความเข้าใจที่ได้รับจากงานสหกิจศึกษา/);
  assert.match(questions[4].textContent, /มีการปรับปรุงแผนปฏิบัติงานเมื่อเกิดปัญหา/);
  for (let n = 1; n <= 5; n++) {
    const input = f.get(`evaluationQ${n}`);
    assert.deepEqual(Array.from(input.options, option => option.value), ["", ...Array.from({ length: 10 }, (_, i) => String(i + 1))]);
    assert.ok(f.document.querySelector(`label[for="evaluationQ${n}"]`));
    assert.equal(input.getAttribute("required"), "");
    assert.ok(input.closest(".evaluation-score-control"));
  }
  assert.ok(f.get("evaluationStudentName").closest(".evaluation-info-grid"));
});

test("live partial/full totals and averages, trimmed comment, saved values and edits read back", async () => {
  const f = evaluationFixture(); await f.load(); await f.scores([8]);
  assert.equal(f.get("evaluationTotal").textContent, "8 / 50");
  assert.equal(f.get("evaluationAverage").textContent, "1.60 / 10");
  await f.scores([8, 9, 8, 9, 8]); f.get("evaluationComment").value = "  ข้อเสนอแนะ\nเพิ่มเติม  ";
  assert.equal(f.get("evaluationTotal").textContent, "42 / 50");
  assert.equal(f.get("evaluationAverage").textContent, "8.40 / 10");
  await f.save(); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].comment, "ข้อเสนอแนะ\nเพิ่มเติม");
  assert.deepEqual(Object.keys(f.calls[0]).sort(), ["comment", "q1_score", "q2_score", "q3_score", "q4_score", "q5_score"]);
  assert.equal(f.toasts.at(-1).type, "success");
  f.get("evaluationQ1").value = ""; f.get("evaluationComment").value = ""; await f.load();
  assert.equal(f.get("evaluationQ1").value, "8"); assert.equal(f.get("evaluationComment").value, "ข้อเสนอแนะ\nเพิ่มเติม");
  await f.scores([10, 10, 10, 10, 10]); await f.save(); await f.load();
  assert.equal(f.get("evaluationTotal").textContent, "50 / 50"); assert.equal(f.get("evaluationAverage").textContent, "10.00 / 10");
});

test("missing score and invalid inputs never submit; overlong comments rejected", async () => {
  const f = evaluationFixture(); await f.load(); await f.save(); assert.equal(f.calls.length, 0);
  assert.match(f.get("evaluationMessage").textContent, /ครบทั้ง 5/);
  assert.equal(f.document.activeElement, f.get("evaluationQ1"));
  await f.scores([1, 2, 3, 4, 5]);
  for (const value of ["0", "11", "-1", "1.5", "text", "1.0"]) { f.get("evaluationQ1").value = value; await f.save(); assert.equal(f.calls.length, 0); }
  await f.scores([1, 2, 3, 4, 5]); f.get("evaluationComment").value = "ก".repeat(2001); await f.save(); assert.equal(f.calls.length, 0);
});

test("initial load/schema failures disable saving, malformed scores cannot overwrite an evaluation", async () => {
  const f = evaluationFixture({ getEvaluation: async () => { throw Error("Migration 015 required"); } });
  await f.load(); assert.equal(f.get("saveEvaluationBtn").disabled, true); assert.equal(f.get("evaluationQ1").disabled, true);
  assert.match(f.get("evaluationMessage").textContent, /Migration 015/); await f.save(); assert.equal(f.calls.length, 0);
  f.adapters({ getEvaluation: async () => ({ student: { name: "Student" }, display: {}, evaluation: { q1_score: 9 } }) });
  await f.load(); assert.equal(f.get("saveEvaluationBtn").disabled, true); assert.match(f.get("evaluationMessage").textContent, /ไม่ครบถ้วน/);
});

test("double submit and concurrent menu load do not duplicate writes or overwrite pending edits", async () => {
  const f = evaluationFixture(); await f.load(); await f.scores([1, 2, 3, 4, 5]);
  let finish; const gate = new Promise(resolve => { finish = resolve; }); let writes = 0;
  f.adapters({ saveEvaluation: async body => { writes++; await gate; return { student: { name: "Student" }, display: {}, evaluation: { ...body } }; } });
  const pending = f.save(); assert.equal(f.get("saveEvaluationBtn").disabled, true); assert.equal(f.get("evaluationQ1").disabled, true);
  await f.save(); assert.equal(await f.load(), false); assert.equal(writes, 1); finish(); await pending;
  assert.equal(f.get("saveEvaluationBtn").disabled, false);
});

test("save error uses real shared toast/inline feedback and preserves the Student's input", async () => {
  const f = evaluationFixture({ saveEvaluation: async () => { throw Error("Server unavailable"); } });
  await f.load(); await f.scores([2, 3, 4, 5, 6]); f.get("evaluationComment").value = "Keep this comment"; await f.save();
  assert.equal(f.get("evaluationQ1").value, "2"); assert.equal(f.get("evaluationComment").value, "Keep this comment");
  assert.equal(f.toasts.at(-1).type, "error"); assert.match(f.get("appFeedback").textContent, /Server unavailable/);
  assert.equal(f.get("saveEvaluationBtn").disabled, false);
});

test("a committed save with refresh failure reports saved status and retains server values", async () => {
  const f = evaluationFixture(); await f.load(); await f.scores([10, 9, 8, 7, 6]);
  f.adapters({ saveEvaluation: async body => {
    f.adapters({ getEvaluation: async () => { throw Error("Refresh failed"); } });
    return { student: { name: "Student" }, mentor: null, display: {}, evaluation: { ...body, comment: "Saved comment" } };
  } });
  await f.save(); assert.match(f.get("evaluationMessage").textContent, /บันทึกแล้ว/);
  assert.equal(f.get("evaluationComment").value, "Saved comment"); assert.equal(f.toasts.at(-1).type, "warning");
});
