const { createHash } = require("crypto");
const { Op } = require("sequelize");

const JOB_SOURCE_IDS = [2868, 15104, 8372, 17213, 9656, 10373, 10323, 12914, 12910,
  16630, 16633, 16858, 19736, 12564, 13693, 2495, 9249, 14165];
const COMPANY_KEYS = ["rdbi", "greenwing", "cloudengine", "itsmart", "ahost", "fakduay",
  "inblack", "focal", "accella", "cyberdefense", "thestudy", "sahamongkol"];
const DEVELOPMENT_LABEL = "ข้อมูลจำลองสำหรับ Development";

// UUIDv5 (URL namespace): the source URL is the persistent job dedup key.
function sourceUuid(value) {
  const namespace = Buffer.from("6ba7b8119dad11d180b400c04fd430c8", "hex");
  const bytes = createHash("sha1").update(namespace).update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const sourceUrl = (id) => `https://internth.com/job/${id}`;
const companyId = (key) => sourceUuid(`fitm-intern:development:internth:company:${key}`);
const submissionId = (key) => sourceUuid(`fitm-intern:development:internth:submission:${key}`);
const jobId = (id) => sourceUuid(sourceUrl(id));
const COMPANY_IDS = COMPANY_KEYS.map(companyId);
const JOB_IDS = JOB_SOURCE_IDS.map(jobId);

// Sources supplied and verified by the user; this is not email/account verification.
const FOCAL_SOURCE = Object.freeze({
  source_id: 16858, company_name: "Focal Solution", title: "Software Engineer (Frontend)",
  phone: "02-107-1086", email: "info@focalsolution.com", website: "https://focalsolution.com",
  company_source_url: "https://focalsolution.com/", job_source_url: sourceUrl(16858),
  office_address: "416/169 Soi Lad Phrao 87 (Chanthra Suk), Khlong Chaokhun Sing, Wang Thonglang, Bangkok 10310",
  address_no: "416/169 Soi Lad Phrao 87 (Chanthra Suk)", subdistrict: "Khlong Chaokhun Sing",
  district: "Wang Thonglang", province: "กรุงเทพมหานคร",
  work_schedule: "5 วัน/สัปดาห์ · 09:00–18:00", compensation_text: "400 บาท (ต้นทางไม่ระบุหน่วยชัดเจน)",
});
const FOCAL_PROVENANCE_LINE = `Source provenance: ${JSON.stringify({
  version: 1, evidence: "user_provided_verified_sources", recorded_on: "2026-11-08",
  contact_source: FOCAL_SOURCE.company_source_url, job_source: FOCAL_SOURCE.job_source_url,
})}`;

function focalSourceInformation(job) {
  const company = job?.company;
  return (job?.id || job?.job_posting_id) === jobId(16858)
    && company?.id === companyId("focal") && company.name === FOCAL_SOURCE.company_name
    && company.email === FOCAL_SOURCE.email && company.phone === FOCAL_SOURCE.phone
    && company.address_no === FOCAL_SOURCE.address_no && company.subdistrict === FOCAL_SOURCE.subdistrict
    && company.district === FOCAL_SOURCE.district && company.province === FOCAL_SOURCE.province
    && job.description?.split("\n").includes(FOCAL_PROVENANCE_LINE)
    ? FOCAL_SOURCE : null;
}

function isDevelopmentDatabase(database) {
  return process.env.NODE_ENV === "development"
    && database?.config?.database === "intern_system"
    && ["localhost", "127.0.0.1", "::1", "postgres", "intern_postgres"].includes(database.config.host)
    && Number(database.config.port) === 5432;
}

function companyVisibilityWhere(database) {
  return isDevelopmentDatabase(database) ? {} : { id: { [Op.notIn]: COMPANY_IDS } };
}

function decorateCompany(company) {
  const plain = typeof company?.get === "function" ? company.get({ plain: true }) : company;
  return { ...plain, address_provenance: companyAddressProvenance(plain), request_address: companyRequestAddress(plain),
    ...(COMPANY_IDS.includes(plain.id) ? { development_data: true, development_label: DEVELOPMENT_LABEL } : {}) };
}

function companyAddressProvenance(company) {
  const focal = company.id === companyId("focal") && company.name === FOCAL_SOURCE.company_name
    && !String(company.moo ?? "").trim()
    && ["address_no", "subdistrict", "district", "province"].every(key => company[key] === FOCAL_SOURCE[key]);
  return { classification: focal ? "VERIFIED_SOURCE" : COMPANY_IDS.includes(company.id) ? "SYNTHETIC" : "UNVERIFIED",
    source_url: focal ? FOCAL_SOURCE.company_source_url : null, scope: "company_address_not_hiring_or_email_ownership" };
}

function companyRequestAddress(company) {
  const address = [company.address_no, company.moo, company.subdistrict, company.district, company.province].filter(Boolean).join(" ");
  const provenance = companyAddressProvenance(company);
  const label = provenance.classification === "SYNTHETIC" ? DEVELOPMENT_LABEL
    : provenance.classification === "VERIFIED_SOURCE" ? `ที่อยู่จากแหล่งอ้างอิง ${provenance.source_url} (ไม่ยืนยันการเปิดรับ)`
    : "ข้อมูลที่อยู่ยังไม่ได้รับการยืนยัน";
  // Store the evidence available at submission time in the existing TEXT snapshot.
  // Never derive or rewrite provenance for historical requests on read.
  return `${label}: ${address || "ยังไม่มีข้อมูล"}`;
}

function decorateDevelopmentJob(job) {
  const plain = typeof job?.get === "function" ? job.get({ plain: true }) : job;
  const id = JOB_SOURCE_IDS.find((sourceId) => jobId(sourceId) === plain.id);
  if (!id) return null;
  return {
    job_posting_id: plain.id, title: plain.title, description: plain.description,
    category: plain.category, quota: plain.quota, compensation_text: plain.compensation_text,
    work_days_per_week: plain.work_days_per_week, company: plain.company,
    workModes: plain.workModes || [], status: plain.status,
    development_data: true, development_label: DEVELOPMENT_LABEL,
    source_id: id, source_url: sourceUrl(id),
    hiring_status: "UNKNOWN / UNVERIFIED", university_approval: "NOT VERIFIED",
    selectable: false,
  };
}

function jobDisplayInformation(job, database) {
  const plain = typeof job?.get === "function" ? job.get({ plain: true }) : job;
  const sourceId = JOB_SOURCE_IDS.find((id) => jobId(id) === (plain.id || plain.job_posting_id));
  const company = plain.company || {};
  const emailDomain = typeof company.email === "string" ? company.email.split("@").at(-1).toLowerCase() : "";
  const reservedDomain = /(?:^|\.)(?:example\.(?:com|org|net)|test|example|invalid|localhost)$/.test(emailDomain);
  const developmentData = Boolean(sourceId) || COMPANY_IDS.includes(company.id) || reservedDomain;
  const focal = focalSourceInformation(plain);
  const synthetic = developmentData && !focal;
  const showSamples = synthetic && isDevelopmentDatabase(database);
  const verifiedEmail = !synthetic && company.email_verified_at && typeof company.email === "string"
    ? company.email : null;
  const summary = sourceId ? plain.description?.match(/Skills\/Work summary: ([^\n]+)/)?.[1] : null;
  const provenance = value => !value ? "MISSING" : focal ? "VERIFIED_SOURCE" : synthetic ? "SYNTHETIC" : "UNVERIFIED";
  return {
    development_data: developmentData,
    development_label: developmentData ? "ชุดข้อมูล Development · ยังไม่ยืนยันการเปิดรับจริง" : null,
    source_id: sourceId || null, source_url: sourceId ? sourceUrl(sourceId) : null,
    source_name: sourceId ? "Internth" : null,
    hiring_status: sourceId ? "UNKNOWN / UNVERIFIED" : null,
    display_description: summary ? `สรุปงานและทักษะจากประกาศต้นทาง: ${summary}` : plain.description,
    job_information_source: focal ? { type: "original_posting", url: focal.job_source_url,
      evidence: "user_provided_verified_sources" } : null,
    work_schedule: focal?.work_schedule || null,
    work_schedule_synthetic: synthetic,
    contact: { synthetic, samples_visible: showSamples,
      provenance: { phone: provenance(company.phone), email: provenance(company.email),
        office_address: provenance(company.address_no), website: focal ? "VERIFIED_SOURCE" : "MISSING" },
      email: focal ? company.email : verifiedEmail || (showSamples ? company.email : null),
      email_verified: Boolean(verifiedEmail), email_source_verified: Boolean(focal),
      phone: focal || showSamples ? company.phone : null,
      phone_verified: false, phone_source_verified: Boolean(focal),
      website: focal?.website || null,
      office_address: focal?.office_address || (showSamples
        ? [company.address_no, company.moo, company.subdistrict, company.district, company.province].filter(Boolean).join(" ") : null),
      source: focal ? { type: "company_website", url: focal.company_source_url,
        evidence: "user_provided_verified_sources", recorded_on: "2026-11-08", scope: "general_company_contact" } : null,
    },
  };
}

module.exports = { COMPANY_KEYS, COMPANY_IDS, JOB_SOURCE_IDS, JOB_IDS, DEVELOPMENT_LABEL,
  companyId, submissionId, jobId, sourceUrl, isDevelopmentDatabase,
  companyVisibilityWhere, decorateCompany, decorateDevelopmentJob, jobDisplayInformation,
  companyAddressProvenance, companyRequestAddress,
  FOCAL_SOURCE, FOCAL_PROVENANCE_LINE, focalSourceInformation };
