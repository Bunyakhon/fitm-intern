// Synthetic fixture accuracy + measured local worker resource usage. No DB writes.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const workspace=path.resolve(__dirname,'../..');
const sources=Object.fromEntries(fs.readdirSync(path.join(workspace,'nlp-service/tests')).filter(x=>x.endsWith('.py')).map(x=>[x,fs.readFileSync(path.join(workspace,'nlp-service/tests',x),'utf8')]));
const script=String.raw`
import sys,json,tempfile,pathlib,base64,subprocess,time,re,os
data=json.load(sys.stdin)
with tempfile.TemporaryDirectory(prefix='fitm-profile-phase5-') as directory:
 for name,source in data['sources'].items():pathlib.Path(directory,name).write_text(source,encoding='utf8')
 sys.path.insert(0,directory)
 from profile_phase5_fixtures import fixtures,flattened
 items=fixtures(base64.b64decode(data['font']))
 child="import sys,json,time,resource;from app.api.v1.profile_pdf import run_worker;start=time.perf_counter();result=run_worker(sys.stdin.buffer.read());r=resource.getrusage(resource.RUSAGE_CHILDREN);print(json.dumps({'result':result,'wall_seconds':time.perf_counter()-start,'cpu_seconds':r.ru_utime+r.ru_stime,'peak_descendant_rss_kib':r.ru_maxrss}))"
 measurements=[]
 for item in items:
  before=set(pathlib.Path('/tmp').glob('fitm-profile-pdf-*'))
  run=subprocess.run([sys.executable,'-c',child],input=item['pdf'],capture_output=True,timeout=65,check=True)
  measured=json.loads(run.stdout);result=measured.pop('result');actual=flattened(result);expected=item['expected']
  exact=[key for key,value in expected.items() if key in actual and actual[key]==value]
  missing=[key for key in expected if key not in actual]
  wrong=[key for key,value in expected.items() if key in actual and actual[key]!=value]
  recognized=[key for key,value in expected.items() if any(type(value)==type(found) and value==found for found in actual.values())]
  normalized=[key for key,value in expected.items() if key in actual and re.sub(r'\s','',str(actual[key]))==re.sub(r'\s','',str(value))]
  checks=item['checkboxes'];check_exact=[key for key in checks if key in exact]
  error_pass=result.get('error')==item.get('error') if item.get('error') else not result.get('error')
  blank_pass=not result.get('candidates') and all(not rows for rows in result.get('records',{}).values()) if item.get('no_candidates_or_children') else True
  measurements.append({'name':item['name'],'pages':4,'bytes':len(item['pdf']),'method':result.get('method'),'expected_error':item.get('error'),'actual_error':result.get('error'),'behavior_pass':error_pass and blank_pass,'expected_fields':len(expected),'correctly_extracted_values_any_key':len(recognized),'correctly_mapped_values':len(exact),'field_extraction_accuracy':len(recognized)/len(expected) if expected else None,'field_mapping_accuracy_among_recognized':len(exact)/len(recognized) if recognized else None,'correct_key_and_value_accuracy':len(exact)/len(expected) if expected else None,'whitespace_normalized_correct_count_for_analysis_only':len(normalized),'unreadable_field_keys':missing,'wrong_field_keys':wrong,'manual_corrections_required':len(missing)+len(wrong),'checkbox_expected':len(checks),'checkbox_correct':len(check_exact),'checkbox_accuracy':len(check_exact)/len(checks) if checks else None,'unexpected_field_keys':sorted(set(actual)-set(expected)),'warnings':result.get('warnings',[]),'temporary_directories_cleaned':set(pathlib.Path('/tmp').glob('fitm-profile-pdf-*'))==before,**measured})
 from fastapi.testclient import TestClient
 from app.main import app
 import pytest
 with TestClient(app) as lifecycle:status=pytest.main(['-q',directory,'-p','no:cacheprovider'])
 print('FITM_PHASE5_JSON='+json.dumps({'measurements':measurements,'test_exit_code':status,'resource_measurement':'Linux resource.getrusage(RUSAGE_CHILDREN): actual worker plus OCR descendants; peak is maximum descendant RSS, not sum/concurrent container memory','external_services_used':False}))
 sys.exit(status)
`;
const result=spawnSync('docker',['exec','-i','intern_nlp_service','python','-c',script],{input:JSON.stringify({sources,font:fs.readFileSync('C:/Windows/Fonts/tahoma.ttf').toString('base64')}),encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:3*1024*1024});
const output=result.stdout||'',line=output.split('\n').find(x=>x.startsWith('FITM_PHASE5_JSON='));
const evidence={status:result.status===0&&line?'PASS':'FAIL',exit_code:result.status,...(line?JSON.parse(line.slice('FITM_PHASE5_JSON='.length)):{}),test_output:output.split('FITM_PHASE5_JSON=')[0].slice(-10000),error:result.stderr?.slice(-2000),finished_at:new Date().toISOString()};
fs.writeFileSync(path.join(workspace,'docs/audits/FITM_STUDENT_PROFILE_PHASE5_NLP_RESULTS.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({status:evidence.status,exit_code:evidence.exit_code,fixtures:evidence.measurements?.map(({name,correct_key_and_value_accuracy,unreadable_field_keys,wrong_field_keys,wall_seconds})=>({name,correct_key_and_value_accuracy,unreadable_field_keys,wrong_field_keys,wall_seconds})),tests:evidence.test_output.slice(-1200)}));
process.exitCode=result.status===0&&line?0:1;
