# FITM-INTERN

FITM-INTERN supports student co-op administration: profiles, company/job discovery, requests, project advisors, topics, private project files and student workplace feedback. Several departmental, Mentor and academic-assessment workflows remain unfinished.

**Local development is running. Production ready: NO.** The latest full audit is dated **2026-10-07 Asia/Bangkok**. Read the authoritative top section of [HANDOFF_fitm-intern.md](./HANDOFF_fitm-intern.md) for evidence, limitations and the one recommended next task.

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
| Teacher | Backend login/profile, own class-advisee request decisions, requested project-advisor accept/reject; no Teacher dashboard yet |
| Department Head | Teacher identity with explicit `is_department_head`, live DB authorization and department scope; final request decisions and permitted Teacher administration; no Head dashboard yet |
| Department Staff | Backend login/profile, request list/detail/history and pending cancellation; recruitment publish/reject; no Staff dashboard yet |
| Mentor | Token-linked profile verification/confirmation page; daily-log review and academic evaluations are not implemented |
| Company/Public | Public recruitment form and email verification; no Company management portal |

**Co-op Request:** Student submission -> Class Advisor -> Department Head -> Approved / Rejected. Department Staff may view/history/cancel eligible pending requests and is **not an approval stage**. Legacy `staff_review` is retained for historical compatibility.

**Project Advisor:** Student selects an active Teacher -> pending request -> that Teacher explicitly accepts/rejects. Only acceptance sets `students.coop_advisor_teacher_id`. Pending replacement preserves request history; stale decisions cannot confirm an old selection. Confirmed replacement is a separate unimplemented workflow. The old Head direct-assignment endpoint returns 409.

`advisor_teacher_id` is the separate **class advisor** selected by the Student. Teacher-directory loading failure must preserve it. Project-topic saving works with no advisor, pending, rejected or confirmed advisor.

**Recruitment:** Public form -> Turnstile Siteverify -> transactional Company/submission/jobs/work modes -> verification email -> `pending_review` -> Staff backend publish/reject. Unverified/pending jobs do not appear in Student matching. SMTP failure preserves the submission and supports limited resend recovery; real browser/inbox acceptance remains pending.

## Feature status summary

WORKING means the required application layers are connected and relevant automated/read-only evidence exists. It does not mean every real-browser interaction has been accepted. PARTIAL identifies incomplete scope or missing acceptance evidence; backend completion does not imply role UI completion.

| Area | Status | Notes |
| --- | --- | --- |
| Student password registration/login | PARTIAL | Real bcrypt/JWT APIs and pages; successful existing-user browser acceptance pending |
| Student authenticated reads / Teacher directory / company search | WORKING | Owner/actor guards, real models and safe directory/search projections |
| Profile, profile image, class-advisor selection | PARTIAL | Real API/storage flows; advisor-preservation regressions pass; complete persistence/browser acceptance still needed |
| Resume | PARTIAL | PDF upload, metadata, replacement, native text and OCR implemented; post-commit retention tests pass; complete browser/SQL/provider acceptance remains |
| Skills/Resume job matching | PARTIAL | Connected to real NLP, published jobs only; expiry filtering omitted |
| Student request create/list/detail/cancel/history | WORKING | Request/delivery/audit persistence and ownership tested |
| IT/INE prerequisite snapshots | WORKING | Five canonical courses, program switching, grades and saved history |
| Complete request approval UI workflow | PARTIAL | Student UI connected; Teacher/Head decision UI missing |
| Project-advisor request workflow | PARTIAL | Student UI connected; Teacher decisions are BACKEND ONLY |
| Project topic | WORKING | Owner-scoped create/edit/read-back, independent of advisor confirmation |
| Project Book / Poster | WORKING | Private storage, replacement and authenticated Blob preview; real browser/native preview pending |
| Student Company Evaluation | WORKING | Dedicated table, five 1–10 scores, comment, total/average and all eight real context sources; migration 015 applied on Local |
| Student Mentor management / verification | PARTIAL | CRUD, email/resend and token-confirmation page implemented; fresh live acceptance pending |
| Staff / Teacher / Head backends | BACKEND ONLY | Authorization and SQL decisions tested; role dashboards absent |
| Staff / Teacher / Head frontends | NOT STARTED | No usable login/dashboard/core-action pages |
| Public recruitment through publication | PARTIAL | Submission/verification implemented; inbox acceptance and Staff UI missing |
| Daily Log / company transfer / landing jobs and chatbot | MOCK / UI ONLY | DOM/demo behavior; no corresponding persistent end-to-end flow |
| FastAPI FAQ chatbot | BACKEND ONLY | Endpoint runs, but two existing tests fail and document-intent quality needs review; no Express/website bridge |
| Google login button | MOCK / UI ONLY | Placeholder; OAuth callback/account/JWT flow NOT STARTED |
| Supervision, academic scores, official documents, Internship Report | NOT STARTED | Project Book and Poster are separate existing features; workplace feedback is not academic grading |
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

