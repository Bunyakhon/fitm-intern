function createStaffTeachersController(service) {
  const handle = (action, successStatus = 200) => async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try { return res.status(successStatus).json({ success: true, data: await action(req) }); }
    catch (error) {
      const conflict = error.name === 'SequelizeUniqueConstraintError' || ['40001', '40P01', '55P03', '57014'].includes(error.parent?.code);
      const status = [400, 401, 403, 404, 409, 503].includes(error.status) ? error.status : conflict ? 409 : error.name === 'SequelizeValidationError' ? 400 : 500;
      return res.status(status).json({ success: false,
        ...(error.status === status && ['first_name', 'last_name', 'academic_title', 'major', 'email'].includes(error.field) ? { field: error.field } : {}),
        message: error.status === status ? error.message
        : status === 409 ? 'ข้อมูลขัดแย้งหรืออีเมลใช้งานไม่ได้ กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง'
          : status === 400 ? 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบฟอร์ม' : 'ดำเนินการไม่สำเร็จ กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง' });
    }
  };
  return { options: handle(req => service.options(req.user)), create: handle(req => service.create(req.user, req.body), 201),
    update: handle(req => service.update(req.user, req.params.id, req.body)),
    deactivate: handle(req => service.deactivate(req.user, req.params.id, req.body)),
    resetPassword: handle(req => service.resetPassword(req.user, req.params.id, req.body)) };
}
module.exports = { createStaffTeachersController };
