import { getCurrentDepartmentHead, getHeadTeachers, updateHeadTeacher } from '../api/departmentHead.api.js';
import { TEACHER_TOKEN_KEY } from '../api/teacherProjectAdvisor.api.js';
import { showToast, showConfirmModal, setButtonLoading } from '../ui/feedback.js';
import { teacherStatusBadge } from './teacherStatus.js';

const PAGE_SIZE = 25;
const editable = [
  ['first_name', 'headTeacherFirstName', 'headTeacherFirstNameError', 'ชื่อ'],
  ['last_name', 'headTeacherLastName', 'headTeacherLastNameError', 'นามสกุล'],
  ['major', 'headTeacherMajorValue', 'headTeacherMajorError', 'สาขาวิชา'],
];

export function mountDepartmentHeadTeachers({ document, storage, location,
  me = getCurrentDepartmentHead, list = getHeadTeachers, update = updateHeadTeacher,
  toast = showToast, confirm = showConfirmModal, onSessionInvalid = () => {}, onProfile = () => {} }) {
  const get = id => document.getElementById(id), root = get('headTeachers');
  if (!root) return;
  const target = document.defaultView, container = get('headTeachersList'), detail = get('headTeacherDetail');
  const form = get('headTeacherForm'), filterForm = get('headTeachersFilters');
  const tokenNow = () => storage.getItem(TEACHER_TOKEN_KEY);
  let active = false, authorized = false, profile = null, boundToken = null, sequence = 0, saveSequence = 0;
  let listLoading = false, saving = false, modalOpen = false, closeConfirmation;
  let rows = [], offset = 0, hasNext = false, loaded = false, applied = {};
  let record = null, baseline = null, editing = false, recordAvailable = false, needsRead = false, opener = null;
  const normalized = (key, value) => key === 'major' ? String(value ?? '').trim() || null : String(value ?? '').trim();
  const changes = () => !editing || !baseline ? {} : Object.fromEntries(editable.flatMap(([key, id]) => {
    const value = normalized(key, get(id).value);
    return value === normalized(key, baseline[key]) ? [] : [[key, value]];
  }));
  const dirty = () => Object.keys(changes()).length > 0;
  function node(tag, text, className) {
    const element = document.createElement(tag); if (text != null) element.textContent = text;
    if (className) element.className = className; return element;
  }
  function say(id, text, type = 'info') {
    const message = get(id); message.textContent = text; message.dataset.type = type;
    message.setAttribute('role', type === 'error' ? 'alert' : 'status');
  }
  function controls() {
    const blocked = !authorized || !tokenNow() || saving || modalOpen;
    for (const id of ['headTeachersQuery', 'headTeachersMajor', 'headTeachersStatus', 'headTeachersSearch', 'headTeachersClear'])
      get(id).disabled = blocked || editing;
    // Search remains available during a list read; a later search supersedes it.
    get('headTeachersRefresh').disabled = saving || modalOpen || editing || listLoading || !tokenNow();
    get('headTeachersRetry').disabled = saving || modalOpen || listLoading || !tokenNow();
    get('headTeachersPrevious').disabled = blocked || editing || listLoading || !loaded || offset === 0;
    get('headTeachersNext').disabled = blocked || editing || listLoading || !loaded || !hasNext;
    for (const button of container.querySelectorAll('button')) button.disabled = blocked || editing || listLoading;
    get('headTeacherEdit').hidden = editing || !recordAvailable;
    get('headTeacherEdit').disabled = blocked || listLoading || needsRead;
    form.hidden = !editing;
    get('headTeacherFields').disabled = blocked || listLoading || !recordAvailable || needsRead;
    get('headTeacherSave').disabled = blocked || listLoading || !recordAvailable || needsRead || !dirty();
    get('headTeacherCancel').disabled = saving || modalOpen || listLoading;
    get('headTeacherClose').disabled = saving || modalOpen || listLoading;
    get('headTeacherReload').hidden = detail.hidden || !needsRead;
    get('headTeacherReload').disabled = saving || modalOpen || listLoading || !tokenNow();
    get('headTeacherDraft').textContent = editing ? dirty() ? 'มีการเปลี่ยนแปลงที่ยังไม่บันทึก' : 'ยังไม่มีการเปลี่ยนแปลง' : '';
    container.setAttribute('aria-busy', String(listLoading));
    detail.setAttribute('aria-busy', String(saving || listLoading && !detail.hidden));
  }
  function focusList() {
    const button = [...container.querySelectorAll('[data-teacher-detail]')].find(item => item.dataset.teacherDetail === opener);
    (button || get('headTeachersHeading')).focus({ preventScroll: true });
  }
  function clearErrors() {
    for (const [, id, errorId] of editable) {
      get(id).setCustomValidity(''); get(id).removeAttribute('aria-invalid'); get(errorId).textContent = '';
    }
  }
  function closeDetail(restoreFocus = true) {
    record = baseline = null; editing = recordAvailable = needsRead = false;
    detail.hidden = true; get('headTeacherInfo').replaceChildren(); form.reset(); clearErrors();
    say('headTeacherMessage', ''); controls(); if (restoreFocus) focusList();
  }
  function clearView() {
    ++sequence; ++saveSequence; active = authorized = listLoading = saving = loaded = hasNext = false;
    closeConfirmation?.(); closeConfirmation = null; modalOpen = false;
    rows = []; profile = boundToken = null; offset = 0; applied = {}; filterForm.reset();
    setButtonLoading(get('headTeacherSave'), false, 'กำลังบันทึก...', 'บันทึกการเปลี่ยนแปลง');
    container.replaceChildren(); closeDetail(false);
    get('headTeachersScope').textContent = 'ยังไม่ได้ยืนยันสิทธิ์ภาควิชา';
    get('headTeachersPage').textContent = ''; get('headTeachersRetry').hidden = true;
    say('headTeachersMessage', 'สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่', 'error'); controls();
  }
  function current(ticket, token) {
    if (boundToken && tokenNow() !== boundToken) { clearView(); return false; }
    return active && sequence === ticket && !!token && tokenNow() === token;
  }
  function isHeadResponse(result) {
    return result?.success === true && typeof result.data?.id === 'string'
      && result.data.status === 'active' && result.data.is_department_head === true
      && typeof result.data.department === 'string' && !!result.data.department.trim();
  }
  function scopedTeacher(row) {
    // Additional response checks only; live backend RBAC remains authoritative.
    return row && typeof row.id === 'string' && /^[0-9a-f-]{36}$/i.test(row.id)
      && row.department === profile?.department && ['active', 'inactive'].includes(row.status)
      && typeof row.is_department_head === 'boolean'
      && ['first_name', 'last_name'].every(key => typeof row[key] === 'string')
      && ['email', 'major'].every(key => row[key] === null || typeof row[key] === 'string');
  }
  async function accessError(error, ticket, token, profileRequest = false) {
    if (![401, 403].includes(error.status) || !current(ticket, token)) return false;
    let revoked = error.status === 401 || profileRequest;
    if (!revoked) {
      // A teacher can leave this department without invalidating the Head session.
      try {
        const result = await me(); if (!current(ticket, token)) return true;
        if (isHeadResponse(result)) profile = result.data;
        else if (result?.success === true && result.data?.id) revoked = true;
      } catch (sessionError) {
        if (!current(ticket, token)) return true;
        revoked = [401, 403].includes(sessionError.status);
      }
    }
    if (!current(ticket, token)) return true;
    if (revoked) {
      clearView(); storage.removeItem(TEACHER_TOKEN_KEY);
      // The captured session was still current immediately before removal.
      onSessionInvalid(error);
      get('headTeachersSignIn').hidden = false;
      say('headTeachersMessage', error.status === 401 ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'
        : 'บัญชีนี้ไม่มีสิทธิ์หัวหน้าภาควิชาแล้ว กรุณาเข้าสู่ระบบใหม่', 'error');
      controls(); return true;
    }
    rows = []; loaded = hasNext = recordAvailable = false; needsRead = true;
    container.replaceChildren(); get('headTeacherInfo').replaceChildren(); controls();
    return false;
  }
  function errorText(error) {
    if (error.status === 400) return 'ข้อมูลหรือตัวกรองไม่ถูกต้อง กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง';
    if (error.status === 403) return 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้ กรุณาโหลดรายชื่อในภาควิชาล่าสุด';
    if (error.status === 404) return 'ไม่พบอาจารย์นี้แล้ว กรุณาโหลดข้อมูลล่าสุด ร่างที่แก้ยังอยู่';
    if (error.status === 409) return 'ข้อมูลขัดแย้งกับรายการปัจจุบัน กรุณาโหลดข้อมูลล่าสุดและตรวจร่างก่อนบันทึกอีกครั้ง';
    return 'โหลดหรือบันทึกข้อมูลไม่สำเร็จ การเชื่อมต่อหรือบริการอาจขัดข้อง กรุณาลองอีกครั้ง';
  }
  function renderInfo() {
    const info = get('headTeacherInfo'); info.replaceChildren();
    if (!recordAvailable) return;
    for (const [label, value] of [
      ['ชื่อ', record.first_name], ['นามสกุล', record.last_name], ['อีเมล', record.email],
      ['สาขาวิชา', record.major], ['ภาควิชา', record.department],
      ['บทบาท', record.is_department_head ? 'หัวหน้าภาควิชา / อาจารย์' : 'อาจารย์'],
      ['สถานะบัญชี', record.status === 'active' ? 'ใช้งานอยู่' : 'ไม่เปิดใช้งาน'],
    ]) {
      const item = node('div'); item.append(node('dt', label), node('dd', value || 'ยังไม่ระบุ')); info.append(item);
    }
  }
  function beginEdit() {
    if (!recordAvailable || needsRead || saving || listLoading || modalOpen) return;
    baseline = { ...record }; editing = true; clearErrors();
    for (const [key, id] of editable) get(id).value = record[key] ?? '';
    say('headTeacherMessage', 'แก้ไขได้เฉพาะชื่อ นามสกุล และสาขาวิชา'); controls();
    get('headTeacherFirstName').focus();
  }
  function openDetail(row, edit = false) {
    if (editing || saving || listLoading || modalOpen || !authorized || !scopedTeacher(row)) return;
    record = { ...row }; recordAvailable = true; needsRead = false; opener = row.id;
    detail.hidden = false; renderInfo(); say('headTeacherMessage', ''); controls();
    if (edit) beginEdit(); else get('headTeacherDetailHeading').focus({ preventScroll: true });
    detail.scrollIntoView({ block: 'nearest' });
  }
  function renderList() {
    container.replaceChildren();
    if (!rows.length) {
      container.append(node('p', offset ? 'ไม่มีรายการในหน้านี้ ลองกลับหน้าก่อนหน้าหรือล้างตัวกรอง'
        : 'ไม่พบอาจารย์ตามเงื่อนไข ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง', 'head-empty')); return;
    }
    for (const row of rows) {
      const card = node('article', null, 'head-teacher-card'), name = [row.academic_title, row.first_name, row.last_name].filter(Boolean).join(' ');
      card.append(node('h2', name), teacherStatusBadge(document, row.status === 'active' ? 'ใช้งานอยู่' : 'ไม่เปิดใช้งาน', row.status === 'active' ? 'verified' : 'inactive'));
      const info = node('dl');
      for (const [label, value] of [['อีเมล', row.email], ['สาขาวิชา', row.major]]) info.append(node('dt', label), node('dd', value || 'ยังไม่ระบุ'));
      const actions = node('div', null, 'head-teachers-actions');
      const view = node('button', 'ดูรายละเอียด', 'teacher-button'), edit = node('button', 'แก้ไขข้อมูล', 'teacher-button teacher-button--primary');
      view.type = edit.type = 'button'; view.dataset.teacherDetail = row.id;
      view.setAttribute('aria-label', `ดูรายละเอียด ${name}`); edit.setAttribute('aria-label', `แก้ไขข้อมูล ${name}`);
      view.addEventListener('click', () => openDetail(row)); edit.addEventListener('click', () => openDetail(row, true));
      actions.append(view, edit); card.append(info, actions); container.append(card);
    }
  }
  async function loadPage(nextOffset = offset, filters = applied, preserveDetail = false) {
    if (!active || saving || modalOpen) return false;
    const token = tokenNow(); if (!token) { clearView(); get('headTeachersSignIn').hidden = false; return false; }
    const ticket = ++sequence; boundToken = token; offset = nextOffset; applied = { ...filters };
    if (!preserveDetail) closeDetail(false);
    listLoading = true; loaded = hasNext = false; rows = []; container.replaceChildren(node('p', 'กำลังโหลดรายชื่ออาจารย์...', 'head-empty'));
    if (record) { recordAvailable = false; get('headTeacherInfo').replaceChildren(); }
    get('headTeachersRetry').hidden = true; get('headTeachersSignIn').hidden = true;
    get('headTeachersPage').textContent = `กำลังโหลดหน้า ${offset / PAGE_SIZE + 1}`;
    say('headTeachersMessage', 'กำลังโหลดข้อมูลล่าสุด...'); controls();
    let profileRequest = true;
    try {
      const account = await me(); if (!current(ticket, token)) return false;
      if (!isHeadResponse(account)) {
        if (account?.success === true && account.data?.id
          && (account.data.is_department_head === false || account.data.status === 'inactive'))
          throw Object.assign(Error('Head authorization required'), { status: 403 });
        throw Error('Invalid Head profile');
      }
      profile = account.data; authorized = true; profileRequest = false;
      onProfile(profile);
      get('headTeachersScope').textContent = `ภาควิชา: ${profile.department}`;
      const result = await list({ ...applied, offset, limit: PAGE_SIZE + 1 });
      if (!current(ticket, token)) return false;
      if (result?.success !== true || !Array.isArray(result.data) || result.data.length > PAGE_SIZE + 1
        || result.data.some(row => !scopedTeacher(row))) throw Error('Invalid teacher response');
      rows = result.data.slice(0, PAGE_SIZE); hasNext = result.data.length > PAGE_SIZE; loaded = true;
      renderList();
      const range = rows.length ? `รายการ ${offset + 1}–${offset + rows.length}` : '0 รายการในหน้านี้';
      get('headTeachersPage').textContent = `หน้า ${offset / PAGE_SIZE + 1} · ${range}`;
      say('headTeachersMessage', rows.length ? `แสดง ${rows.length} รายการในหน้านี้${hasNext ? ' · มีหน้าถัดไป' : ''}` : 'ไม่พบผลลัพธ์ตามเงื่อนไข');
      if (record) {
        const fresh = rows.find(row => row.id === record.id);
        if (fresh) {
          record = { ...fresh }; recordAvailable = true; needsRead = false; renderInfo();
          // Keep the original edit baseline: untouched fields must not be sent
          // back over another user's newer values when refreshing a draft.
          if (editing) say('headTeacherMessage', 'โหลดค่าที่บันทึกล่าสุดด้านบนแล้ว ร่างในฟอร์มยังอยู่ โปรดตรวจค่าก่อนบันทึกอีกครั้ง');
        } else if (editing) {
          needsRead = true; say('headTeacherMessage', 'ไม่พบอาจารย์ในผลลัพธ์หน้านี้แล้ว ร่างยังอยู่ แต่ยังบันทึกไม่ได้ กรุณายกเลิกร่างแล้วค้นหารายการล่าสุด', 'error');
        } else closeDetail(false);
      }
      return true;
    } catch (error) {
      if (!current(ticket, token)) return false;
      if (await accessError(error, ticket, token, profileRequest)) return false;
      if (!current(ticket, token)) return false;
      container.replaceChildren(node('p', 'ยังแสดงรายชื่ออาจารย์ไม่ได้ กรุณาลองโหลดอีกครั้ง', 'head-empty'));
      get('headTeachersPage').textContent = `หน้า ${offset / PAGE_SIZE + 1} · โหลดไม่สำเร็จ`;
      get('headTeachersRetry').hidden = false; say('headTeachersMessage', errorText(error), 'error');
      if (record) { needsRead = true; say('headTeacherMessage', 'โหลดข้อมูลล่าสุดไม่ได้ ร่างเดิมยังอยู่ กรุณาลองโหลดอีกครั้งก่อนบันทึก', 'error'); }
      return false;
    } finally { if (ticket === sequence) { listLoading = false; controls(); } }
  }
  function applyFilters() {
    if (editing || saving || modalOpen || !filterForm.reportValidity()) return;
    const filters = { q: get('headTeachersQuery').value.trim(), major: get('headTeachersMajor').value.trim(), status: get('headTeachersStatus').value };
    if (filters.q.length > 100 || filters.major.length > 255 || !['', 'active', 'inactive'].includes(filters.status)) {
      say('headTeachersMessage', 'กรุณาตรวจสอบคำค้นหา สาขาวิชา และสถานะบัญชี', 'error'); return;
    }
    loadPage(0, filters);
  }
  function discard(action) {
    if (saving || modalOpen || listLoading) return;
    if (!dirty()) { action(); return; }
    modalOpen = true; controls();
    closeConfirmation = confirm({ title: 'ยกเลิกการแก้ไขข้อมูลอาจารย์?',
      message: 'การเปลี่ยนแปลงที่ยังไม่ได้บันทึกในฟอร์มนี้จะถูกยกเลิก', confirmLabel: 'ยกเลิกการแก้ไข', cancelLabel: 'แก้ไขต่อ',
      returnFocus: get('headTeacherCancel'), fallbackFocus: get('headTeachersHeading'),
      onConfirm: action, onClose: () => { modalOpen = false; closeConfirmation = null; controls(); } });
  }
  get('headTeacherClose').addEventListener('click', () => discard(() => closeDetail()));
  get('headTeacherCancel').addEventListener('click', () => discard(() => {
    editing = false; baseline = null; form.reset(); clearErrors(); say('headTeacherMessage', 'ยกเลิกการแก้ไขแล้ว'); controls();
    (recordAvailable ? get('headTeacherEdit') : get('headTeacherClose')).focus();
  }));
  get('headTeacherEdit').addEventListener('click', beginEdit);
  for (const [, id, errorId] of editable) {
    get(id).addEventListener('input', () => { get(id).setCustomValidity(''); get(id).removeAttribute('aria-invalid'); get(errorId).textContent = ''; controls(); });
    get(id).addEventListener('invalid', () => { get(id).setAttribute('aria-invalid', 'true'); get(errorId).textContent = get(id).validationMessage; });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!editing || !recordAvailable || needsRead || !authorized || saving || listLoading || modalOpen) return;
    for (const [key, id, errorId, label] of editable) {
      const value = normalized(key, get(id).value);
      const text = key !== 'major' && !value ? `กรุณากรอก${label}` : value?.length > 255 ? `${label}ต้องไม่เกิน 255 ตัวอักษร` : '';
      get(id).setCustomValidity(text); get(errorId).textContent = text;
      if (text) get(id).setAttribute('aria-invalid', 'true'); else get(id).removeAttribute('aria-invalid');
    }
    if (!form.reportValidity()) return;
    const body = changes(); if (!Object.keys(body).length) return;
    const token = tokenNow(), ticket = ++sequence, mutation = ++saveSequence, id = record.id;
    if (!current(ticket, token)) return;
    saving = true; setButtonLoading(get('headTeacherSave'), true, 'กำลังบันทึก...', 'บันทึกการเปลี่ยนแปลง'); controls();
    say('headTeacherMessage', 'กำลังบันทึกการเปลี่ยนแปลง...');
    try {
      const result = await update(id, body); if (!current(ticket, token)) return;
      if (result?.success !== true || result.data?.id !== id || !scopedTeacher(result.data)) throw Error('Invalid save response');
      record = { ...result.data }; editing = false; baseline = null; form.reset(); saving = false;
      const refresh = loadPage(offset, applied, true), refreshTicket = sequence;
      const refreshed = await refresh;
      if (!current(refreshTicket, token)) return;
      if (refreshed) {
        say('headTeachersMessage', 'บันทึกข้อมูลอาจารย์แล้ว และโหลดรายชื่อปัจจุบันเรียบร้อย หากรายการไม่อยู่ในหน้าเดิมให้ค้นหาจากชื่อหรือสาขาล่าสุด', 'success');
        toast('บันทึกข้อมูลอาจารย์สำเร็จ', 'success');
        (detail.hidden ? get('headTeachersHeading') : get('headTeacherDetailHeading')).focus({ preventScroll: true });
      } else {
        say('headTeachersMessage', 'บันทึกข้อมูลแล้ว แต่โหลดรายชื่อล่าสุดไม่สำเร็จ กรุณาลองโหลดอีกครั้ง', 'error');
        toast('บันทึกแล้ว แต่ยังโหลดข้อมูลล่าสุดไม่ได้', 'warning');
      }
    } catch (error) {
      if (!current(ticket, token)) return;
      if (await accessError(error, ticket, token)) return;
      if (!current(ticket, token)) return;
      if ([403, 404, 409].includes(error.status) || !error.status || error.status >= 500) needsRead = true;
      if ([403, 404].includes(error.status)) { recordAvailable = false; get('headTeacherInfo').replaceChildren(); }
      const message = !error.status || error.status >= 500
        ? 'ยังยืนยันผลการบันทึกไม่ได้ ร่างยังอยู่ กรุณาโหลดข้อมูลล่าสุดและตรวจค่าก่อนบันทึกอีกครั้ง'
        : `${errorText(error)} ร่างในฟอร์มยังอยู่`;
      say('headTeacherMessage', message, 'error'); toast(message, 'error');
    } finally {
      if (mutation === saveSequence) {
        saving = false; setButtonLoading(get('headTeacherSave'), false, 'กำลังบันทึก...', 'บันทึกการเปลี่ยนแปลง'); controls();
      }
    }
  });
  filterForm.addEventListener('submit', event => { event.preventDefault(); applyFilters(); });
  for (const id of ['headTeachersMajor', 'headTeachersStatus']) get(id).addEventListener('change', applyFilters);
  get('headTeachersClear').addEventListener('click', () => { if (editing || saving || modalOpen) return; filterForm.reset(); applyFilters(); });
  get('headTeachersRefresh').addEventListener('click', () => loadPage(offset, applied, true));
  get('headTeachersRetry').addEventListener('click', () => loadPage(offset, applied, true));
  get('headTeacherReload').addEventListener('click', () => loadPage(offset, applied, true));
  get('headTeachersPrevious').addEventListener('click', () => { if (loaded && !listLoading && !editing && offset) loadPage(Math.max(0, offset - PAGE_SIZE)); });
  get('headTeachersNext').addEventListener('click', () => { if (loaded && !listLoading && !editing && hasNext) loadPage(offset + PAGE_SIZE); });
  target.addEventListener('storage', () => { if (boundToken && boundToken !== tokenNow()) clearView(); });
  target.addEventListener('pagehide', clearView);
  target.addEventListener('pageshow', event => { if (event.persisted && location.hash === '#headTeachers') show(); });
  function show() {
    if (boundToken && boundToken !== tokenNow()) clearView();
    active = true; return loadPage(offset, applied, true);
  }
  function hide() { active = false; ++sequence; listLoading = false; if (!dirty()) closeDetail(false); controls(); }
  controls();
  return { show, hide, canLeave: () => !saving && !modalOpen && !dirty() };
}
