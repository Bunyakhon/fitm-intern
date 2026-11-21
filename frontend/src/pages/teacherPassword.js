import { apiRequest } from '../api/client.js';
import { getRoleToken, clearRoleSession } from '../auth/roleAuthStorage.js';
import { showToast, setButtonLoading } from '../ui/feedback.js';
import '../styles/teacher_password.css';

export function mountTeacherPassword({ document, target = window, root, forced = false, request = apiRequest,
  getToken = () => getRoleToken('teacher'), toast = showToast, onBusyChange = () => {} }) {
  const el = (tag, text = '', className = '') => { const node = document.createElement(tag); node.textContent = text; node.className = className; return node; };
  root.classList.add('teacher-password', 'teacher-account-card');
  root.classList.toggle('teacher-password--first', forced);
  const title = el(forced ? 'h1' : 'h2', forced ? 'ตั้งรหัสผ่านใหม่เพื่อเริ่มใช้งาน' : 'ความปลอดภัยบัญชี'); title.tabIndex = -1;
  const intro = el('p', forced ? 'เพื่อความปลอดภัยของบัญชี กรุณาเปลี่ยนรหัสผ่านเริ่มต้นก่อนใช้งานระบบ CWIE-IT CoopConnect' : 'เปลี่ยนรหัสผ่านของตนเอง เมื่อสำเร็จต้องเข้าสู่ระบบใหม่ทุกอุปกรณ์', 'teacher-password-note');
  const hint = el('p', forced
    ? 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร และไม่ซ้ำกับรหัสผ่านเดิม'
    : 'ใช้รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร ไม่เกิน 72 UTF-8 bytes ห้ามใช้รหัสเริ่มต้นหรือรหัสปัจจุบันซ้ำ บัญชีที่มีสิทธิ์ผู้ดูแลระบบใช้เงื่อนไขที่เข้มขึ้นตามระบบเดิม', 'teacher-password-note');
  hint.id = forced ? 'firstPasswordHint' : 'teacherPasswordHint';
  const form = el('form'), fieldset = el('fieldset'), inputs = {}, errors = {};
  form.noValidate = true;
  if (forced) fieldset.setAttribute('aria-label', 'เปลี่ยนรหัสผ่านครั้งแรก');
  else fieldset.append(el('legend', 'เปลี่ยนรหัสผ่าน'));
  function eyeIcon(visible) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(key, value);
    const shape = document.createElementNS(svg.namespaceURI, 'path');
    shape.setAttribute('d', visible ? 'm3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10 10 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3 3.7M6.2 6.2A20 20 0 0 0 2 12s4 7 10 7a10 10 0 0 0 5.8-1.8'
      : 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z');
    svg.append(shape); return svg;
  }
  function renderToggle(toggle, key, visible = false) {
    if (forced) toggle.replaceChildren(eyeIcon(visible)); else toggle.textContent = visible ? 'ซ่อน' : 'แสดง';
    toggle.setAttribute('aria-label', `${visible ? 'ซ่อน' : 'แสดง'}${labels[key]}`);
    toggle.setAttribute('aria-pressed', String(visible));
  }
  const grid = el('div', '', 'teacher-password-grid');
  const labels = { current_password: 'รหัสผ่านปัจจุบัน', new_password: 'รหัสผ่านใหม่', confirm_password: 'ยืนยันรหัสผ่านใหม่' };
  for (const [key, labelText] of Object.entries(labels)) {
    const group = el('div', '', 'teacher-password-field'), label = el('label', `${labelText} *`), input = el('input'), wrap = el('div', '', 'teacher-password-input');
    input.id = `${forced ? 'first' : 'own'}_${key}`; input.type = 'password'; input.required = true; input.maxLength = 100;
    input.autocomplete = key === 'current_password' ? 'current-password' : 'new-password'; label.htmlFor = input.id;
    const error = el('span', '', 'teacher-password-error'); error.id = `${input.id}_error`; error.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-describedby', `${hint.id} ${error.id}`);
    const toggle = el('button', '', 'teacher-button'); toggle.type = 'button'; toggle.dataset.passwordField = key; renderToggle(toggle, key);
    if (forced) toggle.addEventListener('pointerdown', event => { if (document.activeElement === input) event.preventDefault(); });
    toggle.addEventListener('click', () => {
      const visible = input.type === 'password', start = input.selectionStart, end = input.selectionEnd;
      input.type = visible ? 'text' : 'password'; renderToggle(toggle, key, visible);
      if (forced) { input.focus({ preventScroll: true }); if (start != null && end != null) input.setSelectionRange(start, end); }
    });
    input.addEventListener('input', () => { error.textContent = ''; input.removeAttribute('aria-invalid'); });
    wrap.append(input, toggle); group.append(label, wrap, error); grid.append(group); inputs[key] = input; errors[key] = error;
  }
  const message = el('p'); message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
  const actions = el('div', '', 'teacher-password-actions'), save = el('button', forced ? 'เปลี่ยนรหัสผ่านและดำเนินการต่อ' : 'บันทึกรหัสผ่านใหม่', 'teacher-button teacher-button--primary'); save.type = 'submit';
  const logout = el('button', 'ออกจากระบบ', 'teacher-button'); logout.type = 'button';
  const retry = forced ? null : el('button', 'ลองโหลดสถานะอีกครั้ง', 'teacher-button');
  if (retry) { retry.type = 'button'; retry.hidden = true; }
  actions.append(save); if (forced) actions.append(logout);
  fieldset.append(grid, hint); form.append(fieldset, actions); root.append(title, intro, form, message); if (retry) root.append(retry);
  let serial = 0, busy = false, ready = false, blocked = false, boundToken = getToken(), uncertain = false, statusError = false;
  const current = (ticket, token) => ticket === serial && !!token && getToken() === token;
  function controls() { fieldset.disabled = busy || blocked || (!ready && !statusError) || uncertain; save.disabled = fieldset.disabled;
    logout.disabled = busy; if (retry) retry.disabled = busy; form.setAttribute('aria-busy', String(busy)); }
  function say(text, error = false) { message.textContent = text; if (forced) message.hidden = !text;
    message.dataset.type = error ? 'error' : 'info'; message.setAttribute('role', error ? 'alert' : 'status'); }
  function clear() {
    ++serial; busy = ready = statusError = false; uncertain = false; boundToken = getToken(); form.reset();
    for (const input of Object.values(inputs)) { input.type = 'password'; input.removeAttribute('aria-invalid'); }
    for (const error of Object.values(errors)) error.textContent = '';
    for (const button of grid.querySelectorAll('button')) renderToggle(button, button.dataset.passwordField);
    say(forced ? '' : 'กรุณาโหลดสถานะบัญชีอีกครั้ง'); controls(); onBusyChange();
  }
  function signOut(token = getToken()) {
    if (getToken() !== token) return;
    clear(); clearRoleSession('teacher', { expectedToken: token }); target.location.replace('/login.html');
  }
  function sessionError(error, token) {
    if (getToken() !== token) { clear(); return true; }
    if ([401, 403].includes(error.status)) { signOut(token); return true; }
    return false;
  }
  async function load() {
    if (busy) return;
    const token = getToken(), ticket = ++serial; boundToken = token; busy = true; ready = statusError = false; if (retry) retry.hidden = true; controls(); onBusyChange(); say('กำลังตรวจสถานะบัญชี...');
    try {
      if (!token) { signOut(token); return; }
      const response = await request('/api/teachers/account-security', { auth: false, headers: { Authorization: `Bearer ${token}` } });
      if (!current(ticket, token)) return;
      if (response?.success !== true || typeof response.data?.must_change_password !== 'boolean') throw Error('โหลดสถานะบัญชีไม่สำเร็จ');
      if (!forced && response.data.must_change_password) { target.location.replace('/src/teacher_coop/first_password_change.html'); return; }
      if (forced && !response.data.must_change_password) { target.location.replace('/src/teacher_coop/teacher_coop.html'); return; }
      ready = true; say(forced ? '' : 'รหัสผ่านจะไม่แสดงหรือถูกบันทึกไว้ในเบราว์เซอร์');
    } catch (error) { if (current(ticket, token) && !sessionError(error, token)) {
      statusError = forced;
      say(forced ? 'ยังตรวจสถานะบัญชีไม่ได้ ตรวจการเชื่อมต่อแล้วกดเปลี่ยนรหัสผ่านอีกครั้ง หรือออกจากระบบ'
        : error.message || 'โหลดสถานะไม่สำเร็จ', true); if (retry) retry.hidden = false;
    } }
    finally { if (ticket === serial) { busy = false; controls(); onBusyChange(); } }
  }
  function validate() {
    let valid = true;
    for (const key of Object.keys(inputs)) { errors[key].textContent = ''; inputs[key].removeAttribute('aria-invalid'); }
    const error = (key, text) => { if (errors[key].textContent) return; if (valid) inputs[key].focus(); valid = false; errors[key].textContent = text; inputs[key].setAttribute('aria-invalid', 'true'); };
    for (const [key, input] of Object.entries(inputs)) if (!input.value) error(key, `กรุณากรอก${labels[key]}`);
    if (inputs.new_password.value && inputs.new_password.value.length < 8) error('new_password', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
    else if (new TextEncoder().encode(inputs.new_password.value).length > 72) error('new_password', 'รหัสผ่านใหม่ยาวเกินขนาดที่ระบบรองรับ (72 ไบต์) กรุณาลดความยาว โดยภาษาไทยอาจใช้หลายไบต์ต่อตัว');
    if (inputs.new_password.value && inputs.new_password.value === inputs.current_password.value) error('new_password', 'กรุณาใช้รหัสผ่านใหม่ที่ต่างจากเดิม');
    if (inputs.confirm_password.value && inputs.new_password.value !== inputs.confirm_password.value) error('confirm_password', 'ยืนยันรหัสผ่านใหม่ไม่ตรงกัน');
    return valid;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || blocked || uncertain) return;
    if (!ready && forced && statusError) await load();
    if (!ready || !validate()) return;
    const token = getToken(), ticket = ++serial;
    let errorField = null;
    busy = true; controls(); onBusyChange(); say('กำลังเปลี่ยนรหัสผ่าน...'); setButtonLoading(save, true, 'กำลังเปลี่ยนรหัสผ่าน...');
    try {
      const body = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value]));
      const response = await request('/api/teachers/account-security', { method: 'POST', body, auth: false, headers: { Authorization: `Bearer ${token}` } });
      if (!current(ticket, token)) return;
      if (response?.success !== true || response.data?.sign_in_required !== true) throw Error('ยังยืนยันผลไม่ได้ กรุณาเข้าสู่ระบบใหม่');
      form.reset(); ready = false; say(response.data.message); toast(response.data.message, 'success');
      // Keep the acknowledged result visible; credentials are already cleared
      // and the backend has revoked this session. Never clear a newer login.
      await new Promise(resolve => target.setTimeout(resolve, 1000));
      if (!current(ticket, token)) return;
      clearRoleSession('teacher', { expectedToken: token }); target.location.replace('/login.html');
    } catch (error) {
      if (!current(ticket, token) || sessionError(error, token)) return;
      const key = error.data?.field;
      if (Object.hasOwn(errors, key)) { errors[key].textContent = error.message; inputs[key].setAttribute('aria-invalid', 'true'); errorField = key; }
      if (!error.status || error.status >= 500 || error.status === 409) {
        uncertain = true; say('ยังยืนยันผลไม่ได้ กรุณาออกจากระบบและเข้าสู่ระบบใหม่เพื่อตรวจสอบ ก่อนลองอีกครั้ง', true);
        if (!forced && !logout.isConnected) actions.append(logout);
      } else say(error.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', true);
      toast(message.textContent, 'error');
    } finally { if (ticket === serial) { busy = false; setButtonLoading(save, false); controls(); onBusyChange(); if (errorField) inputs[errorField].focus(); } }
  });
  logout.addEventListener('click', async () => {
    if (busy) return;
    const token = getToken(); busy = true; controls(); onBusyChange();
    try { await request('/api/teachers/account-security/logout', { method: 'POST', body: {}, auth: false, headers: { Authorization: `Bearer ${token}` } }); }
    catch (error) { if (getToken() === token && ![401, 403].includes(error.status)) toast('ออกจากอุปกรณ์นี้แล้ว แต่ยังยืนยันการเพิกถอน Session ที่เซิร์ฟเวอร์ไม่ได้', 'warning'); }
    finally { if (getToken() === token) signOut(token); }
  });
  retry?.addEventListener('click', load);
  target.addEventListener('storage', () => { if (boundToken !== getToken()) clear(); });
  target.addEventListener('pagehide', clear);
  target.addEventListener('pageshow', event => { if (event.persisted) load(); });
  document.addEventListener('teacher:coop-session-invalid', clear);
  const readyPromise = load();
  return { ready: readyPromise, load, clear, isBusy: () => busy, setBlocked: value => { blocked = !!value; controls(); } };
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('firstPasswordChange');
  if (root) mountTeacherPassword({ document, root, forced: true });
}
