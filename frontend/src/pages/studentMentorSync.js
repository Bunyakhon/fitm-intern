// One timer and one request per panel. Status always comes from refresh()/API.
export function createMentorStatusSync({ refresh, isPending, isBusy, window, document, interval = 10000 }) {
  let active = false, paused = false, disposed = false, timer = null, flight = null, lastRefresh = -Infinity;
  const visible = () => active && !paused && !disposed && document.visibilityState !== "hidden";
  function clearTimer() { if (timer !== null) window.clearTimeout(timer); timer = null; }
  function update() {
    clearTimer();
    if (visible() && isPending() && !flight) timer = window.setTimeout(() => request(true), interval);
  }
  function request(force = false) {
    clearTimer();
    if (!visible()) return Promise.resolve(false);
    if (flight) return flight;
    if (isBusy() || (!force && Date.now() - lastRefresh < 500)) { update(); return Promise.resolve(false); }
    lastRefresh = Date.now();
    // Defer refresh so synchronous render/update sees the in-flight guard.
    flight = Promise.resolve().then(refresh).finally(() => { flight = null; update(); });
    return flight;
  }
  const resume = () => { if (visible()) request(); else clearTimer(); };
  const hide = () => { paused = true; clearTimer(); };
  const show = () => { paused = false; resume(); };
  window.addEventListener("focus", resume);
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", show);
  return {
    update,
    setActive(value) { active = Boolean(value); if (active) return request(true); clearTimer(); return Promise.resolve(false); },
    destroy() {
      disposed = true; clearTimer();
      window.removeEventListener("focus", resume); document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow", show);
    },
  };
}
