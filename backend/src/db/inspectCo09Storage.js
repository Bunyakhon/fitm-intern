// Read-only reconciliation: report counts only. No deletion or path/PII output.
const fs = require('node:fs/promises'), path = require('node:path');
async function inventory(root, references) {
  const referenced = new Set(references), seen = new Set(); let retained = 0;
  root = path.resolve(root);
  const base = path.join(root, 'co09');
  const baseStat = await fs.lstat(base).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (!baseStat) return { referenced: referenced.size, missing: referenced.size, retained_unreferenced: 0, action: 'read-only; storage directory absent' };
  if (baseStat.isSymbolicLink() || !baseStat.isDirectory()) throw Error('Unsafe CO-09 storage directory');
  const relative = path.relative(await fs.realpath(root), await fs.realpath(base));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Unsafe CO-09 storage directory');
  for (const owner of await fs.readdir(base, { withFileTypes: true })) {
    if (!owner.isDirectory() || owner.isSymbolicLink() || !/^[0-9a-f-]{36}$/i.test(owner.name)) continue;
    for (const file of await fs.readdir(path.join(root,'co09',owner.name), { withFileTypes: true })) {
      if (!file.isFile() || file.isSymbolicLink() || !/^[0-9a-f-]{36}\.pdf$/i.test(file.name)) continue;
      const key = `co09/${owner.name}/${file.name}`; seen.add(key); if (!referenced.has(key)) retained++;
    }
  }
  return { referenced: referenced.size, missing: [...referenced].filter(key => !seen.has(key)).length, retained_unreferenced: retained, action: 'read-only; retained files may be older revisions or uncertain writes; do not auto-delete' };
}
module.exports = { inventory };
if (require.main === module) {
  const models = require('../models');
  (async () => { try {
    const rows = await models.CoopTopicDocument.findAll({ attributes: ['storage_path'], raw: true });
    process.stdout.write(JSON.stringify(await inventory(require('../config/storage').STORAGE_ROOT, rows.map(row => row.storage_path).filter(Boolean)))+'\n');
  } catch { process.stderr.write('CO-09 inventory unavailable; schema/storage must be ready\n'); process.exitCode = 1; }
  finally { await models.sequelize.close(); } })();
}
