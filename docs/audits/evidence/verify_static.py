from pathlib import Path
import ast, hashlib, json, subprocess, re
from collections import Counter
ROOT=Path(__file__).resolve().parents[3]
scan=json.loads((Path(__file__).parent/'static-scan.json').read_text(encoding='utf8'))
result={'javascript':[],'python':[],'missing_html_targets':[],'category_counts':{},'protected_files':{}}
for row in scan:
    p=ROOT/row['path']
    if p.suffix=='.js':
        r=subprocess.run(['node','--check',str(p)],cwd=ROOT,capture_output=True)
        result['javascript'].append({'path':row['path'],'exit_code':r.returncode})
    if p.suffix=='.py':
        try:ast.parse(p.read_text(encoding='utf-8-sig'));status='PASS'
        except SyntaxError:status='FAIL'
        result['python'].append({'path':row['path'],'status':status})
    if p.suffix=='.html':
        for spec in re.findall(r'(?:href|src)=[\"\x27]([^\"\x27]+)',p.read_text(encoding='utf8')):
            if ':' in spec or spec.startswith('#'):continue
            spec=spec.split('#')[0].split('?')[0]
            target=ROOT/'frontend'/spec.lstrip('/') if spec.startswith('/') else p.parent/spec
            if spec and not target.exists():result['missing_html_targets'].append({'source':row['path'],'target':spec})
result['category_counts']=dict(Counter('/'.join(r['path'].split('/')[:3]) if '/src/' in r['path'] or '/app/' in r['path'] else '/'.join(r['path'].split('/')[:2]) if '/' in r['path'] else '[root]' for r in scan))
baseline=json.loads((Path(__file__).parent/'baseline.json').read_text(encoding='utf8'))
for p,h in baseline['protected_sha256'].items():
    result['protected_files'][p]='UNCHANGED' if (ROOT/p).exists() and hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h else 'CHANGED'
result['summary']={'javascript_checked':len(result['javascript']),'javascript_failed':sum(r['exit_code']!=0 for r in result['javascript']),
                   'python_checked':len(result['python']),'python_failed':sum(r['status']=='FAIL' for r in result['python']),
                   'protected_checked':len(result['protected_files']),'protected_changed':sum(v!='UNCHANGED' for v in result['protected_files'].values())}
(Path(__file__).parent/'static-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(result['summary']));print(json.dumps(result['missing_html_targets'],ensure_ascii=False))
