import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { Sessions, LoginLimit, verify, readCredential } from './auth.js';
import { EnvironmentStore } from './store.js';
import { demand, ToolError } from './errors.js';
import { REPO, STATE, PORT } from './paths.js';
const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const cleanToken = value => typeof value === 'string' && /^[\w-]{43}$/.test(value);
export function networkGuard(req, port) {
  demand(req.socket.remoteAddress === '127.0.0.1', 'LOCAL_ONLY', 'อนุญาตเฉพาะ Loopback', 403);
  demand(req.headers.host === `127.0.0.1:${port}`, 'HOST', 'Host ไม่ได้รับอนุญาต ใช้ 127.0.0.1 เท่านั้น', 403);
  demand(!req.headers.forwarded && !Object.keys(req.headers).some(k => k.startsWith('x-forwarded-')), 'PROXY', 'ไม่อนุญาต Proxy', 403);
  demand(!req.headers['sec-fetch-site'] || ['same-origin','none'].includes(req.headers['sec-fetch-site']), 'FETCH_SITE', 'ปฏิเสธ Cross-site Request', 403);
  const origin = req.headers.origin;
  demand(origin === undefined || origin === `http://127.0.0.1:${port}`, 'ORIGIN', 'Origin ไม่ได้รับอนุญาต', 403);
  if (!['GET','HEAD'].includes(req.method)) demand(origin === `http://127.0.0.1:${port}`, 'ORIGIN', 'ต้องส่ง Origin ที่ได้รับอนุญาต', 403);
}
function tokenFrom(req, name) {
  const values = (req.headers.cookie || '').split(';').map(s => s.trim()).filter(s => s.startsWith(`${name}=`));
  return values.length === 1 ? values[0].slice(name.length + 1) : undefined;
}
async function body(req) {
  demand(req.headers['content-type']?.split(';')[0].trim() === 'application/json', 'CONTENT_TYPE', 'ต้องใช้ application/json', 415);
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; demand(size <= 64 * 1024, 'BODY_SIZE', 'คำขอใหญ่เกินไป', 413); chunks.push(chunk); }
  let parsed;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); } catch { throw new ToolError('JSON_INPUT', 'JSON ไม่ถูกต้อง'); }
  demand(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'JSON_INPUT', 'JSON ไม่ถูกต้อง');
  return parsed;
}
function fields(input, allowed) { demand(Object.keys(input).every(k => allowed.includes(k)), 'INPUT_FIELDS', 'คำขอมีข้อมูลที่ไม่รองรับ'); }
export async function createConsole({ repo = REPO, directory = STATE, port = PORT, sessions = new Sessions(), limit = new LoginLimit(), now = Date.now } = {}) {
  const record = await readCredential(directory);
  const store = new EnvironmentStore({ repo, directory, backupKey: record.backupKey });
  await store.development();
  const assets = new Map([
    ['/', [path.join(PUBLIC, 'index.html'), 'text/html; charset=utf-8']],
    ['/app.js', [path.join(PUBLIC, 'app.js'), 'text/javascript; charset=utf-8']],
    ['/style.css', [path.join(PUBLIC, 'style.css'), 'text/css; charset=utf-8']],
    ['/font-regular.ttf', [path.join(REPO, 'frontend/public/fonts/th-sarabun-new/THSarabunNew.ttf'), 'font/ttf']],
    ['/font-bold.ttf', [path.join(REPO, 'frontend/public/fonts/th-sarabun-new/THSarabunNew Bold.ttf'), 'font/ttf']],
  ]);
  let boundPort = port;
  const cleanup = setInterval(() => sessions.sweep(), 30000); cleanup.unref();
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'; object-src 'none'");
    res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    const json = (status, data) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); };
    const cookieName = `FITM_DEV_ROOT_${boundPort}`;
    const setCookie = (token, expire = false) => res.setHeader('Set-Cookie', `${cookieName}=${expire ? '' : token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${expire ? 0 : 14400}${req.socket.encrypted ? '; Secure' : ''}`);
    try {
      networkGuard(req, boundPort);
      demand(!req.url.includes('?') && !req.url.includes('%') && !req.url.includes('..'), 'PATH', 'Path ไม่ได้รับอนุญาต', 404);
      const url = req.url;
      if (assets.has(url)) {
        demand(req.method === 'GET', 'METHOD', 'Method ไม่ได้รับอนุญาต', 405);
        const [file, type] = assets.get(url); const content = await fs.readFile(file);
        res.setHeader('Content-Type', type); res.end(content); return;
      }
      demand(url.startsWith('/api/'), 'NOT_FOUND', 'ไม่พบข้อมูล', 404);
      await store.development();
      const token = tokenFrom(req, cookieName);
      let session = sessions.get(token);
      if (url === '/api/session' && req.method === 'GET') {
        if (!session) { const fresh = sessions.create(token); session = fresh.session; setCookie(fresh.token); }
        json(200, { authenticated: session.authenticated, username: session.authenticated ? 'root' : null, csrf: session.csrf, expiresAt: session.created + sessions.lifetime, idleMinutes: sessions.idle / 60000 }); return;
      }
      demand(session, 'SESSION', 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
      const mutating = req.method === 'POST';
      demand(req.method === 'GET' || mutating, 'METHOD', 'Method ไม่ได้รับอนุญาต', 405);
      if (mutating) {
        const csrf = req.headers['x-csrf-token'];
        demand(cleanToken(csrf) && timingSafeEqual(Buffer.from(csrf), Buffer.from(session.csrf)), 'CSRF', 'CSRF Token ไม่ถูกต้อง', 403);
      }
      if (url === '/api/login' && mutating) {
        const input = await body(req); fields(input, ['username','password']); limit.take();
        const correct = await verify(input.password, record);
        demand(input.username === 'root' && correct, 'LOGIN', 'ชื่อบัญชีหรือรหัสผ่านไม่ถูกต้อง', 401);
        demand(sessions.get(token, false) === session, 'SESSION', 'Session หมดอายุหรือ Logout แล้ว', 401);
        limit.success(); const fresh = sessions.create(token, true); setCookie(fresh.token);
        json(200, { authenticated: true, csrf: fresh.session.csrf, username: 'root', expiresAt: fresh.session.created + sessions.lifetime }); return;
      }
      demand(session.authenticated === true, 'AUTH', 'ต้องเข้าสู่ระบบ Developer Root', 401);
      if (url === '/api/logout' && mutating) { fields(await body(req), []); sessions.delete(token); setCookie('', true); json(200, { loggedOut: true }); return; }
      const match = /^\/api\/env\/(backend|frontend|nlp)(?:\/(preview|commit|backups|backup|restore-preview))?$/.exec(url);
      demand(match, 'NOT_FOUND', 'Service หรือ API ไม่อยู่ใน Allowlist', 404);
      const [, service, action] = match;
      if (!action && req.method === 'GET') { json(200, await store.read(service)); return; }
      if (action === 'backups' && req.method === 'GET') { json(200, { backups: await store.history(service) }); return; }
      demand(mutating, 'METHOD', 'Method ไม่ได้รับอนุญาต', 405);
      const input = await body(req);
      if (action === 'preview' || action === 'restore-preview') {
        fields(input, action === 'preview' ? ['version','changes'] : ['version','backupId']);
        const plan = action === 'preview' ? await store.preview(service, input.version, input.changes) : await store.restorePreview(service, input.version, input.backupId);
        session.plans.clear();
        const id = randomUUID(); session.plans.set(id, { ...plan, expires: now() + 5 * 60 * 1000 });
        json(200, { previewId: id, changes: plan.preview, warnings: plan.warnings, restore: action === 'restore-preview', expiresInSeconds: 300 }); return;
      }
      demand(['commit','backup'].includes(action), 'NOT_FOUND', 'ไม่พบ API', 404);
      fields(input, action === 'commit' ? ['previewId','password','confirmed'] : ['version','password','confirmed']);
      demand(input.confirmed === true, 'CONFIRMATION', 'ต้องยืนยันการดำเนินการ');
      limit.take(); demand(await verify(input.password, record), 'REAUTH', 'รหัสผ่านไม่ถูกต้อง', 401); limit.success();
      demand(sessions.get(token, false) === session && session.authenticated, 'SESSION', 'Session หมดอายุหรือ Logout แล้ว', 401);
      if (action === 'backup') { json(200, { backup: await store.backup(service, input.version) }); return; }
      const plan = session.plans.get(input.previewId); session.plans.delete(input.previewId);
      demand(plan && plan.service === service && plan.expires > now(), 'PREVIEW_EXPIRED', 'Preview หมดอายุหรือถูกใช้แล้ว กรุณาตรวจใหม่', 409);
      // Slow password checks must not resurrect a logged-out or expired session.
      demand(sessions.get(token, false) === session && session.authenticated, 'SESSION', 'Session หมดอายุหรือ Logout แล้ว', 401);
      json(200, await store.commit(plan));
    } catch (error) {
      // No request logging, stacks, paths, file contents or raw crypto/parser errors.
      if (!res.headersSent) json(error instanceof ToolError ? error.status : 503, {
        code: error instanceof ToolError ? error.code : 'TOOL_UNAVAILABLE',
        message: error instanceof ToolError ? error.message : 'เครื่องมือไม่พร้อมทำงาน กรุณาตรวจไฟล์/สิทธิ์จากเครื่อง Local',
      });
      else res.end();
    }
  });
  server.requestTimeout = 10000; server.headersTimeout = 5000; server.keepAliveTimeout = 1000; server.maxConnections = 20;
  server.on('clientError', (_error, socket) => { socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); });
  return {
    server, store, sessions,
    async listen() {
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
      boundPort = server.address().port;
      return `http://127.0.0.1:${boundPort}`;
    },
    async close() { clearInterval(cleanup); sessions.items.clear(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); },
  };
}
