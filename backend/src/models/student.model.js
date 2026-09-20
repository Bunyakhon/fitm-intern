const { DataTypes, Model } = require("sequelize");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;
const ALLOWED_EMAIL_DOMAIN = "@email.kmutnb.ac.th";

module.exports = (sequelize) => {
  class Student extends Model {
    // ใช้ตรวจรหัสผ่านตอน Login ภายหลัง
    async comparePassword(plainPassword) {
      return bcrypt.compare(plainPassword, this.password_hash);
    }

    // ไม่ให้ password_hash หลุดออกไปใน Response
    toJSON() {
      const values = { ...this.get() };

      delete values.password_hash;
      delete values.password;

      return values;
    }

    static associate(models) {
      Student.hasOne(models.StudentProfile, {
        foreignKey: "student_id",
        as: "profile",
        onDelete: "CASCADE",
      });
    }
  }

  Student.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      student_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "รหัสประจำตัวนักศึกษานี้มีอยู่ในระบบแล้ว",
        },
        validate: {
          notEmpty: {
            msg: "กรุณากรอกรหัสประจำตัวนักศึกษา",
          },
        },
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: "อีเมลนี้ถูกใช้สมัครไปแล้ว",
        },
        validate: {
          notEmpty: {
            msg: "กรุณากรอกอีเมล",
          },

          isEmail: {
            msg: "รูปแบบอีเมลไม่ถูกต้อง",
          },

          isKmutnbEmail(value) {
            if (!value || !value.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
              throw new Error(`ต้องใช้อีเมล ${ALLOWED_EMAIL_DOMAIN} เท่านั้น`);
            }
          },
        },

        set(value) {
          this.setDataValue(
            "email",
            value ? value.toLowerCase().trim() : value,
          );
        },
      },

      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      // ไม่เก็บลง Database
      // รับ plain password ชั่วคราวแล้วนำไป hash
      password: {
        type: DataTypes.VIRTUAL,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "กรุณากรอกรหัสผ่าน",
          },

          len: {
            args: [8, 100],
            msg: "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร",
          },
        },
      },

      first_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "กรุณากรอกชื่อ",
          },
        },
      },

      last_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "กรุณากรอกนามสกุล",
          },
        },
      },

      major: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      year_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: {
            args: [1],
            msg: "ชั้นปีต้องไม่น้อยกว่า 1",
          },

          max: {
            args: [8],
            msg: "ชั้นปีต้องไม่เกิน 8",
          },
        },
      },

      gpa: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: {
          min: {
            args: [0],
            msg: "GPA ต้องไม่น้อยกว่า 0",
          },

          max: {
            args: [4],
            msg: "GPA ต้องไม่เกิน 4",
          },
        },
      },

      track: {
        type: DataTypes.ENUM("internship", "co_op"),
        allowNull: false,
        defaultValue: "co_op",
      },

      status: {
        type: DataTypes.ENUM(
          "pending",
          "searching",
          "placed",
          "in_progress",
          "completed",
        ),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      sequelize,
      modelName: "Student",
      tableName: "students",

      underscored: true,
      timestamps: true,

      hooks: {
        // ใช้ beforeValidate เพราะ password_hash เป็น allowNull: false
        beforeValidate: async (student) => {
          if (student.password) {
            student.password_hash = await bcrypt.hash(
              student.password,
              SALT_ROUNDS,
            );
          }
        },
      },
    },
  );

  return Student;
};
