# FITM Audit coverage — 2026-10-10

**Overall: PENDING — ไม่รับรอง COMPLETE full semantic/official-scope/live acceptance.** Inventory และ structural read/scan ครบ candidate set; รายงาน/traceability/checklist จัดทำแล้ว. ความละเอียดของการตรวจแตกต่างกันตามหลักฐานและบันทึกแยกด้านล่าง

## Baseline / denominator

| Measure | Count / interpretation |
|---|---|
| Physical files excluding this audit output tree | 10,936 |
| Physical directories including root, generated/dependencies/Git | 1,411 |
| Relevant development directories including ancestors/root | 55 |
| Development/config/doc inventory candidates | 360 = 336 tracked + 21 original untracked + ignored config/locks3 |
| Text files read for structural extraction | 356, 47,344 lines; empty source/package initializers included |
| Metadata-only candidates | 4: PNG1, dependency locks2, .codex config1 |
| Targeted source/contract review | 101 paths; selected excerpts or route/model/HTML contracts, **not a claim of every-line human read** |
| Other files requiring initial targeted semantic review | 255; exact paths in review-depth.json and CSV Audit Depth |
| Exhaustive semantic review | Still PENDING even within targeted set; do not subtract targeted paths as fully completed semantic audit |
| Source folder omitted without inventory | 0; semantic/runtime limitations explicitly recorded |
| Candidate entirely un-inventoried | 0 within discovered local tracked/untracked + identified ignored configs/locks |

Scan captures file/path/type/responsibility/scope candidate/imports/functions/API literals/table names/test textual references/static signals/SHA; [CSV](FITM_FILE_INVENTORY_2026-10-10.csv) has one row per candidate. `Direct Consumers` resolves static local import/HTML link paths; `Reference Candidates` and `Test Reference Candidates` are broader text matches and **not proof of import, execution, coverage or dead code**. Python package/dynamic backend models/Umzug/npm/redirect entries need their explicit runtime registries. Inventory `Status` is review status, not requirement implementation status

## Physical inventory by root

| Area | Files (includes ignored/generated) |
|---|---:|
| `[root]` | 6 |
| `.codex` | 1 |
| `.git` | 1,918 |
| `backend` | 7,180 |
| `docs` | 9 |
| `frontend` | 1,309 |
| `logs` | 393 |
| `nlp-service` | 120 |

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

Physical exclusions excluding candidate metadata total **10,576 = 10,936 − 360**. The393 historical logs are counted as excluded source contents but selected acceptance evidence was inspected; they are not entirely ignored for verification

## Coverage by subsystem and evidence limits

| Area | Completed review / checks | Still PENDING / UNKNOWN |
|---|---|---|
| Root/Git/config/docs | baseline/hash/manifest/deployment static inventory; all 12 docs content structurally scanned (root2 + docs9 + NLP README1) | exhaustive long-history documentation read and reconciliation with absent PDF |
| Backend routes | dry construction expands115 method/path; 15 route files and 3 role namespaces; auth/mount/consumer table | no fresh HTTP integration; broad dynamic variant body/ownership semantics not exhaustively verified |
| Models/migrations | registered36 model metadata and associations; all22 migrations structurally parsed/indexed | **primary apply state UNKNOWN**; exact live physical constraints/storage counts not inspected; full migration semantic/rollback re-review pending |
| Controllers/services/middleware/validators | all source structurally read; targeted ownership/transaction/token/file/error/unfinished review; new tests203 PASS | remaining functions, concurrent legacy profile/advisor/photo paths and all negative contracts require deeper feature review |
| Backend scripts/seeders/tests | all15 scripts,4 seeders,46 test files inventoried; 4PS parses0errors | Local runners not executed (mutate fixtures/accounts); fresh disposable SQL/Chrome cannot run with current Docker access |
| Frontend HTML/JS/CSS | all 13 entry/navigation/source link reviews,26 page modules,17 adapters,11 CSS; build123modules;253tests PASS | full per-button/form/custommodal live UX/accessibility and all responsive widths for every screen |
| NLP | all35 Python files AST PASS; API/ThaiTF-IDF/cosine/classifier/OCR sources inspected | pytest absent; runtime/realOCR/Tesseract/Thaiquality/provider end-to-end; inferred chatbot lifespan issue not freshly reproduced |
| Data/assets | FAQ+empty markers inventoried; logo metadata | no realresume/job dataset evaluation or hidden raw/large model audit; no claimed trained model readiness from empty folders |
| Historical acceptance | feb769 final9stages/process0, browser28+13, SQL/TAP/cleanup record validation; older relevant raw logs | not a fresh browser or live Docker cleanup recheck; unchanged current source can still lack provenance binding to every historical run |

