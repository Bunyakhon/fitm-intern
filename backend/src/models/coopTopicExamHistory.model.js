const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const model = sequelize.define('CoopTopicExamHistory', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    exam_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'coop_topic_exams', key: 'id' } },
    version: { type: DataTypes.INTEGER, allowNull: false }, actor: { type: DataTypes.STRING(100), allowNull: false },
    snapshot: { type: DataTypes.JSONB, allowNull: false },
  }, { tableName: 'coop_topic_exam_history', underscored: true, timestamps: true, updatedAt: false, indexes: [{ unique: true, fields: ['exam_id','version'] }] });
  model.associate = models => model.belongsTo(models.CoopTopicExam, { foreignKey: 'exam_id', as: 'exam', onDelete: 'CASCADE' });
  return model;
};
