import { registerStudent } from "../api/auth.api.js";
import { setButtonLoading, showToast } from "../ui/feedback.js";
import { acceptLoginSession } from "../auth/loginSession.js";
import { MAX_PERSON_NAME_LENGTH, isThaiPersonName } from "../validators/personName.js";

const registerForm = document.getElementById("registerForm");

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

  const firstName = regFirstName.value.trim();
  const lastName = regLastName.value.trim();
  const email = regEmail.value.trim().toLowerCase();
  const password = regPassword.value;
  const confirmPassword = regConfirm.value;

  setRegisterMessage("");

  for (const [name, label] of [[firstName, "ชื่อ"], [lastName, "นามสกุล"]]) {
    if (!isThaiPersonName(name)) {
      const message = [...name].length > MAX_PERSON_NAME_LENGTH
        ? `${label}ต้องมีความยาวไม่เกิน ${MAX_PERSON_NAME_LENGTH} อักขระ`
        : `กรุณากรอก${label}เป็นภาษาไทยเท่านั้น`;
      setRegisterMessage(message, "error");
      return;
    }
  }

  if (
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

  if (!password.trim() || new TextEncoder().encode(password).length > 72) {
    setRegisterMessage("รหัสผ่านต้องไม่เป็นช่องว่างล้วน และมีขนาดไม่เกิน 72 ไบต์", "error");
    return;
  }

  if (email.length > 254) {
    setRegisterMessage("ข้อมูลสมัครสมาชิกยาวเกินกำหนด", "error");
    return;
  }

  if (!/^s[0-9]{13}@email\.kmutnb\.ac\.th$/.test(email)) {
    setRegisterMessage("กรุณาใช้อีเมล s ตามด้วยรหัสนักศึกษา 13 หลัก @email.kmutnb.ac.th", "error");
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

  let registered = false;
  try {
    const result = await registerStudent({
      first_name: firstName,
      last_name: lastName,
      email,
      password,
    });

    const destination = acceptLoginSession(result, { remember: false });
    registered = true;
    setRegisterMessage(result.message || "สมัครสมาชิกสำเร็จ", "success");
    showToast(result.message || "สมัครสมาชิกสำเร็จ", "success", { duration: 1800 });

    registerForm.reset();

    setTimeout(() => {
      window.location.replace(destination);
    }, 1500);
  } catch (error) {
    console.error("REGISTER ERROR:", { status: error.status ?? null });
    showToast(error.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก", "error");

    setRegisterMessage(error.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก", "error");
  } finally {
    isSubmitting = registered;
    registerForm.setAttribute("aria-busy", String(registered));
    setButtonLoading(registerSubmitBtn, false, "กำลังสมัครสมาชิก...", "สมัครสมาชิก");
    registerSubmitBtn.disabled = registered;

    registerSubmitBtn.innerHTML = `
      <i class="fa-solid fa-user-plus"></i>
      <span>สมัครสมาชิก</span>
    `;
  }
});
