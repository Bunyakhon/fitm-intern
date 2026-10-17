const fs = require("node:fs");
const path = require("node:path");
const { randomUUID, randomBytes } = require("node:crypto");
const { inventory, buildPlan, PreparationError, digest } = require("./accountPreparation");
const { createStudentProfileAggregateService } = require("../services/studentProfileAggregate.service");
const error = code => { throw new PreparationError(code); };
function buildDevelopmentPlan() {
  const master = inventory(), base = buildPlan("disposable");
  const department = "เทคโนโลยีสารสนเทศ";
  const teachers = master.teachers.map(t => ({ key: t.key, values: {
    academic_title: t.academic_title, first_name: t.first_name, last_name: t.last_name,
    first_name_en: t.english_candidate.first_name, last_name_en: t.english_candidate.last_name,
    email: t.email_candidate, department, major: null, position: t.position, status: "active", is_department_head: t.is_department_head,
  } }));
  const staff = master.staff.map((s,i) => ({ key: s.key, values: { first_name: s.first_name, last_name: s.last_name,
    first_name_en: s.english_candidate.first_name, last_name_en: s.english_candidate.last_name,
    email: `fitm.staff${i + 1}@example.test`, position: s.position, department, is_active: true } }));
  const names = [["กิตติพงศ์","วงศ์สมมติ","KITTIPHONG","WONGSOMMUT"],["ณัฐธิดา","แสงสมมติ","NATTHIDA","SAENGSOMMUT"],
    ["ธนกฤต","ศรีสมมติ","THANAKRIT","SRISOMMUT"],["พิมพ์ชนก","อินทร์สมมติ","PIMCHANOK","INSOMMUT"],["ศิรินภา","ใจสมมติ","SIRINAPHA","CHAISOMMUT"]];
  const students = base.students.map((s,i) => {
    const [first_name,last_name,english_first_name,english_last_name]=names[i];
    s.student={...s.student,first_name,last_name,department,faculty:"คณะเทคโนโลยีและการจัดการอุตสาหกรรม",last_semester_gpa:i===1?null:"3.40"};
    s.aggregate.profile={...s.aggregate.profile,english_first_name,english_last_name};
    if(i===4) s.scenario="website_separate_from_google_only_simulation";
    if(i===0||i===2) {
      Object.assign(s.aggregate.profile,{birth_date:i===0?"2005-04-18":"2005-06-04",nationality:"ไทย",ethnicity:"ไทย",religion:"ไม่ระบุ (สมมติ)",
        father_name:i===0?"สมภพ วงศ์สมมติ":"สมชาย ศรีสมมติ",mother_name:i===0?"พรทิพย์ วงศ์สมมติ":"ดวงใจ ศรีสมมติ",
        emergency_contact_name:i===0?"สมภพ วงศ์สมมติ":"สมชาย ศรีสมมติ",emergency_contact_relation:"บิดา"});
      s.aggregate.education.create.forEach((row,j)=>Object.assign(row,{institution_name:j===0?"มหาวิทยาลัยจำลองเพื่อทดสอบ":"วิทยาลัยจำลองเพื่อทดสอบ",
        qualification:["วิทยาศาสตรบัณฑิต (กำลังศึกษา)","ประกาศนียบัตรวิชาชีพชั้นสูง","ประกาศนียบัตรวิชาชีพ"][j],graduation_year:j===0?null:j===1?2024:2022}));
      const skills=["JavaScript","Python","SQL","Spreadsheet","อังกฤษ","ญี่ปุ่น","จีน","เกาหลี"];
      s.aggregate.skills.create.forEach((row,j)=>{row.skill_name=skills[j];});
      s.aggregate.training.create.forEach((row,j)=>{row.course_name=["พัฒนาเว็บเบื้องต้น","ฐานข้อมูล SQL","เครือข่ายคอมพิวเตอร์","ทักษะการนำเสนอ","การทำงานร่วมกัน"][j];row.period_text=`${["มีนาคม","เมษายน","มิถุนายน","กันยายน","ธันวาคม"][j]} ${2024+(j>2?1:0)}`;});
    }
    return s;
  });
  return {version:1,mode:"authorized_local_development",teachers,staff,students,pending_verification:"All personnel English/email candidates and department are Development proposals, not official identities"};
}
function credentialsFor(plan, teacherPassword) {
  if(typeof teacherPassword!=="string"||teacherPassword.length<8||Buffer.byteLength(teacherPassword)>72)error("RUNTIME_TEACHER_PASSWORD_REQUIRED");
  return {version:1,plan_digest:digest(plan),created_at:new Date().toISOString(),accounts:[
    ...plan.teachers.map(t=>({key:t.key,type:"teacher",id:randomUUID(),email:t.values.email,password:teacherPassword})),
    ...plan.staff.map(s=>({key:s.key,type:"department_staff",id:randomUUID(),email:s.values.email,password:randomBytes(24).toString("base64url")})),
    ...plan.students.map(s=>({key:s.key,type:"student",id:randomUUID(),email:s.student.email,password:randomBytes(24).toString("base64url")}))]};
}
function assertDevelopmentTarget(env, sequelize) {
  if(env.NODE_ENV!=="development"||env.DB_NAME!=="intern_system"||sequelize.config.database!=="intern_system"
    ||sequelize.config.host!=="127.0.0.1"||Number(sequelize.config.port)!==5432)error("VERIFIED_LOCAL_DEVELOPMENT_REQUIRED");
}
async function liveGuard(sequelize, transaction) {
  const [rows]=await sequelize.query("SELECT current_database() AS db, current_schema() AS schema, current_setting('server_version_num')::int AS version, pg_is_in_recovery() AS recovery, inet_server_addr()::text AS address",{transaction});
  const row=rows[0];if(row?.db!=="intern_system"||row.schema!=="public"||Math.floor(row.version/10000)!==16||row.recovery!==false||! /^(127\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|10\.)/.test(row.address||""))error("LIVE_DEVELOPMENT_TARGET_MISMATCH");
  return {database:row.db,schema:row.schema,version:row.version};
}
async function provisionDevelopment({env,models,vault}) {
  const sequelize=models.sequelize,plan=buildDevelopmentPlan();assertDevelopmentTarget(env,sequelize);
  if(vault.plan_digest!==digest(plan)||vault.accounts.length!==30)error("APPROVED_PLAN_VAULT_MISMATCH");
  const byKey=new Map(vault.accounts.map(a=>[a.key,a]));
  try{return await sequelize.transaction(async transaction=>{
    const target=await liveGuard(sequelize,transaction);
    await sequelize.query("SET LOCAL lock_timeout='5s'",{transaction});await sequelize.query("SET LOCAL statement_timeout='30s'",{transaction});
    await sequelize.query("LOCK TABLE public.teachers,public.department_staffs,public.students,public.student_profiles,public.student_addresses,public.student_education_records,public.student_training_records,public.student_skills IN SHARE ROW EXCLUSIVE MODE",{transaction});
    const {Op}=require("sequelize");const emails=vault.accounts.map(a=>a.email);
    const found=[];
    for(const [type,Model]of [["teacher",models.Teacher],["department_staff",models.DepartmentStaff],["student",models.Student]]){
      const rows=await Model.findAll({where:{email:{[Op.in]:emails}},attributes:["id","email"],transaction});found.push(...rows.map(row=>({id:row.id,email:row.email,type})));
    }
    if(found.length){
      if(found.length!==30||!found.every(row=>vault.accounts.some(a=>a.id===row.id&&a.email===row.email&&a.type===row.type)))error("EXISTING_ACCOUNT_CONFLICT_NO_OVERWRITE");
      return {target,already_provisioned:true,created:{teachers:0,staff:0,students:0}};
    }
    if(await models.Teacher.count({where:{[Op.or]:plan.teachers.map(t=>({first_name:t.values.first_name,last_name:t.values.last_name}))},transaction})
      ||await models.Teacher.count({where:{is_department_head:true},transaction})
      ||await models.DepartmentStaff.count({where:{[Op.or]:plan.staff.map(s=>({first_name:s.values.first_name,last_name:s.values.last_name}))},transaction})
      ||await models.Student.count({where:{student_id:{[Op.in]:plan.students.map(s=>s.student.student_id)}},transaction}))error("EXISTING_NAME_CODE_OR_HEAD_CONFLICT");
    const [constraintsBefore]=await sequelize.query("SELECT oid,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY oid",{transaction});
    await sequelize.query("SET LOCAL fitm.authorized_dev_account_seed='on'",{transaction});
    await sequelize.query(fs.readFileSync(path.join(__dirname,"../db/developmentAccountColumns.sql"),"utf8"),{transaction});
    const [columns]=await sequelize.query("SELECT table_name,column_name,data_type,is_nullable,character_maximum_length FROM information_schema.columns WHERE table_schema='public' AND ((table_name='teachers' AND column_name IN ('first_name_en','last_name_en')) OR (table_name='department_staffs' AND column_name IN ('first_name_en','last_name_en','position','department')))",{transaction});
    if(columns.length!==6||columns.some(c=>c.data_type!=="character varying"||c.is_nullable!=="YES"||c.character_maximum_length!==255))error("ACCOUNT_COLUMN_SCHEMA_MISMATCH");
    const teacherIds=new Map();
    for(const t of plan.teachers){const a=byKey.get(t.key);const row=await models.Teacher.create({...t.values,id:a.id,password:a.password},{transaction});teacherIds.set(t.key,row.id);}
    for(const s of plan.staff){const a=byKey.get(s.key);await models.DepartmentStaff.create({...s.values,id:a.id,password:a.password},{transaction});}
    const service=createStudentProfileAggregateService(models);
    for(const s of plan.students){const a=byKey.get(s.key);const student=await models.Student.create({...s.student,id:a.id,password:a.password,advisor_teacher_id:teacherIds.get(s.advisor_key),coop_advisor_teacher_id:null},{transaction});
      await service.applyAggregate({student,transaction,before:{student:student.get({plain:true}),profile:null}},service.prepareAggregate(s.aggregate));}
    const [constraintsAfter]=await sequelize.query("SELECT oid,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY oid",{transaction});
    if(JSON.stringify(constraintsBefore)!==JSON.stringify(constraintsAfter))error("UNEXPECTED_CONSTRAINT_CHANGE");
    return {target,created:{teachers:23,head:1,staff:2,students:5},added_columns:6,constraints_preserved:constraintsAfter.length};
  });}catch(e){if(e instanceof PreparationError)throw e;error(e.name==="SequelizeUniqueConstraintError"?"EXISTING_ACCOUNT_CONFLICT_NO_OVERWRITE":"DEVELOPMENT_PROVISION_FAILED_OR_COMMIT_UNKNOWN");}
}
module.exports={buildDevelopmentPlan,credentialsFor,assertDevelopmentTarget,liveGuard,provisionDevelopment};
