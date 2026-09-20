console.log("KIWI login page loaded");

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const togglePassword = document.getElementById("togglePassword");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const loginMessage = document.getElementById("loginMessage");

const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');

// ==============================
// แสดง / ซ่อนรหัสผ่าน
// ==============================

togglePassword.addEventListener("click", () => {
  const isPassword = loginPassword.type === "password";

  loginPassword.type = isPassword ? "text" : "password";

  togglePassword.innerHTML = isPassword
    ? '<i class="fa-solid fa-eye-slash"></i>'
    : '<i class="fa-solid fa-eye"></i>';
});

// ==============================
// Login Form
// ==============================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value;

  loginMessage.textContent = "";
  loginMessage.className = "login-message";

  if (!email || !password) {
    loginMessage.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
    loginMessage.classList.add("error");
    return;
  }

  // ปิดปุ่มชั่วคราว ป้องกันกดซ้ำ
  loginSubmitBtn.disabled = true;

  loginSubmitBtn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    <span>กำลังเข้าสู่ระบบ...</span>
  `;

  try {
    const response = await fetch(
      "http://localhost:5000/api/auth/login",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "ไม่สามารถเข้าสู่ระบบได้"
      );
    }

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

    loginMessage.textContent =
      result.message || "เข้าสู่ระบบสำเร็จ";

    loginMessage.classList.add("success");

    console.log("LOGIN SUCCESS:", result.data);

    // ไปหน้าแรก
    setTimeout(() => {
      window.location.href = "/student_coop/student_coop.html";
    }, 1000);
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    loginMessage.textContent =
      error.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";

    loginMessage.classList.add("error");
  } finally {
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
  loginMessage.textContent =
    "Google Login จะเชื่อมต่อ Google OAuth ภายหลัง";

  loginMessage.className = "login-message";
});