const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { STORAGE_ROOT } = require('../config/storage');
const { uuid } = require('../validators/roleWorkflow.validator');
const { fail } = require('./coopTopicExam.rules');
function createTopicDocumentStorage(root = STORAGE_ROOT) {
  root = path.resolve(root);
  async function directory(studentId, create = false) {
    uuid(studentId);
    if (create) await fs.mkdir(root, { recursive: true });
    const realRoot = await fs.realpath(root);
    let current = root;
    for (const segment of ['co09', studentId]) {
      current = path.join(current, segment);
      if (create) await fs.mkdir(current).catch(error => { if (error.code !== 'EEXIST') throw error; });
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) fail('พื้นที่จัดเก็บไม่ถูกต้อง', 503, 'CO09_STORAGE');
      const relative = path.relative(realRoot, await fs.realpath(current));
      if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) fail('พื้นที่จัดเก็บไม่ถูกต้อง', 503, 'CO09_STORAGE');
    }
    return current;
  }
  return {
    async write(studentId, buffer) {
      const dir = await directory(studentId, true), name = randomUUID() + '.pdf';
      // Immutable files: even failed/uncertain commits retain bytes for reconciliation.
      const handle = await fs.open(path.join(dir, name), 'wx', 0o600);
      try { await handle.writeFile(buffer); await handle.sync(); } finally { await handle.close(); }
      return `co09/${studentId}/${name}`;
    },
    async read(studentId, storagePath) {
      uuid(studentId);
      if (typeof storagePath !== 'string' || !new RegExp(`^co09/${studentId}/[0-9a-f-]{36}\\.pdf$`, 'i').test(storagePath)) fail('ไม่พบเอกสาร', 404, 'CO09_FILE_NOT_FOUND');
      try {
        const dir = await directory(studentId), filename = path.join(dir, path.basename(storagePath));
        const stat = await fs.lstat(filename);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 10 * 1024 * 1024) fail('ไม่พบเอกสาร', 404);
        return await fs.readFile(filename);
      } catch (error) { if (error.code === 'ENOENT') fail('ไม่พบเอกสาร', 404, 'CO09_FILE_NOT_FOUND'); throw error; }
    },
  };
}
module.exports = { createTopicDocumentStorage };
