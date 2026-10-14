// Exactly two synthetic OCR jobs and one admission-control probe. No database.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const workspace=path.resolve(__dirname,'../..');
const script=String.raw`
import sys,json,types,time,concurrent.futures,pathlib,httpx,threading
data=json.load(sys.stdin);m=types.ModuleType('fixture');exec(data['fixture'],m.__dict__)
scan=m.build_fixture(mode='scan',fields={});text=m.build_fixture()
def workers():
 count=0
 for directory in pathlib.Path('/proc').glob('[0-9]*'):
  try:
   args=(directory/'cmdline').read_bytes().split(b'\x00')
   if b'app.services.profile_pdf' in args:count+=1
  except (OSError,PermissionError):pass
 return count
assert workers()==0,'Run bounded capacity check when no other profile PDF worker is active'
before=set(pathlib.Path('/tmp').glob('fitm-profile-pdf-*'))
samples=[];stop=threading.Event()
def sample():
 while not stop.is_set():
  try:
   memory=int(pathlib.Path('/sys/fs/cgroup/memory.current').read_text())
   cpu=dict(line.split() for line in pathlib.Path('/sys/fs/cgroup/cpu.stat').read_text().splitlines())
   samples.append({'seconds':time.perf_counter(),'memory_bytes':memory,'cpu_usage_us':int(cpu['usage_usec'])})
  except OSError:pass
  stop.wait(.05)
def request(pdf):
 with httpx.Client(timeout=60) as client:
  response=client.post('http://127.0.0.1:8000/api/v1/profile-pdf',files={'file':('synthetic.pdf',pdf,'application/pdf')})
  return {'status':response.status_code,'method':response.json().get('method'),'detail':response.json().get('detail')}
sampling=threading.Thread(target=sample);sampling.start();start=time.perf_counter()
try:
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
  pair=[executor.submit(request,scan) for _ in range(2)]
  deadline=time.perf_counter()+5
  while workers()<2 and time.perf_counter()<deadline:time.sleep(.02)
  active=workers();assert active==2,'Expected two actual OCR workers'
  third=request(text);results=[job.result() for job in pair]
finally:stop.set();sampling.join()
elapsed=time.perf_counter()-start
assert all(job['status']==200 for job in results),results
assert third['status']==503 and third['detail']=='PDF_PROCESSOR_BUSY',third
cpu_seconds=(samples[-1]['cpu_usage_us']-samples[0]['cpu_usage_us'])/1e6 if len(samples)>1 else None
duration=samples[-1]['seconds']-samples[0]['seconds'] if len(samples)>1 else None
print(json.dumps({'status':'PASS','concurrent_ocr_jobs':2,'third_admission_probe':third,'completed_jobs':results,'wall_seconds':elapsed,'sample_interval_seconds':.05,'sample_count':len(samples),'container_baseline_memory_bytes':samples[0]['memory_bytes'] if samples else None,'container_peak_observed_memory_bytes':max(x['memory_bytes'] for x in samples) if samples else None,'container_cpu_seconds':cpu_seconds,'container_cpu_percent_one_core':cpu_seconds/duration*100 if duration else None,'measurement_scope':'entire NLP container cgroup; includes existing application and OCR processes; sampled peak, not exact instantaneous maximum','temporary_directories_cleaned':set(pathlib.Path('/tmp').glob('fitm-profile-pdf-*'))==before}))
`;
const result=spawnSync('docker',['exec','-i','intern_nlp_service','python','-c',script],{input:JSON.stringify({fixture:fs.readFileSync(path.join(workspace,'nlp-service/tests/profile_pdf_fixtures.py'),'utf8')}),encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:1024*1024});
let evidence;try{evidence=JSON.parse(result.stdout);}catch{evidence={status:'FAIL',exit_code:result.status,error:result.stderr?.slice(-1500)};}
fs.writeFileSync(path.join(workspace,'docs/audits/FITM_STUDENT_PROFILE_PHASE5_CAPACITY_RESULTS.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));process.exitCode=result.status===0&&evidence.status==='PASS'?0:1;
