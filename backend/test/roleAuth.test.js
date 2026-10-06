const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");
const {
  authenticateStudentToken,
  authenticateToken,
} = require("../src/middlewares/auth.middleware");
process.env.JWT_SECRET = "role-auth-fixture-key";
function run(guard, claims, options = {}) {
  const token = jwt.sign(claims, process.env.JWT_SECRET, {
    expiresIn: "1h",
    ...options,
  });
  const req = {
    headers: { authorization: `Bearer ${token}` },
    body: { role: "student" },
  };
  const res = {
    statusCode: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json() {},
  };
  let passed = false;
  guard(req, res, () => {
    passed = true;
  });
  return { passed, status: res.statusCode };
}
test("Student guard accepts existing JWTs and explicit Student actor claims", () => {
  for (const extra of [{}, { actor_type: "student", role: "student" }])
    assert.equal(
      run(authenticateStudentToken, {
        id: "fixture-student",
        student_id: "001",
        ...extra,
      }).passed,
      true,
    );
});
test("Student endpoints refuse Staff/Teacher/Head and recovery capabilities despite valid signatures", () => {
  for (const extra of [
    { actor_type: "department_staff", role: "department_staff" },
    { actor_type: "teacher", role: "teacher" },
    { actor_type: "teacher", role: "department_head" },
    { purpose: "recruitment_resend" },
  ]) {
    const claims = extra.purpose
      ? extra
      : { id: "fixture-student", student_id: "001", ...extra };
    assert.equal(run(authenticateStudentToken, claims).status, 403);
  }
});
test("Shared JWT verification restricts signing algorithm to HS256", () => {
  assert.equal(
    run(authenticateToken, { id: "fixture" }, { algorithm: "HS384" }).status,
    401,
  );
});

test("all application routes load with actor middleware before runtime startup", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  for (const file of fs
    .readdirSync(path.join(__dirname, "../src/routes"))
    .filter((file) => file.endsWith(".routes.js"))) {
    assert.ok(require(`../src/routes/${file}`));
  }
});
