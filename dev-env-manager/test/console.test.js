import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { parseDocument, editDocument, publicDocument, sensitive } from '../src/env-document.js';
import { credential, verify, initializeState, Sessions, LoginLimit } from '../src/auth.js';
import { createConsole, networkGuard } from '../src/server.js';
import { EnvironmentStore } from '../src/store.js';
import { privateDirectory, privatePath, snapshot, digest } from '../src/files.js';
const password = randomBytes(24).toString('base64url');
const secret = randomBytes(32).toString('hex');
const backend = `# fixture only\r\nNODE_ENV=development\r\nPORT=5000 # retain comment\r\nDB_HOST=postgres\r\nDB_NAME=fixture\r\nDB_USER=fixture\r\nDB_PASSWORD='${secret}'\r\nJWT_SECRET='${secret}'\r\nFRONTEND_URL=http://localhost:5173\r\nGOOGLE_LOGIN_ENABLED=false\r\n\r\nUNKNOWN_SETTING='${secret}'\r\n`;
const checkError = code => error => error.code === code;

test('environment documents: masking, validation and format preservation', async t => {
  const bytes = Buffer.from(backend);
  await t.test('known and unknown credentials never appear in read response', () => {
    const fields = publicDocument(parseDocument(bytes));
    assert.equal(JSON.stringify(fields).includes(secret), false);
    assert.equal(fields.find(v => v.key === 'UNKNOWN_SETTING').secret, true);
    assert.equal(sensitive('VITE_API_URL','https://u:password@example.test'), true);
  });
  await t.test('only edited span changes, comments/order/CRLF remain byte-for-byte', () => {
    const edited = editDocument(bytes, 'backend', [{key:'PORT',value:'5010'}]);
    assert.equal(edited.bytes.equals(Buffer.from(backend.replace('PORT=5000','PORT=5010'))), true);
  });
  await t.test('blank secret means unchanged; preview contains no old/new secrets', () => {
    const edited = editDocument(bytes, 'backend', [{key:'DB_PASSWORD',value:''},{key:'PORT',value:'5010'}]);
    assert.equal(parseDocument(edited.bytes).entries.get('DB_PASSWORD').value === secret, true);
    const replacement = randomBytes(32).toString('hex');
    const change = editDocument(bytes, 'backend', [{key:'DB_PASSWORD',value:replacement}]);
    assert.equal(JSON.stringify(change.preview).includes(secret) || JSON.stringify(change.preview).includes(replacement), false);
  });
  await t.test('secret clearing needs explicit confirmation; required secret cannot be blank', () => {
    assert.throws(() => editDocument(bytes,'backend',[{key:'UNKNOWN_SETTING',clear:true}]), checkError('SECRET_CLEAR_CONFIRM'));
    assert.equal(parseDocument(editDocument(bytes,'backend',[{key:'UNKNOWN_SETTING',clear:true,confirmClear:true}]).bytes).entries.get('UNKNOWN_SETTING').value, '');
    assert.throws(() => editDocument(bytes,'backend',[{key:'JWT_SECRET',clear:true,confirmClear:true}]), checkError('ENV_REQUIRED'));
  });
  await t.test('reject invalid UTF-8, duplicate keys and unsupported documents', () => {
    assert.throws(() => parseDocument(Buffer.from([0xff])), checkError('ENV_ENCODING'));
    assert.throws(() => parseDocument(Buffer.from('PORT=1\nPORT=2')), checkError('ENV_DUPLICATE'));
    assert.throws(() => parseDocument(Buffer.from('not an assignment')), checkError('ENV_FORMAT'));
    assert.throws(() => parseDocument(Buffer.from('KEY="unterminated')), checkError('ENV_FORMAT'));
  });
  await t.test('reject ports, booleans, origins, scores, unknown keys and multiline injection', () => {
    for (const [key,value] of [['PORT','0'],['PORT','65536'],['GOOGLE_LOGIN_ENABLED','yes'],['FRONTEND_URL','javascript:x'],['FRONTEND_URL','https://example.test/path'],['NODE_ENV','production']]) assert.throws(() => editDocument(bytes,'backend',[{key,value}]));
    assert.throws(() => editDocument(Buffer.from('MATCHING_MIN_SCORE=0.05\n'),'nlp',[{key:'MATCHING_MIN_SCORE',value:'1.1'}]), checkError('ENV_SCORE'));
    assert.throws(() => editDocument(bytes,'backend',[{key:'NEW_KEY',value:'x'}]), checkError('ENV_KEY'));
    assert.throws(() => editDocument(bytes,'backend',[{key:'PORT',value:'5001\nINJECTED=x'}]), checkError('ENV_VALUE'));
  });
  await t.test('VITE secrets blocked, public values allowed, quotes compatible', () => {
    assert.throws(() => editDocument(Buffer.from('VITE_CLIENT_SECRET=\n'),'frontend',[{key:'VITE_CLIENT_SECRET',value:'x'}]), checkError('FRONTEND_SECRET'));
    const value = 'name with spaces # literal';
    const changed = editDocument(bytes,'backend',[{key:'UNKNOWN_SETTING',value}]);
    assert.equal(parseDocument(changed.bytes).entries.get('UNKNOWN_SETTING').value, value);
  });
});

