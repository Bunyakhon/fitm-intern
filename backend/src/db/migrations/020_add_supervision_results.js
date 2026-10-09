async function up({ context: q }) {
  await q.sequelize.transaction(async transaction => {
    await q.sequelize.query(`
      CREATE TABLE supervision_images (
        id uuid PRIMARY KEY, appointment_id uuid NOT NULL REFERENCES supervision_appointments(id) ON DELETE RESTRICT,
        original_name varchar(255) NOT NULL, storage_path text NOT NULL UNIQUE,
        mime_type varchar(32) NOT NULL CHECK(mime_type IN ('image/png','image/jpeg')),
        file_size integer NOT NULL CHECK(file_size BETWEEN 1 AND 5242880),
        created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,appointment_id)
      );
      CREATE TABLE supervision_results (
        id uuid PRIMARY KEY, appointment_id uuid NOT NULL UNIQUE REFERENCES supervision_appointments(id) ON DELETE RESTRICT,
        appointment_version integer NOT NULL CHECK(appointment_version>0),
        author_id uuid NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
        status varchar(16) NOT NULL CHECK(status IN ('draft','completed')), version integer NOT NULL CHECK(version>0),
        visited_on date, summary text NOT NULL DEFAULT '' CHECK(length(summary)<=5000),
        issues text NOT NULL DEFAULT '' CHECK(length(issues)<=5000), recommendations text NOT NULL DEFAULT '' CHECK(length(recommendations)<=5000),
        image_1_id uuid, image_2_id uuid, snapshot jsonb NOT NULL,
        completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        FOREIGN KEY(image_1_id,appointment_id) REFERENCES supervision_images(id,appointment_id) ON DELETE RESTRICT,
        FOREIGN KEY(image_2_id,appointment_id) REFERENCES supervision_images(id,appointment_id) ON DELETE RESTRICT,
        CHECK(image_1_id IS NULL OR image_2_id IS NULL OR image_1_id<>image_2_id),
        CHECK((status='completed')=(completed_at IS NOT NULL)),
        CHECK(status<>'completed' OR (image_1_id IS NOT NULL AND image_2_id IS NOT NULL AND visited_on IS NOT NULL AND length(trim(summary))>0))
      );
      CREATE TABLE supervision_result_revisions (
        id uuid PRIMARY KEY, result_id uuid NOT NULL REFERENCES supervision_results(id) ON DELETE RESTRICT,
        version integer NOT NULL CHECK(version>0), actor_id uuid NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
        actor_name varchar(512) NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(result_id,version)
      );
      CREATE TRIGGER supervision_result_history_immutable BEFORE UPDATE OR DELETE ON supervision_result_revisions FOR EACH ROW EXECUTE FUNCTION supervision_history_guard();
      CREATE TRIGGER supervision_images_immutable BEFORE UPDATE OR DELETE ON supervision_images FOR EACH ROW EXECUTE FUNCTION supervision_history_guard();
      CREATE FUNCTION supervision_result_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE appointment supervision_appointments;
      BEGIN
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Supervision result history is protected'; END IF;
        SELECT * INTO appointment FROM supervision_appointments WHERE id=NEW.appointment_id FOR UPDATE;
        IF appointment.status<>'confirmed' OR appointment.version<>NEW.appointment_version OR appointment.teacher_id<>NEW.author_id OR NEW.snapshot->'appointment' IS DISTINCT FROM to_jsonb(appointment) THEN RAISE EXCEPTION 'Invalid result appointment identity'; END IF;
        IF TG_OP='UPDATE' THEN
          IF OLD.status='completed' OR (NEW.id,NEW.appointment_id,NEW.appointment_version,NEW.author_id,NEW.snapshot,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.appointment_id,OLD.appointment_version,OLD.author_id,OLD.snapshot,OLD.created_at) OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Invalid result identity/version or completed result'; END IF;
        ELSIF NEW.version<>1 THEN RAISE EXCEPTION 'Invalid initial result version'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER supervision_result_transition BEFORE INSERT OR UPDATE OR DELETE ON supervision_results FOR EACH ROW EXECUTE FUNCTION supervision_result_guard();
      CREATE FUNCTION supervision_result_appointment_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS(SELECT 1 FROM supervision_results WHERE appointment_id=OLD.id) THEN RAISE EXCEPTION 'Appointment has a protected supervision result'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER supervision_result_appointment_lock BEFORE UPDATE ON supervision_appointments FOR EACH ROW EXECUTE FUNCTION supervision_result_appointment_guard();
    `, { transaction });
  });
}
async function down({ context: q }) {
  await q.sequelize.transaction(async transaction => {
    const [[row]] = await q.sequelize.query('SELECT (SELECT count(*) FROM supervision_results)+(SELECT count(*) FROM supervision_images)+(SELECT count(*) FROM supervision_result_revisions) AS count', { transaction });
    if (Number(row.count)) throw Error('Supervision results populated rollback refused');
    await q.sequelize.query('DROP TRIGGER supervision_result_appointment_lock ON supervision_appointments; DROP TABLE supervision_result_revisions, supervision_results, supervision_images; DROP FUNCTION supervision_result_guard(), supervision_result_appointment_guard();', { transaction });
  });
}
exports.up = up;
exports.down = down;
