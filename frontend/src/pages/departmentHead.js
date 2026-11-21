import { roleSessionStorage } from "../auth/roleAuthStorage.js";
import { mountTeacherCoopRequests } from "./teacherCoopRequests.js";
import { getCurrentDepartmentHead, getHeadCoopRequests, getHeadCoopRequest, decideHeadCoopRequest } from "../api/departmentHead.api.js";
import { TEACHER_TOKEN_KEY } from "../api/teacherProjectAdvisor.api.js";
import { showToast, setButtonLoading } from "../ui/feedback.js";
import { teacherStatusBadge } from "./teacherStatus.js";
import "./roleAccount.js";

export function mountDepartmentHead(dependencies) {
  const { document, storage, location } = dependencies;
  const target = document.defaultView;
  const get = id => document.getElementById(id);
  const toast = dependencies.toast || showToast;
  const me = dependencies.me || getCurrentDepartmentHead;
  const list = dependencies.list || getHeadCoopRequests;
  const views = { headOverview: "ภาพรวม", coopApprovals: "อนุมัติคำร้องสหกิจ", 'own-account': "ข้อมูลส่วนตัว" };
  let activeView = null, pendingStatus = null, pendingRequest = null, authorized = false;
  let sequence = 0, navigationSequence = 0, dashboardLoading = false;
  function node(tag, text, className) {
    const element = document.createElement(tag); element.textContent = text;
    if (className) element.className = className; return element;
  }
  const workflow = mountTeacherCoopRequests({ list: getHeadCoopRequests, detail: getHeadCoopRequest, decide: decideHeadCoopRequest, ...dependencies,
    me: async () => {
      const result = await me();
      authorized = result?.success === true && !!result.data?.id && result.data.is_department_head === true;
      if (authorized) {
        get("headWelcomeName").textContent = [result.data.academic_title, result.data.first_name, result.data.last_name].filter(Boolean).join(" ") || "หัวหน้าภาควิชา";
        get("headDepartment").textContent = result.data.department || "ยังไม่ระบุภาควิชา";
      }
      return result;
    }, role: "department_head" });
  const metrics = [
    { status: 'department_head_review', id: 'headPendingCount' },
    { status: 'approved', id: 'headApprovedCount' },
    { status: 'rejected', id: 'headRejectedCount' },
  ];
  function dashboardMessage(text, error = false) {
    const message = get('headDashboardMessage'); message.textContent = text;
    message.dataset.type = error ? 'error' : 'info'; message.setAttribute('role', error ? 'alert' : 'status');
  }
  function clearDashboard(text) {
    for (const metric of metrics) get(metric.id).textContent = '—';
    get('headDashboardTasks').replaceChildren(node('p', text, 'head-empty'));
  }
  async function loadDashboard() {
    if (dashboardLoading) return;
    get('headDashboardRefresh').hidden = true;
    if (!authorized || !storage.getItem(TEACHER_TOKEN_KEY)) {
      clearDashboard('ยังแสดงข้อมูลไม่ได้ กรุณาตรวจสอบสถานะเข้าสู่ระบบ');
      get('headDashboardTasks').setAttribute('aria-busy', 'false');
      get('headDashboardSignIn').hidden = false;
      dashboardMessage('ตรวจสอบบัญชีหัวหน้าภาคไม่สำเร็จ กรุณาโหลดหน้าใหม่หรือเข้าสู่ระบบอีกครั้ง', true); return;
    }
    dashboardLoading = true;
    const ticket = ++sequence, token = storage.getItem(TEACHER_TOKEN_KEY);
    setButtonLoading(get('headDashboardRefresh'), true, 'กำลังโหลด...', 'ลองโหลดภาพรวมอีกครั้ง');
    get('headDashboardTasks').setAttribute('aria-busy', 'true');
    clearDashboard('กำลังโหลดรายการที่ต้องดำเนินการ...'); dashboardMessage('กำลังโหลดข้อมูลล่าสุด...');
    try {
      const results = await Promise.allSettled(metrics.map(async metric => {
        const result = await list({ status: metric.status, offset: 0, limit: 26 });
        if (result?.success !== true || !Array.isArray(result.data)
          || result.data.some(row => !row?.id || row.status !== metric.status)) throw Error('Invalid dashboard response');
        return result.data;
      }));
      if (ticket !== sequence || token !== storage.getItem(TEACHER_TOKEN_KEY)) return;
      for (const result of results) {
        if (result.status === 'rejected' && [401, 403].includes(result.reason.status)) {
          if (await workflow.handleAuthError(result.reason)) {
            authorized = false; clearDashboard('เซสชันหรือสิทธิ์หัวหน้าภาคใช้ไม่ได้แล้ว กรุณาเข้าสู่ระบบอีกครั้ง');
            get('headDashboardSignIn').hidden = false;
            dashboardMessage('กรุณาเข้าสู่ระบบหัวหน้าภาคอีกครั้ง', true); return;
          }
        }
      }
      if (ticket !== sequence || token !== storage.getItem(TEACHER_TOKEN_KEY)) return;
      results.forEach((result, index) => {
        get(metrics[index].id).textContent = result.status === 'fulfilled'
          ? `${result.value.length >= 26 ? 'อย่างน้อย ' : ''}${result.value.length} รายการ` : 'โหลดไม่ได้';
      });
      const pending = results[0], tasks = get('headDashboardTasks'); tasks.replaceChildren();
      if (pending.status === 'rejected') tasks.append(node('p', 'โหลดรายการรอพิจารณาไม่ได้ กรุณากดลองโหลดภาพรวมอีกครั้ง', 'head-empty'));
      else if (!pending.value.length) {
        const empty = node('div', '', 'head-empty');
        empty.append(node('span', '✓', 'head-empty-symbol'), node('h3', 'ไม่มีคำร้องรอพิจารณา'), node('p', 'เมื่อมีคำร้องในภาควิชาที่ผ่านขั้นอาจารย์ที่ปรึกษาแล้ว รายการจะแสดงที่นี่')); tasks.append(empty);
      } else {
        for (const request of pending.value.slice(0, 5)) {
          const name = [request.student?.first_name, request.student?.last_name].filter(Boolean).join(' ') || 'ไม่ระบุชื่อ';
          const card = node('article', '', 'head-task'), text = node('div', '');
          text.append(node('h3', name), node('p', `รหัส ${request.student?.student_id || '—'} · ${request.company_name || 'ยังไม่ระบุสถานประกอบการ'}`), teacherStatusBadge(document, 'รอหัวหน้าภาควิชาพิจารณา', request.status));
          const button = node('button', 'ดูรายละเอียด', 'teacher-button teacher-button--primary'); button.type = 'button';
          button.setAttribute('aria-label', `ดูรายละเอียดคำร้อง ${name} รหัส ${request.student?.student_id || '—'}`);
          button.addEventListener('click', () => navigate('coopApprovals', 'department_head_review', request.id));
          card.append(text, button); tasks.append(card);
        }
        tasks.append(node('p', `แสดง ${Math.min(5, pending.value.length)} รายการแรก เปิดรายการรอพิจารณาเพื่อดูเพิ่มเติม`, 'head-count-note'));
      }
      const failed = results.some(result => result.status === 'rejected');
      get('headDashboardRefresh').hidden = !failed;
      dashboardMessage(failed ? 'โหลดข้อมูลบางส่วนไม่สำเร็จ กรุณาลองโหลดภาพรวมอีกครั้ง' : `อัปเดตล่าสุด ${new Intl.DateTimeFormat('th-TH', { timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date())} น. · จำนวนแยกตามสถานะที่โหลด`, failed);
      get('headDashboardSignIn').hidden = true;
    } finally {
      if (ticket === sequence) {
        dashboardLoading = false;
        get('headDashboardTasks').setAttribute('aria-busy', 'false');
        setButtonLoading(get('headDashboardRefresh'), false, 'กำลังโหลด...', 'ลองโหลดภาพรวมอีกครั้ง');
        get('headDashboardRefresh').disabled = !storage.getItem(TEACHER_TOKEN_KEY);
      }
    }
  }
  async function showView({ focus = true } = {}) {
    const selected = location.hash?.slice(1), view = Object.hasOwn(views, selected) ? selected : 'headOverview';
    if (activeView && !workflow.canLeave()) {
      target.history.replaceState(null, '', `#${activeView}`);
      pendingStatus = null; pendingRequest = null;
      toast('กรุณาปิดหน้าต่างยืนยันหรือรอการดำเนินการให้เสร็จก่อนเปลี่ยนเมนู', 'info'); return;
    }
    const navigation = ++navigationSequence;
    activeView = view;
    for (const id of Object.keys(views)) if (get(id)) get(id).hidden = id !== view;
    for (const link of document.querySelectorAll('.sidebar-menu [data-head-view]')) {
      const current = link.getAttribute('href') === `#${view}`;
      link.classList.toggle('active', current);
      if (current) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    }
    get('headPageContext').textContent = views[view];
    document.title = `${views[view]} · หัวหน้าภาควิชา | CWIE-IT CoopConnect`;
    document.dispatchEvent(new target.CustomEvent('head:viewchange', { detail: { view } }));
    if (focus) get(view)?.querySelector('h1')?.focus({ preventScroll: true });
    const requestedStatus = pendingStatus, requestId = pendingRequest; pendingStatus = null; pendingRequest = null;
    await workflow.ready;
    if (activeView !== view || navigation !== navigationSequence) return;
    if (view === 'headOverview') await loadDashboard();
    else if (view === 'coopApprovals') {
      await workflow.showRequests(requestedStatus);
      if (activeView === view && navigation === navigationSequence && requestId) await workflow.openDetail(requestId);
    }
  }
  function navigate(view, status, requestId) {
    if (!workflow.canLeave()) { toast('กรุณาปิดหน้าต่างยืนยันหรือรอการดำเนินการให้เสร็จก่อนเปลี่ยนเมนู', 'info'); return; }
    pendingStatus = status || null; pendingRequest = requestId || null;
    if (location.hash === `#${view}`) showView(); else location.hash = view;
  }
  document.addEventListener('click', event => {
    if (event.target.closest('.head-skip-link')) { event.preventDefault(); get('headWorkspace').focus(); return; }
    const link = event.target.closest('a[data-head-view]');
    if (!link || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault(); navigate(link.getAttribute('href').slice(1), link.dataset.headStatus);
  });
  target.addEventListener('hashchange', () => showView());
  target.addEventListener('pagehide', () => { ++sequence; dashboardLoading = false; clearDashboard('โหลดข้อมูลล่าสุดเมื่อกลับมาที่หน้า'); });
  target.addEventListener('pageshow', event => { if (event.persisted && activeView === 'headOverview') loadDashboard(); });
  get('headDashboardRefresh').addEventListener('click', loadDashboard);
  document.getElementById("headLogout").addEventListener("click", () => { storage.removeItem(TEACHER_TOKEN_KEY); location.replace("/login.html"); });
  const ready = showView({ focus: false });
  return { ...workflow, ready, loadDashboard };
}
if (typeof document !== "undefined") mountDepartmentHead({ document, storage: roleSessionStorage, location: window.location });
