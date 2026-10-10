import { STAFF_TOKEN_KEY, getCurrentStaff } from '../api/staffDocuments.api.js';
import { getStaffCoopRequests, getStaffCoopRequest, cancelStaffCoopRequest } from '../api/staffCoopRequests.api.js';
import { showConfirmModal, showToast, setButtonLoading } from '../ui/feedback.js';

const PAGE_SIZE = 25;
const STATUS = { submitted: 'ยื่นคำร้องแล้ว', staff_review: 'รอตรวจสอบ (เดิม)', advisor_review: 'รออาจารย์ที่ปรึกษา', department_head_review: 'รอหัวหน้าภาควิชา', approved: 'อนุมัติแล้ว', document_issued: 'ออกเอกสารแล้ว', in_progress: 'กำลังปฏิบัติงาน', rejected: 'ไม่ได้รับการอนุมัติ', cancelled: 'ยกเลิกแล้ว' };
const ROLES = { student: 'นักศึกษา', teacher: 'อาจารย์ที่ปรึกษา', department_head: 'หัวหน้าภาควิชา', department_staff: 'เจ้าหน้าที่' };
const DECISIONS = { submit: 'ยื่นคำร้อง', approve: 'อนุมัติ', reject: 'ไม่อนุมัติ', cancel: 'ยกเลิก' };

