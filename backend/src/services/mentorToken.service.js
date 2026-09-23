const crypto = require("crypto");

const {
  MentorToken,
  sequelize,
} = require("../models");

const TOKEN_EXPIRES_HOURS = 24;

/**
 * สร้าง Verification Token แบบสุ่ม
 *
 * Plaintext token ใช้เฉพาะสำหรับ Verification Link
 * ห้ามบันทึก plaintext token ลง PostgreSQL
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash Token ด้วย SHA-256
 *
 * @param {string} token
 * @returns {string}
 */
function hashVerificationToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Verification token is required");
  }

  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

/**
 * สร้าง Verification Token ใหม่ให้ Mentor
 *
 * ก่อนสร้าง Token ใหม่:
 * - Token เก่าที่ยังไม่ได้ใช้จะถูกทำให้ใช้ไม่ได้
 *
 * Database เก็บเฉพาะ token_hash
 *
 * @param {string} mentorId
 */
async function createMentorVerificationToken(
  mentorId,
  options = {},
) {
  if (!mentorId) {
    throw new Error("Mentor ID is required");
  }

  const ownsTransaction = !options.transaction;
  const transaction =
    options.transaction ||
    await sequelize.transaction();

  try {
    const now = new Date();

    // ปิด Token เก่าที่ยังไม่ได้ใช้
    await MentorToken.update(
      {
        used_at: now,
      },
      {
        where: {
          mentor_id: mentorId,
          used_at: null,
        },
        transaction,
      },
    );

    const token = generateVerificationToken();
    const tokenHash = hashVerificationToken(token);

    const expiresAt = new Date(
      Date.now() +
        TOKEN_EXPIRES_HOURS * 60 * 60 * 1000,
    );

    const record = await MentorToken.create(
      {
        mentor_id: mentorId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used_at: null,
      },
      {
        transaction,
      },
    );

    if (ownsTransaction) {
      await transaction.commit();
    }

    return {
      token,
      record,
    };
  } catch (error) {
    if (ownsTransaction && !transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
}

module.exports = {
  generateVerificationToken,
  hashVerificationToken,
  createMentorVerificationToken,
};
