const { DataTypes, Model } = require('sequelize');
module.exports = sequelize => {
  class CoopPrerequisiteCatalogProgram extends Model {}
  CoopPrerequisiteCatalogProgram.init({
    program: { type: DataTypes.STRING(3), primaryKey: true, validate: { isIn: [['IT', 'INE']] } },
    revision: { type: DataTypes.BIGINT, allowNull: false, defaultValue: '1' },
  }, { sequelize, modelName: 'CoopPrerequisiteCatalogProgram', tableName: 'coop_prerequisite_catalog_programs', underscored: true, timestamps: true });
  return CoopPrerequisiteCatalogProgram;
};
