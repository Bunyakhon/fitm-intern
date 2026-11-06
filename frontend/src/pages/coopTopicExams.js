import { topicExamClient } from '../api/coopTopicExams.api.js';
import { showToast, showConfirmModal } from '../ui/feedback.js';
import { node, renderDetail, reviewLabels, examLabels, roleLabels, transitions, name, date, bangkokInput, bangkokISO } from './coopTopicExamView.js';
import '../styles/coop_topic_exams.css';

export function mountTopicExams({ document, container, role = 'student', client = topicExamClient(role), toast = showToast, confirm = showConfirmModal, view = null } = {}) {
  if (!container || container.dataset.co09Mounted) return;
  container.dataset.co09Mounted = 'true'; container.classList.add('co09-widget');
  const manager = role !== 'student', el = (tag, text, cls) => node(document, tag, text, cls);
  // A custom view belongs only to the student panel; manager markup remains unchanged.
  if (manager) view = null;
  container.innerHTML = view?.template || `<div class="co09-heading"><h2>การสอบหัวข้อโครงการสหกิจศึกษา (CO-09)</h2><button type="button" data-co09="refresh">โหลดข้อมูลล่าสุด / ลองใหม่</button></div>
    <p data-co09="message" role="status" aria-live="polite"></p>
    ${manager ? `<form data-co09="search"><label>ค้นหานักศึกษาจากรหัสหรือชื่อ<input name="search" maxlength="100" type="search"></label><button type="submit">ค้นหา</button></form><div data-co09="list" class="co09-list"></div><div class="co09-actions"><button data-co09="prev" type="button">ก่อนหน้า</button><span data-co09="page"></span><button data-co09="next" type="button">ถัดไป</button></div>` : ''}
    <section data-co09="workspace" ${manager ? 'hidden' : ''}><div data-co09="identity"></div><div data-co09="detail"></div><div data-co09="fileActions" class="co09-actions" hidden><button type="button" data-co09="preview">เปิดดู PDF</button><button type="button" data-co09="download">ดาวน์โหลด PDF</button></div>
    ${manager ? `<form data-co09="review"><fieldset><legend>ตรวจเอกสาร CO-09</legend><label>สถานะการตรวจ<select name="review_status"><option value="approved">ผ่านการตรวจ</option><option value="needs_revision">ต้องแก้ไข</option></select></label><label>เหตุผลให้แก้ไข<textarea name="review_reason" maxlength="2000" rows="2"></textarea></label><button type="submit">บันทึกผลตรวจ</button></fieldset></form>
    <form data-co09="schedule"><fieldset><legend>จัดตารางสอบหัวข้อโครงการ CO-09</legend><p>วันเวลา Asia/Bangkok · จำนวนกรรมการยังไม่มีข้อกำหนดยืนยันในระบบ</p><div class="co09-grid"><label>สถานะสอบ<select name="status"></select></label><label>วันสอบ<input name="day" type="date"></label><label>เวลาเริ่ม<input name="start" type="time"></label><label>เวลาสิ้นสุด<input name="end" type="time"></label><label>รูปแบบสอบ<select name="mode"><option value="onsite">On-site</option><option value="online">Online</option></select></label><label>ห้องสอบ / สถานที่<input name="location" maxlength="500"></label><label>Meeting URL (HTTPS)<input name="meeting_url" type="url" maxlength="2000"></label><label>เหตุผลเลื่อน / ยกเลิก<textarea name="reason" maxlength="2000" rows="2"></textarea></label><label class="co09-wide">หมายเหตุ<textarea name="notes" maxlength="5000" rows="2"></textarea></label></div><h4>กรรมการสอบ</h4><div data-co09="committee"></div><button data-co09="add" type="button">เพิ่มกรรมการ</button><div class="co09-actions"><button type="submit">บันทึกตารางสอบ</button><button data-co09="reloadDetail" type="button">โหลดรายละเอียดล่าสุด</button></div></fieldset></form><div data-co09="history"></div>` : `<form data-co09="upload"><fieldset><legend>CO-09 — ใบยื่นสอบหัวข้อโครงการสหกิจศึกษา</legend><label>เลือกไฟล์ PDF ขนาดไม่เกิน 10MB<input name="file" type="file" accept=".pdf,application/pdf" required></label><p>ไฟล์ใหม่บันทึกแยกจากไฟล์เดิม และเริ่มรอตรวจอีกครั้ง</p><button type="submit">อัปโหลด PDF</button></fieldset></form><form data-co09="url"><fieldset><legend>URL เอกสาร CO-09</legend><label>HTTPS URL<input name="document_url" type="url" maxlength="2000"></label><p>URL และ PDF บันทึกแยกกัน การบันทึก URL ไม่ถือว่าอัปโหลด PDF แล้ว</p><button type="submit">บันทึก URL</button></fieldset></form>`}</section>`;
  const get = key => container.querySelector(`[data-co09="${key}"]`), input = (form, key) => get(form).elements.namedItem(key);
  const documentControls = { files: get('fileActions'), upload: get('upload'), url: get('url') };
  let current = null, teachers = [], page = 1, hasNext = false, busy = false, dirty = false, conflict = false, serial = 0, session = client.getToken(), revoked = false;
  let previewUrl = null;
  const dirtyForms = new Set();
  const live = () => !revoked && !!session && client.getToken() === session;
  function clearPreview() { get('pdfPreview')?.remove(); if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null; }
  function wipe() { revoked = true; ++serial; current = null; clearPreview(); get('detail').replaceChildren(); get('identity').replaceChildren(); get('list')?.replaceChildren(); get('workspace').hidden = true; say('สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่', true); }
  function say(message, error = false) { get('message').textContent = message; get('message').setAttribute('role', error ? 'alert' : 'status'); }
  function controls() {
    container.setAttribute('aria-busy', String(busy));
    for (const control of container.querySelectorAll('button,input,select,textarea')) control.disabled = busy || !live();
    if (!current) for (const control of get('workspace').querySelectorAll('button,input,select,textarea')) control.disabled = true;
    if (manager) { get('prev').disabled ||= page === 1; get('next').disabled ||= !hasNext; if (current?.exam.status === 'completed') get('schedule').querySelector('fieldset').disabled = true; }
  }
  function failure(error) {
    if (!live() || error.data?.code === 'CO09_SESSION_CHANGED') { wipe(); return; }
    if (error.status === 409 || error.data?.code === 'CO09_COMMIT_UNCERTAIN') conflict = true;
    say(`${error.message || 'ดำเนินการไม่สำเร็จ'}${conflict ? ' ร่างยังคงอยู่ โปรดโหลดรายละเอียดล่าสุดเพื่อตรวจสอบก่อนบันทึกซ้ำ' : ''}`, true);
  }
  async function run(action) {
    if (busy || !live()) return;
    busy = true; view?.setBusy?.(container, true); controls(); say('กำลังดำเนินการ...');
    try { await action(); } catch (error) { failure(error); } finally { busy = false; view?.setBusy?.(container, false); controls(); }
  }
  const detailPath = () => manager ? `/manage/students/${current.student.id}` : '/me';
  function render(resetForm) {
    clearPreview(); const { documentCard } = (view?.renderDetail || renderDetail)(document, get('detail'), current);
    documentCard.append(documentControls.files);
    if (!manager) documentCard.append(documentControls.upload, documentControls.url);
    get('workspace').hidden = false;
    get('fileActions').hidden = !current.document.file;
    get('identity').replaceChildren(el('p', `${current.student.student_id} · ${name(current.student)} · ${current.student.major || '-'}`), el('p', `อาจารย์ที่ปรึกษาโครงการ: ${name(current.advisor)}`));
    if (!manager) { if (!dirtyForms.has('url')) input('url','document_url').value = current.document.document_url; return; }
    if (!dirtyForms.has('review') || resetForm === 'review') { input('review','review_status').value = current.document.review_status === 'needs_revision' ? 'needs_revision' : 'approved'; input('review','review_reason').value = current.document.review_reason || ''; }
    if (!dirtyForms.has('schedule') || resetForm === 'schedule') {
    const exam = current.exam, start = bangkokInput(exam.starts_at), end = bangkokInput(exam.ends_at), statuses = transitions[exam.status] || [];
    input('schedule','status').replaceChildren(...statuses.map(status => { const opt = el('option', examLabels[status]); opt.value = status; return opt; }));
    for (const [key, value] of Object.entries({ day: start.slice(0,10), start: start.slice(11), end: end.slice(11), mode: exam.mode || 'onsite', location: exam.location || '', meeting_url: exam.meeting_url || '', notes: exam.notes || '', reason: '' })) input('schedule',key).value = value;
    get('schedule').querySelector('fieldset').disabled = exam.status === 'completed';
    get('committee').replaceChildren(); for (const member of exam.committee) addCommittee(member);
    }
    get('history').replaceChildren(el('h4','ประวัติกำหนดการ'));
    for (const entry of current.exam.history || []) get('history').append(el('p', `ครั้งที่ ${entry.version} · ${examLabels[entry.snapshot.status]} · ${date(entry.snapshot.starts_at)} – ${date(entry.snapshot.ends_at)} · ${entry.snapshot.location || '-'} · ${entry.snapshot.reason || ''}`));
  }
  function addCommittee(member = {}) {
    const row = el('div', undefined, 'co09-committee-row'), teacherLabel = el('label','อาจารย์กรรมการ'), select = el('select'); select.required = true; select.dataset.teacher = 'true';
    const placeholder = el('option','เลือกอาจารย์'); placeholder.value = ''; select.append(placeholder);
    for (const teacher of teachers) { const option = el('option',name(teacher)); option.value = teacher.id; select.append(option); }
    if (member.teacher_id && !teachers.some(item => item.id === member.teacher_id)) { const old = el('option', `${name(member.teacher)} (ไม่พร้อมใช้งาน)`); old.value = member.teacher_id; select.append(old); }
    select.value = member.teacher_id || ''; teacherLabel.append(select);
    const roleLabel = el('label','บทบาท'), roles = el('select'); roles.dataset.role = 'true';
    for (const [key,label] of Object.entries(roleLabels)) { const option = el('option',label); option.value = key; roles.append(option); } roles.value = member.role || 'member'; roleLabel.append(roles);
    const remove = el('button','ลบกรรมการ'); remove.type = 'button'; remove.addEventListener('click', () => { row.remove(); dirty = true; dirtyForms.add('schedule'); }); row.append(teacherLabel,roleLabel,remove); get('committee').append(row);
  }
  async function readDetail(path) { const response = await client.call(path); if (!live()) return wipe(); current = response.data; conflict = false; dirty = false; dirtyForms.clear(); render(); say('โหลดข้อมูลล่าสุดแล้ว'); }
  async function mayReload(action) {
    if (!dirty && !conflict) return run(action);
    confirm({ title: 'โหลดข้อมูลล่าสุด', message: 'ร่างที่ยังไม่บันทึกจะถูกแทนที่ กรุณาตรวจสอบข้อมูลล่าสุดก่อนแก้ไขหรือบันทึกอีกครั้ง', confirmLabel: 'โหลดข้อมูลล่าสุด', onConfirm: () => run(action) });
  }
  async function refresh() {
    if (!manager) return readDetail('/me');
    const sequence = ++serial, result = await client.call(`/manage/students?page=${page}&search=${encodeURIComponent(input('search','search').value.trim())}`);
    if (!live() || sequence !== serial) return;
    hasNext = result.has_next; get('list').replaceChildren(); get('page').textContent = `หน้า ${page}`;
    for (const row of result.data) {
      const card = el('article',undefined,'co09-card'); card.append(el('h3',`${row.student.student_id} · ${name(row.student)}`), el('p',row.project?.topic || 'ยังไม่บันทึกหัวข้อ'), el('p',`${reviewLabels[row.document.review_status]} · ${examLabels[row.exam.status]}`), el('p',`${date(row.exam.starts_at)} – ${date(row.exam.ends_at)} · ${row.exam.location || '-'}`), el('p',row.exam.committee.map(member => `${name(member.teacher)} (${roleLabels[member.role]})`).join(', ') || 'ยังไม่ระบุกรรมการ'));
      const button = el('button','ดูรายละเอียด / จัดตาราง'); button.type = 'button'; button.addEventListener('click', () => mayReload(async () => { teachers = (await client.call('/manage/teachers')).data; await readDetail(`/manage/students/${row.student.id}`); get('workspace').scrollIntoView({ block: 'start' }); const heading = get('workspace').querySelector('h3'); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); } })); card.append(button); get('list').append(card);
    }
    say(result.data.length ? 'โหลดรายการแล้ว' : 'ยังไม่มีนักศึกษาตรงกับการค้นหา');
  }
  async function save(path, options, apply) {
    if (conflict) { say('โปรดโหลดรายละเอียดล่าสุดเพื่อตรวจสอบก่อนบันทึกซ้ำ', true); return; }
    const result = await client.call(path, options); if (!live()) return wipe();
    const savedForm = path.endsWith('/review') ? 'review' : path.endsWith('/schedule') ? 'schedule' : path.endsWith('document-url') ? 'url' : 'upload';
    apply(result.data); dirtyForms.delete(savedForm); dirty = dirtyForms.size > 0; conflict = false; render(savedForm); say('บันทึกสำเร็จ'); toast('บันทึก CO-09 สำเร็จ','success');
    if (manager) {
      // Refresh only the queue: keep unrelated review/schedule drafts in place.
      // A list-read failure cannot undo or misreport an acknowledged save.
      try { await refresh(); if (live()) say('บันทึกสำเร็จ'); }
      catch { if (!live()) wipe(); else say('บันทึกสำเร็จ แต่โหลดรายการล่าสุดไม่สำเร็จ กรุณาลองใหม่', true); }
    }
  }
  get('refresh').addEventListener('click', () => manager ? run(refresh) : mayReload(refresh));
  const markDirty = event => { dirty = true; const form = event.target.closest('form'); if (form) dirtyForms.add(form.dataset.co09); };
  get('workspace').addEventListener('input', markDirty); get('workspace').addEventListener('change', markDirty);
  for (const action of ['preview','download']) get(action).addEventListener('click', () => run(async () => {
    const result = await client.call(`${detailPath()}/document/${action}`, { responseType: 'blob' }); if (!live()) return wipe();
    clearPreview(); previewUrl = URL.createObjectURL(result);
    if (action === 'download') { const link = el('a'); link.href = previewUrl; link.download = current.document.file.original_name; link.click(); setTimeout(clearPreview, 1000); }
    else {
      const panel = el('section'), close = el('button','ปิด PDF'), frame = el('iframe'); panel.dataset.co09 = 'pdfPreview'; close.type = 'button'; close.addEventListener('click',clearPreview); frame.title = 'Protected Preview CO-09'; frame.src = previewUrl; panel.append(close,frame); get('fileActions').after(panel);
    }
    say('โหลด PDF แล้ว');
  }));
  if (manager) {
    get('search').addEventListener('submit', event => { event.preventDefault(); page = 1; run(refresh); });
    get('prev').addEventListener('click', () => { if (page > 1) { page--; run(refresh); } }); get('next').addEventListener('click', () => { if (hasNext) { page++; run(refresh); } });
    get('add').addEventListener('click', () => { addCommittee(); dirty = true; dirtyForms.add('schedule'); });
    get('reloadDetail').addEventListener('click', () => mayReload(() => readDetail(detailPath())));
    get('review').addEventListener('submit', event => { event.preventDefault(); run(() => save(`${detailPath()}/review`, { method: 'PUT', version: current.document.version, body: { review_status: input('review','review_status').value, review_reason: input('review','review_reason').value } }, data => { current.document = data; })); });
    get('schedule').addEventListener('submit', event => {
      event.preventDefault(); const field = key => input('schedule',key).value;
      const committee = [...get('committee').children].map(row => ({ teacher_id: row.querySelector('[data-teacher]').value, role: row.querySelector('[data-role]').value }));
      const body = { status: field('status'), starts_at: bangkokISO(field('day') && field('start') ? `${field('day')}T${field('start')}` : ''), ends_at: bangkokISO(field('day') && field('end') ? `${field('day')}T${field('end')}` : ''), mode: field('mode'), location: field('location'), meeting_url: field('meeting_url'), notes: field('notes'), reason: field('reason'), committee };
      run(() => save(`${detailPath()}/schedule`, { method: 'PUT', version: current.exam.version, body }, data => { current.exam = { ...data, history: [{ version: data.version, snapshot: data }, ...(current.exam.history || [])] }; }));
    });
  } else {
    get('upload').addEventListener('submit', event => { event.preventDefault(); run(async () => {
      const file = input('upload','file').files[0]; if (!file || file.type !== 'application/pdf' || !/\.pdf$/i.test(file.name) || file.size > 10 * 1024 * 1024) throw Error('รองรับ PDF เท่านั้น ขนาดไม่เกิน 10MB');
      const body = new FormData(); body.append('file',file);
      await save('/me/document', { method: 'POST', version: current.document.version, body }, data => { current.document = data; input('upload','file').value = ''; });
    }); });
    get('url').addEventListener('submit', event => { event.preventDefault(); run(() => save('/me/document-url', { method: 'PUT', version: current.document.version, body: { document_url: input('url','document_url').value } }, data => { current.document = data; })); });
  }
  const target = document.defaultView;
  target?.addEventListener('storage', () => { if (!live()) { wipe(); controls(); } });
  target?.addEventListener('pagehide',clearPreview);
  controls();
  return { refresh: () => run(refresh), ready: manager ? run(refresh) : Promise.resolve(), revoke: wipe };
}

if (typeof document !== 'undefined') {
  const staff = document.body.dataset.workflowRole === 'department_staff';
  if (staff || document.body.classList.contains('super-admin-page')) mountTopicExams({ document, container: document.getElementById('co09Manager'), role: staff ? 'staff' : 'admin' });
}
