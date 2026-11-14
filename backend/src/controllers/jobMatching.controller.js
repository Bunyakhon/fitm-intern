const {
  Company,
  JobPosting,
  JobPostingWorkMode,
  Student,
  StudentProfile,
  StudentSkill,
} = require("../models");
const {
  NlpMatchingResponseError,
  requestJobMatches,
} = require("../services/nlpMatching.client");
const { isUsableResumeText } = require("../services/resumeText.service");
const { publishedJobWhere } = require("../services/jobEligibility");
const { Op } = require("sequelize");
const { jobDisplayInformation, companyVisibilityWhere } = require("../services/internthDevelopmentData");
const { jobSearchConditions } = require("../services/jobSearchFilters");
const { matchingSource, readMatchingStudent } = require("../services/jobMatchingProfile.service");
const { describeAnalysis, explainJob } = require("../services/jobMatchingExplanation.service");

const SCHEMA_VERSION = "job-matching.v1";
const TOP_K = 10;
const MIN_SCORE = 0.05;

function normalizedText(...values) {
  return values
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim())
    .join(" ");
}

function cleanCandidatePart(value) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function createCandidateSources(student, resumeText = "") {
  const saved = matchingSource(student);
  // The engine accepts text, not proficiency weights. Include saved skill names
  // once; preserve proficiency separately for display without inventing scores.
  const computerNames = [...new Set(saved.computer_skills.map((skill) => cleanCandidatePart(skill.skill_name)))];
  return {
    profile: normalizedText(...computerNames, cleanCandidatePart(saved.related_skills)).slice(0, 20_000),
    resume: cleanCandidatePart(resumeText).slice(0, 20_000),
  };
}

function createCandidateText(student, resumeText = "") {
  const { profile, resume } = createCandidateSources(student, resumeText);
  return [profile, resume].filter(Boolean).join(" ");
}

async function readStudentResume(studentId, StudentFileModel) {
  if (!StudentFileModel) return "";
  const file = await StudentFileModel.findOne({
    where: { student_id: studentId, file_type: "resume" },
    attributes: ["extracted_text", "extraction_status"],
  });
  if (!file) return "";

  try {
    const resume = typeof file.get === "function" ? file.get({ plain: true }) : file;
    if (resume.extraction_status !== "ready" || typeof resume.extracted_text !== "string") return "";
    const extractedText = cleanCandidatePart(resume.extracted_text);
    return isUsableResumeText(extractedText) ? extractedText : "";
  } catch {
    console.warn("Resume text extraction failed; falling back to profile text");
    return "";
  }
}

function toPlainJob(job) {
  return typeof job?.get === "function" ? job.get({ plain: true }) : job;
}

function normalizeJobs(jobPostings) {
  return jobPostings.map((jobPosting) => {
    const job = toPlainJob(jobPosting);
    return {
      job_posting_id: job.id,
      text: normalizedText(job.title, job.category, job.description),
    };
  });
}

function validateNlpResponse(response, jobIds) {
  if (
    !response ||
    response.schema_version !== SCHEMA_VERSION ||
    !Array.isArray(response.matches) ||
    response.matches.length > TOP_K
  ) {
    throw new NlpMatchingResponseError();
  }

  const seenIds = new Set();
  let previousMatch;

  response.matches.forEach((match, index) => {
    if (
      !match ||
      typeof match.job_posting_id !== "string" ||
      !jobIds.has(match.job_posting_id) ||
      seenIds.has(match.job_posting_id) ||
      typeof match.score !== "number" ||
      !Number.isFinite(match.score) ||
      match.score < MIN_SCORE ||
      match.score > 1 ||
      Number(match.score.toFixed(4)) !== match.score ||
      !Number.isInteger(match.rank) ||
      match.rank !== index + 1
    ) {
      throw new NlpMatchingResponseError();
    }

    if (
      previousMatch &&
      (match.score > previousMatch.score ||
        (match.score === previousMatch.score &&
          match.job_posting_id < previousMatch.job_posting_id))
    ) {
      throw new NlpMatchingResponseError();
    }

    seenIds.add(match.job_posting_id);
    previousMatch = match;
  });

  return response.matches;
}

