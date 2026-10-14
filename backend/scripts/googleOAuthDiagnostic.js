// Explicitly started, loopback-only Development diagnostic. No models/auth services.
const http = require('node:http');
const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const { createGoogleTokenVerifier } = require('../src/services/googleToken.service');

const hash = value => createHash('sha256').update(value).digest();
const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/;
const providerErrors = new Set(['org_internal', 'access_denied', 'invalid_client', 'origin_mismatch', 'other']);
function createDiagnostic({ clientId, origin, verify = createGoogleTokenVerifier(), now = Date.now,
  onComplete = () => {}, lifetimeMs = 20 * 60 * 1000 }) {
  if (!/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(clientId || '') || origin !== 'http://localhost:5173') throw Error('DIAGNOSTIC_CONFIG_INVALID');
  const challenges = new Map();
  let completed = false, finalResult, inFlight = false, requestWindow = now(), requests = 0;
  function complete(result) {
    if (completed) return;
    completed = true; finalResult = Object.freeze(result); challenges.clear(); clearTimeout(expiry);
    onComplete(finalResult);
  }
  const expiry = setTimeout(() => complete({ internalAudience: 'BLOCKED', reason: 'DIAGNOSTIC_TIMEOUT', tokenVerification: 'NOT_TESTED', nonceValidation: 'NOT_TESTED', hd: null }), lifetimeMs);
  expiry.unref();
  function send(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(body));
  }
  async function readBody(req) {
    if (req.headers['content-type'] !== 'application/json') throw Error('CONTENT_TYPE');
    const chunks = []; let bytes = 0, oversized = false;
    try {
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 20000) { oversized = true; chunk.fill(0); } else chunks.push(chunk); }
      if (oversized) throw Error('BODY_LIMIT');
      const buffer = Buffer.concat(chunks);
      try { const body = JSON.parse(buffer.toString('utf8')); if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('BODY'); return body; }
      finally { buffer.fill(0); }
    } finally { for (const chunk of chunks) chunk.fill(0); }
  }
  const server = http.createServer(async (req, res) => {
    // Exact Host + Origin checks also prevent browser DNS-rebinding requests.
    const port = req.socket.localPort;
    if (req.socket.remoteAddress !== '127.0.0.1' || ![`localhost:${port}`, `127.0.0.1:${port}`].includes(req.headers.host)) return send(res, 403, { code: 'LOOPBACK_REQUIRED' });
    if (req.headers.origin !== origin) return send(res, 403, { code: 'ORIGIN_REJECTED' });
    res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      if (req.headers['access-control-request-method'] !== 'POST' || (req.headers['access-control-request-headers'] || '').toLowerCase() !== 'content-type') return send(res, 403, { code: 'PREFLIGHT_REJECTED' });
      res.setHeader('Access-Control-Allow-Methods', 'POST'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); return send(res, 200, {});
    }
    if (req.method === 'GET' && req.url === '/status') return send(res, 200, { active: !completed, pendingChallenges: challenges.size, result: finalResult || null });
    if (req.method !== 'POST') return send(res, 405, { code: 'METHOD_REJECTED' });
    if (completed) return send(res, 410, { code: 'DIAGNOSTIC_FINISHED' });
    if (now() - requestWindow > 60000) { requestWindow = now(); requests = 0; }
    if (++requests > 40) return send(res, 429, { code: 'RATE_LIMIT' });
    let body;
    try {
      body = await readBody(req);
      if (req.url === '/challenge') {
        if (Object.keys(body).length) return send(res, 400, { code: 'INPUT_REJECTED' });
        for (const [id, item] of challenges) if (item.expiresAt <= now()) challenges.delete(id);
        if (challenges.size >= 8) return send(res, 429, { code: 'CHALLENGE_LIMIT' });
        const requestId = randomBytes(24).toString('base64url'), nonce = randomBytes(32).toString('base64url'), requestToken = randomBytes(32).toString('base64url');
        const expiresAt = now() + 120000;
        challenges.set(requestId, { nonceHash: hash(nonce), secretHash: hash(requestToken), expiresAt });
        return send(res, 200, { clientId, requestId, requestToken, nonce, expiresAt });
      }
      if (req.url === '/cancel' && !Object.keys(body).length) {
        complete({ internalAudience: 'BLOCKED', reason: 'USER_CANCELLED', tokenVerification: 'NOT_TESTED', nonceValidation: 'NOT_TESTED', hd: null });
        return send(res, 200, finalResult);
      }
      if (req.url === '/provider-error') {
        if (Object.keys(body).some(key => key !== 'code') || !providerErrors.has(body.code)) return send(res, 400, { code: 'INPUT_REJECTED' });
        complete({ internalAudience: body.code === 'org_internal' ? 'FAIL' : 'BLOCKED', reason: body.code, errorSource: 'USER_REPORTED_GOOGLE_SCREEN', tokenVerification: 'NOT_TESTED', nonceValidation: 'NOT_TESTED', hd: null });
        return send(res, 200, finalResult);
      }
      if (req.url !== '/verify') return send(res, 404, { code: 'NOT_FOUND' });
      if (Object.keys(body).some(key => !['credential', 'requestId', 'requestToken'].includes(key)) || typeof body.credential !== 'string' || body.credential.length > 16384 || !/^[\w-]{32}$/.test(body.requestId || '') || !/^[\w-]{43}$/.test(body.requestToken || '')) return send(res, 400, { code: 'INPUT_REJECTED' });
      const challenge = challenges.get(body.requestId);
      if (!challenge || challenge.expiresAt <= now() || !timingSafeEqual(challenge.secretHash, hash(body.requestToken))) return send(res, 401, { code: 'CHALLENGE_INVALID' });
      if (inFlight) return send(res, 409, { code: 'VERIFICATION_BUSY' });
      // Consume before asynchronous JWKS verification: concurrency/replays cannot reuse it.
      challenges.delete(body.requestId); inFlight = true;
      let payload;
      try {
        payload = await verify(body.credential, clientId);
        const nonceValid = typeof payload.nonce === 'string' && timingSafeEqual(challenge.nonceHash, hash(payload.nonce));
        if (!nonceValid) return send(res, 401, { code: 'NONCE_MISMATCH', tokenVerification: 'PASS', nonceValidation: 'FAIL' });
        const emailVerified = payload.email_verified === true;
        const studentDomainMatch = typeof payload.email === 'string' && /^[^\s@]+@email\.kmutnb\.ac\.th$/i.test(payload.email.trim());
        const subjectPresent = typeof payload.sub === 'string' && !!payload.sub && payload.sub.length <= 255;
        const hd = typeof payload.hd === 'string' && payload.hd.length <= 253 && domainPattern.test(payload.hd.toLowerCase()) ? payload.hd.toLowerCase() : null;
        // Only verified hd + booleans/statuses survive. No email, subject, token, JWT or session.
        complete({ internalAudience: 'PASS', internalAudienceBasis: 'VERIFIED_TOKEN_FOR_CURRENT_CLIENT_WITH_USER_CONFIRMED_INTERNAL_SETTING', tokenIssued: true,
          tokenVerification: 'PASS', signature: 'PASS', issuer: 'PASS', audience: 'PASS', azp: payload.azp === undefined ? 'NOT_PRESENT' : 'PASS', expiration: 'PASS', issuedAt: 'PASS',
          nonceValidation: 'PASS', emailVerified, studentDomainMatch, subjectPresent, hdPresent: hd !== null, hd,
          hostedDomainReadiness: emailVerified && studentDomainMatch && subjectPresent && hd ? 'CONFIRMED_FOR_TESTED_STUDENT_ACCOUNT' : 'BLOCKED' });
        return send(res, 200, finalResult);
      } catch { return send(res, 401, { code: 'TOKEN_VERIFICATION_FAILED', tokenVerification: 'FAIL', hd: null }); }
      finally { payload = null; body.credential = null; body.requestToken = null; inFlight = false; }
    } catch { send(res, 400, { code: 'REQUEST_REJECTED' }); }
    finally { if (body) { body.credential = null; body.requestToken = null; } }
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  return {
    listen: port => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => resolve(server.address().port)); }),
    close: () => new Promise(resolve => { challenges.clear(); clearTimeout(expiry); completed = true; server.close(resolve); server.closeIdleConnections(); server.closeAllConnections(); }),
    pendingCount: () => challenges.size
  };
}

