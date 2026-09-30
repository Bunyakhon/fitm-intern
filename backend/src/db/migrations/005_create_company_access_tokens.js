const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("company_access_tokens")) {
      return;
    }

    await queryInterface.createTable("company_access_tokens", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      company_id: { type: DataTypes.UUID, allowNull: false },
      job_submission_id: { type: DataTypes.UUID, allowNull: true },
      purpose: { type: DataTypes.STRING(32), allowNull: false },
      token_hash: { type: DataTypes.CHAR(64), allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      used_at: { type: DataTypes.DATE, allowNull: true },
      revoked_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("company_access_tokens", {
      fields: ["company_id"],
      type: "foreign key",
      name: "company_access_tokens_company_id_fkey",
      references: { table: "companies", field: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    await queryInterface.addConstraint("company_access_tokens", {
      fields: ["job_submission_id"],
      type: "foreign key",
      name: "company_access_tokens_job_submission_id_fkey",
      references: { table: "job_submissions", field: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  },
  async down({ context: queryInterface }) {
    await queryInterface.dropTable("company_access_tokens");
  },
};
