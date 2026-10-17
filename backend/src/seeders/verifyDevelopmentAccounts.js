const {PreparationError}=require("./accountPreparation");
const {assertDevelopmentTarget,liveGuard,buildDevelopmentPlan}=require("./developmentAccountPreparation");
const {createUnifiedAuthService}=require("../services/unifiedAuth.service");
const {fixtureAssets,fixturePdf}=require("./accountPreparation.fixtures");
const ensure=(condition,code)=>{if(!condition)throw new PreparationError(code);};
async function verifyDevelopmentAccounts({models,env,vault,pdfTest=false}){
  assertDevelopmentTarget(env,models.sequelize);await liveGuard(models.sequelize);
  process.env.JWT_SECRET=env.JWT_SECRET;process.env.JWT_EXPIRES_IN=env.JWT_EXPIRES_IN||"1d";
  const auth=createUnifiedAuthService({models}),tokens=new Map(),plan=buildDevelopmentPlan();let credentials=0,files=0;
  for(const account of vault.accounts){const session=await auth.login({email:account.email,password:account.password});
    ensure(session.role===(account.key==="teacher-01"?"department_head":account.type),"DATABASE_AUTH_ROLE_MISMATCH");
    tokens.set(account.key,session.token);credentials++;
  }
  async function api(key,path,{method="GET",body,revision,expected=200,binary=false}={}){
    const response=await fetch("http://127.0.0.1:5000"+path,{method,headers:{Authorization:`Bearer ${tokens.get(key)}`,...(revision?{"If-Match":revision}:{}),...(body&&!(body instanceof FormData)?{"Content-Type":"application/json"}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
    ensure(response.status===expected,`DEVELOPMENT_API_EXPECTED_${expected}_GOT_${response.status}`);
    return binary?Buffer.from(await response.arrayBuffer()):response.json();
  }
  const snapshotByKey=new Map();
  for(const student of plan.students){const s=await api(student.key,"/api/student-profile/aggregate");snapshotByKey.set(student.key,s);
    ensure(s.student.id===vault.accounts.find(a=>a.key===student.key).id&&s.student.coop_advisor_teacher_id===null,"STUDENT_OWNER_OR_ADVISOR_MISMATCH");
    for(const kind of ["addresses","education","training","skills"])ensure(s[kind].length===student.aggregate[kind].create.length,"STUDENT_CHILD_COUNT_MISMATCH");
    if(s.student.profile_image){const bytes=await api(student.key,"/api/student-profile/profile-image",{binary:true});ensure(bytes.equals(fixtureAssets(student.student.student_id)[0].bytes),"PRIVATE_IMAGE_BYTES_MISMATCH");files++;}
    for(const document of s.documents){const bytes=await api(student.key,`/api/student-profile/documents/${document.id}/download`,{binary:true});ensure(bytes.equals(fixturePdf(student.student.student_id)),"PRIVATE_DOCUMENT_BYTES_MISMATCH");files++;}
  }
  const first=snapshotByKey.get("student-1"),third=snapshotByKey.get("student-3");
  await api("student-2",`/api/student-profile/documents/${first.documents[0].id}/download`,{expected:404,binary:true});
  await api("student-1","/api/teachers/me",{expected:403});await api("staff-1","/api/department-head/me",{expected:403});
  await api("student-3","/api/student-profile/aggregate",{method:"PATCH",body:{profile:{special_abilities:"ข้อมูลทดสอบ"}},expected:428});
  await api("student-3","/api/student-profile/aggregate",{method:"PATCH",body:{profile:{special_abilities:"ข้อมูลทดสอบ"}},revision:'"'+"0".repeat(64)+'"',expected:409});
  const changed=await api("student-3","/api/student-profile/aggregate",{method:"PATCH",body:{profile:{special_abilities:"ทักษะนำเสนอข้อมูลสังเคราะห์"}},revision:third.profile_revision});
  ensure(changed.profile.special_abilities==="ทักษะนำเสนอข้อมูลสังเคราะห์","PROFILE_SAVE_READBACK_MISMATCH");
  const restored=await api("student-3","/api/student-profile/aggregate",{method:"PATCH",body:{profile:{special_abilities:third.profile.special_abilities}},revision:changed.profile_revision});
  ensure(restored.profile.special_abilities===third.profile.special_abilities,"PROFILE_RESTORE_MISMATCH");
  let pdf={tested:false};
  if(pdfTest){
    const owner="student-4",file=fixturePdf("9900000000004"),name="profile-import-TEST-ONLY.pdf",before=snapshotByKey.get(owner);
    const history=await api(owner,"/api/student-profile/pdf-import/history");
    if(history.imports?.length){
      ensure(before.profile.nationality==="SYNTHETIC"&&history.imports[0].extraction_status==="ready"&&before.documents.some(d=>d.id===history.imports[0].id),"PERSISTED_PDF_IMPORT_READBACK_MISMATCH");
      pdf={tested:true,already_imported:true,persisted_profile_verified:true,private_document_verified:true,method:history.imports[0].extraction_method};
    }
    else{
      const upload=()=>{const form=new FormData();form.append("document",new Blob([file],{type:"application/pdf"}),name);return form;};
      const preview=await api(owner,"/api/student-profile/pdf-import/preview",{method:"POST",body:upload()});
      ensure(preview.identity_status==="matched"&&preview.page_count===4,"PDF_IDENTITY_OR_PAGE_MISMATCH");
      const afterPreview=await api(owner,"/api/student-profile/aggregate");ensure(afterPreview.profile_revision===before.profile_revision,"PREVIEW_MUST_NOT_SAVE");
      const reviewed=await api(owner,"/api/student-profile/pdf-import/review",{method:"POST",body:{receipt:preview.receipt}});
      const form=upload();form.append("receipt",reviewed.receipt);form.append("changes",JSON.stringify({profile:{nationality:"SYNTHETIC"}}));
      const committed=await api(owner,"/api/student-profile/pdf-import/commit",{method:"POST",body:form,revision:reviewed.snapshot.profile_revision,expected:201});
      ensure(committed.profile.nationality==="SYNTHETIC","PDF_EXPLICIT_SAVE_MISMATCH");
      const status=await api(owner,"/api/student-profile/pdf-import/status",{method:"POST",body:{receipt:reviewed.receipt}});ensure(status.import_status==="committed","PDF_COMMIT_STATUS_MISMATCH");
      pdf={tested:true,pages:4,method:preview.method,preview_without_write:true,review:true,explicit_commit:true,status_verified:true};
    }
  }
  return {postgresql_credential_logins:credentials,roles:["teacher","department_head","department_staff","student"],profile_readbacks:5,private_file_readbacks:files,ownership_denial:true,wrong_role_denials:2,revision_428_409:true,profile_save_restore:true,pdf};
}
module.exports={verifyDevelopmentAccounts};