function enrichMatches(matches, jobPostings, database = JobPosting.sequelize) {
  const jobsById = new Map(
    jobPostings.map((jobPosting) => {
      const job = toPlainJob(jobPosting);
      return [job.id, job];
    }),
  );

  return matches.map((match) => {
    const job = jobsById.get(match.job_posting_id);
    return {
      job_posting_id: match.job_posting_id,
      score: match.score,
      rank: match.rank,
      title: job.title,
      description: job.description,
      category: job.category,
      quota: job.quota,
      compensation_text: job.compensation_text,
      work_days_per_week: job.work_days_per_week,
      company: {
        id: job.company?.id || null,
        name: job.company?.name || null,
        province: job.company?.province || null,
      },
      ...jobDisplayInformation(job, database),
      selectable: true,
      workModes: (job.workModes || []).map((workMode) => ({
        mode: workMode.mode,
      })),
    };
  });
}

function createJobMatchingHandler(dependencies = {}) {
  const StudentModel = dependencies.StudentModel || Student;
  const JobPostingModel = dependencies.JobPostingModel || JobPosting;
  const callNlp = dependencies.callNlp || requestJobMatches;
  const StudentFileModel = dependencies.StudentFileModel || require("../models").StudentFile;

  return async function getMyJobMatches(req, res) {
    res.set("Cache-Control", "private, no-store");
    try {
      const source = req.query?.source;
      if (source !== undefined && source !== "skills" && source !== "resume") {
        return res.status(400).json({
          message: "Matching source must be skills or resume",
          code: "MATCH_SOURCE_INVALID",
        });
      }

      // Read saved profile data for transparent display even in Resume mode;
      // the Resume candidate below remains Resume text only.
      const student = await readMatchingStudent(req.user.id, {
          StudentModel, StudentProfileModel: dependencies.StudentProfileModel || StudentProfile,
          StudentSkillModel: dependencies.StudentSkillModel || StudentSkill,
        });

      if (!student) {
        return res.status(404).json({
          message: "Student was not found",
          code: "MATCH_STUDENT_NOT_FOUND",
        });
      }

      const savedSource = matchingSource(student);
      const sourcePayload = { matching_source: savedSource };

      const resumeText = source === "skills"
        ? ""
        : await readStudentResume(req.user.id, StudentFileModel);
      const { profile: profileText, resume } = createCandidateSources(student, resumeText);
      let candidate;

      if (source === "skills") {
        if (!profileText) {
          return res.status(422).json({
            message: "Please save computer skills or related skills before matching by skills",
            code: "MATCH_PROFILE_TEXT_REQUIRED",
          });
        }
        candidate = { text: profileText };
      } else if (source === "resume") {
        if (!resume) {
          return res.status(422).json({
            message: "Please upload a readable Resume before matching by Resume",
            code: "MATCH_RESUME_TEXT_REQUIRED",
          });
        }
        candidate = { text: resume };
      } else {
        const candidateText = profileText || resume;
        if (!candidateText) {
          return res.status(422).json({
            message: "Saved skills or a readable Resume are required for matching",
            code: "MATCH_CANDIDATE_TEXT_REQUIRED",
          });
        }
        candidate = profileText && resume
          ? { text: profileText, resume_text: resume }
          : { text: candidateText };
      }

      const jobQuery = {
        attributes: [
          "id",
          "title",
          "description",
          "category",
          "quota",
          "compensation_text",
          "work_days_per_week",
        ],
        include: [
          {
            model: dependencies.CompanyModel || Company,
            as: "company",
            where: companyVisibilityWhere(JobPostingModel.sequelize),
            attributes: ["id", "name", "province", "email", "email_verified_at", "phone", "address_no", "moo", "subdistrict", "district"],
            required: true,
          },
          {
            model: dependencies.JobPostingWorkModeModel || JobPostingWorkMode,
            as: "workModes",
            attributes: ["mode"],
            required: false,
          },
        ],
      };
      const jobPostings = await JobPostingModel.findAll({ ...jobQuery, where: publishedJobWhere(new Date(), JobPostingModel.sequelize) });
      const usesProfile = source !== "resume" && Boolean(profileText);
      const analysis = describeAnalysis({ savedSource, candidate, usesProfile,
        mode: candidate.resume_text ? "combined" : usesProfile ? "skills" : "resume",
        topK: TOP_K, minScore: MIN_SCORE, jobCount: jobPostings.length });
      // Retain the response key for compatibility; browsing has its own endpoint.
      const developmentPayload = { development_listings: [] };

      if (!jobPostings.length) {
        return res.status(200).json({ matches: [], ...developmentPayload, ...sourcePayload, matching_analysis: analysis });
      }

      const response = await callNlp({
        schema_version: SCHEMA_VERSION,
        candidate,
        jobs: normalizeJobs(jobPostings),
        options: { top_k: TOP_K, min_score: MIN_SCORE },
      });
      const matches = validateNlpResponse(
        response,
        new Set(jobPostings.map((jobPosting) => toPlainJob(jobPosting).id)),
      );

      const jobsById = new Map(jobPostings.map((job) => [toPlainJob(job).id, toPlainJob(job)]));
      const jobTexts = new Map(normalizeJobs(jobPostings).map((job) => [job.job_posting_id, job.text]));
      const explainedMatches = enrichMatches(matches, jobPostings, JobPostingModel.sequelize).map((match) => ({ ...match,
        explanation: explainJob(jobsById.get(match.job_posting_id), analysis, { jobText: jobTexts.get(match.job_posting_id) }),
      }));
      return res.status(200).json({ matches: explainedMatches, ...developmentPayload, ...sourcePayload, matching_analysis: analysis });
    } catch (error) {
      if (error?.status === 503 || error?.status === 504 || error?.status === 502) {
        return res.status(error.status).json({
          message: error.message,
          code: error.code,
        });
      }

      console.error("Unable to get job matches");
      return res.status(500).json({
        message: "Unable to get job matches",
        code: "JOB_MATCHING_INTERNAL_ERROR",
      });
    }
  };
}

