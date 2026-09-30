const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "staff-auth-test-secret";

const { DepartmentStaff } = require("../src/models");
const {
  createStaffLoginHandler,
} = require("../src/controllers/staffAuth.controller");
const {
  authenticateToken,
  createRequireDepartmentStaff,
} = require("../src/middlewares/auth.middleware");
const {
  DEPARTMENT_STAFF_ACTOR_TYPE,
  DEPARTMENT_STAFF_ROLE,
  issueDepartmentStaffToken,
} = require("../src/services/staffAuth.service");

const staffIdentity = {
  id: "4d1d0f57-bbfc-4a90-baaa-59c3f2b887fa",
  first_name: "Department",
  last_name: "Staff",
  email: "staff@example.test",
  password_hash: "hash-must-never-leave-response",
  is_active: true,
  async comparePassword(password) {
    return password === "correct-password";
  },
};

function responseCollector() {
  return {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function authenticateRequest(token, extras = {}) {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    ...extras,
  };
  const res = responseCollector();
  let proceeded = false;
  authenticateToken(req, res, () => {
    proceeded = true;
  });
  return { req, res, proceeded };
}

async function authorizeStaff(req, staff = { id: staffIdentity.id }) {
  const middleware = createRequireDepartmentStaff({
    StaffModel: { findOne: async () => staff },
  });
  const res = responseCollector();
  let proceeded = false;
  await middleware(req, res, () => {
    proceeded = true;
  });
  return { res, proceeded };
}

test("DepartmentStaff hashes a supplied password and omits its hash from JSON", async () => {
  const staff = DepartmentStaff.build({
    first_name: "Test",
    last_name: "Staff",
    email: "model@example.test",
    password: "correct-password",
  });
  await staff.validate();
  assert.notEqual(staff.password_hash, "correct-password");
  assert.equal(await staff.comparePassword("correct-password"), true);
  assert.equal("password_hash" in staff.toJSON(), false);
});

test("valid department staff login returns a signed token and safe profile", async () => {
  const handler = createStaffLoginHandler({
    DepartmentStaff: { findOne: async () => staffIdentity },
    issueToken: () => "signed-staff-token",
  });
  const res = responseCollector();
  await handler(
    { body: { email: " STAFF@EXAMPLE.TEST ", password: "correct-password" } },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.token, "signed-staff-token");
  assert.equal(res.body.staff.email, staffIdentity.email);
  assert.equal(JSON.stringify(res.body).includes("password_hash"), false);
  assert.equal(JSON.stringify(res.body).includes("correct-password"), false);
});

test("staff login safely rejects unknown email, wrong password, and inactive accounts", async () => {
  for (const staff of [
    null,
    { ...staffIdentity, comparePassword: async () => false },
    { ...staffIdentity, is_active: false },
  ]) {
    const handler = createStaffLoginHandler({
      DepartmentStaff: { findOne: async () => staff },
      issueToken: () => assert.fail("rejected credentials must not issue a token"),
    });
    const res = responseCollector();
    await handler(
      { body: { email: "staff@example.test", password: "wrong-password" } },
      res,
    );
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Invalid staff credentials");
  }
});

test("staff JWT carries only server-issued department-staff authorization claims", () => {
  const token = issueDepartmentStaffToken(staffIdentity);
  const claims = jwt.verify(token, process.env.JWT_SECRET);
  assert.equal(claims.id, staffIdentity.id);
  assert.equal(claims.staff_id, staffIdentity.id);
  assert.equal(claims.actor_type, DEPARTMENT_STAFF_ACTOR_TYPE);
  assert.equal(claims.role, DEPARTMENT_STAFF_ROLE);
});

test("valid staff JWT authenticates and passes department staff authorization", async () => {
  const authenticated = authenticateRequest(issueDepartmentStaffToken(staffIdentity));
  assert.equal(authenticated.proceeded, true);
  const authorized = await authorizeStaff(authenticated.req);
  assert.equal(authorized.proceeded, true);
  assert.equal(authorized.res.statusCode, undefined);
});

test("student JWT and client-supplied role hints cannot pass staff authorization", async () => {
  const studentToken = jwt.sign(
    { id: staffIdentity.id, student_id: "student-1", email: "student@example.test", track: "co_op" },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
  const authenticated = authenticateRequest(studentToken, {
    body: { role: DEPARTMENT_STAFF_ROLE },
    headers: {
      authorization: `Bearer ${studentToken}`,
      "x-role": DEPARTMENT_STAFF_ROLE,
    },
  });
  assert.equal(authenticated.proceeded, true);
  const authorized = await authorizeStaff(authenticated.req);
  assert.equal(authorized.proceeded, false);
  assert.equal(authorized.res.statusCode, 403);
});

test("missing, malformed, and expired JWTs are rejected before staff authorization", async () => {
  const missing = authenticateRequest();
  assert.equal(missing.proceeded, false);
  assert.equal(missing.res.statusCode, 401);

  const malformed = authenticateRequest("not-a-jwt");
  assert.equal(malformed.proceeded, false);
  assert.equal(malformed.res.statusCode, 401);

  const expired = authenticateRequest(
    jwt.sign(
      { id: staffIdentity.id, actor_type: DEPARTMENT_STAFF_ACTOR_TYPE, role: DEPARTMENT_STAFF_ROLE, staff_id: staffIdentity.id },
      process.env.JWT_SECRET,
      { expiresIn: "-1s" },
    ),
  );
  assert.equal(expired.proceeded, false);
  assert.equal(expired.res.statusCode, 401);
});

test("inactive staff records fail authorization even with a valid staff JWT", async () => {
  const authenticated = authenticateRequest(issueDepartmentStaffToken(staffIdentity));
  const authorized = await authorizeStaff(authenticated.req, null);
  assert.equal(authorized.proceeded, false);
  assert.equal(authorized.res.statusCode, 403);
});
