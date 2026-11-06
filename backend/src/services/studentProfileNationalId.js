const { randomBytes, createCipheriv, createDecipheriv } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { STORAGE_ROOT } = require("../config/storage");

const VERSION = "student-profile-id-aes256gcm-v1";
function unavailable() {
  return Object.assign(new Error("ไม่สามารถเข้าถึงข้อมูลเลขบัตรประชาชนอย่างปลอดภัย กรุณาติดต่อผู้ดูแลระบบ"), { status: 503, code: "PROFILE_ID_STORAGE_UNAVAILABLE" });
}
function normalizeNationalId(value) {
  if (value === null || value === "") return null;
  const text = typeof value === "string" ? value.trim() : "";
  if (typeof value === "string" && !text) return null;
  let sum = 0;
  if (/^[1-9]\d{12}$/.test(text)) for (let i = 0; i < 12; i++) sum += Number(text[i]) * (13 - i);
  if (!/^[1-9]\d{12}$/.test(text) || (11 - sum % 11) % 10 !== Number(text[12])) {
    throw Object.assign(new Error("เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลักและมีเลขตรวจสอบถูกต้อง"), { status: 400, code: "PROFILE_VALIDATION_ERROR" });
  }
  return text;
}
function createNationalIdStorage({ directory = path.join(STORAGE_ROOT, "keys"), key } = {}) {
  async function loadKey(create) {
    if (key) { if (!Buffer.isBuffer(key) || key.length !== 32) throw unavailable(); return key; }
    const file = path.join(directory, "student-profile-national-id-v1.key");
    try {
      if (create) {
        await fs.mkdir(directory, { recursive: true, mode: 0o700 });
        try { await fs.writeFile(file, randomBytes(32), { flag: "wx", mode: 0o600 }); }
        catch (error) { if (error.code !== "EEXIST") throw error; }
      }
      const metadata = await fs.lstat(file);
      if (!metadata.isFile() || metadata.isSymbolicLink()) throw unavailable();
      const bytes = await fs.readFile(file);
      if (bytes.length !== 32) throw unavailable();
      return bytes;
    } catch { throw unavailable(); }
  }
  return {
    async encrypt(value, owner) {
      const normalized = normalizeNationalId(value);
      if (normalized === null) return { national_id_ciphertext: null, national_id_key_version: null };
      const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", await loadKey(true), iv);
      cipher.setAAD(Buffer.from(VERSION + ":" + owner));
      const ciphertext = Buffer.concat([iv, cipher.update(normalized, "utf8"), cipher.final(), cipher.getAuthTag()]);
      return { national_id_ciphertext: ciphertext, national_id_key_version: VERSION };
    },
    async decrypt(row, owner) {
      if (row?.national_id_ciphertext == null && row?.national_id_key_version == null) return null;
      try {
        const bytes = row.national_id_ciphertext;
        if (row.national_id_key_version !== VERSION || !Buffer.isBuffer(bytes) || bytes.length !== 41) throw unavailable();
        const decipher = createDecipheriv("aes-256-gcm", await loadKey(false), bytes.subarray(0, 12));
        decipher.setAAD(Buffer.from(VERSION + ":" + owner)); decipher.setAuthTag(bytes.subarray(-16));
        return normalizeNationalId(Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString("utf8"));
      } catch { throw unavailable(); }
    },
  };
}
module.exports = { normalizeNationalId, createNationalIdStorage };
