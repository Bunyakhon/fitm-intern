const { Model, DataTypes } = require("sequelize");
module.exports = sequelize => {
  class InternshipWeek extends Model {}
  const uuid = { type: DataTypes.UUID, allowNull: false };
  const string = { type: DataTypes.TEXT, allowNull: false };
  const content = { type: DataTypes.TEXT, allowNull: false, defaultValue: "" };
  const integer = { type: DataTypes.INTEGER, allowNull: false };
  const timestamp = { type: DataTypes.DATE, allowNull: false };
  InternshipWeek.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, student_id: { ...uuid }, mentor_id: { ...uuid }, week_start: { type: DataTypes.DATEONLY, allowNull: false }, week_end: { type: DataTypes.DATEONLY, allowNull: false }, status: { ...string }, version: { ...integer }, snapshot: { type: DataTypes.JSONB, allowNull: false }, submitted_at: { ...timestamp } }, { sequelize, modelName: "InternshipWeek", tableName: "internship_weeks", underscored: true, timestamps: true });
  return InternshipWeek;
};
