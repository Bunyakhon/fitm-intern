// Explicit CLI only. Default is offline preparation; inspection is read-only.
// Apply is explicitly authorized for the current Development intern_system. Never uses
// app startup, schema initialization, HTTP, notifications or mail services.
const { createHash } = require('node:crypto');

const MARKER = 'fitm.teacher-demo.v1';
const safety = require('./teacherDashboardDemoSafety');
// User explicitly authorized Development seed execution for this UUID on 10 November 2026.
const CONFIRMED_TEACHER_ID = 'e9876862-0d5b-4641-8d5f-990ea3f0b146';
const FIXTURE_DATE = '2026-11-10T09:00:00+07:00';
const TEACHER_REF = '$verifiedTargetTeacherId';
const zeroCreated = () => ({ coop_requests: 0, advisor_requests: 0, supervised_students: 0 });
const roster = [
  ['coop', 'นาย', 'ปุณณวิช', 'ศรีวัฒนา', 'สกายซอฟต์ ดิจิทัล', 'Software Developer', 'ระบบจัดการงานพัฒนาซอฟต์แวร์'],
  ['coop', 'นางสาว', 'ณิชาภา', 'วัฒนกิจ', 'เมโทรดาต้า โซลูชัน', 'Data Analyst', 'ระบบวิเคราะห์ข้อมูลธุรกิจ'],
  ['coop', 'นาย', 'ธีรวัฒน์', 'พงษ์พิพัฒน์', 'เน็ตเวิร์กพลัส แลบ', 'Network Engineer', 'ระบบบันทึกอุปกรณ์เครือข่าย'],
  ['coop', 'นางสาว', 'พิชญาภา', 'วิริยะพงศ์', 'คลาวด์วิชั่น เอเชีย', 'Cloud Engineer', 'ระบบจัดการทรัพยากรคลาวด์'],
  ['coop', 'นาย', 'ศิรวิชญ์', 'กิตติภพ', 'ไซเบอร์การ์ด เทค', 'Security Analyst', 'ระบบติดตามเหตุการณ์ความปลอดภัย'],
  ['advisor', 'นาย', 'วรเมธ', 'นพนิตย์', 'คิวอาร์สต็อก แลบ', 'Web Developer', 'ระบบจัดการคลังสินค้าด้วย QR Code'],
  ['advisor', 'นางสาว', 'รินรดา', 'ประเสริฐผล', 'เซลส์อินไซต์ ดาต้า', 'Data Analyst', 'ระบบวิเคราะห์ข้อมูลยอดขายผ่าน Dashboard'],
  ['advisor', 'นาย', 'กิตติธัช', 'วัฒนากร', 'เน็ตสเตตัส ซิสเต็มส์', 'Network Engineer', 'ระบบตรวจสอบสถานะเครือข่ายแบบเรียลไทม์'],
  ['advisor', 'นางสาว', 'สุพิชชา', 'นาคทอง', 'ด็อกโฟลว์ ดิจิทัล', 'Software Developer', 'ระบบบริหารจัดการเอกสารออนไลน์'],
  ['advisor', 'นาย', 'ธนกฤต', 'จันทร์เพ็ญ', 'ทาสก์วิชั่น เทค', 'Web Developer', 'ระบบติดตามงานและแจ้งเตือนด้วยเว็บแอปพลิเคชัน'],
  ['supervised', 'นางสาว', 'พิมพ์ชนก', 'วัฒนชัย', 'อินโนเทค โซลูชัน', 'Software Developer', 'ระบบจัดการสต็อกสินค้า'],
  ['supervised', 'นาย', 'ธนภัทร', 'ศิริพัฒน์', 'ดิจิทัลเวิร์ค', 'Web Developer', 'ระบบติดตามสถานะงาน'],
  ['supervised', 'นางสาว', 'กมลชนก', 'แสงทอง', 'เน็กซ์ซอฟต์', 'Software Developer', 'ระบบจัดการทรัพยากรบุคคล'],
  ['supervised', 'นาย', 'ภูริณัฐ', 'วงศ์ดี', 'สมาร์ทเน็ตเวิร์ค', 'Network Engineer', 'ระบบติดตามอุปกรณ์เครือข่าย'],
  ['supervised', 'นางสาว', 'อรปรียา', 'บุญมา', 'คลาวด์ไทย', 'Cloud Engineer', 'ระบบจัดการไฟล์บน Cloud'],
];

