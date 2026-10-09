const { DataTypes, Model } = require('sequelize');
module.exports = sequelize => {
  class CompanyResponse extends Model {
    static associate(m) {
      CompanyResponse.belongsTo(m.CoopRequest, { foreignKey: 'coop_request_id', as: 'request', onDelete: 'RESTRICT' });
      m.CoopRequest.hasOne(CompanyResponse, { foreignKey: 'coop_request_id', as: 'companyResponse', onDelete: 'RESTRICT' });
      CompanyResponse.belongsTo(m.DepartmentStaff, { foreignKey: 'department_staff_id', as: 'staff', onDelete: 'RESTRICT' });
      CompanyResponse.belongsTo(m.CoopDocument, { foreignKey: 'cooperation_document_id', as: 'cooperationDocument', onDelete: 'RESTRICT' });
      CompanyResponse.hasMany(m.CompanyResponseHistory, { foreignKey: 'company_response_id', as: 'history', onDelete: 'RESTRICT' });
    }
  }
  CompanyResponse.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    coop_request_id: { type: DataTypes.UUID, allowNull: false, unique: true },
    status: { type: DataTypes.STRING(16), allowNull: false }, responded_at: { type: DataTypes.DATE, allowNull: false },
    note: { type: DataTypes.TEXT }, version: { type: DataTypes.INTEGER, allowNull: false },
    department_staff_id: { type: DataTypes.UUID, allowNull: false }, cooperation_document_id: { type: DataTypes.UUID, allowNull: false },
    cooperation_version: { type: DataTypes.INTEGER, allowNull: false },
  }, { sequelize, modelName: 'CompanyResponse', tableName: 'company_responses', underscored: true, timestamps: true });
  return CompanyResponse;
};
