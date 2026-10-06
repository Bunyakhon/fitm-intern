import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const page = readFileSync(new URL('../src/pages/student_coop.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const html = readFileSync(new URL('../src/student_coop/student_coop.html', import.meta.url), 'utf8');
const feedback = readFileSync(new URL('../src/ui/feedback.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/student_coop.css', import.meta.url), 'utf8');
function slice(start, end) {
  const from = page.indexOf(start), to = page.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing boundary ${start}`);
  return page.slice(from, to);
}

// Local fallback only: this HTML-derived DOM model is NOT a browser and cannot
// verify CSS, layout, focus accessibility or native browser form behavior.
// It models tree queries, option values, reset and multiple event listeners so
// request integration is exercised beyond the earlier flat input fixture.
function createDocument() {
  let document;
  class Element {
    constructor(tag) {
      this.tagName = tag.toLowerCase(); this.children = []; this.dataset = {};
      this.attributes = {}; this.listeners = new Map(); this.style = {};
      this.disabled = false; this.hidden = false; this.checked = false;
      this.className = ''; this.text = ''; this.inputValue = '';
      this.classList = {
        contains: value => this.className.split(/\s+/).includes(value),
        add: (...values) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...values])].join(' '); },
        remove: value => { this.className = this.className.split(/\s+/).filter(item => item !== value).join(' '); },
        toggle: (value, enabled) => { if (enabled ?? !this.classList.contains(value)) this.classList.add(value); else this.classList.remove(value); },
      };
    }
    append(...nodes) { for (const node of nodes) { node.parentElement?.removeChild(node); node.parentElement = this; this.children.push(node); } }
    removeChild(node) { this.children = this.children.filter(child => child !== node); node.parentElement = null; }
    remove() { this.parentElement?.removeChild(this); }
    replaceChildren(...nodes) { for (const child of this.children) child.parentElement = null; this.children = []; this.text = ''; this.append(...nodes); }
    set textContent(value) { this.replaceChildren(); this.text = String(value); }
    get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
    set innerHTML(value) { this.replaceChildren(); parse(value, this); }
    get innerHTML() { return this.textContent; }
    set value(value) {
      if (this.tagName === 'select') this.selectedValue = this.options.some(option => option.value === String(value)) ? String(value) : '';
      else if (this.tagName === 'option') this.attributes.value = String(value);
      else this.inputValue = String(value);
    }
    get value() {
      if (this.tagName === 'select') return this.selectedValue ?? this.options[0]?.value ?? '';
      if (this.tagName === 'option') return this.attributes.value ?? this.textContent;
      return this.inputValue;
    }
    get options() { return this.querySelectorAll('option'); }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
      else if (name === 'class') this.className = String(value);
      else if (name === 'value') this.inputValue = String(value);
      else if (['hidden','disabled','checked','required','readonly'].includes(name)) this[name === 'readonly' ? 'readOnly' : name] = true;
      else this[name] = String(value);
    }
    getAttribute(name) { return this.attributes[name] ?? null; }
    descendants() { return this.children.flatMap(child => [child, ...child.descendants()]); }
    matches(selector) {
      selector = selector.trim();
      if (selector.endsWith(':checked')) { if (!this.checked) return false; selector = selector.slice(0, -8); }
      const attrs = [...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)];
      if (!attrs.every(([, name, value]) => name.startsWith('data-')
        ? this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] !== undefined
        : value === undefined ? this.attributes[name] !== undefined : this.attributes[name] === value)) return false;
      selector = selector.replace(/\[[^\]]*\]/g, '');
      const id = selector.match(/#([\w-]+)/)?.[1];
      const className = selector.match(/\.([\w-]+)/)?.[1];
      const tag = selector.match(/^[\w-]+/)?.[0];
      return (!id || this.id === id) && (!className || this.classList.contains(className)) && (!tag || this.tagName === tag);
    }
    querySelectorAll(selector) { return this.descendants().filter(node => selector.split(',').some(part => node.matches(part))); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
    addEventListener(type, callback) { const callbacks = this.listeners.get(type) || []; callbacks.push(callback); this.listeners.set(type, callbacks); }
    removeEventListener(type, callback) { this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== callback)); }
    async dispatch(type, event = {}) {
      if (this.disabled && ['click','input','change'].includes(type)) throw new Error(`Disabled control ${this.id}`);
      for (const callback of this.listeners.get(type) || []) await callback({target: this, preventDefault() {}, ...event});
    }
    reset() {
      for (const node of this.querySelectorAll('input, select, textarea')) {
        if (node.tagName === 'select') node.value = node.options[0]?.value ?? '';
        else node.value = node.attributes.value ?? '';
        node.checked = node.attributes.checked !== undefined;
      }
    }
    focus() { document.activeElement = this; }
    scrollIntoView() {}
  }
  function parse(markup, root) {
    const stack = [root];
    markup = markup.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    for (const token of markup.match(/<[^>]+>|[^<]+/g) || []) {
      if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
      if (token.startsWith('<!')) continue;
      if (!token.startsWith('<')) { stack.at(-1).text += token; continue; }
      const tag = token.match(/^<([\w-]+)/)?.[1]; if (!tag) continue;
      const node = new Element(tag);
      for (const [, name, quoted, single, bare] of token.slice(tag.length + 1, -1).matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) node.setAttribute(name, quoted ?? single ?? bare ?? '');
      stack.at(-1).append(node);
      if (!['input','img','link','meta','br','hr','source','area','wbr','embed'].includes(tag)) stack.push(node);
    }
  }
  document = new Element('document'); parse(html, document);
  document.body = document.querySelector('body'); document.activeElement = document.body;
  document.createElement = tag => new Element(tag);
  document.createTextNode = text => Object.assign(new Element('text'), {text});
  document.getElementById = id => document.descendants().find(node => node.id === id) || null;
  return document;
}

const IT = ['060243102','060243104','060243108','060243112','060243122'];
const INE = ['060233107','060233112','060233113','060233202','060233204'];
function fixture(major = 'IT') {
  const document = createDocument(); const payloads = []; const timers = new Map(); let timerId = 0;
  let student = {major, student_id: 'fixture', first_name: 'Safe', last_name: 'Student', year_level: 3, gpa: '3.00', profile: {prefix: 'นาย', current_phone: '0000000000'}, advisorTeacher: {first_name: 'Class', last_name: 'Advisor'}};
  const context = vm.createContext({document, console, Intl,
    window: {requestAnimationFrame: fn => fn(), setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id)},
    getMyStudentProfile: async () => ({student}),
    renderStudent() {}, populateStudentInfoForm() {}, loadProfileImage: async () => {}, renderStudentProfile() {}, setProfileLoading() {},
    createCoopRequest: async payload => { payloads.push(JSON.parse(JSON.stringify(payload))); },
    getMyCoopRequests: async () => ({data: []}),
    searchCompanies: async () => ({data: [{id: 'company-fixture', name: 'Safe Company', province: 'กรุงเทพมหานคร', address_no: '123', district: 'Fixture district'}]}),
    checkCompanyDuplicate: async () => ({data: []}),
  });
  const profileCode = slice('async function loadStudentProfile()', '\nfunction setProfileLoading(');
  vm.runInContext(`let currentStudent = null, currentStudentProfile = null;
    const profileLoadMessage = document.createElement('p');
    const jobMatchingResults = document.getElementById('jobMatchingResults');
    const formatTeacherName = teacher => [teacher.first_name,teacher.last_name].join(' ');
    async function activateDashboardPanel() { return await loadCoopRequests(); }
    ${feedback.replace(/export /g, '')}
    ${slice('function setText(', '// ==============================\n// Edit Student Profile Modal')}
    ${profileCode}
    ${slice('const COOP_ACTIVE_STATUSES', '// ==============================\n// Daily Log Modal')}
    ${slice('function showMessage(', '// ==============================\n// Initial')}
  `, context);
  const run = code => vm.runInContext(code, context);
  const get = id => document.getElementById(id);
  return {
    document, get, payloads, run,
    api: adapters => Object.assign(context, adapters),
    detail: request => {context.getCoopRequestById = async () => ({data:request});},
    load: () => run('loadStudentProfile()'),
    profile: async value => { student = {...student, major: value}; await run('loadStudentProfile()'); },
    codes: () => get('coopPrerequisiteCourses').querySelectorAll('tr[data-course-code]').map(row => row.dataset.courseCode),
    normalized: () => JSON.parse(JSON.stringify(run('getCoopRequestFormData().prerequisite_courses'))),
    choose: async (code, value) => { const input = get(`coop-status-${code}`); input.value = value; await input.dispatch('change'); },
    grade: async (code, value) => { const input = get(`coop-grade-${code}`); input.value = value; await input.dispatch('input'); },
    open: () => get('createRequestBtn').dispatch('click'),
    close: () => get('cancelCoopRequestModal').dispatch('click'),
    submit: () => get('coopRequestForm').dispatch('submit'),
    fill() {
      for (const id of ['coopCompanyName','coopLetterRecipientName','coopCompanyAddress']) get(id).value = 'Safe fixture';
      get('coopCompanyProvince').value = 'กรุงเทพมหานคร';
      get('coopWorkStartDate').value = '2026-11-01'; get('coopWorkEndDate').value = '2027-02-01';
      document.querySelector('input[name="delivery_methods"]').checked = true;
    },
    async search() { get('coopCompanySearch').value = 'Safe'; await get('coopCompanySearch').dispatch('input'); for (const [id, callback] of [...timers]) { timers.delete(id); await callback(); } },
  };
}

for (const [program, codes, foreign] of [['IT', IT, INE], ['INE', INE, IT]]) {
  test(`${program}: HTML-derived page load, modal and interactions (simulation)`, async t => {
    const f = fixture(program); await f.load(); await f.open();
    await t.test('all five course rows share cell structure and have no alignment overrides', () => {
      const rows = f.get('coopPrerequisiteCourses').children;
      assert.equal(rows.length, 5);
      for (const [index, row] of rows.entries()) {
        assert.deepEqual(row.children.map(cell => cell.tagName), ['td', 'td', 'td']);
        assert.deepEqual(row.children.map(cell => cell.children.map(child => child.tagName)), [[], ['input'], ['select']]);
        assert.ok(row.children[0].textContent.startsWith(codes[index]));
        assert.equal(row.className, ''); assert.deepEqual(row.style, {});
        for (const cell of row.children) {
          assert.equal(cell.className, ''); assert.deepEqual(cell.style, {});
          assert.equal(cell.getAttribute('colspan'), null);
        }
      }
    });
    await t.test('exact five courses, no foreign rows, student/advisor data and notice', () => {
      assert.deepEqual(f.codes(), codes); assert.equal(f.codes().some(code => foreign.includes(code)), false);
      assert.equal(f.get('coopRequestModal').getAttribute('aria-hidden'), 'false');
      assert.equal(f.get('coopStudentId').textContent, 'fixture'); assert.match(f.get('coopStudentName').textContent, /Safe Student/);
      assert.equal(f.get('coopAdvisorName').textContent, 'Class Advisor'); assert.doesNotMatch(f.get('coopPrerequisiteNotice').textContent, /ยังไม่บันทึก/);
    });
    await t.test('passed without grade prevents submit with actual in-page feedback', async () => {
      f.fill(); await f.choose(codes[0], 'passed'); await f.submit();
      assert.equal(f.payloads.length, 0); assert.match(f.get('coopRequestFormMessage').textContent, new RegExp(codes[0]));
      assert.equal(f.get('coopRequestFormMessage').className, 'message error');
    });
    await t.test('passed with grade submits program-only results and shows shared toast', async () => {
      await f.grade(codes[0], 'B+'); assert.deepEqual(f.normalized().map(course => course.course_code), codes);
      await f.submit(); assert.equal(f.payloads.length, 1); assert.deepEqual(f.payloads[0].prerequisite_courses.map(course => course.course_code), codes);
      assert.equal(f.payloads[0].prerequisite_courses[0].grade, 'B+');
      assert.equal(f.payloads[0].prerequisite_courses[1].status, 'unselected');
      assert.equal(f.payloads[0].company_name, 'Safe fixture'); assert.deepEqual(f.payloads[0].delivery_methods, ['self_submit']);
      assert.equal(f.get('coopRequestModal').getAttribute('aria-hidden'), 'true');
      assert.match(f.document.querySelector('.app-toast__message').textContent, /เรียบร้อย/);
    });
    await t.test('studying clears grade, is exclusive and submits without grade', async () => {
      await f.open(); f.fill(); await f.choose(codes[0], 'passed'); await f.grade(codes[0], 'A'); await f.choose(codes[0], 'studying');
      const grade = f.get(`coop-grade-${codes[0]}`); assert.equal(grade.value, ''); assert.equal(grade.disabled, true); assert.equal(grade.required, false);
      assert.equal(f.normalized()[0].status, 'studying'); assert.equal(f.normalized()[0].grade, null);
      await f.submit(); assert.equal(f.payloads.length, 2);
      assert.equal(f.get(`coop-grade-${codes[0]}`).disabled, true);
    });
    await t.test('unselected remains allowed', async () => { await f.open(); f.fill(); await f.submit(); assert.equal(f.payloads.length, 3); });
    await t.test('reopen five times does not duplicate rows or event listeners', async () => {
      for (let index = 0; index < 5; index++) { await f.open(); assert.deepEqual(f.codes(), codes); await f.close(); }
      assert.equal(f.get('coopRequestForm').listeners.get('submit').length, 1);
      assert.equal(f.get('createRequestBtn').listeners.get('click').length, 1);
      await f.open(); f.fill(); await f.submit(); assert.equal(f.payloads.length, 4);
    });
  });
}

test('course table uses shared left alignment; row-position rules cannot override it', () => {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, declarations]) => ({selector: selector.trim(), declarations}));
  assert.ok(rules.some(rule => rule.selector.split(',').some(selector => selector.trim() === '.coop-course-table td') && /text-align:\s*left\s*;/.test(rule.declarations)));
  for (const rule of rules.filter(rule => rule.selector.includes('.coop-course-table') && /:(?:last-child|first-child|nth-child|nth-last-child)/.test(rule.selector))) {
    assert.doesNotMatch(rule.declarations, /(?:text-align|justify-content|align-items|margin|width)\s*:/, rule.selector);
  }
});

test('HTML-derived surrounding request acceptance (simulation)', async t => {
  const f = fixture(); await f.load(); await f.open();
  await t.test('IT to INE replaces rows and discards status/grade', async () => {
    await f.choose(IT[0], 'passed'); await f.grade(IT[0], 'A'); await f.profile('INE'); assert.deepEqual(f.codes(), INE);
    assert.ok(f.normalized().every(course => course.status === null && course.grade === null));
    assert.equal(f.get(`coop-status-${IT[0]}`), null);
  });
  await t.test('INE to IT replaces rows and discards status/grade', async () => {
    await f.choose(INE[0], 'passed'); await f.grade(INE[0], 'C+'); await f.profile('IT'); assert.deepEqual(f.codes(), IT);
    assert.ok(f.normalized().every(course => course.status === null && course.grade === null));
    assert.equal(f.get(`coop-status-${INE[0]}`), null);
  });
  await t.test('company search response renders and selecting applies existing company data', async () => {
    await f.search(); const button = f.get('coopCompanySearchResults').querySelector('button'); assert.ok(button); await button.dispatch('click');
    assert.equal(f.get('coopCompanyName').value, 'Safe Company'); assert.equal(f.get('coopCompanyName').readOnly, true);
    assert.equal(f.get('coopCompanyProvince').value, 'กรุงเทพมหานคร'); assert.match(f.get('coopCompanyAddress').value, /123/);
    assert.equal(f.run('getCoopRequestFormData().company_id'), 'company-fixture');
    await f.get('coopManualCompanyBtn').dispatch('click'); assert.equal(f.get('coopCompanyName').readOnly, false);
  });
  await t.test('required fields, delivery and dates still prevent invalid submission', async () => {
    await f.submit(); assert.match(f.get('coopRequestFormMessage').textContent, /จำเป็น/); assert.equal(f.payloads.length, 0);
    f.fill(); f.document.querySelector('input[name="delivery_methods"]').checked = false; await f.submit(); assert.match(f.get('coopRequestFormMessage').textContent, /วิธีจัดส่ง/);
    f.fill(); f.get('coopWorkEndDate').value = '2026-10-01'; await f.submit(); assert.match(f.get('coopRequestFormMessage').textContent, /วันที่สิ้นสุด/); assert.equal(f.payloads.length, 0);
  });
  await t.test('header close, footer cancel, backdrop and Escape close without submitting', async () => {
    for (const action of [() => f.get('closeCoopRequestModal').dispatch('click'), () => f.close(), () => f.get('coopRequestModal').dispatch('click'), () => f.document.dispatch('keydown', {key: 'Escape'})]) {
      await f.open(); await action(); assert.equal(f.get('coopRequestModal').getAttribute('aria-hidden'), 'true'); assert.equal(f.document.body.style.overflow, '');
    }
    assert.equal(f.payloads.length, 0);
  });
  await t.test('historical snapshot detail ignores current major and handles legacy requests', async () => {
    const snapshot = IT.map((code, index) => ({program: 'IT', course_code: code, course_name: 'Historical name', status: index === 0 ? 'passed' : 'studying', grade: index === 0 ? 'B+' : null}));
    const request = {id: 'history-fixture', status: 'cancelled', student: {}, prerequisite_courses: snapshot};
    f.detail(request);
    f.run(`coopRequests = [${JSON.stringify(request)}]; renderCoopRequests()`);
    const button = f.get('coopRequestHistoryBody').querySelector('button');
    await f.get('coopRequestHistoryBody').dispatch('click', {target:button});
    assert.equal(f.get('coopRequestDetailModal').getAttribute('aria-hidden'), 'false');
    await f.profile('INE');
    const rows = f.get('coopDetailPrerequisites').children;
    assert.deepEqual(rows.map(row => row.dataset.courseCode), IT);
    assert.match(rows[0].children[0].textContent, /Historical name/);
    assert.equal(rows[0].children[1].textContent, 'B+');
    assert.equal(rows[1].children[1].textContent, '-');
    assert.match(f.get('coopDetailPrerequisiteProgram').textContent, /IT/);
    f.run('renderCoopRequestDetail({status: "cancelled", student: {}})');
    assert.match(f.get('coopDetailPrerequisites').textContent, /คำร้องเดิม/);
  });
});

test('Student approval progress and cancellation labels match the current workflow', async t => {
  const f=fixture(); await f.load();
  const steps=['ยื่นคำร้อง','อาจารย์ที่ปรึกษาพิจารณา','หัวหน้าภาควิชาพิจารณา','อนุมัติคำร้อง'];
  for (const [status, active, label] of [['advisor_review',1,'อาจารย์ที่ปรึกษา'],['department_head_review',2,'หัวหน้าภาควิชา'],['approved',null,'อนุมัติ'],['rejected',null,'ไม่ได้รับการอนุมัติ'],['cancelled',null,'ยกเลิก']]) await t.test(status, () => {
    const request={id:'progress-fixture',status,student:{}};
    f.run(`coopRequests=[${JSON.stringify(request)}]; renderCoopRequests(); renderCoopRequestDetail(${JSON.stringify(request)})`);
    const nodes=f.get('coopDetailStepper').querySelectorAll('.coop-step');
    assert.deepEqual(nodes.map(node=>node.children[1].textContent),steps);
    assert.match(f.get('coopDetailStatus').textContent,new RegExp(label));
    assert.doesNotMatch(f.get('coopDetailStepper').textContent,/เจ้าหน้าที่/);
    if (active!==null) assert.equal(nodes[active].classList.contains('is-current'),true);
    if (status==='approved') assert.ok(nodes.every(node=>node.classList.contains('is-complete')));
    if (status==='cancelled') assert.doesNotMatch(f.get('coopDetailStatus').textContent,/โดยนักศึกษา/);
    if (status==='rejected'||status==='cancelled') {
      assert.equal(f.get('coopRequestCurrent').hidden,true);
      assert.match(f.get('coopRequestHistoryBody').textContent,new RegExp(label));
    }
  });
});
