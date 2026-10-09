const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto'), fs = require('node:fs'), fsp = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), http = require('node:http');
const { Sequelize } = require('sequelize'), { Umzug, SequelizeStorage } = require('umzug'), express = require('express'), jwt = require('jsonwebtoken');
test('Supervision results: guarded PostgreSQL/private storage/production HTTP', { skip: !process.env.SUPERVISION_RESULTS_DISPOSABLE_DATABASE_URL }, async t => {
  const db = new Sequelize(process.env.SUPERVISION_RESULTS_DISPOSABLE_DATABASE_URL, { logging: false, pool: { max: 8 } }); let server, temp;
  try {
    const [[guard]] = await db.query("SELECT current_database() AS db,current_setting('fitm.a020_disposable',true) AS marker"); assert.equal(guard.db, 'fitm_supervision_results_test'); assert.equal(guard.marker, 'on');
    temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'fitm-results-'));
    const storage = { STORAGE_ROOT: temp, getStudentStoragePaths: id => ({ coop: path.join(temp, 'students', id, 'coop') }), ensureDirectory: async dir => fsp.mkdir(dir, { recursive: true }), toStorageRelativePath: file => path.relative(temp, file), resolveStoragePath: file => path.resolve(temp, file) };
    const m = { sequelize: db }; for (const file of fs.readdirSync(path.join(__dirname, '../src/models')).filter(f => f.endsWith('.model.js'))) { const model = require(`../src/models/${file}`)(db); m[model.name] = model; } for (const model of Object.values(m)) model.associate?.(m);
    const umzug = new Umzug({ migrations: { glob: ['*.js', { cwd: path.join(__dirname, '../src/db/migrations') }] }, context: db.getQueryInterface(), storage: new SequelizeStorage({ sequelize: db, tableName: 'sequelize_meta' }), logger: undefined });
    await umzug.up({ to: '019_add_supervision_appointments.js' }); const migration = require('../src/db/migrations/020_add_supervision_results');
    const service = require('../src/services/supervisionResult.service').createSupervisionResultService(m, { storage });
    const fingerprint = async () => (await db.query("SELECT md5(COALESCE(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) AS f FROM student_files t"))[0][0].f, before = await fingerprint();
    await t.test('020 absent schema returns actionable 503; empty apply/rollback/reapply and DDL failure atomic', async () => {
      await assert.rejects(service.read(crypto.randomUUID(), crypto.randomUUID(), 1, crypto.randomUUID()), e => e.status === 503);
      await migration.up({ context: db.getQueryInterface() }); await migration.down({ context: db.getQueryInterface() });
      const query = db.query; db.query = function(sql, options) { return query.call(this, typeof sql === 'string' && sql.includes('CREATE TABLE supervision_images') ? sql + ' SELECT missing_020_function();' : sql, options); };
      try { await assert.rejects(migration.up({ context: db.getQueryInterface() }), /missing_020_function/); } finally { db.query = query; }
      assert.equal((await db.query("SELECT to_regclass('supervision_results') AS name"))[0][0].name, null); await umzug.up(); assert.equal((await umzug.executed()).length, 22);
    });
    const now = new Date('2026-10-08T05:00:00Z'), run = crypto.randomUUID().slice(0,8);
    const teacher = await m.Teacher.create({ first_name: 'Result', last_name: 'Author', status: 'active' }), other = await m.Teacher.create({ first_name: 'Foreign', last_name: 'Teacher', status: 'active', is_department_head: true });
    const student = async suffix => m.Student.create({ student_id: `results-${suffix}-${run}`, email: `${suffix}-${run}@email.kmutnb.ac.th`, first_name: suffix, last_name: 'Student', major: 'INE', track: 'co_op', password: crypto.randomBytes(24).toString('hex'), advisor_teacher_id: other.id, coop_advisor_teacher_id: teacher.id });
    const a = await student('a'), b = await student('b');
    const request = await m.CoopRequest.create({ student_id: a.id, company_name: 'Canonical Company', company_address: 'Fixture', company_province: 'Bangkok', letter_recipient_name: 'HR', work_start_date: '2026-11-01', work_end_date: '2027-02-01', status: 'approved' });
    await m.Mentor.create({ student_id: a.id, first_name: 'Real', last_name: 'Mentor', email: `${run}@fixture.invalid`, position: 'Engineer', status: 'verified', verified_at: now });
    const scheduling = require('../src/services/supervision.service').createSupervisionService(m, { now: () => now }), schedule = { date: '2026-11-05', time: '09:30', mentor_verified_at: now.toISOString() };
    const v1 = await scheduling.save(teacher.id, a.id, 1, schedule, false), v2 = await scheduling.save(teacher.id, a.id, 2, { ...schedule, date: '2026-12-05' }, false);
    const first = (await scheduling.scope(v1.delivery.token, { version: 1, confirm_identity: true })).appointment, second = (await scheduling.scope(v2.delivery.token, { version: 1, confirm_identity: true })).appointment;
    const app = express(); app.use(express.json()); app.use('/api/supervision', require('../src/routes/supervision.routes').createSupervisionRouter({ models: m, storage, now: () => now, sendEmail: async () => {} })); server = http.createServer(app); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const base = `http://127.0.0.1:${server.address().port}/api/supervision`;
    const auth = row => jwt.sign(row === a || row === b ? { id: row.id, student_id: row.student_id, actor_type: 'student', role: 'student' } : { id: row.id, teacher_id: row.id, actor_type: 'teacher', role: 'teacher' }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const root = row => `/teacher/students/${a.id}/appointments/${row.id}/visits/${row.visit_number}/result`, own = row => `/student/appointments/${row.id}/visits/${row.visit_number}/result`;
    const call = async (url, method = 'GET', body, token = auth(teacher)) => { const multipart = body instanceof FormData; const res = await fetch(base + url, { method, headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body !== undefined && !multipart && { 'Content-Type': 'application/json' }) }, ...(body !== undefined && { body: multipart ? body : JSON.stringify(body) }) }); const content = res.headers.get('content-type'); return { status: res.status, body: content?.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()), headers: res.headers }; };
    const png = Buffer.from([137,80,78,71,13,10,26,10,1,2,3]), file = { originalname: 'proof.png', mimetype: 'image/png', size: png.length, buffer: png };
    const input = version => ({ version, appointment_version: 2, visited_on: '2026-11-05', summary: 'Descriptive visit outcome', issues: 'None observed', recommendations: 'Follow up' });
    const multipart = (version, images = [1,2], patch = {}) => { const data = new FormData(); for (const [key,value] of Object.entries({ ...input(version), ...patch })) data.append(key, String(value)); for (const slot of images) data.append(`image_${slot}`, new Blob([png], { type: 'image/png' }), `proof-${slot}.png`); return data; };
    let current, oldImage;
    await t.test('authorized Teacher saves incomplete visit 1 draft with canonical frozen identities', async () => {
      const res = await call(root(first), 'PUT', { version: 0, appointment_version: 2 }); assert.equal(res.status, 200); current = res.body.result; assert.equal(current.status, 'draft'); assert.equal(current.author_id, teacher.id); assert.equal(current.snapshot.appointment.student_id, a.id); assert.equal(current.snapshot.appointment.snapshot.company.name, 'Canonical Company'); assert.equal(current.version, 1);
      assert.equal((await call(own(first), 'GET', undefined, auth(a))).body.result, null);
    });
    await t.test('anonymous, Student writer, unrelated class advisor/Head, inactive Teacher rejected', async () => {
      assert.equal((await call(root(first), 'GET', undefined, null)).status, 401); assert.equal((await call(root(first), 'PUT', input(1), auth(a))).status, 403); assert.equal((await call(root(first), 'GET', undefined, auth(other))).status, 404);
      await teacher.update({ status: 'inactive' }); assert.equal((await call(root(first))).status, 403); await teacher.update({ status: 'active' });
    });
    await t.test('wrong Student, appointment, visit and body identity spoof fail closed', async () => {
      assert.equal((await call(root(first).replace(a.id,b.id), 'PUT', input(1))).status, 404); assert.equal((await call(root(first).replace('/visits/1/','/visits/2/'), 'PUT', input(1))).status, 404); assert.equal((await call(root(first).replace('/visits/1/','/visits/3/'))).status, 400); assert.equal((await call(root(first).replace(first.id,crypto.randomUUID()))).status, 404); assert.equal((await call(root(first), 'PUT', { ...input(1), student_id: b.id })).status, 400);
    });
    await t.test('missing result fields/images reject finalization without changing draft', async () => { assert.equal((await call(root(first) + '/complete', 'POST', { version: 1 })).body.code, 'RESULT_INCOMPLETE'); assert.equal((await m.SupervisionResult.findByPk(current.id)).version, 1); });
    await t.test('invalid MIME, extension, signature and oversize multipart leave no image records', async () => {
      for (const [name,type,bytes] of [['proof.svg','image/svg+xml',png], ['proof.jpg','image/png',png], ['proof.png','image/png',Buffer.from('not a png')], ['proof.png','image/png',Buffer.alloc(5242881)]]) { const data = multipart(1, []); data.append('image_1', new Blob([bytes], { type }), name); assert.equal((await call(root(first), 'PUT', data)).status, 400); }
      assert.equal(await m.SupervisionImage.count(), 0);
    });
    await t.test('one image draft persists through readback but completion rejects missing second image', async () => { const res = await call(root(first), 'PUT', multipart(1,[1])); assert.equal(res.status, 200); current = res.body.result; oldImage = current.image_1_id; assert.equal(res.body.images.length, 1); assert.equal((await call(root(first) + '/complete', 'POST', { version: 2 })).status, 400); assert.equal((await call(root(first))).body.result.image_1_id, oldImage); });
    await t.test('private image retrieval authenticates owner and hides raw paths', async () => {
      const url = root(first) + '/images/' + oldImage; const res = await call(url); assert.equal(res.status, 200); assert.deepEqual(res.body, png); assert.equal(res.headers.get('x-content-type-options'), 'nosniff'); assert.match(res.headers.get('cache-control'), /no-store/);
      assert.equal((await call(url, 'GET', undefined, null)).status, 401); assert.equal((await call(url, 'GET', undefined, auth(other))).status, 404); assert.equal((await call(own(first) + '/images/' + oldImage, 'GET', undefined, auth(a))).status, 404); assert.equal((await call(own(first) + '/images/' + oldImage, 'GET', undefined, auth(b))).status, 404); assert.ok(!JSON.stringify((await call(root(first))).body).includes('storage_path'));
      assert.equal((await call(url.replace(a.id,a.id.toUpperCase()).replace(first.id,first.id.toUpperCase()).replace(oldImage,oldImage.toUpperCase()))).status,200);
    });
    await t.test('duplicate create and stale versions conflict without overwrites', async () => { assert.equal((await call(root(first), 'PUT', input(0))).body.code, 'STALE_RESULT'); assert.equal((await call(root(first), 'PUT', input(1))).status, 409); assert.equal((await call(root(first), 'PUT', { ...input(2), appointment_version: 1 })).body.code, 'STALE_APPOINTMENT'); });
    await t.test('replacement preserves old evidence and all historical revisions', async () => { const res = await call(root(first), 'PUT', multipart(2)); assert.equal(res.status, 200); current = res.body.result; assert.notEqual(current.image_1_id, oldImage); assert.equal(res.body.history.length, 3); assert.equal(res.body.history[1].snapshot.image_1_id, oldImage); assert.equal(res.body.images.length, 3); assert.equal((await call(root(first) + '/images/' + oldImage)).status, 200); });
    await t.test('concurrent same-version draft writes commit one revision only', async () => { const res = await Promise.all([call(root(first),'PUT', input(3)),call(root(first),'PUT', { ...input(3), summary: 'Competing writer' })]); assert.deepEqual(res.map(r=>r.status).sort(), [200,409]); current = res.find(r=>r.status===200).body.result; assert.equal(await m.SupervisionResultRevision.count({ where: { result_id: current.id } }), 4); });
    await t.test('injected audit failure rolls back new files and database metadata together', async () => {
      const count = await m.SupervisionImage.count(), files = async () => (await fsp.readdir(path.join(temp,'students',a.id,'coop','supervision',first.id))).sort(), beforeFiles = await files();
      m.SupervisionResultRevision.addHook('afterCreate','injected',()=>{ throw Error('Injected result audit failure'); });
      try { await assert.rejects(service.save(a.id,first.id,1,teacher.id,input(4),{ image_1: [file] }), /Injected result audit/); } finally { m.SupervisionResultRevision.removeHook('afterCreate','injected'); }
      assert.equal(await m.SupervisionImage.count(),count); assert.deepEqual(await files(),beforeFiles); assert.equal((await m.SupervisionResult.findByPk(current.id)).version,4);
    });
    await t.test('result-bearing appointment reschedule blocked by service and direct SQL', async () => {
      await assert.rejects(scheduling.save(teacher.id,a.id,1,{ ...schedule,version:2,reason:'Reschedule' },true),e=>e.code==='APPOINTMENT_HAS_RESULT'); await assert.rejects(db.query("UPDATE supervision_appointments SET version=version+1,status='pending_confirmation',confirmed_at=NULL WHERE id=:id",{replacements:{id:first.id}}),/protected supervision result/);
    });
    await t.test('cancellation freezes further writes but preserves readable draft/history/evidence', async () => {
      await request.update({status:'cancelled'}); assert.equal((await call(root(first),'PUT',input(4))).body.code,'PLACEMENT_CHANGED'); assert.equal((await call(root(first)+'/complete','POST',{version:4})).status,409); assert.equal((await call(root(first))).status,200); assert.equal((await call(root(first)+'/images/'+oldImage)).status,200); await request.update({status:'approved'});
    });
    await t.test('finalization verifies files exist and rejects unavailable evidence', async () => {
      const image = await m.SupervisionImage.findByPk(current.image_2_id), target = storage.resolveStoragePath(image.storage_path); await fsp.rename(target,target+'.held');
      try { assert.equal((await call(root(first)+'/complete','POST',{version:4})).status,404); } finally { await fsp.rename(target+'.held',target); }
    });
    await t.test('two-image completion is immutable and visible only to owning Student', async () => {
      const res = await call(root(first)+'/complete','POST',{version:4}); assert.equal(res.status,200); current = res.body.result; assert.equal(current.status,'completed'); assert.ok(current.completed_at); assert.equal(res.body.history.length,5);
      const ownView = await call(own(first),'GET',undefined,auth(a)); assert.equal(ownView.body.result.id,current.id); assert.equal(ownView.body.images.length,2); assert.equal(ownView.body.history.length,0); assert.equal((await call(own(first)+'/images/'+current.image_1_id,'GET',undefined,auth(a))).status,200); assert.equal((await call(own(first)+'/images/'+oldImage,'GET',undefined,auth(a))).status,404); assert.equal((await call(root(first),'PUT',input(5))).body.code,'RESULT_COMPLETED'); assert.equal((await call(root(first)+'/complete','POST',{version:5})).status,409);
    });
    await t.test('visit 2 independent result and concurrent first drafts/finalizations commit once', async () => {
      const creates = await Promise.all([call(root(second),'PUT',multipart(0)),call(root(second),'PUT',multipart(0))]); assert.deepEqual(creates.map(r=>r.status).sort(),[200,409]); const created = creates.find(r=>r.status===200).body.result; assert.equal(created.snapshot.appointment.visit_number,2); assert.notEqual(created.id,current.id);
      const completed = await Promise.all([call(root(second)+'/complete','POST',{version:1}),call(root(second)+'/complete','POST',{version:1})]); assert.deepEqual(completed.map(r=>r.status).sort(),[200,409]); assert.equal(await m.SupervisionResult.count(),2);
    });
    await t.test('appointment reschedule before first result rejects old appointment version', async () => {
      const requestB = await m.CoopRequest.create({student_id:b.id,company_name:'Other',company_address:'Fixture',company_province:'Bangkok',letter_recipient_name:'HR',work_start_date:'2026-11-01',work_end_date:'2027-02-01',status:'approved'}); await m.Mentor.create({student_id:b.id,first_name:'B',last_name:'Mentor',email:`b-${run}@fixture.invalid`,position:'Engineer',status:'verified',verified_at:now});
      const pending = await scheduling.save(teacher.id,b.id,1,schedule,false); await assert.rejects(service.save(b.id,pending.appointment.id,1,teacher.id,{version:0,appointment_version:1}),e=>e.code==='APPOINTMENT_CONFIRMATION_REQUIRED'); await scheduling.save(teacher.id,b.id,1,{...schedule,version:1,reason:'Changed'},true); await assert.rejects(service.save(b.id,pending.appointment.id,1,teacher.id,{version:0,appointment_version:1}),e=>e.code==='STALE_APPOINTMENT'); assert.equal(requestB.status,'approved');
    });
    await t.test('draft creation racing reschedule preserves one coherent appointment version', async () => {
      let appointment = await m.SupervisionAppointment.findOne({where:{student_id:b.id,visit_number:1}});
      const delivery = await scheduling.resend(teacher.id,b.id,appointment.id,{version:appointment.version});
      appointment = (await scheduling.scope(delivery.token,{version:appointment.version,confirm_identity:true})).appointment;
      const results = await Promise.allSettled([
        service.save(b.id,appointment.id,1,teacher.id,{version:0,appointment_version:appointment.version}),
        scheduling.save(teacher.id,b.id,1,{...schedule,date:'2026-11-06',version:appointment.version,reason:'Concurrent reschedule'},true)
      ]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      const failure = results.find(r=>r.status==='rejected'); assert.ok(['STALE_APPOINTMENT','APPOINTMENT_HAS_RESULT'].includes(failure.reason.code));
      const saved = await m.SupervisionResult.findOne({where:{appointment_id:appointment.id}}), latest = await m.SupervisionAppointment.findByPk(appointment.id);
      if(saved) assert.equal(saved.appointment_version,latest.version); else assert.equal(latest.status,'pending_confirmation');
    });
    await t.test('database constraints protect history, complete results, visit/image identity and populated rollback', async () => {
      await assert.rejects(db.query("UPDATE supervision_result_revisions SET actor_name='tamper'"),/immutable/); await assert.rejects(db.query('DELETE FROM supervision_images'),/immutable/); await assert.rejects(db.query("UPDATE supervision_results SET summary='tamper',version=version+1"),/completed result/); await assert.rejects(db.query('DELETE FROM supervision_results'),/protected/); await assert.rejects(migration.down({context:db.getQueryInterface()}),/populated rollback/);
      // Test CHECK/composite FK directly against a separate confirmed appointment,
      // so UNIQUE/transition errors cannot accidentally satisfy these assertions.
      const third = await scheduling.save(teacher.id,b.id,2,{...schedule,date:'2026-12-06'},false);
      const confirmed = (await scheduling.scope(third.delivery.token,{version:1,confirm_identity:true})).appointment;
      const [[snapshot]] = await db.query('SELECT to_jsonb(a) AS appointment FROM supervision_appointments a WHERE id=:id',{replacements:{id:confirmed.id}});
      const direct = { appointment_id:confirmed.id,appointment_version:2,author_id:teacher.id,status:'draft',version:1,snapshot,summary:'Outcome',issues:'',recommendations:'' };
      await assert.rejects(m.SupervisionResult.create({...direct,image_1_id:current.image_1_id}),e=>e.name==='SequelizeForeignKeyConstraintError');
      await assert.rejects(m.SupervisionResult.create({...direct,status:'completed',completed_at:new Date(),visited_on:'2026-12-06'}),e=>e.name==='SequelizeDatabaseError' && /check constraint/.test(e.message));
      m.SupervisionResultRevision.addHook('afterCreate','postCommitFailure',(_row,options)=>{ options.transaction.afterCommit(()=>{ throw Error('Injected post-commit response failure'); }); });
      try { await assert.rejects(service.save(b.id.toUpperCase(),confirmed.id.toUpperCase(),2,teacher.id,{version:0,appointment_version:2},{image_1:[file]}),/Injected post-commit response/); }
      finally { m.SupervisionResultRevision.removeHook('afterCreate','postCommitFailure'); }
      const durable = await m.SupervisionResult.findOne({where:{appointment_id:confirmed.id}}), durableImage = await m.SupervisionImage.findByPk(durable.image_1_id);
      assert.deepEqual(await fsp.readFile(storage.resolveStoragePath(durableImage.storage_path)),png);
      assert.equal(await m.SupervisionResultRevision.count({where:{result_id:durable.id}}),1);
      assert.equal(await fingerprint(),before); assert.equal((await a.reload()).advisor_teacher_id,other.id); assert.equal((await request.reload()).status,'approved');
    });
  } finally { if(server) { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); } await db.close(); if(temp && path.basename(temp).startsWith('fitm-results-') && path.dirname(temp)===os.tmpdir()) await fsp.rm(temp,{recursive:true,force:true}); }
});
