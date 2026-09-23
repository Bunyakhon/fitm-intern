import { apiRequest } from "./client.js";

export function getTeachers() {
  return apiRequest("/api/teachers", {
    method: "GET",
  });
}
