const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const model = sequelize.define('CoopTopicDocument', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    student_id: { type: DataTypes.UUID, allowNull: false, unique: true, references: { model: 'students', key: 'id' } },
    storage_path: { type: DataTypes.STRING(500), unique: true }, original_name: DataTypes.STRING(255),
    file_size: DataTypes.BIGINT, mime_type: DataTypes.STRING(100), uploaded_at: DataTypes.DATE,
    document_url: { type: DataTypes.STRING(2000), allowNull: false, defaultValue: '' },
    review_status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'missing', validate: { isIn: [['missing','pending','needs_revision','approved']] } },
    review_reason: { type: DataTypes.STRING(2000), allowNull: false, defaultValue: '' },
    reviewed_at: DataTypes.DATE, reviewed_by: DataTypes.STRING(100),
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  }, { tableName: 'coop_topic_documents', underscored: true, timestamps: true });
  model.associate = models => model.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student', onDelete: 'CASCADE' });
  return model;
};
