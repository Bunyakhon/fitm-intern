const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;
const ALLOWED_EMAIL_DOMAIN = '@email.kmutnb.ac.th';

module.exports = (sequelize) => {
  class Student extends Model {
    // เปรียบเทียบ password ตอน login
    async comparePassword(plainPassword) {
      return bcrypt.compare(plainPassword, this.password_hash);
    }

    // toJSON ตัด field ที่ไม่ควรหลุดออกไป response เสมอ (กัน dev ลืม exclude)
    toJSON() {
      const values = { ...this.get() };
      delete values.password_hash;
      return values;
    }

    static associate(models) {
      Student.hasOne(models.StudentProfile, {
        foreignKey: 'student_id',
        as: 'profile',
        onDelete: 'CASCADE',
      });

      // เผื่ออนาคต: advisor, applications, dailyLogs, evaluations
      // Student.belongsTo(models.Advisor, { foreignKey: 'advisor_id', as: 'advisor' });
      // Student.hasMany(models.Application, { foreignKey: 'student_id', as: 'applications' });
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
        unique: { msg: 'รหัสประจำตัวนักศึกษานี้มีอยู่ในระบบแล้ว' },
        validate: {
          notEmpty: { msg: 'กรุณากรอกรหัสประจำตัวนักศึกษา' },
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: { msg: 'อีเมลนี้ถูกใช้สมัครไปแล้ว' },
        validate: {
          isEmail: { msg: 'รูปแบบอีเมลไม่ถูกต้อง' },
          isKmutnbEmail(value) {
            if (!value || !value.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
              throw new Error(`ต้องใช้อีเมล ${ALLOWED_EMAIL_DOMAIN} เท่านั้น`);
            }
          },
        },
        set(value) {
          // normalize ก่อนเก็บ กัน case-sensitivity ตอนเช็ค unique/login
          this.setDataValue('email', value ? value.toLowerCase().trim() : value);
        },
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // virtual field: ใช้ตอนสร้าง/แก้ไข student ด้วย plain password เท่านั้น
      // ไม่ถูกเก็บลง DB จริง — hook ด้านล่างจะ hash แล้วยัดเข้า password_hash ให้
      password: {
        type: DataTypes.VIRTUAL,
        validate: {
          len: {
            args: [8, 100],
            msg: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร',
          },
        },
      },
      first_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      major: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      year_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 8,
        },
      },
      gpa: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 4,
        },
      },
      track: {
        type: DataTypes.ENUM('internship', 'co_op'),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          'pending',
          'searching',
          'placed',
          'in_progress',
          'completed'
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    {
      sequelize,
      modelName: 'Student',
      tableName: 'students',
      underscored: true,
      timestamps: true, // created_at, updated_at
      hooks: {
        // hash password จาก virtual field 'password' แล้วเก็บลง password_hash
        beforeCreate: async (student) => {
          if (student.password) {
            student.password_hash = await bcrypt.hash(student.password, SALT_ROUNDS);
          }
        },
        beforeUpdate: async (student) => {
          if (student.password) {
            student.password_hash = await bcrypt.hash(student.password, SALT_ROUNDS);
          }
        },
      },
    }
  );

  return Student;
};