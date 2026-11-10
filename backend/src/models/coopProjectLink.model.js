const { DataTypes, literal } = require("sequelize");
module.exports = sequelize => {
  const model = sequelize.define("CoopProjectLink", {
    student_id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, references: { model: "students", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
    category: { type: DataTypes.STRING(24), allowNull: false, primaryKey: true, validate: { isIn: [["project-book", "poster"]] } },
    document_url: { type: DataTypes.STRING(2000), allowNull: false, defaultValue: "" },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { isInt: true, min: 1 } },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: literal("CURRENT_TIMESTAMP") },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: literal("CURRENT_TIMESTAMP") },
  }, { tableName: "coop_project_links", underscored: true, timestamps: true });
  model.associate = models => model.belongsTo(models.Student, { foreignKey: "student_id", as: "student", onDelete: "CASCADE", onUpdate: "CASCADE" });
  return model;
};
