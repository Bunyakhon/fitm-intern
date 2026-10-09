# Daily Internship Log and Weekly Mentor Review — 2026-10-08

Implementation and verification use the existing Student dashboard and Mentor verification page. **No existing Local/staging/production database was accessed or modified. Migration 018 is pending for any persistent environment; it has run only on explicitly guarded disposable PostgreSQL databases.** No commit, push, PR or deployment.

## Audit and reuse

Daily Log previously appended/deleted DOM rows with only date/work and lost them on reload. No daily-log or weekly-review schema/API existed. The existing Mentor is associated with exactly one Student; verification tokens are hashed, expire after 24 hours and become consumed on confirmation. Those consumed verification tokens remain unsuitable for review access.

Reuse Student JWT/role checks, live Student records, the current Mentor relationship and `verified_at`, accepted request work dates (`approved/document_issued/in_progress`), Sequelize/Umzug, the existing Student menu and main CSS, shared confirmation/toast/loading controls, Mentor page/API conventions, SMTP helper, guarded integration runner and real Chrome CDP driver. Company Response/Placement rules, canonical Class/Head approval, advisor IDs and student_files behavior remain unchanged.

## Daily and weekly behavior

- One Student/date record; create conflicts and optimistic update versions prevent duplicate/lost writes. Bangkok dates reject malformed/future dates and dates outside the one unambiguous approved internship period. Entries from previous days remain writable before submission, with no same-day penalty or automatic fabricated record.
- Working entries require assigned work, result, problems and solutions. `ไม่มีปัญหา` / `ไม่ต้องแก้ไข` are accepted; notes are optional. Nonworking entries require an explicit reason (holiday/leave/etc.) and reject invented work fields.
- The existing Daily menu shows a selectable week/history, completion/missing dates, each date's state and view/edit action, all five multiline fields, nonworking reason, weekly submit, link resend and feedback/history. Unsaved daily edits must be saved before submission. Confirmation lists saved daily entries before sending the complete batch.
- A week is Monday–Sunday in Bangkok. First/last weeks require only dates within the approved period; every applicable calendar date must contain a valid working/nonworking entry. Submission waits until the last applicable date, prevents missing days and does not invent logs. Students may submit on that date or later; there is no irreversible daily cutoff.
- Draft is represented by daily records with no weekly submission. Submission transitions: submitted → reviewed OR revision_requested → submitted. Submitted/reviewed daily records freeze. Requested revisions permit versioned daily editing and resubmission while preserving each previous immutable submission snapshot and review event.
- Student and Mentor mutations serialize on the Student row, then current Mentor/weekly/token rows as applicable. Each submission/review updates current state and immutable event in one transaction; concurrent duplicate submissions/decisions produce one success and one conflict.

## Mentor access and review

Submission sends a server-issued seven-day review link to the current verified Mentor's stored email. Students can resend it; the API never returns plaintext tokens. SMTP failure returns `email_sent:false` after the committed submission, and the UI reports the committed save and offers retry. No test sends real email; database tests use an adapter and browser API processes disable SMTP.

Review capabilities have a separate hash-only table, reuse the verified Mentor/Student relationship, and bind to the exact verification timestamp. Rotation revokes older capabilities. Expiry, revocation, pending/reverified/reassigned Mentor and wrong Student fail server-side. Verification tokens retain their original single-use semantics and cannot be used as review capabilities.

The existing Mentor page accepts `#review_token=...`, removes the fragment immediately, sets no-referrer, keeps the capability in page memory and sends it in the Authorization header. It lists only this Mentor's Student/week submissions, displays every daily snapshot, and permits whole-week review or revision request. Revision requests require feedback; confirmation may contain feedback without mandatory numeric scores. Server-derived Mentor name and event timestamp identify the reviewer. Stored feedback/history return to the Student. No daily approval UI or password account is introduced.

## Migration and schema

`018_add_internship_logs.js` adds four tables only:

| Table | Purpose |
| --- | --- |
| internship_daily_logs | One current Student/date entry and edit version |
| internship_weeks | One current Student/Monday submission state and frozen snapshot |
| internship_week_events | Immutable submission/review/revision history, actor name/time/feedback |
| internship_review_tokens | Hashed expiring Mentor capabilities bound to verified association |

