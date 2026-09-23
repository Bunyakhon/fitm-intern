const nodemailer = require("nodemailer");

const MENTOR_PAGE_PATH = "/src/mentor_coop/mentor.html";
const EMAIL_SUBJECT = "ยืนยันข้อมูลพี่เลี้ยงนักศึกษาสหกิจศึกษา";

function getRequiredSmtpConfig() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    SMTP_FROM_NAME,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error(
      "SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.",
    );
  }

  const port = Number(SMTP_PORT);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid positive number.");
  }

  return {
    transporter: {
      host: SMTP_HOST,
      port,
      secure: SMTP_SECURE === "true",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    },
    from: SMTP_FROM,
    fromName: SMTP_FROM_NAME || "FITM Internship System",
  };
}

function createTransporter() {
  const { transporter } = getRequiredSmtpConfig();
  return nodemailer.createTransport(transporter);
}

async function verifyEmailConnection() {
  const transporter = createTransporter();
  return transporter.verify();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildVerificationUrl(token) {
  const frontendUrl = process.env.FRONTEND_URL;

  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is required to send a verification email.");
  }

  return `${frontendUrl.replace(/\/$/, "")}${MENTOR_PAGE_PATH}?token=${encodeURIComponent(token)}`;
}

async function sendMentorVerificationEmail({ to, firstName, lastName, token }) {
  if (!to || !token) {
    throw new Error("Recipient email and verification token are required.");
  }

  const verificationUrl = buildVerificationUrl(token);
  const mentorName = [firstName, lastName].filter(Boolean).join(" ") || "พี่เลี้ยง";
  const safeMentorName = escapeHtml(mentorName);
  const safeVerificationUrl = escapeHtml(verificationUrl);

  const text = `เรียน ${mentorName}

นักศึกษาได้ระบุข้อมูลของท่านเป็นพี่เลี้ยงสหกิจศึกษา กรุณาตรวจสอบ แก้ไข และยืนยันข้อมูลผ่านลิงก์ด้านล่าง

${verificationUrl}

ลิงก์นี้มีอายุจำกัดและใช้สำหรับการยืนยันข้อมูลเท่านั้น

FITM Internship System`;

  const html = `
    <p>เรียน ${safeMentorName}</p>
    <p>นักศึกษาได้ระบุข้อมูลของท่านเป็นพี่เลี้ยงสหกิจศึกษา กรุณาตรวจสอบ แก้ไข และยืนยันข้อมูล</p>
    <p><a href="${safeVerificationUrl}">ตรวจสอบและยืนยันข้อมูล</a></p>
    <p>ลิงก์นี้มีอายุจำกัดและใช้สำหรับการยืนยันข้อมูลเท่านั้น</p>
    <p>FITM Internship System</p>
  `;

  const { from, fromName } = getRequiredSmtpConfig();
  const transporter = createTransporter();

  return transporter.sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject: EMAIL_SUBJECT,
    text,
    html,
  });
}

module.exports = {
  verifyEmailConnection,
  sendMentorVerificationEmail,
};
