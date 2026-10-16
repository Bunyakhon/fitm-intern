import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { privatePath, privateDirectory, createPrivate, noLinks, regular } from './files.js';
import { demand } from './errors.js';
const derive = promisify(scrypt);
const parameters = Object.freeze({ N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
const hash = text => createHash('sha256').update(text).digest('hex');
export async function credential(password) {
  demand(typeof password === 'string' && password.length >= 14 && password.length <= 256, 'PASSWORD_LENGTH', 'ใช้รหัสผ่าน 14–256 ตัวอักษร');
  const salt = randomBytes(32);
  const key = await derive(password, salt, 64, parameters);
  return { version: 1, username: 'root', algorithm: 'scrypt', salt: salt.toString('hex'), hash: key.toString('hex'), backupKey: randomBytes(32).toString('hex') };
}
export async function verify(password, record) {
  if (typeof password !== 'string' || password.length > 256 || !password.length) return false;
  const result = await derive(password, Buffer.from(record.salt, 'hex'), 64, parameters);
  return timingSafeEqual(result, Buffer.from(record.hash, 'hex'));
}
export async function initializeState(directory, repo, password) {
  const relative = path.relative(path.resolve(repo), path.resolve(directory));
  demand(relative && (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)), 'STATE_LOCATION', 'Credential Store ต้องอยู่นอก Repository');
  await fs.mkdir(path.dirname(directory), { recursive: true, mode: 0o700 });
  await noLinks(path.dirname(directory));
  await privateDirectory(directory);
  const record = await credential(password);
  await privateDirectory(path.join(directory, 'backups'));
  await createPrivate(path.join(directory, 'root.json'), Buffer.from(JSON.stringify(record)));
}
export async function readCredential(directory) {
  await privatePath(directory);
  const file = path.join(directory, 'root.json');
  await privatePath(file); await regular(file);
  const bytes = await fs.readFile(file);
  demand(bytes.length < 4096, 'CREDENTIAL_STORE', 'Credential Store ไม่ถูกต้อง', 503);
  const record = JSON.parse(bytes.toString('utf8'));
  demand(record.version === 1 && record.username === 'root' && record.algorithm === 'scrypt' && /^[a-f0-9]{64}$/.test(record.salt) && /^[a-f0-9]{128}$/.test(record.hash) && /^[a-f0-9]{64}$/.test(record.backupKey), 'CREDENTIAL_STORE', 'Credential Store ไม่ถูกต้อง', 503);
  return record;
}
export class Sessions {
  constructor({ now = Date.now, lifetime = 4 * 60 * 60 * 1000, idle = 20 * 60 * 1000 } = {}) {
    this.now = now; this.lifetime = lifetime; this.idle = idle; this.items = new Map();
  }
  create(oldToken, authenticated = false) {
    this.delete(oldToken); this.sweep();
    demand(this.items.size < 20, 'SESSION_LIMIT', 'มี Session มากเกินไป', 429);
    const token = randomBytes(32).toString('base64url'), now = this.now();
    const session = { csrf: randomBytes(32).toString('base64url'), created: now, touched: now, plans: new Map(), authenticated };
    this.items.set(hash(token), session); return { token, session };
  }
  get(token, touch = true) {
    if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) return null;
    const session = this.items.get(hash(token));
    if (!session) return null;
    if (this.now() - session.created >= this.lifetime || this.now() - session.touched >= this.idle) { this.delete(token); return null; }
    if (touch) session.touched = this.now();
    for (const [id, plan] of session.plans) if (plan.expires <= this.now()) session.plans.delete(id);
    return session;
  }
  delete(token) { if (typeof token === 'string') this.items.delete(hash(token)); }
  sweep() {
    for (const [key,s] of this.items) {
      if (this.now() - s.created >= this.lifetime || this.now() - s.touched >= this.idle) this.items.delete(key);
      else for (const [id,plan] of s.plans) if (plan.expires <= this.now()) s.plans.delete(id);
    }
  }
}
export class LoginLimit {
  constructor({ now = Date.now, max = 5, window = 15 * 60 * 1000 } = {}) { this.now = now; this.max = max; this.window = window; this.attempts = []; }
  take() {
    this.attempts = this.attempts.filter(t => t > this.now() - this.window);
    demand(this.attempts.length < this.max, 'LOGIN_LIMIT', 'ลองรหัสผ่านหลายครั้งเกินไป กรุณารอ 15 นาที', 429);
    this.attempts.push(this.now());
  }
  success() { this.attempts = []; }
}
