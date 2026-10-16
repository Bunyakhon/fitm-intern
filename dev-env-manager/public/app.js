const $ = id => document.getElementById(id);
const titles = { backend: 'Backend', frontend: 'Frontend', nlp: 'NLP Service' };
let csrf = '', service = 'backend', current = null, edits = new Map(), locked = false, dialogAction = null, noticeTimer, sessionTimer, idleTimer, authenticated = false;
function notify(message) { $('feedback').textContent = message; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('feedback').textContent = ''; }, 6500); }
function clearInputs() { for (const input of document.querySelectorAll('input[type=password]')) input.value = ''; }
function loggedOut(message) {
  csrf = ''; authenticated = false; current = null; edits.clear(); clearInputs(); $('variables').replaceChildren(); $('backups').replaceChildren(); $('confirmation').close();
  $('workspace').hidden = true; $('loginPanel').hidden = false; clearTimeout(sessionTimer); clearTimeout(idleTimer);
  if (message) notify(message);
}
async function request(path, data) {
  const response = await fetch(path, { method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && ['SESSION','AUTH'].includes(result.code)) loggedOut(result.message);
    const error = new Error(result.message || 'ดำเนินการไม่สำเร็จ'); error.code = result.code; throw error;
  }
  if (authenticated) { clearTimeout(idleTimer); idleTimer = setTimeout(() => loggedOut('Session ว่างนานเกิน 20 นาที กรุณา Login ใหม่'), 20 * 60 * 1000); }
  return result;
}
async function initialize() {
  const session = await request('/api/session'); csrf = session.csrf;
  if (session.authenticated) {
    authenticated = true;
    $('loginPanel').hidden = true; $('workspace').hidden = false;
    $('sessionInfo').textContent = 'Session สูงสุด 4 ชั่วโมง · Idle timeout 20 นาที';
    clearTimeout(sessionTimer); sessionTimer = setTimeout(() => loggedOut('Session หมดอายุ กรุณา Login ใหม่'), Math.max(0, session.expiresAt - Date.now()));
    await load();
  }
}
function dirty() {
  $('dirty').textContent = edits.size ? `Unsaved Changes · ${edits.size}` : 'ไม่มีการแก้ไข'; $('dirty').classList.toggle('changed', edits.size > 0);
  $('save').disabled = locked || !current || !edits.size; $('cancel').disabled = locked || !edits.size;
}
function setLocked(value) {
  locked = value;
  for (const element of document.querySelectorAll('#workspace button, #variables input, #confirmForm button, #confirmForm input, #loginForm button')) element.disabled = value;
  dirty();
}
function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
function render() {
  const root = $('variables'); root.replaceChildren(); if (!current) return;
  const query = $('search').value.trim().toUpperCase(), filter = $('filter').value;
  const visible = current.variables.filter(v => v.key.includes(query) && (filter !== 'changed' || edits.has(v.key)) && (filter !== 'secret' || v.secret));
  $('variableCount').textContent = `${visible.length} / ${current.variables.length} Variables`;
  for (const [index, variable] of visible.entries()) {
    const edit = edits.get(variable.key), row = node('div', undefined, 'variable'); row.classList.toggle('is-changed', !!edit);
    const meta = node('div'), label = node('label', variable.key, 'variable-name'); label.htmlFor = `variable-${index}`;
    meta.append(label, node('span', variable.secret ? `Secret · ${variable.configured ? 'มีค่าแล้ว' : 'ยังไม่มีค่า'}` : 'Configuration', 'variable-state'));
    const control = node('div'), input = document.createElement('input'); input.id = label.htmlFor; input.type = variable.secret ? 'password' : 'text';
    input.autocomplete = 'off'; input.spellcheck = false; input.maxLength = 8192;
    input.value = variable.secret ? edit?.value || '' : edit?.value ?? variable.value;
    if (variable.secret) input.placeholder = 'เว้นว่าง = ไม่เปลี่ยนค่าเดิม';
    input.disabled = locked || edit?.clear === true;
    input.addEventListener('input', () => {
      if (variable.secret && !input.value || !variable.secret && input.value === variable.value) edits.delete(variable.key);
      else edits.set(variable.key, { key: variable.key, value: input.value });
      row.classList.toggle('is-changed', edits.has(variable.key)); dirty();
    });
    control.append(input);
    if (variable.secret) {
      const clear = document.createElement('input'); clear.type = 'checkbox'; clear.checked = edit?.clear === true;
      const clearLabel = node('label', undefined, 'check'); clearLabel.append(clear, document.createTextNode('ยืนยันล้างค่า Secret เดิม (ต้อง Preview และยืนยันรหัสผ่าน)'));
      clear.addEventListener('change', () => { if (clear.checked) edits.set(variable.key, { key: variable.key, clear: true, confirmClear: true }); else edits.delete(variable.key); input.value = ''; input.disabled = clear.checked; row.classList.toggle('is-changed', clear.checked); dirty(); });
      control.append(clearLabel);
    }
    row.append(meta, control); root.append(row);
  }
  if (!visible.length) root.append(node('p', 'ไม่พบ Variable ตามตัวกรอง', 'help'));
  dirty();
}
async function load() {
  setLocked(true); current = null; edits.clear(); clearInputs(); $('variables').replaceChildren(); $('loadError').hidden = true;
  $('serviceTitle').textContent = titles[service]; $('filePath').textContent = service === 'nlp' ? 'nlp-service/.env' : `${service}/.env`;
  try {
    current = await request(`/api/env/${service}`); render();
    $('restartStatus').textContent = current.restart.pending ? 'Saved Successfully · Pending Restart / Recreate' : 'สถานะ Service: Unknown';
    $('restartAdvice').textContent = current.restart.advice;
    await history();
  } catch (error) { $('loadError').textContent = error.message; $('loadError').hidden = false; $('backups').replaceChildren(); }
  finally { setLocked(false); }
}
async function history() {
  const { backups } = await request(`/api/env/${service}/backups`), list = $('backups'); list.replaceChildren();
  if (!backups.length) list.append(node('p', 'ยังไม่มี Backup สำหรับ Service นี้', 'help'));
  for (const entry of backups) {
    const row = node('div', undefined, 'backup-entry'); row.append(node('span', new Date(entry.createdAt).toLocaleString('th-TH')));
    const restore = node('button', 'Restore'); restore.type = 'button';
    restore.addEventListener('click', async () => {
      if (edits.size) { notify('มี Unsaved Changes กรุณา Save หรือ Cancel ก่อน Restore'); return; }
      await prepare(async () => request(`/api/env/${service}/restore-preview`, { version: current.version, backupId: entry.id }), 'Restore Configuration');
    }); row.append(restore); list.append(row);
  }
}
function closeDialog() { $('confirmation').close(); $('confirmPassword').value = ''; dialogAction = null; }
function openDialog(title, detail, action, { reauth = false, preview = null } = {}) {
  dialogAction = action; $('confirmTitle').textContent = title; $('confirmDetail').textContent = detail;
  $('dialogError').textContent = ''; $('confirmPassword').value = ''; $('confirmPassword').required = reauth;
  $('passwordLabel').hidden = !reauth; $('confirmPassword').hidden = !reauth;
  $('confirmCheckLabel').hidden = !reauth; $('confirmCheck').required = reauth; $('confirmCheck').checked = false;
  $('changePreview').replaceChildren(); $('warnings').replaceChildren();
  for (const item of preview?.changes || []) {
    const row = node('div', undefined, 'preview-entry'); row.append(node('strong', item.key), node('span', item.secret ? `Secret: ${item.action === 'clear' || item.action === 'remove' ? 'ล้างค่า/นำออก' : 'เปลี่ยนค่า'} (ไม่แสดงค่าเดิมหรือค่าใหม่)` : `${item.before} → ${item.after}`)); $('changePreview').append(row);
  }
  for (const warning of preview?.warnings || []) $('warnings').append(node('p', warning));
  $('confirmation').showModal(); (reauth ? $('confirmPassword') : $('confirmButton')).focus();
}
async function prepare(factory, title) {
  setLocked(true);
  try {
    const preview = await factory();
    openDialog(title, 'Preview นี้มีอายุ 5 นาที; Backup ไฟล์ปัจจุบันก่อน Atomic Replace ทุกครั้ง', async password => {
      const result = await request(`/api/env/${service}/commit`, { previewId: preview.previewId, password, confirmed: true });
      closeDialog(); await load(); notify(result.restart.pending ? 'Saved Successfully · Pending Restart / Recreate' : 'บันทึกสำเร็จ');
    }, { reauth: true, preview });
  } catch (error) { notify(error.message); }
  finally { setLocked(false); }
}
$('loginForm').addEventListener('submit', async event => {
  event.preventDefault(); setLocked(true); let password = $('loginPassword').value; $('loginPassword').value = '';
  try { if (!csrf) await initialize(); await request('/api/login', { username: 'root', password }); password = ''; await initialize(); }
  catch (error) { notify(error.message); } finally { password = ''; setLocked(false); }
});
$('confirmForm').addEventListener('submit', async event => {
  event.preventDefault(); if (!dialogAction || locked) return;
  const action = dialogAction; let password = $('confirmPassword').value; $('confirmPassword').value = ''; setLocked(true);
  try { await action(password); } catch (error) { $('dialogError').textContent = error.message; } finally { password = ''; setLocked(false); }
});
$('closeDialog').addEventListener('click', closeDialog);
$('confirmation').addEventListener('cancel', event => { if (locked) event.preventDefault(); else { $('confirmPassword').value = ''; dialogAction = null; } });
$('search').addEventListener('input', render); $('filter').addEventListener('change', render);
for (const tab of document.querySelectorAll('[data-service]')) tab.addEventListener('click', () => {
  const change = async () => { closeDialog(); service = tab.dataset.service; $('search').value = ''; $('filter').value = 'all';
    for (const other of document.querySelectorAll('[data-service]')) other.setAttribute('aria-selected', String(other === tab));
    $('editor').setAttribute('aria-labelledby', tab.id); await load(); };
  if (edits.size) openDialog('มี Unsaved Changes', 'ยืนยันละทิ้งการแก้ไขก่อนเปลี่ยน Service?', change); else change();
});
function reload() { if (edits.size) openDialog('ละทิ้ง Unsaved Changes', 'โหลดค่าปัจจุบันใหม่โดยไม่บันทึกการแก้ไข?', async () => { closeDialog(); await load(); }); else load(); }
$('cancel').addEventListener('click', reload); $('reload').addEventListener('click', reload);
$('save').addEventListener('click', () => prepare(() => request(`/api/env/${service}/preview`, { version: current.version, changes: [...edits.values()] }), 'Save Changes'));
$('backup').addEventListener('click', () => {
  if (!current) return;
  openDialog('สร้าง Backup', 'สำรองไฟล์ที่บันทึกอยู่บน Disk ของ Service นี้; Unsaved Changes ไม่อยู่ใน Backup', async password => {
    await request(`/api/env/${service}/backup`, { version: current.version, password, confirmed: true }); closeDialog(); await history(); notify('สร้าง Backup และตรวจ Integrity สำเร็จ');
  }, { reauth: true });
});
$('logout').addEventListener('click', () => {
  const logout = async () => { await request('/api/logout', {}); loggedOut('Logout แล้ว Session ถูกยกเลิกฝั่ง Server'); await initialize(); };
  if (edits.size) openDialog('Logout', 'มี Unsaved Changes ยืนยันละทิ้งและ Logout?', logout); else logout().catch(error => notify(error.message));
});
window.addEventListener('pagehide', () => loggedOut());
window.addEventListener('pageshow', event => { if (event.persisted) initialize().catch(error => notify(error.message)); });
initialize().catch(error => notify(error.message));
