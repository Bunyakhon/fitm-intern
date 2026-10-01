const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    const existingTables = await queryInterface.showAllTables();
    const hasTable = (tableName) =>
      existingTables.some(
        (table) =>
          (typeof table === "string" ? table : table.tableName) === tableName,
      );

    if (!hasTable("teachers")) {
      await queryInterface.createTable("teachers", {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        email: { type: DataTypes.STRING, allowNull: true, unique: true },
        password_hash: { type: DataTypes.STRING, allowNull: true },
        academic_title: { type: DataTypes.STRING, allowNull: true },
        first_name: { type: DataTypes.STRING, allowNull: false },
        last_name: { type: DataTypes.STRING, allowNull: false },
        department: { type: DataTypes.STRING, allowNull: true },
        major: { type: DataTypes.STRING, allowNull: true },
        position: { type: DataTypes.STRING, allowNull: true },
        status: {
          type: DataTypes.ENUM("active", "inactive"),
          allowNull: false,
          defaultValue: "active",
        },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
      });
    }

    if (!hasTable("students")) {
      await queryInterface.createTable("students", {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        student_id: { type: DataTypes.STRING, allowNull: false, unique: true },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        password_hash: { type: DataTypes.STRING, allowNull: false },
        first_name: { type: DataTypes.STRING, allowNull: false },
        last_name: { type: DataTypes.STRING, allowNull: false },
        major: { type: DataTypes.STRING, allowNull: true },
        year_level: { type: DataTypes.INTEGER, allowNull: true },
        gpa: { type: DataTypes.DECIMAL(3, 2), allowNull: true },
        profile_image: { type: DataTypes.STRING, allowNull: true },
        track: {
          type: DataTypes.ENUM("internship", "co_op"),
          allowNull: false,
          defaultValue: "co_op",
        },
        status: {
          type: DataTypes.ENUM("pending", "searching", "placed", "in_progress", "completed"),
          allowNull: false,
          defaultValue: "pending",
        },
        advisor_teacher_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "teachers", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        coop_advisor_teacher_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "teachers", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
      });
    }

    if (!hasTable("student_profiles")) {
      await queryInterface.createTable("student_profiles", {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        student_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          references: { model: "students", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        prefix: { type: DataTypes.STRING, allowNull: true },
        birth_date: { type: DataTypes.DATEONLY, allowNull: true },
        height_cm: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
        weight_kg: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
        nationality: { type: DataTypes.STRING, allowNull: true },
        ethnicity: { type: DataTypes.STRING, allowNull: true },
        religion: { type: DataTypes.STRING, allowNull: true },
        blood_type: { type: DataTypes.STRING, allowNull: true },
        medical_conditions: { type: DataTypes.TEXT, allowNull: true },
        allergies: { type: DataTypes.TEXT, allowNull: true },
        special_abilities: { type: DataTypes.TEXT, allowNull: true },
        related_skills: { type: DataTypes.TEXT, allowNull: true },
        hometown_address: { type: DataTypes.TEXT, allowNull: true },
        hometown_phone: { type: DataTypes.STRING, allowNull: true },
        current_address: { type: DataTypes.TEXT, allowNull: true },
        current_phone: { type: DataTypes.STRING, allowNull: true },
        father_name: { type: DataTypes.STRING, allowNull: true },
        father_age: { type: DataTypes.INTEGER, allowNull: true },
        father_occupation: { type: DataTypes.STRING, allowNull: true },
        mother_name: { type: DataTypes.STRING, allowNull: true },
        mother_age: { type: DataTypes.INTEGER, allowNull: true },
        mother_occupation: { type: DataTypes.STRING, allowNull: true },
        parent_contact_address: { type: DataTypes.TEXT, allowNull: true },
        parent_phone: { type: DataTypes.STRING, allowNull: true },
        emergency_contact_name: { type: DataTypes.STRING, allowNull: true },
        emergency_contact_relation: { type: DataTypes.STRING, allowNull: true },
        emergency_contact_address: { type: DataTypes.TEXT, allowNull: true },
        emergency_contact_phone: { type: DataTypes.STRING, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
      });
    }

    if (!hasTable("student_files")) {
      await queryInterface.createTable("student_files", {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        student_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "students", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        file_type: {
          type: DataTypes.ENUM("coop_poster", "coop_project_book", "coop_practice_log_book", "resume"),
          allowNull: false,
        },
        original_name: { type: DataTypes.STRING, allowNull: false },
        storage_path: { type: DataTypes.STRING, allowNull: false, unique: true },
        mime_type: { type: DataTypes.STRING, allowNull: false },
        file_size: { type: DataTypes.BIGINT, allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
      });
      await queryInterface.addIndex("student_files", ["student_id"], {
        name: "student_files_one_resume_per_student",
        unique: true,
        where: { file_type: "resume" },
      });
    }

    if (!hasTable("mentors")) {
      await queryInterface.createTable("mentors", {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        student_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          references: { model: "students", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        email: { type: DataTypes.STRING, allowNull: false },
        first_name: { type: DataTypes.STRING, allowNull: false },
        last_name: { type: DataTypes.STRING, allowNull: false },
        position: { type: DataTypes.STRING, allowNull: false },
        status: {
          type: DataTypes.ENUM("pending", "verified"),
          allowNull: false,
          defaultValue: "pending",
        },
        verified_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
      });
    }

    if (!hasTable("mentor_tokens")) {
      await queryInterface.createTable("mentor_tokens", {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        mentor_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "mentors", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        token_hash: { type: DataTypes.STRING, allowNull: false, unique: true },
        expires_at: { type: DataTypes.DATE, allowNull: false },
        used_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
      });
    }

    if (!hasTable("coop_requests")) {
      await queryInterface.createTable("coop_requests", {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        student_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "students", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        company_name: { type: DataTypes.STRING(255), allowNull: false },
        company_province: { type: DataTypes.STRING(100), allowNull: false },
        letter_recipient_name: { type: DataTypes.STRING(255), allowNull: false },
        letter_recipient_position_department: { type: DataTypes.STRING(255), allowNull: true },
        company_address: { type: DataTypes.TEXT, allowNull: false },
        work_start_date: { type: DataTypes.DATEONLY, allowNull: false },
        work_end_date: { type: DataTypes.DATEONLY, allowNull: false },
        status: {
          type: DataTypes.ENUM("submitted", "staff_review", "advisor_review", "department_head_review", "approved", "document_issued", "in_progress", "rejected", "cancelled"),
          allowNull: false,
          defaultValue: "submitted",
        },
        submitted_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        cancelled_at: { type: DataTypes.DATE, allowNull: true },
        document_issued_at: { type: DataTypes.DATE, allowNull: true },
        started_at: { type: DataTypes.DATE, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
      });
    }

    if (!hasTable("coop_request_delivery_methods")) {
      await queryInterface.createTable("coop_request_delivery_methods", {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        coop_request_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "coop_requests", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        method: { type: DataTypes.ENUM("self_submit", "postal", "email"), allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
      });
      await queryInterface.addIndex(
        "coop_request_delivery_methods",
        ["coop_request_id", "method"],
        { unique: true },
      );
    }
  },

  async down() {
    // Base tables may predate this migration, so rollback must preserve data.
  },
};
