"""Read-only local inventory; writes only this audit's reports/evidence directory."""
from pathlib import Path
import csv, hashlib, json, os, re, subprocess
from collections import Counter
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'docs/audits'
EVIDENCE = OUT / 'evidence'
DATE = '2026-10-10'

def git(*args):
    p = subprocess.run(['git', '-c', 'core.quotepath=false', *args], cwd=ROOT,
                       capture_output=True, encoding='utf-8', errors='replace')
    return {'exit_code': p.returncode, 'stdout': p.stdout, 'stderr': p.stderr}

tracked = set(git('ls-files')['stdout'].splitlines())
untracked = set(git('ls-files', '--others', '--exclude-standard')['stdout'].splitlines())
counts, folders, excluded, paths = Counter(), set(), Counter(), []
skip_parts = {'node_modules', '.git', 'dist', 'build', '__pycache__', '.pytest_cache', '.venv', 'venv'}
all_files = []
for parent, dirs, files in os.walk(ROOT):
    relparent = Path(parent).relative_to(ROOT)
    if relparent.parts[:2] == ('docs', 'audits'):
        dirs[:] = []
        continue
    folders.add(relparent.as_posix())
    for name in files:
        p = Path(parent) / name
        rel = p.relative_to(ROOT).as_posix()
        all_files.append(rel)
        group = rel.split('/')[0] if '/' in rel else '[root]'
        counts[group] += 1
        reason = next((part for part in p.relative_to(ROOT).parts if part in skip_parts), None)
        if reason:
            excluded[reason] += 1
        elif rel.startswith('logs/'):
            excluded['logs'] += 1
        elif p.name == '.env' or p.suffix in {'.pem', '.key', '.crt'}:
            excluded['secrets: metadata only'] += 1
        elif rel.endswith('package-lock.json'):
            paths.append(rel)
        elif rel in tracked or rel in untracked or rel.startswith('.codex/'):
            paths.append(rel)
        else:
            excluded['other ignored/generated'] += 1

hashes = {}
for rel in paths:
    hashes[rel] = hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()
for rel in all_files:
    if Path(rel).name == '.env':
        hashes[rel] = hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()

baseline = {
    'captured_at_utc': datetime.now(timezone.utc).isoformat(),
    'report_date_timezone': '2026-10-10 Asia/Bangkok',
    'branch': git('branch', '--show-current'), 'head': git('rev-parse', 'HEAD'),
    'status': git('status', '--short'), 'diff_stat': git('diff', '--stat'),
    'diff_check': git('diff', '--check'),
    'tracked': sorted(tracked), 'untracked_before_reports': sorted(p for p in untracked if not p.startswith('docs/audits/')),
    'ignored': git('ls-files', '--others', '--ignored', '--exclude-standard', '--directory'),
    'physical_files_excluding_audit': len(all_files), 'physical_folders_excluding_audit': len(folders),
    'physical_by_root': dict(counts), 'excluded_file_counts': dict(excluded),
    'candidate_files': len(paths), 'protected_sha256': hashes,
}
if not (EVIDENCE / 'baseline.json').exists():
    (EVIDENCE / 'baseline.json').write_text(json.dumps(baseline, ensure_ascii=False, indent=2), encoding='utf-8')

def mapping(p):
    n = p.lower()
    for keys, scope in [(['supervision'], '2.3.3.1 / 2.3.5.1'),
                        (['internshiplog', 'internshipweek', 'internshipdaily', 'internshipreview'], '2.3.1.1(11) / 2.3.5.1(1,5)'),
                        (['coopactivit'], '2.3.2(6)'),
                        (['staffcoop', 'staffcancellation', 'coopdirect', 'roleworkflow'], '2.3.1.1(5,6) / 2.3.2(1,2) / 2.3.3 approvals'),
                        (['staffdocument', 'coopdocument', 'companyresponse'], '2.3.2(1,3) / 2.3.1.1(6)'),
                        (['companyevaluation'], '2.3.1.1(12)'),
                        (['projectadvisor', 'studentadvisor'], '2.3.1.1(7,8) / 2.3.3.1(2)'),
                        (['coopproject', 'studentcoopproject'], '2.3.1.1(9,13,14)'),
                        (['mentor'], '2.3.1.1(10) / 2.3.5.1'),
                        (['resume', 'matching'], '2.3.1.1(3,4)'),
                        (['chatbot', 'faq_seed'], '2.3.1.1(15) / 2.3.2(4)'),
                        (['job', 'recruit', 'captcha', 'companyverif', 'companyaccess'], '2.3.4 / 2.3.1.1(16)'),
                        (['departmenthead', 'department_head'], '2.3.3.2'),
                        (['teacher'], '2.3.3.1 / 2.3.3.2'),
                        (['profile', 'student.model'], '2.3.1.1(2)'),
                        (['auth', 'login', 'register', 'staff'], 'Authentication / RBAC')]:
        if any(k in n for k in keys): return scope
    return 'Cross-cutting / documentation / configuration'

