const { Model, DataTypes } = require("sequelize");
module.exports = sequelize => {
  class InternshipWeekEvent extends Model {}
  const uuid = { type: DataTypes.UUID, allowNull: false };
  const string = { type: DataTypes.TEXT, allowNull: false };
  const content = { type: DataTypes.TEXT, allowNull: false, defaultValue: "" };
  const integer = { type: DataTypes.INTEGER, allowNull: false };
  const timestamp = { type: DataTypes.DATE, allowNull: false };
  InternshipWeekEvent.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, week_id: uuid, version: integer, action: string, mentor_id: { type: DataTypes.UUID }, mentor_name: { type: DataTypes.TEXT }, feedback: content, snapshot: { type: DataTypes.JSONB, allowNull: false } }, { sequelize, modelName: "InternshipWeekEvent", tableName: "internship_week_events", underscored: true, timestamps: true });
  return InternshipWeekEvent;
};
