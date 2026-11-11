import * as api from "../api/supervision.api.js";
import { roleSessionStorage } from "../auth/roleAuthStorage.js";
import { showToast, showConfirmModal, setButtonLoading } from "../ui/feedback.js";
import { bangkokInputs, element, renderAppointment, renderAppointmentHistory } from "./supervisionView.js";
import { mountSupervisionResult } from "./supervisionResult.js";
import { createTeacherListPresentation } from "./teacherListPresentation.js";
export function mountTeacherSupervision({ document, storage, services = api, confirm = showConfirmModal, toast = showToast, loading = setButtonLoading, resultMount = typeof mountSupervisionResult === "function" ? mountSupervisionResult : null }) {
  const $ = id => document.getElementById(id), container = $("supervisionStudents");
  const presentation = createTeacherListPresentation({ document, list: container, message: $("supervisionMessage"), onRetry: () => refresh({ preserveDetail: true }), picker: $("teacherSupervisionPicker"), emptyTitle: "ยังไม่มีนักศึกษาในความดูแล", emptyDescription: "นักศึกษาที่คุณได้รับสิทธิ์เป็นอาจารย์นิเทศหรือที่ปรึกษาโครงการจะแสดงที่นี่" });
  let current = null, studentId = null, offset = 0, next = false, busy = false, sequence = 0, modal = false;
  const resultWidgets = [];
  const studentCards = new Map();
  let scheduleDirty = false;
  const clearResults = () => { resultWidgets.splice(0).forEach(widget => widget.dispose()); };
  const say = (message, type = "info") => { $("supervisionMessage").textContent = message; $("supervisionMessage").dataset.type = type; };
  function controls() {
    const disabled = busy || modal || !storage.getItem("teacherToken");
    for (const id of ["supervisionSave", "supervisionStudentSelect"]) $(id).disabled = disabled;
    $("supervisionPrevious").disabled = disabled || offset === 0; $("supervisionNext").disabled = disabled || !next;
    $("supervisionFieldset").disabled = disabled; container.querySelectorAll("button").forEach(b => { b.disabled = disabled; });
  }
  function error(err) {
    say(err.message, "error");
    if ([401, 403].includes(err.status)) { clearResults(); studentCards.clear(); storage.removeItem("teacherToken"); current = null; studentId = null; ++sequence; container.replaceChildren(); $("supervisionDetail").hidden = true; $("supervisionStudentSelect").replaceChildren(); }
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
    scheduleDirty = !!row; substitute(); controls();
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
      $("supervisionStudentSelect").value = id;
      for (const [key, card] of studentCards) card.root.classList.toggle("is-selected", key === id);
      const selectedCard = studentCards.get(id);
      if (selectedCard) selectedCard.company.textContent = result.requests.length === 1 ? result.requests[0].company_name : "ยังไม่มีสถานประกอบการที่ยืนยันได้เพียงรายการเดียว";
      const mentor = result.mentor;
      $("supervisionMentorInfo").textContent = mentor ? `พี่เลี้ยงเดิม: ${mentor.first_name} ${mentor.last_name} · ${mentor.position} · ${mentor.email} · ${mentor.status === "verified" ? "ยืนยันข้อมูลแล้ว" : "ยังไม่ยืนยันข้อมูล"}` : "ยังไม่มีข้อมูลพี่เลี้ยง";
      $("supervisionPlacementInfo").textContent = result.requests.length === 1 ? `${result.requests[0].company_name} · ช่วงฝึกงาน ${result.requests[0].work_start_date || "-"} – ${result.requests[0].work_end_date || "-"}` : "ต้องมีคำร้องที่อนุมัติเพียงรายการเดียวก่อนสร้างนัด";
      $("supervisionAppointments").replaceChildren();
      if ($("teacherNoAppointments")) $("teacherNoAppointments").hidden = result.appointments.length > 0;
      for (const row of result.appointments) {
        const card = element(document, "article", "", "supervision-card"), body = document.createElement("div"); renderAppointment(body, row); card.append(body);
        if (new Date(row.scheduled_at) > new Date()) {
          const actions = element(document, "div", "", "supervision-actions supervision-appointment-actions");
          const button = element(document, "button", "แก้ไข / เลื่อนนัด", "teacher-button"); button.type = "button"; button.addEventListener("click", () => { if (!busy && !modal) edit(row); }); actions.append(button);
          if (row.status === "pending_confirmation") { const resend = element(document, "button", "ส่งลิงก์ยืนยันใหม่", "teacher-button"); resend.type = "button"; resend.addEventListener("click", () => sendAgain(row)); actions.append(resend); }
          card.append(actions);
        }
        $("supervisionAppointments").append(card);
        if (resultMount) resultWidgets.push(resultMount({ document, container: card, appointment: row, studentId: id, services, confirm, toast, loading, onAuthError: error, onSaved: () => { const button = card.querySelector('.supervision-actions button'); if (button) button.disabled = true; } }));
      }
      renderAppointmentHistory($("supervisionHistory"), result.history); edit(); $("supervisionDetail").hidden = false; say("โหลดข้อมูลนักศึกษาแล้ว เลือกงานนัดหมายหรือผลนิเทศจากเมนูเพื่อดำเนินการต่อ"); return true;
    } catch (err) { error(err); return false; }
    finally { busy = false; controls(); }
  }
  async function refresh({ preserveDetail = false } = {}) {
    if (busy || modal || !storage.getItem("teacherToken")) return;
    const keepDetail = preserveDetail && !!current;
    if (!keepDetail) { clearResults(); current = null; studentId = null; $("supervisionDetail").hidden = true; }
    studentCards.clear(); busy = true; const ticket = ++sequence; container.replaceChildren(); controls(); say("กำลังโหลดนักศึกษาในความดูแล...");
    presentation.setState("loading");
    try {
      let result = await services.listSupervisionStudents(offset);
      if (!result.students.length && offset) { offset = 0; result = await services.listSupervisionStudents(offset); }
      if (ticket !== sequence) return;
      if (!storage.getItem("teacherToken")) { presentation.setState("error", { retry: false }); return; }
      next = result.students.length > 25; const select = $("supervisionStudentSelect"); select.replaceChildren();
      const blank = element(document, "option", "เลือกนักศึกษาในความดูแล"); blank.value = ""; select.append(blank);
      for (const row of result.students.slice(0, 25)) {
        const studentName = `${row.first_name} ${row.last_name}`;
        const option = element(document, "option", `${studentName} · ${row.student_id}`); option.value = row.id; select.append(option);
        const card = element(document, "article", "", "teacher-student-card");
        const identity = element(document, "div", "", "teacher-student-identity");
        identity.append(element(document, "span", (row.first_name || "น").slice(0, 1), "teacher-student-avatar"), element(document, "h3", studentName));
        const company = element(document, "p", "เปิดรายละเอียดเพื่อดูสถานประกอบการ", "teacher-student-company");
        const open = element(document, "button", "ดูรายละเอียด", "teacher-button"); open.type = "button"; open.setAttribute("aria-label", `ดูรายละเอียด ${studentName} รหัส ${row.student_id}`);
        open.addEventListener("click", async () => {
          if (busy || modal) return;
          // Reopening an already selected card preserves drafts; mutation reloads
          // still call detail() normally to retain the existing server readback.
          if ((studentId === row.id && current) || await detail(row.id)) {
            $("supervisionStudentName").setAttribute("tabindex", "-1"); $("supervisionStudentName").focus({ preventScroll: true });
            $("supervisionDetail").scrollIntoView?.({ block: "start", behavior: "smooth" });
          }
        });
        card.append(identity, element(document, "p", `รหัสนักศึกษา ${row.student_id}`, "teacher-student-code"), element(document, "span", "ที่ปรึกษาโครงการ / อาจารย์นิเทศ", "teacher-neutral-badge"), company, open);
        container.append(card); studentCards.set(row.id, { root: card, company });
        card.classList.toggle("is-selected", row.id === studentId);
      }
      if (keepDetail) {
        if (![...select.options].some(option => option.value === studentId)) {
          const selected = element(document, "option", `${current.student.name} · ${current.student.code}`); selected.value = studentId; select.append(selected);
        }
        select.value = studentId;
      }
      say(result.students.length ? "เลือกนักศึกษาเพื่อนัดนิเทศครั้งที่ 1 หรือ 2" : "ยังไม่มีนักศึกษาที่คุณเป็นอาจารย์นิเทศ / ที่ปรึกษาโครงการ");
      presentation.setState("ready", { count: result.students.length, pageable: offset > 0 || next });
    } catch (err) { error(err); presentation.setState("error", { retry: !!storage.getItem("teacherToken") }); } finally { busy = false; controls(); }
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
        const text = failure ? failure.message : `${result.appointment ? "บันทึกนัดแล้ว" : "ดำเนินการส่งลิงก์แล้ว"}${result.email_sent ? " ส่งอีเมลแล้ว" : " แต่ส่งอีเมลไม่สำเร็จ กรุณาส่งลิงก์ใหม่"}${!reloaded ? " และโหลดข้อมูลล่าสุดไม่สำเร็จ กรุณาเปิดรายละเอียดอีกครั้ง" : ""}`;
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
  for (const event of ["input", "change"]) $("supervisionForm").addEventListener(event, () => { scheduleDirty = true; });
  const supervisionViews = ["teacherStudents", "supervisionScheduling", "supervisionResults"];
  let previousView = document.body.dataset.teacherView;
  document.addEventListener("teacher:viewchange", async event => {
    const view = event.detail.view, entering = supervisionViews.includes(view) && !supervisionViews.includes(previousView);
    previousView = view;
    if (!entering || busy || modal) return;
    // Update only the list while drafts are mounted. Reload a clean detail only
    // after checking again: a result form may have changed during the list read.
    await refresh({ preserveDetail: true });
    if (supervisionViews.includes(document.body.dataset.teacherView) && current && !scheduleDirty && !resultWidgets.some(widget => widget.hasPendingChanges?.())) await detail(studentId);
  });
  $("supervisionStudentSelect").addEventListener("change", event => { if (event.target.value) detail(event.target.value); else { ++sequence; current = null; studentId = null; $("supervisionDetail").hidden = true; } });
  $("supervisionPrevious").addEventListener("click", () => { if (!busy && !modal && offset) { offset -= 25; refresh(); } });
  $("supervisionNext").addEventListener("click", () => { if (!busy && !modal && next) { offset += 25; refresh(); } });
  $("teacherLogout").addEventListener("click", () => { clearResults(); studentCards.clear(); ++sequence; current = null; studentId = null; $("supervisionDetail").hidden = true; container.replaceChildren(); });
  const ready = refresh(); return { ready, refresh, detail };
}
if (typeof document !== "undefined") mountTeacherSupervision({ document, storage: roleSessionStorage });
