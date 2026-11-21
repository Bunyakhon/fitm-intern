function createTeacherPasswordController(service) {
  const handle = action => async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try { return res.json({ success: true, data: await action(req) }); }
    catch (error) {
      const status = [400, 401, 403, 409, 503].includes(error.status) ? error.status
        : ['40001', '40P01', '55P03', '57014'].includes(error.parent?.code) ? 409 : 500;
      return res.status(status).json({ success: false, code: error.status === status ? error.code : 'PASSWORD_OPERATION_FAILED',
        ...(error.status === status && ['current_password', 'new_password', 'confirm_password'].includes(error.field) ? { field: error.field } : {}),
        message: error.status === status ? error.message : 'ยังยืนยันผลไม่ได้ กรุณาเข้าสู่ระบบใหม่และตรวจสอบก่อนลองอีกครั้ง' });
    }
  };
  return { status: handle(req => service.status(req.user)), change: handle(req => service.change(req.user, req.body)),
    logout: handle(req => service.logout(req.user)) };
}
module.exports = { createTeacherPasswordController };
