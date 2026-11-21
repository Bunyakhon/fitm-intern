import { googleConfig, googleStaffStatus, googleStaffChallenge, googleStaffLink, googleStaffConfirm } from '../api/googleAuth.api.js';
import { loadGoogleProvider, confirmGoogleLink } from './googleLogin.js';
import { showToast } from '../ui/feedback.js';

export function mountStaffGoogleAccount({ document, target = window, root, getToken,
  config = googleConfig, status = googleStaffStatus, challenge = googleStaffChallenge,
  link = googleStaffLink, confirm = googleStaffConfirm, toast = showToast,
  loadProvider = () => loadGoogleProvider(document, target) }) {
  const el = (tag, text = '') => { const node = document.createElement(tag); node.textContent = text; return node; };
  const card = el('section'); card.className = 'staff-google-account'; card.setAttribute('aria-labelledby', 'staffGoogleHeading');
  const heading = el('h3', 'เชื่อมต่อบัญชี Google'); heading.id = 'staffGoogleHeading';
  const badge = el('p', 'ยังไม่ได้ตรวจสอบ'), message = el('p'); message.setAttribute('aria-live', 'polite');
  const form = el('form'), label = el('label', 'รหัสผ่านบัญชีเจ้าหน้าที่ปัจจุบัน'), password = el('input');
  password.id = 'staffGooglePassword'; label.htmlFor = password.id; password.type = 'password';
  password.autocomplete = 'current-password'; password.required = true; password.maxLength = 100;
  const help = el('p', 'ยืนยันรหัสผ่านเดิม แล้วเลือก Google Workspace @itm.kmutnb.ac.th และตรวจสอบทั้งสองบัญชีก่อนยืนยัน');
  help.id = 'staffGoogleHelp'; password.setAttribute('aria-describedby', help.id);
  const connect = el('button', 'ยืนยันรหัสผ่านและเชื่อม Google'); connect.type = 'submit'; connect.className = 'teacher-button';
  form.append(label, password, help, connect); form.hidden = true;
  const provider = el('div'); provider.className = 'staff-google-provider'; provider.tabIndex = -1;
  provider.setAttribute('role', 'group'); provider.setAttribute('aria-label', 'เลือกบัญชี Google');
  const cancel = el('button', 'ยกเลิกการเชื่อม'), retry = el('button', 'ลองตรวจสอบสถานะอีกครั้ง');
  for (const button of [cancel, retry]) { button.type = 'button'; button.className = 'teacher-button'; button.hidden = true; }
  card.append(heading, badge, message, form, provider, cancel, retry); root.append(card);
  let generation = 0, busy = false, exchanging = false, allowed = false, linked = false, failed = false, expiry, popupTimer;
  let sessionToken = getToken(), confirmationAbort;
  const current = (ticket, token) => ticket === generation && !!token && token === getToken();
  function controls() {
    form.hidden = !allowed || busy; password.disabled = busy; connect.disabled = busy;
    cancel.hidden = !busy; cancel.disabled = exchanging; retry.hidden = !failed || busy;
    card.setAttribute('aria-busy', String(busy));
  }
  function state(text, detail, error = false) {
    badge.textContent = text; message.textContent = detail;
    message.setAttribute('role', error ? 'alert' : 'status'); controls();
  }
  function reset() {
    ++generation; target.clearTimeout(expiry); target.clearTimeout(popupTimer);
    confirmationAbort?.abort(); confirmationAbort = null;
    password.value = ''; provider.replaceChildren(); provider.inert = false;
    busy = false; exchanging = false; controls();
  }
  function clear() {
    allowed = false; failed = true; linked = false; reset();
    state('กรุณาเข้าสู่ระบบใหม่', 'Session หมดอายุหรือสถานะเข้าสู่ระบบเปลี่ยนแล้ว', true);
  }
  function failure(error) {
    // An incorrect ownership password is retryable; it does not revoke the session.
    const code = error.data?.code;
    if (!getToken() || (error.status === 401 && !['GOOGLE_OWNERSHIP', 'GOOGLE_CREDENTIAL', 'GOOGLE_REQUEST_INVALID', 'GOOGLE_LINK_CONFIRMATION_INVALID'].includes(code))
      || code === 'ACCOUNT_UNAUTHORIZED' || code === 'GOOGLE_SESSION_CHANGED') { clear(); return; }
    failed = true;
    if (code === 'GOOGLE_DISABLED' || code === 'GOOGLE_LINK_APPROVAL_REQUIRED') allowed = false;
    state(code === 'GOOGLE_IDENTITY_CONFLICT' ? 'บัญชี Google ถูกใช้งานกับบัญชีอื่น'
      : code === 'GOOGLE_ALREADY_LINKED' ? 'กรุณาตรวจสอบสถานะอีกครั้ง' : 'เชื่อมต่อไม่สำเร็จ',
    error.message || 'เชื่อมต่อ Google ไม่สำเร็จ กรุณาลองใหม่', true);
    toast(message.textContent, 'error');
  }
  function cancelled() {
    reset(); failed = false;
    state(linked ? 'เชื่อม Google แล้ว' : 'ยังไม่ได้เชื่อม Google', 'ยกเลิกการเชื่อมแล้ว สามารถเริ่มใหม่เมื่อพร้อม');
  }
  async function load() {
    if (busy) return;
    reset(); allowed = false; failed = false; busy = true;
    const ticket = generation, token = getToken(); sessionToken = token;
    state('กำลังตรวจสอบ', 'กำลังตรวจสอบสถานะการเชื่อมต่อ Google...');
    if (!token) { clear(); return; }
    try {
      const cfg = await config(); if (!current(ticket, token)) return;
      if (cfg.enabled !== true || cfg.linkingEnabled !== true) {
        state('ยังไม่เปิดใช้งาน', 'ยังไม่เปิดใช้งานการเชื่อมต่อ Google'); return;
      }
      const result = await status(); if (!current(ticket, token)) return;
      if (typeof result?.linked !== 'boolean' || typeof result.enabled !== 'boolean' || typeof result.canLink !== 'boolean')
        throw Error('ยังยืนยันสถานะ Google ไม่ได้ กรุณาลองอีกครั้ง');
      linked = result.linked; allowed = result.enabled && !linked && result.canLink;
      state(linked ? 'เชื่อม Google แล้ว' : !result.enabled ? 'ยังไม่เปิดใช้งาน' : 'ยังไม่ได้เชื่อม Google',
        linked ? 'เข้าสู่ระบบครั้งถัดไปด้วย Google หรืออีเมลและรหัสผ่านเดิมได้'
          : allowed ? 'ยืนยันรหัสผ่านบัญชีปัจจุบันเพื่อเริ่มเชื่อม Google'
            : 'ขณะนี้บัญชียังไม่พร้อมเชื่อม Google กรุณาติดต่อผู้ดูแลระบบ');
    } catch (error) { if (current(ticket, token)) failure(error); }
    finally { if (ticket === generation) { busy = false; controls(); } }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !allowed || !password.value) return;
    const token = getToken(); if (!token) { clear(); return; }
    const ticket = ++generation; busy = true; failed = false;
    state('รอยืนยันเจ้าของบัญชี', 'กำลังยืนยันรหัสผ่านบัญชีเจ้าหน้าที่...');
    try {
      const cfg = await config(); if (!current(ticket, token)) return;
      if (cfg.enabled !== true || cfg.linkingEnabled !== true) {
        allowed = false; reset(); state('ยังไม่เปิดใช้งาน', 'ยังไม่เปิดใช้งานการเชื่อมต่อ Google'); return;
      }
      // The backend proves the current Staff password before GIS is loaded.
      let request;
      const proof = { password: password.value }; password.value = '';
      try { request = await challenge(proof); }
      finally { delete proof.password; }
      if (!current(ticket, token)) return;
      if (!request?.nonce || !request.requestId || !request.requestToken || !Number.isFinite(Date.parse(request.expiresAt)))
        throw Error('รูปแบบคำขอ Google ไม่ถูกต้อง');
      const google = await loadProvider(); if (!current(ticket, token)) return;
      google.initialize({ client_id: cfg.clientId, nonce: request.nonce, ux_mode: 'popup', auto_select: false,
        callback: async response => {
          if (!current(ticket, token) || exchanging) return;
          if (!response?.credential) { cancelled(); return; }
          exchanging = true; provider.inert = true; target.clearTimeout(expiry); target.clearTimeout(popupTimer);
          state('กำลังเชื่อมต่อ', 'กำลังตรวจสอบบัญชี Google...');
          try {
            const preview = await link({ credential: response.credential, requestId: request.requestId, requestToken: request.requestToken });
            if (!current(ticket, token)) return;
            if (preview?.confirmationRequired !== true || preview.target?.role !== 'department_staff'
              || !preview.confirmationToken || !Number.isFinite(Date.parse(preview.expiresAt))) throw Error('รูปแบบการยืนยันบัญชีไม่ถูกต้อง');
            state('รอยืนยันการเชื่อม', 'ตรวจสอบบัญชีเว็บไซต์และบัญชี Google ในหน้าต่างยืนยัน');
            confirmationAbort = new AbortController();
            const result = await confirmGoogleLink(preview, { target, signal: confirmationAbort.signal, confirm: async body => {
              if (!current(ticket, token)) throw Error('สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเริ่มใหม่');
              const saved = await confirm(body);
              if (!current(ticket, token)) throw Error('สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเริ่มใหม่');
              if (saved?.linked !== true) throw Error('ยังยืนยันการเชื่อมไม่ได้ กรุณาตรวจสอบสถานะอีกครั้ง');
              return saved;
            } });
            if (!current(ticket, token)) return;
            if (!result) { cancelled(); return; }
            linked = true; allowed = false; reset();
            state('เชื่อมต่อสำเร็จ', 'เชื่อม Google กับบัญชีเจ้าหน้าที่เดิมแล้ว'); toast(message.textContent, 'success'); await load();
          } catch (error) { if (current(ticket, token)) { reset(); failure(error); } }
        } });
      google.renderButton(provider, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', locale: 'th',
        width: Math.min(provider.clientWidth || card.clientWidth || 300, 400), click_listener: () => {
          if (!current(ticket, token)) return;
          target.clearTimeout(popupTimer);
          popupTimer = target.setTimeout(() => { if (current(ticket, token) && !exchanging) cancelled(); }, 60000);
        } });
      state('รอเลือก Google Account', 'เลือก Google Workspace @itm.kmutnb.ac.th ของคุณ'); provider.focus();
      expiry = target.setTimeout(() => {
        if (current(ticket, token) && !exchanging) { reset(); failure(Error('คำขอหมดอายุ กรุณายืนยันรหัสผ่านและเริ่มใหม่')); }
      }, Math.max(0, Date.parse(request.expiresAt) - Date.now()));
    } catch (error) { if (current(ticket, token)) { reset(); failure(error); } }
  });
  cancel.addEventListener('click', () => { if (!exchanging) cancelled(); });
  retry.addEventListener('click', load);
  target.addEventListener('storage', () => { if (getToken() !== sessionToken) clear(); });
  return { load, clear, cancel: reset };
}
