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

function togglePassword(input, button) {
  const isPassword = input.type === "password";

  input.type = isPassword ? "text" : "password";

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

  const studentId = regStudentId.value.trim();
  const firstName = regFirstName.value.trim();
  const lastName = regLastName.value.trim();
  const email = regEmail.value.trim().toLowerCase();
  const password = regPassword.value;
  const confirmPassword = regConfirm.value;

  registerMessage.textContent = "";
  registerMessage.className = "register-message";

  if (
    !studentId ||
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    registerMessage.textContent = "กรุณากรอกข้อมูลให้ครบถ้วน";
    registerMessage.classList.add("error");
    return;
  }

  if (password !== confirmPassword) {
    registerMessage.textContent =
      "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน";

    registerMessage.classList.add("error");
    return;
  }

  if (password.length < 8) {
    registerMessage.textContent =
      "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";

    registerMessage.classList.add("error");
    return;
  }

  if (!email.endsWith("@email.kmutnb.ac.th")) {
    registerMessage.textContent =
      "กรุณาใช้อีเมลมหาวิทยาลัย @email.kmutnb.ac.th";

    registerMessage.classList.add("error");
    return;
  }

  registerSubmitBtn.disabled = true;

  registerSubmitBtn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    <span>กำลังสมัครสมาชิก...</span>
  `;

  try {
    const response = await fetch(
      "http://localhost:5000/api/auth/register",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          student_id: studentId,
          first_name: firstName,
          last_name: lastName,
          email,
          password,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "ไม่สามารถสมัครสมาชิกได้"
      );
    }

    registerMessage.textContent =
      result.message || "สมัครสมาชิกสำเร็จ";

    registerMessage.classList.add("success");

    registerForm.reset();

    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1500);
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    registerMessage.textContent =
      error.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก";

    registerMessage.classList.add("error");
  } finally {
    registerSubmitBtn.disabled = false;

    registerSubmitBtn.innerHTML = `
      <i class="fa-solid fa-user-plus"></i>
      <span>สมัครสมาชิก</span>
    `;
  }
});