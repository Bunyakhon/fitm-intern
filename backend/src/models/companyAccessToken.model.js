const { DataTypes, Model } = require("sequelize");

const TOKEN_PURPOSES = ["email_verification", "management_access"];

module.exports = (sequelize) => {
  class CompanyAccessToken extends Model {
    toJSON() {
      const values = { ...this.get() };
      delete values.token_hash;
      return values;
    }

    static associate(models) {
      CompanyAccessToken.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "company",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
      CompanyAccessToken.belongsTo(models.JobSubmission, {
        foreignKey: "job_submission_id",
        as: "jobSubmission",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
    }
  }

  CompanyAccessToken.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: { type: DataTypes.UUID, allowNull: false },
      job_submission_id: { type: DataTypes.UUID, allowNull: true },
      purpose: {
        type: DataTypes.STRING(32),
        allowNull: false,
        validate: { isIn: [TOKEN_PURPOSES] },
      },
      token_hash: {
        type: DataTypes.CHAR(64),
        allowNull: false,
        validate: { is: /^[a-f0-9]{64}$/i },
      },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      used_at: { type: DataTypes.DATE, allowNull: true },
      revoked_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "CompanyAccessToken",
      tableName: "company_access_tokens",
      underscored: true,
      timestamps: true,
    },
  );

  return CompanyAccessToken;
};
