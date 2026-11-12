import { googleConfig, googleTeacherStatus, googleTeacherChallenge, googleTeacherLink, googleTeacherConfirm } from '../api/googleAuth.api.js';
import { loadGoogleProvider, confirmGoogleLink } from './googleLogin.js';
import { showToast, setButtonLoading } from '../ui/feedback.js';
import { teacherStatusBadge } from './teacherStatus.js';

// Teacher and Head share one authenticated Teacher actor; no role/owner input.
export function mountTeacherGoogleAccount({ document, target, root, getToken, onBusyChange = () => {},
  config = googleConfig, status = googleTeacherStatus, challenge = googleTeacherChallenge,
  link = googleTeacherLink, confirm = googleTeacherConfirm, toast = showToast,
  loadProvider = () => loadGoogleProvider(document, target) }) {
  const el = (tag, text = '', cls = '') => { const node = document.createElement(tag); node.textContent = text; node.className = cls; return node; };
  const card = el('section', '', 'teacher-google-account');
  const title = el('h3', 'การเชื่อมต่อบัญชี Google'); title.id = 'teacherGoogleHeading'; card.setAttribute('aria-labelledby', title.id);
  const header = el('div', '', 'teacher-account-card-heading'), brand = el('span', '', 'teacher-google-brand');
  const logo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  logo.setAttribute('viewBox', '0 0 24 24'); logo.setAttribute('aria-hidden', 'true'); logo.setAttribute('focusable', 'false');
  for (const [fill, d] of [
    ['#4285F4', 'M22.56 12.25c0-.73-.06-1.42-.19-2.09H12v3.96h5.92c-.26 1.28-1 2.36-2.12 3.09v2.57h3.43c2.01-1.85 3.17-4.58 3.17-7.53z'],
    ['#34A853', 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.43-2.57c-.98.66-2.24 1.06-3.85 1.06-2.87 0-5.31-1.94-6.18-4.54H2.28v2.66A11 11 0 0 0 12 23z'],
    ['#FBBC05', 'M5.82 14.29A6.6 6.6 0 0 1 5.47 12c0-.8.14-1.57.35-2.29V7.05H2.28A11 11 0 0 0 1 12c0 1.78.43 3.46 1.28 4.95l3.54-2.66z'],
    ['#EA4335', 'M12 5.17c1.62 0 3.07.56 4.21 1.64l3.16-3.16A10.6 10.6 0 0 0 12 1a11 11 0 0 0-9.72 6.05l3.54 2.66C6.69 7.11 9.13 5.17 12 5.17z'],
  ]) { const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('fill', fill); path.setAttribute('d', d); logo.append(path); }
  brand.append(logo);
  const intro = el('div', '', 'teacher-google-intro'); intro.append(title, el('p', 'เชื่อมบัญชี Google เพื่อเข้าสู่ระบบด้วยบัญชีเดิมของคุณ'));
  const badge = teacherStatusBadge(document, 'กำลังตรวจสอบ', 'pending');
  header.append(brand, intro, badge);
  const message = el('p', '', 'teacher-account-message'); message.setAttribute('aria-live', 'polite');
  const connect = el('button', 'เชื่อมต่อ Google', 'teacher-button teacher-button--primary'); connect.type = 'button'; connect.hidden = true;
  const help = el('p', 'บันทึกหรือยกเลิกการแก้ไขข้อมูลส่วนตัวก่อนเชื่อม Google', 'teacher-account-unsaved'); help.hidden = true;
  const provider = el('div', '', 'teacher-google-provider');
  provider.tabIndex = -1; provider.setAttribute('role', 'group'); provider.setAttribute('aria-label', 'เลือกบัญชี Google');
  const cancel = el('button', 'ยกเลิกการเชื่อมต่อ', 'teacher-button'); cancel.type = 'button'; cancel.hidden = true;
  const reload = el('button', 'ลองโหลดสถานะอีกครั้ง', 'teacher-button'); reload.type = 'button'; reload.hidden = true;
  const footer = el('div', '', 'teacher-google-actions'); footer.append(connect, cancel, reload);
  card.append(header, message, help, provider, footer); root.append(card);
  let generation = 0, busy = false, exchanging = false, allowed = false, blocked = false, failed = false, expiry, popupTimer;
  let previous = { text: 'ยังไม่ได้เชื่อมต่อ', tone: 'neutral' };
  const current = (ticket, token) => ticket === generation && !!token && token === getToken();
  function state(text, tone = 'neutral', error = false) {
    badge.textContent = text; badge.dataset.tone = tone;
    message.setAttribute('role', error ? 'alert' : 'status'); message.dataset.type = error ? 'error' : 'info';
  }
  function controls() {
    connect.disabled = blocked || busy || !allowed; connect.hidden = !allowed || busy;
    reload.hidden = !failed || busy; reload.disabled = busy; cancel.disabled = exchanging;
    footer.hidden = connect.hidden && cancel.hidden && reload.hidden;
    help.hidden = !blocked; card.setAttribute('aria-busy', String(busy)); onBusyChange(busy);
  }
  function reset() {
    ++generation; target.clearTimeout(expiry); target.clearTimeout(popupTimer);
    provider.replaceChildren(); provider.inert = false; cancel.hidden = true;
    busy = false; exchanging = false; setButtonLoading(connect, false, 'กำลังเตรียม...', 'เชื่อมต่อ Google'); controls();
  }
  function error(error) {
    failed = true;
    state('เกิดข้อผิดพลาด', 'danger', true); message.textContent = error.message || 'เชื่อมต่อ Google ไม่สำเร็จ กรุณาลองใหม่';
    controls();
  }
  function cancelled(text = 'ยกเลิกการเชื่อมต่อ Google แล้ว') {
    failed = false; reset(); state(previous.text, previous.tone); message.textContent = text;
    if (!connect.hidden && !connect.disabled) connect.focus();
  }
  async function load() {
    if (busy) return;
    failed = false; reset(); allowed = false; busy = true; controls(); state('กำลังตรวจสอบ', 'warning');
    message.textContent = 'กำลังตรวจสอบสถานะการเชื่อมต่อ Google...';
    const ticket = generation, token = getToken();
    try {
      if (!token) throw Error('กรุณาเข้าสู่ระบบใหม่');
      const cfg = await config(); if (!current(ticket, token)) return;
      if (cfg.enabled !== true || cfg.linkingEnabled !== true) {
        state('ยังไม่เปิดใช้งาน'); message.textContent = 'ยังไม่เปิดใช้งานการเชื่อมต่อ Google'; return;
      }
      const result = await status(); if (!current(ticket, token)) return;
      if (typeof result?.linked !== 'boolean' || typeof result.enabled !== 'boolean' || typeof result.canLink !== 'boolean') throw Error('ยังยืนยันสถานะ Google ไม่ได้');
      allowed = result.enabled && !result.linked && result.canLink;
      state(result.linked ? 'เชื่อมต่อแล้ว' : !result.enabled ? 'ยังไม่เปิดใช้งาน' : 'ยังไม่ได้เชื่อมต่อ', result.linked ? 'success' : 'neutral');
      message.textContent = result.linked ? 'บัญชีนี้เชื่อมต่อ Google แล้ว'
        : !result.enabled ? 'ยังไม่เปิดใช้งานการเชื่อมต่อ Google'
          : allowed ? 'เลือกบัญชี Google แล้วตรวจสอบบัญชีทั้งสองก่อนยืนยันการเชื่อมต่อ'
            : 'บัญชีนี้ยังไม่พร้อมเชื่อมต่อ Google กรุณาติดต่อผู้ดูแลระบบ';
    } catch (failure) { if (ticket === generation && (!token || token === getToken())) error(failure); }
    finally { if (ticket === generation) { busy = false; controls(); } }
  }
  connect.addEventListener('click', async () => {
    if (busy || blocked || !allowed) return;
    if (!getToken()) { allowed = false; reset(); error(Error('กรุณาเข้าสู่ระบบใหม่')); return; }
    previous = { text: 'ยังไม่ได้เชื่อมต่อ', tone: 'neutral' };
    failed = false; busy = true; const ticket = ++generation, token = getToken(); cancel.hidden = false; controls();
    state('กำลังเชื่อมต่อ', 'warning'); message.textContent = 'กำลังเตรียมการเชื่อมต่อ Google...';
    try {
      if (!token) throw Error('กรุณาเข้าสู่ระบบใหม่');
      const cfg = await config(); if (!current(ticket, token)) return;
      if (cfg.enabled !== true || cfg.linkingEnabled !== true) { allowed = false; reset(); state('ยังไม่เปิดใช้งาน'); message.textContent = 'ยังไม่เปิดใช้งานการเชื่อมต่อ Google'; return; }
      // The server binds this one-use challenge to the live Teacher session.
      const request = await challenge({}); if (!current(ticket, token)) return;
      if (!request?.nonce || !request.requestId || !request.requestToken || !Number.isFinite(Date.parse(request.expiresAt))) throw Error('รูปแบบคำขอ Google ไม่ถูกต้อง');
      const google = await loadProvider(); if (!current(ticket, token)) return;
      google.initialize({ client_id: cfg.clientId, nonce: request.nonce, ux_mode: 'popup', auto_select: false,
        callback: async response => {
          if (!current(ticket, token) || exchanging) return;
          if (!response?.credential) { cancelled(); return; }
          exchanging = true; provider.inert = true; controls(); target.clearTimeout(expiry); target.clearTimeout(popupTimer);
          state('กำลังเชื่อมต่อ', 'warning'); message.textContent = 'กำลังตรวจสอบบัญชี Google...';
          try {
            const preview = await link({ credential: response.credential, requestId: request.requestId, requestToken: request.requestToken });
            if (!current(ticket, token)) return;
            if (preview?.confirmationRequired !== true || !preview.target || !preview.confirmationToken || !Number.isFinite(Date.parse(preview.expiresAt))) throw Error('รูปแบบการยืนยันบัญชีไม่ถูกต้อง');
            const result = await confirmGoogleLink(preview, { target, confirm: async body => {
              if (!current(ticket, token)) throw Error('สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเริ่มใหม่');
              const saved = await confirm(body);
              if (!current(ticket, token)) throw Error('สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเริ่มใหม่');
              if (saved?.linked !== true) throw Error('ยังยืนยันการเชื่อมต่อไม่ได้ กรุณาตรวจสอบสถานะอีกครั้ง');
              return saved;
            } });
            if (!current(ticket, token)) return;
            if (!result) { cancelled('ยกเลิกหรือหมดเวลายืนยันการเชื่อมต่อ Google'); return; }
            reset();
            allowed = false; controls(); toast('เชื่อมต่อ Google สำเร็จ', 'success'); await load();
          } catch (failure) { if (current(ticket, token)) { reset(); error(failure); toast(message.textContent, 'error'); } }
        } });
      google.renderButton(provider, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', locale: 'th',
        width: Math.min(provider.clientWidth || card.clientWidth || 300, 400), click_listener: () => {
          if (!current(ticket, token)) return;
          target.clearTimeout(popupTimer);
          popupTimer = target.setTimeout(() => { if (current(ticket, token) && !exchanging) cancelled('ยังไม่ได้เชื่อมต่อ Google สามารถเริ่มใหม่ได้เมื่อพร้อม'); }, 60000);
        } });
      state('กำลังเชื่อมต่อ', 'warning'); message.textContent = 'เลือกบัญชี Google แล้วตรวจสอบบัญชีทั้งสองก่อนยืนยัน';
      provider.focus();
      expiry = target.setTimeout(() => { if (current(ticket, token) && !exchanging) { reset(); error(Error('คำขอหมดอายุ กรุณาเริ่มใหม่')); } }, Math.max(0, Date.parse(request.expiresAt) - Date.now()));
    } catch (failure) { if (current(ticket, token)) { reset(); error(failure); toast(message.textContent, 'error'); } }
  });
  cancel.addEventListener('click', () => { if (!exchanging) cancelled(); });
  reload.addEventListener('click', load);
  return { load, isBusy: () => busy,
    setEditing(value) { blocked = value; controls(); },
    clear() { allowed = false; failed = false; reset(); state('ยังไม่ได้ตรวจสอบ'); message.textContent = 'ตรวจสอบสถานะอีกครั้งหลังเข้าสู่ระบบ'; },
  };
}
