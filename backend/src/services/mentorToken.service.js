const crypto = require("crypto");

const {
  MentorToken,
  Mentor,
  Student,
  sequelize,
} = require("../models");
const { authorizeActor } = require("./unifiedAuth.service");

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
    // Every writer locks Mentor before any token row, including resend/rotation.
    const mentor = await Mentor.findByPk(mentorId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!mentor) throw Object.assign(new Error("ไม่พบข้อมูลพี่เลี้ยง"), { status: 404 });
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

    const expiresAt = options.expiresAt || new Date(
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

async function withMentorVerification(token, action) {
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  if (typeof token !== "string" || !token.trim()) fail(400, "ไม่พบ Verification Token");
  const tokenHash = hashVerificationToken(token.trim());
  // This lookup only locates the parent. Recheck the capability after acquiring locks.
  const candidate = await MentorToken.findOne({ where: { token_hash: tokenHash }, attributes: ["id", "mentor_id"] });
  if (!candidate) fail(404, "Verification Token ไม่ถูกต้อง");
  return sequelize.transaction(async transaction => {
    const mentor = await Mentor.findByPk(candidate.mentor_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!mentor) fail(404, "ไม่พบข้อมูลพี่เลี้ยง");
    // No outer join under FOR UPDATE (PostgreSQL rejects locking its nullable side).
    const verification = await MentorToken.findOne({ where: { id: candidate.id, mentor_id: mentor.id, token_hash: tokenHash }, transaction, lock: transaction.LOCK.UPDATE });
    if (!verification) fail(404, "Verification Token ไม่ถูกต้อง");
    if (verification.used_at) fail(410, "Verification Token นี้ถูกใช้งานแล้วหรือถูกยกเลิก");
    const expiry = new Date(verification.expires_at).getTime();
    if (!Number.isFinite(expiry) || expiry <= Date.now()) fail(410, "Verification Token หมดอายุแล้ว");
    // Keep the Mentor -> token lock order; eligibility comes from the live owner.
    const student = await Student.findByPk(mentor.student_id, { attributes: ["id", "track", "status"], transaction });
    authorizeActor(student, "student");
    return action({ mentor, verification, transaction });
  });
}

module.exports = {
  generateVerificationToken,
  hashVerificationToken,
  createMentorVerificationToken,
  withMentorVerification,
};
