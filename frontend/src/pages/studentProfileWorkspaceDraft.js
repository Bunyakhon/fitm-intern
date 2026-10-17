// Field names and limits follow the installed Phase 3A API, not PDF row counts.
const field = (key, label, type = "text", extra = {}) => ({ key, label, type, max: 255, ...extra });
export const proficiencyOptions = [["very_good", "ดีมาก"], ["good", "ดี"], ["moderate", "ปานกลาง"], ["fair", "พอใช้"]];
export const workspaceFields = {
  academic: [field("department", "ภาควิชา"), field("faculty", "คณะ"), field("last_semester_gpa", "GPA ภาคเรียนที่ผ่านมา", "gpa")],
  personal: [field("english_first_name", "ชื่อภาษาอังกฤษ"), field("english_last_name", "นามสกุลภาษาอังกฤษ"), field("gender", "เพศ", "text", { max: 32 }),
    field("national_id_issue_date", "วันที่ออกบัตรประชาชน", "date"), field("national_id_expiry_date", "วันที่หมดอายุบัตรประชาชน", "date"),
    field("has_driving_license", "ใบอนุญาตขับขี่", "boolean", { options: [["true", "มี"], ["false", "ไม่มี"]] }),
    field("driving_license_number", "เลขใบอนุญาตขับขี่", "text", { max: 64, license: true }), field("driving_license_type", "ประเภทใบอนุญาต", "text", { max: 100, license: true }),
    field("driving_license_expiry_date", "วันหมดอายุใบอนุญาต", "date", { license: true }),
    field("military_status", "ภาวะทางทหาร", "select", { options: [["served", "รับการเกณฑ์แล้ว"], ["not_yet_served", "ยังไม่ได้รับการเกณฑ์"]] })],
  family: [field("father_address", "ที่อยู่บิดา", "textarea", { max: Infinity }), field("father_phone", "โทรศัพท์บิดา", "phone", { max: 32 }),
    field("mother_address", "ที่อยู่มารดา", "textarea", { max: Infinity }), field("mother_phone", "โทรศัพท์มารดา", "phone", { max: 32 }),
    field("emergency_contact_occupation", "อาชีพผู้ติดต่อฉุกเฉิน"), field("emergency_contact_workplace", "สถานที่ทำงานผู้ติดต่อฉุกเฉิน")],
  addresses: [field("house_no", "บ้านเลขที่", "text", { max: 100 }), field("road", "ถนน"), field("subdistrict", "แขวง / ตำบล", "text", { max: 100 }),
    field("district", "อำเภอ / เขต", "text", { max: 100 }), field("province", "จังหวัด", "text", { max: 100 }), field("postal_code", "รหัสไปรษณีย์", "text", { max: 16 })],
  education: [field("education_level", "ระดับการศึกษา", "select", { required: true, options: [["bachelor", "ปริญญาตรี"], ["high_vocational", "อนุปริญญา / ปวส."], ["high_school_vocational", "มัธยมปลาย / ปวช."]] }),
    field("institution_name", "สถานศึกษา"), field("qualification", "วุฒิการศึกษา"), field("major", "วิชาเอก"), field("gpa", "GPA", "gpa"), field("graduation_year", "ปีสำเร็จการศึกษา (ค.ศ.)", "integer", { min: 1, limit: 9999 })],
  training: [field("course_name", "ชื่อหลักสูตร / การดูงาน / การฝึกงาน"), field("institution", "สถาบัน"), field("qualification", "วุฒิ / ประกาศนียบัตร"), field("period_text", "ระยะเวลา")],
  skills: [field("category", "ประเภททักษะ", "select", { required: true, options: [["computer", "คอมพิวเตอร์"], ["language", "ภาษา"]] }), field("skill_name", "ชื่อทักษะ / ภาษา"), field("proficiency", "ระดับความสามารถ", "select", { options: proficiencyOptions })],
};
export function canonicalWorkspaceValue(spec, raw, validate = false) {
  const text = String(raw ?? "").trim();
  const invalid = () => {
    const help = !text && spec.required ? "กรุณาระบุ" + spec.label
      : spec.type === "gpa" ? spec.label + " ต้องอยู่ระหว่าง 0.00–4.00 และมีทศนิยมไม่เกิน 2 ตำแหน่ง"
      : spec.type === "phone" ? spec.label + " ต้องมีตัวเลข 7–20 หลัก ใช้ + เว้นวรรค วงเล็บ หรือขีดได้"
      : spec.type === "date" ? spec.label + " ต้องเป็นวันที่ที่มีอยู่จริง"
      : spec.type === "integer" ? spec.label + ` ต้องเป็นจำนวนเต็มตั้งแต่ ${spec.min} ถึง ${spec.limit}`
      : spec.options ? "กรุณาเลือก" + spec.label + "จากรายการ"
      : [...text].length > spec.max ? spec.label + ` ต้องไม่เกิน ${spec.max} อักขระ`
      : spec.label + " มีอักขระที่ไม่รองรับ กรุณาตรวจข้อมูลอีกครั้ง";
    throw Object.assign(new Error(help), { field: spec.key });
  };
  if (!text) { if (validate && spec.required) invalid(); return null; }
  if (spec.type === "boolean") { if (!["true", "false"].includes(text)) invalid(); return text === "true"; }
  if (spec.type === "integer") {
    const number = Number(text);
    if (validate && (!Number.isSafeInteger(number) || number < spec.min || number > spec.limit)) invalid();
    return number;
  }
  if (spec.type === "gpa") {
    if (validate && (!/^\d(?:\.\d{1,2})?$/.test(text) || Number(text) > 4)) invalid();
    return Number.isFinite(Number(text)) ? Number(text).toFixed(2) : text;
  }
  if (validate) {
    if ([...text].length > spec.max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)) invalid();
    if (spec.options && !spec.options.some(([value]) => value === text)) invalid();
    if (spec.type === "phone" && (!/^[+\d\s()-]+$/.test(text) || (text.match(/\d/g) || []).length < 7 || (text.match(/\d/g) || []).length > 20)) invalid();
    if (spec.type === "date") {
      const [year, month, day] = text.split("-").map(Number);
      const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) invalid();
    }
  }
  return text;
}
export class ProfileSectionDraft {
  constructor(fields, row, revision) { this.fields = fields; this.reset(row, revision); }
  reset(row, revision) {
    this.baseline = Object.fromEntries(this.fields.map(spec => [spec.key, canonicalWorkspaceValue(spec, row?.[spec.key])]));
    this.values = { ...this.baseline }; this.revision = revision; this.conflict = false;
  }
  dirty() { return this.fields.some(spec => !Object.is(canonicalWorkspaceValue(spec, this.values[spec.key]), this.baseline[spec.key])); }
  patch(creating = false) {
    return Object.fromEntries(this.fields.flatMap(spec => {
      const value = canonicalWorkspaceValue(spec, this.values[spec.key], true);
      return creating || !Object.is(value, this.baseline[spec.key]) ? [[spec.key, value]] : [];
    }));
  }
  accept(row, revision, { ownRevision, sent } = {}) {
    const current = { ...this.values }, baseline = { ...this.baseline };
    if (this.dirty() && this.revision !== ownRevision) return false;
    this.reset(row, revision);
    for (const spec of this.fields) {
      const prior = sent ? canonicalWorkspaceValue(spec, sent[spec.key]) : baseline[spec.key];
      if (!Object.is(canonicalWorkspaceValue(spec, current[spec.key]), prior)) this.values[spec.key] = current[spec.key];
    }
    return true;
  }
}
export function validateProfileDocument(file, type, label) {
  const extensions = { "application/pdf": ["pdf"], "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"] };
  if (!file || !Object.hasOwn(extensions, file.type) || !extensions[file.type].includes(file.name.split(".").at(-1).toLowerCase())
    || file.size < 1 || file.size > 10 * 1024 * 1024 || (type === "external_profile_pdf" && file.type !== "application/pdf")) throw new Error("เลือกไฟล์ PDF/JPEG/PNG ไม่เกิน 10MB ให้ตรงกับประเภทเอกสาร");
  if (type === "supporting_other" && !String(label || "").trim()) throw new Error("กรุณาระบุชื่อเอกสารอื่น");
}
