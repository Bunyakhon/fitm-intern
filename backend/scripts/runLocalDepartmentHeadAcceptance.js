// Explicit Local acceptance. Existing Head flags are a prerequisite: this runner
// never grants privileges or creates faculty. Credentials use the existing helper.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { createTeacherCredentialManager, CredentialError } = require("../src/seeders/devTeacherCredential");
const { CATALOG } = require("../src/services/coopPrerequisites");

async function run(m) {
  assert.equal(process.env.NODE_ENV, "development");
  assert.equal(process.env.FITM_LOCAL_HEAD_ACCEPTANCE, "1", "Explicit Local opt-in required");
  const [target] = await m.sequelize.query("SELECT current_database() AS db"); assert.equal(target[0].db, "intern_system");
  assert.equal(await m.Teacher.count(), 23);
  const a = await m.Teacher.findByPk(process.env.TEACHER_TEST_ID); assert.ok(a?.status === "active" && a.email && a.password_hash);
  const heads = await m.Teacher.findAll({ where: { is_department_head: true, status: "active" }, order: [["id", "ASC"]] });
  const h = process.env.HEAD_TEST_ID ? heads.find(row => row.id === process.env.HEAD_TEST_ID) : heads.length === 1 ? heads[0] : null;
  if (process.env.HEAD_TEST_ID) assert.ok(h, "Explicit HEAD_TEST_ID must already be an active authorized Head");
  if (heads.length > 1) assert.ok(h, "Choose an existing HEAD_TEST_ID when several Heads exist");
  if (h) assert.ok(h.department?.trim(), "Existing Head department scope required");
  const b = await m.Teacher.findOne({ where: { status: "active", is_department_head: false, email: null, password_hash: null, id: { [m.Sequelize.Op.ne]: a.id } }, order: [["id", "ASC"]] }); assert.ok(b);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fitm-local-head-acceptance-"));
  const manager = createTeacherCredentialManager(m), installed = [], fixtures = [], requests = [], checks = [];
  let failure;
  async function passwordFile(filePath) {
    assert.ok(filePath && path.isAbsolute(filePath), "Owner-only absolute password file required");
    const file = await fs.lstat(filePath); assert.ok(file.isFile() && !file.isSymbolicLink());
    if (process.platform !== "win32") assert.equal(file.mode & 0o077, 0);
    return (await fs.readFile(filePath, "utf8")).trim();
  }
  const passwordA = await passwordFile(process.env.TEACHER_TEST_PASSWORD_PATH);
  const mark = text => { checks.push(text); console.log(`PASS ${text}`); };
  async function api(url, token, body) {
    const res = await fetch("http://127.0.0.1:5000" + url, { method: body === undefined ? "GET" : "POST", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const data = await res.json(); assert.doesNotMatch(JSON.stringify(data), /password_hash|token_hash|storage_path/); return { status: res.status, data };
  }
  const ok = async value => { const res = await value; assert.equal(res.status, 200); return res.data; };
  const decide = (namespace, id, token, decision, body = {}) => api(`/api/${namespace}/coop-requests/${id}/${decision}`, token, body);
  async function snapshot() {
    return m.sequelize.transaction(async transaction => {
      await m.sequelize.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY", { transaction });
      const [tables] = await m.sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", { transaction }); const result = {};
      for (const { tablename } of tables) {
        assert.match(tablename, /^[a-z_]+$/);
        const [rows] = await m.sequelize.query(`SELECT count(*)::int AS rows,md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY to_jsonb(t)::text), '')) AS fingerprint FROM public.${tablename} t`, { transaction }); result[tablename] = rows[0];
      }
      return result;
    });
  }
  const expectedMigrations = (await fs.readdir(path.join(__dirname, '../src/db/migrations'))).filter(file => file.endsWith('.js')).length;
  const before = await snapshot(); assert.equal(before.sequelize_meta.rows, expectedMigrations); assert.equal(before.student_files.rows, 3);
  await fs.writeFile(path.join(root, "before.json"), JSON.stringify(before), { flag: "wx", mode: 0o600 });
  async function temporaryCredential(teacher, label) {
    const values = { environment: "development", teacherId: teacher.id, email: `head-${label}-${crypto.randomUUID()}@fixture.invalid`, password: crypto.randomBytes(24).toString("base64url"), backupPath: path.join(root, `${label}-original.json`) };
    await manager.provision(values); installed.push(values); return values;
  }
  async function fixture() {
    const suffix = crypto.randomUUID().replaceAll("-", ""), password = crypto.randomBytes(24).toString("base64url");
    const row = await m.Student.create({ student_id: `local-head-${suffix}`, email: `local-head-${suffix}@email.kmutnb.ac.th`, first_name: "Local Head Acceptance", last_name: "Temporary", major: "IT", track: "co_op", advisor_teacher_id: a.id, coop_advisor_teacher_id: b.id, password });
    fixtures.push({ id: row.id, email: row.email, student_id: row.student_id });
    await fs.writeFile(path.join(root, "owned-fixtures.json"), JSON.stringify({ students: fixtures, requests }), { mode: 0o600 });
    const login = await ok(api("/api/auth/login", null, { email: row.email, password })); assert.equal(login.data.id, row.id);
    const created = await api("/api/coop-requests", login.token, { company_name: "Local Head acceptance snapshot", company_province: "Bangkok", company_address: "123 Temporary fixture", letter_recipient_name: "Fixture HR", work_start_date: "2026-11-01", work_end_date: "2027-02-01", delivery_methods: ["email"], prerequisite_courses: CATALOG.IT.map(([course_code]) => ({ course_code, status: "passed", grade: "A" })) });
    assert.equal(created.status, 201); assert.equal(created.data.data.status, "advisor_review");
    const requestId = created.data.data.id; requests.push({ id: requestId, student_id: row.id });
    await fs.writeFile(path.join(root, "owned-fixtures.json"), JSON.stringify({ students: fixtures, requests }), { mode: 0o600 });
    return { id: row.id, token: login.token, requestId };
  }
  async function finalState(owner, expected, decision, reason) {
    assert.equal((await m.CoopRequest.findByPk(owner.requestId)).status, expected);
    const audits = await m.CoopRequestReview.findAll({ where: { coop_request_id: owner.requestId }, order: [["created_at", "ASC"]] });
    assert.deepEqual(audits.map(row => row.actor_role), ["student", "teacher", "department_head"]);
    assert.equal(audits[1].teacher_id, a.id); assert.equal(audits[2].teacher_id, h.id); assert.equal(audits[2].decision, decision); assert.equal(audits[2].from_status, "department_head_review"); assert.equal(audits[2].to_status, expected); assert.ok(audits.every(row => row.createdAt));
    if (reason) assert.equal(audits[2].reason, reason);
    const detail = await ok(api(`/api/coop-requests/${owner.requestId}`, owner.token)), list = await ok(api("/api/coop-requests/me", owner.token));
    assert.equal(detail.data.status, expected); assert.equal(detail.data.reviews.length, 3); assert.equal(list.data.find(row => row.id === owner.requestId).status, expected);
    if (reason) assert.equal(detail.data.reviews.find(row => row.actor_role === "department_head").reason, reason);
    const student = await m.Student.findByPk(owner.id); assert.equal(student.advisor_teacher_id, a.id); assert.equal(student.coop_advisor_teacher_id, b.id);
  }
  try {
    const loginA = await ok(api("/api/teachers/auth/login", null, { email: a.email, password: passwordA })), tokenA = loginA.token;
    let tokenNonHead = tokenA, nonHeadEmail = a.email, nonHeadPassword = passwordA;
    if (a.is_department_head) {
      const temporary = await temporaryCredential(b, "non-head"); nonHeadEmail = temporary.email; nonHeadPassword = temporary.password;
      tokenNonHead = (await ok(api("/api/teachers/auth/login", null, { email: nonHeadEmail, password: nonHeadPassword }))).token;
    }
    let tokenH;
    if (h) {
      assert.equal(h.department, a.department, "Class Advisor must be in the existing Head department");
      let email = h.email, password;
      if (h.id === a.id) password = passwordA;
      else if (h.email && h.password_hash) password = await passwordFile(process.env.HEAD_TEST_PASSWORD_PATH);
      else { const credential = await temporaryCredential(h, "head"); email = credential.email; password = credential.password; }
      const login = await ok(api("/api/department-head/auth/login", null, { email, password })); tokenH = login.token;
      const me = await ok(api("/api/department-head/me", tokenH)); assert.equal(me.data.id, h.id); assert.equal(me.data.is_department_head, true); mark("Existing authorized Head password login/me; DB flag and department verified");
    }
    const early = await fixture();
    if (h) {
      assert.equal((await decide("department-head", early.requestId, tokenH, "approve")).status, 409); assert.equal((await decide("department-head", early.requestId, tokenH, "reject", { reason: "Early attempt" })).status, 409);
      assert.equal((await m.CoopRequest.findByPk(early.requestId)).status, "advisor_review"); assert.equal(await m.CoopRequestReview.count({ where: { coop_request_id: early.requestId } }), 1); mark("Head early approve/reject cannot skip Class Advisor; no false audit");
    }
    assert.equal((await decide("teachers", early.requestId, tokenA, "approve")).status, 200);
    assert.equal((await decide("teachers", early.requestId, tokenA, "approve")).status, 409); mark("Student submit -> Class Advisor approve -> Head review; Class cannot finalize");
    for (const url of ["/api/department-head/me", "/api/department-head/coop-requests?is_department_head=true", `/api/department-head/coop-requests/${early.requestId}`]) assert.equal((await api(url, tokenNonHead)).status, 403);
    assert.equal((await api("/api/department-head/auth/login", null, { email: nonHeadEmail, password: nonHeadPassword })).status, 403);
    for (const action of ["approve", "reject"]) assert.equal((await decide("department-head", early.requestId, tokenNonHead, action, action === "reject" ? { reason: "Non-head attempt" } : { is_department_head: true })).status, 403);
    assert.equal((await decide("department-head", early.requestId, null, "approve")).status, 401);
    assert.equal((await m.CoopRequest.findByPk(early.requestId)).status, "department_head_review"); assert.equal(await m.CoopRequestReview.count({ where: { coop_request_id: early.requestId } }), 2); mark("Real Local non-Head login/me/list/detail/approve/reject/flag spoof denied; DB/history stable; anonymous denied");
    if (h) {
      const queue = await ok(api("/api/department-head/coop-requests", tokenH)), detail = await ok(api(`/api/department-head/coop-requests/${early.requestId}`, tokenH));
      const listed = queue.data.find(row => row.id === early.requestId); assert.ok(listed); assert.equal(listed.student.advisorTeacher.id, a.id); assert.equal(listed.prerequisite_courses.length, 5);
      const classAudit = detail.data.reviews.find(row => row.actor_role === "teacher"); assert.equal(classAudit.teacher.id, a.id); assert.ok(classAudit.createdAt);
      assert.equal((await decide("department-head", early.requestId, tokenH, "approve", { is_department_head: true })).status, 400);
      assert.equal((await decide("department-head", early.requestId, tokenH, "approve")).status, 200);
      assert.equal((await decide("department-head", early.requestId, tokenH, "approve")).status, 409); assert.equal((await decide("department-head", early.requestId, tokenH, "reject", { reason: "Late" })).status, 409);
      await finalState(early, "approved", "approve"); mark("Head approve -> approved; named Class history, audit once and Student read-back; both advisor IDs preserved");
      const rejectOwner = await fixture(); assert.equal((await decide("teachers", rejectOwner.requestId, tokenA, "approve")).status, 200);
      const reason = "Local Head acceptance correction";
      assert.equal((await decide("department-head", rejectOwner.requestId, tokenH, "reject")).status, 400);
      assert.equal((await decide("department-head", rejectOwner.requestId, tokenH, "reject", { reason })).status, 200);
      assert.equal((await decide("department-head", rejectOwner.requestId, tokenH, "reject", { reason })).status, 409); assert.equal((await decide("department-head", rejectOwner.requestId, tokenH, "approve")).status, 409);
      await finalState(rejectOwner, "rejected", "reject", reason); mark("Head reject -> rejected/reason; audit once and Student list/detail read-back");
    } else console.log("NOT RUN Head approve/reject/early approval: no existing authorized Local Head; no privilege granted");
  } catch (error) { failure = error; }
  finally {
    try {
      await m.sequelize.transaction(async transaction => {
        for (const owner of fixtures) {
          const row = await m.Student.findOne({ where: owner, transaction, lock: transaction.LOCK.UPDATE }); assert.ok(row, "Owned fixture mismatch");
          assert.equal(await m.StudentFile.count({ where: { student_id: owner.id }, transaction }), 0);
          const rows = await m.CoopRequest.findAll({ where: { student_id: owner.id }, transaction });
          for (const request of rows) await m.CoopRequestReview.destroy({ where: { coop_request_id: request.id }, transaction });
          await m.CoopRequest.destroy({ where: { student_id: owner.id }, transaction }); await m.Student.destroy({ where: owner, transaction });
        }
      });
    } finally { for (const credential of installed.reverse()) await manager.restore(credential); }
  }
  const after = await snapshot(); assert.deepEqual(after, before); mark(`Owned fixtures cleaned, temporary credentials restored; all ${Object.keys(before).length} Local tables identical; 23 Teachers / ${expectedMigrations} migrations / 3 files unchanged`);
  const status = failure ? "FAIL" : h ? "PASS" : "BLOCKED", reportPath = path.join(root, "report.json");
  await fs.writeFile(reportPath, JSON.stringify({ date: "2026-10-07", status, headId: h?.id || null, headCount: heads.length, checks, before, after, changedTables: [], temporaryStudentsCleaned: fixtures.length, browser: "NOT RUN", blocker: h ? null : "No existing authorized Head; await real faculty identity and explicit flag authorization" }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ status, reportPath, credentialsLogged: false })); if (failure) throw failure; return { status, reportPath };
}
if (require.main === module) {
  const m = require("../src/models");
  run(m).then(result => { if (result.status === "BLOCKED") process.exitCode = 2; }).catch(error => { console.error("Local Head acceptance failed:", error instanceof CredentialError ? error.message : error.code || error.name, "(no secret details logged)"); process.exitCode = 1; }).finally(() => m.sequelize.close());
}
module.exports = { run };
