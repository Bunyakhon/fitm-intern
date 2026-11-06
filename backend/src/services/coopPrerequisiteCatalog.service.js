const { WorkflowError, uuid, object, text } = require('../validators/roleWorkflow.validator');
const { CATALOG, GRADE_OPTIONS } = require('./coopPrerequisites');
const PERMISSION = 'coop_prerequisite_catalog.manage';
const PROGRAMS = ['IT', 'INE'];
const TABLES = ['coop_prerequisite_catalog_programs', 'coop_prerequisite_catalog_courses', 'coop_prerequisite_catalog_grants'];
const COURSE_FIELDS = ['id', 'program', 'course_code', 'course_name', 'english_name', 'is_active', 'display_order', 'version', 'updatedAt'];
const fail = (message, code = 'COOP_PREREQUISITE_CATALOG_CHANGED') => { throw Object.assign(new WorkflowError(message, 409), { code }); };
function program(value) { if (!PROGRAMS.includes(value)) throw new WorkflowError('สาขาต้องเป็น IT หรือ INE'); return value; }
async function schemaReady(m, transaction) {
  // to_regclass does not abort an existing submission transaction on an uninstalled schema.
  const [rows] = await m.sequelize.query('SELECT to_regclass(:p) IS NOT NULL AS programs, to_regclass(:c) IS NOT NULL AS courses, to_regclass(:g) IS NOT NULL AS grants',
    { replacements: { p: 'public.' + TABLES[0], c: 'public.' + TABLES[1], g: 'public.' + TABLES[2] }, transaction });
  const values = [rows[0].programs, rows[0].courses, rows[0].grants];
  if (values.some(Boolean) && !values.every(Boolean)) fail('โครงสร้าง Catalog ยังไม่พร้อม กรุณาติดต่อผู้ดูแล', 'COOP_PREREQUISITE_CATALOG_SCHEMA_REQUIRED');
  return values.every(Boolean);
}
async function readStudentCatalog(m, selectedProgram, transaction) {
  if (!transaction) return m.sequelize.transaction(t => readStudentCatalog(m, selectedProgram, t));
  program(selectedProgram);
  if (!await schemaReady(m, transaction)) return { program: selectedProgram, revision: 'legacy-v1', source: 'legacy', grade_options: GRADE_OPTIONS,
    courses: CATALOG[selectedProgram].map(([course_code, course_name, english_name], display_order) => ({ course_code, course_name, english_name: english_name || null, display_order })) };
  const state = await m.CoopPrerequisiteCatalogProgram.findByPk(selectedProgram, { transaction, ...(transaction ? { lock: transaction.LOCK.SHARE } : {}) });
  if (!state) fail('ยังไม่ได้ตั้งค่า Catalog ของสาขานี้ กรุณาติดต่อผู้ดูแล', 'COOP_PREREQUISITE_CATALOG_SCHEMA_REQUIRED');
  const courses = await m.CoopPrerequisiteCatalogCourse.findAll({ where: { program: selectedProgram, is_active: true }, attributes: COURSE_FIELDS, transaction, order: [['display_order', 'ASC'], ['course_code', 'ASC']] });
  return { program: selectedProgram, revision: String(state.revision), source: 'database', grade_options: GRADE_OPTIONS,
    courses: courses.map(row => ({ course_code: row.course_code, course_name: row.course_name, english_name: row.english_name, display_order: row.display_order })) };
}
function courseValues(body, partial) {
  const values = {};
  for (const key of ['course_code', 'course_name', 'english_name', 'is_active', 'display_order']) {
    if (partial && !Object.hasOwn(body, key)) continue;
    if (key === 'course_code') { if (typeof body[key] !== 'string' || !/^[0-9]{9}$/.test(body[key])) throw new WorkflowError('รหัสรายวิชาต้องเป็นตัวเลข 9 หลัก'); values[key] = body[key]; }
    if (key === 'course_name') values[key] = text(body[key], 'ชื่อรายวิชา', 255);
    if (key === 'english_name') values[key] = body[key] == null || body[key] === '' ? null : text(body[key], 'ชื่อภาษาอังกฤษ', 255);
    if (key === 'is_active') { if (body[key] !== undefined && typeof body[key] !== 'boolean') throw new WorkflowError('is_active must be boolean'); values[key] = body[key] ?? true; }
    if (key === 'display_order') { const value = body[key] ?? 0; if (!Number.isInteger(value) || value < 0 || value > 10000) throw new WorkflowError('ลำดับต้องเป็นจำนวนเต็ม 0–10000'); values[key] = value; }
  }
  return values;
}
function createCatalogService(m) {
  async function activeStaff(id, transaction) {
    uuid(id, 'staff id');
    const staff = await m.DepartmentStaff.findOne({ where: { id, is_active: true }, attributes: ['id'], transaction, ...(transaction ? { lock: transaction.LOCK.SHARE } : {}) });
    if (!staff) throw new WorkflowError('Staff is no longer authorized', 403);
    return staff;
  }
  async function ready(transaction) { if (!await schemaReady(m, transaction)) fail('ยังไม่ติดตั้ง Catalog รายวิชา กรุณาติดต่อผู้ดูแล', 'COOP_PREREQUISITE_CATALOG_SCHEMA_REQUIRED'); }
  async function scope(id, selectedProgram, transaction) {
    program(selectedProgram);
    const grant = await m.CoopPrerequisiteCatalogGrant.findOne({ where: { department_staff_id: id, permission: PERMISSION, program: selectedProgram, is_active: true }, transaction,
      ...(transaction ? { lock: transaction.LOCK.SHARE } : {}) });
    if (!grant) throw new WorkflowError('ไม่มีสิทธิ์จัดการ Catalog ของสาขานี้', 403);
  }
  async function capabilities(id) {
    await activeStaff(id); await ready();
    const grants = await m.CoopPrerequisiteCatalogGrant.findAll({ where: { department_staff_id: id, permission: PERMISSION, is_active: true }, attributes: ['program'], order: [['program', 'ASC']] });
    return { permission: PERMISSION, programs: grants.map(row => row.program).filter(value => PROGRAMS.includes(value)) };
  }
  async function list(id, selectedProgram) {
    return m.sequelize.transaction(async transaction => {
      await activeStaff(id, transaction); await ready(transaction); await scope(id, selectedProgram, transaction);
      const state = await m.CoopPrerequisiteCatalogProgram.findByPk(selectedProgram, { transaction, lock: transaction.LOCK.SHARE });
      if (!state) fail('ยังไม่ได้ตั้งค่า Catalog', 'COOP_PREREQUISITE_CATALOG_SCHEMA_REQUIRED');
      return { program: selectedProgram, revision: String(state.revision), courses: await m.CoopPrerequisiteCatalogCourse.findAll({ where: { program: selectedProgram }, attributes: COURSE_FIELDS, transaction, order: [['display_order', 'ASC'], ['course_code', 'ASC']] }) };
    });
  }
  async function save(id, courseId, body) {
    object(body, ['program', 'course_code', 'course_name', 'english_name', 'is_active', 'display_order', 'expected_catalog_revision', 'version']);
    const targetProgram = program(body.program), values = courseValues(body, Boolean(courseId));
    if (!/^[1-9][0-9]*$/.test(String(body.expected_catalog_revision || ''))) throw new WorkflowError('กรุณาโหลด Catalog ล่าสุดก่อนบันทึก');
    if (courseId) { uuid(courseId); if (!Number.isInteger(body.version) || body.version < 1) throw new WorkflowError('Course version is required'); }
    return m.sequelize.transaction(async transaction => {
      await activeStaff(id, transaction); await ready(transaction);
      const reference = courseId ? await m.CoopPrerequisiteCatalogCourse.findByPk(courseId, { transaction }) : null;
      if (courseId && !reference) throw new WorkflowError('ไม่พบรายวิชา', 404);
      const sourceProgram = reference?.program || targetProgram;
      const affected = [...new Set([sourceProgram, targetProgram])].sort();
      // Explicit program grants only. Department free text never grants authority.
      for (const p of affected) await scope(id, p, transaction);
      const states = new Map();
      for (const p of affected) {
        const state = await m.CoopPrerequisiteCatalogProgram.findByPk(p, { transaction, lock: transaction.LOCK.UPDATE });
        if (!state) fail('Catalog ยังไม่พร้อม', 'COOP_PREREQUISITE_CATALOG_SCHEMA_REQUIRED'); states.set(p, state);
      }
      if (String(states.get(sourceProgram).revision) !== String(body.expected_catalog_revision)) fail('Catalog เปลี่ยนแปลงแล้ว กรุณาโหลดข้อมูลล่าสุด');
      let course;
      if (courseId) {
        course = await m.CoopPrerequisiteCatalogCourse.findByPk(courseId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!course || course.program !== sourceProgram || course.version !== body.version) fail('รายวิชาเปลี่ยนแปลงแล้ว กรุณาโหลดข้อมูลล่าสุด');
        await course.update({ ...values, program: targetProgram, version: course.version + 1, updated_by: id }, { transaction });
      } else course = await m.CoopPrerequisiteCatalogCourse.create({ ...values, program: targetProgram, updated_by: id }, { transaction });
      const revisions = {};
      for (const [p, state] of states) { const revision = (BigInt(state.revision) + 1n).toString(); await state.update({ revision }, { transaction }); revisions[p] = revision; }
      return { course: Object.fromEntries(COURSE_FIELDS.map(key => [key, course[key]])), catalog_revisions: revisions };
    });
  }
  return { capabilities, list, save };
}
module.exports = { PERMISSION, PROGRAMS, TABLES, schemaReady, readStudentCatalog, createCatalogService };
