import { createStudentAuthStorage, STUDENT_AUTH_EVENT_KEY } from "./studentAuthStorage.js";

const settings = {
  teacher: { tokenKey: "teacherToken", profileKey: "teacher", roles: ["teacher", "department_head"], idKey: "teacher_id" },
  department_staff: { tokenKey: "staffToken", profileKey: "staff", roles: ["department_staff"], idKey: "staff_id" },
};
export function roleClaims(token, type, now = Date.now) {
  try {
    if (typeof token !== "string" || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return null;
    const [header, claims] = token.split(".").slice(0, 2).map(part => JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))));
    const cfg = settings[type];
    if (header.alg !== "HS256" || !cfg || typeof claims.id !== "string" || !claims.id || claims[cfg.idKey] !== claims.id
      || claims.actor_type !== type || !cfg.roles.includes(claims.role) || !Number.isFinite(claims.exp) || claims.exp * 1000 <= now()) return null;
    return claims;
  } catch { return null; }
}
export function createRoleAuthStorage(type, options = {}) {
  const cfg = settings[type];
  if (!cfg) throw new Error("Unsupported account type");
  return createStudentAuthStorage({ ...options, tokenKey: cfg.tokenKey, profileKey: cfg.profileKey,
    tabKey: `${cfg.profileKey}AuthSession`, persistentKey: `${cfg.profileKey}AuthPersistent`,
    validateClaims: (token, now) => roleClaims(token, type, now),
    sanitizeProfile: (profile, identity) => {
      if (profile?.id !== identity.id) throw new Error("ข้อมูลบัญชีเข้าสู่ระบบไม่ตรงกัน");
      const fields = ["id", "academic_title", "first_name", "last_name", "email", "department", "major", "position", "status", "is_department_head", "is_active"];
      return Object.fromEntries(fields.filter(key => profile[key] !== undefined).map(key => [key, profile[key]]));
    },
  });
}
const stores = {};
const current = type => stores[type] ||= createRoleAuthStorage(type);
export const getRoleToken = type => { try { return current(type).getToken(); } catch { return null; } };
export const saveRoleSession = (type, session) => current(type).save({ ...session, student: session.profile });
export const clearRoleSession = (type, options) => { try { return current(type).clear(options); } catch { return false; } };

// Existing protected pages consume Storage's getItem/removeItem contract.
// This adapter adds persistence, expiry and revocation without changing menus.
export const roleSessionStorage = {
  getItem(key) {
    const type = Object.keys(settings).find(type => settings[type].tokenKey === key);
    return type ? getRoleToken(type) : sessionStorage.getItem(key);
  },
  removeItem(key) {
    const type = Object.keys(settings).find(type => settings[type].tokenKey === key);
    if (type) {
      const token = getRoleToken(type);
      if (token) clearRoleSession(type, { expectedToken: token });
    } else sessionStorage.removeItem(key);
  },
};

export function watchRoleSession(type, target = window) {
  let previous = getRoleToken(type), timer;
  function check() {
    const token = getRoleToken(type);
    if (previous && token !== previous) { target.location.replace("/login.html"); return; }
    previous = token;
    target.clearTimeout(timer);
    const claims = roleClaims(token, type);
    if (claims) timer = target.setTimeout(check, Math.min(claims.exp * 1000 - Date.now(), 2147483647));
  }
  const listener = event => { if (event.key === null || event.key === STUDENT_AUTH_EVENT_KEY || event.key === settings[type].tokenKey) check(); };
  target.addEventListener("storage", listener);
  check();
  return () => { target.clearTimeout(timer); target.removeEventListener("storage", listener); };
}
if (typeof window !== "undefined") {
  const path = window.location.pathname;
  if (path.startsWith("/src/teacher_coop/") || path.startsWith("/src/department_head/")) watchRoleSession("teacher");
  else if (path.startsWith("/src/department_staff/")) watchRoleSession("department_staff");
}
