const { createAcademicService } = require('../services/coopAcademic.service');
function createAcademicController(m) {
  const service = createAcademicService(m);
  const action = run => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { return res.json({ success: true, data: await run(req) }); }
    catch (error) {
      const status = [400, 403, 404, 409].includes(error.status) ? error.status : error.name === 'SequelizeValidationError' ? 400 : 500;
      return res.status(status).json({ success: false, ...(error.code?.startsWith('COOP_ACADEMIC_') ? { code: error.code } : {}),
        message: status === 500 ? 'ไม่สามารถโหลดหรือบันทึกผลการเรียนได้ กรุณาลองใหม่' : error.message });
    }
  };
  return { read: action(req => service.read(req.user.id, req.params.id)),
    update: action(req => service.update(req.user.id, req.params.id, req.params.courseCode, req.body)) };
}
module.exports = { createAcademicController };
