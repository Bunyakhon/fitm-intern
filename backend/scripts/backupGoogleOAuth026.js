// READ-ONLY source backup + independently labelled disposable restore rehearsal.
const path = require("node:path");
const { Sequelize } = require("sequelize");
const { backupAndRehearse } = require("./lib/googleOAuth026Backup");
const { flagsOff } = require("../src/db/googleOAuth026");
async function main() {
  const argv = process.argv.slice(2), options = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith("--") || !argv[i + 1] || Object.hasOwn(options, argv[i].slice(2))) throw Error("KEY_VALUE_ARGUMENTS_REQUIRED");
    options[argv[i].slice(2)] = argv[i + 1];
  }
  if (Object.keys(options).some(k => !["database", "container", "directory", "source-sha256"].includes(k)) ||
      !options.database || !options.container || !options.directory || !/^[a-f0-9]{64}$/.test(options["source-sha256"] || "")) throw Error("EXPLICIT_BACKUP_ARGUMENTS_REQUIRED");
  const workspace = path.resolve(__dirname, "../..");
  const relative = path.relative(workspace, path.resolve(options.directory));
  if (!relative.startsWith(".." + path.sep) && !path.isAbsolute(relative)) throw Error("BACKUP_DIRECTORY_MUST_BE_OUTSIDE_WORKSPACE");
  require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });
  flagsOff();
  if ((process.env.DB_NAME || "intern_system") !== options.database) throw Error("CONFIGURED_DATABASE_MISMATCH");
  const db = new Sequelize(options.database, process.env.DB_USER || "postgres", process.env.DB_PASSWORD || "postgres", {
    host: process.env.DB_HOST || "localhost", port: Number(process.env.DB_PORT || 5432), dialect: "postgres", logging: false,
    dialectOptions: { options: "-c default_transaction_read_only=on" },
  });
  try {
    const result = await backupAndRehearse({ db, container: options.container, database: options.database,
      directory: options.directory, expectedHash: options["source-sha256"], user: process.env.DB_USER || "postgres", password: process.env.DB_PASSWORD || "postgres" });
    console.log(JSON.stringify({ manifest: result.manifestPath, manifestHash: result.manifestHash,
      targetHash: require("../src/db/googleOAuth026").sha256(JSON.stringify(result.manifest.baseline.snapshot.target)),
      backup: result.manifest.backup, restore: result.manifest.restore }, null, 2));
  } finally { await db.close(); }
}
if (require.main === module) main().catch(error => { console.error("026 backup stopped:", error.message); process.exitCode = 1; });
module.exports = { main };
