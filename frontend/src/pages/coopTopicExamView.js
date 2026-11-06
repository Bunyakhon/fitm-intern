export const reviewLabels = { missing: 'ยังไม่ส่งเอกสาร', pending: 'รอตรวจ', needs_revision: 'ต้องแก้ไข', approved: 'ผ่านการตรวจ' };
export const examLabels = { unscheduled: 'รอจัดตาราง', scheduled: 'กำหนดสอบแล้ว', rescheduled: 'เลื่อนสอบ', cancelled: 'ยกเลิกการสอบ', completed: 'สอบเสร็จสิ้น' };
export const roleLabels = { chair: 'ประธานกรรมการ', member: 'กรรมการ', advisor: 'อาจารย์ที่ปรึกษา' };
export const transitions = { unscheduled: ['scheduled','cancelled'], scheduled: ['scheduled','rescheduled','cancelled','completed'], rescheduled: ['rescheduled','scheduled','cancelled','completed'], cancelled: ['scheduled'], completed: [] };
export const name = teacher => teacher ? `${teacher.academic_title || ''}${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() : '-';
export function bangkokInput(value) { return value ? new Date(new Date(value).getTime() + 25200000).toISOString().slice(0,16) : ''; }
export function bangkokISO(value) { return value ? `${value}:00+07:00` : null; }
export function date(value) { return value ? new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-'; }
export function node(document, tag, text, cls) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; }
export function safeLink(document, value, label) {
  let url; try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const link = node(document, 'a', label); link.href = value; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link;
}
export function renderDetail(document, root, detail) {
  root.replaceChildren(); const el = (tag, text) => node(document, tag, text), doc = detail.document, exam = detail.exam;
  const documentCard = node(document, 'section', undefined, 'co09-card'), examCard = node(document, 'section', undefined, 'co09-card');
  root.append(documentCard, examCard); root = documentCard;
  root.append(el('h3', 'CO-09 — ใบยื่นสอบหัวข้อโครงการสหกิจศึกษา'), el('p', `สถานะเอกสาร: ${reviewLabels[doc.review_status] || '-'}`));
  root.append(el('p', doc.file ? `${doc.file.original_name} · อัปโหลด ${date(doc.file.uploaded_at)}` : 'ยังไม่ได้อัปโหลด PDF'));
  if (doc.document_url) { const link = safeLink(document, doc.document_url, 'เปิด URL เอกสาร CO-09'); if (link) root.append(link); }
  if (doc.review_reason) root.append(el('p', `เหตุผลการตรวจ: ${doc.review_reason}`));
  root = examCard;
  root.append(el('h3', 'รายละเอียดการสอบหัวข้อโครงการ'), el('p', `หัวข้อ: ${detail.project?.topic || 'ยังไม่บันทึกหัวข้อโครงการ'}`), el('p', `สถานะสอบ: ${examLabels[exam.status] || '-'}`));
  if (exam.status === 'unscheduled') root.append(el('p', 'ยังไม่มีกำหนดการสอบหัวข้อโครงการ'));
  else {
    root.append(el('p', `${date(exam.starts_at)} – ${date(exam.ends_at)} (Asia/Bangkok)`), el('p', `รูปแบบ: ${exam.mode === 'online' ? 'Online' : 'On-site'} · สถานที่: ${exam.location || '-'}`));
    if (exam.meeting_url) { const link = safeLink(document, exam.meeting_url, 'เปิดห้องประชุมออนไลน์'); if (link) root.append(link); }
    if (exam.reason) root.append(el('p', `เหตุผล: ${exam.reason}`));
    if (exam.notes) root.append(el('p', `หมายเหตุ: ${exam.notes}`));
  }
  root.append(el('h4', 'กรรมการสอบ'));
  if (!exam.committee.length) root.append(el('p', 'ยังไม่ระบุกรรมการสอบ'));
  const list = el('ul'); for (const member of exam.committee) list.append(el('li', `${name(member.teacher)} · ${roleLabels[member.role] || member.role}`)); root.append(list);
  return { documentCard, examCard };
}
