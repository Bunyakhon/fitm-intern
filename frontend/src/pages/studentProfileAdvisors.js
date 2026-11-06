// Read-only presentation. Class and project advisor identities remain separate.
export function renderProfileAdvisors(document, student, { loaded = false, request = {}, confirmed = null } = {}) {
  const name = teacher => teacher?.name || [teacher?.academic_title, teacher?.first_name, teacher?.last_name].filter(Boolean).join(" ");
  const classNode = document.getElementById("profileClassAdvisor");
  if (classNode) classNode.textContent = student?.advisorTeacher ? name(student.advisorTeacher)
    : student?.advisor_teacher_id ? "ยังโหลดชื่ออาจารย์ประจำชั้นไม่ได้" : "ยังไม่ได้เลือกอาจารย์ที่ปรึกษาประจำชั้น";
  const projectNode = document.getElementById("profileProjectAdvisor");
  if (!projectNode) return;
  const labels = { none: "ยังไม่ได้เลือกอาจารย์ที่ปรึกษาโครงการ", pending: "รออาจารย์ตอบรับ", confirmed: "อาจารย์ตอบรับแล้ว", rejected: "อาจารย์ปฏิเสธคำขอ" };
  if (!loaded) { projectNode.textContent = "ยังไม่มีข้อมูลอาจารย์โครงการล่าสุด ตรวจสอบได้ในเมนูจัดการโครงการ"; return; }
  const teacher = confirmed || request.teacher;
  const status = confirmed ? "confirmed" : request.status;
  projectNode.textContent = [teacher && name(teacher), labels[status] || "ยังโหลดสถานะไม่ได้"].filter(Boolean).join(" · ");
}
