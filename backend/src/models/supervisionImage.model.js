const { DataTypes: D } = require("sequelize");
module.exports = sequelize => {
  const model = sequelize.define("SupervisionImage", {
    id: { type: D.UUID, primaryKey: true, defaultValue: D.UUIDV4 }, appointment_id: D.UUID, original_name: D.STRING(255), storage_path: D.TEXT, mime_type: D.STRING(32), file_size: D.INTEGER
  }, { tableName: "supervision_images", underscored: true, createdAt: "created_at", updatedAt: false });
  model.associate = m => { model.belongsTo(m.SupervisionAppointment, { foreignKey: "appointment_id", onDelete: "RESTRICT" }); };
  return model;
};
