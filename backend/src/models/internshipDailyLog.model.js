const { Model, DataTypes } = require("sequelize");
module.exports = sequelize => {
  class InternshipDailyLog extends Model {}
  const uuid = { type: DataTypes.UUID, allowNull: false };
  const string = { type: DataTypes.TEXT, allowNull: false };
  const content = { type: DataTypes.TEXT, allowNull: false, defaultValue: "" };
  const integer = { type: DataTypes.INTEGER, allowNull: false };
  const timestamp = { type: DataTypes.DATE, allowNull: false };
  InternshipDailyLog.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, student_id: { ...uuid }, log_date: { type: DataTypes.DATEONLY, allowNull: false }, kind: { ...string }, assigned_work: { ...content }, work_result: { ...content }, problems: { ...content }, solutions: { ...content }, notes: { ...content }, non_working_reason: { ...content }, version: { ...integer } }, { sequelize, modelName: "InternshipDailyLog", tableName: "internship_daily_logs", underscored: true, timestamps: true });
  return InternshipDailyLog;
};
