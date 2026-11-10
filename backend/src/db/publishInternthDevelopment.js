// Explicit development-only publication authorized for this exact seeded dataset.
// Reuse the manifest and its three models without running the seed or app startup.
const { SOURCE_COMPANIES } = require("./seedInternthDevelopment");
const sequelize = require("../config/database");
const { Op, QueryTypes } = require("sequelize");
const development = require("../services/internthDevelopmentData");
const { Company, JobSubmission, JobPosting } = sequelize.models;

async function publishInternthDevelopment() {
  if (!development.isDevelopmentDatabase(sequelize)) throw new Error("DEVELOPMENT_TARGET_REQUIRED");
  return sequelize.transaction(async (transaction) => {
    const [target] = await sequelize.query("SELECT current_database() AS database, current_schema() AS schema", { transaction, type: QueryTypes.SELECT });
    if (target.database !== "intern_system" || target.schema !== "public") throw new Error("DEVELOPMENT_TARGET_MISMATCH");
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:key))", {
      replacements: { key: "fitm-intern:internth-development" }, transaction, type: QueryTypes.SELECT,
    });
    const jobs = await JobPosting.findAll({ where: { id: { [Op.in]: development.JOB_IDS } }, transaction, lock: transaction.LOCK.UPDATE });
    const byId = new Map(jobs.map((job) => [job.id, job]));
    const blocked = [];
    const selected = [];
    for (const company of SOURCE_COMPANIES) {
      const fixture = company.development;
      const companyId = development.companyId(fixture.key);
      const submissionId = development.submissionId(fixture.key);
      const existingCompany = await Company.findByPk(companyId, { transaction, lock: transaction.LOCK.SHARE });
      const submission = await JobSubmission.findByPk(submissionId, { transaction, lock: transaction.LOCK.SHARE });
      const submissionMatches = submission?.company_id === companyId && submission.normalized_submitted_email === fixture.email;
      for (const [sourceId, title, quota] of company.jobs) {
        const job = byId.get(development.jobId(sourceId));
        // The targeted correction keeps the original submission history intact.
        const correctedFocal = sourceId === 16858 && job && existingCompany
          && development.focalSourceInformation({ ...job.get({ plain: true }), company: existingCompany.get({ plain: true }) });
        const companyMatches = submissionMatches && (correctedFocal
          || (existingCompany?.name === company.name && existingCompany.normalized_email === fixture.email));
        if (!companyMatches || !job || job.company_id !== companyId || job.submission_id !== submissionId
          || job.title !== title || job.quota !== quota
          || !job.description.includes(`Source: ${development.sourceUrl(sourceId)}\n`)
          || !job.description.includes(development.DEVELOPMENT_LABEL)
          || !["pending_email_verification", "published"].includes(job.status)) {
          blocked.push(sourceId);
        } else selected.push({ sourceId, job });
      }
    }
    // Identify everything before writing; an unexpected row rolls back the batch.
    if (blocked.length || selected.length !== 18) {
      throw Object.assign(new Error("DATASET_IDENTITY_BLOCKED"), { sourceIds: blocked });
    }
    const now = new Date();
    let updated = 0, alreadyPublished = 0, expiryCleared = 0;
    for (const { job } of selected) {
      const patch = {};
      if (job.status !== "published") patch.status = "published";
      if (!job.published_at) patch.published_at = now;
      if (job.expires_at && new Date(job.expires_at) <= now) { patch.expires_at = null; expiryCleared++; }
      if (Object.keys(patch).length) { await job.update(patch, { transaction }); updated++; }
      else alreadyPublished++;
    }
    return { execution: "COMMITTED", target, jobs_published: selected.length, updated_rows: updated,
      already_published: alreadyPublished, skipped: 0, blocked: 0, expired_fixture_deadlines_cleared: expiryCleared,
      source_ids: selected.map(({ sourceId }) => sourceId),
      tables_written: ["job_postings"], company_changes: 0, submission_changes: 0,
      verification_or_review_changes: 0, hiring_status: "UNKNOWN / UNVERIFIED",
      tests: "NOT RUN — USER-OWNED TESTING" };
  });
}

if (require.main === module) {
  publishInternthDevelopment().then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(JSON.stringify({ execution: "NOT_COMPLETED", database_changes: "NONE",
        code: ["DEVELOPMENT_TARGET_REQUIRED", "DEVELOPMENT_TARGET_MISMATCH", "DATASET_IDENTITY_BLOCKED"].includes(error.message)
          ? error.message : "DATABASE_EXECUTION_FAILED", blocked_source_ids: error.sourceIds,
        failure_type: error.name, database_code: error.original?.code }));
      process.exitCode = 1;
    }).finally(() => sequelize.close());
}

module.exports = { publishInternthDevelopment };
