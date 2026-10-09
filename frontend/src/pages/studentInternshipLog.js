import { getLogOverview, saveDailyLog, submitLogWeek, resendMentorLink } from "../api/internshipLogs.api.js";
import { showToast, showConfirmModal, setButtonLoading } from "../ui/feedback.js";
import { fields, labels, displayDate, renderHistory } from "./internshipLogView.js";
export function initStudentInternshipLog() {
  const $ = id => document.getElementById(id), panel = $("panel-daily");
  if (!panel || !$("dailyWeekDate")) return;
  let data = null, selected = null, busy = false, sequence = 0, originalEditor = "";
  const editorValues = () => JSON.stringify([$("dailyKind").value, ...[...Object.keys(fields), "non_working_reason"].map(key => $("daily_" + key).value)]);
  const status = message => { $("dailyStatus").textContent = message; };
  function revokeOnAuthError(error) {
    if (![401, 403].includes(error.status)) return;
    sequence++; data = null; selected = null; $("dailyEditor").hidden = true; $("submitDailyWeek").disabled = true;
    $("dailyLogTableBody").replaceChildren(); $("dailyHistory").replaceChildren(); $("dailyWeekSummary").textContent = ""; $("dailyCount").textContent = "0";
  }
  const isFrozen = () => data?.submission && data.submission.status !== "revision_requested";
  const bangkokDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  $("dailyWeekDate").value = bangkokDate;
  async function load() {
    const request = ++sequence; data = null; $("submitDailyWeek").disabled = true; $("dailyEditor").hidden = true;
    status("กำลังโหลดบันทึก..."); $("dailyLogTableBody").replaceChildren(); $("dailyHistory").replaceChildren(); $("dailyWeekSummary").textContent = "";
    try {
      const result = await getLogOverview($("dailyWeekDate").value);
      if (request !== sequence) return; data = result;
      $("dailyCount").textContent = result.total_logs;
      $("dailyWeekSummary").textContent = `${displayDate(result.week.start)} – ${displayDate(result.week.end)} · ${result.logs.length}/${result.required_dates.length} วัน · ${labels[result.submission?.status] || "ฉบับร่าง"}`;
      status(result.missing_dates.length ? `วันที่ยังขาด: ${result.missing_dates.map(displayDate).join(", ")}` : result.required_dates.length ? "บันทึกครบวันที่ต้องมีแล้ว" : "สัปดาห์นี้อยู่นอกช่วงฝึกงาน");
      for (const date of result.required_dates) {
        const log = result.logs.find(l => l.log_date === date), row = document.createElement("tr");
        for (const value of [displayDate(date), log ? log.kind === "non_working" ? log.non_working_reason : log.assigned_work : "—", log ? labels[result.submission?.status || "draft"] : "ยังไม่ได้บันทึก"]) { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); }
        const cell = document.createElement("td"), button = document.createElement("button"); button.type = "button"; button.className = "btn-secondary"; button.textContent = log ? isFrozen() ? "ดูบันทึก" : "แก้ไข" : "บันทึก";
        button.disabled = date > result.today; button.addEventListener("click", () => edit(date, log)); cell.append(button); row.append(cell); $("dailyLogTableBody").append(row);
      }
      $("submitDailyWeek").disabled = !!isFrozen() || !result.required_dates.length || !!result.missing_dates.length || result.required_dates.at(-1) > result.today;
      renderHistory($("dailyHistory"), result.history);
    } catch (error) { if (request === sequence) { revokeOnAuthError(error); status(error.message || "โหลดบันทึกไม่สำเร็จ กรุณาลองใหม่"); } }
  }
  function edit(date, log) {
    if (busy) return; selected = log || null; $("dailyDate").value = date; $("dailyKind").value = log?.kind || "working";
    for (const key of [...Object.keys(fields), "non_working_reason"]) $("daily_" + key).value = log?.[key] || "";
    $("dailyFieldset").disabled = !!isFrozen(); $("saveDailyLogBtn").disabled = !!isFrozen(); $("dailyEditor").hidden = false;
    $("dailyEntryDate").textContent = `ประจำวันที่ ${displayDate(date)}${date < data.today && !log ? " · บันทึกย้อนหลังได้" : ""}`; toggleKind(); originalEditor = editorValues(); $("dailyEditor").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function toggleKind() { const nonworking = $("dailyKind").value === "non_working"; $("dailyWorkingFields").hidden = nonworking; $("dailyNonWorkingFields").hidden = !nonworking; }
  $("dailyKind").addEventListener("change", toggleKind);
  $("dailyWeekDate").addEventListener("change", load); $("dailyReload").addEventListener("click", load);
  $("dailyForm").addEventListener("submit", async event => {
    event.preventDefault(); if (busy || !data || isFrozen()) return;
    const body = { kind: $("dailyKind").value, notes: $("daily_notes").value, ...(selected && { version: selected.version }) };
    if (body.kind === "working") for (const key of Object.keys(fields).filter(k => k !== "notes")) body[key] = $("daily_" + key).value;
    else body.non_working_reason = $("daily_non_working_reason").value;
    busy = true; $("dailyFieldset").disabled = true; setButtonLoading($("saveDailyLogBtn"), true, "กำลังบันทึก...");
    try { await saveDailyLog($("dailyDate").value, body, !!selected); showToast("บันทึกประจำวันแล้ว", "success"); await load(); }
    catch (error) { revokeOnAuthError(error); status(error.message); showToast(error.message, "error"); if (error.status === 409) await load(); }
    finally { busy = false; $("dailyFieldset").disabled = !!isFrozen(); setButtonLoading($("saveDailyLogBtn"), false); }
  });
  $("submitDailyWeek").addEventListener("click", () => {
    if (!data || busy || isFrozen()) return;
    if (!$("dailyEditor").hidden && originalEditor !== editorValues()) { showToast("กรุณาบันทึกการแก้ไขรายวันก่อนส่งประจำสัปดาห์", "warning"); return; }
    const current = data;
    showConfirmModal({ title: "ส่งบันทึกประจำสัปดาห์ให้พี่เลี้ยง", message: `${displayDate(current.week.start)} – ${displayDate(current.week.end)}\nรวม ${current.logs.length} วัน:\n${current.logs.map(l => `${displayDate(l.log_date)} · ${(l.kind === "non_working" ? l.non_working_reason : l.assigned_work).slice(0, 100)}`).join("\n")}\nหลังส่งจะล็อกบันทึกจนกว่าพี่เลี้ยงขอแก้ไข`, confirmLabel: "ส่งทั้งสัปดาห์", onConfirm: async () => {
      if (busy || data !== current) return; busy = true;
      try { const result = await submitLogWeek(current.week.start, current.submission?.version || 0); showToast(result.email_sent ? "ส่งบันทึกและอีเมลพี่เลี้ยงแล้ว" : "บันทึกถูกส่งแล้ว แต่อีเมลส่งไม่สำเร็จ กดส่งลิงก์อีกครั้งได้", result.email_sent ? "success" : "warning"); await load(); }
      catch (error) { revokeOnAuthError(error); status(error.message); showToast(error.message, "error"); await load(); } finally { busy = false; }
    } });
  });
  $("dailyResendLink").addEventListener("click", async () => {
    if (busy) return; busy = true; setButtonLoading($("dailyResendLink"), true, "กำลังส่ง...");
    try { const result = await resendMentorLink(); showToast(result.email_sent ? "ส่งลิงก์ใหม่ให้พี่เลี้ยงแล้ว" : "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่", result.email_sent ? "success" : "error"); } catch (error) { showToast(error.message, "error"); } finally { busy = false; setButtonLoading($("dailyResendLink"), false); }
  });
  document.querySelector('[data-target="panel-daily"]')?.addEventListener("click", load);
  load();
}
