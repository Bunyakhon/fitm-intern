const { createHash } = require("node:crypto");
const { teacherInventory, staffInventory, studentFixtures } = require("./accountPreparation.data");
const rules = require("../services/studentProfileValidation");
const { createStudentProfileAggregateService } = require("../services/studentProfileAggregate.service");
class PreparationError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const fail = code => { throw new PreparationError(code); };
const digest = plan => createHash("sha256").update(JSON.stringify(plan)).digest("hex");
function unique(values, code) { if (new Set(values).size !== values.length) fail(code); }
function inventory() {
  const teachers = teacherInventory(), staff = staffInventory();
  if (teachers.length !== 23 || staff.length !== 2 || teachers.filter(t => t.is_department_head).length !== 1) fail("INVALID_MASTER_LIST");
  for (const person of [...teachers, ...staff]) {
    if (![person.english_candidate.first_name, person.english_candidate.last_name].every(name => /^[A-Z]+(?: [A-Z]+)*$/.test(name))) fail("ENGLISH_CANDIDATE_NOT_UPPERCASE");
    if (person.english_candidate.verified !== false || person.email_verified !== false) fail("UNVERIFIED_CANDIDATES_REQUIRED");
  }
  if (teachers.some(t => !/^[a-z]+\.[a-z]@itm\.kmutnb\.ac\.th$/.test(t.email_candidate))) fail("INVALID_EMAIL_CANDIDATE");
  unique(teachers.map(t => t.email_candidate), "DUPLICATE_EMAIL_CANDIDATE");
  return { teachers, staff };
}
function buildPlan(mode = "review") {
  if (!["review", "disposable"].includes(mode)) fail("UNSUPPORTED_MODE");
  const master = inventory();
  const blockers = ["TEACHER_NAMES_EMAILS_DEPARTMENT_PENDING_OFFICIAL_VERIFICATION",
    "STAFF_OFFICIAL_EMAILS_PENDING_VERIFICATION",
    "PRODUCTION_CREDENTIAL_DELIVERY_AND_FIRST_LOGIN_PASSWORD_CHANGE_PENDING"];
  const teachers = mode === "disposable" ? master.teachers.map((person, index) => ({ key: person.key, values: {
    academic_title: person.academic_title, first_name: person.first_name, last_name: person.last_name,
    email: `teacher${String(index + 1).padStart(2, "0")}@example.test`, department: "FIXTURE_TEST_DEPARTMENT", major: null,
    position: person.position, is_department_head: person.is_department_head, status: "active",
  } })) : [];
  const students = mode === "disposable" ? studentFixtures() : [];
  for (const fixture of students) {
    rules.normalizeStudent(Object.fromEntries(["major", "year_level", "gpa"].map(key => [key, fixture.student[key]])));
    rules.validateProfileState(rules.normalizeProfile(fixture.aggregate.profile));
    for (const kind of Object.keys(rules.RELATIONS)) for (const row of fixture.aggregate[kind].create) rules.normalizeChild(kind, row, true);
    if (!teachers.some(t => t.key === fixture.advisor_key)) fail("UNKNOWN_CLASS_ADVISOR");
  }
  unique([...teachers.map(t => t.values.email), ...students.map(s => s.student.email)], "DUPLICATE_PLAN_EMAIL");
  unique(students.map(s => s.student.student_id), "DUPLICATE_STUDENT_CODE");
  return { version: 1, mode, master, blockers, teachers, staff: [], students,
    counts: { teacher_candidates: 23, staff_candidates: 2, teachers_to_create: teachers.length, staff_to_create: 0, students_to_create: students.length,
      head_flags_to_create: teachers.filter(t => t.values.is_department_head).length,
      profiles_to_create: students.length, ...Object.fromEntries(Object.keys(rules.RELATIONS).map(kind => [`${kind}_to_create`, students.reduce((n, s) => n + s.aggregate[kind].create.length, 0)])) } };
}
function assertTarget(target) {
  if (target?.environment !== "test" || target.host !== "127.0.0.1"
    || !Number.isInteger(target.port) || target.port < 1 || target.port > 65535
    || !/^fitm_fixture_[a-z0-9_]{8,48}$/.test(target.database || "") || !target.user) fail("DISPOSABLE_TEST_TARGET_REQUIRED");
}
// Only existing model factories; never imports the app database config, dotenv, or old seeders.
function defineModels(sequelize) {
  const models = { sequelize };
  for (const filename of ["teacher", "departmentStaff", "student", "studentProfile", "studentFile"]) {
    const Model = require(`../models/${filename}.model`)(sequelize); models[Model.name] = Model;
  }
  require("../models/registerStudentProfileAggregate").registerStudentProfileAggregate(models, sequelize);
  return models;
}
async function provisionDisposable({ target, confirmation, approvalDigest, password, models }) {
  assertTarget(target);
  const plan = buildPlan("disposable");
  if (confirmation !== target.database || approvalDigest !== digest(plan)) fail("EXPLICIT_PLAN_AND_DATABASE_CONFIRMATION_REQUIRED");
  if (typeof password !== "string" || password.length < 8 || !password.trim() || Buffer.byteLength(password, "utf8") > 72) fail("RUNTIME_PASSWORD_REQUIRED");
  const sequelize = models.sequelize;
  const configured = sequelize.config;
  if (!configured || configured.database !== target.database || configured.host !== target.host || Number(configured.port) !== target.port
    || configured.username !== target.user || sequelize.getDialect() !== "postgres") fail("CONNECTION_TARGET_MISMATCH");
  try {
    return await sequelize.transaction(async transaction => {
      const [metadata] = await sequelize.query("SELECT current_database() AS db, current_schema() AS schema, current_setting('fitm.fixture_disposable', true) AS disposable, current_setting('server_version_num')::int AS version, pg_is_in_recovery() AS recovery", { transaction });
      const live = metadata[0];
      if (live?.db !== target.database || live.schema !== "public" || live.disposable !== "on" || live.recovery !== false || Math.floor(live.version / 10000) !== 16) fail("LIVE_DISPOSABLE_MARKER_REQUIRED");
      await sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
      await sequelize.query("SET LOCAL statement_timeout = '30s'", { transaction });
      // Static explicit list; block competing INSERT/UPDATE/DELETE during duplicate detection and creation.
      await sequelize.query("LOCK TABLE public.teachers, public.department_staffs, public.students, public.student_profiles, public.student_addresses, public.student_education_records, public.student_training_records, public.student_skills IN SHARE ROW EXCLUSIVE MODE", { transaction });
      const { Op } = require("sequelize");
      const emails = [...plan.teachers.map(t => t.values.email), ...plan.students.map(s => s.student.email)];
      for (const Model of [models.Teacher, models.DepartmentStaff, models.Student]) {
        if (await Model.count({ where: { email: { [Op.in]: emails } }, transaction })) fail("EXISTING_ACCOUNT_CONFLICT");
      }
      if (await models.Student.count({ where: { student_id: { [Op.in]: plan.students.map(s => s.student.student_id) } }, transaction })) fail("EXISTING_STUDENT_CODE_CONFLICT");
      if (await models.Teacher.count({ where: { [Op.or]: plan.teachers.map(t => ({ first_name: t.values.first_name, last_name: t.values.last_name })) }, transaction })) fail("EXISTING_TEACHER_NAME_CONFLICT");
      const teacherIds = new Map();
      for (const teacher of plan.teachers) {
        const row = await models.Teacher.create({ ...teacher.values, password }, { transaction });
        teacherIds.set(teacher.key, row.id);
      }
      const service = createStudentProfileAggregateService(models);
      for (const fixture of plan.students) {
        const googleOnly = fixture.scenario === "google_only_simulation";
        const student = await models.Student.create({ ...fixture.student, advisor_teacher_id: teacherIds.get(fixture.advisor_key),
          coop_advisor_teacher_id: null, ...(googleOnly ? {} : { password }) }, { transaction, ...(googleOnly ? { googleOnlyCreation: true } : {}) });
        // Bootstrap a new, uncommitted owner only. Existing profiles are never updated.
        // The first GET derives its revision from this full snapshot; subsequent UI writes use normal If-Match.
        const prepared = service.prepareAggregate(fixture.aggregate);
        await service.applyAggregate({ student, transaction, before: { student: student.get({ plain: true }), profile: null } }, prepared);
      }
      return { committed: true, counts: plan.counts, assets_written: 0, google_identities_created: 0 };
    });
  } catch (error) {
    // Do not propagate Sequelize errors, SQL, credentials, hashes or row values into logs.
    if (error instanceof PreparationError) throw error;
    fail(error?.name === "SequelizeUniqueConstraintError" ? "EXISTING_ACCOUNT_CONFLICT" : "PROVISIONING_FAILED_OR_COMMIT_UNKNOWN_REVIEW_BEFORE_RETRY");
  }
}
module.exports = { PreparationError, inventory, buildPlan, digest, assertTarget, defineModels, provisionDisposable };
