const { DataTypes: D } = require("sequelize");
module.exports = sequelize => {
  const model = sequelize.define("SupervisionResultRevision", {
    id: { type: D.UUID, primaryKey: true, defaultValue: D.UUIDV4 }, result_id: D.UUID, version: D.INTEGER, actor_id: D.UUID, actor_name: D.STRING(512), snapshot: D.JSONB
  }, { tableName: "supervision_result_revisions", underscored: true, createdAt: "created_at", updatedAt: false });
  model.associate = m => { model.belongsTo(m.SupervisionResult, { foreignKey: "result_id", onDelete: "RESTRICT" }); model.belongsTo(m.Teacher, { foreignKey: "actor_id", onDelete: "RESTRICT" }); };
  return model;
};
