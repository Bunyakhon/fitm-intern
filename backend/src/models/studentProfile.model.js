const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class StudentProfile extends Model {
    static associate(models) {
      StudentProfile.belongsTo(models.Student, {
        foreignKey: 'student_id',
        as: 'student',
        onDelete: 'CASCADE',
      });
    }
  }

  StudentProfile.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      student_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true, // 1:1 กับ Student
        references: {
          model: 'students',
          key: 'id',
        },
      },

      prefix: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: {
            args: [["นาย", "นางสาว", "นาง"]],
            msg: "คำนำหน้าต้องเป็น นาย, นางสาว หรือ นาง",
          },
        },
      },

      // ข้อมูลส่วนตัว
      birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      height_cm: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      weight_kg: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      nationality: DataTypes.STRING,
      ethnicity: DataTypes.STRING,
      religion: DataTypes.STRING,
      blood_type: DataTypes.STRING,
      medical_conditions: DataTypes.TEXT, // โรคประจำตัว
      allergies: DataTypes.TEXT, // อาการแพ้
      special_abilities: DataTypes.TEXT, // ความสามารถพิเศษ
      related_skills: DataTypes.TEXT, // ความสามารถที่เกี่ยวข้องกับการฝึกงาน

      // ที่อยู่
      hometown_address: DataTypes.TEXT, // ภูมิลำเนา
      hometown_phone: DataTypes.STRING,
      current_address: DataTypes.TEXT, // ที่อยู่ปัจจุบันที่ติดต่อได้
      current_phone: DataTypes.STRING,

      // บิดา-มารดา
      father_name: DataTypes.STRING,
      father_age: DataTypes.INTEGER,
      father_occupation: DataTypes.STRING,
      mother_name: DataTypes.STRING,
      mother_age: DataTypes.INTEGER,
      mother_occupation: DataTypes.STRING,
      parent_contact_address: DataTypes.TEXT,
      parent_phone: DataTypes.STRING,

      // ผู้ติดต่อกรณีฉุกเฉิน
      emergency_contact_name: DataTypes.STRING,
      emergency_contact_relation: DataTypes.STRING, // เกี่ยวข้องเป็น
      emergency_contact_address: DataTypes.TEXT,
      emergency_contact_phone: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'StudentProfile',
      tableName: 'student_profiles',
      underscored: true,
      timestamps: true,
    }
  );

  return StudentProfile;
};
