const { QueryTypes, Op } = require('sequelize');
const { WorkflowError, page } = require('../validators/roleWorkflow.validator');

function teacherListPagination(query = {}) {
  if (query.offset !== undefined && !['string', 'number'].includes(typeof query.offset)) throw new WorkflowError('Invalid pagination');
  // page_size is the interactive list contract. Legacy bounded limit callers
  // (including Dashboard's six pending rows) retain their existing contract.
  if (query.page_size === undefined) return page({ ...query, limit: query.limit ?? 10 });
  if (!['10', '25', '50'].includes(String(query.page_size)) || !['string', 'number'].includes(typeof query.page_size)) throw new WorkflowError('Page size must be 10, 25 or 50');
  const limit = Number(query.page_size);
  if (query.limit !== undefined && (!['string', 'number'].includes(typeof query.limit) || Number(query.limit) !== limit)) throw new WorkflowError('Conflicting page size and limit');
  return page({ ...query, limit });
}

function filters(query = {}, { allowUnknownYear = false, listPagination = false } = {}) {
  const result = {};
  for (const key of ['search', 'year', 'semester', 'major', 'metadata', 'sort']) {
    if (query[key] !== undefined && typeof query[key] !== 'string') throw new WorkflowError('Invalid search filters');
    result[key] = (query[key] || '').trim();
  }
  if (result.search.length > 100 || (result.year && !(allowUnknownYear && result.year === 'unknown') && !/^[1-9][0-9]{0,3}$/.test(result.year))
    || (result.semester && !['1', '2'].includes(result.semester))
    || (result.major && !['IT', 'INE'].includes(result.major))
    || (result.metadata && result.metadata !== '1')
    || (query.sort !== undefined && !['year_desc', 'year_asc'].includes(result.sort))) throw new WorkflowError('Invalid search filters');
  result.sort ||= 'year_desc';
  return { ...result, ...(listPagination ? teacherListPagination(query) : page(query)) };
}

