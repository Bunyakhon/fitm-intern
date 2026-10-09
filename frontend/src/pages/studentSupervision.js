import { getStudentSupervision } from "../api/supervision.api.js";
import { element, renderAppointment, renderAppointmentHistory } from "./supervisionView.js";
import { mountSupervisionResult } from "./supervisionResult.js";
export function initStudentSupervision() {
  const container = document.getElementById("studentSupervisionAppointments"), status = document.getElementById("studentSupervisionStatus");
  let busy = false, sequence = 0;
  const widgets = [], clear = () => widgets.splice(0).forEach(widget => widget.dispose());
  async function load() {
    if (busy || !localStorage.getItem("token")) return;
    clear(); busy = true; const ticket = ++sequence; container.replaceChildren(); status.textContent = "กำลังโหลดนัดนิเทศ...";
    try {
      const result = await getStudentSupervision(); if (ticket !== sequence || !localStorage.getItem("token")) return;
      for (const row of result.appointments) { const card = element(document, "article", "", "supervision-card"), content = document.createElement("div"); renderAppointment(content, row); const history = document.createElement("div"); renderAppointmentHistory(history, result.history.filter(e => e.appointment_id === row.id)); card.append(content, history); container.append(card); widgets.push(mountSupervisionResult({ document, container: card, appointment: row })); }
      status.textContent = result.appointments.length ? "วันเวลาแสดงในเขตเวลา Asia/Bangkok" : "ยังไม่มีนัดนิเทศจากอาจารย์";
    } catch (err) { container.replaceChildren(); status.textContent = err.message; }
    finally { busy = false; }
  }
  document.getElementById("studentSupervisionReload").addEventListener("click", load);
  document.getElementById("logoutBtn").addEventListener("click", () => { clear(); ++sequence; container.replaceChildren(); status.textContent = ""; });
  load();
}
