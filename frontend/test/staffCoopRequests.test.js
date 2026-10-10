import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {staffCoopFixture} from './helpers/staffCoopRequestsFixture.js';

test('Staff request list uses live account and safe detail with named cancellation history',async()=>{
  const f=staffCoopFixture();await f.app.ready;assert.equal(f.calls[0].list.limit,26);assert.equal(f.calls[0].list.status,undefined);
  await f.ask();assert.match(f.modal().textContent,/Student One.*66001.*request-a.*รออาจารย์/s);await f.commit('  <img onerror=attack()>  ');
  assert.equal(f.calls.find(call=>call.cancel).body.reason,'<img onerror=attack()>');assert.match(f.get('staffCoopDetailBody').textContent,/Staff One.*<img onerror=attack\(\)>/s);
  assert.equal(f.get('staffCoopDetailBody').querySelector('img'),null);assert.equal(f.get('staffCoopCancel').disabled,true);assert.match(f.get('staffCoopList').textContent,/ยกเลิกแล้ว/);assert.ok(f.toasts.some(toast=>toast.type==='success'));
});
for(const status of ['submitted','staff_review','advisor_review','department_head_review','approved','document_issued','in_progress','rejected','cancelled'])test(`Staff ${status} action follows server eligibility`,async()=>{
  const f=staffCoopFixture();f.rows([{id:'request-a',status,updatedAt:'2026-10-09T00:00:00.000Z',student:{}}]);await f.app.ready;await f.app.openDetail('request-a');
  assert.equal(f.get('staffCoopCancel').disabled,!['submitted','staff_review','advisor_review','department_head_review'].includes(status));
  if(f.get('staffCoopCancel').disabled){await f.get('staffCoopCancel').listeners.get('click')[0]();assert.equal(f.modal(),undefined);}
});
test('Shared cancellation modal validates reason, can close, and sends only reason/current preconditions',async()=>{
  const f=staffCoopFixture();await f.app.ready;await f.ask();
  for(const reason of ['', '   ', 'x'.repeat(2001)]){await f.commit(reason);assert.ok(f.modal());assert.equal(f.calls.filter(call=>call.cancel).length,0);}
  await f.modal().querySelector('.app-confirm-modal__cancel').dispatch('click');assert.equal(f.modal(),undefined);assert.equal(f.get('staffCoopCancel').disabled,false);
  await f.get('staffCoopCancel').dispatch('click');await f.commit('Reason');assert.deepEqual(f.calls.find(call=>call.cancel).body,{reason:'Reason',expected_status:'advisor_review',expected_updated_at:'2026-10-09T00:00:00.000Z'});
});
for (const close of ['Back', 'Escape']) for (const focused of [false, true]) test(`${close} restores the exact cancellation opener (${focused ? 'focused' : 'programmatic'} activation) without a write`, async () => {
  const f = staffCoopFixture(); await f.app.ready; await f.app.openDetail('request-a');
  const opener = f.get('staffCoopCancel');
  if (focused) opener.focus();
  else assert.equal(f.document.activeElement, f.get('staffCoopDetailHeading'));
  await opener.dispatch('click');
  const modal = f.modal();
  assert.equal(opener.disabled, true);
  assert.equal(f.document.activeElement, modal.querySelector('.app-confirm-modal__confirm'));
  modal.querySelector('textarea').value = 'Discard this reason';
  const calls = JSON.stringify(f.calls);
  if (close === 'Back') await modal.querySelector('.app-confirm-modal__cancel').dispatch('click');
  else await f.document.dispatch('keydown', {key: 'Escape'});
  assert.equal(f.modal(), undefined); assert.equal(opener.disabled, false);
  f.flushTimers();
  assert.equal(modal.isConnected, false);
  assert.equal(f.document.activeElement, opener);
  assert.equal(JSON.stringify(f.calls), calls);
  assert.equal(f.document.listeners.get('keydown').length, 0);
});

test('Cancellation close resolves a replacement opener after the leave animation', async () => {
  const f = staffCoopFixture(); await f.app.ready; await f.ask();
  const opener = f.get('staffCoopCancel');
  await f.modal().querySelector('.app-confirm-modal__cancel').dispatch('click');
  const replacement = f.document.createElement('button'); replacement.id = opener.id;
  const parent = opener.parentElement; opener.remove(); parent.append(replacement);
  f.flushTimers();
  assert.equal(opener.isConnected, false);
  assert.equal(f.document.activeElement, replacement);
  assert.equal(f.calls.filter(call => call.cancel).length, 0);
});

for (const target of ['removed', 'disabled']) test(`Cancellation close uses detail heading when opener is ${target}`, async () => {
  const f = staffCoopFixture(); await f.app.ready; await f.ask();
  await f.document.dispatch('keydown', {key: 'Escape'});
  const opener = f.get('staffCoopCancel');
  if (target === 'removed') opener.remove(); else opener.disabled = true;
  f.flushTimers();
  assert.equal(f.document.activeElement, f.get('staffCoopDetailHeading'));
  assert.equal(f.calls.filter(call => call.cancel).length, 0);
});

