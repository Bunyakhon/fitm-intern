// Synthetic PDF fixtures only. Existing NLP tests run in a private temporary directory.
const fs = require("node:fs"), path = require("node:path"), { spawnSync } = require("node:child_process");
const workspace = path.resolve(__dirname,"../..");
const directory = path.join(workspace,"nlp-service/tests");
const sources = Object.fromEntries(fs.readdirSync(directory).filter(name=>name.endsWith(".py")).map(name=>[name,fs.readFileSync(path.join(directory,name),"utf8")]));
const script = "import sys,json,tempfile,pathlib,pytest;from fastapi.testclient import TestClient;from app.main import app;data=json.load(sys.stdin);\nwith tempfile.TemporaryDirectory(prefix='fitm-profile-pdf-tests-') as directory:\n for name,source in data.items(): pathlib.Path(directory,name).write_text(source,encoding='utf8')\n sys.path.insert(0,directory)\n with TestClient(app) as lifecycle:\n  status=pytest.main(['-q',directory,'-p','no:cacheprovider'])\nsys.exit(status)";
const result = spawnSync("docker",["exec","-i","intern_nlp_service","python","-c",script],{input:JSON.stringify(sources),windowsHide:true,encoding:"utf8",timeout:180000,maxBuffer:2*1024*1024});
const evidence = {command:"existing NLP tests + synthetic profile PDF parser tests in isolated temporary test directory",exit_code:result.status,output:result.stdout?.slice(-8000),error:result.stderr?.slice(-2000)};
fs.writeFileSync(path.join(workspace,"docs/audits/FITM_STUDENT_PROFILE_PHASE4_NLP_TEST_RESULTS.json"),JSON.stringify(evidence,null,2)+"\n");
console.log(JSON.stringify(evidence));process.exitCode=result.status===0?0:1;
