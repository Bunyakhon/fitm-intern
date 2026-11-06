// Opt-in acceptance against an existing isolated PostgreSQL database; no DDL/seed/reset.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { randomUUID, randomBytes } = require("node:crypto");
const { pathToFileURL } = require("node:url");
const helper = require("../src/db/studentProfileDevelopment");
const name = process.env.FITM_PROFILE_TEST_DATABASE;
const enabled = process.env.FITM_PROFILE_POSTGRES_TESTS === "1" && helper.isolatedName(name || "");

test("computer/language skills: PostgreSQL + protected HTTP API + actual frontend workspace", { skip: !enabled, timeout: 60000 }, async t => {
  const env = require("dotenv").parse(fs.readFileSync(path.join(__dirname, "../.env")));
  assert.equal(env.NODE_ENV, "development");
  assert.equal(env.DB_NAME, "intern_system"); assert.equal(env.DB_HOST, "postgres");
  Object.assign(process.env, env, { DB_NAME: name, DB_HOST: "127.0.0.1", DOTENV_CONFIG_QUIET: "true", JWT_SECRET: randomBytes(48).toString("hex") });
  const models = require("../src/models"), sequelize = models.sequelize;
  assert.equal(sequelize.config.database, name); assert.notEqual(name, "intern_system");
  const [metadata] = await sequelize.query("SELECT current_database() AS database, current_schema() AS schema, current_setting('server_version_num')::int AS version");
  assert.equal(metadata[0].database, name); assert.equal(metadata[0].schema, "public");
  assert.ok(metadata[0].version >= 160000 && metadata[0].version < 170000);
  const express = require("express"), jwt = require("jsonwebtoken");
  const app = express(); app.use(express.json()); app.use("/api/student-profile", require("../src/routes/studentProfile.routes"));
  const server = await new Promise(resolve => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
  const base = "http://127.0.0.1:" + server.address().port;
  const ids = [], owners = [], calls = [];
  let before, schemaBefore;
  const request = async (owner, method, endpoint, body, revision) => {
    const response = await fetch(base + "/api/student-profile" + endpoint, { method,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + owner.token, ...(revision ? { "If-Match": revision } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  };
  const read = async owner => { const result = await request(owner, "GET", "/aggregate"); assert.equal(result.status, 200); return result.body; };
  const write = async (owner, body) => {
    const prior = await read(owner), result = await request(owner, "PATCH", "/aggregate", body, prior.profile_revision);
    assert.equal(result.status, 200, result.body.code); return result.body;
  };
  const sql = async owner => {
    const [rows] = await sequelize.query("SELECT id,category,skill_name,proficiency,display_order FROM public.student_skills WHERE student_id=$1 ORDER BY id", { bind: [owner.id] });
    return rows;
  };
  try {
    before = await helper.fingerprints(sequelize, undefined, { excludeContacts: false });
    schemaBefore = await helper.schemaSnapshot(sequelize);
    for (let index = 0; index < 2; index++) {
      const code = "999" + String(BigInt("0x" + randomBytes(6).toString("hex")) % 10000000000n).padStart(10, "0");
      const owner = await models.Student.create({ id: randomUUID(), student_id: code, email: "s" + code + "@email.kmutnb.ac.th",
        first_name: "ทดสอบ", last_name: "ระบบ", track: "co_op", password: randomBytes(18).toString("base64url") });
      ids.push(owner.id); owners.push({ id: owner.id, token: jwt.sign({ id: owner.id, student_id: code, actor_type: "student", role: "student" }, process.env.JWT_SECRET, { expiresIn: "10m" }) });
    }
    const [a, b] = owners;
    for (const category of ["computer", "language"]) await t.test(category + " alone saves with omitted display_order through actual registered model/API and SQL read-back", async () => {
      const prior = await read(a), payload = { skills: { create: [{ category, skill_name: category === "computer" ? "JavaScript" : "English", proficiency: "good" }] } };
      const result = await request(a, "PATCH", "/aggregate", payload, prior.profile_revision);
      assert.equal(result.status, 200, result.body.code);
      const receipt = result.body.aggregate_operations[0], row = (await sql(a)).find(item => item.id === receipt.id);
      assert.equal(row.category, category); assert.equal(row.proficiency, "good"); assert.equal(row.display_order, 0);
      const fresh = await read(a); assert.deepEqual(fresh.skills, result.body.skills);
      assert.equal(fresh.skills.find(item => item.id === receipt.id).skill_name, payload.skills.create[0].skill_name);
      assert.notEqual(fresh.profile_revision, prior.profile_revision);
    });
    await t.test("both categories commit together, preserve explicit order, update stable IDs and clear optional strings/enums", async () => {
      const saved = await write(a, { skills: { create: [
        { category: "computer", skill_name: "SQL", proficiency: "very_good", display_order: 5 },
        { category: "language", skill_name: "ไทย", proficiency: "fair", display_order: 2 },
      ] } });
      assert.equal(saved.aggregate_operations.length, 2);
      const rows = saved.aggregate_operations.map(item => saved.skills.find(row => row.id === item.id));
      assert.deepEqual(rows.map(row => row.display_order), [5, 2]);
      const updated = await write(a, { skills: { update: rows.map(row => ({ id: row.id, changes: { skill_name: row.category + " edited", proficiency: "moderate" } })) } });
      for (const row of rows) assert.equal(updated.skills.find(item => item.id === row.id).skill_name, row.category + " edited");
      const cleared = await write(a, { skills: { update: rows.map(row => ({ id: row.id, changes: { skill_name: "", proficiency: null } })) } });
      for (const row of rows) {
        const stored = (await sql(a)).find(item => item.id === row.id);
        assert.equal(stored.skill_name, null); assert.equal(stored.proficiency, null); assert.equal(stored.display_order, row.display_order);
      }
      assert.deepEqual((await read(a)).skills, cleared.skills);
    });
    await t.test("existing enum validation and If-Match/409 prevent invalid or lost updates", async () => {
      const prior = await read(a);
      for (const changes of [{ proficiency: "expert" }, { category: "other" }, { skill_name: "x".repeat(256) }, { display_order: -1 }]) {
        const response = await request(a, "PATCH", "/aggregate", { skills: { update: [{ id: prior.skills[0].id, changes }] } }, prior.profile_revision);
        assert.equal(response.status, 400);
      }
      assert.deepEqual(await read(a), prior);
      assert.equal((await request(a, "PATCH", "/aggregate", { skills: { create: [{ category: "computer" }] } })).status, 428);
      await write(a, { skills: { update: [{ id: prior.skills[0].id, changes: { skill_name: "Winner" } }] } });
      const winner = await read(a);
      assert.equal((await request(a, "PATCH", "/aggregate", { skills: { update: [{ id: prior.skills[0].id, changes: { skill_name: "Loser" } }] } }, prior.profile_revision)).status, 409);
      assert.deepEqual(await read(a), winner);
    });
    await t.test("transaction rolls back both categories/profile/revision after SQL insert followed by missing-owner row failure", async () => {
      const prior = await read(a), rows = await sql(a);
      const failed = await request(a, "PATCH", "/aggregate", { profile: { medical_conditions: "Must roll back" }, skills: {
        create: [{ category: "computer", skill_name: "Must roll back" }, { category: "language", skill_name: "Must roll back" }],
        update: [{ id: randomUUID(), changes: { proficiency: "good" } }],
      } }, prior.profile_revision);
      assert.equal(failed.status, 404); assert.deepEqual(await sql(a), rows); assert.deepEqual(await read(a), prior);
    });
    await t.test("Student A cannot read/change/delete B's skills or inject ownership", async () => {
      const foreign = (await write(b, { skills: { create: [{ category: "language", skill_name: "Private fixture" }] } })).aggregate_operations[0].id;
      const other = await read(b), own = await read(a);
      for (const [method, body] of [["GET", undefined], ["PATCH", { skill_name: "Hijack" }], ["DELETE", {}]]) {
        assert.equal((await request(a, method, "/skills/" + foreign, body, own.profile_revision)).status, 404);
      }
      assert.equal((await request(a, "PATCH", "/aggregate", { skills: { update: [{ id: foreign, changes: { proficiency: "good" } }] } }, own.profile_revision)).status, 404);
      assert.equal((await request(a, "POST", "/skills", { category: "computer", student_id: b.id }, own.profile_revision)).status, 400);
      assert.deepEqual(await read(b), other); assert.deepEqual(await read(a), own);
    });
    await t.test("actual frontend API adapter/workspace saves both skill lists, reloads, keeps drafts and other profile data", async () => {
      const adapterSource = fs.readFileSync(path.join(__dirname, "../../frontend/src/api/studentProfile.api.js"), "utf8")
        .replace(/^import .*\r?\n/, "").replaceAll("export function", "function").replaceAll("export async function", "async function");
      const context = { apiRequest: async (url, options = {}) => {
        const response = await request(a, options.method || "GET", url.replace("/api/student-profile", ""), options.body, options.headers?.["If-Match"]);
        if (response.status >= 400) throw Object.assign(new Error(response.body.message), { status: response.status, data: response.body });
        if (options.method === "PATCH") calls.push(JSON.parse(JSON.stringify(options.body)));
        return response.body;
      } };
      vm.runInNewContext(adapterSource + "\nglobalThis.adapter={getMyStudentProfile,updateStudentProfileAggregate};", context);
      const file = path.join(__dirname, "../../frontend/test/studentProfileContacts.test.js"), source = fs.readFileSync(file, "utf8");
      const draft = await import(pathToFileURL(path.join(__dirname, "../../frontend/src/pages/studentProfileWorkspaceDraft.js")));
      const calendar = await import(pathToFileURL(path.join(__dirname, "../../frontend/src/pages/studentProfileBirthCalendar.js")));
      const harness = { fs, vm, URL, ...draft, mountProfileBirthCalendar: calendar.mountProfileBirthCalendar };
      vm.runInNewContext(source.slice(source.indexOf("function dom()"), source.indexOf("const settle ="))
        .replaceAll("import.meta.url", JSON.stringify(pathToFileURL(file).href)) + "\nglobalThis.makeWorkspace=workspace;", harness);
      const make = () => {
        const h = harness.makeWorkspace((body, revision) => context.adapter.updateStudentProfileAggregate(body, revision),
          { reload: async () => { const value = await context.adapter.getMyStudentProfile(); h.controller.acceptSnapshot(value); return value; } });
        return h;
      };
      const preserved = (await write(a, { profile: { english_prefix: "Ms.", blood_type: "AB", current_address: "Keep legacy address", related_skills: "Keep legacy text" } })).profile;
      const h = make(); h.controller.acceptSnapshot(await context.adapter.getMyStudentProfile());
      const added = [];
      for (const [container, category] of [["profileComputerSkills", "computer"], ["profileLanguageSkills", "language"]]) {
        const section = h.document.getElementById(container).children[0]; section.children[0].children[1].events.click();
        const card = section.children[2].children.at(-1); h.edit(card, { skill_name: category + " workspace", proficiency: "good" }); added.push(card);
      }
      assert.equal(h.controller.hasChanges(), true); assert.equal(await h.controller.saveAll(), true);
      assert.deepEqual(calls.at(-1).skills.create.map(row => row.category), ["computer", "language"]);
      assert.equal(Object.hasOwn(calls.at(-1), "profile"), false); assert.equal(h.controller.hasChanges(), false);
      const fresh = await read(a); assert.deepEqual(fresh.profile, preserved);
      const reloaded = make(); reloaded.controller.acceptSnapshot(await context.adapter.getMyStudentProfile());
      for (const category of ["computer", "language"]) {
        const row = fresh.skills.find(item => item.skill_name === category + " workspace");
        assert.equal(reloaded.input("skills-" + row.id, "skill_name").value, category + " workspace");
        assert.equal((await sql(a)).find(item => item.id === row.id).proficiency, "good");
      }
      // A real stale-revision response retains both skill drafts for explicit review.
      for (const card of added) h.edit(card, { skill_name: "Local draft" });
      await write(a, { profile: { allergies: "Remote change" } });
      assert.equal(await h.controller.saveAll(), false); assert.equal(h.controller.hasConflict, true);
      for (const card of added) assert.equal(h.input(card.dataset.profileEntry, "skill_name").value, "Local draft");
      h.document.getElementById("profileReviewAll").events.click(); await h.confirmations.pop().onConfirm();
      assert.equal(await h.controller.saveAll(), true); assert.equal(h.controller.hasChanges(), false);
      assert.equal((await read(a)).profile.allergies, "Remote change");
      const { buildProfilePdfChanges } = await import(pathToFileURL(path.join(__dirname, "../../frontend/src/pages/studentProfilePdfDraft.js")));
      const snapshot = await read(a);
      const changes = buildProfilePdfChanges(snapshot, [], [
        { kind: "skills", action: "create", values: { category: "computer", skill_name: "PDF SQL", proficiency: "fair" } },
        { kind: "skills", action: "create", values: { category: "language", skill_name: "PDF French", proficiency: "moderate" } },
      ]);
      const imported = await context.adapter.updateStudentProfileAggregate(changes, snapshot.profile_revision);
      for (const value of ["PDF SQL", "PDF French"]) assert.ok((await sql(a)).some(row => row.skill_name === value));
      assert.deepEqual(imported.profile, snapshot.profile);
    });
  } finally {
    assert.equal(sequelize.config.database, name); assert.ok(helper.isolatedName(name));
    try {
      if (ids.length) await models.Student.destroy({ where: { id: ids } });
      if (before) await t.test("fixture cleanup preserves every pre-existing row and schema", async () => {
        assert.deepEqual(await helper.fingerprints(sequelize, undefined, { excludeContacts: false }), before);
        assert.deepEqual(await helper.schemaSnapshot(sequelize), schemaBefore);
      });
    } finally { await new Promise(resolve => server.close(resolve)); await sequelize.close(); }
  }
});