function idFor(key) {
  const hex = createHash('sha256').update(`${MARKER}:${key}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
}
const fail = safety.fail;

// UUID is the only target selector. Names are display data, never identity keys.
function buildPlan({ teacherId = CONFIRMED_TEACHER_ID, academicSnapshots = false } = {}) {
  if (teacherId && !safety.UUID.test(teacherId)) fail('INVALID_TEACHER_ID');
  const { CATALOG } = require('../services/coopPrerequisites');
  const rows = [];
  const add = (table, key, values) => { const row = { table, values: { id: idFor(key), ...values } }; rows.push(row); return row.values.id; };
  roster.forEach(([dataset, prefix, first_name, last_name, company, position, topic], index) => {
    const slot = String(index + 1).padStart(2, '0'), key = `student:${slot}`;
    const studentId = add('students', key, {
      student_id: String(9906990000001 + index), email: `${MARKER}.student${slot}@email.kmutnb.ac.th`,
      first_name, last_name, major: 'IT', year_level: 4, gpa: '3.40', last_semester_gpa: '3.50',
      department: '$verifiedTargetTeacherDepartment', faculty: 'คณะเทคโนโลยีและการจัดการอุตสาหกรรม',
      track: 'co_op', status: dataset === 'coop' ? 'searching' : 'placed',
      advisor_teacher_id: teacherId || TEACHER_REF, coop_advisor_teacher_id: dataset === 'supervised' ? teacherId || TEACHER_REF : null,
    });
    add('student_profiles', `${key}:profile`, { student_id: studentId, prefix, current_phone: '0000000000', related_skills: `${MARKER} — ข้อมูลสังเคราะห์เพื่อพัฒนาเท่านั้น` });
    // The existing project contract has only topic (500 chars). Include a short
    // description in that supported text field rather than inventing a column.
    add('coop_projects', `${key}:project`, { student_id: studentId,
      topic: dataset === 'advisor' ? `${topic} — โครงงานจำลองสำหรับพัฒนาเว็บแอปพลิเคชัน จัดเก็บข้อมูล และสรุปผลการใช้งานร่วมกับสถานประกอบการจำลอง` : topic });
    if (dataset === 'advisor') {
      add('coop_project_advisor_requests', `${key}:advisor`, {
        student_id: studentId, requested_advisor_teacher_id: teacherId || TEACHER_REF,
        status: 'pending', requested_at: FIXTURE_DATE, confirmed_at: null, rejected_at: null,
      });
    }
    const email = `${MARKER}.company${slot}@example.com`;
    const companyId = add('companies', `${key}:company`, {
      name: `บริษัท ${company} (จำลอง FITM Teacher Demo)`, normalized_name: `บริษัท ${company} (จำลอง FITM Teacher Demo)`.trim().replace(/\s+/g, ' ').toLowerCase(),
      email, normalized_email: email, phone: '0000000000', address_no: `99/${index + 1}`,
      subdistrict: 'ตำบลจำลอง', district: 'อำเภอจำลอง', province: 'ปราจีนบุรี', email_verified_at: FIXTURE_DATE,
    });
    const submissionId = add('job_submissions', `${key}:submission`, {
      company_id: companyId, submitted_email: email, normalized_submitted_email: email,
      verification_status: 'verified', submitted_at: FIXTURE_DATE, verified_at: FIXTURE_DATE,
    });
    const jobId = add('job_postings', `${key}:job`, {
      company_id: companyId, submission_id: submissionId, title: position, category: 'information_technology',
      description: `${MARKER} — ฝึกพัฒนาและดูแลระบบตามหัวข้อ ${topic} ภายใต้การดูแลของพี่เลี้ยงจำลอง`,
      quota: 1, compensation_text: '300 บาท/วัน (ข้อมูลจำลอง)', work_days_per_week: 5,
      status: 'published', submitted_at: FIXTURE_DATE, reviewed_at: FIXTURE_DATE,
      published_at: FIXTURE_DATE, expires_at: '2027-01-03T16:59:59Z',
    });
    add('job_posting_work_modes', `${key}:work-mode`, { job_posting_id: jobId, mode: 'onsite' });
    const requestId = add('coop_requests', `${key}:request`, {
      student_id: studentId, company_id: companyId, job_posting_id: jobId,
      company_name: `บริษัท ${company} (จำลอง FITM Teacher Demo)`, company_province: 'ปราจีนบุรี',
      company_address: `99/${index + 1} ถนนจำลอง ตำบลจำลอง อำเภอจำลอง ปราจีนบุรี (ข้อมูลสังเคราะห์)`,
      letter_recipient_name: 'คุณผู้รับหนังสือ จำลอง', letter_recipient_position_department: 'ฝ่ายบุคคล (จำลอง)',
      work_start_date: '2027-01-04', work_end_date: '2027-04-30',
      status: dataset === 'coop' ? 'advisor_review' : 'approved', submitted_at: FIXTURE_DATE,
    });
    add('coop_request_delivery_methods', `${key}:delivery`, { coop_request_id: requestId, method: 'self_submit' });
    if (academicSnapshots) for (const [course_code, course_name, english_name] of CATALOG.IT) add('coop_request_prerequisite_courses', `${key}:course:${course_code}`, {
      coop_request_id: requestId, program: 'IT', course_code, course_name, english_name,
      status: 'passed', grade: 'B+',
    });
    if (dataset === 'supervised') add('mentors', `${key}:mentor`, {
      student_id: studentId, email: `${MARKER}.mentor${slot}@example.com`,
      first_name: 'พี่เลี้ยงจำลอง', last_name: `ชุด${slot}`, position: 'Senior Engineer (จำลอง)',
      status: 'verified', verified_at: FIXTURE_DATE,
    });
  });
  return {
    marker: MARKER, plan_version: 3, target_teacher_id: teacherId, academic_snapshots: academicSnapshots,
    academic_year: 2569, semester: 2,
    requested: { coop_requests: 5, advisor_requests: 5, supervised_students: 5 },
    fixture_date: FIXTURE_DATE, internship_period: ['2027-01-04', '2027-04-30'], rows,
    email_strategy: 'SYNTHETIC_INSTITUTION_DOMAIN_NO_MAIL_SERVICES_IN_SEED',
    cleanup_strategy: 'DEVELOPMENT_RETAIN_DEMO_NO_ROW_DELETE',
  };
}

function cleanupReport(plan) {
  return {
    academic_snapshots_in_plan: plan.academic_snapshots, snapshot_rows: plan.rows.filter(row => row.table === 'coop_request_prerequisite_courses').length,
    snapshots_required_for_target_workflows: false, academic_ui_without_snapshot: 'PENDING_GRADES_NO_FABRICATED_PASS',
    row_delete_supported: false, strategy: plan.cleanup_strategy,
    reasons: plan.academic_snapshots ? ['IMMUTABLE_ORIGINAL_SNAPSHOTS', 'REVIEWS_AND_OTHER_HISTORY_MAY_BECOME_IMMUTABLE'] : ['AFTER_WORKFLOW_REVIEW_AND_OTHER_HISTORY_MAY_BECOME_IMMUTABLE'],
    deletion: 'NOT_IMPLEMENTED_NO_EXISTING_DATA_DELETION',
  };
}

async function inspect(plan, options = {}) {
  const env = safety.loadConfig(options.config);
  const { Client } = require('pg');
  const client = new Client({ host: '127.0.0.1', port: 5432, database: env.DB_NAME, user: env.DB_USER,
    password: env.DB_PASSWORD, connectionTimeoutMillis: 5000, application_name: 'fitm_teacher_demo_readonly_plan' });
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout='10s'");
    const target = await safety.liveTarget(client);
    if (target.db !== env.DB_NAME) fail('LIVE_DATABASE_CONFIG_MISMATCH');
    const blockers = [], teacherId = options.teacherId || CONFIRMED_TEACHER_ID;
    let teacher = null;
    if (!teacherId) blockers.push('EXPLICIT_TEACHER_UUID_REQUIRED');
    else {
      try { teacher = await safety.activeTeacher(client, teacherId); }
      catch (error) { if (!error.publicCode) throw error; blockers.push(error.publicCode); }
    }
    const { rows: [teacherCount] } = await client.query("SELECT count(*)::int total FROM public.teachers WHERE status='active'");
    const candidates = options.listTeachers ? (await client.query(`SELECT id,
      concat_ws(' ',academic_title,first_name,last_name) display_name,is_department_head
      FROM public.teachers WHERE status='active' ORDER BY id LIMIT 5 OFFSET $1`, [options.offset || 0])).rows : undefined;
    // Inspect identifiers without returning existing personal rows. A match is a
    // collision, never proof that this planner owns that row or may overwrite it.
    const { rows: [collisions] } = await client.query(`SELECT
      count(*) FILTER (WHERE id=ANY($1::uuid[]) OR student_id=ANY($2::text[]) OR email=ANY($3::text[]))::int identifiers,
      count(*) FILTER (WHERE email LIKE $4)::int marker_candidates
      FROM public.students`, [plan.rows.filter(r => r.table === 'students').map(r => r.values.id),
      plan.rows.filter(r => r.table === 'students').map(r => r.values.student_id),
      plan.rows.filter(r => r.table === 'students').map(r => r.values.email), `${MARKER}.%`]);
    // Deterministic PK detection covers every supporting table, not just Students.
    const tables = [...new Set(plan.rows.map(row => row.table))];
    const { rows: present } = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1::text[])", [tables]);
    const missing = tables.filter(table => !present.some(row => row.table_name === table));
    if (missing.length) blockers.push('REQUIRED_TABLES_MISSING_NO_SCHEMA_CHANGE');
    const existingByTable = {};
    for (const table of tables.filter(table => !missing.includes(table))) {
      // Table identifiers come exclusively from the fixed buildPlan above.
      if (!/^[a-z_]+$/.test(table)) fail('UNEXPECTED_PLAN_TABLE');
      const ids = plan.rows.filter(row => row.table === table).map(row => row.values.id);
      const { rows: [row] } = await client.query(`SELECT count(*)::int count FROM public."${table}" WHERE id=ANY($1::uuid[])`, [ids]);
      existingByTable[table] = row.count;
    }
    if (collisions.identifiers || collisions.marker_candidates || Object.values(existingByTable).some(Boolean)) blockers.push('EXISTING_CANDIDATES_REQUIRE_RECEIPT_INSPECTION_NO_OVERWRITE');
    const { rows: immutable } = await client.query("SELECT c.relname AS table_name,t.tgname AS trigger_name FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname=ANY($1::text[]) AND t.tgname ILIKE '%immutable%'", [tables]);
    let existingVisible = null;
    if (teacher) {
      const { rows: [counts] } = await client.query(`SELECT
        (SELECT count(*)::int FROM public.coop_requests r JOIN public.students s ON s.id=r.student_id WHERE s.advisor_teacher_id=$1 AND r.status='advisor_review') AS coop_requests,
        (SELECT count(*)::int FROM public.coop_project_advisor_requests WHERE requested_advisor_teacher_id=$1 AND status='pending') AS advisor_requests,
        (SELECT count(*)::int FROM public.students WHERE coop_advisor_teacher_id=$1 AND track='co_op') AS supervised_students`, [teacher.id]);
      existingVisible = counts;
    }
    await client.query('ROLLBACK');
    return { target, teacher: teacher ? { id: teacher.id, display_name: teacher.display_name,
      status: teacher.status, login_role: teacher.is_department_head ? 'department_head' : 'teacher',
      identity_evidence: 'EXPLICIT_UUID_ACTIVE_DB_RECORD_NOT_BROWSER_SESSION_PROOF' } : null,
      teacher_candidates: candidates, active_teacher_count: teacherCount.total,
      existing_demo_candidates: collisions, existing_by_table: existingByTable,
      existing_visible: existingVisible, new_demo_records: zeroCreated(), total_visible: existingVisible,
      missing_tables: missing, immutable_cleanup_guards: immutable, cleanup: cleanupReport(plan), blockers };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { await client.end(); }
}

async function main(args = process.argv.slice(2)) {
  const flags = new Set(['--dry-run','--inspect','--plan','--cleanup-plan','--list-teachers','--academic-snapshots','--apply','--verify-data','--reconcile-receipt','--complete-fixtures']);
  const valueKeys = new Set(['teacher-id','config','confirm','offset']), values = {};
  for (const arg of args) {
    if (flags.has(arg)) continue;
    const match = arg.match(/^--([a-z-]+)=(.+)$/);
    if (!match || !valueKeys.has(match[1]) || values[match[1]] !== undefined) fail('UNSUPPORTED_OR_DUPLICATE_ARGUMENT');
    values[match[1]] = match[2];
  }
  if (new Set(args).size !== args.length) fail('DUPLICATE_ARGUMENT');
  const options = { teacherId: values['teacher-id']?.toLowerCase() || CONFIRMED_TEACHER_ID, config: values.config,
    confirm: values.confirm, listTeachers: args.includes('--list-teachers'), offset: Number(values.offset || 0), reconcileReceipt: args.includes('--reconcile-receipt') };
  if (!Number.isSafeInteger(options.offset) || options.offset < 0 || (options.teacherId && !safety.UUID.test(options.teacherId))) fail('INVALID_TEACHER_ID_OR_OFFSET');
  if (options.teacherId !== CONFIRMED_TEACHER_ID) fail('TEACHER_UUID_DIFFERS_FROM_USER_CONFIRMED_PREPARATION');
  if (args.includes('--apply') && !values['teacher-id']) fail('APPLY_REQUIRES_EXPLICIT_TEACHER_ID');
  if (options.reconcileReceipt && !args.includes('--verify-data')) fail('RECEIPT_RECONCILIATION_REQUIRES_SELECT_VERIFICATION');
  if (args.includes('--apply') && args.some(arg => ['--dry-run','--inspect','--list-teachers','--plan','--cleanup-plan','--verify-data'].includes(arg))) fail('APPLY_CANNOT_BE_COMBINED_WITH_READONLY_FLAGS');
  const plan = buildPlan({ teacherId: options.teacherId, academicSnapshots: args.includes('--academic-snapshots') });
  if (args.includes('--complete-fixtures')) {
    if (!values['teacher-id'] || args.includes('--academic-snapshots') || options.reconcileReceipt
      || (!args.includes('--apply') && !args.includes('--verify-data')) || args.some(arg => ['--dry-run','--inspect','--plan','--cleanup-plan','--list-teachers'].includes(arg))) fail('COMPLETION_REQUIRES_EXPLICIT_APPLY_OR_SELECT_VERIFICATION');
    const completion = require('./teacherDashboardDemoCompletion');
    console.log(JSON.stringify(await completion.run(plan, options, idFor, { apply: args.includes('--apply') }), null, 2)); return;
  }
  if (args.includes('--apply')) { console.log(JSON.stringify(await safety.applyPlan(plan, options), null, 2)); return; }
  if (args.includes('--verify-data')) { console.log(JSON.stringify(await safety.verifyPlan(plan, options), null, 2)); return; }
  const inspection = args.includes('--inspect') || options.listTeachers ? await inspect(plan, options) : null;
  console.log(JSON.stringify({ marker: MARKER, status: 'PREPARED_ONLY', requested: plan.requested,
    created: zeroCreated(), planned_rows: plan.rows.length, plan_digest: safety.digest(plan),
    apply_policy: 'EXPLICITLY_AUTHORIZED_DEVELOPMENT_INTERN_SYSTEM_NO_MAIL_SERVICES',
    blockers: inspection?.blockers || [],
    inspection, ...(args.includes('--cleanup-plan') ? { cleanup_plan: cleanupReport(plan) } : {}),
    ...(args.includes('--plan') ? { plan } : {}) }, null, 2));
}

if (require.main === module) main().catch(error => {
  // Sequelize/pg errors and environment contents must never reach logs.
  console.error(JSON.stringify({ code: error.publicCode || 'DEVELOPMENT_DEMO_FAILED_NO_SENSITIVE_DETAILS', ...(error.safeDetails ? { details: error.safeDetails } : {}) }));
  process.exitCode = 1;
});
module.exports = { buildPlan, idFor, inspect, cleanupReport, main, MARKER };
