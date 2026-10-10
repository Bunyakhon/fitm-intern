from pathlib import Path
from collections import Counter
import json,csv
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'docs/audits'
scan=json.loads((OUT/'evidence/static-scan.json').read_text(encoding='utf8'))
baseline=json.loads((OUT/'evidence/baseline.json').read_text(encoding='utf8'))
targeted='''backend/src/app.js
backend/src/config/database.js
backend/src/config/storage.js
backend/src/config/recruitment.js
backend/src/config/env.js
backend/src/config/oauth.js
backend/src/models/index.js
backend/src/models/student.model.js
backend/src/controllers/auth.controller.js
backend/src/controllers/studentProfile.controller.js
backend/src/controllers/jobMatching.controller.js
backend/src/controllers/teacher.controller.js
backend/src/controllers/mentorVerification.controller.js
backend/src/controllers/mentor.controller.js
backend/src/controllers/roleWorkflow.controller.js
backend/src/middlewares/auth.middleware.js
backend/src/middlewares/teacherAuth.middleware.js
backend/src/middlewares/upload.middleware.js
backend/src/services/roleWorkflow.service.js
backend/src/services/coopProjectAdvisor.service.js
backend/src/services/companyEvaluation.service.js
backend/src/services/studentCoopProject.service.js
backend/src/services/mentorToken.service.js
backend/src/services/internshipLog.service.js
backend/src/services/supervision.service.js
backend/src/services/supervisionResult.service.js
backend/src/services/coopActivity.service.js
backend/src/services/nlpMatching.client.js
backend/src/services/resumeOcr.client.js
backend/src/validators/roleWorkflow.validator.js
backend/src/db/migrate.js
backend/src/seeders/createDepartmentStaff.js
backend/scripts/staffCancellationFinalEvidence.js
backend/test/runStaffCancellationFinalAcceptance.ps1
backend/test/runStaffBrowserAcceptance.ps1
backend/test/runTeacherAdvisorAcceptance.ps1
backend/test/resumeUpload.test.js
backend/test/staffAcceptanceProcess.test.js
frontend/src/api/client.js
frontend/src/api/auth.api.js
frontend/src/api/mentorVerification.api.js
frontend/src/api/studentProfile.api.js
frontend/src/api/studentCoop.api.js
frontend/src/api/mentor.api.js
frontend/src/api/staffCoopRequests.api.js
frontend/src/api/staffDocuments.api.js
frontend/src/api/departmentHead.api.js
frontend/src/pages/index.js
frontend/src/pages/login.js
frontend/src/pages/register.js
frontend/src/pages/student_coop.js
frontend/src/pages/staffCoopRequests.js
frontend/src/pages/staffDocuments.js
frontend/src/ui/feedback.js
frontend/vite.config.js
backend/Dockerfile
frontend/Dockerfile
nlp-service/Dockerfile
docker-compose.yml
deploy.sh
nlp-service/app/main.py
nlp-service/app/core/config.py
nlp-service/app/api/v1/resume_ocr.py
nlp-service/app/services/chatbot_service.py
nlp-service/app/services/job_matching_service.py
nlp-service/app/services/matching_service.py
nlp-service/app/nlp/chatbot/intent_classifier.py
nlp-service/app/nlp/common/preprocessing.py
nlp-service/app/nlp/matching/feature_extraction.py
nlp-service/app/nlp/matching/similarity.py
nlp-service/app/schemas/job_matching.py
nlp-service/tests/test_chatbot.py
nlp-service/tests/test_job_matching.py'''.splitlines()
targeted=set(targeted)|{r['path']for r in scan if '/routes/'in r['path']or r['path'].endswith('.html')}
targeted={p for p in targeted if (ROOT/p).exists()}
depth=[]
for r in scan:
    p=r['path']
    if r['review']=='METADATA ONLY':label='METADATA ONLY'
    elif p in targeted:label='TARGETED SOURCE/CONTRACT REVIEW (may be excerpts); exhaustive semantics PENDING'
    elif p.endswith('.model.js'):label='REGISTERED MODEL METADATA REVIEW; exhaustive semantics PENDING'
    elif p.endswith('.css'):label='CSS STRUCTURAL/BUILD REVIEW; visual/keyboard PENDING'
    elif '/migrations/'in p:label='MIGRATION STRUCTURAL REVIEW; primary apply UNKNOWN; full rollback semantics PENDING'
    elif '/test/'in p or '/tests/'in p:label='TEST STRUCTURAL/EXECUTION REVIEW where enabled; per-assertion semantic review PENDING'
    else:label='STRUCTURAL ONLY; exhaustive semantic review PENDING'
    depth.append({'path':p,'depth':label,'wholeFileHumanReadClaim':False})
