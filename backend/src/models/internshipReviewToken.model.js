const { Model, DataTypes } = require("sequelize");
module.exports = sequelize => {
  class InternshipReviewToken extends Model {
    toJSON() { const values = { ...this.get() }; delete values.token_hash; return values; }
  }
  const uuid = { type: DataTypes.UUID, allowNull: false };
  const string = { type: DataTypes.TEXT, allowNull: false };
  const content = { type: DataTypes.TEXT, allowNull: false, defaultValue: "" };
  const integer = { type: DataTypes.INTEGER, allowNull: false };
  const timestamp = { type: DataTypes.DATE, allowNull: false };
  InternshipReviewToken.init({ id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, student_id: { ...uuid }, mentor_id: { ...uuid }, token_hash: { ...string }, verified_at: { ...timestamp }, expires_at: { ...timestamp }, revoked_at: { type: DataTypes.DATE } }, { sequelize, modelName: "InternshipReviewToken", tableName: "internship_review_tokens", underscored: true, timestamps: true });
  return InternshipReviewToken;
};
