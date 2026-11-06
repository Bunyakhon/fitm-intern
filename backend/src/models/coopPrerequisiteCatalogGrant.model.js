const { DataTypes, Model } = require('sequelize');
module.exports = sequelize => {
  class CoopPrerequisiteCatalogGrant extends Model {
    static associate(models) {
      this.belongsTo(models.DepartmentStaff, { foreignKey: 'department_staff_id', as: 'staff', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
      this.belongsTo(models.CoopPrerequisiteCatalogProgram, { foreignKey: 'program', as: 'catalogProgram', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
    }
  }
  CoopPrerequisiteCatalogGrant.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    department_staff_id: { type: DataTypes.UUID, allowNull: false },
    permission: { type: DataTypes.STRING(64), allowNull: false, validate: { isIn: [['coop_prerequisite_catalog.manage']] } },
    program: { type: DataTypes.STRING(3), allowNull: false, validate: { isIn: [['IT', 'INE']] } },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize, modelName: 'CoopPrerequisiteCatalogGrant', tableName: 'coop_prerequisite_catalog_grants', underscored: true, timestamps: true,
    indexes: [{ name: 'coop_catalog_staff_permission_program_unique', unique: true, fields: ['department_staff_id', 'permission', 'program'] }] });
  return CoopPrerequisiteCatalogGrant;
};
