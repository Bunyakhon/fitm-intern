# FITM-INTERN PROJECT HANDOFF

## Final checkpoint before Student work — 2026-10-06

**CURRENT AUTHORITATIVE — Asia/Bangkok.** This checkpoint supersedes earlier next-task recommendations and project priorities. Recruitment and Department Staff / Teacher / Department Head backend are **IMPLEMENTATION COMPLETE**, verified in isolated PostgreSQL. This does **not** mean Local role schema/accounts are ready or that real company inbox acceptance was completed. **STAGING / TEST READY; PRODUCTION READY: NO.**

**Documentation-only pass:** changed only `HANDOFF_fitm-intern.md`; retained all existing user/Codex WIP. No source, migration, test, README, .env, database or Docker configuration change; no migration execution, seed/reset, VM access/deploy/control, commit or push. The results below are retained evidence from the completed implementation run, not fresh runtime/tests in this documentation pass.

### 1. Recruitment — IMPLEMENTATION COMPLETE

```text
Public Company (no login)
  -> recruit_student.html
  -> client validation
  -> Cloudflare Turnstile
  -> backend Siteverify
  -> database transaction
  -> Company / JobSubmission / JobPosting / JobPostingWorkMode
  -> JobPosting = pending_email_verification
  -> Brevo verification email
  -> verification link / email verification
  -> JobPosting = pending_review
```

- Feature gate, submission/resend rate limiting, strict validation and server-side Turnstile verification implemented; configured hostname is validated. Action remains optional because the frontend does not specify an action.
- Company verification uses the same Brevo SMTP transporter/config as Mentor verification. Secure email verification tokens are stored hashed, expire and may be used only once. No raw verification token is returned in submission/resend API responses or exposed to form JavaScript; resend uses a separate purpose-scoped HttpOnly capability cookie. The verification page reads the emailed link in memory to submit verification, removes the URL token and applies referrer protection.
- SMTP failure preserves the committed submission and safe pending status; secure, rate-limited resend recovery is available. **pending_review is not published**; Staff review remains required.
- Automated real PostgreSQL lifecycle tests passed through pending_review, including related jobs and transaction rollback. Provider boundaries are mocked for automated acceptance; no fabricated provider token or unsolicited real email.
- **Remaining manual acceptance:** company submit through the real localhost browser, open the real inbox, click the actual verification email. This is not claimed as completed. No authorized browser/inbox was available in the implementation run.

### 2. Cloudflare Turnstile — configured development evidence

- Widget: **fitm-intern-recruitment-dev**; hostname: **localhost**; mode: **Managed**.
- User browser evidence: widget rendered and showed successful verification on localhost.
- Frontend configuration name: `VITE_TURNSTILE_SITE_KEY` — configured; actual site-key value omitted.
- Backend configuration names: `TURNSTILE_SECRET_KEY` — configured, value omitted; `TURNSTILE_EXPECTED_HOSTNAME=localhost`; `RECRUITMENT_SUBMISSION_ENABLED=true`.
- `TURNSTILE_EXPECTED_ACTION` is **intentionally not configured**. Do not add action enforcement without updating frontend/backend together and testing it.
- No actual site key, secret key or provider token is recorded here; Cloudflare Dashboard configuration was not changed.

### 3. SMTP / Brevo — retained evidence

Brevo SMTP is configured and Mentor verification email previously worked. Company recruitment verification uses the same SMTP transport/configuration. **Brevo connection verification: PASS** in the completed implementation run; no real company verification email was sent by Codex. SMTP credential values are omitted.

### 4. Department Staff backend — IMPLEMENTED

Login/JWT, active-account validation and current profile; recruitment pending_review list/detail; publish/reject with review audit history and concurrency protection; Co-op Request list/detail, forward to Department Head and reject with reason.

```text
Recruitment: pending_review -> published
         or pending_review -> rejected
```

**Staff frontend dashboard / Staff publish frontend: NOT STARTED — STOPPED FOR NOW.** Backend completion does not authorize beginning these frontends or preparing real accounts.

### 5. Teacher backend — IMPLEMENTED

Login/JWT/teacher authorization, active-account validation, safe profile, advisor-scoped Co-op Request list/detail, approve/reject and workflow audit history.

**advisor_teacher_id = อาจารย์ที่ปรึกษาประจำชั้น (class advisor). Student MAY select this field themselves**, subject to an existing active Teacher. This is **not an authorization bug**; historical statements interpreting class-advisor self-selection as inherently unauthorized are superseded.

Teacher review requires `authenticated teacher.id == student.advisor_teacher_id`, checked from the database. **Other Teacher: 403 / no review permission. Student selection: ALLOWED.** Changing the class advisor transfers pending advisor-review authority to the current selection; completed audit history retains its original reviewer. **Teacher frontend: STOPPED FOR NOW.**

### 6. Department Head backend — IMPLEMENTED

Teacher.position is free text and is **not** used for privilege authorization. Explicit authorization is `Teacher.is_department_head`, default **false**; identity remains the existing Teacher model, with a distinct server-issued Head role claim and live DB checks. No public role-promotion API or automatic promotion from position.

Head authorization/login/profile, teacher search/filter, permitted teacher profile updates, safe bcrypt password reset/update, department-scoped operations, Co-op project advisor assignment and Head-stage approve/reject implemented. Student has no department column; current Head student/request scope uses the class advisor's Teacher.department. Head assignment requires Co-op track and an active project advisor in scope.

| Field | Meaning / workflow |
| --- | --- |
| `advisor_teacher_id` | Class advisor selected by Student; authorizes Teacher review of the student's request |
| `coop_advisor_teacher_id` | Co-op project advisor managed by the privileged workflow; separate field and relationship |

Changing one must not overwrite the other. **Head frontend and real role account setup: STOPPED FOR NOW.** The existing administrative bootstrap mechanism is implementation evidence, not an instruction to run it now.

### 7. Co-op Request state machine — IMPLEMENTED

```text
Teacher approve: submitted / advisor_review -> staff_review
Teacher reject:  submitted / advisor_review -> rejected
Staff approve:   staff_review -> department_head_review
Staff reject:    staff_review -> rejected
Head approve:    department_head_review -> approved
Head reject:     department_head_review -> rejected
```

No role may skip its stage. Actor authorization, active status, current-state validation, required rejection reason, review history and transactional DB locking/concurrency protection implemented. Invalid/stale decisions receive 409; concurrent processing retains one legal transition and one review record. Existing downstream/terminal enum values remain intact.

### 8. Role workflow audit — IMPLEMENTED

`coop_request_reviews` and `job_posting_reviews` persist actor identity/role, decision, from/to status, reason and timestamp. Co-op reviews use separate Teacher/Staff foreign keys with CHECK constraints to enforce the correct reviewer role; job reviews retain Staff identity via FK. Schema constraints enforce legal transitions/rejection reasons; RESTRICT protects review evidence and reviewer identity. Status change and audit insertion share one transaction.

### 9. Migrations / environment boundary — Local rollout NOT DONE

Existing pending source migrations include `007a_create_missing_base_tables.js` and `010_cleanup_student_file_schema_drift.js`. Existing 010 implementation remains unchanged. New **011_add_role_workflow_reviews.js** adds explicit Head authorization, review/audit tables, constraints and indexes.

**Local DB was NOT modified by the role implementation.** Latest read-only status from the completed implementation run:

```text
Executed: 9
Pending:  3
  007a_create_missing_base_tables.js
  010_cleanup_student_file_schema_drift.js
  011_add_role_workflow_reviews.js
```

Do **not** describe Local as fully migrated. New role APIs need the role schema and intended accounts before real Local use; **Local role migration rollout and account setup are stopped for now**. Do not apply 007a/010/011, mark the ledger, seed or reset as part of this checkpoint or the upcoming audit.

VM historical evidence: **10 executed / 0 pending** at an older deployed revision. **VM SCHEMA NOT VERIFIED IN LATEST RUN — VMWARE OFFLINE. VM modified: NO.** Historical migration counts are not a current schema check; no VM deployment/start/control is authorized here.

### 10. Latest completed verification — retained results

| Check | Latest completed result |
| --- | --- |
| Recruitment tests | **27 passed** |
| Role tests | **39 passed** |
| Backend total, all integration opt-ins on disposable DBs | **104 passed / 0 failed / 0 skipped** |
| Frontend production build | **PASS — 7 pages** |
| Migration 010 tests | **11 passed** |
| Migration 011 | **UP / DOWN / rollback covered**, including refusal to erase history/Head privileges |
| Backend source syntax | **PASS — 80 files** |
| Docker Compose configuration | **PASS** |
| Backend/database health | **PASS** |
| git diff --check | **PASS** |
| Secret scan | **PASS** |
| .env files | **Remain ignored** |

These are implementation-run results. No backend/frontend/migration test, Docker runtime operation or database check was rerun in this documentation-only pass; only the requested handoff diff/status and file-scope verification are performed now.

### 11. Security checkpoint

**Secrets exposed: NO. Raw verification token exposed: NO. Password hash exposed: NO.** Configuration names are documented without secret values. Do not place actual site/secret keys, SMTP credentials, signing secrets, raw email tokens, token hashes, passwords or password hashes in this handoff. Real .env contents remain ignored and were not changed.

### 12. Current project decision — STOP role work here

The user has explicitly paused priority for Department Staff frontend, Teacher frontend, Department Head frontend, Staff publish frontend, role account setup, Local role migration rollout and VM deployment. **Do not set the next task to role dashboards, migrations, account setup or deployment.** Older recommendations to do these next are historical and superseded by this checkpoint. Existing backend/source/WIP is retained for later; no new role work is started.

### 13. Next focus — STUDENT REGRESSION + IMPLEMENTATION AUDIT

**Recommended Next Task: STUDENT REGRESSION + IMPLEMENTATION AUDIT.** This pass records the next task only; the audit/implementation has **not** begun.

Before changing Student UI, inspect current Student runtime/source for:

1. Login / auth/me.
2. Dashboard / Overview.
3. Student Profile.
4. Teacher selector.
5. advisor_teacher_id.
6. Resume upload/extraction.
7. Company search.
8. Job Matching.
9. Coop Request.
10. Mentor.
11. Co-op specific section.
12. Project advisor/topic.
13. Report/project book/poster upload.

Classify each as **DONE / PARTIAL / MOCK/UI ONLY / BROKEN / NOT STARTED**, based on current evidence, then connect **Frontend -> API -> Backend -> Database** one part at a time in the subsequently authorized implementation scope. No classifications are invented in this documentation pass.

**Compatibility gate before Student frontend changes:** Local has not applied 011, while the Teacher source model contains is_department_head. Check `GET /api/teachers` and every Student endpoint that reads Teacher, especially selector/advisor/profile relationships, against the current Local schema. Explicitly selected attributes can differ from default model reads; do not assume all Teacher queries are compatible or broken without evidence. **Do not change frontend to hide a schema mismatch.** If a Student endpoint fails because of pending migrations, stop dependent frontend changes and analyze migration compatibility first. The audit does not authorize applying migrations, preparing role accounts or resuming role/deployment work.

### 14. Documentation ownership / stop point

README.md remains the stable project/deployment overview and is unchanged in this pass. HANDOFF_fitm-intern.md is the authoritative implementation state and current priority; only this file is edited. Prior user/Codex source and documentation changes remain intact. **Documentation-only file-scope verification: PASS; handoff diff check: PASS. Source/database/VM modified this pass: NO. Commit: NO. Push: NO. STOP — no Student audit, migration rollout or next feature started.**

---

## Historical implementation evidence — RECRUITMENT + ROLE BACKEND — 2026-10-06 Asia/Bangkok

Technical evidence below is retained. Its next-task recommendation is superseded by the final Student checkpoint above.

### GATE 1 CHECKPOINT — RECRUITMENT TO PENDING_REVIEW — COMPLETE

Reached before beginning Gate 2 implementation. Existing submission/Turnstile/transaction/hashed one-time verification reused. Closed SMTP recovery gap using a signed purpose-scoped HttpOnly resend cookie (not the email token), origin checking, existing resend rate limiter and transactional token rotation. Added frontend resend control and in-memory verification retry; frontend uses POST verification and removes URL token; verification page has no-referrer policy. Legacy GET verification and token-authorized resend remain compatible. Recovery capability expires with configured verification TTL; cookie recovery is for same-site localhost/staging hosting.

Gate 1 verification: **23 passed, 0 failed/skipped** across jobSubmission, recruitmentSecurity and new real HTTP/service/PostgreSQL lifecycle suite. Two jobs remain pending_email_verification after SMTP failure; secure resend delivers through mocked provider boundary; verification transitions both to pending_review, never published; expired/used/invalid capabilities denied and injected child-write failure leaves no partial rows. Frontend production build PASS (seven entries). Real Turnstile configuration PRESENT, expected hostname localhost, action intentionally absent; Brevo transporter connectivity PASS without sending any email. User's prior green Turnstile browser evidence retained. Real company submission/inbox link click remains manual acceptance because no authorized browser/inbox is available; no provider token fabricated or email recipient invented.

Tests use a separate private Docker network, tmpfs PostgreSQL with server marker fitm.a013_disposable=on and dedicated fitm_recruitment_test database, no local data/volume mutation. No Local migration applied, VM OFFLINE / NOT VERIFIED; no SSH/deploy/VM control, commit or push.

### GATE 2 — ROLE BACKEND — IMPLEMENTATION COMPLETE

- **Department Staff:** reused existing DepartmentStaff model/password hook/JWT/login/guard. Added rate-limited strict login, `/me` and auth-profile alias. Review list defaults to pending_review; detail includes company, submission/submitted email, sibling jobs/work modes/timestamps and internal review history. Publish/reject requires verified submission and eligible pending_review job; rejects date-expired/terminal states. Records staff FK, decision, from/to, reason and timestamp atomically. Co-op list defaults to staff_review, plus detail/forward-to-head/reject.
- **Teacher:** reused identity, bcrypt compare and virtual password hook; added login, safe profile and DB-active guard. JWT actor_type=teacher, teacher_id=id, role=teacher (or department_head for explicitly privileged teachers). Advisor list/detail/action checks only student.advisor_teacher_id; other teachers receive 403. submitted/advisor_review approval forwards to staff_review; reject requires reason. Password reset bug found in integration: explicit update fields must include password_hash generated by existing hook. Fixed this path and clear virtual password after save so unrelated edits do not rehash retained plaintext; real bcrypt tests pass.
- **Department Head representation:** existing Teacher.position is free text; seeded Thai head title is historical descriptive data and NEVER grants authorization. Added explicit teachers.is_department_head NOT NULL DEFAULT false; no automatic promotion/backfill and no public promotion API. Head login/guard requires active Teacher + marker + nonempty department. Both role claim and live DB marker are checked; revoke denies existing head tokens. Administrator bootstrap command: `node src/seeders/setDepartmentHead.js grant|revoke <teacher UUID>`; grant requires existing active department/login credentials. No real identity/account was provisioned or granted here. Head may also act as class advisor through Teacher APIs for assigned students.
- **Head management:** safe name/email/major/department/password updates in own department, exact major/department filters and escaped search; no IT/INE hardcoding because canonical strings differ or may be null. Own profile permits name/email/password only. Passwords use existing bcrypt hook and input is bounded to 72 UTF-8 bytes. Project advisor assignment requires active teacher in Head's department and co_op track; never changes advisor_teacher_id.
- **Department scoping decision:** Student has no department column; Head student/request scope is determined by the student's current class advisor's Teacher.department. No guess from free-text Student.major. No class advisor or a different department means 403 for Head. DepartmentStaff schema has no department scope and retains its existing system-wide role. Teacher reassignment of department is bounded to Head's existing department; cross-department moves require a separate authorized administrative design.
- **Advisor requirement — reaffirmed:** Student MAY select advisor_teacher_id of an existing active Teacher; added malformed-UUID rejection to that existing student-info path. Review locks the Student row before the request and checks the relationship at decision time. Changing class advisor transfers pending advisor authority to the new selected teacher; completed audit events retain the old actor. coop_advisor_teacher_id is a separate privileged relationship. This supersedes historical claims that class-advisor self-selection is inherently unauthorized.

### Routes and state machine

| Namespace | Routes |
| --- | --- |
| `/api/job-submissions` | POST `/` (public), POST `/verify-email` (frontend), compatible GET `/verify-email`, POST `/resend-verification` (email token or origin-checked HttpOnly cookie) |
| `/api/staff/auth` | POST `/login`, GET `/me` |
| `/api/staff` | GET `/me`; GET `/job-postings`, GET `/job-postings/:id`, POST `/job-postings/:id/publish`, POST `/job-postings/:id/reject` |
| `/api/teachers` | Existing authenticated GET `/` directory; POST `/auth/login`, GET `/me` |
| `/api/department-head` | POST `/auth/login`, GET/PATCH `/me`; GET `/teachers`, PATCH `/teachers/:id`, PATCH `/students/:id/coop-advisor` |
| Staff / Teachers / Department Head namespaces | GET `/coop-requests`, GET `/coop-requests/:id`, POST `/coop-requests/:id/approve`, POST `/coop-requests/:id/reject` |

List status filters are validated; default queue is that actor's stage. Pagination limit 1–100 (default 25), offset >=0. Head teacher filters: q, major, department, status. UUID validation and mutation field whitelists precede queries; reject requires nonempty reason <=2000 characters. 401 missing/invalid JWT, 403 authenticated wrong role/scope or inactive actor, 404 absent entity, 409 stale/invalid transition or conflict. Student JWTs now identify actor_type/role=student; existing student_id-shaped JWTs remain supported. Student auth/profile/mentor routes now reject other actor types; job-matching change is only compatible actor checking, no NLP changes.

```text
Teacher approve: submitted OR advisor_review -> staff_review
Teacher reject:  submitted OR advisor_review -> rejected
Staff approve:   staff_review -> department_head_review
Staff reject:    staff_review -> rejected
Head approve:    department_head_review -> approved
Head reject:     department_head_review -> rejected
Staff job publish: pending_review -> published
Staff job reject:  pending_review -> rejected
```

Existing document_issued/in_progress/cancelled and other enums remain intact; no new stage-skipping APIs. Reviews reload active actor under transaction lock, serialize Student/request or job rows, then persist status and audit atomically. Concurrent approve/reject returns one success + one 409, with one review record. Audit failures roll back status. Email verification and recovery both lock submission before token, preventing conflicting lock order.

### Migration and deployment boundary

- **Existing 010 source preserved unchanged.** Its test's migration glob is narrowly scoped to historical 001–010 so new 011 does not invalidate its fixed legacy-ledger assertions; no weakening of cleanup cases. New full-history role acceptance covers 001–011.
- **Added 011_add_role_workflow_reviews.js:** teachers.is_department_head; coop_request_reviews (request FK, actor_role, Teacher FK or Staff FK, from_status, to_status, decision, reason, created_at); job_posting_reviews (posting FK, Staff FK, from/to, decision, reason, created_at). Separate nullable reviewer FKs + CHECK enforce the correct actor without unenforceable polymorphic IDs. Role/transition/rejection CHECKs, history indexes, request queue index, Student class-advisor index. RESTRICT protects reviewer identity and reviewed entities from deletion.
- UP is transactional with bounded lock wait. DOWN drops only a schema with no reviews or assigned Head privilege, and is transactional; otherwise it throws and preserves all history/authorization. Verified empty UP/DOWN/UP, injected failure after partial DDL rollback, FK/CHECK enforcement, and populated-history/privilege refusal. Does not recreate historical duplicate UNIQUE corruption.
- **Current Local DB modified: NO.** Latest read-only Umzug status: **9 executed / 3 pending: 007a, 010, 011**. Local role APIs need reviewed migration rollout before use; current source does not imply deployed schema. Retained previous 007a/010 backup/schema-review procedure below; future rollout must include 011 after those migrations, then provision account credentials/grant intended Head explicitly. No arbitrary ledger marking, current DB writes/reset, volume deletion or seed execution.
- **VM modified: NO. VM schema verification = NOT VERIFIED — VM OFFLINE.** Historical 10/0 is not current evidence; no SSH/VMware/deploy/Nginx operation. Backend/frontend containers recreated to load current config; PostgreSQL/NLP containers and data were untouched.

