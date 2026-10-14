// Clone installed schema ONLY; never run a migration, drop/reset a database, or copy real rows.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { Client } = require("pg");
const { readSnapshot, processCommand, settings, validateTarget } = require("./installStudentProfilePhase2B2");
const workspace = path.resolve(__dirname, "../..");
const quote = name => '"' + name.replaceAll('"', '""') + '"';
async function main() {
  validateTarget();
  const before = await readSnapshot();
  assert.equal(before.metadata.ledger.filter(name => /^(022|023|024|025)_/.test(name)).length, 4);
  assert.equal(before.metadata.ledger.some(name => /^(019|020|021)_/.test(name)), false);
  const nonce = crypto.randomBytes(16).toString("hex");
  const database = "fitm_profile_3a_" + nonce, role = "fitm_p3a_" + nonce;
  const password = crypto.randomBytes(32).toString("hex");
  const marker = "fitm.student_profile.phase3a:" + nonce + ":synthetic-only";
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fitm-profile-3a-"));
  const archive = path.join(directory, "installed-schema-only.dump");
  const admin = new Client({ ...settings, database: "postgres" });
  let roleCreated = false;
  const evidence = { status: "FAIL", database, role, marker, source_database: "intern_system", source_read_only: true, migration_executions: 0, database_drop_reset_truncate: false, real_rows_copied: false };
  try {
    await admin.connect();
    const container = JSON.parse(await processCommand("docker", ["inspect", "intern_postgres"]))[0];
    assert.equal(container.NetworkSettings.Networks["fitm-intern_default"].IPAddress + "/32", before.identity.server_address);
    await processCommand("docker", ["exec", "--env", "PGPASSWORD", "--env", "PGOPTIONS=-c default_transaction_read_only=on", "intern_postgres", "pg_dump", "--username", settings.user, "--dbname", "intern_system", "--schema-only", "--format=custom", "--no-owner", "--no-privileges"], { output: archive, env: { PGPASSWORD: settings.password }, privateLog: path.join(directory, "schema-dump.stderr.txt") });
    await admin.query("CREATE ROLE " + quote(role) + " LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '" + password + "'");
    roleCreated = true;
    await admin.query("CREATE DATABASE " + quote(database) + " OWNER " + quote(role) + " TEMPLATE template0");
    await admin.query("REVOKE CONNECT ON DATABASE " + quote(database) + " FROM PUBLIC");
    await admin.query("COMMENT ON DATABASE " + quote(database) + " IS '" + marker + "'");
    await processCommand("docker", ["exec", "-i", "--env", "PGPASSWORD", "intern_postgres", "pg_restore", "--username", settings.user, "--dbname", database, "--role", role, "--no-owner", "--no-privileges", "--exit-on-error", "--single-transaction"], { input: archive, env: { PGPASSWORD: settings.password }, privateLog: path.join(directory, "schema-restore.stderr.txt") });
    evidence.schema_clone_restore = "PASS";
    evidence.schema_archive_sha256 = crypto.createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
    const output = await processCommand(process.execPath, ["--test", "test/studentProfileAggregatePostgres.test.js"], { env: {
      FITM_PROFILE_PHASE3A_TEST: "true", FITM_PROFILE_PHASE3A_DATABASE: database, FITM_PROFILE_PHASE3A_MARKER: marker,
      DB_HOST: settings.host, DB_PORT: String(settings.port), DB_NAME: database, DB_USER: role, DB_PASSWORD: password,
      JWT_SECRET: crypto.randomBytes(32).toString("hex"), STORAGE_ROOT: path.join(directory, "private-synthetic-storage"),
      FITM_PROFILE_PHASE3A_RESULTS: path.join(directory, "postgres-test-results.json"),
    }, privateLog: path.join(directory, "tests.stderr.txt") });
    // Output contains synthetic values only. Test report itself records names/statuses.
    fs.writeFileSync(path.join(directory, "tests.stdout.txt"), output);
    evidence.tests = JSON.parse(fs.readFileSync(path.join(directory, "postgres-test-results.json")));
    assert.equal(evidence.tests.fail, 0);
    evidence.status = "PASS";
  } finally {
    const testResults = path.join(directory, "postgres-test-results.json");
    if (fs.existsSync(testResults)) evidence.tests = JSON.parse(fs.readFileSync(testResults));
    if (roleCreated) {
      assert.match(role, /^fitm_p3a_[a-f0-9]{32}$/);
      await admin.query("ALTER ROLE " + quote(role) + " NOLOGIN PASSWORD NULL");
      evidence.synthetic_database_retained = true;
      evidence.test_role_login_disabled = true;
    }
    await admin.end();
    const after = await readSnapshot();
    assert.deepEqual(after.metadata, before.metadata, "DEVELOPMENT_SCHEMA_OR_LEDGER_CHANGED");
    assert.deepEqual(after.rows, before.rows, "DEVELOPMENT_DATA_CHANGED");
    evidence.development_schema_ledger_all_32_table_data_unchanged = true;
    evidence.finished_at = new Date().toISOString();
    fs.writeFileSync(path.join(workspace, "docs/audits/FITM_STUDENT_PROFILE_PHASE3A_POSTGRES_RESULTS.json"), JSON.stringify(evidence, null, 2) + "\n");
    console.log(JSON.stringify(evidence));
  }
}
main().catch(error => { console.error(JSON.stringify({ status: "FAIL", code: error.code || "INTEGRATION_FAILED" })); process.exitCode = 1; });
