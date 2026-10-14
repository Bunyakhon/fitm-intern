import { workspaceFields, canonicalWorkspaceValue } from "./studentProfileWorkspaceDraft.js";
import { validateProfileBirthDate } from "./studentProfileDraft.js";
const field = (key, label, type = "text", extra = {}) => ({ key, label, type, max: 255, ...extra });
const legacy = [field("prefix", "คำนำหน้า", "select", { options: [["นาย", "นาย"], ["นางสาว", "นางสาว"], ["นาง", "นาง"]] }),
  field("birth_date", "วันเกิด", "date"), field("height_cm", "ส่วนสูง (ซม.)", "decimal"), field("weight_kg", "น้ำหนัก (กก.)", "decimal"),
  field("religion", "ศาสนา"), field("ethnicity", "เชื้อชาติ"), field("nationality", "สัญชาติ"),
  field("blood_type", "กรุ๊ปเลือด", "select", { options: ["A", "B", "AB", "O", "ไม่ทราบ"].map(value => [value, value]) }),
  ...[["medical_conditions", "โรคประจำตัว"], ["allergies", "การแพ้"], ["special_abilities", "ความสามารถพิเศษเดิม"], ["related_skills", "ทักษะเดิม"],
    ["hometown_address", "ที่อยู่ภูมิลำเนาเดิม"], ["current_address", "ที่อยู่ปัจจุบันเดิม"], ["parent_contact_address", "ที่อยู่ผู้ปกครองเดิม"], ["emergency_contact_address", "ที่อยู่ผู้ติดต่อฉุกเฉิน"]].map(([key, label]) => field(key, label, "textarea", { max: Infinity })),
  ...[["hometown_phone", "โทรศัพท์ภูมิลำเนา"], ["current_phone", "โทรศัพท์ปัจจุบัน"], ["parent_phone", "โทรศัพท์ผู้ปกครอง"], ["emergency_contact_phone", "โทรศัพท์ผู้ติดต่อฉุกเฉิน"]].map(([key, label]) => field(key, label, "phone")),
  ...[["father_name", "ชื่อบิดา"], ["father_occupation", "อาชีพบิดา"], ["mother_name", "ชื่อมารดา"], ["mother_occupation", "อาชีพมารดา"], ["emergency_contact_name", "ชื่อผู้ติดต่อฉุกเฉิน"], ["emergency_contact_relation", "ความเกี่ยวข้อง"]].map(([key, label]) => field(key, label)),
  field("father_age", "อายุบิดา", "integer", { min: 1, limit: 2147483647 }), field("mother_age", "อายุมารดา", "integer", { min: 1, limit: 2147483647 })];
