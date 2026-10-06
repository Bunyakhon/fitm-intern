const models = require("../models");
const {
  issueEmailVerificationToken,
} = require("./companyVerification.service");
const { issueRecoveryCapability } = require("./recruitmentRecovery.service");

async function createPublicJobSubmission(
  validatedPayload,
  modelRegistry = models,
  existingTransaction,
) {
  const { Company, JobSubmission, JobPosting, JobPostingWorkMode, sequelize } =
    modelRegistry;

  const createRecords = async (transaction) => {
    const company = await Company.create(
      {
        name: validatedPayload.company.name,
        normalized_name: validatedPayload.company.normalizedName,
        email: validatedPayload.company.email,
        normalized_email: validatedPayload.company.normalizedEmail,
        phone: validatedPayload.company.phone,
        address_no: validatedPayload.company.addressNo,
        moo: validatedPayload.company.moo,
        subdistrict: validatedPayload.company.subdistrict,
        district: validatedPayload.company.district,
        province: validatedPayload.company.province,
      },
      { transaction },
    );

    const submission = await JobSubmission.create(
      {
        company_id: company.id,
        submitted_email: validatedPayload.company.email,
        normalized_submitted_email: validatedPayload.company.normalizedEmail,
        verification_status: "pending_email_verification",
      },
      { transaction },
    );

    const jobPostings = [];
    for (const job of validatedPayload.jobPostings) {
      const jobPosting = await JobPosting.create(
        {
          company_id: company.id,
          submission_id: submission.id,
          title: job.title,
          category: job.category,
          description: job.description,
          quota: job.quota,
          compensation_text: job.compensation,
          work_days_per_week: job.workDaysPerWeek,
          status: "pending_email_verification",
        },
        { transaction },
      );
      await JobPostingWorkMode.bulkCreate(
        job.workModes.map((mode) => ({ job_posting_id: jobPosting.id, mode })),
        { transaction },
      );
      jobPostings.push(jobPosting);
    }

    const { token: verificationToken, record: verificationTokenRecord } =
      await issueEmailVerificationToken(
        { companyId: company.id, submissionId: submission.id },
        { transaction, modelRegistry },
      );

    return {
      company,
      submission,
      jobPostings,
      verificationToken,
      verificationTokenRecord,
      recoveryCapability: issueRecoveryCapability(submission.id),
    };
  };

  return existingTransaction
    ? createRecords(existingTransaction)
    : sequelize.transaction(createRecords);
}

module.exports = { createPublicJobSubmission };
