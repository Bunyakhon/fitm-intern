const p = require('./superAdmin.policy');
const { fail } = require('./coopTopicExam.rules');
const CAPABILITY = 'topic-exams.manage';
async function manager(req, models) {
  if (req.user?.actor_type === 'department_staff' && req.user.role === 'department_staff' && req.user.staff_id === req.user.id) {
    if (await models.DepartmentStaff.findOne({ where: { id: req.user.id, is_active: true }, attributes: ['id'] })) return `department_staff:${req.user.id}`;
  } else if (req.superAdmin) {
    p.developmentOnly(); p.requirePermission(req.superAdmin, CAPABILITY);
    return `super_admin:${req.superAdmin.id}`;
  }
  fail('ไม่มีสิทธิ์จัดการสอบหัวข้อโครงการ CO-09', 403, 'CO09_FORBIDDEN');
}
module.exports = { CAPABILITY, manager };
