# FITM-INTERN PROJECT HANDOFF

## CURRENT HANDOFF — Staff Coop Activity Calendar — 2026-10-09

**AUTHORITATIVE FOR THE CURRENT WORKING TREE. Requirement 2.3.2 (6) implemented and verified on disposable PostgreSQL and real Chrome. No existing Local/staging/production database schema or data modified. Migration 021 remains pending for persistent rollout. No commit, push, PR or deployment. Previous handoff sections below are preserved as historical evidence.**

Staff's existing dashboard now includes **ปฏิทินกิจกรรม** alongside the existing document menu. It offers a Bangkok monthly calendar, chronological paginated list, search/category/status/date filters, creation/editing, explicit draft/publication, detail/history and cancellation with a required private reason. Forms reuse shared confirmation/toast/loading utilities. Native alert/confirm are not used. Students have a separate read-only calendar panel in their existing dashboard. Previously published canceled activities remain visible as canceled; never-published drafts/canceled drafts, internal Staff notes, actor IDs and history are excluded from Student APIs. There is no automatic supervision-calendar merge or exposure of private Student information.

Migration **021_add_coop_activities.js** adds only `coop_activities` and `coop_activity_history`. Models associate with existing DepartmentStaff identities. Transactional DDL, protected identities/version transitions, restrictive FKs, immutable audit triggers, active duplicate uniqueness and refusal to roll back populated tables preserve evidence. The full isolated ledger is **22 executed / 0 pending** including 007a. Existing Local was not inspected or migrated; its older reported through-016 ledger is historical. Pending 017–021 rollout needs separate authorization and backup/schema review.

API namespace: `/api/coop-activities`. Staff: `GET/POST /staff`, `GET/PUT /staff/:id`, `POST /staff/:id/cancel`. Student: `GET /student`, `GET /student/:id`. Query fields are search/category/status/from/to/limit/offset; date overlap supports activities spanning month boundaries. Staff use the existing live active Staff/JWT guard; Student reads validate the live account against JWT identity. Write transactions recheck/lock the Staff actor, reject stale versions and commit the activity plus named full snapshot together. Durable creation keys provide safe identical retries; same key/different payload or actor conflicts. A normalized identical title/start/end cannot create two active activities even across Staff accounts. Concurrent edit/cancel permits one current version. Creation/publication identities cannot be supplied by the browser. https meeting links cannot contain credentials; all user content renders as literal text.

Required activity fields: title, descriptive category, start/end time and draft/published status. Optional public description/location/meeting link are separate from private Staff notes. Edit/cancel reasons are Staff-only. Timezone is Asia/Bangkok (+07:00); invalid/impossible dates and nonpositive intervals reject. Publication cannot silently revert to draft; cancel preserves history. Categories orientation/training/presentation/other are descriptive choices, not mandated academic policies. Existing Staff records provide no department/academic-term/cohort relationship; no policy or scope was invented.

**Actual verification:** full disposable Backend **357 PASS / 0 FAIL / 0 SKIP**; Frontend with actual SQL bridges **215 PASS / 0 FAIL / 1 existing Student-prerequisite browser SKIP**. Calendar SQL **13 PASS / 0 FAIL / 0 SKIP**; calendar frontend handlers/date views **10 PASS**; real Chrome 154.0.8037.98 calendar **13 PASS**, Staff document/Company Response/Placement regression **12 PASS**, supervision scheduling/results regression **24 PASS**, all with **0 FAIL / 0 SKIP**. Build **13 HTML entries / 121 modules PASS**; JavaScript syntax **238 PASS**; PowerShell parser **0 errors**; diff check PASS. Counts overlap and must not be summed. Final evidence is linked in the next-day review.

Fixed during acceptance: older pending-migration/ledger test expectations now include 021; browser automation waits for DOMContentLoaded/module readiness and month-refresh completion; disposable API output is drained and diagnostics redact generated secrets; calendar authorization failure clears private DOM/form state. Staff mobile header now uses content height and a readable logout control; compact event buttons retain full accessible labels and details/list views.

Remaining limits: persistent migration/deployment acceptance is pending. Month views load all matching pages and are intended for ordinary departmental activity volumes; unusually large months may need a future server calendar summary/virtualized view. No notifications, attendance, academic cohort policy, recurring-event engine or calendar export was requested/added. Real SMTP, official PDF/rubric blockers and previous unrelated incomplete requirements remain as recorded in the complete 56-row README matrix. Historical NLP defects were not rerun or fixed.

Next recommended independent feature: existing Staff eligible-request cancellation controls and Chrome acceptance — **2.3.2 (2)**, reusing the guarded backend instead of inventing approval policy. This continuation finishes the calendar; it does not begin another feature. Next session should read this section, README matrix, review and current diff; preserve all current/untracked work, use only disposable test databases and never run pending persistent migrations without separate authorization.

## Previous HANDOFF — Supervision Visit Results 1 & 2

## CURRENT HANDOFF — Supervision Visit Results 1 & 2

**2026-10-08 Asia/Bangkok — authoritative result-recording continuation.** Requirements **2.3.3.1 (7)/(9)** implemented and verified on disposable PostgreSQL and real Chrome. Full Backend **344 PASS / 0 FAIL / 0 SKIP**; Frontend **205 PASS / 0 FAIL / 1 existing SKIP**. Result SQL **21 PASS / 0 FAIL / 0 SKIP**; Chrome results + scheduling **24 PASS / 0 FAIL / 0 SKIP**; Daily/Mentor and Staff Chrome **12 PASS each**. Persistent Local/staging/production databases and existing private files were not modified. No commit/push/PR/deploy.

1. **Latest implementation:** reuse confirmed migration-019 appointments for both visits. Teacher selects its current project advisee, opens the saved appointment, records actual visit date/outcome/issues/recommendations, uploads/replaces two private photos, saves incomplete drafts, reviews persisted data and finalizes. Completed results are immutable. No official rubric, numeric grades, extra approval stage or PDF wording.
2. **New files:** migration `020_add_supervision_results.js`; models `supervisionResult.model.js`, `supervisionImage.model.js`, `supervisionResultRevision.model.js`; services `supervisionResult.service.js` / `supervisionResultRules.js`; tests `supervisionResults.database.test.js` / `supervisionResultRules.test.js`; browser scenarios `supervisionResultBrowserScenarios.js`; frontend `supervisionResult.js` / `supervisionResult.test.js`. [Review report](docs/NEXT_DAY_DEVELOPMENT_REVIEW.md) records the complete changed-file inventory, including modified inherited files. Preserve all pre-existing uncommitted Company Response/Daily Log/scheduling work.
3. **Database:** next available migration was checked before creating 020. Adds only `supervision_results`, `supervision_images`, `supervision_result_revisions` and related functions/triggers. One result per appointment; exact two-image completed CHECK; composite image/appointment FKs; immutable identities/history/evidence; version transitions and confirmed canonical appointment snapshot validation. A separate trigger protects result-bearing appointments without rewriting migration 019. Empty rollback supported; populated rollback refused. Startup never migrates or syncs.
4. **Teacher APIs:** under `/api/supervision`, `GET/PUT /teacher/students/:id/appointments/:appointment/visits/:visit/result`, `POST .../complete`, authenticated `GET .../images/:image`. PUT supports JSON descriptive drafts or atomic multipart fields plus `image_1`/`image_2`. Initial `version=0`, subsequent current result version, and current `appointment_version` are required. Completion accepts only current result version. Missing 020 returns actionable 503.
5. **Student APIs/UI:** own `GET /student/appointments/:appointment/visits/:visit/result` and `.../images/:image` expose completed results/current images only. Drafts and historical Teacher evidence remain private. Teacher reads retained revisions/old photos. Student gets read-only controls in its existing appointment cards; no Mentor result-edit permissions.
6. **Frontend:** result buttons/forms integrated into existing Teacher supervision cards, preserving sidebar/menus and scheduling. Shared confirmation/toast/loading utilities, local Blob previews, authenticated saved-image Blob retrieval, replacement/readback, revision expansion, duplicate-submit prevention, stale reload, auth cleanup, offline recovery and 390px mobile layout. Completed form is hidden and readonly persisted result shown. Blob URLs are revoked on reload/disposal/logout.
7. **Image security:** dedicated private Student/coop/supervision/appointment directory under `STORAGE_ROOT`; PNG/JPEG only, 5 MB each, extension/MIME/signature/actual-size validation. Random immutable UUID filenames, exclusive `wx` writes, root/owner/real-path checks, no raw paths/public URLs. API uses authenticated retrieval, no-store/nosniff and restrictive CSP. Validated uploads and result/revision rows commit in one transaction; pre-commit failures remove only staged files, while previous committed evidence is retained. Browser tests use an exclusively created temporary storage directory, not existing storage or `student_files`.
8. **Authorization/business rules:** live active Teacher, current `coop_advisor_teacher_id`, saved appointment Teacher/Student/visit and current eligible placement are checked server-side. Class advisor/Head does not bypass ownership. Original/substitute company/Mentor context comes from the frozen confirmed appointment. Result creation requires confirmed appointment; incomplete drafts are allowed; completion requires date/outcome/exact two existing images. Actor → Student → request → appointment → result locks plus versions serialize creation/edit/completion and scheduling races. Starting any result freezes appointment rescheduling. Placement cancellation blocks further writes/completion but preserves readable records. Advisor changes revoke Teacher access; owning Student retains completed reads.
9. **Tests:** full disposable Backend **344 PASS / 0 FAIL / 0 SKIP**; Frontend with SQL bridges **205 PASS / 0 FAIL / 1 existing Student-prerequisite browser SKIP**. Result SQL **21 PASS**, rules **3 PASS**, frontend result **11 PASS**. Build **13 HTML / 117 modules PASS**, JS syntax **225 files PASS**, PowerShell parser **0 errors**, final diff check PASS. README retains **56 unique official requirements**. Historical Backend 320 / Frontend 194 (+1 skip) belong to the previous scheduling session. The final canonical-UUID guard was added after full Backend completed and verified in the final dedicated 21-PASS SQL run, including post-commit retention.
10. **PostgreSQL acceptance:** migration absent-schema/up/down/reapply/injected-DDL rollback, real production HTTP/authorization, both visits, duplicate/concurrent/stale writes, incomplete/final results, MIME/signature/size limits, authenticated current/history image retrieval, replacements, injected-audit file/row rollback, cancellation/rescheduling races, direct CHECK/composite-FK/history guards, populated rollback refusal, post-commit response failure retention, uppercase UUID canonicalization and unrelated StudentFile fingerprint preservation all executed. **21 migrations executed / 0 pending** only on guarded disposable databases.
11. **Chrome acceptance:** Chrome 154.0.8037.98, real password login/production Express/Vite/PostgreSQL, original/substitute confirmation, scheduling regression, both result drafts/completion, local/saved/history image decoding, replacement/refresh, Student readonly access, private-image denial, desktop/mobile draft and completed layouts and offline recovery. Combined **24 PASS** = 12 scheduling + 11 result scenarios + parent. Daily/Mentor and Staff regressions **12 PASS each**. Final visible-fixture screenshots were inspected; draft and completed mobile layouts fit 390px. A navigation timeout during concurrent test load was resolved by bounded 45-second fresh-document waits and successful final reruns; it was a browser-runner timing failure.
12. **Local limitations / remaining work:** Local was not inspected/migrated/reset; historical ledger through 016 only. Persistent 017–020 rollout needs separate authorization and backup/schema review. Real intended-recipient SMTP remains pending. Official PDF requirements **(8)/(10) remain BLOCKED** until approved templates/signature policy are supplied. Completed-result correction, appointment cancellation and Mentor reassignment need explicit policy; no invented transitions. Crash/power-loss storage reconciliation and production backup/restore acceptance remain operational work; routine transaction rollback cleanup is tested. Academic assessments wait for supplied rubrics/maxima; compiled logbook/OAuth/chatbot/admin/Company workflows remain as the README 56-row matrix records.
13. **Next recommended task:** independent Staff activity calendar **2.3.2 (6)**. Do not begin another feature before finalizing this session's verification/docs. Next session: read this section/README/report/current diff, preserve work, use guarded disposable runners, record actual results, and never run pending migrations against persistent Local or invent PDF/rubric content.

Evidence: `logs/supervision-results-sql-final-20261008.log`, `supervision-results-chrome-final-20261008.log`, `supervision-results-daily-chrome-20261008.log`, `supervision-results-staff-chrome-20261008.log`, `supervision-results-full-regression-20261008.log`, `supervision-results-focused-final-20261008.log`, `supervision-results-build-final-20261008.log`, `supervision-results-syntax-final-20261008.log`, `supervision-results-powershell-parser-20261008.log`, `supervision-results-diff-check-final-20261008.log`. Screenshots: `logs/supervision-results-browser-artifacts-20261008/`. Counts overlap; do not sum suites. Previous sections below are historical evidence.

## Previous HANDOFF — Supervision Scheduling Session

**2026-10-08 Asia/Bangkok — authoritative supervision scheduling continuation.** Supersedes earlier stop/next-task suggestions while preserving their historical evidence. Scheduling is implemented and verified: final Backend **320 PASS / 0 FAIL / 0 SKIP**, Frontend **194 PASS / 0 FAIL / 1 existing SKIP**, supervision PostgreSQL **20 PASS**, real Chrome supervision **13 PASS / 0 FAIL / 0 SKIP**. No existing Local/staging/production database was changed. No commit, push, PR or deployment.

1. **Working tree:** audited `git status`/`git diff` before editing. The checkout already contained 23 modified tracked files and prior untracked Company Response/Daily Log implementation and reports. All inherited work is retained. Session changes are documented in [NEXT_DAY_DEVELOPMENT_REVIEW](docs/NEXT_DAY_DEVELOPMENT_REVIEW.md); do not reset/clean this checkout.
2. **Architecture:** existing Vite multipage HTML/CSS/JavaScript + Express/Sequelize/PostgreSQL/Umzug; FastAPI/PyThaiNLP and private storage preserved. No new runtime dependency. Shared `main.css`, Teacher/Student/Mentor layouts, JWT role guards, scoped email tokens, toast/loading/confirmation reused.
3. **New features:** correct project/supervision advisor schedules visits 1 and 2 for an approved Student/company/work period; future edits/reschedules require current version and reason, reset confirmation and keep immutable previous versions. Verified original Mentor information is checked before scheduling. Teacher can nominate a per-appointment substitute with personal/contact fields and reason. Original/substitute recipients explicitly confirm their own identity and appointment. Student reads current appointments and all versions/history.
4. **Preserved features:** separate Class/Project advisor IDs; canonical Class → Head request approval; Staff document/Company Response/Placement rules and frozen snapshots; Daily Logs created daily and sent as whole weekly batches for Mentor review; private Book/Poster/Resume behavior. This phase does not implement visit attendance, result/photos, official PDF, logbook compilation or academic grading.
5. **Migrations:** 20 files, 001–019 including 007a. New `019_add_supervision_appointments.js`; previous migrations unchanged. Final disposable ledger **20 executed / 0 pending**. 019 empty UP/DOWN/reapply, partial-DDL rollback and populated rollback refusal passed. Existing Local ledger was NOT inspected this session; historical 17 through 016 is not a current count. 017/018/019 persistent rollout remains pending. Staging/production were not accessed.
6. **Schema:** `supervision_appointments` (request + visit UNIQUE, versions, Bangkok time, status/confirmation CHECK), `supervision_events` (immutable named actions/full version snapshots, appointment + version UNIQUE), `supervision_tokens` (only SHA-256 token hashes, appointment/version/expiry/revocation/consumption; one live token per appointment). FKs RESTRICT historical identities; composite request/student and Mentor/student ownership enforced through new indexes/FKs. Transition/history triggers reject identity changes or history tampering. Populated rollback is refused; DDL is transactional. No StudentFile schema, file or persistent fingerprint operations.
7. **API:** new `/api/supervision`: GET `/teacher/students?offset&limit`, GET `/teacher/students/:id`, POST/PUT `/teacher/students/:id/visits/:visit`, POST `/teacher/students/:id/appointments/:appointment/link`, GET `/student`, GET `/mentor/appointment`, POST `/mentor/confirm`. Private responses use no-store. Missing 019 returns structured 503. Email delivery occurs after transaction commit; `email_sent=false` truthfully preserves saved appointments and exposes resend recovery, without exposing tokens to Teacher/Student.
8. **Frontend:** Teacher dashboard gains an additional supervision section/menu while retaining Class/Project request sections. Student overview gains read-only appointments/history and reload. Existing Mentor page routes `#appointment_token=...` to appointment-only identity confirmation, then removes the fragment. Existing verification and weekly review modes remain separate. New reusable appointment/history view and responsive CSS.
9. **Authorization/business invariants:** live active Teacher and `students.coop_advisor_teacher_id` are required; Class advisor and Head flags do not grant supervision ownership. Head authorization still uses live backend `is_department_head`. One unambiguous approved/document-issued/in-progress request with real dates/company is required. Original Mentor must be verified with the current verification stamp. Mutation locks actor → Student → Mentor → request → appointment → token; duplicate visit/concurrent/stale writes reject without duplicate evidence. Substitute identity is an appointment snapshot, never a replacement of the global Mentor. Historical appointment owner remains protected after relationship changes. No automatic approval/attendance confirmation.
10. **Automated tests:** final full disposable Backend **320 PASS / 0 FAIL / 0 SKIP**; Frontend with actual SQL bridges **194 PASS / 0 FAIL / 1 existing Student-prerequisite browser SKIP**. Included supervision rules **5 PASS**, UI/history tests **10 PASS**. Production build **13 HTML entries / 116 modules PASS**, JS syntax **214 PASS**, PowerShell parser **0 errors**, diff check PASS. Initial full Backend 318 PASS / 2 FAIL was solely a pending-migration expectation and its parent; corrected to include 019 and the full suites rerun successfully. Optional runner `-FastExit` uses the inspected Node `--test-force-exit` flag after completed tests/awaited cleanup; default behavior remains unchanged. API timestamp naming (`createdAt` versus `created_at`) and long-select mobile overflow were fixed; strict 390px browser assertions and saved screenshot confirm layout. Earlier SQL fixture omissions/error matching and fresh-email-link navigation were test fixes.
11. **PostgreSQL acceptance:** supervision **20 PASS / 0 FAIL / 0 SKIP** (19 scenarios + parent), included in the final full Backend suite. Migration rollback/reapply/atomic failure; real HTTP authorization/ownership; visit 1/2; originals/substitutes; race/stale writes; token consumption/expiry/rotation; live relationship invalidation; immutable snapshots; injected audit rollback; FK/UNIQUE/CHECK/triggers including composite Mentor ownership; missing-schema 503, protected Mentor deletion and three-role read-back all pass. All targets have explicit disposable names/markers; runner mounts checkout read-only and uses labeled tmpfs databases. No persistent fingerprint/storage work.
12. **Real Chrome:** Chrome 154.0.8037.98 supervision **13 PASS / 0 FAIL / 0 SKIP**, real password login/API/PostgreSQL/UI, both visits, original profile verification/appointment identity confirmation, substitute confirmation, duplicate error, reschedule/history, Student read-back, Teacher desktop/mobile, Mentor mobile, revoked-link and real offline recovery, no unexpected runtime errors. Existing Daily/Mentor Chrome **12 PASS / 0 FAIL / 0 SKIP** and Staff Chrome **12 PASS / 0 FAIL / 0 SKIP** reran successfully. Screenshots in `logs/supervision-browser-artifacts-20261008/` contain fixture data only; final Teacher mobile image is 390px wide.
13. **Known limitations:** real intended-recipient SMTP/inbox not exercised (disabled for fixtures); links expire after seven days or appointment time and are single-use per version. Incorrect identity requires Teacher nomination correction or original Mentor re-verification and reissue. Unavailable/ambiguous placement or absent verified Mentor explicitly blocks scheduling. Existing appointments at/past time cannot be rescheduled through this feature. Results/photos/PDF/scoring and calendar integration remain unimplemented. Current persistent counts unknown. Historical NLP defects were not rerun or fixed.
14. **Pending requirements:** exhaustive 56-row official-scope matrix is in README, including partial logbook, incomplete account/admin/search/Company/OAuth/chatbot flows and rubric/template blockers. Final scoring must use Mentor weekly 20%, Mentor final 30%, Book 10%, Poster 5%, overall work/content 25%, exam 10% with chair + two committee members; no maxima or member weighting invented.
15. **Next recommended task:** supervision visit results 1/2 with exactly two secure private photos and editable authorized history — 2.3.3.1 (7)/(9), once this scheduling slice's tests remain stable. Official PDFs wait for approved templates. Persistent rollout requires separate authorization and backup/schema review.
16. **Next Codex session instructions:** read this top section, README matrix, review report and current diff first. Preserve all uncommitted work and accepted histories/document snapshots. Do not reuse consumed/expired verification or appointment tokens; weekly review capabilities cannot confirm appointments. Do not run pending migrations against persistent Local, create real faculty/student accounts, touch unrelated StudentFiles, invent rubrics/templates, commit/push/PR/deploy. Use guarded disposable runners below and record actual results; historical totals are not new PASS claims.

Authoritative session logs: `logs/supervision-full-regression-final-20261008.log`, `supervision-chrome-20261008.log`, `supervision-daily-chrome-regression-20261008.log`, `supervision-staff-chrome-regression-20261008.log`, `supervision-build-final-20261008.log`, `supervision-syntax-20261008.log`. Initial failed full run remains in `supervision-full-regression-20261008.log`; it does not supersede the final run. Review report has commands and final evidence. Older sections below are historical checkpoints, not conflicting current instructions.

## Daily Internship Log / Weekly Mentor Review — 2026-10-08

**CURRENT AUTHORITATIVE — SOURCE IMPLEMENTED, DISPOSABLE POSTGRESQL AND REAL CHROME VERIFIED. NO EXISTING LOCAL/STAGING/PRODUCTION DATABASE MODIFIED. MIGRATION 018 RAN ONLY IN OWNED DISPOSABLE DATABASES; PERSISTENT 017/018 ROLLOUT REMAINS SEPARATELY AUTHORIZED WORK.**

The existing Student Daily menu now saves one versioned working/nonworking record per Bangkok date with all reference-form fields, completion/missing dates, history and feedback. Explicit holiday/leave reasons require no invented work. Monday–Sunday submissions require every applicable internship date, handle first/last partial weeks, show saved entries before confirmation, serialize concurrent writes and freeze submitted/reviewed entries. Whole-week revision requests allow controlled correction/resubmission while keeping original immutable snapshots and review history. No daily Mentor approval, attendance penalty, numeric score or official PDF was added.

Reused Student JWT, live current Mentor verification/association, reliable approved request dates, Sequelize/Umzug, shared feedback/CSS and existing Mentor page. Verification tokens retain their consumed single-use behavior. Separate hash-only seven-day review capabilities are bound to the verified Mentor/Student and verification timestamp, rotated through server email delivery, validated for expiry/revocation/current relationship, and never returned to Students. Mentor reviews the entire weekly snapshot with feedback/name/date; Student reads the result back. SMTP failure preserves committed submissions and is reported truthfully with resend. Browser tests explicitly disable SMTP and use only fixture recipients.

Migration 018 adds only internship_daily_logs, internship_weeks, internship_week_events and internship_review_tokens, with FKs/uniqueness/checks, freeze/transition/immutable-history triggers, transactional DDL and populated rollback refusal. Startup does not migrate. New API namespace: /api/internship-logs. Pure capabilities cascade on deletion before evidence exists; Mentor deletion with weekly evidence returns explicit 409 and preserves history. This final related guard passed dedicated SQL and real Chrome after the full regression run. Existing Company Response/Placement rules, canonical Class/Head request approval, both advisor IDs and student_files logic/data remain unchanged.

**Actual verification:** full disposable Backend **293 PASS / 0 FAIL / 0 SKIP**; Frontend **184 PASS / 0 FAIL / 1 existing prerequisite-browser SKIP**; final dedicated Daily PostgreSQL **21 PASS / 0 FAIL / 0 SKIP** (20 scenarios + parent); new rules **4 PASS** and frontend handlers/views **9 PASS**; real Chrome Daily/Mentor **12 PASS / 0 FAIL / 0 SKIP** and existing Staff Chrome regression **12 PASS / 0 FAIL / 0 SKIP**. Full backend collected the initial 18 Daily SQL scenarios; two added foreign-Mentor/transactional-audit cases passed in the final dedicated 20-scenario suite. Do not sum overlapping counts. Build **13 HTML entries / 110 modules PASS**; JS syntax **198 PASS**; PowerShell parser **0 errors**; diff check PASS.

Chrome 154.0.8037.98 verified real login/verification, daily create/edit/nonworking/missing states, weekly submit/freeze/revision/resubmit, immutable snapshots, Mentor confirmation and Student feedback, mobile/desktop and real offline recovery. Initial runner navigation/save timing errors were corrected; final runs have no unexpected runtime errors. All owned disposable containers/networks and exclusive browser profiles cleaned. No real emails, persistent migrations, existing-record deletions, commit/push/PR/deploy.

[Full implementation, APIs, files, evidence and limits](docs/DAILY_LOG_WEEKLY_MENTOR_ACCEPTANCE.md). Safe final logs: logs/daily-log-full-regression-20261008.log, logs/daily-log-postgresql-final-20261008.log, logs/daily-log-real-browser-final-20261008.log, logs/daily-log-staff-browser-regression-20261008.log and logs/daily-log-build-20261008.log. Screenshots: logs/daily-log-browser-artifacts-20261008/.

Next: separately authorized pending 017/018 persistent rollout and intended-recipient Mentor SMTP acceptance. Missing/ambiguous work periods remain an explicit prerequisite; partial-text autosave, per-day comments, Mentor reassignment policy and unrelated supervision/scoring/PDF features remain outside this phase. Stop after reporting.

## PostgreSQL / Real Chrome Verification — 2026-10-08

**CURRENT AUTHORITATIVE — COMPANY RESPONSE → PLACEMENT DEVELOPMENT WORKFLOW VERIFIED ON DISPOSABLE POSTGRESQL AND REAL CHROME. NO EXISTING DATABASE MODIFIED; MIGRATION 017 EXECUTED ONLY ON DISPOSABLE DATABASES.** Supersedes the earlier unavailable-environment/NOT RUN checkpoint below; no new feature/UI redesign or production rollout.

Started the installed Docker Desktop engine and used cached PostgreSQL 16 with guarded labeled tmpfs containers. Existing internal-network/read-only-workspace full regression runner passed. Added a real browser runner with generated credentials, exact loopback/disposable DB/marker checks, production Express API/Vite UI and an exclusive Chrome profile. Chrome **154.0.8037.98** verified login, queue, Cooperation Letter, response acceptance/rejection/corrections/history, Placement draft/edit/generate/regenerate/frozen snapshots, preview, actual downloaded HTML hash, native beforeprint, desktop/mobile and loading/error recovery. No unexpected runtime/application console errors; expected invalid-date/offline errors were exercised deliberately. Physical printer/interactive print dialog and official PDF layout are not accepted by headless tests.

Migration 017 UP/DOWN/reapply/partial DDL rollback, real FK/UNIQUE/CHECK violations, immutable history and populated rollback refusal passed. SQL concurrent corrections and revocation-versus-placement race preserve one current version/audit and consistent accepted/placement evidence. Cooperation Letter and canonical Class/Head approval/authorization regressions pass. No production business-code fixes were needed; new runner's Windows Docker port quoting was corrected.

**Actual results:** backend full **268 PASS / 0 FAIL / 0 SKIP**; final PostgreSQL document suite **25 PASS / 0 FAIL / 0 SKIP**; frontend full **175 PASS / 0 FAIL / 1 existing Student-browser SKIP**; real Staff Chrome **12 PASS / 0 FAIL / 0 SKIP**. Full worker collected 22 Staff subtests; two SQL cases added during verification then passed in the final targeted 24-subtest suite (+ parent), with no coverage gap. Do not sum overlapping suites. Build **13 pages / 105 modules PASS**; JS syntax **182 PASS**; PowerShell parser **0 errors**; diff check PASS.

All owned containers/networks and temporary browser profiles cleaned; read-only label enumeration empty. No persistent Local/staging/production migrations or business-data changes, no account provisioning, no student_files edits outside disposable test fixtures, no commit/push/PR/deploy. Persistent environment counts were not claimed or modified.

[Full evidence, coverage comparison, file list and limits](docs/COMPANY_RESPONSE_POSTGRES_BROWSER_VERIFICATION.md). Safe logs: `logs/company-response-integration-20261008.log`, `logs/company-response-postgresql-targeted-20261008.log`, `logs/company-response-real-browser-20261008.log`, `logs/company-response-verified-build-20261008.log`. Screenshots/downloads: `logs/company-response-browser-artifacts-20261008/`. **Ready for the next development phase**; official templates/PDF, cancellation/reissuance and separately authorized persistent rollout remain future work. Stop after reporting.

## Company Response → Placement Letter — 2026-10-08

**CURRENT AUTHORITATIVE — IMPLEMENTED IN SOURCE; POSTGRESQL INTEGRATION AND REAL BROWSER NOT RUN. MIGRATION 017 CREATED BUT NOT EXECUTED. NO EXISTING DATABASE MODIFIED.** This checkpoint supersedes the earlier unconfirmed Placement prerequisite: the user explicitly requires Company Acceptance after completed Cooperation Letter processing.

Extended the existing Staff document architecture with `company_responses`/immutable `company_response_history`, verified Staff actors, response date/note, optimistic corrections with reasons and atomic audit. Migration 017 adds only two new tables, constraints/FKs and new-table triggers. Response evidence references a generated Cooperation Letter revision for the same request. Staff queue/detail and Cooperation Letter processing remain compatible with schema 016; new features fail explicitly until 017 is installed through a separately authorized rollout.

Placement draft/edit/generate/regenerate now require the approved request, completed Cooperation Letter and persisted accepted Company Response. Development HTML previews/download/print reuse the existing frozen document snapshots, versions and revision audit. Snapshot includes response ID/version/actor/date and Cooperation Letter ID/version/hash. Response corrections are allowed before placement exists; **any placement draft/generated row locks all corrections with HTTP 409**, preserving acceptance/document consistency. No official PDF/template, request issuance transition or document cancellation workflow was invented.

Preserved Student → Class Advisor → Head approval, live `is_department_head`, both advisor IDs, existing Staff guards and navigation. No StudentFile/storage/fingerprint work; no actual faculty/account/database changes; no commit/push/PR/deploy.

Environment: Node and installed dependencies available. Docker Desktop Linux API unavailable; configured backend PostgreSQL refused connections. **Current persistent migration/table/Teacher/Head counts could not be verified**; previous 17/23/23/1 counts below remain historical. No migrations ran against any database in this continuation. Isolated SQL tests were added but not run; HTTP tests use transactional model doubles, not real SQL.

Final verification: **Backend 127 PASS / 0 FAIL / 13 SKIP; Frontend 165 PASS / 0 FAIL / 2 SKIP**. New targeted tests: backend 19 / frontend 9 PASS. Backend skips are unavailable opt-in database tests; frontend skips are browser and disposable SQL acceptance. Build **13 pages / 105 modules PASS**; `node --check` **181 JS files PASS**, `git diff --check` PASS. Real browser: NOT RUN. Counts are actual results and differ from the prior fully provisioned integration baseline.

Details and file/API inventory: [Company Response / Placement acceptance](docs/COMPANY_RESPONSE_PLACEMENT_ACCEPTANCE.md). Logs: `logs/company-response-backend-20261008.log`, `logs/company-response-frontend-20261008.log`, `logs/company-response-build-20261008.log`. Next prerequisite is running the guarded disposable PostgreSQL suite and real browser checklist when the environment is ready. Recommended next feature after acceptance: approved official templates/PDF and explicit cancellation/reissuance rules.

## Department Staff Document Processing - 2026-10-07

**CURRENT AUTHORITATIVE - Asia/Bangkok. COOPERATION LETTER DEVELOPMENT FLOW: AUTOMATED + LOCAL HTTP/SQL PASS. PLACEMENT LETTER: BLOCKED (UNCONFIRMED BUSINESS PREREQUISITES). REAL BROWSER: NOT RUN. OFFICIAL TEMPLATE/PDF ISSUANCE: PENDING.** Supersedes earlier Staff-not-started and Local 16-migration/21-table descriptions. Staff remains outside request approval; no next task, commit/push/deploy.

### Audit and business boundary

