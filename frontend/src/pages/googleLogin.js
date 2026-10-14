import { googleConfig, googleChallenge, googleAuthenticate } from "../api/googleAuth.api.js";
import { saveStudentSession } from "../auth/studentAuthStorage.js";
import { acceptGoogleSession } from "../auth/googleSession.js";
import { showToast } from "../ui/feedback.js";

let provider;
export function loadGoogleProvider(document, target = window) {
  if (target.google?.accounts?.id) return Promise.resolve(target.google.accounts.id);
  if (!provider) provider = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = target.setTimeout(() => { script.remove(); reject(new Error("โหลด Google ไม่สำเร็จ กรุณาลองใหม่")); }, 10000);
    script.src = "https://accounts.google.com/gsi/client"; script.async = true;
    script.onload = () => { target.clearTimeout(timer); target.google?.accounts?.id ? resolve(target.google.accounts.id) : reject(new Error("ไม่สามารถเชื่อมต่อ Google ได้")); };
    script.onerror = () => { target.clearTimeout(timer); script.remove(); reject(new Error("ไม่สามารถเชื่อมต่อ Google ได้")); };
    document.head.append(script);
  }).catch(error => { provider = undefined; throw error; });
  return provider;
}

export function mountGoogleLogin({ document, target = window, config = googleConfig, challenge = googleChallenge,
  authenticate = googleAuthenticate, loadProvider = () => loadGoogleProvider(document, target),
  accept = acceptGoogleSession, saveStudent = saveStudentSession, toast = showToast } = {}) {
  const root = document.getElementById("googleLogin"), form = document.querySelector(".auth-form");
  if (!root || !form) return;
  const role = document.body.dataset.authRole || "student";
  root.innerHTML = `<div class="google-login__button"></div>
    <p class="login-message" role="status" aria-live="polite"></p>
    <div class="google-login__link" hidden>
      <p>ยืนยันบัญชีเดิมที่ต้องการผูกกับ Google</p>
      <label>อีเมลบัญชีเดิม<input type="email" autocomplete="username" maxlength="254" aria-label="อีเมลบัญชีเดิม"></label>
      <label>รหัสผ่านบัญชีเดิม<input type="password" autocomplete="current-password" maxlength="100" aria-label="รหัสผ่านบัญชีเดิม"></label>
      <p>กรอกข้อมูล แล้วกด Sign in with Google เพื่อยืนยันการผูกบัญชี</p>
      <button type="button" class="google-login__cancel">ยกเลิกการผูกบัญชี</button>
    </div><button type="button" class="google-login__retry" hidden>ลอง Google Login อีกครั้ง</button>`;
  const container = root.querySelector(".google-login__button"), message = root.querySelector(".login-message"),
    link = root.querySelector(".google-login__link"), email = link.querySelector('input[type="email"]'),
    password = link.querySelector('input[type="password"]'), retry = root.querySelector(".google-login__retry");
  let busy = false, preparing = false, exchanging = false, generation = 0, timer, expiryTimer, cfg;
  const say = (text, error = false) => { message.textContent = text; message.setAttribute("role", error ? "alert" : "status"); };
  const lock = value => {
    busy = value; form.inert = value; root.setAttribute("aria-busy", String(value));
    container.inert = value; link.inert = value; retry.disabled = value;
  };
  // Capture prevents simultaneous password/Google requests from racing storage.
  form.addEventListener("submit", event => { if (busy) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  async function prepare() {
    if (busy || preparing || form.getAttribute("aria-busy") === "true") return;
    const ticket = ++generation;
    target.clearTimeout(timer); target.clearTimeout(expiryTimer);
    preparing = true; root.setAttribute("aria-busy", "true"); retry.disabled = true;
    retry.hidden = true; container.replaceChildren(); say("กำลังเตรียม Google Login...");
    try {
      cfg = await config();
      if (!cfg.enabled) { say("Google Login ยังไม่เปิดใช้งาน กรุณาใช้อีเมลและรหัสผ่าน"); return; }
      const purpose = link.hidden ? "login" : "link";
      const request = await challenge({ role, purpose });
      const google = await loadProvider();
      if (ticket !== generation) return;
      google.initialize({ client_id: cfg.clientId, nonce: request.nonce, ux_mode: "popup", auto_select: false,
        callback: async response => {
          if (ticket !== generation || exchanging || form.getAttribute("aria-busy") === "true") return;
          // A late response after cancellation/expiry is ignored by generation.
          exchanging = true;
          target.clearTimeout(timer); target.clearTimeout(expiryTimer); lock(true); say("กำลังยืนยันบัญชี Google...");
          try {
            const body = { role, purpose, credential: response.credential, requestId: request.requestId, requestToken: request.requestToken };
            if (purpose === "link") { body.email = email.value.trim(); body.password = password.value; }
            const result = await authenticate(body);
            if (ticket !== generation) return;
            accept(result, role, { saveStudentSession: saveStudent, storage: target.sessionStorage,
              remember: !!document.getElementById("rememberMe")?.checked, location: target.location });
            ++generation; // Successful session cannot be overwritten by another callback.
          } catch (error) {
            if (ticket !== generation) return;
            if (error.data?.code === "GOOGLE_LINK_REQUIRED" && cfg.linkingEnabled) {
              link.hidden = false; say("กรุณายืนยันอีเมลและรหัสผ่านบัญชีเดิม แล้วลอง Google Login อีกครั้ง");
              email.focus();
            } else { say(error.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่", true); toast(message.textContent, "error"); }
            retry.hidden = false;
            ++generation; container.replaceChildren();
          } finally { exchanging = false; password.value = ""; lock(false); }
        },
      });
      google.renderButton(container, { type: "standard", theme: "outline", size: "large", text: "signin_with", width: Math.min(root.clientWidth || 300, 400),
        click_listener: () => {
          if (busy || form.getAttribute("aria-busy") === "true") return;
          lock(true); say("เลือกบัญชีในหน้าต่าง Google หากยกเลิกสามารถลองใหม่ได้");
          timer = target.setTimeout(() => {
            if (ticket !== generation) return;
            ++generation; password.value = ""; lock(false); container.replaceChildren(); retry.hidden = false;
            say("ยังไม่ได้รับการยืนยันจาก Google กรุณาลองใหม่เมื่อพร้อม", true);
          }, 60000);
        } });
      say(purpose === "link" ? "กรอกบัญชีเดิม แล้วกด Sign in with Google เพื่อผูกบัญชี" : "เข้าสู่ระบบด้วยบัญชี Google ที่ได้รับอนุญาต");
      expiryTimer = target.setTimeout(() => { if (ticket === generation && !busy) { ++generation; container.replaceChildren(); retry.hidden = false; say("คำขอหมดอายุ กรุณาลอง Google Login อีกครั้ง"); } }, 290000);
    } catch (error) {
      if (ticket === generation) { say(error.message || "Google Login ยังไม่พร้อมใช้งาน", true); retry.hidden = false; }
    } finally { preparing = false; if (ticket === generation) { root.setAttribute("aria-busy", "false"); retry.disabled = false; } }
  }
  retry.addEventListener("click", prepare);
  root.querySelector(".google-login__cancel").addEventListener("click", () => {
    if (busy) return; password.value = ""; email.value = ""; link.hidden = true; prepare();
  });
  prepare();
  return { retry: prepare, dispose() { ++generation; target.clearTimeout(timer); target.clearTimeout(expiryTimer); password.value = ""; lock(false); } };
}
if (typeof document !== "undefined") mountGoogleLogin({ document });
