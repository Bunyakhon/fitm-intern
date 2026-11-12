const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { QueryTypes } = require('sequelize');
const storage = require('../config/storage');
const { IMAGE_MIME, signature } = require('./studentProfileFiles.service');
const { uuid, object, WorkflowError } = require('../validators/roleWorkflow.validator');
const { TEACHER_PROFILE_FIELDS } = require('./teacherAuth.service');
const { authorizeActor } = require('./unifiedAuth.service');
const { assertAccountAccess } = require('./adminAccountAccess.service');
const MAX_IMAGE = 5 * 1024 * 1024;

function createTeacherProfileImageService(models) {
  async function ready() {
    const [row] = await models.sequelize.query("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='teachers' AND column_name='profile_image' AND data_type='character varying') AS ready", { type: QueryTypes.SELECT });
    if (!row.ready) throw new WorkflowError('ยังไม่ได้ติดตั้งส่วนจัดเก็บรูปโปรไฟล์ กรุณาติดต่อผู้ดูแลระบบ', 503);
  }
  async function actor(claims, transaction) {
    if (claims?.actor_type !== 'teacher' || claims.teacher_id !== claims.id || !Number.isFinite(claims.iat)
      || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) throw new WorkflowError('Session ใช้งานไม่ได้ กรุณาเข้าสู่ระบบใหม่', 401);
    uuid(claims.id);
    const row = await models.Teacher.findByPk(claims.id, { attributes: [...TEACHER_PROFILE_FIELDS, 'profile_image'], transaction,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
    if (authorizeActor(row, 'teacher') !== claims.role) throw new WorkflowError('สิทธิ์บัญชีเปลี่ยนแปลง กรุณาเข้าสู่ระบบใหม่', 403);
    await assertAccountAccess(models, 'teacher', claims.id, { transaction, issuedAt: claims.iat });
    if (claims.exp * 1000 <= Date.now()) throw new WorkflowError('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    return row;
  }
  function directory(id) {
    uuid(id);
    return storage.resolveStoragePath(`teachers/${id}/profile`);
  }
  async function ownedPath(id, reference) {
    const absolute = storage.resolveStoragePath(reference);
    if (path.dirname(absolute) !== directory(id) || !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path.basename(absolute))) throw new WorkflowError('ไม่พบรูปโปรไฟล์', 404);
    const [real, root] = await Promise.all([fs.realpath(absolute), fs.realpath(storage.STORAGE_ROOT)]);
    if (path.relative(root, real) !== path.relative(storage.STORAGE_ROOT, absolute) || !(await fs.stat(real)).isFile()) throw new WorkflowError('ไม่พบรูปโปรไฟล์', 404);
    return real;
  }
  async function read(claims) {
    await ready();
    const row = await actor(claims);
    if (!row.profile_image) throw new WorkflowError('ยังไม่มีรูปโปรไฟล์', 404);
    return ownedPath(row.id, row.profile_image);
  }
  async function save(claims, file) {
    const extension = file && Object.hasOwn(IMAGE_MIME, file.mimetype) ? IMAGE_MIME[file.mimetype] : null;
    const name = file?.originalname;
    if (!extension || !file?.buffer || typeof name !== 'string' || !name || name.length > 255 || /[\\/\u0000-\u001f\u007f]/.test(name) || name.includes('..')
      || !(file.mimetype === 'image/jpeg' ? ['.jpg', '.jpeg'] : [extension]).includes(path.extname(name).toLowerCase())
      || file.size < 1 || file.size > MAX_IMAGE || file.buffer.length !== file.size || !signature(file.buffer, file.mimetype))
      throw new WorkflowError('รองรับ JPG / PNG / WebP ที่มีเนื้อหาและนามสกุลตรงกัน ขนาดไม่เกิน 5 MB');
    await ready();
    await actor(claims);
    const folder = directory(claims.id);
    await storage.ensureDirectory(folder);
    const [realFolder, realRoot] = await Promise.all([fs.realpath(folder), fs.realpath(storage.STORAGE_ROOT)]);
    if (path.relative(realRoot, realFolder) !== path.relative(storage.STORAGE_ROOT, folder)) throw new WorkflowError('ตำแหน่งจัดเก็บรูปไม่ถูกต้อง');
    const absolute = path.join(folder, randomUUID() + extension);
    await fs.writeFile(absolute, file.buffer, { flag: 'wx', mode: 0o600 });
    // Stage unique bytes first, then atomically replace only this actor's reference.
    // Retain old bytes (and staged bytes on ambiguous commit failure): no deletion
    // policy is invented and a failed upload cannot remove the current image.
    await models.sequelize.transaction(async transaction => {
      const row = await actor(claims, transaction);
      await row.update({ profile_image: storage.toStorageRelativePath(absolute) }, { transaction, fields: ['profile_image'] });
    });
    return { saved: true };
  }
  async function remove(claims, body) {
    object(body ?? {}, [], { empty: true });
    await ready();
    return models.sequelize.transaction(async transaction => {
      const row = await actor(claims, transaction);
      if (row.profile_image != null) await row.update({ profile_image: null }, { transaction, fields: ['profile_image'] });
      // Keep private bytes under the existing retention policy. Never unlink
      // another owner's file or a file that may still be referenced.
      return { deleted: true, profile_image: null };
    });
  }
  return { read, save, remove };
}
module.exports = { createTeacherProfileImageService, MAX_IMAGE };
