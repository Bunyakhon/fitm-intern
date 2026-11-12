// Explicit user-authorized Development execution only. Never imported by app startup.
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomBytes } = require('node:crypto');
const { Sequelize, Op } = require('sequelize');
const ROOT = path.resolve(__dirname, '../../..');
const PRIVATE = path.join(ROOT, '.local-dev-accounts');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(code) { const error = new Error(code); error.publicCode = code; throw error; }
function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function loadConfig(filename) {
  const env = require('dotenv').parse(fs.readFileSync(filename || path.join(__dirname, '../../.env')));
  if (env.NODE_ENV !== 'development' || !['localhost', '127.0.0.1', 'postgres'].includes(env.DB_HOST)
    || Number(env.DB_PORT) !== 5432 || env.DB_NAME !== 'intern_system') fail('LOCAL_DEVELOPMENT_INTERN_SYSTEM_CONFIG_REQUIRED');
  return env;
}
async function liveTarget(client) {
  const { rows: [row] } = await client.query("SELECT current_database() db,current_schema() schema,current_setting('server_version_num')::int version,pg_is_in_recovery() recovery,inet_server_addr()::text address,current_setting('fitm.fixture_disposable',true) disposable");
  if (row.schema !== 'public' || Math.floor(row.version / 10000) !== 16 || row.recovery
    || !/^(127\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|10\.)/.test(row.address || '')) fail('LIVE_DEVELOPMENT_TARGET_REQUIRED');
  return row;
}
function receiptPath(database, teacherId) {
  if (database !== 'intern_system' || !UUID.test(teacherId || '')) fail('DEVELOPMENT_TARGET_AND_TEACHER_ID_REQUIRED');
  return path.join(PRIVATE, `${database}-${teacherId.toLowerCase()}-teacher-demo.json`);
}
function defineModels(sequelize) {
  const models = { sequelize };
  const folder = path.join(__dirname, '../models');
  for (const file of fs.readdirSync(folder).filter(file => file.endsWith('.model.js'))) {
    const model = require(path.join(folder, file))(sequelize); models[model.name] = model;
  }
  require('../models/registerStudentProfileAggregate').registerStudentProfileAggregate(models, sequelize);
  for (const model of Object.values(models)) if (typeof model.associate === 'function') model.associate(models);
  require('../models/schemaIntegrity').registerSchemaIntegrity(sequelize);
  return models;
}
function fingerprint(row) {
  const values = { ...row.get({ plain: true }) };
  // Receipts contain digests only; never persist passwords, hashes or row data.
  delete values.password; delete values.password_hash;
  return digest(values);
}
async function persistedRow(sql, table, id) {
  if (!/^[a-z_]+$/.test(table) || !UUID.test(id || '')) fail('INVALID_RECEIPT_IDENTIFIER');
  const { rows } = await sql(`SELECT to_jsonb(r)-'password_hash' AS value FROM public."${table}" r WHERE id=$1`, [id]);
  // Preserve receipts created before the additive Teacher Search period column.
  // Unknown carries no new value; a non-null period still changes the fingerprint.
  if (rows[0]?.value?.academic_period_id === null) delete rows[0].value.academic_period_id;
  return rows[0]?.value || null;
}
async function activeTeacher(client, teacherId) {
  if (!UUID.test(teacherId || '')) fail('EXPLICIT_TEACHER_UUID_REQUIRED');
  const { rows } = await client.query(`SELECT id,status,department,is_department_head,
    concat_ws(' ',academic_title,first_name,last_name) AS display_name
    FROM public.teachers WHERE id=$1`, [teacherId]);
  if (rows.length !== 1 || rows[0].status !== 'active' || !rows[0].department?.trim()) fail('TARGET_TEACHER_MISSING_INACTIVE_OR_WITHOUT_DEPARTMENT');
  const { rows: [ready] } = await client.query("SELECT to_regclass('public.admin_account_controls') IS NOT NULL ready");
  if (ready.ready) {
    const { rows: controls } = await client.query("SELECT enabled FROM public.admin_account_controls WHERE actor_type='teacher' AND actor_id=$1", [teacherId]);
    if (controls.some(row => !row.enabled)) fail('TARGET_TEACHER_ACCOUNT_DISABLED');
  }
  return rows[0];
}