async function main() {
  if (process.argv.slice(2).join(' ') !== '--start-development-diagnostic' || process.env.NODE_ENV === 'production') throw Error('EXPLICIT_DEVELOPMENT_START_REQUIRED');
  const fs = require('node:fs'), path = require('node:path');
  const workspace = path.resolve(__dirname, '../..');
  const env = require('dotenv').parse(fs.readFileSync(path.join(workspace, 'backend/.env')));
  if (env.GOOGLE_LOGIN_ENABLED !== 'false' || env.GOOGLE_ACCOUNT_LINKING_ENABLED !== 'false') throw Error('GOOGLE_FLAGS_MUST_REMAIN_OFF');
  const evidence = path.join(workspace, 'docs/audits/evidence/google-oauth-hd-diagnostic');
  fs.mkdirSync(evidence, { recursive: true });
  if (fs.existsSync(path.join(evidence, 'provider-result.json'))) throw Error('EXISTING_RESULT_REQUIRES_NEW_RUN_DIRECTORY');
  let diagnostic;
  const stop = async () => { await diagnostic.close(); console.log('DIAGNOSTIC_STOPPED: challenge references cleared; no token retained'); };
  diagnostic = createDiagnostic({ clientId: env.GOOGLE_CLIENT_ID, origin: new URL(env.FRONTEND_URL).origin, onComplete: result => {
    fs.writeFileSync(path.join(evidence, 'provider-result.json'), JSON.stringify({ at: new Date().toISOString(), ...result, flags: 'false/false', databaseAccess: 'NONE' }, null, 2), { flag: 'wx' });
    // Give the browser time to receive the sanitized result, then terminate the process.
    setTimeout(() => stop().then(() => process.exit(0)), 1500);
  } });
  process.once('SIGINT', () => stop().then(() => process.exit(0)));
  process.once('SIGTERM', () => stop().then(() => process.exit(0)));
  await diagnostic.listen(5001);
  console.log('DIAGNOSTIC_READY: verifier 127.0.0.1:5001; page http://localhost:5173/oauth-hd-diagnostic.html; flags remain off');
}
if (require.main === module) main().catch(() => { console.error('DIAGNOSTIC_START_FAILED: no credentials logged'); process.exitCode = 1; });
module.exports = { createDiagnostic };
