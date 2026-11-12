// User-authorized Development data operation, 11 November 2026.
// Separate namespace/receipt from teacherDashboardDemo; never imported at startup.
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomBytes } = require('node:crypto');
const { Sequelize, Op, QueryTypes } = require('sequelize');
const S = require('./teacherDashboardDemoSafety');
const { periodSchemaState, applyAcademicPeriodSchema } = require('../db/addCoopAcademicPeriods');
const TEACHER = 'e9876862-0d5b-4641-8d5f-990ea3f0b146';
const MARKER = 'fitm.teacher-search.v1';
const ROOT = path.resolve(__dirname, '../../..');
const RECEIPT = path.join(ROOT, '.local-dev-accounts', 'intern_system-teacher-search-v1.json');
const PENDING = RECEIPT + '.pending';
const idFor = key => {
  const h = createHash('sha256').update(`${MARKER}:${key}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
};
const PEOPLE = [
  ['อคิราห์','ธาราศิลป์','Akhira','Tharasin'], ['ชญานิน','ภัทรเวช','Chayanin','Phattharawet'],
  ['ตฤณภพ','วรเศรษฐ์','Trinnaphop','Woraset'], ['นภัสสร','จิราวงศ์','Naphatsorn','Chirawong'],
  ['ปวีณวัช','เมธาวัฒน์','Paweenawat','Methawat'], ['มนัสวี','กาญจนธาร','Manatsawee','Kanchanathan'],
  ['รวิภาส','อรุณวิทย์','Rawiphat','Arunwit'], ['ลลิตภัทร','ชลธารา','Lalitphat','Chonthara'],
  ['วชิรเมธ','กิตติวรางค์','Wachiramet','Kittiworang'], ['ศศิธร','ปัญญาศิลป์','Sasithorn','Panyasin'],
  ['อธิรัตน์','ไพศาลกิจ','Athirat','Phaisankit'], ['กัญญ์วรา','ภูริธาร','Kanwara','Phurithan'],
  ['เขมภัทร','ศุภวรินทร์','Khemphat','Supphawarin'], ['จิรัชญา','ธนาวิทย์','Chiratchaya','Thanawit'],
  ['ณัฐปกรณ์','รวีวัฒน์','Natthapakon','Raweewat'], ['ดารินทร์','วรรณเมธ','Darin','Wannamet'],
  ['ธนวิชญ์','กุลปรีชา','Thanawit','Kunpricha'], ['นิชนันท์','พรหมวรินทร์','Nichanan','Phromwarin'],
  ['ปกรณ์เกียรติ','ศิราธาร','Pakornkiat','Sirathan'], ['พัชรินทร์','อนันตศิลป์','Phatcharin','Anantasin'],
  ['ภัทรดนัย','เจริญเมธ','Phattharadanai','Charoenmet'], ['มินตรา','สุวรรณกิจ','Mintra','Suwannakit'],
  ['ยศพนธ์','ธาราพงศ์','Yotsaphon','Tharaphong'], ['รติรัตน์','ภูมิวรางค์','Ratirat','Phumiworang'],
  ['วรปกรณ์','นวเมธา','Worapakon','Nawametha'], ['ศิรินภา','พัฒนธาร','Sirinapha','Phatthanathan'],
  ['สหัสวรรษ','วโรดมกิจ','Sahatsawat','Warodomkit'], ['อัญชิสา','เรืองปรีชา','Anchisa','Rueangpricha'],
  ['เอกภณ','พิชญาศิลป์','Ekkaphon','Phitchayasin'], ['กมลวรรณ','จารุธาร','Kamonwan','Charuthan'],
  ['คณาธิป','อัครวิทย์','Khanathip','Akkharawit'], ['ชุติภา','ศรีนวรัตน์','Chutipha','Srinawarat'],
  ['เตชภัทร','ภาณุเมธ','Techaphat','Phanumet'], ['ทิพยรัตน์','จิรพงศ์กิจ','Thipphayarat','Chiraphongkit'],
  ['บวรวิชญ์','ปรีชาธาร','Bowonwit','Prichathan'],
];
const JOBS = {
  IT: [
    ['Software Developer','ระบบบริหารงานบริการลูกค้า','Node.js, PostgreSQL, Git','พัฒนา API และบันทึกประวัติงานบริการ'],
    ['Web Developer','เว็บติดตามการส่งสินค้า','JavaScript, HTML, CSS','พัฒนาหน้าจอติดตามพัสดุที่รองรับมือถือ'],
    ['Data Analyst','รายงานวิเคราะห์การใช้พลังงาน','Python, SQL, Power BI','เตรียมข้อมูลและสร้างรายงานแนวโน้มการใช้พลังงาน'],
    ['Database Developer','ฐานข้อมูลการจองทรัพยากร','PostgreSQL, SQL, Python','ออกแบบฐานข้อมูลและปรับปรุงคำค้นการจอง'],
    ['QA Engineer','ระบบตรวจสอบคุณภาพแอปพลิเคชัน','JavaScript, Git, SQL','จัดทำกรณีทดสอบและรายงานปัญหาระบบจำลอง'],
    ['Full Stack Developer','ระบบคลังอุปกรณ์อัจฉริยะ','JavaScript, Node.js, PostgreSQL','พัฒนาการรับเข้าเบิกจ่ายและสรุปยอดอุปกรณ์'],
  ],
  INE: [
    ['Network Engineer','ระบบติดตามคุณภาพเครือข่าย','TCP/IP, VLAN, SNMP','จัดทำแผนผังเครือข่ายและระบบเฝ้าระวัง'],
    ['Infrastructure Engineer','ระบบทะเบียนเครื่องแม่ข่าย','Linux, Bash, Ansible','จัดทำทะเบียนทรัพยากรและแผนสำรองข้อมูล'],
    ['Cybersecurity Analyst','ระบบวิเคราะห์เหตุการณ์ความปลอดภัย','Linux, Python, SIEM','รวบรวม Log จำลองและวิเคราะห์เหตุการณ์'],
    ['Cloud Network Operations','ระบบติดตามทรัพยากรคลาวด์','Docker, Linux, Prometheus','ติดตามการเชื่อมต่อและการใช้ทรัพยากรคลาวด์ทดสอบ'],
    ['IoT Network Engineer','ระบบเครือข่ายเซนเซอร์โรงงาน','MQTT, Python, TCP/IP','ออกแบบการรับส่งข้อมูลเซนเซอร์จำลองและติดตามอุปกรณ์'],
  ],
};
const TERMS = [[2567,1,5],[2567,2,5],[2568,1,6],[2568,2,6],[2569,1,8],[2569,2,5]];
const LOCATIONS = [['กรุงเทพมหานคร','บางนา','บางนา'],['ปทุมธานี','คลองหนึ่ง','คลองหลวง'],['นนทบุรี','บางเขน','เมืองนนทบุรี'],['ชลบุรี','ทุ่งสุขลา','ศรีราชา'],['ปราจีนบุรี','เนินหอม','เมืองปราจีนบุรี']];

function buildPlan(teacher, catalogs) {
  const rows = [], roster = [];
  function add(table, key, values) { const id = idFor(key); rows.push({ table, id, values: { id, ...values } }); return id; }
  for (const [year, semester] of TERMS) add('coop_academic_periods', `period:${year}:${semester}`, { academic_year: year, semester });
  let i = 0;
  for (const [year, semester, count] of TERMS) for (let n = 0; n < count; n++, i++) {
    const slot = String(i + 1).padStart(2,'0'), key = `student:${slot}`;
    const menu = ['coop','students','advisor'][i % 3], major = i % 2 === 0 || i === 33 ? 'IT' : 'INE';
    const [first_name,last_name,first_name_en,last_name_en] = PEOPLE[i];
    const [title, topic, technologies, duties] = JOBS[major][Math.floor(i / 2) % JOBS[major].length];
    const [province, subdistrict, district] = LOCATIONS[i % LOCATIONS.length];
    const gregorian = year - 543;
    const start = semester === 2 ? `${gregorian+1}-01-04` : year === 2569 ? '2026-08-03' : `${gregorian}-06-03`;
    const end = semester === 2 ? `${gregorian+1}-04-30` : year === 2569 ? '2026-12-04' : `${gregorian}-09-27`;
    const submitted = `${gregorian}-${semester === 2 ? '11-01' : '04-15'}T09:00:00+07:00`;
    const later = `${gregorian}-${semester === 2 ? '11-02' : '04-16'}T10:00:00+07:00`;
    const historical = year < 2569, period = idFor(`period:${year}:${semester}`);
    const student = add('students', key, { student_id: String(9906980000001+i),
      email: `${MARKER}.student${slot}@email.kmutnb.ac.th`, first_name, last_name, major, year_level: 4,
      gpa: null, last_semester_gpa: null, department: teacher.department,
      faculty: 'คณะเทคโนโลยีและการจัดการอุตสาหกรรม', track: 'co_op', status: menu === 'coop' ? 'searching' : 'placed',
      advisor_teacher_id: teacher.id, coop_advisor_teacher_id: menu === 'students' ? teacher.id : null,
      createdAt: submitted, updatedAt: submitted });
    add('student_profiles', `${key}:profile`, { student_id: student, prefix: i % 2 ? 'นางสาว' : 'นาย', english_first_name: first_name_en, english_last_name: last_name_en,
      related_skills: `${MARKER} — ข้อมูลสังเคราะห์; ${technologies}`, current_phone: '0000000000',
      current_address: `99/${i+1} ต.${subdistrict} อ.${district} ${province} (จำลอง)` });
    add('student_skills', `${key}:skills`, { student_id: student, category: 'computer', skill_name: technologies, proficiency: 'good', display_order: 0 });
    add('student_education_records', `${key}:education`, { student_id: student, education_level: 'bachelor',
      institution_name: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (ข้อมูลสังเคราะห์)',
      qualification: `ปริญญาตรี (จำลอง ${year}/${semester})`, major, education_status: 'studying', gpa: null, display_order: 0 });
    add('coop_projects', `${key}:project`, { student_id: student, topic: `${topic}สำหรับหน่วยงาน${slot} — ${duties}; ${technologies} (โครงการสังเคราะห์)` });
    if (menu === 'advisor') add('coop_project_advisor_requests', `${key}:advisor`, {
      student_id: student, requested_advisor_teacher_id: teacher.id, academic_period_id: period,
      status: historical ? 'rejected' : 'pending', requested_at: submitted, rejected_at: historical ? later : null,
      rejection_reason: historical ? `${MARKER}: สถานะตัวอย่างย้อนหลัง ไม่ใช่การดำเนินการของอาจารย์จริง` : null,
      createdAt: submitted, updatedAt: historical ? later : submitted });
    const companyName = `บริษัท ${['นวเมธา','ธาราดิจิทัล','วิชั่นเน็ต','ภูมิคลาวด์','อรุณซิสเต็มส์','เมทริกซ์ดาต้า','เครือข่ายพลัส'][i % 7]} ${['โซลูชัน','เทคโนโลยี','อินโนเวชัน','เซอร์วิส','เอ็นจิเนียริ่ง'][Math.floor(i / 7)]} (จำลอง)`;
    const email = `${MARKER}.company${slot}@example.com`;
    const company = add('companies', `${key}:company`, { name: companyName, normalized_name: companyName.toLowerCase(),
      email, normalized_email: email, phone: '0000000000', address_no: `99/${i+1}`, subdistrict, district, province, email_verified_at: submitted });
    const submission = add('job_submissions', `${key}:submission`, { company_id: company, submitted_email: email, normalized_submitted_email: email,
      verification_status: 'verified', submitted_at: submitted, verified_at: submitted });
    const job = add('job_postings', `${key}:job`, { company_id: company, submission_id: submission, title, category: 'information_technology',
      description: `${MARKER} — บริษัทจำลองให้บริการ${major === 'IT' ? 'พัฒนาระบบสารสนเทศและวิเคราะห์ข้อมูล' : 'ออกแบบเครือข่ายและโครงสร้างพื้นฐาน'}; ${duties}; โครงการ ${topic}สำหรับหน่วยงาน${slot}; เครื่องมือ ${technologies}`,
      quota: 1, compensation_text: '300 บาท/วัน (จำลอง)', work_days_per_week: 5, status: historical ? 'expired' : 'published',
      submitted_at: submitted, reviewed_at: submitted, published_at: submitted, expires_at: `${start}T00:00:00+07:00` });
    add('job_posting_work_modes', `${key}:mode`, { job_posting_id: job, mode: 'onsite' });
    const status = menu === 'coop' ? historical ? i % 2 ? 'rejected' : 'approved' : 'advisor_review'
      : year === 2569 && semester === 1 && menu === 'students' ? 'in_progress' : 'approved';
    const request = add('coop_requests', `${key}:request`, { student_id: student, company_id: company, job_posting_id: job,
      academic_period_id: period, company_name: companyName, company_province: province,
      company_address: `99/${i+1} ต.${subdistrict} อ.${district} ${province} (ข้อมูลสังเคราะห์)`,
      letter_recipient_name: `คุณผู้ประสานงาน จำลองชุด${slot}`, letter_recipient_position_department: 'ฝ่ายทรัพยากรบุคคล (จำลอง)',
      work_start_date: start, work_end_date: end, submitted_at: submitted, status,
      started_at: status === 'in_progress' ? `${start}T09:00:00+07:00` : null, createdAt: submitted, updatedAt: submitted });
    add('coop_request_delivery_methods', `${key}:delivery`, { coop_request_id: request, method: 'self_submit' });
    // Original and latest agree: no fabricated grades/transcript, GPA, or actor
    // history. Catalog names/codes come exclusively from the live DB snapshot.
    for (const course of catalogs[major].courses) add('coop_request_prerequisite_courses', `${key}:course:${course.course_code}`, {
      coop_request_id: request, program: major, course_code: course.course_code, course_name: course.course_name,
      english_name: course.english_name || null, status: 'unselected', grade: null, createdAt: submitted, updatedAt: submitted });
    rows.push({ table: 'coop_request_academic_states', id: request, values: { coop_request_id: request, revision: 1, createdAt: submitted, updatedAt: submitted } });
    if (menu !== 'coop') add('mentors', `${key}:mentor`, { student_id: student, email: `${MARKER}.mentor${slot}@example.com`,
      first_name: `เมธาจำลอง${slot}`, last_name: `วิศวกรรมชุด${slot}`, position: `Senior ${title} / ${companyName}`,
      status: menu === 'students' ? 'verified' : 'pending', verified_at: menu === 'students' ? later : null });
    roster.push({ id: student, request_id: request, menu, major, year, semester, status });
  }
  return { marker: MARKER, version: 1, teacher_id: teacher.id, catalogs, rows, roster };
}

const pk = table => table === 'coop_request_academic_states' ? 'coop_request_id' : 'id';
const sqlRunner = (db, transaction) => async (sql, bind = []) => ({ rows: await db.query(sql, { bind, transaction, type: QueryTypes.SELECT }) });
async function snapshot(sql, tables) {
  const result = {};
  for (const table of tables) {
    if (!/^[a-z_]+$/.test(table)) S.fail('INVALID_TABLE');
    // Store only digests, including credentials in the digest but never outputting
    // any credential or raw personal value. No raw records enter the receipt.
    const { rows } = await sql(`SELECT ${pk(table)} id,md5(to_jsonb(t)::text) fingerprint FROM public.${table} t ORDER BY ${pk(table)}`);
    result[table] = rows;
  }
  return result;
}
async function preserve(sql, baseline) {
  for (const [table, before] of Object.entries(baseline)) {
    const after = new Map((await snapshot(sql, [table]))[table].map(row => [row.id,row.fingerprint]));
    if (before.some(row => after.get(row.id) !== row.fingerprint)) S.fail('EXISTING_DATA_CHANGED_STOP_NO_REPAIR');
  }
}
async function stored(sql, row) {
  const { rows } = await sql(`SELECT md5(to_jsonb(t)::text) fingerprint FROM public.${row.table} t WHERE ${pk(row.table)}=$1`, [row.id]);
  return rows[0]?.fingerprint;
}
async function receiptRows(sql, receipt) {
  for (const row of receipt.rows) if (!/^[a-z_]+$/.test(row.table) || !S.UUID.test(row.id)
    || await stored(sql,row) !== row.fingerprint) S.fail('OWNED_FIXTURE_CHANGED_OR_MISSING_STOP_NO_REPLAY');
  await preserve(sql, receipt.baseline);
}
async function context(m, transaction) {
  const sql = sqlRunner(m.sequelize, transaction), target = await S.liveTarget({ query: sql });
  if (target.db !== 'intern_system') S.fail('DEVELOPMENT_TARGET_REQUIRED');
  const teacher = await S.activeTeacher({ query: sql }, TEACHER);
  const catalogs = {};
  for (const major of ['IT','INE']) {
    // The runtime submission catalog reader takes FOR SHARE; discovery must be
    // strictly read-only. The writer locks catalog tables before its final read.
    const state = await m.CoopPrerequisiteCatalogProgram.findByPk(major,{transaction});
    const courses = await m.CoopPrerequisiteCatalogCourse.findAll({where:{program:major,is_active:true},
      attributes:['course_code','course_name','english_name','display_order'],order:[['display_order','ASC'],['course_code','ASC']],transaction});
    if(!state||!courses.length) S.fail('EMPTY_OR_MISSING_LIVE_CATALOG_STOP');
    catalogs[major]={program:major,revision:String(state.revision),source:'database',courses:courses.map(row=>row.toJSON())};
  }
  return { sql, teacher, catalogs, target, plan: buildPlan(teacher,catalogs) };
}
async function preflight(m, transaction, ctx, prior) {
  const { sql, plan } = ctx;
  if (await periodSchemaState(m.sequelize,transaction) !== 'PRESENT') S.fail('APPLY_ADDITIVE_SCHEMA_FIRST');
  if (prior) {
    if (prior.status !== 'COMMITTED' || prior.marker !== MARKER || prior.plan_digest !== S.digest(plan)
      || prior.database !== 'intern_system' || prior.teacher_id !== TEACHER || prior.rows?.length !== plan.rows.length
      || plan.rows.some(row => !prior.rows.some(saved => saved.table === row.table && saved.id === row.id))) S.fail('RECEIPT_PLAN_MISMATCH_STOP');
    await receiptRows(sql,prior); return;
  }
  const byTable = Object.fromEntries(Object.values(m).filter(model => model.tableName).map(model => [model.tableName,model]));
  for (const row of plan.rows) {
    if (Object.keys(row.values).some(key => !byTable[row.table].rawAttributes[key])) S.fail('UNMODELED_SEED_FIELD_STOP');
    if (await stored(sql,row)) S.fail('DETERMINISTIC_ID_COLLISION_STOP');
  }
  const students = plan.rows.filter(row => row.table === 'students').map(row => row.values);
  if (await m.Student.count({ where: { [Op.or]: students.flatMap(s => [{student_id:s.student_id},{email:s.email},{first_name:s.first_name,last_name:s.last_name}]) }, transaction })) S.fail('STUDENT_NATURAL_KEY_COLLISION_STOP');
  const companies = plan.rows.filter(row => row.table === 'companies').map(row => row.values);
  if (await m.Company.count({ where: { [Op.or]: companies.flatMap(c => [{normalized_name:c.normalized_name},{normalized_email:c.normalized_email}]) }, transaction })) S.fail('COMPANY_NATURAL_KEY_COLLISION_STOP');
  const periods = plan.rows.filter(row => row.table === 'coop_academic_periods').map(row => row.values);
  if (await m.CoopAcademicPeriod.count({ where: { [Op.or]: periods.map(p => ({academic_year:p.academic_year,semester:p.semester})) }, transaction })) S.fail('PERIOD_NATURAL_KEY_COLLISION_STOP');
  const mentorEmails = plan.rows.filter(row => row.table === 'mentors').map(row => row.values.email);
  if (await m.Mentor.count({ where: { email: { [Op.in]: mentorEmails } }, transaction })) S.fail('MENTOR_EMAIL_COLLISION_STOP');
  // Model validation belongs to the authorized seed preflight, not a test runner.
  for (const row of plan.rows) {
    const values = { ...row.values };
    if (row.table === 'students') values.password = randomBytes(32).toString('base64url');
    await byTable[row.table].build(values).validate();
  }
}
async function report(sql, plan, receipt) {
  const ids = plan.roster.map(row => row.id);
  const { rows: groups } = await sql(`SELECT p.academic_year AS year,p.semester,s.major,count(*)::int students
    FROM students s JOIN coop_requests r ON r.student_id=s.id JOIN coop_academic_periods p ON p.id=r.academic_period_id
    WHERE s.id=ANY($1::uuid[]) GROUP BY p.academic_year,p.semester,s.major ORDER BY 1,2,3`, [ids]);
  const { rows: [counts] } = await sql(`SELECT count(*)::int students,
    count(*) FILTER (WHERE s.major='IT')::int it,count(*) FILTER (WHERE s.major='INE')::int ine,
    count(*) FILTER (WHERE s.coop_advisor_teacher_id=$2)::int supervised,
    (SELECT count(*)::int FROM coop_project_advisor_requests WHERE student_id=ANY($1::uuid[]) AND requested_advisor_teacher_id=$2) advisor_requests,
    (SELECT count(*)::int FROM coop_request_prerequisite_courses pc JOIN coop_requests r ON r.id=pc.coop_request_id WHERE r.student_id=ANY($1::uuid[])) snapshots,
    (SELECT count(*)::int FROM mentors WHERE student_id=ANY($1::uuid[]) AND status='verified') verified_mentors,
    (SELECT count(*)::int FROM mentors WHERE student_id=ANY($1::uuid[]) AND status='pending') pending_mentors
    FROM students s WHERE s.id=ANY($1::uuid[]) AND s.advisor_teacher_id=$2`, [ids,TEACHER]);
  const { rows: [relations] } = await sql(`SELECT count(*)::int valid_placements FROM students s
    JOIN coop_requests r ON r.student_id=s.id JOIN companies c ON c.id=r.company_id
    JOIN job_postings j ON j.id=r.job_posting_id AND j.company_id=c.id
    JOIN coop_projects cp ON cp.student_id=s.id JOIN coop_request_academic_states a ON a.coop_request_id=r.id
    WHERE s.id=ANY($1::uuid[]) AND s.advisor_teacher_id=$2 AND r.academic_period_id IS NOT NULL
    AND s.gpa IS NULL AND s.last_semester_gpa IS NULL`, [ids,TEACHER]);
  const { rows: menus } = await sql(`SELECT CASE WHEN s.coop_advisor_teacher_id=$2 THEN 'students'
    WHEN EXISTS(SELECT 1 FROM coop_project_advisor_requests ar WHERE ar.student_id=s.id AND ar.requested_advisor_teacher_id=$2)
    THEN 'advisor' ELSE 'coop' END menu,count(*)::int students FROM students s WHERE s.id=ANY($1::uuid[]) GROUP BY 1 ORDER BY 1`,[ids,TEACHER]);
  if (counts.students !== 35 || counts.supervised !== 12 || counts.advisor_requests !== 11 || relations.valid_placements !== 35) S.fail('POST_COMMIT_SELECT_COUNTS_DIFFER_STOP');
  return { counts, relations, groups, menus, rows_by_table: Object.fromEntries([...new Set(receipt.rows.map(row=>row.table))].map(table=>[table,receipt.rows.filter(row=>row.table===table).length])), existing_rows_unchanged: true };
}

async function run(mode) {
  const env = S.loadConfig();
  const db = new Sequelize(env.DB_NAME,env.DB_USER,env.DB_PASSWORD,{host:'127.0.0.1',port:5432,dialect:'postgres',logging:false,pool:{min:0,max:1},dialectOptions:{application_name:'fitm_authorized_teacher_search_seed'}});
  let pendingOwned = false, committing = false, committed = false, phase = null;
  try {
    const m = S.defineModels(db);
    if (mode === '--apply-schema') {
      const result = await db.transaction(async transaction => {
        await db.query("SET LOCAL lock_timeout='5s'",{transaction});
        const ctx = await context(m,transaction);
        await db.query('SELECT pg_advisory_xact_lock(641111350)',{transaction});
        return applyAcademicPeriodSchema(db,transaction);
      });
      return { ...result, postgres_commit: true };
    }
    if (fs.existsSync(PENDING)) S.fail('PENDING_OR_UNCERTAIN_RECEIPT_STOP_NO_REPLAY');
    const prior = fs.existsSync(RECEIPT) ? JSON.parse(fs.readFileSync(RECEIPT,'utf8')) : null;
    if (mode === '--inspect' || mode === '--verify-data') return await db.transaction({isolationLevel:'REPEATABLE READ',readOnly:true},async transaction=>{
      await db.query('SET TRANSACTION READ ONLY',{transaction});
      const ctx = await context(m,transaction);
      if (mode === '--inspect') {
        const state = await periodSchemaState(db,transaction);
        if (state === 'PRESENT') await preflight(m,transaction,ctx,prior);
        return {status:'READ_ONLY_PREFLIGHT',database:ctx.target.db,schema:ctx.target.schema,teacher_active:true,period_schema:state,
          catalog_courses:Object.fromEntries(Object.entries(ctx.catalogs).map(([key,value])=>[key,value.courses.length])),planned_students:35};
      }
      if (!prior) S.fail('COMMITTED_RECEIPT_REQUIRED');
      await preflight(m,transaction,ctx,prior);
      return {status:'COMMITTED_SELECT_VERIFIED',...(await report(ctx.sql,ctx.plan,prior))};
    });
    if (mode !== '--apply') S.fail('EXPLICIT_INSPECT_APPLY_SCHEMA_APPLY_OR_VERIFY_REQUIRED');
    // Read-only preflight must finish before creating intent or writing rows.
    await db.transaction({readOnly:true},async transaction=>{
      await db.query('SET TRANSACTION READ ONLY',{transaction});
      const ctx=await context(m,transaction);await preflight(m,transaction,ctx,prior);
    });
    fs.mkdirSync(path.dirname(RECEIPT),{recursive:true});
    const fd=fs.openSync(PENDING,'wx',0o600);fs.closeSync(fd);pendingOwned=true;
    fs.writeFileSync(PENDING,JSON.stringify({status:'PENDING',marker:MARKER,database:'intern_system'}));
    const receipt=await db.transaction({isolationLevel:'SERIALIZABLE'},async transaction=>{
      await db.query("SET LOCAL lock_timeout='5s'",{transaction});
      await db.query("SET LOCAL statement_timeout='30s'",{transaction});
      await db.query('SELECT pg_advisory_xact_lock(641111350)',{transaction});
      // Lock parents/catalog and existing fixture tables against concurrent edits.
      // No external services or app startup are imported.
      let ctx=await context(m,transaction);
      const tables=[...new Set(['teachers','department_staffs',...ctx.plan.rows.map(row=>row.table)])].sort();
      for(const table of tables) await db.query(`LOCK TABLE public.${table} IN SHARE ROW EXCLUSIVE MODE`,{transaction});
      for(const table of ['coop_prerequisite_catalog_courses','coop_prerequisite_catalog_programs']) await db.query(`LOCK TABLE public.${table} IN SHARE MODE`,{transaction});
      ctx=await context(m,transaction);
      await preflight(m,transaction,ctx,prior);
      if(prior) return {...prior,already_present:true};
      const baseline=await snapshot(ctx.sql,tables),rows=[];
      const byTable=Object.fromEntries(Object.values(m).filter(model=>model.tableName).map(model=>[model.tableName,model]));
      for(const planned of ctx.plan.rows){
        phase=planned.table;const values={...planned.values};
        // A discarded random secret is required by the existing Student hook.
        // It is never retained, printed, distributed, or made available for login.
        if(phase==='students') values.password=randomBytes(32).toString('base64url');
        await byTable[phase].create(values,{transaction});
        rows.push({table:phase,id:planned.id,fingerprint:await stored(ctx.sql,planned)});
      }
      await preserve(ctx.sql,baseline);
      const receipt={status:'COMMITTED',marker:MARKER,plan_digest:S.digest(ctx.plan),database:'intern_system',teacher_id:TEACHER,baseline,rows};
      fs.writeFileSync(PENDING,JSON.stringify({...receipt,status:'PREPARED_COMMIT_NOT_CONFIRMED'}));
      committing=true;return receipt;
    });
    committed=true;
    if(!receipt.already_present) fs.writeFileSync(RECEIPT,JSON.stringify(receipt),{flag:'wx',mode:0o600});
    fs.unlinkSync(PENDING);pendingOwned=false;
    return {status:receipt.already_present?'ALREADY_PRESENT_UNCHANGED':'CREATED',postgres_commit:true,
      inserted:receipt.already_present?0:receipt.rows.length,updated:0,deleted:0,students:receipt.already_present?0:35,menus:{coop:12,advisor:11,students:12}};
  }catch(error){
    if(committing||committed) S.fail('COMMIT_OR_RECEIPT_UNCERTAIN_STOP_NO_REPLAY');
    error.safeDetails={table:phase,type:error.name,sql_state:error.original?.code,constraint:error.original?.constraint,
      ...(error.original?.code === '42601' ? { syntax_message: error.original.message, position: error.original.position } : {}),
      fields:(error.errors||[]).map(item=>({field:item.path,validator:item.validatorKey}))};throw error;
  }finally{
    if(pendingOwned&&!committing&&!committed) fs.unlinkSync(PENDING);
    await db.close();
  }
}
if(require.main===module) run(process.argv[2]).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
  console.error(JSON.stringify({code:error.publicCode||(/^\w+$/.test(error.message)?error.message:'SEED_STOPPED'),details:error.safeDetails}));process.exitCode=1;
});
module.exports={buildPlan,run,MARKER,TEACHER};
