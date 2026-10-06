const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class CoopProject extends Model {
    static associate(models) {
      CoopProject.belongsTo(models.Student, { foreignKey: "student_id", as: "student", onDelete: "CASCADE" });
    }
  }
  CoopProject.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    student_id: { type: DataTypes.UUID, allowNull: false, unique: true, references: { model: "students", key: "id" } },
    topic: { type: DataTypes.STRING(500), allowNull: false },
  }, { sequelize, modelName: "CoopProject", tableName: "coop_projects", underscored: true, timestamps: true });
  return CoopProject;
};
