// Explicit, targeted data correction. No initialization, synchronization or tests.
const { SOURCE_COMPANIES } = require("./seedInternthDevelopment");
const sequelize = require("../config/database");
const { QueryTypes } = require("sequelize");
const development = require("../services/internthDevelopmentData");
const { Company, JobSubmission, JobPosting } = sequelize.models;
const WorkMode = require("../models/jobPostingWorkMode.model")(sequelize);
const source = development.FOCAL_SOURCE;

async function correctFocalSolutionDevelopment() {
  if (!development.isDevelopmentDatabase(sequelize)) throw new Error("DEVELOPMENT_TARGET_REQUIRED");
  return sequelize.transaction(async (transaction) => {
    const [target] = await sequelize.query("SELECT current_database() AS database, current_schema() AS schema", {
      transaction, type: QueryTypes.SELECT,
    });
    if (target.database !== "intern_system" || target.schema !== "public") throw new Error("DEVELOPMENT_TARGET_MISMATCH");
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:key))", {
      replacements: { key: "fitm-intern:internth-development" }, transaction, type: QueryTypes.SELECT,
    });
    const job = await JobPosting.findByPk(development.jobId(source.source_id), { transaction, lock: transaction.LOCK.UPDATE });
    const company = await Company.findByPk(development.companyId("focal"), { transaction, lock: transaction.LOCK.UPDATE });
    const submission = await JobSubmission.findByPk(development.submissionId("focal"), { transaction, lock: transaction.LOCK.SHARE });
    const fixture = SOURCE_COMPANIES.find((entry) => entry.development.key === "focal").development;
    if (!job || !company || !submission || company.name !== source.company_name
      || job.title !== source.title || job.company_id !== company.id || submission.company_id !== company.id
      || job.submission_id !== submission.id || submission.normalized_submitted_email !== fixture.email
      || !job.description.includes(`Source: ${source.job_source_url}\n`)
      || !job.description.includes(development.DEVELOPMENT_LABEL)) throw new Error("FOCAL_IDENTITY_BLOCKED");

    const companyPatch = { email: source.email, normalized_email: source.email, phone: source.phone,
      address_no: source.address_no, subdistrict: source.subdistrict, district: source.district, province: source.province };
    const previous = { ...fixture, normalized_email: fixture.email, subdistrict: "แขวงตัวอย่าง (Development)" };
    for (const [field, value] of Object.entries(companyPatch)) {
      if (company[field] !== previous[field] && company[field] !== value) throw new Error("FOCAL_DATA_CONFLICT");
      if (company[field] === value) delete companyPatch[field];
    }
    if (!["10,000 บาท/เดือน — ข้อมูลจำลองสำหรับ Development", source.compensation_text].includes(job.compensation_text)
      || job.quota !== 2 || job.work_days_per_week !== 5
      || job.description.split("\n").some((line) => line.startsWith("Source provenance:") && line !== development.FOCAL_PROVENANCE_LINE)) {
      throw new Error("FOCAL_DATA_CONFLICT");
    }
    const modes = await WorkMode.findAll({ where: { job_posting_id: job.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (modes.some((mode) => mode.mode !== "work_from_home")) throw new Error("FOCAL_WORK_MODE_CONFLICT");

    const description = job.description.split("\n").filter((line) => ![
      "อีเมล โทรศัพท์ ที่อยู่ เบี้ยเลี้ยง และวันทำงานเป็นข้อมูลจำลอง",
      "ที่อยู่จำลอง:", "Workdays:", "Contact source:", "Office address:", "Website:", "Allowance:", "Source provenance:",
    ].some((prefix) => line.startsWith(prefix))).concat([
      `Contact source: ${source.company_source_url} (general company contact; user-provided verified source)`,
      `Office address: ${source.office_address}`, `Website: ${source.website}`,
      `Workdays: ${source.work_schedule}; Work mode: Work From Home`,
      `Allowance: ${source.compensation_text}`, development.FOCAL_PROVENANCE_LINE,
    ]).join("\n");
    const jobPatch = {};
    if (job.description !== description) jobPatch.description = description;
    if (job.compensation_text !== source.compensation_text) jobPatch.compensation_text = source.compensation_text;
    if (Object.keys(companyPatch).length) await company.update(companyPatch, { transaction });
    if (Object.keys(jobPatch).length) await job.update(jobPatch, { transaction });
    if (!modes.length) await WorkMode.create({ job_posting_id: job.id, mode: "work_from_home" }, { transaction });
    return { execution: "COMMITTED", target, source_id: source.source_id,
      company_rows_updated: Object.keys(companyPatch).length ? 1 : 0,
      job_rows_updated: Object.keys(jobPatch).length ? 1 : 0,
      work_mode_rows_inserted: modes.length ? 0 : 1,
      company_fields_updated: Object.keys(companyPatch), job_fields_updated: Object.keys(jobPatch),
      other_companies_changed: 0, submissions_changed: 0, verification_or_approval_changes: 0,
      hiring_status: "UNKNOWN / UNVERIFIED", tests: "NOT RUN — USER-OWNED TESTING" };
  });
}

if (require.main === module) {
  correctFocalSolutionDevelopment().then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(JSON.stringify({ execution: "NOT_COMPLETED", database_changes: "NONE",
        code: /^(DEVELOPMENT_TARGET_|FOCAL_)/.test(error.message) ? error.message : "DATABASE_EXECUTION_FAILED",
        failure_type: error.name, database_code: error.original?.code }));
      process.exitCode = 1;
    }).finally(() => sequelize.close());
}

module.exports = { correctFocalSolutionDevelopment };
