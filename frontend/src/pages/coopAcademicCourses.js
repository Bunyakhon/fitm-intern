import { updateCoopAcademicCourse } from '../api/coopRequest.api.js';
import { showConfirmModal, showToast } from '../ui/feedback.js';
export const COURSE_STATUS_LABELS = { passed: 'ผ่านแล้ว', studying: 'กำลังศึกษา', failed: 'ไม่ผ่าน', unselected: 'ยังไม่ระบุ' };
const GRADES = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];
const WAITING_NOTICE = 'นักศึกษายังอยู่ระหว่างศึกษาบางรายวิชา ผลการเรียนยังไม่ครบ การอนุมัติคำร้องไม่ใช่การรับรองคุณสมบัติออกฝึกปฏิบัติงาน';
const date = value => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : 'ยังไม่มีการอัปเดต';
export function courseResult(status, grade) { return `${COURSE_STATUS_LABELS[status] || 'สถานะเดิมที่ต้องตรวจสอบ'}${grade ? ` — ${grade}` : status === 'studying' ? ' — รอผลการเรียน' : ''}`; }
function node(doc, tag, text, className) { const e = doc.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e; }
export function academicSummaryNode(doc, academic) {
  const root = node(doc, 'section', undefined, 'coop-academic-summary');
  root.setAttribute('aria-label', 'สถานะคุณสมบัติรายวิชา แยกจากการอนุมัติคำร้อง');
  const label = academic?.status === 'pending_grades' ? 'รอผลการเรียน' : academic?.status === 'pending_verification' ? 'มีผลการเรียนครบ รอตรวจสอบ' : 'ยังไม่มีข้อมูลการตรวจสอบคุณสมบัติ';
  root.append(node(doc, 'strong', `คุณสมบัติรายวิชา: ${label}`));
  if (academic?.counts) root.append(node(doc, 'p', `กำลังศึกษา ${academic.counts.studying} วิชา · ผ่านแล้ว ${academic.counts.passed} วิชา · ไม่ผ่าน ${academic.counts.failed} วิชา · ยังไม่ระบุ ${academic.counts.unselected} วิชา`));
  if (academic?.counts?.studying) root.append(node(doc, 'p', WAITING_NOTICE, 'coop-academic-notice'));
  else root.append(node(doc, 'p', 'การอนุมัติคำร้องและการมีเกรดครบไม่ใช่การรับรองคุณสมบัติออกฝึกปฏิบัติงาน'));
  if (academic?.counts?.legacy_unconfirmed) root.append(node(doc, 'p', `มีข้อมูลเดิม ${academic.counts.legacy_unconfirmed} วิชาที่ต้องตรวจสอบ ระบบยังคงแสดงค่าที่บันทึกไว้`));
  root.append(node(doc, 'p', 'รอยืนยันเกณฑ์ทางวิชาการและผู้มีอำนาจรับรองคุณสมบัติ ระบบยังไม่เปิดการรับรองโดยอัตโนมัติ', 'coop-academic-policy'));
  return root;
}
function operationId() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16)); bytes[6] = bytes[6] & 15 | 64; bytes[8] = bytes[8] & 63 | 128;
  const hex = [...bytes].map(v => v.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function mountAcademicCourses({ document: doc, root, request, editable = false, save = updateCoopAcademicCourse,
  confirm = showConfirmModal, toast = showToast, isLive = () => true, onSaved = () => {} }) {
  let disposed = false, busy = false, closeConfirm, academic = request.academic;
  const operations = new Map();
  const live = () => !disposed && isLive();
  const controls = () => { if (disposed) return; root.setAttribute('aria-busy', String(busy)); root.querySelectorAll('button,select').forEach(e => { e.disabled = busy; }); };
  function render() {
    root.replaceChildren(); root.classList.add('coop-academic');
    const heading = node(doc, 'h4', 'สถานะคุณสมบัติและผลการเรียนล่าสุด'); heading.tabIndex = -1;
    root.append(heading, academicSummaryNode(doc, academic), node(doc, 'p', `อัปเดตผลการเรียนล่าสุด: ${date(academic?.last_updated_at)}`));
    const list = node(doc, 'div', undefined, 'coop-academic-grid');
    for (const course of academic?.latest_courses || []) {
      const card = node(doc, 'article', undefined, 'coop-academic-course');
      card.append(node(doc, 'h5', `${course.course_code} ${course.course_name}`),
        node(doc, 'p', `ณวันยื่น: ${courseResult(course.original_status, course.original_grade)}`),
        node(doc, 'p', `ล่าสุด: ${courseResult(course.status, course.grade)}`));
      if (editable && academic.student_update_allowed && course.original_status === 'studying' && course.status === 'studying' && !course.legacy_unconfirmed) {
        const form = node(doc, 'form'), statusLabel = node(doc, 'label', 'สถานะผลการเรียน'), status = node(doc, 'select');
        status.setAttribute('aria-label', `สถานะผลการเรียน ${course.course_code}`);
        for (const value of ['passed', 'failed']) { const option = node(doc, 'option', COURSE_STATUS_LABELS[value]); option.value = value; status.append(option); }
        statusLabel.append(status);
        const gradeLabel = node(doc, 'label', 'เกรดที่ได้รับ'), grade = node(doc, 'select'); grade.required = true;
        grade.setAttribute('aria-label', `เกรดที่ได้รับ ${course.course_code}`);
        for (const value of ['', ...GRADES]) { const option = node(doc, 'option', value || 'เลือกผลการเรียน'); option.value = value; grade.append(option); }
        gradeLabel.append(grade);
        status.addEventListener('change', () => { grade.value = status.value === 'failed' ? 'F' : grade.value === 'F' ? '' : grade.value; });
        const message = node(doc, 'p'); message.setAttribute('role', 'alert');
        const button = node(doc, 'button', 'บันทึกผลการเรียน', 'btn-secondary'); button.type = 'submit';
        form.append(statusLabel, gradeLabel, message, button);
        form.addEventListener('submit', event => {
          event.preventDefault(); if (!live() || busy) return;
          if (!GRADES.includes(grade.value) || status.value === 'passed' && grade.value === 'F' || status.value === 'failed' && grade.value !== 'F') {
            message.textContent = 'ผ่านแล้วต้องมีเกรดที่ไม่ใช่ F และสถานะไม่ผ่านต้องมีเกรด F'; return;
          }
          const payload = { status: status.value, grade: grade.value, expected_revision: academic.revision, expected_request_status: request.status };
          const signature = JSON.stringify([course.course_code, payload]);
          if (!operations.has(signature)) operations.set(signature, operationId()); payload.operation_id = operations.get(signature);
          message.textContent = ''; busy = true; controls();
          closeConfirm = confirm({ title: 'ยืนยันผลการเรียนที่ได้รับ', message: `${course.course_code}: ${courseResult(payload.status, payload.grade)} ระบบจะเก็บผลเดิม ณวันยื่นและประวัติการอัปเดตไว้ หลังบันทึกจะไม่เปิดให้นักศึกษาแก้เกรดนี้ซ้ำ`,
            confirmLabel: 'ยืนยันบันทึกผลการเรียน', returnFocus: button, fallbackFocus: () => root.querySelector('h4'),
            onClose: () => { busy = false; closeConfirm = undefined; controls(); },
            onConfirm: async () => {
              if (!live()) throw Error('สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่');
              try {
                const response = await save(request.id, course.course_code, payload);
                if (!live()) return;
                if (!response?.success || !response.data?.academic) throw Error('ข้อมูลตอบกลับไม่ครบ กรุณาโหลดคำร้องล่าสุด');
                academic = response.data.academic; request.academic = academic; render();
                onSaved(academic); toast('บันทึกผลการเรียนแล้ว ข้อมูลยังรอการตรวจสอบคุณสมบัติ', 'success');
              } catch (error) {
                if (!live()) return;
                const text = error.status === 409 ? 'ข้อมูลหรือสถานะคำร้องเปลี่ยนแล้ว กรุณาโหลดคำร้องล่าสุด ข้อมูลที่กรอกยังอยู่' : error.message || 'บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่';
                message.textContent = text; toast(text, 'error'); throw Error(text);
              }
            } });
        });
        card.append(form);
      }
      list.append(card);
    }
    root.append(list);
    if (editable && !academic?.available) root.append(node(doc, 'p', 'ยังไม่เปิดให้อัปเดตผลการเรียน กรุณาติดต่อเจ้าหน้าที่'));
    else if (editable && !academic?.student_update_allowed) root.append(node(doc, 'p', 'อัปเดตได้เฉพาะวิชาที่ยังอยู่ระหว่างศึกษา ระหว่างพิจารณาหรืออนุมัติแล้วก่อนออกเอกสาร'));
    root.append(node(doc, 'h4', 'ประวัติการอัปเดตผลการเรียน'));
    const history = node(doc, 'ol');
    if (!academic?.history?.length) history.append(node(doc, 'li', 'ยังไม่มีประวัติการอัปเดตผลการเรียน'));
    for (const e of academic?.history || []) history.append(node(doc, 'li', `${date(e.created_at)} · ${e.course_code} · ${courseResult(e.old_status, e.old_grade)} → ${courseResult(e.new_status, e.new_grade)} · นักศึกษาเจ้าของคำร้อง · ครั้งที่ ${e.revision}`));
    root.append(history); controls();
  }
  render();
  return { get busy() { return busy; }, dispose() { disposed = true; closeConfirm?.(); } };
}
