import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { staffFixture } from './helpers/staffDocumentsFixture.js';

for (const dismissal of ['Back', 'Escape']) {
  test(`Document modal ${dismissal} restores the save opener without writing`, async () => {
    const f = staffFixture(); await f.app.ready; await f.app.openDetail('request-a');
    const button = f.get('staffSave'); button.focus();
    await f.get('staffDocumentForm').dispatch('submit');
    assert.equal(button.disabled, true);
    assert.equal(f.document.activeElement, f.modal().querySelector('.app-confirm-modal__confirm'));
    if (dismissal === 'Back') await f.modal().querySelector('.app-confirm-modal__cancel').dispatch('click');
    else await f.document.dispatch('keydown', { key: 'Escape' });
    f.flush();
    assert.equal(f.modal(), undefined);
    assert.equal(button.disabled, false);
    assert.equal(f.document.activeElement, button);
    assert.equal(f.calls.filter(call => call.action).length, 0);
  });
  test(`Document generation modal ${dismissal} restores its own opener`, async () => {
    const f = staffFixture(); await f.app.ready; await f.app.openDetail('request-a');
    await f.get('staffDocumentForm').dispatch('submit'); await f.confirm(); f.flush();
    const button = f.get('staffGenerate'); button.focus(); await button.dispatch('click');
    if (dismissal === 'Back') await f.modal().querySelector('.app-confirm-modal__cancel').dispatch('click');
    else await f.document.dispatch('keydown', { key: 'Escape' });
    f.flush(); assert.equal(f.document.activeElement, button);
    assert.equal(f.calls.filter(call => call.action === 'generate').length, 0);
  });
}

