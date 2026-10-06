const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const http = require("node:http");
const express = require("express");
const { Sequelize } = require("sequelize");
const { Umzug, SequelizeStorage } = require("umzug");
const {
  createJobSubmissionHandler,
  createResendVerificationHandler,
  createVerifyEmailHandler,
} = require("../src/controllers/jobSubmission.controller");
const {
  createPublicJobSubmission,
} = require("../src/services/jobSubmission.service");
const {
  verifyCompanyEmail,
  recoverCompanyVerification,
  hashVerificationToken,
  getResendableCompanyVerification,
} = require("../src/services/companyVerification.service");
const { verifyTurnstileToken } = require("../src/services/captcha.service");
const {
  buildCompanyVerificationUrl,
} = require("../src/services/email.service");

function payload() {
  const job = {
    title: "Test internship",
    category: "information_technology",
    description: "Develop and test application features with the team.",
    quota: 2,
    compensation: "Negotiable",
    workDaysPerWeek: 5,
    workModes: ["onsite", "hybrid"],
  };
  return {
    company: {
      name: "Lifecycle Company",
      email: "hr@example.test",
      phone: "021234567",
      addressNo: "1",
      subdistrict: "Bang Sue",
      district: "Bang Sue",
      province: "Bangkok",
    },
    jobPostings: [job, { ...job, title: "Second internship" }],
    captchaToken: "provider-boundary-fixture",
  };
}
test(
  "Recruitment HTTP/controller/service/PostgreSQL lifecycle on disposable DB",
  { skip: process.env.ROLE_BACKEND_INTEGRATION_TEST !== "true" },
  async (t) => {
    const sequelize = new Sequelize("fitm_recruitment_test", "postgres", null, {
      host: "a013-postgres",
      dialect: "postgres",
      logging: false,
    });
    let server;
    try {
      process.env.TURNSTILE_EXPECTED_HOSTNAME = "localhost";
      delete process.env.TURNSTILE_EXPECTED_ACTION;
      const [guard] = await sequelize.query(
        "SELECT current_database() AS db, current_setting('fitm.a013_disposable', true) AS disposable",
        { type: Sequelize.QueryTypes.SELECT },
      );
      assert.equal(guard.db, "fitm_recruitment_test");
      assert.equal(guard.disposable, "on");
      const registry = { sequelize };
      // Load real model definitions without the application's configured database.
      const fs = require("node:fs");
      for (const file of fs
        .readdirSync(path.join(__dirname, "../src/models"))
        .filter((f) => f.endsWith(".model.js"))) {
        const model = require(`../src/models/${file}`)(sequelize);
        registry[model.name] = model;
      }
      for (const model of Object.values(registry))
        if (model.associate) model.associate(registry);
      const umzug = new Umzug({
        migrations: {
          glob: [
            "00*.js",
            { cwd: path.join(__dirname, "../src/db/migrations") },
          ],
        },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({
          sequelize,
          tableName: "sequelize_meta",
        }),
        logger: undefined,
      });
      await umzug.up();
      let sentToken,
        failEmail = true;
      const sendVerificationEmail = async ({ token }) => {
        if (failEmail) throw new Error("mock SMTP failure");
        sentToken = token;
      };
      const app = express();
      app.use(express.json());
      app.post(
        "/submit",
        createJobSubmissionHandler({
          createSubmission: (p) => createPublicJobSubmission(p, registry),
          verifyCaptcha: (token) =>
            verifyTurnstileToken(
              token,
              {},
              {
                fetch: async () =>
                  new Response(
                    JSON.stringify({ success: true, hostname: "localhost" }),
                  ),
              },
            ),
          sendVerificationEmail,
        }),
      );
      app.post(
        "/resend",
        createResendVerificationHandler({
          recoverVerification: (id) => recoverCompanyVerification(id, registry),
          sendVerificationEmail,
        }),
      );
      app.post(
        "/verify",
        createVerifyEmailHandler({
          verifyEmail: (token) => verifyCompanyEmail(token, registry),
        }),
      );
      app.use(
        "/api/job-submissions",
        require("../src/routes/jobSubmission.routes").createJobSubmissionRouter(
          {
            createSubmission: (p) => createPublicJobSubmission(p, registry),
            verifyCaptcha: async () => true,
            verifyEmail: (token) => verifyCompanyEmail(token, registry),
            recoverVerification: (id) =>
              recoverCompanyVerification(id, registry),
            sendVerificationEmail,
          },
        ),
      );
      server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const url = `http://127.0.0.1:${server.address().port}`;
      const post = (route, body, cookie) =>
        fetch(url + route, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(cookie ? { cookie } : {}),
          },
          body: JSON.stringify(body),
        });
      let submissionId, cookie;
      await t.test(
        "SMTP failure commits safe rows and sets only an HttpOnly recovery capability",
        async () => {
          const response = await post("/submit", payload());
          assert.equal(response.status, 202);
          cookie = response.headers.get("set-cookie");
          assert.match(cookie, /HttpOnly/);
          assert.match(cookie, /SameSite=Lax/);
          const body = await response.json();
          submissionId = body.submission.id;
          assert.equal(body.emailSent, false);
          assert.equal(body.submission.jobCount, 2);
          assert.equal(
            /token|hash|capability/i.test(JSON.stringify(body)),
            false,
          );
          assert.equal(
            await registry.JobPosting.count({
              where: {
                submission_id: submissionId,
                status: "pending_email_verification",
              },
            }),
            2,
          );
        },
      );
      await t.test(
        "secure browser resend generates an email link and revokes the old token",
        async () => {
          assert.equal((await post("/resend", {})).status, 401);
          failEmail = false;
          assert.equal((await post("/resend", {}, cookie)).status, 200);
          const rows = await registry.CompanyAccessToken.findAll({
            where: { job_submission_id: submissionId },
          });
          assert.equal(rows.length, 2);
          assert.equal(rows.filter((r) => r.revoked_at).length, 1);
          assert.ok(
            rows.find((r) => r.token_hash === hashVerificationToken(sentToken)),
          );
          assert.equal(
            rows.some((r) => r.token_hash === sentToken),
            false,
          );
          const link = new URL(buildCompanyVerificationUrl(sentToken));
          assert.equal(link.origin, "http://localhost:5173");
          assert.equal(
            link.pathname,
            "/src/recruit_student/recruit_verify_email.html",
          );
          assert.ok(link.searchParams.get("token") === sentToken);
        },
      );
      await t.test(
        "verification transitions both jobs to pending_review and cannot be reused or resent",
        async () => {
          const response = await post("/verify", { token: sentToken });
          assert.equal(response.status, 200);
          assert.match(
            (await response.json()).message,
            /awaiting staff review/,
          );
          assert.equal(
            await registry.JobPosting.count({
              where: { submission_id: submissionId, status: "pending_review" },
            }),
            2,
          );
          assert.equal(
            await registry.JobPosting.count({ where: { status: "published" } }),
            0,
          );
          assert.equal(
            (await post("/verify", { token: sentToken })).status,
            410,
          );
          assert.equal((await post("/resend", {}, cookie)).status, 410);
          assert.equal(
            (await post("/verify", { token: "invalid-fixture" })).status,
            404,
          );
        },
      );
      await t.test(
        "expired email capability cannot verify or resend",
        async () => {
          const result = await createPublicJobSubmission(
            require("../src/validators/jobSubmission.validator").validateJobSubmissionPayload(
              payload(),
            ),
            registry,
          );
          await sequelize.query(
            "UPDATE company_access_tokens SET created_at = NOW() - INTERVAL '2 hours', expires_at = NOW() - INTERVAL '1 hour' WHERE id = :id",
            { replacements: { id: result.verificationTokenRecord.id } },
          );
          await assert.rejects(
            () => verifyCompanyEmail(result.verificationToken, registry),
            (e) => e.status === 410,
          );
          await assert.rejects(
            () =>
              getResendableCompanyVerification(
                result.verificationToken,
                registry,
              ),
            (e) => e.status === 410,
          );
        },
      );
      await t.test(
        "failure after company/submission/job creation rolls the complete transaction back",
        async () => {
          const before = await Promise.all([
            registry.Company.count(),
            registry.JobSubmission.count(),
            registry.JobPosting.count(),
            registry.CompanyAccessToken.count(),
          ]);
          const failing = {
            ...registry,
            JobPostingWorkMode: {
              bulkCreate: async () => {
                throw new Error("injected write failure");
              },
            },
          };
          await assert.rejects(() =>
            createPublicJobSubmission(
              require("../src/validators/jobSubmission.validator").validateJobSubmissionPayload(
                payload(),
              ),
              failing,
            ),
          );
          assert.deepEqual(
            await Promise.all([
              registry.Company.count(),
              registry.JobSubmission.count(),
              registry.JobPosting.count(),
              registry.CompanyAccessToken.count(),
            ]),
            before,
          );
        },
      );
      await t.test(
        "real route feature gate and recovery origin check precede mutation",
        async () => {
          const count = await registry.JobSubmission.count();
          process.env.RECRUITMENT_SUBMISSION_ENABLED = "false";
          assert.equal(
            (await post("/api/job-submissions", payload())).status,
            503,
          );
          assert.equal(await registry.JobSubmission.count(), count);
          process.env.RECRUITMENT_SUBMISSION_ENABLED = "true";
          assert.equal(
            (await post("/api/job-submissions/resend-verification", {}, cookie))
              .status,
            403,
          );
          const response = await fetch(
            url + "/api/job-submissions/resend-verification",
            {
              method: "POST",
              headers: {
                origin: "http://localhost:5173",
                "content-type": "application/json",
                cookie,
              },
              body: "{}",
            },
          );
          assert.equal(response.status, 410); // correct origin; already verified capability
          assert.equal(
            (await post("/verify", { token: "fixture", status: "published" }))
              .status,
            400,
          );
        },
      );
      await t.test(
        "expired, tampered and wrong-purpose signed recovery cookies are refused",
        async () => {
          const jwt = require("jsonwebtoken");
          for (const capability of [
            "malformed",
            jwt.sign(
              { purpose: "recruitment_resend", submissionId },
              process.env.JWT_SECRET,
              { expiresIn: -1 },
            ),
            jwt.sign(
              { purpose: "student", submissionId },
              process.env.JWT_SECRET,
            ),
          ]) {
            assert.equal(
              (await post("/resend", {}, `recruitment_resend=${capability}`))
                .status,
              401,
            );
          }
        },
      );
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await sequelize.close();
    }
  },
);