async function applyPlan(plan, options) {
  const env = loadConfig(options.config);
  if (!UUID.test(options.teacherId || '') || (options.confirm && options.confirm !== env.DB_NAME)) fail('EXPLICIT_TARGET_TEACHER_REQUIRED');
  if (plan.target_teacher_id !== options.teacherId || plan.marker !== 'fitm.teacher-demo.v1') fail('PLAN_TEACHER_OR_MARKER_MISMATCH');
  if (plan.academic_snapshots) fail('ACADEMIC_SNAPSHOTS_OUTSIDE_CURRENT_SEED_SCOPE');
  const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, { host: '127.0.0.1', port: 5432,
    dialect: 'postgres', logging: false, pool: { min: 0, max: 1 }, dialectOptions: { application_name: 'fitm_authorized_teacher_demo_seed' } });
  const receiptFile = receiptPath(env.DB_NAME, options.teacherId), pendingFile = receiptFile + '.pending';
  let ownsPending = false, readyToCommit = false, committed = false, creatingTable = null;
  try {
    // Only a private, ignored, fixed directory. A leftover pending receipt blocks
    // retries after a crash/uncertain commit; it is never automatically overwritten.
    fs.mkdirSync(PRIVATE, { recursive: true });
    const prior = fs.existsSync(receiptFile) ? JSON.parse(fs.readFileSync(receiptFile, 'utf8')) : null;
    const descriptor = fs.openSync(pendingFile, 'wx', 0o600); fs.closeSync(descriptor); ownsPending = true;
    fs.writeFileSync(pendingFile, JSON.stringify({ database: env.DB_NAME, teacher_id: options.teacherId, plan_digest: digest(plan), status: 'PENDING' }));
    const models = defineModels(sequelize), byTable = Object.fromEntries(Object.values(models).filter(m => m.tableName).map(m => [m.tableName, m]));
    const receipt = await sequelize.transaction({ isolationLevel: 'SERIALIZABLE' }, async transaction => {
      const sql = async (text, values) => {
        const [rows] = await sequelize.query(text, { bind: values, transaction }); return { rows };
      };
      await sql("SET LOCAL lock_timeout='5s'"); await sql("SET LOCAL statement_timeout='30s'");
      const target = await liveTarget({ query: sql });
      if (target.db !== 'intern_system') fail('LIVE_DEVELOPMENT_INTERN_SYSTEM_REQUIRED');
      await sql('SELECT pg_advisory_xact_lock(641109100)');
      await sql('SELECT id FROM public.teachers WHERE id=$1 FOR SHARE', [options.teacherId]);
      const teacher = await activeTeacher({ query: sql }, options.teacherId);
      const originalTeacher = await models.Teacher.findByPk(teacher.id, { transaction });
      const originalStudents = await models.Student.findAll({ where: { [Op.or]: [
        { advisor_teacher_id: teacher.id }, { coop_advisor_teacher_id: teacher.id },
      ] }, transaction, lock: transaction.LOCK.SHARE });
      const baseline = { teacher: { id: teacher.id, fingerprint: fingerprint(originalTeacher) },
        students: originalStudents.map(row => ({ id: row.id, fingerprint: fingerprint(row) })),
        supervised_students: originalStudents.filter(row => row.coop_advisor_teacher_id === teacher.id).length };
      const planDigest = digest(plan);
      if (prior) {
        if (prior.status !== 'COMMITTED' || prior.database !== env.DB_NAME || prior.teacher_id !== teacher.id
          || prior.plan_digest !== planDigest || prior.rows?.length !== plan.rows.length
          || prior.row_format !== 'POSTGRES_JSON_V1') fail('PRIOR_RECEIPT_MISMATCH_NO_OVERWRITE');
        for (const planned of plan.rows) {
          const entry = prior.rows.find(row => row.table === planned.table && row.id === planned.values.id);
          await byTable[planned.table].findByPk(planned.values.id, { transaction, lock: transaction.LOCK.SHARE });
          const row = await persistedRow(sql, planned.table, planned.values.id);
          if (!entry || !row || digest(row) !== entry.fingerprint) fail('EXISTING_FIXTURE_CHANGED_OR_PARTIAL_NO_OVERWRITE');
        }
        return { ...prior, already_present: true };
      }
      const students = plan.rows.filter(row => row.table === 'students').map(row => row.values);
      const collision = await models.Student.count({ where: { [Op.or]: students.flatMap(row => [
        { id: row.id }, { student_id: row.student_id }, { email: row.email }, { first_name: row.first_name, last_name: row.last_name },
      ]) }, transaction });
      if (collision) fail('EXISTING_STUDENT_COLLISION_NO_OVERWRITE');
      for (const row of plan.rows) {
        if (!byTable[row.table] || await byTable[row.table].findByPk(row.values.id, { transaction })) fail('EXISTING_SUPPORTING_RECORD_OR_MISSING_MODEL');
      }
      if (plan.academic_snapshots) {
        const catalog = await require('../services/coopPrerequisiteCatalog.service').readStudentCatalog(models, 'IT', transaction);
        const planned = plan.rows.filter(row => row.table === 'coop_request_prerequisite_courses');
        const perRequest = planned.filter(row => row.values.coop_request_id === planned[0].values.coop_request_id);
        if (catalog.courses.length !== perRequest.length || perRequest.some(({ values }) => !catalog.courses.some(c =>
          c.course_code === values.course_code && c.course_name === values.course_name && (c.english_name || null) === values.english_name))) fail('ACTIVE_CATALOG_DIFFERS_REBUILD_AND_REAPPROVE_PLAN');
      }
      const rows = [];
      for (const planned of plan.rows) {
        creatingTable = planned.table;
        const values = Object.fromEntries(Object.entries(planned.values).map(([key, value]) => [key,
          value === '$verifiedTargetTeacherDepartment' ? teacher.department : value]));
        if (Object.values(values).some(value => typeof value === 'string' && value.startsWith('$verified'))) fail('UNBOUND_FIXTURE_REFERENCE');
        // Normal hooks hash an unreported random password. No existing account,
        // email validator, Google identity or authorization policy is changed.
        if (planned.table === 'students') values.password = randomBytes(32).toString('base64url');
        const model = await byTable[planned.table].create(values, { transaction });
        const stored = await persistedRow(sql, planned.table, model.id);
        if (!stored) fail('INSERTED_ROW_READBACK_MISSING');
        rows.push({ table: planned.table, id: model.id, fingerprint: digest(stored) });
      }
      const result = { database: env.DB_NAME, teacher_id: teacher.id, marker: plan.marker,
        plan_digest: planDigest, status: 'COMMITTED', row_format: 'POSTGRES_JSON_V1', baseline, rows };
      // Durable intent before COMMIT, to support manual investigation if receipt
      // finalization fails. It contains no secret or personal row values.
      fs.writeFileSync(pendingFile, JSON.stringify({ ...result, status: 'PREPARED_COMMIT_NOT_CONFIRMED' }));
      readyToCommit = true;
      return result;
    });
    committed = true;
    if (!receipt.already_present) fs.writeFileSync(receiptFile, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
    fs.unlinkSync(pendingFile); ownsPending = false;
    return { status: receipt.already_present ? 'ALREADY_PRESENT_UNCHANGED' : 'CREATED',
      database: env.DB_NAME, created: receipt.already_present ? { coop_requests: 0, advisor_requests: 0, supervised_students: 0 } : plan.requested,
      receipt: path.relative(ROOT, receiptFile), row_count: receipt.rows.length };
  } catch (error) {
    if (readyToCommit || committed) fail('COMMIT_OR_RECEIPT_UNCERTAIN_STOP_NO_AUTOMATIC_RETRY');
    error.safeDetails = { phase_table: creatingTable, error_type: error.name,
      validation_fields: (error.errors || []).map(item => ({ field: item.path, validator: item.validatorKey })),
      sql_state: error.original?.code, constraint: error.original?.constraint };
    throw error;
  } finally {
    // Delete only the new lock file owned by this invocation, after a known
    // pre-commit rollback. Leave uncertain-commit evidence intact.
    if (ownsPending && !readyToCommit && !committed) fs.unlinkSync(pendingFile);
    await sequelize.close();
  }
}

