const { DataTypes, Model, literal } = require('sequelize');
const bcrypt = require('bcrypt');
const policy = require('../services/superAdmin.policy');
module.exports = sequelize => {
  class SuperAdmin extends Model {
    comparePassword(value) { return typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72 && this.password_hash ? bcrypt.compare(value, this.password_hash) : Promise.resolve(false); }
    toJSON() { return policy.safeAdmin(this); }
  }
  SuperAdmin.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    email: { type: DataTypes.STRING(254), allowNull: true, unique: true, validate: { isEmail: true, len: [3, 254] }, set(value) { this.setDataValue('email', typeof value === 'string' ? value.trim().toLowerCase() : value); } },
    first_name: { type: DataTypes.STRING(100), allowNull: true, validate: { notEmpty: true, len: [1, 100] } },
    last_name: { type: DataTypes.STRING(100), allowNull: true, validate: { notEmpty: true, len: [1, 100] } },
    password_hash: { type: DataTypes.STRING(255), allowNull: true },
    teacher_id: { type: DataTypes.UUID, allowNull: true, unique: true, references: { model: 'teachers', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    credential_stamp: { type: DataTypes.STRING(64), allowNull: true },
    password: { type: DataTypes.VIRTUAL, validate: { strong(value) { if (value !== undefined) policy.strongPassword(value); } } },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], validate: { allowlist(value) { policy.permissions(value); } } },
    session_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false, defaultValue: literal('now()') },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', allowNull: false, defaultValue: literal('now()') },
  }, { sequelize, modelName: 'SuperAdmin', tableName: 'super_admins', timestamps: true, underscored: true,
    validate: { identity() {
      if (this.teacher_id) {
        if (this.password || this.password_hash || this.email || this.first_name || this.last_name || !/^[0-9a-f]{64}$/.test(this.credential_stamp || '')) throw Error('Teacher grants cannot store duplicate credentials or profile');
      } else if (!this.email || !this.first_name || !this.last_name || !this.password_hash || this.credential_stamp) throw Error('Invalid legacy admin identity');
    } },
    hooks: { async beforeValidate(row) { if (row.password) { if (row.teacher_id) throw Error('Membership has no separate password'); policy.strongPassword(row.password); row.password_hash = await bcrypt.hash(row.password, 12); } } } });
  return SuperAdmin;
};
