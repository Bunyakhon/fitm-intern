import { apiRequest } from "./client.js";

export const TEACHER_TOKEN_KEY = "teacherToken";

export function teacherRequest(path, options = {}) {
  const token = sessionStorage.getItem(TEACHER_TOKEN_KEY);
  return apiRequest(path, { ...options, auth: false, headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

export function loginTeacher(body) {
  return apiRequest("/api/teachers/auth/login", { method: "POST", body, auth: false });
}

export function getCurrentTeacher() {
  return teacherRequest("/api/teachers/me");
}

export function getTeacherAdvisorRequests({ status = "pending", offset = 0, limit = 26 } = {}) {
  return teacherRequest(`/api/teachers/project-advisor-requests?${new URLSearchParams({ status, offset, limit })}`);
}

export function decideTeacherAdvisorRequest(id, decision, reason) {
  return teacherRequest(`/api/teachers/project-advisor-requests/${encodeURIComponent(id)}/${decision}`, {
    method: "POST", body: decision === "reject" ? { reason } : {},
  });
}

export function getTeacherCoopRequests({ status = "advisor_review", offset = 0, limit = 26 } = {}) {
  return teacherRequest(`/api/teachers/coop-requests?${new URLSearchParams({ status, offset, limit })}`);
}

export function getTeacherCoopRequest(id) {
  return teacherRequest(`/api/teachers/coop-requests/${encodeURIComponent(id)}`);
}

export function decideTeacherCoopRequest(id, decision, reason) {
  if (!["approve", "reject"].includes(decision)) throw new Error("Unsupported decision");
  return teacherRequest(`/api/teachers/coop-requests/${encodeURIComponent(id)}/${decision}`, {
    method: "POST", body: decision === "reject" ? { reason } : {},
  });
}
