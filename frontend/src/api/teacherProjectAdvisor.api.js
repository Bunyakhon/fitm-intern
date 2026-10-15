import { apiRequest } from "./client.js";
import { getRoleToken } from "../auth/roleAuthStorage.js";

export const TEACHER_TOKEN_KEY = "teacherToken";

export async function teacherRequest(path, options = {}) {
  const token = getRoleToken("teacher");
  const changed = () => Object.assign(new Error("สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่"), { status: 401 });
  if (!token) throw changed();
  try {
    const result = await apiRequest(path, { ...options, auth: false, headers: { Authorization: `Bearer ${token}` } });
    if (getRoleToken("teacher") !== token) throw changed();
    return result;
  } catch (error) {
    if (getRoleToken("teacher") !== token) throw changed();
    throw error;
  }
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
