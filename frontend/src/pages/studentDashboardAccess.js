// These controls mirror existing server capabilities; backend RBAC remains authoritative.
const coopPanels = new Set(["panel-request", "panel-coop", "panel-report-upload", "panel-daily", "panel-evaluate", "panel-transfer"]);
export const supportsStudentDashboard = student => student?.track === "co_op";
export const canUseCoopFeatures = student => student?.track === "co_op";
export const canOpenStudentPanel = (student, panel) => supportsStudentDashboard(student) && (!coopPanels.has(panel) || canUseCoopFeatures(student));

export function applyStudentDashboardAccess(document, student) {
  const coop = canUseCoopFeatures(student);
  for (const item of document.querySelectorAll(".sidebar-item[data-target]")) {
    if (!coopPanels.has(item.dataset.target)) continue;
    item.disabled = !coop;
    item.title = coop ? "" : "สำหรับนักศึกษาสหกิจศึกษาเท่านั้น";
    item.setAttribute("aria-disabled", String(!coop));
  }
  for (const id of coopPanels) {
    const panel = document.getElementById(id);
    if (panel) panel.hidden = !coop;
  }
  const supervision = document.getElementById("studentSupervisionStatus")?.closest("section");
  if (supervision) supervision.hidden = !coop;
  if (!coop) document.getElementById("dailyCount").textContent = "—";
}
