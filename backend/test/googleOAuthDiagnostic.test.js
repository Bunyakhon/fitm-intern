const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { generateKeyPairSync } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { createDiagnostic } = require('../scripts/googleOAuthDiagnostic');
const { createGoogleTokenVerifier } = require('../src/services/googleToken.service');
const clientId = '123-synthetic-diagnostic.apps.googleusercontent.com';
const origin = 'http://localhost:5173';
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...keys.publicKey.export({ format: 'jwk' }), kid: 'synthetic-diagnostic-key', use: 'sig', alg: 'RS256' };
async function fixture(t, options = {}) {
  const clock = { value: Date.now() }, outcomes = [];
  const verifier = createGoogleTokenVerifier({ now: () => clock.value, fetchKeys: async url => {
    assert.equal(url, 'https://www.googleapis.com/oauth2/v3/certs');
    return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'max-age=600' } });
  } });
  const service = createDiagnostic({ clientId, origin, now: () => clock.value, verify: verifier, onComplete: result => outcomes.push(result), ...options });
  const port = await service.listen(0), base = `http://127.0.0.1:${port}`;
  t.after(() => service.close());
  async function post(endpoint, body, headers = {}) {
    const response = await fetch(base + endpoint, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  const challenge = async () => (await post('/challenge', {})).body;
  function signed(item, extra = {}, signOptions = {}) {
    return jwt.sign({ sub: 'synthetic-subject', email: 'synthetic@email.kmutnb.ac.th', email_verified: true, hd: 'workspace.example.ac.th', nonce: item.nonce, iat: Math.floor(clock.value / 1000), ...extra }, keys.privateKey,
      { algorithm: 'RS256', keyid: jwk.kid, audience: clientId, issuer: 'https://accounts.google.com', expiresIn: '5m', ...signOptions });
  }
  const exchange = (item, credential = signed(item)) => post('/verify', { credential, requestId: item.requestId, requestToken: item.requestToken });
  return { clock, outcomes, service, post, challenge, signed, exchange, base };
}
test('diagnostic verifies a signed token and reports only hd and verification statuses', async t => {
  const f = await fixture(t), item = await f.challenge(), reply = await f.exchange(item);
  assert.equal(reply.status, 200); assert.equal(reply.body.hd, 'workspace.example.ac.th');
  assert.equal(reply.body.nonceValidation, 'PASS'); assert.equal(reply.body.emailVerified, true);
  assert.equal(reply.body.internalAudience, 'PASS'); assert.equal(f.service.pendingCount(), 0);
  const text = JSON.stringify(reply.body);
  for (const value of ['synthetic@email.kmutnb.ac.th', 'synthetic-subject', clientId, item.nonce, item.requestToken]) assert.equal(text.includes(value), false);
  assert.equal(reply.headers.get('cache-control'), 'no-store');
  assert.equal((await f.exchange(item)).status, 410);
});
test('diagnostic rejects wrong/missing Origin, hostile Host and overbroad preflights', async t => {
  const f = await fixture(t);
  for (const headers of [{ Origin: 'http://attacker.invalid' }, { Origin: '' }]) {
    const reply = await f.post('/challenge', {}, headers); assert.equal(reply.status, 403); assert.equal(reply.headers.get('access-control-allow-origin'), null);
  }
  // fetch can normalize Host; use raw HTTP to exercise the rebinding guard.
  const hostile = await new Promise((resolve, reject) => {
    const request = http.request(f.base + '/challenge', { method: 'POST', headers: { Host: 'attacker.invalid', Origin: origin, 'Content-Type': 'application/json' } }, response => {
      response.resume(); response.on('end', () => resolve({ status: response.statusCode, cors: response.headers['access-control-allow-origin'] }));
    }); request.on('error', reject); request.end('{}');
  });
  assert.equal(hostile.status, 403); assert.equal(hostile.cors, undefined);
  const reply = await fetch(f.base + '/verify', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type, authorization' } });
  assert.equal(reply.status, 403); assert.equal(f.service.pendingCount(), 0);
});
test('diagnostic matches nonce and consumes a challenge even when nonce verification fails', async t => {
  const f = await fixture(t), item = await f.challenge();
  const reply = await f.exchange(item, f.signed(item, { nonce: 'different-nonce' }));
  assert.equal(reply.status, 401); assert.equal(reply.body.code, 'NONCE_MISMATCH'); assert.equal('hd' in reply.body, false);
  assert.equal((await f.exchange(item)).body.code, 'CHALLENGE_INVALID'); assert.equal(f.outcomes.length, 0);
});
test('diagnostic rejects expired challenge and wrong request secret without verifying credentials', async t => {
  const f = await fixture(t), item = await f.challenge();
  const wrong = await f.post('/verify', { credential: 'synthetic-credential', requestId: item.requestId, requestToken: 'x'.repeat(43) });
  assert.equal(wrong.body.code, 'CHALLENGE_INVALID'); f.clock.value += 120001;
  assert.equal((await f.exchange(item)).body.code, 'CHALLENGE_INVALID');
});
test('diagnostic rejects wrong audience, issuer, azp, expired token and missing nonce', async t => {
  const f = await fixture(t);
  for (const [extra, options] of [[{}, { audience: 'different-client' }], [{}, { issuer: 'https://attacker.invalid' }], [{ azp: 'different-client' }, {}], [{}, { expiresIn: -1 }], [{ nonce: undefined }, {}]]) {
    const item = await f.challenge(), reply = await f.exchange(item, f.signed(item, extra, options));
    assert.equal(reply.status, 401); assert.equal(reply.body.tokenVerification, 'FAIL'); assert.equal(reply.body.hd, null);
  }
});
test('diagnostic rejects forged signatures and never returns raw verification errors', async t => {
  const f = await fixture(t), item = await f.challenge();
  const attacker = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const credential = jwt.sign({ nonce: item.nonce }, attacker.privateKey, { algorithm: 'RS256', keyid: jwk.kid, audience: clientId, issuer: 'accounts.google.com', expiresIn: '5m' });
  const reply = await f.exchange(item, credential); assert.equal(reply.body.code, 'TOKEN_VERIFICATION_FAILED'); assert.equal(JSON.stringify(reply.body).includes(credential), false);
});
test('diagnostic concurrent exchange cannot reuse the same challenge', async t => {
  const f = await fixture(t), item = await f.challenge(), credential = f.signed(item);
  const replies = await Promise.all([f.exchange(item, credential), f.exchange(item, credential)]);
  assert.equal(replies.filter(reply => reply.status === 200).length, 1);
  assert.equal(f.outcomes.length, 1);
});
test('diagnostic distinguishes cryptographic verification from email/hosted-domain readiness', async t => {
  for (const extra of [{ email_verified: false }, { hd: undefined }, { hd: '*.example.ac.th' }, { email: 'synthetic@gmail.com' }]) {
    const f = await fixture(t), item = await f.challenge(), reply = await f.exchange(item, f.signed(item, extra));
    assert.equal(reply.body.tokenVerification, 'PASS'); assert.equal(reply.body.hostedDomainReadiness, 'BLOCKED');
    if (Object.hasOwn(extra, 'hd')) assert.equal(reply.body.hd, null);
  }
});
test('diagnostic reports org_internal only as a user-reported provider rejection', async t => {
  const f = await fixture(t); await f.challenge();
  const reply = await f.post('/provider-error', { code: 'org_internal' });
  assert.equal(reply.body.internalAudience, 'FAIL'); assert.equal(reply.body.errorSource, 'USER_REPORTED_GOOGLE_SCREEN'); assert.equal(reply.body.tokenVerification, 'NOT_TESTED'); assert.equal(f.service.pendingCount(), 0);
});
test('diagnostic cancellation clears pending challenges without database access', async t => {
  const f = await fixture(t); await f.challenge(); const reply = await f.post('/cancel', {});
  assert.equal(reply.body.reason, 'USER_CANCELLED'); assert.equal(f.service.pendingCount(), 0);
});
test('diagnostic shutdown closes an unfinished HTTP request and clears memory', async t => {
  const f = await fixture(t); await f.challenge();
  let socket;
  const request = http.request(f.base + '/verify', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'Content-Length': '100' } });
  request.on('error', () => {});
  await new Promise(resolve => { request.once('socket', value => { socket = value; value.once('connect', resolve); }); request.flushHeaders(); });
  await f.service.close();
  assert.equal(f.service.pendingCount(), 0);
  await new Promise(resolve => { if (socket.destroyed) resolve(); else socket.once('close', resolve); });
  assert.equal(socket.destroyed, true);
});
test('diagnostic rejects oversized/unknown input and caps outstanding challenges', async t => {
  const f = await fixture(t);
  assert.equal((await f.post('/challenge', { credential: 'unexpected' })).status, 400);
  assert.equal((await f.post('/verify', { credential: 'x'.repeat(21000) })).status, 400);
  for (let i = 0; i < 8; i++) await f.challenge();
  assert.equal((await f.post('/challenge', {})).status, 429);
});
test('diagnostic is absent from production entrypoints and contains no database/auth/session imports', () => {
  const source = fs.readFileSync(path.join(__dirname, '../scripts/googleOAuthDiagnostic.js'), 'utf8');
  assert.equal(/require\([^\n]*(?:models|database|googleAuth\.service|jsonwebtoken)/.test(source), false);
  const config = fs.readFileSync(path.join(__dirname, '../../frontend/vite.config.js'), 'utf8');
  assert.equal(config.includes('oauth-hd-diagnostic'), false);
  const page = fs.readFileSync(path.join(__dirname, '../../frontend/oauth-hd-diagnostic.html'), 'utf8');
  assert.equal(/localStorage|sessionStorage|console\.(?:log|error)|\/api\/auth\/google/.test(page), false);
});