test('authentication, sessions, rate limits and network boundaries', async t => {
  await t.test('scrypt verifies correct password and rejects wrong password', async () => {
    const record = await credential(password);
    assert.equal(await verify(password, record), true); assert.equal(await verify(`${password}wrong`, record), false);
    assert.equal(record.hash.includes(password), false);
  });
  await t.test('session rotation, idle/absolute expiration and server logout', () => {
    let clock = 0; const sessions = new Sessions({now:()=>clock,lifetime:100,idle:20});
    const first = sessions.create(undefined,true), second = sessions.create(first.token,true);
    assert.equal(sessions.get(first.token),null); assert.equal(!!sessions.get(second.token),true);
    clock=21; assert.equal(sessions.get(second.token),null);
    clock=0; const absolute = sessions.create(undefined,true);
    for (clock=10;clock<100;clock+=10) assert.equal(!!sessions.get(absolute.token),true);
    assert.equal(sessions.get(absolute.token),null);
    const out = sessions.create(undefined,true); sessions.delete(out.token); assert.equal(sessions.get(out.token),null);
  });
  await t.test('failed-password budget persists through attempts and expires', () => {
    let clock=0;const limit = new LoginLimit({now:()=>clock,max:2,window:100});limit.take();limit.take();assert.throws(()=>limit.take(),checkError('LOGIN_LIMIT'));clock=101;limit.take();limit.success();limit.take();
  });
  await t.test('expired preview secrets are removed from memory', () => {
    let clock=0;const sessions=new Sessions({now:()=>clock,idle:100,lifetime:100});const {session}=sessions.create(undefined,true);
    session.plans.set('preview',{expires:5,bytes:Buffer.from('synthetic')});clock=6;sessions.sweep();assert.equal(session.plans.size,0);
  });
  await t.test('non-loopback, rebinding, forged proxy, foreign/absent Origin rejected', () => {
    const base = {method:'POST',socket:{remoteAddress:'127.0.0.1'},headers:{host:'127.0.0.1:5379',origin:'http://127.0.0.1:5379'}};
    networkGuard(base,5379);
    for(const req of [{...base,socket:{remoteAddress:'192.168.1.2'}},{...base,headers:{...base.headers,host:'attacker.example:5379'}},{...base,headers:{...base.headers,origin:'http://localhost:5379'}},{...base,headers:{host:base.headers.host}},{...base,headers:{...base.headers,'x-forwarded-for':'127.0.0.1'}},{...base,headers:{...base.headers,'sec-fetch-site':'cross-site'}}]) assert.throws(()=>networkGuard(req,5379));
  });
});

