const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: qi }) {
    await qi.sequelize.transaction(async transaction => {
      await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await qi.createTable("coop_projects", {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
        student_id: { type: DataTypes.UUID, allowNull: false, references: { model: "students", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
        topic: { type: DataTypes.STRING(500), allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: qi.sequelize.literal("CURRENT_TIMESTAMP") },
      }, { transaction });
      await qi.addIndex("coop_projects", ["student_id"], { unique: true, name: "coop_projects_student_unique", transaction });
      await qi.sequelize.query("ALTER TABLE coop_projects ADD CONSTRAINT coop_projects_topic_check CHECK (length(btrim(topic)) BETWEEN 1 AND 500 AND topic = btrim(topic))", { transaction });
      // Fail atomically on pre-existing duplicates; never delete existing files/evidence.
      await qi.addIndex("student_files", ["student_id", "file_type"], {
        unique: true, name: "student_files_current_coop_project_unique",
        where: { file_type: ["coop_project_book", "coop_poster"] }, transaction,
      });
    });
  },
  async down({ context: qi }) {
    await qi.sequelize.transaction(async transaction => {
      await qi.sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await qi.sequelize.query("LOCK TABLE coop_projects IN ACCESS EXCLUSIVE MODE", { transaction });
      const [rows] = await qi.sequelize.query("SELECT EXISTS (SELECT 1 FROM coop_projects) AS populated", { transaction });
      if (rows[0].populated) throw new Error("013 rollback refused: preserve saved project topics");
      await qi.removeIndex("student_files", "student_files_current_coop_project_unique", { transaction });
      await qi.dropTable("coop_projects", { transaction });
    });
  },
};
