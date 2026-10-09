import { apiRequest } from './client.js';
import { staffRequest } from './staffDocuments.api.js';
const root = '/api/coop-activities';
export const listActivities = (query, staff = false) => (staff ? staffRequest : apiRequest)(`${root}/${staff ? 'staff' : 'student'}?${new URLSearchParams(query)}`);
export const getActivity = (id, staff = false) => (staff ? staffRequest : apiRequest)(`${root}/${staff ? 'staff' : 'student'}/${encodeURIComponent(id)}`);
export const createActivity = body => staffRequest(`${root}/staff`, { method: 'POST', body });
export const editActivity = (id, body) => staffRequest(`${root}/staff/${encodeURIComponent(id)}`, { method: 'PUT', body });
export const cancelActivity = (id, body) => staffRequest(`${root}/staff/${encodeURIComponent(id)}/cancel`, { method: 'POST', body });
