const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");
const express = require("express");
const jwt = require("jsonwebtoken");
const { Sequelize } = require("sequelize");
const { Umzug, SequelizeStorage } = require("umzug");

test("company evaluation authenticated HTTP, real PostgreSQL and Student page read-back", { skip: !process.env.COMPANY_EVALUATION_DISPOSABLE_DATABASE_URL }, async t => {
  const db = new Sequelize(process.env.COMPANY_EVALUATION_DISPOSABLE_DATABASE_URL, { logging: false, pool: { max: 8 } });
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
  const students = []; let server, m;
  try {
    const [guard] = await db.query("SELECT current_database() AS db,current_setting('fitm.a015_disposable',true) AS disposable");
    assert.equal(guard[0].db, "fitm_evaluation_test"); assert.equal(guard[0].disposable, "on");
    m = { sequelize: db };
    for (const file of fs.readdirSync(path.join(__dirname, "../src/models")).filter(f => f.endsWith(".model.js"))) { const model = require(`../src/models/${file}`)(db); m[model.name] = model; }
    for (const model of Object.values(m)) model.associate?.(m);
    const umzug = new Umzug({ migrations: { glob: ["*.js", { cwd: path.join(__dirname, "../src/db/migrations") }] }, context: db.getQueryInterface(), storage: new SequelizeStorage({ sequelize: db, tableName: "sequelize_meta" }), logger: undefined });
    if ((await umzug.executed()).some(migration => migration.name === "015_add_company_evaluations.js")) await umzug.down({ migrations: ["015_add_company_evaluations.js"] });
    if (!(await umzug.executed()).some(migration => migration.name === "014_add_coop_project_advisor_requests.js")) await umzug.up({ to: "014_add_coop_project_advisor_requests.js" });
    const run = crypto.randomUUID().slice(0, 8), password = crypto.randomBytes(24).toString("hex");
    for (const [index, track] of [[0, "co_op"], [1, "co_op"], [2, "internship"]]) students.push(await m.Student.create({ student_id: `evaluation-${index}-${run}`, email: `evaluation-${index}-${run}@email.kmutnb.ac.th`, first_name: `นักศึกษา${index}`, last_name: "ทดสอบ", major: index === 0 ? "INE" : "IT", track, password }));
    const [a, b, internship] = students;
    const mentor = await m.Mentor.create({ student_id: a.id, first_name: "พี่เลี้ยง", last_name: "ของนักศึกษาเอ", position: "Fixture position", email: `mentor-${run}@fixture.invalid`, status: "pending" });
    const foreignMentor = await m.Mentor.create({ student_id: b.id, first_name: "พี่เลี้ยง", last_name: "ของนักศึกษาบี", position: "Fixture position", email: `other-${run}@fixture.invalid`, status: "verified" });
    const token = owner => jwt.sign({ id: owner.id, student_id: owner.student_id, actor_type: "student", role: "student" }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "10m" });
    const app = express(); app.use(express.json()); app.use("/api/student-coop", require("../src/routes/studentCoop.routes").createStudentCoopRouter({ models: m }));
    server = http.createServer(app); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`, endpoint = "/api/student-coop/company-evaluation";
    const request = (owner, body, auth = token(owner), suffix = "") => fetch(base + endpoint + suffix, { method: body === undefined ? "GET" : "PUT", headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const data = async response => { assert.equal(response.status, 200); return response.json(); };
    const scores = { q1_score: 8, q2_score: 9, q3_score: 8, q4_score: 9, q5_score: 8 };
    const save = body => request(a, body);
    await t.test("pending 015 returns explicit schema error without affecting existing project", async () => {
      const response = await request(a); assert.equal(response.status, 503); assert.match((await response.json()).message, /015/);
      const project = await fetch(base + "/api/student-coop/project", { headers: { Authorization: `Bearer ${token(a)}` } }); assert.equal(project.status, 200);
    });
    await umzug.up({ migrations: ["015_add_company_evaluations.js"] });
    await t.test("GET derives safe Student/current pending Mentor names and neutral placeholders", async () => {
      const result = await data(await request(a));
      assert.deepEqual(result.student, { name: "นักศึกษา0 ทดสอบ" }); assert.deepEqual(result.mentor, { name: "พี่เลี้ยง ของนักศึกษาเอ" }); assert.equal(result.evaluation, null);
      assert.deepEqual(result.display, { student_id: a.student_id, major: "INE", company_name: null, mentor_position: "Fixture position", work_start_date: null, work_end_date: null, evaluation_date: null });
      assert.notEqual(result.display.student_id, a.id);
      assert.doesNotMatch(JSON.stringify(result), /email|token|password|mentor_id|is_department_head|storage_path/);
      assert.deepEqual((await data(await request(b))).mentor, { name: "พี่เลี้ยง ของนักศึกษาบี" });
    });
    let firstId;
    await t.test("create/read persists all scores and trimmed comment; server derives totals and Mentor", async () => {
      const result = await data(await save({ ...scores, comment: "  ข้อเสนอแนะ\nเพิ่มเติม  " })); firstId = result.evaluation.id;
      assert.equal(result.evaluation.total_score, 42); assert.equal(result.evaluation.average_score, 8.4);
      const row = await m.CompanyEvaluation.findOne({ where: { student_id: a.id } }); assert.equal(row.mentor_id, mentor.id);
      for (const key of Object.keys(scores)) assert.equal(row[key], scores[key]); assert.equal(row.comment, "ข้อเสนอแนะ\nเพิ่มเติม");
      assert.deepEqual((await data(await request(a))).evaluation, result.evaluation);
      assert.equal(result.display.evaluation_date, row.updatedAt.toISOString());
    });
    await t.test("editing updates the same single row and optional comment clears", async () => {
      const result = await data(await save({ q1_score: 10, q2_score: 10, q3_score: 10, q4_score: 10, q5_score: 10 }));
      assert.equal(result.evaluation.id, firstId); assert.equal(result.evaluation.comment, ""); assert.equal(result.evaluation.total_score, 50); assert.equal(result.evaluation.average_score, 10);
      assert.equal(await m.CompanyEvaluation.count({ where: { student_id: a.id } }), 1);
      assert.equal(result.display.evaluation_date, (await m.CompanyEvaluation.findByPk(firstId)).updatedAt.toISOString());
    });
    await t.test("reject missing/out-of-range/decimal/text scores and invalid/overlong comments without mutation", async () => {
      const before = (await m.CompanyEvaluation.findByPk(firstId)).toJSON();
      const missing = { ...scores }; delete missing.q4_score;
      for (const body of [missing, ...[0, 11, -1, 1.5, "8", null, true].map(value => ({ ...scores, q1_score: value })), { ...scores, comment: "ก".repeat(2001) }, { ...scores, comment: 123 }, { ...scores, comment: "bad\0text" }, [], null]) assert.equal((await save(body)).status, 400);
      assert.deepEqual((await m.CompanyEvaluation.findByPk(firstId)).toJSON(), before);
      assert.equal((await save({ ...scores, comment: "ก".repeat(2000) })).status, 200);
    });
    await t.test("owner/Mentor/name/derived-total spoofing and query/path owner overrides cannot target another Student", async () => {
      for (const [field, value] of Object.entries({ student_id: b.id, mentor_id: foreignMentor.id, student_name: "Fake", mentor_name: "Fake", total_score: 999, average_score: 999 })) assert.equal((await save({ ...scores, [field]: value })).status, 400);
      const before = (await m.CompanyEvaluation.findByPk(firstId)).toJSON();
      const readB = await data(await request(b, undefined, token(b), `?student_id=${a.id}`)); assert.equal(readB.evaluation, null); assert.equal(readB.student.name, "นักศึกษา1 ทดสอบ");
      const savedB = await data(await request(b, scores, token(b), `?student_id=${a.id}`)); assert.notEqual(savedB.evaluation.id, firstId);
      assert.deepEqual((await m.CompanyEvaluation.findByPk(firstId)).toJSON(), before);
      assert.equal((await request(b, scores, token(b), `/${firstId}`)).status, 404);
      assert.equal((await request(b, undefined, token(b), `/${firstId}`)).status, 404);
    });
    await t.test("real middleware rejects unauthenticated/wrong-role/missing/non-Coop Student", async () => {
      for (const body of [undefined, scores]) {
        assert.equal((await request(a, body, null)).status, 401);
        for (const role of ["teacher", "department_staff", "department_head"]) {
          const wrong = jwt.sign({ id: a.id, student_id: a.student_id, actor_type: role, role }, process.env.JWT_SECRET); assert.equal((await request(a, body, wrong)).status, 403);
        }
        assert.equal((await request(internship, body)).status, 403);
        assert.equal((await request({ id: crypto.randomUUID(), student_id: "missing" }, body)).status, 404);
      }
    });
    await t.test("no/deleted/replaced Mentor reads safely and next save derives the new current relationship", async () => {
      await foreignMentor.destroy(); const result = await data(await request(b)); assert.equal(result.mentor, null);
      assert.equal((await m.CompanyEvaluation.findOne({ where: { student_id: b.id } })).mentor_id, null);
      const replacement = await m.Mentor.create({ student_id: b.id, first_name: "พี่เลี้ยงใหม่", last_name: "ของบี", position: "Fixture", email: `new-${run}@fixture.invalid` });
      assert.equal((await data(await request(b))).mentor.name, "พี่เลี้ยงใหม่ ของบี");
      await data(await request(b, scores)); assert.equal((await m.CompanyEvaluation.findOne({ where: { student_id: b.id } })).mentor_id, replacement.id);
      await replacement.destroy(); assert.equal((await data(await request(b))).mentor, null);
    });
    await t.test("concurrent first saves and edits leave one row; transaction failure preserves previous values", async () => {
      await m.CompanyEvaluation.destroy({ where: { student_id: b.id } });
      const responses = await Promise.all([request(b, scores), request(b, { ...scores, q1_score: 1 })]);
      assert.ok(responses.every(response => response.status === 200)); assert.equal(await m.CompanyEvaluation.count({ where: { student_id: b.id } }), 1);
      const before = (await m.CompanyEvaluation.findByPk(firstId)).toJSON();
      m.CompanyEvaluation.addHook("afterUpdate", "evaluationFailure", () => { throw Error("Injected save failure"); });
      try { assert.equal((await save(scores)).status, 500); } finally { m.CompanyEvaluation.removeHook("afterUpdate", "evaluationFailure"); }
      assert.deepEqual((await m.CompanyEvaluation.findByPk(firstId)).toJSON(), before);
    });
    await t.test("evaluation GET/PUT never query or mutate student_files", async () => {
      const originalQuery = db.query;
      const queries = [];
      db.query = function(statement, ...args) {
        const sql = typeof statement === "string" ? statement : statement.query || "";
        queries.push(sql);
        if (/\bstudent_files\b/i.test(sql)) throw Error("Company Evaluation unexpectedly accessed student_files");
        return originalQuery.call(this, statement, ...args);
      };
      try {
        await data(await request(a));
        await data(await save({ ...scores, comment: "Evaluation-only safety check" }));
        await data(await request(a));
        assert.ok(queries.some(sql => /\bcompany_evaluations\b/i.test(sql)));
        assert.ok(queries.every(sql => !/\bstudent_files\b/i.test(sql)));
      } finally {
        db.query = originalQuery;
      }
    });
    await t.test("context uses exactly one accepted owner request; history and ambiguity never pick a workplace", async () => {
      const company = await m.Company.create({ name: "Current company master", normalized_name: `context-${run}`, email: `context-${run}@fixture.invalid`, normalized_email: `context-${run}@fixture.invalid`, phone: "0123456789", address_no: "1", subdistrict: "Fixture", district: "Fixture", province: "Fixture" });
      const requests = [];
      const add = async (student, status, name, company_id = null) => {
        const row = await m.CoopRequest.create({ student_id: student.id, status, company_id, company_name: name, company_province: "Fixture", company_address: "Fixture address", letter_recipient_name: "Fixture recipient", work_start_date: "2026-06-01", work_end_date: "2026-09-30" });
        requests.push(row); return row;
      };
      try {
        await add(a, "rejected", "Rejected history"); await add(a, "cancelled", "Cancelled history");
        await add(b, "in_progress", "Other Student workplace");
        let result = await data(await request(a));
        assert.equal(result.display.company_name, null); assert.equal(result.display.work_start_date, null);
        const approved = await add(a, "approved", "Approved company snapshot", company.id);
        for (const status of ["approved", "document_issued", "in_progress"]) {
          await approved.update({ status });
          result = await data(await request(a, undefined, token(a), `?student_id=${b.id}&company_id=${company.id}`));
          assert.equal(result.display.company_name, "Approved company snapshot");
          assert.equal(result.display.work_start_date, "2026-06-01"); assert.equal(result.display.work_end_date, "2026-09-30");
          assert.equal(result.display.student_id, a.student_id); assert.equal(result.display.major, "INE");
          assert.equal((await data(await request(b))).display.company_name, "Other Student workplace");
          assert.doesNotMatch(JSON.stringify(result), /email|password|token|company_id|mentor_id|storage_path|is_department_head/);
        }
        const ambiguous = await add(a, "approved", "Another accepted request");
        result = await data(await request(a));
        assert.equal(result.display.company_name, null); assert.equal(result.display.work_start_date, null); assert.equal(result.display.work_end_date, null);
        await ambiguous.update({ status: "cancelled" }); await approved.update({ status: "cancelled" });
        result = await data(await request(a)); assert.equal(result.display.company_name, null);
        const manual = await add(a, "approved", "Manual company without master");
        assert.equal((await data(await request(a))).display.company_name, manual.company_name);
      } finally {
        for (const row of requests) await row.destroy(); await company.destroy();
      }
    });
    await t.test("real frontend API and form save/edit survive fresh DOM fixtures backed by SQL", async () => {
      const modulePath = path.resolve(__dirname, "../../frontend/test/helpers/studentCompanyEvaluationFixture.js");
      const { evaluationFixture } = await import(pathToFileURL(modulePath).href);
      const apiSource = fs.readFileSync(path.resolve(__dirname, "../../frontend/src/api/studentCoop.api.js"), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
      const bridge = vm.createContext({ apiRequest: async (url, options = {}) => {
        assert.equal(url, endpoint, "Evaluation form must use only its own endpoint");
        const r = await fetch(base + url, { method: options.method || "GET", headers: { Authorization: `Bearer ${token(a)}`, "Content-Type": "application/json" }, ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
        const result = await r.json(); if (!r.ok) throw Error(result.message); return result;
      } }); vm.runInContext(apiSource, bridge);
      const apiGet = vm.runInContext("getMyCompanyEvaluation", bridge), apiSave = vm.runInContext("saveMyCompanyEvaluation", bridge);
      const adapters = { getEvaluation: apiGet, saveEvaluation: apiSave };
      const f = evaluationFixture(adapters); assert.equal(await f.load(), true); await f.scores([7, 8, 9, 8, 7]); f.get("evaluationComment").value = "  บันทึกจากหน้าแบบประเมิน  "; await f.save();
      assert.equal(f.toasts.at(-1).type, "success");
      const fresh = evaluationFixture(adapters); await fresh.load(); assert.equal(fresh.get("evaluationStudentName").textContent, "นักศึกษา0 ทดสอบ");
      assert.equal(fresh.get("evaluationMentorName").textContent, "พี่เลี้ยง ของนักศึกษาเอ"); assert.equal(fresh.get("evaluationQ1").value, "7");
      assert.equal(fresh.get("evaluationStudentId").textContent, a.student_id); assert.equal(fresh.get("evaluationMajor").textContent, "INE");
      assert.equal(fresh.get("evaluationMentorPosition").textContent, mentor.position); assert.notEqual(fresh.get("evaluationDate").textContent, "-");
      assert.equal(fresh.get("evaluationComment").value, "บันทึกจากหน้าแบบประเมิน"); assert.equal(fresh.get("evaluationTotal").textContent, "39 / 50");
      await fresh.scores([1, 2, 3, 4, 5]); await fresh.save(); const row = await m.CompanyEvaluation.findOne({ where: { student_id: a.id } });
      assert.equal(row.id, firstId); assert.equal(row.q5_score, 5); assert.equal(await m.CompanyEvaluation.count({ where: { student_id: a.id } }), 1);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (m) for (const student of students) await student.destroy();
    await db.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
  }
});
