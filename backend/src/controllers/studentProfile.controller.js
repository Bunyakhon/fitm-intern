const { Student, StudentProfile } = require("../models");

// GET ข้อมูลประวัตินักศึกษาของผู้ที่ Login อยู่
const getStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;

    const student = await Student.findByPk(studentId, {
      attributes: [
        "id",
        "student_id",
        "first_name",
        "last_name",
        "email",
        "major",
        "year_level",
        "gpa",
        "track",
        "status",
      ],
      include: [
        {
          model: StudentProfile,
          as: "profile",
        },
      ],
    });

    if (!student) {
      return res.status(404).json({
        message: "ไม่พบข้อมูลนักศึกษา",
      });
    }

    return res.status(200).json({
      message: "ดึงข้อมูลประวัตินักศึกษาสำเร็จ",
      student,
    });
  } catch (error) {
    console.error("GET STUDENT PROFILE ERROR:", error);

    return res.status(500).json({
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลประวัตินักศึกษา",
    });
  }
};

// เพิ่มหรือแก้ไขข้อมูลประวัตินักศึกษาของผู้ที่ Login อยู่
const upsertStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;

    const student = await Student.findByPk(studentId);

    if (!student) {
      return res.status(404).json({
        message: "ไม่พบข้อมูลนักศึกษา",
      });
    }

    const allowedFields = [
      "birth_date",
      "height_cm",
      "weight_kg",
      "nationality",
      "ethnicity",
      "religion",
      "blood_type",
      "medical_conditions",
      "allergies",
      "special_abilities",
      "related_skills",

      "hometown_address",
      "hometown_phone",
      "current_address",
      "current_phone",

      "father_name",
      "father_age",
      "father_occupation",

      "mother_name",
      "mother_age",
      "mother_occupation",

      "parent_contact_address",
      "parent_phone",

      "emergency_contact_name",
      "emergency_contact_relation",
      "emergency_contact_address",
      "emergency_contact_phone",
    ];

    const profileData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        profileData[field] = req.body[field];
      }
    });

    let profile = await StudentProfile.findOne({
      where: {
        student_id: studentId,
      },
    });

    if (profile) {
      await profile.update(profileData);

      return res.status(200).json({
        message: "แก้ไขข้อมูลประวัตินักศึกษาสำเร็จ",
        profile,
      });
    }

    profile = await StudentProfile.create({
      student_id: studentId,
      ...profileData,
    });

    return res.status(201).json({
      message: "บันทึกข้อมูลประวัตินักศึกษาสำเร็จ",
      profile,
    });
  } catch (error) {
    console.error("UPSERT STUDENT PROFILE ERROR:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "ข้อมูลไม่ถูกต้อง",
        errors: error.errors.map((item) => item.message),
      });
    }

    return res.status(500).json({
      message: "เกิดข้อผิดพลาดในการบันทึกข้อมูลประวัตินักศึกษา",
    });
  }
};

module.exports = {
  getStudentProfile,
  upsertStudentProfile,
};