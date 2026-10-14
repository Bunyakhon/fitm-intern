const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { randomUUID } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { Sequelize } = require("sequelize");
const { Umzug, SequelizeStorage } = require("umzug");
const core = require("../src/db/googleOAuth026");
const backup = require("../scripts/lib/googleOAuth026Backup");
const { withStudentProfileMigrations, preparedNames, preparedDirectory } = require("../src/db/studentProfileMigrationDiscovery");
const readOnlyStorage = require("../src/db/readOnlyMigrationStorage");
const installer = require("../scripts/installGoogleOAuth026");
test("026 installation, atomic ledger, isolated restore and recovery", { skip: !process.env.FITM_026_TEST_PORT }, async t => {
  const { FITM_026_TEST_DATABASE: database, FITM_026_TEST_CONTAINER: container } = process.env;
  assert.match(database, /^fitm_026_restore_[a-f0-9]{16}$/);
  const info = backup.inspectContainer(container);
  assert.ok(info.Config.Env.includes(`POSTGRES_DB=${database}`));
  const port = Number(process.env.FITM_026_TEST_PORT);
  assert.equal(port, Number(info.NetworkSettings.Ports["5432/tcp"][0].HostPort));
  const db = new Sequelize(database, "postgres", "synthetic-026-only", { host: "127.0.0.1", port, dialect: "postgres", logging: false });
  const cliEnv = { ...process.env, DB_NAME: database, DB_HOST: "127.0.0.1", DB_PORT: String(port), DB_USER: "postgres", DB_PASSWORD: "synthetic-026-only", GOOGLE_LOGIN_ENABLED: "false", GOOGLE_ACCOUNT_LINKING_ENABLED: "false" };
  t.after(() => db.close());
  const expectedHash = core.sourceHash(), qi = db.getQueryInterface();
  const activeDirectory = path.resolve(__dirname, "../src/db/migrations");
  const activeNames = fs.readdirSync(activeDirectory).filter(n => n.endsWith(".js")).sort();
  const excluded = activeNames.filter(n => /^(019|020|021)_/.test(n));
  const baselineNames = activeNames.filter(n => !excluded.includes(n));
  const baselineRunner = new Umzug({ migrations: baselineNames.map(name => ({ name, ...require(path.join(activeDirectory, name)) })),
    context: qi, storage: new SequelizeStorage({ sequelize: db, tableName: "sequelize_meta" }), logger: undefined });
  // Explicit synthetic baseline list. Never includes 019-021, never calls up().
  await baselineRunner.up({ migrations: baselineNames });
  const profileQI = Object.create(qi); profileQI.studentProfilePhase2BApproved = true;
  const profileRunner = new Umzug({ migrations: preparedNames.map(name => ({ name, ...require(path.join(preparedDirectory, name)) })),
    context: profileQI, storage: new SequelizeStorage({ sequelize: db, tableName: "sequelize_meta" }), logger: undefined });
  for (const name of preparedNames) await profileRunner.up({ migrations: [name] });
  const studentId = randomUUID(), teacherId = randomUUID(), staffId = randomUUID();
  await db.query(`INSERT INTO students(id,student_id,email,password_hash,first_name,last_name,created_at,updated_at)
    VALUES(:id,'SYNTHETIC-026','synthetic026@email.kmutnb.ac.th','synthetic-existing-hash','Synthetic','Student',NOW(),NOW())`, { replacements: { id: studentId } });
  await db.query(`INSERT INTO teachers(id,email,password_hash,first_name,last_name,created_at,updated_at)
    VALUES(:id,'synthetic026@kmutnb.ac.th','synthetic-teacher-hash','Synthetic','Teacher',NOW(),NOW())`, { replacements: { id: teacherId } });
  await db.query(`INSERT INTO department_staffs(id,email,password_hash,first_name,last_name,created_at,updated_at)
    VALUES(:id,'staff026@kmutnb.ac.th','synthetic-staff-hash','Synthetic','Staff',NOW(),NOW())`, { replacements: { id: staffId } });
  await db.query("INSERT INTO student_profiles(id,student_id,created_at,updated_at) VALUES(:id,:student,NOW(),NOW())", { replacements: { id: randomUUID(), student: studentId } });
  const baseline = await core.preflight(db, { expectedHash });
  const options = { expectedHash, expectedTarget: baseline.snapshot.target, baseline };
  const evidence = { at: new Date().toISOString(), sourceHash: expectedHash, before: baseline, tests: [] };
  async function check(name, callback) {
    let succeeded = false;
    await t.test(name, async () => { await callback(); evidence.tests.push({ name, result: "PASS" }); succeeded = true; });
    if (!succeeded) throw Error(`STOPPED_AFTER_FAILED_SUBTEST:${name}`);
  }
  const ordinary = () => new Umzug({ migrations: withStudentProfileMigrations(db, { glob: ["*.js", { cwd: activeDirectory }] }), context: qi, storage: readOnlyStorage(db), logger: undefined });
  await check("uninstalled discovery excludes 026 and keeps 019-021 pending", async () => {
    assert.equal(baseline.state, "UNINSTALLED");
    assert.deepEqual((await ordinary().pending()).map(m => m.name), excluded);
    assert.deepEqual(baseline.snapshot.ledger, [...baselineNames, ...preparedNames].sort());
  });
  await check("source, flags, target, dependency and ownership guards stop before mutation", async () => {
    await assert.rejects(core.preflight(db, { expectedHash: "0".repeat(64) }), /SOURCE_HASH/);
    await assert.rejects(core.install(db, { ...options, env: { GOOGLE_LOGIN_ENABLED: "true" } }), /MUST_BE_OFF/);
    await assert.rejects(core.install(db, { ...options, expectedTarget: { ...options.expectedTarget, database: "wrong_disposable_target" } }), /TARGET_CHANGED/);
    await assert.rejects(core.install(db, { ...options, expectedTarget: { ...options.expectedTarget, database: "intern_system" } }), /DEVELOPMENT_APPROVAL/);
    await db.transaction(async transaction => {
      await db.query("DELETE FROM sequelize_meta WHERE name=:name", { replacements: { name: core.DEPENDENCIES[0] }, transaction });
      const missing = await core.inspect(db, transaction);
      assert.throws(() => core.state(missing), /MISSING_DEPENDENCY/);
      throw Object.assign(Error("ROLLBACK_SYNTHETIC_FIXTURE"), { fixture: true });
    }).catch(e => { if (!e.fixture) throw e; });
    assert.throws(() => core.state({ ...baseline.snapshot, tables: baseline.snapshot.tables.map(t => t.name === "students" ? { ...t, owner: "wrong-owner" } : t) }), /OWNER/);
    assert.deepEqual(await core.preflight(db, { expectedHash }), baseline);
  });
  let rehearsal;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fitm-026-synthetic-"));
  await check("custom-format backup restored on separate disposable cluster with exact rows, schema and ledger", async () => {
    const result = spawnSync(process.execPath, ["scripts/backupGoogleOAuth026.js", "--database", database, "--container", container,
      "--directory", directory, "--source-sha256", expectedHash], { cwd: path.resolve(__dirname, ".."), windowsHide: true, encoding: "utf8", env: cliEnv });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    rehearsal = { manifestPath: output.manifest, manifestHash: output.manifestHash, manifest: JSON.parse(fs.readFileSync(output.manifest, "utf8")) };
    installer.validateManifest({ manifest: rehearsal.manifestPath, "manifest-sha256": rehearsal.manifestHash, "source-sha256": expectedHash, database }, baseline);
    evidence.backup = rehearsal.manifest;
  });
  await check("DDL success plus ledger failure rolls back BOTH tables and ledger", async () => {
    await assert.rejects(core.install(db, { ...options, beforeLedger: async ({ db, transaction }) => {
      const during = await core.inspect(db, transaction); core.validateSchema(during);
      assert.ok(!during.ledger.includes(core.NAME));
      throw Error("INJECTED_LEDGER_FAILURE_AFTER_DDL");
    } }), /INJECTED_LEDGER_FAILURE/);
    assert.deepEqual(await core.preflight(db, { expectedHash }), baseline);
  });
  await check("DDL failure after first table leaves no partial schema or ledger", async () => {
    const original = db.query.bind(db);
    db.query = async (sql, args) => {
      if (typeof sql === "string" && sql.startsWith('CREATE TABLE') && sql.includes('"google_auth_requests"')) throw Error("INJECTED_DDL_FAILURE");
      return original(sql, args);
    };
    try { await assert.rejects(core.install(db, options), /INJECTED_DDL_FAILURE/); } finally { db.query = original; }
    assert.deepEqual(await core.preflight(db, { expectedHash }), baseline);
  });
  await check("real ledger INSERT unique violation rolls back DDL and uncommitted ledger row", async () => {
    await assert.rejects(core.install(db, { ...options, beforeLedger: async ({ db, transaction }) => {
      await db.query("INSERT INTO public.sequelize_meta(name) VALUES(:name)", { replacements: { name: core.NAME }, transaction });
    } }), error => error.original?.code === "23505");
    assert.deepEqual(await core.preflight(db, { expectedHash }), baseline);
  });
  await check("production CLI installs exactly 026 through Umzug and verifies all existing rows", async () => {
    const targetHash = core.sha256(JSON.stringify(baseline.snapshot.target));
    const result = spawnSync(process.execPath, ["scripts/installGoogleOAuth026.js", "install", "--database", database, "--source-sha256", expectedHash,
      "--target-sha256", targetHash, "--manifest", rehearsal.manifestPath, "--manifest-sha256", rehearsal.manifestHash, "--approval", `migrate026:${targetHash}`], {
      cwd: path.resolve(__dirname, ".."), windowsHide: true, encoding: "utf8",
      env: cliEnv,
    });
    assert.equal(result.status, 0, result.stderr);
    const after = JSON.parse(result.stdout);
    assert.equal(after.state, "INSTALLED");
    assert.deepEqual(after.snapshot.ledger, [...baseline.snapshot.ledger, core.NAME].sort());
    assert.deepEqual(after.rows, baseline.rows);
    evidence.after = after;
  });
  await check("ordinary read-only status includes executed 026; pending order unchanged; down refuses", async () => {
    assert.ok((await ordinary().executed()).some(m => m.name === core.NAME));
    assert.deepEqual((await ordinary().pending()).map(m => m.name), excluded);
    await assert.rejects(ordinary().down(), /approved backup/);
    const status = spawnSync(process.execPath, ["src/db/migrate.js", "status"], { cwd: path.resolve(__dirname, ".."), windowsHide: true, encoding: "utf8", env: cliEnv });
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /Executed migrations: 24/);
    assert.match(status.stdout, /026_google_identity_mapping\.js/);
    assert.deepEqual(status.stdout.split("Pending migrations: 3")[1].trim().split(/\r?\n/).map(line => line.slice(2)), excluded);
    evidence.status = status.stdout;
  });
  await check("concurrent fresh installers commit exactly once and add no ledger duplicates", async () => {
    await db.query("DROP TABLE google_auth_requests,google_identities");
    await db.query("DELETE FROM sequelize_meta WHERE name=:name", { replacements: { name: core.NAME } });
    const results = await Promise.all([core.install(db, options), core.install(db, options)]);
    assert.deepEqual(results.map(r => r.state).sort(), ["ALREADY_INSTALLED", "INSTALLED"]);
    assert.equal((await core.inspect(db)).ledger.filter(n => n === core.NAME).length, 1);
  });
  await check("all actor FKs, CHECKs and unique mappings reject invalid rows", async () => {
    const insert = (subject, type, student = null, teacher = null, staff = null, transaction) => db.query(`INSERT INTO google_identities(id,subject,actor_type,student_id,teacher_id,staff_id,created_at,updated_at)
      VALUES(:id,:subject,:type,:student,:teacher,:staff,NOW(),NOW())`, { replacements: { id: randomUUID(), subject, type, student, teacher, staff }, transaction });
    const fails = (promise, code) => assert.rejects(promise, error => error.original?.code === code);
    await insert("student-sub", "student", studentId);
    await insert("teacher-sub", "teacher", null, teacherId);
    await insert("staff-sub", "department_staff", null, null, staffId);
    await fails(insert("other-sub", "student", studentId), "23505");
    await fails(insert("other-teacher-sub", "teacher", null, teacherId), "23505");
    await fails(insert("other-staff-sub", "department_staff", null, null, staffId), "23505");
    const duplicate = await db.transaction();
    try {
      const otherStudent = randomUUID();
      await db.query(`INSERT INTO students(id,student_id,email,password_hash,first_name,last_name,created_at,updated_at)
        VALUES(:id,'SYNTHETIC-026-DUPLICATE','duplicate026@email.kmutnb.ac.th','synthetic-hash','Synthetic','Other',NOW(),NOW())`, { replacements: { id: otherStudent }, transaction: duplicate });
      await fails(insert("student-sub", "student", otherStudent, null, null, duplicate), "23505");
    } finally { await duplicate.rollback(); }
    for (const [type, ids] of [["student", [randomUUID(), null, null]], ["teacher", [null, randomUUID(), null]], ["department_staff", [null, null, randomUUID()]]])
      await fails(insert("bad-fk", type, ...ids), "23503");
    await fails(insert("bad-actor", "student", null, teacherId), "23514");
    await fails(insert("", "teacher", null, teacherId), "23514");
    await fails(insert("cross-table", "student", studentId, teacherId), "23514");
    const cascade = await db.transaction();
    try {
      for (const [table, id] of [["students", studentId], ["teachers", teacherId], ["department_staffs", staffId]])
        await db.query(`DELETE FROM public.${table} WHERE id=:id`, { replacements: { id }, transaction: cascade });
      const [remaining] = await db.query("SELECT count(*)::int AS count FROM google_identities", { transaction: cascade });
      assert.equal(remaining[0].count, 0);
    } finally { await cascade.rollback(); }
    // Undo fixture identities ONLY on this labelled disposable target.
    await db.query("DELETE FROM google_identities");
  });
  await check("legacy orphan schema refuses normal install; explicit recovery records only 026", async () => {
    await db.query("DELETE FROM sequelize_meta WHERE name=:name", { replacements: { name: core.NAME } });
    const orphan = await core.preflight(db, { expectedHash });
    assert.equal(orphan.state, "ORPHAN_SCHEMA");
    await assert.rejects(core.install(db, options), /ACTION_SCHEMA_STATE_MISMATCH/);
    const recoveryBackup = await backup.backupAndRehearse({ db, container, database, directory, expectedHash, password: "synthetic-026-only" });
    const targetHash = core.sha256(JSON.stringify(orphan.snapshot.target));
    const executed = spawnSync(process.execPath, ["scripts/installGoogleOAuth026.js", "recover-ledger", "--database", database, "--source-sha256", expectedHash,
      "--target-sha256", targetHash, "--manifest", recoveryBackup.manifestPath, "--manifest-sha256", recoveryBackup.manifestHash, "--approval", `migrate026:${targetHash}`], {
      cwd: path.resolve(__dirname, ".."), windowsHide: true, encoding: "utf8", env: cliEnv });
    assert.equal(executed.status, 0, executed.stderr);
    const result = JSON.parse(executed.stdout);
    assert.equal(result.state, "LEDGER_RECOVERED");
    assert.deepEqual(result.rows, baseline.rows);
    evidence.recovery = { state: result.state, ledger: result.snapshot.ledger, rows: result.rows };
  });
  await check("partial schema, schema drift, wrong ownership and populated orphan fail closed", async () => {
    const installed = await core.inspect(db);
    assert.throws(() => core.state({ ...installed, tables: installed.tables.filter(t => t.name !== "google_auth_requests") }), /PARTIAL/);
    // Real catalog drift and wrong owner, rolled back on this disposable target.
    const transaction = await db.transaction();
    try {
      await db.query("ALTER TABLE google_auth_requests ADD COLUMN unexpected text", { transaction });
      const drift = await core.inspect(db, transaction);
      assert.throws(() => core.state(drift), /SCHEMA_COLUMNS/);
      await db.query("ALTER TABLE google_auth_requests DROP COLUMN unexpected", { transaction });
      await db.query("CREATE ROLE fitm_026_wrong_owner", { transaction });
      await db.query("ALTER TABLE google_identities OWNER TO fitm_026_wrong_owner", { transaction });
      const wrongOwner = await core.inspect(db, transaction);
      assert.throws(() => core.state(wrongOwner), /OWNER/);
    }
    finally { await transaction.rollback(); }
    const altered = structuredClone(installed);
    altered.columns.find(c => c.table === "google_auth_requests" && c.name === "role").type = "text";
    assert.throws(() => core.state(altered), /SCHEMA_COLUMNS/);
    const wrongOwner = structuredClone(installed);
    wrongOwner.tables.find(t => t.name === "google_identities").owner = "someone_else";
    assert.throws(() => core.state(wrongOwner), /OWNER/);
    await db.query("DELETE FROM sequelize_meta WHERE name=:name", { replacements: { name: core.NAME } });
    await db.query("INSERT INTO google_auth_requests(id,secret_hash,nonce_hash,role,purpose,expires_at) VALUES(:id,'s','n','student','login',NOW())", { replacements: { id: randomUUID() } });
    await assert.rejects(core.install(db, { ...options, action: "recover-ledger" }), /POPULATED_ORPHAN/);
    await db.query("DELETE FROM google_auth_requests");
    await core.install(db, { ...options, action: "recover-ledger" });
  });
  await check("existing Student, Teacher, Staff, Profile rows and 019-021 remain unchanged", async () => {
    const after = await core.preflight(db, { expectedHash });
    assert.deepEqual(after.rows, baseline.rows);
    assert.deepEqual(core.existingSchema(after.snapshot), core.existingSchema(baseline.snapshot));
    assert.ok(!after.snapshot.ledger.some(n => excluded.includes(n)));
    assert.ok(!after.snapshot.tables.some(t => ["supervision_appointments", "supervision_results", "coop_activities"].includes(t.name)));
    evidence.final = after;
  });
  fs.mkdirSync(path.resolve(__dirname, "../../docs/audits/evidence/google-oauth-026"), { recursive: true });
  fs.writeFileSync(path.resolve(__dirname, "../../docs/audits/evidence/google-oauth-026/postgres.json"), JSON.stringify(evidence, null, 2));
});
