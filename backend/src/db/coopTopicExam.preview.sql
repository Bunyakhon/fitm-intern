-- CO-09 schema preview; generated from current Sequelize models.
-- NOT APPLIED. No migration runner. No account grants or data changes.
-- Four new tables + widening existing Super Admin capability CHECK only.
-- Review target/backup/restore before separately authorized installation.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$ BEGIN IF current_database() <> 'intern_system' OR current_schema() <> 'public' OR current_setting('server_version_num')::int / 10000 <> 16 THEN RAISE EXCEPTION 'Unexpected development target'; END IF; END $$;
SELECT pg_advisory_xact_lock(2140909);

CREATE TABLE IF NOT EXISTS "coop_topic_documents" ("id" UUID , "student_id" UUID NOT NULL UNIQUE REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE, "storage_path" VARCHAR(500) UNIQUE, "original_name" VARCHAR(255), "file_size" BIGINT, "mime_type" VARCHAR(100), "uploaded_at" TIMESTAMP WITH TIME ZONE, "document_url" VARCHAR(2000) NOT NULL DEFAULT '', "review_status" VARCHAR(24) NOT NULL DEFAULT 'missing', "review_reason" VARCHAR(2000) NOT NULL DEFAULT '', "reviewed_at" TIMESTAMP WITH TIME ZONE, "reviewed_by" VARCHAR(100), "version" INTEGER NOT NULL DEFAULT 1, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "coop_topic_exams" ("id" UUID , "student_id" UUID NOT NULL UNIQUE REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE, "project_id" UUID NOT NULL REFERENCES "coop_projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, "starts_at" TIMESTAMP WITH TIME ZONE, "ends_at" TIMESTAMP WITH TIME ZONE, "mode" VARCHAR(10) NOT NULL, "location" VARCHAR(500) NOT NULL DEFAULT '', "location_key" VARCHAR(500) NOT NULL DEFAULT '', "meeting_url" VARCHAR(2000) NOT NULL DEFAULT '', "status" VARCHAR(24) NOT NULL, "notes" TEXT NOT NULL DEFAULT '', "reason" VARCHAR(2000) NOT NULL DEFAULT '', "created_by" VARCHAR(100) NOT NULL, "updated_by" VARCHAR(100) NOT NULL, "version" INTEGER NOT NULL DEFAULT 1, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));

CREATE INDEX "coop_topic_exams_status_starts_at_ends_at" ON "coop_topic_exams" ("status", "starts_at", "ends_at");

CREATE TABLE IF NOT EXISTS "coop_topic_exam_committee_members" ("id" UUID , "exam_id" UUID NOT NULL REFERENCES "coop_topic_exams" ("id") ON DELETE CASCADE ON UPDATE CASCADE, "teacher_id" UUID NOT NULL REFERENCES "teachers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, "role" VARCHAR(24) NOT NULL, "display_order" INTEGER NOT NULL DEFAULT 0, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "coop_topic_exam_committee_members_exam_id_teacher_id" ON "coop_topic_exam_committee_members" ("exam_id", "teacher_id");

CREATE INDEX "coop_topic_exam_committee_members_teacher_id" ON "coop_topic_exam_committee_members" ("teacher_id");

CREATE TABLE IF NOT EXISTS "coop_topic_exam_history" ("id" UUID , "exam_id" UUID NOT NULL REFERENCES "coop_topic_exams" ("id") ON DELETE CASCADE ON UPDATE CASCADE, "version" INTEGER NOT NULL, "actor" VARCHAR(100) NOT NULL, "snapshot" JSONB NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "coop_topic_exam_history_exam_id_version" ON "coop_topic_exam_history" ("exam_id", "version");

ALTER TABLE "coop_topic_documents" ADD CONSTRAINT "co09_document_version" CHECK (version >= 1);

ALTER TABLE "coop_topic_documents" ADD CONSTRAINT "co09_document_status" CHECK (review_status IN ('missing','pending','needs_revision','approved'));

ALTER TABLE "coop_topic_documents" ADD CONSTRAINT "co09_document_url" CHECK (document_url = '' OR (document_url LIKE 'https://%' AND length(document_url) <= 2000));

ALTER TABLE "coop_topic_documents" ADD CONSTRAINT "co09_document_file" CHECK ((storage_path IS NULL AND original_name IS NULL AND file_size IS NULL AND mime_type IS NULL AND uploaded_at IS NULL) OR (storage_path IS NOT NULL AND original_name IS NOT NULL AND file_size IS NOT NULL AND file_size > 0 AND file_size <= 10485760 AND mime_type IS NOT NULL AND mime_type = 'application/pdf' AND uploaded_at IS NOT NULL));

ALTER TABLE "coop_topic_documents" ADD CONSTRAINT "co09_document_review" CHECK ((review_status IN ('missing','pending') AND reviewed_at IS NULL AND reviewed_by IS NULL AND review_reason = '') OR (review_status IN ('needs_revision','approved') AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND (review_status <> 'needs_revision' OR length(btrim(review_reason)) > 0)));

ALTER TABLE "coop_topic_documents" ADD CONSTRAINT "co09_document_submission" CHECK ((review_status = 'missing' AND storage_path IS NULL AND document_url = '') OR (review_status <> 'missing' AND (storage_path IS NOT NULL OR document_url <> '')));

ALTER TABLE "coop_topic_exams" ADD CONSTRAINT "co09_exam_version" CHECK (version >= 1);

ALTER TABLE "coop_topic_exams" ADD CONSTRAINT "co09_exam_status" CHECK (status IN ('scheduled','rescheduled','cancelled','completed'));

ALTER TABLE "coop_topic_exams" ADD CONSTRAINT "co09_exam_times" CHECK (((starts_at IS NULL AND ends_at IS NULL AND status = 'cancelled') OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND starts_at < ends_at)));

ALTER TABLE "coop_topic_exams" ADD CONSTRAINT "co09_exam_mode" CHECK (mode IN ('onsite','online') AND (status = 'cancelled' OR (mode = 'onsite' AND length(btrim(location)) > 0) OR (mode = 'online' AND meeting_url LIKE 'https://%')));

ALTER TABLE "coop_topic_exams" ADD CONSTRAINT "co09_exam_reason" CHECK (status NOT IN ('rescheduled','cancelled') OR length(btrim(reason)) > 0);

ALTER TABLE "coop_topic_exams" ADD CONSTRAINT "co09_exam_meeting_url" CHECK (meeting_url = '' OR meeting_url LIKE 'https://%');

ALTER TABLE "coop_topic_exam_committee_members" ADD CONSTRAINT "co09_committee_values" CHECK (role IN ('chair','member','advisor') AND display_order >= 0);

ALTER TABLE "coop_topic_exam_history" ADD CONSTRAINT "co09_history_version" CHECK (version >= 1);

ALTER TABLE "super_admins" DROP CONSTRAINT "super_admin_permissions_check";

ALTER TABLE "super_admins" ADD CONSTRAINT "super_admin_permissions_check" CHECK (jsonb_typeof(permissions) = 'array' AND permissions <@ '["topic-exams.manage","overview.read","accounts.read","accounts.write","accounts.status","permissions.write","settings.write","audit.read"]'::jsonb AND session_version >= 0 AND email = lower(btrim(email)));

ROLLBACK;
