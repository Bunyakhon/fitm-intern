const { DataTypes, Model } = require("sequelize");

const JOB_STATUSES = [
  "pending_email_verification",
  "pending_review",
  "published",
  "rejected",
  "withdrawn",
  "expired",
];
const JOB_CATEGORIES = [
  "information_technology",
  "business",
  "design",
  "engineering",
  "other",
];

module.exports = (sequelize) => {
  class JobPosting extends Model {
    static associate(models) {
      JobPosting.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "company",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
      JobPosting.hasMany(models.CoopRequest, { foreignKey: "job_posting_id", as: "coopRequests", onDelete: "SET NULL", onUpdate: "CASCADE" });
      JobPosting.belongsTo(models.JobSubmission, {
        foreignKey: "submission_id",
        as: "submission",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
      JobPosting.hasMany(models.JobPostingWorkMode, {
        foreignKey: "job_posting_id",
        as: "workModes",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  JobPosting.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: { type: DataTypes.UUID, allowNull: false },
      submission_id: { type: DataTypes.UUID, allowNull: false },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true, len: [2, 255] },
      },
      category: {
        type: DataTypes.STRING(64),
        allowNull: false,
        validate: { isIn: [JOB_CATEGORIES] },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { notEmpty: true, len: [20, 20000] },
      },
      quota: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        validate: { min: 1, max: 9999 },
      },
      compensation_text: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 500] },
      },
      work_days_per_week: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        validate: { min: 1, max: 7 },
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "pending_email_verification",
        validate: { isIn: [JOB_STATUSES] },
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
      published_at: { type: DataTypes.DATE, allowNull: true },
      withdrawn_at: { type: DataTypes.DATE, allowNull: true },
      expires_at: { type: DataTypes.DATE, allowNull: true },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: { len: [1, 2000] },
      },
    },
    {
      sequelize,
      modelName: "JobPosting",
      tableName: "job_postings",
      underscored: true,
      timestamps: true,
    },
  );

  return JobPosting;
};
