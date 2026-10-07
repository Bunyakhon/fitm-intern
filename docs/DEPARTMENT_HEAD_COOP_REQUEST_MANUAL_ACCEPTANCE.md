# Department Head Coop Request: Manual Chrome Acceptance

**Real browser acceptance: NOT RUN.** No browser tool or existing Playwright/Puppeteer dependency/config is available. DOM, authenticated HTTP and SQL results are separate evidence; no browser dependency was installed.

**Local positive Head HTTP/SQL acceptance: PASS (2026-10-07); real browser remains NOT RUN.** Following explicit user authorization, exactly one existing **ผศ.ดร.ขนิษฐา นามี** record was resolved from Local PostgreSQL and only its Head flag changed false -> true. There are still 23 Teachers, now one active Head. Actual password login/me, queue/detail, final approve/reject/reason, Student read-back, canonical history, non-Head denial, early-stage refusal and duplicate protection passed. Two owned fixture Students/requests were cleaned and temporary Head credentials restored to original email/password hash null; **Head flag remains true**. All 21 tables match the post-role-correction baseline; comparison to before correction shows only the intended target flag differs. A position/title/name/email never supplies runtime authority. Safe evidence: `logs/department-head-authorized-local-report-20261007.json` and `logs/department-head-authorized-preservation-20261007.json`.

## URLs and accounts

The Head acceptance above used the earlier 21-table baseline. After the Staff document continuation, current Local has **23 public tables / 17 executed / 0 pending**; the added document tables do not change Head approval or its retained true flag. See [current document baseline](STAFF_DOCUMENT_PROCESSING_ACCEPTANCE.md).

