const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.addColumn("coop_requests", "company_id", { type: DataTypes.UUID, allowNull: true });
    await queryInterface.addColumn("coop_requests", "job_posting_id", { type: DataTypes.UUID, allowNull: true });
    await queryInterface.addConstraint("coop_requests", { fields: ["company_id"], type: "foreign key", name: "coop_requests_company_id_fkey", references: { table: "companies", field: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" });
    await queryInterface.addConstraint("coop_requests", { fields: ["job_posting_id"], type: "foreign key", name: "coop_requests_job_posting_id_fkey", references: { table: "job_postings", field: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" });
    await queryInterface.addIndex("coop_requests", ["company_id"], { name: "coop_requests_company_id_idx" });
    await queryInterface.addIndex("coop_requests", ["job_posting_id"], { name: "coop_requests_job_posting_id_idx" });
  },
  async down({ context: queryInterface }) {
    await queryInterface.removeIndex("coop_requests", "coop_requests_job_posting_id_idx");
    await queryInterface.removeIndex("coop_requests", "coop_requests_company_id_idx");
    await queryInterface.removeConstraint("coop_requests", "coop_requests_job_posting_id_fkey");
    await queryInterface.removeConstraint("coop_requests", "coop_requests_company_id_fkey");
    await queryInterface.removeColumn("coop_requests", "job_posting_id");
    await queryInterface.removeColumn("coop_requests", "company_id");
  },
};
