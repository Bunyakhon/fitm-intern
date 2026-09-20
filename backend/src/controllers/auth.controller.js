const jwt = require("jsonwebtoken");
const { Student } = require("../models");

// ==============================
// Register Student
// ==============================

exports.registerStudent = async (req, res) => {
  try {
    const {
      student_id,
      first_name,
      last_name,
      email,
      password,
    } = req.body;

    // ตรวจข้อมูลที่จำเป็น
    if (
      !student_id ||
      !first_name ||
      !last_name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลให้ครบถ้วน",
      });
    }

    // ตรวจอีเมลซ้ำ
    const existingEmail = await Student.findOne({
      where: {
        email: email.toLowerCase().trim(),
      },
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "อีเมลนี้ถูกใช้สมัครไปแล้ว",
      });
    }

    // ตรวจรหัสนักศึกษาซ้ำ
    const existingStudentId = await Student.findOne({
      where: {
        student_id: student_id.trim(),
      },
    });

    if (existingStudentId) {
      return res.status(409).json({
        success: false,
        message: "รหัสประจำตัวนักศึกษานี้มีอยู่ในระบบแล้ว",
      });
    }

    // สร้างนักศึกษาสหกิจ
    const student = await Student.create({
      student_id: student_id.trim(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.toLowerCase().trim(),
      password,

      track: "co_op",
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "สมัครสมาชิกสำเร็จ",
      data: student,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    // Sequelize validation
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message:
          error.errors?.[0]?.message ||
          "ข้อมูลสมัครสมาชิกไม่ถูกต้อง",
      });
    }

    // Sequelize unique
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message:
          error.errors?.[0]?.message ||
          "ข้อมูลนี้มีอยู่ในระบบแล้ว",
      });
    }

    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดภายในระบบ",
    });
  }
};

// ==============================
// Login Student
// ==============================

exports.loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ตรวจข้อมูล
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกอีเมลและรหัสผ่าน",
      });
    }

    // หา student จาก email
    const student = await Student.findOne({
      where: {
        email: email.toLowerCase().trim(),
      },
    });

    // ถ้าไม่พบ email
    if (!student) {
      return res.status(401).json({
        success: false,
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    // ตรวจ password
    const isPasswordCorrect =
      await student.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    // สร้าง JWT
    const token = jwt.sign(
      {
        id: student.id,
        student_id: student.student_id,
        email: student.email,
        track: student.track,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    // Login สำเร็จ
    return res.status(200).json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      data: student,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดภายในระบบ",
    });
  }
};
exports.getCurrentStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.user.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลผู้ใช้งาน",
      });
    }

    return res.status(200).json({
      success: true,
      message: "ดึงข้อมูลผู้ใช้งานสำเร็จ",
      data: student,
    });
  } catch (error) {
    console.error("GET CURRENT STUDENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดภายในระบบ",
    });
  }
};