### Final verification

- Full disposable runner: `powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/runIsolatedWorkflow.ps1`. GUID-named resources with ownership labels, private network, PostgreSQL tmpfs, no published ports/app volumes/.env mounts, read-only source/tests. Fixed disposable host alias/database guards in new suites. Legacy transaction opt-in also ran only against a dedicated disposable DB. Runner cleans its own resources; no Local wipe. Uses installed backend and postgres:16-alpine images, no added dependency.
- **Full backend: 104 passed / 0 failed / 0 skipped**, including every integration opt-in. **Recruitment: 27 passed** (jobSubmission 9, security 9, lifecycle 8 including parent, legacy rollback 1). **Role: 39 passed** (new role/auth 4, existing staff auth 8, PostgreSQL role parent + 26 cases =27). **010 migration suite: 11 passed**; 011 migration acceptance included in role suite. Other existing backend tests: 27 passed. Startup check caught and corrected a misplaced middleware alias in studentProfile.routes; route-loading regression added and all 80 backend source files pass syntax checks. Student class-advisor existence query selects only id, preserving compatibility before the separate 011 rollout.
- **Frontend production build PASS**, all seven HTML entries. Docker Compose config PASS, PostgreSQL healthy, backend `/health/db` ok, recruitment frontend HTTP 200. Frontend public site key PRESENT; backend Turnstile/SMTP/JWT/FRONTEND_URL required keys PRESENT, recruitment enabled, expected hostname localhost, expected action absent. Brevo verify-connectivity PASS, no real email sent. No NLP suite rerun.
- Added parser-error sanitization, explicit credentialed CORS origin, HS256 JWT verification, purpose-scoped cookie, token-in-body frontend verification and referrer protection. Public and role responses omit email token/hash and password/hash; test fixtures/provider mocks only, no actual env values written to source/docs/output. .env files and frontend/dist remain ignored. Final diff review, actual-secret-value scan, scope check and git diff --check PASS. Runtime DB health, sanitized malformed-JSON response and credentialed localhost CORS PASS after startup correction.

### Files changed by this run (previous WIP retained)

- Recruitment: backend controllers/jobSubmission, routes/jobSubmission, services/jobSubmission, companyVerification, email, new recruitmentRecovery; frontend api/recruitStudent, pages/recruitStudent + recruitVerifyEmail, verification HTML, recruit.css, new frontend/.env.example.
- Staff: controllers/staffAuth, routes/staffAuth (existing staff service/model reused).
- Teacher: new controllers/teacherAuth, services/teacherAuth, middlewares/teacherAuth; models/teacher.
- Department Head: new seeders/setDepartmentHead; Head endpoints implemented in the shared workflow files.
- Shared/Auth: app; new controllers/roleWorkflow, routes/roleWorkflow, services/roleWorkflow, validators/roleWorkflow; middlewares/auth; Student auth claims and guards in controllers/auth, routes/auth/studentProfile/mentor/coopRequest/jobMatching; narrow advisor UUID check in controllers/studentProfile; new models/coopRequestReview and jobPostingReview.
- Migration: new 011; retained user/Codex 010 unchanged.
- Tests: new recruitmentLifecycle.database, roleWorkflow.database, roleAuth, runIsolatedWorkflow.ps1; recruitmentSecurity expanded; studentFileSchemaDrift baseline glob scoped (existing WIP otherwise retained).
- Docs: README stable overview and current authoritative HANDOFF. No unrelated Student UI, dashboards, NLP source/test or deployment config modified. All work uncommitted; no commit/push.

### Remaining acceptance / next task

Source and isolated tests complete; Local migration/account activation and real browser/company inbox acceptance remain explicit operational steps. Browser acceptance is manual because no authorized browser/inbox was available; user's prior green localhost widget is retained as evidence only. Runtime role acceptance with real accounts needs the reviewed Local migration procedure and administrator identity choice. Cross-site hosting of recovery cookie is outside current same-site localhost/staging contract. Existing VM hardening, document/evaluation workflow and historical NLP failures remain outside this task.

**Historical next-task recommendation — SUPERSEDED:** Local migration/account preparation, role dashboards and published-job frontend connection were previously recommended. They are now **STOPPED FOR NOW** by the user's final checkpoint decision. The current recommended next task is **STUDENT REGRESSION + IMPLEMENTATION AUDIT** above. Manual recruitment inbox acceptance remains outstanding. **STAGING / TEST READY; PRODUCTION READY: NO. STOP — no next task begun.**

---

## HISTORICAL — A01.2 / A01.3 DATABASE REMEDIATION COMPLETE (source + isolated verification) — 2026-10-06 Asia/Bangkok

**Completed scope:** migration 010 implementation, isolated PostgreSQL acceptance and backend regression suite, documentation updates and advisor requirement correction. **Not applied to current Local or VM.** README and handoff already had uncommitted changes at the start; retained them, adding the current result and correcting explicitly superseded claims. Older dated sections below are historical evidence, not current task instructions or deployment status. No full project re-audit, unrelated business source changes, feature implementation, deployment, commit or push.

### A01.2 — source, Local and VM verification

- Inspected `migrate.js`, migrations 007/007a/008/009, `models/index.js`, StudentFile/CoopRequest models, co-op controller and app bootstrap. Source scan of `backend/src` for `sequelize.sync`, `.sync(`, `alter: true`, `force: true` found **no automatic schema alteration**. Startup uses `authenticate()`; models/index loads and associates only.
- **Local read-only recheck:** `BEGIN READ ONLY` catalog/ledger SELECTs through the existing PostgreSQL container: **9 executed**, 007a still absent; **75 storage_path UNIQUE constraints**, backing indexes all valid/ready; submitted_at default **CURRENT_TIMESTAMP**. With new source migration 010, current pending list is **007a + 010 (2 pending)**. No mutation was performed to the current Local DB; prior equivalent-signature/dependency evidence remains applicable without bulk re-investigation.
- **VM schema verification = NOT VERIFIED — VM OFFLINE.** User confirmed the Ubuntu VMware staging VM is powered OFF and inaccessible in this run. No SSH attempts, remote commands, connectivity waits, VMware startup/control or deployment are permitted in this run; VM verification is not a blocker for Local/source/isolated work. Previously confirmed **10 executed / 0 pending**, with 007a applied successfully, is **historical deployment evidence only**, not a live ledger check. **010 is not deployed/applied there**. VM UNIQUE count/default/indexes remain unknown. No VM access or control was attempted in response to this availability update; VM services, containers, env and Nginx were not changed.

### A01.3 — migration 010 behavior

**Created:** `backend/src/db/migrations/010_cleanup_student_file_schema_drift.js`, following existing naming/Umzug CommonJS convention. No migration helper/runner/model/controller change was needed.

- Requires PostgreSQL and the repository's `public.student_files` ordinary, non-partitioned, non-inherited table with NOT NULL storage_path. Missing table/column/UNIQUE or unsupported shape fails for review rather than silently claiming success or inventing schema.
- Inspects actual `pg_constraint` constrained attnums and owned backing indexes via `pg_index`/`pg_depend`; candidates are **UNIQUE on storage_path alone**, not name patterns. Compares column keys, opclasses, collations, access method/options, null semantics, deferrability, index keys/attribute counts, expressions and predicates. Supports the existing immediate non-deferrable one-column btree shape; rejects mismatched/unsupported signatures before any DROP.
- Preserves valid/ready/live **`student_files_storage_path_key`** when available; otherwise chooses the first valid equivalent candidate in deterministic name order. No fixed 75-count assumption. An equivalent invalid/not-ready candidate cannot be keeper; no valid keeper means fail. Unexpected index ownership/inheritance/liveness also fails.
- Uses managed transactional DDL with **5s lock timeout**, **60s per-statement timeout**, `ACCESS EXCLUSIVE` table lock, table-identity recheck, and postcondition confirming the original keeper OID/signature is still the single valid constraint. These limits are per statement, not a total migration deadline; a maintenance window remains necessary even for a no-op check.
- Before any DROP, rejects external dependencies on duplicate constraints/indexes and replica-identity/cluster roles on duplicate indexes. Uses quoted identifiers and **DROP CONSTRAINT ... RESTRICT** only; no CASCADE, standalone DROP INDEX, data writes, or submitted_at normalization. PostgreSQL removes only each dropped constraint's owned backing index. Unrelated PK/FKs, composite UNIQUE, partial resume index and standalone indexes are untouched.
- Logs retained constraint/index and redundant count, including zero for a clean DB. Already one correct UNIQUE => effective no-op; verified duplicates => one survivor; drift/dependency/DDL failure => error and transaction rollback. Umzug ledger recording happens separately after up succeeds; if recording fails, rerunning 010 is safe.

