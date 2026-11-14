import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

test('failed refresh preserves last successful requests, marks stale data, and clears the error on retry', async () => {
  let fail = false;
  const messages = [], token = 'fixture-session';
  const code = section('async function loadCoopRequests()', 'function renderReadonlyStudentData()');
  const h = new Function('getMyCoopRequests', 'showMessage', `
    let coopRequests=[],coopRequestsLoaded=false,coopRequestsLoadError=false,coopRequestsLoading=false;
    const coopRequestSubmitting=false,coopRequestCancelling=false,currentStudent={},coopRequestMessage={};
    const canUseCoopFeatures=()=>true,getStudentToken=()=>${JSON.stringify(token)};
    const renderCoopRequests=()=>{},clearMessage=()=>{},studentOverview={accept(){},fail(){}};
    const getCoopRequestErrorMessage=()=> 'offline';
    ${code}; return {loadCoopRequests,state:()=>({rows:coopRequests,loaded:coopRequestsLoaded,error:coopRequestsLoadError})};
  `)(async () => { if (fail) throw Error('offline'); return { data: [{ id: 'persisted', status: 'approved' }] }; }, (_, message) => messages.push(message));
  assert.equal(await h.loadCoopRequests(), true);
  fail = true; assert.equal(await h.loadCoopRequests(), false);
  assert.deepEqual(h.state(), { rows: [{ id: 'persisted', status: 'approved' }], loaded: true, error: true });
  assert.match(messages.at(-1), /ยังแสดงข้อมูลครั้งล่าสุด/);
  fail = false; assert.equal(await h.loadCoopRequests(), true); assert.equal(h.state().error, false);
});

test('unconfirmed request state cannot open a new submission after a failed initial load', () => {
  const code = section('function openCoopRequestModal()', 'function closeCoopRequestModal()');
  const run = new Function('showToast', `const currentStudent={},canUseCoopFeatures=()=>true,coopRequestsLoaded=false,coopRequestsLoadError=true;${code};return openCoopRequestModal();`);
  let warning; assert.equal(run(message => { warning = message; }), false); assert.match(warning, /รีเฟรช/);
});

test('Student detail renders persisted teacher identity/time and full review history as safe text', () => {
  const element = () => ({ children: [], textContent: '', replaceChildren(...rows) { this.children = rows; }, append(row) { this.children.push(row); } });
  const targets = { coopDetailAdvisorApproval: element(), coopDetailReviewHistory: element() };
  const code = section('function renderCoopAdvisorApproval(', 'function renderCoopHeadApproval(');
  const run = new Function('document', 'createCoopDetailItem', `
    const getCoopAdvisorName=()=> 'Current Advisor',formatTeacherName=t=>t.first_name,
    formatCoopDate=value=>value,getCoopRequestStatusMeta=status=>({label:status});
    ${code}; return request=>{renderCoopAdvisorApproval(request);renderCoopReviewHistory(request);};
  `)({ getElementById: id => targets[id], createElement: element }, (label, value) => ({ label, value }));
  const review = { actor_role: 'teacher', decision: 'approve', teacher: { first_name: '<script>fixture</script>' }, created_at: '2026-11-08T01:00:00Z', from_status: 'advisor_review', to_status: 'department_head_review', reason: 'persisted reason' };
  run({ student: {}, reviews: [review] });
  assert.ok(targets.coopDetailAdvisorApproval.children.some(row => row.value === review.teacher.first_name));
  assert.ok(targets.coopDetailAdvisorApproval.children.some(row => row.value === review.created_at));
  assert.match(targets.coopDetailReviewHistory.children[0].textContent, /persisted reason/);
  assert.match(targets.coopDetailReviewHistory.children[0].textContent, /<script>fixture<\/script>/);
  run({ student: {}, reviews: [] }); assert.equal(targets.coopDetailReviewHistory.children.length, 1);
  assert.match(targets.coopDetailReviewHistory.children[0].textContent, /ยังไม่มีประวัติ/);
});

test('selecting a company clears old job context; explicit job-prefill can preserve it', () => {
  const elements = Object.fromEntries(['coopCompanyName', 'coopCompanyProvince', 'coopCompanyAddress'].map(id => [id, { value: '', append() {} }]));
  const code = section('function syncCoopCompanyFieldOwnership(', 'function openCoopRequestModal()');
  const h = new Function('document', `let selectedCoopJobPostingId='old-job',selectedCoopCompanyId=null,companySearchSequence=0,companyDuplicateSequence=0;
    let coopRequestSubmitting=false;
    const coopSelectedJobPosting={hidden:false,textContent:'old-job'},coopCompanySearchResults=null,coopCompanyDuplicateMessage=null;
    ${code};return {applyCoopCompany,job:()=>selectedCoopJobPostingId,banner:coopSelectedJobPosting,
      setSubmitting(value){coopRequestSubmitting=value;syncCoopCompanyFieldOwnership();}};
  `)({ getElementById: id => elements[id] });
  h.applyCoopCompany({ id: 'company', name: 'Saved', province: 'Province' }, { preserveJob: true }); assert.equal(h.job(), 'old-job');
  assert.equal(elements.coopCompanyName.readOnly, true); assert.equal(elements.coopCompanyAddress.readOnly, true);
  assert.equal(elements.coopCompanyProvince.disabled, true);
  const sourceAddress = 'ที่อยู่จากแหล่งอ้างอิง https://focalsolution.com/ (ไม่ยืนยันการเปิดรับ): Fixture';
  h.applyCoopCompany({ id: 'source-company', name: 'Sourced', province: 'Province', development_data: true, request_address: sourceAddress });
  assert.equal(elements.coopCompanyAddress.value, sourceAddress);
  assert.doesNotMatch(elements.coopCompanyAddress.value, /ข้อมูลจำลอง/);
  h.setSubmitting(true); h.setSubmitting(false); assert.equal(elements.coopCompanyProvince.disabled, true);
  h.applyCoopCompany({ id: 'other-company', name: 'Other', province: 'Other Province' });
  assert.equal(h.job(), null); assert.equal(elements.coopCompanyName.value, 'Other');
  h.applyCoopCompany(null); assert.equal(h.job(), null); assert.equal(h.banner.hidden, true);
  assert.equal(elements.coopCompanyName.readOnly, false); assert.equal(elements.coopCompanyAddress.readOnly, false);
  assert.equal(elements.coopCompanyProvince.disabled, false);
  h.setSubmitting(true); assert.equal(elements.coopCompanyProvince.disabled, true);
  h.setSubmitting(false); assert.equal(elements.coopCompanyProvince.disabled, false);
});
