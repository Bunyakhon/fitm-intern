import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
function element(tag) {
  return { tagName: tag, children: [], value: '', textContent: '', dataset: {}, handlers: {}, disabled: false,
    classList: { add() {} }, setAttribute(k, v) { this[k] = v; }, append(...items) { this.children.push(...items); }, replaceChildren(...items) { this.children = items; },
    addEventListener(name, callback) { this.handlers[name] = callback; },
    querySelectorAll(selector) { return this.children.flatMap(c => [...(selector.split(',').includes(c.tagName) ? [c] : []), ...(c.querySelectorAll?.(selector) || [])]); },
    querySelector(selector) { return this.querySelectorAll(selector)[0]; } };
}
const content = el => (el.textContent || '') + (el.children || []).map(content).join(' ');
const source = fs.readFileSync(new URL('../src/pages/coopAcademicCourses.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export (const|function) /g, '$1 ');
const view = new Function('updateCoopAcademicCourse', 'showConfirmModal', 'showToast', source + ';return {academicSummaryNode,mountAcademicCourses,courseResult};')(() => {}, () => {}, () => {});
test('academic summary keeps approval separate, shows studying warning and pending policy as safe text', () => {
  const doc = { createElement: element }, root = view.academicSummaryNode(doc, { status: 'pending_grades', counts: { studying: 2, passed: 3, failed: 0, unselected: 0 } });
  assert.match(content(root), /กำลังศึกษา 2 วิชา/); assert.match(content(root), /การอนุมัติคำร้องไม่ใช่การรับรองคุณสมบัติ/); assert.match(content(root), /รอยืนยันเกณฑ์/);
  assert.equal(view.courseResult('failed', 'F'), 'ไม่ผ่าน — F');
  assert.doesNotMatch(content(view.academicSummaryNode(doc, { status: 'verified_eligible' })), /ผ่านการตรวจสอบคุณสมบัติ/);
});
test('real submission renderer clears stale grade and disables grade when passed switches to studying', () => {
  const page = fs.readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8');
  const renderer = 'const renderCoopClassAdvisor = () => {};\n' + page.slice(page.indexOf('function renderCoopPrerequisiteCourses()'), page.indexOf('function validateCoopPrerequisites('));
  const body = element('tbody'), state = { status: 'passed', grade: 'B+' }, stateMap = new Map([['060243102', state]]);
  const run = new Function('document', 'coopPrerequisiteCourses', 'COOP_PREREQUISITE_COURSES', 'coopPrerequisiteProgram', 'coopPrerequisiteState', 'COOP_GRADE_OPTIONS', 'coopCatalogLoading', 'coopCatalogError', 'coopCatalogRevision', 'saveCoopRequestBtn', 'coopRequestSubmitting', 'coopPrerequisiteContext', 'setText', renderer + ';renderCoopPrerequisiteCourses();');
  run({ createElement: element, getElementById: () => null }, body, { IT: [{ course_code: '060243102', course_name: 'Fixture' }] }, 'IT', stateMap, ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'], false, null, 'legacy-v1', element('button'), false, element('p'), (e, text) => { e.textContent = text; });
  const selects = body.querySelectorAll('select'), grade = selects[0], status = selects[1];
  assert.equal(grade.value, 'B+'); assert.equal(grade.disabled, false);
  status.value = 'studying'; status.handlers.change(); assert.equal(state.grade, null); assert.equal(grade.value, ''); assert.equal(grade.disabled, true);
  const getter = page.slice(page.indexOf('function getCoopPrerequisiteData()'), page.indexOf('function renderCoopPrerequisiteCourses()'));
  const read = new Function('syncCoopPrerequisiteProgram', 'COOP_PREREQUISITE_COURSES', 'coopPrerequisiteProgram', 'coopPrerequisiteState', getter + ';return getCoopPrerequisiteData();');
  state.grade = 'A'; assert.equal(read(() => {}, { IT: [{ course_code: '060243102' }] }, 'IT', stateMap)[0].grade, null, 'Serializer also discards stale grade defensively');
});
test('failed save preserves draft and operation id; busy duplicate and changed session cannot submit', async () => {
  const root = element('section'), doc = { createElement: element }; let modal, live = true, calls = [];
  const request = { id: 'fixture', status: 'approved', academic: { available: true, revision: 0, status: 'pending_grades', counts: { studying: 1, passed: 0, failed: 0, unselected: 0 }, student_update_allowed: true,
    latest_courses: [{ course_code: '060243102', course_name: '<img src=x>', original_status: 'studying', original_grade: null, status: 'studying', grade: null }], history: [] } };
  view.mountAcademicCourses({ document: doc, root, request, editable: true, isLive: () => live,
    confirm: options => { modal = options; return () => options.onClose(); }, toast: () => {}, save: async (id, code, payload) => { calls.push(payload); throw Error('Synthetic network failure'); } });
  const form = root.querySelector('form'), selects = root.querySelectorAll('select'); selects[1].value = 'B+';
  form.handlers.submit({ preventDefault() {} }); const first = modal; form.handlers.submit({ preventDefault() {} }); assert.equal(modal, first);
  await assert.rejects(first.onConfirm(), /Synthetic network failure/); assert.equal(selects[1].value, 'B+'); first.onClose();
  form.handlers.submit({ preventDefault() {} }); await assert.rejects(modal.onConfirm()); modal.onClose(); assert.equal(calls[0].operation_id, calls[1].operation_id);
  live = false; form.handlers.submit({ preventDefault() {} }); assert.equal(calls.length, 2); assert.ok(content(root).includes('<img src=x>'));
});
test('new API adapter binds the request to the captured Student session and preserves operation/version payload', async () => {
  const text = fs.readFileSync(new URL('../src/api/coopRequest.api.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export function /g, 'function ');
  let seen; const api = new Function('apiRequest', 'getStudentToken', text + ';return updateCoopAcademicCourse;')((path, options) => { seen = { path, options }; return Promise.resolve({ success: true }); }, () => 'fixture-session');
  const payload = { operation_id: 'fixture-operation', expected_revision: 1 }; await api('req/id', '060243102', payload);
  assert.equal(seen.options.auth, false); assert.equal(seen.options.studentSessionToken, 'fixture-session'); assert.equal(seen.options.headers.Authorization, 'Bearer fixture-session'); assert.equal(seen.options.body, payload); assert.match(seen.path, /req%2Fid\/academic-courses/);
});
