const { QueryTypes } = require('sequelize');
const { WorkflowError, uuid, object } = require('../validators/roleWorkflow.validator');

const PAGE_SIZE = 5;
function createTeacherDashboardService(m) {
  async function read(teacherId, query = {}) {
    uuid(teacherId);
    object(query, ['type', 'offset'], { empty: true });
    const type = query.type ?? 'all';
    if (typeof type !== 'string' || !['all', 'coop', 'advisor'].includes(type)
      || (query.offset !== undefined && (typeof query.offset !== 'string' || !/^\d+$/.test(query.offset)))) throw new WorkflowError('Invalid dashboard filters');
    const offset = Number(query.offset ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset % PAGE_SIZE !== 0) throw new WorkflowError('Invalid dashboard page');
    return m.sequelize.transaction({ isolationLevel: 'REPEATABLE READ', readOnly: true }, async transaction => {
      await m.sequelize.query('SET TRANSACTION READ ONLY', { transaction });
      const teacher = await m.Teacher.findOne({ where: { id: teacherId, status: 'active' },
        attributes: ['id', 'academic_title', 'first_name', 'last_name'], transaction });
      if (!teacher) throw new WorkflowError('Active Teacher authorization is required', 403);
      // Each task CTE contains exactly one row per owned request. Optional
      // project/job data is joined by unique keys, never by names or array index.
      const [result] = await m.sequelize.query(`WITH coop AS (
        SELECT 'coop'::text kind,r.id,r.submitted_at received_at,r.status::text status,
          s.id student_record_id,s.student_id,s.first_name,s.last_name,s.major,
          r.company_name,j.title job_title,NULL::text topic
        FROM coop_requests r JOIN students s ON s.id=r.student_id
          LEFT JOIN job_postings j ON j.id=r.job_posting_id
        WHERE s.advisor_teacher_id=$teacher AND r.status='advisor_review'
      ), advisor AS (
        SELECT 'advisor'::text kind,r.id,r.requested_at received_at,r.status::text status,
          s.id student_record_id,s.student_id,s.first_name,s.last_name,s.major,
          NULL::text company_name,NULL::text job_title,p.topic::text topic
        FROM coop_project_advisor_requests r JOIN students s ON s.id=r.student_id
          LEFT JOIN coop_projects p ON p.student_id=s.id
        WHERE r.requested_advisor_teacher_id=$teacher AND r.status='pending'
      ), tasks AS (SELECT * FROM coop UNION ALL SELECT * FROM advisor)
      SELECT (SELECT count(*)::int FROM coop) coop_pending,
        (SELECT count(*)::int FROM advisor) advisor_pending,
        (SELECT count(*)::int FROM students WHERE coop_advisor_teacher_id=$teacher AND track='co_op') supervised_students,
        COALESCE((SELECT jsonb_agg(to_jsonb(current_page) ORDER BY received_at ASC NULLS LAST,kind ASC,id ASC)
          FROM (SELECT * FROM tasks WHERE ($kind::text IS NULL OR kind=$kind::text)
            ORDER BY received_at ASC NULLS LAST,kind ASC,id ASC OFFSET $offset LIMIT $limit) current_page), '[]'::jsonb) tasks`,
      { bind: { teacher: teacherId, kind: type === 'all' ? null : type, offset, limit: PAGE_SIZE }, type: QueryTypes.SELECT, transaction });
      const summary = { coop_pending: result.coop_pending, advisor_pending: result.advisor_pending,
        supervised_students: result.supervised_students, pending_total: result.coop_pending + result.advisor_pending };
      const total = type === 'coop' ? summary.coop_pending : type === 'advisor' ? summary.advisor_pending : summary.pending_total;
      return { teacher: { id: teacher.id, academic_title: teacher.academic_title, first_name: teacher.first_name, last_name: teacher.last_name }, summary, tasks: result.tasks,
        pagination: { type, offset, limit: PAGE_SIZE, total } };
    });
  }
  return { read };
}
module.exports = { createTeacherDashboardService };
