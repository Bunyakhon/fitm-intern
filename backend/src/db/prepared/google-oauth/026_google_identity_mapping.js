// Prepared only: intentionally outside normal Umzug discovery. No execution on import.
const { DataTypes } = require("sequelize");
const table = tableName => ({ tableName, schema: "public" });
module.exports = {
  async up({ context: qi }) {
    // The controlled installer supplies the SAME transaction to DDL and Umzug
    // ledger storage. Standalone callers retain the original atomic DDL behavior.
    const apply = async transaction => {
      const options = { transaction };
      await qi.createTable(table("google_identities"), {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        subject: { type: DataTypes.STRING(255), allowNull: false },
        actor_type: { type: DataTypes.STRING(32), allowNull: false },
        ...Object.fromEntries([["student_id", "students"], ["teacher_id", "teachers"], ["staff_id", "department_staffs"]].map(([key, model]) =>
          [key, { type: DataTypes.UUID, allowNull: true, references: { model: table(model), key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" }])),
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
      }, options);
      await qi.sequelize.query(`ALTER TABLE public.google_identities ADD CONSTRAINT google_identity_actor_check CHECK (
        (actor_type='student' AND student_id IS NOT NULL AND teacher_id IS NULL AND staff_id IS NULL) OR
        (actor_type='teacher' AND teacher_id IS NOT NULL AND student_id IS NULL AND staff_id IS NULL) OR
        (actor_type='department_staff' AND staff_id IS NOT NULL AND student_id IS NULL AND teacher_id IS NULL)
      ), ADD CONSTRAINT google_identity_subject_check CHECK (length(subject)>0)`, options);
      await qi.addIndex(table("google_identities"), ["subject", "actor_type"], { ...options, unique: true, name: "google_subject_actor_unique" });
      for (const key of ["student_id", "teacher_id", "staff_id"]) await qi.addIndex(table("google_identities"), [key], { ...options, unique: true, name: `google_${key}_unique` });
      await qi.createTable(table("google_auth_requests"), {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        secret_hash: { type: DataTypes.STRING(64), allowNull: false },
        nonce_hash: { type: DataTypes.STRING(64), allowNull: false },
        role: { type: DataTypes.STRING(32), allowNull: false },
        purpose: { type: DataTypes.STRING(16), allowNull: false },
        expires_at: { type: DataTypes.DATE, allowNull: false },
        consumed_at: { type: DataTypes.DATE, allowNull: true },
      }, options);
      await qi.addIndex(table("google_auth_requests"), ["expires_at"], { ...options, name: "google_request_expiry" });
    };
    if (qi.googleOAuth026Transaction) await apply(qi.googleOAuth026Transaction);
    else await qi.sequelize.transaction(apply);
  },
  async down() { throw new Error("Identity rollback requires an approved backup/archive plan; automatic deletion is disabled"); },
};
