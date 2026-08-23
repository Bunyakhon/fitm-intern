import apiClient from '../api/client.js';

const form = document.getElementById('login-form');
const errorEl = document.getElementById('form-error');
const submitBtn = document.getElementById('submit-btn');

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function clearError() {
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ';
}

// ถ้ามาจากหน้าสมัครสมาชิกสำเร็จ แจ้งเตือนสั้นๆ
const params = new URLSearchParams(window.location.search);
if (params.get('registered') === '1') {
  errorEl.textContent = 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ';
  errorEl.classList.remove('hidden');
  errorEl.classList.remove('text-[var(--color-error)]');
  errorEl.classList.add('text-[var(--color-success)]');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const formData = new FormData(form);
  const payload = {
    email: formData.get('email').trim().toLowerCase(),
    password: formData.get('password'),
  };

  setLoading(true);
  try {
    const { data } = await apiClient.post('/api/login', payload);
    // เก็บ token ไว้ใช้เรียก API ที่ต้อง auth ต่อ (จะต่อ route protected ทีหลัง)
    if (data?.token) {
      localStorage.setItem('auth_token', data.token);
    }
    window.location.href = '/'; // ทีหลังจะเปลี่ยนเป็นหน้า dashboard
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
});
