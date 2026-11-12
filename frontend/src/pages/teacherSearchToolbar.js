import '../styles/teacher_search.css';

export function mountTeacherSearchToolbar({ document, anchor, status, placeholder, onApply, pageSize = () => 25, includeUnknownYear = false }) {
  if (!anchor) return { query: () => ({}), setBusy() {}, setLoading() {}, update() {}, loading() {}, active: () => false };
  const form = document.createElement('form'); form.className = 'teacher-search-toolbar';
  form.setAttribute('role', 'search'); form.setAttribute('aria-label', 'ค้นหาและกรองรายการ');
  const fields = {}, initialStatus = status?.value;
  const prefix = anchor.id || status.id;
  function field(key, label, choices) {
    const group = document.createElement('div'); group.className = `teacher-search-field teacher-search-field--${key}`;
    const node = document.createElement(choices ? 'select' : 'input'); node.id = `${prefix}-${key}`;
    const caption = document.createElement('label'); caption.htmlFor = node.id; caption.textContent = label;
    if (choices) for (const [value, text] of choices) { const option = document.createElement('option'); option.value = value; option.textContent = text; node.append(option); }
    else { node.type = 'search'; node.maxLength = 100; node.placeholder = placeholder; }
    group.append(caption, node); form.append(group); fields[key] = node; return node;
  }
  field('search', 'ค้นหา');
  const yearChoices = [['', 'ทุกปี'], ...(includeUnknownYear ? [['unknown', 'ไม่ระบุปีการศึกษา']] : [])];
  field('year', 'ปีการศึกษา', yearChoices);
  field('semester', 'ภาคเรียน', [['', 'ทุกภาค'], ['1', 'ภาคเรียนที่ 1'], ['2', 'ภาคเรียนที่ 2']]);
  field('major', 'สาขาวิชา', [['', 'ทุกสาขา'], ['IT', 'IT'], ['INE', 'INE']]);
  anchor.before(form);
  if (status) { const group = status.parentElement; group.classList.remove('teacher-toolbar'); group.classList.add('teacher-search-field'); form.append(group); }
  const actions = document.createElement('div'); actions.className = 'teacher-search-actions';
  const search = document.createElement('button'); search.type = 'submit'; search.className = 'teacher-button teacher-button--primary'; search.textContent = 'ค้นหา';
  const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'teacher-button'; reset.textContent = 'ล้างตัวกรอง';
  actions.append(search, reset); form.append(actions);
  const summary = document.createElement('p'); summary.className = 'teacher-search-count'; summary.setAttribute('role', 'status'); summary.setAttribute('aria-live', 'polite'); form.after(summary);
  let applied = { search: '', year: '', semester: '', major: '' }, locked = true, restoreFocus = null;
  function apply() {
    if (locked) return;
    applied = Object.fromEntries(Object.entries(fields).map(([key, node]) => [key, node.value.trim()]));
    fields.search.value = applied.search; onApply();
  }
  form.addEventListener('submit', event => { event.preventDefault(); apply(); });
  for (const key of ['year', 'semester', 'major']) fields[key].addEventListener('change', apply);
  status?.addEventListener('change', apply);
  reset.addEventListener('click', () => {
    if (locked) return;
    for (const node of Object.values(fields)) node.value = '';
    if (status) status.value = initialStatus;
    apply();
  });
  for (const node of form.querySelectorAll('input, select, button')) node.disabled = true;
  return {
    summary,
    query: () => ({ ...applied, metadata: '1' }), active: () => Object.values(applied).some(Boolean),
    setLoading(value) { search.classList.toggle('is-loading', value); search.setAttribute('aria-busy', String(value)); search.textContent = value ? 'กำลังโหลด...' : 'ค้นหา'; },
    setBusy(value) {
      if (value && !locked) restoreFocus = form.contains(document.activeElement) ? document.activeElement : null;
      locked = value;
      for (const node of form.querySelectorAll('input, select, button')) node.disabled = value;
      if (!value && restoreFocus) {
        if (document.activeElement === document.body) restoreFocus.focus({ preventScroll: true });
        restoreFocus = null;
      }
    },
    loading() { summary.textContent = ''; },
    update(result) {
      if (!Number.isInteger(result?.total)) return;
      const previous = fields.year.value;
      // All choices originate from scoped DB metadata (or an earlier DB choice
      // still selected). Always normalize and numerically sort after merging.
      const years = [...new Set([...(result.years || []), ...(previous ? [previous] : [])].map(Number)
        .filter(year => Number.isInteger(year) && year > 0 && year <= 9999))].sort((a, b) => b - a);
      fields.year.replaceChildren();
      for (const [value, text] of [...yearChoices, ...years.map(year => [String(year), String(year)])]) {
        const option = document.createElement('option'); option.value = value; option.textContent = text; fields.year.append(option);
      }
      fields.year.value = previous;
      const start = result.total ? result.offset + 1 : 0, end = Math.min(result.offset + pageSize(), result.total);
      summary.textContent = `พบ ${result.total} รายการ · แสดง ${start}–${end} รายการ`;
    },
  };
}
