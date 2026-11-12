-- Deployment preparation only. Review the target/backup and apply explicitly.
-- Never executed by application startup; no reset, sync or data rewrite.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS profile_image varchar(255) NULL;
COMMIT;
