import { apiRequest } from "./client.js";

export function getMyJobMatchingSource() {
  return apiRequest("/api/job-matches/me/source", { method: "GET", headers: { "Cache-Control": "no-cache" } });
}

export function getPublishedJobs({ q = "", category = "", province = "", page = 1 } = {}) {
  const query = new URLSearchParams({ q, category, province, page: String(page) });
  return apiRequest(`/api/job-matches/me/jobs?${query}`, { method: "GET", headers: { "Cache-Control": "no-cache" } });
}

export function getMyJobMatches({ source } = {}) {
  const query = new URLSearchParams();
  if (source !== undefined) query.set("source", source);
  const queryString = query.toString();

  return apiRequest(`/api/job-matches/me${queryString ? `?${queryString}` : ""}`, {
    method: "POST",
  });
}
