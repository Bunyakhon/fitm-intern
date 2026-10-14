import { getLogOverview, saveDailyLog, submitLogWeek, resendMentorLink } from "../api/internshipLogs.api.js";
import { getMyMentor } from "../api/mentor.api.js";
import { showToast, showConfirmModal, setButtonLoading } from "../ui/feedback.js";
import { fields, displayDate, renderEntries } from "./internshipLogView.js";

// Presentation only: the API continues to validate dates, versions and permissions.
const weekLabels = { draft: "ร่างบันทึก", submitted: "รอพี่เลี้ยงตรวจ", reviewed: "พี่เลี้ยงตรวจแล้ว", revision_requested: "ขอให้แก้ไข" };
const dateTime = value => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
const validTime = value => value && Number.isFinite(new Date(value).getTime());

export function initStudentInternshipLog() {
  const $ = id => document.getElementById(id), panel = $("panel-daily");
  if (!panel || !$("dailyWeekDate") || panel.dataset.logInitialized) return;
  panel.dataset.logInitialized = "true";
  let data = null, mentor = null, mentorUnavailable = false, selected = null;
  let busy = false, loading = false, sequence = 0, originalEditor = "", loadedDate = "";
  const buttonMarkup = new Map();
  const editorValues = () => JSON.stringify([$("dailyKind").value, ...[...Object.keys(fields), "non_working_reason"].map(key => $("daily_" + key).value)]);
  const dirty = () => !$("dailyEditor").hidden && originalEditor !== editorValues();
  const isFrozen = () => data?.submission && data.submission.status !== "revision_requested";
  const mentorVerified = () => mentor?.status === "verified" && !!mentor.verified_at;
  const nextDate = () => !isFrozen() && data?.required_dates.find(date => date <= data.today && !data.logs.some(log => log.log_date === date));
  const status = (message, tone = "info") => { $("dailyStatus").textContent = message; $("dailyStatus").dataset.tone = tone; };
  function node(tag, className, text) {
    const element = document.createElement(tag); element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function badge(value, label) { return node("span", `daily-badge daily-badge-${Object.hasOwn(weekLabels, value) || value === "non_working" ? value : "neutral"}`, label); }
  function buttonLoading(id, active, label) {
    const button = $(id);
    if (!buttonMarkup.has(id)) buttonMarkup.set(id, button.innerHTML);
    setButtonLoading(button, active, label);
    if (!active) button.innerHTML = buttonMarkup.get(id);
  }
  function syncControls() {
    const locked = busy || loading;
    const incomplete = !data?.required_dates.length || !!data?.missing_dates.length || data?.required_dates.at(-1) > data?.today;
    $("dailyWeekDate").disabled = locked; $("dailyReload").disabled = locked;
    $("submitDailyWeek").disabled = locked || !data || !!isFrozen() || incomplete || !mentorVerified();
    $("dailyResendLink").disabled = locked || !data || !mentorVerified();
    $("dailyAddLog").disabled = locked || !nextDate();
    $("dailyFieldset").disabled = locked || !data || !!isFrozen();
    $("saveDailyLogBtn").disabled = locked || !data || !!isFrozen();
    for (const button of $("dailyLogTableBody").querySelectorAll("button")) button.disabled = locked || !data || button.dataset.logDate > data.today;
    panel.setAttribute("aria-busy", String(locked));
    if (!data) return;
    $("dailyActionHelp").textContent = isFrozen()
      ? data.submission.status === "reviewed" ? "พี่เลี้ยงตรวจแล้ว บันทึกสัปดาห์นี้ถูกล็อกและเปิดดูรายละเอียดได้"
        : data.submission.status === "submitted" ? "ส่งบันทึกแล้ว บันทึกถูกล็อกจนกว่าพี่เลี้ยงขอให้แก้ไข" : "ไม่สามารถตรวจสอบสถานะการส่งได้ เปิดดูรายละเอียดได้และกรุณาโหลดใหม่ก่อนดำเนินการ"
      : !data.required_dates.length ? "สัปดาห์นี้อยู่นอกช่วงฝึกงาน จึงไม่มีบันทึกที่ต้องส่ง"
      : !mentorVerified() ? mentorUnavailable ? "ยังตรวจสอบข้อมูลพี่เลี้ยงไม่ได้ กรุณาโหลดใหม่ก่อนส่งบันทึก" : "ต้องมีพี่เลี้ยงที่ยืนยันข้อมูลแล้วก่อนส่งบันทึกและส่งลิงก์ตรวจ"
      : data.missing_dates.length ? `กรุณาบันทึกให้ครบอีก ${data.missing_dates.length} วันก่อนส่งประจำสัปดาห์`
      : data.required_dates.at(-1) > data.today ? "ส่งได้เมื่อถึงวันสุดท้ายที่ต้องบันทึกในสัปดาห์นี้ ตามเวลาไทย"
      : "บันทึกครบแล้ว พร้อมส่งทั้งสัปดาห์ให้พี่เลี้ยงตรวจ";
  }
  function clearPrivateData(message) {
    data = null; mentor = null; selected = null;
    $("dailyEditor").hidden = true; $("dailyLogTableBody").replaceChildren(); $("dailyHistory").replaceChildren();
    $("dailyCount").textContent = "0";
    for (const id of ["dailyWeekSummary", "dailySubmissionStatus", "dailyMentorName", "dailyLastUpdated"]) $(id).textContent = message;
    for (const id of ["dailyCompletion", "dailyMentorHint", "dailyUpdatedHint"]) $(id).textContent = "";
    syncControls();
  }
  function revokeOnAuthError(error) {
    if (![401, 403].includes(error.status)) return;
    sequence++; clearPrivateData("ไม่สามารถแสดงข้อมูลได้"); $("dailyTableWrapper").hidden = true;
  }
  function errorMessage(error) {
    const code = error.code || error.data?.code;
    if (code === "INTERNSHIP_PERIOD_REQUIRED") return "ยังไม่สามารถเริ่มบันทึกได้ ต้องมีคำร้องสหกิจศึกษาที่อนุมัติพร้อมช่วงฝึกงานที่ถูกต้อง กรุณาตรวจสอบคำร้องหรือติดต่อเจ้าหน้าที่";
    if (code === "VERIFIED_MENTOR_REQUIRED") return "พี่เลี้ยงยังไม่ได้ยืนยันข้อมูล กรุณาตรวจสอบข้อมูลพี่เลี้ยงก่อนส่งบันทึกหรือส่งลิงก์ตรวจ";
    if (code === "INTERNSHIP_SCHEMA_REQUIRED") return "ระบบบันทึกยังไม่พร้อมให้บริการ กรุณาติดต่อเจ้าหน้าที่และลองใหม่ภายหลัง";
    if (error.status === 401) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";
    if (error.status === 403) return "บัญชีนี้ไม่มีสิทธิ์ใช้งานบันทึกสหกิจศึกษา กรุณาติดต่อเจ้าหน้าที่";
    if (!error.status || error.status >= 500) return "เชื่อมต่อระบบบันทึกไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วกดโหลดใหม่";
    return error.message || "ดำเนินการไม่สำเร็จ กรุณาลองใหม่";
  }
  function emptyState(title, description) {
    $("dailyEmpty").hidden = false; $("dailyEmptyTitle").textContent = title; $("dailyEmptyDescription").textContent = description;
  }
  function renderSummary() {
    const shortDate = value => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(`${value}T00:00:00+07:00`));
    $("dailyWeekSummary").textContent = `${shortDate(data.week.start)} – ${shortDate(data.week.end)}`;
    const weekStatus = data.submission?.status || (data.logs.length ? "draft" : null);
    $("dailySubmissionStatus").replaceChildren(badge(weekStatus, weekStatus ? weekLabels[weekStatus] || "ไม่ทราบสถานะการส่ง" : "ยังไม่ส่ง"));
    $("dailyCompletion").textContent = `${data.logs.filter(log => data.required_dates.includes(log.log_date)).length} / ${data.required_dates.length} วันที่ต้องบันทึก`;
    $("dailyMentorName").textContent = mentorUnavailable ? "ไม่สามารถโหลดข้อมูลพี่เลี้ยง" : mentor ? [mentor.first_name, mentor.last_name].filter(Boolean).join(" ") || "ไม่มีข้อมูลชื่อพี่เลี้ยง" : "ยังไม่มีข้อมูลพี่เลี้ยง";
    $("dailyMentorHint").textContent = mentorUnavailable ? "กดโหลดใหม่เพื่อตรวจสอบอีกครั้ง" : mentor ? [mentor.position, mentorVerified() ? "ยืนยันข้อมูลแล้ว" : "ยังไม่ได้ยืนยันข้อมูล"].filter(Boolean).join(" · ") : "เพิ่มข้อมูลได้ที่เมนูข้อมูลพี่เลี้ยง";
    const timestamps = [...data.logs, data.submission, ...data.history].filter(Boolean).map(item => item.updatedAt || item.createdAt || item.submitted_at).filter(validTime);
    const latest = timestamps.sort((a, b) => new Date(b) - new Date(a))[0];
    $("dailyLastUpdated").textContent = latest ? dateTime(latest) : data.logs.length || data.submission ? "ไม่พบเวลาอัปเดต" : "ยังไม่มีการบันทึก";
    $("dailyUpdatedHint").textContent = latest ? "เวลาไทย · จากข้อมูลบันทึกและการตรวจ" : "ไม่มีเวลาอัปเดตให้แสดง";
  }
  function renderDailyRows() {
    $("dailyLogTableBody").replaceChildren(); $("dailyTableWrapper").hidden = !data.required_dates.length;
    $("dailyEmpty").hidden = !!data.logs.length;
    if (!data.logs.length) emptyState("ยังไม่มีบันทึกการปฏิบัติงานในสัปดาห์นี้", data.required_dates.length ? "เมื่อมีบันทึกการปฏิบัติงาน รายการจะแสดงที่นี่ เลือกวันที่ด้านล่างเพื่อเริ่มบันทึก" : "สัปดาห์นี้อยู่นอกช่วงฝึกงาน เลือกวันที่ในช่วงฝึกงานเพื่อดูหรือเพิ่มบันทึก");
    for (const date of data.required_dates) {
      const log = data.logs.find(item => item.log_date === date), row = node("tr", "daily-row");
      const day = new Intl.DateTimeFormat("th-TH", { weekday: "long", timeZone: "Asia/Bangkok" }).format(new Date(`${date}T00:00:00+07:00`));
      const dateCell = node("td", "daily-date-cell"); dateCell.append(node("strong", "", day), node("span", "daily-muted", displayDate(date)));
      const workCell = node("td", "daily-work-cell");
      if (log) {
        workCell.append(node("p", "daily-work-title", log.kind === "non_working" ? "ไม่ได้ปฏิบัติงาน" : log.assigned_work));
        const description = log.kind === "non_working" ? log.non_working_reason : log.work_result;
        if (description) workCell.append(node("p", "daily-work-preview", description));
      } else workCell.append(node("span", "daily-muted", date > data.today ? "ยังไม่ถึงวันที่บันทึก" : "ยังไม่มีข้อมูลการปฏิบัติงาน"));
      const stateCell = node("td", "daily-state-cell"), weekStatus = data.submission?.status || "draft";
      stateCell.append(badge(log ? weekStatus : null, log ? weekLabels[weekStatus] || "ไม่ทราบสถานะการส่ง" : "ยังไม่ได้บันทึก"));
      if (log?.kind === "non_working") stateCell.append(badge("non_working", "ไม่ได้ปฏิบัติงาน"));
      const cell = node("td", "daily-row-actions"), button = node("button", "btn-secondary", log ? isFrozen() ? "ดูรายละเอียด" : "แก้ไข" : "บันทึก");
      button.type = "button"; button.disabled = date > data.today; button.setAttribute("aria-label", `${button.textContent} ${day} ${displayDate(date)}`);
      button.dataset.logDate = date;
      button.addEventListener("click", () => { if (!busy && !loading) confirmDiscard(() => edit(date, log)); });
      cell.append(button); row.append(dateCell, workCell, stateCell, cell); $("dailyLogTableBody").append(row);
    }
  }
  function renderStudentHistory() {
    const container = $("dailyHistory"); container.replaceChildren();
    if (!data.history.length) {
      const empty = node("div", "empty-state");
      empty.append(node("i", "fa-solid fa-clock-rotate-left daily-empty-icon"), node("h4", "", "ยังไม่มีประวัติการส่งบันทึกประจำสัปดาห์"), node("p", "", "ประวัติการส่งและข้อเสนอแนะจากพี่เลี้ยงจะแสดงที่นี่เมื่อมีการดำเนินการ"));
      empty.children[0].setAttribute("aria-hidden", "true"); container.append(empty); return;
    }
    for (const event of data.history) {
      const article = node("article", "daily-timeline-item"), heading = node("div", "daily-timeline-heading");
      heading.append(node("h4", "", `ครั้งที่ ${event.version}`), badge(event.action, weekLabels[event.action] || "ไม่ทราบสถานะ"));
      article.append(heading, node("p", "daily-muted", `สัปดาห์ ${displayDate(data.week.start)} – ${displayDate(data.week.end)}`));
      article.append(node("p", "daily-muted", `${validTime(event.createdAt) ? dateTime(event.createdAt) : "ไม่มีข้อมูลเวลาที่ดำเนินการ"}${event.mentor_name ? ` · ผู้ตรวจ ${event.mentor_name}` : ""}`));
      if (event.feedback) article.append(node("p", "daily-feedback-box", `ข้อเสนอแนะจากพี่เลี้ยง: ${event.feedback}`));
      if (event.action === "submitted" && Array.isArray(event.snapshot?.logs)) {
        const details = node("details", "daily-history-details"), summary = node("summary", "", "ดูบันทึกที่ส่งในครั้งนี้"), entries = node("div", "");
        renderEntries(entries, event.snapshot.logs); details.append(summary, entries); article.append(details);
      }
      container.append(article);
    }
  }
  function confirmDiscard(proceed) {
    if (!dirty()) return proceed();
    showConfirmModal({ title: "มีบันทึกที่ยังไม่ได้บันทึก", message: "การเปลี่ยนรายการหรือโหลดข้อมูลใหม่จะทำให้ข้อความที่ยังไม่ได้บันทึกหายไป ต้องการดำเนินการต่อหรือไม่", confirmLabel: "ดำเนินการต่อ", onConfirm: proceed });
  }
  const bangkokDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  $("dailyWeekDate").value = bangkokDate;
  async function load() {
    if (loading) return;
    const request = ++sequence; loading = true; loadedDate = $("dailyWeekDate").value;
    clearPrivateData("กำลังโหลด…"); $("dailyTableWrapper").hidden = true; $("dailyEmpty").hidden = true;
    $("dailyActionHelp").textContent = "กำลังตรวจสอบข้อมูลสำหรับการส่งบันทึก";
    status("กำลังโหลดบันทึก..."); buttonLoading("dailyReload", true, "กำลังโหลด..."); syncControls();
    try {
      const result = await getLogOverview(loadedDate); if (request !== sequence) return;
      // Overview has no mentor fields. Reuse the existing read-only mentor API.
      mentorUnavailable = false;
      try { mentor = (await getMyMentor())?.data || null; }
      catch (error) { if ([401, 403].includes(error.status)) throw error; mentor = null; mentorUnavailable = true; }
      if (request !== sequence) return; data = result; $("dailyCount").textContent = result.total_logs;
      renderSummary(); renderDailyRows(); renderStudentHistory();
      const message = result.missing_dates.length ? `วันที่ยังขาด: ${result.missing_dates.map(displayDate).join(", ")}` : result.required_dates.length ? "บันทึกครบวันที่ต้องมีแล้ว" : "สัปดาห์นี้อยู่นอกช่วงฝึกงาน";
      status(`${message}${!mentorVerified() && result.required_dates.length ? mentorUnavailable ? " · ยังตรวจสอบข้อมูลพี่เลี้ยงไม่ได้" : " · ต้องมีพี่เลี้ยงที่ยืนยันข้อมูลแล้วก่อนส่งบันทึก" : ""}`, data.submission?.status === "revision_requested" || !mentorVerified() ? "warning" : "info");
    } catch (error) {
      if (request !== sequence) return;
      const message = errorMessage(error), periodRequired = (error.code || error.data?.code) === "INTERNSHIP_PERIOD_REQUIRED";
      clearPrivateData(periodRequired ? "ยังไม่พร้อมเริ่มบันทึก" : "ไม่สามารถโหลดข้อมูลได้"); revokeOnAuthError(error); status(message, periodRequired ? "warning" : "error");
      $("dailyActionHelp").textContent = periodRequired ? "ต้องมีคำร้องที่อนุมัติและช่วงฝึกงานถูกต้องก่อนใช้งาน" : message;
      emptyState(periodRequired ? "ยังไม่พร้อมเริ่มบันทึกการปฏิบัติงาน" : "ยังไม่สามารถแสดงบันทึกได้", periodRequired ? "ตรวจสอบคำร้องสหกิจศึกษาและช่วงฝึกงานได้ที่เมนูยื่นคำร้อง หากข้อมูลไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่" : "ข้อมูลจะปรากฏเมื่อเชื่อมต่อสำเร็จ กรุณากดโหลดใหม่เพื่อลองอีกครั้ง");
      $("dailyHistory").append(node("p", "daily-unavailable", "ยังไม่สามารถแสดงประวัติการส่งได้")); showToast(message, periodRequired ? "warning" : "error");
    } finally { loading = false; buttonLoading("dailyReload", false); syncControls(); }
  }
  function edit(date, log) {
    if (busy || loading || !data || date > data.today) return;
    selected = log || null; $("dailyDate").value = date; $("dailyKind").value = log?.kind || "working";
    for (const key of [...Object.keys(fields), "non_working_reason"]) $("daily_" + key).value = log?.[key] || "";
    $("dailyEditor").hidden = false; syncControls();
    $("dailyEditorTitle").textContent = isFrozen() ? "รายละเอียดบันทึกการปฏิบัติงาน" : log ? "แก้ไขบันทึกการปฏิบัติงาน" : "เพิ่มบันทึกการปฏิบัติงาน";
    $("dailyEntryDate").textContent = `ประจำวันที่ ${displayDate(date)}${date < data.today && !log ? " · บันทึกย้อนหลังได้" : ""}`;
    toggleKind(); originalEditor = editorValues(); $("dailyEditor").scrollIntoView({ block: "nearest", behavior: "smooth" });
    $("dailyEditorTitle").setAttribute("tabindex", "-1"); $("dailyEditorTitle").focus();
  }
  function toggleKind() { const nonworking = $("dailyKind").value === "non_working"; $("dailyWorkingFields").hidden = nonworking; $("dailyNonWorkingFields").hidden = !nonworking; }
  $("dailyKind").addEventListener("change", toggleKind);
  $("dailyAddLog").addEventListener("click", () => { const date = nextDate(); if (!busy && !loading && date) return confirmDiscard(() => edit(date, null)); });
  $("dailyWeekDate").addEventListener("change", () => {
    const date = $("dailyWeekDate").value; $("dailyWeekDate").value = loadedDate; if (!date || busy || loading) return;
    return confirmDiscard(() => { $("dailyWeekDate").value = date; return load(); });
  });
  $("dailyReload").addEventListener("click", () => { if (!busy && !loading) return confirmDiscard(load); });
  $("dailyForm").addEventListener("submit", async event => {
    event.preventDefault(); if (busy || loading || !data || isFrozen()) return;
    const body = { kind: $("dailyKind").value, notes: $("daily_notes").value, ...(selected && { version: selected.version }) };
    if (body.kind === "working") for (const key of Object.keys(fields).filter(key => key !== "notes")) body[key] = $("daily_" + key).value;
    else body.non_working_reason = $("daily_non_working_reason").value;
    busy = true; buttonLoading("saveDailyLogBtn", true, "กำลังบันทึก..."); syncControls(); status("กำลังบันทึกประจำวัน...");
    try { await saveDailyLog($("dailyDate").value, body, !!selected); showToast("บันทึกประจำวันแล้ว", "success"); await load(); }
    catch (error) { revokeOnAuthError(error); const message = errorMessage(error); status(message, "error"); showToast(message, "error"); if (error.status === 409) await load(); }
    finally { busy = false; buttonLoading("saveDailyLogBtn", false); syncControls(); }
  });
  $("submitDailyWeek").addEventListener("click", () => {
    if (!data || busy || loading || $("submitDailyWeek").disabled) return;
    if (dirty()) { showToast("กรุณาบันทึกการแก้ไขรายวันก่อนส่งประจำสัปดาห์", "warning"); return; }
    const current = data;
    showConfirmModal({ title: "ส่งบันทึกประจำสัปดาห์ให้พี่เลี้ยง", message: `${displayDate(current.week.start)} – ${displayDate(current.week.end)}\nรวม ${current.logs.length} วัน:\n${current.logs.map(log => `${displayDate(log.log_date)} · ${(log.kind === "non_working" ? log.non_working_reason : log.assigned_work).slice(0, 100)}`).join("\n")}\nหลังส่งจะล็อกบันทึกจนกว่าพี่เลี้ยงขอแก้ไข`, confirmLabel: "ส่งทั้งสัปดาห์", returnFocus: $("submitDailyWeek"), fallbackFocus: $("dailyReload"), onConfirm: async () => {
      if (busy || loading || data !== current) return; busy = true; buttonLoading("submitDailyWeek", true, "กำลังส่ง..."); syncControls(); status("กำลังส่งบันทึกประจำสัปดาห์...");
      try { const result = await submitLogWeek(current.week.start, current.submission?.version || 0); showToast(result.email_sent ? "ส่งบันทึกและอีเมลพี่เลี้ยงแล้ว" : "บันทึกถูกส่งแล้ว แต่อีเมลส่งไม่สำเร็จ กดส่งลิงก์อีกครั้งได้", result.email_sent ? "success" : "warning"); await load(); }
      catch (error) { revokeOnAuthError(error); const message = errorMessage(error); status(message, "error"); showToast(message, "error"); await load(); }
      finally { busy = false; buttonLoading("submitDailyWeek", false); syncControls(); }
    } });
  });
  $("dailyResendLink").addEventListener("click", async () => {
    if (busy || loading || $("dailyResendLink").disabled) return;
    busy = true; buttonLoading("dailyResendLink", true, "กำลังส่ง..."); syncControls();
    try { const result = await resendMentorLink(); showToast(result.email_sent ? "ส่งลิงก์ใหม่ให้พี่เลี้ยงแล้ว" : "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่", result.email_sent ? "success" : "error"); }
    catch (error) {
      revokeOnAuthError(error); const message = errorMessage(error); status(message, "error"); showToast(message, "error");
      if (data && (error.code || error.data?.code) === "VERIFIED_MENTOR_REQUIRED") { mentor = null; renderSummary(); }
    } finally { busy = false; buttonLoading("dailyResendLink", false); syncControls(); }
  });
  document.querySelector('[data-target="panel-daily"]')?.addEventListener("click", () => { if (!busy && !loading) return confirmDiscard(load); });
  load();
}
