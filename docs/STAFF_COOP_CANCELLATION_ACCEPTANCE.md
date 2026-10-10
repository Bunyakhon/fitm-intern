# Staff Coop Request Cancellation — 2.3.2 (2)

## Scenario K Date Boundary — 2026-10-10

**IMPLEMENTED / NEEDS VERIFICATION.** Latest supplied final evidence: `logs/staff-cancellation-final-a76f101314ab4cd283c5a1724b9f7e9e/`. Earlier entries below describe previous runs. No fresh Chrome or PostgreSQL acceptance was executed by this restricted session.

### Actual latest stage results

| Stage | Result |
| --- | --- |
| Preflight | PASS / exit 0 |
| Chrome Cancellation | **24 scenarios PASS / K FAIL / 0 SKIP**, exit 1; L/J/UI not reached |
| Documents | BLOCKED |
| Focused PostgreSQL | BLOCKED |
| Backend Full | BLOCKED |
| Frontend Regression | BLOCKED |
| Frontend Build | BLOCKED |
| Evidence Validation | BLOCKED |
| Cleanup Verification | PASS / exit 0; one executed resource suite checked |
| Overall | Exit 1; 2 PASS / 1 FAIL / 6 BLOCKED |

Read the entire `cancellation/suite.log`, all relevant scenario/native-process/runner/ownership JSON and cleanup log; visually inspected `failure-K.png`. The real failure is **K: Cooperation, Company Response and Placement evidence survive refused cancellation**, not D. The stack identifies the Company Response setup call at original `staffCoopCancellationBrowserScenarios.js:463`, through the unchanged `ok()` assertion at `runDisposableStaffBrowserAcceptance.js:112`:

```text
AssertionError [ERR_ASSERTION]: API returned 400:
กรุณาระบุวันที่ตอบกลับที่ถูกต้องและไม่อยู่ในอนาคต
```

K failed after approximately 803ms, without a timeout. The API call is the runner's direct HTTP fixture setup; it is not a CDP mouse/keyboard evaluation. The screenshot shows the Staff dashboard before K opens the retained-evidence detail. Browser summary records zero Runtime exceptions, zero non-network console errors and no interceptor errors. D's Mouse/Enter/Space/Back/Escape/focus/no-write checks passed. K had generated Cooperation evidence before the failure; Company Response/Placement and its final refusal/immutability assertions had not completed. No passing result is claimed for those unexecuted checks.

### Confirmed root cause and comparison

**Time-dependent Test Bug.** K used `Intl.DateTimeFormat(... timeZone: 'Asia/Bangkok' ...)` to send today's date-only `responded_at`. The existing `companyResponseRules.responseValues()` validates `Date.parse(stamp) <= now`; JavaScript parses a date-only `YYYY-MM-DD` as midnight UTC. This is the current production API contract and is unchanged.

| Evidence | K time UTC | Bangkok date payload | Validator result |
| --- | --- | --- | --- |
| Previous final `6d835dc61fc248d7974b63fd4a2a598a` | `2026-10-09T16:43:19.017Z` | `2026-10-09` | Accepted; actual Cancellation **28/0/0** |
| Latest final `a76f101314ab4cd283c5a1724b9f7e9e` | `2026-10-09T17:17:09.046Z` | `2026-10-10` | Rejected: midnight UTC is **24,170,954ms in the future** |

The old fixture comment incorrectly claimed Bangkok today could never be future. A deterministic local reproduction with the real production validator at both recorded K times returns accepted for the earlier payload and `400 / INVALID_COMPANY_RESPONSE_DATE` for the latest. Log: `logs/staff-cancellation-k-date-fix-20261010/before-date-and-cleanup-reproduction.log`. The payload was not separately captured in the old artifact; it is derived from the checked source and recorded timestamp, then reproduced. No hidden exception object or production write is invented. This identifies the day-boundary mechanism, rather than merely labelling the run flaky.

### Minimal fix and files changed in this follow-up

| File | Change |
| --- | --- |
| `backend/scripts/staffBrowserFixtureDate.js` | Small test-only helper returning current UTC calendar date, matching the API's date-only parsing |
| `backend/scripts/staffCoopCancellationBrowserScenarios.js` | K imports/calls that helper instead of formatting Bangkok today |
| `backend/test/staffBrowserFixtureDate.test.js` | Eight cases against the real validator: actual prior/latest times, either side of Bangkok midnight, UTC midnight, year/leap rollover and old fixture rejection |
| `README.md`, `HANDOFF_fitm-intern.md`, `docs/NEXT_DAY_DEVELOPMENT_REVIEW.md`, this report | Latest evidence, honest verification limits and same final replay command |

UTC midnight of the current UTC day is at or before the fixture's current instant. A day rollover between fixture creation and request validation only makes the fixture older. No timeout increase, skipped assertion, mocked browser/API success, new runner, production code, SQL rule, migration, auth, approval or modal change. K still creates/generates both real document types, requires response/history, asserts cancellation 409 and compares all retained request/documents/revisions/response/history SQL evidence. L/J/UI remain in the manifest. Audited Document response fixtures: they already use past `2026-01-02`; no change needed.

### Cleanup evidence

Latest owner **`7aae437416fb497182817bba3875fa16`**, container **`fitm-staff-browser-7aae437416fb497182817bba3875fa16`**. Node `runner.json` separates **scenarioStatus FAIL** from **cleanupStatus PASS**, with no cleanup errors. PowerShell `resource-cleanup.json` has matching final/child identities, attempted=true, status PASS and no errors. Complete suite log retains the owned removal output after the original failure. Actual independent `cleanup-verification/suite.log` says **PASS; 1 executed resource suites checked**, with native exit 0. Latest process metadata retains suite exit 1, launchError=null, terminated=false; the earlier stderr-capture correction now preserves failure diagnostics and cleanup.

A fresh local call to `cleanupRecords()` validated ownership identities/records and absence of the Node profile/private storage without invoking Docker. It is a records/filesystem check, not a new Docker inventory. No resource was removed here. Latest cleanup covers its latest executed owner only; it does not establish physical state of the older Document owner with missing ownership evidence. That older state remains unverified under the previously denied Docker query. SHA-256 comparison confirms all **34 original evidence files** across both supplied final-run directories stayed identical. Of 37 pre-existing changed/untracked worktree files, the **32 outside the five intended edits** also retain their hashes; two test-only files were added. Git status still retains all inherited work. Check output: `logs/staff-cancellation-k-date-fix-20261010/final-checks.log`.

### Actual local regression

Logs: `logs/staff-cancellation-k-date-fix-20261010/`.

| Check | Actual result |
| --- | --- |
| New fixture + existing Company Response tests | **27 PASS / 0 FAIL / 0 SKIP**, including 8 new fixture cases; `date-and-response-tests.log` |
| All Backend local tests | **202 PASS / 0 FAIL / 17 SKIP**; `backend-all.log` |
| All Frontend local tests | **248 PASS / 0 FAIL / 2 SKIP**; `frontend-all.log` |
| Frontend production build | **PASS**, 123 modules, exit 0; `build.log` |
| Changed/helper JS syntax + browser runner syntax | Four files PASS |
| Existing final/browser/Teacher PowerShell AST parsing | Three files PASS |
| Git whitespace check | PASS |

The 27 focused successes overlap with the full Backend count; they are not additional acceptance coverage. Backend SQL/migration/integration opt-ins (17) and Frontend real prerequisite-browser / saved-data PostgreSQL tests (2) were skipped because their required environment is unavailable. Safe local Backend settings point to unavailable loopback port 1 and disable integration opt-ins; no persistent database is used. Frontend full tests include cancellation and Document/Company Response Back/Escape/focus/no-write DOM checks, Student readback, session revocation and Class/Head approval behavior. Production files outside the test fixture are unchanged in this follow-up.

### Remaining verification and one-command replay

Restricted Docker/Chrome and PowerShell script execution limitations were already established; no policy bypass or repeat denied resource operation was attempted. Local units/build do not satisfy the six BLOCKED stages or verify Chrome K's complete SQL preservation behavior. Revised Documents, Student saved-data readback, real authorization/approval/concurrency SQL, backend/full frontend, evidence and cleanup all require a fresh complete run. Risk is limited to fixture wiring until that actual replay; all existing assertions and gates remain active. Keep **IMPLEMENTED / NEEDS VERIFICATION**.

From the repository root in an authorized ordinary Windows CMD terminal, run the existing runner once:

```cmd
powershell.exe -NoProfile -File backend\test\runStaffCancellationFinalAcceptance.ps1
```

The same runner creates a new GUID evidence directory, requires Cancellation 28/0/0 and Documents 13/0/0, executes the remaining suites, checks evidence and verifies only owned cleanup. Only **all 9 stages PASS, overall exit 0** justify VERIFIED. No commit, push or deploy performed; inherited uncommitted work is retained.

## Document initial focus and native stderr cleanup fix — 2026-10-10

**IMPLEMENTED / NEEDS VERIFICATION.** The supplied real Chrome final run now proves all 28 Cancellation scenarios passed. Revised Document Chrome and the complete final runner still need a fresh permitted-terminal run. Earlier sections below describe prior snapshots.

### Actual run evidence

Primary evidence: `logs/staff-cancellation-final-6d835dc61fc248d7974b63fd4a2a598a/`. Read both suite logs, cleanup log, final summary, scenario JSON, Node cleanup JSON, Cancellation PowerShell ownership JSON and Document failure screenshot. This evidence is retained unchanged; SHA-256 comparison confirms all **15 existing files** stayed identical during this follow-up.

| Stage | Actual supplied result |
| --- | --- |
| Preflight | PASS / exit 0 |
| Cancellation Chrome | **28 scenarios PASS / 0 FAIL / 0 SKIP**, parent also passed, exit 0 |
| Document Chrome | Login PASS; `document-modal-focus` FAIL; parent FAIL, exit 1 |
| Focused SQL, Full Backend, Frontend Regression, Build, Evidence Validation | **BLOCKED**, not executed |
| Cleanup Verification | FAIL / exit 1 |
| Overall | Exit 1; IMPLEMENTED / NEEDS VERIFICATION |

Cancellation includes successful Mouse/Enter/Space, Back/Escape/focus, all nine eligibility states, validation/persistence/concurrency/stale/error/auth/audit/document-retention/approval and completed Student J/reload/mobile + UI cases. These are the **user's actual prior run results**, not new Chrome execution by this session. No passed Cancellation scenario, production API, transaction, authorization, shared component or business rule was changed here.

### Document failure: incorrect initial-focus expectation

`documents/suite.log` points to original `runDisposableStaffBrowserAcceptance.js:180` inside `modalDismissal()`, after opening the document Save modal. The failed assertion is:

```js
document.activeElement === document.querySelector(
  '.app-confirm-overlay:not(.is-leaving) .app-confirm-modal__cancel'
)
```

Expected **true**, actual **false**. `frontend/src/ui/feedback.js` appends the dialog and synchronously calls **`confirmButton.focus()`**. There is no configured initial-Cancel-focus contract. The old run did not record the exact Chrome active element; the screenshot demonstrates an open document confirmation dialog, rather than proving which DOM element owns focus. Source and DOM regression confirm the correct initial target is Confirm.

This is a **Test Bug**. It fails before either dismissal, not at opener focus restoration. The native mouse helper returned successfully and the modal was present, so no mouse-dispatch failure is evidenced. Neither Back nor Escape keyboard/dismissal path had executed, and no-write HTTP/SQL assertions were not reached. The scenario had not activated Confirm; do not report its unexecuted no-write checks as PASS.

Minimal correction: assert initial Confirm focus, then retain native Back/Escape, modal removal, exact opener restoration and no HTTP/SQL mutation assertions. Added initial Confirm focus assertions to existing document and Company Response DOM cases. No production or Shared Modal change. Future `document-input-staffSave.json`, `document-input-staffGenerate.json` and `document-input-staffCompanyResponseSave.json` record only safe focus categories, modal/trigger state, page-focus boolean, mutation methods/count and SQL verification outcome. No input values, Student identities, credentials, bearer headers or raw DOM are captured; a null SQL result means the SQL check was not completed.

### Cleanup failure: absent ownership evidence and native stderr handling

Document Node owner: **`718743c6121f43ba9db3d11571387ec4`**. Its `runner.json` has scenario status FAIL and **`cleanupErrors: []`**; the Node finally block writes that JSON only after browser/API process termination, Vite/model/database closing and guarded removal of its private profile/storage. The old owned profile/storage directories are absent. This is recorded Node cleanup success; it is not an independent OS PID survey. The `runner.json.status=FAIL` refers to the failed scenario and must not be interpreted alone as a cleanup failure.

Cancellation owner: **`14a9a962cd3c444b862b314c3249b659`**. Its Node runner and PowerShell `resource-cleanup.json` are present and passing. Document **`resource-cleanup.json` is missing**; its suite log also lacks the expected owned-container removal output. A read-only invocation of `cleanupRecords()` confirms **ENOENT** for that exact file. Missing ownership evidence legitimately rejects cleanup verification; it does **not** establish that a resource was found, nor that the failure is a harmless false positive.

The original cleanup log contains only the parent runner's generic `Stage process could not complete` message. The original parent exception type was not retained, so do not pretend to have recovered its exact exception object. The source contains a confirmed runner defect: `$ErrorActionPreference='Stop'` with `& $Executable ... *> $taskLog` allows redirected native stderr to become a terminating PowerShell `NativeCommandError`. A standalone reproduction using a unit child that writes stderr, then performs delayed cleanup and exits 7, shows the old pipeline catches NativeCommandError with exit **-1** and **no child cleanup marker**. This mechanism matches the lost error diagnostics and missing Document ownership record; it can interrupt the child before its PowerShell finally finishes.

