export function httpsDocumentUrl(value) {
  if (typeof value !== 'string') throw Error('ลิงก์ต้องเป็นข้อความ');
  const raw = value.trim();
  if (!raw) return '';
  if (raw.length > 2000) throw Error('ลิงก์ต้องยาวไม่เกิน 2000 ตัวอักษร');
  let url; try { url = new URL(raw); } catch { throw Error('กรุณาระบุลิงก์ HTTPS ที่ถูกต้อง'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw Error('ลิงก์ต้องเป็น HTTPS และไม่มีข้อมูลเข้าสู่ระบบ');
  if (url.href.length > 2000) throw Error('ลิงก์ต้องยาวไม่เกิน 2000 ตัวอักษร');
  return url.href;
}
export function documentUrl(value, provider) {
  const raw = httpsDocumentUrl(value);
  if (!raw) return '';
  const url = new URL(raw);
  if (provider === 'overleaf') {
    if (!['overleaf.com', 'www.overleaf.com'].includes(url.hostname)) throw Error('กรุณาใช้ลิงก์จาก overleaf.com หรือ www.overleaf.com เท่านั้น');
  } else if (provider === 'drive') {
    if (url.hostname !== 'drive.google.com') throw Error('กรุณาใช้ลิงก์ HTTPS จาก drive.google.com เท่านั้น');
  } else throw Error('ประเภทลิงก์ไม่ถูกต้อง');
  return raw;
}
