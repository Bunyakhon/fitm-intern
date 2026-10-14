// No configuration import, sync, connection, or mutation on import.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { QueryTypes, Transaction } = require("sequelize");
const { Umzug } = require("umzug");
const NAME = "026_google_identity_mapping.js";
const SOURCE = path.join(__dirname, "prepared/google-oauth", NAME);
const TABLES = ["google_auth_requests", "google_identities"];
const DEPENDENCIES = ["007_create_department_staffs.js", "007a_create_missing_base_tables.js"];
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const sourceHash = () => sha256(fs.readFileSync(SOURCE));
function requireCondition(ok, message) { if (!ok) throw new Error(message); }
function flagsOff(env = process.env) {
  for (const key of ["GOOGLE_LOGIN_ENABLED", "GOOGLE_ACCOUNT_LINKING_ENABLED"])
    requireCondition(env[key] === undefined || env[key] === "false", `${key}_MUST_BE_OFF`);
}
// Keep parentheses: changing boolean grouping must never pass recovery validation.
const normalizeCheck = sql => sql.replace(/\s/g, "");
const columns = {
  google_identities: [["id", "uuid", false], ["subject", "character varying(255)", false], ["actor_type", "character varying(32)", false],
    ["student_id", "uuid", true], ["teacher_id", "uuid", true], ["staff_id", "uuid", true],
    ["created_at", "timestamp with time zone", false], ["updated_at", "timestamp with time zone", false]],
  google_auth_requests: [["id", "uuid", false], ["secret_hash", "character varying(64)", false], ["nonce_hash", "character varying(64)", false],
    ["role", "character varying(32)", false], ["purpose", "character varying(16)", false],
    ["expires_at", "timestamp with time zone", false], ["consumed_at", "timestamp with time zone", true]],
};
const actorCheck = `((((actor_type)::text = 'student'::text) AND (student_id IS NOT NULL) AND (teacher_id IS NULL) AND (staff_id IS NULL)) OR
 (((actor_type)::text = 'teacher'::text) AND (teacher_id IS NOT NULL) AND (student_id IS NULL) AND (staff_id IS NULL)) OR
 (((actor_type)::text = 'department_staff'::text) AND (staff_id IS NOT NULL) AND (student_id IS NULL) AND (teacher_id IS NULL)))`;
