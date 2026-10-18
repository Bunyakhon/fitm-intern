import { revealNavigationItem } from '../ui/navigationScroll.js';

// Navigation owns visibility only. Workflow modules keep their DOM, state and lifecycle.
const mounted = new WeakMap();
const views = ['coopApprovals', 'advisorRequests', 'supervisionScheduling', 'own-account'];
const adminPath = '/src/super_admin/super_admin.html';
const iconPaths = {
  '#coopApprovals': 'M9 5H5v16h14V5h-4M9 3h6v4H9zM8 12h8M8 16h5',
  '#advisorRequests': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 8l2 2 3-3',
  '#supervisionScheduling': 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2M8 14h3M8 17h6',
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
    const panel = document.getElementById(selected);
    pendingFocus ||= focus;
    // Account content can arrive after navigation, and workflows can bind while hidden.
    if (!panel || document.body.classList.contains('has-app-modal')) return;
    const changed = active !== selected;
    for (const id of views) {
      const node = document.getElementById(id);
      if (node && node.parentElement === main) node.hidden = id !== selected;
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
    if (changed && pendingFocus) (heading || main).focus({ preventScroll: true });
    active = selected; pendingFocus = false;
    revealMenu(currentLink);
  }

  function activate(event) {
    const link = event.target.closest('a.sidebar-item');
    if (!link || !nav.contains(link) || link.hidden) return;
    const href = link.getAttribute('href');
    if (!views.some(id => href === `#${id}`)) return;
    if (event.type === 'click' && (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;
    event.preventDefault();
    if (document.body.classList.contains('has-app-modal')) return;
    if (target.location.hash !== href) target.location.hash = href;
    sync({ focus: true });
  }
  const onHash = () => sync({ focus: true });
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
  document.querySelector('.teacher-skip-link')?.addEventListener('click', event => {
    event.preventDefault(); main.focus();
  });
  nav.addEventListener('click', activate);
  nav.addEventListener('keydown', onKey);
  nav.addEventListener('focusin', onFocus);
  target.addEventListener('hashchange', onHash);
  target.addEventListener('resize', onResize);
  // Observe only menu edits, new top-level panels, and the shared modal state.
  // Workflow rendering and form changes never trigger remounts or requests.
  const observer = new target.MutationObserver(() => {
    sync();
    const open = document.body.classList.contains('has-app-modal');
    if (modalOpen && !open) {
      // Shared feedback restores the opener first. If a decision replaced that
      // button, provide a stable destination after its 180ms close transition.
      target.setTimeout(() => {
        if (document.body.classList.contains('has-app-modal')) return;
        const focused = document.activeElement;
        if (!focused || focused === document.body || !focused.isConnected || focused.closest('[aria-modal="true"]')) {
          (document.getElementById(active)?.querySelector('h1, h2') || main).focus({ preventScroll: true });
        }
      }, 200);
    }
    modalOpen = open;
  });
  observer.observe(nav, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  observer.observe(main, { childList: true });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const controller = { sync };
  mounted.set(document, controller);
  sync();
  return controller;
}

if (typeof document !== 'undefined') mountTeacherNavigation({ document });
