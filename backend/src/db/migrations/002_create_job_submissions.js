const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("job_submissions")) {
      return;
    }

    await queryInterface.createTable("job_submissions", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      company_id: { type: DataTypes.UUID, allowNull: false },
      submitted_email: { type: DataTypes.STRING(254), allowNull: false },
      normalized_submitted_email: {
        type: DataTypes.STRING(254),
        allowNull: false,
      },
      verification_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "pending_email_verification",
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      verified_at: { type: DataTypes.DATE, allowNull: true },
      expired_at: { type: DataTypes.DATE, allowNull: true },
      cancelled_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("job_submissions", {
      fields: ["company_id"],
      type: "foreign key",
      name: "job_submissions_company_id_fkey",
      references: { table: "companies", field: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  },
  async down({ context: queryInterface }) {
    await queryInterface.dropTable("job_submissions");
  },
};