Catalog references used for implementation: [PostgreSQL 16 pg_constraint](https://www.postgresql.org/docs/16/catalog-pg-constraint.html), [pg_index](https://www.postgresql.org/docs/16/catalog-pg-index.html), [pg_depend](https://www.postgresql.org/docs/16/catalog-pg-depend.html).

### Rollback and submitted_at policy

- `010.down()` is an explicit **non-destructive no-op**, analogous to 007a's preservation policy: keeps data and canonical uniqueness and does not recreate redundant constraints. Umzug may remove 010's ledger entry; up can then recheck safely. This restores no historical duplication or original OIDs. Before commit, a failure in up restores all removed constraints through transaction rollback; verified by injected failure after a first DROP in disposable PostgreSQL.
- Application still sends **submitted_at: new Date()**. Model literal fallback and Local CURRENT_TIMESTAMP remain unchanged. Clean migration 007a produces **no DB default**, now also confirmed by a complete disposable 001–010 run. Normal application creation does not require a DB default; origin of the Local default remains **UNKNOWN / NOT PROVEN**.
- **Decision:** do not mix this default drift into 010, remove Local's default for cosmetic parity, or create 011 now. Supersedes A01.1's recommendation to normalize all defaults by default. Consider a separate explicit normalization migration only if a functional need arises, such as a supported writer omitting the timestamp; define its contract and environment-aware rollback first.

### 007a — exact future Local reconciliation procedure (not performed)

1. Back up the target DB/files and verify restore, review the pending list/revision and compare all eight existing base tables/columns/enums/keys to 007a plus 008/009. Recheck the actual cleanup candidates/dependencies and uniqueness/null data aggregates; confirm no startup alter-sync. Current evidence/test rehearsal does not replace per-target preflight.
2. Rehearse against an isolated target clone if needed and schedule the table-lock window. 010 is now implemented and verified, so cleanup strategy is concrete before ledger reconciliation. Do not edit old migrations or directly INSERT/mark `sequelize_meta`.
3. In a separately authorized application task, run normal repository commands: `docker compose exec -T backend npm run db:migrate:status`, then `docker compose exec -T backend npm run db:migrate`. Given the current pending set, Umzug runs **007a then 010** lexically: 007a skips already-existing tables and records its actual execution; 010 handles the known constraint drift. Do not run 010 outside Umzug first or fabricate earlier history.
4. Run `docker compose exec -T backend npm run db:migrate:status` and inspect postconditions: expected **11 executed / 0 pending**, one valid storage-path UNIQUE plus untouched unrelated constraints, unchanged data, unchanged submitted_at default, and application acceptance. If 007a succeeds but 010 fails, 007a can be recorded while 010 remains pending; cleanup transaction rolls back. Review/fix the reported assumption or lock issue and retry normally rather than manually editing history or rolling back preserved base tables.
5. A future VM rollout requires the user to confirm restored availability and authorize that separate operation, then target-specific read-only schema inspection and backup. Do not infer Local's 75 duplicates from historical VM ledger. Current instruction is no VM access, polling, startup/control, migration application or deployment; no live reconciliation/application or deploy.sh was run here.

### Verification — complete

**Added:** `backend/test/studentFileSchemaDrift.test.js`. Uses node:test and real PostgreSQL/Umzug; integration is opt-in through `STUDENT_FILE_MIGRATION_TEST=true` and has no connection to config/database.js, .env or app DB variables. Target is fixed to `a013-postgres` / `fitm_migration_test`; checks database name and server setting `fitm.a013_disposable=on` **before any fixture reset**. Normal backend runs skip this acceptance group unless explicitly configured in the disposable environment.

Disposable runtime: existing `postgres:16-alpine` and `fitm-intern-backend` images, private network `fitm-a013-verification-20261006`, PostgreSQL container `fitm-a013-postgres-20261006` with network alias `a013-postgres`, tmpfs database storage, **no published ports or persistent/app volumes**. Server launched with `-c fitm.a013_disposable=on`; isolated test-only trust auth needs no credentials. Runner mounts only backend/src and backend/test read-only and joins only this network. Current Local service containers were not recreated/restarted.

| Verification | Result / coverage |
| --- | --- |
| Migration-specific suite | **11 passed, 0 failed/skipped** (two standalone tests, acceptance parent and eight scenarios); also included in the full suite below |
| CASE A: clean single UNIQUE | PASS; original constraint OID retained, no drops |
| CASE B/C: 75 equivalent constraints | PASS; 74 redundant constraints removed, one canonical remains; synthetic rows unchanged; original PK, unrelated single/composite UNIQUE, partial resume and standalone indexes preserved |
| CASE D: rerun/status/down | PASS; complete clean 001–010 history **11/0**, direct rerun and Umzug no-pending no-op, down retains one UNIQUE, up restores ledger; legacy simulated 9-executed history runs 007a then 010 without manual marking |
| CASE E: application expectations | PASS; StudentFile unique declaration retained, raw SQL and actual StudentFile ORM duplicate writes fail with 23505 naming the canonical constraint |
| Additional failure/selection cases | PASS; deterministic fallback/quoted names, absent table or UNIQUE, non-equivalent null semantics, FK dependency conflict, and rollback after injected partial DDL failure |
| Full backend suite | **62 passed, 0 failed, 1 skipped** via `npm test` in isolated runner with migration opt-in enabled. Includes original 51 passing tests plus 11 new migration tests; existing recruitment DB integration remains intentionally skipped. |
| Formatting/syntax | New migration/tests formatted using existing Prettier; node syntax checks passed. No frontend/NLP code touched, so build/NLP not rerun. Their prior authoritative results remain Frontend PASS; NLP 14 passed / 2 failed. |
| Final Git review | `git status --short`, diff review and `git diff --check` PASS; only the four allowed paths below. No real secrets introduced. |

The disposable test creates/drops synthetic schemas/rows and simulates ledger gaps **only on the guarded ephemeral server**; it does not apply/mark migrations on current Local or VM. Verification runtime is removed after testing. No production backup/restore or actual Local data clone was tested; live application remains a separate operation.

### Advisor requirement correction — authoritative

- **Student may select advisor_teacher_id: YES.** It is the **class advisor (อาจารย์ที่ปรึกษาประจำชั้น)**, who must exist and be valid/active. Current student-info controller checks the selected active teacher. This self-selection **is not an authorization bug**; old A03/security interpretations are withdrawn and replaced below.
- Future teacher approval/rejection must authorize **only the teacher matching the student's advisor_teacher_id** for that student's co-op request. Other teachers must not act without authorization. Define how changing class advisor affects already-submitted requests when implementing that future workflow.
- **coop_advisor_teacher_id** is the separate **co-op project advisor (อาจารย์ที่ปรึกษาโครงการสหกิจ)** relationship/workflow; do not substitute it in class-advisor approval. No teacher approval, recruitment feature or Turnstile configuration was implemented here.

### Documentation, changed files and remaining work

- `README.md`: added 010 to migration list/behavior, new source-vs-deployed ledger distinction (Local 9/2, old VM revision 10/0, isolated clean 11/0), current test results and corrected advisor note; retained stable overview and **STAGING / TEST READY; PRODUCTION READY: NO**. Prior checkout/VM config mismatch still unresolved.
- `HANDOFF_fitm-intern.md`: current results and policy; prior audit's advisor-selection risk/backlog statements corrected, with historical investigation otherwise retained.
- New source/test files: `backend/src/db/migrations/010_cleanup_student_file_schema_drift.js`, `backend/test/studentFileSchemaDrift.test.js`. No changes to runner, 007a/008/009, models, controllers, frontend, NLP or deployment config.
- Remaining risks/limits: live Local still has 75 duplicates and pending 007a/010; **VM OFFLINE, schema NOT VERIFIED**, 010 not deployed, and offline verification is not a blocker; backup/restore and target maintenance window not performed; unsupported signatures or dependencies intentionally block cleanup; submitted_at drift deliberately retained; existing staging hardening and NLP chatbot test issue unchanged. Source + isolated verification complete does not mean live remediation applied. Availability update changed only README/handoff; completed source/tests remain unchanged and were not rerun.

**Recommended NEXT TASK: Teacher Approval / Coop Request workflow.** Keep student class-advisor selection allowed; implement authenticated matching-advisor approve/reject and allowed co-op status transitions only after the next instruction. Live DB rollout is a separately authorized operation using the procedure above. **STOP — no next feature or deployment begun.**

---

## Historical A01.1 + README result — 2026-10-06 Asia/Bangkok (superseded by A01.2/A01.3 above)

This section supersedes older migration/default conclusions and deployment status where they differ. Continue from the existing A01 investigation and the user's confirmed A01.1 evidence; do not restart the audit. Scope of this continuation: analysis and documentation only, modifying `README.md` and this handoff. The handoff already had uncommitted changes before this task; all prior content is preserved below. No fresh DB, DB/schema write, migration execution/file, constraint DROP, source edit, seed, commit, or push was performed. A03 was not started.

### A01.1 evidence and root-cause confidence

| Confidence | Finding | Evidence / limit |
| --- | --- | --- |
| **CONFIRMED** | Local `student_files.storage_path` has 75 UNIQUE constraints, each owning one backing index; not 75 constraints plus another 75 standalone unique indexes | User-provided completed A01.1 catalog investigation. All constraint/index signatures equivalent; indexes valid/ready. No repeated 75-object query in this continuation. |
| **CONFIRMED** | No FK references `storage_path`, and no external dependency specifically requires any duplicate | Completed A01.1 dependency inspection supplied by user; this is a snapshot, requiring target-specific recheck before future DDL. Ownership dependency between each constraint and its index is expected. |
| **CONFIRMED** | StudentFile declares `unique: true`; older startup used `sequelize.sync({ alter: true })`; current startup only authenticates | `backend/src/models/studentFile.model.js`, A01 Git evidence below (`7c0726c`, `b4cdc13`, removal in `7aaccfd`), `backend/src/app.js`. |
| **STRONGLY SUPPORTED — high confidence** | Repeated legacy automatic alter sync is the strongest supported cause of accumulated storage-path UNIQUE constraints | Model-level uniqueness + historical alter-sync + equivalent numbered constraint family (`..._key` through `..._key74`) fit this mechanism. Not proof of exact execution history or that every duplicate was created by sync. |
| **UNKNOWN / NOT PROVEN** | Exact creator/time/run count for each duplicate; origin of local `coop_requests.submitted_at DEFAULT CURRENT_TIMESTAMP` | Ledger contains names only; no historical DDL log supplied. Do not attribute this default to alter-sync: CoopRequest was introduced after startup sync was removed, per user's historical evidence. |

### storage_path cleanup recommendation

- Preserve **one** semantically equivalent UNIQUE constraint for `storage_path` and its owned backing index; **74** constraints are redundant under the confirmed local snapshot. Prefer canonical **`student_files_storage_path_key`**, with its backing index identified via `pg_constraint.conindid` (normally the same name). This is the retention candidate, not authorization to DROP or a fresh OID/index-name check. Prefer the unsuffixed name for stable naming/clean-migration alignment; name alone does not prove validity or age.
- Before selecting it, confirm schema/table identity, UNIQUE on exactly `storage_path`, valid/ready index, equivalent access method/key/opclass/collation, predicates/expressions, null handling, deferrability and dependency behavior. If it is missing/invalid/non-equivalent, stop and review another equivalent valid keeper; do not silently choose by suffix or OID. Preserve `student_files_one_resume_per_student`, PK, FK and all other indexes/constraints.
- No external dependency was found in the completed investigation. Source scan of controllers/services/middleware found no explicit reference to the storage-path constraint name or `ON CONFLICT ON CONSTRAINT`; recheck external consumers when executing. Drop redundant **constraints**, letting PostgreSQL remove their owned indexes; do not independently DROP backing indexes and never use CASCADE.
- Application uniqueness semantics stay the same with one valid equivalent constraint; duplicate paths remain rejected. Error constraint names and planner choices may differ, and reduced storage/write overhead is expected but not benchmarked. No duplicate-data risk is introduced if the valid keeper is preserved throughout; enforced `NOT NULL` plus valid uniqueness supports no duplicate path rows in the present state. No row-level data scan was done in this continuation, so this is not a fresh data-integrity certification.
- Before future DROP: backup and tested restore; target-specific schema/ledger check; aggregate duplicate/null-path check without exposing values; fresh signatures, valid/ready and dependency checks; exported exact constraint/index definitions; lock/maintenance-window plan; confirm startup alter-sync remains disabled. Use bounded lock timeout and transactional DDL with a fresh check under the lock. Abort on unexpected dependencies/drift. Verify one surviving valid UNIQUE, unchanged row counts and existing resume/FK constraints, plus duplicate-write rejection in an isolated test environment.

### submitted_at findings and source-of-truth recommendation

**CONFIRMED:** `createCoopRequest` explicitly sends `submitted_at: new Date()` (`backend/src/controllers/coopRequest.controller.js:318`). It does not rely on the DB default in the current create flow. Local DB has `timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP` from prior catalog evidence. Current CoopRequest model has `defaultValue: sequelize.literal("CURRENT_TIMESTAMP")`; 007a uses `DataTypes.NOW`, whose installed PostgreSQL query-generator output had **no SQL default**. A model literal is an ORM insert fallback, not proof that migrations installed a DB default. No migration in 001–009 adds a coop submitted-at DB default after 007a. Default origin remains **UNKNOWN / NOT PROVEN**, independently of the storage-path root cause.

| Option | Benefit | Cost / compatibility |
| --- | --- | --- |
| Application explicit timestamp | Preserves current submission-event semantics and current controller behavior; works with local DB and migration-created DB | Depends on app clock; direct SQL/other writers must supply a value if DB has no default. |
| Sequelize model default only | Fallback for ORM creates omitting the attribute; current literal asks DB to evaluate CURRENT_TIMESTAMP | Does not install DDL or cover direct SQL; `DataTypes.NOW` migration behavior cannot be assumed equivalent. |
| Database default only | Common fallback for all writers; DB clock | Explicit app values still override it; making DB authoritative would require changing the controller/insert contract. CURRENT_TIMESTAMP is transaction-start time, so differs from `new Date()` in long transactions. |
| **Application explicit + model/DB fallback (recommended)** | Keeps existing application event time; default protects writers that omit it and aligns future environments | Two clocks must be synchronized; this is not a single universal clock. Explicit NULL still fails NOT NULL. Requires a reviewed migration for clean DB parity. |

**Recommended contract:** `submitted_at` means the submission event instant; the explicit application value is authoritative when supplied. Keep current application behavior and the model literal fallback; retain the existing local DB default and propose explicitly establishing the same DB fallback in all environments through a future migration. Do not remove the local default just to match 007a. Do not rewrite historical rows or change timezone/type. If a single DB-clock policy is wanted instead, decide that separately before altering controller/model behavior. This is a proposal only; no default was added/removed in this round and no model was edited.

### Clean expected state versus local and staging

Reviewed migration source in lexical order: `001`, `002`, `003`, `004`, `005`, `006`, `007`, `007a`, `008`, `009`. Earlier migrations do not create StudentFile/CoopRequest. 007a creates absent base tables, with one `storage_path` UNIQUE; 008 only adds resume extraction fields; 009 only adds company/job links, FKs and indexes. Neither later migration changes these two uniqueness/default definitions.

| Item | CLEAN EXPECTED from current migration source | CURRENT LOCAL DB (confirmed prior audit) | STAGING VM (user-reported) |
| --- | --- | --- | --- |
| Ledger | 10 executed / 0 pending after successful full migration sequence | 9 executed / 1 pending: `007a_create_missing_base_tables.js` | **10 executed / 0 pending**; 007a already applied successfully |
| `storage_path` UNIQUE | **1 constraint + 1 backing index**; separate partial resume index also exists | **75 constraints + 75 owned indexes**, all equivalent/valid/ready; no extra standalone duplicates | Actual constraint count **NOT VERIFIED**; ledger does not prove schema parity |
| `coop_requests.submitted_at` DB DEFAULT | **Absent**, based on previously inspected installed Sequelize generator for 007a `DataTypes.NOW`; NOT NULL remains | **CURRENT_TIMESTAMP** | Actual DB default **NOT VERIFIED** |

Clean state is a source/query-generator prediction, **not** a newly created or migrated DB. It depends on the same Sequelize generator behavior; clean rehearsal must pin/check dependency versions. The VM must not inherit local drift findings without its own schema evidence. Local pending 007a is an environment-specific ledger mismatch: base tables already exist, and its table-name guards would skip them rather than repair drift. Historical A01 clean-default wording (“may lack”) is superseded by this definite source-based expectation with the execution limit above.

### Safe future remediation proposal — not implemented

Proposed name, following existing three-digit snake-case `.js` convention: **`010_cleanup_student_file_schema_drift.js`**. No migration file was created.

1. Reconcile the intended ledger path separately after approval, backup and target-schema review; do not combine cleanup with direct `sequelize_meta` insertion or assume 007a repairs drift. Preserve old applied migrations.
2. Future 010 should inspect each target's constraints/index signatures/dependencies at execution time, identify only equivalent `storage_path` UNIQUE constraints and preserve one valid canonical constraint. One already-valid equivalent constraint is a no-op; missing uniqueness or non-equivalent/invalid objects should fail for review rather than broadly delete/create objects.
3. Inside explicit transactional DDL and a bounded lock window, drop only verified duplicates using RESTRICT behavior; never CASCADE or separately drop their owned indexes. Keep data, NOT NULL, resume partial index, PK/FKs and other keys unchanged. Verify keeper/postconditions before commit. Do not hardcode “74 drops” across environments.
4. Leave submitted_at out of the cleanup by default. If the fallback contract above is accepted, propose a separate **`011_align_coop_request_submitted_at_default.js`**: inspect type/nullability/existing default; add CURRENT_TIMESTAMP only where absent, no-op when equivalent, abort on an unexpected default. No row rewrite. This separate name is also only a proposal, not a created file.
5. Rehearse on an isolated clone and a clean migrated DB only in a separately authorized task: first run, rerun/no-op behavior, uniqueness rejection, dependency preservation, and controller timestamp plus omitted-value fallback. Inspect VM independently.
6. **Rollback:** before commit, transactional failure restores original constraints/indexes. After commit, keep at least the canonical UNIQUE and all data intact; do not make `down()` drop the keeper or recreate 74 redundant constraints automatically. Document a semantic no-op cleanup rollback and the limitation that Umzug can remove its ledger entry without restoring historical duplication. If exact structural restoration is required, use the pre-change exported definitions with a separately reviewed restore procedure; OIDs cannot be assumed stable. For a default alignment migration, capture each target's prior default so rollback removes only a default newly introduced there and never removes a pre-existing CURRENT_TIMESTAMP default. Settle that per-environment rollback record before implementation.

### README / VM documentation and verification

- Populated existing **empty tracked `README.md`** with a Thai project overview, requested sections, actual feature distinctions, architecture, local commands, variable names, migration list/status, staging/deploy/Nginx facts, testing limits, security and production backlog, and handoff link. No real environment values, passwords, JWTs, credentials, verification tokens or personal Git email were copied.
- VM facts are **user-reported**, not newly probed: Ubuntu 26.04.1 LTS, private static LAN `192.168.10.137`, Docker/Compose/Git/Codex CLI/Nginx installed, Node runs in Docker; Backend/DB/NLP/Frontend/Nginx/reverse proxy/browser access passed. Workflow Windows → GitHub/main → VM deploy.sh → staging test. **STAGING / TEST READY; PRODUCTION READY: NO.** This supersedes the earlier “DEVELOPMENT ONLY” conclusion for the reported VM, while the checked-in Compose still uses development servers.
- Important checkout/VM distinction: current tracked checkout lacks `deploy.sh`, Nginx configuration, `.env.example`, `backend/.env.example`, `frontend/.env.example`, although the VM facts supplied describe deploy.sh and committed examples. Documented this mismatch explicitly; no files invented/created outside scope. Inspect VM revision/config in a future task. Local Compose has fixed environment/development credentials; `.env` alone cannot substitute those values. pgAdmin exists locally, with no reported VM acceptance status.
- Latest authoritative results retained, **not rerun** for documentation: backend **51 passed / 1 skipped**, frontend build **PASS**, NLP **14 passed / 2 failed** (chatbot TestClient/lifespan setup; live endpoint responds). No claim of a fully green suite. No bulk catalog re-query was necessary.
- Remaining staging: test data/accounts, port lockdown, UFW, SMTP, Turnstile, Google OAuth (implementation absent), HTTPS/domain, production frontend serving/runtime hardening, database/file backup and restore strategy. Current ports may bind 0.0.0.0; target loopback bindings behind host Nginx, with pgAdmin reviewed if present.
- Documentation checks for this task: `git status --short`, `git diff -- README.md HANDOFF_fitm-intern.md`, `git diff --check`; only these two paths changed, existing handoff content retained. No source/DB/schema change, migration application, commit or push.

**Recommended NEXT TASK — A01.2, only after a new instruction:** review/accept the keeper, submitted-at fallback contract and rollback policy; inspect VM schema/config/revision read-only; prepare target backup/restore and an authorized isolated clean/clone rehearsal. Then, under explicit implementation scope, create/review migration(s) and plan local ledger reconciliation separately before applying anything. Do not implement remediation, create migrations, DROP constraints, or start A03 in this continuation. **STOP after reporting A01.1 + README.**

---

## Prior investigation and runtime evidence (preserved; superseded where stated above)

## A01 Migration Ledger Reconciliation — investigation only — 2026-10-06 15:04 Asia/Bangkok

This A01 finding updates only the migration analysis in the two 2026-10-06 audit sections below. It is **read-only investigation**, not approval to reconcile the ledger. No `db:migrate`, `007a.up`, migration rollback, seed, database write, schema change, or source edit was run. The handoff is the only tracked-file change.

### Evidence and root cause (A)

- `backend/src/db/migrate.js` discovers `*.js` with Umzug and stores executed **filenames** in `sequelize_meta` through `SequelizeStorage`; the installed Umzug glob resolver sorts paths lexically. The local ledger contains `001`–`007`, `008`, and `009`, but **does not contain `007a_create_missing_base_tables.js`**. `sequelize_meta` has only a `name` column, so it does not record when rows were inserted.
- Git commit `9e2839d` added `007a` as a **new file** after `5b0ce0b` had already added `009`. Git history of `backend/src/app.js` shows older revisions (`7c0726c`, `b4cdc13`) called `sequelize.sync({ alter: true })` on startup. Commit `7aaccfd` removed that sync and switched startup to `sequelize.authenticate()` only. Current `backend/src/models/index.js` merely loads/associates models; it does not sync schema.
- The most strongly supported explanation is **legacy model sync created the base tables outside Umzug; 007a was added later as a backfill migration after 008/009 were recorded locally**. This explains why tables exist while 007a is pending: Umzug checks ledger names, not table existence. Exact creation time and whether every table came from sync cannot be proven from the present DB catalog/ledger; a manual action remains possible. The 75 repeated `student_files.storage_path` UNIQUE constraints are consistent with repeated legacy `alter:true` sync, but are not proof of its exact run history.

### 007a intent versus current PostgreSQL (B)

`007a.up` calls `showAllTables()` once, then conditionally creates **eight** tables, in FK-safe order: `teachers` → `students` → `student_profiles` → `student_files` → `mentors` → `mentor_tokens` → `coop_requests` → `coop_request_delivery_methods`. It checks **only table names**, not columns, constraints, or indexes. Direct read-only `showAllTables()` returned those exact eight names; PostgreSQL catalog also found all eight. Therefore, if current state stays unchanged, all eight create blocks (including their index creation) would be skipped. That is an inference from the code and read-only result; the migration was not executed.

| 007a intends | Current DB catalog result | Difference |
| --- | --- | --- |
| Eight base tables with their declared columns, nullability, varchar lengths, numeric precision, PKs, and seven enum types | All eight present; inspected column definitions and enum labels match 007a's base definitions | No missing base table/column/enum found. Column order differs for fields added over time; order has no identified application effect. |
| Eight base foreign keys: two Student→Teacher, and one each Profile→Student, File→Student, Mentor→Student, MentorToken→Mentor, CoopRequest→Student, DeliveryMethod→CoopRequest | All eight present with matching `ON UPDATE CASCADE`, `ON DELETE SET NULL` for teacher links and `CASCADE` for student-owned links | No missing intended base FK found. Two further CoopRequest→Company/JobPosting FKs came from 009. |
| Unique constraints on Teacher email; Student email/student ID; Profile student ID; File storage path; Mentor student ID; MentorToken token hash; plus a partial unique File resume/student index and unique DeliveryMethod request/method index | All intended unique keys and both special indexes exist | `student_files.storage_path` has **75 equivalent UNIQUE constraints/indexes** (`..._key` through `..._key74`), versus one intended. 007a's table-name guards would not remove them. |
| `coop_requests.submitted_at`: `DATE NOT NULL`, `defaultValue: DataTypes.NOW` | `timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP` | Installed Sequelize PostgreSQL query generator renders the 007a attribute as `DATE NOT NULL` **without a DB default**. A clean migration therefore would differ from this DB unless a later step adds a default. |
| Base StudentFile / CoopRequest columns only | StudentFile has `extracted_text`, `extraction_method`, `extraction_status`, `extracted_at`; CoopRequest has `company_id`, `job_posting_id` plus FK/indexes | Expected later additions from executed `008` and `009`, not missing fields in 007a. |

Catalog evidence: read-only `information_schema.columns`, `pg_constraint`/`pg_get_constraintdef`, `pg_indexes`, `pg_enum`, and `sequelize_meta` queries against `intern_system`. The 75-constraint count was confirmed with a focused aggregate query. No row values or personal data were read. The `DataTypes.NOW` result came from local query-generator inspection only; a clean database was not created or migrated in this investigation.

### Clean database behavior (C)

Predicted from filenames and source, **not executed**: Umzug sorts paths, so `001`–`006` create recruitment tables, `007` creates staff, `007a` then creates the eight absent base tables, `008` adds Resume extraction columns to `student_files`, and `009` adds Company/JobPosting links to `coop_requests`. The 007a table order satisfies its internal FK dependencies; 009's target tables were created earlier by 001/003. A clean database would have one `student_files.storage_path` unique constraint, not the 75 seen locally. Its `coop_requests.submitted_at` may lack a database-level default because `DataTypes.NOW` generated none in the installed PostgreSQL query generator. A clean migration run remains **NOT VERIFIED** because it would create schema, which this task forbids. `007a.down()` is intentionally a no-op; on a clean DB, rolling back its ledger entry would leave its tables in place.

### Risk and safe options (D–F)

**Risks:** A pending ledger entry may surprise deployment scripts and make environments diverge. Running 007a on an existing but incomplete table would skip the whole table and silently record the migration without repairing missing columns/constraints. Current local DB has 75 redundant storage-path unique constraints, with likely write/index overhead; 007a would not fix them. Fresh DBs may differ on `submitted_at` default, and rollback does not remove base tables. No current data corruption was established by this metadata audit.

1. **Leave pending now (no write):** retain the warning and investigate/test a fresh isolated DB later. Safest immediate choice; ledger remains unresolved.
2. **Future standard Umzug execution, after explicit approval:** first back up the target DB, recheck its eight table names and full schema, and test the complete clean-DB path separately. If current DB remains as observed, `007a.up` should skip all create blocks and Umzug should record its name. This reconciles the ledger through the normal mechanism, but does **not** fix duplicate constraints or the default difference. Do not apply this prediction to other DBs without inspecting each one.
3. **Future metadata-only ledger mark, after explicit approval:** insert the filename into `sequelize_meta` without running 007a. This avoids conditional DDL but bypasses Umzug execution and can falsely certify an incomplete schema; it is less preferable and still a prohibited write in this round.
4. **Future dedicated drift repair, separately approved:** analyze and remove redundant unique constraints and settle the `submitted_at` default/rollback policy with a reviewed migration. This is distinct from ledger reconciliation and is not authorized now.

**Recommendation:** choose option **1 now**. For eventual A01 closeout, use option **2 only after an approved, read-only schema recheck and a separate clean-database rehearsal**, then handle observed drift as a separately reviewed task. Do not run `db:migrate` or change `sequelize_meta` under the current investigation-only instruction. **Resume point:** present this evidence for approval before any migration action; do not proceed to A02/A03 as part of A01.

## Runtime/integration continuation — 2026-10-06 14:54 Asia/Bangkok

This is the latest runtime evidence for the source audit below. All probes used existing services, anonymous/read-only requests, or synthetic in-memory NLP input. No migration, seed, database write, schema change, or source-code edit was made. The Vite build regenerated ignored `frontend/dist` output; this handoff remains the only tracked-file change.

| Check | Latest result | Evidence and limit |
| --- | --- | --- |
| Compose/service health | **PASS** | `docker compose ps`: backend, frontend, NLP, pgAdmin and PostgreSQL running; PostgreSQL healthy. `docker compose config --quiet` passed. |
| PostgreSQL | **PASS** | `pg_isready` reported accepting connections; backend `GET /health/db` returned HTTP 200 and `status=ok`. Backend-container Sequelize `authenticate()`, `Student.count()` and `JobPosting.count()` completed; row counts were not printed. This proves reads and connection to existing tables, not schema completeness. |
| Backend HTTP | **PASS** | `GET http://localhost:5000/` returned 200. Anonymous `GET /api/auth/me`, `GET /api/teachers`, `GET /api/coop-requests/me`, and `POST /api/job-matches/me` each returned 401 before data access. |
| Frontend serving | **PASS** | Vite served all seven HTML entries and `/src/api/client.js` with HTTP 200. This proves asset delivery, not an authenticated browser workflow. |
| Frontend origin → backend policy | **PASS for preflight; browser call NOT VERIFIED** | `OPTIONS /api/auth/me` with Origin `http://localhost:5173` returned 204 and allowed `authorization,content-type`; source client uses `VITE_API_URL`/Axios. No browser session or student JWT was used, so real login/profile/matching calls from browser remain NOT VERIFIED. |
| NLP service | **PASS for process health** | `GET http://localhost:8000/health` returned 200. A synthetic `POST /api/v1/chat` returned 200 with a reply; this checks endpoint execution only, not intent quality. |
| Backend → NLP ranking | **PASS** | Called actual `backend/src/services/nlpMatching.client.js` inside backend container with one synthetic job and candidate. NLP returned `schema_version=job-matching.v1`, one match, score `0.7765`. No DB row or resume was used. Backend → NLP OCR remains NOT VERIFIED in this continuation. |
| pgAdmin | **PASS for HTTP health** | `GET http://localhost:5050/misc/ping` returned 200. No login or administration action was performed. |
| Backend tests | **PASS: 51 passed, 1 skipped** | `docker compose exec -T backend npm test`; skipped test is the opt-in PostgreSQL transaction test, intentionally not enabled because it writes then rolls back. |
| Frontend build | **PASS** | `docker compose exec -T frontend npm run build`; seven HTML outputs and 85 transformed modules. Ignored `frontend/dist` was regenerated. |
| NLP tests | **FAIL: 14 passed, 2 failed** | Ran existing tests in a temporary container with `nlp-service/tests` mounted read-only, no pytest cache/bytecode. Both failing chatbot tests create a global `TestClient(app)` without entering lifespan, so `IntentClassifier` is untrained in that test process (`RuntimeError`); this is a test setup failure shown by the trace. The running chat endpoint answered 200, which does not prove the expected intents. Standard running NLP container has no `/app/tests`, so direct `docker compose exec ... pytest` is NOT RUNNABLE there. |
| Migration ledger | **UNCHANGED** | Read-only `npm run db:migrate:status`: 9 executed, `007a_create_missing_base_tables.js` pending. It was not applied. |

**Still NOT VERIFIED:** authenticated browser workflows, valid mentor/company token flows, student resume persistence and OCR through backend, job matching against actual authenticated student data, email delivery, and any write workflow. These require suitable authorized test identities/data; no tokens were created, printed, or reused for this audit. The source gaps in approval, publication, staff processing, and documents remain as described below. **Next audit handoff:** preserve the migration warning and NLP test failure; do not label chatbot tests green based on the live endpoint's 200. Stop after this handoff update.

## Historical source audit — 2026-10-06 14:45 Asia/Bangkok

This section preserves historical source evidence; current conclusions and next task are in the A01.2/A01.3 section at the top. Advisor-selection interpretations have been corrected to the confirmed requirement. Sections dated 2026-10-01 and 2026-10-02 below are historical checkpoints; their migration counts, test results, and pending-work descriptions must not be read as current state. Only `fitm-intern` implementation was used to assign statuses. The old mockup repository was not used as implementation evidence.

### 1. Repository and scope

- Repository: `fitm-intern`; branch `main`; latest commit `9e2839d fix: add missing base table migration` (previous: `5b0ce0b feat: stabilize coop request flow and deployment readiness`).
- Before this audit: clean working tree. `git diff`, `git diff --cached`, and the untracked-file list were empty. No modified, staged, or untracked WIP existed. This handoff is the only tracked-file change. The Vite verification regenerated ignored `frontend/dist` build artifacts; no tracked source was edited.
- Project goal evident from source: manage student co-op profile, mentor, company job submissions, co-op requests, and job matching. Internship, supervision, departmental document processing, evaluation, and completion are present in data enums or UI in places, but their full workflows are not implemented.
- Status rule: **DONE** means a complete implemented path in source for the stated narrow feature; **PARTIAL** means a real subset or browser-only UI; **NOT STARTED** means no implementation found in this repository; **BLOCKED** means a dependency prevents the path; **BROKEN** is reserved for a verified defect; **UNKNOWN** means runtime acceptance was not established. A green build does not turn a UI into a completed workflow.

### 2. Architecture and deployment

`frontend` (Vite multipage HTML/CSS/JS, one shared Axios client) → Express 5 REST API (`backend/src/app.js`, nine route modules) → Sequelize 6 → PostgreSQL 16. Backend calls FastAPI NLP for job ranking (`backend/src/services/nlpMatching.client.js`) and PDF OCR (`backend/src/services/resumeOcr.client.js`); FastAPI is also able to serve a chatbot and standalone resume matching, but the frontend/backend do not call those endpoints. Student and staff logins issue JWTs; mentor and company email verification use scoped tokens. Files go to backend local storage / `intern_storage`, not an external object store. No Nginx, background worker, or PDF generation implementation was found. `docker-compose.yml` defines Postgres, pgAdmin, backend, frontend, and NLP; all five were running when checked, with Postgres healthy. `docker compose config --quiet` passed.

Compose runs nodemon, Vite dev server, and Uvicorn `--reload`, mounts source directories, publishes DB/pgAdmin ports, and includes development credential defaults. **Deployment readiness: DEVELOPMENT ONLY.** The frontend `VITE_API_URL` points to localhost by default; set a browser-reachable backend URL for a VM. Do not infer production readiness from the passing Vite build.

### 3. Backend inventory and API contract

Bootstrap: `backend/src/app.js` loads dotenv, Sequelize models/associations, global `cors()` and JSON parser, registers routes, authenticates DB, then listens. There is no global Express error handler; controllers and upload middleware handle their own errors. `/health/db` includes the raw database error message on failure. `auth.middleware.js` verifies JWT; only co-op request and job matching routes additionally require student-shaped claims. `requireDepartmentStaff` validates active staff, but no business route uses it yet. Multer restricts image to 5 MB and PDF resume to 10 MB. Recruitment has a feature gate, rate limits, Turnstile, payload validation, and email verification. See `backend/src/routes`, `backend/src/middlewares`, `backend/src/validators/jobSubmission.validator.js`.

| Method | Path | Actor | Controller / behavior | Status |
| --- | --- | --- | --- | --- |
| GET | `/` | public | `app.js` API message | DONE |
| GET | `/health/db` | public | `app.js` DB probe | PARTIAL (raw failure detail) |
| POST | `/api/auth/register` | public | `auth`: creates co-op student | DONE |
| POST | `/api/auth/login` | public | `auth`: verifies password, issues JWT | DONE |
| GET | `/api/auth/me` | JWT | `auth`: loads student by token ID | DONE for student JWT |
| GET, PUT | `/api/student-profile/me` | JWT | `studentProfile`: read/upsert profile | DONE for student data |
| GET, PUT | `/api/student-profile/` | JWT | `studentProfile`: legacy profile read/upsert | DONE for student data |
| PUT | `/api/student-profile/student-info` | JWT | `studentProfile`: major/year/GPA/class advisor ID, with active-teacher validation | DONE for permitted student class-advisor selection; approval is separate future work |
| GET, POST | `/api/student-profile/profile-image` | JWT | `studentProfile`: read/upload image | DONE |
| POST | `/api/student-profile/resume` | JWT | `studentProfile`: PDF upload, text/OCR extraction | PARTIAL (live acceptance pending) |
| GET | `/api/teachers/` | JWT | `teacher`: active teacher list | DONE as a list only |
| GET, POST, PUT, DELETE | `/api/mentors/me`, `/api/mentors/` | JWT | `mentor`: student's mentor CRUD and verification email | PARTIAL (live token acceptance pending) |
| GET, PUT, POST | `/api/mentor-verification/verify`, `/profile`, `/confirm` | public scoped token | `mentorVerification`: token lookup, profile update, confirm | PARTIAL (live acceptance pending) |
| GET | `/api/coop-requests/companies/search`, `/companies/duplicate-check`, `/job-postings/:id` | student JWT | `coopRequest`: company/job lookup | DONE |
| GET | `/api/coop-requests/me`, `/:id` | student JWT | `coopRequest`: owned list/detail | DONE |
| POST | `/api/coop-requests/` | student JWT | `coopRequest`: create snapshot, delivery methods, company/job links | DONE for submission |
| PATCH | `/api/coop-requests/:id/cancel` | student JWT | `coopRequest`: owner-scoped cancellable status transition | DONE for cancellation |
| POST | `/api/job-matches/me` | student JWT | `jobMatching`: `?source=skills` / `resume` or combined, published jobs only | PARTIAL (publication path absent) |
| POST | `/api/job-submissions/` | public; feature gate/CAPTCHA/rate limit | `jobSubmission`: transactional company/jobs/token, email | PARTIAL (no review/publish) |
| GET | `/api/job-submissions/verify-email` | public scoped token | `jobSubmission`: sets submission verified and jobs pending_review | DONE for verification |
| POST | `/api/job-submissions/resend-verification` | public scoped token; gate/rate limit | `jobSubmission`: resends email | PARTIAL (no frontend call) |
| POST | `/api/staff/auth/login` | public | `staffAuth`: active staff password/JWT | PARTIAL (no staff UI or protected business route) |

Controller/DB map: `auth` → Student; `studentProfile` → Student, StudentProfile, StudentFile, Teacher; `teacher` → Teacher; `mentor` / `mentorVerification` → Mentor, MentorToken, Student; `coopRequest` → CoopRequest, CoopRequestDeliveryMethod, Student, Company, JobPosting; `jobSubmission` → Company, JobSubmission, JobPosting, JobPostingWorkMode, CompanyAccessToken via validation/CAPTCHA/email services; `jobMatching` → Student, StudentProfile, StudentFile, published JobPosting, Company, JobPostingWorkMode and NLP; `staffAuth` → DepartmentStaff. Controllers usually return JSON but response shapes differ (`{success,data}`, `{message,...}`, `{matches}`); there is no shared response envelope. Input validation is implemented per controller and in the recruitment validator. Evidence: all nine files under `backend/src/controllers`, the nine route files above, and `backend/src/services`.

### 4. Database inventory

All 14 Sequelize models are auto-loaded and associated by `backend/src/models/index.js`; all 14 corresponding tables were observed in the local DB via a read-only `information_schema.tables` query. Sequelize models use underscored columns and timestamps. Main FK delete behavior: student-owned rows cascade; teacher assignments and optional co-op company/job links set null; recruitment Company/Submission/Posting links restrict deletion. `StudentFile` has a partial unique resume-per-student index; `CoopRequestDeliveryMethod` has unique request+method. Model existence does not prove a route exists.

| Model / table | Purpose, key fields/status | Relations; used by |
| --- | --- | --- |
| `Student / students` | account, track (`internship`, `co_op`), status (`pending`, `searching`, `placed`, `in_progress`, `completed`), advisor IDs | Teacher, Profile, File, Mentor, Request; auth/profile/matching/request |
| `StudentProfile / student_profiles` | personal, contact, related skills | Student 1:1; profile/matching |
| `StudentFile / student_files` | file metadata, type (`coop_poster`, `coop_project_book`, `coop_practice_log_book`, `resume`), extraction status (`pending`, `ready`, `failed`) and method (`pdf_text`, `ocr`) | Student; current controller writes resume only |
| `Teacher / teachers` | directory, optional password hash, active/inactive | advisor/co-op advisor Student links; read-only teacher API |
| `Mentor / mentors` | student mentor profile, pending/verified | Student 1:1, MentorToken; mentor APIs |
| `MentorToken / mentor_tokens` | hashed expiring/used verification token | Mentor; mentor token APIs |
| `CoopRequest / coop_requests` | request snapshots and `submitted`, `staff_review`, `advisor_review`, `department_head_review`, `approved`, `document_issued`, `in_progress`, `rejected`, `cancelled` | Student required; Company/JobPosting optional; delivery methods; create/read/cancel only |
| `CoopRequestDeliveryMethod / coop_request_delivery_methods` | `self_submit`, `postal`, `email` | CoopRequest; request create/read |
| `Company / companies` | contact/address and verified email timestamp | submissions, postings, tokens, requests; recruitment/search |
| `JobSubmission / job_submissions` | `pending_email_verification`, `verified`, `expired`, `cancelled` | Company, postings, tokens; recruitment verification |
| `JobPosting / job_postings` | title/description/quota; `pending_email_verification`, `pending_review`, `published`, `rejected`, `withdrawn`, `expired` | Company, Submission, work modes, requests; recruitment/matching |
| `JobPostingWorkMode / job_posting_work_modes` | work mode | JobPosting; recruitment/matching |
| `CompanyAccessToken / company_access_tokens` | hashed, expiring company email token, purpose | Company/Submission; verification/resend |
| `DepartmentStaff / department_staffs` | staff credentials and active flag | login only; no operational staff route |

Migrations in `backend/src/db/migrations` at this historical audit: `001`–`006` recruitment, `007` staff, `007a` missing base tables, `008` resume extraction, `009` request company/job links. **Then-local migration status was 9 executed, 1 pending: `007a_create_missing_base_tables.js`**, despite all base tables existing locally. This is a migration ledger gap, not evidence that these local tables are absent. No migration or schema change was made in that audit. On another database, do not assume the local table state; inspect schema and migration history before any authorized migration. Source-backed gaps: fields/statuses for project files and request approval exist without write endpoints; student class-advisor selection through `advisor_teacher_id` is implemented and permitted, while approval and the separate `coop_advisor_teacher_id` workflow remain future work; no DB-backed daily log, evaluation, appointment, document, or project-topic model.

### 5. Frontend page inventory and feedback

All seven pages are Vite build inputs (`frontend/vite.config.js`). Each uses its corresponding `frontend/src/pages/*.js` and stylesheet listed below. API calls go through eight `frontend/src/api/*.api.js` modules and `frontend/src/api/client.js` (Axios, Bearer token by default, `auth:false` for public flows). A source scan found **no** native `alert()` or `confirm()` in frontend JS. `frontend/src/ui/feedback.js` supplies toast, action/confirm modal, and loading button. Other inline message/loading states are page-specific; there is no universal error boundary or unified page state contract.

| Page | JS / CSS | API used | Role; reality | Status |
| --- | --- | --- | --- | --- |
| `frontend/index.html` | `pages/index.js`; `main.css`, `index.css` | `auth/me` only | public landing; job cards/search/filter are hardcoded/mock and chatbot replies with development message | PARTIAL |
| `frontend/login.html` | `pages/login.js`; `main.css`, `auth.css` | `auth/login` | student login with validation/loading/success/error; Google button is placeholder | PARTIAL |
| `frontend/register.html` | `pages/register.js`; `main.css`, `auth.css` | `auth/register` | co-op registration with form validation/feedback | DONE for co-op account creation |
| `frontend/src/student_coop/student_coop.html` | `pages/student_coop.js`; `main.css`, `student_coop.css` | auth, profile, teacher, mentor, request, matching | student dashboard: real profile/image/resume, mentor, request, matching; browser-only daily log/project/upload/transfer | PARTIAL |
| `frontend/src/mentor_coop/mentor_verify_user.html` | `pages/mentor.js`; `main.css`, `mentor.css` | mentor verification API | token query, update/confirm, loading/error/success; valid-token browser acceptance pending | PARTIAL |
| `frontend/src/recruit_student/recruit_student.html` | `pages/recruitStudent.js`; `main.css`, `recruit.css` | job submission API | public company/jobs form, validation, Turnstile, loading/success/error; gated by backend config | PARTIAL |
| `frontend/src/recruit_student/recruit_verify_email.html` | `pages/recruitVerifyEmail.js`; `main.css`, `recruit.css` | verify-email API | token URL, loading/success/invalid/expired/error states | DONE for verification page |

Student dashboard reads authoritative co-op request history, uses the URL-independent current request state, checks duplicate active requests, confirms cancellation, and displays status/empty/error feedback. Matching has skills and resume buttons and progress/results states. Local-only daily log rows disappear on reload. Project-topic save, book/poster upload, and company transfer buttons explicitly say backend is unconnected (`frontend/src/pages/student_coop.js`). The landing search and filter only log input; job cards are hardcoded; chat returns a fixed development message (`frontend/src/pages/index.js`). `frontend/src/pages/login.js` says Google OAuth will be connected later. The recruitment API module exposes resend, but no frontend page imports/calls it. No teacher, head, staff, or company management page exists in Vite inputs.

### 6. Feature matrix by actor

Evidence is implementation in this repository. `FE` = frontend, `BE` = backend route/controller, `DB` = model/migration. “—” means absent; “UI” means local presentation only. Runtime acceptance remains separate from source status.

| Module / feature | FE | BE | DB | Integration / status | Evidence and remaining work |
| --- | --- | --- | --- | --- | --- |
| Student register/login/profile | yes | yes | yes | DONE for co-op identity | `frontend/src/pages/{register,login,student_coop}.js`; `backend/src/controllers/{auth,studentProfile}.controller.js`; Student/Profile. No Google OAuth. |
| Student image upload/read | yes | yes | Student path | DONE in source | `studentProfile.api.js`, `studentProfile.controller.js`, `upload.middleware.js`; live browser check pending. |
| Student resume PDF/OCR | yes | yes | StudentFile | PARTIAL | Upload-time extraction and cache exist; authenticated scanned/text PDF persistence browser acceptance still needed. `studentProfile.controller.js`, `resumeText.service.js`, `resumeOcr.client.js`, NLP OCR. |
| Student company search/manual duplicate check | yes | yes | Company | DONE in source | `student_coop.js`, `coopRequest.controller.js`; manual name remains snapshot, not master Company. |
| Student skills/resume job ranking | yes | yes | Student/Profile/File/Posting | PARTIAL | NLP ranking works in tests; only published jobs qualify and no publish route exists. `jobMatching.controller.js`, NLP job service. |
| Student co-op request create/detail/history/cancel | yes | yes | CoopRequest/DeliveryMethod | DONE for these four actions | `student_coop.js`, `coopRequest.controller.js`; manual or linked company/job; no approval transition. |
| Student document status | yes | reads request | CoopRequest status | PARTIAL | UI stepper renders statuses; no document production/status transition route. |
| Student class-advisor selection | yes | PUT student-info | Student/Teacher | DONE for selection | Student is allowed to set `advisor_teacher_id` to a valid active teacher; teacher approval of the co-op request is separate future work. `studentProfile.controller.js`. |
| Student project topic/advisor confirmation | UI | — | — | PARTIAL / NOT STARTED respectively | Topic button says backend unconnected; no advisor confirmation route. `student_coop.js`. |
| Student daily log | UI | — | — | PARTIAL | Browser DOM rows only; no persistence or mentor review. `student_coop.js`. |
| Student project book/poster/report upload | UI | — | file-type enum only | PARTIAL | Book/poster button explicitly unconnected; no report upload endpoint. `student_coop.js`, StudentFile. |
| Student company transfer | UI | — | — | PARTIAL | Button explicitly unconnected. `student_coop.js`. |
| Student chatbot | landing UI | — | — | PARTIAL | Fixed development reply, despite standalone NLP chat endpoint. `index.js`, `nlp-service/app/api/v1/chatbot.py`. |
| Teacher directory | student page | read-only API | Teacher | DONE as directory | `teacher.controller.js`, `student_coop.js`; no teacher account flow. |
| Teacher dashboard/search/confirm/approval | — | — | advisor FKs only | NOT STARTED | No teacher page, auth, or business routes; model associations alone are not workflow. |
| Teacher supervision #1/#2, substitute mentor, records/images/PDF/evaluations/profile | — | — | — | NOT STARTED | No routes/controllers/models/pages for these actions. Internship and co-op cannot be called implemented teacher tracks. |
| Head dashboard/profile/teacher/student management/advisor assignment/IT-INE filter/approval | — | — | Teacher/Student only | NOT STARTED | No head actor, route, or page. |
| Department staff login | — | yes | DepartmentStaff | PARTIAL | `staffAuth.controller.js`; no frontend and no operational route uses staff authorization. |
| Staff document processing/cancel handling/letters/edit/delete/print/PDF/calendar/company/teacher management | — | — | request/posting statuses only | NOT STARTED | No staff business routes or generated document storage. |
| Student mentor CRUD | yes | yes | Mentor/Token | PARTIAL | `mentor.controller.js`, `student_coop.js`; email delivery and live token flow require acceptance. |
| Mentor token profile confirmation | yes | yes | Mentor/Token | PARTIAL | `mentorVerification.controller.js`, `mentor.js`; no valid-token browser acceptance in this audit. |
| Mentor log/absence/leave/late/supervision/evaluation | — | — | — | NOT STARTED | Verification is the only mentor workflow in source. |
| Public company job submission/email verification | yes | yes | Company/Submission/Posting/Token/Mode | PARTIAL | Gate, Turnstile, rate limit, email and verification exist; posting stops at pending_review. `jobSubmission.controller.js`, `companyVerification.service.js`. |
| Company management/job edit/withdraw/review/publish | — | — | status fields only | NOT STARTED | No actor UI or route for these transitions. |
| Backend/NLP chatbot | — | FastAPI only | FAQ JSON | PARTIAL | TF-IDF/intent service and seed exist; no Express proxy or frontend call. `nlp-service/app/main.py`, `chatbot_service.py`. |
| Standalone resume matching | — | FastAPI only | — | PARTIAL | NLP endpoint exists, not wired to current frontend; current job matching uses separate endpoint. |

### 7. Document and status workflows

Actual co-op request path: student form → `POST /api/coop-requests` → `submitted` → student `GET /me`/`/:id` → optional student `PATCH /:id/cancel` → `cancelled`. Create checks one active request and writes delivery methods in a transaction. Cancellation is allowed for `submitted`, `staff_review`, `advisor_review`, `department_head_review`. The model and frontend list `approved`, `document_issued`, `in_progress`, and `rejected`, but no route transitions to them. Thus teacher approval → staff processing → letter → company response → forwarding → evaluation → completion is **NOT STARTED** as an end-to-end workflow. Neither assistance nor forwarding letters nor PDF/print endpoint exists. Evidence: `backend/src/controllers/coopRequest.controller.js`, `backend/src/models/coopRequest.model.js`, `frontend/src/pages/student_coop.js`.

Recruitment path: public submit (when enabled) → `pending_email_verification` → company verifies email → submission `verified` and postings `pending_review`. There is no implemented transition from `pending_review` to `published`, so organically submitted postings cannot reach the filter used by matching. A demo job seeder exists (`backend/src/db/seedJobMatchingDemo.js`); it is not a production publication workflow. Mentor path: student creates/updates mentor → hashed expiring verification token/email → mentor opens token page and confirms → `verified`; evaluation and supervision do not follow.

Status names agree for current Student/CoopRequest/Mentor/JobSubmission/JobPosting model/controller steps inspected. The substantive inconsistency is workflow completeness: UI displays future co-op statuses, and matching consumes `published`, but no application route creates those later states. `Student.track` supports `internship` at DB level; registration sets `co_op` and dashboard rejects other tracks, so internship feature parity is absent.

### 8. NLP and authentication details

NLP FastAPI registers `/health`, `POST /api/v1/chat`, `/api/v1/resume-match`, `/api/v1/job-matches`, `/api/v1/resume-ocr` (`nlp-service/app/main.py`). Chat intent classifier trains from `data/processed/chatbot/faq_seed.json` at lifespan startup and uses a confidence fallback; no LLM. Job ranking uses TF-IDF/cosine, `top_k=5`, minimum score `0.05`, deterministic sort, and profile 65% + resume 35% when both exist; single-source input uses 100%. Backend validates NLP output and returns enriched job cards, without extracted resume text. Resume OCR uses Tesseract `tha+eng`, 10 MB, five pages, 20,000 characters. Backend extracts native PDF text first during upload, falls back to OCR, and matching reads only persisted ready text. Evidence: `backend/src/controllers/jobMatching.controller.js`, `backend/src/controllers/studentProfile.controller.js`, `nlp-service/app/services/job_matching_service.py`, `nlp-service/app/api/v1/resume_ocr.py`.

Student JWT is stored in browser localStorage by the frontend; `authenticateToken` verifies signature/expiry but role checks are route-specific. Staff JWT contains `actor_type=department_staff` and `role`; `requireDepartmentStaff` checks active status but is not mounted on a business route. Mentor/company verification tokens are hashed in DB and passed as URL/body capabilities; no mentor or company login exists. Google OAuth config/workflow is absent; login button is a placeholder. `cors()` is unrestricted and `/health/db` returns DB failure text; review before non-development exposure. Student `PUT /student-info` permits selecting an active class advisor through `advisor_teacher_id`, as required. This is not an authorization bug. Future co-op approve/reject must check that the authenticated teacher matches the student's class advisor; `coop_advisor_teacher_id` is a separate project-advisor workflow.

### 9. Verification and environment

- Current run: `docker compose config --quiet` **PASS**; backend `npm test` inside container **51 pass, 0 fail, 1 opt-in PostgreSQL test skipped**; frontend `npm run build` inside container **PASS, seven HTML outputs**. The build regenerated ignored `frontend/dist` files.
- Local Windows `npm test` and `npm run build` were **NOT RUNNABLE in this sandbox**: Node child-process spawn returned `EPERM`; initial `npm.ps1` was also blocked by PowerShell execution policy. Container results above are the valid results. Host Python had no pytest. The standard running NLP container has no `/app/tests`; a temporary container with the existing tests mounted read-only ran the suite: **14 passed, 2 chatbot tests failed** because their `TestClient` does not start lifespan training. See the newer runtime continuation at the top for details.
- Backend `npm run db:migrate:status` read only: **9 executed, 1 pending (`007a`)**. Read-only DB schema query found all 14 model tables; this does not validate every constraint or another environment's schema. No browser end-to-end flow or authenticated student/mentor/company runtime acceptance was performed. Tests cover backend units and mocked dependencies; one database integration test is opt-in.
- Config names only: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `STORAGE_ROOT`, `NLP_SERVICE_BASE_URL`, `NLP_SERVICE_TIMEOUT_MS`, `NLP_OCR_TIMEOUT_MS`, `FRONTEND_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `RECRUITMENT_SUBMISSION_ENABLED`, recruitment rate-limit/TTL variables, `TURNSTILE_SECRET_KEY`, `TURNSTILE_EXPECTED_HOSTNAME`, `TURNSTILE_EXPECTED_ACTION`, `TURNSTILE_TIMEOUT_MS`, `VITE_API_URL`, `VITE_TURNSTILE_SITE_KEY`, and staff seeder identity/password variables. Never paste their values into a handoff. See `backend/src/config`, `backend/src/services/email.service.js`, `backend/src/seeders/createDepartmentStaff.js`, `frontend/src/api/client.js`, `frontend/src/pages/recruitStudent.js`.
- Useful existing commands: from root `docker compose config --quiet`, `docker compose ps`, `docker compose up --build`; in backend `npm test`, `npm run db:migrate:status` (read only), `npm run db:migrate` (writes schema, requires separate authorization); in frontend `npm run build`; in an environment with NLP tests installed and available, `pytest -q`. No migration, seeder, reset, or volume command was run by this audit.

### 10. Current backlog and next tasks

Every item below is traced to source or to the explicit project scope represented by the role/feature list. No feature is marked DONE from a page or model name alone.

| ID | Priority / size | Title; current state → missing | Files / dependency / risk / next action |
| --- | --- | --- | --- |
| A01 | P0 / S | Resolve local migration ledger gap; `007a` pending although base tables exist | `backend/src/db/migrate.js`, `db/migrations/007a_create_missing_base_tables.js`; inspect intended migration history and constraints before any authorized write. Risk: environments diverge. |
| A02 | P0 / M | Enable controlled review/publish path; recruitment ends at `pending_review`, matching requires `published` | `jobSubmission.routes.js`, `companyVerification.service.js`, `jobMatching.controller.js`, JobPosting; depends on staff authorization. Risk: zero organic matching jobs. |
| A03 | SUPERSEDED | Student class-advisor selection is permitted; no self-selection authorization bug | Preserve active-teacher validation in `studentProfile.controller.js`. Move future matching-advisor approval authorization into A04; do not prohibit student selection. |
| A04 | P1 / L | Implement co-op review/approval/rejection and staff handoff; only submit/cancel transitions exist | `coopRequest.routes.js`, `coopRequest.controller.js`, CoopRequest; depends on teacher/head/staff actor policy. Risk: requests cannot progress. |
| A05 | P1 / L | Implement assistance/forwarding documents and PDF/status workflow | CoopRequest and missing document routes/models, student status UI; depends on A04. Risk: visible progress is non-operational. |
| A06 | P1 / M | Persist daily log and support mentor review; browser-only rows | `student_coop.js`, missing log API/model; depends on mentor authorization. Risk: entered work disappears on reload. |
| A07 | P1 / M | Connect project topic/book/poster/report controls to persistence | `student_coop.js`, StudentFile enum, missing API; depends on file ownership/validation. Risk: UI says success without saving. |
| A08 | P1 / M | Deliver staff UI/protected routes; login and middleware have no operational consumer | `staffAuth.routes.js`, `auth.middleware.js`, absent staff pages; depends on role policy. Risk: staff cannot process records. |
| A09 | P2 / M | Connect landing job search and chatbot to real APIs | `index.js`, `jobMatching.controller.js`, NLP chat endpoint; depends on published jobs and chatbot exposure policy. Risk: hardcoded job results and fixed reply. |
| A10 | P2 / M | Finish mentor confirmation browser acceptance and authenticated resume/OCR acceptance | `mentor.js`, `mentorVerification.controller.js`, `studentProfile.controller.js`; needs safe test accounts/tokens. Risk: source/test pass may miss browser defects. |
| A11 | P2 / L | Implement teacher/head/mentor evaluation and supervision features in actual stated scope | no current routes/pages/models; depends on A04 and actor design. Risk: role workflows absent. |
| A12 | P2 / S | Surface recruitment resend and operational failure recovery | `recruitStudent.api.js`, `recruitVerifyEmail.js`, `jobSubmission.routes.js`; token/capability UX dependency. Risk: email delivery failure strands submission. |
| A13 | P3 / S | Replace Google-login placeholder if OAuth is in active scope | `login.js`; OAuth config/routes absent. Risk: misleading control. |
| A14 | P3 / S | Make NLP test suite runnable from the standard container command | `nlp-service/Dockerfile`, `nlp-service/tests`; test packaging choice. Risk: audit cannot verify NLP suite in container. |

**NEXT TASK #1:** A01, read-only reconciliation first. Verify the `007a` migration's intended position and compare all its base-table definitions/constraints to this DB and a clean DB plan. Acceptance: documented reason for pending state and safe, reviewed migration action; no assumption that a table is absent. Do not run `db:migrate` during an audit.

**Historical NEXT TASK #2, corrected:** A03's self-selection bug claim is withdrawn. Student class-advisor selection stays allowed; future teacher approval must be limited to the matching advisor. A02 remains a separate recruitment publication backlog: authorized staff can review and publish/reject a verified posting; newly published jobs become eligible for `/api/job-matches/me`; automated authorization and transition tests pass. Current next task is Teacher Approval / Coop Request workflow as stated at the top.

**NEXT TASK #3:** A04 (co-op request transitions) before letters/evaluations. Acceptance: authenticated authorized roles move a student's submitted request through explicit allowed statuses; student history/detail reflect each transition; invalid transitions and cross-student access are rejected. Then proceed to A05.

### 11. Resume from here

**Current task:** this audit/handoff only. **Current state:** no pre-audit WIP; this handoff is the only intended tracked change, and ignored `frontend/dist` was regenerated by verification. **Do not repeat:** already inspected every current route/model/page module, ran backend tests and frontend build in containers, checked Compose config, and queried migration/table metadata read only. **Open first:** `backend/src/db/migrate.js`, `backend/src/db/migrations/007a_create_missing_base_tables.js`, `backend/src/models/index.js`, then `backend/src/controllers/studentProfile.controller.js` and `backend/src/controllers/jobSubmission.controller.js`. **Relevant API:** `PUT /api/student-profile/student-info`, `POST /api/job-submissions`, `GET /api/job-submissions/verify-email`, `POST /api/job-matches/me`, co-op request endpoints listed above. **Relevant models:** Student, Teacher, DepartmentStaff, Company, JobSubmission, JobPosting, CoopRequest. **Relevant frontend:** `frontend/src/pages/student_coop.js`, `recruitStudent.js`, `recruitVerifyEmail.js`.

**Recommended order:** (1) reconcile migration ledger without touching data until authorized, (2) define advisor and staff/head/teacher permissions, (3) close publication dependency, (4) implement request review transitions, (5) documents and downstream student/mentor workflows. **Acceptance for this handoff:** every claim above is traceable to current source or read-only test output, previous historical notes remain accessible below, and no tracked source code, schema, user changes, commit, or push is altered. Stop after reporting this audit; do not start these tasks without a new request.

---

## Historical handoff notes (superseded where dates or statuses differ)

## Student CoopRequest UX stabilization and VMware readiness - 2026-10-02

- Duplicate active-request UX now checks frontend state from both the Student CoopRequest panel and Job Matching. It uses an animated in-system action dialog with a link to the current request; reduced-motion behavior is inherited from the shared stylesheet. Backend HTTP 409 uses the same dialog and reloads the authoritative request list. Native alert/confirm dialogs were not added.
- The current request remains in the all-requests history table. History sorts by `submitted_at DESC`, then `created_at DESC`, replaces table rows on render, and shows cancelled/rejected requests. Successful create returns to the CoopRequest panel, resets temporary form selections, refreshes from `/api/coop-requests/me`, and shows a success toast. Successful cancellation also reloads that endpoint.
- Automated verification: backend suite **51 passed, 0 failed, 1 opt-in integration test skipped**; changed frontend JS syntax checks **PASS**; Vite production build **PASS**, all 7 active HTML entries emitted; `git diff --check` **PASS**; Docker Compose config **PASS**. Migration 009 is applied, **0 pending**; no migration created. Browser acceptance **SKIPPED BY REQUEST**.
- VMware Ubuntu note: before starting Compose, set frontend `VITE_API_URL` to `http://<VMWARE-UBUNTU-IP>:5000` (reachable from each user's browser), not `localhost`; frontend API calls run in the browser. Configure `JWT_SECRET` and a non-default database password. Email verification also requires `FRONTEND_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`; recruitment CAPTCHA requires `TURNSTILE_SECRET_KEY`. Apply/check schema with `docker compose exec backend npm run db:migrate` and `docker compose exec backend npm run db:migrate:status`. NLP Docker image installs Tesseract plus Thai and English language data. Compose syntax validated; the current services use development servers and bind mounts.

## Vite multi-page build - 2026-10-01

- Student Dashboard included: **YES**
- Mentor Verification included: **YES**
- Production build: **PASS**
- Active application HTML entries: Index, Login, Register, Student Dashboard, Mentor Verification, Recruit Student, and Recruit Verify Email.

## Current workspace audit and Job Matching source modes - 2026-10-01

- Axios audit: **PASS**. `frontend/package.json` and lockfile include Axios 1.19.0. The only Axios import and `axios.create()` are in `frontend/src/api/client.js`; its request interceptor attaches the stored Bearer token unless Authorization is explicit or the public API opts out. Error normalization preserves `status`, `data`, and safe `message` fields. The shared `apiRequest()` supports JSON objects, FormData without a manually supplied multipart header, Blob responses, AbortSignal, and optional upload progress.
- Source scan of `frontend/src`: Fetch calls **0**; direct Axios imports outside `client.js` **0**; `XMLHttpRequest` **0**. All 8 API modules use `apiRequest()` (24 calls). No page contains direct backend HTTP calls.
- Job Matching endpoints accept no body: `POST /api/job-matches/me` keeps the combined/fallback default; `POST /api/job-matches/me?source=skills` uses only major + related skills at 100%; `POST /api/job-matches/me?source=resume` uses only the authenticated student's ready persisted Resume text that passes the shared upload-time usability check, at 100%. Invalid source returns `400 MATCH_SOURCE_INVALID`; missing/unusable selected text returns its source-specific 422 code. No OCR is run during matching.
- Default weighted behavior remains profile 65% + Resume 35% when both are available, with the existing single-source fallback. Published-only filtering, NLP v1 contract, TOP_K=5, MIN_SCORE=0.05, ranking validation, and result enrichment are unchanged.
- Student Dashboard now has separate Skills and Resume analysis buttons. Both share the existing request guard/progress flow; the selected source appears in loading copy and above successful results. Selected-source errors use safe inline feedback.
- Verification: backend Job Matching tests **19 passed**; requested frontend and backend `node --check`: **PASS**; `git diff --check`: **PASS**; `docker exec intern_frontend npm run build`: **PASS**. The existing Vite production inputs omit Student Dashboard, so an additional no-write build for that HTML entry compiled **67 modules** successfully. NLP tests: **NOT RUN** (NLP code unchanged).
- Authenticated browser acceptance for Skills, Resume, and no-OCR-on-matching: **PENDING**; no authenticated browser session was available. Authenticated Resume persistence checks remain **PENDING** as recorded below.
- Current task files: `backend/src/controllers/jobMatching.controller.js`, `backend/test/jobMatching.test.js`, `frontend/src/api/jobMatching.api.js`, `frontend/src/pages/student_coop.js`, `frontend/src/student_coop/student_coop.html`, `frontend/src/styles/student_coop.css`, and this handoff. Earlier uncommitted Axios migration changes to `frontend/src/api/client.js`, `mentorVerification.api.js`, and `recruitStudent.api.js` remain intact.

## Mentor Verification Axios regression - 2026-10-01

- Status: **FIXED**. Root cause: the migrated API module wrapped the backend JSON response in another `{ data }` object. The page expects the existing backend contract at `result.data.mentor`; the extra layer made the mentor appear absent and its status-less fallback displayed a connection error.
- The public Mentor endpoints are confirmed by backend routes to have no JWT middleware. `apiRequest()` now accepts `auth: false`; its interceptor skips JWT lookup/attachment for that request. Verify, profile update, and confirmation calls all use `auth: false`; authenticated API calls retain the default `auth: true` behavior.
- The API module returns the backend response object unchanged, preserving `result.data.mentor`. Verify uses `GET /api/mentor-verification/verify?token=...` with URLSearchParams encoding and no body. Profile update and confirmation preserve the existing JSON body contracts.
- Mentor page errors distinguish network failures from HTTP failures, use safe backend messages for 400 and 401/403, and retain specific 404/410 states. Backend CORS is enabled globally with `app.use(cors())`; GET has no Authorization or JSON header and does not require a preflight.
- Authenticated JWT behavior for `auth/me`, Student Profile, Resume, and Job Matching remains enabled by the shared client's default. FormData, Blob, upload progress, and Job Matching modes are unchanged. Source scan still finds frontend Fetch **0**, direct Axios import outside `client.js` **0**, and XHR **0**.
- Verification: required `node --check` commands and `git diff --check`: **PASS**; standard frontend build: **PASS**; additional no-write Mentor Verification entry build: **PASS** (62 modules). Live authenticated API smoke tests were not performed.
- Real browser Mentor Verification using a valid token: **PENDING**; no valid active mentor verification link/token was available for this run. No token was printed or fabricated.
- Changed for this regression: `frontend/src/api/client.js`, `frontend/src/api/mentorVerification.api.js`, `frontend/src/api/recruitStudent.api.js`, `frontend/src/pages/mentor.js`, and this handoff. Backend contracts/routes were not changed.

## Full current-system regression audit - 2026-10-01

- Frontend source audit: Axios dependency **1.19.0**; one `axios.create()` and Axios import in `frontend/src/api/client.js`; Fetch calls **0**; direct Axios imports outside `client.js` **0**; `XMLHttpRequest` **0**. All 8 endpoint API modules use `apiRequest()` (24 call sites). Shared client supports Bearer auth by default, `auth: false` public requests, normalized errors, 30 second timeout, JSON, FormData without manual multipart content type, Blob, AbortSignal, and upload progress.
- Public routes identified from the actual Express routes: login/register, Mentor Verification capability-token endpoints, and recruitment submission/email-verification endpoints. `auth.api.js` now sets `auth: false` on login/register; `/api/auth/me`, Student Profile, Teachers, Mentors, Co-op Requests, and Job Matching retain JWT auth. Recruitment and Mentor Verification already use `auth: false`. No global 401 redirect/logout interceptor exists; existing page-specific handling is retained.
- Auth runtime probes: missing and expired tokens to `/api/auth/me` each returned **401**. Login stores the server token; landing/dashboard existing logout and expired-session handlers clear local token/student state and redirect to login. Credentialed browser login/profile checks: **PENDING** (no student session available).
- Mentor Verification backend routes are public and return `{ success, message, data: { mentor } }`; the API module now passes this through unchanged. A public invalid-token runtime probe returned **404** with only safe `message`/`success` fields. Runtime CORS preflight from `http://localhost:5173` returned **204**, allowed origin `*`, and allowed `authorization,content-type`. Valid-token browser acceptance and update/confirm: **PENDING** (no active mentor link available).
- Connected API modules: `auth.api.js` (public POST login/register JSON; JWT GET me); `coopRequest.api.js` (JWT GET list/detail, POST JSON create, PATCH cancel without body); `jobMatching.api.js` (JWT POST with optional source query and no body); `mentor.api.js` (JWT GET/POST/PUT/DELETE, JSON bodies for writes); `mentorVerification.api.js` (public token GET query, PUT JSON token/profile, POST JSON token); `recruitStudent.api.js` (public POST JSON submission and GET verification query); `studentProfile.api.js` (JWT GET/PUT JSON profile, POST FormData image, GET Blob image, POST FormData Resume, PUT JSON student info); `teacher.api.js` (JWT GET).
- Resume/profile image source audit: image upload passes `FormData(profile_image)`; GET returns a Blob used by `URL.createObjectURL`. Resume upload is PDF MIME only, 10 MB maximum, stored in authenticated student's resume directory; native PDF extraction runs first, OCR fallback runs at upload time, and API response omits extracted text/storage paths. Safe database aggregate found **1** Resume with `extraction_status=ready`, `extraction_method=pdf_text`, and `extracted_at` set; no OCR-method row was present. This confirms a text-PDF persistence record exists, but not authenticated ownership/browser acceptance. Scanned-PDF OCR persistence acceptance: **PENDING**. Matching reads only cached ready/usable text and does not call OCR.
- NLP OCR audit: router included once at `/api/v1/resume-ocr`; service health **200**. The endpoint accepts PDF MIME/name only, caps input at 10 MB, processes at most 5 pages at 150 DPI, caps output at 20,000 chars, and uses Tesseract `tha+eng`. Runtime language list: **eng, tha, osd**. Invalid PDF, page cap, and scanned image extraction are covered by tests. NLP requirements/source contain no database or direct backend-storage client.
- Job Matching: default combined candidate keeps profile 65% + Resume 35% with 100% single-source fallback; skills mode uses only major + related skills; Resume mode uses only authenticated student's persisted ready usable Resume text; missing selections return source-specific 422; invalid source returns 400. All modes send no body. Published-only filtering, TOP_K=5, MIN_SCORE=0.05, deterministic score-descending/ID-ascending order, and 1-based ranks remain covered by backend tests. UI source buttons share the request guard and progress timers and clear prior results before switching source. No separate cooldown implementation exists in the current source; requests are guarded while in flight and can be retried immediately after completion.
- OCR/Text privacy: response enrichment returns only job data and scores, not extracted text or file paths; upload responses contain metadata only. Matching never re-runs OCR. No student JWT or resume text was printed during this audit.
- Tests/build: full Backend suite **45 passed, 0 failed, 1 opt-in integration skipped**. Targeted NLP Job Matching/Resume/OCR suite **14 passed**. Full NLP suite **14 passed, 2 failed** in unrelated chatbot tests because those tests' `TestClient` does not run lifespan training (`IntentClassifier` remains untrained). Frontend JS syntax checks: **PASS**; `git diff --check`: **PASS**; `docker exec intern_frontend npm run build`: **PASS**. The configured build omits Student Dashboard and Mentor Verification entries, so an additional no-write Vite build including both compiled **71 modules** successfully.
- Migration status: **8 executed, 0 pending**, including `008_add_resume_extraction.js`. Docker Compose: postgres **healthy**; backend, frontend, NLP service, and pgAdmin **up**. Filtered last-two-hour log scan found **0** matching ERROR/Exception/restart lines for backend, frontend, NLP, or PostgreSQL. Student/Mentor real browser acceptance remains **PENDING** due unavailable authenticated sessions/tokens.
- Audit fix: public login/register now opt out of stale student JWT attachment. Changed in this audit: `frontend/src/api/auth.api.js` and this handoff. Previous uncommitted system work remains preserved.

### Resume PDF extraction, OCR, and weighted matching — 2026-10-01

- Resume upload remains `POST /api/student-profile/resume` (`resume`, PDF only, 10 MB). On replacement, extraction columns reset before processing. Native `pdf-parse` text is normalized and accepted only when it meets the reusable length/character usability check. OCR runs only when native text is insufficient.
- Backend sends stored PDF bytes to the internal NLP `POST /api/v1/resume-ocr` endpoint with a 20 second abort timeout. The NLP service accepts PDF bytes only, caps size at 10 MB, renders no more than 5 pages at 150 DPI, normalizes/caps text at 20,000 characters, and uses Tesseract `tha+eng`. OCR response contains only text, method, and processed page count; failures are safe HTTP errors and do not log OCR text.
- Added migration `008_add_resume_extraction.js`: nullable `extracted_text`, `extraction_method`, `extraction_status`, `extracted_at`. It was applied to the development PostgreSQL database. StudentFile model has matching attributes and validated method/status strings.
- Upload response returns only original filename, MIME type, file size, extraction status, and method. No extracted text or storage path reaches the frontend. Extraction/OCR failure leaves the uploaded PDF in place and matching falls back to profile signals.
- Matching no longer opens or OCRs the PDF on requests. It reads only the authenticated student's cached `StudentFile.extracted_text` when status is `ready`. NLP v1 keeps `candidate.text`; optional `candidate.resume_text` enables `(profile * 0.65) + (resume * 0.35)` scoring. Profile-only and resume-only inputs retain 100% weight when used alone. `TOP_K=5`, `MIN_SCORE=0.05`, four-decimal rounding, and deterministic tie ordering remain.
- Frontend preserves existing Job Matching cards/progress/skeleton behavior, updates its description, and reports native extraction, OCR, or fallback status without displaying extracted text.
- Changed/added: Backend controller/model/client/migration/matching tests; NLP OCR endpoint, weighted schema/service, dependencies, Dockerfile and matching tests; frontend upload feedback/description; Compose timeout; this handoff. The pre-existing uncommitted UI/API styling, backend package change, and Compose edits were preserved.
- Verification: Backend syntax checks and `backend/test/jobMatching.test.js backend/test/resumeText.test.js`: **16 passed**. Frontend JS syntax and `docker exec intern_frontend npm run build`: **PASS**. `python -m compileall`: **PASS**. Development migration `008`: **APPLIED**. `git diff --check`: **PASS**.
- NLP image rebuild: **PASS**. `tesseract --list-langs` inside `intern_nlp_service`: **eng, tha, osd**. Final targeted container tests (`test_job_matching.py`, `test_resume_matching.py`, `test_resume_ocr.py`): **14 passed**. OCR tests cover invalid PDF safety, the five-page cap, and extracting “PYTHON” from a generated scanned PDF fixture. Weighted tests cover profile/resume combination, min-score-after-weighting, and profile retention when resume tokenization is empty.
- Acceptance closeout (2026-10-01): a one-page image-only Thai/English Resume-like PDF sent through the running NLP endpoint returned `method=ocr`, `page_count=1`, normalized text with Thai characters, and `Windows`, `Network`, `DNS`, and `Hardware`. Native PDF text was empty. `tesseract --list-langs` returned `eng`, `tha`, `osd`; the OCR route invokes `tha+eng`. Runtime Thai and English OCR: **PASS**. OCR request handler emits no OCR content logs.
- Backend targeted tests: **16 passed**. Relevant NLP tests (`test_job_matching.py`, `test_resume_matching.py`, `test_resume_ocr.py`): **14 passed**. Frontend build: **PASS**. Migration `008` appears in `sequelize_meta`; no pending migration. `git diff --check`: **PASS**.
- Authenticated text-PDF upload/persistence and scanned-PDF upload/persistence plus rendered matching remain **PENDING** because no authenticated student session was available. Matching reads ready cached `extracted_text` and has no OCR call; tests cover profile-only, resume-only, missing/failed resume fallback, and 422 when neither source is usable. Repeated live authenticated match requests were not run.
- Thai OCR runtime: **PASS**; English OCR runtime: **PASS**; text PDF native extraction: **PASS** (existing acceptance baseline; authenticated persisted upload still pending); scanned PDF OCR: **PASS** through NLP OCR endpoint; Tesseract languages: **tha + eng**; OCR runtime language: **tha+eng**.
- OCR on every Job Matching request: **NO**; extraction persistence via authenticated upload: **PENDING**; weighted matching: **PASS** (65/35 and single-source cases covered by tests); migration: **008 applied / no pending**.
- Authenticated text-PDF acceptance: **PENDING**; authenticated scanned-PDF acceptance: **PENDING**.
- AI methods: no embeddings, vector DB, or LLM.

### Resume PDF text matching — 2026-10-01

- Resume upload endpoint already existed and the current Student Dashboard upload now confirms that extracted text will be included in matching. Success copy: “อัปโหลดเรซูเม่เรียบร้อยแล้ว เรซูเม่จะถูกนำมาร่วมวิเคราะห์ตำแหน่งงาน”. The panel explains fallback to profile fields when no PDF is present. Text-based PDFs only; scanned/image PDFs and OCR are not supported.
- Backend Job Matching candidate is built in this order: `Student.major` + `StudentProfile.related_skills` + extracted Resume PDF text when available. Candidate text is normalized and capped at 20,000 characters while preserving profile text first.
- Backend reads only the authenticated student’s `StudentFile` resume, requires `mime_type === "application/pdf"`, resolves with `resolveStoragePath()`, and checks the resolved file remains in that student’s resume directory. Only plain candidate text is sent to existing NLP; no binary, filename, or storage metadata is sent.
- Missing PDF, unsafe/unreadable PDF, extraction error, or empty extracted text falls back to major + related skills. The safe warning is `Resume text extraction failed; falling back to profile text`. With no usable text anywhere, API retains `422 MATCH_CANDIDATE_TEXT_REQUIRED`.
- Dependency added: `pdf-parse@^2.4.5` (CommonJS API, supports the Node 20 Docker base when Node is >=20.16). Service: `backend/src/services/resumeText.service.js`; text-based PDF extraction only, no OCR.
- Files modified for this work: `backend/package.json`, `backend/package-lock.json`, `backend/src/controllers/jobMatching.controller.js`, `backend/test/jobMatching.test.js`, `frontend/src/student_coop/student_coop.html`, `frontend/src/pages/student_coop.js`, `HANDOFF_fitm-intern.md`. The frontend upload wiring/API file and unrelated UI/dock-compose changes were already uncommitted before this task and were preserved.
- Matching tests: **PASS**, 14 passed, 0 failed using `node --test --test-isolation=none backend/test/jobMatching.test.js` (covers profile-only, extracted resume, resume-only, absent/failed/empty extraction, 422, public response privacy, and published-only filtering).
- Syntax checks for the specified Backend and Frontend files: **PASS**. `git diff --check`: **PASS**.
- `docker exec intern_frontend npm run build`: **PASS** (Vite v8.2.2; existing production inputs still omit the Student Dashboard page, as previously documented).
- Backend image rebuild and `docker compose up -d backend`: **PASS**. The running Backend uses a mounted `node_modules` volume, so `docker exec intern_backend npm install --omit=dev` was also required to expose the lockfile-pinned dependency. Backend syntax checks and `docker exec intern_backend node --test test/jobMatching.test.js`: **PASS**, 14 passed, 0 failed.
- Real authenticated upload → match → rendered results and Resume/profile comparison: **PENDING**; no authorized student session available.
- Backend changed: **YES**. NLP changed: **NO**. Migration added: **NO**. Resume PDF upload endpoint: **EXISTING / CONNECTED**. PDF text extraction: **IMPLEMENTED**. Embeddings, vector DB: **NOT IMPLEMENTED**. OCR: **NOT IMPLEMENTED**.

> ใช้ไฟล์นี้สำหรับเปิด ChatGPT/Codex แชทใหม่และทำงานต่อจากสถานะล่าสุดโดยไม่ย้อนทำงานเดิมซ้ำ

## PROJECT ROOT
C:\Users\suran\Documents\มอส\term31\pre-project\fitm-intern

## CURRENT STATUS

### Resume PDF Upload Frontend → Backend — 2026-10-01

- Resume PDF upload is connected to the existing authenticated `POST /api/student-profile/resume` endpoint using multipart field `resume` and the shared `apiRequest()` client.
- Frontend validation requires PDF MIME type and `.pdf` extension, with a 10 MB maximum. Duplicate clicks are guarded; the button shows a loading state. Success displays the returned original filename and file size when present, plus the existing toast.
- `400` responses map to safe PDF/size messages; `404` displays the missing-student message; `401` clears existing authentication and redirects to login. Other failures use a generic safe message.
- The panel now describes the upload as connected and states that Job Matching still uses student major and related skills; PDF text extraction is **NOT IMPLEMENTED** and resume content is not used for matching.
- Backend changes: **NONE**. Existing endpoint and file validation are reused.
- Real authenticated PDF upload acceptance: **PENDING**; no authorized student session was available during implementation.
- Files changed for this task: `frontend/src/api/studentProfile.api.js`, `frontend/src/pages/student_coop.js`, `frontend/src/student_coop/student_coop.html`, `HANDOFF_fitm-intern.md`.
- `node --check frontend/src/api/studentProfile.api.js`: **PASS**.
- `node --check frontend/src/pages/student_coop.js`: **PASS**.
- `git diff --check`: **PASS**.
- `docker exec intern_frontend npm run build`: **PASS** (Vite v8.2.2; the existing production inputs still omit the Student Dashboard page, as previously documented).

### Job Matching loading UX — 2026-10-01

- Added a visible 0–100% frontend request-wait indicator with a large percentage and filling bar. It advances to at most 95% while the existing `POST /api/job-matches/me` is pending; only a real successful response starts the final animation to 100% and the “วิเคราะห์เสร็จแล้ว” state. The percentage is explicitly described as waiting feedback, not actual NLP progress.
- Error stops timers below 100%; each new request resets to 0%. Existing request guard, `setButtonLoading()`, supporting Thai text, three skeleton cards, and result/empty/error transitions remain. Timers are cleared on completion/error; reduced-motion shortens the bar transition.
- No additional request, backend/API/ranking/score/PDF logic, or fake delay before response was added. The 300 ms visibility hold starts only after the successful response reaches 100%.
- Changed: `frontend/src/student_coop/student_coop.html`, `frontend/src/pages/student_coop.js`, `frontend/src/styles/student_coop.css`, `HANDOFF_fitm-intern.md`.
- Verification: `node --check frontend/src/pages/student_coop.js`, `git diff --check`, and `docker exec intern_frontend npm run build` all **PASS**.

### CURRENT AUTHORITATIVE STATUS — 2026-10-01

- Job Matching Backend ↔ NLP v1: **PASS**; existing real backend acceptance: **PASS** (unchanged).
- Frontend Job Matching Integration: **IMPLEMENTED**.
- Frontend implementation: **PASS**.
- Static/integration verification against the running local stack: **PASS**; see the follow-up verification below. This does not mark authenticated matching or real browser rendering as verified.
- Static/build verification and mocked DOM/API behavior verification: **PASS**.
- Frontend real authenticated browser/API acceptance: **PENDING**. No authorized Student session or browser tooling was available in this pass; no JWT was accessed or recorded.
- Student Dashboard combines “อัปโหลดเรซูเม่” + “ค้นหาสถานประกอบการ” into one sidebar button “ค้นหาสถานประกอบการ”, targeting `panel-job-matching` through the existing `.sidebar-item[data-target]` pattern. The old search placeholder handler and `panel-resume` target are removed.
- Explicit first search action: “ค้นหาตำแหน่งที่เหมาะกับฉัน”; after a successful response the action becomes “วิเคราะห์ใหม่”. A request guard and the existing shared `setButtonLoading()` prevent concurrent requests.
- `frontend/src/api/jobMatching.api.js` calls `POST /api/job-matches/me` with request body **NONE**. Existing `api/client.js` supplies the Bearer JWT. No manual Authorization header, candidate fields, student ID, NLP options, job list, or direct NLP request was added.
- Matching input remains backend-owned: `Student.major + StudentProfile.related_skills`; `top_k = 5` and `min_score = 0.05` remain unchanged.
- The source summary reuses `currentStudent` / `currentStudentProfile`, refreshes with profile rendering or panel entry, and links to the existing profile panel for edits. Missing values display “ยังไม่ได้ระบุ”.
- Results use only real API responses, preserve backend ordering/rank, display scores as percentages to two decimals, show company/province and every work mode, and render optional fields only when present. Backend strings use `createElement()` / `textContent`.
- Distinct inline loading, result, empty-success, and error states are implemented. `401` uses existing authentication cleanup/redirect; `403`, `404`, `422`, `502`, `503`, `504`, and default errors receive safe Thai messages without internal error details. Failed refreshes clear stale results and unlock retry.
- Resume UI is in the same panel; `resumeFile`, `uploadResumeBtn`, `resumeMessage`, and existing PDF validation/placeholder behavior are preserved. The UI states that resume upload is not backend-connected and Resume PDF is **NOT** used by Job Matching yet.
- Removed the existing successful profile-load console log that printed sensitive Student/Profile data.

Files created: `frontend/src/api/jobMatching.api.js`.

Files modified: `frontend/src/student_coop/student_coop.html`, `frontend/src/pages/student_coop.js`, `frontend/src/styles/student_coop.css`, `HANDOFF_fitm-intern.md`.

Verification commands and results:

- `node --check frontend/src/api/jobMatching.api.js`: **PASS**.
- `node --check frontend/src/pages/student_coop.js`: **PASS**.
- `rg -n '\b(alert|confirm)\s*\(' frontend`: no native dialog calls found.
- `git diff --check`: **PASS**.
- `docker exec intern_frontend npm run build`: **PASS**, Vite v8.2.2.
- Audit found the existing `vite.config.js` production inputs exclude Student Dashboard. Additional build, without writing output or changing configuration: `docker exec intern_frontend node --input-type=module -e "import { build } from 'vite'; import config from './vite.config.js'; config.build.rollupOptions.input = { studentCoop: '/app/src/student_coop/student_coop.html' }; config.build.write = false; await build({ ...config, configFile: false });"`: **PASS**, 14 modules transformed.
- Temporary in-memory `node --input-type=module` VM harness using the current matching source and mocked DOM/API: **PASS** for source summary, loading/busy, concurrent-request guard, safe text/XSS rendering, backend order, score formatting, multiple work modes, empty success, all error statuses/default, malformed success envelope, retry unlock, 401 cleanup/redirect, profile navigation, single sidebar target, and bodyless API call. Fixtures were test-only; no mock jobs were added to the application. Initial harness run hit a Windows stdin Thai-encoding assertion issue; the ASCII-only rerun passed.
- Final `git status --short` / `git diff` review: only the five intended files changed. Backend, NLP, migrations, shared client/feedback/main.css, landing mock data, and Vite config unchanged.

Blockers / next safe task:

- Implementation blocker: **NONE**. Real acceptance awaits an authorized Student browser session. Verify the actual bodyless POST, existing Bearer authentication without exposing the JWT, real results, responsive layout, retries, and profile changes followed by re-analysis.
- Before a production deployment, resolve the pre-existing Vite input omission for Student Dashboard in a separate packaging task; the standard production build does not emit this page. The additional no-write build verifies compilation only.

Deferred issues (unchanged):

- PDF text extraction: **NOT IMPLEMENTED**.
- Skill extraction/taxonomy: **NOT IMPLEMENTED**.
- Embeddings: **NOT IMPLEMENTED**.
- Persisted vectors: **NOT IMPLEMENTED**.
- Vector DB: **NOT IMPLEMENTED**.
- Staff Review, Reviewer FK, Staff Review UI: **DEFERRED**.
- Email transactional outbox: **DEFERRED**.
- Existing unrelated chatbot test failures: **PRE-EXISTING**, **UNRELATED TO JOB MATCHING**, **DEFERRED**. Not rerun or fixed in this frontend task.

### Job Matching Frontend → Express — local stack follow-up (2026-10-01)

- Read the requested matching source/HANDOFF and reviewed `git status` / `git diff` before work. Existing wiring was correct; no source rewrite or integration bug fix was needed.
- Express mounts `/api/job-matches`; the router defines authenticated `POST /me`, producing `POST /api/job-matches/me`. The controller queries published jobs only, builds the candidate server-side, calls NLP, validates ranking, and enriches the expected display fields.
- Frontend `.env`, Compose frontend environment, and the Vite-served client resolve Express at `http://localhost:5000`; Dashboard dev URL is `http://localhost:5173/src/student_coop/student_coop.html`. `jobMatching.api.js` delegates to `apiRequest()` with POST only. Existing `client.js` owns the stored student JWT/Bearer header; no frontend NLP call or payload fields were added.
- Existing `intern_frontend`, `intern_backend`, `intern_postgres`, and `intern_nlp_service` were running; PostgreSQL reported healthy. No restart, new container, credential, token, account, seed, or migration was created.
- Read-only live HTTP checks using `node --input-type=module`: Dashboard HTML, page module, API module, and client module all **200**; Express root **200**; Express `/health/db` **200** with status `ok`; NLP `/health` **200**. The served Dashboard includes the matching panel and page entry, and its page module calls the API and result renderer.
- Live CORS check: `OPTIONS http://localhost:5000/api/job-matches/me` with Origin `http://localhost:5173`, requested method POST and header authorization returned **204**; allow-origin, POST, and authorization header checks passed. A bodyless unauthenticated POST returned **401** with the expected CORS allow-origin header.
- Actual current frontend API/client code was evaluated in an in-memory Node VM against live Express, with no stored token and the existing fallback API URL. `getMyJobMatches()` issued POST to the exact Express endpoint; assertions confirmed body `undefined` and no request Content-Type. `apiRequest()` propagated status **401**. Only the Vite-specific `import.meta.env` expression was substituted for this Node check; application source was unchanged. This verifies the live unauthenticated boundary, not an authenticated success response or browser execution.
- `docker exec intern_backend node -e` with a read-only fetch to `http://nlp-service:8000/health`: **200**, verifying Backend → NLP connectivity on the existing Docker network. No matching payload was sent directly to NLP.
- `docker exec intern_backend node --test test/jobMatching.test.js`: **PASS**, 10 tests passed, 0 failed/skipped. Tests cover published filtering, normalized candidate/minimal payload, enrichment, empty results, student authorization, missing student/candidate, invalid NLP results/order, dependency timeout/unavailability, and safe internal failures. They use test dependencies and do not establish a real authenticated PostgreSQL → NLP matching success in this pass.
- `node --check frontend/src/api/jobMatching.api.js`: **PASS**.
- `node --check frontend/src/pages/student_coop.js`: **PASS**.
- `docker exec intern_frontend npm run build`: **PASS**, Vite v8.2.2. The previously recorded Dashboard production-input omission remains unchanged; dev serving was verified above.
- `git diff --check`: **PASS**. Existing uncommitted frontend work is preserved. The pre-existing `docker-compose.yml` diff removes `DB_USER`; this follow-up did not edit or revert that change, and the current running Backend database health check passed.
- Files changed in this follow-up: **`HANDOFF_fitm-intern.md` only**. Backend changed: **NO**. NLP changed: **NO**. Migrations changed: **NO**.
- Frontend implementation: **PASS**. Static/integration verification: **PASS**. Real authenticated browser/API acceptance: **PENDING**. No authorized student session or browser tool was available; no credentials were invented and no JWT was read, printed, or recorded. Real ranked-response rendering in a browser was **NOT VERIFIED** in this follow-up.
- Next safe task: use an authorized Student session to open the Dashboard matching panel and verify the bodyless Bearer POST, actual ranked response/cards, scores/company/province/work modes, and refresh behavior. Preserve the existing deferred issues and the separate production packaging task.

### ทำเสร็จแล้ว
- Student Authentication
- Student Profile
- PostgreSQL persistence
- Mentor Backend CRUD
- MentorToken / SHA-256 / expiry / invalidation
- Public Mentor Verification API
- Mentor Confirm API
- Nodemailer + Brevo SMTP
- Mentor Verification Frontend
- Rename Mentor Verification page + verification-status UI + resend verification email flow
- `node --check` ผ่าน
- `vite build` ใน Docker frontend container ผ่าน
- Student Mentor CRUD Frontend

### Mentor Verification Frontend files
- `frontend/src/mentor_coop/mentor_verify_user.html`
- `frontend/src/pages/mentor.js`
- `frontend/src/api/mentorVerification.api.js`
- `frontend/src/styles/mentor.css`

### Environment note
โปรเจกต์ควร build/dev ผ่าน Docker frontend container เป็นหลัก
Windows sandbox เคยเจอ `spawn EPERM` และปัญหา Rolldown/Tailwind native package แต่ Docker build ผ่าน จึงไม่ใช่ source/dependency ของโปรเจกต์เสีย

# LATEST COMPLETED WORK

## Landing, Login, and Register UX/UI Polish

### Current status and audit

- Audited `frontend/index.html`, `frontend/login.html`, `frontend/register.html`, their existing page modules (`frontend/src/pages/index.js`, `login.js`, `register.js`), `frontend/src/api/auth.api.js`, `frontend/src/styles/main.css`, `index.css`, `auth.css`, and `frontend/src/ui/feedback.js` before making changes.
- Index continues to use its existing `index.js` and `index.css`. Login and Register continue to share the existing `auth.css`; no duplicate page stylesheet or new API module was created.
- Login retains `POST /api/auth/login`, its existing `{ email, password }` payload, JWT storage, and redirect to `/src/student_coop/student_coop.html`. Register retains `POST /api/auth/register`, its existing payload and validation rules, and redirect to `/login.html` after a real successful response.

### UX/UI changes

- `index.html` now has a more polished subtle hero/card entrance, a restrained decorative background shape, and staggered recommended-card animation. The existing navigation, CTA, content, and carousel behavior are preserved. The filter modal now has dialog semantics, initial focus, Escape-to-close, focus restoration, and a short scale-in transition.
- `login.html` and `register.html` now expose required fields more clearly, retain their visible labels and autocomplete attributes, and add stronger focus/valid/error/success feedback. Auth cards use a short entrance transition; motion remains disabled by the shared reduced-motion rule.
- Password show/hide buttons report their pressed state. Login adds a Caps Lock warning only while the password input is being used; no password is logged or persisted outside the existing login request.
- Both auth forms use the existing shared `setButtonLoading()` and `showToast()` utilities for API-bound submit loading and real success/error feedback, while preserving the existing nearby inline message. Forms expose `aria-busy` while their request is pending and use an in-memory request guard to prevent duplicate submission.

### CSS and JS

- Reused from `main.css`: shared spinner/button-loading state, toast UI, disabled-state treatment, focus-visible rule, and global reduced-motion handling.
- Updated `index.css`: landing entrance, card stagger, hero shape, and filter-modal animation only.
- Updated `auth.css`: auth entrance, focus/valid/invalid input states, required indicator, Caps Lock notice, and inline message transition only.
- Updated `index.js`: accessible filter-modal focus/Escape behavior only.
- Updated `login.js` and `register.js`: shared feedback utility calls, submit guards, aria-busy state, password-toggle ARIA state, and Login Caps Lock detection. No endpoint, payload, validation rule, JWT/auth business logic, or redirect rule changed.

### Loading, feedback, and dialogs

- Login: after a real request begins, the submit button becomes disabled and says `กำลังเข้าสู่ระบบ...`; real success shows inline/toast feedback before the existing redirect, while real errors show inline/toast feedback and restore the button.
- Register: after a real request begins, the submit button becomes disabled and says `กำลังสมัครสมาชิก...`; real success shows inline/toast feedback before the existing redirect, while real errors show inline/toast feedback and restore the button.
- Search over the three page files and modules found no `alert()`, `window.alert()`, `confirm()`, or `window.confirm()` calls.

### Verification results

- `node --check frontend/src/pages/index.js` passed.
- `node --check frontend/src/pages/login.js` passed.
- `node --check frontend/src/pages/register.js` passed.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).
- `git diff --check` passed.
- Browser acceptance: **PENDING**. No browser session or authorized test account was used in this pass, so responsive layouts, animations, and real Login/Register success/error flows still need browser verification.

