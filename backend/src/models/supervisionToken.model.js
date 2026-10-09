const { DataTypes: D } = require("sequelize");
module.exports = sequelize => {
  const model = sequelize.define("SupervisionToken", {
    id: { type: D.UUID, primaryKey: true, defaultValue: D.UUIDV4 }, appointment_id: { type: D.UUID, allowNull: false },
    version: { type: D.INTEGER, allowNull: false }, token_hash: { type: D.CHAR(64), allowNull: false },
    expires_at: { type: D.DATE, allowNull: false }, revoked_at: D.DATE, consumed_at: D.DATE,
  }, { tableName: "supervision_tokens", underscored: true, createdAt: "created_at", updatedAt: false });
  model.associate = m => model.belongsTo(m.SupervisionAppointment, { foreignKey: "appointment_id", onDelete: "CASCADE" });
  return model;
};