Main pages: `/login.html`, `/register.html`, `/src/student_coop/student_coop.html`, `/src/mentor_coop/mentor_verify_user.html`, `/src/recruit_student/recruit_student.html`, `/src/recruit_student/recruit_verify_email.html`. Email-verification links require a current authorized token; do not record/reuse tokens.

## Database migrations

**Verified persistent Local: 16 executed / 0 pending, through 015**, on 2026-10-07. This includes 001–009, 007a, 010, 011, 012, 013, 014 and 015. No migration was applied or rolled back during the full audit.

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

Important FK/unique constraints were checked on Local. StudentFile storage has exactly one canonical storage-path UNIQUE; required Resume/project-category uniqueness remains present. A previous StudentFile fingerprint anomaly is unresolved and outside current scope. The full audit's read-only baseline/final comparison matched all 20 application tables, including three StudentFiles and their current aggregate fingerprint; no rows or files were changed.

Local currently has zero Staff accounts and zero Head flags. Do not create accounts or grant privileges without separate authorization. Current VM migration/schema/availability was not inspected; historical VM counts must not be treated as current.

## Testing and acceptance

Latest full audit: backend **210 passed / 0 failed / 0 skipped**; frontend **96 passed / 0 failed / 1 existing browser skip**; NLP **14 passed / 2 failed**. Build: seven entries passed. Syntax: 114 source JS files passed. See HANDOFF for the exact disposable target configuration, logs and preservation evidence.

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

**Real browser acceptance remains required** for authentication, responsive/native controls, project previews and evaluation save/edit/reload. The audit ran no browser and changed no security/configuration to work around prior Chrome/Node EPERM failures. Live company/Mentor inbox acceptance was not performed.

## Known limitations and deployment boundary

- Matching and published-job prefill/create check published status but omit expiry eligibility. Current Local has 20 published jobs and none expired, which does not remove the source defect.
- A request can be submitted without a class advisor; an incomplete/unknown major is rejected by prerequisite normalization. Missing class-advisor linkage can strand review authority. No change was made.
- Resume storage/extraction is implemented, but final extraction-status persistence can still return 500 after upload metadata commit; the fixed invariant retains the committed physical file.
- FAQ answers describe document issuance and persistent/Mentor-reviewed Daily Logs that the application does not implement.
- Authentication/project/evaluation projections avoid password hashes, verification secrets and absolute storage paths. Profile/image responses still return an owner-relative `profile_image` storage reference; `/health/db` can expose a raw DB error message on failure. These need review before production.
- Student login/register and Mentor resend lack the dedicated route rate limits found on role login/recruitment. Student JWTs are stored in localStorage. No observed compromise is claimed.
- Compose/Dockerfiles use Vite, nodemon and Uvicorn reload for development, publish DB/pgAdmin/API/NLP ports, and retain pgAdmin development credential defaults. Only PostgreSQL has a Compose healthcheck.
- `deploy.sh` exists and automatically applies pending migrations. It is not a read-only start/status command and was not executed. No Nginx configuration or current HTTPS/domain setup is supplied in this checkout; previous Nginx/VM success is historical evidence.

Production needs separately planned role UI/workflow completion, provider/browser acceptance, runtime/security configuration, HTTPS, backups/restore verification and deployment validation. No deployment is authorized by this README or the completed audit.

## Documentation

[HANDOFF_fitm-intern.md](./HANDOFF_fitm-intern.md) is the authoritative audit/resume point. Its top section supersedes historical migration counts, Staff-approval rules, Head direct project-advisor assignment and old topic/file/evaluation placeholder descriptions. This README remains a stable overview rather than a daily work log.
