const crypto = require("crypto");
const models = require("../models");
const { getRecruitmentSecurityConfig } = require("../config/recruitment");

const EMAIL_VERIFICATION_PURPOSE = "email_verification";

class CompanyVerificationError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "CompanyVerificationError";
    this.status = status;
  }
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashVerificationToken(token) {
  if (typeof token !== "string" || !token.trim()) {
    throw new CompanyVerificationError("Verification token is required", 400);
  }
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

function validateRawToken(token) {
  if (typeof token !== "string" || !token.trim() || token.trim().length > 512) {
    throw new CompanyVerificationError("Verification token is invalid", 400);
  }
  return token.trim();
}

async function issueEmailVerificationToken(
  { companyId, submissionId },
  { transaction, modelRegistry = models } = {},
) {
  if (!transaction || !companyId || !submissionId) {
    throw new Error(
      "Company, submission, and transaction are required to issue a verification token",
    );
  }
  const { CompanyAccessToken } = modelRegistry;
  const now = new Date();
  const token = generateVerificationToken();
  const { verificationTokenTtlHours } = getRecruitmentSecurityConfig();
  const expiresAt = new Date(
    now.getTime() + verificationTokenTtlHours * 60 * 60 * 1000,
  );

  await CompanyAccessToken.update(
    { revoked_at: now },
    {
      where: {
        company_id: companyId,
        job_submission_id: submissionId,
        purpose: EMAIL_VERIFICATION_PURPOSE,
        used_at: null,
        revoked_at: null,
      },
      transaction,
    },
  );
  const record = await CompanyAccessToken.create(
    {
      company_id: companyId,
      job_submission_id: submissionId,
      purpose: EMAIL_VERIFICATION_PURPOSE,
      token_hash: hashVerificationToken(token),
      expires_at: expiresAt,
    },
    { transaction },
  );
  return { token, record };
}

async function findUsableVerificationToken(
  rawToken,
  { modelRegistry = models, transaction, lock } = {},
) {
  const token = validateRawToken(rawToken);
  const { CompanyAccessToken } = modelRegistry;
  const verification = await CompanyAccessToken.findOne({
    where: {
      token_hash: hashVerificationToken(token),
      purpose: EMAIL_VERIFICATION_PURPOSE,
    },
    transaction,
    lock,
  });
  if (!verification)
    throw new CompanyVerificationError("Verification token is invalid", 404);
  if (verification.used_at || verification.revoked_at) {
    throw new CompanyVerificationError(
      "Verification token is no longer valid",
      410,
    );
  }
  if (new Date(verification.expires_at) <= new Date()) {
    throw new CompanyVerificationError("Verification token has expired", 410);
  }
  return { token, verification };
}

async function verifyCompanyEmail(
  rawToken,
  modelRegistry = models,
  existingTransaction,
) {
  const { Company, JobPosting, JobSubmission, sequelize } = modelRegistry;
  const verify = async (transaction) => {
    const initial = await findUsableVerificationToken(rawToken, {
      modelRegistry,
      transaction,
    });
    const submission = await JobSubmission.findByPk(
      initial.verification.job_submission_id,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      },
    );
    const { verification } = await findUsableVerificationToken(rawToken, {
      modelRegistry, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!submission)
      throw new CompanyVerificationError("Verification token is invalid", 404);
    if (submission.verification_status !== "pending_email_verification") {
      throw new CompanyVerificationError(
        "Submission is no longer awaiting verification",
        410,
      );
    }
    const company = await Company.findByPk(verification.company_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!company || company.id !== submission.company_id)
      throw new CompanyVerificationError("Verification token is invalid", 404);

    const now = new Date();
    await company.update({ email_verified_at: now }, { transaction });
    await submission.update(
      { verification_status: "verified", verified_at: now },
      { transaction },
    );
    const [jobCount] = await JobPosting.update(
      { status: "pending_review" },
      {
        where: {
          submission_id: submission.id,
          status: "pending_email_verification",
        },
        transaction,
      },
    );
    await verification.update({ used_at: now }, { transaction });
    return { submission, jobCount };
  };
  return existingTransaction
    ? verify(existingTransaction)
    : sequelize.transaction(verify);
}

async function getResendableCompanyVerification(
  rawToken,
  modelRegistry = models,
) {
  const { Company, JobSubmission } = modelRegistry;
  const { token, verification } = await findUsableVerificationToken(rawToken, {
    modelRegistry,
  });
  const submission = await JobSubmission.findByPk(
    verification.job_submission_id,
  );
  if (
    !submission ||
    submission.verification_status !== "pending_email_verification"
  ) {
    throw new CompanyVerificationError(
      "Verification token is no longer valid",
      410,
    );
  }
  const company = await Company.findByPk(verification.company_id);
  if (!company)
    throw new CompanyVerificationError("Verification token is invalid", 404);
  return { token, company, submission };
}

// The browser holds an HttpOnly capability, never the email verification token.
// Lock the submission so resends cannot race each other or verification.
async function recoverCompanyVerification(submissionId, modelRegistry = models) {
  const { sequelize, Company, JobSubmission } = modelRegistry;
  return sequelize.transaction(async (transaction) => {
    const submission = await JobSubmission.findByPk(submissionId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!submission || submission.verification_status !== "pending_email_verification") {
      throw new CompanyVerificationError("Submission is no longer awaiting verification", 410);
    }
    const company = await Company.findByPk(submission.company_id, { transaction });
    if (!company) throw new CompanyVerificationError("Submission is unavailable", 404);
    const { token } = await issueEmailVerificationToken({ companyId: company.id, submissionId: submission.id }, { transaction, modelRegistry });
    return { company, submission, token };
  });
}

module.exports = {
  CompanyVerificationError,
  EMAIL_VERIFICATION_PURPOSE,
  generateVerificationToken,
  getResendableCompanyVerification,
  hashVerificationToken,
  issueEmailVerificationToken,
  recoverCompanyVerification,
  verifyCompanyEmail,
};