csvpath=OUT/'FITM_FILE_INVENTORY_2026-10-10.csv'
with csvpath.open(encoding='utf-8-sig',newline='')as f:rows=list(csv.DictReader(f))
by_path={r['path']:r['depth']for r in depth}
for row in rows:
    row['Audit Depth']=by_path[row['File Path']]
    row['Runtime Verification']='Feature-specific evidence in traceability; source existence/imports do not prove acceptance'
with csvpath.open('w',encoding='utf-8-sig',newline='')as f:
    w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
dirs=set()
for r in scan:
    for parent in (ROOT/r['path']).parents:
        if parent==ROOT:dirs.add('.');break
        dirs.add(parent.relative_to(ROOT).as_posix())
remaining=[r['path']for r in depth if r['depth']!='METADATA ONLY' and r['path']not in targeted]
data={'candidateFiles':len(scan),'developmentDirectoriesIncludingRoot':len(dirs),'targetedReviewFiles':len(targeted),
      'structuralTextFiles':sum(r['review']=='STATIC SCANNED'for r in scan),'metadataFiles':sum(r['review']=='METADATA ONLY'for r in scan),
      'remainingForInitialTargetedSemanticReview':remaining,'perFile':depth,'overall':'PENDING: official source, full semantics, live primary DB/providers/fresh all-screen browser'}
