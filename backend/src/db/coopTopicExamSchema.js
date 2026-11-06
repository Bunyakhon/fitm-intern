// SQL generation only. Never connects, initializes or mutates any database.
const tables = ['coop_topic_documents','coop_topic_exams','coop_topic_exam_committee_members','coop_topic_exam_history'];
function schemaSQL(sequelize) {
  const generator = sequelize.getQueryInterface().queryGenerator, quote = name => generator.quoteIdentifier(name);
  const statements = [];
  for (const table of tables) {
    const model = Object.values(sequelize.models).find(item => item.tableName === table);
    if (!model) throw Error('CO-09 model not registered: ' + table);
    const attributes = Object.fromEntries(Object.values(model.rawAttributes).filter(item => item.type.key !== 'VIRTUAL').map(item => [item.field, item]));
    statements.push(generator.createTableQuery(table, generator.attributesToSQL(attributes, { table }), model.options));
    for (const index of model.options.indexes) statements.push(generator.addIndexQuery(table, index));
  }
  for (const item of require('./coopTopicExamIntegrity').constraints) statements.push(`ALTER TABLE ${quote(item.table_name)} ADD CONSTRAINT ${quote(item.name)} ${item.definition};`);
  // Widen only the existing capability allowlist. No grants/account rows change.
  const permissions = require('./superAdminIntegrity').constraints.find(item => item.name === 'super_admin_permissions_check');
  statements.push(`ALTER TABLE "super_admins" DROP CONSTRAINT "super_admin_permissions_check";`);
  statements.push(`ALTER TABLE "super_admins" ADD CONSTRAINT "super_admin_permissions_check" ${permissions.definition};`);
  return statements.map(sql => sql.trim().replace(/;?$/, ';')).join('\n\n');
}
module.exports = { tables, schemaSQL };
if (require.main === module) {
  process.env.DOTENV_CONFIG_QUIET = 'true';
  const models = require('../models');
  process.stdout.write('-- CO-09 schema preview; generated from current Sequelize models.\n-- NOT APPLIED. No migration runner. No account grants or data changes.\n-- Four new tables + widening existing Super Admin capability CHECK only.\n-- Review target/backup/restore before separately authorized installation.\nBEGIN;\nSET LOCAL lock_timeout = \'5s\';\nSET LOCAL statement_timeout = \'30s\';\nDO $$ BEGIN IF current_database() <> \'intern_system\' OR current_schema() <> \'public\' OR current_setting(\'server_version_num\')::int / 10000 <> 16 THEN RAISE EXCEPTION \'Unexpected development target\'; END IF; END $$;\nSELECT pg_advisory_xact_lock(2140909);\n\n' + schemaSQL(models.sequelize) + '\n\nROLLBACK;\n');
}
