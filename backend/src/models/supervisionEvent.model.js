const { DataTypes: D } = require("sequelize");
module.exports = sequelize => {
  const model = sequelize.define("SupervisionEvent", {
    id: { type: D.UUID, primaryKey: true, defaultValue: D.UUIDV4 }, appointment_id: { type: D.UUID, allowNull: false },
    version: { type: D.INTEGER, allowNull: false }, action: { type: D.STRING(32), allowNull: false },
    actor_name: { type: D.STRING(512), allowNull: false }, teacher_id: D.UUID,
    reason: { type: D.TEXT, allowNull: false, defaultValue: "" }, snapshot: { type: D.JSONB, allowNull: false },
  }, { tableName: "supervision_events", underscored: true, createdAt: "created_at", updatedAt: false });
  model.associate = m => model.belongsTo(m.SupervisionAppointment, { foreignKey: "appointment_id", onDelete: "RESTRICT" });
  return model;
};
