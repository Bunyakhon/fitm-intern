import { apiRequest } from "./client.js";

export async function submitRecruitment(payload) {
  const response = await apiRequest("/api/job-submissions", {
    method: "POST",
    body: payload,
    auth: false,
    withCredentials: true,
    returnResponse: true,
  });

  return { status: response.status, data: response.data };
}

export async function verifyRecruitmentEmail(token) {
  const response = await apiRequest(
    "/api/job-submissions/verify-email",
    { method: "POST", body: { token }, auth: false, returnResponse: true },
  );

  return { status: response.status, data: response.data };
}

export function resendRecruitmentVerification() {
  return apiRequest("/api/job-submissions/resend-verification", {
    method: "POST", body: {}, auth: false, withCredentials: true,
  });
}
