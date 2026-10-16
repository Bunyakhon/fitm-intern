const { PROFILE_FIELDS, isCalendarDate, todayInBangkok } = require("./studentProfileIntegrity");
const specs = require("../models/studentProfileAggregate.schema");
const { MAX_PERSON_NAME_LENGTH, isThaiPersonName } = require("../validators/personName.validator");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVATE_PROFILE_FIELDS = ["national_id_ciphertext", "national_id_key_version"];
const EXTRA_PROFILE_FIELDS = Object.keys(specs.extensions.student_profiles.columns).filter(key => !PRIVATE_PROFILE_FIELDS.includes(key));
const EDITABLE_PROFILE_FIELDS = [...PROFILE_FIELDS, ...EXTRA_PROFILE_FIELDS];
const STUDENT_FIELDS = ["first_name", "last_name", "major", "year_level", "gpa", "advisor_teacher_id", "department", "faculty", "last_semester_gpa"];
const RELATIONS = {
  addresses: { table: "student_addresses", model: "StudentAddress" },
  education: { table: "student_education_records", model: "StudentEducationRecord" },
  training: { table: "student_training_records", model: "StudentTrainingRecord" },
  skills: { table: "student_skills", model: "StudentSkill" },
};
function fail(message, status = 400, code = "PROFILE_VALIDATION_ERROR") {
  throw Object.assign(new Error(message), { status, code });
}
function object(body, allowed) {
  if (!body || typeof body !== "object" || Array.isArray(body)) fail("ต้องส่ง JSON object");
  if (Object.keys(body).some(key => !allowed.includes(key))) fail("มีฟิลด์ที่ไม่อนุญาตให้แก้ไข");
}
function text(value, field, max = 255) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") fail(field + " ต้องเป็นข้อความหรือ null");
  const result = value.trim();
  if ([...result].length > max || /[\u0000\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(result)) fail(field + " มีความยาวหรือรูปแบบไม่ถูกต้อง");
  return result || null;
}
function phone(value, field, max) {
  const result = text(value, field, max);
  const count = (result?.match(/\d/g) || []).length;
  if (result && (!/^[+\d\s()-]+$/.test(result) || count < 7 || count > 20)) fail(field + " หมายเลขโทรศัพท์ไม่ถูกต้อง");
  return result;
}
function date(value, field) {
  if (value === null || value === "") return null;
  if (!isCalendarDate(value)) fail(field + " ต้องเป็นวันที่จริง YYYY-MM-DD (ค.ศ.)");
  if (field === "birth_date" && value > todayInBangkok()) fail("วันเกิดต้องไม่อยู่ในอนาคต");
  return value;
}
function gpa(value, field) {
  if (value === null || value === "") return null;
  if (!["string", "number"].includes(typeof value) || !/^\d(?:\.\d{1,2})?$/.test(String(value)) || Number(value) < 0 || Number(value) > 4) fail(field + " ต้องเป็น GPA 0–4 ไม่เกินสองตำแหน่ง");
  return Number(value).toFixed(2);
}
function integer(value, field, min, max, nullable = true) {
  if (nullable && (value === null || value === "")) return null;
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(field + " ต้องเป็นจำนวนเต็มในช่วงที่อนุญาต");
  return value;
}
function normalizeProfile(body) {
  object(body, EDITABLE_PROFILE_FIELDS);
  const result = {};
  const longText = new Set(["medical_conditions", "allergies", "special_abilities", "related_skills", "hometown_address", "current_address", "parent_contact_address", "emergency_contact_address", "father_address", "mother_address"]);
  for (const [field, value] of Object.entries(body)) {
    if (value === undefined) continue;
    const spec = specs.extensions.student_profiles.columns[field];
    if (field === "birth_date" || spec?.type === "date") result[field] = date(value, field);
    else if (field.endsWith("_phone")) result[field] = phone(value, field, spec?.length || 255);
    else if (["father_age", "mother_age"].includes(field)) result[field] = integer(value, field, 1, 2147483647);
    else if (["height_cm", "weight_kg"].includes(field)) {
      if (value === null || value === "") result[field] = null;
      else if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 999.99) fail(field + " ต้องเป็นจำนวนบวกไม่เกิน 999.99");
      else result[field] = value;
    } else if (field === "has_driving_license") {
      if (value !== null && typeof value !== "boolean") fail(field + " ต้องเป็น boolean หรือ null");
      result[field] = value;
    } else result[field] = text(value, field, longText.has(field) ? Infinity : spec?.length || 255);
  }
  for (const [field, allowed] of [["prefix", ["นาย", "นางสาว", "นาง"]], ["blood_type", ["A", "B", "AB", "O", "ไม่ทราบ"]], ["military_status", ["served", "not_yet_served"]]]) {
    if (result[field] != null && !allowed.includes(result[field])) fail(field + " ไม่อยู่ในค่าที่อนุญาต");
  }
  return result;
}
function validateProfileState(profile) {
  if (profile.national_id_issue_date && profile.national_id_expiry_date && profile.national_id_expiry_date < profile.national_id_issue_date) fail("วันหมดอายุบัตรต้องไม่ก่อนวันออกบัตร");
  if (profile.has_driving_license === false && ["driving_license_number", "driving_license_type", "driving_license_expiry_date"].some(field => profile[field] != null)) fail("เมื่อไม่มีใบขับขี่ต้องล้างรายละเอียดใบขับขี่โดยชัดเจน");
}
function normalizeStudent(body) {
  object(body, STUDENT_FIELDS);
  const result = {};
  for (const [field, value] of Object.entries(body)) {
    if (value === undefined) continue;
    if (["first_name", "last_name"].includes(field)) {
      if (!isThaiPersonName(value)) {
        const label = field === "first_name" ? "ชื่อ" : "นามสกุล";
        fail(typeof value === "string" && [...value.trim()].length > MAX_PERSON_NAME_LENGTH
          ? `${label}ต้องมีความยาวไม่เกิน ${MAX_PERSON_NAME_LENGTH} อักขระ`
          : `กรุณากรอก${label}เป็นภาษาไทยเท่านั้น`);
      }
      result[field] = value.trim();
    } else if (["gpa", "last_semester_gpa"].includes(field)) result[field] = gpa(value, field);
    else if (field === "year_level") result[field] = integer(value, field, 1, 4);
    else if (field === "advisor_teacher_id") {
      if (value !== null && !UUID.test(value || "")) fail("advisor_teacher_id ต้องเป็น UUID หรือ null");
      result[field] = value;
    } else result[field] = text(value, field);
  }
  return result;
}
function normalizeChild(kind, body, creating = false) {
  const relation = RELATIONS[kind];
  if (!relation) fail("ไม่พบประเภทข้อมูล", 404);
  const spec = specs.tables[relation.table];
  const fields = Object.keys(spec.columns).filter(key => !["id", "student_id", "created_at", "updated_at"].includes(key));
  object(body, fields);
  const result = {};
  for (const [field, value] of Object.entries(body)) {
    if (value === undefined) continue;
    const column = spec.columns[field];
    if (field === "gpa") result[field] = gpa(value, field);
    else if (field === "graduation_year") result[field] = integer(value, field, 1, 9999);
    else if (field === "display_order") result[field] = integer(value, field, 0, 2147483647, false);
    else result[field] = text(value, field, column.length);
    if (!column.nullable && result[field] === null) fail(field + " ต้องมีค่า");
  }
  for (const [field, allowed] of [["address_type", ["registered", "current"]], ["education_level", ["bachelor", "high_vocational", "high_school_vocational"]], ["category", ["computer", "language"]], ["proficiency", ["very_good", "good", "moderate", "fair"]]]) {
    if (result[field] != null && !allowed.includes(result[field])) fail(field + " ไม่อยู่ในค่าที่อนุญาต");
    if (creating && fields.includes(field) && !spec.columns[field].nullable && !result[field]) fail(field + " ต้องมีค่า");
  }
  // No country policy exists: keep a string of up to 16 characters, preserving leading zeroes.
  return result;
}
function revision(value) {
  if (!value) fail("กรุณาโหลดประวัติล่าสุดก่อนบันทึก", 428, "PROFILE_REVISION_REQUIRED");
  if (!/^"[a-f0-9]{64}"$/.test(value)) fail("If-Match ต้องเป็น profile_revision จาก API");
  return value;
}
module.exports = { UUID, PRIVATE_PROFILE_FIELDS, EXTRA_PROFILE_FIELDS, EDITABLE_PROFILE_FIELDS, STUDENT_FIELDS, RELATIONS, fail, object, text, normalizeProfile, validateProfileState, normalizeStudent, normalizeChild, revision };
