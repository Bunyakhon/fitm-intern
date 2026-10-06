const test = require('node:test'); const assert = require('node:assert/strict');
const migration = require('../src/db/migrations/012_coop_prerequisites_and_direct_review');
function isolatedInterface({evidence = false, fail = false} = {}) {
  let state = []; let calls = []; let current;
  const qi = {sequelize: {
    literal: value => value,
    async transaction(fn) {const staged = [...state]; current = {staged}; try {const result = await fn(current); state = staged; return result;} finally {current = null;}},
    async query(sql, options) {assert.equal(options.transaction, current); calls.push(sql); current.staged.push(sql); return sql.startsWith('SELECT EXISTS') ? [[{has_evidence: evidence}]] : [[]];},
  }};
  for (const operation of ['createTable','addIndex','addColumn','removeColumn','dropTable']) qi[operation] = async (...args) => {
    const options = args.at(-1); assert.equal(options.transaction, current); calls.push([operation, ...args.slice(0,-1)]); current.staged.push(operation);
    if (fail && operation === 'addColumn') throw new Error('injected DDL failure');
  };
  return {qi, state: () => state, calls: () => calls};
}
test('012 isolated UP builds snapshot FK/unique/checks and direct audit checks', async () => {
  const fixture = isolatedInterface(); await migration.up({context: fixture.qi});
  const table = fixture.calls().find(call => Array.isArray(call) && call[0] === 'createTable');
  assert.equal(table[1], 'coop_request_prerequisite_courses'); assert.equal(table[2].coop_request_id.references.model, 'coop_requests'); assert.equal(table[2].coop_request_id.onDelete, 'CASCADE');
  const index = fixture.calls().find(call => Array.isArray(call) && call[0] === 'addIndex'); assert.deepEqual(index[2], ['coop_request_id','course_code']);
  const sql = fixture.calls().filter(call => typeof call === 'string').join('\n');
  assert.match(sql, /coop_prerequisites_status_grade_check/); assert.match(sql, /NOT VALID/);
  assert.match(sql, /decision = 'cancel'/); assert.match(sql, /decision = 'submit'/);
});
test('012 isolated DOWN restores old checks on an empty fixture', async () => {
  const fixture = isolatedInterface(); await migration.up({context: fixture.qi}); await migration.down({context: fixture.qi});
  assert.ok(fixture.calls().some(call => Array.isArray(call) && call[0] === 'dropTable'));
  assert.ok(fixture.calls().some(call => typeof call === 'string' && call.includes("decision = 'approve' AND to_status = 'staff_review'")));
});
test('012 UP failure rolls back all staged DDL', async () => {
  const fixture = isolatedInterface({fail: true}); await assert.rejects(migration.up({context: fixture.qi}), /injected DDL failure/); assert.deepEqual(fixture.state(), []);
});
test('012 refuses destructive DOWN when snapshot/direct-review evidence exists', async () => {
  const fixture = isolatedInterface({evidence: true}); await migration.up({context: fixture.qi}); const before = [...fixture.state()];
  await assert.rejects(migration.down({context: fixture.qi}), /rollback refused/); assert.deepEqual(fixture.state(), before);
});

// Opt-in real SQL execution only on an explicitly marked disposable test DB.
// Never uses the application's database config or migration ledger.
test('012 PostgreSQL UP/DOWN/rollback/constraints on guarded disposable schema', {skip: !process.env.COOP_DISPOSABLE_DATABASE_URL}, async () => {
  const {Sequelize} = require('sequelize'); const {randomUUID} = require('node:crypto');
  const schema = `fitm_coop_${randomUUID().replaceAll('-','')}`;
  const sequelize = new Sequelize(process.env.COOP_DISPOSABLE_DATABASE_URL, {schema, logging:false, pool:{max:1}});
  let created = false;
  try {
    const [rows] = await sequelize.query("SELECT current_database() AS db, current_setting('fitm.a013_disposable', true) AS disposable");
    assert.match(rows[0].db, /^fitm_.*test$/); assert.equal(rows[0].disposable, 'on');
    await sequelize.query(`CREATE SCHEMA "${schema}"`); created = true;
    await sequelize.query(`SET search_path TO "${schema}"`);
    await sequelize.query(`CREATE TABLE teachers (id uuid PRIMARY KEY); CREATE TABLE students (id uuid PRIMARY KEY, advisor_teacher_id uuid);
      CREATE TABLE department_staffs (id uuid PRIMARY KEY); CREATE TABLE coop_requests (id uuid PRIMARY KEY, status text NOT NULL, submitted_at timestamp);
      CREATE TABLE job_postings (id uuid PRIMARY KEY);`);
    const qi = sequelize.getQueryInterface();
    await require('../src/db/migrations/011_add_role_workflow_reviews').up({context:qi});
    await migration.up({context:qi}); await migration.down({context:qi});
    const original = qi.addColumn;
    qi.addColumn = async () => {throw new Error('injected DDL failure');};
    try {await assert.rejects(migration.up({context:qi}), /injected DDL failure/);} finally {qi.addColumn = original;}
    const [absent] = await sequelize.query(`SELECT to_regclass('coop_request_prerequisite_courses') AS table_name`); assert.equal(absent[0].table_name, null);
    await migration.up({context:qi});
    const request = randomUUID(); await sequelize.query('INSERT INTO coop_requests (id,status) VALUES (:id,\'advisor_review\')', {replacements:{id:request}});
    const insert = (status, grade, code = '060243102') => sequelize.query(`INSERT INTO coop_request_prerequisite_courses (id,coop_request_id,program,course_code,course_name,status,grade) VALUES (:id,:request,'IT',:code,'Fixture',:status,:grade)`, {replacements:{id:randomUUID(),request,code,status,grade}});
    await assert.rejects(insert('passed',null)); await assert.rejects(insert('studying','A')); await assert.rejects(insert('unselected','A')); await assert.rejects(insert('passed','A','060233107'));
    await insert('passed','B+'); await assert.rejects(insert('passed','B+'));
    await assert.rejects(migration.down({context:qi}), /rollback refused/);
  } finally {
    if (created) await sequelize.query(`DROP SCHEMA "${schema}" CASCADE`);
    await sequelize.close();
  }
});
