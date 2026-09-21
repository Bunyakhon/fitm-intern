const { DataTypes, Model } = require("sequelize");

const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

module.exports = (sequelize) => {
  class Teacher extends Model {
    // ==============================
    // ตรวจสอบรหัสผ่าน
    // ==============================

    async comparePassword(plainPassword) {
      if (!this.password_hash) {
        return false;
      }

      return bcrypt.compare(plainPassword, this.password_hash);
    }

    // ==============================
    // ป้องกัน password_hash
    // ไม่ให้หลุดไปใน Response
    // ==============================

    toJSON() {
      const values = {
        ...this.get(),
      };

      delete values.password_hash;
      delete values.password;

      return values;
    }

    // ==============================
    // Associations
    // ==============================

    static associate(models) {
      // ==============================
      // นักศึกษาที่อาจารย์เป็น
      // "อาจารย์ที่ปรึกษา"
      // ==============================

      Teacher.hasMany(models.Student, {
        foreignKey: "advisor_teacher_id",

        as: "advisorStudents",

        onDelete: "SET NULL",

        onUpdate: "CASCADE",
      });

      // ==============================
      // นักศึกษาที่อาจารย์เป็น
      // "อาจารย์ที่ปรึกษาสหกิจศึกษา"
      // และเป็นอาจารย์นิเทศ
      // ==============================

      Teacher.hasMany(models.Student, {
        foreignKey: "coop_advisor_teacher_id",

        as: "coopAdvisorStudents",

        onDelete: "SET NULL",

        onUpdate: "CASCADE",
      });
    }
  }

  Teacher.init(
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
      // Email
      // อนุญาตให้ว่างได้
      // เพราะอาจารย์บางคนอาจยังไม่มีบัญชี Login
      // ==============================

      email: {
        type: DataTypes.STRING,

        allowNull: true,

        unique: {
          msg: "อีเมลอาจารย์นี้มีอยู่ในระบบแล้ว",
        },

        validate: {
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
      // Password Hash
      // อนุญาตให้ว่างได้
      // ==============================

      password_hash: {
        type: DataTypes.STRING,

        allowNull: true,
      },

      // ==============================
      // Password
      // ไม่เก็บลง Database
      // ใช้เฉพาะตอนสร้างบัญชี Login
      // ==============================

      password: {
        type: DataTypes.VIRTUAL,

        allowNull: true,

        validate: {
          len: {
            args: [8, 100],

            msg: "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร",
          },
        },
      },

      // ==============================
      // คำนำหน้าทางวิชาการ
      // เช่น
      // ผศ.
      // ผศ.ดร.
      // รศ.ดร.
      // ดร.
      // อ.ดร.
      // ==============================

      academic_title: {
        type: DataTypes.STRING,

        allowNull: true,
      },

      // ==============================
      // ชื่อ
      // ==============================

      first_name: {
        type: DataTypes.STRING,

        allowNull: false,

        validate: {
          notEmpty: {
            msg: "กรุณากรอกชื่ออาจารย์",
          },
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
            msg: "กรุณากรอกนามสกุลอาจารย์",
          },
        },
      },

      // ==============================
      // ภาควิชา
      // ==============================

      department: {
        type: DataTypes.STRING,

        allowNull: true,
      },

      // ==============================
      // สาขา
      // ==============================

      major: {
        type: DataTypes.STRING,

        allowNull: true,
      },

      // ==============================
      // ตำแหน่ง
      // เช่น
      // อาจารย์
      // หัวหน้าภาควิชา
      // ==============================

      position: {
        type: DataTypes.STRING,

        allowNull: true,
      },

      // ==============================
      // สถานะ
      // ==============================

      status: {
        type: DataTypes.ENUM("active", "inactive"),

        allowNull: false,

        defaultValue: "active",
      },
    },
    {
      sequelize,

      modelName: "Teacher",

      tableName: "teachers",

      underscored: true,

      timestamps: true,

      hooks: {
        // ==============================
        // Hash password
        // เฉพาะเมื่อมีการกรอก password
        // ==============================

        beforeValidate: async (teacher) => {
          if (teacher.password) {
            teacher.password_hash = await bcrypt.hash(
              teacher.password,

              SALT_ROUNDS,
            );
          }
        },
      },
    },
  );

  return Teacher;
};
