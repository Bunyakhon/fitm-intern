const { DataTypes: D } = require("sequelize");
module.exports = sequelize => {
  const model = sequelize.define("SupervisionResult", {
    id: { type: D.UUID, primaryKey: true, defaultValue: D.UUIDV4 }, appointment_id: D.UUID, appointment_version: D.INTEGER, author_id: D.UUID, status: D.STRING(16), version: D.INTEGER, visited_on: D.DATEONLY, summary: D.TEXT, issues: D.TEXT, recommendations: D.TEXT, image_1_id: D.UUID, image_2_id: D.UUID, snapshot: D.JSONB, completed_at: D.DATE
  }, { tableName: "supervision_results", underscored: true, createdAt: "created_at", updatedAt: "updated_at" });
  model.associate = m => { model.belongsTo(m.SupervisionAppointment, { foreignKey: "appointment_id", onDelete: "RESTRICT" }); model.belongsTo(m.Teacher, { foreignKey: "author_id", onDelete: "RESTRICT" }); model.hasMany(m.SupervisionResultRevision, { foreignKey: "result_id", onDelete: "RESTRICT" }); };
  return model;
};
