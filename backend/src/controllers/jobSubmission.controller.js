const {
  CaptchaVerificationError,
  verifyTurnstileToken,
} = require("../services/captcha.service");
const {
  CompanyVerificationError,
  getResendableCompanyVerification,
  verifyCompanyEmail,
} = require("../services/companyVerification.service");
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

async function verifyJobSubmissionEmail(req, res) {
  try {
    const { submission, jobCount } = await verifyCompanyEmail(req.query.token);
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
}

function createResendVerificationHandler(dependencies = {}) {
  const getResendableVerification =
    dependencies.getResendableVerification || getResendableCompanyVerification;
  const sendVerificationEmail =
    dependencies.sendVerificationEmail || sendCompanyVerificationEmail;

  return async function resendJobSubmissionVerification(req, res) {
    try {
      const { token } = req.body || {};
      const {
        company,
        submission,
        token: resendToken,
      } = await getResendableVerification(token);
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
const resendJobSubmissionVerification = createResendVerificationHandler();

module.exports = {
  createJobSubmission,
  createJobSubmissionHandler,
  createResendVerificationHandler,
  resendJobSubmissionVerification,
  verifyJobSubmissionEmail,
};
