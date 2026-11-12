import '../styles/teacher_list_view.css';

// UI-only preferences. Never use the role/session adapter or persist row data.
export function mountTeacherListView({ document, summary, menu, label, onChange, onSort, onPageSize }) {
  if (!summary) return { get view() { return 'card'; }, get sort() { return 'year_desc'; }, get pageSize() { return 10; }, setBusy() {} };
  const key = `fitm.teacher.list-view.${menu}`;
  const sortKey = `fitm.teacher.list-sort.${menu}`;
  const sizeKey = `fitm.teacher.list-page-size.${menu}`;
  let preferenceStorage = null, view = 'card';
  let sort = 'year_desc', pageSize = 10, busy = true, restoreControlFocus = null;
  try {
    preferenceStorage = document.defaultView?.localStorage;
    if (preferenceStorage?.getItem(key) === 'table') view = 'table';
  } catch { preferenceStorage = null; }
  try {
    const saved = preferenceStorage?.getItem(sortKey);
    if (['year_desc', 'year_asc'].includes(saved)) sort = saved;
  } catch { sort = 'year_desc'; }
  if (onPageSize) try {
    const saved = preferenceStorage?.getItem(sizeKey);
    if (['10', '25', '50'].includes(saved)) pageSize = Number(saved);
  } catch { pageSize = 10; }
  const bar = document.createElement('div'); bar.className = 'teacher-results-bar';
  summary.before(bar); bar.append(summary);
  const controls = document.createElement('div'); controls.className = 'teacher-result-controls'; controls.id = `${menu}-result-controls`;
  const sizeGroup = document.createElement('div'); sizeGroup.className = 'teacher-sort-control';
  const sizeLabel = document.createElement('label'); sizeLabel.htmlFor = `${menu}-page-size`; sizeLabel.textContent = 'รายการต่อหน้า';
  const sizeSelect = document.createElement('select'); sizeSelect.id = sizeLabel.htmlFor; sizeSelect.disabled = true;
  for (const value of ['10', '25', '50']) { const option = document.createElement('option'); option.value = value; option.textContent = value; sizeSelect.append(option); }
  sizeSelect.value = String(pageSize);
  sizeSelect.addEventListener('change', () => {
    if (sizeSelect.disabled) return;
    const value = ['10', '25', '50'].includes(sizeSelect.value) ? Number(sizeSelect.value) : 10;
    sizeSelect.value = String(value); if (value === pageSize) return;
    pageSize = value; try { preferenceStorage?.setItem(sizeKey, String(value)); } catch { /* Keep the in-memory preference. */ }
    onPageSize?.();
  });
  sizeGroup.append(sizeLabel, sizeSelect); if (onPageSize) controls.append(sizeGroup);
  const sortGroup = document.createElement('div'); sortGroup.className = 'teacher-sort-control';
  const sortLabel = document.createElement('label'); sortLabel.htmlFor = `${menu}-sort`;
  const sortIcon = document.createElement('span'); sortIcon.setAttribute('aria-hidden', 'true'); sortIcon.textContent = '↕';
  sortLabel.append(sortIcon, document.createTextNode(' เรียงลำดับ'));
  const sortSelect = document.createElement('select'); sortSelect.id = sortLabel.htmlFor; sortSelect.disabled = true;
  for (const [value, text] of [['year_desc', 'ใหม่สุดก่อน'], ['year_asc', 'เก่าสุดก่อน']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text; sortSelect.append(option);
  }
  sortSelect.value = sort; sortSelect.dataset.sort = sort;
  sortSelect.addEventListener('change', () => {
    if (sortSelect.disabled) return;
    const next = ['year_desc', 'year_asc'].includes(sortSelect.value) ? sortSelect.value : 'year_desc';
    sortSelect.value = next;
    if (next === sort) return;
    sort = next; sortSelect.dataset.sort = sort;
    try { preferenceStorage?.setItem(sortKey, sort); } catch { /* UI-only preference; use memory until reload. */ }
    onSort?.();
  });
  sortGroup.append(sortLabel, sortSelect); if (onSort) controls.append(sortGroup);
  const group = document.createElement('div'); group.className = 'teacher-view-toggle'; group.id = `${menu}-view-toggle`;
  group.setAttribute('role', 'group'); group.setAttribute('aria-label', `มุมมอง${label}`);
  const buttons = [];
  for (const [value, text, shape] of [
    ['card', 'รายการ', 'M4 5h16M4 12h16M4 19h16'],
    ['table', 'ตาราง', 'M3 4h18v16H3zM3 10h18M10 4v16'],
  ]) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.view = value; button.disabled = true;
    button.setAttribute('aria-label', `${text}: ${label}`);
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [attr, content] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'aria-hidden': 'true', focusable: 'false' })) icon.setAttribute(attr, content);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', shape); icon.append(path);
    const caption = document.createElement('span'); caption.textContent = text; button.append(icon, caption);
    button.addEventListener('click', () => {
      if (button.disabled || view === value) return;
      // Storage unavailable: initial/reloaded view is Card; switching can still
      // work in memory for this page without touching auth storage.
      try { preferenceStorage?.setItem(key, value); }
      catch { preferenceStorage = null; }
      view = value;
      update(); onChange();
    });
    buttons.push(button); group.append(button);
  }
  function update() { for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.view === view)); }
  controls.append(group); bar.append(controls); update();
  return {
    get view() { return view; }, get sort() { return sort; }, get pageSize() { return pageSize; },
    setBusy(value) {
      if (value && !busy) restoreControlFocus = [sortSelect, sizeSelect].includes(document.activeElement) ? document.activeElement : null;
      busy = value; sortSelect.disabled = sizeSelect.disabled = value;
      for (const button of buttons) button.disabled = value;
      if (!value && restoreControlFocus) {
        if (document.activeElement === document.body) restoreControlFocus.focus({ preventScroll: true });
        restoreControlFocus = null;
      }
    },
  };
}

export function academicPeriodText(row) {
  const period = row?.academicPeriod;
  const year = period?.academic_year, semester = period?.semester;
  if (year && [1, 2].includes(Number(semester))) return `${year} / ภาคเรียนที่ ${semester}`;
  return 'ไม่ระบุปี/ภาคเรียน';
}

export function studentIdentity(document, name, code) {
  const root = document.createElement('div'); root.className = 'teacher-table-student';
  const fullName = document.createElement('strong'), studentCode = document.createElement('span');
  fullName.textContent = name; studentCode.textContent = code || 'ไม่ระบุรหัส'; root.append(fullName, studentCode); return root;
}

export function createTeacherTable(document, container, caption, headers) {
  const scroll = document.createElement('div'); scroll.className = 'teacher-table-scroll'; scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', `${caption} เลื่อนแนวนอนเพื่อดูทุกคอลัมน์`);
  const table = document.createElement('table'); table.className = 'teacher-data-table';
  const title = document.createElement('caption'); title.className = 'teacher-table-caption'; title.textContent = caption;
  const head = document.createElement('thead'), row = document.createElement('tr'), body = document.createElement('tbody');
  for (const label of headers) { const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = label; row.append(cell); }
  head.append(row); table.append(title, head, body); scroll.append(table); container.append(scroll); return body;
}

export function appendTeacherTableRow(document, body, cells) {
  const row = document.createElement('tr');
  cells.forEach((value, index) => {
    const cell = document.createElement(index === 0 ? 'th' : 'td');
    if (index === 0) cell.scope = 'row';
    if (value?.nodeType) cell.append(value); else cell.textContent = value || 'ไม่ระบุ';
    row.append(cell);
  });
  body.append(row); return row;
}
