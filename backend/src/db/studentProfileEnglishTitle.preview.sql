-- REVIEW ONLY. Do not execute against PostgreSQL until explicitly authorized.
-- One-off additive change for the model-driven schema; no migration runner.
-- Prerequisites: verified target + fresh pg_dump -Fc + successful isolated restore,
-- preservation fingerprints (excluding the new column), and approved maintenance window.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
DO $$
BEGIN
  IF current_database() <> 'intern_system'
     OR current_schema() <> 'public'
     OR current_setting('server_version_num')::integer / 10000 <> 16
     OR pg_is_in_recovery() THEN
    RAISE EXCEPTION 'Unexpected PostgreSQL target';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'student_profiles'
               AND column_name = 'english_prefix') THEN
    RAISE EXCEPTION 'Column already exists: inspect its definition and data; do not overwrite';
  END IF;
END $$;
ALTER TABLE public.student_profiles ADD COLUMN english_prefix varchar(255) NULL;
-- No default, backfill, UPDATE, index, gender column, or other schema changes.
SELECT data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'student_profiles' AND column_name = 'english_prefix';
-- Final live procedure must compare original data/schema fingerprints before COMMIT.
-- This preview deliberately rolls back. Never DROP the column to undo after data is saved.
ROLLBACK;