### Scope

- No Backend, database, migration, API endpoint, request payload, JWT/auth business logic, password hashing, token flow, or Student/Mentor business logic was changed.

## SECURITY
Verification Token ใด ๆ ที่เคยปรากฏใน Chat/Screenshot/Summary เดิม ให้ถือว่า compromised

ห้าม:
- reuse token เก่า
- hardcode token
- ส่ง token ลง Chat
- screenshot ที่เห็น token ใน Address Bar
- console.log(token)
- localStorage/sessionStorage token
- แสดง token ใน DOM

---

# LATEST COMPLETED WORK

## Verification Email Path — Source and Docker Runtime Verification

- The verification URL template is now `/src/mentor_coop/mentor_verify_user.html?token=...`.
- The only URL-path source is `backend/src/services/email.service.js`: `MENTOR_PAGE_PATH` is `/src/mentor_coop/mentor_verify_user.html`; `sendMentorVerificationEmail()` still uses `encodeURIComponent(token)`.
- Repository search found no active `mentor.html` / `/src/mentor_coop/mentor.html` reference outside historical handoff text. `frontend/src/mentor_coop/mentor.html` is absent; `frontend/src/mentor_coop/mentor_verify_user.html` exists.
- The verification page imports `/src/pages/mentor.js` and `/src/styles/mentor.css` correctly.
- Docker Compose runs backend in development mode with a bind mount from `./backend` to `/app` and `npm run dev`; the current `intern_backend` runtime file at `/app/src/services/email.service.js` also contains `mentor_verify_user.html`.
- Therefore, no backend rebuild or restart was needed or performed for this pass: the running container had already mounted the corrected source and nodemon had loaded it. If a prior real email contained `mentor.html`, it originated from an earlier runtime state or an email generated before the corrected mounted source was active; the current runtime has no old path reference.
- No database, migration, PostgreSQL volume, mentor status enum, token model/hash/expiry, public verification controller, Student Mentor CRUD, resend behavior, or verification JS logic was changed.

