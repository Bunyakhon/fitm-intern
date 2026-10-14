const { DataTypes } = require("sequelize");
module.exports = sequelize => sequelize.define("GoogleIdentity", {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  subject: { type: DataTypes.STRING(255), allowNull: false },
  actor_type: { type: DataTypes.STRING(32), allowNull: false },
  student_id: { type: DataTypes.UUID, allowNull: true, references: { model: "students", key: "id" } },
  teacher_id: { type: DataTypes.UUID, allowNull: true, references: { model: "teachers", key: "id" } },
  staff_id: { type: DataTypes.UUID, allowNull: true, references: { model: "department_staffs", key: "id" } },
}, { tableName: "google_identities", underscored: true, timestamps: true });