Evidence foreign keys use RESTRICT. Pure access tokens cascade on Student/Mentor deletion, retaining the existing ability to delete a Mentor before weekly evidence exists and invalidating their capabilities. Once a submission references a Mentor, the existing deletion endpoint returns explicit 409 MENTOR_HISTORY_EXISTS and preserves the evidence. Unique Student/date, Student/week, week/event-version and token hash; working/nonworking completeness and length checks; Monday/week-end/state/version checks; frozen daily trigger; weekly transition guard; immutable history trigger. Migration DDL is transactional and populated rollback is refused. Empty UP/DOWN/reapply, injected partial-DDL failure, FK/CHECK failures, SQL freeze/history/transition enforcement and existing file fingerprint preservation are verified in disposable PostgreSQL. Total migration ledger there: 19, including 007a and 018.

## API inventory

All under `/api/internship-logs`; Student identity comes from authenticated JWT; Mentor identity comes from the capability. Body identity/status/actor fields are rejected.

| Method / path | Use |
| --- | --- |
| GET /overview?date=YYYY-MM-DD | Week, actual period, entries, missing dates, submission, history and total count |
| GET /days/:date | Own historical daily entry |
| POST /days/:date | Create one daily entry |
| PUT /days/:date | Update own editable entry using version |
| POST /weeks/:monday/submit | Submit/resubmit using current weekly version (0 for first submit) |
| POST /mentor-link | Email a rotated capability to the verified stored Mentor |
| GET /mentor/weeks | Scope-bound Mentor weekly list |
| GET /mentor/weeks/:id | Entire weekly snapshot and history |
| POST /mentor/weeks/:id/review | Versioned `reviewed` or `revision_requested` with feedback |

Structured errors include INVALID_DATE, FUTURE_DATE, OUTSIDE_INTERNSHIP, INTERNSHIP_PERIOD_REQUIRED, VERIFIED_MENTOR_REQUIRED, MISSING_DAYS, LOG_FROZEN, STALE_VERSION, ALREADY_SUBMITTED, REVIEW_CONFLICT and token/scope failures. Missing migration 018 gives explicit 503 without running startup migrations. Database/provider errors return safe messages without SQL, credentials or tokens. Private responses use no-store. UI inserts user text with textContent and clears private Student data on expired authorization.

## Files in this task

New backend: `src/db/migrations/018_add_internship_logs.js`; `src/models/internshipDailyLog.model.js`, `internshipWeek.model.js`, `internshipWeekEvent.model.js`, `internshipReviewToken.model.js`; `src/services/internshipLogRules.js`, `internshipLog.service.js`; `src/routes/internshipLogs.routes.js`; `test/internshipLogRules.test.js`, `internshipLogs.database.test.js`.

Modified backend: `src/app.js`, `src/services/email.service.js`, `src/controllers/mentor.controller.js` (explicit evidence-preserving deletion conflict); existing isolated `test/runTeacherAdvisorAcceptance.ps1`, `test/runStaffBrowserAcceptance.ps1`, `scripts/runDisposableStaffBrowserAcceptance.js`; migration inventory assertions in `test/roleWorkflow.database.test.js` and `test/staffDocuments.database.test.js`. Existing Company Response/Placement source changes in the working tree belong to prior tasks and were preserved.

New frontend: `src/api/internshipLogs.api.js`; `src/pages/studentInternshipLog.js`, `mentorInternshipReview.js`, `internshipLogView.js`; `src/styles/internship_log.css`; `test/studentInternshipLog.test.js`, `internshipLogView.test.js`.

Modified frontend: `src/pages/student_coop.js`, `mentor.js`; `src/student_coop/student_coop.html`, `src/mentor_coop/mentor_verify_user.html`. Removed only the mock Daily form/handlers; existing unrelated menus and sections remain. Documentation: this report, HANDOFF and README.

## Verification evidence

