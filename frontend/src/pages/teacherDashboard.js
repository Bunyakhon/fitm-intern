import { getTeacherDashboard } from '../api/teacherDashboard.api.js';
import { getRoleToken } from '../auth/roleAuthStorage.js';
import { setButtonLoading } from '../ui/feedback.js';
import { teacherStatusBadge } from './teacherStatus.js';

const mounted = new WeakMap();
const PAGE_SIZE = 5;
const TITLES = { coop: 'พิจารณาคำร้องสหกิจศึกษา', advisor: 'ตอบรับคำขอเป็นที่ปรึกษา' };
const STATUSES = { coop: 'advisor_review', advisor: 'pending' };
const PATHS = {
  coop: 'M9 5H5v16h14V5h-4M9 3h6v4H9zM8 12h8M8 16h5',
  advisor: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 7v6M17 10h6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
};
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const count = value => Number.isSafeInteger(value) && value >= 0;

export function mountTeacherDashboard({ document, target = window, dashboard = getTeacherDashboard, getToken = () => getRoleToken('teacher') } = {}) {
  const $ = id => document.getElementById(id), root = $('teacherOverview');
  if (!root || document.body.dataset.workflowRole !== 'teacher') return;
  if (mounted.has(document)) return mounted.get(document);
  const message = $('teacherOverviewMessage'), list = $('teacherDashboardTasks'), retry = $('teacherDashboardRetry');
  const filters = [...root.querySelectorAll('[data-dashboard-type]')];
  let busy = false, serial = 0, loadedToken = null, controller, data = null, type = 'all', offset = 0;
  const el = (tag, text = '', className = '') => {
    const node = document.createElement(tag); node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function icon(kind) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(key, value);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', PATHS[kind]); svg.append(path); return svg;
  }
  function say(text, error = false) {
    message.textContent = text; message.dataset.type = error ? 'error' : 'info';
    message.setAttribute('role', error ? 'alert' : 'status');
  }
  function metric(id, value, state) {
    $(id).textContent = value;
    const card = $(id).closest('.teacher-summary-card'); card.dataset.state = state; card.setAttribute('aria-busy', String(state === 'loading'));
  }
  function summary(value, state) {
    for (const [id, key] of [['teacherCoopMetric', 'coop_pending'], ['teacherAdvisorMetric', 'advisor_pending'], ['teacherStudentMetric', 'supervised_students']]) metric(id, value ? String(value[key]) : state === 'loading' ? '…' : 'โหลดไม่ได้', state);
    for (const [id, key] of [['teacherSummaryCoop', 'coop_pending'], ['teacherSummaryAdvisor', 'advisor_pending'], ['teacherSummaryTotal', 'pending_total']]) $(id).textContent = value ? `${value[key]} รายการ` : state === 'loading' ? 'กำลังโหลด…' : 'ข้อมูลไม่พร้อม';
    for (const button of filters) {
      const kind = button.dataset.dashboardType;
      button.querySelector('[data-dashboard-count]').textContent = value ? String(kind === 'all' ? value.pending_total : value[`${kind}_pending`]) : '—';
    }
  }
  function controls() {
    for (const button of filters) {
      const selected = button.dataset.dashboardType === type;
      button.setAttribute('aria-pressed', String(selected)); button.disabled = busy || !getToken();
      button.classList.toggle('is-loading', busy && selected); button.setAttribute('aria-busy', String(busy && selected));
    }
    for (const button of root.querySelectorAll('[data-dashboard-shortcut]')) button.disabled = busy || !getToken();
    $('teacherTaskPrevious').disabled = busy || !data || offset === 0;
    $('teacherTaskNext').disabled = busy || !data || offset + data.tasks.length >= data.pagination.total;
    setButtonLoading(retry, busy, 'กำลังโหลด...', 'ลองโหลดอีกครั้ง');
    retry.disabled = busy || !getToken();
    root.setAttribute('aria-busy', String(busy)); list.setAttribute('aria-busy', String(busy));
  }
  function state(text, loading = false) {
    list.replaceChildren(el('p', text, 'teacher-dashboard-state'));
    list.dataset.state = loading ? 'loading' : 'empty';
    if (loading) for (let index = 0; index < 3; index++) { const skeleton = el('div', '', 'teacher-task-skeleton'); skeleton.setAttribute('aria-hidden', 'true'); list.append(skeleton); }
    $('teacherTaskRange').textContent = '';
  }
  function unavailableSession() {
    data = null; busy = false; retry.hidden = true; summary(null, 'error');
    $('teacherWelcomeName').textContent = 'กรุณาเข้าสู่ระบบอีกครั้ง'; $('teacherOverviewSignIn').hidden = false;
    state('สถานะเข้าสู่ระบบไม่พร้อม กรุณาเข้าสู่ระบบอีกครั้ง');
    say('ไม่สามารถอ่านภาพรวมด้วยเซสชันนี้ได้ กรุณาเข้าสู่ระบบอีกครั้ง', true); controls();
  }
  function valid(value, selected, start) {
    const s = value?.summary, p = value?.pagination;
    if (!uuid(value?.teacher?.id) || !s || !['coop_pending', 'advisor_pending', 'supervised_students', 'pending_total'].every(key => count(s[key]))
      || s.pending_total !== s.coop_pending + s.advisor_pending || p?.type !== selected || p.offset !== start || p.limit !== PAGE_SIZE
      || p.total !== (selected === 'all' ? s.pending_total : s[`${selected}_pending`]) || !Array.isArray(value.tasks)
      || value.tasks.length > PAGE_SIZE || new Set(value.tasks.map(row => `${row?.kind}:${row?.id}`)).size !== value.tasks.length
      || value.tasks.length !== Math.min(PAGE_SIZE, Math.max(0, p.total - start))
      || value.tasks.some(row => !uuid(row?.id) || !uuid(row.student_record_id) || !Object.hasOwn(STATUSES, row.kind) || row.status !== STATUSES[row.kind]
        || (selected !== 'all' && row.kind !== selected) || typeof row.student_id !== 'string'
        || (row.received_at !== null && (typeof row.received_at !== 'string' || Number.isNaN(new Date(row.received_at).getTime()))))) throw Object.assign(new Error('Invalid dashboard contract'), { code: 'DASHBOARD_CONTRACT' });
    return value;
  }
  function renderTasks() {
    list.replaceChildren(); list.dataset.state = data.tasks.length ? 'ready' : 'empty';
    if (!data.tasks.length) state(type === 'all' ? 'ไม่มีรายการที่รอคุณดำเนินการในขณะนี้' : type === 'coop' ? 'ไม่มีคำร้องสหกิจศึกษาที่รอคุณพิจารณา' : 'ไม่มีคำขอเป็นที่ปรึกษาที่รอการยืนยัน');
    for (const row of data.tasks) {
      const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || 'ไม่ระบุชื่อ';
      const item = el('article', '', 'teacher-dashboard-task'), symbol = el('span', '', 'teacher-dashboard-task-icon'); symbol.dataset.kind = row.kind; symbol.append(icon(row.kind));
      const body = el('div', '', 'teacher-dashboard-task-body');
      body.append(el('h3', TITLES[row.kind]));
      const student = el('p', '', 'teacher-dashboard-task-student'); student.append(el('strong', name), el('span', `รหัส ${row.student_id}${row.major ? ` · ${row.major}` : ''}`)); body.append(student);
      body.append(el('p', row.kind === 'coop' ? [row.company_name, row.job_title].filter(Boolean).join(' · ') || 'ไม่ระบุสถานประกอบการ / ตำแหน่งงาน' : row.topic || 'ไม่ระบุหัวข้อโครงการ', 'teacher-dashboard-task-support'));
      const meta = el('div', '', 'teacher-dashboard-task-meta');
      if (row.received_at) { const time = el('time', `ส่งเมื่อ ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(row.received_at))}`); time.dateTime = row.received_at; meta.append(time); }
      else meta.append(el('span', 'ไม่ระบุวันที่ส่ง'));
      meta.append(teacherStatusBadge(document, row.kind === 'coop' ? 'รออาจารย์ที่ปรึกษาพิจารณา' : 'รอการยืนยัน', row.status, 'teacher-neutral-badge')); body.append(meta);
      const link = el('a', row.kind === 'coop' ? 'พิจารณา' : 'เปิดคำขอ', 'teacher-button teacher-button--primary'); link.append(icon('arrow'));
      link.href = row.kind === 'coop' ? '#coopApprovals' : '#advisorRequests'; link.setAttribute('data-teacher-view', '');
      link.setAttribute('aria-label', `${TITLES[row.kind]}ของ ${name} รหัส ${row.student_id}`);
      link.addEventListener('click', event => {
        if (busy || getToken() !== loadedToken || !getToken() || document.body.classList.contains('has-app-modal')) { event.preventDefault(); return; }
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        document.dispatchEvent(new target.CustomEvent('teacher:task-open', { detail: { kind: row.kind, id: row.id } }));
      });
      item.append(symbol, body, link); list.append(item);
    }
    $('teacherTaskRange').textContent = data.pagination.total ? `แสดง ${offset + 1}–${offset + data.tasks.length} จาก ${data.pagination.total} รายการ · หน้า ${offset / PAGE_SIZE + 1}` : '0 รายการ';
  }
  async function refresh() {
    if (busy) return;
    const token = getToken(); if (!token) { unavailableSession(); return; }
    const restoreFocus = root.contains(document.activeElement) ? document.activeElement : null;
    busy = true; loadedToken = token; const ticket = ++serial, selected = type;
    controller?.abort(); controller = new AbortController(); data = null;
    $('teacherOverviewSignIn').hidden = true; summary(null, 'loading');
    state('กำลังโหลดรายการที่ต้องดำเนินการ…', true); say('กำลังโหลดภาพรวมงานของคุณ…'); controls();
    const current = () => ticket === serial && getToken() === token;
    try {
      let response = await dashboard({ type: selected, offset }, controller.signal);
      if (!current()) { if (ticket === serial) clear(); return; }
      if (!response?.success) throw Object.assign(new Error('Invalid dashboard response'), { code: 'DASHBOARD_CONTRACT' });
      let value = valid(response.data, selected, offset);
      // A decision can empty the last page. Refetch page one once, never loop.
      if (!value.tasks.length && offset > 0) {
        offset = 0; response = await dashboard({ type: selected, offset }, controller.signal);
        if (!current()) { if (ticket === serial) clear(); return; }
        if (!response?.success) throw Object.assign(new Error('Invalid dashboard response'), { code: 'DASHBOARD_CONTRACT' });
        value = valid(response.data, selected, offset);
      }
      data = value; summary(value.summary, 'ready'); renderTasks(); retry.hidden = true;
      $('teacherWelcomeName').textContent = [value.teacher.academic_title, value.teacher.first_name, value.teacher.last_name].filter(Boolean).join(' ') || 'อาจารย์';
      say('ข้อมูลล่าสุดจากระบบ · งานเรียงตามวันที่ส่งเก่าสุดก่อน · เวลา Asia/Bangkok');
    } catch (error) {
      if (!current()) { if (ticket === serial) clear(); return; }
      if ([401, 403].includes(error.status)) { unavailableSession(); return; }
      data = null; summary(null, 'error'); state('โหลดรายการไม่สำเร็จ กรุณาลองโหลดอีกครั้ง'); list.dataset.state = 'error';
      $('teacherWelcomeName').textContent = 'โหลดข้อมูลบัญชีไม่สำเร็จ'; retry.hidden = false;
      say(error.code === 'DASHBOARD_CONTRACT' ? 'รูปแบบข้อมูลภาพรวมไม่ตรงกับหน้าจอ กรุณาโหลดใหม่หลังอัปเดต Backend' : error.status ? `โหลดภาพรวมไม่สำเร็จ (HTTP ${error.status}) กรุณาลองอีกครั้ง` : 'โหลดภาพรวมไม่สำเร็จ การเชื่อมต่อขัดข้องหรือหมดเวลา กรุณาลองอีกครั้ง', true);
    } finally {
      if (ticket === serial) {
        busy = false; controls();
        if (restoreFocus?.isConnected && !restoreFocus.disabled && document.activeElement === document.body && document.body.dataset.teacherView === 'teacherOverview') restoreFocus.focus({ preventScroll: true });
      }
    }
  }
  function choose(selected, focus = false) {
    if (busy || !getToken()) return;
    if (type !== selected || offset !== 0 || !data) { type = selected; offset = 0; refresh(); }
    if (focus) $('teacherTaskHeading').focus();
  }
  function clear() {
    ++serial; controller?.abort(); loadedToken = null; unavailableSession();
  }
  for (const button of filters) button.addEventListener('click', () => choose(button.dataset.dashboardType));
  for (const button of root.querySelectorAll('[data-dashboard-shortcut]')) button.addEventListener('click', () => choose(button.dataset.dashboardShortcut, true));
  retry.addEventListener('click', refresh);
  $('teacherTaskPrevious').addEventListener('click', () => { if (!busy && data && offset) { offset = Math.max(0, offset - PAGE_SIZE); refresh(); } });
  $('teacherTaskNext').addEventListener('click', () => { if (!busy && data && offset + data.tasks.length < data.pagination.total) { offset += PAGE_SIZE; refresh(); } });
  document.addEventListener('teacher:viewchange', event => {
    if (event.detail.view === 'teacherOverview') refresh();
    else if (busy) { ++serial; controller?.abort(); busy = false; controls(); }
  });
  target.addEventListener('storage', () => { if (loadedToken && getToken() !== loadedToken) clear(); });
  target.addEventListener('pagehide', clear);
  target.addEventListener('pageshow', event => { if (event.persisted && document.body.dataset.teacherView === 'teacherOverview') refresh(); });
  $('teacherLogout').addEventListener('click', clear);
  const instance = { refresh }; mounted.set(document, instance);
  instance.ready = document.body.dataset.teacherView === 'teacherOverview' ? refresh() : Promise.resolve();
  return instance;
}

if (typeof document !== 'undefined') mountTeacherDashboard({ document });
