// Explicit, transactional installation. Never called by application startup.
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const { CATALOG } = require('../services/coopPrerequisites');
const { TABLES } = require('../services/coopPrerequisiteCatalog.service');
const CHECKS = [
  ['coop_prerequisite_catalog_programs', 'coop_catalog_program_revision_check', "CHECK (program IN ('IT','INE') AND revision > 0)"],
  ['coop_prerequisite_catalog_courses', 'coop_catalog_course_values_check', "CHECK (program IN ('IT','INE') AND course_code ~ '^[0-9]{9}$' AND length(btrim(course_name)) > 0 AND display_order BETWEEN 0 AND 10000 AND version > 0)"],
  ['coop_prerequisite_catalog_grants', 'coop_catalog_grant_permission_check', "CHECK (program IN ('IT','INE') AND permission = 'coop_prerequisite_catalog.manage')"],
];
const SNAPSHOT_CHECK = "CHECK (program IN ('IT','INE') AND course_code ~ '^[0-9]{9}$')";
async function installCatalog(models, { expectedDatabase, env = process.env } = {}) {
  const db = models.sequelize;
  if (env.NODE_ENV !== 'development' || !expectedDatabase || db.config.database !== expectedDatabase || db.getDialect() !== 'postgres'
    || Number(db.config.port || 5432) !== 5432
    || !(['localhost', '127.0.0.1', '::1'].includes(db.config.host) || db.config.host === 'postgres' && fs.existsSync('/.dockerenv'))) throw Error('Explicit local development PostgreSQL target required');
  const catalogModels = [models.CoopPrerequisiteCatalogProgram, models.CoopPrerequisiteCatalogCourse, models.CoopPrerequisiteCatalogGrant];
  return db.transaction(async transaction => {
    await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'", { transaction });
    const [[target]] = await db.query("SELECT current_database() db, current_setting('server_version_num')::int version", { transaction });
    if (target.db !== expectedDatabase || Math.floor(target.version / 10000) !== 16) throw Error('Expected PostgreSQL 16 target');
    await db.query('SELECT pg_advisory_xact_lock(624061106)', { transaction });
    const [tables] = await db.query('SELECT tablename FROM pg_tables WHERE schemaname=\'public\' AND tablename IN (:tables)', { replacements: { tables: TABLES }, transaction });
    if (tables.length && tables.length !== TABLES.length) throw Error('Partial Catalog schema; review before installation');
    const qi = db.getQueryInterface(), quote = name => qi.queryGenerator.quoteIdentifier(name);
    async function ensureCheck(table, name, definition) {
      const [existing] = await db.query('SELECT contype, convalidated FROM pg_constraint WHERE conrelid=CAST(:table AS regclass) AND conname=:name', { replacements: { table: 'public.' + table, name }, transaction });
      if (!existing.length) {
        await db.query(`ALTER TABLE public.${quote(table)} ADD CONSTRAINT ${quote(name)} ${definition}`, { transaction });
        return;
      }
      if (existing[0].contype !== 'c') throw Error('Unexpected Catalog constraint type');
      // Let PostgreSQL parse/deparse the expected expression on the same table.
      // NOT VALID avoids scanning rows until the existing rule is confirmed.
      // The probe is removed in this transaction; every failure rolls it back.
      const probe = 'coop_catalog_verify_' + randomUUID().replaceAll('-', '');
      await db.query(`ALTER TABLE public.${quote(table)} ADD CONSTRAINT ${quote(probe)} ${definition} NOT VALID`, { transaction });
      const [expressions] = await db.query('SELECT conname, pg_get_expr(conbin, conrelid) expression FROM pg_constraint WHERE conrelid=CAST(:table AS regclass) AND conname IN (:names)', { replacements: { table: 'public.' + table, names: [name, probe] }, transaction });
      if (expressions.length !== 2 || expressions.find(row => row.conname === name)?.expression !== expressions.find(row => row.conname === probe)?.expression) throw Error('Catalog CHECK definition drift; manual review required');
      await db.query(`ALTER TABLE public.${quote(table)} DROP CONSTRAINT ${quote(probe)}`, { transaction });
      if (!existing[0].convalidated) await db.query(`ALTER TABLE public.${quote(table)} VALIDATE CONSTRAINT ${quote(name)}`, { transaction });
    }
    for (const model of catalogModels) {
      if (!tables.length) await qi.createTable(model.tableName, model.rawAttributes, { transaction });
      const description = await qi.describeTable(model.tableName, { transaction });
      const expectedFields = Object.values(model.rawAttributes).map(a => a.field);
      if (Object.keys(description).length !== expectedFields.length || expectedFields.some(field => !description[field])) throw Error('Unexpected Catalog columns: ' + model.tableName);
      const [columns] = await db.query("SELECT a.attname field,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null FROM pg_attribute a WHERE a.attrelid=CAST(:table AS regclass) AND a.attnum>0 AND NOT a.attisdropped", { replacements: { table: 'public.' + model.tableName }, transaction });
      const type = value => value.toLowerCase().replace(/character varying/g, 'varchar').replace(/\s/g, '');
      for (const attribute of Object.values(model.rawAttributes)) {
        const column = columns.find(row => row.field === attribute.field);
        if (!column || type(column.type) !== type(attribute.type.toSql()) || column.not_null !== (attribute.primaryKey === true || attribute.allowNull === false)) throw Error('Catalog type/nullability drift');
      }
      const [foreignKeys] = await db.query("SELECT pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid=CAST(:table AS regclass) AND contype='f'", { replacements: { table: 'public.' + model.tableName }, transaction });
      for (const attribute of Object.values(model.rawAttributes).filter(a => a.references)) {
        const reference = attribute.references, referencedTable = typeof reference.model === 'string' ? reference.model : reference.model.tableName;
        if (!foreignKeys.some(row => {
          const definition = row.definition.replaceAll('"', '');
          return definition.includes(`FOREIGN KEY (${attribute.field})`) && definition.includes(`REFERENCES ${referencedTable}(${reference.key})`)
            && definition.includes('ON DELETE ' + attribute.onDelete) && definition.includes('ON UPDATE ' + attribute.onUpdate);
        })) throw Error('Catalog foreign key drift');
      }
      const indexes = await qi.showIndex(model.tableName, { transaction });
      for (const index of model.options.indexes) {
        const existing = indexes.find(row => row.name === index.name);
        if (existing && (!existing.unique || existing.fields.map(f => f.attribute).join(',') !== index.fields.join(','))) throw Error('Catalog index drift');
        if (!existing) await qi.addIndex(model.tableName, index.fields, { name: index.name, unique: index.unique, transaction });
      }
    }
    for (const [table, name, definition] of CHECKS) {
      await ensureCheck(table, name, definition);
    }
    // Relax only the fixed course-code allowlist. Existing request snapshot values never change.
    const [old] = await db.query("SELECT pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid='public.coop_request_prerequisite_courses'::regclass AND conname='coop_prerequisites_program_code_check'", { transaction });
    if (old.length) {
      const definition = old[0].definition;
      const legacyCodes = Object.values(CATALOG).flat().map(row => row[0]);
      if (legacyCodes.some(code => !definition.includes(code)) || (definition.match(/[0-9]{9}/g) || []).length !== legacyCodes.length) throw Error('Unexpected legacy prerequisite CHECK; manual review required');
    }
    await ensureCheck('coop_request_prerequisite_courses', 'coop_prerequisites_program_code_format_check', SNAPSHOT_CHECK);
    if (old.length) await db.query('ALTER TABLE public.coop_request_prerequisite_courses DROP CONSTRAINT coop_prerequisites_program_code_check', { transaction });
    let seeded = 0;
    for (const program of ['IT', 'INE']) {
      const [, created] = await models.CoopPrerequisiteCatalogProgram.findOrCreate({ where: { program }, defaults: { revision: '1' }, transaction });
      // A program row is the initialization marker: reruns never re-add a staff-edited/deactivated course.
      if (created) {
        await models.CoopPrerequisiteCatalogCourse.bulkCreate(CATALOG[program].map(([course_code, course_name, english_name], display_order) => ({ id: randomUUID(), program, course_code, course_name, english_name: english_name || null, display_order, is_active: true, version: 1 })), { transaction, validate: true });
        seeded += CATALOG[program].length;
      }
    }
    return { database: target.db, installed: true, seeded, grantsAdded: 0, existingSnapshotsUpdated: 0 };
  });
}
module.exports = { installCatalog, CHECKS, SNAPSHOT_CHECK };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--database' || !args[1]) { console.error('Usage: node src/db/coopPrerequisiteCatalog.js --database <DB_NAME>'); process.exitCode = 1; }
  else {
    const models = require('../models');
    installCatalog(models, { expectedDatabase: args[1] }).then(result => console.log(JSON.stringify(result)))
      .catch(() => { console.error('Catalog installation failed; transaction rolled back. Review the target/schema before retrying.'); process.exitCode = 1; }).finally(() => models.sequelize.close());
  }
}
