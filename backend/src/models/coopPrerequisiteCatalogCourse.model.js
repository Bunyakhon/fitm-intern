const { DataTypes, Model } = require('sequelize');
module.exports = sequelize => {
  class CoopPrerequisiteCatalogCourse extends Model {
    static associate(models) {
      this.belongsTo(models.CoopPrerequisiteCatalogProgram, { foreignKey: 'program', as: 'catalogProgram', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
      this.belongsTo(models.DepartmentStaff, { foreignKey: 'updated_by', as: 'editor', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
    }
  }
  CoopPrerequisiteCatalogCourse.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    program: { type: DataTypes.STRING(3), allowNull: false, validate: { isIn: [['IT', 'INE']] } },
    course_code: { type: DataTypes.STRING(9), allowNull: false, validate: { is: /^[0-9]{9}$/ } },
    course_name: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
    english_name: { type: DataTypes.STRING(255), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
    updated_by: { type: DataTypes.UUID, allowNull: true },
  }, { sequelize, modelName: 'CoopPrerequisiteCatalogCourse', tableName: 'coop_prerequisite_catalog_courses', underscored: true, timestamps: true,
    indexes: [{ name: 'coop_catalog_program_code_unique', unique: true, fields: ['program', 'course_code'] }] });
  return CoopPrerequisiteCatalogCourse;
};
