const { DataTypes, Model, literal } = require('sequelize');
module.exports = sequelize => {
  class AdminAccountControl extends Model {}
  AdminAccountControl.init({
    actor_type: { type: DataTypes.STRING(32), primaryKey: true, validate: { isIn: [['student', 'teacher', 'department_staff', 'super_admin']] } },
    actor_id: { type: DataTypes.UUID, primaryKey: true },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    revoked_before: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false, defaultValue: literal('now()') },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false, defaultValue: literal('now()') },
  }, { sequelize, modelName: 'AdminAccountControl', tableName: 'admin_account_controls', underscored: true, timestamps: true });
  return AdminAccountControl;
};
