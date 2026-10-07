import { getCurrentTeacher, getTeacherCoopRequests, getTeacherCoopRequest, decideTeacherCoopRequest, TEACHER_TOKEN_KEY } from "../api/teacherProjectAdvisor.api.js";
import { showConfirmModal, showToast, setButtonLoading } from "../ui/feedback.js";

const LABELS = {
  advisor_review: "รออาจารย์ที่ปรึกษาพิจารณา", department_head_review: "รอหัวหน้าภาควิชาพิจารณา",
  approved: "อนุมัติแล้ว", rejected: "ไม่ได้รับการอนุมัติ", cancelled: "ยกเลิกแล้ว",
  document_issued: "ออกเอกสารแล้ว", in_progress: "กำลังปฏิบัติงาน", submitted: "สถานะเดิม: ยื่นคำร้อง", staff_review: "สถานะเดิม: รอเจ้าหน้าที่",
};
const ROLES = { student: "นักศึกษา", teacher: "อาจารย์ที่ปรึกษาประจำชั้น", department_head: "หัวหน้าภาควิชา", department_staff: "เจ้าหน้าที่" };
const DECISIONS = { submit: "ยื่นคำร้อง", approve: "อนุมัติ", reject: "ไม่อนุมัติ", cancel: "ยกเลิก" };
const PAGE_SIZE = 25;

