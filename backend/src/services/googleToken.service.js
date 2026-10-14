const { createPublicKey } = require("node:crypto");
const jwt = require("jsonwebtoken");
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const invalid = () => Object.assign(new Error("Google credential is invalid or expired"), { status: 401, code: "GOOGLE_CREDENTIAL" });

// Only Google's pinned HTTPS endpoint supplies keys. Credential headers cannot
// select a network URL. Bounded cache, response size and timeout; fail closed.
function createGoogleTokenVerifier({ fetchKeys = fetch, now = Date.now } = {}) {
  let keys = new Map(), expires = 0, pending;
  async function refresh() {
    if (!pending) pending = (async () => {
      const response = await fetchKeys(JWKS_URL, { signal: AbortSignal.timeout(5000), redirect: "error" });
      if (!response.ok) throw invalid();
      const reader = response.body.getReader();
      const chunks = []; let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 65536) throw invalid();
          chunks.push(Buffer.from(value));
        }
      } finally { await reader.cancel(); }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!Array.isArray(body.keys) || !body.keys.length || body.keys.length > 20) throw invalid();
      const next = new Map();
      for (const jwk of body.keys) {
        if (jwk.kty !== "RSA" || jwk.alg !== "RS256" || jwk.use !== "sig" || typeof jwk.kid !== "string") continue;
        next.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
      }
      if (!next.size) throw invalid();
      keys = next;
      const maxAge = Number(/(?:^|[,\s])max-age=(\d+)/i.exec(response.headers.get("cache-control") || "")?.[1] || 300);
      expires = now() + Math.max(30, Math.min(maxAge, 3600)) * 1000;
    })().finally(() => { pending = undefined; });
    await pending;
  }
  return async function verify(credential, clientId) {
    try {
      if (typeof credential !== "string" || credential.length > 16384 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(credential)) throw invalid();
      const decoded = jwt.decode(credential, { complete: true });
      if (decoded?.header.alg !== "RS256" || typeof decoded.header.kid !== "string" || decoded.header.kid.length > 256) throw invalid();
      // Unknown kid does not trigger unbounded refreshes; next expiry handles rotation.
      if (expires <= now()) await refresh();
      const key = keys.get(decoded.header.kid);
      if (!key) throw invalid();
      const payload = jwt.verify(credential, key, { algorithms: ["RS256"], audience: clientId,
        issuer: ["accounts.google.com", "https://accounts.google.com"], clockTimestamp: Math.floor(now() / 1000) });
      if (payload.aud !== clientId || (payload.azp !== undefined && payload.azp !== clientId)
        || !Number.isFinite(payload.exp) || !Number.isFinite(payload.iat) || payload.iat > now() / 1000 + 60
        || typeof payload.nonce !== "string" || !payload.nonce) throw invalid();
      return payload;
    } catch { throw invalid(); }
  };
}
module.exports = { createGoogleTokenVerifier };
