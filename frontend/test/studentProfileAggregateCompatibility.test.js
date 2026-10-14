import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const source = readFileSync(new URL("../src/api/studentProfile.api.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "").replaceAll("export function ", "function ");
function client() {
  const calls = [];
  const context = vm.createContext({ FormData, Blob, apiRequest: (path, options) => { calls.push({ path, ...options }); return Promise.resolve({}); } });
  vm.runInContext(source, context);
  return { context, calls };
}
test("academic and photo API clients use the supplied aggregate snapshot without fetching or rebasing", async () => {
  const { context, calls } = client(), revision = '"' + "a".repeat(64) + '"';
  const patch = { major: "INE" }, image = new FormData();
  await context.updateStudentInfo(patch, revision); await context.uploadStudentProfileImage(image, revision);
  assert.equal(calls[0].body, patch); assert.equal(calls[1].body, image);
  assert.equal(calls[0].headers["If-Match"], revision); assert.equal(calls[1].headers["If-Match"], revision);
  assert.deepEqual(calls.map(c => c.path), ["/api/student-profile/student-info", "/api/student-profile/profile-image"]);
});
test("missing aggregate revision cannot submit academic or photo mutations", () => {
  const { context, calls } = client();
  assert.throws(() => context.updateStudentInfo({ major: "INE" }));
  assert.throws(() => context.uploadStudentProfileImage(new FormData())); assert.equal(calls.length, 0);
});
test("Resume client retains its separate unversioned contract", async () => {
  const { context, calls } = client();
  await context.uploadStudentResume(new Blob(["synthetic"], { type: "application/pdf" }));
  assert.equal(calls[0].path, "/api/student-profile/resume"); assert.equal(calls[0].headers, undefined); assert.ok(calls[0].body.get("resume"));
});
test("legacy profile client treats revision as opaque and forwards only the dirty object", async () => {
  const { context, calls } = client(), patch = { allergies: null }, revision = '"' + "b".repeat(64) + '"';
  await context.updateMyStudentProfile(patch, revision);
  assert.equal(calls[0].body, patch); assert.equal(calls[0].headers["If-Match"], revision); assert.equal(calls.length, 1);
});

const page = readFileSync(new URL("../src/pages/student_coop.js", import.meta.url), "utf8");
function fragment(start, end) { const from = page.indexOf(start), to = page.indexOf(end, from); assert.ok(from >= 0 && to > from); return page.slice(from, to); }
function photoPage({ conflict = false } = {}) {
  let onChange, confirmation, reads = 0;
  const calls = [], image = new Blob(["synthetic"], { type: "image/png" });
  const context = vm.createContext({ FormData, URL, console: { error() {} },
    selectedProfileImageFile: null, selectedProfileImageRevision: null, studentProfileRevision: '"snapshot-1"',
    isProfileImageUploading: false, isStudentProfileSaving: false, currentStudent: {},
    profileImageInput: { files: [image], value: "safe.png", addEventListener(name, callback) { onChange = callback; } },
    uploadProfileImageBtn: {}, profileImageMessage: {}, localStorage: { getItem: () => "synthetic" },
    getStudentToken: () => "synthetic",
    showProfileImagePreview() {}, resetProfileImagePreview() {}, clearMessage() {}, showMessage() {}, showToast() {},
    redirectToLogin() {}, clearAuthentication() {}, setStudentInfoButtonState() {},
    showConfirmModal: options => { confirmation = options; },
    getStudentProfileImage: async () => { ++reads; return image; },
    uploadStudentProfileImage: async (body, revision) => { calls.push({ body, revision }); if (conflict) throw Object.assign(new Error("Synthetic stale"), { status: 409 }); return { profile_image: "synthetic", profile_revision: '"snapshot-3"' }; },
    loadStudentProfile: async () => { context.studentProfileRevision = '"snapshot-2"'; return {}; },
  });
  vm.runInContext(fragment("function profileRequestDiagnostic(", "function setStudentInfoButtonState(")
    + fragment("async function uploadSelectedProfileImage(", "async function saveStudentInfo(")
    + fragment('profileImageInput?.addEventListener("change"', 'document.getElementById("editBirthDate")'), context);
  return { context, calls, choose: () => onChange(), reads: () => reads, confirmation: () => confirmation };
}
test("selected photo keeps its original revision and preview across API refresh", async () => {
  const f = photoPage(); f.choose(); f.context.studentProfileRevision = '"snapshot-2"';
  await f.context.loadProfileImage(true); assert.equal(f.reads(), 0);
  await f.context.uploadSelectedProfileImage(); assert.equal(f.calls[0].revision, '"snapshot-1"');
  assert.equal(f.context.selectedProfileImageFile, null); assert.equal(f.context.selectedProfileImageRevision, null);
});
test("stale photo upload preserves selection and only rebases after explicit confirmation", async () => {
  const f = photoPage({ conflict: true }); f.choose();
  await f.context.uploadSelectedProfileImage(); assert.ok(f.context.selectedProfileImageFile);
  assert.equal(f.context.selectedProfileImageRevision, '"snapshot-1"');
  await f.confirmation().onConfirm(); assert.equal(f.context.selectedProfileImageRevision, '"snapshot-2"'); assert.equal(f.calls.length, 1);
});
