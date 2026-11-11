// Explicit Development fixture enrichment only. No startup, DDL, HTTP or email services.
const fs = require('node:fs');
const { Sequelize, Op } = require('sequelize');
const S = require('./teacherDashboardDemoSafety');
const { readStudentCatalog } = require('../services/coopPrerequisiteCatalog.service');
const { academicSummary } = require('../services/coopAcademic.rules');
const { prerequisiteInclude } = require('../services/coopPrerequisites');
const VERSION = 1;
const JOBS = [
  ['Frontend Developer', 'พัฒนาหน้าจอติดตามงานและทดสอบการใช้งานบนมือถือ', 'JavaScript, HTML, CSS, Git', 'พัฒนาซอฟต์แวร์', 'Punnawit', 'Sriwatthana'],
  ['Data Analyst', 'จัดเตรียมข้อมูลธุรกิจและสร้างรายงานแนวโน้มพร้อมตรวจคุณภาพข้อมูล', 'SQL, Python, Power BI', 'วิเคราะห์ข้อมูล', 'Nichapha', 'Watthanakit'],
  ['Network Engineer', 'จัดทำทะเบียนอุปกรณ์และตรวจสอบการเชื่อมต่อในเครือข่ายทดสอบ', 'TCP/IP, VLAN, Linux', 'วิศวกรรมเครือข่าย', 'Thirawat', 'Phongphiphat'],
  ['Cloud Engineer', 'จัดทำระบบติดตามการใช้ทรัพยากรและสำรองข้อมูลบนสภาพแวดล้อมคลาวด์ทดสอบ', 'Linux, Docker, Python', 'บริการคลาวด์', 'Phitchayapha', 'Wiriyaphong'],
  ['Cybersecurity Analyst', 'รวบรวม Log และวิเคราะห์เหตุการณ์ความปลอดภัยด้วยข้อมูลจำลอง', 'Python, SQL, Linux', 'ความปลอดภัยสารสนเทศ', 'Sirawit', 'Kittiphop'],
  ['Full Stack Developer', 'พัฒนาระบบรับเข้าและเบิกจ่ายสินค้าด้วย QR Code และรายงานคงคลัง', 'JavaScript, Node.js, PostgreSQL', 'ระบบคลังสินค้า', 'Woramet', 'Nopphanit'],
  ['Data Analyst', 'ออกแบบ Dashboard ยอดขายรายเดือนและตรวจสอบความถูกต้องของตัวชี้วัด', 'Python, SQL, Power BI', 'ข้อมูลการขาย', 'Rinrada', 'Prasoetphon'],
  ['Network Engineer', 'พัฒนาระบบ Monitoring และแสดงสถานะการเชื่อมต่ออุปกรณ์ทดสอบ', 'Python, SNMP, Linux', 'ระบบเครือข่าย', 'Kittithat', 'Watthanakon'],
  ['Backend Developer', 'พัฒนา API จัดเก็บเอกสารพร้อมค้นหาและบันทึกประวัติการแก้ไข', 'Node.js, PostgreSQL, REST', 'ระบบเอกสาร', 'Supitcha', 'Nakthong'],
  ['QA Engineer', 'ออกแบบกรณีทดสอบระบบติดตามงานและจัดทำรายงานข้อผิดพลาด', 'JavaScript, SQL, Git', 'ประกันคุณภาพซอฟต์แวร์', 'Thanakrit', 'Chanphen'],
  ['Full Stack Developer', 'พัฒนาระบบตรวจนับสินค้าและรายงานการเคลื่อนไหวของคลัง', 'JavaScript, Node.js, PostgreSQL', 'พัฒนาระบบองค์กร', 'Phimchanok', 'Watthanachai'],
  ['Frontend Developer', 'พัฒนาหน้าจอสถานะงานและการแจ้งเตือนพร้อมรองรับอุปกรณ์หลายขนาด', 'JavaScript, HTML, CSS', 'แอปพลิเคชันองค์กร', 'Thanaphat', 'Siriphat'],
  ['Backend Developer', 'พัฒนา API จัดการข้อมูลบุคลากรจำลองและบันทึกประวัติรายการ', 'Node.js, PostgreSQL, Git', 'ระบบทรัพยากรบุคคล', 'Kamonchanok', 'Saengthong'],
  ['System Administrator', 'จัดทำทะเบียนเครื่องแม่ข่ายและรายงานการใช้งานทรัพยากรเครือข่าย', 'Linux, Bash, TCP/IP', 'โครงสร้างพื้นฐาน IT', 'Phurinat', 'Wongdi'],
  ['Cloud Engineer', 'พัฒนาระบบจัดหมวดหมู่ไฟล์และติดตามสถานะการสำรองข้อมูลในคลาวด์ทดสอบ', 'Python, Docker, SQL', 'จัดเก็บข้อมูลคลาวด์', 'Onpriya', 'Bunma'],
];
const PATTERNS = [
  ['passed', 'passed', 'studying', 'studying', 'studying'],
  ['passed', 'failed', 'passed', 'studying', 'studying'],
  ['passed', 'passed', 'studying', 'studying', 'studying'],
  ['passed', 'passed', 'passed', 'studying', 'studying'],
  ['passed', 'passed', 'studying', 'studying', 'unselected'],
];
const GRADES = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];
const pk = table => table === 'coop_request_academic_states' ? 'coop_request_id' : 'id';
const equal = (a, b) => a instanceof Date || b instanceof Date ? Date.parse(a) === Date.parse(b) : a === b;

