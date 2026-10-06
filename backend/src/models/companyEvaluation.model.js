const { DataTypes, Model } = require("sequelize");

module.exports = sequelize => {
  class CompanyEvaluation extends Model {
    static associate(models) {
      CompanyEvaluation.belongsTo(models.Student, { foreignKey: "student_id", as: "student", onDelete: "CASCADE", onUpdate: "CASCADE" });
      CompanyEvaluation.belongsTo(models.Mentor, { foreignKey: "mentor_id", as: "mentor", onDelete: "SET NULL", onUpdate: "CASCADE" });
    }
  }
  CompanyEvaluation.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    student_id: { type: DataTypes.UUID, allowNull: false },
    mentor_id: { type: DataTypes.UUID, allowNull: true },
    ...Object.fromEntries([1, 2, 3, 4, 5].map(n => [`q${n}_score`, { type: DataTypes.SMALLINT, allowNull: false, validate: { isInt: true, min: 1, max: 10 } }])),
    comment: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
  }, {
    sequelize, modelName: "CompanyEvaluation", tableName: "company_evaluations", underscored: true, timestamps: true,
    indexes: [{ name: "company_evaluations_student_unique", unique: true, fields: ["student_id"] }],
  });
  return CompanyEvaluation;
};
