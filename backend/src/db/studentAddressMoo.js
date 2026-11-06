// Explicit additive migration, never imported by application startup.
// Run from backend: node src/db/studentAddressMoo.js --database <DB_NAME>
// DB_NAME/connection credentials come from the existing environment/.env.
// The explicit database argument must match the connected database. No reset,
// backfill, sync, schema runner/ledger or destructive down operation is used.
const { QueryTypes } = require("sequelize");
const { schemaSnapshot, digest } = require("./studentProfileDevelopment");
const TABLE = "student_addresses", COLUMN = "moo", CHECK = "student_addresses_moo_check";
const expectedCheck = require("./postgresIntegrity").constraints.find(item => item.name === CHECK);
async function sameCheck(sequelize, transaction, definition) {
  if (!/^CHECK\s*\([\s\S]*\)$/.test(definition.trim())) return false;
  const plan = async check => {
    // Parse/plan only: no data execution, temporary tables or DDL probes.
    const [row] = await sequelize.query(`EXPLAIN (FORMAT JSON,VERBOSE,COSTS OFF) SELECT ${check.replace(/^CHECK\s*/, "")} AS moo_check FROM public.student_addresses`, { type: QueryTypes.SELECT, transaction });
    return row["QUERY PLAN"][0].Plan.Output;
  };
  return digest(await plan(definition)) === digest(await plan(expectedCheck.definition));
}
async function applyAddressMoo(sequelize, { expectedDatabase } = {}) {
  if (!expectedDatabase || sequelize.getDialect() !== "postgres" || sequelize.config.database !== expectedDatabase) throw Error("Explicit matching PostgreSQL database is required");
  return sequelize.transaction(async transaction => {
    await sequelize.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'", { transaction });
    const [target] = await sequelize.query("SELECT current_database() AS name,current_schema() AS schema,current_setting('server_version_num')::int AS version,pg_is_in_recovery() AS recovery", { type: QueryTypes.SELECT, transaction });
    if (target.name !== expectedDatabase || target.schema !== "public" || target.version < 160000 || target.version >= 170000 || target.recovery) throw Error("Expected a PostgreSQL 16 primary with public schema");
    await sequelize.query("SELECT pg_advisory_xact_lock(19061106,2)", { transaction });
    // An existing table is required. Lock before inspecting so concurrent DDL or
    // writes cannot change the preservation baseline while this migration runs.
    await sequelize.query("LOCK TABLE public.student_addresses IN ACCESS EXCLUSIVE MODE", { transaction });
    const qi = sequelize.getQueryInterface(), columns = await qi.describeTable(TABLE, { transaction });
    const schemaBefore = await schemaSnapshot(sequelize, transaction);
    const fingerprint = async () => {
      const expression = columns[COLUMN] ? "to_jsonb(t)" : "to_jsonb(t)-'moo'";
      const [row] = await sequelize.query(`SELECT count(*)::text AS count,md5(COALESCE(string_agg(v::text,E'\\n' ORDER BY v::text),'')) AS fingerprint FROM (SELECT ${expression} AS v FROM public.student_addresses t) source`, { type: QueryTypes.SELECT, transaction });
      return row;
    };
    const before = await fingerprint();
    if (!columns[COLUMN]) await sequelize.query("ALTER TABLE public.student_addresses ADD COLUMN moo varchar(2) NULL", { transaction });
    const actual = (await qi.describeTable(TABLE, { transaction }))[COLUMN];
    if (!actual.allowNull || !/^(?:CHARACTER VARYING|VARCHAR)\(2\)$/i.test(actual.type) || actual.defaultValue != null) throw Error("Address moo column drift; no automatic repair");
    const constraints = await sequelize.query("SELECT pg_get_constraintdef(oid) AS definition,convalidated AS validated FROM pg_constraint WHERE conrelid='public.student_addresses'::regclass AND conname=$1", { bind: [CHECK], type: QueryTypes.SELECT, transaction });
    if (!constraints.length) await sequelize.query(`ALTER TABLE public.student_addresses ADD CONSTRAINT ${CHECK} ${expectedCheck.definition}`, { transaction });
    else if (!constraints[0].validated || !await sameCheck(sequelize, transaction, constraints[0].definition)) throw Error("Address moo CHECK drift; no automatic repair");
    if (digest(await fingerprint()) !== digest(before)) throw Error("Migration changed existing address data");
    const schemaAfter = await schemaSnapshot(sequelize, transaction);
    const withoutAddition = snapshot => ({ ...snapshot,
      columns: snapshot.columns.filter(row => row.table_name !== TABLE || row.column_name !== COLUMN),
      constraints: snapshot.constraints.filter(row => row.table_name !== TABLE || row.name !== CHECK),
    });
    if (digest(withoutAddition(schemaAfter)) !== digest(withoutAddition(schemaBefore))) throw Error("Unexpected schema change outside address moo");
    return { changed: !columns[COLUMN] || !constraints.length, preserved: true, rows: before.count };
  });
}
module.exports = { applyAddressMoo };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--database" || !args[1]) {
    console.error("Usage: node src/db/studentAddressMoo.js --database <DB_NAME>"); process.exitCode = 1;
  } else {
    const sequelize = require("../config/database");
    applyAddressMoo(sequelize, { expectedDatabase: args[1] }).then(result => console.log(JSON.stringify(result)))
      .catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
  }
}
