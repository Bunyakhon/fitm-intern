const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

async function requestMentorVerification(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(data?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function verifyMentorToken(token) {
  const query = new URLSearchParams({ token });

  return requestMentorVerification(
    `/api/mentor-verification/verify?${query.toString()}`,
    { method: "GET" },
  );
}

export function updateMentorProfile(token, data) {
  return requestMentorVerification("/api/mentor-verification/profile", {
    method: "PUT",
    body: JSON.stringify({ token, ...data }),
  });
}

export function confirmMentorVerification(token) {
  return requestMentorVerification("/api/mentor-verification/confirm", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
