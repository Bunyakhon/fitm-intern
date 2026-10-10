const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
process.env.DOTENV_CONFIG_QUIET='true';
const models=require(path.join(root,'backend/src/models'));
const scan=JSON.parse(fs.readFileSync(path.join(__dirname,'static-scan.json'),'utf8'));
const content=Object.fromEntries(scan.filter(r=>r.review==='STATIC SCANNED').map(r=>[r.path,fs.readFileSync(path.join(root,r.path),'utf8')]));
const registrations=[
 ['auth','/api/auth','Student / public login','auth.api.js'],
 ['studentProfile','/api/student-profile','Student owner','studentProfile.api.js'],
 ['teacher','/api/teachers','Authenticated JWT: active directory','teacher.api.js'],
 ['mentor','/api/mentors','Student owner','mentor.api.js'],
 ['mentorVerification','/api/mentor-verification','Public capability token','mentorVerification.api.js'],
 ['coopRequest','/api/coop-requests','Student owner','coopRequest.api.js'],
 ['jobSubmission','/api/job-submissions','Public + CAPTCHA / email capability','recruitStudent.api.js'],
 ['staffAuth','/api/staff/auth','Staff / public login','staffDocuments.api.js'],
 ['jobMatching','/api/job-matches','Student owner','jobMatching.api.js'],
 ['studentCoop','/api/student-coop','Student owner','studentCoop.api.js'],
 ['internshipLogs','/api/internship-logs','Student owner / Mentor capability','internshipLogs.api.js'],
 ['supervision','/api/supervision','Project Teacher / Student owner / Mentor capability','supervision.api.js'],
 ['coopActivities','/api/coop-activities','Active Staff / Student published-only','coopActivities.api.js'],
 ['staffDocuments','/api/staff/document-requests','Active Staff; parent middleware','staffDocuments.api.js'],
 ['roleWorkflow','/api/staff','department_staff','staffCoopRequests.api.js'],
 ['roleWorkflow','/api/teachers','teacher','teacher.api.js / teacherProjectAdvisor.api.js'],
 ['roleWorkflow','/api/department-head','department_head','departmentHead.api.js'],
];
const factories={studentCoop:'createStudentCoopRouter',internshipLogs:'createInternshipLogsRouter',supervision:'createSupervisionRouter',coopActivities:'createCoopActivitiesRouter'};
const testFiles={auth:'No dedicated Student registration/login test found; historical Chrome password login only',studentProfile:'backend/test/resumeUpload.test.js; frontend/test/studentAdvisor.test.js; backend/test/studentAdvisor.test.js',teacher:'backend/test/studentAdvisor.test.js',mentor:'backend/test/roleWorkflow.database.test.js; historical Daily Chrome',mentorVerification:'Historical Daily/Supervision Chrome; roleWorkflow.database.test.js',coopRequest:'backend/test/coopDirectWorkflow.test.js; coopPrerequisites.test.js; coopRequestCompany.test.js; roleWorkflow.database.test.js; frontend/test/studentCoopAcceptance.test.js',jobSubmission:'backend/test/jobSubmission.test.js; recruitmentSecurity.test.js; recruitmentLifecycle.database.test.js; jobSubmission.database.test.js',staffAuth:'backend/test/staffAuth.test.js; roleAuth.test.js; historical Staff Chrome',jobMatching:'backend/test/jobMatching.test.js; nlp-service/tests/test_job_matching.py',studentCoop:'backend/test/studentCoopProject.database.test.js; coopProjectAdvisor.database.test.js; companyEvaluation.database.test.js; frontend/test/studentCoopProject.test.js',internshipLogs:'backend/test/internshipLogRules.test.js; internshipLogs.database.test.js; frontend/test/studentInternshipLog.test.js; historical Daily Chrome',supervision:'backend/test/supervision.database.test.js; supervisionResults.database.test.js; supervisionRules.test.js; supervisionResultRules.test.js; frontend/test/supervision.test.js; supervisionResult.test.js; historical Chrome',coopActivities:'backend/test/coopActivities.database.test.js; coopActivityRules.test.js is NOT present; frontend/test/coopActivities.test.js; historical activity Chrome',staffDocuments:'backend/test/staffDocuments.database.test.js; companyResponse.test.js; frontend/test/staffDocuments.test.js; companyResponse.test.js; final Documents Chrome',roleWorkflow:'backend/test/roleAuth.test.js; coopDirectWorkflow.test.js; roleWorkflow.database.test.js; frontend/test/staffCoopRequests.test.js / teacherCoopRequests.test.js / departmentHead.test.js (per role)'};
const routes=[];
for (const [name,prefix,role,consumer] of registrations) {
 const mod=require(path.join(root,`backend/src/routes/${name}.routes.js`));
 const router=name==='roleWorkflow'?mod.createRoleWorkflowRouter(role):name==='staffDocuments'?mod.createStaffDocumentsRouter(models):factories[name]?mod[factories[name]]():mod;
 const src=`backend/src/routes/${name}.routes.js`;
 const modelNames=Object.entries(models).filter(([n,m])=>m?.rawAttributes && (content[src].includes(n) || Object.entries(content).some(([p,s])=>p.startsWith('backend/src/services/')&&s.includes(n)&&content[src].includes(path.basename(p,'.js'))))).map(([n])=>n);
 for(const layer of router.stack.filter(l=>l.route))for(const [method,active]of Object.entries(layer.route.methods))if(active){
   const url=prefix+(layer.route.path==='/'?'':layer.route.path);
   let consumers=consumer;
   if(name==='roleWorkflow'){
     if(url.endsWith('/me') && role==='department_staff')consumers='staffDocuments.api.js → getCurrentStaff';
     if(role==='department_staff' && url.includes('/job-postings'))consumers='No production UI consumer found';
     if(role==='department_head' && (/\/teachers|\/coop-advisor|\/me$/.test(url)) && method!=='get')consumers='No management UI consumer found';
     if(url.endsWith('/students/:id/coop-advisor'))consumers='No production UI consumer; service intentionally returns 409';
   }
   routes.push({method:method.toUpperCase(),route:url,role,handler:layer.route.stack.map(l=>l.handle.name||'inline handler').join(', '),source:src,databaseCandidates:modelNames,consumer:consumers,test:testFiles[name],status:'REGISTERED / STATIC; runtime verification is feature-specific'});
 }
}
routes.unshift({method:'GET',route:'/',role:'Public',handler:'app inline API liveness',source:'backend/src/app.js',databaseCandidates:[],consumer:'Health probe',test:'Historical runners',status:'STATIC'},
{method:'GET',route:'/health/db',role:'Public',handler:'sequelize.authenticate',source:'backend/src/app.js',databaseCandidates:[],consumer:'Health probe',test:'Historical runners',status:'STATIC; raw error.message exposure'});
const migrations=Object.entries(content).filter(([p])=>p.includes('/migrations/'));
const db=Object.entries(models).filter(([n,m])=>m?.rawAttributes).map(([name,m])=>{
 const table=m.getTableName();const source=scan.find(s=>s.tables.includes(table))?.path;
 const migration=migrations.filter(([p,s])=>s.includes(table)).map(([p])=>p);
 const usedBy=Object.entries(content).filter(([p,s])=>!p.includes('/models/')&&new RegExp(`\\b${name}\\b`).test(s)).map(([p])=>p);
 return {name,table,source,purpose:source||'Sequelize registered model',relations:Object.values(m.associations).map(a=>({type:a.associationType,target:a.target.name,foreignKey:a.foreignKey,as:a.as})),fields:Object.keys(m.rawAttributes),indexes:m.options.indexes,migrationReferences:migration,usedBy,testCoverage:usedBy.filter(p=>p.includes('/test/')),issues:'Primary database apply state UNKNOWN; relation/model checks do not inspect live physical schema'};
});
for(const r of routes)r.test=r.test.replace('coopActivityRules.test.js is NOT present; ','');
routes.find(r=>r.route==='/api/staff/auth/me').consumer='No production client found; current Staff client uses /api/staff/me';
fs.writeFileSync(path.join(__dirname,'contracts.json'),JSON.stringify({routeCount:routes.length,modelCount:db.length,migrationCount:migrations.length,routes,models:db},null,2));
const escape=s=>String(s).replace(/\|/g,'\\|').replace(/\n/g,' ');
let md='# API and database inventories — local working tree 2026-10-10\n\nRead-only Express router construction and Sequelize model registration. No server was started, no database connection opened, no migration run. Route count counts method + path; factory-role expansion and loop-generated endpoints are included. Consumers/tables identified by source inspection are candidates where marked.\n\n';
md+='## Express API inventory\n\n| Method | Route | Role | Controller/Handler | Database | Frontend Consumer | Test | Status |\n|---|---|---|---|---|---|---|---|\n';
for(const r of routes)md+='| '+[r.method,'`'+r.route+'`',r.role,r.source+' → '+r.handler,r.databaseCandidates.join(', ')||'See service/model references',r.consumer,r.test,r.status].map(escape).join(' | ')+' |\n';
md+='\n## Database inventory\n\n| Table/Model | Purpose | Relations | Used By | Migration | Test Coverage | Issues |\n|---|---|---|---|---|---|---|\n';
for(const m of db)md+='| '+[m.table+' / '+m.name,m.source,m.relations.map(a=>a.type+' '+a.target+' via '+a.foreignKey).join('; '),m.usedBy.filter(p=>p.startsWith('backend/src/')).join('; '),m.migrationReferences.join('; ')||'No literal table reference detected; inspect migration dynamically',m.testCoverage.join('; ')||'No direct named reference detected',m.issues].map(escape).join(' | ')+' |\n';
fs.writeFileSync(path.join(root,'docs/audits/FITM_API_DATABASE_INVENTORY_2026-10-10.md'),md);
console.log(JSON.stringify({routes:routes.length,models:db.length,migrations:migrations.length}));
models.sequelize.close();
