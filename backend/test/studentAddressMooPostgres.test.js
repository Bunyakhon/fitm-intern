// Opt-in real PostgreSQL acceptance; never connects to Development business data.
// FITM_PROFILE_MOO_ACCEPTANCE_DB=fitm_profile_accept_YYYYMMDD_<8 hex> node --test <this file>
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const helper = require('../src/db/studentProfileDevelopment');
const database = process.env.FITM_PROFILE_MOO_ACCEPTANCE_DB;
if (database && !helper.isolatedName(database)) throw Error('Only an isolated profile acceptance database is allowed');

test('Address moo protected HTTP/PostgreSQL acceptance and additive migration idempotence', { skip: !database, timeout: 60000 }, async t => {
  const env = require('dotenv').parse(fs.readFileSync(path.join(__dirname, '../.env')));
  assert.equal(env.NODE_ENV, 'development'); assert.equal(env.DB_NAME, 'intern_system');
  Object.assign(process.env, env, { DB_HOST: '127.0.0.1', DB_NAME: database, JWT_SECRET: randomBytes(48).toString('hex'), DOTENV_CONFIG_QUIET: 'true' });
  const models = require('../src/models'), sequelize = models.sequelize;
  assert.equal(sequelize.config.database, database); assert.notEqual(database, 'intern_system');
  let before, schemaBefore, server; const owners = [];
  try {
    const migration = require('../src/db/studentAddressMoo');
    await assert.rejects(() => migration.applyAddressMoo(sequelize, { expectedDatabase: 'wrong_target' }));
    await migration.applyAddressMoo(sequelize, { expectedDatabase: database });
    before = await helper.fingerprints(sequelize, undefined, { excludeContacts: false }); schemaBefore = await helper.schemaSnapshot(sequelize);
    await t.test('rerunning migration preserves every existing row and constraint', async () => {
      assert.equal((await migration.applyAddressMoo(sequelize, { expectedDatabase: database })).changed, false);
      assert.equal(helper.digest(await helper.fingerprints(sequelize, undefined, { excludeContacts: false })), helper.digest(before));
      assert.equal(helper.digest(await helper.schemaSnapshot(sequelize)), helper.digest(schemaBefore));
    });
    const express = require('express'), jwt = require('jsonwebtoken'), app = express();
    app.use(express.json()); app.use('/api/student-profile', require('../src/routes/studentProfile.routes'));
    server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    const base = 'http://127.0.0.1:' + server.address().port + '/api/student-profile';
    for (let i = 0; i < 2; i++) {
      const code = '999' + String(BigInt('0x' + randomBytes(6).toString('hex')) % 10000000000n).padStart(10, '0');
      const student = await models.Student.create({ id: randomUUID(), student_id: code, email: 's' + code + '@email.kmutnb.ac.th', first_name: 'Fixture', last_name: 'Moo acceptance', track: 'co_op', password: randomBytes(20).toString('hex') });
      owners.push({ id: student.id, token: jwt.sign({ id: student.id, student_id: code, role: 'student', actor_type: 'student' }, process.env.JWT_SECRET, { expiresIn: '10m' }) });
    }
    const [a, b] = owners;
    const request = async (owner, method, route, body, revision) => {
      const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(owner ? { Authorization: 'Bearer ' + owner.token } : {}), ...(revision ? { 'If-Match': revision } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json() };
    };
    const read = async (owner = a) => { const result = await request(owner, 'GET', '/aggregate'); assert.equal(result.status, 200); return result.body; };
    const save = async body => { const prior = await read(), result = await request(a, 'PATCH', '/aggregate', body, prior.profile_revision); assert.equal(result.status, 200, result.body.code); return result.body; };
    const sql = async () => (await sequelize.query('SELECT id,address_type,house_no,moo,road,province,district,subdistrict,postal_code FROM public.student_addresses WHERE student_id=$1 ORDER BY address_type', { bind: [a.id] }))[0];
    await t.test('both address types save nullable text and read back exact digits including leading zeroes', async () => {
      assert.equal((await request(null, 'GET', '/aggregate')).status, 401);
      assert.equal((await read()).address_moo_available, true);
      await save({ addresses: { create: [{ address_type: 'registered', house_no: '23/15' }, { address_type: 'current', house_no: '24/15' }] } });
      for (const row of await sql()) assert.equal(row.moo, null);
      for (const moo of ['1', '3', '12', '01']) {
        const prior = await read(); await save({ addresses: { update: prior.addresses.map(row => ({ id: row.id, changes: { moo } })) } });
        for (const row of await sql()) { assert.equal(row.moo, moo); assert.equal(typeof row.moo, 'string'); }
        for (const row of (await read()).addresses) assert.equal(row.moo, moo);
      }
      const prior = await read(); await save({ addresses: { update: prior.addresses.map(row => ({ id: row.id, changes: { moo: '' } })) } });
      for (const row of await sql()) assert.equal(row.moo, null);
    });
    await t.test('API rejects negative/decimal/letter/non-string values; database CHECK protects direct writes', async () => {
      const prior = await read(), id = prior.addresses[0].id;
      for (const moo of ['-1', '1.5', 'x', '123', '+1', 1]) {
        assert.equal((await request(a, 'PATCH', '/addresses/' + id, { moo }, prior.profile_revision)).status, 400);
        await assert.rejects(() => sequelize.transaction(transaction => sequelize.query('UPDATE public.student_addresses SET moo=$1 WHERE id=$2 AND student_id=$3', { bind: [String(moo) === '1' ? 'x' : String(moo), id, a.id], transaction })));
      }
      assert.equal((await read()).profile_revision, prior.profile_revision);
    });
    await t.test('owner isolation, atomic rollback and stale revision keep saved moo and all other fields', async () => {
      const old = await read(), id = old.addresses[0].id;
      assert.equal((await request(b, 'PATCH', '/addresses/' + id, { moo: '3' }, (await read(b)).profile_revision)).status, 404);
      await save({ addresses: { update: [{ id, changes: { moo: '3', house_no: '25/15' } }] } });
      assert.equal((await request(a, 'PATCH', '/addresses/' + id, { moo: '12' }, old.profile_revision)).status, 409);
      const current = await read();
      const rejected = await request(a, 'PATCH', '/aggregate', { addresses: { update: [{ id, changes: { moo: '12' } }, { id: randomUUID(), changes: { moo: '1' } }] } }, current.profile_revision);
      assert.equal(rejected.status, 404); assert.equal((await read()).profile_revision, current.profile_revision);
      assert.equal((await sql()).find(row => row.id === id).moo, '3'); assert.equal((await sql()).find(row => row.id === id).house_no, '25/15');
    });
  } finally {
    try {
      for (const owner of owners) await models.Student.destroy({ where: { id: owner.id } });
      if (before) assert.equal(helper.digest(await helper.fingerprints(sequelize, undefined, { excludeContacts: false })), helper.digest(before), 'Pre-existing rows changed');
      if (schemaBefore) assert.equal(helper.digest(await helper.schemaSnapshot(sequelize)), helper.digest(schemaBefore), 'Schema changed outside migration');
    } finally {
      if (server) await new Promise(resolve => server.close(resolve)); await sequelize.close();
    }
  }
});
