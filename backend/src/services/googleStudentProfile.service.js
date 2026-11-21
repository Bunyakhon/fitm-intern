const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const storageDefault = require('../config/storage');
const { isThaiPersonName } = require('../validators/personName.validator');
const { IMAGE_MIME, signature } = require('./studentProfileFiles.service');
const MAX_IMAGE = 5 * 1024 * 1024;
function googlePictureUrl(value) {
  try {
    if (typeof value !== 'string' || value.length > 2048) return null;
    const url = new URL(value);
    if (url.protocol !== 'https:' || !/^lh[3-6]\.googleusercontent\.com$/.test(url.hostname)
      || url.port || url.username || url.password || url.search || url.hash
      || !/^\/[A-Za-z0-9/_=.-]+$/.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}
function createGoogleStudentProfileService(models, { englishName, fetchPicture = fetch, storage = storageDefault } = {}) {
  function claims(payload = {}) {
    // Called only after ID-token verification, or with an authenticated receipt.
    // No parsing of an email/full name into academic or identity fields.
    const display = typeof payload.name === 'string' && [...payload.name.trim()].length <= 255
      && !/[\p{Cc}\p{Cf}]/u.test(payload.name) ? payload.name.trim() : null;
    return { first_name: isThaiPersonName(payload.given_name) ? payload.given_name.trim() : null,
      last_name: isThaiPersonName(payload.family_name) ? payload.family_name.trim() : null,
      english_first_name: englishName(payload.given_name), english_last_name: englishName(payload.family_name),
      display_name: display, picture: googlePictureUrl(payload.picture) };
  }
  const empty = value => value == null || typeof value === 'string' && !value.trim();
  async function bumpRevision(student, transaction) {
    const next = BigInt(student.profile_data_revision ?? '0') + 1n;
    if (next > 9223372036854775807n) throw Error('Profile revision exhausted');
    await student.update({ profile_data_revision: next.toString() }, { transaction, fields: ['profile_data_revision'] });
  }
  async function downloadPicture(url) {
    const response = await fetchPicture(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (!response.ok || !response.body || Number(response.headers.get('content-length')) > MAX_IMAGE) { await response.body?.cancel(); return null; }
    const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!IMAGE_MIME[mime]) { await response.body.cancel(); return null; }
    const reader = response.body.getReader(), chunks = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength; if (size > MAX_IMAGE) return null;
        chunks.push(Buffer.from(value));
      }
    } finally { await reader.cancel(); }
    const bytes = Buffer.concat(chunks);
    return size > 0 && signature(bytes, mime) ? { bytes, extension: IMAGE_MIME[mime] } : null;
  }
  async function stagePicture(id, source) {
    // Optional, bounded enrichment using the existing private image contract.
    // Never store an external URL as a private file path or follow redirects.
    try {
      const url = googlePictureUrl(source); if (!url) return null;
      const image = await downloadPicture(url); if (!image) return null;
      const directory = await storage.ensureDirectory(storage.getStudentStoragePaths(id).profile);
      const [realDirectory, realRoot] = await Promise.all([fs.realpath(directory), fs.realpath(storage.STORAGE_ROOT)]);
      if (path.relative(realRoot, realDirectory) !== path.relative(storage.STORAGE_ROOT, directory)) return null;
      const file = path.join(directory, `${randomUUID()}${image.extension}`);
      await fs.writeFile(file, image.bytes, { flag: 'wx', mode: 0o600 });
      return storage.toStorageRelativePath(file);
    } catch { return null; /* Keep default avatar; never log provider URLs/PII. */ }
  }
  async function fill(student, data, transaction) {
    if (!data) return;
    // Caller already holds the Student UPDATE lock (or created that row).
    const changes = {};
    for (const key of ['first_name', 'last_name']) if (empty(student[key]) && isThaiPersonName(data[key])) changes[key] = data[key];
    if (Object.keys(changes).length) await student.update(changes, { transaction, fields: Object.keys(changes) });
    let profile = await models.StudentProfile.findOne({ where: { student_id: student.id },
      attributes: ['id', 'student_id', 'english_first_name', 'english_last_name'], transaction, lock: transaction.LOCK.UPDATE });
    const names = {};
    for (const key of ['english_first_name', 'english_last_name']) {
      const value = englishName(data[key]);
      if (empty(profile?.[key]) && value) names[key] = value;
    }
    let changed = !!Object.keys(changes).length;
    if (!profile) { profile = await models.StudentProfile.create({ student_id: student.id, ...names }, { transaction }); changed = true; }
    else if (Object.keys(names).length) { await profile.update(names, { transaction, fields: Object.keys(names) }); changed = true; }
    if (empty(student.profile_image) && googlePictureUrl(data.picture)) {
      const stored = await stagePicture(student.id, data.picture);
      if (stored) {
        // The caller's existing transaction holds the owner lock. A concurrent
        // upload cannot be overwritten; DB errors roll back identity/profile
        // changes together. Retain new bytes on an uncertain COMMIT outcome.
        await student.update({ profile_image: stored }, { transaction, fields: ['profile_image'] }); changed = true;
      }
    }
    if (changed) await bumpRevision(student, transaction);
  }
  return { claims, fill };
}
module.exports = { createGoogleStudentProfileService, googlePictureUrl };
