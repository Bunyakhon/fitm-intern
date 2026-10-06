const {DataTypes, Model} = require('sequelize');
module.exports = sequelize => {
  class CoopRequestPrerequisiteCourse extends Model {
    static associate(models) {
      this.belongsTo(models.CoopRequest, {foreignKey: 'coop_request_id', as: 'request', onDelete: 'CASCADE', onUpdate: 'CASCADE'});
    }
  }
  CoopRequestPrerequisiteCourse.init({
    id: {type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4},
    coop_request_id: {type: DataTypes.UUID, allowNull: false},
    program: {type: DataTypes.STRING(3), allowNull: false, validate: {isIn: [['IT', 'INE']]}},
    course_code: {type: DataTypes.STRING(9), allowNull: false},
    course_name: {type: DataTypes.STRING(255), allowNull: false},
    english_name: {type: DataTypes.STRING(255), allowNull: true},
    status: {type: DataTypes.STRING(16), allowNull: false, validate: {isIn: [['passed', 'studying', 'unselected']]}},
    grade: {type: DataTypes.STRING(10), allowNull: true},
  }, {sequelize, modelName: 'CoopRequestPrerequisiteCourse', tableName: 'coop_request_prerequisite_courses', underscored: true, timestamps: true,
    indexes: [{name: 'coop_prerequisites_request_code_unique', unique: true, fields: ['coop_request_id', 'course_code']}],
    validate: {gradeMatchesStatus() { if (this.status === 'passed' ? !this.grade?.trim() : this.grade != null) throw new Error('Grade does not match prerequisite status'); }},
  });
  return CoopRequestPrerequisiteCourse;
};
