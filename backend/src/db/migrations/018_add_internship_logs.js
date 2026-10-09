async function up({ context: q }) {
  await q.sequelize.transaction(async transaction => {
    await q.sequelize.query(`
      CREATE TABLE internship_daily_logs (
        id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
        log_date date NOT NULL, kind text NOT NULL CHECK(kind IN ('working','non_working')),
        assigned_work text NOT NULL DEFAULT '', work_result text NOT NULL DEFAULT '', problems text NOT NULL DEFAULT '', solutions text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '', non_working_reason text NOT NULL DEFAULT '',
        version integer NOT NULL CHECK(version > 0), created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
        UNIQUE(student_id,log_date),
        CHECK (length(assigned_work)<=5000 AND length(work_result)<=5000 AND length(problems)<=5000 AND length(solutions)<=5000 AND length(notes)<=5000 AND length(non_working_reason)<=5000),
        CHECK ((kind='working' AND btrim(assigned_work)<>'' AND btrim(work_result)<>'' AND btrim(problems)<>'' AND btrim(solutions)<>'' AND non_working_reason='') OR (kind='non_working' AND btrim(non_working_reason)<>'' AND assigned_work='' AND work_result='' AND problems='' AND solutions=''))
      );
      CREATE TABLE internship_weeks (
        id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
        mentor_id uuid NOT NULL REFERENCES mentors(id) ON DELETE RESTRICT,
        week_start date NOT NULL CHECK(extract(isodow FROM week_start)=1), week_end date NOT NULL CHECK(week_end=week_start+6),
        status text NOT NULL CHECK(status IN ('submitted','reviewed','revision_requested')),
        version integer NOT NULL CHECK(version>0), snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
        submitted_at timestamptz NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, UNIQUE(student_id,week_start)
      );
      CREATE TABLE internship_week_events (
        id uuid PRIMARY KEY, week_id uuid NOT NULL REFERENCES internship_weeks(id) ON DELETE RESTRICT,
        version integer NOT NULL CHECK(version>0), action text NOT NULL CHECK(action IN ('submitted','reviewed','revision_requested')),
        mentor_id uuid REFERENCES mentors(id) ON DELETE RESTRICT, mentor_name text, feedback text NOT NULL DEFAULT '' CHECK(length(feedback)<=5000),
        snapshot jsonb NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, UNIQUE(week_id,version),
        CHECK((action='submitted' AND mentor_id IS NULL) OR (action<>'submitted' AND mentor_id IS NOT NULL AND btrim(mentor_name)<>'')),
        CHECK(action<>'revision_requested' OR btrim(feedback)<>'')
      );
      CREATE TABLE internship_review_tokens (
        id uuid PRIMARY KEY, mentor_id uuid NOT NULL REFERENCES mentors(id) ON DELETE CASCADE, student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        token_hash text NOT NULL UNIQUE, verified_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
        created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
      );
      CREATE FUNCTION internship_log_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE owner_id uuid; day date;
      BEGIN
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Internship logs cannot be deleted'; END IF;
        owner_id := NEW.student_id; day := NEW.log_date;
        IF TG_OP='UPDATE' AND (NEW.student_id<>OLD.student_id OR NEW.log_date<>OLD.log_date) THEN RAISE EXCEPTION 'Log identity is immutable'; END IF;
        IF EXISTS(SELECT 1 FROM internship_weeks WHERE student_id=owner_id AND day BETWEEN week_start AND week_end AND status IN ('submitted','reviewed')) THEN RAISE EXCEPTION 'Submitted logs are frozen'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER internship_log_freeze BEFORE INSERT OR UPDATE OR DELETE ON internship_daily_logs FOR EACH ROW EXECUTE FUNCTION internship_log_guard();
      CREATE FUNCTION internship_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Internship history is immutable'; END $$;
      CREATE TRIGGER internship_history_immutable BEFORE UPDATE OR DELETE ON internship_week_events FOR EACH ROW EXECUTE FUNCTION internship_history_guard();
      CREATE FUNCTION internship_week_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Weekly submissions cannot be deleted'; END IF;
        IF NEW.student_id<>OLD.student_id OR NEW.week_start<>OLD.week_start OR NEW.week_end<>OLD.week_end OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Invalid weekly identity/version'; END IF;
        IF NOT ((OLD.status='submitted' AND NEW.status IN ('reviewed','revision_requested') AND NEW.snapshot=OLD.snapshot AND NEW.mentor_id=OLD.mentor_id AND NEW.submitted_at=OLD.submitted_at) OR (OLD.status='revision_requested' AND NEW.status='submitted')) THEN RAISE EXCEPTION 'Invalid weekly transition'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER internship_week_transition BEFORE UPDATE OR DELETE ON internship_weeks FOR EACH ROW EXECUTE FUNCTION internship_week_guard();
    `, { transaction });
  });
}
async function down({ context: q }) {
  await q.sequelize.transaction(async transaction => {
    const [rows] = await q.sequelize.query('SELECT (SELECT count(*) FROM internship_daily_logs)+(SELECT count(*) FROM internship_weeks)+(SELECT count(*) FROM internship_review_tokens) AS count', { transaction });
    if (Number(rows[0].count)) throw new Error('Refusing to remove populated internship log tables');
    await q.sequelize.query('DROP TABLE internship_review_tokens, internship_week_events, internship_weeks, internship_daily_logs; DROP FUNCTION internship_log_guard(), internship_history_guard(), internship_week_guard();', { transaction });
  });
}
exports.up = up;
exports.down = down;