Repaired native process capture uses a small Node controller with direct stdout/stderr file descriptors, `shell:false` and synchronous wait for native process exit. The controller records the actual suite exit in `process-result.json`; controller completion is never substituted for suite success. The corrected real unit child records **FAIL / exit 7**, retains stderr and finishes its cleanup marker before returning. This is a process-helper unit reproduction, not mocked E2E success. A successful child, Unicode/spaced paths, launch failures, evidence-overwrite refusal and safe error metadata are also tested.

The final PowerShell runner now consumes the native result, keeps failed dependent suites BLOCKED, retains complete child output and continues independent cleanup validation. Build uses the same fixed npm command through `cmd.exe`, avoiding Windows `.cmd` spawning ambiguity. Per-stage `process-command.json` contains only known test commands/paths (no env/password/JWT); `process-result.json` contains safe status/exit/launch metadata. Child runners still generate credentials internally. Node `runner.json` now additionally separates `scenarioStatus` and `cleanupStatus`. Validator diagnostics identify the missing suite, retain exit 1 and do not convert missing evidence to success.

### What cannot be confirmed here

A read-only Docker query limited to the Document owner's exact `fitm.test-run` label was denied at `dockerDesktopLinuxEngine` with **permission denied**. No further Docker retries, browser launch or policy/ACL changes were attempted. Therefore physical state of old `fitm-staff-browser-718743c6121f43ba9db3d11571387ec4` remains **UNKNOWN**; no statement of verified removal or confirmed leak is justified. No container/network/volume was deleted. Browser suites create no dedicated Docker network (they use a loopback-published tmpfs database); the default Docker bridge is unrelated and must not be removed.

If the old container is found in a permitted environment, verify the exact owner label, disposable tmpfs configuration and `current_database()=fitm_staff_browser_test` / `fitm.a017_disposable=on` before any removal. A missing ownership record cannot authorize deleting a similarly named container or persistent volume. No old cleanup record was fabricated and no old evidence was rewritten. Future final-run cleanup checks still require their actual ownership records and independent owner-label absence checks.

### Files changed in this follow-up

| Files | Change |
| --- | --- |
| `backend/scripts/runDisposableStaffBrowserAcceptance.js` | Correct initial-focus assertion; safe document focus/write trace; separate Node scenario/cleanup status |
| `backend/scripts/staffAcceptanceProcess.js` (new) | Native stderr-safe capture, wait and real exit metadata |
| `backend/test/runStaffCancellationFinalAcceptance.ps1` | Reuse native controller for every stage; consume real exits; preserve failure reasons; fixed npm `.cmd` invocation |
| `backend/scripts/staffCancellationFinalEvidence.js` | Suite-specific missing/invalid ownership diagnostic; safe failure output with unchanged nonzero exit |
| `backend/test/staffAcceptanceProcess.test.js` (new), `backend/test/helpers/staffAcceptanceProcessFixture.js` (new) | Five process regressions with real child execution; fixture is inert without an explicit marker argument |
| `backend/test/staffCancellationFinalEvidence.test.js` | Product failure with successful cleanup stays distinct from missing ownership evidence |
| `frontend/test/staffDocuments.test.js`, `frontend/test/companyResponse.test.js` | Confirm initial-focus contract before existing Back/Escape restoration/no-save assertions |
| `README.md`, `HANDOFF_fitm-intern.md`, `docs/NEXT_DAY_DEVELOPMENT_REVIEW.md`, this file | Current results, confirmed causes, resource uncertainty and final replay |

**13 files changed here, including 3 new helper/test files.** Existing uncommitted changes remain; no production frontend/API/service, eligibility, approval, transaction, migration, Docker settings or menu change in this follow-up. No commit/push/deploy.

### Tests executed in this session

Logs: `logs/staff-cancellation-document-cleanup-fix-20261009/` (work began 2026-10-09 before the date rollover).

| Check | Actual result | Evidence |
| --- | --- | --- |
| All safe backend direct test files | **194 PASS / 0 FAIL / 17 SKIP**, exit 0 | `backend-all.log` |
| All frontend direct test files | **248 PASS / 0 FAIL / 2 SKIP**, exit 0 | `frontend-all.log` |
| Process/evidence/CDP/input/environment helpers | **46 PASS / 0 FAIL / 0 SKIP**, exit 0 | `backend-focused.log` |
| Documents/Company Response/Cancellation/Student DOM | **97 PASS / 0 FAIL / 0 SKIP**, exit 0 | `frontend-focused.log` |
| Native process-controller regressions | **5 PASS / 0 FAIL / 0 SKIP**, exit 0 | `process-unit.log` |
| Actual frontend npm build through new native controller | **123 modules PASS**, real build exit 0 | `build.log`, `build-process-result.json` |
| Native stderr before/after reproduction | Old NativeCommandError / -1 / no cleanup; new real exit 7 / cleanup completed | `legacy-process-observation.json`, `native-stderr-after-result.json`, related logs/markers |
| Existing-run cleanup diagnosis | Expected **exit 1**, specifically missing Document ownership record | `existing-cleanup-diagnosis.log` |
| JS syntax, three PowerShell AST parses, whitespace diff, 15 old-evidence hashes | PASS | `final-checks.log`, `old-evidence-hashes.json` |

Backend uses disabled integration opt-ins and an unavailable loopback test DB port. Its 17 SQL/integration roots are unexecuted, not new DB PASS. Frontend local skips are saved-data PostgreSQL and the optional prerequisite-browser fixture. New real Chrome/SQL final orchestration was not executed in this restricted session; syntax parsing and native-helper/build execution are not a substitute.

### One-command complete replay and acceptance decision

Run from the repository root in an ordinary Windows CMD terminal already authorized to run project scripts:

```cmd
powershell.exe -NoProfile -File backend\test\runStaffCancellationFinalAcceptance.ps1
```

This performs all nine stages again: preflight, Chrome Cancellation, Chrome Documents, focused PostgreSQL, full Backend, Frontend regression, build, evidence validation and cleanup verification. A fresh `logs/staff-cancellation-final-<guid>/` is created; previous results are never copied into the new run. Inspect actual native exits, 28/13 browser scenario coverage, per-stage logs, document focus/write JSON, SQL/frontend counts and both Node/PowerShell ownership cleanup evidence. Product/test failures and cleanup failures stay separate; any FAIL/BLOCKED or invalid required evidence prevents VERIFIED and returns nonzero exit.

Remaining risks are actual Chrome Document behavior and native process/PowerShell orchestration integration, SQL/full-backend/frontend-saved-data acceptance, and the old Document PostgreSQL resource state that cannot be inspected here. Preserve **IMPLEMENTED / NEEDS VERIFICATION** until the complete new permitted run and required cleanup evidence pass. Existing old Cancellation PASS is retained as historical evidence, not used as a new run result.

Earlier sections below are historical snapshots.

## Scenario J contract fix and final acceptance runner — 2026-10-09

**Current status: IMPLEMENTED / NEEDS VERIFICATION.** This section supersedes the earlier execution-pending snapshots below. The supplied actual Chrome run now proves D passed. The revised complete Cancellation, Student reload/immutability/mobile checks, default Document Chrome and new orchestration still need execution in an authorized terminal.

### Confirmed root cause and API contract

Inspected `logs/staff-cancellation-browser-4ee57f6f59b448de9d9cc45cab350b8b/{summary.json,runner.json,student-cancellation-desktop.png,failure-J.png}` and `logs/20261009-evaluation-20751-22965-cancellation.log`. Chrome **154.0.8037.98**, actual production API and disposable PostgreSQL ran. Scenario entries: **25 PASS / 1 FAIL / 0 SKIP**. Node additionally counts the failed parent (25 PASS / 2 FAIL); this is one underlying failed scenario. Runtime and application-console error counts are zero. Node browser/profile/storage cleanup errors are empty; the user reports overall browser cleanup PASS and exit 1. UI was never reached and is not counted as a pass.

J's original line 518 calls `ok(api('/api/coop-requests', accepted.token))`. With no body, the helper uses GET. `backend/src/app.js` mounts the Student router at `/api/coop-requests`; `backend/src/routes/coopRequest.routes.js` registers GET `/me`, GET `/:id`, POST `/` and PATCH `/:id/cancel`, but no GET `/`. The production adapter `frontend/src/api/coopRequest.api.js` already uses the correct contract. Express's unmatched route returns an HTML 404; the test helper maps non-JSON content to `Route unavailable`, producing the exact assertion. This is a **test URL bug**, not a demonstrated missing backend endpoint or ownership failure.

The subsequent Student cancellation check also used a body `{}`, making its default method POST. It had not executed in the failed run and would hit another unregistered route. Corrected both test calls without changing the API:

| Operation | Contract | Acceptance |
| --- | --- | --- |
| Student history list | `GET /api/coop-requests/me` | Foreign authenticated Student's list excludes the cancelled owner's request |
| Student detail | `GET /api/coop-requests/:id` | Owner 200; foreign owner 404; no foreign data |
| Student cancellation | `PATCH /api/coop-requests/:id/cancel` | Already cancelled returns 400; transaction rolls back; history unchanged |
| Staff cancellation | `POST /api/staff/coop-requests/:id/cancel` | Student denied 403; Staff eligibility/stale rules retained |

Before J failed, password login, cancelled history/status, saved reason, Staff actor/date, absence of editable inputs/current-request controls, owner API audit and foreign-detail denial assertions completed. The screenshot shows the cancelled owner's detail dialog; JSON/logs establish the earlier assertions, rather than inferring hidden content from the image. Reload, unchanged SQL/audit and Student mobile checks follow the bad calls and remain **unexecuted in that run**. All assertions are retained for the replay. JWT ownership remains enforced by the existing middleware and `findOwnedRequest(id, req.user.id)`.

### Coverage and document focus regression

The original F-G starts with the `advisor_review` owner and verifies the live UI event, persisted reason, Staff actor, timestamp and one audit. Thus that status was already exercised. Added an explicit `C-advisor_review` step confirming the same saved SQL event; it does not send another cancellation or change eligibility. The revised manifest has **28 cancellation entries**:

`A, B, D, E, F-G, C-advisor_review, C-submitted, C-staff_review, C-department_head_review, C-approved, C-document_issued, C-in_progress, C-rejected, C-cancelled, G-SQL, H-status, H-time, I-400, I-404, I-500, I-network, I-401, I-403, A-security, K, L, J, UI`.

This preserves native Mouse/Enter/Space, Back/Escape, exact focus return, invalid-reason/no-POST/no-SQL checks, persistence/deduplication/concurrency, stale status/time, actual API authorization/errors, owner readback/reload/immutable audit, document retention, Class→Head approval and navigation/mobile/error budgets. Newly named coverage is implemented; it is not a new Chrome PASS until replayed.

Default Document mode retains all original cooperation/response/placement/edit/generate/history/preview/download/print/mobile/network/association assertions and gains native document/Company Response Back/Escape focus and no-write cases: **13 document entries**. Each document subtest now records status/timestamps and stops dependent operations on failure. A failing `t.test()` can finish without rejecting its awaited call; the old document branch therefore could continue and set `runPassed=true`. The explicit wrapper now propagates the captured failure; `summary.json` and `runner.json` reflect it. Failure screenshots scrub password inputs first.

New DOM tests demonstrated another frontend accessibility issue before modifying production document code: `staffDocuments.ask()` and `askCompanyResponse()` disable controls before invoking `showConfirmModal()`, so the shared modal captures the body rather than the opener. `document-focus-before.log` contains two failing Back/Escape restoration tests (the modal closed and writes remained zero). Fixed only the two document caller options: explicit original opener, then a current enabled opener or document refresh fallback. Existing shared modal close ordering/eligibility and all cancellation input fixes remain intact. Six added DOM tests cover Save, Generate and Company Response Back/Escape; the new Chrome cases must verify the actual document behavior.

### Files changed in this follow-up

| Files | Change |
| --- | --- |
| `backend/scripts/staffCoopCancellationBrowserScenarios.js` | J URL/method corrections; explicit advisor-review evidence label |
| `backend/scripts/runDisposableStaffBrowserAcceptance.js` | Document failure propagation, 13-entry summary, native modal/no-write checks, safe failure screenshots and runner identity |
| `backend/scripts/staffBrowserEnvironment.js` | Per-invocation document/final artifact paths; final-ID/mode validation |
| `backend/test/runStaffCancellationFinalAcceptance.ps1` (new) | One-command sequential orchestration and final PASS/FAIL/SKIP/BLOCKED summary |
| `backend/scripts/staffCancellationFinalEvidence.js` (new) | Browser manifests, screenshots/download, identities/freshness, complete TAP counts and cleanup validation |
| `backend/test/runStaffBrowserAcceptance.ps1` | Cached backend-image preflight; final-run artifact identity; checked owned container removal/absence record |
| `backend/test/runTeacherAdvisorAcceptance.ps1` | TAP output; final-run cleanup records; labelled test-container/partial-resource cleanup; nonzero exit on failed ownership/removal/absence checks |
| `backend/test/staffCancellationFinalEvidence.test.js` (new) | Ten validator/path/count/skip/artifact/cleanup regressions, including Windows UTF-16LE logs |
| `backend/test/staffCancellationStudentContract.test.js` (new) | Production router/auth/controller method/URL/ownership units with explicit SQL stubs (parent + three cases) |
| `frontend/src/pages/staffDocuments.js` | Two minimal modal caller return/fallback-focus options |
| `frontend/test/helpers/staffDocumentsFixture.js` | Native-like connected/disabled/hidden focus behavior for DOM verification |
| `frontend/test/staffDocuments.test.js`, `frontend/test/companyResponse.test.js` | Six Back/Escape focus/no-write DOM regressions |
| `README.md`, `HANDOFF_fitm-intern.md`, `docs/NEXT_DAY_DEVELOPMENT_REVIEW.md`, this file | Current evidence, contract, limitations, runner and status |

