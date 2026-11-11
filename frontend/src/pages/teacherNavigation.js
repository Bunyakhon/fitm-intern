import { revealNavigationItem } from '../ui/navigationScroll.js';

// Navigation owns visibility only. Workflow modules keep their DOM, state and lifecycle.
const mounted = new WeakMap();
const panels = {
  teacherOverview: 'teacherOverview', coopApprovals: 'coopApprovals', advisorRequests: 'advisorRequests',
  teacherStudents: 'supervisionScheduling', supervisionScheduling: 'supervisionScheduling', supervisionResults: 'supervisionScheduling',
  projectDocuments: 'projectDocuments', teacherEvaluations: 'teacherEvaluations', 'own-account': 'own-account',
};
const views = Object.keys(panels);
const supervisionViews = {
  teacherStudents: ['นักศึกษาในความดูแล', 'จัดการนักศึกษา / นักศึกษาในความดูแล', 'ดูรายชื่อนักศึกษาที่คุณเป็นที่ปรึกษาโครงการ / อาจารย์นิเทศ และเลือกดูรายละเอียดเป็นรายบุคคล'],
  supervisionScheduling: ['นัดหมายนิเทศ', 'การนิเทศและประเมิน / นัดหมายนิเทศ', 'จัดการนัดนิเทศครั้งที่ 1–2 ตรวจสอบพี่เลี้ยง และติดตามการยืนยัน วันเวลาใช้ Asia/Bangkok'],
  supervisionResults: ['บันทึกผลนิเทศ', 'การนิเทศและประเมิน / บันทึกผลนิเทศ', 'เลือกนักศึกษาและนัดหมายเพื่อเปิดผลนิเทศ บันทึกฉบับร่าง แนบภาพสองภาพ และตรวจทานก่อนยืนยันผล'],
};
const adminPath = '/src/super_admin/super_admin.html';
const iconPaths = {
  '#teacherOverview': 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  '#teacherStudents': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.9M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  '#coopApprovals': 'M9 5H5v16h14V5h-4M9 3h6v4H9zM8 12h8M8 16h5',
  '#advisorRequests': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 8l2 2 3-3',
  '#supervisionScheduling': 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2M8 14h3M8 17h6',
  '#supervisionResults': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 14l2 2 5-5',
  '#projectDocuments': 'M3 7h7l2 2h9v11H3zM3 7V4h6l2 3',
  '#teacherEvaluations': 'M4 20h16M7 16v-4M12 16V7M17 16V3',
  '#own-account': 'M20 21v-2a7 7 0 0 0-14 0v2M13 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  [adminPath]: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6',
};

