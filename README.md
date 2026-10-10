# FITM-INTERN

**Latest investigation — Scenario K date boundary, 2026-10-10: IMPLEMENTED / NEEDS VERIFICATION.** Actual final run `a76f101314ab4cd283c5a1724b9f7e9e` passed Preflight and Cleanup Verification; Cancellation stopped at K (**24 PASS / 1 FAIL**, D passed), and the six dependent stages were BLOCKED. K's Bangkok date-only fixture became `2026-10-10` at `2026-10-09T17:17Z`; the existing API parses it as midnight UTC and correctly rejects that future instant. The previous 28-pass run was before Bangkok midnight. Fixed only the browser fixture to use the current UTC calendar date; all K preservation assertions and production business rules remain intact.

Actual local checks: Backend **202 PASS / 0 FAIL / 17 SKIP**, Frontend **248 PASS / 0 FAIL / 2 SKIP**, date/Company Response regression **27 PASS** (included in Backend), build **123 modules PASS**, JS syntax / three PS parses / diff check PASS. These are local checks, not a new nine-stage acceptance result. New evidence: `logs/staff-cancellation-k-date-fix-20261010/`. [Current failure, comparison, cleanup and verification report](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#scenario-k-date-boundary--2026-10-10). Replay the existing final runner from the repository root in Windows CMD:

```cmd
powershell.exe -NoProfile -File backend\test\runStaffCancellationFinalAcceptance.ps1
```

Older review entries below are historical snapshots. Do not mark VERIFIED until all nine fresh stages pass with exit 0.

**Latest review — 2026-10-10: IMPLEMENTED / NEEDS VERIFICATION.** Actual final run `6d835dc61fc248d7974b63fd4a2a598a` passed **all 28 Cancellation Chrome scenarios**, including J/UI. Documents failed before dismissal because the test expected initial focus on Cancel while the shared modal explicitly focuses Confirm. Corrected the test contract; production modal/cancellation/API behavior is unchanged. Cleanup failed because the Document PowerShell ownership record is missing, not because the validator observed a remaining resource. Reproduced native stderr interrupting the old PowerShell pipeline before child cleanup; the final runner now captures child streams through a tested native-process controller, waits for exit and preserves the real exit code and diagnostics.

New local results: Backend **194 PASS / 0 FAIL / 17 SKIP**, Frontend **248 PASS / 0 FAIL / 2 SKIP**, helper/evidence **46/0/0**, focused DOM **97/0/0**, build **123 modules PASS**, JS syntax / three PowerShell parses / diff check PASS. Docker ownership query was denied in Codex, so the old PostgreSQL resource state remains **UNVERIFIED**; no resource was deleted. All 15 original evidence files retain their hashes. New logs: `logs/staff-cancellation-document-cleanup-fix-20261009/`. [Current Document/cleanup diagnosis, files and limits](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#document-initial-focus-and-native-stderr-cleanup-fix--2026-10-10).

Replay every suite once from the repository root in an authorized ordinary Windows CMD terminal; each invocation creates a fresh GUID evidence directory and keeps previous evidence:

```cmd
powershell.exe -NoProfile -File backend\test\runStaffCancellationFinalAcceptance.ps1
```

Inspect `final-summary.json`, `process-result.json`, browser/ownership cleanup records and suite logs before accepting VERIFIED. Earlier updates below describe prior snapshots.

**Latest acceptance fix — 2026-10-09: 2.3.2 (2) IMPLEMENTED / NEEDS VERIFICATION.** Actual Chrome evidence `logs/staff-cancellation-browser-4ee57f6f59b448de9d9cc45cab350b8b` contains **25 passing scenarios / J failed / UI unexecuted**; D now passes. J used an unregistered Student list URL; corrected to `GET /api/coop-requests/me` and corrected its subsequent cancelled-history check to `PATCH /api/coop-requests/:id/cancel`. Added explicit `C-advisor_review` coverage reporting. Document DOM regression also demonstrated opener focus loss on Back/Escape; document callers now pass their opener to the existing shared modal. No business-rule, authorization, migration or persistent-database changes.

Current executed checks: Backend safe units **188 PASS / 0 FAIL / 17 SKIP**, Frontend **248 PASS / 0 FAIL / 2 SKIP**, build **123 modules PASS**, focused contract/evidence tests **14/0/0**, JavaScript syntax and three PowerShell AST parses PASS. The new one-command runner was refused at script loading by this session's execution policy, exit 1; **no new Chrome/SQL suites or owned resources were started**, and no policy was changed. [Current diagnosis, files, evidence and acceptance rules](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#scenario-j-contract-fix-and-final-acceptance-runner--2026-10-09).

From the repository root in an ordinary Windows CMD terminal already authorized to run the project scripts:

```cmd
powershell.exe -NoProfile -File backend\test\runStaffCancellationFinalAcceptance.ps1
```

It runs preflight → Chrome Cancellation → default Chrome Documents → focused disposable SQL → full disposable Backend → Frontend including disposable saved-data regression → build → evidence validation → cleanup verification. Each invocation owns `logs/staff-cancellation-final-<guid>/`; inspect `final-summary.json`, `test-counts.json` (including explicit optional skips), suite logs, screenshots and cleanup records. Earlier sections below retain historical results.

**Latest Chrome cancellation preparation — 2026-10-09:** Scope **2.3.2 (2) IMPLEMENTED / NEEDS VERIFICATION**; **CHROME E2E IMPLEMENTED — EXECUTION PENDING**. The existing CDP/Node/disposable PostgreSQL runner now supports `-Cancellation` (27 planned subtests) and read-only `-CheckEnvironment`; default document mode remains separate. New executions: Backend units **148 PASS / 0 FAIL / 17 SKIP**, Frontend DOM **233 PASS / 0 FAIL / 2 SKIP**, build **123 modules PASS**, JavaScript syntax **245 files PASS**, PowerShell parse PASS. The user reports earlier focused PostgreSQL **46/0/0** and Full Backend **241/0/1**, exit 0; these are user-supplied historical evidence, not new Codex runs. PowerShell child execution is blocked by execution policy in this session; known Docker/Chrome restrictions were not bypassed. No new SQL/Chrome PASS is claimed. [Matrix, artifacts, manual fallback and exact Windows CMD commands](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#chrome-cancellation-acceptance-preparation--2026-10-09). Earlier sections below are historical snapshots.

**Student cancellation SQL fixture fix — 2026-10-09:** Confirmed the failing owner fixture used `@fixture.invalid`, which the unchanged Student Model rejects. Corrected only its test identity/email to a UUID suffix with `@email.kmutnb.ac.th` and strengthened audit/ownership/integrity assertions. New focused Backend units: **40 PASS / 0 FAIL / 0 SKIP**; Model validation, syntax and diff check PASS. User-reported pre-fix PostgreSQL: **44 PASS / 2 FAIL / 0 SKIP**. Post-fix SQL and Browser Acceptance remain **NOT VERIFIED**, scope **2.3.2 (2) IMPLEMENTED / NEEDS VERIFICATION**; Docker named-pipe access is still denied in Codex. [Root cause and Windows CMD replay](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#student-cancellation-fixture-root-cause-fix--2026-10-09).

**Docker environment follow-up — 2026-10-09:** The user reports Docker Client/Server 29.7.2 and WSL working from ordinary Windows CMD. The current Codex PowerShell session still receives `permission denied` opening `dockerDesktopLinuxEngine`; Docker calls stopped immediately afterward. Local configuration selects the `unelevated` Windows sandbox; restricted-token access is a plausible explanation, not a proven pipe ACL diagnosis. PostgreSQL and Chrome cancellation acceptance remain **NOT VERIFIED**, scope **2.3.2 (2) IMPLEMENTED / NEEDS VERIFICATION**. No application/test changes or new suite execution in this follow-up. See [current session comparison and actual Windows CMD replay commands](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#codex-access-follow-up--2026-10-09).

FITM-INTERN supports student co-op administration: profiles, company/job discovery, requests, project advisors, topics, private project files and student workplace feedback. Several departmental, Mentor and academic-assessment workflows remain unfinished.

**Final acceptance recheck — 2026-10-09:** Backend **144 PASS / 0 FAIL / 17 SKIP**, Frontend **231 PASS / 0 FAIL / 2 SKIP**, build **123 modules PASS**, syntax **242 files PASS**. Existing cancellation source/tests were preserved; no application bug was demonstrated or refactoring performed. Docker Desktop/WSL processes are present, but both Docker named pipes and WSL status enumeration return access denied in this session. Installed Chrome **154.0.8037.98** is confirmed by file metadata; an attempted Chrome smoke command was rejected before execution by automatic approval review (`blocked by policy`), so no Chrome E2E passed. Scope **2.3.2 (2) remains IMPLEMENTED / NEEDS VERIFICATION**. Historical Backend 357 reconciles to **139 unit + 218 integration checks**; current 144 is **139 original + 5 new unit checks**, with all historical root tests still discovered. See [latest diagnosis, count comparison and replay steps](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#final-acceptance-recheck--2026-10-09).

**Production ready: NO.** Current phase **2026-10-09 Asia/Bangkok**: Department Staff request cancellation — official requirement **2.3.2 (2), IMPLEMENTED / NEEDS VERIFICATION**. Existing Staff document menu now includes request search/status filters/pagination, detail/history and reasoned cancellation with stale status/timestamp checks. Student detail reads the saved reason and actor. Current executed results: Backend **144 PASS / 0 FAIL / 17 SKIP**, Frontend **231 PASS / 0 FAIL / 2 SKIP**, build PASS. Docker engine access is denied in this session; new PostgreSQL cases and real Chrome acceptance are **NOT VERIFIED**. No schema/persistent-data changes. See [cancellation audit and acceptance](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md), [Project Development Status](#project-development-status) and [HANDOFF_fitm-intern.md](./HANDOFF_fitm-intern.md). Earlier calendar SQL/Chrome evidence remains historical. Official university templates/PDF, scoring rubrics, real SMTP and persistent migration rollout remain pending.
The earlier Daily Log / Weekly Mentor Review session implemented and verified disposable PostgreSQL and real Chrome workflows. Students save daily entries and submit complete weeks; verified Mentors review each batch. Historical results: Backend 293 PASS/0 FAIL/0 SKIP; Frontend 184 PASS/0 FAIL/1 existing SKIP; Daily SQL 21 PASS; Daily/Mentor Chrome 12 PASS. Current session results appear below. Persistent migration 018 and real SMTP remain pending. [Earlier implementation and acceptance](docs/DAILY_LOG_WEEKLY_MENTOR_ACCEPTANCE.md).

## Architecture

```text
Browser: Vite multipage HTML/CSS/JavaScript + Axios
  -> Express REST API + JWT / scoped email-verification tokens
     -> Sequelize + Umzug -> PostgreSQL 16
     -> private backend storage / intern_storage volume
     -> FastAPI NLP: PyThaiNLP, TF-IDF/cosine matching, Tesseract OCR
```

Docker Compose provides frontend, backend, PostgreSQL, NLP and pgAdmin. Job ranking and Resume OCR have Express-to-NLP clients. The FastAPI FAQ chatbot is a separate endpoint; the website chatbot currently displays a placeholder response. NLP uses classical models, not an LLM.

| Component | Source | Technology |
| --- | --- | --- |
| Frontend | `frontend/src/pages`, `src/api`, `src/styles` | Vite 8, JavaScript, Tailwind CSS 4, Axios |
| Backend | `backend/src/routes`, `controllers`, `services`, `models` | Node.js, Express 5, Sequelize 6, JWT, Multer, Nodemailer |
| Migrations | `backend/src/db/migrations` | Umzug 3, ledger `sequelize_meta` |
| NLP | `nlp-service/app`, `data/processed/chatbot/faq_seed.json` | FastAPI, PyThaiNLP, scikit-learn, Tesseract |
| Development/runtime | `docker-compose.yml`, component Dockerfiles | Docker / Docker Compose |
| Staging helper | `deploy.sh` | Pull, build, migration and health steps; not run by this audit |

## Roles and canonical workflows

| Role | Current responsibilities and limits |
| --- | --- |
| Student | Password registration/login, own profile, company discovery/matching, requests, prerequisites, Mentor records, project-advisor requests, topic/files and workplace evaluation |
| Teacher | Login/profile, project-advisor queue/accept/reject, own class-advisee request decisions and project-advisee supervision scheduling |
| Department Head | Teacher identity with explicit `is_department_head`, live DB authorization and department scope; login/request-decision dashboard implemented; permitted Teacher administration remains backend only |
| Department Staff | Login/document dashboard, all-state request list/detail/history and eligible cancellation UI; approved document queue, Cooperation Letter drafts/generated dev previews/history; recruitment remains backend only; never a request approval stage |
| Mentor | Single-use profile verification, separate weekly-batch review links and separately scoped original/substitute appointment confirmation; academic scoring remains unfinished |
| Company/Public | Public recruitment form and email verification; no Company management portal |

**Co-op Request:** Student submission -> Class Advisor -> Department Head -> Approved / Rejected. Department Staff may view/history/cancel eligible pending requests and is **not an approval stage**. Legacy `staff_review` is retained for historical compatibility.

**Project Advisor:** Student selects an active Teacher -> pending request -> that Teacher explicitly accepts/rejects. Only acceptance sets `students.coop_advisor_teacher_id`. Pending replacement preserves request history; stale decisions cannot confirm an old selection. Confirmed replacement is a separate unimplemented workflow. The old Head direct-assignment endpoint returns 409.

`advisor_teacher_id` is the separate **class advisor** selected by the Student. Teacher-directory loading failure must preserve it. Project-topic saving works with no advisor, pending, rejected or confirmed advisor.

**Recruitment:** Public form -> Turnstile Siteverify -> transactional Company/submission/jobs/work modes -> verification email -> `pending_review` -> Staff backend publish/reject. Unverified/pending jobs do not appear in Student matching. SMTP failure preserves the submission and supports limited resend recovery; real browser/inbox acceptance remains pending.

## Earlier feature status summary

The full requirements matrix below supersedes these earlier area summaries. Historical WORKING means connected application layers with relevant automated/read-only evidence, and does not establish full official-scope completion or every real-browser interaction.

| Area | Status | Notes |
| --- | --- | --- |
| Student password registration/login | PARTIAL | Real bcrypt/JWT APIs and pages; successful existing-user browser acceptance pending |
| Student authenticated reads / Teacher directory / company search | WORKING | Owner/actor guards, real models and safe directory/search projections |
| Profile, profile image, class-advisor selection | PARTIAL | Real API/storage flows; advisor-preservation regressions pass; complete persistence/browser acceptance still needed |
| Resume | PARTIAL | PDF upload, metadata, replacement, native text and OCR implemented; post-commit retention tests pass; complete browser/SQL/provider acceptance remains |
| Skills/Resume job matching | PARTIAL | Connected to real NLP, published jobs only; expiry filtering omitted |
| Student request create/list/detail/cancel/history | WORKING | Request/delivery/audit persistence and ownership tested |
| IT/INE prerequisite snapshots | WORKING | Five canonical courses, program switching, grades and saved history |
| Complete request approval UI workflow | PARTIAL | Student, Class Advisor and Head decision UI connected; authorized real Local Head HTTP/SQL acceptance passes; real browser acceptance remains pending |
| Project-advisor request workflow | PARTIAL | Student/Teacher UI connected; isolated and Local credential/authenticated HTTP/SQL acceptance pass; real browser acceptance pending |
| Project topic | WORKING | Owner-scoped create/edit/read-back, independent of advisor confirmation |
| Project Book / Poster | WORKING | Private storage, replacement and authenticated Blob preview; real browser/native preview pending |
| Student Company Evaluation | WORKING | Dedicated table, five 1–10 scores, comment, total/average and all eight real context sources; migration 015 applied on Local |
| Student Mentor management / verification | PARTIAL | CRUD, email/resend and token-confirmation page implemented; fresh live acceptance pending |
| Staff request cancellation | IMPLEMENTED / NEEDS VERIFICATION | Existing pending-only API connected to Staff search/detail/shared reason modal; unit/DOM/build pass; current PostgreSQL/Chrome acceptance blocked by Docker permission |
| Staff recruitment / Head Teacher administration | BACKEND ONLY | Authorization and SQL operations tested historically; corresponding administration pages absent |
| Department Head request frontend | PARTIAL | Login/live Head guard, scoped request list/detail/Class history and final approve/reject connected; Local HTTP/SQL acceptance passes; browser and other Head menus remain pending |
| Teacher Class Advisor frontend | PARTIAL | Own request list/detail/course snapshot/history, approve to Head and reasoned reject connected; automated and Local HTTP/SQL acceptance pass; real browser pending |
| Teacher project-advisor frontend | PARTIAL | Login, own queue, accept/reject/reason and refresh implemented; guarded Local credential helper/API acceptance pass; browser acceptance pending |
| Staff frontend | PARTIAL | Login, document queue/search/filter/pagination/detail, metadata/version/history, preview/download/print controls connected; real browser pending |
| Cooperation Letter document processing | PARTIAL | PostgreSQL drafts/frozen snapshots/revisions and authenticated server-rendered dev HTML pass Local HTTP/SQL; approved official template/PDF issuance pending |
| Company Response / Placement Letter | WORKING (development HTML) | Staff response/history and versioned Placement verified on disposable PostgreSQL + real Chrome; completed Cooperation Letter/persisted acceptance required; official PDF and persistent 017 rollout pending |
| Public recruitment through publication | PARTIAL | Submission/verification implemented; inbox acceptance and Staff UI missing |
| Daily Log / Weekly Mentor Review | WORKING (development; disposable verified) | Daily working/nonworking records, weekly snapshots/revisions and verified Mentor capability review pass PostgreSQL + real Chrome; persistent 018 rollout and real SMTP acceptance pending |
| Company transfer / landing jobs and chatbot | MOCK / UI ONLY | DOM/demo behavior; no corresponding persistent end-to-end flow |
| FastAPI FAQ chatbot | BACKEND ONLY | Endpoint runs, but two existing tests fail and document-intent quality needs review; no Express/website bridge |
| Google login button | MOCK / UI ONLY | Placeholder; OAuth callback/account/JWT flow NOT STARTED |
| Supervision visit results 1–2 | WORKING (development; disposable verified) | Confirmed appointment → draft → completed; exactly two private images, retained revisions and Student read-only results |
| Staff activity calendar | WORKING (development; disposable verified) | Monthly/list calendar, drafts/publication/cancellation, Student read-only visibility, duplicate/stale protection and immutable audit; migration 021 persistent rollout pending |
| Academic scores, official document issuance/PDF, Internship Report | NOT STARTED / BLOCKED | Approved templates, scoring rubrics and logbook compilation remain unfinished |
| Production deployment | PARTIAL | Development Compose and staging helper exist; current VM/schema/HTTPS readiness unverified |

Company Evaluation context comes from authenticated Student name/code/major, current owner Mentor name/position, exactly one owner request in `approved/document_issued/in_progress` (company snapshot first, linked Company fallback), that request's work dates, and the evaluation's last saved timestamp. Zero/multiple accepted requests and missing real values display `-`.

Project Book accepts PDF up to 10 MB; Poster accepts PDF/PNG/JPEG up to 10 MB. Server validates extension, MIME, signatures, size, ownership and storage paths. Resume is a separate PDF flow. Files are not served through public storage URLs.

## Local development setup

Use Windows with Git and Docker Desktop/Linux containers, or an equivalent Docker environment. Environment templates now exist at `.env.example`, `backend/.env.example` and `frontend/.env.example`. For a new checkout, copy each template to its corresponding `.env` **only if the destination does not already exist**, then configure private values.

| Environment | Important variable names |
| --- | --- |
| Root / PostgreSQL | `POSTGRES_PASSWORD` |
| Backend / database | `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| Auth / origin / storage | `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `STORAGE_ROOT` |
| Backend -> NLP | `NLP_SERVICE_BASE_URL`, `NLP_SERVICE_TIMEOUT_MS`, `NLP_OCR_TIMEOUT_MS` |
| Email / recruitment | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `RECRUITMENT_SUBMISSION_ENABLED` |
| Turnstile | `TURNSTILE_SECRET_KEY`, `TURNSTILE_EXPECTED_HOSTNAME`, optional `TURNSTILE_EXPECTED_ACTION`, `TURNSTILE_TIMEOUT_MS` |
| Browser | `VITE_API_URL`, `VITE_TURNSTILE_SITE_KEY` |

All `VITE_*` values are public browser configuration. Never put private keys or credentials there. Backend DB settings must match Compose PostgreSQL; `DB_HOST=postgres` is the internal service name. The configured frontend origin must match the browser URL. The latest audit found an unset root `POSTGRES_PASSWORD` interpolation warning in its shell; existing PostgreSQL remained healthy. Configure it before a fresh start/recreation.

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose exec -T backend npm run db:migrate:status
```

These are development setup instructions, not actions performed by the audit. Startup authenticates the DB and does not call Sequelize sync. For a fresh database, review/configure the intended target before applying migrations. For an existing database, inspect its ledger/schema and take a fresh backup before any separately authorized rollout; never reset it or assume another environment has Local's state.

| Service | Container | Main local URL/port |
| --- | --- | --- |
| Frontend | `intern_frontend` | [localhost:5173](http://localhost:5173) |
| Backend | `intern_backend` | [localhost:5000](http://localhost:5000), [DB health](http://localhost:5000/health/db) |
| PostgreSQL | `intern_postgres` | localhost:5432, database `intern_system` |
| NLP | `intern_nlp_service` | [health](http://localhost:8000/health), [API docs](http://localhost:8000/docs) |
| pgAdmin | `intern_pgadmin` | [localhost:5050](http://localhost:5050) |

Main pages: `/login.html`, `/register.html`, `/teacher-login.html`, `/src/teacher_coop/teacher_coop.html`, `/department-head-login.html`, `/src/department_head/department_head.html`, `/staff-login.html`, `/src/department_staff/department_staff.html`, `/src/student_coop/student_coop.html`, `/src/mentor_coop/mentor_verify_user.html`, `/src/recruit_student/recruit_student.html`, `/src/recruit_student/recruit_verify_email.html`. Email-verification links require a current authorized token; do not record/reuse tokens.

Teacher login uses existing `/api/teachers/auth/login` and `/me` APIs. Project-advisor lists/decisions use `/api/teachers/project-advisor-requests`; status filters are pending (default), confirmed and rejected. Separate Teacher sessionStorage preserves the Student session. Local password login and authenticated Student -> Teacher -> Student read-back have now passed with existing faculty; real browser acceptance remains pending.

Teacher **อนุมัติคำร้องสหกิจ** uses existing `/api/teachers/coop-requests` list/detail and `/:id/approve|reject` APIs. Only the authenticated Student class advisor (`advisor_teacher_id`) may decide `advisor_review`; approval stops at `department_head_review`, rejection requires a persisted history reason. Project-advisor identity grants no request approval authority. Shared confirmation/toast/loading and server refresh are used. [Class Advisor Chrome checklist](docs/TEACHER_CLASS_ADVISOR_MANUAL_ACCEPTANCE.md) tracks the pending browser acceptance.

Head login/profile and request actions use existing `/api/department-head` APIs and the Teacher session. Backend requires a live active Teacher with `is_department_head=true` and valid department scope; position/name/email/client flags do not authorize. Only `department_head_review` can become `approved` or `rejected`; named Class approval history is shown and successful decisions reload server state. See [Head Chrome checklist](docs/DEPARTMENT_HEAD_COOP_REQUEST_MANUAL_ACCEPTANCE.md) for authorized account preparation and pending browser acceptance. The request dashboard does not imply all Head menus are complete.

Staff **จัดการเอกสาร** uses existing password login/live Staff guards and a separate session. `/api/staff/document-requests` supplies eligible request search/list/detail; request-owned documents use frozen snapshots, optimistic versions, revisions and authenticated preview/download. The new Company Response form records acceptance/rejection and reasoned corrections with history. Placement creation requires completed Cooperation Letter processing and persisted acceptance; corrections are locked once a Placement draft exists. Both letters remain development HTML and do not set `document_issued`. Schema 016 Cooperation Letter processing remains available before 017 rollout. Official templates/PDF are pending. See [Company Response / Placement acceptance and Chrome checklist](docs/COMPANY_RESPONSE_PLACEMENT_ACCEPTANCE.md).

Local credentials are provisioned explicitly with `npm run dev:teacher-credential` (or `-- restore`). It requires `NODE_ENV=development`, an existing active `TEACHER_TEST_ID`, environment-supplied `TEACHER_TEST_EMAIL` / `TEACHER_TEST_PASSWORD`, and an absolute `TEACHER_TEST_BACKUP_PATH` outside the repository. It updates only email/password hash through the Teacher bcrypt hook, preserves faculty/name/privilege/timestamps, records original values before writing, and refuses stale restore. It never inserts Teachers, changes migrations or runs automatically in production/startup. Current Local account/private recovery instructions and the pending Chrome checklist are in [Teacher manual acceptance](docs/TEACHER_PROJECT_ADVISOR_MANUAL_ACCEPTANCE.md); no plaintext password is stored in the repository.

## Database migrations

**Historical persistent Local verification: 17 executed, through 016**, on 2026-10-07. That session had zero pending migrations at that time. The checkout now includes 017–021; no persistent rollout occurred in the supervision/calendar sessions. This includes 001–009, 007a and 010–016. Historical authorized migration 016 added two tables while preserving earlier application data.

Those are historical persistent counts. On 2026-10-08 migration 017 was verified through apply/rollback/reapply on isolated disposable PostgreSQL: 18 executed / 0 pending there. It has not been applied to existing Local/staging/production databases; their current counts were not inspected by this verification.

| Migration | Purpose |
| --- | --- |
| 007a | Conditional missing-base-table creation; does not repair arbitrary existing schema drift |
| 008–009 | Resume extraction metadata; request Company/Job links |
| 010 | Preserve one canonical StudentFile storage-path UNIQUE, remove redundant equivalent constraints |
| 011 | Explicit Head privilege and role review/audit tables |
| 012 | Persist prerequisite snapshots and direct Advisor -> Head request workflow |
| 013 | CoopProject topic and one current Book/Poster per Student/category |
| 014 | Immutable project-advisor request/history and Teacher confirmation |
| 015 | Dedicated CompanyEvaluation, one editable row per Student |
| 016 | Request-owned documents, frozen snapshots, versions, generated dev content and Staff revision/audit history |
| 017 (disposable verified; persistent rollout pending) | Request-owned Company Responses, generated Cooperation Letter evidence, immutable correction history; Placement reuses 016 document tables |
| 018 (disposable verified; persistent rollout pending) | Daily logs, immutable weekly submission/review snapshots, events and separate Mentor review capabilities |
| 019 (persistent rollout pending) | Supervision appointments, immutable version history, hash-only single-use confirmation capabilities; composite request/Mentor ownership FKs |
| 020 (disposable verified; persistent rollout pending) | Supervision results/images/revisions, exact two-image completion, immutable evidence, version/identity constraints and appointment protection |
| 021 (disposable verified; persistent rollout pending) | Coop activities and immutable named history; publication/private notes, idempotency keys, active duplicate index, protected cancellation/version transitions and populated rollback refusal |

Important FK/unique constraints were checked on Local. StudentFile storage has exactly one canonical storage-path UNIQUE; required Resume/project-category uniqueness remains present. A previous StudentFile fingerprint anomaly is unresolved and outside current scope. The full audit's read-only baseline/final comparison matched all 20 application tables, including three StudentFiles and their current aggregate fingerprint; no rows or files were changed.

Historical Local verification recorded zero Staff accounts, one authorized Head flag on existing faculty **ผศ.ดร.ขนิษฐา นามี**, and 23 Teachers. These counts were not rechecked in this session. Temporary Head acceptance credentials were restored then; manual login needs authorized provisioning with the existing helper. Runtime authority uses the live DB flag and department scope. Current VM migration/schema/availability was not inspected.

## Testing and acceptance

The earlier full repository audit recorded backend **210 passed** / frontend **96 passed + 1 browser skip**, and NLP **14 passed / 2 failed**. Role/document continuations have newer regression, build and Local acceptance evidence in HANDOFF. The NLP limitation is unchanged. Integration checks use guarded disposable databases; real browser evidence is tracked separately.

The two NLP chatbot tests use `TestClient(app)` without entering FastAPI lifespan, leaving the classifier untrained. They remain failing; no source/test fix was made. A running document question also returned a different low-confidence intent and fallback, so endpoint HTTP 200 is not an intent-quality PASS.

```powershell
# Existing isolated backend runner; never point integration tests at persistent Local:
powershell -NoProfile -File backend/test/runIsolatedWorkflow.ps1

# Frontend: provide a guarded disposable COOP_UI_DISPOSABLE_DATABASE_URL
# to include SQL acceptance; otherwise those optional tests skip:
node --test --test-isolation=none frontend/test/*.test.js

npm.cmd --prefix frontend run build -- --configLoader native
git diff --check
```

The existing backend runner does not configure every newer evaluation/advisor/project opt-in. Full current acceptance needs their dedicated disposable URLs and 013/014/015 safety markers; the audit used those additional settings. Never enable `RECRUITMENT_INTEGRATION_TEST` against a persistent DB: the legacy test relies on the configured target rather than a strong disposable-name guard.

NLP tests require installed dependencies and the test directory: `python -m pytest -q -p no:cacheprovider`. The standard NLP image does not include tests; the audit mounted source/tests/FAQ read-only into a disposable, network-disabled container.

The initial audit did not run Chrome. Later disposable sessions verified password login, Staff documents, Daily/Mentor review, supervision/results and the activity calendar with real Chrome. Broader profile/project/native preview acceptance and live company/Mentor inbox acceptance remain pending; see the current verification section and the preserved reports.

## Known limitations and deployment boundary

- Matching and published-job prefill/create check published status but omit expiry eligibility. Current Local has 20 published jobs and none expired, which does not remove the source defect.
- A request can be submitted without a class advisor; an incomplete/unknown major is rejected by prerequisite normalization. Missing class-advisor linkage can strand review authority. No change was made.
- Resume storage/extraction is implemented, but final extraction-status persistence can still return 500 after upload metadata commit; the fixed invariant retains the committed physical file.
- FAQ guidance still needs alignment with development-only documents, implemented weekly log review and pending persistent rollout.
- Authentication/project/evaluation projections avoid password hashes, verification secrets and absolute storage paths. Profile/image responses still return an owner-relative `profile_image` storage reference; `/health/db` can expose a raw DB error message on failure. These need review before production.
- Student login/register and Mentor resend lack the dedicated route rate limits found on role login/recruitment. Student JWTs are stored in localStorage. No observed compromise is claimed.
- Compose/Dockerfiles use Vite, nodemon and Uvicorn reload for development, publish DB/pgAdmin/API/NLP ports, and retain pgAdmin development credential defaults. Only PostgreSQL has a Compose healthcheck.
- `deploy.sh` exists and automatically applies pending migrations. It is not a read-only start/status command and was not executed. No Nginx configuration or current HTTPS/domain setup is supplied in this checkout; previous Nginx/VM success is historical evidence.

Production needs separately planned role UI/workflow completion, provider/browser acceptance, runtime/security configuration, HTTPS, backups/restore verification and deployment validation. No deployment is authorized by this README or the completed audit.

## Documentation

[HANDOFF_fitm-intern.md](./HANDOFF_fitm-intern.md) is the authoritative audit/resume point. Its top section supersedes historical migration counts, Staff-approval rules, Head direct project-advisor assignment and old topic/file/evaluation placeholder descriptions. [Tomorrow's review](docs/NEXT_DAY_DEVELOPMENT_REVIEW.md) lists this session's files, tests and manual steps.

## Project Development Status

**Last verified date:** 2026-10-09 Asia/Bangkok. **Phase:** independent Department Staff activity calendar, preserving previous supervision/log/document workflows. Official supervision PDF and academic scoring remain separate blocked phases. The table is based on current source and actual acceptance runs.

Migration files present: `001_create_companies.js`, `002_create_job_submissions.js`, `003_create_job_postings.js`, `004_create_job_posting_work_modes.js`, `005_create_company_access_tokens.js`, `006_add_company_job_indexes_and_checks.js`, `007_create_department_staffs.js`, `007a_create_missing_base_tables.js`, `008_add_resume_extraction.js`, `009_add_coop_request_company_job_links.js`, `010_cleanup_student_file_schema_drift.js`, `011_add_role_workflow_reviews.js`, `012_coop_prerequisites_and_direct_review.js`, `013_add_coop_projects_and_current_files.js`, `014_add_coop_project_advisor_requests.js`, `015_add_company_evaluations.js`, `016_add_coop_documents.js`, `017_add_company_responses.js`, `018_add_internship_logs.js`, `019_add_supervision_appointments.js`, `020_add_supervision_results.js`, `021_add_coop_activities.js` (22 files including 007a).

| Environment | Migration execution state |
|---|---|
| Owned disposable PostgreSQL | 22 executed / 0 pending through 021; empty UP/DOWN/reapply, injected DDL rollback and populated rollback refusal passed |
| Existing Local | Not modified or inspected this session; historical ledger through 016 only; 017–021 rollout remains pending |
| Staging / production | Not accessed; current execution state unknown |

**Actual calendar-session verification:** full disposable Backend **357 PASS / 0 FAIL / 0 SKIP**; Frontend with actual SQL bridges **215 PASS / 0 FAIL / 1 existing Student-prerequisite browser SKIP**. Calendar PostgreSQL **13 PASS / 0 FAIL / 0 SKIP** (12 scenarios + parent), frontend calendar/controller tests **10 PASS**. Real Chrome calendar **13 PASS**, existing Staff documents **12 PASS**, supervision scheduling/results **24 PASS**, each with **0 FAIL / 0 SKIP**. Build **13 HTML entries / 121 modules PASS**, syntax **238 JS files PASS**, PowerShell parser **0 errors**, diff check PASS. See the [review report](docs/NEXT_DAY_DEVELOPMENT_REVIEW.md) for final logs and limits. Counts overlap and must not be summed.

Calendar APIs use `/api/coop-activities`: Staff `GET/POST /staff`, `GET/PUT /staff/:id`, `POST /staff/:id/cancel`; Student `GET /student` and `/student/:id`. Activity title/category/start/end/status are required; descriptions, locations, https meeting links and separate private Staff notes are optional. All dates display as Asia/Bangkok; API date inputs require +07:00 and end after start. Draft publication is explicit. Published activities cannot return to draft; cancellation keeps previously published information visible with a canceled label. Canceled drafts stay private. Edits and cancellation require the current version and a Staff-only reason. Actor identities come from live authenticated accounts. Idempotent creation retries reuse `creation_key`; normalized identical title/start/end conflicts across active activities. There is no automatic attendance policy, academic deadline, supervision merge, public history or private Student-data projection. Categories are descriptive labels, not academic rules. No existing Staff department/term/cohort relationship was available to reuse, so no invented scope was added.

**Historical supervision-session verification:** Backend 344 PASS; Frontend 205 PASS / 1 existing SKIP; result SQL 21 PASS; scheduling/results Chrome 24 PASS; Daily/Mentor and Staff Chrome 12 PASS each. Those earlier counts remain historical evidence.

Teacher result APIs reuse `/api/supervision`: `GET/PUT /teacher/students/:id/appointments/:appointment/visits/:visit/result`, `POST .../complete`, authenticated `GET .../images/:image`. Student `GET /student/appointments/:appointment/visits/:visit/result` and its image route expose only completed results/current images. Teacher reads revisions and old evidence. A confirmed appointment is required before the first draft; drafts can omit fields/images. Completion requires an actual visit date, descriptive outcome and both images. PNG/JPEG uploads are limited to 5 MB each and checked by extension, MIME, byte signature and size. Atomic draft uploads retain committed historical evidence and clean staged files after rollback. All identity/context comes from the saved canonical appointment. Starting a result protects that appointment from rescheduling; cancelled placements freeze further result writes while preserving history. No numeric rubric or official report wording is invented.

Statuses: VERIFIED = complete behavior for that requirement with relevant acceptance actually passed; IMPLEMENTED / NEEDS VERIFICATION = connected source with required acceptance still incomplete; PARTIAL = missing part of the requirement; UI ONLY = placeholder; NOT STARTED = absent; BLOCKED = named prerequisite missing. No overall completion percentage is inferred. Broader requirements stay PARTIAL even if one subflow passes.

### Full Requirements Status Matrix

| Requirement ID | Role | Feature | Status | Evidence / Implemented Files | Remaining Work |
|---|---|---|---|---|---|
| 2.3.1.1 (1) | Student | Email/password registration/login + Google OAuth | PARTIAL | `backend/src/controllers/auth.controller.js`, `frontend/src/pages/login.js`, `register.js`; password login in Chrome fixtures | Google OAuth placeholder; verify registration browser flow |
| 2.3.1.1 (2) | Student | Personal/academic/family/emergency/class advisor/skills profile | IMPLEMENTED / NEEDS VERIFICATION | `studentProfile.controller.js`, Student/Profile models, `student_coop.js` | Full profile fields and provider/file browser acceptance |
| 2.3.1.1 (3) | Student | Resume upload | IMPLEMENTED / NEEDS VERIFICATION | `upload.middleware.js`, `studentProfile.controller.js`, `resumeText.service.js`, upload tests | Native browser replacement/extraction and live OCR acceptance |
| 2.3.1.1 (4) | Student | Resume-based company/job recommendations | PARTIAL | `jobMatching.controller.js`, `nlpMatching.client.js`, NLP matching; `jobMatching.test.js` | Published job expiry eligibility; end-to-end NLP/browser acceptance |
| 2.3.1.1 (5) | Student | Create/cancel Coop Request | IMPLEMENTED / NEEDS VERIFICATION | `coopRequest.controller.js`, request/course/delivery models; SQL/DOM regressions | Full real Chrome create/cancel through Student form |
| 2.3.1.1 (6) | Student | Track request/cooperation/placement status | PARTIAL | `student_coop.js`, request history/company-response read-back; Staff document APIs | Student cooperation/placement artifact status read-back; official issuance |
| 2.3.1.1 (7) | Student | Manage project advisor | PARTIAL | `coopProjectAdvisor.service.js`, migration 014, Student/Teacher pages and SQL bridge | Confirmed replacement policy/flow; complete Chrome request decision |
| 2.3.1.1 (8) | Student | Verify/acknowledge confirmed project advisor | PARTIAL | `student_coop.js` confirmed-advisor display, request read-back | Persisted explicit Student acknowledgement |
| 2.3.1.1 (9) | Student | Manage examination/project topic | IMPLEMENTED / NEEDS VERIFICATION | `studentCoopProject.service.js`, `coopProject.model.js`, project tests | Native browser topic acceptance; topic is independent of advisor confirmation |
| 2.3.1.1 (10) | Student | Record Mentor email/name/position | IMPLEMENTED / NEEDS VERIFICATION | `mentor.controller.js`, `mentor.model.js`, Student Mentor form | Complete Student CRUD/resend browser acceptance and intended-recipient SMTP |
| 2.3.1.1 (11) | Student | Daily work logs + compiled internship logbook | PARTIAL | Migration 018, `internshipLog.service.js`, `studentInternshipLog.js`, SQL/Chrome evidence | Full logbook compilation/export; weekly review has no numeric rubric |
| 2.3.1.1 (12) | Student | Evaluate company/workplace | IMPLEMENTED / NEEDS VERIFICATION | Migration 015, `companyEvaluation.service.js`, `studentCompanyEvaluation.js`, real SQL/DOM bridge | Native Chrome save/edit/read-back |
| 2.3.1.1 (13) | Student | Upload Project Book | IMPLEMENTED / NEEDS VERIFICATION | `studentCoopProject.service.js`, private authenticated file routes, SQL/DOM tests | Native browser upload/preview; this is not final assessment |
| 2.3.1.1 (14) | Student | Upload Poster | IMPLEMENTED / NEEDS VERIFICATION | Same private project-file service, signature/MIME/ownership tests | Native browser PDF/image preview |
| 2.3.1.1 (15) | Student | Documentation/procedure chatbot | PARTIAL | `nlp-service/app` FAQ endpoint; `frontend/src/pages/index.js` placeholder | NLP lifespan/intent tests and authenticated Express/UI bridge |
| 2.3.1.1 (16) | Student | Search workplaces | IMPLEMENTED / NEEDS VERIFICATION | `coopRequest.controller.js`, company search and frontend matching/search adapters | Complete real browser search/filter acceptance |
| 2.3.2 (1) | Staff | Track requests/cooperation/placement | PARTIAL | `staffDocuments.service.js`, `staffDocuments.js`, `staffCoopRequests.js` all-state request tracking; historical document SQL/Chrome | Current all-state tracking browser acceptance; persistent rollout |
| 2.3.2 (2) | Staff | Cancel eligible requests | IMPLEMENTED / NEEDS VERIFICATION | Existing `roleWorkflow.service.js` API, `staffCoopRequests.js`, shared reason modal, current backend/DOM tests and build; [acceptance](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md) | New PostgreSQL/race/rollback and real Chrome acceptance blocked by Docker permission; no new migration |
| 2.3.2 (3) | Staff | Manage cooperation/placement letters | PARTIAL | Migrations 016/017, frozen document revisions, HTML preview/download/history | Approved official templates/PDF and issuance/reissuance policy |
| 2.3.2 (4) | Staff | Document-status chatbot | NOT STARTED | No authenticated document-status chatbot service/UI | Owner/role-scoped status query and UI |
| 2.3.2 (5) | Staff | Manage workplace information | PARTIAL | Recruitment publish/reject in `roleWorkflow.service.js`, job review models | Company CRUD administration UI and corresponding backend |
| 2.3.2 (6) | Staff | Coop activity calendar | VERIFIED | Migration 021; `coopActivity.service.js`, `coopActivities.routes.js`, `coopActivities.js`; real SQL/Chrome acceptance, Staff monthly/list and Student read-only views | Separately authorized persistent migration rollout; real deployment acceptance |
| 2.3.2 (7) | Staff | Manage Teacher information | NOT STARTED | Existing Teacher administration endpoints are Head-only | Staff-scoped authorized administration and UI |
| 2.3.2 (8) | Staff | Manage all Student scores | BLOCKED | No academic score model/workflow | Supplied grading rubrics/maxima and scoring policy; Staff score UI |
| 2.3.3.1 (1) | Teacher | Select Students for supervision/project advising | PARTIAL | Explicit project-advisor request acceptance; `coop_advisor_teacher_id` drives supervision | Independent Teacher student-selection/supervision assignment flow |
| 2.3.3.1 (2) | Teacher | Confirm project advisor relationship | IMPLEMENTED / NEEDS VERIFICATION | Migration 014, advisor service, `teacherCoop.js`, SQL/DOM tests | Real Chrome Student request → Teacher decision → Student read-back |
| 2.3.3.1 (3) | Teacher | Search companies and Students | PARTIAL | Active company search; own class/project queues and paged supervision list | Full Teacher search UI/scoped backend |
| 2.3.3.1 (4) | Teacher | Schedule supervision visits 1–2 | VERIFIED | Migration 019, `supervision.service.js`, `supervision.routes.js`, `teacherSupervision.js`; PostgreSQL 20 / Chrome 13 PASS | Separate persistent rollout; visit results/photos are separate requirements |
| 2.3.3.1 (5) | Teacher | Verify Mentor information before supervision | VERIFIED | Live verified Mentor/stamp validation and Teacher review checkbox, frozen identity; SQL/Chrome PASS | Incorrect personal details require correction/reverification |
| 2.3.3.1 (6) | Teacher | Manage substitute Mentor for unavailable original | VERIFIED | Per-appointment nomination/name/email/position/reason; recipient-only capability/history; SQL/Chrome PASS | Intended-recipient SMTP acceptance; global Mentor reassignment is separate |
| 2.3.3.1 (7) | Teacher | Visit 1 result + two photos | VERIFIED | Migration 020, `supervisionResult.service.js`, `supervisionResult.js`; result SQL 21 / combined Chrome 24 PASS | Separate persistent rollout; official PDF is (8) |
| 2.3.3.1 (8) | Teacher | Visit 1 individual PDF with identity/photos/signature names | BLOCKED | Result/photo data retained; no approved university supervision PDF template | Approved template and authorized PDF rendering/signature policy |
| 2.3.3.1 (9) | Teacher | Visit 2 result + two photos | VERIFIED | Same scoped result/image/revision architecture; independent visit 2 SQL/Chrome PASS | Separate persistent rollout; official PDF is (10) |
| 2.3.3.1 (10) | Teacher | Visit 2 individual PDF with identity/photos/signature names | BLOCKED | Result/photo data retained; no approved university supervision PDF template | Approved template and authorized PDF rendering/signature policy |
| 2.3.3.1 (11) | Teacher | Evaluate Students | BLOCKED | No final Teacher assessment workflow | Defined rubric/maxima and authorized evaluation persistence/UI |
| 2.3.3.1 (12) | Teacher | Evaluate workplaces | NOT STARTED | Student workplace feedback is a separate owner-scoped service | Teacher criteria, authorized workplace evaluation and UI |
| 2.3.3.1 (13) | Teacher | Visit 2 Student evaluation | BLOCKED | Visit 2 descriptive result implemented; no academic assessment model | Supplied rubric/maxima and authorized assessment flow |
| 2.3.3.1 (14) | Teacher | Evaluate logbook/Book/work/Poster/examination | BLOCKED | Private Book/Poster uploads are prerequisites only | Rubrics/maxima, logbook compilation and chair + two committee workflow |
| 2.3.3.1 (15) | Teacher | Personal account management | PARTIAL | Password login and safe GET profile; Teacher page display | Teacher self-edit API/UI (Head self-edit is distinct) |
| 2.3.3.1 (16) | Teacher | Approve/reject Coop Requests | IMPLEMENTED / NEEDS VERIFICATION | Canonical Class Advisor API, `teacherCoopRequests.js`, SQL/DOM regression | Full real Chrome decision acceptance; project advisor grants no Class authority |
| 2.3.3.2 (1) | Head | Search Teachers | PARTIAL | Head-only department-scoped Teacher search API and SQL tests | Head Teacher search dashboard |
| 2.3.3.2 (2) | Head | Search Coop Students | PARTIAL | Department-scoped request list/search in role workflow service | Dedicated Student directory/search UI |
| 2.3.3.2 (3) | Head | Assign Coop advisors | BLOCKED | Existing direct assignment returns 409; explicit Student/Teacher confirmation is canonical | Define Head nomination/assignment policy compatible with accepted relationships |
| 2.3.3.2 (4) | Head | Manage Teachers | PARTIAL | Scoped PATCH Teacher with bcrypt hook and live DB Head flag | Head management dashboard and browser acceptance |
| 2.3.3.2 (5) | Head | Personal account management | PARTIAL | Head GET/PATCH profile service/API | Profile editing dashboard and browser acceptance |
| 2.3.3.2 (6) | Head | Approve/reject requests | IMPLEMENTED / NEEDS VERIFICATION | `departmentHead.js`, canonical department_head_review transitions, SQL/DOM tests | Real Chrome Head decision UI acceptance |
| 2.3.4 (1) | Company | Public jobs/contact/location/category/vacancies/allowance/modes/days/CAPTCHA | IMPLEMENTED / NEEDS VERIFICATION | `jobSubmission.service.js`, recruitment validator/Turnstile, transactional jobs/modes; public form | Live Turnstile/SMTP/browser acceptance and publication UI |
| 2.3.4 (2) | Company | Manage own company information | NOT STARTED | Submission/email verification are not an owner management portal | Scoped Company management capability/account, CRUD/UI |
| 2.3.4 (3) | Company | Verify company information | PARTIAL | Company email verification/lifecycle APIs and tests | Company profile verification policy and real inbox acceptance |
| 2.3.5.1 (1) | Mentor | Review/evaluate daily logs as weekly batches | PARTIAL | Migration 018, weekly Mentor feedback/revision UI and SQL/Chrome tests | Numeric weekly evaluation requires supplied rubric; SMTP/rollout pending |
| 2.3.5.1 (2) | Mentor | Verify personal information | VERIFIED | `mentorToken.service.js`, verification controllers/page; original single-use confirmation and Daily Chrome regression PASS | Real intended-recipient SMTP remains unverified |
| 2.3.5.1 (3) | Mentor | Confirm personal information for supervision appointments | VERIFIED | Appointment-scoped identity checkbox, hash-only/versioned single-use link, `mentorSupervision.js`; SQL/Chrome PASS | Real SMTP and separate persistent rollout |
| 2.3.5.1 (4) | Mentor | Verify substitute Mentor for supervision | VERIFIED | Teacher nomination + substitute recipient's explicit identity/named appointment confirmation; SQL/Chrome PASS | Real SMTP and separate persistent rollout |
| 2.3.5.1 (5) | Mentor | Attendance/behavior/absence/leave/lateness | PARTIAL | Student nonworking reasons only in daily logs | Mentor attendance/behavior recording; no invented penalties |
| 2.3.5.1 (6) | Mentor | Final Student/Book/work/Poster evaluation | BLOCKED | Weekly feedback is separate from final assessment | Defined Mentor rubric/maxima and final evaluation workflow |
| 2.3.6.1 | Academic | Total score: Mentor weekly 20% + final 30%; department Book 10% + Poster 5% + overall work/content 25% + examination 10%, chair + two members | BLOCKED | Exact proportions documented; no invented score engine or committee weighting | Supplied rubrics/maxima/committee aggregation; final assessment sources, assignment and total calculation |

### Additional Development Summary

| Date | Feature | Implementation | Tests | Database Migration | Notes |
|---|---|---|---|---|---|
| 2026-10-07 | Advisor/Class/Head/Staff document workflows | Canonical request approval, advisor confirmation, dev cooperation snapshots | Historical reports retained in HANDOFF | Through 016 historically Local | Original faculty/private storage preserved |
| 2026-10-08 (earlier session) | Company Response / Placement | Persisted acceptance before Placement; dev HTML/history | Historical 268 Backend / 175 Frontend / 12 Staff Chrome | 017 disposable only | No official PDF |
| 2026-10-08 (earlier session) | Daily Log / weekly Mentor review | Daily entries, immutable weekly snapshots/revisions/feedback | Historical 293 Backend / 184 Frontend / 12 Daily Chrome | 018 disposable only | No logbook compilation or numeric assessment |
| 2026-10-08 (earlier session) | Supervision appointments 1–2 | Teacher scheduling/reschedule/history; original/substitute scoped identity confirmation; Student read-back | Historical Backend 320 / Frontend 194 (+1 skip); supervision SQL 20 / Chrome 13 | 019 disposable only | Foundation reused by results |
| 2026-10-08 (previous session) | Supervision results 1–2 | Descriptive drafts/completion, exactly two private images, retained revisions, Student read-only view | Backend 344 / Frontend 205 (+1 skip); result SQL 21 / combined Chrome 24; Daily/Staff Chrome 12 each | New 020, disposable only | No persistent DB changes; official PDF/scoring pending |
| 2026-10-09 | Staff activity calendar — 2.3.2 (6) | Monthly/list views, create/edit/publish/cancel, immutable private history and Student publication visibility | Calendar SQL 13 / frontend 10 / Chrome 13; Staff Chrome 12 / supervision Chrome 24 | New 021, disposable only | Persistent database untouched; no commit/push/deploy |
| 2026-10-09 (current) | Staff request cancellation — 2.3.2 (2) | Search/detail/history, required reason and shared confirmation, stale status/timestamp checks, Student saved reason | Backend 144 PASS/17 SKIP; Frontend 231 PASS/2 SKIP; build PASS; current SQL/Chrome NOT VERIFIED | No migration/schema/data change | Docker access denied; no commit/push/PR/deploy |

### Remaining Tasks

- [x] Visit 1/2 result entry, exactly two private supporting photos, role-scoped read/edit and immutable history — 2.3.3.1 (7)/(9).
- [ ] Separately authorized 017–021 persistent rollout after backup/schema review; intended-recipient Mentor SMTP acceptance.
- [ ] Compile/export internship logbook — remaining portion of 2.3.1.1 (11).
- [x] Independent Staff activity calendar — 2.3.2 (6), including Student read-only published activities.
- [x] Staff request-cancellation UI — 2.3.2 (2), implemented with executable unit/DOM coverage.
- [ ] New cancellation PostgreSQL/race/rollback/Student-readback and real Chrome acceptance; Company/Teacher administration dashboards and account editing.
- [ ] Supply official letter/supervision templates before PDF issuance.
- [ ] Supply academic/weekly/final rubrics, maxima and committee aggregation rules before score calculation.
- [ ] Resolve Head advisor assignment policy, Google OAuth, Company owner portal, chatbot bridge/quality and incomplete browser/provider acceptance shown above.

**Known limits:** existing Local cannot use new migrations until separate authorized rollout; appointment confirmation proves mailbox capability possession plus explicit identity acknowledgement, and does not certify attendance. Confirmation links expire after seven days or at appointment time. Appointment edits require a future existing appointment/current version/reason and are blocked once a result exists. Completed results are immutable; post-completion correction and cancellation workflows require separately defined policy. Incorrect personal details require Teacher correction/reissue or original Mentor reverification before recording. Official PDFs, numeric grading and global Mentor reassignment remain pending. The independent activity calendar does not merge private supervision appointments. Next task: finish Staff cancellation disposable PostgreSQL and real Chrome acceptance when Docker access is available; no current VERIFIED claim.