export function mountTeacherCoopRequests({ document, storage, location, role = "teacher", me = getCurrentTeacher, list = getTeacherCoopRequests, detail = getTeacherCoopRequest, decide = decideTeacherCoopRequest, confirm = showConfirmModal, toast = showToast, loading = setButtonLoading }) {
  const isHead = role === "department_head", reviewStatus = isHead ? "department_head_review" : "advisor_review";
  const loginPath = isHead ? "/department-head-login.html" : "/teacher-login.html";
  const get = id => document.getElementById(id);
  const container = get("teacherCoopList"), message = get("teacherCoopMessage"), detailPanel = get("teacherCoopDetail"), detailBody = get("teacherCoopDetailBody");
  let authorized = false, fetching = false, submitting = false, modalOpen = false, detailLoading = false;
  let status = reviewStatus, offset = 0, hasNext = false, rows = [], detailId = null, returnFocus = null;
  function say(text, type = "info") {
    message.textContent = text; message.dataset.type = type;
    message.setAttribute("role", type === "error" ? "alert" : "status");
  }
  function controls() {
    const busy = !authorized || !storage.getItem(TEACHER_TOKEN_KEY) || fetching || submitting || modalOpen || detailLoading;
    get("teacherCoopRefresh").disabled = busy; get("teacherCoopStatus").disabled = busy;
    get("teacherCoopPrevious").disabled = busy || offset === 0; get("teacherCoopNext").disabled = busy || !hasNext;
    for (const root of [container, detailBody]) root.querySelectorAll("button").forEach(button => { button.disabled = busy; });
    get("teacherCoopCloseDetail").disabled = submitting || modalOpen || detailLoading;
    container.setAttribute("aria-busy", String(fetching || submitting));
    detailPanel.setAttribute("aria-busy", String(detailLoading));
  }
  function authError(error) {
    if (![401, 403].includes(error.status)) return false;
    authorized = false; storage.removeItem(TEACHER_TOKEN_KEY); rows = []; hasNext = false;
    container.replaceChildren(); detailBody.replaceChildren(); detailPanel.hidden = true; detailId = null;
    get("teacherCoopPage").textContent = ""; get("teacherCoopSignIn").hidden = false;
    // Clear the other Teacher section when the shared session is revoked.
    get("teacherRequestList")?.replaceChildren();
    for (const id of ["teacherRefresh", "teacherRequestStatus", "teacherPrevious", "teacherNext"]) { const node = get(id); if (node) node.disabled = true; }
    say(error.status === 401 ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" : isHead ? "บัญชีนี้ไม่มีสิทธิ์หัวหน้าภาควิชา กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์" : "ไม่มีสิทธิ์พิจารณาคำร้องนี้ กรุณาเข้าสู่ระบบอาจารย์อีกครั้ง", "error");
    controls(); return true;
  }
  function errorText(error) {
    if ([404, 409].includes(error.status)) return "คำร้องนี้เปลี่ยนสถานะหรือไม่อยู่ในรายการแล้ว กรุณาตรวจสอบข้อมูลล่าสุด";
    if (error.status === 400) return "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบเหตุผลและลองอีกครั้ง";
    return "โหลดหรือบันทึกคำร้องไม่สำเร็จ กรุณาลองรีเฟรชอีกครั้ง";
  }
  function node(tag, text = "", className = "") { const el = document.createElement(tag); el.textContent = text; if (className) el.className = className; return el; }
  function date(value, time = true) {
    if (!value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "-" : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", ...(time ? { timeStyle: "short" } : {}), timeZone: "Asia/Bangkok" }).format(parsed);
  }
  const name = row => [row.student?.first_name, row.student?.last_name].filter(Boolean).join(" ") || "ไม่ระบุชื่อ";
  const teacherName = teacher => [teacher?.academic_title, teacher?.first_name, teacher?.last_name].filter(Boolean).join(" ") || "-";
  const classDecision = row => [...(row.reviews || [])].reverse().find(event => event.actor_role === "teacher" && event.decision === "approve" && event.to_status === "department_head_review");
  function fields(values) { const dl = node("dl"); for (const [label, value] of values) dl.append(node("dt", label), node("dd", value || "-")); return dl; }
  function courses(values) {
    const list = node("ul", "", "teacher-course-list");
    const labels = { passed: "ผ่านแล้ว", studying: "กำลังศึกษา", unselected: "ยังไม่เลือก" };
    if (!Array.isArray(values) || !values.length) list.append(node("li", "คำร้องเดิมไม่มีข้อมูลรายวิชาที่บันทึกไว้"));
    else for (const course of [...values].sort((a, b) => String(a.course_code).localeCompare(String(b.course_code)))) list.append(node("li", `${course.program || "-"} · ${course.course_code || "-"} ${course.course_name || "-"} · ${labels[course.status] || "ไม่พบสถานะ"} · เกรด ${course.grade || "-"}`));
    return list;
  }
  function actions(row) {
    const group = node("div", "", "teacher-request-actions");
    if (row.status !== reviewStatus) return group;
    for (const action of ["approve", "reject"]) {
      const button = node("button", action === "approve" ? "อนุมัติ" : "ไม่อนุมัติ", `teacher-button teacher-button--${action === "approve" ? "accept" : "reject"}`);
      button.type = "button"; button.dataset.coopAction = action;
      button.addEventListener("click", () => openDecision(row, action, button)); group.append(button);
    }
    return group;
  }
  function render() {
    container.replaceChildren();
    for (const row of rows) {
      const card = node("article", "", "teacher-request-card");
      card.append(node("span", LABELS[row.status] || "ไม่ทราบสถานะ", "teacher-status"), node("h2", name(row)), fields([
        ["รหัสนักศึกษา", row.student?.student_id], ["สาขา", row.student?.major], ["สถานประกอบการ", row.company_name], ["วันที่ยื่น", date(row.submitted_at)],
      ]), courses(row.prerequisite_courses));
      if (isHead) { const approval = classDecision(row); card.append(fields([["อาจารย์ที่ปรึกษาประจำชั้น", teacherName(row.student?.advisorTeacher)], ["ผู้อนุมัติขั้นอาจารย์ที่ปรึกษา", teacherName(approval?.teacher)], ["วันที่อาจารย์ที่ปรึกษาอนุมัติ", date(approval?.created_at || approval?.createdAt)]])); }
      const button = node("button", "ดูรายละเอียด", "teacher-button"); button.type = "button";
      button.addEventListener("click", () => openDetail(row.id, button)); card.append(button, actions(row)); container.append(card);
    }
    get("teacherCoopPage").textContent = rows.length ? `หน้า ${offset / PAGE_SIZE + 1}` : ""; controls();
  }
  function closeDetail() {
    if (submitting || modalOpen || detailLoading) return;
    detailId = null; detailBody.replaceChildren(); detailPanel.hidden = true; returnFocus?.focus?.(); returnFocus = null;
  }
  async function openDetail(id, button, { reload = false } = {}) {
    if (!authorized || !storage.getItem(TEACHER_TOKEN_KEY) || fetching || (!reload && (submitting || modalOpen)) || detailLoading) return false;
    detailLoading = true; detailId = id; returnFocus = button || returnFocus;
    detailPanel.hidden = false; detailBody.replaceChildren(); get("teacherCoopDetailMessage").textContent = "กำลังโหลดรายละเอียด..."; controls();
    try {
      const result = await detail(id), row = result?.data?.request, reviews = result?.data?.reviews;
      if (!result?.success || !row?.id || row.id !== id || !Array.isArray(reviews)) throw Error("Invalid detail");
      if (!authorized || !storage.getItem(TEACHER_TOKEN_KEY)) return false;
      detailBody.append(fields([["ชื่อ-นามสกุล", name(row)], ["รหัสนักศึกษา", row.student?.student_id], ["สาขา", row.student?.major],
        ...(isHead ? [["อาจารย์ที่ปรึกษาประจำชั้น", teacherName(row.student?.advisorTeacher)]] : []),
        ["สถานประกอบการที่ยื่นคำร้อง", row.company_name], ["จังหวัด", row.company_province], ["ที่อยู่บริษัท", row.company_address],
        ["ผู้รับหนังสือ", row.letter_recipient_name], ["ตำแหน่ง / หน่วยงานผู้รับ", row.letter_recipient_position_department],
        ["ตำแหน่งงาน", row.jobPosting?.title], ["รายละเอียดงาน", row.jobPosting?.description], ["เริ่มปฏิบัติงาน", date(row.work_start_date, false)], ["สิ้นสุดปฏิบัติงาน", date(row.work_end_date, false)],
        ["วันที่ยื่น", date(row.submitted_at)], ["สถานะ", LABELS[row.status] || "ไม่ทราบสถานะ"]]), node("h3", "รายวิชาที่บันทึกตอนยื่นคำร้อง"), courses(row.prerequisite_courses), node("h3", "ประวัติการดำเนินการ"));
      const history = node("ol");
      if (!reviews.length) history.append(node("li", "ยังไม่มีประวัติการดำเนินการ"));
      for (const event of reviews) history.append(node("li", `${date(event.created_at || event.createdAt)} · ${ROLES[event.actor_role] || "ไม่ระบุบทบาท"}${isHead && event.teacher ? ` (${teacherName(event.teacher)})` : ""} · ${DECISIONS[event.decision] || "ไม่ระบุการดำเนินการ"} · ${LABELS[event.from_status] || (event.from_status === "new" ? "เริ่มคำร้อง" : event.from_status) || "-"} → ${LABELS[event.to_status] || event.to_status || "-"}${event.reason ? ` · เหตุผล: ${event.reason}` : ""}`));
      detailBody.append(history, actions(row)); get("teacherCoopDetailMessage").textContent = "";
      detailPanel.focus?.(); detailPanel.scrollIntoView?.({ behavior: "smooth", block: "start" }); return true;
    } catch (error) {
      if (!authError(error)) { detailId = null; get("teacherCoopDetailMessage").textContent = errorText(error); }
      return false;
    } finally { detailLoading = false; controls(); }
  }
  async function refresh({ preserveMessage = false } = {}) {
    if (!authorized || !storage.getItem(TEACHER_TOKEN_KEY) || fetching) return false;
    fetching = true; rows = []; hasNext = false; render();
    if (!preserveMessage) say("กำลังโหลดคำร้อง..."); loading(get("teacherCoopRefresh"), true, "กำลังโหลด...", "รีเฟรช");
    try {
      let data = await list({ status, offset, limit: PAGE_SIZE + 1 });
      if (!Array.isArray(data?.data) || !data.success) throw Error("Invalid list");
      if (!data.data.length && offset > 0) { offset = 0; data = await list({ status, offset, limit: PAGE_SIZE + 1 }); if (!Array.isArray(data?.data) || !data.success) throw Error("Invalid list"); }
      if (!authorized || !storage.getItem(TEACHER_TOKEN_KEY)) return false;
      hasNext = data.data.length > PAGE_SIZE; rows = data.data.slice(0, PAGE_SIZE); render();
      if (!preserveMessage) say(rows.length ? `แสดง ${rows.length} คำร้องในหน้านี้` : status === reviewStatus ? isHead ? "ยังไม่มีคำร้องสหกิจที่รอการพิจารณาจากหัวหน้าภาควิชา" : "ยังไม่มีคำร้องสหกิจที่รอการพิจารณา" : "ยังไม่มีคำร้องในสถานะที่เลือก"); return true;
    } catch (error) { if (!authError(error)) say(errorText(error), "error"); return false; }
    finally { fetching = false; loading(get("teacherCoopRefresh"), false, "กำลังโหลด...", "รีเฟรช"); controls(); }
  }
  function openDecision(row, action, button) {
    if (!authorized || !storage.getItem(TEACHER_TOKEN_KEY) || fetching || submitting || modalOpen || detailLoading || row.status !== reviewStatus) return;
    modalOpen = true; controls();
    confirm({ title: action === "approve" ? isHead ? "ยืนยันอนุมัติคำร้องสหกิจ" : "อนุมัติคำร้องและส่งต่อหัวหน้าภาควิชา" : "ไม่อนุมัติคำร้องสหกิจ", message: `${name(row)} (${row.student?.student_id || "-"}) · ${row.company_name || "-"}`,
      confirmLabel: action === "approve" ? "ยืนยันอนุมัติ" : "ยืนยันไม่อนุมัติ", loadingLabel: "กำลังบันทึก...", reasonLabel: action === "reject" ? "เหตุผลที่ไม่อนุมัติ (จำเป็น)" : "",
      onClose: () => { modalOpen = false; controls(); },
      onConfirm: async reason => {
        if (submitting || !authorized || !storage.getItem(TEACHER_TOKEN_KEY)) return;
        submitting = true; controls(); loading(button, true, "กำลังบันทึก...");
        try {
          await decide(row.id, action, reason);
          const text = action === "approve" ? isHead ? "คำร้องได้รับการอนุมัติแล้ว" : "อนุมัติแล้ว ส่งต่อให้หัวหน้าภาควิชาพิจารณา" : "บันทึกการไม่อนุมัติแล้ว";
          toast(text, "success"); say(text, "success");
          const selected = detailId;
          // Discard old detail actions immediately; decisions always reload server state.
          detailBody.replaceChildren(); detailPanel.hidden = true; detailId = null;
          const refreshed = await refresh({ preserveMessage: true });
          const detailRefreshed = selected && authorized ? await openDetail(selected, null, { reload: true }) : true;
          if ((!refreshed || !detailRefreshed) && authorized) say(`${text} แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณารีเฟรช`, "error");
        } catch (error) {
          detailBody.replaceChildren(); detailPanel.hidden = true; detailId = null;
          if (!authError(error)) { const text = errorText(error); toast(text, "error"); await refresh(); if (authorized) say(text, "error"); }
        } finally { submitting = false; loading(button, false, "กำลังบันทึก..."); controls(); }
      },
    });
  }
  get("teacherCoopRefresh").addEventListener("click", () => { if (!submitting && !modalOpen && !detailLoading) { closeDetail(); return refresh(); } });
  get("teacherCoopStatus").addEventListener("change", async event => { if (fetching || submitting || modalOpen || detailLoading) return; status = event.target.value; offset = 0; closeDetail(); await refresh(); });
  get("teacherCoopPrevious").addEventListener("click", async () => { if (fetching || submitting || modalOpen || detailLoading || !offset) return; offset -= PAGE_SIZE; closeDetail(); await refresh(); });
  get("teacherCoopNext").addEventListener("click", async () => { if (fetching || submitting || modalOpen || detailLoading || !hasNext) return; offset += PAGE_SIZE; closeDetail(); await refresh(); });
  get("teacherCoopCloseDetail").addEventListener("click", closeDetail);
  controls();
  const ready = (async () => {
    if (!storage.getItem(TEACHER_TOKEN_KEY)) { location.replace(loginPath); return; }
    say("กำลังตรวจสอบผู้ใช้งาน...");
    try {
      const result = await me(); if (!result?.success || !result.data?.id) throw Error("Invalid profile");
      if (isHead && result.data.is_department_head !== true) throw Object.assign(Error("Head authorization required"), { status: 403 });
      if (!storage.getItem(TEACHER_TOKEN_KEY)) return;
      if (isHead && get("headName")) get("headName").textContent = teacherName(result.data);
      authorized = true; await refresh();
    }
    catch (error) { if (!authError(error)) { say("ตรวจสอบบัญชีอาจารย์ไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่", "error"); get("teacherCoopSignIn").hidden = false; } }
    finally { controls(); }
  })();
  return { ready, refresh, openDetail };
}

if (typeof document !== "undefined" && document.body.dataset.workflowRole !== "department_head") mountTeacherCoopRequests({ document, storage: sessionStorage, location: window.location });
