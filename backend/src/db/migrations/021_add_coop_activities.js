async function up({ context: q }) {
  await q.sequelize.transaction(async transaction => {
    await q.sequelize.query(`
      CREATE TABLE coop_activities (
        id uuid PRIMARY KEY, title varchar(200) NOT NULL CHECK(length(trim(title))>0),
        description text NOT NULL DEFAULT '', category varchar(32) NOT NULL CHECK(category IN ('orientation','training','presentation','other')),
        starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),
        timezone varchar(32) NOT NULL DEFAULT 'Asia/Bangkok' CHECK(timezone='Asia/Bangkok'),
        location varchar(500) NOT NULL DEFAULT '', meeting_url varchar(1000) NOT NULL DEFAULT '',
        internal_notes text NOT NULL DEFAULT '', status varchar(16) NOT NULL CHECK(status IN ('draft','published','canceled')),
        published_at timestamptz, version integer NOT NULL CHECK(version>0),
        created_by uuid NOT NULL REFERENCES department_staffs(id) ON DELETE RESTRICT,
        updated_by uuid NOT NULL REFERENCES department_staffs(id) ON DELETE RESTRICT,
        creation_key uuid NOT NULL UNIQUE, creation_hash char(64) NOT NULL, duplicate_key char(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK(status<>'published' OR published_at IS NOT NULL), CHECK(status<>'draft' OR published_at IS NULL)
      );
      CREATE UNIQUE INDEX coop_activity_duplicate ON coop_activities(duplicate_key) WHERE status<>'canceled';
      CREATE INDEX coop_activity_dates ON coop_activities(starts_at,ends_at);
      CREATE TABLE coop_activity_history (
        id uuid PRIMARY KEY, activity_id uuid NOT NULL REFERENCES coop_activities(id) ON DELETE RESTRICT,
        version integer NOT NULL CHECK(version>0), action varchar(16) NOT NULL CHECK(action IN ('created','updated','canceled')),
        staff_id uuid NOT NULL REFERENCES department_staffs(id) ON DELETE RESTRICT,
        actor_name varchar(255) NOT NULL, reason text NOT NULL DEFAULT '', snapshot jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(activity_id,version)
      );
      CREATE FUNCTION coop_activity_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Activity history is immutable'; END $$;
      CREATE TRIGGER coop_activity_history_immutable BEFORE UPDATE OR DELETE ON coop_activity_history FOR EACH ROW EXECUTE FUNCTION coop_activity_history_guard();
      CREATE FUNCTION coop_activity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Activity history is protected'; END IF;
        IF OLD.status='canceled' OR NEW.version<>OLD.version+1 OR
          (NEW.id,NEW.created_by,NEW.creation_key,NEW.creation_hash,NEW.created_at) IS DISTINCT FROM
          (OLD.id,OLD.created_by,OLD.creation_key,OLD.creation_hash,OLD.created_at) OR
          (OLD.published_at IS NOT NULL AND NEW.published_at IS DISTINCT FROM OLD.published_at)
          THEN RAISE EXCEPTION 'Invalid activity transition'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER coop_activity_transition BEFORE UPDATE OR DELETE ON coop_activities FOR EACH ROW EXECUTE FUNCTION coop_activity_guard();
    `, { transaction });
  });
}
async function down({ context: q }) {
  await q.sequelize.transaction(async transaction => {
    const [[row]] = await q.sequelize.query('SELECT (SELECT count(*) FROM coop_activities)+(SELECT count(*) FROM coop_activity_history) AS count', { transaction });
    if (Number(row.count)) throw Error('Populated activity rollback refused');
    await q.sequelize.query('DROP TABLE coop_activity_history,coop_activities; DROP FUNCTION coop_activity_history_guard(),coop_activity_guard();', { transaction });
  });
}
module.exports = { up, down };
