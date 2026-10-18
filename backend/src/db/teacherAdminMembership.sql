-- Backwards-compatible membership extension; no account/profile rows changed.
DO $$ BEGIN
 IF current_database() <> 'intern_system' OR current_schema() <> 'public'
 OR current_setting('fitm.super_admin_backup_verified',true) IS DISTINCT FROM 'on'
 THEN RAISE EXCEPTION 'Verified Development backup required'; END IF;
END $$;
ALTER TABLE public.super_admins ADD COLUMN teacher_id UUID, ADD COLUMN credential_stamp VARCHAR(64);
-- Teacher-linked grants contain NO copied profile, email or second password.
-- Legacy standalone rows remain valid and retain their values.
ALTER TABLE public.super_admins ALTER COLUMN email DROP NOT NULL,
 ALTER COLUMN first_name DROP NOT NULL, ALTER COLUMN last_name DROP NOT NULL,
 ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.super_admins ADD CONSTRAINT super_admins_teacher_id_key UNIQUE (teacher_id),
 ADD CONSTRAINT super_admins_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.teachers(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
