// Optional local Chrome QA; uses only disposable fixture credentials/env files.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { initializeState } from '../src/auth.js';
import { createConsole } from '../src/server.js';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
const root = await fs.mkdtemp(path.join(os.tmpdir(),'fitm-env-browser-'));
const repo = path.join(root,'repo'), state = path.join(root,'private'), profile = path.join(root,'chrome');
const password = randomBytes(24).toString('base64url'), secret = randomBytes(32).toString('hex');
let app, browser, socket;
const previousMode = process.env.NODE_ENV; process.env.NODE_ENV='development';
try {
  assert.equal(typeof WebSocket,'function','Browser smoke needs Node.js 24+');
  await fs.access(chromePath);
  for (const name of ['backend','frontend','nlp-service']) await fs.mkdir(path.join(repo,name),{recursive:true});
  await fs.writeFile(path.join(repo,'backend/.env'),`NODE_ENV=development\nPORT=5000\nDB_HOST=postgres\nDB_NAME=fixture\nDB_USER=fixture\nDB_PASSWORD=${secret}\nJWT_SECRET=${secret}\nFRONTEND_URL=http://localhost:5173\nGOOGLE_LOGIN_ENABLED=false\n`,{mode:0o600});
  await fs.writeFile(path.join(repo,'frontend/.env'),'VITE_API_URL=http://localhost:5000\n',{mode:0o600});
  await fs.writeFile(path.join(repo,'nlp-service/.env'),'PORT=8000\nMATCHING_TOP_K=5\n',{mode:0o600});
  await initializeState(state,repo,password);app=await createConsole({repo,directory:state,port:0});const origin=await app.listen();
  browser=spawn(chromePath,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
  let debuggerPort;
  for(let i=0;i<100;i++){try{debuggerPort=(await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await delay(100);}}
  assert.ok(debuggerPort,'Chrome debug listener not ready');
  const targets=await (await fetch(`http://127.0.0.1:${debuggerPort}/json/list`)).json();const target=targets.find(t=>t.type==='page');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0,exceptions=0;const pending=new Map();
  socket.addEventListener('message',event=>{const value=JSON.parse(event.data);if(value.method==='Runtime.exceptionThrown')exceptions++;if(value.id){const item=pending.get(value.id);pending.delete(value.id);if(value.error)item?.reject(new Error('CDP command failed'));else item?.resolve(value.result);}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const current=++id;pending.set(current,{resolve,reject});socket.send(JSON.stringify({id:current,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.equal(!!result.exceptionDetails,false,'Browser expression failed');return result.result.value;};
  const until=async expression=>{for(let i=0;i<160;i++){if(await evaluate(expression))return;await delay(150);}throw Error('Browser UI wait timed out');};
  const fill=async(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await send('Runtime.enable');await send('Page.enable');await send('Page.navigate',{url:origin});
  await until(`document.getElementById('loginPassword') && !document.getElementById('loginPanel').hidden`);
  await fill('#loginPassword',password);await evaluate(`document.getElementById('loginForm').requestSubmit()`);
  await until(`!document.getElementById('workspace').hidden && document.querySelectorAll('.variable').length>3 && !document.getElementById('reload').disabled`);
  assert.equal(await evaluate(`document.body.textContent.includes(${JSON.stringify(secret)})`),false);
  assert.equal(await evaluate(`localStorage.length+sessionStorage.length`),0);
  for(const width of [1280,768,390,320]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=window.innerWidth`),true,`Overflow at ${width}px`);
  }
  await fill('#search','PORT');await until(`document.querySelectorAll('.variable').length===1`);
  await fill('.variable input','5012');await click('#save');await until(`document.getElementById('confirmation').open && !document.getElementById('confirmButton').disabled`);
  assert.equal(await evaluate(`document.getElementById('confirmation').textContent.includes('5000')&&document.getElementById('confirmation').textContent.includes('5012')`),true);
  await fill('#confirmPassword',password);await click('#confirmCheck');await evaluate(`document.getElementById('confirmForm').requestSubmit()`);
  await until(`!document.getElementById('confirmation').open && document.getElementById('restartStatus').textContent.includes('Pending') && !document.getElementById('reload').disabled`);
  assert.equal((await fs.readFile(path.join(repo,'backend/.env'),'utf8')).includes('PORT=5012'),true);
  await fill('.variable input','5013');await click('#cancel');await until(`document.getElementById('confirmation').open`);await evaluate(`document.getElementById('confirmForm').requestSubmit()`);await until(`!document.getElementById('reload').disabled && !document.getElementById('confirmation').open`);
  assert.equal((await fs.readFile(path.join(repo,'backend/.env'),'utf8')).includes('PORT=5012'),true);
  await click('#backups button');await until(`document.getElementById('confirmation').open && !document.getElementById('confirmButton').disabled`);await fill('#confirmPassword',password);await click('#confirmCheck');await evaluate(`document.getElementById('confirmForm').requestSubmit()`);
  await until(`!document.getElementById('confirmation').open && !document.getElementById('reload').disabled`);
  assert.equal((await fs.readFile(path.join(repo,'backend/.env'),'utf8')).includes('PORT=5000'),true);
  await click('[data-service=frontend]');await until(`document.getElementById('serviceTitle').textContent==='Frontend' && !document.getElementById('reload').disabled`);
  await click('[data-service=nlp]');await until(`document.getElementById('serviceTitle').textContent==='NLP Service' && !document.getElementById('reload').disabled`);
  assert.equal(await evaluate(`document.getElementById('restartAdvice').textContent.includes('ไม่มีผล')`),true);
  await click('#logout');await until(`!document.getElementById('loginPanel').hidden`);
  assert.equal(await evaluate(`document.querySelectorAll('#variables input').length`),0);assert.equal(exceptions,0);
  console.log('PASS Chrome fixture UI: Login, secret masking/no browser storage, search/edit/preview/reauth/save, cancel, restore, tabs, NLP warning, Logout; 1280/768/390/320 px without horizontal overflow.');
  await send('Browser.close').catch(()=>{});
} finally {
  socket?.close(); if(browser&&!browser.killed)browser.kill();if(app)await app.close();
  if(previousMode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previousMode;
  assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.equal(path.basename(root).startsWith('fitm-env-browser-'),true);
  for(let attempt=0;attempt<20;attempt++){try{await fs.rm(root,{recursive:true,force:true});break;}catch{await delay(200);}}
}
