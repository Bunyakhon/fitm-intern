// Explicitly authorized Development acceptance only. Real running HTTP service,
// normal unified login, newly owned fixtures, no existing-account credentials/JWT.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID,randomBytes}=require('node:crypto');
const enabled=process.env.FITM_CO09_DEVELOPMENT_TESTS==='1'&&process.env.FITM_CO09_DEVELOPMENT_CONFIRM==='intern_system';
test('CO-09 running Development HTTP + PostgreSQL + normal fixture authentication', {skip:!enabled,timeout:1200000},async t=>{
  const env=require('dotenv').parse(await fs.readFile(path.join(__dirname,'../.env')));
  assert.equal(env.NODE_ENV,'development');assert.equal(env.DB_NAME,'intern_system');assert.equal(env.DB_HOST,'postgres');
  Object.assign(process.env,env,{DB_HOST:'127.0.0.1',DOTENV_CONFIG_QUIET:'true'});
  const m=require('../src/models'),db=m.sequelize,helper=require('../src/db/coopTopicExamDevelopment');
  const {Op}=require('sequelize'),fixture={students:[],teachers:[],staff:[],run:randomUUID()},accounts=[],tokens=[];
  const base='http://127.0.0.1:5000',preserve=require('../src/db/studentProfileDevelopment');
  let before,teacherA,teacherB,staffToken,teacherToken,stage='preflight',created=false,beforeGoogle=[];
  const browserOnly=process.env.FITM_CO09_DEVELOPMENT_BROWSER_ONLY==='1';
  let budget;
  const ledger=process.env.FITM_CO09_FIXTURE_LEDGER;
  assert.ok(ledger&&path.isAbsolute(ledger),'A private absolute fixture ledger is required');
  async function saveLedger(){await fs.writeFile(ledger,JSON.stringify(fixture),{mode:0o600});}
  async function request(token,method,endpoint,body,version){
    const form=body instanceof FormData;
    const response=await fetch(base+endpoint,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(!form?{'Content-Type':'application/json'}:{}),...(version===undefined?{}:{'If-Match':`"${version}"`})},...(body===undefined?{}:{body:form?body:JSON.stringify(body)})});
    if(endpoint.startsWith('/api/coop-topic-exams')){const header=response.headers.get('ratelimit')||'';const remaining=header.match(/remaining=(\d+)/),reset=header.match(/reset=(\d+)/);if(remaining&&reset)budget={remaining:Number(remaining[1]),reset:Number(reset[1])};}
    const data=response.headers.get('content-type')?.includes('application/json')?await response.json():Buffer.from(await response.arrayBuffer());
    return {status:response.status,data,headers:response.headers};
  }
  const api=(token,method,endpoint,body,version)=>request(token,method,'/api/coop-topic-exams'+endpoint,body,version);
  const manage=index=>'/manage/students/'+fixture.students[index];
  const read=async index=>{const value=await api(tokens[index],'GET','/me');assert.equal(value.status,200);return value.data.data;};
  const pdf=()=>{
    const lines=['%PDF-1.4\n'];const offsets=[0];
    const content='BT /F1 16 Tf 20 120 Td (Synthetic CO-09 acceptance) Tj ET\n';
    const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`];
    for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(lines.join('')));lines.push(`${i+1} 0 obj\n${objects[i]}\nendobj\n`);}
    const xref=Buffer.byteLength(lines.join(''));lines.push(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);return Buffer.from(lines.join(''));
  };
  const upload=(bytes=pdf(),filename='CO-09.pdf',mime='application/pdf')=>{const body=new FormData();body.append('file',new Blob([bytes],{type:mime}),filename);return body;};
  const schedule=(room='CO09-FIXTURE-ROOM',start='09:00',end='10:00',teacher=teacherA)=>({status:'scheduled',starts_at:`2026-12-11T${start}:00+07:00`,ends_at:`2026-12-11T${end}:00+07:00`,mode:'onsite',location:room,meeting_url:'',notes:'Synthetic CO-09 acceptance',reason:'',committee:[{teacher_id:teacher,role:'chair'}]});
  async function login(account){
    let value=await request(null,'POST','/api/auth/unified-login',{email:account.email,password:account.password});
    if(value.status===429){console.log('Respecting existing Login rate-limit cooldown before normal fixture authentication');await new Promise(resolve=>setTimeout(resolve,Math.min(Number(value.headers.get('retry-after')||900),900)*1000+500));value=await request(null,'POST','/api/auth/unified-login',{email:account.email,password:account.password});}
    assert.equal(value.status,200,'Normal unified login');assert.ok(value.data.token);return value.data;
  }
  try{
    before=await helper.preflight(m);assert.equal(before.ready,true);fixture.beforeCounts=Object.fromEntries(Object.entries(before.fingerprints).map(([name,row])=>[name,row.rows]));
    beforeGoogle=await m.GoogleAuthRequest.findAll({attributes:['id','expires_at'],raw:true});
    assert.equal((await fetch(base+'/health/db')).status,200);await saveLedger();
    stage='fixture creation';
    for(let i=0;i<3;i++){
      const code='999'+String(BigInt('0x'+randomBytes(6).toString('hex'))%10000000000n).padStart(10,'0');
      const account={id:randomUUID(),student_id:code,email:`s${code}@email.kmutnb.ac.th`,password:randomBytes(24).toString('base64url')};
      fixture.students.push(account.id);await saveLedger();
      await m.Student.create({...account,first_name:'CO09FIXTURE',last_name:fixture.run,track:'co_op'});created=true;accounts.push(account);
      await m.CoopProject.create({student_id:account.id,topic:'CO-09 Development acceptance '+fixture.run});
    }
    for(let i=0;i<2;i++){
      const account={id:randomUUID(),email:`co09-${fixture.run}-${i}@example.com`,password:randomBytes(24).toString('base64url')};fixture.teachers.push(account.id);await saveLedger();
      await m.Teacher.create({...account,first_name:'CO09EXAMINER',last_name:fixture.run,status:'active'});accounts.push(account);
    }
    teacherA=fixture.teachers[0];teacherB=fixture.teachers[1];
    const staff={id:randomUUID(),email:`co09-staff-${fixture.run}@example.com`,password:randomBytes(24).toString('base64url')};fixture.staff.push(staff.id);await saveLedger();
    await m.DepartmentStaff.create({...staff,first_name:'CO09STAFF',last_name:fixture.run});accounts.push(staff);
    if(!browserOnly){
    stage='normal authentication';tokens.push((await login(accounts[0])).token,(await login(accounts[1])).token);staffToken=(await login(staff)).token;teacherToken=(await login(accounts[3])).token;
    await t.test('live login + RBAC/ownership + existing Project/Advisor/Book/Poster read contracts',async()=>{
      assert.equal((await api(null,'GET','/me')).status,401);
      for(const token of [tokens[0],teacherToken])assert.equal((await api(token,'PUT',manage(0)+'/schedule',schedule(),0)).status,403);
      assert.equal((await api(staffToken,'GET','/manage/students?search='+accounts[0].student_id)).data.data.length,1);
      assert.equal((await api(tokens[0],'PUT',manage(0)+'/review',{review_status:'approved'},0)).status,403);
      assert.equal((await api(staffToken,'GET','/manage/students/'+randomUUID())).status,404);
      for(const endpoint of ['/api/student-coop/project','/api/student-coop/project-advisor-request','/api/student-coop/project-files'])assert.equal((await request(tokens[0],'GET',endpoint)).status,200);
      assert.equal((await read(0)).document.review_status,'missing');assert.equal((await read(0)).exam.status,'unscheduled');
    });
    await t.test('real PDF validation, private bytes, URL, fresh reload, review and approval',async()=>{
      for(const body of [upload(Buffer.from('bad')),upload(pdf(),'CO-09.txt'),upload(pdf(),'CO-09.pdf','text/plain')])assert.equal((await api(tokens[0],'POST','/me/document',body,0)).status,400);
      assert.equal((await api(tokens[0],'POST','/me/document',upload(Buffer.alloc(10*1024*1024+1)),0)).status,413);
      assert.equal((await api(tokens[0],'POST','/me/document',upload())).status,428);
      assert.equal((await api(tokens[0],'POST','/me/document',upload(),0)).status,200);
      let current=await read(0);assert.equal(current.document.file.original_name,'CO-09.pdf');assert.equal(current.document.review_status,'pending');
      const preview=await api(tokens[0],'GET','/me/document/preview');assert.equal(preview.status,200);assert.deepEqual(preview.data,pdf());assert.equal(preview.headers.get('cache-control'),'private, no-store');
      assert.ok((await api(tokens[0],'GET','/me/document/download')).headers.get('content-disposition').startsWith('attachment'));
      assert.equal((await api(tokens[1],'GET','/me/document/preview')).status,404);
      assert.equal((await api(tokens[0],'GET',manage(1)+'/document/preview')).status,403);
      assert.equal((await api(staffToken,'GET',manage(0)+'/document/preview')).status,200);
      assert.equal((await api(tokens[0],'PUT','/me/document-url',{document_url:'javascript:alert(1)'},current.document.version)).status,400);
      assert.equal((await api(tokens[0],'PUT','/me/document-url',{document_url:'https://example.com/co09/'+fixture.run},current.document.version)).status,200);
      current=await read(0);assert.ok(current.document.document_url.endsWith(fixture.run));assert.ok(current.document.file);
      assert.equal((await api(staffToken,'PUT',manage(0)+'/review',{review_status:'needs_revision',review_reason:'Revise synthetic CO-09'},current.document.version)).status,200);
      current=await read(0);assert.equal(current.document.review_reason,'Revise synthetic CO-09');assert.equal(current.exam.status,'unscheduled');
      assert.equal((await api(staffToken,'PUT',manage(0)+'/review',{review_status:'approved',review_reason:''},current.document.version)).status,200);
      assert.equal((await read(0)).document.review_status,'approved');
    });
    await t.test('duplicate/concurrent uploads retain exactly one current revision; no partial metadata on rejection',async()=>{
      const current=await read(0),results=await Promise.all([0,1].map(()=>api(tokens[0],'POST','/me/document',upload(),current.document.version)));
      assert.deepEqual(results.map(row=>row.status).sort(),[200,409]);
      const after=await read(0);assert.equal(after.document.version,current.document.version+1);assert.equal(after.document.review_status,'pending');
      assert.equal((await api(tokens[0],'POST','/me/document',upload(),current.document.version)).status,409);
      assert.equal((await m.CoopTopicDocument.findAll({where:{student_id:fixture.students[0]}})).length,1);
    });
    await t.test('schedule/committee create, revision, concurrent conflicts, atomic read-back and rollback',async()=>{
      assert.equal((await api(staffToken,'PUT',manage(0)+'/schedule',{...schedule(),ends_at:schedule().starts_at},0)).status,400);
      assert.equal((await api(staffToken,'PUT',manage(0)+'/schedule',{...schedule(),committee:[...schedule().committee,...schedule().committee]},0)).status,400);
      assert.equal((await api(staffToken,'PUT',manage(0)+'/schedule',schedule(),0)).status,200);
      let current=await read(0);assert.equal(current.exam.committee.length,1);assert.equal(current.exam.committee[0].teacher_id,teacherA);
      assert.equal((await api(staffToken,'PUT',manage(1)+'/schedule',schedule('DIFFERENT-ROOM'),0)).data.code,'CO09_COMMITTEE_CONFLICT');
      assert.equal((await api(staffToken,'PUT',manage(1)+'/schedule',schedule(undefined,undefined,undefined,teacherB),0)).data.code,'CO09_ROOM_CONFLICT');
      assert.equal((await api(staffToken,'PUT',manage(0)+'/schedule',schedule(),0)).status,409);
      const failing={...schedule('NEW-ROOM','11:00','12:00'),committee:[{teacher_id:randomUUID(),role:'member'}]};assert.equal((await api(staffToken,'PUT',manage(0)+'/schedule',failing,current.exam.version)).status,400);
      assert.deepEqual((await read(0)).exam,current.exam);
      const race=await Promise.all([0,1].map(index=>api(staffToken,'PUT',manage(0)+'/schedule',{...schedule('CO09-EDIT-'+index,'11:00','12:00',teacherB),status:'rescheduled',reason:'Concurrent edit'},current.exam.version)));
      assert.deepEqual(race.map(row=>row.status).sort(),[200,409]);current=await read(0);assert.equal(current.exam.version,2);assert.equal(current.exam.committee[0].teacher_id,teacherB);
      const concurrent=await Promise.all([0,1].map(index=>api(staffToken,'PUT',manage(index)+'/schedule',{...schedule('CO09-CLASH-'+index,'14:00','15:00'),...(index?{}:{status:'rescheduled',reason:'Conflict check'})},index?0:current.exam.version)));
      assert.deepEqual(concurrent.map(row=>row.status).sort(),[200,409]);
    });
    await t.test('update date/room/online committee and reschedule/cancel/reopen/complete history',async()=>{
      for(const status of ['scheduled','rescheduled','cancelled','scheduled','completed']){
        const current=await read(0),body={...schedule('CO09-LIFECYCLE','16:00','17:00',teacherB),status,reason:['rescheduled','cancelled'].includes(status)?'Synthetic transition reason':'',starts_at:'2026-12-12T16:00:00+07:00',ends_at:'2026-12-12T17:00:00+07:00',mode:'online',meeting_url:'https://example.com/co09-meeting'};
        assert.equal((await api(staffToken,'PUT',manage(0)+'/schedule',body,current.exam.version)).status,200);
        assert.equal((await read(0)).exam.status,status);
      }
      const current=await read(0);assert.equal((await api(staffToken,'PUT',manage(0)+'/schedule',schedule(),current.exam.version)).status,409);
      const detail=await api(staffToken,'GET',manage(0));assert.ok(detail.data.data.exam.history.length>=7);
      assert.equal((await m.CoopTopicExamCommitteeMember.count({where:{exam_id:current.exam.id}})),1);
      assert.equal((await m.Student.findByPk(fixture.students[0],{attributes:['coop_advisor_teacher_id']})).coop_advisor_teacher_id,null);
    });
    }
    if(process.env.FITM_CO09_BROWSER_CDP){
      stage='real browser';
      if(budget&&budget.remaining<35){console.log('Respecting existing CO-09 rate-limit reset before Browser acceptance');await new Promise(resolve=>setTimeout(resolve,Math.min(budget.reset,60)*1000+500));}
      await t.test('real Chrome + normal login + actual Development UI/API/PostgreSQL',async()=>{
        const {runBrowser}=require('./helpers/coopTopicExamsBrowser.cjs');
        await runBrowser({cdp:process.env.FITM_CO09_BROWSER_CDP,student:accounts[2],staff,teacherA,teacherB,pdf:pdf(),readSQL:async()=>{
          const doc=await m.CoopTopicDocument.findOne({where:{student_id:fixture.students[2]},attributes:['version','document_url','review_status']});
          const exam=await m.CoopTopicExam.findOne({where:{student_id:fixture.students[2]},attributes:['id','version','status','location']});
          return {document:doc?.toJSON(),exam:exam?.toJSON(),members:exam?await m.CoopTopicExamCommitteeMember.count({where:{exam_id:exam.id}}):0};
        }});
      });
    }
    stage='preservation before cleanup';
    const existing=await preserve.fingerprints(db,undefined,{excludeContacts:false});
    for(const name of Object.keys(before.fingerprints).filter(name=>!['students','teachers','department_staffs','coop_projects','coop_topic_documents','coop_topic_exams','coop_topic_exam_committee_members','coop_topic_exam_history','student_profiles','google_auth_requests'].includes(name)))assert.deepEqual(existing[name],before.fingerprints[name]);
  }catch(error){throw Error('CO-09 Development acceptance stopped at '+stage+'; '+error.name+'; SQL='+String(error.original?.code||'none'));}
  finally{
    stage='cleanup';
    try{
      if(created)await db.transaction(async transaction=>{
        const studentWhere={student_id:{[Op.in]:fixture.students}};
        const exams=await m.CoopTopicExam.findAll({where:studentWhere,attributes:['id'],transaction});const examWhere={exam_id:{[Op.in]:exams.map(row=>row.id)}};
        await m.CoopTopicExamHistory.destroy({where:examWhere,transaction});await m.CoopTopicExamCommitteeMember.destroy({where:examWhere,transaction});
        await m.CoopTopicExam.destroy({where:studentWhere,transaction});await m.CoopTopicDocument.destroy({where:studentWhere,transaction});await m.CoopProject.destroy({where:studentWhere,transaction});
        await m.Student.destroy({where:{id:{[Op.in]:fixture.students}},transaction});await m.DepartmentStaff.destroy({where:{id:{[Op.in]:fixture.staff}},transaction});await m.Teacher.destroy({where:{id:{[Op.in]:fixture.teachers}},transaction});
      });
      if(process.env.FITM_CO09_BROWSER_AUTH_LEDGER){
        const auth=await fs.readFile(process.env.FITM_CO09_BROWSER_AUTH_LEDGER,'utf8').then(JSON.parse).catch(()=>({googleRequests:[]}));
        const createdIds=(auth.googleRequests||[]).filter(id=>!beforeGoogle.some(row=>row.id===id));
        if(createdIds.length)await m.GoogleAuthRequest.destroy({where:{id:{[Op.in]:createdIds}}});
        fixture.cleanedBrowserChallenges=createdIds.length;
      }
      const after=await helper.preflight(m);assert.deepEqual(after.schema,before.schema);
      helper.preserved(before.fingerprints,after.fingerprints,{excludeTables:['google_auth_requests']});
      const remainingGoogle=await m.GoogleAuthRequest.findAll({attributes:['id','expires_at'],raw:true});
      const removed=beforeGoogle.filter(row=>!remainingGoogle.some(item=>item.id===row.id));assert.ok(removed.every(row=>new Date(row.expires_at)<new Date()),'Only pre-existing expired challenges may be removed by normal Google GC');
      fixture.expiredChallengeCleanup=removed.length;fixture.unattributedNewChallenges=remainingGoogle.filter(row=>!beforeGoogle.some(item=>item.id===row.id)).length;
      fixture.cleanupDatabase=true;fixture.afterCounts=Object.fromEntries(Object.entries(after.fingerprints).map(([name,row])=>[name,row.rows]));await saveLedger();
      console.log(JSON.stringify({cleanup:'PASS',businessFingerprintsAndSchema:'UNCHANGED',expiredChallengeCleanup:removed.length,ownedBrowserChallengesCleaned:fixture.cleanedBrowserChallenges||0,unattributedNewChallenges:fixture.unattributedNewChallenges,realAccountLogin:'NOT VERIFIED'}));
    }finally{for(const account of accounts)account.password='';tokens.fill('');staffToken=teacherToken='';await db.close();}
  }
});
