import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {teacherFixture} from './helpers/teacherCoopFixture.js';
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
      assert.match(f.get('coopCurrentStatusSummary').textContent,/ผ่านการอนุมัติจากอาจารย์ที่ปรึกษาแล้ว/);
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
      assert.match(f.get('coopDetailRequest').textContent,/Advisor fixture reason/);
      await f.open();f.fill();await f.submit();const third=await m.CoopRequest.findOne({where:{student_id:owner.id,status:'advisor_review'}});
      await service.reviewRequest('teacher',advisor.id,third.id,'approve',{});await service.reviewRequest('department_head',head.id,third.id,'reject',{reason:'Head fixture reason'});await f.run('loadCoopRequests()');
      button=f.get('coopRequestHistoryBody').querySelectorAll('button').find(button=>button.dataset.requestId===third.id);await f.get('coopRequestHistoryBody').dispatch('click',{target:button});
      await waitForDetail(f);
      assert.match(f.get('coopDetailStatus').textContent,/ไม่ได้รับการอนุมัติ/);assert.equal(f.get('coopDetailPrerequisites').children.length,5);
      assert.equal((await m.CoopRequestReview.findOne({where:{coop_request_id:third.id,decision:'reject'}})).reason,'Head fixture reason');
      assert.match(f.get('coopDetailRequest').textContent,/Head fixture reason/);
    });
    for(const decision of ['approve','reject']) await t.test(`Teacher ${decision} shared modal → real SQL → Student page read-back (simulation)`,async()=>{
      const owner=await m.Student.create({student_id:`ui-class-${decision}-${runId}`,email:`ui-class-${decision}-${runId}@email.kmutnb.ac.th`,first_name:'Safe',last_name:'Student',track:'co_op',major:'IT',advisor_teacher_id:advisor.id,coop_advisor_teacher_id:head.id,password});
      const f=fixture('IT');
      f.api({getMyStudentProfile:async()=>({student:(await m.Student.findByPk(owner.id)).toJSON()}),createCoopRequest:body=>invoke(controller.createCoopRequest,{user:{id:owner.id},body}),getMyCoopRequests:()=>invoke(controller.getMyCoopRequests,{user:{id:owner.id}}),getCoopRequestById:id=>invoke(controller.getCoopRequestById,{user:{id:owner.id},params:{id}})});
      await f.load();await f.open();f.fill();await f.submit(); const request=await m.CoopRequest.findOne({where:{student_id:owner.id}});
      const teacher=teacherFixture({me:async()=>({success:true,data:{id:advisor.id}}),list:async query=>({success:true,data:(await service.listRequests('teacher',advisor.id,query)).map(row=>row.toJSON())}),detail:async id=>({success:true,data:JSON.parse(JSON.stringify(await service.requestDetail('teacher',advisor.id,id)))}),decide:(id,action,reason)=>service.reviewRequest('teacher',advisor.id,id,action,action==='reject'?{reason}:{})},false,true);
      await teacher.app.ready;await teacher.app.openDetail(request.id);
      const button=teacher.get('teacherCoopDetailBody').querySelectorAll('button').find(button=>button.dataset.coopAction===decision);assert.ok(button);await button.dispatch('click');
      if(decision==='reject')teacher.modal().querySelector('textarea').value='Teacher UI reason';
      await teacher.modal().querySelector('.app-confirm-modal__confirm').dispatch('click');
      const expected=decision==='approve'?'department_head_review':'rejected';assert.equal((await m.CoopRequest.findByPk(request.id)).status,expected);
      assert.equal(teacher.get('teacherCoopDetailBody').querySelectorAll('button').length,0);assert.equal(teacher.toasts.at(-1).type,'success');
      assert.equal(await m.CoopRequestReview.count({where:{coop_request_id:request.id}}),2);
      await f.run('loadCoopRequests()');
      if(decision==='approve'){assert.match(f.get('coopCurrentStatus').textContent,/หัวหน้าภาควิชา/);await f.get('viewCurrentCoopRequestBtn').dispatch('click');}
      else {const row=f.get('coopRequestHistoryBody').querySelectorAll('button').find(button=>button.dataset.requestId===request.id);await f.get('coopRequestHistoryBody').dispatch('click',{target:row});}
      await waitForDetail(f);if(decision==='reject')assert.match(f.get('coopDetailRequest').textContent,/Teacher UI reason/);
      await owner.reload();assert.equal(owner.advisor_teacher_id,advisor.id);assert.equal(owner.coop_advisor_teacher_id,head.id);
    });
    for(const decision of ['approve','reject']) await t.test(`Student -> Class UI -> Head ${decision} modal -> SQL -> Student page (simulation)`,async()=>{
      const owner=await m.Student.create({student_id:`ui-head-${decision}-${runId}`,email:`ui-head-${decision}-${runId}@email.kmutnb.ac.th`,first_name:'Safe',last_name:'Head Advisee',track:'co_op',major:'IT',advisor_teacher_id:advisor.id,coop_advisor_teacher_id:head.id,password});
      const f=fixture('IT');f.api({getMyStudentProfile:async()=>({student:(await m.Student.findByPk(owner.id)).toJSON()}),createCoopRequest:body=>invoke(controller.createCoopRequest,{user:{id:owner.id},body}),getMyCoopRequests:()=>invoke(controller.getMyCoopRequests,{user:{id:owner.id}}),getCoopRequestById:id=>invoke(controller.getCoopRequestById,{user:{id:owner.id},params:{id}})});
      await f.load();await f.open();f.fill();await f.submit();const request=await m.CoopRequest.findOne({where:{student_id:owner.id}});
      const adapters=(role,actor)=>({me:async()=>({success:true,data:{id:actor.id,is_department_head:actor.is_department_head}}),list:async query=>({success:true,data:(await service.listRequests(role,actor.id,query)).map(row=>row.toJSON())}),detail:async id=>({success:true,data:JSON.parse(JSON.stringify(await service.requestDetail(role,actor.id,id)))}),decide:(id,action,reason)=>service.reviewRequest(role,actor.id,id,action,action==='reject'?{reason}:{})});
      const teacher=teacherFixture(adapters('teacher',advisor),false,true), headUI=teacherFixture(adapters('department_head',head),false,true,true);
      await Promise.all([teacher.app.ready,headUI.app.ready]);assert.ok(!headUI.get('teacherCoopList').textContent.includes(owner.student_id));
      await assert.rejects(()=>service.reviewRequest('department_head',head.id,request.id,'approve',{}),{status:409});assert.equal(await m.CoopRequestReview.count({where:{coop_request_id:request.id}}),1);
      await teacher.app.openDetail(request.id);await teacher.get('teacherCoopDetailBody').querySelectorAll('button').find(button=>button.dataset.coopAction==='approve').dispatch('click');await teacher.modal().querySelector('.app-confirm-modal__confirm').dispatch('click');
      assert.equal((await m.CoopRequest.findByPk(request.id)).status,'department_head_review');await headUI.app.refresh();assert.match(headUI.get('teacherCoopList').textContent,new RegExp(owner.student_id));
      await headUI.app.openDetail(request.id);assert.match(headUI.get('teacherCoopDetailBody').textContent,/Class Advisor.*รออาจารย์ที่ปรึกษาพิจารณา → รอหัวหน้าภาควิชาพิจารณา/s);
      await headUI.get('teacherCoopDetailBody').querySelectorAll('button').find(button=>button.dataset.coopAction===decision).dispatch('click');if(decision==='reject')headUI.modal().querySelector('textarea').value='Head UI rejection reason';
      await headUI.modal().querySelector('.app-confirm-modal__confirm').dispatch('click');const expected=decision==='approve'?'approved':'rejected';
      assert.equal((await m.CoopRequest.findByPk(request.id)).status,expected);assert.equal(headUI.get('teacherCoopDetailBody').querySelectorAll('button').length,0);assert.equal(headUI.toasts.at(-1).type,'success');
      const audits=await m.CoopRequestReview.findAll({where:{coop_request_id:request.id},order:[['created_at','ASC']]});assert.deepEqual(audits.map(row=>row.actor_role),['student','teacher','department_head']);assert.equal(audits[2].teacher_id,head.id);
      await f.run('loadCoopRequests()');if(decision==='approve'){assert.match(f.get('coopCurrentStatusSummary').textContent,/คำร้องได้รับการอนุมัติแล้ว/);await f.get('viewCurrentCoopRequestBtn').dispatch('click');}else{const button=f.get('coopRequestHistoryBody').querySelectorAll('button').find(button=>button.dataset.requestId===request.id);await f.get('coopRequestHistoryBody').dispatch('click',{target:button});}
      await waitForDetail(f);if(decision==='reject')assert.match(f.get('coopDetailRequest').textContent,/Head UI rejection reason/);await owner.reload();assert.equal(owner.advisor_teacher_id,advisor.id);assert.equal(owner.coop_advisor_teacher_id,head.id);
    });
  }finally{await sequelize.close();}
});
