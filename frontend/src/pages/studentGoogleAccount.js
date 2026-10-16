import { googleConfig, googleStudentStatus, googleStudentChallenge, googleStudentLink, googleStudentConfirm } from "../api/googleAuth.api.js";
import { getStudentToken, subscribeStudentSession } from "../auth/studentAuthStorage.js";
import { loadGoogleProvider, confirmGoogleLink } from "./googleLogin.js";
import { showToast, setButtonLoading } from "../ui/feedback.js";

export function mountStudentGoogleAccount({ document, target = window, status = googleStudentStatus,
  config = googleConfig, challenge = googleStudentChallenge, link = googleStudentLink, confirm = googleStudentConfirm,
  getToken = getStudentToken, subscribe = subscribeStudentSession, toast = showToast,
  loadProvider = () => loadGoogleProvider(document, target),
  confirmLink = preview => confirmGoogleLink(preview, { target, confirm }) } = {}) {
  const root = document.getElementById("studentGoogleAccount");
  if (!root) return;
  const form = root.querySelector("#studentGoogleForm"), password = root.querySelector("#studentGooglePassword"),
    connect = root.querySelector("#studentGoogleConnect"), provider = root.querySelector("#studentGoogleProvider"),
    cancel = root.querySelector("#studentGoogleCancel"), reload = root.querySelector("#studentGoogleReload"),
    message = root.querySelector("#studentGoogleStatus");
  let busy = false, exchanging = false, canLink = false, generation = 0, timer, expiryTimer;
  const say = (text, error = false) => {
    message.textContent = text; message.className = `message ${error ? "error" : "info"}`;
    message.setAttribute("role", error ? "alert" : "status");
  };
  function lock(value) {
    busy = value; form.inert = value; reload.disabled = value;
    root.setAttribute("aria-busy", String(value));
    setButtonLoading(connect, value, "กำลังเตรียม Google...", "เชื่อมต่อ Google");
  }
  function reset() {
    ++generation; target.clearTimeout(timer); target.clearTimeout(expiryTimer);
    password.value = ""; provider.replaceChildren(); provider.inert = false;
    cancel.hidden = true; cancel.disabled = false; form.hidden = !canLink; lock(false);
  }
  const current = (ticket, token) => ticket === generation && !!token && token === getToken();
  async function load() {
    if (busy) return;
    reset(); canLink = false; form.hidden = true;
    const token = getToken(), ticket = generation;
    if (!token) { say("กรุณาเข้าสู่ระบบใหม่เพื่อจัดการบัญชี Google", true); return; }
    lock(true); say("กำลังตรวจสอบสถานะการเชื่อม Google...");
    try {
      const result = await status();
      if (!current(ticket, token)) return;
      canLink = result.canLink === true;
      form.hidden = !canLink;
      say(result.linked ? "เชื่อมต่อ Google แล้ว สามารถเข้าสู่ระบบด้วย Google ได้"
        : !result.enabled ? "ยังไม่เปิดใช้งานการเชื่อมต่อ Google"
          : canLink ? "ยังไม่ได้เชื่อม Google ยืนยันรหัสผ่านบัญชีปัจจุบันเพื่อเริ่มเชื่อมต่อ"
            : "ยังไม่สามารถเชื่อม Google ได้ กรุณาติดต่อผู้ดูแลระบบ");
    } catch (error) {
      if (current(ticket, token)) { say(error.message || "ตรวจสอบสถานะ Google ไม่สำเร็จ กรุณาลองใหม่", true); }
    } finally { if (ticket === generation) lock(false); }
  }
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !canLink || !password.value) return;
    const token = getToken(), ticket = ++generation;
    if (!token) { reset(); say("กรุณาเข้าสู่ระบบใหม่", true); return; }
    lock(true); cancel.hidden = false;
    try {
      const cfg = await config();
      if (!current(ticket, token)) return;
      if (!cfg.enabled || !cfg.linkingEnabled) throw new Error("ยังไม่เปิดใช้งานการเชื่อมต่อ Google");
      const request = await challenge();
      if (!current(ticket, token)) return;
      const google = await loadProvider();
      if (!current(ticket, token)) return;
      google.initialize({ client_id: cfg.clientId, nonce: request.nonce, ux_mode: "popup", auto_select: false,
        callback: async response => {
          if (!current(ticket, token) || exchanging) return;
          exchanging = true; cancel.disabled = true; provider.inert = true;
          target.clearTimeout(timer); target.clearTimeout(expiryTimer);
          say("กำลังตรวจสอบ Google และเจ้าของบัญชีปัจจุบัน...");
          try {
            const preview = await link({ credential: response.credential, requestId: request.requestId,
              requestToken: request.requestToken, password: password.value });
            password.value = "";
            if (!current(ticket, token)) return;
            const result = await confirmLink(preview);
            if (!current(ticket, token)) return;
            if (result && result.linked !== true) throw new Error("ยังยืนยันสถานะการเชื่อม Google ไม่ได้ กรุณาตรวจสถานะอีกครั้ง");
            reset();
            if (!result) { say("ยกเลิกหรือหมดเวลายืนยันการเชื่อม Google"); return; }
            canLink = false; form.hidden = true;
            toast(result.message || "เชื่อมต่อ Google สำเร็จ", "success");
            await load();
          } catch (error) {
            if (current(ticket, token)) {
              reset(); say(error.message || "เชื่อมต่อ Google ไม่สำเร็จ กรุณาลองใหม่", true);
              toast(message.textContent, "error");
            }
          } finally { exchanging = false; password.value = ""; }
        },
      });
      google.renderButton(provider, { type: "standard", theme: "outline", size: "large", text: "continue_with",
        width: Math.min(root.clientWidth || 300, 400), locale: "th", click_listener: () => {
          if (!current(ticket, token)) return;
          provider.inert = true;
          timer = target.setTimeout(() => {
            if (current(ticket, token) && !exchanging) { reset(); say("ยังไม่ได้รับการยืนยันจาก Google กรุณาลองใหม่", true); }
          }, 60000);
        } });
      say("เลือกบัญชี Google ผ่านปุ่มด้านล่าง แล้วตรวจสอบบัญชีก่อนยืนยันการเชื่อม");
      expiryTimer = target.setTimeout(() => {
        if (current(ticket, token) && !exchanging) { reset(); say("คำขอเชื่อม Google หมดอายุ กรุณาเริ่มใหม่", true); }
      }, Math.max(0, Date.parse(request.expiresAt) - Date.now()));
    } catch (error) {
      if (current(ticket, token)) { reset(); say(error.message || "เตรียมเชื่อม Google ไม่สำเร็จ", true); toast(message.textContent, "error"); }
    }
  });
  cancel.addEventListener("click", () => { if (!exchanging) { reset(); say("ยกเลิกการเชื่อม Google แล้ว"); } });
  reload.addEventListener("click", load);
  const unsubscribe = subscribe(() => { canLink = false; reset(); say("สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่", true); }, target);
  return { load, dispose() { canLink = false; reset(); unsubscribe?.(); } };
}
