import { apiRequest } from './client.js';
import { getRoleToken } from '../auth/roleAuthStorage.js';
export const STAFF_TOKEN_KEY = 'staffToken';
export async function staffRequest(path, options = {}) {
  const token = getRoleToken('department_staff');
  const changed = () => Object.assign(new Error('สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่'), { status: 401 });
  if (!token) throw changed();
  try {
    const result = await apiRequest(path, { ...options, auth: false, headers: { Authorization: `Bearer ${token}` } });
    if (getRoleToken('department_staff') !== token) throw changed();
    return result;
  } catch (error) {
    if (getRoleToken('department_staff') !== token) throw changed();
    throw error;
  }
}
export const loginStaff = body => apiRequest('/api/staff/auth/login', { method: 'POST', body, auth: false });
export const getCurrentStaff = () => staffRequest('/api/staff/me');
export const getDocumentQueue = query => staffRequest(`/api/staff/document-requests?${new URLSearchParams(query)}`);
export const getDocumentRequest = id => staffRequest(`/api/staff/document-requests/${encodeURIComponent(id)}`);
export const saveCompanyResponse = (id, body, correcting = false) => staffRequest(`/api/staff/document-requests/${encodeURIComponent(id)}/company-response`, { method: correcting ? 'PUT' : 'POST', body });
export function saveStaffDocument(id, type, action, body) {
  if (!['create', 'edit', 'generate'].includes(action) || !['cooperation', 'placement'].includes(type)) throw Error('Unsupported document operation');
  return staffRequest(`/api/staff/document-requests/${encodeURIComponent(id)}/documents/${type}${action === 'generate' ? '/generate' : ''}`, { method: action === 'edit' ? 'PUT' : 'POST', body });
}
export function getStaffDocumentContent(id, type, mode = 'preview', version) {
  if (!['preview', 'download'].includes(mode) || !['cooperation', 'placement'].includes(type)) throw Error('Unsupported document content');
  return staffRequest(`/api/staff/document-requests/${encodeURIComponent(id)}/documents/${type}/${mode}${version ? `?${new URLSearchParams({ version })}` : ''}`, { responseType: 'blob' });
}
