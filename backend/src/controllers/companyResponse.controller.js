function createStudentCompanyResponseHandler(m) {
  return async (req, res) => {
    try {
      const { uuid } = require('../validators/roleWorkflow.validator');
      uuid(req.params.id, 'request id');
      const request = await m.CoopRequest.findOne({ where: { id: req.params.id, student_id: req.user.id }, attributes: ['id'] });
      if (!request) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
      const response = await m.CompanyResponse.findOne({ where: { coop_request_id: request.id }, attributes: ['id', 'coop_request_id', 'status', 'responded_at', 'note', 'version', 'createdAt', 'updatedAt'] });
      return res.json({ success: true, data: response });
    } catch (error) {
      if (error.parent?.code === '42P01') return res.status(409).json({ success: false, code: 'COMPANY_RESPONSE_SCHEMA_REQUIRED', message: 'ระบบยังไม่พร้อมแสดงผลตอบกลับ กรุณาติดต่อผู้ดูแล' });
      const status = error.status === 400 ? 400 : 500;
      return res.status(status).json({ success: false, message: status === 400 ? error.message : 'โหลดผลตอบกลับไม่สำเร็จ' });
    }
  };
}
module.exports = { createStudentCompanyResponseHandler };
