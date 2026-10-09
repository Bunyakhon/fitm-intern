import * as api from "../api/supervision.api.js";
import { showToast, showConfirmModal, setButtonLoading } from "../ui/feedback.js";
import { bangkokInputs, element, renderAppointment, renderAppointmentHistory } from "./supervisionView.js";
import { mountSupervisionResult } from "./supervisionResult.js";
export function mountTeacherSupervision({ document, storage, services = api, confirm = showConfirmModal, toast = showToast, loading = setButtonLoading, resultMount = typeof mountSupervisionResult === "function" ? mountSupervisionResult : null }) {
  const $ = id => document.getElementById(id), container = $("supervisionStudents");
  let current = null, studentId = null, offset = 0, next = false, busy = false, sequence = 0, modal = false;
  const resultWidgets = [];
  const clearResults = () => { resultWidgets.splice(0).forEach(widget => widget.dispose()); };
  const say = (message, type = "info") => { $("supervisionMessage").textContent = message; $("supervisionMessage").dataset.type = type; };
  function controls() {
    const disabled = busy || modal || !storage.getItem("teacherToken");
    for (const id of ["supervisionRefresh", "supervisionSave", "supervisionStudentSelect"]) $(id).disabled = disabled;
    $("supervisionPrevious").disabled = disabled || offset === 0; $("supervisionNext").disabled = disabled || !next;
    $("supervisionFieldset").disabled = disabled; container.querySelectorAll("button").forEach(b => { b.disabled = disabled; });
  }
  function error(err) {
    say(err.message, "error");
    if ([401, 403].includes(err.status)) { clearResults(); storage.removeItem("teacherToken"); current = null; studentId = null; ++sequence; container.replaceChildren(); $("supervisionDetail").hidden = true; $("supervisionStudentSelect").replaceChildren(); }
  }
  function edit(row = null) {
    $("supervisionForm").reset(); $("supervisionMentorChecked").checked = false;
    $("supervisionVisit").value = String(row?.visit_number || 1); $("supervisionVisit").disabled = !!row;
    $("supervisionVersion").value = row ? String(row.version) : "";
    $("supervisionReasonGroup").hidden = !row; $("supervisionReason").required = !!row;
    if (row) {
      const date = bangkokInputs(row.scheduled_at); $("supervisionDate").value = date.date; $("supervisionTime").value = date.time; $("supervisionNotes").value = row.notes;
      if (row.snapshot.is_substitute) { $("supervisionSubstitute").checked = true; for (const key of ["email", "first_name", "last_name", "position", "reason"]) $(`substitute_${key}`).value = row.snapshot.attending_mentor[key]; }
    }
    substitute(); controls();
  }
  function substitute() {
    const enabled = $("supervisionSubstitute").checked; $("supervisionSubstituteFields").hidden = !enabled;
    for (const key of ["email", "first_name", "last_name", "position", "reason"]) { $(`substitute_${key}`).required = enabled; $(`substitute_${key}`).disabled = !enabled; }
  }
  async function detail(id) {
    if (busy || !storage.getItem("teacherToken")) return false;
    clearResults(); busy = true; const ticket = ++sequence; current = null; studentId = id; $("supervisionDetail").hidden = true; controls(); say("กำลังโหลดข้อมูลนัดหมาย...");
    try {
      const result = await services.getSupervisionStudent(id); if (ticket !== sequence || !storage.getItem("teacherToken")) return false;
      current = result; $("supervisionStudentName").textContent = `${result.student.name} · ${result.student.code}`;
      const mentor = result.mentor;
      $("supervisionMentorInfo").textContent = mentor ? `พี่เลี้ยงเดิม: ${mentor.first_name} ${mentor.last_name} · ${mentor.position} · ${mentor.email} · ${mentor.status === "verified" ? "ยืนยันข้อมูลแล้ว" : "ยังไม่ยืนยันข้อมูล"}` : "ยังไม่มีข้อมูลพี่เลี้ยง";
      $("supervisionPlacementInfo").textContent = result.requests.length === 1 ? `${result.requests[0].company_name} · ช่วงฝึกงาน ${result.requests[0].work_start_date || "-"} – ${result.requests[0].work_end_date || "-"}` : "ต้องมีคำร้องที่อนุมัติเพียงรายการเดียวก่อนสร้างนัด";
      $("supervisionAppointments").replaceChildren();
      for (const row of result.appointments) {
        const card = element(document, "article", "", "supervision-card"), body = document.createElement("div"); renderAppointment(body, row); card.append(body);
        if (new Date(row.scheduled_at) > new Date()) {
          const actions = element(document, "div", "", "supervision-actions");
          const button = element(document, "button", "แก้ไข / เลื่อนนัด", "teacher-button"); button.type = "button"; button.addEventListener("click", () => { if (!busy && !modal) edit(row); }); actions.append(button);
          if (row.status === "pending_confirmation") { const resend = element(document, "button", "ส่งลิงก์ยืนยันใหม่", "teacher-button"); resend.type = "button"; resend.addEventListener("click", () => sendAgain(row)); actions.append(resend); }
          card.append(actions);
        }
        $("supervisionAppointments").append(card);
        if (resultMount) resultWidgets.push(resultMount({ document, container: card, appointment: row, studentId: id, services, confirm, toast, loading, onAuthError: error, onSaved: () => { const button = card.querySelector('.supervision-actions button'); if (button) button.disabled = true; } }));
      }
      renderAppointmentHistory($("supervisionHistory"), result.history); edit(); $("supervisionDetail").hidden = false; say("ตรวจสอบข้อมูลพี่เลี้ยงก่อนสร้างหรือแก้ไขนัด"); return true;
    } catch (err) { error(err); return false; }
    finally { busy = false; controls(); }
  }
  async function refresh() {
    if (busy || modal || !storage.getItem("teacherToken")) return;
    clearResults(); busy = true; const ticket = ++sequence; current = null; studentId = null; $("supervisionDetail").hidden = true; container.replaceChildren(); controls(); say("กำลังโหลดนักศึกษาในความดูแล...");
    try {
      let result = await services.listSupervisionStudents(offset);
      if (!result.students.length && offset) { offset = 0; result = await services.listSupervisionStudents(offset); }
      if (ticket !== sequence || !storage.getItem("teacherToken")) return;
      next = result.students.length > 25; const select = $("supervisionStudentSelect"); select.replaceChildren();
      const blank = element(document, "option", "เลือกนักศึกษาในความดูแล"); blank.value = ""; select.append(blank);
      for (const row of result.students.slice(0, 25)) { const option = element(document, "option", `${row.first_name} ${row.last_name} · ${row.student_id}`); option.value = row.id; select.append(option); }
      say(result.students.length ? "เลือกนักศึกษาเพื่อนัดนิเทศครั้งที่ 1 หรือ 2" : "ยังไม่มีนักศึกษาที่คุณเป็นอาจารย์นิเทศ / ที่ปรึกษาโครงการ");
    } catch (err) { error(err); } finally { busy = false; controls(); }
  }
  function mutation(title, message, operation) {
    if (busy || modal || !current || !storage.getItem("teacherToken")) return;
    modal = true; controls(); const target = studentId;
    confirm({ title, message, confirmLabel: "ยืนยัน", onClose: () => { modal = false; controls(); }, onConfirm: async () => {
      if (busy || target !== studentId || !storage.getItem("teacherToken")) return;
      busy = true; controls(); loading($("supervisionSave"), true, "กำลังบันทึก...");
      let result, failure;
      try { result = await operation(); } catch (err) { failure = err; error(err); }
      finally { busy = false; loading($("supervisionSave"), false, "กำลังบันทึก...", "บันทึกนัดหมาย"); }
      if (storage.getItem("teacherToken")) {
        const reloaded = await detail(target);
        const text = failure ? failure.message : `${result.appointment ? "บันทึกนัดแล้ว" : "ดำเนินการส่งลิงก์แล้ว"}${result.email_sent ? " ส่งอีเมลแล้ว" : " แต่ส่งอีเมลไม่สำเร็จ กรุณาส่งลิงก์ใหม่"}${!reloaded ? " และโหลดข้อมูลล่าสุดไม่สำเร็จ กรุณารีเฟรช" : ""}`;
        say(text, failure || !result?.email_sent || !reloaded ? "error" : "success"); toast(text, failure || !result?.email_sent || !reloaded ? "error" : "success");
      }
      controls();
    } });
  }
  function sendAgain(row) { mutation("ส่งลิงก์ยืนยันใหม่", "ลิงก์เดิมของนัดนี้จะใช้ไม่ได้", () => services.resendSupervisionLink(studentId, row.id, row.version)); }
  $("supervisionForm").addEventListener("submit", event => {
    event.preventDefault(); if (!current || busy || modal || !$("supervisionForm").reportValidity()) return;
    if (!current.mentor?.verified_at || current.mentor.status !== "verified" || !$("supervisionMentorChecked").checked) { say("กรุณาตรวจสอบข้อมูลพี่เลี้ยงที่ยืนยันแล้วก่อนนัดหมาย", "error"); return; }
    const version = $("supervisionVersion").value, body = { date: $("supervisionDate").value, time: $("supervisionTime").value, notes: $("supervisionNotes").value, mentor_verified_at: current.mentor.verified_at };
    if (version) { body.version = Number(version); body.reason = $("supervisionReason").value; }
    if ($("supervisionSubstitute").checked) body.substitute = Object.fromEntries(["email", "first_name", "last_name", "position", "reason"].map(key => [key, $(`substitute_${key}`).value]));
    const visit = Number($("supervisionVisit").value), target = studentId;
    mutation(version ? "แก้ไข / เลื่อนนัดนิเทศ" : "สร้างนัดนิเทศ", "นัดฉบับนี้จะรอพี่เลี้ยงยืนยันข้อมูลและนัดหมาย ผ่านลิงก์ที่ส่งไปยังอีเมลของผู้เข้าร่วม", () => services.saveSupervision(target, visit, body, !!version));
  });
  $("supervisionSubstitute").addEventListener("change", substitute);
  $("supervisionNew").addEventListener("click", () => { if (!busy && !modal) edit(); });
  $("supervisionRefresh").addEventListener("click", refresh);
  $("supervisionStudentSelect").addEventListener("change", event => { if (event.target.value) detail(event.target.value); else { ++sequence; current = null; studentId = null; $("supervisionDetail").hidden = true; } });
  $("supervisionPrevious").addEventListener("click", () => { if (!busy && !modal && offset) { offset -= 25; refresh(); } });
  $("supervisionNext").addEventListener("click", () => { if (!busy && !modal && next) { offset += 25; refresh(); } });
  $("teacherLogout").addEventListener("click", () => { clearResults(); ++sequence; current = null; studentId = null; $("supervisionDetail").hidden = true; container.replaceChildren(); });
  const ready = refresh(); return { ready, refresh, detail };
}
if (typeof document !== "undefined") mountTeacherSupervision({ document, storage: sessionStorage });
