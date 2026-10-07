const { DataTypes, Model } = require('sequelize');
module.exports = sequelize => {
  class CoopDocument extends Model {
    static associate(m) {
      CoopDocument.belongsTo(m.CoopRequest, { foreignKey: 'coop_request_id', as: 'request', onDelete: 'RESTRICT' });
      m.CoopRequest.hasMany(CoopDocument, { foreignKey: 'coop_request_id', as: 'documents', onDelete: 'RESTRICT' });
      CoopDocument.hasMany(m.CoopDocumentRevision, { foreignKey: 'coop_document_id', as: 'revisions', onDelete: 'RESTRICT' });
    }
  }
  CoopDocument.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    coop_request_id: { type: DataTypes.UUID, allowNull: false }, document_type: { type: DataTypes.STRING(24), allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false }, version: { type: DataTypes.INTEGER, allowNull: false },
    document_number: { type: DataTypes.STRING(80), allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: false }, snapshot: { type: DataTypes.JSONB, allowNull: false },
    template_version: { type: DataTypes.STRING(40), allowNull: false }, rendered_html: { type: DataTypes.TEXT, allowNull: true },
    content_sha256: { type: DataTypes.CHAR(64), allowNull: true }, generated_at: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false }, updated_by: { type: DataTypes.UUID, allowNull: false },
  }, { sequelize, modelName: 'CoopDocument', tableName: 'coop_documents', underscored: true, timestamps: true });
  return CoopDocument;
};
