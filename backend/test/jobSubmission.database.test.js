const assert = require("node:assert/strict");
const test = require("node:test");

const models = require("../src/models");
const {
  createPublicJobSubmission,
} = require("../src/services/jobSubmission.service");
const {
  validateJobSubmissionPayload,
} = require("../src/validators/jobSubmission.validator");
const {
  CompanyVerificationError,
  hashVerificationToken,
  verifyCompanyEmail,
} = require("../src/services/companyVerification.service");

const runDatabaseTest = process.env.RECRUITMENT_INTEGRATION_TEST === "true";

test(
  "PostgreSQL transaction creates every row then leaves no rows after forced rollback",
  {
    skip:
      !runDatabaseTest &&
      "set RECRUITMENT_INTEGRATION_TEST=true to run against a safe configured database",
  },
  async () => {
    const payload = validateJobSubmissionPayload({
      company: {
        name: "Database rollback verification company",
        email: "database-rollback@example.test",
        phone: "02-123-4567",
        addressNo: "12/3",
        moo: null,
        subdistrict: "Bang Sue",
        district: "Bang Sue",
        province: "Bangkok",
      },
      jobPostings: [
        {
          title: "Database verification job one",
          category: "information_technology",
          description:
            "This description verifies transactional PostgreSQL inserts safely.",
          quota: 1,
          compensation: "Negotiable",
          workDaysPerWeek: 5,
          workModes: ["onsite", "hybrid"],
        },
        {
          title: "Database verification job two",
          category: "business",
          description:
            "This description verifies multiple job postings in one transaction.",
          quota: 2,
          compensation: "500 baht per day",
          workDaysPerWeek: 4,
          workModes: ["work_from_home"],
        },
      ],
      captchaToken: "integration-test-captcha-token",
    });
    let created;
    const rollback = new Error("intentional rollback after verification");

    await assert.rejects(
      () =>
        models.sequelize.transaction(async (transaction) => {
          created = await createPublicJobSubmission(
            payload,
            models,
            transaction,
          );
          assert.equal(
            await models.Company.count({
              where: { id: created.company.id },
              transaction,
            }),
            1,
          );
          assert.equal(
            await models.JobSubmission.count({
              where: { id: created.submission.id },
              transaction,
            }),
            1,
          );
          assert.equal(
            await models.JobPosting.count({
              where: { submission_id: created.submission.id },
              transaction,
            }),
            2,
          );
          assert.equal(
            await models.JobPostingWorkMode.count({
              where: {
                job_posting_id: created.jobPostings.map((job) => job.id),
              },
              transaction,
            }),
            3,
          );
          assert.equal(
            await models.CompanyAccessToken.count({
              where: {
                job_submission_id: created.submission.id,
                purpose: "email_verification",
              },
              transaction,
            }),
            1,
          );
          assert.notEqual(
            created.verificationToken,
            created.verificationTokenRecord.token_hash,
          );
          assert.equal(
            created.verificationTokenRecord.token_hash.includes(
              created.verificationToken,
            ),
            false,
          );

          const verificationResult = await verifyCompanyEmail(
            created.verificationToken,
            models,
            transaction,
          );
          assert.equal(
            verificationResult.submission.verification_status,
            "verified",
          );
          assert.equal(verificationResult.jobCount, 2);
          assert.equal(
            await models.JobPosting.count({
              where: {
                submission_id: created.submission.id,
                status: "pending_review",
              },
              transaction,
            }),
            2,
          );
          assert.ok(
            (await models.Company.findByPk(created.company.id, { transaction }))
              .email_verified_at,
          );
          assert.ok(
            (
              await models.CompanyAccessToken.findByPk(
                created.verificationTokenRecord.id,
                { transaction },
              )
            ).used_at,
          );
          await assert.rejects(
            () =>
              verifyCompanyEmail(
                created.verificationToken,
                models,
                transaction,
              ),
            (error) =>
              error instanceof CompanyVerificationError && error.status === 410,
          );

          const expiredRawToken = "expired-verification-token";
          const expiredCreatedAt = new Date(Date.now() - 2 * 60 * 1000);
          await models.CompanyAccessToken.create(
            {
              company_id: created.company.id,
              job_submission_id: created.submission.id,
              purpose: "email_verification",
              token_hash: hashVerificationToken(expiredRawToken),
              expires_at: new Date(Date.now() - 1000),
              createdAt: expiredCreatedAt,
              updatedAt: expiredCreatedAt,
            },
            { transaction },
          );
          await assert.rejects(
            () => verifyCompanyEmail(expiredRawToken, models, transaction),
            (error) =>
              error instanceof CompanyVerificationError && error.status === 410,
          );

          const revokedRawToken = "revoked-verification-token";
          await models.CompanyAccessToken.create(
            {
              company_id: created.company.id,
              job_submission_id: created.submission.id,
              purpose: "email_verification",
              token_hash: hashVerificationToken(revokedRawToken),
              expires_at: new Date(Date.now() + 60 * 60 * 1000),
              revoked_at: new Date(),
            },
            { transaction },
          );
          await assert.rejects(
            () => verifyCompanyEmail(revokedRawToken, models, transaction),
            (error) =>
              error instanceof CompanyVerificationError && error.status === 410,
          );
          throw rollback;
        }),
      (error) => error === rollback,
    );

    assert.equal(
      await models.Company.count({ where: { id: created.company.id } }),
      0,
    );
    assert.equal(
      await models.JobSubmission.count({
        where: { id: created.submission.id },
      }),
      0,
    );
    assert.equal(
      await models.JobPosting.count({
        where: { submission_id: created.submission.id },
      }),
      0,
    );
    assert.equal(
      await models.JobPostingWorkMode.count({
        where: { job_posting_id: created.jobPostings.map((job) => job.id) },
      }),
      0,
    );
    assert.equal(
      await models.CompanyAccessToken.count({
        where: { job_submission_id: created.submission.id },
      }),
      0,
    );
  },
);

test.after(async () => {
  await models.sequelize.close();
});
