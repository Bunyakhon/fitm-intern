const { DataTypes } = require("sequelize");
module.exports = sequelize => sequelize.define("GoogleAuthRequest", {
  id: { type: DataTypes.UUID, primaryKey: true },
  secret_hash: { type: DataTypes.STRING(64), allowNull: false },
  nonce_hash: { type: DataTypes.STRING(64), allowNull: false },
  role: { type: DataTypes.STRING(32), allowNull: false },
  purpose: { type: DataTypes.STRING(16), allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  consumed_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "google_auth_requests", underscored: true, timestamps: false });
