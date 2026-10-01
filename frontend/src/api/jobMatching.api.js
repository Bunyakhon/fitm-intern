import { apiRequest } from "./client.js";

export function getMyJobMatches() {
  return apiRequest("/api/job-matches/me", {
    method: "POST",
  });
}