// Explicitly authorized post-seed SELECT verification; no API or mutation calls.
async function verifyPlan(plan, options) {
  const env = loadConfig(options.config);
  const receiptFile = receiptPath(env.DB_NAME, options.teacherId);
  const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
  if (receipt.status !== 'COMMITTED' || receipt.plan_digest !== digest(plan) || receipt.database !== env.DB_NAME
    || receipt.teacher_id !== options.teacherId || receipt.rows?.length !== plan.rows.length) fail('COMMITTED_RECEIPT_REQUIRED_FOR_SELECT_VERIFICATION');
  const reconcile = options.reconcileReceipt && !receipt.row_format;
  const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, { host: '127.0.0.1', port: 5432,
    dialect: 'postgres', logging: false, pool: { min: 0, max: 1 } });
  try {
    const models = defineModels(sequelize), byTable = Object.fromEntries(Object.values(models).filter(m => m.tableName).map(m => [m.tableName, m]));
    const result = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ', readOnly: true }, async transaction => {
      const sql = async (text, values) => { const [rows] = await sequelize.query(text, { bind: values, transaction }); return { rows }; };
      const target = await liveTarget({ query: sql });
      if (target.db !== env.DB_NAME) fail('SELECT_VERIFICATION_TARGET_MISMATCH');
      const teacher = await activeTeacher({ query: sql }, options.teacherId);
      const students = plan.rows.filter(row => row.table === 'students').map(row => row.values.id);
      const { rows: [counts] } = await sql(`SELECT
        (SELECT count(*)::int FROM public.students WHERE id=ANY($2::uuid[])) synthetic_students,
        (SELECT count(*)::int FROM public.coop_requests r JOIN public.students s ON s.id=r.student_id
          JOIN public.companies c ON c.id=r.company_id JOIN public.job_postings j ON j.id=r.job_posting_id AND j.company_id=c.id
          WHERE s.id=ANY($3::uuid[]) AND s.advisor_teacher_id=$1 AND s.coop_advisor_teacher_id IS NULL AND s.track='co_op' AND r.status='advisor_review') coop_requests,
        (SELECT count(*)::int FROM public.coop_project_advisor_requests a JOIN public.students s ON s.id=a.student_id
          JOIN public.coop_projects p ON p.student_id=s.id JOIN public.coop_requests r ON r.student_id=s.id AND r.status='approved'
          JOIN public.companies c ON c.id=r.company_id JOIN public.job_postings j ON j.id=r.job_posting_id AND j.company_id=c.id
          WHERE s.id=ANY($4::uuid[]) AND a.requested_advisor_teacher_id=$1 AND a.status='pending'
          AND s.coop_advisor_teacher_id IS NULL AND s.track='co_op' AND length(p.topic)>0) advisor_requests,
        (SELECT count(*)::int FROM public.students s JOIN public.coop_requests r ON r.student_id=s.id AND r.status='approved'
          JOIN public.mentors m ON m.student_id=s.id AND m.status='verified' AND m.verified_at IS NOT NULL
          JOIN public.coop_projects p ON p.student_id=s.id JOIN public.companies c ON c.id=r.company_id
          JOIN public.job_postings j ON j.id=r.job_posting_id AND j.company_id=c.id
          WHERE s.id=ANY($5::uuid[]) AND s.coop_advisor_teacher_id=$1 AND s.track='co_op') supervised_students,
        (SELECT count(*)::int FROM public.coop_requests r JOIN public.students s ON s.id=r.student_id
          WHERE s.advisor_teacher_id=$1 AND r.status='advisor_review') total_visible_coop_requests,
        (SELECT count(*)::int FROM public.coop_project_advisor_requests WHERE requested_advisor_teacher_id=$1 AND status='pending') total_visible_advisor_requests,
        (SELECT count(*)::int FROM public.students WHERE coop_advisor_teacher_id=$1 AND track='co_op') total_visible_supervised_students`,
      [teacher.id, students, students.slice(0,5), students.slice(5,10), students.slice(10,15)]);
      const rowsByTable = {};
      for (const entry of receipt.rows) {
        const planned = plan.rows.find(row => row.table === entry.table && row.values.id === entry.id);
        if (!planned) fail('RECEIPT_ROW_OUTSIDE_APPROVED_PLAN');
        const row = await persistedRow(sql, entry.table, entry.id);
        if (!row) fail('COMMITTED_DEMO_ROW_MISSING');
        if (reconcile) {
          // Repair only this seed's old local receipt format after SELECT proves
          // all explicit fixture values and unchanged creation timestamps. No DB UPDATE.
          for (const [field, raw] of Object.entries(planned.values)) {
            const expected = raw === '$verifiedTargetTeacherDepartment' ? teacher.department : raw;
            const actual = row[field];
            const equal = actual === expected || (typeof actual === 'number' && expected !== null && Number(expected) === actual)
              || (field.endsWith('_at') && actual && expected && Date.parse(actual) === Date.parse(expected));
            if (!equal) { const error = new Error('FIXTURE_VALUE_DIFFERS_NO_RECEIPT_REPAIR'); error.publicCode = error.message; error.safeDetails = { table: entry.table, field }; throw error; }
          }
          if (!row.created_at || Date.parse(row.created_at) !== Date.parse(row.updated_at)) fail('FIXTURE_EDITED_NO_RECEIPT_REPAIR');
          entry.fingerprint = digest(row);
        } else if (receipt.row_format !== 'POSTGRES_JSON_V1' || digest(row) !== entry.fingerprint) fail('COMMITTED_DEMO_ROW_MISSING_OR_CHANGED');
        rowsByTable[entry.table] = (rowsByTable[entry.table] || 0) + 1;
      }
      const originalTeacher = await models.Teacher.findByPk(teacher.id, { transaction });
      if (fingerprint(originalTeacher) !== receipt.baseline.teacher.fingerprint) fail('ORIGINAL_TEACHER_CHANGED_SINCE_SEED');
      for (const entry of receipt.baseline.students) {
        const row = await models.Student.findByPk(entry.id, { transaction });
        if (!row || fingerprint(row) !== entry.fingerprint) fail('ORIGINAL_STUDENT_CHANGED_OR_MISSING');
      }
      const requestIds = plan.rows.filter(row => row.table === 'coop_requests').map(row => row.values.id);
      const { rows: [academic] } = await sql('SELECT count(*)::int snapshots FROM public.coop_request_prerequisite_courses WHERE coop_request_id=ANY($1::uuid[])', [requestIds]);
      if (counts.synthetic_students !== 15 || counts.coop_requests !== 5 || counts.advisor_requests !== 5
        || counts.supervised_students !== 5 || academic.snapshots !== (receipt.completion?.snapshot_count || 0)) fail('COMMITTED_DATASET_COUNTS_OR_RELATIONS_DIFFER');
      return { status: 'COMMITTED_DATA_PRESENT', target: { database: target.db, schema: target.schema, postgres_version: target.version },
        teacher_id: teacher.id, counts, rows_by_table: rowsByTable, total_inserted_rows: receipt.rows.length,
        original_teacher_unchanged: true, original_students_unchanged: receipt.baseline.students.length,
        original_supervised_students: receipt.baseline.supervised_students, academic_snapshots: academic.snapshots };
    });
    if (reconcile) { receipt.row_format = 'POSTGRES_JSON_V1'; fs.writeFileSync(receiptFile, JSON.stringify(receipt)); }
    return { ...result, local_receipt_format_reconciled: !!reconcile };
  } finally { await sequelize.close(); }
}
module.exports = { UUID, digest, fail, loadConfig, liveTarget, activeTeacher, receiptPath, applyPlan, verifyPlan,
  defineModels, fingerprint, persistedRow };
