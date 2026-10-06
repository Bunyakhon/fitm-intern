const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const models = require("../src/models");
const storage = require("../src/config/storage");
const resumeText = require("../src/services/resumeText.service");
const resumeOcr = require("../src/services/resumeOcr.client");

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const RESUME_PREFIX = `students/${STUDENT_ID}/resume/`;
const USABLE_TEXT = "Experienced software engineer with Python, SQL, Linux and network support. ทักษะการทำงานและประสบการณ์ด้านเทคโนโลยีสารสนเทศ";

async function withUpload(t, options, run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fitm-resume-cleanup-"));
  const controllerPath = require.resolve("../src/controllers/studentProfile.controller");
  const previousController = require.cache[controllerPath];
  t.after(async () => {
    t.mock.restoreAll();
    if (previousController) require.cache[controllerPath] = previousController;
    else delete require.cache[controllerPath];
    // Only remove the single fixture directory created by this test.
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("fitm-resume-cleanup-"));
    await fs.rm(root, { recursive: true, force: true });
  });

  const newStoragePath = `${RESUME_PREFIX}new.pdf`;
  const oldStoragePath = `${RESUME_PREFIX}old.pdf`;
  const newFilePath = path.join(root, newStoragePath);
  const oldFilePath = path.join(root, oldStoragePath);
  const bytes = Buffer.from("mock Resume PDF bytes");
  await fs.mkdir(path.dirname(newFilePath), { recursive: true });
  await fs.writeFile(newFilePath, bytes);
  if (options.existing) await fs.writeFile(oldFilePath, "previous Resume bytes");

  let committedRow = options.existing ? {
    student_id: STUDENT_ID,
    file_type: "resume",
    storage_path: oldStoragePath,
    extraction_status: "ready",
    extracted_text: USABLE_TEXT,
  } : null;
  let stagedRow;
  let transactionOutcome;
  let extractionUpdates = 0;
  const deletedPaths = [];
  const unlink = fs.unlink.bind(fs);
  t.mock.method(fs, "unlink", async (target) => {
    deletedPaths.push(target);
    return unlink(target);
  });
  t.mock.method(storage, "resolveStoragePath", (value) => path.join(root, value));
  t.mock.method(storage, "toStorageRelativePath", (value) => path.relative(root, value).split(path.sep).join("/"));
  t.mock.method(console, "error", () => {});
  t.mock.method(models.Student, "findByPk", async (id) => {
    assert.equal(id, STUDENT_ID);
    return { id };
  });

  const transaction = { LOCK: { UPDATE: "UPDATE" } };
  function resumeInstance(values) {
    return {
      ...values,
      async update(update, query = {}) {
        if (query.transaction) {
          assert.equal(query.transaction, transaction);
          if (options.failMetadata) throw new Error("Injected metadata write failure");
          stagedRow = { ...stagedRow, ...update };
        } else {
          assert.equal(transactionOutcome, "committed");
          extractionUpdates += 1;
          if (options.failExtractionSave) throw new Error("Injected extraction-status write failure");
          committedRow = { ...committedRow, ...update };
        }
        Object.assign(this, update);
        return this;
      },
    };
  }

  t.mock.method(models.sequelize, "transaction", async (callback) => {
    stagedRow = committedRow ? { ...committedRow } : null;
    try {
      const result = await callback(transaction);
      if (options.failCommit) throw new Error("Injected transaction commit failure");
      committedRow = stagedRow;
      transactionOutcome = "committed";
      return result;
    } catch (error) {
      stagedRow = null;
      transactionOutcome = "rolled_back";
      throw error;
    }
  });
  t.mock.method(models.StudentFile, "findOne", async (query) => {
    assert.deepEqual(query.where, { student_id: STUDENT_ID, file_type: "resume" });
    assert.equal(query.transaction, transaction);
    assert.equal(query.lock, transaction.LOCK.UPDATE);
    return stagedRow ? resumeInstance(stagedRow) : null;
  });
  t.mock.method(models.StudentFile, "create", async (values, query) => {
    assert.equal(query.transaction, transaction);
    if (options.failMetadata) throw new Error("Injected metadata write failure");
    stagedRow = { ...values };
    return resumeInstance(values);
  });

  const nativeExtraction = t.mock.method(resumeText, "extractResumeText", async (input) => {
    assert.deepEqual(input, bytes);
    if (options.failExtraction) throw new Error("Injected extraction failure");
    return options.useOcr ? "Too short" : USABLE_TEXT;
  });
  const ocrExtraction = t.mock.method(resumeOcr, "extractResumeWithOcr", async (input) => {
    assert.deepEqual(input, bytes);
    return USABLE_TEXT;
  });
  // Controller destructures service functions at load time; load after mocking.
  delete require.cache[controllerPath];
  const { uploadResume } = require(controllerPath);
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await uploadResume({
    user: { id: STUDENT_ID },
    file: { path: newFilePath, originalname: "resume.pdf", mimetype: "application/pdf", size: bytes.length },
  }, res);

  await run({
    res, committedRow, transactionOutcome, extractionUpdates, deletedPaths,
    newStoragePath, oldStoragePath, newFilePath, oldFilePath, bytes,
    nativeCalls: nativeExtraction.mock.callCount(),
    ocrCalls: ocrExtraction.mock.callCount(),
  });
}

async function assertFileExists(filePath) {
  assert.ok((await fs.stat(filePath)).isFile());
}