- Read current HANDOFF/README/Compose, Student/Company/Staff/request/review/file models, migrations 001–015 including 007a, auth/routes/controllers/services, storage/project file patterns, shared feedback/frontend/tests. Searched the repository for document/cooperation/placement/letter/PDF/print/staff/company response and Thai letter terms. Actual Local schema has no existing document/acceptance table; Staff frontend and document endpoints were absent. Existing Staff password login/profile/global request list/detail/history/pending cancellation remain authoritative.
- Request contains saved company/recipient/work dates and `document_issued_at`/`started_at`. `document_issued` exists in enums and Student UI labels it placement-document-issued; **no executable issuance transition or prerequisite exists**. No Company Acceptance/Response persistence or official template/PDF generator exists; `pdf-parse` reads uploads. General FAQ guidance does not define a company-response prerequisite.
- Schema extension is necessary for request/type ownership, separate document lifecycle, versioned metadata/frozen snapshots/generated content and immutable Staff history. `student_files` covers different upload categories and lacks this ownership/evidence; no StudentFile schema/data/storage work was introduced.
- Cooperation drafts require a request in accepted `approved/document_issued/in_progress`, required Student/company/recipient/work dates and actual canonical Class/Head approval evidence. Staff cannot approve/forward or impersonate either role. Request status/timestamps and both advisor IDs are untouched by document actions.
- Placement creation is **409 / PLACEMENT_PREREQUISITE_UNCONFIRMED**; no placement row/acceptance is fabricated. Asked the user whether company response is required or approved request/complete data suffices; no answer/business rule has been assumed. **If company response is mandatory, the absent Company Acceptance/Response flow is the concrete blocker.** Do not report a source-confirmed prerequisite or Placement PASS until clarified.

### Backend, persistence and security

- Reuse existing Staff JWT/live-active guard; new `/api/staff/document-requests` queue/detail and request-owned `/documents/:type` create/edit, `/generate`, `/preview`, `/download` routes. Queue reuses offset/limit validation and adds escaped search (company/code/first/last/full name), accepted request status and cooperation missing/draft/generated filters. Safe named actual Class/Head history, source and saved document snapshot are distinguishable.
- **016_add_coop_documents.js** adds `coop_documents` and `coop_document_revisions` with request/type uniqueness, optional manually supplied number uniqueness, FK RESTRICT, version/type/state checks and revision/version uniqueness. No running-number architecture, new approval enum/stage, earlier migration edit or data backfill. Populated rollback is refused; injected partial DDL rolls back. Named CommonJS exports handle Local Umzug dynamic import and test-image require. Local first import attempts failed before DDL; an empty owned diagnostic schema was guardedly removed, then standard Umzug applied 016 with consistent ledger and verified original data preservation.
- Each mutation SHARE-locks/rechecks active Staff and locks Student -> request -> document consistently with existing workflow. Body identity/approval/status/storage fields rejected. Optimistic version and locks prevent duplicate creates/generates/lost updates/audit duplication; conflicting or stale writes return 409. Existing Staff global request visibility is reused, not silently narrowed to document creator.
- Lifecycle: draft -> generated development artifact; editing generated metadata returns current document to draft, invalidating its artifact; explicit regenerate uses original saved snapshot and keeps prior generated revisions. Identical metadata updates add no history. Each substantive action stores authenticated Staff actor, version/action/status/metadata/snapshot/template/content hash/time atomically.
- Server-rendered **dev-letter-v1 HTML**, not official PDF. No approved official template is available. Optional number/date/draft signer/notes are editable; identity/company/approval/snapshot remain server sourced. Backend validates required data with `DOCUMENT_MISSING_DATA` / readable `missing_fields`; saved snapshot validation remains independent of later source changes.
- Generated HTML bytes, SHA256, metadata/status/version and revision persist together in PostgreSQL; **no external file/path** or partial file/metadata commit. Authenticated inline/attachment HTML uses generated UUID/type/version filename, UTF-8, no-store/nosniff/CSP; all template values escaped, no scripts/resources/forms. Current draft preview returns 409; prior generated `?version=N` stays accessible. No raw filesystem path or secret response.

### Staff UI

- New `/staff-login.html` and `/src/department_staff/department_staff.html`, linked from general login; separate `staffToken` sessionStorage preserves Teacher/Student sessions. Actual Staff profile must be active. Logout/expired/forbidden clears private state and in-flight responses cannot restore it.
- **จัดการเอกสาร** queue shows real Student/code/major/company/request/cooperation/placement status/latest update; search, filters, 25 + lookahead pagination, loading/empty/error/retry. Detail shows request snapshot/contact/work period, actual named approval history, distinct frozen document data, metadata form/current version and named Staff audit history.
- Shared confirmation/toast/loading; save then list/detail server refresh; stale 409 refreshes without false save claim. Committed save with failed reload reports truthfully and hides stale actions. Unsaved edits must be saved before generation. Preview/download use authenticated Blob; URLs revoked on close/replacement/logout. Sandboxed preview has no scripts; native preview print button included, with error handling. **Native print/layout/focus not browser-verified.** Placement shows exact blocker and disabled create. Persistent dev notice avoids representing examples as official letters.

### Local acceptance and preservation

- `runLocalStaffDocumentsAcceptance.js`: explicit development + `FITM_LOCAL_STAFF_DOCUMENT_ACCEPTANCE=1`, exact intern_system, 23 Teachers/1 existing Head/17 migrations/3 files; existing Class `TEACHER_TEST_ID` and private absolute owner-only `TEACHER_TEST_PASSWORD_PATH`. Generated in-memory secret for owned temporary Staff uses production model/bcrypt -> actual password login/profile. Existing real Head credentials temporarily provisioned/restored through the original helper; real Head flag stays true, A credential preserved, no Teacher inserted or valid JWT fabricated.
- **Cooperation Local PASS**: real Student submit -> Class approve -> real Head approve -> Staff queue/detail -> draft/edit/concurrent generate/regenerate -> persisted metadata/content/history -> authenticated preview/download -> Student approved read-back. Request still approved with document_issued_at null, exactly three canonical review events and unchanged class/project advisor IDs. Six document revisions in correct action order and authenticated Staff actor. Safe HTML bytes/hash match preview/download; prior generated version readable.
- **Negative Local PASS**: pending/rejected writes 409; missing required data structured 400; anonymous 401; Student/Teacher/Head/revoked Staff 403; spoofed identities/request/status, invalid type/date/version/unknown request denied; duplicate/stale 409 with one generation audit. Staff approve route remains absent. **Placement Local BLOCKED**; enforcement test PASS only, not Placement creation PASS.
- Final run cleaned **5 owned Students**, owned request/course/delivery/review/document/revision rows and the temporary Staff, deleting RESTRICT evidence first and verifying ownership/no StudentFiles. Head credentials restored to original absent values; correct real flag remains true. Staff returns to **0 accounts**, so manual login needs an authorized Staff setup; no generated credential retained/logged/committed.
- Before schema: **21 public tables / 16 executed / 0 pending**. After: **23 public tables / 17 executed / 0 pending**, exactly two new empty document tables and ledger entry 016; **all 20 earlier application tables** match full-row counts/fingerprints. Before/after Local acceptance and final cleanup: **all 23 tables identical**, changedTables **[]**. Teachers **23**, real Head **1**, StudentFiles **3 / 7d0bf012a44869f32fd415f75b08471c**, real requests/reviews unchanged. No unrelated cleanup or storage change.
- Safe evidence in ignored logs: `staff-documents-before-schema-20261007.json`, `staff-documents-after-schema-20261007.json`, `staff-documents-local-final-report-20261007.json`, migration/local/final preservation logs. Private final acceptance source: `intern_backend:/tmp/fitm-local-staff-documents-IilIDE/report.json`; schema baselines `/tmp/fitm-staff-documents-phajpk/`. All report exports are secret free.

### Validation

- Full **Backend 241 PASS / 0 failures / 0 skips; Frontend 166 PASS / 0 failures / 1 existing browser skip**: `logs/staff-documents-full-20261007.log`. Includes existing Class/Head/Project Advisor/Topic/Book/Poster/Company Evaluation/file regressions. New document backend 15 checks include migration atomicity/rollback/constraints, real password HTTP/SQL, versions/concurrency/snapshot/actors/security/content, render/audit rollback and actual Staff UI/modal/API -> SQL -> Student bridge. New Staff DOM suite 15 checks; no DOM/browser conflation.
- Final targeted document backend **15 PASS**, after named-import assertions/full-name search/saved-snapshot validation changes: `logs/staff-documents-backend-final-20261007.log`. Full suite uses guarded dedicated disposable DBs, tmpfs/internal labelled Docker network/read-only checkout, never persistent Local. Owned resources cleaned.
- Final production build **13 HTML entries / 105 modules PASS**: `logs/staff-documents-build-final-20261007.log`. `node --check` **135 source/script JS files + 3 new test/helper files PASS**, PowerShell runner parse **PASS**, final `git diff --check` **PASS**. Logs: `staff-documents-syntax-20261007.log`, `staff-documents-diff-20261007.log`. Final read-only preservation report `logs/staff-documents-final-preservation-20261007.json` confirms 17/0, all 23 acceptance fingerprints identical, original 20 application tables preserved and all owned labelled test resources absent.
- **REAL BROWSER: NOT RUN**. No callable browser tool or existing Playwright/Puppeteer setup; none installed. [Audit/API/Local evidence and manual Chrome checklist](docs/STAFF_DOCUMENT_PROCESSING_ACCEPTANCE.md) covers account preparation, desktop/mobile/focus/modal/loading/save/refresh/preview/download/print, security, blockers and read-only SQL.

### Files changed in this continuation

- New backend: migration `016_add_coop_documents.js`; models `coopDocument.model.js`, `coopDocumentRevision.model.js`; services `staffDocuments.service.js`, `coopDocumentTemplate.js`; router `staffDocuments.routes.js`; test `staffDocuments.database.test.js`; explicit Local runner `runLocalStaffDocumentsAcceptance.js`.
- Updated backend: existing `roleWorkflow.routes.js` mounts Staff document router after its guards; `roleWorkflow.database.test.js` adds new migration to expected pending list; existing disposable test PowerShell adds dedicated document DB and optional focused/backend-only switches. Local Class/Head acceptance scripts derive migration count from current files, without changing their workflows.
- New frontend: `staff-login.html`, `src/department_staff/department_staff.html`, `src/pages/staffLogin.js`, `src/pages/staffDocuments.js`, `src/api/staffDocuments.api.js`, `src/styles/staff_documents.css`, `test/staffDocuments.test.js`, `test/helpers/staffDocumentsFixture.js`. Existing login link and Vite two entry points updated; no unrelated page redesign.
- Docs: this HANDOFF, stable README, new Staff acceptance/manual checklist; existing Teacher/Class/Head manual migration expectations updated to 17/0. Previous uncommitted work preserved; existing Teacher/Head/Project/Topic production logic unchanged.

### Remaining and exact next task

**RECOMMENDED NEXT TASK: Confirm Placement Letter prerequisites, then implement Company Acceptance/Response if required and obtain approved official letter templates.** Placement creation and official issuance/PDF cannot be called complete while those decisions/templates are missing. Real Chrome acceptance (including native print) and non-document Staff UI remain pending. No next task started, commit, push or deploy.

## Authorized real Department Head Local acceptance - 2026-10-07

**CURRENT AUTHORITATIVE - Asia/Bangkok. POSITIVE LOCAL HEAD HTTP/SQL ACCEPTANCE: PASS. REAL BROWSER: NOT RUN.** This checkpoint supersedes the earlier zero-Head/blocker below. The user identified **ผศ.ดร.ขนิษฐา นามี** as the real Department Head and explicitly authorized correcting only that existing faculty's Local `is_department_head` from false to true. Staff document processing has not started.

### Existing faculty and final role data

- Resolved the exact first/last name from actual Local PostgreSQL, not an ID from documentation: **exactly one** matching faculty, academic title `ผศ.ดร.`, status `active`, department `เทคโนโลยีสารสนเทศ`, original email null/password hash absent/Head flag false. Recorded original safe fields and all 21 table baselines durably **before** updating. A zero/multiple match would fail before mutation.
- Updated only that existing record's `is_department_head` to **true**, preserving all other fields, including timestamps. Final state: **23 Teachers / 1 active Head**. No Teacher inserted and no other Teacher granted Head privilege. The correct real role remains true after acceptance; it is not a temporary test role.
- Name is used only in the one-off Local setup. Runtime login/authorization is unchanged: active live DB Teacher, actual `is_department_head === true`, matching JWT actor/role and valid department scope. Name/title/position/client flags do not authorize. The resolved UUID is a Local implementation detail in the acceptance reports, never a business rule.
- Head originally had no credential. Reused `createTeacherCredentialManager` / `dev:teacher-credential` architecture with generated secret and a private owner-only original credential backup outside Git. No plaintext password/hash/token was printed or committed. After testing, original **email=null / password_hash=null were restored**; Head flag remains true. Existing non-Head Class Advisor A credential was preserved. Head therefore needs an explicitly provisioned credential before manual browser login.

### Actual Local HTTP/SQL results

- **PASS:** real Head password login and `/api/department-head/me` return the resolved faculty with server-side flag true. Head queue and detail include the owned request, prerequisite snapshot and actual named Class approval/history.
- **PASS:** owned Student submit -> `advisor_review` -> Class Advisor approve -> `department_head_review` -> Head approve -> **approved**. SQL status and Student list/detail read-back agree.
- **PASS:** a second owned Student/request follows the same Class stage, then Head rejects -> **rejected** with persisted reason, also visible in Student list/detail. Empty reason fails 400 before saving.
- **PASS:** non-Head password login to Head, `/me`, queue, detail, approve/reject and client flag spoof are denied 403; anonymous decision 401. These attempts do not change request status/history.
- **PASS:** Head approve/reject before Class approval fail 409 and leave submission/history intact. Duplicate and opposite follow-up decisions fail 409, including repeated Class approval; no duplicate audit events.
- Each completed request has exactly **3 canonical events: Student -> Class Advisor -> Head**, with correct actors, decisions, from/to status and timestamps. Both `advisor_teacher_id` and `coop_advisor_teacher_id` remain unchanged. No Class/Project Advisor source or flow was changed in this continuation.

### Database safety and evidence

- Runner created and removed **2 owned disposable Students** and their requests/course/delivery/history rows; cleanup checks ownership and absence of StudentFiles and deletes RESTRICT review rows first. No real faculty cleanup, file/storage work or migration application.
- **Before role correction -> after full Local acceptance:** all **20 unrelated tables** have identical counts/full-row fingerprints. Teachers count remains **23**; per-row fingerprints excluding only `is_department_head` match for every Teacher, including email/password hash/timestamps. The only intentional difference is the resolved target's false -> true Head flag; full-row `teachers` fingerprint changes accordingly.
- **After role correction -> after fixture/credential cleanup:** all **21 tables** match exactly. StudentFiles remain **3 / 7d0bf012a44869f32fd415f75b08471c**; migrations read-only status **16 executed / 0 pending**; original real requests/reviews and all other data preserved.
- Safe ignored evidence: `logs/department-head-before-role-update-20261007.json`, `logs/department-head-authorized-local-report-20261007.json`, `logs/department-head-authorized-preservation-20261007.json`, plus corresponding setup/acceptance/preservation/migration logs. Private source reports: `intern_backend:/tmp/fitm-authorized-real-head-hEgoiA/` and `/tmp/fitm-local-head-acceptance-HoOhjN/report.json`. Credential originals remain private outside Git; no secret values appear in these safe reports.

### Validation and documentation

- Fresh full regression **Backend 226 PASS / 0 failures / 0 skips; Frontend 151 PASS / 0 failures / 1 existing browser skip**. Log: `logs/department-head-authorized-full-20261007.log`. Existing guarded `runTeacherAdvisorAcceptance.ps1 -FullBackend` uses labelled disposable PostgreSQL/tmpfs/internal network with read-only workspace mount, never persistent Local. Full Student -> Class UI -> Head approve/reject -> SQL -> Student read-back bridges pass; owned test container/network cleaned.
- Production build **11 entries / 99 modules PASS**; `node --check` **125 source/script JS files PASS**; `git diff --check` **PASS**. Logs: `logs/department-head-authorized-build-20261007.log`, `logs/department-head-authorized-syntax-20261007.log`, `logs/department-head-authorized-diff-20261007.log`.
- Updated this authoritative checkpoint, stable Local Head status in README, and the [manual Chrome checklist](docs/DEPARTMENT_HEAD_COOP_REQUEST_MANUAL_ACCEPTANCE.md). Earlier blocked preflight remains historical evidence only.
- **REAL BROWSER ACCEPTANCE: NOT RUN.** HTTP/SQL and DOM regression results do not establish desktop/mobile/keyboard browser acceptance. The manual checklist remains pending; restored Head credentials must be provisioned using the existing helper if manual login is needed.

### Remaining and next task

Local positive Head acceptance is closed. Real Chrome acceptance and other Head administration menus remain pending; existing unrelated limitations are unchanged. **Recommended next: Department Staff Document Processing (หนังสือขอความอนุเคราะห์ / หนังสือส่งตัวนักศึกษา).** This round does not start that task. No commit, push or deploy.

## Department Head Coop Request Approval - 2026-10-07

**HISTORICAL IMPLEMENTATION CHECKPOINT - superseded by the authorized real Head acceptance above.** HEAD REQUEST UI IMPLEMENTED; AUTOMATED ACCEPTANCE PASS; REAL BROWSER: NOT RUN. At this earlier checkpoint, positive Local acceptance was BLOCKED with no authorized Head record, and faculty identity/flag authorization had been requested. This round added only Head request approval; it did not complete other Head menus or start Staff document generation.

### Audit and authorization

- Read current HANDOFF/README, Student/Teacher/request/review models, migrations 011/012, Student and role request routes/controllers/services, Teacher login/JWT/live middleware, current Teacher frontend/shared feedback and tests before editing. No usable Head frontend existed.
- Reused existing `/api/department-head/auth/login`, `/me`, `/coop-requests`, `/coop-requests/:id`, and `/:id/approve|reject`. Head login is Teacher bcrypt/JWT authentication with `headOnly`; all Head routes require active live DB identity, JWT actor/role consistency, actual `teachers.is_department_head` and valid department. Requests are scoped via the selected class advisor's department because Students have no department column.
- Head flag is authoritative; position/title/name/email and client flags/body/query fields do not authorize. No auth middleware/login/privilege rules were relaxed. No duplicate endpoints, tables or migrations were created.
- Head decisions remain **department_head_review -> approved/rejected only**. Early or wrong-stage decisions fail 409. Service preserves Teacher/Student/request locks and transactional review insertion. Required rejection reason already exists (trimmed/max 2000); duplicate/concurrent/opposite follow-up decisions cannot create duplicate history. Student submit -> Class Advisor -> Head remains canonical; Staff is not an approval stage.
- Minimal service projection change: Head Student reads omit email/track/status and include safe current class-advisor ID/title/name. Head list/detail review projections include only review evidence plus safe named Teacher actor. This supplies actual Class approval actor/date and current advisor separately; historical actor identity is not inferred from the Student's current advisor. No password/hash/storage data is included. Teacher/Staff authority and Project Advisor workflow are unchanged.

### Frontend and read-back

- New `/department-head-login.html` and `/src/department_head/department_head.html`, linked from Teacher login. Head page has **อนุมัติคำร้องสหกิจ**, role name/logout and a link to existing Teacher work. No unfinished Head administration menus are represented as implemented.
- Reused Teacher sessionStorage/Bearer helper, login controller, request list/detail/decision controller, existing CSS and shared modal/toast/button loading. Small role/destination options preserve Teacher defaults; static page attributes prevent imported Teacher modules from auto-mounting an extra controller on Head pages. Head profile is loaded from `/me` and must have **is_department_head === true** before queue loading. Non-Head client/server responses fail closed; logout/session expiry preserves the separate Student localStorage session.
- Default actionable queue is `department_head_review`; filter/pagination (25 + lookahead), loading/empty/error/retry/session handling retained. Cards show Student name/code/major, real company snapshot/submission date/current status/courses, current Class Advisor and actual Class approval actor/date from review history.
- Detail uses safe text fields for Student, saved company/recipient/address/work period, linked job when present, course snapshots and named actor/from/to/time/reason history. Only `department_head_review` has decision buttons. Custom confirmation and required reject reason block duplicate submissions; successful decisions re-fetch list and open detail from server, clearing old actions. Stale failures also reload; committed save with failed reload is reported truthfully.
- Student existing approved wording and rejection-detail reason already work; no Student production source was changed this round. Isolated UI bridges exercise actual Student submit -> Class modal -> Head approve/reject modal -> real SQL -> Student request reload, with exactly three canonical audit events and unchanged class/project advisor IDs.

### Local credential strategy and evidence

- Read-only preflight: **23 active Teachers / 0 Head flags / 0 Head-login-ready records**. There is no authorized Local Head to reuse. Do not derive a Head from position/name/email or set a random faculty flag to obtain a PASS. Required clarification was requested asynchronously; independent implementation/tests continued.
- Existing non-Head A credential, private password/restore paths from previous checkpoints remain unchanged. No Teacher was inserted, no `is_department_head` flag was set, and no credential was changed during the current Local negative acceptance.
- New explicit `backend/scripts/runLocalDepartmentHeadAcceptance.js` requires development + `FITM_LOCAL_HEAD_ACCEPTANCE=1`, exact `intern_system`, 23 Teachers, existing Class `TEACHER_TEST_ID` and owner-only absolute `TEACHER_TEST_PASSWORD_PATH`. It chooses only an already-active authorized Head (explicit `HEAD_TEST_ID` if several); an already-ready distinct Head needs `HEAD_TEST_PASSWORD_PATH`. If that existing Head lacks credentials, the existing credential helper provisions and restores them in finally. No new credential system or privilege-grant code was added.
- Positive branch is ready for an authorized Head: real Student submit/Class login/approve, Head password login/me/list/detail, early-stage refusal, final approve/reject, duplicate/opposite failures, named audit/Student read-back, unchanged A/B advisor IDs; it restores any temporary Head/non-Head credentials and deletes only owned fixtures. Existing A credentials remain ready. This branch has **not run on Local** while no Head exists.
- Actual Local negative acceptance **PASS**: owned Student has class=A/project=B; real Student submit -> Class A approve -> `department_head_review`; Class A cannot finalize. Real non-Head credentials cannot Head-login or use `/me`/queue/detail/approve/reject even with client flag spoof. Anonymous decision returns 401; forbidden attempts leave status/history unchanged. No valid login token was fabricated.
- Runner reported **BLOCKED (exit 2)** for positive Head approve/reject/early-approval; it does not label this a full Local Head PASS. One owned Student and its request/course/delivery/review fixtures were removed, with RESTRICT review rows deleted first and no StudentFiles allowed in cleanup.
- Before/after **all 21 public table counts/full-row fingerprints match**, changed tables **[]**. Teachers **23**, existing Head flags **0**, credential-ready Teachers **1**, ledger **16**, CoopRequests **2**, reviews **2**, StudentFiles **3 / 7d0bf012a44869f32fd415f75b08471c**. No migration or storage/unrelated data change. Safe report `logs/department-head-local-preflight-report-20261007.json`; private source `intern_backend:/tmp/fitm-local-head-acceptance-hEfBfE/report.json`.

### Automated validation and browser

- Focused Head/Teacher UI: **51 PASS / 0 failures**. Build **11 entries PASS**; `node --check` **125 source/script JS files PASS**; `git diff --check` **PASS**. Build log `logs/department-head-build-20261007.log`.
- Full regression: **Backend 226 PASS / 0 failures / 0 skips; Frontend 151 PASS / 0 failures / 1 existing browser skip**, log `logs/department-head-full-20261007.log`. Both full Student -> Class UI -> Head approve/reject -> SQL -> Student read-back bridges pass. Uses existing `runTeacherAdvisorAcceptance.ps1 -FullBackend`, dedicated guarded databases/markers in labelled Docker tmpfs PostgreSQL and an internal network; workspace mounted read-only. Persistent Local is never the integration target. Owned test containers/network were cleaned after success; label-filtered enumeration is empty.
- New HTTP/SQL regressions cover safe scoped Head list/detail, Class approval actor/date, final approve/reject/Student read-back, all eight wrong states, live flag revocation and spoofed claims/text/query/body, non-Head/Student/Staff/anonymous refusal, department scope, duplicate/concurrent/opposite decisions/audit once and unchanged advisor IDs. Existing Class Advisor/Project Advisor/Topic/file regressions remain in the full run.
- Head DOM cases reuse actual shared controllers/modal/API adapter and cover strict server flag, login/forbidden/session/logout, default queue, safe detail/named history, wrong-state actions, duplicate prevention, server refresh, stale errors, pagination/empty/retry. Two additional disposable SQL bridges cover full Student -> Class UI -> Head UI -> Student read-back. These are **DOM simulations, not a browser PASS**.
- **REAL BROWSER ACCEPTANCE: NOT RUN.** No browser tool or installed Playwright/Puppeteer dependency/config was found; none was installed. [Manual Chrome checklist](docs/DEPARTMENT_HEAD_COOP_REQUEST_MANUAL_ACCEPTANCE.md) includes URLs, authorized account/environment setup, prepare Student/Class request, Head approve/reject, Student reload, non-Head refusal, desktop/mobile/keyboard and read-only SQL. Positive Local/browser execution also needs the authorized Head identity/setup.

### Files in this continuation

- Backend: `backend/src/services/roleWorkflow.service.js`, `backend/test/roleWorkflow.database.test.js`, `backend/scripts/runLocalDepartmentHeadAcceptance.js`.
- Frontend: `frontend/department-head-login.html`, `frontend/src/department_head/department_head.html`, `frontend/src/api/departmentHead.api.js`, `frontend/src/pages/departmentHead.js`, `frontend/src/pages/departmentHeadLogin.js`, `frontend/src/api/teacherProjectAdvisor.api.js` (export existing bearer helper), `frontend/src/pages/teacherLogin.js`, `frontend/src/pages/teacherCoopRequests.js` (shared role options), `frontend/teacher-login.html`, `frontend/vite.config.js`.
- Tests: `frontend/test/departmentHead.test.js`, `frontend/test/helpers/teacherCoopFixture.js`, `frontend/test/studentCoopSavedAcceptance.test.js`.
- Docs: `docs/DEPARTMENT_HEAD_COOP_REQUEST_MANUAL_ACCEPTANCE.md`, stable overview in `README.md`, this HANDOFF. Previous uncommitted changes preserved.

### Remaining and next task

**Required to finish positive Local acceptance:** user identifies the actual Head faculty and explicitly authorizes the correct Local flag/account setup (and restore strategy). Do not create a fake Head to satisfy a test. Manual real Chrome acceptance and other Head administration menus remain pending; existing unrelated limitations are unchanged.

**RECOMMENDED NEXT TASK: Department Staff Document Processing / Cooperation Letter + Student Placement Letter.** Do not start until user review. No commit, push or deploy.

## Teacher / Class Advisor Coop Request Approval - 2026-10-07

**CURRENT AUTHORITATIVE - Asia/Bangkok. CLASS ADVISOR UI IMPLEMENTED; AUTOMATED AND LOCAL AUTHENTICATED HTTP/SQL ACCEPTANCE PASS. REAL BROWSER ACCEPTANCE: NOT RUN.** This continuation adds Class Advisor request decisions to the existing Teacher page and supersedes earlier backend-only descriptions. It stops at Head review. Earlier checkpoints below are historical.

### Audit and existing contract

- Read HANDOFF/README, Student/Teacher/CoopRequest/review models, Teacher JWT/login/live guards, role and Student routes/controllers/services, migrations 011/012, current Teacher/Student frontend, shared feedback and regression fixtures before editing. No duplicate endpoint/table/credential mechanism was needed.
- Existing Teacher APIs: `GET /api/teachers/coop-requests?status=advisor_review&offset=0&limit=26`, `GET /api/teachers/coop-requests/:id`, `POST /api/teachers/coop-requests/:id/approve` with `{}`, and `/reject` with `{reason}` (required, trimmed, max 2000). List returns `{success,data:[...]}`; detail returns `{success,data:{request,reviews}}`. All supported status filters remain owner scoped.
- Actual request enums: `submitted`, `staff_review`, `advisor_review`, `department_head_review`, `approved`, `document_issued`, `in_progress`, `rejected`, `cancelled`. Student's actual submit controller already creates `advisor_review` and writes submission audit/course snapshots in one transaction. Model/legacy `submitted` is retained for compatibility, not made a new Teacher decision stage.
- Authorization already used `req.user.id` from authenticated Teacher JWT and an active live Teacher row, then `Student.advisor_teacher_id`. Request/history detail uses the same class relationship. Body identity/status fields are rejected; a query `teacher_id` cannot change scope. `coop_advisor_teacher_id` is project-only and never supplies Coop Request authority.
- Existing `coop_request_reviews` stores actor/decision/from/to/reason/timestamp, including Student submission. Decisions lock Teacher/Student/request in transaction and insert audit atomically; concurrent second decisions return 409 without duplicate history. FK RESTRICT preserves historical actors/requests.
- Audit found Teacher service still accepted legacy `submitted`. Narrowed Teacher `STAGES.from` to **advisor_review only**, as requested. Head and Staff authorization/transitions unchanged. Existing SQL legacy transition constraints were retained; no migration is needed for the stricter application guard.
- Minimal projection additions: list now includes existing request-owned prerequisite snapshots; Teacher Student projection omits email/track/status. Head/Staff Student projection remains as before. No password/hash/storage paths are fetched in Teacher Student reads.

### UI and Student read-back

- Existing `/src/teacher_coop/teacher_coop.html` adds sidebar/section **อนุมัติคำร้องสหกิจ** while retaining Project Advisor. Own class-advisee cards show name/code/major, saved company, submitted date, course snapshot/status; nine real status filters, 25 rows/page with 26-row lookahead and recovery when a decision empties a later page.
- Detail fetches real server data and renders an explicit text-only whitelist: Student name/code/major, company snapshot/address/recipient, linked job title/description when present, work dates, course snapshots and review history/reasons. Missing values show `-`; no raw objects/HTML/private unrelated profile data are rendered.
- Only `advisor_review` has approve/reject buttons, in list and detail. Shared `showConfirmModal`, `showToast`, `setButtonLoading` handle confirmation, required reject reason, loading and duplicate prevention. Approval means **advisor_review -> department_head_review**; rejection means **advisor_review -> rejected**. UI does not make an optimistic status mutation; list and any open detail re-fetch server state after success. Stale failures discard detail/actions and reload; committed success with failed reload is reported truthfully.
- Loading/empty/API errors/detail errors/pagination/session expiry are handled. Teacher sessionStorage is reused; Student localStorage is untouched. Revocation clears both Teacher sections and an in-flight Project list cannot restore old rows after the token is removed.
- Student existing current request now explicitly says **ผ่านการอนุมัติจากอาจารย์ที่ปรึกษาแล้ว รอหัวหน้าภาควิชาพิจารณา**. Rejected request detail adds the persisted rejection reason from existing review history. No other Student page redesign was performed.
- Class A / Project B separation passes: B cannot list/detail/approve/reject A's class request, A can decide, and both advisor IDs remain exactly A/B. Existing Project Advisor request/confirmation/topic/file regressions remain in the full run.
- Staff retains list/detail/history and eligible pending cancellation. No Staff approve/reject/forward route/button was added. Head-flagged Teacher acting through the Teacher namespace must be the class advisor and cannot advance beyond Head review; Head privilege alone cannot bypass the class stage. No Head UI or authorization change was made.

### Local acceptance and preservation

