import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { staffFixture } from './helpers/staffDocumentsFixture.js';

function companyFixture(overrides = {}) {
  const docs = [{ id: 'cooperation-a', document_type: 'cooperation', status: 'generated', version: 2, metadata: { issue_date: '2026-01-01' } }], history = [], revisions = [];
  const request = { id: 'request-a', status: 'approved', company_name: 'Company', student: { first_name: 'Student', last_name: 'One' }, documents: docs };
  let response = null, sequence = 0;
  const f = staffFixture({
    list: async () => ({ data: [{ ...request, companyResponse: response }] }),
    detail: async () => ({ data: { request, documents: docs, revisions, reviews: [], missing_fields: [], eligible: true, company_response: response, company_response_history: history, company_response_editable: !docs.some(doc => doc.document_type === 'placement'), placement: { available: response?.status === 'accepted', message: response?.status === 'rejected' ? 'สถานประกอบการปฏิเสธ' : response ? 'สามารถสร้างหนังสือส่งตัวได้' : 'ยังไม่มีผลตอบกลับ' } } }),
    responseSave: async (id, body, correcting) => { f.calls.push({ response: { id, body: structuredClone(body), correcting } }); response = { id: 'response-a', ...body, responded_at: `${body.responded_at}T00:00:00Z`, version: ++sequence, staff: { first_name: 'Staff', last_name: 'One' } }; history.push({ ...response, createdAt: '2026-01-02T00:00:00Z' }); },
    save: async (id, type, action, body) => {
      f.calls.push({ id, type, action, body: structuredClone(body) }); let doc = docs.find(doc => doc.document_type === type);
      if (!doc) { doc = { id: `${type}-a`, document_type: type, version: 0, metadata: {} }; docs.push(doc); }
      const { version, document_number, ...metadata } = body;
      Object.assign(doc, { version: doc.version + 1, status: action === 'generate' ? 'generated' : 'draft', document_number: document_number || null, metadata: { ...doc.metadata, ...metadata } });
      revisions.push({ coop_document_id: doc.id, version: doc.version, status: doc.status, action, staff: { first_name: 'Staff', last_name: 'One' }, createdAt: '2026-01-02T00:00:00Z' });
    }, ...overrides,
  });
  return { ...f, response: () => response, docs, history };
}
async function open(f) { await f.app.ready; await f.app.openDetail('request-a'); }
async function respond(f, status = 'accepted') { f.get('staffCompanyResponseStatus').value = status; f.get('staffCompanyRespondedAt').value = '2026-01-01'; await f.get('staffCompanyResponseForm').dispatch('submit'); await f.confirm(); }

for (const dismissal of ['Back', 'Escape']) {
  test(`Company Response ${dismissal} restores its opener without saving history`, async () => {
    const f = companyFixture(); await open(f); f.get('staffCompanyRespondedAt').value = '2026-01-01';
    const button = f.get('staffCompanyResponseSave'); button.focus();
    await f.get('staffCompanyResponseForm').dispatch('submit'); assert.equal(button.disabled, true);
    assert.equal(f.document.activeElement, f.modal().querySelector('.app-confirm-modal__confirm'));
    if (dismissal === 'Back') await f.modal().querySelector('.app-confirm-modal__cancel').dispatch('click');
    else await f.document.dispatch('keydown', { key: 'Escape' });
    f.flush(); assert.equal(f.modal(), undefined); assert.equal(button.disabled, false);
    assert.equal(f.document.activeElement, button); assert.equal(f.history.length, 0);
    assert.equal(f.calls.filter(call => call.response).length, 0);
  });
}

