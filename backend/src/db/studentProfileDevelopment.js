// Explicit, additive Development operation. Never imported by application startup.
// This is not a migration runner; no reset, sync, data backfill or account writes.
const fs = require("node:fs");
const { createHash } = require("node:crypto");
const { QueryTypes } = require("sequelize");
const { inspectColumns, compareConstraintDefinitions } = require("./initialize");
const integrity = require("./postgresIntegrity");
const schema = require("../models/studentProfileAggregate.schema");
const { CONTACT_FIELDS, LEGACY_FRIEND_FIELDS } = require("../services/studentProfileContacts");
const TABLE = "student_close_friends";
const TABLES = ["students", "student_profiles", "student_files", ...Object.keys(schema.tables)];
const isolatedName = name => /^fitm_profile_accept_[0-9]{8}_[a-f0-9]{8}$/.test(name);
const fail = message => { throw new Error(message); };
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function sameReadOnlyCheck(sequelize, transaction, item, actual) {
  if (item.type !== "c") return false;
  const check = /^CHECK\s*\([\s\S]*\)$/;
  const pending = value => /\sNOT VALID$/.test(value.trim());
  if (pending(actual) !== pending(item.definition)) return false;
  const clean = value => value.trim().replace(/\sNOT VALID$/, "");
  if (!check.test(clean(actual)) || !check.test(clean(item.definition))) return false;
  const quote = sequelize.getQueryInterface().queryGenerator.quoteIdentifier(item.table_name);
  const output = async definition => {
    // EXPLAIN without ANALYZE parses/plans the expression; it executes no data
    // query and creates no probe objects, including in a READ ONLY preflight.
    const [plan] = await sequelize.query(`EXPLAIN (FORMAT JSON,VERBOSE,COSTS OFF) SELECT ${clean(definition).replace(/^CHECK\s*/, "")} AS profile_check FROM public.${quote}`,
      { type: QueryTypes.SELECT, transaction });
    return plan["QUERY PLAN"][0].Plan.Output;
  };
  return digest(await output(actual)) === digest(await output(item.definition));
}
async function equivalentSchema(sequelize, transaction, expected, actual) {
  for (const kind of ["columns", "indexes", "triggers"]) if (digest(expected[kind]) !== digest(actual[kind])) return false;
  if (expected.constraints.length !== actual.constraints.length) return false;
  for (const item of expected.constraints) {
    const candidate = actual.constraints.find(row => row.table_name === item.table_name && row.name === item.name && row.type === item.type);
    if (!candidate || candidate.definition !== item.definition && !await sameReadOnlyCheck(sequelize, transaction, item, candidate.definition)) return false;
  }
  return true;
}
async function target(sequelize, transaction, isolated = false) {
  const config = sequelize.config;
  if (process.env.NODE_ENV !== "development" || sequelize.getDialect() !== "postgres"
    || !["127.0.0.1", "localhost", "::1"].includes(config.host) || Number(config.port) !== 5432
    || !(isolated ? isolatedName(config.database) : config.database === "intern_system")) fail("Unexpected Development database configuration");
  const [row] = await sequelize.query(`SELECT current_database() AS database, current_schema() AS schema,
    current_setting('server_version') AS version, current_setting('server_version_num')::int AS version_number,
    inet_server_addr()::text AS server_address, inet_server_port() AS port, pg_is_in_recovery() AS recovery`, { type: QueryTypes.SELECT, transaction });
  if (row.database !== config.database || row.schema !== "public" || Math.floor(row.version_number / 10000) !== 16 || row.port !== 5432 || row.recovery) fail("Unexpected PostgreSQL target");
  return row;
}
async function schemaSnapshot(sequelize, transaction) {
  const select = sql => sequelize.query(sql, { type: QueryTypes.SELECT, transaction });
  return {
    columns: await select(`SELECT c.relname AS table_name,a.attname AS column_name,format_type(a.atttypid,a.atttypmod) AS type,
      a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid) AS default_sql FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
      WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`),
    constraints: await select(`SELECT c.relname AS table_name,k.conname AS name,k.contype AS type,pg_get_constraintdef(k.oid) AS definition
      FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' ORDER BY c.relname,k.conname`),
    indexes: await select("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname"),
    triggers: await select(`SELECT c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid) AS definition
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`),
  };
}
async function fingerprints(sequelize, transaction, { excludeContacts = true } = {}) {
  const names = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", { type: QueryTypes.SELECT, transaction });
  const quote = name => sequelize.getQueryInterface().queryGenerator.quoteIdentifier(name);
  const result = {};
  for (const { tablename } of names) {
    const [row] = await sequelize.query(`SELECT count(*)::int AS rows, md5(COALESCE(string_agg(h,'' ORDER BY h),'')) AS fingerprint
      FROM (SELECT md5((to_jsonb(t) - $1::text[])::text) AS h FROM public.${quote(tablename)} AS t) AS hashes`,
    { bind: [excludeContacts && tablename === "student_profiles" ? CONTACT_FIELDS : []], type: QueryTypes.SELECT, transaction });
    result[tablename] = row;
  }
  return result;
}
async function verifyProfile(models, transaction, { allowPending = false, parseChecks = false } = {}) {
  const sequelize = models.sequelize;
  const snapshot = await schemaSnapshot(sequelize, transaction);
  const columns = snapshot.columns.filter(row => row.table_name === "student_profiles");
  if (columns.some(row => LEGACY_FRIEND_FIELDS.includes(row.column_name))) fail("Legacy friend columns require an approved preservation/backfill plan");
  const friendExists = snapshot.columns.some(row => row.table_name === TABLE);
  const missingContacts = CONTACT_FIELDS.filter(field => !columns.some(row => row.column_name === field));
  if (!allowPending && (!friendExists || missingContacts.length)) fail("Profile schema is pending");
  const selected = Object.fromEntries(Object.entries(sequelize.models).filter(([, model]) => TABLES.includes(model.tableName)
    && (model.tableName !== TABLE || friendExists)).map(([name, model]) => [name, {
      tableName: model.tableName,
      rawAttributes: Object.fromEntries(Object.entries(model.rawAttributes).filter(([key]) => model.tableName !== "student_profiles" || !missingContacts.includes(key))),
    }]));
  await inspectColumns({ query: sequelize.query.bind(sequelize), getQueryInterface: sequelize.getQueryInterface.bind(sequelize), models: selected }, transaction);
  for (const item of integrity.constraints.filter(item => TABLES.includes(item.table_name) && (item.table_name !== TABLE || friendExists))) {
    const actual = snapshot.constraints.find(row => row.table_name === item.table_name && row.name === item.name);
    if (!actual) fail("Missing profile constraint: " + item.name);
    if (actual.definition.trim() !== item.definition.trim()
      && !(await sameReadOnlyCheck(sequelize, transaction, item, actual.definition))
      && !(parseChecks && await compareConstraintDefinitions(sequelize, transaction, item, actual.definition))) fail("Profile constraint drift: " + item.name);
  }
  for (const model of Object.values(sequelize.models).filter(model => TABLES.includes(model.tableName) && (model.tableName !== TABLE || friendExists))) {
    const indexes = await sequelize.getQueryInterface().showIndex(model.tableName, { transaction });
    const pk = Object.values(model.rawAttributes).filter(attr => attr.primaryKey).map(attr => attr.field);
    if (!indexes.some(index => index.primary && JSON.stringify(index.fields.map(field => field.attribute)) === JSON.stringify(pk))) fail("Profile primary key drift");
    for (const index of model._indexes) {
      if (!indexes.some(actual => actual.name === index.name && !!actual.unique === !!index.unique
        && JSON.stringify(actual.fields.map(field => field.attribute)) === JSON.stringify(index.fields))) fail("Profile index drift: " + index.name);
    }
    for (const attr of Object.values(model.rawAttributes).filter(attr => attr.references)) {
      const reference = typeof attr.references.model === "string" ? attr.references.model : attr.references.model.tableName;
      const [fk] = await sequelize.query(`SELECT count(*)::int AS count FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
        JOIN pg_class r ON r.oid=k.confrelid JOIN pg_namespace n ON n.oid=c.relnamespace
        JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=k.conkey[1]
        JOIN pg_attribute b ON b.attrelid=k.confrelid AND b.attnum=k.confkey[1]
        WHERE n.nspname='public' AND k.contype='f' AND array_length(k.conkey,1)=1 AND c.relname=:table
        AND r.relname=:reference AND a.attname=:field AND b.attname=:key AND k.confdeltype=:deleted AND k.confupdtype=:updated`,
      { replacements: { table: model.tableName, reference, field: attr.field, key: attr.references.key,
        deleted: { CASCADE: "c", "SET NULL": "n", RESTRICT: "r" }[attr.onDelete], updated: { CASCADE: "c", "SET NULL": "n", RESTRICT: "r" }[attr.onUpdate] }, type: QueryTypes.SELECT, transaction });
      if (fk.count !== 1) fail("Profile foreign key drift: " + model.tableName + "." + attr.field);
    }
  }
  return { missingContacts, friendExists, schema: snapshot };
}
function ddlPlan(models, readiness) {
  const qi = models.sequelize.getQueryInterface(), generator = qi.queryGenerator;
  const statements = readiness.missingContacts.map(field => generator.addColumnQuery("student_profiles", field, models.StudentProfile.rawAttributes[field]));
  if (!readiness.friendExists) {
    const model = models.StudentCloseFriend;
    statements.push(generator.createTableQuery(TABLE, generator.attributesToSQL(model.rawAttributes, { table: TABLE, context: "createTable" })));
    for (const index of model._indexes) statements.push(generator.addIndexQuery(TABLE, index));
    for (const item of integrity.constraints.filter(item => item.table_name === TABLE)) statements.push(`ALTER TABLE public."${TABLE}" ADD CONSTRAINT "${item.name}" ${item.definition};`);
  }
  return statements;
}
async function inspectDevelopment(models, isolated = false) {
  return models.sequelize.transaction({ readOnly: true, isolationLevel: "REPEATABLE READ" }, async transaction => {
    await models.sequelize.query("SET LOCAL search_path=public; SET LOCAL TIME ZONE 'UTC'; SET LOCAL statement_timeout='30s'", { transaction });
    const identity = await target(models.sequelize, transaction, isolated);
    const readiness = await verifyProfile(models, transaction, { allowPending: true });
    return { target: identity, ...readiness, fingerprints: await fingerprints(models.sequelize, transaction), statements: ddlPlan(models, readiness) };
  });
}
async function applyDevelopment(models, { receipt, isolated = false } = {}) {
  // A successful restore into a NEW isolated DB is mandatory even for rehearsal.
  if (!receipt?.restoreVerified || !isolatedName(receipt.restoreDatabase) || receipt.sourceDatabase !== "intern_system"
    || !receipt.sourceSchema || !receipt.sourceFingerprints || !fs.existsSync(receipt.archive)) fail("Verified backup receipt is required");
  const archive = fs.readFileSync(receipt.archive);
  if (archive.subarray(0, 5).toString("ascii") !== "PGDMP") fail("Expected a PostgreSQL custom backup archive");
  const archiveHash = createHash("sha256").update(archive).digest("hex");
  if (archiveHash !== receipt.sha256) fail("Backup archive hash mismatch");
  // Fresh snapshots after acquiring SHARE locks see any writer that committed
  // while we waited. Relevant rows stay stable through the additive operation.
  return models.sequelize.transaction({ isolationLevel: "READ COMMITTED" }, async transaction => {
    const sequelize = models.sequelize;
    await sequelize.query("SET LOCAL search_path=public; SET LOCAL TIME ZONE 'UTC'; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'", { transaction });
    const identity = await target(sequelize, transaction, isolated);
    if (isolated && identity.database !== receipt.restoreDatabase) fail("Unexpected isolated restore target");
    await sequelize.query("SELECT pg_advisory_xact_lock(624061016)", { transaction });
    const quoted = TABLES.filter(name => name !== TABLE).map(name => 'public."' + name + '"').join(",");
    await sequelize.query("LOCK TABLE " + quoted + " IN SHARE MODE", { transaction });
    const readiness = await verifyProfile(models, transaction, { allowPending: true });
    const before = await fingerprints(sequelize, transaction);
    if (digest(before) !== digest(receipt.sourceFingerprints)
      || !await equivalentSchema(sequelize, transaction, receipt.sourceSchema, readiness.schema)) fail("Database changed after verified backup; take a fresh backup");
    const statements = ddlPlan(models, readiness);
    for (const sql of statements) await sequelize.query(sql, { transaction });
    const verified = await verifyProfile(models, transaction, { parseChecks: true });
    const after = await fingerprints(sequelize, transaction);
    for (const [name, expected] of Object.entries(before)) if (digest(after[name]) !== digest(expected)) fail("Existing data preservation failed");
    if (!readiness.friendExists && after[TABLE].rows !== 0) fail("New relation is not empty");
    return { target: identity, statements, before, after, schema: verified.schema, preservationVerified: true };
  });
}
module.exports = { inspectDevelopment, applyDevelopment, verifyProfile, fingerprints, schemaSnapshot, equivalentSchema, isolatedName, digest };
