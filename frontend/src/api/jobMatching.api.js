import { apiRequest } from "./client.js";

export function getMyJobMatches({ source } = {}) {
  const query = new URLSearchParams();
  if (source !== undefined) query.set("source", source);
  const queryString = query.toString();

  return apiRequest(`/api/job-matches/me${queryString ? `?${queryString}` : ""}`, {
    method: "POST",
  });
}
