import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { ProfileSectionDraft, workspaceFields, canonicalWorkspaceValue, validateProfileDocument } from "../src/pages/studentProfileWorkspaceDraft.js";
import { StudentProfileDraft } from "../src/pages/studentProfileDraft.js";

test("five accessible horizontal tabs retain the existing panels and default", () => {
  const html = readFileSync(new URL("../src/student_coop/student_coop.html", import.meta.url), "utf8");
  const strip = html.slice(html.indexOf('id="studentProfileTabs"'), html.indexOf('class="profile-workspace-notice"'));
  assert.equal((strip.match(/role="tab"/g) || []).length, 5);
  assert.match(strip, /id="profilePersonalTab"[^>]*aria-selected="true"/);
  for (const name of ["Personal", "Contact", "Education", "Documents", "Account"]) assert.match(html, new RegExp('id="profile' + name + 'Panel"[^>]*role="tabpanel"'));
  assert.equal((html.match(/data-target="panel-profile"/g) || []).length, 1);
  assert.doesNotMatch(strip, /onclick=|href=/);
});
test("partial drafts distinguish omission, explicit clears and unchanged numeric representations", () => {
  const draft = new ProfileSectionDraft(workspaceFields.academic, { department: "IT", faculty: "Faculty", last_semester_gpa: "3.00" }, '"old"');
  draft.values.last_semester_gpa = "3"; assert.equal(draft.dirty(), false);
  draft.values.department = ""; assert.deepEqual(draft.patch(), { department: null });
  assert.equal(draft.revision, '"old"');
});
test("foreign API refresh cannot rebase or overwrite an unsaved section", () => {
  const draft = new ProfileSectionDraft(workspaceFields.family, { father_phone: "0000000000" }, '"old"');
  draft.values.father_phone = "0000000001";
  assert.equal(draft.accept({ father_phone: "0000000002" }, '"foreign"'), false);
  assert.equal(draft.values.father_phone, "0000000001"); assert.equal(draft.revision, '"old"');
});
test("own commit acknowledges only the submitted snapshot and preserves later typing", () => {
  const draft = new ProfileSectionDraft(workspaceFields.family, { father_address: "Old" }, '"old"');
  draft.values.father_address = "Submitted"; const sent = { ...draft.values };
  draft.values.father_address = "Typed during save";
  draft.accept({ father_address: "Submitted" }, '"new"', { ownRevision: '"old"', sent });
  assert.equal(draft.baseline.father_address, "Submitted"); assert.deepEqual(draft.patch(), { father_address: "Typed during save" });
});
test("own unrelated commit advances matching revisions while retaining other section drafts", () => {
  const draft = new ProfileSectionDraft(workspaceFields.addresses, { house_no: "1", road: "Road" }, '"old"');
  draft.values.house_no = "2"; draft.accept({ house_no: "1", road: "Road" }, '"new"', { ownRevision: '"old"' });
  assert.deepEqual(draft.patch(), { house_no: "2" }); assert.equal(draft.revision, '"new"');
});
test("pristine sections accept current server values without generating writes", () => {
  const draft = new ProfileSectionDraft(workspaceFields.addresses, { postal_code: "00100" }, '"old"');
  draft.accept({ postal_code: "00200" }, '"new"'); assert.equal(draft.dirty(), false); assert.equal(draft.values.postal_code, "00200");
});
test("education supports draft optional values and validates GPA/year and required level", () => {
  const draft = new ProfileSectionDraft(workspaceFields.education, { education_level: "bachelor" }, '"old"');
  assert.equal(draft.patch(true).institution_name, null);
  for (const value of ["9007199254740993", "10000", "1.5", "0"]) { draft.values.graduation_year = value; assert.throws(() => draft.patch(true)); }
  draft.values.graduation_year = "2026";
  for (const value of ["4.01", "3.456", "NaN"]) { draft.values.gpa = value; assert.throws(() => draft.patch(true)); }
  draft.values.gpa = "3.50"; assert.equal(draft.patch(true).graduation_year, 2026);
  draft.values.education_level = ""; assert.throws(() => draft.patch(true));
});
test("real calendar dates and leap centuries are checked without rejecting future document expiry", () => {
  const spec = workspaceFields.personal.find(spec => spec.key === "national_id_expiry_date");
  for (const value of ["2023-02-30", "1900-02-29", "2100-02-29", "0000-01-01"]) assert.throws(() => canonicalWorkspaceValue(spec, value, true));
  for (const value of ["2000-02-29", "2024-02-29", "2040-01-01"]) assert.equal(canonicalWorkspaceValue(spec, value, true), value);
});
test("existing family modal rejects unsafe integers without changing its baseline", () => {
  const draft = new StudentProfileDraft({ father_age: "60", mother_age: "59" }, '"old"');
  for (const father_age of ["9007199254740993", "2147483648", "1.5", "-1"]) assert.throws(() => draft.patch({ father_age, mother_age: "59" }));
  assert.deepEqual(draft.patch({ father_age: "61", mother_age: "59" }), { father_age: 61 }); assert.equal(draft.baseline.father_age, "60");
});
test("skills preserve backend vocabulary, nullable proficiency and separate categories", () => {
  const draft = new ProfileSectionDraft(workspaceFields.skills, { category: "language", skill_name: "Thai" }, '"old"');
  draft.values.proficiency = "very_good"; assert.deepEqual(draft.patch(), { proficiency: "very_good" });
  draft.values.proficiency = "poor"; assert.throws(() => draft.patch());
});
test("document selection validates real API MIME/extension/size and additional label", () => {
  const pdf = { type: "application/pdf", name: "safe.pdf", size: 100 };
  assert.doesNotThrow(() => validateProfileDocument(pdf, "transcript", ""));
  for (const file of [{ ...pdf, size: 0 }, { ...pdf, size: 10 * 1024 * 1024 + 1 }, { ...pdf, name: "safe.png" }, { ...pdf, type: "text/html" }]) assert.throws(() => validateProfileDocument(file, "transcript", ""));
  assert.throws(() => validateProfileDocument(pdf, "supporting_other", ""));
  assert.throws(() => validateProfileDocument({ type: "image/png", name: "safe.png", size: 1 }, "external_profile_pdf", ""));
});
function apiFixture() {
  const calls = [];
  const source = readFileSync(new URL("../src/api/studentProfile.api.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "").replaceAll("export function", "function");
  const context = vm.createContext({ apiRequest: (path, options) => { calls.push({ path, ...options }); return Promise.resolve({}); } });
  vm.runInContext(source, context); return { calls, context, run: code => vm.runInContext(code, context) };
}
test("collection adapters use installed GET/POST/PATCH/DELETE paths and If-Match", async () => {
  const f = apiFixture();
  for (const kind of ["addresses", "education", "training", "skills"]) {
    await f.run('getStudentProfileRecords("' + kind + '")');
    await f.run('createStudentProfileRecord("' + kind + '",{institution:null},"revision")');
    await f.run('updateStudentProfileRecord("' + kind + '","owned-id",{qualification:null},"revision")');
    await f.run('deleteStudentProfileRecord("' + kind + '","owned-id","revision")');
  }
  assert.equal(f.calls.length, 16);
  for (let i = 0; i < f.calls.length; i += 4) { assert.deepEqual(f.calls.slice(i, i + 4).map(call => call.method), ["GET", "POST", "PATCH", "DELETE"]); for (const call of f.calls.slice(i + 1, i + 4)) assert.equal(call.headers["If-Match"], "revision"); }
  assert.throws(() => f.run('createStudentProfileRecord("education",{},null)')); assert.throws(() => f.run('getStudentProfileRecords("other")')); assert.equal(f.calls.length, 16);
});
test("document adapters use private blob downloads and preserve revision/progress contract", async () => {
  const f = apiFixture(); f.context.body = { synthetic: true }; f.context.progress = () => {};
  await f.run('getStudentProfileDocuments()'); await f.run('uploadStudentProfileDocument("transcript",body,"revision",progress)');
  await f.run('updateStudentProfileDocument("owned-id",{document_label:null},"revision")'); await f.run('deleteStudentProfileDocument("owned-id","revision")'); await f.run('downloadStudentProfileDocument("owned-id")');
  assert.equal(f.calls[1].onUploadProgress, f.context.progress); assert.equal(f.calls[1].headers["If-Match"], "revision");
  assert.equal(f.calls.at(-1).path, "/api/student-profile/documents/owned-id/download"); assert.equal(f.calls.at(-1).responseType, "blob");
});
