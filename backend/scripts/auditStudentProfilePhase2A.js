// Catalog/ledger only. Never imports app, Sequelize models, Umzug or a migration.
const { Client } = require("pg");
const fs = require("node:fs/promises");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
async function main() {
  const client = new Client({
    host: process.env.DB_HOST || "localhost", port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "intern_system", user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres", connectionTimeoutMillis: 5000,
    options: "-c default_transaction_read_only=on", application_name: "fitm_profile_phase2a_readonly",
  });
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const readOnly = (await client.query("SHOW transaction_read_only")).rows[0].transaction_read_only;
    if (readOnly !== "on") throw Object.assign(new Error("Read-only guard failed"), { code: "READ_ONLY_REQUIRED" });
    await client.query("SET LOCAL statement_timeout = '5s'");
    const tables = ["students", "student_profiles", "student_files", "coop_requests", "coop_request_reviews", "coop_documents", "coop_document_revisions"];
    const columns = (await client.query(
      "SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,character_maximum_length,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1) ORDER BY table_name,ordinal_position", [tables],
    )).rows;
    const constraints = (await client.query(
      "SELECT c.relname AS table_name,k.conname AS name,k.contype AS type,k.convalidated AS validated,pg_get_constraintdef(k.oid) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1) ORDER BY c.relname,k.conname", [tables],
    )).rows;
    const indexes = (await client.query(
      "SELECT tablename AS table_name,indexname AS name,indexdef AS definition FROM pg_catalog.pg_indexes WHERE schemaname='public' AND tablename=ANY($1) ORDER BY tablename,indexname", [tables],
    )).rows;
    const enums = (await client.query(
      "SELECT t.typname AS name,e.enumlabel AS value FROM pg_catalog.pg_enum e JOIN pg_catalog.pg_type t ON t.oid=e.enumtypid JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='enum_student_files_file_type' ORDER BY e.enumsortorder",
    )).rows;
    const triggers = (await client.query(
      "SELECT c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid) AS definition FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname=ANY($1) ORDER BY c.relname,t.tgname", [tables],
    )).rows;
    const allTables = (await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row => row.tablename);
    const ledger = allTables.includes("sequelize_meta")
      ? (await client.query('SELECT name FROM public.sequelize_meta ORDER BY name')).rows.map(row => row.name) : [];
    const activeMigrations = (await fs.readdir(path.resolve(__dirname, "../src/db/migrations"))).filter(name => name.endsWith(".js")).sort();
    const result = {
      inspected_at: new Date().toISOString(), transaction_read_only: readOnly,
      server_version_num: (await client.query("SHOW server_version_num")).rows[0].server_version_num,
      personal_rows_read: false, all_tables: allTables, columns, constraints, indexes, enums, triggers,
      executed_migrations: ledger, pending_migrations: activeMigrations.filter(name => !ledger.includes(name)),
    };
    await client.query("ROLLBACK");
    await fs.writeFile(path.resolve(__dirname, "../../docs/audits/FITM_STUDENT_PROFILE_PHASE2A_SCHEMA_SNAPSHOT.json"), JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify({ read_only: readOnly, personal_rows_read: false, table_count: allTables.length,
      executed_migrations: ledger, pending_migrations: result.pending_migrations }));
  } finally { await client.end().catch(() => {}); }
}
main().catch(error => { console.error("Read-only schema audit unavailable:", /^[A-Z0-9_]+$/.test(error.code || "") ? error.code : "READ_ONLY_AUDIT_FAILED"); process.exitCode = 1; });
