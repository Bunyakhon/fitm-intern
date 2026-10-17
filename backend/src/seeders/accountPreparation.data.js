// User-supplied roster. Latin spellings and derived emails are proposals, never verified identities.
const roster = [
  ["ผศ.ดร.", "ขนิษฐา", "นามี", "KHANITTHA", "NAMI"],
  ["ผศ.", "พีระศักดิ์", "เสรีกุล", "PHIRASAK", "SERIKUN"],
  ["รศ.ดร.", "อนิราช", "มิ่งขวัญ", "ANIRAT", "MINGKHWAN"],
  ["ผศ.", "สมชัย", "เชียงพงศ์พันธุ์", "SOMCHAI", "CHIANGPHONGPHAN"],
  ["ดร.", "ประดิษฐ์", "พิทักษ์เสถียรกุล", "PRADIT", "PHITHAKSATHIANKUN"],
  ["ผศ.ดร.", "สุปีติ", "กุลจันทร์", "SUPITI", "KUNLACHAN"],
  ["ผศ.ดร.", "วันทนี", "ประจวบศุภกิจ", "WANTHANI", "PRACHUAPSUPHAKIT"],
  ["รศ.ดร.", "ยุพิน", "สรรพคุณ", "YUPHIN", "SAPPHAKHUN"],
  ["ผศ.ดร.", "พาฝัน", "ดวงไพศาล", "PHAFAN", "DUANGPHAISAN"],
  ["ดร.", "วัชรชัย", "คงศิริวัฒนา", "WATCHARACHAI", "KHONGSIRIWATTHANA"],
  ["ผศ.", "นิมิต", "ศรีคำทา", "NIMIT", "SRIKHAMTHA"],
  ["ผศ.", "นพดล", "บูรณ์กุศล", "NOPPHADON", "BUNKUSON"],
  ["ผศ.ดร.", "อรบุษป์", "วุฒิกมลชัย", "ORABUT", "WUTTHIKAMONCHAI"],
  ["ผศ.ดร.", "สิวาลัย", "จินเจือ", "SIWALAI", "CHINCHUEA"],
  ["ผศ.ดร.", "บีสุดา", "ดาวเรือง", "BISUDA", "DAORUEANG"],
  ["ผศ.ดร.", "นิติการ", "นาคเจือทอง", "NITIKAN", "NAKCHUEATHONG"],
  ["ผศ.ดร.", "สุพาภรณ์", "ซิ้มเจริญ", "SUPAPORN", "SIMCHAROEN"],
  ["ผศ.", "นพเก้า", "ทองใบ", "NOPPHAKAO", "THONGBAI"],
  ["ผศ.ดร.", "นัฎฐพันธ์", "นาคพงษ์", "NATTHAPHAN", "NAKPHONG"],
  ["ผศ.ดร.", "ศรายุทธ", "ธเนศสกุลวัฒนา", "SARAYUT", "THANETSAKUNWATTHANA"],
  ["อ.ดร.", "ศิรินทรา", "แว่วศรี", "SIRINTHRA", "WAEOSRI"],
  ["อ.ดร.", "กาญจน์", "ณ ศรีธะ", "KAN", "NA SRITHA"],
  ["อ.ดร.", "พิทย์พิมล", "ชูรอด", "PHITPHIMON", "CHUROT"],
];
function teacherInventory() {
  return roster.map(([academic_title, first_name, last_name, english_first_name, english_last_name], index) => ({
    key: `teacher-${String(index + 1).padStart(2, "0")}`, academic_title, first_name, last_name,
    english_candidate: { first_name: english_first_name, last_name: english_last_name, verified: false },
    email_candidate: `${english_first_name.toLowerCase()}.${english_last_name[0].toLowerCase()}@itm.kmutnb.ac.th`,
    email_verified: false, department: null, major: null,
    department_candidate: "เทคโนโลยีสารสนเทศ", department_candidate_source: "existing seedTeachers.js; pending confirmation",
    position: index === 0 ? "หัวหน้าภาควิชา" : "อาจารย์",
    role: index === 0 ? "department_head" : "teacher", is_department_head: index === 0,
    proposed_status: "active", preparation_status: "pending_verification",
  }));
}
function staffInventory() {
  return [
    ["ลัดดา", "ตั้งเกียรติศิริ", "LATDA", "TANGKIATSIRI"],
    ["อุไรวรรณ", "วัตรยิ่ง", "URAIWAN", "WATYING"],
  ].map(([first_name, last_name, first, last], index) => ({
    key: `staff-${index + 1}`, first_name, last_name,
    english_candidate: { first_name: first, last_name: last, verified: false },
    email: null, email_verified: false, department: null,
    position: "เจ้าหน้าที่บริหารงานทั่วไป", role: "department_staff", proposed_is_active: true,
    preparation_status: "blocked_missing_verified_email_and_schema_fields",
  }));
}
function studentFixtures() {
  const cases = ["complete", "incomplete", "multiple_records", "pdf_import", "google_only_simulation"];
  const names = ["หนึ่ง", "สอง", "สาม", "สี่", "ห้า"];
  return cases.map((scenario, index) => {
    const n = index + 1, full = index === 0 || index === 2;
    const profile = { english_first_name: `DEMO${n}`, english_last_name: "STUDENT" };
    if (full) Object.assign(profile, {
      prefix: "นาย", birth_date: "2004-02-29", gender: "ชาย", height_cm: 170, weight_kg: 60,
      nationality: "ไทย (สมมติ)", ethnicity: "ไทย (สมมติ)", religion: "ไม่ระบุ", blood_type: "O",
      medical_conditions: "ไม่มี (ข้อมูลทดสอบ)", allergies: "ไม่มี (ข้อมูลทดสอบ)",
      special_abilities: "นำเสนอข้อมูลจำลอง", related_skills: "เขียนโปรแกรมสำหรับทดสอบ",
      has_driving_license: false, military_status: "not_yet_served",
      hometown_address: "ที่อยู่ทะเบียนบ้านสมมติ", hometown_phone: "0000000000",
      current_address: "ที่อยู่ปัจจุบันสมมติ", current_phone: "0000000000",
      father_name: `บิดา สมมติ${names[index]}`, father_age: 50, father_occupation: "อาชีพสมมติ",
      mother_name: `มารดา สมมติ${names[index]}`, mother_age: 48, mother_occupation: "อาชีพสมมติ",
      father_address: "ที่อยู่บิดาสมมติ", father_phone: "0000000000",
      mother_address: "ที่อยู่มารดาสมมติ", mother_phone: "0000000000",
      parent_contact_address: "ที่อยู่ผู้ปกครองสมมติ", parent_phone: "0000000000",
      emergency_contact_name: "ผู้ติดต่อ สมมติ", emergency_contact_relation: "ผู้ปกครอง",
      emergency_contact_address: "ที่อยู่ติดต่อฉุกเฉินสมมติ", emergency_contact_phone: "0000000000",
      emergency_contact_occupation: "อาชีพสมมติ", emergency_contact_workplace: "องค์กรจำลอง",
    });
    return {
      key: `student-${n}`, scenario, alias_email: `student0${n}@example.test`,
      // Persistence adapter only: the unchanged Student model requires this university-shaped address.
      // Synthetic, unverified, never sent mail or used with a provider.
      student: { student_id: `990000000000${n}`, first_name: index === 4 ? null : `นักศึกษาสมมติ${names[index]}`,
        last_name: index === 4 ? null : "ทดสอบระบบ", email: `s990000000000${n}@email.kmutnb.ac.th`,
        major: index % 2 ? "INE" : "IT", year_level: index === 1 ? null : 3,
        gpa: index === 1 ? null : "3.25", track: index % 2 ? "internship" : "co_op", status: "pending" },
      advisor_key: `teacher-${String(n + 1).padStart(2, "0")}`,
      aggregate: { profile,
        addresses: { create: full ? ["registered", "current"].map(address_type => ({ address_type,
          house_no: "TEST-ONLY", road: "ถนนสมมติ", subdistrict: "ตำบลสมมติ", district: "อำเภอสมมติ", province: "จังหวัดสมมติ", postal_code: "00000" })) : [] },
        education: { create: full ? ["bachelor", "high_vocational", "high_school_vocational"].map((education_level, display_order) => ({
          education_level, institution_name: "สถานศึกษาจำลอง", qualification: "วุฒิสมมติ", major: "คอมพิวเตอร์",
          gpa: "3.25", graduation_year: 2020 + display_order, display_order })) : [] },
        training: { create: full ? Array.from({ length: 5 }, (_, i) => ({ course_name: `หลักสูตรจำลอง ${i + 1}`,
          institution: "หน่วยงานทดสอบ", qualification: "ประกาศนียบัตรสมมติ", period_text: `มกราคม ${2020 + i}`, display_order: i })) : [] },
        skills: { create: full ? ["computer", "language"].flatMap(category => ["very_good", "good", "moderate", "fair"].map((proficiency, i) => ({
          category, skill_name: `${category === "computer" ? "ทักษะคอมพิวเตอร์" : "ภาษาทดสอบ"} ${i + 1}`, proficiency, display_order: i }))) : [] },
      },
      assets: full ? ["avatar.png", "transcript.pdf", "student_id_copy.pdf", "supporting_other.pdf"] : index === 3 ? ["profile-import.pdf"] : [],
    };
  });
}
module.exports = { teacherInventory, staffInventory, studentFixtures };
