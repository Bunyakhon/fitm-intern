const { DataTypes, Model } = require('sequelize');
const { normalizeNewCourseGrade } = require('../services/coopPrerequisites');
module.exports = sequelize => {
  class CoopRequestAcademicHistory extends Model {
    static associate(m) {
      this.belongsTo(m.CoopRequest, { foreignKey: 'coop_request_id', as: 'request', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
      this.belongsTo(m.CoopRequestPrerequisiteCourse, { foreignKey: 'prerequisite_course_id', as: 'originalCourse', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
      this.belongsTo(m.Student, { foreignKey: 'actor_student_id', as: 'actorStudent', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
    }
  }
  CoopRequestAcademicHistory.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    coop_request_id: { type: DataTypes.UUID, allowNull: false },
    prerequisite_course_id: { type: DataTypes.UUID, allowNull: false },
    course_code: { type: DataTypes.STRING(9), allowNull: false },
    actor_student_id: { type: DataTypes.UUID, allowNull: false },
    operation_id: { type: DataTypes.UUID, allowNull: false },
    revision: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    old_status: { type: DataTypes.STRING(16), allowNull: false },
    old_grade: { type: DataTypes.STRING(10), allowNull: true },
    new_status: { type: DataTypes.STRING(16), allowNull: false },
    new_grade: { type: DataTypes.STRING(10), allowNull: false },
    request_status_at_change: { type: DataTypes.STRING(32), allowNull: false },
  }, { sequelize, modelName: 'CoopRequestAcademicHistory', tableName: 'coop_request_academic_history', underscored: true, timestamps: true, updatedAt: false,
    indexes: [
      { name: 'coop_academic_request_revision_unique', unique: true, fields: ['coop_request_id', 'revision'] },
      { name: 'coop_academic_request_operation_unique', unique: true, fields: ['coop_request_id', 'operation_id'] },
    ],
    validate: { validResult() { normalizeNewCourseGrade(this.new_status, this.new_grade); } },
  });
  return CoopRequestAcademicHistory;
};
