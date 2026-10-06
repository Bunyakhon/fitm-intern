import { apiRequest } from "./client.js";

export const getMyCompanyEvaluation = () => apiRequest("/api/student-coop/company-evaluation");
export const saveMyCompanyEvaluation = evaluation => apiRequest("/api/student-coop/company-evaluation", { method: "PUT", body: evaluation });

export const getMyCoopProject = () => apiRequest("/api/student-coop/project");
export const saveMyCoopProject = topic => apiRequest("/api/student-coop/project", { method: "PUT", body: { topic } });
export const getMyProjectAdvisorRequest = () => apiRequest("/api/student-coop/project-advisor-request");
export const requestMyProjectAdvisor = teacherId => apiRequest("/api/student-coop/project-advisor-request", { method: "POST", body: { teacher_id: teacherId } });
export const getMyCoopProjectFiles = () => apiRequest("/api/student-coop/project-files");
export function uploadMyCoopProjectFile(category, file) {
  if (!["project-book", "poster"].includes(category)) throw new Error("ประเภทไฟล์ไม่ถูกต้อง");
  const data = new FormData();
  data.append("file", file);
  return apiRequest(`/api/student-coop/${category}`, { method: "POST", body: data });
}
export const previewMyCoopProjectFile = id => apiRequest(`/api/student-coop/project-files/${encodeURIComponent(id)}/preview`, { responseType: "blob" });