test('Staff password login stores its separate session and clears password', async () => {
  const f = staffFixture({}, true); f.get('staffEmail').value = ' STAFF@Fixture.invalid '; f.get('staffPassword').value = 'input-from-test';
  await f.get('staffLoginForm').dispatch('submit'); assert.equal(f.storage.getItem('staffToken'), 'logged-in-staff'); assert.equal(f.storage.getItem('teacherToken'), 'teacher-untouched'); assert.equal(f.storage.getItem('token'), 'student-untouched'); assert.equal(f.get('staffPassword').value, ''); assert.match(f.redirects[0], /department_staff/);
});
test('Staff login refuses inactive profiles and reports credentials/rate errors', async () => {
  for (const status of [401, 429]) { const f = staffFixture({ login: async () => { throw Object.assign(Error('failed'), { status }); } }, true); f.get('staffEmail').value = 'staff@fixture.invalid'; f.get('staffPassword').value = 'test-input'; await f.get('staffLoginForm').dispatch('submit'); assert.equal(f.redirects.length, 0); assert.equal(f.get('staffPassword').value, ''); assert.ok(f.toasts.length); }
  const f = staffFixture({ login: async () => ({ token: 'bad', staff: { is_active: false } }) }, true); f.get('staffEmail').value = 'staff@fixture.invalid'; f.get('staffPassword').value = 'test-input'; await f.get('staffLoginForm').dispatch('submit'); assert.equal(f.redirects.length, 0);
});
test('Staff queue has real role profile, safe text, default eligible query and detail', async () => {
  const f = staffFixture(); await f.app.ready; assert.equal(f.calls[0].list.limit, 26); assert.equal(f.get('staffDocumentList').children.length, 1);
  await f.app.openDetail('request-a'); assert.match(f.get('staffDetailBody').textContent, /Snapshot Address/); assert.equal(f.get('staffGenerate').disabled, true); assert.equal(f.get('staffPlacementCreate').disabled, true); assert.match(f.get('staffPlacementStatus').textContent, /รอยืนยัน/);
});
test('Create modal saves metadata without identities then reloads list/detail', async () => {
  const f = staffFixture(); await f.app.ready; await f.app.openDetail('request-a'); f.get('staffNotes').value = '<script>malicious()</script>';
  await f.get('staffDocumentForm').dispatch('submit'); assert.ok(f.modal()); await f.confirm();
  const saved = f.calls.find(call => call.action); assert.equal(saved.action, 'create'); assert.equal(saved.body.notes, '<script>malicious()</script>'); assert.equal(saved.body.staff_id, undefined); assert.equal(saved.body.student_id, undefined);
  assert.match(f.get('staffDocumentState').textContent, /ร่าง.*1/); assert.ok(f.calls.filter(call => call.detail).length >= 2); assert.equal(f.get('staffGenerate').disabled, false);
});
test('Generate/edit/regenerate track server versions and invalidate old preview', async () => {
  const f = staffFixture(); await f.app.ready; await f.app.openDetail('request-a'); await f.get('staffDocumentForm').dispatch('submit'); await f.confirm();
  await f.get('staffGenerate').dispatch('click'); await f.confirm(); assert.match(f.get('staffDocumentState').textContent, /ตัวอย่าง.*2/);
  await f.get('staffPreview').dispatch('click'); assert.equal(f.get('staffPreviewFrame').hidden, false); await f.get('staffPrint').dispatch('click'); assert.equal(f.prints(), 1);
  await f.get('staffDownload').dispatch('click'); assert.match(f.downloads[0].name, /\.html$/);
  f.get('staffNotes').value = 'changed'; await f.get('staffDocumentForm').dispatch('submit'); await f.confirm(); assert.equal(f.get('staffPreviewFrame').hidden, true); assert.equal(f.get('staffPreview').disabled, true); assert.ok(f.revoked.length);
  await f.get('staffGenerate').dispatch('click'); await f.confirm(); assert.match(f.get('staffDocumentState').textContent, /ตัวอย่าง.*4/);
});
test('Duplicate confirmation submits once and shows actual loading', async () => {
  let finish; const gate = new Promise(resolve => { finish = resolve; }); const f = staffFixture({ save: async (...args) => { f.calls.push({ action: args[2] }); await gate; } }); await f.app.ready; await f.app.openDetail('request-a'); await f.get('staffDocumentForm').dispatch('submit');
  const button = f.modal().querySelector('.app-confirm-modal__confirm'), pending = button.dispatch('click'); assert.equal(button.disabled, true); assert.equal(f.get('staffSave').disabled, true); assert.equal(f.calls.filter(call => call.action).length, 1); finish(); await pending;
});
test('Unsaved metadata cannot silently generate the previously saved document', async () => {
  const f = staffFixture(); await f.app.ready; await f.app.openDetail('request-a'); await f.get('staffDocumentForm').dispatch('submit'); await f.confirm(); f.get('staffNotes').value = 'unsaved'; await f.get('staffGenerate').dispatch('click'); assert.equal(f.modal(), undefined); assert.match(f.toasts.at(-1).message, /บันทึก/); assert.equal(f.calls.filter(call => call.action === 'generate').length, 0);
});
test('Missing data has readable field list and disabled write controls', async () => {
  const f = staffFixture({ detail: async () => ({ data: { request: { student: {} }, documents: [], revisions: [], reviews: [], eligible: true, missing_fields: ['student.major', 'approval.head'], placement: {} } }) }); await f.app.ready; await f.app.openDetail('request-a'); assert.match(f.get('staffDetailMessage').textContent, /สาขา.*หัวหน้าภาค/); assert.equal(f.get('staffSave').disabled, true); assert.equal(f.get('staffGenerate').disabled, true);
});
test('Server validation stays in shared modal; stale version reloads truthful error', async () => {
  const bad = staffFixture({ save: async () => { throw Object.assign(Error('ข้อมูลยังไม่ครบ'), { status: 400, data: { missing_fields: ['request.company_address'] } }); } }); await bad.app.ready; await bad.app.openDetail('request-a'); await bad.get('staffDocumentForm').dispatch('submit'); await bad.confirm(); assert.match(bad.modal().textContent, /ที่อยู่สถานประกอบการ/);
  const stale = staffFixture({ save: async () => { throw Object.assign(Error('version changed'), { status: 409 }); } }); await stale.app.ready; await stale.app.openDetail('request-a'); await stale.get('staffDocumentForm').dispatch('submit'); await stale.confirm(); assert.ok(stale.toasts.some(toast => toast.type === 'warning')); assert.equal(stale.modal(), undefined); assert.ok(stale.calls.filter(call => call.detail).length >= 2);
});
test('Committed save with failed reload hides stale controls and reports save truthfully', async () => {
  const f = staffFixture(); const base = f.options.detail; let reads = 0; f.options.detail = undefined;
  const app = staffFixture({ detail: async id => { if (++reads > 1) throw Error('offline'); return base(id); } }); await app.app.ready; await app.app.openDetail('request-a'); await app.get('staffDocumentForm').dispatch('submit'); await app.confirm(); assert.ok(app.toasts.some(toast => toast.type === 'success')); assert.ok(app.toasts.some(toast => toast.type === 'warning')); assert.equal(app.get('staffDocumentForm').hidden, true);
});
test('Search/filter resets pagination; empty and network errors recover', async () => {
  const f = staffFixture(); f.rows(Array.from({ length: 27 }, (_, index) => ({ id: String(index), status: 'approved', company_name: 'Company', student: {}, documents: [] }))); await f.app.ready; assert.equal(f.get('staffDocumentList').children.length, 25); await f.get('staffNext').dispatch('click'); assert.equal(f.get('staffDocumentList').children.length, 2);
  f.get('staffSearch').value = 'Student'; await f.get('staffSearchForm').dispatch('submit'); assert.equal(f.calls.at(-1).list.offset, 0); assert.equal(f.calls.at(-1).list.search, 'Student');
  f.get('staffStatus').value = 'in_progress'; await f.get('staffStatus').dispatch('change'); assert.match(f.get('staffMessage').textContent, /ยังไม่มี/);
  let unavailable = true; const retry = staffFixture({ list: async () => { if (unavailable) throw Error('offline'); return { data: [] }; } }); await retry.app.ready; assert.match(retry.get('staffMessage').textContent, /รีเฟรช/); unavailable = false; await retry.app.refresh(); assert.match(retry.get('staffMessage').textContent, /ยังไม่มี/);
});
test('Logout/session refusal clears Staff private state and preserves other actors', async () => {
  const f = staffFixture(); await f.app.ready; await f.app.openDetail('request-a'); await f.get('staffLogout').dispatch('click'); assert.equal(f.storage.getItem('staffToken'), undefined); assert.equal(f.storage.getItem('teacherToken'), 'teacher-untouched'); assert.equal(f.storage.getItem('token'), 'student-untouched'); assert.equal(f.get('staffDetail').hidden, true); assert.equal(f.get('staffDocumentList').children.length, 0);
  for (const status of [401, 403]) { const blocked = staffFixture({ me: async () => { throw Object.assign(Error('forbidden'), { status }); } }); await blocked.app.ready; assert.equal(blocked.calls.length, 0); assert.equal(blocked.redirects[0], '/staff-login.html'); }
});
test('In-flight list/detail cannot restore private state after logout', async () => {
  let finish; const gate = new Promise(resolve => { finish = resolve; }); const f = staffFixture({ list: async () => gate }); await Promise.resolve(); await f.get('staffLogout').dispatch('click'); finish({ data: [{ student: { first_name: 'Private' }, documents: [] }] }); await f.app.ready; assert.equal(f.get('staffDocumentList').children.length, 0);
});
test('Preview/download failures report errors and keep persisted document state', async () => {
  const f = staffFixture({ content: async () => { throw Error('offline'); } }); await f.app.ready; await f.app.openDetail('request-a'); await f.get('staffDocumentForm').dispatch('submit'); await f.confirm(); await f.get('staffGenerate').dispatch('click'); await f.confirm(); await f.get('staffPreview').dispatch('click'); await f.get('staffDownload').dispatch('click'); assert.equal(f.get('staffPreviewFrame').hidden, true); assert.equal(f.downloads.length, 0); assert.equal(f.toasts.filter(toast => toast.type === 'error').length, 2); assert.match(f.get('staffDocumentState').textContent, /ตัวอย่าง/);
});
test('Actual Staff adapter uses separate bearer, metadata-only writes and authenticated Blob content', async () => {
  const calls = [], ctx = vm.createContext({ URLSearchParams, sessionStorage: { getItem: key => key === 'staffToken' ? 'staff-only' : 'wrong' }, apiRequest: async (path, options) => { calls.push({ path, options }); } });
  vm.runInContext(readFileSync(new URL('../src/api/staffDocuments.api.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') + ';globalThis.queue=getDocumentQueue;globalThis.save=saveStaffDocument;globalThis.content=getStaffDocumentContent;', ctx);
  await ctx.queue({ search: 'ชื่อนักศึกษา', offset: 25, limit: 26 }); await ctx.save('request', 'cooperation', 'edit', { version: 2, notes: 'fixed' }); await ctx.content('request', 'cooperation', 'download');
  for (const call of calls) { assert.equal(call.options.auth, false); assert.equal(call.options.headers.Authorization, 'Bearer staff-only'); assert.doesNotMatch(call.path, /staff_id|student_id/); }
  assert.equal(calls[1].options.method, 'PUT'); assert.equal(calls[2].options.responseType, 'blob'); assert.match(calls[2].path, /download$/);
});