All earlier uncommitted changes are retained. No commit, push, PR or deployment. The production change in this follow-up is limited to two document-modal option lines; no schema, route, auth, business rule or approval change.

### Tests actually executed here

Evidence: `logs/staff-cancellation-final-fix-20261009/`.

| Check | Actual result | Log |
| --- | --- | --- |
| Backend safe units, all current direct `*.test.js` files | **188 PASS / 0 FAIL / 17 SKIP**, exit 0 | `backend-all-final.log` |
| Frontend DOM/unit suite, all direct `*.test.js` files | **248 PASS / 0 FAIL / 2 SKIP**, exit 0 | `frontend-all.log` |
| Focused route-contract/evidence validators | **14 PASS / 0 FAIL / 0 SKIP**, exit 0 | `contract-and-evidence-final.log` |
| Earlier focused validator + document suite | **26 PASS / 0 FAIL / 0 SKIP**, exit 0 | `focused.log` |
| Vite build using native config loader | **123 modules PASS**, exit 0 | `build.log` |
| Changed/new JS syntax, three PS AST parses, diff whitespace | PASS | `final-checks.log` |
| One-command final runner invocation | **BLOCKED at PowerShell script load**, exit 1 | `final-runner-attempt.log` |

The safe backend run disables integration opt-ins and uses an unavailable loopback test port. Its 17 skips are unexecuted SQL/integration roots, not SQL passes. The frontend local run skips saved-data PostgreSQL and the optional prerequisite-browser fixture. Route-contract units use real Express/middleware/controller code with SQL stubs; validator inputs are synthetic unit fixtures and never E2E evidence. An initial focused run with pooled `fetch` plus `--test-force-exit` hit a Windows libuv shutdown assertion after passing its assertions (nonzero exit, `contract-and-evidence.log`); switched the unit HTTP client to consumed one-shot native sockets. The final focused and full backend reruns exit 0.

PowerShell rejected the final runner before its body with `running scripts is disabled`. **No new preflight, Chrome, integration SQL, Docker resource or final acceptance directory was created by that invocation.** No execution policy, ACL, sandbox or Docker setting was changed or bypassed. Three runner files were checked with the PowerShell parser without executing their bodies. This is syntax validation, not orchestration runtime acceptance.

### One command and real acceptance gates

From the repository root in an ordinary Windows CMD terminal already authorized to run the project scripts:

```cmd
powershell.exe -NoProfile -File backend\test\runStaffCancellationFinalAcceptance.ps1
```

It discovers installed Chrome, checks Node/dependencies, Docker and cached `postgres:16-alpine` / `fitm-intern-backend`, then reuses the existing runners in order: Cancellation Chrome → default Document Chrome → focused `roleWorkflow.database.test.js` disposable SQL → full disposable Backend → Frontend regression with disposable saved-data SQL → local build → evidence validation → independent cleanup verification. It does not install Chrome/dependencies, pull missing images, alter policies or stop existing services. A blocking failure leaves later dependent stages **BLOCKED**; cleanup verification still runs. Nonzero suite or cleanup results give exit 1. No unexecuted stage is accepted as PASS.

Each invocation creates `logs/staff-cancellation-final-<guid>/` with separate `suite.log` files and browser artifacts under `cancellation/` and `documents/`; both have `summary.json`, `runner.json`, screenshots and `resource-cleanup.json`. SQL/frontend suites have cleanup records; the document download artifact is retained. `test-counts.json` reports executed counts and exact skipped names. `final-summary.json` reports stage outcomes, exit codes and artifact paths. PowerShell 5.1 UTF-16LE and PowerShell 7 UTF-8 TAP logs are supported.

Evidence validation requires all 28/13 named Chrome entries passing without skips, Chrome product/run identity, fresh timestamps, zero unexpected runtime/application console errors, real screenshots/download artifact, successful required suite exits and complete passing TAP counts. Required SQL/backend skips reject acceptance. Frontend's optional standalone prerequisite-browser fixture is the only permitted explicitly named skip; the production Cancellation/Student/Document E2Es still have no skipped entries, and the saved-data frontend SQL test executes in the disposable runner. A permitted optional skip is recorded, never described as run.

### Isolation, cleanup and remaining risk

Browser SQL uses exact `fitm_staff_browser_test` on a uniquely labelled loopback PostgreSQL tmpfs container and verifies `fitm.a017_disposable=on` before migrations/model writes. SQL/frontend regression uses the existing internal Docker network and exact disposable database names/markers, current-source read-only bind and a uniquely labelled `--rm` test container. Migration **execution** is confined to those new disposable DBs; migration **files** are unchanged. Local/Persistent databases and Compose containers/volumes are never targeted.

Cleanup checks exact generated names plus `fitm.test-run` owner labels before removal, then verifies absence. Failure to inspect ownership, remove a resource or verify absence forces nonzero exit. The final validator reads safe cleanup records, checks Node profile/storage removal and independently queries Docker for containers/networks bearing only those run labels; it does not delete anything. Missing evidence rejects acceptance. Raw env, passwords, headers, JWT/cookies and arbitrary exception payloads are not serialized.

No new actual Docker/Chrome resource was created here, so there is no new resource cleanup execution to claim. Existing user Chrome Node cleanup is separately evidenced by its empty error list. Regression risk is limited to document focus return and test infrastructure (artifact paths, failure propagation, cleanup and orchestration); business/approval/auth/Student endpoints are unchanged. Both complete Chrome suites, guarded SQL/full-backend/frontend-SQL and real cleanup remain required. Maintain **IMPLEMENTED / NEEDS VERIFICATION** until the one-command run produces all required evidence with exit 0 and a justified VERIFIED summary.

Earlier sections below are retained as historical snapshots.

## Scenario D evaluation exception / mouse geometry fix — 2026-10-09 Asia/Bangkok

**IMPLEMENTED / NEEDS VERIFICATION.** Helper defects are repaired and local regressions pass. Exact original Chrome exception text was not retained and cannot be recovered from the supplied artifacts. Neither full Cancellation nor default Document Chrome has been rerun in this restricted session.

### Evidence and what is actually confirmed

Read `logs/staff-cancellation-browser-e84753c608a648c8b2addf659011a359/{summary.json,runner.json,focus-D.json,failure-D.png}` and matching `logs/20261009-keyboard-30198-22472-cancellation.log`. Chrome 154.0.8037.98 passed A/B; D failed in 637 ms. Stack points to the initial evaluation in `clickMouse()` and original Scenario D line 216. All three native mouse sends occur after that evaluation, so this failure precedes the first Mouse Event and all Enter/Space branches. Keyboard/received event traces are empty; cancellation POST/runtime-error/console-error counts are zero. The native opener exists, is connected and enabled; no modal is present. Focus is the detail heading and page focus is false in the failure snapshot. Page focus is an observation, not a proven cause of this geometry evaluation failure; keyboard focus assertions remain intact. The PNG is a full-page capture, not a contemporaneous bounding-rectangle/hit-test record.

The runner used only `exceptionDetails.text` and discarded the exception object, source location and stack. [CDP Runtime ExceptionDetails](https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/js_protocol.pdl) provides those separately; `Uncaught` alone cannot identify the actual JS exception. No raw CDP response/exception object or rectangle was saved in that run. Therefore do not report `Mouse control is obscured` as the confirmed original Chrome message.

