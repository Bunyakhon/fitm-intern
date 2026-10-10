const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const models = require('../src/models');
const studentRouter = require('../src/routes/coopRequest.routes');

test('Student cancellation API route/method contract through production router (unit SQL stubs)', async t => {
  const original = { findAll: models.CoopRequest.findAll, findOne: models.CoopRequest.findOne, transaction: models.sequelize.transaction, secret: process.env.JWT_SECRET };
  const owner = crypto.randomUUID(), other = crypto.randomUUID(), requestId = crypto.randomUUID();
  const queries = []; let rollbacks = 0;
  const cancelled = { id: requestId, student_id: owner, status: 'cancelled', save: async () => { throw Error('History must remain immutable'); } };
  models.CoopRequest.findAll = async ({ where }) => { queries.push(where); return where.student_id === owner ? [cancelled] : []; };
  models.CoopRequest.findOne = async ({ where }) => { queries.push(where); return where.id === requestId && where.student_id === owner ? cancelled : null; };
  models.sequelize.transaction = async () => ({ LOCK: { UPDATE: 'UPDATE' }, rollback: async () => { rollbacks++; }, commit: async () => { throw Error('Cancelled request must not commit'); } });
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  const token = id => jwt.sign({ id, student_id: `unit-${id}`, actor_type: 'student' }, process.env.JWT_SECRET, { expiresIn: '1m' });
  const ownerToken = token(owner), otherToken = token(other);
  const app = express(); app.use(express.json()); app.use('/api/coop-requests', studentRouter);
  const server = http.createServer(app);
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const url = `http://127.0.0.1:${server.address().port}`;
    const call = (path, bearer, method = 'GET') => new Promise((resolve, reject) => {
      // A one-shot native HTTP client closes its socket without a global fetch pool.
      const request = http.request(url + path, { method, agent: false, headers: { Authorization: `Bearer ${bearer}` } }, response => {
        let body = ''; response.setEncoding('utf8'); response.on('data', chunk => { body += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, contentType: response.headers['content-type'],
          data: response.headers['content-type']?.includes('application/json') ? JSON.parse(body) : undefined }));
        response.on('error', reject);
      });
      request.on('error', reject); request.end();
    });
    await t.test('GET root has no list route; GET /me scopes the list to authenticated owner', async () => {
      const wrong = await call('/api/coop-requests', otherToken); assert.equal(wrong.status, 404); assert.match(wrong.contentType, /text\/html/);
      const correct = await call('/api/coop-requests/me', otherToken); assert.equal(correct.status, 200); assert.deepEqual(correct.data.data, []);
      assert.deepEqual(queries.at(-1), { student_id: other });
    });
    await t.test('POST cancel has no route; PATCH reaches the immutable cancelled-state check', async () => {
      const wrong = await call(`/api/coop-requests/${requestId}/cancel`, ownerToken, 'POST'); assert.equal(wrong.status, 404);
      const correct = await call(`/api/coop-requests/${requestId}/cancel`, ownerToken, 'PATCH'); assert.equal(correct.status, 400); assert.equal(correct.data.success, false);
      assert.equal(rollbacks, 1); assert.equal(cancelled.status, 'cancelled');
    });
    await t.test('Foreign detail returns 404 using the JWT owner filter', async () => {
      const response = await call(`/api/coop-requests/${requestId}`, otherToken); assert.equal(response.status, 404); assert.equal(response.data.data, undefined);
      assert.deepEqual(queries.at(-1), { id: requestId, student_id: other });
    });
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    models.CoopRequest.findAll = original.findAll; models.CoopRequest.findOne = original.findOne; models.sequelize.transaction = original.transaction;
    if (original.secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original.secret;
  }
});
