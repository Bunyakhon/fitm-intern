const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const workspace=path.resolve(__dirname,'../..');
const env={...process.env};
for(const key of Object.keys(env))if(/DISPOSABLE_DATABASE_URL$|_TEST$|^COOP_TEST_BROWSER$/.test(key))delete env[key];
Object.assign(env,{RECRUITMENT_INTEGRATION_TEST:'false',ROLE_BACKEND_INTEGRATION_TEST:'false',STUDENT_FILE_MIGRATION_TEST:'false'});
function run(command,args,cwd){return new Promise(resolve=>{let stdout='',stderr='';const child=spawn(command,args,{cwd,env,windowsHide:true});child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);child.on('error',error=>resolve({status:'FAIL',exit_code:null,error:error.code}));child.on('close',code=>{const summary={};for(const key of ['tests','pass','fail','skipped','cancelled']){const match=stdout.match(new RegExp('(?:# |ℹ )'+key+' (\\d+)'));if(match)summary[key]=Number(match[1]);}resolve({status:code===0?'PASS':'FAIL',exit_code:code,summary,output:stdout.slice(-2200),stderr:stderr.slice(-1200)});});});}
async function main(){
 const backend=path.join(workspace,'backend'),frontend=path.join(workspace,'frontend');
 const files=fs.readdirSync(path.join(frontend,'test')).filter(x=>x.endsWith('.test.js')).map(x=>'test/'+x);
 const [backendTests,frontendTests,build]=await Promise.all([run(process.execPath,['--test'],backend),run(process.execPath,['--test',...files],frontend),run(process.execPath,[path.join(frontend,'node_modules/vite/bin/vite.js'),'build'],frontend)]);
 const diff=await run('git',['diff','--check'],workspace);
 const evidence={backend:backendTests,frontend:frontendTests,build,diff,finished_at:new Date().toISOString(),database_writing_opt_in_flags_disabled:true};
 fs.writeFileSync(path.join(workspace,'docs/audits/FITM_STUDENT_PROFILE_PHASE5_CHECK_RESULTS.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify(evidence));process.exitCode=[backendTests,frontendTests,build,diff].every(x=>x.status==='PASS')?0:1;
}
main().catch(error=>{console.error(error.code||error.message);process.exitCode=1;});
