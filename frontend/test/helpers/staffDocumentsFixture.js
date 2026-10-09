import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const helperUrl = new URL('../studentCoopAcceptance.test.js', import.meta.url);
const source = readFileSync(helperUrl, 'utf8');
const prefix = source.slice(0, source.indexOf('for (const [program, codes, foreign]')).replace(/^import .*;\r?\n/gm, '').replaceAll('import.meta.url', JSON.stringify(helperUrl.href));
// HTML-derived DOM simulation; never a browser acceptance result.
export function staffFixture(adapters = {}, login = false) {
  const html = readFileSync(new URL(login ? '../../staff-login.html' : '../../src/department_staff/department_staff.html', import.meta.url), 'utf8');
  const helper = vm.createContext({ readFileSync, vm, assert, URL, console });
  vm.runInContext(prefix.replace(/const html = [^\n]+/, `const html = ${JSON.stringify(html)};`), helper);
  const document = helper.createDocument(), values = new Map([['staffToken', 'fixture-staff'], ['teacherToken', 'teacher-untouched'], ['token', 'student-untouched']]);
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const calls = [], toasts = [], redirects = [], downloads = [], revoked = [], timers = []; let prints = 0, sequence = 0;
  const url = { createObjectURL: () => `blob:staff-${++sequence}`, revokeObjectURL: value => revoked.push(value) };
  const context = vm.createContext({ console, Intl, Date, STAFF_TOKEN_KEY: 'staffToken', URL: url, window: { setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {} } });
  context.saveCompanyResponse = async () => { throw Error('Provide responseSave adapter for company response tests'); };
  vm.runInContext(readFileSync(new URL('../../src/ui/feedback.js', import.meta.url), 'utf8').replace(/export /g, ''), context);
  const controller = readFileSync(new URL(login ? '../../src/pages/staffLogin.js' : '../../src/pages/staffDocuments.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '').replace(/^if \(typeof document.*$/gm, '');
  vm.runInContext(controller, context); context.document = document;
  let rows = [{ id: 'request-a', status: 'approved', company_name: 'Snapshot Company', company_address: 'Snapshot Address', company_province: 'Bangkok', letter_recipient_name: 'HR', work_start_date: '2026-11-01', work_end_date: '2027-02-01', updatedAt: '2026-10-07T00:00:00Z', student: { id: 'student-a', first_name: 'Student', last_name: 'One', student_id: '66001', major: 'IT' }, documents: [] }], revisions = [];
  const options = { document, storage, location: { replace: path => redirects.push(path) }, url,
    me: async () => ({ success: true, data: { id: 'staff-a', first_name: 'Staff', last_name: 'One', is_active: true } }),
    list: async query => { calls.push({ list: { ...query } }); return { success: true, data: rows.filter(row => !query.status || row.status === query.status).slice(query.offset, query.offset + query.limit) }; },
    detail: async id => { calls.push({ detail: id }); const request = rows.find(row => row.id === id); return { success: true, data: { request, documents: request.documents, revisions, reviews: [], missing_fields: [], eligible: true, placement: { available: false, message: 'รอยืนยันเงื่อนไขการตอบรับสถานประกอบการ' } } }; },
    save: async (id, type, action, body) => {
      calls.push({ id, type, action, body: JSON.parse(JSON.stringify(body)) }); const owner = rows.find(row => row.id === id), existing = owner.documents.find(doc => doc.document_type === type);
      const { version, document_number, ...metadata } = body;
      const doc = { id: existing?.id || 'document-a', document_type: type, version: (existing?.version || 0) + 1, status: action === 'generate' ? 'generated' : 'draft', document_number: document_number ?? existing?.document_number ?? null, metadata: { ...(existing?.metadata || {}), ...metadata } };
      owner.documents = [...owner.documents.filter(doc => doc.document_type !== type), doc]; revisions.push({ coop_document_id: doc.id, version: doc.version, action, status: doc.status, staff: { first_name: 'Staff', last_name: 'One' }, createdAt: '2026-10-07T00:00:00Z' }); return { success: true, data: doc };
    },
    content: async (id, type, mode) => { calls.push({ content: { id, type, mode } }); return new Blob(['Development template'], { type: 'text/html' }); },
    download: (blob, name) => downloads.push({ blob, name }),
    login: async body => { calls.push(body); return { token: 'logged-in-staff', staff: { is_active: true } }; },
    toast: (message, type) => toasts.push({ message, type }), confirm: context.showConfirmModal, loading: context.setButtonLoading, ...adapters,
  };
  const get = id => document.getElementById(id);
  if (!login) get('staffPreviewFrame').contentWindow = { print: () => prints++ };
  const app = login ? context.mountStaffLogin(options) : context.mountStaffDocuments(options);
  return { app, options, context, document, get, storage, redirects, calls, toasts, downloads, revoked, rows: value => { rows = value; }, prints: () => prints,
    modal: () => document.querySelectorAll('.app-confirm-overlay').find(node => !node.classList.contains('is-leaving')),
    async confirm() { await this.modal().querySelector('.app-confirm-modal__confirm').dispatch('click'); },
    flush: () => { for (const fn of timers.splice(0)) fn(); },
  };
}