export function mountTeacherNavigation({ document, target = window } = {}) {
  if (document.body.dataset.workflowRole !== 'teacher') return;
  if (mounted.has(document)) return mounted.get(document);
  const nav = document.querySelector('.sidebar-menu');
  const main = document.querySelector('.dashboard-content');
  const accounts = document.getElementById('teacherAccountMenu');
  if (!nav || !main || !accounts) return;
  const sidebar = document.getElementById('teacherSidebar'), toggle = document.getElementById('teacherMenuToggle');
  const close = document.getElementById('teacherMenuClose'), overlay = document.getElementById('teacherDrawerOverlay');
  const header = document.querySelector('.navbar'), mobile = target.matchMedia('(max-width: 900px)');
  let drawerOpen = false;
  let active = null, pendingFocus = false;
  let modalOpen = document.body.classList.contains('has-app-modal');

  function decorate(link) {
    const href = link.getAttribute('href'), path = iconPaths[href];
    if (!path || link.querySelector('.teacher-menu-icon')) return;
    const label = document.createElement('span');
    label.textContent = link.textContent;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('teacher-menu-icon');
    for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(name, value);
    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    shape.setAttribute('d', path); svg.append(shape);
    link.replaceChildren(svg, label);
  }

  function revealLink(link) {
    // Move only the menu's scroll position; never scroll the page or a modal.
    revealNavigationItem(nav, link);
    if (sidebar && sidebar.scrollHeight > sidebar.clientHeight) {
      const box = sidebar.getBoundingClientRect(), item = link.getBoundingClientRect();
      if (item.top < box.top) sidebar.scrollTop += item.top - box.top - 12;
      else if (item.bottom > box.bottom) sidebar.scrollTop += item.bottom - box.bottom + 12;
    }
  }

  function setDrawer(open, { restoreFocus = false } = {}) {
    drawerOpen = !!open && mobile.matches && !document.body.classList.contains('has-app-modal');
    document.body.classList.toggle('teacher-drawer-open', drawerOpen);
    toggle?.setAttribute('aria-expanded', String(drawerOpen));
    toggle?.setAttribute('aria-label', drawerOpen ? 'ปิดเมนูอาจารย์' : 'เปิดเมนูอาจารย์');
    if (overlay) overlay.hidden = !drawerOpen;
    if (sidebar) {
      sidebar.inert = mobile.matches && !drawerOpen;
      if (drawerOpen) { sidebar.setAttribute('role', 'dialog'); sidebar.setAttribute('aria-modal', 'true'); }
      else { sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal'); }
    }
    main.inert = drawerOpen;
    if (header) header.inert = drawerOpen;
    if (drawerOpen) (close || sidebar)?.focus({ preventScroll: true });
    else if (restoreFocus) toggle?.focus({ preventScroll: true });
  }

  function revealMenu(currentLink) {
    const focused = document.activeElement?.closest('a.sidebar-item');
    const link = focused && nav.contains(focused) ? focused : currentLink;
    if (link) revealLink(link);
  }

  function sync({ focus = false } = {}) {
    for (const link of nav.querySelectorAll('a.sidebar-item')) {
      const href = link.getAttribute('href');
      // Keep the original capability-controlled element and its hidden property.
      if ((href === '#own-account' || href === adminPath) && link.parentElement !== accounts) accounts.append(link);
      decorate(link);
    }
    const hash = target.location.hash.slice(1);
    const selected = views.includes(hash) ? hash : views[0];
    const panel = document.getElementById(panels[selected]);
    pendingFocus ||= focus;
    // Account content can arrive after navigation, and workflows can bind while hidden.
    if (!panel || document.body.classList.contains('has-app-modal')) return;
    const changed = active !== selected;
    for (const id of new Set(Object.values(panels))) {
      const node = document.getElementById(id);
      if (node && node.parentElement === main) node.hidden = id !== panels[selected];
    }
    // Three views share the mounted supervision DOM. No form or widget is rebuilt.
    document.body.dataset.teacherView = selected;
    if (supervisionViews[selected]) {
      const [title, eyebrow, description] = supervisionViews[selected];
      document.getElementById('supervisionHeading').textContent = title;
      document.getElementById('teacherSupervisionEyebrow').textContent = eyebrow;
      document.getElementById('teacherSupervisionDescription').textContent = description;
    }
    let currentLink;
    for (const link of nav.querySelectorAll('a.sidebar-item')) {
      const current = link.getAttribute('href') === `#${selected}`;
      link.classList.toggle('active', current);
      if (current) { link.setAttribute('aria-current', 'page'); currentLink = link; }
      else link.removeAttribute('aria-current');
    }
    const heading = panel.querySelector('h1, h2');
    if (heading) heading.setAttribute('tabindex', '-1');
    if (pendingFocus) (heading || main).focus({ preventScroll: true });
    active = selected; pendingFocus = false;
    revealMenu(currentLink);
    if (changed) document.dispatchEvent(new target.CustomEvent('teacher:viewchange', { detail: { view: selected } }));
  }

  function activate(event) {
    const link = event.target.closest('a.sidebar-item, a[data-teacher-view]');
    if (!link || (!nav.contains(link) && !main.contains(link)) || link.hidden) return;
    const href = link.getAttribute('href');
    if (!views.some(id => href === `#${id}`)) return;
    if (event.type === 'click' && (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;
    event.preventDefault();
    if (document.body.classList.contains('has-app-modal')) return;
    setDrawer(false);
    if (target.location.hash !== href) target.location.hash = href;
    sync({ focus: true });
  }
  const onHash = () => { setDrawer(false); sync({ focus: true }); };
  const onFocus = event => {
    const link = event.target.closest('a.sidebar-item');
    if (link && nav.contains(link)) revealLink(link);
  };
  const onKey = event => {
    const link = event.target.closest('a.sidebar-item');
    if (event.key !== ' ' || !link || !nav.contains(link)) return;
    event.preventDefault();
    if (!event.repeat && !link.hidden && !document.body.classList.contains('has-app-modal')) link.click();
  };
  const onResize = () => revealMenu([...nav.querySelectorAll('a.sidebar-item')].find(link => link.getAttribute('aria-current')));
  const onDrawerKey = event => {
    if (!drawerOpen || document.body.classList.contains('has-app-modal')) return;
    if (event.key === 'Escape') { event.preventDefault(); setDrawer(false, { restoreFocus: true }); return; }
    if (event.key !== 'Tab') return;
    const controls = [...sidebar.querySelectorAll('a[href], button:not(:disabled)')].filter(node => !node.closest('[hidden]') && node.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); sidebar.focus(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === sidebar)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  toggle?.addEventListener('click', () => setDrawer(!drawerOpen));
  close?.addEventListener('click', () => setDrawer(false, { restoreFocus: true }));
  overlay?.addEventListener('click', () => setDrawer(false, { restoreFocus: true }));
  mobile.addEventListener('change', () => {
    const focusWasInside = sidebar?.contains(document.activeElement);
    setDrawer(false, { restoreFocus: mobile.matches && focusWasInside });
  });
  document.querySelector('.teacher-skip-link')?.addEventListener('click', event => {
    event.preventDefault(); main.focus();
  });
  document.addEventListener('click', activate);
  document.addEventListener('keydown', onDrawerKey);
  nav.addEventListener('keydown', onKey);
  nav.addEventListener('focusin', onFocus);
  target.addEventListener('hashchange', onHash);
  target.addEventListener('resize', onResize);
  // Observe only menu edits, new top-level panels, and the shared modal state.
  // Workflow rendering and form changes never trigger remounts or requests.
  const observer = new target.MutationObserver(() => {
    sync();
    const open = document.body.classList.contains('has-app-modal');
    if (open && drawerOpen) setDrawer(false);
    if (modalOpen && !open) {
      // Shared feedback restores the opener first. If a decision replaced that
      // button, provide a stable destination after its 180ms close transition.
      target.setTimeout(() => {
        if (document.body.classList.contains('has-app-modal')) return;
        const focused = document.activeElement;
        if (!focused || focused === document.body || !focused.isConnected || focused.closest('[aria-modal="true"]')) {
          (document.getElementById(panels[active])?.querySelector('h1, h2') || main).focus({ preventScroll: true });
        }
      }, 200);
    }
    modalOpen = open;
  });
  observer.observe(nav, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  observer.observe(main, { childList: true });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  target.addEventListener('pagehide', () => setDrawer(false));
  const controller = { sync };
  mounted.set(document, controller);
  setDrawer(false); sync();
  return controller;
}

if (typeof document !== 'undefined') mountTeacherNavigation({ document });
