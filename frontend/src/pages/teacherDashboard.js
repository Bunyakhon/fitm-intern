import { getCurrentTeacher, getTeacherAdvisorRequests, getTeacherCoopRequests } from '../api/teacherProjectAdvisor.api.js';
import { listSupervisionStudents } from '../api/supervision.api.js';
import { getRoleToken } from '../auth/roleAuthStorage.js';

// Bounded, read-only overview. It never walks student details to build a calendar.
const QUEUE_LIMIT = 6;
const VISIBLE_TASKS = 5;
const STUDENT_LIMIT = 26; // The existing supervision client requests one page.

export function mountTeacherDashboard({ document, target = window, me = getCurrentTeacher, students = listSupervisionStudents, requests = getTeacherCoopRequests, advisors = getTeacherAdvisorRequests, getToken = () => getRoleToken('teacher') } = {}) {
  const $ = id => document.getElementById(id), root = $('teacherOverview');
  if (!root || document.body.dataset.workflowRole !== 'teacher') return;
  const message = $('teacherOverviewMessage');
  const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'teacher-button'; retry.textContent = 'ลองโหลดอีกครั้ง'; retry.hidden = true;
  retry.addEventListener('click', refresh); message.after(retry);
  let busy = false, serial = 0, loadedToken = null;
  const el = (tag, text, className) => {
    const node = document.createElement(tag); node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function say(text, error = false) {
    message.textContent = text; message.dataset.type = error ? 'error' : 'info';
    message.setAttribute('role', error ? 'alert' : 'status');
  }
  function metric(id, text, noteId, note, state) {
    $(id).textContent = text; $(noteId).textContent = note;
    const card = $(id).closest('.teacher-summary-card');
    card.dataset.state = state; card.setAttribute('aria-busy', String(state === 'loading'));
  }
  function queueState(id, text, { error = false, pending = false, retry = false } = {}) {
    const list = $(id); list.replaceChildren(el('p', text, 'teacher-queue-state'));
    list.setAttribute('aria-busy', String(pending)); list.dataset.state = error ? 'error' : pending ? 'loading' : 'empty';
    if (!error && !pending) {
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'aria-hidden': 'true', focusable: 'false', class: 'teacher-queue-icon' })) icon.setAttribute(key, value);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'M9 5H5v16h14V5h-4M9 3h6v4H9zM8 13l2 2 5-5'); icon.append(path); list.prepend(icon);
    }
    if (retry) {
      const button = el('button', 'ลองโหลดอีกครั้ง', 'teacher-button'); button.type = 'button';
      button.addEventListener('click', refresh); list.append(button);
    }
  }
  function unavailableSession() {
    retry.hidden = true;
    $('teacherWelcomeName').textContent = 'กรุณาเข้าสู่ระบบอีกครั้ง';
    $('teacherOverviewSignIn').hidden = false;
    metric('teacherStudentMetric', 'โหลดไม่ได้', 'teacherStudentMetricNote', 'กรุณาเข้าสู่ระบบอีกครั้ง', 'error');
    metric('teacherPendingMetric', 'โหลดไม่ได้', 'teacherPendingMetricNote', 'กรุณาเข้าสู่ระบบอีกครั้ง', 'error');
    for (const id of ['teacherCoopTasks', 'teacherAdvisorTasks']) queueState(id, 'สถานะเข้าสู่ระบบไม่พร้อม กรุณาเข้าสู่ระบบอีกครั้ง', { error: true });
    say('ไม่สามารถอ่านภาพรวมด้วยเซสชันนี้ได้ กรุณาเข้าสู่ระบบอีกครั้ง', true);
  }
  function renderTasks(id, rows, kind) {
    if (!rows.length) { queueState(id, kind === 'coop' ? 'ยังไม่มีคำร้องสหกิจศึกษาที่รอคุณพิจารณา' : 'ยังไม่มีคำขอเป็นที่ปรึกษาที่รอพิจารณา'); return; }
    const list = $(id); list.replaceChildren(); list.dataset.state = 'ready'; list.setAttribute('aria-busy', 'false');
    for (const row of rows.slice(0, VISIBLE_TASKS)) {
      const name = [row.student?.first_name, row.student?.last_name].filter(Boolean).join(' ') || 'ไม่ระบุชื่อ';
      const item = el('article', '', 'teacher-task-item'), body = el('div', '', 'teacher-task-content');
      const heading = el('div', '', 'teacher-task-heading');
      heading.append(el('h4', name), el('span', kind === 'coop' ? 'รอพิจารณาคำร้อง' : 'รอยืนยันที่ปรึกษา', 'teacher-task-status'));
      body.append(heading, el('p', `รหัสนักศึกษา ${row.student?.student_id || 'ยังไม่ระบุ'}`));
      body.append(el('p', kind === 'coop' ? row.company_name || 'ยังไม่ระบุสถานประกอบการ' : row.topic || 'ยังไม่ระบุหัวข้อโครงการ', 'teacher-task-description'));
      const link = el('a', kind === 'coop' ? 'เปิดคำร้อง' : 'เปิดคำขอ', 'teacher-button');
      link.href = kind === 'coop' ? '#coopApprovals' : '#advisorRequests'; link.setAttribute('data-teacher-view', '');
      link.setAttribute('aria-label', `${kind === 'coop' ? 'เปิดคำร้องสหกิจศึกษา' : 'เปิดคำขอเป็นที่ปรึกษา'}ของ ${name}`);
      item.append(body, link); list.append(item);
    }
    const more = el('a', 'ดูรายการในหมวดนี้ทั้งหมด →', 'teacher-queue-more');
    more.href = kind === 'coop' ? '#coopApprovals' : '#advisorRequests'; more.setAttribute('data-teacher-view', ''); list.append(more);
  }
  function validRows(value, expectedStatus) {
    if (!Array.isArray(value) || value.some(row => !row?.id || row.status !== expectedStatus)) throw Error('Invalid overview response');
    return value;
  }
  async function refresh() {
    if (busy) return;
    const token = getToken();
    if (!token) { unavailableSession(); return; }
    busy = true; loadedToken = token; const ticket = ++serial;
    root.setAttribute('aria-busy', 'true'); $('teacherOverviewSignIn').hidden = true;
    retry.hidden = true; say('กำลังโหลดภาพรวมงานของคุณ...');
    metric('teacherStudentMetric', 'กำลังโหลด...', 'teacherStudentMetricNote', 'ที่ปรึกษาโครงการ / อาจารย์นิเทศ', 'loading');
    metric('teacherPendingMetric', 'กำลังโหลด...', 'teacherPendingMetricNote', 'คำร้องสหกิจและคำขอเป็นที่ปรึกษา', 'loading');
    queueState('teacherCoopTasks', 'กำลังโหลดคำร้อง...', { pending: true });
    queueState('teacherAdvisorTasks', 'กำลังโหลดคำขอ...', { pending: true });
    try {
      const result = await Promise.allSettled([
        me(), students(0), requests({ status: 'advisor_review', offset: 0, limit: QUEUE_LIMIT }),
        advisors({ status: 'pending', offset: 0, limit: QUEUE_LIMIT }),
      ]);
      if (ticket !== serial || getToken() !== token) return;
      if (result.some(item => item.status === 'rejected' && [401, 403].includes(item.reason?.status))) { unavailableSession(); return; }
      let errors = 0;
      try {
        if (result[0].status !== 'fulfilled' || !result[0].value?.success || !result[0].value.data?.id) throw Error('Account unavailable');
        const teacher = result[0].value.data;
        $('teacherWelcomeName').textContent = [teacher.academic_title, teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || 'อาจารย์';
      } catch { ++errors; $('teacherWelcomeName').textContent = 'โหลดข้อมูลบัญชีไม่สำเร็จ'; }
      try {
        if (result[1].status !== 'fulfilled' || !Array.isArray(result[1].value?.students)) throw Error('Students unavailable');
        const count = result[1].value.students.length, partial = count >= STUDENT_LIMIT;
        metric('teacherStudentMetric', count ? `อย่างน้อย ${count} คน` : 'ยังไม่มีนักศึกษา', 'teacherStudentMetricNote', partial ? 'รายชื่อบางส่วน · ที่ปรึกษาโครงการ / อาจารย์นิเทศ' : 'จากรายชื่อที่โหลด · ที่ปรึกษาโครงการ / อาจารย์นิเทศ', count ? 'ready' : 'empty');
      } catch { ++errors; metric('teacherStudentMetric', 'โหลดไม่ได้', 'teacherStudentMetricNote', 'กรุณากดลองโหลดอีกครั้ง', 'error'); }
      const queues = [];
      for (const [index, id, kind, status] of [[2, 'teacherCoopTasks', 'coop', 'advisor_review'], [3, 'teacherAdvisorTasks', 'advisor', 'pending']]) {
        try {
          const item = result[index]; if (item.status !== 'fulfilled') throw Error('Queue unavailable');
          if (kind === 'coop' && item.value?.success !== true) throw Error('Queue unavailable');
          const rows = validRows(kind === 'coop' ? item.value.data : item.value, status);
          queues.push(rows); renderTasks(id, rows, kind);
        } catch { ++errors; queueState(id, 'โหลดรายการไม่สำเร็จ ลองใหม่อีกครั้ง', { error: true, retry: true }); }
      }
      if (queues.length === 2) {
        const count = queues.reduce((total, rows) => total + rows.length, 0), partial = queues.some(rows => rows.length >= QUEUE_LIMIT);
        metric('teacherPendingMetric', count ? `อย่างน้อย ${count} รายการ` : 'ยังไม่มีรายการ', 'teacherPendingMetricNote', partial ? 'ข้อมูลบางส่วน · เปิดแต่ละหมวดเพื่อดูทั้งหมด' : 'จากรายการที่โหลด · คำร้องสหกิจและคำขอเป็นที่ปรึกษา', count ? 'ready' : 'empty');
      } else metric('teacherPendingMetric', 'ข้อมูลไม่ครบ', 'teacherPendingMetricNote', 'ยังไม่สามารถสรุปรายการรอพิจารณาได้', 'error');
      retry.hidden = errors === 0;
      say(errors ? 'โหลดภาพรวมบางส่วนไม่สำเร็จ กรุณากดลองโหลดอีกครั้ง' : 'อัปเดตภาพรวมแล้ว · ตัวเลขแสดงเฉพาะรายการที่โหลด เปิดแต่ละหมวดเพื่อดูเพิ่มเติม', errors > 0);
    } finally {
      if (ticket === serial) {
        busy = false; root.setAttribute('aria-busy', 'false');
      }
    }
  }
  function clear() {
    ++serial; busy = false; loadedToken = null; root.setAttribute('aria-busy', 'false');
    unavailableSession();
  }
  document.addEventListener('teacher:viewchange', event => { if (event.detail.view === 'teacherOverview') refresh(); });
  target.addEventListener('storage', () => { if (loadedToken && getToken() !== loadedToken) clear(); });
  target.addEventListener('pagehide', clear);
  target.addEventListener('pageshow', event => { if (event.persisted && document.body.dataset.teacherView === 'teacherOverview') refresh(); });
  $('teacherLogout').addEventListener('click', clear);
  const ready = document.body.dataset.teacherView === 'teacherOverview' ? refresh() : Promise.resolve();
  return { ready, refresh };
}

if (typeof document !== 'undefined') mountTeacherDashboard({ document });
