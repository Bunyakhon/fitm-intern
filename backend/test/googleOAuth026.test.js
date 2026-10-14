const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Umzug } = require("umzug");
const core = require("../src/db/googleOAuth026");
const { parse, validateManifest } = require("../scripts/installGoogleOAuth026");
const storage = require("../src/db/readOnlyMigrationStorage");
const { withStudentProfileMigrations, preparedNames } = require("../src/db/studentProfileMigrationDiscovery");
test("026 CLI rejects migrate-all, extra/duplicate arguments and missing pins", () => {
  for (const argv of [[], ["up"], ["install", "--database", "intern_system"],
    ["preflight", "--database", "intern_system", "--source-sha256", core.sourceHash(), "--to", "026"],
    ["preflight", "--database", "intern_system", "--database", "other", "--source-sha256", core.sourceHash()]]) assert.throws(() => parse(argv));
  assert.equal(parse(["preflight", "--database", "intern_system", "--source-sha256", core.sourceHash()]).command, "preflight");
});
test("status storage never syncs or creates a missing ledger and cannot write", async () => {
  const statements = [];
  const readonly = storage({ query: async sql => { statements.push(sql); return [{ ledger: null }]; } });
  assert.deepEqual(await readonly.executed(), []);
  assert.equal(statements.length, 1); assert.ok(statements.every(sql => sql.startsWith("SELECT")));
  await assert.rejects(readonly.logMigration({ name: core.NAME }), /READ_ONLY/);
  await assert.rejects(readonly.unlogMigration({ name: core.NAME }), /READ_ONLY/);
});
test("026 cannot enter Profile controlled pending list; installed 026 appears in ordinary executed", async () => {
  const ledger = new Set();
  const db = { getQueryInterface: () => ({}), query: async sql => sql.startsWith("SELECT to_regclass") ? [{ ledger: "sequelize_meta" }] : [...ledger].map(name => ({ name })) };
  const active = ["019_add_supervision_appointments.js", "020_add_supervision_results.js", "021_add_coop_activities.js"].map(name => ({ name, up: async () => { throw Error("OTHER_MIGRATION_FORBIDDEN"); } }));
  const runner = options => new Umzug({ migrations: withStudentProfileMigrations(db, active, options), context: {},
    storage: { executed: async () => [...ledger], logMigration: async () => { throw Error("NO_WRITES"); }, unlogMigration: async () => { throw Error("NO_WRITES"); } }, logger: undefined });
  assert.deepEqual((await runner({ includeUninstalled: true }).pending()).map(m => m.name), [...active.map(m => m.name), ...preparedNames]);
  await assert.rejects(runner().up({ migrations: [core.NAME] }), /Couldn't find migration/);
  ledger.add(core.NAME);
  assert.deepEqual((await runner().executed()).map(m => m.name), [core.NAME]);
  assert.deepEqual((await runner().pending()).map(m => m.name), active.map(m => m.name));
});
test("backup gate rejects edited files, stale evidence, wrong target and unverified restore", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fitm-026-unit-"));
  const archive = path.join(directory, "synthetic.dump"), manifestPath = path.join(directory, "manifest.json");
  fs.writeFileSync(archive, "synthetic-backup-only");
  t.after(() => { fs.unlinkSync(archive); fs.unlinkSync(manifestPath); fs.rmdirSync(directory); });
  const baseline = { snapshot: { target: { database: "fitm_026_test", systemIdentifier: "source" }, ledger: core.DEPENDENCIES }, rows: { students: { count: "1", digest: "example" } }, existingSchemaHash: "source-schema" };
  const valid = { createdAt: new Date().toISOString(), sourceHash: core.sourceHash(), baseline,
    backup: { path: archive, sha256: core.sha256(fs.readFileSync(archive)) },
    restore: { verified: true, target: { database: "fitm_026_restore_aaaaaaaaaaaaaaaa", systemIdentifier: "restore" },
      backupSha256: core.sha256(fs.readFileSync(archive)), rows: baseline.rows, ledger: baseline.snapshot.ledger, existingSchemaHash: "restore-schema",
      schemaVerification: { verified: true, method: "catalog-and-server-reparsed-checks", sourceHash: "source-schema", restoredHash: "restore-schema" } } };
  const options = manifest => {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    return { manifest: manifestPath, "manifest-sha256": core.sha256(fs.readFileSync(manifestPath)), "source-sha256": core.sourceHash(), database: "fitm_026_test" };
  };
  assert.ok(validateManifest(options(valid), baseline));
  for (const mutate of [m => { m.restore.verified = false; }, m => { m.restore.target.systemIdentifier = "source"; },
    m => { m.createdAt = "2000-01-01"; }, m => { m.backup.sha256 = "0".repeat(64); }, m => { m.baseline.snapshot.target.database = "intern_system"; },
    m => { m.restore.rows = {}; }, m => { m.restore.schemaVerification.sourceHash = "wrong"; }]) {
    const bad = structuredClone(valid); mutate(bad); assert.throws(() => validateManifest(options(bad), baseline));
  }
  const pinned = options(valid); fs.appendFileSync(manifestPath, " ");
  assert.throws(() => validateManifest(pinned, baseline), /MANIFEST_HASH/);
});
