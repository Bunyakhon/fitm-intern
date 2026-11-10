const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const { Op, QueryTypes, Transaction } = require("sequelize");
const development = require("../services/internthDevelopmentData");
const sequelize = require("../config/database");
// Load only the import models; no application startup, associations, sync or init.
const Company = require("../models/company.model")(sequelize);
const JobSubmission = require("../models/jobSubmission.model")(sequelize);
const JobPosting = require("../models/jobPosting.model")(sequelize);

// User-supplied Internth snapshot, 2026-11-08. No network lookup is performed.
// Each group is one company identity within this dataset, not proof of a DB identity.
const SOURCE_COMPANIES = [
  {
    name: "บริษัท อาร์ แอนด์ ดี บีไอ จำกัด",
    development: { key: "rdbi", email: "intern-rdbi@example.test", phone: "02-000-1001", address_no: "88/11 ถนนรัชดาภิเษก", district: "ห้วยขวาง", province: "กรุงเทพมหานคร", postal_code: "10310" },
    jobs: [
      [2868, "Data Analyst", 3, "Excel, SQL, Python, Data Analysis, Reporting"],
    ],
  },
  {
    name: "บริษัท กรีนวิง จำกัดและบริษัทฯ ในเครือ",
    development: { key: "greenwing", email: "intern-greenwing@example.test", phone: "053-000-002", address_no: "29/15 ถนนพหลโยธิน", district: "เมืองเชียงราย", province: "เชียงราย", postal_code: "57000" },
    jobs: [
      [15104, "Data Analyst", 1, "Excel, Power BI, SQL, Python, Dashboard, Data Management"],
      [8372, "IT Support", 2, "User Support, Network Support, Troubleshooting"],
    ],
  },
  {
    name: "CloudEngine Digital Co. Ltd",
    development: { key: "cloudengine", email: "intern-cloudengine@example.test", phone: "02-000-1003", address_no: "120/8 ถนนสุขุมวิท", district: "วัฒนา", province: "กรุงเทพมหานคร", postal_code: "10110" },
    jobs: [
      [17213, "Network Engineer", 10, "Switch, Router, Firewall, LAN, WAN, Data Center"],
    ],
  },
  {
    name: "บริษัท ไอที สมาร์ท โซลูชั่น จำกัด (ภูเก็ต)",
    development: { key: "itsmart", email: "intern-itsmart@example.test", phone: "076-000-004", address_no: "49/17 ถนนเจ้าฟ้าตะวันตก", district: "เมืองภูเก็ต", province: "ภูเก็ต", postal_code: "83000" },
    jobs: [
      [9656, "Network engineer", 2, "Networking, Firewall, Server, Network Infrastructure"],
      [10373, "ไอที ซัพพอร์ต (IT SUPPORT)", 2, "Windows, Linux, LAN, Wi-Fi, Software Installation, IT Support"],
    ],
  },
  {
    name: "A-HOST Co.,Ltd.",
    development: { key: "ahost", email: "intern-ahost@example.test", phone: "02-000-1005", address_no: "77/23 ถนนสีลม", district: "บางรัก", province: "กรุงเทพมหานคร", postal_code: "10500" },
    jobs: [
      [10323, "Cloud and System Engineer", 10, "Cloud, Infrastructure, Virtualization, Networking, Disaster Recovery"],
    ],
  },
  {
    name: "ฝากด้วย โลจิสติกส์ แอนด์ ดิจิทัล แพลตฟอร์ม จำกัด",
    development: { key: "fakduay", email: "intern-fakduay@example.test", phone: "02-000-1006", address_no: "91/6 ถนนพัฒนาการ", district: "สวนหลวง", province: "กรุงเทพมหานคร", postal_code: "10250" },
    jobs: [
      [12914, "DevOps Engineer", 1, "IT Infrastructure, Deployment Automation, Configuration Management, Security"],
      [12910, "Back-End Developer", 1, "Backend Development, API, Database"],
    ],
  },
  {
    name: "INBLACK GAMING CO., LTD.",
    development: { key: "inblack", email: "intern-inblack@example.test", phone: "02-000-1007", address_no: "55/18 ถนนพระราม 9", district: "ห้วยขวาง", province: "กรุงเทพมหานคร", postal_code: "10310" },
    jobs: [
      [16630, "IT Support (Software Tester)", 2, "IT Support, Software Tools, Troubleshooting, System Monitoring"],
      [16633, "Front End Developer", 2, "Frontend Development, UI/UX, API Integration, Responsive Web"],
    ],
  },
  {
    name: "Focal Solution",
    development: { key: "focal", email: "intern-focal@example.test", phone: "02-000-1008", address_no: "144/2 ถนนวิภาวดีรังสิต", district: "จตุจักร", province: "กรุงเทพมหานคร", postal_code: "10900" },
    jobs: [
      [16858, "Software Engineer (Frontend)", 2, "JavaScript, TypeScript, React, Next.js, React Native"],
    ],
  },
  {
    name: "บริษัท แอคเซลล่า จำกัด",
    development: { key: "accella", email: "intern-accella@example.test", phone: "02-000-1009", address_no: "99/24 ถนนบางนา-ตราด", district: "บางนา", province: "กรุงเทพมหานคร", postal_code: "10260" },
    jobs: [
      [19736, "Full Stack Developer", 1, "Frontend, Backend, API, CRM, Web Development"],
    ],
  },
  {
    name: "Cyber Defense Co., Ltd",
    development: { key: "cyberdefense", email: "intern-cyberdefense@example.test", phone: "02-000-1010", address_no: "38/7 ถนนแจ้งวัฒนะ", district: "หลักสี่", province: "กรุงเทพมหานคร", postal_code: "10210" },
    jobs: [
      [12564, "SOC Analyst", 1, "SIEM, EDR, Firewall, Security Monitoring, Log Analysis"],
    ],
  },
  {
    name: "The Study",
    development: { key: "thestudy", email: "intern-thestudy@example.test", phone: "02-000-1011", address_no: "66/9 ถนนลาดพร้าว", district: "จตุจักร", province: "กรุงเทพมหานคร", postal_code: "10900" },
    jobs: [
      [13693, "Motion Graphic Design", 1, "Motion Graphics, Animation, Video Production"],
      [2495, "Editor", 2, "Content Editing, Video Editing, Creative Production"],
    ],
  },
  {
    name: "บริษัท สหมงคลฟิล์ม อินเตอร์เนชั่นแนล จำกัด",
    development: { key: "sahamongkol", email: "intern-sahamongkol@example.test", phone: "02-000-1012", address_no: "17/14 ถนนเพชรบุรี", district: "ราชเทวี", province: "กรุงเทพมหานคร", postal_code: "10400" },
    jobs: [
      [9249, "Production (Editor)", 2, "Video Editing, Adobe Premiere Pro, Motion Graphics, Production"],
      [14165, "IT Support", 2, "Hardware, Software, LAN, Wi-Fi, Technical Support"],
    ],
  },
];

