const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class MentorToken extends Model {
    // ==============================
    // ป้องกัน token_hash
    // ไม่ให้หลุดไปใน Response
    // ==============================

    toJSON() {
      const values = {
        ...this.get(),
      };

      delete values.token_hash;

      return values;
    }

    // ==============================
    // Associations
    // ==============================

    static associate(models) {
      // ==============================
      // Token เป็นของพี่เลี้ยง
      // ==============================

      MentorToken.belongsTo(models.Mentor, {
        foreignKey: "mentor_id",
        as: "mentor",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  MentorToken.init(
    {
      // ==============================
      // Primary Key
      // ==============================

      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // ==============================
      // Mentor Foreign Key
      // ==============================

      mentor_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ==============================
      // Token Hash
      //
      // ห้ามเก็บ Token จริง
      // ลง Database
      // ==============================

      token_hash: {
        type: DataTypes.STRING,
        allowNull: false,

        unique: {
          msg: "Token นี้มีอยู่ในระบบแล้ว",
        },
      },

      // ==============================
      // วันหมดอายุของ Token
      // ==============================

      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      // ==============================
      // เวลาที่ Token ถูกใช้งานแล้ว
      //
      // NULL
      // = ยังไม่ถูกใช้
      //
      // มีค่า
      // = ยืนยันข้อมูลแล้ว
      // ==============================

      used_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
    },

    {
      sequelize,

      modelName: "MentorToken",

      tableName: "mentor_tokens",

      underscored: true,

      timestamps: true,
    },
  );

  return MentorToken;
};