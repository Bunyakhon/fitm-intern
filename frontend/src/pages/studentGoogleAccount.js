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
    message = root.querySelector("#studentGoogleStatus"), badge = root.querySelector("#studentGoogleBadge");
  let busy = false, exchanging = false, canLink = false, generation = 0, timer, expiryTimer, lastStatus = null;
  function state(value) {
    root.dataset.state = value;
    if (badge) badge.textContent = { idle: "ยังไม่ได้ตรวจสอบ", loading: "กำลังตรวจสอบ", linked: "เชื่อมต่อแล้ว", unlinked: "ยังไม่ได้เชื่อมต่อ", disabled: "ยังไม่เปิดใช้งาน", error: "เกิดข้อผิดพลาด", preparing: "กำลังเตรียมการเชื่อมต่อ", awaiting: "รอเลือกบัญชี Google", confirming: "กำลังตรวจสอบและยืนยัน" }[value];
    root.setAttribute("aria-busy", String(["loading", "preparing", "confirming"].includes(value)));
  }
  const say = (text, error = false) => {
    message.textContent = text; message.className = `message ${error ? "error" : "info"}`;
    message.setAttribute("role", error ? "alert" : "status");
    if (error) state("error");
  };
  function lock(value, checking = false) {
    busy = value; form.inert = value; reload.disabled = value;
    root.setAttribute("aria-busy", String(value));
    setButtonLoading(connect, value && !checking, "กำลังเตรียม Google...", "เชื่อมต่อ Google");
    connect.disabled = value;
    setButtonLoading(reload, value && checking, "กำลังตรวจสอบ...", "ตรวจสอบสถานะอีกครั้ง");
    reload.disabled = value;
  }
  function reset() {
    ++generation; target.clearTimeout(timer); target.clearTimeout(expiryTimer);
    password.value = ""; provider.replaceChildren(); provider.inert = false;
    cancel.hidden = true; cancel.disabled = false; form.hidden = !canLink; lock(false);
    password.removeAttribute("aria-invalid");
    state(lastStatus?.linked ? "linked" : lastStatus ? lastStatus.enabled ? "unlinked" : "disabled" : "idle");
  }
  const current = (ticket, token) => ticket === generation && !!token && token === getToken();
  async function load() {
    if (busy) return;
    reset(); canLink = false; form.hidden = true;
    const token = getToken(), ticket = generation;
    if (!token) { say("กรุณาเข้าสู่ระบบใหม่เพื่อจัดการบัญชี Google", true); return; }
    lock(true, true); state("loading"); say("กำลังตรวจสอบสถานะการเชื่อมต่อ Google...");
    try {
      const result = await status();
      if (!current(ticket, token)) return;
      if (typeof result?.linked !== "boolean" || typeof result.enabled !== "boolean" || typeof result.canLink !== "boolean") throw new Error("ยังยืนยันสถานะ Google ไม่ได้ กรุณาตรวจสอบอีกครั้ง");
      lastStatus = result;
      canLink = !result.linked && result.enabled && result.canLink;
      form.hidden = !canLink;
      state(result.linked ? "linked" : !result.enabled ? "disabled" : "unlinked");
      say(result.linked ? "เชื่อมต่อ Google กับบัญชีนี้แล้ว ไม่ต้องเชื่อมต่อซ้ำ"
        : !result.enabled ? "ยังไม่เปิดใช้งานการเชื่อมต่อ Google"
          : canLink ? "ยังไม่ได้เชื่อม Google ยืนยันรหัสผ่านบัญชีปัจจุบันเพื่อเริ่มเชื่อมต่อ"
            : "บัญชีนี้ยังไม่ได้เชื่อม Google และขณะนี้ระบบไม่อนุญาตให้เริ่มเชื่อม กรุณาติดต่อผู้ดูแลระบบ");
    } catch (error) {
      if (current(ticket, token)) { say(error.message || "ตรวจสอบสถานะ Google ไม่สำเร็จ กรุณาลองใหม่", true); }
    } finally { if (ticket === generation) lock(false); }
  }
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !canLink || !password.value) return;
    const token = getToken(), ticket = ++generation;
    if (!token) { reset(); say("กรุณาเข้าสู่ระบบใหม่", true); return; }
    lock(true); state("preparing"); cancel.hidden = false;
    try {
      const cfg = await config();
      if (!current(ticket, token)) return;
      if (!cfg.enabled || !cfg.linkingEnabled) {
        canLink = false; lastStatus = { linked: false, enabled: false, canLink: false }; reset();
        say("ยังไม่เปิดใช้งานการเชื่อมต่อ Google กรุณาตรวจสอบสถานะอีกครั้งภายหลัง"); return;
      }
      const request = await challenge();
      if (!current(ticket, token)) return;
      const google = await loadProvider();
      if (!current(ticket, token)) return;
      google.initialize({ client_id: cfg.clientId, nonce: request.nonce, ux_mode: "popup", auto_select: false,
        callback: async response => {
          if (!current(ticket, token) || exchanging) return;
          exchanging = true; cancel.disabled = true; provider.inert = true;
          state("confirming");
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
            if (result?.linked === true) { canLink = false; lastStatus = { linked: true, enabled: true, canLink: false }; }
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
        width: Math.min(provider.clientWidth || root.clientWidth || 300, 400), locale: "th", click_listener: () => {
          if (!current(ticket, token)) return;
          provider.inert = true;
          timer = target.setTimeout(() => {
            if (current(ticket, token) && !exchanging) { reset(); say("ยังไม่ได้รับการยืนยันจาก Google กรุณาลองใหม่", true); }
          }, 60000);
        } });
      say("เลือกบัญชี Google ผ่านปุ่มด้านล่าง แล้วตรวจสอบบัญชีก่อนยืนยันการเชื่อม");
      state("awaiting");
      expiryTimer = target.setTimeout(() => {
        if (current(ticket, token) && !exchanging) { reset(); say("คำขอเชื่อม Google หมดอายุ กรุณาเริ่มใหม่", true); }
      }, Math.max(0, Date.parse(request.expiresAt) - Date.now()));
    } catch (error) {
      if (current(ticket, token)) { reset(); say(error.message || "เตรียมเชื่อม Google ไม่สำเร็จ", true); toast(message.textContent, "error"); }
    }
  });
  password.addEventListener("invalid", event => {
    event.preventDefault(); password.setAttribute("aria-invalid", "true");
    say("กรุณากรอกรหัสผ่านบัญชีเว็บไซต์ปัจจุบันเพื่อยืนยันเจ้าของบัญชีก่อนเชื่อม Google", true); password.focus();
  });
  password.addEventListener("input", () => password.removeAttribute("aria-invalid"));
  cancel.addEventListener("click", () => { if (!exchanging) { reset(); say("ยกเลิกการเชื่อม Google แล้ว"); } });
  reload.addEventListener("click", load);
  const unsubscribe = subscribe(() => { canLink = false; lastStatus = null; reset(); say("สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่", true); }, target);
  return { load, dispose() { canLink = false; lastStatus = null; reset(); unsubscribe?.(); } };
}
