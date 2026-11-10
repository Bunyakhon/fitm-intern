-- PREPARED ONLY. Reverse the new table only when unused; never discard saved links.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$ BEGIN
  IF current_database() <> 'intern_system' OR current_schema() <> 'public'
     OR current_setting('server_version_num')::int / 10000 <> 16
  THEN RAISE EXCEPTION 'Expected public schema of PostgreSQL 16 intern_system'; END IF;
END $$;
LOCK TABLE public.coop_project_links IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.coop_project_links)
  THEN RAISE EXCEPTION 'Saved project links exist; rollback refused to preserve data'; END IF;
END $$;
DROP TABLE public.coop_project_links RESTRICT;
COMMIT;
