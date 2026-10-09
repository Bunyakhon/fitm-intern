const nodemailer = require("nodemailer");

const MENTOR_PAGE_PATH = "/src/mentor_coop/mentor_verify_user.html";
const EMAIL_SUBJECT = "ยืนยันข้อมูลพี่เลี้ยงนักศึกษาสหกิจศึกษา";
const COMPANY_VERIFICATION_PAGE_PATH =
  "/src/recruit_student/recruit_verify_email.html";
const COMPANY_VERIFICATION_SUBJECT =
  "ยืนยันอีเมลสำหรับประกาศรับนักศึกษาสหกิจศึกษา";

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
  const mentorName =
    [firstName, lastName].filter(Boolean).join(" ") || "พี่เลี้ยง";
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

function buildCompanyVerificationUrl(token) {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new Error(
      "FRONTEND_URL is required to send a company verification email.",
    );
  }
  const base = new URL(frontendUrl);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error("FRONTEND_URL must be an HTTP(S) URL without credentials or query parameters");
  }
  const url = new URL(COMPANY_VERIFICATION_PAGE_PATH, base);
  url.searchParams.set("token", token);
  return url.toString();
}

async function sendCompanyVerificationEmail({ to, companyName, token }) {
  if (!to || !token) {
    throw new Error("Recipient email and verification token are required.");
  }
  const verificationUrl = buildCompanyVerificationUrl(token);
  const safeCompanyName = escapeHtml(companyName || "สถานประกอบการ");
  const safeVerificationUrl = escapeHtml(verificationUrl);
  const text = `เรียน ${companyName || "สถานประกอบการ"}

กรุณายืนยันอีเมลสำหรับประกาศรับนักศึกษาสหกิจศึกษาผ่านลิงก์นี้:
${verificationUrl}

ลิงก์มีอายุจำกัดและใช้ได้เพียงครั้งเดียว
FITM Internship System`;
  const html = `
    <p>เรียน ${safeCompanyName}</p>
    <p>กรุณายืนยันอีเมลสำหรับประกาศรับนักศึกษาสหกิจศึกษาผ่านลิงก์ด้านล่าง</p>
    <p><a href="${safeVerificationUrl}">ยืนยันอีเมล</a></p>
    <p>ลิงก์มีอายุจำกัดและใช้ได้เพียงครั้งเดียว</p>
    <p>FITM Internship System</p>
  `;
  const { from, fromName } = getRequiredSmtpConfig();
  const transporter = createTransporter();
  return transporter.sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject: COMPANY_VERIFICATION_SUBJECT,
    text,
    html,
  });
}

async function sendMentorReviewEmail({ to, token }) {
  const base = new URL(process.env.FRONTEND_URL);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error("Invalid frontend URL");
  const url = new URL(MENTOR_PAGE_PATH, base);
  url.hash = new URLSearchParams({ review_token: token }).toString();
  const { from, fromName } = getRequiredSmtpConfig();
  return createTransporter().sendMail({ from: `"${fromName}" <${from}>`, to, subject: "ตรวจบันทึกฝึกงานประจำสัปดาห์", text: `บันทึกประจำสัปดาห์พร้อมตรวจ โปรดเก็บลิงก์นี้เป็นความลับ ลิงก์มีอายุ 7 วัน\n${url}` });
}

async function sendSupervisionEmail({ to, token }) {
  const base = new URL(process.env.FRONTEND_URL);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw Error("Invalid frontend URL");
  const url = new URL(MENTOR_PAGE_PATH, base);
  url.hash = new URLSearchParams({ appointment_token: token }).toString();
  const { from, fromName } = getRequiredSmtpConfig();
  return createTransporter().sendMail({ from: `"${fromName}" <${from}>`, to, subject: "ตรวจสอบข้อมูลและยืนยันนัดนิเทศสหกิจศึกษา", text: `กรุณาตรวจสอบข้อมูลส่วนบุคคลและนัดนิเทศก่อนยืนยัน ลิงก์ใช้ได้เฉพาะนัดฉบับนี้ มีอายุไม่เกิน 7 วันหรือเวลานัด และใช้ยืนยันได้ครั้งเดียว หากข้อมูลไม่ถูกต้องกรุณาติดต่ออาจารย์ โปรดเก็บลิงก์เป็นความลับ\n${url}` });
}

module.exports = {
  sendSupervisionEmail,
  sendMentorReviewEmail,
  buildCompanyVerificationUrl,
  verifyEmailConnection,
  sendCompanyVerificationEmail,
  sendMentorVerificationEmail,
};
