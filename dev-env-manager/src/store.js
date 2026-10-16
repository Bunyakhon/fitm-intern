import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { SERVICES } from './paths.js';
import { snapshot, privatePath, privateDirectory, createPrivate, replace, digest, regular } from './files.js';
import { parseDocument, publicDocument, editDocument, validate, sensitive, warnings } from './env-document.js';
import { demand, ToolError } from './errors.js';
const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const RESTART = Object.freeze({
  backend: { status: 'Unknown', advice: 'Compose env_file ถูกอ่านตอนสร้าง Container: ใช้ docker compose up -d --no-deps --force-recreate backend ด้วยตนเองเมื่อพร้อม; nodemon reload อย่างเดียวไม่รับประกันค่าใหม่ และไม่ต้อง restart PostgreSQL' },
  frontend: { status: 'Unknown', advice: 'Vite อ่าน .env ตอนเริ่มทำงาน และ Compose env_file อาจ override ค่าไฟล์: ใช้ docker compose up -d --no-deps --force-recreate frontend ด้วยตนเอง; Production bundle ต้อง build ใหม่แยกตามขั้นตอนของระบบ' },
  nlp: { status: 'Unknown', advice: 'Host Python ใช้ pydantic-settings อ่าน .env ตาม working directory ตอนเริ่มทำงาน. Compose ปัจจุบันไม่ mount/pass nlp-service/.env และกำหนด PORT=8000 ไว้เอง: Save ไฟล์นี้ไม่มีผลต่อ NLP Container แม้ recreate; ต้องตกลงการเชื่อม Environment แยก ห้ามเครื่องมือเปลี่ยน Compose' },
});
export class EnvironmentStore {
  constructor({ repo, directory, backupKey }) {
    this.repo = repo; this.directory = directory; this.key = Buffer.from(backupKey, 'hex');
    this.backups = path.join(directory, 'backups'); this.busy = false;
    this.pending = new Set();
  }
  target(service) {
    demand(Object.hasOwn(SERVICES, service), 'SERVICE', 'Service ไม่อยู่ใน Allowlist', 404);
    return path.join(this.repo, SERVICES[service]);
  }
  async development() {
    demand(process.env.NODE_ENV === 'development', 'DEVELOPMENT_ONLY', 'BLOCKED: ต้องเปิดเครื่องมือด้วย NODE_ENV=development', 503);
    const current = await snapshot(this.target('backend'));
    demand(parseDocument(current.bytes).entries.get('NODE_ENV')?.value === 'development', 'DEVELOPMENT_ONLY', 'BLOCKED: Backend ต้องเป็น Development เท่านั้น', 503);
  }
  async read(service) {
    try {
      const original = await snapshot(this.target(service));
      return { service, version: original.version, variables: publicDocument(parseDocument(original.bytes)), restart: { ...RESTART[service], pending: this.pending.has(service) }, path: SERVICES[service] };
    } catch (error) { if (error.code === 'ENOENT') throw new ToolError('ENV_MISSING', 'ไม่พบไฟล์ .env; เครื่องมือจะไม่สร้างไฟล์เอง', 409); throw error; }
  }
  async preview(service, version, changes) {
    const original = await snapshot(this.target(service));
    demand(version === original.version, 'FILE_CONFLICT', 'ไฟล์ถูกแก้จากภายนอก กรุณาโหลดใหม่', 409);
    const edited = editDocument(original.bytes, service, changes);
    return { service, version, ...edited };
  }
  async exclusive(action) {
    demand(!this.busy, 'FILE_BUSY', 'มีการบันทึก/สำรองอื่นอยู่ กรุณาลองใหม่', 409);
    this.busy = true;
    try { return await action(); } finally { this.busy = false; }
  }
  async backupSnapshot(service, original) {
    await privatePath(this.directory); await privateDirectory(this.backups);
    const id = randomUUID(), createdAt = new Date().toISOString();
    const metadata = { id, service, createdAt, version: 1 };
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(JSON.stringify(metadata)));
    const data = Buffer.concat([cipher.update(original.bytes), cipher.final()]);
    const record = { ...metadata, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: data.toString('base64'), sha256: digest(original.bytes) };
    const file = path.join(this.backups, `${id}.json`);
    await createPrivate(file, Buffer.from(JSON.stringify(record)));
    const verified = await this.backupContent(id, service);
    demand(verified.bytes.equals(original.bytes), 'BACKUP_INTEGRITY', 'Backup ตรวจสอบไม่ผ่าน; ไม่บันทึก .env', 503);
    return metadata;
  }
  async backup(service, version) {
    return this.exclusive(async () => {
      const original = await snapshot(this.target(service));
      demand(original.version === version, 'FILE_CONFLICT', 'ไฟล์ถูกแก้จากภายนอก กรุณาโหลดใหม่', 409);
      return this.backupSnapshot(service, original);
    });
  }
  async backupContent(id, service) {
    demand(ID.test(id || ''), 'BACKUP_ID', 'Backup ID ไม่ถูกต้อง', 400);
    this.target(service);
    await privatePath(this.directory); await privatePath(this.backups);
    const file = path.join(this.backups, `${id}.json`);
    await privatePath(file); const stat = await regular(file);
    demand(stat.size <= 256 * 1024, 'BACKUP_INTEGRITY', 'Backup ไม่ถูกต้อง', 409);
    try {
      const record = JSON.parse(await fs.readFile(file, 'utf8'));
      demand(record.id === id && record.service === service && record.version === 1 && /^\d{4}-\d\d-\d\dT/.test(record.createdAt), 'BACKUP_INTEGRITY', 'Backup ไม่ตรง Service หรือ Integrity ไม่ถูกต้อง', 409);
      const { id: backupId, service: backupService, createdAt, version } = record;
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(record.iv, 'hex'));
      decipher.setAAD(Buffer.from(JSON.stringify({ id: backupId, service: backupService, createdAt, version })));
      decipher.setAuthTag(Buffer.from(record.tag, 'hex'));
      const bytes = Buffer.concat([decipher.update(Buffer.from(record.data, 'base64')), decipher.final()]);
      demand(digest(bytes) === record.sha256, 'BACKUP_INTEGRITY', 'Backup Integrity ไม่ถูกต้อง', 409);
      parseDocument(bytes);
      return { bytes, metadata: { id, service, createdAt } };
    } catch { throw new ToolError('BACKUP_INTEGRITY', 'Backup Integrity ไม่ถูกต้อง', 409); }
  }
  async history(service) {
    this.target(service); await privatePath(this.directory); await privateDirectory(this.backups);
    const history = [];
    for (const entry of await fs.readdir(this.backups)) {
      const id = entry.replace(/\.json$/, '');
      if (!ID.test(id) || entry !== `${id}.json`) continue;
      // Inspect service metadata without returning file paths, encrypted data or digests.
      const file = path.join(this.backups, entry);
      await privatePath(file); const stat = await regular(file);
      demand(stat.size <= 256 * 1024, 'BACKUP_INTEGRITY', 'Backup History มีไฟล์ผิดรูปแบบ', 409);
      let record; try { record = JSON.parse(await fs.readFile(file, 'utf8')); } catch { throw new ToolError('BACKUP_INTEGRITY', 'Backup History มีไฟล์ผิดรูปแบบ', 409); }
      if (record.service !== service) continue;
      history.push((await this.backupContent(id, service)).metadata);
    }
    return history.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }
  async restorePreview(service, version, id) {
    const original = await snapshot(this.target(service));
    demand(version === original.version, 'FILE_CONFLICT', 'ไฟล์ถูกแก้จากภายนอก กรุณาโหลดใหม่', 409);
    const backup = await this.backupContent(id, service), restored = parseDocument(backup.bytes), current = parseDocument(original.bytes);
    validate(restored, service, [...restored.entries.keys()]);
    const keys = new Set([...current.entries.keys(), ...restored.entries.keys()]);
    const preview = [];
    for (const key of keys) {
      const before = current.entries.get(key)?.value, after = restored.entries.get(key)?.value;
      if (before === after) continue;
      const secret = sensitive(key, before) || sensitive(key, after);
      preview.push({ key, secret, action: after === undefined ? 'remove' : before === undefined ? 'add' : 'restore', ...(secret ? {} : { before: before ?? '', after: after ?? '' }) });
    }
    return { service, version, bytes: backup.bytes, preview, warnings: [...warnings(service, [...keys]), 'Restore จะกู้คืนทั้งไฟล์ รวม Comments และลำดับตาม Backup ที่เลือก'], restoreId: id };
  }
  async commit(plan) {
    return this.exclusive(async () => {
      await this.development();
      const file = this.target(plan.service), original = await snapshot(file);
      demand(original.version === plan.version, 'FILE_CONFLICT', 'ไฟล์ถูกแก้จากภายนอก กรุณาโหลดใหม่', 409);
      if (plan.restoreId) demand((await this.backupContent(plan.restoreId, plan.service)).bytes.equals(plan.bytes), 'BACKUP_INTEGRITY', 'Backup เปลี่ยนหลัง Preview', 409);
      const backup = await this.backupSnapshot(plan.service, original);
      const saved = await replace(file, original, plan.bytes);
      this.pending.add(plan.service);
      return { saved: true, backup, version: saved.version, restart: { ...RESTART[plan.service], pending: true } };
    });
  }
}
