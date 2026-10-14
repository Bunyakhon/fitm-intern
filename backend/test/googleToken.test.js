const test = require("node:test");
const assert = require("node:assert/strict");
const { generateKeyPairSync } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { createGoogleTokenVerifier } = require("../src/services/googleToken.service");
const { getGoogleConfig, checkGoogleIdentity } = require("../src/config/oauth");
const clientId = "123-synthetic.apps.googleusercontent.com";
const env = { GOOGLE_LOGIN_ENABLED: "true", GOOGLE_CLIENT_ID: clientId, FRONTEND_URL: "http://localhost:5173",
  GOOGLE_ALLOWED_EMAIL_DOMAINS: "kmutnb.ac.th,email.kmutnb.ac.th", GOOGLE_ALLOWED_HOSTED_DOMAINS: "kmutnb.ac.th" };
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "synthetic-key", use: "sig", alg: "RS256" };
const claims = { sub: "synthetic-subject", email: "synthetic@email.kmutnb.ac.th", email_verified: true, hd: "kmutnb.ac.th", nonce: "synthetic-nonce" };
function sign(extra = {}, options = {}) { return jwt.sign({ ...claims, ...extra }, privateKey,
  { algorithm: "RS256", keyid: jwk.kid, audience: clientId, issuer: "https://accounts.google.com", expiresIn: "1h", ...options }); }
function fixture(body = { keys: [jwk] }) {
  let calls = 0;
  const verify = createGoogleTokenVerifier({ fetchKeys: async (url, options) => {
    calls++; assert.equal(url, "https://www.googleapis.com/oauth2/v3/certs"); assert.equal(options.redirect, "error");
    return new Response(JSON.stringify(body), { headers: { "cache-control": "max-age=600" } });
  } });
  return { verify, calls: () => calls };
}
test("real RSA signature, issuer, audience and nonce claims verify using a pinned JWKS endpoint", async () => {
  const f = fixture(); assert.equal((await f.verify(sign(), clientId)).sub, claims.sub);
  await f.verify(sign(), clientId); assert.equal(f.calls(), 1);
});
test("reject invalid signatures, wrong audience/issuer, expiration, missing exp/iat/nonce and hostile headers", async () => {
  const f = fixture(), attacker = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const tokens = ["broken", "a.b.c", sign({}, { audience: "wrong" }), sign({}, { issuer: "https://attacker.invalid" }),
    sign({}, { expiresIn: -1 }), sign({ nonce: undefined }), sign({ iat: Math.floor(Date.now() / 1000) + 3600 }),
    sign({}, { noTimestamp: true }), sign({}, { keyid: "unknown" }), sign({ azp: "another-client" }),
    jwt.sign(claims, attacker.privateKey, { algorithm: "RS256", keyid: jwk.kid }),
    jwt.sign(claims, "synthetic-secret", { algorithm: "HS256", keyid: jwk.kid }),
    jwt.sign(claims, privateKey, { algorithm: "RS256", keyid: jwk.kid, audience: clientId, issuer: "accounts.google.com" })];
  for (const token of tokens) await assert.rejects(f.verify(token, clientId), { code: "GOOGLE_CREDENTIAL" });
  assert.equal(f.calls(), 1, "unknown kids cannot force repeated provider requests");
});
test("provider network/key/size failures are safe and fail closed", async () => {
  for (const body of [{ keys: [] }, { keys: [{ ...jwk, kty: "EC" }] }, { data: "x".repeat(70000) }]) await assert.rejects(fixture(body).verify(sign(), clientId), { code: "GOOGLE_CREDENTIAL" });
  const verify = createGoogleTokenVerifier({ fetchKeys: async () => { throw Error("sensitive diagnostics"); } });
  await assert.rejects(verify(sign(), clientId), error => error.code === "GOOGLE_CREDENTIAL" && !error.message.includes("sensitive"));
});
test("domain allowlists normalize case, permit only explicitly configured domains and separate hd", () => {
  const cfg = getGoogleConfig(env);
  for (const email of ["synthetic@kmutnb.ac.th", "synthetic@email.kmutnb.ac.th", "SYNTHETIC@EMAIL.KMUTNB.AC.TH"]) assert.ok(checkGoogleIdentity({ ...claims, email }, cfg, "student"));
  for (const email of ["synthetic@gmail.com", "synthetic@fakekmutnb.ac.th", "synthetic@kmutnb.ac.th.attacker.com", "synthetic@other.kmutnb.ac.th", "a@b@kmutnb.ac.th"])
    assert.throws(() => checkGoogleIdentity({ ...claims, email }, cfg, "student"), { status: 403 });
  for (const extra of [{ sub: "" }, { sub: undefined }, { email_verified: "true" }, { email_verified: false }, { hd: "attacker.com" }, { hd: undefined }])
    assert.throws(() => checkGoogleIdentity({ ...claims, ...extra }, cfg, "student"), { status: 403 });
  const custom = getGoogleConfig({ ...env, GOOGLE_ALLOWED_EMAIL_DOMAINS: "example.ac.th", GOOGLE_ALLOWED_HOSTED_DOMAINS: "workspace.example.ac.th" });
  assert.ok(checkGoogleIdentity({ ...claims, email: "synthetic@example.ac.th", hd: "workspace.example.ac.th" }, custom, "student"));
  assert.throws(() => checkGoogleIdentity(claims, custom, "student"), { code: "GOOGLE_DOMAIN" });
});
test("invalid/empty/wildcard policy configuration cannot enable login", () => {
  assert.deepEqual(getGoogleConfig({}), { enabled: false });
  for (const patch of [{ GOOGLE_ALLOWED_EMAIL_DOMAINS: "" }, { GOOGLE_ALLOWED_EMAIL_DOMAINS: "*" }, { GOOGLE_ALLOWED_EMAIL_DOMAINS: "kmutnb.ac.th," },
    { GOOGLE_ALLOWED_EMAIL_DOMAINS: "*.kmutnb.ac.th" }, { GOOGLE_CLIENT_ID: "" }, { GOOGLE_ALLOWED_HOSTED_DOMAINS: "" },
    { GOOGLE_HOSTED_DOMAIN_POLICY: "optional" }, { FRONTEND_URL: "http://example.com" }, { GOOGLE_ALLOWED_EMAIL_DOMAINS_STUDENT: "" }])
    assert.throws(() => getGoogleConfig({ ...env, ...patch }), { code: "GOOGLE_CONFIGURATION" });
  const cfg = getGoogleConfig({ ...env, GOOGLE_HOSTED_DOMAIN_POLICY: "email_only", GOOGLE_ALLOWED_EMAIL_DOMAINS_TEACHER: "kmutnb.ac.th" });
  assert.ok(checkGoogleIdentity({ ...claims, hd: undefined }, cfg, "student"));
  assert.throws(() => checkGoogleIdentity(claims, cfg, "teacher"), { code: "GOOGLE_DOMAIN" });
  assert.throws(() => checkGoogleIdentity(claims, cfg, "admin"), { code: "GOOGLE_ROLE" });
});
