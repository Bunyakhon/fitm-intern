const path = require("path");
const { Umzug, SequelizeStorage } = require("umzug");
const sequelize = require("../config/database");

const umzug = new Umzug({
  migrations: {
    glob: ["*.js", { cwd: path.join(__dirname, "migrations") }],
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: "sequelize_meta" }),
  logger: console,
});

async function printMigrations(label, migrations) {
  console.log(`${label}: ${migrations.length}`);
  migrations.forEach((migration) => console.log(`- ${migration.name}`));
}

async function main() {
  const command = process.argv[2] || "up";
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
