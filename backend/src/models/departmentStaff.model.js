const { DataTypes, Model } = require("sequelize");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

module.exports = (sequelize) => {
  class DepartmentStaff extends Model {
    async comparePassword(plainPassword) {
      if (!this.password_hash || typeof plainPassword !== "string") {
        return false;
      }

      return bcrypt.compare(plainPassword, this.password_hash);
    }

    toJSON() {
      const values = { ...this.get() };
      delete values.password_hash;
      delete values.password;
      return values;
    }
  }

  DepartmentStaff.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 100] },
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 100] },
      },
      email: {
        type: DataTypes.STRING(254),
        allowNull: false,
        unique: true,
        validate: { isEmail: true, len: [3, 254] },
        set(value) {
          this.setDataValue(
            "email",
            typeof value === "string" ? value.toLowerCase().trim() : value,
          );
        },
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: DataTypes.VIRTUAL,
        allowNull: true,
        validate: { len: [8, 100] },
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "DepartmentStaff",
      tableName: "department_staffs",
      underscored: true,
      timestamps: true,
      hooks: {
        beforeValidate: async (staff) => {
          if (staff.password) {
            staff.password_hash = await bcrypt.hash(staff.password, SALT_ROUNDS);
          }
        },
      },
    },
  );

  return DepartmentStaff;
};
