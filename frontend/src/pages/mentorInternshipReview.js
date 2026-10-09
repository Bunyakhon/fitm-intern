import { getMentorWeeks, getMentorWeek, reviewMentorWeek } from "../api/internshipLogs.api.js";
import { showToast, showConfirmModal } from "../ui/feedback.js";
import { labels, displayDate, renderEntries, renderHistory } from "./internshipLogView.js";
export function initMentorInternshipReview(token) {
  const $ = id => document.getElementById(id); let current = null, busy = false, sequence = 0;
  $("mentorVerificationForm").hidden = true; $("mentorContent").hidden = true; $("mentorReview").hidden = false;
  $("pageTitle").textContent = "ตรวจบันทึกฝึกงานประจำสัปดาห์";
  document.querySelector(".mentor-verification-header > p:last-child").textContent = "ตรวจบันทึกทุกวันในสัปดาห์ที่นักศึกษาส่ง พร้อมให้ข้อเสนอแนะหรือขอแก้ไขทั้งสัปดาห์";
  document.querySelector(".security-note").textContent = "โปรดเก็บลิงก์ตรวจบันทึกนี้เป็นความลับ ลิงก์มีอายุ 7 วัน";
  const state = (message, type = "success") => { $("verificationState").className = `verification-state is-${type}`; $("verificationStateMessage").textContent = message; };
  function error(error) {
    state(error.message, "error"); showToast(error.message, "error");
    if ([401, 403, 410].includes(error.status)) { token = null; current = null; $("mentorWeekList").replaceChildren(); $("mentorReviewDetail").hidden = true; }
  }
  async function load() {
    if (!token || busy) return; const request = ++sequence; current = null; $("mentorReviewDetail").hidden = true; $("mentorWeekList").replaceChildren(); state("กำลังโหลดสัปดาห์...", "loading");
    try {
      const result = await getMentorWeeks(token); if (request !== sequence) return;
      $("mentorReviewStudent").textContent = `${result.student.name} · ${result.student.code}`;
      $("mentorReviewName").textContent = result.mentor.name;
      state(result.weeks.length ? "เลือกสัปดาห์เพื่อตรวจทั้งชุด" : "ยังไม่มีสัปดาห์ที่นักศึกษาส่งให้ตรวจ");
      for (const week of result.weeks) {
        const button = document.createElement("button"); button.type = "button"; button.className = "button button-secondary"; button.textContent = `${displayDate(week.week_start)} – ${displayDate(week.week_end)} · ${labels[week.status]}`;
        button.dataset.weekId = week.id; button.addEventListener("click", () => detail(week.id)); $("mentorWeekList").append(button);
      }
    } catch (err) { error(err); }
  }
  async function detail(id) {
    if (busy || !token) return; const request = ++sequence; current = null; $("mentorReviewDetail").hidden = true; state("กำลังโหลดรายละเอียด...", "loading");
    try {
      const result = await getMentorWeek(token, id); if (request !== sequence) return; current = result.submission;
      $("mentorReviewWeekTitle").textContent = `${displayDate(current.week_start)} – ${displayDate(current.week_end)} · ${labels[current.status]}`;
      renderEntries($("mentorReviewEntries"), current.snapshot.logs); renderHistory($("mentorReviewHistory"), result.history);
      $("mentorWeeklyFeedback").value = ""; $("mentorReviewActions").hidden = current.status !== "submitted"; $("mentorReviewDetail").hidden = false; state("แสดงบันทึกทุกวันในสัปดาห์ที่ส่ง");
    } catch (err) { error(err); }
  }
  function review(action) {
    if (!current || busy || !token || current.status !== "submitted") return;
    const feedback = $("mentorWeeklyFeedback").value.trim(), target = current;
    if (action === "revision_requested" && !feedback) { state("กรุณาระบุข้อเสนอแนะที่ต้องแก้ไข"); $("mentorWeeklyFeedback").focus(); return; }
    showConfirmModal({ title: action === "reviewed" ? "ยืนยันตรวจบันทึกทั้งสัปดาห์" : "ขอแก้ไขบันทึกประจำสัปดาห์", message: "การดำเนินการจะถูกเก็บในประวัติพร้อมชื่อผู้ดูแลและวันที่", confirmLabel: "ยืนยัน", onConfirm: async () => {
      if (busy || current !== target) return; busy = true; $("mentorReviewActions").hidden = true;
      try { await reviewMentorWeek(token, target.id, { version: target.version, action, feedback }); showToast("บันทึกผลตรวจประจำสัปดาห์แล้ว", "success"); }
      catch (err) { error(err); } finally { busy = false; if (token) { await load(); await detail(target.id); } }
    } });
  }
  $("mentorReviewReload").addEventListener("click", load);
  $("mentorMarkReviewed").addEventListener("click", () => review("reviewed")); $("mentorRequestRevision").addEventListener("click", () => review("revision_requested"));
  load();
}
