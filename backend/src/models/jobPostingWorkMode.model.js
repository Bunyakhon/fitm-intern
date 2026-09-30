const { DataTypes, Model } = require("sequelize");

const WORK_MODES = ["onsite", "work_from_home", "hybrid"];

module.exports = (sequelize) => {
  class JobPostingWorkMode extends Model {
    static associate(models) {
      JobPostingWorkMode.belongsTo(models.JobPosting, {
        foreignKey: "job_posting_id",
        as: "jobPosting",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  JobPostingWorkMode.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      job_posting_id: { type: DataTypes.UUID, allowNull: false },
      mode: {
        type: DataTypes.STRING(32),
        allowNull: false,
        validate: { isIn: [WORK_MODES] },
      },
    },
    {
      sequelize,
      modelName: "JobPostingWorkMode",
      tableName: "job_posting_work_modes",
      underscored: true,
      timestamps: true,
    },
  );

  return JobPostingWorkMode;
};
