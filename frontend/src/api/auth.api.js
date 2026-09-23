import { apiRequest } from "./client.js";

export function loginStudent(data) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: data,
  });
}

export function registerStudent(data) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: data,
  });
}

export function getCurrentStudent() {
  return apiRequest("/api/auth/me", {
    method: "GET",
  });
}