function completionPlan(base, catalog, idFor) {
  // This fixture is limited to the actual five IT prerequisites. It does not
  // invent extra courses, credits, a curriculum or a university GPA formula.
  if (catalog.program !== 'IT' || catalog.courses.length !== 5) S.fail('COMPLETION_REQUIRES_CURRENT_FIVE_COURSE_IT_CATALOG');
  const updates = [], inserts = [];
  const patch = (table, id, values) => updates.push({ table, id, values });
  const add = (table, key, values, where) => {
    const id = table === 'coop_request_academic_states' ? values.coop_request_id : idFor(`completion:v${VERSION}:${key}`);
    inserts.push({ table, id, values: { ...(pk(table) === 'id' ? { id } : {}), ...values }, where: where || { [pk(table)]: id } });
    return id;
  };
  const baseRow = (table, key) => base.rows.find(row => row.table === table && row.values.id === idFor(key))?.values;
  for (let i = 0; i < 15; i++) {
    const slot = String(i + 1).padStart(2, '0'), key = `student:${slot}`;
    const student = baseRow('students', key), request = baseRow('coop_requests', `${key}:request`);
    const company = baseRow('companies', `${key}:company`), project = baseRow('coop_projects', `${key}:project`);
    const [title, objective, technologies, department, english_first_name, english_last_name] = JOBS[i];
    const province = ['ปราจีนบุรี', 'ชลบุรี', 'กรุงเทพมหานคร', 'ระยอง', 'ปทุมธานี'][i % 5];
    const address = `99/${i + 1} ถนนตัวอย่าง ตำบลจำลอง อำเภอจำลอง ${province} (ข้อมูลสังเคราะห์ FITM)`;
    const submitted = new Date(request.submitted_at), reported = new Date(submitted.getTime() + (30 + i * 3) * 60000);
    patch('students', student.id, { gpa: null, last_semester_gpa: null });
    patch('student_profiles', idFor(`${key}:profile`), {
      english_prefix: i === 1 || i === 3 || i === 6 || i === 8 || i === 10 || i === 12 || i === 14 ? 'Miss' : 'Mr.',
      english_first_name, english_last_name, current_phone: '0000000000', current_address: address,
      hometown_address: `ที่อยู่ภูมิลำเนาจำลอง ชุด ${slot} จังหวัด${province}`, hometown_phone: '0000000000',
      related_skills: `${base.marker} — ${technologies}; ${objective}`,
      emergency_contact_name: `ผู้ติดต่อจำลอง ชุด${slot}`, emergency_contact_relation: 'ผู้ปกครอง (ข้อมูลจำลอง)',
      emergency_contact_phone: '0000000000', emergency_contact_address: address,
    });
    patch('companies', company.id, { address_no: `99/${i + 1}`, subdistrict: 'ตำบลจำลอง', district: 'อำเภอจำลอง', province });
    patch('job_postings', idFor(`${key}:job`), { title,
      description: `${base.marker} — ข้อมูลทดสอบสังเคราะห์ ไม่ใช่ประกาศรับสมัครจริง\nธุรกิจ/แผนก: ${department}\nงานที่ได้รับมอบหมาย: ${objective}\nทักษะ: ${technologies}\nโครงงานที่เกี่ยวข้อง: ${project.topic.split(' — ')[0]}\nปฏิบัติงาน 4 มกราคม–30 เมษายน 2570 ภายใต้พี่เลี้ยงจำลอง ประชุมติดตามงานรายสัปดาห์และจัดทำคู่มือส่งมอบระบบ` });
    patch('coop_projects', project.id, { topic: `${project.topic.split(' — ')[0]} — วัตถุประสงค์: ${objective}; เทคโนโลยี: ${technologies}; ใช้สนับสนุนงาน${department} (โครงงานจำลอง FITM)` });
    patch('coop_requests', request.id, { company_province: province, company_address: address,
      letter_recipient_name: `คุณผู้ประสานงานจำลอง ชุด${slot}`, letter_recipient_position_department: `ผู้จัดการฝ่าย${department} / ประสานงานสหกิจ (จำลอง)` });
    add('student_addresses', `${key}:address`, { student_id: student.id, address_type: 'current', house_no: `99/${i + 1}`,
      road: 'ถนนตัวอย่าง (จำลอง)', subdistrict: 'ตำบลจำลอง', district: 'อำเภอจำลอง', province, postal_code: null }, { student_id: student.id, address_type: 'current' });
    add('student_education_records', `${key}:education`, { student_id: student.id, education_level: 'bachelor',
      institution_name: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (นักศึกษาจำลอง)',
      qualification: 'ปริญญาตรี (ข้อมูลจำลอง ปีการศึกษา 2569 ภาคเรียน 2)', major: 'เทคโนโลยีสารสนเทศ',
      education_status: 'studying', gpa: null, graduation_year: null, display_order: 0 });
    add('student_skills', `${key}:skill:computer`, { student_id: student.id, category: 'computer', skill_name: technologies, proficiency: i % 2 ? 'good' : 'very_good', display_order: 0 });
    add('student_skills', `${key}:skill:language`, { student_id: student.id, category: 'language', skill_name: 'ภาษาอังกฤษ (ข้อมูลจำลอง)', proficiency: i % 3 ? 'moderate' : 'good', display_order: 1 });
    if (i >= 5) {
      const mentor = { first_name: `กวินจำลอง${slot}`, last_name: `นวัตกรรมชุด${slot}`, position: `Senior ${title} / ${department} / ${company.name}` };
      if (i >= 10) patch('mentors', idFor(`${key}:mentor`), mentor);
      else add('mentors', `${key}:mentor`, { ...mentor, student_id: student.id, email: `${base.marker}.mentor${slot}@example.com`, status: 'pending', verified_at: null }, { student_id: student.id });
    }
    const statuses = PATTERNS[i % 5];
    const historyIndex = statuses.indexOf('studying');
    catalog.courses.forEach((course, j) => {
      // Preserve the same original deterministic snapshot ID as the base seeder.
      const id = idFor(`${key}:course:${course.course_code}`), status = statuses[j];
      inserts.push({ table: 'coop_request_prerequisite_courses', id,
        where: { coop_request_id: request.id, course_code: course.course_code }, values: {
          id, coop_request_id: request.id, program: 'IT', course_code: course.course_code, course_name: course.course_name,
          english_name: course.english_name || null, status, grade: status === 'passed' ? GRADES[(i + j) % GRADES.length] : status === 'failed' ? 'F' : null,
          createdAt: submitted, updatedAt: submitted,
        } });
    });
    add('coop_request_academic_states', `${key}:state`, { coop_request_id: request.id, revision: 1, createdAt: reported, updatedAt: reported });
    const course = catalog.courses[historyIndex], passed = ![2, 3].includes(i % 5);
    add('coop_request_academic_history', `${key}:academic-history`, {
      coop_request_id: request.id, prerequisite_course_id: idFor(`${key}:course:${course.course_code}`), course_code: course.course_code,
      actor_student_id: student.id, operation_id: idFor(`completion:v${VERSION}:${key}:academic-operation`), revision: 1,
      old_status: 'studying', old_grade: null, new_status: passed ? 'passed' : 'failed', new_grade: passed ? GRADES[(i + 2) % GRADES.length] : 'F',
      request_status_at_change: request.status, createdAt: reported,
    }, { coop_request_id: request.id, revision: 1 });
    // Pending A has a real submission stage to display. Do not fabricate
    // teacher/head approval actions for pre-existing approved placement fixtures.
    if (i < 5) add('coop_request_reviews', `${key}:submit-review`, { coop_request_id: request.id,
      actor_role: 'student', student_id: student.id, teacher_id: null, department_staff_id: null,
      from_status: 'new', to_status: 'advisor_review', decision: 'submit', reason: `${base.marker} — เหตุการณ์ยื่นคำร้องจำลองสำหรับพัฒนา ไม่ใช่การดำเนินการของบัญชีจริง`, createdAt: submitted });
  }
  return { version: VERSION, catalog, updates, inserts };
}

