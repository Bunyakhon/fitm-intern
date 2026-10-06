const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { Sequelize } = require("sequelize");
const migration = require("../src/db/migrations/015_add_company_evaluations");

test("015 isolated PostgreSQL UP/DOWN, rollback, constraints and evidence preservation", { skip: !process.env.COMPANY_EVALUATION_DISPOSABLE_DATABASE_URL }, async t => {
  const schema = `fitm_evaluation_${randomUUID().replaceAll("-", "")}`;
  const db = new Sequelize(process.env.COMPANY_EVALUATION_DISPOSABLE_DATABASE_URL, { schema, logging: false, pool: { max: 1 } });
  let created = false;
  try {
    const [guard] = await db.query("SELECT current_database() AS db,current_setting('fitm.a015_disposable',true) AS disposable");
    assert.equal(guard[0].db, "fitm_evaluation_test"); assert.equal(guard[0].disposable, "on");
    await db.query(`CREATE SCHEMA "${schema}"`); created = true; await db.query(`SET search_path TO "${schema}"`);
    await db.query("CREATE TABLE students (id uuid PRIMARY KEY); CREATE TABLE mentors (id uuid PRIMARY KEY)");
    const qi = db.getQueryInterface();
    await t.test("empty UP/DOWN/UP keeps parent tables", async () => {
      await migration.up({ context: qi }); await migration.down({ context: qi }); await migration.up({ context: qi });
      const [rows] = await db.query("SELECT to_regclass('students') AS students,to_regclass('mentors') AS mentors"); assert.ok(rows[0].students && rows[0].mentors);
    });
    await t.test("injected UP index failure rolls back new table", async () => {
      await migration.down({ context: qi }); const original = qi.addIndex;
      qi.addIndex = async () => { throw Error("Injected UP failure"); };
      try { await assert.rejects(migration.up({ context: qi }), /Injected UP failure/); } finally { qi.addIndex = original; }
      assert.equal((await db.query("SELECT to_regclass('company_evaluations') AS name"))[0][0].name, null);
      await migration.up({ context: qi });
    });
    await t.test("injected DOWN failure restores empty table", async () => {
      const original = qi.dropTable;
      qi.dropTable = async (...args) => { await original.apply(qi, args); throw Error("Injected DOWN failure"); };
      try { await assert.rejects(migration.down({ context: qi }), /Injected DOWN failure/); } finally { qi.dropTable = original; }
      assert.ok((await db.query("SELECT to_regclass('company_evaluations') AS name"))[0][0].name);
    });
    await t.test("required bounded scores, comment bounds, FK, uniqueness and safe populated DOWN", async () => {
      const student = randomUUID(), mentor = randomUUID();
      await db.query("INSERT INTO students VALUES (:student); INSERT INTO mentors VALUES (:mentor)", { replacements: { student, mentor } });
      async function insert(fields = {}) {
        const values = { id: randomUUID(), student_id: student, mentor_id: mentor, q1_score: 1, q2_score: 2, q3_score: 3, q4_score: 4, q5_score: 5, ...fields };
        return db.query(`INSERT INTO company_evaluations (${Object.keys(values).join(",")}) VALUES (${Object.keys(values).map(key => ":" + key).join(",")})`, { replacements: values });
      }
      for (const fields of [{ q1_score: 0 }, { q2_score: 11 }, { q3_score: null }, { comment: "x".repeat(2001) }, { comment: " untrimmed " }, { student_id: randomUUID() }, { mentor_id: randomUUID() }]) await assert.rejects(insert(fields));
      await insert(); await assert.rejects(insert());
      await assert.rejects(migration.down({ context: qi }), /preserve saved company evaluations/);
      const [indexes] = await db.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=current_schema() AND tablename='company_evaluations'");
      assert.ok(indexes.some(index => index.indexname === "company_evaluations_student_unique" && index.indexdef.includes("UNIQUE")));
      await db.query("DELETE FROM mentors WHERE id=:mentor", { replacements: { mentor } });
      assert.equal((await db.query("SELECT mentor_id FROM company_evaluations"))[0][0].mentor_id, null);
      await db.query("DELETE FROM students WHERE id=:student", { replacements: { student } });
      assert.equal((await db.query("SELECT count(*)::int AS n FROM company_evaluations"))[0][0].n, 0);
      await migration.down({ context: qi });
    });
  } finally {
    if (created) await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.close();
  }
});
