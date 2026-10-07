// Explicit opt-in Local acceptance. Existing faculty are reused; only owned
// temporary Students/requests are cleaned. No existing Student credentials change.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const jwt = require("jsonwebtoken");
const { createTeacherCredentialManager, CredentialError } = require("../src/seeders/devTeacherCredential");

async function run(models) {
  if (process.env.NODE_ENV !== "development" || process.env.FITM_LOCAL_ADVISOR_ACCEPTANCE !== "1") throw Error("Explicit Local acceptance opt-in required");
  const m = models;
  const [target] = await m.sequelize.query("SELECT current_database() AS db");
  assert.equal(target[0].db, "intern_system");
  assert.equal(await m.Teacher.count(), 23);
  assert.equal(await m.Teacher.count({ where: { email: { [m.Sequelize.Op.ne]: null }, password_hash: { [m.Sequelize.Op.ne]: null } } }), 0);
  const teachers = await m.Teacher.findAll({ where: { status: "active", email: null, password_hash: null }, order: [["first_name", "ASC"], ["id", "ASC"]] });
  const a = process.env.TEACHER_TEST_ID ? teachers.find(row => row.id === process.env.TEACHER_TEST_ID) : teachers[0];
  assert.ok(a, "Existing credential-free active Teacher required");
  const b = teachers.find(row => row.id !== a.id), c = teachers.find(row => row.id !== a.id && row.id !== b.id);
  assert.ok(b && c);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fitm-local-teacher-acceptance-"));
  const password = process.env.TEACHER_TEST_PASSWORD || crypto.randomBytes(24).toString("base64url");
  const email = process.env.TEACHER_TEST_EMAIL || "fitm-advisor-local@fixture.invalid";
  const passwordPath = path.join(root, "teacher-password.txt");
  const manager = createTeacherCredentialManager(m);
  const credential = (teacher, file) => ({ environment: "development", teacherId: teacher.id, email, password, backupPath: path.join(root, file) });
  const firstA = credential(a, "teacher-a-original.json"), temporaryB = credential(b, "teacher-b-original.json"), finalA = credential(a, "teacher-a-final-restore.json");
  const fixtures = [], checks = [];
  let activeCredential, success = false;
  const api = async (url, token, body) => {
    const response = await fetch("http://127.0.0.1:5000" + url, { method: body === undefined ? "GET" : "POST", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    return { status: response.status, data };
  };
  const ok = async promise => { const result = await promise; assert.equal(result.status, 200); return result.data; };
  const select = (student, teacher) => ok(api("/api/student-coop/project-advisor-request", student.token, { teacher_id: teacher.id }));
  const read = student => ok(api("/api/student-coop/project-advisor-request", student.token));
  const decision = (id, token, action = "accept", body = {}) => api(`/api/teachers/project-advisor-requests/${id}/${action}`, token, body);
  const mark = text => { checks.push(text); console.log(`PASS ${text}`); };
  async function snapshot() {
    return m.sequelize.transaction(async transaction => {
      await m.sequelize.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY", { transaction });
      const [tables] = await m.sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", { transaction });
      const values = {};
      for (const { tablename } of tables) {
        assert.match(tablename, /^[a-z_]+$/);
        const [rows] = await m.sequelize.query(`SELECT count(*)::int AS rows,md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY to_jsonb(t)::text), '')) AS fingerprint FROM public.${tablename} t`, { transaction });
        values[tablename] = rows[0];
      }
      const [faculty] = await m.sequelize.query("SELECT md5(COALESCE(string_agg(md5((to_jsonb(t)-'email'-'password_hash')::text), '' ORDER BY (to_jsonb(t)-'email'-'password_hash')::text), '')) AS fingerprint FROM teachers t", { transaction });
      return { tables: values, faculty: faculty[0].fingerprint };
    });
  }
  const before = await snapshot();
  await fs.writeFile(path.join(root, "before.json"), JSON.stringify(before), { flag: "wx", mode: 0o600 });
  async function fixture() {
    const runId = crypto.randomUUID().replaceAll("-", "").slice(0, 12), fixturePassword = crypto.randomBytes(24).toString("base64url");
    const row = await m.Student.create({ student_id: `local-advisor-${runId}`, email: `local-advisor-${runId}@email.kmutnb.ac.th`, first_name: "Local Acceptance", last_name: "Temporary Student", major: "IT", track: "co_op", advisor_teacher_id: c.id, password: fixturePassword });
    fixtures.push({ id: row.id, email: row.email, student_id: row.student_id });
    const login = await ok(api("/api/auth/login", null, { email: row.email, password: fixturePassword }));
    assert.equal(login.data.id, row.id); assert.doesNotMatch(JSON.stringify(login.data), /password_hash/);
    return { id: row.id, token: login.token };
  }
  async function assertStudent(student, expectedAdvisor) {
    const row = await m.Student.findByPk(student.id);
    assert.equal(row.advisor_teacher_id, c.id); assert.equal(row.coop_advisor_teacher_id, expectedAdvisor);
  }
  async function loginTeacher(teacher) {
    const login = await ok(api("/api/teachers/auth/login", null, { email, password }));
    const profile = await ok(api("/api/teachers/me", login.token));
    assert.equal(profile.data.id, teacher.id); assert.equal(profile.data.email, email.toLowerCase().trim());
    assert.equal(profile.data.first_name, teacher.first_name); assert.equal(profile.data.last_name, teacher.last_name);
    const claims = jwt.decode(login.token);
    assert.equal(claims.id, teacher.id); assert.equal(claims.teacher_id, teacher.id); assert.equal(claims.actor_type, "teacher"); assert.equal(claims.role, "teacher");
    assert.doesNotMatch(JSON.stringify([login.teacher, profile]), /password_hash/);
    return login.token;
  }
  try {
    await manager.provision(firstA); activeCredential = firstA;
    const tokenA = await loginTeacher(a); mark("Local Teacher password login/me identity and authorization");
    const student = await fixture(); const request = (await select(student, a)).advisor_request;
    assert.equal(request.status, "pending"); await assertStudent(student, null);
    const queue = await ok(api("/api/teachers/project-advisor-requests", tokenA)); assert.ok(queue.some(row => row.id === request.id));
    assert.equal((await decision(request.id, tokenA)).status, 200);
    const accepted = await read(student); assert.equal(accepted.advisor_request.status, "confirmed"); assert.equal(accepted.confirmed_advisor.id, a.id); await assertStudent(student, a.id);
    assert.equal((await decision(request.id, tokenA)).status, 409); mark("Student -> Teacher A accept -> Student confirmed read-back/SQL");
    const rejectedStudent = await fixture(), rejectedRequest = (await select(rejectedStudent, a)).advisor_request;
    assert.equal((await decision(rejectedRequest.id, tokenA, "reject", { reason: "Local acceptance capacity check" })).status, 200);
    const rejected = await read(rejectedStudent); assert.equal(rejected.advisor_request.status, "rejected"); assert.equal(rejected.confirmed_advisor, null); await assertStudent(rejectedStudent, null);
    assert.equal((await m.CoopProjectAdvisorRequest.findByPk(rejectedRequest.id)).status, "rejected");
    assert.equal((await decision(rejectedRequest.id, tokenA)).status, 409);
    assert.equal((await select(rejectedStudent, b)).advisor_request.status, "pending"); mark("Reject -> Student rejected read-back/SQL -> new pending selection");
    const staleStudent = await fixture(), oldRequest = (await select(staleStudent, a)).advisor_request;
    const currentRequest = (await select(staleStudent, b)).advisor_request;
    assert.equal((await decision(oldRequest.id, tokenA)).status, 409); await assertStudent(staleStudent, null);
    assert.equal((await decision(currentRequest.id, tokenA)).status, 404);
    assert.ok(!(await ok(api(`/api/teachers/project-advisor-requests?teacher_id=${b.id}`, tokenA))).some(row => row.id === currentRequest.id));
    assert.equal((await m.CoopProjectAdvisorRequest.findByPk(oldRequest.id)).status, "superseded"); mark("A -> B stale A acceptance blocked; A cannot see/manage B request");
    assert.equal((await api("/api/teachers/project-advisor-requests")).status, 401);
    assert.equal((await api("/api/teachers/me", "invalid-token")).status, 401);
    const { exp, iat, ...claims } = jwt.decode(tokenA);
    const expired = jwt.sign(claims, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: -1 });
    assert.equal((await api("/api/teachers/me", expired)).status, 401);
    assert.equal((await decision(currentRequest.id, tokenA, "accept", { teacher_id: b.id })).status, 400); mark("Anonymous/invalid/expired session and client Teacher ID spoofing rejected");
    // Only one faculty record has test credentials at a time. Transfer to B,
    // verify B's current decision, restore B, then leave A ready for manual use.
    await manager.restore(firstA); activeCredential = undefined;
    await manager.provision(temporaryB); activeCredential = temporaryB;
    const tokenB = await loginTeacher(b);
    assert.ok((await ok(api("/api/teachers/project-advisor-requests", tokenB))).some(row => row.id === currentRequest.id));
    assert.equal((await decision(currentRequest.id, tokenB)).status, 200);
    assert.equal((await read(staleStudent)).confirmed_advisor.id, b.id); await assertStudent(staleStudent, b.id);
    assert.equal((await api("/api/student-coop/project-advisor-request", staleStudent.token, { teacher_id: a.id })).status, 409);
    await assertStudent(staleStudent, b.id); mark("Only B accepts current request; confirmed advisor replacement blocked");
    for (const owner of [student, rejectedStudent, staleStudent]) assert.equal((await m.Student.findByPk(owner.id)).advisor_teacher_id, c.id);
    mark("Class advisor unchanged across all Local acceptance flows");
    await manager.restore(temporaryB); activeCredential = undefined;
    await manager.provision(finalA); activeCredential = finalA;
    await loginTeacher(a);
    await fs.writeFile(passwordPath, password, { flag: "wx", mode: 0o600 });
    success = true;
  } finally {
    for (const owner of fixtures) {
      assert.equal(await m.StudentFile.count({ where: { student_id: owner.id } }), 0, "Refuse cleanup if fixture acquired files");
      await m.Student.destroy({ where: owner });
    }
    if (!success && activeCredential) await manager.restore(activeCredential);
  }
  const after = await snapshot();
  assert.equal(after.tables.teachers.rows, 23); assert.deepEqual(after.tables.student_files, before.tables.student_files);
  assert.deepEqual(after.tables.sequelize_meta, before.tables.sequelize_meta); assert.equal(after.tables.sequelize_meta.rows, 16);
  assert.equal(after.faculty, before.faculty);
  const changed = Object.keys(before.tables).filter(table => JSON.stringify(before.tables[table]) !== JSON.stringify(after.tables[table]));
  assert.deepEqual(changed, ["teachers"]);
  mark("23 faculty preserved; only A credentials changed; existing Students/requests/files/ledger unchanged");
  const report = { date: "2026-10-07", type: "Local authenticated HTTP/SQL acceptance", checks, teacher: { id: a.id, name: `${a.academic_title || ""}${a.first_name} ${a.last_name}`, email }, backupPath: finalA.backupPath, passwordPath, before, after, changedTables: changed, temporaryStudentsCleaned: fixtures.length, browser: "NOT RUN: no browser tool or installed project browser framework" };
  const reportPath = path.join(root, "report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ teacherId: a.id, email, reportPath, restoreBackupPath: finalA.backupPath, privatePasswordPath: passwordPath, credentialsLogged: false }));
  return report;
}

if (require.main === module) {
  const models = require("../src/models");
  run(models).catch(error => { console.error("Local Teacher acceptance failed:", error instanceof CredentialError ? error.message : error.code || error.name, "(no secret details logged)"); process.exitCode = 1; }).finally(() => models.sequelize.close());
}
module.exports = { run };