async function readEntry(sql, entry) {
  if (!/^[a-z_]+$/.test(entry.table || '') || !S.UUID.test(entry.id || '')) S.fail('INVALID_COMPLETION_RECEIPT_IDENTIFIER');
  const { rows } = await sql(`SELECT to_jsonb(r)-'password_hash' AS value FROM public."${entry.table}" r WHERE "${pk(entry.table)}"=$1`, [entry.id]);
  return rows[0]?.value || null;
}
async function preserveOriginal(m, receipt, transaction) {
  const lock = transaction.options.readOnly ? {} : { lock: transaction.LOCK.SHARE };
  const teacher = await m.Teacher.findByPk(receipt.baseline.teacher.id, { transaction, ...lock });
  if (!teacher || S.fingerprint(teacher) !== receipt.baseline.teacher.fingerprint) S.fail('ORIGINAL_TEACHER_CHANGED_NO_COMPLETION');
  for (const saved of receipt.baseline.students) {
    const row = await m.Student.findByPk(saved.id, { transaction, ...lock });
    if (!row || S.fingerprint(row) !== saved.fingerprint) S.fail('ORIGINAL_STUDENT_CHANGED_NO_COMPLETION');
  }
}
async function verifyReceiptRows(sql, entries) {
  for (const entry of entries) {
    const row = await readEntry(sql, entry);
    if (!row || S.digest(row) !== entry.fingerprint) S.fail('FIXTURE_FINGERPRINT_MISMATCH_NO_OVERWRITE');
  }
}

