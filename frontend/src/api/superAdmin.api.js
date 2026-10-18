import { apiRequest } from './client.js';
import { getApplicationAdminToken } from '../auth/roleAuthStorage.js';
export async function adminRequest(path, { version, ...options } = {}) {
  const token = getApplicationAdminToken();
  if (!token) throw Object.assign(Error('กรุณาเข้าสู่ระบบใหม่'), { status: 401 });
  const changed = () => Object.assign(Error('สถานะเข้าสู่ระบบเปลี่ยนแล้ว'), { status: 409, data: { code: 'ADMIN_SESSION_CHANGED' } });
  try {
    const result = await apiRequest('/api/admin' + path, { ...options, auth: false, headers: { Authorization: `Bearer ${token}`, ...(version ? { 'If-Match': version } : {}) } });
    if (getApplicationAdminToken() !== token) throw changed();
    return result;
  } catch (error) { if (getApplicationAdminToken() !== token) throw changed(); throw error; }
}
