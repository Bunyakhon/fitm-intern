// Restore verification only. Development catalog reads are READ ONLY.
// PostgreSQL itself parses CHECK definitions; SQL casts/operators are never stripped.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { Client } = require("pg");
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Location is a parser source-byte offset, not an expression value. Keep every
// other node field, including type/collation/operator/function IDs and constants.
function expressionTree(tree) {
  return tree.replace(/:location -?\d+\b/g, ":location <source-offset>");
}
const detailSql = {
  database: "SELECT pg_encoding_to_char(encoding) AS encoding,datcollate,datctype,datlocprovider,daticulocale,datcollversion FROM pg_database WHERE datname=current_database()",
  columns: "SELECT c.relname AS table_name,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,a.attidentity,a.attgenerated,a.attstorage,a.attcompression,a.attstattarget,a.attacl,co.collname AS collation,co.collprovider,co.collcollate,co.collctype,co.colliculocale,co.collversion,pg_get_expr(d.adbin,d.adrelid) AS default_expression FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_collation co ON co.oid=a.attcollation LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attname",
  constraints: "SELECT c.relname AS table_name,k.conname AS name,k.contype,k.convalidated,k.condeferrable,k.condeferred,k.connoinherit,k.conislocal,k.coninhcount,k.confupdtype,k.confdeltype,k.confmatchtype,CASE WHEN k.confrelid<>0 THEN k.confrelid::regclass::text ELSE NULL END AS referenced_table,(SELECT array_agg(a.attname::text ORDER BY u.ord) FROM unnest(k.conkey) WITH ORDINALITY u(num,ord) JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=u.num) AS columns,(SELECT array_agg(a.attname::text ORDER BY u.ord) FROM unnest(k.confkey) WITH ORDINALITY u(num,ord) JOIN pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=u.num) AS referenced_columns,pg_get_constraintdef(k.oid) AS definition,pg_get_expr(k.conbin,k.conrelid) AS expression FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname",
  indexes: "SELECT c.relname AS table_name,ic.relname AS name,i.indisunique,i.indisprimary,i.indisexclusion,i.indimmediate,i.indisvalid,i.indisready,i.indislive,i.indisreplident,i.indnullsnotdistinct,am.amname,pg_get_indexdef(i.indexrelid) AS definition,pg_get_expr(i.indpred,i.indrelid) AS predicate FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_class ic ON ic.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_am am ON am.oid=ic.relam WHERE n.nspname='public' ORDER BY c.relname,ic.relname",
  functions: "SELECT p.proname AS name,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_functiondef(p.oid) AS definition,p.provolatile,p.proisstrict,p.prosecdef,p.proleakproof,p.proparallel,p.proconfig,p.proacl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' ORDER BY p.proname,pg_get_function_identity_arguments(p.oid)",
  triggers: "SELECT c.relname AS table_name,t.tgname AS name,t.tgenabled,t.tgdeferrable,t.tginitdeferred,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname",
  extensions: "SELECT e.extname,e.extversion,n.nspname AS schema,e.extrelocatable,pg_get_userbyid(e.extowner) AS owner,e.extcondition,(SELECT array_agg(x::regclass::text ORDER BY ord) FROM unnest(e.extconfig) WITH ORDINALITY u(x,ord)) AS configuration_tables FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace ORDER BY e.extname",
  sequences: "SELECT schemaname,sequencename,data_type::text,start_value::text,min_value::text,max_value::text,increment_by::text,cycle,cache_size::text,last_value::text FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename",
  relations: "SELECT c.relname,c.relkind,c.relpersistence,c.relrowsecurity,c.relforcerowsecurity,c.relacl,c.reloptions,c.relreplident FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f') ORDER BY c.relname",
  schemas: "SELECT nspname,nspacl,pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema' ORDER BY nspname",
  types: "SELECT t.typname,t.typtype,t.typcategory,format_type(t.typbasetype,t.typtypmod) AS base_type,t.typnotnull,t.typdefault,t.typacl FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype IN ('d','e','r','m') ORDER BY t.typname",
  views: "SELECT c.relname,c.relkind,pg_get_viewdef(c.oid) AS definition FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('v','m') ORDER BY c.relname",
  policies: "SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname",
  dependencies: "SELECT DISTINCT pg_describe_object(d.classid,d.objid,d.objsubid) AS object,pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid) AS referenced,d.deptype FROM pg_depend d CROSS JOIN LATERAL pg_identify_object(d.classid,d.objid,d.objsubid) x WHERE x.schema='public' ORDER BY object,referenced,d.deptype",
  runtime_permissions: "SELECT current_user AS role,has_database_privilege(current_user,current_database(),'CONNECT') AS connect,has_database_privilege(current_user,current_database(),'TEMP') AS temporary,has_schema_privilege(current_user,'public','USAGE') AS schema_usage,c.relname,has_table_privilege(current_user,c.oid,'SELECT') AS can_select,has_table_privilege(current_user,c.oid,'INSERT') AS can_insert,has_table_privilege(current_user,c.oid,'UPDATE') AS can_update,has_table_privilege(current_user,c.oid,'DELETE') AS can_delete FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname",
};
async function readDetailed(client) {
  const result = {};
  for (const [key, sql] of Object.entries(detailSql)) result[key] = (await client.query(sql)).rows;
  for (const sequence of result.sequences) {
    const state = (await client.query("SELECT last_value::text,is_called FROM public." + quote(sequence.sequencename))).rows[0];
    Object.assign(sequence, state);
  }
  // The backup uses --no-owner/--no-privileges. Fail on custom object grants,
  // unexpected owners or security-definer functions instead of silently dropping them.
  result.ownership = (await client.query("SELECT DISTINCT pg_get_userbyid(c.relowner) AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY owner")).rows;
  result.function_ownership = (await client.query("SELECT DISTINCT pg_get_userbyid(p.proowner) AS owner FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY owner")).rows;
  return result;
}
async function readDevelopmentDetails(settings) {
  const client = new Client({ ...settings, database: "intern_system", options: "-c default_transaction_read_only=on" });
  try {
    await client.connect(); await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL statement_timeout='15s'");
    assert.equal((await client.query("SELECT current_database() AS name")).rows[0].name, "intern_system");
    const result = await readDetailed(client);
    await client.query("ROLLBACK"); return result;
  } finally { await client.end(); }
}
function properties(constraint) {
  const { definition, expression, ...rest } = constraint;
  return rest;
}
async function parsePair(client, pair, index) {
  const table = "fitm_check_" + index;
  await client.query("CREATE TEMP TABLE " + quote(table) + " (LIKE public." + quote(pair.original.table_name) + ") ON COMMIT DROP");
  const canonical = [];
  for (const [suffix, constraint] of [["a", pair.original], ["b", pair.restored]]) {
    await client.query("ALTER TABLE pg_temp." + quote(table) + " ADD CONSTRAINT " + quote("proof_" + suffix) + " " + constraint.definition);
    canonical.push((await client.query("SELECT pg_get_constraintdef(oid) AS definition,pg_get_expr(conbin,conrelid) AS expression,conbin::text AS tree FROM pg_constraint WHERE conrelid=$1::regclass AND conname=$2",
      ["pg_temp." + table, "proof_" + suffix])).rows[0]);
  }
  return { table, canonical };
}
function syntheticCases(pair, columns) {
  const fields = pair.original.columns || [];
  const literals = [...pair.original.definition.matchAll(/'((?:[^']|'')*)'/g)].map(match => match[1].replaceAll("''", "'"));
  const numericBounds = [...pair.original.definition.matchAll(/(?:>=|<=|>|<|=)\s*(\d+)/g)].map(match => Number(match[1]));
  const options = {};
  for (const field of fields) {
    const spec = columns.find(row => row.table_name === pair.original.table_name && row.name === field);
    if (/\b(?:smallint|integer|bigint|numeric)/.test(spec.type)) options[field] = [...new Set([null, -1, 0, 1, 9, 10, 11, ...numericBounds.flatMap(n => [n - 1, n, n + 1])])];
    else if (spec.type === "uuid") options[field] = [null, "11111111-1111-4111-8111-111111111111"];
    else if (spec.type === "boolean") options[field] = [null, true, false];
    else if (/^timestamp/.test(spec.type)) options[field] = [null, "2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z"];
    else if (spec.type === "date") options[field] = [null, "2024-01-01", "2024-02-29"];
    else if (spec.type === "jsonb" || spec.type === "json") options[field] = [null, {}, { synthetic: true }, []];
    else options[field] = [...new Set([null, "", " ", "Synthetic", ...literals, "a".repeat(64), "G".repeat(64),
      ...numericBounds.filter(n => n > 0 && n <= 5000).flatMap(n => ["x".repeat(n), "x".repeat(n + 1)])])]
      .filter(value => value === null || !/character varying\((\d+)\)/.test(spec.type) || value.length <= Number(spec.type.match(/\((\d+)\)/)[1]));
  }
  const result = [{}];
  for (const field of fields) for (const value of options[field]) result.push({ [field]: value });
  // Sample combinations, including all workflow role/status/decision variants,
  // not just one-field-at-a-time values which can be hidden behind another AND.
  let state = 1234567;
  for (let i = 0; i < 768; i++) {
    const row = {};
    for (const field of fields) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; row[field] = options[field][state % options[field].length]; }
    result.push(row);
  }
  return [...new Map(result.map(row => [JSON.stringify(row), row])).values()];
}
async function provePair(client, pair, index, columns) {
  const result = { schema: "public", table: pair.original.table_name, name: pair.original.name,
    development: pair.original, restored: pair.restored, classification: "UNVERIFIED" };
  if (!same(properties(pair.original), properties(pair.restored))) {
    result.classification = "NOT EQUIVALENT"; result.reason = "CONSTRAINT_PROPERTIES_CHANGED"; return result;
  }
  const { table, canonical } = await parsePair(client, pair, index);
  const trees = canonical.map(item => expressionTree(item.tree));
  result.postgresql_roundtrip = {
    development: canonical[0].definition, restored: canonical[1].definition,
    expression_tree_sha256: trees.map(hash), tree_equal: trees[0] === trees[1],
    ignored_tree_fields: ["parser source-byte location only"],
  };
  const rows = syntheticCases(pair, columns);
  const evaluated = (await client.query("SELECT (" + canonical[0].expression + ") AS original,(" + canonical[1].expression + ") AS restored FROM jsonb_array_elements($1::jsonb) item CROSS JOIN LATERAL jsonb_populate_record(NULL::pg_temp." + quote(table) + ",item) fixture",
    [JSON.stringify(rows)])).rows;
  result.behavior = { synthetic_cases: evaluated.length, true: 0, false: 0, unknown: 0, mismatches: 0 };
  for (const row of evaluated) {
    result.behavior[row.original === null ? "unknown" : row.original ? "true" : "false"]++;
    if (row.original !== row.restored) result.behavior.mismatches++;
  }
  result.classification = trees[0] === trees[1] && result.behavior.mismatches === 0 ? "EQUIVALENT" : "NOT EQUIVALENT";
  result.reason = result.classification === "EQUIVALENT" ? "POSTGRESQL_PARSED_TREES_AND_PROPERTIES_EQUAL" : "EXPRESSION_OR_BEHAVIOR_CHANGED";
  return result;
}
function compareMetadata(original, restored, proven) {
  const adjusted = { ...restored, constraints: restored.constraints.map(row => {
    const proof = proven.find(item => item.table === row.table_name && item.name === row.name);
    if (proof?.classification !== "EQUIVALENT") return row;
    const source = original.constraints.find(item => item.table_name === row.table_name && item.name === row.name);
    return { ...row, definition: source.definition };
  }) };
  assert.deepEqual(adjusted, original, "RESTORE_CATALOG_OBJECT_MISMATCH");
}
function compareDetails(original, restored) {
  const checks = {};
  for (const key of Object.keys(detailSql).filter(key => key !== "constraints")) {
    assert.deepEqual(restored[key], original[key], "RESTORE_DETAIL_" + key.toUpperCase() + "_MISMATCH");
    checks[key] = { status: "PASS", objects: original[key].length };
  }
  return checks;
}
async function semanticRegressions(client, details) {
  const score = details.constraints.find(row => row.name === "company_evaluations_scores_check");
  const purpose = details.constraints.find(row => row.name === "company_access_tokens_purpose_check");
  const reason = details.constraints.find(row => row.name === "coop_reviews_reason_check");
  const variations = [
    ["score upper bound 10 -> 9", score, { definition: score.definition.replace("q1_score <= 10", "q1_score <= 9") }],
    ["comparison <= -> >=", score, { definition: score.definition.replace("q1_score <= 10", "q1_score >= 10") }],
    ["AND -> OR", score, { definition: score.definition.replace(" AND ", " OR ") }],
    ["allowed purpose changed", purpose, { definition: purpose.definition.replace("'email_verification'", "'synthetic_removed_value'") }],
    ["NULL acceptance changed", reason, { definition: reason.definition.replace("reason IS NOT NULL", "reason IS NULL") }],
    ["NOT VALID status changed", reason, { convalidated: !reason.convalidated }],
    ["NO INHERIT property changed", purpose, { connoinherit: !purpose.connoinherit }],
  ];
  const results = [];
  for (const [index, [name, original, change]] of variations.entries()) {
    const proof = await provePair(client, { original, restored: { ...original, ...change } }, 1000 + index, details.columns);
    assert.equal(proof.classification, "NOT EQUIVALENT", "SEMANTIC_REGRESSION_NOT_DETECTED");
    if (change.definition) assert.ok(proof.behavior.mismatches > 0, "BEHAVIORAL_REGRESSION_NOT_DETECTED");
    results.push({ name, status: "PASS", detected: proof.reason, mismatches: proof.behavior?.mismatches || 0 });
  }
  return results;
}
async function verifyRecovery(before, restored, settings) {
  assert.match(restored.identity.database, /^fitm_profile_2b2_restore_[a-f0-9]{32}$/);
  assert.notEqual(restored.identity.database, "intern_system");
  const originalDetails = await readDevelopmentDetails(settings);
  const client = new Client({ ...settings, database: restored.identity.database });
  const result = { status: "BLOCKED", verified_at: new Date().toISOString(), method: "PostgreSQL parse/deparse and conbin trees on empty TEMP clone; strict catalog properties; synthetic TRUE/FALSE/NULL probes", constraints: [], object_checks: {} };
  try {
    await client.connect();
    assert.equal((await client.query("SELECT current_database() AS name")).rows[0].name, restored.identity.database);
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path=public,pg_catalog");
    await client.query("SET LOCAL statement_timeout='30s'");
    const restoredDetails = await readDetailed(client);
    result.object_checks = compareDetails(originalDetails, restoredDetails);
    // Explicit owner mapping is the intended --no-owner restoration isolation.
    assert.equal(originalDetails.ownership.length, 1);
    assert.equal(originalDetails.ownership[0].owner, settings.user);
    assert.equal(restoredDetails.ownership.length, 1);
    assert.match(restoredDetails.ownership[0].owner, /^fitm_p2b2_[a-f0-9]{32}$/);
    assert.deepEqual(originalDetails.function_ownership, originalDetails.ownership);
    assert.deepEqual(restoredDetails.function_ownership, restoredDetails.ownership);
    assert.ok(originalDetails.functions.every(row => !row.prosecdef && row.proacl === null));
    assert.ok(originalDetails.relations.every(row => row.relacl === null));
    result.object_checks.ownership = { status: "PASS", mapping: "development owner -> invocation-owned NOLOGIN restore role; no custom object ACLs or SECURITY DEFINER functions" };
    for (const [index, original] of originalDetails.constraints.entries()) {
      const target = restoredDetails.constraints.find(row => row.table_name === original.table_name && row.name === original.name);
      assert.ok(target, "MISSING_RESTORED_CONSTRAINT");
      if (original.contype === "c") {
        const proof = await provePair(client, { original, restored: target }, index, originalDetails.columns);
        proof.raw_definition_changed = original.definition !== target.definition;
        result.constraints.push(proof);
      } else assert.deepEqual(target, original, "NON_CHECK_CONSTRAINT_CHANGED");
    }
    assert.equal(restoredDetails.constraints.length, originalDetails.constraints.length);
    result.summary = {
      all_checks: result.constraints.length,
      raw_differences: result.constraints.filter(row => row.raw_definition_changed).length,
      EQUIVALENT: result.constraints.filter(row => row.raw_definition_changed && row.classification === "EQUIVALENT").length,
      NOT_EQUIVALENT: result.constraints.filter(row => row.raw_definition_changed && row.classification === "NOT EQUIVALENT").length,
      UNVERIFIED: result.constraints.filter(row => row.raw_definition_changed && row.classification === "UNVERIFIED").length,
      total_behavior_cases: result.constraints.reduce((sum, row) => sum + (row.behavior?.synthetic_cases || 0), 0),
    };
    assert.ok(result.constraints.every(row => row.classification === "EQUIVALENT"), "CHECK_SEMANTICS_UNVERIFIED");
    compareMetadata(before.metadata, restored.metadata, result.constraints);
    assert.deepEqual(restored.rows, before.rows, "RESTORE_DATA_MISMATCH");
    assert.equal(restored.duplicateProfiles, before.duplicateProfiles);
    assert.equal(restored.invalidIndexes, "0");
    result.semantic_regressions = await semanticRegressions(client, restoredDetails);
    result.object_checks.basic_catalog_and_ledger = { status: "PASS" };
    result.object_checks.all_legacy_data = { status: "PASS", tables: Object.keys(before.rows).length, counts_and_checksums_equal: true };
    result.status = "PASS";
    await client.query("ROLLBACK"); // Also removes every TEMP proof table.
    return result;
  } finally { await client.end(); }
}
module.exports = { expressionTree, readDetailed, readDevelopmentDetails, properties, provePair, compareMetadata, compareDetails, verifyRecovery, semanticRegressions };
