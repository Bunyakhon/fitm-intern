// Explicit, additive Development upgrade for Teacher Search. No startup hook,
// migration framework, sync/alter, backfill, reset, or existing-row UPDATE.
const { QueryTypes } = require('sequelize');
const CHECK = 'CHECK (academic_year BETWEEN 1 AND 9999 AND semester IN (1,2))';

async function periodSchemaState(sequelize, transaction) {
  const rows = await sequelize.query(`SELECT table_name,column_name,data_type,is_nullable
    FROM information_schema.columns WHERE table_schema='public' AND
    (table_name='coop_academic_periods' OR
      (table_name IN ('coop_requests','coop_project_advisor_requests') AND column_name='academic_period_id'))`,
  { type: QueryTypes.SELECT, transaction });
  if (!rows.length) return 'ABSENT';
  const expected = [['coop_academic_periods','id','uuid','NO'], ['coop_academic_periods','academic_year','integer','NO'],
    ['coop_academic_periods','semester','integer','NO'], ['coop_requests','academic_period_id','uuid','YES'],
    ['coop_project_advisor_requests','academic_period_id','uuid','YES']];
  if (rows.length !== expected.length || expected.some(([table, column, type, nullable]) => !rows.some(row =>
    row.table_name === table && row.column_name === column && row.data_type === type && row.is_nullable === nullable))) {
    throw new Error('ACADEMIC_PERIOD_SCHEMA_PARTIAL_OR_DIFFERENT_STOP');
  }
  const constraints = await sequelize.query(`SELECT conname,contype,convalidated,confrelid::regclass::text target,
    confdeltype,confupdtype,conrelid::regclass::text source,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE
    connamespace='public'::regnamespace AND
    conname IN ('coop_academic_periods_pkey','coop_academic_periods_values','coop_requests_academic_period_id_fkey','coop_project_advisor_requests_academic_period_id_fkey')`,
  { type: QueryTypes.SELECT, transaction });
  const expectedConstraints = {
    coop_academic_periods_pkey: ['coop_academic_periods', 'PRIMARY KEY (id)'],
    coop_academic_periods_values: ['coop_academic_periods', 'CHECK ((((academic_year >= 1) AND (academic_year <= 9999)) AND (semester = ANY (ARRAY[1, 2]))))'],
    coop_requests_academic_period_id_fkey: ['coop_requests', 'FOREIGN KEY (academic_period_id) REFERENCES coop_academic_periods(id) ON UPDATE CASCADE ON DELETE RESTRICT'],
    coop_project_advisor_requests_academic_period_id_fkey: ['coop_project_advisor_requests', 'FOREIGN KEY (academic_period_id) REFERENCES coop_academic_periods(id) ON UPDATE CASCADE ON DELETE RESTRICT'],
  };
  if (constraints.length !== 4 || constraints.some(c => !c.convalidated
    || c.source !== expectedConstraints[c.conname][0] || c.definition !== expectedConstraints[c.conname][1])) throw new Error('ACADEMIC_PERIOD_CONSTRAINTS_DIFFER_STOP');
  const indexes = await sequelize.query(`SELECT c.relname name,i.indisvalid,i.indisready,pg_get_indexdef(i.indexrelid) definition
    FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN
    ('coop_academic_periods_year_semester','coop_requests_student_period','advisor_requests_teacher_period_status')`, { type: QueryTypes.SELECT, transaction });
  const expectedIndexes = {
    coop_academic_periods_year_semester: 'CREATE UNIQUE INDEX coop_academic_periods_year_semester ON public.coop_academic_periods USING btree (academic_year, semester)',
    coop_requests_student_period: 'CREATE INDEX coop_requests_student_period ON public.coop_requests USING btree (student_id, academic_period_id)',
    advisor_requests_teacher_period_status: 'CREATE INDEX advisor_requests_teacher_period_status ON public.coop_project_advisor_requests USING btree (requested_advisor_teacher_id, academic_period_id, status)',
  };
  if (indexes.length !== 3 || indexes.some(index => !index.indisvalid || !index.indisready
    || index.definition !== expectedIndexes[index.name])) throw new Error('ACADEMIC_PERIOD_INDEXES_DIFFER_STOP');
  return 'PRESENT';
}

async function applyAcademicPeriodSchema(sequelize, transaction) {
  const state = await periodSchemaState(sequelize, transaction);
  if (state === 'PRESENT') return { schema: 'ALREADY_PRESENT', existing_rows_updated: 0 };
  await sequelize.query(`CREATE TABLE public.coop_academic_periods (
    id uuid PRIMARY KEY, academic_year integer NOT NULL, semester integer NOT NULL,
    CONSTRAINT coop_academic_periods_values ${CHECK})`, { transaction });
  await sequelize.query('CREATE UNIQUE INDEX coop_academic_periods_year_semester ON public.coop_academic_periods (academic_year,semester)', { transaction });
  for (const table of ['coop_requests', 'coop_project_advisor_requests']) {
    await sequelize.query(`ALTER TABLE public.${table} ADD COLUMN academic_period_id uuid NULL
      REFERENCES public.coop_academic_periods(id) ON UPDATE CASCADE ON DELETE RESTRICT`, { transaction });
  }
  await sequelize.query('CREATE INDEX coop_requests_student_period ON public.coop_requests (student_id,academic_period_id)', { transaction });
  await sequelize.query('CREATE INDEX advisor_requests_teacher_period_status ON public.coop_project_advisor_requests (requested_advisor_teacher_id,academic_period_id,status)', { transaction });
  return { schema: 'ADDITIVE_APPLIED', existing_rows_updated: 0 };
}
module.exports = { periodSchemaState, applyAcademicPeriodSchema };
