const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const workspace = path.resolve(__dirname, '../../../..');
const original = path.join(workspace, 'backend/scripts/verifyGoogleLoginBrowser.js');
const source = fs.readFileSync(original, 'utf8');
const mode = process.argv[2];
function compile(code) {
  const runner = new Module(original, module);
  runner.filename = original;
  runner.paths = Module._nodeModulePaths(path.dirname(original));
  runner._compile(code, original);
}
if (mode === 'mock') {
  compile(source
    .replace('path.join(workspace, "frontend/dist")', 'path.join(workspace, "docs/audits/evidence/google-oauth-development-config/build")')
    .replace('path.join(workspace, "docs/audits/evidence/google-oauth")', 'path.join(workspace, "docs/audits/evidence/google-oauth-development-config/browser-mock")'));
} else if (mode === 'live-disabled') {
  compile(source.slice(0, source.indexOf('async function main()')) + String.raw`
async function main() {
  let edge, profile, tab;
  const results = { scope: 'Live Development browser, Google flags disabled; GET only; no credentials submitted', provider: 'NOT TESTED', cases: [], errors: [], mutationsBlocked: 0, googleProviderRequests: 0 };
  const evidence = path.join(workspace, 'docs/audits/evidence/google-oauth-development-config/browser-live-disabled');
  try {
    await fs.mkdir(evidence, {recursive:true});
    profile = await fs.mkdtemp(path.join(os.tmpdir(), 'fitm-config-browser-'));
    edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new','--disable-extensions','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'--no-first-run','--disable-background-networking','about:blank'], {windowsHide:true,stdio:'ignore'});
    results.stage='Edge startup';
    let debugPort;
    await until(async()=>{try{debugPort=Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split(String.fromCharCode(10))[0]);return !!debugPort;}catch{return false;}},'Edge');
    results.stage='CDP connection';
    const target=await(await fetch('http://127.0.0.1:'+debugPort+'/json/new?about:blank',{method:'PUT'})).json();
    tab=await connect(target.webSocketDebuggerUrl,async event=>{
      if(event.method==='Runtime.exceptionThrown') results.errors.push('BROWSER_RUNTIME_EXCEPTION');
      if(event.method!=='Fetch.requestPaused') return;
      const {requestId,request}=event.params;
      const url=new URL(request.url);
      if(['accounts.google.com','www.googleapis.com'].includes(url.hostname)) results.googleProviderRequests++;
      if(!['GET','HEAD','OPTIONS'].includes(request.method)) {results.mutationsBlocked++;await tab.send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});return;}
      if(!['localhost','127.0.0.1'].includes(url.hostname)) {await tab.send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});return;}
      await tab.send('Fetch.continueRequest',{requestId});
    });
    await tab.send('Page.enable');await tab.send('Runtime.enable');
    await tab.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
    const pages={student:'login.html',teacher:'teacher-login.html',department_head:'department-head-login.html',department_staff:'staff-login.html'};
    for(const [role,page] of Object.entries(pages))for(const width of [1440,390]){
      results.stage=role+' '+width;
      await tab.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
      await tab.send('Page.navigate',{url:'http://localhost:5173/'+page});
      await until(()=>tab.evaluate("document.querySelector('#googleLogin .login-message')?.textContent.includes('ยังไม่เปิดใช้งาน')"),'Disabled Google state');
      assert.equal(await tab.evaluate("document.querySelector('.auth-form').inert"),false);
      assert.equal(await tab.evaluate("!!document.querySelector('.auth-form input[type=password]')"),true);
      assert.equal(await tab.evaluate("!document.querySelector('.auth-form button[type=submit]').disabled"),true);
      if(role==='student')assert.equal(await tab.evaluate("!!document.getElementById('rememberMe')"),true);
      await tab.evaluate('Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{})))');
      const noOverflow=await tab.evaluate('document.documentElement.scrollWidth<=innerWidth');assert.equal(noOverflow,true);
      const shot=await tab.send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(evidence,role+'-'+width+'.png'),Buffer.from(shot.data,'base64'));
      results.cases.push({role,width,status:'PASS',passwordFormEnabled:true,googleDisabledMessage:true,noHorizontalOverflow:noOverflow});
    }
    assert.equal(results.mutationsBlocked,0);assert.equal(results.googleProviderRequests,0);assert.deepEqual(results.errors,[]);results.status='PASS';
  } catch(error) {
    results.status='FAIL';results.failure=error.message.startsWith('Timeout:')?error.message:error.name;throw error;
  } finally {
    tab?.socket.close();
    if(edge){edge.kill();await new Promise(resolve=>{if(edge.exitCode!==null)resolve();else edge.once('exit',resolve);});}
    if(profile){assert.equal(path.dirname(profile),path.resolve(os.tmpdir()));assert.ok(path.basename(profile).startsWith('fitm-config-browser-'));await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
    await fs.writeFile(path.join(evidence,'browser-results.json'),JSON.stringify(results,null,2));
  }
  console.log(JSON.stringify({status:results.status,cases:results.cases.length,scope:results.scope,provider:results.provider}));
}
main().catch(()=>{console.error('Live disabled browser acceptance failed; see status evidence');process.exitCode=1;});
`);
} else throw Error('EXPECTED_MOCK_OR_LIVE_DISABLED');
