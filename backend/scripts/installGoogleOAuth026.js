// Default mode is read-only. No migrate-all, sync, automatic rollback, or flag changes.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { Sequelize } = require("sequelize");
const core = require("../src/db/googleOAuth026");
const workspace = path.resolve(__dirname, "../..");
function parse(argv) {
  const out = { command: argv[0] || "preflight" };
  for (let i = 1; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--") || !argv[i + 1] || argv[i + 1].startsWith("--")) throw Error("KEY_VALUE_ARGUMENTS_REQUIRED");
    const key = argv[i].slice(2);
    if (Object.hasOwn(out, key)) throw Error("DUPLICATE_ARGUMENT");
    out[key] = argv[i + 1];
  }
  const allowed = ["command", "database", "source-sha256", "target-sha256", "manifest", "manifest-sha256", "approval", "out"];
  if (Object.keys(out).some(k => !allowed.includes(k)) || !["preflight", "install", "recover-ledger"].includes(out.command)) throw Error("UNSUPPORTED_COMMAND_OR_ARGUMENT");
  if (!out.database || !/^[a-z][a-z0-9_]*$/.test(out.database) || !/^[a-f0-9]{64}$/.test(out["source-sha256"] || "")) throw Error("EXPLICIT_DATABASE_AND_SOURCE_HASH_REQUIRED");
  return out;
}
function validateManifest(options, current) {
  const bytes = fs.readFileSync(options.manifest);
  if (core.sha256(bytes) !== options["manifest-sha256"]) throw Error("MANIFEST_HASH_MISMATCH");
  const manifest = JSON.parse(bytes.toString("utf8"));
  assert.equal(manifest.sourceHash, options["source-sha256"], "BACKUP_SOURCE_HASH_MISMATCH");
  assert.deepEqual(manifest.baseline.snapshot.target, current.snapshot.target, "BACKUP_TARGET_MISMATCH");
  assert.deepEqual(manifest.baseline.snapshot.ledger, current.snapshot.ledger, "BACKUP_LEDGER_MISMATCH");
  assert.deepEqual(manifest.baseline.rows, current.rows, "BACKUP_DATA_MISMATCH");
  assert.equal(manifest.baseline.existingSchemaHash, current.existingSchemaHash, "BACKUP_SCHEMA_MISMATCH");
  assert.equal(core.sha256(fs.readFileSync(manifest.backup.path)), manifest.backup.sha256, "BACKUP_FILE_HASH_MISMATCH");
  if (options.database === "intern_system") {
    const relative = path.relative(workspace, path.resolve(manifest.backup.path));
    if (!relative.startsWith(".." + path.sep) && !path.isAbsolute(relative)) throw Error("PRODUCTION_BACKUP_MUST_BE_OUTSIDE_WORKSPACE");
  }
  if (!manifest.restore?.verified || manifest.restore.backupSha256 !== manifest.backup.sha256 ||
      manifest.restore.target.systemIdentifier === current.snapshot.target.systemIdentifier ||
      manifest.restore.target.database === "intern_system" || !/^fitm_026_restore_[a-f0-9]{16}$/.test(manifest.restore.target.database)) throw Error("ISOLATED_RESTORE_EVIDENCE_REQUIRED");
  assert.deepEqual(manifest.restore.rows, manifest.baseline.rows, "RESTORED_ROWS_MISMATCH");
  assert.deepEqual(manifest.restore.ledger, manifest.baseline.snapshot.ledger, "RESTORED_LEDGER_MISMATCH");
  assert.equal(manifest.restore.schemaVerification?.verified, true, "RESTORED_SCHEMA_VERIFICATION_REQUIRED");
  assert.equal(manifest.restore.schemaVerification.method, "catalog-and-server-reparsed-checks", "RESTORED_SCHEMA_METHOD_REQUIRED");
  assert.equal(manifest.restore.schemaVerification.sourceHash, manifest.baseline.existingSchemaHash, "RESTORED_SCHEMA_SOURCE_MISMATCH");
  assert.equal(manifest.restore.schemaVerification.restoredHash, manifest.restore.existingSchemaHash, "RESTORED_SCHEMA_HASH_MISMATCH");
  const age = Date.now() - Date.parse(manifest.createdAt);
  if (!(age >= 0 && age < 24 * 60 * 60 * 1000)) throw Error("BACKUP_TOO_OLD");
  return manifest;
}
async function main(argv = process.argv.slice(2)) {
  const options = parse(argv);
  require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });
  core.flagsOff();
  if ((process.env.DB_NAME || "intern_system") !== options.database) throw Error("CONFIGURED_DATABASE_MISMATCH");
  const db = new Sequelize(options.database, process.env.DB_USER || "postgres", process.env.DB_PASSWORD || "postgres", {
    host: process.env.DB_HOST || "localhost", port: Number(process.env.DB_PORT || 5432), dialect: "postgres", logging: false,
    // Every preflight connection is read-only; mutation mode still performs its
    // own explicitly read-only preflight before the approved transaction.
    dialectOptions: options.command === "preflight" ? { options: "-c default_transaction_read_only=on" } : {},
  });
  try {
    const current = await core.preflight(db, { expectedHash: options["source-sha256"] });
    const targetHash = core.sha256(JSON.stringify(current.snapshot.target));
    if (options.command === "preflight") {
      const output = { ...current, targetHash };
      if (options.out) fs.writeFileSync(options.out, JSON.stringify(output, null, 2), { flag: "wx" });
      console.log(JSON.stringify(output, null, 2)); return output;
    }
    if (options["target-sha256"] !== targetHash || options.approval !== `migrate026:${targetHash}`) throw Error("EXPLICIT_TARGET_APPROVAL_REQUIRED");
    const manifest = validateManifest(options, current);
    const result = await core.install(db, { expectedHash: options["source-sha256"], expectedTarget: current.snapshot.target, baseline: manifest.baseline, action: options.command, approval: options.approval });
    console.log(JSON.stringify(result, null, 2)); return result;
  } finally { await db.close(); }
}
if (require.main === module) main().catch(error => { console.error("026 installer stopped:", error.message); process.exitCode = 1; });
module.exports = { parse, validateManifest, main };
