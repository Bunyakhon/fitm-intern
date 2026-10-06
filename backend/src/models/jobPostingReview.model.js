const { DataTypes, Model } = require("sequelize");
module.exports = (sequelize) => {
  class JobPostingReview extends Model {
    static associate(models) {
      JobPostingReview.belongsTo(models.JobPosting, {
        foreignKey: "job_posting_id",
        as: "jobPosting",
        onDelete: "RESTRICT",
      });
      JobPostingReview.belongsTo(models.DepartmentStaff, {
        foreignKey: "department_staff_id",
        as: "staff",
        onDelete: "RESTRICT",
      });
    }
  }
  JobPostingReview.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      job_posting_id: { type: DataTypes.UUID, allowNull: false },
      department_staff_id: { type: DataTypes.UUID, allowNull: false },
      from_status: { type: DataTypes.STRING(32), allowNull: false },
      to_status: { type: DataTypes.STRING(32), allowNull: false },
      decision: { type: DataTypes.STRING(16), allowNull: false },
      reason: { type: DataTypes.STRING(2000), allowNull: true },
    },
    {
      sequelize,
      modelName: "JobPostingReview",
      tableName: "job_posting_reviews",
      underscored: true,
      timestamps: true,
      updatedAt: false,
    },
  );
  return JobPostingReview;
};