### Verification results

- `node --check backend/src/services/email.service.js` passed on the host and in `intern_backend`.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).
- `intern_backend` is running and its latest startup log reports a successful database connection, model sync, and server startup.
- Runtime verification was template-only; no verification email was generated and no token, JWT, password, SMTP key, or other secret was printed or recorded.

### Security

- Any verification token exposed in the latest previous test is compromised. Do not reuse, log, store, or add it to source, handoff, or reports. Generate a new verification email for the browser acceptance test.

---

# LATEST COMPLETED WORK

Student Mentor CRUD Frontend ใช้งานได้แล้วที่เมนู **ข้อมูลพี่เลี้ยง**:
- เปิดเมนูแล้วเรียก `GET /api/mentors/me` ด้วย JWT ผ่าน `apiRequest` เดิม
- แสดง empty state และปิดใช้งานปุ่มแก้ไข/ลบเมื่อยังไม่มีข้อมูล
- เพิ่มข้อมูลผ่าน modal, validation และ `POST /api/mentors`
- แก้ไขโดย preload ข้อมูลจริง และ `PUT /api/mentors/me`
- ลบด้วย confirm dialog และ `DELETE /api/mentors/me`
- หลัง create/update โหลดข้อมูลล่าสุดจาก API; หลัง delete แสดง empty state
- รองรับ loading, empty, ready, saving, success, error และ deleting พร้อมป้องกัน double submit

