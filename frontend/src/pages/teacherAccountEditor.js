import { showConfirmModal, setButtonLoading } from '../ui/feedback.js';
import { teacherStatusBadge } from './teacherStatus.js';
import { mountTeacherGoogleAccount } from './teacherGoogleAccount.js';
import { mountTeacherProfileImage } from './teacherProfileImage.js';
import '../styles/teacher_account.css';

export function mountTeacherAccountEditor({ document, target, root, content, message, retry, request, getToken, toast }) {
  const head = document.body.dataset.workflowRole === 'department_head';
  const path = head ? '/api/department-head/me' : '/api/teachers/me';
  const fields = [['first_name', 'ชื่อภาษาไทย'], ['last_name', 'นามสกุลภาษาไทย'], ['first_name_en', 'ชื่อภาษาอังกฤษ'], ['last_name_en', 'นามสกุลภาษาอังกฤษ'],
    ['academic_title', 'คำนำหน้าทางวิชาการ'], ['major', 'สาขา'], ['department', 'ภาควิชา']];
  const el = (tag, text = '', cls = '') => { const node = document.createElement(tag); node.textContent = text; node.className = cls; return node; };
  function icon(path) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(key, value);
    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path'); shape.setAttribute('d', path); svg.append(shape); return svg;
  }
  const summary = el('section', '', 'teacher-account-summary teacher-account-card'); summary.setAttribute('aria-label', 'สรุปบัญชีของฉัน');
  const avatar = el('span', '…', 'teacher-account-avatar'); avatar.setAttribute('aria-hidden', 'true');
  const summaryInfo = el('div', '', 'teacher-account-summary-info'), summaryName = el('h2', 'กำลังโหลดข้อมูลบัญชี...');
  const summaryPosition = el('p', '—'), summaryDepartment = el('p', '—'); summaryInfo.append(el('p', 'บัญชีของฉัน', 'teacher-account-eyebrow'), summaryName, summaryPosition, summaryDepartment);
  const summaryStatus = teacherStatusBadge(document, 'กำลังตรวจสอบ', 'unknown'); summary.append(avatar, summaryInfo, summaryStatus);
  const layout = el('div', '', 'teacher-account-layout'), personal = el('section', '', 'teacher-account-card teacher-account-personal');
  const personalHeader = el('div', '', 'teacher-account-card-heading'), personalTitle = el('h2', 'ข้อมูลส่วนตัว'); personalTitle.id = 'teacherPersonalHeading'; personal.setAttribute('aria-labelledby', personalTitle.id);
  const personalIntro = el('div'); personalIntro.append(personalTitle, el('p', 'จัดการชื่อและข้อมูลทางวิชาการที่แสดงในระบบ'));
  const view = el('dl', '', 'teacher-account-names'), form = el('form', '', 'teacher-account-form'), fieldset = el('fieldset');
  fieldset.append(el('legend', 'แก้ไขข้อมูลส่วนตัว'));
  const grid = el('div', '', 'teacher-account-fields'), inputs = {}, fieldErrors = {};
  for (const [key, labelText] of fields) {
    const label = el('label', labelText), input = el(key === 'major' ? 'select' : 'input'); input.id = `teacherAccount_${key}`;
    if (key !== 'major') { input.type = 'text'; input.maxLength = 255; }
    input.required = ['first_name', 'last_name'].includes(key); if (key === 'department') input.readOnly = true;
    input.autocomplete = key === 'first_name' ? 'given-name' : key === 'last_name' ? 'family-name' : 'off';
    const error = el('span', '', 'teacher-account-field-error'); error.id = `${input.id}_error`; error.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-describedby', error.id);
    label.htmlFor = input.id; label.append(input, error); grid.append(label); inputs[key] = input; fieldErrors[key] = error;
  }
  const hint = el('p', 'ชื่ออังกฤษ: A–Z ตัวพิมพ์ใหญ่ ไม่เกิน 255 ตัวอักษร คั่นด้วยช่องว่าง apostrophe หรือขีดกลางได้ และเว้นว่างได้', 'teacher-account-hint');
  hint.id = 'teacherAccountEnglishHint';
  for (const key of ['first_name_en', 'last_name_en']) inputs[key].setAttribute('aria-describedby', `${hint.id} ${fieldErrors[key].id}`);
  const departmentNote = el('p', 'ภาควิชามีผลต่อสิทธิ์เข้าถึงคำร้อง ขณะนี้ยังไม่มีขั้นตอนคำขอและอนุมัติการย้ายภาควิชา กรุณาติดต่อผู้ดูแลระบบ จึงยังแก้ไขด้วยตนเองไม่ได้', 'teacher-account-hint');
  departmentNote.id = 'teacherDepartmentPolicy'; inputs.department.setAttribute('aria-describedby', departmentNote.id);
  const catalogNote = el('p', '', 'teacher-account-hint'); catalogNote.setAttribute('aria-live', 'polite');
  const catalogRetry = el('button', 'ลองโหลดสาขาอีกครั้ง', 'teacher-button'); catalogRetry.type = 'button'; catalogRetry.hidden = true;
  const draft = el('p', '', 'teacher-account-unsaved'); draft.setAttribute('role', 'status'); draft.setAttribute('aria-live', 'polite');
  const actions = el('div', '', 'teacher-account-actions');
  const edit = el('button', 'แก้ไขข้อมูล', 'teacher-button teacher-button--primary'); edit.type = 'button';
  edit.prepend(icon('m16 3 5 5M4 20l4-1L21 6a2.1 2.1 0 0 0-3-3L5 16l-1 4Z'));
  const save = el('button', 'บันทึกการเปลี่ยนแปลง', 'teacher-button teacher-button--primary'); save.type = 'submit';
  const cancel = el('button', 'ยกเลิก', 'teacher-button'); cancel.type = 'button'; actions.append(cancel, save);
  fieldset.append(grid, hint, draft, actions); form.append(fieldset); form.hidden = true;
  const protectedRoot = el('section', '', 'teacher-account-card teacher-account-protected'), protectedTitle = el('h2', 'ข้อมูลบัญชีและสิทธิ์');
  protectedTitle.id = 'teacherPermissionsHeading'; protectedRoot.setAttribute('aria-labelledby', protectedTitle.id);
  protectedRoot.append(protectedTitle, el('p', 'ข้อมูลส่วนนี้จัดการโดยผู้ดูแลระบบ', 'teacher-account-hint'));
  const protectedList = el('dl'); protectedRoot.append(protectedList);
  const technical = el('details', '', 'teacher-account-technical'), technicalSummary = el('summary', 'ข้อมูลทางเทคนิค');
  const technicalBody = el('div', '', 'teacher-account-technical-body'), accountId = el('code', '—'); accountId.tabIndex = 0;
  accountId.setAttribute('aria-label', 'รหัสบัญชี UUID');
  const copyId = el('button', 'คัดลอก ID', 'teacher-button'); copyId.type = 'button'; copyId.prepend(icon('M9 9h11v11H9zM5 15H4V4h11v1'));
  technicalBody.append(accountId, copyId); technical.append(technicalSummary, technicalBody); protectedRoot.append(technical);
  personalHeader.append(personalIntro, edit); message.classList.add('teacher-account-feedback');
  const recovery = el('div', '', 'teacher-account-recovery'); recovery.append(retry);
  personal.append(personalHeader, message, view, form, departmentNote, catalogNote, catalogRetry, recovery); layout.append(personal, protectedRoot);
  content.classList.add('teacher-account-content'); content.replaceChildren(summary, layout);
  let row = null, editing = false, busy = false, loadFailed = false, serial = 0, loadedToken = getToken(), google, photo;
  let majors = [], catalogBusy = false, catalogAvailable = false;
  const normalized = (key, value) => ['first_name', 'last_name'].includes(key) ? String(value ?? '').trim() : String(value ?? '').trim() || null;
  const changes = () => Object.fromEntries(fields.filter(([key]) => key !== 'department' && normalized(key, inputs[key].value) !== normalized(key, row?.[key])).map(([key]) => [key, normalized(key, inputs[key].value)]));
  function say(text, error = false) { message.textContent = text; message.dataset.type = error ? 'error' : 'info'; message.setAttribute('role', error ? 'alert' : 'status'); }
  function showFieldError(key, text = '') {
    fieldErrors[key].textContent = text;
    if (text) inputs[key].setAttribute('aria-invalid', 'true'); else inputs[key].removeAttribute('aria-invalid');
  }
  function controls() {
    const googleBusy = google?.isBusy() || photo?.isBusy();
    edit.hidden = editing || !row; edit.disabled = busy || googleBusy;
    view.hidden = editing; form.hidden = !editing; fieldset.disabled = busy || googleBusy;
    save.disabled = busy || googleBusy || !Object.keys(changes()).length;
    inputs.major.disabled = busy || googleBusy || !catalogAvailable;
    catalogRetry.disabled = busy || googleBusy || catalogBusy;
    photo?.setBlocked(busy || editing || !!google?.isBusy());
    retry.disabled = busy || editing || googleBusy; retry.hidden = !loadFailed || busy;
    recovery.hidden = retry.hidden;
    root.dataset.accountMode = editing ? 'edit' : 'view';
    root.dataset.accountLoading = String(busy && !row); copyId.disabled = busy || !row;
    draft.textContent = editing && Object.keys(changes()).length ? 'มีการเปลี่ยนแปลงที่ยังไม่บันทึก' : 'ยังไม่มีการเปลี่ยนแปลง';
    draft.hidden = !editing || !Object.keys(changes()).length;
    content.setAttribute('aria-busy', String(busy));
  }
  function setEditing(value) {
    editing = value;
    if (value && row) for (const [key] of fields) { inputs[key].value = row[key] ?? ''; inputs[key].setCustomValidity(''); showFieldError(key); }
    google?.setEditing(value); controls();
    if (value) inputs.first_name.focus(); else edit.focus();
  }
  function render(data, token) {
    loadFailed = false; row = data; loadedToken = token; view.replaceChildren(); protectedList.replaceChildren();
    const item = (list, label, value) => { const part = el('div'); part.append(el('dt', label), el('dd', value || 'ยังไม่ระบุ')); list.append(part); return part; };
    for (const [key, label] of fields) item(view, label, row[key]);
    for (const [label, value] of [['อีเมลเข้าสู่ระบบ', row.email], ['ตำแหน่ง', row.position],
      ['บทบาท', row.is_department_head ? 'หัวหน้าภาควิชา / อาจารย์' : 'อาจารย์'], ['สิทธิ์หัวหน้าภาควิชา', row.is_department_head ? 'ได้รับสิทธิ์' : 'ไม่ได้รับสิทธิ์'],
      ['สิทธิ์เพิ่มเติม / Admin Grant', 'จัดการโดยผู้ดูแลระบบ']]) item(protectedList, label, value);
    const status = item(protectedList, 'สถานะบัญชี', '');
    status.querySelector('dd').replaceChildren(teacherStatusBadge(document, row.status === 'active' ? 'ใช้งานอยู่' : 'ไม่เปิดใช้งาน', row.status === 'active' ? 'verified' : 'inactive'));
    const name = [row.academic_title, row.first_name, row.last_name].filter(Boolean).join(' ');
    avatar.textContent = [row.first_name, row.last_name].map(value => [...(value?.trim() || '')][0] || '').join('') || '—';
    updateMajorOptions(); photo?.setProfile(row, token);
    summaryName.textContent = name || 'ยังไม่ระบุชื่อ'; summaryPosition.textContent = row.position || 'ยังไม่ระบุตำแหน่ง';
    summaryDepartment.textContent = row.department || 'ยังไม่ระบุภาควิชา';
    summaryStatus.textContent = row.status === 'active' ? 'ใช้งานอยู่' : 'ไม่เปิดใช้งาน'; summaryStatus.dataset.tone = row.status === 'active' ? 'success' : 'neutral';
    accountId.textContent = row.id;
    for (const id of ['teacherName', 'teacherWelcomeName', 'headName', 'headWelcomeName']) {
      const node = document.getElementById(id); if (node) node.textContent = name;
    }
    controls();
  }
  const current = (ticket, token) => serial === ticket && !!token && getToken() === token;
  function updateMajorOptions() {
    const selected = editing ? inputs.major.value : row?.major || '';
    inputs.major.replaceChildren(el('option', 'ยังไม่ระบุ'));
    inputs.major.firstChild.value = '';
    for (const value of new Set([...majors, ...(row?.major ? [row.major] : []), ...(selected ? [selected] : [])])) {
      const option = el('option', value); option.value = value; inputs.major.append(option);
    }
    inputs.major.value = selected;
  }
  async function loadOptions() {
    if (catalogBusy) return;
    const token = getToken(), ticket = serial; catalogBusy = true; catalogRetry.hidden = true; controls();
    try {
      const result = await request(`${path}/profile-options`, { auth: false, headers: { Authorization: `Bearer ${token}` } });
      if (!current(ticket, token)) return;
      if (result?.success !== true || !Array.isArray(result.data?.majors) || result.data.majors.some(value => typeof value !== 'string' || !value.trim())) throw Error('ข้อมูลสาขาไม่ถูกต้อง');
      majors = result.data.majors; catalogAvailable = majors.length > 0; updateMajorOptions();
      catalogNote.textContent = catalogAvailable ? '' : 'ยังไม่มีข้อมูลสาขาใน Catalog จึงยังเปลี่ยนสาขาไม่ได้';
    } catch (error) {
      if (current(ticket, token)) { catalogAvailable = false; catalogNote.textContent = error.message || 'โหลดสาขาไม่สำเร็จ'; catalogRetry.hidden = false; }
    } finally { catalogBusy = false; controls(); }
  }
  async function fetchProfile(token) {
    const response = await request(path, { auth: false, headers: { Authorization: `Bearer ${token}` } });
    if (response?.success !== true || !response.data?.id || (row && response.data.id !== row.id)) throw Error('รูปแบบข้อมูลบัญชีไม่ถูกต้อง');
    return response.data;
  }
  async function load() {
    if (busy || editing || google?.isBusy() || photo?.isBusy()) return;
    const ticket = ++serial, token = getToken(); loadFailed = false; busy = true; controls(); say('กำลังโหลดข้อมูลบัญชี...');
    try {
      if (!token) throw Error('กรุณาเข้าสู่ระบบใหม่');
      const data = await fetchProfile(token); if (!current(ticket, token)) return;
      render(data, token); await loadOptions(); if (!current(ticket, token)) return;
      say('แก้ไขชื่อ คำนำหน้าทางวิชาการ และสาขาของตนเองได้');
    } catch (error) { if (ticket === serial) { loadFailed = true; say(error.message || 'โหลดข้อมูลบัญชีไม่สำเร็จ กรุณาลองใหม่', true); } }
    finally { if (ticket === serial) { busy = false; controls(); } }
  }
  edit.addEventListener('click', () => { if (row && !busy && !google?.isBusy() && !photo?.isBusy()) setEditing(true); });
  for (const [key] of fields) {
    inputs[key].addEventListener('input', () => { inputs[key].setCustomValidity(''); showFieldError(key); controls(); });
    inputs[key].addEventListener('invalid', event => {
      event.preventDefault();
      const first = !fieldset.querySelector('[aria-invalid="true"]');
      showFieldError(key, inputs[key].validity.valueMissing ? 'กรุณากรอกชื่อและนามสกุล' : inputs[key].validationMessage);
      if (first) inputs[key].focus();
    });
  }
  copyId.addEventListener('click', async () => {
    if (!row || busy) return;
    const id = row.id, token = loadedToken;
    try {
      if (!target.navigator?.clipboard?.writeText) throw Error();
      await target.navigator.clipboard.writeText(id);
      if (row?.id === id && token === getToken()) toast('คัดลอก ID แล้ว', 'success');
    } catch { if (token === getToken()) toast('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกและคัดลอก ID ที่แสดง', 'error'); }
  });
  cancel.addEventListener('click', () => {
    if (busy) return;
    if (!Object.keys(changes()).length) { setEditing(false); return; }
    showConfirmModal({ title: 'ยกเลิกการแก้ไขข้อมูล?', message: 'ข้อมูลที่ยังไม่ได้บันทึกในฟอร์มนี้จะถูกยกเลิก', variant: 'primary', confirmLabel: 'ยกเลิกการแก้ไข', cancelLabel: 'แก้ไขต่อ',
      onConfirm: () => { setEditing(false); say('ยกเลิกการแก้ไขแล้ว'); } });
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || google?.isBusy() || photo?.isBusy() || !row) return;
    const body = changes(); if (!Object.keys(body).length) return;
    for (const [key] of fields) {
      const input = inputs[key], value = normalized(key, input.value);
      input.setCustomValidity(['first_name', 'last_name'].includes(key) && !value ? 'กรุณากรอกชื่อและนามสกุล'
        : key.endsWith('_en') && value && !/^[A-Z]+(?:[ '-][A-Z]+)*$/.test(value) ? 'ชื่ออังกฤษต้องเป็นตัวพิมพ์ใหญ่ A–Z ตามรูปแบบที่กำหนด' : '');
      showFieldError(key, input.validationMessage);
    }
    if (!form.reportValidity()) { fields.map(([key]) => inputs[key]).find(input => !input.validity.valid)?.focus(); return; }
    const ticket = ++serial, token = getToken(); if (!token || token !== loadedToken) { clear(); return; }
    busy = true; controls(); setButtonLoading(save, true, 'กำลังบันทึก...', 'บันทึกการเปลี่ยนแปลง');
    say('กำลังบันทึกการเปลี่ยนแปลง...'); let saved = false;
    try {
      const response = await request(path, { method: 'PATCH', body, auth: false, headers: { Authorization: `Bearer ${token}` } });
      if (!current(ticket, token)) return;
      if (response?.success !== true || response.data?.id !== row.id) throw Error('ยังยืนยันผลการบันทึกไม่ได้ กรุณาตรวจสอบข้อมูลล่าสุด');
      saved = true; editing = false; google?.setEditing(false); render(response.data, token);
      const fresh = await fetchProfile(token); if (!current(ticket, token)) return;
      render(fresh, token); say('บันทึกการเปลี่ยนแปลงสำเร็จ'); message.dataset.type = 'success'; toast('บันทึกข้อมูลส่วนตัวสำเร็จ', 'success');
    } catch (error) {
      if (current(ticket, token)) {
        loadFailed = saved;
        say(saved ? 'บันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณากดโหลดข้อมูลอีกครั้ง' : error.message || 'บันทึกไม่สำเร็จ ร่างข้อมูลยังอยู่', true);
        toast(message.textContent, 'error');
      }
    } finally { if (ticket === serial) { busy = false; setButtonLoading(save, false, 'กำลังบันทึก...', 'บันทึกการเปลี่ยนแปลง'); controls(); if (saved && !editing) edit.focus(); } }
  });
  google = mountTeacherGoogleAccount({ document, target, root: personal, getToken, toast, onBusyChange: controls });
  photo = mountTeacherProfileImage({ document, target, summary, avatar, path, request, getToken, toast,
    onBusyChange: value => { google?.setEditing(editing || value); controls(); } });
  catalogRetry.addEventListener('click', loadOptions);
  retry.textContent = 'ลองโหลดข้อมูลอีกครั้ง'; retry.addEventListener('click', load);
  function clear() {
    ++serial; row = null; editing = false; busy = false; loadFailed = false; loadedToken = getToken(); view.replaceChildren(); protectedList.replaceChildren(); form.reset();
    avatar.textContent = '—'; summaryName.textContent = 'ยังไม่ได้โหลดข้อมูลบัญชี'; summaryPosition.textContent = '—'; summaryDepartment.textContent = '—';
    summaryStatus.textContent = 'ยังไม่ได้ตรวจสอบ'; summaryStatus.dataset.tone = 'neutral'; accountId.textContent = '—'; technical.open = false;
    for (const [key] of fields) showFieldError(key);
    google.clear(); google.setEditing(false); controls(); say('สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่', true);
    photo.clear(); majors = []; catalogAvailable = false; catalogNote.textContent = ''; catalogRetry.hidden = true;
  }
  const onView = event => { if (event.detail.view === 'own-account') { load(); if (!editing) google.load(); } };
  document.addEventListener(head ? 'head:viewchange' : 'teacher:viewchange', onView);
  document.addEventListener('teacher:coop-session-invalid', clear);
  target.addEventListener('storage', () => { if (loadedToken !== getToken()) clear(); });
  target.addEventListener('pagehide', clear);
  target.addEventListener('pageshow', event => { if (event.persisted) { load(); if (!root.hidden) google.load(); } });
  const ready = load(); if (!root.hidden) google.load();
  return { ready, load };
}
