const test = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { EventEmitter } = require("node:events");
const { inflateSync } = require("node:zlib");
const { Sequelize } = require("sequelize");
const prep = require("./accountPreparation");
const { studentFixtures } = require("./accountPreparation.data");
const { fixturePdf, fixtureAssets } = require("./accountPreparation.fixtures");
const { createUnifiedAuthService } = require("../services/unifiedAuth.service");
const { main, readPassword } = require("./prepareAccounts");
const target = { environment: "test", host: "127.0.0.1", port: 5432, database: "fitm_fixture_20261017_abcd", user: "fixture_operator" };
const secret = () => randomBytes(24).toString("base64url");
function isolated() {
  const sequelize = new Sequelize(target.database, target.user, secret(), { host: target.host, port: target.port, dialect: "postgres", logging: false });
  // Any accidental connection fails. All SQL/persistence below is explicitly substituted.
  sequelize.connectionManager.getConnection = async () => { throw Error("FORBIDDEN_REAL_CONNECTION"); };
  const models = prep.defineModels(sequelize), rows = {}, queries = [];
  for (const [name, Model] of Object.entries(models)) if (name !== "sequelize") {
    rows[name] = [];
    Model.create = async (values, options) => { assert.ok(options.transaction);const row = Model.build(values);await row.validate(options);rows[name].push(row);return row; };
    Model.count = async () => 0;
    Model.findOne = async () => null;
  }
  let live = { db: target.database, schema: "public", disposable: "on", version: 160015, recovery: false }, commits = 0, rollbacks = 0;
  sequelize.query = async sql => { queries.push(sql); return [sql.startsWith("SELECT") ? [live] : []]; };
  sequelize.transaction = async callback => {
    const lengths = Object.fromEntries(Object.entries(rows).map(([key, values]) => [key, values.length]));
    try { const value = await callback({ LOCK: { UPDATE: "UPDATE" } });commits++;return value; }
    catch (error) { for (const key of Object.keys(rows)) rows[key].length = lengths[key];rollbacks++;throw error; }
  };
  return { models, rows, queries, setLive: value => { live = { ...live, ...value }; }, get commits(){return commits;}, get rollbacks(){return rollbacks;}, close: () => sequelize.close() };
}
const run = (f, overrides = {}) => prep.provisionDisposable({ target, confirmation: target.database, approvalDigest: prep.digest(prep.buildPlan("disposable")), password: secret(), models: f.models, ...overrides });

