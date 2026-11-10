-- PREPARED ONLY. Apply manually after separate target/backup review.
-- Additive: no existing table, row, file, permission or migration ledger changes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$ BEGIN
  IF current_database() <> 'intern_system' OR current_schema() <> 'public'
     OR current_setting('server_version_num')::int / 10000 <> 16
  THEN RAISE EXCEPTION 'Expected public schema of PostgreSQL 16 intern_system'; END IF;
END $$;
CREATE TABLE public.coop_project_links (
  student_id UUID NOT NULL REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE,
  category VARCHAR(24) NOT NULL,
  document_url VARCHAR(2000) NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, category),
  CONSTRAINT coop_project_links_category_check CHECK (category IN ('project-book','poster')),
  CONSTRAINT coop_project_links_version_check CHECK (version >= 1),
  CONSTRAINT coop_project_links_url_check CHECK (document_url = '' OR (document_url LIKE 'https://%' AND length(document_url) <= 2000))
);
COMMIT;