export const pdfFieldSpecs = {
  profile: Object.fromEntries([...legacy, ...workspaceFields.personal, ...workspaceFields.family].map(spec => [spec.key, spec])),
  student: Object.fromEntries([field("major", "สาขาวิชา"), field("year_level", "ชั้นปี", "integer", { min: 1, limit: 4 }), field("gpa", "GPA สะสม", "gpa"), ...workspaceFields.academic].map(spec => [spec.key, spec])),
  addresses: [field("address_type", "ประเภทที่อยู่", "select", { required: true, options: [["registered", "ทะเบียนบ้าน"], ["current", "ปัจจุบัน"]] }), ...workspaceFields.addresses],
  education: workspaceFields.education, training: workspaceFields.training, skills: workspaceFields.skills,
};
export const importIdentityKeys = { addresses: ["address_type"], education: ["education_level", "institution_name", "qualification", "major"], training: ["course_name", "institution"], skills: ["category", "skill_name"] };
export const importRecordIdentity = (kind, row) => JSON.stringify(importIdentityKeys[kind].map(key => String(row[key] ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en")));
export function normalizeImportField(spec, value) {
  if (!spec) throw new Error("ฟิลด์นี้ไม่อนุญาตให้นำเข้า");
  if (spec.type === "decimal") {
    const raw = String(value ?? "").trim(); if (!raw) return null;
    if (!/^\d+(?:\.\d+)?$/.test(raw) || Number(raw) <= 0 || Number(raw) > 999.99) throw new Error(spec.label + " ไม่ถูกต้อง");
    return Number(raw);
  }
  const result = canonicalWorkspaceValue(spec, value, true);
  if (spec.key === "birth_date") validateProfileBirthDate(result);
  return result;
}
function equal(a, b) { return a === b || a == null && b == null; }
export function buildProfilePdfChanges(snapshot, fields, records) {
  if (!snapshot?.profile_revision) throw new Error("ต้องโหลด Profile ล่าสุดก่อนยืนยัน");
  const changes = {};
  for (const field of fields) {
    if (!["pdf", "edit"].includes(field.mode)) continue;
    const spec = pdfFieldSpecs[field.scope]?.[field.key];
    const value = normalizeImportField(spec, field.value);
    const old = normalizeImportField(spec, snapshot[field.scope]?.[field.key]);
    if (!equal(value, old)) { changes[field.scope] ||= {}; changes[field.scope][field.key] = value; }
  }
  const identities = Object.fromEntries(Object.keys(importIdentityKeys).map(kind => [kind, new Map()]));
  for (const kind of Object.keys(identities)) for (const row of snapshot[kind] || []) {
    const key = importRecordIdentity(kind, row); identities[kind].set(key, (identities[kind].get(key) || 0) + 1);
  }
  let operations = 0;
  for (const row of records) {
    if (row.action === "skip") continue;
    if (!["create", "update"].includes(row.action) || !pdfFieldSpecs[row.kind]) throw new Error("รูปแบบรายการนำเข้าไม่ถูกต้อง");
    const existing = row.action === "update" ? snapshot[row.kind].find(value => value.id === row.id) : null;
    if (row.action === "update" && !existing) throw new Error("รายการเดิมถูกนำออก กรุณาตรวจข้อมูลล่าสุด");
    const patch = {}, present = new Set([...(row.present || Object.keys(row.values)), ...(row.touched || [])]);
    for (const spec of pdfFieldSpecs[row.kind]) {
      if (!present.has(spec.key)) continue;
      const value = normalizeImportField(spec, row.values[spec.key]);
      if (!existing || !equal(value, normalizeImportField(spec, existing[spec.key]))) patch[spec.key] = value;
    }
    if (!Object.keys(patch).length) continue;
    const final = { ...(existing || {}), ...patch };
    for (const spec of pdfFieldSpecs[row.kind].filter(spec => spec.required)) normalizeImportField(spec, final[spec.key]);
    const identity = importRecordIdentity(row.kind, final), keys = identities[row.kind];
    const oldIdentity = existing && importRecordIdentity(row.kind, existing);
    if (existing) keys.set(oldIdentity, keys.get(oldIdentity) - 1);
    if (keys.get(identity) > 0 && oldIdentity !== identity) throw new Error("มีรายการนี้แล้ว เลือกแก้รายการเดิมหรือข้ามเพื่อป้องกันข้อมูลซ้ำ");
    keys.set(identity, (keys.get(identity) || 0) + 1);
    changes[row.kind] ||= {}; changes[row.kind][row.action] ||= [];
    changes[row.kind][row.action].push(existing ? { id: existing.id, changes: patch } : patch);
    if (++operations > 100) throw new Error("นำเข้า Child Records ได้ไม่เกิน 100 รายการต่อครั้ง");
  }
  const state = { ...snapshot.profile, ...changes.profile };
  if (state.national_id_issue_date && state.national_id_expiry_date && state.national_id_expiry_date < state.national_id_issue_date) throw new Error("วันหมดอายุบัตรต้องไม่ก่อนวันออกบัตร");
  if (state.has_driving_license === false && ["driving_license_number", "driving_license_type", "driving_license_expiry_date"].some(key => state[key] != null)) throw new Error("เลือกไม่มีใบขับขี่แล้วต้องตรวจและล้างรายละเอียดเดิมผ่านแบบฟอร์มด้วยตนเองก่อนนำเข้า");
  return changes;
}
