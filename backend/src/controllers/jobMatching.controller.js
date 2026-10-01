const {
  Company,
  JobPosting,
  JobPostingWorkMode,
  Student,
  StudentProfile,
} = require("../models");
const {
  NlpMatchingResponseError,
  requestJobMatches,
} = require("../services/nlpMatching.client");

const SCHEMA_VERSION = "job-matching.v1";
const TOP_K = 5;
const MIN_SCORE = 0.05;

function normalizedText(...values) {
  return values
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim())
    .join(" ");
}

function createCandidateText(student) {
  return normalizedText(student?.major, student?.profile?.related_skills);
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

function enrichMatches(matches, jobPostings) {
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
        name: job.company?.name || null,
        province: job.company?.province || null,
      },
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

  return async function getMyJobMatches(req, res) {
    try {
      const student = await StudentModel.findByPk(req.user.id, {
        attributes: ["id", "major"],
        include: [
          {
            model: dependencies.StudentProfileModel || StudentProfile,
            as: "profile",
            attributes: ["related_skills"],
            required: false,
          },
        ],
      });

      if (!student) {
        return res.status(404).json({
          message: "Student was not found",
          code: "MATCH_STUDENT_NOT_FOUND",
        });
      }

      const candidateText = createCandidateText(student);
      if (!candidateText) {
        return res.status(422).json({
          message: "Student major or related skills are required for matching",
          code: "MATCH_CANDIDATE_TEXT_REQUIRED",
        });
      }

      const jobPostings = await JobPostingModel.findAll({
        where: { status: "published" },
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
            attributes: ["name", "province"],
            required: false,
          },
          {
            model: dependencies.JobPostingWorkModeModel || JobPostingWorkMode,
            as: "workModes",
            attributes: ["mode"],
            required: false,
          },
        ],
      });

      if (!jobPostings.length) {
        return res.status(200).json({ matches: [] });
      }

      const response = await callNlp({
        schema_version: SCHEMA_VERSION,
        candidate: { text: candidateText },
        jobs: normalizeJobs(jobPostings),
        options: { top_k: TOP_K, min_score: MIN_SCORE },
      });
      const matches = validateNlpResponse(
        response,
        new Set(jobPostings.map((jobPosting) => toPlainJob(jobPosting).id)),
      );

      return res.status(200).json({ matches: enrichMatches(matches, jobPostings) });
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

module.exports = {
  MIN_SCORE,
  SCHEMA_VERSION,
  TOP_K,
  createCandidateText,
  createJobMatchingHandler,
  enrichMatches,
  getMyJobMatches,
  normalizeJobs,
  validateNlpResponse,
};
