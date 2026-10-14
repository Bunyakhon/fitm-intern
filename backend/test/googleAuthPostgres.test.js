const test = require("node:test");
const assert = require("node:assert/strict");
const { Sequelize, DataTypes } = require("sequelize");
const jwt = require("jsonwebtoken");
const { createGoogleAuthService } = require("../src/services/googleAuth.service");
const { getGoogleConfig } = require("../src/config/oauth");
test("Google linking/login, transactions, constraints and replay on disposable PostgreSQL", { skip: !process.env.FITM_GOOGLE_TEST_PORT }, async t => {
  const port = Number(process.env.FITM_GOOGLE_TEST_PORT);
  assert.ok(Number.isInteger(port) && port > 1024);
  assert.match(process.env.FITM_GOOGLE_TEST_CONTAINER || "", /^fitm-google-test-[a-f0-9]{16}$/);
  const db = new Sequelize("fitm_google_test", "postgres", "synthetic-test-only", { host: "127.0.0.1", port, dialect: "postgres", logging: false });
  t.after(() => db.close());
  assert.equal((await db.query("SELECT current_database() AS name"))[0][0].name, "fitm_google_test");
  const Student = require("../src/models/student.model")(db), Teacher = require("../src/models/teacher.model")(db),
    DepartmentStaff = require("../src/models/departmentStaff.model")(db), GoogleIdentity = require("../src/models/googleIdentity.model")(db),
    GoogleAuthRequest = require("../src/models/googleAuthRequest.model")(db);
  // Brand-new synthetic DB only. No force/alter, no Development model registry.
  await Teacher.sync(); await DepartmentStaff.sync(); await Student.sync();
  const { Umzug, SequelizeStorage } = require("umzug");
  const readiness = require("../src/db/googleOAuth026");
  const baselineRunner = new Umzug({
    migrations: readiness.DEPENDENCIES.map(name => ({ name, ...require("../src/db/migrations/" + name) })),
    context: db.getQueryInterface(), storage: new SequelizeStorage({ sequelize: db, tableName: "sequelize_meta" }), logger: undefined,
  });
  await baselineRunner.up({ migrations: readiness.DEPENDENCIES });
  const baseline = await readiness.preflight(db, { expectedHash: readiness.sourceHash(), env: {} });
  const installed = await readiness.install(db, { expectedHash: readiness.sourceHash(), expectedTarget: baseline.snapshot.target, baseline, env: {} });
  assert.equal(installed.state, "INSTALLED");
  assert.ok(installed.snapshot.ledger.includes(readiness.NAME));
  const Profile = db.define("PreservedProfile", { student_id: { type: DataTypes.UUID, primaryKey: true }, snapshot: DataTypes.JSONB }, { tableName: "test_profile_preservation", timestamps: false });
  await Profile.sync();
  const password = "synthetic-password";
  const student = await Student.create({ student_id: "SYNTHETIC-001", first_name: "Synthetic", last_name: "Student", email: "student@email.kmutnb.ac.th", password });
  const student2 = await Student.create({ student_id: "SYNTHETIC-002", first_name: "Synthetic", last_name: "Other", email: "other@email.kmutnb.ac.th", password });
  const teacher = await Teacher.create({ first_name: "Synthetic", last_name: "Teacher", email: "teacher@kmutnb.ac.th", password, status: "active", department: "Synthetic" });
  const head = await Teacher.create({ first_name: "Synthetic", last_name: "Head", email: "head@kmutnb.ac.th", password, status: "active", is_department_head: true, department: "Synthetic" });
  const staff = await DepartmentStaff.create({ first_name: "Synthetic", last_name: "Staff", email: "staff@kmutnb.ac.th", password });
  const snapshot = { revision: "synthetic-revision", five_tabs: ["original", "contact", "education", "documents", "account"], resume: "private", draft: "original", relationships: ["original"] };
  await Profile.create({ student_id: student.id, snapshot });
  const before = student.toJSON();
  const env = { GOOGLE_LOGIN_ENABLED: "true", GOOGLE_ACCOUNT_LINKING_ENABLED: "true", GOOGLE_CLIENT_ID: "123-synthetic.apps.googleusercontent.com",
    GOOGLE_ALLOWED_EMAIL_DOMAINS: "kmutnb.ac.th,email.kmutnb.ac.th", GOOGLE_ALLOWED_HOSTED_DOMAINS: "kmutnb.ac.th", FRONTEND_URL: "http://localhost:5173" };
  const secretBefore = process.env.JWT_SECRET; process.env.JWT_SECRET = "synthetic-google-integration-key";
  t.after(() => { if (secretBefore === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secretBefore; });
  const models = { Student, Teacher, DepartmentStaff, GoogleIdentity, GoogleAuthRequest, sequelize: db };
  // Provider claims are explicitly mocked here; RSA validation has a separate suite.
  const service = createGoogleAuthService({ models, config: () => getGoogleConfig(env), verify: async credential => JSON.parse(credential) });
  async function input(role, purpose, subject = "shared-google", email = "verified@email.kmutnb.ac.th", extra = {}) {
    const challenge = await service.challenge({ role, purpose });
    return { role, purpose, requestId: challenge.requestId, requestToken: challenge.requestToken,
      credential: JSON.stringify({ sub: subject, email, email_verified: true, hd: "kmutnb.ac.th", nonce: challenge.nonce }), ...extra };
  }
  const link = (role, actor, subject = "shared-google") => input(role, "link", subject, undefined, { email: actor.email, password });
  await t.test("no auto-link or account creation even when verified email matches", async () => {
    await assert.rejects(service.authenticate(await input("student", "login", "shared-google", student.email)), { code: "GOOGLE_LINK_REQUIRED" });
    assert.equal(await GoogleIdentity.count(), 0); assert.equal(await Student.count(), 2);
  });
  await t.test("ownership failure and transaction rollback preserve all rows", async () => {
    const body = await link("student", student); body.password = "wrong";
    await assert.rejects(service.authenticate(body), { code: "GOOGLE_OWNERSHIP" });
    assert.equal((await GoogleAuthRequest.findByPk(body.requestId)).consumed_at, null);
    assert.equal(await GoogleIdentity.count(), 0);
  });
  await t.test("all four role portals authenticate from explicit actor mapping", async () => {
    for (const [role, actor, subject] of [["student", student, "shared-google"], ["teacher", teacher, "shared-google"], ["department_head", head, "head-google"], ["department_staff", staff, "shared-google"]]) {
      const body = await link(role, actor, subject), result = await service.authenticate(body);
      const claims = jwt.verify(result.token, process.env.JWT_SECRET);
      assert.equal(claims.id, actor.id); assert.equal(claims.role, role);
      assert.ok(!JSON.stringify(result).includes("password_hash"));
      await assert.rejects(service.authenticate(body), { code: "GOOGLE_REQUEST_INVALID" });
      const again = await service.authenticate(await input(role, "login", subject)); assert.equal(jwt.verify(again.token, process.env.JWT_SECRET).id, actor.id);
    }
    assert.equal(await GoogleIdentity.count(), 4);
  });
  await t.test("nonce/browser binding, role/purpose, expiry and cross-role tampering fail", async () => {
    for (const patch of [body => ({ ...body, requestToken: "x".repeat(43) }), body => ({ ...body, role: "department_staff" }),
      body => ({ ...body, purpose: "link", email: student.email, password }), body => ({ ...body, credential: JSON.stringify({ ...JSON.parse(body.credential), nonce: "wrong" }) })]) {
      await assert.rejects(service.authenticate(patch(await input("student", "login"))), { code: "GOOGLE_REQUEST_INVALID" });
    }
    const expired = await input("student", "login"); await GoogleAuthRequest.update({ expires_at: new Date(0) }, { where: { id: expired.requestId } });
    await assert.rejects(service.authenticate(expired), { code: "GOOGLE_REQUEST_INVALID" });
    await assert.rejects(service.authenticate(await input("department_head", "login")), { code: "GOOGLE_ACCOUNT_UNAUTHORIZED" });
  });
  await t.test("current domain policy applies to previously linked subjects", async () => {
    const body = await input("student", "login"); env.GOOGLE_ALLOWED_EMAIL_DOMAINS = "kmutnb.ac.th";
    await assert.rejects(service.authenticate(body), { code: "GOOGLE_DOMAIN" }); env.GOOGLE_ALLOWED_EMAIL_DOMAINS += ",email.kmutnb.ac.th";
  });
  await t.test("inactive actors and removed Head privilege are checked in live DB", async () => {
    await teacher.update({ status: "inactive" }); await assert.rejects(service.authenticate(await input("teacher", "login")), { code: "GOOGLE_ACCOUNT_UNAUTHORIZED" }); await teacher.update({ status: "active" });
    await staff.update({ is_active: false }); await assert.rejects(service.authenticate(await input("department_staff", "login")), { code: "GOOGLE_ACCOUNT_UNAUTHORIZED" }); await staff.update({ is_active: true });
    await head.update({ is_department_head: false }); await assert.rejects(service.authenticate(await input("department_head", "login", "head-google")), { code: "GOOGLE_ACCOUNT_UNAUTHORIZED" }); await head.update({ is_department_head: true });
  });
  await t.test("subject and internal-account collisions cannot overwrite mapping", async () => {
    await assert.rejects(service.authenticate(await link("student", student2)), { code: "GOOGLE_IDENTITY_CONFLICT" });
    await assert.rejects(service.authenticate(await link("student", student, "another-subject")), { code: "GOOGLE_IDENTITY_CONFLICT" });
  });
  await t.test("concurrent duplicate login request has exactly one success", async () => {
    const body = await input("student", "login"), results = await Promise.allSettled([service.authenticate(body), service.authenticate(body)]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.find(result => result.status === "rejected").reason.code, "GOOGLE_REQUEST_INVALID");
  });
  await t.test("concurrent linking to the same actor persists one identity", async () => {
    const bodies = await Promise.all([link("student", student2, "race-a"), link("student", student2, "race-b")]);
    const results = await Promise.allSettled(bodies.map(body => service.authenticate(body)));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(await GoogleIdentity.count({ where: { student_id: student2.id } }), 1);
  });
  await t.test("the same Google subject racing across different actors has one winner", async () => {
    const teachers = await Promise.all(["a", "b"].map(key => Teacher.create({ first_name: "Synthetic", last_name: "Race", email: `race-${key}@kmutnb.ac.th`, password, status: "active" })));
    const bodies = await Promise.all(teachers.map(actor => link("teacher", actor, "same-racing-subject")));
    const results = await Promise.allSettled(bodies.map(body => service.authenticate(body)));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.find(result => result.status === "rejected").reason.code, "GOOGLE_IDENTITY_CONFLICT");
    assert.equal(await GoogleIdentity.count({ where: { subject: "same-racing-subject", actor_type: "teacher" } }), 1);
  });
  await t.test("no-password accounts require administrator assistance; no bypass is available", async () => {
    const actor = await Teacher.create({ first_name: "Synthetic", last_name: "NoPassword", email: "no-password@kmutnb.ac.th", status: "active" });
    await assert.rejects(service.authenticate(await link("teacher", actor, "no-password-subject")), { code: "GOOGLE_OWNERSHIP" });
  });
  await t.test("failure after identity insert rolls back both mapping and nonce consumption", async () => {
    const actor = await Teacher.create({ first_name: "Synthetic", last_name: "Rollback", email: "rollback@kmutnb.ac.th", password, status: "active" });
    const body = await link("teacher", actor, "rollback-subject"), key = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try { await assert.rejects(service.authenticate(body)); } finally { process.env.JWT_SECRET = key; }
    assert.equal(await GoogleIdentity.count({ where: { subject: "rollback-subject" } }), 0);
    assert.equal((await GoogleAuthRequest.findByPk(body.requestId)).consumed_at, null);
  });
  await t.test("database FKs and actor-isolation CHECK enforce mapping integrity", async () => {
    await assert.rejects(GoogleIdentity.create({ subject: "invalid-map", actor_type: "student", teacher_id: teacher.id }));
    await assert.rejects(GoogleIdentity.create({ subject: "invalid-map", actor_type: "student", student_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }));
    await assert.rejects(GoogleIdentity.create({ subject: "shared-google", actor_type: "student", student_id: student2.id }));
  });
  await t.test("Student rows, password login and profile sentinel remain unchanged", async () => {
    assert.deepEqual((await Student.findByPk(student.id)).toJSON(), before);
    assert.deepEqual((await Profile.findByPk(student.id)).snapshot, snapshot);
    assert.equal(await student.comparePassword(password), true);
    assert.equal(await teacher.comparePassword(password), true);
    assert.equal(await staff.comparePassword(password), true);
    await assert.rejects(service.onboard(), { code: "GOOGLE_ONBOARDING_APPROVAL_REQUIRED" });
    assert.equal(await Student.count(), 2);
  });
});