test('Company acceptance uses shared confirmation, saves no actor IDs and enables server-authorized placement', async () => {
  const f = companyFixture(); await open(f); assert.equal(f.get('staffPlacementCreate').disabled, true); assert.equal(f.get('staffCompanyResponseSave').disabled, false);
  await respond(f); const saved = f.calls.find(call => call.response).response;
  assert.equal(saved.body.status, 'accepted'); assert.equal(saved.body.responded_at, '2026-01-01'); assert.equal(saved.body.staff_id, undefined); assert.equal(saved.correcting, false);
  assert.equal(f.get('staffPlacementCreate').disabled, false); assert.match(f.get('staffCompanyResponseState').textContent, /ตอบรับ.*Staff One/); assert.match(f.get('staffDocumentList').textContent, /ตอบรับ/);
});
test('Company rejection saves and keeps placement unavailable with clear explanation', async () => {
  const f = companyFixture(); await open(f); f.get('staffCompanyResponseNote').value = '<script>unsafe()</script>'; await respond(f, 'rejected');
  assert.equal(f.response().status, 'rejected'); assert.equal(f.get('staffPlacementCreate').disabled, true); assert.match(f.get('staffPlacementStatus').textContent, /ปฏิเสธ/); assert.match(f.get('staffCompanyResponseState').textContent, /<script>unsafe/);
});
test('Corrections require a reason/version and retain acceptance/rejection history', async () => {
  const f = companyFixture(); await open(f); await respond(f); f.get('staffCompanyResponseStatus').value = 'rejected';
  await f.get('staffCompanyResponseForm').dispatch('submit'); assert.equal(f.modal(), undefined); assert.match(f.toasts.at(-1).message, /เหตุผล/);
  f.get('staffCompanyCorrectionReason').value = 'Company changed decision'; await f.get('staffCompanyResponseForm').dispatch('submit'); await f.confirm();
  const saved = f.calls.filter(call => call.response).at(-1).response; assert.equal(saved.correcting, true); assert.equal(saved.body.version, 1); assert.equal(saved.body.correction_reason, 'Company changed decision');
  assert.equal(f.history.length, 2); assert.match(f.get('staffCompanyResponseHistory').textContent, /ตอบรับ.*ปฏิเสธ.*Company changed decision/); assert.equal(f.get('staffPlacementCreate').disabled, true);
});
test('Placement draft/edit/generate/preview/download/print use existing form with placement type and revision controls', async () => {
  const f = companyFixture(); await open(f); await respond(f); await f.get('staffPlacementCreate').dispatch('click');
  assert.equal(f.get('staffDocumentType').value, 'placement'); assert.match(f.get('staffDocumentHeading').textContent, /ส่งตัว/);
  await f.get('staffDocumentForm').dispatch('submit'); await f.confirm(); assert.equal(f.calls.find(call => call.action).type, 'placement');
  assert.equal(f.get('staffCompanyResponseSave').disabled, true); assert.equal(f.get('staffGenerate').disabled, false);
  await f.get('staffGenerate').dispatch('click'); await f.confirm(); await f.get('staffPreview').dispatch('click'); await f.get('staffDownload').dispatch('click'); await f.get('staffPrint').dispatch('click');
  assert.match(f.downloads[0].name, /^placement-.*v2.html$/); assert.equal(f.prints(), 1); assert.equal(f.calls.find(call => call.content).content.type, 'placement');
  f.get('staffNotes').value = 'Corrected draft'; await f.get('staffDocumentForm').dispatch('submit'); await f.confirm(); assert.equal(f.get('staffPreview').disabled, true);
  await f.get('staffGenerate').dispatch('click'); await f.confirm(); assert.match(f.get('staffDocumentState').textContent, /4/); assert.match(f.get('staffDocumentHistory').textContent, /ส่งตัว/);
  const versions = f.get('staffDocumentHistory').querySelectorAll('button'); assert.ok(versions.length >= 2); await versions[0].dispatch('click');
});
test('Accepted client details cannot enable placement when backend eligibility is false', async () => {
  const f = companyFixture({ detail: async () => ({ data: { request: { student: {} }, documents: [], revisions: [], reviews: [], eligible: true, missing_fields: [], company_response: { status: 'accepted', version: 1 }, company_response_editable: false, placement: { available: false, message: 'หนังสือขอความอนุเคราะห์ยังไม่เสร็จ' } } }) });
  await open(f); assert.equal(f.get('staffPlacementCreate').disabled, true); f.get('staffDocumentType').value = 'placement'; await f.get('staffDocumentType').dispatch('change'); assert.equal(f.get('staffSave').disabled, true);
  await f.get('staffDocumentForm').dispatch('submit'); assert.equal(f.modal(), undefined); assert.match(f.toasts.at(-1).message, /ยังไม่เสร็จ/);
});
test('Concurrent response clicks submit once and disable save while pending', async () => {
  let finish; const gate = new Promise(resolve => { finish = resolve; }); let writes = 0;
  const f = companyFixture({ responseSave: async () => { writes++; await gate; } }); await open(f); f.get('staffCompanyRespondedAt').value = '2026-01-01'; await f.get('staffCompanyResponseForm').dispatch('submit');
  const pending = f.confirm(); await f.get('staffCompanyResponseForm').dispatch('submit'); assert.equal(writes, 1); assert.equal(f.get('staffCompanyResponseSave').disabled, true); finish(); await pending;
});
test('Response validation remains in modal; stale/locked 409 reloads and shows backend explanation', async () => {
  for (const status of [400, 409]) {
    const f = companyFixture({ responseSave: async () => { throw Object.assign(Error(status === 409 ? 'มีหนังสือส่งตัวแล้ว' : 'วันที่ไม่ถูกต้อง'), { status }); } });
    await open(f); await respond(f);
    if (status === 400) assert.match(f.modal().textContent, /วันที่ไม่ถูกต้อง/);
    else { assert.equal(f.modal(), undefined); assert.ok(f.toasts.some(toast => /มีหนังสือส่งตัวแล้ว/.test(toast.message))); }
    assert.equal(f.get('staffPlacementCreate').disabled, true);
  }
});
test('Saved response with failed reload reports success and hides stale private controls', async () => {
  let reads = 0; const f = companyFixture({ detail: async () => { if (++reads > 1) throw Error('offline'); return { data: { request: { student: {} }, documents: [], revisions: [], reviews: [], eligible: true, missing_fields: [], company_response_editable: true, placement: { available: false } } }; } });
  await open(f); await respond(f); assert.ok(f.toasts.some(toast => toast.type === 'success')); assert.ok(f.toasts.some(toast => toast.type === 'warning')); assert.equal(f.get('staffCompanyResponseForm').hidden, true); assert.equal(f.get('staffPlacementCreate').disabled, true);
});
test('Company Response adapter uses authenticated request and correct POST/PUT paths', async () => {
  const calls = [], ctx = vm.createContext({ URLSearchParams, sessionStorage: { getItem: () => 'staff-only' }, apiRequest: async (path, options) => { calls.push({ path, options }); } });
  vm.runInContext(readFileSync(new URL('../src/api/staffDocuments.api.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') + ';globalThis.responseSave=saveCompanyResponse;', ctx);
  await ctx.responseSave('request /', { status: 'accepted' }); await ctx.responseSave('request', { status: 'rejected', version: 1, correction_reason: 'Corrected' }, true);
  assert.match(calls[0].path, /request%20%2F\/company-response$/); assert.equal(calls[0].options.method, 'POST'); assert.equal(calls[1].options.method, 'PUT'); assert.equal(calls[0].options.headers.Authorization, 'Bearer staff-only');
});
