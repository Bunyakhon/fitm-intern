import { staffRequest } from './staffDocuments.api.js';

export function getStaffTeachers({ q, major, status, limit = 26, offset = 0 } = {}) {
  const query = new URLSearchParams({ limit, offset });
  for (const [key, value] of Object.entries({ q, major, status })) {
    if (typeof value === 'string' && value.trim()) query.set(key, value.trim());
  }
  return staffRequest(`/api/staff/teachers?${query}`);
}
export const getStaffTeacher = id => staffRequest(`/api/staff/teachers/${encodeURIComponent(id)}`);
export const getStaffTeacherOptions = () => staffRequest('/api/staff/teachers/options');
export const createStaffTeacher = body => staffRequest('/api/staff/teachers', { method: 'POST', body });
export const updateStaffTeacher = (id, body) => staffRequest(`/api/staff/teachers/${encodeURIComponent(id)}`, { method: 'PATCH', body });
export const deactivateStaffTeacher = id => staffRequest(`/api/staff/teachers/${encodeURIComponent(id)}/deactivate`, { method: 'PATCH', body: {} });
export const resetStaffTeacherPassword = id => staffRequest(`/api/staff/teachers/${encodeURIComponent(id)}/reset-password`, { method: 'POST', body: {} });
