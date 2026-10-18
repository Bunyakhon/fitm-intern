const { DataTypes, Model, literal } = require('sequelize');
const { settingValue } = require('../services/superAdmin.policy');
module.exports = sequelize => {
  class SystemSetting extends Model {}
  SystemSetting.init({
    key: { type: DataTypes.STRING(80), primaryKey: true },
    value: { type: DataTypes.JSONB, allowNull: false, validate: { allowlist(value) { settingValue(this.key, value); } } },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    updated_by: { type: DataTypes.UUID, allowNull: false, references: { model: 'super_admins', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false, defaultValue: literal('now()') },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false, defaultValue: literal('now()') },
  }, { sequelize, modelName: 'SystemSetting', tableName: 'system_settings', timestamps: true, underscored: true });
  return SystemSetting;
};
