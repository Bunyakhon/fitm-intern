// PostgreSQL pre-flight support. Never imports config/database, app, live model
// registry or the executable migration runner. Development connections are read-only.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const { Sequelize, QueryTypes } = require("sequelize");
const { Umzug, SequelizeStorage } = require("umzug");
const workspace = path.resolve(__dirname, "../../..");
const activeDirectory = path.join(workspace, "backend/src/db/migrations");
const preparedDirectory = path.join(workspace, "backend/src/db/prepared/student-profile-phase2a/migrations");
const relevantTables = ["students", "student_profiles", "student_files", "coop_requests", "coop_request_reviews", "coop_documents", "coop_document_revisions"];
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const digest = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function connectionSettings() {
  // Read credentials only inside the opt-in harness. Never print configuration.
  const envFile = path.join(workspace, "backend/.env");
  const parsed = fs.existsSync(envFile) ? require("dotenv").parse(fs.readFileSync(envFile)) : {};
  const env = { ...parsed, ...process.env };
  const host = env.DB_HOST || "localhost";
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(host), "This harness only supports an explicitly local PostgreSQL server");
  assert.equal(env.DB_NAME || "intern_system", "intern_system", "Unexpected development database configuration");
  return { host, port: Number(env.DB_PORT || 5432), user: env.DB_USER || "postgres", password: env.DB_PASSWORD || "postgres", connectionTimeoutMillis: 5000 };
}
async function catalog(query) {
  const tables = (await query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename")).map(row => row.tablename);
  // Compare columns by name: physical ordinal differences from legacy ALTERs do
  // not change named SQL/Sequelize access. Do not hide type/default/key differences.
  const columns = await query("SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,character_maximum_length,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,column_name");
  const constraints = await query("SELECT c.relname AS table_name,k.conname AS name,k.contype AS type,k.convalidated AS validated,pg_get_constraintdef(k.oid) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname");
  const indexes = await query("SELECT tablename AS table_name,indexname AS name,indexdef AS definition FROM pg_catalog.pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname");
  const enums = await query("SELECT t.typname AS name,e.enumlabel AS value FROM pg_catalog.pg_enum e JOIN pg_catalog.pg_type t ON t.oid=e.enumtypid JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder");
  const triggers = await query("SELECT c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid) AS definition FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname");
  const ledger = tables.includes("sequelize_meta") ? (await query("SELECT name FROM public.sequelize_meta ORDER BY name")).map(row => row.name) : [];
  return { tables, columns, constraints, indexes, enums, triggers, ledger };
}
async function readDevelopment() {
  const client = new Client({ ...connectionSettings(), database: "intern_system", options: "-c default_transaction_read_only=on", application_name: "fitm_profile_2b1_readonly" });
  try {
    await client.connect();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL statement_timeout = '10s'");
    const guard = (await client.query("SELECT current_database() AS database,current_setting('transaction_read_only') AS read_only,current_setting('server_version_num') AS server_version_num")).rows[0];
    assert.equal(guard.database, "intern_system");
    assert.equal(guard.read_only, "on");
    assert.equal(Math.floor(Number(guard.server_version_num) / 10000), 16);
    const metadata = await catalog(async (sql, params) => (await client.query(sql, params)).rows);
    await client.query("ROLLBACK");
    const sources = fs.readdirSync(activeDirectory).filter(name => name.endsWith(".js")).sort();
    const preparedNames = fs.readdirSync(preparedDirectory).filter(name => name.endsWith(".js")).sort();
    assert.equal(preparedNames.some(name => sources.includes(name)), false);
    assert.equal(metadata.ledger.some(name => /^(019|020|021|022|023|024|025)_/.test(name)), false, "Development history changed; reassess before testing");
    for (const name of metadata.ledger) assert.ok(sources.includes(name), "Executed migration source is missing");
    return { inspected_at: new Date().toISOString(), guard, personal_rows_read: false, metadata, metadata_sha256: digest(metadata),
      active_pending: sources.filter(name => !metadata.ledger.includes(name)), prepared_names: preparedNames };
  } finally { await client.end(); }
}

function assertTestTarget(database, expected, marker, expectedMarker) {
  assert.match(expected, /^fitm_profile_2b1_[a-f0-9]{32}$/);
  assert.notEqual(database, "intern_system");
  assert.equal(database, expected);
  assert.equal(marker, expectedMarker);
}
async function createDisposable(preflight) {
  const settings = connectionSettings();
  const nonce = crypto.randomBytes(16).toString("hex");
  const name = "fitm_profile_2b1_" + nonce;
  const role = "fitm_p2b1_" + nonce;
  const password = crypto.randomBytes(32).toString("hex");
  const marker = "fitm.student_profile_phase2b1:" + nonce + ":synthetic-only";
  const admin = new Client({ ...settings, database: "postgres", application_name: "fitm_profile_2b1_provision", options: "-c statement_timeout=10000" });
  let createdRole = false, createdDatabase = false, db;
  let databaseOid;
  const cleanup = async () => {
    if (db) await db.close();
    if (createdDatabase) {
      const row = (await admin.query("SELECT oid,shobj_description(oid,'pg_database') AS marker,pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=$1", [name])).rows[0];
      assert.ok(row, "Created database unexpectedly missing; cleanup stopped");
      assert.equal(row.oid, databaseOid);
      assert.equal(row.owner, role);
      assertTestTarget(name, name, row.marker, marker);
      // Only the unique database created by this invocation; no FORCE and no
      // termination of other sessions. Never targets Development or Docker volumes.
      await admin.query("DROP DATABASE " + quote(name));
      createdDatabase = false;
    }
    if (createdRole) {
      assert.match(role, /^fitm_p2b1_[a-f0-9]{32}$/);
      await admin.query("DROP ROLE " + quote(role));
      createdRole = false;
    }
    await admin.end();
  };
  try {
    await admin.connect();
    const guard = (await admin.query("SELECT current_database() AS database,current_setting('server_version_num') AS server_version_num")).rows[0];
    assert.equal(guard.database, "postgres");
    assert.equal(guard.server_version_num, preflight.guard.server_version_num);
    await admin.query("CREATE ROLE " + quote(role) + " LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '" + password + "'");
    createdRole = true;
    // TEMPLATE template0 guarantees no personal rows are copied from any app DB.
    await admin.query("CREATE DATABASE " + quote(name) + " OWNER " + quote(role) + " TEMPLATE template0");
    createdDatabase = true;
    databaseOid = (await admin.query("SELECT oid FROM pg_database WHERE datname=$1", [name])).rows[0].oid;
    await admin.query("COMMENT ON DATABASE " + quote(name) + " IS '" + marker + "'");
    db = new Sequelize(name, role, password, {
      dialect: "postgres", host: settings.host, port: settings.port, logging: false,
      pool: { max: 5, min: 0, idle: 1000 },
      dialectOptions: { application_name: "fitm_profile_2b1_synthetic", options: "-c statement_timeout=10000 -c lock_timeout=5000" },
      hooks: { afterConnect: async connection => {
        const row = (await connection.query("SELECT current_database() AS database,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0];
        assertTestTarget(row.database, name, row.marker, marker);
      } },
    });
    await db.authenticate();
    const qi = db.getQueryInterface();
    // Explicitly approved ONLY for this guarded synthetic database; no live QI.
    qi.studentProfilePhase2BApproved = true;
    const makeRunner = names => new Umzug({
      migrations: names.map(filename => {
        const source = require(path.join(/^(022|023|024|025)_/.test(filename) ? preparedDirectory : activeDirectory, filename));
        return { name: filename, up: args => source.up(args), down: args => source.down(args) };
      }),
      context: qi, storage: new SequelizeStorage({ sequelize: db, tableName: "sequelize_meta" }), logger: undefined,
    });
    return {
      db, qi, name, marker, role, cleanup, makeRunner,
      query: (sql, replacements, transaction) => db.query(sql, { type: QueryTypes.SELECT, replacements, transaction }),
      catalog: () => catalog(sql => db.query(sql, { type: QueryTypes.SELECT })),
    };
  } catch (error) {
    await cleanup().catch(() => { /* Report the original provisioning failure; leave unexpected targets untouched. */ });
    throw error;
  }
}
module.exports = { workspace, activeDirectory, preparedDirectory, relevantTables, digest, readDevelopment, createDisposable, assertTestTarget };
