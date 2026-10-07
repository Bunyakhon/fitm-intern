const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { Sequelize } = require("sequelize");
const { createTeacherCredentialManager } = require("../src/seeders/devTeacherCredential");

test("Development Teacher credentials on guarded disposable DB preserve 23 faculty and restore exact values", { skip: !process.env.COOP_ADVISOR_DISPOSABLE_DATABASE_URL }, async t => {
  const db = new Sequelize(process.env.COOP_ADVISOR_DISPOSABLE_DATABASE_URL, { logging: false });
  let root; const ids = [];
  try {
    const [guard] = await db.query("SELECT current_database() AS db,current_setting('fitm.a014_disposable',true) AS disposable");
    assert.equal(guard[0].db, "fitm_advisor_test"); assert.equal(guard[0].disposable, "on");
    const Teacher = require("../src/models/teacher.model")(db);
    // The existing acceptance runner initializes this disposable schema first.
    assert.equal(await Teacher.count(), 0);
    for (const [academic_title, first_name, last_name] of require("./fixtures/coopFaculty.json")) ids.push((await Teacher.create({ academic_title, first_name, last_name, department: "FITM" })).id);
    const teacherId = ids[0];
    const original = (await Teacher.findByPk(teacherId)).get({ plain: true });
    root = await fs.mkdtemp(path.join(os.tmpdir(), "fitm-teacher-credential-test-"));
    const manager = createTeacherCredentialManager({ sequelize: db, Teacher });
    const password = crypto.randomBytes(24).toString("hex");
    const options = { environment: "test", teacherId, email: "  Local.Teacher@fixture.invalid  ", password, backupPath: path.join(root, "original.json") };
    await t.test("production/unset environment and incorrect database fail closed", async () => {
      for (const environment of [undefined, "production", "staging"]) await assert.rejects(manager.provision({ ...options, environment }), /environment/);
      await assert.rejects(manager.provision({ ...options, environment: "development" }), /target/);
    });
    await t.test("nonexistent Teacher, weak/overlong password and invalid email cannot create records", async () => {
      await assert.rejects(manager.provision({ ...options, teacherId: crypto.randomUUID() }), /Existing active/);
      for (const value of ["short", "ก".repeat(25)]) await assert.rejects(manager.provision({ ...options, password: value }), /Password/);
      await assert.rejects(manager.provision({ ...options, email: "bad" }), /EMAIL/);
      assert.equal(await Teacher.count(), 23);
    });
    await t.test("repository backup and existing backup paths are refused before mutation", async () => {
      await assert.rejects(manager.provision({ ...options, backupPath: path.resolve(__dirname, "credential-backup.json") }), /outside/);
      const existing = path.join(root, "existing.json"); await fs.writeFile(existing, "{}", { mode: 0o600 });
      await assert.rejects(manager.provision({ ...options, backupPath: existing }), { code: "EEXIST" });
      assert.equal((await Teacher.findByPk(teacherId)).password_hash, null);
    });
    await t.test("production bcrypt hook updates only email/hash and retains all 23 faculty", async () => {
      const result = await manager.provision(options); assert.equal(result.teacherId, teacherId);
      const row = await Teacher.findByPk(teacherId); assert.equal(row.email, "local.teacher@fixture.invalid");
      assert.match(row.password_hash, /^\$2[ab]\$10\$/); assert.equal(await row.comparePassword(password), true);
      const actual = row.get({ plain: true });
      for (const key of Object.keys(original).filter(key => !["email", "password_hash", "password"].includes(key))) assert.deepEqual(actual[key], original[key]);
      assert.equal(await Teacher.count(), 23);
      const backup = JSON.parse(await fs.readFile(options.backupPath, "utf8")); assert.deepEqual(backup.original, { email: null, password_hash: null });
      assert.doesNotMatch(JSON.stringify(backup), new RegExp(password)); assert.equal((await fs.stat(options.backupPath)).mode & 0o077, 0);
      assert.doesNotMatch(JSON.stringify(row.toJSON()), /password/);
    });
    await t.test("mismatched restore ID and concurrent credential edits are not overwritten", async () => {
      await assert.rejects(manager.restore({ ...options, teacherId: ids[1] }), /mismatch/);
      await Teacher.update({ email: "changed@fixture.invalid" }, { where: { id: teacherId }, silent: true });
      await assert.rejects(manager.restore(options), /changed since/);
      await Teacher.update({ email: "local.teacher@fixture.invalid" }, { where: { id: teacherId }, silent: true });
    });
    await t.test("restore is exact and idempotent with timestamp/name/role unchanged", async () => {
      assert.equal((await manager.restore(options)).action, "restored");
      assert.equal((await manager.restore(options)).action, "already restored");
      assert.deepEqual((await Teacher.findByPk(teacherId)).get({ plain: true }), original); assert.equal(await Teacher.count(), 23);
    });
  } finally {
    if (ids.length) await db.query("DELETE FROM teachers WHERE id = ANY($1::uuid[])", { bind: [ids] });
    await db.close();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }
});
