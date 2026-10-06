const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { Sequelize } = require("sequelize");
const migration = require("../src/db/migrations/013_add_coop_projects_and_current_files");

test("013 real PostgreSQL UP/DOWN, rollback and evidence protection", { skip: !process.env.COOP_PROJECT_DISPOSABLE_DATABASE_URL }, async t => {
  const schema = `fitm_project_${randomUUID().replaceAll("-", "")}`;
  const db = new Sequelize(process.env.COOP_PROJECT_DISPOSABLE_DATABASE_URL, { schema, logging: false, pool: { max: 1 } });
  let created = false;
  try {
    const [guard] = await db.query("SELECT current_database() AS db, current_setting('fitm.a013_disposable', true) AS disposable");
    assert.equal(guard[0].db, "fitm_project_test"); assert.equal(guard[0].disposable, "on");
    await db.query(`CREATE SCHEMA "${schema}"`); created = true;
    await db.query(`SET search_path TO "${schema}"`);
    await db.query("CREATE TABLE students (id uuid PRIMARY KEY); CREATE TABLE student_files (id uuid PRIMARY KEY, student_id uuid, file_type text)");
    const qi = db.getQueryInterface();
    await t.test("empty UP/DOWN/UP", async () => {
      await migration.up({ context: qi }); await migration.down({ context: qi }); await migration.up({ context: qi });
    });
    await t.test("failure after DDL rolls back table and indexes", async () => {
      await migration.down({ context: qi });
      const original = qi.addIndex;
      qi.addIndex = async (...args) => { if (args[0] === "student_files") throw Error("injected DDL failure"); return original.apply(qi, args); };
      try { await assert.rejects(migration.up({ context: qi }), /injected DDL failure/); } finally { qi.addIndex = original; }
      const [rows] = await db.query("SELECT to_regclass('coop_projects') AS name"); assert.equal(rows[0].name, null);
      await migration.up({ context: qi });
    });
    await t.test("required topic, unique Student, FK and current-file uniqueness", async () => {
      const id = randomUUID(); await db.query("INSERT INTO students VALUES (:id)", { replacements: { id } });
      const insert = topic => db.query("INSERT INTO coop_projects (id,student_id,topic) VALUES (:uuid,:id,:topic)", { replacements: { uuid: randomUUID(), id, topic } });
      await assert.rejects(insert(" ")); await assert.rejects(insert(" topic ")); await assert.rejects(insert("x".repeat(501)));
      await assert.rejects(db.query("INSERT INTO coop_projects (id,student_id,topic) VALUES (:uuid,:missing,'Topic')", { replacements: { uuid: randomUUID(), missing: randomUUID() } }));
      await insert("Saved topic"); await assert.rejects(insert("Duplicate"));
      for (const type of ["coop_project_book", "coop_poster"]) {
        await db.query("INSERT INTO student_files VALUES (:uuid,:id,:type)", { replacements: { uuid: randomUUID(), id, type } });
        await assert.rejects(db.query("INSERT INTO student_files VALUES (:uuid,:id,:type)", { replacements: { uuid: randomUUID(), id, type } }));
      }
      await assert.rejects(migration.down({ context: qi }), /preserve saved project/);
      assert.equal((await db.query("SELECT topic FROM coop_projects"))[0][0].topic, "Saved topic");
      await db.query("DELETE FROM students WHERE id=:id", { replacements: { id } });
      assert.equal((await db.query("SELECT count(*)::int AS n FROM coop_projects"))[0][0].n, 0);
      await migration.down({ context: qi });
    });
    await t.test("legacy duplicate files fail UP without deleting evidence", async () => {
      const id = randomUUID();
      await db.query("INSERT INTO student_files VALUES (:a,:id,'coop_poster'),(:b,:id,'coop_poster')", { replacements: { a: randomUUID(), b: randomUUID(), id } });
      await assert.rejects(migration.up({ context: qi }));
      assert.equal((await db.query("SELECT to_regclass('coop_projects') AS name"))[0][0].name, null);
      assert.equal((await db.query("SELECT count(*)::int AS n FROM student_files WHERE student_id=:id", { replacements: { id } }))[0][0].n, 2);
    });
  } finally {
    if (created) await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.close();
  }
});
