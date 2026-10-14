// Explicit Phase 2B.2 operation. Default is a read-only preflight.
// Backup contains personal data: private storage OUTSIDE the repository only.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { Client } = require("pg");
const { Umzug, SequelizeStorage } = require("umzug");
const { preparedNames, preparedDirectory, withStudentProfileMigrations } = require("../src/db/studentProfileMigrationDiscovery");
const specs = require("../src/db/prepared/student-profile-phase2a/schema");
const workspace = path.resolve(__dirname, "../..");
const evidencePath = path.join(workspace, "docs/audits/FITM_STUDENT_PROFILE_PHASE2B2_RESULTS.json");
const previous = JSON.parse(fs.readFileSync(path.join(workspace, "docs/audits/FITM_STUDENT_PROFILE_PHASE2B1_POSTGRES_RESULTS.json")));
require("dotenv").config({ path: path.join(workspace, "backend/.env"), quiet: true });
const settings = {
  host: process.env.DB_HOST || "localhost", port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres", password: process.env.DB_PASSWORD || "postgres",
  connectionTimeoutMillis: 5000,
};
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const digest = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const pendingNames = ["019_add_supervision_appointments.js", "020_add_supervision_results.js", "021_add_coop_activities.js"];
const snapshotSql = {
  tables: "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename",
  columns: "SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,character_maximum_length,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,column_name",
  constraints: "SELECT c.relname AS table_name,k.conname AS name,k.contype AS type,k.convalidated AS validated,pg_get_constraintdef(k.oid) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname",
  indexes: "SELECT tablename AS table_name,indexname AS name,indexdef AS definition FROM pg_catalog.pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname",
  enums: "SELECT t.typname AS name,e.enumlabel AS value FROM pg_catalog.pg_enum e JOIN pg_catalog.pg_type t ON t.oid=e.enumtypid JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder",
  triggers: "SELECT c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid) AS definition FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname",
};

