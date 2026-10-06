const jwt = require("jsonwebtoken");
const { getRecruitmentSecurityConfig } = require("../config/recruitment");
const { CompanyVerificationError } = require("./companyVerification.service");

const COOKIE_NAME = "recruitment_resend";
const COOKIE_PATH = "/api/job-submissions/resend-verification";
function issueRecoveryCapability(submissionId) {
  const { verificationTokenTtlHours } = getRecruitmentSecurityConfig();
  return jwt.sign(
    { purpose: "recruitment_resend", submissionId },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: verificationTokenTtlHours * 3600,
    },
  );
}
function readRecoveryCapability(req) {
  const cookies = String(req.headers?.cookie || "").split(";");
  const cookie = cookies.find((part) =>
    part.trim().startsWith(`${COOKIE_NAME}=`),
  );
  try {
    const token = decodeURIComponent(
      cookie?.trim().slice(COOKIE_NAME.length + 1) || "",
    );
    const claims = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (
      claims.purpose !== "recruitment_resend" ||
      typeof claims.submissionId !== "string"
    )
      throw new Error();
    return claims.submissionId;
  } catch {
    throw new CompanyVerificationError(
      "Resend capability is invalid or expired",
      401,
    );
  }
}
function setRecoveryCookie(res, capability) {
  const { verificationTokenTtlHours } = getRecruitmentSecurityConfig();
  res.cookie(COOKIE_NAME, capability, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: COOKIE_PATH,
    maxAge: verificationTokenTtlHours * 3600 * 1000,
  });
}
module.exports = {
  issueRecoveryCapability,
  readRecoveryCapability,
  setRecoveryCookie,
};
