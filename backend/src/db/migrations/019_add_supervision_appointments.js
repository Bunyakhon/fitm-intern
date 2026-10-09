async function up({ context: q }) {
  await q.sequelize.transaction(async transaction => {
    await q.sequelize.query(`
      CREATE TABLE supervision_appointments (
        id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
        request_id uuid NOT NULL, teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
        mentor_id uuid NOT NULL REFERENCES mentors(id) ON DELETE RESTRICT,
        visit_number smallint NOT NULL CHECK (visit_number IN (1,2)),
        scheduled_at timestamptz NOT NULL, timezone varchar(32) NOT NULL DEFAULT 'Asia/Bangkok' CHECK (timezone='Asia/Bangkok'),
        status varchar(32) NOT NULL CHECK (status IN ('pending_confirmation','confirmed')),
        version integer NOT NULL CHECK (version>0), snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
        notes text NOT NULL DEFAULT '', confirmed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(request_id,visit_number), CHECK ((status='confirmed')=(confirmed_at IS NOT NULL))
      );
      CREATE UNIQUE INDEX supervision_request_owner ON coop_requests(id,student_id);
      ALTER TABLE supervision_appointments ADD CONSTRAINT supervision_request_owner_fk FOREIGN KEY(request_id,student_id) REFERENCES coop_requests(id,student_id) ON DELETE RESTRICT;
      CREATE UNIQUE INDEX supervision_mentor_owner ON mentors(id,student_id);
      ALTER TABLE supervision_appointments ADD CONSTRAINT supervision_mentor_owner_fk FOREIGN KEY(mentor_id,student_id) REFERENCES mentors(id,student_id) ON DELETE RESTRICT;
      CREATE INDEX supervision_student_date ON supervision_appointments(student_id,scheduled_at);
      CREATE TABLE supervision_events (
        id uuid PRIMARY KEY, appointment_id uuid NOT NULL REFERENCES supervision_appointments(id) ON DELETE RESTRICT,
        version integer NOT NULL CHECK(version>0), action varchar(32) NOT NULL CHECK(action IN ('scheduled','rescheduled','confirmed')),
        actor_name varchar(512) NOT NULL, teacher_id uuid REFERENCES teachers(id) ON DELETE RESTRICT,
        reason text NOT NULL DEFAULT '', snapshot jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(appointment_id,version)
      );
      CREATE TABLE supervision_tokens (
        id uuid PRIMARY KEY, appointment_id uuid NOT NULL REFERENCES supervision_appointments(id) ON DELETE CASCADE,
        version integer NOT NULL CHECK(version>0), token_hash char(64) NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL, revoked_at timestamptz, consumed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX supervision_one_live_token ON supervision_tokens(appointment_id) WHERE revoked_at IS NULL AND consumed_at IS NULL;
      CREATE FUNCTION supervision_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Supervision history is immutable'; END $$;
      CREATE TRIGGER supervision_history_immutable BEFORE UPDATE OR DELETE ON supervision_events FOR EACH ROW EXECUTE FUNCTION supervision_history_guard();
      CREATE FUNCTION supervision_appointment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Supervision appointment history is protected'; END IF;
        IF (NEW.id,NEW.student_id,NEW.request_id,NEW.teacher_id,NEW.mentor_id,NEW.visit_number,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.student_id,OLD.request_id,OLD.teacher_id,OLD.mentor_id,OLD.visit_number,OLD.created_at) OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Invalid supervision identity/version'; END IF;
        IF NEW.status='confirmed' AND (OLD.status<>'pending_confirmation' OR NEW.scheduled_at<>OLD.scheduled_at OR NEW.snapshot<>OLD.snapshot OR NEW.notes<>OLD.notes) THEN RAISE EXCEPTION 'Invalid supervision confirmation'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER supervision_appointment_transition BEFORE UPDATE OR DELETE ON supervision_appointments FOR EACH ROW EXECUTE FUNCTION supervision_appointment_guard();
    `, { transaction });
  });
}
async function down({ context: q }) {
  await q.sequelize.transaction(async transaction => {
    const [[row]] = await q.sequelize.query('SELECT (SELECT count(*) FROM supervision_appointments)+(SELECT count(*) FROM supervision_events)+(SELECT count(*) FROM supervision_tokens) AS count', { transaction });
    if (Number(row.count)) throw Error('Supervision populated rollback refused');
    await q.sequelize.query('DROP TABLE supervision_tokens, supervision_events, supervision_appointments; DROP INDEX supervision_request_owner, supervision_mentor_owner; DROP FUNCTION supervision_history_guard(), supervision_appointment_guard();', { transaction });
  });
}
exports.up = up;
exports.down = down;
