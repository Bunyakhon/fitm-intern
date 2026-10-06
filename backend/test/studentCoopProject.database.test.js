const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const syncFs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const crypto = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const { Sequelize, Op } = require("sequelize");
const { Umzug, SequelizeStorage } = require("umzug");
const { pathToFileURL } = require("node:url");

// Real SQL, multipart HTTP, auth, storage and page handlers. Never connects to
// the app DB or writes the app storage. HTML DOM/tab rendering is simulated.
test("Student project topic and files through real authenticated HTTP/PostgreSQL/storage", { skip: !process.env.COOP_PROJECT_DISPOSABLE_DATABASE_URL }, async t => {
  const db = new Sequelize(process.env.COOP_PROJECT_DISPOSABLE_DATABASE_URL, { logging: false, pool: { max: 8 } });
  let root, server;
  let m;
  const fixtureTeachers = [], fixtureStudents = [], fixtureStaff = [];
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
  try {
    const [guard] = await db.query("SELECT current_database() AS db, current_setting('fitm.a013_disposable',true) AS disposable");
    assert.equal(guard[0].db, "fitm_project_test"); assert.equal(guard[0].disposable, "on");
    m = { sequelize: db };
    for (const file of syncFs.readdirSync(path.join(__dirname, "../src/models")).filter(file => file.endsWith(".model.js"))) {
      const model = require(`../src/models/${file}`)(db); m[model.name] = model;
    }
    for (const model of Object.values(m)) model.associate?.(m);
    await new Umzug({ migrations: { glob: ["*.js", { cwd: path.join(__dirname, "../src/db/migrations") }] }, context: db.getQueryInterface(), storage: new SequelizeStorage({ sequelize: db, tableName: "sequelize_meta" }), logger: undefined }).up();
    root = await fs.mkdtemp(path.join(os.tmpdir(), "fitm-project-test-"));
    const storageModule = require.resolve("../src/config/storage");
    const oldStorage = require.cache[storageModule];
    const oldRoot = process.env.STORAGE_ROOT;
    let storage;
    try { process.env.STORAGE_ROOT = root; delete require.cache[storageModule]; storage = require(storageModule); }
    finally { if (oldRoot === undefined) delete process.env.STORAGE_ROOT; else process.env.STORAGE_ROOT = oldRoot; if (oldStorage) require.cache[storageModule] = oldStorage; else delete require.cache[storageModule]; }
    const { createStudentCoopRouter } = require("../src/routes/studentCoop.routes");
    const { authenticateStudentToken } = require("../src/middlewares/auth.middleware");
    const { createStudentCoopProjectService } = require("../src/services/studentCoopProject.service");
    const runId = crypto.randomUUID().slice(0, 8);
    const faculty = require("./fixtures/coopFaculty.json");
    // Fixtures only on disposable DB: generated IDs/auth values, not real accounts.
    const teachers = [];
    for (const [academic_title, first_name, last_name] of faculty) {
      const teacher = await m.Teacher.create({ academic_title, first_name, last_name, department: "FITM", email: `${teachers.length}-${runId}@fixture.invalid`, password: crypto.randomBytes(24).toString("hex") });
      teachers.push(teacher); fixtureTeachers.push(teacher.id);
    }
    fixtureTeachers.push((await m.Teacher.create({ first_name: "Inactive", last_name: "Fixture", status: "inactive", email: `inactive-${runId}@fixture.invalid`, password: crypto.randomBytes(24).toString("hex") })).id);
    fixtureStaff.push((await m.DepartmentStaff.create({ first_name: "ลัดดา", last_name: "ตั้งเกียรติศิริ", email: `staff-${runId}@fixture.invalid`, password: crypto.randomBytes(24).toString("hex") })).id);
    const makeStudent = async label => {
      const owner = await m.Student.create({ student_id: `project-${label}-${runId}`, email: `${label}-${runId}@email.kmutnb.ac.th`, first_name: "Disposable", last_name: label, track: "co_op", major: "IT", advisor_teacher_id: teachers[1].id, coop_advisor_teacher_id: teachers[0].id, password: crypto.randomBytes(24).toString("hex") });
      fixtureStudents.push(owner.id); return owner;
    };
    const a = await makeStudent("A"), b = await makeStudent("B");
    const token = owner => jwt.sign({ id: owner.id, student_id: owner.student_id, actor_type: "student", role: "student" }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "10m" });
    const tokens = new Map([[a.id, token(a)], [b.id, token(b)]]);
    // Load the unchanged directory controller against isolated models, then
    // restore require caches immediately; its explicit SELECT is exercised.
    const registryPath = require.resolve("../src/models"); require(registryPath);
    const controllerPath = require.resolve("../src/controllers/teacher.controller");
    const oldRegistry = require.cache[registryPath].exports, oldController = require.cache[controllerPath];
    let directory;
    try { require.cache[registryPath].exports = m; delete require.cache[controllerPath]; directory = require(controllerPath).getTeachers; }
    finally { require.cache[registryPath].exports = oldRegistry; if (oldController) require.cache[controllerPath] = oldController; else delete require.cache[controllerPath]; }
    const app = express(); app.use(express.json());
    app.get("/api/teachers", authenticateStudentToken, directory);
    app.use("/api/student-coop", createStudentCoopRouter({ models: m, storage }));
    server = http.createServer(app); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(url, { owner = a, auth = true, ...options } = {}) {
      return fetch(base + url, { ...options, headers: { ...(auth ? { Authorization: `Bearer ${tokens.get(owner.id)}` } : {}), ...options.headers } });
    }
    const api = async (url, options) => { const response = await request(url, options); const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); return body; };
    const save = (topic, options = {}) => request("/api/student-coop/project", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic }), ...options });
    let pdfText = "%PDF-1.4\n";
    const offsets = [0];
    for (const content of ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>"]) {
      offsets.push(Buffer.byteLength(pdfText)); pdfText += `${offsets.length - 1} 0 obj\n${content}\nendobj\n`;
    }
    const xref = Buffer.byteLength(pdfText);
    pdfText += "xref\n0 4\n0000000000 65535 f \n" + offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("") + `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const pdf = Buffer.from(pdfText);
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=", "base64");
    // Valid 1x1 white JPEG generated with the installed Windows image encoder.
    const jpeg = Buffer.from("/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6KKKAP/2Q==", "base64");
    async function upload(category, data = pdf, mime = "application/pdf", name = "book.pdf", options = {}) {
      const form = new FormData(); form.append("file", new Blob([data], { type: mime }), name);
      if (options.field) form.append("student_id", b.id);
      return request(`/api/student-coop/${category}`, { method: "POST", body: form, ...options });
    }
    const row = type => m.StudentFile.findOne({ where: { student_id: a.id, file_type: type } });
    const exists = async value => { await fs.access(storage.resolveStoragePath(value)); };
    const fileCount = async directory => (await fs.readdir(directory)).length;

    await t.test("active directory contains 23 required faculty, excludes Staff and sensitive/new fields", async () => {
      let sql; const original = m.Teacher.findAll;
      m.Teacher.findAll = function (options) { assert.ok(Array.isArray(options.attributes)); assert.ok(!options.attributes.includes("is_department_head")); return original.call(this, { ...options, logging: statement => { sql = statement; } }); };
      let result; try { result = await api("/api/teachers"); } finally { m.Teacher.findAll = original; }
      assert.equal(result.teachers.length, 23);
      assert.deepEqual(result.teachers.map(teacher => [teacher.academic_title, teacher.first_name, teacher.last_name].join("")).sort(), faculty.map(values => values.join("")).sort());
      assert.doesNotMatch(JSON.stringify(result), /ลัดดา|อุไรวรรณ|password|password_hash|is_department_head/);
      assert.doesNotMatch(sql, /password_hash|is_department_head/);
    });
    await t.test("authenticated topic create/update/read-back preserves both advisor fields", async () => {
      assert.equal((await save("  First topic  ")).status, 200); assert.equal((await api("/api/student-coop/project")).topic, "First topic");
      assert.equal((await save("Updated topic")).status, 200); assert.equal((await api("/api/student-coop/project")).topic, "Updated topic");
      assert.equal(await m.CoopProject.count({ where: { student_id: a.id } }), 1);
      await a.reload(); assert.equal(a.advisor_teacher_id, teachers[1].id); assert.equal(a.coop_advisor_teacher_id, teachers[0].id);
      const result = await api("/api/student-coop/project"); assert.equal(result.coop_advisor_teacher.id, teachers[0].id); assert.doesNotMatch(JSON.stringify(result), /password|storage_path/);
    });
    await t.test("blank/long/spoofed topic and unauthenticated/wrong-role actions denied", async () => {
      for (const topic of [" ", "x".repeat(501), null, "Topic\u0000"]) assert.equal((await save(topic)).status, 400);
      for (const extra of [{ student_id: b.id }, { coop_advisor_teacher_id: teachers[2].id }, { advisor_teacher_id: teachers[2].id }]) assert.equal((await save("Spoof", { body: JSON.stringify({ topic: "Spoof", ...extra }) })).status, 400);
      assert.equal((await save("No auth", { auth: false })).status, 401);
      const wrongRole = jwt.sign({ id: a.id, student_id: a.student_id, role: "teacher", actor_type: "teacher" }, process.env.JWT_SECRET);
      assert.equal((await save("Wrong role", { headers: { "Content-Type": "application/json", Authorization: `Bearer ${wrongRole}` } })).status, 403);
      assert.equal((await api("/api/student-coop/project", { owner: b })).topic, "");
      await save("B own topic", { owner: b }); assert.equal((await api("/api/student-coop/project")).topic, "Updated topic");
    });
    await t.test("Book PDF and Poster PDF/PNG/JPEG persist bytes/metadata and serve owner-inline preview", async () => {
      assert.equal((await upload("project-book")).status, 200);
      for (const [data, mime, name] of [[pdf, "application/pdf", "poster.pdf"], [png, "image/png", "poster.png"], [jpeg, "image/jpeg", "poster.jpg"]]) {
        const response = await upload("poster", data, mime, name); assert.equal(response.status, 200);
        const result = await response.json(); assert.equal(result.file.original_name, name); assert.ok(!("storage_path" in result.file));
        const persisted = await row("coop_poster"); await exists(persisted.storage_path); assert.equal(Number(persisted.file_size), data.length);
        const preview = await request(`/api/student-coop/project-files/${persisted.id}/preview`);
        assert.equal(preview.status, 200); assert.equal(preview.headers.get("content-type"), mime); assert.match(preview.headers.get("content-disposition"), /^inline;/);
        assert.equal(preview.headers.get("x-content-type-options"), "nosniff"); assert.match(preview.headers.get("cache-control"), /no-store/); assert.deepEqual(Buffer.from(await preview.arrayBuffer()), data);
      }
      const book = await row("coop_project_book"); await exists(book.storage_path);
      const files = (await api("/api/student-coop/project-files")).files; assert.equal(files.length, 2); assert.doesNotMatch(JSON.stringify(files), /storage_path|students\//);
    });
    await t.test("replacement commits new file before cleaning old files for both categories", async () => {
      for (const [category, type] of [["project-book", "coop_project_book"], ["poster", "coop_poster"]]) {
        const before = await row(type); const oldPath = before.storage_path;
        const response = await upload(category, pdf, "application/pdf", "replacement.pdf"); assert.equal(response.status, 200);
        const after = await row(type); assert.equal(after.id, before.id); assert.notEqual(after.storage_path, oldPath); await exists(after.storage_path);
        await assert.rejects(exists(oldPath), { code: "ENOENT" }); assert.equal(await m.StudentFile.count({ where: { student_id: a.id, file_type: type } }), 1);
      }
    });
    await t.test("Thai original filenames survive multipart upload and inline response", async () => {
      const name = "เล่มโครงการ.pdf";
      const response = await upload("project-book", pdf, "application/pdf", name);
      assert.equal(response.status, 200); const body = await response.json(); assert.equal(body.file.original_name, name);
      const preview = await request(`/api/student-coop/project-files/${body.file.id}/preview`);
      assert.match(preview.headers.get("content-disposition"), new RegExp(encodeURIComponent(name))); await preview.arrayBuffer();
    });
    await t.test("bad MIME, magic, executable, oversized, traversal and owner spoof rejected without staged orphans", async () => {
      const paths = storage.getStudentStoragePaths(a.id); const before = await fileCount(paths.projectBooks);
      for (const [category, data, mime, name] of [
        ["project-book", png, "image/png", "book.png"], ["project-book", pdf, "application/pdf", "book.exe"],
        ["poster", pdf, "text/html", "poster.html"], ["poster", pdf, "image/png", "poster.png"],
        ["project-book", Buffer.from("MZ executable"), "application/pdf", "book.pdf"],
        ["project-book", pdf, "application/pdf", "../book.pdf"], ["project-book", pdf, "application/pdf", "..\\book.pdf"],
        ["project-book", Buffer.alloc(10 * 1024 * 1024 + 1), "application/pdf", "large.pdf"],
      ]) assert.equal((await upload(category, data, mime, name)).status, 400, name);
      assert.equal((await upload("project-book", pdf, "application/pdf", "spoof.pdf", { field: true })).status, 400);
      assert.equal(await fileCount(paths.projectBooks), before); assert.equal(await fileCount(paths.posters), 1);
      assert.equal((await upload("project-book", pdf, "application/pdf", "book.pdf", { auth: false })).status, 401);
      assert.equal((await api("/api/student-coop/project-files", { owner: b })).files.length, 0);
    });
    await t.test("another owner, unknown UUID and traversal preview are denied; tampered DB paths cannot escape", async () => {
      const book = await row("coop_project_book");
      assert.equal((await request(`/api/student-coop/project-files/${book.id}/preview`, { owner: b })).status, 404);
      assert.equal((await request(`/api/student-coop/project-files/${book.id}/preview`, { auth: false })).status, 401);
      assert.equal((await request(`/api/student-coop/project-files/${crypto.randomUUID()}/preview`)).status, 404);
      assert.equal((await request("/api/student-coop/project-files/..%5Csecret/preview")).status, 400);
      const safePath = book.storage_path;
      for (const unsafe of ["../secret.pdf", `students/${b.id}/coop/project-books/${crypto.randomUUID()}.pdf`, "C:\\secret.pdf"]) {
        await book.update({ storage_path: unsafe }); assert.equal((await request(`/api/student-coop/project-files/${book.id}/preview`)).status, 404);
      }
      await book.update({ storage_path: safePath }); await exists(safePath);
    });
    await t.test("metadata/commit failure cleans staged files and preserves previous reference", async () => {
      const paths = storage.getStudentStoragePaths(a.id), before = await row("coop_project_book");
      const update = m.StudentFile.prototype.update;
      m.StudentFile.prototype.update = async () => { throw Error("Injected metadata failure"); };
      try { assert.equal((await upload("project-book")).status, 500); } finally { m.StudentFile.prototype.update = update; }
      assert.equal((await row("coop_project_book")).storage_path, before.storage_path); await exists(before.storage_path); assert.equal(await fileCount(paths.projectBooks), 1);
      const transaction = db.transaction;
      db.transaction = function (fn) { return transaction.call(this, async tx => { await fn(tx); throw Error("Injected commit rejection"); }); };
      try { assert.equal((await upload("project-book")).status, 500); } finally { db.transaction = transaction; }
      assert.equal((await row("coop_project_book")).storage_path, before.storage_path); await exists(before.storage_path); assert.equal(await fileCount(paths.projectBooks), 1);
      const create = m.StudentFile.create;
      m.StudentFile.create = async () => { throw Error("Injected first-insert failure"); };
      try { assert.equal((await upload("project-book", pdf, "application/pdf", "book.pdf", { owner: b })).status, 500); } finally { m.StudentFile.create = create; }
      assert.equal(await m.StudentFile.count({ where: { student_id: b.id } }), 0); assert.equal(await fileCount(storage.getStudentStoragePaths(b.id).projectBooks), 0);
    });
    await t.test("post-commit old-file cleanup failure never removes committed replacement", async () => {
      const before = await row("coop_project_book"), oldPath = storage.resolveStoragePath(before.storage_path), unlink = fs.unlink;
      fs.unlink = async target => { if (target === oldPath) throw Object.assign(Error("Injected unlink failure"), { code: "EACCES" }); return unlink(target); };
      try { assert.equal((await upload("project-book", pdf, "application/pdf", "committed.pdf")).status, 200); } finally { fs.unlink = unlink; }
      const after = await row("coop_project_book"); assert.notEqual(after.storage_path, before.storage_path); await exists(after.storage_path); await exists(before.storage_path);
      await fs.unlink(oldPath); // Remove only the known superseded fixture after fault recovery.
    });
    await t.test("concurrent first uploads/replacements keep one row with existing committed file", async () => {
      for (const owner of [b, a]) {
        const results = await Promise.all([upload("poster", pdf, "application/pdf", "one.pdf", { owner }), upload("poster", pdf, "application/pdf", "two.pdf", { owner })]);
        assert.deepEqual(results.map(value => value.status), [200, 200]);
        const rows = await m.StudentFile.findAll({ where: { student_id: owner.id, file_type: "coop_poster" } }); assert.equal(rows.length, 1); await exists(rows[0].storage_path);
        assert.equal(await fileCount(storage.getStudentStoragePaths(owner.id).posters), 1);
      }
    });
    await t.test("actual Student project/upload/preview handlers through HTTP survive fresh page fixture", async () => {
      const { projectFixture } = await import(pathToFileURL(path.resolve(__dirname, "../../frontend/test/helpers/studentCoopProjectFixture.js")));
      const vm = require("node:vm");
      const apiSource = syncFs.readFileSync(path.resolve(__dirname, "../../frontend/src/api/studentCoop.api.js"), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
      const apiContext = vm.createContext({ FormData, apiRequest: async (url, options = {}) => {
        const form = options.body instanceof FormData;
        const response = await request(url, { method: options.method || "GET", ...(options.body ? { body: form ? options.body : JSON.stringify(options.body), ...(form ? {} : { headers: { "Content-Type": "application/json" } }) } : {}) });
        assert.equal(response.status, 200);
        return options.responseType === "blob" ? response.blob() : response.json();
      } });
      vm.runInContext(apiSource, apiContext);
      const projectApi = vm.runInContext("({getMyCoopProject,saveMyCoopProject,getMyCoopProjectFiles,uploadMyCoopProjectFile,previewMyCoopProjectFile})", apiContext);
      const adapters = {
        getTeachers: () => api("/api/teachers"), ...projectApi,
      };
      const f = projectFixture(adapters); await f.load(); assert.equal(f.get("projectAdvisor").value, teachers[0].id);
      f.get("projectTitle").value = "Frontend persisted topic"; await f.save();
      f.select("projectBookFile", new File([pdf], "frontend-book.pdf", { type: "application/pdf" }));
      f.select("posterFile", new File([png], "frontend-poster.png", { type: "image/png" })); await f.upload();
      const fresh = projectFixture(adapters); await fresh.load(); assert.equal(fresh.get("projectTitle").value, "Frontend persisted topic");
      assert.match(fresh.get("projectBookCurrent").textContent, /frontend-book.pdf/); assert.match(fresh.get("posterCurrent").textContent, /frontend-poster.png/);
      await fresh.preview(); assert.match(fresh.tabs[0].url, /^blob:/); fresh.closeTab(); assert.equal(fresh.revoked.length, 1);
      await fresh.preview("posterCurrent"); assert.match(fresh.tabs[1].url, /^blob:/); fresh.pagehide();
      const service = createStudentCoopProjectService(m, storage); assert.equal((await service.readProject(a.id)).topic, "Frontend persisted topic");
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (m && fixtureStudents.length) await m.Student.destroy({ where: { id: { [Op.in]: fixtureStudents } } });
    if (m && fixtureTeachers.length) await m.Teacher.destroy({ where: { id: { [Op.in]: fixtureTeachers } } });
    if (m && fixtureStaff.length) await m.DepartmentStaff.destroy({ where: { id: { [Op.in]: fixtureStaff } } });
    if (root) { assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)); assert.ok(path.basename(root).startsWith("fitm-project-test-")); await fs.rm(root, { recursive: true, force: true }); }
    await db.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  }
});
