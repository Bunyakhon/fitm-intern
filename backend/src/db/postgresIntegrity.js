// Current PostgreSQL-only constraints and history guards. No migration ledger or runner.
module.exports = {
  "constraints": [
    {
      "table_name": "coop_request_prerequisite_courses",
      "name": "coop_prerequisites_program_code_check",
      "type": "c",
      "definition": "CHECK (((((program)::text = 'IT'::text) AND ((course_code)::text = ANY (ARRAY[('060243102'::character varying)::text, ('060243104'::character varying)::text, ('060243108'::character varying)::text, ('060243112'::character varying)::text, ('060243122'::character varying)::text]))) OR (((program)::text = 'INE'::text) AND ((course_code)::text = ANY (ARRAY[('060233107'::character varying)::text, ('060233112'::character varying)::text, ('060233113'::character varying)::text, ('060233202'::character varying)::text, ('060233204'::character varying)::text])))))",
      "key_count": 2
    },
    {
      "table_name": "coop_project_advisor_requests",
      "name": "project_advisor_request_state_check",
      "type": "c",
      "definition": "CHECK (((((status)::text = 'pending'::text) AND (confirmed_at IS NULL) AND (rejected_at IS NULL) AND (superseded_at IS NULL) AND (rejection_reason IS NULL)) OR (((status)::text = 'confirmed'::text) AND (confirmed_at IS NOT NULL) AND (rejected_at IS NULL) AND (superseded_at IS NULL) AND (rejection_reason IS NULL)) OR (((status)::text = 'rejected'::text) AND (confirmed_at IS NULL) AND (rejected_at IS NOT NULL) AND (superseded_at IS NULL) AND (rejection_reason IS NOT NULL) AND (length(btrim((rejection_reason)::text)) > 0)) OR (((status)::text = 'superseded'::text) AND (confirmed_at IS NULL) AND (superseded_at IS NOT NULL) AND (((rejected_at IS NULL) AND (rejection_reason IS NULL)) OR ((rejected_at IS NOT NULL) AND (rejection_reason IS NOT NULL) AND (length(btrim((rejection_reason)::text)) > 0))))))",
      "key_count": 5
    },
    {
      "table_name": "coop_project_advisor_requests",
      "name": "project_advisor_request_time_check",
      "type": "c",
      "definition": "CHECK ((((confirmed_at IS NULL) OR (confirmed_at >= requested_at)) AND ((rejected_at IS NULL) OR (rejected_at >= requested_at)) AND ((superseded_at IS NULL) OR (superseded_at >= COALESCE(rejected_at, requested_at)))))",
      "key_count": 4
    },
    {
      "table_name": "coop_document_revisions",
      "name": "coop_document_revisions_action_check",
      "type": "c",
      "definition": "CHECK (((version >= 1) AND ((action)::text = ANY (ARRAY[('create'::character varying)::text, ('edit'::character varying)::text, ('generate'::character varying)::text, ('regenerate'::character varying)::text]))))",
      "key_count": 2
    },
    {
      "table_name": "company_evaluations",
      "name": "company_evaluations_scores_check",
      "type": "c",
      "definition": "CHECK (((q1_score >= 1) AND (q1_score <= 10) AND ((q2_score >= 1) AND (q2_score <= 10)) AND ((q3_score >= 1) AND (q3_score <= 10)) AND ((q4_score >= 1) AND (q4_score <= 10)) AND ((q5_score >= 1) AND (q5_score <= 10))))",
      "key_count": 5
    },
    {
      "table_name": "company_evaluations",
      "name": "company_evaluations_comment_check",
      "type": "c",
      "definition": "CHECK (((char_length(comment) <= 2000) AND (comment = btrim(comment))))",
      "key_count": 1
    },
    {
      "table_name": "company_responses",
      "name": "company_responses_values_check",
      "type": "c",
      "definition": "CHECK ((((status)::text = ANY (ARRAY[('accepted'::character varying)::text, ('rejected'::character varying)::text])) AND (version >= 1) AND (cooperation_version >= 1) AND ((note IS NULL) OR (length(note) <= 2000))))",
      "key_count": 4
    },
    {
      "table_name": "company_responses",
      "name": "company_responses_cooperation_revision_fk",
      "type": "f",
      "definition": "FOREIGN KEY (cooperation_document_id, cooperation_version) REFERENCES coop_document_revisions(coop_document_id, version) ON UPDATE RESTRICT ON DELETE RESTRICT",
      "key_count": 2
    },
    {
      "table_name": "company_response_history",
      "name": "company_response_history_values_check",
      "type": "c",
      "definition": "CHECK ((((status)::text = ANY (ARRAY[('accepted'::character varying)::text, ('rejected'::character varying)::text])) AND (version >= 1) AND (cooperation_version >= 1) AND ((note IS NULL) OR (length(note) <= 2000))))",
      "key_count": 4
    },
    {
      "table_name": "company_response_history",
      "name": "company_response_history_cooperation_revision_fk",
      "type": "f",
      "definition": "FOREIGN KEY (cooperation_document_id, cooperation_version) REFERENCES coop_document_revisions(coop_document_id, version) ON UPDATE RESTRICT ON DELETE RESTRICT",
      "key_count": 2
    },
    {
      "table_name": "job_posting_work_modes",
      "name": "job_posting_work_modes_mode_check",
      "type": "c",
      "definition": "CHECK (((mode)::text = ANY (ARRAY[('onsite'::character varying)::text, ('work_from_home'::character varying)::text, ('hybrid'::character varying)::text])))",
      "key_count": 1
    },
    {
      "table_name": "company_access_tokens",
      "name": "company_access_tokens_purpose_check",
      "type": "c",
      "definition": "CHECK (((purpose)::text = ANY (ARRAY[('email_verification'::character varying)::text, ('management_access'::character varying)::text])))",
      "key_count": 1
    },
    {
      "table_name": "coop_request_prerequisite_courses",
      "name": "coop_prerequisites_status_grade_check",
      "type": "c",
      "definition": "CHECK (((((status)::text = 'passed'::text) AND (grade IS NOT NULL) AND (length(TRIM(BOTH FROM grade)) > 0)) OR (((status)::text = ANY (ARRAY[('studying'::character varying)::text, ('unselected'::character varying)::text])) AND (grade IS NULL))))",
      "key_count": 2
    },
    {
      "table_name": "coop_request_reviews",
      "name": "coop_reviews_actor_check",
      "type": "c",
      "definition": "CHECK (((((actor_role)::text = 'student'::text) AND (student_id IS NOT NULL) AND (teacher_id IS NULL) AND (department_staff_id IS NULL)) OR (((actor_role)::text = 'department_staff'::text) AND (department_staff_id IS NOT NULL) AND (teacher_id IS NULL) AND (student_id IS NULL)) OR (((actor_role)::text = ANY (ARRAY[('teacher'::character varying)::text, ('department_head'::character varying)::text])) AND (teacher_id IS NOT NULL) AND (department_staff_id IS NULL) AND (student_id IS NULL))))",
      "key_count": 4
    },
    {
      "table_name": "coop_request_reviews",
      "name": "coop_reviews_transition_check",
      "type": "c",
      "definition": "CHECK (((((actor_role)::text = 'student'::text) AND ((decision)::text = 'submit'::text) AND ((from_status)::text = 'new'::text) AND ((to_status)::text = 'advisor_review'::text)) OR (((actor_role)::text = ANY (ARRAY[('student'::character varying)::text, ('department_staff'::character varying)::text])) AND ((decision)::text = 'cancel'::text) AND ((from_status)::text = ANY (ARRAY[('submitted'::character varying)::text, ('advisor_review'::character varying)::text, ('staff_review'::character varying)::text, ('department_head_review'::character varying)::text])) AND ((to_status)::text = 'cancelled'::text)) OR (((actor_role)::text = 'teacher'::text) AND ((from_status)::text = ANY (ARRAY[('submitted'::character varying)::text, ('advisor_review'::character varying)::text])) AND ((((decision)::text = 'approve'::text) AND ((to_status)::text = 'department_head_review'::text)) OR (((decision)::text = 'reject'::text) AND ((to_status)::text = 'rejected'::text)))) OR (((actor_role)::text = 'department_head'::text) AND ((from_status)::text = 'department_head_review'::text) AND ((((decision)::text = 'approve'::text) AND ((to_status)::text = 'approved'::text)) OR (((decision)::text = 'reject'::text) AND ((to_status)::text = 'rejected'::text)))))) NOT VALID",
      "key_count": 4
    },
    {
      "table_name": "coop_request_reviews",
      "name": "coop_reviews_reason_check",
      "type": "c",
      "definition": "CHECK ((((decision)::text <> ALL (ARRAY[('reject'::character varying)::text, ('cancel'::character varying)::text])) OR ((reason IS NOT NULL) AND (length(TRIM(BOTH FROM reason)) > 0)))) NOT VALID",
      "key_count": 2
    },
    {
      "table_name": "job_submissions",
      "name": "job_submissions_verification_status_check",
      "type": "c",
      "definition": "CHECK (((verification_status)::text = ANY (ARRAY[('pending_email_verification'::character varying)::text, ('verified'::character varying)::text, ('expired'::character varying)::text, ('cancelled'::character varying)::text])))",
      "key_count": 1
    },
    {
      "table_name": "job_postings",
      "name": "job_postings_quota_check",
      "type": "c",
      "definition": "CHECK (((quota >= 1) AND (quota <= 9999)))",
      "key_count": 1
    },
    {
      "table_name": "job_postings",
      "name": "job_postings_work_days_check",
      "type": "c",
      "definition": "CHECK (((work_days_per_week >= 1) AND (work_days_per_week <= 7)))",
      "key_count": 1
    },
    {
      "table_name": "job_postings",
      "name": "job_postings_category_check",
      "type": "c",
      "definition": "CHECK (((category)::text = ANY (ARRAY[('information_technology'::character varying)::text, ('business'::character varying)::text, ('design'::character varying)::text, ('engineering'::character varying)::text, ('other'::character varying)::text])))",
      "key_count": 1
    },
    {
      "table_name": "job_postings",
      "name": "job_postings_status_check",
      "type": "c",
      "definition": "CHECK (((status)::text = ANY (ARRAY[('pending_email_verification'::character varying)::text, ('pending_review'::character varying)::text, ('published'::character varying)::text, ('rejected'::character varying)::text, ('withdrawn'::character varying)::text, ('expired'::character varying)::text])))",
      "key_count": 1
    },
    {
      "table_name": "internship_weeks",
      "name": "internship_weeks_version_check",
      "type": "c",
      "definition": "CHECK ((version > 0))",
      "key_count": 1
    },
    {
      "table_name": "internship_weeks",
      "name": "internship_weeks_snapshot_check",
      "type": "c",
      "definition": "CHECK ((jsonb_typeof(snapshot) = 'object'::text))",
      "key_count": 1
    },
    {
      "table_name": "internship_week_events",
      "name": "internship_week_events_version_check",
      "type": "c",
      "definition": "CHECK ((version > 0))",
      "key_count": 1
    },
    {
      "table_name": "job_posting_reviews",
      "name": "job_reviews_transition_check",
      "type": "c",
      "definition": "CHECK ((((from_status)::text = 'pending_review'::text) AND ((((decision)::text = 'approve'::text) AND ((to_status)::text = 'published'::text)) OR (((decision)::text = 'reject'::text) AND ((to_status)::text = 'rejected'::text)))))",
      "key_count": 3
    },
    {
      "table_name": "job_posting_reviews",
      "name": "job_reviews_reason_check",
      "type": "c",
      "definition": "CHECK ((((decision)::text <> 'reject'::text) OR ((reason IS NOT NULL) AND (length(TRIM(BOTH FROM reason)) > 0))))",
      "key_count": 2
    },
    {
      "table_name": "coop_projects",
      "name": "coop_projects_topic_check",
      "type": "c",
      "definition": "CHECK (((length(btrim((topic)::text)) >= 1) AND (length(btrim((topic)::text)) <= 500) AND ((topic)::text = btrim((topic)::text))))",
      "key_count": 1
    },
    {
      "table_name": "company_access_tokens",
      "name": "company_access_tokens_scope_check",
      "type": "c",
      "definition": "CHECK (((((purpose)::text = 'email_verification'::text) AND (job_submission_id IS NOT NULL)) OR (((purpose)::text = 'management_access'::text) AND (job_submission_id IS NULL))))",
      "key_count": 2
    },
    {
      "table_name": "company_access_tokens",
      "name": "company_access_tokens_expiry_check",
      "type": "c",
      "definition": "CHECK ((expires_at > created_at))",
      "key_count": 2
    },
    {
      "table_name": "coop_documents",
      "name": "coop_documents_type_check",
      "type": "c",
      "definition": "CHECK (((document_type)::text = ANY (ARRAY[('cooperation'::character varying)::text, ('placement'::character varying)::text])))",
      "key_count": 1
    },
    {
      "table_name": "coop_documents",
      "name": "coop_documents_version_check",
      "type": "c",
      "definition": "CHECK ((version >= 1))",
      "key_count": 1
    },
    {
      "table_name": "coop_documents",
      "name": "coop_documents_json_check",
      "type": "c",
      "definition": "CHECK (((jsonb_typeof(metadata) = 'object'::text) AND (jsonb_typeof(snapshot) = 'object'::text)))",
      "key_count": 2
    },
    {
      "table_name": "coop_documents",
      "name": "coop_documents_number_check",
      "type": "c",
      "definition": "CHECK (((document_number IS NULL) OR (((document_number)::text = btrim((document_number)::text)) AND ((length((document_number)::text) >= 1) AND (length((document_number)::text) <= 80)))))",
      "key_count": 1
    },
    {
      "table_name": "coop_documents",
      "name": "coop_documents_state_check",
      "type": "c",
      "definition": "CHECK (((((status)::text = 'draft'::text) AND (generated_at IS NULL) AND (rendered_html IS NULL) AND (content_sha256 IS NULL)) OR (((status)::text = 'generated'::text) AND (generated_at IS NOT NULL) AND (rendered_html IS NOT NULL) AND (length(rendered_html) > 0) AND (content_sha256 IS NOT NULL) AND (content_sha256 ~ '^[0-9a-f]{64}$'::text))))",
      "key_count": 4
    },
    {
      "table_name": "coop_document_revisions",
      "name": "coop_document_revisions_state_check",
      "type": "c",
      "definition": "CHECK (((((status)::text = 'draft'::text) AND ((action)::text = ANY (ARRAY[('create'::character varying)::text, ('edit'::character varying)::text])) AND (rendered_html IS NULL) AND (content_sha256 IS NULL)) OR (((status)::text = 'generated'::text) AND ((action)::text = ANY (ARRAY[('generate'::character varying)::text, ('regenerate'::character varying)::text])) AND (rendered_html IS NOT NULL) AND (content_sha256 IS NOT NULL) AND (content_sha256 ~ '^[0-9a-f]{64}$'::text))))",
      "key_count": 4
    },
    {
      "table_name": "company_response_history",
      "name": "company_response_history_action_check",
      "type": "c",
      "definition": "CHECK (((((action)::text = 'create'::text) AND (version = 1) AND (correction_reason IS NULL)) OR (((action)::text = 'correct'::text) AND (version > 1) AND (correction_reason IS NOT NULL) AND ((length(btrim(correction_reason)) >= 1) AND (length(btrim(correction_reason)) <= 2000)))))",
      "key_count": 3
    },
    {
      "table_name": "internship_daily_logs",
      "name": "internship_daily_logs_kind_check",
      "type": "c",
      "definition": "CHECK ((kind = ANY (ARRAY['working'::text, 'non_working'::text])))",
      "key_count": 1
    },
    {
      "table_name": "internship_daily_logs",
      "name": "internship_daily_logs_version_check",
      "type": "c",
      "definition": "CHECK ((version > 0))",
      "key_count": 1
    },
    {
      "table_name": "internship_daily_logs",
      "name": "internship_daily_logs_check",
      "type": "c",
      "definition": "CHECK (((length(assigned_work) <= 5000) AND (length(work_result) <= 5000) AND (length(problems) <= 5000) AND (length(solutions) <= 5000) AND (length(notes) <= 5000) AND (length(non_working_reason) <= 5000)))",
      "key_count": 6
    },
    {
      "table_name": "internship_daily_logs",
      "name": "internship_daily_logs_check1",
      "type": "c",
      "definition": "CHECK ((((kind = 'working'::text) AND (btrim(assigned_work) <> ''::text) AND (btrim(work_result) <> ''::text) AND (btrim(problems) <> ''::text) AND (btrim(solutions) <> ''::text) AND (non_working_reason = ''::text)) OR ((kind = 'non_working'::text) AND (btrim(non_working_reason) <> ''::text) AND (assigned_work = ''::text) AND (work_result = ''::text) AND (problems = ''::text) AND (solutions = ''::text))))",
      "key_count": 6
    },
    {
      "table_name": "internship_weeks",
      "name": "internship_weeks_week_start_check",
      "type": "c",
      "definition": "CHECK ((EXTRACT(isodow FROM week_start) = (1)::numeric))",
      "key_count": 1
    },
    {
      "table_name": "internship_weeks",
      "name": "internship_weeks_check",
      "type": "c",
      "definition": "CHECK ((week_end = (week_start + 6)))",
      "key_count": 2
    },
    {
      "table_name": "internship_weeks",
      "name": "internship_weeks_status_check",
      "type": "c",
      "definition": "CHECK ((status = ANY (ARRAY['submitted'::text, 'reviewed'::text, 'revision_requested'::text])))",
      "key_count": 1
    },
    {
      "table_name": "internship_week_events",
      "name": "internship_week_events_action_check",
      "type": "c",
      "definition": "CHECK ((action = ANY (ARRAY['submitted'::text, 'reviewed'::text, 'revision_requested'::text])))",
      "key_count": 1
    },
    {
      "table_name": "internship_week_events",
      "name": "internship_week_events_feedback_check",
      "type": "c",
      "definition": "CHECK ((length(feedback) <= 5000))",
      "key_count": 1
    },
    {
      "table_name": "internship_week_events",
      "name": "internship_week_events_check",
      "type": "c",
      "definition": "CHECK ((((action = 'submitted'::text) AND (mentor_id IS NULL)) OR ((action <> 'submitted'::text) AND (mentor_id IS NOT NULL) AND (btrim(mentor_name) <> ''::text))))",
      "key_count": 3
    },
    {
      "table_name": "internship_week_events",
      "name": "internship_week_events_check1",
      "type": "c",
      "definition": "CHECK (((action <> 'revision_requested'::text) OR (btrim(feedback) <> ''::text)))",
      "key_count": 2
    },
    {
      "table_name": "students",
      "name": "phase2a_last_semester_gpa",
      "type": "c",
      "definition": "CHECK (((last_semester_gpa >= (0)::numeric) AND (last_semester_gpa <= (4)::numeric)))",
      "key_count": 1
    },
    {
      "table_name": "students",
      "name": "phase2a_profile_data_revision",
      "type": "c",
      "definition": "CHECK ((profile_data_revision >= 0))",
      "key_count": 1
    },
    {
      "table_name": "student_profiles",
      "name": "phase2a_national_id_pair",
      "type": "c",
      "definition": "CHECK (((national_id_ciphertext IS NULL) = (national_id_key_version IS NULL)))",
      "key_count": 2
    },
    {
      "table_name": "student_profiles",
      "name": "phase2a_national_id_key",
      "type": "c",
      "definition": "CHECK (((national_id_key_version IS NULL) OR (length(btrim((national_id_key_version)::text)) > 0)))",
      "key_count": 1
    },
    {
      "table_name": "student_profiles",
      "name": "phase2a_national_id_dates",
      "type": "c",
      "definition": "CHECK ((national_id_expiry_date >= national_id_issue_date))",
      "key_count": 2
    },
    {
      "table_name": "student_profiles",
      "name": "phase2a_license_absent",
      "type": "c",
      "definition": "CHECK (((has_driving_license IS DISTINCT FROM false) OR ((driving_license_number IS NULL) AND (driving_license_type IS NULL) AND (driving_license_expiry_date IS NULL))))",
      "key_count": 4
    },
    {
      "table_name": "student_profiles",
      "name": "phase2a_military_status",
      "type": "c",
      "definition": "CHECK (((military_status)::text = ANY (ARRAY[('served'::character varying)::text, ('not_yet_served'::character varying)::text])))",
      "key_count": 1
    },
    {
      "table_name": "student_profiles",
      "name": "phase2a_id_issue_year",
      "type": "c",
      "definition": "CHECK (((EXTRACT(year FROM national_id_issue_date) >= (1)::numeric) AND (EXTRACT(year FROM national_id_issue_date) <= (9999)::numeric)))",
      "key_count": 1
    },
    {
      "table_name": "student_files",
      "name": "phase2a_file_hash",
      "type": "c",
      "definition": "CHECK (((content_sha256 IS NULL) OR (content_sha256 ~ '^[0-9a-f]{64}$'::text)))",
      "key_count": 1
    },
    {
      "table_name": "student_profiles",
      "name": "phase2a_id_expiry_year",
      "type": "c",
      "definition": "CHECK (((EXTRACT(year FROM national_id_expiry_date) >= (1)::numeric) AND (EXTRACT(year FROM national_id_expiry_date) <= (9999)::numeric)))",
      "key_count": 1
    },
    {
      "table_name": "student_profiles",
      "name": "phase2a_license_expiry_year",
      "type": "c",
      "definition": "CHECK (((EXTRACT(year FROM driving_license_expiry_date) >= (1)::numeric) AND (EXTRACT(year FROM driving_license_expiry_date) <= (9999)::numeric)))",
      "key_count": 1
    },
    {
      "table_name": "student_addresses",
      "name": "student_addresses_address_type_check",
      "type": "c",
      "definition": "CHECK (((address_type)::text = ANY (ARRAY[('registered'::character varying)::text, ('current'::character varying)::text])))",
      "key_count": 1
    },
    {
      "table_name": "student_education_records",
      "name": "student_education_records_education_level_check",
      "type": "c",
      "definition": "CHECK (((education_level)::text = ANY (ARRAY[('bachelor'::character varying)::text, ('high_vocational'::character varying)::text, ('high_school_vocational'::character varying)::text])))",
      "key_count": 1
    },
    {
      "table_name": "student_files",
      "name": "phase2a_file_version",
      "type": "c",
      "definition": "CHECK ((document_version >= 1))",
      "key_count": 1
    },
    {
      "table_name": "student_education_records",
      "name": "student_education_records_gpa_check",
      "type": "c",
      "definition": "CHECK (((gpa >= (0)::numeric) AND (gpa <= (4)::numeric)))",
      "key_count": 1
    },
    {
      "table_name": "student_education_records",
      "name": "student_education_records_graduation_year_check",
      "type": "c",
      "definition": "CHECK (((graduation_year >= 1) AND (graduation_year <= 9999)))",
      "key_count": 1
    },
    {
      "table_name": "student_education_records",
      "name": "student_education_records_display_order_check",
      "type": "c",
      "definition": "CHECK ((display_order >= 0))",
      "key_count": 1
    },
    {
      "table_name": "student_training_records",
      "name": "student_training_records_display_order_check",
      "type": "c",
      "definition": "CHECK ((display_order >= 0))",
      "key_count": 1
    },
    {
      "table_name": "student_skills",
      "name": "student_skills_category_check",
      "type": "c",
      "definition": "CHECK (((category)::text = ANY (ARRAY[('computer'::character varying)::text, ('language'::character varying)::text])))",
      "key_count": 1
    },
    {
      "table_name": "student_skills",
      "name": "student_skills_proficiency_check",
      "type": "c",
      "definition": "CHECK (((proficiency)::text = ANY (ARRAY[('very_good'::character varying)::text, ('good'::character varying)::text, ('moderate'::character varying)::text, ('fair'::character varying)::text])))",
      "key_count": 1
    },
    {
      "table_name": "student_skills",
      "name": "student_skills_display_order_check",
      "type": "c",
      "definition": "CHECK ((display_order >= 0))",
      "key_count": 1
    },
    {
      "table_name": "student_files",
      "name": "phase2a_file_not_self",
      "type": "c",
      "definition": "CHECK (((supersedes_file_id IS NULL) OR (supersedes_file_id <> id)))",
      "key_count": 2
    },
    {
      "table_name": "student_files",
      "name": "phase2a_profile_file_metadata",
      "type": "c",
      "definition": "CHECK (((file_type <> ALL (ARRAY['transcript'::enum_student_files_file_type, 'national_id_copy'::enum_student_files_file_type, 'student_id_copy'::enum_student_files_file_type, 'supporting_other'::enum_student_files_file_type, 'external_profile_pdf'::enum_student_files_file_type])) OR ((content_sha256 IS NOT NULL) AND (document_version IS NOT NULL))))",
      "key_count": 3
    },
    {
      "table_name": "student_files",
      "name": "phase2a_other_file_label",
      "type": "c",
      "definition": "CHECK (((file_type <> 'supporting_other'::enum_student_files_file_type) OR ((document_label IS NOT NULL) AND (length(btrim((document_label)::text)) > 0))))",
      "key_count": 2
    },
    {
      "table_name": "student_files",
      "name": "phase2a_supersedes_owner",
      "type": "f",
      "definition": "FOREIGN KEY (supersedes_file_id, student_id) REFERENCES student_files(id, student_id) ON UPDATE RESTRICT ON DELETE RESTRICT",
      "key_count": 2
    },
    {
      "table_name": "google_identities",
      "name": "google_identity_actor_check",
      "type": "c",
      "definition": "CHECK (((((actor_type)::text = 'student'::text) AND (student_id IS NOT NULL) AND (teacher_id IS NULL) AND (staff_id IS NULL)) OR (((actor_type)::text = 'teacher'::text) AND (teacher_id IS NOT NULL) AND (student_id IS NULL) AND (staff_id IS NULL)) OR (((actor_type)::text = 'department_staff'::text) AND (staff_id IS NOT NULL) AND (student_id IS NULL) AND (teacher_id IS NULL))))",
      "key_count": 4
    },
    {
      "table_name": "google_identities",
      "name": "google_identity_subject_check",
      "type": "c",
      "definition": "CHECK ((length((subject)::text) > 0))",
      "key_count": 1
    },
    {
      "table_name": "supervision_appointments",
      "name": "supervision_appointments_integrity_74",
      "type": "c",
      "definition": "CHECK ((visit_number = ANY (ARRAY[1, 2])))"
    },
    {
      "table_name": "supervision_appointments",
      "name": "supervision_appointments_integrity_75",
      "type": "c",
      "definition": "CHECK (((timezone)::text = 'Asia/Bangkok'::text))"
    },
    {
      "table_name": "supervision_appointments",
      "name": "supervision_appointments_integrity_76",
      "type": "c",
      "definition": "CHECK (((status)::text = ANY ((ARRAY['pending_confirmation'::character varying, 'confirmed'::character varying])::text[])))"
    },
    {
      "table_name": "supervision_appointments",
      "name": "supervision_appointments_integrity_77",
      "type": "c",
      "definition": "CHECK ((version > 0))"
    },
    {
      "table_name": "supervision_appointments",
      "name": "supervision_appointments_integrity_78",
      "type": "c",
      "definition": "CHECK ((jsonb_typeof(snapshot) = 'object'::text))"
    },
    {
      "table_name": "supervision_appointments",
      "name": "supervision_appointments_integrity_79",
      "type": "c",
      "definition": "CHECK ((((status)::text = 'confirmed'::text) = (confirmed_at IS NOT NULL)))"
    },
    {
      "table_name": "supervision_events",
      "name": "supervision_events_integrity_80",
      "type": "c",
      "definition": "CHECK ((version > 0))"
    },
    {
      "table_name": "supervision_events",
      "name": "supervision_events_integrity_81",
      "type": "c",
      "definition": "CHECK (((action)::text = ANY ((ARRAY['scheduled'::character varying, 'rescheduled'::character varying, 'confirmed'::character varying])::text[])))"
    },
    {
      "table_name": "supervision_tokens",
      "name": "supervision_tokens_integrity_82",
      "type": "c",
      "definition": "CHECK ((version > 0))"
    },
    {
      "table_name": "supervision_appointments",
      "name": "supervision_request_owner_fk",
      "type": "f",
      "definition": "FOREIGN KEY (request_id, student_id) REFERENCES coop_requests(id, student_id) ON DELETE RESTRICT"
    },
    {
      "table_name": "supervision_appointments",
      "name": "supervision_mentor_owner_fk",
      "type": "f",
      "definition": "FOREIGN KEY (mentor_id, student_id) REFERENCES mentors(id, student_id) ON DELETE RESTRICT"
    },
    {
      "table_name": "supervision_images",
      "name": "supervision_images_integrity_85",
      "type": "c",
      "definition": "CHECK (((mime_type)::text = ANY ((ARRAY['image/png'::character varying, 'image/jpeg'::character varying])::text[])))"
    },
    {
      "table_name": "supervision_images",
      "name": "supervision_images_integrity_86",
      "type": "c",
      "definition": "CHECK (((file_size >= 1) AND (file_size <= 5242880)))"
    },
    {
      "table_name": "supervision_results",
      "name": "supervision_results_integrity_87",
      "type": "c",
      "definition": "CHECK ((appointment_version > 0))"
    },
    {
      "table_name": "supervision_results",
      "name": "supervision_results_integrity_88",
      "type": "c",
      "definition": "CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'completed'::character varying])::text[])))"
    },
    {
      "table_name": "supervision_results",
      "name": "supervision_results_integrity_89",
      "type": "c",
      "definition": "CHECK ((version > 0))"
    },
    {
      "table_name": "supervision_results",
      "name": "supervision_results_integrity_90",
      "type": "c",
      "definition": "CHECK ((length(summary) <= 5000))"
    },
    {
      "table_name": "supervision_results",
      "name": "supervision_results_integrity_91",
      "type": "c",
      "definition": "CHECK ((length(issues) <= 5000))"
    },
    {
      "table_name": "supervision_results",
      "name": "supervision_results_integrity_92",
      "type": "c",
      "definition": "CHECK ((length(recommendations) <= 5000))"
    },
    {
      "table_name": "supervision_results",
      "name": "supervision_results_owner_93",
      "type": "f",
      "definition": "FOREIGN KEY (image_1_id, appointment_id) REFERENCES supervision_images(id, appointment_id) ON DELETE RESTRICT"
    },
    {
      "table_name": "supervision_results",
      "name": "supervision_results_owner_94",
      "type": "f",
      "definition": "FOREIGN KEY (image_2_id, appointment_id) REFERENCES supervision_images(id, appointment_id) ON DELETE RESTRICT"
    },
    {
      "table_name": "supervision_results",
      "name": "supervision_results_integrity_95",
      "type": "c",
      "definition": "CHECK (((image_1_id IS NULL) OR (image_2_id IS NULL) OR (image_1_id <> image_2_id)))"
    },
    {
      "table_name": "supervision_results",
      "name": "supervision_results_integrity_96",
      "type": "c",
      "definition": "CHECK ((((status)::text = 'completed'::text) = (completed_at IS NOT NULL)))"
    },
    {
      "table_name": "supervision_results",
      "name": "supervision_results_integrity_97",
      "type": "c",
      "definition": "CHECK ((((status)::text <> 'completed'::text) OR ((image_1_id IS NOT NULL) AND (image_2_id IS NOT NULL) AND (visited_on IS NOT NULL) AND (length(TRIM(BOTH FROM summary)) > 0))))"
    },
    {
      "table_name": "supervision_result_revisions",
      "name": "supervision_result_revisions_integrity_98",
      "type": "c",
      "definition": "CHECK ((version > 0))"
    },
    {
      "table_name": "coop_activities",
      "name": "coop_activities_integrity_99",
      "type": "c",
      "definition": "CHECK ((length(TRIM(BOTH FROM title)) > 0))"
    },
    {
      "table_name": "coop_activities",
      "name": "coop_activities_integrity_100",
      "type": "c",
      "definition": "CHECK (((category)::text = ANY ((ARRAY['orientation'::character varying, 'training'::character varying, 'presentation'::character varying, 'other'::character varying])::text[])))"
    },
    {
      "table_name": "coop_activities",
      "name": "coop_activities_integrity_101",
      "type": "c",
      "definition": "CHECK ((ends_at > starts_at))"
    },
    {
      "table_name": "coop_activities",
      "name": "coop_activities_integrity_102",
      "type": "c",
      "definition": "CHECK (((timezone)::text = 'Asia/Bangkok'::text))"
    },
    {
      "table_name": "coop_activities",
      "name": "coop_activities_integrity_103",
      "type": "c",
      "definition": "CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'canceled'::character varying])::text[])))"
    },
    {
      "table_name": "coop_activities",
      "name": "coop_activities_integrity_104",
      "type": "c",
      "definition": "CHECK ((version > 0))"
    },
    {
      "table_name": "coop_activities",
      "name": "coop_activities_integrity_105",
      "type": "c",
      "definition": "CHECK ((((status)::text <> 'published'::text) OR (published_at IS NOT NULL)))"
    },
    {
      "table_name": "coop_activities",
      "name": "coop_activities_integrity_106",
      "type": "c",
      "definition": "CHECK ((((status)::text <> 'draft'::text) OR (published_at IS NULL)))"
    },
    {
      "table_name": "coop_activity_history",
      "name": "coop_activity_history_integrity_107",
      "type": "c",
      "definition": "CHECK ((version > 0))"
    },
    {
      "table_name": "coop_activity_history",
      "name": "coop_activity_history_integrity_108",
      "type": "c",
      "definition": "CHECK (((action)::text = ANY ((ARRAY['created'::character varying, 'updated'::character varying, 'canceled'::character varying])::text[])))"
    }
  ],
  "functions": [
    {
      "name": "fitm_company_response_cooperation_check",
      "definition": "CREATE OR REPLACE FUNCTION public.fitm_company_response_cooperation_check()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n      BEGIN\n        IF NOT EXISTS (SELECT 1 FROM coop_documents d JOIN coop_document_revisions r ON r.coop_document_id=d.id\n          WHERE d.id=NEW.cooperation_document_id AND d.coop_request_id=NEW.coop_request_id\n          AND d.document_type='cooperation' AND r.version=NEW.cooperation_version AND r.status='generated')\n        THEN RAISE EXCEPTION 'Company response requires a generated cooperation revision for the same request'; END IF;\n        RETURN NEW;\n      END; $function$\n"
    },
    {
      "name": "fitm_company_response_history_immutable",
      "definition": "CREATE OR REPLACE FUNCTION public.fitm_company_response_history_immutable()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n      BEGIN RAISE EXCEPTION 'Company response history is immutable'; END; $function$\n"
    },
    {
      "name": "internship_log_guard",
      "definition": "CREATE OR REPLACE FUNCTION public.internship_log_guard()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n      DECLARE owner_id uuid; day date;\n      BEGIN\n        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Internship logs cannot be deleted'; END IF;\n        owner_id := NEW.student_id; day := NEW.log_date;\n        IF TG_OP='UPDATE' AND (NEW.student_id<>OLD.student_id OR NEW.log_date<>OLD.log_date) THEN RAISE EXCEPTION 'Log identity is immutable'; END IF;\n        IF EXISTS(SELECT 1 FROM internship_weeks WHERE student_id=owner_id AND day BETWEEN week_start AND week_end AND status IN ('submitted','reviewed')) THEN RAISE EXCEPTION 'Submitted logs are frozen'; END IF;\n        RETURN NEW;\n      END $function$\n"
    },
    {
      "name": "internship_history_guard",
      "definition": "CREATE OR REPLACE FUNCTION public.internship_history_guard()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$ BEGIN RAISE EXCEPTION 'Internship history is immutable'; END $function$\n"
    },
    {
      "name": "internship_week_guard",
      "definition": "CREATE OR REPLACE FUNCTION public.internship_week_guard()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$ BEGIN\n        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Weekly submissions cannot be deleted'; END IF;\n        IF NEW.student_id<>OLD.student_id OR NEW.week_start<>OLD.week_start OR NEW.week_end<>OLD.week_end OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Invalid weekly identity/version'; END IF;\n        IF NOT ((OLD.status='submitted' AND NEW.status IN ('reviewed','revision_requested') AND NEW.snapshot=OLD.snapshot AND NEW.mentor_id=OLD.mentor_id AND NEW.submitted_at=OLD.submitted_at) OR (OLD.status='revision_requested' AND NEW.status='submitted')) THEN RAISE EXCEPTION 'Invalid weekly transition'; END IF;\n        RETURN NEW;\n      END $function$\n"
    },
    {
      "name": "supervision_history_guard",
      "definition": "CREATE OR REPLACE FUNCTION public.supervision_history_guard()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n      BEGIN RAISE EXCEPTION 'Supervision history is immutable'; END $function$\n"
    },
    {
      "name": "supervision_appointment_guard",
      "definition": "CREATE OR REPLACE FUNCTION public.supervision_appointment_guard()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n      BEGIN\n        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Supervision appointment history is protected'; END IF;\n        IF (NEW.id,NEW.student_id,NEW.request_id,NEW.teacher_id,NEW.mentor_id,NEW.visit_number,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.student_id,OLD.request_id,OLD.teacher_id,OLD.mentor_id,OLD.visit_number,OLD.created_at) OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Invalid supervision identity/version'; END IF;\n        IF NEW.status='confirmed' AND (OLD.status<>'pending_confirmation' OR NEW.scheduled_at<>OLD.scheduled_at OR NEW.snapshot<>OLD.snapshot OR NEW.notes<>OLD.notes) THEN RAISE EXCEPTION 'Invalid supervision confirmation'; END IF;\n        RETURN NEW;\n      END $function$\n"
    },
    {
      "name": "supervision_result_guard",
      "definition": "CREATE OR REPLACE FUNCTION public.supervision_result_guard()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n      DECLARE appointment supervision_appointments;\n      BEGIN\n        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Supervision result history is protected'; END IF;\n        SELECT * INTO appointment FROM supervision_appointments WHERE id=NEW.appointment_id FOR UPDATE;\n        IF appointment.status<>'confirmed' OR appointment.version<>NEW.appointment_version OR appointment.teacher_id<>NEW.author_id OR NEW.snapshot->'appointment' IS DISTINCT FROM to_jsonb(appointment) THEN RAISE EXCEPTION 'Invalid result appointment identity'; END IF;\n        IF TG_OP='UPDATE' THEN\n          IF OLD.status='completed' OR (NEW.id,NEW.appointment_id,NEW.appointment_version,NEW.author_id,NEW.snapshot,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.appointment_id,OLD.appointment_version,OLD.author_id,OLD.snapshot,OLD.created_at) OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Invalid result identity/version or completed result'; END IF;\n        ELSIF NEW.version<>1 THEN RAISE EXCEPTION 'Invalid initial result version'; END IF;\n        RETURN NEW;\n      END $function$\n"
    },
    {
      "name": "supervision_result_appointment_guard",
      "definition": "CREATE OR REPLACE FUNCTION public.supervision_result_appointment_guard()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n      BEGIN\n        IF EXISTS(SELECT 1 FROM supervision_results WHERE appointment_id=OLD.id) THEN RAISE EXCEPTION 'Appointment has a protected supervision result'; END IF;\n        RETURN NEW;\n      END $function$\n"
    },
    {
      "name": "coop_activity_history_guard",
      "definition": "CREATE OR REPLACE FUNCTION public.coop_activity_history_guard()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n      BEGIN RAISE EXCEPTION 'Activity history is immutable'; END $function$\n"
    },
    {
      "name": "coop_activity_guard",
      "definition": "CREATE OR REPLACE FUNCTION public.coop_activity_guard()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n      BEGIN\n        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Activity history is protected'; END IF;\n        IF OLD.status='canceled' OR NEW.version<>OLD.version+1 OR\n          (NEW.id,NEW.created_by,NEW.creation_key,NEW.creation_hash,NEW.created_at) IS DISTINCT FROM\n          (OLD.id,OLD.created_by,OLD.creation_key,OLD.creation_hash,OLD.created_at) OR\n          (OLD.published_at IS NOT NULL AND NEW.published_at IS DISTINCT FROM OLD.published_at)\n          THEN RAISE EXCEPTION 'Invalid activity transition'; END IF;\n        RETURN NEW;\n      END $function$\n"
    }
  ],
  "triggers": [
    {
      "table_name": "company_responses",
      "name": "company_response_cooperation_check",
      "definition": "CREATE TRIGGER company_response_cooperation_check BEFORE INSERT OR UPDATE ON public.company_responses FOR EACH ROW EXECUTE FUNCTION fitm_company_response_cooperation_check()"
    },
    {
      "table_name": "company_response_history",
      "name": "company_response_history_immutable",
      "definition": "CREATE TRIGGER company_response_history_immutable BEFORE DELETE OR UPDATE ON public.company_response_history FOR EACH ROW EXECUTE FUNCTION fitm_company_response_history_immutable()"
    },
    {
      "table_name": "internship_daily_logs",
      "name": "internship_log_freeze",
      "definition": "CREATE TRIGGER internship_log_freeze BEFORE INSERT OR DELETE OR UPDATE ON public.internship_daily_logs FOR EACH ROW EXECUTE FUNCTION internship_log_guard()"
    },
    {
      "table_name": "internship_weeks",
      "name": "internship_week_transition",
      "definition": "CREATE TRIGGER internship_week_transition BEFORE DELETE OR UPDATE ON public.internship_weeks FOR EACH ROW EXECUTE FUNCTION internship_week_guard()"
    },
    {
      "table_name": "internship_week_events",
      "name": "internship_history_immutable",
      "definition": "CREATE TRIGGER internship_history_immutable BEFORE DELETE OR UPDATE ON public.internship_week_events FOR EACH ROW EXECUTE FUNCTION internship_history_guard()"
    },
    {
      "table_name": "supervision_events",
      "name": "supervision_history_immutable",
      "definition": "CREATE TRIGGER supervision_history_immutable BEFORE DELETE OR UPDATE ON public.supervision_events FOR EACH ROW EXECUTE FUNCTION supervision_history_guard()"
    },
    {
      "table_name": "supervision_appointments",
      "name": "supervision_appointment_transition",
      "definition": "CREATE TRIGGER supervision_appointment_transition BEFORE DELETE OR UPDATE ON public.supervision_appointments FOR EACH ROW EXECUTE FUNCTION supervision_appointment_guard()"
    },
    {
      "table_name": "supervision_result_revisions",
      "name": "supervision_result_history_immutable",
      "definition": "CREATE TRIGGER supervision_result_history_immutable BEFORE DELETE OR UPDATE ON public.supervision_result_revisions FOR EACH ROW EXECUTE FUNCTION supervision_history_guard()"
    },
    {
      "table_name": "supervision_images",
      "name": "supervision_images_immutable",
      "definition": "CREATE TRIGGER supervision_images_immutable BEFORE DELETE OR UPDATE ON public.supervision_images FOR EACH ROW EXECUTE FUNCTION supervision_history_guard()"
    },
    {
      "table_name": "supervision_results",
      "name": "supervision_result_transition",
      "definition": "CREATE TRIGGER supervision_result_transition BEFORE INSERT OR DELETE OR UPDATE ON public.supervision_results FOR EACH ROW EXECUTE FUNCTION supervision_result_guard()"
    },
    {
      "table_name": "supervision_appointments",
      "name": "supervision_result_appointment_lock",
      "definition": "CREATE TRIGGER supervision_result_appointment_lock BEFORE UPDATE ON public.supervision_appointments FOR EACH ROW EXECUTE FUNCTION supervision_result_appointment_guard()"
    },
    {
      "table_name": "coop_activity_history",
      "name": "coop_activity_history_immutable",
      "definition": "CREATE TRIGGER coop_activity_history_immutable BEFORE DELETE OR UPDATE ON public.coop_activity_history FOR EACH ROW EXECUTE FUNCTION coop_activity_history_guard()"
    },
    {
      "table_name": "coop_activities",
      "name": "coop_activity_transition",
      "definition": "CREATE TRIGGER coop_activity_transition BEFORE DELETE OR UPDATE ON public.coop_activities FOR EACH ROW EXECUTE FUNCTION coop_activity_guard()"
    }
  ]
};
