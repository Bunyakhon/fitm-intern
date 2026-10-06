const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { Sequelize } = require("sequelize");
const migration = require("../src/db/migrations/014_add_coop_project_advisor_requests");

test("014 PostgreSQL migration reversibility, constraints and evidence protection", { skip: !process.env.COOP_ADVISOR_DISPOSABLE_DATABASE_URL }, async t => {
  const schema = `fitm_advisor_${randomUUID().replaceAll("-", "")}`;
  const db = new Sequelize(process.env.COOP_ADVISOR_DISPOSABLE_DATABASE_URL, { schema, logging: false, pool: { max: 1 } }); let created = false;
  try {
    const [guard] = await db.query("SELECT current_database() AS db,current_setting('fitm.a014_disposable',true) AS disposable"); assert.equal(guard[0].db, "fitm_advisor_test"); assert.equal(guard[0].disposable, "on");
    await db.query(`CREATE SCHEMA "${schema}"`); created = true; await db.query(`SET search_path TO "${schema}"`);
    await db.query("CREATE TABLE students (id uuid PRIMARY KEY); CREATE TABLE teachers (id uuid PRIMARY KEY)"); const qi = db.getQueryInterface();
    await t.test("empty UP/DOWN/UP leaves old tables intact", async () => {
      await migration.up({ context: qi }); await migration.down({ context: qi }); await migration.up({ context: qi });
      const [rows] = await db.query("SELECT to_regclass('students') AS students,to_regclass('teachers') AS teachers"); assert.ok(rows[0].students && rows[0].teachers);
    });
    await t.test("UP index failure rolls back all added DDL", async () => {
      await migration.down({ context: qi }); const original = qi.addIndex;
      qi.addIndex = async () => { throw Error("Injected index failure"); };
      try { await assert.rejects(migration.up({ context: qi }), /Injected index failure/); } finally { qi.addIndex = original; }
      assert.equal((await db.query("SELECT to_regclass('coop_project_advisor_requests') AS name"))[0][0].name, null);
      await migration.up({ context: qi });
    });
    await t.test("DOWN DDL failure restores empty table transactionally", async () => {
      const original = qi.dropTable; qi.dropTable = async function(...args) { await original.apply(this, args); throw Error("Injected drop failure"); };
      try { await assert.rejects(migration.down({ context: qi }), /Injected drop failure/); } finally { qi.dropTable = original; }
      assert.ok((await db.query("SELECT to_regclass('coop_project_advisor_requests') AS name"))[0][0].name);
    });
    await t.test("FK/cascade/restrict, current uniqueness, constrained state/time and populated DOWN refusal", async () => {
      const student = randomUUID(), teacher = randomUUID(); await db.query("INSERT INTO students VALUES (:student); INSERT INTO teachers VALUES (:teacher)", { replacements: { student, teacher } });
      async function insert(fields = {}) {
        const values = { id: randomUUID(), student_id: student, requested_advisor_teacher_id: teacher, ...fields };
        const columns = Object.keys(values); return db.query(`INSERT INTO coop_project_advisor_requests (${columns.join(",")}) VALUES (${columns.map(c => ":" + c).join(",")})`, { replacements: values });
      }
      for (const fields of [{ status: "unknown" }, { status: "none" }, { status: "confirmed" }, { status: "rejected" }, { status: "superseded" }, { requested_advisor_teacher_id: randomUUID() }, { student_id: randomUUID() }, { status: "pending", rejection_reason: "unexpected" }, { status: "confirmed", requested_at: "2026-10-07T01:00:00Z", confirmed_at: "2026-10-07T00:00:00Z" }, { status: "rejected", rejected_at: "2026-10-07T02:00:00Z", requested_at: "2026-10-07T01:00:00Z", rejection_reason: " " }]) await assert.rejects(insert(fields));
      const first = randomUUID(); await insert({ id: first }); await assert.rejects(insert());
      await assert.rejects(db.query("DELETE FROM teachers WHERE id=:teacher", { replacements: { teacher } }));
      await assert.rejects(migration.down({ context: qi }), /preserve project advisor request history/);
      await db.query("UPDATE coop_project_advisor_requests SET status='superseded',superseded_at=CURRENT_TIMESTAMP WHERE id=:first", { replacements: { first } }); await insert();
      const [indexes] = await db.query("SELECT c.relname,i.indisvalid,i.indisunique,pg_get_expr(i.indpred,i.indrelid) AS predicate FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE i.indrelid='coop_project_advisor_requests'::regclass AND i.indpred IS NOT NULL");
      assert.equal(indexes.length, 2); assert.ok(indexes.every(i => i.indisvalid)); assert.ok(indexes.some(i => i.indisunique && i.predicate.includes("superseded"))); assert.ok(indexes.some(i => i.predicate.includes("pending")));
      await db.query("DELETE FROM students WHERE id=:student", { replacements: { student } }); assert.equal((await db.query("SELECT count(*)::int AS n FROM coop_project_advisor_requests"))[0][0].n, 0);
      await migration.down({ context: qi });
    });
  } finally { if (created) await db.query(`DROP SCHEMA "${schema}" CASCADE`); await db.close(); }
});
