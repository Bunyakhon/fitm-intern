const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
test("Phase 3A production HTTP/Sequelize on guarded schema-only PostgreSQL clone", { skip: process.env.FITM_PROFILE_PHASE3A_TEST !== "true" }, async t => {
  const database = process.env.FITM_PROFILE_PHASE3A_DATABASE;
  assert.match(database, /^fitm_profile_3a_[a-f0-9]{32}$/);
  assert.notEqual(database, "intern_system"); assert.equal(process.env.DB_NAME, database);
  assert.ok(process.env.FITM_PROFILE_PHASE3A_MARKER?.endsWith(":synthetic-only"));
  const models = require("../src/models");
  const { sequelize, Student, StudentProfile, StudentFile } = models;
  sequelize.addHook("afterConnect", async connection => {
    const guard = (await connection.query("SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0];
    assert.equal(guard.name, database); assert.equal(guard.marker, process.env.FITM_PROFILE_PHASE3A_MARKER);
  });
  const results = { pass: 0, fail: 0, skipped: 0, cases: [] };
  let server;
  try {
    await sequelize.authenticate();
    for (const table of ["students", "student_profiles", "student_files", "student_addresses", "student_education_records", "student_training_records", "student_skills"]) {
      const [[row]] = await sequelize.query('SELECT count(*)::int AS count FROM public."' + table + '"');
      assert.equal(row.count, 0, "schema-only clone must contain no real rows");
    }
    for (const [id, code] of [[OWNER, "safe-phase3a-1"], [OTHER, "safe-phase3a-2"]]) await Student.create({ id, student_id: code, first_name: "Synthetic", last_name: "Fixture", email: code + "@email.kmutnb.ac.th", password: crypto.randomBytes(20).toString("hex"), major: "IT", year_level: 3, gpa: "3.00", track: "co_op" });
    await StudentProfile.create({ student_id: OWNER, prefix: "นาย", birth_date: "2000-02-29", medical_conditions: "Synthetic health preserved", related_skills: "Synthetic legacy text", parent_contact_address: "Synthetic guardian preserved", national_id_ciphertext: Buffer.from("synthetic-only"), national_id_key_version: "synthetic-key" });
    // Existing Resume parser behavior is isolated from external PDF/OCR services.
    t.mock.method(require("../src/services/resumeText.service"), "extractResumeText", async () => "Synthetic resume safe education skills training experience testing ".repeat(4));
    const express = require("express"), jwt = require("jsonwebtoken");
    const app = express(); app.use(express.json()); app.use("/api/student-profile", require("../src/routes/studentProfile.routes"));
    app.use((error, req, res, next) => res.status(500).json({ code: "TEST_REQUEST_FAILED" }));
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const origin = "http://127.0.0.1:" + server.address().port;
    function token(id = OWNER, role = "student") { return jwt.sign({ id, student_id: "safe-phase3a", actor_type: role, role }, process.env.JWT_SECRET, { expiresIn: "15m" }); }
    async function request(method, endpoint, body, revision, options = {}) {
      const multipart = body instanceof FormData;
      const response = await fetch(origin + "/api/student-profile" + endpoint, { method,
        headers: { ...(options.auth === false ? {} : { Authorization: "Bearer " + token(options.id, options.role) }), ...(revision ? { "If-Match": revision } : {}), ...(body === undefined || multipart ? {} : { "Content-Type": "application/json" }) },
        ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }) });
      const json = response.headers.get("content-type")?.includes("application/json");
      return { status: response.status, body: json ? await response.json() : Buffer.from(await response.arrayBuffer()), headers: response.headers };
    }
    const latest = async (id = OWNER) => (await request("GET", "/me", undefined, undefined, { id })).body;
    const save = async (method, endpoint, body, options = {}) => request(method, endpoint, body, (await latest(options.id)).profile_revision, options);
    async function check(name, callback) {
      await t.test(name, async () => {
        try { await callback(); ++results.pass; results.cases.push({ name, status: "PASS" }); }
        catch (error) { ++results.fail; results.cases.push({ name, status: "FAIL", reason: error.message }); throw error; }
      });
    }
    await check("personal scalars and explicit clears preserve legacy health/family/text", async () => {
      const before = await latest();
      const saved = await save("PUT", "/me", { english_first_name: "Safe", father_phone: "0000000001", national_id_issue_date: "2024-02-29", national_id_expiry_date: "2034-02-28", gender: "Draft value" });
      assert.equal(saved.status, 200); assert.notEqual(saved.body.profile_revision, before.profile_revision);
      for (const field of ["medical_conditions", "related_skills", "parent_contact_address", "birth_date"]) assert.equal(saved.body.profile[field], before.profile[field]);
      const cleared = await save("PUT", "/me", { father_phone: null }); assert.equal(cleared.body.profile.father_phone, null);
      assert.equal((await latest()).profile.english_first_name, "Safe");
    });
    let address, education, training, skill;
    await check("registered/current addresses are separate and draft fields remain optional", async () => {
      address = (await save("POST", "/addresses", { address_type: "registered", house_no: "1/2", postal_code: "00123" })).body.record;
      assert.ok(address?.id);
      const current = await save("POST", "/addresses", { address_type: "current" }); assert.equal(current.status, 201);
      assert.equal(current.body.addresses.length, 2);
      const patched = await save("PATCH", "/addresses/" + address.id, { road: "Synthetic road" }); assert.equal(patched.body.record.house_no, "1/2");
    });
    await check("education create uses stable owned IDs and multiple records per level", async () => {
      const saved = await save("POST", "/education", { education_level: "bachelor", institution_name: "Synthetic School", gpa: "3.45", graduation_year: 2024 });
      assert.equal(saved.status, 201); education = saved.body.record;
      assert.equal(education.gpa, "3.45");
      const draft = await save("POST", "/education", { education_level: "bachelor" }); assert.equal(draft.status, 201);
    });
    await check("education partial update and explicit null do not replace other columns", async () => {
      const saved = await save("PATCH", "/education/" + education.id, { major: "Synthetic subject", graduation_year: null });
      assert.equal(saved.status, 200); assert.equal(saved.body.record.institution_name, "Synthetic School"); assert.equal(saved.body.record.gpa, "3.45"); assert.equal(saved.body.record.graduation_year, null);
    });
    await check("education delete removes only the explicitly named owned row", async () => {
      const before = await latest(); const saved = await save("DELETE", "/education/" + education.id, {});
      assert.equal(saved.status, 200); assert.equal(saved.body.education.length, before.education.length - 1);
      assert.equal((await request("GET", "/education/" + education.id)).status, 404);
    });
    await check("training create/update/delete preserves period text and other records", async () => {
      training = (await save("POST", "/training", { course_name: "Synthetic Course", period_text: "Synthetic period" })).body.record;
      const patched = await save("PATCH", "/training/" + training.id, { qualification: "Draft Certificate" }); assert.equal(patched.status, 200); assert.equal(patched.body.record.period_text, "Synthetic period");
      assert.equal((await save("DELETE", "/training/" + training.id, {})).status, 200);
    });
    await check("skills create/update/delete supports both categories and nullable proficiency", async () => {
      skill = (await save("POST", "/skills", { category: "computer", skill_name: "Synthetic Skill", proficiency: "good" })).body.record;
      const language = await save("POST", "/skills", { category: "language" }); assert.equal(language.status, 201);
      const patched = await save("PATCH", "/skills/" + skill.id, { proficiency: null }); assert.equal(patched.body.record.proficiency, null);
      assert.equal((await save("DELETE", "/skills/" + skill.id, {})).status, 200);
      assert.equal((await latest()).profile.related_skills, "Synthetic legacy text");
    });
    await check("read-after-save and / alias expose the same consistent revision", async () => {
      const a = await latest(), b = await request("GET", "/"), c = await request("GET", "/aggregate");
      assert.equal(a.profile_revision, b.body.profile_revision); assert.equal(a.profile_revision, c.body.profile_revision);
      assert.deepEqual(a.addresses, c.body.addresses); assert.deepEqual(a.student, a.data);
    });
    await check("428 missing precondition and malformed If-Match produce no writes", async () => {
      const before = await latest();
      for (const [method, endpoint, body] of [["PUT", "/me", {}], ["PUT", "/student-info", {}], ["POST", "/education", { education_level: "bachelor" }], ["PATCH", "/aggregate", {}], ["POST", "/profile-image", new FormData()], ["POST", "/documents/transcript", new FormData()]]) assert.equal((await request(method, endpoint, body)).status, 428, endpoint);
      for (const header of ["*", "bad", "W/" + before.profile_revision, before.profile_revision + ", " + before.profile_revision]) assert.equal((await request("PUT", "/me", {}, header)).status, 400);
      assert.equal((await latest()).profile_revision, before.profile_revision);
    });
    await check("409 stale token includes current owner snapshot and changes nothing", async () => {
      const old = await latest(); await save("PUT", "/me", { religion: "Synthetic Religion" });
      const rejected = await request("POST", "/training", { course_name: "Must not save" }, old.profile_revision);
      assert.equal(rejected.status, 409); assert.equal(rejected.body.code, "STUDENT_PROFILE_CONFLICT"); assert.equal(rejected.body.training.length, 0);
    });
    await check("concurrent clients across academic and child endpoints serialize without lost updates", async () => {
      const before = await latest();
      const replies = await Promise.all([request("PUT", "/student-info", { department: "Synthetic Dept" }, before.profile_revision), request("POST", "/training", { course_name: "Concurrent synthetic" }, before.profile_revision)]);
      assert.deepEqual(replies.map(r => r.status).sort(), [replies.find(r => r.status !== 409).status, 409].sort());
      assert.equal(replies.filter(r => r.status === 409).length, 1); assert.ok(replies.some(r => [200, 201].includes(r.status)));
      const rejectedIndex = replies.findIndex(r => r.status === 409);
      assert.ok([200, 201].includes((await save(rejectedIndex === 0 ? "PUT" : "POST", rejectedIndex === 0 ? "/student-info" : "/training", rejectedIndex === 0 ? { department: "Synthetic Dept" } : { course_name: "Concurrent synthetic" })).status));
      const after = await latest(); assert.equal(after.student.department, "Synthetic Dept"); assert.ok(after.training.some(row => row.course_name === "Concurrent synthetic"));
    });
    await check("first-create profile race is serialized on the Student owner", async () => {
      const before = await latest(OTHER);
      const responses = await Promise.all([request("PUT", "/me", { religion: "Synthetic A" }, before.profile_revision, { id: OTHER }), request("PUT", "/me", { current_phone: "0000000002" }, before.profile_revision, { id: OTHER })]);
      assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]); assert.equal(await StudentProfile.count({ where: { student_id: OTHER } }), 1);
    });
    await check("aggregate transaction rolls back scalar/child/counter when a later ownership check fails", async () => {
      const before = await latest();
      const rejected = await request("PATCH", "/aggregate", { student: { faculty: "Must rollback" }, profile: { emergency_contact_name: "Must rollback" }, training: { create: [{ course_name: "Must rollback" }] }, skills: { delete: [crypto.randomUUID()] } }, before.profile_revision);
      assert.equal(rejected.status, 404); assert.deepEqual(await latest(), before);
    });
    await check("database unique failure rolls back all earlier aggregate writes", async () => {
      const before = await latest();
      const rejected = await request("PATCH", "/aggregate", { profile: { ethnicity: "Must rollback" }, addresses: { create: [{ address_type: "registered" }] } }, before.profile_revision);
      assert.equal(rejected.status, 409); assert.deepEqual(await latest(), before);
    });
    await check("ownership rejects foreign IDs and mass assignment without changing either student", async () => {
      const foreign = (await save("POST", "/education", { education_level: "bachelor" }, { id: OTHER })).body.record;
      const before = await latest();
      assert.equal((await save("PATCH", "/education/" + foreign.id, { gpa: 4 })).status, 404);
      assert.equal((await save("DELETE", "/education/" + foreign.id, {})).status, 404);
      for (const body of [{ student_id: OTHER }, { id: OTHER }, { national_id_ciphertext: "unsafe" }, { national_id_key_version: "unsafe" }, { profile_data_revision: "0" }, { approval_status: "approved" }]) assert.equal((await save("PUT", "/me", body)).status, 400);
      assert.equal((await save("PUT", "/student-info", { first_name: "unsafe" })).status, 400);
      assert.equal((await request("GET", "/me", undefined, undefined, { auth: false })).status, 401);
      assert.equal((await request("GET", "/me", undefined, undefined, { role: "teacher" })).status, 403);
      assert.deepEqual(await latest(), before);
    });
    await check("no-op payloads/empty child arrays preserve revision and all existing rows", async () => {
      const before = await latest();
      const responses = [await save("PUT", "/me", { religion: before.profile.religion }), await save("PATCH", "/aggregate", { education: { create: [], update: [], delete: [] }, training: {} }), await save("PUT", "/student-info", { gpa: Number(before.student.gpa) })];
      for (const response of responses) { assert.equal(response.status, 200); assert.equal(response.body.profile_revision, before.profile_revision); }
      assert.deepEqual(await latest(), before);
    });
    await check("calendar/leap-year/GPA/enums/conditional fields enforce the real schema and allow drafts", async () => {
      const before = await latest();
      for (const body of [{ birth_date: "2023-02-30" }, { birth_date: "1900-02-29" }, { national_id_expiry_date: "2023-02-30" }, { national_id_issue_date: "2040-01-01" }, { has_driving_license: false, driving_license_number: "unsafe" }, { military_status: "not_applicable" }, { father_phone: "bad" }, { mother_age: -1 }, { gender: "x".repeat(33) }]) assert.equal((await save("PUT", "/me", body)).status, 400);
      for (const body of [{ gpa: 4.01 }, { last_semester_gpa: "3.456" }, { year_level: 5 }]) assert.equal((await save("PUT", "/student-info", body)).status, 400);
      for (const body of [{ education_level: "unknown" }, { education_level: null }, { education_level: "bachelor", graduation_year: 10000 }]) assert.equal((await save("POST", "/education", body)).status, 400);
      assert.equal((await save("POST", "/skills", { category: "computer", proficiency: "excellent" })).status, 400);
      assert.deepEqual(await latest(), before);
      assert.equal((await save("PUT", "/me", { birth_date: "2000-02-29", has_driving_license: true })).status, 200);
      assert.equal((await save("PUT", "/student-info", { last_semester_gpa: null })).status, 200);
    });
    function multipart(field, bytes, type, name, label) { const form = new FormData(); form.append(field, new Blob([bytes], { type }), name); if (label !== undefined) form.append("document_label", label); return form; }
    const pdf = Buffer.from("%PDF-1.7\nSynthetic attachment only\n%%EOF");
    let document;
    await check("private document upload versions are server-managed and prior bytes are retained", async () => {
      const saved = await save("POST", "/documents/transcript", multipart("document", pdf, "application/pdf", "safe.pdf"));
      assert.equal(saved.status, 201); document = saved.body.document;
      assert.equal(document.document_version, 1); assert.equal(document.content_sha256, crypto.createHash("sha256").update(pdf).digest("hex")); assert.equal(document.storage_path, undefined);
      const replaced = await save("POST", "/documents/transcript", multipart("document", pdf, "application/pdf", "safe-new.pdf"));
      assert.equal(replaced.status, 201); assert.equal(replaced.body.document.document_version, 2); assert.equal(replaced.body.document.supersedes_file_id, document.id);
      assert.equal(replaced.body.documents.filter(row => row.file_type === "transcript").length, 1);
      const historical = await request("GET", "/documents/" + document.id + "/download"); assert.equal(historical.status, 200); assert.deepEqual(historical.body, pdf); assert.ok(historical.headers.get("cache-control").includes("no-store"));
      document = replaced.body.document;
    });
    await check("document ownership, metadata editing and removal preserve stored versions", async () => {
      const denied = await request("GET", "/documents/" + document.id + "/download", undefined, undefined, { id: OTHER }); assert.equal(denied.status, 404);
      assert.equal((await save("PATCH", "/documents/" + document.id, { content_sha256: "unsafe" })).status, 400);
      assert.equal((await save("PATCH", "/documents/" + document.id, { document_label: "Synthetic label" })).status, 200);
      assert.equal((await save("DELETE", "/documents/" + document.id, {})).status, 200);
      assert.ok(!(await latest()).documents.some(row => row.id === document.id));
      assert.equal((await request("GET", "/documents/" + document.id + "/download")).status, 200); assert.equal(await StudentFile.count({ where: { id: document.id } }), 1);
    });
    await check("upload validates bytes/extensions/count/body and stale failures remove only staged bytes", async () => {
      const before = await latest();
      assert.equal((await save("POST", "/documents/transcript", multipart("document", Buffer.from("not pdf"), "application/pdf", "safe.pdf"))).status, 400);
      assert.equal((await save("POST", "/documents/transcript", multipart("document", pdf, "application/pdf", "safe.png"))).status, 400);
      assert.equal((await save("POST", "/documents/supporting_other", multipart("document", pdf, "application/pdf", "safe.pdf"))).status, 400);
      const two = multipart("document", pdf, "application/pdf", "safe.pdf"); two.append("document", new Blob([pdf], { type: "application/pdf" }), "second.pdf"); assert.equal((await save("POST", "/documents/transcript", two)).status, 400);
      assert.equal((await save("POST", "/documents/resume", multipart("document", pdf, "application/pdf", "safe.pdf"))).status, 400);
      const stale = before.profile_revision; await save("PUT", "/me", { nationality: "Synthetic" });
      assert.equal((await request("POST", "/documents/transcript", multipart("document", pdf, "application/pdf", "safe.pdf"), stale)).status, 409);
      const physical = await fs.readdir(path.join(process.env.STORAGE_ROOT, "students", OWNER, "profile-documents")); assert.equal(physical.length, 2, "only the two committed versions remain");
    });
    await check("photo upload participates in aggregate If-Match and invalidates stale scalar writes", async () => {
      const before = await latest();
      const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
      const saved = await request("POST", "/profile-image", multipart("profile_image", png, "image/png", "safe.png"), before.profile_revision);
      assert.equal(saved.status, 200); assert.notEqual(saved.body.profile_revision, before.profile_revision);
      assert.equal((await request("PUT", "/me", { religion: "Must not save" }, before.profile_revision)).status, 409);
      assert.equal((await request("GET", "/profile-image")).status, 200);
    });
    await check("Resume and project file metadata are outside profile aggregate", async () => {
      const before = await latest();
      assert.equal((await request("POST", "/resume", multipart("resume", pdf, "application/pdf", "safe.pdf"))).status, 200);
      assert.equal((await latest()).profile_revision, before.profile_revision);
      await StudentFile.create({ student_id: OWNER, file_type: "coop_project_book", original_name: "synthetic.pdf", storage_path: "synthetic-only/project.pdf", mime_type: "application/pdf", file_size: 1 });
      assert.equal((await latest()).profile_revision, before.profile_revision);
    });
    await check("sensitive private attributes never leak through owner DTO or legacy role model includes", async () => {
      const dto = JSON.stringify(await latest()); assert.ok(!dto.includes("national_id_ciphertext")); assert.ok(!dto.includes("national_id_key_version")); assert.ok(!dto.includes("password_hash")); assert.ok(!dto.includes("storage_path"));
      const legacy = await Student.findByPk(OWNER, { include: [{ model: StudentProfile, as: "profile" }] });
      assert.equal(legacy.profile.national_id_ciphertext, undefined); assert.equal(legacy.profile.father_phone, undefined); assert.equal(legacy.department, undefined);
      assert.equal(legacy.profile.medical_conditions, "Synthetic health preserved");
    });
    await check("aggregate counter remains exact beyond JavaScript safe integer", async () => {
      const student = await Student.findByPk(OWNER, { attributes: ["id", "profile_data_revision"] });
      await student.update({ profile_data_revision: "9007199254740993" }, { fields: ["profile_data_revision"] });
      const before = await latest();
      const saved = await request("PUT", "/me", { father_address: "Synthetic precision check" }, before.profile_revision);
      assert.equal(saved.status, 200); assert.notEqual(saved.body.profile_revision, before.profile_revision);
      const after = await Student.findByPk(OWNER, { attributes: ["id", "profile_data_revision"] });
      assert.equal(after.profile_data_revision, "9007199254740994");
    });
    await check("GET waits for the owner lock and returns the fully committed snapshot", async () => {
      const before = await latest();
      let release, updated;
      const gate = new Promise(resolve => { release = resolve; });
      const written = new Promise(resolve => { updated = resolve; });
      const original = StudentProfile.prototype.update;
      const pause = t.mock.method(StudentProfile.prototype, "update", async function(values, options) {
        const result = await original.call(this, values, options); updated(); await gate; return result;
      });
      try {
        const write = request("PUT", "/me", { mother_address: "Synthetic consistent snapshot" }, before.profile_revision);
        await written;
        let readSettled = false;
        const read = latest().then(value => { readSettled = true; return value; });
        await new Promise(resolve => setTimeout(resolve, 80));
        assert.equal(readSettled, false, "reader must wait on Student SHARE lock");
        release(); const saved = await write; const loaded = await read;
        assert.equal(saved.status, 200); assert.equal(loaded.profile.mother_address, "Synthetic consistent snapshot"); assert.equal(loaded.profile_revision, saved.body.profile_revision);
      } finally { release(); pause.mock.restore(); }
    });
    await check("unsafe JSON integers are rejected without scalar/child/revision changes", async () => {
      const before = await latest();
      for (const value of [Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 2, 2147483648, 1.5, "2", true]) {
        for (const [endpoint, method, body] of [
          ["/me", "PUT", { father_age: value }],
          ["/student-info", "PUT", { year_level: value }],
          ["/training", "POST", { display_order: value }],
          ["/education", "POST", { education_level: "bachelor", graduation_year: value }],
        ]) assert.equal((await request(method, endpoint, body, before.profile_revision)).status, 400);
      }
      assert.deepEqual(await latest(), before);
    });
    await check("upload transaction failure rolls back old-current/new-version/counter and removes staged bytes", async () => {
      assert.equal((await save("POST", "/documents/transcript", multipart("document", pdf, "application/pdf", "active-before-rollback.pdf"))).status, 201);
      const before = await latest();
      assert.ok(before.documents.some(row => row.file_type === "transcript"));
      const fileDirectory = path.join(process.env.STORAGE_ROOT, "students", OWNER, "profile-documents");
      const beforeFiles = (await fs.readdir(fileDirectory)).sort();
      const realTransaction = sequelize.transaction.bind(sequelize);
      const failure = t.mock.method(sequelize, "transaction", callback => realTransaction(async transaction => {
        const result = await callback(transaction);
        if (result?.body?.document) throw new Error("Injected synthetic transaction failure");
        return result;
      }));
      try {
        assert.equal((await request("POST", "/documents/transcript", multipart("document", pdf, "application/pdf", "safe-rollback.pdf"), before.profile_revision)).status, 500);
      } finally { failure.mock.restore(); }
      assert.deepEqual(await latest(), before); assert.deepEqual((await fs.readdir(fileDirectory)).sort(), beforeFiles);
    });
    await check("rejected COMMIT rolls back document/photo references and removes staged bytes", async () => {
      for (const [endpoint, field, bytes, mime, name, category] of [
        ["/documents/transcript", "document", pdf, "application/pdf", "rejected.pdf", "profile-documents"],
        ["/profile-image", "profile_image", Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]), "image/png", "rejected.png", "profile"],
      ]) {
        const before = await latest();
        const directory = path.join(process.env.STORAGE_ROOT, "students", OWNER, category);
        const beforeFiles = (await fs.readdir(directory)).sort();
        const queryInterface = sequelize.getQueryInterface();
        const realCommit = queryInterface.commitTransaction.bind(queryInterface);
        let injected = false;
        const rejected = t.mock.method(queryInterface, "commitTransaction", async (...args) => {
          if (!injected) { injected = true; throw new Error("Synthetic rejected COMMIT"); }
          return realCommit(...args);
        });
        try {
          assert.equal((await request("POST", endpoint, multipart(field, bytes, mime, name), before.profile_revision)).status, 500);
        } finally { rejected.mock.restore(); }
        assert.deepEqual(await latest(), before);
        assert.deepEqual((await fs.readdir(directory)).sort(), beforeFiles);
      }
    });
    await check("lost COMMIT acknowledgement retains durable document/photo metadata and bytes", async () => {
      for (const [endpoint, field, bytes, mime, name, status] of [
        ["/documents/transcript", "document", pdf, "application/pdf", "committed.pdf", 201],
        ["/profile-image", "profile_image", Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]), "image/png", "committed.png", 200],
      ]) {
        const before = await latest();
        const queryInterface = sequelize.getQueryInterface();
        const realCommit = queryInterface.commitTransaction.bind(queryInterface);
        let injected = false;
        const lostAck = t.mock.method(queryInterface, "commitTransaction", async (...args) => {
          await realCommit(...args);
          if (!injected) { injected = true; throw new Error("Synthetic lost COMMIT acknowledgement"); }
        });
        try {
          assert.equal((await request("POST", endpoint, multipart(field, bytes, mime, name), before.profile_revision)).status, 500);
        } finally { lostAck.mock.restore(); }
        const after = await latest(); assert.notEqual(after.profile_revision, before.profile_revision);
        if (status === 201) {
          const durable = after.documents.find(row => row.original_name === name);
          assert.ok(durable); assert.equal((await request("GET", "/documents/" + durable.id + "/download")).status, 200);
        } else assert.equal((await request("GET", "/profile-image")).status, 200);
      }
    });
    await check("photo removal clears only the reference and retains previously committed bytes", async () => {
      const before = await latest(), directory = path.join(process.env.STORAGE_ROOT, "students", OWNER, "profile");
      const beforeFiles = await fs.readdir(directory);
      const removed = await request("DELETE", "/profile-image", {}, before.profile_revision);
      assert.equal(removed.status, 200); assert.equal(removed.body.profile_image, null); assert.notEqual(removed.body.profile_revision, before.profile_revision);
      assert.equal((await request("GET", "/profile-image")).status, 404); assert.deepEqual(await fs.readdir(directory), beforeFiles);
    });
    await check("atomic successful aggregate save changes only specified scalar and child fields", async () => {
      const before = await latest();
      const saved = await request("PATCH", "/aggregate", { student: { faculty: "Synthetic Faculty" }, profile: { mother_phone: "0000000003" }, training: { create: [{ course_name: "Atomic training" }] }, addresses: { update: [{ id: address.id, changes: { road: null } }] } }, before.profile_revision);
      assert.equal(saved.status, 200); assert.equal(saved.body.student.faculty, "Synthetic Faculty"); assert.equal(saved.body.profile.mother_phone, "0000000003"); assert.equal(saved.body.addresses.find(row => row.id === address.id).house_no, "1/2");
      assert.equal(saved.body.profile.medical_conditions, before.profile.medical_conditions);
      assert.equal((await latest()).profile_revision, saved.body.profile_revision);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await sequelize.close();
    if (process.env.FITM_PROFILE_PHASE3A_RESULTS) await fs.writeFile(process.env.FITM_PROFILE_PHASE3A_RESULTS, JSON.stringify(results, null, 2));
  }
});
