import { registerStudent } from "../api/auth.api.js";
import { setButtonLoading, showToast } from "../ui/feedback.js";

const registerForm = document.getElementById("registerForm");

const regStudentId = document.getElementById("regStudentId");
const regFirstName = document.getElementById("regFirstName");
const regLastName = document.getElementById("regLastName");
const regEmail = document.getElementById("regEmail");
const regPassword = document.getElementById("regPassword");
const regConfirm = document.getElementById("regConfirm");

const toggleRegPassword = document.getElementById("toggleRegPassword");
const toggleRegConfirm = document.getElementById("toggleRegConfirm");

const registerMessage = document.getElementById("registerMessage");
const registerSubmitBtn = document.getElementById("registerSubmitBtn");
let isSubmitting = false;

function setRegisterMessage(message, type = "") {
  registerMessage.textContent = message;
  registerMessage.className = "register-message";
  registerMessage.setAttribute("role", type === "error" ? "alert" : "status");

  if (type) {
    registerMessage.classList.add(type);
  }
}

function togglePassword(input, button) {
  const isPassword = input.type === "password";

  input.type = isPassword ? "text" : "password";
  button.setAttribute("aria-pressed", String(isPassword));

  button.innerHTML = isPassword
    ? '<i class="fa-solid fa-eye-slash"></i>'
    : '<i class="fa-solid fa-eye"></i>';
}

toggleRegPassword.addEventListener("click", () => {
  togglePassword(regPassword, toggleRegPassword);
});

toggleRegConfirm.addEventListener("click", () => {
  togglePassword(regConfirm, toggleRegConfirm);
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  const studentId = regStudentId.value.trim();
  const firstName = regFirstName.value.trim();
  const lastName = regLastName.value.trim();
  const email = regEmail.value.trim().toLowerCase();
  const password = regPassword.value;
  const confirmPassword = regConfirm.value;

  setRegisterMessage("");

  if (
    !studentId ||
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    setRegisterMessage("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
    return;
  }

  if (password !== confirmPassword) {
    setRegisterMessage("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน", "error");
    return;
  }

  if (password.length < 8) {
    setRegisterMessage("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร", "error");
    return;
  }

  if (!email.endsWith("@email.kmutnb.ac.th")) {
    setRegisterMessage("กรุณาใช้อีเมลมหาวิทยาลัย @email.kmutnb.ac.th", "error");
    return;
  }

  registerSubmitBtn.disabled = true;
  isSubmitting = true;
  registerForm.setAttribute("aria-busy", "true");

  registerSubmitBtn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    <span>กำลังสมัครสมาชิก...</span>
  `;

  setButtonLoading(registerSubmitBtn, true, "กำลังสมัครสมาชิก...", "สมัครสมาชิก");

  try {
    const result = await registerStudent({
      student_id: studentId,
      first_name: firstName,
      last_name: lastName,
      email,
      password,
    });

    setRegisterMessage(result.message || "สมัครสมาชิกสำเร็จ", "success");
    showToast(result.message || "สมัครสมาชิกสำเร็จ", "success", { duration: 1800 });

    registerForm.reset();

    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1500);
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    showToast(error.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก", "error");

    setRegisterMessage(error.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก", "error");
  } finally {
    isSubmitting = false;
    registerForm.setAttribute("aria-busy", "false");
    setButtonLoading(registerSubmitBtn, false, "กำลังสมัครสมาชิก...", "สมัครสมาชิก");
    registerSubmitBtn.disabled = false;

    registerSubmitBtn.innerHTML = `
      <i class="fa-solid fa-user-plus"></i>
      <span>สมัครสมาชิก</span>
    `;
  }
});
