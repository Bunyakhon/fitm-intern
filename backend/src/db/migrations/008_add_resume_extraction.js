const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.addColumn("student_files", "extracted_text", { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn("student_files", "extraction_method", { type: DataTypes.STRING(20), allowNull: true });
    await queryInterface.addColumn("student_files", "extraction_status", { type: DataTypes.STRING(20), allowNull: true });
    await queryInterface.addColumn("student_files", "extracted_at", { type: DataTypes.DATE, allowNull: true });
  },
  async down({ context: queryInterface }) {
    await queryInterface.removeColumn("student_files", "extracted_at");
    await queryInterface.removeColumn("student_files", "extraction_status");
    await queryInterface.removeColumn("student_files", "extraction_method");
    await queryInterface.removeColumn("student_files", "extracted_text");
  },
};
