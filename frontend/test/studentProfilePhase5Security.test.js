import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/pages/student_coop.js',import.meta.url),'utf8');
const start=source.indexOf('function profileRequestDiagnostic(');
const end=source.indexOf('\n}\n',start)+2;
const diagnostic=vm.runInNewContext(source.slice(start,end)+'\nprofileRequestDiagnostic');

test('actual Profile console diagnostic excludes conflict snapshot/token/path/message and never reads .data',()=>{
 const error={status:409,message:'PRIVATE SYNTHETIC MESSAGE',response:{headers:{authorization:'SECRET'}}};
 Object.defineProperty(error,'data',{get(){throw Error('Private data must not be accessed');}});
 assert.equal(JSON.stringify(diagnostic(error)),'{"status":409}');
 assert.equal(JSON.stringify(diagnostic({status:'409',message:'PRIVATE'})),'{"status":null}');
 assert.equal(JSON.stringify(diagnostic({status:99999,data:{profile:{father_name:'PRIVATE'}}})),'{"status":null}');
 assert.equal(JSON.stringify(diagnostic(null)),'{"status":null}');
});

test('all four legacy Profile load/photo/academic log call sites use the safe production diagnostic',()=>{
 for(const label of ['LOAD STUDENT PROFILE ERROR:','LOAD PROFILE IMAGE ERROR:','UPLOAD PROFILE IMAGE ERROR:','SAVE STUDENT INFO ERROR:']){
  const point=source.indexOf(JSON.stringify(label));assert.ok(point>0);
  assert.match(source.slice(point,point+110),/profileRequestDiagnostic\(error\)/);
 }
});

test('academic startup controls cannot become a draft before the first aggregate revision is loaded',()=>{
 const from=source.indexOf('function captureStudentInfoDraft('),to=source.indexOf('\nfunction restoreStudentInfoDraft(',from);
 const context=vm.createContext({currentStudent:{major:'IT'},studentInfoForm:{},hasLoadedStudentProfile:false});
 vm.runInContext(source.slice(from,to),context);
 assert.equal(vm.runInContext('captureStudentInfoDraft()',context),null);
 // The missing controls would throw if the function incorrectly read startup inputs.
 const loadingStart=source.indexOf('function setProfileLoading('),loadingEnd=source.indexOf('// Profile tabs only change visibility',loadingStart);
 const controls=[{},{},{}],save={};Object.assign(context,{profilePanel:null,studentMajorInput:controls[0],studentYearLevelInput:controls[1],studentGpaInput:controls[2],isStudentInfoSaving:false,document:{getElementById:()=>save}});
 vm.runInContext(source.slice(loadingStart,loadingEnd),context);vm.runInContext('setProfileLoading(true)',context);
 assert.ok([...controls,save].every(x=>x.disabled));context.hasLoadedStudentProfile=true;vm.runInContext('setProfileLoading(false)',context);assert.ok([...controls,save].every(x=>!x.disabled));
});
