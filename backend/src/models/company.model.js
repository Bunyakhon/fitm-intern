const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class Company extends Model {
    static associate(models) {
      Company.hasMany(models.JobSubmission, {
        foreignKey: "company_id",
        as: "jobSubmissions",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
      Company.hasMany(models.CoopRequest, { foreignKey: "company_id", as: "coopRequests", onDelete: "SET NULL", onUpdate: "CASCADE" });
      Company.hasMany(models.JobPosting, {
        foreignKey: "company_id",
        as: "jobPostings",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
      Company.hasMany(models.CompanyAccessToken, {
        foreignKey: "company_id",
        as: "accessTokens",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      });
    }
  }

  Company.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true, len: [2, 255] },
      },
      normalized_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true, len: [2, 255] },
      },
      email: {
        type: DataTypes.STRING(254),
        allowNull: false,
        validate: { isEmail: true, len: [3, 254] },
        set(value) {
          this.setDataValue(
            "email",
            value ? value.toLowerCase().trim() : value,
          );
        },
      },
      normalized_email: {
        type: DataTypes.STRING(254),
        allowNull: false,
        validate: { isEmail: true, len: [3, 254] },
      },
      phone: {
        type: DataTypes.STRING(32),
        allowNull: false,
        validate: { notEmpty: true, len: [7, 32] },
      },
      address_no: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 50] },
      },
      moo: {
        type: DataTypes.STRING(30),
        allowNull: true,
        validate: { len: [1, 30] },
      },
      subdistrict: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 100] },
      },
      district: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 100] },
      },
      province: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 100] },
      },
      email_verified_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "Company",
      tableName: "companies",
      underscored: true,
      timestamps: true,
    },
  );

  return Company;
};
