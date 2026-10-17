// Explicit API mapping: several existing HTML names differ from API properties.
export const PROFILE_INPUTS = {
  prefix: "editPrefix", birth_date: "editBirthDate", height_cm: "editHeight",
  weight_kg: "editWeight", nationality: "editNationality", ethnicity: "editEthnicity",
  religion: "editReligion", blood_type: "editBloodType", medical_conditions: "editMedicalConditions",
  allergies: "editAllergies", special_abilities: "editSpecialAbilities", related_skills: "editRelatedSkills",
  hometown_address: "editHometownAddress", hometown_phone: "editHometownPhone",
  current_address: "editCurrentAddress", current_phone: "editCurrentPhone",
  father_name: "editFatherName", father_age: "editFatherAge", father_occupation: "editFatherOccupation",
  mother_name: "editMotherName", mother_age: "editMotherAge", mother_occupation: "editMotherOccupation",
  parent_contact_address: "editParentAddress", parent_phone: "editParentPhone",
  emergency_contact_name: "editEmergencyName", emergency_contact_relation: "editEmergencyRelation",
  emergency_contact_address: "editEmergencyAddress", emergency_contact_phone: "editEmergencyPhone",
};
const numbers = new Set(["height_cm", "weight_kg", "father_age", "mother_age"]);

export function readProfileInputs(document) {
  return Object.fromEntries(Object.entries(PROFILE_INPUTS).flatMap(([field, id]) => {
    const input = document.getElementById(id);
    // Missing controls are omitted, never interpreted as intentional deletion.
    return input ? [[field, input.value]] : [];
  }));
}

export function writeProfileInputs(document, raw) {
  for (const [field, value] of Object.entries(raw)) {
    const input = document.getElementById(PROFILE_INPUTS[field]);
    if (input) input.value = value;
  }
}

function canonical(field, raw) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return numbers.has(field) ? Number(value) : value;
}

export function validateProfileBirthDate(value, now = new Date()) {
  if (value == null || value === "") return;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("วันเกิดต้องอยู่ในรูปแบบ YYYY-MM-DD");
  }
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) {
    throw new Error("วันเกิดต้องเป็นวันที่ที่มีอยู่จริงตามปฏิทิน");
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = type => parts.find(part => part.type === type).value;
  if (value > `${get("year")}-${get("month")}-${get("day")}`) {
    throw new Error("วันเกิดต้องไม่เป็นวันที่ในอนาคต");
  }
}

export class StudentProfileDraft {
  constructor(raw, revision) {
    this.baseline = { ...raw };
    this.revision = revision;
  }

  hasChanges(raw) {
    return Object.keys(raw).some(field => Object.hasOwn(this.baseline, field)
      && !Object.is(canonical(field, raw[field]), canonical(field, this.baseline[field])));
  }

  patch(raw) {
    const patch = {};
    for (const field of Object.keys(PROFILE_INPUTS)) {
      if (!Object.hasOwn(raw, field) || !Object.hasOwn(this.baseline, field)) continue;
      const value = canonical(field, raw[field]);
      if (Object.is(value, canonical(field, this.baseline[field]))) continue;
      if (numbers.has(field) && value !== null && !Number.isFinite(value)) {
        throw Object.assign(new Error("กรุณาระบุตัวเลขที่ถูกต้อง"), { field });
      }
      if (["father_age", "mother_age"].includes(field) && value !== null && (!Number.isSafeInteger(value) || value < 1 || value > 2147483647)) {
        throw Object.assign(new Error("อายุบิดาและมารดาต้องเป็นจำนวนเต็มบวกในช่วงที่อนุญาต"), { field });
      }
      // Match the existing owner API limits while identifying the control to fix.
      if (["height_cm", "weight_kg"].includes(field) && value !== null && (value <= 0 || value > 999.99)) {
        throw Object.assign(new Error((field === "height_cm" ? "ส่วนสูง" : "น้ำหนัก") + " ต้องเป็นจำนวนบวกไม่เกิน 999.99"), { field });
      }
      if (field.endsWith("_phone") && value !== null && (!/^[+\d\s()-]+$/.test(value) || (value.match(/\d/g) || []).length < 7 || (value.match(/\d/g) || []).length > 20)) {
        throw Object.assign(new Error("กรุณากรอกโทรศัพท์ที่มีตัวเลข 7–20 หลัก ใช้ + เว้นวรรค วงเล็บ หรือขีดได้"), { field });
      }
      if (typeof value === "string") {
        const longText = ["medical_conditions", "allergies", "special_abilities", "related_skills", "hometown_address", "current_address", "parent_contact_address", "emergency_contact_address"];
        if (!longText.includes(field) && [...value].length > 255) throw Object.assign(new Error("กรุณากรอกไม่เกิน 255 อักขระ"), { field });
        if (/[\u0000\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw Object.assign(new Error("ข้อมูลมีอักขระที่ไม่รองรับ กรุณาตรวจและกรอกใหม่"), { field });
      }
      if (field === "birth_date") {
        try { validateProfileBirthDate(value); }
        catch (error) { error.field = field; throw error; }
      }
      patch[field] = value;
    }
    return patch;
  }

  acceptSaved(serverRaw, revision, sentRaw, currentRaw) {
    // A user may type while the request is in flight. Only acknowledge the frozen
    // submitted snapshot; later edits remain dirty against the committed response.
    const merged = { ...serverRaw };
    for (const field of Object.keys(currentRaw)) {
      if (Object.hasOwn(PROFILE_INPUTS, field)
        && !Object.is(canonical(field, currentRaw[field]), canonical(field, sentRaw[field]))) {
        merged[field] = currentRaw[field];
      }
    }
    this.baseline = { ...serverRaw };
    this.revision = revision;
    return merged;
  }
}
