const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable("companies", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      name: { type: DataTypes.STRING(255), allowNull: false },
      normalized_name: { type: DataTypes.STRING(255), allowNull: false },
      email: { type: DataTypes.STRING(254), allowNull: false },
      normalized_email: { type: DataTypes.STRING(254), allowNull: false },
      phone: { type: DataTypes.STRING(32), allowNull: false },
      address_no: { type: DataTypes.STRING(50), allowNull: false },
      moo: { type: DataTypes.STRING(30), allowNull: true },
      subdistrict: { type: DataTypes.STRING(100), allowNull: false },
      district: { type: DataTypes.STRING(100), allowNull: false },
      province: { type: DataTypes.STRING(100), allowNull: false },
      email_verified_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
  },
  async down({ context: queryInterface }) {
    await queryInterface.dropTable("companies");
  },
};
