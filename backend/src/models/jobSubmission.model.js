const { DataTypes, Model } = require("sequelize");

const VERIFICATION_STATUSES = [
  "pending_email_verification",
  "verified",
  "expired",
  "cancelled",
];

module.exports = (sequelize) => {
  class JobSubmission extends Model {
    static associate(models) {
      JobSubmission.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "company",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
      JobSubmission.hasMany(models.JobPosting, {
        foreignKey: "submission_id",
        as: "jobPostings",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
      JobSubmission.hasMany(models.CompanyAccessToken, {
        foreignKey: "job_submission_id",
        as: "verificationTokens",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
    }
  }

  JobSubmission.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: { type: DataTypes.UUID, allowNull: false },
      submitted_email: {
        type: DataTypes.STRING(254),
        allowNull: false,
        validate: { isEmail: true, len: [3, 254] },
      },
      normalized_submitted_email: {
        type: DataTypes.STRING(254),
        allowNull: false,
        validate: { isEmail: true, len: [3, 254] },
      },
      verification_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "pending_email_verification",
        validate: { isIn: [VERIFICATION_STATUSES] },
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      verified_at: { type: DataTypes.DATE, allowNull: true },
      expired_at: { type: DataTypes.DATE, allowNull: true },
      cancelled_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "JobSubmission",
      tableName: "job_submissions",
      underscored: true,
      timestamps: true,
    },
  );

  return JobSubmission;
};