### Files created
- `frontend/src/api/mentor.api.js`

### Files modified
- `frontend/src/pages/student_coop.js`
- `frontend/src/student_coop/student_coop.html`
- `frontend/src/styles/student_coop.css`

### Verification results
- `node --check frontend/src/pages/student_coop.js` ผ่าน
- `node --check frontend/src/api/mentor.api.js` ผ่าน
- `docker exec intern_frontend npm run build` ผ่าน (Vite v8.2.2)
- ไม่ได้แก้ Backend หรือ Database
- ไม่มี mock data และ request body ไม่มี `student_id`; owner ระบุจาก JWT ที่ `frontend/src/api/client.js` จัดการ

---

# LATEST COMPLETED WORK

## Student Mentor Status UI Render Fix

- The Student mentor card now exposes the resend confirmation UI only when an existing mentor has `status === "pending"`.
- `verified` shows `ยืนยันแล้ว` while the unverified hint and resend button are hidden.
- Missing mentor records continue to show `ยังไม่มีข้อมูลพี่เลี้ยง`; null or unknown statuses show `ไม่ทราบสถานะ`, with no resend control.
- Added a scoped `[hidden]` style so the pending-only hint and resend button remain hidden even though the shared button class sets a display value.
- No backend, database, status enum, or resend API changes were made.

