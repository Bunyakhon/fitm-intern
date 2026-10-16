import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { demand, ToolError } from './errors.js';
const execute = promisify(execFile);
const script = fileURLToPath(new URL('./windows-io.ps1', import.meta.url));
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// Only fixed operations and server-owned paths reach this helper. No user command text.
async function windows(operation, target, source = '', expected = '') {
  try {
    const { stdout } = await execute(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      // Process-scoped policy for this repository-owned helper only; no OS policy update.
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Operation', operation], {
        windowsHide: true, timeout: 15000, maxBuffer: 16384,
        env: { ...process.env, FITM_DEV_IO_TARGET: target, FITM_DEV_IO_SOURCE: source, FITM_DEV_IO_EXPECTED: expected },
      });
    return JSON.parse(stdout.replace(/^\uFEFF/, '').trim());
  } catch { throw new ToolError('FILE_SECURITY_BLOCKED', 'BLOCKED: ไม่สามารถยืนยัน ACL หรือ Atomic Replace ได้', 503); }
}
export async function regular(file) {
  const stat = await fs.lstat(file);
  demand(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'UNSAFE_FILE', 'ปฏิเสธไฟล์ที่ไม่ใช่ regular file หรือมีลิงก์', 409);
  return stat;
}
export async function noLinks(file) {
  let current = path.resolve(file);
  for (;;) {
    const stat = await fs.lstat(current);
    demand(!stat.isSymbolicLink(), 'UNSAFE_PATH', 'ปฏิเสธ Symbolic Link / Junction', 409);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
export async function permissions(file) {
  if (process.platform === 'win32') return windows('inspect', file);
  const stat = await fs.stat(file);
  return { private: stat.uid === process.getuid() && (stat.mode & 0o077) === 0, descriptor: `${stat.uid}:${stat.gid}:${stat.mode & 0o777}` };
}
export async function privatePath(file) {
  await noLinks(file);
  demand((await permissions(file)).private, 'PRIVATE_STORAGE_BLOCKED', 'BLOCKED: พื้นที่ Credential/Backup มีสิทธิ์เข้าถึงไม่ปลอดภัย', 503);
}
export async function privateDirectory(directory) {
  try {
    await fs.mkdir(directory, { mode: 0o700 });
    if (process.platform === 'win32') await windows('protectDirectory', directory);
  } catch (error) { if (error.code !== 'EEXIST') throw error; }
  demand((await fs.lstat(directory)).isDirectory(), 'PRIVATE_STORAGE_BLOCKED', 'พื้นที่ส่วนตัวไม่ใช่ directory', 503);
  await privatePath(directory);
}
export async function createPrivate(file, bytes) {
  const handle = await fs.open(file, 'wx', 0o600);
  try { await privatePath(file); await handle.writeFile(bytes); await handle.sync(); }
  finally { await handle.close(); }
}
export async function snapshot(file) {
  await noLinks(file);
  const before = await regular(file);
  demand(before.size <= 128 * 1024, 'FILE_SIZE', 'ไฟล์ใหญ่เกินขอบเขตที่รองรับ', 409);
  const bytes = await fs.readFile(file);
  const after = await regular(file);
  demand(before.ino === after.ino && before.mtimeMs === after.mtimeMs && before.size === after.size, 'FILE_CONFLICT', 'ไฟล์เปลี่ยนระหว่างอ่าน กรุณาโหลดใหม่', 409);
  const acl = await permissions(file);
  return { bytes, stat: after, acl, version: digest(Buffer.concat([bytes, Buffer.from(`:${after.dev}:${after.ino}:${after.mtimeMs}:${after.mode}:${acl.descriptor}`)])) };
}
export async function replace(file, original, bytes) {
  const temp = path.join(path.dirname(file), `.fitm-env-${randomUUID()}.tmp`);
  let committed = false;
  try {
    const handle = await fs.open(temp, 'wx', original.stat.mode & 0o777);
    try {
      if (process.platform === 'win32') await windows('copyAcl', temp, file);
      else { await handle.chmod(original.stat.mode & 0o777); demand((await handle.stat()).uid === original.stat.uid, 'FILE_OWNER', 'ไม่สามารถรักษา owner ได้', 409); }
      demand((await permissions(temp)).descriptor === original.acl.descriptor, 'FILE_PERMISSIONS', 'Permissions เปลี่ยน ไม่บันทึกไฟล์', 409);
      await handle.writeFile(bytes); await handle.sync();
    } finally { await handle.close(); }
    demand((await snapshot(file)).version === original.version, 'FILE_CONFLICT', 'ไฟล์ถูกแก้จากภายนอก กรุณาโหลดใหม่', 409);
    demand((await fs.readFile(temp)).equals(bytes), 'WRITE_VERIFY', 'ตรวจ Temporary File ไม่ผ่าน', 503);
    if (process.platform === 'win32') await windows('replace', file, temp, digest(original.bytes));
    else await fs.rename(temp, file);
    committed = true;
    const saved = await snapshot(file);
    demand(saved.bytes.equals(bytes) && saved.acl.descriptor === original.acl.descriptor, 'POST_WRITE_CHECK', 'บันทึกแล้วแต่ตรวจหลังบันทึกไม่ผ่าน โปรดตรวจ Backup ก่อนทำต่อ', 503);
    return saved;
  } finally {
    if (!committed) await fs.unlink(temp).catch(() => {});
  }
}