const indexSpecs = {
  google_identities: [["google_identities_pkey", ["id"], true, true], ["google_subject_actor_unique", ["subject", "actor_type"], true, false],
    ...["student_id", "teacher_id", "staff_id"].map(key => [`google_${key}_unique`, [key], true, false])],
  google_auth_requests: [["google_auth_requests_pkey", ["id"], true, true], ["google_request_expiry", ["expires_at"], false, false]],
};
async function inspect(db, transaction) {
  const query = sql => db.query(sql, { type: QueryTypes.SELECT, transaction });
  const [target] = await query(`SELECT current_database() AS database, (SELECT oid::text FROM pg_database WHERE datname=current_database()) AS "databaseOid",
    (SELECT system_identifier::text FROM pg_control_system()) AS "systemIdentifier", inet_server_addr()::text AS address,
    inet_server_port() AS port, current_user AS "user", current_setting('server_version_num')::int AS version`);
  const tables = await query(`SELECT c.relname AS name, c.relkind AS kind, pg_get_userbyid(c.relowner) AS owner,
    c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls, c.reloptions AS options,
    ARRAY(SELECT acl::text FROM unnest(c.relacl) acl ORDER BY acl::text) AS acl
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f') ORDER BY c.relname`);
  const allColumns = await query(`SELECT c.relname AS table, a.attname AS name, format_type(a.atttypid,a.atttypmod) AS type,
    NOT a.attnotnull AS nullable, pg_get_expr(d.adbin,d.adrelid) AS default, a.attidentity AS identity, a.attgenerated AS generated,
    col.collname AS collation, cn.nspname AS collation_schema, col.collisdeterministic AS deterministic
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    LEFT JOIN pg_collation col ON col.oid=a.attcollation LEFT JOIN pg_namespace cn ON cn.oid=col.collnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f') AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`);
  const constraints = await query(`SELECT c.relname AS table, x.conname AS name, x.contype AS type, x.convalidated AS valid,
    x.condeferrable AS deferrable, pg_get_constraintdef(x.oid) AS definition, pg_get_expr(x.conbin,x.conrelid) AS expression,
    ARRAY(SELECT a.attname::text FROM unnest(x.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.num ORDER BY k.ord) AS columns,
    rn.nspname AS ref_schema, rc.relname AS ref_table,
    ARRAY(SELECT a.attname::text FROM unnest(x.confkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=x.confrelid AND a.attnum=k.num ORDER BY k.ord) AS ref_columns,
    x.confupdtype AS update_action, x.confdeltype AS delete_action, x.confmatchtype AS match_type
    FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_class rc ON rc.oid=x.confrelid LEFT JOIN pg_namespace rn ON rn.oid=rc.relnamespace
    WHERE n.nspname='public' ORDER BY c.relname,x.conname`);
  const indexes = await query(`SELECT c.relname AS table, ic.relname AS name, i.indisunique AS unique, i.indisprimary AS primary,
    i.indisvalid AS valid, i.indisready AS ready, i.indnatts=i.indnkeyatts AS no_include,
    am.amname AS method, pg_get_expr(i.indpred,i.indrelid) AS predicate, pg_get_expr(i.indexprs,i.indrelid) AS expression,
    pg_get_indexdef(i.indexrelid) AS definition,
    ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.num ORDER BY k.ord) AS columns
    FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_class ic ON ic.oid=i.indexrelid JOIN pg_am am ON am.oid=ic.relam
    WHERE n.nspname='public' ORDER BY c.relname,ic.relname`);
  const triggers = await query(`SELECT c.relname AS table, t.tgname AS name, pg_get_triggerdef(t.oid) AS definition
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`);
  const namespaces = await query(`SELECT nspname AS name, pg_get_userbyid(nspowner) AS owner, nspacl::text AS acl
    FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema' ORDER BY nspname`);
  requireCondition(namespaces.length === 1 && namespaces[0].name === "public", "UNSUPPORTED_APPLICATION_SCHEMA");
  const functions = await query(`SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_userbyid(p.proowner) AS owner, p.proacl::text AS acl, pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p') ORDER BY p.proname,arguments`);
  const enums = await query(`SELECT t.typname AS name, pg_get_userbyid(t.typowner) AS owner,
    ARRAY(SELECT e.enumlabel::text FROM pg_enum e WHERE e.enumtypid=t.oid ORDER BY e.enumsortorder) AS labels
    FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e' ORDER BY t.typname`);
  const sequences = await query("SELECT sequencename AS name, sequenceowner AS owner, data_type AS type, start_value, min_value, max_value, increment_by, cycle, cache_size, last_value FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename");
  for (const sequence of sequences) {
    const [value] = await query(`SELECT last_value::text AS value, is_called FROM public.${db.getQueryInterface().quoteIdentifier(sequence.name)}`);
    sequence.value = value.value; sequence.is_called = value.is_called;
  }
  const views = await query(`SELECT c.relname AS name, pg_get_viewdef(c.oid) AS definition FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('v','m') ORDER BY c.relname`);
  const extensions = await query(`SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema,
    pg_get_userbyid(e.extowner) AS owner FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace ORDER BY e.extname`);
  const ledger = tables.some(t => t.name === "sequelize_meta") ? (await query("SELECT name FROM public.sequelize_meta ORDER BY name")).map(r => r.name) : [];
  return { target, tables, columns: allColumns, constraints, indexes, triggers, namespaces, functions, enums, sequences, views, extensions, ledger };
}
function validateDependencies(snapshot) {
  requireCondition(snapshot.target.version >= 160000 && snapshot.target.version < 170000, "POSTGRES_16_REQUIRED");
  for (const name of DEPENDENCIES) requireCondition(snapshot.ledger.includes(name), `MISSING_DEPENDENCY:${name}`);
  for (const name of ["students", "teachers", "department_staffs", "sequelize_meta"]) {
    const table = snapshot.tables.find(t => t.name === name);
    requireCondition(table?.kind === "r" && table.owner === snapshot.target.user && !table.rls && !table.force_rls, `TABLE_OR_OWNER_MISMATCH:${name}`);
    const key = name === "sequelize_meta" ? "name" : "id";
    const column = snapshot.columns.find(c => c.table === name && c.name === key);
    requireCondition(column && !column.nullable && column.type === (key === "id" ? "uuid" : "character varying(255)"), `KEY_MISMATCH:${name}`);
    requireCondition(snapshot.constraints.some(c => c.table === name && c.type === "p" && c.valid && !c.deferrable && JSON.stringify(c.columns) === JSON.stringify([key])), `PK_MISSING:${name}`);
  }
}
function validateSchema(snapshot) {
  for (const name of TABLES) {
    const table = snapshot.tables.find(t => t.name === name);
    requireCondition(table?.kind === "r" && table.owner === snapshot.target.user && !table.rls && !table.force_rls && table.options === null && table.acl.length === 0, `GOOGLE_TABLE_OR_OWNER_MISMATCH:${name}`);
    const actualColumns = snapshot.columns.filter(c => c.table === name);
    assert.deepEqual(actualColumns.map(c => [c.name, c.type, c.nullable]), columns[name], `SCHEMA_COLUMNS:${name}`);
    requireCondition(actualColumns.every(c => c.default === null && !c.identity && !c.generated), `UNEXPECTED_DEFAULT:${name}`);
    requireCondition(actualColumns.every(c => c.type.startsWith("character varying") ? c.collation === "default" && c.collation_schema === "pg_catalog" && c.deterministic : c.collation === null), `UNEXPECTED_COLLATION:${name}`);
    requireCondition(!snapshot.triggers.some(t => t.table === name), `UNEXPECTED_TRIGGER:${name}`);
    const actualIndexes = snapshot.indexes.filter(i => i.table === name);
    assert.deepEqual(actualIndexes.map(i => [i.name, i.columns, i.unique, i.primary]).sort(), [...indexSpecs[name]].sort(), `SCHEMA_INDEXES:${name}`);
    requireCondition(actualIndexes.every(i => i.valid && i.ready && i.no_include && i.method === "btree" && !i.predicate && !i.expression
      && i.definition === `CREATE ${i.unique ? "UNIQUE " : ""}INDEX ${i.name} ON public.${name} USING btree (${i.columns.join(", ")})`), `INDEX_DEFINITION:${name}`);
    const actual = snapshot.constraints.filter(c => c.table === name);
    requireCondition(actual.length === (name === "google_identities" ? 6 : 1), `CONSTRAINT_COUNT:${name}`);
    const pk = actual.find(c => c.name === `${name}_pkey`);
    requireCondition(pk?.type === "p" && JSON.stringify(pk.columns) === '["id"]', `GOOGLE_PK:${name}`);
    requireCondition(actual.every(c => c.valid && !c.deferrable), `CONSTRAINT_NOT_VALID:${name}`);
  }
  for (const [key, table] of [["student_id", "students"], ["teacher_id", "teachers"], ["staff_id", "department_staffs"]]) {
    const fk = snapshot.constraints.find(c => c.table === "google_identities" && c.name === `google_identities_${key}_fkey`);
    requireCondition(fk?.type === "f" && fk.ref_schema === "public" && fk.ref_table === table && JSON.stringify(fk.columns) === JSON.stringify([key])
      && JSON.stringify(fk.ref_columns) === '["id"]' && fk.update_action === "c" && fk.delete_action === "c" && fk.match_type === "s", `GOOGLE_FK:${key}`);
  }
  for (const [name, expression] of [["google_identity_actor_check", actorCheck], ["google_identity_subject_check", "(length((subject)::text) > 0)"]]) {
    const check = snapshot.constraints.find(c => c.table === "google_identities" && c.name === name);
    requireCondition(check?.type === "c" && normalizeCheck(check.expression) === normalizeCheck(expression), `GOOGLE_CHECK:${name}`);
  }
}
function state(snapshot) {
  validateDependencies(snapshot);
  const present = TABLES.filter(name => snapshot.tables.some(t => t.name === name));
  if (!present.length && !snapshot.ledger.includes(NAME)) return "UNINSTALLED";
  requireCondition(present.length === 2, "PARTIAL_SCHEMA_OR_LEDGER_WITHOUT_SCHEMA");
  validateSchema(snapshot);
  return snapshot.ledger.includes(NAME) ? "INSTALLED" : "ORPHAN_SCHEMA";
}
function existingSchema(snapshot) {
  return Object.fromEntries(["tables", "columns", "constraints", "indexes", "triggers", "namespaces", "functions", "enums", "sequences", "views", "extensions"]
    .map(key => [key, snapshot[key].filter(r => !TABLES.includes(r.table || r.name))]));
}
async function rowDigests(db, snapshot, transaction) {
  const result = {};
  for (const table of snapshot.tables.filter(t => ["r", "p"].includes(t.kind) && !TABLES.includes(t.name) && t.name !== "sequelize_meta")) {
    const identifier = db.getQueryInterface().quoteIdentifier(table.name);
    const [row] = await db.query(`SELECT count(*)::text AS count, md5(COALESCE(string_agg(digest,'' ORDER BY digest),'')) AS digest
      FROM (SELECT md5(to_jsonb(t)::text) AS digest FROM public.${identifier} t) rows`, { type: QueryTypes.SELECT, transaction });
    result[table.name] = row;
  }
  return result;
}
async function preflight(db, { expectedHash, env = process.env } = {}) {
  flagsOff(env);
  requireCondition(expectedHash === sourceHash(), "SOURCE_HASH_MISMATCH");
  return db.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, readOnly: true }, async transaction => {
    await db.query("SET TRANSACTION READ ONLY", { transaction });
    const snapshot = await inspect(db, transaction);
    return { sourceHash: sourceHash(), state: state(snapshot), snapshot, existingSchemaHash: sha256(JSON.stringify(existingSchema(snapshot))), rows: await rowDigests(db, snapshot, transaction) };
  });
}
// Only this function can mutate. It cannot discover or execute any other source.
async function install(db, { expectedHash, expectedTarget, baseline, action = "install", env = process.env, beforeLedger, approval } = {}) {
  flagsOff(env);
  requireCondition(expectedHash === sourceHash(), "SOURCE_HASH_MISMATCH");
  requireCondition(["install", "recover-ledger"].includes(action), "INVALID_ACTION");
  requireCondition(expectedTarget && baseline, "TARGET_AND_BASELINE_REQUIRED");
  if (expectedTarget.database === "intern_system")
    requireCondition(approval === `migrate026:${sha256(JSON.stringify(expectedTarget))}`, "EXPLICIT_DEVELOPMENT_APPROVAL_REQUIRED");
  return db.transaction(async transaction => {
    await db.query("SET LOCAL search_path TO pg_catalog, public", { transaction });
    await db.query("SET LOCAL lock_timeout='5s'", { transaction });
    await db.query("SET LOCAL statement_timeout='60s'", { transaction });
    await db.query("SELECT pg_advisory_xact_lock(260026)", { transaction });
    let before = await inspect(db, transaction);
    assert.deepEqual(before.target, expectedTarget, "TARGET_CHANGED");
    requireCondition(before.tables.some(t => t.name === "sequelize_meta"), "LEDGER_REQUIRED");
    await db.query("LOCK TABLE public.sequelize_meta IN ACCESS EXCLUSIVE MODE", { transaction });
    for (const table of before.tables.filter(t => ["r", "p"].includes(t.kind) && !TABLES.includes(t.name) && t.name !== "sequelize_meta"))
      await db.query(`LOCK TABLE public.${db.getQueryInterface().quoteIdentifier(table.name)} IN SHARE MODE`, { transaction });
    // Re-read after locks: another approved installer may have committed first.
    before = await inspect(db, transaction);
    assert.deepEqual(before.target, expectedTarget, "TARGET_CHANGED");
    const beforeState = state(before);
    const rows = await rowDigests(db, before, transaction);
    assert.deepEqual(rows, baseline.rows, "EXISTING_DATA_CHANGED_SINCE_BACKUP");
    requireCondition(sha256(JSON.stringify(existingSchema(before))) === baseline.existingSchemaHash, "EXISTING_SCHEMA_CHANGED_SINCE_BACKUP");
    if (beforeState === "INSTALLED") {
      assert.deepEqual(before.ledger, [...new Set([...baseline.snapshot.ledger, NAME])].sort(), "LEDGER_CHANGED");
      return { state: "ALREADY_INSTALLED", sourceHash: sourceHash(), snapshot: before, rows };
    }
    assert.deepEqual(before.ledger, baseline.snapshot.ledger, "LEDGER_CHANGED");
    requireCondition(beforeState === (action === "install" ? "UNINSTALLED" : "ORPHAN_SCHEMA"), "ACTION_SCHEMA_STATE_MISMATCH");
    if (action === "recover-ledger") {
      // Refuse populated orphan mappings: their provenance needs separate review.
      for (const name of TABLES) {
        await db.query(`LOCK TABLE public.${name} IN ACCESS EXCLUSIVE MODE`, { transaction });
        const [row] = await db.query(`SELECT count(*)::int AS count FROM public.${name}`, { type: QueryTypes.SELECT, transaction });
        requireCondition(row.count === 0, "POPULATED_ORPHAN_REQUIRES_REVIEW");
      }
    }
    const context = Object.create(db.getQueryInterface());
    context.googleOAuth026Transaction = transaction;
    // No SequelizeStorage.sync(). Ledger already exists and is structurally checked.
    const storage = {
      executed: async () => (await db.query("SELECT name FROM public.sequelize_meta ORDER BY name", { type: QueryTypes.SELECT, transaction })).map(r => r.name),
      logMigration: async ({ name }) => {
        requireCondition(name === NAME, "ONLY_026_ALLOWED");
        if (beforeLedger) await beforeLedger({ db, transaction }); // injectable fault for disposable tests only
        await db.query("INSERT INTO public.sequelize_meta (name) VALUES (:name)", { replacements: { name }, transaction });
      },
      unlogMigration: async () => { throw new Error("LEDGER_DELETE_FORBIDDEN"); },
    };
    const runner = new Umzug({ migrations: [{ name: NAME, up: params => action === "install" ? require(SOURCE).up(params) : Promise.resolve(), down: require(SOURCE).down }], context, storage, logger: undefined });
    const applied = await runner.up({ migrations: [NAME] });
    assert.deepEqual(applied.map(m => m.name), [NAME]);
    const after = await inspect(db, transaction);
    requireCondition(state(after) === "INSTALLED", "POST_INSTALL_SCHEMA_FAILED");
    assert.deepEqual(after.ledger, [...before.ledger, NAME].sort(), "ONLY_026_LEDGER_DELTA_ALLOWED");
    assert.deepEqual(existingSchema(after), existingSchema(before), "EXISTING_SCHEMA_CHANGED");
    assert.deepEqual(await rowDigests(db, after, transaction), rows, "EXISTING_DATA_CHANGED");
    requireCondition(expectedHash === sourceHash(), "SOURCE_CHANGED_DURING_INSTALL");
    return { state: action === "install" ? "INSTALLED" : "LEDGER_RECOVERED", sourceHash: sourceHash(), snapshot: after, rows };
  });
}
module.exports = { NAME, SOURCE, TABLES, DEPENDENCIES, sourceHash, sha256, flagsOff, inspect, state, validateSchema, existingSchema, rowDigests, preflight, install };
