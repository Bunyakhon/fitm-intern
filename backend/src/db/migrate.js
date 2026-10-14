const path = require("path");
const { Umzug, SequelizeStorage } = require("umzug");
const sequelize = require("../config/database");
const { withStudentProfileMigrations } = require("./studentProfileMigrationDiscovery");

function createRunner(command) { return new Umzug({
  migrations: withStudentProfileMigrations(sequelize, {
    glob: ["*.js", { cwd: path.join(__dirname, "migrations") }],
  }),
  context: sequelize.getQueryInterface(),
  storage: command === "status" ? require("./readOnlyMigrationStorage")(sequelize) : new SequelizeStorage({ sequelize, tableName: "sequelize_meta" }),
  logger: console,
}); }

async function printMigrations(label, migrations) {
  console.log(`${label}: ${migrations.length}`);
  migrations.forEach((migration) => console.log(`- ${migration.name}`));
}

async function main() {
  const command = process.argv[2] || "up";
  if (!["up", "down", "status"].includes(command) || process.argv.length > 3)
    throw new Error("Usage: node src/db/migrate.js [up|down|status]; use installGoogleOAuth026.js for 026");
  if (command === "status") sequelize.addHook("afterConnect", connection => connection.query("SET default_transaction_read_only=on"));
  const umzug = createRunner(command);
  await sequelize.authenticate();

  if (command === "up") {
    await umzug.up();
    return printMigrations("Executed migrations", await umzug.executed());
  }
  if (command === "down") {
    await umzug.down();
    return printMigrations("Executed migrations", await umzug.executed());
  }
  if (command === "status") {
    await printMigrations("Executed migrations", await umzug.executed());
    return printMigrations("Pending migrations", await umzug.pending());
  }
  throw new Error("Usage: node src/db/migrate.js [up|down|status]");
}

main()
  .catch((error) => {
    console.error("Migration command failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
