const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { QueryTypes } = require("sequelize");
const integrity = require("./postgresIntegrity");
const { defaultValueSchemable } = require("sequelize/lib/utils");

// Preserve grouping, casts, quoted identifiers and string contents. Textual
// differences alone never prove that two PostgreSQL expressions are equivalent.
const normalizeDefinition = sql => sql.trim();

async function compareConstraintDefinitions(sequelize, transaction, item, actualDefinition) {
  if (normalizeDefinition(actualDefinition) === normalizeDefinition(item.definition)) return true;
  if (item.type !== "c" || !transaction) return false;
  const check = /^CHECK\s*\([\s\S]*\)(?:\s+NOT VALID)?$/;
  if (!check.test(actualDefinition.trim()) || !check.test(item.definition.trim())) return false;
  if (/\sNOT VALID$/.test(actualDefinition.trim()) !== /\sNOT VALID$/.test(item.definition.trim())) return false;

  // Reparse BOTH definitions against the same column types/collations using
  // PostgreSQL's parser. LIKE copies no rows, indexes, defaults or CHECKs. Only
  // a session-local temporary relation is created; the real table is untouched.
  const quote = name => sequelize.getQueryInterface().queryGenerator.quoteIdentifier(name);
  const probe = `fitm_check_${randomUUID().replaceAll("-", "")}`;
  try {
    await sequelize.query(`CREATE TEMP TABLE ${quote(probe)} (LIKE public.${quote(item.table_name)}) ON COMMIT DROP`, { transaction });
    await sequelize.query(`ALTER TABLE pg_temp.${quote(probe)} ADD CONSTRAINT actual_check ${actualDefinition}, ADD CONSTRAINT expected_check ${item.definition}`, { transaction });
    const expressions = await sequelize.query(`SELECT conname, pg_get_expr(conbin,conrelid) AS expression
      FROM pg_constraint WHERE conrelid=CAST(:probe AS regclass) AND conname IN ('actual_check','expected_check')`,
    { replacements: { probe: `pg_temp.${probe}` }, type: QueryTypes.SELECT, transaction });
    await sequelize.query(`DROP TABLE pg_temp.${quote(probe)}`, { transaction });
    const actual = expressions.find(row => row.conname === "actual_check")?.expression;
    const expected = expressions.find(row => row.conname === "expected_check")?.expression;
    return typeof actual === "string" && typeof expected === "string" && actual === expected;
  } catch (error) {
    throw new Error(`Constraint drift: ${item.table_name}.${item.name}: unable to verify CHECK definition`, { cause: error });
  }
}
const normalizeDefault = sql => sql == null ? null : sql.toLowerCase()
  .replace(/::character varying/g, "").replace(/::[\w".]+(?:\([^)]*\))?/g, "").replace(/\s+/g, "").replace(/now\(\)/g, "current_timestamp");
const normalizePredicate = sql => sql == null ? null : sql.replace(/^WHERE\s+/i, "")
  .replace(/::(?:character varying|[\w.]+)(?:\[\])?/g, "")
  .replace(/\bIN\s*\(([^()]*)\)/gi, "=ANY(ARRAY[$1])")
  .replace(/"([^"]+)"/g, "$1").replace(/\bis_current\s*=\s*true\b/gi, "is_current")
  .replace(/!=/g, "<>").replace(/[\s()]/g, "");

function requireDevelopment(sequelize, env = process.env) {
  if (env.NODE_ENV !== "development") throw new Error("NODE_ENV=development is required");
  if (sequelize.getDialect() !== "postgres" || sequelize.config.database !== "intern_system") {
    throw new Error("Only the PostgreSQL development database intern_system is allowed");
  }
  const host = sequelize.config.host;
  if (!["localhost", "127.0.0.1", "::1"].includes(host) && !(host === "postgres" && fs.existsSync("/.dockerenv"))) {
    throw new Error("A local development PostgreSQL host is required");
  }
  if (Number(sequelize.config.port) !== 5432) throw new Error("Development PostgreSQL port 5432 is required");
}

const normalizeType = type => type.toLowerCase().replace(/character varying/g, "varchar")
  .replace(/character\(/g, "char(").replace(/decimal/g, "numeric").replace(/\s+/g, "");

async function inspectColumns(sequelize, transaction, { allowMissingTables = false } = {}) {
  const rows = await sequelize.query(`SELECT c.relname AS table_name, a.attname AS column_name,
    format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull AS not_null,
    pg_get_expr(d.adbin,d.adrelid) AS default_sql,
    ARRAY(SELECT enumlabel::text FROM pg_enum WHERE enumtypid=a.atttypid ORDER BY enumsortorder) AS enum_values
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped`,
  { type: QueryTypes.SELECT, transaction });
  const errors = [];
  for (const model of Object.values(sequelize.models)) {
    const columns = rows.filter(row => row.table_name === model.tableName);
    if (!columns.length && allowMissingTables) continue;
    for (const [name, attribute] of Object.entries(model.rawAttributes)) {
      if (attribute.type.key === "VIRTUAL") continue;
      const field = attribute.field || name;
      const column = columns.find(row => row.column_name === field);
      if (!column) { errors.push(`${model.tableName}.${field}: missing`); continue; }
      const matchesType = attribute.type.key === "ENUM"
        ? JSON.stringify(column.enum_values) === JSON.stringify(attribute.type.values)
        : normalizeType(column.type) === normalizeType(attribute.type.toSql());
      if (!matchesType || column.not_null !== (attribute.primaryKey === true || attribute.allowNull === false)) {
        errors.push(`${model.tableName}.${field}: type/nullability mismatch`);
      }
      const expectedDefault = attribute.defaultValue != null && defaultValueSchemable(attribute.defaultValue)
        ? sequelize.getQueryInterface().queryGenerator.escape(attribute.defaultValue, attribute) : null;
      if (normalizeDefault(column.default_sql) !== normalizeDefault(expectedDefault)) errors.push(`${model.tableName}.${field}: default mismatch`);
    }
    const expected = Object.values(model.rawAttributes).map(attribute => attribute.field);
    for (const column of columns) if (!expected.includes(column.column_name)) errors.push(`${model.tableName}.${column.column_name}: unmodeled column`);
  }
  if (errors.length) throw new Error(`Schema differs from models; review before manual db:reset:\n${errors.join("\n")}`);
  return rows.filter(row => Object.values(sequelize.models).some(model => model.tableName === row.table_name)).length;
}

async function applyIntegrity(sequelize, transaction) {
  const select = sql => sequelize.query(sql, { type: QueryTypes.SELECT, transaction });
  const quote = name => sequelize.getQueryInterface().queryGenerator.quoteIdentifier(name);
  const constraints = await select(`SELECT c.relname AS table_name,k.conname AS name,pg_get_constraintdef(k.oid) AS definition
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'`);
  for (const item of integrity.constraints) {
    const existing = constraints.find(row => row.table_name === item.table_name && row.name === item.name);
    if (existing) {
      if (!await compareConstraintDefinitions(sequelize, transaction, item, existing.definition)) throw new Error(`Constraint drift: ${item.table_name}.${item.name}`);
      continue;
    }
    await sequelize.query(`ALTER TABLE public.${quote(item.table_name)} ADD CONSTRAINT ${quote(item.name)} ${item.definition}`, { transaction });
  }
  for (const item of integrity.functions) await sequelize.query(item.definition, { transaction });
  const triggers = await select(`SELECT c.relname AS table_name,t.tgname AS name FROM pg_trigger t
    JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal`);
  for (const item of integrity.triggers) {
    if (!triggers.some(row => row.table_name === item.table_name && row.name === item.name)) {
      await sequelize.query(item.definition, { transaction });
    }
  }
}

async function verifyIntegrity(sequelize, transaction) {
  const select = sql => sequelize.query(sql, { type: QueryTypes.SELECT, transaction });
  const predicates = await select(`SELECT c.relname AS name, pg_get_expr(i.indpred,i.indrelid) AS predicate
    FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'`);
  const foreignKeys = await select(`SELECT c.relname AS table_name, rc.relname AS target,
    ARRAY(SELECT a.attname::text FROM unnest(k.conkey) WITH ORDINALITY x(num,ord) JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=x.num ORDER BY ord) AS fields,
    ARRAY(SELECT a.attname::text FROM unnest(k.confkey) WITH ORDINALITY x(num,ord) JOIN pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=x.num ORDER BY ord) AS target_fields,
    k.confdeltype AS delete_action,k.confupdtype AS update_action
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_class rc ON rc.oid=k.confrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND k.contype='f'`);
  const actions = { "NO ACTION": "a", RESTRICT: "r", CASCADE: "c", "SET NULL": "n", "SET DEFAULT": "d" };
  for (const model of Object.values(sequelize.models)) {
    for (const attribute of Object.values(model.rawAttributes)) {
      if (!attribute.references) continue;
      const target = attribute.references.model.tableName || attribute.references.model;
      if (!foreignKeys.some(row => row.table_name === model.tableName && row.fields.length === 1 && row.fields[0] === attribute.field
        && row.target === target && row.target_fields[0] === attribute.references.key
        && row.delete_action === actions[attribute.onDelete || "NO ACTION"] && row.update_action === actions[attribute.onUpdate || "NO ACTION"])) {
        throw new Error(`Foreign key drift: ${model.tableName}.${attribute.field}`);
      }
    }
    const indexes = await sequelize.getQueryInterface().showIndex(model.getTableName(), { transaction });
    const primaryFields = Object.values(model.rawAttributes).filter(attribute => attribute.primaryKey).map(attribute => attribute.field);
    if (!indexes.some(index => index.primary && JSON.stringify(index.fields.map(field => field.attribute)) === JSON.stringify(primaryFields))) {
      throw new Error(`Primary key drift: ${model.tableName}`);
    }
    for (const attribute of Object.values(model.rawAttributes)) {
      if (attribute.unique === true && !indexes.some(index => index.unique && index.fields.length === 1 && index.fields[0].attribute === attribute.field && !predicates.find(row => row.name === index.name)?.predicate)) {
        throw new Error(`Unique key drift: ${model.tableName}.${attribute.field}`);
      }
    }
    for (const index of model._indexes) {
      const actual = indexes.find(row => row.name === index.name);
      if (!actual || !!actual.unique !== !!index.unique || JSON.stringify(actual.fields.map(field => field.attribute)) !== JSON.stringify(index.fields)) {
        throw new Error(`Index drift: ${model.tableName}.${index.name}`);
      }
      const expectedPredicate = index.where ? sequelize.getQueryInterface().queryGenerator.whereQuery(index.where) : null;
      if (normalizePredicate(predicates.find(row => row.name === index.name)?.predicate) !== normalizePredicate(expectedPredicate)) {
        throw new Error(`Partial index drift: ${model.tableName}.${index.name}`);
      }
    }
  }
  const triggers = await select(`SELECT c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid) AS definition
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal`);
  for (const item of integrity.triggers) if (!triggers.some(row => row.table_name === item.table_name && row.name === item.name && row.definition === item.definition)) {
    throw new Error(`Trigger drift: ${item.table_name}.${item.name}`);
  }
}

async function initialize(sequelize, { reset = false, verifyEmpty = false, confirmation, env = process.env } = {}) {
  requireDevelopment(sequelize, env);
  if ((reset || verifyEmpty) && confirmation !== "intern_system") throw new Error("Explicit --confirm=intern_system is required for reset/empty-schema verification");
  await sequelize.authenticate();
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query("SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '60s'; SET LOCAL search_path = public", { transaction });
    const [[target]] = await sequelize.query(`SELECT current_database() AS database, current_schema() AS schema,
      current_setting('server_version_num')::int AS version, inet_server_addr()::text AS address`, { transaction });
    if (target.database !== "intern_system" || target.schema !== "public" || Math.floor(target.version / 10000) !== 16) {
      throw new Error("Expected public schema of PostgreSQL 16 intern_system");
    }
    await sequelize.query("SELECT pg_advisory_xact_lock(624061016)", { transaction });
    if (!reset && !verifyEmpty) await inspectColumns(sequelize, transaction, { allowMissingTables: true });
    if (reset || verifyEmpty) {
      const tables = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname='public'", { type: QueryTypes.SELECT, transaction });
      const allowed = new Set([...Object.values(sequelize.models).map(model => model.tableName), "sequelize_meta", "SequelizeMeta"]);
      if (tables.some(row => !allowed.has(row.tablename))) throw new Error("Unmodeled tables found; reset refused");
      // Drop the complete reviewed table set together with RESTRICT. External
      // dependencies fail and roll back instead of cascading into other schemas.
      const quote = name => sequelize.getQueryInterface().queryGenerator.quoteIdentifier(name);
      if (tables.length) await sequelize.query(`DROP TABLE ${tables.map(row => `public.${quote(row.tablename)}`).join(", ")} RESTRICT`, { transaction });
      for (const item of integrity.functions) await sequelize.query(`DROP FUNCTION IF EXISTS public.${quote(item.name)}() RESTRICT`, { transaction });
      for (const model of Object.values(sequelize.models)) for (const attribute of Object.values(model.rawAttributes)) {
        if (attribute.type.key === "ENUM") await sequelize.query(`DROP TYPE IF EXISTS public.${quote(`enum_${model.tableName}_${attribute.field}`)} RESTRICT`, { transaction });
      }
      const [[empty]] = await sequelize.query(`SELECT
        (SELECT count(*) FROM pg_tables WHERE schemaname='public') AS tables,
        (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e') AS enums,
        (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') AS functions`, { transaction });
      if ([empty.tables, empty.enums, empty.functions].some(count => Number(count) !== 0)) throw new Error("Unmodeled PostgreSQL objects found; reset refused");
      // Force is reserved for the explicitly confirmed manual development reset.
      await sequelize.sync({ force: reset, transaction, match: /^intern_system$/ });
    } else {
      await sequelize.sync({ transaction });
    }
    await applyIntegrity(sequelize, transaction);
    const columns = await inspectColumns(sequelize, transaction);
    await verifyIntegrity(sequelize, transaction);
    const [[counts]] = await sequelize.query(`SELECT
      (SELECT count(*)::int FROM pg_constraint k JOIN pg_namespace n ON n.oid=k.connamespace WHERE n.nspname='public') AS constraints,
      (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public') AS indexes,
      (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS triggers`, { transaction });
    if (verifyEmpty) await transaction.rollback();
    else {
      await sequelize.query('DROP TABLE IF EXISTS public.sequelize_meta; DROP TABLE IF EXISTS public."SequelizeMeta"', { transaction });
      await transaction.commit();
    }
    return { database: target.database, tables: Object.keys(sequelize.models).length, columns, ...counts, reset, verifiedEmpty: verifyEmpty, rolledBack: verifyEmpty };
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
}

async function main() {
  const [action, ...arguments_] = process.argv.slice(2);
  if (!["init", "reset", "verify-empty"].includes(action) || arguments_.some(argument => argument !== "--confirm=intern_system")) {
    throw new Error("Usage: initialize.js init | reset --confirm=intern_system | verify-empty --confirm=intern_system");
  }
  const { sequelize } = require("../models");
  try {
    console.log(JSON.stringify(await initialize(sequelize, { reset: action === "reset", verifyEmpty: action === "verify-empty", confirmation: arguments_.length ? "intern_system" : undefined }), null, 2));
  } finally { await sequelize.close(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { initialize, requireDevelopment, inspectColumns, normalizeDefinition, compareConstraintDefinitions };
