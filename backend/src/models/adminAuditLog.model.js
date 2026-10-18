const { DataTypes, Model, literal } = require('sequelize');
module.exports = sequelize => {
  class AdminAuditLog extends Model {}
  AdminAuditLog.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    actor_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'super_admins', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    action: { type: DataTypes.STRING(80), allowNull: false },
    target_type: { type: DataTypes.STRING(40), allowNull: false },
    target_id: { type: DataTypes.STRING(100), allowNull: false },
    changes: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false, defaultValue: literal('now()') },
  }, { sequelize, modelName: 'AdminAuditLog', tableName: 'admin_audit_logs', timestamps: true, updatedAt: false, underscored: true,
    indexes: [{ name: 'admin_audit_logs_created_at_id', fields: ['created_at', 'id'] }] });
  return AdminAuditLog;
};
