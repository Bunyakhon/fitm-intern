// Additive PostgreSQL checks shared by explicit model-driven initialization and preview.
const checks = {
  coop_topic_documents: {
    co09_document_version: 'version >= 1',
    co09_document_status: "review_status IN ('missing','pending','needs_revision','approved')",
    co09_document_url: "document_url = '' OR (document_url LIKE 'https://%' AND length(document_url) <= 2000)",
    co09_document_file: "(storage_path IS NULL AND original_name IS NULL AND file_size IS NULL AND mime_type IS NULL AND uploaded_at IS NULL) OR (storage_path IS NOT NULL AND original_name IS NOT NULL AND file_size IS NOT NULL AND file_size > 0 AND file_size <= 10485760 AND mime_type IS NOT NULL AND mime_type = 'application/pdf' AND uploaded_at IS NOT NULL)",
    co09_document_review: "(review_status IN ('missing','pending') AND reviewed_at IS NULL AND reviewed_by IS NULL AND review_reason = '') OR (review_status IN ('needs_revision','approved') AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND (review_status <> 'needs_revision' OR length(btrim(review_reason)) > 0))",
    co09_document_submission: "(review_status = 'missing' AND storage_path IS NULL AND document_url = '') OR (review_status <> 'missing' AND (storage_path IS NOT NULL OR document_url <> ''))",
  },
  coop_topic_exams: {
    co09_exam_version: 'version >= 1',
    co09_exam_status: "status IN ('scheduled','rescheduled','cancelled','completed')",
    co09_exam_times: "((starts_at IS NULL AND ends_at IS NULL AND status = 'cancelled') OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND starts_at < ends_at))",
    co09_exam_mode: "mode IN ('onsite','online') AND (status = 'cancelled' OR (mode = 'onsite' AND length(btrim(location)) > 0) OR (mode = 'online' AND meeting_url LIKE 'https://%'))",
    co09_exam_reason: "status NOT IN ('rescheduled','cancelled') OR length(btrim(reason)) > 0",
    co09_exam_meeting_url: "meeting_url = '' OR meeting_url LIKE 'https://%'",
  },
  coop_topic_exam_committee_members: { co09_committee_values: "role IN ('chair','member','advisor') AND display_order >= 0" },
  coop_topic_exam_history: { co09_history_version: 'version >= 1' },
};
const constraints = Object.entries(checks).flatMap(([table_name, values]) => Object.entries(values).map(([name, sql]) => ({ table_name, name, type: 'c', definition: `CHECK (${sql})`, key_count: 1 })));
module.exports = { constraints, functions: [], triggers: [] };
