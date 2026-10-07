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