test('Successful cancellation returns focus to detail heading because action is no longer eligible', async () => {
  const f = staffCoopFixture(); await f.app.ready; await f.ask(); await f.commit(); f.flushTimers();
  assert.equal(f.get('staffCoopCancel').disabled, true);
  assert.equal(f.document.activeElement, f.get('staffCoopDetailHeading'));
  assert.equal(f.calls.filter(call => call.cancel).length, 1);
});

test('Shared confirmation preserves default focus restoration and avoids hidden fallback targets', async () => {
  const f = staffCoopFixture(); await f.app.ready;
  const opener = f.get('staffCoopRefresh'); opener.focus();
  const close = f.context.showConfirmModal({title: 'Shared', message: 'Default focus'});
  close(); f.flushTimers(); assert.equal(f.document.activeElement, opener);
  await f.ask(); await f.document.dispatch('keydown', {key: 'Escape'});
  f.get('staffCoopDetail').hidden = true; opener.focus(); f.flushTimers();
  assert.equal(f.document.activeElement, opener);
  assert.equal(f.calls.filter(call => call.cancel).length, 0);
});

test('Double confirmation is suppressed and success waits for API completion',async()=>{
  let finish,count=0;const gate=new Promise(resolve=>{finish=resolve;});const f=staffCoopFixture({cancel:async()=>{count++;await gate;}});await f.app.ready;await f.ask();
  f.modal().querySelector('textarea').value='Reason';const button=f.modal().querySelector('.app-confirm-modal__confirm'),pending=button.dispatch('click');await button.listeners.get('click')[0]();
  assert.equal(count,1);assert.equal(button.disabled,true);assert.equal(f.get('staffCoopCancel').disabled,true);assert.equal(f.toasts.length,0);finish();await pending;
});
for(const status of [400,500,undefined])test(`Staff cancellation ${status||'network'} failure preserves modal/reason and reports no success`,async()=>{
  const f=staffCoopFixture({cancel:async()=>{throw Object.assign(Error('failed'),{status});}});await f.app.ready;await f.ask();await f.commit('Keep this reason');
  assert.equal(f.modal().querySelector('textarea').value,'Keep this reason');assert.equal(f.modal().querySelector('.app-confirm-modal__confirm').disabled,false);assert.ok(f.toasts.some(toast=>toast.type==='error'));assert.ok(!f.toasts.some(toast=>toast.type==='success'));
});
for(const status of [404,409])test(`${status} closes outdated confirmation and reloads latest status`,async()=>{
  const f=staffCoopFixture({cancel:async()=>{f.rows([{id:'request-a',status:'approved',student:{}}]);throw Object.assign(Error('stale'),{status});}});await f.app.ready;await f.ask();await f.commit();
  assert.equal(f.modal(),undefined);assert.equal(f.get('staffCoopCancel').disabled,true);assert.match(f.get('staffCoopDetailBody').textContent,/อนุมัติแล้ว/);assert.ok(f.toasts.some(toast=>toast.type==='warning'));assert.ok(!f.toasts.some(toast=>toast.type==='success'));
});
test('Server internals are not exposed in cancellation toast or modal',async()=>{
  const f=staffCoopFixture({cancel:async()=>{throw Object.assign(Error('Sequelize INSERT INTO secret_table; stack parameters password_hash'),{status:500});}});await f.app.ready;await f.ask();await f.commit('Keep this reason');
  assert.doesNotMatch(f.modal().textContent,/Sequelize|INSERT INTO|secret_table|password_hash|parameters/);
  assert.ok(f.toasts.every(toast=>!/(Sequelize|INSERT INTO|secret_table|password_hash|parameters)/.test(toast.message)));
  assert.equal(f.modal().querySelector('textarea').value,'Keep this reason');assert.ok(!f.toasts.some(toast=>toast.type==='success'));
});
test('Search/status/pagination survive successful cancellation',async()=>{
  const f=staffCoopFixture();const rows=Array.from({length:27},(_,index)=>({id:index===25?'request-a':String(index),status:'advisor_review',updatedAt:'2026-10-09T00:00:00.000Z',student:{}}));f.rows(rows);await f.app.ready;
  f.get('staffCoopSearch').value='Student';await f.get('staffCoopSearchForm').dispatch('submit');await f.get('staffCoopNext').dispatch('click');await f.ask();await f.commit();
  assert.equal(f.calls.filter(call=>call.list).at(-1).list.offset,25);assert.equal(f.calls.filter(call=>call.list).at(-1).list.search,'Student');assert.match(f.get('staffCoopList').textContent,/ยกเลิกแล้ว/);
  f.get('staffCoopStatus').value='cancelled';await f.get('staffCoopStatus').dispatch('change');assert.equal(f.calls.at(-1).list.offset,0);assert.equal(f.calls.at(-1).list.status,'cancelled');
});
for(const status of [401,403])test(`Staff cancellation ${status} revokes only Staff session`,async()=>{
  const f=staffCoopFixture({cancel:async()=>{throw Object.assign(Error('auth'),{status});}});await f.app.ready;await f.ask();await f.commit();
  assert.equal(f.storage.getItem('staffToken'),undefined);assert.equal(f.storage.getItem('token'),'student-only');assert.equal(f.storage.getItem('teacherToken'),'teacher-only');assert.equal(f.get('staffCoopList').children.length,0);assert.equal(f.get('staffCoopDetail').hidden,true);assert.equal(f.redirects[0],'/staff-login.html');
});
test('Failed list/detail refresh prevents stale writes and can recover',async()=>{
  let unavailable=true;const f=staffCoopFixture({list:async()=>{if(unavailable)throw Error('offline');return {data:[]};},detail:async()=>{throw Error('offline');}});await f.app.ready;assert.match(f.get('staffCoopMessage').textContent,/ไม่สำเร็จ/);
  unavailable=false;await f.app.refresh();assert.match(f.get('staffCoopMessage').textContent,/ยังไม่มี/);await f.app.openDetail('request-a');assert.equal(f.get('staffCoopCancel').disabled,true);
});
test('Successful commit followed by failed refresh reports saved result and clears stale detail',async()=>{
  let lists=0,details=0;
  const f=staffCoopFixture({cancel:async()=>{},list:async()=>{if(++lists>1)throw Error('offline');return {data:[{id:'request-a',student:{}}]};},detail:async()=>{if(++details>1)throw Error('offline');return {data:{request:{id:'request-a',status:'advisor_review',student:{}},cancellation:{allowed:true,expected_status:'advisor_review',expected_updated_at:'2026-10-09T00:00:00.000Z'}}};}});
  await f.app.ready;await f.ask();await f.commit();
  assert.ok(f.toasts.some(toast=>toast.type==='success'));assert.ok(f.toasts.some(toast=>toast.type==='warning'));assert.equal(f.get('staffCoopCancel').disabled,true);assert.equal(f.get('staffCoopDetailBody').children.length,0);assert.equal(f.get('staffCoopList').children.length,0);
});
test('Logout during request load cannot restore private data',async()=>{
  let finish;const gate=new Promise(resolve=>{finish=resolve;});const f=staffCoopFixture({list:async()=>gate});await Promise.resolve();await f.get('staffLogout').dispatch('click');finish({data:[{id:'private',student:{first_name:'Private'}}]});await f.app.ready;
  assert.equal(f.get('staffCoopList').children.length,0);assert.equal(f.get('staffCoopCancel').disabled,true);
});
test('Initial missing/inactive/unauthorized Staff cannot fetch requests',async()=>{
  for(const me of [async()=>({data:{id:'staff-a',is_active:false}}),async()=>{throw Object.assign(Error('expired'),{status:401});},async()=>{throw Object.assign(Error('forbidden'),{status:403});}]){
    const f=staffCoopFixture({me});await f.app.ready;assert.equal(f.calls.length,0);assert.equal(f.get('staffCoopRefresh').disabled,true);assert.equal(f.redirects[0],'/staff-login.html');
  }
  const f=staffCoopFixture();f.storage.removeItem('staffToken');await f.app.ready;assert.equal(f.calls.length,0);assert.equal(f.get('staffCoopRefresh').disabled,true);
});
test('Server ineligible detail blocks cancellation even when status appears pending',async()=>{
  const f=staffCoopFixture({detail:async()=>({data:{request:{id:'request-a',status:'advisor_review',student:{}},cancellation:{allowed:false}}})});await f.app.ready;await f.app.openDetail('request-a');
  await f.get('staffCoopCancel').listeners.get('click')[0]();assert.equal(f.get('staffCoopCancel').disabled,true);assert.equal(f.modal(),undefined);assert.equal(f.calls.filter(call=>call.cancel).length,0);
});
test('Staff request API adapter uses existing Staff bearer transport and encoded IDs',async()=>{
  const calls=[],ctx=vm.createContext({URLSearchParams,staffRequest:async(path,options)=>{calls.push({path,options});}});
  vm.runInContext(readFileSync(new URL('../src/api/staffCoopRequests.api.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+';globalThis.list=getStaffCoopRequests;globalThis.detail=getStaffCoopRequest;globalThis.cancel=cancelStaffCoopRequest;',ctx);
  await ctx.list({search:'Thai name',offset:25});await ctx.detail('id/other');await ctx.cancel('id/other',{reason:'Reason',expected_status:'advisor_review',expected_updated_at:'2026-10-09T00:00:00.000Z'});
  assert.match(calls[0].path,/search=Thai\+name/);assert.match(calls[1].path,/id%2Fother$/);assert.equal(calls[2].options.method,'POST');assert.equal(calls[2].options.body.reason,'Reason');
});
