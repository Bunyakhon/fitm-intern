// Opt-in: existing isolated PostgreSQL only. No account writes on intern_system.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { randomUUID, randomBytes } = require("node:crypto"), { pathToFileURL } = require("node:url");
const helper = require("../src/db/studentProfileDevelopment");
const ddl = require("../src/db/studentEducationStatus");
const database = process.env.FITM_PROFILE_TEST_DATABASE;
const enabled = process.env.FITM_PROFILE_POSTGRES_TESTS === "1" && helper.isolatedName(database || "");
test("pending Education status schema preserves legacy CRUD and rejects only explicit status writes", async () => {
  const fixtureSource = fs.readFileSync(path.join(__dirname, "studentProfileContacts.test.js"), "utf8");
  const context = { assert, randomUUID, randomBytes, CONTACT_FIELDS: require("../src/services/studentProfileContacts").CONTACT_FIELDS,
    LEGACY_FRIEND_FIELDS: require("../src/services/studentProfileContacts").LEGACY_FRIEND_FIELDS, schema: require("../src/models/studentProfileAggregate.schema"),
    rules: require("../src/services/studentProfileValidation"), createNationalIdStorage: require("../src/services/studentProfileNationalId").createNationalIdStorage,
    createStudentProfileAggregateService: require("../src/services/studentProfileAggregate.service").createStudentProfileAggregateService };
  vm.runInNewContext(fixtureSource.slice(fixtureSource.indexOf("function fixture("), fixtureSource.indexOf("const response =")) + "\nglobalThis.make = fixture;", context);
  const f = context.make(), model = f.models.StudentEducationRecord;
  for (const operation of ["findAll", "findOne", "create"]) {
    const original = model[operation]; model[operation] = (values, options) => {
      const attributes = operation === "create" ? options.returning : values.attributes;
      assert.equal(attributes.includes("education_status"), false); return original(values, options);
    };
  }
  let prior = await f.service.read(f.a); assert.equal(prior.education_status_available, false);
  const saved = await f.service.saveChild(f.a, "education", "create", undefined, { education_level: "bachelor" }, prior.profile_revision);
  prior = saved.body;
  await assert.rejects(() => f.service.saveChild(f.a, "education", "update", saved.body.record.id, { education_status: "studying" }, prior.profile_revision), error => error.code === "EDUCATION_STATUS_SCHEMA_PENDING");
  const updated = await f.service.saveChild(f.a, "education", "update", saved.body.record.id, { institution_name: "Preserved" }, prior.profile_revision);
  assert.equal(updated.body.education[0].institution_name, "Preserved");
  const deleted = await f.service.saveChild(f.a, "education", "delete", saved.body.record.id, {}, updated.body.profile_revision); assert.equal(deleted.body.education.length, 0);
  const pdf = require("../src/services/studentProfilePdfImport.service").createStudentProfilePdfImportService(f.models, f.service, {
    secret: "fixture-only", extract: async () => ({ template: "TGDE-COOP-02", page_count: 1, method: "pdf_text", candidates: [], records: { education: [{ values: { education_level: "bachelor", education_status: "studying" } }] } })
  });
  const buffer = Buffer.from("%PDF-1.7\n%%EOF"), file = { buffer, size: buffer.length, originalname: "fixture.pdf", mimetype: "application/pdf" };
  const preview = await pdf.preview(f.a, file);
  assert.equal(Object.hasOwn(preview.records.education[0].values, "education_status"), false);
  await assert.rejects(() => pdf.commit(f.a, file, { receipt: preview.receipt, changes: { education: { create: [{ education_level: "bachelor", education_status: "studying" }] } } }, preview.snapshot.profile_revision), error => error.status === 400 && error.message.includes("PDF Import"));
});
test("Education/Training protected HTTP, workspace and PostgreSQL acceptance", { skip: !enabled, timeout: 60000 }, async t => {
  const env = require("dotenv").parse(fs.readFileSync(path.join(__dirname, "../.env")));
  assert.equal(env.NODE_ENV, "development"); assert.equal(env.DB_NAME, "intern_system");
  Object.assign(process.env, env, { DB_HOST: "127.0.0.1", DB_NAME: database, JWT_SECRET: randomBytes(48).toString("hex"), DOTENV_CONFIG_QUIET: "true" });
  const models = require("../src/models"), sequelize = models.sequelize;
  assert.equal(sequelize.config.database, database); assert.notEqual(database, "intern_system");
  const express = require("express"), jwt = require("jsonwebtoken"), app = express();
  app.use(express.json()); app.use("/api/student-profile", require("../src/routes/studentProfile.routes"));
  const server = await new Promise(resolve => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
  const base = "http://127.0.0.1:" + server.address().port + "/api/student-profile";
  const owners = [];
  const request = async (owner, method, endpoint, body, revision) => {
    const response = await fetch(base + endpoint, { method, headers: { "Content-Type": "application/json", ...(owner ? { Authorization: "Bearer " + owner.token } : {}), ...(revision ? { "If-Match": revision } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  };
  const read = async owner => { const result = await request(owner, "GET", "/aggregate"); assert.equal(result.status, 200); return result.body; };
  const mutate = async (owner, method, endpoint, body, expected = method === "POST" ? 201 : 200) => {
    const prior = await read(owner), result = await request(owner, method, endpoint, body, prior.profile_revision);
    assert.equal(result.status, expected, result.body.code); return result.body;
  };
  const sql = async (owner, kind) => (await sequelize.query("SELECT * FROM public." + ({ education: "student_education_records", training: "student_training_records" })[kind] + " WHERE student_id=$1 ORDER BY id", { bind: [owner.id] }))[0];
  const before = await helper.fingerprints(sequelize, undefined, { excludeContacts: false }), schemaBefore = await helper.schemaSnapshot(sequelize);
  try {
    assert.ok(schemaBefore.columns.some(row => row.table_name === "student_education_records" && row.column_name === "education_status"), "Apply the separately reviewed additive DDL before running acceptance");
    await t.test("additive DDL is idempotent and preserves all rows and schema", async () => {
      const result = await ddl.applyEducationStatus(sequelize, { isolated: true }); assert.equal(result.changed, false); assert.equal(result.preserved, true);
      assert.deepEqual(await helper.schemaSnapshot(sequelize), schemaBefore);
    });
    for (let i = 0; i < 2; i++) {
      const code = "999" + String(BigInt("0x" + randomBytes(6).toString("hex")) % 10000000000n).padStart(10, "0");
      const student = await models.Student.create({ id: randomUUID(), student_id: code, email: "s" + code + "@email.kmutnb.ac.th", first_name: "Fixture", last_name: "Education", track: "co_op", password: randomBytes(20).toString("hex") });
      owners.push({ id: student.id, token: jwt.sign({ id: student.id, student_id: code, role: "student", actor_type: "student" }, process.env.JWT_SECRET, { expiresIn: "10m" }) });
    }
    const [a, b] = owners;
    await t.test("POST Education/Training omit display_order and persist defaults with optional GPA/year", async () => {
      for (const [kind, values] of [["education", { education_level: "bachelor", institution_name: "University", education_status: "studying", qualification: "BSc", major: "IT" }], ["training", { course_name: "Safety", institution: "Institute", qualification: "Certificate", period_text: "2 days" }]]) {
        const saved = await mutate(a, "POST", "/" + kind, values);
        const stored = (await sql(a, kind)).find(row => row.id === saved.record.id); assert.equal(stored.display_order, 0);
        for (const [key, value] of Object.entries(values)) assert.equal(stored[key], value);
        if (kind === "education") { assert.equal(stored.gpa, null); assert.equal(stored.graduation_year, null); }
        assert.deepEqual((await read(a))[kind], saved[kind]);
      }
    });
    await t.test("both statuses and legacy unknown survive fresh reads without guessing from year", async () => {
      for (const values of [
        { education_level: "high_vocational", institution_name: "College", education_status: "graduated", graduation_year: 2022 },
        { education_level: "bachelor", institution_name: "Second university", education_status: "graduated" },
        { education_level: "high_school_vocational", institution_name: "Legacy no year" },
        { education_level: "high_school_vocational", institution_name: "Legacy with year", graduation_year: 2018 },
      ]) {
        const saved = await mutate(a, "POST", "/education", values), fresh = await read(a);
        const row = fresh.education.find(item => item.id === saved.record.id);
        assert.equal(row.education_status, values.education_status ?? null); assert.equal(row.graduation_year, values.graduation_year ?? null);
      }
      assert.equal((await sql(a, "education")).filter(row => row.education_level === "bachelor").length, 2);
    });
    await t.test("PATCH and DELETE stable owner IDs preserve omitted status/order and other records", async () => {
      for (const kind of ["education", "training"]) {
        const prior = await read(a), row = prior[kind][0], other = prior[kind].filter(item => item.id !== row.id);
        const patch = kind === "education" ? { major: "Updated", gpa: "3.25" } : { course_name: "Updated", institution: "New institute", qualification: "New certificate", period_text: "1 week" };
        const saved = await mutate(a, "PATCH", "/" + kind + "/" + row.id, patch);
        const updated = saved[kind].find(item => item.id === row.id); for (const [key, value] of Object.entries(patch)) assert.equal(updated[key], value);
        assert.equal(updated.display_order, row.display_order); if (kind === "education") assert.equal(updated.education_status, row.education_status);
        assert.deepEqual(saved[kind].filter(item => item.id !== row.id), other);
        const removed = await mutate(a, "DELETE", "/" + kind + "/" + row.id, {}); assert.equal(removed[kind].some(item => item.id === row.id), false);
        assert.equal((await sql(a, kind)).some(item => item.id === row.id), false);
      }
    });
    await t.test("validation, blank training, 428 and concurrent stale saves never create empty/duplicate rows", async () => {
      const prior = await read(a);
      for (const values of [{ education_level: "other" }, { education_level: "bachelor", education_status: "unknown" }, { education_level: "bachelor", graduation_year: 0 }, { education_level: "bachelor", gpa: 4.5 }]) assert.equal((await request(a, "POST", "/education", values, prior.profile_revision)).status, 400);
      assert.equal((await request(a, "POST", "/training", {}, prior.profile_revision)).body.code, "TRAINING_EMPTY");
      assert.equal((await request(a, "POST", "/training", { course_name: "x".repeat(256) }, prior.profile_revision)).status, 400);
      assert.equal((await request(a, "POST", "/training", { course_name: "No revision" })).status, 428);
      assert.deepEqual(await read(a), prior);
      const results = await Promise.all([1, 2].map(() => request(a, "POST", "/training", { course_name: "One concurrent record" }, prior.profile_revision)));
      assert.deepEqual(results.map(item => item.status).sort(), [201, 409]);
      assert.equal((await sql(a, "training")).filter(row => row.course_name === "One concurrent record").length, 1);
    });
    await t.test("real PostgreSQL CHECK rejects unsupported status; transaction and RBAC preserve data", async () => {
      const saved = await mutate(b, "POST", "/education", { education_level: "bachelor", education_status: "studying" });
      for (const method of ["GET", "PATCH", "DELETE"]) assert.equal((await request(a, method, "/education/" + saved.record.id, method === "GET" ? undefined : {}, (await read(a)).profile_revision)).status, 404);
      assert.equal((await request(null, "GET", "/education")).status, 401);
      await assert.rejects(sequelize.transaction(async transaction => { await sequelize.query("UPDATE student_education_records SET education_status='invalid' WHERE id=$1", { bind: [saved.record.id], transaction }); }), error => error.original?.constraint === "student_education_records_education_status_check");
      const prior = await read(a);
      const failed = await request(a, "PATCH", "/aggregate", { education: { create: [{ education_level: "bachelor", education_status: "studying" }] }, training: { create: [{ course_name: "Rollback" }], update: [{ id: randomUUID(), changes: { course_name: "Missing" } }] } }, prior.profile_revision);
      assert.equal(failed.status, 404); assert.deepEqual(await read(a), prior);
    });
    await t.test("actual workspace top/bottom Save All, edit, staged delete, refresh and 409 use real API/SQL", async () => {
      const adapterFile = path.join(__dirname, "../../frontend/src/api/studentProfile.api.js");
      const adapterSource = fs.readFileSync(adapterFile, "utf8").replace(/^import[^\n]+\n/, "").replaceAll("export function ", "function ");
      const apiContext = { apiRequest: async (url, options = {}) => { const result = await request(a, options.method || "GET", url.replace("/api/student-profile", ""), options.body, options.headers?.["If-Match"]); if (result.status >= 400) throw Object.assign(Error(result.body.message), { status: result.status, data: result.body }); return result.body; } };
      vm.runInNewContext(adapterSource + "\nglobalThis.api={getMyStudentProfile,updateStudentProfileAggregate};", apiContext);
      const file = path.join(__dirname, "../../frontend/test/studentProfileContacts.test.js"), source = fs.readFileSync(file, "utf8");
      const draft = await import(pathToFileURL(path.join(__dirname, "../../frontend/src/pages/studentProfileWorkspaceDraft.js")));
      const calendar = await import(pathToFileURL(path.join(__dirname, "../../frontend/src/pages/studentProfileBirthCalendar.js")));
      const address = await import(pathToFileURL(path.join(__dirname, "../../frontend/src/pages/studentProfileAddress.js")));
      const harness = { fs, vm, URL, FormData, Blob, setTimeout, ...draft, mountProfileBirthCalendar: calendar.mountProfileBirthCalendar, mountProfileAddressSearch: address.mountProfileAddressSearch };
      vm.runInNewContext(source.slice(source.indexOf("function dom()"), source.indexOf("const settle =")).replaceAll("import.meta.url", JSON.stringify(pathToFileURL(file).href)) + "\nglobalThis.makeWorkspace=workspace;", harness);
      const make = () => { const h = harness.makeWorkspace((body, revision) => apiContext.api.updateStudentProfileAggregate(body, revision), { reload: async () => { const result = await apiContext.api.getMyStudentProfile(); h.controller.acceptSnapshot(result); return result; } }); return h; };
      const h = make(); h.controller.acceptSnapshot(await read(a)); const cards = [];
      for (const [container, values] of [["profileEducationRecords", { education_level: "bachelor", education_status: "studying", institution_name: "Workspace education" }], ["profileTrainingRecords", { course_name: "Workspace training", institution: "Institute", qualification: "Cert", period_text: "1 day" }]]) {
        const section = h.document.getElementById(container).children[0]; section.children[0].children[1].events.click(); const card = section.children[2].children.at(-1); h.edit(card, values); cards.push(card);
      }
      const pending = h.document.getElementById("profileSaveAllTop").events.click(); assert.equal(await h.document.getElementById("profileSaveAll").events.click(), false); assert.equal(await pending, true);
      let fresh = await read(a); assert.ok((await sql(a, "education")).some(row => row.institution_name === "Workspace education" && row.education_status === "studying"));
      assert.ok((await sql(a, "training")).some(row => row.course_name === "Workspace training"));
      const reloaded = make(); reloaded.controller.acceptSnapshot(fresh);
      for (const [kind, field, value] of [["education", "institution_name", "Workspace education"], ["training", "course_name", "Workspace training"]]) { const row = fresh[kind].find(item => item[field] === value); assert.equal(reloaded.input(kind + "-" + row.id, field).value, value); }
      h.edit(cards[0], { institution_name: "Local education draft" }); h.edit(cards[1], { course_name: "Local training draft" });
      await mutate(a, "POST", "/training", { course_name: "Remote change" }); assert.equal(await h.controller.saveAll(), false); assert.equal(h.controller.hasConflict, true);
      assert.equal(h.input(cards[0].dataset.profileEntry, "institution_name").value, "Local education draft"); h.document.getElementById("profileReviewAll").events.click(); await h.confirmations.pop().onConfirm();
      assert.equal(await h.document.getElementById("profileSaveAll").events.click(), true);
      for (const card of cards) { card.children.find(node => node.className === "profile-entry-actions").children.find(node => node.textContent === "ลบรายการ").events.click(); await h.confirmations.pop().onConfirm(); }
      assert.equal(await h.controller.saveAll(), true); fresh = await read(a); assert.equal(fresh.education.some(row => row.institution_name === "Local education draft"), false); assert.equal(fresh.training.some(row => row.course_name === "Local training draft"), false);
    });
    await t.test("PDF education mapping keeps explicit identity/omission and never infers or overwrites status", async () => {
      const { buildProfilePdfChanges, pdfFieldSpecs } = await import(pathToFileURL(path.join(__dirname, "../../frontend/src/pages/studentProfilePdfDraft.js")));
      assert.equal(pdfFieldSpecs.education.some(field => field.key === "education_status"), false);
      const prior = await read(a), changes = buildProfilePdfChanges(prior, [], [{ kind: "education", action: "create", values: { education_level: "high_vocational", institution_name: "PDF fixture", graduation_year: 2020 } }]);
      const result = await request(a, "PATCH", "/aggregate", changes, prior.profile_revision); assert.equal(result.status, 200);
      assert.equal((await sql(a, "education")).find(row => row.institution_name === "PDF fixture").education_status, null);
    });
  } finally {
    try {
      if (owners.length) await models.Student.destroy({ where: { id: owners.map(owner => owner.id) } });
      await t.test("cleanup restores every pre-existing row and keeps schema exactly intact", async () => { assert.deepEqual(await helper.fingerprints(sequelize, undefined, { excludeContacts: false }), before); assert.deepEqual(await helper.schemaSnapshot(sequelize), schemaBefore); });
    } finally { await new Promise(resolve => server.close(resolve)); await sequelize.close(); }
  }
});
