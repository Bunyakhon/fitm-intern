import { loginTeacher, TEACHER_TOKEN_KEY } from "../api/teacherProjectAdvisor.api.js";
import { setButtonLoading, showToast } from "../ui/feedback.js";

export function mountTeacherLogin({ document, storage, location, destination = "/src/teacher_coop/teacher_coop.html", forbiddenMessage = "บัญชีนี้ไม่มีสิทธิ์ใช้งานหน้านี้", login = loginTeacher, toast = showToast, loading = setButtonLoading }) {
  const form = document.getElementById("teacherLoginForm");
  const message = document.getElementById("teacherLoginMessage");
  const button = form.querySelector('button[type="submit"]');
  let submitting = false;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitting) return;
    const email = document.getElementById("teacherEmail").value.trim().toLowerCase();
    const password = document.getElementById("teacherPassword").value;
    if (!email || !password) { message.textContent = "กรุณากรอกอีเมลและรหัสผ่าน"; message.setAttribute("role", "alert"); return; }
    submitting = true;
    message.textContent = "";
    form.setAttribute("aria-busy", "true");
    loading(button, true, "กำลังเข้าสู่ระบบ...", "เข้าสู่ระบบ");
    try {
      const result = await login({ email, password });
      if (!result.token) throw new Error("ไม่พบข้อมูลเข้าสู่ระบบจากเซิร์ฟเวอร์");
      storage.setItem(TEACHER_TOKEN_KEY, result.token);
      location.replace(destination);
    } catch (error) {
      message.textContent = error.status === 401 ? "อีเมลหรือรหัสผ่านอาจารย์ไม่ถูกต้อง" : error.status === 403 ? forbiddenMessage : error.status === 429 ? "เข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่" : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง";
      message.setAttribute("role", "alert");
      toast(message.textContent, "error");
    } finally {
      submitting = false;
      document.getElementById("teacherPassword").value = "";
      form.setAttribute("aria-busy", "false");
      loading(button, false, "กำลังเข้าสู่ระบบ...", "เข้าสู่ระบบ");
    }
  });
}

if (typeof document !== "undefined" && document.body.dataset.authRole !== "department_head") mountTeacherLogin({ document, storage: sessionStorage, location: window.location });
