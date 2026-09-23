import { apiRequest } from "./client.js";

export function getMyStudentProfile() {
  return apiRequest("/api/student-profile/me", {
    method: "GET",
  });
}

export function updateMyStudentProfile(data) {
  return apiRequest("/api/student-profile/me", {
    method: "PUT",
    body: data,
  });
}

export function getStudentProfileImage() {
  return apiRequest("/api/student-profile/profile-image", {
    method: "GET",
    responseType: "blob",
  });
}

export function uploadStudentProfileImage(data) {
  return apiRequest("/api/student-profile/profile-image", {
    method: "POST",
    body: data,
  });
}

export function updateStudentInfo(data) {
  return apiRequest("/api/student-profile/student-info", {
    method: "PUT",
    body: data,
  });
}
