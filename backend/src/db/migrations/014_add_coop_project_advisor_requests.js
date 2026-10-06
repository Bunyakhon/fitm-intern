const { DataTypes, Op } = require("sequelize");

module.exports = {
  async up({ context: qi }) {
    await qi.sequelize.transaction(async transaction => {
      await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await qi.createTable("coop_project_advisor_requests", {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
        student_id: { type: DataTypes.UUID, allowNull: false, references: { model: "students", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
        requested_advisor_teacher_id: { type: DataTypes.UUID, allowNull: false, references: { model: "teachers", key: "id" }, onDelete: "RESTRICT", onUpdate: "CASCADE" },
        status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "pending" },
        requested_at: { type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal("CURRENT_TIMESTAMP") },
        confirmed_at: { type: DataTypes.DATE, allowNull: true },
        rejected_at: { type: DataTypes.DATE, allowNull: true },
        superseded_at: { type: DataTypes.DATE, allowNull: true },
        rejection_reason: { type: DataTypes.STRING(2000), allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal("CURRENT_TIMESTAMP") },
      }, { transaction });
      await qi.sequelize.query(`ALTER TABLE coop_project_advisor_requests
        ADD CONSTRAINT project_advisor_request_state_check CHECK (
          (status = 'pending' AND confirmed_at IS NULL AND rejected_at IS NULL AND superseded_at IS NULL AND rejection_reason IS NULL)
          OR (status = 'confirmed' AND confirmed_at IS NOT NULL AND rejected_at IS NULL AND superseded_at IS NULL AND rejection_reason IS NULL)
          OR (status = 'rejected' AND confirmed_at IS NULL AND rejected_at IS NOT NULL AND superseded_at IS NULL AND rejection_reason IS NOT NULL AND length(btrim(rejection_reason)) > 0)
          OR (status = 'superseded' AND confirmed_at IS NULL AND superseded_at IS NOT NULL AND
            ((rejected_at IS NULL AND rejection_reason IS NULL) OR (rejected_at IS NOT NULL AND rejection_reason IS NOT NULL AND length(btrim(rejection_reason)) > 0)))),
        ADD CONSTRAINT project_advisor_request_time_check CHECK (
          (confirmed_at IS NULL OR confirmed_at >= requested_at) AND
          (rejected_at IS NULL OR rejected_at >= requested_at) AND
          (superseded_at IS NULL OR superseded_at >= coalesce(rejected_at, requested_at)))`, { transaction });
      await qi.addIndex("coop_project_advisor_requests", ["student_id"], {
        name: "project_advisor_one_current_per_student", unique: true,
        where: { status: { [Op.ne]: "superseded" } }, transaction,
      });
      await qi.addIndex("coop_project_advisor_requests", ["requested_advisor_teacher_id", "requested_at"], {
        name: "project_advisor_teacher_pending_idx", where: { status: "pending" }, transaction,
      });
    });
  },
  async down({ context: qi }) {
    await qi.sequelize.transaction(async transaction => {
      await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await qi.sequelize.query("LOCK TABLE coop_project_advisor_requests IN ACCESS EXCLUSIVE MODE", { transaction });
      const [rows] = await qi.sequelize.query("SELECT EXISTS (SELECT 1 FROM coop_project_advisor_requests) AS evidence", { transaction });
      if (rows[0].evidence) throw new Error("014 rollback refused: preserve project advisor request history");
      await qi.dropTable("coop_project_advisor_requests", { transaction });
    });
  },
};
