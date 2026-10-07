const { DataTypes } = require('sequelize');

// Separate document lifecycle; never alters approval stages or student_files.
async function up({ context: qi }) {
    await qi.sequelize.transaction(async transaction => {
      await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
      const fk = table => ({ type: DataTypes.UUID, allowNull: false, references: { model: table, key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
      await qi.createTable('coop_documents', {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
        coop_request_id: fk('coop_requests'), document_type: { type: DataTypes.STRING(24), allowNull: false },
        status: { type: DataTypes.STRING(16), allowNull: false }, version: { type: DataTypes.INTEGER, allowNull: false },
        document_number: { type: DataTypes.STRING(80), allowNull: true },
        metadata: { type: DataTypes.JSONB, allowNull: false }, snapshot: { type: DataTypes.JSONB, allowNull: false },
        template_version: { type: DataTypes.STRING(40), allowNull: false },
        rendered_html: { type: DataTypes.TEXT, allowNull: true }, content_sha256: { type: DataTypes.CHAR(64), allowNull: true },
        generated_at: { type: DataTypes.DATE, allowNull: true },
        created_by: fk('department_staffs'), updated_by: fk('department_staffs'),
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal('CURRENT_TIMESTAMP') },
      }, { transaction });
      await qi.addIndex('coop_documents', ['coop_request_id', 'document_type'], { unique: true, name: 'coop_documents_request_type_unique', transaction });
      await qi.addIndex('coop_documents', ['document_number'], { unique: true, name: 'coop_documents_number_unique', transaction });
      await qi.sequelize.query(`ALTER TABLE coop_documents
        ADD CONSTRAINT coop_documents_type_check CHECK (document_type IN ('cooperation','placement')),
        ADD CONSTRAINT coop_documents_version_check CHECK (version >= 1),
        ADD CONSTRAINT coop_documents_json_check CHECK (jsonb_typeof(metadata) = 'object' AND jsonb_typeof(snapshot) = 'object'),
        ADD CONSTRAINT coop_documents_number_check CHECK (document_number IS NULL OR (document_number = btrim(document_number) AND length(document_number) BETWEEN 1 AND 80)),
        ADD CONSTRAINT coop_documents_state_check CHECK (
          (status = 'draft' AND generated_at IS NULL AND rendered_html IS NULL AND content_sha256 IS NULL)
          OR (status = 'generated' AND generated_at IS NOT NULL AND rendered_html IS NOT NULL AND length(rendered_html) > 0 AND content_sha256 IS NOT NULL AND content_sha256 ~ '^[0-9a-f]{64}$'))`, { transaction });
      await qi.createTable('coop_document_revisions', {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true }, coop_document_id: fk('coop_documents'),
        version: { type: DataTypes.INTEGER, allowNull: false }, action: { type: DataTypes.STRING(16), allowNull: false },
        status: { type: DataTypes.STRING(16), allowNull: false }, department_staff_id: fk('department_staffs'),
        document_number: { type: DataTypes.STRING(80), allowNull: true },
        metadata: { type: DataTypes.JSONB, allowNull: false }, snapshot: { type: DataTypes.JSONB, allowNull: false },
        template_version: { type: DataTypes.STRING(40), allowNull: false },
        rendered_html: { type: DataTypes.TEXT, allowNull: true }, content_sha256: { type: DataTypes.CHAR(64), allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal('CURRENT_TIMESTAMP') },
      }, { transaction });
      await qi.addIndex('coop_document_revisions', ['coop_document_id', 'version'], { unique: true, name: 'coop_document_revisions_version_unique', transaction });
      await qi.sequelize.query(`ALTER TABLE coop_document_revisions
        ADD CONSTRAINT coop_document_revisions_action_check CHECK (version >= 1 AND action IN ('create','edit','generate','regenerate')),
        ADD CONSTRAINT coop_document_revisions_state_check CHECK (
          (status = 'draft' AND action IN ('create','edit') AND rendered_html IS NULL AND content_sha256 IS NULL)
          OR (status = 'generated' AND action IN ('generate','regenerate') AND rendered_html IS NOT NULL AND content_sha256 IS NOT NULL AND content_sha256 ~ '^[0-9a-f]{64}$'))`, { transaction });
    });
}
async function down({ context: qi }) {
    await qi.sequelize.transaction(async transaction => {
      await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await qi.sequelize.query('LOCK TABLE coop_documents, coop_document_revisions IN ACCESS EXCLUSIVE MODE', { transaction });
      const [[row]] = await qi.sequelize.query('SELECT EXISTS (SELECT 1 FROM coop_documents) OR EXISTS (SELECT 1 FROM coop_document_revisions) AS evidence', { transaction });
      if (row.evidence) throw new Error('016 rollback refused: preserve document snapshots and revision history');
      await qi.dropTable('coop_document_revisions', { transaction });
      await qi.dropTable('coop_documents', { transaction });
    });
}
// Explicit named exports work with both require() and Umzug's dynamic import.
module.exports.up = up;
module.exports.down = down;
