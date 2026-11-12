// Presentation only. Never use a color to grant actions or change status values.
const tones = {
  pending: 'warning', submitted: 'warning', staff_review: 'warning', advisor_review: 'warning', department_head_review: 'warning', pending_confirmation: 'warning', needs_revision: 'warning',
  confirmed: 'success', approved: 'success', document_issued: 'success', verified: 'success', completed: 'success',
  rejected: 'danger', unavailable: 'danger',
  in_progress: 'info', searching: 'info', placed: 'info', file: 'info', link: 'info', file_and_link: 'info',
};
export const teacherStatusTone = status => Object.hasOwn(tones, status) ? tones[status] : 'neutral';
export function teacherStatusBadge(document, text, status, className = 'teacher-status') {
  const node = document.createElement('span'); node.className = className; node.textContent = text;
  node.dataset.status = status || 'unknown'; node.dataset.tone = teacherStatusTone(status); return node;
}