// SELECT through the same request/student/company/job/snapshot relationships as
// Teacher detail. academicSummary is the existing pure DTO transform, not an API test.
async function report(m, base, receipt, transaction) {
  const ids = base.rows.filter(r => r.table === 'students').map(r => r.values.id);
  const requestIds = base.rows.filter(r => r.table === 'coop_requests').map(r => r.values.id);
  const requests = await m.CoopRequest.findAll({ where: { id: { [Op.in]: requestIds } }, include: [prerequisiteInclude(m),
    { model: m.Student, as: 'student' }, { model: m.Company, as: 'company' }, { model: m.JobPosting, as: 'jobPosting' }], transaction });
  const histories = await m.CoopRequestAcademicHistory.findAll({ where: { coop_request_id: { [Op.in]: requestIds } }, transaction });
  const states = await m.CoopRequestAcademicState.findAll({ where: { coop_request_id: { [Op.in]: requestIds } }, transaction });
  const totals = { passed: 0, studying: 0, failed: 0, unselected: 0 }, samples = [];
  let snapshots = 0;
  if (requests.length !== 15 || histories.length !== 15 || states.length !== 15) S.fail('COMPLETION_ACADEMIC_COUNTS_DIFFER');
  for (let i = 0; i < ids.length; i++) {
    const r = requests.find(row => row.student_id === ids[i])?.toJSON();
    if (!r || r.student.advisor_teacher_id !== base.target_teacher_id || r.status !== (i < 5 ? 'advisor_review' : 'approved')
      || r.student.coop_advisor_teacher_id !== (i >= 10 ? base.target_teacher_id : null)
      || r.company_id !== r.company?.id || r.jobPosting?.company_id !== r.company_id || !r.jobPosting.description || !r.company_address || !r.letter_recipient_name) S.fail('COMPLETION_REQUEST_RELATION_OR_STATE_DIFFERS');
    const events = histories.filter(e => e.coop_request_id === r.id).map(e => e.toJSON());
    const revision = states.find(s => s.coop_request_id === r.id)?.revision;
    const academic = academicSummary(r, r.prerequisite_courses, events, { available: true, revision, history: true });
    if (academic.latest_courses.length !== 5 || academic.history.length !== 1 || revision !== 1 || academic.counts.legacy_unconfirmed
      || !academic.latest_courses.some(c => c.original_status !== c.status) || r.student.gpa !== null) S.fail('COMPLETION_DTO_NOT_READABLE_OR_UNSUPPORTED_GPA');
    snapshots += r.prerequisite_courses.length;
    for (const key of Object.keys(totals)) totals[key] += academic.counts[key];
    if (i < 3) samples.push({ student_code: r.student.student_id, courses: academic.latest_courses.length,
      latest_counts: academic.counts, history: academic.history.length, gpa: null });
  }
  const scoped = { student_id: { [Op.in]: ids } };
  const mentors = await m.Mentor.findAll({ where: scoped, transaction });
  const counts = {
    synthetic_students: await m.Student.count({ where: { id: { [Op.in]: ids }, email: { [Op.like]: `${base.marker}.%` } }, transaction }),
    students_with_academic_data: requests.filter(r => r.prerequisite_courses.length === 5).length,
    coop_requests_pending: requests.filter(r => r.status === 'advisor_review').length,
    advisor_requests_pending: await m.CoopProjectAdvisorRequest.count({ where: { ...scoped, requested_advisor_teacher_id: base.target_teacher_id, status: 'pending' }, transaction }),
    new_supervised_students: await m.Student.count({ where: { id: { [Op.in]: ids.slice(10) }, coop_advisor_teacher_id: base.target_teacher_id, track: 'co_op' }, transaction }),
    total_visible_supervised_students: await m.Student.count({ where: { coop_advisor_teacher_id: base.target_teacher_id, track: 'co_op' }, transaction }),
    companies: new Set(requests.map(r => r.company_id)).size, jobs: new Set(requests.map(r => r.job_posting_id)).size,
    projects: await m.CoopProject.count({ where: scoped, transaction }),
    mentors: mentors.length, mentors_verified: mentors.filter(m => m.status === 'verified' && m.verified_at && ids.slice(10).includes(m.student_id)).length,
    mentors_pending: mentors.filter(m => m.status === 'pending' && !m.verified_at && ids.slice(5, 10).includes(m.student_id)).length,
    academic_snapshots: snapshots, academic_states: states.length, academic_history: histories.length,
    request_submission_history: await m.CoopRequestReview.count({ where: { coop_request_id: { [Op.in]: requestIds.slice(0, 5) }, actor_role: 'student', decision: 'submit' }, transaction }),
    education_records: await m.StudentEducationRecord.count({ where: scoped, transaction }),
    addresses: await m.StudentAddress.count({ where: scoped, transaction }), skills: await m.StudentSkill.count({ where: scoped, transaction }),
  };
  if (counts.synthetic_students !== 15 || counts.students_with_academic_data !== 15 || counts.coop_requests_pending !== 5
    || counts.advisor_requests_pending !== 5 || counts.new_supervised_students !== 5 || counts.total_visible_supervised_students !== receipt.baseline.supervised_students + 5
    || counts.companies !== 15 || counts.jobs !== 15 || counts.projects !== 15 || counts.mentors_verified !== 5 || counts.mentors_pending !== 5
    || snapshots !== 75 || counts.request_submission_history !== 5 || counts.education_records !== 15 || counts.addresses !== 15 || counts.skills !== 30) S.fail('COMPLETION_COUNTS_OR_OWNERSHIP_DIFFER');
  const markerStudents = await m.Student.count({ where: { email: { [Op.like]: `${base.marker}.%` } }, transaction });
  if (markerStudents !== 15) S.fail('DUPLICATE_OR_EXTRA_FIXTURE_STUDENTS');
  return { target: 'intern_system/public', teacher_id: base.target_teacher_id, counts, latest_academic_totals: totals, academic_samples: samples,
    original_teacher_unchanged: true, original_students_unchanged: receipt.baseline.students.length,
    gpa_strategy: 'NULL_NO_CREDIT_OR_CUMULATIVE_TRANSCRIPT_OR_BACKEND_GPA_FORMULA',
    unsupported_fields: ['course credits', 'structured academic year/semester', 'separate project English title/objectives/technology columns', 'mentor phone/department/company_id'],
    supervision: 'FIVE_APPROVED_PLACEMENTS_WITH_VERIFIED_MENTORS_READY_FOR_USER_SCHEDULING_VISITS_1_2_NO_APPOINTMENT_OR_TOKEN_CREATED' };
}

