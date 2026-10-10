import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const helperUrl = new URL('../studentCoopAcceptance.test.js', import.meta.url);
const source = readFileSync(helperUrl, 'utf8');
const prefix = source.slice(0, source.indexOf('for (const [program, codes, foreign]')).replace(/^import .*;\r?\n/gm, '').replaceAll('import.meta.url', JSON.stringify(helperUrl.href));
// Exercise real handlers and shared modal with the existing DOM simulation.
// This fixture is not PostgreSQL or real browser acceptance.
export function staffCoopFixture(adapters = {}) {
  const html = readFileSync(new URL('../../src/department_staff/department_staff.html', import.meta.url), 'utf8');
  const helper = vm.createContext({ readFileSync, vm, assert, URL, console });
  vm.runInContext(prefix.replace(/const html = [^\n]+/, `const html = ${JSON.stringify(html)};`), helper);
  const document = helper.createDocument(), values = new Map([['staffToken','staff-only'], ['teacherToken','teacher-only'], ['token','student-only']]);
  // Model connection and disabled-focus behavior absent from the shared DOM stub.
  const elementPrototype = Object.getPrototypeOf(document);
  Object.defineProperty(elementPrototype, 'isConnected', {get() {
    for (let node = this; node; node = node.parentElement) if (node === document) return true;
    return false;
  }});
  Object.defineProperty(elementPrototype, 'disabled', {
    get() { return this._disabled === true; },
    set(value) { this._disabled = !!value; if (value && document.activeElement === this) document.activeElement = document.body; },
  });
  for (const element of [document, ...document.descendants()]) {
    const disabled = element.disabled; delete element.disabled; element.disabled = disabled;
  }
  elementPrototype.focus = function () {
    if (!this.isConnected || this.disabled) return;
    for (let node = this; node; node = node.parentElement) if (node.hidden || node.inert) return;
    document.activeElement = this;
  };
  const storage = {getItem:key=>values.get(key), setItem:(key,value)=>values.set(key,value), removeItem:key=>values.delete(key)};
  const calls = [], toasts = [], redirects = [], timers = [];
  const context = vm.createContext({console, Intl, Date, STAFF_TOKEN_KEY:'staffToken', window:{setTimeout:fn=>{timers.push(fn);return timers.length;}, clearTimeout(){}}});
  vm.runInContext(readFileSync(new URL('../../src/ui/feedback.js', import.meta.url), 'utf8').replace(/export /g,''),context);
  vm.runInContext(readFileSync(new URL('../../src/pages/staffCoopRequests.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'').replace(/^if \(typeof document.*$/gm,''),context);
  context.document = document;
  let rows = [{id:'request-a',status:'advisor_review',company_name:'Saved Company',company_address:'Saved Address',updatedAt:'2026-10-09T00:00:00.000Z',student:{student_id:'66001',first_name:'Student',last_name:'One'},reviews:[]}];
  const state = row => ({allowed:['submitted','staff_review','advisor_review','department_head_review'].includes(row.status),expected_status:row.status,expected_updated_at:row.updatedAt});
  const options = {document,storage,location:{replace:path=>redirects.push(path)},
    me:async()=>({data:{id:'staff-a',is_active:true}}),
    list:async query=>{calls.push({list:{...query}});return {data:rows.filter(row=>!query.status||row.status===query.status).slice(query.offset,query.offset+query.limit).map(row=>({...row,cancellation:state(row)}))};},
    detail:async id=>{calls.push({detail:id});const row=rows.find(row=>row.id===id);return {data:{request:structuredClone(row),reviews:row?.reviews||[],cancellation:row&&state(row)}};},
    cancel:async(id,body)=>{calls.push({cancel:id,body:{...body}}); const row=rows.find(row=>row.id===id);row.status='cancelled';row.cancelled_at='2026-10-09T01:00:00.000Z';row.updatedAt=row.cancelled_at;(row.reviews ||= []).push({actor_role:'department_staff',decision:'cancel',from_status:body.expected_status,to_status:'cancelled',reason:body.reason,createdAt:row.cancelled_at,staff:{first_name:'Staff',last_name:'One'}});return {data:{request:row}};},
    toast:(message,type)=>toasts.push({message,type}),confirm:context.showConfirmModal,loading:context.setButtonLoading,...adapters};
  const app=context.mountStaffCoopRequests(options), get=id=>document.getElementById(id);
  return {app,options,document,context,storage,get,calls,toasts,redirects,rows:value=>{rows=value;},
    flushTimers(){while(timers.length) timers.shift()();},
    modal:()=>document.querySelectorAll('.app-confirm-overlay').find(node=>!node.classList.contains('is-leaving')),
    async ask(){await app.openDetail('request-a');await get('staffCoopCancel').dispatch('click');},
    async commit(reason='Changed plan'){const modal=this.modal();modal.querySelector('textarea').value=reason;await modal.querySelector('.app-confirm-modal__confirm').dispatch('click');},
  };
}