function validateTarget() {
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(settings.host), "LOCAL_DATABASE_REQUIRED");
  assert.equal(process.env.DB_NAME || "intern_system", "intern_system", "DEVELOPMENT_DATABASE_REQUIRED");
  assert.equal(settings.port, 5432, "EXPECTED_DEVELOPMENT_PORT_REQUIRED");
}
async function readSnapshot(database = "intern_system", legacyColumns) {
  assert.ok(database === "intern_system" || /^fitm_profile_2b2_restore_[a-f0-9]{32}$/.test(database));
  const client = new Client({ ...settings, database, options: "-c default_transaction_read_only=on", application_name: "fitm_profile_2b2_readonly" });
  try {
    await client.connect();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL statement_timeout='15s'");
    const identity = (await client.query("SELECT current_database() AS database,current_schema() AS schema,current_setting('server_version') AS version,current_setting('transaction_read_only') AS read_only,inet_server_addr()::text AS server_address,inet_server_port() AS port")).rows[0];
    assert.equal(identity.database, database);
    assert.equal(identity.schema, "public");
    assert.equal(identity.read_only, "on");
    assert.equal(identity.version, "16.15");
    const metadata = {};
    for (const [key, sql] of Object.entries(snapshotSql)) metadata[key] = (await client.query(sql)).rows;
    metadata.tables = metadata.tables.map(row => row.tablename);
    metadata.ledger = (await client.query("SELECT name FROM public.sequelize_meta ORDER BY name")).rows.map(row => row.name);
    const columns = legacyColumns || metadata.columns;
    const rows = {};
    // Only aggregate checksums leave PostgreSQL, never personal rows. Restrict
    // projections to BEFORE columns so additive defaults do not change the hash.
    for (const table of metadata.tables.filter(name => name !== "sequelize_meta" && columns.some(row => row.table_name === name))) {
      const projection = columns.filter(row => row.table_name === table).map(row => quote(row.column_name)).join(",");
      rows[table] = (await client.query("SELECT count(*)::text AS count,encode(sha256(convert_to(COALESCE(string_agg(row_hash,'' ORDER BY row_hash),''),'UTF8')),'hex') AS checksum FROM (SELECT encode(sha256(convert_to(to_jsonb(legacy)::text,'UTF8')),'hex') AS row_hash FROM (SELECT " + projection + " FROM public." + quote(table) + ") legacy) hashes")).rows[0];
    }
    const duplicateProfiles = (await client.query("SELECT count(*)::text AS count FROM (SELECT student_id FROM public.student_profiles GROUP BY student_id HAVING count(*)>1) duplicate_owners")).rows[0].count;
    const invalidIndexes = (await client.query("SELECT count(*)::text AS count FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND (NOT i.indisvalid OR NOT i.indisready)")).rows[0].count;
    const activeOthers = (await client.query("SELECT count(*)::text AS count FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND (state='active' OR state='idle in transaction')")).rows[0].count;
    await client.query("ROLLBACK");
    return { inspected_at: new Date().toISOString(), identity, metadata, rows, duplicateProfiles, invalidIndexes, activeOthers };
  } finally { await client.end(); }
}
function publicSnapshot(snapshot) {
  return {
    inspected_at: snapshot.inspected_at, identity: snapshot.identity,
    metadata: snapshot.metadata, metadata_sha256: digest(snapshot.metadata),
    totals: Object.fromEntries(["tables", "columns", "indexes", "constraints", "triggers", "ledger"].map(key => [key, snapshot.metadata[key].length])),
    record_counts: Object.fromEntries(Object.entries(snapshot.rows).map(([key, value]) => [key, value.count])),
    duplicate_profile_owners: snapshot.duplicateProfiles, invalid_indexes: snapshot.invalidIndexes,
  };
}
function verifyOldState(before, after, installed) {
  assert.deepEqual(after.metadata.ledger, [...before.metadata.ledger, ...installed].sort());
  assert.deepEqual(after.rows, before.rows, "LEGACY_DATA_CHANGED");
  assert.equal(after.duplicateProfiles, before.duplicateProfiles);
  assert.equal(after.invalidIndexes, "0");
  for (const key of ["columns", "constraints", "indexes", "triggers"]) {
    for (const row of before.metadata[key]) assert.ok(after.metadata[key].some(candidate => digest(candidate) === digest(row)), "LEGACY_" + key.toUpperCase() + "_CHANGED");
  }
  for (const table of before.metadata.tables) assert.ok(after.metadata.tables.includes(table));
  for (const row of before.metadata.enums) assert.ok(after.metadata.enums.some(candidate => digest(candidate) === digest(row)));
  for (const name of pendingNames) assert.equal(after.metadata.ledger.includes(name), false);
}
function verifyPreparedSchema(after) {
  const m = after.metadata;
  for (const [table, spec] of [...Object.entries(specs.extensions), ...Object.entries(specs.tables)]) {
    for (const [name, column] of Object.entries(spec.columns)) {
      const actual = m.columns.find(row => row.table_name === table && row.column_name === name);
      assert.ok(actual, "MISSING_COLUMN");
      const udt = { varchar: "varchar", char: "bpchar", numeric: "numeric", uuid: "uuid", bytea: "bytea", date: "date", timestamptz: "timestamptz", boolean: "bool", bigint: "int8", integer: "int4", smallint: "int2", text: "text" }[column.type];
      assert.equal(actual.udt_name, udt);
      assert.equal(actual.is_nullable, column.nullable ? "YES" : "NO");
      if (column.length) assert.equal(actual.character_maximum_length, column.length);
      if (column.precision) { assert.equal(actual.numeric_precision, column.precision); assert.equal(actual.numeric_scale, column.scale); }
      assert.equal(actual.column_default, column.defaultSql ? column.defaultSql === "TRUE" ? "true" : column.defaultSql : null);
    }
    for (const name of Object.keys(spec.checks)) {
      const constraintName = specs.tables[table] ? table + "_" + name + "_check" : name;
      assert.ok(m.constraints.some(row => row.table_name === table && row.name === constraintName && row.type === "c" && row.validated));
    }
    if (specs.tables[table]) {
      assert.ok(m.constraints.some(row => row.table_name === table && row.type === "p" && row.definition === "PRIMARY KEY (id)"));
      assert.ok(m.constraints.some(row => row.table_name === table && row.type === "f" && /FOREIGN KEY \(student_id\) REFERENCES students\(id\) ON UPDATE RESTRICT ON DELETE CASCADE/.test(row.definition)));
      for (const [i, fields] of (spec.indexes || []).entries()) assert.ok(m.indexes.some(row => row.table_name === table && row.name === table + "_owner_" + i && row.definition.includes("(" + fields.join(", ") + ")")));
      for (const [i, fields] of (spec.unique || []).entries()) assert.ok(m.constraints.some(row => row.table_name === table && row.name === table + "_unique_" + i && row.type === "u" && row.definition === "UNIQUE (" + fields.join(", ") + ")"));
    }
  }
  assert.deepEqual(m.enums.filter(row => row.name === "enum_student_files_file_type").map(row => row.value), [...specs.existingFileTypes, ...specs.newFileTypes]);
  assert.ok(m.constraints.some(row => row.name === "phase2a_student_file_owner_unique" && row.type === "u" && row.definition === "UNIQUE (id, student_id)"));
  assert.ok(m.constraints.some(row => row.name === "phase2a_supersedes_owner" && row.type === "f" && /FOREIGN KEY \(supersedes_file_id, student_id\) REFERENCES student_files\(id, student_id\) ON UPDATE RESTRICT ON DELETE RESTRICT/.test(row.definition)));
  assert.ok(m.indexes.some(row => row.name === "phase2a_profile_document_current" && row.definition.includes("UNIQUE INDEX") && row.definition.includes("WHERE (is_current AND")));
  assert.ok(m.indexes.some(row => row.name === "phase2a_profile_documents_owner"));
}
async function processCommand(command, args, { input, output, env = {}, privateLog } = {}) {
  return new Promise((resolve, reject) => {
    const inputFd = input ? fs.openSync(input, "r") : null;
    const outputFd = output ? fs.openSync(output, "wx") : null;
    const child = spawn(command, args, { shell: false, windowsHide: true, env: { ...process.env, ...env }, stdio: [inputFd ?? "ignore", outputFd ?? "pipe", "pipe"] });
    const stdout = [], stderr = [];
    if (!output) child.stdout.on("data", buffer => stdout.push(buffer));
    child.stderr.on("data", buffer => stderr.push(buffer));
    const close = () => {
      if (inputFd !== null) fs.closeSync(inputFd);
      if (outputFd !== null) { fs.fsyncSync(outputFd); fs.closeSync(outputFd); }
    };
    child.on("error", error => { close(); reject(Object.assign(new Error("PROCESS_START_FAILED"), { code: error.code })); });
    child.on("close", code => {
      if (child.pid === undefined) return;
      close();
      if (privateLog) fs.writeFileSync(privateLog, Buffer.concat(stderr), { flag: "wx" });
      if (code !== 0) reject(Object.assign(new Error("PROCESS_EXIT_FAILED"), { code: command.toUpperCase() + "_EXIT_" + code }));
      else resolve(Buffer.concat(stdout).toString("utf8"));
    });
  });
}
function sourceFingerprints() {
  const result = {};
  for (const [name, expected] of Object.entries(previous.tested_prepared_source_sha256)) {
    const actual = crypto.createHash("sha256").update(fs.readFileSync(path.join(workspace, name))).digest("hex");
    assert.equal(actual, expected, "PREPARED_SOURCE_CHANGED");
    result[name] = actual;
  }
  // Prohibit any target-object dependency in pending workflow migrations.
  for (const name of pendingNames) {
    const source = fs.readFileSync(path.join(workspace, "backend/src/db/migrations", name), "utf8");
    assert.doesNotMatch(source, /\b(?:student_profiles|student_files|student_addresses|student_education_records|student_training_records|student_skills|profile_data_revision)\b/);
  }
  return result;
}
async function main() {
  validateTarget();
  const fingerprints = sourceFingerprints();
  const before = await readSnapshot();
  assert.equal(digest(before.metadata), previous.development_after.metadata_sha256, "DEVELOPMENT_BASELINE_CHANGED");
  assert.equal(before.invalidIndexes, "0");
  const evidence = { phase: "2B.2", started_at: new Date().toISOString(), status: "BLOCKED", user_approved_names: preparedNames, keep_pending: pendingNames,
    source_sha256: fingerprints, before: publicSnapshot(before), steps: [], private_rows_printed: false };
  if (!process.argv.includes("--install")) {
    console.log(JSON.stringify({ status: "PASS", mode: "read-only", identity: before.identity, totals: publicSnapshot(before).totals, metadata_sha256: digest(before.metadata), record_counts: publicSnapshot(before).record_counts, source_sha256: fingerprints }));
    return;
  }
  const backupArgument = process.argv.indexOf("--backup-dir");
  assert.ok(backupArgument !== -1 && process.argv[backupArgument + 1], "PRIVATE_BACKUP_DIRECTORY_REQUIRED");
  const backupDir = fs.realpathSync(process.argv[backupArgument + 1]);
  const privateRoot = path.resolve(process.env.LOCALAPPDATA, "fitm-intern-backups");
  assert.ok(backupDir.startsWith(privateRoot + path.sep) && !backupDir.startsWith(workspace + path.sep));
  assert.equal(fs.readdirSync(backupDir).length, 0, "BACKUP_DIRECTORY_MUST_BE_NEW");
  const archive = path.join(backupDir, "intern_system.before-022-025.dump");
  const admin = new Client({ ...settings, database: "postgres", application_name: "fitm_profile_2b2_recovery_admin" });
  let backendPaused = false, adminConnected = false, restoreCreated = false, roleCreated = false, db;
  const nonce = crypto.randomBytes(16).toString("hex"), restoreName = "fitm_profile_2b2_restore_" + nonce, restoreRole = "fitm_p2b2_" + nonce;
  const marker = "fitm.student_profile.2b2.restore:" + nonce;
  let restoreOid;
  const step = (name, details = {}) => {
    evidence.steps.push({ name, status: "PASS", at: new Date().toISOString(), ...details });
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
    console.log(JSON.stringify({ name, status: "PASS", ...details }));
  };
  const cleanupRestore = async () => {
    if (restoreCreated) {
      assert.match(restoreName, /^fitm_profile_2b2_restore_[a-f0-9]{32}$/);
      assert.notEqual(restoreName, "intern_system");
      const actual = (await admin.query("SELECT oid,pg_get_userbyid(datdba) AS owner,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=$1", [restoreName])).rows[0];
      assert.ok(actual); assert.equal(actual.oid, restoreOid); assert.equal(actual.owner, restoreRole); assert.equal(actual.marker, marker);
      await admin.query("DROP DATABASE " + quote(restoreName));
      restoreCreated = false;
    }
    if (roleCreated) { assert.match(restoreRole, /^fitm_p2b2_[a-f0-9]{32}$/); await admin.query("DROP ROLE " + quote(restoreRole)); roleCreated = false; }
  };
  try {
    const acl = JSON.parse(await processCommand("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
      "$profileAcl=Get-Acl -LiteralPath $env:FITM_PROFILE_BACKUP_DIR; $profileSid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $profileBadRules=@($profileAcl.Access | Where-Object { $_.IsInherited -or $_.AccessControlType -ne 'Allow' -or $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -notin @($profileSid,'S-1-5-18') }); @{protected=$profileAcl.AreAccessRulesProtected;allowed=$profileBadRules.Count -eq 0;rules=$profileAcl.Access.Count} | ConvertTo-Json -Compress"],
    { env: { FITM_PROFILE_BACKUP_DIR: backupDir } }));
    assert.equal(acl.protected, true); assert.equal(acl.allowed, true); assert.equal(acl.rules, 2);
    const container = JSON.parse(await processCommand("docker", ["inspect", "intern_postgres"]))[0];
    assert.equal(container.Config.Image, "postgres:16-alpine");
    assert.equal(container.NetworkSettings.Networks["fitm-intern_default"].IPAddress + "/32", before.identity.server_address);
    assert.equal(container.NetworkSettings.Ports["5432/tcp"][0].HostPort, "5432");
    const backend = JSON.parse(await processCommand("docker", ["inspect", "intern_backend"]))[0];
    assert.equal(backend.State.Running, true);
    backendPaused = true;
    await processCommand("docker", ["stop", "--time", "10", "intern_backend"]);
    step("development_backend_paused_for_backup_and_install");
    const quiet = await readSnapshot();
    verifyOldState(before, quiet, []);
    assert.equal(quiet.activeOthers, "0", "ACTIVE_EXTERNAL_DATABASE_WRITERS");
    await admin.connect(); adminConnected = true;
    assert.equal((await admin.query("SELECT current_database() AS database")).rows[0].database, "postgres");
    assert.equal((await admin.query("SELECT pg_try_advisory_lock(hashtext('fitm.profile.2b2.intern_system')) AS acquired")).rows[0].acquired, true);
    const dumpVersion = (await processCommand("docker", ["exec", "intern_postgres", "pg_dump", "--version"])).trim();
    const restoreVersion = (await processCommand("docker", ["exec", "intern_postgres", "pg_restore", "--version"])).trim();
    assert.equal(dumpVersion, "pg_dump (PostgreSQL) 16.15");
    assert.equal(restoreVersion, "pg_restore (PostgreSQL) 16.15");
    const dockerEnv = ["exec", "--env", "PGPASSWORD", "intern_postgres"];
    await processCommand("docker", [...dockerEnv.slice(0, 3), "--env", "PGOPTIONS=-c default_transaction_read_only=on", ...dockerEnv.slice(3),
      "pg_dump", "--username", settings.user, "--dbname", "intern_system", "--format=custom", "--no-owner", "--no-privileges"],
    { output: archive, env: { PGPASSWORD: settings.password }, privateLog: path.join(backupDir, "pg_dump.stderr.txt") });
    assert.equal(fs.readFileSync(archive).subarray(0, 5).toString("ascii"), "PGDMP");
    const archiveSha = crypto.createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
    const listing = await processCommand("docker", [...dockerEnv.slice(0, 1), "-i", ...dockerEnv.slice(1), "pg_restore", "--list"],
      { input: archive, env: { PGPASSWORD: settings.password }, privateLog: path.join(backupDir, "pg_restore-list.stderr.txt") });
    assert.ok(listing.includes("TABLE DATA public student_profiles"));
    evidence.backup = { directory: backupDir, archive, bytes: fs.statSync(archive).size, sha256: archiveSha, pg_dump_version: dumpVersion, pg_restore_version: restoreVersion,
      acl: "Windows current-user + SYSTEM, inheritance disabled (verified before execution)", binary_stream: true, globals_and_external_uploads_included: false };
    step("pg_dump_and_archive_list_verified", { archive_bytes: evidence.backup.bytes, archive_sha256: archiveSha });
    await admin.query("CREATE ROLE " + quote(restoreRole) + " NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION");
    roleCreated = true;
    await admin.query("CREATE DATABASE " + quote(restoreName) + " OWNER " + quote(restoreRole) + " TEMPLATE template0");
    restoreCreated = true;
    await admin.query("REVOKE CONNECT ON DATABASE " + quote(restoreName) + " FROM PUBLIC");
    await admin.query("COMMENT ON DATABASE " + quote(restoreName) + " IS '" + marker + "'");
    restoreOid = (await admin.query("SELECT oid FROM pg_database WHERE datname=$1", [restoreName])).rows[0].oid;
    evidence.restore = { database: restoreName, status: "NOT TESTED" };
    // Exact random invocation-owned target, never --create/--clean/Development.
    assert.match(restoreName, /^fitm_profile_2b2_restore_[a-f0-9]{32}$/);
    await processCommand("docker", ["exec", "-i", "--env", "PGPASSWORD", "intern_postgres", "pg_restore",
      "--username", settings.user, "--dbname", restoreName, "--role", restoreRole, "--no-owner", "--no-privileges", "--exit-on-error", "--single-transaction"],
    { input: archive, env: { PGPASSWORD: settings.password }, privateLog: path.join(backupDir, "pg_restore.stderr.txt") });
    evidence.restore.command_exit_code = 0;
    const restored = await readSnapshot(restoreName);
    fs.writeFileSync(path.join(backupDir, "restored-snapshot.json"), JSON.stringify(restored, null, 2), { flag: "wx" });
    const { verifyRecovery } = require("./lib/studentProfileRestoreVerification");
    const recoveryProof = await verifyRecovery(before, restored, settings);
    assert.equal(recoveryProof.status, "PASS", "RESTORE_VERIFICATION_FAILED");
    assert.equal(recoveryProof.summary.NOT_EQUIVALENT, 0);
    assert.equal(recoveryProof.summary.UNVERIFIED, 0);
    evidence.recovery_verification = recoveryProof;
    fs.writeFileSync(path.join(workspace, "docs/audits/FITM_STUDENT_PROFILE_RESTORE_VERIFICATION.json"), JSON.stringify(recoveryProof, null, 2) + "\n");
    assert.deepEqual(restored.rows, before.rows, "RESTORE_DATA_MISMATCH");
    assert.equal(restored.duplicateProfiles, before.duplicateProfiles);
    assert.equal(restored.invalidIndexes, "0");
    evidence.restore = { database: restoreName, status: "PASS", metadata_sha256: digest(restored.metadata), all_legacy_table_counts_and_checksums_equal: true };
    // Counts/checksums are only in this private manifest, not personal row values.
    fs.writeFileSync(path.join(backupDir, "recovery-manifest.json"), JSON.stringify({ backup: evidence.backup, restore: evidence.restore, baseline: before }, null, 2), { flag: "wx" });
    step("actual_restore_schema_ledger_all_table_data_verified");
    await cleanupRestore();
    step("invocation_owned_restore_database_and_role_cleaned");
    const ready = await readSnapshot();
    verifyOldState(before, ready, []);
    assert.equal(digest(ready.metadata), digest(before.metadata));
    assert.equal(ready.activeOthers, "0");
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync(archive)).digest("hex"), archiveSha);
    assert.deepEqual(sourceFingerprints(), fingerprints);
    step("all_preflight_recovery_gates_passed", { execute_only: preparedNames });
    // Use the original project's instance, QueryInterface and SequelizeStorage.
    db = require("../src/config/database");
    db.addHook("afterConnect", async connection => {
      const actual = (await connection.query("SELECT current_database() AS database,inet_server_addr()::text AS address,current_schema() AS schema")).rows[0];
      assert.equal(actual.database, "intern_system"); assert.equal(actual.address, before.identity.server_address); assert.equal(actual.schema, "public");
    });
    await db.authenticate();
    const qi = db.getQueryInterface();
    qi.studentProfilePhase2BApproved = true;
    const runner = new Umzug({
      migrations: withStudentProfileMigrations(db, { glob: ["*.js", { cwd: path.join(workspace, "backend/src/db/migrations") }] }, { includeUninstalled: true }),
      context: qi, storage: new SequelizeStorage({ sequelize: db, tableName: "sequelize_meta" }), logger: undefined,
    });
    const completed = [];
    for (const name of preparedNames) {
      const pre = await readSnapshot("intern_system", before.metadata.columns);
      verifyOldState(before, pre, completed);
      assert.deepEqual((await runner.pending()).map(row => row.name), [...pendingNames, ...preparedNames.filter(value => !completed.includes(value))]);
      console.log(JSON.stringify({ execute: name, target: "intern_system", scope: "explicit single migration" }));
      try {
        assert.deepEqual((await runner.up({ migrations: [name] })).map(row => row.name), [name]);
        completed.push(name);
        const post = await readSnapshot("intern_system", before.metadata.columns);
        verifyOldState(before, post, completed);
        step(name, { ledger_count: post.metadata.ledger.length, old_data_unchanged: true });
      } catch (error) {
        const failedState = await readSnapshot("intern_system", before.metadata.columns);
        evidence.failed_migration = { name, code: error.cause?.original?.code || error.original?.code || error.code || "MIGRATION_OR_VERIFY_FAILED",
          catalog_matches_before_this_migration: digest(failedState.metadata) === digest(pre.metadata), ledger: failedState.metadata.ledger };
        throw error;
      }
    }
    const after = await readSnapshot("intern_system", before.metadata.columns);
    verifyOldState(before, after, preparedNames);
    verifyPreparedSchema(after);
    assert.equal(digest(after.metadata), previous.target_metadata_sha256, "TARGET_SCHEMA_DIFFERS_FROM_PHASE2B1");
    const ordinary = new Umzug({
      migrations: withStudentProfileMigrations(db, { glob: ["*.js", { cwd: path.join(workspace, "backend/src/db/migrations") }] }),
      context: db.getQueryInterface(), storage: new SequelizeStorage({ sequelize: db, tableName: "sequelize_meta" }), logger: undefined,
    });
    assert.deepEqual((await ordinary.executed()).map(row => row.name), after.metadata.ledger);
    assert.deepEqual((await ordinary.pending()).map(row => row.name), pendingNames);
    evidence.after = publicSnapshot(after);
    evidence.legacy_all_table_checksums_unchanged = true;
    evidence.future_discovery = { executed: after.metadata.ledger, pending: pendingNames, automatic_prepared_activation: false };
    evidence.status = "PASS";
    step("post_install_schema_data_and_future_discovery_verified");
  } catch (error) {
    evidence.status = evidence.steps.some(item => preparedNames.includes(item.name)) ? "FAIL" : "BLOCKED";
    evidence.failure = { code: error.cause?.original?.code || error.original?.code || error.code || "PREFLIGHT_OR_VERIFY_FAILED", reason: error instanceof assert.AssertionError ?
      ["RESTORE_SCHEMA_MISMATCH", "RESTORE_DATA_MISMATCH", "DEVELOPMENT_BASELINE_CHANGED", "LEGACY_DATA_CHANGED", "TARGET_SCHEMA_DIFFERS_FROM_PHASE2B1"].find(reason => error.message.startsWith(reason)) || "ASSERTION_FAILED" : error.message };
    // Private log can contain database diagnostics; never echo raw errors/SQL/PII.
    fs.writeFileSync(path.join(backupDir, "operation-error.txt"), error.stack || String(error), { flag: "wx" });
    process.exitCode = 1;
    console.error(JSON.stringify({ status: evidence.status, code: evidence.failure.code }));
  } finally {
    if (db) await db.close();
    if (adminConnected) {
      try { await cleanupRestore(); evidence.restore_cleanup = "PASS"; }
      catch { evidence.restore_cleanup = "BLOCKED: unexpected state or active sessions; no force/drop of other targets"; evidence.status = "BLOCKED"; process.exitCode = 1; }
      await admin.end();
    }
    if (backendPaused) {
      try { await processCommand("docker", ["start", "intern_backend"]); evidence.backend_resumed = true; }
      catch { evidence.backend_resumed = false; evidence.status = "FAIL"; process.exitCode = 1; }
    }
    evidence.finished_at = new Date().toISOString();
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
    console.log(JSON.stringify({ status: evidence.status, backend_resumed: evidence.backend_resumed, evidence: path.relative(workspace, evidencePath) }));
  }
}
if (require.main === module) main().catch(error => {
  console.error(JSON.stringify({ status: "BLOCKED", code: error.code || "PREFLIGHT_FAILED", reason: error instanceof assert.AssertionError ? "ASSERTION_FAILED" : error.message }));
  process.exitCode = 1;
});
module.exports = { validateTarget, readSnapshot, verifyOldState, verifyPreparedSchema, processCommand, settings };
