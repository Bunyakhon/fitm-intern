const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const model = sequelize.define('CoopTopicExam', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    student_id: { type: DataTypes.UUID, allowNull: false, unique: true, references: { model: 'students', key: 'id' } },
    project_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'coop_projects', key: 'id' } },
    starts_at: DataTypes.DATE, ends_at: DataTypes.DATE,
    mode: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [['onsite','online']] } },
    location: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    location_key: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
    meeting_url: { type: DataTypes.STRING(2000), allowNull: false, defaultValue: '' },
    status: { type: DataTypes.STRING(24), allowNull: false, validate: { isIn: [['scheduled','rescheduled','cancelled','completed']] } },
    notes: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    reason: { type: DataTypes.STRING(2000), allowNull: false, defaultValue: '' },
    created_by: { type: DataTypes.STRING(100), allowNull: false }, updated_by: { type: DataTypes.STRING(100), allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  }, { tableName: 'coop_topic_exams', underscored: true, timestamps: true, indexes: [{ fields: ['status','starts_at','ends_at'] }] });
  model.associate = models => {
    model.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student', onDelete: 'CASCADE' });
    model.belongsTo(models.CoopProject, { foreignKey: 'project_id', as: 'project', onDelete: 'RESTRICT' });
    model.hasMany(models.CoopTopicExamCommitteeMember, { foreignKey: 'exam_id', as: 'committee', onDelete: 'CASCADE' });
    model.hasMany(models.CoopTopicExamHistory, { foreignKey: 'exam_id', as: 'history', onDelete: 'CASCADE' });
  };
  return model;
};