const getMyJobMatches = createJobMatchingHandler();

async function listPublishedJobs(req, res) {
  res.set("Cache-Control", "private, no-store");
  try {
    const page = /^\d+$/.test(req.query.page || "") ? Math.min(1000, Math.max(1, Number(req.query.page))) : 1;
    const limit = 12;
    const conditions = [publishedJobWhere(), ...jobSearchConditions(req.query)];
    const result = await JobPosting.findAndCountAll({
      where: { [Op.and]: conditions },
      attributes: ["id", "title", "company_id", "description", "category", "quota", "compensation_text", "work_days_per_week"],
      include: [{ model: Company, as: "company", required: true, where: companyVisibilityWhere(JobPosting.sequelize),
        attributes: ["id", "name", "province", "email", "email_verified_at", "phone", "address_no", "moo", "subdistrict", "district"] },
      { model: JobPostingWorkMode, as: "workModes", attributes: ["mode"], separate: true }],
      order: [["published_at", "DESC"], ["id", "ASC"]], limit, offset: (page - 1) * limit,
    });
    const jobs = enrichMatches(result.rows.map((job) => ({ job_posting_id: job.id })), result.rows);
    return res.json({ jobs, page, limit, total: result.count });
  } catch (error) {
    if (error.code === "JOB_FILTER_INVALID") return res.status(400).json({ message: error.message, code: error.code });
    return res.status(500).json({ message: "ไม่สามารถค้นหาประกาศงานได้ กรุณาลองใหม่" });
  }
}

async function getMyJobMatchingSource(req, res) {
  res.set("Cache-Control", "private, no-store");
  try {
    const student = await readMatchingStudent(req.user.id, {
      StudentModel: Student, StudentProfileModel: StudentProfile, StudentSkillModel: StudentSkill,
    });
    if (!student) return res.status(404).json({ message: "Student was not found", code: "MATCH_STUDENT_NOT_FOUND" });
    return res.json({ matching_source: matchingSource(student) });
  } catch {
    return res.status(500).json({ message: "Unable to load saved matching skills", code: "MATCH_SOURCE_LOAD_FAILED" });
  }
}

module.exports = {
  MIN_SCORE,
  SCHEMA_VERSION,
  TOP_K,
  createCandidateSources,
  createCandidateText,
  createJobMatchingHandler,
  enrichMatches,
  getMyJobMatches,
  getMyJobMatchingSource,
  listPublishedJobs,
  normalizeJobs,
  readStudentResume,
  validateNlpResponse,
};
