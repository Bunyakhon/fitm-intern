const { DataTypes } = require("sequelize");

// Head privilege is explicit, defaults false, and is never inferred from position.
module.exports = {
  async up({ context: qi }) {
    await qi.sequelize.transaction(async (transaction) => {
      await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", {
        transaction,
      });
      await qi.addColumn(
        "teachers",
        "is_department_head",
        { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        { transaction },
      );
      const fk = (table) => ({
        type: DataTypes.UUID,
        references: { model: table, key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
      const common = {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
        from_status: { type: DataTypes.STRING(32), allowNull: false },
        to_status: { type: DataTypes.STRING(32), allowNull: false },
        decision: { type: DataTypes.STRING(16), allowNull: false },
        reason: { type: DataTypes.STRING(2000), allowNull: true },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: qi.sequelize.literal("CURRENT_TIMESTAMP"),
        },
      };
      await qi.createTable(
        "coop_request_reviews",
        {
          ...common,
          coop_request_id: { ...fk("coop_requests"), allowNull: false },
          actor_role: { type: DataTypes.STRING(32), allowNull: false },
          teacher_id: { ...fk("teachers"), allowNull: true },
          department_staff_id: { ...fk("department_staffs"), allowNull: true },
        },
        { transaction },
      );
      await qi.createTable(
        "job_posting_reviews",
        {
          ...common,
          job_posting_id: { ...fk("job_postings"), allowNull: false },
          department_staff_id: { ...fk("department_staffs"), allowNull: false },
        },
        { transaction },
      );
      await qi.sequelize.query(
        `ALTER TABLE coop_request_reviews
        ADD CONSTRAINT coop_reviews_actor_check CHECK (
          (actor_role = 'department_staff' AND department_staff_id IS NOT NULL AND teacher_id IS NULL)
          OR (actor_role IN ('teacher', 'department_head') AND teacher_id IS NOT NULL AND department_staff_id IS NULL)),
        ADD CONSTRAINT coop_reviews_transition_check CHECK (
          (actor_role = 'teacher' AND from_status IN ('submitted', 'advisor_review') AND ((decision = 'approve' AND to_status = 'staff_review') OR (decision = 'reject' AND to_status = 'rejected')))
          OR (actor_role = 'department_staff' AND from_status = 'staff_review' AND ((decision = 'approve' AND to_status = 'department_head_review') OR (decision = 'reject' AND to_status = 'rejected')))
          OR (actor_role = 'department_head' AND from_status = 'department_head_review' AND ((decision = 'approve' AND to_status = 'approved') OR (decision = 'reject' AND to_status = 'rejected')))),
        ADD CONSTRAINT coop_reviews_reason_check CHECK (decision <> 'reject' OR (reason IS NOT NULL AND length(trim(reason)) > 0))`,
        { transaction },
      );
      await qi.sequelize.query(
        `ALTER TABLE job_posting_reviews
        ADD CONSTRAINT job_reviews_transition_check CHECK (from_status = 'pending_review' AND ((decision = 'approve' AND to_status = 'published') OR (decision = 'reject' AND to_status = 'rejected'))),
        ADD CONSTRAINT job_reviews_reason_check CHECK (decision <> 'reject' OR (reason IS NOT NULL AND length(trim(reason)) > 0))`,
        { transaction },
      );
      await qi.addIndex(
        "coop_request_reviews",
        ["coop_request_id", "created_at"],
        { name: "coop_reviews_request_time_idx", transaction },
      );
      await qi.addIndex(
        "job_posting_reviews",
        ["job_posting_id", "created_at"],
        { name: "job_reviews_posting_time_idx", transaction },
      );
      await qi.addIndex("coop_requests", ["status", "submitted_at"], {
        name: "coop_requests_review_queue_idx",
        transaction,
      });
      await qi.addIndex("students", ["advisor_teacher_id"], {
        name: "students_class_advisor_idx",
        transaction,
      });
    });
  },
  async down({ context: qi }) {
    await qi.sequelize.transaction(async (transaction) => {
      await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", {
        transaction,
      });
      await qi.sequelize.query(
        "LOCK TABLE coop_request_reviews, job_posting_reviews, teachers IN ACCESS EXCLUSIVE MODE",
        { transaction },
      );
      const [rows] = await qi.sequelize.query(
        "SELECT EXISTS (SELECT 1 FROM coop_request_reviews) OR EXISTS (SELECT 1 FROM job_posting_reviews) OR EXISTS (SELECT 1 FROM teachers WHERE is_department_head) AS has_evidence",
        { transaction },
      );
      if (rows[0].has_evidence)
        throw new Error(
          "011 rollback refused: preserve review history and assigned head privileges",
        );
      await qi.dropTable("job_posting_reviews", { transaction });
      await qi.dropTable("coop_request_reviews", { transaction });
      await qi.removeIndex("coop_requests", "coop_requests_review_queue_idx", {
        transaction,
      });
      await qi.removeIndex("students", "students_class_advisor_idx", {
        transaction,
      });
      await qi.removeColumn("teachers", "is_department_head", { transaction });
    });
  },
};