A separate helper bug is confirmed from source and reproduced locally: Staff HTML loads `student_coop.css`, which sets `html { scroll-behavior: smooth; }`. The original helper used `scrollIntoView({block:'center'})` and immediately read geometry/hit-tested. Default auto behavior can follow the CSS smooth scroll; it does not ensure scrolling has completed ([CSSOM scrolling algorithm](https://drafts.csswg.org/cssom-view/#perform-a-scroll)). A DOM simulation with the initial button center at Y=1020 and viewport height 900 reproduces `Error: Mouse control is obscured` with zero mouse events. This proves that helper defect and supplies a regression case; it does not prove which exact branch fired in the historical Chrome run. No evidence supports changing the native button, business logic, modal selectors or production CSS.

### Changes limited to E2E helpers and diagnostics

| File | Change |
| --- | --- |
| `backend/scripts/staffBrowserInput.js` | Inspect current target before/after explicit instant scroll; await a completion promise if supplied; reselect after scrolling; require a layout box, in-viewport finite point and successful hit-test before native mouse events; record safe geometry/send status |
| `backend/scripts/staffBrowserEvaluation.js` (new) | Reusable Runtime.evaluate adapter preserving successful return semantics; safe exception type/message/location/stack/context and cause; diagnostic capture cannot replace the original error; cleanup preserves the first interaction failure |
| `backend/scripts/runDisposableStaffBrowserAcceptance.js` | Use the adapter and persist safe `evaluation-errors.json` in this run's existing artifact directory |
| `backend/scripts/staffCoopCancellationBrowserScenarios.js` | Record mouse phases; persist `mouse-D.json` independently of focus capture; preserve original interaction failures across observer/focus diagnostic cleanup |
| `backend/test/staffBrowserInput.test.js` | Add smooth-scroll, completion-promise, replacement, offscreen, hidden-size, coverage and availability contract regressions |
| `backend/test/staffBrowserEvaluation.test.js` (new) | Cover return semantics, safe remote cause/stack/context, private-data omission, artifact failure, transport identity and primary/secondary error precedence |
| This document | Current evidence, limits, results and complete rerun commands |

Explicit `behavior:'instant'` affects only the helper's scroll operation. The helper still fails on an obscured/offscreen/unavailable target and uses native CDP mouse input. Enter CR/Space character sequences, Back/Escape, focus restoration, all no-POST/no-SQL assertions and later Student/document cases are preserved. No .click fallback for keyboard, timeout increase, skip or success mock. No production source changes: SHA-256 comparison checked all 196 files under `frontend/src` and `backend/src`, with zero changes. All prior uncommitted work remains.

`evaluation-errors.json` stores only allowlisted exception messages/API errors, built-in error types, safe operation/selectors and stack positions. Unknown messages, function names and selectors are omitted; URLs and source expressions are not saved. A sanitized Error cause retains the original known type/message and remote stack without dumping raw RemoteObjects. `mouse-D.json` records existence/connected/disabled state, before/after rectangles, point, viewport, hit-test booleans, page focus, event send/acknowledgement/failure and secondary cleanup failures. It stores no DOM text, HTML, student data, reason, password, token, cookie, JWT or storage. `focus-D.json` and failure screenshot behavior remain. Artifact-writing/observer-cleanup failures do not mask the primary exception; a cleanup failure following otherwise successful work still fails the test.

### Checks executed in this session

Evidence: `logs/staff-cancellation-evaluation-fix-20261009/`; prior supplied Chrome artifacts are preserved.

| Check | PASS | FAIL | SKIP | Log |
| --- | ---: | ---: | ---: | --- |
| Evaluation/input helper unit contracts | 26 | 0 | 0 | `helper-unit.log`; included in Backend total |
| Full Backend safe units, final | 174 | 0 | 17 | `backend-unit-final.log`; unreachable test-only DB target, integration opt-ins cleared/false |
| Full Frontend DOM/unit | 242 | 0 | 2 | `frontend-all.log`; existing native-browser/SQL opt-ins skipped |
| Production Frontend build | 1 | 0 | 0 | `frontend-build.log`; 123 modules |
| Changed JavaScript syntax | 6 | 0 | 0 | `syntax.log` |
| Whitespace diff check | 1 | 0 | 0 | `diff-check.log`; exit 0 |
| Production source hash preservation | 196 | 0 | 0 | `production-preservation.log`; every file unchanged |
| Original scroll helper defect reproduction | 1 reproduced error | — | — | `original-scroll-reproduction.log`; DOM simulation, not browser acceptance |
| Full Cancellation / Document Chrome | — | — | — | Await authorized user execution |

The first Backend pass was 173/0/17 before adding the completion-promise regression; final replay is 174/0/17. Totals overlap and must not be added. Tests use in-process Node execution; full suites additionally use `--test-force-exit`. Unit transport stubs are contract tests and do not claim native browser success. No Docker/Chrome access attempt, sandbox workaround, Docker/security setting change, persistent database access, migration edit, commit, push or deployment occurred. Snapshot diffs for helper/runner/scenario are in `*-diff.patch` under the evidence directory; Git changes for this turn are exactly the seven files above, including two new files.

### Windows CMD: full Cancellation and Document rerun

From the repository directory in the ordinary authorized CMD session, run preflight and inspect exit code before continuing:

```bat
if not exist "logs" mkdir "logs"
set "FITM_EVALUATION_RUN=20261009-evaluation-%RANDOM%-%RANDOM%"
powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" -CheckEnvironment -Cancellation > "logs\%FITM_EVALUATION_RUN%-preflight.log" 2>&1
echo Preflight Exit Code: %ERRORLEVEL%
type "logs\%FITM_EVALUATION_RUN%-preflight.log"
```

After preflight exit 0, run both complete suites:

```bat
powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" -Cancellation > "logs\%FITM_EVALUATION_RUN%-cancellation.log" 2>&1
echo Cancellation Exit Code: %ERRORLEVEL%
type "logs\%FITM_EVALUATION_RUN%-cancellation.log"
powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" > "logs\%FITM_EVALUATION_RUN%-documents.log" 2>&1
echo Document Exit Code: %ERRORLEVEL%
type "logs\%FITM_EVALUATION_RUN%-documents.log"
```

Require all 27 Cancellation scenarios and default Document scenarios PASS, both overall exit codes 0 and successful browser/database cleanup. Inspect the new printed run's `evaluation-errors.json` (on evaluation exception), `mouse-D.json`/`focus-D.json`/screenshot (on D failure), plus `summary.json`/`runner.json`. Remaining risk is actual Chrome scrolling/hit-testing/focus and shared runner diagnostics, including real native document controls and the original unknown exception. Unit/DOM success cannot replace these checks; keep IMPLEMENTED / NEEDS VERIFICATION.

## Scenario D CDP keyboard activation fix — 2026-10-09 Asia/Bangkok

**IMPLEMENTED / NEEDS VERIFICATION.** This is the latest repair/result section. Full Cancellation and default Document Chrome acceptance must both pass in a fresh user-run environment before verification status changes.

### Confirmed root cause: E2E CDP keyboard simulation

Inspected all four artifacts in `logs/staff-cancellation-browser-471b2363726a40faa30fc1e5fdbdf549/`: `summary.json`, `runner.json`, `focus-D.json` and `failure-D.png`. A/B passed; D timed out at the supplied original line 195, `keyboard opens cancellation modal`. The diagnostic identifies `staffCoopCancel` as the active connected enabled BUTTON, with `documentHasFocus=true` and no active/leaving overlay. Screenshot shows its focus outline. Summary reports zero Cancellation POST, runtime errors and console errors; runner reports no cleanup errors. No raw console log or received-key sequence exists in that older directory.

The previous Back focus-restoration, overlay-removal and unchanged-SQL assertions were reached and passed before this timeout. The static opener is `button[type=button]` with the normal click listener. No opener rerender occurs in this interval. Shared Modal's Tab/Escape listener is removed during close; it is not installed while the next keyboard opening fails. The same overlay selector already detected the first opening. These facts exclude missing opener, disabled state, lost page focus and an already-open modal as explanations of this failure.

The Enter pair added in the previous fix supplied `key`, `code` and Windows virtual key code, but omitted layout `text`. [CDP Input protocol](https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/Input.pdl) defaults that field to empty. [Chromium keyboard event manager](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/input/keyboard_event_manager.cc) skips keypress generation for keyDown with empty text; [native button activation](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/html/html_element.cc) handles Enter through keypress character 13 and Space through keyup after keydown. [Puppeteer's CDP keyboard implementation](https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/cdp/Input.ts) and [key definitions](https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/common/USKeyboardLayout.ts) supply carriage return for Enter. This identifies a defective E2E payload matching the observed failure; the repaired native sequence still requires actual Chrome execution. No Puppeteer dependency was introduced.

### Minimal fix, behavior and diagnostics

- New cancellation-only `backend/scripts/staffBrowserInput.js` sends Enter keyDown with `text`/`unmodifiedText='\r'`, Space with `key=' '`/`code='Space'` and space text, then matching keyUp. Tab/Escape use rawKeyDown/keyUp without text. Button activation checks the current connected enabled native button, active element and page focus immediately before sending keys.
- Scenario D opens first with native CDP mouse press/release, then independently with Enter and Space. Keyboard branches never call `.click()` or synthesize DOM events. They require a trusted received keypress at the opener (character 13/32), initial modal focus, Escape close, actual overlay removal, focus restoration and unchanged POST count/request/audit after each close. Existing identity, reason, Tab, Back, focus and no-write assertions remain; timeout is unchanged.
- On D failure, `focus-D.json` retains prior fields and adds trigger type, modal visibility, sent/acknowledged/failed keyboard sequence, focus before/after each key, received keydown/keypress/keyup/click/focus events, and D-local console-error counts/types. Only fixed control identifiers, supported keys and event metadata are recorded; no reason/password/storage/header/token/raw console message is saved. The temporary observer never prevents default and is removed in finally.
- Frontend Staff UI, `feedback.js`, existing Staff DOM tests and fixture are byte-for-byte unchanged from this turn's starting snapshots. Previous focus restoration/fallback remains in place. No business/auth/approval/document/menu/migration change, DB access, Chrome launch, commit, push or deployment was performed. Docker/Windows/sandbox policy was not changed or bypassed.

| Keyboard behavior | Before this fix | After this fix, prepared for Chrome verification |
| --- | --- | --- |
| Enter | Focused enabled opener; missing character text; actual Chrome timed out | Native keyDown includes CR; matching keyUp; assert received character and opened modal |
| Space | Not exercised by Scenario D | Native space key/text; activation on keyUp; assert modal opening |
| Tab / Escape | keyDown without layout text + keyUp | Appropriate non-character rawKeyDown + keyUp; retained focus/close assertions |
| Mouse | Programmatic opener `.click()` | Native CDP pointer press/release at an unobscured control |

### Actual local regression results

Evidence: `logs/staff-cancellation-keyboard-fix-20261009/`.

| Executed check | PASS | FAIL | SKIP | Log |
| --- | ---: | ---: | ---: | --- |
| CDP helper unit contracts | 7 | 0 | 0 | `input-unit.log`; included in Backend total |
| Full Frontend DOM/unit | 242 | 0 | 2 | `frontend-all.log`; includes existing Staff 36 and document/shared-modal/Student/Class/Head regressions |
| Full Backend safe unit configuration | 155 | 0 | 17 | `backend-unit.log`; DB opt-ins cleared/false and unreachable test-only loopback target |
| Production Frontend build | 1 | 0 | 0 | `frontend-build.log`; 123 modules |
| Changed JavaScript syntax | 3 | 0 | 0 | `syntax.log` |
| Git whitespace diff | 1 | 0 | 0 | `diff-check.log`; exit 0 |
| Preserved Frontend/focus implementation hashes | 4 | 0 | 0 | `frontend-preservation.log` |
| Full Cancellation / default Document Chrome | — | — | — | Await user execution; session Docker/Chrome restrictions respected |

Unit tests validate CDP transport contracts, focus/state guards, error propagation and native mouse commands; they do not emulate Chromium's default action or claim browser success. Existing DOM fixtures do not implement native keyboard activation, so no fake Enter/Space-to-click behavior was added. Full tests use the permitted in-process Node test mode. Focused/full totals overlap and must not be added together.

Git diff for this turn is limited to four files: modified scenario module and this report; new input helper and seven-case helper test. All prior uncommitted changes remain. `scenario-diff.patch` records a comparison against the start-of-turn snapshot, which is necessary because the scenario file was already untracked. No staging or commit occurred.

### Copyable Windows CMD: full Chrome rerun

Run in the repository directory from the user's ordinary authorized CMD session. Inspect preflight and proceed only after exit 0; do not alter execution policy.

```bat
if not exist "logs" mkdir "logs"
set "FITM_KEYBOARD_RUN=20261009-keyboard-%RANDOM%-%RANDOM%"
powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" -CheckEnvironment -Cancellation > "logs\%FITM_KEYBOARD_RUN%-preflight.log" 2>&1
echo Preflight Exit Code: %ERRORLEVEL%
type "logs\%FITM_KEYBOARD_RUN%-preflight.log"
```

Run **all Cancellation scenarios**, followed by the independent default **Document regression**:

```bat
powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" -Cancellation > "logs\%FITM_KEYBOARD_RUN%-cancellation.log" 2>&1
echo Cancellation Exit Code: %ERRORLEVEL%
type "logs\%FITM_KEYBOARD_RUN%-cancellation.log"
powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" > "logs\%FITM_KEYBOARD_RUN%-documents.log" 2>&1
echo Document Exit Code: %ERRORLEVEL%
type "logs\%FITM_KEYBOARD_RUN%-documents.log"
```

Require both exit codes 0, all 27 Cancellation scenarios PASS without skips, Document PASS and successful browser/database resource cleanup. Inspect each new run's printed artifact directory and `summary.json`/`runner.json`; on D failure inspect the expanded `focus-D.json` and screenshot. Remaining risk is actual Chrome dispatch/default-action and pointer hit-testing behavior: local contracts and DOM tests cannot certify it. Existing business/SQL/document browser coverage later in the suite must also complete; A/B or D alone is insufficient.

## Scenario D focus restoration fix — 2026-10-09 Asia/Bangkok

**IMPLEMENTED / NEEDS VERIFICATION.** This section supersedes the execution-pending cancellation baseline below: the supplied Chrome run failed D after A/B passed. The repaired full Cancellation and Document Chrome suites still require fresh execution.

### Confirmed cause and evidence

- Inspected `logs/staff-cancellation-browser-63c79c804be8427fac68517efe408e73/{summary.json,runner.json,failure-D.png}`. Chrome was `154.0.8037.98`; A/B passed; D failed; cancellation POST count, runtime errors and console errors were all zero. Runner cleanup errors were empty. This directory contains no raw console log or active-element diagnostic; counts come from summary, and the timeout stack was supplied by the user.
- D passed the Back-close wait before timing out at the original line 173. Screenshot shows no overlay and a focus outline at `staffCoopDetailHeading`. Escape occurs after this assertion, so it was never reached in that failed run.
- `openDetail()` explicitly focuses that heading. The shared CDP `click()` helper calls `element.click()` without moving focus. `askCancel()` sets `modalOpen` and calls `controls()` (disabling the cancellation button) before `showConfirmModal()` snapshots `document.activeElement`. The snapshot therefore does not reliably identify the opener. The old close timer focuses that snapshot after removing the overlay.
- This is a frontend accessibility/integration bug; the automated click exposes it. The requested assertion that focus returns to the cancellation opener is valid. A real focused opener is also disabled before capture, so explicit identity is necessary instead of depending on incidental focus.
- The opener is a static sibling of `staffCoopDetailBody`. Detail rendering replaces only that body's children, and Back/Escape `onClose` only restores controls: no opener replacement or request refresh explains this failure.
- `until()` polls every 100 ms for 15,000 ms; modal removal/restoration waits 180 ms. The timeout was already long enough for the intended behavior. There is no evidence of a wrong selector or a CDP focus-state limitation. DOM simulation of the original focus code reproduces heading restoration for programmatic activation and body restoration for the modeled focused/disabled path; this simulation is not fresh Chrome evidence.

### Minimal change and regression scope

| File changed in this fix | Change |
| --- | --- |
| `frontend/src/pages/staffCoopRequests.js` | Capture cancellation opener explicitly; supply fallback resolver for its current replacement or the detail heading when cancellation is unavailable |
| `frontend/src/ui/feedback.js` | Optional `returnFocus` / `fallbackFocus`; restore after the existing leave timer and `onClose`; skip disconnected, disabled, hidden or inert targets; preserve active-element default for other callers |
| `frontend/test/helpers/staffCoopRequestsFixture.js` | Add DOM connection/disabled-focus modeling and explicit timer flush for restoration assertions |
| `frontend/test/staffCoopRequests.test.js` | Nine new cases: Back/Escape with focused/programmatic activation, exact original identity, replacement, removed/disabled fallback, post-success fallback, shared default and hidden-panel behavior |
| `backend/scripts/staffCoopCancellationBrowserScenarios.js` | Keep Back focus assertion; add Escape focus and full overlay-removal checks; independently assert no POST/SQL write after both closes; use native Enter activation on second opening; pair keydown/up; save safe `focus-D.json` diagnostics on failure |
| This acceptance document | Record current failure, repair, executed checks and full Chrome rerun commands |

No cancellation state, reason validation, approval/authentication rule, document workflow, migration or menu change. Existing uncommitted work was preserved. The pre-existing `return close` addition in shared feedback belongs to the earlier work, not this fix. `showActionModal` was inspected and left unchanged. No timeout increase, assertion removal, browser-success mock, persistent DB access, commit, push or deployment.

### Checks actually executed after the fix

| Check | PASS | FAIL | SKIP | Evidence |
| --- | ---: | ---: | ---: | --- |
| Staff DOM/unit | 36 | 0 | 0 | `frontend-focused.log`; included in full Frontend total |
| Full Frontend DOM/unit | 242 | 0 | 2 | `frontend-all.log`; existing native-browser/SQL opt-ins skipped |
| Full Backend safe unit configuration | 148 | 0 | 17 | `backend-unit.log`; integration opt-ins cleared/false, DB target unreachable test-only loopback |
| Production Frontend build | 1 | 0 | 0 | `frontend-build.log`; 123 modules |
| Changed JavaScript syntax | 5 | 0 | 0 | `syntax.log` |
| Dependency preflight | 1 | 0 | 0 | `dependency-check.log` |
| Whitespace diff check | 1 | 0 | 0 | `diff-check.log`; exit 0 |
| Original focus code reproduction | 4 reproduced failures | — | — | `original-focus-reproduction.log`; in-memory DOM simulation, not acceptance |
| Docker read-only access check | — | — | — | `docker-access.log`; exit 1, permission denied on `dockerDesktopLinuxEngine` named pipe |
| Full Cancellation Chrome / Document Chrome | — | — | — | Not run in this session; disposable Docker prerequisite inaccessible |

Evidence directory: `logs/staff-cancellation-focus-fix-20261009/`. Build used `npm.cmd --prefix frontend run build -- --configLoader native`; tests used `node --test --test-isolation=none` (full suites additionally `--test-force-exit`). Counts overlap: do not add focused/full totals. No Docker mutation or Chrome launch was attempted after the access denial, and no policy/ACL/execution-policy workaround was used.

Regression risk is concentrated in shared confirmation focus restoration. Default behavior is covered by DOM tests; Staff documents, Student, Class/Head approval and other modal consumers passed the full local unit/DOM suites. Real browser focus/animation, native document controls and SQL integration remain unverified. Require both full Chrome suites and their resource cleanup to pass before upgrading status.

### Windows CMD: rerun the complete suites

From the repository directory in the user's ordinary authorized CMD session (do not change execution policy):

```bat
if not exist "logs" mkdir "logs"
set "FITM_FOCUS_RUN=20261009-focus-%RANDOM%-%RANDOM%"
powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" -CheckEnvironment -Cancellation > "logs\%FITM_FOCUS_RUN%-preflight.log" 2>&1
echo Preflight Exit Code: %ERRORLEVEL%
type "logs\%FITM_FOCUS_RUN%-preflight.log"
```

After preflight exit 0, run **all Cancellation scenarios**, then the separate default **Document regression**:

```bat
powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" -Cancellation > "logs\%FITM_FOCUS_RUN%-cancellation.log" 2>&1
echo Cancellation Exit Code: %ERRORLEVEL%
type "logs\%FITM_FOCUS_RUN%-cancellation.log"
powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" > "logs\%FITM_FOCUS_RUN%-documents.log" 2>&1
echo Document Exit Code: %ERRORLEVEL%
type "logs\%FITM_FOCUS_RUN%-documents.log"
```

Each runner owns a fresh labelled disposable PostgreSQL container and browser resources. Require both exit codes 0, all 27 Cancellation scenario entries PASS/no skips, default Document tests PASS and successful browser/database cleanup. Read the new run's printed evidence directory and `summary.json`/`runner.json`; if D fails, inspect its new `focus-D.json` and screenshot. Do not reuse the failed run as verification of this repair.

## Chrome cancellation acceptance preparation — 2026-10-09

**IMPLEMENTED / NEEDS VERIFICATION. CHROME E2E IMPLEMENTED — EXECUTION PENDING.** This section supersedes the historical runner/coverage limitations below. Existing uncommitted application changes are preserved. No persistent database, Docker settings, approval permissions or cancellation eligibility are changed.

### Acceptance matrix defined before implementation

The existing infrastructure is Node `node:test` + Chrome DevTools Protocol (native WebSocket), production Express/Vite and ownership-labelled PostgreSQL 16 tmpfs. No Playwright/Puppeteer/Selenium dependency is present or needed. Reuse `runStaffBrowserAcceptance.ps1` and `runDisposableStaffBrowserAcceptance.js` with an explicit `-Cancellation` mode and a separate scenario module under `backend/scripts`, outside automatic backend test discovery. Default document scenarios remain a separate regression invocation.

| ID | Requirement / planned browser evidence | Existing unit / PostgreSQL evidence | Browser result |
| --- | --- | --- | --- |
| A | Password login; active Staff; anonymous, foreign roles, inactive and invalid session denied | `roleAuth`, `staffAuth`, `roleWorkflow.database` | PENDING |
| B | Live all-state queue, name/code/company search, status filter, 25-row pagination, safe detail | `staffCoopRequests`, `roleWorkflow.database` | PENDING |
| C | Four pending statuses allowed; five terminal/post-approval statuses disabled and direct API rejected | `staffCoopRequests`, `coopDirectWorkflow`, `roleWorkflow.database` | PENDING |
| D | Correct identity/status; labelled reason; Back/Escape/focus; opening/closing performs no write | `staffCoopRequests`, shared modal | PENDING |
| E | Empty/whitespace/2001 rejected without POST; direct real API remains strict; trimmed 2000 accepted | `staffCoopRequests`, `roleWorkflow.database` | PENDING |
| F | Real POST → persisted cancelled_at + trimmed reason + Staff actor + one cancel audit; refresh durable | `coopDirectWorkflow`, `roleWorkflow.database` | PENDING |
| G | Held real POST; rapid clicks disabled; no premature success; concurrent real API writes leave one audit | `staffCoopRequests`, `roleWorkflow.database` | PENDING |
| H | Second authenticated advisor session advances pending stage; stale status/time rejected; latest detail reloads | `staffCoopRequests`, `roleWorkflow.database` | PENDING |
| I | Real 400/401/403/404/409/500 and injected transport failure; no success or internal error leakage | `staffCoopRequests`, `roleWorkflow.database` | PENDING |
| J | Owner password login; Student history/detail reads status/reason/role/date after reload; foreign owner denied, no editing | `studentCoopAcceptance`, `roleWorkflow.database` | PENDING |
| K | Approved Cooperation/Response/Placement evidence retained; default document Chrome suite run separately | `staffDocuments`, `companyResponse`, SQL suites | PENDING |
| L | Student submission → Class Advisor → Head remains intact; Staff cannot approve | `coopDirectWorkflow`, `roleWorkflow.database` | PENDING |

Eligibility audited against the current service: `submitted`, `staff_review`, `advisor_review`, `department_head_review` only. UI sends both `expected_status` and ISO `expected_updated_at`; conflicts use HTTP 409. Staff's existing scope is all requests for active Staff (the model has no Staff department restriction); tests must not invent narrower permissions. Student access is owner-scoped.


### Implementation and data safety

| File | Change | Reason |
| --- | --- | --- |
| `backend/test/runStaffBrowserAcceptance.ps1` | Adds Cancellation/CheckEnvironment, installed Chrome discovery, dependency/Docker/image checks, run ID and explicit exit/owner cleanup checks | Keep default document mode; fail on missing prerequisites or cleanup |
| `backend/scripts/runDisposableStaffBrowserAcceptance.js` | Dispatches cancellation; unique artifacts; pre-model guard; non-JSON 404 handling; awaited process/profile/storage cleanup | Reuse production Vite/Express/CDP/SQL lifecycle |
| `backend/scripts/staffBrowserEnvironment.js` | Matching explicit loopback disposable target/test credentials/run ID checks; dependency-only CLI | Reject unsafe targets before migrations/model import; redact secrets |
| `backend/scripts/staffCoopCancellationBrowserScenarios.js` | 27 planned subtests A–L with explicit UI/network/SQL waits, failure screenshots and JSON reports | Real Staff cancellation and Student password login/readback |
| `backend/test/staffBrowserEnvironment.test.js` | Four executed safety tests | Isolation, ambiguous modes and credential redaction |
| `frontend/test/staffCoopRequests.test.js` | Adds 404 refresh and internal-error suppression assertions | Preserve existing tests and improve failure evidence |
| Four project documents | Newest matrix/results/commands/manual fallback | Retain older snapshots without presenting them as new executions |

No dependency, production source, allowed-status, permission or migration change was introduced. The requested `frontend/test/studentCoop.test.js` does not exist; actual Student suites are `studentCoopAcceptance.test.js`, `studentCoopPrerequisites.test.js`, `studentCoopSavedAcceptance.test.js` and project tests.

PowerShell owns one uniquely named `fitm-staff-browser-<run-id>` container labelled `fitm.test-run=<run-id>`, PostgreSQL 16 tmpfs, exact database `fitm_staff_browser_test`, generated password/loopback port and marker `fitm.a017_disposable=on`. Node checks matching URL/process DB host, port, name, user/password, test mode and JWT secret before model import/migration; SQL checks exact database/marker before writes. Migrations through 021 run only in that fresh container (22 executed entries expected). No persistent 017–021 rollout, reset, TRUNCATE or DROP is performed.

Production Express, Vite and Chrome CDP use dynamically allocated loopback ports; no existing process is stopped for conflicts. API disables SMTP in its child environment. Fixtures use UUID student_id/email, `@email.kmutnb.ac.th`, real Model hooks/bcrypt/JWT/password logins and real Class/Head relationships. Pending records are submitted through the real API; legacy/terminal eligibility states are explicitly seeded only in the disposable DB. No historical documents or reviews are deleted. Container removal disposes of all fixture accounts. Cleanup restores process environment and removes only runner-owned storage/profile directories after process termination.

Default browser mode retains existing Cooperation Letter/Company Response/Placement/native preview/download/print scenarios; it needs fresh execution after shared runner edits. Cancellation mode snapshots request/documents/revisions/responses/history around a denied approved-request cancellation, and exercises separate real Class→Head approval APIs.

HTTP 400 corrupts only the outgoing payload; 404 rewrites only the outgoing target UUID; 401 rewrites only the outgoing bearer. These responses come from the real API. HTTP 403 deactivates/restores only generated Staff; 409 uses second-session approval or updated_at change. HTTP 500 uses a temporary SQL trigger scoped to one fixture's cancel-audit insert, verifies rollback and drops the trigger/function in finally. Transport failure uses CDP `Fetch.failRequest`, then retry against the real API. No successful response is fabricated; controlled failure injection is labelled in reports.

CDP one-shot hooks apply only to POST; CORS OPTIONS passes through without consuming them. Student dashboard eagerly loads the Daily Log panel; the cancelled-only owner must receive the existing real `409 INTERNSHIP_PERIOD_REQUIRED` and disabled/no-period feedback on both page loads. That exact expected response is asserted and counted separately from unexpected API failures; production behavior is unchanged.

Artifacts: `logs/staff-cancellation-browser-<run-id>/summary.json` contains step outcomes/times/browser product and response path/status counts; `runner.json` records Node cleanup; screenshots cover Staff/Student desktop/mobile and failing steps where Chrome exists. Setup failure records FAIL without executed cases. Password fields are scrubbed before capture; no JWT/cookies/headers/HAR/storage/HTML dump are saved. Existing Git `logs/` ignore protects artifacts. Require scenario PASS, Node runner PASS, PowerShell owner-label cleanup and overall exit 0; scenario JSON alone cannot certify cleanup.

### Actual new results and earlier evidence

| Suite / check | PASS | FAIL | SKIP | Status / limit |
| --- | ---: | ---: | ---: | --- |
| Full local Backend units | 148 | 0 | 17 | NEW, exit 0; 34 files; SQL roots skipped |
| Full local Frontend DOM/unit | 233 | 0 | 2 | NEW, exit 0; 18 files; native-browser and SQL bridge skipped |
| JavaScript syntax | 245 | 0 | 0 | NEW static execution, exit 0 |
| PowerShell AST parse | 1 | 0 | 0 | NEW static execution; not runner behavior |
| Frontend build | 1 | 0 | 0 | NEW, 123 modules, exit 0 |
| Disposable-target guard tests | 4 | 0 | 0 | Included in Backend 148; do not add again |
| Invalid-mode/missing-Chrome runner behavior attempts | — | — | — | BLOCKED at script load by PowerShell policy, both process exits 1 |
| Focused PostgreSQL supplied by user | 46 | 0 | 0 | EARLIER user evidence, exit 0; 45 children + parent |
| Full Backend supplied by user | 241 | 0 | 1 | EARLIER user evidence, exit 0; not rerun here |
| Earlier Frontend supplied in prompt | 231 | 0 | 2 | Historical; new local DOM result is 233/0/2 |
| Cancellation Chrome | — | — | — | 27 implemented subtests, EXECUTION PENDING |
| Default document Chrome regression | — | — | — | EXECUTION PENDING after shared runner edits |

New logs: `logs/staff-cancellation-preparation-20261009-1791556436745/`: `backend-unit.log`, `frontend-dom.log`, `frontend-build.log`, `static-checks.log`, `static-summary.txt`, two `runner-*.log` files, `runner-negative-summary.txt` and final Git/check logs. Negative-summary records exit codes only; actual logs show script-load denial, not executed assertions about runner behavior.

Node 24.11.1 local tests used `--test --test-isolation=none --test-force-exit`, all discovered files, cleared disposable/browser variables, false integration opt-ins and unreachable `127.0.0.1:1/fitm_unavailable_test`/test-only credentials. Source opt-ins remain unchanged. Four guard tests explain Backend 144→148; two added DOM cases explain Frontend 231→233. Historical SQL children cannot be summed with local unit totals.

Final guard-only replay initially omitted the established in-process flag: Node's default test child launch returned `spawn EPERM`, so no guard assertions executed in that invocation (`guard-final.log`). Replaying with the same permitted in-process configuration used throughout the local suites passed **4/0/0**, exit 0 (`guard-final-in-process.log`), after tightening the redaction test to require an actual throw. This overlapping replay is not added to Backend 148. Final changed-file syntax, PowerShell parse and diff checks also pass (`final-summary.txt`).

Supplied baseline says Docker's named pipe is inaccessible to Codex and an earlier Chrome smoke was rejected by automatic approval review (“blocked by policy”). Neither operation was retried/bypassed. Actual negative runner attempts additionally encountered PowerShell “running scripts is disabled,” before runner bodies executed. No execution policy change, alternative launch, Docker container, Chrome profile, SQL fixture or real email was created here.

### Copyable Windows CMD execution

Use the project directory in an ordinary CMD environment **already permitted to run repository PowerShell scripts**. Commands do not change policy. If script/Chrome execution is denied, stop and preserve the log; use an authorized isolated review environment/manual acceptance. Missing dependency/image: prepare the existing project dependencies/images through your normal setup process. Do not reset Docker, change ACLs or use persistent Local as a substitute.

Set a unique suffix once per run, then check prerequisites:

```bat
if not exist "logs" mkdir "logs"
set "FITM_ACCEPTANCE_RUN=20261009-%RANDOM%-%RANDOM%"
node --version
node "backend\scripts\staffBrowserEnvironment.js"
docker version
docker image inspect postgres:16-alpine --format "{{.Id}}"
docker image inspect fitm-intern-backend --format "{{.Id}}"
powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" -CheckEnvironment -Cancellation > "logs\%FITM_ACCEPTANCE_RUN%-preflight.log" 2>&1
echo %ERRORLEVEL%
type "logs\%FITM_ACCEPTANCE_RUN%-preflight.log"
```

After preflight exit 0, execute cancellation:

```bat
powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" -Cancellation > "logs\%FITM_ACCEPTANCE_RUN%-chrome-cancellation.log" 2>&1
echo %ERRORLEVEL%
type "logs\%FITM_ACCEPTANCE_RUN%-chrome-cancellation.log"
findstr /C:"Cancellation scenarios:" /C:"Cancellation evidence:" /C:"cleanup:" "logs\%FITM_ACCEPTANCE_RUN%-chrome-cancellation.log"
```

Always run `echo %ERRORLEVEL%` immediately after the test, before `type`/other commands overwrite it. Chrome is discovered automatically; if necessary add `-ChromePath "C:\Program Files\Google\Chrome\Application\chrome.exe"` using your installed path. The log prints its unique artifact directory; use `type` on that run's `summary.json`/`runner.json`, not an old result. Expect 27 passing scenario entries, no skip/fail and overall exit 0. Node reports a parent too: 28 passing reported tests would mean 27 independent scenario subtests + one parent.

Execute document browser regression and SQL/backend replay separately:

```bat
powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" > "logs\%FITM_ACCEPTANCE_RUN%-chrome-documents.log" 2>&1
echo %ERRORLEVEL%
type "logs\%FITM_ACCEPTANCE_RUN%-chrome-documents.log"
powershell.exe -NoProfile -File "backend\test\runTeacherAdvisorAcceptance.ps1" -BackendOnly -FocusedBackendTests roleWorkflow.database.test.js -FastExit > "logs\%FITM_ACCEPTANCE_RUN%-focused-sql.log" 2>&1
echo %ERRORLEVEL%
type "logs\%FITM_ACCEPTANCE_RUN%-focused-sql.log"
powershell.exe -NoProfile -File "backend\test\runTeacherAdvisorAcceptance.ps1" -FullBackend -FastExit > "logs\%FITM_ACCEPTANCE_RUN%-full-backend.log" 2>&1
echo %ERRORLEVEL%
type "logs\%FITM_ACCEPTANCE_RUN%-full-backend.log"
```

The SQL runner uses cached Backend image, readonly current-source bind, internal network, disposable names/markers and owned cleanup. Focused SQL is included in full regression; do not sum them. Redirection remains at the end of its command. A failed preflight/execution never counts as acceptance.

### Manual Browser Acceptance fallback

This is **Manual Browser Acceptance**, not Automated Chrome E2E. Codex has not started a safe manual environment. Automated fixture accounts disappear at cleanup and no reusable credentials are printed. An authorized tester must first prepare a disposable review instance, verify database identity/marker, seed model-valid active Staff/owner/foreign Student/Class/Head accounts, all tested statuses and separate approved document owners. Keep credentials private. Stop without isolation or policy permission; never use actual accounts/persistent Local. Record fixture request IDs, role, UTC/Bangkok time and run-specific evidence.

| ID | Manual action / expected result | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| A | Password login active Staff; missing/invalid/foreign/inactive session denied | Not executed | — | BLOCKED |
| B | Name/code/company search, filters, >25 records/pages and detail agree with SQL | Not executed | — | BLOCKED |
| C | Four pending states allowed; five other states disabled + API 409 + unchanged SQL | Not executed | — | BLOCKED |
| D | Identity/status/reason label, Back/Escape/focus; no mutation on open/close | Not executed | — | BLOCKED |
| E | Empty/whitespace/2001 refuse without POST; API 400; trimmed 2000 accepted | Not executed | — | BLOCKED |
| F | Confirm once; SQL cancelled/reason/Staff/time/one audit; reload retains data | Not executed | — | BLOCKED |
| G | Hold/throttle request, click rapidly; no premature success/duplicate POST/audit; concurrent API 200/409 | Not executed | — | BLOCKED |
| H | Second Class session approves or updated_at changes; stale confirm 409/latest refresh/no success | Not executed | — | BLOCKED |
| I | Isolated real 400/401/403/404/500 + transport loss/retry; sanitized UI, no success, rollback SQL | Not executed | — | BLOCKED |
| J | Owner password login/history/detail/status/reason/role/date/reload; no edit; foreign detail 404/list omits record | Not executed | — | BLOCKED |
| K | Snapshot Cooperation/Response/Placement/revisions before denied cancellation; unchanged after; native preview/download/print work | Not executed | — | BLOCKED |
| L | Separate Student→Class→Head reaches approved; Staff cannot approve; canceled request cannot advance | Not executed | — | BLOCKED |
| UI | Desktop/390px mobile/navigation/focus/console/network/screenshots | Not executed | — | BLOCKED |

Fill Actual/Evidence/PASS/FAIL/BLOCKED only after executing and checking UI plus SQL/API readback. Browser-visible success alone is insufficient.

### Coverage and acceptance decision

| Requirement | New local evidence | PostgreSQL | Chrome | Status |
| --- | --- | --- | --- | --- |
| Authentication/roles/reason | Backend + Staff DOM PASS | Earlier focused/full user report | A/E/I unexecuted | NEEDS VERIFICATION |
| Eligibility/duplicate/stale | Cancellation units + Staff DOM PASS | Existing cases in earlier user report | C/F-G/H unexecuted | NEEDS VERIFICATION |
| Audit/transaction rollback | Service units PASS | Earlier focused SQL report; new trigger scenario pending | F-G/I-500 unexecuted | NEEDS VERIFICATION |
| Student readback/foreign privacy | Student display + role units PASS | Earlier controller/SQL report; real Student JWT/browser bridge pending | J unexecuted | NEEDS VERIFICATION |
| Document/approval regression | Full local Backend/Frontend units PASS | Earlier full Backend report | K/L/default documents pending | NEEDS VERIFICATION |

Scope remains **IMPLEMENTED / NEEDS VERIFICATION**. VERIFIED requires actual automated Chrome or completed manual UI+SQL evidence for the matrix, current SQL/role/document/approval regression, no blocking defects and reliable cleanup. Scripts/units/build/static checks do not replace execution evidence. Next: permitted CMD execution and evidence review. No feature redesign, persistent migration rollout, commit, push, PR or deployment.

## Student cancellation fixture root-cause fix — 2026-10-09

**สถานะล่าสุด: IMPLEMENTED / NEEDS VERIFICATION. PostgreSQL replay หลังแก้และ Browser Acceptance ยัง NOT VERIFIED.** ผล PostgreSQL ที่ผู้ใช้รายงานก่อนแก้คือ **44 PASS / 2 FAIL / 0 SKIP** (หนึ่ง subtest failure และหนึ่ง parent failure); ไม่ใช่ผลรันใหม่ของ Codex

### Root cause และการแก้ไข

- `backend/test/roleWorkflow.database.test.js:1171` สร้าง Student owner ด้วย `staff-cancel-owner@fixture.invalid` ใน `Student.create()` ก่อนสร้าง CoopRequest หรือเรียก cancellation/readback
- Production Student Model กำหนด `ALLOWED_EMAIL_DOMAIN = "@email.kmutnb.ac.th"`, ตรวจ `isEmail` และ `isKmutnbEmail`; email และ student_id มี unique constraints การ validate fixture เดิมด้วย Model จริงและ hook เดิมให้ `SequelizeValidationError` เพียงรายการเดียว: path `email`, validator `isKmutnbEmail` และข้อความโดเมนมหาวิทยาลัย จึงยืนยันว่า test data ขัดกับ Model; ไม่มีหลักฐานว่า Student Readback API เป็น bug
- เปลี่ยนเฉพาะ fixture ใน subtest นี้เป็น `student_id: staff-cancel-owner-${UUID}` และ `email: staff-cancel-owner-${UUID}@email.kmutnb.ac.th` โดยใช้ UUID เดียวกันจาก `crypto.randomUUID()`; แยกจาก Student fixture หลักและรองรับ unique constraints การสร้างด้วย SQL จริงยังใช้ `m.Student.create()` ตามเดิม
- `request('advisor_review', owner.id)` ยังผูก CoopRequest กับ owner จริง; audit ยังผูกกับ CoopRequest และ Staff ที่ยกเลิก ผ่าน transaction เดิม Readback controller ยังจำกัดด้วย `id + req.user.id` และ foreign owner ได้ 404 ตามกติกาเดิม
- คง assertions เดิมทั้งหมด เพิ่มเฉพาะ owner/cancelled_at, audit หนึ่งรายการพร้อม actor/decision/from/to/time, foreign detail ไม่มี data และ foreign list ไม่มีคำร้องนี้ รวมถึง SQL snapshots ของคำร้องและ audit ที่ต้องไม่เปลี่ยนหลัง readback/foreign access/การยกเลิกซ้ำ
- Student readback ใน subtest นี้เรียก controller จริงกับ disposable Sequelize registry โดยใส่ `req.user.id` โดยตรง จึงตรวจ controller ownership กับ SQL; ไม่ใช่ Student JWT HTTP end-to-end ใหม่ Staff cancellation ยังเรียก HTTP พร้อม Staff JWT จริง Authentication cases เดิมคงอยู่ และ local unit regression ตรวจ role/JWT guards แยกต่างหาก
- ไม่มี Production Code, validation, authentication, approval workflow, migration หรือ UI เปลี่ยนในงานนี้ ไม่ได้ reset ฐานข้อมูล ลบ audit, commit, push หรือ deploy; รักษางานที่มีอยู่ก่อนแล้วทั้งหมด

### ผลที่รันจริงใน Codex

| การตรวจ | ผล | ข้อจำกัด / หลักฐาน |
|---|---|---|
| Real Student Model `build().validate()` พร้อม hook เดิม | PASS: fixture เดิมถูก reject; fixture ใหม่ validate ผ่าน | ไม่เชื่อม SQL และไม่พิสูจน์ unique constraint ในฐานข้อมูล; `logs/staff-cancellation-student-fixture-validation-20261009.log` |
| Focused Backend unit regression | **40 PASS / 0 FAIL / 0 SKIP** | `coopDirectWorkflow.test.js`, `roleAuth.test.js`, `staffAuth.test.js`, `coopRequestCompany.test.js`; `logs/staff-cancellation-student-fixture-unit-20261009.log` |
| `node --check backend/test/roleWorkflow.database.test.js` | PASS, exit 0 | `logs/staff-cancellation-student-fixture-checks-20261009.log` |
| `git diff --check` | PASS, exit 0 | Log เดียวกัน; Git มี LF/CRLF warnings |
| Read-only `docker version --format '{{.Server.Version}}'` | BLOCKED, exit 1 | `permission denied` ที่ `npipe:////./pipe/dockerDesktopLinuxEngine`; หยุดเรียก Docker ไม่ bypass sandbox หรือแก้ settings |
| PostgreSQL subtest ที่แก้และ Staff SQL regression | **PENDING** | ต้อง replay จาก Windows CMD ที่ Docker ใช้งานได้ |
| Real Browser Staff/Student cancellation acceptance | **PENDING** | Unit/validation ไม่ทดแทน Browser Acceptance; document browser runner เดิมไม่ครอบคลุม cancellation ทั้งหมด |

Unit command ที่รันจริง: `node --test --test-isolation=none backend/test/coopDirectWorkflow.test.js backend/test/roleAuth.test.js backend/test/staffAuth.test.js backend/test/coopRequestCompany.test.js` ใช้ DB target ที่เข้าถึงไม่ได้ `127.0.0.1:1/fitm_unavailable_test`, credentials สำหรับ test, `ROLE_BACKEND_INTEGRATION_TEST=false` และล้าง `ROLE_DISPOSABLE_DATABASE_URL` เฉพาะ process environment ของคำสั่ง ไม่ได้เปลี่ยน test opt-ins ใน source ผล 40 tests เป็น unit regression รวมถึง Staff cancellation/stale/concurrency/audit rollback และ role/JWT guards; ไม่ใช่ SQL execution ของ assertions ที่เพิ่ม

### PostgreSQL replay สำหรับ Windows CMD

รันจากโฟลเดอร์โปรเจกต์ใน CMD ปกติ ใช้ image `fitm-intern-backend` เดิมและ runner ที่ bind source ปัจจุบันแบบ readonly สร้าง PostgreSQL tmpfs และ internal network แยกตาม run ID ตรวจชื่อ `fitm_role_test`/marker ก่อนเขียน และ cleanup เฉพาะ resources ของ invocation นี้ ไม่ใช้ persistent database

```bat
powershell.exe -NoProfile -File "backend\test\runTeacherAdvisorAcceptance.ps1" -BackendOnly -FocusedBackendTests roleWorkflow.database.test.js -FastExit > "logs\staff-cancellation-student-fixture-postgresql-20261009.log" 2>&1
echo %ERRORLEVEL%
```

ส่ง exit code และผลรวมจาก log กลับมาตรวจ รวมถึง subtest `Student owner reads Staff cancellation state/reason/audit and foreign owner stays forbidden` ต้องผ่านจริงก่อนปิด SQL failure หลัง SQL ผ่านยังต้องครบ real Browser Acceptance ตาม checklist ด้านล่างก่อนเปลี่ยน Scope เป็น VERIFIED

## Codex access follow-up — 2026-10-09

**Latest status: IMPLEMENTED / NEEDS VERIFICATION. PostgreSQL and Chrome cancellation acceptance remain NOT VERIFIED.** This environment follow-up preserves the previous acceptance evidence and all inherited application/test work. Only the four documentation files and a new ignored diagnosis log changed. No suites were rerun; previous suite totals below must not be relabelled as new executions.

### Current session versus ordinary Windows CMD

- User-provided ordinary CMD evidence: Docker Client/Server **29.7.2**, Desktop **4.88.1**, API **1.55**, `desktop-linux`, Linux/amd64, WSL kernel **6.18.33.2-microsoft-standard-WSL2**, five running containers; `docker version`, `docker info`, `docker context ls` and `wsl --status` succeed. This is host evidence supplied by the user, not a Server response obtained by Codex.
- Current Codex evidence: PowerShell **5.1.26100.9444**, Windows version **10.0.26200.0**, identity `mintlovemos\suran`, correct project working directory. Client executable is `C:\Users\suran\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`. `DOCKER_HOST`, `DOCKER_CONTEXT` and `DOCKER_CONFIG` are unset.
- `docker context ls` succeeds and selects `desktop-linux` at `npipe:////./pipe/dockerDesktopLinuxEngine`. `docker version` prints Client **29.7.2**, API **1.55**, matching context, then fails opening that named pipe with **permission denied**, exit **1**. Docker calls stopped immediately. `docker info` and `docker compose ps` were intentionally not executed after denial; no WSL or alternate-context retry was made in this follow-up.
- Read-only configuration inspection: `.codex/config.toml` selects `sandbox_mode = "workspace-write"`, `approval_policy = "never"`, `[windows] sandbox = "unelevated"`. OpenAI documents that the unelevated Windows sandbox runs with a restricted token derived from the current user. This makes token/policy restrictions a plausible explanation for CMD versus Codex access, but does not prove which pipe ACL or policy denied access. See [official Windows sandbox documentation](https://learn.chatgpt.com/docs/windows/windows-sandbox). No sandbox/configuration/ACL/group/settings changes or elevation were attempted.
- A shared client/context rules out a demonstrated context mismatch; the observable difference is access from the execution session. It is not evidence that the host Engine has stopped or WSL integration is disabled. The earlier request to obtain an ordinary-terminal comparison is now satisfied by the user's supplied results; do not keep asking for that comparison or reset Docker.

Evidence: `logs/staff-cancellation-codex-environment-20261009.log` records these observed results and separately labels user-reported and historical facts. `git diff --check` passed. No Docker resources or database connections were created in this follow-up.

### PostgreSQL and browser coverage limits

Reviewed `backend/test/runTeacherAdvisorAcceptance.ps1`, `backend/test/roleWorkflow.database.test.js`, `backend/test/runStaffBrowserAcceptance.ps1` and `backend/scripts/runDisposableStaffBrowserAcceptance.js`. The SQL runner uses a unique ownership-labelled tmpfs PostgreSQL container and internal network; fixed disposable URLs, exact `fitm_role_test` name and `fitm.a013_disposable=on` are checked before test DDL/writes. Its cleanup targets only resources created by its own invocation. The current Codex session cannot start it safely because Docker access is denied.

Cancellation SQL cases exist for authorized/unauthorized actors, required reason and invalid payloads, disallowed/already-cancelled states, stale status/time, concurrent cancellation/approval, audit rollback, persisted history and identity, Student owner readback and document evidence retention. **Existence of these tests is not PostgreSQL execution evidence.** Status update/audit transaction consistency remains pending real SQL acceptance.

The real Chrome runner requires its own `fitm_staff_browser_test` database and `fitm.a017_disposable` marker; it starts production Express/Vite on loopback and an exclusive Chrome profile. Default scenarios cover Staff login and existing Cooperation Letter, Company Response, Placement and navigation/feedback/error regression. There is **no cancellation mode/flag/scenario**: it does not accept cancellation modal/search/filter/pagination or Student cancellation readback. An earlier Chrome smoke launch/profile command was rejected by automatic approval review before execution as **blocked by policy**. No browser launch was retried here; both the unavailable disposable DB and that prior policy rejection remain blockers. No console/network or native E2E outcome is claimed.

Latest existing evidence remains Backend **144 PASS / 0 FAIL / 17 SKIP**, Frontend **231 PASS / 0 FAIL / 2 SKIP**, earlier focused **76 PASS / 0 FAIL / 0 SKIP**, syntax **242 PASS**, build **PASS**. These overlap and are not summed. Historical Backend **357 PASS** included SQL subtests; all historical roots remain discovered, and current safe unit configuration skips 17 integration roots while adding five unit roots. This follow-up adds no application-test PASS/FAIL/SKIP results.

### Actual project commands for ordinary Windows CMD

Run one command at a time from the project directory in the ordinary CMD environment where Docker already succeeds. These are existing repository scripts and actual supported flags. The SQL runner expects the existing `fitm-intern-backend` image (override only with its real `-BackendImage` parameter if appropriate); Chrome expects its configured installed executable, local Node/backend/frontend dependencies and PostgreSQL image availability. If a prerequisite or execution policy blocks a command, keep the failure log and stop; these instructions do not authorize policy bypass or privilege/configuration changes.

```bat
powershell.exe -NoProfile -File "backend\test\runTeacherAdvisorAcceptance.ps1" -BackendOnly -FocusedBackendTests roleWorkflow.database.test.js -FastExit > "logs\staff-cancellation-user-sql-20261009.log" 2>&1

powershell.exe -NoProfile -File "backend\test\runTeacherAdvisorAcceptance.ps1" -FullBackend -FastExit > "logs\staff-cancellation-user-full-20261009.log" 2>&1

powershell.exe -NoProfile -File "backend\test\runStaffBrowserAcceptance.ps1" > "logs\staff-cancellation-user-chrome-documents-20261009.log" 2>&1
```

After each command, `echo %ERRORLEVEL%` in CMD records its exit status. Full regression includes focused SQL and must not be added to focused totals. The final command is **document regression**, not complete cancellation E2E. Complete the existing Staff/Student cancellation checklist below in a separately prepared disposable review instance with real Chrome; there is no existing command that automates all those new interactions. Do not invent a cancellation flag or point any test URL at persistent Local.

No persistent Local/staging/production data or migrations **017–021** were touched; no original containers/volumes were removed and no Docker settings changed. No application bug is verified, so no application fix/refactor/test-source changes were made. No commit/push/deploy. Recommended next task is disposable SQL replay and missing real Chrome cancellation coverage, then review evidence before changing scope to VERIFIED.

## Final acceptance recheck — 2026-10-09

**Latest acceptance status: IMPLEMENTED / NEEDS VERIFICATION. PostgreSQL and real Chrome E2E remain NOT VERIFIED.** This continuation audited the existing dirty working tree and preserved every inherited application/test change. Only the four requested documentation files changed during acceptance. No demonstrated application bug was found in available executions, so no feature/refactor/source fix was made. Earlier implementation/evidence below is retained as history.

### Previous results and test-count reconciliation

Read all previous `staff-cancellation-*-20261009.log` summaries and historical `activity-full-regression-20261009.log`. The prior Backend 144/0/17, Frontend 231/0/2, focused 76/0/0, syntax 242/0, build 123 modules and diff-check success are supported by their actual logs. The focused log precedes two frontend cases subsequently collected in the full suite; it was not rerun or added to current totals.

Historical Backend 357 PASS contains **156 root tests and 201 nested tests**. Current Backend discovers **161 roots**, including all 156 old roots plus five added cancellation unit tests; `missingRootTests=[]`. Seventeen existing integration roots are skipped under the safe unit configuration and their child checks do not run. Thus historical **139 unit + 218 integration checks = 357**, while current **139 old unit + 5 new unit = 144 PASS**, plus **17 root SKIP**. This arithmetic is a comparison of distinct categories within the historical run, not a sum of overlapping runs. Evidence: `logs/staff-cancellation-acceptance-count-comparison-20261009.log`, which lists every skipped/added root.

Historical command: guarded `runTeacherAdvisorAcceptance.ps1 -FullBackend` uses the cached backend container, PostgreSQL tmpfs/internal network, exact disposable names/markers, opt-in URLs and `node --test --test-concurrency=1` (optional `--test-force-exit`). Current local Node **24.11.1** uses `--test-isolation=none`, all **33 Backend test files**, explicit integration opt-ins false and cleared disposable URLs, with unreachable `127.0.0.1:1/fitm_unavailable_test`/test-only credentials. Root discovery was preserved; missing SQL child execution explains the smaller count. No failure-based regression is established. Current Frontend discovers all **18 test files**; its two skips remain the existing native-browser and disposable SQL bridge prerequisites.

### Docker, WSL and browser diagnosis

Commands actually executed: `docker version`, `docker info`, `docker context ls`, `docker compose ps`, read-only `docker --context default version`, `wsl --status`, `wsl --list --verbose`, process/service inspection, targeted Docker backend-log tail/settings inspection and Chrome executable-version metadata.

- Docker client **29.7.2** is installed; active context **desktop-linux** targets `npipe:////./pipe/dockerDesktopLinuxEngine`. Version/info/Compose probes return **permission denied**, exit 1 for version/info. Explicit default-context probe also denies `npipe:////./pipe/docker_engine`; no context switch was made.
- Docker Desktop and com.docker.backend processes exist; vmmemWSL/wslservice are present and WslService is Running. These facts do not establish Engine health.
- Both WSL probes return **Wsl/EnumerateDistros/Service/E_ACCESSDENIED**. Live distributions and integration therefore cannot be inspected from this session.
- Read-only inspection of `C:\Users\suran\AppData\Local\Docker\log\host\com.docker.backend.exe.log` (last 1500 lines filtered for engine/WSL/permission messages) found no matching lifecycle/access-denial explanation. The settings-store file has no explicit WSL/integration keys, so defaults/state cannot be inferred. Host ACL versus session restrictions cannot be conclusively distinguished without an ordinary-terminal comparison. No claim that the Engine is stopped or WSL integration disabled is made.
- Chrome **154.0.8037.98** is installed, verified from executable metadata. A proposed headless smoke launch with an exclusive profile/cleanup command was rejected **before execution** by automatic approval review: **blocked by policy**. No Chrome process/profile/E2E result was created. There is no dedicated browser automation tool in the active tool metadata.

Evidence: `logs/staff-cancellation-acceptance-docker-diagnosis-20261009.log`. Docker Desktop/Engine/WSL were not restarted/reset; no prune, volume removal, original container removal, group/ACL/configuration changes or Docker Desktop settings mutation occurred. No disposable resources were created because access was denied before the database prerequisites could be satisfied. The rejected smoke action is an environment/tool-policy blocker, not an application test failure.

### Current executed regression

| Check | PASS | FAIL | SKIP | Status / new evidence |
|---|---:|---:|---:|---|
| All Backend test files | 144 | 0 | 17 | PASS for executed unit cases; `logs/staff-cancellation-acceptance-backend-20261009.log` |
| All Frontend test files | 231 | 0 | 2 | PASS for executed DOM/adapter cases; `logs/staff-cancellation-acceptance-frontend-20261009.log` |
| Production Frontend build | — | 0 | — | PASS, 13 HTML entries/123 modules; `logs/staff-cancellation-acceptance-build-20261009.log` |
| JavaScript syntax | 242 | 0 | — | PASS; `logs/staff-cancellation-acceptance-syntax-20261009.log` |
| Final diff check | PASS | 0 | — | `logs/staff-cancellation-acceptance-diff-check-20261009.log` |
| PostgreSQL cancellation, auth, reason, transitions, stale state/time, races, rollback, audit, actor, Student readback, document regression | — | — | — | NOT VERIFIED; disposable database cannot be created |
| Actual Chrome Staff/Student/negative cases/approval/documents/navigation/console/network | — | — | — | NOT VERIFIED; DB prerequisite and browser-launch policy blockers |

Commands: `node --test --test-isolation=none` with the complete backend/frontend file lists, `npm.cmd --prefix frontend run build -- --configLoader native`, `node --check` across repository source/test/script JS, `git diff --check`. Existing logs were preserved; new files use `staff-cancellation-acceptance-*`. Counts overlap historical/focused runs and must not be added together. No assertion was removed/test disabled/new skip added in source during this acceptance turn.

No persistent Local/staging/production database was connected to, changed, migrated or reset. No 017–021 persistent rollout; current ledger/schema/physical integrity/locking/audit consistency remain uninspected here. All SQL acceptance requirements below remain pending actual execution. Available unit/DOM regression has no failure; unexecuted SQL/native-browser regression cannot be inferred to pass from it.

### Concrete unblock and replay steps

1. In ordinary PowerShell outside this restricted execution session, run `docker version`, `docker info`, `wsl --status`, `wsl --list --verbose`. Share only whether a Server section appears or access is still denied; no credentials/configuration dump is needed.
2. If ordinary PowerShell can reach Server, use that authorized environment for the existing guarded runners below. This distinguishes an execution-session access problem from unavailable host Engine access; no Docker reset is needed merely because this session gets denied.
3. If ordinary PowerShell also gets denied, open Docker Desktop's dashboard to inspect Engine status. Inspect Settings → General and Resources → WSL Integration for the intended Linux/WSL configuration; the current evidence does not justify toggling settings, deleting data or resetting Docker. Address host access before starting tests. These UI locations were checked against the [official Docker WSL guide](https://docs.docker.com/desktop/features/wsl/); that guide is not evidence of this host's Engine state.
4. Run only the reviewed disposable test scripts; never change their URL/name/marker guards to point at persistent Local:

```powershell
powershell -NoProfile -File backend/test/runTeacherAdvisorAcceptance.ps1 -BackendOnly -FocusedBackendTests roleWorkflow.database.test.js -FastExit
powershell -NoProfile -File backend/test/runTeacherAdvisorAcceptance.ps1 -FullBackend -FastExit
powershell -NoProfile -File backend/test/runStaffBrowserAcceptance.ps1
```

These scripts create ownership-labelled disposable PostgreSQL with tmpfs data, exact database/marker guards and cleanup of their own resources. Migrations execute there only. The existing Staff browser command accepts document regression; it does **not** automate the new cancellation interaction. Complete the dedicated Staff/Student cancellation checklist below in the same kind of disposable review instance using real Chrome, or extend the existing test harness when it can be executed. A document-only browser PASS cannot upgrade cancellation scope to VERIFIED.

Keep **2.3.2 (2) IMPLEMENTED / NEEDS VERIFICATION** until actual PostgreSQL and Chrome results cover the requested acceptance criteria. Recommended next task is environment access recovery and these pending checks, not new feature work or persistent migration rollout. No commit/push/PR/deploy occurred.

Current implementation: **2026-10-09 Asia/Bangkok — IMPLEMENTED / NEEDS VERIFICATION**. Executable unit/DOM tests and build pass. PostgreSQL integration, database integrity/locking/rollback acceptance and real Chrome end-to-end acceptance are **NOT VERIFIED in this session** because Docker engine access returns permission denied. Earlier HANDOFF SQL/Chrome results are historical and do not verify these changes. No persistent database was read, migrated, reset or changed; no account provisioning, commit, push, PR or deployment.

## Audit and existing architecture

The initial working tree was clean: `git status --short`, `git diff --stat` and `git diff --check` had no changes. No applicable AGENTS.md was found in this checkout or ancestors. Read README, current HANDOFF/review, Compose, package/configuration conventions, request models/routes/controllers/service/migrations/tests, Staff dashboard/document controller and shared feedback/CSS before implementation. Existing committed calendar/documents/daily/supervision work remains in place.

`CoopRequest` uses `coop_requests` and `CoopRequestReview` uses `coop_request_reviews`. Existing `POST /api/staff/coop-requests/:id/cancel` already requires an active Staff account, nonblank reason of at most 2000 characters, pending state, a transaction and Student-then-request row locks. It writes `status=cancelled`, server `cancelled_at`, and a review with Staff identity, previous/new statuses, reason and server creation timestamp. Migrations 011/012 already supply actor/transition/reason constraints and restrictive audit actor/request FKs. No new schema is needed.

Actual approval remains Student submission into `advisor_review` → selected Class Advisor → `department_head_review` → authorized Head → `approved` / `rejected`. Staff approval/rejection routes do not exist. Head authority remains the live active Teacher flag and Class Advisor department relationship. `staff_review` is historical compatibility, not a new approval stage. Staff models have no department/cohort permission relation; no additional academic scope was invented.

Original Staff HTML contained only the approved document queue and calendar. A request panel is now inside the existing **จัดการเอกสาร** section; sidebar/navigation and original document controls are retained. Requests use the existing Staff bearer client, middleware, role workflow service and feedback modal/toast/loading utilities. Student owner list/detail already returned cancellations/history; its detail now displays the saved reason and actor role as literal readonly text.

## Status transition matrix

These are the existing service and migration-012 rules, not newly invented policy.

| Current status | Staff can cancel? | Reason / result |
|---|---|---|
| `submitted` | Yes | Existing pending state → `cancelled` |
| `staff_review` | Yes | Historical pending state → `cancelled` |
| `advisor_review` | Yes | Class review pending → `cancelled` |
| `department_head_review` | Yes | Head review pending → `cancelled` |
| `approved` | No | Approval is complete; 409 and no write |
| `document_issued` | No | Issued-document stage; 409 and no write |
| `in_progress` | No | Work is in progress; 409 and no write |
| `rejected` | No | Terminal decision; 409 and no write |
| `cancelled` | No | Prevent repeat cancellation/audit; 409 and no write |

UI sends the status and timestamp from loaded detail. Any changed status (including pending-to-pending) or update timestamp returns 409 before writing. Existing approved/issued/in-progress document requests remain blocked; no document, Company Response, Placement, delivery/prerequisite snapshot or prior review is altered/deleted. Broadening cancellation after approval/issuance would need explicit business policy and is outside this implementation.

## API and security

Existing routes and response envelope `{success, data}` are reused:

| Method / route | Change |
|---|---|
| `GET /api/staff/coop-requests` | Existing `status`, `limit`, `offset`; new optional `search` over Student code/name and request company. Returns all statuses by default and additive `cancellation` metadata per row. LIKE wildcards are escaped and Sequelize builds the query. |
| `GET /api/staff/coop-requests/:id` | Existing request/reviews plus additive `cancellation: {allowed, expected_status, expected_updated_at}`. Named Staff/Teacher projections contain ID/name/title only; no hashes. |
| `POST /api/staff/coop-requests/:id/cancel` | Existing reason-only payload remains supported. New UI also sends `expected_status` and `expected_updated_at`; if either precondition is present, both must be valid. |

Cancellation body example:

```json
{
  "reason": "Reason entered by the Staff member",
  "expected_status": "advisor_review",
  "expected_updated_at": "2026-10-09T00:00:00.000Z"
}
```

UUIDs, object body/unsupported fields, reason type/trim/2000-character maximum, actual known status and canonical ISO timestamp are validated. Actor IDs/roles cannot be supplied in the body. HS256 JWT and existing Staff actor/role/staff-ID consistency plus live active record checks apply; active actor is rechecked with SHARE lock inside the transaction. Student, Teacher, Head and inactive/forged actors cannot use Staff routes. Precondition/state validation occurs after current request UPDATE lock, following the existing Student UPDATE lock. Audit and request update share the transaction; duplicate cancellation and concurrent decisions cannot both commit the same observed stage. No new permissions or transaction architecture.

Backward compatibility: older reason-only clients retain current-state/pending-only/row-lock checks, but cannot assert what they previously displayed. Strict UI stale checks therefore require the new preconditions. No promise of historical compare-and-swap is made for legacy clients.

Errors use the existing conventions: 401 unauthenticated, 403 unauthorized, 400 malformed body/input, 404 missing request, 409 disallowed/stale/competing write, sanitized 500 unexpected failure. No SQL, stack, JWT or private storage details are exposed by the role controller. Successful UI feedback occurs after API success; failure retains the reason. Conflict closes outdated confirmation and refreshes list/detail. Reload failure clears stale detail/actions and distinguishes saved cancellation from failed refresh. Default all-state list retains canceled requests; an explicit pending-state filter correctly excludes canceled rows while detail remains readable. Search/status/page are retained when possible; an empty last page moves back one page.

## Changed files

| File | Change / reason |
|---|---|
| `backend/src/services/roleWorkflow.service.js` | Reuse cancellation states; search/safe named detail/current eligibility; optional status/timestamp preconditions under existing locks. |
| `backend/test/coopDirectWorkflow.test.js` | Validation/stale-stage/time/approval-race/audit-failure/search/history unit checks. Transaction fixture is a simulation, not SQL evidence. |
| `backend/test/roleWorkflow.database.test.js` | Added guarded HTTP/SQL validation, search/history, approval races, audit rollback, approved-document retention and Student owner-readback cases; NOT EXECUTED against PostgreSQL here. |
| `frontend/src/api/staffCoopRequests.api.js` (new) | Reuse existing authenticated Staff transport/routes. |
| `frontend/src/pages/staffCoopRequests.js` (new) | Search/filter/page/detail/history/reason confirmation with authoritative server eligibility, loading/duplicate/auth/conflict/error controls. |
| `frontend/src/department_staff/department_staff.html` | Request panel and module within existing document section; existing sidebar and document IDs retained. |
| `frontend/src/styles/staff_documents.css` | Three selectors scoped to new request panel/detail; existing responsive grid/form CSS reused. |
| `frontend/src/ui/feedback.js` | Additive close callback return from existing reason-capable modal for private-session cleanup. |
| `frontend/src/pages/student_coop.js` | Readonly cancellation reason/actor/time in owner detail. |
| `frontend/test/helpers/staffCoopRequestsFixture.js` (new), `frontend/test/staffCoopRequests.test.js` (new) | Existing HTML-derived DOM simulator exercises actual controller/shared modal and adapter. |
| `frontend/test/studentCoopAcceptance.test.js` | Saved Staff reason/actor, safe text and no active cancelled-request controls. |
| `README.md`, `HANDOFF_fitm-intern.md`, `docs/NEXT_DAY_DEVELOPMENT_REVIEW.md`, this report (new) | Current evidence/status/limits and next acceptance steps. |

No new dependency, model, table, migration, file storage, notification, websocket or polling infrastructure. No other feature/menu was rewritten.

## Executed testing

| Suite | PASS | FAIL | SKIP | Evidence / status |
|---|---:|---:|---:|---|
| All Backend files, current safe unit configuration | 144 | 0 | 17 | `logs/staff-cancellation-backend-20261009.log`; DB opt-ins disabled, unreachable test DB target |
| All Frontend files | 231 | 0 | 2 | `logs/staff-cancellation-frontend-20261009.log`; existing browser and SQL bridge skips |
| Focused cancellation/Student checks | 76 | 0 | 0 | `logs/staff-cancellation-focused-20261009.log`; later initial-auth/server-eligibility cases collected in full Frontend |
| Production Frontend build | — | 0 | — | `logs/staff-cancellation-build-20261009.log`; PASS, 13 HTML entries / 123 modules |
| JavaScript syntax | 242 | 0 | — | `logs/staff-cancellation-syntax-20261009.log`; 242 source/test/script files |
| Whitespace diff check | PASS | 0 | — | `logs/staff-cancellation-diff-check-20261009.log` |
| New PostgreSQL/HTTP/SQL cases | — | — | — | NOT VERIFIED; Docker API permission denied (`logs/staff-cancellation-postgresql-blocker-20261009.log`) |
| Real Chrome Staff/Student/documents acceptance | — | — | — | NOT VERIFIED; safe database prerequisite unavailable |

Counts overlap and must not be summed. These are current executions, not the earlier 357/215/calendar SQL/Chrome results. Initial focused run: 73 PASS/2 FAIL. Failures were new fixtures: pagination rows lacked `reviews`, and the Student assertion expected a child button hidden individually although its whole current-request section was hidden. Fixtures now exercise the preserved DOM behavior and readonly history; final targeted run passed. No assertions/test coverage were removed or opt-ins altered in test source. Database suites remain opt-in for safety.

Executed commands: `node --test --test-isolation=none` over all `backend/test/*.test.js` and all `frontend/test/*.test.js`; the same runner over `coopDirectWorkflow.test.js`, `staffCoopRequests.test.js`, `studentCoopAcceptance.test.js`; `npm.cmd --prefix frontend run build -- --configLoader native`; `node --check` over repository source/test/script JavaScript; `git diff --check`; `docker compose config --quiet`; `docker version --format '{{.Server.Version}}'`. Full Backend execution explicitly disables integration flags/URLs and sets DB host `127.0.0.1`, port `1`, database `fitm_unavailable_test`, with test-only credentials. No command targeted persistent data.

Compose configuration parses but warns that `POSTGRES_PASSWORD` is unset in this session; no Compose startup/recreation occurred. Docker engine access itself fails. No migration ledger/schema/physical SQL integrity/locks were inspected in this session. Historical persistent through-016 counts must not be treated as current; 017–021 rollout remains separately authorized work. Cancellation itself adds no migration and reuses existing request/review schema.

## Regression and next verification

Available tests cover preserved Student/Class/Head approval, live role guards, Staff documents/response/placement controller behavior, shared modal and Student cancellation display. No new failure is known from these executions; SQL and native browser regression remain unverified. Cancellation freezes this pending request without changing related entities. Teachers/Head reload existing queues and cannot approve a canceled request; Student refresh fetches current owner status. No new notifications are sent.

First run the guarded disposable PostgreSQL runner when Docker access is available:

```powershell
powershell -NoProfile -File backend/test/runTeacherAdvisorAcceptance.ps1 -BackendOnly -FocusedBackendTests roleWorkflow.database.test.js -FastExit
powershell -NoProfile -File backend/test/runTeacherAdvisorAcceptance.ps1 -FullBackend -FastExit
powershell -NoProfile -File backend/test/runStaffBrowserAcceptance.ps1
```

The SQL runner verifies exact `fitm_role_test` target and `fitm.a013_disposable=on` before DDL/writes; its ownership-labelled tmpfs container/internal network is isolated and cleaned. New cases are inside this existing guard. Never set its integration flags/URLs to persistent Local. The existing Staff browser runner covers document regression; it does **not** automatically accept the new cancellation interaction. Use a separately prepared disposable review instance to complete this cancellation checklist; no persistent account provisioning/rollout is implied:

- [ ] Login as active Staff and open existing document menu; verify original document and calendar navigation.
- [ ] Search Student code/name/company; exercise statuses/pages/empty result and allowed versus disabled actions.
- [ ] Open pending detail: correct Student/request/current status, company/work dates and named history.
- [ ] Cancel modal: correct identity/status/impact, whitespace/overlong reason refusal, Back/Escape closure and keyboard focus.
- [ ] Save a reason once; double-click cannot send twice; only confirmed API success shows success. SQL has one review, correct Staff/reason/from/to/server time.
- [ ] Default list shows canceled badge; reload/reopen retains history, reason and disabled action; explicit pending filter excludes it correctly.
- [ ] Log in as fixture Student; refresh own request list/detail, verify canceled status/reason/actor, no approval or editing controls; another Student gets 404.
- [ ] Competing Class/Head approval or request edit: old confirmation gets 409 and refreshes current state. SQL retains one legal transition and audit.
- [ ] Validation/network/500 failures retain reason and avoid success; reconnect/retry works. Failed post-commit readback shows saved-result warning and no stale actions.
- [ ] Anonymous/Student/Teacher/Head/inactive Staff direct API denial; approved/issued/in-progress/rejected/canceled requests cannot be canceled.
- [ ] Desktop/390px mobile/focus/console/network review; existing Cooperation Letter/Company Response/Placement remain functional and unchanged.

Keep scope 2.3.2 (2) at IMPLEMENTED / NEEDS VERIFICATION until disposable SQL and actual Chrome evidence are recorded. No broader post-approval cancellation policy is required to use the existing pending-only flow. Do not begin persistent migrations as a workaround for the test environment blocker.
