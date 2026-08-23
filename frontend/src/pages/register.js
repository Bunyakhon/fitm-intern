import apiClient from '../api/client.js';

const form = document.getElementById('register-form');
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
  submitBtn.textContent = isLoading ? 'กำลังสมัคร...' : 'สมัครสมาชิก';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const formData = new FormData(form);
  const payload = {
    first_name: formData.get('first_name').trim(),
    last_name: formData.get('last_name').trim(),
    student_id: formData.get('student_id').trim(),
    email: formData.get('email').trim().toLowerCase(),
    password: formData.get('password'),
  };
  const confirmPassword = formData.get('confirm_password');

  // validate ฝั่ง client ก่อนยิง request กันเปลือง round-trip
  if (payload.password !== confirmPassword) {
    showError('รหัสผ่านไม่ตรงกัน กรุณากรอกใหม่');
    return;
  }
  if (!payload.email.endsWith('@email.kmutnb.ac.th')) {
    showError('กรุณาใช้อีเมล @email.kmutnb.ac.th เท่านั้น');
    return;
  }
  if (payload.password.length < 8) {
    showError('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
    return;
  }

  setLoading(true);
  try {
    await apiClient.post('/api/register', payload);
    // สมัครสำเร็จ พาไปหน้า login พร้อมข้อความแจ้งเตือน
    window.location.href = '/login.html?registered=1';
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
});
