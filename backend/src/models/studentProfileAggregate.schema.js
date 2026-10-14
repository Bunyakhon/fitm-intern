// Current Student Profile field contracts shared by models and runtime validation.
const column = (type, extra = {}) => ({ type, nullable: true, ...extra });
const text = (length = 255, extra = {}) => column("varchar", { length, ...extra });
const enumCheck = (name, values) => name + " IN (" + values.map(v => "'" + v + "'").join(", ") + ")";
const newFileTypes = ["transcript", "national_id_copy", "student_id_copy", "supporting_other", "external_profile_pdf"];
const existingFileTypes = ["coop_poster", "coop_project_book", "coop_practice_log_book", "resume"];

const extensions = {
  students: {
    columns: {
      department: text(), faculty: text(), last_semester_gpa: column("numeric", { precision: 3, scale: 2 }),
      profile_data_revision: column("bigint", { nullable: false, defaultSql: "0" }),
    },
    checks: {
      phase2a_last_semester_gpa: "last_semester_gpa BETWEEN 0 AND 4",
      phase2a_profile_data_revision: "profile_data_revision >= 0",
    },
  },
  student_profiles: {
    columns: {
      english_first_name: text(), english_last_name: text(), gender: text(32),
      national_id_ciphertext: column("bytea"), national_id_key_version: text(80),
      national_id_issue_date: column("date"), national_id_expiry_date: column("date"),
      has_driving_license: column("boolean"), driving_license_number: text(64),
      driving_license_type: text(100), driving_license_expiry_date: column("date"),
      military_status: text(32), father_address: column("text"), father_phone: text(32),
      mother_address: column("text"), mother_phone: text(32),
      emergency_contact_occupation: text(), emergency_contact_workplace: text(),
    },
    checks: {
      phase2a_national_id_pair: "(national_id_ciphertext IS NULL) = (national_id_key_version IS NULL)",
      phase2a_national_id_key: "national_id_key_version IS NULL OR length(btrim(national_id_key_version)) > 0",
      phase2a_national_id_dates: "national_id_expiry_date >= national_id_issue_date",
      phase2a_license_absent: "has_driving_license IS DISTINCT FROM FALSE OR (driving_license_number IS NULL AND driving_license_type IS NULL AND driving_license_expiry_date IS NULL)",
      phase2a_military_status: enumCheck("military_status", ["served", "not_yet_served"]),
      // DATE enforces calendar validity in PostgreSQL. CE/Buddhist conversion is an API responsibility.
      phase2a_id_issue_year: "extract(year FROM national_id_issue_date) BETWEEN 1 AND 9999",
      phase2a_id_expiry_year: "extract(year FROM national_id_expiry_date) BETWEEN 1 AND 9999",
      phase2a_license_expiry_year: "extract(year FROM driving_license_expiry_date) BETWEEN 1 AND 9999",
    },
  },
  student_files: {
    columns: {
      document_label: text(), content_sha256: column("char", { length: 64 }),
      document_version: column("integer"), supersedes_file_id: column("uuid"),
      is_current: column("boolean", { nullable: false, defaultSql: "TRUE" }),
    },
    checks: {
      phase2a_file_hash: "content_sha256 IS NULL OR content_sha256 ~ '^[0-9a-f]{64}$'",
      phase2a_file_version: "document_version >= 1",
      phase2a_file_not_self: "supersedes_file_id IS NULL OR supersedes_file_id <> id",
      phase2a_profile_file_metadata: "file_type NOT IN (" + newFileTypes.map(v => "'" + v + "'").join(", ") + ") OR (content_sha256 IS NOT NULL AND document_version IS NOT NULL)",
      phase2a_other_file_label: "file_type <> 'supporting_other' OR (document_label IS NOT NULL AND length(btrim(document_label)) > 0)",
    },
  },
};
const base = (deleteBehavior = "CASCADE") => ({
  id: column("uuid", { nullable: false, primaryKey: true }),
  student_id: column("uuid", { nullable: false, references: "students", deleteBehavior }),
  created_at: column("timestamptz", { nullable: false, defaultSql: "CURRENT_TIMESTAMP" }),
  updated_at: column("timestamptz", { nullable: false, defaultSql: "CURRENT_TIMESTAMP" }),
});
const order = () => column("integer", { nullable: false, defaultSql: "0" });
const tables = {
  student_addresses: {
    modelName: "StudentAddress", association: "profileAddresses",
    columns: { ...base(), address_type: text(16, { nullable: false }), house_no: text(100), road: text(),
      subdistrict: text(100), district: text(100), province: text(100), postal_code: text(16) },
    checks: { address_type: enumCheck("address_type", ["registered", "current"]) },
    unique: [["student_id", "address_type"]],
  },
  student_education_records: {
    modelName: "StudentEducationRecord", association: "profileEducationRecords",
    columns: { ...base(), education_level: text(32, { nullable: false }), institution_name: text(), qualification: text(),
      major: text(), gpa: column("numeric", { precision: 3, scale: 2 }), graduation_year: column("smallint"), display_order: order() },
    checks: { education_level: enumCheck("education_level", ["bachelor", "high_vocational", "high_school_vocational"]),
      gpa: "gpa BETWEEN 0 AND 4", graduation_year: "graduation_year BETWEEN 1 AND 9999", display_order: "display_order >= 0" },
    indexes: [["student_id", "display_order", "id"]],
  },
  student_training_records: {
    modelName: "StudentTrainingRecord", association: "profileTrainingRecords",
    columns: { ...base(), course_name: text(), institution: text(), qualification: text(), period_text: text(), display_order: order() },
    checks: { display_order: "display_order >= 0" }, indexes: [["student_id", "display_order", "id"]],
  },
  student_skills: {
    modelName: "StudentSkill", association: "profileSkills",
    columns: { ...base(), category: text(16, { nullable: false }), skill_name: text(), proficiency: text(16), display_order: order() },
    checks: { category: enumCheck("category", ["computer", "language"]),
      proficiency: enumCheck("proficiency", ["very_good", "good", "moderate", "fair"]), display_order: "display_order >= 0" },
    indexes: [["student_id", "category", "display_order", "id"]],
  },
};

