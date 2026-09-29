import { apiRequest } from "./client.js";

export function getMyMentor() {
  return apiRequest("/api/mentors/me", {
    method: "GET",
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