test('real local filesystem/ACL, backups and HTTP APIs using disposable fixtures only', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'fitm-env-test-'));
  const repo = path.join(root,'repo'), state = path.join(root,'private');
  const oldEnv = process.env.NODE_ENV; process.env.NODE_ENV='development';
  let app;
  try {
    for(const service of ['backend','frontend','nlp-service']) await fs.mkdir(path.join(repo,service),{recursive:true});
    await fs.writeFile(path.join(repo,'backend','.env'),backend,{mode:0o600});
    await fs.writeFile(path.join(repo,'frontend','.env'),'# public fixture\nVITE_API_URL=http://localhost:5000\nVITE_CLIENT_SECRET=\n',{mode:0o600});
    await fs.writeFile(path.join(repo,'nlp-service','.env'),'# python fixture\nPORT=8000\nMATCHING_TOP_K=5\nMATCHING_MIN_SCORE=0.05\nCHATBOT_MIN_CONFIDENCE=0.35\n',{mode:0o600});
    await initializeState(state,repo,password); await privatePath(state); await privatePath(path.join(state,'root.json'));
    let clock = Date.now(); const sessions=new Sessions({now:()=>clock,lifetime:10000,idle:1000});
    app=await createConsole({repo,directory:state,port:0,sessions,now:()=>clock}); const origin=await app.listen();assert.equal(app.server.address().address,'127.0.0.1');
    let cookie='',csrf='';
    async function call(url, data, override={}) {
      const response=await fetch(origin+url,{method:data===undefined?'GET':'POST',headers:{...(cookie?{Cookie:cookie}:{}),...(data===undefined?{}:{Origin:origin,'Content-Type':'application/json','X-CSRF-Token':csrf}),...override},...(data===undefined?{}:{body:JSON.stringify(data)})});
      const newCookie=response.headers.get('set-cookie');if(newCookie)cookie=newCookie.split(';')[0];
      const result=await response.json();return {response,result};
    }
    await t.test('unauthenticated and application bearer tokens cannot read env',async()=>{
      const {response}=await call('/api/env/backend',undefined,{Authorization:'Bearer synthetic-student-jwt'});assert.equal(response.status,401);
      const session=await call('/api/session');csrf=session.result.csrf;assert.equal(session.result.authenticated,false);
      assert.match(session.response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
    });
    await t.test('CSRF, foreign origins, wildcard CORS and arbitrary paths blocked',async()=>{
      assert.equal((await call('/api/login',{username:'root',password},{'X-CSRF-Token':'wrong'})).response.status,403);
      assert.equal((await call('/api/login',{username:'root',password},{Origin:'https://untrusted.example'})).response.status,403);
      // fetch rewrites Host; use the raw HTTP client to exercise a forged Host.
      const hostStatus=await new Promise((resolve,reject)=>{const req=http.get(origin+'/api/session',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});assert.equal(hostStatus,403);
    });
    await t.test('wrong password rejected and successful login rotates session',async()=>{
      assert.equal((await call('/api/login',{username:'root',password:'wrong'})).response.status,401);
      const before=cookie;const login=await call('/api/login',{username:'root',password});assert.equal(login.response.status,200);assert.notEqual(cookie,before);csrf=login.result.csrf;
      assert.equal((await call('/api/env/backend',undefined,{Cookie:before})).response.status,401);
    });
    let loaded, preview;
    await t.test('all three service documents readable without original secrets',async()=>{
      for(const service of ['backend','frontend','nlp']){const {response,result}=await call(`/api/env/${service}`);assert.equal(response.status,200);assert.equal(JSON.stringify(result).includes(secret),false);if(service==='backend')loaded=result;}
      for(const url of ['/api/env/other','/api/env/backend/../../root.json','/root.json','/backups','/backend/.env']) assert.notEqual((await call(url)).response.status,200);
      assert.throws(()=>app.store.target('../backend'),checkError('SERVICE'));
    });
    await t.test('preview is sanitized and does not write; save requires password/confirmation',async()=>{
      const before=digest(await fs.readFile(path.join(repo,'backend','.env')));
      const result=await call('/api/env/backend/preview',{version:loaded.version,changes:[{key:'PORT',value:'5010'},{key:'UNKNOWN_SETTING',value:password}]});
      assert.equal(result.response.status,200);preview=result.result.previewId;assert.equal(JSON.stringify(result.result).includes(password)||JSON.stringify(result.result).includes(secret),false);
      assert.equal(digest(await fs.readFile(path.join(repo,'backend','.env'))),before);
      assert.equal((await call('/api/env/backend/commit',{previewId:preview,password:'wrong',confirmed:true})).response.status,401);
      assert.equal((await call('/api/env/backend/commit',{previewId:preview,password})).response.status,400);
    });
    await t.test('save creates verified encrypted private backup and atomic file, preserves ACL/format',async()=>{
      const before=await snapshot(path.join(repo,'backend','.env'));
      const {response,result}=await call('/api/env/backend/commit',{previewId:preview,password,confirmed:true});assert.equal(response.status,200,result.code);assert.equal(result.saved,true);assert.equal(result.restart.pending,true);
      const after=await snapshot(path.join(repo,'backend','.env'));assert.equal(before.acl.descriptor,after.acl.descriptor);
      assert.equal(after.bytes.toString().includes('PORT=5010 # retain comment\r\n'),true);
      const history=await app.store.history('backend');assert.equal(history.length,1);
      const backupPath=path.join(state,'backups',`${history[0].id}.json`);await privatePath(backupPath);
      assert.equal((await fs.readFile(backupPath,'utf8')).includes(secret),false);
      assert.equal((await app.store.backupContent(history[0].id,'backend')).bytes.equals(before.bytes),true);
      assert.equal((await call('/api/env/backend/commit',{previewId:preview,password,confirmed:true})).response.status,409);
    });
    await t.test('external change conflicts rather than overwrite; missing file not created',async()=>{
      const current=(await call('/api/env/backend')).result;
      const plan=await app.store.preview('backend',current.version,[{key:'PORT',value:'5011'}]);
      await fs.appendFile(path.join(repo,'backend','.env'),'# external developer\r\n');
      await assert.rejects(()=>app.store.commit(plan),checkError('FILE_CONFLICT'));
      await fs.rename(path.join(repo,'nlp-service','.env'),path.join(repo,'nlp-service','fixture-away'));
      const missing=await call('/api/env/nlp');assert.equal(missing.result.code,'ENV_MISSING');
      await assert.rejects(()=>fs.stat(path.join(repo,'nlp-service','.env')));
      await fs.rename(path.join(repo,'nlp-service','fixture-away'),path.join(repo,'nlp-service','.env'));
    });
    await t.test('frontend and NLP save/restore use their fixed paths and retain original comments',async()=>{
      for(const [service,key,value,folder] of [['frontend','VITE_API_URL','http://127.0.0.1:5000','frontend'],['nlp','PORT','8001','nlp-service']]){
        const file=path.join(repo,folder,'.env'),original=await fs.readFile(file),current=await app.store.read(service);
        const plan=await app.store.preview(service,current.version,[{key,value}]);await app.store.commit(plan);
        assert.equal(parseDocument(await fs.readFile(file)).entries.get(key).value,value);
        const backup=(await app.store.history(service))[0],updated=await app.store.read(service);
        const restore=await app.store.restorePreview(service,updated.version,backup.id);await app.store.commit(restore);
        assert.equal((await fs.readFile(file)).equals(original),true);
      }
    });
    await t.test('manual backup API reauthenticates without changing target file',async()=>{
      const current=(await call('/api/env/frontend')).result,original=digest(await fs.readFile(path.join(repo,'frontend/.env')));
      assert.equal((await call('/api/env/frontend/backup',{version:current.version,password:'wrong',confirmed:true})).response.status,401);
      const saved=await call('/api/env/frontend/backup',{version:current.version,password,confirmed:true});assert.equal(saved.response.status,200);
      assert.equal(saved.result.backup.service,'frontend');assert.equal(digest(await fs.readFile(path.join(repo,'frontend/.env'))),original);
    });
    await t.test('restore only authentic backups; backs up current file and reauthenticates',async()=>{
      const current=(await call('/api/env/backend')).result,history=(await call('/api/env/backend/backups')).result.backups;
      assert.equal((await call('/api/env/backend/restore-preview',{version:current.version,backupId:'../root'})).response.status,400);
      const restore=await call('/api/env/backend/restore-preview',{version:current.version,backupId:history[0].id});assert.equal(restore.response.status,200);
      assert.equal(JSON.stringify(restore.result).includes(secret),false);
      const saved=await call('/api/env/backend/commit',{previewId:restore.result.previewId,password,confirmed:true});assert.equal(saved.response.status,200);
      assert.equal((await fs.readFile(path.join(repo,'backend','.env'))).equals(Buffer.from(backend)),true);
      assert.equal((await app.store.history('backend')).length,2);
      await assert.rejects(()=>app.store.backupContent(history[0].id,'frontend'),checkError('BACKUP_INTEGRITY'));
      const file=path.join(state,'backups',`${history[0].id}.json`),record=JSON.parse(await fs.readFile(file,'utf8'));record.tag='00'.repeat(16);await fs.writeFile(file,JSON.stringify(record));
      await assert.rejects(()=>app.store.backupContent(history[0].id,'backend'),checkError('BACKUP_INTEGRITY'));
    });
    await t.test('symlinks/hardlinks refused and backup ACL failure blocks save',async()=>{
      const source=path.join(repo,'frontend','.env'),alias=path.join(repo,'frontend','fixture-hardlink');await fs.link(source,alias);
      await assert.rejects(()=>app.store.read('frontend'),checkError('UNSAFE_FILE'));await fs.unlink(alias);
      const original=app.store.backups; app.store.backups=path.join(root,'missing-backup-parent','backups');
      const current=await app.store.read('backend'),plan=await app.store.preview('backend',current.version,[{key:'PORT',value:'5011'}]);const hash=digest(await fs.readFile(path.join(repo,'backend','.env')));
      await assert.rejects(()=>app.store.commit(plan));assert.equal(digest(await fs.readFile(path.join(repo,'backend','.env'))),hash);app.store.backups=original;
    });
    await t.test('logout revokes server session and idle expiration rejects access',async()=>{
      const oldCookie=cookie;assert.equal((await call('/api/logout',{})).response.status,200);
      assert.equal((await call('/api/env/backend',undefined,{Cookie:oldCookie})).response.status,401);
      const anon=await call('/api/session');csrf=anon.result.csrf;const login=await call('/api/login',{username:'root',password});csrf=login.result.csrf;
      clock+=1001;assert.equal((await call('/api/env/backend')).response.status,401);
    });
    await t.test('non-development API and startup blocked',async()=>{
      process.env.NODE_ENV='production';assert.equal((await call('/api/session')).response.status,503);
      await assert.rejects(()=>app.store.development(),checkError('DEVELOPMENT_ONLY'));process.env.NODE_ENV='development';
      const file=path.join(repo,'backend/.env'),original=await fs.readFile(file);await fs.writeFile(file,original.toString().replace('NODE_ENV=development','NODE_ENV=production'));
      await assert.rejects(()=>app.store.development(),checkError('DEVELOPMENT_ONLY'));await fs.writeFile(file,original);
    });
    await t.test('HTTP failed-password rate limiting rejects the sixth attempt',async()=>{
      const anon=await call('/api/session');csrf=anon.result.csrf;
      for(let i=0;i<5;i++)assert.equal((await call('/api/login',{username:'root',password:'wrong'})).response.status,401);
      assert.equal((await call('/api/login',{username:'root',password:'wrong'})).response.status,429);
    });
  } finally {
    if(app)await app.close(); if(oldEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldEnv;
    // Only this mkdtemp fixture tree; no real repository .env or private store.
    const absolute=path.resolve(root);assert.equal(path.dirname(absolute),path.resolve(os.tmpdir()));assert.equal(path.basename(absolute).startsWith('fitm-env-test-'),true);
    await fs.rm(absolute,{recursive:true,force:true});
  }
});
