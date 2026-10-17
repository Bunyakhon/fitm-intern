-- Direct additive DDL for authorized local Development only. Not a migration.
-- Execute inside a guarded transaction; initialize.js also derives these columns from Models.
DO $$ BEGIN
  IF current_database() <> 'intern_system' OR current_schema() <> 'public'
     OR current_setting('fitm.authorized_dev_account_seed', true) IS DISTINCT FROM 'on'
  THEN RAISE EXCEPTION 'Authorized Development account transaction required'; END IF;
END $$;
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS first_name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_name_en VARCHAR(255);
ALTER TABLE public.department_staffs
  ADD COLUMN IF NOT EXISTS first_name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS position VARCHAR(255),
  ADD COLUMN IF NOT EXISTS department VARCHAR(255);
