import { node, safeLink, reviewLabels, examLabels, roleLabels, name, date } from './coopTopicExamView.js';
import { setButtonLoading } from '../ui/feedback.js';
import '../styles/student_coop_project.css';

// This view is supplied only by the student project panel. Management keeps its existing view.
const icon = type => `<i class="fa-solid fa-${type}" aria-hidden="true"></i>`;
const loadingMarkup = new WeakMap();
export const studentTopicExamView = {
  template: `<div class="co09-heading"><p class="coop-section-caption">เอกสารและการสอบหัวข้อ</p><button type="button" data-co09="refresh" class="coop-secondary">${icon('rotate-right')} โหลดข้อมูลล่าสุด / ลองใหม่</button></div>
    <p data-co09="message" class="coop-operation-message" role="status" aria-live="polite" aria-atomic="true"></p>
    <section data-co09="workspace"><div data-co09="identity" hidden></div><div data-co09="detail" class="coop-exam-grid"></div>
      <div data-co09="fileActions" class="co09-actions coop-file-actions" hidden><button type="button" data-co09="preview" class="coop-secondary">${icon('eye')} เปิดดู PDF</button><button type="button" data-co09="download" class="coop-secondary">${icon('download')} ดาวน์โหลด PDF</button></div>
      <form data-co09="upload"><fieldset><legend>${icon('upload')} อัปโหลดเอกสาร PDF</legend><label>เลือกไฟล์ CO-09<input name="file" type="file" accept=".pdf,application/pdf" aria-describedby="co09StudentPdfHelp" required></label><p id="co09StudentPdfHelp" class="coop-help">PDF ขนาดไม่เกิน 10MB · เมื่อเปลี่ยนไฟล์ เอกสารจะเริ่มรอตรวจอีกครั้ง</p><button type="submit" class="coop-primary">${icon('upload')} อัปโหลด PDF</button></fieldset></form>
      <form data-co09="url"><fieldset><legend>${icon('link')} ลิงก์เอกสาร CO-09</legend><label>URL เอกสาร (HTTPS)<input name="document_url" type="url" maxlength="2000" placeholder="https://" aria-describedby="co09StudentUrlHelp"></label><p id="co09StudentUrlHelp" class="coop-help">บันทึกแยกจาก PDF · การบันทึก URL ไม่ถือว่าอัปโหลด PDF แล้ว</p><button type="submit" class="coop-primary">${icon('floppy-disk')} บันทึก URL</button></fieldset></form>
    </section>`,
  renderDetail: renderStudentTopicExam,
  setBusy(container, busy) {
    // Use the shared spinner without replacing form nodes or file selections.
    const active = container.ownerDocument.activeElement;
    const button = busy ? active?.closest('button') || active?.closest('form')?.querySelector('button[type="submit"]') : container.querySelector('[data-coop-loading]');
    if (!button || !container.contains(button)) return;
    if (busy) { button.dataset.coopLoading = 'true'; loadingMarkup.set(button, button.innerHTML); }
    setButtonLoading(button, busy, 'กำลังดำเนินการ...');
    if (!busy) {
      button.innerHTML = loadingMarkup.get(button); loadingMarkup.delete(button); delete button.dataset.coopLoading;
      if (active === container.ownerDocument.body && button.isConnected) button.focus({ preventScroll: true });
    }
  },
};

