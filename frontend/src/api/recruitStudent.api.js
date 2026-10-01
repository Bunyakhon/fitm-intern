import { apiRequest } from "./client.js";

export async function submitRecruitment(payload) {
  const response = await apiRequest("/api/job-submissions", {
    method: "POST",
    body: payload,
    auth: false,
    returnResponse: true,
  });

  return { status: response.status, data: response.data };
}

export async function verifyRecruitmentEmail(token) {
  const response = await apiRequest(
    `/api/job-submissions/verify-email?token=${encodeURIComponent(token)}`,
    { method: "GET", auth: false, returnResponse: true },
  );

  return { status: response.status, data: response.data };
}
