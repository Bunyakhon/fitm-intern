const { DataTypes } = require("sequelize");

module.exports = {
  async up({ context: queryInterface }) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("department_staffs")) {
      return;
    }

    await queryInterface.createTable("department_staffs", {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      first_name: { type: DataTypes.STRING(100), allowNull: false },
      last_name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING, allowNull: false },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
  },

  async down({ context: queryInterface }) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("department_staffs")) {
      await queryInterface.dropTable("department_staffs");
    }
  },
};
