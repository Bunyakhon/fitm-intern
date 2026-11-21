import { getStaffTeachers, getStaffTeacher, getStaffTeacherOptions, createStaffTeacher, updateStaffTeacher, deactivateStaffTeacher, resetStaffTeacherPassword } from '../api/staffTeachers.api.js';
import { getCurrentStaff, STAFF_TOKEN_KEY } from '../api/staffDocuments.api.js';
import { teacherStatusBadge } from './teacherStatus.js';
import { showToast, showConfirmModal, setButtonLoading } from '../ui/feedback.js';
import '../styles/staff_teachers.css';

const PAGE_SIZE = 25;

export function mountStaffTeachers({ document, target = document.defaultView, storage,
  me = getCurrentStaff, list = getStaffTeachers, detail = getStaffTeacher, options = getStaffTeacherOptions,
  create = createStaffTeacher, update = updateStaffTeacher, deactivate = deactivateStaffTeacher, resetPassword = resetStaffTeacherPassword,
  toast = showToast, confirm = showConfirmModal }) {
  const get = id => document.getElementById(id), root = get('staffTeachers');
  if (!root) return;
  const container = get('staffTeachersList'), form = get('staffTeachersFilters'), panel = get('staffTeacherDetail');
  const tokenNow = () => storage.getItem(STAFF_TOKEN_KEY);
  let active = false, authorized = false, profile = null, boundToken = null;
  let sequence = 0, detailSequence = 0, fetching = false, reading = false, loaded = false;
  let offset = 0, hasNext = false, applied = {}, selectedId = null;
  const editor = get('staffTeacherEditor'), editForm = get('staffTeacherForm');
  const fields = { first_name: 'staffTeacherFirstName', last_name: 'staffTeacherLastName', academic_title: 'staffTeacherTitle', major: 'staffTeacherMajorValue', email: 'staffTeacherEmail' };
  const fieldErrors = {};
  editForm.noValidate = true;
  for (const [key, id] of Object.entries(fields)) {
    const error = document.createElement('span'); error.id = `${id}Error`; error.className = 'staff-teacher-field-error'; error.setAttribute('aria-live', 'polite');
    get(id).closest('label').append(error); get(id).setAttribute('aria-describedby', `${get(id).getAttribute('aria-describedby') || ''} ${error.id}`.trim()); fieldErrors[key] = error;
  }
  let record = null, editing = null, baseline = {}, saving = false, modalOpen = false, closeConfirmation = null;
  let needsRead = false, catalogBusy = false, catalogReady = false, majors = [], editorSequence = 0;
  const value = key => ['major', 'academic_title'].includes(key) ? get(fields[key]).value.trim() || null : get(fields[key]).value.trim();
  const dirty = () => !!editing && Object.keys(baseline).some(key => value(key) !== baseline[key]);
  const canLeave = () => !saving && !modalOpen && !dirty();
  function node(tag, text, className) {
    const element = document.createElement(tag); if (text != null) element.textContent = text;
    if (className) element.className = className; return element;
  }
  function say(id, text, error = false) {
    get(id).textContent = text; get(id).dataset.type = error ? 'error' : 'info';
    get(id).setAttribute('role', error ? 'alert' : 'status');
  }
  function controls() {
    const blocked = !active || !authorized || !tokenNow();
    const busy = saving || modalOpen, browsing = busy || !!editing;
    for (const id of ['staffTeachersQuery', 'staffTeachersMajor', 'staffTeachersStatus', 'staffTeachersSearch', 'staffTeachersClear']) get(id).disabled = blocked || browsing;
    for (const id of ['staffTeachersRefresh', 'staffTeachersRetry']) get(id).disabled = !active || !tokenNow() || fetching || browsing;
    get('staffTeachersAdd').disabled = blocked || fetching || reading || browsing || !loaded;
    get('staffTeachersPrevious').disabled = blocked || fetching || browsing || !loaded || offset === 0;
    get('staffTeachersNext').disabled = blocked || fetching || browsing || !loaded || !hasNext;
    for (const button of container.querySelectorAll('button')) button.disabled = blocked || fetching || browsing;
    get('staffTeacherRetry').disabled = blocked || fetching || reading || busy;
    get('staffTeacherClose').disabled = busy || !!editing;
    for (const id of ['staffTeacherEdit', 'staffTeacherDeactivate']) {
      get(id).hidden = !record;
      get(id).disabled = blocked || fetching || reading || browsing || !record || record.is_department_head
        || id === 'staffTeacherDeactivate' && record.status !== 'active';
    }
    get('staffTeacherResetPassword').hidden = !record;
    get('staffTeacherResetPassword').disabled = blocked || fetching || reading || browsing || record?.can_reset_password !== true;
    get('staffTeacherResetPassword').title = record?.password_reset_reason || '';
    editor.hidden = !editing;
    get('staffTeacherFields').disabled = blocked || saving || modalOpen || reading;
    get('staffTeacherMajorValue').disabled = catalogBusy || !catalogReady;
    get('staffTeacherSave').disabled = blocked || busy || reading || catalogBusy || needsRead || !dirty();
    get('staffTeacherCancel').disabled = saving || modalOpen || reading;
    get('staffTeacherReconcile').hidden = !needsRead || editing !== 'edit';
    get('staffTeacherReconcile').disabled = blocked || busy || reading;
    get('staffTeacherCatalogRetry').disabled = blocked || busy || catalogBusy;
    get('staffTeacherDraft').textContent = editing ? dirty() ? 'มีการเปลี่ยนแปลงที่ยังไม่บันทึก' : 'ยังไม่มีการเปลี่ยนแปลง' : '';
    container.setAttribute('aria-busy', String(fetching)); panel.setAttribute('aria-busy', String(reading || saving));
    editor.setAttribute('aria-busy', String(saving || catalogBusy));
  }
  function closeDetail(focus = false) {
    ++detailSequence; reading = false; panel.hidden = true; get('staffTeacherInfo').replaceChildren();
    get('staffTeacherRetry').hidden = true; say('staffTeacherMessage', ''); controls();
    if (focus) {
      const opener = [...container.querySelectorAll('[data-staff-teacher]')].find(button => button.dataset.staffTeacher === selectedId);
      (opener || get('staffTeachersHeading')).focus({ preventScroll: true });
    }
    selectedId = null; record = null; get('staffTeacherProtection').textContent = ''; get('staffTeacherResetReason').textContent = ''; controls();
  }
  function closeEditor() {
    ++editorSequence; editing = null; baseline = {}; needsRead = catalogBusy = catalogReady = false; majors = [];
    editForm.reset(); clearValidation(); say('staffTeacherSaveMessage', ''); controls();
  }
  function reset() {
    ++sequence; active = authorized = fetching = loaded = hasNext = false;
    closeConfirmation?.(); closeConfirmation = null; modalOpen = saving = false;
    profile = boundToken = null; offset = 0; applied = {}; form.reset(); container.replaceChildren(); closeEditor(); closeDetail();
    setButtonLoading(get('staffTeacherSave'), false, 'กำลังบันทึก...', 'บันทึกข้อมูล');
    get('staffTeachersScope').textContent = 'ยังไม่ได้ยืนยันสิทธิ์ภาควิชา'; get('staffTeachersPage').textContent = '';
    get('staffTeachersRetry').hidden = true; say('staffTeachersMessage', 'สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่', true); controls();
  }
  function current(ticket, token) {
    if (boundToken && tokenNow() !== boundToken) { reset(); return false; }
    return active && ticket === sequence && !!token && tokenNow() === token;
  }
  const staffProfile = result => result?.success === true && typeof result.data?.id === 'string' && result.data.is_active === true;
  const validTeacher = row => row && typeof row.id === 'string' && /^[0-9a-f-]{36}$/i.test(row.id)
    && typeof profile?.department === 'string' && !!profile.department.trim() && row.department === profile.department
    && ['active', 'inactive'].includes(row.status) && typeof row.is_department_head === 'boolean'
    && ['first_name', 'last_name'].every(key => typeof row[key] === 'string')
    && ['email', 'major'].every(key => row[key] === null || typeof row[key] === 'string');
  async function accessError(error, isCurrent, profileRequest = false) {
    if (![401, 403, 404].includes(error.status) || !isCurrent()) return false;
    let revoked = error.status === 401 || profileRequest;
    const previousDepartment = profile?.department;
    let verified = false;
    if (!revoked) {
      // A missing department grant denies this directory, not all Staff work.
      try {
        const response = await me(); if (!isCurrent()) return true;
        if (staffProfile(response)) { profile = response.data; verified = true; }
        else if (response?.success === true && response.data?.is_active === false) revoked = true;
      } catch (sessionError) {
        if (!isCurrent()) return true;
        revoked = [401, 403].includes(sessionError.status);
      }
    }
    if (!isCurrent()) return true;
    if (revoked) {
      reset(); storage.removeItem(STAFF_TOKEN_KEY); target.location.replace('/login.html'); return true;
    }
    // Target-level denial does not revoke a verified Staff in the same scope.
    // Re-read /me also on 404: a changed department must clear old data/drafts.
    if (verified && profile.department === previousDepartment && profile.department?.trim()) return false;
    authorized = loaded = hasNext = false; container.replaceChildren(); closeEditor(); closeDetail();
    get('staffTeachersScope').textContent = `ภาควิชา: ${profile?.department || 'ยังไม่ได้รับมอบหมาย'}`;
    get('staffTeachersPage').textContent = ''; get('staffTeachersRetry').hidden = false;
    say('staffTeachersMessage', 'ขอบเขตสิทธิ์เปลี่ยนหรือยังยืนยันไม่ได้ กรุณาโหลดรายชื่อใหม่', true); controls();
    return true;
  }
  function errorText(error) {
    if (error.status === 400) return error.message || 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง';
    if (error.status === 403) return !profile?.department?.trim()
      ? 'บัญชีนี้ยังไม่ได้รับมอบหมายภาควิชาสำหรับดูข้อมูลอาจารย์ กรุณาติดต่อผู้ดูแลระบบ'
      : 'ไม่มีสิทธิ์ดูข้อมูลอาจารย์ในขอบเขตนี้ กรุณาตรวจสอบสิทธิ์หรือโหลดรายชื่อใหม่';
    if (error.status === 404) return 'ไม่พบอาจารย์ในภาควิชาที่เข้าถึงได้แล้ว กรุณาโหลดรายชื่อใหม่';
    if (error.status === 409) return error.message || 'ข้อมูลเปลี่ยนแปลงหรือขัดแย้ง กรุณาลองโหลดข้อมูลล่าสุดอีกครั้ง';
    return 'โหลดข้อมูลอาจารย์ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง';
  }
  function renderRows(rows) {
    container.replaceChildren();
    if (!rows.length) {
      container.append(node('p', offset ? 'ไม่มีรายการในหน้านี้ ลองกลับหน้าก่อนหน้าหรือเปลี่ยนตัวกรอง'
        : 'ไม่พบอาจารย์ตามเงื่อนไข ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง', 'staff-teachers-empty')); return;
    }
    for (const row of rows) {
      const card = node('article', null, 'staff-teacher-card'), name = [row.academic_title, row.first_name, row.last_name].filter(Boolean).join(' ');
      card.append(node('h2', name), teacherStatusBadge(document, row.status === 'active' ? 'ใช้งานอยู่' : 'ไม่เปิดใช้งาน', row.status === 'active' ? 'verified' : 'inactive'));
      const info = node('dl');
      for (const [label, value] of [['อีเมล', row.email], ['สาขาวิชา', row.major]]) info.append(node('dt', label), node('dd', value || 'ยังไม่ระบุ'));
      const button = node('button', 'ดูรายละเอียด', 'teacher-button teacher-button--primary'); button.type = 'button';
      button.dataset.staffTeacher = row.id; button.setAttribute('aria-label', `ดูรายละเอียด ${name}`);
      button.addEventListener('click', () => openDetail(row.id)); card.append(info, button); container.append(card);
    }
  }
  async function load(nextOffset = offset, filters = applied) {
    if (!active || editing || saving || modalOpen) return false;
    const token = tokenNow(); if (!token) { reset(); target.location.replace('/login.html'); return; }
    const ticket = ++sequence; boundToken = token; offset = nextOffset; applied = { ...filters };
    const isCurrent = () => current(ticket, token);
    closeDetail(); fetching = true; loaded = hasNext = false; get('staffTeachersRetry').hidden = true;
    container.replaceChildren(node('p', 'กำลังโหลดรายชื่ออาจารย์...', 'staff-teachers-empty'));
    say('staffTeachersMessage', 'กำลังโหลดข้อมูลล่าสุด...'); get('staffTeachersPage').textContent = `กำลังโหลดหน้า ${offset / PAGE_SIZE + 1}`; controls();
    let profileRequest = true;
    try {
      const account = await me(); if (!isCurrent()) return;
      if (!staffProfile(account)) {
        if (account?.success === true && account.data?.is_active === false) throw Object.assign(Error('Staff unavailable'), { status: 403 });
        throw Error('Invalid Staff profile');
      }
      profile = account.data; authorized = true; profileRequest = false;
      get('staffTeachersScope').textContent = `ภาควิชา: ${profile.department || 'ยังไม่ได้รับมอบหมาย'}`;
      const response = await list({ ...applied, limit: PAGE_SIZE + 1, offset }); if (!isCurrent()) return;
      if (response?.success !== true || !Array.isArray(response.data) || response.data.length > PAGE_SIZE + 1
        || response.data.some(row => !validTeacher(row))) throw Error('Invalid teacher directory');
      const rows = response.data.slice(0, PAGE_SIZE); hasNext = response.data.length > PAGE_SIZE; loaded = true; renderRows(rows);
      get('staffTeachersPage').textContent = `หน้า ${offset / PAGE_SIZE + 1} · ${rows.length ? `รายการ ${offset + 1}–${offset + rows.length}` : '0 รายการในหน้านี้'}`;
      say('staffTeachersMessage', rows.length ? `แสดง ${rows.length} รายการในหน้านี้${hasNext ? ' · มีหน้าถัดไป' : ''}` : 'ไม่พบผลลัพธ์ตามเงื่อนไข');
      return true;
    } catch (error) {
      if (!isCurrent() || await accessError(error, isCurrent, profileRequest) || !isCurrent()) return;
      container.replaceChildren(node('p', 'ยังแสดงรายชื่ออาจารย์ไม่ได้', 'staff-teachers-empty'));
      say('staffTeachersMessage', errorText(error), true); get('staffTeachersRetry').hidden = false;
      get('staffTeachersPage').textContent = `หน้า ${offset / PAGE_SIZE + 1} · โหลดไม่สำเร็จ`;
    } finally { if (ticket === sequence) { fetching = false; controls(); } }
  }
  async function openDetail(id) {
    if (!active || !authorized || fetching || !loaded || editing || saving || modalOpen) return false;
    const token = tokenNow(), listTicket = sequence, ticket = ++detailSequence;
    const isCurrent = () => current(listTicket, token) && ticket === detailSequence;
    if (!isCurrent()) return;
    selectedId = id; record = null; reading = true; panel.hidden = false; get('staffTeacherInfo').replaceChildren(); get('staffTeacherProtection').textContent = '';
    get('staffTeacherRetry').hidden = true; say('staffTeacherMessage', 'กำลังโหลดรายละเอียดล่าสุด...'); controls();
    get('staffTeacherDetailHeading').focus({ preventScroll: true }); panel.scrollIntoView({ block: 'nearest' });
    try {
      const response = await detail(id); if (!isCurrent()) return;
      if (response?.success !== true || response.data?.id !== id || !validTeacher(response.data))
        throw Object.assign(Error('Invalid teacher detail'), { status: 403 });
      const row = response.data; record = row;
      renderInfo(row);
      get('staffTeacherProtection').textContent = row.is_department_head
        ? 'บัญชีหัวหน้าภาควิชาอ่านได้เท่านั้น เจ้าหน้าที่แก้ไขหรือปิดใช้งานไม่ได้'
        : row.status === 'inactive' ? 'บัญชีนี้ไม่เปิดใช้งาน เจ้าหน้าที่ไม่มีสิทธิ์เปิดใช้งานบัญชี' : 'การปิดใช้งานจะตรวจภาระงานปัจจุบันก่อน และเก็บประวัติทั้งหมด';
      say('staffTeacherMessage', 'ข้อมูลล่าสุดจากระบบ');
      return true;
    } catch (error) {
      if (!isCurrent() || await accessError(error, isCurrent) || !isCurrent()) return;
      const message = errorText(error); say('staffTeacherMessage', message, true); toast(message, 'error');
      get('staffTeacherRetry').hidden = false;
    } finally { if (ticket === detailSequence) { reading = false; controls(); } }
  }
  function clearValidation() {
    for (const id of Object.values(fields)) { get(id).setCustomValidity(''); get(id).removeAttribute('aria-invalid'); }
    for (const error of Object.values(fieldErrors)) error.textContent = '';
  }
  function majorOptions(selected = value('major')) {
    const select = get(fields.major); select.replaceChildren(node('option', 'ยังไม่ระบุ')); select.firstChild.value = '';
    // Keep an existing legacy major visible, but never invent new catalog values.
    for (const major of new Set([...majors, ...(selected ? [selected] : [])])) {
      const option = node('option', major); option.value = major; select.append(option);
    }
    select.value = selected || '';
  }
  async function loadOptions() {
    if (!editing || catalogBusy || saving || modalOpen) return;
    const token = tokenNow(), ticket = sequence, editorTicket = editorSequence;
    const isCurrent = () => current(ticket, token) && editorTicket === editorSequence && !!editing;
    catalogBusy = true; get('staffTeacherCatalogRetry').hidden = true; say('staffTeacherCatalogNote', 'กำลังโหลดสาขา...'); controls();
    try {
      const response = await options(); if (!isCurrent()) return;
      if (response?.success !== true || response.data?.department !== profile.department || !Array.isArray(response.data.majors)
        || response.data.majors.some(major => typeof major !== 'string' || !major.trim())) throw Error('Invalid teacher options');
      majors = response.data.majors; catalogReady = majors.length > 0; majorOptions();
      say('staffTeacherCatalogNote', catalogReady ? 'เลือกสาขาจาก Catalog เดิม หรือเว้นว่าง'
        : 'ยังไม่มีสาขาใน Catalog จึงยังเปลี่ยนสาขาไม่ได้ สามารถคงค่าเดิมหรือเว้นว่างเมื่อเพิ่มข้อมูล');
    } catch (error) {
      if (!isCurrent() || await accessError(error, isCurrent) || !isCurrent()) return;
      catalogReady = false; say('staffTeacherCatalogNote', error.message || 'โหลดสาขาไม่สำเร็จ คงค่าเดิมไว้และลองโหลดอีกครั้ง', true);
      get('staffTeacherCatalogRetry').hidden = false;
    } finally { if (editorTicket === editorSequence) { catalogBusy = false; controls(); } }
  }
  function startEditor(mode) {
    if (!active || !authorized || !loaded || fetching || reading || saving || modalOpen || editing
      || mode === 'edit' && (!record || record.is_department_head)) return;
    editing = mode; ++editorSequence; needsRead = false; clearValidation();
    const source = mode === 'edit' ? record : {};
    baseline = Object.fromEntries(Object.keys(fields).filter(key => mode === 'create' || key !== 'email')
      .map(key => [key, ['major', 'academic_title'].includes(key) ? source[key] || null : source[key] || '']));
    for (const [key, id] of Object.entries(fields)) if (key !== 'major') get(id).value = source[key] || '';
    majors = []; catalogReady = false; majorOptions(source.major || null);
    get('staffTeacherEmail').readOnly = mode === 'edit';
    get('staffTeacherDepartment').value = profile.department;
    get('staffTeacherAccountStatus').value = mode === 'create' ? 'ใช้งานอยู่ · ต้องเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ'
      : record.status === 'active' ? 'ใช้งานอยู่' : 'ไม่เปิดใช้งาน';
    get('staffTeacherEditorHeading').textContent = mode === 'create' ? 'เพิ่มอาจารย์' : 'แก้ไขข้อมูลอาจารย์';
    get('staffTeacherActivationNote').textContent = mode === 'create'
      ? 'ระบบกำหนดรหัสผ่านเริ่มต้นตามนโยบาย อาจารย์ต้องเปลี่ยนรหัสผ่านก่อนใช้งานตามปกติ ช่องที่มี * จำเป็นต้องกรอก'
      : 'แก้ไขได้ 4 ฟิลด์เท่านั้น อีเมล ภาควิชา สถานะ และสิทธิ์เป็นข้อมูลอ่านอย่างเดียว';
    say('staffTeacherSaveMessage', ''); controls(); get(fields.first_name).focus(); editor.scrollIntoView({ block: 'nearest' }); loadOptions();
  }
  function cancelEditor() {
    if (!editing || saving || modalOpen || reading) return;
    const done = () => { closeEditor(); (record ? get('staffTeacherEdit') : get('staffTeachersAdd')).focus(); };
    if (!dirty()) { done(); return; }
    const token = tokenNow(), ticket = editorSequence;
    modalOpen = true; controls();
    closeConfirmation = confirm({ title: 'ยกเลิกการแก้ไข?', message: 'ข้อมูลที่ยังไม่บันทึกในฟอร์มนี้จะถูกละทิ้ง',
      confirmLabel: 'ละทิ้งร่าง', returnFocus: get('staffTeacherCancel'), fallbackFocus: get('staffTeachersHeading'),
      onConfirm: () => { if (tokenNow() === token && ticket === editorSequence) done(); },
      onClose: () => { closeConfirmation = null; modalOpen = false; controls(); } });
  }
  function validateForm() {
    clearValidation();
    const fail = (key, text) => { fieldErrors[key].textContent = text; get(fields[key]).setAttribute('aria-invalid', 'true'); };
    for (const [key, id] of Object.entries(fields)) {
      const input = get(id);
      if (key === 'email' && editing !== 'create') continue;
      if (input.required && !value(key)) fail(key, 'กรุณากรอกข้อมูลในช่องนี้');
      else if (input.value.length > Number(input.maxLength) && input.maxLength > 0) fail(key, `ข้อมูลต้องไม่เกิน ${input.maxLength} ตัวอักษร`);
    }
    for (const key of ['first_name', 'last_name']) {
      if (!/^[\u0e01-\u0e3a\u0e40-\u0e4e]+(?:[ '-][\u0e01-\u0e3a\u0e40-\u0e4e]+)*$/.test(value(key))) {
        fail(key, 'กรุณากรอกชื่อหรือนามสกุลภาษาไทย ไม่มีตัวเลขหรือคำนำหน้า');
      }
    }
    if (editing === 'create' && (!get(fields.email).validity.valid || !/^[^\s@]+@itm\.kmutnb\.ac\.th$/i.test(value('email')))) fail('email', 'กรุณาใช้อีเมลมหาวิทยาลัย @itm.kmutnb.ac.th');
    for (const key of ['academic_title', 'major']) if (value(key) && /[\u0000-\u001f\u007f]/.test(value(key))) {
      fail(key, 'ข้อมูลมีอักขระที่ไม่รองรับ');
    }
    const first = Object.keys(fields).find(key => fieldErrors[key].textContent);
    if (first) get(fields[first]).focus();
    return !first;
  }
  async function reconcile() {
    if (editing !== 'edit' || !selectedId || saving || modalOpen || reading) return;
    const token = tokenNow(), ticket = sequence, editorTicket = editorSequence, id = selectedId;
    const isCurrent = () => current(ticket, token) && editorTicket === editorSequence;
    reading = true; controls();
    try {
      const response = await detail(id); if (!isCurrent()) return;
      if (response?.success !== true || response.data?.id !== id || !validTeacher(response.data))
        throw Object.assign(Error('Invalid teacher detail'), { status: 403 });
      if (response.data.is_department_head) throw Object.assign(Error('บัญชีนี้เป็นหัวหน้าภาควิชาแล้ว ไม่อนุญาตให้แก้ไข'), { status: 403 });
      record = response.data;
      baseline = Object.fromEntries(Object.keys(baseline).map(key => [key, record[key] ?? null]));
      needsRead = false;
      say('staffTeacherSaveMessage', 'โหลดข้อมูลล่าสุดแล้ว ร่างยังอยู่ กรุณาเปรียบเทียบข้อมูลด้านล่างก่อนบันทึกอีกครั้ง');
      panel.hidden = false; renderInfo(record);
      get('staffTeacherAccountStatus').value = record.status === 'active' ? 'ใช้งานอยู่' : 'ไม่เปิดใช้งาน';
    } catch (error) {
      if (!isCurrent() || await accessError(error, isCurrent) || !isCurrent()) return;
      needsRead = true; say('staffTeacherSaveMessage', `${errorText(error)} ร่างยังอยู่`, true);
    } finally { if (editorTicket === editorSequence) { reading = false; controls(); } }
  }
  async function refreshSaved(id, message) {
    const token = tokenNow(), ticket = sequence + 1;
    const refreshed = await load();
    if (!current(ticket, token)) return;
    const reread = refreshed && await openDetail(id);
    if (!current(ticket, token) || refreshed && selectedId !== id) return;
    const feedback = reread ? message : `${message} แต่ยังโหลดรายชื่อหรือรายละเอียดล่าสุดไม่สำเร็จ กรุณาลองโหลดอีกครั้ง`;
    say('staffTeachersMessage', feedback, !reread); toast(feedback, reread ? 'success' : 'warning');
  }
  editForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!active || !authorized || !editing || saving || modalOpen || reading || catalogBusy || needsRead || !dirty() || !validateForm()) return;
    const token = tokenNow(), ticket = sequence, editorTicket = editorSequence, mode = editing;
    const isCurrent = () => current(ticket, token) && editorTicket === editorSequence;
    if (!isCurrent()) return;
    const body = Object.fromEntries(Object.keys(baseline).filter(key => mode === 'create' || value(key) !== baseline[key]).map(key => [key, value(key)]));
    if (mode === 'create') body.email = body.email.toLowerCase();
    saving = true; controls(); say('staffTeacherSaveMessage', 'กำลังบันทึก...');
    setButtonLoading(get('staffTeacherSave'), true, 'กำลังบันทึก...', 'บันทึกข้อมูล');
    let accepted = false, savedId = selectedId, successMessage = 'บันทึกข้อมูลอาจารย์แล้ว';
    try {
      const response = mode === 'create' ? await create(body) : await update(selectedId, body);
      if (!isCurrent()) return;
      const saved = mode === 'create' ? response.data?.teacher : response.data;
      if (response?.success !== true || !validTeacher(saved) || mode === 'edit' && saved.id !== selectedId) throw Error('Invalid save response');
      if (mode === 'create' && (saved.status !== 'active' || response.data.activation?.login_ready !== false
        || response.data.activation?.state !== 'password_change_required' || response.data.activation?.must_change_password !== true)) throw Error('Invalid activation response');
      accepted = true; savedId = saved.id;
      if (mode === 'create') {
        // Acknowledged creation must never be submitted again if read-back fails.
        editing = 'edit'; selectedId = saved.id; record = saved;
        baseline = Object.fromEntries(Object.keys(fields).filter(key => key !== 'email').map(key => [key, saved[key] ?? null]));
        get('staffTeacherEmail').readOnly = true;
        get('staffTeacherEditorHeading').textContent = 'ข้อมูลอาจารย์ที่เพิ่มแล้ว';
        get('staffTeacherAccountStatus').value = 'ใช้งานอยู่ · ต้องเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ';
        successMessage = response.data.activation.message;
      }
      const fresh = await detail(savedId); if (!isCurrent()) return;
      if (fresh?.success !== true || fresh.data?.id !== savedId || !validTeacher(fresh.data))
        throw Object.assign(Error('Read-back failed'), { status: 403 });
      closeEditor(); saving = false; controls();
      await refreshSaved(savedId, mode === 'create' ? `${[saved.first_name, saved.last_name].join(' ')} · ${saved.email} · สถานะใช้งานอยู่ · ${successMessage}` : successMessage);
    } catch (error) {
      if (!isCurrent() || await accessError(error, isCurrent) || !isCurrent()) return;
      if (Object.hasOwn(fields, error.data?.field)) {
        fieldErrors[error.data.field].textContent = error.message; get(fields[error.data.field]).setAttribute('aria-invalid', 'true'); get(fields[error.data.field]).focus();
      }
      needsRead = accepted || [403, 404, 409].includes(error.status) && mode === 'edit' || !error.status || error.status >= 500;
      const message = accepted ? 'ระบบยืนยันการบันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ ร่างยังอยู่ กรุณาโหลดข้อมูลล่าสุดโดยไม่ส่งซ้ำ'
        : !error.status || error.status >= 500 ? 'ยังยืนยันผลการบันทึกไม่ได้ ร่างยังอยู่ กรุณาตรวจข้อมูลล่าสุดก่อนส่งอีกครั้ง'
          : `${errorText(error)} ร่างยังอยู่`;
      say('staffTeacherSaveMessage', `${message}${needsRead && mode === 'create' && !accepted ? ' · ยกเลิกฟอร์มแล้วค้นด้วยอีเมลเพื่อตรวจว่ามีรายการแล้วหรือไม่' : ''}`, true);
      toast(message, 'error');
    } finally {
      // Closing the editor after success advances its sequence; reset the
      // button only for the same session, never enable a replaced account.
      if (tokenNow() === token) {
        saving = false; setButtonLoading(get('staffTeacherSave'), false, 'กำลังบันทึก...', 'บันทึกข้อมูล'); controls();
        const invalid = editing && Object.keys(fields).find(key => fieldErrors[key].textContent);
        if (invalid) get(fields[invalid]).focus();
      }
    }
  });
  function confirmDeactivation() {
    if (!active || !authorized || !record || record.is_department_head || record.status !== 'active' || editing || saving || modalOpen || reading || fetching) return;
    const token = tokenNow(), ticket = sequence, id = record.id;
    const isCurrent = () => current(ticket, token) && record?.id === id;
    modalOpen = true; controls();
    closeConfirmation = confirm({ title: 'ปิดใช้งานบัญชีอาจารย์?',
      message: `${[record.academic_title, record.first_name, record.last_name].filter(Boolean).join(' ')} · ภาควิชา ${record.department}\nบัญชีจะเข้าสู่ระบบและใช้ API ที่ต้องมีสิทธิ์ไม่ได้ ประวัติสหกิจและความสัมพันธ์เดิมจะไม่ถูกลบ ระบบจะตรวจภาระงานก่อนปิดใช้งาน`,
      confirmLabel: 'ปิดใช้งานบัญชี', loadingLabel: 'กำลังปิดใช้งาน...', returnFocus: get('staffTeacherDeactivate'), fallbackFocus: get('staffTeachersHeading'),
      onConfirm: async () => {
        if (!isCurrent()) return;
        saving = true; controls();
        try {
          const response = await deactivate(id); if (!isCurrent()) return;
          if (response?.success !== true || response.data?.id !== id || response.data.status !== 'inactive' || !validTeacher(response.data)) throw Error('Invalid deactivation response');
          saving = false; modalOpen = false;
          await refreshSaved(id, 'ปิดใช้งานบัญชีแล้ว ประวัติเดิมยังคงอยู่');
        } catch (error) {
          if (!isCurrent() || await accessError(error, isCurrent) || !isCurrent()) return;
          const message = !error.status || error.status >= 500 ? 'ยังยืนยันผลการปิดใช้งานไม่ได้ กรุณาปิดหน้าต่างแล้วโหลดรายละเอียดล่าสุดก่อนลองอีกครั้ง' : errorText(error);
          say('staffTeacherMessage', message, true); toast(message, 'error');
          throw Error(message);
        } finally { if (tokenNow() === token) { saving = false; controls(); } }
      }, onClose: () => { closeConfirmation = null; modalOpen = false; controls(); } });
  }
  function confirmResetPassword() {
    if (!active || !authorized || !record || record.can_reset_password !== true || record.is_department_head || editing || saving || modalOpen || reading || fetching) return;
    const token = tokenNow(), ticket = sequence, id = record.id;
    const isCurrent = () => current(ticket, token) && record?.id === id;
    modalOpen = true; controls();
    closeConfirmation = confirm({ title: 'ยืนยันการรีเซ็ตรหัสผ่าน',
      message: `คุณกำลังรีเซ็ตรหัสผ่านของอาจารย์ ${[record.first_name, record.last_name].join(' ')} · ภาควิชา ${record.department}\nรหัสผ่านจะเปลี่ยนเป็นรหัสเริ่มต้นตามนโยบายระบบ Session เดิมจะถูกเพิกถอน และอาจารย์ต้องเปลี่ยนรหัสผ่านก่อนใช้งานตามปกติอีกครั้ง สถานะเปิดหรือปิดใช้งานบัญชีคงเดิม`,
      confirmLabel: 'ยืนยันรีเซ็ตรหัสผ่าน', cancelLabel: 'ยกเลิก', loadingLabel: 'กำลังรีเซ็ตรหัสผ่าน...',
      returnFocus: get('staffTeacherResetPassword'), fallbackFocus: get('staffTeachersHeading'),
      onConfirm: async () => {
        if (!isCurrent()) return;
        saving = true; controls();
        try {
          const response = await resetPassword(id); if (!isCurrent()) return;
          if (response?.success !== true || response.data?.teacher?.id !== id || !validTeacher(response.data.teacher)
            || response.data.must_change_password !== true || response.data.sessions_revoked !== true) throw Error('Invalid password reset response');
          saving = false; modalOpen = false;
          await refreshSaved(id, response.data.message);
        } catch (error) {
          if (!isCurrent() || await accessError(error, isCurrent) || !isCurrent()) return;
          if (error.status === 403) {
            record.can_reset_password = false; record.password_reset_reason = error.message;
            get('staffTeacherResetReason').textContent = error.message;
          }
          const message = !error.status || error.status >= 500
            ? 'ยังยืนยันผลการรีเซ็ตไม่ได้ กรุณาปิดหน้าต่างแล้วโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง' : error.message || errorText(error);
          say('staffTeacherMessage', message, true); toast(message, 'error'); throw Error(message);
        } finally { if (tokenNow() === token) { saving = false; controls(); } }
      }, onClose: () => { closeConfirmation = null; modalOpen = false; controls(); } });
  }
  function renderInfo(row) {
    get('staffTeacherInfo').replaceChildren();
    for (const [label, value] of [['คำนำหน้าทางวิชาการ', row.academic_title], ['ชื่อ', row.first_name], ['นามสกุล', row.last_name],
      ['ชื่อภาษาอังกฤษ', [row.first_name_en, row.last_name_en].filter(Boolean).join(' ')], ['อีเมล', row.email], ['สาขาวิชา', row.major],
      ['ภาควิชา', row.department], ['ตำแหน่ง', row.position], ['บทบาท', row.is_department_head ? 'หัวหน้าภาควิชา / อาจารย์' : row.has_admin_membership ? 'อาจารย์ / มีสิทธิ์ผู้ดูแลระบบ' : 'อาจารย์'],
      ['สถานะบัญชี', row.status === 'active' ? 'ใช้งานอยู่' : 'ไม่เปิดใช้งาน']]) {
      const item = node('div'); item.append(node('dt', label), node('dd', value || 'ยังไม่ระบุ')); get('staffTeacherInfo').append(item);
    }
    get('staffTeacherResetPassword').title = row.password_reset_reason || '';
    get('staffTeacherResetReason').textContent = row.password_reset_reason || '';
  }
  function search() {
    if (!active || !authorized || editing || saving || modalOpen || !form.reportValidity()) return;
    const filters = { q: get('staffTeachersQuery').value.trim(), major: get('staffTeachersMajor').value.trim(), status: get('staffTeachersStatus').value };
    if (filters.q.length > 100 || filters.major.length > 255 || !['', 'active', 'inactive'].includes(filters.status)) {
      say('staffTeachersMessage', 'กรุณาตรวจสอบคำค้นหา สาขา และสถานะบัญชี', true); return;
    }
    load(0, filters);
  }
  form.addEventListener('submit', event => { event.preventDefault(); search(); });
  editForm.addEventListener('input', event => {
    event.target.setCustomValidity?.(''); event.target.removeAttribute('aria-invalid');
    const key = Object.keys(fields).find(key => fields[key] === event.target.id); if (key) fieldErrors[key].textContent = ''; controls();
  });
  editForm.addEventListener('change', controls);
  get('staffTeachersAdd').addEventListener('click', () => startEditor('create'));
  get('staffTeacherEdit').addEventListener('click', () => startEditor('edit'));
  get('staffTeacherCancel').addEventListener('click', cancelEditor);
  get('staffTeacherReconcile').addEventListener('click', reconcile);
  get('staffTeacherCatalogRetry').addEventListener('click', loadOptions);
  get('staffTeacherDeactivate').addEventListener('click', confirmDeactivation);
  get('staffTeacherResetPassword').addEventListener('click', confirmResetPassword);
  for (const id of ['staffTeachersMajor', 'staffTeachersStatus']) get(id).addEventListener('change', search);
  get('staffTeachersClear').addEventListener('click', () => { if (editing || saving || modalOpen) return; form.reset(); search(); });
  for (const id of ['staffTeachersRefresh', 'staffTeachersRetry']) get(id).addEventListener('click', () => load());
  get('staffTeachersPrevious').addEventListener('click', () => { if (loaded && !fetching && offset) load(Math.max(0, offset - PAGE_SIZE)); });
  get('staffTeachersNext').addEventListener('click', () => { if (loaded && !fetching && hasNext) load(offset + PAGE_SIZE); });
  get('staffTeacherClose').addEventListener('click', () => { if (!editing && !saving && !modalOpen) closeDetail(true); });
  get('staffTeacherRetry').addEventListener('click', () => { if (selectedId) openDetail(selectedId); });
  target.addEventListener('storage', () => { if (boundToken && tokenNow() !== boundToken) reset(); });
  target.addEventListener('pagehide', reset);
  target.addEventListener('pageshow', event => { if (event.persisted && !root.hidden) setActive(true); });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!active || canLeave() || !link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (link.hash === '#staffTeachers' && link.pathname === target.location.pathname) return;
    event.preventDefault(); event.stopImmediatePropagation();
    toast('กรุณาบันทึกหรือยกเลิกร่างก่อนออกจากหน้านี้ และรอให้การบันทึกเสร็จ', 'warning');
  }, true);
  function setActive(value) {
    if (!value) { active = false; ++sequence; fetching = loaded = false; container.replaceChildren(); closeEditor(); closeDetail(); controls(); return; }
    if (boundToken && tokenNow() !== boundToken) reset();
    if (active) return;
    active = true; return load();
  }
  controls();
  return { setActive, canLeave };
}
