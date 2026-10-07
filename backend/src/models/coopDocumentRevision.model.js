const { DataTypes, Model } = require('sequelize');
module.exports = sequelize => {
  class CoopDocumentRevision extends Model {
    static associate(m) {
      CoopDocumentRevision.belongsTo(m.CoopDocument, { foreignKey: 'coop_document_id', as: 'document', onDelete: 'RESTRICT' });
      CoopDocumentRevision.belongsTo(m.DepartmentStaff, { foreignKey: 'department_staff_id', as: 'staff', onDelete: 'RESTRICT' });
    }
  }
  CoopDocumentRevision.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    coop_document_id: { type: DataTypes.UUID, allowNull: false }, version: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING(16), allowNull: false }, status: { type: DataTypes.STRING(16), allowNull: false },
    department_staff_id: { type: DataTypes.UUID, allowNull: false }, document_number: { type: DataTypes.STRING(80), allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: false }, snapshot: { type: DataTypes.JSONB, allowNull: false },
    template_version: { type: DataTypes.STRING(40), allowNull: false }, rendered_html: { type: DataTypes.TEXT, allowNull: true },
    content_sha256: { type: DataTypes.CHAR(64), allowNull: true },
  }, { sequelize, modelName: 'CoopDocumentRevision', tableName: 'coop_document_revisions', underscored: true, timestamps: true, updatedAt: false });
  return CoopDocumentRevision;
};
