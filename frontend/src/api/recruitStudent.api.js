import { API_BASE_URL } from "./client.js";

async function parseJsonSafely(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function submitRecruitment(payload, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${API_BASE_URL}/api/job-submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafely(response);

  if (!response.ok) {
    const error = new Error(data?.message || "Unable to submit recruitment information");
    error.status = response.status;
    error.data = data;
    error.retryAfter = response.headers.get("retry-after");
    throw error;
  }

  return { status: response.status, data };
}

export async function verifyRecruitmentEmail(token, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(
    `${API_BASE_URL}/api/job-submissions/verify-email?token=${encodeURIComponent(token)}`,
  );
  const data = await parseJsonSafely(response);

  if (!response.ok) {
    const error = new Error(data?.message || "Unable to verify email");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return { status: response.status, data };
}
