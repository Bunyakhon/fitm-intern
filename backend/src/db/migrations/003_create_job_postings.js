const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("job_postings")) {
      return;
    }

    await queryInterface.createTable("job_postings", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      company_id: { type: DataTypes.UUID, allowNull: false },
      submission_id: { type: DataTypes.UUID, allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      category: { type: DataTypes.STRING(64), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      quota: { type: DataTypes.SMALLINT, allowNull: false },
      compensation_text: { type: DataTypes.STRING(500), allowNull: false },
      work_days_per_week: { type: DataTypes.SMALLINT, allowNull: false },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "pending_email_verification",
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
      published_at: { type: DataTypes.DATE, allowNull: true },
      withdrawn_at: { type: DataTypes.DATE, allowNull: true },
      expires_at: { type: DataTypes.DATE, allowNull: true },
      rejection_reason: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("job_postings", {
      fields: ["company_id"],
      type: "foreign key",
      name: "job_postings_company_id_fkey",
      references: { table: "companies", field: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    await queryInterface.addConstraint("job_postings", {
      fields: ["submission_id"],
      type: "foreign key",
      name: "job_postings_submission_id_fkey",
      references: { table: "job_submissions", field: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  },
  async down({ context: queryInterface }) {
    await queryInterface.dropTable("job_postings");
  },
};
