const { WorkflowError, object, uuid } = require('../validators/roleWorkflow.validator');
const { normalizeNewCourseGrade, GRADE_OPTIONS } = require('./coopPrerequisites');
// Confirmed by the user: before document issuance, including approved requests.
const UPDATE_STATUSES = Object.freeze(['advisor_review', 'department_head_review', 'approved']);
function updateWindow(request) {
  return UPDATE_STATUSES.includes(request.status) && !request.document_issued_at && !request.started_at;
}
function normalizeAcademicUpdate(body) {
  object(body, ['status', 'grade', 'expected_revision', 'expected_request_status', 'operation_id']);
  if (!['passed', 'failed'].includes(body.status)) throw new WorkflowError('ระบุผลการเรียนจริงเป็นผ่านแล้วหรือไม่ผ่าน');
  const grade = normalizeNewCourseGrade(body.status, body.grade);
  if (!Number.isSafeInteger(body.expected_revision) || body.expected_revision < 0 || body.expected_revision >= 2147483647) throw new WorkflowError('กรุณาโหลดผลการเรียนล่าสุดก่อนบันทึก');
  if (!UPDATE_STATUSES.includes(body.expected_request_status)) throw new WorkflowError('สถานะคำร้องไม่เปิดให้อัปเดตผลการเรียน');
  uuid(body.operation_id, 'operation_id');
  return { ...body, grade };
}
function academicSummary(request, original, events = [], { available = false, revision = 0, history = false } = {}) {
  const latest = new Map();
  for (const event of events) { const old = latest.get(event.course_code); if (!old || event.revision > old.revision) latest.set(event.course_code, event); }
  const counts = { passed: 0, studying: 0, failed: 0, unselected: 0, legacy_unconfirmed: 0 };
  const courses = original.map(course => {
    const event = latest.get(course.course_code), status = event?.new_status ?? course.status, grade = event?.new_grade ?? course.grade;
    let valid = false;
    try { normalizeNewCourseGrade(status, grade); valid = true; } catch { /* Preserve legacy values for inspection. */ }
    if (!valid) counts.legacy_unconfirmed++;
    else counts[status]++;
    return { program: course.program, course_code: course.course_code, course_name: course.course_name, english_name: course.english_name,
      original_status: course.status, original_grade: course.grade, status, grade, legacy_unconfirmed: !valid,
      updated_at: event?.createdAt ?? event?.created_at ?? null, revision: event?.revision ?? 0 };
  });
  const incomplete = !courses.length || counts.studying > 0 || counts.unselected > 0 || counts.legacy_unconfirmed > 0;
  const last = [...events].sort((a, b) => b.revision - a.revision)[0];
  return { available, revision, status: incomplete ? 'pending_grades' : 'pending_verification', counts,
    latest_courses: courses, last_updated_at: last?.createdAt ?? last?.created_at ?? null,
    student_update_allowed: available && updateWindow(request) && courses.some(c => c.original_status === 'studying' && c.status === 'studying' && !c.legacy_unconfirmed),
    update_policy: { allowed_request_statuses: UPDATE_STATUSES, before_document_issuance: true },
    verification: { policy_status: 'pending_decision', can_verify: false, criteria_confirmed: false },
    grade_options: GRADE_OPTIONS,
    ...(history ? { history: events.map(e => ({ id: e.id, course_code: e.course_code, old_status: e.old_status, old_grade: e.old_grade,
      new_status: e.new_status, new_grade: e.new_grade, actor_student_id: e.actor_student_id, actor_role: 'student',
      created_at: e.createdAt ?? e.created_at, revision: e.revision, request_status_at_change: e.request_status_at_change })) } : {}),
  };
}
module.exports = { UPDATE_STATUSES, updateWindow, normalizeAcademicUpdate, academicSummary };
