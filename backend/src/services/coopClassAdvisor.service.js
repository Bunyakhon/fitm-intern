const { authorizeActor } = require('./unifiedAuth.service');
const { assertAccountAccess } = require('./adminAccountAccess.service');

const REQUIRED_MESSAGE = 'ยังไม่ได้กำหนดอาจารย์ที่ปรึกษาประจำชั้น กรุณาเลือกและบันทึกอาจารย์ในเมนูประวัตินักศึกษาก่อนยื่นคำร้องสหกิจศึกษา';
const advisorError = (code, message, advisor = null) => Object.assign(new Error(message), { status: 400, code, advisor });

async function requireClassAdvisor(models, student, transaction) {
  if (!student.advisor_teacher_id) throw advisorError('CLASS_ADVISOR_REQUIRED', REQUIRED_MESSAGE);
  const advisor = await models.Teacher.findByPk(student.advisor_teacher_id, {
    attributes: ['id', 'academic_title', 'first_name', 'last_name', 'status', 'department', 'is_department_head'],
    transaction,
    ...(transaction ? { lock: transaction.LOCK.SHARE } : {}),
  });
  if (!advisor) throw advisorError('CLASS_ADVISOR_NOT_FOUND', 'ไม่พบอาจารย์ที่ปรึกษาประจำชั้นที่บันทึกไว้ กรุณาตรวจสอบและบันทึกข้อมูลในเมนูประวัตินักศึกษา');
  const savedAdvisor = Object.fromEntries(['id', 'academic_title', 'first_name', 'last_name'].map(field => [field, advisor[field]]));
  try {
    authorizeActor(advisor, 'teacher');
    await assertAccountAccess(models, 'teacher', advisor.id, { transaction });
  } catch (error) {
    if (error.code !== 'ACCOUNT_UNAUTHORIZED') throw error;
    throw advisorError('CLASS_ADVISOR_NOT_ELIGIBLE', 'อาจารย์ที่ปรึกษาประจำชั้นยังไม่มีสิทธิ์พิจารณาคำร้อง กรุณาติดต่อเจ้าหน้าที่หรือตรวจสอบในเมนูประวัตินักศึกษา', savedAdvisor);
  }
  // Head scope already follows the class advisor's department. Students have
  // no department/program-to-department policy; do not infer one from major.
  if (!advisor.department?.trim()) throw advisorError('CLASS_ADVISOR_NOT_ELIGIBLE', 'ข้อมูลภาควิชาของอาจารย์ที่ปรึกษาประจำชั้นยังไม่พร้อม กรุณาติดต่อเจ้าหน้าที่ก่อนยื่นคำร้อง', savedAdvisor);
  return savedAdvisor;
}

module.exports = { requireClassAdvisor };
