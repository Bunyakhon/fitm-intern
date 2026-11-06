const { WorkflowError } = require('../validators/roleWorkflow.validator');
const GRADE_OPTIONS = Object.freeze(['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F']);
function normalizeNewCourseGrade(status, rawGrade) {
  if (rawGrade != null && typeof rawGrade !== 'string') throw new WorkflowError('Grade must be text');
  const grade = rawGrade?.trim() || null;
  if (status !== 'passed') {
    if (grade !== null) throw new WorkflowError('Studying/unselected must not have a grade');
    return null;
  }
  if (!GRADE_OPTIONS.includes(grade)) throw new WorkflowError('ผลการเรียนต้องเป็น A, B+, B, C+, C, D+, D หรือ F');
  // Confirmed policy: an F grade cannot be paired with a passed course.
  if (grade === 'F') throw new WorkflowError('เกรด F ไม่สอดคล้องกับสถานะผ่านแล้ว กรุณาตรวจสอบผลการเรียน');
  return grade;
}
const CATALOG = {
  IT: [
    ['060243102', 'การโปรแกรมคอมพิวเตอร์', 'Computer Programming'],
    ['060243104', 'การเขียนโปรแกรมเชิงวัตถุ', 'Object-oriented Programming'],
    ['060243108', 'ระบบฐานข้อมูล', 'Database System'],
    ['060243112', 'การวิเคราะห์และออกแบบระบบ', 'System Analysis and Design'],
    ['060243122', 'เว็บแอปพลิเคชัน', 'Web Application'],
  ],
  INE: [
    ['060233107', 'ระบบฐานข้อมูล'], ['060233112', 'วิศวกรรมข้อมูล'],
    ['060233113', 'การเขียนโปรแกรมคอมพิวเตอร์ขั้นสูง'],
    ['060233202', 'ปฏิบัติการวิศวกรรมเครือข่าย 2'],
    ['060233204', 'การออกแบบและการจัดทำเครือข่ายคอมพิวเตอร์'],
  ],
};
function normalizePrerequisites(program, input, activeCatalog = null) {
  const catalog = program === 'IT' || program === 'INE' ? activeCatalog || CATALOG[program] : null;
  if (!catalog) throw new WorkflowError('Student major must be IT or INE');
  if (!Array.isArray(input) || input.length !== catalog.length) throw new WorkflowError('กรุณาระบุรายวิชาให้ครบตาม Catalog ที่ใช้งานปัจจุบัน');
  const byCode = new Map();
  for (const row of input) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key => !['course_code', 'status', 'grade'].includes(key))) throw new WorkflowError('Invalid prerequisite fields');
    if (!catalog.some(([code]) => code === row.course_code) || byCode.has(row.course_code)) throw new WorkflowError('Unknown, cross-program or duplicate course code');
    if (!['passed', 'studying', 'unselected'].includes(row.status)) throw new WorkflowError('Invalid prerequisite status');
    const grade = normalizeNewCourseGrade(row.status, row.grade);
    byCode.set(row.course_code, {status: row.status, grade});
  }
  return catalog.map(([course_code, course_name, english_name]) => ({program, course_code, course_name, english_name: english_name || null, ...byCode.get(course_code)}));
}
const PREREQUISITE_ATTRIBUTES = ['program', 'course_code', 'course_name', 'english_name', 'status', 'grade'];
function prerequisiteInclude(models) {
  return { model: models.CoopRequestPrerequisiteCourse, as: 'prerequisite_courses', attributes: PREREQUISITE_ATTRIBUTES, separate: true, order: [['course_code', 'ASC']] };
}
module.exports = { CATALOG, GRADE_OPTIONS, normalizeNewCourseGrade, normalizePrerequisites, prerequisiteInclude };
