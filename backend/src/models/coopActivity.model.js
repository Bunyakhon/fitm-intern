const { DataTypes } = require('sequelize');
module.exports = sequelize => {
  const model = sequelize.define('CoopActivity', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    title: DataTypes.STRING(200), description: DataTypes.TEXT, category: DataTypes.STRING(32),
    starts_at: DataTypes.DATE, ends_at: DataTypes.DATE, timezone: DataTypes.STRING(32),
    location: DataTypes.STRING(500), meeting_url: DataTypes.STRING(1000), internal_notes: DataTypes.TEXT,
    status: DataTypes.STRING(16), published_at: DataTypes.DATE, version: DataTypes.INTEGER,
    created_by: DataTypes.UUID, updated_by: DataTypes.UUID,
    creation_key: DataTypes.UUID, creation_hash: DataTypes.CHAR(64), duplicate_key: DataTypes.CHAR(64),
  }, { tableName: 'coop_activities', underscored: true, timestamps: true });
  model.associate = m => {
    model.belongsTo(m.DepartmentStaff, { foreignKey: 'created_by', as: 'creator', onDelete: 'RESTRICT' });
    model.belongsTo(m.DepartmentStaff, { foreignKey: 'updated_by', as: 'updater', onDelete: 'RESTRICT' });
    model.hasMany(m.CoopActivityHistory, { foreignKey: 'activity_id', as: 'history', onDelete: 'RESTRICT' });
  };
  return model;
};
