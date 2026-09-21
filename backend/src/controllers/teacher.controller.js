const { Teacher } = require("../models");

// ==============================
// GET /api/teachers
// ดึงรายชื่ออาจารย์ทั้งหมด
// ==============================

const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.findAll({
      attributes: [
        "id",
        "academic_title",
        "first_name",
        "last_name",
        "email",
        "department",
        "major",
        "position",
        "status",
      ],

      where: {
        status: "active",
      },

      order: [
        ["first_name", "ASC"],
        ["last_name", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      teachers,
    });
  } catch (error) {
    console.error(
      "GET TEACHERS ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "ไม่สามารถโหลดข้อมูลอาจารย์ได้",
    });
  }
};

module.exports = {
  getTeachers,
};