import { adminRequest } from '../api/superAdmin.api.js';
import { revealNavigationItem } from '../ui/navigationScroll.js';
import { getRoleToken, getApplicationAdminToken, clearApplicationAdminSession } from '../auth/roleAuthStorage.js';
import { showToast, showConfirmModal } from '../ui/feedback.js';

const roles = { student: 'นักศึกษา', teacher: 'อาจารย์', department_head: 'หัวหน้าภาควิชา', department_staff: 'เจ้าหน้าที่ภาควิชา', super_admin: 'Super Admin' };
const titles = { overview: 'ภาพรวมระบบ', accounts: 'จัดการบัญชีผู้ใช้งาน', permissions: 'บทบาทและสิทธิ์', data: 'จัดการข้อมูลระบบ', settings: 'ตั้งค่าระบบ', audit: 'ประวัติการดำเนินการ', self: 'บัญชีของฉัน' };
const labels = { first_name: 'ชื่อ', last_name: 'นามสกุล', first_name_en: 'ชื่อภาษาอังกฤษ', last_name_en: 'นามสกุลภาษาอังกฤษ', email: 'อีเมล', academic_title: 'คำนำหน้าทางวิชาการ', position: 'ตำแหน่ง', department: 'ภาควิชา', major: 'สาขา', student_id: 'รหัสนักศึกษา' };
export function mountSuperAdmin({ document, target = window, request = adminRequest, getToken = getApplicationAdminToken, clear = clearApplicationAdminSession, toast = showToast, confirm = showConfirmModal } = {}) {
  const get = id => document.getElementById(id), editor = get('adminEditor');
  if (!editor) return;
  let token = getToken(), me = null, catalogue = null, selected = null, active = 'overview', page = 1, auditPage = 1, serial = 0, detailSerial = 0, writing = false, editAction = null, closeConfirmation;
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
  const has = permission => me?.data.permissions?.includes(permission);
  function status(text, error = false) { get('adminStatus').textContent = text; get('adminStatus').setAttribute('role', error ? 'alert' : 'status'); }
  function wipe() {
    ++serial; ++detailSerial; me = catalogue = selected = null; editAction = null; writing = false;
    get('adminEditorForm').reset(); get('adminEditorFields').replaceChildren(); editor.close(); closeConfirmation?.();
    for (const id of ['adminStats', 'adminUsers', 'adminDetailBody', 'adminSelf', 'adminAudit', 'adminPermissionList', 'adminSettings']) get(id).replaceChildren();
    get('adminAccountDetail').hidden = true; get('adminName').textContent = 'กรุณาเข้าสู่ระบบใหม่';
    get('adminTeacherDashboard').hidden = true;
  }
  function signedOut() { wipe(); clear(); target.location.replace('/login.html'); }
  function failure(error) {
    if (error.status === 401 || error.data?.code === 'ACCOUNT_UNAUTHORIZED') { signedOut(); return; }
    status(error.message || 'โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง', true);
  }
  function fields(data) {
    const dl = el('dl');
    for (const [key, label] of Object.entries(labels)) if (Object.hasOwn(data, key)) { const pair = el('div'); pair.append(el('dt', label), el('dd', data[key] || 'ยังไม่ระบุ')); dl.append(pair); }
    const role = el('div'), state = el('div'); role.append(el('dt', 'บทบาท'), el('dd', (roles[data.role] || roles[data.actor_type]) + (data.admin_enabled ? ' · Super Admin' : ''))); state.append(el('dt', 'สถานะ'), el('dd', data.active ? 'ใช้งานอยู่' : 'ปิดใช้งาน')); dl.append(role, state); return dl;
  }
  function paging(previous, next, text, result) { get(previous).disabled = result.page <= 1; get(next).disabled = result.page * result.limit >= result.total; get(text).textContent = `หน้า ${result.page} · ${result.total} บัญชี/รายการ`; }
  async function openAccount(type, id) {
    const ticket = ++detailSerial; selected = null; get('adminAccountDetail').hidden = true;
    try { const result = await request(`/accounts/${type}/${id}`); if (ticket !== detailSerial || active !== 'accounts') return; selected = result; get('adminDetailBody').replaceChildren(fields(result.data)); get('adminAccountDetail').hidden = false;
      get('adminEditAccount').hidden = !has('accounts.write') || type === 'student'; get('adminToggleAccount').hidden = !has('accounts.status'); get('adminToggleAccount').textContent = result.data.active ? 'ปิดใช้งานบัญชี' : 'เปิดใช้งานบัญชี';
      get('adminEditPermissions').hidden = !(type === 'super_admin' || result.data.admin_grant_id) || !has('permissions.write');
      get('adminToggleMembership').hidden = !result.data.admin_grant_id || !has('accounts.status'); get('adminToggleMembership').textContent = result.data.admin_enabled ? 'ระงับสิทธิ์ผู้ดูแล' : 'เปิดสิทธิ์ผู้ดูแล';
      get('adminAccountNotice').textContent = type === 'student' ? 'Student Profile คงใช้ owner workflow / Draft / Revision / If-Match เดิม' : 'ใช้บัญชีเดิม แยกสิทธิ์ผู้ดูแลออกจากบทบาท Teacher ไม่เปลี่ยน Department / Advisor'; get('adminAccountDetail').focus();
    } catch (error) { if (ticket === detailSerial) failure(error); }
  }
  async function load() {
    const ticket = ++serial, current = active; ++detailSerial; selected = null; get('adminAccountDetail').hidden = true; get('adminReload').disabled = true; get('adminMain').setAttribute('aria-busy', 'true'); status('กำลังโหลดข้อมูล...');
    const live = () => ticket === serial && getToken() === token;
    try {
      if (!token || !me) throw Object.assign(Error('กรุณาเข้าสู่ระบบใหม่'), { status: 401 });
      const required = { overview: 'overview.read', accounts: 'accounts.read', settings: 'settings.write', audit: 'audit.read' }[current];
      if (required && !has(required)) throw Object.assign(Error('บัญชีนี้ไม่มีสิทธิ์ใช้ส่วนนี้'), { status: 403 });
      if (current === 'overview') {
        get('adminStats').replaceChildren(); for (let index = 0; index < 8; index++) { const card = el('div', 'กำลังโหลด...', 'admin-card admin-skeleton'); card.setAttribute('aria-hidden', 'true'); get('adminStats').append(card); } get('adminStats').setAttribute('aria-busy', 'true');
        const result = await request('/overview'); if (!live()) return;
        get('adminStats').replaceChildren(); for (const [key, label] of Object.entries({ students: 'นักศึกษา', teachers: 'อาจารย์ (รวม Head)', department_heads: 'หัวหน้าภาควิชา', department_staff: 'เจ้าหน้าที่ภาควิชา', super_admins: 'สิทธิ์ Super Admin', active: 'บัญชีใช้งานอยู่', inactive: 'บัญชีปิดใช้งาน', total: 'บัญชีผู้ใช้ไม่ซ้ำ' })) { const card = el('article', undefined, 'admin-card admin-stat'); card.append(el('span', label), el('strong', String(result[key]))); get('adminStats').append(card); } get('adminStats').setAttribute('aria-busy', 'false');
      } else if (current === 'accounts') {
        const query = new URLSearchParams({ search: get('adminQuery').value, role: get('adminRole').value, active: get('adminActive').value, page: String(page) });
        const result = await request('/accounts?' + query); if (!live()) return; const tbody = get('adminUsers'); tbody.replaceChildren();
        for (const row of result.rows) { const tr = el('tr'), name = el('td'), action = el('td'), button = el('button', 'ดูบัญชี', 'admin-button secondary'); name.append(el('strong', [row.first_name, row.last_name].filter(Boolean).join(' ') || 'ยังไม่ระบุชื่อ'), el('small', row.email || 'ยังไม่มีอีเมล')); button.type = 'button'; button.setAttribute('aria-label', 'ดูบัญชี ' + [row.first_name, row.last_name].filter(Boolean).join(' ')); button.addEventListener('click', () => openAccount(row.actor_type, row.id)); action.append(button); tr.append(name, el('td', roles[row.role] + (row.admin_enabled ? ' · Super Admin' : '')), el('td', row.active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'), action); tbody.append(tr); }
        if (!result.rows.length) { const cell = el('td', 'ไม่พบบัญชีตามเงื่อนไข'); cell.colSpan = 4; const row = el('tr'); row.append(cell); tbody.append(row); } paging('adminPrevious', 'adminNext', 'adminPage', result);
      } else if (current === 'permissions') {
        get('adminPermissionList').replaceChildren(); for (const [key, label] of Object.entries(catalogue.permissions)) { const row = el('p', `${has(key) ? '✓' : '—'} ${label} (${key})`); get('adminPermissionList').append(row); } get('adminRoleNotice').textContent = catalogue.pending;
      } else if (current === 'settings') {
        const result = await request('/settings'); if (!live()) return; get('adminSettings').replaceChildren();
        for (const setting of result) { const form = el('form'), label = el('label', setting.label), input = el('input'), note = el('p', `ค่าเริ่มต้น ${setting.default} · ${setting.min}–${setting.max} · มีผลทันทีในการโหลดรายการครั้งถัดไป`, 'admin-muted'), button = el('button', 'เปลี่ยนการตั้งค่า', 'admin-button'); input.type = 'number'; input.min = setting.min; input.max = setting.max; input.step = '1'; input.required = true; input.value = setting.value; button.type = 'submit'; label.append(input); form.append(label, note, button); form.addEventListener('submit', event => { event.preventDefault(); const value = Number(input.value); if (!Number.isInteger(value) || value < setting.min || value > setting.max) { toast('ค่าการตั้งค่าไม่อยู่ในช่วงที่อนุญาต', 'error'); return; } beginEdit('เปลี่ยนการตั้งค่า', `${setting.label}: ${setting.value} → ${value}`, [], password => request('/settings/' + encodeURIComponent(setting.key), { method: 'PUT', version: '"' + setting.version + '"', body: { password, confirmed: true, value } })); }); get('adminSettings').append(form); }
      } else if (current === 'audit') {
        const result = await request('/audit?' + new URLSearchParams({ page: String(auditPage) })); if (!live()) return; get('adminAudit').replaceChildren();
        for (const row of result.rows) { const tr = el('tr'); tr.append(el('td', new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(row.createdAt))), el('td', row.action), el('td', `${row.actor_id}\n${row.target_type}: ${row.target_id}`), el('td', JSON.stringify(row.changes))); get('adminAudit').append(tr); }
        if (!result.rows.length) { const row = el('tr'), cell = el('td', 'ยังไม่มีประวัติการดำเนินการ'); cell.colSpan = 4; row.append(cell); get('adminAudit').append(row); } paging('adminAuditPrevious', 'adminAuditNext', 'adminAuditPage', result);
      } else if (current === 'self') { const result = await request('/me'); if (!live()) return; me = result; get('adminSelf').replaceChildren(fields(result.data)); }
      if (live()) status('โหลดข้อมูลล่าสุดแล้ว');
    } catch (error) { if (live()) { for (const id of { overview: ['adminStats'], accounts: ['adminUsers'], audit: ['adminAudit'], settings: ['adminSettings'], self: ['adminSelf'] }[current] || []) get(id).replaceChildren(); failure(error); } }
    finally { if (ticket === serial) { get('adminReload').disabled = false; get('adminMain').setAttribute('aria-busy', 'false'); } }
  }
  function navigate() {
    if (writing) return;
    active = Object.hasOwn(titles, target.location.hash.slice(1)) ? target.location.hash.slice(1) : 'overview';
    for (const panel of document.querySelectorAll('[data-admin-panel]')) panel.hidden = panel.dataset.adminPanel !== active;
    for (const link of get('adminNav').querySelectorAll('a')) { if (link.dataset.panel === active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
    revealNavigationItem(get('adminNav'), get('adminNav').querySelector('[aria-current="page"]'));
    get('adminTitle').textContent = titles[active]; if (me) return load();
  }
  function beginEdit(title, description, specs, action) {
    if (writing) return; editAction = action; get('adminEditorForm').reset(); get('adminEditorFields').replaceChildren(); get('adminEditorError').textContent = ''; get('adminEditorTitle').textContent = title; get('adminEditorDescription').textContent = description;
    for (const spec of specs) { const label = el('label', spec.label), input = el('input'); input.name = spec.key; input.type = spec.type || 'text'; input.required = !!spec.required; if (input.type === 'checkbox') input.checked = !!spec.value; else { input.value = spec.value || ''; input.maxLength = spec.max || 255; } if (input.type === 'password') { input.autocomplete = 'new-password'; input.minLength = 14; } label.append(input); get('adminEditorFields').append(label); }
    editor.showModal();
  }
  function formValues() { return Object.fromEntries([...get('adminEditorFields').querySelectorAll('input')].map(input => [input.name, input.type === 'checkbox' ? input.checked : input.type === 'password' ? input.value : input.value.trim() || null])); }
  get('adminEditorForm').addEventListener('submit', event => {
    event.preventDefault(); if (writing || !editAction) return;
    let password = get('adminConfirmPassword').value; const values = formValues(), action = editAction, description = get('adminEditorDescription').textContent;
    if (values.new_password !== undefined && values.new_password !== values.confirm_password) { get('adminEditorError').textContent = 'ยืนยันรหัสผ่านใหม่ไม่ตรงกัน'; return; }
    get('adminConfirmPassword').value = ''; get('adminEditorFields').replaceChildren(); editor.close(); writing = true;
    closeConfirmation = confirm({ title: 'ยืนยันการเปลี่ยนแปลง', message: description + ' การดำเนินการนี้จะบันทึกประวัติ', returnFocus: get('adminReload'), onClose: () => { password = ''; for (const key of Object.keys(values)) values[key] = null; writing = false; closeConfirmation = null; if (me) navigate(); }, onConfirm: async () => {
      if (getToken() !== token) { password = ''; signedOut(); return; }
      try { const result = await action(password, values); toast('บันทึกการเปลี่ยนแปลงแล้ว', 'success'); if (result?.sign_in_required) { password = ''; signedOut(); return; } await boot(); }
      catch (error) { if (error.status === 401 || error.data?.code === 'ACCOUNT_UNAUTHORIZED') { password = ''; signedOut(); return; } if (error.status === 409) toast('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดและตรวจสอบใหม่', 'warning'); throw error; }
    } });
  });
  get('adminEditorCancel').addEventListener('click', () => editor.close()); editor.addEventListener('close', () => { get('adminEditorForm').reset(); get('adminEditorFields').replaceChildren(); editAction = null; });
  get('adminEditAccount').addEventListener('click', () => {
    if (!selected) return; const current = selected, data = current.data;
    const keys = data.actor_type === 'teacher' ? ['first_name', 'last_name', 'first_name_en', 'last_name_en', 'academic_title', 'position'] : data.actor_type === 'department_staff' ? ['first_name', 'last_name', 'first_name_en', 'last_name_en', 'position'] : ['first_name', 'last_name'];
    beginEdit('แก้ไขข้อมูลบัญชี', `เปลี่ยนข้อมูลพื้นฐานของ ${data.email || data.id}`, keys.map(key => ({ key, label: labels[key], value: data[key], required: ['first_name', 'last_name'].includes(key), max: ['first_name', 'last_name'].includes(key) && data.actor_type !== 'teacher' ? 100 : 255 })), (password, changes) => request(`/accounts/${data.actor_type}/${data.id}`, { method: 'PATCH', version: current.version, body: { password, confirmed: true, changes } }));
  });
  get('adminToggleAccount').addEventListener('click', () => { if (!selected) return; const current = selected, data = current.data; beginEdit('เปลี่ยนสถานะบัญชี', `${data.active ? 'ปิด' : 'เปิด'}ใช้งาน ${data.email || data.id} · Session เดิมจะใช้ต่อไม่ได้`, [], password => request(`/accounts/${data.actor_type}/${data.id}/status`, { method: 'POST', version: current.version, body: { password, confirmed: true, enabled: !data.active } })); });
  get('adminEditPermissions').addEventListener('click', () => { if (!selected || !(selected.data.actor_type === 'super_admin' || selected.data.admin_grant_id)) return; const current = selected; beginEdit('แก้ไขสิทธิ์ Super Admin', `เปลี่ยนสิทธิ์ ${current.data.email} · ต้องเข้าสู่ระบบใหม่หลังเปลี่ยน`, Object.entries(catalogue.permissions).map(([key, label]) => ({ key, label, type: 'checkbox', value: current.data.permissions.includes(key) })), (password, values) => request(`/accounts/${current.data.actor_type}/${current.data.id}/permissions`, { method: 'PUT', version: current.version, body: { password, confirmed: true, permissions: Object.keys(values).filter(key => values[key]) } })); });
  get('adminToggleMembership').addEventListener('click', () => { if (!selected?.data.admin_grant_id) return; const current = selected; beginEdit('เปลี่ยนสิทธิ์ผู้ดูแล', `${current.data.admin_enabled ? 'ระงับ' : 'เปิด'}สิทธิ์ Super Admin ของ ${current.data.email} โดยคง Teacher identity เดิม`, [], password => request(`/memberships/teacher/${current.data.id}/status`, { method: 'POST', version: current.version, body: { password, confirmed: true, enabled: !current.data.admin_enabled } })); });
  get('adminChangePassword').addEventListener('click', () => { if (!me) return; const current = me; beginEdit('เปลี่ยนรหัสผ่านของฉัน', 'ใช้รหัสผ่านเฉพาะบัญชีอย่างน้อย 14 ตัวอักษร เปลี่ยนแล้วต้องเข้าสู่ระบบใหม่', [{ key: 'new_password', label: 'รหัสผ่านใหม่', type: 'password', required: true, max: 72 }, { key: 'confirm_password', label: 'ยืนยันรหัสผ่านใหม่', type: 'password', required: true, max: 72 }], (password, values) => request('/me/password', { method: 'POST', version: current.version, body: { password, confirmed: true, new_password: values.new_password } })); });
  get('adminSearch').addEventListener('submit', event => { event.preventDefault(); page = 1; load(); });
  get('adminPrevious').addEventListener('click', () => { if (page > 1) { page--; load(); } }); get('adminNext').addEventListener('click', () => { page++; load(); });
  get('adminAuditPrevious').addEventListener('click', () => { if (auditPage > 1) { auditPage--; load(); } }); get('adminAuditNext').addEventListener('click', () => { auditPage++; load(); });
  get('adminReload').addEventListener('click', () => boot());
  get('adminLogout').addEventListener('click', () => { if (writing) return; confirm({ title: 'ออกจากระบบผู้ดูแล', message: 'ออกจากระบบและเพิกถอน Admin Session ทั้งหมดของบัญชีนี้', onConfirm: async () => { try { await request('/logout', { method: 'POST', body: {} }); signedOut(); } catch (error) { if (error.status === 401 || error.data?.code === 'ACCOUNT_UNAUTHORIZED') signedOut(); else throw Error('ยังเพิกถอน Session ไม่สำเร็จ กรุณาลองใหม่'); } } }); });
  get('adminSidebarLogout').addEventListener('click', () => get('adminLogout').click());
  target.addEventListener('resize', () => revealNavigationItem(get('adminNav'), get('adminNav').querySelector('[aria-current="page"]')));
  target.addEventListener('hashchange', navigate); target.addEventListener('storage', () => { if (getToken() !== token) signedOut(); }); target.addEventListener('pagehide', wipe); target.addEventListener('pageshow', event => { if (event.persisted) boot(); });
  async function boot() {
    token = getToken(); if (!token) { signedOut(); return; }
    status('กำลังตรวจสอบสิทธิ์ผู้ดูแล...'); const current = token;
    try { const result = await request('/me'); if (current !== getToken()) { signedOut(); return; } me = result; get('adminName').textContent = [result.data.first_name, result.data.last_name].join(' '); get('adminTeacherDashboard').hidden = result.data.actor_type !== 'teacher'; catalogue = await request('/permissions'); if (current !== getToken()) { signedOut(); return; } await navigate(); }
    catch (error) { if (error.status === 403 && error.data?.code === 'ADMIN_FORBIDDEN' && getRoleToken('teacher')) { wipe(); target.location.replace('/src/teacher_coop/teacher_coop.html'); } else if ([401, 403].includes(error.status)) signedOut(); else failure(error); }
  }
  navigate(); const ready = boot(); return { ready, load, boot };
}
if (typeof document !== 'undefined') mountSuperAdmin({ document });