- Explicit runner `backend/scripts/runLocalClassAdvisorAcceptance.js` uses running Local Backend `127.0.0.1:5000`, actual Student and Teacher password login, and real HTTP/SQL. It requires development, `FITM_LOCAL_CLASS_ADVISOR_ACCEPTANCE=1`, existing `TEACHER_TEST_ID`, private owner-only absolute `TEACHER_TEST_PASSWORD_PATH`, exact `intern_system` and 23 Teachers. It does not create Teachers or fabricate valid login JWTs.
- Existing A remains **อ.ดร.กาญจน์ ณ ศรีธะ**, ID **ce1f3537-8438-42f4-baa8-debc8f5f4dd7**, email **fitm-advisor-local@fixture.invalid**. Private password and original recovery paths from the previous checkpoint are unchanged. Do not rerun the older `runLocalTeacherAdvisorAcceptance.js` on this credential-ready baseline; that script expects zero ready Teachers initially.
- Temporarily provisioned existing B with a generated memory-only password via the existing credential manager, performed real B password login, and restored B exactly. A was never restored/reprovisioned this round. Final: exactly one credential-ready Teacher, original faculty membership/names/privileges/timestamps intact.
- Three owned temporary Students each had class=A/project=B. Actual submission -> review; A list/detail returns five prerequisite snapshots. Flow A approves to Head; Flow B rejects with persisted required reason; Flow C verifies foreign/project B refusal and query spoof scope; Flow D verifies separate A/B canonical fields. Anonymous/body spoof/Head impersonation and duplicate decisions fail safely. Student owner list/detail read back correct statuses/history/reason.
- Cleanup locks/proves owned Students, refuses if any StudentFile exists, deletes only their RESTRICT review rows and their requests/Students, then restores B in finally. All three Students and their request/snapshot/delivery/history fixtures are removed. Existing Student/faculty data and storage were not changed.
- Final Local report: `logs/class-advisor-local-final-report-20261007.json` (ignored); private source `intern_backend:/tmp/fitm-local-class-acceptance-klAkGH/report.json`. **All 21 public tables** (20 application + ledger) have identical before/after row counts and full-row aggregate fingerprints; **changed tables = []**. Baseline/final: Teachers **23**, CoopRequests **2**, reviews **2**, prerequisite snapshots **5**, delivery methods **6**. Migration ledger **16 executed / 0 pending** also verified via read-only migration status CLI; no migration applied.
- StudentFiles **3** / aggregate **7d0bf012a44869f32fd415f75b08471c** before/after. No existing files, volume data or unrelated DB rows were touched.

### Validation and browser boundary

- Final full regression totals: **Backend 222 PASS / 0 failures / 0 skips** (`logs/class-advisor-full-20261007.log`, backend summary); **Frontend 130 PASS / 0 failures / 1 existing browser skip** (`logs/class-advisor-frontend-final-20261007.log`). Teacher UI focused regression **32 PASS**. Both new Teacher modal -> SQL -> Student read-back cases pass.
- Initial full run passed every Backend test but one newly added Student bridge asserted stale DOM because it reloaded only the profile. Corrected the fixture to call the actual `loadCoopRequests()` and reran the entire Frontend suite against fresh guarded disposable SQL targets. This was a test-fixture correction; no Backend change followed its passing 222-test run. The initial log retains that failed frontend attempt; the final frontend log supersedes it.
- Full runner: `powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/runTeacherAdvisorAcceptance.ps1 -FullBackend`. Frontend-only rerun adds `-FrontendOnly` (new optional switch; default behavior unchanged). Reuses existing image/dependencies and creates only labelled internal-network PostgreSQL tmpfs targets with dedicated guarded DBs/markers; checkout mounted read-only. Owned test containers/networks from both invocations were removed and label-filtered enumeration is empty. Integration tests never target persistent Local.
- Added HTTP/SQL coverage for own/foreign list and detail, snapshots/projection, approve/reject/read-back, Class A/Project B, anonymous/spoof, all eight non-review states, duplicate approval/rejection/audit once, unchanged advisor fields, Staff/Head boundaries. Existing full regressions retain Project Advisor workflow. Teacher DOM tests use actual shared modal/adapter/controllers; two new disposable SQL bridges use Teacher modal -> SQL -> Student page reload/reason, explicitly DOM simulation.
- Vite build **PASS, 9 entries**. `node --check` **PASS, 121 source/script JS files**. Focused Teacher UI **32 PASS / 0 failures**. `git diff --check` **PASS**. Log: `logs/class-advisor-build-20261007.log`.
- **REAL BROWSER ACCEPTANCE: NOT RUN.** Tool discovery found no browser tool; no existing Playwright/Puppeteer dependency/config. No browser dependency was installed. API/SQL/DOM acceptance is not a Chrome/responsive/native-control/focus PASS. [Manual Chrome checklist](docs/TEACHER_CLASS_ADVISOR_MANUAL_ACCEPTANCE.md) covers Teacher login/list/detail/approve confirmation/loading/toast/re-fetch, Student read-back, reasoned reject, keyboard/session and desktop/mobile checks. Existing A is retained for manual use; automated Students were cleaned.

### Files in this continuation

- Backend: `backend/src/services/roleWorkflow.service.js`, `backend/test/roleWorkflow.database.test.js`, `backend/scripts/runLocalClassAdvisorAcceptance.js`, `backend/test/runTeacherAdvisorAcceptance.ps1` (optional frontend-only rerun).
- Frontend: `frontend/src/api/teacherProjectAdvisor.api.js`, `frontend/src/pages/teacherCoopRequests.js`, `frontend/src/pages/teacherCoop.js`, `frontend/src/teacher_coop/teacher_coop.html`, `frontend/src/styles/teacher_coop.css`, `frontend/src/pages/student_coop.js`.
- Frontend tests: `frontend/test/helpers/teacherCoopFixture.js`, `frontend/test/teacherCoopRequests.test.js`, `frontend/test/studentCoopSavedAcceptance.test.js`.
- Documentation: `docs/TEACHER_CLASS_ADVISOR_MANUAL_ACCEPTANCE.md`, `README.md` (stable overview only), this HANDOFF. Earlier uncommitted work was preserved.

### Remaining and next task

Remaining acceptance is the manual real Chrome check above. Missing class-advisor linkage can still strand a request (existing known limitation); legacy `submitted/staff_review` are visible but cannot be decided by Teacher under this round's strict stage guard. Existing unrelated limitations below remain outside scope.

**RECOMMENDED NEXT TASK: Department Head Coop Request Approval UI.** Class approval stops at `department_head_review`. No commit, push or deploy; stop for user review after reporting results.

## Teacher Local credential and API acceptance - 2026-10-07

**CURRENT AUTHORITATIVE - Asia/Bangkok. AUTOMATED / API / LOCAL CREDENTIAL ACCEPTANCE PASS. REAL BROWSER ACCEPTANCE: NOT RUN.** This authorized continuation supersedes the earlier no-login-ready-Teacher blocker. Teacher Project Advisor implementation is retained; no Class Advisor approval UI/new feature was started. Previous checkpoints remain historical below.

### Audit and credential approach

- Actual Local schema: nullable `teachers.email` (unique) / `password_hash`; login lookup is normalized email. Teacher virtual `password` invokes the existing beforeValidate bcrypt hook, cost 10; comparePassword uses bcrypt.compare. Seed imports the 23 real faculty with null credentials, and no reusable development credential mechanism existed.
- Preflight: 23 active Teachers, **0 emails / 0 login-ready accounts**, 16 executed migrations / 0 pending through 015. Schema/catalog, model/auth/seed/migrations, Student/Teacher frontend/shared feedback and existing fixtures were inspected first.
- Added explicit `npm run dev:teacher-credential` / `-- restore`. CLI requires explicit NODE_ENV development (test mode allowed only on guarded `fitm_advisor_test`), exact permitted database, existing active TEACHER_TEST_ID, env-supplied TEACHER_TEST_EMAIL/PASSWORD and absolute TEACHER_TEST_BACKUP_PATH outside repo. Never inserts Teachers or runs at app startup/migration; production/unset environments fail closed.
- Locks existing row, validates through the production hashing hook, saves only email/hash with original timestamps retained. Owner-only backup is written/fsynced exclusively **before** DB write. Restore verifies DB/ID and installed fingerprint, preserves exact original values without rehashing, is idempotent and refuses intervening credential edits. No plaintext password/hash/JWT is printed by CLI.
- Compose's backend mount is `/app`, unlike checkout `<repo>/backend`; corrected backup-root validation after an initial Local run stopped before credential writes. Passing Local/isolated results below use the correction.

### Current Local Teacher and recovery

- Existing faculty **อ.ดร.กาญจน์ ณ ศรีธะ**, ID **ce1f3537-8438-42f4-baa8-debc8f5f4dd7**, Local-only email **fitm-advisor-local@fixture.invalid**. Names, list membership, status, department, privileges and timestamps unchanged. Exactly **one** of 23 Teachers now has email/hash.
- Generated password: private `intern_backend:/tmp/fitm-local-teacher-acceptance-iBJdom/teacher-password.txt`, mode **0600**; never printed/read through tool output or added to repo. Manual checklist provides a user-terminal clipboard command, not a plaintext password.
- Current restore backup: `intern_backend:/tmp/fitm-local-teacher-acceptance-iBJdom/teacher-a-final-restore.json`, mode **0600**. Protected Windows copy: `C:\Users\suran\AppData\Local\Temp\fitm-teacher-restore-239a1a1845164701bc1b5063812d38e9\teacher-original.json`; inherited access removed and owner-only ACL verified.
- Restore command: `docker exec -e NODE_ENV=development -e TEACHER_TEST_ID=ce1f3537-8438-42f4-baa8-debc8f5f4dd7 -e TEACHER_TEST_BACKUP_PATH=/tmp/fitm-local-teacher-acceptance-iBJdom/teacher-a-final-restore.json intern_backend npm run dev:teacher-credential -- restore`. Reprovisioned credentials require that invocation's new backup. Teacher credential restore does not undo project decisions.

### Local Student -> Teacher -> Student acceptance

Explicit runner `backend/scripts/runLocalTeacherAdvisorAcceptance.js` requires development + FITM_LOCAL_ADVISOR_ACCEPTANCE=1, intern_system, exactly 23 faculty and zero login-ready Teachers initially. It uses the **running Local Backend at 127.0.0.1:5000**, real Student password login and Teacher password login; no valid Student/Teacher JWT was fabricated to bypass login. An intentionally expired token is used only for a negative authorization test.

- Teacher A login and `/me` verify exact ID/email/name plus JWT actor_type=teacher/role=teacher; safe responses exclude password hash.
- Owned temporary Student selects A -> pending without canonical assignment; A queue sees request -> accept -> Student read-back confirmed and SQL canonical advisor equals A. Duplicate acceptance returns 409.
- Separate owned Student -> A pending -> required-reason reject -> rejected read-back/SQL, null canonical advisor; duplicate decision 409; Student reselects B -> new pending.
- Third owned Student A pending -> switches B -> old A becomes superseded. A stale decision 409, current B decision 404 to A; spoofed teacher_id query does not expose B's request.
- Only one faculty has test credentials at a time: restore A, temporarily provision existing B, login B -> B queue/current acceptance -> confirmed B in Student API/SQL. Student replacement then returns 409 and canonical advisor stays B. Restore B exactly; reprovision A for manual use.
- Every fixture's class `advisor_teacher_id` remains its original existing Teacher C across all decisions; project advisor stays separate.
- Anonymous/invalid/expired sessions return 401; spoofed decision teacher_id is rejected 400; foreign request 404. No free-text position grants Head authority.
- **Three owned temporary Students and their cascaded project-advisor requests removed**; no existing Student, class advisor, topic, Coop Request or file changed. Cleanup checks fixture ownership and absence of files; no unrelated cleanup.

### Database before/after and security

Baseline/final snapshots use real PostgreSQL repeatable-read/read-only transactions and aggregate full-row fingerprints. Application table count stays **20** plus ledger. **19/20 app tables plus ledger match exactly**; only intentional Teacher credentials differ, and Teacher faculty/noncredential fingerprint matches. A separate read-only check proves **23 total / 1 email / 1 hash / 1 login-ready**, solely the intended A UUID; B/other credentials are null.

- Ledger: **16 executed / 0 pending**, same fingerprint; no Local migration/sync/seed/reset.
- Final read-only verification after the full isolated suite: **21/21 public tables match the intended post-credential snapshot**, no further Local changes. Disposable test containers/networks absent.
- StudentFiles: **3 before/after**, same full-row MD5 **7d0bf012a44869f32fd415f75b08471c**; no upload/storage/file-byte access. Existing Students/advisor requests return exactly to baseline after owned-fixture cleanup.
- Original values backed up before each credential update. Credentials/JWTs never committed/pushed; password absent from Local execution log and new helper/runner/test source, checked internally without printing it. Private password/backup modes checked as 0600. No env/dependency/security config changes or external message/email.
- Evidence: ignored `logs/teacher-credential-local-20261007.log`, `logs/teacher-credential-local-report-20261007.json` (counts/fingerprints/checks, no password/hash/JWT), `logs/teacher-credential-isolated-20261007.log`, `logs/teacher-credential-full-20261007.log`.

### Tests and acceptance status

| Acceptance | Result |
| --- | --- |
| AUTOMATED ACCEPTANCE | **PASS**, full backend **218 / 0 failed / 0 skipped**, frontend **108 / 0 failed / 1 existing browser skip**; earlier focused backend **121 passed** |
| API ACCEPTANCE | **PASS**, disposable and actual running Local authenticated HTTP + SQL |
| LOCAL CREDENTIAL ACCEPTANCE | **PASS**, real existing-faculty password login/me + exact temporary restore + one A credential retained |
| REAL BROWSER ACCEPTANCE | **NOT RUN**, no browser tool or installed Playwright/Puppeteer/config; no dependency install/launch/security workaround |
| Build / syntax | **PASS**, nine entries; **120 JS files** checked (118 src + Local runner + new DB test) |

New guarded credential tests contribute **7 passed**: production/environment/target denial, nonexistent/invalid credential refusal without insertion, repository/existing backup refusal, bcrypt and only-two-field update/23 faculty preservation, restore ID/stale-edit refusal, exact/idempotent restoration. FullBackend opt-ins use disposable databases only, never Local. Command: `powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/runTeacherAdvisorAcceptance.ps1 -FullBackend`. All existing backend test files ran sequentially with guarded 013/014/015 and recruitment/role/migration opt-ins; DBs exist only in tmpfs PostgreSQL on a labelled internal network. Runner cleanup and resource absence verified. Build command `npm.cmd --prefix frontend run build -- --configLoader native`; source/script/test syntax and `git diff --check` passed.

### Files changed in this continuation

New: `backend/src/seeders/devTeacherCredential.js`, `backend/scripts/runLocalTeacherAdvisorAcceptance.js`, `backend/test/devTeacherCredential.database.test.js`, `docs/TEACHER_PROJECT_ADVISOR_MANUAL_ACCEPTANCE.md`. Updated: `backend/package.json`, existing `backend/test/runTeacherAdvisorAcceptance.ps1` (credential tests and optional -FullBackend), HANDOFF and README. All previous Teacher frontend WIP retained; no frontend/business workflow rewrite.

### Remaining acceptance / manual checklist / next task

Desktop/mobile CSS/native form/focus/loading/toast and existing-user Chrome interactions remain **NOT RUN**. [Manual Chrome checklist](docs/TEACHER_PROJECT_ADVISOR_MANUAL_ACCEPTANCE.md) includes exact URLs, private-password access, two eligible Student scenarios, Teacher confirm/accept/reject/refetch, Student reload, session/mobile checks and read-only SQL expected results. Temporary automated Students were cleaned; use authorized development Student accounts for manual testing.

**RECOMMENDED NEXT TASK: Teacher/Class Advisor Coop Request Approval UI. NOT STARTED.** Current Class Advisor -> Head -> Approved/Rejected workflow, topic independence, separate advisor fields and StudentFiles are preserved.

**STOP after report for user review; no commit/push/deploy.**

---

## Teacher project-advisor frontend - 2026-10-07

**CURRENT AUTHORITATIVE for this authorized Teacher UI task - Asia/Bangkok. UI IMPLEMENTED; ISOLATED AUTOMATED / HTTP / SQL ACCEPTANCE PASS. LOCAL AUTHENTICATED TEACHER ACCEPTANCE NOT RUN: NO LOGIN-READY TEACHER ACCOUNTS. REAL BROWSER NOT RUN.** This supersedes the earlier documentation-only STOP and Teacher-UI-absent descriptions for this task. Unrelated findings and full audit/history remain below. Production readiness is not claimed.

### Audit and implementation

- Before edits: no Teacher page/controller/CSS/login/sidebar existed. The Teacher directory adapter and Student login serve Students. Existing role router already implements Teacher login, profile, queue and decisions; no duplicate routes were created.
- Teacher identity is derived from HS256 JWT actor/role claims plus live active-Teacher DB authorization, not a supplied teacher_id/name. Login returns `{token, teacher}`; `/me` returns `{success: true, data: safeTeacherProfile}`. Queue is an array, not a `{data: [...]}` wrapper.
- Existing pending queue endpoint now accepts validated `status=pending|confirmed|rejected` (default remains pending), retains existing pagination/fields and adds major/status/decision timestamps/rejection reason. Authorization and decision transactions are reused unchanged. Superseded history remains stored, excluded from these current-status filters.
- `/teacher-login.html`: actual email/password API, loading/errors, duplicate-submit guard and password clearing. Student login links to it.
- `/src/teacher_coop/teacher_coop.html`: authenticated name/sidebar, status filter, 25-row pagination/refresh. Cards show real Student name/code/major/topic, request date, status, decision date/reason where available. Missing values display `-`, dates use Asia/Bangkok and backend strings use textContent.
- Pending accept/reject use shared `showConfirmModal`, `showToast`, `setButtonLoading`. Rejection requires a trimmed reason <=2,000 characters. Page/modal controls lock during submit. Success shows feedback and re-fetches server data; committed decisions with failed refresh are reported truthfully. Stale/missing decisions show a readable Thai error, refresh data and close the old modal. Confirmed/rejected rows have no decision buttons.
- Loading/empty/API errors and 401/403 states are connected. Auth errors clear Teacher token/data and expose sign-in. Teacher JWT uses sessionStorage `teacherToken`; explicit `auth:false` plus own Authorization header prevent the shared client attaching Student localStorage `token`. Logout leaves the Student session untouched.
- KIWI auth/dashboard styles are reused. Shared confirmation adds optional reason/inline errors/onClose. Fixed its existing out-of-scope handleEscape reference that prevented successful closure; tested Escape cleanup, duplicate submission and retry, with a keyboard focus loop added.

### Backend/API used

- `POST /api/teachers/auth/login` with `{email,password}`; `GET /api/teachers/me`.
- `GET /api/teachers/project-advisor-requests?status=...&limit=26&offset=...` (UI displays 25 plus one lookahead).
- `POST /api/teachers/project-advisor-requests/:id/accept` with `{}`.
- `POST /api/teachers/project-advisor-requests/:id/reject` with `{reason}`.
- No Teacher identity is supplied in queue/decision query/body. No endpoint, schema or migration was duplicated/added.

### Protections and regressions verified

Real bcrypt/JWT/HTTP/PostgreSQL tests prove own queue visibility; foreign queue/decision denial (including spoofed teacher_id query/body); anonymous/Student/inactive denial; atomic acceptance and correct `coop_advisor_teacher_id`; rejection without assignment and reselection; A -> B and A -> B -> A stale-ID refusal; accepted/rejected duplicate refusal; concurrent decision/selection serialization; transactional rollback; and silent confirmed-advisor replacement refusal.

The actual new Teacher adapter/controller/shared modal -> authenticated HTTP -> disposable SQL bridge passes accept, reject and stale-page cases. Student `advisor_teacher_id` stays unchanged. Existing Student dropdown/none/pending/rejected/confirmed/replacement/topic create-edit-read regressions pass, as do Class Advisor -> Head Coop Request/history/prerequisites, profile class-advisor preservation and project-file storage/preview on disposable fixtures. Staff remains outside approval stages. No Student page/controller, profile/file schema, Topic rule or Coop Request implementation changed.

### Fresh acceptance results

| Check | Result |
| --- | --- |
| Backend: advisor + 013/014 migrations + project files + role/auth/profile/prerequisites/direct workflow | **114 PASS / 0 FAIL / 0 SKIP** |
| Full frontend, including saved-prerequisite disposable SQL | **108 PASS / 0 FAIL / 1 existing browser SKIP** |
| New Teacher frontend cases | **12 PASS**, included above |
| AUTOMATED ACCEPTANCE | **PASS**, actual controller/shared feedback on simulated DOM plus real HTTP/SQL |
| API ACCEPTANCE | **PASS on disposable authenticated HTTP**, real login/me/list/accept/reject and frontend bridge; Local protected reads 401 |
| REAL BROWSER ACCEPTANCE | **NOT RUN**, no browser tool in session; prior Chrome/Node EPERM remains historical; no browser/security workaround |
| Frontend build | **PASS**, all nine entries including both new pages |
| Source JS syntax | **117 PASS** |
| Local smoke | New pages **200**, DB health **200**, anonymous Teacher me/pending/confirmed reads **401** |
| Local preservation | **20/20 application tables plus ledger unchanged**, counts/full-row fingerprints match |

Repeatable command: `powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/runTeacherAdvisorAcceptance.ps1`. Policy override is process-only, without changing system policy. Runner reuses Node test/installed backend image: labelled internal network, tmpfs PostgreSQL 16, no published ports/Local volume, guarded `fitm_advisor_test`, `fitm_project_test`, `fitm_role_test` (`fitm.a013_disposable` / `fitm.a014_disposable=on`). Repository mount is read-only; uploads use separate temporary fixture storage. Sequential files avoid DDL races. Container/network cleanup and absence verified; no dependencies/framework installed. Initial runner policy/readiness failures were corrected before the passing run; TCP readiness excludes the temporary initialization socket server.

Evidence (ignored local artifacts): `logs/teacher-advisor-acceptance-20261007.log`, `logs/teacher-advisor-local-preservation-20261007.json`. Build: `npm.cmd --prefix frontend run build -- --configLoader native`. `node --check` checked all backend/src/frontend/src JS. `git diff --check` passed.

### Database verification and remaining issues

- Existing Local `intern_system`: **16 executed / 0 pending**, through 015, from existing status CLI. No Local migration/sync/seed/reset/account/privilege mutation or authenticated application write.
- Before/after probes enforce `default_transaction_read_only=on`, explicit UTC and verified target. All 20 application tables plus `sequelize_meta` match. StudentFiles remain **3**, full-row MD5 **7d0bf012a44869f32fd415f75b08471c**; no existing file bytes accessed/changed. Older StudentFile anomaly remains unresolved/out of scope.
- Current requests: **1 pending / 2 superseded**, zero confirmed/rejected. Zero confirmed-request/canonical-advisor mismatches is an empty confirmed set, not Local accept verification. Accepted/rejected writes were verified only on disposable SQL.
- **23 active Teachers / 0 with both email and password_hash**. Local page is served, but Teacher data cannot support successful password login. No credentials invented/accounts created/passwords reset. Local authenticated accept/reject/read-back is **NOT RUN / blocked by account readiness**.
- Real desktop/mobile layout, native inputs/keyboard/focus and existing-user browser acceptance remain untested. Teacher Class Advisor Coop Request UI, Staff/Head UI and confirmed replacement remain outside scope.

### Files changed

- Backend: `src/services/coopProjectAdvisor.service.js` (queue filter/projection only), `test/coopProjectAdvisor.database.test.js` (queue/state and actual Teacher HTTP/SQL bridge), new `test/runTeacherAdvisorAcceptance.ps1`.
- Frontend new: `teacher-login.html`, `src/teacher_coop/teacher_coop.html`, `src/api/teacherProjectAdvisor.api.js`, `src/pages/teacherLogin.js`, `src/pages/teacherCoop.js`, `src/styles/teacher_coop.css`, `test/teacherCoop.test.js`, `test/helpers/teacherCoopFixture.js`.
- Frontend updated: `login.html`, `vite.config.js`, shared `src/ui/feedback.js`, `src/styles/main.css`. Documentation: HANDOFF/README. No env/migration/dependency changes.

### Recommended NEXT TASK - exactly one

**Local Teacher project-advisor browser acceptance, with authorized Teacher account setup as its prerequisite.** Obtain intended account/credentials and explicit account-setup scope before Local credential mutation, then check Student selection -> Teacher login -> accept/reject -> Student read-back, stale A -> B, duplicate submit, session expiry and desktop/mobile feedback in Chrome. Account setup/browser acceptance are not started by this handoff.

**STOP - ready for user review. No commit/push/deploy.**

---

## Full project state audit - 2026-10-07

**CURRENT AUTHORITATIVE - Asia/Bangkok. FULL READ/TEST AUDIT COMPLETE; DOCUMENTATION ONLY. LOCAL: 16 EXECUTED / 0 PENDING THROUGH 015. PRODUCTION READY: NO.** This supersedes old migration counts, Staff approval stages, Head direct project-advisor assignment and topic/file/evaluation placeholder descriptions. Historical handoff content is preserved below.

Classification: **WORKING** means the necessary application layers are connected and supported by source plus relevant automated/runtime evidence; it does not certify browser acceptance. **PARTIAL** means incomplete scope/acceptance, **BACKEND ONLY** means APIs without required UI, **MOCK / UI ONLY** means demo/placeholder without persistence, **NOT STARTED** means no connected implementation, **BROKEN** means reproduced failure. **BLOCKED BY MANUAL/BROWSER ACCEPTANCE** identifies outstanding acceptance. Every feature has one classification; the browser result for every audited feature is **NOT RUN**.

### 1. CURRENT PRIORITY

Complete this audit/documentation and **STOP**. Allowed edits: **HANDOFF_fitm-intern.md and README.md only**. No application/test/config/migration changes or bug fixes. Preserve all tracked/untracked WIP and existing Local data/files. Repository-wide read/test permission does not resume paused role frontends, account setup or deployment. Section 27 contains one recommendation, not a task started.

### 2. DEVELOPMENT ENVIRONMENT

- Windows PowerShell, fitm-intern workspace, branch **main**, HEAD **e3c683b**. Host Node 24 used for frontend in-process tests; existing Node 20 Docker image for backend tests.
- Vite multipage JavaScript/Axios -> Express/JWT -> Sequelize/PostgreSQL 16, private backend storage and FastAPI ranking/OCR clients. Compose services intern_frontend, intern_backend, intern_postgres, intern_nlp_service and intern_pgadmin running.
- Backend root/DB health, NLP health and pgAdmin ping **200**; all **seven localhost frontend entry URLs 200**. Protected anonymous Student/Staff/Teacher/Head reads **401**, expected CORS localhost preflight **204**.
- Vite's internal service hostname returned **403**; supported localhost URLs passed without changing allowed-host/security configuration. No persistent service restart/recreation.
- Compose configuration **PASS with warning**: root POSTGRES_PASSWORD unset in audit shell, interpolated blank. Existing PostgreSQL stayed healthy. Configure intended root environment before fresh startup/recreation; no .env values were printed/edited.

### 3. LOCAL MIGRATION STATUS

**Fresh existing CLI: 16 executed / 0 pending. 015 already applied to persistent Local intern_system.** Verified before and after audit, not inferred from older notes.

Executed: 001–009 plus **007a**, **010_cleanup_student_file_schema_drift.js**, **011_add_role_workflow_reviews.js**, **012_coop_prerequisites_and_direct_review.js**, **013_add_coop_projects_and_current_files.js**, **014_add_coop_project_advisor_requests.js**, **015_add_company_evaluations.js**. The runner uses Umzug/QueryInterface, ordered filenames and SequelizeStorage **sequelize_meta**. Startup authenticates without sync/alter.

**Audit Local migration/rollback/ledger/schema/sync/seed/reset operations: NONE.** Real migration UP/DOWN/failure tests targeted disposable databases only. No old migration was modified.

### 4. CURRENT DATABASE IMPORTANT TABLES

Fresh read-only aggregate counts:

| Tables | Rows |
| --- | --- |
| students / student_profiles / teachers / department_staffs | 4 / 2 / 23 / 0 |
| mentors / mentor_tokens / student_files | 2 / 16 / 3 |
| companies / company_access_tokens | 10 / 0 |
| job_submissions / job_postings / job_posting_work_modes | 10 / 20 / 28 |
| coop_requests / coop_request_delivery_methods | 1 / 3 |
| coop_request_prerequisite_courses / coop_request_reviews / job_posting_reviews | 0 / 0 / 0 |
| coop_projects / coop_project_advisor_requests / company_evaluations | 1 / 2 / 1 |

Baseline **2026-10-07 02:16:58 Asia/Bangkok** (2026-10-06T19:16:58.517Z), final **02:26:47** (2026-10-06T19:26:47.977Z). Every probe connection enforced **default_transaction_read_only=on**, explicit UTC, and verified target intern_system. Evidence in intern_backend: **/tmp/fitm_full_audit_before_20261007.json** and **/tmp/fitm_full_audit_final_20261007.json**, mode 0600; aggregate counts/hashes/catalog only, no raw private rows printed.

**20/20 application tables unchanged; 0 changed tables. StudentFiles before/final: 3 rows, MD5 7d0bf012a44869f32fd415f75b08471c.** Exact full-row fingerprint: md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY to_jsonb(t)::text), '')), UTC SQL timezone. Ledger separately checked. **3/3 physical file references exist** through the actual storage resolver; existing bytes were not read. Initial relative-path probe was corrected before relying on it; no missing file is claimed.

Critical catalog/model checks:
- student_files.storage_path: exactly **one canonical validated UNIQUE/backing index**, student_files_storage_path_key. Resume per-Student and current Book/Poster per-Student/category partial uniqueness present; Student FK CASCADE.
- teachers.is_department_head: BOOLEAN NOT NULL DEFAULT false, **0 Head flags**. Student class/project advisor FKs separate, SET NULL.
- Prerequisites: request FK CASCADE, unique(request,code), exact program/code and status/grade CHECKs.
- CoopProject: Student CASCADE, unique Student, trimmed 1–500 topic CHECK.
- 014: Student CASCADE / Teacher RESTRICT, state/time CHECKs, one-current partial unique and Teacher-pending index, all valid.
- CompanyEvaluation: 11 expected columns, Student CASCADE / Mentor SET NULL, five-score/comment CHECKs, unique Student; no derived-total columns or StudentFile reuse.
- Review FKs RESTRICT. Migration 012 transition/reason CHECKs remain deliberately **NOT VALID**, preserving historical rows while enforcing new writes, not an unexplained migration failure.
- Current jobs: **20 published / 0 expired**. One cancelled CoopRequest. One pending project-advisor request plus one historical row; one saved evaluation. These records existed at audit baseline; audit did not create them or infer an author.
- Prior StudentFile fingerprint anomaly remains **unconfirmed/unresolved**, with no investigation/repair/restore. This comparison certifies only the audit interval.

### 5. AUTH STATUS

| Feature | Classification | Actual chain and evidence |
| --- | --- | --- |
| Student password register/login | PARTIAL | register.js/login.js form -> POST /api/auth/register or /login -> auth.controller/bcrypt Student hooks -> students; source connected, successful existing-user password/browser acceptance not run |
| Student auth/me / actor authorization | WORKING | student_coop.js auth startup -> GET /api/auth/me -> authenticateStudentToken/getCurrentStudent -> Student; roleAuth and authenticated feature HTTP/SQL suites pass, anonymous Local 401 |
| Teacher login/auth | BACKEND ONLY | No login page -> POST /api/teachers/auth/login, GET /api/teachers/me -> teacherAuth controller/service/live Teacher guard -> teachers; role/auth/SQL tests pass |
| Staff login/auth | BACKEND ONLY | No login page -> POST /api/staff/auth/login, GET /api/staff/me (auth/me alias) -> staffAuth/live active guard -> department_staffs; tests pass; Local no Staff accounts |
| Head login/auth | BACKEND ONLY | No login page -> POST /api/department-head/auth/login, GET /me -> Teacher identity/distinct claim/live explicit Head+department guard -> teachers; tests pass; Local no Head flags |

JWT: HS256, actor/role separation, legacy Student claims supported. Teacher active / Staff is_active / Head privilege checked in DB. Student.status is lifecycle data, not a suspension/active-account guard. Project/evaluation additionally require existing DB Student with co_op track. Head privilege never comes from position text. Safe serialization/projections omit passwords/hashes. OAuth is section 21.

### 6. STUDENT STATUS

Main page: frontend/src/student_coop/student_coop.html; controller frontend/src/pages/student_coop.js; existing src/api adapters/client.

