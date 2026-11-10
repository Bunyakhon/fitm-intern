const MAX_URL_LENGTH = 2000;
function invalid(message) { throw Object.assign(new Error(message), { status: 400, code: "PROJECT_URL_INVALID" }); }
function documentUrl(value, provider) {
  if (typeof value !== "string") invalid("ลิงก์ต้องเป็นข้อความ");
  const raw = value.trim();
  if (!raw) return "";
  if (raw.length > MAX_URL_LENGTH) invalid("ลิงก์ต้องยาวไม่เกิน 2000 ตัวอักษร");
  let url;
  try { url = new URL(raw); } catch { invalid("กรุณาระบุลิงก์ HTTPS ที่ถูกต้อง"); }
  if (url.protocol !== "https:" || url.username || url.password) invalid("ลิงก์ต้องเป็น HTTPS และไม่มีข้อมูลเข้าสู่ระบบ");
  if (provider === "overleaf") {
    if (!["overleaf.com", "www.overleaf.com"].includes(url.hostname)) invalid("กรุณาใช้ลิงก์จาก overleaf.com หรือ www.overleaf.com เท่านั้น");
  } else if (provider === "drive") {
    if (url.hostname !== "drive.google.com") invalid("กรุณาใช้ลิงก์ HTTPS จาก drive.google.com เท่านั้น");
  } else invalid("ประเภทลิงก์ไม่ถูกต้อง");
  if (url.href.length > MAX_URL_LENGTH) invalid("ลิงก์ต้องยาวไม่เกิน 2000 ตัวอักษร");
  // Normalize only an explicitly saved URL; never fetch the external document.
  return url.href;
}
module.exports = { documentUrl, MAX_URL_LENGTH };
