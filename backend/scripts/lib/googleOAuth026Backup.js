// Binary custom-format pg_dump; restore on a NEW labelled container, never source.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { Sequelize } = require("sequelize");
const assert = require("node:assert/strict");
const core = require("../../src/db/googleOAuth026");
const docker = (args, extra = {}) => execFileSync("docker", args, { windowsHide: true, maxBuffer: 256 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"], ...extra });
async function createDisposable() {
  const suffix = randomBytes(8).toString("hex");
  const name = `fitm-026-test-${suffix}`, database = `fitm_026_restore_${suffix}`;
  docker(["run", "-d", "--name", name, "--label", `fitm.026.disposable=${name}`, "-e", `POSTGRES_DB=${database}`,
    "-e", "POSTGRES_PASSWORD=synthetic-026-only", "-p", "127.0.0.1::5432", "postgres:16-alpine"]);
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try { docker(["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres", "-d", database]); ready = true; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    if (!ready) throw Error("DISPOSABLE_POSTGRES_NOT_READY");
    const info = inspectContainer(name);
    const binding = info.NetworkSettings.Ports["5432/tcp"][0];
    if (binding.HostIp !== "127.0.0.1") throw Error("DISPOSABLE_BINDING_GUARD");
    const db = new Sequelize(database, "postgres", "synthetic-026-only", { host: "127.0.0.1", port: Number(binding.HostPort), dialect: "postgres", logging: false });
    const [row] = await db.query("SELECT current_database() AS name");
    assert.equal(row[0].name, database);
    return { name, database, port: Number(binding.HostPort), db };
  } catch (error) { removeDisposable(name); throw error; }
}
function inspectContainer(name) {
  if (!/^fitm-026-test-[a-f0-9]{16}$/.test(name)) throw Error("DISPOSABLE_NAME_GUARD");
  const info = JSON.parse(docker(["inspect", name]).toString("utf8"))[0];
  if (info.Name !== `/${name}` || info.Config.Labels["fitm.026.disposable"] !== name ||
      !info.Config.Env.includes("POSTGRES_PASSWORD=synthetic-026-only") ||
      !info.Config.Env.some(v => /^POSTGRES_DB=fitm_026_restore_[a-f0-9]{16}$/.test(v))) throw Error("DISPOSABLE_OWNERSHIP_GUARD");
  return info;
}
function removeDisposable(name) { inspectContainer(name); docker(["rm", "-f", "-v", name]); }
async function closeDisposable(target) { await target.db.close(); removeDisposable(target.name); }
async function verifyRestoredSchema(db, source, restored) {
  const structural = snapshot => {
    const schema = core.existingSchema(snapshot);
    schema.constraints = schema.constraints.map(c => c.type === "c" ? { ...c, expression: null, definition: null, columns: [...c.columns].sort() } : c);
    return schema;
  };
  assert.deepEqual(structural(restored), structural(source));
  // pg_dump/restore reparses CHECK SQL: PG16 can distribute array casts or
  // flatten AND groups. Reparse the source expression on temporary LIKE tables
  // in the DISPOSABLE restore target, preserving boolean semantics exactly.
  await db.transaction(async transaction => {
    const quote = name => db.getQueryInterface().quoteIdentifier(name);
    const checks = source.constraints.filter(c => c.type === "c");
    const probes = new Map();
    for (const check of checks) {
      if (!probes.has(check.table)) {
        const probe = `fitm_026_probe_${randomBytes(8).toString("hex")}`;
        await db.query(`CREATE TEMP TABLE ${quote(probe)} (LIKE public.${quote(check.table)}) ON COMMIT DROP`, { transaction });
        probes.set(check.table, probe);
      }
      const probe = probes.get(check.table);
      await db.query(`ALTER TABLE ${quote(probe)} ADD CONSTRAINT ${quote(check.name)} CHECK (${check.expression})`, { transaction });
      const [rows] = await db.query(`SELECT pg_get_expr(conbin,conrelid) AS expression FROM pg_constraint
        WHERE conrelid=to_regclass(:probe) AND conname=:name`, { transaction, replacements: { probe, name: check.name } });
      const actual = restored.constraints.find(c => c.table === check.table && c.name === check.name);
      assert.equal(rows[0].expression, actual.expression, `RESTORED_CHECK_SEMANTICS:${check.table}.${check.name}`);
    }
  });
  return { verified: true, method: "catalog-and-server-reparsed-checks", sourceHash: core.sha256(JSON.stringify(core.existingSchema(source))),
    restoredHash: core.sha256(JSON.stringify(core.existingSchema(restored))) };
}
async function backupAndRehearse({ db, container, database, directory, user = "postgres", password, expectedHash }) {
  if (!/^[a-z][a-z0-9_]*$/.test(database) || !/^[a-z][a-z0-9_]*$/.test(user)) throw Error("BACKUP_IDENTIFIER_GUARD");
  const baseline = await core.preflight(db, { expectedHash });
  // Verify docker exec points at exactly the source inspected by Sequelize.
  const identity = JSON.parse(docker(["exec", "-e", "PGOPTIONS=-c default_transaction_read_only=on", "-e", "PGPASSWORD", container,
    "psql", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", user, "-d", database, "-c",
    "SELECT json_build_object('database',current_database(),'databaseOid',(SELECT oid::text FROM pg_database WHERE datname=current_database()),'systemIdentifier',(SELECT system_identifier::text FROM pg_control_system()),'user',current_user)"] , { env: { ...process.env, PGPASSWORD: password } }).toString("utf8").trim());
  for (const key of ["database", "databaseOid", "systemIdentifier", "user"]) assert.equal(identity[key], baseline.snapshot.target[key], "BACKUP_CONTAINER_TARGET_MISMATCH");
  fs.mkdirSync(directory, { recursive: true });
  const archivePath = path.resolve(directory, `026-${randomBytes(8).toString("hex")}.dump`);
  const bytes = docker(["exec", "-e", "PGOPTIONS=-c default_transaction_read_only=on", "-e", "PGPASSWORD", container,
    "pg_dump", "-U", user, "-d", database, "--format=custom"], { env: { ...process.env, PGPASSWORD: password } });
  fs.writeFileSync(archivePath, bytes, { flag: "wx", mode: 0o600 });
  const backup = { path: archivePath, sha256: core.sha256(bytes), bytes: bytes.length };
  const target = await createDisposable();
  try {
    docker(["exec", "-i", target.name, "pg_restore", "-U", "postgres", "-d", target.database,
      "--exit-on-error", "--single-transaction"], { input: bytes });
    const restored = await core.preflight(target.db, { expectedHash });
    assert.notEqual(restored.snapshot.target.systemIdentifier, baseline.snapshot.target.systemIdentifier, "RESTORE_MUST_USE_SEPARATE_CLUSTER");
    assert.deepEqual(restored.rows, baseline.rows);
    assert.deepEqual(restored.snapshot.ledger, baseline.snapshot.ledger);
    const schemaVerification = await verifyRestoredSchema(target.db, baseline.snapshot, restored.snapshot);
    assert.equal(restored.state, baseline.state);
    const afterDump = await core.preflight(db, { expectedHash });
    assert.deepEqual(afterDump, baseline, "SOURCE_CHANGED_DURING_BACKUP");
    const manifest = { createdAt: new Date().toISOString(), sourceHash: expectedHash, baseline, backup,
      restore: { verified: true, target: restored.snapshot.target, backupSha256: backup.sha256,
        rows: restored.rows, ledger: restored.snapshot.ledger, existingSchemaHash: restored.existingSchemaHash, schemaVerification } };
    const manifestPath = `${archivePath}.manifest.json`;
    const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2));
    fs.writeFileSync(manifestPath, manifestBytes, { flag: "wx", mode: 0o600 });
    return { manifest, manifestPath, manifestHash: core.sha256(manifestBytes) };
  } finally { await closeDisposable(target); }
}
module.exports = { docker, createDisposable, inspectContainer, removeDisposable, closeDisposable, verifyRestoredSchema, backupAndRehearse };
