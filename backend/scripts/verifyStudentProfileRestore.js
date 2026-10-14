// Investigation only: restores a protected archive into an invocation-owned DB.
// Never installs migrations or writes to Development.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { Client } = require("pg");
const support = require("./installStudentProfilePhase2B2");
const quote = value => '"' + value.replaceAll('"', '""') + '"';
async function main() {
  support.validateTarget();
  const previous = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../docs/audits/FITM_STUDENT_PROFILE_PHASE2B2_RESULTS.json")));
  const backupDir = fs.realpathSync(previous.backup.directory);
  assert.ok(backupDir.startsWith(path.join(process.env.LOCALAPPDATA, "fitm-intern-backups") + path.sep));
  const archive = path.join(backupDir, "intern_system.before-022-025.dump");
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(archive)).digest("hex"), previous.backup.sha256);
  const nonce = crypto.randomBytes(16).toString("hex");
  const database = "fitm_profile_2b2_restore_" + nonce, role = "fitm_p2b2_" + nonce, marker = "fitm.restore.investigation:" + nonce;
  const admin = new Client({ ...support.settings, database: "postgres" });
  let dbCreated = false, roleCreated = false, oid;
  try {
    const before = await support.readSnapshot();
    await admin.connect();
    assert.equal((await admin.query("SELECT current_database() AS name")).rows[0].name, "postgres");
    await admin.query("CREATE ROLE " + quote(role) + " NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION"); roleCreated = true;
    await admin.query("CREATE DATABASE " + quote(database) + " OWNER " + quote(role) + " TEMPLATE template0"); dbCreated = true;
    await admin.query("REVOKE CONNECT ON DATABASE " + quote(database) + " FROM PUBLIC");
    await admin.query("COMMENT ON DATABASE " + quote(database) + " IS '" + marker + "'");
    oid = (await admin.query("SELECT oid FROM pg_database WHERE datname=$1", [database])).rows[0].oid;
    await support.processCommand("docker", ["exec", "-i", "--env", "PGPASSWORD", "intern_postgres", "pg_restore",
      "--username", support.settings.user, "--dbname", database, "--role", role, "--no-owner", "--no-privileges", "--exit-on-error", "--single-transaction"],
    { input: archive, env: { PGPASSWORD: support.settings.password }, privateLog: path.join(backupDir, nonce + ".restore.stderr.txt") });
    const restored = await support.readSnapshot(database);
    fs.writeFileSync(path.join(backupDir, nonce + ".snapshots.json"), JSON.stringify({ before, restored }, null, 2), { flag: "wx" });
    const changed = [];
    for (const original of before.metadata.constraints) {
      const target = restored.metadata.constraints.find(row => row.table_name === original.table_name && row.name === original.name);
      if (JSON.stringify(original) !== JSON.stringify(target)) changed.push({ original, restored: target });
    }
    assert.deepEqual(restored.rows, before.rows, "RESTORED_DATA_MISMATCH");
    if (process.argv.includes("--prove")) {
      const { verifyRecovery } = require("./lib/studentProfileRestoreVerification");
      const proof = await verifyRecovery(before, restored, support.settings);
      fs.writeFileSync(path.resolve(__dirname, "../../docs/audits/FITM_STUDENT_PROFILE_RESTORE_VERIFICATION.json"), JSON.stringify(proof, null, 2) + "\n");
      console.log(JSON.stringify({ status: proof.status, classified: proof.summary, object_checks: proof.object_checks }));
    } else console.log(JSON.stringify({ backup_unchanged: true, restored_data_equal: true, changed, database, private_snapshots: path.join(backupDir, nonce + ".snapshots.json") }, null, 2));
    const after = await support.readSnapshot();
    assert.deepEqual(after.metadata, before.metadata);
    assert.deepEqual(after.rows, before.rows);
  } catch (error) {
    fs.writeFileSync(path.join(backupDir, nonce + ".verification-error.txt"), error.stack || String(error), { flag: "wx" });
    console.error(JSON.stringify({ error: error.name, reason: error.message.split("\n")[0] }));
    throw error;
  } finally {
    if (dbCreated) {
      const actual = (await admin.query("SELECT oid,pg_get_userbyid(datdba) AS owner,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=$1", [database])).rows[0];
      assert.equal(actual.oid, oid); assert.equal(actual.owner, role); assert.equal(actual.marker, marker);
      assert.match(database, /^fitm_profile_2b2_restore_[a-f0-9]{32}$/);
      await admin.query("DROP DATABASE " + quote(database));
    }
    if (roleCreated) await admin.query("DROP ROLE " + quote(role));
    await admin.end();
  }
}
if (require.main === module) main().catch(error => { console.error(error.code || "RESTORE_INVESTIGATION_BLOCKED"); process.exitCode = 1; });
