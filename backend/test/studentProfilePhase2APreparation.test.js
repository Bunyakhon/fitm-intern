const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Sequelize, DataTypes } = require("sequelize");
const preparedRoot = path.resolve(__dirname, "../src/db/prepared/student-profile-phase2a");
const { extensions, tables, newFileTypes, existingFileTypes, pendingAcknowledgementDesign } = require(path.join(preparedRoot, "schema"));
const { extensionAttributes, defineRelationModels, associateRelations, preparedFileIndexes } = require(path.join(preparedRoot, "models"));
const { rows } = require("../scripts/prepareStudentProfilePhase2AReference");
const migrations = fs.readdirSync(path.join(preparedRoot, "migrations")).sort().map(name => ({
  name, migration: require(path.join(preparedRoot, "migrations", name)),
}));
const { PROFILE_FIELDS } = require("../src/services/studentProfileIntegrity");

test("prepared sources are outside the live Umzug glob and model autoload directory", () => {
  const migrateSource = fs.readFileSync(path.resolve(__dirname, "../src/db/migrate.js"), "utf8");
  assert.match(migrateSource, /glob:\s*\["\*\.js"/);
  assert.match(migrateSource, /path\.join\(__dirname, "migrations"\)/);
  const active = fs.readdirSync(path.resolve(__dirname, "../src/db/migrations"));
  for (const { name } of migrations) assert.equal(active.includes(name), false);
  const loader = fs.readFileSync(path.resolve(__dirname, "../src/models/index.js"), "utf8");
  assert.match(loader, /readdirSync\(__dirname\)/);
  assert.equal(fs.readdirSync(path.resolve(__dirname, "../src/models")).some(name => name.includes("phase2a")), false);
  assert.equal(migrations.length, 4);
});

test("every prepared up refuses the ordinary QueryInterface before SQL or transactions", async () => {
  for (const { migration } of migrations) {
    let called = false;
    const context = { sequelize: { transaction() { called = true; }, query() { called = true; } } };
    await assert.rejects(migration.up({ context }), /PHASE_2B_APPROVAL_REQUIRED/);
    assert.equal(called, false);
  }
});

test("prepared SQL uses one transaction per migration with bounded locks", async () => {
  for (const { migration } of migrations) {
    const calls = [], transaction = { fixture: true };
    const context = {
      studentProfilePhase2BApproved: true, // Mock only. No database object exists.
      sequelize: {
        getDialect: () => "postgres",
        transaction: async callback => callback(transaction),
        query: async (sql, options) => { assert.equal(options.transaction, transaction); calls.push(sql); },
      },
    };
    await migration.up({ context });
    assert.deepEqual(calls, ["SET LOCAL lock_timeout = '5s'", "SET LOCAL statement_timeout = '60s'", ...migration.statements]);
  }
});

test("query failure propagates out of the managed transaction without issuing subsequent DDL", async () => {
  const { migration } = migrations[0];
  let rolledBack = false, commits = 0, calls = 0;
  const context = { studentProfilePhase2BApproved: true, sequelize: {
    getDialect: () => "postgres",
    transaction: async callback => { try { await callback({}); commits++; } catch (error) { rolledBack = true; throw error; } },
    query: async () => { if (++calls === 4) throw new Error("FIXTURE_DDL_FAILURE"); },
  } };
  await assert.rejects(migration.up({ context }), /FIXTURE_DDL_FAILURE/);
  assert.equal(rolledBack, true);
  assert.equal(commits, 0);
  assert.equal(calls, 4);
});

test("all down handlers preserve data and cannot remove PostgreSQL enum values", async () => {
  for (const { migration } of migrations) await assert.rejects(migration.down({ context: {} }), /PRESERVE_DATA/);
});

test("only additive DDL is prepared, with no old-row DML or destructive alterations", () => {
  const allowed = /^(?:ALTER TABLE public\.[\w"]+ ADD (?:COLUMN|CONSTRAINT)|CREATE TABLE public\.|CREATE (?:UNIQUE )?INDEX |ALTER TYPE public\.enum_student_files_file_type ADD VALUE)/;
  for (const { migration } of migrations) for (const sql of migration.statements) {
    assert.match(sql, allowed);
    assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE|DELETE FROM|UPDATE public\.|INSERT INTO|RENAME|ALTER COLUMN)\b/i);
  }
});

test("new personal columns stay nullable and never shadow any Phase 1 editable field", () => {
  for (const [name, spec] of Object.entries(extensions)) {
    for (const [field, column] of Object.entries(spec.columns)) {
      assert.equal(PROFILE_FIELDS.includes(field), false, name + "." + field);
      if (!["profile_data_revision", "is_current"].includes(field)) {
        assert.equal(column.nullable, true);
        assert.equal(column.defaultSql, undefined);
      }
    }
  }
  assert.equal(extensions.students.columns.profile_data_revision.type, "bigint");
  assert.equal(extensions.students.columns.profile_data_revision.defaultSql, "0");
  assert.equal(extensions.student_profiles.columns.national_id_ciphertext.type, "bytea");
  assert.equal("national_id" in extensions.student_profiles.columns, false);
  assert.match(extensions.student_profiles.checks.phase2a_national_id_pair, /IS NULL/);
});

test("enum additions commit separately from new-label indexes and CHECK constraints", () => {
  const enumMigration = migrations.find(row => row.name.startsWith("024")).migration;
  assert.equal(enumMigration.statements.length, 5);
  assert.equal(enumMigration.statements.every(sql => sql.startsWith("ALTER TYPE")), true);
  const fileMigration = migrations.find(row => row.name.startsWith("025")).migration;
  assert.equal(fileMigration.statements.some(sql => sql.includes("phase2a_profile_document_current")), true);
  assert.equal(fileMigration.statements.some(sql => sql.includes("file_type::text")), false);
  assert.deepEqual(existingFileTypes, ["coop_poster", "coop_project_book", "coop_practice_log_book", "resume"]);
  assert.equal(new Set([...existingFileTypes, ...newFileTypes]).size, 9);
});

test("file references cannot cross owners and old resume/project indexes are untouched", () => {
  const sql = migrations.find(row => row.name.startsWith("025")).migration.statements.join("\n");
  assert.match(sql, /UNIQUE \(id, student_id\)/);
  assert.match(sql, /FOREIGN KEY \(supersedes_file_id, student_id\) REFERENCES public.student_files\(id, student_id\).*ON DELETE RESTRICT/);
  for (const old of ["student_files_one_resume_per_student", "student_files_current_coop_project_unique", "student_files_storage_path_key"]) assert.equal(sql.includes(old), false);
  assert.equal(preparedFileIndexes[0].unique, true);
  assert.equal(preparedFileIndexes[0].where.is_current, true);
});

test("relations have UUID owner FKs, ordering and no hard five-training-record limit", () => {
  assert.equal(Object.keys(tables).length, 4);
  for (const spec of Object.values(tables)) {
    assert.equal(spec.columns.id.primaryKey, true);
    assert.equal(spec.columns.student_id.references, "students");
    assert.equal(spec.columns.student_id.nullable, false);
    assert.equal(spec.columns.student_id.deleteBehavior, "CASCADE");
  }
  assert.deepEqual(tables.student_addresses.unique, [["student_id", "address_type"]]);
  assert.equal(tables.student_education_records.unique, undefined);
  assert.deepEqual(Object.keys(tables.student_training_records.checks), ["display_order"]);
});

test("real Sequelize factories register only new relations without authenticating or syncing", async () => {
  const sequelize = new Sequelize("fixture", "fixture", "fixture", { dialect: "postgres", logging: false });
  sequelize.authenticate = sequelize.sync = sequelize.query = () => { throw new Error("DATABASE_ACCESS_FORBIDDEN"); };
  const relations = defineRelationModels(sequelize);
  assert.deepEqual(Object.keys(relations).sort(), Object.values(tables).map(spec => spec.modelName).sort());
  assert.equal(sequelize.models.Student, undefined);
  assert.equal(sequelize.models.Account, undefined);
  const fakeExistingStudent = sequelize.define("ExistingStudentFixture", { id: { type: DataTypes.UUID, primaryKey: true } });
  associateRelations(fakeExistingStudent, relations);
  for (const spec of Object.values(tables)) {
    const model = relations[spec.modelName];
    assert.equal(model.tableName, Object.keys(tables).find(name => tables[name] === spec));
    assert.equal(model.associations.student.foreignKey, "student_id");
    assert.equal(fakeExistingStudent.associations[spec.association].foreignKey, "student_id");
    assert.equal(model.rawAttributes.created_at.field, "created_at");
    assert.equal(model.rawAttributes.updated_at.field, "updated_at");
  }
  assert.equal(extensionAttributes("students").profile_data_revision.defaultValue, "0");
  assert.deepEqual(extensionAttributes("student_files").file_type.type.values, [...existingFileTypes, ...newFileTypes]);
  await sequelize.close();
});

test("relation model draft validation rejects invalid levels, GPA, ordering and proficiency", async () => {
  const sequelize = new Sequelize("fixture", "fixture", "fixture", { dialect: "postgres", logging: false });
  sequelize.query = () => { throw new Error("DATABASE_ACCESS_FORBIDDEN"); };
  const models = defineRelationModels(sequelize);
  const owner = "11111111-1111-4111-8111-111111111111";
  for (const values of [{ education_level: "invented" }, { education_level: "bachelor", gpa: "4.01" },
    { education_level: "bachelor", graduation_year: 0 }, { education_level: "bachelor", display_order: -1 }]) {
    await assert.rejects(models.StudentEducationRecord.build({ student_id: owner, ...values }).validate());
  }
  await models.StudentEducationRecord.build({ student_id: owner, education_level: "bachelor", gpa: "4.00", graduation_year: null }).validate();
  for (const proficiency of ["very_good", "good", "moderate", "fair", null]) {
    await models.StudentSkill.build({ student_id: owner, category: "language", skill_name: "Fixture language", proficiency }).validate();
  }
  await assert.rejects(models.StudentSkill.build({ student_id: owner, category: "language", proficiency: "expert" }).validate());
  await models.StudentTrainingRecord.build({ student_id: owner, course_name: null, period_text: null }).validate();
  await sequelize.close();
});

test("coverage keeps all 148 PDF points and all 16 workflow entries without falsely completing them", () => {
  assert.equal(rows.length, 148);
  const counts = {};
  for (const row of rows) counts[row.auditStatus] = (counts[row.auditStatus] || 0) + 1;
  assert.deepEqual(counts, { COMPLETE: 24, MISSING: 96, PARTIAL: 12, "DIFFERENT WORKFLOW": 16 });
  assert.equal(rows.filter(row => row.category === "Existing Workflow").length, 16);
  assert.equal(rows.find(row => row.id === "P1-10").category, "Pending Policy");
  assert.match(rows.find(row => row.id === "P4-19").plan, /defer/);
  assert.equal(Object.keys(pendingAcknowledgementDesign).length, 2);
  assert.equal(migrations.some(({ migration }) => migration.statements.some(sql => /CREATE TABLE.*acknowledgement/.test(sql))), false);
});
