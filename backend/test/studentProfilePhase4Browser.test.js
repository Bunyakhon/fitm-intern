const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs/promises"), path = require("node:path"), http = require("node:http"), crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const { clickMouse } = require("../scripts/staffBrowserInput");
const workspace = path.resolve(__dirname, "../..");
async function until(read, label) {
  const end = Date.now() + 20000;
  while (Date.now() < end) { if (await read()) return; await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error("Timed out: " + label);
}
async function connect(url, onException) {
  const socket = new WebSocket(url), pending = new Map(); let sequence = 0, reloadAllowed = false;
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", event => { const message = JSON.parse(event.data), waiter = pending.get(message.id); if (reloadAllowed && message.method === "Page.javascriptDialogOpening" && message.params.type === "beforeunload") { socket.send(JSON.stringify({id:++sequence,method:"Page.handleJavaScriptDialog",params:{accept:true}})); reloadAllowed=false; } if (message.method === "Page.domContentEventFired") reloadAllowed=false; if (message.method === "Runtime.exceptionThrown") onException?.(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text); if (waiter) { pending.delete(message.id); message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result); } });
  socket.addEventListener("close", () => { for (const waiter of pending.values()) waiter.reject(new Error("Browser connection closed")); pending.clear(); });
  return { socket, allowReload() { reloadAllowed=true; }, send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }, async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value;
  } };
}
test("Phase 4 full dashboard Edge browser and production profile API on isolated PostgreSQL", { skip: process.env.FITM_PROFILE_PHASE4_TEST !== "true", timeout: 900000 }, async t => {
  const database = process.env.FITM_PROFILE_PHASE4_DATABASE; assert.match(database, /^fitm_profile_4_[a-f0-9]{32}$/); assert.equal(process.env.DB_NAME, database);
  const { sequelize, Student, StudentProfile } = require("../src/models");
  sequelize.addHook("afterConnect", async connection => { const guard = (await connection.query("SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0]; assert.equal(guard.name, database); assert.equal(guard.marker, process.env.FITM_PROFILE_PHASE4_MARKER); });
  const owner = "33333333-3333-4333-8333-333333333333";
  const results = { pass: 0, fail: 0, skipped: 0, cases: [], screenshots: [], runtime_errors: [], api_source: "production routes/controllers/Sequelize", browser: "Microsoft Edge headless", synthetic_only: true };
  let server, vite, edge; const tabs = []; let browserProfile;
  const artifacts = path.join(workspace, "docs/audits/evidence/student-profile-phase4");
  try {
    await sequelize.authenticate(); assert.equal(await Student.count(), 0);
    await Student.create({ id: owner, student_id: "990000000004", first_name: "นักศึกษา", last_name: "ทดสอบ", email: "synthetic-4@email.kmutnb.ac.th", password: crypto.randomBytes(20).toString("hex"), major: "IT", year_level: 3, gpa: "3.25", track: "co_op" });
    await StudentProfile.create({ student_id: owner, birth_date: "2000-02-29", prefix: "นาย", medical_conditions: "ข้อมูลสุขภาพทดสอบเดิม", related_skills: "ทักษะเดิมทดสอบ", parent_contact_address: "ที่อยู่ผู้ปกครองทดสอบ", father_name: "บิดาทดสอบ" });
    const express = require("express"), app = express(); app.use(require("cors")({ origin: true })); app.use(express.json());
    const requests = []; let forcedStatus = null, holdMethod = null, heldResponse = null, loseImportResponse = false;
    app.use((req, res, next) => {
      if (loseImportResponse && req.path === "/api/student-profile/pdf-import/commit") {
        loseImportResponse = false; const json = res.json.bind(res);
        res.json = body => body.import_status === "committed" ? json({ message: "Synthetic response failure after actual SQL COMMIT" }) && res : json(body);
        const status = res.status.bind(res); res.status = code => status(code === 201 || code === 200 ? 500 : code);
      }
      next();
    });
    app.use((req, res, next) => { requests.push({ method: req.method, path: req.path, if_match: !!req.get("If-Match") }); if (forcedStatus && req.method === "PUT" && req.path === "/api/student-profile/me") { const code = forcedStatus; forcedStatus = null; return res.status(code).json({ message: "Synthetic precondition required" }); } next(); });
    app.use((req, res, next) => {
      if (holdMethod && req.method === holdMethod && req.path === "/api/student-profile/me") {
        holdMethod = null; const json = res.json.bind(res); res.json = body => { heldResponse = () => json(body); return res; };
      }
      next();
    });
    app.use("/api/auth", require("../src/routes/auth.routes")); app.use("/api/student-profile", require("../src/routes/studentProfile.routes")); app.use("/api/teachers", require("../src/routes/teacher.routes")); app.use("/api/student-coop", require("../src/routes/studentCoop.routes").createStudentCoopRouter());
    server = http.createServer(app); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); const origin = "http://127.0.0.1:" + server.address().port;
    const token = require("jsonwebtoken").sign({ id: owner, student_id: "990000000004", role: "student", actor_type: "student" }, process.env.JWT_SECRET, { expiresIn: "20m" });
    const portServer = http.createServer(); await new Promise(resolve => portServer.listen(0, "127.0.0.1", resolve)); const port = portServer.address().port; await new Promise(resolve => portServer.close(resolve));
    const frontOrigin = "http://127.0.0.1:" + port;
    vite = spawn(process.execPath, [path.join(workspace, "frontend/node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: path.join(workspace, "frontend"), env: { ...process.env, VITE_API_URL: origin }, windowsHide: true, stdio: "ignore" });
    await until(async () => { try { return (await fetch(frontOrigin)).ok; } catch { return false; } }, "Vite ready");
    browserProfile = await fs.mkdtemp(path.join(process.env.TEMP, "fitm-profile-4-edge-"));
    const executable = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"; await fs.access(executable);
    edge = spawn(executable, ["--headless=new", "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", "--user-data-dir=" + browserProfile, "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "about:blank"], { windowsHide: true, stdio: "ignore" });
    let debugPort; await until(async () => { try { debugPort = Number((await fs.readFile(path.join(browserProfile, "DevToolsActivePort"), "utf8")).split("\n")[0]); return !!debugPort; } catch { return false; } }, "Edge ready");
    for (let i = 0; i < 2; ++i) {
      const target = await (await fetch("http://127.0.0.1:" + debugPort + "/json/new?about:blank", { method: "PUT" })).json();
      const tab = await connect(target.webSocketDebuggerUrl, message => results.runtime_errors.push(message)); tabs.push(tab); await tab.send("Page.enable"); await tab.send("Runtime.enable");
      await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: "if(location.origin===" + JSON.stringify(frontOrigin) + ")localStorage.setItem('token'," + JSON.stringify(token) + ");" });
      await tab.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
      await tab.send("Page.navigate", { url: frontOrigin + "/src/student_coop/student_coop.html" });
      await until(() => tab.evaluate("document.getElementById('profileWorkspace-academic-department') && !document.getElementById('profileWorkspace-academic-department').disabled"), "profile bootstrap");
      await clickMouse(tab, expression => tab.evaluate(expression), '.sidebar-item[data-target="panel-profile"]');
    }
    const [a, b] = tabs;
    const click = async (tab, selector) => {
      await tab.send("Page.bringToFront");
      const end = Date.now() + 12000;
      while (true) {
        try { return await clickMouse(tab, expression => tab.evaluate(expression), selector); }
        catch (error) { if (error.message !== "Mouse control is obscured" || Date.now() >= end) throw error; await new Promise(resolve => setTimeout(resolve, 100)); }
      }
    };
    const value = (tab, selector, text) => tab.evaluate("(()=>{const x=document.querySelector(" + JSON.stringify(selector) + ");if(!x)throw Error('Missing input');x.value=" + JSON.stringify(text) + ";x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));})()");
    const latest = async () => { const response = await fetch(origin + "/api/student-profile/me", { headers: { Authorization: "Bearer " + token } }); assert.equal(response.status, 200); return response.json(); };
    const saved = async (tab, selector) => {
      try { await until(() => tab.evaluate("document.querySelector(" + JSON.stringify(selector) + ").textContent.includes('บันทึกเรียบร้อยแล้ว')"), "save result"); }
      catch (error) { error.message += ": " + await tab.evaluate("document.querySelector(" + JSON.stringify(selector) + ")?.textContent"); throw error; }
    };
    const form = key => '[data-profile-entry="' + key + '"]';
    const confirm = async tab => { await click(tab, ".app-confirm-overlay:not(.is-leaving) .app-confirm-modal__confirm"); await until(() => tab.evaluate("!document.querySelector('.app-confirm-overlay')"), "confirmation closed"); };
    const check = async (name, callback) => { await t.test(name, async () => { try { await callback(); ++results.pass; results.cases.push({ name, status: "PASS" }); } catch (error) { ++results.fail; results.cases.push({ name, status: "FAIL", reason: error.message, diagnostic: error.diagnostic }); throw error; } finally { await fs.writeFile(path.join(path.dirname(process.env.STORAGE_ROOT), "progress.json"),JSON.stringify(results,null,2)); } }); assert.equal(results.fail,0,"Stop after a failed dependent case"); };
    await check("five tabs/default/ARIA, keyboard navigation and no GET on switching", async () => {
      assert.equal(await a.evaluate("document.querySelectorAll('#studentProfileTabs [role=tab]').length"), 5); assert.equal(await a.evaluate("document.getElementById('profilePersonalTab').getAttribute('aria-selected')"), "true");
      const count = requests.filter(req => req.path === "/api/student-profile/me").length;
      await a.evaluate("document.getElementById('profilePersonalTab').focus()");
      await a.send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 }); await a.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
      assert.equal(await a.evaluate("document.activeElement.id"), "profileContactTab");
      for (const id of ["profileEducationTab", "profileDocumentsTab", "profileAccountTab", "profilePersonalTab"]) await click(a, "#" + id);
      assert.equal(requests.filter(req => req.path === "/api/student-profile/me").length, count);
    });
    await check("personal/family drafts survive tab changes and private health stays intact", async () => {
      await value(a, "#profileWorkspace-personal-english_first_name", "Synthetic"); await click(a, "#profileContactTab"); await value(a, "#profileWorkspace-family-father_phone", "0000000001"); await click(a, "#profilePersonalTab");
      assert.equal(await a.evaluate("document.getElementById('profileWorkspace-personal-english_first_name').value"), "Synthetic");
      await click(a, form("personal") + ' button[type="submit"]'); await saved(a, form("personal") + " .message");
      await click(a, "#profileContactTab"); await click(a, form("family") + ' button[type="submit"]'); await saved(a, form("family") + " .message");
      const state = await latest(); assert.equal(state.profile.english_first_name, "Synthetic"); assert.equal(state.profile.father_phone, "0000000001"); assert.equal(state.profile.medical_conditions, "ข้อมูลสุขภาพทดสอบเดิม");
    });
    await check("structured addresses and confirmed copy preserve leading zeroes and legacy text", async () => {
      await value(a, "#profileWorkspace-address-registered-house_no", "1/2"); await value(a, "#profileWorkspace-address-registered-postal_code", "00100");
      await click(a, form("address-registered") + ' button[type="submit"]'); await saved(a, form("address-registered") + " .message");
      await click(a, "#profileStructuredAddresses > button"); await confirm(a);
      await until(() => a.evaluate("document.getElementById('profileWorkspace-address-current-house_no').value==='1/2'"), "copy draft");
      await click(a, form("address-current") + ' button[type="submit"]'); await saved(a, form("address-current") + " .message");
      const state = await latest(); assert.equal(state.addresses.length, 2); assert.equal(state.addresses.find(row => row.address_type === "current").postal_code, "00100"); assert.equal(state.profile.parent_contact_address, "ที่อยู่ผู้ปกครองทดสอบ");
    });
    for (const [kind, container, fields, category] of [
      ["education", "profileEducationRecords", { education_level: "bachelor", institution_name: "Synthetic University", gpa: "3.50", graduation_year: "2026" }],
      ["training", "profileTrainingRecords", { course_name: "Synthetic Training", institution: "Synthetic Institute", period_text: "2 weeks" }],
      ["skills", "profileComputerSkills", { skill_name: "Synthetic Computer", proficiency: "very_good" }, "computer"],
      ["skills", "profileLanguageSkills", { skill_name: "Synthetic Language", proficiency: "good" }, "language"],
    ]) await check(kind + " " + (category || "") + " create/update/delete through full page and PostgreSQL", async () => {
      await click(a, "#profileEducationTab"); await click(a, "#" + container + " .profile-section-header button");
      const selector = "#" + container + " .profile-record-list form:last-child";
      for (const [key, text] of Object.entries(fields)) await value(a, selector + ' [name="' + key + '"]', text);
      await click(a, selector + ' button[type="submit"]'); await saved(a, selector + " .message");
      let state = await latest(); const record = state[kind].find(row => row[Object.keys(fields).find(key => key !== "education_level")] === Object.values(fields)[Object.keys(fields).findIndex(key => key !== "education_level")]); assert.ok(record);
      const field = kind === "education" ? "qualification" : kind === "training" ? "qualification" : "skill_name";
      await value(a, selector + ' [name="' + field + '"]', "Updated synthetic");
      await click(a, selector + ' button[type="submit"]'); await saved(a, selector + " .message");
      state = await latest(); assert.equal(state[kind].find(row => row.id === record.id)[field], "Updated synthetic");
      await click(a, selector + " .profile-danger"); await confirm(a); await until(async () => !(await latest())[kind].some(row => row.id === record.id), "owned delete");
    });
    await check("409 in second browser tab preserves draft, shows differences and requires explicit review", async () => {
      await click(b, "#profilePersonalTab"); await value(b, "#profileWorkspace-personal-english_last_name", "Second tab draft");
      await click(b, form("personal") + ' button[type="submit"]');
      await until(() => b.evaluate("document.querySelector('[data-profile-entry=personal] .message').textContent.includes('หน้าต่างอื่น')"), "409 UI");
      assert.equal(await b.evaluate("document.getElementById('profileWorkspace-personal-english_last_name').value"), "Second tab draft");
      assert.equal(await b.evaluate("document.querySelector('[data-profile-entry=personal] .profile-difference').hidden"), false);
      await click(b, form("personal") + " .profile-entry-actions button:nth-child(2)"); await confirm(b);
      await until(() => b.evaluate("document.querySelector('[data-profile-entry=personal] .message').textContent.includes('โหลดฉบับล่าสุดแล้ว')"), "explicit review");
      await click(b, form("personal") + ' button[type="submit"]'); await saved(b, form("personal") + " .message"); assert.equal((await latest()).profile.english_last_name, "Second tab draft");
      await click(a, "#profileWorkspaceReload"); await until(() => a.evaluate("document.getElementById('profileWorkspaceStatus').textContent.includes('โหลดข้อมูลล่าสุดแล้ว')"), "refresh A");
    });
    await check("428 UI retains draft and offers explicit reload without invented revision", async () => {
      await click(a, "#profilePersonalTab"); await value(a, "#profileWorkspace-personal-gender", "Synthetic"); forcedStatus = 428;
      await click(a, form("personal") + ' button[type="submit"]'); await until(() => a.evaluate("document.querySelector('[data-profile-entry=personal] .message').textContent.includes('ต้องโหลดประวัติล่าสุด')"), "428 UI");
      assert.equal(await a.evaluate("document.getElementById('profileWorkspace-personal-gender').value"), "Synthetic");
      await click(a, form("personal") + " .profile-entry-actions button:nth-child(2)"); await confirm(a); await until(() => a.evaluate("document.querySelector('[data-profile-entry=personal] .message').textContent.includes('โหลดฉบับล่าสุดแล้ว')"), "428 review");
      await click(a, form("personal") + ' button[type="submit"]'); await saved(a, form("personal") + " .message");
    });
    await check("private document upload/label/download contract/removal uses If-Match and no public URL", async () => {
      await click(a, "#profileDocumentsTab");
      const directory = path.dirname(process.env.STORAGE_ROOT); const file = path.join(directory, "synthetic-upload.pdf"); await fs.writeFile(file, "%PDF-1.4\nSynthetic document only\n%%EOF");
      await a.send("DOM.enable"); const { root: dom } = await a.send("DOM.getDocument"); const { nodeId } = await a.send("DOM.querySelector", { nodeId: dom.nodeId, selector: "#profileDocument-transcript" }); await a.send("DOM.setFileInputFiles", { nodeId, files: [file] });
      await click(a, '[data-document-type="transcript"] button[type="submit"]'); await saved(a, '[data-document-type="transcript"] > .message');
      let state = await latest(); const doc = state.documents.find(row => row.file_type === "transcript"); assert.ok(doc);
      await click(a, '[data-document-type="transcript"] .profile-document-row .profile-entry-actions button:nth-child(2)');
      const editor = '[data-profile-entry="documents-' + doc.id + '"]';
      await value(a, editor + ' [name="document_label"]', "Synthetic Transcript"); await click(a, editor + ' button[type="submit"]'); await saved(a, editor + " .message");
      assert.equal((await latest()).documents.find(row => row.id === doc.id).document_label, "Synthetic Transcript");
      const downloaded = await fetch(origin + "/api/student-profile/documents/" + doc.id + "/download", { headers: { Authorization: "Bearer " + token } }); assert.equal(downloaded.status, 200); assert.match(downloaded.headers.get("cache-control"), /no-store/);
      const downloadDirectory = path.join(path.dirname(process.env.STORAGE_ROOT), "browser-downloads");
      await fs.mkdir(downloadDirectory, { recursive: true });
      await a.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDirectory });
      await click(a, '[data-document-type="transcript"] .profile-document-row button');
      await until(async () => { try { return (await fs.stat(path.join(downloadDirectory, doc.original_name))).size > 0; } catch { return false; } }, "private blob download from real browser");
      assert.deepEqual(await fs.readFile(path.join(downloadDirectory, doc.original_name)), Buffer.from(await downloaded.arrayBuffer()));
      assert.equal(await a.evaluate("document.querySelectorAll('#profileDocumentCards a[href^=http]').length"), 0);
      await click(a, '[data-document-type="transcript"] .profile-document-row .profile-danger'); await confirm(a); await until(async () => !(await latest()).documents.some(row => row.id === doc.id), "logical document removal");
      assert.ok(requests.some(req => req.method === "POST" && req.path === "/api/student-profile/documents/transcript" && req.if_match));
    });
    await check("all five document types upload through the UI, with supporting label and private ownership", async () => {
      const file = path.join(path.dirname(process.env.STORAGE_ROOT), "synthetic-upload.pdf");
      for (const type of ["transcript", "national_id_copy", "student_id_copy", "supporting_other", "external_profile_pdf"]) {
        const { root: dom } = await a.send("DOM.getDocument"); const { nodeId } = await a.send("DOM.querySelector", { nodeId: dom.nodeId, selector: "#profileDocument-" + type }); await a.send("DOM.setFileInputFiles", { nodeId, files: [file] });
        if (type === "supporting_other") await value(a, "#profileDocument-" + type + "-label", "Synthetic Other");
        await click(a, '[data-document-type="' + type + '"] button[type="submit"]'); await saved(a, '[data-document-type="' + type + '"] > .message');
        assert.ok((await latest()).documents.some(row => row.file_type === type));
      }
      const state = await latest(); assert.ok(state.documents.every(row => !Object.hasOwn(row, "storage_path")));
    });
    await check("stale GET and typing during committed PUT cannot overwrite a newer draft", async () => {
      await click(a, "#profilePersonalTab"); holdMethod = "GET"; heldResponse = null;
      await click(a, "#profileWorkspaceReload"); await until(async () => !!heldResponse, "held old GET");
      await value(a, "#profileWorkspace-personal-english_first_name", "Changed after old GET"); await click(a, form("personal") + ' button[type="submit"]'); await saved(a, form("personal") + " .message");
      heldResponse(); heldResponse = null;
      await until(() => a.evaluate("document.getElementById('profileWorkspaceStatus').classList.contains('success')"), "superseded refresh reflects committed save");
      assert.equal(await a.evaluate("document.getElementById('profileLoadMessage').textContent.trim()"), "");
      assert.equal(await a.evaluate("document.getElementById('profileWorkspace-personal-english_first_name').value"), "Changed after old GET");
      holdMethod = "PUT"; await value(a, "#profileWorkspace-personal-english_last_name", "Submitted snapshot"); await click(a, form("personal") + ' button[type="submit"]'); await until(async () => !!heldResponse, "held committed PUT");
      const writes = requests.filter(row => row.method === "PUT").length;
      await value(a, "#profileWorkspace-academic-faculty", "Pending Faculty"); await click(a, form("academic") + ' button[type="submit"]');
      assert.equal(requests.filter(row => row.method === "PUT").length, writes, "global save guard prevents duplicate/local concurrent writes");
      await value(a, "#profileWorkspace-personal-english_last_name", "Typed during save"); heldResponse(); heldResponse = null; await saved(a, form("personal") + " .message");
      assert.equal(await a.evaluate("document.getElementById('profileWorkspace-personal-english_last_name').value"), "Typed during save"); assert.equal((await latest()).profile.english_last_name, "Submitted snapshot");
      await click(a, form("personal") + ' button[type="submit"]'); await saved(a, form("personal") + " .message"); assert.equal((await latest()).profile.english_last_name, "Typed during save");
      assert.equal(await a.evaluate("document.getElementById('profileWorkspace-academic-faculty').value"), "Pending Faculty");
      await click(a, form("academic") + ' button[type="submit"]'); await saved(a, form("academic") + " .message");
    });
    await check("license absence requires confirmation and explicit nulls rather than silent deletion", async () => {
      await value(a, "#profileWorkspace-personal-has_driving_license", "true"); await value(a, "#profileWorkspace-personal-driving_license_number", "SYNTHETIC-ONLY"); await click(a, form("personal") + ' button[type="submit"]'); await saved(a, form("personal") + " .message");
      await value(a, "#profileWorkspace-personal-has_driving_license", "false"); await click(a, ".app-confirm-overlay:not(.is-leaving) .app-confirm-modal__cancel"); await until(() => a.evaluate("!document.querySelector('.app-confirm-overlay')"), "license cancellation");
      assert.equal((await latest()).profile.driving_license_number, "SYNTHETIC-ONLY"); assert.equal(await a.evaluate("document.getElementById('profileWorkspace-personal-driving_license_number').value"), "SYNTHETIC-ONLY");
      await value(a, "#profileWorkspace-personal-has_driving_license", "false"); await confirm(a);
      await click(a, form("personal") + ' button[type="submit"]'); await saved(a, form("personal") + " .message"); const state = await latest(); assert.equal(state.profile.has_driving_license, false); assert.equal(state.profile.driving_license_number, null);
    });
    await check("mount is idempotent and cancelling sidebar departure keeps the draft", async () => {
      const counts = await a.evaluate("(async()=>{const module=await import('/src/pages/studentProfileWorkspace.js');const before=document.querySelectorAll('[data-profile-entry]').length;const x=module.mountStudentProfileWorkspace({document});const y=module.mountStudentProfileWorkspace({document});return {same:x===y,before,after:document.querySelectorAll('[data-profile-entry]').length};})()"); assert.equal(counts.same, true); assert.equal(counts.before, counts.after);
      await value(a, "#profileWorkspace-personal-gender", "Pending departure"); await click(a, '.sidebar-item[data-target="panel-overview"]');
      await click(a, ".app-confirm-overlay:not(.is-leaving) .app-confirm-modal__cancel"); await until(() => a.evaluate("!document.querySelector('.app-confirm-overlay')"), "departure cancelled");
      assert.equal(await a.evaluate("document.getElementById('panel-profile').classList.contains('active')"), true); assert.equal(await a.evaluate("document.getElementById('profileWorkspace-personal-gender').value"), "Pending departure");
      await click(a, form("personal") + ' button[type="submit"]'); await saved(a, form("personal") + " .message");
    });
    await check("read-only account, blocked fields and unchanged sidebar/calendar/resume", async () => {
      await click(a, "#profileAccountTab"); assert.equal(await a.evaluate("document.querySelectorAll('#profileAccountPanel input:not([readonly]),#profileAccountPanel button').length"), 0);
      assert.equal(await a.evaluate("document.querySelectorAll('#panel-profile [name=national_id_ciphertext],#panel-profile [name=national_id]').length"), 0);
      assert.equal(await a.evaluate("document.querySelectorAll('.sidebar-item[data-target=panel-profile]').length"), 1);
      assert.equal(await a.evaluate("document.getElementById('panel-activities')?.hidden"), true); assert.equal(await a.evaluate("!!document.getElementById('resumeFile')"), true);
      assert.deepEqual(results.runtime_errors, []);
    });
    await check("real responsive geometry/screenshots at 1440/1366/768/390 with all five tabs", async () => {
      await fs.mkdir(artifacts, { recursive: true });
      for (const width of [1440, 1366, 768, 390]) {
        await a.send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
        for (const [name, id] of [["personal", "profilePersonalTab"], ["contact", "profileContactTab"], ["education", "profileEducationTab"], ["documents", "profileDocumentsTab"], ["account", "profileAccountTab"]]) {
          await click(a, "#" + id); await a.evaluate("window.scrollTo({top:0,behavior:'instant'})");
          await new Promise(resolve => setTimeout(resolve, 400));
          assert.equal(await a.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"), true, width + " " + name + " page overflow");
          assert.equal(await a.evaluate("document.getElementById('" + id + "').getAttribute('aria-selected')"), "true");
          const shot = await a.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); const filename = width + "-" + name + ".png"; await fs.writeFile(path.join(artifacts, filename), Buffer.from(shot.data, "base64")); results.screenshots.push("docs/audits/evidence/student-profile-phase4/" + filename);
        }
      }
    });
    await a.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await click(a, "#profilePersonalTab");
    const fixtureSource = await fs.readFile(path.join(workspace,"nlp-service/tests/profile_pdf_fixtures.py"),"utf8");
    const makePdf = (options={}) => {
      const script = "import sys,json,types,base64;data=json.load(sys.stdin);m=types.ModuleType('fixture');exec(data['source'],m.__dict__);opts=data['options'];font=opts.pop('font',None);sys.stdout.buffer.write(m.build_fixture(**opts,thai_font=base64.b64decode(font) if font else None))";
      const result = spawnSync("docker",["exec","-i","intern_nlp_service","python","-c",script],{input:JSON.stringify({source:fixtureSource,options}),windowsHide:true,timeout:60000,maxBuffer:12*1024*1024});
      assert.equal(result.status,0,"synthetic PDF generator"); return result.stdout;
    };
    const pdf = makePdf(), pdfPath = path.join(path.dirname(process.env.STORAGE_ROOT),"synthetic-profile-import.pdf"); await fs.writeFile(pdfPath,pdf);
    const models = require("../src/models"), authHeaders = {Authorization:"Bearer "+token};
    const importApi = async (action, {bytes=pdf,receipt,changes={},revision,token:actor=token,filename="synthetic-profile-import.pdf",mime="application/pdf"}={}) => {
      const multipart = ["preview","commit"].includes(action), body = multipart ? new FormData() : JSON.stringify({receipt});
      if (multipart) { body.append("document",new Blob([bytes],{type:mime}),filename); if(action==="commit") {body.append("receipt",receipt);body.append("changes",JSON.stringify(changes));} }
      const response = await fetch(origin+"/api/student-profile/pdf-import/"+action,{method:"POST",headers:{Authorization:"Bearer "+actor,...(!multipart?{"Content-Type":"application/json"}:{}),...(revision?{"If-Match":revision}:{})},body});
      return {status:response.status,body:await response.json(),cache:response.headers.get("cache-control")};
    };
    const commitApi = (p,changes,options={}) => importApi("commit",{receipt:p.receipt,revision:p.snapshot.profile_revision,changes,...options});
    const mutation = async changes => {const current=await latest();const response=await fetch(origin+"/api/student-profile/aggregate",{method:"PATCH",headers:{...authHeaders,"Content-Type":"application/json","If-Match":current.profile_revision},body:JSON.stringify(changes)});assert.equal(response.status,200);return response.json();};
    const documentCount = () => models.StudentFile.count();
    const stagedPaths = async () => {try {return (await fs.readdir(path.join(process.env.STORAGE_ROOT,"students",owner,"profile-documents"))).sort();}catch(error){if(error.code==="ENOENT")return [];throw error;}};
    const extractBrowser = async () => {
      await click(a,"#profilePdfChooseImport"); await a.send("DOM.enable");const {root}=await a.send("DOM.getDocument");const {nodeId}=await a.send("DOM.querySelector",{nodeId:root.nodeId,selector:"#profilePdfFile"});await a.send("DOM.setFileInputFiles",{nodeId,files:[pdfPath]});
      await click(a,"#profilePdfExtract");await until(()=>a.evaluate("document.querySelector('[data-import-field]') && !document.getElementById('profilePdfSave').disabled"),"PDF preview");
    };
    const choose = async (key,mode="pdf",edit) => {const selector='[data-import-field="'+key+'"]';await value(a,selector+' > select[id^="pdfImportDecision-"]',mode);if(edit!==undefined)await value(a,selector+' > input, '+selector+' > textarea',edit);};
    const cancelImport = async () => {await click(a,"#profilePdfCancel");await confirm(a);await until(()=>a.evaluate("!document.querySelector('[data-import-field]')"),"cancel import");};
    const finishImport = async () => {await click(a,"#profilePdfSave");await confirm(a);await until(()=>a.evaluate("document.getElementById('profilePdfMessage').classList.contains('success')"),"import saved");};
    let preview;
    await check("text/AcroForm/checkbox/multiple education preview is strictly read-only",async()=>{
      const before=await latest(), count=await documentCount(), paths=await stagedPaths();const r=await importApi("preview");assert.equal(r.status,200);preview=r.body;
      assert.equal(preview.method,"pdf_text");assert.equal(preview.identity_status,"matched");assert.equal(preview.records.education.length,2);assert.equal(preview.records.skills.length,2);
      assert.equal(preview.candidates.find(x=>x.key==="has_driving_license").value,false);assert.match(r.cache,/no-store/);
      assert.deepEqual(await latest(),before);assert.equal(await documentCount(),count);assert.deepEqual(await stagedPaths(),paths);
    });
    await check("428 happens before upload, wrong file and forbidden fields leave data intact",async()=>{
      const before=await latest();assert.equal((await importApi("commit",{receipt:preview.receipt})).status,428);
      assert.equal((await commitApi(preview,{student:{student_id:"changed"}})).status,400);
      assert.equal((await commitApi(preview,{profile:{national_id:"123"}})).status,400);
      assert.equal((await commitApi(preview,{}, {bytes:makePdf({fields:{"profile.religion":"different"}})})).status,400);
      for(const changes of [{profile:{birth_date:"2023-02-30"}},{student:{gpa:4.01}},{profile:{father_age:Number.MAX_SAFE_INTEGER+1}}])assert.equal((await commitApi(preview,changes)).status,400);
      assert.deepEqual(await latest(),before);
    });
    await check("PDF owner mismatch, unsupported/encrypted/corrupt/active/pages/extension/MIME are rejected",async()=>{
      const before=await latest();const cases=[{bytes:makePdf({owner:"990000000999"}),expected:422},{bytes:makePdf({mode:"encrypted"}),expected:422},{bytes:Buffer.from("%PDF-invalid"),expected:422},{bytes:makePdf({mode:"active"}),expected:422},{bytes:makePdf({pages:5}),expected:422},{filename:"not-pdf.txt",expected:400},{mime:"image/png",expected:400}];
      for(const c of cases)assert.equal((await importApi("preview",c)).status,c.expected);
      assert.deepEqual(await latest(),before);
    });
    await check("actual local English and Thai scanned PDF OCR produces reviewable values, no writes",async()=>{
      const before=await latest(), font=(await fs.readFile("C:/Windows/Fonts/tahoma.ttf")).toString("base64");const r=await importApi("preview",{bytes:makePdf({mode:"scan",fields:{},font})});assert.equal(r.status,200);assert.equal(r.body.method,"ocr");
      const nationality=r.body.candidates.find(x=>x.key==="nationality");assert.ok(nationality);assert.equal(String(nationality.value).replace(/\s/g,""),"ไทย");assert.equal(nationality.review_required,true);
      assert.ok(r.body.warnings.includes("OCR_SKILL_GRID_REVIEW_REQUIRED"));assert.deepEqual(await latest(),before);
    });
    await check("browser keep/skip defaults and cancellation never persist or erase manual drafts",async()=>{
      await click(a,"#profileWorkspaceReload");await until(()=>a.evaluate("document.getElementById('profileWorkspaceStatus').classList.contains('success')"),"latest before PDF");
      await value(a,"#profileWorkspace-personal-gender","Manual draft before PDF");const before=await latest(), count=await documentCount();await extractBrowser();
      assert.equal(await a.evaluate("Array.from(document.querySelectorAll('[id^=pdfImportDecision-]')).every(x=>x.value==='keep')"),true);assert.equal(await a.evaluate("Array.from(document.querySelectorAll('[data-import-record] > select:first-of-type')).every(x=>x.value==='skip')"),true);
      await choose("profile.english_first_name","edit","Corrected preview");await cancelImport();assert.deepEqual(await latest(),before);assert.equal(await documentCount(),count);assert.equal(await a.evaluate("document.getElementById('profileWorkspace-personal-gender').value"),"Manual draft before PDF");
    });
    await check("confirmed browser import writes selected fields/children and original PDF once, retaining legacy data/draft",async()=>{
      const before=await latest();await extractBrowser();await choose("profile.english_first_name","edit","Corrected Imported");await choose("profile.birth_date");await choose("student.gpa");
      for(const kind of ["education","training","skills"])await value(a,"#pdfImportRecord-"+kind+"-0-action","create");
      await finishImport();const after=await latest();assert.equal(after.profile.english_first_name,"Corrected Imported");assert.equal(after.profile.birth_date,"2004-02-29");assert.equal(Number(after.student.gpa),3.5);assert.equal(after.student.major,before.student.major);
      for(const k of ["medical_conditions","related_skills","parent_contact_address","father_name"])assert.equal(after.profile[k],before.profile[k]);
      for(const k of ["education","training","skills"])assert.equal(after[k].length,before[k].length+1);
      assert.equal(await a.evaluate("document.getElementById('profileWorkspace-personal-gender').value"),"Manual draft before PDF");
      await click(a,form("personal")+' button[type="submit"]');await saved(a,form("personal")+" .message");assert.equal((await latest()).profile.gender,"Manual draft before PDF");assert.equal((await latest()).profile.english_first_name,"Corrected Imported");
      const document=after.documents.find(x=>x.file_type==="external_profile_pdf");assert.ok(document);const file=await models.StudentFile.findByPk(document.id,{attributes:["id","extraction_status","extraction_method","content_sha256","extracted_text"]});assert.equal(file.extraction_status,"ready");assert.equal(file.extraction_method,"pdf_text");assert.equal(file.content_sha256,crypto.createHash("sha256").update(pdf).digest("hex"));assert.equal(file.extracted_text,null);
      const downloaded=await fetch(origin+"/api/student-profile/documents/"+document.id+"/download",{headers:authHeaders});assert.equal(downloaded.status,200);assert.match(downloaded.headers.get("cache-control"),/no-store/);assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),pdf);
    });
    await check("409 from second client preserves import edits until explicit review and reconfirmation",async()=>{
      await extractBrowser();await choose("profile.english_last_name","edit","Import after conflict");await mutation({profile:{mother_name:"Other client kept"}});
      await click(a,"#profilePdfSave");await until(()=>a.evaluate("!!document.querySelector('.app-confirm-overlay')"),"conflict confirmation");await click(a,".app-confirm-overlay:not(.is-leaving) .app-confirm-modal__confirm");
      await until(()=>a.evaluate("document.getElementById('profilePdfMessage').classList.contains('error')"),"import 409");assert.equal(await a.evaluate("document.querySelector('[data-import-field=\"profile.english_last_name\"] > input').value"),"Import after conflict");
      await click(a,".app-confirm-overlay:not(.is-leaving) .app-confirm-modal__cancel");await until(()=>a.evaluate("!document.querySelector('.app-confirm-overlay')"),"close conflict");
      await click(a,"#profilePdfReview");await confirm(a);await finishImport();const state=await latest();assert.equal(state.profile.english_last_name,"Import after conflict");assert.equal(state.profile.mother_name,"Other client kept");
    });
    await check("duplicate child create rolls back file/data; partial child update preserves omitted values",async()=>{
      const p=(await importApi("preview")).body,before=await latest(),count=await documentCount();const education=before.education.find(x=>x.institution_name==="Synthetic University");assert.ok(education);
      assert.equal((await commitApi(p,{education:{create:[{education_level:education.education_level,institution_name:education.institution_name,qualification:education.qualification,major:education.major}]}})).status,409);
      assert.deepEqual(await latest(),before);assert.equal(await documentCount(),count);
      const r=await commitApi(p,{education:{update:[{id:education.id,changes:{gpa:3.88}}]}});assert.equal(r.status,201);const saved=r.body.education.find(x=>x.id===education.id);assert.equal(saved.qualification,education.qualification);assert.equal(saved.major,education.major);assert.equal(Number(saved.gpa),3.88);
      preview=p;
    });
    await check("transaction failure after profile/child writes rolls back SQL/version/revision and removes staged bytes",async()=>{
      const p=(await importApi("review",{receipt:preview.receipt})).body;
      // A committed receipt cannot be reused for a new logical import; obtain a fresh preview.
      const fresh=(await importApi("preview")).body,before=await latest(),count=await documentCount(),paths=await stagedPaths();
      models.StudentFile.addHook("beforeCreate","synthetic_pdf_rollback",file=>{if(file.extraction_status==="ready")throw new Error("Synthetic storage metadata failure");});
      try{const r=await commitApi(fresh,{profile:{religion:"MUST ROLLBACK"},training:{create:[{course_name:"Rollback course"}]}});assert.equal(r.status,500);}finally{models.StudentFile.removeHook("beforeCreate","synthetic_pdf_rollback");}
      assert.deepEqual(await latest(),before);assert.equal(await documentCount(),count);assert.deepEqual(await stagedPaths(),paths);assert.equal((await importApi("status",{receipt:fresh.receipt})).body.import_status,"not_committed");
    });
    await check("lost response after actual COMMIT is recovered through status without another POST or duplicate document",async()=>{
      await click(a,"#profileWorkspaceReload");await until(()=>a.evaluate("document.getElementById('profileWorkspaceStatus').classList.contains('success')"),"latest before lost response");
      await extractBrowser();await choose("profile.english_first_name","edit","Recovered import");loseImportResponse=true;
      const posts=requests.filter(x=>x.path.endsWith('/pdf-import/commit')).length,count=await documentCount();await finishImport();
      assert.equal((await latest()).profile.english_first_name,"Recovered import");assert.equal(await documentCount(),count+1);assert.equal(requests.filter(x=>x.path.endsWith('/pdf-import/commit')).length,posts+1);assert.ok(requests.some(x=>x.path.endsWith('/pdf-import/status')));
    });
    await check("parallel commits row lock permits one; same receipt replay does not increment revision or add files",async()=>{
      const p=(await importApi("preview")).body,count=await documentCount();const pair=await Promise.all([commitApi(p,{profile:{religion:"Concurrent A"}}),commitApi(p,{profile:{religion:"Concurrent A"}})]);
      assert.ok(pair.every(x=>[200,201].includes(x.status)));assert.equal(await documentCount(),count+1);const before=await latest();const replay=await commitApi(p,{profile:{religion:"Concurrent A"}});assert.equal(replay.status,200);assert.equal(replay.body.replayed,true);assert.deepEqual(await latest(),before);
      assert.equal((await importApi("status",{receipt:p.receipt})).body.import_status,"committed");preview=p;
    });
    await check("PDF receipt/history/download enforce second student ownership and private no-store",async()=>{
      const other=crypto.randomUUID();await Student.create({id:other,student_id:"990000000888",first_name:"Synthetic",last_name:"Other",email:"other-4@email.kmutnb.ac.th",password:crypto.randomBytes(20).toString("hex"),major:"IT",track:"co_op"});
      const otherToken=require("jsonwebtoken").sign({id:other,student_id:"990000000888",role:"student",actor_type:"student"},process.env.JWT_SECRET);
      assert.equal((await importApi("status",{receipt:preview.receipt,token:otherToken})).status,403);
      const doc=(await latest()).documents.find(x=>x.file_type==="external_profile_pdf");const response=await fetch(origin+"/api/student-profile/documents/"+doc.id+"/download",{headers:{Authorization:"Bearer "+otherToken}});assert.equal(response.status,404);
      const history=await fetch(origin+"/api/student-profile/pdf-import/history",{headers:authHeaders});assert.equal(history.status,200);assert.match(history.headers.get("cache-control"),/no-store/);const rows=(await history.json()).imports;assert.ok(rows.length&&rows.length<=5);assert.ok(rows.every(x=>!Object.hasOwn(x,"storage_path")&&!Object.hasOwn(x,"extracted_text")));
      assert.equal((await fetch(origin+"/api/student-profile/pdf-import/history")).status,401);
    });
    await check("incomplete PDF changes never clear missing fields; explicit editable null is supported",async()=>{
      const before=await latest();const p=(await importApi("preview")).body;const r=await commitApi(p,{profile:{english_last_name:null}});assert.equal(r.status,201);assert.equal(r.body.profile.english_last_name,null);
      for(const k of ["father_name","mother_name","medical_conditions","birth_date","parent_contact_address"])assert.equal(r.body.profile[k],before.profile[k]);
    });
    await check("browser import preview wraps at 1440/1366/768/390 and cancellation leaves manual five tabs operational",async()=>{
      await extractBrowser();for(const width of [1440,1366,768,390]){await a.send("Emulation.setDeviceMetricsOverride",{width,height:1000,deviceScaleFactor:1,mobile:false});await a.evaluate("document.getElementById('profilePdfPreview').scrollIntoView({block:'start'})");await new Promise(r=>setTimeout(r,250));assert.equal(await a.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),true,"PDF preview overflow "+width);const shot=await a.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});const name=width+"-pdf-preview.png";await fs.writeFile(path.join(artifacts,name),Buffer.from(shot.data,"base64"));results.screenshots.push("docs/audits/evidence/student-profile-phase4/"+name);}
      await cancelImport();await click(a,"#profileEducationTab");assert.equal(await a.evaluate("document.getElementById('profileEducationTab').getAttribute('aria-selected')"),"true");assert.deepEqual(results.runtime_errors,[]);
    });
    const profileService = require("../src/services/studentProfilePdfImport.service").createStudentProfilePdfImportService(models,require("../src/services/studentProfileAggregate.service").createStudentProfileAggregateService(models));
    const memoryFile = bytes => ({buffer:bytes,size:bytes.length,originalname:"synthetic-profile-import.pdf",mimetype:"application/pdf"});
    await check("blank/incomplete synthetic PDF yields no inferred deletions or ghost child records",async()=>{
      const before=await latest(), bytes=makePdf({mode:"blank"});const p=await profileService.preview(owner,memoryFile(bytes));assert.equal(p.candidates.length,0);assert.ok(Object.values(p.records).every(rows=>rows.length===0));assert.deepEqual(await latest(),before);
    });
    await check("actual unsupported PDF and conflicting identity are blocked; malformed extracted values remain editable",async()=>{
      await assert.rejects(profileService.preview(owner,memoryFile(makePdf({mode:"unsupported"}))),{code:"UNSUPPORTED_TEMPLATE"});
      await assert.rejects(profileService.preview(owner,memoryFile(makePdf({fields:{"identity.student_id":"990000000888"}}))),{code:"PDF_STUDENT_ID_UNREADABLE"});
      const p=await profileService.preview(owner,memoryFile(makePdf({fields:{"profile.birth_date":"2023-02-30","student.gpa":"4.01","profile.father_age":"9007199254740993"}})));
      for(const key of ["birth_date","gpa","father_age"])assert.ok(p.candidates.find(x=>x.key===key).validation_error);
    });
    await check("explicit AcroForm checked license is read without inventing details",async()=>{
      const p=await profileService.preview(owner,memoryFile(makePdf({fields:{"profile.has_driving_license":true}})));assert.equal(p.candidates.find(x=>x.key==="has_driving_license").value,true);assert.ok(!p.candidates.some(x=>x.key==="driving_license_number"));
    });
    await check("staging ENOSPC failure cannot write profile/child/file metadata or change revision",async()=>{
      const p=await profileService.preview(owner,memoryFile(pdf)),before=await latest(),count=await documentCount(),paths=await stagedPaths(),originalWrite=fs.writeFile;
      fs.writeFile=async(file,...rest)=>{if(String(file).startsWith(process.env.STORAGE_ROOT)&&String(file).includes('profile-documents'))throw Object.assign(new Error("Synthetic ENOSPC"),{code:"ENOSPC"});return originalWrite(file,...rest);};
      try{assert.equal((await commitApi(p,{profile:{religion:"MUST NOT SAVE"}})).status,500);}finally{fs.writeFile=originalWrite;}
      assert.deepEqual(await latest(),before);assert.equal(await documentCount(),count);assert.deepEqual(await stagedPaths(),paths);
    });
    await check("two different receipts at one revision conflict; winner data and document remain intact",async()=>{
      const before=await latest(),p=await profileService.preview(owner,memoryFile(pdf)),q=await profileService.preview(owner,memoryFile(pdf)),count=await documentCount();const pair=await Promise.all([commitApi(p,{profile:{nationality:"Synthetic A"}}),commitApi(q,{profile:{nationality:"Synthetic B"}})]);assert.deepEqual(pair.map(x=>x.status).sort(),[201,409]);assert.equal(await documentCount(),count+1);const state=await latest();assert.ok(["Synthetic A","Synthetic B"].includes(state.profile.nationality));assert.equal(state.profile.medical_conditions,before.profile.medical_conditions);
    });
    await check("status waits for an in-flight SQL writer and returns one consistent committed snapshot",async()=>{
      const p=await profileService.preview(owner,memoryFile(pdf));let release,entered;const blocked=new Promise(resolve=>{release=resolve;}),locked=new Promise(resolve=>{entered=resolve;});
      models.StudentFile.addHook('beforeCreate','synthetic_pdf_pending',async file=>{if(file.extraction_status==='ready'){entered();await blocked;}});
      const commit=commitApi(p,{profile:{ethnicity:'Pending transaction verified'}});
      try{await locked;let settled=false;const status=importApi('status',{receipt:p.receipt}).then(r=>{settled=true;return r;});await new Promise(resolve=>setTimeout(resolve,200));assert.equal(settled,false,'status must wait for owner SHARE lock');release();assert.equal((await commit).status,201);const result=await status;assert.equal(result.body.import_status,'committed');assert.equal(result.body.profile.ethnicity,'Pending transaction verified');assert.ok(result.body.documents.some(file=>file.id===result.body.import_id));assert.ok(result.body.document.document_version);}finally{release();models.StudentFile.removeHook('beforeCreate','synthetic_pdf_pending');}
    });
    await check("fresh browser page reads imported PostgreSQL data, then ordinary manual entry still saves",async()=>{
      const state=await latest();const target=await(await fetch("http://127.0.0.1:"+debugPort+"/json/new?about:blank",{method:"PUT"})).json();const c=await connect(target.webSocketDebuggerUrl,message=>results.runtime_errors.push(message));tabs.push(c);await c.send("Page.enable");await c.send("Runtime.enable");await c.send("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await c.send("Page.navigate",{url:frontOrigin+"/src/student_coop/student_coop.html"});await until(()=>c.evaluate("document.getElementById('profileWorkspace-personal-english_first_name') && !document.getElementById('profileWorkspace-personal-english_first_name').disabled"),"fresh profile ready");await click(c,'.sidebar-item[data-target="panel-profile"]');assert.equal(await c.evaluate("document.getElementById('profileWorkspace-personal-english_first_name').value"),state.profile.english_first_name);
      await value(c,"#profileWorkspace-personal-english_last_name","Manual after import reload");await click(c,form("personal")+' button[type="submit"]');await saved(c,form("personal")+" .message");assert.equal((await latest()).profile.english_last_name,"Manual after import reload");assert.deepEqual(results.runtime_errors,[]);
    });
  } finally {
    if (tabs[0]) await tabs[0].send("Browser.close").catch(() => {}); for (const tab of tabs) tab.socket.close();
    for (const child of [edge, vite]) if (child && child.exitCode === null) { child.kill(); await new Promise(resolve => { child.once("exit", resolve); setTimeout(resolve, 3000); }); }
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } await sequelize.close();
    if (process.env.FITM_PROFILE_PHASE4_RESULTS) await fs.writeFile(process.env.FITM_PROFILE_PHASE4_RESULTS, JSON.stringify(results, null, 2));
    // Retain the isolated browser profile and synthetic storage; never touch real profiles.
  }
});
