// Shared browser-origin policy for CORS and Google request guards.
const DEVELOPMENT_ORIGINS = Object.freeze([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function getAllowedOrigins(env = process.env) {
  const origins = new Set();
  if (env.FRONTEND_URL) {
    const url = new URL(env.FRONTEND_URL);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("Invalid frontend origin configuration");
    }
    origins.add(url.origin);
  }
  // No implicit aliases for production, staging or an unspecified environment.
  if (env.NODE_ENV === "development") {
    DEVELOPMENT_ORIGINS.forEach(origin => origins.add(origin));
  }
  return origins;
}

function getCorsOptions(env = process.env) {
  const allowedOrigins = getAllowedOrigins(env);
  return {
    credentials: true,
    origin(origin, callback) {
      // Non-browser clients keep working; Google POSTs still require Origin.
      if (!origin) return callback(null, false);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(Object.assign(new Error("Origin is not allowed"), {
        status: 403, code: "CORS_ORIGIN",
      }));
    },
  };
}

module.exports = { getAllowedOrigins, getCorsOptions };
