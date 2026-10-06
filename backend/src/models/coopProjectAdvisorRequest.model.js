const { DataTypes, Model } = require("sequelize");

module.exports = sequelize => {
  class CoopProjectAdvisorRequest extends Model {
    static associate(models) {
      this.belongsTo(models.Student, { foreignKey: "student_id", as: "student", onDelete: "CASCADE", onUpdate: "CASCADE" });
      this.belongsTo(models.Teacher, { foreignKey: "requested_advisor_teacher_id", as: "requestedTeacher", onDelete: "RESTRICT", onUpdate: "CASCADE" });
    }
  }
  CoopProjectAdvisorRequest.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    student_id: { type: DataTypes.UUID, allowNull: false },
    requested_advisor_teacher_id: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "pending", validate: { isIn: [["pending", "confirmed", "rejected", "superseded"]] } },
    requested_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    confirmed_at: { type: DataTypes.DATE, allowNull: true },
    rejected_at: { type: DataTypes.DATE, allowNull: true },
    superseded_at: { type: DataTypes.DATE, allowNull: true },
    rejection_reason: { type: DataTypes.STRING(2000), allowNull: true },
  }, { sequelize, modelName: "CoopProjectAdvisorRequest", tableName: "coop_project_advisor_requests", underscored: true, timestamps: true });
  return CoopProjectAdvisorRequest;
};
