const { WorkflowError } = require('../validators/roleWorkflow.validator');
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
function normalizePrerequisites(program, input) {
  const catalog = program === 'IT' || program === 'INE' ? CATALOG[program] : null;
  if (!catalog) throw new WorkflowError('Student major must be IT or INE');
  if (!Array.isArray(input) || input.length !== 5) throw new WorkflowError('Exactly five prerequisite courses are required');
  const byCode = new Map();
  for (const row of input) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key => !['course_code', 'status', 'grade'].includes(key))) throw new WorkflowError('Invalid prerequisite fields');
    if (!catalog.some(([code]) => code === row.course_code) || byCode.has(row.course_code)) throw new WorkflowError('Unknown, cross-program or duplicate course code');
    if (!['passed', 'studying', 'unselected'].includes(row.status)) throw new WorkflowError('Invalid prerequisite status');
    if (row.grade != null && typeof row.grade !== 'string') throw new WorkflowError('Grade must be text');
    const grade = row.grade?.trim() || null;
    if (row.status === 'passed' ? !grade || grade.length > 10 : grade !== null) throw new WorkflowError('Passed requires a grade; studying/unselected must not have a grade');
    byCode.set(row.course_code, {status: row.status, grade});
  }
  return catalog.map(([course_code, course_name, english_name]) => ({program, course_code, course_name, english_name: english_name || null, ...byCode.get(course_code)}));
}
const PREREQUISITE_ATTRIBUTES = ['program', 'course_code', 'course_name', 'english_name', 'status', 'grade'];
function prerequisiteInclude(models) {
  return { model: models.CoopRequestPrerequisiteCourse, as: 'prerequisite_courses', attributes: PREREQUISITE_ATTRIBUTES, separate: true, order: [['course_code', 'ASC']] };
}
module.exports = { CATALOG, normalizePrerequisites, prerequisiteInclude };
