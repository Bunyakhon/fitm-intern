// Owner profile fields only. Never reuse this list for public projections or PDF mapping.
const CONTACT_FIELDS = ["student_line_id", "student_facebook"];
// Historical columns are never selected, dropped, migrated or overwritten here.
const LEGACY_FRIEND_FIELDS = ["close_friend_name", "close_friend_phone", "close_friend_line_id", "close_friend_facebook"];
function safeFacebookUrl(value) {
  if (typeof value !== "string" || !/^https:\/\//i.test(value) || /[\\\s<>\u0000-\u001f\u007f]/u.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["facebook.com", "www.facebook.com", "m.facebook.com"].includes(url.hostname)
      && !url.username && !url.password && !url.port;
  } catch { return false; }
}
function normalizeFriendContact(value, field) {
  const mapped = { nickname: "close_friend_name", full_name: "close_friend_name", phone: "close_friend_phone", line_id: "close_friend_line_id", facebook_url: "close_friend_facebook" }[field];
  const result = normalizeContact(value, mapped);
  if (result && (field === "nickname" && [...result].length > 100 || field === "facebook_url" && !safeFacebookUrl(result))) {
    throw Object.assign(new Error("ข้อมูลเพื่อนสนิทไม่ถูกต้อง Facebook ต้องเป็น HTTPS ของ Facebook เท่านั้น"), { status: 400, code: "PROFILE_VALIDATION_ERROR", field });
  }
  return result;
}
const FACEBOOK_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.com", "www.fb.com"]);
function validFacebook(value) {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return FACEBOOK_HOSTS.has(url.hostname) && !url.username && !url.password && !url.port && !/[\\\s<>]/u.test(value);
    } catch { return false; }
  }
  // Account name, or an explicit Facebook URL; never accept another URL scheme.
  return !/[:/\\<>\u0000-\u001f\u007f]/u.test(value);
}
function normalizeContact(value, field) {
  if (value === null) return null;
  const max = field.endsWith("_facebook") ? 500 : field.endsWith("_line_id") ? 100 : field.endsWith("_phone") ? 32 : 255;
  const invalid = () => { throw Object.assign(new Error("ข้อมูลติดต่อไม่ถูกต้อง กรุณาตรวจรูปแบบและความยาว"), { status: 400, code: "PROFILE_VALIDATION_ERROR", field }); };
  if (typeof value !== "string") invalid();
  const text = value.trim();
  if (!text) return null;
  if ([...text].length > max || /[\u0000-\u001f\u007f]/u.test(text)) invalid();
  if (field.endsWith("_line_id") && !/^[A-Za-z0-9._-]+$/.test(text)) invalid();
  if (field.endsWith("_facebook") && !validFacebook(text)) invalid();
  if (field === "close_friend_name" && (!/\p{L}/u.test(text) || !/^[\p{L}\p{M} .,'’()\-]+$/u.test(text))) invalid();
  if (field.endsWith("_phone") && (!/^[+\d ()-]+$/.test(text) || (text.match(/\d/g) || []).length < 7 || (text.match(/\d/g) || []).length > 20)) invalid();
  return text;
}
module.exports = { CONTACT_FIELDS, LEGACY_FRIEND_FIELDS, normalizeContact, normalizeFriendContact, safeFacebookUrl };
