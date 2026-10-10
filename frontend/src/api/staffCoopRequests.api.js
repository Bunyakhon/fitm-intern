import { staffRequest } from './staffDocuments.api.js';

export const getStaffCoopRequests = query => staffRequest(`/api/staff/coop-requests?${new URLSearchParams(query)}`);
export const getStaffCoopRequest = id => staffRequest(`/api/staff/coop-requests/${encodeURIComponent(id)}`);
export const cancelStaffCoopRequest = (id, body) => staffRequest(`/api/staff/coop-requests/${encodeURIComponent(id)}/cancel`, { method: 'POST', body });
