const {
  MentorToken,
  Mentor,
  Student,
} = require("../models");

const {
  hashVerificationToken,
  createMentorVerificationToken,
  withMentorVerification,
} = require("../services/mentorToken.service");
const { authorizeActor } = require("../services/unifiedAuth.service");

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
          "student_id",
          "email",
          "first_name",
          "last_name",
          "position",
          "status",
          "verified_at",
        ],
        include: [
          {
            model: Student,
            as: "student",
            attributes: [
              "first_name",
              "last_name",
            ],
          },
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

  const student = await Student.findByPk(verification.mentor.student_id, {
    attributes: ["id", "track", "status"], transaction: options.transaction,
  });
  authorizeActor(student, "student");

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
        // student_id is loaded only for eligibility; retain the public response fields.
        mentor: Object.fromEntries(["id", "email", "first_name", "last_name", "position", "status", "verified_at", "student"].map(key => [key, verification.mentor[key]])),
        expires_at: verification.expires_at,
      },
    });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ success: false, message: error.message });
    console.error(
      "Verify mentor token error:",
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
 * บันทึกและหมุน Token ใน Transaction เดียวกัน; Token เก่ายืนยันข้อมูลฉบับใหม่ไม่ได้
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

    const saved = await withMentorVerification(token, async ({ mentor, verification, transaction }) => {
      await mentor.update({
        email: cleanEmail,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        position: cleanPosition,

        // ยังไม่ถือว่ายืนยัน
        status: "pending",
        verified_at: null,
      }, { transaction });
      const rotated = await createMentorVerificationToken(mentor.id, { transaction, expiresAt: verification.expires_at });
      return { mentor, verification_token: rotated.token, expires_at: rotated.record.expires_at };
    });

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      success: true,
      message:
        "แก้ไขข้อมูลพี่เลี้ยงสำเร็จ",
      data: {
        ...saved,
      },
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error(
      "Update mentor verification profile error:",
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
  try {
    const mentor = await withMentorVerification(req.body?.token, async ({ mentor, verification, transaction }) => {
      const now = new Date();
      await mentor.update({ status: "verified", verified_at: now }, { transaction });
      await verification.update({ used_at: now }, { transaction });
      return mentor;
    });
    return res.status(200).json({ success: true, message: "ยืนยันข้อมูลพี่เลี้ยงสำเร็จ", data: {
      mentor: Object.fromEntries(["id", "email", "first_name", "last_name", "position", "status", "verified_at"].map(key => [key, mentor[key]])),
    } });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error("Confirm mentor error");
    return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการยืนยันข้อมูลพี่เลี้ยง" });
  }
}

module.exports = {
  verifyMentorToken,
  updateMentorProfile,
  confirmMentor,
};
