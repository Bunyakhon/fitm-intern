const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createGoogleAuthRouter } = require("../src/routes/googleAuth.routes");
const { getGoogleConfig } = require("../src/config/oauth");
const { createGoogleAuthService } = require("../src/services/googleAuth.service");
test("HTTP JSON/origin/no-store checks, strict input and safe failures", async t => {
  const config = () => ({ enabled: true, origin: "http://localhost:5173" });
  let calls = 0;
  const service = { configuration: async () => ({ enabled: false }), challenge: async () => { calls++; return { nonce: "synthetic-nonce" }; },
    authenticate: async () => { throw Error("password/token/ORM details"); }, onboard: async () => { throw Object.assign(Error("Approval required"), { status: 503, code: "GOOGLE_ONBOARDING_APPROVAL_REQUIRED" }); } };
  const app = express(); app.use(express.json()); app.use("/google", createGoogleAuthRouter({ config, service }));
  app.use((error, req, res, next) => res.status(400).json({ message: "Invalid JSON" }));
  const server = app.listen(0, "127.0.0.1"); await new Promise(resolve => server.once("listening", resolve)); t.after(() => server.close());
  const origin = "http://127.0.0.1:" + server.address().port;
  const request = (path, body, headers = {}) => fetch(origin + path, { method: "POST", headers: { "Content-Type": "application/json", Origin: config().origin, ...headers }, body: JSON.stringify(body) });
  const valid = await request("/google/challenge", { role: "student", purpose: "login" }); assert.equal(valid.status, 200); assert.equal(valid.headers.get("cache-control"), "no-store");
  for (const patch of [{ Origin: "http://attacker.invalid" }, { Origin: "null" }, { Origin: "" }, { "Content-Type": "text/plain" }]) assert.ok([400, 403].includes((await request("/google/challenge", {}, patch)).status));
  for (const body of [[], "invalid", { role: "student", redirect: "https://attacker.invalid" }]) assert.equal((await request("/google/challenge", body)).status, 400);
  assert.equal(calls, 1);
  const failed = await request("/google/login", {}); assert.equal(failed.status, 500); assert.ok(!(await failed.text()).includes("ORM"));
  assert.equal((await request("/google/onboard", {})).status, 503);
});
test("disabled feature and missing schema fail closed without identity writes", async () => {
  const models = { sequelize: { query: async () => [{ ready: false }] } };
  const config = () => getGoogleConfig({ GOOGLE_LOGIN_ENABLED: "true", GOOGLE_CLIENT_ID: "123-synthetic.apps.googleusercontent.com", FRONTEND_URL: "http://localhost:5173",
    GOOGLE_ALLOWED_EMAIL_DOMAINS: "kmutnb.ac.th", GOOGLE_ALLOWED_HOSTED_DOMAINS: "kmutnb.ac.th" });
  const service = createGoogleAuthService({ models, config });
  await assert.rejects(service.configuration(), { code: "GOOGLE_SCHEMA_REQUIRED" });
  await assert.rejects(service.challenge({ role: "student", purpose: "link" }), { code: "GOOGLE_LINK_APPROVAL_REQUIRED" });
  await assert.rejects(service.onboard(), { code: "GOOGLE_ONBOARDING_APPROVAL_REQUIRED" });
  const disabled = createGoogleAuthService({ models: {}, config: () => ({ enabled: false }) });
  assert.deepEqual(await disabled.configuration(), { enabled: false });
  await assert.rejects(disabled.challenge({ role: "student", purpose: "login" }), { code: "GOOGLE_DISABLED" });
});
