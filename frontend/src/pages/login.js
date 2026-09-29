import { loginStudent } from "../api/auth.api.js";
import { setButtonLoading, showToast } from "../ui/feedback.js";

console.log("KIWI login page loaded");

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const togglePassword = document.getElementById("togglePassword");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const loginMessage = document.getElementById("loginMessage");
const capsLockNotice = document.getElementById("capsLockNotice");

const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');
let isSubmitting = false;

function setLoginMessage(message, type = "") {
  loginMessage.textContent = message;
  loginMessage.className = "login-message";
  loginMessage.setAttribute("role", type === "error" ? "alert" : "status");

  if (type) {
    loginMessage.classList.add(type);
  }
}

// ==============================
// แสดง / ซ่อนรหัสผ่าน
// ==============================

togglePassword.addEventListener("click", () => {
  const isPassword = loginPassword.type === "password";

  loginPassword.type = isPassword ? "text" : "password";
  togglePassword.setAttribute("aria-pressed", String(isPassword));

  togglePassword.innerHTML = isPassword
    ? '<i class="fa-solid fa-eye-slash"></i>'
    : '<i class="fa-solid fa-eye"></i>';
});

loginPassword.addEventListener("keyup", (event) => {
  capsLockNotice.hidden = !event.getModifierState?.("CapsLock");
});

loginPassword.addEventListener("blur", () => {
  capsLockNotice.hidden = true;
});

// ==============================
// Login Form
// ==============================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value;

  setLoginMessage("");

  if (!email || !password) {
    setLoginMessage("กรุณากรอกอีเมลและรหัสผ่าน", "error");
    return;
  }

  // ปิดปุ่มชั่วคราว ป้องกันกดซ้ำ
  loginSubmitBtn.disabled = true;
  isSubmitting = true;
  loginForm.setAttribute("aria-busy", "true");

  loginSubmitBtn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    <span>กำลังเข้าสู่ระบบ...</span>
  `;

  setButtonLoading(loginSubmitBtn, true, "กำลังเข้าสู่ระบบ...", "เข้าสู่ระบบ");

  try {
    const result = await loginStudent({
      email,
      password,
    });

    // ต้องมี token จาก Backend
    if (!result.token) {
      throw new Error("ไม่พบ Token จากระบบ");
    }

    // ==============================
    // เก็บ JWT
    // ==============================

    localStorage.setItem("token", result.token);

    // ==============================
    // เก็บข้อมูล Student
    // ==============================

    localStorage.setItem(
      "student",
      JSON.stringify(result.data)
    );

    setLoginMessage(result.message || "เข้าสู่ระบบสำเร็จ", "success");

    showToast(result.message || "เข้าสู่ระบบสำเร็จ", "success", { duration: 1400 });

    // ไปหน้าแรก
    setTimeout(() => {
      window.location.href = "/src/student_coop/student_coop.html";
    }, 1000);
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    showToast(error.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ", "error");

    setLoginMessage(error.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ", "error");
  } finally {
    isSubmitting = false;
    loginForm.setAttribute("aria-busy", "false");
    setButtonLoading(loginSubmitBtn, false, "กำลังเข้าสู่ระบบ...", "เข้าสู่ระบบ");
    loginSubmitBtn.disabled = false;

    loginSubmitBtn.innerHTML = `
      <i class="fa-solid fa-right-to-bracket"></i>
      <span>เข้าสู่ระบบ</span>
    `;
  }
});

// ==============================
// Google Login
// ==============================

googleLoginBtn.addEventListener("click", () => {
  setLoginMessage("Google Login จะเชื่อมต่อ Google OAuth ภายหลัง");
});
