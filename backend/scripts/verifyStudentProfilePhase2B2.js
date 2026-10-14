// Post-install verification only: no DDL, sync, update, or real-account HTTP writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Sequelize } = require("sequelize");
const { settings, validateTarget, readSnapshot, verifyOldState, verifyPreparedSchema } = require("./installStudentProfilePhase2B2");
const { readDevelopmentDetails, properties } = require("./lib/studentProfileRestoreVerification");
const { preparedNames } = require("../src/db/studentProfileMigrationDiscovery");
const factories = require("../src/db/prepared/student-profile-phase2a/models");
const specs = require("../src/db/prepared/student-profile-phase2a/schema");
const workspace = path.resolve(__dirname, "../..");
const evidence = JSON.parse(fs.readFileSync(path.join(workspace, "docs/audits/FITM_STUDENT_PROFILE_PHASE2B2_RESULTS.json")));

async function main() {
  validateTarget();
  assert.equal(evidence.status, "PASS");
  const backupRoot = path.resolve(process.env.LOCALAPPDATA, "fitm-intern-backups") + path.sep;
  const directory = path.resolve(evidence.backup.directory);
  assert.ok(directory.startsWith(backupRoot));
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "recovery-manifest.json")));
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(evidence.backup.archive)).digest("hex"), evidence.backup.sha256);
  const current = await readSnapshot("intern_system", manifest.baseline.metadata.columns);
  verifyOldState(manifest.baseline, current, preparedNames);
  verifyPreparedSchema(current);
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(current.metadata)).digest("hex"), evidence.after.metadata_sha256);
  const detailed = await readDevelopmentDetails(settings);
  for (const proof of evidence.recovery_verification.constraints) {
    const actual = detailed.constraints.find(row => row.table_name === proof.table && row.name === proof.name);
    assert.deepEqual(properties(actual), properties(proof.development));
    assert.equal(actual.definition, proof.development.definition);
  }
  assert.equal(detailed.sequences.length, 0);
  assert.ok(detailed.columns.every(column => column.attidentity === ""));
  const temporaryObjects = [];
  const { Client } = require("pg");
  const catalog = new Client({ ...settings, database: "intern_system", options: "-c default_transaction_read_only=on" });
  try {
    await catalog.connect();
    temporaryObjects.push(...(await catalog.query("SELECT datname AS name FROM pg_database WHERE datname LIKE 'fitm_profile_2b2_restore_%' UNION ALL SELECT rolname FROM pg_roles WHERE rolname LIKE 'fitm_p2b2_%' ORDER BY name")).rows);
    assert.equal(temporaryObjects.length, 0, "UNEXPECTED_RESTORE_DATABASE_OR_ROLE_REMAINS");
  } finally { await catalog.end(); }

  // Isolated registry only; importing the live app registry would activate models.
  const sequelize = new Sequelize("intern_system", settings.user, settings.password, {
    host: settings.host, port: settings.port, dialect: "postgres", logging: false,
    dialectOptions: { options: "-c default_transaction_read_only=on" },
  });
  sequelize.addHook("afterConnect", async connection => {
    const identity = (await connection.query("SELECT current_database() AS database,current_setting('default_transaction_read_only') AS read_only")).rows[0];
    assert.equal(identity.database, "intern_system"); assert.equal(identity.read_only, "on");
  });
  let liveModelCount;
  try {
    const models = {};
    const modelDirectory = path.join(workspace, "backend/src/models");
    for (const file of fs.readdirSync(modelDirectory).filter(name => name.endsWith(".model.js"))) {
      const model = require(path.join(modelDirectory, file))(sequelize);
      models[model.name] = model;
    }
    liveModelCount = Object.keys(models).length;
    for (const model of Object.values(models)) if (model.associate) model.associate(models);
    for (const modelName of ["Student", "StudentProfile", "StudentFile"]) {
      const model = models[modelName];
      assert.deepEqual(await model.findAll({ limit: 0 }), []);
      Object.assign(model.rawAttributes, factories.extensionAttributes(model.getTableName()));
      model.refreshAttributes();
      assert.deepEqual(await model.findAll({ limit: 0 }), []);
    }
    const relations = factories.defineRelationModels(sequelize);
    factories.associateRelations(models.Student, relations);
    assert.deepEqual(await models.Student.findAll({ limit: 0, include: Object.values(specs.tables).map(spec => ({ model: relations[spec.modelName], as: spec.association })) }), []);
    for (const model of Object.values(relations)) {
      assert.deepEqual(await model.findAll({ limit: 0 }), []);
      assert.equal(await model.count(), 0);
    }
  } finally { await sequelize.close(); }
  const health = await fetch("http://localhost:5000/health/db");
  assert.equal(health.status, 200);
  const unauthorized = await fetch("http://localhost:5000/api/student-profile/me");
  assert.equal(unauthorized.status, 401);
  const result = {
    status: "PASS", verified_at: new Date().toISOString(), database: "intern_system", read_only: true,
    all_28_legacy_table_checksums_unchanged: true, original_45_check_properties_and_definitions_unchanged: true,
    schema_matches_install_evidence: true, new_relation_counts: Object.fromEntries(Object.keys(specs.tables).map(table => [table, 0])),
    sequelize: { live_models_defined: liveModelCount, existing_and_prepared_zero_row_queries: "PASS", prepared_association_query: "PASS", live_registration_changed: false },
    sequences: 0, identity_columns: 0, temporary_databases_and_roles_remaining: temporaryObjects.length,
    backend_database_health: health.status, unauthorized_profile_status: unauthorized.status,
  };
  fs.writeFileSync(path.join(workspace, "docs/audits/FITM_STUDENT_PROFILE_PHASE2B2_POST_INSTALL.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(JSON.stringify({ status: "FAIL", reason: error.code || error.message })); process.exitCode = 1; });
