const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Op } = require('sequelize');
const R = require('./supervisionRules');
const { resultInput, validateImage } = require('./supervisionResultRules');
const defaultStorage = require('../config/storage');
const plain = row => row.toJSON();
const publicImage = row => ({ id: row.id, original_name: row.original_name, mime_type: row.mime_type, file_size: row.file_size, created_at: row.created_at });
function createSupervisionResultService(m, { storage = defaultStorage, now = () => new Date() } = {}) {
  const { sequelize, Student, Teacher, CoopRequest, SupervisionAppointment: Appointment, SupervisionResult: Result, SupervisionImage: Image, SupervisionResultRevision: Revision } = m;
  async function ready() {
    const [[row]] = await sequelize.query("SELECT to_regclass('public.supervision_results') AS name");
    if (!row.name) R.fail(503, 'SUPERVISION_RESULTS_SCHEMA_REQUIRED', 'ผลนิเทศรอการติดตั้ง migration 020');
  }
  // Same actor -> Student -> appointment lock order as scheduling. Read access
  // remains available for historical results after placement cancellation.
  async function scope(studentId, appointmentId, visit, teacherId, transaction, writing = false) {
    R.uuid(studentId); R.uuid(appointmentId);
    if (![1,2].includes(visit)) R.fail(400, 'INVALID_VISIT', 'ครั้งนิเทศต้องเป็น 1 หรือ 2');
    const actor = teacherId ? await Teacher.findOne({ where: { id: teacherId, status: 'active' }, transaction, lock: transaction.LOCK.SHARE }) : null;
    if (teacherId && !actor) R.fail(403, 'TEACHER_INACTIVE', 'บัญชีอาจารย์ไม่มีสิทธิ์ใช้งาน');
    const student = await Student.findByPk(studentId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!student || student.track !== 'co_op' || (teacherId && student.coop_advisor_teacher_id !== teacherId)) R.fail(404, 'STUDENT_NOT_FOUND', 'ไม่พบนักศึกษาในความดูแล');
    // Request lock precedes appointment, matching scheduling/cancellation.
    const candidate = await Appointment.findOne({ where: { id: appointmentId, student_id: studentId, visit_number: visit }, transaction });
    if (!candidate || (teacherId && candidate.teacher_id !== teacherId)) R.fail(404, 'APPOINTMENT_NOT_FOUND', 'ไม่พบนัดหมายของนักศึกษาและครั้งนิเทศนี้');
    const request = await CoopRequest.findByPk(candidate.request_id, { transaction, lock: transaction.LOCK.UPDATE });
    const appointment = await Appointment.findByPk(appointmentId, { transaction, lock: transaction.LOCK.UPDATE });
    if (writing && (!request || !['approved','document_issued','in_progress'].includes(request.status))) R.fail(409, 'PLACEMENT_CHANGED', 'คำร้องถูกยกเลิกหรือเปลี่ยนสถานะแล้ว บันทึกผลเพิ่มเติมไม่ได้');
    return { actor, student, appointment };
  }
  async function view(appointmentId, transaction, teacher = true) {
    const result = await Result.findOne({ where: { appointment_id: appointmentId }, transaction });
    if (!result || (!teacher && result.status !== 'completed')) return { result: null, history: [], images: [] };
    const history = teacher ? await Revision.findAll({ where: { result_id: result.id }, order: [['version','ASC']], transaction }) : [];
    const ids = new Set([result.image_1_id, result.image_2_id, ...history.flatMap(h => [h.snapshot.image_1_id, h.snapshot.image_2_id])].filter(Boolean));
    const images = ids.size ? await Image.findAll({ where: { appointment_id: appointmentId, id: { [Op.in]: [...ids] } }, transaction }) : [];
    return { result: plain(result), history: history.map(plain), images: images.map(publicImage) };
  }
  async function read(studentId, appointmentId, visit, teacherId) {
    await ready(); studentId = R.uuid(studentId).toLowerCase(); appointmentId = R.uuid(appointmentId).toLowerCase();
    return sequelize.transaction(async transaction => { await scope(studentId, appointmentId, visit, teacherId, transaction); return view(appointmentId, transaction, !!teacherId); });
  }
  async function save(studentId, appointmentId, visit, teacherId, input, files = {}) {
    await ready(); studentId = R.uuid(studentId).toLowerCase(); appointmentId = R.uuid(appointmentId).toLowerCase(); const clean = resultInput(input, true);
    if (Object.keys(files).some(key => !['image_1','image_2'].includes(key)) || Object.values(files).some(list => !Array.isArray(list) || list.length !== 1)) R.fail(400, 'INVALID_IMAGES', 'ส่งภาพได้ช่องละหนึ่งภาพเท่านั้น');
    const validated = Object.fromEntries(Object.entries(files).map(([key, list]) => [key, validateImage(list[0])]));
    const staged = []; let committed = false;
    try {
      const response = await sequelize.transaction(async transaction => {
        // Mark the durable boundary before any other afterCommit hook runs.
        // A later response/hook failure must retain committed evidence.
        transaction.afterCommit(() => { committed = true; });
        const { actor, appointment } = await scope(studentId, appointmentId, visit, teacherId, transaction, true);
        if (appointment.version !== clean.appointment_version) R.fail(409, 'STALE_APPOINTMENT', 'นัดหมายเปลี่ยนแล้ว กรุณาโหลดใหม่');
        if (appointment.status !== 'confirmed') R.fail(409, 'APPOINTMENT_CONFIRMATION_REQUIRED', 'พี่เลี้ยงต้องยืนยันนัดก่อนเริ่มบันทึกผล');
        let row = await Result.findOne({ where: { appointment_id: appointmentId }, transaction, lock: transaction.LOCK.UPDATE });
        if ((row ? row.version : 0) !== clean.version) R.fail(409, 'STALE_RESULT', 'ผลนิเทศมีฉบับใหม่แล้ว กรุณาโหลดข้อมูลล่าสุด');
        if (row?.status === 'completed') R.fail(409, 'RESULT_COMPLETED', 'ผลนิเทศเสร็จสมบูรณ์แล้ว แก้ไขไม่ได้');
        const data = { visited_on: clean.visited_on, summary: clean.summary, issues: clean.issues, recommendations: clean.recommendations, version: clean.version + 1 };
        for (const [field, meta] of Object.entries(validated)) {
          const id = crypto.randomUUID(), directory = path.join(storage.getStudentStoragePaths(studentId).coop, 'supervision', appointmentId);
          await storage.ensureDirectory(directory);
          const realDirectory = await fs.realpath(directory), realRoot = await fs.realpath(storage.STORAGE_ROOT);
          if (path.relative(realRoot, realDirectory) !== path.relative(storage.STORAGE_ROOT, directory)) R.fail(400, 'INVALID_STORAGE', 'ตำแหน่งจัดเก็บภาพไม่ถูกต้อง');
          const target = path.join(directory, `${id}.${meta.mime_type === 'image/png' ? 'png' : 'jpg'}`);
          // Register before write so a partial filesystem write is cleaned too.
          staged.push(target); await fs.writeFile(target, files[field][0].buffer, { flag: 'wx', mode: 0o600 });
          await Image.create({ id, appointment_id: appointmentId, ...meta, storage_path: storage.toStorageRelativePath(target) }, { transaction });
          data[`${field}_id`] = id;
        }
        if (row) await row.update(data, { transaction });
        else {
          const [[canonical]] = await sequelize.query('SELECT to_jsonb(a) AS appointment FROM supervision_appointments a WHERE id=:id', { replacements: { id: appointmentId }, transaction });
          row = await Result.create({ ...data, appointment_id: appointmentId, appointment_version: appointment.version, author_id: teacherId, status: 'draft', snapshot: canonical }, { transaction });
        }
        await Revision.create({ result_id: row.id, version: row.version, actor_id: teacherId, actor_name: `${actor.first_name} ${actor.last_name}`, snapshot: plain(row) }, { transaction });
        return view(appointmentId, transaction);
      });
      committed = true; return response;
    } finally {
      if (!committed) for (const target of staged) {
        try { await fs.unlink(target); } catch (error) { if (error.code !== 'ENOENT') console.error('Supervision image rollback cleanup failed'); }
      }
    }
  }
  async function complete(studentId, appointmentId, visit, teacherId, input) {
    await ready(); studentId = R.uuid(studentId).toLowerCase(); appointmentId = R.uuid(appointmentId).toLowerCase(); R.body(input, ['version']);
    if (!Number.isInteger(input.version) || input.version < 1) R.fail(400, 'INVALID_VERSION', 'เวอร์ชันไม่ถูกต้อง');
    return sequelize.transaction(async transaction => {
      const { actor } = await scope(studentId, appointmentId, visit, teacherId, transaction, true);
      const row = await Result.findOne({ where: { appointment_id: appointmentId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!row) R.fail(404, 'RESULT_NOT_FOUND', 'กรุณาบันทึกฉบับร่างก่อน');
      if (row.version !== input.version) R.fail(409, 'STALE_RESULT', 'ผลนิเทศมีฉบับใหม่แล้ว กรุณาโหลดข้อมูลล่าสุด');
      if (row.status !== 'draft') R.fail(409, 'RESULT_COMPLETED', 'ผลนิเทศเสร็จสมบูรณ์แล้ว');
      if (!row.summary.trim() || !row.visited_on || !row.image_1_id || !row.image_2_id) R.fail(400, 'RESULT_INCOMPLETE', 'กรุณาระบุวันที่นิเทศ ผลนิเทศ และภาพหลักฐานครบสองภาพ');
      for (const id of [row.image_1_id, row.image_2_id]) await physical(await Image.findByPk(id, { transaction }), studentId, appointmentId);
      await row.update({ status: 'completed', completed_at: now(), version: row.version + 1 }, { transaction });
      await Revision.create({ result_id: row.id, version: row.version, actor_id: teacherId, actor_name: `${actor.first_name} ${actor.last_name}`, snapshot: plain(row) }, { transaction });
      return view(appointmentId, transaction);
    });
  }
  async function physical(image, studentId, appointmentId) {
    if (!image) R.fail(404, 'IMAGE_NOT_FOUND', 'ไม่พบภาพหลักฐาน');
    const resolved = storage.resolveStoragePath(image.storage_path), directory = path.join(storage.getStudentStoragePaths(studentId).coop, 'supervision', appointmentId);
    if (path.dirname(resolved) !== directory || path.basename(resolved) !== `${image.id}.${image.mime_type === 'image/png' ? 'png' : 'jpg'}`) R.fail(404, 'IMAGE_NOT_FOUND', 'ไม่พบภาพหลักฐาน');
    try {
      const [real, root, stat] = await Promise.all([fs.realpath(resolved), fs.realpath(storage.STORAGE_ROOT), fs.stat(resolved)]);
      if (path.relative(root, real) !== path.relative(storage.STORAGE_ROOT, resolved) || !stat.isFile() || stat.size !== image.file_size) throw Error('Invalid file');
      return real;
    } catch { R.fail(404, 'IMAGE_NOT_FOUND', 'ไม่พบภาพหลักฐาน'); }
  }
  async function image(studentId, appointmentId, visit, teacherId, imageId) {
    await ready(); studentId = R.uuid(studentId).toLowerCase(); appointmentId = R.uuid(appointmentId).toLowerCase(); imageId = R.uuid(imageId).toLowerCase();
    return sequelize.transaction(async transaction => {
      await scope(studentId, appointmentId, visit, teacherId, transaction);
      const projection = await view(appointmentId, transaction, !!teacherId);
      if (!projection.images.some(row => row.id === imageId)) R.fail(404, 'IMAGE_NOT_FOUND', 'ไม่พบภาพหลักฐาน');
      const row = await Image.findByPk(imageId, { transaction });
      return { path: await physical(row, studentId, appointmentId), mime: row.mime_type };
    });
  }
  return { read, save, complete, image };
}
module.exports = { createSupervisionResultService };
