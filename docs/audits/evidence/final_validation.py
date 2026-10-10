from pathlib import Path
import csv,hashlib,json,re,subprocess
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'docs/audits'
baseline=json.loads((OUT/'evidence/baseline.json').read_text(encoding='utf8'))
old=json.loads((OUT/'evidence/historical-evidence-hashes.json').read_text(encoding='utf8'))
matrix=json.loads((OUT/'evidence/requirement-matrix.json').read_text(encoding='utf8'))
required=['FITM_FULL_PROJECT_AUDIT_2026-10-10.md','FITM_SCOPE_TRACEABILITY_2026-10-10.md','FITM_FILE_INVENTORY_2026-10-10.csv','FITM_MORNING_UXUI_TEST_CHECKLIST_2026-10-10.md','FITM_NEXT_DEVELOPMENT_PRIORITY_2026-10-10.md','FITM_AUDIT_COVERAGE_2026-10-10.md']
changed=[]
for p,h in {**baseline['protected_sha256'],**old}.items():
    if not(ROOT/p).is_file()or hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h:changed.append(p)
status=subprocess.run(['git','-c','core.quotepath=false','status','--short'],cwd=ROOT,capture_output=True,encoding='utf8').stdout
strip_audit=lambda s:'\n'.join(line for line in s.splitlines()if'docs/audits/'not in line)
diff=subprocess.run(['git','diff','--check'],cwd=ROOT,capture_output=True,encoding='utf8')
broken=[]
for p in OUT.glob('*.md'):
    for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf8')):
        if ':'in target or target.startswith('#'):continue
        name=target.split('#')[0]
        if name and not(p.parent/name).exists():broken.append({'report':p.name,'target':target})
with(OUT/'FITM_FILE_INVENTORY_2026-10-10.csv').open(encoding='utf-8-sig',newline='')as f:rows=list(csv.DictReader(f))
claims=[]
for p in OUT.glob('*.md'):
    if 'OFFICIAL SOURCE UNAVAILABLE'in p.read_text(encoding='utf8'):claims.append(p.name)
result={'requiredReportsPresent':all((OUT/n).is_file()for n in required),'requiredReports':required,
        'inventoryRows':len(rows),'uniqueInventoryPaths':len(set(r['File Path']for r in rows)),
        'matrixRows':len(matrix['requirements']),'matrixCounts':matrix['counts'],
        'protectedPathsChecked':len(baseline['protected_sha256'])+len(old),'changedProtectedPaths':changed,
        'originalGitStatusUnchanged':strip_audit(status)==strip_audit(baseline['status']['stdout']),
        'gitDiffCheckExit':diff.returncode,'brokenReportLinks':broken,'officialUnavailableDeclaredIn':claims,
        'newFilesOutsideAudit':sorted(p for p in subprocess.run(['git','-c','core.quotepath=false','ls-files','--others','--exclude-standard'],cwd=ROOT,capture_output=True,encoding='utf8').stdout.splitlines()if not p.startswith('docs/audits/')and p not in baseline['untracked_before_reports']),
        'primaryDatabaseWrites':'NONE','freshBrowserClaim':'NOT RUN / BROWSER NOT VERIFIED','overallAudit':'PENDING for exhaustive semantics/official source/live primary/provider/all-screen review'}
result['validation']='PASS'if(result['requiredReportsPresent']and len(rows)==360 and len(set(r['File Path']for r in rows))==360 and len(matrix['requirements'])==56 and sum(matrix['counts'].values())==56 and not changed and result['originalGitStatusUnchanged']and diff.returncode==0 and not broken and not result['newFilesOutsideAudit'])else'FAIL'
(OUT/'evidence/final-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(result,ensure_ascii=False,indent=2))
raise SystemExit(0 if result['validation']=='PASS'else 1)
