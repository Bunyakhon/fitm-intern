import * as api from "../api/supervision.api.js";
import { roleSessionStorage } from "../auth/roleAuthStorage.js";
import { mountContentModal, showToast, showConfirmModal, setButtonLoading } from "../ui/feedback.js";
import { bangkokInputs, element, renderAppointment, renderAppointmentHistory } from "./supervisionView.js";
import { mountSupervisionResult } from "./supervisionResult.js";
import { createTeacherListPresentation } from "./teacherListPresentation.js";
import { mountTeacherSearchToolbar } from './teacherSearchToolbar.js';
import { mountTeacherListView, academicPeriodText, studentIdentity, createTeacherTable, appendTeacherTableRow } from './teacherListView.js';
import { teacherStatusBadge } from './teacherStatus.js';
export function mountTeacherSupervision({ document, storage, services = api, confirm = showConfirmModal, toast = showToast, loading = setButtonLoading, resultMount = typeof mountSupervisionResult === "function" ? mountSupervisionResult : null }) {
  const $ = id => document.getElementById(id), container = $("supervisionStudents");
  const presentation = createTeacherListPresentation({ document, list: container, message: $("supervisionMessage"), onRetry: () => refresh({ preserveDetail: true }), picker: $("teacherSupervisionPicker"), emptyTitle: "ยังไม่มีนักศึกษาในความดูแล", emptyDescription: "นักศึกษาที่คุณได้รับสิทธิ์เป็นอาจารย์นิเทศหรือที่ปรึกษาโครงการจะแสดงที่นี่" });
  let current = null, studentId = null, offset = 0, next = false, busy = false, sequence = 0, modal = false, rows = [];
  const resultWidgets = [];
  const studentCards = new Map();
  let scheduleDirty = false;
  const searchToolbar = mountTeacherSearchToolbar({ document, anchor: $('supervisionMessage'),
    placeholder: 'ค้นหานักศึกษาในความดูแล: ชื่อ รหัส หรือบริษัท', pageSize: () => listView.pageSize,
    onApply: () => { offset = 0; refresh({ preserveDetail: true }); } });
  const listView = mountTeacherListView({ document, summary: searchToolbar.summary, menu: 'teacherStudents', label: 'นักศึกษาในความดูแล', onChange: renderStudents,
    onSort: () => { offset = 0; refresh({ preserveDetail: true }); }, onPageSize: () => { offset = 0; refresh({ preserveDetail: true }); } });
  const pageNumber = document.createElement('span'); $('supervisionPrevious').after(pageNumber);
  const clearResults = () => { resultWidgets.splice(0).forEach(widget => widget.dispose()); };
  const say = (message, type = "info") => { $("supervisionMessage").textContent = message; $("supervisionMessage").dataset.type = type; };
  const target = document.defaultView;
  let popupId = null, popupRow = null, popupData = null, popupOpener = null, popupToken = null, popupVersion = 0, popupController, popupLoading = false, popupTimer;
  const studentModal = mountContentModal({ document, overlay: $('teacherStudentDetailOverlay'), panel: $('teacherStudentDetailDialog'), initialFocus: $('teacherStudentDetailClose'),
    returnFocus: () => popupOpener?.isConnected ? popupOpener : [...container.querySelectorAll('[data-student-open-id]')].find(node => node.dataset.studentOpenId === popupId),
    fallbackFocus: () => $('supervisionHeading'),
    onClose: () => { popupVersion++; popupController?.abort(); popupLoading = false; target.clearInterval(popupTimer); controls(); } });
  function inlineVisibility() {
    const studentView = document.body.dataset.teacherView === 'teacherStudents';
    $('supervisionDetail').hidden = !current || studentView;
    $('teacherStudentListHelp').textContent = studentView ? 'เลือกการ์ดหรือดูรายละเอียดเพื่อเปิดข้อมูลนักศึกษาในหน้าต่าง' : 'เลือกนักศึกษาเพื่อดูนัดหมาย ข้อมูลพี่เลี้ยง และผลนิเทศ';
  }
  function popupMessage(text, error = false) {
    const node = $('teacherStudentDetailMessage'); node.textContent = text; node.setAttribute('role', error ? 'alert' : 'status');
  }
  function popupFacts(entries) {
    const list = element(document, 'dl', '');
    for (const [label, value] of entries) list.append(element(document, 'dt', label), element(document, 'dd', value || 'ไม่ระบุ'));
    $('teacherStudentDetailBody').append(list);
  }
  function popupSession() {
    if (!popupToken || storage.getItem('teacherToken') === popupToken) return true;
    studentModal.close(); popupVersion++; popupController?.abort(); popupId = null; popupRow = popupData = null; popupToken = null;
    $('teacherStudentDetailBody').replaceChildren(); $('teacherStudentDetailHeading').textContent = 'รายละเอียดนักศึกษา'; $('teacherStudentDetailCode').textContent = '';
    clearResults(); studentCards.clear(); rows = []; current = null; studentId = null; sequence++; container.replaceChildren(); $('supervisionStudentSelect').replaceChildren(); inlineVisibility();
    say('เซสชันเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่ก่อนเปิดข้อมูลนักศึกษา', 'error'); controls(); return false;
  }
  async function openStudentPopup(row, opener) {
    if (busy || modal || !row || !storage.getItem('teacherToken') || document.body.dataset.teacherView !== 'teacherStudents'
      || (!studentModal.isOpen && document.body.classList.contains('has-app-modal'))) return;
    popupController?.abort(); popupId = row.id; popupRow = row; popupData = null; popupOpener = opener || popupOpener;
    if ([...$('supervisionStudentSelect').options].some(option => option.value === row.id)) $('supervisionStudentSelect').value = row.id;
    popupToken = storage.getItem('teacherToken'); const ticket = ++popupVersion, token = popupToken;
    popupController = new AbortController(); popupLoading = true;
    $('teacherStudentDetailHeading').textContent = `${row.first_name || ''} ${row.last_name || ''}`.trim(); $('teacherStudentDetailCode').textContent = `รหัสนักศึกษา ${row.student_id}`;
    $('teacherStudentDetailBody').replaceChildren(); $('teacherStudentDetailRetry').hidden = true; $('teacherStudentDetailScroll').scrollTop = 0;
    popupMessage('กำลังโหลดรายละเอียดนักศึกษา...'); studentModal.open(); target.clearInterval(popupTimer); popupTimer = target.setInterval(popupSession, 1000);
    for (const [id, card] of studentCards) card.root.classList.toggle('is-selected', id === popupId);
    controls();
    try {
      const result = await services.getSupervisionStudent(row.id, { signal: popupController.signal });
      if (ticket !== popupVersion || !studentModal.isOpen || popupId !== row.id || !popupSession() || storage.getItem('teacherToken') !== token) return;
      if (result.student?.id !== row.id || !Array.isArray(result.requests)) throw Error('ข้อมูลนักศึกษาไม่ตรงกับรายการที่เลือก กรุณาลองใหม่');
      popupData = result;
      const placement = result.requests.find(request => request.id === row.academicRequestId);
      const mentor = result.mentor, verified = mentor?.status === 'verified' && mentor.verified_at;
      $('teacherStudentDetailHeading').textContent = result.student.name; $('teacherStudentDetailCode').textContent = `รหัสนักศึกษา ${result.student.code}`;
      popupFacts([['สาขาวิชา', result.student.major || row.major], ['ปีการศึกษา / ภาคเรียน', academicPeriodText({ academicPeriod: placement?.academicPeriod || null })],
        ['หัวข้อโครงการ', result.student.topic], ['สถานประกอบการ', placement?.company_name || result.requests.map(request => request.company_name).filter(Boolean).join(' / ')],
        ['พี่เลี้ยง', mentor ? `${mentor.first_name} ${mentor.last_name}` : 'ยังไม่มีข้อมูลพี่เลี้ยง'], ['ตำแหน่งพี่เลี้ยง', mentor?.position], ['อีเมลพี่เลี้ยง', mentor?.email],
        ['การยืนยันพี่เลี้ยง', verified ? 'ยืนยันข้อมูลแล้ว' : mentor ? 'ยังไม่ยืนยันข้อมูล' : 'ยังไม่มีข้อมูลพี่เลี้ยง']]);
      popupMessage('รายละเอียดนักศึกษาในความดูแล');
      const selectedCard = studentCards.get(row.id);
      if (selectedCard?.mentor) selectedCard.mentor.textContent = mentorText(result);
      if (selectedCard?.company) selectedCard.company.textContent = placement?.company_name || result.requests.map(request => request.company_name).filter(Boolean).join(' / ') || 'ยังไม่มีสถานประกอบการที่ยืนยันได้';
    } catch (err) {
      if (ticket !== popupVersion || !studentModal.isOpen || !popupSession() || storage.getItem('teacherToken') !== token) return;
      popupData = null;
      if ([401, 403].includes(err.status)) error(err);
      popupMessage([401, 403].includes(err.status) ? 'เซสชันหมดอายุหรือไม่มีสิทธิ์ดูนักศึกษาคนนี้' : err.status === 404 ? 'ไม่พบนักศึกษาในความดูแลหรือสิทธิ์เข้าถึงเปลี่ยนแล้ว' : 'โหลดรายละเอียดไม่สำเร็จ กรุณาลองใหม่', true);
      $('teacherStudentDetailRetry').hidden = [401, 403].includes(err.status);
    } finally { if (ticket === popupVersion) { popupLoading = false; controls(); } }
  }
  $('teacherStudentDetailClose').addEventListener('click', () => studentModal.close());
  $('teacherStudentDetailCloseBottom').addEventListener('click', () => studentModal.close());
  $('teacherStudentDetailRetry').addEventListener('click', () => { if (!popupLoading && popupRow) openStudentPopup(popupRow, popupOpener); });
  async function openWorkflow(view) {
    if (popupLoading || !popupData || busy || modal || !popupSession()) return;
    const id = popupId, token = storage.getItem('teacherToken'); studentModal.close();
    if (((studentId === id && current) || await detail(id)) && popupId === id && storage.getItem('teacherToken') === token && target.location.hash === '#teacherStudents') {
      target.location.hash = `#${view}`; // Explicit footer click only; never navigate from a load response.
    }
  }
  $('teacherStudentGoScheduling').addEventListener('click', () => openWorkflow('supervisionScheduling'));
  $('teacherStudentGoResults').addEventListener('click', () => openWorkflow('supervisionResults'));
  target.addEventListener('storage', popupSession); target.addEventListener('focus', popupSession);
  target.addEventListener('hashchange', () => { if (target.location.hash !== '#teacherStudents') studentModal.close(); });
  target.addEventListener('pagehide', () => { studentModal.close(); popupVersion++; popupController?.abort(); target.clearInterval(popupTimer); });
  function controls() {
    const disabled = busy || modal || studentModal.isOpen || !storage.getItem("teacherToken");
    searchToolbar.setBusy(disabled);
    listView.setBusy(disabled);
    for (const id of ["supervisionSave", "supervisionStudentSelect"]) $(id).disabled = disabled;
    $("supervisionPrevious").disabled = disabled || offset === 0; $("supervisionNext").disabled = disabled || !next;
    $("supervisionFieldset").disabled = disabled; container.querySelectorAll("button").forEach(b => { b.disabled = disabled; });
    container.setAttribute('aria-busy', String(busy));
    $('teacherStudentDetailDialog').setAttribute('aria-busy', String(popupLoading));
    $('teacherStudentDetailRetry').disabled = popupLoading || !storage.getItem('teacherToken');
    for (const id of ['teacherStudentGoScheduling', 'teacherStudentGoResults']) { $(id).hidden = !popupData; $(id).disabled = popupLoading || busy || modal || !storage.getItem('teacherToken'); }
  }
  function error(err) {
    say(err.message, "error");
    if ([401, 403].includes(err.status)) { clearResults(); studentCards.clear(); rows = []; storage.removeItem("teacherToken"); current = null; studentId = null; ++sequence; container.replaceChildren(); $("supervisionDetail").hidden = true; $("supervisionStudentSelect").replaceChildren(); }
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
    clearResults(); busy = true; const ticket = ++sequence, token = storage.getItem('teacherToken'); current = null; studentId = id; $("supervisionDetail").hidden = true; controls(); say("กำลังโหลดข้อมูลนัดหมาย...");
    try {
      const result = await services.getSupervisionStudent(id); if (ticket !== sequence || storage.getItem('teacherToken') !== token) return false;
      if (result.student?.id !== id) throw Error('ข้อมูลนักศึกษาไม่ตรงกับรายการที่เลือก กรุณาโหลดใหม่');
      current = result; $("supervisionStudentName").textContent = `${result.student.name} · ${result.student.code}`;
      $("supervisionStudentSelect").value = id;
      for (const [key, card] of studentCards) card.root.classList.toggle("is-selected", key === id);
      const selectedCard = studentCards.get(id);
      if (selectedCard) selectedCard.company.textContent = result.requests.length === 1 ? result.requests[0].company_name : "ยังไม่มีสถานประกอบการที่ยืนยันได้เพียงรายการเดียว";
      if (selectedCard?.mentor) selectedCard.mentor.textContent = mentorText(result);
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
      renderAppointmentHistory($("supervisionHistory"), result.history); edit(); inlineVisibility(); say("โหลดข้อมูลนักศึกษาแล้ว เลือกงานนัดหมายหรือผลนิเทศจากเมนูเพื่อดำเนินการต่อ"); return true;
    } catch (err) { if (ticket !== sequence || storage.getItem('teacherToken') !== token) return false; error(err); return false; }
    finally { busy = false; controls(); }
  }
  async function refresh({ preserveDetail = false } = {}) {
    if (busy || modal || !storage.getItem("teacherToken")) return;
    const keepDetail = preserveDetail && !!current;
    searchToolbar.loading();
    searchToolbar.setLoading(true);
    if (!keepDetail) { clearResults(); current = null; studentId = null; $("supervisionDetail").hidden = true; }
    studentCards.clear(); rows = []; busy = true; const ticket = ++sequence, token = storage.getItem('teacherToken'); container.replaceChildren(); controls(); say("กำลังโหลดนักศึกษาในความดูแล...");
    presentation.setState("loading");
    try {
      const query = { ...searchToolbar.query(), sort: listView.sort, page_size: listView.pageSize };
      let result = await services.listSupervisionStudents(offset, query);
      if (ticket !== sequence || storage.getItem('teacherToken') !== token) return;
      if (!result.students.length && offset) { offset = 0; result = await services.listSupervisionStudents(offset, query); }
      if (ticket !== sequence || storage.getItem('teacherToken') !== token) return;
      if (!storage.getItem("teacherToken")) { presentation.setState("error", { retry: false }); return; }
      if (!Array.isArray(result.students) || !Number.isInteger(result.total) || new Set(result.students.map(row => row.id)).size !== result.students.length) throw Error('ข้อมูลรายการนักศึกษาไม่ถูกต้อง กรุณาโหลดใหม่');
      next = offset + result.students.length < result.total; const select = $("supervisionStudentSelect"); select.replaceChildren();
      rows = result.students;
      pageNumber.textContent = rows.length ? `หน้า ${offset / listView.pageSize + 1}` : '';
      const blank = element(document, "option", "เลือกนักศึกษาในความดูแล"); blank.value = ""; select.append(blank);
      for (const row of rows) {
        const studentName = `${row.first_name} ${row.last_name}`;
        const option = element(document, "option", `${studentName} · ${row.student_id}`); option.value = row.id; select.append(option);
      }
      renderStudents();
      if (keepDetail) {
        if (![...select.options].some(option => option.value === studentId)) {
          const selected = element(document, "option", `${current.student.name} · ${current.student.code}`); selected.value = studentId; select.append(selected);
        }
        select.value = studentId;
      }
      const studentView = document.body.dataset.teacherView === 'teacherStudents';
      if (studentView && [...select.options].some(option => option.value === popupId)) select.value = popupId;
      say(result.students.length ? studentView ? 'เลือกนักศึกษาเพื่อเปิดรายละเอียดในหน้าต่าง' : "เลือกนักศึกษาเพื่อนัดนิเทศครั้งที่ 1 หรือ 2" : "ยังไม่มีนักศึกษาที่คุณเป็นอาจารย์นิเทศ / ที่ปรึกษาโครงการ");
      searchToolbar.update(result);
      presentation.setState("ready", { count: result.students.length, filtered: searchToolbar.active(), pageable: offset > 0 || next });
    } catch (err) { if (ticket !== sequence || storage.getItem('teacherToken') !== token) return; error(err); presentation.setState("error", { retry: !!storage.getItem("teacherToken") }); } finally { busy = false; searchToolbar.setLoading(false); controls(); }
  }
  function mentorText(context) {
    if (!context) return 'เปิดรายละเอียดเพื่อดูพี่เลี้ยง';
    const mentor = context.mentor;
    return mentor ? `${mentor.first_name} ${mentor.last_name} · ${mentor.status === 'verified' && mentor.verified_at ? 'ยืนยันข้อมูลแล้ว' : 'ยังไม่ยืนยันข้อมูล'}` : 'ยังไม่มีข้อมูลพี่เลี้ยง';
  }
  function renderStudents() {
    container.replaceChildren(); studentCards.clear();
    const statuses = { pending: 'รอดำเนินการ', searching: 'กำลังหาสถานประกอบการ', placed: 'มีสถานประกอบการแล้ว', in_progress: 'กำลังปฏิบัติงาน', completed: 'เสร็จสิ้น' };
    const studentView = document.body.dataset.teacherView === 'teacherStudents';
    const tableMode = studentView && listView.view === 'table'; container.classList.toggle('teacher-table-mode', tableMode);
    const table = tableMode && rows.length ? createTeacherTable(document, container, 'นักศึกษาในความดูแล', ['นักศึกษา', 'สาขาวิชา', 'ปีการศึกษา / ภาคเรียน', 'สถานประกอบการ', 'พี่เลี้ยง / สถานะยืนยัน', 'สถานะนักศึกษา', 'จัดการ']) : null;
    for (const row of rows) {
      const studentName = `${row.first_name} ${row.last_name}`, selected = row.id === (studentView ? popupId || studentId : studentId);
      const context = studentView && popupData?.student?.id === row.id ? popupData : current?.student?.id === row.id ? current : null;
      const company = element(document, 'p', context ? context.requests.length === 1 ? context.requests[0].company_name : 'ยังไม่มีสถานประกอบการที่ยืนยันได้เพียงรายการเดียว' : 'เปิดรายละเอียดเพื่อดูสถานประกอบการ', 'teacher-student-company');
      const mentor = element(document, 'span', mentorText(context));
      const open = element(document, 'button', 'ดูรายละเอียด', 'teacher-button'); open.type = 'button';
      open.dataset.studentOpenId = row.id;
      open.setAttribute('aria-label', `ดูรายละเอียด ${studentName} รหัส ${row.student_id}`);
      open.addEventListener('click', async () => {
        if (busy || modal) return;
        if (document.body.dataset.teacherView === 'teacherStudents') { openStudentPopup(row, open); return; }
        // Both representations enter the existing detail. Do not reload a
        // selected student and destroy mounted schedule/result drafts.
        if ((studentId === row.id && current) || await detail(row.id)) {
          $('supervisionStudentName').setAttribute('tabindex', '-1'); $('supervisionStudentName').focus({ preventScroll: true });
          $('supervisionDetail').scrollIntoView?.({ block: 'start', behavior: target.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
      });
      let root;
      if (table) {
        root = appendTeacherTableRow(document, table, [studentIdentity(document, studentName, row.student_id), row.major,
          academicPeriodText(row), company, mentor, teacherStatusBadge(document, statuses[row.status] || 'ไม่ระบุสถานะ', row.status, 'teacher-neutral-badge'), open]);
      } else {
        root = element(document, 'article', '', 'teacher-student-card');
        const identity = element(document, 'div', '', 'teacher-student-identity');
        identity.append(element(document, 'span', (row.first_name || 'น').slice(0, 1), 'teacher-student-avatar'), element(document, 'h3', studentName));
        root.append(identity, element(document, 'p', `รหัสนักศึกษา ${row.student_id}`, 'teacher-student-code'));
        if (studentView) root.append(element(document, 'p', `สาขา ${row.major || 'ไม่ระบุ'} · ${academicPeriodText(row)}`, 'teacher-student-code'));
        root.append(element(document, 'span', 'ที่ปรึกษาโครงการ / อาจารย์นิเทศ', 'teacher-neutral-badge'), teacherStatusBadge(document, statuses[row.status] || 'ไม่ระบุสถานะ', row.status, 'teacher-neutral-badge'), company, open); container.append(root);
        if (studentView) { root.dataset.studentPopup = row.id; root.addEventListener('click', event => { if (!event.target.closest('button,a,input,select,textarea')) openStudentPopup(row, open); }); }
      }
      root.classList.toggle('is-selected', selected); studentCards.set(row.id, { root, company, mentor });
    }
    controls();
  }
  function mutation(title, message, operation) {
    if (busy || modal || studentModal.isOpen || !current || !storage.getItem("teacherToken")) return;
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
    const studentViewChanged = view === 'teacherStudents' || previousView === 'teacherStudents';
    previousView = view;
    if (view !== 'teacherStudents') studentModal.close();
    inlineVisibility();
    if (studentViewChanged) renderStudents();
    if (view === 'teacherStudents' && [...$('supervisionStudentSelect').options].some(option => option.value === popupId)) $('supervisionStudentSelect').value = popupId;
    if (!entering || busy || modal) return;
    // Update only the list while drafts are mounted. Reload a clean detail only
    // after checking again: a result form may have changed during the list read.
    await refresh({ preserveDetail: true });
    if (['supervisionScheduling', 'supervisionResults'].includes(document.body.dataset.teacherView) && current && !scheduleDirty && !resultWidgets.some(widget => widget.hasPendingChanges?.())) await detail(studentId);
  });
  $("supervisionStudentSelect").addEventListener("change", event => {
    if (document.body.dataset.teacherView === 'teacherStudents') { const row = rows.find(student => student.id === event.target.value); if (row) openStudentPopup(row, event.target); return; }
    if (event.target.value) detail(event.target.value); else { ++sequence; current = null; studentId = null; $("supervisionDetail").hidden = true; }
  });
  $("supervisionPrevious").addEventListener("click", () => { if (!busy && !modal && offset) { offset = Math.max(0, offset - listView.pageSize); refresh({ preserveDetail: true }); } });
  $("supervisionNext").addEventListener("click", () => { if (!busy && !modal && next) { offset += listView.pageSize; refresh({ preserveDetail: true }); } });
  $("teacherLogout").addEventListener("click", () => { studentModal.close(); popupVersion++; popupController?.abort(); target.clearInterval(popupTimer); popupId = null; popupRow = popupData = null; $('teacherStudentDetailBody').replaceChildren(); clearResults(); studentCards.clear(); rows = []; ++sequence; current = null; studentId = null; $("supervisionDetail").hidden = true; container.replaceChildren(); });
  inlineVisibility(); const ready = refresh(); return { ready, refresh, detail };
}
if (typeof document !== "undefined") mountTeacherSupervision({ document, storage: roleSessionStorage });