contents = {}
for p in paths:
    if Path(p).suffix.lower() in {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf'}: continue
    if p.startswith('.codex/') or p.endswith('package-lock.json'): continue
    contents[p] = (ROOT / p).read_text(encoding='utf-8-sig', errors='replace')

direct_consumers = {p: [] for p in paths}
for consumer, source in contents.items():
    specs = re.findall(r'(?:require\([\"\x27]([^\"\x27]+)|from\s+[\"\x27]([^\"\x27]+)|(?:href|src)=[\"\x27]([^\"\x27]+))', source)
    for parts in specs:
        spec = next(v for v in parts if v).split('?')[0].split('#')[0]
        if not spec or ':' in spec: continue
        if spec.startswith('/src/') or spec.startswith('/images/'):
            target = ROOT / 'frontend' / spec.lstrip('/')
        elif spec.startswith('/'):
            target = ROOT / 'frontend' / spec.lstrip('/')
        elif spec.startswith('.') or consumer.endswith('.html'):
            target = (ROOT / consumer).parent / spec
        else:
            continue
        for candidate in [target, Path(str(target)+'.js'), target/'index.js']:
            try: relative = candidate.resolve().relative_to(ROOT).as_posix()
            except ValueError: continue
            if relative in direct_consumers:
                if consumer not in direct_consumers[relative]: direct_consumers[relative].append(consumer)
                break

details, rows = [], []
for p in sorted(paths):
    s = contents.get(p, '')
    suffix = Path(p).suffix or '[no extension]'
    if p.endswith('package-lock.json'): responsibility, review = 'Dependency lock metadata', 'METADATA ONLY'
    elif p.startswith('.codex/'): responsibility, review = 'Local agent configuration', 'METADATA ONLY'
    elif suffix in {'.png', '.jpg', '.jpeg', '.pdf'}: responsibility, review = 'Binary asset', 'METADATA ONLY'
    elif '/migrations/' in p: responsibility, review = 'Schema migration', 'STATIC SCANNED'
    elif '/models/' in p and suffix == '.js': responsibility, review = 'Sequelize data model', 'STATIC SCANNED'
    elif '/test/' in p or '/tests/' in p: responsibility, review = 'Automated tests / fixtures / acceptance runner', 'STATIC SCANNED'
    elif '/routes/' in p or '/api/' in p: responsibility, review = 'API route / client contract', 'STATIC SCANNED'
    elif '/services/' in p: responsibility, review = 'Business logic / provider integration', 'STATIC SCANNED'
    elif suffix == '.html': responsibility, review = 'HTML screen / navigation', 'STATIC SCANNED'
    elif '/pages/' in p: responsibility, review = 'UI behavior / orchestration', 'STATIC SCANNED'
    elif suffix == '.css': responsibility, review = 'Styles / responsive rules', 'STATIC SCANNED'
    elif suffix == '.md': responsibility, review = 'Documentation / recorded acceptance', 'STATIC SCANNED'
    elif '/scripts/' in p or '/seeders/' in p: responsibility, review = 'Operational / acceptance utility', 'STATIC SCANNED'
    else: responsibility, review = 'Configuration / shared infrastructure / data', 'STATIC SCANNED'
    imports = re.findall(r'(?:require\([\"\x27]([^\"\x27]+)|from\s+[\"\x27]([^\"\x27]+)|^from\s+([\w.]+)\s+import)', s, re.M)
    imports = [next(v for v in i if v) for i in imports]
    refs = []
    name = Path(p).stem.replace('.api', '').replace('.service', '').replace('.routes', '').replace('.model', '')
    if len(name) > 3:
        refs = [q for q, t in contents.items() if q != p and name in t]
    features = {}
    patterns = {
        'todo_fixme': r'\bTODO\b|\bFIXME\b',
        'mock_placeholder': r'\bmock\w*\b|\bplaceholder\b|\bdummy\b',
        'native_dialog': r'\b(?:alert|confirm|prompt)\s*\(',
        'local_storage': r'localStorage|sessionStorage',
        'inner_html': r'innerHTML',
        'responsive': r'@media|overflow-x|grid-template',
        'accessibility': r'aria-|tabindex|keydown|focus\(',
        'transaction_lock': r'transaction|LOCK|lock:',
        'tests': r'\b(?:test|it|describe)\s*\(|^def test_',
    }
    for key, pat in patterns.items():
        matches = [(i, line.strip()[:200]) for i, line in enumerate(s.splitlines(), 1) if re.search(pat, line, re.I)]
        features[key] = {'count': len(matches), 'samples': matches[:12]}
    funcs = re.findall(r'(?:async\s+)?function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\([^\n]*?\)\s*=>|^def\s+(\w+)', s, re.M)
    funcs = [next(x for x in f if x) for f in funcs]
    routes = re.findall(r'\b(?:router|app)\.(get|post|put|patch|delete|use)\s*\(\s*([\"\x27])([^\"\x27]+)\2', s)
    api = sorted(set(re.findall(r'[\"\x27`](/(?:api/)?(?:auth|student|teacher|staff|department-head|coop|mentor|job|internship|supervision)[^\"\x27`\n]*)', s)))
    tables = sorted(set(re.findall(r'tableName:\s*[\"\x27]([^\"\x27]+)|createTable\(\s*[\"\x27]([^\"\x27]+)', s)))
    tables = [next(x for x in t if x) for t in tables]
    test_refs = [q for q in refs if '/test/' in q or '/tests/' in q]
    notes = '; '.join(f'{k}={v["count"]}' for k,v in features.items() if v['count'])
    detail = {'path': p, 'lines': len(s.splitlines()), 'review': review,
              'imports': imports, 'direct_consumers': direct_consumers[p], 'reference_candidates': refs, 'functions': funcs,
              'routes': [(m, u) for m,_,u in routes], 'api_literals': api, 'tables': tables,
              'test_reference_candidates': test_refs, 'signals': features}
    details.append(detail)
    rows.append({'Folder': str(Path(p).parent).replace('\\','/'), 'File Path': p,
                 'File Type': suffix, 'Responsibility': responsibility, 'Scope Mapping': mapping(p),
                 'Status': review, 'Notes': notes + '; textual references are candidates, not proof of runtime use',
                 'Git State': 'TRACKED' if p in tracked else 'UNTRACKED' if p in untracked else 'IGNORED',
                 'Lines': len(s.splitlines()), 'Imports': '; '.join(imports),
                 'Direct Consumers': '; '.join(direct_consumers[p]) or ('models/index.js dynamic model registry' if p.endswith('.model.js') else 'No static direct import/link detected; not proof of dead code'),
                 'Functions': '; '.join(funcs),
                 'Reference Candidates': '; '.join(refs), 'API Literals': '; '.join(api),
                 'Tables': '; '.join(tables), 'Test Reference Candidates': '; '.join(test_refs),
                 'SHA256': hashes[p]})
with (OUT / f'FITM_FILE_INVENTORY_{DATE}.csv').open('w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=rows[0].keys()); w.writeheader(); w.writerows(rows)
(EVIDENCE / 'static-scan.json').write_text(json.dumps(details, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'files':len(paths),'static_scanned':len(contents),'physical_files':len(all_files),
                  'physical_folders':len(folders),'root_counts':dict(counts),'exclusions':dict(excluded),
                  'tracked':len(tracked),'untracked_original':len(baseline['untracked_before_reports'])}, ensure_ascii=False))