// All SQL fragments below are fixed server-owned strings. User input is bound.
// Period predicates share one request row, so historical year+semester cannot
// accidentally match two different placements for the same student.
async function teacherPage(m, kind, teacherId, query, hydrate, { studentId } = {}) {
  const documents = kind === 'documents';
  const f = filters(query, { allowUnknownYear: documents, listPagination: !documents }), supervised = kind === 'students' || documents, advisor = kind === 'advisor';
  if (!['students', 'advisor', 'coop', 'documents'].includes(kind)) throw new Error('Unsupported teacher list');
  const from = supervised ? 'students s' : advisor
    ? 'coop_project_advisor_requests r JOIN students s ON s.id=r.student_id'
    : 'coop_requests r JOIN students s ON s.id=r.student_id';
  const scope = supervised ? `s.coop_advisor_teacher_id=$teacher AND s.track='co_op'${documents && studentId ? ' AND s.id=$student' : ''}`
    : advisor ? 'r.requested_advisor_teacher_id=$teacher' : 's.advisor_teacher_id=$teacher';
  const period = `($year::int IS NULL OR p.academic_year=$year::int) AND ($semester::int IS NULL OR p.semester=$semester::int)`;
  const placement = `SELECT 1 FROM coop_requests cr LEFT JOIN coop_academic_periods p ON p.id=cr.academic_period_id
    WHERE cr.student_id=s.id AND cr.status IN ('approved','document_issued','in_progress')`;
  const searchable = ["concat_ws(' ',s.first_name,s.last_name)", 's.student_id', ...(advisor
    ? ['(SELECT topic FROM coop_projects cp WHERE cp.student_id=s.id)'] : supervised ? documents ? ['(SELECT topic FROM coop_projects cp WHERE cp.student_id=s.id)'] : [] : ['r.company_name', '(SELECT title FROM job_postings j WHERE j.id=r.job_posting_id)'])];
  const match = searchable.map(field => `${field} ILIKE $search ESCAPE E'\\\\'`);
  if (supervised) match.push(`EXISTS (${placement} AND cr.company_name ILIKE $search ESCAPE E'\\\\' AND ${period})`);
  const where = [scope, '($major::text IS NULL OR s.major=$major)', `($search::text IS NULL OR (${match.join(' OR ')}))`];
  if (supervised) where.push(`(($year::int IS NULL AND $semester::int IS NULL) OR EXISTS (${placement} AND ${period}))`);
  // Coop status is a PostgreSQL ENUM; the nullable parameter is text. Compare
  // text to text so even the all-status Count query can be planned safely.
  else where.push('($status::text IS NULL OR r.status::text=$status::text)', period);
  const operational = advisor ? " AND r.status IN ('pending','confirmed','rejected')" : '';
  if (advisor) where.push("r.status IN ('pending','confirmed','rejected')");
  // Explicit unknown means no eligible placement with a structured period.
  // The default all-years query remains inclusive; never coalesce NULL to zero.
  if (documents && f.year === 'unknown') where.push(`NOT EXISTS (${placement} AND p.id IS NOT NULL)`);
  const join = supervised ? '' : ' LEFT JOIN coop_academic_periods p ON p.id=r.academic_period_id';
  const direction = f.sort === 'year_asc' ? 'ASC' : 'DESC'; // Validated server-owned SQL fragment only.
  const id = supervised ? 's.id' : 'r.id';
  // A student can have several historical placements. Pick the first matching
  // round in the requested order, using the same period/company search scope.
  // This is a display projection, never a reassignment or stored academic value.
  const selectedJoin = supervised ? ` LEFT JOIN LATERAL (
    SELECT p.id academic_period_id,p.academic_year,p.semester,cr.id request_id,
      CASE WHEN p.id IS NOT NULL THEN cr.submitted_at END period_date
    FROM coop_requests cr LEFT JOIN coop_academic_periods p ON p.id=cr.academic_period_id
    WHERE cr.student_id=s.id AND cr.status IN ('approved','document_issued','in_progress') AND ${period}
      AND ($search::text IS NULL OR ${[...match.slice(0, searchable.length), "cr.company_name ILIKE $search ESCAPE E'\\\\'"].join(' OR ')})
    ORDER BY p.academic_year ${direction} NULLS LAST,p.semester ${direction} NULLS LAST,
      CASE WHEN p.id IS NOT NULL THEN cr.submitted_at END ${direction} NULLS LAST,cr.id ASC LIMIT 1
  ) selected_period ON true` : join;
  const orderedPeriod = supervised ? 'selected_period' : 'p';
  const date = supervised ? 'selected_period.period_date' : advisor ? 'r.requested_at' : 'r.submitted_at';
  const order = `${orderedPeriod}.academic_year ${direction} NULLS LAST,${orderedPeriod}.semester ${direction} NULLS LAST,${date} ${direction} NULLS LAST,${id} ASC`;
  const bind = { teacher: teacherId, student: studentId || null, status: !supervised && query.status === 'all' ? null : query.status, major: f.major || null,
    search: f.search ? `%${f.search.replace(/[\\%_]/g, '\\$&')}%` : null,
    year: f.year && f.year !== 'unknown' ? Number(f.year) : null, semester: f.semester ? Number(f.semester) : null, offset: f.offset, limit: f.limit };
  return m.sequelize.transaction({ isolationLevel: 'REPEATABLE READ', readOnly: true }, async transaction => {
    await m.sequelize.query('SET TRANSACTION READ ONLY', { transaction });
    const select = (sql, values = bind) => m.sequelize.query(sql, { bind: values, type: QueryTypes.SELECT, transaction });
    const [{ total }] = await select(`SELECT count(*)::int total FROM ${from}${join} WHERE ${where.join(' AND ')}`);
    const selection = supervised ? ',selected_period.academic_period_id,selected_period.academic_year,selected_period.semester,selected_period.request_id,selected_period.period_date' : '';
    const ids = await select(`SELECT ${id} id${selection} FROM ${from}${selectedJoin} WHERE ${where.join(' AND ')} ORDER BY ${order} OFFSET $offset LIMIT $limit`);
    // Year choices are scoped to this teacher, independent of current filters.
    const years = await select(supervised
      ? `SELECT DISTINCT p.academic_year FROM students s JOIN coop_requests cr ON cr.student_id=s.id JOIN coop_academic_periods p ON p.id=cr.academic_period_id WHERE ${scope} AND cr.status IN ('approved','document_issued','in_progress') ORDER BY p.academic_year DESC`
      : `SELECT DISTINCT p.academic_year FROM ${from}${join} WHERE ${scope}${operational} AND p.academic_year IS NOT NULL ORDER BY p.academic_year DESC`, { teacher: teacherId, student: studentId || null });
    const hydrated = ids.length ? await hydrate(ids.map(row => row.id), transaction, Op) : [];
    // ORM IN hydration may return rows in its own order. Reassemble strictly by
    // the IDs already ordered and paged by PostgreSQL; never sort a page by year.
    const byId = new Map(hydrated.map(row => [row.id, row]));
    const rows = ids.map(selected => {
      const row = byId.get(selected.id);
      if (!row || !supervised) return row;
      return { ...row, academicPeriod: selected.academic_period_id ? {
        id: selected.academic_period_id, academic_year: selected.academic_year, semester: selected.semester,
      } : null, academicRequestId: selected.academic_period_id ? selected.request_id : null,
      academicSubmittedAt: selected.period_date || null };
    }).filter(Boolean);
    return { rows, total, years: years.map(row => row.academic_year), offset: f.offset, limit: f.limit };
  });
}
module.exports = { teacherPage, filters, teacherListPagination };
