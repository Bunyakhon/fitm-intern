const {
  Mentor,
} = require("../models");

// ==============================
// Helper
// ตรวจข้อมูลพี่เลี้ยง
// ==============================

const validateMentorInput = ({
  email,
  first_name,
  last_name,
  position,
}) => {
  if (
    !email ||
    !first_name ||
    !last_name ||
    !position
  ) {
    return "กรุณากรอกข้อมูลพี่เลี้ยงให้ครบถ้วน";
  }

  return null;
};

// ==============================
// GET Mentor
// ของนักศึกษาที่ Login อยู่
//
// GET /api/mentors/me
// ==============================

exports.getMyMentor = async (req, res) => {
  try {
    const studentId = req.user.id;

    const mentor = await Mentor.findOne({
      where: {
        student_id: studentId,
      },
    });

    // การยังไม่มีพี่เลี้ยง
    // ถือเป็นสถานะปกติของหน้า
    if (!mentor) {
      return res.status(200).json({
        success: true,
        message: "ยังไม่มีข้อมูลพี่เลี้ยง",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "ดึงข้อมูลพี่เลี้ยงสำเร็จ",
      data: mentor,
    });
  } catch (error) {
    console.error(
      "GET MENTOR ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "เกิดข้อผิดพลาดในการดึงข้อมูลพี่เลี้ยง",
    });
  }
};

// ==============================
// CREATE Mentor
//
// POST /api/mentors
// ==============================

exports.createMentor = async (req, res) => {
  try {
    const studentId = req.user.id;

    const {
      email,
      first_name,
      last_name,
      position,
    } = req.body;

    // ==============================
    // ตรวจข้อมูล
    // ==============================

    const validationError =
      validateMentorInput({
        email,
        first_name,
        last_name,
        position,
      });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // ==============================
    // นักศึกษา 1 คน
    // มีพี่เลี้ยงได้ 1 คน
    // ==============================

    const existingMentor =
      await Mentor.findOne({
        where: {
          student_id: studentId,
        },
      });

    if (existingMentor) {
      return res.status(409).json({
        success: false,
        message:
          "นักศึกษาคนนี้มีข้อมูลพี่เลี้ยงแล้ว",
      });
    }

    // ==============================
    // สร้างข้อมูลพี่เลี้ยง
    // เริ่มต้นเป็น pending
    // ==============================

    const mentor =
      await Mentor.create({
        student_id: studentId,

        email:
          email
            .toLowerCase()
            .trim(),

        first_name:
          first_name.trim(),

        last_name:
          last_name.trim(),

        position:
          position.trim(),

        status: "pending",

        verified_at: null,
      });

    return res.status(201).json({
      success: true,
      message:
        "เพิ่มข้อมูลพี่เลี้ยงสำเร็จ",
      data: mentor,
    });
  } catch (error) {
    console.error(
      "CREATE MENTOR ERROR:",
      error,
    );

    // ==============================
    // Sequelize Validation
    // ==============================

    if (
      error.name ===
      "SequelizeValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          error.errors?.[0]?.message ||
          "ข้อมูลพี่เลี้ยงไม่ถูกต้อง",
      });
    }

    // ==============================
    // Unique Constraint
    // ==============================

    if (
      error.name ===
      "SequelizeUniqueConstraintError"
    ) {
      return res.status(409).json({
        success: false,
        message:
          error.errors?.[0]?.message ||
          "ข้อมูลพี่เลี้ยงนี้มีอยู่แล้ว",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "เกิดข้อผิดพลาดในการเพิ่มข้อมูลพี่เลี้ยง",
    });
  }
};

// ==============================
// UPDATE Mentor
//
// PUT /api/mentors/me
// ==============================

exports.updateMyMentor = async (
  req,
  res,
) => {
  try {
    const studentId = req.user.id;

    const {
      email,
      first_name,
      last_name,
      position,
    } = req.body;

    // ==============================
    // ตรวจข้อมูล
    // ==============================

    const validationError =
      validateMentorInput({
        email,
        first_name,
        last_name,
        position,
      });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // ==============================
    // หา Mentor ของ Student
    // ==============================

    const mentor =
      await Mentor.findOne({
        where: {
          student_id: studentId,
        },
      });

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message:
          "ไม่พบข้อมูลพี่เลี้ยง",
      });
    }

    // ==============================
    // Update
    //
    // เมื่อข้อมูลถูกแก้
    // ต้องกลับไปรอยืนยันใหม่
    // ==============================

    mentor.email =
      email
        .toLowerCase()
        .trim();

    mentor.first_name =
      first_name.trim();

    mentor.last_name =
      last_name.trim();

    mentor.position =
      position.trim();

    mentor.status = "pending";

    mentor.verified_at = null;

    await mentor.save();

    return res.status(200).json({
      success: true,
      message:
        "แก้ไขข้อมูลพี่เลี้ยงสำเร็จ",
      data: mentor,
    });
  } catch (error) {
    console.error(
      "UPDATE MENTOR ERROR:",
      error,
    );

    if (
      error.name ===
      "SequelizeValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          error.errors?.[0]?.message ||
          "ข้อมูลพี่เลี้ยงไม่ถูกต้อง",
      });
    }

    if (
      error.name ===
      "SequelizeUniqueConstraintError"
    ) {
      return res.status(409).json({
        success: false,
        message:
          error.errors?.[0]?.message ||
          "ข้อมูลนี้มีอยู่ในระบบแล้ว",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "เกิดข้อผิดพลาดในการแก้ไขข้อมูลพี่เลี้ยง",
    });
  }
};

// ==============================
// DELETE Mentor
//
// DELETE /api/mentors/me
// ==============================

exports.deleteMyMentor = async (
  req,
  res,
) => {
  try {
    const studentId = req.user.id;

    const mentor =
      await Mentor.findOne({
        where: {
          student_id: studentId,
        },
      });

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message:
          "ไม่พบข้อมูลพี่เลี้ยง",
      });
    }

    await mentor.destroy();

    return res.status(200).json({
      success: true,
      message:
        "ลบข้อมูลพี่เลี้ยงสำเร็จ",
    });
  } catch (error) {
    console.error(
      "DELETE MENTOR ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "เกิดข้อผิดพลาดในการลบข้อมูลพี่เลี้ยง",
    });
  }
};