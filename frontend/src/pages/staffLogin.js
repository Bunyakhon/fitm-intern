import { loginStaff, STAFF_TOKEN_KEY } from '../api/staffDocuments.api.js';
import { showToast, setButtonLoading } from '../ui/feedback.js';
export function mountStaffLogin({ document, storage, location, login = loginStaff, toast = showToast, loading = setButtonLoading }) {
  const get = id => document.getElementById(id), form = get('staffLoginForm'), button = form.querySelector('button[type="submit"]');
  let busy = false;
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const email = get('staffEmail').value.trim().toLowerCase(), password = get('staffPassword').value;
    if (!email || !password) { get('staffLoginMessage').textContent = 'กรุณากรอกอีเมลและรหัสผ่าน'; return; }
    busy = true; get('staffLoginMessage').textContent = ''; loading(button, true, 'กำลังเข้าสู่ระบบ...', 'เข้าสู่ระบบ');
    try {
      const result = await login({ email, password });
      if (!result.token || result.staff?.is_active !== true) throw Error('Invalid Staff profile');
      storage.setItem(STAFF_TOKEN_KEY, result.token); location.replace('/src/department_staff/department_staff.html');
    } catch (error) {
      get('staffLoginMessage').textContent = error.status === 401 ? 'อีเมลหรือรหัสผ่านเจ้าหน้าที่ไม่ถูกต้อง' : error.status === 429 ? 'เข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่' : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
      toast(get('staffLoginMessage').textContent, 'error');
    } finally { busy = false; get('staffPassword').value = ''; loading(button, false, 'กำลังเข้าสู่ระบบ...', 'เข้าสู่ระบบ'); }
  });
}
if (typeof document !== 'undefined') mountStaffLogin({ document, storage: sessionStorage, location: window.location });
