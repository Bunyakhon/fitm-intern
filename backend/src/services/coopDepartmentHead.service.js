const { authorizeActor } = require('./unifiedAuth.service');
const { assertAccountAccess } = require('./adminAccountAccess.service');

// Read-only display context, using the same current class-advisor department
// as roleWorkflow.headStudentScope. This never assigns a reviewer or changes RBAC.
async function readDepartmentHead(models, student, { transaction } = {}) {
  const context = { resolution: 'missing_advisor_department', department: null, current_responsible_head: null };
  if (!student?.advisor_teacher_id) return context;
  const advisor = await models.Teacher.findByPk(student.advisor_teacher_id, {
    attributes: ['id', 'department'], transaction,
  });
  if (!advisor?.department?.trim()) return context;
  context.department = advisor.department;
  const candidates = await models.Teacher.findAll({
    where: { department: advisor.department, is_department_head: true, status: 'active' },
    attributes: ['id', 'academic_title', 'first_name', 'last_name', 'position', 'department', 'status', 'is_department_head'],
    transaction,
  });
  const eligible = [];
  for (const candidate of candidates) {
    try {
      authorizeActor(candidate, 'teacher');
      await assertAccountAccess(models, 'teacher', candidate.id, { transaction });
      eligible.push(candidate);
    } catch (error) {
      if (error.code !== 'ACCOUNT_UNAUTHORIZED') throw error;
    }
  }
  context.resolution = eligible.length === 1 ? 'resolved' : eligible.length ? 'ambiguous' : 'missing_head';
  if (eligible.length === 1) {
    context.current_responsible_head = Object.fromEntries(
      ['id', 'academic_title', 'first_name', 'last_name', 'position', 'department'].map(field => [field, eligible[0][field]]),
    );
  }
  return context;
}

module.exports = { readDepartmentHead };
