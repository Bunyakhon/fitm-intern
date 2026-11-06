// Opt-in only. Requires a disposable database restored/verified outside this test.
// Never creates/resets a DB, changes live data, or runs with intern_system as target.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { randomUUID, randomBytes } = require("node:crypto");
const { pathToFileURL } = require("node:url");
const helper = require("../src/db/studentProfileDevelopment");
const name = process.env.FITM_PROFILE_TEST_DATABASE;
const enabled = process.env.FITM_PROFILE_POSTGRES_TESTS === "1" && helper.isolatedName(name || "");

test("actual PostgreSQL / protected HTTP API / frontend adapter acceptance", { skip: !enabled, timeout: 60000 }, async t => {
  const env = require("dotenv").parse(fs.readFileSync(path.join(__dirname, "../.env")));
  assert.equal(env.NODE_ENV, "development"); assert.equal(env.DB_NAME, "intern_system");
  assert.equal(env.DB_HOST, "postgres"); assert.equal(Number(env.DB_PORT), 5432);
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  process.env.DB_NAME = name; process.env.DB_HOST = "127.0.0.1";
  process.env.DOTENV_CONFIG_QUIET = "true"; process.env.JWT_SECRET = randomBytes(48).toString("hex");
  const models = require("../src/models"), sequelize = models.sequelize;
  assert.equal(sequelize.config.database, name); assert.notEqual(sequelize.config.database, "intern_system");
  const express = require("express"), jwt = require("jsonwebtoken");
  const app = express(); app.use(express.json()); app.use("/api/student-profile", require("../src/routes/studentProfile.routes"));
  const server = await new Promise(resolve => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
  const base = "http://127.0.0.1:" + server.address().port;
  const created = [], students = [];
  let before;
  let first, second, optional, foreignId;
  const friend = { nickname: "Fah", full_name: "Friend Fixture", phone: "0810000000", line_id: "friend.fixture", facebook_url: "https://www.facebook.com/fixture" };
  const request = async (owner, method, endpoint, body, revision, overrideToken) => {
    const headers = { "Content-Type": "application/json", ...(owner ? { Authorization: "Bearer " + (overrideToken || owner.token) } : {}), ...(revision ? { "If-Match": revision } : {}) };
    const response = await fetch(base + "/api/student-profile" + endpoint, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json(), headers: response.headers };
  };
  const read = async owner => { const response = await request(owner, "GET", "/aggregate"); assert.equal(response.status, 200); return response.body; };
  const write = async (owner, payload) => { const prior = await read(owner); const response = await request(owner, "PATCH", "/aggregate", payload, prior.profile_revision); assert.equal(response.status, 200); return response.body; };
  try {
    before = await helper.fingerprints(sequelize, undefined, { excludeContacts: false });
    await t.test("schema/model/FK/index/CHECK contracts are installed on PostgreSQL", async () => {
      await sequelize.transaction({ readOnly: true }, async transaction => {
        const verified = await helper.verifyProfile(models, transaction);
        assert.equal(verified.missingContacts.length, 0); assert.equal(verified.friendExists, true);
        const changed = { ...verified.schema, constraints: verified.schema.constraints.map(item => item.name === "student_close_friends_display_order"
          ? { ...item, definition: "CHECK (display_order > 0)" } : item) };
        assert.equal(await helper.equivalentSchema(sequelize, transaction, verified.schema, changed), false);
      });
      await assert.rejects(() => helper.applyDevelopment(models), /Verified backup receipt is required/);
    });
    // New fixture accounts exist only in the checked isolated DB, never in live Development.
    for (let index = 0; index < 2; index++) {
      const code = "999" + String(BigInt("0x" + randomBytes(6).toString("hex")) % 10000000000n).padStart(10, "0");
      const row = await models.Student.create({ id: randomUUID(), student_id: code, email: "s" + code + "@email.kmutnb.ac.th",
        first_name: "ทดสอบ", last_name: "ระบบ", track: "co_op", password: randomBytes(18).toString("base64url") });
      created.push(row.id);
      students.push({ id: row.id, token: jwt.sign({ id: row.id, student_id: code, actor_type: "student", role: "student" }, process.env.JWT_SECRET, { expiresIn: "10m" }) });
    }
    const [a, b] = students;
    await t.test("English Title persists all choices, nullable/legacy values and omissions without changing Thai prefix or another owner", async () => {
      const other = await read(b);
      await write(a, { profile: { prefix: "นางสาว", gender: "male", english_first_name: "Fixture" } });
      for (const value of ["Mr.", "Mrs.", "Miss", "Ms.", null, "", "  ", "Dr."]) {
        const expected = value?.trim() || null;
        const saved = await write(a, { profile: { english_prefix: value } });
        assert.equal(saved.profile_english_prefix_available, true);
        assert.equal(saved.profile.english_prefix, expected);
        assert.equal(saved.profile.prefix, "นางสาว"); assert.equal(saved.profile.gender, "male");
        const reloaded = await read(a);
        assert.deepEqual(reloaded.profile, saved.profile); assert.equal(reloaded.profile_revision, saved.profile_revision);
        const stored = await models.StudentProfile.unscoped().findOne({ where: { student_id: a.id }, attributes: ["english_prefix"] });
        assert.equal(stored.english_prefix, expected);
      }
      const omitted = await write(a, { profile: { english_first_name: "Changed Fixture", prefix: "นาย" } });
      assert.equal(omitted.profile.english_prefix, "Dr.");
      assert.deepEqual(await read(b), other);
    });
    await t.test("Title validation, missing/stale If-Match and atomic rollback preserve the committed value", async () => {
      const prior = await read(a);
      for (const value of ["x".repeat(256), {}, 123, "bad\u0000value"]) {
        assert.equal((await request(a, "PATCH", "/aggregate", { profile: { english_prefix: value } }, prior.profile_revision)).status, 400);
      }
      assert.deepEqual(await read(a), prior);
      assert.equal((await request(a, "PATCH", "/aggregate", { profile: { english_prefix: "Ms." } })).status, 428);
      await write(a, { profile: { english_prefix: "Ms." } }); const winner = await read(a);
      assert.equal((await request(a, "PATCH", "/aggregate", { profile: { english_prefix: "Mr." } }, prior.profile_revision)).status, 409);
      assert.deepEqual(await read(a), winner);
      const failed = await request(a, "PATCH", "/aggregate", { profile: { english_prefix: "Mrs." }, education: { delete: [randomUUID()] } }, winner.profile_revision);
      assert.equal(failed.status, 404); assert.deepEqual(await read(a), winner);
      assert.equal((await write(a, { profile: { english_prefix: "Ms." } })).profile_revision, winner.profile_revision);
    });
    await t.test("actual JWT middleware rejects anonymous, expired and wrong-role requests", async () => {
      assert.equal((await request(null, "GET", "/aggregate")).status, 401);
      const expired = jwt.sign({ id: a.id, student_id: "fixture", actor_type: "student", role: "student" }, process.env.JWT_SECRET, { expiresIn: -1 });
      assert.equal((await request(a, "GET", "/aggregate", undefined, undefined, expired)).status, 401);
      const wrong = jwt.sign({ id: a.id, student_id: "fixture", actor_type: "student", role: "teacher" }, process.env.JWT_SECRET, { expiresIn: "1m" });
      assert.equal((await request(a, "GET", "/aggregate", undefined, undefined, wrong)).status, 403);
    });
    await t.test("student social fields persist through real owner API and fresh PostgreSQL read-back", async () => {
      const prior = await read(a), other = await read(b);
      assert.equal(prior.profile_contacts_available, true); assert.equal(prior.close_friends_available, true);
      const response = await request(a, "PUT", "/me", { student_line_id: "student.fixture", student_facebook: "https://www.facebook.com/student.fixture", father_name: "Preserved Fixture" }, prior.profile_revision);
      assert.equal(response.status, prior.profile ? 200 : 201);
      const stored = await read(a);
      assert.equal(stored.profile.student_line_id, "student.fixture"); assert.equal(stored.profile.student_facebook, "https://www.facebook.com/student.fixture");
      assert.notEqual(stored.profile_revision, prior.profile_revision); assert.deepEqual(await read(b), other);
    });
    await t.test("multiple friends including nullable fields commit with stable UUIDs and timestamps", async () => {
      const stored = await write(a, { close_friends: { create: [friend, { nickname: "Ton" }, {}] } });
      assert.equal(stored.close_friends.length, 3); assert.equal(stored.aggregate_operations.length, 3);
      [first, second, optional] = stored.aggregate_operations.map(item => item.id);
      assert.equal(new Set([first, second, optional]).size, 3);
      for (const row of stored.close_friends) { assert.equal(row.student_id, a.id); assert.ok(row.created_at); assert.ok(row.updated_at); assert.equal(row.display_order, 0); }
      assert.equal(stored.close_friends.find(row => row.id === optional).nickname, null);
      assert.deepEqual((await read(a)).close_friends, stored.close_friends);
      foreignId = (await write(b, { close_friends: { create: [{ nickname: "Other" }] } })).aggregate_operations[0].id;
    });
    await t.test("editing one friend preserves every other friend and untouched fields", async () => {
      const before = await read(a), response = await request(a, "PATCH", "/close_friends/" + first, { nickname: "Updated", line_id: "updated.fixture" }, before.profile_revision);
      assert.equal(response.status, 200);
      const after = await read(a), row = after.close_friends.find(item => item.id === first);
      assert.equal(row.nickname, "Updated"); assert.equal(row.phone, friend.phone);
      for (const id of [second, optional]) assert.deepEqual(after.close_friends.find(item => item.id === id), before.close_friends.find(item => item.id === id));
    });
    await t.test("cancelled/omitted deletion submits no delete operation and preserves saved friends", async () => {
      const before = await read(a), after = await write(a, { close_friends: { update: [{ id: second, changes: {} }] } });
      assert.deepEqual(after.close_friends, before.close_friends); assert.equal(after.profile_revision, before.profile_revision);
      // This verifies the server side of cancelled deletion; DOM Undo is a separate suite.
    });
    await t.test("Student A cannot read/update/delete B's friend or reassign ownership", async () => {
      const before = await read(b), own = await read(a);
      for (const method of ["GET", "PATCH", "DELETE"]) {
        const response = await request(a, method, "/close_friends/" + foreignId, method === "GET" ? undefined : method === "DELETE" ? {} : { nickname: "Denied" }, own.profile_revision);
        assert.equal(response.status, 404);
      }
      assert.equal((await request(a, "POST", "/close_friends", { ...friend, student_id: b.id }, own.profile_revision)).status, 400);
      assert.equal((await request(a, "GET", "/aggregate?student_id=" + b.id)).body.student.id, a.id);
      assert.deepEqual(await read(b), before);
    });
    await t.test("unsafe Facebook URLs and invalid/duplicate payloads fail without writes", async () => {
      const before = await read(a);
      for (const url of ["http://facebook.com/me", "https://facebook.com.evil.example/me", "javascript:run()", "data:text/html,x", "https://user@facebook.com/me"]) {
        assert.equal((await request(a, "PATCH", "/close_friends/" + first, { facebook_url: url }, before.profile_revision)).status, 400);
      }
      assert.equal((await request(a, "PATCH", "/aggregate", { close_friends: { update: [{ id: first, changes: {} }], delete: [first] } }, before.profile_revision)).status, 400);
      assert.equal((await request(a, "POST", "/close_friends", { phone: "123" }, before.profile_revision)).status, 400);
      await assert.rejects(() => models.StudentCloseFriend.build({ student_id: a.id, facebook_url: "javascript:run()" }).validate(), { name: "SequelizeValidationError" });
      assert.deepEqual(await read(a), before);
    });
    await t.test("actual PostgreSQL rejects FK, primary-key and display-order violations", async () => {
      const before = await read(a);
      for (const [id, owner, order, expected] of [[randomUUID(), randomUUID(), 0, "23503"], [first, a.id, 0, "23505"], [randomUUID(), a.id, -1, "23514"]]) {
        await assert.rejects(() => sequelize.transaction(transaction => sequelize.query("INSERT INTO public.student_close_friends (id,student_id,display_order) VALUES ($1,$2,$3)", { bind: [id, owner, order], transaction })), error => error.original?.code === expected);
      }
      assert.deepEqual(await read(a), before);
    });
    await t.test("missing/stale If-Match and concurrent sessions prevent lost updates", async () => {
      const before = await read(a);
      assert.equal((await request(a, "PATCH", "/close_friends/" + first, { nickname: "Denied" })).status, 428);
      const responses = await Promise.all(["Concurrent Alpha", "Concurrent Beta"].map(nickname => request(a, "PATCH", "/close_friends/" + first, { nickname }, before.profile_revision)));
      assert.deepEqual(responses.map(item => item.status).sort(), [200, 409]);
      const winner = responses.find(item => item.status === 200).body;
      assert.equal((await read(a)).close_friends.find(item => item.id === first).nickname, winner.record.nickname);
      const stale = await request(a, "DELETE", "/close_friends/" + first, {}, before.profile_revision);
      assert.equal(stale.status, 409); assert.equal(stale.headers.get("cache-control"), "private, no-store");
      assert.equal(stale.body.close_friends.some(item => item.id === foreignId), false);
    });
    await t.test("aggregate failure rolls back student, profile, new child and revision together", async () => {
      const before = await read(a), other = await read(b);
      const response = await request(a, "PATCH", "/aggregate", { student: { faculty: "Must Roll Back" }, profile: { current_phone: "0820000000" }, close_friends: { create: [{ nickname: "Rollback" }], delete: [foreignId] } }, before.profile_revision);
      assert.equal(response.status, 404); assert.deepEqual(await read(a), before); assert.deepEqual(await read(b), other);
    });
    await t.test("explicit deletion removes exactly the selected friend; omitted list preserves the rest", async () => {
      const before = await read(a), response = await request(a, "DELETE", "/close_friends/" + second, {}, before.profile_revision);
      assert.equal(response.status, 200);
      assert.deepEqual(response.body.close_friends, before.close_friends.filter(item => item.id !== second));
      const after = await write(a, { profile: { student_line_id: "changed.fixture" } });
      assert.deepEqual(after.close_friends, response.body.close_friends); assert.equal(after.profile.father_name, "Preserved Fixture");
    });
    await t.test("current frontend API adapters save/load against the real isolated HTTP/PostgreSQL stack", async adapterTest => {
      const source = fs.readFileSync(path.join(__dirname, "../../frontend/src/api/studentProfile.api.js"), "utf8").replace(/^import[^\n]+\r?\n/gm, "").replace(/export function /g, "function ");
      const context = { apiRequest: async (url, options = {}) => {
        const result = await request(a, options.method || "GET", url.replace("/api/student-profile", ""), options.body, options.headers?.["If-Match"]);
        if (result.status >= 400) throw Object.assign(new Error("API request failed"), { status: result.status, data: result.body });
        return result.body;
      } };
      vm.runInNewContext(source + "\nglobalThis.adapter = { getMyStudentProfile, updateStudentProfileAggregate, getStudentProfileRecords };", context);
      const before = await context.adapter.getMyStudentProfile();
      const saved = await context.adapter.updateStudentProfileAggregate({ profile: { student_line_id: "frontend.fixture" } }, before.profile_revision);
      assert.equal(saved.profile.student_line_id, "frontend.fixture");
      const records = await context.adapter.getStudentProfileRecords("close_friends");
      assert.deepEqual(records.records, saved.close_friends); assert.equal(records.close_friends_available, true);

      await adapterTest.test("actual workspace Draft/Title/bilingual Gender saves and reloads through real HTTP/PostgreSQL (synthetic DOM)", async () => {
        const frontendTest = path.join(__dirname, "../../frontend/test/studentProfileContacts.test.js");
        const fixture = fs.readFileSync(frontendTest, "utf8");
        const fixtureSource = fixture.slice(fixture.indexOf("function dom()"), fixture.indexOf("const settle ="))
          .replaceAll("import.meta.url", JSON.stringify(pathToFileURL(frontendTest).href));
        const draft = await import(pathToFileURL(path.join(__dirname, "../../frontend/src/pages/studentProfileWorkspaceDraft.js")));
        const calendar = await import(pathToFileURL(path.join(__dirname, "../../frontend/src/pages/studentProfileBirthCalendar.js")));
        const harness = { fs, vm, URL, ...draft, mountProfileBirthCalendar: calendar.mountProfileBirthCalendar };
        vm.runInNewContext(fixtureSource + "\nglobalThis.makeWorkspace = workspace;", harness);
        let responseGate, networkDone;
        const h = harness.makeWorkspace(async (body, revision) => {
          const result = await context.adapter.updateStudentProfileAggregate(body, revision);
          networkDone?.(); if (responseGate) await responseGate;
          return result;
        }, { reload: async () => { h.controller.acceptSnapshot(await context.adapter.getMyStudentProfile()); return {}; } });
        h.controller.acceptSnapshot(await context.adapter.getMyStudentProfile());
        const title = h.document.getElementById("profileEnglishTitle");
        const english = h.document.getElementById("profileEnglishGender"), thai = h.input("basics", "gender");
        assert.equal(title.disabled, false); assert.equal(h.document.getElementById("profileEnglishTitleHelp").hidden, true);
        const editTitle = value => { title.value = value; title.events.change(); };
        for (const value of ["Mr.", "Mrs.", "Miss", "Ms.", ""]) {
          editTitle(value); assert.equal(h.controller.hasChanges(), true);
          assert.equal(await h.controller.saveAll(), true);
          h.controller.acceptSnapshot(await context.adapter.getMyStudentProfile());
          assert.equal(title.value, value); assert.equal(h.controller.hasChanges(), false);
        }
        english.value = "female"; english.events.change(); assert.equal(thai.value, "female");
        assert.equal(await h.controller.saveAll(), true); assert.equal((await read(a)).profile.gender, "female");
        thai.value = "male"; thai.events.input(); assert.equal(english.value, "male");
        assert.equal(await h.controller.saveAll(), true); assert.equal((await read(a)).profile.gender, "male");
        let release;
        responseGate = new Promise(resolve => { release = resolve; });
        const completed = new Promise(resolve => { networkDone = resolve; });
        editTitle("Mrs."); const saving = h.controller.saveAll();
        await Promise.race([completed, saving.then(() => { throw Error("Expected in-flight Title save: " + h.errors.map(error => error.message).join("; ")); })]);
        editTitle("Miss"); release(); assert.equal(await saving, true);
        assert.equal((await read(a)).profile.english_prefix, "Mrs."); assert.equal(title.value, "Miss");
        assert.equal(h.controller.hasChanges(), true); responseGate = undefined; networkDone = undefined;
        assert.equal(await h.controller.saveAll(), true); assert.equal((await read(a)).profile.english_prefix, "Miss");
        await write(a, { profile: { english_prefix: "Ms." } }); editTitle("Mr.");
        assert.equal(await h.controller.saveAll(), false); assert.equal(h.controller.hasConflict, true);
        assert.equal(title.value, "Mr."); assert.equal((await read(a)).profile.english_prefix, "Ms.");
        h.document.getElementById("profileReviewAll").events.click(); await h.confirmations.pop().onConfirm();
        assert.equal(title.value, "Mr."); assert.equal(h.controller.hasChanges(), true);
        assert.equal(await h.controller.saveAll(), true);
        h.controller.acceptSnapshot(await context.adapter.getMyStudentProfile());
        assert.equal(title.value, "Mr."); assert.equal(h.controller.hasChanges(), false);
        const { buildProfilePdfChanges } = await import(pathToFileURL(path.join(__dirname, "../../frontend/src/pages/studentProfilePdfDraft.js")));
        const prior = await read(a), choice = { scope: "profile", key: "english_prefix", mode: "keep", value: "Mrs." };
        assert.equal(Object.keys(buildProfilePdfChanges(prior, [choice], [])).length, 0);
        const changes = buildProfilePdfChanges(prior, [{ ...choice, mode: "pdf" }], []);
        await context.adapter.updateStudentProfileAggregate(changes, prior.profile_revision);
        h.controller.acceptSnapshot(await context.adapter.getMyStudentProfile());
        assert.equal(title.value, "Mrs."); assert.equal(thai.value, "male");
        assert.equal(h.input("basics", "prefix").value, "นาย");
      });
    });
    await t.test("legacy projections do not expose the new owner-only contact fields or relation", async () => {
      const profile = await models.StudentProfile.findOne({ where: { student_id: a.id } });
      assert.equal(Object.hasOwn(profile.get(), "student_line_id"), false);
      assert.equal(Object.hasOwn(profile.get(), "student_facebook"), false);
      assert.equal(Object.hasOwn(profile.get(), "english_prefix"), false);
      const student = await models.Student.findByPk(a.id); assert.equal(Object.hasOwn(student.get(), "profileCloseFriends"), false);
    });
  } finally {
    // Strict guard again before removing ONLY fixture IDs created in this run.
    assert.equal(sequelize.config.database, name); assert.ok(helper.isolatedName(name));
    try {
      if (created.length) await models.Student.destroy({ where: { id: created } });
      if (before) await t.test("all pre-existing restored rows remain byte-equivalent after fixture cleanup", async () => {
        assert.deepEqual(await helper.fingerprints(sequelize, undefined, { excludeContacts: false }), before);
      });
    } finally {
      await new Promise(resolve => server.close(resolve)); await sequelize.close();
    }
  }
});
