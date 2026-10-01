import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const shouldAttachAuth = config.auth !== false;
  delete config.auth;
  if (!shouldAttachAuth) {
    return config;
  }

  const token = localStorage.getItem("token");
  const headers = config.headers;

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

function normalizeError(error) {
  const response = error?.response;
  const status = response?.status;
  let message = response?.data?.message;

  if (typeof message !== "string" || !message.trim()) {
    message = error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT"
      ? "The request timed out. Please try again."
      : status
        ? `Request failed with status ${status}.`
        : "Unable to connect to the server. Please try again.";
  }

  const normalized = new Error(message);
  normalized.status = status;
  normalized.data = response?.data ?? null;
  const retryAfter = response?.headers?.["retry-after"];
  if (retryAfter != null) normalized.retryAfter = retryAfter;
  return normalized;
}

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    headers,
    responseType = "json",
    signal,
    onUploadProgress,
    returnResponse = false,
    auth = true,
    ...config
  } = options;

  try {
    const response = await api.request({
      ...config,
      url: path,
      method,
      data: body,
      headers,
      responseType,
      signal,
      onUploadProgress,
      auth,
    });

    return returnResponse
      ? { status: response.status, data: response.data, headers: response.headers }
      : response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}
