// Explicit user-authorized Development runner; default remains an offline preview.
const fs=require("node:fs"),path=require("node:path");
const {buildDevelopmentPlan,credentialsFor,assertDevelopmentTarget,provisionDevelopment}=require("./developmentAccountPreparation");
const {defineModels,digest,PreparationError}=require("./accountPreparation");
const vaultPath=path.resolve(__dirname,"../../../.local-dev-accounts/intern-system-development.bin");
async function privateInput(){if(process.stdin.isTTY)throw new PreparationError("PRIVATE_PIPE_REQUIRED");let value="";for await(const chunk of process.stdin)value+=chunk.toString("utf8");return value;}
async function request(url,{token,body,method="GET",revision}={}){
  const headers={...(token?{Authorization:`Bearer ${token}`}:{"Content-Type":"application/json"}),...(revision?{"If-Match":revision}:{})};
  if(body&&!(body instanceof FormData))headers["Content-Type"]="application/json";
  const response=await fetch(`http://127.0.0.1:5000${url}`,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
  const data=await response.json();if(!response.ok)throw new PreparationError(`LOCAL_API_${response.status}`);return data;
}
async function verifyAndFixtures(vault,{fixtures=false}={}){
  const plan=buildDevelopmentPlan();let logins=0,reads=0,uploads=0;
  const selected=vault.accounts.filter(a=>a.type!=="teacher"||["teacher-01","teacher-02"].includes(a.key));
  const {fixtureAssets}=require("./accountPreparation.fixtures");
  for(const account of selected){
    const login=await request("/api/auth/unified-login",{method:"POST",body:{email:account.email,password:account.password}});logins++;
    const role=account.key==="teacher-01"?"department_head":account.type;
    if(login.role!==role||!login.token)throw new PreparationError("LIVE_LOGIN_ROLE_MISMATCH");
    const token=login.token;
    if(account.type!=="student"){
      const url=account.type==="department_staff"?"/api/staff/me":account.key==="teacher-01"?"/api/department-head/me":"/api/teachers/me";
      const response=await request(url,{token});const row=response.data;
      if(row?.id!==account.id||!row.first_name_en||!row.last_name_en||row.password_hash||row.password)throw new PreparationError("CURRENT_ACCOUNT_SERIALIZER_MISMATCH");reads++;continue;
    }
    const student=plan.students.find(s=>s.key===account.key);let snapshot=await request("/api/student-profile/aggregate",{token});
    if(snapshot.student.id!==account.id||snapshot.profile.english_first_name!==student.aggregate.profile.english_first_name)throw new PreparationError("OWNER_PROFILE_READBACK_MISMATCH");reads++;
    if(fixtures&&account.key!=="student-2"){
      const assets=fixtureAssets(student.student.student_id);
      if(!snapshot.student.profile_image){const form=new FormData();form.append("profile_image",new Blob([assets[0].bytes],{type:"image/png"}),"avatar.png");await request("/api/student-profile/profile-image",{token,method:"POST",body:form,revision:snapshot.profile_revision});uploads++;snapshot=await request("/api/student-profile/aggregate",{token});}
      const types=account.key==="student-1"||account.key==="student-3"?["transcript","national_id_copy","student_id_copy","supporting_other","external_profile_pdf"]:["external_profile_pdf"];
      for(const type of types){if(snapshot.documents.some(d=>d.file_type===type))continue;const form=new FormData();form.append("document",new Blob([assets[1].bytes],{type:"application/pdf"}),`${type}-TEST-ONLY.pdf`);form.append("document_label","ข้อมูลสังเคราะห์เพื่อทดสอบ ไม่ใช่เอกสารทางการ");
        await request(`/api/student-profile/documents/${type}`,{token,method:"POST",body:form,revision:snapshot.profile_revision});uploads++;snapshot=await request("/api/student-profile/aggregate",{token});}
    }
  }
  return {http_logins:logins,current_account_reads:reads,private_uploads:uploads,real_provider_calls:0};
}
async function main(args=process.argv.slice(2)){
  if(new Set(args).size!==args.length||args.some(a=>!["--apply","--confirm=intern_system","--verify","--fixtures","--prepare-vault","--vault-stdin","--verify-database","--pdf-test"].includes(a)))throw new PreparationError("INVALID_ARGUMENTS");
  if(args.includes("--prepare-vault")){
    if(process.stdout.isTTY||args.length!==1)throw new PreparationError("INTERNAL_PRIVATE_PIPE_REQUIRED");
    const password=(await privateInput()).replace(/\r?\n$/,"");process.stdout.write(JSON.stringify(credentialsFor(buildDevelopmentPlan(),password)));return;
  }
  const mode=args.includes("--apply")?"authorized_development_apply":args.includes("--fixtures")?"authorized_development_fixture_upload":args.includes("--verify-database")?"authorized_development_save_restore_verification":args.includes("--verify")?"development_login_read_verification":"dry_run_no_connection";
  const plan=buildDevelopmentPlan();console.log(JSON.stringify({mode,digest:digest(plan),teachers:23,head:1,staff:2,students:5}));
  if(!args.includes("--apply")&&!args.includes("--verify")&&!args.includes("--verify-database")&&!args.includes("--fixtures"))return;
  if(!args.includes("--confirm=intern_system"))throw new PreparationError("EXPLICIT_DEVELOPMENT_CONFIRMATION_REQUIRED");
  const env=require("dotenv").parse(fs.readFileSync(path.join(__dirname,"../../.env")));
  const {Sequelize}=require("sequelize"),sequelize=new Sequelize(env.DB_NAME,env.DB_USER,env.DB_PASSWORD,{host:"127.0.0.1",port:5432,dialect:"postgres",logging:false,dialectOptions:{application_name:"fitm_authorized_development_accounts"},pool:{max:1,min:0,acquire:10000}});
  assertDevelopmentTarget(env,sequelize);
  try{
    if(!args.includes("--vault-stdin"))throw new PreparationError("USE_PRIVATE_POWERSHELL_DEVELOPMENT_RUNNER");
    const vault=JSON.parse(await privateInput());
    if(args.includes("--apply"))console.log(JSON.stringify(await provisionDevelopment({env,models:defineModels(sequelize),vault})));
    if(args.includes("--verify")||args.includes("--fixtures"))console.log(JSON.stringify(await verifyAndFixtures(vault,{fixtures:args.includes("--fixtures")})));
    if(args.includes("--verify-database"))console.log(JSON.stringify(await require("./verifyDevelopmentAccounts").verifyDevelopmentAccounts({models:defineModels(sequelize),env,vault,pdfTest:args.includes("--pdf-test")})));
  }finally{await sequelize.close();}
}
if(require.main===module)main().catch(e=>{console.error(e instanceof PreparationError?e.code:"DEVELOPMENT_PREPARATION_FAILED_NO_SENSITIVE_DETAILS");process.exitCode=1;});
module.exports={main,verifyAndFixtures,vaultPath};
