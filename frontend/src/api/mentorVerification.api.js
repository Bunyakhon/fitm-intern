import { apiRequest } from "./client.js";

export function verifyMentorToken(token) {
  const query = new URLSearchParams({ token });
  return apiRequest(`/api/mentor-verification/verify?${query.toString()}`, {
    method: "GET",
    auth: false,
  });
}

export function updateMentorProfile(token, data) {
  return apiRequest("/api/mentor-verification/profile", {
    method: "PUT",
    body: { token, ...data },
    auth: false,
  });
}

export function confirmMentorVerification(token) {
  return apiRequest("/api/mentor-verification/confirm", {
    method: "POST",
    body: { token },
    auth: false,
  });
}