const DEVELOPMENT_ALLOWANCES = {
  2868: 9000, 15104: 8000, 8372: 7000, 17213: 10000, 9656: 8000, 10373: 7000,
  10323: 10000, 12914: 10000, 12910: 9000, 16630: 8000, 16633: 9000, 16858: 10000,
  19736: 9000, 12564: 10000, 13693: 7000, 2495: 7000, 9249: 7000, 14165: 7000,
};

const normalizeName = (name) => name.replace(/\s+/gu, " ").toLocaleLowerCase("th-TH");
const summaryCounters = () => ({ inserted: 0, already_exists: 0, skipped: 0, failed: 0 });

async function seedInternthDevelopment() {
  if (!development.isDevelopmentDatabase(sequelize)) {
    throw new Error("DEVELOPMENT_TARGET_REQUIRED");
  }

  // Atomic, additive import. No verification token, email, reviewer or account is
  // created. Pending states retain their normal unverified meaning.
  return sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
  }, async (transaction) => {
    const [target] = await sequelize.query(
      "SELECT current_database() AS database, current_schema() AS schema",
      { type: QueryTypes.SELECT, transaction },
    );
    if (target.database !== "intern_system" || target.schema !== "public") {
      throw new Error("DEVELOPMENT_TARGET_MISMATCH");
    }

    // Serialize this importer without changing constraints or locking other domains.
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:key))", {
      replacements: { key: "fitm-intern:internth-development" }, transaction,
      type: QueryTypes.SELECT,
    });
    const summary = { companies: summaryCounters(), submissions: summaryCounters(), jobs: summaryCounters() };
    const identities = new Set();
    const sourceIds = new Set();
    const sourceUrls = new Set();
    const companies = [];
    const jobs = [];
    let duplicateCompanies = 0;
    let duplicateJobs = 0;

    for (const company of SOURCE_COMPANIES) {
      const identity = normalizeName(company.name);
      const fixture = company.development;
      const expectedCompanyId = development.companyId(fixture.key);
      let companyRecord;
      let companyOutcome;
      if (identities.has(identity)) {
        duplicateCompanies += 1;
        summary.companies.skipped += 1;
        companyOutcome = "DUPLICATE_DATASET_IDENTITY";
      } else {
        identities.add(identity);
        const matches = await Company.findAll({
          where: { [Op.or]: [{ id: expectedCompanyId }, { normalized_name: identity },
            { name: company.name }, { normalized_email: fixture.email }, { email: fixture.email }] },
          attributes: ["id", "name", "normalized_email"], transaction,
        });
        if (matches.length > 1 || (matches.length === 1 && (matches[0].id !== expectedCompanyId
          || matches[0].name !== company.name || matches[0].normalized_email !== fixture.email))) {
          // A name alone is not authority to merge an existing company's identity.
          companyOutcome = "EXISTING_COMPANY_IDENTITY_CONFLICT";
          summary.companies.skipped += 1;
        } else if (matches.length === 1) {
          companyRecord = matches[0];
          companyOutcome = "already_exists";
          summary.companies.already_exists += 1;
        } else {
          companyRecord = await Company.create({
            id: expectedCompanyId, name: company.name, normalized_name: identity,
            email: fixture.email, normalized_email: fixture.email, phone: fixture.phone,
            address_no: fixture.address_no, moo: null,
            // No subdistrict was supplied; this additional required field is
            // explicitly synthetic, rather than an inferred real subdivision.
            subdistrict: fixture.province === "กรุงเทพมหานคร"
              ? "แขวงตัวอย่าง (Development)" : "ตำบลตัวอย่าง (Development)",
            district: fixture.district, province: fixture.province, email_verified_at: null,
          }, { transaction });
          companyOutcome = "inserted";
          summary.companies.inserted += 1;
        }
      }
      companies.push({ company: company.name, company_id: companyRecord?.id || null, outcome: companyOutcome });

      let submission;
      if (companyRecord) {
        const id = development.submissionId(fixture.key);
        submission = await JobSubmission.findByPk(id, { transaction });
        if (submission && (submission.company_id !== companyRecord.id
          || submission.normalized_submitted_email !== fixture.email)) {
          summary.submissions.skipped += 1;
          submission = null;
        } else if (submission) {
          summary.submissions.already_exists += 1;
        } else {
          submission = await JobSubmission.create({
            id, company_id: companyRecord.id, submitted_email: fixture.email,
            normalized_submitted_email: fixture.email,
            verification_status: "pending_email_verification", verified_at: null,
          }, { transaction });
          summary.submissions.inserted += 1;
        }
      }

      for (const [sourceId, title, quota, skillsWorkSummary] of company.jobs) {
        const sourceUrl = development.sourceUrl(sourceId);
        if (sourceIds.has(sourceId) || sourceUrls.has(sourceUrl)) {
          duplicateJobs += 1;
          summary.jobs.skipped += 1;
          continue;
        }
        sourceIds.add(sourceId);
        sourceUrls.add(sourceUrl);
        const mapping = { source_id: sourceId, source_url: sourceUrl, company: company.name,
          company_id: companyRecord?.id || null, job_posting_id: null };
        if (!companyRecord || !submission) {
          summary.jobs.skipped += 1;
          jobs.push({ ...mapping, outcome: "skipped", reason: "COMPANY_OR_SUBMISSION_CONFLICT" });
          continue;
        }
        const id = development.jobId(sourceId);
        // Source URL is also stored as an exact line in description. Check both
        // UUID and marker so an earlier differently-keyed import is not duplicated.
        const matches = await JobPosting.findAll({
          where: { [Op.or]: [{ id }, { description: { [Op.like]: `%Source: ${sourceUrl}\n%` } }] },
          attributes: ["id", "company_id", "submission_id", "title"], transaction,
        });
        if (matches.length > 1 || (matches.length === 1 && (matches[0].id !== id
          || matches[0].company_id !== companyRecord.id || matches[0].submission_id !== submission.id
          || matches[0].title !== title))) {
          summary.jobs.skipped += 1;
          jobs.push({ ...mapping, outcome: "skipped", reason: "EXISTING_SOURCE_IDENTITY_CONFLICT" });
          continue;
        }
        if (matches.length === 1) {
          summary.jobs.already_exists += 1;
          jobs.push({ ...mapping, job_posting_id: id, outcome: "already_exists" });
          continue;
        }
        const allowance = DEVELOPMENT_ALLOWANCES[sourceId];
        if (!Number.isInteger(allowance)) throw new Error("DEVELOPMENT_ALLOWANCE_MISSING");
        const subdistrict = fixture.province === "กรุงเทพมหานคร"
          ? "แขวงตัวอย่าง (Development)" : "ตำบลตัวอย่าง (Development)";
        await JobPosting.create({
          id, company_id: companyRecord.id, submission_id: submission.id, title, quota,
          category: [13693, 2495, 9249].includes(sourceId) ? "design" : "information_technology",
          description: [
            development.DEVELOPMENT_LABEL,
            `Source: ${sourceUrl}`,
            `Internth Job ID: ${sourceId}; snapshot: 2026-11-08 (ข้อมูลต้นทางจากผู้ใช้)`,
            `Skills/Work summary: ${skillsWorkSummary}`,
            "ทักษะ/งานเป็นข้อมูลสรุปสำหรับค้นหาและจัดหมวด ไม่ใช่คุณสมบัติบังคับทุกข้อ",
            "ชื่อบริษัท/ตำแหน่ง/จำนวนรับตาม snapshot; สถานะเปิดรับปัจจุบัน UNKNOWN / UNVERIFIED",
            "University Approval: NOT VERIFIED; Company Partnership: NOT VERIFIED",
            "อีเมล โทรศัพท์ ที่อยู่ เบี้ยเลี้ยง และวันทำงานเป็นข้อมูลจำลอง ไม่ใช่เงื่อนไขจ้างงานหรือข้อมูลติดต่อจริง",
            `ที่อยู่จำลอง: ${fixture.address_no} ${subdistrict} ${fixture.district} ${fixture.province} ${fixture.postal_code}`,
            "Workdays: 5 วัน/สัปดาห์ (Development estimate); Work mode: ไม่ระบุ",
          ].join("\n"),
          compensation_text: `${allowance.toLocaleString("en-US")} บาท/เดือน — ${development.DEVELOPMENT_LABEL}`,
          work_days_per_week: 5, status: "pending_email_verification",
          reviewed_at: null, published_at: null, expires_at: null,
        }, { transaction });
        summary.jobs.inserted += 1;
        jobs.push({ ...mapping, job_posting_id: id, outcome: "inserted" });
      }
    }

    return {
      execution: "COMMITTED",
      target, source: "Internth", snapshot_date: "2026-11-08",
      source_evidence: "USER_SUPPLIED_SNAPSHOT_NOT_INDEPENDENTLY_REVERIFIED",
      current_hiring_status: "UNKNOWN / UNVERIFIED",
      university_approval: "NOT VERIFIED", company_partnership: "NOT VERIFIED",
      summary,
      duplicates_in_dataset: { companies: duplicateCompanies, jobs: duplicateJobs },
      database_duplicate_lookup: "DETERMINISTIC_UUID_AND_COMPANY_IDENTITY_AND_SOURCE_URL_MARKER",
      models_considered: [Company.tableName, JobSubmission.tableName, JobPosting.tableName],
      status: "pending_email_verification",
      source_mapping: "DETERMINISTIC_UUID_AND_DESCRIPTION_AND_DOCUMENTATION",
      companies, jobs,
      database_changes: { companies: summary.companies.inserted,
        job_submissions: summary.submissions.inserted, job_postings: summary.jobs.inserted },
      tests: "NOT RUN — USER-OWNED TESTING",
    };
  });
}

async function main() {
  try {
    console.log(JSON.stringify(await seedInternthDevelopment(), null, 2));
  } catch (error) {
    // Avoid printing connection details, SQL parameters or driver error messages.
    const code = ["DEVELOPMENT_TARGET_REQUIRED", "DEVELOPMENT_TARGET_MISMATCH"].includes(error.message)
      ? error.message : "DATABASE_EXECUTION_FAILED";
    console.error(JSON.stringify({ execution: "NOT_COMPLETED", code, database_changes: "NONE",
      failure_type: error.name, database_code: error.original?.code,
      fields: error.errors?.map((entry) => entry.path) }));
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) main();

module.exports = { SOURCE_COMPANIES, seedInternthDevelopment };