### Files modified
- `frontend/src/pages/student_coop.js`
- `frontend/src/styles/student_coop.css`
- `HANDOFF_fitm-intern.md`

### Verification results
- `node --check frontend/src/pages/student_coop.js` passed.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).

### Next task
- Run a browser/API acceptance test with an authorized student account when available.

---

## Mentor Verification Page Rename, Status, and Resend

- Rename verification page from `frontend/src/mentor_coop/mentor.html` to `frontend/src/mentor_coop/mentor_verify_user.html`
- Backend verification URL now resolves to `/src/mentor_coop/mentor_verify_user.html?token=...`; only the page path string in `backend/src/services/email.service.js` changed.
- Student mentor card now reads the API `status` field directly:
  - `pending` → badge `รอยืนยัน`, explanatory text, and a resend button.
  - `verified` → green badge `ยืนยันแล้ว` and no resend button.
  - unknown/null → safe fallback `ไม่ทราบสถานะ`; it is never guessed as verified.
  - no mentor record → `ยังไม่มีข้อมูลพี่เลี้ยง`.
- Resend reuses `PUT /api/mentors/me` with only the existing mentor's `email`, `first_name`, `last_name`, and `position`. It never sends `student_id`, mentor ID, or a verification token.
- Resend asks for confirmation, prevents duplicate submissions, shows `กำลังส่ง...`, refreshes with `GET /api/mentors/me`, and shows a warning when `verification_email_sent` is `false`.
- No new API, token logic, database change, migration, or status enum was created.

### Files renamed
- `frontend/src/mentor_coop/mentor.html` → `frontend/src/mentor_coop/mentor_verify_user.html`

### Files modified
- `backend/src/services/email.service.js`
- `frontend/src/student_coop/student_coop.html`
- `frontend/src/pages/student_coop.js`
- `frontend/src/styles/student_coop.css`
- `HANDOFF_fitm-intern.md`

### Verification results
- `node --check frontend/src/pages/student_coop.js` passed.
- `node --check frontend/src/pages/mentor.js` passed.
- `node --check frontend/src/api/mentor.api.js` passed.
- `node --check frontend/src/api/mentorVerification.api.js` passed.
- `node --check backend/src/services/email.service.js` passed.
- Repository search has no active `mentor.html` reference; the only prior handoff reference was updated.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).

### Remaining issue
- ยังไม่ได้ทำ browser/API acceptance test ด้วยบัญชีนักศึกษาจริงที่ได้รับอนุญาต เพราะต้องใช้ session JWT และการส่งอีเมลจริง

---

# LATEST COMPLETED WORK

## Mentor Verification — Student and University Context

- The Mentor Verification page now shows a context box above the mentor form with the system university name, `มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ`, and the name of the student assigned to that mentor.
- `GET /api/mentor-verification/verify?token=...` previously returned only mentor data. The existing endpoint now also returns `data.mentor.student` through the established `Mentor.student_id` → `Student.id` association.
- The Student model was inspected before the query change: its usable name fields are `first_name` and `last_name`; there is no `prefix` field. The API exposes only those two Student fields—no student ID/UUID, email, password, JWT, contact data, GPA, medical data, or other profile fields.
- `frontend/src/pages/mentor.js` renders the name only from `data.mentor.student.first_name` and `last_name`, with normal spacing. If neither usable value is present, it shows `ไม่พบข้อมูลนักศึกษา`; it does not derive a name from email or storage.
- The context remains within `mentorContent`, so it stays visible after confirm while the existing confirmation locking and address-bar token removal behavior are unchanged.

### Files modified

- `backend/src/controllers/mentorVerification.controller.js`
- `frontend/src/mentor_coop/mentor_verify_user.html`
- `frontend/src/pages/mentor.js`
- `frontend/src/styles/mentor.css`
- `HANDOFF_fitm-intern.md`

### Verification results

- `node --check frontend/src/pages/mentor.js` passed.
- `node --check backend/src/controllers/mentorVerification.controller.js` passed.
- `git diff --check` passed.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).
- Browser/API acceptance testing remains pending because it requires a newly generated, authorized verification link. Do not record or reuse its token or any JWT.

### Scope and security

- No database, migration, column, Mentor CRUD, resend/email flow, confirm flow, SHA-256, token generation, expiry, invalidation, consume logic, or transaction logic was changed.
- The GET response uses the minimum necessary Student display data only.

# LATEST COMPLETED WORK

## Frontend UX/UI Polish — Shared Feedback and Mentor Auto-close

### Current status and audit

- Audited all five frontend pages in the repository: `index.html`, `login.html`, `register.html`, `frontend/src/student_coop/student_coop.html`, and `frontend/src/mentor_coop/mentor_verify_user.html` (plus their page modules). The dashboard has existing profile, mentor, daily-log, resume, project, and transfer UI; the login/register pages already use inline request feedback and button disabled/loading states; the Mentor Verification page already has API-bound loading/state UI.
- Audited all frontend styles: `main.css`, `auth.css`, `index.css`, `student_coop.css`, and `mentor.css`. `main.css` previously contained shared tokens, reset, navbar, footer, and responsive styles only. Page-specific CSS remains in its matching file; this pass changed only `mentor.css` for Mentor-only success animation.
- Before the change, the only native dialogs were five occurrences in `frontend/src/pages/student_coop.js`: three `alert()` calls and two `window.confirm()` calls. The final native-dialog search returns no `alert()` or `confirm()` application calls in `frontend`.

### Shared UI and feedback patterns

- Created `frontend/src/ui/feedback.js` as the single Vanilla JS feedback utility. It provides `showToast()`, `showConfirmModal()`, and `setButtonLoading()`.
- Added shared toast, confirmation-modal, enter/exit animation, disabled, and reduced-motion styles to `frontend/src/styles/main.css`. Toasts expose an appropriate `role` and `aria-live`; the modal has focus management, Escape-to-cancel, locked confirmation while an action is pending, and does not close on a backdrop click by default for irreversible actions.
- `student_coop.js` now uses info/warning toasts for the three former alerts. Delete mentor and resend verification email now use the shared confirmation modal, retain the existing API calls and inline loading/success/error messages, and show a loading state on the confirmation button to prevent duplicate submission.
- Mentor Verification now loads `main.css`, uses the shared button-loading helper, and asks for custom confirmation before the irreversible mentor confirmation request. Existing API endpoints, payloads, JWT handling, mentor token behavior, and business rules are unchanged.

### Mentor verification success and auto-close

- After a real successful confirmation response, the form and buttons remain disabled, the verification token is removed from the address bar through the existing history replacement flow, a success toast and green check animation are shown, and the page waits 1.8 seconds before one `window.close()` attempt.
- Browsers can reject closing a tab that was not opened by script. If the tab remains open, the status becomes `ยืนยันข้อมูลเรียบร้อยแล้ว สามารถปิดหน้านี้ได้`; there is no redirect to `about:blank`, reload, close loop, or browser workaround.

### Files created or modified in this pass

- Created: `frontend/src/ui/feedback.js`
- Modified: `frontend/src/styles/main.css`, `frontend/src/pages/student_coop.js`, `frontend/src/mentor_coop/mentor_verify_user.html`, `frontend/src/pages/mentor.js`, `frontend/src/styles/mentor.css`, `HANDOFF_fitm-intern.md`
- No page-specific `student_coop.css`, `auth.css`, or `index.css` changes were needed in this pass.

### Verification results

- `node --check frontend/src/ui/feedback.js` passed.
- `node --check frontend/src/pages/student_coop.js` passed.
- `node --check frontend/src/pages/mentor.js` passed.
- `git diff --check` passed.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).

### Remaining issue

- A browser/API acceptance test still requires a newly generated authorized verification link and an authorized student session. Do not record, reuse, or expose a verification token or JWT.
- No Backend, database, migration, API endpoint, request payload, JWT/token logic, status enum, or other business logic was changed in this UX/UI pass. No mock data or hardcoded API success was added.

