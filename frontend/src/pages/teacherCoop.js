import { roleSessionStorage } from "../auth/roleAuthStorage.js";
import { getCurrentTeacher, getTeacherAdvisorRequests, getTeacherAdvisorRequest, decideTeacherAdvisorRequest, TEACHER_TOKEN_KEY } from "../api/teacherProjectAdvisor.api.js";
import { mountContentModal, showConfirmModal, showToast, setButtonLoading } from "../ui/feedback.js";
import { createTeacherListPresentation } from "./teacherListPresentation.js";
import { mountTeacherSearchToolbar } from './teacherSearchToolbar.js';
import { mountTeacherListView, academicPeriodText, studentIdentity, createTeacherTable, appendTeacherTableRow } from './teacherListView.js';
import { teacherStatusBadge } from './teacherStatus.js';

const STATUS_LABELS = { pending: "รอการยืนยัน", confirmed: "ยืนยันรับเป็นที่ปรึกษาแล้ว", rejected: "ปฏิเสธแล้ว", superseded: 'ประวัติคำขอที่มีรายการใหม่แทน' };

export function mountTeacherCoop({ document, storage, location, me = getCurrentTeacher, list = getTeacherAdvisorRequests, detail = getTeacherAdvisorRequest, decide = decideTeacherAdvisorRequest, confirm = showConfirmModal, toast = showToast, loading = setButtonLoading }) {
  const get = id => document.getElementById(id);
  const container = get("teacherRequestList"), message = get("teacherRequestMessage");
  const presentation = createTeacherListPresentation({ document, list: container, message, onRetry: () => { if (!submitting && !modalOpen) return refresh(); }, emptyTitle: "ยังไม่มีคำขอเป็นที่ปรึกษา", emptyDescription: "เมื่อมีนักศึกษาเลือกคุณเป็นที่ปรึกษาโครงการ คำขอจะแสดงที่นี่" });
  let authorized = false, fetching = false, submitting = false, modalOpen = false;
  let status = "all", offset = 0, hasNext = false, rows = [];
  let listSequence = 0;
  let pendingTask = null, detailId = null, detailVersion = 0, detailBusy = false, detailOpener = null;
  const searchToolbar = mountTeacherSearchToolbar({ document, anchor: get('teacherRequestStatus').parentElement,
    status: get('teacherRequestStatus'), placeholder: 'ชื่อ รหัสนักศึกษา หรือหัวข้อโครงการ', pageSize: () => listView.pageSize,
    onApply: () => { status = get('teacherRequestStatus').value; offset = 0; refresh(); } });
  const listView = mountTeacherListView({ document, summary: searchToolbar.summary, menu: 'advisorRequests', label: 'คำขอเป็นที่ปรึกษา', onChange: render,
    onSort: () => { offset = 0; refresh(); }, onPageSize: () => { offset = 0; refresh(); } });
  const overlay = document.createElement('div'); overlay.className = 'app-confirm-overlay teacher-coop-detail-overlay'; overlay.hidden = true;
  overlay.innerHTML = `<section class="app-confirm-modal teacher-coop-detail teacher-coop-detail-modal" role="dialog" aria-modal="true" aria-labelledby="teacherAdvisorDetailHeading" tabindex="-1" hidden><header class="teacher-coop-detail-header"><h2 id="teacherAdvisorDetailHeading">รายละเอียดคำขอเป็นที่ปรึกษา</h2><button type="button" class="teacher-button" aria-label="ปิดรายละเอียดคำขอ">ปิด ×</button></header><div class="teacher-coop-detail-scroll" tabindex="0" role="region" aria-label="ข้อมูลคำขอเป็นที่ปรึกษา"><p role="status" aria-live="polite"></p><button type="button" class="teacher-button" hidden>ลองโหลดอีกครั้ง</button><div class="teacher-advisor-detail-body"></div></div><footer class="teacher-coop-detail-footer"></footer></section>`;
  const panel = overlay.firstElementChild, close = panel.querySelector('header button'), detailMessage = panel.querySelector('p'), detailRetry = panel.querySelector('.teacher-coop-detail-scroll button'), detailBody = panel.querySelector('.teacher-advisor-detail-body'), detailActions = panel.querySelector('footer');
  const detailModal = mountContentModal({ document, overlay, panel, initialFocus: close, canClose: () => !submitting && !modalOpen,
    returnFocus: () => detailOpener, fallbackFocus: () => get('advisorRequestHeading'),
    onClose: () => { detailVersion++; detailBusy = false; detailId = null; detailBody.replaceChildren(); detailActions.replaceChildren(); controls(); } });
  close.addEventListener('click', () => detailModal.close());
  detailRetry.addEventListener('click', () => { if (detailId) openDetail(detailId); });
  async function openDetail(id, opener) {
    if (!authorized || fetching || submitting || modalOpen || detailBusy || !storage.getItem(TEACHER_TOKEN_KEY)) return;
    detailOpener = opener || (detailId === id ? detailOpener : null); detailId = id; detailBusy = true; const ticket = ++detailVersion, token = storage.getItem(TEACHER_TOKEN_KEY);
    detailBody.replaceChildren(); detailActions.replaceChildren(); detailRetry.hidden = true; detailMessage.textContent = 'กำลังโหลดคำขอ...'; detailMessage.setAttribute('role', 'status'); detailModal.open(); controls();
    try {
      const row = await detail(id);
      if (ticket !== detailVersion || !detailModal.isOpen || token !== storage.getItem(TEACHER_TOKEN_KEY)) return;
      if (row?.id !== id || !row.student || !STATUS_LABELS[row.status]) throw Error('Invalid advisor detail');
      const name = `${row.student.first_name} ${row.student.last_name}`, fields = element('dl', '');
      const entries = [['ชื่อ-นามสกุล', name], ['รหัสนักศึกษา', row.student.student_id], ['สาขา', row.student.major], ['ปี / ภาคเรียน', academicPeriodText(row)], ['หัวข้อโครงการ', row.topic], ['สถานะ', STATUS_LABELS[row.status]], ['ส่งคำขอ', date(row.requested_at)], ['ยืนยัน', date(row.confirmed_at)], ['ปฏิเสธ', date(row.rejected_at)], ['เหตุผลปฏิเสธ', row.rejection_reason]];
      if (row.status === 'superseded') entries.push(['มีรายการใหม่แทนเมื่อ', date(row.superseded_at)]);
      for (const [label, value] of entries) fields.append(element('dt', label), element('dd', value || '-'));
      detailBody.append(fields); if (row.status === 'pending') detailActions.append(requestActions(row, name)); detailMessage.textContent = '';
    } catch (error) {
      if (ticket !== detailVersion || token !== storage.getItem(TEACHER_TOKEN_KEY)) return;
      if (!authError(error)) { detailMessage.textContent = errorText(error); detailMessage.setAttribute('role', 'alert'); detailRetry.hidden = false; }
    } finally { if (ticket === detailVersion) { detailBusy = false; controls(); } }
  }
  function openTask() {
    if (!pendingTask || !authorized || fetching || submitting || modalOpen || detailBusy || document.body.dataset.teacherView !== 'advisorRequests') return;
    const id = pendingTask; pendingTask = null; openDetail(id);
  }
  document.addEventListener('teacher:task-open', event => {
    if (event.detail?.kind !== 'advisor' || !/^[0-9a-f-]{36}$/i.test(event.detail.id || '')) return;
    pendingTask = event.detail.id; openTask();
  });

  function say(text, type = "info") {
    message.textContent = text;
    message.dataset.type = type;
    message.setAttribute("role", type === "error" ? "alert" : "status");
  }
  function controls() {
    const busy = !authorized || !storage.getItem(TEACHER_TOKEN_KEY) || fetching || submitting || modalOpen || detailBusy;
    get("teacherRequestStatus").disabled = busy;
    searchToolbar.setBusy(busy);
    searchToolbar.setLoading(fetching);
    listView.setBusy(busy);
    get("teacherPrevious").disabled = busy || offset === 0;
    get("teacherNext").disabled = busy || !hasNext;
    container.querySelectorAll("button").forEach(button => { button.disabled = busy; });
    detailActions.querySelectorAll('button').forEach(button => { button.disabled = busy; }); detailRetry.disabled = busy; close.disabled = submitting || modalOpen;
    panel.setAttribute('aria-busy', String(detailBusy));
    container.setAttribute("aria-busy", String(fetching || submitting));
  }
  function authError(error) {
    if (![401, 403].includes(error.status)) return false;
    authorized = false;
    storage.removeItem(TEACHER_TOKEN_KEY);
    get("teacherCoopList")?.replaceChildren();
    get("teacherCoopDetailBody")?.replaceChildren();
    if (get("teacherCoopDetailOverlay")) {
      // Let the request modal clear sensitive content while keeping its Close controls.
      document.dispatchEvent(new document.defaultView.CustomEvent("teacher:coop-session-invalid", { detail: { status: error.status } }));
    } else if (get("teacherCoopDetail")) get("teacherCoopDetail").hidden = true;
    for (const id of ["teacherCoopStatus", "teacherCoopPrevious", "teacherCoopNext"]) { const node = get(id); if (node) node.disabled = true; }
    rows = [];
    detailVersion++; detailBusy = false; detailBody.replaceChildren(); detailActions.replaceChildren(); detailRetry.hidden = true;
    if (detailModal.isOpen) { detailMessage.textContent = 'เซสชันหมดอายุหรือบัญชีไม่มีสิทธิ์ กรุณาเข้าสู่ระบบใหม่'; detailMessage.setAttribute('role', 'alert'); }
    container.replaceChildren();
    get("teacherPageNumber").textContent = "";
    get("teacherSignIn").hidden = false;
    say(error.status === 401 ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอาจารย์อีกครั้ง" : "บัญชีนี้ไม่มีสิทธิ์ใช้งานหน้าอาจารย์ กรุณาเข้าสู่ระบบใหม่", "error");
    presentation.setState("error", { retry: false });
    controls();
    return true;
  }
  function errorText(error) {
    if (error.status === 409 || error.status === 404) return "คำขอนี้เปลี่ยนแปลงหรือไม่อยู่ในรายการของคุณแล้ว กรุณาตรวจสอบข้อมูลล่าสุด";
    if (error.status === 400) return "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบเหตุผลและลองอีกครั้ง";
    if (error.status === 503) return "ระบบคำขอที่ปรึกษายังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ";
    if (error.status === 500) return "ระบบคำขอที่ปรึกษาเกิดข้อผิดพลาด (HTTP 500) กรุณาลองอีกครั้ง";
    if (!error.status) return "ไม่สามารถติดต่อระบบคำขอที่ปรึกษาได้ การเชื่อมต่อขัดข้องหรือหมดเวลา กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง";
    return "ระบบคำขอที่ปรึกษาตอบกลับข้อผิดพลาด กรุณาลองอีกครั้ง";
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
    const tableMode = listView.view === 'table'; container.classList.toggle('teacher-table-mode', tableMode);
    const table = tableMode && rows.length ? createTeacherTable(document, container, 'คำขอเป็นที่ปรึกษา', ['นักศึกษา', 'สาขาวิชา', 'ปีการศึกษา / ภาคเรียน', 'หัวข้อโครงการ', 'วันที่ส่งคำขอ', 'สถานะ', 'จัดการ']) : null;
    for (const row of rows) {
      const name = [row.student?.first_name, row.student?.last_name].filter(Boolean).join(" ") || "ไม่ระบุชื่อ";
      const state = STATUS_LABELS[row.status] ? row.status : "unknown";
      if (table) {
        const badge = element('div', ''); badge.append(teacherStatusBadge(document, STATUS_LABELS[state] || 'ไม่ทราบสถานะ', state, `teacher-status teacher-status--${state}`));
        if (row.status === 'confirmed') badge.append(element('span', `วันที่ยืนยัน ${date(row.confirmed_at)}`, 'teacher-table-note'));
        if (row.status === 'rejected') badge.append(element('span', `วันที่ปฏิเสธ ${date(row.rejected_at)} · เหตุผล: ${row.rejection_reason || '-'}`, 'teacher-table-note'));
        appendTeacherTableRow(document, table, [studentIdentity(document, name, row.student?.student_id), row.student?.major,
          academicPeriodText(row), row.topic, date(row.requested_at), badge, rowActions(row, name)]);
        continue;
      }
      const card = element("article", "", "teacher-request-card");
      card.append(teacherStatusBadge(document, STATUS_LABELS[state] || "ไม่ทราบสถานะ", state, `teacher-status teacher-status--${state}`), element("h2", name));
      const details = element("dl", "");
      const fields = [["รหัสนักศึกษา", row.student?.student_id], ["สาขา", row.student?.major], ["ปีการศึกษา / ภาคเรียน", academicPeriodText(row)], ["หัวข้อโครงการ", row.topic], ["วันที่ส่งคำขอ", date(row.requested_at)]];
      if (row.status === "confirmed") fields.push(["วันที่ยืนยัน", date(row.confirmed_at)]);
      if (row.status === "rejected") fields.push(["วันที่ปฏิเสธ", date(row.rejected_at)], ["เหตุผล", row.rejection_reason]);
      for (const [label, value] of fields) details.append(element("dt", label), element("dd", value || "-"));
      card.append(details);
      card.append(rowActions(row, name));
      container.append(card);
    }
    get("teacherPageNumber").textContent = rows.length ? `หน้า ${offset / listView.pageSize + 1}` : "";
    controls();
  }
  function rowActions(row, name) {
    const actions = element('div', '', 'teacher-request-actions'), open = element('button', 'ดูรายละเอียด', 'teacher-button'); open.type = 'button';
    open.setAttribute('aria-label', `ดูรายละเอียดคำขอ ${name} รหัส ${row.student?.student_id || '-'}`); open.addEventListener('click', () => openDetail(row.id, open)); actions.append(open);
    if (row.status === 'pending') actions.append(requestActions(row, name)); return actions;
  }
  function requestActions(row, name) {
    const actions = element('div', '', 'teacher-request-actions');
    for (const action of ['accept', 'reject']) {
      const label = action === 'accept' ? 'ยอมรับเป็นอาจารย์ที่ปรึกษา' : 'ปฏิเสธ';
      const button = element('button', label, `teacher-button teacher-button--${action}`); button.type = 'button';
      button.setAttribute('aria-label', `${label} ${name} รหัส ${row.student?.student_id || '-'}`);
      button.addEventListener('click', () => openDecision(row, action, name, button)); actions.append(button);
    }
    return actions;
  }
  async function refresh({ preserveMessage = false } = {}) {
    if (!authorized || !storage.getItem(TEACHER_TOKEN_KEY) || fetching) return false;
    const ticket = ++listSequence, token = storage.getItem(TEACHER_TOKEN_KEY);
    searchToolbar.loading();
    const currentList = () => ticket === listSequence && token === storage.getItem(TEACHER_TOKEN_KEY);
    fetching = true;
    hasNext = false;
    rows = [];
    render();
    if (!preserveMessage) say("กำลังโหลดคำขอ...");
    presentation.setState("loading");
    try {
      let result = await list({ status, offset, page_size: listView.pageSize, ...searchToolbar.query(), sort: listView.sort });
      if (!currentList()) return false;
      let data = result.rows || result;
      if (!Array.isArray(data)) throw new Error("Invalid request list");
      // A decision can remove the last row on this page; return to page one.
      if (!data.length && offset > 0) {
        offset = 0;
        result = await list({ status, offset, page_size: listView.pageSize, ...searchToolbar.query(), sort: listView.sort });
        if (!currentList()) return false;
        data = result.rows || result;
        if (!Array.isArray(data)) throw new Error("Invalid request list");
      }
      if (!storage.getItem(TEACHER_TOKEN_KEY)) { rows = []; render(); presentation.setState("error", { retry: false }); return false; }
      if (!Number.isInteger(result.total) || data.some(row => !['pending', 'confirmed', 'rejected'].includes(row.status))) throw Error('Invalid current request list contract');
      hasNext = offset + data.length < result.total;
      rows = data;
      render();
      searchToolbar.update(result);
      if (!preserveMessage) say(rows.length ? `แสดง ${rows.length} คำขอในหน้านี้` : 'ไม่มีคำขอตรงตามสถานะและเงื่อนไขที่เลือก');
      presentation.setState("ready", { count: rows.length, filtered: status !== "all" || searchToolbar.active(), pageable: offset > 0 || hasNext });
      return true;
    } catch (error) {
      if (!currentList()) return false;
      if (!authError(error)) say(errorText(error), "error");
      presentation.setState("error", { retry: authorized });
      return false;
    } finally {
      fetching = false;
      controls();
      openTask();
    }
  }
  function openDecision(row, action, name, button) {
    if (!authorized || !storage.getItem(TEACHER_TOKEN_KEY) || fetching || submitting || modalOpen || row.status !== "pending") return;
    modalOpen = true;
    controls();
    confirm({
      variant: action === 'accept' ? 'success' : 'danger',
      title: action === "accept" ? "ยืนยันรับเป็นอาจารย์ที่ปรึกษา" : "ปฏิเสธคำขอที่ปรึกษาโครงการ",
      message: `${action === "accept" ? "ยืนยันรับ" : "ยืนยันปฏิเสธ"}คำขอของ ${name} (${row.student?.student_id || "-"})`,
      confirmLabel: action === "accept" ? "ยืนยันรับเป็นที่ปรึกษา" : "ยืนยันปฏิเสธ",
      loadingLabel: "กำลังบันทึก...",
      returnFocus: button,
      parentModal: detailModal.isOpen ? detailModal : undefined,
      fallbackFocus: () => get('teacherRequestStatus'),
      reasonLabel: action === "reject" ? "เหตุผลที่ปฏิเสธ (จำเป็น)" : "",
      onClose: () => { modalOpen = false; controls(); if (detailModal.isOpen && detailId) openDetail(detailId); },
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
          if (!refreshed && authorized) say(`${success} แต่โหลดรายการล่าสุดไม่สำเร็จ กรุณากดลองโหลดอีกครั้ง`, "error");
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
  document.addEventListener("teacher:viewchange", event => {
    if (event.detail.view === "advisorRequests" && !submitting && !modalOpen) refresh();
  });
  get("teacherPrevious").addEventListener("click", async () => { if (fetching || submitting || modalOpen || offset === 0) return; offset = Math.max(0, offset - listView.pageSize); await refresh(); });
  get("teacherNext").addEventListener("click", async () => { if (fetching || submitting || modalOpen || !hasNext) return; offset += listView.pageSize; await refresh(); });
  get("teacherLogout").addEventListener("click", () => { storage.removeItem(TEACHER_TOKEN_KEY); location.replace("/login.html"); });
  const ready = (async () => {
    if (!storage.getItem(TEACHER_TOKEN_KEY)) { location.replace("/login.html"); return; }
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
      if (!authError(error)) { say("ตรวจสอบบัญชีอาจารย์ไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่", "error"); get("teacherSignIn").hidden = false; presentation.setState("error", { retry: false }); }
    } finally { controls(); }
  })();
  return { ready, refresh, openDetail };
}

if (typeof document !== "undefined") mountTeacherCoop({ document, storage: roleSessionStorage, location: window.location });
