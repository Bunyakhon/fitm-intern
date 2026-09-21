const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class StudentFile extends Model {
    static associate(models) {
      StudentFile.belongsTo(models.Student, {
        foreignKey: "student_id",
        as: "student",
        onDelete: "CASCADE",
      });
    }
  }

  StudentFile.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      student_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "students", key: "id" },
      },
      file_type: {
        type: DataTypes.ENUM(
          "coop_poster",
          "coop_project_book",
          "coop_practice_log_book",
          "resume",
        ),
        allowNull: false,
      },
      original_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      storage_path: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      mime_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      file_size: {
        type: DataTypes.BIGINT,
        allowNull: false,
        validate: { min: 0 },
      },
    },
    {
      sequelize,
      modelName: "StudentFile",
      tableName: "student_files",
      underscored: true,
      timestamps: true,
      indexes: [
        {
          name: "student_files_one_resume_per_student",
          unique: true,
          fields: ["student_id"],
          where: { file_type: "resume" },
        },
      ],
    },
  );

  return StudentFile;
};