# LATEST COMPLETED WORK

## Student Coop — Backend-connected Section Audit and UX States

### Audit result

- `frontend/src/student_coop/student_coop.html` has 10 content panels. Three are backend-connected: Overview, Student Profile, and Mentor Information. Seven remain static/mock and were not changed to imply live backend behavior: Resume Upload, Coop Request, Daily Log, Coop Project, Project Upload, Company Evaluation, and Transfer Request.
- Overview (`#panel-overview`) receives student identity/status through `checkAuthentication()` → `getCurrentStudent()` in `frontend/src/api/auth.api.js` → `GET /api/auth/me`. Its cooperative-workplace card is static/empty because no workplace API is called.
- Student Profile (`#panel-profile`) uses `frontend/src/api/studentProfile.api.js`: `GET /api/student-profile/me`, `GET /api/student-profile/profile-image`, `POST /api/student-profile/profile-image`, `PUT /api/student-profile/student-info`, and `PUT /api/student-profile/me`; it also uses `frontend/src/api/teacher.api.js` → `GET /api/teachers` to populate the advisor selector.
- Mentor Information (`#panel-mentor`) uses `frontend/src/api/mentor.api.js`: `GET /api/mentors/me`, `POST /api/mentors`, `PUT /api/mentors/me`, and `DELETE /api/mentors/me`.

### UX work applied to live sections only

- Profile GET now has an inline loading state, `aria-busy`, error feedback, an explicit empty-details message, and a short Student-specific content transition. The teacher selector is disabled with a loading option while its GET is pending and exposes an empty teacher result if none are returned.
- Student information PUT, profile-detail PUT, and profile-image POST have request guards to prevent duplicate submission, disabled loading buttons, inline error/success feedback, real-data refresh after mutation, and success toast feedback. Profile modal closing is blocked while its PUT is pending.
- Mentor already had GET loading/empty/error, create/update/delete/resend pending states, custom confirmation, and guards. This pass adds success toasts after successful create/update/delete/resend responses; all request and refresh behavior is unchanged.
- `frontend/src/styles/student_coop.css` now contains only Student-profile scoped loading/fade styles. Shared toast, modal, spinner, and reduced-motion styling continue to be reused from `frontend/src/styles/main.css`; `frontend/src/ui/feedback.js` was not changed.

### Files modified in this pass

- `frontend/src/student_coop/student_coop.html`
- `frontend/src/pages/student_coop.js`
- `frontend/src/styles/student_coop.css`
- `HANDOFF_fitm-intern.md`

### Scope and remaining verification

- No Backend, database, migration, endpoint, request payload, JWT/auth flow, mentor token/email flow, or business rule was changed. No mock/static panel was made to simulate a live API.
- `node --check frontend/src/pages/student_coop.js` passed, the frontend native-dialog search found no `alert()` or `confirm()` calls, `git diff --check` passed, and `docker exec intern_frontend npm run build` passed (Vite v8.2.2).
- Browser acceptance testing is pending because it requires an authorized student session. Test live Profile loading/empty/error, image upload, student/profile updates, teacher-list loading/empty/error, and Mentor CRUD/resend with real authorized API responses. Do not record any JWT or verification token.

# LATEST COMPLETED WORK

## Coop Request — Remove Job Title + Use Class Advisor

### Audit and database/model impact

- Audited the Co-op Request model, controller, routes, frontend API module, request UI, Student Profile response, and PostgreSQL before changing the contract.
- PostgreSQL `coop_requests` had a NOT NULL `job_title` column but contained **0 rows** (and therefore no `job_title` values to lose). No other Co-op Request source dependency used that column.
- `job_title` is removed from the `CoopRequest` model. With the existing `sequelize.sync({ alter: true })` development configuration, the next backend sync removes the now-unused column.
- No migration framework was added. Student Profile retains both `advisor_teacher_id` and `coop_advisor_teacher_id` unchanged.

### API and frontend changes

- `POST /api/coop-requests` no longer accepts, validates, trims, requires, or persists `job_title`. The frontend create payload no longer sends it.
- The create modal removes the job-title DOM/input/validation and reflows the remaining workplace fields. Current Request shows only the company/workplace name; its information grid no longer contains a position. History now shows province in place of position, and Detail removes the job-title row.
- Detail response includes the request owner’s real `advisor_teacher_id` relation as `student.advisorTeacher`, restricted to the teacher name fields required by the UI.

### Advisor approval source

- The Create and Detail approval sections show the real class advisor name only from `advisor_teacher_id → advisorTeacher`; if that relation is absent they show `ยังไม่ได้กำหนดอาจารย์ที่ปรึกษาประจำชั้น`.
- `coop_advisor_teacher_id` / `coopAdvisorTeacher` is not used in the Co-op Request approval section. It remains available and unchanged in Student Profile.
- There is no Teacher Approval backend, so the approval result and date remain the explicit unavailable states. No approval status, checkbox, date, or teacher name is fabricated or hardcoded.

### Verification and remaining work

- Source search confirms there is no remaining Co-op Request `job_title` reference in the model, controller, routes, frontend API, request HTML, request JS, or request CSS.
- `node --check` passed for the modified backend model/controller/route and frontend API/page modules; `git diff --check` passed; `docker exec intern_frontend npm run build` passed.
- Restarted `intern_backend`: database connection, Sequelize model sync, and server startup succeeded. PostgreSQL schema verification after sync returned no `coop_requests.job_title` column.
- Browser/API acceptance remains pending an authorised student session: verify create/detail/current/history layouts, class-advisor present/absent states, and real POST/GET behaviour without `job_title`.
- No mock data was added. Company/Job Posting implementation remains **PAUSED**.

# NEXT TASK

## Run browser acceptance for the polished Landing, Login, and Register pages

Verify desktop, tablet, and mobile layouts; landing/filter-modal keyboard behavior and reduced motion; Login/Register required validation, password show/hide, Login Caps Lock warning, API-bound loading, real success/error feedback, and the existing redirects. Record only pass/fail results; do not record passwords, JWTs, or verification tokens.

---

# CODEX PROMPT — ARCHIVED (completed task)

อ่าน `HANDOFF_fitm-intern.md` ก่อน

งาน Student Mentor CRUD Frontend ด้านล่างเสร็จแล้ว; ใช้เป็นบันทึก requirement เดิมเท่านั้น

สถานะตอนนี้:
- หน้า UI เปิดได้
- ปุ่ม “เพิ่มข้อมูลพี่เลี้ยง”, “แก้ไขข้อมูลพี่เลี้ยง”, “ลบข้อมูลพี่เลี้ยง” มีอยู่แล้ว
- แต่คลิกแล้ว flow ยังไม่ทำงาน
- Email / ชื่อ / นามสกุล / ตำแหน่ง ยังแสดงเป็น -

ให้ตรวจ source code ปัจจุบันก่อน และหาไฟล์จริงที่ควบคุม section นี้
ห้ามเดาชื่อไฟล์ใหม่ถ้ามีของเดิมอยู่แล้ว

ใช้ Backend API ที่มีอยู่แล้วเท่านั้น:
GET    /api/mentors/me
POST   /api/mentors
PUT    /api/mentors/me
DELETE /api/mentors/me

ข้อกำหนด:
- ห้ามแก้ Backend
- ห้ามแก้ Database
- ห้ามสร้าง API ใหม่
- ห้ามใช้ Mock Data
- Student routes ใช้ JWT ตาม pattern เดิมของ project
- ห้ามส่ง owner student_id จาก frontend
- API request ต้องอยู่ใน `frontend/src/api/`
- DOM/UI/event/render ต้องอยู่ใน `frontend/src/pages/` หรือ page logic เดิม
- reuse UI/style เดิมให้มากที่สุด
- ปุ่มเพิ่มต้องเปิด form/modal และ POST ได้จริง
- ปุ่มแก้ไขต้อง preload ข้อมูลและ PUT ได้จริง
- ปุ่มลบต้อง confirm ก่อน DELETE
- หลัง create/update/delete ให้ refresh state จาก API จริง
- รองรับ loading/empty/ready/saving/success/error/deleting
- validate email, first_name, last_name, position
- ป้องกัน double submit
- ถ้าไม่มี Mentor ให้ edit/delete disable หรือซ่อน
- ห้ามแก้ Mentor Verification Frontend ที่ทำเสร็จแล้วถ้าไม่เกี่ยวข้อง

หลังแก้เสร็จ:
1. สรุปไฟล์ที่แก้
2. สรุป flow GET/POST/PUT/DELETE
3. ระบุ API layer ที่ใช้
4. ระบุการจัดการ JWT
5. ระบุ validation/error handling
6. รัน `node --check` กับ JS ที่แก้
7. รัน `vite build` ใน Docker frontend container
8. ยืนยันว่าไม่ได้แก้ Backend/Database
9. ยืนยันว่าไม่มี Mock Data
10. อัปเดต `HANDOFF_fitm-intern.md` ให้สะท้อนสถานะล่าสุดและ NEXT TASK ใหม่ก่อนจบงาน

---

# HANDOFF UPDATE RULE

ตั้งแต่นี้เป็นต้นไป ทุกครั้งที่มีการทำงานหรือเปลี่ยนสถานะในโปรเจกต์ `fitm-intern` ต้องอัปเดต `HANDOFF_fitm-intern.md`

อย่างน้อยต้องอัปเดต:
- สิ่งที่ทำเสร็จแล้ว
- ไฟล์ที่เปลี่ยน
- ผล test/build
- ปัญหาที่ยังเหลือ
- NEXT TASK ล่าสุด

---

# JOB MATCHING BACKEND ↔ NLP v1 — FRONTEND READY

**BACKEND ↔ NLP JOB MATCHING v1: FRONTEND READY**

- Public endpoint: `POST /api/job-matches/me`.
- Authentication: required. Send the existing student JWT as `Authorization: Bearer <token>`. Missing/invalid tokens return `401`; authenticated non-student actors return `403`.
- Request body: none. The existing frontend `apiRequest` client can call the path with `{ method: "POST" }`; no request `Content-Type` is required when no body is sent.
- Candidate source: trimmed `Student.major + StudentProfile.related_skills`. At least one must contain usable text; otherwise the backend returns `422`.
- PostgreSQL rule: Express queries `JobPosting` with `status = "published"` only. Non-published jobs never enter the NLP payload. If there are no published jobs, Express returns `200 { "matches": [] }` and does not call NLP.
- Internal NLP endpoint: `POST /api/v1/job-matches`, with `schema_version: "job-matching.v1"`.
- Algorithm: PyThaiNLP `newmm` → stopwords → TF-IDF → cosine similarity.
- Options: `min_score: 0.05`, `top_k: 5`.
- Deterministic ranking: score descending, then `job_posting_id` ascending; rank is 1-based and contiguous. The threshold is applied before `top_k`, scores are finite values in `0..1` rounded to four decimals, and Express rejects duplicate/unknown IDs, malformed ranks/scores/order, or more than five returned matches.
- Express owns PostgreSQL. The NLP service has no PostgreSQL access. NLP returns only `job_posting_id`, `score`, and `rank`; Express safely enriches results from the original published query.

Success response (nullable database-backed display fields remain safely nullable where applicable):

```json
{
  "matches": [
    {
      "job_posting_id": "80605832-7190-4aa4-b43a-ffafdba31165",
      "score": 0.3187,
      "rank": 1,
      "title": "IT Helpdesk Intern",
      "description": "Job description",
      "category": "information_technology",
      "quota": 3,
      "compensation_text": "350 baht/day",
      "work_days_per_week": 5,
      "company": { "name": "Example Company", "province": "Chiang Mai" },
      "workModes": [{ "mode": "onsite" }]
    }
  ]
}
```

- Empty success response: `200 { "matches": [] }`.
- Frontend-relevant errors: `401` missing/invalid/expired JWT (existing auth response); `403 STUDENT_AUTHORIZATION_REQUIRED`; `404 MATCH_STUDENT_NOT_FOUND`; `422 MATCH_CANDIDATE_TEXT_REQUIRED`; `502 NLP_MATCHING_INVALID_RESPONSE`; `503 NLP_MATCHING_UNAVAILABLE`; `504 NLP_MATCHING_TIMEOUT`; `500 JOB_MATCHING_INTERNAL_ERROR`. Responses contain safe messages and no stack traces, secrets, internal URLs, token values, SQL details, or Python exception internals.
- Configuration: backend uses `NLP_SERVICE_BASE_URL` (Compose: `http://nlp-service:8000`) and `NLP_SERVICE_TIMEOUT_MS` (Compose/default: `5000`). The client has an explicit abort timeout and no automatic retry.
- PDF extraction: **NOT IMPLEMENTED**.
- Embeddings/vector DB: **NOT IMPLEMENTED**.
- Frontend integration: **IMPLEMENTED**; see CURRENT AUTHORITATIVE STATUS above. Frontend real acceptance remains **PENDING**.
- Migrations added: **NONE**.
- Real acceptance: **PASS**. Authenticated Student → Express → PostgreSQL published jobs → NLP v1 → deterministic ranking → Express enrichment returned `200`; NLP `/health` returned `200`; 20 usable published fixtures were present; 3 matches were returned; every returned ID belonged to the published query; result count was at most 5; ranks were contiguous; and no internal fields leaked.
- Backend tests: **34 passed, 1 skipped** (the existing opt-in PostgreSQL transaction integration test).
- Targeted NLP Job Matching tests: **7 passed**.
- Full NLP suite: **8 passed, 2 failed**. The two failures remain the pre-existing/unrelated chatbot tests whose test client does not execute classifier-training application lifespan; deferred and unchanged. No Job Matching regression was found.
- `git diff --check`: **PASS**.

## NEXT ACTIVE TASK

Complete authenticated Skills/Resume Job Matching browser acceptance, Resume text/scanned persistence checks, and live Auth/Profile/Profile Image/Mentor regression; then separately resolve the existing production Vite input omission before deployment.

### Job Matching progress timing refinement — 2026-10-01

- Request-wait progress now eases from 0% toward a 95% ceiling over about five seconds. If the API succeeds sooner, the UI waits out the remaining visual duration before animating to 100%; a slow request holds at 95%.
- Success shows “วิเคราะห์เสร็จแล้ว” at 100% for 400 ms before transitioning to results or the empty state. Errors stop the progress timers and retain the existing error state without reaching 100%.
- Each guarded request resets to 0%. This remains frontend-only feedback; the API call and matching behavior are unchanged.
# Resume OCR acceptance checkpoint before Axios migration - 2026-10-01

- Resume upload: **PASS** (existing runtime acceptance).
- Native PDF extraction: **PASS** (existing runtime acceptance); authenticated text-PDF persistence: **PENDING**.
- Thai OCR runtime: **PASS**. English OCR runtime: **PASS**.
- Scanned PDF OCR runtime: **PASS** through the NLP OCR endpoint; authenticated scanned-PDF persistence: **PENDING**.
- Weighted matching: **PASS** (65/35 and existing single-source tests). Matching OCR rerun: **NO**; matching uses persisted extracted text when ready, covered by existing backend implementation/tests. Repeated authenticated matching request: **PENDING**.
- Profile fallback: **PASS**. Resume fallback: **PASS** (existing implementation/tests).
- Migration 008: **PASS / applied**; no pending migration was previously observed.
- Backend tests: **PASS, 16**. NLP tests: **PASS, 14**. Frontend build: **PASS** (prior run).
- Authenticated persistence and browser acceptance: **PENDING**; no authenticated student session was available. No private resume fields were inspected or reported in this task.

### Axios migration and final regression status - 2026-10-01

- Frontend HTTP client: **Axios**, centralized in `frontend/src/api/client.js` with one shared instance and a 30 second timeout. API modules use `apiRequest()`; pages do not call Axios.
- JWT request interceptor: **YES**; adds the current `token` as Bearer only when Authorization was not supplied. Public recruitment and mentor verification calls explicitly skip auth as before. No token logging or global logout/redirect behavior was added.
- Central error normalization: **YES** (`status`, `data`, safe `message`; timeout/network fallbacks). Recruitment `Retry-After` remains available to its existing error UI.
- JSON objects use Axios serialization. Resume `FormData` uses browser/Axios multipart boundary generation without a manually set content type. Blob profile image reads retain `responseType: "blob"`.
- Optional `onUploadProgress` is forwarded. The existing recruitment and mentor verification consumers retain their prior `{ status, data }` response shape; standard `apiRequest` calls return response data.
- Frontend backend Fetch calls: **NONE**. Source scan found only the centralized Axios import/instance; `frontend/src/api/*.js` use the shared client.
- Changed for this phase: `frontend/src/api/client.js`, `frontend/src/api/mentorVerification.api.js`, `frontend/src/api/recruitStudent.api.js`, and this handoff. Backend changed: **NO**. NLP changed: **NO**. Migration added: **NO**.
- Verification: changed API modules `node --check`: **PASS**; `git diff --check`: **PASS**; `docker exec intern_frontend npm run build`: **PASS**. Backend Job Matching and resume text targeted tests: **16 passed**. NLP matching/resume/OCR targeted tests: **14 passed**.
- Regression against live authenticated Auth/Profile/Profile Image/Resume/Job Matching/Mentor APIs and browser Network inspection: **PENDING**; no authenticated student session was available. No live FormData upload, profile-image request, or matching request was sent in this phase.
- OCR persistence closeout remains **PENDING** for both normal text PDF (`pdf_text`) and scanned PDF (`ocr`), because neither authenticated upload nor a current student's safe `StudentFile` metadata query was available. Existing implementation reads cached ready `extracted_text` for matching and does not invoke OCR during matching; repeated live authenticated matching acceptance remains **PENDING**.

## Cooperative Education Request and Job Matching integration — 2026-10-01

- Existing schema audit: `coop_requests` already stored `company_name`, `company_province`, and `company_address` snapshots, but had no Company or JobPosting relationship. Company address source fields are `address_no`, `moo`, `subdistrict`, `district`, and `province`.
- Added migration **009** with nullable `company_id` and `job_posting_id`, foreign keys to `companies` and `job_postings`, and indexes. Migration **applied**; pending migrations: **0**.
- Student-only Company search uses backend Company data, partial name matching, and a response limited to UI fields. Exact duplicate checking uses the existing `normalized_name` convention (collapsed whitespace, Thai locale lowercase) and does not create a Company master record.
- Direct CoopRequest supports selecting an existing Company or entering a manual company snapshot. The backend resolves selected Company data and overwrites client snapshots with database values. Manual snapshots remain supported; no Company is inserted.
- Job Matching cards now offer a CoopRequest action. It loads a published JobPosting from the backend by ID, resolves its Company there, then opens the existing CoopRequest modal with Company and JobPosting preselected. The create endpoint rechecks publication and the Company relationship.
- Existing snapshot fields, authenticated student identity from `req.user.id`, and owner-scoped request detail/cancel behavior are preserved. CoopRequest routes now require a student-shaped JWT.
- Added CoopRequest company-flow tests for auth, partial search/safe fields, normalized duplicates, server-resolved snapshots, manual no-insert behavior, and published/nonexistent/unpublished/mismatched JobPosting validation.
- Backend tests: **51 passed, 1 skipped** (existing opt-in PostgreSQL recruitment integration test). Frontend build: **PASS**. Frontend page/API syntax checks: **PASS**. `git diff --check`: **PASS**.
- Axios source scan: direct `axios` import remains only in `frontend/src/api/client.js`; Fetch and XMLHttpRequest scans returned no matches.
- Browser acceptance: **PENDING** (no authenticated browser session used). Existing Vite build input configuration does not include `student_coop.html`; that pre-existing build omission was not changed in this focused task.

### Current database relationships

- `CoopRequest.belongsTo(Student)` remains required.
- `CoopRequest.belongsTo(Company)` and `CoopRequest.belongsTo(JobPosting)` are nullable links; document snapshots remain independent and preserved.
- `Company.hasMany(CoopRequest)` and `JobPosting.hasMany(CoopRequest)` provide the reverse relationships.
