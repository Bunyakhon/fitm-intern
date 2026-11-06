import { apiRequest } from './client.js';
import { getStudentToken } from '../auth/studentAuthStorage.js';
import { getRoleToken, getApplicationAdminToken } from '../auth/roleAuthStorage.js';
export function topicExamClient(role = 'student', request = apiRequest) {
  const getToken = role === 'student' ? getStudentToken : role === 'admin' ? getApplicationAdminToken : () => getRoleToken('department_staff');
  async function call(path, { version, ...options } = {}) {
    const token = getToken();
    if (!token) throw Object.assign(Error('กรุณาเข้าสู่ระบบใหม่'), { status: 401 });
    const changed = () => Object.assign(Error('สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่'), { status: 409, data: { code: 'CO09_SESSION_CHANGED' } });
    try {
      const result = await request('/api/coop-topic-exams' + path, { ...options, auth: false, headers: { Authorization: `Bearer ${token}`, ...(version !== undefined ? { 'If-Match': `"${version}"` } : {}) } });
      if (getToken() !== token) throw changed();
      return result;
    } catch (error) { if (getToken() !== token) throw changed(); throw error; }
  }
  return { call, getToken };
}
