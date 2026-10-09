const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto'), fs = require('node:fs'), path = require('node:path');
const { Sequelize } = require('sequelize'), { Umzug, SequelizeStorage } = require('umzug'), express = require('express'), jwt = require('jsonwebtoken');
test('Activity calendar: disposable PostgreSQL and production HTTP', { skip: !process.env.COOP_ACTIVITIES_DISPOSABLE_DATABASE_URL }, async t => {
  const db = new Sequelize(process.env.COOP_ACTIVITIES_DISPOSABLE_DATABASE_URL,{ logging:false,pool:{ max:8 } }); let server;
  try {
    const [[guard]] = await db.query("SELECT current_database() AS db,current_setting('fitm.a021_disposable',true) AS marker"); assert.equal(guard.db,'fitm_activities_test'); assert.equal(guard.marker,'on');
    const m = { sequelize:db }; for (const file of fs.readdirSync(path.join(__dirname,'../src/models')).filter(f=>f.endsWith('.model.js'))) { const model = require(`../src/models/${file}`)(db); m[model.name]=model; } for (const model of Object.values(m)) model.associate?.(m);
    const umzug = new Umzug({ migrations:{ glob:['*.js',{ cwd:path.join(__dirname,'../src/db/migrations') }] },context:db.getQueryInterface(),storage:new SequelizeStorage({ sequelize:db,tableName:'sequelize_meta' }),logger:undefined });
    await umzug.up({ to:'020_add_supervision_results.js' }); const migration = require('../src/db/migrations/021_add_coop_activities'), service = require('../src/services/coopActivity.service').createCoopActivityService(m);
    await t.test('021 absent schema, transactional DDL failure and empty up/down/reapply',async()=>{
      await assert.rejects(service.list(),e=>e.status===503);
      await migration.up({ context:db.getQueryInterface() }); await migration.down({ context:db.getQueryInterface() });
      const query=db.query; db.query=function(sql,options){ return query.call(this,typeof sql==='string'&&sql.includes('CREATE TABLE coop_activities')?sql+' SELECT missing_021_function();':sql,options); };
      try { await assert.rejects(migration.up({ context:db.getQueryInterface() }),/missing_021_function/); } finally { db.query=query; }
      assert.equal((await db.query("SELECT to_regclass('coop_activities') AS name"))[0][0].name,null); await umzug.up(); assert.equal((await umzug.executed()).length,22);
    });
    const run=crypto.randomUUID(), password=crypto.randomBytes(24).toString('hex');
    const staff=await m.DepartmentStaff.create({ first_name:'Calendar',last_name:'Staff',email:`${run}@fixture.invalid`,password });
    const other=await m.DepartmentStaff.create({ first_name:'Other',last_name:'Staff',email:`other-${run}@fixture.invalid`,password });
    const student=await m.Student.create({ student_id:`calendar-${run}`,first_name:'Calendar',last_name:'Student',email:`${run}@email.kmutnb.ac.th`,password,major:'IT',track:'co_op' });
    const teacher=await m.Teacher.create({ first_name:'Teacher',last_name:'Fixture' });
    const token=row=>jwt.sign(row===student?{ id:row.id,student_id:row.student_id,actor_type:'student',role:'student' }:row===teacher?{ id:row.id,teacher_id:row.id,actor_type:'teacher',role:'teacher' }:{ id:row.id,staff_id:row.id,actor_type:'department_staff',role:'department_staff' },process.env.JWT_SECRET,{ expiresIn:'10m' });
    const app=express(); app.use(express.json()); app.use('/api/coop-activities',require('../src/routes/coopActivities.routes').createCoopActivitiesRouter({ models:m })); server=app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.on('listening',resolve)); const base=`http://127.0.0.1:${server.address().port}/api/coop-activities`;
    const call=async(url,method='GET',body,auth=token(staff))=>{ const response=await fetch(base+url,{ method,headers:{ ...(auth&&{Authorization:`Bearer ${auth}`}),...(body!==undefined&&{'Content-Type':'application/json'}) },...(body!==undefined&&{body:JSON.stringify(body)}) }); return { status:response.status,body:await response.json() }; };
    const input={ title:'Orientation',description:'Published description',category:'orientation',starts_at:'2026-11-01T09:00+07:00',ends_at:'2026-11-01T12:00+07:00',location:'Room A',meeting_url:'https://example.invalid/meeting',internal_notes:'Private staff note',status:'draft',creation_key:crypto.randomUUID() };
    let id;
    const changed=(row,overrides={})=>{ const {creation_key,...values}=input; return {...values,version:row.version,reason:'Staff correction',...overrides}; };
    await t.test('Staff create + authenticated actor + initial immutable snapshot',async()=>{
      const result=await call('/staff','POST',input); assert.equal(result.status,201); id=result.body.activity.id; assert.equal(result.body.activity.created_by,staff.id); assert.equal(result.body.activity.starts_at,'2026-11-01T02:00:00.000Z');
      const event=await m.CoopActivityHistory.findOne(); assert.equal(event.version,1); assert.equal(event.actor_name,'Calendar Staff'); assert.equal(event.snapshot.internal_notes,input.internal_notes);
    });
    await t.test('Unauthenticated, Teacher, forged actor, inactive Staff and Student mutations forbidden',async()=>{
      assert.equal((await call('/staff','GET',undefined,null)).status,401);
      for(const row of [teacher,student]) { assert.equal((await call('/staff','GET',undefined,token(row))).status,403); assert.equal((await call('/staff','POST',input,token(row))).status,403); assert.equal((await call(`/staff/${id}`,'PUT',changed({version:1}),token(row))).status,403); assert.equal((await call(`/staff/${id}/cancel`,'POST',{version:1,reason:'Attempt'},token(row))).status,403); }
      const forged=jwt.sign({id:staff.id,staff_id:other.id,actor_type:'department_staff',role:'department_staff'},process.env.JWT_SECRET); assert.equal((await call('/staff','GET',undefined,forged)).status,403);
      await other.update({is_active:false}); assert.equal((await call('/staff','GET',undefined,token(other))).status,403); await other.update({is_active:true});
      assert.equal((await call('/student','GET',undefined,token(staff))).status,403);
      const missing=jwt.sign({id:crypto.randomUUID(),student_id:'removed',role:'student'},process.env.JWT_SECRET); assert.equal((await call('/student','GET',undefined,missing)).status,403);
    });
    await t.test('Drafts and canceled never-published drafts stay invisible; no internal notes or history',async()=>{
      assert.equal((await call('/student','GET',undefined,token(student))).body.total,0); assert.equal((await call(`/student/${id}`,'GET',undefined,token(student))).status,404);
      const draft=await call('/staff','POST',{...input,title:'Canceled draft',creation_key:crypto.randomUUID()}); await call(`/staff/${draft.body.activity.id}/cancel`,'POST',{version:1,reason:'Draft abandoned'});
      assert.equal((await call(`/student/${draft.body.activity.id}`,'GET',undefined,token(student))).status,404);
    });
    await t.test('Invalid calendar dates, times, ranges, URL schemes and actor injection reject',async()=>{
      for(const patch of [{starts_at:'2026-02-30T09:00+07:00'},{starts_at:'2026-11-01T25:00+07:00'},{starts_at:'2026-11-01T09:00Z'},{ends_at:input.starts_at},{meeting_url:'javascript:alert(1)'},{meeting_url:'https://user:pass@example.invalid'},{created_by:other.id},{title:' '},{status:'canceled'},{category:'grading'}]) assert.equal((await call('/staff','POST',{...input,...patch,creation_key:crypto.randomUUID()})).status,400);
      assert.equal((await call(`/staff/${id}`,'PUT',changed({version:1},{reason:''}))).status,400);
    });
    await t.test('Creation replay, concurrent same key, mismatched retry and duplicate across Staff',async()=>{
      const replay=await call('/staff','POST',input); assert.equal(replay.status,200); assert.equal(replay.body.activity.id,id);
      assert.equal((await call('/staff','POST',{...input,title:'Changed retry'})).status,409);
      assert.equal((await call('/staff','POST',input,token(other))).status,409);
      const same={...input,title:'Concurrent creation',creation_key:crypto.randomUUID()}; const result=await Promise.all([call('/staff','POST',same),call('/staff','POST',same)]); assert.deepEqual(result.map(r=>r.status).sort(),[200,201]); assert.equal(result[0].body.activity.id,result[1].body.activity.id);
      const duplicate={...input,title:'  ORIENTATION  ',creation_key:crypto.randomUUID()}; assert.equal((await call('/staff','POST',duplicate,token(other))).body.code,'DUPLICATE_ACTIVITY');
      const race={...input,title:'Duplicate race'}; const raced=await Promise.all([call('/staff','POST',{...race,creation_key:crypto.randomUUID()}),call('/staff','POST',{...race,creation_key:crypto.randomUUID()},token(other))]); assert.deepEqual(raced.map(r=>r.status).sort(),[201,409]);
    });
    await t.test('Publish, Student read-only projection and private search protection',async()=>{
      const result=await call(`/staff/${id}`,'PUT',changed({version:1},{status:'published'})); assert.equal(result.status,200);
      const studentResult=(await call(`/student/${id}`,'GET',undefined,token(student))).body; assert.equal(studentResult.activity.status,'published'); assert.equal(studentResult.activity.internal_notes,undefined); assert.equal(studentResult.history,undefined); assert.equal(studentResult.activity.created_by,undefined); assert.equal(studentResult.activity.creation_key,undefined);
      assert.equal((await call('/student?search=Private%20staff%20note','GET',undefined,token(student))).body.total,0); assert.equal((await call('/student?status=draft','GET',undefined,token(student))).status,400);
      assert.equal((await call(`/staff/${id}`,'PUT',changed({version:2},{status:'draft'}))).status,409);
    });
    await t.test('Search/category/status overlap date ranges, stable chronological pagination and Bangkok midnight',async()=>{
      assert.equal((await call('/staff?search=orientation&category=orientation&status=published')).body.total,1);
      assert.equal((await call('/staff?search=notfound')).body.total,0); assert.equal((await call('/staff?search=%25')).body.total,0);
      const cross=await call('/staff','POST',{...input,title:'Across Bangkok midnight',starts_at:'2026-10-31T23:30+07:00',ends_at:'2026-11-01T01:00+07:00',status:'published',creation_key:crypto.randomUUID()}); assert.equal(cross.status,201);
      const query=new URLSearchParams({from:'2026-11-01T00:00+07:00',to:'2026-12-01T00:00+07:00',status:'published',limit:'1'});
      const first=(await call(`/student?${query}`,'GET',undefined,token(student))).body; assert.equal(first.total,2); assert.equal(first.activities[0].id,cross.body.activity.id); query.set('offset','1'); assert.equal((await call(`/student?${query}`,'GET',undefined,token(student))).body.activities[0].id,id);
      for(const query of ['limit=0','limit=201','offset=-1','status=other','category=unknown','extra=bad']) assert.equal((await call(`/staff?${query}`)).status,400);
    });
    await t.test('Concurrent edits permit one version/audit and reject stale update',async()=>{
      const result=await Promise.all([call(`/staff/${id}`,'PUT',changed({version:2},{status:'published',description:'Edit A'})),call(`/staff/${id}`,'PUT',changed({version:2},{status:'published',description:'Edit B'}),token(other))]); assert.deepEqual(result.map(r=>r.status).sort(),[200,409]); assert.equal(await m.CoopActivityHistory.count({where:{activity_id:id}}),3);
      assert.equal((await call(`/staff/${id}`,'PUT',changed({version:2},{status:'published'}))).body.code,'STALE_ACTIVITY');
    });
    await t.test('Audit failure atomically rolls back edits and new creation',async()=>{
      const original=m.CoopActivityHistory.create; m.CoopActivityHistory.create=async()=>{throw Error('Injected audit failure');};
      try { assert.equal((await call(`/staff/${id}`,'PUT',changed({version:3},{status:'published',title:'Rolled back'}))).status,500); assert.equal((await call('/staff','POST',{...input,title:'Rolled back creation',creation_key:crypto.randomUUID()})).status,500); } finally {m.CoopActivityHistory.create=original;}
      assert.equal((await m.CoopActivity.findByPk(id)).title,input.title); assert.equal((await m.CoopActivity.findByPk(id)).version,3); assert.equal(await m.CoopActivity.count({where:{title:'Rolled back creation'}}),0);
    });
    await t.test('Cancellation retains published information and immutable history; repeated cancel rejected',async()=>{
      const result=await call(`/staff/${id}/cancel`,'POST',{version:3,reason:'Company canceled venue'}); assert.equal(result.status,200);
      const publicResult=(await call(`/student/${id}`,'GET',undefined,token(student))).body; assert.equal(publicResult.activity.status,'canceled'); assert.ok(!JSON.stringify(publicResult).includes('Company canceled venue'));
      const detail=(await call(`/staff/${id}`)).body; assert.equal(detail.history.length,4); assert.equal(detail.history[3].reason,'Company canceled venue'); assert.equal(detail.history[0].snapshot.status,'draft'); assert.equal(detail.history[1].snapshot.status,'published');
      assert.equal((await call(`/staff/${id}/cancel`,'POST',{version:4,reason:'Again'})).status,409);
      assert.equal((await call('/staff','POST',{...input,creation_key:crypto.randomUUID()})).status,201);
    });
    await t.test('SQL deletion/history/version/FK constraints and populated rollback refusal',async()=>{
      for(const sql of ['DELETE FROM coop_activities WHERE id=:id','UPDATE coop_activities SET version=version+1 WHERE id=:id','UPDATE coop_activity_history SET reason=\'changed\' WHERE activity_id=:id','DELETE FROM coop_activity_history WHERE activity_id=:id']) await assert.rejects(db.query(sql,{replacements:{id}}),/Activity history|Invalid activity/);
      await assert.rejects(staff.destroy(),/foreign key constraint/); await assert.rejects(migration.down({context:db.getQueryInterface()}),/Populated activity rollback refused/);
      assert.equal(await m.CoopActivityHistory.count({where:{activity_id:id}}),4);
    });
  } finally { if(server) await new Promise(resolve=>server.close(resolve)); await db.close(); }
});