test("rosters preserve 23 Thai teachers, one Head, 2 staff and pending candidates", () => {
  const { teachers, staff } = prep.inventory();
  assert.equal(teachers.length, 23);assert.equal(staff.length, 2);
  assert.deepEqual(teachers.filter(t => t.is_department_head).map(t => [t.first_name, t.last_name, t.role]), [["ขนิษฐา", "นามี", "department_head"]]);
  assert.equal(new Set(teachers.map(t => t.email_candidate)).size, 23);
  for (const person of [...teachers, ...staff]) {
    assert.equal(person.english_candidate.verified, false);assert.equal(person.email_verified, false);
    for (const field of ["first_name", "last_name"]) assert.match(person.english_candidate[field], /^[A-Z]+(?: [A-Z]+)*$/);
    assert.equal(person.department, null);
  }
  for (const person of staff) assert.equal(person.email, null);
  assert.equal(teachers[21].last_name, "ณ ศรีธะ");
});
test("default review creates zero rows; disposable plan is deterministic and synthetic", () => {
  assert.equal(prep.buildPlan().counts.teachers_to_create, 0);assert.equal(prep.buildPlan().counts.students_to_create, 0);
  const plan = prep.buildPlan("disposable");assert.equal(plan.counts.staff_to_create, 0);
  assert.equal(prep.digest(plan), prep.digest(prep.buildPlan("disposable")));
  assert.equal(plan.counts.training_to_create, 10);assert.equal(plan.counts.skills_to_create, 16);
  assert.ok(plan.teachers.every(t => t.values.email.endsWith("@example.test")));
  assert.ok(plan.students.every(s => s.alias_email.endsWith("@example.test")));
  assert.ok(plan.teachers.every(t => t.values.department === "FIXTURE_TEST_DEPARTMENT"));
  assert.equal(/password|password_hash|credential/.test(JSON.stringify(plan.teachers)), false);
  assert.throws(() => prep.buildPlan("production"), /UNSUPPORTED_MODE/);
});
test("authorized account columns are present without adding role or credential fields", async () => {
  const f = isolated();
  try {
    assert.ok(f.models.Teacher.rawAttributes.academic_title);assert.ok(f.models.Teacher.rawAttributes.is_department_head);
    for (const key of ["first_name_en", "last_name_en"]) assert.ok(f.models.Teacher.rawAttributes[key]);
    for (const key of ["first_name_en", "last_name_en", "position", "department"]) assert.ok(f.models.DepartmentStaff.rawAttributes[key]);
    assert.ok(f.models.StudentProfile.rawAttributes.english_first_name);
  } finally { await f.close(); }
});
test("Development plan preserves master list, creates five Website accounts and keeps Google simulation isolated", async () => {
  const {buildDevelopmentPlan,credentialsFor,assertDevelopmentTarget}=require("./developmentAccountPreparation");
  const p=buildDevelopmentPlan(),vault=credentialsFor(p,secret());
  assert.equal(p.teachers.length,23);assert.equal(p.staff.length,2);assert.equal(p.students.length,5);assert.equal(vault.accounts.length,30);
  assert.equal(p.teachers.filter(t=>t.values.is_department_head).length,1);assert.ok(p.staff.every(s=>s.values.email.endsWith("@example.test")));
  assert.equal(new Set(vault.accounts.filter(a=>a.type!=="teacher").map(a=>a.password)).size,7);
  assert.ok(p.students.every(s=>s.student.first_name&&s.student.last_name));assert.equal(studentFixtures()[4].student.first_name,null);
  assert.equal(p.students[2].aggregate.education.create[0].graduation_year,null);
  const f=isolated();try{
    for(const row of p.teachers)await f.models.Teacher.build({...row.values,password:secret()}).validate();
    for(const row of p.staff)await f.models.DepartmentStaff.build({...row.values,password:secret()}).validate();
    await assert.rejects(f.models.Teacher.build({...p.teachers[0].values,first_name_en:"lowercase",password:secret()}).validate());
    assert.throws(()=>assertDevelopmentTarget({NODE_ENV:"production",DB_NAME:"intern_system"},f.models.sequelize));
  }finally{await f.close();}
});
test("target guard rejects real databases, unset/prod environments, remote hosts and bad ports", () => {
  for (const change of [{environment:undefined},{environment:"development"},{environment:"production"},{host:"localhost"},{host:"10.0.0.1"},{database:"intern_system"},{database:"postgres"},{database:"fitm_fixture_"},{port:0},{port:NaN},{user:""}]) {
    assert.throws(() => prep.assertTarget({...target,...change}), /DISPOSABLE_TEST_TARGET_REQUIRED/);
  }
  prep.assertTarget(target);
});
test("missing approval, confirmation or runtime password stops before metadata queries", async () => {
  const f=isolated();try {
    for(const change of [{approvalDigest:"bad"},{confirmation:"intern_system"},{password:""},{password:"x".repeat(73)}]) await assert.rejects(run(f,change));
    assert.equal(f.queries.length,0);assert.equal(f.rows.Teacher.length,0);
  } finally {await f.close();}
});
test("connection options must match the approved target before transaction", async () => {
  const f=isolated();try {f.models.sequelize.config.database="intern_system";await assert.rejects(run(f),/CONNECTION_TARGET_MISMATCH/);assert.equal(f.queries.length,0);}finally{await f.close();}
});
test("live marker/database/schema/version/recovery guards prevent writes", async () => {
  for(const live of [{disposable:null},{db:"intern_system"},{schema:"private"},{version:150010},{recovery:true}]) {
    const f=isolated();try {f.setLive(live);await assert.rejects(run(f),/LIVE_DISPOSABLE_MARKER_REQUIRED/);assert.equal(f.rows.Teacher.length,0);assert.equal(f.rollbacks,1);}finally{await f.close();}
  }
});
test("duplicates in any actor store, student codes or teacher names abort whole plan", async () => {
  for(const [name, which] of [["Teacher",1],["DepartmentStaff",1],["Student",1],["Student",2],["Teacher",2]]) {
    const f=isolated();let n=0;f.models[name].count=async()=>++n===which?1:0;
    try {await assert.rejects(run(f),/EXISTING_/);assert.equal(f.rows.Teacher.length,0);assert.equal(f.commits,0);}finally{await f.close();}
  }
});
test("full mock transaction uses actual models/hooks/profile service and real test advisor IDs", async () => {
  const f=isolated(), password=secret();try {
    const result=await run(f,{password});assert.equal(result.committed,true);assert.equal(f.commits,1);
    assert.equal(f.rows.Teacher.length,23);assert.equal(f.rows.Student.length,5);assert.equal(f.rows.StudentProfile.length,5);
    assert.equal(f.rows.DepartmentStaff.length,0);assert.equal(result.google_identities_created,0);assert.equal(result.assets_written,0);
    assert.equal(f.rows.StudentAddress.length,4);assert.equal(f.rows.StudentEducationRecord.length,6);
    assert.equal(f.rows.StudentTrainingRecord.length,10);assert.equal(f.rows.StudentSkill.length,16);
    const ids=new Set(f.rows.Teacher.map(t=>t.id));
    for(const student of f.rows.Student){assert.ok(ids.has(student.advisor_teacher_id));assert.equal(student.coop_advisor_teacher_id,null);}
    assert.ok(await f.rows.Teacher[0].comparePassword(password));assert.ok(await f.rows.Student[0].comparePassword(password));
    assert.equal(f.rows.Student[4].password_hash,null);assert.equal(f.rows.Student[4].first_name,null);assert.equal(await f.rows.Student[4].comparePassword(password),false);
    assert.equal(f.rows.Student[0].toJSON().password_hash,undefined);assert.equal(f.rows.Teacher[0].toJSON().password,undefined);
    assert.ok(f.queries.some(sql=>sql.startsWith("LOCK TABLE")));
    assert.equal(f.queries.some(sql=>/sync|truncate|delete|update|drop|create database/i.test(sql)),false);
  }finally{await f.close();}
});
test("injected profile failure rolls back the entire fake store and sanitizes database errors", async () => {
  const f=isolated();let n=0;const create=f.models.StudentProfile.create;
  f.models.StudentProfile.create=async(...args)=>{if(++n===3)throw Error("SENSITIVE_DATABASE_DETAIL");return create(...args);};
  try{await assert.rejects(run(f),error=>error.code==="PROVISIONING_FAILED_OR_COMMIT_UNKNOWN_REVIEW_BEFORE_RETRY"&&!error.message.includes("SENSITIVE"));assert.equal(f.rollbacks,1);assert.equal(f.commits,0);assert.equal(Object.values(f.rows).reduce((n,r)=>n+r.length,0),0);}finally{await f.close();}
});
test("unique race error is sanitized and fake transaction rolls back", async () => {
  const f=isolated();f.models.Student.create=async()=>{throw Object.assign(Error("SENSITIVE"),{name:"SequelizeUniqueConstraintError"});};
  try{await assert.rejects(run(f),/EXISTING_ACCOUNT_CONFLICT/);assert.equal(f.rows.Teacher.length,0);}finally{await f.close();}
});
test("university email validation remains active; Staff validation and bcrypt hooks work", async () => {
  const f=isolated(),password=secret();try {
    await assert.rejects(f.models.Student.build({...studentFixtures()[0].student,email:"student01@example.test",password}).validate());
    await assert.rejects(f.models.DepartmentStaff.build({first_name:"เจ้าหน้าที่",last_name:"สมมติ",password}).validate());
    const staff=f.models.DepartmentStaff.build({first_name:"เจ้าหน้าที่",last_name:"สมมติ",email:"staff-fixture@example.test",password,is_active:true});
    await staff.validate();assert.ok(await staff.comparePassword(password));assert.equal(staff.toJSON().password,undefined);assert.equal(staff.toJSON().password_hash,undefined);
  }finally{await f.close();}
});
test("Unified Login resolves model-backed Teacher/Head/Staff/Student roles without issuing JWT", async () => {
  const f=isolated(),password=secret();try {
    for(const [name,values,type,role] of [
      ["Teacher",{first_name:"สมมติ",last_name:"ทดสอบ",status:"active",department:"FIXTURE",is_department_head:true},"teacher","department_head"],
      ["Teacher",{first_name:"สมมติ",last_name:"ทดสอบ",status:"active"},"teacher","teacher"],
      ["DepartmentStaff",{first_name:"สมมติ",last_name:"ทดสอบ",is_active:true},"department_staff","department_staff"],
      ["Student",studentFixtures()[0].student,"student","student"]]) {
      const actor=f.models[name].build({...values,email:name==="Student"?studentFixtures()[0].student.email:"role-fixture@example.test",password});await actor.validate();
      for(const key of ["Teacher","DepartmentStaff","Student"])f.models[key].findAll=async()=>key===name?[actor]:[];
      const resolved=await createUnifiedAuthService({models:f.models}).resolveCredentials({email:actor.email,password});assert.equal(resolved.type,type);assert.equal(resolved.role,role);
    }
  }finally{await f.close();}
});
test("five scenario shapes cover majors/tracks, partial data, five trainings and four skill levels", () => {
  const fixtures=studentFixtures();assert.equal(fixtures.length,5);
  assert.deepEqual(new Set(fixtures.map(s=>s.student.major)),new Set(["IT","INE"]));assert.deepEqual(new Set(fixtures.map(s=>s.student.track)),new Set(["co_op","internship"]));
  assert.equal(fixtures[1].aggregate.training.create.length,0);assert.equal(fixtures[0].aggregate.training.create.length,5);
  assert.deepEqual(new Set(fixtures[2].aggregate.skills.create.map(s=>s.proficiency)),new Set(["very_good","good","moderate","fair"]));
  assert.equal(fixtures[3].scenario,"pdf_import");assert.equal(fixtures[4].scenario,"google_only_simulation");
});
test("safe fixture bytes include PNG and four-page AcroForm with valid xref offsets", () => {
  const assets=fixtureAssets();assert.equal(assets.length,5);assert.equal(assets[0].bytes.subarray(1,4).toString(),"PNG");
  const png=assets[0].bytes;
  function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
  for(let offset=8;offset<png.length;){const size=png.readUInt32BE(offset),type=png.subarray(offset+4,offset+8).toString();assert.equal(crc(png.subarray(offset+4,offset+8+size)),png.readUInt32BE(offset+8+size));if(type==="IDAT")assert.equal(inflateSync(png.subarray(offset+8,offset+8+size)).length,4);offset+=size+12;}
  const pdf=fixturePdf(),text=pdf.toString();assert.ok(text.startsWith("%PDF-1.4"));assert.equal((text.match(/\/Type \/Page /g)||[]).length,4);
  assert.ok(text.includes("/T (identity.student_id) /V (9900000000004)"));assert.ok(text.includes("Student personal information"));assert.ok(text.includes("Education Background"));
  const xref=Number(/startxref\n(\d+)/.exec(text)[1]);assert.equal(pdf.subarray(xref,xref+4).toString(),"xref");
  const entries=text.slice(xref).split("\n").slice(3).filter(line=>/^\d{10} 00000 n/.test(line));
  entries.forEach((entry,index)=>assert.ok(pdf.subarray(Number(entry.slice(0,10))).toString().startsWith(`${index+1} 0 obj`)));
  assert.throws(()=>fixturePdf("real-student"),/FIXTURE_ID_REQUIRED/);
  assert.ok(fixtureAssets("9900000000001")[1].bytes.includes(Buffer.from("/V (9900000000001)")));
});
test("secure TTY input does not echo, preserves split UTF-8, and restores terminal on enter/cancel/EOF", async () => {
  function terminal(){const input=new EventEmitter();input.isTTY=true;input.isRaw=false;input.setRawMode=value=>{input.isRaw=value;};input.resume=()=>{};input.pause=()=>{};let printed="";return {input,output:{write:value=>{printed+=value;}},printed:()=>printed};}
  const t=terminal(),password=secret()+"ก";const bytes=Buffer.from(password),result=readPassword(t.input,t.output);
  t.input.emit("data",bytes.subarray(0,-1));t.input.emit("data",bytes.subarray(-1));t.input.emit("data",Buffer.from("\r"));
  assert.equal((await result)===password,true);assert.equal(t.printed().includes(password),false);assert.equal(t.input.isRaw,false);assert.equal(t.input.listenerCount("data"),0);
  for(const action of ["cancel","end"]){const f=terminal(),pending=readPassword(f.input,f.output);if(action==="cancel")f.input.emit("data",Buffer.from("\u0003"));else f.input.emit("end");await assert.rejects(pending,/PASSWORD_INPUT_CANCELLED/);assert.equal(f.input.isRaw,false);}
});
test("CLI default is offline preview; strict args and piped passwords rejected", async () => {
  const before=console.log,output=[];console.log=value=>output.push(value);
  try {await main([]);const result=JSON.parse(output[0]);assert.equal(result.mode,"dry_run_no_database_connection");assert.equal(result.counts.teachers_to_create,0);
    await assert.rejects(main(["--apply"]),/INVALID_ARGUMENTS/);await assert.rejects(main(["--inventory","--inventory"]),/INVALID_ARGUMENTS/);
  }finally{console.log=before;}
  await assert.rejects(readPassword({isTTY:false}),/INTERACTIVE_PRIVATE_TTY_REQUIRED/);
});
