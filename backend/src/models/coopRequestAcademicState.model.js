const { DataTypes, Model } = require('sequelize');
module.exports = sequelize => {
  class CoopRequestAcademicState extends Model {
    static associate(m) { this.belongsTo(m.CoopRequest, { foreignKey: 'coop_request_id', as: 'request', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }); }
  }
  CoopRequestAcademicState.init({
    coop_request_id: { type: DataTypes.UUID, primaryKey: true },
    revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
  }, { sequelize, modelName: 'CoopRequestAcademicState', tableName: 'coop_request_academic_states', underscored: true, timestamps: true });
  return CoopRequestAcademicState;
};
