// Uses actual profile page functions, HTML, API client and production router.
// SQL methods are in-memory doubles. No PostgreSQL connection or migration.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { fixture } = require("../test/helpers/studentProfileIntegrityFixture");
const { clickMouse } = require("./staffBrowserInput");
const workspace = path.resolve(__dirname, "../..");
const frontend = path.join(workspace, "frontend");
async function until(read, label) {
  const end = Date.now() + 15000;
  while (Date.now() < end) { const result = await read(); if (result) return result; await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error("Timed out: " + label);
}
async function connect(url) {
  const socket = new WebSocket(url), pending = new Map(); let sequence = 0;
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data), waiter = pending.get(message.id);
    if (waiter) { pending.delete(message.id); message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result); }
  });
  const browser = { socket, send(method, params = {}) {
    return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  } };
  browser.evaluate = async expression => {
    const result = await browser.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  return browser;
}
test("Student Profile: real Edge two-tab acceptance with safe in-memory SQL", { timeout: 120000 }, async t => {
  const f = await fixture(t), tabs = [];
  const browserProfile = await fs.mkdtemp(path.join(workspace, ".profile-browser-"));
  let child;
  t.after(async () => {
    if (tabs[0]) await tabs[0].send("Browser.close").catch(() => {});
    for (const tab of tabs) tab.socket.close();
    if (child && child.exitCode === null) {
      child.kill(); await new Promise(resolve => { child.once("exit", resolve); setTimeout(resolve, 5000); });
    }
    assert.equal(path.dirname(path.resolve(browserProfile)), workspace);
    assert.ok(path.basename(browserProfile).startsWith(".profile-browser-"));
    await fs.rm(browserProfile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  });
  const page = (await fs.readFile(path.join(frontend, "src/pages/student_coop.js"), "utf8")).replaceAll("\r\n", "\n");
  const between = (start, end) => {
    const from = page.indexOf(start), to = page.indexOf(end, from);
    assert.ok(from >= 0 && to > from, start); return page.slice(from, to);
  };
  const controls = ["profileLoadMessage", "profileEditMessage", "profileEditModal", "btnEditProfile", "saveProfileBtn", "profileAvatarButton", "profileImageEditorSection", "closeProfileEditModal", "cancelProfileEditBtn", "studentInfoForm", "studentMajorInput", "studentYearLevelInput", "studentGpaInput", "studentAdvisorInput"];
  const harness = [
    "import { StudentProfileDraft, PROFILE_INPUTS, readProfileInputs, writeProfileInputs } from '/src/pages/studentProfileDraft.js';",
    "import { getMyStudentProfile, updateMyStudentProfile } from '/src/api/studentProfile.api.js';",
    "import { showConfirmModal } from '/src/ui/feedback.js';",
    "localStorage.setItem('token'," + JSON.stringify(f.token) + ");",
    "let currentStudent=null,currentStudentProfile=null,studentProfileRevision=null,hasLoadedStudentProfile=false,studentProfileDraft=null,studentProfileLoadSequence=0;",
    "let isStudentProfileSaving=false,isProfileImageUploading=false,hasAdvisorSelectionChanged=false;",
    ...controls.map(name => "const " + name + "=document.getElementById('" + name + "');"),
    "function setProfileLoading(){} function renderStudent(){} function renderStudentProfile(){} function syncCoopPrerequisiteProgram(){} async function loadProfileImage(){}",
    "function populateStudentInfoForm(data){studentMajorInput.value=data.major||'';studentYearLevelInput.value=data.year_level||'';studentGpaInput.value=data.gpa||'';}",
    "function clearMessage(target){if(target)target.textContent='';} function showMessage(target,message,type){if(target){target.textContent=message;target.className='message '+type;}}",
    "function showToast(){} function redirectToLogin(){} function clearAuthentication(){}",
    between("// Profile tabs only change visibility", "function formatTeacherName("),
    between("function setInputElementValue(", "function preserveCurrentAdvisorOption("),
    between("async function loadStudentProfile()", "\nfunction setProfileLoading("),
    between("function calculateAge(", "function setText("),
    between("function openProfileEditModal()", "// ==============================\n// Translate Status"),
    "document.getElementById('panel-profile').style.display='block';",
    "window.__profile={load:loadStudentProfile,save:saveStudentProfile,dirty:()=>studentProfileDraft?.hasChanges(readProfileInputs(document)),revision:()=>studentProfileDraft?.revision};",
    "await loadStudentProfile();window.__ready=true;",
  ].join("\n");
  const html = (await fs.readFile(path.join(frontend, "src/student_coop/student_coop.html"), "utf8"))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*href=["']https?:[^>]*>/gi, "")
    .replace("</body>", '<script type="module" src="/harness.js"></script></body>');
  f.app.get("/", (_req, res) => res.type("html").send(html));
  f.app.get("/harness.js", (_req, res) => res.type("js").send(harness));
  f.app.get("/src/api/client.js", async (_req, res) => {
    const client = (await fs.readFile(path.join(frontend, "src/api/client.js"), "utf8"))
      .replace('from "axios"', 'from "/axios.js"').replace("import.meta.env.VITE_API_URL", JSON.stringify(f.origin));
    res.type("js").send(client);
  });
  f.app.get("/axios.js", (_req, res) => res.sendFile(path.join(frontend, "node_modules/axios/dist/esm/axios.js")));
  f.app.use("/src", require("express").static(path.join(frontend, "src")));
  f.app.use("/styles", require("express").static(path.join(frontend, "src/styles")));
  const executable = process.env.FITM_PROFILE_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  await fs.access(executable);
  child = spawn(executable, ["--headless=new", "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", "--user-data-dir=" + browserProfile, "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "about:blank"], { windowsHide: true, stdio: "ignore" });
  const port = await until(async () => {
    try { return Number((await fs.readFile(path.join(browserProfile, "DevToolsActivePort"), "utf8")).split("\n")[0]); }
    catch { return false; }
  }, "Edge debug port");
  for (let index = 0; index < 2; ++index) {
    const target = await (await fetch("http://127.0.0.1:" + port + "/json/new?" + encodeURIComponent(f.origin), { method: "PUT" })).json();
    const tab = await connect(target.webSocketDebuggerUrl); tabs.push(tab);
    await until(() => tab.evaluate("window.__ready===true"), "browser tab load");
  }
  const [a, b] = tabs;
  const click = (tab, selector) => clickMouse(tab, tab.evaluate, selector);
  const value = (tab, id, text) => tab.evaluate("(()=>{const input=document.getElementById(" + JSON.stringify(id) + ");input.value=" + JSON.stringify(text) + ";input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()");
  const idle = tab => until(() => tab.evaluate("!document.getElementById('saveProfileBtn').disabled"), "save completed");
  await t.test("contact save preserves personal/health/skills and refresh agrees", async () => {
    const before = f.row();
    await click(a, "#btnEditProfile"); await click(b, "#btnEditProfile");
    assert.equal(await a.evaluate("window.__profile.revision()"), await b.evaluate("window.__profile.revision()"));
    assert.equal(await a.evaluate("getComputedStyle(document.getElementById('reloadProfileConflictBtn')).display"), "none");
    await click(a, "#profileEditContactTab"); await value(a, "editCurrentPhone", "0000000001");
    await click(a, "#saveProfileBtn"); await idle(a);
    assert.equal(f.row().current_phone, "0000000001");
    for (const field of ["birth_date", "medical_conditions", "related_skills"]) assert.equal(f.row()[field], before[field]);
    assert.equal((await f.request("GET")).body.student.profile.current_phone, "0000000001");
  });
  await t.test("tab switches retain both drafts; stale browser tab cannot overwrite", async () => {
    await value(b, "editReligion", "Local Browser Draft");
    await click(b, "#profileEditContactTab"); await value(b, "editParentAddress", "Local Address");
    await click(b, "#profileEditPersonalTab");
    assert.equal(await b.evaluate("document.getElementById('editReligion').value"), "Local Browser Draft");
    await click(b, "#saveProfileBtn"); await idle(b);
    assert.equal(f.row().religion, "Fixture religion"); assert.equal(f.row().current_phone, "0000000001");
    assert.equal(await b.evaluate("document.getElementById('editReligion').value"), "Local Browser Draft");
    assert.notEqual(await b.evaluate("getComputedStyle(document.getElementById('reloadProfileConflictBtn')).display"), "none");
  });
  await t.test("explicit conflict confirmation, both-category save and intentional clear", async () => {
    await click(b, "#reloadProfileConflictBtn");
    await click(b, ".app-confirm-overlay:not(.is-leaving) .app-confirm-modal__confirm");
    await until(() => b.evaluate("document.getElementById('reloadProfileConflictBtn').hidden"), "conflict resolved");
    await until(() => b.evaluate("!document.querySelector('.app-confirm-overlay')"), "confirmation leave animation completed");
    assert.equal(await b.evaluate("document.getElementById('editReligion').value"), "Fixture religion");
    await value(b, "editReligion", "Reviewed Religion"); await click(b, "#profileEditContactTab");
    await value(b, "editParentAddress", "Reviewed Address"); await click(b, "#saveProfileBtn"); await idle(b);
    assert.equal(f.row().religion, "Reviewed Religion"); assert.equal(f.row().parent_contact_address, "Reviewed Address");
    await click(b, "#profileEditPersonalTab"); await value(b, "editMedicalConditions", "");
    await click(b, "#saveProfileBtn"); await idle(b);
    assert.equal(f.row().medical_conditions, null); assert.equal(f.row().related_skills, "Fixture related_skills");
  });
  await t.test("native date input rejects nonexistent date; leap-year birthday saves", async () => {
    await value(b, "editBirthDate", "2023-02-30");
    assert.equal(await b.evaluate("document.getElementById('editBirthDate').value"), "");
    await value(b, "editBirthDate", "2024-02-29"); await click(b, "#saveProfileBtn"); await idle(b);
    assert.equal(f.row().birth_date, "2024-02-29");
    assert.equal((await f.request("GET")).body.student.profile.birth_date, "2024-02-29");
  });
});
