// Optional local Chrome CDP acceptance. Credentials stay in process/browser memory.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
async function runBrowser({cdp,student,staff,teacherA,teacherB,pdf,readSQL}){
  assert.match(cdp,/^http:\/\/127\.0\.0\.1:\d+$/);
  const version=await(await fetch(cdp+'/json/version')).json(),ws=new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let sequence=0;const pending=new Map(),errors=[],googleRequests=new Set(),challengeResponses=new Set(),authRateLimits=new Map();
  ws.onmessage=event=>{const data=JSON.parse(event.data);if(data.id){const entry=pending.get(data.id);if(entry){pending.delete(data.id);data.error?entry.reject(Error(data.error.message)):entry.resolve(data.result);}}else if(data.method==='Runtime.exceptionThrown')errors.push(data.sessionId);
    else if(data.method==='Network.responseReceived'&&data.params.response.url.endsWith('/api/auth/google/challenge'))challengeResponses.add(data.sessionId+':'+data.params.requestId);
    else if(data.method==='Network.responseReceived'&&data.params.response.url.endsWith('/api/auth/unified-login')&&data.params.response.status===429){const headers=data.params.response.headers;const retry=Object.entries(headers).find(([key])=>key.toLowerCase()==='retry-after');authRateLimits.set(data.sessionId,Number(retry?.[1]||900));}
    else if(data.method==='Network.loadingFinished'&&challengeResponses.has(data.sessionId+':'+data.params.requestId))call('Network.getResponseBody',{requestId:data.params.requestId},data.sessionId).then(result=>{try{const body=JSON.parse(result.body);const id=body.requestId||body.data?.requestId;if(typeof id==='string')googleRequests.add(id);}catch{}}).catch(()=>{});
  };
  const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
  const evaluate=async(session,expression)=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},session);if(result.exceptionDetails)throw Error('Browser evaluation failed: '+result.exceptionDetails.text);return result.result.value;};
  const wait=async(session,expression)=>{for(let i=0;i<200;i++){if(await evaluate(session,expression))return;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Browser state timeout');};
  const pages=[];
  async function page(){const context=await call('Target.createBrowserContext');const target=await call('Target.createTarget',{url:'about:blank',browserContextId:context.browserContextId});const attached=await call('Target.attachToTarget',{targetId:target.targetId,flatten:true});const session=attached.sessionId;pages.push(session);await call('Page.enable',{},session);await call('Runtime.enable',{},session);await call('Network.enable',{},session);await call('Browser.setDownloadBehavior',{behavior:'deny',browserContextId:context.browserContextId});return session;}
  async function login(session,account,destination){
    await call('Page.navigate',{url:'http://localhost:5173/login.html'},session);await wait(session,'document.readyState==="complete"&&!!document.getElementById("loginForm")');
    const form=await call('Runtime.evaluate',{expression:'document.getElementById("loginForm")'},session);
    const listeners=await call('DOMDebugger.getEventListeners',{objectId:form.result.objectId},session);
    assert.ok(listeners.listeners.some(listener=>listener.type==='submit'),'Actual Login handler must be ready');
    // Actual Login form events -> existing unified endpoint -> normal app session.
    for(let attempt=0;attempt<2;attempt++){
    authRateLimits.delete(session);
    await evaluate(session,`document.getElementById('loginEmail').value=${JSON.stringify(account.email)};document.getElementById('loginPassword').value=${JSON.stringify(account.password)};document.querySelector('#loginForm button[type=submit]').click();true`);
    try{for(let i=0;i<200;i++){if(await evaluate(session,`location.pathname.includes(${JSON.stringify(destination)})`))return;if(authRateLimits.has(session))break;await new Promise(resolve=>setTimeout(resolve,50));}
      if(authRateLimits.has(session)&&attempt===0){console.log('Respecting existing Login rate-limit cooldown; no authentication controls changed');await new Promise(resolve=>setTimeout(resolve,Math.min(authRateLimits.get(session),900)*1000+500));continue;}
      const diagnostic=await evaluate(session,`({loginError:document.getElementById('loginMessage')?.textContent,formBusy:document.getElementById('loginForm')?.getAttribute('aria-busy'),dashboard:location.pathname.includes('student_coop')||location.pathname.includes('department_staff')})`);
      throw Error('Normal fixture Login did not reach dashboard: '+JSON.stringify(diagnostic));
    }catch(error){throw error;}}
  }
  async function hardReload(session,root){
    await evaluate(session,'window.__co09ReloadMarker=true');await call('Page.reload',{ignoreCache:true},session);
    await wait(session,`window.__co09ReloadMarker!==true&&!!document.querySelector('${root} [data-co09=detail] h3')`);
    await idle(session,'student');await click(session,'button[data-target="panel-coop"]','student');
  }
  const rootSelector=role=>role==='student'?'#co09Student':'#co09Manager';
  const idle=(session,role)=>wait(session,`document.querySelector('${rootSelector(role)}')?.getAttribute('aria-busy')==='false'`);
  async function click(session,selector,role){await evaluate(session,`document.querySelector(${JSON.stringify(selector)}).click();true`);await idle(session,role);}
  async function fields(session,form,values){await evaluate(session,`(()=>{const form=document.querySelector(${JSON.stringify(form)});for(const [key,value]of Object.entries(${JSON.stringify(values)})){const field=form.elements.namedItem(key);field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));}return true})()`);}
  async function successful(session,role){const error=await evaluate(session,`document.querySelector('${rootSelector(role)} [data-co09=message]').getAttribute('role')==='alert'`);assert.equal(error,false,'CO-09 operation error');}
  const sroot='#co09Student',mroot='#co09Manager',metrics=[];
  try{
    const s=await page(),manager=await page();
    await login(s,student,'student_coop');
    await wait(s,`!!document.querySelector('${sroot} [data-co09=detail] h3')`);await idle(s,'student');
    await click(s,'button[data-target="panel-coop"]','student');
    const initial=await readSQL();assert.equal(initial.document,undefined);assert.equal(initial.exam,undefined);
    await evaluate(s,`(()=>{const data=Uint8Array.from(atob(${JSON.stringify(pdf.toString('base64'))}),c=>c.charCodeAt(0));const files=new DataTransfer();files.items.add(new File([data],'CO-09-browser.pdf',{type:'application/pdf'}));const input=document.querySelector('${sroot} [data-co09=upload] input[type=file]');input.files=files.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
    await click(s,sroot+' [data-co09=upload] button','student');await successful(s,'student');
    const documentURL='https://example.com/browser-co09/'+student.id;
    await fields(s,sroot+' [data-co09=url]',{document_url:documentURL});await click(s,sroot+' [data-co09=url] button','student');await successful(s,'student');
    assert.equal((await readSQL()).document.document_url,documentURL);
    await hardReload(s,sroot);
    assert.equal(await evaluate(s,`document.querySelector('${sroot} [name=document_url]').value`),documentURL);
    await click(s,sroot+' [data-co09=preview]','student');await wait(s,`!!document.querySelector('${sroot} iframe')`);
    assert.equal(await evaluate(s,`(async()=>{const source=document.querySelector('${sroot} iframe').src;return source.startsWith('blob:')&&(await(await fetch(source)).blob()).type==='application/pdf'})()`),true);
    await click(s,sroot+' [data-co09=pdfPreview] button','student');
    await login(manager,staff,'department_staff');await wait(manager,`!!document.querySelector('${mroot} [data-co09=search]')`);await idle(manager,'staff');
    await fields(manager,mroot+' [data-co09=search]',{search:student.student_id});await click(manager,mroot+' [data-co09=search] button','staff');
    assert.equal(await evaluate(manager,`document.querySelectorAll('${mroot} .co09-list .co09-card').length`),1);
    await click(manager,mroot+' .co09-list .co09-card button','staff');
    const review=mroot+' [data-co09=review]',schedule=mroot+' [data-co09=schedule]';
    await fields(manager,review,{review_status:'needs_revision',review_reason:'Browser real API: revise CO-09'});await click(manager,review+' button','staff');await successful(manager,'staff');
    await click(s,sroot+' [data-co09=refresh]','student');assert.equal(await evaluate(s,`document.querySelector('${sroot} [data-co09=detail]').textContent.includes('Browser real API: revise CO-09')`),true);
    await fields(manager,review,{review_status:'approved',review_reason:''});await click(manager,review+' button','staff');await successful(manager,'staff');
    await fields(manager,schedule,{status:'scheduled',day:'2026-12-13',start:'09:00',end:'10:00',mode:'onsite',location:'CO09-BROWSER-A',meeting_url:'',notes:'Browser Development acceptance'});
    for(const teacher of [teacherA,teacherB]){await click(manager,mroot+' [data-co09=add]','staff');await evaluate(manager,`(()=>{const select=document.querySelector('${mroot} [data-co09=committee]').lastElementChild.querySelector('[data-teacher]');select.value=${JSON.stringify(teacher)};select.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);}
    await click(manager,schedule+' button[type=submit]','staff');await successful(manager,'staff');assert.equal((await readSQL()).members,2);
    await click(s,sroot+' [data-co09=refresh]','student');assert.equal(await evaluate(s,`document.querySelector('${sroot} [data-co09=detail]').textContent.includes('CO09-BROWSER-A')`),true);
    await hardReload(s,sroot);
    assert.equal(await evaluate(s,`document.querySelector('${sroot} [data-co09=detail]').textContent.includes('CO09-BROWSER-A')`),true);
    await fields(manager,schedule,{status:'scheduled',day:'2026-12-14',start:'11:00',end:'12:00',location:'CO09-BROWSER-B'});
    await click(manager,mroot+' [data-co09=committee] .co09-committee-row button','staff');
    await click(manager,schedule+' button[type=submit]','staff');await successful(manager,'staff');assert.equal((await readSQL()).members,1);
    await fields(manager,schedule,{status:'rescheduled',day:'2026-12-15',reason:''});await click(manager,schedule+' button[type=submit]','staff');
    assert.equal(await evaluate(manager,`document.querySelector('${mroot} [data-co09=message]').getAttribute('role')==='alert'`),true);
    await fields(manager,schedule,{reason:'Browser reschedule reason'});await click(manager,schedule+' button[type=submit]','staff');await successful(manager,'staff');
    for(const status of ['cancelled','scheduled','completed']){await fields(manager,schedule,{status,reason:status==='cancelled'?'Browser cancellation reason':''});await click(manager,schedule+' button[type=submit]','staff');await successful(manager,'staff');}
    const persisted=await readSQL();assert.equal(persisted.exam.status,'completed');assert.equal(persisted.exam.location,'CO09-BROWSER-B');assert.equal(persisted.members,1);
    assert.equal(await evaluate(manager,`document.querySelector('${mroot} .co09-list').textContent.includes('CO09-BROWSER-B')&&document.querySelector('${mroot} .co09-list').textContent.includes('สอบเสร็จสิ้น')`),true,'Queue must show acknowledged latest schedule');
    await click(s,sroot+' [data-co09=refresh]','student');await successful(s,'student');
    // A real transport failure followed by retry. No API mocking or feature flags.
    await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1},s);
    await click(s,sroot+' [data-co09=refresh]','student');assert.equal(await evaluate(s,`document.querySelector('${sroot} [data-co09=message]').getAttribute('role')==='alert'`),true);
    await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1},s);
    await evaluate(s,`document.querySelector('${sroot} [data-co09=refresh]').click();true`);await idle(s,'student');await successful(s,'student');
    for(const [width,height]of [[1280,800],[768,1024],[390,844],[320,568]])for(const [session,role]of [[s,'student'],[manager,'staff']]){
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600},session);
      const root=rootSelector(role);await evaluate(session,`document.querySelector('${root}').scrollIntoView({block:'start'});true`);
      const metric=await evaluate(session,`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const root=document.querySelector('${root}'),r=root.getBoundingClientRect();resolve({width:root.clientWidth,scroll:root.scrollWidth,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,invalidLabels:[...root.querySelectorAll('label')].filter(label=>!label.querySelector('input,select,textarea')).length,clip:{x:Math.max(0,r.x+scrollX),y:Math.max(0,r.y+scrollY),width:r.width,height:Math.min(r.height,${height}),scale:1}})})))`);
      assert.ok(metric.scroll<=metric.width+1,'CO-09 responsive overflow');assert.equal(metric.invalidLabels,0);metrics.push({width,height,role,componentOverflow:false,documentOverflow:metric.documentWidth>metric.viewport+1});
      if(process.env.FITM_CO09_BROWSER_OUTPUT){const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:metric.clip},session);await fs.writeFile(path.join(process.env.FITM_CO09_BROWSER_OUTPUT,`co09-real-${role}-${width}.png`),Buffer.from(shot.data,'base64'));}
    }
    assert.equal(errors.length,0,'Unhandled browser exceptions');
    console.log(JSON.stringify({browser:version.Browser,evidence:'Real Browser + normal fixture login + running Development API + PostgreSQL SQL read-back',studentUploadURLPreviewReload:true,staffSearchReviewScheduleLifecycleCommittee:true,transportErrorRetry:true,responsive:metrics,superAdminLiveLogin:'NOT VERIFIED'}));
    return {googleRequests:[...googleRequests]};
  }finally{if(process.env.FITM_CO09_BROWSER_AUTH_LEDGER)await fs.writeFile(process.env.FITM_CO09_BROWSER_AUTH_LEDGER,JSON.stringify({googleRequests:[...googleRequests]}),{mode:0o600});await call('Browser.close').catch(()=>{});ws.close();}
}
module.exports={runBrowser};
