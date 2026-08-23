import axios from 'axios';

// baseURL อ่านจาก Vite env var (ตั้งใน .env ตอน build/dev)
// ถ้าไม่ตั้งไว้ fallback เป็น localhost:5000 (backend dev port)
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// interceptor: แปลง error จาก backend ให้เป็นข้อความเดียว ใช้งานง่ายฝั่ง UI
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