- Head login: `http://localhost:5173/department-head-login.html`.
- Head dashboard: `http://localhost:5173/src/department_head/department_head.html`.
- Class Advisor login: `http://localhost:5173/teacher-login.html`.
- Teacher dashboard: `http://localhost:5173/src/teacher_coop/teacher_coop.html`.
- Student login/dashboard: `http://localhost:5173/login.html` / `/src/student_coop/student_coop.html`.
- Head uses the existing Teacher authentication/sessionStorage. Backend Head login and `/me` must confirm an active Teacher with server-side `is_department_head=true` and valid department scope. Client flags and position labels never grant authority.
- Existing non-Head Class Advisor account: `fitm-advisor-local@fixture.invalid`, faculty ID `ce1f3537-8438-42f4-baa8-debc8f5f4dd7`. Its private password/recovery instructions remain in [Teacher credential documentation](TEACHER_PROJECT_ADVISOR_MANUAL_ACCEPTANCE.md#current-local-teacher).
- Head email/password must belong to the authorized Head record. Reuse existing credentials when available. Otherwise the existing `npm run dev:teacher-credential` can provision that existing active record using `TEACHER_TEST_ID`, `TEACHER_TEST_EMAIL`, securely supplied `TEACHER_TEST_PASSWORD` and an absolute owner-only `TEACHER_TEST_BACKUP_PATH` outside the repository. It preserves Head flag/name/department/timestamps and does not grant privileges. Restore using the same original backup; do not record plaintext passwords/hashes/tokens here or in logs.
- Current real Head **ผศ.ดร.ขนิษฐา นามี** retains the authorized true flag but has no login credential after acceptance restore. Resolve the existing Local ID from PostgreSQL when preparing a manual login; the UUID is not a business rule. Provision/restore only credentials with the existing helper, and keep the correct Head flag true.

## Desktop approve

1. Use an authorized development Student with no active request. Record both advisor IDs. Class Advisor must be in the Head's actual department; `coop_advisor_teacher_id` grants no request approval rights. Do not alter unrelated existing Students or reset their credentials to manufacture acceptance.
2. Student submits the actual Coop Request form/course selections. Reload: `advisor_review`. Head review queue must not show it as actionable. Direct Head approval before Class approval must fail and create no decision history.
3. Class Advisor logs in, opens **อนุมัติคำร้องสหกิจ**, checks detail, confirms approval and observes server refresh. Student reload: `department_head_review`; Class Advisor cannot finalize it.
4. Head logs in at the Head URL. Expect the correct safe name, Head dashboard and **อนุมัติคำร้องสหกิจ**. Default filter is **รอหัวหน้าภาควิชาพิจารณา**. Check loading, Student name/code/major, company snapshot, submitted date, current Class Advisor and actual Class approval actor/date.
5. Open **ดูรายละเอียด**. Verify company snapshot/address, linked job information when present, work period, courses and history. Class approval must show its actual named actor/date and `advisor_review -> department_head_review`; current advisor and historical approver can differ if the relationship changed.
6. Click **อนุมัติ**: expect a custom confirmation. Cancel once and reopen. Confirm; observe loading/disabled controls, one decision on rapid clicks, success toast and server refresh. When deciding from detail, detail also refreshes. No client-only status mutation counts as success.
7. The row leaves pending queue. Filter **อนุมัติแล้ว**, open detail and reload: `approved`, Head decision once, no approve/reject buttons. Student reloads the request: **คำร้องได้รับการอนุมัติแล้ว**. Both advisor IDs remain unchanged.

## Reject and authorization

1. A second eligible Student submits; Class Advisor approves to Head review. Head selects **ไม่อนุมัติ**. Empty/whitespace reason prevents submit. Enter a reason, confirm and observe loading/toast/server refresh.
2. Filter **ไม่ได้รับการอนุมัติ** and reopen detail: `rejected`, persisted Head reason/history, no action buttons. Student reloads rejected request from history and sees the same reason/course snapshot. Both advisor IDs remain unchanged.
3. Normal Teacher enters correct Teacher credentials at Head login: expect forbidden, no Head navigation. Directly opening Head dashboard with a non-Head session must show a sign-in/forbidden state without private rows/actions. Client `is_department_head`, position text and query/body identifiers must not bypass Backend authorization.
4. Head cannot act on `advisor_review`, `submitted`, `staff_review`, approved/rejected/cancelled/document_issued/in_progress. Repeating approve/reject, approve after rejected or reject after approved returns 409 and does not duplicate history. Staff cannot impersonate Head or approve/forward requests; existing view/history/pending cancellation is retained.
5. Check empty filters, later pagination and retry after an API error. Session expiry clears role data/actions. Logout clears Teacher/Head sessionStorage and preserves the independent Student localStorage session.

## Desktop/mobile and keyboard

Repeat at desktop 1440px and Chrome viewport 390px. Verify long names/reasons/courses fit without horizontal page overflow, buttons remain reachable, reason input is usable, and detail scroll/focus is sensible. Tab/Shift+Tab stays within confirmation; Escape/cancel closes before save and cannot dismiss while saving. These native/CSS checks remain unverified by DOM simulation.

## Read-only SQL verification

Use pgAdmin or Local psql; replace Student codes with authorized test accounts. No credential columns are needed.

```sql
BEGIN READ ONLY;
SELECT count(*) AS teachers FROM teachers; -- 23
SELECT id, first_name, last_name, department, status, is_department_head
FROM teachers WHERE is_department_head = true;
SELECT count(*) AS executed_migrations FROM sequelize_meta; -- 17 after document migration 016
SELECT id, student_id, advisor_teacher_id, coop_advisor_teacher_id
FROM students WHERE student_id IN ('HEAD_APPROVE_STUDENT', 'HEAD_REJECT_STUDENT');
SELECT r.id, s.student_id, r.status, r.company_name, r.submitted_at
FROM coop_requests r JOIN students s ON s.id = r.student_id
WHERE s.student_id IN ('HEAD_APPROVE_STUDENT', 'HEAD_REJECT_STUDENT');
SELECT v.actor_role, v.teacher_id, t.first_name, t.last_name,
       v.decision, v.from_status, v.to_status, v.reason, v.created_at
FROM coop_request_reviews v JOIN coop_requests r ON r.id = v.coop_request_id
JOIN students s ON s.id = r.student_id LEFT JOIN teachers t ON t.id = v.teacher_id
WHERE s.student_id IN ('HEAD_APPROVE_STUDENT', 'HEAD_REJECT_STUDENT')
ORDER BY v.created_at, v.id;
SELECT count(*) AS file_rows,
       md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY to_jsonb(t)::text), '')) AS fingerprint
FROM student_files t;
ROLLBACK;
```

Each new completed request has exactly three canonical events: Student submit, Class Advisor approve, Head approve/reject. File baseline is **3 rows / 7d0bf012a44869f32fd415f75b08471c** absent separate file work. Read-only migration status must report **17 executed / 0 pending** (after document migration 016).

## Automated Local runner

`backend/scripts/runLocalDepartmentHeadAcceptance.js` requires explicit development + `FITM_LOCAL_HEAD_ACCEPTANCE=1`, exact `intern_system`, 23 Teachers, `TEACHER_TEST_ID` for the existing Class Advisor and owner-only absolute `TEACHER_TEST_PASSWORD_PATH`. Choose an already-authorized `HEAD_TEST_ID` if several Heads exist. For an existing login-ready Head distinct from Class Advisor, supply owner-only absolute `HEAD_TEST_PASSWORD_PATH`.

The runner never sets `is_department_head`, creates Teachers or derives authorization from text. If the existing Head lacks credentials, it uses the existing credential helper and restores original credentials in finally. A retains its existing credentials. It creates only owned temporary Students/requests, uses real password login/HTTP APIs, checks SQL and Student read-back, deletes its RESTRICT review rows first, and requires all current public table counts/fingerprints to match afterward. If no Head exists, it runs only non-Head/anonymous protection and Class boundary checks, cleans its fixture and reports **BLOCKED** (exit code 2), not positive Head PASS.

Manual decisions persist their own workflow records. Restoring a credential does not undo decisions or grant/revoke Head privilege. Staff document/letter processing is a separate next task.
