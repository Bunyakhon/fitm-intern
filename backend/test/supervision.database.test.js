const test = require("node:test"), assert = require("node:assert/strict"), crypto = require("node:crypto"), fs = require("node:fs"), path = require("node:path"), http = require("node:http");
const { Sequelize } = require("sequelize"), { Umzug, SequelizeStorage } = require("umzug"), express = require("express"), jwt = require("jsonwebtoken");
test("Supervision scheduling: guarded disposable PostgreSQL and production HTTP", { skip: !process.env.SUPERVISION_DISPOSABLE_DATABASE_URL }, async t => {
  const db = new Sequelize(process.env.SUPERVISION_DISPOSABLE_DATABASE_URL, { logging: false, pool: { max: 8 } }); let server;
  try {
    const [[guard]] = await db.query("SELECT current_database() AS db,current_setting('fitm.a019_disposable',true) AS marker"); assert.equal(guard.db, "fitm_supervision_test"); assert.equal(guard.marker, "on");
    const m = { sequelize: db }; for (const file of fs.readdirSync(path.join(__dirname, "../src/models")).filter(f => f.endsWith(".model.js"))) { const model = require(`../src/models/${file}`)(db); m[model.name] = model; } for (const model of Object.values(m)) model.associate?.(m);
    const umzug = new Umzug({ migrations: { glob: ["*.js", { cwd: path.join(__dirname, "../src/db/migrations") }] }, context: db.getQueryInterface(), storage: new SequelizeStorage({ sequelize: db, tableName: "sequelize_meta" }), logger: undefined });
    await umzug.up({ to: "018_add_internship_logs.js" }); const migration = require("../src/db/migrations/019_add_supervision_appointments");
    await assert.rejects(require("../src/services/supervision.service").createSupervisionService(m).listTeacher(crypto.randomUUID()), e => e.status === 503 && e.code === "SUPERVISION_SCHEMA_REQUIRED");
    const fingerprint = async () => (await db.query("SELECT md5(COALESCE(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) AS f FROM student_files t"))[0][0].f;
    const before = await fingerprint();
    await t.test("019 empty up/down/reapply and injected DDL failure are transactional", async () => {
      await migration.up({ context: db.getQueryInterface() }); await migration.down({ context: db.getQueryInterface() });
      const query = db.query; db.query = function (sql, options) { return query.call(this, typeof sql === "string" && sql.includes("CREATE TABLE supervision_appointments") ? sql + " SELECT missing_019_function();" : sql, options); };
      try { await assert.rejects(migration.up({ context: db.getQueryInterface() }), /missing_019_function/); } finally { db.query = query; }
      assert.equal((await db.query("SELECT to_regclass('supervision_appointments') AS name"))[0][0].name, null);
      await umzug.up(); assert.equal((await umzug.executed()).length, 22); assert.equal(await fingerprint(), before);
    });
    const run = crypto.randomUUID().slice(0, 8), password = crypto.randomBytes(24).toString("hex"), now = new Date("2026-10-08T12:00:00+07:00");
    const teacher = await m.Teacher.create({ first_name: "Project", last_name: "Advisor", status: "active" });
    const other = await m.Teacher.create({ first_name: "Class", last_name: "Advisor", status: "active", is_department_head: true, department: "FITM" });
    const fixture = async suffix => m.Student.create({ student_id: `supervision-${suffix}-${run}`, email: `${suffix}-${run}@email.kmutnb.ac.th`, first_name: suffix, last_name: "Student", major: "INE", track: "co_op", password, advisor_teacher_id: other.id, coop_advisor_teacher_id: teacher.id });
    const a = await fixture("a"), b = await fixture("b");
    const request = await m.CoopRequest.create({ student_id: a.id, company_name: "Disposable Company", company_address: "Private fixture address", company_province: "Bangkok", letter_recipient_name: "Fixture HR", work_start_date: "2026-11-01", work_end_date: "2027-02-01", status: "approved" });
    const mentor = await m.Mentor.create({ student_id: a.id, first_name: "Original", last_name: "Mentor", position: "Engineer", email: `${run}@fixture.invalid`, status: "verified", verified_at: now });
    let delivery, emailFails = false;
    const app = express(); app.use(express.json()); app.use("/api/supervision", require("../src/routes/supervision.routes").createSupervisionRouter({ models: m, now: () => now, sendEmail: async value => { delivery = value; if (emailFails) throw Error("Fixture email unavailable"); } }));
    server = http.createServer(app); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); const base = `http://127.0.0.1:${server.address().port}/api/supervision`;
    const auth = row => jwt.sign(row === a || row === b ? { id: row.id, student_id: row.student_id, actor_type: "student", role: "student" } : { id: row.id, teacher_id: row.id, actor_type: "teacher", role: "teacher" }, process.env.JWT_SECRET, { expiresIn: "10m" });
    const call = async (url, method = "GET", body, token = auth(teacher)) => { const res = await fetch(base + url, { method, headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body !== undefined && { "Content-Type": "application/json" }) }, ...(body !== undefined && { body: JSON.stringify(body) }) }); return { status: res.status, body: await res.json() }; };
    const root = `/teacher/students/${a.id}`, visit = number => `${root}/visits/${number}`, input = { date: "2026-11-04", time: "09:30", mentor_verified_at: now.toISOString(), notes: "Fixture note" };
    const service = require("../src/services/supervision.service").createSupervisionService(m, { now: () => now });
    let first, second, token1, token2;
    await t.test("project advisor own list/detail and student safe read-back", async () => {
      assert.equal((await call("/teacher/students")).body.students.length, 2); assert.equal((await call("/teacher/students", "GET", undefined, auth(other))).body.students.length, 0);
      const detail = await call(root); assert.equal(detail.body.mentor.email, mentor.email); assert.equal(detail.body.requests[0].id, request.id); assert.equal(detail.body.student.code, a.student_id);
      assert.equal((await call("/student", "GET", undefined, auth(a))).body.appointments.length, 0); assert.equal((await call("/teacher/students?offset=-1")).status, 400); assert.equal((await call("/teacher/students?limit=999")).status, 400);
    });
    await t.test("anonymous, wrong role, class advisor, Head and body-actor spoof rejected", async () => {
      assert.equal((await call(root, "GET", undefined, null)).status, 401); assert.equal((await call(root, "GET", undefined, auth(a))).status, 403);
      assert.equal((await call(root, "GET", undefined, auth(other))).status, 404); assert.equal((await call(visit(1), "POST", input, auth(other))).status, 404);
      assert.equal((await call(visit(1), "POST", { ...input, teacher_id: other.id })).status, 400);
      assert.equal((await call("/student", "GET", undefined, auth(teacher))).status, 403);
      await teacher.update({ status: "inactive" }); assert.equal((await call(root)).status, 403); await teacher.update({ status: "active" });
    });
    await t.test("missing/ambiguous approved placement and unverified/changed mentor block writes", async () => {
      assert.equal((await call(`/teacher/students/${b.id}/visits/1`, "POST", input)).body.code, "PLACEMENT_REQUIRED");
      await mentor.update({ status: "pending" }); assert.equal((await call(visit(1), "POST", input)).body.code, "VERIFIED_MENTOR_REQUIRED"); await mentor.update({ status: "verified" });
      assert.equal((await call(visit(1), "POST", { ...input, mentor_verified_at: new Date(0).toISOString() })).body.code, "MENTOR_CHANGED");
      const extra = await m.CoopRequest.create({ student_id: a.id, company_name: "Other", company_address: "Fixture", company_province: "Bangkok", letter_recipient_name: "Fixture HR", work_start_date: "2026-11-01", work_end_date: "2027-02-01", status: "approved" }); assert.equal((await call(visit(1), "POST", input)).body.code, "PLACEMENT_REQUIRED"); await extra.destroy();
    });
    await t.test("invalid visit/dates/time/outside period do not persist", async () => {
      for (const [url, patch] of [[visit(3), {}], [visit(1), { date: "2026-11-31" }], [visit(1), { time: "24:00" }], [visit(1), { date: "2026-10-01" }], [visit(1), { date: "2027-02-02" }]]) assert.equal((await call(url, "POST", { ...input, ...patch })).status, 400);
      assert.equal(await m.SupervisionAppointment.count(), 0);
    });
    await t.test("concurrent creates commit one appointment/audit and no raw token response", async () => {
      const results = await Promise.all([call(visit(1), "POST", input), call(visit(1), "POST", input)]); assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
      const result = results.find(r => r.status === 201); first = result.body.appointment; token1 = delivery.token;
      assert.equal(first.scheduled_at, "2026-11-04T02:30:00.000Z"); assert.equal(await m.SupervisionEvent.count(), 1); assert.equal(await m.SupervisionToken.count(), 1);
      assert.ok(!JSON.stringify(result.body).includes(token1)); assert.equal((await m.SupervisionToken.findOne()).token_hash, crypto.createHash("sha256").update(token1).digest("hex"));
      assert.equal((await call("/student", "GET", undefined, auth(a))).body.appointments[0].id, first.id); assert.equal((await call("/student", "GET", undefined, auth(b))).body.appointments.length, 0);
    });
    await t.test("visit 2 independent appointment is safely scoped with explicit substitute", async () => {
      const substitute = { email: `substitute-${run}@fixture.invalid`, first_name: "Substitute", last_name: "Mentor", position: "Manager", reason: "Original unavailable" };
      const result = await call(visit(2), "POST", { ...input, date: "2026-12-04", substitute }); assert.equal(result.status, 201); second = result.body.appointment; token2 = delivery.token;
      assert.equal(delivery.to, substitute.email); assert.equal(second.snapshot.is_substitute, true); assert.equal((await mentor.reload()).email, `${run}@fixture.invalid`);
      const view = await call("/mentor/appointment", "GET", undefined, token2); assert.equal(view.body.appointment.id, second.id); assert.equal(view.body.appointment.snapshot.attending_mentor.first_name, "Substitute"); assert.ok(!JSON.stringify(view.body).includes(first.id));
    });
    await t.test("single-use verification/weekly tokens cannot act as appointment tokens", async () => {
      for (const token of [null, auth(a), crypto.randomBytes(32).toString("hex")]) assert.equal((await call("/mentor/appointment", "GET", undefined, token)).status, 401);
      const weekly = await require("../src/services/internshipLog.service").createInternshipLogService(m).resend(a.id); assert.equal((await call("/mentor/appointment", "GET", undefined, weekly.token)).status, 401);
      const verification = crypto.randomBytes(32).toString("hex"); await m.MentorToken.create({ mentor_id: mentor.id, token_hash: crypto.createHash("sha256").update(verification).digest("hex"), expires_at: new Date("2027-01-01") }); assert.equal((await call("/mentor/appointment", "GET", undefined, verification)).status, 401);
    });
    await t.test("identity checkbox/version required; scoped confirm cannot change appointment fields", async () => {
      assert.equal((await call("/mentor/confirm", "POST", { version: 1, confirm_identity: false }, token1)).status, 400);
      assert.equal((await call("/mentor/confirm", "POST", { version: 99, confirm_identity: true }, token1)).status, 409);
      assert.equal((await call("/mentor/confirm", "POST", { version: 1, confirm_identity: true, appointment_id: second.id }, token1)).status, 400);
    });
    await t.test("concurrent original Mentor confirmation consumes token once and persists name/date", async () => {
      const results = await Promise.all([call("/mentor/confirm", "POST", { version: 1, confirm_identity: true }, token1), call("/mentor/confirm", "POST", { version: 1, confirm_identity: true }, token1)]); assert.deepEqual(results.map(r => r.status).sort(), [200, 410]);
      first = results.find(r => r.status === 200).body.appointment; assert.equal(first.status, "confirmed"); assert.equal(first.version, 2); assert.equal(first.confirmed_at, now.toISOString());
      const event = await m.SupervisionEvent.findOne({ where: { appointment_id: first.id, version: 2 } }); assert.equal(event.actor_name, "Original Mentor"); assert.equal(event.teacher_id, null); assert.equal((await call("/mentor/appointment", "GET", undefined, token1)).status, 410);
    });
    await t.test("substitute confirms only nominated visit; original mentor record stays unchanged", async () => {
      const result = await call("/mentor/confirm", "POST", { version: 1, confirm_identity: true }, token2); assert.equal(result.status, 200); second = result.body.appointment;
      const event = await m.SupervisionEvent.findOne({ where: { appointment_id: second.id, version: 2 } }); assert.equal(event.actor_name, "Substitute Mentor"); assert.equal((await mentor.reload()).first_name, "Original"); assert.equal((await mentor.reload()).verified_at.toISOString(), now.toISOString());
    });
    await t.test("concurrent reschedule preserves confirmed snapshot, resets confirmation and rejects stale writes", async () => {
      const changes = { ...input, date: "2026-11-05", version: first.version, reason: "Company requested change" };
      const results = await Promise.all([call(visit(1), "PUT", changes), call(visit(1), "PUT", { ...changes, notes: "Other" })]); assert.deepEqual(results.map(r => r.status).sort(), [200, 409]); first = results.find(r => r.status === 200).body.appointment; token1 = delivery.token;
      assert.equal(first.status, "pending_confirmation"); assert.equal(first.confirmed_at, null); assert.equal(first.version, 3);
      const events = await m.SupervisionEvent.findAll({ where: { appointment_id: first.id }, order: [["version", "ASC"]] }); assert.equal(events.length, 3); assert.equal(events[1].snapshot.status, "confirmed"); assert.equal(events[1].snapshot.scheduled_at, "2026-11-04T02:30:00.000Z"); assert.equal(events[2].reason, "Company requested change");
      assert.equal((await call(visit(1), "PUT", { ...changes, version: 3, reason: "" })).status, 400);
    });
    await t.test("reschedule revokes pending old token and resend rotates without revision", async () => {
      const old = token1; const result = await call(visit(1), "PUT", { ...input, date: "2026-11-06", version: 3, reason: "Reschedule again" }); assert.equal(result.status, 200); first = result.body.appointment; token1 = delivery.token;
      assert.equal((await call("/mentor/appointment", "GET", undefined, old)).status, 410);
      const link = `${root}/appointments/${first.id}/link`; assert.equal((await call(link, "POST", { version: 3 })).status, 409);
      const previous = token1; assert.equal((await call(link, "POST", { version: 4 })).status, 200); token1 = delivery.token; assert.equal((await call("/mentor/appointment", "GET", undefined, previous)).status, 410); assert.equal((await m.SupervisionAppointment.findByPk(first.id)).version, 4);
      assert.equal((await call(`/teacher/students/${b.id}/appointments/${first.id}/link`, "POST", { version: 4 })).status, 404);
    });
    await t.test("expired token and passed appointments cannot confirm/edit", async () => {
      const access = await m.SupervisionToken.findOne({ where: { token_hash: crypto.createHash("sha256").update(token1).digest("hex") } }); await access.update({ expires_at: new Date(0) }); assert.equal((await call("/mentor/appointment", "GET", undefined, token1)).status, 410);
      const late = require("../src/services/supervision.service").createSupervisionService(m, { now: () => new Date("2026-12-10") }); await assert.rejects(late.save(teacher.id, a.id, 1, { ...input, date: "2027-01-01", version: 4, reason: "Late" }, true), e => e.code === "APPOINTMENT_PASSED");
    });
    await t.test("live mentor info, project advisor and request changes invalidate scoped access", async () => {
      await call(`${root}/appointments/${first.id}/link`, "POST", { version: 4 }); token1 = delivery.token;
      await mentor.update({ position: "Changed" }); assert.equal((await call("/mentor/appointment", "GET", undefined, token1)).status, 403); await mentor.update({ position: "Engineer" });
      await a.update({ coop_advisor_teacher_id: other.id }); assert.equal((await call("/mentor/appointment", "GET", undefined, token1)).status, 404); assert.equal((await call(root)).status, 404); await a.update({ coop_advisor_teacher_id: teacher.id });
      await request.update({ status: "cancelled" }); assert.equal((await call("/mentor/appointment", "GET", undefined, token1)).status, 403); await request.update({ status: "approved" });
      assert.equal((await call("/mentor/appointment", "GET", undefined, token1)).status, 200);
    });
    await t.test("injected audit error rolls back appointment, token consumption and history", async () => {
      m.SupervisionEvent.addHook("afterCreate", "injectedFailure", () => { throw Error("Injected audit failure"); });
      try { await assert.rejects(service.scope(token1, { version: 4, confirm_identity: true }), /Injected audit failure/); } finally { m.SupervisionEvent.removeHook("afterCreate", "injectedFailure"); }
      assert.equal((await m.SupervisionAppointment.findByPk(first.id)).version, 4); assert.equal((await call("/mentor/appointment", "GET", undefined, token1)).status, 200); assert.equal(await m.SupervisionEvent.count({ where: { appointment_id: first.id } }), 4);
    });
    await t.test("SMTP failure returns truthful committed result and supports retry", async () => {
      emailFails = true; const result = await call(visit(1), "PUT", { ...input, date: "2026-11-07", version: 4, reason: "Email fixture" }); assert.equal(result.status, 200); assert.equal(result.body.email_sent, false); first = result.body.appointment;
      emailFails = false; assert.equal((await call(`${root}/appointments/${first.id}/link`, "POST", { version: 5 })).body.email_sent, true); token1 = delivery.token;
    });
    await t.test("FK/unique/check, immutable history, identity guard and populated rollback reject SQL bypass", async () => {
      await assert.rejects(db.query("UPDATE supervision_events SET reason='tamper'"), /immutable/); await assert.rejects(db.query("DELETE FROM supervision_events"), /immutable/);
      await assert.rejects(db.query("UPDATE supervision_appointments SET student_id=:id,version=version+1 WHERE id=:appointment", { replacements: { id: b.id, appointment: first.id } }), /identity/);
      await assert.rejects(m.SupervisionAppointment.create({ ...first, id: crypto.randomUUID(), visit_number: 3 }), /check constraint/);
      await assert.rejects(m.SupervisionAppointment.create({ ...first, id: crypto.randomUUID(), student_id: b.id, visit_number: 1 }), e => ["SequelizeUniqueConstraintError", "SequelizeForeignKeyConstraintError"].includes(e.name));
      const foreignRequest = await m.CoopRequest.create({ student_id: b.id, company_name: "Other company", company_address: "Fixture address", company_province: "Bangkok", letter_recipient_name: "Fixture HR", work_start_date: "2026-11-01", work_end_date: "2027-02-01", status: "approved" });
      await assert.rejects(m.SupervisionAppointment.create({ ...first, id: crypto.randomUUID(), student_id: b.id, request_id: foreignRequest.id, visit_number: 1 }), e => e.name === "SequelizeForeignKeyConstraintError" && e.index === "supervision_mentor_owner_fk");
      await assert.rejects(mentor.destroy(), e => e.name === "SequelizeForeignKeyConstraintError");
      await assert.rejects(m.SupervisionToken.create({ appointment_id: crypto.randomUUID(), version: 1, token_hash: "a".repeat(64), expires_at: now }), /foreign key/);
      await assert.rejects(migration.down({ context: db.getQueryInterface() }), /populated rollback/);
      assert.equal(await fingerprint(), before); assert.equal((await a.reload()).advisor_teacher_id, other.id); assert.equal((await a.reload()).coop_advisor_teacher_id, teacher.id); assert.equal((await request.reload()).status, "approved");
    });
    await t.test("all three roles read the same latest authorized appointment/history", async () => {
      const teacherView = await call(root), studentView = await call("/student", "GET", undefined, auth(a)), mentorView = await call("/mentor/appointment", "GET", undefined, token1);
      assert.deepEqual(studentView.body.appointments, teacherView.body.appointments); assert.equal(mentorView.body.appointment.version, 5); assert.equal(studentView.body.history.length, 7); assert.ok(studentView.body.history.every(e => Number.isFinite(Date.parse(e.created_at)))); assert.ok(!JSON.stringify(studentView.body).includes(token1));
    });
  } finally { if (server) await new Promise(resolve => server.close(resolve)); await db.close(); }
});
