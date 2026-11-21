import { apiRequest } from "./client.js";
import { teacherRequest } from "./teacherProjectAdvisor.api.js";

export function loginDepartmentHead(body) {
  return apiRequest("/api/department-head/auth/login", { method: "POST", body, auth: false });
}
export function getCurrentDepartmentHead() {
  return teacherRequest("/api/department-head/me");
}
export function getHeadCoopRequests({ status = "department_head_review", offset = 0, limit = 26 } = {}) {
  return teacherRequest(`/api/department-head/coop-requests?${new URLSearchParams({ status, offset, limit })}`);
}
export function getHeadCoopRequest(id) {
  return teacherRequest(`/api/department-head/coop-requests/${encodeURIComponent(id)}`);
}
export function decideHeadCoopRequest(id, decision, reason) {
  if (!["approve", "reject"].includes(decision)) throw new Error("Unsupported decision");
  return teacherRequest(`/api/department-head/coop-requests/${encodeURIComponent(id)}/${decision}`, { method: "POST", body: decision === "reject" ? { reason } : {} });
}

export function getHeadTeachers({ q, major, status, limit = 26, offset = 0 } = {}) {
  const query = new URLSearchParams({ limit, offset });
  for (const [key, value] of Object.entries({ q, major, status })) {
    if (typeof value === 'string' && value.trim()) query.set(key, value.trim());
  }
  // Department scope is derived from the live Head account by the backend.
  return teacherRequest(`/api/department-head/teachers?${query}`);
}

export function updateHeadTeacher(id, changes) {
  const body = Object.fromEntries(['first_name', 'last_name', 'major']
    .filter(key => Object.hasOwn(changes, key)).map(key => [key, changes[key]]));
  return teacherRequest(`/api/department-head/teachers/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}
