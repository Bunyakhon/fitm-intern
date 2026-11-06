// Student Profile only. Calendar arithmetic uses UTC components, never ISO-to-local conversion.
const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const weekdays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const pad = value => String(value).padStart(2, "0");
const iso = (year, month, day) => `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
const dateAt = (year, month, day) => { const date = new Date(0); date.setUTCFullYear(year, month - 1, day); return date; };
const parts = date => [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
function parse(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const result = value.split("-").map(Number);
  return result[0] >= 1 && iso(...parts(dateAt(...result))) === value ? result : null;
}
export function profileCalendarToday(now = new Date()) {
  const values = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = type => values.find(value => value.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function mountProfileBirthCalendar({ document, input, group }) {
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const button = (text, label) => { const element = node("button", text); element.type = "button"; if (label) element.setAttribute("aria-label", label); return element; };
  input.type = "text"; input.placeholder = "YYYY-MM-DD (ค.ศ.)"; input.inputMode = "numeric"; input.autocomplete = "bday";
  const wrapper = group; wrapper.classList.add("profile-birth-calendar");
  const toggle = button("เลือกวันเกิด", "เปิดปฏิทินวันเกิด"); toggle.className = "btn-secondary profile-calendar-toggle";
  const popup = node("div", undefined, "profile-calendar-popup"); popup.id = input.id + "-calendar"; popup.hidden = true;
  popup.setAttribute("role", "dialog"); popup.setAttribute("aria-modal", "false");
  toggle.setAttribute("aria-controls", popup.id); toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-haspopup", "dialog");
  const heading = node("p", "", "profile-calendar-heading"); heading.id = popup.id + "-heading"; heading.setAttribute("aria-live", "polite"); popup.setAttribute("aria-labelledby", heading.id);
  const help = node("p", "เลือกปี ค.ศ. ได้โดยตรง · ปุ่มลูกศรเลื่อนวัน · Page Up/Down เปลี่ยนเดือน · Escape ปิด", "profile-calendar-help");
  help.id = popup.id + "-help"; popup.setAttribute("aria-describedby", help.id);
  const controls = node("div", undefined, "profile-calendar-controls");
  const previous = button("‹", "เดือนก่อนหน้า"), next = button("›", "เดือนถัดไป");
  const monthSelect = node("select"), yearSelect = node("select"); monthSelect.setAttribute("aria-label", "เดือนเกิด"); yearSelect.setAttribute("aria-label", "ปีเกิด ค.ศ.");
  months.forEach((name, index) => { const option = node("option", name); option.value = String(index + 1); monthSelect.append(option); });
  let yearsThrough = 0;
  function today() {
    const value = profileCalendarToday(), year = Number(value.slice(0, 4));
    if (year !== yearsThrough) {
      yearSelect.replaceChildren();
      // No arbitrary age cutoff: retain every year allowed by the existing date contract.
      for (let candidate = year; candidate >= 1; candidate--) { const option = node("option", String(candidate)); option.value = String(candidate); yearSelect.append(option); }
      yearsThrough = year;
    }
    return value;
  }
  controls.append(previous, monthSelect, yearSelect, next);
  const grid = node("div", undefined, "profile-calendar-grid"); grid.setAttribute("role", "grid"); grid.setAttribute("aria-labelledby", heading.id);
  const footer = node("div", undefined, "profile-calendar-footer"), clear = button("ล้างวันเกิด"), close = button("ปิดปฏิทิน");
  footer.append(clear, close); popup.append(heading, controls, grid, help, footer);
  wrapper.append(toggle, popup);
  let focused = null, view = null, rendering = false;
  function hide(returnFocus = false) { popup.hidden = true; toggle.setAttribute("aria-expanded", "false"); if (returnFocus) toggle.focus(); }
  function commit(value) {
    if (input.disabled) return;
    input.value = value;
    const EventClass = document.defaultView.Event;
    input.dispatchEvent(new EventClass("input", { bubbles: true }));
    input.dispatchEvent(new EventClass("change", { bubbles: true }));
    hide(true);
  }
  function render(focusDay = false) {
    rendering = true;
    const maximum = today(), [year, month] = view;
    monthSelect.value = String(month); yearSelect.value = String(year);
    heading.textContent = `${months[month - 1]} ค.ศ. ${year}`;
    previous.disabled = year === 1 && month === 1;
    next.disabled = iso(year, month, 1).slice(0, 7) >= maximum.slice(0, 7);
    grid.replaceChildren();
    const headers = node("div", undefined, "profile-calendar-week"); headers.setAttribute("role", "row");
    weekdays.forEach(day => { const cell = node("span", day); cell.setAttribute("role", "columnheader"); headers.append(cell); }); grid.append(headers);
    const offset = dateAt(year, month, 1).getUTCDay(), count = dateAt(year, month + 1, 0).getUTCDate();
    let active;
    for (let index = 0; index < Math.ceil((offset + count) / 7) * 7; index++) {
      if (index % 7 === 0) { const row = node("div", undefined, "profile-calendar-week"); row.setAttribute("role", "row"); grid.append(row); }
      const cell = node("div"); cell.setAttribute("role", "gridcell"); grid.children[grid.children.length - 1].append(cell);
      const day = index - offset + 1;
      if (day < 1 || day > count) continue;
      const value = iso(year, month, day), selected = value === input.value, isToday = value === maximum;
      cell.setAttribute("aria-selected", String(selected));
      const dayButton = button(String(day), `${day} ${months[month - 1]} ค.ศ. ${year}${selected ? " เลือกอยู่" : ""}`);
      dayButton.dataset.date = value; dayButton.disabled = value > maximum; dayButton.tabIndex = value === focused ? 0 : -1;
      if (isToday) dayButton.setAttribute("aria-current", "date");
      if (selected) dayButton.className = "is-selected";
      dayButton.addEventListener("focus", () => {
        focused = value;
        for (const other of grid.querySelectorAll("button")) other.tabIndex = other === dayButton ? 0 : -1;
      });
      dayButton.addEventListener("click", () => commit(value));
      cell.append(dayButton); if (value === focused) active = dayButton;
    }
    if (focusDay) active?.focus();
    rendering = false;
  }
  function show() {
    if (input.disabled) return;
    const maximum = today(), selected = parse(input.value);
    focused = selected && input.value <= maximum ? input.value : maximum; view = parse(focused).slice(0, 2);
    popup.hidden = false; toggle.setAttribute("aria-expanded", "true"); render(true);
  }
  function moveMonth(delta) {
    const maximum = today(), [year, month, day] = parse(focused);
    const base = dateAt(year, month + delta, 1), [newYear, newMonth] = parts(base);
    if (newYear < 1) return;
    const target = iso(newYear, newMonth, Math.min(day, dateAt(newYear, newMonth + 1, 0).getUTCDate()));
    focused = target > maximum ? maximum : target; view = parse(focused).slice(0, 2);
  }
  previous.addEventListener("click", () => { moveMonth(-1); render(); });
  next.addEventListener("click", () => { moveMonth(1); render(); });
  function chooseMonth() {
    const [oldYear, oldMonth] = view;
    moveMonth((Number(yearSelect.value) - oldYear) * 12 + Number(monthSelect.value) - oldMonth); render();
  }
  monthSelect.addEventListener("change", chooseMonth); yearSelect.addEventListener("change", chooseMonth);
  grid.addEventListener("keydown", event => {
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const date = dateAt(...parse(focused)), weekday = date.getUTCDay();
    let delta = steps[event.key];
    if (event.key === "Home") delta = -weekday;
    if (event.key === "End") delta = 6 - weekday;
    if (event.key === "PageUp" || event.key === "PageDown") moveMonth((event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1));
    else if (delta !== undefined) {
      date.setUTCDate(date.getUTCDate() + delta);
      const value = iso(...parts(date));
      if (date.getUTCFullYear() >= 1 && value <= today()) { focused = value; view = parse(value).slice(0, 2); }
    } else return;
    event.preventDefault(); event.stopPropagation(); render(true);
  });
  toggle.addEventListener("click", () => popup.hidden ? show() : hide());
  clear.addEventListener("click", () => commit("")); close.addEventListener("click", () => hide(true));
  wrapper.addEventListener("keydown", event => {
    if (event.key === "Escape" && !popup.hidden) { event.preventDefault(); event.stopPropagation(); hide(true); }
    if (event.target === input && event.key === "ArrowDown") { event.preventDefault(); show(); }
  });
  wrapper.addEventListener("focusout", event => { if (!rendering && !wrapper.contains(event.relatedTarget)) hide(); });
  document.addEventListener("pointerdown", event => { if (!wrapper.contains(event.target)) hide(); });
  input.addEventListener("input", () => { if (!popup.hidden) { const selected = parse(input.value); if (selected && input.value <= today()) { focused = input.value; view = selected.slice(0, 2); } render(); } });
  // Observe ancestor visibility so switching tabs never leaves an invisible open popup.
  const Observer = document.defaultView?.MutationObserver;
  if (Observer) new Observer(() => { if (!input.getClientRects().length) hide(); }).observe(group.closest('[role="tabpanel"]') || group, { attributes: true, attributeFilter: ["hidden", "class"] });
  return { refresh() { if (!popup.hidden) { hide(); } toggle.disabled = input.disabled; }, close: hide };
}
