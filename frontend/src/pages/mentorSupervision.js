import { getMentorAppointment, confirmMentorAppointment } from "../api/supervision.api.js";
import { showConfirmModal, showToast, setButtonLoading } from "../ui/feedback.js";
import { renderAppointment } from "./supervisionView.js";
export function initMentorSupervision(token) {
  const $ = id => document.getElementById(id); let current = null, busy = false, modal = false;
  $("mentorContent").hidden = true; $("mentorReview").hidden = true; $("mentorAppointment").hidden = false;
  $("pageTitle").textContent = "ตรวจสอบข้อมูลและยืนยันนัดนิเทศ";
  document.querySelector(".mentor-verification-header > p:last-child").textContent = "ยืนยันเฉพาะเมื่อข้อมูลส่วนบุคคลและวันเวลานัดของคุณถูกต้อง หากมีข้อผิดพลาดกรุณาติดต่ออาจารย์";
  document.querySelector(".security-note").textContent = "ลิงก์ใช้ยืนยันได้ครั้งเดียว อายุไม่เกิน 7 วันหรือเวลานัด โปรดเก็บเป็นความลับ";
  const state = (message, type = "loading") => { $("verificationState").className = `verification-state is-${type}`; $("verificationStateMessage").textContent = message; };
  async function load() {
    $("mentorAppointmentConfirm").disabled = true; state("กำลังตรวจสอบนัดหมาย...");
    try { current = (await getMentorAppointment(token)).appointment; renderAppointment($("mentorAppointmentDetails"), current); $("mentorAppointmentIdentity").checked = false; $("mentorAppointmentActions").hidden = false; $("mentorAppointmentConfirm").disabled = false; state("กรุณาตรวจสอบข้อมูลก่อนยืนยัน", "success"); }
    catch (err) { current = null; $("mentorAppointmentDetails").replaceChildren(); $("mentorAppointmentActions").hidden = true; state(err.message, "error"); }
  }
  $("mentorAppointmentConfirm").addEventListener("click", () => {
    if (busy || modal || !current) return;
    if (!$("mentorAppointmentIdentity").checked) { state("กรุณายืนยันว่าชื่อ อีเมล ตำแหน่ง และนัดหมายเป็นข้อมูลของคุณ", "error"); return; }
    const version = current.version; modal = true;
    showConfirmModal({ title: "ยืนยันข้อมูลส่วนบุคคลและนัดนิเทศ", message: "การยืนยันนี้จะบันทึกชื่อผู้เข้าร่วมนัดและเวลาไว้ในประวัติ", confirmLabel: "ยืนยันนัด", onClose: () => { modal = false; }, onConfirm: async () => {
      if (busy) return; busy = true; setButtonLoading($("mentorAppointmentConfirm"), true, "กำลังยืนยัน...");
      try { current = (await confirmMentorAppointment(token, version)).appointment; renderAppointment($("mentorAppointmentDetails"), current); $("mentorAppointmentActions").hidden = true; token = null; state("ยืนยันข้อมูลส่วนบุคคลและนัดนิเทศแล้ว", "success"); showToast("ยืนยันนัดแล้ว", "success"); }
      catch (err) { state(err.message, "error"); if ([401, 403, 404, 410].includes(err.status)) { current = null; $("mentorAppointmentActions").hidden = true; $("mentorAppointmentDetails").replaceChildren(); } else if (err.status === 409) await load(); }
      finally { busy = false; setButtonLoading($("mentorAppointmentConfirm"), false, "กำลังยืนยัน...", "ยืนยันข้อมูลและนัดหมาย"); }
    } });
  });
  load();
}
