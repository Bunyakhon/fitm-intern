// Explicit additive operation only. Never imported by backend startup.
const { QueryTypes } = require("sequelize");
const helper = require("./studentProfileDevelopment");
const { tables } = require("../models/studentProfileAggregate.schema");
const TABLE = "student_education_records", COLUMN = "education_status";
const CHECK = "student_education_records_education_status_check";
const definition = tables[TABLE].checks.education_status;
async function fingerprints(sequelize, transaction) {
  const rows = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", { type: QueryTypes.SELECT, transaction });
  const result = {};
  for (const { tablename } of rows) {
    const quoted = sequelize.getQueryInterface().queryGenerator.quoteIdentifier(tablename);
    // Compare every old column/row while allowing only the new nullable column.
    const value = tablename === TABLE ? "to_jsonb(t)-'education_status'" : "to_jsonb(t)";
    const [row] = await sequelize.query(`SELECT count(*)::text AS count, md5(COALESCE(string_agg(v::text, E'\\n' ORDER BY v::text), '')) AS fingerprint FROM (SELECT ${value} AS v FROM public.${quoted} t) source`, { type: QueryTypes.SELECT, transaction });
    result[tablename] = row;
  }
  return result;
}
async function applyEducationStatus(sequelize, { isolated = false, expectedData, expectedSchema } = {}) {
  const config = sequelize.config;
  if (process.env.NODE_ENV !== "development" || sequelize.getDialect() !== "postgres" || !["127.0.0.1", "localhost", "::1"].includes(config.host)
    || Number(config.port) !== 5432 || !(isolated ? helper.isolatedName(config.database) : config.database === "intern_system")) throw new Error("Unexpected Education DDL target");
  if (!isolated && (!expectedData || !expectedSchema)) throw new Error("Verified backup/restore preservation snapshots are required");
  return sequelize.transaction(async transaction => {
    await sequelize.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'", { transaction });
    const [target] = await sequelize.query("SELECT current_database() AS name,current_schema() AS schema,current_setting('server_version_num')::int AS version,pg_is_in_recovery() AS recovery", { type: QueryTypes.SELECT, transaction });
    if (target.name !== config.database || target.schema !== "public" || target.version < 160000 || target.version >= 170000 || target.recovery) throw new Error("Unexpected PostgreSQL Education DDL target");
    await sequelize.query("SELECT pg_advisory_xact_lock(19061106, 1)", { transaction });
    // Block business writes until preservation is verified and DDL commits.
    const tables = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", { type: QueryTypes.SELECT, transaction });
    const quote = name => sequelize.getQueryInterface().queryGenerator.quoteIdentifier(name);
    await sequelize.query("LOCK TABLE " + tables.map(row => "public." + quote(row.tablename)).join(",") + " IN SHARE MODE", { transaction });
    const before = await fingerprints(sequelize, transaction), schemaBefore = await helper.schemaSnapshot(sequelize, transaction);
    if (expectedData && helper.digest(before) !== helper.digest(expectedData) || expectedSchema && helper.digest(schemaBefore) !== helper.digest(expectedSchema)) throw new Error("Database changed since verified backup; take a fresh backup");
    const qi = sequelize.getQueryInterface(), columns = await qi.describeTable(TABLE, { transaction });
    if (!columns[COLUMN]) await sequelize.query(`ALTER TABLE public.${TABLE} ADD COLUMN ${COLUMN} varchar(16) NULL`, { transaction });
    const actual = (await qi.describeTable(TABLE, { transaction }))[COLUMN];
    if (!actual.allowNull || !/^(?:CHARACTER VARYING|VARCHAR)\(16\)$/i.test(actual.type) || actual.defaultValue != null) throw new Error("Education status column drift");
    const constraints = await sequelize.query("SELECT pg_get_expr(conbin,conrelid) AS expression FROM pg_constraint WHERE conrelid='public.student_education_records'::regclass AND conname=$1", { bind: [CHECK], type: QueryTypes.SELECT, transaction });
    if (!constraints.length) await sequelize.query(`ALTER TABLE public.${TABLE} ADD CONSTRAINT ${CHECK} CHECK (${definition})`, { transaction });
    else {
      const { compareConstraintDefinitions } = require("./initialize");
      const definitions = await sequelize.query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='public.student_education_records'::regclass AND conname=$1", { bind: [CHECK], type: QueryTypes.SELECT, transaction });
      const expected = require("./postgresIntegrity").constraints.find(item => item.name === CHECK);
      if (!await compareConstraintDefinitions(sequelize, transaction, expected, definitions[0].definition)) throw new Error("Education status CHECK drift");
    }
    if (helper.digest(await fingerprints(sequelize, transaction)) !== helper.digest(before)) throw new Error("Education DDL changed existing data");
    const after = await helper.schemaSnapshot(sequelize, transaction);
    const oldShape = { ...after, columns: after.columns.filter(row => row.table_name !== TABLE || row.column_name !== COLUMN), constraints: after.constraints.filter(row => row.table_name !== TABLE || row.name !== CHECK) };
    const beforeShape = { ...schemaBefore, columns: schemaBefore.columns.filter(row => row.table_name !== TABLE || row.column_name !== COLUMN), constraints: schemaBefore.constraints.filter(row => row.table_name !== TABLE || row.name !== CHECK) };
    if (helper.digest(oldShape) !== helper.digest(beforeShape)) throw new Error("Unexpected schema change outside Education status");
    return { changed: !columns[COLUMN] || !constraints.length, preserved: true };
  });
}
module.exports = { applyEducationStatus, fingerprints };
