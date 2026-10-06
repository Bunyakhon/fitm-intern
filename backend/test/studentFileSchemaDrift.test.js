const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { Sequelize, QueryTypes } = require("sequelize");
const { Umzug, SequelizeStorage } = require("umzug");
const migration = require("../src/db/migrations/010_cleanup_student_file_schema_drift");
const defineStudentFile = require("../src/models/studentFile.model");

test("StudentFile model retains storage_path uniqueness and the separate resume index", () => {
  const sequelize = new Sequelize("unused", "unused", null, {
    dialect: "postgres",
    logging: false,
  });
  const model = defineStudentFile(sequelize);
  assert.equal(model.rawAttributes.storage_path.unique, true);
  assert.equal(model.rawAttributes.storage_path.allowNull, false);
  assert.ok(
    model.options.indexes.some(
      (i) =>
        i.name === "student_files_one_resume_per_student" &&
        i.unique &&
        i.where.file_type === "resume",
    ),
  );
});

test("010 down retains uniqueness without executing schema or data queries", async () => {
  await migration.down({
    context: {
      sequelize: {
        query() {
          assert.fail("down must not issue SQL");
        },
      },
    },
  });
});

// These tests NEVER use config/database.js, .env, DB_HOST, or intern_system.
// Run in an isolated Docker network with a disposable PostgreSQL server that
// explicitly advertises fitm.a013_disposable=on. No app database reset occurs.
const runIsolated = process.env.STUDENT_FILE_MIGRATION_TEST === "true";
test(
  "010 PostgreSQL isolated migration acceptance",
  {
    skip:
      !runIsolated &&
      "set STUDENT_FILE_MIGRATION_TEST=true only in the disposable Docker verification environment",
  },
  async (t) => {
    const sequelize = new Sequelize("fitm_migration_test", "postgres", null, {
      dialect: "postgres",
      host: "a013-postgres",
      port: 5432,
      logging: false,
      pool: { max: 3 },
    });
    const qi = sequelize.getQueryInterface();
    const query = (sql, replacements) =>
      sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements,
      });
    const sql = (statement) => sequelize.query(statement);
    const count = async () =>
      await query(`
    SELECT c.conname, i.indisvalid, i.indisready
    FROM pg_constraint c JOIN pg_index i ON i.indexrelid = c.conindid
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attname = 'storage_path'
    WHERE c.conrelid = 'public.student_files'::regclass AND c.contype = 'u'
      AND c.conkey = ARRAY[a.attnum]
    ORDER BY c.conname
  `);
    const reset = async () => {
      await sql("DROP SCHEMA public CASCADE");
      await sql("CREATE SCHEMA public");
    };
    const fixture = async (keeper = "student_files_storage_path_key") => {
      await reset();
      const quote = qi.queryGenerator.quoteIdentifier(keeper);
      await sql(`CREATE TABLE public.student_files (
      id integer PRIMARY KEY, student_id integer NOT NULL,
      file_type text NOT NULL, original_name text NOT NULL,
      storage_path varchar(255) NOT NULL,
      CONSTRAINT ${quote} UNIQUE (storage_path),
      CONSTRAINT student_files_original_name_key UNIQUE (original_name)
    )`);
      await sql(`CREATE UNIQUE INDEX student_files_one_resume_per_student
      ON public.student_files (student_id) WHERE file_type = 'resume'`);
      await sql(
        "CREATE INDEX student_files_storage_path_lookup ON public.student_files (storage_path)",
      );
      await sql(`CREATE UNIQUE INDEX student_files_storage_path_standalone
      ON public.student_files (storage_path)`);
      await sql(`INSERT INTO public.student_files VALUES
      (1, 1, 'resume', 'one.pdf', 'synthetic/one.pdf'),
      (2, 2, 'resume', 'two.pdf', 'synthetic/two.pdf')`);
    };
    const up = () => migration.up({ context: qi });

    try {
      const [guard] = await query(`SELECT current_database() AS database,
      current_setting('fitm.a013_disposable', true) AS disposable`);
      assert.equal(
        guard.database,
        "fitm_migration_test",
        "refuse any app database",
      );
      assert.equal(
        guard.disposable,
        "on",
        "refuse a server without the disposable marker",
      );

      await t.test("A: one correct UNIQUE is a no-op", async () => {
        await fixture();
        const before = await query(
          "SELECT oid FROM pg_constraint WHERE conname = 'student_files_storage_path_key'",
        );
        await up();
        assert.deepEqual(await count(), [
          {
            conname: "student_files_storage_path_key",
            indisvalid: true,
            indisready: true,
          },
        ]);
        assert.deepEqual(
          await query(
            "SELECT oid FROM pg_constraint WHERE conname = 'student_files_storage_path_key'",
          ),
          before,
        );
      });

      await t.test(
        "B/C: 75 duplicates become one; data and unrelated objects stay protected",
        async () => {
          await fixture();
          for (let i = 1; i < 75; i += 1) {
            await sql(
              `ALTER TABLE public.student_files ADD CONSTRAINT student_files_storage_path_key${i} UNIQUE(storage_path)`,
            );
          }
          await sql(
            "ALTER TABLE public.student_files ADD CONSTRAINT unrelated_composite UNIQUE(storage_path, original_name)",
          );
          const before = await query(
            "SELECT * FROM public.student_files ORDER BY id",
          );
          const otherIndexes =
            await query(`SELECT indexrelid FROM pg_index WHERE indrelid = 'public.student_files'::regclass
        AND indexrelid IN ('student_files_pkey'::regclass, 'student_files_original_name_key'::regclass,
          'student_files_one_resume_per_student'::regclass, 'student_files_storage_path_lookup'::regclass,
          'student_files_storage_path_standalone'::regclass) ORDER BY indexrelid`);
          await up();
          assert.equal((await count()).length, 1);
          assert.equal(
            (await count())[0].conname,
            "student_files_storage_path_key",
          );
          assert.equal(
            (
              await query(
                "SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid = 'public.student_files'::regclass AND conname = 'unrelated_composite'",
              )
            )[0].count,
            1,
          );
          assert.deepEqual(
            await query("SELECT * FROM public.student_files ORDER BY id"),
            before,
          );
          assert.deepEqual(
            await query(`SELECT indexrelid FROM pg_index WHERE indrelid = 'public.student_files'::regclass
        AND indexrelid IN ('student_files_pkey'::regclass, 'student_files_original_name_key'::regclass,
          'student_files_one_resume_per_student'::regclass, 'student_files_storage_path_lookup'::regclass,
          'student_files_storage_path_standalone'::regclass) ORDER BY indexrelid`),
            otherIndexes,
          );
          // Remove only the test's extra standalone UNIQUE so duplicate rejection
          // proves the surviving constraint, not another index, enforces the key.
          await sql("DROP INDEX public.student_files_storage_path_standalone");
          await assert.rejects(
            () =>
              sql(`INSERT INTO public.student_files VALUES
        (3, 3, 'resume', 'duplicate.pdf', 'synthetic/one.pdf')`),
            (error) =>
              error.parent?.code === "23505" &&
              error.parent.constraint === "student_files_storage_path_key",
          );
        },
      );

      await t.test(
        "fallback keeps a deterministic constraint and safely quotes unusual names",
        async () => {
          await fixture('z keeper "quoted"');
          await sql(
            'ALTER TABLE public.student_files ADD CONSTRAINT "a keeper" UNIQUE(storage_path)',
          );
          await up();
          assert.equal((await count())[0].conname, "a keeper");
        },
      );

      await t.test(
        "missing table or UNIQUE fails without inventing schema",
        async () => {
          await reset();
          await assert.rejects(up, /expected a regular/);
          await sql(
            "CREATE TABLE public.student_files(storage_path text NOT NULL)",
          );
          await assert.rejects(up, /no storage_path UNIQUE/);
          assert.equal((await count()).length, 0);
        },
      );

      await t.test(
        "non-equivalent constraints fail before any removal",
        async () => {
          await fixture();
          await sql(
            "ALTER TABLE public.student_files ADD CONSTRAINT special_path UNIQUE NULLS NOT DISTINCT(storage_path)",
          );
          await assert.rejects(up, /unexpected constraint\/index shape/);
          assert.equal((await count()).length, 2);
        },
      );

      await t.test(
        "dependency on a redundant index fails atomically",
        async () => {
          await fixture("dependent_path_key");
          await sql(
            "CREATE TABLE public.path_reference(path varchar(255) REFERENCES public.student_files(storage_path))",
          );
          await sql(
            "ALTER TABLE public.student_files ADD CONSTRAINT student_files_storage_path_key UNIQUE(storage_path)",
          );
          await assert.rejects(up, /external dependency/);
          assert.equal((await count()).length, 2);
          assert.equal(
            (
              await query(
                "SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid = 'public.path_reference'::regclass AND contype = 'f'",
              )
            )[0].count,
            1,
          );
        },
      );

      await t.test(
        "DDL failure restores previously dropped duplicates through transaction rollback",
        async () => {
          await fixture();
          await sql(
            "ALTER TABLE public.student_files ADD CONSTRAINT duplicate_a UNIQUE(storage_path), ADD CONSTRAINT duplicate_b UNIQUE(storage_path)",
          );
          const originalQuery = sequelize.query;
          let drops = 0;
          sequelize.query = function (statement, options) {
            if (
              statement.startsWith("ALTER TABLE") &&
              statement.includes("DROP CONSTRAINT") &&
              ++drops === 2
            ) {
              return Promise.reject(new Error("synthetic DDL failure"));
            }
            return originalQuery.call(this, statement, options);
          };
          try {
            await assert.rejects(up, /synthetic DDL failure/);
          } finally {
            sequelize.query = originalQuery;
          }
          assert.equal((await count()).length, 3);
        },
      );

      await t.test(
        "D/E: clean 001–010 Umzug history, rerun, down/up, 007a backfill and model uniqueness",
        async () => {
          await reset();
          const umzug = new Umzug({
            migrations: {
              glob: [
                // Keep this historical 001–010 rehearsal scoped to its baseline.
                // Later migrations have their own full-history acceptance suite.
                "{00*,010_*}.js",
                { cwd: path.join(__dirname, "../src/db/migrations") },
              ],
            },
            context: qi,
            storage: new SequelizeStorage({
              sequelize,
              tableName: "sequelize_meta",
            }),
            logger: undefined,
          });
          await umzug.up();
          assert.equal((await umzug.executed()).length, 11);
          assert.equal((await umzug.pending()).length, 0);
          await sql(`INSERT INTO public.students
        (id, student_id, email, password_hash, first_name, last_name, created_at, updated_at)
        VALUES ('11111111-1111-4111-8111-111111111111', 'synthetic-student',
          'synthetic@example.test', 'unused', 'Synthetic', 'Student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
          const StudentFile = defineStudentFile(sequelize);
          const file = {
            student_id: "11111111-1111-4111-8111-111111111111",
            file_type: "coop_poster",
            original_name: "synthetic.pdf",
            storage_path: "synthetic/model.pdf",
            mime_type: "application/pdf",
            file_size: 1,
          };
          await StudentFile.create(file);
          await assert.rejects(
            () => StudentFile.create(file),
            (error) =>
              error.parent?.code === "23505" &&
              error.parent.constraint === "student_files_storage_path_key",
          );
          assert.equal((await count()).length, 1);
          assert.equal(
            (
              await query(`SELECT column_default FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'coop_requests' AND column_name = 'submitted_at'`)
            )[0].column_default,
            null,
          );
          await up();
          assert.deepEqual(await umzug.up(), []);
          await umzug.down({ to: "010_cleanup_student_file_schema_drift.js" });
          assert.equal((await count()).length, 1);
          assert.equal((await umzug.pending()).length, 1);
          await umzug.up();
          // Simulate the documented legacy ledger ONLY in this disposable DB.
          await sql(
            "DELETE FROM public.sequelize_meta WHERE name IN ('007a_create_missing_base_tables.js', '010_cleanup_student_file_schema_drift.js')",
          );
          await sql(
            "ALTER TABLE public.student_files ADD CONSTRAINT legacy_extra_path UNIQUE(storage_path)",
          );
          assert.equal((await umzug.executed()).length, 9);
          assert.deepEqual(
            (await umzug.pending()).map((m) => m.name),
            [
              "007a_create_missing_base_tables.js",
              "010_cleanup_student_file_schema_drift.js",
            ],
          );
          await umzug.up({ to: "007a_create_missing_base_tables.js" });
          assert.equal(
            (await count()).length,
            2,
            "007a records history without repairing drift",
          );
          await umzug.up({ to: "010_cleanup_student_file_schema_drift.js" });
          assert.equal((await count()).length, 1);
          assert.equal((await umzug.executed()).length, 11);
          assert.equal((await umzug.pending()).length, 0);
        },
      );
    } finally {
      await sequelize.close();
    }
  },
);
