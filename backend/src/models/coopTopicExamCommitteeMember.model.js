const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const model = sequelize.define('CoopTopicExamCommitteeMember', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    exam_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'coop_topic_exams', key: 'id' } },
    teacher_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'teachers', key: 'id' } },
    role: { type: DataTypes.STRING(24), allowNull: false, validate: { isIn: [['chair','member','advisor']] } },
    display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, { tableName: 'coop_topic_exam_committee_members', underscored: true, timestamps: true, indexes: [{ unique: true, fields: ['exam_id','teacher_id'] }, { fields: ['teacher_id'] }] });
  model.associate = models => {
    model.belongsTo(models.CoopTopicExam, { foreignKey: 'exam_id', as: 'exam', onDelete: 'CASCADE' });
    model.belongsTo(models.Teacher, { foreignKey: 'teacher_id', as: 'teacher', onDelete: 'RESTRICT' });
  };
  return model;
};
