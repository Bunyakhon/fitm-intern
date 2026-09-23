const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getAuthToken() {
  return localStorage.getItem("token");
}

async function parseResponse(response, responseType) {
  if (responseType === "blob") {
    return response.blob();
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

export async function apiRequest(path, options = {}) {
  const {
    body,
    headers = {},
    responseType = "json",
    ...requestOptions
  } = options;
  const requestHeaders = new Headers(headers);
  const token = getAuthToken();

  if (token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let requestBody = body;

  if (
    body != null &&
    !(body instanceof FormData) &&
    typeof body === "object" &&
    !requestHeaders.has("Content-Type")
  ) {
    requestHeaders.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: requestHeaders,
    body: requestBody,
  });
  const data = await parseResponse(response, responseType);

  if (!response.ok) {
    const error = new Error(
    data?.message || ""
    );

    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export { API_BASE_URL };