test("successful Resume upload commits metadata and retains the file with native extraction", async (t) => {
  await withUpload(t, {}, async (result) => {
    assert.equal(result.res.statusCode, 200);
    assert.equal(result.transactionOutcome, "committed");
    assert.equal(result.committedRow.storage_path, result.newStoragePath);
    assert.equal(result.committedRow.extracted_text, USABLE_TEXT);
    assert.equal(result.committedRow.extraction_status, "ready");
    assert.equal(result.committedRow.extraction_method, "pdf_text");
    assert.ok(result.committedRow.extracted_at instanceof Date);
    assert.equal(result.res.body.resume.extraction_status, "ready");
    assert.equal(result.res.body.resume.file_size, result.bytes.length);
    assert.equal(result.nativeCalls, 1);
    assert.equal(result.ocrCalls, 0);
    assert.deepEqual(result.deletedPaths, []);
    await assertFileExists(result.newFilePath);
  });
});

test("successful Resume replacement retains the new file, removes the old file and uses OCR fallback", async (t) => {
  await withUpload(t, { existing: true, useOcr: true }, async (result) => {
    assert.equal(result.res.statusCode, 200);
    assert.equal(result.committedRow.storage_path, result.newStoragePath);
    assert.equal(result.committedRow.extraction_status, "ready");
    assert.equal(result.committedRow.extraction_method, "ocr");
    assert.equal(result.committedRow.extracted_text, USABLE_TEXT);
    assert.equal(result.nativeCalls, 1);
    assert.equal(result.ocrCalls, 1);
    assert.deepEqual(result.deletedPaths, [result.oldFilePath]);
    await assertFileExists(result.newFilePath);
    await assert.rejects(fs.stat(result.oldFilePath), { code: "ENOENT" });
  });
});

test("metadata insert failure rolls back and cleans up the uncommitted Resume file", async (t) => {
  await withUpload(t, { failMetadata: true }, async (result) => {
    assert.equal(result.res.statusCode, 500);
    assert.equal(result.transactionOutcome, "rolled_back");
    assert.equal(result.committedRow, null);
    assert.equal(result.nativeCalls, 0);
    assert.deepEqual(result.deletedPaths, [result.newFilePath]);
    await assert.rejects(fs.stat(result.newFilePath), { code: "ENOENT" });
  });
});

test("commit failure after a staged metadata insert still cleans up the uncommitted file", async (t) => {
  await withUpload(t, { failCommit: true }, async (result) => {
    assert.equal(result.res.statusCode, 500);
    assert.equal(result.transactionOutcome, "rolled_back");
    assert.equal(result.committedRow, null);
    assert.deepEqual(result.deletedPaths, [result.newFilePath]);
    await assert.rejects(fs.stat(result.newFilePath), { code: "ENOENT" });
  });
});

test("replacement metadata failure preserves the previous row and file while cleaning the new upload", async (t) => {
  await withUpload(t, { existing: true, failMetadata: true }, async (result) => {
    assert.equal(result.res.statusCode, 500);
    assert.equal(result.transactionOutcome, "rolled_back");
    assert.equal(result.committedRow.storage_path, result.oldStoragePath);
    assert.equal(result.committedRow.extraction_status, "ready");
    assert.deepEqual(result.deletedPaths, [result.newFilePath]);
    await assertFileExists(result.oldFilePath);
    await assert.rejects(fs.stat(result.newFilePath), { code: "ENOENT" });
  });
});

test("extraction-status save failure after commit returns the existing error and retains the referenced file", async (t) => {
  await withUpload(t, { failExtractionSave: true }, async (result) => {
    assert.equal(result.res.statusCode, 500);
    assert.deepEqual(result.res.body, { message: "ไม่สามารถอัปโหลด Resume ได้" });
    assert.equal(result.transactionOutcome, "committed");
    assert.equal(result.extractionUpdates, 1);
    assert.equal(result.committedRow.storage_path, result.newStoragePath);
    assert.equal(result.committedRow.extraction_status, "pending");
    assert.equal(result.committedRow.extracted_text, null);
    assert.deepEqual(result.deletedPaths, []);
    await assertFileExists(result.newFilePath);
  });
});

test("replacement extraction-status save failure retains the newly committed file after old-file cleanup", async (t) => {
  await withUpload(t, { existing: true, failExtractionSave: true }, async (result) => {
    assert.equal(result.res.statusCode, 500);
    assert.equal(result.transactionOutcome, "committed");
    assert.equal(result.committedRow.storage_path, result.newStoragePath);
    assert.equal(result.committedRow.extraction_status, "pending");
    assert.deepEqual(result.deletedPaths, [result.oldFilePath]);
    await assertFileExists(result.newFilePath);
    await assert.rejects(fs.stat(result.oldFilePath), { code: "ENOENT" });
  });
});

test("extraction failure remains a successful stored upload with failed extraction status", async (t) => {
  await withUpload(t, { failExtraction: true }, async (result) => {
    assert.equal(result.res.statusCode, 200);
    assert.equal(result.committedRow.storage_path, result.newStoragePath);
    assert.equal(result.committedRow.extraction_status, "failed");
    assert.equal(result.committedRow.extraction_method, null);
    assert.equal(result.committedRow.extracted_text, null);
    assert.equal(result.committedRow.extracted_at, null);
    assert.equal(result.res.body.resume.extraction_status, "failed");
    assert.deepEqual(result.deletedPaths, []);
    assert.equal(result.ocrCalls, 0);
    await assertFileExists(result.newFilePath);
  });
});
