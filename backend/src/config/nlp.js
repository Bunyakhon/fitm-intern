function readIntegerEnv(name, fallback, minimum, maximum) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function getNlpMatchingConfig() {
  const baseUrl =
    process.env.NLP_SERVICE_BASE_URL || "http://nlp-service:8000";

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    timeoutMs: readIntegerEnv("NLP_SERVICE_TIMEOUT_MS", 5000, 1000, 30000),
  };
}

module.exports = { getNlpMatchingConfig };
