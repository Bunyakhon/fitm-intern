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

export function searchCompanies(query) {
  return apiRequest(`/api/coop-requests/companies/search?q=${encodeURIComponent(query)}`, { method: "GET" });
}

export function checkCompanyDuplicate(name) {
  return apiRequest(`/api/coop-requests/companies/duplicate-check?name=${encodeURIComponent(name)}`, { method: "GET" });
}

export function getPublishedJobPostingForCoopRequest(id) {
  return apiRequest(`/api/coop-requests/job-postings/${encodeURIComponent(id)}`, { method: "GET" });
}

export function cancelCoopRequest(id) {
  return apiRequest(`/api/coop-requests/${encodeURIComponent(id)}/cancel`, {
    method: "PATCH",
  });
}
