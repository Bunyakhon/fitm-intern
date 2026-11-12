import { mountContentModal, showConfirmModal } from '../ui/feedback.js';

// Owner-only binary requests. Blob URLs remain local and are revoked on session changes.
export function mountTeacherProfileImage({ document, target, summary, avatar, path, request, getToken, toast, onBusyChange }) {
  const el = (tag, text = '', cls = '') => { const node = document.createElement(tag); node.textContent = text; node.className = cls; return node; };
  const picker = el('button', '', 'teacher-photo-picker'); picker.type = 'button'; picker.setAttribute('aria-label', 'จัดการรูปโปรไฟล์');
  picker.setAttribute('aria-haspopup', 'dialog'); picker.setAttribute('aria-controls', 'teacherPhotoDialog');
  const camera = el('span', '', 'teacher-photo-camera'); camera.setAttribute('aria-hidden', 'true');
  camera.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h4l2-3h4l2 3h4v14H4z"/><circle cx="12" cy="12" r="4"/></svg>';
  const image = el('img'); image.alt = ''; image.hidden = true;
  const photoControls = el('div', '', 'teacher-photo-avatar');
  const remove = el('button', '', 'teacher-button teacher-button--danger-ghost'); remove.type = 'button'; remove.hidden = true;
  const removeLabel = el('span', 'นำรูปออก'), trash = el('span', '', 'teacher-photo-trash'); trash.setAttribute('aria-hidden', 'true');
  trash.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
  remove.append(trash, removeLabel);
  avatar.replaceWith(photoControls); picker.append(camera); photoControls.append(avatar, image, picker);
  const input = el('input'); input.type = 'file'; input.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'; input.hidden = true;
  const overlay = el('div', '', 'app-confirm-overlay teacher-photo-overlay'); overlay.hidden = true;
  const panel = el('section', '', 'app-confirm-modal teacher-photo-modal'); panel.hidden = true; panel.tabIndex = -1;
  panel.id = 'teacherPhotoDialog'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'teacherPhotoHeading'); panel.setAttribute('aria-describedby', 'teacherPhotoHint');
  const heading = el('div', '', 'teacher-photo-heading'), title = el('h2', 'จัดการรูปโปรไฟล์'); title.id = 'teacherPhotoHeading';
  const closeButton = el('button', '×', 'teacher-photo-close'); closeButton.type = 'button'; closeButton.setAttribute('aria-label', 'ปิดการจัดการรูปโปรไฟล์'); heading.append(title, closeButton);
  const currentPreview = el('img', '', 'teacher-photo-preview'); currentPreview.alt = 'รูปโปรไฟล์ปัจจุบัน'; currentPreview.hidden = true;
  const placeholder = el('span', '—', 'teacher-photo-placeholder'); placeholder.setAttribute('aria-label', 'ยังไม่มีรูปโปรไฟล์');
  const preview = el('img', '', 'teacher-photo-preview'); preview.alt = 'ตัวอย่างรูปโปรไฟล์ก่อนบันทึก'; preview.hidden = true;
  const hint = el('p', 'JPG / PNG / WebP ขนาดไม่เกิน 5 MB', 'teacher-account-hint'); hint.id = 'teacherPhotoHint'; picker.setAttribute('aria-describedby', hint.id);
  const message = el('p', '', 'teacher-account-message'); message.setAttribute('aria-live', 'polite');
  const previewArea = el('div', '', 'teacher-photo-preview-area'); previewArea.append(currentPreview, preview, placeholder);
  const loadingNote = el('p', 'กำลังโหลดรูปโปรไฟล์...', 'teacher-account-message'); loadingNote.setAttribute('role', 'status'); loadingNote.hidden = true;
  const actions = el('div', '', 'teacher-photo-actions');
  const change = el('button', 'เปลี่ยนรูป', 'teacher-button teacher-button--primary'); change.type = 'button';
  const save = el('button', 'บันทึกรูปภาพ', 'teacher-button teacher-button--primary'); save.type = 'button';
  const cancel = el('button', 'ยกเลิก', 'teacher-button'); cancel.type = 'button';
  const retry = el('button', 'ลองโหลดรูปอีกครั้ง', 'teacher-button'); retry.type = 'button'; retry.hidden = true;
  actions.append(change, save, remove, cancel); panel.append(heading, previewArea, hint, loadingNote, message, retry, actions, input); overlay.append(panel);
  let header = document.querySelector('.nav-right .teacher-user-icon');
  if (!header) { header = el('span'); document.querySelector('.nav-right .nav-user-info')?.before(header); }
  header.classList.add('teacher-profile-header-avatar'); header.setAttribute('aria-hidden', 'true');
  let file = null, previewUrl = null, currentUrl = null, ownedToken = null, profileId = null, initials = '—';
  let uploading = false, blocked = false, loading = false, unavailable = false, sequence = 0, failed = false, previewReady = false, expectImage = false;
  let confirming = false, deleting = false, closeDelete = null;
  const manager = mountContentModal({ document, overlay, panel, returnFocus: picker,
    canClose: () => !uploading && !confirming && !deleting,
    onClose: () => { discardPreview(); say(''); },
  });
  const current = (ticket, token) => ticket === sequence && !!token && token === getToken();
  function controls() {
    picker.disabled = blocked || uploading || confirming || deleting || !ownedToken;
    picker.setAttribute('aria-expanded', String(manager.isOpen));
    change.disabled = blocked || uploading || loading || confirming || deleting || unavailable || !ownedToken;
    change.hidden = !!file;
    remove.hidden = !currentUrl;
    remove.disabled = change.disabled || !!file || !currentUrl;
    removeLabel.textContent = deleting ? 'กำลังนำรูปออก...' : 'นำรูปออก';
    remove.classList.toggle('is-loading', deleting); remove.setAttribute('aria-busy', String(deleting));
    input.disabled = change.disabled; save.hidden = !file;
    cancel.disabled = blocked || uploading || confirming || deleting; save.disabled = cancel.disabled || !previewReady;
    closeButton.disabled = cancel.disabled;
    retry.hidden = !failed; retry.disabled = uploading || loading || confirming || deleting;
    save.textContent = uploading ? 'กำลังบันทึก...' : 'บันทึกรูปภาพ';
    save.classList.toggle('is-loading', uploading); save.setAttribute('aria-busy', String(uploading));
    picker.setAttribute('aria-busy', String(loading || uploading || deleting)); panel.setAttribute('aria-busy', String(loading || uploading || deleting));
    loadingNote.hidden = !loading; message.hidden = !message.textContent;
    currentPreview.hidden = !currentUrl || !!file; placeholder.hidden = !!currentUrl || !!file;
  }
  function say(text, error = false) {
    message.textContent = text; message.dataset.type = error ? 'error' : 'info'; message.setAttribute('role', error ? 'alert' : 'status');
    controls();
  }
  function renderImage(url) {
    image.hidden = !url; if (url) image.src = url; else image.removeAttribute('src');
    if (url) currentPreview.src = url; else currentPreview.removeAttribute('src');
    placeholder.textContent = initials;
    header.replaceChildren();
    if (url) { const photo = el('img'); photo.alt = ''; photo.src = url; header.append(photo); }
    else header.textContent = initials;
  }
  function discardPreview() {
    file = null; previewReady = false; input.value = ''; preview.hidden = true; preview.removeAttribute('src');
    if (previewUrl) target.URL.revokeObjectURL(previewUrl); previewUrl = null;
    onBusyChange(manager.isOpen); controls();
  }
  async function load() {
    if (uploading || file || confirming || deleting || !ownedToken || ownedToken !== getToken()) return;
    const token = ownedToken, ticket = ++sequence; loading = true; failed = false; controls();
    try {
      const blob = await request(`${path}/profile-image`, { auth: false, responseType: 'blob', headers: { Authorization: `Bearer ${token}` } });
      if (!current(ticket, token)) return;
      if (!(blob instanceof target.Blob) || !['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || !blob.size || blob.size > 5 * 1024 * 1024) throw Error('รูปโปรไฟล์ไม่ถูกต้อง');
      const url = target.URL.createObjectURL(blob), probe = el('img'); probe.src = url;
      try { await probe.decode(); } catch { target.URL.revokeObjectURL(url); throw Error('เปิดรูปโปรไฟล์ไม่ได้ กรุณาเปลี่ยนรูปภาพ'); }
      if (!current(ticket, token)) { target.URL.revokeObjectURL(url); return; }
      const oldUrl = currentUrl; currentUrl = url;
      renderImage(url); if (oldUrl) target.URL.revokeObjectURL(oldUrl); unavailable = false; expectImage = true; say(''); return true;
    } catch (error) {
      if (!current(ticket, token)) return;
      if (error.status === 404 && !expectImage) {
        if (currentUrl) target.URL.revokeObjectURL(currentUrl); currentUrl = null; renderImage(null); unavailable = false; say('');
      } else {
        failed = true; unavailable = error.status === 503;
        say(unavailable ? 'ส่วนจัดเก็บรูปโปรไฟล์ยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ' : error.message || 'โหลดรูปไม่สำเร็จ', true);
      }
      return false;
    } finally { if (ticket === sequence) { loading = false; controls(); } }
  }
  picker.addEventListener('click', () => { if (!picker.disabled) { manager.open(); onBusyChange(true); controls(); } });
  change.addEventListener('click', () => { if (!change.disabled) input.click(); });
  closeButton.addEventListener('click', () => manager.close());
  input.addEventListener('change', () => {
    if (change.disabled) return;
    const selected = input.files?.[0]; if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || !/\.(jpe?g|png|webp)$/i.test(selected.name) || selected.size < 1 || selected.size > 5 * 1024 * 1024) {
      input.value = ''; say('เลือกรูป JPG / PNG / WebP ขนาดไม่เกิน 5 MB', true); return;
    }
    if (previewUrl) target.URL.revokeObjectURL(previewUrl);
    file = selected; previewReady = false; previewUrl = target.URL.createObjectURL(file); preview.src = previewUrl; preview.hidden = false;
    failed = false; onBusyChange(true); say('ตรวจสอบตัวอย่างรูปก่อนบันทึก'); cancel.focus();
  });
  preview.addEventListener('load', () => { if (file) { previewReady = true; controls(); } });
  preview.addEventListener('error', () => { if (file && previewUrl) { discardPreview(); say('เปิดรูปที่เลือกไม่ได้ กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง', true); } });
  cancel.addEventListener('click', () => manager.close());
  save.addEventListener('click', async () => {
    if (!file || !previewReady || uploading || blocked || ownedToken !== getToken()) return;
    const token = ownedToken, ticket = ++sequence, selected = file;
    uploading = true; onBusyChange(true); say('กำลังบันทึกรูปภาพ...'); let saved = false;
    try {
      const body = new target.FormData(); body.append('profile_image', selected);
      const response = await request(`${path}/profile-image`, { method: 'POST', body, auth: false, headers: { Authorization: `Bearer ${token}` } });
      if (!current(ticket, token)) return;
      if (response?.success !== true || response.data?.saved !== true) throw Error('ยังยืนยันผลการบันทึกรูปไม่ได้');
      saved = true; expectImage = true; uploading = false; discardPreview(); const refreshed = await load();
      if (token !== getToken()) return;
      if (refreshed !== true) { failed = true; say('บันทึกรูปแล้ว แต่โหลดรูปใหม่ไม่สำเร็จ กรุณาลองโหลดรูปอีกครั้ง', true); }
      else { say('บันทึกรูปภาพสำเร็จ'); message.dataset.type = 'success'; toast('บันทึกรูปภาพสำเร็จ', 'success'); manager.close(); }
    } catch (error) {
      if (current(ticket, token)) { say(error.message || 'บันทึกรูปไม่สำเร็จ รูปเดิมยังคงอยู่', true); toast(message.textContent, 'error'); }
    } finally {
      if (token === ownedToken && token === getToken() && (saved || ticket === sequence)) { uploading = false; onBusyChange(!!file || manager.isOpen); controls(); }
    }
  });
  retry.addEventListener('click', load);
  remove.addEventListener('click', () => {
    if (remove.disabled || !currentUrl || ownedToken !== getToken()) return;
    const token = ownedToken, ticket = ++sequence; let removed = false;
    confirming = true; onBusyChange(true); controls();
    const close = showConfirmModal({ title: 'ลบรูปโปรไฟล์', message: 'ต้องการลบรูปโปรไฟล์หรือไม่?', variant: 'danger',
      confirmLabel: 'ลบรูปโปรไฟล์', loadingLabel: 'กำลังลบ...', returnFocus: remove, fallbackFocus: change, parentModal: manager,
      onClose: () => {
        closeDelete = null;
        if (current(ticket, token)) {
          confirming = false; deleting = false; onBusyChange(!!file || manager.isOpen); controls();
          if (removed) target.setTimeout(() => { if (current(ticket, token)) manager.close(); }, 0);
        } else target.setTimeout(() => manager.close(), 0);
      },
      onConfirm: async () => {
        if (!current(ticket, token)) throw Error('สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเริ่มใหม่');
        deleting = true; controls();
        try {
          const response = await request(`${path}/profile-image`, { method: 'DELETE', auth: false, headers: { Authorization: `Bearer ${token}` } });
          if (!current(ticket, token)) throw Error('สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเริ่มใหม่');
          if (response?.success !== true || response.data?.deleted !== true || response.data.profile_image !== null) throw Error('ยังยืนยันผลการลบรูปไม่ได้');
          const oldUrl = currentUrl; currentUrl = null; expectImage = false; failed = false; removed = true;
          renderImage(null); if (oldUrl) target.URL.revokeObjectURL(oldUrl);
          say('ลบรูปโปรไฟล์สำเร็จ'); message.dataset.type = 'success'; toast('ลบรูปโปรไฟล์สำเร็จ', 'success');
        } catch (error) {
          if (current(ticket, token)) say(error.message || 'ลบรูปไม่สำเร็จ รูปเดิมยังคงอยู่', true);
          else target.setTimeout(close, 0);
          throw error;
        } finally { if (current(ticket, token)) { deleting = false; controls(); } }
      },
    });
    closeDelete = close;
  });
  function clear() {
    ++sequence; uploading = false; loading = false; ownedToken = null; profileId = null; unavailable = false; failed = false; expectImage = false;
    confirming = false; deleting = false; closeDelete?.(); closeDelete = null;
    manager.close();
    discardPreview(); if (currentUrl) target.URL.revokeObjectURL(currentUrl); currentUrl = null; initials = '—'; renderImage(null); say('');
  }
  return { clear, isBusy: () => uploading || !!file || confirming || deleting || manager.isOpen,
    setBlocked(value) { blocked = value; controls(); },
    setProfile(profile, token) {
      if (profileId !== profile.id || ownedToken !== token) clear();
      profileId = profile.id; ownedToken = token;
      initials = [profile.first_name, profile.last_name].map(value => [...(value?.trim() || '')][0] || '').join('') || '—';
      renderImage(currentUrl); controls(); load();
    },
  };
}
