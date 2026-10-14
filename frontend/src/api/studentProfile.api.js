import { apiRequest } from "./client.js";

export function getMyStudentProfile() {
  return apiRequest("/api/student-profile/me", {
    method: "GET",
  });
}

export function updateMyStudentProfile(data, revision) {
  if (!revision) throw new Error("กรุณาโหลดข้อมูลประวัติล่าสุดก่อนบันทึก");
  return apiRequest("/api/student-profile/me", {
    method: "PUT",
    body: data,
    headers: { "If-Match": revision },
  });
}

export function getStudentProfileImage() {
  return apiRequest("/api/student-profile/profile-image", {
    method: "GET",
    responseType: "blob",
  });
}

export function uploadStudentProfileImage(data, revision) {
  if (!revision) throw new Error("กรุณาโหลดข้อมูลประวัติล่าสุดก่อนบันทึก");
  return apiRequest("/api/student-profile/profile-image", {
    method: "POST",
    body: data,
    headers: { "If-Match": revision },
  });
}

export function uploadStudentResume(file) {
  const formData = new FormData();
  formData.append("resume", file);

  return apiRequest("/api/student-profile/resume", {
    method: "POST",
    body: formData,
  });
}

export function updateStudentInfo(data, revision) {
  if (!revision) throw new Error("กรุณาโหลดข้อมูลประวัติล่าสุดก่อนบันทึก");
  return apiRequest("/api/student-profile/student-info", {
    method: "PUT",
    body: data,
    headers: { "If-Match": revision },
  });
}

const profileCollections = new Set(["addresses", "education", "training", "skills"]);
function collectionPath(kind, id) {
  if (!profileCollections.has(kind)) throw new Error("ประเภทข้อมูลประวัติไม่ถูกต้อง");
  return "/api/student-profile/" + kind + (id ? "/" + encodeURIComponent(id) : "");
}
function withRevision(revision) {
  if (!revision) throw new Error("กรุณาโหลดข้อมูลประวัติล่าสุดก่อนบันทึก");
  return { "If-Match": revision };
}
export function getStudentProfileRecords(kind) {
  return apiRequest(collectionPath(kind), { method: "GET" });
}
export function createStudentProfileRecord(kind, data, revision) {
  return apiRequest(collectionPath(kind), { method: "POST", body: data, headers: withRevision(revision) });
}
export function updateStudentProfileRecord(kind, id, data, revision) {
  return apiRequest(collectionPath(kind, id), { method: "PATCH", body: data, headers: withRevision(revision) });
}
export function deleteStudentProfileRecord(kind, id, revision) {
  return apiRequest(collectionPath(kind, id), { method: "DELETE", body: {}, headers: withRevision(revision) });
}
export function getStudentProfileDocuments() {
  return apiRequest("/api/student-profile/documents", { method: "GET" });
}
export function uploadStudentProfileDocument(type, data, revision, onUploadProgress) {
  return apiRequest("/api/student-profile/documents/" + encodeURIComponent(type), {
    method: "POST", body: data, headers: withRevision(revision), onUploadProgress,
  });
}
export function updateStudentProfileDocument(id, data, revision) {
  return apiRequest("/api/student-profile/documents/" + encodeURIComponent(id), {
    method: "PATCH", body: data, headers: withRevision(revision),
  });
}
export function deleteStudentProfileDocument(id, revision) {
  return apiRequest("/api/student-profile/documents/" + encodeURIComponent(id), {
    method: "DELETE", body: {}, headers: withRevision(revision),
  });
}
export function downloadStudentProfileDocument(id) {
  return apiRequest("/api/student-profile/documents/" + encodeURIComponent(id) + "/download", {
    method: "GET", responseType: "blob",
  });
}

export function previewStudentProfilePdf(file) {
  const body = new FormData(); body.append("document", file);
  return apiRequest("/api/student-profile/pdf-import/preview", { method: "POST", body, timeout: 60_000 });
}
export function commitStudentProfilePdf(file, receipt, changes, revision) {
  const body = new FormData(); body.append("document", file); body.append("receipt", receipt); body.append("changes", JSON.stringify(changes));
  return apiRequest("/api/student-profile/pdf-import/commit", { method: "POST", body, headers: withRevision(revision) });
}
export function getStudentProfilePdfImportStatus(receipt) {
  return apiRequest("/api/student-profile/pdf-import/status", { method: "POST", body: { receipt } });
}
export function reviewStudentProfilePdfImport(receipt) {
  return apiRequest("/api/student-profile/pdf-import/review", { method: "POST", body: { receipt } });
}
export function getStudentProfilePdfImportHistory() {
  return apiRequest("/api/student-profile/pdf-import/history", { method: "GET" });
}
