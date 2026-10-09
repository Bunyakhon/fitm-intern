import * as api from '../api/coopActivities.api.js';
import { getCurrentStaff } from '../api/staffDocuments.api.js';
import { showConfirmModal, showToast, setButtonLoading } from '../ui/feedback.js';
import { bangkokLocal, monthRange, calendarDays, node, renderActivity, statusLabels, activityDate } from './coopActivityView.js';
export function mountCoopActivities({ document, container, staff = false, services = api, confirm = showConfirmModal, toast = showToast, loading = setButtonLoading, storage = staff ? sessionStorage : localStorage } = {}) {
  if (!container) return;
  container.classList.add('activity-widget');
  container.innerHTML = `<div class="teacher-heading"><div><h2>ปฏิทินกิจกรรม</h2><p>กิจกรรมสหกิจศึกษา · วันเวลาประเทศไทย (Asia/Bangkok)</p></div><button id="activityRefresh" type="button" class="teacher-button">รีเฟรช</button></div>
    <form id="activityFilters" class="activity-filters"><label>ค้นหากิจกรรม<input id="activitySearch" maxlength="100"></label><label>ประเภท<select id="activityCategory"><option value="">ทุกประเภท</option><option value="orientation">ปฐมนิเทศ</option><option value="training">อบรม</option><option value="presentation">นำเสนอ</option><option value="other">อื่น ๆ</option></select></label><label>สถานะ<select id="activityStatus"><option value="">ทุกสถานะ</option>${staff ? '<option value="draft">ร่าง</option>' : ''}<option value="published">เผยแพร่</option><option value="canceled">ยกเลิก</option></select></label><label>รูปแบบ<select id="activityView"><option value="month">รายเดือน</option><option value="list">รายการตามเวลา</option></select></label><label id="activityMonthLabel">เดือน<input id="activityMonth" type="month" required></label><label id="activityFromLabel" hidden>รายการตั้งแต่<input id="activityFrom" type="date"></label><label id="activityToLabel" hidden>ถึงวันที่<input id="activityTo" type="date"></label><button class="teacher-button" type="submit">ค้นหา</button></form>
    <p id="activityMessage" role="status" aria-live="polite"></p><div id="activityResults"></div><div class="activity-paging"><button id="activityPrev" type="button">ก่อนหน้า</button><span id="activityPage"></span><button id="activityNext" type="button">ถัดไป</button></div>
    ${staff ? '<button id="activityNew" type="button" class="teacher-button">สร้างกิจกรรม</button>' : ''}
    <section id="activityDetail" hidden><button id="activityClose" type="button">ปิดรายละเอียด</button><div id="activityDetailBody"></div><div id="activityActions"></div><div id="activityHistory"></div></section>
    ${staff ? `<form id="activityForm" class="activity-form" hidden><h3 id="activityFormHeading">สร้างกิจกรรม</h3><p>รายละเอียด สถานที่ และลิงก์ประชุมจะปรากฏให้นักศึกษาเมื่อเผยแพร่</p><label>ชื่อกิจกรรม<input name="title" maxlength="200" required></label><label>รายละเอียด<textarea name="description" maxlength="10000" rows="3"></textarea></label><label>ประเภท<select name="category"><option value="orientation">ปฐมนิเทศ</option><option value="training">อบรม</option><option value="presentation">นำเสนอ</option><option value="other">อื่น ๆ</option></select></label><label>เริ่ม (Asia/Bangkok)<input name="starts_at" type="datetime-local" required></label><label>สิ้นสุด (Asia/Bangkok)<input name="ends_at" type="datetime-local" required></label><label>สถานที่<input name="location" maxlength="500"></label><label>ลิงก์ประชุม (https)<input name="meeting_url" type="url" maxlength="1000"></label><label>บันทึกภายในเจ้าหน้าที่<textarea name="internal_notes" maxlength="5000" rows="3"></textarea></label><label>สถานะ<select name="status"><option value="draft">ร่าง</option><option value="published">เผยแพร่</option></select></label><label id="activityReasonLabel" hidden>เหตุผลแก้ไข<textarea name="reason" maxlength="2000"></textarea></label><div><button id="activitySave" type="submit" class="teacher-button">บันทึกกิจกรรม</button><button id="activityDiscard" type="button">ปิดแบบฟอร์ม</button></div></form>` : ''}`;
  const get = id => container.querySelector(`#${id}`), tokenKey = staff ? 'staffToken' : 'token', token = storage.getItem(tokenKey), live = () => !!token && storage.getItem(tokenKey) === token;
  let busy = false, modal = false, offset = 0, total = 0, current = null, editing = null, creationKey = null, authorized = !staff;
  get('activityMonth').value = bangkokLocal(new Date()).slice(0,7);
  const say = message => { get('activityMessage').textContent = message; };
  function controls() { for (const el of container.querySelectorAll('button,input,select,textarea')) el.disabled = busy || modal || !live() || !authorized; get('activityPrev').disabled ||= offset === 0; get('activityNext').disabled ||= offset+20 >= total; }
  function handle(error) {
    if ([401,403].includes(error.status)) { authorized = false; get('activityResults').replaceChildren(); closeDetail(); get('activityDetailBody').replaceChildren(); get('activityHistory').replaceChildren(); if (staff) { get('activityForm').hidden = true; get('activityForm').reset(); } editing = null; creationKey = null; }
    say(error.message || 'โหลดกิจกรรมไม่สำเร็จ'); toast(error.message || 'ดำเนินการไม่สำเร็จ','error');
  }
  const button = (label, action) => { const el = node(document,'button',label,'teacher-button'); el.type = 'button'; el.addEventListener('click',action); return el; };
  function closeDetail() { current = null; get('activityDetail').hidden = true; get('activityActions').replaceChildren(); }
  async function refresh() {
    if (busy || modal || !live() || !authorized) return;
    busy = true; controls(); closeDetail(); get('activityResults').replaceChildren(); say('กำลังโหลดกิจกรรม...');
    const monthly = get('activityView').value === 'month';
    get('activityMonthLabel').hidden = !monthly; for (const id of ['activityFromLabel','activityToLabel']) get(id).hidden = monthly;
    try {
      const query = { search: get('activitySearch').value.trim(), category: get('activityCategory').value, status: get('activityStatus').value };
      if (monthly) Object.assign(query,monthRange(get('activityMonth').value));
      else { if (get('activityFrom').value) query.from = `${get('activityFrom').value}T00:00+07:00`; if (get('activityTo').value) { const next = new Date(`${get('activityTo').value}T00:00:00Z`); next.setUTCDate(next.getUTCDate()+1); query.to = `${next.toISOString().slice(0,10)}T00:00+07:00`; } }
      let result = await services.listActivities({ ...query, limit: monthly ? 200 : 20, offset: monthly ? 0 : offset },staff);
      if (!live()) return;
      if (!monthly && offset && !result.activities.length) { offset = Math.max(0, Math.floor((result.total-1)/20)*20); result = await services.listActivities({ ...query,limit:20,offset },staff); }
      const rows = [...result.activities]; total = result.total;
      if (monthly) { while (rows.length < total) { const page = await services.listActivities({ ...query,limit:200,offset:rows.length },staff); if (!live()) return; if (!page.activities.length) throw Error('ข้อมูลปฏิทินเปลี่ยนระหว่างโหลด กรุณารีเฟรช'); rows.push(...page.activities); } }
      if (!live()) return;
      const root = get('activityResults');
      if (monthly) {
        const grid = node(document,'div',undefined,'activity-grid');
        for (const label of ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.']) grid.append(node(document,'div',label,'activity-weekday'));
        const start = new Date(`${get('activityMonth').value}-01T00:00:00Z`).getUTCDay(); for (let i=0;i<start;i++) grid.append(node(document,'div',undefined,'activity-day activity-blank'));
        for (const day of calendarDays(get('activityMonth').value,rows)) { const cell = node(document,'div',undefined,'activity-day'); cell.append(node(document,'span',String(day.day))); for (const row of day.activities) { const label = `${row.title} · ${statusLabels[row.status]}`, el = button(label,() => detail(row.id)); el.title = label; el.setAttribute('aria-label',`${day.date} ${label}`); el.className = `activity-event activity-${row.status}`; cell.append(el); } grid.append(cell); }
        root.append(grid);
      } else for (const row of rows) { const card = node(document,'article',undefined,'activity-card'); renderActivity(card,row); card.append(button('รายละเอียด',() => detail(row.id))); root.append(card); }
      container.querySelector('.activity-paging').hidden = monthly; get('activityPage').textContent = `หน้า ${offset/20+1} · ${total} กิจกรรม`;
      say(rows.length ? `พบ ${total} กิจกรรม` : 'ยังไม่มีกิจกรรมตรงกับตัวกรอง');
    } catch (error) { handle(error); }
    finally { busy = false; controls(); }
  }
  async function detail(id) {
    if (busy || modal || !live()) return; busy = true; closeDetail(); controls(); say('กำลังโหลดรายละเอียด...');
    try {
      const data = await services.getActivity(id,staff); if (!live()) return; current = data.activity;
      const root = get('activityDetailBody'); root.replaceChildren(); renderActivity(root,current); get('activityHistory').replaceChildren();
      if (staff) {
        root.append(node(document,'p',`บันทึกภายใน: ${current.internal_notes || '-'}`));
        if (current.status !== 'canceled') get('activityActions').append(button('แก้ไขกิจกรรม',() => openForm(current)),button('ยกเลิกกิจกรรม',askCancel));
        for (const event of data.history) { const section = node(document,'details'), summary = node(document,'summary',`ฉบับ ${event.version} · ${event.actor_name} · ${event.action} · ${activityDate(event.created_at)}`); section.append(summary,node(document,'p',event.reason)); renderActivity(section,event.snapshot); section.append(node(document,'p',`บันทึกภายใน: ${event.snapshot.internal_notes || '-'}`)); get('activityHistory').append(section); }
      }
      get('activityDetail').hidden = false; say('โหลดรายละเอียดแล้ว');
    } catch(error) { handle(error); }
    finally { busy = false; controls(); }
  }
  function openForm(row = null) {
    if (!staff || busy || modal || !live()) return;
    editing = row; creationKey = row ? null : crypto.randomUUID(); const form = get('activityForm'); form.reset();
    for (const name of ['title','description','category','starts_at','ends_at','location','meeting_url','internal_notes','status']) { const el = form.elements.namedItem(name); el.value = row ? (name.endsWith('_at') ? bangkokLocal(row[name]) : row[name]) : (name === 'category' ? 'orientation' : name === 'status' ? 'draft' : ''); }
    const status = form.elements.namedItem('status'); status.querySelector('option[value="draft"]').hidden = !!row?.published_at;
    get('activityReasonLabel').hidden = !row; form.elements.namedItem('reason').required = !!row; get('activityFormHeading').textContent = row ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรม'; form.hidden = false;
  }
  function ask(operation, message) {
    if (busy || modal || !live()) return; modal = true; controls();
    confirm({ title: message, message: 'ตรวจสอบข้อมูลก่อนยืนยัน การดำเนินการนี้จะเก็บประวัติ', reasonLabel: operation === 'cancel' ? 'เหตุผลยกเลิก (บันทึกภายใน)' : '', onClose: () => { modal = false; controls(); }, onConfirm: async reason => {
      if (!live()) throw Error('กรุณาเข้าสู่ระบบใหม่'); busy = true; loading(get(staff ? 'activitySave' : 'activityRefresh'),true,'กำลังบันทึก...'); controls();
      try {
        let result;
        if (operation === 'cancel') result = await services.cancelActivity(current.id,{ version: current.version,reason });
        else { const form = get('activityForm'), body = {}; for (const name of ['title','description','category','starts_at','ends_at','location','meeting_url','internal_notes','status']) body[name] = form.elements.namedItem(name).value; for (const name of ['starts_at','ends_at']) body[name] += '+07:00';
          if (editing) { body.version = editing.version; body.reason = form.elements.namedItem('reason').value.trim(); result = await services.editActivity(editing.id,body); } else result = await services.createActivity({ ...body,creation_key: creationKey });
        }
        if (!live()) return; get('activityForm').hidden = true; editing = null; creationKey = null; toast('บันทึกกิจกรรมแล้ว','success'); busy = false; modal = false; await refresh(); await detail(result.activity.id);
      } catch(error) { handle(error); if (error.status === 409) say(`${error.message} · กดรีเฟรชและเปิดรายละเอียดล่าสุดก่อนแก้ไข`); throw error; }
      finally { busy = false; loading(get('activitySave'),false,'กำลังบันทึก...'); controls(); }
    } });
  }
  function askCancel() { ask('cancel','ยืนยันยกเลิกกิจกรรม'); }
  get('activityRefresh').addEventListener('click',refresh); get('activityFilters').addEventListener('submit',event => { event.preventDefault(); offset = 0; refresh(); });
  for (const id of ['activityView','activityMonth']) get(id).addEventListener('change',() => { offset=0; refresh(); });
  get('activityPrev').addEventListener('click',() => { offset -= 20; refresh(); }); get('activityNext').addEventListener('click',() => { offset += 20; refresh(); }); get('activityClose').addEventListener('click',closeDetail);
  if (staff) { get('activityNew').addEventListener('click',() => openForm()); get('activityDiscard').addEventListener('click',() => { get('activityForm').hidden=true; editing=null; creationKey=null; }); get('activityForm').addEventListener('submit',event => { event.preventDefault(); if (get('activityForm').reportValidity()) ask('save',editing ? 'ยืนยันแก้ไขกิจกรรม' : 'ยืนยันสร้างกิจกรรม'); }); }
  controls(); const ready = (async () => { if (!live()) { say('กรุณาเข้าสู่ระบบเพื่อดูปฏิทิน'); return; } if (staff) { try { const response = await (services.getCurrentStaff || getCurrentStaff)(); authorized = response.data?.is_active === true; } catch(error) { handle(error); } } await refresh(); })();
  return { ready,refresh,detail,openForm };
}
if (typeof document !== 'undefined' && document.body.dataset.workflowRole === 'department_staff') {
  mountCoopActivities({ document,container: document.getElementById('activityCalendar'),staff:true });
  function navigate() { const calendar = location.hash === '#activities'; document.getElementById('documents').hidden = calendar; document.getElementById('activities').hidden = !calendar; for (const link of document.querySelectorAll('.sidebar-menu a')) { const selected = link.hash === (calendar ? '#activities' : '#documents'); link.classList.toggle('active',selected); if (selected) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); } }
  window.addEventListener('hashchange',navigate); navigate();
}
