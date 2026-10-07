const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const { Sequelize, Op } = require("sequelize");
const { Umzug, SequelizeStorage } = require("umzug");

test("Project advisor requests, Teacher authentication and independent topics on disposable PostgreSQL", { skip: !process.env.COOP_ADVISOR_DISPOSABLE_DATABASE_URL }, async t => {
  const db = new Sequelize(process.env.COOP_ADVISOR_DISPOSABLE_DATABASE_URL, { logging: false, pool: { max: 8 } });
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
  let server, m; const students = [], teachers = [];
  try {
    const [guard] = await db.query("SELECT current_database() AS db, current_setting('fitm.a014_disposable',true) AS disposable");
    assert.equal(guard[0].db, "fitm_advisor_test"); assert.equal(guard[0].disposable, "on");
    m = { sequelize: db };
    for (const file of fs.readdirSync(path.join(__dirname, "../src/models")).filter(f => f.endsWith(".model.js"))) { const model = require(`../src/models/${file}`)(db); m[model.name] = model; }
    for (const model of Object.values(m)) model.associate?.(m);
    const umzug = new Umzug({ migrations: { glob: ["*.js", { cwd: path.join(__dirname, "../src/db/migrations") }] }, context: db.getQueryInterface(), storage: new SequelizeStorage({ sequelize: db, tableName: "sequelize_meta" }), logger: undefined });
    await umzug.up({ to: "013_add_coop_projects_and_current_files.js" });
    const run = crypto.randomUUID().slice(0, 8), password = crypto.randomBytes(24).toString("hex");
    for (const [academic_title, first_name, last_name] of require("./fixtures/coopFaculty.json")) teachers.push(await m.Teacher.create({ academic_title, first_name, last_name, email: `${teachers.length}-${run}@fixture.invalid`, department: "FITM", password }));
    const [a, b, c] = teachers;
    const inactive = await m.Teacher.create({ first_name: "Inactive", last_name: "Fixture", email: `inactive-${run}@fixture.invalid`, status: "inactive", password }); teachers.push(inactive);
    const head = await m.Teacher.create({ first_name: "Head", last_name: "Fixture", email: `head-${run}@fixture.invalid`, department: "FITM", is_department_head: true, password }); teachers.push(head);
    const makeStudent = async () => { const owner = await m.Student.create({ student_id: `advisor-${students.length}-${run}`, email: `advisor-${students.length}-${run}@email.kmutnb.ac.th`, first_name: "Disposable", last_name: "Student", major: "IT", track: "co_op", advisor_teacher_id: c.id, password }); students.push(owner); return owner; };
    const studentToken = owner => jwt.sign({ id: owner.id, student_id: owner.student_id, actor_type: "student", role: "student" }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "10m" });
    const app = express(); app.use(express.json());
    app.use("/api/student-coop", require("../src/routes/studentCoop.routes").createStudentCoopRouter({ models: m }));
    app.use("/api/teachers", require("../src/routes/roleWorkflow.routes").createRoleWorkflowRouter("teacher", m));
    app.use("/api/department-head", require("../src/routes/roleWorkflow.routes").createRoleWorkflowRouter("department_head", m));
    server = http.createServer(app); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (url, token, body, method = body === undefined ? "GET" : "POST") => fetch(base + url, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const json = async response => { assert.equal(response.status, 200); return response.json(); };
    const login = async teacher => (await json(await request("/api/teachers/auth/login", null, { email: teacher.email, password }))).token;
    const tokenA = await login(a), tokenB = await login(b), tokenC = await login(c), tokenHead = await login(head);
    assert.ok(tokenA && tokenB && tokenC && tokenHead);
    const select = (owner, teacher) => request("/api/student-coop/project-advisor-request", studentToken(owner), { teacher_id: teacher.id });
    const read = async owner => json(await request("/api/student-coop/project-advisor-request", studentToken(owner)));
    const decide = (id, token, decision = "accept", body = {}) => request(`/api/teachers/project-advisor-requests/${id}/${decision}`, token, body);
    const topic = (owner, value) => request("/api/student-coop/project", studentToken(owner), { topic: value }, "PUT");
    const savedTopic = async owner => (await json(await request("/api/student-coop/project", studentToken(owner)))).topic;
    const owner = await makeStudent();

    await t.test("pending migration 014 affects advisor requests without blocking topic read/save/edit", async () => {
      assert.equal((await request("/api/student-coop/project-advisor-request", studentToken(owner))).status, 503);
      assert.equal((await select(owner, a)).status, 503);
      assert.equal((await topic(owner, "Topic before advisor migration")).status, 200); assert.equal(await savedTopic(owner), "Topic before advisor migration");
      assert.equal((await topic(owner, "Edited before advisor migration")).status, 200); assert.equal(await savedTopic(owner), "Edited before advisor migration");
      await owner.reload(); assert.equal(owner.coop_advisor_teacher_id, null); assert.equal(owner.advisor_teacher_id, c.id);
    });
    await umzug.up({ migrations: ["014_add_coop_project_advisor_requests.js"] });

    await t.test("topic before selection, pending selection/read-back, change and Teacher acceptance", async () => {
      assert.equal((await read(owner)).advisor_request.status, "none");
      assert.equal((await topic(owner, "ระบบจัดการนักศึกษาสหกิจศึกษา")).status, 200); assert.equal(await savedTopic(owner), "ระบบจัดการนักศึกษาสหกิจศึกษา");
      const first = (await json(await select(owner, a))).advisor_request;
      assert.equal(first.status, "pending"); assert.equal(first.teacher.id, a.id); await owner.reload(); assert.equal(owner.coop_advisor_teacher_id, null);
      assert.equal((await read(owner)).advisor_request.id, first.id);
      assert.equal((await topic(owner, "การพัฒนาระบบจัดการนักศึกษาสหกิจศึกษา")).status, 200); assert.equal(await savedTopic(owner), "การพัฒนาระบบจัดการนักศึกษาสหกิจศึกษา");
      assert.equal((await json(await select(owner, a))).advisor_request.id, first.id); // idempotent duplicate
      const changed = (await json(await select(owner, b))).advisor_request; assert.notEqual(changed.id, first.id); assert.equal(changed.teacher.id, b.id);
      const old = await m.CoopProjectAdvisorRequest.findByPk(first.id); assert.equal(old.status, "superseded"); assert.ok(old.superseded_at);
      assert.equal((await decide(first.id, tokenA)).status, 409);
      assert.equal((await decide(changed.id, tokenA)).status, 404); assert.equal((await decide(changed.id, tokenC, "reject", { reason: "Wrong Teacher" })).status, 404);
      const pending = await json(await request("/api/teachers/project-advisor-requests", tokenB)); assert.ok(pending.some(r => r.id === changed.id)); assert.doesNotMatch(JSON.stringify(pending), /password|is_department_head/);
      const own = pending.find(r => r.id === changed.id); assert.equal(own.status, "pending"); assert.equal(own.student.major, "IT"); assert.match(own.topic, /สหกิจศึกษา/);
      for (const token of [tokenA, tokenC]) assert.ok(!(await json(await request(`/api/teachers/project-advisor-requests?teacher_id=${b.id}`, token))).some(r => r.id === changed.id));
      assert.equal((await decide(changed.id, tokenB)).status, 200); await owner.reload(); assert.equal(owner.coop_advisor_teacher_id, b.id); assert.equal(owner.advisor_teacher_id, c.id);
      const confirmed = await read(owner); assert.equal(confirmed.advisor_request.status, "confirmed"); assert.equal(confirmed.confirmed_advisor.id, b.id);
      assert.ok(!(await json(await request("/api/teachers/project-advisor-requests", tokenB))).some(r => r.id === changed.id));
      const saved = await json(await request("/api/teachers/project-advisor-requests?status=confirmed", tokenB)); assert.ok(saved.some(r => r.id === changed.id && r.status === "confirmed" && r.confirmed_at));
      assert.ok(!(await json(await request("/api/teachers/project-advisor-requests?status=confirmed", tokenA))).some(r => r.id === changed.id));
      assert.equal((await request("/api/teachers/project-advisor-requests?status=superseded", tokenB)).status, 400);
      assert.equal((await decide(changed.id, tokenB)).status, 409); assert.equal((await select(owner, a)).status, 409);
      assert.equal((await topic(owner, "Confirmed advisor topic edit")).status, 200); assert.equal(await savedTopic(owner), "Confirmed advisor topic edit");
    });
    await t.test("Teacher rejection reason/read-back and selection after rejection", async () => {
      const rejectedOwner = await makeStudent(); const initial = (await json(await select(rejectedOwner, a))).advisor_request;
      assert.equal((await topic(rejectedOwner, "Pending topic")).status, 200);
      assert.equal((await decide(initial.id, tokenA, "reject")).status, 400);
      assert.equal((await decide(initial.id, tokenA, "reject", { reason: "  Supervision capacity full  " })).status, 200);
      const rejected = await read(rejectedOwner); assert.equal(rejected.advisor_request.status, "rejected"); assert.equal(rejected.advisor_request.rejection_reason, "Supervision capacity full"); assert.ok(rejected.advisor_request.rejected_at); assert.equal(rejected.confirmed_advisor, null);
      assert.equal((await decide(initial.id, tokenA)).status, 409); assert.equal((await decide(initial.id, tokenA, "reject", { reason: "Again" })).status, 409);
      assert.ok((await json(await request("/api/teachers/project-advisor-requests?status=rejected", tokenA))).some(r => r.id === initial.id && r.rejection_reason === "Supervision capacity full"));
      assert.equal((await topic(rejectedOwner, "Edited after rejection")).status, 200); assert.equal(await savedTopic(rejectedOwner), "Edited after rejection");
      const next = (await json(await select(rejectedOwner, b))).advisor_request; assert.equal(next.status, "pending");
      const historical = await m.CoopProjectAdvisorRequest.findByPk(initial.id); assert.equal(historical.status, "superseded"); assert.equal(historical.rejection_reason, "Supervision capacity full"); assert.ok(historical.rejected_at);
      await rejectedOwner.reload(); assert.equal(rejectedOwner.coop_advisor_teacher_id, null); assert.equal(rejectedOwner.advisor_teacher_id, c.id);
    });
    await t.test("A -> B -> A cannot revive the first request ID", async () => {
      const student = await makeStudent(); const first = (await json(await select(student, a))).advisor_request;
      await select(student, b); const latest = (await json(await select(student, a))).advisor_request;
      assert.notEqual(first.id, latest.id); assert.equal((await decide(first.id, tokenA)).status, 409); assert.equal((await decide(latest.id, tokenA)).status, 200);
    });
    await t.test("double accept and accept/reject races have exactly one committed decision", async () => {
      for (const decisions of [["accept", "accept"], ["accept", "reject"]]) {
        const student = await makeStudent(); const current = (await json(await select(student, a))).advisor_request;
        const responses = await Promise.all(decisions.map(d => decide(current.id, tokenA, d, d === "reject" ? { reason: "Capacity" } : {})));
        assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
        const state = await read(student); await student.reload(); assert.ok(["confirmed", "rejected"].includes(state.advisor_request.status)); assert.equal(student.coop_advisor_teacher_id, state.advisor_request.status === "confirmed" ? a.id : null);
      }
    });
    await t.test("Student change versus Teacher accept follows the committed Student lock order", async () => {
      const student = await makeStudent(); const first = (await json(await select(student, a))).advisor_request;
      const [change, accept] = await Promise.all([select(student, b), decide(first.id, tokenA)]);
      assert.deepEqual([change.status, accept.status].sort(), [200, 409]); const state = await read(student); await student.reload();
      if (change.status === 200) { assert.equal(state.advisor_request.teacher.id, b.id); assert.equal(state.advisor_request.status, "pending"); assert.equal(student.coop_advisor_teacher_id, null); }
      else { assert.equal(state.confirmed_advisor.id, a.id); assert.equal(state.advisor_request.status, "confirmed"); }
    });
    await t.test("topic and selection race preserves both; transactional failures preserve old state", async () => {
      const student = await makeStudent(); const responses = await Promise.all([select(student, a), topic(student, "Concurrent independent topic")]); assert.deepEqual(responses.map(r => r.status), [200, 200]); assert.equal(await savedTopic(student), "Concurrent independent topic");
      const initial = (await read(student)).advisor_request; const originalUpdate = m.Student.update;
      m.Student.update = async function(values, options) { if (options.where.id === student.id && values.coop_advisor_teacher_id) throw Error("Injected confirmation write failure"); return originalUpdate.call(this, values, options); };
      try { assert.equal((await decide(initial.id, tokenA)).status, 500); } finally { m.Student.update = originalUpdate; }
      assert.equal((await read(student)).advisor_request.status, "pending"); await student.reload(); assert.equal(student.coop_advisor_teacher_id, null);
      const originalCreate = m.CoopProjectAdvisorRequest.create; m.CoopProjectAdvisorRequest.create = async () => { throw Error("Injected request create failure"); };
      try { assert.equal((await select(student, b)).status, 500); } finally { m.CoopProjectAdvisorRequest.create = originalCreate; }
      assert.equal((await read(student)).advisor_request.id, initial.id); assert.equal((await m.CoopProjectAdvisorRequest.findByPk(initial.id)).status, "pending");
    });
    await t.test("real auth denies Student/foreign/inactive/spoofed actors and legacy Head bypass", async () => {
      const student = await makeStudent(); const current = (await json(await select(student, a))).advisor_request;
      assert.equal((await request("/api/student-coop/project-advisor-request", null)).status, 401);
      assert.equal((await decide(current.id, null)).status, 401); assert.equal((await decide(current.id, studentToken(student))).status, 403);
      assert.equal((await request("/api/teachers/project-advisor-requests", null)).status, 401); assert.equal((await request("/api/teachers/project-advisor-requests", studentToken(student))).status, 403);
      assert.equal((await request("/api/student-coop/project-advisor-request", tokenA, { teacher_id: a.id })).status, 403);
      for (const body of [{ teacher_id: b.id, student_id: owner.id }, { teacher_id: b.id, coop_advisor_teacher_id: b.id }, { teacher_id: b.id, advisor_teacher_id: b.id }, { teacher_id: "bad" }]) assert.equal((await request("/api/student-coop/project-advisor-request", studentToken(student), body)).status, 400);
      assert.equal((await select(student, inactive)).status, 403);
      assert.equal((await decide(current.id, tokenA, "accept", { teacher_id: b.id })).status, 400);
      assert.equal((await request(`/api/department-head/students/${student.id}/coop-advisor`, tokenHead, { coop_advisor_teacher_id: b.id }, "PATCH")).status, 409);
      const legacy = await makeStudent(); await m.Student.update({ coop_advisor_teacher_id: c.id }, { where: { id: legacy.id } }); assert.equal((await read(legacy)).advisor_request.status, "confirmed"); assert.equal((await select(legacy, a)).status, 409);
      await m.Teacher.update({ status: "inactive" }, { where: { id: a.id } });
      try { assert.equal((await decide(current.id, tokenA)).status, 403); } finally { await m.Teacher.update({ status: "active" }, { where: { id: a.id } }); }
      await student.reload(); assert.equal(student.advisor_teacher_id, c.id); assert.equal(student.coop_advisor_teacher_id, null);
    });
    await t.test("actual Teacher API and page accept/reject/stale actions persist through HTTP and SQL", async () => {
      const vm = require("node:vm");
      const { teacherFixture } = await import(require("node:url").pathToFileURL(path.resolve(__dirname, "../../frontend/test/helpers/teacherCoopFixture.js")));
      const source = fs.readFileSync(path.resolve(__dirname, "../../frontend/src/api/teacherProjectAdvisor.api.js"), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
      const context = vm.createContext({ URLSearchParams, sessionStorage: { getItem: () => tokenA }, apiRequest: async (url, options = {}) => {
        const response = await request(url, options.headers?.Authorization?.slice(7), options.body, options.method || "GET");
        const data = await response.json();
        if (!response.ok) throw Object.assign(Error(data.message), { status: response.status });
        return data;
      } });
      vm.runInContext(source, context);
      const adapters = vm.runInContext("({me: getCurrentTeacher, list: getTeacherAdvisorRequests, decide: decideTeacherAdvisorRequest})", context);
      const student = await makeStudent(); let current = (await json(await select(student, a))).advisor_request;
      const findCard = f => f.get("teacherRequestList").children.find(card => card.textContent.includes(student.student_id));
      const accept = teacherFixture(adapters); await accept.app.ready;
      await findCard(accept).querySelectorAll("button")[0].dispatch("click"); await accept.modal().querySelector(".app-confirm-modal__confirm").dispatch("click");
      await student.reload(); assert.equal(student.coop_advisor_teacher_id, a.id); assert.equal(student.advisor_teacher_id, c.id);
      assert.equal((await m.CoopProjectAdvisorRequest.findByPk(current.id)).status, "confirmed");
      await accept.filter("confirmed"); assert.equal(findCard(accept).querySelectorAll("button").length, 0);
      const rejectedStudent = await makeStudent(); current = (await json(await select(rejectedStudent, a))).advisor_request;
      const reject = teacherFixture(adapters); await reject.app.ready;
      const rejectedCard = reject.get("teacherRequestList").children.find(card => card.textContent.includes(rejectedStudent.student_id));
      await rejectedCard.querySelectorAll("button")[1].dispatch("click"); reject.modal().querySelector("textarea").value = "  Capacity full  "; await reject.modal().querySelector(".app-confirm-modal__confirm").dispatch("click");
      await rejectedStudent.reload(); assert.equal(rejectedStudent.coop_advisor_teacher_id, null); assert.equal((await m.CoopProjectAdvisorRequest.findByPk(current.id)).rejection_reason, "Capacity full");
      assert.equal((await select(rejectedStudent, b)).status, 200);
      const staleStudent = await makeStudent(); current = (await json(await select(staleStudent, a))).advisor_request;
      const stale = teacherFixture(adapters); await stale.app.ready;
      await stale.get("teacherRequestList").children.find(card => card.textContent.includes(staleStudent.student_id)).querySelectorAll("button")[0].dispatch("click");
      assert.equal((await select(staleStudent, b)).status, 200);
      await stale.modal().querySelector(".app-confirm-modal__confirm").dispatch("click");
      assert.match(stale.get("teacherRequestMessage").textContent, /เปลี่ยนแปลง/); await staleStudent.reload(); assert.equal(staleStudent.coop_advisor_teacher_id, null);
      assert.equal((await m.CoopProjectAdvisorRequest.findByPk(current.id)).status, "superseded");
    });
    await t.test("actual frontend API/page bridge persists pending selection and topic across fresh fixtures", async () => {
      const student = await makeStudent(); const vm = require("node:vm");
      const { projectFixture } = await import(require("node:url").pathToFileURL(path.resolve(__dirname, "../../frontend/test/helpers/studentCoopProjectFixture.js")));
      const apiSource = fs.readFileSync(path.resolve(__dirname, "../../frontend/src/api/studentCoop.api.js"), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
      const context = vm.createContext({ apiRequest: async (url, options = {}) => json(await request(url, studentToken(student), options.body, options.method || "GET")) }); vm.runInContext(apiSource, context);
      const adapters = { ...vm.runInContext("({getMyCoopProject,saveMyCoopProject,getMyProjectAdvisorRequest,requestMyProjectAdvisor,getMyCoopProjectFiles})", context), getTeachers: async () => ({ teachers: teachers.slice(0, 23).map(teacher => ({ id: teacher.id, academic_title: teacher.academic_title, first_name: teacher.first_name, last_name: teacher.last_name })) }) };
      const f = projectFixture(adapters); await f.load(); assert.equal(f.get("projectAdvisor").options.length, 24); assert.equal(f.get("projectAdvisor").disabled, false);
      f.get("projectTitle").value = "ระบบจัดการนักศึกษาสหกิจศึกษา"; await f.save();
      f.get("projectAdvisor").value = a.id; await f.get("projectAdvisor").dispatch("change"); assert.match(f.get("projectAdvisorStatus").textContent, /รออาจารย์ยืนยัน/);
      const fresh = projectFixture(adapters); await fresh.load(); assert.equal(fresh.get("projectAdvisor").value, a.id); assert.equal(fresh.get("projectTitle").value, "ระบบจัดการนักศึกษาสหกิจศึกษา");
      fresh.get("projectTitle").value = "การพัฒนาระบบจัดการนักศึกษาสหกิจศึกษา"; await fresh.save();
      const reload = projectFixture(adapters); await reload.load(); assert.equal(reload.get("projectTitle").value, "การพัฒนาระบบจัดการนักศึกษาสหกิจศึกษา");
      const current = (await read(student)).advisor_request; await decide(current.id, tokenA); await reload.load(); assert.equal(reload.get("projectAdvisor").disabled, true); assert.equal(reload.get("projectTitle").disabled, false);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (m && students.length) await m.Student.destroy({ where: { id: { [Op.in]: students.map(s => s.id) } } });
    if (m && teachers.length) await m.Teacher.destroy({ where: { id: { [Op.in]: teachers.map(s => s.id) } } });
    await db.close(); if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
  }
});
