const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("job_posting_work_modes")) {
      return;
    }

    await queryInterface.createTable("job_posting_work_modes", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      job_posting_id: { type: DataTypes.UUID, allowNull: false },
      mode: { type: DataTypes.STRING(32), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("job_posting_work_modes", {
      fields: ["job_posting_id"],
      type: "foreign key",
      name: "job_posting_work_modes_job_posting_id_fkey",
      references: { table: "job_postings", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },
  async down({ context: queryInterface }) {
    await queryInterface.dropTable("job_posting_work_modes");
  },
};