export function renderStudentTopicExam(document, root, detail) {
  const el = (tag, text, cls) => node(document, tag, text, cls);
  const heading = (text, type) => {
    const h = el('h3'), i = el('i', undefined, `fa-solid fa-${type}`);
    i.setAttribute('aria-hidden', 'true'); h.append(i, el('span', text)); return h;
  };
  const badge = (label, status) => {
    const p = el('p', label, 'coop-state-chip'); p.dataset.state = status; return p;
  };
  const linked = (parent, url, text) => { const a = safeLink(document, url, text); if (a) parent.append(a); };
  const note = (parent, label, text) => { if (text) parent.append(el('p', `${label}: ${text}`, 'coop-detail-note')); };
  const doc = detail.document, exam = detail.exam;
  const documentCard = el('section', undefined, 'co09-card coop-document-card');
  const examCard = el('section', undefined, 'co09-card coop-schedule-card');
  root.replaceChildren(documentCard, examCard);
  documentCard.append(heading('CO-09 — ใบยื่นสอบหัวข้อโครงการสหกิจศึกษา', 'file-lines'), badge(`เอกสาร: ${reviewLabels[doc.review_status] || '-'}`, doc.review_status));
  const file = el('div', undefined, 'coop-document-file');
  file.append(el('p', doc.file?.original_name || 'ยังไม่ได้อัปโหลด PDF', 'coop-file-name'));
  if (doc.file) file.append(el('p', `อัปโหลด ${date(doc.file.uploaded_at)}`, 'coop-help'));
  documentCard.append(file);
  if (doc.document_url) linked(documentCard, doc.document_url, 'เปิดลิงก์เอกสาร CO-09');
  note(documentCard, 'เหตุผลการตรวจ', doc.review_reason);

  examCard.append(heading('กำหนดการสอบหัวข้อโครงการ', 'calendar-days'), badge(`การสอบ: ${examLabels[exam.status] || '-'}`, exam.status));
  if (exam.status === 'unscheduled') {
    const empty = el('div', undefined, 'coop-exam-empty');
    empty.append(el('p', 'ยังไม่มีกำหนดการสอบหัวข้อโครงการ'), el('p', 'เจ้าหน้าที่เป็นผู้กำหนดวันสอบและคณะกรรมการ ข้อมูลจะแสดงที่นี่เมื่อจัดตารางแล้ว', 'coop-help'));
    examCard.append(empty);
  } else {
    const info = el('dl', undefined, 'coop-exam-facts');
    const fact = (label, text, type) => {
      const row = el('div'), dt = el('dt'), i = el('i', undefined, `fa-solid fa-${type}`);
      i.setAttribute('aria-hidden', 'true'); dt.append(i, el('span', label)); row.append(dt, el('dd', text)); info.append(row);
    };
    fact('วันและเวลาสอบ', `${date(exam.starts_at)} – ${date(exam.ends_at)}`, 'clock');
    fact('ห้องสอบ / สถานที่', exam.location || 'ยังไม่ระบุ', 'location-dot');
    fact('รูปแบบสอบ', exam.mode === 'online' ? 'ออนไลน์' : exam.mode === 'onsite' ? 'ที่สถานที่สอบ (On-site)' : 'ยังไม่ระบุ', 'display');
    examCard.append(info, el('p', 'เวลาประเทศไทย · Asia/Bangkok', 'coop-help'));
    if (exam.meeting_url) linked(examCard, exam.meeting_url, 'เปิดห้องประชุมออนไลน์');
  }
  note(examCard, 'เหตุผล', exam.reason);
  note(examCard, 'หมายเหตุ', exam.notes);
  examCard.append(el('h4', 'คณะกรรมการสอบ', 'coop-committee-title'));
  if (!exam.committee.length) examCard.append(el('p', 'ยังไม่ระบุกรรมการสอบ', 'coop-help'));
  else {
    const list = el('ul', undefined, 'coop-committee-list');
    for (const member of exam.committee) {
      const item = el('li'); item.append(el('span', name(member.teacher)), el('span', roleLabels[member.role] || member.role, 'coop-committee-role')); list.append(item);
    }
    examCard.append(list);
  }
  // The student endpoint may omit history. Show only entries actually provided by it.
  if (exam.history?.length) {
    const history = el('details', undefined, 'coop-exam-history'); history.append(el('summary', 'ประวัติกำหนดการสอบ'));
    const list = el('ol');
    for (const entry of exam.history) {
      const old = entry.snapshot;
      if (!old) continue;
      list.append(el('li', `ครั้งที่ ${entry.version} · ${examLabels[old.status] || '-'} · ${date(old.starts_at)} – ${date(old.ends_at)} · ${old.location || '-'}${old.reason ? ` · ${old.reason}` : ''}`));
    }
    history.append(list); examCard.append(history);
  }
  return { documentCard, examCard };
}
