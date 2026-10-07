import { apiRequest } from './client.js';
export const STAFF_TOKEN_KEY = 'staffToken';
export function staffRequest(path, options = {}) {
  const token = sessionStorage.getItem(STAFF_TOKEN_KEY);
  return apiRequest(path, { ...options, auth: false, headers: token ? { Authorization: `Bearer ${token}` } : {} });
}
export const loginStaff = body => apiRequest('/api/staff/auth/login', { method: 'POST', body, auth: false });
export const getCurrentStaff = () => staffRequest('/api/staff/me');
export const getDocumentQueue = query => staffRequest(`/api/staff/document-requests?${new URLSearchParams(query)}`);
export const getDocumentRequest = id => staffRequest(`/api/staff/document-requests/${encodeURIComponent(id)}`);
export function saveStaffDocument(id, type, action, body) {
  if (!['create', 'edit', 'generate'].includes(action) || !['cooperation', 'placement'].includes(type)) throw Error('Unsupported document operation');
  return staffRequest(`/api/staff/document-requests/${encodeURIComponent(id)}/documents/${type}${action === 'generate' ? '/generate' : ''}`, { method: action === 'edit' ? 'PUT' : 'POST', body });
}
export function getStaffDocumentContent(id, type, mode = 'preview', version) {
  if (!['preview', 'download'].includes(mode) || !['cooperation', 'placement'].includes(type)) throw Error('Unsupported document content');
  return staffRequest(`/api/staff/document-requests/${encodeURIComponent(id)}/documents/${type}/${mode}${version ? `?${new URLSearchParams({ version })}` : ''}`, { responseType: 'blob' });
}
