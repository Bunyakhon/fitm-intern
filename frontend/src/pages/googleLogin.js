import { googleConfig, googleChallenge, googleAuthenticate, googleConfirmLink } from "../api/googleAuth.api.js";
import { saveStudentSession } from "../auth/studentAuthStorage.js";
import { acceptGoogleSession } from "../auth/googleSession.js";
import { showToast, showConfirmModal } from "../ui/feedback.js";

export function confirmGoogleLink(preview, { confirm = googleConfirmLink, target = window } = {}) {
  return new Promise(resolve => {
    let result = null, expired = false;
    const roleNames = { student: "นักศึกษา", teacher: "อาจารย์", department_head: "หัวหน้าภาควิชา", department_staff: "เจ้าหน้าที่" };
    const account = preview.target;
    const close = showConfirmModal({ title: "ยืนยันการผูกบัญชี Google", confirmLabel: "ยืนยันการผูกบัญชี",
      message: `บัญชีเดิม: ${account.name} (${roleNames[account.role] || account.role})\nอีเมล: ${account.email}`
        + (account.student_id ? `\nรหัสนักศึกษา: ${account.student_id}` : "")
        + `\nบัญชี Google: ${preview.googleEmail}\nยืนยันว่าคุณเป็นเจ้าของทั้งสองบัญชีและต้องการผูกบัญชีเหล่านี้`,
      onConfirm: async () => {
        if (expired) throw new Error("การยืนยันหมดอายุ กรุณาเริ่มใหม่");
        result = await confirm({ confirmationToken: preview.confirmationToken });
      },
      onClose: () => { target.clearTimeout(expiry); resolve(result); },
    });
    document.getElementById("appConfirmMessage").closest(".app-confirm-overlay").classList.add("google-link-confirmation");
    const expiry = target.setTimeout(() => { expired = true; close(); }, Math.max(0, Date.parse(preview.expiresAt) - Date.now()));
  });
}

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
  accept = acceptGoogleSession, saveStudent = saveStudentSession, toast = showToast,
  confirmLink = preview => confirmGoogleLink(preview, { target }) } = {}) {
  const root = document.getElementById("googleLogin"), form = document.querySelector(".auth-form");
  if (!root || !form) return;
  const role = document.body.dataset.authRole || "student";
  const fallback = root.querySelector("#googleLoginBtn");
  root.insertAdjacentHTML("beforeend", `<div class="google-login__button"></div>
    <p id="googleLoginMessage" class="login-message" role="status" aria-live="polite"></p>
    <div class="google-login__link" hidden>
      <p>ผูก Google กับบัญชี KIWI เดิม</p>
      <label>อีเมลบัญชีเดิม<input type="email" autocomplete="username" maxlength="254" aria-label="อีเมลบัญชีเดิม"></label>
      <label>รหัสผ่านบัญชีเดิม<input type="password" autocomplete="current-password" maxlength="100" aria-label="รหัสผ่านบัญชีเดิม"></label>
      <p>กรอกอีเมลและรหัสผ่าน KIWI ของคุณในสองช่องนี้ แล้วกดปุ่ม Google ด้านบน จากนั้นตรวจบัญชีและกดยืนยัน</p>
      <button type="button" class="google-login__cancel">ยกเลิกการผูกบัญชี</button>
    </div><button type="button" class="google-login__retry" hidden>ลอง Google Login อีกครั้ง</button>`);
  const container = root.querySelector(".google-login__button"), message = root.querySelector(".login-message"),
    link = root.querySelector(".google-login__link"), email = link.querySelector('input[type="email"]'),
    password = link.querySelector('input[type="password"]'), retry = root.querySelector(".google-login__retry");
  let busy = false, preparing = false, exchanging = false, completed = false, generation = 0, timer, expiryTimer, cfg;
  const say = (text, error = false) => { message.textContent = text; message.setAttribute("role", error ? "alert" : "status"); };
  const lock = value => {
    busy = value; form.inert = value; root.setAttribute("aria-busy", String(value));
    container.inert = value; link.inert = value; retry.disabled = value;
    if (fallback) fallback.disabled = value;
  };
  const showFallback = () => { if (fallback) fallback.hidden = false; };
  // Capture prevents simultaneous password/Google requests from racing storage.
  form.addEventListener("submit", event => { if (busy) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  async function prepare() {
    if (busy || preparing || form.getAttribute("aria-busy") === "true") return;
    const ticket = ++generation;
    target.clearTimeout(timer); target.clearTimeout(expiryTimer);
    preparing = true; root.setAttribute("aria-busy", "true"); retry.disabled = true;
    showFallback(); if (fallback) fallback.disabled = true;
    retry.hidden = true; container.replaceChildren(); say("กำลังเตรียม Google Login...");
    try {
      cfg = await config();
      if (!cfg.enabled) { say("ยังไม่เปิดใช้งาน"); return; }
      const purpose = link.hidden ? "login" : "link";
      const request = await challenge({ role, purpose });
      const google = await loadProvider();
      if (ticket !== generation) return;
      google.initialize({ client_id: cfg.clientId, nonce: request.nonce, ux_mode: "popup", auto_select: false,
        callback: async response => {
          if (ticket !== generation || exchanging || form.getAttribute("aria-busy") === "true") return;
          // A late response after cancellation/expiry is ignored by generation.
          exchanging = true;
          let needsLink = false;
          target.clearTimeout(timer); target.clearTimeout(expiryTimer); lock(true); say("กำลังยืนยันบัญชี Google...");
          try {
            const body = { role, purpose, credential: response.credential, requestId: request.requestId, requestToken: request.requestToken };
            if (purpose === "link") { body.email = email.value.trim(); body.password = password.value; }
            let result = await authenticate(body);
            password.value = "";
            if (result.confirmationRequired) {
              say("กรุณาตรวจบัญชีเป้าหมายและยืนยันการผูกบัญชี");
              result = await confirmLink(result);
              if (!result) {
                say("ยกเลิกหรือหมดเวลายืนยันการผูกบัญชี กรุณาเริ่มใหม่เมื่อพร้อม");
                ++generation; container.replaceChildren(); showFallback(); retry.hidden = false;
                return;
              }
            }
            if (ticket !== generation) return;
            accept(result, role, { saveStudentSession: saveStudent, storage: target.sessionStorage,
              remember: !!document.getElementById("rememberMe")?.checked, location: target.location });
            completed = true;
            ++generation; // Successful session cannot be overwritten by another callback.
          } catch (error) {
            if (ticket !== generation) return;
            if (error.data?.code === "GOOGLE_LINK_REQUIRED" && cfg.linkingEnabled) {
              needsLink = true;
              link.hidden = false; say("ยืนยันบัญชี KIWI เดิมเพื่อผูก Google ครั้งแรก");
              email.focus();
            } else { say(error.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่", true); toast(message.textContent, "error"); }
            retry.hidden = false;
            ++generation; container.replaceChildren(); showFallback();
          } finally {
            exchanging = false; password.value = ""; lock(completed);
            if (needsLink) prepare();
          }
        },
      });
      google.renderButton(container, { type: "standard", theme: "outline", size: "large", text: "signin_with", width: Math.min(root.clientWidth || 300, 400),
        click_listener: () => {
          if (busy || form.getAttribute("aria-busy") === "true") return;
          lock(true); say("เลือกบัญชีในหน้าต่าง Google หากยกเลิกสามารถลองใหม่ได้");
          timer = target.setTimeout(() => {
            if (ticket !== generation) return;
            ++generation; password.value = ""; lock(false); container.replaceChildren(); showFallback(); retry.hidden = false;
            say("ยังไม่ได้รับการยืนยันจาก Google กรุณาลองใหม่เมื่อพร้อม", true);
          }, 60000);
        }, locale: "th" });
      if (fallback) fallback.hidden = true;
      say(purpose === "link" ? "กรอกสองช่องด้านล่าง แล้วกดปุ่ม Google เพื่อผูกกับบัญชี KIWI เดิม" : "เข้าสู่ระบบด้วยบัญชี Google ที่ได้รับอนุญาต");
      expiryTimer = target.setTimeout(() => { if (ticket === generation && !busy) { ++generation; container.replaceChildren(); showFallback(); retry.hidden = false; say("คำขอหมดอายุ กรุณาลอง Google Login อีกครั้ง"); } }, 290000);
    } catch (error) {
      if (ticket === generation) { showFallback(); say(error.message || "Google Login ยังไม่พร้อมใช้งาน", true); retry.hidden = false; }
    } finally { preparing = false; if (ticket === generation) { root.setAttribute("aria-busy", "false"); retry.disabled = false; if (fallback) fallback.disabled = busy; } }
  }
  fallback?.addEventListener("click", () => {
    if (busy || preparing || form.getAttribute("aria-busy") === "true") return;
    if (cfg?.enabled === false) {
      say("ยังไม่เปิดใช้งาน");
      toast("ยังไม่เปิดให้เข้าสู่ระบบด้วย Google", "info");
      return;
    }
    prepare();
  });
  retry.addEventListener("click", prepare);
  root.querySelector(".google-login__cancel").addEventListener("click", () => {
    if (busy) return; password.value = ""; email.value = ""; link.hidden = true; prepare();
  });
  prepare();
  return { retry: prepare, dispose() { ++generation; target.clearTimeout(timer); target.clearTimeout(expiryTimer); password.value = ""; lock(false); } };
}
if (typeof document !== "undefined") mountGoogleLogin({ document });
