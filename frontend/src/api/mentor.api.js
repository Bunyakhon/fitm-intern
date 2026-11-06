import { apiRequest } from "./client.js";

export function getMyMentor({ signal } = {}) {
  return apiRequest("/api/mentors/me", {
    method: "GET",
    signal,
    headers: { "Cache-Control": "no-cache" },
  });
}

export function createMentor(data) {
  return apiRequest("/api/mentors", {
    method: "POST",
    body: data,
  });
}

export function updateMyMentor(data) {
  return apiRequest("/api/mentors/me", {
    method: "PUT",
    body: data,
  });
}

export function deleteMyMentor() {
  return apiRequest("/api/mentors/me", {
    method: "DELETE",
  });
}
