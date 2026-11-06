import { canUseCoopFeatures } from "./studentDashboardAccess.js";

const active = new Set(["submitted", "staff_review", "advisor_review", "department_head_review", "approved", "document_issued", "in_progress"]);
export function selectOverviewRequest(rows) {
  const history = [...rows].sort((a, b) => (Date.parse(b.submitted_at) || 0) - (Date.parse(a.submitted_at) || 0)
    || (Date.parse(b.created_at || b.createdAt) || 0) - (Date.parse(a.created_at || a.createdAt) || 0)
    || String(a.id).localeCompare(String(b.id)));
  return history.find(row => active.has(row.status)) || history[0] || null;
}

export function mountStudentOverview({ document, list, getToken, statusLabel, formatDate }) {
  const get = id => document.getElementById(id), root = get("coopOverview"), count = get("requestCount"),
    message = get("coopOverviewStatus"), empty = get("coopOverviewEmpty"), details = get("coopOverviewDetails"), retry = get("coopOverviewRetry");
  let serial = 0, owner = null, boundToken = null;
  const live = token => !!token && token === boundToken && token === getToken();
  function state(kind, text) {
    root.dataset.state = kind; root.setAttribute("aria-busy", String(kind === "loading"));
    message.setAttribute("role", kind === "error" ? "alert" : "status"); message.textContent = text;
    count.textContent = "—"; empty.hidden = true; details.hidden = true; details.replaceChildren();
    retry.hidden = kind !== "error"; retry.disabled = kind === "loading";
  }
  function clear() { ++serial; owner = null; boundToken = null; state("idle", "กำลังตรวจสอบบัญชีนักศึกษา"); }
  function render(rows) {
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== "string" || row.student_id !== owner.id || typeof row.status !== "string")) throw new Error("Invalid owner request response");
    state(rows.length ? "success" : "empty", rows.length ? "ข้อมูลจากคำร้องสหกิจศึกษาของคุณ" : "ยังไม่มีคำร้องสหกิจศึกษา");
    count.textContent = String(rows.length); empty.hidden = rows.length > 0;
    const row = selectOverviewRequest(rows); if (!row) return;
    details.hidden = false;
    const period = row.work_start_date && row.work_end_date ? `${formatDate(row.work_start_date)} – ${formatDate(row.work_end_date)}` : "—";
    for (const [label, value] of [["สถานประกอบการตามคำร้อง", row.company_name], ["จังหวัด", row.company_province],
      [active.has(row.status) ? "สถานะคำร้องปัจจุบัน" : "สถานะคำร้องล่าสุด", statusLabel(row.status)], ["ช่วงปฏิบัติงานตามคำร้อง", period]]) {
      const item = document.createElement("div"); item.className = "info-item";
      const title = document.createElement("span"), content = document.createElement("strong");
      title.textContent = label; content.textContent = typeof value === "string" && value.trim() ? value : "—";
      item.append(title, content); details.append(item);
    }
  }
  function fail(token) { if (!live(token)) return; ++serial; state("error", "โหลดข้อมูลคำร้องไม่สำเร็จ กรุณาลองอีกครั้ง"); }
  function accept(rows, token) {
    if (!live(token) || !canUseCoopFeatures(owner)) return false;
    ++serial;
    try { render(rows); return true; } catch { fail(token); return false; }
  }
  async function load(student) {
    const token = getToken(), ticket = ++serial; owner = student; boundToken = token;
    if (!token || !student?.id) { clear(); return false; }
    if (!canUseCoopFeatures(student)) { state("unavailable", "ข้อมูลส่วนนี้สำหรับนักศึกษาสหกิจศึกษา"); return true; }
    state("loading", "กำลังโหลดข้อมูลคำร้อง...");
    try {
      const result = await list();
      if (ticket !== serial || !live(token)) return false;
      render(result?.data); return true;
    } catch { if (ticket === serial && live(token)) fail(token); return false; }
  }
  retry.addEventListener("click", () => { if (live(boundToken)) return load(owner); clear(); });
  clear();
  return { load, clear, accept, fail };
}
