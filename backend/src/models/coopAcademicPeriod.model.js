const { DataTypes, Model } = require('sequelize');
module.exports = sequelize => {
  class CoopAcademicPeriod extends Model {}
  CoopAcademicPeriod.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    academic_year: { type: DataTypes.INTEGER, allowNull: false, validate: { isInt: true, min: 1, max: 9999 } },
    semester: { type: DataTypes.INTEGER, allowNull: false, validate: { isIn: [[1, 2]] } },
  }, { sequelize, modelName: 'CoopAcademicPeriod', tableName: 'coop_academic_periods', timestamps: false,
    indexes: [{ name: 'coop_academic_periods_year_semester', unique: true, fields: ['academic_year', 'semester'] }] });
  return CoopAcademicPeriod;
};
