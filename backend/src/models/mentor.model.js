const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class Mentor extends Model {
    // ==============================
    // Associations
    // ==============================

    static associate(models) {
      // ==============================
      // พี่เลี้ยงเป็นของนักศึกษา 1 คน
      // ==============================

      Mentor.belongsTo(models.Student, {
        foreignKey: "student_id",
        as: "student",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // ==============================
      // Token สำหรับยืนยันข้อมูล
      // พี่เลี้ยง 1 คน
      // สามารถมี Token หลายรายการได้
      // เช่น กรณีส่ง Email ยืนยันใหม่
      // ==============================

      Mentor.hasMany(models.MentorToken, {
        foreignKey: "mentor_id",
        as: "verificationTokens",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  Mentor.init(
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
      // Student Foreign Key
      // นักศึกษา 1 คนมีพี่เลี้ยง 1 คน
      // ==============================

      student_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: {
          msg: "นักศึกษาคนนี้มีข้อมูลพี่เลี้ยงแล้ว",
        },
      },

      // ==============================
      // Email
      // ใช้สำหรับส่ง Link ยืนยันข้อมูล
      // ==============================

      email: {
        type: DataTypes.STRING,
        allowNull: false,

        validate: {
          notEmpty: {
            msg: "กรุณากรอกอีเมลพี่เลี้ยง",
          },

          isEmail: {
            msg: "รูปแบบอีเมลไม่ถูกต้อง",
          },
        },

        set(value) {
          this.setDataValue(
            "email",
            value ? value.toLowerCase().trim() : null,
          );
        },
      },

      // ==============================
      // ชื่อ
      // ==============================

      first_name: {
        type: DataTypes.STRING,
        allowNull: false,

        validate: {
          notEmpty: {
            msg: "กรุณากรอกชื่อพี่เลี้ยง",
          },
        },

        set(value) {
          this.setDataValue(
            "first_name",
            value ? value.trim() : null,
          );
        },
      },

      // ==============================
      // นามสกุล
      // ==============================

      last_name: {
        type: DataTypes.STRING,
        allowNull: false,

        validate: {
          notEmpty: {
            msg: "กรุณากรอกนามสกุลพี่เลี้ยง",
          },
        },

        set(value) {
          this.setDataValue(
            "last_name",
            value ? value.trim() : null,
          );
        },
      },

      // ==============================
      // ตำแหน่ง
      // ==============================

      position: {
        type: DataTypes.STRING,
        allowNull: false,

        validate: {
          notEmpty: {
            msg: "กรุณากรอกตำแหน่งพี่เลี้ยง",
          },
        },

        set(value) {
          this.setDataValue(
            "position",
            value ? value.trim() : null,
          );
        },
      },

      // ==============================
      // สถานะการยืนยันข้อมูล
      //
      // pending
      // = รอยืนยันข้อมูล
      //
      // verified
      // = ยืนยันข้อมูลแล้ว
      // ==============================

      status: {
        type: DataTypes.ENUM(
          "pending",
          "verified",
        ),

        allowNull: false,

        defaultValue: "pending",
      },

      // ==============================
      // วันที่ / เวลาที่ยืนยันข้อมูล
      //
      // ก่อนยืนยัน = NULL
      // หลังยืนยัน = เวลาที่กดยืนยัน
      // ==============================

      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
    },

    {
      sequelize,

      modelName: "Mentor",

      tableName: "mentors",

      underscored: true,

      timestamps: true,
    },
  );

  return Mentor;
};