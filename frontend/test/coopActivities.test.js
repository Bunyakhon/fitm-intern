import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
const helperUrl=new URL('./studentCoopAcceptance.test.js',import.meta.url), helperSource=readFileSync(helperUrl,'utf8');
const prefix=helperSource.slice(0,helperSource.indexOf('for (const [program, codes, foreign]')).replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.url',JSON.stringify(helperUrl.href));
const view=readFileSync(new URL('../src/pages/coopActivityView.js',import.meta.url),'utf8').replace(/export /g,'');
const source=readFileSync(new URL('../src/pages/coopActivities.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'').split("if (typeof document !== 'undefined'")[0];
const row={id:'activity-a',title:'Orientation',description:'Public description',category:'orientation',starts_at:'2026-11-02T02:30:00.000Z',ends_at:'2026-11-02T05:00:00.000Z',location:'Room',meeting_url:'',status:'draft',version:1,internal_notes:'Private note',published_at:null};
async function fixture(staff=true,overrides={}) {
  const helper=vm.createContext({readFileSync,vm,assert,URL,console}); vm.runInContext(prefix,helper); const document=helper.createDocument(),container=document.getElementById('activityCalendar');
  const create=document.createElement; document.createElement=tag=>{const el=create(tag);el.ownerDocument=document;return el;};
  const values=new Map([[staff?'staffToken':'token','fixture-token']]),storage={getItem:key=>values.get(key)},calls=[],toasts=[];let modal;
  const services={getCurrentStaff:async()=>({data:{is_active:true}}),listActivities:async query=>{calls.push({list:query});return {activities:[{...row}],total:1};},getActivity:async()=>({activity:{...row},history:[{version:1,actor_name:'Staff',action:'created',created_at:row.starts_at,reason:'',snapshot:{...row}}]}),createActivity:async body=>{calls.push({create:body});return {activity:row};},editActivity:async(id,body)=>{calls.push({edit:body});return {activity:row};},cancelActivity:async(id,body)=>{calls.push({cancel:body});return {activity:{...row,status:'canceled'}};},...overrides};
  const context=vm.createContext({console,Date,Intl,URL,crypto:{randomUUID}}); vm.runInContext(view+'\n'+source,context);
  const app=context.mountCoopActivities({document,container,staff,services,storage,confirm:options=>{modal=options;},toast:(message,type)=>toasts.push({message,type}),loading:()=>{}});
  for(const el of document.descendants()) el.ownerDocument=document;
  const form=document.getElementById('activityForm'); if(form){ form.elements={namedItem:name=>form.querySelector(`[name="${name}"]`)};form.reportValidity=()=>true; }
  await app.ready;const get=id=>document.getElementById(id);
  return {app,get,container,document,calls,toasts,services,values,modal:()=>modal,fill(){ for(const [name,value] of Object.entries({title:'New activity',starts_at:'2026-11-03T09:00',ends_at:'2026-11-03T12:00'})) form.elements.namedItem(name).value=value; },form};
}
test('Student has read-only detail and no Staff form/history controls',async()=>{
  const f=await fixture(false,{getActivity:async()=>({activity:{...row,status:'published',internal_notes:undefined}})}); await f.app.detail(row.id); assert.equal(f.get('activityForm'),null);assert.equal(f.get('activityNew'),null);assert.equal(f.get('activityActions').children.length,0);assert.equal(f.get('activityHistory').children.length,0);assert.ok(!f.get('activityDetailBody').textContent.includes('Private note'));
});
test('Staff save confirms once and sends Bangkok dates plus a stable creation key',async()=>{
  const f=await fixture();f.app.openForm();f.fill();await f.form.dispatch('submit');assert.equal(f.calls.filter(c=>c.create).length,0);await f.form.dispatch('submit');await f.modal().onConfirm();f.modal().onClose();const body=f.calls.find(c=>c.create).create;assert.equal(body.starts_at,'2026-11-03T09:00+07:00');assert.match(body.creation_key,/^[0-9a-f-]{36}$/);assert.equal(body.created_by,undefined);assert.equal(f.form.hidden,true);
});
test('Failed creation preserves fields/key for safe retry and reports no success',async()=>{
  const f=await fixture(true,{createActivity:async body=>{f.calls.push({create:body});throw Error('Offline');}});f.app.openForm();f.fill();await f.form.dispatch('submit');await assert.rejects(f.modal().onConfirm(),/Offline/);f.modal().onClose();assert.equal(f.form.hidden,false);await f.form.dispatch('submit');await assert.rejects(f.modal().onConfirm(),/Offline/);assert.equal(f.calls.filter(c=>c.create)[0].create.creation_key,f.calls.filter(c=>c.create)[1].create.creation_key);assert.ok(f.toasts.every(t=>t.type==='error'));
});
test('Stale edit carries server version/reason and keeps unsaved fields without success toast',async()=>{
  const f=await fixture(true,{editActivity:async(id,body)=>{f.calls.push({edit:body});throw Object.assign(Error('Stale'),{status:409});}});f.app.openForm({...row,version:3});f.fill();f.form.elements.namedItem('reason').value='Correction';await f.form.dispatch('submit');await assert.rejects(f.modal().onConfirm(),/Stale/);assert.equal(f.calls.find(c=>c.edit).edit.version,3);assert.equal(f.calls.find(c=>c.edit).edit.reason,'Correction');assert.equal(f.form.hidden,false);assert.ok(f.get('activityMessage').textContent.includes('รีเฟรช'));
});
test('Offline list clears stale results and a later refresh recovers',async()=>{
  const f=await fixture();const list=f.services.listActivities;f.services.listActivities=async()=>{throw Error('Offline');};await f.app.refresh();assert.equal(f.get('activityResults').children.length,0);assert.equal(f.get('activityMessage').textContent,'Offline');f.services.listActivities=list;await f.app.refresh();assert.equal(f.get('activityResults').children.length,1);
});
test('Literal activity and history strings cannot create executable DOM',async()=>{
  const malicious='<img src=x onerror="steal()">',f=await fixture(true,{getActivity:async()=>({activity:{...row,title:malicious},history:[]})});await f.app.detail(row.id);assert.ok(f.get('activityDetailBody').textContent.includes(malicious));assert.equal(f.get('activityDetailBody').querySelector('img'),null);
});
test('Expired authorization hides actionable details and disables creation',async()=>{
  const f=await fixture();await f.app.detail(row.id);f.services.getActivity=async()=>{throw Object.assign(Error('Expired'),{status:401});};await f.app.detail(row.id);assert.equal(f.get('activityDetail').hidden,true);assert.equal(f.get('activityNew').disabled,true);
});
