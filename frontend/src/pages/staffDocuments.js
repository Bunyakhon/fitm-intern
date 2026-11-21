import { roleSessionStorage } from "../auth/roleAuthStorage.js";
import { STAFF_TOKEN_KEY, staffRequest, getCurrentStaff, getDocumentQueue, getDocumentRequest, saveStaffDocument, getStaffDocumentContent, saveCompanyResponse } from '../api/staffDocuments.api.js';
import { getStaffCoopRequests } from '../api/staffCoopRequests.api.js';
import { listActivities } from '../api/coopActivities.api.js';
import { showConfirmModal, showToast, setButtonLoading } from '../ui/feedback.js';
const PAGE_SIZE = 25;
const STATUS = { approved: 'อนุมัติแล้ว', document_issued: 'ออกเอกสารแล้ว', in_progress: 'กำลังปฏิบัติงาน', advisor_review: 'รออาจารย์ที่ปรึกษา', department_head_review: 'รอหัวหน้าภาควิชา', rejected: 'ไม่ได้รับการอนุมัติ', cancelled: 'ยกเลิกแล้ว' };
const DOCUMENT_STATUS = { draft: 'ร่าง', generated: 'มีฉบับตัวอย่าง' };
const DECISIONS = { submit: 'ยื่นคำร้อง', approve: 'อนุมัติ', reject: 'ไม่อนุมัติ', cancel: 'ยกเลิก' };
const ROLES = { student: 'นักศึกษา', teacher: 'อาจารย์ที่ปรึกษา', department_head: 'หัวหน้าภาควิชา', department_staff: 'เจ้าหน้าที่' };
const ACTIONS = { create: 'สร้างร่าง', edit: 'แก้ไขร่าง', generate: 'สร้างฉบับตัวอย่าง', regenerate: 'สร้างฉบับใหม่' };
const RESPONSE_STATUS = { accepted: 'ตอบรับ', rejected: 'ปฏิเสธ' };
const DOCUMENT_TITLES = { cooperation: 'หนังสือขอความอนุเคราะห์', placement: 'หนังสือส่งตัวนักศึกษา' };
const FIELDS = { 'student.first_name': 'ชื่อนักศึกษา', 'student.last_name': 'นามสกุลนักศึกษา', 'student.student_id': 'รหัสนักศึกษา', 'student.major': 'สาขา', 'request.company_name': 'ชื่อสถานประกอบการ', 'request.company_address': 'ที่อยู่สถานประกอบการ', 'request.company_province': 'จังหวัด', 'request.letter_recipient_name': 'ผู้รับหนังสือ', 'request.work_start_date': 'วันเริ่มปฏิบัติงาน', 'request.work_end_date': 'วันสิ้นสุดปฏิบัติงาน', 'request.work_period': 'ช่วงเวลาปฏิบัติงาน', 'approval.class': 'หลักฐานอนุมัติจากอาจารย์ที่ปรึกษา', 'approval.head': 'หลักฐานอนุมัติจากหัวหน้าภาควิชา' };
export function mountStaffDocuments({ document, storage, location, me = getCurrentStaff, list = getDocumentQueue, detail = getDocumentRequest, save = saveStaffDocument, content = getStaffDocumentContent, responseSave = saveCompanyResponse, confirm = showConfirmModal, toast = showToast, loading = setButtonLoading, url = URL, download = (blob, name) => {
  const resource = URL.createObjectURL(blob), link = document.createElement('a'); link.href = resource; link.download = name; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(resource), 30000);
} }) {
  const get = id => document.getElementById(id), message = get('staffMessage'), panel = get('staffDetail'), form = get('staffDocumentForm');
  let authorized = false, fetching = false, detailLoading = false, submitting = false, modalOpen = false, offset = 0, hasNext = false, detailId = null, current = null, previewUrl = null, detailSequence = 0;
  let selectedType = 'cooperation';
  const token = storage.getItem(STAFF_TOKEN_KEY);
  const live = () => authorized && !!token && storage.getItem(STAFF_TOKEN_KEY) === token;
  function say(text, error = false) { message.textContent = text; message.setAttribute('role', error ? 'alert' : 'status'); }
  function date(value) { return value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-'; }
  function clearPreview() { if (previewUrl) url.revokeObjectURL(previewUrl); previewUrl = null; get('staffPreviewFrame').src = 'about:blank'; get('staffPreviewFrame').hidden = true; }
  function clearDetail() { detailSequence++; current = null; form.hidden = true; get('staffCompanyResponseForm').hidden = true; get('staffCompanyResponseState').textContent = ''; get('staffCompanyResponseHistory').replaceChildren(); for (const id of ['staffCompanyRespondedAt', 'staffCompanyResponseNote', 'staffCompanyCorrectionReason']) get(id).value = ''; get('staffDetailBody').replaceChildren(); get('staffDocumentHistory').replaceChildren(); get('staffDetailMessage').textContent = ''; get('staffDocumentState').textContent = ''; get('staffPlacementStatus').textContent = ''; for (const id of ['staffDocumentNumber', 'staffIssueDate', 'staffSignatoryName', 'staffSignatoryPosition', 'staffNotes']) get(id).value = ''; clearPreview(); }
  function revoke() { authorized = false; storage.removeItem(STAFF_TOKEN_KEY); get('staffDocumentList').replaceChildren(); clearDetail(); panel.hidden = true; get('staffName').textContent = ''; controls(); location.replace('/login.html'); }
  function errorMessage(error) { return error.data?.missing_fields?.length ? `${error.message}: ${error.data.missing_fields.map(field => FIELDS[field] || 'ข้อมูลเอกสาร').join(', ')}` : error.message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่'; }
  function handle(error) { if ([401, 403].includes(error.status)) { revoke(); return true; } return false; }
  function controls() {
    const blocked = !live() || fetching || detailLoading || submitting || modalOpen;
    for (const id of ['staffSearch', 'staffStatus', 'staffDocumentStatus', 'staffSearchButton', 'staffRefresh']) get(id).disabled = blocked;
    get('staffPrev').disabled = blocked || offset === 0; get('staffNext').disabled = blocked || !hasNext;
    for (const button of get('staffDocumentList').querySelectorAll('button')) button.disabled = blocked;
    const eligible = current?.eligible && !current.missing_fields?.length && (selectedType !== 'placement' || current.placement?.available === true);
    for (const input of form.querySelectorAll('input, textarea')) input.disabled = blocked || !eligible;
    get('staffSave').disabled = blocked || !eligible;
    const doc = current?.documents?.find(row => row.document_type === selectedType);
    get('staffGenerate').disabled = blocked || !eligible || !doc;
    for (const id of ['staffPreview', 'staffDownload']) get(id).disabled = blocked || doc?.status !== 'generated';
    get('staffPrint').disabled = blocked || !previewUrl;
    get('staffPlacementCreate').disabled = blocked || current?.placement?.available !== true;
    get('staffDocumentType').disabled = blocked || !current;
    for (const id of ['staffCompanyResponseStatus', 'staffCompanyRespondedAt', 'staffCompanyResponseNote', 'staffCompanyCorrectionReason', 'staffCompanyResponseSave']) get(id).disabled = blocked || current?.company_response_editable !== true;
    for (const button of get('staffDocumentHistory').querySelectorAll('button')) button.disabled = blocked;
  }
  function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  function renderRows(rows) {
    const root = get('staffDocumentList'); root.replaceChildren();
    for (const row of rows) {
      const card = node('article', undefined, 'teacher-request-card'), student = row.student || {}, docs = row.documents || [];
      card.append(node('h2', `${student.first_name || '-'} ${student.last_name || ''}`), node('p', `${student.student_id || '-'} · ${student.major || '-'}`), node('p', row.company_name), node('p', STATUS[row.status] || row.status));
      const cooperation = docs.find(doc => doc.document_type === 'cooperation'), placement = docs.find(doc => doc.document_type === 'placement');
      card.append(node('p', `ขอความอนุเคราะห์: ${DOCUMENT_STATUS[cooperation?.status] || 'ยังไม่มีเอกสาร'} · ส่งตัว: ${DOCUMENT_STATUS[placement?.status] || 'รอยืนยันเงื่อนไข'}`));
      card.append(node('p', `ผลตอบกลับสถานประกอบการ: ${RESPONSE_STATUS[row.companyResponse?.status] || 'ยังไม่มีผลตอบกลับ'}`));
      const updated = docs.reduce((latest, doc) => new Date(doc.updatedAt) > new Date(latest) ? doc.updatedAt : latest, row.updatedAt || row.submitted_at);
      card.append(node('p', `อัปเดต ${date(updated)}`));
      const button = node('button', 'ดูรายละเอียด', 'teacher-button'); button.type = 'button'; button.addEventListener('click', () => openDetail(row.id)); card.append(button); root.append(card);
    }
  }
  async function refresh() {
    if (!live() || fetching) return false;
    fetching = true; controls(); say('กำลังโหลดคำร้อง...'); get('staffDocumentList').replaceChildren();
    try {
      const query = { offset, limit: PAGE_SIZE + 1, document_status: get('staffDocumentStatus').value || 'all' };
      if (get('staffStatus').value) query.status = get('staffStatus').value;
      if (get('staffSearch').value.trim()) query.search = get('staffSearch').value.trim();
      const response = await list(query); if (!live()) return false;
      const rows = response.data; if (!Array.isArray(rows)) throw Error('โหลดคำร้องไม่สำเร็จ');
      if (!rows.length && offset > 0) { offset = Math.max(0, offset - PAGE_SIZE); fetching = false; return refresh(); }
      hasNext = rows.length > PAGE_SIZE; renderRows(rows.slice(0, PAGE_SIZE)); get('staffPage').textContent = `หน้า ${offset / PAGE_SIZE + 1}`;
      say(rows.length ? '' : 'ยังไม่มีคำร้องตรงกับตัวกรอง'); return true;
    } catch (error) { if (!handle(error) && live()) say('โหลดคำร้องไม่สำเร็จ กรุณากดรีเฟรชเพื่อลองใหม่', true); return false; }
    finally { fetching = false; controls(); }
  }
  function renderDetail(data) {
    const row = data.request, student = row.student || {}, root = get('staffDetailBody'), grid = node('dl', undefined, 'staff-detail-grid');
    root.replaceChildren(); get('staffDocumentHistory').replaceChildren();
    get('staffDocumentType').value = selectedType; get('staffDocumentHeading').textContent = DOCUMENT_TITLES[selectedType];
    const pairs = [['นักศึกษา', `${student.first_name || '-'} ${student.last_name || ''}`], ['รหัสนักศึกษา', student.student_id], ['สาขา', student.major], ['อีเมลนักศึกษา', student.email], ['สถานะคำร้อง', STATUS[row.status] || row.status], ['สถานประกอบการ', row.company_name], ['ที่อยู่ตามคำร้อง', row.company_address], ['จังหวัด', row.company_province], ['ผู้รับหนังสือ', row.letter_recipient_name], ['ตำแหน่ง / หน่วยงานผู้รับ', row.letter_recipient_position_department], ['ช่วงปฏิบัติงาน', `${row.work_start_date || '-'} – ${row.work_end_date || '-'}`]];
    for (const [label, value] of pairs) grid.append(node('dt', label), node('dd', value || '-')); root.append(grid, node('h3', 'ประวัติคำร้อง'));
    for (const review of data.reviews || []) { const teacher = review.teacher, name = teacher ? `${teacher.academic_title || ''}${teacher.first_name} ${teacher.last_name}` : ROLES[review.actor_role] || 'ผู้ดำเนินการ'; root.append(node('p', `${name} · ${DECISIONS[review.decision] || 'ดำเนินการ'} · ${STATUS[review.from_status] || 'เริ่มคำร้อง'} → ${STATUS[review.to_status] || review.to_status} · ${date(review.createdAt)}${review.reason ? ` · ${review.reason}` : ''}`)); }
    if (data.missing_fields?.length) get('staffDetailMessage').textContent = `ไม่สามารถสร้างเอกสารได้ เนื่องจากข้อมูลยังไม่ครบ: ${data.missing_fields.map(field => FIELDS[field] || 'ข้อมูลเอกสาร').join(', ')}`;
    else if (!data.eligible) get('staffDetailMessage').textContent = 'คำร้องยังไม่อยู่ในสถานะที่จัดการเอกสารได้';
    const doc = data.documents.find(row => row.document_type === selectedType);
    if (doc?.snapshot) {
      const saved = doc.snapshot, savedGrid = node('dl', undefined, 'staff-detail-grid'); root.append(node('h3', 'ข้อมูลที่บันทึกในเอกสาร'));
      for (const [label, value] of [['นักศึกษา', `${saved.student.first_name} ${saved.student.last_name}`], ['สาขา', saved.student.major], ['สถานประกอบการ', saved.request.company_name], ['ที่อยู่', saved.request.company_address], ['ช่วงปฏิบัติงาน', `${saved.request.work_start_date} – ${saved.request.work_end_date}`]]) savedGrid.append(node('dt', label), node('dd', value)); root.append(savedGrid);
    }
    get('staffDocumentState').textContent = doc ? `${DOCUMENT_STATUS[doc.status]} · ฉบับ ${doc.version}` : 'ยังไม่มีเอกสาร';
    get('staffDocumentNumber').value = doc?.document_number || ''; get('staffIssueDate').value = doc?.metadata.issue_date || new Date().toISOString().slice(0, 10);
    get('staffSignatoryName').value = doc?.metadata.signatory_name || ''; get('staffSignatoryPosition').value = doc?.metadata.signatory_position || ''; get('staffNotes').value = doc?.metadata.notes || '';
    get('staffSave').textContent = doc ? 'บันทึกการแก้ไขร่าง' : 'สร้างและบันทึกร่าง'; get('staffSave').dataset.defaultLabel = get('staffSave').textContent;
    get('staffGenerate').textContent = doc?.status === 'generated' ? 'สร้างฉบับตัวอย่างใหม่' : 'สร้างฉบับตัวอย่าง';
    get('staffGenerate').dataset.defaultLabel = get('staffGenerate').textContent;
    get('staffPlacementStatus').textContent = data.placement?.message || 'หนังสือส่งตัวยังรอยืนยันเงื่อนไข'; form.hidden = false;
    const response = data.company_response, responseHistory = get('staffCompanyResponseHistory'); responseHistory.replaceChildren(); get('staffCompanyResponseForm').hidden = false;
    get('staffCompanyResponseState').textContent = response ? `${RESPONSE_STATUS[response.status]} · วันที่ตอบกลับ ${date(response.responded_at)} · ฉบับ ${response.version} · ${response.staff ? `${response.staff.first_name} ${response.staff.last_name}` : 'เจ้าหน้าที่'}${response.note ? ` · ${response.note}` : ''}` : 'ยังไม่มีผลตอบกลับ กรุณาสร้างหนังสือขอความอนุเคราะห์ให้เสร็จก่อนบันทึก';
    if (data.company_response_ready === false) get('staffCompanyResponseState').textContent = 'ระบบยังไม่พร้อมบันทึกผลตอบกลับ กรุณาติดต่อผู้ดูแล';
    if (response && !data.company_response_editable) get('staffCompanyResponseState').textContent += ' · ขณะนี้ยังแก้ไขไม่ได้ (ตรวจสอบหนังสือขอความอนุเคราะห์และหนังสือส่งตัว)';
    get('staffCompanyResponseStatus').value = response?.status || 'accepted'; get('staffCompanyRespondedAt').value = response?.responded_at?.slice(0, 10) || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    get('staffCompanyResponseNote').value = response?.note || ''; get('staffCompanyCorrectionReason').value = ''; get('staffCompanyCorrectionLabel').hidden = !response; get('staffCompanyCorrectionReason').required = !!response;
    get('staffCompanyResponseSave').textContent = response ? 'บันทึกการแก้ไขผลตอบกลับ' : 'บันทึกผลตอบกลับ'; get('staffCompanyResponseSave').dataset.defaultLabel = get('staffCompanyResponseSave').textContent;
    for (const item of data.company_response_history || []) responseHistory.append(node('p', `ฉบับ ${item.version} · ${RESPONSE_STATUS[item.status]} · วันที่ตอบกลับ ${date(item.responded_at)} · ${item.staff ? `${item.staff.first_name} ${item.staff.last_name}` : 'เจ้าหน้าที่'} · บันทึก ${date(item.createdAt)}${item.note ? ` · ${item.note}` : ''}${item.correction_reason ? ` · เหตุผลแก้ไข: ${item.correction_reason}` : ''}`, 'staff-document-history-item'));
    if (!data.company_response_history?.length) responseHistory.append(node('p', 'ยังไม่มีประวัติผลตอบกลับ'));
    const history = get('staffDocumentHistory');
    if (!data.revisions.length) history.append(node('p', 'ยังไม่มีประวัติเอกสาร'));
    for (const revision of data.revisions) {
      const owner = data.documents.find(doc => doc.id === revision.coop_document_id);
      const name = revision.staff ? `${revision.staff.first_name} ${revision.staff.last_name}` : 'เจ้าหน้าที่';
      history.append(node('p', `${DOCUMENT_TITLES[owner?.document_type] || 'เอกสาร'} · ฉบับ ${revision.version} · ${ACTIONS[revision.action]} · ${name} · ${date(revision.createdAt)}`, 'staff-document-history-item'));
      if (owner && revision.status === 'generated') { const button = node('button', 'ดูฉบับนี้', 'teacher-button'); button.type = 'button'; button.addEventListener('click', () => preview('preview', revision.version, owner.document_type)); history.append(button); }
    }
  }
  async function openDetail(id) {
    if (!live()) return false;
    clearDetail(); detailId = id; panel.hidden = false; detailLoading = true; const sequence = detailSequence; controls(); get('staffDetailMessage').textContent = 'กำลังโหลดรายละเอียด...';
    try {
      const response = await detail(id); if (!live() || sequence !== detailSequence) return false;
      current = response.data; get('staffDetailMessage').textContent = ''; renderDetail(current); get('staffDetailHeading').focus(); return true;
    } catch (error) { if (!handle(error) && live() && sequence === detailSequence) get('staffDetailMessage').textContent = 'โหลดรายละเอียดไม่สำเร็จ กรุณาเปิดรายละเอียดอีกครั้ง'; return false; }
    finally { if (sequence === detailSequence) { detailLoading = false; controls(); } }
  }
  function ask(action, button) {
    if (!live() || !current || submitting || modalOpen || detailLoading) return;
    const id = detailId, documentType = selectedType, doc = current.documents.find(row => row.document_type === documentType);
    if (documentType === 'placement' && current.placement?.available !== true) { toast(current.placement?.message || 'ยังสร้างหนังสือส่งตัวไม่ได้', 'warning'); return; }
    if (action === 'generate') {
      const inputs = { staffDocumentNumber: doc?.document_number, staffIssueDate: doc?.metadata.issue_date, staffSignatoryName: doc?.metadata.signatory_name, staffSignatoryPosition: doc?.metadata.signatory_position, staffNotes: doc?.metadata.notes };
      if (Object.entries(inputs).some(([key, value]) => get(key).value.trim() !== (value || ''))) { toast('กรุณาบันทึกการแก้ไขร่างก่อนสร้างฉบับตัวอย่าง', 'warning'); return; }
    }
    const body = action === 'generate' ? { version: doc?.version } : { document_number: get('staffDocumentNumber').value.trim() || null, issue_date: get('staffIssueDate').value, signatory_name: get('staffSignatoryName').value.trim() || null, signatory_position: get('staffSignatoryPosition').value.trim() || null, notes: get('staffNotes').value.trim() || null, ...(doc ? { version: doc.version } : {}) };
    if (action !== 'generate' && !body.issue_date) { toast('กรุณาระบุวันที่หนังสือ', 'error'); return; }
    const operation = action === 'generate' ? action : doc ? 'edit' : 'create'; modalOpen = true; controls();
    confirm({ returnFocus: button, fallbackFocus: () => get(button.id)?.disabled === false ? get(button.id) : get('staffRefresh'), title: operation === 'generate' ? 'สร้างฉบับตัวอย่างเอกสาร' : 'บันทึกร่างเอกสาร', message: 'ใช้ข้อมูลที่บันทึกไว้เพื่อสร้างฉบับตัวอย่าง ยังไม่ถือเป็นการออกหนังสืออย่างเป็นทางการ และไม่เปลี่ยนสถานะคำร้อง', confirmLabel: 'ยืนยัน', onClose: () => { modalOpen = false; controls(); }, onConfirm: async () => {
      if (!live()) return true;
      submitting = true; loading(button, true, 'กำลังบันทึก...'); controls();
      try {
        await save(id, documentType, operation, body); if (!live()) return true;
        toast('บันทึกเอกสารแล้ว', 'success'); clearPreview();
        const results = await Promise.all([refresh(), openDetail(id)]);
        if (results.some(result => !result) && live()) toast('บันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณารีเฟรช', 'warning');
        return true;
      } catch (error) {
        if (handle(error) || !live()) return true;
        if (error.status === 409) { toast(errorMessage(error), 'warning'); await Promise.all([refresh(), openDetail(id)]); return true; }
        throw Error(errorMessage(error));
      } finally { submitting = false; loading(button, false, 'กำลังบันทึก...'); controls(); }
    } });
  }
  async function preview(mode, version, documentType = selectedType) {
    if (!live() || !current || submitting) return;
    const id = detailId, sequence = detailSequence, doc = current.documents.find(row => row.document_type === documentType); if (!doc || (!version && doc.status !== 'generated')) return;
    submitting = true; const button = get(mode === 'download' ? 'staffDownload' : 'staffPreview'); loading(button, true, 'กำลังโหลด...'); controls();
    try {
      const blob = await content(id, documentType, mode, version); if (!live() || sequence !== detailSequence) return;
      if (mode === 'download') download(blob, `${documentType}-${doc.id}-v${version || doc.version}.html`);
      else { clearPreview(); previewUrl = url.createObjectURL(blob); get('staffPreviewFrame').src = previewUrl; get('staffPreviewFrame').hidden = false; }
    } catch (error) { if (!handle(error) && live()) toast(mode === 'download' ? 'ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่' : 'โหลดฉบับตัวอย่างไม่สำเร็จ กรุณาลองใหม่', 'error'); }
    finally { submitting = false; loading(button, false, 'กำลังโหลด...'); controls(); }
  }
  function askCompanyResponse() {
    if (!live() || !current || submitting || modalOpen || detailLoading || current.company_response_editable !== true) return;
    const id = detailId, response = current.company_response, correcting = !!response;
    const body = { status: get('staffCompanyResponseStatus').value, responded_at: get('staffCompanyRespondedAt').value, note: get('staffCompanyResponseNote').value.trim() || null, ...(correcting ? { version: response.version, correction_reason: get('staffCompanyCorrectionReason').value.trim() } : {}) };
    if (!body.responded_at || (correcting && !body.correction_reason)) { toast('กรุณาระบุวันที่ตอบกลับและเหตุผลแก้ไขให้ครบ', 'error'); return; }
    const button = get('staffCompanyResponseSave'); modalOpen = true; controls();
    confirm({ returnFocus: get('staffCompanyResponseSave'), fallbackFocus: () => get('staffCompanyResponseSave')?.disabled === false ? get('staffCompanyResponseSave') : get('staffRefresh'), title: correcting ? 'ยืนยันการแก้ไขผลตอบกลับ' : 'ยืนยันผลตอบกลับสถานประกอบการ', message: `${RESPONSE_STATUS[body.status] || '-'} · ${body.responded_at} การบันทึกนี้จะกำหนดสิทธิ์สร้างหนังสือส่งตัวจากข้อมูลที่เก็บในระบบ`, confirmLabel: 'ยืนยัน', onClose: () => { modalOpen = false; controls(); }, onConfirm: async () => {
      if (!live()) return true;
      submitting = true; loading(button, true, 'กำลังบันทึก...'); controls();
      try {
        await responseSave(id, body, correcting); if (!live()) return true;
        toast('บันทึกผลตอบกลับแล้ว', 'success'); clearPreview();
        const results = await Promise.all([refresh(), openDetail(id)]);
        if (results.some(result => !result) && live()) toast('บันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณารีเฟรช', 'warning');
        return true;
      } catch (error) {
        if (handle(error) || !live()) return true;
        if (error.status === 409) { toast(errorMessage(error), 'warning'); await Promise.all([refresh(), openDetail(id)]); return true; }
        throw Error(errorMessage(error));
      } finally { submitting = false; loading(button, false, 'กำลังบันทึก...'); controls(); }
    } });
  }
  get('staffCompanyResponseForm').addEventListener('submit', event => { event.preventDefault(); askCompanyResponse(); });
  get('staffDocumentType').addEventListener('change', () => { if (!current || submitting || modalOpen) return; selectedType = get('staffDocumentType').value === 'placement' ? 'placement' : 'cooperation'; clearPreview(); renderDetail(current); controls(); });
  get('staffPlacementCreate').addEventListener('click', () => { if (!current || submitting || modalOpen || current.placement?.available !== true) return; selectedType = 'placement'; clearPreview(); renderDetail(current); controls(); get('staffDocumentHeading').focus(); });
  get('staffSearchForm').addEventListener('submit', async event => { event.preventDefault(); offset = 0; await refresh(); });
  for (const id of ['staffStatus', 'staffDocumentStatus']) get(id).addEventListener('change', async () => { offset = 0; await refresh(); });
  get('staffRefresh').addEventListener('click', refresh);
  get('staffPrev').addEventListener('click', async () => { offset -= PAGE_SIZE; await refresh(); }); get('staffNext').addEventListener('click', async () => { offset += PAGE_SIZE; await refresh(); });
  get('staffLogout').addEventListener('click', revoke);
  get('staffDetailClose').addEventListener('click', () => { clearDetail(); detailId = null; panel.hidden = true; detailLoading = false; controls(); });
  form.addEventListener('submit', event => { event.preventDefault(); ask('save', get('staffSave')); }); get('staffGenerate').addEventListener('click', () => ask('generate', get('staffGenerate')));
  get('staffPreview').addEventListener('click', () => preview('preview')); get('staffDownload').addEventListener('click', () => preview('download'));
  get('staffPrint').addEventListener('click', () => { if (!live() || !previewUrl) return; try { get('staffPreviewFrame').contentWindow.print(); } catch { toast('พิมพ์ไม่สำเร็จ กรุณาดาวน์โหลดฉบับตัวอย่างแล้วเปิดเพื่อพิมพ์', 'error'); } });
  controls();
  const ready = (async () => {
    if (!token) { revoke(); return; }
    try { const response = await me(); if (storage.getItem(STAFF_TOKEN_KEY) !== token) return; if (!response.data?.id || response.data.is_active !== true) { revoke(); return; } authorized = true; get('staffName').textContent = `${response.data.first_name} ${response.data.last_name}`; await refresh(); return response.data; }
    catch (error) { if (!handle(error)) { say('ตรวจสอบบัญชีเจ้าหน้าที่ไม่สำเร็จ กรุณาโหลดหน้าใหม่', true); controls(); } }
  })();
  return { ready, refresh, openDetail };
}
// Staff-only shell reuses the document session, APIs and mounted workspaces.
function mountStaffWorkspace({ document, target, sessionReady }) {
  if (!document.body.hasAttribute('data-staff-workspace') || document.body.dataset.staffMounted) return;
  document.body.dataset.staffMounted = 'true';
  const get = id => document.getElementById(id);
  const token = roleSessionStorage.getItem(STAFF_TOKEN_KEY);
  const live = () => !!token && roleSessionStorage.getItem(STAFF_TOKEN_KEY) === token;
  const views = {
    staffOverview: 'ภาพรวมงานเจ้าหน้าที่', staffCoopRequests: 'ตรวจสอบคำร้องสหกิจศึกษา',
    documents: 'จัดการเอกสารสหกิจศึกษา', staffPrerequisiteCatalog: 'รายวิชาก่อนออกสหกิจศึกษา',
    staffJobs: 'พิจารณาประกาศรับสมัครงาน', co09Manager: 'จัดการสอบหัวข้อ CO-09',
    activities: 'ปฏิทินกิจกรรมสหกิจศึกษา', 'own-account': 'ข้อมูลบัญชีของฉัน',
  };
  const jobLabels = { pending_review: 'รอพิจารณา', published: 'เผยแพร่แล้ว', rejected: 'ปฏิเสธแล้ว',
    pending_email_verification: 'รอยืนยันอีเมล', withdrawn: 'ถอนประกาศ', expired: 'หมดอายุ' };
  let authorized = false, overviewBusy = false, overviewLoaded = false, activeView;
  let jobBusy = false, jobModal = false, jobLoaded = false, jobOffset = 0, jobNext = false, currentJob = null;
  let overviewSerial = 0, jobSerial = 0;
  const node = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
  const say = (id, text, error = false) => { get(id).textContent = text; get(id).setAttribute('role', error ? 'alert' : 'status'); };
  const date = value => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : 'ไม่ระบุ';
  function accessError(error) {
    if (!live() || [401, 403].includes(error.status)) {
      authorized = false; ++jobSerial; ++overviewSerial; currentJob = null;
      get('staffOverviewQueues').replaceChildren(); get('staffJobsList').replaceChildren(); get('staffJobBody').replaceChildren(); get('staffJobDetail').hidden = true;
      controls(); return true;
    }
    return false;
  }
  function controls() {
    const blocked = !authorized || !live() || jobBusy || jobModal;
    for (const id of ['staffJobsStatus', 'staffJobsSearch', 'staffJobsRefresh']) get(id).disabled = blocked;
    get('staffJobsPrev').disabled = blocked || jobOffset === 0;
    get('staffJobsNext').disabled = blocked || !jobNext;
    get('staffJobClose').disabled = jobBusy || jobModal;
    for (const root of [get('staffJobsList'), get('staffJobBody')]) for (const button of root.querySelectorAll('button')) button.disabled = blocked;
    const job = currentJob?.job;
    const eligible = job?.status === 'pending_review' && job.submission?.verification_status === 'verified'
      && (!job.expires_at || Date.parse(job.expires_at) > Date.now());
    for (const id of ['staffJobPublish', 'staffJobReject']) get(id).disabled = blocked || !eligible;
    get('staffJobEligibility').textContent = !job ? '' : eligible ? 'สามารถเผยแพร่หรือปฏิเสธประกาศได้ ระบบตรวจเงื่อนไขซ้ำเมื่อยืนยัน'
      : 'อ่านอย่างเดียว: ต้องเป็นประกาศรอพิจารณา ยืนยันอีเมลแล้ว และยังไม่หมดอายุ';
    get('staffOverviewRefresh').disabled = !authorized || !live() || overviewBusy;
    get('staffOverviewQueues').setAttribute('aria-busy', String(overviewBusy));
    get('staffJobs').setAttribute('aria-busy', String(jobBusy));
  }
  function menu(open, focus = false) {
    get('staffMenuToggle').setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('staff-menu-open', open);
    if (focus) (open ? get('staffSidebar').querySelector('a:not([hidden])') : get('staffMenuToggle'))?.focus();
  }
  function navigate(focus = false) {
    let hash; try { hash = decodeURIComponent(target.location.hash.slice(1)); } catch { hash = ''; }
    const nested = get(hash)?.closest('[data-staff-panel]')?.id;
    const view = Object.hasOwn(views, hash) ? hash : Object.hasOwn(views, nested) ? nested : 'staffOverview';
    for (const [id] of Object.entries(views)) { const panel = get(id); if (panel) panel.hidden = id !== view; }
    for (const link of document.querySelectorAll('.sidebar-menu [data-staff-view]')) {
      const selected = link.hash === `#${view}`; link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    }
    get('staffPageContext').textContent = views[view];
    document.title = `${views[view]} | CWIE-IT CoopConnect`;
    if (focus && activeView !== view) {
      const heading = get(view)?.querySelector('h1, h2');
      if (heading) { heading.tabIndex = -1; heading.focus(); } else get('staffWorkspace').focus();
    }
    const changed = activeView !== view;
    activeView = view; menu(false);
    if (authorized && live()) {
      if (view === 'staffOverview' && (!overviewLoaded || changed)) refreshOverview();
      if (view === 'staffJobs' && !jobLoaded) refreshJobs();
    }
  }
  get('staffMenuToggle').addEventListener('click', () => menu(get('staffMenuToggle').getAttribute('aria-expanded') !== 'true', true));
  get('staffSidebar').addEventListener('keydown', event => { if (event.key === 'Escape' && document.body.classList.contains('staff-menu-open')) { event.preventDefault(); menu(false, true); } });
  document.querySelector('.staff-skip-link').addEventListener('click', event => { event.preventDefault(); get('staffWorkspace').focus(); });
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-staff-view]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (link.hash === target.location.hash) { event.preventDefault(); navigate(true); get(activeView)?.querySelector('h1, h2')?.focus(); }
  });
  target.addEventListener('hashchange', () => navigate(true));
  document.addEventListener('staff:accountmounted', () => navigate());
  const mobile = target.matchMedia('(max-width: 767px)');
  mobile.addEventListener('change', () => {
    if (mobile.matches && get('staffSidebar').contains(document.activeElement)) menu(false, true);
    else { menu(false); if (!mobile.matches && document.activeElement === get('staffMenuToggle')) get('staffSidebar').querySelector('a.active:not([hidden]),a:not([hidden])')?.focus(); }
  });

  async function refreshOverview() {
    if (!authorized || !live() || overviewBusy) return;
    overviewBusy = true; const ticket = ++overviewSerial; controls();
    const root = get('staffOverviewQueues'); root.replaceChildren(); say('staffOverviewMessage', 'กำลังโหลดคิวงาน...');
    const queues = [
      { title: 'คำร้องรออาจารย์ที่ปรึกษา', href: '#staffCoopRequests', load: () => getStaffCoopRequests({ status: 'advisor_review', limit: 5, offset: 0 }), rows: result => result.data, label: row => `${row.student?.first_name || ''} ${row.student?.last_name || ''} · ${row.company_name || 'ไม่ระบุสถานประกอบการ'}` },
      { title: 'คำร้องที่ยังไม่มีหนังสือขอความอนุเคราะห์', href: '#documents', load: () => getDocumentQueue({ document_status: 'missing', limit: 5, offset: 0 }), rows: result => result.data, label: row => `${row.student?.first_name || ''} ${row.student?.last_name || ''} · ${row.company_name || 'ไม่ระบุสถานประกอบการ'}` },
      { title: 'ประกาศรับสมัครงานรอพิจารณา', href: '#staffJobs', load: () => staffRequest('/api/staff/job-postings?status=pending_review&limit=5&offset=0'), rows: result => result.data, label: row => `${row.title} · ${row.company?.name || 'ไม่ระบุสถานประกอบการ'}` },
      { title: 'กิจกรรมที่ยังไม่สิ้นสุด', href: '#activities', load: () => listActivities({ from: new Date().toISOString(), limit: 5, offset: 0 }, true), rows: result => result.activities, label: row => `${row.title} · ${date(row.starts_at)}` },
    ];
    const results = await Promise.allSettled(queues.map(queue => queue.load()));
    if (!live() || ticket !== overviewSerial) { overviewBusy = false; controls(); return; }
    const denied = results.find(result => result.status === 'rejected' && [401, 403].includes(result.reason.status));
    if (denied) { accessError(denied.reason); overviewBusy = false; say('staffOverviewMessage', 'ไม่มีสิทธิ์โหลดภาพรวม กรุณาเข้าสู่ระบบใหม่', true); controls(); return; }
    let failures = 0;
    results.forEach((result, index) => {
      const queue = queues[index], card = node('section', undefined, 'staff-card'); card.append(node('h2', queue.title));
      const rows = result.status === 'fulfilled' ? queue.rows(result.value) : null;
      if (!Array.isArray(rows)) { ++failures; card.append(node('p', 'โหลดข้อมูลไม่สำเร็จ กดรีเฟรชภาพรวมเพื่อลองใหม่', 'staff-empty')); }
      else {
        if (index === 3 && Number.isInteger(result.value.total)) card.append(node('p', `รวม ${result.value.total} กิจกรรมที่ตรงเงื่อนไข · รวมร่าง / เผยแพร่ / ยกเลิก`));
        else card.append(node('p', 'ไม่มีจำนวนสรุปรวม · แสดงรายการจากคิวล่าสุด', 'staff-count-note'));
        if (!rows.length) card.append(node('p', 'ยังไม่มีรายการตรงเงื่อนไข', 'staff-empty'));
        else { const list = node('ul', undefined, 'staff-queue-list'); for (const row of rows) list.append(node('li', queue.label(row))); card.append(list); }
      }
      const link = node('a', 'เปิดพื้นที่งาน →', 'teacher-button'); link.href = queue.href; link.dataset.staffView = ''; card.append(link); root.append(card);
    });
    overviewBusy = false; overviewLoaded = true;
    say('staffOverviewMessage', failures ? 'โหลดคิวงานได้บางส่วน กดรีเฟรชเพื่อลองใหม่' : `ข้อมูลที่โหลดเมื่อ ${date(new Date().toISOString())} · เปิดพื้นที่งานเพื่อดูรายละเอียดและตัวกรอง`, !!failures); controls();
  }
  function closeJob() { ++jobSerial; currentJob = null; get('staffJobDetail').hidden = true; get('staffJobBody').replaceChildren(); controls(); }
  async function refreshJobs() {
    if (!authorized || !live() || jobBusy || jobModal) return;
    closeJob(); jobBusy = true; const ticket = ++jobSerial; controls(); say('staffJobsMessage', 'กำลังโหลดประกาศ...'); get('staffJobsList').replaceChildren();
    try {
      const result = await staffRequest(`/api/staff/job-postings?${new URLSearchParams({ status: get('staffJobsStatus').value, offset: jobOffset, limit: PAGE_SIZE + 1 })}`);
      if (!live() || ticket !== jobSerial) return;
      if (!Array.isArray(result.data)) throw Error('รูปแบบข้อมูลประกาศไม่ถูกต้อง');
      if (!result.data.length && jobOffset > 0) { jobOffset = Math.max(0, jobOffset - PAGE_SIZE); jobBusy = false; return refreshJobs(); }
      jobNext = result.data.length > PAGE_SIZE;
      for (const row of result.data.slice(0, PAGE_SIZE)) {
        const card = node('article', undefined, 'teacher-request-card');
        card.append(node('h2', row.title), node('p', row.company?.name || 'ไม่ระบุสถานประกอบการ'), node('p', jobLabels[row.status] || row.status), node('p', `ยื่นเมื่อ ${date(row.submitted_at)} · ${row.submission?.verification_status === 'verified' ? 'ยืนยันอีเมลแล้ว' : 'ยังไม่ผ่านเงื่อนไขยืนยันอีเมล'}`));
        const button = node('button', 'ดูรายละเอียด', 'teacher-button teacher-button--primary'); button.type = 'button'; button.addEventListener('click', () => openJob(row.id)); card.append(button); get('staffJobsList').append(card);
      }
      jobLoaded = true; get('staffJobsPage').textContent = `หน้า ${jobOffset / PAGE_SIZE + 1}`;
      say('staffJobsMessage', result.data.length ? 'เรียงวันที่ยื่นเก่าสุดก่อน' : 'ยังไม่มีประกาศตรงกับสถานะที่เลือก');
    } catch (error) { accessError(error); say('staffJobsMessage', error.message || 'โหลดประกาศไม่สำเร็จ กรุณากดรีเฟรช', true); }
    finally { jobBusy = false; controls(); }
  }
  async function openJob(id) {
    if (!authorized || !live() || jobBusy || jobModal) return;
    closeJob(); jobBusy = true; const ticket = ++jobSerial; get('staffJobDetail').hidden = false; say('staffJobMessage', 'กำลังโหลดรายละเอียด...'); controls();
    try {
      const result = await staffRequest(`/api/staff/job-postings/${encodeURIComponent(id)}`);
      if (!live() || ticket !== jobSerial) return;
      const data = result.data; if (!data?.job?.id) throw Error('รูปแบบรายละเอียดประกาศไม่ถูกต้อง'); currentJob = data;
      const job = data.job, grid = node('dl', undefined, 'staff-detail-grid');
      for (const [label, value] of [['ตำแหน่ง', job.title], ['สถานประกอบการ', job.company?.name], ['จังหวัด', job.company?.province], ['สถานะ', jobLabels[job.status] || job.status], ['หมวดงาน', ({ information_technology: 'เทคโนโลยีสารสนเทศ', business: 'ธุรกิจ', design: 'ออกแบบ', engineering: 'วิศวกรรม', other: 'อื่น ๆ' })[job.category] || job.category], ['จำนวนรับ', job.quota], ['ค่าตอบแทน', job.compensation_text], ['วันทำงานต่อสัปดาห์', job.work_days_per_week], ['รูปแบบงาน', (job.workModes || []).map(row => ({ onsite: 'ที่สถานประกอบการ', work_from_home: 'ทำงานจากที่บ้าน', hybrid: 'ผสมผสาน' })[row.mode] || row.mode).join(' / ')], ['วันที่ยื่น', date(job.submitted_at)], ['หมดอายุ', date(job.expires_at)], ['การยืนยันอีเมล', job.submission?.verification_status === 'verified' ? 'ยืนยันแล้ว' : 'ยังไม่ผ่านเงื่อนไขยืนยัน'], ['เหตุผลปฏิเสธ', job.rejection_reason]]) grid.append(node('dt', label), node('dd', value == null || value === '' ? 'ไม่ระบุ' : String(value)));
      const body = get('staffJobBody'); body.append(grid, node('h3', 'รายละเอียดงาน'), node('p', job.description, 'staff-preserve-lines'));
      body.append(node('h3', 'ประกาศอื่นในชุดการยื่นเดียวกัน'));
      const others = (data.jobs || []).filter(row => row.id !== job.id);
      if (!others.length) body.append(node('p', 'ไม่มีประกาศอื่นในชุดนี้'));
      for (const row of others) { const button = node('button', `${row.title} · ${jobLabels[row.status] || row.status}`, 'teacher-button'); button.type = 'button'; button.addEventListener('click', () => openJob(row.id)); body.append(button); }
      body.append(node('h3', 'ประวัติการพิจารณา'));
      if (!data.reviews?.length) body.append(node('p', 'ยังไม่มีประวัติการพิจารณา'));
      for (const review of data.reviews || []) body.append(node('p', `${date(review.createdAt)} · ${jobLabels[review.from_status] || review.from_status} → ${jobLabels[review.to_status] || review.to_status}${review.reason ? ` · ${review.reason}` : ''}`, 'staff-document-history-item'));
      say('staffJobMessage', ''); get('staffJobDetailHeading').focus();
    } catch (error) { accessError(error); say('staffJobMessage', error.message || 'โหลดรายละเอียดไม่สำเร็จ กรุณาเปิดรายการอีกครั้ง', true); }
    finally { jobBusy = false; controls(); }
  }
  function reviewJob(decision) {
    const button = get(decision === 'publish' ? 'staffJobPublish' : 'staffJobReject');
    if (!authorized || !live() || button.disabled || !currentJob || jobBusy || jobModal) return;
    const job = currentJob.job; jobModal = true; controls();
    showConfirmModal({ title: decision === 'publish' ? 'ยืนยันเผยแพร่ประกาศ' : 'ยืนยันปฏิเสธประกาศ', message: `${job.title} · ${job.company?.name || 'สถานประกอบการ'} การดำเนินการจะเก็บประวัติการพิจารณา`,
      variant: decision === 'publish' ? 'success' : 'danger', confirmLabel: decision === 'publish' ? 'เผยแพร่ประกาศ' : 'ปฏิเสธประกาศ',
      reasonLabel: decision === 'reject' ? 'เหตุผลปฏิเสธ (จำเป็น)' : '', returnFocus: button, fallbackFocus: get('staffJobsRefresh'),
      onClose: () => { jobModal = false; controls(); }, onConfirm: async reason => {
        if (!authorized || !live()) throw Error('สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่');
        if (currentJob?.job.id !== job.id) throw Error('กรุณาปิดหน้าต่างยืนยันและโหลดรายละเอียดล่าสุดก่อนพิจารณาใหม่');
        jobBusy = true; setButtonLoading(button, true, 'กำลังบันทึก...'); controls();
        try {
          await staffRequest(`/api/staff/job-postings/${encodeURIComponent(job.id)}/${decision}`, { method: 'POST', body: decision === 'reject' ? { reason } : {} });
          if (!live()) return;
          showToast(decision === 'publish' ? 'เผยแพร่ประกาศแล้ว' : 'บันทึกผลปฏิเสธแล้ว', 'success');
          jobBusy = false; jobModal = false; overviewLoaded = false; await refreshJobs(); await openJob(job.id);
        } catch (error) {
          accessError(error); say('staffJobMessage', error.status === 409 ? 'ประกาศเปลี่ยนแปลงหรือไม่เข้าเงื่อนไข กรุณาปิดหน้าต่างยืนยันแล้วรีเฟรชก่อนพิจารณาใหม่' : error.message, true);
          if (error.status === 409) currentJob = null;
          throw error;
        } finally { jobBusy = false; setButtonLoading(button, false); controls(); }
      },
    });
  }
  get('staffOverviewRefresh').addEventListener('click', refreshOverview);
  get('staffJobsRefresh').addEventListener('click', refreshJobs);
  get('staffJobsFilters').addEventListener('submit', event => { event.preventDefault(); jobOffset = 0; refreshJobs(); });
  get('staffJobsStatus').addEventListener('change', () => { jobOffset = 0; refreshJobs(); });
  get('staffJobsPrev').addEventListener('click', () => { jobOffset = Math.max(0, jobOffset - PAGE_SIZE); refreshJobs(); });
  get('staffJobsNext').addEventListener('click', () => { jobOffset += PAGE_SIZE; refreshJobs(); });
  get('staffJobClose').addEventListener('click', () => { closeJob(); get('staffJobsRefresh').focus(); });
  get('staffJobPublish').addEventListener('click', () => reviewJob('publish'));
  get('staffJobReject').addEventListener('click', () => reviewJob('reject'));
  controls(); navigate();
  sessionReady.then(profile => {
    if (!profile || !live()) { say('staffOverviewMessage', 'ยังโหลดบัญชีไม่ได้ กรุณาโหลดหน้าใหม่หรือเข้าสู่ระบบอีกครั้ง', true); return; }
    authorized = true;
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
    get('staffWelcomeName').textContent = name;
    get('staffAvatar').textContent = [profile.first_name, profile.last_name].filter(Boolean).map(part => Array.from(part.trim())[0] || '').join('');
    get('staffDepartment').textContent = profile.department || 'ยังไม่ระบุภาควิชา';
    controls(); navigate();
  });
}
if (typeof document !== 'undefined' && document.getElementById('staffDocumentList')) {
  const documents = mountStaffDocuments({ document, storage: roleSessionStorage, location: window.location });
  mountStaffWorkspace({ document, target: window, sessionReady: documents.ready });
}
