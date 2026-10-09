const { DataTypes: D } = require("sequelize");
module.exports = sequelize => {
  const model = sequelize.define("SupervisionAppointment", {
    id: { type: D.UUID, primaryKey: true, defaultValue: D.UUIDV4 },
    student_id: { type: D.UUID, allowNull: false }, request_id: { type: D.UUID, allowNull: false },
    teacher_id: { type: D.UUID, allowNull: false }, mentor_id: { type: D.UUID, allowNull: false },
    visit_number: { type: D.SMALLINT, allowNull: false }, scheduled_at: { type: D.DATE, allowNull: false },
    timezone: { type: D.STRING(32), allowNull: false, defaultValue: "Asia/Bangkok" },
    status: { type: D.STRING(32), allowNull: false }, version: { type: D.INTEGER, allowNull: false },
    snapshot: { type: D.JSONB, allowNull: false }, notes: { type: D.TEXT, allowNull: false, defaultValue: "" }, confirmed_at: D.DATE,
  }, { tableName: "supervision_appointments", underscored: true, createdAt: "created_at", updatedAt: "updated_at" });
  model.associate = m => {
    for (const [key, target] of [["student", m.Student], ["request", m.CoopRequest], ["teacher", m.Teacher], ["mentor", m.Mentor]]) model.belongsTo(target, { as: key, foreignKey: `${key}_id`, onDelete: "RESTRICT" });
    model.hasMany(m.SupervisionEvent, { as: "events", foreignKey: "appointment_id", onDelete: "RESTRICT" });
    model.hasOne(m.SupervisionResult, { as: "result", foreignKey: "appointment_id", onDelete: "RESTRICT" });
    model.hasMany(m.SupervisionImage, { as: "images", foreignKey: "appointment_id", onDelete: "RESTRICT" });
  };
  return model;
};
