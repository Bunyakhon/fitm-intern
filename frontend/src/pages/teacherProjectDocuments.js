import * as api from '../api/teacherProjectDocuments.api.js';
import { roleSessionStorage } from '../auth/roleAuthStorage.js';
import { mountTeacherSearchToolbar } from './teacherSearchToolbar.js';
import { mountTeacherListView, academicPeriodText, studentIdentity, createTeacherTable, appendTeacherTableRow } from './teacherListView.js';
import { createTeacherListPresentation } from './teacherListPresentation.js';
import { mountContentModal, showToast } from '../ui/feedback.js';
import { documentUrl, httpsDocumentUrl } from '../validators/projectDocumentUrl.js';
import '../styles/teacher_project_documents.css';
import { mountTeacherPdfPreview } from './teacherPdfPreview.js';
import { teacherStatusBadge } from './teacherStatus.js';

const LABELS = { 'project-book': 'เล่มโครงการ', poster: 'โปสเตอร์โครงการ', co09: 'เอกสาร CO-09' };
const STATES = { file_and_link: 'มีทั้งไฟล์และลิงก์', file: 'มีไฟล์', link: 'มีลิงก์', missing: 'ยังไม่มีเอกสาร', unavailable: 'มีข้อมูลเอกสารแต่เปิดไม่ได้' };
const REVIEWS = { missing: 'ยังไม่มีเอกสาร', pending: 'รอพิจารณา', needs_revision: 'ต้องแก้ไข', approved: 'ผ่านการพิจารณา' };
export function mountTeacherProjectDocuments({ document, target = document.defaultView, storage = roleSessionStorage, services = api }) {
  const get = id => document.getElementById(id), container = get('teacherDocumentsList');
  if (!container) return;
  const el = (tag, text = '', cls = '') => { const node = document.createElement(tag); node.textContent = text; if (cls) node.className = cls; return node; };
  const button = (label, action) => { const node = el('button', label, 'teacher-button'); node.type = 'button'; node.addEventListener('click', action); return node; };
  const visible = () => document.body.dataset.teacherView === 'projectDocuments';
  const initialToken = storage.getItem('teacherToken');
  let rows = [], offset = 0, total = 0, selectedId = null, current = null, loadingList = false, loadingDetail = false, loadingFile = false, revoked = false;
  let listVersion = 0, detailVersion = 0, fileVersion = 0, listController, detailController, fileController, previewUrl = null, previewOpener = null, previewRequest = null;
  const downloads = new Map();
  let pdfPreview = null, previewReady = false, previewGeneration = 0;
  const toolbar = mountTeacherSearchToolbar({ document, anchor: get('teacherDocumentsMessage'), placeholder: 'ชื่อ รหัสนักศึกษา หัวข้อโครงการ หรือบริษัท',
    includeUnknownYear: true,
    onApply: () => { offset = 0; refresh(); } });
  const listView = mountTeacherListView({ document, summary: toolbar.summary, menu: 'projectDocuments', label: 'เอกสารโครงการ', onChange: render,
    onSort: () => { offset = 0; refresh(); } });
  const presentation = createTeacherListPresentation({ document, list: container, message: get('teacherDocumentsMessage'),
    onRetry: () => refresh(), emptyTitle: 'ไม่มีนักศึกษาในความดูแล', emptyDescription: 'เอกสารของนักศึกษาสหกิจที่คุณเป็นที่ปรึกษาโครงการจะแสดงที่นี่' });

  const overlay = el('div', '', 'app-confirm-overlay teacher-document-preview-overlay'); overlay.hidden = true;
  const panel = el('section', '', 'app-confirm-modal teacher-document-preview'); panel.hidden = true; panel.tabIndex = -1;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'teacherDocumentPreviewHeading');
  const previewHeading = el('h2', 'ตัวอย่างเอกสาร'); previewHeading.id = 'teacherDocumentPreviewHeading';
  const close = button('ปิด ×', () => modal.close()); close.setAttribute('aria-label', 'ปิดตัวอย่างเอกสาร');
  const header = el('div', '', 'teacher-document-preview-header'); header.append(previewHeading, close);
  const previewMessage = el('p', '', 'teacher-document-preview-message'); previewMessage.setAttribute('role', 'status'); previewMessage.setAttribute('aria-live', 'polite');
  const previewBody = el('div', '', 'teacher-document-preview-body');
  const previewRetry = button('ลองโหลดไฟล์อีกครั้ง', () => { if (previewRequest) openFile(previewRequest.kind, previewRequest.file, 'preview', previewOpener); });
  const previewReload = button('โหลดรายละเอียดล่าสุด', () => { const id = selectedId; modal.close(); if (id) loadDetail(id); });
  const previewDownload = button('ดาวน์โหลดไฟล์', () => { if (previewRequest) openFile(previewRequest.kind, previewRequest.file, 'download', previewOpener); });
  const previewActions = el('div', '', 'teacher-document-actions'); previewActions.append(previewRetry, previewReload, previewDownload);
  panel.append(header, previewMessage, previewBody, previewActions); overlay.append(panel);
  const modal = mountContentModal({ document, overlay, panel, initialFocus: close,
    returnFocus: () => previewOpener, fallbackFocus: () => get('teacherDocumentsStudentHeading'),
    onClose: () => { cancelFile(); previewRequest = null; controls(); } });

  function say(message, text, error = false) { message.textContent = text; message.dataset.type = error ? 'error' : 'info'; message.setAttribute('role', error ? 'alert' : 'status'); }
  function controls() {
    const busy = revoked || !storage.getItem('teacherToken') || loadingList || loadingDetail || loadingFile;
    toolbar.setBusy(busy); listView.setBusy(busy);
    toolbar.setLoading(loadingList);
    get('teacherDocumentsPrevious').disabled = busy || offset === 0;
    get('teacherDocumentsNext').disabled = busy || offset + rows.length >= total;
    for (const root of [container, get('teacherDocumentsCards')]) root.querySelectorAll('button').forEach(node => { node.disabled = busy; });
    get('teacherDocumentsDetailRetry').disabled = busy;
    container.setAttribute('aria-busy', String(loadingList)); get('teacherDocumentsDetail').setAttribute('aria-busy', String(loadingDetail));
    previewRetry.disabled = previewDownload.disabled = previewReload.disabled = loadingFile || revoked;
    previewDownload.hidden = !previewRequest || !previewReady;
    panel.setAttribute('aria-busy', String(loadingFile));
  }
  function clearBlob() {
    previewGeneration++; pdfPreview?.dispose(); pdfPreview = null; previewReady = false;
    previewBody.replaceChildren();
    if (previewUrl) target.URL.revokeObjectURL(previewUrl); previewUrl = null;
  }
  function cancelFile() {
    fileVersion++; fileController?.abort(); loadingFile = false; clearBlob();
    for (const [url, timer] of downloads) { target.clearTimeout(timer); target.URL.revokeObjectURL(url); } downloads.clear();
  }
  function clearDetail() {
    detailVersion++; detailController?.abort(); loadingDetail = false;
    modal.close(); cancelFile(); previewRequest = null;
    selectedId = null; current = null; get('teacherDocumentsIdentity').replaceChildren(); get('teacherDocumentsCards').replaceChildren();
    get('teacherDocumentsDetail').hidden = true; get('teacherDocumentsDetailRetry').hidden = true;
  }
  function stop() {
    listVersion++; listController?.abort(); loadingList = false; clearDetail();
  }
  function session() {
    if (revoked) return false;
    if (!initialToken || storage.getItem('teacherToken') !== initialToken) {
      revoked = true; stop(); rows = []; total = 0; render(); toolbar.loading();
      say(get('teacherDocumentsMessage'), 'เซสชันหมดอายุหรือบัญชีเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่', true);
      presentation.setState('error', { retry: false }); return false;
    }
    return true;
  }
  function failure(error) {
    const messages = { 401: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 403: 'บัญชีนี้ไม่มีสิทธิ์ดูเอกสาร กรุณาตรวจสอบบัญชีที่เข้าสู่ระบบ',
      404: 'ไม่พบไฟล์หรือนักศึกษาในความดูแล หรือสิทธิ์เข้าถึงเปลี่ยนแล้ว', 409: 'ไฟล์เปลี่ยนแล้ว กรุณาโหลดรายละเอียดล่าสุด',
      503: 'Backend หรือ Schema เอกสารยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ' };
    const text = messages[error.status] || 'โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง';
    if ([401,403].includes(error.status)) {
      revoked = true; stop(); rows = []; total = 0; render(); toolbar.loading();
      say(get('teacherDocumentsMessage'), text, true); presentation.setState('error', { retry: false });
    }
    return text;
  }
  function validStudent(student) { return student?.id && student.documents && Object.keys(LABELS).every(kind => STATES[student.documents[kind]?.state]); }
  function documentState(doc) {
    if (doc.state !== 'unavailable') return STATES[doc.state];
    return [doc.has_file && doc.has_link ? 'มีทั้งไฟล์และลิงก์' : doc.has_file ? 'มีไฟล์' : doc.has_link ? 'มีลิงก์' : '',
      doc.file_unavailable ? 'ไฟล์เปิดไม่ได้' : '', doc.invalid_link ? 'ลิงก์ไม่ถูกต้อง' : ''].filter(Boolean).join(' · ') || STATES.unavailable;
  }
  function render() {
    container.replaceChildren(); const tableMode = listView.view === 'table'; container.classList.toggle('teacher-table-mode', tableMode);
    const body = tableMode && rows.length ? createTeacherTable(document, container, 'เอกสารโครงการของนักศึกษาในความดูแล', ['นักศึกษา / รหัส', 'สาขา', 'ปี / ภาคเรียน', 'หัวข้อโครงการ', 'เล่มโครงการ', 'โปสเตอร์', 'CO-09', 'ดูเอกสาร']) : null;
    for (const row of rows) {
      const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'ไม่ระบุชื่อ';
      const open = button('ดูเอกสาร', () => loadDetail(row.id, open)); open.setAttribute('aria-label', `ดูเอกสาร ${name} รหัส ${row.student_id}`);
      let root;
      if (body) root = appendTeacherTableRow(document, body, [studentIdentity(document, name, row.student_id), row.major, academicPeriodText(row), row.topic || 'ยังไม่มีหัวข้อโครงการ', ...Object.keys(LABELS).map(kind => teacherStatusBadge(document, documentState(row.documents[kind]), row.documents[kind].state, 'teacher-neutral-badge')), open]);
      else {
        root = el('article', '', 'teacher-request-card'); root.append(el('h2', name), el('p', `รหัส ${row.student_id} · ${row.major || 'ไม่ระบุสาขา'} · ${academicPeriodText(row)}`), el('p', row.topic || 'ยังไม่มีหัวข้อโครงการ'));
        for (const [kind, label] of Object.entries(LABELS)) root.append(teacherStatusBadge(document, `${label}: ${documentState(row.documents[kind])}`, row.documents[kind].state, 'teacher-neutral-badge'));
        root.append(open); container.append(root);
      }
      root.classList.toggle('is-selected', row.id === selectedId);
    }
    get('teacherDocumentsPage').textContent = rows.length ? `หน้า ${offset / 25 + 1}` : ''; controls();
  }
  async function refresh() {
    if (loadingList || !visible() || !session()) return;
    clearDetail(); const ticket = ++listVersion; listController?.abort(); listController = new AbortController();
    loadingList = true; rows = []; total = 0; toolbar.loading(); render(); presentation.setState('loading'); say(get('teacherDocumentsMessage'), 'กำลังโหลดนักศึกษาและข้อมูลเอกสาร...');
    try {
      const query = { ...toolbar.query(), sort: listView.sort, offset, limit: 26 };
      let result = await services.listTeacherProjectDocuments(query, listController.signal);
      if (ticket !== listVersion || !visible() || !session()) return;
      if (!Array.isArray(result?.rows) || !Number.isInteger(result.total) || !result.rows.every(validStudent)) throw Error('Invalid document list');
      if (!result.rows.length && offset > 0) {
        offset = 0; result = await services.listTeacherProjectDocuments({ ...query, offset }, listController.signal);
        if (ticket !== listVersion || !visible() || !session()) return;
        if (!Array.isArray(result?.rows) || !Number.isInteger(result.total) || !result.rows.every(validStudent)) throw Error('Invalid document list');
      }
      rows = result.rows.slice(0,25); total = result.total; render(); toolbar.update(result);
      presentation.setState('ready', { count: rows.length, filtered: toolbar.active(), pageable: offset > 0 || offset + rows.length < total });
      say(get('teacherDocumentsMessage'), rows.length ? 'เลือกนักศึกษาเพื่อดูเอกสารและเปิดไฟล์แบบอ่านอย่างเดียว' : 'ไม่มีนักศึกษาตรงตามเงื่อนไข');
    } catch (error) {
      if (ticket !== listVersion || !visible() || !session()) return;
      say(get('teacherDocumentsMessage'), failure(error), true); presentation.setState('error', { retry: !revoked });
    } finally { if (ticket === listVersion) { loadingList = false; controls(); } }
  }
  function facts(root, entries) {
    const list = el('dl', '', 'teacher-document-facts');
    for (const [label, value] of entries) list.append(el('dt', label), el('dd', value || 'ไม่ระบุ'));
    root.append(list);
  }
  function date(value) { if (!value) return 'ไม่ระบุ'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'ไม่ระบุ' : new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(parsed); }
  function renderDetail(student) {
    get('teacherDocumentsStudentHeading').textContent = `${student.first_name || ''} ${student.last_name || ''} · ${student.student_id}`;
    facts(get('teacherDocumentsIdentity'), [['สาขาวิชา', student.major], ['ปีการศึกษา / ภาคเรียน', academicPeriodText(student)], ['หัวข้อโครงการ', student.topic], ['สถานประกอบการ', student.company_name]]);
    for (const [kind, label] of Object.entries(LABELS)) {
      const doc = student.documents[kind], card = el('article', '', 'teacher-document-card');
      card.append(el('h3', label), teacherStatusBadge(document, documentState(doc), doc.state, 'teacher-neutral-badge'));
      if (kind === 'co09') {
        card.append(teacherStatusBadge(document, doc.exists ? `สถานะการพิจารณา: ${REVIEWS[doc.review_status] || 'ไม่ระบุ'}` : 'เอกสาร CO-09 ยังไม่ถูกสร้าง', doc.review_status || 'missing', 'teacher-neutral-badge'));
        if (doc.review_reason) card.append(el('p', `เหตุผล: ${doc.review_reason}`));
      }
      if (doc.file) facts(card, [['ชื่อไฟล์', doc.file.original_name], ['ประเภท', doc.file.mime_type], ['ขนาดไฟล์', `${(doc.file.file_size / 1024).toFixed(1)} KB`], ['อัปโหลด', date(doc.file.uploaded_at)], ['แก้ไขล่าสุด', date(doc.file.updated_at)]]);
      if (doc.file_unavailable) card.append(el('p', 'มีข้อมูลไฟล์แต่ไฟล์ไม่พบหรือเปิดไม่ได้ กรุณาโหลดรายละเอียดล่าสุด', 'teacher-document-notice'));
      if (doc.invalid_link) card.append(el('p', 'ลิงก์เดิมไม่ตรงกับผู้ให้บริการหรือรูปแบบ HTTPS ที่รองรับ', 'teacher-document-notice'));
      if (doc.has_link && !doc.has_file) card.append(el('p', 'มีลิงก์ แต่ยังไม่มีไฟล์อัปโหลดที่เปิดได้'));
      if (doc.has_file && !doc.has_link) card.append(el('p', 'มีไฟล์ แต่ยังไม่มีลิงก์ที่เปิดได้'));
      const actions = el('div', '', 'teacher-document-actions');
      if (doc.has_file && doc.file) {
        const preview = button('เปิดดูตัวอย่าง', () => openFile(kind, doc.file, 'preview', preview));
        actions.append(preview, button('ดาวน์โหลดไฟล์', () => openFile(kind, doc.file, 'download', preview)));
      }
      if (doc.document_url) {
        try {
          const url = kind === 'co09' && doc.legacy_link ? httpsDocumentUrl(doc.document_url) : documentUrl(doc.document_url, kind === 'poster' ? 'drive' : 'overleaf');
          const label = kind === 'co09' && doc.legacy_link ? `เปิดลิงก์เดิม (${new URL(url).hostname})` : kind === 'poster' ? 'เปิด Google Drive' : 'เปิด Overleaf';
          const link = el('a', label, 'teacher-button'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer'; actions.append(link);
          card.append(el('p', 'การเปิดลิงก์ขึ้นอยู่กับสิทธิ์แชร์ที่เจ้าของเอกสารกำหนด'));
          if (doc.link_updated_at) card.append(el('p', `ลิงก์แก้ไขล่าสุด ${date(doc.link_updated_at)}`));
        } catch { card.append(el('p', 'ลิงก์เอกสารไม่ถูกต้อง', 'teacher-document-notice')); }
      }
      card.append(actions); get('teacherDocumentsCards').append(card);
    }
  }
  async function loadDetail(id, opener) {
    if (loadingList || !visible() || !session()) return;
    clearDetail(); selectedId = id; const ticket = ++detailVersion;
    detailController = new AbortController(); loadingDetail = true; render(); get('teacherDocumentsDetail').hidden = false;
    say(get('teacherDocumentsDetailMessage'), 'กำลังโหลดรายละเอียดเอกสาร...'); controls();
    try {
      const result = await services.readTeacherProjectDocuments(id, { ...toolbar.query(), sort: listView.sort }, detailController.signal);
      if (ticket !== detailVersion || selectedId !== id || !visible() || !session()) return;
      if (!validStudent(result?.student) || result.student.id !== id) throw Error('Invalid document detail');
      current = result.student; renderDetail(current); say(get('teacherDocumentsDetailMessage'), 'ข้อมูลเอกสารแบบอ่านอย่างเดียว');
      get('teacherDocumentsDetailRetry').hidden = false;
      if (opener) { get('teacherDocumentsStudentHeading').focus({ preventScroll: true }); get('teacherDocumentsDetail').scrollIntoView({ block: 'start', behavior: target.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    } catch (error) {
      if (ticket !== detailVersion || !visible() || !session()) return;
      say(get('teacherDocumentsDetailMessage'), failure(error), true); get('teacherDocumentsDetailRetry').hidden = revoked;
    } finally { if (ticket === detailVersion) { loadingDetail = false; controls(); } }
  }
  async function openFile(kind, file, action, opener) {
    if (loadingFile || !current || !visible() || !session()) return;
    const id = selectedId, ticket = ++fileVersion; fileController?.abort(); fileController = new AbortController(); loadingFile = true;
    if (action === 'preview') {
      clearBlob(); previewRequest = { kind, file }; previewOpener = opener; previewHeading.textContent = file.original_name;
      previewRetry.hidden = true; previewReload.hidden = true; say(previewMessage, 'กำลังโหลดไฟล์...'); modal.open();
    }
    controls();
    try {
      const blob = await services.readTeacherProjectFile(id, kind, file, action, fileController.signal);
      if (ticket !== fileVersion || id !== selectedId || !visible() || !session()) return;
      if (!(blob instanceof target.Blob) || blob.type !== file.mime_type || blob.size < 1 || blob.size > 10 * 1024 * 1024) throw Error('Invalid document bytes');
      if (action === 'download') {
        const url = target.URL.createObjectURL(blob), link = el('a'); link.href = url; link.download = file.original_name; document.body.append(link); link.click(); link.remove();
        const timer = target.setTimeout(() => { target.URL.revokeObjectURL(url); downloads.delete(url); }, 1500); downloads.set(url, timer);
        showToast('เริ่มดาวน์โหลดไฟล์แล้ว', 'success');
      } else {
        previewReady = true;
        if (file.mime_type === 'application/pdf') {
          const generation = previewGeneration;
          pdfPreview = mountTeacherPdfPreview({ document, root: previewBody, blob,
            isCurrent: () => generation === previewGeneration && visible() && !revoked });
          try { await pdfPreview.ready; }
          catch { throw Object.assign(new Error('PDF viewer unavailable'), { previewError: true }); }
          if (ticket !== fileVersion || !visible() || !session()) return;
          say(previewMessage, 'แสดง PDF ภายในหน้านี้ ใช้ปุ่มหน้าก่อน / หน้าถัดไปเพื่ออ่านเอกสาร');
        } else {
          previewUrl = target.URL.createObjectURL(blob);
          const image = el('img'); image.alt = `ตัวอย่าง ${file.original_name}`;
          image.addEventListener('load', () => { if (ticket === fileVersion) say(previewMessage, 'โหลดภาพเอกสารแล้ว'); });
          image.addEventListener('error', () => {
            if (ticket !== fileVersion) return;
            clearBlob(); say(previewMessage, 'เบราว์เซอร์เปิดภาพไม่ได้ กรุณาลองโหลดใหม่หรือดาวน์โหลดไฟล์', true); previewRetry.hidden = false; previewReload.hidden = false;
          });
          image.src = previewUrl; previewBody.append(image); say(previewMessage, 'กำลังแสดงภาพเอกสาร...');
        }
      }
    } catch (error) {
      if (ticket !== fileVersion || !visible() || !session()) return;
      const text = error.previewError ? 'แสดง PDF ไม่สำเร็จ เอกสารอาจมีรหัสผ่านหรือรูปแบบที่ไม่รองรับ กรุณาลองใหม่หรือดาวน์โหลดไฟล์' : failure(error);
      if (action === 'download' && [404,409].includes(error.status)) { modal.close(); cancelFile(); controls(); }
      if (action === 'preview' && !revoked) { say(previewMessage, text, true); previewRetry.hidden = [401,403,404,409].includes(error.status); previewReload.hidden = false; }
      else if (!revoked) { say(get('teacherDocumentsDetailMessage'), text, true); showToast(text, 'error'); }
    } finally { if (ticket === fileVersion) { loadingFile = false; controls(); } }
  }
  get('teacherDocumentsDetailRetry').addEventListener('click', () => { if (selectedId) loadDetail(selectedId); });
  get('teacherDocumentsPrevious').addEventListener('click', () => { if (offset && !loadingList) { offset -= 25; refresh(); } });
  get('teacherDocumentsNext').addEventListener('click', () => { if (!loadingList && offset + rows.length < total) { offset += 25; refresh(); } });
  document.addEventListener('teacher:viewchange', () => { if (visible()) refresh(); else stop(); });
  target.addEventListener('hashchange', () => { if (target.location.hash !== '#projectDocuments') stop(); });
  let timer = target.setInterval(session, 1000);
  target.addEventListener('storage', session); target.addEventListener('focus', session);
  get('teacherLogout')?.addEventListener('click', () => { revoked = true; stop(); rows = []; total = 0; render(); toolbar.loading(); });
  target.addEventListener('pagehide', () => { stop(); target.clearInterval(timer); });
  target.addEventListener('pageshow', event => { if (event.persisted) { target.clearInterval(timer); timer = target.setInterval(session, 1000); if (session() && visible()) refresh(); } });
  controls(); if (visible()) refresh();
  return { refresh, loadDetail };
}
if (typeof document !== 'undefined') mountTeacherProjectDocuments({ document });
