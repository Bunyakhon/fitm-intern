import { apiRequest } from "./client.js";
import { getStudentToken } from '../auth/studentAuthStorage.js';
export function updateCoopAcademicCourse(id, code, payload) {
  const token = getStudentToken();
  if (!token) return Promise.reject(Object.assign(new Error('กรุณาเข้าสู่ระบบใหม่'), { status: 401 }));
  return apiRequest(`/api/coop-requests/${encodeURIComponent(id)}/academic-courses/${encodeURIComponent(code)}`, {
    method: 'PATCH', body: payload, auth: false, studentSessionToken: token, headers: { Authorization: `Bearer ${token}` },
  });
}
export function getCoopPrerequisiteCatalog() {
  return apiRequest('/api/coop-requests/prerequisite-catalog', { method: 'GET', headers: { 'Cache-Control': 'no-cache' } });
}
export function getClassAdvisorReadiness() {
  return apiRequest('/api/coop-requests/class-advisor', { method: 'GET', headers: { 'Cache-Control': 'no-cache' } });
}

export function getDepartmentHead() {
  return apiRequest('/api/coop-requests/department-head', { method: 'GET', headers: { 'Cache-Control': 'no-cache' } });
}

export function getMyCoopRequests() {
  return apiRequest("/api/coop-requests/me", { method: "GET" });
}

export function getCoopRequestById(id) {
  return apiRequest(`/api/coop-requests/${encodeURIComponent(id)}`, { method: "GET" });
}

export function createCoopRequest(payload) {
  return apiRequest("/api/coop-requests", {
    method: "POST",
    body: payload,
  });
}

export function searchCompanies(query) {
  return apiRequest(`/api/coop-requests/companies/search?q=${encodeURIComponent(query)}`, { method: "GET" });
}

export function checkCompanyDuplicate(name) {
  return apiRequest(`/api/coop-requests/companies/duplicate-check?name=${encodeURIComponent(name)}`, { method: "GET" });
}

export function getPublishedJobPostingForCoopRequest(id) {
  return apiRequest(`/api/coop-requests/job-postings/${encodeURIComponent(id)}`, { method: "GET" });
}

export function cancelCoopRequest(id) {
  return apiRequest(`/api/coop-requests/${encodeURIComponent(id)}/cancel`, {
    method: "PATCH",
  });
}
