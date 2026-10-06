import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

const source = readFileSync(new URL("../src/pages/student_coop.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../src/student_coop/student_coop.html", import.meta.url), "utf8");
function between(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing source boundary: ${start}`);
  return source.slice(from, to);
}

// Shared checks execute actual page functions in a controlled DOM and, when
// explicitly enabled, Chromium using the original HTML. APIs are mocked.
const browserScript = `
let currentStudent = null, currentStudentProfile = null, coopRequestSubmitting = false;
let selectedCoopCompanyId = null, selectedCoopJobPostingId = null, profileMajor = 'IT';
const profileLoadMessage = document.createElement('p');
const coopRequestFormMessage = document.getElementById('coopRequestFormMessage');
let feedback = '', submitted = [], closes = 0;
const getMyStudentProfile = async () => ({student: {major: profileMajor}});
const renderStudent = () => {}, populateStudentInfoForm = () => {}, loadProfileImage = async () => {};
const renderStudentProfile = () => {}, setProfileLoading = () => {}, clearAuthentication = () => {}, redirectToLogin = () => {};
const showMessage = (element, message) => { feedback = message; element.textContent = message; };
const clearMessage = () => {}, setText = (element, value) => { if (element) element.textContent = value; };
const setCoopRequestFormSubmitting = () => {}, renderCoopRequests = () => {}, showToast = () => {};
const createCoopRequest = async (payload) => { submitted.push(payload); };
const closeCoopRequestModal = () => { closes++; }, resetCoopRequestCreateForm = () => {};
const activateDashboardPanel = async () => false;
const getCoopRequestErrorMessage = () => 'request failed';
`;

// loadStudentProfile ends before profile form helpers; locate its closing brace
// by the next top-level declaration, rather than copying its implementation.
const profileStart = source.indexOf('async function loadStudentProfile()');
const profileEnd = source.indexOf('\nfunction ', profileStart);
const profileCode = source.slice(profileStart, profileEnd);
const prelude = browserScript;
const checks = `
const results = [];
async function check(name, fn) {
  try { await fn(); results.push({name, ok: true}); }
  catch (error) { results.push({name, ok: false, error: error.message}); }
}
function equal(actual, expected) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(JSON.stringify({actual, expected})); }
function truth(value, message) { if (!value) throw new Error(message); }
const IT = ['060243102','060243104','060243108','060243112','060243122'];
const INE = ['060233107','060233112','060233113','060233202','060233204'];
const codes = () => [...coopPrerequisiteCourses.querySelectorAll('tr[data-course-code]')].map(row => row.dataset.courseCode);
const status = code => document.getElementById('coop-status-' + code);
const grade = code => document.getElementById('coop-grade-' + code);
function choose(code, value) { status(code).value = value; status(code).dispatchEvent(new Event('change')); }
function enter(code, value) { grade(code).value = value; grade(code).dispatchEvent(new Event('input')); }
async function profile(major) { profileMajor = major; truth(await loadStudentProfile(), 'Profile reload failed'); }
await check('IT renders exactly five IT courses', async () => { await profile('IT'); equal(codes(), IT); });
await check('IT renders no INE course', () => { truth(!INE.some(code => document.getElementById('coop-status-' + code)), 'INE leaked'); });
await check('Passed with grade is valid', () => { choose(IT[0], 'passed'); enter(IT[0], 'B+'); equal(validateCoopPrerequisites(getCoopPrerequisiteData()), null); truth(grade(IT[0]).required && !grade(IT[0]).disabled, 'Grade must be required and enabled'); });
await check('Passed without grade fails', () => { enter(IT[0], '  '); truth(validateCoopPrerequisites(getCoopPrerequisiteData())?.includes(IT[0]), 'Missing grade accepted'); });
await check('Studying clears and disables grade without requiring it', () => { enter(IT[0], 'A'); choose(IT[0], 'studying'); equal(grade(IT[0]).value, ''); truth(grade(IT[0]).disabled && !grade(IT[0]).required, 'Studying grade enabled/required'); equal(validateCoopPrerequisites(getCoopPrerequisiteData()), null); });
await check('Passed and studying are mutually exclusive', () => { choose(IT[0], 'passed'); enter(IT[0], 'A'); choose(IT[0], 'studying'); equal(getCoopPrerequisiteData()[0].status, 'studying'); choose(IT[0], 'passed'); equal(getCoopPrerequisiteData()[0].status, 'passed'); equal(getCoopPrerequisiteData()[0].grade, null); });
await check('IT form payload contains only IT courses', () => { equal(getCoopRequestFormData().prerequisite_courses.map(course => course.course_code), IT); });
await check('IT to INE uses actual Profile reload and removes all IT rows', async () => { enter(IT[0], 'A'); await profile('INE'); equal(codes(), INE); truth(!IT.some(code => document.getElementById('coop-status-' + code)), 'IT rows remained'); });
await check('IT status and grade do not leak into INE', () => { truth(getCoopPrerequisiteData().every(course => course.status === null && course.grade === null), 'Stale IT state'); truth(INE.every(code => status(code).value === '' && grade(code).value === ''), 'Stale DOM controls'); });
await check('INE renders exactly five INE courses', () => { equal(codes(), INE); });
await check('INE renders no IT course', () => { truth(!IT.some(code => document.getElementById('coop-status-' + code)), 'IT leaked'); });
await check('INE form payload contains only INE courses', () => { choose(INE[0], 'passed'); enter(INE[0], 'C+'); equal(getCoopRequestFormData().prerequisite_courses.map(course => course.course_code), INE); });
await check('INE to IT uses actual Profile reload and removes all INE rows', async () => { await profile('IT'); equal(codes(), IT); truth(!INE.some(code => document.getElementById('coop-status-' + code)), 'INE rows remained'); });
await check('INE status and grade do not leak into IT, including prior IT values', () => { truth(getCoopPrerequisiteData().every(course => course.status === null && course.grade === null), 'Stale INE/IT state'); truth(IT.every(code => status(code).value === '' && grade(code).value === ''), 'Stale DOM controls'); });
await check('Unselected courses preserve original optional behavior', () => { equal(validateCoopPrerequisites(getCoopPrerequisiteData()), null); });
await check('Profile refresh for unchanged program preserves edits', async () => { choose(IT[1], 'passed'); enter(IT[1], 'B'); await profile('IT'); equal(getCoopPrerequisiteData()[1].grade, 'B'); });
await check('Unsaved Profile selector edits do not change the request program', () => { document.getElementById('studentMajorInput').value = 'INE'; equal(codes(), IT); equal(getCoopRequestFormData().prerequisite_courses.map(course => course.course_code), IT); });
await check('Serialization filters foreign state and clears studying grades', () => { coopPrerequisiteState.set(INE[0], {status: 'passed', grade: 'A'}); coopPrerequisiteState.set(IT[2], {status: 'studying', grade: 'A'}); equal(getCoopPrerequisiteData().map(course => course.course_code), IT); equal(getCoopPrerequisiteData()[2].grade, null); });
await check('Form serialization rechecks the current program before submission', () => { currentStudent.major = 'INE'; equal(getCoopRequestFormData().prerequisite_courses.map(course => course.course_code), INE); equal(codes(), INE); truth(getCoopPrerequisiteData().every(course => course.status === null && course.grade === null), 'Stale submit state'); });
await check('Unknown program renders no invented courses', async () => { await profile('OTHER'); equal(codes(), []); equal(getCoopPrerequisiteData(), []); });
await check('Request sections and existing controls remain in the actual HTML', () => { ['coopCompanySearch','coopCompanyName','coopLetterRecipientName','coopWorkStartDate','coopWorkEndDate','coopSignerName','coopAdvisorName','coopRequestDetailModal','coopRequestHistoryBody','panel-mentor'].forEach(id => truth(document.getElementById(id), 'Missing section/control: ' + id)); });
function completeRequest() {
  for (const id of ['coopCompanyName','coopLetterRecipientName','coopCompanyAddress']) document.getElementById(id).value = 'Fixture';
  const province = document.getElementById('coopCompanyProvince'); province.value = province.options[1].value;
  document.getElementById('coopWorkStartDate').value = '2026-11-01';
  document.getElementById('coopWorkEndDate').value = '2027-02-01';
  document.querySelector('input[name="delivery_methods"]').checked = true;
}
await check('Submit rejects missing passed grade through in-page feedback', async () => { await profile('IT'); completeRequest(); choose(IT[0], 'passed'); await submitCoopRequestForm({preventDefault(){}}); equal(submitted.length, 0); truth(feedback.includes(IT[0]), 'Missing in-page error'); });
await check('Submit supports studying and sends five canonical-key prerequisite results', async () => { choose(IT[0], 'studying'); await submitCoopRequestForm({preventDefault(){}}); equal(submitted.length, 1); equal(submitted[0].prerequisite_courses.map(course => course.course_code), IT); equal(submitted[0].prerequisite_courses[0].status, 'studying'); truth(submitted[0].prerequisite_courses.every(course => !('course_name' in course)), 'Trusted names must come from backend'); equal(closes, 1); });
const output = document.createElement('pre'); output.id = 'prerequisite-test-results'; output.textContent = JSON.stringify(results); document.body.append(output);
`;

function createControlledDom() {
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.listeners = {}; this.value = ''; this.textContent = ''; }
    append(...elements) { this.children.push(...elements); }
    replaceChildren(...elements) { this.children = elements; }
    setAttribute(name, value) { this[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    dispatchEvent(event) { this.listeners[event.type]?.(event); }
    get options() { return this.children; }
    querySelectorAll() { return this.children.filter(element => element.dataset.courseCode); }
  }
  const elements = new Map();
  for (const match of html.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) elements.set(match[2], new Element(match[1]));
  const body = new Element('body');
  const deliveries = ['self_submit', 'postal', 'email'].map(value => Object.assign(new Element('input'), {value, checked: false}));
  const province = elements.get('coopCompanyProvince');
  province.append(Object.assign(new Element('option'), {value: ''}), Object.assign(new Element('option'), {value: 'Fixture province'}));
  function descendants(element) { return element.children.flatMap(child => [child, ...descendants(child)]); }
  return {
    body,
    createElement: tag => new Element(tag),
    getElementById: id => elements.get(id) || descendants(elements.get('coopPrerequisiteCourses')).find(element => element.id === id) || null,
    querySelector: () => deliveries[0],
    querySelectorAll: () => deliveries.filter(element => element.checked),
  };
}

test("Student Co-op prerequisite controlled DOM regressions", async (t) => {
  const document = createControlledDom();
  const context = vm.createContext({document, console, Event: class { constructor(type) { this.type = type; } }});
  const script = prelude + profileCode
    + between('// Student.major is the saved Profile source;', 'function showDuplicateCoopRequestAlert()')
    + between('function getCoopRequestFormData()', 'function closeCoopRequestDetailModal()') + checks;
  await vm.runInContext(`(async () => { ${script} })()`, context);
  const results = JSON.parse(document.body.children.at(-1).textContent);
  assert.equal(results.length, 23);
  for (const result of results) await t.test(result.name, () => assert.equal(result.ok, true, result.error));
});

test("Student Co-op prerequisite real browser runtime checks", {skip: !process.env.COOP_TEST_BROWSER}, async (t) => {
  const browser = process.env.COOP_TEST_BROWSER;
  assert.ok(existsSync(browser), 'COOP_TEST_BROWSER must point to a Chromium executable');
  const directory = mkdtempSync(join(tmpdir(), 'fitm-coop-prerequisite-'));
  try {
    const fixture = join(directory, 'fixture.html');
    const script = prelude + profileCode
      + between('// Student.major is the saved Profile source;', 'function showDuplicateCoopRequestAlert()')
      + between('function getCoopRequestFormData()', 'function closeCoopRequestDetailModal()')
      + checks;
    // Remove all external resource loading and original application startup.
    const fixtureHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<link\b[^>]*>/gi, '').replace(/\bsrc="[^"]*"/gi, '')
      .replace('</body>', `<script type="module">${script}</script></body>`);
    writeFileSync(fixture, fixtureHtml);
    const result = spawnSync(browser, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--disable-background-networking', '--disable-extensions', '--disable-sync',
      `--user-data-dir=${join(directory, 'browser-profile')}`, '--dump-dom', pathToFileURL(fixture).href],
    { encoding: 'utf8', timeout: 45000, maxBuffer: 4 * 1024 * 1024 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, 'Headless browser did not exit successfully');
    const match = result.stdout.match(/<pre id="prerequisite-test-results">([\s\S]*?)<\/pre>/);
    assert.ok(match, 'Browser fixture did not finish the runtime checks');
    const results = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
    assert.equal(results.length, 23);
    for (const result of results) await t.test(result.name, () => assert.equal(result.ok, true, result.error));
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});
