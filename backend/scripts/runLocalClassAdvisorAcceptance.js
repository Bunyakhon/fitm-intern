// Explicit Local HTTP/SQL acceptance. Keep the existing A credential and restore
// temporary B through the existing credential manager. Never insert Teachers.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { createTeacherCredentialManager, CredentialError } = require("../src/seeders/devTeacherCredential");
const { CATALOG } = require("../src/services/coopPrerequisites");

async function run(m) {
  assert.equal(process.env.NODE_ENV, "development");
  assert.equal(process.env.FITM_LOCAL_CLASS_ADVISOR_ACCEPTANCE, "1", "Explicit Local opt-in required");
  const [target] = await m.sequelize.query("SELECT current_database() AS db"); assert.equal(target[0].db, "intern_system");
  assert.equal(await m.Teacher.count(), 23);
  const a = await m.Teacher.findByPk(process.env.TEACHER_TEST_ID);
  assert.ok(a?.status === "active" && a.email && a.password_hash, "Existing login-ready Teacher A required");
  const b = await m.Teacher.findOne({ where: { status: "active", email: null, password_hash: null }, order: [["id", "ASC"]] }); assert.ok(b);
  const passwordPath = process.env.TEACHER_TEST_PASSWORD_PATH;
  assert.ok(passwordPath && path.isAbsolute(passwordPath), "Private existing password file required");
  const file = await fs.lstat(passwordPath); assert.ok(file.isFile() && !file.isSymbolicLink());
  if (process.platform !== "win32") assert.equal(file.mode & 0o077, 0);
  const passwordA = (await fs.readFile(passwordPath, "utf8")).trim();
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fitm-local-class-acceptance-"));
  const manager = createTeacherCredentialManager(m), fixtures = [], requests = [], checks = [];
  const credentialB = { environment: "development", teacherId: b.id, email: `class-advisor-b-${crypto.randomUUID()}@fixture.invalid`, password: crypto.randomBytes(24).toString("base64url"), backupPath: path.join(root, "teacher-b-original.json") };
  let installedB = false, failure;
  const mark = text => { checks.push(text); console.log(`PASS ${text}`); };
  async function api(url, token, body) {
    const res = await fetch("http://127.0.0.1:5000" + url, { method: body === undefined ? "GET" : "POST", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const data = await res.json(); assert.doesNotMatch(JSON.stringify(data), /password_hash|token_hash|storage_path/); return { status: res.status, data };
  }
  const ok = async value => { const res = await value; assert.equal(res.status, 200); return res.data; };
  const decide = (id, token, action, body = {}) => api(`/api/teachers/coop-requests/${id}/${action}`, token, body);
  async function snapshot() {
    return m.sequelize.transaction(async transaction => {
      await m.sequelize.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY", { transaction });
      const [tables] = await m.sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", { transaction });
      const values = {};
      for (const { tablename } of tables) {
        assert.match(tablename, /^[a-z_]+$/);
        const [rows] = await m.sequelize.query(`SELECT count(*)::int AS rows,md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY to_jsonb(t)::text), '')) AS fingerprint FROM public.${tablename} t`, { transaction }); values[tablename] = rows[0];
      }
      return values;
    });
  }
  const expectedMigrations = (await fs.readdir(path.join(__dirname, '../src/db/migrations'))).filter(file => file.endsWith('.js')).length;
  const before = await snapshot(); assert.equal(before.sequelize_meta.rows, expectedMigrations); assert.equal(before.student_files.rows, 3);
  await fs.writeFile(path.join(root, "before.json"), JSON.stringify(before), { flag: "wx", mode: 0o600 });
  async function fixture() {
    const suffix = crypto.randomUUID().replaceAll("-", ""), studentPassword = crypto.randomBytes(24).toString("base64url");
    const row = await m.Student.create({ student_id: `local-class-${suffix}`, email: `local-class-${suffix}@email.kmutnb.ac.th`, first_name: "Local Class Acceptance", last_name: "Temporary", major: "IT", track: "co_op", advisor_teacher_id: a.id, coop_advisor_teacher_id: b.id, password: studentPassword });
    fixtures.push({ id: row.id, email: row.email, student_id: row.student_id });
    await fs.writeFile(path.join(root, "owned-fixtures.json"), JSON.stringify({ students: fixtures, requests }), { mode: 0o600 });
    const login = await ok(api("/api/auth/login", null, { email: row.email, password: studentPassword })); assert.equal(login.data.id, row.id);
    const res = await api("/api/coop-requests", login.token, { company_name: "Local class acceptance snapshot", company_province: "Bangkok", company_address: "123 Temporary fixture", letter_recipient_name: "Fixture HR", work_start_date: "2026-11-01", work_end_date: "2027-02-01", delivery_methods: ["email"], prerequisite_courses: CATALOG.IT.map(([course_code]) => ({ course_code, status: "passed", grade: "A" })) });
    assert.equal(res.status, 201); assert.equal(res.data.data.status, "advisor_review");
    requests.push({ id: res.data.data.id, student_id: row.id });
    await fs.writeFile(path.join(root, "owned-fixtures.json"), JSON.stringify({ students: fixtures, requests }), { mode: 0o600 });
    return { id: row.id, token: login.token, requestId: res.data.data.id };
  }
  async function history(owner, expected, decision, reason) {
    const current = await m.CoopRequest.findByPk(owner.requestId); assert.equal(current.status, expected);
    const reviews = await m.CoopRequestReview.findAll({ where: { coop_request_id: owner.requestId }, order: [["created_at", "ASC"]] });
    assert.equal(reviews.length, 2); assert.equal(reviews[0].decision, "submit"); assert.equal(reviews[1].actor_role, "teacher"); assert.equal(reviews[1].teacher_id, a.id);
    assert.equal(reviews[1].decision, decision); assert.equal(reviews[1].from_status, "advisor_review"); assert.equal(reviews[1].to_status, expected);
    if (reason) assert.equal(reviews[1].reason, reason);
    const read = await ok(api(`/api/coop-requests/${owner.requestId}`, owner.token)); assert.equal(read.data.status, expected); assert.equal(read.data.reviews.length, 2);
    if (reason) assert.equal(read.data.reviews.find(row => row.decision === "reject").reason, reason);
    const list = await ok(api("/api/coop-requests/me", owner.token)); assert.equal(list.data.find(row => row.id === owner.requestId).status, expected);
    const student = await m.Student.findByPk(owner.id); assert.equal(student.advisor_teacher_id, a.id); assert.equal(student.coop_advisor_teacher_id, b.id);
  }
  try {
    const loginA = await ok(api("/api/teachers/auth/login", null, { email: a.email, password: passwordA })); const tokenA = loginA.token;
    assert.equal((await ok(api("/api/teachers/me", tokenA))).data.id, a.id); mark("Existing Local Teacher A password login/me; credential retained");
    await manager.provision(credentialB); installedB = true;
    const loginB = await ok(api("/api/teachers/auth/login", null, { email: credentialB.email, password: credentialB.password })); const tokenB = loginB.token;
    assert.equal((await ok(api("/api/teachers/me", tokenB))).data.id, b.id);
    const approveOwner = await fixture();
    const queue = await ok(api("/api/teachers/coop-requests?status=advisor_review", tokenA));
    const mine = queue.data.find(row => row.id === approveOwner.requestId); assert.ok(mine); assert.equal(mine.prerequisite_courses.length, 5);
    const detail = await ok(api(`/api/teachers/coop-requests/${approveOwner.requestId}`, tokenA)); assert.equal(detail.data.request.student.id, approveOwner.id); assert.equal(detail.data.reviews.length, 1);
    mark("Student real submit -> advisor_review; A list/detail includes owned prerequisite snapshot");
    const foreign = await ok(api(`/api/teachers/coop-requests?teacher_id=${a.id}`, tokenB)); assert.ok(!foreign.data.some(row => row.id === approveOwner.requestId));
    assert.equal((await api(`/api/teachers/coop-requests/${approveOwner.requestId}`, tokenB)).status, 403);
    assert.equal((await decide(approveOwner.requestId, tokenB, "approve")).status, 403); assert.equal((await decide(approveOwner.requestId, tokenB, "reject", { reason: "Foreign attempt" })).status, 403);
    assert.equal((await m.CoopRequest.findByPk(approveOwner.requestId)).status, "advisor_review");
    assert.equal(await m.CoopRequestReview.count({ where: { coop_request_id: approveOwner.requestId } }), 1);
    mark("Foreign Teacher B / Project Advisor B cannot list/detail/approve/reject A class request");
    assert.equal((await decide(approveOwner.requestId, null, "approve")).status, 401);
    assert.equal((await decide(approveOwner.requestId, tokenA, "approve", { teacher_id: b.id })).status, 400);
    assert.equal((await api(`/api/department-head/coop-requests/${approveOwner.requestId}/approve`, tokenA, {})).status, 403);
    mark("Anonymous, body identity spoof and Teacher impersonating Head blocked");
    assert.equal((await decide(approveOwner.requestId, tokenA, "approve")).status, 200);
    assert.equal((await decide(approveOwner.requestId, tokenA, "approve")).status, 409); assert.equal((await decide(approveOwner.requestId, tokenA, "reject", { reason: "Late attempt" })).status, 409);
    await history(approveOwner, "department_head_review", "approve"); mark("A approve -> Head only; SQL/audit once; Student detail/list read-back; advisor IDs unchanged");
    const rejectOwner = await fixture(), reason = "Local acceptance: correct work period";
    assert.equal((await decide(rejectOwner.requestId, tokenA, "reject", {})).status, 400);
    assert.equal((await decide(rejectOwner.requestId, tokenA, "reject", { reason })).status, 200);
    assert.equal((await decide(rejectOwner.requestId, tokenA, "reject", { reason })).status, 409);
    await history(rejectOwner, "rejected", "reject", reason); mark("A rejection requires reason; SQL/audit once; Student rejected/reason read-back");
    const separatedOwner = await fixture(); assert.equal((await decide(separatedOwner.requestId, tokenB, "approve")).status, 403);
    assert.equal((await decide(separatedOwner.requestId, tokenA, "approve")).status, 200); await history(separatedOwner, "department_head_review", "approve");
    mark("Separate Class A / Project B regression: only A approves; both canonical IDs preserved");
  } catch (error) { failure = error; }
  finally {
    try {
      // Reviews have RESTRICT FKs. Delete only history tied to proven owned
      // Students/requests; no broad truncate or unrelated cleanup.
      await m.sequelize.transaction(async transaction => {
        for (const owner of fixtures) {
          const student = await m.Student.findOne({ where: owner, transaction, lock: transaction.LOCK.UPDATE }); assert.ok(student, "Owned fixture mismatch");
          assert.equal(await m.StudentFile.count({ where: { student_id: owner.id }, transaction }), 0, "Refuse cleanup when files exist");
          const ownedRequests = await m.CoopRequest.findAll({ where: { student_id: owner.id }, transaction });
          for (const request of ownedRequests) await m.CoopRequestReview.destroy({ where: { coop_request_id: request.id }, transaction });
          await m.CoopRequest.destroy({ where: { student_id: owner.id }, transaction });
          await m.Student.destroy({ where: owner, transaction });
        }
      });
    } finally { if (installedB) await manager.restore(credentialB); }
  }
  const after = await snapshot(); assert.deepEqual(after, before, "Every persistent Local table must match its original fingerprint");
  const migrationFiles = (await fs.readdir(path.join(__dirname, "../src/db/migrations"))).filter(name => name.endsWith(".js"));
  const [ledger] = await m.sequelize.query("SELECT name FROM sequelize_meta"); assert.equal(migrationFiles.filter(name => !ledger.some(row => row.name === name)).length, 0);
  mark(`Owned Students/requests/reviews cleaned; B restored; all ${Object.keys(before).length} tables identical; 23 Teachers, migrations ${expectedMigrations}/0, StudentFiles 3 unchanged`);
  const reportPath = path.join(root, "report.json");
  await fs.writeFile(reportPath, JSON.stringify({ date: "2026-10-07", type: "Local authenticated Class Advisor HTTP/SQL acceptance", checks, before, after, changedTables: [], temporaryStudentsCleaned: fixtures.length, teacherA: a.id, teacherB: b.id, browser: "NOT RUN", success: !failure }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ reportPath, success: !failure, credentialsLogged: false }));
  if (failure) throw failure;
  return reportPath;
}

if (require.main === module) {
  const m = require("../src/models");
  run(m).catch(error => { console.error("Local Class Advisor acceptance failed:", error instanceof CredentialError ? error.message : error.code || error.name, "(no secret details logged)"); process.exitCode = 1; }).finally(() => m.sequelize.close());
}
module.exports = { run };