(OUT/'evidence/review-depth.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
md=f'''# FITM Audit coverage — 2026-10-10

**Overall: PENDING — ไม่รับรอง COMPLETE full semantic/official-scope/live acceptance.** Inventory และ structural read/scan ครบ candidate set; รายงาน/traceability/checklist จัดทำแล้ว. ความละเอียดของการตรวจแตกต่างกันตามหลักฐานและบันทึกแยกด้านล่าง

## Baseline / denominator

| Measure | Count / interpretation |
|---|---|
| Physical files excluding this audit output tree | {baseline['physical_files_excluding_audit']:,} |
| Physical directories including root, generated/dependencies/Git | {baseline['physical_folders_excluding_audit']:,} |
| Relevant development directories including ancestors/root | {len(dirs)} |
| Development/config/doc inventory candidates | {len(scan)} = 336 tracked + 21 original untracked + ignored config/locks3 |
| Text files read for structural extraction | 356, 47,344 lines; empty source/package initializers included |
| Metadata-only candidates | 4: PNG1, dependency locks2, .codex config1 |
| Targeted source/contract review | {len(targeted)} paths; selected excerpts or route/model/HTML contracts, **not a claim of every-line human read** |
| Other files requiring initial targeted semantic review | {len(remaining)}; exact paths in review-depth.json and CSV Audit Depth |
| Exhaustive semantic review | Still PENDING even within targeted set; do not subtract targeted paths as fully completed semantic audit |
| Source folder omitted without inventory | 0; semantic/runtime limitations explicitly recorded |
| Candidate entirely un-inventoried | 0 within discovered local tracked/untracked + identified ignored configs/locks |

Scan captures file/path/type/responsibility/scope candidate/imports/functions/API literals/table names/test textual references/static signals/SHA; [CSV](FITM_FILE_INVENTORY_2026-10-10.csv) has one row per candidate. `Direct Consumers` resolves static local import/HTML link paths; `Reference Candidates` and `Test Reference Candidates` are broader text matches and **not proof of import, execution, coverage or dead code**. Python package/dynamic backend models/Umzug/npm/redirect entries need their explicit runtime registries. Inventory `Status` is review status, not requirement implementation status

## Physical inventory by root

| Area | Files (includes ignored/generated) |
|---|---:|
'''
md+=''.join(f'| `{k}` | {v:,} |\n'for k,v in baseline['physical_by_root'].items())
md+='''
This snapshot excludes `docs/audits/` itself so generated audit helpers/build files do not inflate development coverage. Root6 files do not imply that a root `.env` exists. Physical 1,411 directory count includes root and generated trees; relevant directory count is a separate denominator

## Excluded file content / reason

| Category | Files | Reason / what was checked instead |
|---|---:|---|
| `.git` | 1,918 | internal objects/metadata; Git branch/HEAD/status/diff/check/tracked list inspected instead |
| `node_modules` | 7,998 | third-party dependency trees; manifests/lock metadata/build reviewed; no dependency CVE or full library-source audit |
| existing `frontend/dist` | 190 | generated output; source and a new build into audit-only output checked; existing dist preserved |
| historical `logs` | 393 | artifacts, not development source; inventoried/hashed, selected raw evidence/12 summaries/37 PNG metadata reviewed |
| `.pytest_cache` | 6 | generated test cache; runtime results assessed separately |
| `__pycache__` | 67 | compiled Python cache; source AST checked with no bytecode writes |
| `.env` private files | 3 | names/presence/hash only; no secrets emitted and no edits |
| other ignored/generated | 1 | `nlp-service/data/processed/chatbot/.gitkeep`, ignored empty marker; no business logic |
| Candidate logo/config/locks | 4 within360 | metadata-only as named above; do not double-count as excluded physical candidates |

Physical exclusions excluding candidate metadata total **10,576 = 10,936 − 360**. The393 historicallogs are counted as excluded source contents but selected acceptance evidence was inspected; they are not entirely ignored for verification

## Coverage by subsystem and evidence limits

| Area | Completed review / checks | Still PENDING / UNKNOWN |
|---|---|---|
| Root/Git/config/docs | baseline/hash/manifest/deployment static inventory; all12 docs content structurally scanned (root2 + docs9 + NLP README1) | exhaustive long-history documentation read and reconciliation with absent PDF |
| Backend routes | dry construction expands115 method/path; 15 route files and 3 role namespaces; auth/mount/consumer table | no fresh HTTP integration; broad dynamic variant body/ownership semantics not exhaustively verified |
| Models/migrations | registered36 model metadata and associations; all22 migrations structurally parsed/indexed | **primary apply state UNKNOWN**; exact live physical constraints/storage counts not inspected; full migration semantic/rollback re-review pending |
| Controllers/services/middleware/validators | allsource structurally read; targeted ownership/transaction/token/file/error/unfinished review; new tests203 PASS | remaining functions, concurrent legacy profile/advisor/photo paths and allnegative contracts require deeper feature review |
| Backend scripts/seeders/tests | all15 scripts,4seeders,46testfiles inventoried; 4PS parses0errors | Local runners not executed (mutate fixtures/accounts); fresh disposable SQL/Chrome cannot run with current Docker access |
| Frontend HTML/JS/CSS | all13 entry/navigation/source link reviews,26page modules,17adapters,11CSS; build123modules;253tests PASS | full per-button/form/custommodal live UX/accessibility and allresponsive widths for every screen |
| NLP | all35 Pythonfiles AST PASS; API/ThaiTF-IDF/cosine/classifier/OCR sources inspected | pytest absent; runtime/realOCR/Tesseract/Thaiquality/provider end-to-end; inferred chatbot lifespan issue not freshly reproduced |
| Data/assets | FAQ+empty markers inventoried; logo metadata | no realresume/job dataset evaluation or hidden raw/large model audit; no claimed trained model readiness from empty folders |
| Historical acceptance | feb769 final9stages/process0, browser28+13, SQL/TAP/cleanup record validation; older relevant raw logs | not a fresh browser or live Docker cleanup recheck; unchanged current source can still lack provenance binding to every historicalrun |

## Fresh tests: skipped, blocked and not run

- Backend in-process: **203 PASS / 0 FAIL / 17 SKIP / 0 TODO**. Disabled opt-ins: company evaluation+migration, calendarSQL,012/013/014migration,projectadvisorSQL,devcredentialsSQL,dailySQL,recruitmentSQL/lifecycle,roleworkflowSQL,documentsSQL,projectfilesSQL,010migration,supervisionSQL/resultsSQL. Exact names in `backend-in-process-tests.log`.
- Frontend in-process: **253 PASS / 0 FAIL / 2 SKIP**: `Student Co-op prerequisite real browser runtime checks`; `saved prerequisites and approval states through Student page and disposable PostgreSQL`.
- Canonical isolated Node test attempts: command exit1/spawnEPERM **BLOCKED**; did not produce a complete passing suite. Alternate permitted `--test-isolation=none --test-concurrency=1` run recorded distinctly; shared module/process state differs from canonicalisolated mode.
- Python pytest: exit1 “No module named pytest”; **BLOCKED**, not assertionFAIL and not syntaxFAIL.
- JavaScript syntax258 / PythonAST35 / PowerShellAST4: PASS. Syntax does not imply runtime acceptance.
- New frontend build: PASS with13 entries/123 modules into `docs/audits/evidence/frontend-build/`; existing `frontend/dist/` untouched.
- Fresh SQL/Chrome/manual/Desktop/Tablet/Mobile/provider/securitypenetration testing: **NOT RUN / BROWSER NOT VERIFIED for this audit session**. Historical fixtureChrome evidence retains feature-specific status.
- Compose quietparse succeeded, warning POSTGRES_PASSWORD absent; Docker engine read returned permissiondenied. No secondengine attempt or securitypolicy workaround.

## Evidence reviewed / provenance

`evidence/historical-evidence-review.json` links12 actualJSONsummaries +37PNGmetadata. The final `feb769…` run is newer than failed `6d835…` and `a76f…` runs; README/NEXT_DAYtop paragraphs refer to those earlier failures. Read-only audit checked `validateBrowser`, actualTAP and `cleanupRecords`; never invoked mutating evidenceCLI or rewrote previouslogs.

Historical related rawlogs inspected include companyresponse targetedSQL/Chrome, dailyfinalSQL/Chrome, supervisionChrome/finalregression, resultsfinalSQL/Chrome, activityChromevariants including finalcompletePASS and earlierfailures. Counts overlap and must not be summed. Four specific historicalmobilePNG screenshots visually reviewed: Staffcancellation, Studentcancellationmodal, Staffcalendar, Teacherresultdraft. Other33PNGfiles were checked for signature/dimensions/hash only, **not visually reviewed**.

Historical source provenance limitation: screenshots/logs have invocation/run IDs and actualresults; not all olderfeaturelogs include a reproducible SHA manifest tying every current file to thatrun. Verified refers to the recordedbehavior and its scoped acceptance. A changeduntracked/currentfile outside thattestedpath cannot inherit verifiedstatus by association

## Exact file coverage and continuation

Use [review-depth.json](evidence/review-depth.json) and CSV `Audit Depth` to find both targetedpaths and remainingpaths. `remainingForInitialTargetedSemanticReview` is an explicit list; **full semanticreview remains pending for all non-metadata files**, including targetedfiles where onlyselectedexcerpts/contracts were read. No unreviewedsourcefolder is marked complete.

Next continuation:

1. Read originalPDF and reconcile everytrueclause; keep current provisionalstatus/evidence without inventingIDs/rubrics.
2. Deep-review remaininglegacycontrollers/services/configs/seeders/scripts and allmigration/checktrigger/rollback paths; use the exactremainingfilelist, not restartinventory.
3. Review uncommitteddiffs beyond selectedcancellation/focus/readback hunkssource; provenancebind acceptedfeatures to currenthashmanifest.
4. Run existingapproveddisposableSQL and realChrome only whereenvironmentalreadypermits; preserveoldartifacts and storefreshinvocationseparately.
5. Execute checklistfor all13screens/roles/widths; recordActual/screenshots, focus/keyboard/contrast, providers/inbox and upload/nativeinteractions.
6. Read primaryledger/schema status without writes before anyseparate deployment/migrationdecision. Missingdependencies remain BLOCKED, no automaticrollout.

## Preservation verification

`static-verification.json` checks **363 protecteddevelopment/config/secret paths** against baseline. `historical-evidence-hashes.json` protects393historicalartifactfiles. Final reportvalidation checks hashes/status/diffagain and records `final-validation.json`. Only new files below `docs/audits/` are authorizedoutputs. Nothing in application source, tests, previousacceptance docs, `.env`, existingdist or historicallogs is intentionally changed
'''
(OUT/'FITM_AUDIT_COVERAGE_2026-10-10.md').write_text(md,encoding='utf8')
print(json.dumps({k:v for k,v in data.items()if k not in ('remainingForInitialTargetedSemanticReview','perFile')},ensure_ascii=False))