export function mountStaffCoopRequests({ document, storage, location, me = getCurrentStaff, list = getStaffCoopRequests, detail = getStaffCoopRequest, cancel = cancelStaffCoopRequest, confirm = showConfirmModal, toast = showToast, loading = setButtonLoading }) {
  const get = id => document.getElementById(id), root = get('staffCoopList'), panel = get('staffCoopDetail'), body = get('staffCoopDetailBody');
  const token = storage.getItem(STAFF_TOKEN_KEY);
  let authorized = false, fetching = false, reading = false, submitting = false, modalOpen = false, offset = 0, hasNext = false, current = null, detailId = null, sequence = 0, closeModal;
  const live = () => authorized && !!token && storage.getItem(STAFF_TOKEN_KEY) === token;
  const name = row => [row.student?.first_name, row.student?.last_name].filter(Boolean).join(' ') || '-';
  const date = value => value && Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : '-';
  function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  function say(text, error = false) { get('staffCoopMessage').textContent = text; get('staffCoopMessage').setAttribute('role', error ? 'alert' : 'status'); }
  function clearDetail() { sequence++; current = null; body.replaceChildren(); get('staffCoopDetailMessage').textContent = ''; }
  function revoke() { authorized = false; storage.removeItem(STAFF_TOKEN_KEY); root.replaceChildren(); clearDetail(); panel.hidden = true; closeModal?.(); controls(); location.replace('/staff-login.html'); }
  function auth(error) { if ([401, 403].includes(error.status)) { revoke(); return true; } return false; }
  function failure(error) {
    if (error.status === 400) return 'ข้อมูลไม่ถูกต้อง กรุณาระบุเหตุผลไม่เกิน 2000 ตัวอักษร';
    if ([404, 409].includes(error.status)) return 'คำร้องเปลี่ยนแปลงแล้ว กรุณาตรวจสอบรายละเอียดล่าสุดก่อนยกเลิก';
    return 'ดำเนินการไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง';
  }
  function controls() {
    const busy = !live() || fetching || reading || submitting || modalOpen;
    for (const id of ['staffCoopSearch', 'staffCoopStatus', 'staffCoopSearchButton', 'staffCoopRefresh']) get(id).disabled = busy;
    get('staffCoopPrev').disabled = busy || offset === 0; get('staffCoopNext').disabled = busy || !hasNext;
    get('staffCoopDetailClose').disabled = reading || submitting || modalOpen;
    for (const button of root.querySelectorAll('button')) button.disabled = busy;
    get('staffCoopCancel').disabled = busy || current?.cancellation?.allowed !== true;
    root.setAttribute('aria-busy', String(fetching)); panel.setAttribute('aria-busy', String(reading || submitting));
  }
  function renderRows(rows) {
    root.replaceChildren();
    for (const row of rows) {
      const card = node('article', undefined, 'teacher-request-card');
      card.append(node('h3', name(row)), node('p', `${row.student?.student_id || '-'} · ${row.student?.major || '-'}`), node('p', row.company_name || '-'), node('p', STATUS[row.status] || row.status, 'teacher-status'));
      const button = node('button', 'ดูคำร้อง / ยกเลิก', 'teacher-button'); button.type = 'button'; button.addEventListener('click', () => openDetail(row.id)); card.append(button); root.append(card);
    }
  }
  async function refresh() {
    if (!live() || fetching) return false;
    fetching = true; hasNext = false; root.replaceChildren(); controls(); say('กำลังโหลดคำร้อง...');
    try {
      const query = { offset, limit: PAGE_SIZE + 1 };
      if (get('staffCoopStatus').value) query.status = get('staffCoopStatus').value;
      if (get('staffCoopSearch').value.trim()) query.search = get('staffCoopSearch').value.trim();
      const response = await list(query); if (!live()) return false;
      if (!Array.isArray(response.data)) throw Error('Invalid list');
      if (!response.data.length && offset > 0) { offset = Math.max(0, offset - PAGE_SIZE); fetching = false; return refresh(); }
      hasNext = response.data.length > PAGE_SIZE; renderRows(response.data.slice(0, PAGE_SIZE)); get('staffCoopPage').textContent = `หน้า ${offset / PAGE_SIZE + 1}`;
      say(response.data.length ? '' : 'ยังไม่มีคำร้องตรงกับตัวกรอง'); return true;
    } catch (error) { if (!auth(error) && live()) say('โหลดคำร้องไม่สำเร็จ กรุณารีเฟรชเพื่อลองใหม่', true); return false; }
    finally { fetching = false; controls(); }
  }
  function renderDetail(data) {
    const row = data.request, grid = node('dl', undefined, 'staff-detail-grid'); body.replaceChildren();
    for (const [label, value] of [['นักศึกษา', name(row)], ['รหัสนักศึกษา', row.student?.student_id], ['คำร้อง', row.id], ['สถานะคำร้อง', STATUS[row.status] || row.status], ['สถานประกอบการ', row.company_name], ['ที่อยู่ตามคำร้อง', row.company_address], ['จังหวัด', row.company_province], ['ผู้รับหนังสือ', row.letter_recipient_name], ['ช่วงปฏิบัติงาน', `${row.work_start_date || '-'} – ${row.work_end_date || '-'}`], ['ยกเลิกเมื่อ', date(row.cancelled_at)]]) grid.append(node('dt', label), node('dd', value || '-'));
    body.append(grid, node('h3', 'ประวัติคำร้อง'));
    for (const review of data.reviews || []) {
      const actor = review.staff || review.teacher;
      const actorName = actor ? [actor.academic_title, actor.first_name, actor.last_name].filter(Boolean).join(' ') : ROLES[review.actor_role] || '-';
      body.append(node('p', `${actorName} · ${DECISIONS[review.decision] || review.decision} · ${STATUS[review.from_status] || review.from_status} → ${STATUS[review.to_status] || review.to_status} · ${date(review.createdAt)}${review.reason ? ` · ${review.reason}` : ''}`));
    }
    get('staffCoopDetailMessage').textContent = data.cancellation?.allowed === true ? 'ยกเลิกได้เฉพาะคำร้องที่ยังรอพิจารณา ต้องระบุเหตุผลและยืนยัน' : 'สถานะนี้ยกเลิกไม่ได้ คำร้องที่อนุมัติแล้ว ออกเอกสารแล้ว หรือกำลังปฏิบัติงานไม่อยู่ในขอบเขตการยกเลิก';
  }
  async function openDetail(id) {
    if (!live() || reading || (modalOpen && !submitting)) return false;
    clearDetail(); detailId = id; panel.hidden = false; reading = true; const ticket = sequence; controls(); get('staffCoopDetailMessage').textContent = 'กำลังโหลดรายละเอียด...';
    try {
      const response = await detail(id); if (!live() || ticket !== sequence) return false;
      if (!response.data?.request) throw Error('Invalid detail');
      current = response.data; renderDetail(current); get('staffCoopDetailHeading').focus(); return true;
    } catch (error) { if (!auth(error) && live() && ticket === sequence) get('staffCoopDetailMessage').textContent = 'โหลดรายละเอียดไม่สำเร็จ กรุณาเปิดคำร้องอีกครั้ง'; return false; }
    finally { if (ticket === sequence) { reading = false; controls(); } }
  }
  function askCancel() {
    if (!live() || submitting || modalOpen || reading || fetching || current?.cancellation?.allowed !== true) return;
    const row = current.request, id = detailId, state = current.cancellation;
    if (!state.expected_status || !state.expected_updated_at) { toast('กรุณาโหลดรายละเอียดล่าสุดก่อนยกเลิก', 'warning'); return; }
    const returnFocus = get('staffCoopCancel');
    // Resolve again after close in case the opener was replaced or is no longer eligible.
    const fallbackFocus = () => {
      const button = get('staffCoopCancel');
      return button && !button.disabled ? button : get('staffCoopDetailHeading');
    };
    modalOpen = true; controls();
    closeModal = confirm({ returnFocus, fallbackFocus, title: 'ยืนยันยกเลิกคำร้องสหกิจศึกษา', message: `${name(row)} · ${row.student?.student_id || '-'} · คำร้อง ${id} · ${STATUS[row.status] || row.status} การยกเลิกจะหยุดการพิจารณาคำร้องนี้ นักศึกษาจะเห็นสถานะยกเลิก ประวัติเดิมยังคงอยู่`, reasonLabel: 'เหตุผลการยกเลิก (จำเป็น)', reasonMaxLength: 2000, confirmLabel: 'ยืนยันยกเลิกคำร้อง', cancelLabel: 'ย้อนกลับ', loadingLabel: 'กำลังยกเลิก...', onClose: () => { modalOpen = false; closeModal = undefined; controls(); }, onConfirm: async reason => {
      if (!live()) return true;
      if (submitting) return false;
      if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 2000) throw Error('กรุณาระบุเหตุผลไม่เกิน 2000 ตัวอักษร');
      submitting = true; loading(get('staffCoopCancel'), true, 'กำลังยกเลิก...'); controls();
      try {
        await cancel(id, { reason: reason.trim(), expected_status: state.expected_status, expected_updated_at: state.expected_updated_at });
        if (!live()) return true;
        toast('ยกเลิกคำร้องแล้ว', 'success');
        const results = await Promise.all([refresh(), openDetail(id)]);
        if (results.some(result => !result) && live()) toast('ยกเลิกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณารีเฟรช', 'warning');
        return true;
      } catch (error) {
        if (auth(error) || !live()) return true;
        if ([404, 409].includes(error.status)) { toast(failure(error), 'warning'); await Promise.all([refresh(), openDetail(id)]); return true; }
        toast(failure(error), 'error'); throw Error(failure(error));
      } finally { submitting = false; loading(get('staffCoopCancel'), false, 'กำลังยกเลิก...'); controls(); }
    } });
  }
  get('staffCoopCancel').addEventListener('click', askCancel);
  get('staffCoopDetailClose').addEventListener('click', () => { if (reading || submitting || modalOpen) return; clearDetail(); panel.hidden = true; detailId = null; controls(); });
  get('staffCoopSearchForm').addEventListener('submit', event => { event.preventDefault(); if (!live() || fetching || reading || submitting || modalOpen) return; offset = 0; return refresh(); });
  get('staffCoopStatus').addEventListener('change', () => { if (!live() || fetching || reading || submitting || modalOpen) return; offset = 0; return refresh(); });
  get('staffCoopRefresh').addEventListener('click', () => { if (reading || submitting || modalOpen) return; return refresh(); });
  for (const [id, delta] of [['staffCoopPrev', -PAGE_SIZE], ['staffCoopNext', PAGE_SIZE]]) get(id).addEventListener('click', () => { if (!live() || fetching || reading || submitting || modalOpen || (delta < 0 ? offset === 0 : !hasNext)) return; offset += delta; return refresh(); });
  get('staffLogout').addEventListener('click', revoke);
  controls();
  const ready = (async () => {
    if (!token) { revoke(); return; }
    try { const response = await me(); if (storage.getItem(STAFF_TOKEN_KEY) !== token) return; if (!response.data?.id || response.data.is_active !== true) { revoke(); return; } authorized = true; await refresh(); }
    catch (error) { if (!auth(error)) say('ตรวจสอบบัญชีเจ้าหน้าที่ไม่สำเร็จ กรุณาโหลดหน้าใหม่', true); }
  })();
  return { ready, refresh, openDetail };
}
if (typeof document !== 'undefined' && document.getElementById('staffCoopList')) mountStaffCoopRequests({ document, storage: sessionStorage, location: window.location });
