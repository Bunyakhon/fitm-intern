export const appointmentStatus = { pending_confirmation: "รอพี่เลี้ยงยืนยัน", confirmed: "พี่เลี้ยงยืนยันแล้ว" };
export function appointmentDate(value) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}
export function bangkokInputs(value) {
  const parts = new Date(new Date(value).getTime() + 7 * 3600000).toISOString();
  return { date: parts.slice(0, 10), time: parts.slice(11, 16) };
}
export function element(document, tag, text, className) {
  const node = document.createElement(tag); node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function renderAppointment(container, row) {
  const document = container.ownerDocument, s = row.snapshot, mentor = s.attending_mentor;
  container.replaceChildren();
  for (const text of [
    `นิเทศครั้งที่ ${row.visit_number} · ${appointmentStatus[row.status] || row.status} · ฉบับ ${row.version}`,
    `${appointmentDate(row.scheduled_at)} (Asia/Bangkok)`, `${s.student.name} · ${s.student.code}`,
    `บริษัท: ${s.company.name} · ${s.company.address || "-"}`, `อาจารย์นิเทศ: ${s.teacher.name}`,
    `${s.is_substitute ? "พี่เลี้ยงแทน" : "พี่เลี้ยง"}: ${mentor.first_name} ${mentor.last_name} · ${mentor.position} · ${mentor.email}`,
    ...(s.is_substitute ? [`เหตุผลใช้พี่เลี้ยงแทน: ${mentor.reason}`, `พี่เลี้ยงเดิม: ${s.original_mentor.first_name} ${s.original_mentor.last_name}`] : []),
    `หมายเหตุ: ${row.notes || "-"}`, ...(row.confirmed_at ? [`ยืนยันเมื่อ: ${appointmentDate(row.confirmed_at)}`] : []),
  ]) container.append(element(document, "p", text));
}
export function renderAppointmentHistory(container, history) {
  const document = container.ownerDocument; container.replaceChildren();
  const actions = { scheduled: "สร้างนัด", rescheduled: "แก้ไข / เลื่อนนัด", confirmed: "ยืนยันนัด" };
  for (const event of history) {
    const card = element(document, "article", "", "supervision-history");
    card.append(element(document, "p", `${actions[event.action]} · ${event.actor_name} · ${appointmentDate(event.created_at)} · ${event.reason || "-"}`));
    const snapshot = document.createElement("details"), title = element(document, "summary", `ข้อมูลนัดฉบับ ${event.version}`), content = document.createElement("div");
    renderAppointment(content, event.snapshot); snapshot.append(title, content); card.append(snapshot); container.append(card);
  }
}
