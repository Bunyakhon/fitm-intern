import { getMyProjectLink, saveMyProjectLink } from '../api/studentCoop.api.js';
import { documentUrl } from '../validators/projectDocumentUrl.js';
import { showConfirmModal, showToast, setButtonLoading } from '../ui/feedback.js';

export function mountStudentProjectLinks({ document, getContext, isLive, onSessionError }) {
  let revoked = false;
  const states = [...document.querySelectorAll('form[data-project-link]')].map(form => ({
    form, category: form.dataset.projectLink, provider: form.dataset.projectLink === 'poster' ? 'drive' : 'overleaf',
    input: form.querySelector('input'), save: form.querySelector('[data-link-save]'),
    open: form.querySelector('[data-link-open]'),
    message: form.querySelector('[data-link-message]'), baseline: null, version: null,
    latest: null, loaded: false, busy: false, reading: false, needsReconcile: false, loadError: null, sequence: 0, promise: null,
  }));
  const live = context => !revoked && isLive(context);
  const accept = context => {
    if (live(context)) return true;
    onSessionError({ status: 401 }, context);
    return false;
  };
  const dirty = state => state.input.value !== (state.baseline ?? '');
  function say(state, text, type = 'info') {
    state.message.textContent = text;
    state.message.className = `message ${type}`;
    state.message.setAttribute('role', type === 'error' ? 'alert' : 'status');
  }
  function validateInput(state) {
    try {
      documentUrl(state.input.value, state.provider);
      state.input.setAttribute('aria-invalid', 'false');
      return '';
    } catch (error) {
      state.input.setAttribute('aria-invalid', 'true');
      return error.message;
    }
  }
  function draftFeedback(state) {
    const invalid = validateInput(state);
    const readiness = state.reading ? 'กำลังโหลดลิงก์ล่าสุด ร่างยังอยู่ กรุณารอก่อนบันทึก'
      : state.needsReconcile ? 'ร่างของคุณยังอยู่ กดบันทึกลิงก์เพื่อตรวจสอบข้อมูลล่าสุดก่อนบันทึก'
      : !state.loaded || state.loadError ? `${state.loadError || 'ยังไม่ได้โหลดข้อมูลลิงก์ล่าสุด'} ร่างยังอยู่ กดบันทึกลิงก์เพื่อลองโหลดข้อมูลอีกครั้ง โดยยังไม่ส่งบันทึก`
      : '';
    say(state, [invalid, readiness].filter(Boolean).join(' ') || (dirty(state) ? 'มีการแก้ไขลิงก์ที่ยังไม่บันทึก' : ''), invalid || state.loadError || state.needsReconcile ? 'error' : 'info');
  }
  function controls(state) {
    const validSession = live();
    state.input.disabled = !validSession || state.busy;
    state.save.disabled = !validSession || state.busy || state.reading;
    state.form.setAttribute('aria-busy', String(state.busy || state.reading));
    state.open.hidden = true;
    state.open.removeAttribute('href');
    if (validSession && state.baseline) {
      try {
        state.open.href = documentUrl(state.baseline, state.provider);
        state.open.hidden = false;
      } catch { /* Keep invalid data readable as text; never make it clickable. */ }
    }
  }
  function errorText(error) {
    const codes = {
      PROJECT_LINKS_SCHEMA_NOT_READY: 'บริการบันทึกลิงก์ยังไม่พร้อม กรุณาติดต่อผู้ดูแล',
      PROJECT_LINK_CONFLICT: 'ลิงก์เปลี่ยนแล้ว ร่างของคุณยังอยู่ กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก',
      PROJECT_LINK_REVISION_REQUIRED: 'กรุณาโหลดลิงก์ล่าสุดก่อนบันทึก',
      PROJECT_LINK_COMMIT_UNCERTAIN: 'ยังยืนยันผลบันทึกลิงก์ไม่ได้ ร่างยังอยู่ กรุณาโหลดข้อมูลล่าสุดก่อนลองใหม่',
      PROJECT_LINK_RESPONSE_INVALID: 'ยังยืนยันข้อมูลลิงก์ที่ได้รับไม่ได้ กรุณาโหลดข้อมูลล่าสุดก่อนลองใหม่',
    };
    if (error.data?.code === 'PROJECT_URL_INVALID' && typeof error.message === 'string') return error.message;
    return codes[error.data?.code] || ({ 400: 'ข้อมูลลิงก์ไม่ถูกต้อง', 403: 'ไม่มีสิทธิ์บันทึกลิงก์นี้', 404: 'ไม่พบข้อมูลลิงก์', 409: 'ข้อมูลลิงก์เปลี่ยนแล้ว กรุณาโหลดล่าสุด', 500: 'ระบบเกิดข้อผิดพลาด กรุณาลองโหลดข้อมูลล่าสุด', 503: 'บริการลิงก์ยังไม่พร้อม กรุณาลองใหม่ภายหลัง' })[error.status] || 'การเชื่อมต่อขัดข้องหรือหมดเวลา ร่างลิงก์ยังคงอยู่';
  }
  function response(result, state) {
    const link = result?.link;
    if (!link || link.category !== state.category || typeof link.document_url !== 'string'
      || !Number.isSafeInteger(link.version) || link.version < 0) {
      throw Object.assign(Error('ยังยืนยันข้อมูลลิงก์ที่ได้รับไม่ได้'), { status: 503, data: { code: 'PROJECT_LINK_RESPONSE_INVALID' } });
    }
    return link;
  }
  function read(state, { replaceDraft = false } = {}) {
    if (state.promise) return state.promise;
    const context = getContext();
    if (!context || !live(context) || state.busy) return Promise.resolve(false);
    const sequence = ++state.sequence, before = state.input.value, hadDraft = dirty(state) || state.needsReconcile;
    state.reading = true;
    state.loadError = null;
    say(state, 'กำลังโหลดลิงก์...');
    state.promise = (async () => {
      try {
        const result = await getMyProjectLink(state.category, { sessionToken: context.token });
        if (!accept(context) || sequence !== state.sequence) return false;
        const link = response(result, state);
        state.latest = link;
        const keepDraft = (!replaceDraft && hadDraft) || state.input.value !== before;
        if (!keepDraft) {
          state.input.value = state.baseline = link.document_url;
          state.version = link.version;
          state.needsReconcile = false;
        } else if (state.baseline === null) {
          state.baseline = link.document_url;
          state.version = link.version;
        } else if (state.version !== link.version) state.needsReconcile = true;
        else state.needsReconcile = false;
        state.loaded = true;
        const invalid = validateInput(state);
        say(state, [invalid, state.needsReconcile ? 'ลิงก์เปลี่ยนแล้ว ร่างยังอยู่ กดบันทึกลิงก์เพื่อตรวจสอบข้อมูลล่าสุดก่อน' : ''].filter(Boolean).join(' ') || (keepDraft ? 'โหลดข้อมูลล่าสุดแล้ว ร่างลิงก์ยังอยู่ กดบันทึกลิงก์เมื่อต้องการบันทึก' : link.document_url ? 'โหลดลิงก์ที่บันทึกแล้ว' : 'ยังไม่ได้บันทึกลิงก์'), invalid || state.needsReconcile ? 'error' : 'info');
        return true;
      } catch (error) {
        if (onSessionError(error, context) || !live(context)) return false;
        state.loadError = errorText(error);
        say(state, `${state.loadError} ร่างลิงก์ยังอยู่ กดบันทึกลิงก์เพื่อลองโหลดข้อมูลอีกครั้ง โดยยังไม่ส่งบันทึก`, 'error');
        return false;
      } finally {
        if (live(context) && sequence === state.sequence) {
          state.reading = false; state.promise = null; controls(state);
        }
      }
    })();
    controls(state);
    return state.promise;
  }
  function reconcile(state) {
    const context = getContext();
    if (!context || !live(context) || state.busy || state.reading) return;
    // With no acknowledged baseline, retry the GET while keeping the draft.
    if (!state.loaded) return read(state);
    const action = () => live(context) && read(state, { replaceDraft: true });
    if (dirty(state) || state.needsReconcile) showConfirmModal({ title: 'โหลดลิงก์ล่าสุด?', message: 'ร่างลิงก์ที่ยังไม่บันทึกจะถูกแทนที่ด้วยข้อมูลล่าสุด ยกเลิกเพื่อเก็บร่างไว้ก่อน', confirmLabel: 'แทนร่างและโหลดล่าสุด', onConfirm: action });
    else action();
  }
  async function save(state) {
    const context = getContext();
    if (!context || !live(context) || state.busy || state.reading) return;
    // The existing save button also recovers reads; never PUT in this click.
    if (!state.loaded || state.loadError) { await read(state); return; }
    if (state.needsReconcile) { reconcile(state); return; }
    let url;
    try { url = documentUrl(state.input.value, state.provider); }
    catch (error) { state.input.setAttribute('aria-invalid', 'true'); say(state, error.message, 'error'); state.input.focus(); return; }
    state.input.setAttribute('aria-invalid', 'false');
    state.busy = true;
    setButtonLoading(state.save, true, 'กำลังบันทึก...');
    controls(state);
    try {
      const result = await saveMyProjectLink(state.category, url, state.version, { sessionToken: context.token });
      if (!accept(context)) return;
      const link = response(result, state);
      state.baseline = state.input.value = link.document_url;
      state.version = link.version;
      state.latest = link;
      state.needsReconcile = false;
      state.loadError = null;
      say(state, 'บันทึกลิงก์สำเร็จ', 'success');
      showToast('บันทึกลิงก์สำเร็จ', 'success');
    } catch (error) {
      if (onSessionError(error, context) || !live(context)) return;
      state.needsReconcile = [409, 428].includes(error.status) || !error.status || error.status >= 500;
      say(state, `${errorText(error)}${state.needsReconcile ? ' กดบันทึกลิงก์เพื่อตรวจสอบข้อมูลล่าสุดก่อน โดยยังไม่ส่งบันทึกซ้ำ' : ''}`, 'error');
      // No automatic overwrite/retry after a conflict or uncertain write.
    } finally {
      if (live(context)) { state.busy = false; setButtonLoading(state.save, false); controls(state); }
    }
  }
  for (const state of states) {
    state.message.id = `${state.input.id}Message`;
    state.input.setAttribute('aria-describedby', [state.input.getAttribute('aria-describedby'), state.message.id].filter(Boolean).join(' '));
    state.form.addEventListener('submit', event => { event.preventDefault(); save(state); });
    state.input.addEventListener('input', () => { draftFeedback(state); controls(state); });
    state.open.addEventListener('click', event => { if (!live()) event.preventDefault(); });
    controls(state);
  }
  return {
    load: () => Promise.all(states.map(state => read(state))),
    hasChanges: () => !revoked && states.some(dirty),
    revoke() {
      revoked = true;
      for (const state of states) {
        ++state.sequence; state.promise = null;
        state.baseline = state.latest = state.version = null;
        state.loaded = state.busy = state.reading = state.needsReconcile = false;
        state.loadError = null;
        state.input.value = '';
        state.input.removeAttribute('aria-invalid');
        setButtonLoading(state.save, false);
        say(state, 'สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่', 'error');
        controls(state);
      }
    },
  };
}