async function run(base, options, idFor, { apply = false } = {}) {
  const env = S.loadConfig(options.config);
  if (base.target_teacher_id !== 'e9876862-0d5b-4641-8d5f-990ea3f0b146' || options.teacherId !== base.target_teacher_id || base.marker !== 'fitm.teacher-demo.v1'
    || base.academic_snapshots || (options.confirm && options.confirm !== 'intern_system')) S.fail('COMPLETION_TARGET_MISMATCH');
  const file = S.receiptPath(env.DB_NAME, options.teacherId), pending = file + '.completion.pending';
  const prior = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (prior.status !== 'COMMITTED' || prior.row_format !== 'POSTGRES_JSON_V1' || prior.database !== 'intern_system'
    || prior.teacher_id !== base.target_teacher_id || prior.plan_digest !== S.digest(base) || prior.rows.length !== base.rows.length) S.fail('ORIGINAL_COMMITTED_FIXTURE_RECEIPT_REQUIRED');
  for (const entry of prior.rows) if (!base.rows.some(r => r.table === entry.table && r.values.id === entry.id)) S.fail('RECEIPT_ROW_OUTSIDE_BASE_FIXTURE');
  if (new Set(prior.rows.map(e => `${e.table}:${e.id}`)).size !== base.rows.length) S.fail('DUPLICATE_BASE_RECEIPT_ENTRY');
  if (fs.existsSync(pending) || fs.existsSync(file + '.pending')) S.fail('PENDING_RECEIPT_REQUIRES_COMMIT_INVESTIGATION_NO_RETRY');
  const db = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, { host: '127.0.0.1', port: 5432, dialect: 'postgres', logging: false,
    pool: { min: 0, max: 1 }, dialectOptions: { application_name: 'fitm_authorized_teacher_fixture_completion' } });
  let ownsPending = false, committing = false, committed = false, phase = 'SELECT';
  try {
    if (apply) { fs.writeFileSync(pending, JSON.stringify({ status: 'PENDING_COMPLETION', teacher_id: options.teacherId }), { flag: 'wx', mode: 0o600 }); ownsPending = true; }
    const m = S.defineModels(db), byTable = Object.fromEntries(Object.values(m).filter(v => v.tableName).map(v => [v.tableName, v]));
    const result = await db.transaction({ isolationLevel: apply ? 'SERIALIZABLE' : 'REPEATABLE READ', readOnly: !apply }, async transaction => {
      const sql = async (text, values = []) => { const [rows] = await db.query(text, { bind: values, transaction }); return { rows }; };
      if (!apply) await sql('SET TRANSACTION READ ONLY');
      await sql("SET LOCAL lock_timeout='5s'"); await sql("SET LOCAL statement_timeout='30s'");
      const target = await S.liveTarget({ query: sql }); if (target.db !== 'intern_system') S.fail('LIVE_COMPLETION_TARGET_MISMATCH');
      if (apply) await sql('SELECT pg_advisory_xact_lock(641109100)');
      await S.activeTeacher({ query: sql }, options.teacherId);
      await preserveOriginal(m, prior, transaction);
      const { rows: [shared] } = await sql(`SELECT count(*)::int count FROM public.coop_requests
        WHERE student_id<>ALL($1::uuid[]) AND (company_id=ANY($2::uuid[]) OR job_posting_id=ANY($3::uuid[]))`, [
        base.rows.filter(r => r.table === 'students').map(r => r.values.id),
        base.rows.filter(r => r.table === 'companies').map(r => r.values.id),
        base.rows.filter(r => r.table === 'job_postings').map(r => r.values.id)]);
      if (shared.count) S.fail('SYNTHETIC_COMPANY_OR_JOB_REFERENCED_BY_NONFIXTURE_STUDENT');
      if (apply) for (const entry of prior.rows) await byTable[entry.table].unscoped().findByPk(entry.id, { transaction, lock: transaction.LOCK.UPDATE });
      await verifyReceiptRows(sql, prior.rows);
      let catalog;
      if (apply) catalog = await readStudentCatalog(m, 'IT', transaction);
      else {
        const state = await m.CoopPrerequisiteCatalogProgram.findByPk('IT', { transaction });
        const courses = await m.CoopPrerequisiteCatalogCourse.findAll({ where: { program: 'IT', is_active: true }, transaction,
          attributes: ['course_code', 'course_name', 'english_name', 'display_order'], order: [['display_order', 'ASC'], ['course_code', 'ASC']] });
        if (!state) S.fail('CURRENT_IT_CATALOG_MISSING');
        catalog = { program: 'IT', revision: String(state.revision), source: 'database',
          grade_options: require('../services/coopPrerequisites').GRADE_OPTIONS, courses: courses.map(c => c.toJSON()) };
      }
      const spec = completionPlan(base, catalog, idFor), specDigest = S.digest(spec);
      if (prior.completion) {
        if (prior.completion.version !== VERSION || prior.completion.spec_digest !== specDigest) S.fail('COMPLETION_SPEC_CHANGED_NO_OVERWRITE');
        if (prior.completion.rows.length !== spec.inserts.length || new Set(prior.completion.rows.map(e => `${e.table}:${e.id}`)).size !== spec.inserts.length
          || prior.completion.rows.some(e => !spec.inserts.some(row => row.table === e.table && row.id === e.id))) S.fail('COMPLETION_RECEIPT_ROWS_DIFFER_FROM_OWNED_SPEC');
        await verifyReceiptRows(sql, prior.completion.rows);
        const summary = await report(m, base, prior, transaction);
        return { status: apply ? 'ALREADY_COMPLETE_UNCHANGED' : 'COMMITTED_COMPLETION_SELECT_VERIFIED', ...summary,
          changes: { inserted: {}, updated: {}, reused: {} }, fixture_total_rows: prior.rows.length + prior.completion.rows.length };
      }
      if (!apply) S.fail('COMPLETION_HAS_NOT_BEEN_APPLIED');
      const changes = { inserted: {}, updated: {}, reused: {} };
      const count = (kind, table) => { changes[kind][table] = (changes[kind][table] || 0) + 1; };
      for (const patch of spec.updates) {
        phase = patch.table;
        if (!prior.rows.some(e => e.table === patch.table && e.id === patch.id)) S.fail('UPDATE_OUTSIDE_RECEIPT_OWNED_SYNTHETIC_RECORDS');
        const model = byTable[patch.table].unscoped(), row = await model.findByPk(patch.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!row || Object.keys(patch.values).some(key => !model.rawAttributes[key])) S.fail('UNSUPPORTED_COMPLETION_UPDATE_FIELDS');
        if (Object.entries(patch.values).some(([key, value]) => !equal(row.get(key), value))) { await row.update(patch.values, { transaction }); count('updated', patch.table); }
      }
      for (const entry of spec.inserts) {
        phase = entry.table;
        const model = byTable[entry.table]?.unscoped();
        if (!model || Object.keys(entry.values).some(key => !model.rawAttributes[key])) S.fail('UNSUPPORTED_COMPLETION_INSERT_FIELDS');
        const row = await model.findOne({ where: entry.where, transaction, lock: transaction.LOCK.UPDATE });
        if (row) {
          if (row.get(pk(entry.table)) !== entry.id || Object.entries(entry.values).some(([key, value]) => !equal(row.get(key), value))) S.fail('EXISTING_SUPPORT_OR_IMMUTABLE_SNAPSHOT_DIFFERS_NO_OVERWRITE');
          count('reused', entry.table);
        } else {
          if (await model.findByPk(entry.id, { transaction })) S.fail('DETERMINISTIC_SUPPORT_ID_COLLISION');
          await model.create(entry.values, { transaction }); count('inserted', entry.table);
        }
      }
      await preserveOriginal(m, prior, transaction);
      const next = JSON.parse(JSON.stringify(prior));
      for (const entry of next.rows) entry.fingerprint = S.digest(await readEntry(sql, entry));
      const extra = [];
      for (const entry of spec.inserts) extra.push({ table: entry.table, id: entry.id, fingerprint: S.digest(await readEntry(sql, entry)) });
      next.completion = { version: VERSION, spec_digest: specDigest, snapshot_count: 75, rows: extra, changes };
      const summary = await report(m, base, next, transaction);
      // Persist a complete, secret-free intent before COMMIT. A failed/uncertain
      // commit leaves this file in place and blocks replay rather than overwriting.
      fs.writeFileSync(pending, JSON.stringify({ ...next, status: 'PREPARED_COMPLETION_COMMIT_NOT_CONFIRMED' }));
      committing = true;
      return { status: 'COMPLETION_APPLIED', ...summary, changes, fixture_total_rows: next.rows.length + extra.length, receipt: next };
    });
    committed = true;
    if (apply) {
      if (result.receipt) fs.writeFileSync(pending, JSON.stringify(result.receipt));
      if (result.receipt) fs.renameSync(pending, file); else fs.unlinkSync(pending);
      ownsPending = false;
    }
    delete result.receipt;
    return { ...result, postgres_commit: apply ? true : 'SELECT_ONLY_NEW_TRANSACTION' };
  } catch (error) {
    if (committing || committed) S.fail('COMPLETION_COMMIT_OR_RECEIPT_UNCERTAIN_STOP_NO_AUTOMATIC_RETRY');
    error.safeDetails = { phase_table: phase, error_type: error.name, sql_state: error.original?.code,
      constraint: error.original?.constraint, validation_fields: (error.errors || []).map(e => ({ field: e.path, validator: e.validatorKey })) };
    throw error;
  } finally {
    if (ownsPending && !committing && !committed) fs.unlinkSync(pending);
    await db.close();
  }
}
module.exports = { run };
