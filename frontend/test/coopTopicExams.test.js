import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { bangkokInput, bangkokISO, safeLink, renderDetail, transitions, node, reviewLabels, examLabels, roleLabels, name, date } from '../src/pages/coopTopicExamView.js';
const require = createRequire(import.meta.url);
function element(tag) { return { tag, children: [], append(...nodes) { this.children.push(...nodes); }, replaceChildren(...nodes) { this.children = nodes; } }; }
const doc = { createElement: element };
const content = node => (node.textContent || '') + node.children.map(content).join(' ');
test('Bangkok scheduling inputs round trip without browser timezone dependence', () => {
  assert.equal(bangkokInput('2026-12-01T02:00:00.000Z'),'2026-12-01T09:00');
  assert.equal(bangkokISO('2026-12-01T09:00'),'2026-12-01T09:00:00+07:00');
  assert.equal(bangkokISO(''),null); assert.equal(bangkokInput(null),'');
  assert.deepEqual(Object.fromEntries(Object.entries(transitions).map(([key, values]) => [key,[...values].sort()])), Object.fromEntries(Object.entries(require('../../backend/src/services/coopTopicExam.rules').TRANSITIONS).map(([key,values])=>[key,[...values].sort()])));
});
test('empty schedule renders real empty state; URL is never shown as uploaded PDF', () => {
  const root=element('div');renderDetail(doc,root,{document:{review_status:'pending',document_url:'https://example.com/co09',file:null},project:null,exam:{status:'unscheduled',committee:[]}});
  assert.match(content(root),/ยังไม่มีกำหนดการสอบหัวข้อโครงการ/);assert.match(content(root),/ยังไม่ได้อัปโหลด PDF/);
  assert.equal(safeLink(doc,'javascript:alert(1)','unsafe'),null);assert.equal(safeLink(doc,'https://u:p@example.com','unsafe'),null);
  const link=safeLink(doc,'https://example.com','link');assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');
});
test('actual API adapter sends separate capability paths and If-Match; rejects stale sessions', async () => {
  const source=fs.readFileSync(new URL('../src/api/coopTopicExams.api.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function');
  let token='synthetic-session', resolve;
  const calls=[];const api=async(path,options)=>{calls.push({path,options});if(options.body==='delayed')return new Promise(done=>resolve=done);return {success:true};};
  const factory=new Function('apiRequest','getStudentToken','getRoleToken','getApplicationAdminToken',source+';return topicExamClient;')(api,()=>token,()=>token,()=>token);
  for(const role of ['student','staff','admin']){const client=factory(role);await client.call(role==='student'?'/me/document-url':'/manage/students',{method:'PUT',version:0,body:{document_url:'https://example.com'}});assert.equal(calls.at(-1).options.headers['If-Match'],'"0"');assert.equal(calls.at(-1).options.auth,false);}
  const pending=factory('student').call('/me',{body:'delayed'});await Promise.resolve();token='other-synthetic-session';resolve({success:true,data:'old owner'});await assert.rejects(pending,error=>error.data.code==='CO09_SESSION_CHANGED');
});

test('student view keeps review and exam states independent, safe text, optional history and real empty states', () => {
  const source = fs.readFileSync(new URL('../src/pages/studentCoopProjectView.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
  const render = new Function('node', 'safeLink', 'reviewLabels', 'examLabels', 'roleLabels', 'name', 'date', source + '; return renderStudentTopicExam;')
    (node, safeLink, reviewLabels, examLabels, roleLabels, name, date);
  const document = { createElement: tag => ({ ...element(tag), dataset: {}, setAttribute(key, value) { this[key] = value; } }) };
  const root = element('div');
  const detail = { document: { review_status: 'approved', file: null, document_url: 'https://example.com/co09' }, exam: { status: 'unscheduled', committee: [] } };
  let cards = render(document, root, detail);
  assert.match(content(cards.documentCard), /เอกสาร: ผ่านการตรวจ/);
  assert.match(content(cards.documentCard), /ยังไม่ได้อัปโหลด PDF/);
  assert.match(content(cards.examCard), /การสอบ: รอจัดตาราง/);
  assert.match(content(cards.examCard), /ยังไม่มีกำหนดการสอบหัวข้อโครงการ/);
  assert.doesNotMatch(content(cards.examCard), /ประวัติกำหนดการสอบ/);
  detail.document.review_status = 'needs_revision'; detail.document.review_reason = '<img src=x onerror=unsafe>';
  detail.exam = { status: 'rescheduled', mode: 'online', starts_at: '2026-11-20T02:00:00Z', ends_at: '2026-11-20T03:00:00Z', location: '', meeting_url: 'javascript:unsafe()', reason: 'เปลี่ยนเวลา', committee: [{ role: 'chair', teacher: { first_name: 'Synthetic', last_name: 'Examiner' } }], history: [{ version: 1, snapshot: { status: 'scheduled', starts_at: '2026-11-19T02:00:00Z', ends_at: '2026-11-19T03:00:00Z', location: 'A-301' } }] };
  cards = render(document, root, detail);
  assert.match(content(cards.documentCard), /เอกสาร: ต้องแก้ไข/);
  assert.match(content(cards.documentCard), /<img src=x onerror=unsafe>/);
  assert.match(content(cards.examCard), /การสอบ: เลื่อนสอบ/);
  assert.match(content(cards.examCard), /09:00.*10:00/);
  assert.match(content(cards.examCard), /Asia\/Bangkok/);
  assert.match(content(cards.examCard), /Synthetic Examiner.*ประธานกรรมการ/);
  assert.match(content(cards.examCard), /ประวัติกำหนดการสอบ.*A-301/);
  const tags = node => [node.tag, ...node.children.flatMap(tags)];
  assert.ok(!tags(cards.examCard).some(tag => ['form', 'input', 'button', 'select', 'textarea', 'a'].includes(tag)));
  assert.ok(!tags(cards.documentCard).includes('img'), 'API values are text, never HTML');
});
