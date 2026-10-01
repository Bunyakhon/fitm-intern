const { getNlpMatchingConfig } = require("../config/nlp");

class NlpMatchingTimeoutError extends Error {
  constructor() {
    super("Job matching service timed out");
    this.name = "NlpMatchingTimeoutError";
    this.status = 504;
    this.code = "NLP_MATCHING_TIMEOUT";
  }
}

class NlpMatchingConnectionError extends Error {
  constructor() {
    super("Job matching service is unavailable");
    this.name = "NlpMatchingConnectionError";
    this.status = 503;
    this.code = "NLP_MATCHING_UNAVAILABLE";
  }
}

class NlpMatchingResponseError extends Error {
  constructor() {
    super("Job matching service returned an invalid response");
    this.name = "NlpMatchingResponseError";
    this.status = 502;
    this.code = "NLP_MATCHING_INVALID_RESPONSE";
  }
}

async function requestJobMatches(
  payload,
  { fetchImpl = global.fetch, config = getNlpMatchingConfig() } = {},
) {
  if (typeof fetchImpl !== "function") {
    throw new NlpMatchingConnectionError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}/api/v1/job-matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new NlpMatchingTimeoutError();
    throw new NlpMatchingConnectionError();
  } finally {
    clearTimeout(timeout);
  }

  if (!response || !response.ok) {
    throw new NlpMatchingResponseError();
  }

  try {
    return await response.json();
  } catch (error) {
    throw new NlpMatchingResponseError();
  }
}

module.exports = {
  NlpMatchingConnectionError,
  NlpMatchingResponseError,
  NlpMatchingTimeoutError,
  requestJobMatches,
};
