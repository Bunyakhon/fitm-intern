// Only application Student JWTs belong here. Decoding is an expiry/shape check;
// /api/auth/me and the backend signature verifier remain the authority.
export const STUDENT_AUTH_EVENT_KEY = "studentAuthEvent";
const TAB_KEY = "studentAuthSession";
const PERSISTENT_KEY = "studentAuthPersistent";

function json(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function claims(token, now) {
  try {
    if (typeof token !== "string" || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return null;
    const decode = part => JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    const [header, payload] = token.split(".").slice(0, 2).map(decode);
    if (header.alg !== "HS256" || typeof payload.id !== "string" || !payload.id
      || typeof payload.student_id !== "string" || !payload.student_id
      || ![undefined, "student"].includes(payload.actor_type)
      || ![undefined, "student"].includes(payload.role)
      || !Number.isFinite(payload.exp) || payload.exp * 1000 <= now()) return null;
    return payload;
  } catch { return null; }
}

function safeStudent(student, identity) {
  if (!student || student.id !== identity.id) throw new Error("ข้อมูลบัญชีเข้าสู่ระบบไม่ตรงกัน");
  const fields = ["id", "student_id", "first_name", "last_name", "email", "track", "status"];
  return Object.fromEntries(fields.filter(key => student[key] !== undefined).map(key => [key, student[key]]));
}

export function createStudentAuthStorage({
  persistentStorage = localStorage, tabStorage = sessionStorage,
  now = Date.now, generation = () => crypto.randomUUID?.()
    || Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join("-"),
  tokenKey = "token", profileKey = "student", tabKey = TAB_KEY, persistentKey = PERSISTENT_KEY,
  validateClaims = claims, sanitizeProfile = safeStudent,
} = {}) {
  const claims = validateClaims, safeStudent = sanitizeProfile;
  const TAB_KEY = tabKey, PERSISTENT_KEY = persistentKey;
  const AUTH_KEYS = [tokenKey, profileKey, PERSISTENT_KEY];
  const remove = storage => AUTH_KEYS.forEach(key => storage.removeItem(key));
  const event = () => json(persistentStorage.getItem(STUDENT_AUTH_EVENT_KEY));
  const metadata = () => json(tabStorage.getItem(TAB_KEY));
  const validEvent = value => value?.version === 1 && typeof value.generation === "string"
    && ["session", "persistent", "logout"].includes(value.mode);

  function blockTab() {
    remove(tabStorage);
    // A tombstone survives reload so this tab cannot silently adopt another user.
    tabStorage.setItem(TAB_KEY, JSON.stringify({ blocked: true }));
  }

  function clear({ expectedToken } = {}) {
    if (expectedToken !== undefined && getToken() !== expectedToken) return false;
    blockTab();
    remove(persistentStorage);
    persistentStorage.setItem(STUDENT_AUTH_EVENT_KEY, JSON.stringify({
      version: 1, generation: generation(), mode: "logout",
    }));
    return true;
  }

  function save({ token, student, remember = false }) {
    const identity = claims(token, now);
    if (!identity) throw new Error("ข้อมูลเข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่");
    const snapshot = JSON.stringify(safeStudent(student, identity));
    const state = { version: 1, generation: generation(), mode: remember ? "persistent" : "session" };
    try {
      remove(tabStorage);
      remove(persistentStorage);
      // Keep a tab-bound copy in both modes. It prevents account switching when
      // another tab changes the persistent account; the shared generation revokes it.
      tabStorage.setItem(tokenKey, token);
      tabStorage.setItem(profileKey, snapshot);
      tabStorage.setItem(TAB_KEY, JSON.stringify(state));
      if (remember) {
        persistentStorage.setItem(tokenKey, token);
        persistentStorage.setItem(profileKey, snapshot);
        // Bind the compatibility token to its generation in one atomic write.
        // Mixed writes from simultaneous tabs must fail closed, not switch users.
        persistentStorage.setItem(PERSISTENT_KEY, JSON.stringify({ generation: state.generation, token }));
      }
      // Publish last; this record contains no credentials or personal data.
      persistentStorage.setItem(STUDENT_AUTH_EVENT_KEY, JSON.stringify(state));
    } catch {
      try { clear(); } catch { /* Storage denied: never report successful login. */ }
      throw new Error("ไม่สามารถเก็บสถานะเข้าสู่ระบบได้ กรุณาอนุญาตพื้นที่จัดเก็บแล้วลองใหม่");
    }
  }

  function getToken() {
    try {
      const state = metadata(), shared = event();
      if (state?.blocked) return null;
      const tabToken = tabStorage.getItem(tokenKey);
      const persistentToken = persistentStorage.getItem(tokenKey);
      const binding = json(persistentStorage.getItem(PERSISTENT_KEY));
      const bound = validEvent(shared) && binding?.generation === shared.generation && binding.token === persistentToken;
      if (tabToken) {
        if (!state && shared) { blockTab(); return null; }
        if (state && (!validEvent(state) || !validEvent(shared)
          || state.generation !== shared.generation || state.mode !== shared.mode
          || shared.mode === "logout" || (state.mode === "persistent" && (!bound || persistentToken !== tabToken)))) {
          blockTab();
          return null;
        }
        const identity = claims(tabToken, now);
        if (!identity) {
          blockTab();
          if (!shared || persistentToken === tabToken || (state && state.generation === shared?.generation)) {
            remove(persistentStorage);
            persistentStorage.setItem(STUDENT_AUTH_EVENT_KEY, JSON.stringify({ version: 1, generation: generation(), mode: "logout" }));
          }
          return null; // Never fall back to a token for a different account.
        }
        if (!state) {
          // Unknown old session tokens take precedence over unknown old local tokens.
          save({ token: tabToken, student: { id: identity.id, student_id: identity.student_id }, remember: false });
        } else if (state.mode === "session" && persistentToken) {
          remove(persistentStorage); // Stale legacy local token cannot survive this mode.
        }
        return tabToken;
      }
      if (state) { blockTab(); return null; }
      if (!persistentToken) { remove(persistentStorage); return null; }
      const identity = claims(persistentToken, now);
      if (!identity || (shared && (!validEvent(shared) || shared.mode !== "persistent" || !bound))) {
        remove(persistentStorage);
        blockTab();
        return null;
      }
      if (!shared) {
        // Legacy persistence was never an explicit Remember Me choice. Keep the
        // valid login for this tab only; the backend still verifies it before UI use.
        save({ token: persistentToken, student: { id: identity.id, student_id: identity.student_id }, remember: false });
      } else {
        tabStorage.setItem(tokenKey, persistentToken);
        tabStorage.setItem(TAB_KEY, JSON.stringify(shared));
        const student = json(persistentStorage.getItem(profileKey));
        if (student?.id === identity.id) tabStorage.setItem(profileKey, JSON.stringify(safeStudent(student, identity)));
      }
      return persistentToken;
    } catch { return null; } // Storage disabled: fail closed, without logging credentials.
  }

  function updateStudent(student, expectedToken = getToken()) {
    if (!expectedToken || getToken() !== expectedToken) return false;
    const snapshot = JSON.stringify(safeStudent(student, claims(expectedToken, now)));
    tabStorage.setItem(profileKey, snapshot);
    if (metadata()?.mode === "persistent" && persistentStorage.getItem(tokenKey) === expectedToken) {
      persistentStorage.setItem(profileKey, snapshot);
    }
    return true;
  }

  return { getToken, save, clear, updateStudent };
}

let storage;
const current = () => storage ||= createStudentAuthStorage();
export const getStudentToken = () => { try { return current().getToken(); } catch { return null; } };
export const saveStudentSession = session => current().save(session);
export const clearStudentSession = options => { try { return current().clear(options); } catch { return false; } };
export const updateStoredStudent = (student, expectedToken) => current().updateStudent(student, expectedToken);

export function subscribeStudentSession(onChange, target = window) {
  let previous = getStudentToken();
  let expiryTimer;
  const scheduleExpiry = () => {
    target.clearTimeout?.(expiryTimer);
    const identity = claims(previous, Date.now);
    if (identity && target.setTimeout) {
      expiryTimer = target.setTimeout(check, Math.min(identity.exp * 1000 - Date.now(), 2147483647));
    }
  };
  function check() {
    const next = getStudentToken();
    if (next !== previous) { previous = next; onChange(next); }
    scheduleExpiry();
  }
  const listener = event => {
    if (event.key !== null && ![STUDENT_AUTH_EVENT_KEY, "token"].includes(event.key)) return;
    check();
  };
  target.addEventListener("storage", listener);
  scheduleExpiry();
  return () => { target.clearTimeout?.(expiryTimer); target.removeEventListener("storage", listener); };
}
