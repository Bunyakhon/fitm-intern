// Documentation generator only: reads local audits and pure staged specs, never PostgreSQL.
const fs = require("node:fs");
const path = require("node:path");
const { extensions, tables, newFileTypes } = require("../src/db/prepared/student-profile-phase2a/schema");
const root = path.resolve(__dirname, "../..");
const inventory = fs.readFileSync(path.join(root, "docs/audits/FITM_STUDENT_PROFILE_PDF_FIELD_INVENTORY.md"), "utf8");
const mapping = fs.readFileSync(path.join(root, "docs/audits/FITM_STUDENT_PROFILE_FIELD_MAPPING.md"), "utf8");
const mappingRows = new Map(mapping.split(/\r?\n/).filter(line => /^\| P\d-\d\d \|/.test(line)).map(line => {
  const cells = line.split("|").map(value => value.trim());
  return [cells[1], { status: cells[9], existing: cells[8], gap: cells[10] }];
}));
const p1 = [
  ["Existing Column", "students.profile_image (ขนาดรูปพิมพ์ 1 นิ้วเป็นงานอนาคต)"],
  ["Existing Column", "students.first_name + last_name (read-only)"],
  ["New Scalar Column", "student_profiles.english_first_name + english_last_name"],
  ["Existing Column", "students.student_id (read-only)"], ["Existing Column", "students.major (read-only)"],
  ["New Scalar Column", "students.department (รอ master/policy)"], ["New Scalar Column", "students.faculty (รอ master/policy)"],
  ["Existing Column", "students.year_level"], ["New Scalar Column", "students.last_semester_gpa"],
  ["Pending Policy", "students.gpa: ยืนยันว่าเป็น GPA สะสม; ไม่เติมสำเนาหรือแปลความเอง"],
  ["New Scalar Column", "student_profiles.national_id_ciphertext + national_id_key_version; รอ encryption policy"],
  ["New Scalar Column", "student_profiles.national_id_issue_date"], ["New Scalar Column", "student_profiles.national_id_expiry_date"],
  ["Existing Column", "student_profiles.birth_date"],
  ["Existing Column", "คำนวณอายุจาก birth_date ณ วันอ้างอิง (ไม่เพิ่ม age column)"],
  ["New Scalar Column", "student_profiles.gender (รอ vocabulary/policy)"],
  ["Existing Column", "student_profiles.height_cm"], ["Existing Column", "student_profiles.weight_kg"],
  ["Existing Column", "student_profiles.religion"], ["Existing Column", "student_profiles.ethnicity"],
  ["Existing Column", "student_profiles.nationality"],
  ["New Scalar Column", "student_profiles.has_driving_license"],
  ["New Scalar Column", "student_profiles.driving_license_number"],
  ["New Scalar Column", "student_profiles.driving_license_type (รอรายการประเภท)"],
  ["New Scalar Column", "student_profiles.driving_license_expiry_date"],
  ["New Scalar Column", "student_profiles.military_status (served/not_yet_served; N/A รอ policy)"],
  ...["house_no", "road", "subdistrict", "district", "province", "postal_code"].map(field => ["New Relation/Table", "student_addresses[registered]." + field + "; เก็บ hometown_address เดิม"]),
  ["Pending Policy", "student_profiles.hometown_phone: ยืนยันทะเบียนบ้านก่อน reuse"],
  ...["house_no", "road", "subdistrict", "district", "province", "postal_code"].map(field => ["New Relation/Table", "student_addresses[current]." + field + "; เก็บ current_address เดิม"]),
  ["Existing Column", "student_profiles.current_phone"], ["Existing Column", "students.email (read-only)"],
  ["Existing Column", "student_profiles.father_name"], ["Existing Column", "student_profiles.father_age"],
  ["Existing Column", "student_profiles.father_occupation"], ["New Scalar Column", "student_profiles.father_address"],
  ["New Scalar Column", "student_profiles.father_phone"], ["Existing Column", "student_profiles.mother_name"],
  ["Existing Column", "student_profiles.mother_age"], ["Existing Column", "student_profiles.mother_occupation"],
  ["New Scalar Column", "student_profiles.mother_address"], ["New Scalar Column", "student_profiles.mother_phone"],
  ["Existing Column", "student_profiles.emergency_contact_name"], ["Existing Column", "student_profiles.emergency_contact_relation"],
  ["New Scalar Column", "student_profiles.emergency_contact_occupation"], ["New Scalar Column", "student_profiles.emergency_contact_workplace"],
  ["Existing Column", "student_profiles.emergency_contact_address"], ["Existing Column", "student_profiles.emergency_contact_phone"],
];
function disposition(id, previous) {
  const [page, number] = id.slice(1).split("-").map(Number);
  if (page === 1) return p1[number - 1];
  if (page === 2) {
    return ["New Relation/Table", number <= 15
      ? "student_education_records." + ["institution_name", "qualification", "major", "gpa", "graduation_year"][(number - 1) % 5] + " (แยก education_level; ไม่จำกัดจำนวนต่อระดับ)"
      : "student_training_records." + ["course_name", "institution", "qualification", "period_text"][(number - 16) % 4] + " (ไม่จำกัด 5 รายการ)"];
  }
  if (page === 3) {
    if (number <= 16) return ["New Relation/Table", "student_skills[" + (number <= 8 ? "computer" : "language") + "]." +
      (number % 2 ? "skill_name; เก็บข้อความ skills เดิมทุกค่า" : "proficiency = very_good/good/moderate/fair")];
    if (number <= 21) return ["Existing File Storage", number === 21 ? "student_files.document_label" :
      "student_files.file_type = " + newFileTypes[number - 17] + "; ใช้ file record จริง ไม่ใช้ checkbox เป็นหลักฐาน"];
    if (number <= 23) return ["Pending Policy", "เสนอ acknowledgement ผูก coop_requests + revision/snapshot; ยังไม่มี migration"];
    return ["Pending Policy", "ลายเซ็น/ชื่อ/วันที่ลงนาม ต้องยืนยันกฎและหลักฐานก่อน; acknowledgement ไม่ใช่ลายเซ็น"];
  }
  if (number === 2) return ["New Scalar Column", "students.faculty (ข้อมูลอ้างอิง; snapshot ใบสมัครรอ policy)"];
  if (previous.status === "DIFFERENT WORKFLOW") return ["Existing Workflow", previous.existing + "; " + previous.gap];
  return ["Pending Policy", previous.gap];
}
const rows = inventory.split(/\r?\n/).filter(line => /^\| P\d-\d\d \|/.test(line)).map(line => {
  const cells = line.split("|").map(value => value.trim());
  const previous = mappingRows.get(cells[1]);
  if (!previous) throw new Error("MISSING_AUDIT_MAPPING: " + cells[1]);
  const result = disposition(cells[1], previous);
  if (!result) throw new Error("MISSING_DESIGN_MAPPING: " + cells[1]);
  return { id: cells[1], label: cells[2] + " / " + cells[3], auditStatus: previous.status, category: result[0], plan: result[1] };
});
if (rows.length !== 148 || new Set(rows.map(row => row.id)).size !== 148 || p1.length !== 57) throw new Error("INVENTORY_COUNT_MISMATCH");
function dataType(column) {
  if (["varchar", "char"].includes(column.type)) return column.type + "(" + column.length + ")";
  if (column.type === "numeric") return "numeric(" + column.precision + "," + column.scale + ")";
  return column.type;
}
const counts = {};
for (const row of rows) counts[row.category] = (counts[row.category] || 0) + 1;
const lines = [
  "# FITM Student Profile Phase 2A — Field Coverage & Schema Dictionary", "",
  "เอกสารเตรียมการเท่านั้น: ไม่ใช่ Schema ที่ติดตั้งแล้ว และไม่ใช่ API contract ใหม่", "",
  "อ้างอิง Inventory/Mappings เดิมครบ 148 จุด; หลายแถว PDF ใช้ชนิดฟิลด์เดียวกัน ไม่ใช่ 148 คอลัมน์ใหม่",
  "การจัดประเภทนี้เป็นแผน Phase 2A; auditStatus เดิมยังคงเดิม ไม่อ้างว่าฟิลด์ที่เตรียมพร้อมใช้งานแล้ว", "",
  "| ประเภทแผน | จำนวนจุด PDF |", "| --- | --- |",
  ...Object.entries(counts).map(([category, count]) => "| " + category + " | " + count + " |"), "",
  "| ID | Label | Audit เดิม | ประเภทแผน | แหล่งข้อมูล / ข้อจำกัด |", "| --- | --- | --- | --- | --- |",
  ...rows.map(row => "| " + [row.id, row.label, row.auditStatus, row.category, row.plan].map(value => value.replaceAll("|", "\\|")).join(" | ") + " |"), "",
  "## Dictionary ของ Schema Source ที่เตรียม", "",
  "nullable = YES หมายถึง draft/legacy อาจไม่มีข้อมูล ไม่ใช่ยืนยันว่าใบสมัครสมบูรณ์",
  "UUID PK สร้างโดย application; ไม่มี DB UUID default. DEFAULT เป็นค่าที่ DB จัดการ ไม่รับจาก input.", "",
];
for (const [kind, collection] of [["เพิ่มในตารางเดิม", extensions], ["ตารางใหม่", tables]]) {
  for (const [name, spec] of Object.entries(collection)) {
    lines.push("### " + name + " — " + kind, "", "| Column | Type | Nullable | Default | Key/Delete |", "| --- | --- | --- | --- | --- |");
    for (const [field, column] of Object.entries(spec.columns)) lines.push("| " + [field, dataType(column), column.nullable ? "YES" : "NO", column.defaultSql || "ไม่มี",
      column.primaryKey ? "PK" : column.references ? "FK " + column.references + ".id; UPDATE RESTRICT / DELETE " + column.deleteBehavior : "—"].join(" | ") + " |");
    lines.push("", "CHECK: " + Object.entries(spec.checks || {}).map(([key, value]) => key + ": " + value).join("; "), "");
    if (spec.unique) lines.push("UNIQUE: " + spec.unique.map(fields => "(" + fields.join(", ") + ")").join("; "), "");
    if (spec.indexes) lines.push("INDEX: " + spec.indexes.map(fields => "(" + fields.join(", ") + ")").join("; "), "");
  }
}
lines.push("student_files เพิ่ม UNIQUE(id, student_id), same-owner supersedes FK RESTRICT, current unique/index เฉพาะประเภทใหม่; คง legacy indexes เดิมทุกตัว", "",
  "Ownership: ทุก child query/write ต้องใช้ JWT owner + student_id filter; student_id/id เป็น immutable/read-only จาก client. FK อย่างเดียวไม่ใช่ authorization.", "",
  "DATE ตรวจปฏิทินจริงโดย PostgreSQL; API/Client ในอนาคตต้องใช้ calendar validation เดิมและแปลง พ.ศ.→ค.ศ. อย่างชัดเจน ไม่ส่ง JS rollover Date.", "");
if (require.main === module) {
  fs.writeFileSync(path.join(root, "docs/audits/FITM_STUDENT_PROFILE_PHASE2A_FIELD_COVERAGE.md"), lines.join("\n") + "\n", "utf8");
  console.log(JSON.stringify({ points: rows.length, categories: counts, new_relation_tables: Object.keys(tables).length }));
}
module.exports = { rows };
