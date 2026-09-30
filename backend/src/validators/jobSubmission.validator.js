const MAX_JOB_POSTINGS_PER_SUBMISSION = 10;

const COMPANY_FIELDS = new Set([
  "name",
  "email",
  "phone",
  "addressNo",
  "moo",
  "subdistrict",
  "district",
  "province",
]);
const JOB_POSTING_FIELDS = new Set([
  "title",
  "category",
  "description",
  "quota",
  "compensation",
  "workDaysPerWeek",
  "workModes",
]);
const TOP_LEVEL_FIELDS = new Set(["company", "jobPostings", "captchaToken"]);
const JOB_CATEGORIES = new Set([
  "information_technology",
  "business",
  "design",
  "engineering",
  "other",
]);
const WORK_MODES = new Set(["onsite", "work_from_home", "hybrid"]);

class JobSubmissionValidationError extends Error {
  constructor(errors) {
    super("Recruitment submission validation failed");
    this.name = "JobSubmissionValidationError";
    this.status = 400;
    this.errors = errors;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createCollector() {
  const errors = [];
  return {
    add(path, message) {
      errors.push({ path, message });
    },
    throwIfAny() {
      if (errors.length) throw new JobSubmissionValidationError(errors);
    },
  };
}

function rejectUnknownFields(value, allowedFields, path, collector) {
  if (!isPlainObject(value)) return;
  Object.keys(value)
    .filter((field) => !allowedFields.has(field))
    .forEach((field) =>
      collector.add(`${path}${path ? "." : ""}${field}`, "is not allowed"),
    );
}

function requiredText(value, path, minLength, maxLength, collector) {
  if (typeof value !== "string") {
    collector.add(path, "must be a string");
    return undefined;
  }
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) {
    collector.add(
      path,
      `must be between ${minLength} and ${maxLength} characters`,
    );
    return undefined;
  }
  return normalized;
}

function optionalText(value, path, maxLength, collector) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    collector.add(path, "must be a string or null");
    return undefined;
  }
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    collector.add(path, `must not exceed ${maxLength} characters`);
    return undefined;
  }
  return normalized;
}

function normalizeEmail(value, path, collector) {
  const normalized = requiredText(value, path, 3, 254, collector);
  if (normalized === undefined) return undefined;
  const email = normalized.toLowerCase();
  // Deliberately modest: this accepts valid international/local-part forms without
  // trying to rewrite a business email address.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    collector.add(path, "must be a valid email address");
    return undefined;
  }
  return email;
}

function integerInRange(value, path, min, max, collector) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    collector.add(path, `must be an integer between ${min} and ${max}`);
    return undefined;
  }
  return value;
}

function normalizeWorkModes(value, path, collector) {
  if (!Array.isArray(value)) {
    collector.add(path, "must be an array");
    return undefined;
  }
  if (value.length < 1 || value.length > WORK_MODES.size) {
    collector.add(path, "must contain between 1 and 3 work modes");
    return undefined;
  }
  const normalized = [];
  value.forEach((mode, index) => {
    if (typeof mode !== "string") {
      collector.add(`${path}[${index}]`, "must be a string");
      return;
    }
    const normalizedMode = mode.trim().toLowerCase();
    if (!WORK_MODES.has(normalizedMode)) {
      collector.add(`${path}[${index}]`, "is not a supported work mode");
      return;
    }
    normalized.push(normalizedMode);
  });
  if (new Set(normalized).size !== normalized.length) {
    collector.add(path, "must not contain duplicate work modes");
  }
  return normalized;
}

