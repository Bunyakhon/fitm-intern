const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { uuid } = require("../validators/roleWorkflow.validator");

class CredentialError extends Error {}
const fingerprint = values => crypto.createHash("sha256").update(JSON.stringify([values.email, values.password_hash])).digest("hex");

function createTeacherCredentialManager({ sequelize, Teacher }) {
  async function guard(options) {
    if (!["development", "test"].includes(options.environment)) throw new CredentialError("Explicit development/test environment required");
    const [rows] = await sequelize.query("SELECT current_database() AS db, current_setting('fitm.a014_disposable',true) AS disposable");
    const permitted = options.environment === "development" ? rows[0].db === "intern_system" : rows[0].db === "fitm_advisor_test" && rows[0].disposable === "on";
    if (!permitted) throw new CredentialError("Credential target is not the permitted Local/disposable database");
    uuid(options.teacherId, "TEACHER_TEST_ID");
    if (!path.isAbsolute(options.backupPath || "")) throw new CredentialError("Absolute TEACHER_TEST_BACKUP_PATH required");
    const realParent = await fs.realpath(path.dirname(options.backupPath));
    const backendRoot = path.resolve(__dirname, "../..");
    // Compose mounts backend at /app; the checkout mounts it at <repo>/backend.
    // Never treat Docker's filesystem root as the repository boundary.
    const repo = path.basename(backendRoot) === "backend" ? path.dirname(backendRoot) : backendRoot;
    const relative = path.relative(repo, realParent);
    if (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative)) throw new CredentialError("Credential backup must be outside the repository");
    return rows[0].db;
  }
  async function provision(options) {
    const database = await guard(options);
    const email = typeof options.email === "string" ? options.email.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CredentialError("Valid TEACHER_TEST_EMAIL required");
    if (typeof options.password !== "string" || options.password.length < 8 || Buffer.byteLength(options.password, "utf8") > 72) throw new CredentialError("Password must have at least 8 characters and at most 72 UTF-8 bytes");
    return sequelize.transaction(async transaction => {
      const teacher = await Teacher.findByPk(options.teacherId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!teacher || teacher.status !== "active") throw new CredentialError("Existing active Teacher required; insertion is prohibited");
      const original = { email: teacher.email, password_hash: teacher.password_hash };
      teacher.set({ email, password: options.password });
      // Use the production Teacher beforeValidate bcrypt hook exactly once.
      await teacher.validate();
      const backup = { version: 1, database, teacherId: teacher.id, original, installedFingerprint: fingerprint(teacher) };
      const handle = await fs.open(options.backupPath, "wx", 0o600);
      try { await handle.writeFile(JSON.stringify(backup)); await handle.sync(); } finally { await handle.close(); }
      try {
        await teacher.save({ fields: ["email", "password_hash"], validate: false, hooks: false, silent: true, transaction });
      } finally { teacher.setDataValue("password", undefined); }
      return { teacherId: teacher.id, action: "provisioned" };
    });
  }
  async function restore(options) {
    const database = await guard(options);
    const stat = await fs.lstat(options.backupPath);
    if (!stat.isFile() || stat.isSymbolicLink() || (process.platform !== "win32" && (stat.mode & 0o077))) throw new CredentialError("Backup must be an owner-only regular file");
    const backup = JSON.parse(await fs.readFile(options.backupPath, "utf8"));
    if (backup.version !== 1 || backup.database !== database || backup.teacherId !== options.teacherId || !backup.original || !(backup.original.email === null || typeof backup.original.email === "string") || !(backup.original.password_hash === null || typeof backup.original.password_hash === "string")) throw new CredentialError("Backup target/format mismatch");
    return sequelize.transaction(async transaction => {
      const teacher = await Teacher.findByPk(options.teacherId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!teacher) throw new CredentialError("Original Teacher no longer exists");
      if (fingerprint(teacher) === fingerprint(backup.original)) return { teacherId: teacher.id, action: "already restored" };
      if (fingerprint(teacher) !== backup.installedFingerprint) throw new CredentialError("Credentials changed since provisioning; refusing to overwrite");
      // Restore exact original values, including null, without rehashing or timestamps.
      teacher.setDataValue("email", backup.original.email);
      teacher.setDataValue("password_hash", backup.original.password_hash);
      await teacher.save({ fields: ["email", "password_hash"], validate: false, hooks: false, silent: true, transaction });
      return { teacherId: teacher.id, action: "restored" };
    });
  }
  return { provision, restore };
}

async function main() {
  require("dotenv").config({ quiet: true });
  const models = require("../models");
  try {
    const action = process.argv[2] || "provision";
    if (!["provision", "restore"].includes(action)) throw new CredentialError("Use provision or restore");
    const result = await createTeacherCredentialManager(models)[action]({ environment: process.env.NODE_ENV, teacherId: process.env.TEACHER_TEST_ID, email: process.env.TEACHER_TEST_EMAIL, password: process.env.TEACHER_TEST_PASSWORD, backupPath: process.env.TEACHER_TEST_BACKUP_PATH });
    console.log(`Teacher ${result.teacherId}: credentials ${result.action}`);
  } catch (error) {
    console.error(error instanceof CredentialError ? error.message : "Teacher credential operation failed; no secret details logged");
    process.exitCode = 1;
  } finally { await models.sequelize.close(); }
}
if (require.main === module) main();
module.exports = { createTeacherCredentialManager, CredentialError };
