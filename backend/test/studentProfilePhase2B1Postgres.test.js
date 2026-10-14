const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Module, createRequire } = require("node:module");
const support = require("./helpers/studentProfilePhase2B1Postgres");
const specs = require("../src/db/prepared/student-profile-phase2a/schema");
const preparedModels = require("../src/db/prepared/student-profile-phase2a/models");
const { PROFILE_FIELDS, profileRevision } = require("../src/services/studentProfileIntegrity");
const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const EMPTY = "33333333-3333-4333-8333-333333333333";
const randomId = () => crypto.randomUUID();
const failureCode = error => error.original?.code || error.parent?.code || error.code;
const isCode = expected => error => failureCode(error) === expected;
const evidenceFile = path.join(support.workspace, "docs/audits/FITM_STUDENT_PROFILE_PHASE2B1_POSTGRES_RESULTS.json");

test("Phase 2B.1 real PostgreSQL 16 migration pre-flight on a unique synthetic database", {
  skip: process.env.FITM_PROFILE_PHASE2B1_TEST !== "true",
  timeout: 180000,
}, async t => {
  const evidence = { phase: "2B.1", started_at: new Date().toISOString(), tests: [], production_business_logic_changed: false,
    development_personal_rows_read: false, test_data: "synthetic only; template0; no development data copied",
    not_tested: ["Live Development migration", "Destructive migration down (intentionally unsupported)",
      "Reinstall after destructive schema down", "Production aggregate revision API/clients",
      "Physical file upload/retention/encryption", "Browser UI and legal acknowledgement", "Production-size index/lock performance"] };
  const check = async (name, callback) => {
    let passed = false;
    await t.test(name, async () => {
      try { await callback(); passed = true; evidence.tests.push({ name, status: "PASS" }); }
      catch (error) { evidence.tests.push({ name, status: "FAIL", code: failureCode(error) || "ASSERTION" }); throw error; }
    });
    return passed;
  };
  let h, developmentBefore;
  try {
    developmentBefore = await support.readDevelopment();
    evidence.development_before = developmentBefore;
    h = await support.createDisposable(developmentBefore);
    evidence.test_database = { name: h.name, postgres_version_num: developmentBefore.guard.server_version_num,
      guard: "exact random name + database comment nonce + non-superuser owner; every pooled connection checked", separate_from: "intern_system" };
    const baselineRunner = h.makeRunner(developmentBefore.metadata.ledger);
    await check("isolation guard rejects Development, wrong test DB and missing marker", async () => {
      assert.throws(() => support.assertTestTarget("intern_system", h.name, h.marker, h.marker));
      assert.throws(() => support.assertTestTarget("fitm_profile_2b1_" + "0".repeat(32), h.name, h.marker, h.marker));
      assert.throws(() => support.assertTestTarget(h.name, h.name, "", h.marker));
      const [role] = await h.query("SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user");
      assert.deepEqual(role, { rolsuper: false, rolcreatedb: false, rolcreaterole: false });
    });
    if (!await check("rebuild only executed 001–018 history including 007a on template0", async () => {
      const installed = await baselineRunner.up();
      assert.deepEqual(installed.map(row => row.name).sort(), developmentBefore.metadata.ledger);
      assert.equal((await h.query("SELECT count(*)::int AS count FROM students"))[0].count, 0);
      const fromSources = await h.catalog();
      evidence.baseline_source_drift = [];
      // Existing history uses DataTypes.NOW, which does not emit DB defaults on a
      // fresh replay. Match the three observed Development defaults ONLY in this
      // synthetic DB. No old migration or Development object is altered.
      for (const name of ["coop_requests", "job_postings", "job_submissions"]) {
        const actual = fromSources.columns.find(row => row.table_name === name && row.column_name === "submitted_at");
        const expected = developmentBefore.metadata.columns.find(row => row.table_name === name && row.column_name === "submitted_at");
        if (actual.column_default !== expected.column_default) {
          assert.equal(actual.column_default, null);
          assert.equal(expected.column_default, "CURRENT_TIMESTAMP");
          assert.deepEqual({ ...actual, column_default: expected.column_default }, expected);
          await h.query("ALTER TABLE public." + name + " ALTER COLUMN submitted_at SET DEFAULT CURRENT_TIMESTAMP");
          evidence.baseline_source_drift.push({ table: name, column: "submitted_at", replay_default: null, observed_default: "CURRENT_TIMESTAMP", action: "test-only default alignment" });
        }
      }
      const metadata = await h.catalog();
      evidence.baseline_metadata_sha256 = support.digest(metadata);
      evidence.baseline_matches_development = support.digest(metadata) === developmentBefore.metadata_sha256;
      // Compare the full public schema (including constraints/indexes/enum/triggers),
      // not just the three profile tables.
      assert.deepEqual(metadata, developmentBefore.metadata);
    })) throw new Error("BASELINE_SCHEMA_MISMATCH: stop before target migrations");

    const timestamp = new Date("2026-01-01T00:00:00Z");
    await h.qi.bulkInsert("students", [OWNER, OTHER, EMPTY].map((id, i) => ({
      id, student_id: "synthetic-profile-" + i, email: "profile-" + i + "@fixture.invalid",
      password_hash: "synthetic-not-a-login", first_name: "Synthetic", last_name: "Fixture" + i,
      major: i ? null : "Synthetic major", year_level: i ? null : 3, gpa: i ? null : "3.11",
      track: "co_op", status: "pending", created_at: timestamp, updated_at: timestamp,
    })));
    const profile = {
      ...Object.fromEntries(PROFILE_FIELDS.map(field => [field, "Legacy synthetic " + field])),
      id: randomId(), student_id: OWNER, prefix: "นาย", birth_date: "2000-02-29",
      height_cm: "170.00", weight_kg: "60.50", father_age: 60, mother_age: 55, blood_type: "A",
      special_abilities: "Legacy C, C++\nLanguage notes: do not split", related_skills: "Unrated legacy free text",
      ...Object.fromEntries(["hometown_phone", "current_phone", "parent_phone", "emergency_contact_phone"].map(field => [field, "0000000000"])),
      created_at: timestamp, updated_at: timestamp,
    };
    await h.qi.bulkInsert("student_profiles", [profile, {
      ...Object.fromEntries(PROFILE_FIELDS.map(field => [field, null])), id: randomId(), student_id: OTHER,
      created_at: timestamp, updated_at: timestamp,
    }]);
    const legacyFiles = specs.existingFileTypes.map(file_type => ({
      id: randomId(), student_id: OWNER, file_type, original_name: "Synthetic same filename.pdf",
      storage_path: "students/" + OWNER + "/synthetic/" + file_type + ".pdf", mime_type: "application/pdf",
      file_size: "17", created_at: timestamp, updated_at: timestamp,
    }));
    await h.qi.bulkInsert("student_files", legacyFiles);
    const legacyTables = ["students", "student_profiles", "student_files"];
    const originalIds = Object.fromEntries(legacyTables.map(name => [name, name === "students" ? [OWNER, OTHER, EMPTY] :
      name === "student_profiles" ? [profile.id] : legacyFiles.map(file => file.id)]));
    originalIds.student_profiles.push((await h.query("SELECT id FROM student_profiles WHERE student_id=:owner", { owner: OTHER }))[0].id);
    const legacySnapshot = async () => {
      const result = {};
      for (const name of legacyTables) {
        const columns = developmentBefore.metadata.columns.filter(row => row.table_name === name).map(row => '"' + row.column_name + '"');
        result[name] = await h.query("SELECT " + columns.join(",") + " FROM public." + name + " WHERE id IN (:ids) ORDER BY id", { ids: originalIds[name] });
      }
      return result;
    };
    const oldRows = await legacySnapshot();
    evidence.legacy_rows = { students: 3, profiles: 2, files: 4, nullable_incomplete_profile: true, student_without_profile: true };
    evidence.legacy_digest_before = support.digest(oldRows);
    const targetNames = developmentBefore.prepared_names;
    const runner = h.makeRunner(targetNames);
    for (const name of targetNames) {
      const source = require(path.join(support.preparedDirectory, name));
      if (!await check(name + ": actual PostgreSQL failure rolls back all DDL and keeps ledger/legacy rows", async () => {
        const before = await h.catalog();
        const originalQuery = h.db.query.bind(h.db);
        h.db.query = async (sql, options) => {
          const result = await originalQuery(sql, options);
          if (sql === source.statements.at(-1)) await originalQuery("SELECT 1/0", options);
          return result;
        };
        try { await assert.rejects(runner.up({ migrations: [name] }), error => failureCode(error.cause || error) === "22012"); }
        finally { h.db.query = originalQuery; }
        assert.deepEqual(await h.catalog(), before);
        assert.deepEqual(await legacySnapshot(), oldRows);
      })) throw new Error("ATOMIC_DDL_FAILURE_TEST_FAILED");
      if (!await check(name + ": install commits independently and preserves legacy values", async () => {
        const installed = await runner.up({ migrations: [name] });
        assert.deepEqual(installed.map(row => row.name), [name]);
        assert.deepEqual(await legacySnapshot(), oldRows);
      })) throw new Error("TARGET_MIGRATION_FAILED");
    }
    evidence.legacy_digest_after_migrations = support.digest(await legacySnapshot());
    evidence.target_metadata_sha256 = support.digest(await h.catalog());
    await check("all columns/types/nullability/defaults, PK/FK and intended indexes exist", async () => {
      const metadata = await h.catalog();
      for (const [name, spec] of [...Object.entries(specs.extensions), ...Object.entries(specs.tables)]) {
        for (const [field, column] of Object.entries(spec.columns)) {
          const actual = metadata.columns.find(row => row.table_name === name && row.column_name === field);
          assert.ok(actual, name + "." + field);
          assert.equal(actual.is_nullable, column.nullable ? "YES" : "NO");
          const pgTypes = { varchar: "character varying", char: "character", numeric: "numeric", uuid: "uuid",
            text: "text", bytea: "bytea", date: "date", timestamptz: "timestamp with time zone",
            integer: "integer", smallint: "smallint", bigint: "bigint", boolean: "boolean" };
          assert.equal(actual.data_type, pgTypes[column.type]);
          if (column.length) assert.equal(actual.character_maximum_length, column.length);
          if (column.defaultSql) assert.ok(actual.column_default);
        }
      }
      for (const name of Object.keys(specs.tables)) {
        assert.ok(metadata.constraints.some(row => row.table_name === name && row.type === "p"));
        assert.ok(metadata.constraints.some(row => row.table_name === name && row.type === "f" && row.definition.includes("REFERENCES students(id)") && row.definition.includes("ON DELETE CASCADE")));
      }
      const legacyIndexNames = developmentBefore.metadata.indexes.filter(row => row.table_name === "student_files");
      for (const row of legacyIndexNames) assert.deepEqual(metadata.indexes.find(index => index.name === row.name), row);
      for (const name of ["phase2a_profile_document_current", "phase2a_profile_documents_owner"]) assert.ok(metadata.indexes.some(row => row.name === name));
      assert.deepEqual(metadata.enums.filter(row => row.name === "enum_student_files_file_type").map(row => row.value),
        [...specs.existingFileTypes, ...specs.newFileTypes]);
      assert.equal((await h.query("SELECT profile_data_revision FROM students WHERE id=:owner", { owner: OWNER }))[0].profile_data_revision, "0");
      assert.equal((await h.query("SELECT bool_and(is_current) AS current FROM student_files"))[0].current, true);
    });
    await check("logged rerun is a no-op; direct duplicate DDL fails atomically; enum append is idempotent", async () => {
      const before = await h.catalog();
      assert.deepEqual(await runner.up(), []);
      for (const name of targetNames) {
        const source = require(path.join(support.preparedDirectory, name));
        if (name.startsWith("024")) await source.up({ context: h.qi });
        else await assert.rejects(source.up({ context: h.qi }), isCode(name.startsWith("023") ? "42P07" : "42701"));
        assert.deepEqual(await h.catalog(), before);
        assert.deepEqual(await legacySnapshot(), oldRows);
      }
    });
    await check("PostgreSQL rejects using a newly appended enum before commit and rolls the enum back", async () => {
      const before = await h.catalog();
      await assert.rejects(h.db.transaction(async transaction => {
        await h.query("ALTER TYPE public.enum_student_files_file_type ADD VALUE 'synthetic_uncommitted'", undefined, transaction);
        await h.query("SELECT 'synthetic_uncommitted'::public.enum_student_files_file_type", undefined, transaction);
      }), isCode("55P04"));
      assert.deepEqual(await h.catalog(), before);
    });
    await check("safe down refuses even on test DB; ledger/schema/populated legacy data remain intact; re-up is no-op", async () => {
      const before = await h.catalog();
      await assert.rejects(runner.down({ migrations: [targetNames.at(-1)] }), /PRESERVE_DATA/);
      for (const name of targetNames) await assert.rejects(require(path.join(support.preparedDirectory, name)).down({ context: h.qi }), /PRESERVE_DATA/);
      assert.deepEqual(await h.catalog(), before);
      assert.deepEqual(await legacySnapshot(), oldRows);
      assert.deepEqual(await runner.up(), []);
      evidence.rollback = { actual_failed_transaction_rollback: "PASS (022–025)", migration_down: "PASS (safe refusal, unchanged schema/data/ledger)",
        destructive_schema_rollback: "NOT TESTED / unsupported by source", reinstall_after_destructive_down: "NOT TESTED",
        re_up_after_refused_down: "PASS (ledger-controlled no-op)" };
    });
    await check("Profile uniqueness, missing owner FKs and cascade deletion work on synthetic rows", async () => {
      await assert.rejects(h.qi.bulkInsert("student_profiles", [{ id: randomId(), student_id: OWNER, created_at: timestamp, updated_at: timestamp }]), isCode("23505"));
      await assert.rejects(h.query("INSERT INTO student_training_records(id,student_id) VALUES (:id,:owner)", { id: randomId(), owner: randomId() }), isCode("23503"));
      await h.db.transaction(async transaction => {
        const id = randomId();
        await h.query("INSERT INTO students(id,student_id,email,password_hash,first_name,last_name,created_at,updated_at) VALUES (:id,:code,:email,'synthetic','Synthetic','Cascade',now(),now())",
          { id, code: "synthetic-" + id, email: id + "@fixture.invalid" }, transaction);
        await h.query("INSERT INTO student_training_records(id,student_id) VALUES (:id,:owner)", { id: randomId(), owner: id }, transaction);
        await h.query("DELETE FROM students WHERE id=:owner", { owner: id }, transaction);
        assert.equal((await h.query("SELECT count(*)::int AS count FROM student_training_records WHERE student_id=:owner", { owner: id }, transaction))[0].count, 0);
      });
    });
    await check("real SQL CHECK constraints reject GPA/ranges/enum values and invalid Gregorian dates", async () => {
      for (const [statement, values, code] of [
        ["UPDATE students SET last_semester_gpa=4.01 WHERE id=:owner", {}, "23514"],
        ["UPDATE students SET profile_data_revision=-1 WHERE id=:owner", {}, "23514"],
        ["UPDATE student_profiles SET national_id_key_version='fixture-key' WHERE student_id=:owner", {}, "23514"],
        ["UPDATE student_profiles SET national_id_issue_date='2024-03-01',national_id_expiry_date='2024-02-29' WHERE student_id=:owner", {}, "23514"],
        ["UPDATE student_profiles SET national_id_issue_date=:date WHERE student_id=:owner", { date: "2023-02-30" }, "22008"],
        ["UPDATE student_profiles SET national_id_issue_date=:date WHERE student_id=:owner", { date: "1900-02-29" }, "22008"],
        ["UPDATE student_profiles SET has_driving_license=false,driving_license_number='synthetic' WHERE student_id=:owner", {}, "23514"],
        ["UPDATE student_profiles SET military_status='invented' WHERE student_id=:owner", {}, "23514"],
        ["INSERT INTO student_skills(id,student_id,category,proficiency) VALUES (:id,:owner,'language','expert')", { id: randomId() }, "23514"],
        ["INSERT INTO student_education_records(id,student_id,education_level,gpa) VALUES (:id,:owner,'bachelor',4.01)", { id: randomId() }, "23514"],
        ["INSERT INTO student_education_records(id,student_id,education_level,graduation_year) VALUES (:id,:owner,'bachelor',0)", { id: randomId() }, "23514"],
      ]) await assert.rejects(h.query(statement, { owner: OWNER, ...values }), isCode(code));
      const transaction = await h.db.transaction();
      try {
        await h.query("UPDATE student_profiles SET national_id_issue_date='2000-02-29',national_id_expiry_date='2024-02-29' WHERE student_id=:owner", { owner: OWNER }, transaction);
        assert.equal((await h.query("SELECT national_id_issue_date FROM student_profiles WHERE student_id=:owner", { owner: OWNER }, transaction))[0].national_id_issue_date, "2000-02-29");
      } finally { await transaction.rollback(); }
      assert.deepEqual(await legacySnapshot(), oldRows);
    });
    const registry = {};
    for (const filename of fs.readdirSync(path.join(support.workspace, "backend/src/models")).filter(name => name.endsWith(".model.js"))) {
      const model = require(path.join(support.workspace, "backend/src/models", filename))(h.db);
      registry[model.name] = model;
    }
    registry.sequelize = h.db;
    for (const [name, tableName] of [["Student", "students"], ["StudentProfile", "student_profiles"], ["StudentFile", "student_files"]]) {
      Object.assign(registry[name].rawAttributes, preparedModels.extensionAttributes(tableName));
      registry[name].refreshAttributes();
    }
    Object.assign(registry, preparedModels.defineRelationModels(h.db));
    for (const model of Object.values(registry)) if (typeof model.associate === "function") model.associate(registry);
    preparedModels.associateRelations(registry.Student, registry);
    await check("extended real Sequelize models query legacy rows and all new association JOINs", async () => {
      const student = await registry.Student.findByPk(OWNER, { include: [
        { model: registry.StudentProfile, as: "profile" }, { model: registry.StudentFile, as: "files" },
        ...Object.values(specs.tables).map(spec => ({ model: registry[spec.modelName], as: spec.association })),
      ] });
      assert.equal(student.profile.related_skills, profile.related_skills);
      assert.equal(student.profile.national_id_ciphertext, null);
      assert.equal(student.profile_data_revision, "0");
      assert.equal(student.files.length, 4);
      for (const spec of Object.values(specs.tables)) assert.deepEqual(student[spec.association], []);
      assert.deepEqual(await legacySnapshot(), oldRows);
    });
    await check("multiple education/training/skills rows persist through real Sequelize with nullable drafts/defaults", async () => {
      for (const education_level of ["bachelor", "high_vocational", "high_school_vocational", "bachelor"]) {
        await registry.StudentEducationRecord.create({ student_id: OWNER, education_level, institution_name: "Synthetic school", gpa: "4.00" });
      }
      for (let i = 0; i < 7; i++) await registry.StudentTrainingRecord.create({ student_id: OWNER, course_name: "Synthetic course " + i });
      for (const [i, proficiency] of ["very_good", "good", "moderate", "fair"].entries()) {
        await registry.StudentSkill.create({ student_id: OWNER, category: i % 2 ? "language" : "computer", skill_name: "Synthetic skill " + i, proficiency });
      }
      const draft = await registry.StudentTrainingRecord.create({ student_id: OTHER });
      assert.equal(draft.course_name, null); // PostgreSQL RETURNING already returns NULL for an omitted draft value.
      await draft.reload();
      assert.equal(draft.course_name, null);
      assert.equal(draft.display_order, 0);
      const student = await registry.Student.findByPk(OWNER, { include: Object.values(specs.tables).map(spec => ({ model: registry[spec.modelName], as: spec.association })) });
      assert.equal(student.profileEducationRecords.length, 4);
      assert.equal(student.profileTrainingRecords.length, 7);
      assert.equal(student.profileSkills.length, 4);
      assert.equal((await student.profileEducationRecords[0].getStudent()).id, OWNER);
      assert.deepEqual(await legacySnapshot(), oldRows);
    });
    await check("extended scalar Sequelize attributes round-trip dates/BYTEA/booleans/family fields inside a rolled-back transaction", async () => {
      const transaction = await h.db.transaction();
      try {
        await registry.Student.update({ department: "Synthetic department", faculty: "Synthetic faculty", last_semester_gpa: "3.98" },
          { where: { id: OWNER }, transaction });
        await registry.StudentProfile.update({
          english_first_name: "Synthetic", english_last_name: "English fixture", gender: null,
          national_id_ciphertext: Buffer.from("synthetic-bytes-not-a-real-id"), national_id_key_version: "synthetic-key-v1",
          national_id_issue_date: "2000-02-29", national_id_expiry_date: "2024-02-29",
          has_driving_license: true, driving_license_number: "synthetic-license", driving_license_type: "synthetic-type",
          driving_license_expiry_date: "2024-02-29", military_status: "not_yet_served",
          father_address: "Synthetic father address", father_phone: "0000000000",
          mother_address: "Synthetic mother address", mother_phone: "0000000000",
          emergency_contact_occupation: "Synthetic occupation", emergency_contact_workplace: "Synthetic workplace",
        }, { where: { student_id: OWNER }, transaction });
        const student = await registry.Student.findByPk(OWNER, { transaction, include: [{ model: registry.StudentProfile, as: "profile" }] });
        assert.equal(student.last_semester_gpa, "3.98");
        assert.equal(student.profile.national_id_issue_date, "2000-02-29");
        assert.deepEqual(student.profile.national_id_ciphertext, Buffer.from("synthetic-bytes-not-a-real-id"));
        assert.equal(student.profile.has_driving_license, true);
        assert.equal(student.profile.father_name, profile.father_name);
      } finally { await transaction.rollback(); }
      assert.deepEqual(await legacySnapshot(), oldRows);
    });
    await check("structured addresses preserve free text and enforce one record per owner/type", async () => {
      await registry.StudentAddress.create({ student_id: OWNER, address_type: "registered", house_no: "Synthetic 1", postal_code: "01234" });
      await registry.StudentAddress.create({ student_id: OWNER, address_type: "current" });
      await assert.rejects(registry.StudentAddress.create({ student_id: OWNER, address_type: "current" }), isCode("23505"));
      const address = await registry.StudentAddress.findOne({ where: { student_id: OWNER, address_type: "registered" } });
      assert.equal(address.postal_code, "01234");
      assert.deepEqual(await legacySnapshot(), oldRows);
    });
    const fileData = (file_type, extra = {}) => ({
      id: randomId(), student_id: OWNER, file_type, original_name: "Synthetic document.pdf",
      storage_path: "students/" + OWNER + "/synthetic/" + randomId() + ".pdf", mime_type: "application/pdf", file_size: "23",
      content_sha256: "a".repeat(64), document_version: 1, ...extra,
    });
    let transcript;
    await check("new file types coexist with old files; required hash/version/other label enforced", async () => {
      for (const file_type of specs.newFileTypes) {
        const document = await registry.StudentFile.create(fileData(file_type, file_type === "supporting_other" ? { document_label: "Synthetic other" } : {}));
        if (file_type === "transcript") transcript = document;
      }
      await registry.StudentFile.create(fileData("supporting_other", { document_label: "Second synthetic other" }));
      for (const extra of [{ content_sha256: null }, { document_version: null }, { document_version: 0 }, { content_sha256: "x".repeat(64) }, { document_label: " " }]) {
        await assert.rejects(registry.StudentFile.create(fileData("supporting_other", { document_label: "Synthetic", ...extra })), isCode("23514"));
      }
      assert.deepEqual(await legacySnapshot(), oldRows);
    });
    await check("file current uniqueness, supersedes owner FK, version preservation and RESTRICT work", async () => {
      await assert.rejects(registry.StudentFile.create(fileData("transcript")), isCode("23505"));
      const replacement = await h.db.transaction(async transaction => {
        await transcript.update({ is_current: false }, { transaction });
        return registry.StudentFile.create(fileData("transcript", { document_version: 2, supersedes_file_id: transcript.id }), { transaction });
      });
      await assert.rejects(registry.StudentFile.create(fileData("supporting_other", { student_id: OTHER, supersedes_file_id: transcript.id, document_label: "Synthetic cross owner" })), isCode("23503"));
      await assert.rejects(transcript.destroy(), isCode("23503"));
      await transcript.reload();
      assert.equal(transcript.content_sha256, "a".repeat(64));
      assert.equal(transcript.document_version, 1);
      assert.equal(transcript.is_current, false);
      assert.equal(replacement.document_version, 2);
      assert.deepEqual(await legacySnapshot(), oldRows);
    });

    // Compile the unchanged production controller against ONLY the guarded registry.
    // No require-cache replacement and no import of live models/index/database config.
    const controllerFilename = path.join(support.workspace, "backend/src/controllers/studentProfile.controller.js");
    const controllerModule = new Module(controllerFilename);
    const requireFromController = createRequire(controllerFilename);
    controllerModule.filename = controllerFilename;
    controllerModule.require = name => name === "../models" ? registry : requireFromController(name);
    controllerModule._compile(fs.readFileSync(controllerFilename, "utf8"), controllerFilename);
    const controller = controllerModule.exports;
    const callProfile = async (owner, body, token) => {
      let code = 200, data;
      const response = { status(value) { code = value; return this; }, json(value) { data = value; return this; } };
      await controller.upsertStudentProfile({ user: { id: owner }, body, get: key => key === "If-Match" ? token : undefined }, response);
      return { status: code, body: data };
    };
    const loadToken = async owner => profileRevision(owner, await registry.StudentProfile.findOne({ where: { student_id: owner } }));
    await check("unchanged Phase 1 controller on real SQL: 428/409/read-only/partial/date protection", async () => {
      const before = await legacySnapshot(), token = await loadToken(OWNER);
      assert.equal((await callProfile(OWNER, { religion: "Synthetic" })).status, 428);
      assert.equal((await callProfile(OWNER, { profile_data_revision: 7 }, token)).status, 400);
      assert.equal((await callProfile(OWNER, { student_id: OTHER }, token)).status, 400);
      assert.equal((await callProfile(OWNER, { birth_date: "2023-02-30" }, token)).status, 400);
      assert.equal((await callProfile(OWNER, {}, token)).status, 200);
      assert.deepEqual(await legacySnapshot(), before);
      const updated = await callProfile(OWNER, { current_phone: "0000000001" }, token);
      assert.equal(updated.status, 200);
      assert.equal((await callProfile(OWNER, { father_name: "Must not replace" }, token)).status, 409);
      const after = (await registry.StudentProfile.findOne({ where: { student_id: OWNER } })).get({ plain: true });
      assert.equal(after.father_name, profile.father_name);
      assert.equal(after.related_skills, profile.related_skills);
      assert.equal(after.current_phone, "0000000001");
      assert.equal(updated.body.profile_revision, await loadToken(OWNER));
    });
    for (const owner of [OWNER, EMPTY]) await check("Phase 1 concurrent real SQL snapshots: " + (owner === EMPTY ? "first create" : "existing row"), async () => {
      const token = await loadToken(owner);
      const responses = await Promise.all([callProfile(owner, { religion: "Synthetic tab A" }, token), callProfile(owner, { emergency_contact_name: "Synthetic tab B" }, token)]);
      assert.deepEqual(responses.map(row => row.status).sort(), [owner === EMPTY ? 201 : 200, 409]);
      assert.equal(await registry.StudentProfile.count({ where: { student_id: owner } }), 1);
    });
    await check("document revision gap on real DB: new child/counter changes do not affect Phase 1 hash", async () => {
      const oldToken = await loadToken(OWNER);
      await registry.StudentTrainingRecord.create({ student_id: OWNER, course_name: "Synthetic new relation" });
      await h.query("UPDATE students SET profile_data_revision=profile_data_revision+1 WHERE id=:owner", { owner: OWNER });
      assert.equal(await loadToken(OWNER), oldToken);
      evidence.profile_revision_gap_verified = true;
    });

    // Test-only prototype of the proposed shared revision/owner-lock boundary.
    // Not registered in routes, services or live models; no production contract change.
    const candidateSnapshot = async (owner, transaction, lock = false) => {
      const [student] = await h.query("SELECT id,major,year_level,gpa,profile_image,department,faculty,last_semester_gpa,profile_data_revision FROM students WHERE id=:owner" + (lock ? " FOR UPDATE" : ""), { owner }, transaction);
      const p = await registry.StudentProfile.findOne({ where: { student_id: owner }, transaction });
      return '"' + support.digest(["test-only-aggregate-v2", owner, profileRevision(owner, p), student]) + '"';
    };
    const candidateWrite = (expected, mutation) => h.db.transaction(async transaction => {
      const current = await candidateSnapshot(OWNER, transaction, true);
      if (expected !== current) return { status: 409 };
      await mutation(transaction);
      await h.query("UPDATE students SET profile_data_revision=profile_data_revision+1 WHERE id=:owner", { owner: OWNER }, transaction);
      return { status: 200, revision: await candidateSnapshot(OWNER, transaction) };
    });
    await check("test-only aggregate prototype serializes two real connections across different relation tables", async () => {
      const token = await candidateSnapshot(OWNER);
      const before = (await h.query("SELECT profile_data_revision FROM students WHERE id=:owner", { owner: OWNER }))[0].profile_data_revision;
      const operations = [
        tx => h.query("INSERT INTO student_training_records(id,student_id,course_name) VALUES (:id,:owner,'Synthetic concurrent course')", { id: randomId(), owner: OWNER }, tx),
        tx => h.query("INSERT INTO student_skills(id,student_id,category,skill_name) VALUES (:id,:owner,'computer','Synthetic concurrent skill')", { id: randomId(), owner: OWNER }, tx),
      ];
      const responses = await Promise.all(operations.map(operation => candidateWrite(token, operation)));
      assert.deepEqual(responses.map(row => row.status).sort(), [200, 409]);
      assert.equal(BigInt((await h.query("SELECT profile_data_revision FROM students WHERE id=:owner", { owner: OWNER }))[0].profile_data_revision), BigInt(before) + 1n);
    });
    await check("test-only shared transaction covers personal/family/emergency/academic/photo/file/education/training/skills/address writes", async () => {
      const mutations = [
        ["personal", tx => registry.StudentProfile.update({ religion: "Synthetic aggregate personal" }, { where: { student_id: OWNER }, transaction: tx })],
        ["family", tx => registry.StudentProfile.update({ father_name: "Synthetic aggregate father" }, { where: { student_id: OWNER }, transaction: tx })],
        ["emergency", tx => registry.StudentProfile.update({ emergency_contact_occupation: "Synthetic aggregate occupation" }, { where: { student_id: OWNER }, transaction: tx })],
        ["academic", tx => registry.Student.update({ last_semester_gpa: "3.12" }, { where: { id: OWNER }, transaction: tx })],
        ["photo metadata", tx => registry.Student.update({ profile_image: "students/" + OWNER + "/synthetic/photo.png" }, { where: { id: OWNER }, transaction: tx })],
        ["profile file metadata", tx => registry.StudentFile.create(fileData("supporting_other", { document_label: "Synthetic aggregate evidence" }), { transaction: tx })],
        ["education", tx => registry.StudentEducationRecord.create({ student_id: OWNER, education_level: "bachelor", institution_name: "Synthetic aggregate education" }, { transaction: tx })],
        ["training", tx => registry.StudentTrainingRecord.create({ student_id: OWNER, course_name: "Synthetic aggregate training" }, { transaction: tx })],
        ["skills", tx => registry.StudentSkill.create({ student_id: OWNER, category: "language", skill_name: "Synthetic aggregate language" }, { transaction: tx })],
        ["address", tx => registry.StudentAddress.update({ house_no: "Synthetic aggregate house" }, { where: { student_id: OWNER, address_type: "current" }, transaction: tx })],
      ];
      for (const [label, mutation] of mutations) {
        const token = await candidateSnapshot(OWNER);
        const result = await candidateWrite(token, mutation);
        assert.equal(result.status, 200, label);
        assert.notEqual(result.revision, token, label);
        let ran = false;
        const stale = await candidateWrite(token, async () => { ran = true; });
        assert.equal(stale.status, 409, label);
        assert.equal(ran, false, label);
      }
      evidence.aggregate_prototype = { production_activated: false, real_postgres_lock_and_rollback: "PASS", covered_write_categories: mutations.map(([label]) => label) };
    });
    await check("test-only aggregate failure rolls back child mutation/counter; BIGINT tokens retain precision", async () => {
      await h.query("UPDATE students SET profile_data_revision=9007199254740993 WHERE id=:owner", { owner: OWNER });
      const token = await candidateSnapshot(OWNER);
      const before = await registry.StudentTrainingRecord.count({ where: { student_id: OWNER } });
      await assert.rejects(candidateWrite(token, async transaction => {
        await registry.StudentTrainingRecord.create({ student_id: OWNER, course_name: "Must roll back" }, { transaction });
        await h.query("SELECT 1/0", undefined, transaction);
      }), isCode("22012"));
      assert.equal(await registry.StudentTrainingRecord.count({ where: { student_id: OWNER } }), before);
      assert.equal(await candidateSnapshot(OWNER), token);
      assert.equal((await h.query("SELECT profile_data_revision FROM students WHERE id=:owner", { owner: OWNER }))[0].profile_data_revision, "9007199254740993");
      const success = await candidateWrite(token, transaction => registry.StudentTrainingRecord.create({ student_id: OWNER, course_name: "Synthetic precision" }, { transaction }));
      assert.equal(success.status, 200);
      assert.notEqual(success.revision, token);
      assert.equal((await h.query("SELECT profile_data_revision FROM students WHERE id=:owner", { owner: OWNER }))[0].profile_data_revision, "9007199254740994");
    });
  } catch (error) {
    evidence.fatal = { status: "FAIL", code: failureCode(error) || error.message.split(":")[0] };
    throw error;
  } finally {
    if (h) {
      try { await h.cleanup(); evidence.cleanup = "PASS: only invocation-owned test database and role removed"; }
      catch (error) { evidence.cleanup = "FAIL: " + (failureCode(error) || "CLEANUP_GUARD"); process.exitCode = 1; }
    }
    if (developmentBefore) {
      try {
        const after = await support.readDevelopment();
        evidence.development_after = after;
        evidence.development_metadata_unchanged = after.metadata_sha256 === developmentBefore.metadata_sha256;
        assert.equal(evidence.development_metadata_unchanged, true, "Development metadata changed during verification");
      } catch (error) { evidence.development_verification = { status: "FAIL", code: failureCode(error) || "DEVELOPMENT_METADATA_CHANGED" }; process.exitCode = 1; }
    }
    evidence.finished_at = new Date().toISOString();
    evidence.summary = { pass: evidence.tests.filter(row => row.status === "PASS").length, fail: evidence.tests.filter(row => row.status === "FAIL").length, not_tested: evidence.not_tested.length };
    fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2) + "\n", "utf8");
  }
});
