const { createHash } = require("node:crypto");

const PROFILE_FIELDS = [
  "prefix", "birth_date", "height_cm", "weight_kg", "nationality",
  "ethnicity", "religion", "blood_type", "medical_conditions", "allergies",
  "special_abilities", "related_skills", "hometown_address", "hometown_phone",
  "current_address", "current_phone", "father_name", "father_age",
  "father_occupation", "mother_name", "mother_age", "mother_occupation",
  "parent_contact_address", "parent_phone", "emergency_contact_name",
  "emergency_contact_relation", "emergency_contact_address", "emergency_contact_phone",
];

// DATEONLY: validate the Gregorian calendar without Date's overflow normalization.
function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

function todayInBangkok(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = type => parts.find(part => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// Opaque representation validator; uses existing data/metadata, no schema revision.
// Include owner identity and distinguish a missing profile from an empty profile.
function profileRevision(studentId, profile) {
  const values = profile ? [profile.id, profile.updatedAt ?? profile.updated_at,
    ...PROFILE_FIELDS.map(field => {
      const value = profile[field] ?? null;
      return value !== null && ["height_cm", "weight_kg"].includes(field) ? Number(value) : value;
    })] : null;
  const hash = createHash("sha256").update(JSON.stringify([studentId, values])).digest("hex");
  return `"${hash}"`;
}

module.exports = { PROFILE_FIELDS, isCalendarDate, todayInBangkok, profileRevision };
