-- Direct additive SQL, Local Development only. Called after a verified backup.
-- No startup sync, migration ledger or changes to existing account tables.
DO $$ BEGIN
 IF current_database() <> 'intern_system' OR current_schema() <> 'public'
 OR current_setting('fitm.super_admin_backup_verified',true) IS DISTINCT FROM 'on'
 THEN RAISE EXCEPTION 'Verified Development backup required'; END IF;
END $$;
CREATE TABLE public.super_admins (
 id UUID PRIMARY KEY, email VARCHAR(254) UNIQUE,
 first_name VARCHAR(100), last_name VARCHAR(100), password_hash VARCHAR(255),
 teacher_id UUID UNIQUE REFERENCES public.teachers(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 credential_stamp VARCHAR(64), is_active BOOLEAN NOT NULL DEFAULT true,
 permissions JSONB NOT NULL DEFAULT '[]', session_version INTEGER NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.admin_account_controls (
 actor_type VARCHAR(32) NOT NULL, actor_id UUID NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT true, revoked_before BIGINT NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(actor_type,actor_id)
);
CREATE TABLE public.system_settings (
 key VARCHAR(80) PRIMARY KEY, value JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 0,
 updated_by UUID NOT NULL REFERENCES public.super_admins(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.admin_audit_logs (
 id UUID PRIMARY KEY, actor_id UUID NOT NULL REFERENCES public.super_admins(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 action VARCHAR(80) NOT NULL, target_type VARCHAR(40) NOT NULL, target_id VARCHAR(100) NOT NULL,
 changes JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_logs_created_at_id ON public.admin_audit_logs(created_at,id);