function normalizeCompany(company, collector) {
  if (!isPlainObject(company)) {
    collector.add("company", "must be an object");
    return undefined;
  }
  rejectUnknownFields(company, COMPANY_FIELDS, "company", collector);

  const name = requiredText(company.name, "company.name", 2, 255, collector);
  const email = normalizeEmail(company.email, "company.email", collector);
  const phone = requiredText(company.phone, "company.phone", 7, 32, collector);
  const addressNo = requiredText(
    company.addressNo,
    "company.addressNo",
    1,
    50,
    collector,
  );
  const moo = optionalText(company.moo, "company.moo", 30, collector);
  const subdistrict = requiredText(
    company.subdistrict,
    "company.subdistrict",
    1,
    100,
    collector,
  );
  const district = requiredText(
    company.district,
    "company.district",
    1,
    100,
    collector,
  );
  const province = requiredText(
    company.province,
    "company.province",
    1,
    100,
    collector,
  );

  if (
    [name, email, phone, addressNo, moo, subdistrict, district, province].some(
      (value) => value === undefined,
    )
  ) {
    return undefined;
  }
  return {
    name,
    email,
    phone,
    addressNo,
    moo,
    subdistrict,
    district,
    province,
  };
}

function normalizeJobPosting(jobPosting, index, collector) {
  const path = `jobPostings[${index}]`;
  if (!isPlainObject(jobPosting)) {
    collector.add(path, "must be an object");
    return undefined;
  }
  rejectUnknownFields(jobPosting, JOB_POSTING_FIELDS, path, collector);

  const title = requiredText(
    jobPosting.title,
    `${path}.title`,
    2,
    255,
    collector,
  );
  const category = requiredText(
    jobPosting.category,
    `${path}.category`,
    1,
    64,
    collector,
  );
  if (category !== undefined && !JOB_CATEGORIES.has(category)) {
    collector.add(`${path}.category`, "is not a supported category");
  }
  const description = requiredText(
    jobPosting.description,
    `${path}.description`,
    20,
    20000,
    collector,
  );
  const quota = integerInRange(
    jobPosting.quota,
    `${path}.quota`,
    1,
    9999,
    collector,
  );
  const compensation = requiredText(
    jobPosting.compensation,
    `${path}.compensation`,
    1,
    500,
    collector,
  );
  const workDaysPerWeek = integerInRange(
    jobPosting.workDaysPerWeek,
    `${path}.workDaysPerWeek`,
    1,
    7,
    collector,
  );
  const workModes = normalizeWorkModes(
    jobPosting.workModes,
    `${path}.workModes`,
    collector,
  );

  if (
    [
      title,
      category,
      description,
      quota,
      compensation,
      workDaysPerWeek,
      workModes,
    ].some((value) => value === undefined) ||
    !JOB_CATEGORIES.has(category)
  ) {
    return undefined;
  }
  return {
    title,
    category,
    description,
    quota,
    compensation,
    workDaysPerWeek,
    workModes,
  };
}

function normalizeCompanyName(name) {
  return name.replace(/\s+/gu, " ").toLocaleLowerCase("th-TH");
}

function validateJobSubmissionPayload(body) {
  const collector = createCollector();
  if (!isPlainObject(body)) {
    throw new JobSubmissionValidationError([
      { path: "body", message: "must be a JSON object" },
    ]);
  }
  rejectUnknownFields(body, TOP_LEVEL_FIELDS, "", collector);
  const company = normalizeCompany(body.company, collector);
  const captchaToken = requiredText(
    body.captchaToken,
    "captchaToken",
    1,
    2048,
    collector,
  );

  if (!Array.isArray(body.jobPostings)) {
    collector.add("jobPostings", "must be an array");
  } else {
    if (
      body.jobPostings.length < 1 ||
      body.jobPostings.length > MAX_JOB_POSTINGS_PER_SUBMISSION
    ) {
      collector.add(
        "jobPostings",
        `must contain between 1 and ${MAX_JOB_POSTINGS_PER_SUBMISSION} items`,
      );
    }
  }
  const jobPostings = Array.isArray(body.jobPostings)
    ? body.jobPostings.map((jobPosting, index) =>
        normalizeJobPosting(jobPosting, index, collector),
      )
    : [];

  collector.throwIfAny();
  return {
    company: {
      ...company,
      normalizedName: normalizeCompanyName(company.name),
      normalizedEmail: company.email,
    },
    jobPostings,
    captchaToken,
  };
}

module.exports = {
  JOB_CATEGORIES,
  MAX_JOB_POSTINGS_PER_SUBMISSION,
  WORK_MODES,
  JobSubmissionValidationError,
  validateJobSubmissionPayload,
};
