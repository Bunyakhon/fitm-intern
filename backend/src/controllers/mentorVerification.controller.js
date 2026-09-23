const {
  MentorToken,
  Mentor,
  sequelize,
} = require("../models");

const {
  hashVerificationToken,
} = require("../services/mentorToken.service");

/**
 * ค้นหา Verification Token ที่ยังใช้งานได้
 *
 * - hash plaintext token
 * - token ต้องมีจริง
 * - used_at ต้องเป็น null
 * - expires_at ต้องยังไม่หมดอายุ
 * - ต้องมี Mentor
 */
async function findValidVerification(token, options = {}) {
  if (
    !token ||
    typeof token !== "string" ||
    !token.trim()
  ) {
    return {
      error: {
        status: 400,
        message: "ไม่พบ Verification Token",
      },
    };
  }

  const tokenHash = hashVerificationToken(token.trim());

  const verification = await MentorToken.findOne({
    where: {
      token_hash: tokenHash,
    },
    include: [
      {
        model: Mentor,
        as: "mentor",
        attributes: [
          "id",
          "email",
          "first_name",
          "last_name",
          "position",
          "status",
          "verified_at",
        ],
      },
    ],
    transaction: options.transaction,
    lock: options.lock,
  });

  if (!verification) {
    return {
      error: {
        status: 404,
        message: "Verification Token ไม่ถูกต้อง",
      },
    };
  }

  if (verification.used_at) {
    return {
      error: {
        status: 410,
        message:
          "Verification Token นี้ถูกใช้งานแล้วหรือถูกยกเลิก",
      },
    };
  }

  if (
    new Date(verification.expires_at) <=
    new Date()
  ) {
    return {
      error: {
        status: 410,
        message: "Verification Token หมดอายุแล้ว",
      },
    };
  }

  if (!verification.mentor) {
    return {
      error: {
        status: 404,
        message: "ไม่พบข้อมูลพี่เลี้ยง",
      },
    };
  }

  return {
    verification,
  };
}

/**
 * GET /api/mentor-verification/verify?token=...
 *
 * Public API
 * ไม่ใช้ JWT
 */
async function verifyMentorToken(req, res) {
  try {
    const { token } = req.query;

    const result =
      await findValidVerification(token);

    if (result.error) {
      return res
        .status(result.error.status)
        .json({
          success: false,
          message: result.error.message,
        });
    }

    const { verification } = result;

    return res.status(200).json({
      success: true,
      message: "Verification Token ถูกต้อง",
      data: {
        mentor: verification.mentor,
        expires_at: verification.expires_at,
      },
    });
  } catch (error) {
    console.error(
      "Verify mentor token error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "เกิดข้อผิดพลาดในการตรวจสอบ Verification Token",
    });
  }
}

/**
 * PUT /api/mentor-verification/profile
 *
 * Mentor แก้ไขข้อมูลของตัวเองผ่าน Verification Token
 *
 * Token ยังไม่ถูกใช้ทิ้งในขั้นตอนนี้
 */
async function updateMentorProfile(req, res) {
  try {
    const {
      token,
      email,
      first_name,
      last_name,
      position,
    } = req.body;

    const result =
      await findValidVerification(token);

    if (result.error) {
      return res
        .status(result.error.status)
        .json({
          success: false,
          message: result.error.message,
        });
    }

    const { verification } = result;

    const mentor = verification.mentor;

    const cleanEmail =
      typeof email === "string"
        ? email.trim()
        : "";

    const cleanFirstName =
      typeof first_name === "string"
        ? first_name.trim()
        : "";

    const cleanLastName =
      typeof last_name === "string"
        ? last_name.trim()
        : "";

    const cleanPosition =
      typeof position === "string"
        ? position.trim()
        : "";

    if (
      !cleanEmail ||
      !cleanFirstName ||
      !cleanLastName ||
      !cleanPosition
    ) {
      return res.status(400).json({
        success: false,
        message:
          "กรุณากรอก Email ชื่อ นามสกุล และตำแหน่งให้ครบ",
      });
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "รูปแบบ Email ไม่ถูกต้อง",
      });
    }

    await mentor.update({
      email: cleanEmail,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      position: cleanPosition,

      // ยังไม่ถือว่ายืนยัน
      status: "pending",
      verified_at: null,
    });

    return res.status(200).json({
      success: true,
      message:
        "แก้ไขข้อมูลพี่เลี้ยงสำเร็จ",
      data: {
        mentor,
      },
    });
  } catch (error) {
    console.error(
      "Update mentor verification profile error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "เกิดข้อผิดพลาดในการแก้ไขข้อมูลพี่เลี้ยง",
    });
  }
}

/**
 * POST /api/mentor-verification/confirm
 *
 * เมื่อ Mentor ยืนยันข้อมูล:
 *
 * mentors.status = verified
 * mentors.verified_at = NOW()
 * mentor_tokens.used_at = NOW()
 */
async function confirmMentor(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const { token } = req.body;

    if (
      !token ||
      typeof token !== "string" ||
      !token.trim()
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "ไม่พบ Verification Token",
      });
    }

    const tokenHash = hashVerificationToken(
      token.trim(),
    );

    /*
     * Lock เฉพาะ mentor_tokens
     *
     * ห้าม include Mentor ตรงนี้
     * เพราะ PostgreSQL ไม่อนุญาต FOR UPDATE
     * บน nullable side ของ LEFT OUTER JOIN
     */
    const verification = await MentorToken.findOne({
      where: {
        token_hash: tokenHash,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!verification) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Verification Token ไม่ถูกต้อง",
      });
    }

    if (verification.used_at) {
      await transaction.rollback();

      return res.status(410).json({
        success: false,
        message:
          "Verification Token นี้ถูกใช้งานแล้วหรือถูกยกเลิก",
      });
    }

    if (
      new Date(verification.expires_at) <=
      new Date()
    ) {
      await transaction.rollback();

      return res.status(410).json({
        success: false,
        message: "Verification Token หมดอายุแล้ว",
      });
    }

    /*
     * Query Mentor แยกจาก Token
     */
    const mentor = await Mentor.findByPk(
      verification.mentor_id,
      {
        transaction,
      },
    );

    if (!mentor) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลพี่เลี้ยง",
      });
    }

    const now = new Date();

    /*
     * Mentor ยืนยันข้อมูล
     */
    await mentor.update(
      {
        status: "verified",
        verified_at: now,
      },
      {
        transaction,
      },
    );

    /*
     * Token ถูกใช้แล้ว
     */
    await verification.update(
      {
        used_at: now,
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "ยืนยันข้อมูลพี่เลี้ยงสำเร็จ",
      data: {
        mentor: {
          id: mentor.id,
          email: mentor.email,
          first_name: mentor.first_name,
          last_name: mentor.last_name,
          position: mentor.position,
          status: "verified",
          verified_at: now,
        },
      },
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error(
      "Confirm mentor error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "เกิดข้อผิดพลาดในการยืนยันข้อมูลพี่เลี้ยง",
    });
  }
}

module.exports = {
  verifyMentorToken,
  updateMentorProfile,
  confirmMentor,
};