import { verifyRecruitmentEmail } from "../api/recruitStudent.api.js";

const result = document.getElementById("verificationResult");
const icon = document.getElementById("verificationIcon");
const title = document.getElementById("verificationTitle");
const message = document.getElementById("verificationMessage");

const states = {
  loading: { icon: "fa-solid fa-spinner fa-spin", title: "กำลังตรวจสอบลิงก์ยืนยันอีเมล", message: "กรุณารอสักครู่ ระบบกำลังยืนยันอีเมลของสถานประกอบการ" },
  success: { icon: "fa-solid fa-circle-check", title: "ยืนยันอีเมลสำเร็จ", message: "ระบบได้รับการยืนยันอีเมลแล้ว ข้อมูลตำแหน่งงานของคุณถูกส่งเข้าสู่ขั้นตอนการตรวจสอบและยังไม่ได้เผยแพร่" },
  invalid: { icon: "fa-solid fa-link-slash", title: "ลิงก์ยืนยันไม่ถูกต้อง", message: "กรุณาตรวจสอบว่าคุณเปิดลิงก์ยืนยันจากอีเมลฉบับล่าสุดครบถ้วน" },
  expired: { icon: "fa-solid fa-clock", title: "ลิงก์ยืนยันหมดอายุ", message: "ลิงก์นี้หมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบเพื่อขอความช่วยเหลือ" },
  unavailable: { icon: "fa-solid fa-circle-exclamation", title: "ลิงก์นี้ไม่สามารถใช้งานได้", message: "ลิงก์อาจถูกใช้แล้ว ถูกยกเลิก หรือไม่อยู่ในสถานะที่ยืนยันได้ กรุณาตรวจสอบอีเมลฉบับล่าสุด" },
  error: { icon: "fa-solid fa-triangle-exclamation", title: "ไม่สามารถตรวจสอบอีเมลได้ในขณะนี้", message: "เกิดปัญหาในการเชื่อมต่อระบบ กรุณาลองเปิดลิงก์นี้ใหม่อีกครั้งภายหลัง" },
};

function showState(name) {
  const state = states[name];
  icon.innerHTML = `<i class="${state.icon}" aria-hidden="true"></i>`;
  icon.className = `recruit-verification-icon is-${name}`;
  title.textContent = state.title;
  message.textContent = state.message;
  result.setAttribute("aria-busy", String(name === "loading"));
  result.setAttribute("role", name === "loading" ? "status" : "alert");
}

function captureTokenFromUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");

  if (token) {
    url.searchParams.delete("token");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  return token;
}

function getFailureState(error) {
  if (error.status === 400 || error.status === 404) return "invalid";
  if (error.status === 410 && error.data?.message === "Verification token has expired") return "expired";
  if (error.status === 410) return "unavailable";
  return "error";
}

async function verifyEmail() {
  showState("loading");
  const token = captureTokenFromUrl();

  if (!token) {
    showState("invalid");
    return;
  }

  try {
    await verifyRecruitmentEmail(token);
    showState("success");
  } catch (error) {
    showState(getFailureState(error));
  }
}

verifyEmail();
