import { apiRequest } from "./client.js";

export function getMyCoopRequests() {
  return apiRequest("/api/coop-requests/me", { method: "GET" });
}

export function getCoopRequestById(id) {
  return apiRequest(`/api/coop-requests/${encodeURIComponent(id)}`, { method: "GET" });
}

export function createCoopRequest(payload) {
  return apiRequest("/api/coop-requests", {
    method: "POST",
    body: payload,
  });
}

export function cancelCoopRequest(id) {
  return apiRequest(`/api/coop-requests/${encodeURIComponent(id)}/cancel`, {
    method: "PATCH",
  });
}
