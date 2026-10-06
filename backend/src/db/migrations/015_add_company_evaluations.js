const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: qi }) {
    await qi.sequelize.transaction(async transaction => {
      await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await qi.createTable("company_evaluations", {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
        student_id: { type: DataTypes.UUID, allowNull: false, references: { model: "students", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
        mentor_id: { type: DataTypes.UUID, allowNull: true, references: { model: "mentors", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
        ...Object.fromEntries([1, 2, 3, 4, 5].map(n => [`q${n}_score`, { type: DataTypes.SMALLINT, allowNull: false }])),
        comment: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal("CURRENT_TIMESTAMP") },
      }, { transaction });
      await qi.addIndex("company_evaluations", ["student_id"], { unique: true, name: "company_evaluations_student_unique", transaction });
      await qi.sequelize.query(`ALTER TABLE company_evaluations
        ADD CONSTRAINT company_evaluations_scores_check CHECK (${[1, 2, 3, 4, 5].map(n => `q${n}_score BETWEEN 1 AND 10`).join(" AND ")}),
        ADD CONSTRAINT company_evaluations_comment_check CHECK (char_length(comment) <= 2000 AND comment = btrim(comment))`, { transaction });
    });
  },
  async down({ context: qi }) {
    await qi.sequelize.transaction(async transaction => {
      await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await qi.sequelize.query("LOCK TABLE company_evaluations IN ACCESS EXCLUSIVE MODE", { transaction });
      const [rows] = await qi.sequelize.query("SELECT EXISTS (SELECT 1 FROM company_evaluations) AS populated", { transaction });
      if (rows[0].populated) throw new Error("015 rollback refused: preserve saved company evaluations");
      await qi.dropTable("company_evaluations", { transaction });
    });
  },
};
