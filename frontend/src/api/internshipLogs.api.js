import { apiRequest } from "./client.js";
const root = "/api/internship-logs";
export const getLogOverview = date => apiRequest(`${root}/overview?${new URLSearchParams({ date })}`);
export const saveDailyLog = (date, body, existing) => apiRequest(`${root}/days/${encodeURIComponent(date)}`, { method: existing ? "PUT" : "POST", body });
export const submitLogWeek = (date, version) => apiRequest(`${root}/weeks/${date}/submit`, { method: "POST", body: { version } });
export const resendMentorLink = () => apiRequest(`${root}/mentor-link`, { method: "POST", body: {} });
export const getMentorWeeks = token => apiRequest(`${root}/mentor/weeks`, { auth: false, headers: { Authorization: `Bearer ${token}` } });
export const getMentorWeek = (token, id) => apiRequest(`${root}/mentor/weeks/${encodeURIComponent(id)}`, { auth: false, headers: { Authorization: `Bearer ${token}` } });
export const reviewMentorWeek = (token, id, body) => apiRequest(`${root}/mentor/weeks/${encodeURIComponent(id)}/review`, { method: "POST", body, auth: false, headers: { Authorization: `Bearer ${token}` } });
