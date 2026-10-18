// Explicit presentation states come from the existing workflow's request result.
// This helper never fetches, changes a filter, or replaces a mounted list/form.
export function createTeacherListPresentation({ document, list, message, refresh, emptyTitle, emptyDescription, picker }) {
  if (document.body.dataset.workflowRole !== 'teacher') return { setState() {} };
  const pagination = list.parentElement.querySelector('.teacher-pagination');
  const root = document.createElement('div'); root.className = 'teacher-list-state';
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) icon.setAttribute(key, value);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); icon.append(path);
  const title = document.createElement('h3'), description = document.createElement('p');
  const action = document.createElement('button'); action.type = 'button'; action.className = 'teacher-button';
  action.addEventListener('click', () => refresh.click());
  root.append(icon, title, description, action); list.before(root);

  function setState(state, { count = 0, filtered = false, pageable = false, retry = true } = {}) {
    const empty = state === 'ready' && count === 0;
    root.hidden = state === 'ready' && !empty;
    root.dataset.state = empty ? (filtered ? 'filtered' : 'empty') : state;
    if (pagination) pagination.hidden = state !== 'ready' || !count || !pageable;
    if (picker) picker.hidden = state !== 'ready' || !count;
    // Keep the existing live message, but avoid repeating empty/loading copy visually.
    message.classList.toggle('teacher-message--assistive', (empty || state === 'loading') && message.dataset.type !== 'success');
    action.hidden = state === 'loading' || (state === 'error' && !retry);
    if (state === 'loading') {
      path.setAttribute('d', 'M24 8a16 16 0 1 1-16 16');
      title.textContent = 'กำลังโหลดข้อมูล'; description.textContent = 'กรุณารอสักครู่ ระบบกำลังตรวจสอบรายการของคุณ';
    } else if (state === 'error') {
      path.setAttribute('d', 'M24 7 44 41H4L24 7ZM24 18v11M24 34v1');
      title.textContent = 'ยังแสดงรายการไม่ได้'; description.textContent = 'โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบข้อความแจ้งเตือนแล้วลองอีกครั้ง';
      action.textContent = 'ลองโหลดอีกครั้ง';
    } else if (empty) {
      path.setAttribute('d', filtered ? 'M21 34a13 13 0 1 0 0-26 13 13 0 0 0 0 26ZM31 31l10 10M16 21h10' : 'M14 6h14l9 9v27H11V6h3ZM28 6v10h9M18 24h12M18 31h8');
      title.textContent = filtered ? 'ไม่พบรายการในสถานะที่เลือก' : emptyTitle;
      description.textContent = filtered ? 'ลองเลือกสถานะอื่น หรือรีเฟรชเพื่อตรวจสอบรายการล่าสุด' : emptyDescription;
      action.textContent = 'รีเฟรชรายการ';
    }
  }
  setState('loading');
  return { setState };
}
