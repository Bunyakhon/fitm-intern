// Explicit Development account/program assignment. Preview is the default;
// no account creation, schema changes, or inference from department/email.
const fs = require('node:fs');
const { uuid } = require('../validators/roleWorkflow.validator');
const { PERMISSION, schemaReady } = require('../services/coopPrerequisiteCatalog.service');
const { assertAccountAccess } = require('../services/adminAccountAccess.service');

async function prepareCatalogGrant(models, { staffId, programs, apply = false, confirm, env = process.env }) {
  uuid(staffId, 'staff id');
  if (!Array.isArray(programs) || !programs.length || new Set(programs).size !== programs.length || programs.some(p => !['IT', 'INE'].includes(p))) throw Error('Explicit unique IT/INE programs required');
  const db = models.sequelize;
  if (env.NODE_ENV !== 'development' || db.getDialect() !== 'postgres' || db.config.database !== 'intern_system'
    || Number(db.config.port || 5432) !== 5432 || !(['localhost', '127.0.0.1', '::1'].includes(db.config.host) || db.config.host === 'postgres' && fs.existsSync('/.dockerenv'))
    || apply && confirm !== 'intern_system') throw Error('Explicit local Development target/confirmation required');
  return db.transaction(async transaction => {
    await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'", { transaction });
    const [[target]] = await db.query("SELECT current_database() db,current_schema() schema,current_setting('server_version_num')::int version", { transaction });
    if (target.db !== 'intern_system' || target.schema !== 'public' || Math.floor(target.version / 10000) !== 16) throw Error('Expected Development PostgreSQL 16/public');
    if (!await schemaReady(models, transaction)) throw Error('Catalog schema required; this command does not install it');
    if (apply) await db.query('SELECT pg_advisory_xact_lock(hashtext(:staff))', { replacements: { staff: staffId }, transaction });
    const staff = await models.DepartmentStaff.findOne({ where: { id: staffId, is_active: true }, attributes: ['id'], transaction, lock: transaction.LOCK.SHARE });
    if (!staff) throw Error('An existing active Staff account is required');
    await assertAccountAccess(models, 'department_staff', staffId, { transaction });
    const grants = await models.CoopPrerequisiteCatalogGrant.findAll({ where: { department_staff_id: staffId, permission: PERMISSION }, transaction });
    const current = grants.filter(g => g.is_active).map(g => g.program).sort();
    const needsReview = current.some(p => !programs.includes(p));
    if (apply && needsReview) throw Error('Existing active scopes differ; review revocation separately before applying');
    let created = 0, reactivated = 0;
    if (apply) for (const program of [...programs].sort()) {
      const [grant, added] = await models.CoopPrerequisiteCatalogGrant.findOrCreate({ where: { department_staff_id: staffId, permission: PERMISSION, program }, defaults: { is_active: true }, transaction });
      if (added) created++;
      else if (!grant.is_active) { await grant.update({ is_active: true }, { transaction }); reactivated++; }
    }
    return { database: target.db, mode: apply ? 'applied' : 'preview', staffId, permission: PERMISSION, currentPrograms: current, requestedPrograms: [...programs].sort(), needsReview, created, reactivated };
  });
}
module.exports = { prepareCatalogGrant };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(a => !/^(--staff-id=|--programs=|--confirm=|--apply$)/.test(a)) || args.filter(a => a.startsWith('--staff-id=')).length !== 1 || args.filter(a => a.startsWith('--programs=')).length !== 1 || args.filter(a => a === '--apply').length > 1 || args.filter(a => a.startsWith('--confirm=')).length > 1) {
    console.error('Usage: node src/seeders/grantCoopCatalog.js --staff-id=<UUID> --programs=IT[,INE] [--apply --confirm=intern_system]');
    process.exitCode = 1;
  } else {
    const models = require('../models');
    prepareCatalogGrant(models, { staffId: args.find(a => a.startsWith('--staff-id=')).slice(11), programs: args.find(a => a.startsWith('--programs=')).slice(11).split(','), apply: args.includes('--apply'), confirm: args.find(a => a.startsWith('--confirm='))?.slice(10) })
      .then(result => console.log(JSON.stringify(result)))
      .catch(() => { console.error('Grant preparation failed; transaction rolled back. Review account, scope and Development target.'); process.exitCode = 1; })
      .finally(() => models.sequelize.close());
  }
}