- Final dedicated PostgreSQL suite: **21 PASS / 0 FAIL / 0 SKIP**, including one parent and 20 scenarios. Tests also cover real foreign-Mentor capability isolation, expiry/live verification changes, duplicate/stale/concurrent writes, partial weeks, immutable resubmission snapshots, student read-back, injected audit failure rollback and email failure.
- Rules: **4 PASS / 0 FAIL / 0 SKIP**; new frontend handlers/views: **9 PASS / 0 FAIL / 0 SKIP**. HTML-derived DOM tests are not browser rendering claims.
- Full disposable regression: **Backend 293 PASS / 0 FAIL / 0 SKIP; Frontend 184 PASS / 0 FAIL / 1 existing Student-prerequisite browser SKIP**. The full backend worker collected the initial 18 Daily SQL scenarios (+ parent); the final dedicated suite adds two scenarios for real foreign-Mentor scope and injected audit rollback, with all 20 (+ parent) passing. These suites overlap; do not add their counts. Frontend includes the existing guarded UI-to-PostgreSQL tests and all nine new handler/view tests. Standalone frontend without its disposable SQL adapter: 174 PASS / 0 FAIL / 2 SKIP; the integrated run is authoritative.
- Real **Chrome 154.0.8037.98**, production Express API and Vite: **Daily/Mentor 12 PASS / 0 FAIL / 0 SKIP** (parent + 11 scenarios). Existing verification, real Student password login, daily create/edit, explicit leave/holiday, missing-day enforcement, weekly confirmation/freeze, Mentor revision, Student correction/resubmission/original snapshot, Mentor final confirmation/name/date, Student feedback read-back, desktop/mobile and actual offline recovery pass. No unexpected application runtime/console/API errors.
- Reused runner's existing Company Response/Placement Staff Chrome regression: **12 PASS / 0 FAIL / 0 SKIP**. Its verification remains separate from the Daily acceptance.
- The related final Mentor deletion guard/capability cascade was verified by the final dedicated PostgreSQL and Daily Chrome runs after the full regression. Deleting a Mentor before weekly evidence invalidates capabilities; deleting a referenced Mentor returns structured 409 and keeps the history.
- Initial browser attempts exposed runner timing errors: actions targeted an old document or a still-hidden detail during navigation/save refresh. Waiting for the matching document loader, completed save and visible details fixed the runner. Final results above come from fresh disposable databases, without skipped dependent scenarios. Screenshots were inspected visually; Mentor loading/result styles and description reflect weekly review.
- Final frontend build: **13 HTML entries / 110 modules PASS**; JavaScript syntax **198 files PASS**; updated PowerShell runners **0 parser errors**; `git diff --check` PASS. All invocation-owned containers/networks and temporary browser profiles are cleaned; Docker Desktop may remain running.

Commands (only disposable environments):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/runTeacherAdvisorAcceptance.ps1 -FullBackend
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/runTeacherAdvisorAcceptance.ps1 -BackendOnly -FocusedBackendTests internshipLogs.database.test.js
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/runStaffBrowserAcceptance.ps1 -DailyLog
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/runStaffBrowserAcceptance.ps1
```

Safe logs: `logs/daily-log-full-regression-20261008.log`, `daily-log-postgresql-final-20261008.log`, `daily-log-real-browser-final-20261008.log`, `daily-log-staff-browser-regression-20261008.log`, `daily-log-build-20261008.log`. Screenshots: `logs/daily-log-browser-artifacts-20261008/student-daily-desktop.png`, `student-daily-mobile.png`, `mentor-week-mobile.png`. No capabilities/passwords are retained in evidence.

## Limits and next work

Persistent migration 018 and real SMTP delivery are not accepted or performed here. Student logging requires exactly one approved request with reliable start/end dates; missing/ambiguous periods produce an explicit recoverable prerequisite message rather than guessing. Every applicable date, including weekends, needs a working entry or explicit nonworking reason. Draft entries must be complete to save; there is no partial-text draft autosave. Per-day Mentor comments are optional in the task and are not implemented; feedback applies to the complete week. Capability lifetime is seven days and resending rotates the previous link. A new Mentor cannot review submissions addressed to an old Mentor; reassignment policy requires a separate business decision. Official PDF, final scores, supervision and company transfer remain outside scope.

Next recommended work: separately authorized persistent rollout of pending 017/018, configuration and acceptance of Mentor email delivery with intended recipients, then academic supervision requirements. No existing Local database was migrated or reset, and no existing business records or student_files were changed.
