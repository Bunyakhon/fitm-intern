import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(new URL('../../backend/package.json',import.meta.url));

// Strongest local fallback: real page/request functions and HTML-derived DOM
// bridge to real controllers/services and guarded disposable PostgreSQL.
// No browser, network API/authentication or visual-layout PASS is inferred.
test('saved prerequisites and approval states through Student page and disposable PostgreSQL', {skip:!process.env.COOP_UI_DISPOSABLE_DATABASE_URL}, async t=>{
  const {Sequelize}=require('sequelize');
  const {Umzug,SequelizeStorage}=require('umzug');
  const sequelize=new Sequelize(process.env.COOP_UI_DISPOSABLE_DATABASE_URL,{logging:false,pool:{max:8}});
  try {
    const [guard]=await sequelize.query("SELECT current_database() AS db, current_setting('fitm.a013_disposable',true) AS disposable");
    assert.equal(guard[0].db,'fitm_role_test'); assert.equal(guard[0].disposable,'on');
    const m={sequelize};
    const directory=fileURLToPath(new URL('../../backend/src/models/',import.meta.url));
    for (const file of readdirSync(directory).filter(file=>file.endsWith('.model.js'))) {
      const model=require(`${directory}/${file}`)(sequelize); m[model.name]=model;
    }
    for (const model of Object.values(m)) model.associate?.(m);
    const umzug=new Umzug({migrations:{glob:['*.js',{cwd:fileURLToPath(new URL('../../backend/src/db/migrations/',import.meta.url))}],resolve:({name,path})=>({name,up:args=>require(path).up(args),down:args=>require(path).down(args)})},context:sequelize.getQueryInterface(),storage:new SequelizeStorage({sequelize,tableName:'sequelize_meta'}),logger:undefined});
    await umzug.up(); // Guarded disposable database only, never app config.
    const registryPath=require.resolve('./src/models');
    require(registryPath);
    const controllerPath=require.resolve('./src/controllers/coopRequest.controller');
    const registry=require.cache[registryPath].exports, oldController=require.cache[controllerPath];
    let controller;
    try {require.cache[registryPath].exports=m; delete require.cache[controllerPath]; controller=require(controllerPath);}
    finally {require.cache[registryPath].exports=registry; if(oldController)require.cache[controllerPath]=oldController; else delete require.cache[controllerPath];}
    const {createRoleWorkflowService}=require('./src/services/roleWorkflow.service');
    const service=createRoleWorkflowService(m);
    // Reuse the acceptance fixture without running/copying its test cases.
    const helperUrl=new URL('./studentCoopAcceptance.test.js',import.meta.url);
    const helperSource=readFileSync(helperUrl,'utf8');
    const fixtureSource=helperSource.slice(0,helperSource.indexOf('for (const [program, codes, foreign]'))
      .replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.url',JSON.stringify(helperUrl.href));
    const helper=vm.createContext({assert,readFileSync,URL,vm,console}); vm.runInContext(fixtureSource,helper);
    const fixture=helper.fixture;
    const password='disposable-test-fixture-password'; const runId=require('node:crypto').randomUUID().slice(0,8);
    const advisor=await m.Teacher.create({email:`ui-advisor-${runId}@fixture.invalid`,first_name:'Class',last_name:'Advisor',department:'FITM',password});
    const head=await m.Teacher.create({email:`ui-head-${runId}@fixture.invalid`,first_name:'Head',last_name:'Teacher',department:'FITM',is_department_head:true,password});
    const staff=await m.DepartmentStaff.create({email:`ui-staff-${runId}@fixture.invalid`,first_name:'Staff',last_name:'Fixture',password});
    const snapshots={};
    async function invoke(handler, req) {
      const res={statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
      await handler(req,res); assert.ok(res.statusCode<400,`Controller returned ${res.statusCode}`); return res.body;
    }
    async function waitForDetail(f) {
      for(let attempt=0;attempt<100 && f.run('coopRequestDetailLoading');attempt++) await new Promise(resolve=>setTimeout(resolve,10));
      assert.equal(f.run('coopRequestDetailLoading'),false,'Detail load timed out');
      assert.equal(f.get('coopRequestDetailData').hidden,false);
    }
    function checkDetail(f,program,expected) {
      const rows=f.get('coopDetailPrerequisites').children;
      assert.deepEqual(Array.from(rows,row=>row.dataset.courseCode),expected);
      assert.match(f.get('coopDetailPrerequisiteProgram').textContent,new RegExp(program));
      assert.equal(rows[0].children[1].textContent,'B+'); assert.equal(rows[0].children[2].textContent,'ผ่านแล้ว');
      assert.equal(rows[1].children[1].textContent,'-'); assert.equal(rows[1].children[2].textContent,'กำลังศึกษา');
      assert.equal(rows[2].children[1].textContent,'-'); assert.equal(rows[2].children[2].textContent,'ยังไม่เลือก');
    }
    for(const program of ['IT','INE']) await t.test(`${program} frontend submit → five SQL rows → Student detail/history`,async()=>{
      const expected=require('./src/services/coopPrerequisites').CATALOG[program].map(([code])=>code);
      const owner=await m.Student.create({student_id:`ui-${program}-${runId}`,email:`ui-${program}-${runId}@email.kmutnb.ac.th`,first_name:'Safe',last_name:'Student',track:'co_op',major:program,advisor_teacher_id:advisor.id,password});
      const f=fixture(program); const captured=[];
      f.api({
        getMyStudentProfile:async()=>({student:(await m.Student.findByPk(owner.id,{include:[{model:m.Teacher,as:'advisorTeacher',attributes:['id','first_name','last_name']}]})).toJSON()}),
        createCoopRequest:async body=>{captured.push(body);return invoke(controller.createCoopRequest,{user:{id:owner.id},body});},
        getMyCoopRequests:()=>invoke(controller.getMyCoopRequests,{user:{id:owner.id}}),
        getCoopRequestById:id=>invoke(controller.getCoopRequestById,{user:{id:owner.id},params:{id}}),
      });
      await f.load();await f.open(); assert.deepEqual(Array.from(f.codes()),expected);
      f.fill();await f.choose(expected[0],'passed');await f.grade(expected[0],'B+');await f.choose(expected[1],'studying');await f.submit();
      assert.equal(captured.length,1);assert.deepEqual(Array.from(captured[0].prerequisite_courses,course=>course.course_code),expected);
      const request=await m.CoopRequest.findOne({where:{student_id:owner.id}});
      assert.equal(request.status,'advisor_review');
      const saved=await m.CoopRequestPrerequisiteCourse.findAll({where:{coop_request_id:request.id},order:[['course_code','ASC']]});
      assert.deepEqual(saved.map(row=>row.course_code),expected);assert.equal(saved.length,5);
      await f.get('viewCurrentCoopRequestBtn').dispatch('click');checkDetail(f,program,expected);
      snapshots[program]={f,owner,request,expected};
    });
    await t.test('Advisor → Head → approved refresh completes progress and retains snapshots/audit',async()=>{
      const {f,request,expected}=snapshots.IT;
      await service.reviewRequest('teacher',advisor.id,request.id,'approve',{});await f.run('loadCoopRequests()');await f.get('viewCurrentCoopRequestBtn').dispatch('click');
      assert.match(f.get('coopCurrentStatus').textContent,/หัวหน้าภาควิชา/);assert.doesNotMatch(f.get('coopCurrentStatus').textContent,/เจ้าหน้าที่/);
      await service.reviewRequest('department_head',head.id,request.id,'approve',{});await f.run('loadCoopRequests()');await f.get('viewCurrentCoopRequestBtn').dispatch('click');
      assert.match(f.get('coopDetailStatus').textContent,/อนุมัติ/);assert.ok(f.get('coopDetailStepper').querySelectorAll('.coop-step').every(node=>node.classList.contains('is-complete')));
      checkDetail(f,'IT',expected);const reviews=await m.CoopRequestReview.findAll({where:{coop_request_id:request.id},order:[['created_at','ASC']]});assert.deepEqual(reviews.map(row=>row.actor_role),['student','teacher','department_head']);
    });
    await t.test('Staff cancellation/history and Request A snapshot survive changed major and Request B',async()=>{
      const {f,owner,request,expected}=snapshots.INE;
      await service.reviewRequest('department_staff',staff.id,request.id,'cancel',{reason:'Fixture cancellation'});await f.run('loadCoopRequests()');
      const historyButton=f.get('coopRequestHistoryBody').querySelector('button');await f.get('coopRequestHistoryBody').dispatch('click',{target:historyButton});
      await waitForDetail(f);
      assert.match(f.get('coopDetailStatus').textContent,/ยกเลิก/);assert.doesNotMatch(f.get('coopDetailStatus').textContent,/โดยนักศึกษา|ไม่ได้รับการอนุมัติ/);checkDetail(f,'INE',expected);
      const audit=await m.CoopRequestReview.findOne({where:{coop_request_id:request.id,decision:'cancel'}});assert.equal(audit.actor_role,'department_staff');
      await owner.update({major:'IT'});await f.load();await f.open();f.fill();await f.submit();
      assert.equal(await m.CoopRequest.count({where:{student_id:owner.id}}),2);
      const historyButtons=f.get('coopRequestHistoryBody').querySelectorAll('button');const old=historyButtons.find(button=>button.dataset.requestId===request.id);
      await f.get('coopRequestHistoryBody').dispatch('click',{target:old});await waitForDetail(f);checkDetail(f,'INE',expected);
    });
    await t.test('Advisor and Head rejections retain readable snapshots in Student history',async()=>{
      const {f,owner}=snapshots.INE;const newer=await m.CoopRequest.findOne({where:{student_id:owner.id,status:'advisor_review'}});
      await service.reviewRequest('teacher',advisor.id,newer.id,'reject',{reason:'Advisor fixture reason'});await f.run('loadCoopRequests()');
      let button=f.get('coopRequestHistoryBody').querySelectorAll('button').find(button=>button.dataset.requestId===newer.id);await f.get('coopRequestHistoryBody').dispatch('click',{target:button});
      await waitForDetail(f);
      assert.match(f.get('coopDetailStatus').textContent,/ไม่ได้รับการอนุมัติ/);assert.equal(f.get('coopDetailPrerequisites').children.length,5);
      await f.open();f.fill();await f.submit();const third=await m.CoopRequest.findOne({where:{student_id:owner.id,status:'advisor_review'}});
      await service.reviewRequest('teacher',advisor.id,third.id,'approve',{});await service.reviewRequest('department_head',head.id,third.id,'reject',{reason:'Head fixture reason'});await f.run('loadCoopRequests()');
      button=f.get('coopRequestHistoryBody').querySelectorAll('button').find(button=>button.dataset.requestId===third.id);await f.get('coopRequestHistoryBody').dispatch('click',{target:button});
      await waitForDetail(f);
      assert.match(f.get('coopDetailStatus').textContent,/ไม่ได้รับการอนุมัติ/);assert.equal(f.get('coopDetailPrerequisites').children.length,5);
      assert.equal((await m.CoopRequestReview.findOne({where:{coop_request_id:third.id,decision:'reject'}})).reason,'Head fixture reason');
    });
  }finally{await sequelize.close();}
});
