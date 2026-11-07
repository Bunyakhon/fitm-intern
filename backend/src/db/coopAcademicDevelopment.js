// Explicit additive model-driven upgrade. Never invoked by application startup.
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const rules = require('./coopAcademicIntegrity');
async function installAcademic(m, { expectedDatabase, env = process.env } = {}) {
  const db = m.sequelize;
  const test = env.NODE_ENV === 'test' && env.FITM_ACADEMIC_POSTGRES_TESTS === '1'
    && /^fitm_academic_test_[a-z0-9_]+$/.test(expectedDatabase || '') && env.FITM_ACADEMIC_TEST_DATABASE === expectedDatabase;
  const development = env.NODE_ENV === 'development' && env.FITM_ACADEMIC_INSTALL === '1' && expectedDatabase === 'intern_system';
  const local = ['localhost', '127.0.0.1', '::1'].includes(db.config.host) || development && db.config.host === 'postgres' && fs.existsSync('/.dockerenv');
  if (!(test || development) || !local || db.config.database !== expectedDatabase || db.getDialect() !== 'postgres' || Number(db.config.port || 5432) !== 5432) throw Error('Explicit academic PostgreSQL target required');
  return db.transaction(async transaction => {
    await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'", { transaction });
    const [[identity]] = await db.query("SELECT current_database() db,current_schema() schema,current_setting('server_version_num')::int version", { transaction });
    if (identity.db !== expectedDatabase || identity.schema !== 'public' || Math.floor(identity.version / 10000) !== 16) throw Error('Expected PostgreSQL16 public academic target');
    await db.query('SELECT pg_advisory_xact_lock(624061107)', { transaction });
    const qi = db.getQueryInterface(), quote = v => qi.queryGenerator.quoteIdentifier(v);
    const query = async (sql, replacements) => (await db.query(sql, { replacements, transaction }))[0];
    const names = ['coop_request_academic_states', 'coop_request_academic_history'];
    const tables = await query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN (:names)", { names });
    if (tables.length && tables.length !== 2) throw Error('Partial academic schema; review before installation');
    if (!(await query("SELECT to_regclass('public.coop_requests') request,to_regclass('public.coop_request_prerequisite_courses') snapshot"))[0].snapshot) throw Error('Submitted course snapshot schema is required');
    const models = [m.CoopRequestAcademicState, m.CoopRequestAcademicHistory];
    for (const model of models) {
      if (!tables.length) await qi.createTable(model.tableName, model.rawAttributes, { transaction });
      const columns = await query('SELECT a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull FROM pg_attribute a WHERE a.attrelid=CAST(:t AS regclass) AND a.attnum>0 AND NOT a.attisdropped', { t: 'public.' + model.tableName });
      const attrs = Object.values(model.rawAttributes), type = s => s.toLowerCase().replace(/character varying/g, 'varchar').replace(/\s/g, '');
      if (columns.length !== attrs.length || attrs.some(a => !columns.some(c => c.attname === a.field && type(c.type) === type(a.type.toSql()) && c.attnotnull === (a.primaryKey === true || a.allowNull === false)))) throw Error('Academic column/type/nullability drift');
      const keys = await query("SELECT array_agg(a.attname::text ORDER BY k.pos) fields FROM pg_constraint c CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(num,pos) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num WHERE c.conrelid=CAST(:t AS regclass) AND c.contype='p' GROUP BY c.oid", { t: 'public.' + model.tableName });
      if (keys.length !== 1 || keys[0].fields.join(',') !== attrs.filter(a => a.primaryKey).map(a => a.field).join(',')) throw Error('Academic primary key drift');
      const fks = await query("SELECT c.convalidated,pg_get_constraintdef(c.oid) definition FROM pg_constraint c WHERE c.conrelid=CAST(:t AS regclass) AND c.contype='f'", { t: 'public.' + model.tableName });
      const refs = attrs.filter(a => a.references);
      if (fks.length !== refs.length || refs.some(a => !fks.some(k => k.convalidated && k.definition.replaceAll('"', '').includes(`FOREIGN KEY (${a.field}) REFERENCES ${typeof a.references.model === 'string' ? a.references.model : a.references.model.tableName}(${a.references.key}) ON UPDATE ${a.onUpdate} ON DELETE ${a.onDelete}`)))) throw Error('Academic foreign key drift');
      const indexes = await qi.showIndex(model.tableName, { transaction });
      for (const index of model.options.indexes) {
        const old = indexes.find(i => i.name === index.name);
        if (!old && !tables.length) await qi.addIndex(model.tableName, index.fields, { ...index, transaction });
        else if (!old || !old.unique || old.fields.map(f => f.attribute).join(',') !== index.fields.join(',')) throw Error('Academic unique index drift');
        const [state] = await query('SELECT i.indisvalid,i.indisready,i.indpred IS NULL full_table,i.indexprs IS NULL plain_columns FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname=:name AND c.relnamespace=\'public\'::regnamespace', { name: index.name });
        if (!state?.indisvalid || !state.indisready || !state.full_table || !state.plain_columns) throw Error('Academic unique index state drift');
      }
    }
    // Compare parsed expressions, retaining old free-text/F snapshots unchanged.
    async function expression(table, definition) {
      const probe = 'coop_academic_probe_' + randomUUID().replaceAll('-', '');
      await query(`ALTER TABLE public.${quote(table)} ADD CONSTRAINT ${quote(probe)} ${definition} NOT VALID`);
      const [row] = await query('SELECT pg_get_expr(conbin,conrelid) expression FROM pg_constraint WHERE conrelid=CAST(:t AS regclass) AND conname=:n', { t: 'public.' + table, n: probe });
      await query(`ALTER TABLE public.${quote(table)} DROP CONSTRAINT ${quote(probe)}`); return row.expression;
    }
    const snapshotTable = 'coop_request_prerequisite_courses', snapshotName = 'coop_prerequisites_status_grade_check';
    for (const c of [...rules.constraints, { table_name: snapshotTable, name: snapshotName, definition: rules.SNAPSHOT_GRADE_CHECK }]) {
      const [old] = await query('SELECT contype,convalidated,pg_get_expr(conbin,conrelid) expression FROM pg_constraint WHERE conrelid=CAST(:t AS regclass) AND conname=:n', { t: 'public.' + c.table_name, n: c.name });
      const expected = await expression(c.table_name, c.definition);
      if (old && old.contype !== 'c') throw Error('Academic CHECK type drift');
      const actual = old ? await expression(c.table_name, 'CHECK (' + old.expression + ')') : null;
      const canonicalExpected = old ? await expression(c.table_name, 'CHECK (' + expected + ')') : expected;
      if (old && old.expression !== expected && actual !== canonicalExpected) {
        const legacy = c.name === snapshotName ? await expression(snapshotTable, rules.LEGACY_SNAPSHOT_GRADE_CHECK) : null;
        const canonicalLegacy = legacy ? await expression(snapshotTable, 'CHECK (' + legacy + ')') : null;
        if (c.name !== snapshotName || old.expression !== legacy && actual !== canonicalLegacy) throw Error('Academic CHECK drift: ' + c.table_name + '.' + c.name);
        const pending = 'coop_academic_grade_upgrade';
        await query(`ALTER TABLE public.${quote(snapshotTable)} ADD CONSTRAINT ${quote(pending)} ${c.definition}`);
        await query(`ALTER TABLE public.${quote(snapshotTable)} DROP CONSTRAINT ${quote(snapshotName)}`);
        await query(`ALTER TABLE public.${quote(snapshotTable)} RENAME CONSTRAINT ${quote(pending)} TO ${quote(snapshotName)}`);
      } else if (!old) await query(`ALTER TABLE public.${quote(c.table_name)} ADD CONSTRAINT ${quote(c.name)} ${c.definition}`);
      else if (!old.convalidated) await query(`ALTER TABLE public.${quote(c.table_name)} VALIDATE CONSTRAINT ${quote(c.name)}`);
    }
    for (let i = 0; i < rules.functionSpecs.length; i++) {
      const f = rules.functionSpecs[i];
      const old = await query("SELECT p.prosrc,l.lanname,p.prorettype='trigger'::regtype returns_trigger FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' AND p.proname=:n AND p.pronargs=0", { n: f.name });
      const previous = rules.previousFunctionSpecs.find(p => p.name === f.name);
      const knownPrevious = old.length === 1 && previous && old[0].prosrc.trim() === previous.body.trim();
      if (old.length && (old.length !== 1 || old[0].prosrc.trim() !== f.body.trim() && !knownPrevious || old[0].lanname !== 'plpgsql' || !old[0].returns_trigger)) throw Error('Academic history function drift');
      if (!old.length || knownPrevious) await query(rules.functions[i].definition);
    }
    for (let i = 0; i < rules.triggerSpecs.length; i++) {
      const t = rules.triggerSpecs[i];
      const [old] = await query("SELECT t.tgtype,t.tgenabled,p.proname,n.nspname FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE t.tgrelid=CAST(:r AS regclass) AND t.tgname=:n", { r: 'public.' + t.table_name, n: t.name });
      if (old && (old.tgtype !== t.type || old.tgenabled !== 'O' || old.proname !== t.function_name || old.nspname !== 'public')) throw Error('Academic history trigger drift');
      if (!old) await query(rules.triggers[i].definition);
    }
    return { database: identity.db, installed: true, tablesAdded: tables.length ? 0 : 2, snapshotRowsUpdated: 0, grantsAdded: 0 };
  });
}
module.exports = { installAcademic };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--database') { console.error('Usage: node src/db/coopAcademicDevelopment.js --database <DB_NAME>'); process.exitCode = 1; }
  else { const m = require('../models'); installAcademic(m, { expectedDatabase: args[1] }).then(r => console.log(JSON.stringify(r)))
    .catch(() => { console.error('Academic schema upgrade failed; transaction rolled back.'); process.exitCode = 1; }).finally(() => m.sequelize.close()); }
}
