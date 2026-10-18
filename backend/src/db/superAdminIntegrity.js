const allowed = JSON.stringify(Object.keys(require('../services/superAdmin.policy').PERMISSIONS)).replaceAll("'", "''");
module.exports = {
  constraints: [
    { table_name: 'super_admins', name: 'super_admin_identity_check', type: 'c', definition: "CHECK ((teacher_id IS NULL AND email IS NOT NULL AND first_name IS NOT NULL AND last_name IS NOT NULL AND password_hash IS NOT NULL AND credential_stamp IS NULL) OR (teacher_id IS NOT NULL AND email IS NULL AND first_name IS NULL AND last_name IS NULL AND password_hash IS NULL AND credential_stamp IS NOT NULL AND credential_stamp ~ '^[0-9a-f]{64}$'))" },
    { table_name: 'super_admins', name: 'super_admin_permissions_check', type: 'c', definition: `CHECK (jsonb_typeof(permissions) = 'array' AND permissions <@ '${allowed}'::jsonb AND session_version >= 0 AND email = lower(btrim(email)))` },
    { table_name: 'admin_account_controls', name: 'admin_account_controls_check', type: 'c', definition: "CHECK (actor_type IN ('student','teacher','department_staff','super_admin') AND version >= 0 AND revoked_before >= 0)" },
    { table_name: 'system_settings', name: 'system_settings_allowlist_check', type: 'c', definition: "CHECK (key = 'admin.page_size' AND jsonb_typeof(value) = 'number' AND value::text ~ '^[0-9]+$' AND (value::text)::numeric BETWEEN 10 AND 100 AND version >= 0)" },
  ],
  functions: [{ name: 'admin_audit_log_guard', definition: "CREATE OR REPLACE FUNCTION public.admin_audit_log_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Admin audit history is append-only'; END; $$" }],
  triggers: [
    { table_name: 'admin_audit_logs', name: 'admin_audit_logs_immutable', definition: 'CREATE TRIGGER admin_audit_logs_immutable BEFORE DELETE OR UPDATE ON public.admin_audit_logs FOR EACH ROW EXECUTE FUNCTION admin_audit_log_guard()' },
    { table_name: 'admin_audit_logs', name: 'admin_audit_logs_no_truncate', definition: 'CREATE TRIGGER admin_audit_logs_no_truncate BEFORE TRUNCATE ON public.admin_audit_logs FOR EACH STATEMENT EXECUTE FUNCTION admin_audit_log_guard()' },
  ],
};