| Feature | Classification | Frontend action -> API/backend -> persistence; tests/runtime |
| --- | --- | --- |
| Overview | PARTIAL | Startup auth/profile/request reads supply identity/counts; placement overview placeholder, daily count from DOM; no complete aggregate API |
| Profile/student-info | PARTIAL | Edit/save -> GET/PUT /api/student-profile/me, PUT /student-info -> studentProfile.controller -> students/student_profiles; **4/4 Local read-only controller reads pass**; full save/read-back/browser acceptance missing |
| Profile image | PARTIAL | Upload/read -> POST/GET /api/student-profile/profile-image -> upload middleware/controller -> students.profile_image/private directory; fresh SQL/native acceptance not run |
| Teacher directory | WORKING | loadTeachers -> GET /api/teachers -> teacher.controller explicit safe attributes -> teachers; **23 active Local rows**, directory/HTTP regressions |
| Class-advisor selection/preservation | PARTIAL | student-info save -> active Teacher validation/Student FK; failed/unchanged directory omits advisor, explicit loaded change/clear sends ID/null; frontend studentAdvisor 8/backend controller 3 regressions pass; full SQL/browser selection acceptance distinct |
| Company search/duplicates | WORKING | Modal search/manual selection -> GET /api/coop-requests/companies/search and /companies/duplicate-check -> coopRequest.controller -> companies; escaped/bounded search/normalized duplicates, coopRequestCompany coverage |
| Skills/Resume matching | PARTIAL | Matching action -> POST /api/job-matches/me?source=skills or resume -> jobMatching.controller -> Student/Profile or ready cached Resume + published JobPosting/Company/WorkMode -> nlpMatching.client -> FastAPI; tests/live synthetic client bridge pass, expiry gap retained |
| Resume | PARTIAL | uploadStudentResume -> POST /api/student-profile/resume -> multer/studentProfile.controller -> StudentFile/private PDF -> native pdf-parse/OCR client; resumeUpload 8 actual-temp-file/transaction-mock tests + resumeText and NLP-generated OCR tests pass; full HTTP/SQL/browser acceptance not established |

**Resume retention invariant PASS:** managed transaction resolves -> metadataCommitted=true. Post-commit extraction/status-save failure cannot unlink committed new bytes; pre-commit failures clean staged bytes and preserve old replacement. Post-commit status-update failure may still return 500 with committed file retained; no new API success behavior was invented. Matching reads ready cached extraction, not existing file bytes.

**Matching eligibility gap:** source filters status=published, omits expires_at; job prefill/create do likewise. Current Local zero expired jobs does not validate future eligibility. Ranking/minimal result contract/errors work; computation has no persisted match entity by design. Public landing cards/search remain mocks.

### 7. COOP REQUEST WORKFLOW

**Full cross-role UI lifecycle: PARTIAL. Student create/list/detail/cancel/history/delivery/prefill: WORKING. IT/INE prerequisite snapshot flow: WORKING.**

Actual student_coop.js submit/list/detail/history/cancel -> coopRequest.api.js -> /api/coop-requests routes -> coopRequest.controller + coopPrerequisites -> CoopRequest/delivery/prerequisite/review tables. RoleWorkflow handles reviewer decisions. Real HTTP/SQL role/direct workflow, coopRequestCompany and frontend saved-controller/SQL acceptance pass.

Canonical: submit **advisor_review** -> current class Teacher approves **department_head_review** -> scoped Head approves **approved**, or eligible reviewer rejects. Student/Staff pending cancellation is transactional/audited. **Staff is NOT an approval stage.** UI steps: submission, Class Advisor, Head, Approved; staff_review explicitly historical only. Terminal rejected/cancelled history remains visible.

Owner from JWT; request/Student locks, one active request and atomic child/audit rollback tested. Request snapshots persist independently of profile changes; Request A survives major change/Request B. Class-advisor changes transfer pending authority but do not rewrite audit actors.

Exact five codes:
- **IT:** 060243102, 060243104, 060243108, 060243112, 060243122.
- **INE:** 060233107, 060233112, 060233113, 060233202, 060233204.

Student.major selects program; five exact unique active codes, canonical server names, no foreign/duplicate/spoofed data. Passed requires bounded nonblank grade; studying/unselected null grade. Switching resets/replaces rows; history reads request-owned saved program/grades. Local legacy cancelled request has no snapshot and displays unavailable, not fabricated courses.

Known boundary: backend create does not independently require co_op track or non-null class advisor; frontend gates track, prerequisite normalization rejects unsupported/missing major. Otherwise valid request without class advisor may lack reviewer. Teacher/Head pages absent; full lifecycle not WORKING.

### 8. PROJECT ADVISOR WORKFLOW

**Full workflow: PARTIAL. Student selection/request actions: WORKING. Teacher queue/decisions: BACKEND ONLY. Confirmed replacement: NOT STARTED.**

Project dropdown change -> GET/POST /api/student-coop/project-advisor-request -> coopProjectAdvisor controller/service -> dedicated CoopProjectAdvisorRequest + canonical Student advisor. Directory supplies active Teachers; none/pending/rejected selectable, confirmed locks. Independent load failures disable unsafe selector while topic remains editable.

GET /api/teachers/project-advisor-requests, POST /:id/accept or /reject -> real Teacher guard/owned current request -> request+Student atomic confirmation. **Only acceptance sets coop_advisor_teacher_id; class advisor unchanged.** Pending replacement supersedes immutable history; A->B->A fresh ID, stale decisions refuse. Confirmed replacement refused, no invented history for pre-existing canonical assignment.

coopProjectAdvisor.database/Migration and frontend project suites pass real Teacher bcrypt/JWT/HTTP/SQL, pending/reject/history/stale/concurrent/rollback/confirmed guards. **No usable Teacher page or accept/reject UI exists.** Old Head assignment returns 409. Local service **4 reads: 1 pending / 3 none**; two history rows predate audit.

### 9. PROJECT TOPIC

**WORKING.** Actual saveProjectBtn/read/edit -> GET/PUT /api/student-coop/project -> studentCoopProject.service -> unique Student CoopProject. Owner/track, trimmed 1–500 topic, whitelist, Student lock, same-row update/read-back. HTTP/SQL/frontend bridge tests prove operation in **none/pending/rejected/confirmed** advisor states, including pending-014 topic independence. Local read-only **4 reads / 1 saved topic**. Browser editing not executed.

### 10. PROJECT FILES

**Book/Poster upload/replacement/current metadata/authenticated preview: WORKING. Native/browser preview acceptance: BLOCKED BY MANUAL/BROWSER ACCEPTANCE.**

Actual upload/preview actions -> GET /api/student-coop/project-files, POST /project-book or /poster, GET /project-files/:id/preview -> authenticated studentCoop routes/upload middleware/studentCoopProject.service -> StudentFile categories/private owner storage.

Book **PDF <=10 MB**; Poster **PDF/PNG/JPEG <=10 MB**. MIME/extension/header signature/nonempty physical size/filename validation, owner UUID and lexical+realpath confinement. Student lock + partial unique serialize replacement; pre-commit failure only cleans staged bytes, post-commit cleanup failure keeps committed bytes. Metadata excludes storage_path; preview owner auth/404, inline correct MIME, private/no-store/nosniff.

Browser handler reserves tab, clears opener, retrieves authenticated Blob, navigates/revokes object URL. Real disposable HTTP/SQL/physical fixtures cover spoofed MIME/signatures, ownership/traversal/symlinks, concurrency/rollback/post-commit cleanup and Thai filenames. Actual frontend bridge/DOM tests cover filenames/date fallbacks/long names/Blob lifetimes. **Not Chrome PDF/image acceptance.** Existing Local files only existence-checked, never read/uploaded/replaced/deleted.

### 11. COMPANY EVALUATION

**WORKING, including all eight real context sources. Local schema/read availability verified; authenticated Local browser save/edit remains unaccepted by this audit.**

Evaluation menu/save -> studentCompanyEvaluation.js + studentCoop.api.js -> GET/PUT /api/student-coop/company-evaluation -> companyEvaluation controller/service -> dedicated CompanyEvaluation/company_evaluations, **never StudentFile**. Five q1_score–q5_score integers 1–10, optional trimmed <=2,000 Unicode-character comment, derived total /50 and average /10. UNIQUE(Student), owner lock/same-row edit, strict payload/role/track/ownership. Initial read failure blocks overwrite; failed save preserves input; duplicate-submit and committed-save/refresh-failure feedback retained.

| Eight context fields | Exact source/fallback |
| --- | --- |
| Student name | JWT owner Student.first_name + last_name |
| Student code | Student.student_id STRING, not owner UUID |
| Major | Student.major |
| Company | Exactly one owner CoopRequest in approved/document_issued/in_progress; company_name snapshot first, linked Company.name only if blank |
| Mentor name | Current owner Mentor.first_name + last_name; pending/verified allowed |
| Mentor position | Same current Mentor.position |
| Work period | Same selected request work_start_date/work_end_date; complete valid non-reversed pair |
| Evaluation date | CompanyEvaluation.updatedAt mapped to updated_at, last saved timestamp |

Zero/multiple qualifying requests deliberately unavailable, rejected/cancelled excluded, no arbitrary latest fallback. Missing/blank/invalid context **-**, no fabricated date. Owner/name/Mentor/Company/derived-score spoofing rejected; safe explicit attributes. GET repeatable-read/read-only, bounded placement limit 2.

Fresh Local service: **4 names, 4 official codes, 3 majors, 2 Mentor names/positions, 0 accepted companies/periods, 1 saved evaluation/date**. Current saved row existed before audit; author/browser acceptance not inferred. These aggregates supersede older empty-table/all-major notes.

companyEvaluation.database/Migration/Context and frontend studentCompanyEvaluation tests pass real HTTP/SQL persistence/concurrency/fault rollback/ownership, all context sources/snapshot/master/manual-company fallback, zero/multiple/rejected requests, saved timestamp/invalid dates/current Mentor, actual frontend read-back. **SQL guard passes: evaluation never queries student_files; frontend endpoint-only assertion passes.** 015 UP/DOWN/rollback/constraints/populated refusal only disposable. Student workplace feedback is not academic grading.

### 12. MENTOR STATUS

**Student CRUD/status/resend and Mentor token verification/confirmation: PARTIAL. Mentor log review/attendance/behavior/Student/Book/Poster academic evaluations: NOT STARTED.**

student_coop.js add/edit/delete/resend -> mentor.api.js -> GET/PUT/DELETE /api/mentors/me, POST /api/mentors -> mentor.controller -> mentors/mentor_tokens. Owner from JWT, transactional record/token rotation, post-commit email and truthful SMTP-failure response. Pending-only resend reuses update then GET; no dedicated resend throttle found.

mentor_verify_user.html/mentor.js/mentorVerification.api.js -> GET /api/mentor-verification/verify?token, PUT /profile, POST /confirm -> mentorVerification.controller -> hashed token/expiry/used-at lock and Mentor confirmation. Selected Mentor/Student-name fields only; page removes URL token, holds it in memory, never returns token/hash. **This is a verification/profile page, not a Mentor dashboard or password portal.**

Historical Brevo success retained, not freshly rerun. No emails/inbox/real token used; no dedicated current end-to-end Mentor CRUD/verification SQL/browser suite. Local 2 Mentors/16 token-history rows preserved. Source/page/route/model inventory confirms academic/review functions absent.

### 13. STAFF STATUS

**Core backend: BACKEND ONLY. Staff frontend/login/profile/dashboard/core actions: NOT STARTED.**

staffAuth/roleWorkflow -> DepartmentStaff/requests/job postings/review tables. /api/staff login/me, request list/detail/history, POST /coop-requests/:id/cancel with reason/pending-state/audit/locks. Recruitment GET /job-postings[/:id], POST /:id/publish or /reject moves pending_review -> published/rejected atomically. Auth/role/SQL/concurrency tests pass.

No Staff request approval/reject/forward stage; tests deny it. No Staff page/API-client/action binding. **Local Staff accounts 0**, no setup. Staff document management NOT STARTED.

### 14. TEACHER STATUS

**Class-advisor/project-advisor backend: BACKEND ONLY. Teacher frontend: NOT STARTED. Supervision: NOT STARTED.**

Teacher auth/me, scoped request list/detail/approve/reject and advisor queue/accept/reject -> teacherAuth/roleWorkflow/coopProjectAdvisor -> Teacher/Student/request/review/advisor tables. Live active claims/relationship/decision scope and atomic races tested.

No Teacher login/profile/student-list/dashboard/core action UI. No supervision Student selection, appointment #1/#2, Mentor confirmation/substitute, result #1/#2, two-image storage, PDF or history page/API/model/table. Teacher academic evaluations absent. Existing directory/profile relations are not supervision implementation.

### 15. DEPARTMENT HEAD STATUS

**Backend: BACKEND ONLY. Frontend: NOT STARTED.**

/api/department-head/auth/login, GET/PATCH /me, GET /teachers, PATCH /teachers/:id and request list/detail/approve/reject -> Teacher auth/roleWorkflow -> teachers/students/requests/reviews. Scope from class advisor's department; explicit is_department_head plus role/active guard, never position. Safe Teacher/profile/password whitelist/bcrypt/reset tested; no public privilege promotion.

Old PATCH /students/:id/coop-advisor is **409 refusal**, not assignment. Local **0 Head flags**. No grant/reset/account/seed performed; no Head page/login/dashboard/client.

### 16. RECRUITMENT STATUS

**Full Public->verified->Staff-published UI: PARTIAL. Staff publication APIs: BACKEND ONLY. Public landing catalog/search: MOCK / UI ONLY.**

recruit_student.html/recruitStudent.js form/submit/resend -> recruitStudent.api.js -> POST /api/job-submissions, /verify-email, /resend-verification -> jobSubmission/Turnstile/companyVerification/email services -> Company/JobSubmission/JobPosting/WorkMode/CompanyAccessToken. Verification page uses emailed token, removes URL/referrer exposure.

Feature gate, route limits, validation/hostname Siteverify, atomic children, hashed expiring/use-once token, pending_email_verification -> pending_review. SMTP failure keeps committed submission/202. Purpose-scoped HttpOnly/SameSite cookie, origin/rate limit and token rotation provide recovery without email-token API exposure. Expected action optional; do not claim enforced action merely from widget success.

Fresh recruitmentSecurity/jobSubmission/recruitmentLifecycle/database + role suites pass real HTTP/SQL lifecycle/recovery/rollback/spoofing/publication, **mocked provider boundaries**. No real CAPTCHA/Brevo/inbox acceptance. Prior user green widget/SMTP checks historical.

Usable UI stops at **pending_review** after verification; Staff publish/reject has no page. Published visibility exists in Student matching, landing cards/filters remain hardcoded. Company management login/edit/withdraw NOT STARTED.

### 17. DAILY LOG STATUS

**Student Daily Log: MOCK / UI ONLY. Persistence/save/edit/history/daily-weekly rules/Mentor review/Teacher view/compiled report: NOT STARTED.**

student_coop.js saveDailyLogBtn date/text validation appends/deletes DOM rows, no API/route/model/table; refresh loses data. Input rendered with textContent. StudentFile coop_practice_log_book enum/directory is preparation, not a connected report flow. Company transfer is also an unconnected-backend message.

### 18. EVALUATION/SCORE STATUS

| Feature | Classification | Evidence |
| --- | --- | --- |
| Student company/workplace feedback | WORKING | Section 11 own table/API/five-question Student UI |
| Mentor Student/behavior/attendance scores | NOT STARTED | No Mentor assessment UI/route/model/table |
| Teacher Student scores | NOT STARTED | No assessment flow; request decisions are not grades |
| Book / Poster evaluation | NOT STARTED | Existing uploads/preview only, no rubrics/score storage |
| Final project / exam score | NOT STARTED | No grading UI/event/API/model |
| Overall Company/Mentor 50% + Department/Teacher 50% | NOT STARTED | No component score storage or aggregation |

Workplace feedback /50 is not a 50%-weight academic component. No new scoring formula inferred.

### 19. DOCUMENT STATUS

**Student request-status visibility: PARTIAL. Official documents/หนังสือขอความอนุเคราะห์/หนังสือส่งตัว generation/issuance/download/print/Staff management: NOT STARTED. Internship Report upload: NOT STARTED.**

Student detail/progress -> /api/coop-requests -> actual statuses/enums including document_issued, but no issuance transition/service/template/PDF artifact/download/print route found. Issued-status wording does not prove a document exists.

**Project Book / Poster WORKING** as section 10, distinct from Internship Report. practice-log-book enum/folder does not implement report upload.

### 20. CHATBOT STATUS

**FastAPI FAQ: BACKEND ONLY. Website chat: MOCK / UI ONLY. Express bridge/authenticated live-status lookup: NOT STARTED. Existing chatbot tests: BROKEN.**

index.js sendMessage appends delayed development placeholder, no API call/client/Express chat route. FastAPI /api/v1/chat -> chatbot service -> TF-IDF/LogisticRegression classifier/response selector, FAQ trained in main.py lifespan. No separate entity extractor or authenticated Student request/document DB lookup; status reply is static guidance.

Unmodified NLP suite **14 PASS / 2 FAIL**: test_chatbot.py global TestClient(app) misses lifespan, untrained-classifier RuntimeError. No test/application fix. Actual running document question “ต้องเตรียมเอกสารอะไรบ้าง” returned **200, check_request_status, confidence 0.167** (below configured 0.35 fallback threshold), **not document-intent recognition PASS**. Lifespan correction alone is not proven to fix quality.

FAQ promises document issuance and persistent/Mentor-signed logs the website lacks. Express matching/OCR bridges separately implemented/tested; standalone NLP resume matching has no website consumer.

### 21. GOOGLE OAUTH STATUS

**Google button: MOCK / UI ONLY. Actual OAuth: NOT STARTED.**

login.js googleLoginBtn displays “connect later”; backend/src/config/oauth.js empty. No provider config/callback/routes/domain-restricted Google account creation/login/JWT handoff. Password-registration university-domain rule is not OAuth. No Google setup attempted.

### 22. DEPLOYMENT STATUS

**Local running development services/build: WORKING. Production deployment readiness: PARTIAL; production ready NO.**

Compose/Dockerfiles/packages reviewed only: Vite/nodemon/Uvicorn reload, source mounts, published DB/pgAdmin/API/NLP ports, development pgAdmin defaults; only PostgreSQL has Compose healthcheck. Passing frontend build does not provide production serving/HTTPS.

**deploy.sh exists** and was read: requires env/clean Git, pulls/builds/starts DB, **applies db:migrate**, starts services/checks health. Not executed. Root/backend/frontend env examples exist, correcting old README absent-file claims.

No Nginx config supplied in checkout. Historical host Nginx/reverse proxy/VM successes preserved only as history. **Current VM availability/schema/HTTPS/domain NOT VERIFIED**, no SSH/VMware/staging/production connection. Historical powered-off/count notes are not fresh observations.

### 23. KNOWN RISKS / BLOCKERS

1. NLP tests fail; lifespan setup plus low-confidence document-intent quality and FAQ promises need separate future review, no fixes made.
2. Expired published jobs remain eligible by source filters; current zero expired Local rows is not proof of correctness.
3. Role UIs absent, full advisor/approval/recruitment UI incomplete. Local zero Staff/Head readiness; setup remains paused.
4. Request create lacks independent co_op/non-null class-advisor enforcement; missing major fails normalization. No invented fixtures/advisors/placement.
5. Password/Profile/image/Resume/Mentor/provider/browser acceptance incomplete. Resume file/mock tests are not HTTP+SQL acceptance.
6. Development ports/default credentials/commands, unset root Compose password in shell, raw health diagnostics, owner-relative profile storage references, Student/Mentor throttle gaps and localStorage JWT require production review; no exploit/compromise claimed.
7. Existing runIsolatedWorkflow.ps1 omits newer evaluation/advisor/project opt-in configuration. Legacy jobSubmission.database relies on configured DB plus opt-in, not a strong disposable-name guard: never enable on Local. Audit isolated every writing test.
8. 012 NOT VALID checks deliberate; validation is separate, no schema change now. Scope depends on class advisor; confirmed advisor replacement/documents/grading/supervision/log persistence absent.
9. StudentFile anomaly untouched; audit interval all-table preservation PASS is not a cause/resolution claim.

### 24. REAL BROWSER ACCEPTANCE STATUS

**BLOCKED BY MANUAL/BROWSER ACCEPTANCE. Browser executed: NO.** No tooling available; prior Chrome/Node EPERM retained without retries/security/config changes. DOM/HTTP/SQL/storage fixtures are automated evidence, not Chrome/native focus/CSS/PDF acceptance.

Pending boundaries: existing-user password/Profile, project/advisor native UI/preview/long names, Company Evaluation save/edit/reload/context/responsive feedback, legitimate Mentor/Company inbox links and real provider submission. No attribution of current Local saved evaluation to this audit or a particular browser.

### 25. TEST RESULTS

| Fresh audit check | Result |
| --- | --- |
| Full backend integration opt-ins on disposable PostgreSQL | **210 PASS / 0 FAIL / 0 SKIP** |
| Full frontend, including disposable saved-prerequisite SQL | **96 PASS / 0 FAIL / 1 existing browser SKIP** |
| NLP unmodified suite | **14 PASS / 2 FAIL**, chatbot lifespan setup |
| Frontend build | **PASS**, seven entries |
| Source JS syntax | **114 PASS** |
| Compose config | **PASS**, password interpolation warning |
| Local migration/health/HTTP | **16/0**, DB ready, service 200, seven frontend 200, protected 401/CORS 204 |
| Local model/service probes | Four profiles/evaluations/projects/advisor reads pass |
| Data preservation | **20/20 unchanged**, StudentFiles 3/same hash, physical 3/3 present |
| Source/config/test preservation | **205 baseline hashes unchanged**, no audit source edits |
| git diff --check | **PASS after final docs**, line-ending notices only |

