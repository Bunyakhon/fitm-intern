const { DataTypes } = require('sequelize');

async function up({ context: qi }) {
  await qi.sequelize.transaction(async transaction => {
    await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
    const fk = table => ({ type: DataTypes.UUID, allowNull: false, references: { model: table, key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
    const evidence = () => ({
      status: { type: DataTypes.STRING(16), allowNull: false },
      responded_at: { type: DataTypes.DATE, allowNull: false },
      note: { type: DataTypes.TEXT, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false },
      department_staff_id: fk('department_staffs'),
      cooperation_document_id: fk('coop_documents'),
      cooperation_version: { type: DataTypes.INTEGER, allowNull: false },
    });
    const timestamp = { type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal('CURRENT_TIMESTAMP') };
    await qi.createTable('company_responses', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      coop_request_id: fk('coop_requests'), ...evidence(), created_at: timestamp, updated_at: timestamp,
    }, { transaction });
    await qi.addIndex('company_responses', ['coop_request_id'], { unique: true, name: 'company_responses_request_unique', transaction });
    await qi.createTable('company_response_history', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      company_response_id: fk('company_responses'), ...evidence(),
      action: { type: DataTypes.STRING(16), allowNull: false },
      correction_reason: { type: DataTypes.TEXT, allowNull: true }, created_at: timestamp,
    }, { transaction });
    await qi.addIndex('company_response_history', ['company_response_id', 'version'], { unique: true, name: 'company_response_history_version_unique', transaction });
    for (const table of ['company_responses', 'company_response_history']) {
      await qi.sequelize.query(`ALTER TABLE ${table}
        ADD CONSTRAINT ${table}_values_check CHECK (status IN ('accepted','rejected') AND version >= 1 AND cooperation_version >= 1 AND (note IS NULL OR length(note) <= 2000)),
        ADD CONSTRAINT ${table}_cooperation_revision_fk FOREIGN KEY (cooperation_document_id, cooperation_version) REFERENCES coop_document_revisions (coop_document_id, version) ON DELETE RESTRICT ON UPDATE RESTRICT`, { transaction });
    }
    await qi.sequelize.query(`ALTER TABLE company_response_history ADD CONSTRAINT company_response_history_action_check CHECK (
      (action='create' AND version=1 AND correction_reason IS NULL) OR
      (action='correct' AND version>1 AND correction_reason IS NOT NULL AND length(btrim(correction_reason)) BETWEEN 1 AND 2000))`, { transaction });
    await qi.sequelize.query(`CREATE FUNCTION fitm_company_response_cooperation_check() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM coop_documents d JOIN coop_document_revisions r ON r.coop_document_id=d.id
          WHERE d.id=NEW.cooperation_document_id AND d.coop_request_id=NEW.coop_request_id
          AND d.document_type='cooperation' AND r.version=NEW.cooperation_version AND r.status='generated')
        THEN RAISE EXCEPTION 'Company response requires a generated cooperation revision for the same request'; END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER company_response_cooperation_check BEFORE INSERT OR UPDATE ON company_responses
      FOR EACH ROW EXECUTE FUNCTION fitm_company_response_cooperation_check()`, { transaction });
    await qi.sequelize.query(`CREATE FUNCTION fitm_company_response_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Company response history is immutable'; END; $$;
      CREATE TRIGGER company_response_history_immutable BEFORE UPDATE OR DELETE ON company_response_history
      FOR EACH ROW EXECUTE FUNCTION fitm_company_response_history_immutable()`, { transaction });
  });
}
async function down({ context: qi }) {
  await qi.sequelize.transaction(async transaction => {
    await qi.sequelize.query("SET LOCAL lock_timeout = '5s'; LOCK TABLE company_responses, company_response_history IN ACCESS EXCLUSIVE MODE", { transaction });
    const [[row]] = await qi.sequelize.query('SELECT EXISTS (SELECT 1 FROM company_responses) OR EXISTS (SELECT 1 FROM company_response_history) AS evidence', { transaction });
    if (row.evidence) throw new Error('017 rollback refused: preserve company response history');
    await qi.dropTable('company_response_history', { transaction });
    await qi.dropTable('company_responses', { transaction });
    await qi.sequelize.query('DROP FUNCTION fitm_company_response_cooperation_check()', { transaction });
    await qi.sequelize.query('DROP FUNCTION fitm_company_response_history_immutable()', { transaction });
  });
}
module.exports.up = up;
module.exports.down = down;
