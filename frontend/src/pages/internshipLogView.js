export const labels = { draft: "บันทึกแล้ว", submitted: "ส่งประเมินแล้ว", reviewed: "ตรวจแล้ว", revision_requested: "ต้องแก้ไข" };
export const fields = { assigned_work: "งานที่ได้รับมอบหมาย", work_result: "ผลการปฏิบัติงาน", problems: "ปัญหาและอุปสรรค", solutions: "การแก้ไข", notes: "หมายเหตุ" };
export function displayDate(value) { return new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(new Date(`${value}T00:00:00+07:00`)); }
export function renderEntries(container, logs) {
  container.replaceChildren();
  for (const log of logs) {
    const article = document.createElement("article"); article.className = "internship-entry";
    const title = document.createElement("h3"); title.textContent = displayDate(log.log_date); article.append(title);
    for (const [key, label] of Object.entries(log.kind === "non_working" ? { non_working_reason: "ไม่ได้ปฏิบัติงาน — เหตุผล", notes: "หมายเหตุ" } : fields)) {
      const p = document.createElement("p"); p.textContent = `${label}: ${log[key] || "—"}`; article.append(p);
    }
    container.append(article);
  }
}
export function renderHistory(container, history) {
  container.replaceChildren();
  for (const event of history) {
    const p = document.createElement("p"); p.className = "internship-entry";
    p.textContent = `ครั้งที่ ${event.version} · ${labels[event.action]} · ${new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(event.createdAt))}${event.mentor_name ? ` · ผู้ดูแล ${event.mentor_name}` : ""}${event.feedback ? `\nข้อเสนอแนะจากผู้ดูแล: ${event.feedback}` : ""}`;
    if (event.action === "submitted") {
      const details = document.createElement("details"), summary = document.createElement("summary"), entries = document.createElement("div");
      summary.textContent = "ดูบันทึกที่ส่งในครั้งนี้"; renderEntries(entries, event.snapshot.logs); details.append(summary, entries); container.append(p, details);
    } else container.append(p);
  }
}
