import * as api from '../api/supervision.api.js';
import { showToast, showConfirmModal, setButtonLoading } from '../ui/feedback.js';
import { element } from './supervisionView.js';
export function mountSupervisionResult({ document, container, appointment, studentId = null, services = api, confirm = showConfirmModal, toast = showToast, loading = setButtonLoading, onAuthError = () => {}, onSaved = () => {} }) {
  const teacher = !!studentId, root = element(document, 'section', '', 'supervision-result'); container.append(root);
  const open = element(document, 'button', `ผลนิเทศครั้งที่ ${appointment.visit_number}`, 'teacher-button'); open.type = 'button'; open.dataset.resultVisit = String(appointment.visit_number); root.append(open);
  const panel = element(document, 'div'), message = element(document, 'p', '', 'supervision-result-message'); panel.hidden = true; root.append(panel); panel.append(message);
  let current = null, busy = false, modal = false, disposed = false, dirty = false, generation = 0;
  const urls = new Set(), fields = {}, inputs = {}, previews = {}, savedPreviews = [];
  const say = text => { message.textContent = text; };
  const form = document.createElement('form'), fieldset = document.createElement('fieldset'), history = element(document, 'div', '', 'supervision-result-history'); form.append(fieldset);
  if (teacher) {
    fieldset.append(element(document, 'p', 'บันทึกเชิงบรรยาย ไม่ใช่แบบประเมินคะแนนอย่างเป็นทางการ · ต้องบันทึกฉบับร่างและตรวจทานก่อนยืนยันเสร็จสมบูรณ์'));
    for (const [key, title] of [['visited_on','วันที่นิเทศจริง'],['summary','ผลการนิเทศ / สิ่งที่พบ'],['issues','ปัญหาและอุปสรรค'],['recommendations','ข้อเสนอแนะ / การติดตาม']]) {
      const label = element(document, 'label', title); const input = document.createElement(key === 'visited_on' ? 'input' : 'textarea'); input.id = `result_${appointment.visit_number}_${key}`;
      if (key === 'visited_on') input.type = 'date'; else { input.maxLength = 5000; input.rows = 4; }
      label.append(input); fieldset.append(label); fields[key] = input; input.addEventListener('input', () => { dirty = true; controls(); });
    }
    for (const slot of [1,2]) {
      const label = element(document, 'label', `ภาพหลักฐาน ${slot} · PNG / JPEG สูงสุด 5 MB`), input = document.createElement('input'), preview = document.createElement('img'); input.type = 'file'; input.accept = '.png,.jpg,.jpeg'; input.id = `result_${appointment.visit_number}_image_${slot}`; preview.alt = `ตัวอย่างภาพหลักฐาน ${slot}`; preview.hidden = true;
      input.addEventListener('change', () => {
        const file = input.files?.[0]; if (!file) return;
        if (!['image/png','image/jpeg'].includes(file.type) || !/\.(png|jpe?g)$/i.test(file.name) || file.size < 1 || file.size > 5 * 1024 * 1024) { input.value = ''; say('รองรับ PNG / JPEG สูงสุดภาพละ 5 MB'); return; }
        if (preview.dataset.localUrl) { URL.revokeObjectURL(preview.dataset.localUrl); urls.delete(preview.dataset.localUrl); }
        const url = URL.createObjectURL(file); urls.add(url); preview.dataset.localUrl = url; preview.src = url; preview.hidden = false; dirty = true; controls(); say('ภาพนี้ยังไม่บันทึก กรุณาบันทึกฉบับร่าง');
      });
      label.append(input, preview); fieldset.append(label); inputs[slot] = input; previews[slot] = preview;
    }
    panel.append(form);
  }
  const readback = element(document, 'div', '', 'supervision-result-readback'); panel.append(readback);
  const actions = element(document, 'div', '', 'supervision-actions'), save = element(document, 'button', 'บันทึกฉบับร่าง', 'teacher-button'), complete = element(document, 'button', 'ยืนยันผลเสร็จสมบูรณ์', 'teacher-button'), reload = element(document, 'button', 'โหลดผลล่าสุด', 'teacher-button'); save.type = 'submit'; complete.type = reload.type = 'button';
  if (teacher) { form.append(save); actions.append(complete); } actions.append(reload); panel.append(actions, history);
  function controls() { open.disabled = busy || modal; reload.disabled = busy || modal; fieldset.disabled = busy || modal || !current || current.result?.status === 'completed'; save.disabled = fieldset.disabled; complete.disabled = busy || modal || dirty || !current?.result || current.result.status !== 'draft'; }
  function clearUrls() { for (const url of urls) URL.revokeObjectURL(url); urls.clear(); }
  async function showImage(parent, id, caption, ticket) {
    if (!id) return;
    const wrapper = element(document, 'figure'), image = document.createElement('img'); image.alt = caption; wrapper.append(image, element(document, 'figcaption', caption)); parent.append(wrapper);
    try { const blob = await services.getSupervisionImage(studentId, appointment, id); if (disposed || ticket !== generation) return; const url = URL.createObjectURL(blob); urls.add(url); image.src = url; }
    catch (error) { if (!disposed && ticket === generation) { image.remove(); wrapper.append(element(document, 'p', error.message)); if ([401,403].includes(error.status)) { panel.hidden = true; clearUrls(); onAuthError(error); } } }
  }
  function render(data) {
    current = data; dirty = false; clearUrls(); const ticket = ++generation; readback.replaceChildren(); history.replaceChildren(); savedPreviews.length = 0;
    const row = data.result;
    form.hidden = row?.status === 'completed';
    for (const key of Object.keys(fields)) fields[key].value = row?.[key] || '';
    for (const slot of [1,2]) { if (inputs[slot]) inputs[slot].value = ''; if (previews[slot]) { previews[slot].hidden = true; previews[slot].removeAttribute('src'); delete previews[slot].dataset.localUrl; } }
    say(row ? `ผลนิเทศครั้งที่ ${appointment.visit_number} · ${row.status === 'completed' ? 'เสร็จสมบูรณ์ (อ่านอย่างเดียว)' : 'ฉบับร่าง'} · ฉบับ ${row.version}` : teacher ? 'ยังไม่มีผลนิเทศ บันทึกฉบับร่างที่ยังไม่ครบได้' : 'ยังไม่มีผลนิเทศที่เสร็จสมบูรณ์');
    if (row) {
      readback.append(element(document, 'p', `ผู้บันทึก: ${row.snapshot.appointment.snapshot.teacher.name} · บันทึกล่าสุด ${new Date(row.updated_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`));
      for (const [key,title] of [['visited_on','วันที่นิเทศจริง'],['summary','ผลการนิเทศ'],['issues','ปัญหาและอุปสรรค'],['recommendations','ข้อเสนอแนะ']]) readback.append(element(document, 'p', `${title}: ${row[key] || '-'}`));
      for (const slot of [1,2]) savedPreviews.push(showImage(readback, row[`image_${slot}_id`], `ภาพหลักฐาน ${slot} ที่บันทึกแล้ว`, ticket));
      if (teacher) onSaved(row);
    }
    for (const revision of data.history) {
      const details = document.createElement('details'); details.append(element(document, 'summary', `ฉบับ ${revision.version} · ${revision.actor_name} · ${new Date(revision.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`));
      for (const [key,title] of [['visited_on','วันที่นิเทศจริง'],['summary','ผลการนิเทศ'],['issues','ปัญหาและอุปสรรค'],['recommendations','ข้อเสนอแนะ']]) details.append(element(document, 'p', `${title}: ${revision.snapshot[key] || '-'}`));
      details.append(element(document, 'p', revision.snapshot.status === 'completed' ? 'เสร็จสมบูรณ์' : 'ฉบับร่าง'));
      let loaded = false; details.addEventListener('toggle', () => { if (details.open && !loaded) { loaded = true; for (const slot of [1,2]) showImage(details, revision.snapshot[`image_${slot}_id`], `หลักฐานฉบับ ${revision.version} ภาพ ${slot}`, ticket); } }); history.append(details);
    }
    controls();
  }
  function failure(error) { say(error.message); toast(error.message, 'error'); if ([401,403].includes(error.status)) { panel.hidden = true; clearUrls(); onAuthError(error); } }
  async function load() {
    if (busy || modal || disposed) return; busy = true; controls(); panel.hidden = false; say('กำลังโหลดผลนิเทศ...');
    try { const data = await services.getSupervisionResult(studentId, appointment); if (!disposed) render(data); }
    catch (error) { if (!disposed) { current = null; failure(error); } } finally { busy = false; controls(); }
  }
  async function saveDraft(event) {
    event.preventDefault(); if (busy || modal || disposed || current?.result?.status === 'completed' || !current) return;
    const body = new FormData(); body.append('version', current.result?.version || 0); body.append('appointment_version', appointment.version);
    for (const key of Object.keys(fields)) body.append(key, fields[key].value);
    for (const slot of [1,2]) if (inputs[slot].files?.[0]) body.append(`image_${slot}`, inputs[slot].files[0]);
    busy = true; controls(); loading(save, true, 'กำลังบันทึก...');
    try { const data = await services.saveSupervisionResult(studentId, appointment, body); if (!disposed) { render(data); toast('บันทึกฉบับร่างแล้ว', 'success'); } }
    catch (error) { if (!disposed) { if (error.status === 409) { try { render(await services.getSupervisionResult(studentId, appointment)); } catch { /* Original failure stays visible. */ } } failure(error); } }
    finally { busy = false; loading(save, false, 'กำลังบันทึก...', 'บันทึกฉบับร่าง'); controls(); }
  }
  complete.addEventListener('click', () => {
    if (complete.disabled || busy || modal || disposed) return;
    const row = current.result;
    if (!row.summary.trim() || !row.visited_on || !row.image_1_id || !row.image_2_id) { say('ต้องมีวันที่นิเทศ ผลนิเทศ และภาพหลักฐานสองภาพที่บันทึกแล้ว'); return; }
    modal = true; controls(); confirm({ title: `ยืนยันผลนิเทศครั้งที่ ${appointment.visit_number}`, message: 'กรุณาตรวจทานข้อความและภาพสองภาพที่บันทึกแล้ว ผลเสร็จสมบูรณ์จะแก้ไขไม่ได้', confirmLabel: 'ยืนยันเสร็จสมบูรณ์', onClose: () => { modal = false; controls(); }, onConfirm: async () => {
      if (busy || disposed) return; busy = true; controls();
      try { const data = await services.completeSupervisionResult(studentId, appointment, row.version); if (!disposed) { render(data); toast('ผลนิเทศเสร็จสมบูรณ์แล้ว', 'success'); } }
      catch (error) { if (!disposed) { if (error.status === 409) { try { render(await services.getSupervisionResult(studentId, appointment)); } catch { /* Keep original failure. */ } } failure(error); } }
      finally { busy = false; controls(); }
    } });
  });
  form.addEventListener('submit', saveDraft); open.addEventListener('click', load); reload.addEventListener('click', load); controls();
  return { load, dispose() { disposed = true; ++generation; clearUrls(); root.remove(); }, imagesReady: () => Promise.all(savedPreviews) };
}
