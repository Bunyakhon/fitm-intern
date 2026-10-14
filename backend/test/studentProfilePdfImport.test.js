const test = require("node:test"), assert = require("node:assert/strict");
const { createStudentProfilePdfImportService, fileInfo, safeExtraction, validateDuplicates } = require("../src/services/studentProfilePdfImport.service");
const { localProcessorUrl } = require("../src/services/studentProfilePdf.client");
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
const revision = '"' + "a".repeat(64) + '"';
const blank = () => ({ student: { id: owner, student_id: "990000000004" }, profile: { allergies: "preserve" }, addresses: [], education: [], training: [], skills: [], documents: [], profile_revision: revision });
const extracted = () => ({ template: "TGDE-COOP-02", page_count: 4, method: "pdf_text", identity: { student_id: "990000000004" }, candidates: [], records: { addresses: [], education: [], training: [], skills: [] }, warnings: [] });
const file = () => { const buffer = Buffer.from("%PDF-synthetic-pure-test"); return { buffer, size: buffer.length, originalname: "synthetic.pdf", mimetype: "application/pdf" }; };
function fixture(data = extracted(), extra = {}) {
  let reads = 0, writes = 0;
  const aggregate = { read: async (_owner, inspect) => { reads++; return inspect ? inspect({ snapshot: blank(), transaction: { synthetic_owner_read_lock: true } }) : blank(); }, prepareAggregate: body => { writes++; return body; } };
  const models = { StudentFile: extra.StudentFile || { findOne: async () => null } };
  return { service: createStudentProfilePdfImportService(models, aggregate, { secret: "synthetic-secret", extract: async () => data, ...extra }), counts: () => ({ reads, writes }) };
}
test("PDF extension/MIME/signature/size/filename validation rejects unsafe input", () => {
  assert.ok(fileInfo(file()).sha256);
  for (const overrides of [{ originalname: "../x.pdf" }, { originalname: "x.html" }, { mimetype: "text/html" }, { size: 0 }, { size: 10*1024*1024+1 }, { buffer: Buffer.from("notpdf"), size: 6 }, { originalname: "x\u0000.pdf" }]) assert.throws(() => fileInfo({ ...file(), ...overrides }));
});
test("PDF processor configuration permits internal hosts and rejects external/credential/redirect origins", t => {
  const old = process.env.PROFILE_PDF_NLP_URL; t.after(() => old === undefined ? delete process.env.PROFILE_PDF_NLP_URL : process.env.PROFILE_PDF_NLP_URL = old);
  for (const url of ["http://localhost:8000", "http://nlp-service:8000", "http://172.19.0.2:8000"]) { process.env.PROFILE_PDF_NLP_URL = url; assert.equal(localProcessorUrl().pathname, "/api/v1/profile-pdf"); }
  for (const url of ["https://external.example", "http://8.8.8.8:8000", "http://user:password@localhost:8000", "http://localhost:8000/other"]) { process.env.PROFILE_PDF_NLP_URL = url; assert.throws(localProcessorUrl); }
});
test("PDF processor reuses existing NLP service configuration instead of container localhost",t=>{
  const old=process.env.PROFILE_PDF_NLP_URL,base=process.env.NLP_SERVICE_BASE_URL;t.after(()=>{old===undefined?delete process.env.PROFILE_PDF_NLP_URL:process.env.PROFILE_PDF_NLP_URL=old;base===undefined?delete process.env.NLP_SERVICE_BASE_URL:process.env.NLP_SERVICE_BASE_URL=base;});
  delete process.env.PROFILE_PDF_NLP_URL;process.env.NLP_SERVICE_BASE_URL='http://nlp-service:8000/';assert.equal(localProcessorUrl().origin,'http://nlp-service:8000');delete process.env.NLP_SERVICE_BASE_URL;assert.equal(localProcessorUrl().hostname,'nlp-service');
});
test("preview validates owner identity and performs no mutation", async () => {
  const f = fixture(); const result = await f.service.preview(owner, file()); assert.equal(result.import_status, "preview"); assert.equal(result.identity_status, "matched"); assert.deepEqual(f.counts(), { reads: 1, writes: 0 }); assert.equal(result.snapshot.profile.allergies, "preserve");
});
test("mismatched or unreadable PDF student ID cannot reach preview", async () => {
  const wrong = extracted(); wrong.identity.student_id = "another-student"; await assert.rejects(fixture(wrong).service.preview(owner,file()), { status: 422, code: "PDF_STUDENT_ID_MISMATCH" });
  const unreadable = extracted(); unreadable.warnings.push("STUDENT_ID_UNREADABLE"); await assert.rejects(fixture(unreadable).service.preview(owner,file()), { status: 422 });
});
test("absent PDF identity is explicitly flagged and never changes account ID", async () => {
  const data = extracted(); data.identity = {}; const result = await fixture(data).service.preview(owner,file()); assert.equal(result.identity_status,"not_present"); assert.equal(result.snapshot.student.student_id,"990000000004");
});
test("receipt is signed, owner bound, expiring and malformed tokens fail safely", async () => {
  let clock = 1000000; const f = fixture(extracted(), { now: () => clock }); const preview = await f.service.preview(owner,file());
  assert.equal((await f.service.status(owner, { receipt: preview.receipt })).import_status,"not_committed");
  await assert.rejects(f.service.status(other, { receipt: preview.receipt }), { status: 403 });
  for (const token of ["a.b", preview.receipt.slice(0,-1)+"!", "", "x".repeat(2049)]) await assert.rejects(f.service.status(owner, { receipt: token }));
  clock += 31*60000; await assert.rejects(f.service.commit(owner,file(),{receipt:preview.receipt,changes:{}},revision), { status: 410 });
  assert.equal((await f.service.status(owner,{receipt:preview.receipt})).import_status,"not_committed");
});
test("committed status inspects its receipt and snapshot under the same owner read lock", async () => {
  const f=fixture(extracted(),{StudentFile:{findOne:async options=>{assert.equal(options.transaction.synthetic_owner_read_lock,true);assert.ok(options.attributes.includes('document_version'));return {id:options.where.id,original_name:'synthetic.pdf',document_version:42,extraction_status:'ready'};}}});
  const preview=await f.service.preview(owner,file());const status=await f.service.status(owner,{receipt:preview.receipt});assert.equal(status.import_status,'committed');assert.equal(status.document.document_version,42);assert.equal(status.profile_revision,revision);assert.equal(status.replayed,true);
});
test("missing If-Match, changed file and changed preview revision fail before staging", async () => {
  const f = fixture(); const preview = await f.service.preview(owner,file());
  await assert.rejects(f.service.commit(owner,file(),{receipt:preview.receipt,changes:{}},undefined), { status: 428 });
  await assert.rejects(f.service.commit(owner,{...file(),originalname:"different.pdf"},{receipt:preview.receipt,changes:{}},revision), { status: 400 });
  await assert.rejects(f.service.commit(owner,file(),{receipt:preview.receipt,changes:{}},'"'+"b".repeat(64)+'"'), { status: 409 });
  assert.equal(f.counts().writes,0);
});
test("review issues a new revision validator for the same once-only import identity", async () => {
  const f = fixture(); const preview = await f.service.preview(owner,file()); const review = await f.service.review(owner,{receipt:preview.receipt});
  const decode = token => JSON.parse(Buffer.from(token.split('.')[0],"base64url")); assert.equal(decode(preview.receipt).id,decode(review.receipt).id); assert.equal(review.import_status,"preview"); assert.equal(f.counts().writes,0);
});
test("extraction allowlists prevent read-only/policy/workflow assignments", () => {
  const data = extracted(); data.candidates = [{scope:"student",key:"first_name",value:"injected"},{scope:"student",key:"advisor_teacher_id",value:other},{scope:"profile",key:"national_id_ciphertext",value:"secret"},{scope:"profile",key:"signature",value:"signed"},{scope:"profile",key:"religion",value:"Synthetic"}];
  const result = safeExtraction(data); assert.equal(result.candidates.length,1); assert.equal(result.candidates[0].key,"religion");
});
test("invalid extracted date/GPA/safe integer remains editable with validation error", () => {
  const data = extracted(); data.candidates = [{scope:"profile",key:"birth_date",value:"2023-02-30"},{scope:"student",key:"gpa",value:"4.01"},{scope:"profile",key:"father_age",value:"9007199254740993"}];
  assert.ok(safeExtraction(data).candidates.every(item=>item.validation_error));
});
test("empty extraction fields are omitted, repeated identical records are folded", () => {
  const data = extracted(); data.candidates = [{scope:"profile",key:"mother_name",value:""}]; data.records.skills=[{values:{category:"computer",skill_name:"Python"}},{values:{category:"computer",skill_name:"Python"}}]; const result=safeExtraction(data); assert.equal(result.candidates.length,0); assert.equal(result.records.skills.length,1);
});
test("server duplicate checks prevent repeated creates and preserve ownership", () => {
  const snapshot=blank(); snapshot.skills=[{id:owner,category:"computer",skill_name:"Python"}]; const op={kind:"skills",action:"create",patch:{category:"computer",skill_name:" PYTHON "}};
  assert.throws(()=>validateDuplicates(snapshot,{operations:[op]}), {code:"PDF_IMPORT_DUPLICATE_RECORD"}); assert.throws(()=>validateDuplicates(blank(),{operations:[op,op]}));
  assert.throws(()=>validateDuplicates(snapshot,{operations:[{kind:"skills",action:"update",id:other,patch:{proficiency:"good"}}]}),{status:404});
});
test("server import never deletes children and updates don't create duplicate identities", () => {
  const snapshot=blank(); snapshot.skills=[{id:owner,category:"computer",skill_name:"Python"},{id:other,category:"computer",skill_name:"SQL"}];
  assert.throws(()=>validateDuplicates(snapshot,{operations:[{kind:"skills",action:"delete",id:owner}]}));
  assert.throws(()=>validateDuplicates(snapshot,{operations:[{kind:"skills",action:"update",id:owner,patch:{skill_name:"SQL"}}]}));
  assert.doesNotThrow(()=>validateDuplicates(snapshot,{operations:[{kind:"skills",action:"update",id:owner,patch:{proficiency:"very_good"}}]}));
});
