// Explicit opt-in. New disposable schema inside an EXISTING isolated test database.
// No development DDL, resets, source credentials, account grants or real-user writes.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const { randomUUID, randomBytes } = require('node:crypto');
const database = process.env.FITM_CO09_TEST_DATABASE;
const enabled = process.env.FITM_CO09_POSTGRES_TESTS === '1' && /^fitm_(?:co09_test|profile_accept)_[a-z0-9_]+$/.test(database || '');
test('CO-09 actual PostgreSQL + JWT/HTTP + immutable storage acceptance', { skip: !enabled, timeout: 90000 }, async t => {
  const env = require('dotenv').parse(await fs.readFile(path.join(__dirname,'../.env')));
  assert.equal(env.NODE_ENV,'development'); assert.equal(env.DB_NAME,'intern_system');
  Object.assign(process.env, env, { DB_NAME: database, DB_HOST: '127.0.0.1', DOTENV_CONFIG_QUIET: 'true', JWT_SECRET: randomBytes(48).toString('hex') });
  const schema = 'fitm_co09_' + randomBytes(8).toString('hex'), root = await fs.mkdtemp(path.join(os.tmpdir(),'fitm-co09-files-'));
  const models = require('../src/models'), db = models.sequelize;
  // Set before the first connection. All unqualified ORM SQL is confined to this schema.
  db.config.dialectOptions = { ...db.config.dialectOptions, options: `-c search_path=${schema},public` };
  db.addHook('afterConnect', connection => connection.query(`SET search_path TO "${schema}", public`));
  const { QueryTypes } = require('sequelize');
  let server, created = false, fingerprints;
  const preserve = require('../src/db/studentProfileDevelopment');
  try {
    const [metadata] = await db.query('SELECT current_database() AS db, current_setting(\'server_version_num\')::int AS version', { type: QueryTypes.SELECT });
    assert.equal(metadata.db,database); assert.notEqual(metadata.db,'intern_system'); assert.ok(metadata.version >= 160000 && metadata.version < 170000);
    fingerprints = await preserve.fingerprints(db, undefined, { excludeContacts: false });
    await db.query(`CREATE SCHEMA "${schema}"`); created = true;
    for (const table of ['teachers','students','department_staffs','coop_projects','super_admins','admin_account_controls']) await db.query(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
    assert.equal((await db.query('SELECT current_schema() AS schema', { type: QueryTypes.SELECT }))[0].schema,schema);
    await db.query(require('../src/db/coopTopicExamSchema').schemaSQL(db));
    const jwt = require('jsonwebtoken'), express = require('express');
    const { createTopicDocumentStorage } = require('../src/services/coopTopicDocumentStorage');
    const realStorage = createTopicDocumentStorage(root);
    let diskFailure = false;
    const storage = { read: (...args) => realStorage.read(...args), write: async (...args) => { if (diskFailure) throw Error('synthetic disk failure'); return realStorage.write(...args); } };
    const service = require('../src/services/coopTopicExam.service').createCoopTopicExamService(models, { storage });
    const app = express(); app.use(express.json()); app.use('/api/coop-topic-exams',require('../src/routes/coopTopicExams.routes').createCoopTopicExamsRouter({ models, service, limits: false }));
    server = await new Promise(resolve => { const instance = app.listen(0,'127.0.0.1',() => resolve(instance)); });
    const base = `http://127.0.0.1:${server.address().port}/api/coop-topic-exams`;
    const tokens = [], students = [];
    const sign = claims => jwt.sign(claims,process.env.JWT_SECRET,{ expiresIn: '10m' });
    for (let index=0; index<3; index++) {
      const code = '999' + String(BigInt('0x'+randomBytes(6).toString('hex')) % 10000000000n).padStart(10,'0');
      const student = await models.Student.create({ student_id: code, email: `s${code}@email.kmutnb.ac.th`, first_name: 'ทดสอบ', last_name: 'CO09', password: randomBytes(18).toString('base64url'), track: 'co_op' });
      students.push(student); tokens.push(sign({ id: student.id, student_id: code, actor_type: 'student', role: 'student' }));
      await models.CoopProject.create({ student_id: student.id, topic: 'Synthetic CO-09 acceptance' });
    }
    const teacher = await models.Teacher.create({ first_name: 'กรรมการ', last_name: 'ทดสอบ', status: 'active', password: randomBytes(18).toString('base64url') });
    const teacherToken = sign({ id: teacher.id, teacher_id: teacher.id, actor_type: 'teacher', role: 'teacher' });
    const staff = await models.DepartmentStaff.create({ first_name: 'เจ้าหน้าที่', last_name: 'ทดสอบ', email: `co09-${randomUUID()}@example.com`, password: randomBytes(18).toString('base64url') });
    const staffToken = sign({ id: staff.id, staff_id: staff.id, actor_type: 'department_staff', role: 'department_staff' });
    const admin = await models.SuperAdmin.create({ first_name: 'ผู้ดูแล', last_name: 'ทดสอบ', email: `co09-${randomUUID()}@example.com`, password: randomBytes(24).toString('base64url'), permissions: ['topic-exams.manage'] });
    const adminToken = sign({ id: admin.id, super_admin_id: admin.id, actor_type: 'super_admin', role: 'super_admin', session_version: admin.session_version });
    const grant = await models.SuperAdmin.create({ teacher_id: teacher.id, credential_stamp: require('../src/services/teacherAdminGrant.service').credentialStamp(teacher), permissions: ['topic-exams.manage'] });
    const membershipToken = sign({ id: teacher.id, teacher_id: teacher.id, actor_type: 'teacher', role: 'teacher', admin_grant_id: grant.id, admin_session_version: grant.session_version });
    async function request(token, method, endpoint, body, version) {
      const form = body instanceof FormData;
      const response = await fetch(base + endpoint,{ method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(!form ? {'Content-Type':'application/json'} : {}), ...(version === undefined ? {} : {'If-Match':`"${version}"`}) }, ...(body === undefined ? {} : { body: form ? body : JSON.stringify(body) }) });
      const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
      return { status: response.status, data, headers: response.headers };
    }
    const manage = index => `/manage/students/${students[index].id}`;
    const read = async index => { const response = await request(tokens[index],'GET','/me'); assert.equal(response.status,200); return response.data.data; };
    const upload = (content='%PDF-1.7\n%%EOF', filename='CO-09.pdf', type='application/pdf') => { const body = new FormData(); body.append('file',new Blob([content],{type}),filename); return body; };
    let docVersion;
    await t.test('real auth owner isolation and staff/admin capability boundaries', async () => {
      assert.equal((await request(null,'GET','/me')).status,401);
      for (const token of [tokens[0],teacherToken]) assert.equal((await request(token,'GET','/manage/students')).status,403);
      assert.equal((await request(staffToken,'GET','/manage/students')).status,200); assert.equal((await request(adminToken,'GET','/manage/students')).status,200);
      assert.equal((await request(membershipToken,'GET','/manage/students')).status,200);
      assert.equal((await request(tokens[0],'PUT',manage(1)+'/schedule',{} ,0)).status,403);
      assert.equal((await request(tokens[0],'PUT',manage(0)+'/review',{review_status:'approved'},0)).status,403);
      const empty = await read(0); assert.equal(empty.exam.status,'unscheduled'); assert.equal(empty.document.file,null);
    });
    await t.test('upload validation, protected preview/download, URL remains independent', async () => {
      assert.equal((await request(tokens[0],'POST','/me/document',upload('bad'),0)).status,400);
      assert.equal((await request(tokens[0],'POST','/me/document',upload(undefined,'co09.txt'),0)).status,400);
      assert.equal((await request(tokens[0],'POST','/me/document',upload())).status,428);
      const saved = await request(tokens[0],'POST','/me/document',upload(),0); assert.equal(saved.status,200); docVersion=saved.data.data.version;
      const preview = await request(tokens[0],'GET','/me/document/preview'); assert.equal(preview.status,200); assert.ok(preview.data.toString().startsWith('%PDF-')); assert.equal(preview.headers.get('cache-control'),'private, no-store');
      assert.ok((await request(tokens[0],'GET','/me/document/download')).headers.get('content-disposition').startsWith('attachment'));
      assert.equal((await request(tokens[1],'GET','/me/document/preview')).status,404);
      assert.equal((await request(teacherToken,'GET',manage(0)+'/document/preview')).status,403);
      const url = await request(tokens[1],'PUT','/me/document-url',{ document_url:'https://example.com/co09' },0); assert.equal(url.status,200); assert.equal(url.data.data.file,null); assert.equal(url.data.data.review_status,'pending');
      assert.equal((await request(tokens[1],'PUT','/me/document-url',{ document_url:'javascript:alert(1)' },1)).status,400);
      assert.equal((await request(tokens[0],'PUT','/me/document-url',{ review_status:'approved' },docVersion)).status,400);
    });
    await t.test('review reasons and optimistic concurrency; replacement re-enters review and retains old bytes', async () => {
      assert.equal((await request(staffToken,'PUT',manage(0)+'/review',{ review_status:'needs_revision',review_reason:'' },docVersion)).status,400);
      const reviewed=await request(staffToken,'PUT',manage(0)+'/review',{ review_status:'needs_revision',review_reason:'ตรวจแก้รายละเอียด' },docVersion); assert.equal(reviewed.status,200); docVersion++;
      assert.equal((await read(0)).document.review_reason,'ตรวจแก้รายละเอียด');
      const old=await models.CoopTopicDocument.findOne({where:{student_id:students[0].id}}), previous=old.storage_path;
      assert.equal((await request(tokens[0],'POST','/me/document',upload(),docVersion-1)).status,409);
      const replaced=await request(tokens[0],'POST','/me/document',upload('%PDF-1.7\nnew\n%%EOF'),docVersion); assert.equal(replaced.status,200);docVersion++;
      assert.equal(replaced.data.data.review_status,'pending'); assert.equal((await realStorage.read(students[0].id,previous)).toString(),'%PDF-1.7\n%%EOF');
      await assert.rejects(realStorage.read(students[1].id,previous)); await assert.rejects(realStorage.read(students[0].id,'../other.pdf'));
    });
    const schedule = (room='A101', start='09:00', end='10:00') => ({ status:'scheduled', starts_at:`2026-12-01T${start}:00+07:00`, ends_at:`2026-12-01T${end}:00+07:00`, mode:'onsite',location:room,meeting_url:'',notes:'',reason:'',committee:[{teacher_id:teacher.id,role:'chair'}] });
    await t.test('concurrent requests serialize teacher conflicts and reject room overlap', async () => {
      const results=await Promise.all([0,1].map(index=>request(staffToken,'PUT',manage(index)+'/schedule',schedule(index?'A102':'A101'),0)));
      assert.deepEqual(results.map(row=>row.status).sort(),[200,409]);
      const winner=results[0].status===200?0:1, loser=1-winner;
      const winning=await read(winner); assert.equal(winning.exam.committee[0].teacher_id,teacher.id);
      const roomConflict=await request(staffToken,'PUT',manage(loser)+'/schedule',{...schedule(winning.exam.location),committee:[]},0);assert.equal(roomConflict.status,409);assert.equal(roomConflict.data.code,'CO09_ROOM_CONFLICT');
      assert.equal((await request(staffToken,'PUT',manage(loser)+'/schedule',schedule('A103','10:00','11:00'),0)).status,200);
      // Establish deterministic current schedules for subsequent tests.
      if(winner===1) {
        const a=await read(0),b=await read(1);
        assert.equal((await request(staffToken,'PUT',manage(0)+'/schedule',{...schedule('A101','12:00','13:00'),status:'rescheduled',reason:'test'},a.exam.version)).status,200);
        assert.equal((await request(staffToken,'PUT',manage(1)+'/schedule',{...schedule('A102','10:00','11:00'),status:'rescheduled',reason:'test'},b.exam.version)).status,200);
      }
    });
    await t.test('revision conflict, atomic committee rollback and full status lifecycle/history', async () => {
      let a=await read(0);
      assert.equal((await request(staffToken,'PUT',manage(0)+'/schedule',schedule(),0)).status,409);
      assert.equal((await request(staffToken,'PUT',manage(0)+'/schedule',{...schedule(),committee:[{teacher_id:teacher.id,role:'chair'},{teacher_id:teacher.id,role:'member'}]},a.exam.version)).status,400);
      const count=await models.CoopTopicExamCommitteeMember.count();
      const original=models.CoopTopicExamHistory.create;models.CoopTopicExamHistory.create=async()=>{throw Error('synthetic history failure');};
      try{assert.equal((await request(staffToken,'PUT',manage(0)+'/schedule',schedule('A104','14:00','15:00'),a.exam.version)).status,500);}finally{models.CoopTopicExamHistory.create=original;}
      assert.deepEqual((await read(0)).exam,a.exam);assert.equal(await models.CoopTopicExamCommitteeMember.count(),count);
      for(const status of ['rescheduled','cancelled','scheduled','completed']) {
        a=await read(0);const saved=await request(adminToken,'PUT',manage(0)+'/schedule',{...schedule('A104','14:00','15:00'),status,reason:['rescheduled','cancelled'].includes(status)?'เหตุผลทดสอบ':''},a.exam.version);assert.equal(saved.status,200);assert.equal(saved.data.data.status,status);
      }
      a=await read(0);assert.equal((await request(staffToken,'PUT',manage(0)+'/schedule',schedule(),a.exam.version)).status,409);
      const detail=await request(staffToken,'GET',manage(0));assert.equal(detail.status,200);assert.ok(detail.data.data.exam.history.length>=5);
    });
    await t.test('concurrent same-student revisions allow only one schedule write', async () => {
      const before=await read(1),results=await Promise.all([0,1].map(index=>request(staffToken,'PUT',manage(1)+'/schedule',{...schedule('A105','16:00','17:00'),status:'rescheduled',reason:'Concurrent request '+index},before.exam.version)));
      assert.deepEqual(results.map(row=>row.status).sort(),[200,409]);assert.equal((await read(1)).exam.version,before.exam.version+1);
    });
    await t.test('disk failure, rollback and lost COMMIT acknowledgement never delete original or new files', async () => {
      const before=await read(0); diskFailure=true;
      try{assert.equal((await request(tokens[0],'POST','/me/document',upload(),docVersion)).status,500);}finally{diskFailure=false;}
      assert.deepEqual((await read(0)).document,before.document);
      const update=models.CoopTopicDocument.prototype.update; models.CoopTopicDocument.prototype.update=async()=>{throw Error('synthetic DB failure');};
      try{assert.equal((await request(tokens[0],'POST','/me/document',upload(),docVersion)).status,500);}finally{models.CoopTopicDocument.prototype.update=update;}
      assert.deepEqual((await read(0)).document,before.document);
      const originalTransaction=db.transaction.bind(db); let intercepted=false;
      db.transaction=async(...args)=>{ const transaction=await originalTransaction(...args); if(typeof args.at(-1)!=='function'&&!intercepted){intercepted=true;const commit=transaction.commit.bind(transaction); transaction.commit=async()=>{await commit();throw Error('synthetic COMMIT acknowledgement lost');};}return transaction; };
      try{const response=await request(tokens[0],'POST','/me/document',upload('%PDF-1.7\nuncertain\n%%EOF'),docVersion);assert.equal(response.status,503);assert.equal(response.data.code,'CO09_COMMIT_UNCERTAIN');}finally{db.transaction=originalTransaction;}
      const after=await read(0);assert.equal(after.document.version,docVersion+1);assert.equal((await request(tokens[0],'GET','/me/document/preview')).status,200);
      const refs=(await models.CoopTopicDocument.findAll({attributes:['storage_path']})).map(row=>row.storage_path).filter(Boolean);
      const inventory=await require('../src/db/inspectCo09Storage').inventory(root,refs);assert.equal(inventory.missing,0);assert.ok(inventory.retained_unreferenced>=3);
    });
    await t.test('actual PostgreSQL statement timeout rolls back without changing document metadata', async () => {
      const before=await read(0),query=db.query.bind(db);let injected=false;
      db.query=async(sql,options)=>{
        if(sql==='SELECT pg_advisory_xact_lock(2140909)'&&!injected){injected=true;await query("SET LOCAL statement_timeout='25ms'",options);await query('SELECT pg_sleep(0.1)',options);}
        return query(sql,options);
      };
      try{const response=await request(tokens[0],'POST','/me/document',upload(),before.document.version);assert.equal(response.status,503);assert.equal(response.data.code,'CO09_TIMEOUT');}finally{db.query=query;}
      assert.deepEqual((await read(0)).document,before.document);
    });
    await t.test('inactive committee is rejected; missing schema maps to an explicit unavailable response', async () => {
      await teacher.update({status:'inactive'});
      try{const before=await read(1);assert.equal((await request(staffToken,'PUT',manage(1)+'/schedule',schedule('A106','17:00','18:00'),before.exam.version)).status,400);}finally{await teacher.update({status:'active'});}
      await db.query(`ALTER TABLE "${schema}"."coop_topic_documents" RENAME TO co09_temporarily_unavailable`);
      try{const unavailable=await request(tokens[0],'GET','/me');assert.equal(unavailable.status,503);assert.equal(unavailable.data.code,'CO09_SCHEMA_NOT_READY');}finally{await db.query(`ALTER TABLE "${schema}".co09_temporarily_unavailable RENAME TO coop_topic_documents`);}
    });
    await t.test('live revocation and admin environment/permission restrictions remain enforced', async () => {
      await admin.update({permissions:[]});assert.equal((await request(adminToken,'GET','/manage/students')).status,403);
      await staff.update({is_active:false});assert.equal((await request(staffToken,'GET','/manage/students')).status,403);
      await admin.update({permissions:['topic-exams.manage']});process.env.NODE_ENV='production';try{assert.equal((await request(adminToken,'GET','/manage/students')).status,403);}finally{process.env.NODE_ENV='development';}
    });
    assert.deepEqual(await preserve.fingerprints(db,undefined,{excludeContacts:false}),fingerprints);
  } catch (error) {
    // Never let SQL errors dump fixture credentials or bind parameters to TAP.
    if (error.name?.startsWith('Sequelize')) throw Error(`Isolated SQL failure: ${error.original?.code || error.name}; constraint=${error.original?.constraint || 'none'}`);
    throw error;
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));
    if(created){assert.ok(/^fitm_co09_[0-9a-f]{16}$/.test(schema));assert.notEqual(db.config.database,'intern_system');await db.query(`DROP SCHEMA "${schema}" CASCADE`);}
    await db.close();
    // Only this run's unique temporary fixture directory, never application storage.
    assert.ok(path.basename(root).startsWith('fitm-co09-files-'));assert.equal(path.dirname(root),os.tmpdir());await fs.rm(root,{recursive:true});
  }
});
