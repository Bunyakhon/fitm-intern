const { UPDATE_STATUSES } = require('../services/coopAcademic.rules');
const LEGACY_SNAPSHOT_GRADE_CHECK = "CHECK (((((status)::text = 'passed'::text) AND (grade IS NOT NULL) AND (length(TRIM(BOTH FROM grade)) > 0)) OR (((status)::text = ANY (ARRAY[('studying'::character varying)::text, ('unselected'::character varying)::text])) AND (grade IS NULL))))";
// Widen the old contract; do not reinterpret old F/free-text passed snapshots.
const SNAPSHOT_GRADE_CHECK = 'CHECK (' + LEGACY_SNAPSHOT_GRADE_CHECK.slice('CHECK ('.length, -1) + " OR (status='failed' AND grade IS NOT NULL AND grade='F'))";
const immutableBody = "BEGIN RAISE EXCEPTION 'Submitted course snapshots and academic history are immutable' USING ERRCODE='23514'; END";
const revisionBody = "BEGIN IF NEW.coop_request_id IS DISTINCT FROM OLD.coop_request_id OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.revision <> OLD.revision+1 THEN RAISE EXCEPTION 'Academic revision must advance once' USING ERRCODE='23514'; END IF; RETURN NEW; END";
const historyBody = `DECLARE original record; head_revision integer; previous_revision integer;
BEGIN
  SELECT s.coop_request_id, s.course_code, s.status, s.grade, r.student_id, r.status::text AS request_status, r.document_issued_at, r.started_at
  INTO original FROM public.coop_request_prerequisite_courses s JOIN public.coop_requests r ON r.id=s.coop_request_id WHERE s.id=NEW.prerequisite_course_id;
  IF NOT FOUND OR original.coop_request_id IS DISTINCT FROM NEW.coop_request_id OR original.course_code IS DISTINCT FROM NEW.course_code
    OR original.student_id IS DISTINCT FROM NEW.actor_student_id OR original.status <> 'studying' OR original.grade IS NOT NULL
    OR original.request_status IS DISTINCT FROM NEW.request_status_at_change OR original.request_status NOT IN (${UPDATE_STATUSES.map(s => "'" + s + "'").join(',')})
    OR original.document_issued_at IS NOT NULL OR original.started_at IS NOT NULL THEN
    RAISE EXCEPTION 'Academic event must belong to an editable submitted course and its student' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM public.coop_request_academic_history WHERE coop_request_id=NEW.coop_request_id AND course_code=NEW.course_code) THEN
    RAISE EXCEPTION 'This studying course already has a reported grade' USING ERRCODE='23514';
  END IF;
  SELECT revision INTO head_revision FROM public.coop_request_academic_states WHERE coop_request_id=NEW.coop_request_id;
  SELECT COALESCE(max(revision),0) INTO previous_revision FROM public.coop_request_academic_history WHERE coop_request_id=NEW.coop_request_id;
  IF head_revision IS NULL OR head_revision <> NEW.revision OR NEW.revision <> previous_revision+1 THEN
    RAISE EXCEPTION 'Academic event revision does not match its state' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END`;
const functionSpecs = [
  { name: 'coop_academic_immutable', body: immutableBody },
  { name: 'coop_academic_revision_guard', body: revisionBody },
  { name: 'coop_academic_history_insert_guard', body: historyBody },
];
// Recognize only the exact earlier Academic definition when tightening the
// user-approved window. Unknown function drift still fails closed.
const previousFunctionSpecs = [{ name: 'coop_academic_history_insert_guard', body: historyBody.replace(
  "NOT IN ('advisor_review','department_head_review','approved')",
  "NOT IN ('submitted','staff_review','advisor_review','department_head_review','approved')") }];
const triggerSpecs = [
  { table_name: 'coop_request_prerequisite_courses', name: 'coop_academic_snapshot_immutable', function_name: 'coop_academic_immutable', events: 'UPDATE OR DELETE', type: 27 },
  { table_name: 'coop_request_academic_history', name: 'coop_academic_history_immutable', function_name: 'coop_academic_immutable', events: 'UPDATE OR DELETE', type: 27 },
  { table_name: 'coop_request_academic_history', name: 'coop_academic_history_insert', function_name: 'coop_academic_history_insert_guard', events: 'INSERT', type: 7 },
  { table_name: 'coop_request_academic_states', name: 'coop_academic_revision_update', function_name: 'coop_academic_revision_guard', events: 'UPDATE', type: 19 },
];
const constraints = [
  { table_name: 'coop_request_academic_states', name: 'coop_academic_revision_check', type: 'c', definition: 'CHECK (revision >= 1)', key_count: 1 },
  { table_name: 'coop_request_academic_history', name: 'coop_academic_history_values_check', type: 'c', definition:
    "CHECK (revision >= 1 AND course_code ~ '^[0-9]{9}$' AND old_status='studying' AND old_grade IS NULL AND ((new_status='passed' AND new_grade IN ('A','B+','B','C+','C','D+','D')) OR (new_status='failed' AND new_grade='F')))" },
];
const functions = functionSpecs.map(f => ({ name: f.name, definition: `CREATE OR REPLACE FUNCTION public.${f.name}() RETURNS trigger LANGUAGE plpgsql AS $academic$${f.body}$academic$` }));
const triggers = triggerSpecs.map(t => ({ table_name: t.table_name, name: t.name, definition: `CREATE TRIGGER ${t.name} BEFORE ${t.events} ON public.${t.table_name} FOR EACH ROW EXECUTE FUNCTION public.${t.function_name}()` }));
module.exports = { SNAPSHOT_GRADE_CHECK, LEGACY_SNAPSHOT_GRADE_CHECK, constraints, functions, triggers, functionSpecs, previousFunctionSpecs, triggerSpecs };
