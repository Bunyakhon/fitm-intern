import { apiRequest } from "./client.js";

export function getMyJobMatchingSource() {
  return apiRequest("/api/job-matches/me/source", { method: "GET", headers: { "Cache-Control": "no-cache" } });
}

export function getPublishedJobs({ q = "", category = "", specialization = "", province = "", page = 1 } = {}) {
  const query = new URLSearchParams({ q, category, province, page: String(page) });
  if (specialization) query.set("specialization", specialization);
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
