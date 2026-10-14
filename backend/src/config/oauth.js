const ROLES = ["student", "teacher", "department_head", "department_staff"];
function configurationError() {
  return Object.assign(new Error("Google Login configuration is unavailable"), { status: 503, code: "GOOGLE_CONFIGURATION" });
}
function domains(value) {
  if (typeof value !== "string" || !value.trim()) throw configurationError();
  const result = value.split(",").map(part => part.trim().toLowerCase());
  if (result.some(domain => domain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))) throw configurationError();
  return new Set(result);
}
function getGoogleConfig(env = process.env) {
  if (env.GOOGLE_LOGIN_ENABLED !== "true") return { enabled: false };
  if (!/^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID || "")) throw configurationError();
  let origin;
  try {
    const url = new URL(env.FRONTEND_URL);
    if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) throw configurationError();
    origin = url.origin;
  } catch { throw configurationError(); }
  const allowedDomains = domains(env.GOOGLE_ALLOWED_EMAIL_DOMAINS);
  const policy = env.GOOGLE_HOSTED_DOMAIN_POLICY || "required";
  if (!["required", "email_only"].includes(policy)) throw configurationError();
  const hostedDomains = policy === "required" ? domains(env.GOOGLE_ALLOWED_HOSTED_DOMAINS) : new Set();
  const roleDomains = Object.fromEntries(ROLES.map(role => {
    const key = `GOOGLE_ALLOWED_EMAIL_DOMAINS_${role.toUpperCase()}`;
    return [role, env[key] === undefined ? allowedDomains : domains(env[key])];
  }));
  return { enabled: true, linkingEnabled: env.GOOGLE_ACCOUNT_LINKING_ENABLED === "true", clientId: env.GOOGLE_CLIENT_ID, origin, allowedDomains, hostedDomains, policy, roleDomains };
}
function checkGoogleIdentity(payload, config, role) {
  const deny = code => { throw Object.assign(new Error("Google account is not authorized"), { status: 403, code }); };
  if (!ROLES.includes(role)) deny("GOOGLE_ROLE");
  if (typeof payload?.sub !== "string" || !payload.sub || payload.sub.length > 255 || payload.email_verified !== true) deny("GOOGLE_IDENTITY");
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email)) deny("GOOGLE_IDENTITY");
  const domain = email.split("@")[1];
  if (!config.allowedDomains.has(domain) || !config.roleDomains[role].has(domain)) deny("GOOGLE_DOMAIN");
  if (config.policy === "required" && (typeof payload.hd !== "string" || !config.hostedDomains.has(payload.hd.toLowerCase()))) deny("GOOGLE_HOSTED_DOMAIN");
  return { subject: payload.sub, email, nonce: payload.nonce, hostedDomain: payload.hd };
}
module.exports = { ROLES, domains, getGoogleConfig, checkGoogleIdentity };
