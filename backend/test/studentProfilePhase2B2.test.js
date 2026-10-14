const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Umzug } = require("umzug");
const { preparedNames, preparedDirectory, withStudentProfileMigrations } = require("../src/db/studentProfileMigrationDiscovery");
const activeDirectory = path.resolve(__dirname, "../src/db/migrations");
const activeNames = fs.readdirSync(activeDirectory).filter(name => name.endsWith(".js")).sort();
const pendingOld = activeNames.filter(name => /^(019|020|021)_/.test(name));
const baseline = activeNames.filter(name => !pendingOld.includes(name));
const specification = { glob: ["*.js", { cwd: activeDirectory }] };

function fixture(ledger = baseline) {
  const installed = new Set(ledger), sql = [];
  const allowed = new Set(preparedNames.flatMap(name => require(path.join(preparedDirectory, name)).statements));
  const context = { studentProfilePhase2BApproved: true };
  const sequelize = {
    getQueryInterface: () => context,
    getDialect: () => "postgres",
    transaction: async callback => callback({ synthetic: true }),
    query: async statement => {
      if (statement.startsWith("SELECT to_regclass")) return [{ ledger: "sequelize_meta" }];
      if (statement === "SELECT name FROM public.sequelize_meta ORDER BY name") return [...installed].sort().map(name => ({ name }));
      assert.ok(allowed.has(statement) || statement.startsWith("SET LOCAL "), "Unapproved migration SQL");
      sql.push(statement);
      return [];
    },
  };
  context.sequelize = sequelize;
  const storage = {
    executed: async () => [...installed],
    logMigration: async ({ name }) => { assert.ok(preparedNames.includes(name)); installed.add(name); },
    unlogMigration: async () => { throw new Error("LEDGER_DELETE_FORBIDDEN"); },
  };
  const runner = options => new Umzug({
    migrations: withStudentProfileMigrations(sequelize, specification, options),
    context, storage, logger: undefined,
  });
  return { installed, sql, runner };
}

test("ordinary discovery retains the original pending migrations and excludes uninstalled prepared sources", async () => {
  const f = fixture();
  assert.deepEqual((await f.runner().pending()).map(row => row.name), pendingOld);
  assert.deepEqual((await f.runner().executed()).map(row => row.name), baseline);
  assert.equal(f.sql.length, 0);
});

test("Umzug explicit names install only 022-025 in order while 019-021 remain pending", async () => {
  const f = fixture();
  const controlled = f.runner({ includeUninstalled: true });
  assert.deepEqual((await controlled.pending()).map(row => row.name), [...pendingOld, ...preparedNames]);
  for (const name of preparedNames) {
    assert.deepEqual((await controlled.up({ migrations: [name] })).map(row => row.name), [name]);
  }
  const ordinary = f.runner();
  assert.deepEqual((await ordinary.pending()).map(row => row.name), pendingOld);
  assert.deepEqual((await ordinary.executed()).map(row => row.name), [...baseline, ...preparedNames]);
  assert.deepEqual(await ordinary.up({ migrations: preparedNames, rerun: "SKIP" }), []);
  await assert.rejects(ordinary.down({ migrations: [preparedNames.at(-1)] }), /PRESERVE_DATA/);
  assert.equal(f.installed.size, baseline.length + 4);
});

test("partial installation is visible to the ordinary CLI and never auto-activates the remaining prepared files", async () => {
  const f = fixture([...baseline, preparedNames[0]]);
  const ordinary = f.runner();
  assert.deepEqual((await ordinary.pending()).map(row => row.name), pendingOld);
  assert.deepEqual((await ordinary.executed()).map(row => row.name), [...baseline, preparedNames[0]]);
  await assert.rejects(ordinary.up({ migrations: [preparedNames[1]] }), /Couldn't find migration/);
  assert.equal(f.sql.length, 0);
});
