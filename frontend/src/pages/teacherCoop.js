import { getCurrentTeacher, getTeacherAdvisorRequests, decideTeacherAdvisorRequest, TEACHER_TOKEN_KEY } from "../api/teacherProjectAdvisor.api.js";
import { showConfirmModal, showToast, setButtonLoading } from "../ui/feedback.js";

const STATUS_LABELS = { pending: "รออาจารย์ยืนยัน", confirmed: "ยืนยันรับเป็นที่ปรึกษาแล้ว", rejected: "ปฏิเสธคำขอแล้ว" };
const PAGE_SIZE = 25;

export function mountTeacherCoop({ document, storage, location, me = getCurrentTeacher, list = getTeacherAdvisorRequests, decide = decideTeacherAdvisorRequest, confirm = showConfirmModal, toast = showToast, loading = setButtonLoading }) {
  const get = id => document.getElementById(id);
  const container = get("teacherRequestList"), message = get("teacherRequestMessage");
  let authorized = false, fetching = false, submitting = false, modalOpen = false;
  let status = "pending", offset = 0, hasNext = false, rows = [];

  function say(text, type = "info") {
    message.textContent = text;
    message.dataset.type = type;
    message.setAttribute("role", type === "error" ? "alert" : "status");
  }
  function controls() {
    const busy = !authorized || !storage.getItem(TEACHER_TOKEN_KEY) || fetching || submitting || modalOpen;
    get("teacherRefresh").disabled = busy;
    get("teacherRequestStatus").disabled = busy;
    get("teacherPrevious").disabled = busy || offset === 0;
    get("teacherNext").disabled = busy || !hasNext;
    container.querySelectorAll("button").forEach(button => { button.disabled = busy; });
    container.setAttribute("aria-busy", String(fetching || submitting));
  }
  function authError(error) {
    if (![401, 403].includes(error.status)) return false;
    authorized = false;
    storage.removeItem(TEACHER_TOKEN_KEY);
    get("teacherCoopList")?.replaceChildren();
    get("teacherCoopDetailBody")?.replaceChildren();
    if (get("teacherCoopDetail")) get("teacherCoopDetail").hidden = true;
    for (const id of ["teacherCoopRefresh", "teacherCoopStatus", "teacherCoopPrevious", "teacherCoopNext"]) { const node = get(id); if (node) node.disabled = true; }
    rows = [];
    container.replaceChildren();
    get("teacherPageNumber").textContent = "";
    get("teacherSignIn").hidden = false;
    say(error.status === 401 ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอาจารย์อีกครั้ง" : "บัญชีนี้ไม่มีสิทธิ์ใช้งานหน้าอาจารย์ กรุณาเข้าสู่ระบบใหม่", "error");
    controls();
    return true;
  }
  function errorText(error) {
    if (error.status === 409 || error.status === 404) return "คำขอนี้เปลี่ยนแปลงหรือไม่อยู่ในรายการของคุณแล้ว กรุณาตรวจสอบข้อมูลล่าสุด";
    if (error.status === 400) return "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบเหตุผลและลองอีกครั้ง";
    if (error.status === 503) return "ระบบคำขอที่ปรึกษายังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ";
    return "ไม่สามารถติดต่อระบบคำขอที่ปรึกษาได้ กรุณาลองรีเฟรชอีกครั้ง";
  }
  function element(tag, text, className) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function date(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "-" : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(parsed);
  }
  function render() {
    container.replaceChildren();
    for (const row of rows) {
      const card = element("article", "", "teacher-request-card");
      const name = [row.student?.first_name, row.student?.last_name].filter(Boolean).join(" ") || "ไม่ระบุชื่อ";
      const state = STATUS_LABELS[row.status] ? row.status : "unknown";
      card.append(element("span", STATUS_LABELS[state] || "ไม่ทราบสถานะ", `teacher-status teacher-status--${state}`), element("h2", name));
      const details = element("dl", "");
      const fields = [["รหัสนักศึกษา", row.student?.student_id], ["สาขา", row.student?.major], ["หัวข้อโครงการ", row.topic], ["วันที่ส่งคำขอ", date(row.requested_at)]];
      if (row.status === "confirmed") fields.push(["วันที่ยืนยัน", date(row.confirmed_at)]);
      if (row.status === "rejected") fields.push(["วันที่ปฏิเสธ", date(row.rejected_at)], ["เหตุผล", row.rejection_reason]);
      for (const [label, value] of fields) details.append(element("dt", label), element("dd", value || "-"));
      card.append(details);
      if (row.status === "pending") {
        const actions = element("div", "", "teacher-request-actions");
        for (const action of ["accept", "reject"]) {
          const button = element("button", action === "accept" ? "ยอมรับเป็นอาจารย์ที่ปรึกษา" : "ปฏิเสธ", `teacher-button teacher-button--${action}`);
          button.type = "button";
          button.addEventListener("click", () => openDecision(row, action, name, button));
          actions.append(button);
        }
        card.append(actions);
      }
      container.append(card);
    }
    get("teacherPageNumber").textContent = rows.length ? `หน้า ${offset / PAGE_SIZE + 1}` : "";
    controls();
  }
  async function refresh({ preserveMessage = false } = {}) {
    if (!authorized || !storage.getItem(TEACHER_TOKEN_KEY) || fetching) return false;
    fetching = true;
    hasNext = false;
    rows = [];
    render();
    if (!preserveMessage) say("กำลังโหลดคำขอ...");
    loading(get("teacherRefresh"), true, "กำลังโหลด...", "รีเฟรช");
    try {
      let data = await list({ status, offset, limit: PAGE_SIZE + 1 });
      if (!Array.isArray(data)) throw new Error("Invalid request list");
      // A decision can remove the last row on this page; return to page one.
      if (!data.length && offset > 0) {
        offset = 0;
        data = await list({ status, offset, limit: PAGE_SIZE + 1 });
        if (!Array.isArray(data)) throw new Error("Invalid request list");
      }
      if (!storage.getItem(TEACHER_TOKEN_KEY)) { rows = []; render(); return false; }
      hasNext = data.length > PAGE_SIZE;
      rows = data.slice(0, PAGE_SIZE);
      render();
      if (!preserveMessage) say(rows.length ? `แสดง ${rows.length} คำขอในหน้านี้` : status === "pending" ? "ยังไม่มีคำขอเป็นอาจารย์ที่ปรึกษาโครงการ" : `ยังไม่มีคำขอ${status === "confirmed" ? "ที่ยืนยันแล้ว" : "ที่ปฏิเสธแล้ว"}`);
      return true;
    } catch (error) {
      if (!authError(error)) say(errorText(error), "error");
      return false;
    } finally {
      fetching = false;
      loading(get("teacherRefresh"), false, "กำลังโหลด...", "รีเฟรช");
      controls();
    }
  }
  function openDecision(row, action, name, button) {
    if (!authorized || !storage.getItem(TEACHER_TOKEN_KEY) || fetching || submitting || modalOpen || row.status !== "pending") return;
    modalOpen = true;
    controls();
    confirm({
      title: action === "accept" ? "ยืนยันรับเป็นอาจารย์ที่ปรึกษา" : "ปฏิเสธคำขอที่ปรึกษาโครงการ",
      message: `${action === "accept" ? "ยืนยันรับ" : "ยืนยันปฏิเสธ"}คำขอของ ${name} (${row.student?.student_id || "-"})`,
      confirmLabel: action === "accept" ? "ยืนยันรับเป็นที่ปรึกษา" : "ยืนยันปฏิเสธ",
      loadingLabel: "กำลังบันทึก...",
      reasonLabel: action === "reject" ? "เหตุผลที่ปฏิเสธ (จำเป็น)" : "",
      onClose: () => { modalOpen = false; controls(); },
      onConfirm: async reason => {
        if (submitting || !authorized || !storage.getItem(TEACHER_TOKEN_KEY)) return;
        submitting = true;
        controls();
        loading(button, true, "กำลังบันทึก...");
        try {
          await decide(row.id, action, reason);
          const success = action === "accept" ? "ยืนยันรับเป็นอาจารย์ที่ปรึกษาแล้ว" : "ปฏิเสธคำขอแล้ว";
          toast(success, "success");
          say(success, "success");
          const refreshed = await refresh({ preserveMessage: true });
          if (!refreshed && authorized) say(`${success} แต่โหลดรายการล่าสุดไม่สำเร็จ กรุณารีเฟรช`, "error");
        } catch (error) {
          if (!authError(error)) {
            const text = errorText(error);
            toast(text, "error");
            await refresh();
            if (authorized) say(text, "error");
          }
          // Close this decision modal after an error. A retry needs a fresh server row.
        } finally {
          submitting = false;
          loading(button, false, "กำลังบันทึก...");
          controls();
        }
      },
    });
  }
  get("teacherRefresh").addEventListener("click", () => refresh());
  get("teacherRequestStatus").addEventListener("change", async event => {
    if (fetching || submitting || modalOpen) return;
    status = event.target.value;
    offset = 0;
    await refresh();
  });
  get("teacherPrevious").addEventListener("click", async () => { if (fetching || submitting || modalOpen || offset === 0) return; offset -= PAGE_SIZE; await refresh(); });
  get("teacherNext").addEventListener("click", async () => { if (fetching || submitting || modalOpen || !hasNext) return; offset += PAGE_SIZE; await refresh(); });
  get("teacherLogout").addEventListener("click", () => { storage.removeItem(TEACHER_TOKEN_KEY); location.replace("/teacher-login.html"); });
  const ready = (async () => {
    if (!storage.getItem(TEACHER_TOKEN_KEY)) { location.replace("/teacher-login.html"); return; }
    say("กำลังตรวจสอบผู้ใช้งาน...");
    try {
      const result = await me();
      const teacher = result.data;
      if (!result.success || !teacher?.id) throw new Error("Invalid Teacher profile");
      if (!storage.getItem(TEACHER_TOKEN_KEY)) return;
      get("teacherName").textContent = [teacher.academic_title, teacher.first_name, teacher.last_name].filter(Boolean).join(" ");
      authorized = true;
      await refresh();
    } catch (error) {
      if (!authError(error)) { say("ตรวจสอบบัญชีอาจารย์ไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่", "error"); get("teacherSignIn").hidden = false; }
    } finally { controls(); }
  })();
  return { ready, refresh };
}

if (typeof document !== "undefined") mountTeacherCoop({ document, storage: sessionStorage, location: window.location });