## Fresh tests: skipped, blocked and not run

- Backend in-process: **203 PASS / 0 FAIL / 17 SKIP / 0 TODO**. Disabled opt-ins: company evaluation+migration, calendar SQL,012/013/014migration,project advisor SQL,development credentials SQL,dailySQL,recruitmentSQL/lifecycle,role workflow SQL,documents SQL,project files SQL,010migration,supervisionSQL/resultsSQL. Exact names in `backend-in-process-tests.log`.
- Frontend in-process: **253 PASS / 0 FAIL / 2 SKIP**: `Student Co-op prerequisite real browser runtime checks`; `saved prerequisites and approval states through Student page and disposable PostgreSQL`.
- Canonical isolated Node test attempts: command exit1/spawnEPERM **BLOCKED**; did not produce a complete passing suite. Alternate permitted `--test-isolation=none --test-concurrency=1` run recorded distinctly; shared module/process state differs from canonical isolated mode.
- Python pytest: exit1 “No module named pytest”; **BLOCKED**, not assertion FAIL and not syntaxFAIL.
- JavaScript syntax258 / PythonAST35 / PowerShellAST4: PASS. Syntax does not imply runtime acceptance.
- New frontend build: PASS with13 entries/123 modules into `docs/audits/evidence/frontend-build/`; existing `frontend/dist/` untouched.
- Fresh SQL/Chrome/manual/Desktop/Tablet/Mobile/provider/securitypenetration testing: **NOT RUN / BROWSER NOT VERIFIED for this audit session**. Historical fixture Chrome evidence retains feature-specific status.
- Compose quietparse succeeded, warning POSTGRES_PASSWORD absent; Docker engine read returned permissiondenied. No second engine attempt or security policy workaround.

## Evidence reviewed / provenance

`evidence/historical-evidence-review.json` links 12 actual JSON summaries +37PNG metadata. The final `feb769…` run is newer than failed `6d835…` and `a76f…` runs; README/NEXT_DAY top paragraphs refer to those earlier failures. Read-only audit checked `validateBrowser`, actual TAP and `cleanupRecords`; never invoked mutating evidence CLI or rewrote previous logs.

Historical related raw logs inspected include company response targeted SQL/Chrome, daily final SQL/Chrome, supervision Chrome/final regression, results final SQL/Chrome, activity Chrome variants including final complete PASS and earlier failures. Counts overlap and must not be summed. Four specific historical mobile PNG screenshots visually reviewed: Staff cancellation, Student cancellation modal, Staff calendar, Teacher result draft. Other 33 PNG files were checked for signature/dimensions/hash only, **not visually reviewed**.

Historical source provenance limitation: screenshots/logs have invocation/run IDs and actual results; not all older feature logs include a reproducible SHA manifest tying every current file to that run. Verified refers to the recorded behavior and its scoped acceptance. A changed untracked/current file outside that tested path cannot inherit verified status by association

## Exact file coverage and continuation

Use [review-depth.json](evidence/review-depth.json) and CSV `Audit Depth` to find both targeted paths and remaining paths. `remainingForInitialTargetedSemanticReview` is an explicit list; **full semantic review remains pending for all non-metadata files**, including targeted files where only selected excerpts/contracts were read. No unreviewed source folder is marked complete.

Next continuation:

1. Read original PDF and reconcile every actual clause; keep current provisional status/evidence without inventing IDs/rubrics.
2. Deep-review remaining legacy controllers/services/configs/seeders/scripts and all migration/check trigger/rollback paths; use the exact remaining file list, not restart inventory.
3. Review uncommitted diffs beyond selected cancellation/focus/readback hunks source; bind provenance of accepted features to current hash manifest.
4. Run existing approved disposable SQL and real Chrome only where environment already permits; preserve old artifacts and store fresh invocation separately.
5. Execute checklist for all 13 screens/roles/widths; record Actual/screenshots, focus/keyboard/contrast, providers/inbox and upload/native interactions.
6. Read primary ledger/schema status without writes before any separate deployment/migration decision. Missing dependencies remain BLOCKED, no automatic rollout.

## Preservation verification

`static-verification.json` checks **363 protected development/config/secret paths** against baseline. `historical-evidence-hashes.json` protects 393 historical artifact files. Final report validation checks hashes/status/diff again and records `final-validation.json`. Only new files below `docs/audits/` are authorized outputs. Nothing in application source, tests, previous acceptance docs, `.env`, existing dist or historical logs is intentionally changed