// Acknowledgements require an approved statement, snapshot and retention policy.
// Proposed policy-dependent tables are not initialized.
const pendingAcknowledgementDesign = {
  student_profile_acknowledgements: {
    owner: "student_id -> students.id RESTRICT", request: "(coop_request_id, student_id) -> coop_requests(id, student_id) RESTRICT",
    proposedColumns: {
      id: "uuid PK", student_id: "uuid NOT NULL", coop_request_id: "uuid NOT NULL",
      statement_type: "varchar(32) NOT NULL: information_accuracy / coop_rules",
      statement_version: "varchar(40) NOT NULL", accepted_at: "timestamptz NOT NULL server time",
      profile_revision: "varchar(66) NOT NULL quoted SHA-256", profile_data_revision: "bigint NOT NULL",
      snapshot_ciphertext: "bytea NOT NULL", snapshot_key_version: "varchar(80) NOT NULL",
      snapshot_sha256: "char(64) NOT NULL", created_at: "timestamptz NOT NULL server time",
    },
    unique: ["id, student_id"], immutable: true,
  },
  student_acknowledgement_documents: {
    proposedColumns: { acknowledgement_id: "uuid NOT NULL", student_id: "uuid NOT NULL", student_file_id: "uuid NOT NULL",
      content_sha256: "char(64) NOT NULL", document_version: "integer NOT NULL" },
    primaryKey: ["acknowledgement_id", "student_file_id"],
    foreignKeys: ["(acknowledgement_id, student_id) -> acknowledgements(id, student_id) RESTRICT",
      "(student_file_id, student_id) -> student_files(id, student_id) RESTRICT"],
    immutable: true,
  },
};
module.exports = { extensions, tables, newFileTypes, existingFileTypes, pendingAcknowledgementDesign };