Effective commands:
- **node --test** across backend/test/*.test.js inside dedicated existing-image Docker runner; full configured opt-ins. Covers recruitment HTTP/SQL/provider boundaries; role/auth/concurrent/audit workflow; prerequisite history; project files/ownership/storage; Resume cleanup; advisor/evaluation/context; migration UP/DOWN/rollback/refusals and StudentFile isolation.
- **node --test --test-isolation=none frontend/test/*.test.js**, Host Node 24 with guarded COOP_UI_DISPOSABLE_DATABASE_URL, all six suites.
- **python -m pytest -q -p no:cacheprovider**, temporary NLP image, read-only source/tests/FAQ mounts, PYTHONDONTWRITEBYTECODE=1, network none, generated OCR fixtures only.
- **npm.cmd --prefix frontend run build -- --configLoader native**.
- **node --check** for every one of 114 backend/src/frontend/src JS files.
- **docker compose config --quiet**; **docker exec intern_postgres pg_isready -U postgres -d intern_system**; **docker exec intern_backend npm run db:migrate:status**; **git diff --check**.
- Read-only guarded Node catalog/count/fingerprint/controller/service probes and HTTP/synthetic NLP rank/chat. Actual Local controller/service reads bypass auth, not successful password login or authenticated browser writes.

Test infrastructure: PostgreSQL 16 **fitm_full_audit_tests_20261007**, localhost-only **49984**, guards **fitm.a013_disposable/a014_disposable/a015_disposable=on**, network **fitm_full_audit_network_20261007**, label fitm.audit=20261007, alias a013-postgres. DBs fitm_migration_test, fitm_recruitment_test, fitm_legacy_recruitment_test, fitm_role_test, fitm_evaluation_test, fitm_advisor_test, fitm_project_test. ROLE_BACKEND_INTEGRATION_TEST, RECRUITMENT_INTEGRATION_TEST, STUDENT_FILE_MIGRATION_TEST enabled only isolated; dedicated ROLE_DISPOSABLE_DATABASE_URL, COMPANY_EVALUATION_DISPOSABLE_DATABASE_URL, COOP_ADVISOR_DISPOSABLE_DATABASE_URL, COOP_PROJECT_DISPOSABLE_DATABASE_URL, COOP_DISPOSABLE_DATABASE_URL and frontend COOP_UI_DISPOSABLE_DATABASE_URL pointed only to these targets. Legacy DB initialized through 015 only disposable; migrations also use owned schemas.

No existing Local volume/.env/storage mounted into test runners. PostgreSQL image created a **new temporary anonymous volume**; --rm removed it, verified. Runner containers auto-removed; audit DB stopped/auto-removed, dedicated network and anonymous volume absence verified. No dependency installation.

Logs/hashes outside Git: **C:\Users\suran\AppData\Local\Temp\fitm-full-audit-20261007-2afa5af899ae405ab0f3ea10902ac9f3**, backend-tests.log/frontend-tests.log/frontend-build.log/nlp-tests.log/source-baseline.json. Ignored frontend/dist regenerated. No real secrets/tokens/private rows printed or external emails/messages sent.

### 26. SECURITY RESULT

**No real secrets/password hashes/verification tokens exposed by this audit. No .env/config/security edits.** Source projection/flow review covered JWT_SECRET, SMTP_PASS, TURNSTILE_SECRET_KEY, passwords/hash, token_hash and storage references. Real env files ignored/untracked; backend/frontend Docker ignores exclude .env. No dedicated repo scanner mechanism found, so this is **scoped review, not comprehensive secret-scan certification**.

Auth intentionally returns JWT, safe models omit password/hash. Recruitment token/hash not API fields, resend capability purpose-limited HttpOnly. Mentor validation returns selected Mentor/Student names, no token row/hash. Verification URLs removed in page code; no real token opened/reused here. Project metadata/evaluation exclude raw storage paths/sensitive Mentor/Head fields.

Exceptions retained: profile/image returns authenticated owner's relative profile_image storage reference (not absolute); /health/db error exposes raw diagnostic; some older controller error logs serialize errors. localStorage JWT, Student auth/Mentor resend rate gaps, development credential defaults need future review. No actual compromise claimed; no security weakened.

**Audit changed only README.md and HANDOFF_fitm-intern.md. All existing WIP retained. No commit/push/deploy/SSH/VMware/staging/production, Local migration/sync/seed/reset, account/privilege mutation or real external message.**

### 27. EXACT NEXT TASK

**Exactly one recommendation: manual Chrome Company Evaluation acceptance with the existing authenticated Student session.** Check actual eight-field context/fallbacks, five scores/summary, save/edit/reload/feedback and desktop/mobile native interaction. **NOT STARTED**; requires separately resumed acceptance instruction. Preserve StudentFiles and leave old anomaly out of scope. No role frontend/new feature/migration/deployment task begins.

**STOP - full audit and both documentation updates complete.**

---

## Historical handoff (preserved below)


## Company Evaluation information card - real context data - 2026-10-07

**CURRENT AUTHORITATIVE - Asia/Bangkok. EIGHT-FIELD CONTEXT IMPLEMENTATION / FOCUSED AUTOMATED ACCEPTANCE PASS. LOCAL MIGRATION STATUS UNCHANGED: 16 EXECUTED / 0 PENDING.** This supersedes the preceding six deliberately unavailable display placeholders: existing reliable data now supplies them. The user authorized only the Company Evaluation information card. Evaluation scores, validation, comment, total/average, persistence/ownership and duplicate-submit behavior retained; no other feature started. Previous rollout/history preserved below.

### Exact sources for all eight fields

| Card field | Backend source | Availability/fallback |
| --- | --- | --- |
| ชื่อนักศึกษา | Authenticated Student `first_name` + `last_name`, trimmed | Real stored name; missing/blank parts handled safely, no name becomes `-` in UI |
| รหัสนักศึกษา | `Student.student_id` (official student-code STRING) | Actual stored code, never `Student.id` UUID; blank/missing returns null |
| สาขาวิชา | `Student.major` | Actual stored IT/INE value; StudentProfile has no canonical major field; blank/missing returns null |
| ชื่อสถานประกอบการ | Unique accepted owner CoopRequest `company_name` snapshot; linked Company `name` only if that snapshot is blank | Manual-company snapshots supported; zero/multiple qualifying requests return null |
| ชื่อพี่เลี้ยง | Current owner-scoped Mentor `first_name` + `last_name` | Existing pending/verified Mentor behavior retained; no Mentor displays `-` |
| ตำแหน่งพี่เลี้ยง | Same current Mentor `position` | Real position, no JobPosting/title inference; blank/missing returns null |
| ช่วงเวลาปฏิบัติงาน | Same selected CoopRequest `work_start_date` / `work_end_date` (DATEONLY) | Only genuine valid calendar dates; UI renders complete non-reversed period, otherwise `-` |
| วันที่ประเมิน | CompanyEvaluation Sequelize `updatedAt`, mapped to DB `updated_at` | Last saved timestamp as ISO; absent evaluation/invalid timestamp returns null, never today's date before save |

### Company selection, API and security

- Existing workflow treats `approved`, `document_issued`, `in_progress` as accepted active stages. Select **exactly one** request belonging to authenticated Student whose status is in those three states. All review/pending, rejected and cancelled rows excluded. **No latest-created/updated ordering, historical fallback, status ranking or arbitrary company selection.** Zero qualifying rows yields null; two or more yield null for company and both work dates. Without a canonical placement pointer this is the conservative unambiguous rule. No date-expiry policy or new placement relation invented.
- Request's accepted `company_name` snapshot takes precedence over mutable Company master name, matching existing request/UI conventions and preserving manual companies. Company joined with explicit `name` only as a blank-snapshot fallback. Company/work dates always come from the same selected request; multiple accepted requests are deliberately unresolved and documented rather than guessed.
- Existing GET/PUT `/api/student-coop/company-evaluation` response conventions retained: `student.name`, nullable `mentor.name`, `evaluation`, and `display`. `display.student_id` now means official Student code, not owner UUID; `major`, `company_name`, `mentor_position`, raw `work_start_date`, `work_end_date`, ISO `evaluation_date` are projected explicitly. Old display `work_period` placeholder replaced by raw period dates; frontend only formats backend context. Save response receives the same context and still refreshes through GET.
- Owner always `req.user.id`, DB Student must exist and be co_op. Query/body Student/Mentor/Company identities cannot select another owner; existing strict score/comment whitelist unchanged. GET uses repeatable-read/read-only transaction, four fixed model reads (Student, Mentor, evaluation, owner requests), bounded request query `limit:2` and Company join; no per-request queries/N+1. Explicit necessary attributes exclude password/hash/email/verification/token/storage/Head fields. Only needed context/evaluation fields returned, no whole Sequelize models.
- Current Mentor remains owner-scoped rather than trusting evaluation's old Mentor FK. SQL-access guard confirms evaluation GET/PUT never accesses student_files; frontend requests remain restricted to its evaluation endpoint. Scores 1-10, five-question sum/average, single-row updates, concurrency locks and failure rollback unchanged and passing.

### Frontend and date behavior

- Existing eight labels/HTML/cards/CSS preserved. Controller consumes backend values with trimmed nonempty-text fallback; only missing/null/blank values show `-`, rendered via textContent. Student/major/company/Mentor context is never reconstructed from other dashboard DOM fields.
- Reuses existing safe shared `formatDate` through the controller's injected formatter; parent-page change is only passing that function. Evaluation's scoped date guard rejects missing/non-ISO/nonfinite/impossible calendar dates, including rollover such as February 31, before formatting. Complete valid date pair renders e.g. **1 มิ.ย. 2569 - 30 ก.ย. 2569**; missing/invalid/reversed period displays `-`. Saved timestamp e.g. **7 ต.ค. 2569** updates after save/read-back; no fabricated evaluation date before first save. Shared formatter and unrelated date consumers were not changed.
- Initial-load protection, save/edit/reload, preserved input on failure, distinct committed-save/refresh-failure feedback, loading and duplicate-submit behavior pass unchanged. No UI/sidebar or other Student panel redesign.

### Fresh Local read-only evidence and limitations

- Confirmed existing runner Local migration status before and after: **16 executed / 0 pending**, 015 already applied by the preceding authorized rollout. Backend `/health/db` **200 / ok**. **No new migration created, no migration source modified, no Local UP/DOWN/ledger/sync/seed/reset or persistence write.**
- Actual revised service queried existing Local using database-enforced `default_transaction_read_only=on`, UTC timezone, verified target intern_system, and a SQL guard that stops on any student_files reference. **4/4 real names, 4/4 official codes, majors IT/INE, 2 real Mentor names and positions.** **0 available current accepted companies/complete periods/saved evaluation dates** for these four current Local contexts, so those fields correctly render `-`; absent Mentor/position also falls back. Only aggregate availability printed, not personal row contents. Guard recorded **zero student_files queries**.
- **StudentFiles touched: NO.** No StudentFile query/fingerprint recheck permitted in this task; previous stable baseline remains retained evidence only (**3 rows / `7d0bf012a44869f32fd415f75b08471c`**). Do not claim a freshly compared fingerprint. No real file inspection/upload/replacement/deletion, persistent StudentFile row/metadata mutation or anomaly investigation/repair.
- Real Chrome visual/native interaction and authenticated Local save/edit/read-back remain pending from preceding checkpoint; no browser PASS claimed. Current automated real authenticated HTTP/SQL acceptance uses disposable accounts only. No Local token minted, password reset, user/company/request fixture, fake context or write smoke performed.

### Focused verification and files

- **Backend 23 PASS / 0 FAIL / 0 SKIP:** `node --test --test-isolation=none backend/test/companyEvaluation.database.test.js backend/test/companyEvaluationMigration.test.js backend/test/companyEvaluationContext.test.js backend/test/roleAuth.test.js`. Includes actual HTTP/SQL all-field context, pending/no/deleted/replaced Mentor, saved timestamp mapping, official code/major, accepted company snapshot/master fallback/manual company, rejected/cancelled history, zero and multiple accepted requests, all three accepted statuses, cross-owner query/company spoofing, safe response projection, missing/invalid values, persistence/concurrency/fault rollback, StudentFile SQL isolation and real frontend API/page saved read-back. Existing real migration UP/DOWN/DDL-rollback/constraint suite rerun only on disposable PostgreSQL; migration 015 source unchanged.
- **Frontend 36 PASS / 0 FAIL / 0 SKIP:** `node --test --test-isolation=none frontend/test/studentCompanyEvaluation.test.js frontend/test/studentCoopProject.test.js frontend/test/studentAdvisor.test.js`. Evaluation **11 PASS**, including new eight-label/value test, null/blank/impossible/invalid/reversed date cases, last-saved date reload and existing score/save/feedback/duplicate coverage. Project/advisor tests are shared-page regressions only; upload/preview use simulated controls/Blobs, not physical files. One initial new test assumed a different label ordering; corrected the assertion to verify all eight labels while preserving existing layout. No application defect from that fixture assumption.
- **Build PASS:** `npm.cmd --prefix frontend run build -- --configLoader native`, seven entries. **Seven changed JS files `node --check` PASS. `git diff --check` PASS**, including final documentation; existing line-ending notices only. No full repository audit or unrelated suites.
- Test server **fitm_eval_context_tests_20261007**, PostgreSQL 16, no persistent volume, localhost-only port **61087**, guarded fitm_evaluation_test with `fitm.a013_disposable`, `fitm.a014_disposable`, `fitm.a015_disposable=on`. Existing migrations initialized only disposable schema; no existing Local StudentFiles accessed by those fixtures. Suites clean owned fixtures/schemas; dedicated container stopped/auto-removed and absence verified. No secrets or real external messages/emails printed/sent.
- **Changed this task:** `backend/src/services/companyEvaluation.service.js`; `backend/test/companyEvaluation.database.test.js`; new `backend/test/companyEvaluationContext.test.js`; `frontend/src/pages/studentCompanyEvaluation.js`; formatter injection only in `frontend/src/pages/student_coop.js`; `frontend/test/studentCompanyEvaluation.test.js`; `frontend/test/helpers/studentCompanyEvaluationFixture.js`; this HANDOFF. All unrelated WIP retained. Models/controllers/routes/migrations/API adapter/HTML/CSS unchanged this task.
- No Project Advisor/Topic/Book/Poster/prerequisite/request workflow/Mentor verification/Daily Log/role frontend feature work, config/security edit, commit, push, deployment, SSH, VMware or staging/production access.

### NEXT STUDENT_COOP TASK - exactly one, not started

**Manual Chrome Company Evaluation acceptance with the existing authenticated Student session: verify the real information card, legitimate missing-data fallbacks and save/edit/reload at desktop/mobile widths.** Recommendation only / **NOT STARTED**; preserve StudentFiles and leave the prior anomaly outside this scope.

**STOP - Company Evaluation context-only task complete; Local migration status unchanged at 16 executed / 0 pending.**

## Local Company Evaluation migration 015 rollout and acceptance - 2026-10-07

**CURRENT AUTHORITATIVE - Asia/Bangkok. LOCAL MIGRATION 015 APPLIED / SCHEMA, PRESERVATION AND AUTOMATED ACCEPTANCE PASS. LOCAL AUTHENTICATED SAVE/EDIT AND REAL CHROME ACCEPTANCE PENDING.** The user explicitly authorized the attached Local rollout request, superseding the preceding prohibition on applying 015 for this rollout only. Implementation retained; no feature development or application/test source changes. All previous history remains below.

### Local preflight, backup and migration

- Verified Compose **intern_postgres**, database **intern_system**, backend **intern_backend**; PostgreSQL accepting connections and `/health/db` **200 / ok**. Existing runner reported **15 executed through 014 / exactly one pending: `015_add_company_evaluations.js`**; new table absent. No unexpected migration/schema target found.
- Fresh read-only baseline before any persistent DB write: every probe connection enforced `default_transaction_read_only=on` and UTC SQL timezone. Used the same full-row JSONB/ordered aggregate MD5 method as the latest safety checkpoint. Snapshot at **2026-10-07 01:28:27 Asia/Bangkok** (`2026-10-06T18:28:27.134Z`), `/tmp/fitm_local_before015_20261007.json` in intern_backend, mode 0600. All **19 pre-existing public tables** except the migration ledger captured; only aggregate evidence printed.
- Fresh **after-014 / before-015 custom-format backup**, outside Git: `C:\Users\suran\AppData\Local\Temp\fitm-intern-local-backup-20261007-before015-ad98f2aacd564412952407113ac6fac2\intern_system_after014_before015.dump`. **77,458 bytes**; pg_dump exit 0, nonempty host copy, `pg_restore --list` archive validation exit 0. SHA256 **`E4441B01BB1F4398B9092E2486AFF856BAF5B54FB0AD6B121E7968EE53A23EDC`**. Duplicate archive retained in intern_postgres at `/tmp/fitm_before015_20261007.dump`. Final host size/hash recheck passed; no archive contents printed or restore performed.
- Ran the unchanged existing **`docker exec intern_backend npm run db:migrate`** only after confirming 015 was the sole pending migration. Exit **0**, runner applied **only 015**. No old migration rerun/edit, manual ledger marking, Local DOWN, random ALTER, Sequelize sync, seed/reset or fixture creation.
- Final existing status command: **16 executed / 0 pending**, including 015 exactly once. Migration 007a/010/011/012/013/014 remain executed. New Company Evaluation schema is now available on persistent Local; the earlier missing-015 restriction is superseded.

### Schema and StudentFiles preservation

- **company_evaluations PASS:** 11 expected columns: UUID PK, required Student UUID FK, nullable Mentor UUID FK, five required SMALLINT scores, required optional-content comment with empty default, two required timestamp columns with CURRENT_TIMESTAMP defaults. **Five validated constraints:** PK, Student FK with DELETE/UPDATE CASCADE, Mentor FK with DELETE SET NULL / UPDATE CASCADE, five-score 1-10 CHECK, trimmed/max-2,000-character comment CHECK. **Two valid unique indexes:** PK and `company_evaluations_student_unique`. One evaluation per Student is enforced; totals/average remain computed rather than stored.
- **Immediately after migration:** all 19 pre-existing tables matched baseline counts and full-row fingerprints, including Student, Mentor and StudentFiles. New evaluation table empty. Existing Student/Mentor records and relations preserved.
- **Final read-only preservation PASS**, after all acceptance/regression checks, **2026-10-07 01:34:03 Asia/Bangkok** (`2026-10-06T18:34:03.159Z`): all 19 old tables still match. **student_files before: 3 / after: 3; fingerprint before and after: `7d0bf012a44869f32fd415f75b08471c`; unchanged YES.** Final aggregate evidence at `/tmp/fitm_local_final015_20261007.json` in intern_backend, mode 0600. Evaluation row count remains **0**.
- No StudentFile row or metadata was modified. No Project Book, Poster, Resume or physical upload was read/uploaded/replaced/deleted by this task. Read-only safety hashing was the only persistent `student_files` inspection. Evaluation uses its dedicated table; its real authenticated GET/PUT SQL-access isolation regression passed. Prior StudentFiles fingerprint anomaly remains unconfirmed and unresolved; no investigation/repair or automatic restore was attempted.

### Local backend and frontend acceptance boundaries

- Real **CompanyEvaluation** model query with explicit safe **Student / Mentor associations** executes on Local without schema errors. Read-only actual evaluation service checked **all four existing Co-op Students**; names match stored Student fields, **two current Mentor names** match owner-scoped stored names and the other two render `-`. All six deliberately unavailable display fields remain `-`. Backend health **200 / ok**; real unauthenticated evaluation HTTP GET **401**, as expected.
- Actual Local read-only service responses were fed privately into the existing HTML-derived DOM fixture and actual production evaluation controller/menu activation. **PASS:** menu opens, information names/placeholders render, five score controls, scores **8, 9, 8, 9, 8** produce live **42/50** and **8.40/10**. Personal response content was not printed. Temporary helper is outside source at `/tmp/fitm_evaluation_local_readonly_dom_20261007.mjs` in intern_frontend. **No save adapter invoked / no Local evaluation writes.** These service/model-to-DOM checks bypass HTTP authentication and simulate the DOM; they do not establish native browser/visual acceptance.
- **LOCAL AUTHENTICATED CREATE / UPDATE / SAVED READ-BACK: PENDING / BLOCKED.** No existing safe authenticated Student session/test mechanism was available through the tools. No Local credentials/context were invented, JWT minted, password reset, account created or authenticated write attempted. Duplicate-row protection is verified by the Local unique index and disposable HTTP/SQL tests; it is not a Local write acceptance result. Local table still has zero evaluations. Migration readiness and read acceptance pass; existing-user save/edit/reload remains to be checked in Chrome.
- **REAL BROWSER EXECUTED: NO / BLOCKED.** No browser tool available; prior Chrome/Node EPERM limitation retained without repeated launch or security/configuration changes. CSS/native selectors, focus, responsive layout and actual user feedback have not received browser PASS. Save/read-back/duplicate submission and feedback pass automated fixtures and disposable SQL separately.

### Fresh focused regressions and cleanup

- **Backend 57 PASS / 0 FAIL / 0 SKIP:** `node --test --test-isolation=none backend/test/companyEvaluation.database.test.js backend/test/companyEvaluationMigration.test.js backend/test/studentAdvisor.test.js backend/test/roleAuth.test.js backend/test/coopPrerequisites.test.js backend/test/coopDirectWorkflow.test.js`. Evaluation/migration suites contribute **17 PASS**: authenticated persistence, five scores/comment, exact 42/8.4 total, same-row edits, ownership/spoofing/role denial, current/absent/deleted/replaced Mentor, concurrency, transaction rollback, actual frontend API/form -> HTTP -> SQL, and no evaluation access to student_files. Migration real UP/DOWN/UP, injected UP/DOWN failure rollback, checks/FKs/uniqueness, parent preservation and populated DOWN refusal pass only in disposable PostgreSQL. Expected parser error logging from the invalid-JSON negative case is not a failing test.
- **Frontend 93 PASS / 0 FAIL / 1 existing browser SKIP:** `node --test --test-isolation=none frontend/test/studentCompanyEvaluation.test.js frontend/test/studentCoopProject.test.js frontend/test/studentCoopPrerequisites.test.js frontend/test/studentCoopAcceptance.test.js frontend/test/studentCoopSavedAcceptance.test.js frontend/test/studentAdvisor.test.js`. Evaluation **8 PASS** including information card/questions, live summary, save/edit/reload, required validation, initial failure protection, duplicate-submit handling, shared feedback and committed-save/refresh-failure distinction. Existing Project upload/preview frontend regressions use simulated controls/Blobs; no actual StudentFiles/storage integration suite rerun.
- **Frontend build PASS:** `npm.cmd --prefix frontend run build -- --configLoader native`, seven entries. **`node --check`: 47 existing modified/untracked JS files PASS**; no JS changed this rollout. **`git diff --check`: PASS**, including the final HANDOFF check; line-ending notices only.
- Database-writing tests targeted only dedicated **`fitm_evaluation_local_rollout_tests_20261007`**, PostgreSQL 16, no persistent volume, localhost-only port **62957**, guards `fitm.a013_disposable`, `fitm.a014_disposable`, `fitm.a015_disposable=on`. DBs **fitm_evaluation_test / fitm_role_test**; guards verified by suites before DDL. Test schemas/fixtures cleaned by suites; container stopped/auto-removed and absence verified. No test write targeted intern_system. No secrets, real tokens/passwords, external emails/messages or private row contents printed.

### Manual Chrome checklist - pending, not executed

1. Open `student_coop.html` using the existing authenticated Student session.
2. Open **ประเมินสถานประกอบการ**.
3. Check Student name.
4. Check current Mentor name, or `-` if absent.
5. Check unavailable fields show `-`.
6. Score all five questions (8, 9, 8, 9, 8).
7. Check total **42/50**.
8. Check average **8.40/10**.
9. Enter a comment.
10. Save and check shared success feedback.
11. Refresh the page.
12. Reopen Evaluation.
13. Check scores/comment remain, then edit/save/reload to verify updating the same evaluation without duplicates. Check desktop/mobile layout and keyboard/native selectors during this same acceptance task. Preserve all existing StudentFiles; do not upload/replace/delete files.

### Files, scope and next task

- **This rollout changed only HANDOFF_fitm-intern.md in source.** Existing production implementation/tests and unrelated modified/untracked WIP retained. Build output and temporary probes/backup are outside tracked source. No .env/config/security edit, commit, push, deployment, SSH, VMware, staging/production access or new feature.
- **NEXT STUDENT_COOP TASK - exactly one:** perform manual Chrome Company Evaluation acceptance with the existing authenticated Student session, covering save/edit/reload and desktop/mobile/native-control behavior. **Recommendation only / NOT STARTED.** Preserve StudentFiles and do not investigate/repair the earlier anomaly in that acceptance task.

**STOP - authorized Local migration 015 rollout, focused automated/read-only acceptance and report complete. Local status 16 executed / 0 pending; real existing-user write/browser acceptance remains pending.**

## Company Evaluation final automated acceptance and StudentFile isolation - 2026-10-07

**CURRENT AUTHORITATIVE - Asia/Bangkok. COMPANY EVALUATION IMPLEMENTATION / FINAL AUTOMATED ACCEPTANCE PASS; MIGRATION 015 PENDING ON PERSISTENT LOCAL.** User explicitly resumed only tests, regressions, build, syntax/diff checks, HANDOFF and final report. Implementation was not redone. This supersedes the preceding STOP checkpoint's unfinished automated/final-report status; earlier history remains below. Real Chrome and persistent Local evaluation acceptance are not claimed.

### Implemented behavior retained

- Authenticated Student GET/PUT `/api/student-coop/company-evaluation` uses the dedicated **CompanyEvaluation / company_evaluations** model/table. Five integer scores 1–10, optional trimmed comment (max 2,000 Unicode characters), one current editable evaluation via UNIQUE(Student). Student owner and current Mentor are derived server-side; submitted owner/Mentor IDs, names, totals and averages are rejected. Totals/average are recalculated from the five stored scores.
- Actual `Student.first_name` / `last_name` supply Student name using JWT identity. Current owner-scoped `Mentor.first_name` / `last_name` supply Mentor name for pending or verified Mentor; absent/deleted Mentor renders `-`. Mentor sensitive fields are omitted. Student ID, major, company, Mentor position, work period and evaluation date deliberately remain `-`.
- Existing completed UI: information card, two categories/five specified Thai questions, labelled native score selectors, optional comments, live `/50` total and two-decimal `/10` average, single save action, loading/duplicate-submit protection and shared toast/inline feedback. Save refreshes via GET; initial read failure prevents overwrites, failed saves preserve input, and committed-save/refresh-failure feedback remains distinct. Scoped academic/admin card styling and <=600px stacking retained. No sidebar/unrelated feature redesign.
- Migration **`015_add_company_evaluations.js`** retains transactional UP/DOWN, score/comment CHECKs, Student CASCADE / Mentor SET NULL FKs, unique Student index and refusal to roll back populated evaluations. No applied migration was edited and no unnecessary derived-total columns were added.

### StudentFiles safety baseline and isolation

- Safety instructions remain active: do not alter StudentFile rows or upload/replace/delete Book, Poster, Resume or other existing files; do not investigate/repair the previous fingerprint anomaly within Company Evaluation. Evaluation must use its own table. This completion turn made **no persistent Local DB writes or existing-file mutations**, no Local migration/rollback/sync/seed/reset, and no anomaly investigation or repair.
- Recorded a **fresh read-only current baseline** before verification, from `intern_backend` -> database `intern_system`, with `default_transaction_read_only=on` on every connection and explicit UTC SQL timezone. Baseline recorded **2026-10-07 00:49:55 Asia/Bangkok** (`2026-10-06T17:49:55.871Z`): **3 StudentFile rows**, aggregate full-row MD5 **`7d0bf012a44869f32fd415f75b08471c`**. Snapshot is outside source at `/tmp/fitm_company_evaluation_student_files_baseline_1791308995872.json` in `intern_backend`, mode 0600; only counts/hash/target/time were printed, no raw row data. This is a new current baseline, not a claim about the cause or resolution of the older anomaly.
- **Final read-only comparison PASS:** same three rows and same aggregate fingerprint. Local evaluation table remains absent and 015 ledger entry count is zero. Existing files were not read/uploaded/replaced/deleted by this turn.
- Targeted source review found **no StudentFile, student_files or storage/upload access** in evaluation service/controller/model/migration/frontend controller. Added a real disposable HTTP/SQL regression that intercepts database queries and fails if evaluation GET/PUT issues SQL against `student_files`; it passed. The actual frontend API/page bridge also now asserts every evaluation request uses only its own endpoint. These are the only test-code additions this completion turn; production implementation unchanged.

### Final verification results

- **Backend: 72 PASS / 0 FAIL / 0 SKIP.** Command: `node --test --test-isolation=none backend/test/companyEvaluation.database.test.js backend/test/companyEvaluationMigration.test.js backend/test/coopProjectAdvisor.database.test.js backend/test/coopProjectAdvisorMigration.test.js backend/test/studentAdvisor.test.js backend/test/roleAuth.test.js backend/test/coopPrerequisites.test.js backend/test/coopDirectWorkflow.test.js`. Evaluation/migration tests now account for **17 PASS**; remaining **55** are relevant advisor/auth/class-advisor/prerequisite/direct-workflow regressions.
- Persistence/security: real authenticated HTTP create/read/update same row, all five SQL scores, trimmed/optional/bounded comment, accurate total/average, concurrent first saves and fault rollback, fresh frontend API/form -> HTTP -> SQL read-back. Invalid scores/missing scores/text/decimals/comments and spoofed owner/Mentor/name/derived totals rejected. Cross-owner query/path/body attacks cannot read/update another Student. Wrong-role/missing/non-Coop/unauthenticated actors denied. Current pending/verified/absent/deleted/replaced Mentor behavior and FK clearing/rederivation pass.
- Migration 015: real isolated-schema empty UP/DOWN/UP, injected UP-index and DOWN-DDL failure rollback, parent preservation, required/bounded scores/comments, FKs/uniqueness, SET NULL/CASCADE and populated DOWN refusal all pass. **No StudentFile upload/storage integration suite was rerun after the safety update.** Previously recorded project upload regression evidence remains historical; current frontend Project upload/preview tests use simulated controls/Blobs and do not modify actual StudentFiles.
- **Frontend: 93 PASS / 0 FAIL / 1 existing real-browser SKIP.** Combined `studentCompanyEvaluation`, `studentCoopProject`, `studentCoopPrerequisites`, `studentCoopAcceptance`, `studentCoopSavedAcceptance`, `studentAdvisor`; new evaluation tests **8 PASS**. Real disposable SQL is used for saved prerequisite regression; DOM/layout/native behavior remains simulated/reviewed.
- **Frontend build PASS:** `npm.cmd --prefix frontend run build -- --configLoader native`, all seven entries. **`node --check`: 47 modified/untracked JS files PASS. `git diff --check`: PASS**, including final documentation check; line-ending notices only.
- Database-writing checks used only guarded **`fitm_eval_safety_20261007`**, PostgreSQL 16, no persistent volume, localhost-only random port **60128**, `fitm.a013_disposable`, `fitm.a014_disposable`, `fitm.a015_disposable=on`. DBs: `fitm_evaluation_test`, `fitm_advisor_test`, `fitm_role_test`. Test schemas/Students are cleaned by suites; dedicated container stopped/auto-removed and absence verified. No secrets/external messages/emails printed or sent.

### Local state, files and limits

- Actual inspected status is **15 executed through 014 / 1 pending: `015_add_company_evaluations.js`**. The safety message's earlier 0-pending state predates the new migration file. **015 HAS NOT BEEN APPLIED TO PERSISTENT LOCAL**, as explicitly instructed; dedicated Local table absent. Implementation works against disposable SQL, but persistent Local evaluation GET reports migration 015 required and saving stays disabled until a separately authorized rollout. No Local smoke write was attempted.
- This completion turn changed only **`backend/test/companyEvaluation.database.test.js`** (SQL-access isolation and frontend endpoint assertions) and **this HANDOFF**. Existing implementation files remain as enumerated in the prior checkpoint: backend migration/model/service/controller/routes/tests; frontend API/controller/menu hook/evaluation HTML/CSS/tests/helper. All unrelated modified/untracked WIP preserved.
- **REAL BROWSER ACCEPTANCE BLOCKED:** no browser tooling available / prior EPERM limitation retained; no security weakening, no Chrome/native focus/visual PASS claimed. Automated acceptance and requested final report complete the current authorized scope; real Chrome and persistent Local acceptance remain separate limitations.
- No commit, push, deploy, SSH, staging/production access or new feature started. No config/.env/security change. Prior StudentFile anomaly remains unconfirmed and unresolved, without further investigation in this scope.

### NEXT STUDENT_COOP TASK - exactly one, not started

**Perform separately authorized Local Company Evaluation acceptance: fresh read-only StudentFiles baseline and backup, migration 015-only rollout, then existing-user Chrome save/edit/read-back and responsive checks.** Recommendation only; **NOT STARTED**. Do not investigate or repair the earlier StudentFiles anomaly as part of that feature acceptance.

**STOP - requested Company Evaluation verification, HANDOFF and final report complete; 015 remains pending on Local.**

## Company Evaluation implementation checkpoint - user-requested STOP - 2026-10-07

**CURRENT AUTHORITATIVE - Asia/Bangkok. FEATURE DEVELOPMENT STOPPED AT USER REQUEST DUE TO USAGE LIMIT. IMPLEMENTATION AND AUTOMATED CHECKS PASS; FINAL ACCEPTANCE/FEATURE REPORT UNFINISHED. MIGRATION 015 NOT APPLIED TO PERSISTENT LOCAL.** Preserve all previous history below. Do not resume development, apply migrations or start another feature without a new user instruction.

### Already implemented

- Only Student **ประเมินสถานประกอบการ**: real frontend -> authenticated API -> backend -> PostgreSQL -> read-back implementation, verified against disposable PostgreSQL. Existing `panel-evaluate` placeholder replaced with the requested Thai heading/subtitle, eight-field information card, two question categories and the five specified questions. Native labelled score dropdowns contain blank selection plus 1–10, `/10` indicators; optional comment textarea; live total `/50` and average with two decimals; one primary **บันทึกแบบประเมิน** action.
- Student name derives from authenticated `req.user.id` -> actual `Student.first_name` / `last_name`. Mentor name derives from owner-scoped `Mentor.student_id` -> current `first_name` / `last_name`, for pending or verified Mentor as allowed by existing Mentor reads. No Mentor renders `-`. Only names are returned; no Mentor email/token/password/internal identity fields are exposed in the context response.
- Six conservative display placeholders remain `-`: Student ID, major, company, Mentor position, work period, evaluation date. No fake values or new company/placement linkage was introduced.
- New **CompanyEvaluation / company_evaluations**: UUID ID, Student FK, nullable server-derived Mentor FK, five required scores, trimmed optional comment, timestamps. UNIQUE(Student) gives one editable current row; totals/average are calculated server-side from scores, not duplicated in storage. Student-row locking serializes saves; create/edit persists and read-back reloads the same row.
- GET/PUT **`/api/student-coop/company-evaluation`**, using existing Student JWT/actor middleware and checking the DB Student exists with `track=co_op`. Body accepts only q1–q5 numeric integer scores 1–10 and optional string comment, trimmed/max 2,000 Unicode characters with NUL rejected. Owner/Mentor IDs, names and client totals/averages are rejected. Owner always comes from JWT, never query/body/path. Missing 015 returns explicit **503** explanation.
- New frontend controller initializes once and loads when the evaluation menu opens. Failed/malformed initial reads disable saving; required score validation, loading/disabled controls, duplicate-submit guard, shared inline/toast feedback, save plus fresh GET read-back, preserved input on errors, and distinct committed-save/failed-refresh feedback implemented. CSS is scoped to `#panel-evaluate`: existing white/blue card theme, two-column information layout, question/score alignment, <=600px stacking, wrapping Thai text and keyboard focus styling. Sidebar and unrelated menus were not redesigned.
- New migration **`015_add_company_evaluations.js`** is separate from all applied migrations. Transactional UP/DOWN, bounded score/comment CHECKs, Student CASCADE and Mentor SET NULL FKs, unique Student index. DOWN refuses populated evaluations to preserve evidence. No old migration was edited; no sync/alter/seed/reset on Local.

### Exact verification state at STOP

The user listed these checks as potentially unfinished; **they had already completed before the STOP message**:

- **Persistence tests: COMPLETE / PASS.** Authenticated HTTP create, all five SQL score values, comment trimming/bounds, same-row updates, optional-comment clearing, GET read-back, concurrent first saves and injected update failure rollback. Actual frontend API/controller -> HTTP -> PostgreSQL -> fresh DOM fixture read-back also passed.
- **Ownership/security tests: COMPLETE / PASS.** Student B cannot read/update A via body/query/path overrides; cross-owner/Mentor/name/derived-total spoofing rejected; unauthenticated/wrong-role/missing/non-Coop actors denied. Pending/verified, absent/deleted/replaced Mentor behavior verified, including SET NULL and deriving the replacement on next save.
- **Migration 015 tests: COMPLETE / PASS.** Empty UP/DOWN/UP, injected UP-index and DOWN-DDL rollback, required/bounded scores, comment bounds, FKs, uniqueness, Mentor deletion SET NULL, Student deletion CASCADE, populated DOWN refusal, parent-table preservation. Combined new backend evaluation/migration suites: **16 PASS / 0 FAIL / 0 SKIP**.
- **Frontend regression tests: COMPLETE / PASS.** New evaluation suite **8 PASS**; combined evaluation + existing Project/Prerequisite/Acceptance/SavedAcceptance/StudentAdvisor suites **93 PASS / 0 FAIL / 1 existing browser-only SKIP**. New tests cover names/placeholders, five labelled 1–10 selectors, totals/averages, required validation, trimmed comment/save/edit/read-back, load/schema failures, duplicate submit, shared feedback and failed refresh after committed save. DOM simulation does not prove visual/native browser behavior.
- **Shared backend regressions: COMPLETE / PASS.** Advisor/migration/project/auth/class-advisor/prerequisite/direct workflow **73 PASS**; Role PostgreSQL/auth/workflow **32 PASS**. The only related old-test adjustment adds 015 to expected pending migration names after 011. Total backend checks this turn: **121 PASS** across these three runs.
- **Frontend build: COMPLETE / PASS.** `npm.cmd --prefix frontend run build -- --configLoader native`, seven entries. **JS syntax: 47 modified/untracked JS files PASS.** **`git diff --check`: COMPLETE / PASS** before this documentation-only checkpoint; line-ending notices only.
- **Final acceptance/report: UNFINISHED.** No comprehensive final feature report was delivered before the user requested STOP. No real-browser Company Evaluation acceptance; browser tooling unavailable/prior EPERM limitation retained, security unchanged. Persistent Local evaluation save/read acceptance is not possible until separately authorized migration 015 rollout. Final review/acceptance closure is not claimed. No additional tests/build/development were started after STOP.

### Local, resources and files

- Ran `git status --short` at STOP; existing modified/untracked WIP preserved. Reconfirmed via `docker exec intern_backend npm run db:migrate:status`: **15 executed through 014 / exactly 1 pending: `015_add_company_evaluations.js`**. **015 HAS NOT BEEN APPLIED TO PERSISTENT LOCAL.** Prior authorization was specific to 014, so the current conditional migration rule did not permit evaluation rollout. No new Local backup/rollout/rollback, fixture or evaluation write was performed. The preceding StudentFiles fingerprint discrepancy remains uninvestigated/unresolved; it was not part of this feature.
- All database-writing tests used dedicated auto-remove PostgreSQL 16 container **`fitm_evaluation_tests_20261007`**, no persistent volume, localhost-only port **49682**, guards `fitm.a013_disposable`, `fitm.a014_disposable`, `fitm.a015_disposable=on`; DBs `fitm_evaluation_test`, `fitm_advisor_test`, `fitm_project_test`, `fitm_role_test`. Stopped/auto-removed as cleanup at STOP; absence verified. No secrets printed or external emails/messages sent.
- New backend files: `src/db/migrations/015_add_company_evaluations.js`, `src/models/companyEvaluation.model.js`, `src/services/companyEvaluation.service.js`, `src/controllers/companyEvaluation.controller.js`, `test/companyEvaluation.database.test.js`, `test/companyEvaluationMigration.test.js`.
- Modified existing backend: `src/routes/studentCoop.routes.js` (two evaluation routes); `test/roleWorkflow.database.test.js` (015 pending-name assertion only this turn).
- New frontend files: `src/pages/studentCompanyEvaluation.js`, `test/studentCompanyEvaluation.test.js`, `test/helpers/studentCompanyEvaluationFixture.js`.
- Modified existing frontend: `src/api/studentCoop.api.js` (GET/PUT adapters), `src/pages/student_coop.js` (controller initialization/menu hook), `src/student_coop/student_coop.html` (evaluation panel), `src/styles/student_coop.css` (scoped evaluation styles). This HANDOFF updated at STOP. No commit/push/deploy/SSH/staging/production operation or config/security change.

### NEXT STUDENT_COOP TASK - exactly one, not started

**Resume Company Evaluation final acceptance and final feature report only when the user explicitly resumes work.** Local migration 015 remains pending and requires separate explicit authorization with fresh backup before any persistent Local rollout. **NOT STARTED.**

**STOP - user-requested checkpoint recorded; no further feature work.**

## Local migration 014 and Student project/upload UI fix - 2026-10-07

**CURRENT AUTHORITATIVE - Asia/Bangkok. LOCAL MIGRATION 014 APPLIED / AUTOMATED ACCEPTANCE PASS / FINAL DATA AUDIT DISCREPANCY REPORTED.** This checkpoint supersedes earlier statements that 014 is pending or Local advisor requests are unavailable. Earlier work and validation history remain below. Only the current task's two Student panels were styled; real Chrome visual/native-control acceptance is pending. Final Local StudentFiles fingerprint changed after successful immediate post-migration preservation verification; further application/database mutations stopped and no restoration was attempted.

### Local migration, backup and preservation

- Explicit user authorization: apply only **`014_add_coop_project_advisor_requests.js`** to persistent **Local development** PostgreSQL. Target verified as Compose `intern_postgres`, database `intern_system`, backend `intern_backend`; PostgreSQL ready and `/health/db` 200/ok. Preflight ledger had **14 executed / only 014 pending**. Existing `coop_projects`, Student canonical advisor FK column, Teacher head flag and migration 013 schema were compatible. Isolated migration 014 suite ran **before application: 5 PASS / 0 FAIL / 0 SKIP**, including transactional UP/DOWN rollback and populated DOWN refusal.
- Fresh custom-format backup **after 013 / before 014**, outside Git: `C:\Users\suran\AppData\Local\Temp\fitm-intern-local-backup-20261007-before014-21c0933de72f426cbf8a6090e487ed82\intern_system_after013_before014.dump`. **72,360 bytes**; pg_dump/copy exit 0, file nonempty, `pg_restore --list` archive validation exit 0. SHA256 **`FB783F0636DC8F4D7953806FFEAB3E570F63653D20154A46E0C5DDA66C231660`**. Container archive: `/tmp/fitm_before014_20261007.dump` in `intern_postgres`. This backup is retained; no restore or Local DOWN was run.
- First attempted Umzug invocation through stdin failed **before migration execution** (`up is not a function`). Diagnosis: Umzug selects dynamic import when `require.main` is absent; CommonJS object method exports are not named ES-module exports. Confirmed valid `require(...).up`, absent request table/014 ledger, and all 18 old-table counts/fingerprints unchanged. Used the unchanged repository **`npm run db:migrate`** script after rechecking 014 was the sole pending migration. It applied **only 014**, exit 0; no runner or migration source was edited and no ledger was manually written.
- Verified request table's **11 columns**, PK, **2 validated FKs** (Student CASCADE / Teacher RESTRICT on delete, both CASCADE on update), **2 validated state/time CHECKs**, **3 valid indexes** including unique current-per-Student partial index and Teacher/pending partial index. New table initially empty. Final ledger: **15 executed / 0 pending**, through 014; 007a/010/011/012/013 remain applied.
- **Immediately after migration**, before UI work/smoke, aggregate row counts and full-row fingerprints matched for **all 18 pre-existing public tables** (excluding the intentionally updated migration ledger), including **4 Students, 23 Teachers, 1 existing CoopProject and 3 StudentFiles**. The project existed at this task's start; it was preserved. Snapshot contains only counts/hashes, stored at `/tmp/fitm_local_before_014_20261007.json` in `intern_backend`. No fake Local account, topic, request, assignment or upload was created by this task.
- **Final preservation audit discrepancy / STOP:** 17 of 18 old tables still match, including Students, Teachers and CoopProjects. `student_files` remains **3 rows** but fingerprint changed from `d67d3e581114f26f00836d43bb30acca` to `472806d09e4f72201189dadcff4736f0`. Latest file `updated_at` is `2026-10-06T17:32:49.266Z`; request table remains empty. Change occurred after the successful immediate preservation check; its field/source/cause is **unconfirmed**. Local smoke connections enforced read-only mode and test writes targeted disposable databases. Do **not** claim final full-table preservation or assume a particular author/background process caused it. In accordance with the user's stop/report rule, no further application/DB mutations or restore/rollback were attempted; backup remains intact. A final read-only confirmation returned the same discrepancy. Overall end-of-task preservation check is **FAIL / requires explanation**, distinct from migration/schema and automated suite PASS.

### Student project and upload UI

- Layout/CSS additions are scoped to **`#panel-coop` and `#panel-report-upload`**. Reused existing theme variables, header/card styles and status palette. Added project card heading, consistent labels/44px controls, help text, separated advisor/topic fields, save/upload action rows and keyboard focus outlines. Existing sidebar/theme and other panel implementation were preserved.
- Advisor status now uses a compact badge plus separate teacher name/rejection reason rendered as text: **none gray / pending yellow / confirmed green / rejected red**. Existing live Teacher directory/selection APIs remain: 23 active Teachers, no Staff options or hardcoded UUIDs; pending can change, confirmed locks, rejected can reselect. Canonical `coop_advisor_teacher_id` is still set **only by Teacher acceptance**; class `advisor_teacher_id` remains separate. Topic save/edit/read-back remains independent in all four advisor states.
- Book and Poster have distinct cards, format/10MB help associated with accessible **native** file inputs, styled `::file-selector-button`, full wrapping current filenames, separate updated-date metadata and compact accessible preview buttons. Desktop has two columns and metadata/button rows; at <=900px cards stack, at <=600px metadata/actions stack. `min-width:0`, `minmax(0,1fr)` and `overflow-wrap:anywhere` prevent content-driven expansion without hiding filenames. Responsive verification is CSS/structure review, **not browser-measured acceptance**.
- Secure authenticated Blob preview, reserved tab, URL lifetime/revocation, upload validation/replacement and partial-failure semantics remain unchanged. Preview button accessible name includes the full filename. DOM text rendering preserves long/untrusted filenames and avoids HTML interpretation.
- File date rendering uses the existing guarded formatter, accepts ISO/date-only timestamps, and explicitly displays **`ไม่ระบุวันที่`** for null, undefined, empty or invalid timestamps. Regression tests assert both valid date output and fallback; no `Invalid time value` / `Invalid Date` rendering. Added both-card long-filename/accessibility/Blob-preview coverage.

### Tests, read-only Local smoke and limits

- Backend combined advisor/migration/project/auth/class-advisor/prerequisite/direct-workflow suites: **73 PASS / 0 FAIL / 0 SKIP**, including **15 advisor/migration tests** and **58 shared regressions**. Command: `node --test --test-isolation=none backend/test/coopProjectAdvisor.database.test.js backend/test/coopProjectAdvisorMigration.test.js backend/test/studentCoopProject.database.test.js backend/test/coopProjectMigration.test.js backend/test/studentAdvisor.test.js backend/test/roleAuth.test.js backend/test/coopPrerequisites.test.js backend/test/coopDirectWorkflow.test.js`.
- Required frontend suites (`studentCoopProject`, `studentCoopPrerequisites`, `studentCoopAcceptance`, `studentCoopSavedAcceptance`, `studentAdvisor`): **85 PASS / 0 FAIL / 1 existing real-browser SKIP**. Project-only suite **17 PASS**. Initial test command without `--test-isolation=none` hit Node child-process `spawn EPERM` before tests; reran with the existing no-child-process option, without changing security or configuration.
- All database-writing tests targeted only guarded databases `fitm_advisor_test`, `fitm_project_test`, `fitm_role_test` inside disposable PostgreSQL 16 container **`fitm_ui_rollout_tests_20261007`**, no persistent volume, localhost-only random port **62186**, guards `fitm.a013_disposable=on` and `fitm.a014_disposable=on`. Credentials/JWTs belong only to disposable fixtures and were not printed. Container stopped/auto-removed after verification.
- Frontend build `npm.cmd --prefix frontend run build -- --configLoader native`: **PASS**, seven entries. `node --check` for all **38 modified/untracked JS files**: **PASS**. `git diff --check`: **PASS**, line-ending notices only.
- Local smoke used application Teacher/advisor controllers and project service with **database-enforced `default_transaction_read_only=on` on every connection**, existing Students only: directory **200 / 23 active Teachers**, advisor reads **200** for all **4 Co-op Students**, **1 topic** read, **2 project file metadata records / 2 owner-checked file paths present**. No schema error, Local writes or raw Student/teacher/file data printed. Local `/health/db` **200**; unauthenticated real HTTP directory/advisor/topic/files all **401**, as expected. **Authenticated Local HTTP/browser acceptance was not performed**; controller/service checks and disposable authenticated HTTP acceptance are distinct evidence.
- No browser tool available; prior Chrome EPERM limitation retained. No browser visual/focus/native-picker PASS is claimed and no security setting was weakened. All user WIP retained; no commit/push/deploy/SSH/VMware/staging/production operation, `.env` or `.codex/config.toml` edit.

### Files changed in this task

- `frontend/src/student_coop/student_coop.html` - only project/upload panel card structure and accessible help/action markup.
- `frontend/src/styles/student_coop.css` - appended scoped project/upload styles and responsive rules.
- `frontend/src/pages/student_coop.js` - project advisor status/file metadata rendering only; workflow and preview implementation retained.
- `frontend/test/studentCoopProject.test.js` - stronger date regression plus both-card long-name/accessibility/preview test.
- This HANDOFF. **No backend/migration source was changed in this task.** Existing modified/untracked backend and frontend work comes from earlier checkpoints and remains intact.

### NEXT STUDENT_COOP TASK - exactly one

**Perform manual Chrome visual/native-interaction acceptance of the updated Project and Project Upload panels at desktop and mobile widths.** Check status readability, teacher selection, topic editing, long filenames, native file picker and secure preview using the existing Local user session. Recommendation only; **NOT STARTED**. Do not start another Student feature.

**STOP - authorized Local 014 rollout and requested UI fixes applied; automated/read-only acceptance passed, final StudentFiles preservation discrepancy reported.**

## Student project advisor request and topic independence - 2026-10-07

**CURRENT AUTHORITATIVE - Asia/Bangkok. IMPLEMENTATION / ISOLATED AUTOMATED ACCEPTANCE PASS. NEW MIGRATION 014 PENDING ON LOCAL.** This checkpoint supersedes the old business rule that Students could only view a Head-assigned project advisor. The prior Local rollout through 013 remains applied, and all earlier implementation/test history is preserved below. Real-browser acceptance is not claimed.

### Authoritative business rule and field semantics

- **Student chooses an active project Teacher -> pending request -> that Teacher explicitly accepts or rejects. `students.coop_advisor_teacher_id` becomes confirmed only after Teacher acceptance.** Selection, pending replacement and rejection never set this field. **`advisor_teacher_id` remains the separate class-advisor workflow and was not changed.**
- **Project Topic does not depend on advisor confirmation.** Students can save/edit/reload topics with no advisor, pending, rejected or confirmed status. Existing topic validation and failed-initial-read protection remain. The prior source already separated topic persistence from advisor assignment; the new request workflow preserves and tests that independence.
- A confirmed advisor cannot be replaced through Student selection. Pre-existing canonical confirmed assignments are displayed/locked without inventing request history. Changing confirmed advisors remains a separate, unimplemented business workflow.
- The old Head direct-assignment service now returns **409** with an explanation instead of writing the canonical field; keeping that write would bypass the new Teacher-confirmation requirement. The existing authenticated route remains to give old clients a clear response. No Head/Staff frontend was changed.

### Request persistence, history and concurrency

- New model/table **`CoopProjectAdvisorRequest` / `coop_project_advisor_requests`**, related to Student and requested Teacher. A request does not require a `coop_projects` row or a topic. This avoids requiring a topic submission just to select an advisor.
- Stores immutable request UUID, Student FK, `requested_advisor_teacher_id`, constrained `pending/confirmed/rejected/superseded` status, requested/confirmed/rejected/superseded timestamps, rejection reason and standard timestamps. API `none` means no request exists; it is not an unconstrained persisted status.
- Replacing pending/rejected selection supersedes the old row and creates a **new request ID**, preserving selection/rejection history. Selecting the same pending Teacher again is idempotent. A -> B -> A creates a fresh A request; the first A request can never be accepted again.
- Student selection, Teacher decision and existing topic writes lock the **Student row first**. Selection/decision then lock relevant request rows and recheck current DB state. Teacher activity and request ownership are checked from DB, not client IDs. Acceptance updates request state and canonical Student advisor in the same transaction; fault injection proves both roll back together.
- Only the requested Teacher can decide; another Teacher receives **404**, superseded/terminal requests **409**, inactive Teacher **403**. Double accept, accept/reject and Student-change/Teacher-accept races commit exactly one compatible result. Class advisor remains unchanged in these cases.
- Rejection requires the existing convention's nonempty reason (maximum 2,000 characters), retained/displayed on Student reads and preserved when the rejected row is superseded. Separate request rows hold this history; Coop Request approval audits were not reused or rewritten.

### APIs and authentication

- Student JWT/actor middleware reused unchanged. **GET `/api/student-coop/project-advisor-request`** returns `{advisor_request, confirmed_advisor}` with safe Teacher `{id,name}`, status, request ID, dates and rejection reason. **POST** at that path accepts only `{teacher_id}`; owner comes from authenticated Student, never a payload Student ID.
- Existing **GET/PUT `/api/student-coop/project`** remain the independent topic APIs; topic response retains `coop_advisor_teacher` for compatibility and also names it `confirmed_advisor`. Topic PUT still accepts only `{topic}` and rejects advisor/owner fields. Keeping advisor state at its own endpoint allows topics to work while new schema is pending or advisor reads fail.
- Existing Teacher login/JWT and `createRequireTeacher` middleware reused. New authenticated Teacher routes: **GET `/api/teachers/project-advisor-requests`** (own pending requests, bounded existing pagination); **POST `/api/teachers/project-advisor-requests/:id/accept`**; **POST `.../:id/reject`** with `{reason}`. Decisions use authenticated Teacher ID and immutable request ID. Teacher/Student roles cannot impersonate each other.
- Explicit safe Teacher attributes used for Student/request reads. No Teacher UUIDs are hardcoded, Staff are not directory choices, and no password/hash/privilege field is exposed in directory or request responses.
- Missing new schema returns a clear **503** on advisor operations. Actual HTTP tests with only migrations through 013 prove topic read/save/edit still succeed while advisor GET/POST return 503. No fake advisor status or hidden topic/database failure was introduced.

### Student UI and date correction

- Existing project selector now submits a request on a selection change when state is none/pending/rejected; confirmed selection is locked. Active options use unchanged `GET /api/teachers`. Status text shows no selection, requested Teacher/pending, confirmation, or rejection/reason.
- Independent request/directory loading failures preserve topic editing and current displayed advisor state, while disabling unsafe advisor selection. Request loading blocks duplicate submissions; actual save is followed by read-back. Failure/conflict reloads DB state, including confirmation racing a Student change. Existing shared messages/toast are used; no alert/confirm was added.
- Topic controls do not depend on request confirmation, directory availability or request-loading state. Thai topic create/edit/reload values from the request were verified through actual frontend API/page handlers, authenticated HTTP and disposable PostgreSQL; frontend-only coverage additionally checks all four advisor states.
- **`Invalid time value` FIXED:** the exact shared `formatDate` in this page previously appended `T00:00:00` to full ISO timestamps, creating an invalid date. It now appends only for date-only strings, accepts ISO timestamps and returns `-` for null/invalid values. Focused metadata-render regression uses the actual formatter. Book/Poster upload/storage/preview behavior was not refactored and existing regressions pass.

### Migration and persistent Local boundary

- New **`014_add_coop_project_advisor_requests.js`** only. Transactional UP creates request table/FKs, state/time checks, one-current-request-per-Student partial uniqueness and requested-Teacher/pending queue index. Student deletion cascades; Teacher deletion restricts to preserve references. DOWN takes an exclusive lock and refuses when any request/history exists; empty DOWN leaves all older tables/confirmed fields intact.
- Real PostgreSQL tests cover empty UP/DOWN/UP, injected UP/DOWN DDL rollback, FK/cascade/restrict, uniqueness, status/date/reason constraints and populated DOWN refusal. No old migration source was rewritten.
- **NEW MIGRATION APPLIED TO PERSISTENT LOCAL: NO.** Final read-only Local status: **14 executed / 1 pending (`014`)**; 007a/010/011/012/013 remain executed. Next rollout order is **013 (already executed) -> 014 (pending)**, subject to separate explicit Local authorization and backup. Source completion does not enable Local advisor requests before 014 is applied.
- Final Local schema confirms the new request table is absent, as intended. All eight base-table counts/fingerprints still match the preceding rollout baseline. Backend `/health/db` remains **200 / ok**. No persistent Local fixture/account/topic/request/file/privilege was written by tests; no sync, seed/reset or Local migration/rollback was run.

### Tests, build and limitations

- Focused backend: `node --test --test-isolation=none backend/test/coopProjectAdvisor.database.test.js backend/test/coopProjectAdvisorMigration.test.js`, with **`COOP_ADVISOR_DISPOSABLE_DATABASE_URL` only to guarded `fitm_advisor_test`**: **15 PASS / 0 FAIL / 0 SKIP**. Includes real Teacher bcrypt login/JWT authorization, state/history/concurrency/rollback, all topic states, pending-schema compatibility and actual frontend API/page bridge.
- Shared backend project/prerequisite/class-advisor/auth regression: `studentCoopProject.database`, `coopProjectMigration`, `studentAdvisor`, `roleAuth`, `coopPrerequisites`, `coopDirectWorkflow`, with **`COOP_PROJECT_DISPOSABLE_DATABASE_URL` only to guarded `fitm_project_test`**: **58 PASS / 0 FAIL / 0 SKIP**. Existing Book/Poster persistence/preview and class-advisor semantics pass.
- Role PostgreSQL regression, with **`ROLE_BACKEND_INTEGRATION_TEST=true` / `ROLE_DISPOSABLE_DATABASE_URL` only to guarded `fitm_role_test`**: **32 PASS / 0 FAIL / 0 SKIP**. The old direct-assignment acceptance assertion now checks 409/no advisor mutation. Obsolete migration-count assertions were changed to expected pending names / unchanged ledger snapshots; one initial run failed only that old hardcoded count, then the corrected suite passed.
- Required combined frontend `studentCoopProject`, `studentCoopPrerequisites`, `studentCoopAcceptance`, `studentCoopSavedAcceptance`, `studentAdvisor`, with **`COOP_UI_DISPOSABLE_DATABASE_URL` only to guarded `fitm_role_test`**: **83 PASS / 0 FAIL / 1 SKIP** (existing browser-only check). Latest focused project suite after adding duplicate-request/rejected-reselection coverage: **16 PASS / 0 FAIL**.
- Frontend build `npm.cmd --prefix frontend run build -- --configLoader native`: **PASS**, all seven entries. `node --check` for all **15 changed JS files**: **PASS**. `git diff --check`: **PASS**, line-ending notices only.
- Disposable container **`fitm_advisor_acceptance_20261007`**, PostgreSQL 16, no persistent volume, random **localhost-only** port; guards `fitm.a013_disposable=on` and `fitm.a014_disposable=on`. Test credentials/JWTs generated only for disposable fixtures and not printed. Test schemas/accounts/storage fixtures cleaned by suites; remaining disposable resources removed by stopping the auto-remove container. Container removal verified.
- Container Node 20 rejected the newer `--test-isolation=none` flag before tests began. Used existing host Node 24 / installed dependencies with the same disposable target instead; no dependencies or system/security/config changes. **No real-browser visual/native-interaction PASS is inferred from the HTML-derived DOM fixtures.**

### Files changed in this task

- New backend: migration 014; `src/models/coopProjectAdvisorRequest.model.js`; `src/services/coopProjectAdvisor.service.js`; `src/controllers/coopProjectAdvisor.controller.js`; `test/coopProjectAdvisor.database.test.js`; `test/coopProjectAdvisorMigration.test.js`.
- Existing backend: `src/routes/studentCoop.routes.js`; `src/routes/roleWorkflow.routes.js`; `src/services/studentCoopProject.service.js`; the direct-assignment method only in `src/services/roleWorkflow.service.js`; related assertions in `test/roleWorkflow.database.test.js`.
- Frontend: `src/api/studentCoop.api.js`; project section/shared date formatter in `src/pages/student_coop.js`; project section in `src/student_coop/student_coop.html`; `test/studentCoopProject.test.js`; `test/helpers/studentCoopProjectFixture.js`.
- This HANDOFF. All pre-existing user/Codex WIP retained. No changes to Student/Teacher/CoopProject model fields, class-advisor flow, prerequisites, Resume, file upload backend, Staff/Head frontend or Daily Log implementation. No commit/push/deploy/SSH/VM/staging/production access; no `.env`/`.codex/config.toml` change or external message/email.

### NEXT STUDENT_COOP TASK - exactly one

**Perform a separately authorized, backed-up Local migration 014 rollout with read-only schema/application verification.** Recommendation only; **NOT STARTED**. Do not apply it under this implementation task's authorization.

**STOP - advisor request implementation and isolated acceptance complete; new Local rollout and next task not started.**

## Local PostgreSQL migration rollout - 2026-10-06

**CURRENT AUTHORITATIVE - Asia/Bangkok, verified at approximately 23:50. LOCAL MIGRATION ROLLOUT PASS.** This checkpoint supersedes all earlier statements that persistent Local migrations 007a/010/011/012/013 are pending or not applied. Previous implementation, isolated acceptance and browser-limit history remains below. The user explicitly authorized these migrations on persistent **Local development only**. No VMware/staging/production access or deployment occurred.

### Local target, preflight and backup

- Read `git status --short`, the latest handoff, Compose, package scripts, database configuration and migration sources before rollout. All existing modified/untracked application and test work was preserved. Compose service **`postgres`**, container **`intern_postgres`**, PostgreSQL 16; expected database **`intern_system`**. Backend container **`intern_backend`** connects through Compose host `postgres`, port 5432. PostgreSQL was running/healthy, `pg_isready` passed, backend authentication passed, expected database identity was confirmed and recovery mode was false. Backend `/health/db` returned **200 / ok** before and after rollout.
- Initial ledger: **9 executed** (`001` through `009`, including `007`, excluding `007a`); **5 pending**, exactly `007a_create_missing_base_tables.js`, `010_cleanup_student_file_schema_drift.js`, `011_add_role_workflow_reviews.js`, `012_coop_prerequisites_and_direct_review.js`, `013_add_coop_projects_and_current_files.js`. No unknown migration or unexpected executed target was found.
- Read-only preflight confirmed all eight base tables already existed. Baseline counts: teachers **23**, students **4**, student_profiles **2**, student_files **3**, mentors **2**, mentor_tokens **16**, coop_requests **1**, coop_request_delivery_methods **3**. Aggregate fingerprints were recorded without printing row contents, identities, credentials or tokens.
- `student_files.storage_path`: **75 UNIQUE constraints / 75 backing unique indexes**, all valid/ready/live, **one shared signature**, hence **74 redundant equivalents**. Canonical `student_files_storage_path_key` was valid. Existing Resume partial uniqueness remained present. No duplicate Student/project-file category groups existed.
- `teachers.is_department_head`, both workflow review tables, `coop_request_prerequisite_courses` and `coop_projects` were absent. Coop Request statuses: **1 cancelled**, **0 staff_review**, **0 department_head_review**.
- Before the first migration, created a PostgreSQL **custom-format** backup with `pg_dump` inside `intern_postgres`, validated its archive with `pg_restore --list`, and copied it outside the repository. **pg_dump exit 0; archive check PASS; size 84,157 bytes.** Backup contents were never displayed, committed or uploaded.
- **Preserved Local backup path:** `C:\Users\suran\AppData\Local\Temp\fitm-intern-local-backup-20261006-b1d6f0dceff24a0eb18a08ed64fb97dd\intern_system_before_007a_010_011_012_013.dump`.
- Backup SHA-256: `C1BC9CBBF87E42E419AEF90A935660B607CB6F4FB64BDD3EC865004C8F356200`. The host copy was checked again after rollout; a second copy remains in `intern_postgres` at `/tmp/fitm_intern_before_rollout_20261006.dump`. These are temporary locations, not durable archival storage. No restore was needed or performed.

### Applied migrations and verification

- The existing CLI supports batch UP only. Used the project's existing **Umzug + SequelizeStorage** configuration (`src/db/migrations/*.js`, QueryInterface context, `sequelize_meta` ledger) with **`umzug.up({ migrations: [name] })`** in an ephemeral helper under backend `/tmp`, outside the source tree. The expected pending suffix and Local target were checked before each step. Every migration command exited **0**; after each step, its ledger entry occurred exactly once, expected schema invariants passed and baseline data fingerprints matched before proceeding. No ledger records were manually manufactured.
- **007a APPLIED / PASS:** all required base tables exist; all eight baseline counts/fingerprints preserved. Existing tables required no recreation or data removal. Ledger count became **10**.
- **010 APPLIED / PASS:** UNIQUE constraints and backing unique indexes **75 -> 1**; redundant equivalents **74 -> 0**. Retained valid/ready/live canonical **`student_files_storage_path_key`**. All **3 StudentFile rows** and their metadata fingerprints preserved. Ledger count became **11**.
- **011 APPLIED / PASS:** `teachers.is_department_head` is **boolean, NOT NULL, DEFAULT false**. All **23 Teacher rows** preserved; **0 Head flags true**, with no manual assignment. Both `coop_request_reviews` and `job_posting_reviews` have expected primary keys, actor/transition/reason checks, validated FKs with RESTRICT deletion / CASCADE updates, review-time indexes, request queue index and Student class-advisor index. Ledger count became **12**.
- **012 APPLIED / PASS:** prerequisite table exists with validated request FK (**ON DELETE/UPDATE CASCADE**), valid unique `(coop_request_id, course_code)` index, exact IT/INE program/course checks and status/grade checks. Review Student FK and actor checks exist. New transition/reason checks intentionally retain the migration's **NOT VALID** state, preserving historical evidence while enforcing new writes. Schema supports **Student -> Advisor -> Department Head**; Staff has cancellation rather than an approval stage. **staff_review before 0 / after 0; department_head_review before 0 / after 0; requests converted 0.** Existing cancelled request and audit history preserved; no fabricated decisions. Ledger count became **13**.
- **013 APPLIED / PASS:** `coop_projects` exists with UUID PK, required Student FK (**ON DELETE/UPDATE CASCADE**), valid unique Student index, required `topic varchar(500)` and trimmed 1-500 topic check, required creation/update timestamps with CURRENT_TIMESTAMP defaults. Valid partial unique `student_files_current_coop_project_unique` covers `(student_id, file_type)` for Book/Poster. StudentFile rows preserved. Ledger count became **14**.
- Final `npm run db:migrate:status`: **14 executed / 0 pending**, including **007a/010/011/012/013**. No migration failed; no DOWN, restore, random ALTER, Sequelize sync, reset or seed was run.

### Read-only application compatibility and Student Coop smoke

- All seven actual Sequelize models queried Local successfully: **Teacher, Student, StudentProfile, StudentFile, CoopRequest, CoopRequestPrerequisiteCourse, CoopProject**. Teacher query explicitly confirmed `is_department_head` was selected and false; no missing-column/table errors. Empty new prerequisite/project tables were queried successfully without inserting fixtures.
- Application probes used dedicated connections with **`SET SESSION default_transaction_read_only = on`**, verified on the probe connection. Actual read controllers returned **200** for Teacher directory (**23 active**), Student Profile with advisor relations, existing Coop Request list (**1**) and existing request detail with delivery/prerequisite/review associations. Actual prerequisite/review associations loaded successfully (**0 / 0**, as expected for the legacy request).
- Actual project read service passed with the existing Student and an empty saved topic; current Book/Poster metadata service passed with **2 existing files**, and verified no `storage_path` field in returned public metadata. Response contents, account identifiers and personal data were not printed. These are controller/service probes; they bypass authentication and are **not authenticated HTTP/browser acceptance**.
- Existing backend root and `/health/db`: **200**. All five probed protected GET paths (Teacher directory, Student Profile, request list, project, project-files) returned expected **401** without a token. **Authenticated HTTP/browser smoke remains PENDING: no existing authenticated session was available.** No passwords were manufactured/reset, JWTs minted, new users created or account privileges changed.
- Backend remained running and PostgreSQL healthy. Filtered backend log inspection over the final **15 minutes found 0 schema/connectivity/migration error lines**; raw logs were not printed. No restart/rebuild was necessary.
- After all probes, all eight baseline counts/fingerprints still matched. New project, prerequisite and both audit tables remain empty. **Local data modified by tests: NONE.** No write acceptance tests ran against persistent Local; no real file, topic, request, advisor, cancellation or audit decision was changed by tests.

### Files and operational boundary

- **This task changed only `HANDOFF_fitm-intern.md`. MIGRATIONS MODIFIED: NONE.** Existing source/test WIP retained. Temporary helper and fingerprint evidence remain only in backend `/tmp`; backup remains outside Git.
- `git diff --check`: **PASS** (existing line-ending notices only). No commit/push/deployment, SSH/VM/staging/production access, external message/email, dependency installation, `.env` or `.codex/config.toml` change occurred.
- Two initial probe-harness issues (PowerShell native argument quoting and Sequelize special table/SHOW result formatting) were corrected only in temporary probes before relying on their results; they were not migration/application defects and caused no database writes.

### NEXT TASK - exactly one

**Complete authenticated real-browser Student Coop acceptance in isolated disposable infrastructure when a browser runner is available, covering saved prerequisites/history, topic save/reload and Book/Poster new-tab previews.** Recommendation only; **NOT STARTED**. Persistent Local write acceptance remains separately authorized work.

**STOP - authorized Local rollout complete; next task not started.**

## Student Co-op Project + Project Files - 2026-10-06

**CURRENT AUTHORITATIVE - Asia/Bangkok. Implementation and AUTOMATED ACCEPTANCE PASS. REAL BROWSER ACCEPTANCE BLOCKED.** The two existing Student sections (โครงการสหกิจศึกษา and อัปโหลดโครงการ) now connect frontend/API/backend to PostgreSQL and private file storage, with read-back. This supersedes their historical UI-only classifications below. **Persistent Local migrations NOT APPLIED**: source completion does not mean the existing Local database has the new schema. All previous prerequisite, request, advisor, Resume and other history is retained.

### Project Advisor and exact Teacher directory result

- Read-only Local inspection through `intern_backend` used an explicit `SET TRANSACTION READ ONLY` transaction and selected only Teacher `academic_title`, `first_name`, `last_name`, `status`. **23 records, all active; exact 23/23 required faculty match; no missing/extra names.** Neither คุณลัดดา ตั้งเกียรติศิริ nor คุณอุไรวรรณ วัตรยิ่ง appears in teachers. No account, UUID, email or password was created/changed in Local.
- Verified list: ผศ.ดร.ขนิษฐา นามี; ผศ.พีระศักดิ์ เสรีกุล; รศ.ดร.อนิราช มิ่งขวัญ; ผศ.สมชัย เชียงพงศ์พันธุ์; ดร.ประดิษฐ์ พิทักษ์เสถียรกุล; ผศ.ดร.สุปีติ กุลจันทร์; ผศ.ดร.วันทนี ประจวบศุภกิจ; รศ.ดร.ยุพิน สรรพคุณ; ผศ.ดร.พาฝัน ดวงไพศาล; ดร.วัชรชัย คงศิริวัฒนา; ผศ.นิมิต ศรีคำทา; ผศ.นพดล บูรณ์กุศล; ผศ.ดร.อรบุษป์ วุฒิกมลชัย; ผศ.ดร.สิวาลัย จินเจือ; ผศ.ดร.บีสุดา ดาวเรือง; ผศ.ดร.นิติการ นาคเจือทอง; ผศ.ดร.สุพาภรณ์ ซิ้มเจริญ; ผศ.นพเก้า ทองใบ; ผศ.ดร.นัฎฐพันธ์ นาคพงษ์; ผศ.ดร.ศรายุทธ ธเนศสกุลวัฒนา; อ.ดร.ศิรินทรา แว่วศรี; อ.ดร.กาญจน์ ณ ศรีธะ; อ.ดร.พิทย์พิมล ชูรอด.
- Reused unchanged `GET /api/teachers` and its explicit safe attributes/active filter. No default Teacher SELECT or `is_department_head` column added to Student queries. Automated HTTP directory tests assert count/names, exclude inactive Teacher/Staff and auth fields, and inspect generated SQL for compatibility.
- **Authorization conflict resolved by preserving the backend rule:** the old Student dropdown suggested self-assignment, but `coop_advisor_teacher_id` belongs to the existing privileged Department Head assignment workflow. The dropdown now loads actual Teacher names and displays the assigned project advisor **disabled/read-only**, with explanatory text. A directory failure preserves the assigned advisor returned by the project API. No Student assignment/request privilege added. Class advisor `advisor_teacher_id` remains separate and untouched; topic payload rejects either advisor field.
- Project read-back fetches the current Student relation using only Teacher `id`, `academic_title`, `first_name`, `last_name`, returning `{id,name}`. No duplicate advisor column in projects.

### Project Topic persistence and APIs

- New `CoopProject` model/table `coop_projects`: UUID PK, required Student FK with CASCADE, unique Student, `topic varchar(500)`, timestamps. One project per Student. No appropriate existing topic field/API was present in the scoped models/routes.
- New authenticated routes under `/api/student-coop`: **GET `/project`**, **PUT `/project`**, **GET `/project-files`**, **POST `/project-book`**, **POST `/poster`**, **GET `/project-files/:id/preview`**. Uses existing Student JWT/actor middleware, then checks the authenticated Student exists and is `co_op`. Client Student IDs are never used.
- Topic PUT accepts only `{topic}`; trims, rejects blank/non-string/over-500/control-character values and extra fields. Student-row transaction lock serializes creation/update; unique Student index is the database backstop. Response returns saved topic and current assigned project advisor. Topic saving works without requiring a directory load or advisor assignment.
- Frontend loads on authenticated dashboard startup, saves/edits through the new API, reads back afterward and shows persisted values in a fresh page fixture. Initial read failure disables saving to prevent overwriting an unseen topic. Save loading disables duplicate submissions/edits and restores controls. Existing shared feedback is used.

### Project Book and Poster storage, replacement and preview

- Reused `StudentFile` types **`coop_project_book` / `coop_poster`**, UUID storage filenames and existing `projectBooks` / `posters` owner directories. Book: **PDF only**. Poster: **PDF, PNG, JPEG/JPG**. Maximum **10MB per file**. No second storage system or public static file URL.
- Multipart field `file` only; extra owner/body fields rejected. Extension/MIME allowlist, nonempty size limit, actual PDF/PNG/JPEG header signatures and physical-size check run before metadata commit. Traversal/control-character filenames rejected; original names retained for display. A confirmed multipart Latin-1 parsing issue was reproduced with a Thai filename and fixed by decoding valid UTF-8 filename bytes safely; Thai filename metadata and inline response now pass.
- Student lock + transactional category-row update/create serialize concurrent first uploads and replacements. New partial unique index ensures one current file per Student/category. A pre-existing duplicate causes migration UP to roll back without deleting files or evidence.
- Before transaction/commit failure, remove only the authenticated category's staged new file. After commit, preserve the committed file even if old-file cleanup fails; clean old files only after successful commit. Fault tests cover first metadata failure, replacement metadata failure, commit rejection, post-commit cleanup failure and concurrent uploads. A failed old cleanup can leave a superseded file for later cleanup, never a missing committed reference; no unrelated Resume cleanup code changed.
- File list exposes only ID/type/original name/MIME/size/updated date, never `storage_path` or absolute paths. Preview requires authenticated ownership, allowed project category/MIME and a valid file UUID; other-owner/unknown IDs return 404. Lexical paths and realpaths must remain inside the owner's category and storage root; malformed/tampered paths cannot escape. Preview returns correct MIME, `Content-Disposition: inline` with encoded safe UTF-8 name, `private, no-store` and `nosniff`.
- Existing upload section shows stored names/dates and empty states after reload, with เปิดดู buttons. Selected categories upload independently; a Book success remains visible if Poster fails. Duplicate submission/loading/success/error/input reset use existing shared feedback. No alert/confirm or dashboard redesign.
- Preview reserves a blank new tab synchronously in the click event, clears its opener, fetches the authenticated file Blob through the existing Bearer API client, creates an object URL and navigates the tab. URLs are revoked after tab close or parent `pagehide`; failed fetch/type/popup paths show errors and close unused tabs. No permanent unauthenticated URL or frontend filesystem URL construction. Native PDF/image display is implemented but **not real-browser verified**.

### Migration and persistent Local boundary

- Created **`013_add_coop_projects_and_current_files.js`** only. Transactional UP creates project FK/unique/topic constraints and project-file partial uniqueness. DOWN refuses to erase saved topics, removes the added index/table only on an empty project fixture, and preserves StudentFile metadata/bytes. Real PostgreSQL tests verify UP/DOWN/UP, injected DDL rollback, topic/FK/uniqueness checks, populated DOWN refusal, FK cascade and duplicate-file UP refusal.
- **MIGRATIONS APPLIED TO PERSISTENT LOCAL DB: NONE.** Pending rollout order remains **007a -> 010 -> 011 -> 012 -> 013**. Old migration sources/history unchanged; no ledger marking, Local schema alteration, Sequelize sync, reset or seed. Existing Local data/storage/containers untouched except the authorized read-only faculty inspection. Do not treat these two new sections as live Local persistence acceptance until separately authorized schema rollout.

### Tests and evidence boundary

- Backend with `COOP_PROJECT_DISPOSABLE_DATABASE_URL` pointing only to marked `fitm_project_test`: `node --test --test-isolation=none backend/test/studentCoopProject.database.test.js backend/test/coopProjectMigration.test.js backend/test/resumeUpload.test.js backend/test/studentAdvisor.test.js backend/test/roleAuth.test.js`: **33 PASS / 0 FAIL / 0 SKIP**. Includes 13 project HTTP/storage test entries, 5 real migration entries, 8 existing Resume, 3 advisor and 4 auth/route-loading checks.
- Project integration rerun after strengthening the frontend bridge to execute the actual new frontend API module (real FormData/Files and Blob), and using valid PDF/PNG/JPEG fixtures: **13 PASS / 0 FAIL**. Real authenticated HTTP, SQL read-back, physical bytes, owner denial, preview headers, Thai names and actual page handlers pass. Fresh HTML-derived DOM fixture reads the saved topic and both files. DOM/new-tab behavior is simulated; native rendering is not inferred.
- Frontend with `COOP_UI_DISPOSABLE_DATABASE_URL` pointing only to marked disposable `fitm_role_test`: `node --test --test-isolation=none frontend/test/studentCoopProject.test.js frontend/test/studentCoopPrerequisites.test.js frontend/test/studentCoopAcceptance.test.js frontend/test/studentCoopSavedAcceptance.test.js frontend/test/studentAdvisor.test.js`: **76 PASS / 0 FAIL / 1 SKIP** (real-browser test). Includes eight new project/upload/preview cases plus all required existing regressions and six saved-request PostgreSQL entries.
- Frontend build `npm.cmd --prefix frontend run build -- --configLoader native`: **PASS**, all seven existing entries. Changed JS/migration/tests `node --check`: **PASS**. `git diff --check`: **PASS** (line-ending notices only).
- Browser discovery found no browser tool/debugging listener; fresh generic Node spawn probe still returns **EPERM**. **REAL BROWSER ACCEPTANCE BLOCKED BY LOCAL ENVIRONMENT**. No repeated Chrome launch, Full Access, Windows security or `.codex/config.toml` change.
- Initial fixture failures (DOM appendChild modeling, shared Teacher fixtures in one test DB) were corrected in test setup. The one-time shell encoding issue in new Thai UI messages was corrected through Unicode-safe patches and covered by passing tests. Project and saved-request suites now use separate disposable databases. No dependencies installed.
- Disposable resource `fitm_project_acceptance_20261006`: PostgreSQL 16, localhost-only random port, no volumes; `fitm_project_test` and `fitm_role_test` guarded by `fitm.a013_disposable=on`. Migrations executed only there; migration tests also use owned random schemas. Temporary storage fixtures and project account fixtures cleaned by tests. Container stopped and automatically removed after checks. No secrets/passwords/tokens printed or stored as real credentials.

### Files changed in this checkpoint

- Backend: `src/app.js`; reusable upload factory export/options in `src/middlewares/upload.middleware.js` (existing Resume/Profile defaults retained); new `src/models/coopProject.model.js`, `src/services/studentCoopProject.service.js`, `src/routes/studentCoop.routes.js`, migration 013.
- Backend tests: new `test/studentCoopProject.database.test.js`, `test/coopProjectMigration.test.js`, `test/fixtures/coopFaculty.json` (required names only; generated test identities/auth values stay disposable).
- Frontend: `src/pages/student_coop.js`, `src/student_coop/student_coop.html`; new `src/api/studentCoop.api.js`, `test/studentCoopProject.test.js`, `test/helpers/studentCoopProjectFixture.js`; this HANDOFF.
- All pre-existing WIP retained. No Staff/Teacher/Head frontend, Daily Log, Mentor, prerequisite/request redesign, Resume source or unrelated Profile work. No commit/push/deployment/SSH/staging or configuration change.

### NEXT STUDENT_COOP TASK - exactly one

**Complete real-browser acceptance of project topic save/reload and Book/Poster new-tab previews when an isolated browser runner is available.** Recommendation only; **NOT STARTED**. Persistent Local migration rollout remains a separate authorization.

**STOP - the two requested sections are implemented and tested in isolated infrastructure; Local rollout and next task not started.**

## Student Co-op saved prerequisite acceptance - 2026-10-06

**CURRENT AUTHORITATIVE - Asia/Bangkok. AUTOMATED ACCEPTANCE PASS; REAL BROWSER ACCEPTANCE BLOCKED BY LOCAL ENVIRONMENT.** This checkpoint supersedes the progress-step description below and preserves all previous implementation and verification history. No persistent Local migrations, commit, push or deployment occurred.

### Automated acceptance and confirmed fixes

- Added `frontend/test/studentCoopSavedAcceptance.test.js`: the existing HTML-derived DOM/VM fixture runs actual Student submit, list/detail/history handlers through adapters invoking the actual backend controllers against guarded disposable PostgreSQL. Actual role workflow services perform Advisor/Head decisions and Staff cancellation, followed by frontend refresh/detail checks. This is not a browser or HTTP/auth-boundary test; non-request profile rendering remains mocked.
- IT renders and persists exactly five codes: `060243102`, `060243104`, `060243108`, `060243112`, `060243122`. INE renders and persists exactly five codes: `060233107`, `060233112`, `060233113`, `060233202`, `060233204`. Real database read-back and request detail assert saved program, canonical names, passed/B+, studying/null and unselected/null.
- Saved Request A remains unchanged after Student.major changes and Request B is submitted. Reopening A through its actual history action displays A's saved INE snapshot and grade independently of the current IT profile. Advisor approval refreshes to Head review; Head approval completes progress; Advisor/Head rejection and Staff cancellation appear in history with preserved course snapshots. Decision reasons/actors are checked in database audit records; no new review-history UI feature was added.
- Confirmed frontend bug: the approval bar omitted submission and left approved requests incomplete. Added failing regression first, then corrected it to four stages: submission, Class Advisor, Department Head, approval. `advisor_review` selects stage 2; `department_head_review` selects stage 3; approved/document-issued/in-progress complete all four approval stages. Existing document/work status labels remain. No Staff approval stage exists.
- Confirmed frontend bug: cancelled requests attributed cancellation to the Student even when Staff cancelled. Changed the label to neutral `ยกเลิกคำร้อง`. Rejected/cancelled requests remain in history rather than the active request panel.
- Modal reopen, duplicate-row/listener safeguards, both program switches, grades, stale-state protection, source alignment guards and class-advisor regressions pass in the automated fixture. Computed CSS and native browser interactions remain unverified.
- Test fixture setup corrections (explicit Umzug CommonJS migration resolver and waiting for asynchronous history-detail completion) were test-harness fixes, not backend defects. No backend/schema/HTML/CSS changes were made in this acceptance checkpoint; previous pending work remains intact.

### Real browser acceptance

- **NOT EXECUTED / BLOCKED.** No browser tool or debugging listener was available. A generic Node child-process probe returned `EPERM`; the earlier isolated Chrome launch failed with IPC access denied (0x5). Identical blocked Chrome launches were not repeated. No security setting, `.codex/config.toml` or Full Access change was made. Automated results must not be described as browser PASS.

### Verification and cleanup

- Frontend combined run: `node --test --test-isolation=none frontend/test/studentCoopPrerequisites.test.js frontend/test/studentCoopAcceptance.test.js frontend/test/studentAdvisor.test.js frontend/test/studentCoopSavedAcceptance.test.js`: **68 PASS / 0 FAIL / 1 SKIP** (browser skip). The saved acceptance suite contributes six passing test entries, including its parent, with `COOP_UI_DISPOSABLE_DATABASE_URL` set only to the guarded disposable database.
- Relevant backend prerequisite/direct-workflow run: `node --test --test-isolation=none backend/test/coopPrerequisites.test.js backend/test/coopDirectWorkflow.test.js`: **33 PASS / 0 FAIL**.
- `npm.cmd --prefix frontend run build -- --configLoader native`: **PASS**, all seven existing HTML entries. `node --check` for the changed page and both acceptance test files: **PASS**. `git diff --check`: **PASS**.
- Disposable PostgreSQL 16 container `fitm_coop_ui_acceptance_20261006` used no persistent volume, localhost-only dynamic port and database `fitm_role_test`, with `fitm.a013_disposable=on` guard. Repository migrations were applied only there. Container stopped and automatically removed after verification; existing Local database/container untouched.
- **Migrations applied to persistent Local DB: NONE.** Pending order remains **007a -> 010 -> 011 -> 012** for a separately authorized rollout. Existing migration history is unchanged. No Sequelize sync, persistent ledger edit, commit, push, deployment or unrelated task.
- Files changed in this checkpoint: `frontend/src/pages/student_coop.js`, `frontend/test/studentCoopAcceptance.test.js`, new `frontend/test/studentCoopSavedAcceptance.test.js`, and this HANDOFF.
- Exactly one next Student Co-op task: complete real-browser visual/native-interaction acceptance of saved detail/history and the four-stage approval progress when a browser runner is available. Not started.

## Co-op Request prerequisite persistence and corrected workflow — 2026-10-06

**CURRENT AUTHORITATIVE — Asia/Bangkok.** Backend/database migration source and frontend integration are complete and verified against disposable PostgreSQL. This supersedes the earlier conclusion that prerequisite persistence is absent. **Persistent Local migrations NOT APPLIED**: the new functionality requires schema rollout before use against the existing Local database. Existing implementation/alignment/Advisor/Resume history is preserved below; unrelated work not started.

### Corrected workflow and permissions

**Student → Class Advisor → Department Head → Approved.** Department Staff: **list/detail/history + pending cancellation only; NO request approval/rejection/forward gate.**

- Student create writes `advisor_review`; legacy `submitted` remains accepted by the class-advisor stage.
- Advisor approve: `advisor_review`/legacy `submitted` → `department_head_review`; reject → `rejected`. Authorization uses only `Student.advisor_teacher_id == authenticated Teacher.id`, not the separate project advisor.
- Head approve/reject from `department_head_review` → `approved`/`rejected`; explicit DB `is_department_head`, active Teacher and advisor-derived department scope retained. No free-text position authorization.
- Staff request approve/reject routes removed; forward route unavailable; service denies these Staff decisions with 403. New authenticated `POST /api/staff/coop-requests/:id/cancel` requires a nonblank reason (maximum 2000 characters), uses actor/Student/request locks and transaction, and appends review history. Pending `submitted`, `advisor_review`, legacy `staff_review`, and `department_head_review` can be cancelled. Approved/rejected/cancelled/document-issued/in-progress cannot.
- Staff default listing covers all canonical statuses for history/view access. Existing Job Posting Staff review and privileged project-advisor functions are unchanged.
- Existing `coop_request_reviews` mechanism now records Student submission, Student cancellation, Advisor decisions, Staff cancellation and Head decisions, including actor FK/role, decision, previous/next status, reason and timestamp. Student actor FK added; no duplicate audit system.
- Legacy `staff_review` enum/status references remain only for historical display, active-request detection, filters, safe legacy cancellation and migration/downgrade compatibility. It is never the next approval stage. Migration 012 moves existing pending `staff_review` requests to Head review without fabricating a human decision; original review records stay unchanged. New transition/reason checks use PostgreSQL `NOT VALID` to preserve old evidence while enforcing the corrected rules on every new insert/update.

### Persistence architecture and catalog

- New normalized `coop_request_prerequisite_courses` child table/model: UUID PK, required request FK with CASCADE delete/update, `program`, `course_code`, canonical Thai `course_name`, optional canonical `english_name`, allowed `status`, nullable `grade`, timestamps. Unique `(coop_request_id, course_code)` index also supports request detail retrieval. DB checks enforce program/code membership and status/grade consistency.
- Backend catalog owned in `backend/src/services/coopPrerequisites.js`; trust authenticated, transaction-locked `Student.major` only (`IT`/`INE`). Require exactly five active-program codes; reject duplicates, unknown/cross-program codes, invalid statuses, unsupported row properties and client name/program spoofing. Resolve canonical names server-side. Passed requires trimmed nonblank grade up to ten characters. Studying/unselected reject nonblank grades; blank non-passed grades normalize to null.
- Student request, all five prerequisite rows, delivery children and submission audit are created in the existing transaction/Student-lock boundary. Insertion/audit failures roll back. No unrelated Company master insertion or transaction refactor.
- IT: `060243102` การโปรแกรมคอมพิวเตอร์ / Computer Programming; `060243104` การเขียนโปรแกรมเชิงวัตถุ / Object-oriented Programming; `060243108` ระบบฐานข้อมูล / Database System; `060243112` การวิเคราะห์และออกแบบระบบ / System Analysis and Design; `060243122` เว็บแอปพลิเคชัน / Web Application.
- INE: `060233107` ระบบฐานข้อมูล; `060233112` วิศวกรรมข้อมูล; `060233113` การเขียนโปรแกรมคอมพิวเตอร์ขั้นสูง; `060233202` ปฏิบัติการวิศวกรรมเครือข่าย 2; `060233204` การออกแบบและการจัดทำเครือข่ายคอมพิวเตอร์.

### Detail/history and frontend

- Owner-scoped `GET /api/coop-requests/:id` returns request-owned `prerequisite_courses` in canonical code order, limited to program/code/names/status/grade, plus ordered audit reviews. Role detail also includes course snapshots. Student history reuses existing list/detail actions, with no second history system.
- Frontend sends only `{course_code,status,grade}` per course, mapping unselected local null to `unselected`. Removes the no-persistence warning and states that courses are saved with the request. Detail/history render the saved program, names, status and passed grade independently of current Student.major. Studying/unselected show no fabricated grade; old requests without snapshots show an explicit unavailable-history message.
- Existing dynamic program source/switching, validation, stale-state safeguards, shared feedback, class-advisor preservation and last-row CSS alignment remain intact. Progress steps now show Advisor → Head → Approved → document issued → started, with legacy Staff status labeled as historical.

### Migration safety and ordering

- Created **`012_coop_prerequisites_and_direct_review.js`**. Transactional UP adds the snapshot table, FK/unique/checks, review Student FK and corrected audit constraints, and promotes legacy pending Staff-stage requests to Head review. No request-status enum alteration is needed: `advisor_review`, `department_head_review` and `cancelled` already exist.
- DOWN restores migration 011 checks and drops added schema only on an empty/safe fixture. It acquires exclusive locks and refuses when snapshots, Student/cancellation/direct-review evidence or pending Head-review requests would be lost or ambiguously downgraded. Injected DDL failure rolls UP back atomically.
- **Migrations applied to persistent Local DB: NONE.** Known pending ordering for a later separately authorized rollout: **007a → 010 → 011 → 012**, retaining already-applied ledger history. 011 is required for review tables/head privilege before 012. Old migration files 007a/010/011 are unchanged; no persistent Local ledger edit, rollback, manual schema alteration or Sequelize sync.
- SQL tests used a separately named PostgreSQL 16 container from the already installed image, no volume or connection to `intern_postgres`, bound only to localhost and marked disposable. Test guards verified database names and the disposable setting before any DDL. Migration tests used an isolated random schema; role tests used only `fitm_role_test` in that disposable server. Container removed after completion. Narrow sandbox execution approval was used solely to start/stop that test container; no security/configuration change.

### Final verification

- Backend focused/controller/workflow/company/auth/advisor: `node --test --test-isolation=none backend/test/coopPrerequisites.test.js backend/test/coopDirectWorkflow.test.js backend/test/coopRequestCompany.test.js backend/test/roleAuth.test.js backend/test/staffAuth.test.js backend/test/studentAdvisor.test.js`: **54 PASS**.
- Real migration suite: with `COOP_DISPOSABLE_DATABASE_URL` set only to the guarded disposable test server, `node --test --test-isolation=none backend/test/coopPrerequisiteMigration.test.js`: **5 PASS**. Includes real PostgreSQL UP/DOWN, injected DDL rollback, uniqueness/program/status/grade checks and destructive rollback refusal, plus isolated QueryInterface regressions.
- Real shared workflow regression: with `ROLE_BACKEND_INTEGRATION_TEST=true` and `ROLE_DISPOSABLE_DATABASE_URL` pointing only to disposable `fitm_role_test`, `node --test --test-isolation=none backend/test/roleWorkflow.database.test.js`: **32 PASS**. Includes Advisor/Head permissions/transitions, actual concurrent decisions, authenticated Staff cancellation/race/terminal protection, real IT/INE create/read-back/history, foreign-owner denial, Request A stability after major change and Request B, concurrent Student create (one 201/one 409, five rows/one audit), and real transaction rollback on child insertion failure. Existing shared-role regression included because the workflow service/router changed; no unrelated implementation added.
- Frontend: `node --test --test-isolation=none frontend/test/studentCoopPrerequisites.test.js frontend/test/studentCoopAcceptance.test.js frontend/test/studentAdvisor.test.js`: **56 PASS / 0 FAIL / 1 SKIP**. Payload inclusion and canonical keys, both program switches, grades, historical snapshot through actual history/detail binding, alignment guard and all eight advisor tests pass. Browser test remains skipped under the previously documented environment blocker; no real-browser PASS claimed.
- `npm.cmd --prefix frontend run build -- --configLoader native`: **PASS**, all seven entries. All changed JS/migration/test syntax checks: **PASS**. `git diff --check`: **PASS**.
- Initial SQL test issues were fixture-only: Sequelize schema qualification, missing generated test signing secret, non-JSON 404 handling after removed routes, cancellation HTTP method and Student email-domain fixture validity. Corrected only test setup; final results above pass. Existing Local data/secrets were not inspected or modified.

### Files changed in this task and preserved boundary

- Backend: `src/controllers/coopRequest.controller.js`; `src/models/coopRequest.model.js`, `coopRequestReview.model.js`, new `coopRequestPrerequisiteCourse.model.js`; `src/routes/roleWorkflow.routes.js`; `src/services/roleWorkflow.service.js`, new `coopPrerequisites.js`; new migration 012.
- Tests: new `backend/test/coopPrerequisites.test.js`, `coopDirectWorkflow.test.js`, `coopPrerequisiteMigration.test.js`; updated `coopRequestCompany.test.js`, `roleWorkflow.database.test.js`; updated `frontend/test/studentCoopPrerequisites.test.js` and `studentCoopAcceptance.test.js`.
- Frontend: `src/pages/student_coop.js`, `src/student_coop/student_coop.html`; this handoff. Existing last-row CSS fix, Resume controller/test work and advisor tests preserved; no new CSS/config changes.
- No commit/push/deployment/SSH/staging action, unrelated reset/discard or untracked cleanup. No role frontend redesign or other Student workflow started.

### NEXT STUDENT_COOP TASK — exactly one

**Run isolated browser acceptance of saved prerequisite history and corrected Advisor/Head progress steps using safe test APIs.** Verify Request A versus Request B snapshots, both programs and legacy empty-history display once a browser runner is available. **Recommendation only — NOT STARTED.**

**STOP — persistence/workflow implementation complete and tested on disposable PostgreSQL; persistent Local migration rollout and next task not started.**

---

## Prerequisite last-row alignment fix — 2026-10-06

**CURRENT AUTHORITATIVE — Asia/Bangkok.** Shared prerequisite-table alignment bug fixed with a minimal CSS change. All previous implementation/acceptance history remains below. No prerequisite logic, course data, HTML, advisor/Resume logic, backend, migration or Codex configuration change.

- **Root cause:** actual generated IT/INE rows all have the same three-cell structure (`td` name, `td > input` grade, `td > select` status), with no final-row wrapper/class/inline-style difference. `.coop-course-table tbody tr:last-child td` incorrectly applied `text-align: center` and muted color to every final-row cell, overriding the shared `.coop-course-table td { text-align: left; }`. This placeholder styling affected real course rows.
- **Fix:** keep the existing last-row border removal only. Move centered/muted placeholder styling to `.coop-course-table td[colspan]`. Every ordinary course cell now inherits the shared left alignment; full-width unavailable-data placeholders remain centered. No course-specific or final-course alignment override added.
- **IT: PASS in DOM/CSS regression checks**, exact codes `060243102`, `060243104`, `060243108`, `060243112`, `060243122`; all five have identical cell structure/no alignment overrides and use the shared left-alignment rule.
- **INE: PASS in DOM/CSS regression checks**, exact codes `060233107`, `060233112`, `060233113`, `060233202`, `060233204`; same uniform structure and shared alignment for all five.
- Added two actual-render-function DOM structure checks (one per program) and one focused CSS guard in `frontend/test/studentCoopAcceptance.test.js`. Before the CSS fix, the guard failed on the offending last-child rule; after the fix it passes. It protects shared left alignment and rejects row-position alignment/layout overrides.
- `node --test --test-isolation=none frontend/test/studentCoopPrerequisites.test.js frontend/test/studentCoopAcceptance.test.js frontend/test/studentAdvisor.test.js`: **55 passed / 0 failed / 1 skipped**. IT/INE switching, status/grade validation/stale-state behavior, surrounding request simulation and all eight advisor tests pass.
- `npm.cmd --prefix frontend run build -- --configLoader native`: **PASS**, all seven entries. `node --check frontend/test/studentCoopAcceptance.test.js`: **PASS**. `git diff --check`: **PASS**.
- **Visual/browser verification remains BLOCKED BY LOCAL ENVIRONMENT**, as documented in the preceding acceptance checkpoint (Node spawn EPERM and Chrome IPC access denied). No repeat blocked launch, security/permission weakening, Full Access or configuration edit. DOM/CSS checks are not claimed as browser-computed layout acceptance.
- Task changes only `frontend/src/styles/student_coop.css`, `frontend/test/studentCoopAcceptance.test.js` and this checkpoint. Pre-existing work preserved. **007a/010/011 unchanged; no schema/persistence/migration action, commit, push or deployment.**

**STOP — alignment fix complete; no further Student Co-op feature started.**

---

## Student Co-op prerequisite acceptance — 2026-10-06

**CURRENT AUTHORITATIVE — Asia/Bangkok. BROWSER ACCEPTANCE: BLOCKED BY LOCAL ENVIRONMENT.** The strongest available local acceptance simulation passes; this is **not a real-browser PASS**. No confirmed application regression was found and no production HTML/JS, prerequisite implementation or advisor logic was changed. Previous implementation/history remain intact. Persistence/migration work was not started.

### Browser environment investigation

- Chrome and Edge are installed and running, but there is no exposed browser tool/connector or listener on common debugging ports 9222/9223. Normal browser profiles/sessions were not inspected or attached to.
- A minimal Node child-process probe (`spawnSync(process.execPath, ['--version'])`) returned **EPERM**, demonstrating a process-spawn restriction broader than Chrome. Did not repeatedly retry the previous Node browser-launch method.
- Tried one different safe launch via PowerShell `Start-Process -WindowStyle Hidden` with headless Chrome, an isolated newly created temporary profile and a local minimal DOM probe. Chrome produced no DOM output and terminated before rendering: `FATAL: mojo/public/cpp/platform/platform_channel.cc:112 ... Access is denied. (0x5)`; crashpad also reported `CreateFile: Access is denied. (0x5)` and self-termination. This establishes an additional IPC/process startup blocker; it does not identify which host security mechanism enforces it.
- **BROWSER ACCEPTANCE BLOCKED BY ENVIRONMENT.** No sandbox/config/security change, Full Access, software installation, escalation, browser security disabling or normal-session mutation was used. CSS/layout/native browser validation/focus accessibility remain unverified.

### Stronger safe local simulation

- Added only `frontend/test/studentCoopAcceptance.test.js`. Parses the actual `student_coop.html` into an HTML-derived DOM model with a hierarchy, selectors, real option text/value fallbacks, form resets, class/ARIA state, disabled controls, and multiple event callbacks. Executes the entire existing Co-op Request section including its real event bindings, actual Profile reload function and actual shared `ui/feedback.js` code. APIs/timers and non-request Profile rendering remain controlled mocks.
- This is explicitly a **simulation**, not a browser or live API/database acceptance. It improves on the prior flat DOM fixture by exercising surrounding modal/request/feedback functions instead of stubbing them. Production implementation and existing focused prerequisite/advisor tests were not modified.
- New coverage: **17 acceptance scenarios / 20 passing Node test entries including three parents**. Initial harness runs exposed source-line-ending and dynamically assigned option-value modeling gaps; these were corrected in the new test fixture only, not in application code.

### Acceptance results — simulation only

- **IT PAGE: PASS.** Exactly `060243102`, `060243104`, `060243108`, `060243112`, `060243122`; no INE row.
- **INE PAGE: PASS.** Exactly `060233107`, `060233112`, `060233113`, `060233202`, `060233204`; no IT row.
- **IT → INE: PASS.** Actual mocked Profile reload replaces all rows, exactly five INE codes, no duplicates, no stale status/grade.
- **INE → IT: PASS.** Same reload mechanism restores exactly five IT codes, no INE row, no stale status/grade or previous IT values.
- **IT and INE interactions: PASS.** For a course in each program: passed + grade submits; passed without grade prevents the mock API call and displays actual in-page feedback; studying clears/disables grade and submits; a single selected status ensures mutual exclusivity; unselected submits as allowed.
- **Submission safety: PASS.** Local normalized data contains only each program's exact five codes. Both programs' passed submissions omit `prerequisite_courses` from the existing API payload; company and delivery fields remain intact. Actual form notice still explains that prerequisites are not saved/attached.
- **Surrounding request regression: PASS in simulation.** Modal opens via its actual button binding; readonly Student/class-advisor data display; mocked company search renders and selecting the result applies company name/province/address/ID; manual-company mode remains usable. Required fields, delivery selection and work dates reject invalid requests. Actual form submit event reaches existing create-request path and displays shared toast/in-page feedback. Header close, footer cancel, backdrop and Escape close without submission. Five reopen cycles per program retain exactly five rows, one create-button listener and one form-submit listener, with exactly one API call per submit.
- Browser-default submit-button behavior, visual layouts and real user interactions remain **PENDING**, even though their application event path passes simulation.
- **Advisor regression: PASS, eight existing tests**, including directory failure preservation, explicit change and explicit clear. Advisor logic unchanged.

### Tests/build

- `node --test --test-isolation=none frontend/test/studentCoopPrerequisites.test.js frontend/test/studentAdvisor.test.js frontend/test/studentCoopAcceptance.test.js`: **52 passed / 0 failed / 1 skipped**. The skipped opt-in Chromium test remains unavailable; no browser PASS inferred from simulation.
- `npm.cmd --prefix frontend run build -- --configLoader native`: **PASS**, all seven existing entries, including Student Co-op. Uses the previously verified native loader without modifying build configuration.
- `node --check frontend/test/studentCoopAcceptance.test.js`: **PASS**. `git diff --check`: **PASS**. No backend changes or backend test run required.

### Persistence, migration and Git boundary

- Prerequisite persistence remains **NOT IMPLEMENTED — schema/API support absent; a migration is still required**. No fake storage, unrelated-column reuse, backend contract/model change or persistence test was added.
- **007a unchanged; 010 unchanged; 011 unchanged.** No migration execution, rollback, schema alteration, ledger change or Sequelize sync. No production/staging data write or real API/email action; secrets/config/security settings untouched.
- Task files changed: the new acceptance test and this handoff checkpoint only. Initial pre-existing modified handoff, Resume controller, Student page/HTML and untracked Resume/advisor/prerequisite tests are preserved. No commit, push, deployment, SSH/staging operation, unrelated reset/discard or untracked cleanup.

### NEXT STUDENT_COOP TASK — exactly one

**Complete real-browser acceptance of the Student Co-op prerequisite form and surrounding request modal once an isolated browser runner is available.** Use safe mocked APIs to verify visual/native interactions, both Profile program transitions and repeated reopen behavior. **Recommendation only — NOT STARTED.**

**STOP — local acceptance simulation complete; browser acceptance remains blocked; next task not begun.**

---

## Student Co-op prerequisite courses — 2026-10-06

**CURRENT AUTHORITATIVE — Asia/Bangkok.** Frontend prerequisite-course behavior is implemented in the existing Co-op Request create modal. Persistence remains **NOT IMPLEMENTED: schema/API support absent**. This checkpoint supersedes the preceding NEXT TASK for current priority only; Class Advisor Preservation and Resume fixes are complete and preserved. Student Profile persistence acceptance was **NOT STARTED**. All previous history remains below.

### Implementation and program source

- Modified `frontend/src/student_coop/student_coop.html` and `frontend/src/pages/student_coop.js`; added `frontend/test/studentCoopPrerequisites.test.js`. Existing table/modal styles and unrelated sections are retained. No new program selector, dependency, package script or config change.
- The source is **Student.major**, returned as `result.student.major` by the existing Profile API and held in `currentStudent.major`. Existing Profile selector values are exactly `IT` and `INE`. Detect only those exact values; unknown/missing values show an unavailable message, never default to IT. Unsaved Profile selector edits do not change the request's program.
- Actual `loadStudentProfile()` refresh calls the prerequisite synchronization after assigning the returned Student. Successful Profile major saves already use this reload. Modal open/reset also synchronize/reset state; serialization rechecks the current program immediately before validation/submission.
- Render course rows keyed by `course_code`, with Thai course names and the supplied IT English names. One status selector per course offers unselected, `passed` (ผ่านแล้ว), or `studying` (กำลังศึกษา / currently registered this term). A single selected value provides mutual exclusivity. Passed requires a nonblank grade; studying/unselected clear and disable grade and do not require it. Unselected remains allowed because the original form had no course-status requirement.
- Normalize form data as `{ course_code, course_name, status, grade }`; only active-program codes are serialized. Any program change clears the map and replaces all rows, including previously entered values when switching back. Same-program Profile refresh preserves edits. Detached-row events cannot modify replacement state. Submission loading restores grade disabled/required behavior when controls rerender. Errors use existing in-page `showMessage`, with no native alert/confirm.

### Exact IT course list — PASS in controlled DOM

1. `060243102` — การโปรแกรมคอมพิวเตอร์ / Computer Programming
2. `060243104` — การเขียนโปรแกรมเชิงวัตถุ / Object-oriented Programming
3. `060243108` — ระบบฐานข้อมูล / Database System
4. `060243112` — การวิเคราะห์และออกแบบระบบ / System Analysis and Design
5. `060243122` — เว็บแอปพลิเคชัน / Web Application

### Exact INE course list — PASS in controlled DOM

1. `060233107` — ระบบฐานข้อมูล
2. `060233112` — วิศวกรรมข้อมูล
3. `060233113` — การเขียนโปรแกรมคอมพิวเตอร์ขั้นสูง
4. `060233202` — ปฏิบัติการวิศวกรรมเครือข่าย 2
5. `060233204` — การออกแบบและการจัดทำเครือข่ายคอมพิวเตอร์

### Switching, validation and focused coverage

- **IT → INE: PASS.** Execute actual Profile reload with mocked IT/INE API responses; all five IT rows disappear, exactly five INE rows appear, and status/grade state is empty.
- **INE → IT: PASS.** All INE rows disappear, exactly five IT rows appear; no INE state or previous IT values reappear. These are controlled-DOM runtime results, not a claim of real-browser acceptance.
- Passed + grade: **PASS / accepted**. Passed without grade or with whitespace: **PASS / rejected** with course code in existing in-page feedback. Studying: **PASS / grade cleared, disabled, optional**. Mutual exclusivity: **PASS**. Unselected optional behavior: **PASS**.
- IT/INE normalized form payloads: **PASS**, only active codes. Foreign map entries are excluded; studying grades are normalized to null. Serialization catches a changed program even before a render refresh. Unknown programs produce no invented courses. Same-program reload and unsaved Profile selector behavior are covered.
- Existing company/date/delivery/signer/advisor/detail/history/Mentor section IDs remain present in the actual HTML. Existing eight Class Advisor Preservation tests also pass. No live company/mentor/request/auth mutation or full visual/browser regression is claimed.

### Persistence gap and boundary

- Inspected existing frontend API payload, backend `coopRequest.routes.js`, normalization/create/read controller, `CoopRequest` model and relevant schema migrations. There is no prerequisite/course-grade field, child relation or JSON storage in the current request schema/API. Existing review/delivery data are not appropriate storage for course results.
- **A new schema migration and corresponding API/model work would be required** to save/read back prerequisites. No migration/schema/backend change was made. No fake persistence tests or localStorage substitute was added.
- `getCoopRequestFormData()` includes normalized prerequisites for local validation, but the existing API request explicitly omits this unsupported field. The form visibly states that these results are checked locally only and are not saved or attached to the request. Existing successful request submission behavior remains available; request detail continues its truthful unavailable-grade message.

### Tests/build and runtime limits

- `node --test --test-isolation=none frontend/test/studentCoopPrerequisites.test.js frontend/test/studentAdvisor.test.js`: **32 passed / 0 failed / 1 skipped**, comprising 23 prerequisite scenarios, their parent test and eight advisor tests; opt-in real-browser runtime skipped by default. Uses actual page functions, actual Profile reload, normalized form serialization and submit handler with controlled DOM/API mocks; no database/persistence claims.
- Opt-in browser command with `COOP_TEST_BROWSER` pointing to installed Chrome: **BLOCKED**, `spawnSync ... EPERM`. Browser fixture uses original HTML and the same actual page functions, stripped of external resources/application startup; no real API/data writes. Real-browser layout/interaction acceptance remains pending. Docker commands also denied access to the Docker pipe.
- Default `node --test` isolation: blocked by child-process `spawn EPERM`; in-process isolation flag resolves the focused test runner restriction.
- `npm.cmd --prefix frontend run build`: default config-loader build **BLOCKED/FAIL** by spawn restrictions and native dependency bundling. `npm.cmd --prefix frontend run build -- --configLoader native`: **PASS**, all seven existing HTML entries including Student Co-op. No build configuration edits needed. PowerShell `npm` wrapper execution was restricted, so used `npm.cmd`.
- `node --check frontend/src/pages/student_coop.js` and `node --check frontend/test/studentCoopPrerequisites.test.js`: **PASS**. `git diff --check`: **PASS**. Backend unchanged in this task, so no new backend tests required or run.

### Migrations, preserved work and Git

- **007a/010/011 unchanged; no migration applied/rolled back, ledger change, schema alteration or sequelize.sync call.** No production/staging data modified, secrets exposed or environment files read/edited.
- Initial Git state: modified handoff, Resume controller and Student page; untracked Resume test, advisor backend test and frontend test directory. All previous Resume/advisor changes preserved. This task adds only the prerequisite HTML/page/test changes and this checkpoint.
- **No commit, push, deployment, SSH/VM or staging action.** No reset/discard or cleanup of unrelated/untracked work.

### NEXT STUDENT_COOP TASK — exactly one

**Run isolated browser acceptance of the Student Co-op prerequisite form and surrounding request sections when browser execution is available.** Exercise IT/INE Profile reloads, both switches, grade controls, missing-grade feedback and company/delivery/signer/advisor/detail/history layout using mocked APIs and safe fixtures. **Recommendation only — NOT STARTED.**

**STOP — prerequisite frontend task complete within the schema boundary; next task not begun.**

---

## Student class-advisor preservation fix — 2026-10-06

**CURRENT AUTHORITATIVE — Asia/Bangkok.** The confirmed unintended class-advisor clearing bug is **FIXED**, with focused frontend/backend regression tests. This section supersedes the prior recommended class-advisor task and the audit's open clearing blocker; previous Resume fix, audit and history remain intact below. No repeat Student audit or unrelated implementation. Privileged `coop_advisor_teacher_id`, projects, documents, Daily Log, review lifecycle, stopped role work and deployment remain outside this task.

### ROOT CAUSE

`loadTeachers` cleared the selector before requesting `GET /api/teachers`, leaving only an empty loading option on failure. Its finally block enabled that selector anyway. `saveStudentInfo` always included `advisor_teacher_id: studentAdvisorInput.value || null`, so an unrelated save turned an unavailable directory into a null assignment. Backend `updateStudentInfo` correctly accepts explicit null and therefore would clear the existing class-advisor FK.

### FIX / advisor preservation rule

- In `frontend/src/pages/student_coop.js`, track directory availability (`isTeacherDirectoryLoaded`) separately from explicit user selection (`hasAdvisorSelectionChanged`). Profile reload resets selection-change state to the persisted Student value.
- Preserve the known Profile advisor ID in the selector while loading, after load failure, and when the advisor is absent from the active directory. Its label uses the existing `advisorTeacher` when available, otherwise a current-advisor label; no fabricated Teacher ID or first-Teacher default. A fallback option is display-only/disabled until a real directory option exists.
- Failed/malformed directory loads keep the selector disabled. Unrelated major/year/GPA edits remain saveable. Successful directory loads enable selection as before, including the existing empty option for explicit clearing.
- Send `advisor_teacher_id` **only when a loaded directory has an explicit changed user selection**. Otherwise omit it. Existing backend semantics were inspected and verified by controller tests: only provided fields are copied into `updateData`, so omission preserves the DB value and bypasses unnecessary Teacher validation. No backend/API semantics changed.
- **Invariant:** directory options are not the source of truth for the persisted advisor; failed loading must never cause an unintended null. Explicit Student class-advisor change/clear remains allowed. This does not change the separate privileged Co-op project advisor.

### BEHAVIOR / focused regression results

New `frontend/test/studentAdvisor.test.js` uses node:test and executes the actual page profile/Teacher/save functions in a controlled VM/DOM, including select/change behavior and string-valued inputs. API/persistence effects are controlled mocks, with no browser or network dependency.

1. Existing advisor + successful directory + unchanged selection: omit advisor, preserve original — **PASS**.
2. Existing advisor + directory failure + unrelated major edit: retain advisor ID/name in disabled UI, omit advisor, save other field without clearing — **PASS**.
3. Successful directory + explicit new selection: send/persist selected ID and reload selection — **PASS**.
4. Explicit clear: send/persist null only following the user's empty-option selection — **PASS**.
5. No existing advisor: remain unassigned without automatic first-Teacher selection; explicit selection still works — **PASS**.
6. Persisted advisor absent from active directory: retain current display/value and omit unchanged field — **PASS**.
7. Malformed directory response: remain disabled, retain existing advisor, omit field — **PASS**.
8. No advisor + directory failure: unrelated save remains valid and no advisor key sent — **PASS**.

New `backend/test/studentAdvisor.test.js` verifies the unchanged actual `updateStudentInfo` controller with model mocks: omitted advisor preserves it while saving other fields; explicit change persists the new ID through `Teacher.findOne({ attributes: ["id"], where: { id, status: "active" } })`; explicit null remains allowed. **3 PASS**. Persistence assertions use controlled model state, not a claim of Local database/browser acceptance.

### TEACHER / migration compatibility

No Teacher endpoint/model query was changed or broadened. Directory attributes remain explicit and exclude `is_department_head`; advisor validation still selects only Teacher `id`, covered by the new backend test. **No migration/schema/ledger change; no migrations applied or rolled back.** Pending 007a/010/011 remain unchanged. No Local data write, sync, seed/reset, .env changes or credential output.

### TESTS RUN

- Before fix, `docker exec intern_frontend node --test --test-name-pattern 'directory failure preserves' test/studentAdvisor.test.js`: **1 expected failure**, reproduced loss of the current selector ID.
- After fix, `docker exec intern_frontend node --test test/studentAdvisor.test.js`: **8 passed / 0 failed / 0 skipped**. An initial full run exposed a test-fixture issue on repeated save (plain input mock retained numeric GPA); corrected the fixture to coerce values to strings as real DOM inputs do. Final run passes without changing unrelated production input handling.
- `docker exec intern_backend node --test test/studentAdvisor.test.js`: **3 passed / 0 failed / 0 skipped**.
- `docker exec intern_frontend npm run build`: **PASS**, all seven existing HTML entries. No dependencies/package scripts/config changed.
- `git diff --check`: **PASS**. Scope review: this pass changes only the Student page, the two new advisor test files and this handoff; pre-existing Resume controller/test work retained. No broader backend/NLP/Resume suite or full audit run.

### FILES CHANGED / Git boundary

- `frontend/src/pages/student_coop.js`: class-advisor display, directory/change state and safe payload handling.
- `frontend/test/studentAdvisor.test.js`: 8 controlled frontend scenarios.
- `backend/test/studentAdvisor.test.js`: 3 omission/change/clear controller regressions.
- `HANDOFF_fitm-intern.md`: this authoritative checkpoint; all prior history preserved.
- Initial Git state included the modified handoff, modified Resume controller and untracked `backend/test/resumeUpload.test.js`. Those existing changes are preserved; Resume source/tests were not edited in this pass. **No commit, push, deployment, SSH/VM or staging action.**

### NEXT RECOMMENDED TASK — exactly one

**Verify Student Profile detail save/read-back with focused persistence acceptance.** Cover existing validated Profile fields through save and reload using controlled test data, without role setup, migration rollout or unrelated Student features. **Recommendation only — NOT STARTED.**

**STOP — class-advisor preservation task complete; next task not begun.**

---

## Student Resume cleanup fix — 2026-10-06

**CURRENT AUTHORITATIVE — Asia/Bangkok.** The confirmed Resume post-commit cleanup bug is **FIXED**, with focused regression coverage. This section supersedes the previous audit's open Resume-cleanup blocker and recommended NEXT TASK; that audit and all earlier history are retained below. This is a bounded controller fix, not a new Student audit or a claim that the entire Resume workflow has completed browser/Local write acceptance. Teacher selector/class-advisor clearing remains unfixed. Staff/Teacher/Head work, account setup, migration rollout and deployment remain **STOPPED**.

### ROOT CAUSE / ownership boundary

- `POST /api/student-profile/resume`: authenticated multer writes the uploaded file before `uploadResume` runs. The controller validates the Student/storage path, then creates/replaces StudentFile metadata inside a Sequelize managed transaction.
- **Ownership transfers when the awaited managed transaction resolves successfully, after commit.** Native PDF/OCR extraction and the final `resume.update` of extraction metadata run afterward, outside that transaction.
- Previously, the outer catch unconditionally unlinked `uploadedFile.path`. A final extraction-status save failure therefore returned 500 and deleted the already committed file, leaving `StudentFile.storage_path` referencing a missing file. During replacement, the old file could already have been removed.

### FIX / confirmed invariant

- Added local `metadataCommitted = false` in `uploadResume`; set it to true immediately after the managed metadata transaction succeeds. Outer error cleanup now unlinks the new upload only when `!metadataCommitted`.
- **Before commit:** failed metadata insertion/update or rejected transaction commit still cleans the new file; transactional rollback leaves no new committed row and preserves a previous Resume reference/file on replacement failure. Existing missing-Student/invalid-path cleanup remains unchanged.
- **After commit:** extraction or extraction-status persistence errors cannot trigger cleanup of the committed new file. Existing cleanup of a superseded old file remains unchanged.
- **Confirmed invariant:** a committed StudentFile reference retains its physical file through post-commit error cleanup. Regression tests assert both the committed `storage_path` and actual temporary-file existence, for a new upload and replacement.
- API contract unchanged: extraction-status persistence failure still returns **500** with the existing message; metadata retains `extraction_status: pending` if that update fails. No fabricated ready/failed save, automatic recovery or new API behavior. An extraction exception with a successful status save still returns **200** with `failed` extraction status. Normal native/OCR success still returns **200 / ready**.

### REGRESSION TESTS ADDED

New `backend/test/resumeUpload.test.js` follows the existing node:test/model-mocking style, using a managed-transaction fake that separates staged and committed state. Student/StudentFile/transactions and native/OCR extraction are mocked; files are real fixtures under dedicated OS temporary directories, with bounded teardown. No Local DB/storage writes or external OCR/network calls.

1. Successful new upload: committed metadata, real file retained, native extraction **ready/pdf_text** — **PASS**.
2. Successful replacement: new file retained, old file removed, OCR fallback **ready/ocr** — **PASS**.
3. Metadata insert failure: rollback, no committed Resume row, new file removed — **PASS**.
4. Commit rejection after staged insert: no committed row, new file removed — **PASS**.
5. Replacement metadata failure: previous row/file retained, new upload removed — **PASS**.
6. Post-commit extraction-status save failure: unchanged **500**, committed row/new file retained — **PASS**.
7. Replacement post-commit extraction-status save failure: unchanged **500**, committed new file retained after old-file cleanup — **PASS**.
8. Extraction exception: stored upload still **200**, failed extraction status saved, file retained — **PASS**.

### TESTS RUN / results

- Before fix, `docker exec intern_backend node --test test/resumeUpload.test.js`: **6 passed / 2 failed**. Exactly the new-upload and replacement post-commit cleanup regressions failed, proving the suite catches the original defect.
- After fix, `docker exec intern_backend node --test test/resumeUpload.test.js test/resumeText.test.js`: **10 passed / 0 failed / 0 skipped** (8 new upload regressions + 2 existing text tests).
- `docker exec intern_backend node --check src/controllers/studentProfile.controller.js`: **PASS**.
- `docker exec intern_backend node --check test/resumeUpload.test.js`: **PASS**.
- `git diff --check`: **PASS**. Final diff/file-scope review covers only the controller, new regression suite and this handoff. No frontend build, broader backend/NLP suite or repeat Student audit required.

### FILES CHANGED / preserved work

- `backend/src/controllers/studentProfile.controller.js`: explicit committed metadata flag and guarded Resume catch cleanup only.
- `backend/test/resumeUpload.test.js`: focused failure/success regressions.
- `HANDOFF_fitm-intern.md`: this checkpoint prepended; previous audit/history and pre-existing handoff edits retained. Initial `git status --short` showed only the existing modified handoff.

### MIGRATIONS / operational boundary

**No migrations applied/rolled back; no schema, migration source or ledger changes.** Pending 007a/010/011 remain unchanged; no sequelize.sync, Local data write, seed/reset or real upload/email acceptance. No .env edits/contents or credentials exposed. No deployment, VM/SSH/staging action, commit or push.

### NEXT RECOMMENDED TASK — exactly one

**Fix Student class-advisor preservation when Teacher directory loading fails.** Prevent student-info save from unintentionally submitting `advisor_teacher_id: null` after a failed directory load, with a focused frontend regression. Preserve allowed Student class-advisor self-selection and the separate privileged `coop_advisor_teacher_id`. **Recommendation only — NOT STARTED.**

**STOP — Resume cleanup task complete; next task not begun.**

---

## Student regression + implementation audit — 2026-10-06

**CURRENT AUTHORITATIVE — Asia/Bangkok.** This section supersedes the prior checkpoint's statement that the Student audit has not begun and its NEXT TASK. Previous implementation history is retained below. Student-only audit completed; **no application source changed and no next implementation task started**. Staff/Teacher/Head frontends, account setup, recruitment review UI, migration rollout and VM/production deployment remain **STOPPED**.

### Scope and evidence boundary

- Initial `git status --short`: clean. Read the preceding authoritative checkpoint before any edit. Only files directly involved in Student flows, the Teacher directory/associations, Student tests and required runtime configuration/migration definitions were inspected; no full repository audit.
- Local schema/ledger inspected using an explicit PostgreSQL **READ ONLY** transaction. Existing Student identities were used for authenticated read probes, with short-lived JWTs generated and retained only in process memory. **These probes do not prove successful password login.** Response output contained only status/count/shape information, not Student/Teacher personal data or credentials.
- No Local data/schema/history writes, migrations (including isolated migration runs), rollback, sync, seed/reset, real email, .env edits, container restart/rebuild, deployment, VM access, commit or push. Fault reproductions mocked all persistence/filesystem/network effects.
- **DONE** below means the implemented Student read/computation flow is connected through frontend code, API, backend and existing database, with a fresh successful Local runtime probe. No browser interaction was performed. Mutation workflows without fresh persistence/acceptance evidence remain **PARTIAL**, even where the source implements writes. Missing runtime evidence is distinguished from a reproduced defect.

### Compatibility gate — PASS for inspected Student paths

Local ledger: **9 executed / 3 pending**: `007a_create_missing_base_tables.js`, `010_cleanup_student_file_schema_drift.js`, `011_add_role_workflow_reviews.js`. `teachers.is_department_head` is **absent**, confirmed in `information_schema.columns`; source `Teacher` declares it and migration **011** adds it.

| Student endpoint/query | Exact Teacher model query | Evidence |
| --- | --- | --- |
| `GET /api/teachers` | `teacher.controller.getTeachers`: `Teacher.findAll`, explicit `id, academic_title, first_name, last_name, email, department, major, position, status` | Generated SQL excludes `is_department_head`; actual HTTP **200**, 23 active Teachers |
| `GET /api/student-profile` and `/api/student-profile/me` | `getStudentProfile`/`getMyProfile`: `Student.findByPk` includes `Teacher` as `advisorTeacher` and `coopAdvisorTeacher`, both with explicit directory attributes | Actual HTTP **200** for both aliases; neither Teacher join selects the new column |
| `PUT /api/student-profile/student-info` | `updateStudentInfo`: active `Teacher.findOne({ attributes: ["id"], where: { id, status: "active" } })` | Matching active-Teacher existence query executes successfully on Local; mutation itself not performed |
| `GET /api/coop-requests/:id` | `getCoopRequestById` -> `findOwnedRequest` -> `STUDENT_INCLUDE`: nested `advisorTeacher` attributes `id, academic_title, first_name, last_name` | Actual nonexistent valid UUID returns **404**, with the include query executing safely; source confirms restricted attributes |

**No confirmed Student `is_department_head` SELECT mismatch.** Model loading/association setup alone does not select every Teacher column. Default/full `Teacher.findByPk/findOne/findAll` queries would select the absent column; that remains a **potential risk for any newly added Student query**, and a schema prerequisite for the stopped role APIs. Do not hide database errors in frontend or apply 011 in this task. Safest compatibility option for Student reads is preserving explicit necessary attribute lists (and adding focused compatibility coverage in a future authorized change); keep Head privilege reads behind their separately authorized schema rollout. Do not remove the model field or invent a privilege value.

### STUDENT AUDIT RESULT

1. Login — **PARTIAL**
   - Frontend: `pages/login.js` -> `auth.api.loginStudent`; stores returned JWT/Student, redirects to Student dashboard.
   - API: `POST /api/auth/login`.
   - Backend: `auth.routes` -> `auth.controller.loginStudent` -> Student lookup, bcrypt comparison, Student actor JWT, safe `toJSON`.
   - Database: `students` exists; real lookups work. Login does not itself write data.
   - Evidence / Issue: missing credentials return **400**. Successful password login/browser redirect not exercised; no credentials obtained or printed. Google button explicitly remains an OAuth placeholder; core password-login source is implemented, not proven broken.

2. auth/me — **DONE**
   - Frontend: `checkAuthentication` -> `getCurrentStudent`, refreshes cached Student and checks `co_op` track.
   - API: `GET /api/auth/me`.
   - Backend: `authenticateStudentToken` -> `getCurrentStudent` -> `Student.findByPk`; HS256 and Student actor checks.
   - Database: real `students` row loaded; no Teacher query.
   - Evidence / Issue: authenticated **200**; no-token **401**; focused legacy/explicit Student actor and wrong-role tests pass. Authenticated probe used an in-memory JWT, not password login.

3. Dashboard / Overview — **PARTIAL**
   - Frontend: greeting/status from Student; request count from real request list; daily count from current DOM rows.
   - API: auth/me, student-profile/me, coop-requests/me.
   - Backend: real Student/Profile/CoopRequest reads; no complete Overview aggregation.
   - Database: related rows available; no persisted Daily Log/placement overview connection.
   - Evidence / Issue: those reads return **200**. `coopOverviewEmpty` is a permanent placeholder with no rendering code; daily count resets with page state. Cannot claim complete Overview.

4. Student Profile — **PARTIAL**
   - Frontend: profile rendering/edit modal, student-info form and image upload use real API wrappers.
   - API: GET/PUT `/api/student-profile/me`; PUT `/student-info`; GET/POST `/profile-image`.
   - Backend: self-scoped Student reads, whitelisted/validated Profile create/update, bounded image upload and owner storage path checks.
   - Database: `students`, `student_profiles`, both Teacher FKs and profile-image reference exist.
   - Evidence / Issue: both profile GET aliases **200**, Teacher joins compatible. Fresh profile/image mutation and reload acceptance not performed; class-advisor failure below affects student-info save.

5. Teacher selector — **PARTIAL**
   - Frontend: `loadTeachers` populates the class-advisor select from real Teacher IDs/names.
   - API: `GET /api/teachers`.
   - Backend: authenticated active-Teacher directory with explicit safe columns.
   - Database: `teachers`; 23 active rows retrieved successfully.
   - Evidence / Issue: API **200**, no 011 mismatch. **Failure recovery defect reproduced:** failed load leaves the cleared selector enabled; existing selection is lost. Selector is not DONE despite a working happy-path directory.

6. advisor_teacher_id — **PARTIAL**
   - Frontend: `saveStudentInfo` submits class-advisor UUID or null.
   - API: `PUT /api/student-profile/student-info`.
   - Backend: UUID/active-Teacher validation, Student field whitelist and `student.update`.
   - Database: `students.advisor_teacher_id` FK exists; active existence query selects only Teacher `id`.
   - Evidence / Issue: Student self-selection **ALLOWED**, separate from privileged `coop_advisor_teacher_id`. Actual frontend functions in a mocked DOM reproduce Teacher fetch failure followed by save emitting `advisor_teacher_id: null`, which the backend permits and would persist. No real advisor cleared. Write/read-back not performed.

7. Resume — **PARTIAL**
   - Frontend: `uploadStudentResume`, PDF/10 MB validation, extraction feedback.
   - API: `POST /api/student-profile/resume`.
   - Backend: authenticated multer upload, owner storage path, transactional StudentFile replacement, native PDF extraction then OCR fallback, stored extraction metadata.
   - Database: `student_files` plus extraction columns and one-Resume-per-Student partial UNIQUE index present; existing ready Resume file exists on disk.
   - Evidence / Issue: extraction unit tests pass and live Resume matching consumes persisted text. **Controller fault reproduced:** metadata transaction commits, final extraction-metadata update throws, outer catch unlinks the newly committed file while DB still references it. Reproduction uses mocks; no actual Local file removed. Fresh upload/replacement acceptance not performed.

8. Company search — **DONE**
   - Frontend: debounced Company search, selection and duplicate-check UI in Coop Request modal.
   - API: GET `/api/coop-requests/companies/search?q=...` and `/companies/duplicate-check?name=...`.
   - Backend: Student auth guard, escaped `iLike`, normalized exact duplicate lookup, safe fields/limit.
   - Database: real `companies` queries, no mock dataset in runtime handler.
   - Evidence / Issue: both authenticated Local endpoints **200**; focused auth/search/normalization tests pass. Manual Company snapshot request does not create a Company row, by current design.

9. Job Matching — **DONE**
   - Frontend: Skills/Resume actions -> `getMyJobMatches`, real results and error handling, selected job can prefill Coop Request.
   - API: `POST /api/job-matches/me?source=skills|resume` (computation only).
   - Backend: Student guard, profile or cached ready Resume text -> published JobPosting/Company/WorkMode query -> NLP service -> validated/enriched results.
   - Database: `students`, `student_profiles`, `student_files`, `job_postings`, `companies`, `job_posting_work_modes`; ranking has no persisted result entity by design.
   - Evidence / Issue: Local Skills **200 / 3 matches**; Resume **200 / 5 matches**, with 20 published postings. Existing contract/error/source tests pass. Source uses only published status, without an `expires_at` eligibility filter; future expiry handling needs a bounded review, not a stopped Staff UI change.

10. Coop Request — **PARTIAL**
    - Frontend: real list/detail/create/cancel, Company/manual snapshots, selected-job prefill and workflow statuses.
    - API: GET `/api/coop-requests/me`, GET `/:id`, POST `/`, PATCH `/:id/cancel`, GET `/job-postings/:id`.
    - Backend: Student owner/actor checks, strict payload validation, Student/request locks, request + delivery-method transaction, cancellable-stage checks.
    - Database: `coop_requests`, `coop_request_delivery_methods`, Company/JobPosting links present.
    - Evidence / Issue: list **200**, nonexistent valid detail **404**; mocked Company/request tests pass. No fresh create/cancel persistence acceptance. Complete review progression depends on absent 011 review tables; stopped role/schema work prevents claiming the full lifecycle DONE. Source does not require a class advisor or `co_op` track on create (frontend gates track); null advisor leaves no Teacher owner for review. Job availability also checks status without expiry.

11. Mentor — **PARTIAL**
    - Frontend: real owner CRUD, status and resend (resend reuses `updateMyMentor`); mentor verification page uses token-bound APIs.
    - API: GET/PUT/DELETE `/api/mentors/me`, POST `/api/mentors`; public mentor-verification verify/profile/confirm endpoints.
    - Backend: Student owner guard, Mentor + hashed-token transaction, post-commit SMTP with recovery feedback, transactional confirm/token consumption.
    - Database: `mentors`, `mentor_tokens` relationships and status persistence implemented.
    - Evidence / Issue: owner GET **200**. No CRUD write or actual inbox/confirmation in this pass; prior email acceptance remains historical. Resend uses full update/token rotation; no dedicated resend limit observed in Student Mentor route. No emails sent.

12. Co-op specific functions — **MOCK/UI ONLY**
    - Frontend: Daily Log creates/deletes DOM rows; transfer shows unconnected-backend message; evaluation/placement sections are placeholders.
    - API: none for these Daily Log/transfer/evaluation actions.
    - Backend: no corresponding handlers in inspected Student route chain.
    - Database: no connected persistence for those actions.
    - Evidence / Issue: refresh loses Daily Logs. Existing Coop Request and Mentor integration are classified separately above; they do not make these functions complete.

13. Project advisor — **PARTIAL**
    - Frontend: profile displays `coopAdvisorTeacher` as read-only; project panel's `projectAdvisor` select remains empty and is never populated from that relationship.
    - API: Student Profile GET can return the existing relationship; no Student project-assignment mutation.
    - Backend: explicit `coopAdvisorTeacher` include; Student student-info whitelist correctly rejects `coop_advisor_teacher_id`. Privileged assignment is retained historical backend work, not exercised/resumed here.
    - Database: `students.coop_advisor_teacher_id` FK exists separately from class advisor.
    - Evidence / Issue: compatible profile query **200**; project-panel display is disconnected. Assignment remains privileged and role/schema setup stopped. Do not repurpose the Student class-advisor selector.

14. Project topic — **MOCK/UI ONLY**
    - Frontend: `projectTitle` input and `saveProjectBtn` validate input and show unconnected-backend message; empty advisor selector blocks normal submission first.
    - API: none called by save handler.
    - Backend: no topic handler in inspected Student route chain.
    - Database: no topic field/entity in connected Student/Profile models.
    - Evidence / Issue: no persistence/read-back; button existence is not implementation.

15. Report / Project Book / Poster Upload — **MOCK/UI ONLY**
    - Frontend: file inputs and `uploadProjectBtn` only show unconnected-backend message.
    - API: none for this handler; resume/image upload routes cannot upload these documents.
    - Backend: no connected document upload/list/download handlers.
    - Database: StudentFile enum supports `coop_project_book`, `coop_poster`, `coop_practice_log_book`; storage directories exist in code, but no Student document write flow.
    - Evidence / Issue: no bytes uploaded and no metadata persisted. Existing enum/storage preparation is not DONE.

### CRITICAL BLOCKERS

- **Confirmed in frontend fault injection:** Teacher directory failure followed by student-info save submits null class advisor, risking an unintended clear and transfer/loss of pending review authority. The database was not mutated during reproduction.
- **Confirmed in mocked controller fault injection:** Resume extraction-metadata save failure after the upload metadata commit deletes the committed file; replacement may already have removed the old file. This is an actual error-path defect, not a claim that the current existing Resume is missing (it exists).
- Complete Coop Request review progression remains blocked by pending 011 and absent review tables, with role rollout intentionally stopped. Project/Daily Log/document actions lack backend persistence.
- Fresh successful password login and Student mutation acceptance were not performed; do not substitute GETs/mocks/historical role tests for this evidence.

### SCHEMA / MIGRATION RISKS

- **007a/010/011 remain pending**; do not apply/rollback/mark them. Source is newer than Local schema.
- **011:** absent `teachers.is_department_head`, `coop_request_reviews`, `job_posting_reviews` confirmed. Inspected Student Teacher queries are compatible because they explicitly select existing columns. Default Teacher queries are a potential compatibility regression if introduced later.
- **010:** catalog confirms **75 UNIQUE constraints on student_files.storage_path**. Existing one-Resume partial UNIQUE index is present, and required resume extraction columns exist. Pending cleanup is real schema drift, not evidence that today's Resume SELECTs fail.
- **007a:** base Student tables exist despite the missing ledger entry; this observation is not authorization to mark migration history or recreate tables. VM schema not checked; VM remains offline/out of scope.

### SAFE NEXT IMPLEMENTATION TASK — exactly one

**Fix Student Resume upload cleanup after metadata commit.** Preserve the committed file when extraction-status persistence fails; distinguish pre-commit upload cleanup from post-commit recovery, return truthful upload/extraction feedback, and add focused mocked failure coverage. Scope stays in Student upload code/tests, with no migrations, role work or architectural redesign. **Recommendation only — NOT STARTED.**

### FILES CHANGED

- `HANDOFF_fitm-intern.md` only. Previous history retained. No source/frontend/test/config/env/migration file changed.

### TESTS RUN

- `docker exec intern_backend node --test test/jobMatching.test.js test/resumeText.test.js test/coopRequestCompany.test.js`: **27 passed / 0 failed / 0 skipped** (19 matching, 2 Resume text, 6 Company/request tests). Persistence/provider dependencies mocked; not database write acceptance.
- `docker exec intern_backend node --test --test-name-pattern 'Student|Shared JWT' test/roleAuth.test.js`: **3 passed / 0 failed / 1 intentionally skipped** (unrelated route-loading case excluded).
- Read-only runtime probes via `PowerShell here-string | docker exec -i intern_backend node`: ledger/catalog/Teacher SQL, active-advisor existence, Student authenticated GETs and Skills/Resume computation **PASS**. GETs: teachers, auth/me, both Student Profile aliases, Coop Request list, Mentor owner, Company search and duplicate check **200**; missing detail **404**; missing credentials **400**; no-token auth/me/teachers **401**. No personal response data printed.
- First ledger probe used the wrong identifier `SequelizeMeta`, returned **42P01** and ended its read-only transaction; corrected to the configured `sequelize_meta` and all subsequent probes passed. This was an audit-probe error, not an application endpoint defect.
- `PowerShell here-string | docker exec -i intern_backend node`: mocked Resume post-commit fault reproduction **PASS**, confirms committed-file deletion. All filesystem/DB effects mocked.
- `PowerShell here-string | docker exec -i intern_frontend node`: actual `loadTeachers`/`saveStudentInfo` functions in mocked DOM **PASS**, confirms null advisor submission after directory failure; no API request sent.
- No frontend build needed: frontend unchanged. No full backend/NLP/migration suite run. Documentation `git diff --check`: **PASS**. Final `git status --short`/diff file-scope verification: **PASS**, only this handoff modified, with additions only and all prior history retained.

**STOP — audit complete; recommended next task not begun.**

---

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
