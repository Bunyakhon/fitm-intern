const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const model = sequelize.define('CoopActivityHistory', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    activity_id: DataTypes.UUID, version: DataTypes.INTEGER, action: DataTypes.STRING(16),
    staff_id: DataTypes.UUID, actor_name: DataTypes.STRING(255), reason: DataTypes.TEXT, snapshot: DataTypes.JSONB,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName: 'coop_activity_history', underscored: true, timestamps: false });
  model.associate = m => {
    model.belongsTo(m.CoopActivity, { foreignKey: 'activity_id', onDelete: 'RESTRICT' });
    model.belongsTo(m.DepartmentStaff, { foreignKey: 'staff_id', onDelete: 'RESTRICT' });
  };
  return model;
};
