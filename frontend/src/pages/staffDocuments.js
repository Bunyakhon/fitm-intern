import { STAFF_TOKEN_KEY, getCurrentStaff, getDocumentQueue, getDocumentRequest, saveStaffDocument, getStaffDocumentContent, saveCompanyResponse } from '../api/staffDocuments.api.js';
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
  function revoke() { authorized = false; storage.removeItem(STAFF_TOKEN_KEY); get('staffDocumentList').replaceChildren(); clearDetail(); panel.hidden = true; get('staffName').textContent = ''; controls(); location.replace('/staff-login.html'); }
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
    try { const response = await me(); if (storage.getItem(STAFF_TOKEN_KEY) !== token) return; if (!response.data?.id || response.data.is_active !== true) { revoke(); return; } authorized = true; get('staffName').textContent = `${response.data.first_name} ${response.data.last_name}`; await refresh(); }
    catch (error) { if (!handle(error)) { say('ตรวจสอบบัญชีเจ้าหน้าที่ไม่สำเร็จ กรุณาโหลดหน้าใหม่', true); controls(); } }
  })();
  return { ready, refresh, openDetail };
}
if (typeof document !== 'undefined') mountStaffDocuments({ document, storage: sessionStorage, location: window.location });
