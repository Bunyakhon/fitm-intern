import { apiRequest } from "./client.js";
export const googleConfig = () => apiRequest("/api/auth/google/config", { auth: false });
export const googleChallenge = body => apiRequest("/api/auth/google/challenge", { method: "POST", body, auth: false });
export const googleAuthenticate = body => apiRequest("/api/auth/google/login", { method: "POST", body, auth: false });
