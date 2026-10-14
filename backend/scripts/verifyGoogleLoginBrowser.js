// Native Edge UI acceptance with an explicitly MOCKED Google provider/API.
// Never authenticates a real user, calls Google, or accesses any database.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises"), path = require("node:path"), os = require("node:os"), http = require("node:http");
const { spawn } = require("node:child_process");
const jwt = require("jsonwebtoken");
const workspace = path.resolve(__dirname, "../.."), dist = path.join(workspace, "frontend/dist");
const evidence = path.join(workspace, "docs/audits/evidence/google-oauth");
const destinations = { student: "/src/student_coop/student_coop.html", teacher: "/src/teacher_coop/teacher_coop.html", department_head: "/src/department_head/department_head.html", department_staff: "/src/department_staff/department_staff.html" };
async function until(read, label) { const end = Date.now() + 15000; while (Date.now() < end) { if (await read()) return; await new Promise(resolve => setTimeout(resolve, 50)); } throw Error("Timeout: " + label); }
async function connect(url, onEvent) {
  const socket = new WebSocket(url), pending = new Map(); let sequence = 0;
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data), waiter = pending.get(message.id);
    if (waiter) { pending.delete(message.id); message.error ? waiter.reject(Error(message.error.message)) : waiter.resolve(message.result); }
    else onEvent?.(message);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(Error("CDP timeout: " + method)); }, 10000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw Error(response.exceptionDetails.text);
    return response.result.value;
  };
  return { send, evaluate, socket };
}
async function main() {
  let server, edge, profile, tab;
  const results = { date: "2026-10-11", provider: "MOCKED — not Google provider E2E", database: "none", cases: [], runtime_errors: [] };
  try {
    await fs.mkdir(evidence, { recursive: true });
    server = http.createServer(async (req, res) => {
      try {
        const relative = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/^\/+/, "");
        const file = path.resolve(dist, relative || "login.html");
        if (!file.startsWith(dist + path.sep)) throw Error("Outside dist");
        const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png" };
        const contents = await fs.readFile(file);
        res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }); res.end(contents);
      } catch { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const origin = "http://127.0.0.1:" + server.address().port;
    profile = await fs.mkdtemp(path.join(os.tmpdir(), "fitm-google-browser-"));
    edge = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", ["--headless=new", "--disable-extensions", "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", "--user-data-dir=" + profile, "--no-first-run", "--disable-background-networking", "about:blank"], { windowsHide: true, stdio: "ignore" });
    let debugPort;
    await until(async () => { try { debugPort = Number((await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); return !!debugPort; } catch { return false; } }, "Edge");
    const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" })).json();
    let enabled = true, selectedRole = "student", exchanges = 0;
    tab = await connect(target.webSocketDebuggerUrl, async event => {
      if (event.method === "Runtime.exceptionThrown") results.runtime_errors.push(event.params.exceptionDetails.text);
      if (event.method !== "Fetch.requestPaused") return;
      const { requestId, request, resourceType } = event.params, url = new URL(request.url);
      try {
        let body, type = "application/json";
        if (url.pathname.startsWith("/api/auth/google")) {
          if (request.method === "OPTIONS") body = {};
          else if (url.pathname.endsWith("/config")) body = { enabled, clientId: "123-synthetic.apps.googleusercontent.com", linkingEnabled: true };
          else if (url.pathname.endsWith("/challenge")) body = { nonce: "synthetic-browser-nonce", requestId: "synthetic-browser-request", requestToken: "synthetic-browser-secret" };
          else {
            exchanges++;
            const input = JSON.parse(request.postData); assert.equal(input.role, selectedRole); assert.equal(input.credential, "synthetic-google-credential");
            const actor = selectedRole === "department_head" ? "teacher" : selectedRole;
            const data = { id: "synthetic-account", student_id: "synthetic-code", first_name: "Synthetic", last_name: "Browser", status: selectedRole === "student" ? "pending" : "active", is_active: true, is_department_head: selectedRole === "department_head" };
            body = { role: selectedRole, data, teacher: data, staff: data, redirect: destinations[selectedRole],
              token: jwt.sign({ id: data.id, student_id: data.student_id, teacher_id: data.id, staff_id: data.id, actor_type: actor, role: selectedRole }, "synthetic-browser-key", { expiresIn: "1h" }) };
          }
        } else if (resourceType === "Document" && Object.values(destinations).includes(url.pathname)) { body = "<!doctype html><title>Synthetic dashboard</title><p>Mock acceptance destination</p>"; type = "text/html"; }
        else { await tab.send("Fetch.continueRequest", { requestId }); return; }
        await tab.send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: type }, { name: "Access-Control-Allow-Origin", value: origin }, { name: "Access-Control-Allow-Headers", value: "content-type" }], body: Buffer.from(typeof body === "string" ? body : JSON.stringify(body)).toString("base64") });
      } catch (error) { results.runtime_errors.push(error.message); await tab.send("Fetch.failRequest", { requestId, errorReason: "Failed" }); }
    });
    await tab.send("Page.enable"); await tab.send("Runtime.enable");
    await tab.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `window.google={accounts:{id:{initialize(value){window.syntheticGoogle=value},renderButton(element,options){const b=document.createElement('button');b.id='syntheticGoogle';b.textContent='Sign in with Google (mock)';b.onclick=()=>{options.click_listener();window.syntheticGoogle.callback({credential:'synthetic-google-credential'})};element.append(b)}}}}` });
    const pages = { student: "login.html", teacher: "teacher-login.html", department_head: "department-head-login.html", department_staff: "staff-login.html" };
    for (const role of Object.keys(pages)) for (const width of [1440, 390]) {
      selectedRole = role; enabled = true;
      await tab.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
      await tab.send("Page.navigate", { url: origin + "/" + pages[role] });
      await until(() => tab.evaluate("!!document.getElementById('syntheticGoogle')"), "rendered Google button");
      await tab.evaluate("Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{})))");
      assert.equal(await tab.evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
      if (role === "student") await tab.evaluate(`document.getElementById('rememberMe').checked=${width === 1440}`);
      const shot = await tab.send("Page.captureScreenshot", { format: "png" });
      await fs.writeFile(path.join(evidence, role + "-" + width + ".png"), Buffer.from(shot.data, "base64"));
      const box = await tab.evaluate("(()=>{const r=document.getElementById('syntheticGoogle').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
      await tab.send("Input.dispatchMouseEvent", { type: "mousePressed", ...box, button: "left", clickCount: 1 });
      await tab.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...box, button: "left", clickCount: 1 });
      await until(() => tab.evaluate(`location.pathname===${JSON.stringify(destinations[role])}`), "authorized destination");
      const key = role === "student" ? "token" : role === "department_staff" ? "staffToken" : "teacherToken";
      assert.equal(await tab.evaluate(`!!sessionStorage.getItem(${JSON.stringify(key)})`), true);
      if (role === "student") assert.equal(await tab.evaluate("!!localStorage.getItem('token')"), width === 1440);
      results.cases.push({ role, width, status: "PASS", native_click: true, no_horizontal_overflow: true });
    }
    enabled = false; await tab.send("Page.navigate", { url: origin + "/login.html" });
    await until(() => tab.evaluate("document.querySelector('#googleLogin .login-message')?.textContent.includes('ยังไม่เปิดใช้งาน')"), "disabled feature");
    assert.equal(await tab.evaluate("document.querySelector('.auth-form').inert"), false);
    results.cases.push({ scenario: "disabled Google preserves password form", status: "PASS" });
    assert.equal(exchanges, 8); assert.deepEqual(results.runtime_errors, []); results.status = "PASS — mocked UI only";
  } finally {
    tab?.socket.close();
    if (edge) { edge.kill(); await new Promise(resolve => { if (edge.exitCode !== null) resolve(); else edge.once("exit", resolve); }); }
    if (server) await new Promise(resolve => server.close(resolve));
    if (profile) {
      assert.equal(path.dirname(profile), path.resolve(os.tmpdir())); assert.ok(path.basename(profile).startsWith("fitm-google-browser-"));
      await fs.rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
    await fs.writeFile(path.join(evidence, "browser-results.json"), JSON.stringify(results, null, 2));
  }
  console.log(JSON.stringify({ status: results.status, cases: results.cases.length, provider: results.provider }));
}
main().catch(error => { console.error("Mock browser acceptance failed:", error.message); process.exitCode = 1; });
