const { DataTypes, Model } = require('sequelize');
module.exports = sequelize => {
  class CompanyResponseHistory extends Model {
    static associate(m) {
      CompanyResponseHistory.belongsTo(m.CompanyResponse, { foreignKey: 'company_response_id', as: 'response', onDelete: 'RESTRICT' });
      CompanyResponseHistory.belongsTo(m.DepartmentStaff, { foreignKey: 'department_staff_id', as: 'staff', onDelete: 'RESTRICT' });
    }
  }
  CompanyResponseHistory.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    company_response_id: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false }, responded_at: { type: DataTypes.DATE, allowNull: false }, note: { type: DataTypes.TEXT },
    version: { type: DataTypes.INTEGER, allowNull: false }, department_staff_id: { type: DataTypes.UUID, allowNull: false },
    cooperation_document_id: { type: DataTypes.UUID, allowNull: false }, cooperation_version: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING(16), allowNull: false }, correction_reason: { type: DataTypes.TEXT },
  }, { sequelize, modelName: 'CompanyResponseHistory', tableName: 'company_response_history', underscored: true, timestamps: true, updatedAt: false });
  return CompanyResponseHistory;
};
