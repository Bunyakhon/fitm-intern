import { apiRequest } from "./client.js";
import { getStudentToken } from "../auth/studentAuthStorage.js";

export const getMyCompanyEvaluation = () => apiRequest("/api/student-coop/company-evaluation");
export const saveMyCompanyEvaluation = evaluation => apiRequest("/api/student-coop/company-evaluation", { method: "PUT", body: evaluation });

// Bind queued requests to the session that owns the project workspace. Never
// let the Axios interceptor substitute a later account's token.
function projectRequest(path, { sessionToken = getStudentToken(), ...options } = {}) {
  if (!sessionToken || sessionToken !== getStudentToken()) return Promise.reject(Object.assign(new Error("สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่"), { status: 401 }));
  return apiRequest(path, { ...options, auth: false, studentSessionToken: sessionToken, headers: { ...options.headers, Authorization: `Bearer ${sessionToken}` } });
}
export const getMyCoopProject = options => projectRequest("/api/student-coop/project", options);
export const saveMyCoopProject = (topic, expectedTopic, options) => projectRequest("/api/student-coop/project", { ...options, method: "PUT", body: { topic, expected_topic: expectedTopic } });
export const getMyProjectAdvisorRequest = options => projectRequest("/api/student-coop/project-advisor-request", options);
export const getProjectAdvisorTeachers = options => projectRequest("/api/student-coop/project-advisors", options);
export const requestMyProjectAdvisor = (teacherId, options) => projectRequest("/api/student-coop/project-advisor-request", { ...options, method: "POST", body: { teacher_id: teacherId } });
export const getMyCoopProjectFiles = options => projectRequest("/api/student-coop/project-files", options);
export function uploadMyCoopProjectFile(category, file, options) {
  if (!["project-book", "poster"].includes(category)) throw new Error("ประเภทไฟล์ไม่ถูกต้อง");
  const data = new FormData();
  data.append("file", file);
  return projectRequest(`/api/student-coop/${category}`, { ...options, method: "POST", body: data });
}
export const previewMyCoopProjectFile = (id, options) => projectRequest(`/api/student-coop/project-files/${encodeURIComponent(id)}/preview`, { ...options, responseType: "blob" });
export const getMyProjectLink = (category, options) => projectRequest(`/api/student-coop/project-links/${encodeURIComponent(category)}`, options);
export const saveMyProjectLink = (category, url, version, options) => projectRequest(`/api/student-coop/project-links/${encodeURIComponent(category)}`, { ...options, method: "PUT", body: { document_url: url }, headers: { 'If-Match': `"${version}"` } });
