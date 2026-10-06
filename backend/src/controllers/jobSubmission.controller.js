const {
  CaptchaVerificationError,
  verifyTurnstileToken,
} = require("../services/captcha.service");
const {
  CompanyVerificationError,
  getResendableCompanyVerification,
  verifyCompanyEmail,
  recoverCompanyVerification,
} = require("../services/companyVerification.service");
const {
  readRecoveryCapability,
  setRecoveryCookie,
} = require("../services/recruitmentRecovery.service");
const { sendCompanyVerificationEmail } = require("../services/email.service");
const {
  createPublicJobSubmission,
} = require("../services/jobSubmission.service");
const {
  JobSubmissionValidationError,
  validateJobSubmissionPayload,
} = require("../validators/jobSubmission.validator");

function createJobSubmissionHandler(dependencies = {}) {
  const createSubmission =
    dependencies.createSubmission || createPublicJobSubmission;
  const verifyCaptcha = dependencies.verifyCaptcha || verifyTurnstileToken;
  const sendVerificationEmail =
    dependencies.sendVerificationEmail || sendCompanyVerificationEmail;

  return async function createJobSubmission(req, res) {
    try {
      // Full validation precedes the external provider call, so malformed or
      // mass-assignment attempts cannot consume CAPTCHA-provider capacity.
      const payload = validateJobSubmissionPayload(req.body);
      await verifyCaptcha(payload.captchaToken, { ip: req.ip });
      const result = await createSubmission(payload);
      if (result.recoveryCapability)
        setRecoveryCookie(res, result.recoveryCapability);

      let emailSent = true;
      try {
        await sendVerificationEmail({
          to: result.company.email,
          companyName: result.company.name,
          token: result.verificationToken,
        });
      } catch (error) {
        emailSent = false;
        // Deliberately omit raw tokens, token hashes, CAPTCHA values, and SMTP details.
        console.error("Recruitment verification email delivery failed", {
          submissionId: result.submission.id,
        });
      }

      return res.status(emailSent ? 201 : 202).json({
        message: emailSent
          ? "Recruitment submission received. Check the company email to verify it before review."
          : "Recruitment submission was received, but verification email delivery is temporarily unavailable.",
        submission: {
          id: result.submission.id,
          status: result.submission.verification_status,
          jobCount: result.jobPostings.length,
        },
        verificationRequired: true,
        emailSent,
      });
    } catch (error) {
      if (error instanceof JobSubmissionValidationError) {
        return res.status(400).json({
          message: "Recruitment submission validation failed",
          errors: error.errors,
        });
      }
      if (error instanceof CaptchaVerificationError) {
        console.warn("Recruitment CAPTCHA verification failed", {
          category: error.category,
        });
        return res.status(error.status).json({ message: error.message });
      }

      console.error("Unable to create recruitment submission");
      return res.status(500).json({
        message: "Unable to create recruitment submission at this time",
      });
    }
  };
}

function createVerifyEmailHandler(dependencies = {}) {
  const verifyEmail = dependencies.verifyEmail || verifyCompanyEmail;
  return async function verifyJobSubmissionEmail(req, res) {
    try {
      if (
        req.method === "POST" &&
        (!req.body ||
          typeof req.body !== "object" ||
          Array.isArray(req.body) ||
          Object.keys(req.body).some((key) => key !== "token"))
      ) {
        throw new CompanyVerificationError("Invalid verification payload", 400);
      }
      const { submission, jobCount } = await verifyEmail(
        req.method === "POST" ? req.body?.token : req.query.token,
      );
      return res.status(200).json({
        message:
          "Company email verified. Job postings are awaiting staff review.",
        submission: {
          id: submission.id,
          status: submission.verification_status,
          jobCount,
        },
      });
    } catch (error) {
      if (error instanceof CompanyVerificationError) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Unable to verify recruitment email");
      return res
        .status(500)
        .json({ message: "Unable to verify email at this time" });
    }
  };
}

function createResendVerificationHandler(dependencies = {}) {
  const getResendableVerification =
    dependencies.getResendableVerification || getResendableCompanyVerification;
  const sendVerificationEmail =
    dependencies.sendVerificationEmail || sendCompanyVerificationEmail;
  const recoverVerification =
    dependencies.recoverVerification || recoverCompanyVerification;

  return async function resendJobSubmissionVerification(req, res) {
    try {
      const { token } = req.body || {};
      if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body) ||
        Object.keys(req.body).some((key) => key !== "token")
      ) {
        throw new CompanyVerificationError("Invalid resend payload", 400);
      }
      const {
        company,
        submission,
        token: resendToken,
      } = token !== undefined
        ? await getResendableVerification(token)
        : await recoverVerification(readRecoveryCapability(req));
      await sendVerificationEmail({
        to: submission.submitted_email,
        companyName: company.name,
        token: resendToken,
      });
      return res.status(200).json({
        message: "Verification email sent.",
        submission: {
          id: submission.id,
          status: submission.verification_status,
        },
      });
    } catch (error) {
      if (error instanceof CompanyVerificationError) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Recruitment verification email resend failed");
      return res
        .status(503)
        .json({ message: "Unable to send verification email at this time" });
    }
  };
}

const createJobSubmission = createJobSubmissionHandler();
const verifyJobSubmissionEmail = createVerifyEmailHandler();
const resendJobSubmissionVerification = createResendVerificationHandler();

module.exports = {
  createJobSubmission,
  createJobSubmissionHandler,
  createVerifyEmailHandler,
  createResendVerificationHandler,
  resendJobSubmissionVerification,
  verifyJobSubmissionEmail,
};
