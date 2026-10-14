const { extensions, tables } = require("./schema");
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const table = value => "public." + quote(value);
function sqlType(spec) {
  switch (spec.type) {
    case "varchar": case "char": return spec.type + "(" + spec.length + ")";
    case "numeric": return "numeric(" + spec.precision + "," + spec.scale + ")";
    default: return spec.type;
  }
}
function columnSql(name, spec) {
  return quote(name) + " " + sqlType(spec) + (spec.nullable ? "" : " NOT NULL") +
    (spec.defaultSql ? " DEFAULT " + spec.defaultSql : "") + (spec.primaryKey ? " PRIMARY KEY" : "") +
    (spec.references ? " REFERENCES " + table(spec.references) + "(id) ON UPDATE RESTRICT ON DELETE " + spec.deleteBehavior : "");
}
function addColumns(name) {
  const spec = extensions[name];
  return [
    ...Object.entries(spec.columns).map(([key, value]) => "ALTER TABLE " + table(name) + " ADD COLUMN " + columnSql(key, value)),
    ...Object.entries(spec.checks).map(([key, value]) => "ALTER TABLE " + table(name) + " ADD CONSTRAINT " + quote(key) + " CHECK (" + value + ")"),
  ];
}
function createTable(name) {
  const spec = tables[name];
  const definitions = Object.entries(spec.columns).map(([key, value]) => columnSql(key, value));
  for (const [key, value] of Object.entries(spec.checks || {})) {
    definitions.push("CONSTRAINT " + quote(name + "_" + key + "_check") + " CHECK (" + value + ")");
  }
  for (const [i, fields] of (spec.unique || []).entries()) {
    definitions.push("CONSTRAINT " + quote(name + "_unique_" + i) + " UNIQUE (" + fields.map(quote).join(", ") + ")");
  }
  return [
    "CREATE TABLE " + table(name) + " (\n" + definitions.join(",\n") + "\n)",
    ...(spec.indexes || []).map((fields, i) => "CREATE INDEX " + quote(name + "_owner_" + i) + " ON " + table(name) + " (" + fields.map(quote).join(", ") + ")"),
  ];
}
async function runPrepared(context, statements) {
  // Deliberately unusable by the existing Umzug runner, even if copied by mistake.
  if (context?.studentProfilePhase2BApproved !== true) throw new Error("PHASE_2B_APPROVAL_REQUIRED: prepared source must not run in Phase 2A");
  if (context.sequelize.getDialect() !== "postgres") throw new Error("POSTGRES_REQUIRED");
  return context.sequelize.transaction(async transaction => {
    await context.sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
    await context.sequelize.query("SET LOCAL statement_timeout = '60s'", { transaction });
    for (const statement of statements) await context.sequelize.query(statement, { transaction });
  });
}
async function down() {
  throw new Error("PRESERVE_DATA: automatic schema rollback is disabled; roll back application code and retain additive schema. Any cleanup needs a separate approved, backed-up plan.");
}
module.exports = { addColumns, createTable, runPrepared, down };
