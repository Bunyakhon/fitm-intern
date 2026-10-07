# Teacher / Class Advisor: Manual Chrome Acceptance

**Real browser acceptance: NOT RUN.** No browser tool or existing Playwright/Puppeteer dependency/config was available. DOM simulation, authenticated HTTP and SQL checks passed separately; no browser dependency was installed.

Use the existing Local Teacher account from [Teacher credentials and recovery](TEACHER_PROJECT_ADVISOR_MANUAL_ACCEPTANCE.md#current-local-teacher): **fitm-advisor-local@fixture.invalid**, faculty ID **ce1f3537-8438-42f4-baa8-debc8f5f4dd7**. The private password and original restore backup remain unchanged. That document gives a user-terminal clipboard command; no password is in this repository.

Open separate Chrome windows/profiles for Teacher and Student. Use two authorized development Student accounts, one for approve and one for reject, each with no active request and with **class advisor** set to this Teacher. Record `advisor_teacher_id` and `coop_advisor_teacher_id` before each flow. Do not reset credentials or edit existing records merely to manufacture a test. The automated acceptance's three temporary Students/requests/history rows have all been cleaned, so they cannot be used for browser acceptance.

1. Student: log in at `http://localhost:5173/login.html`, open the Coop Request section, complete the actual form/course selections and submit. Reload: expect **รออาจารย์ที่ปรึกษาพิจารณา** / `advisor_review`.
2. Teacher: log in at `http://localhost:5173/teacher-login.html`. Expect the correct faculty name and `/src/teacher_coop/teacher_coop.html`. Open **อนุมัติคำร้องสหกิจ** in the sidebar.
3. Verify loading, then the Student name/code/major, saved company name/submission date/course snapshot. **ดูรายละเอียด** must show saved company/address/work dates, real job information if linked, prerequisite snapshot and history. Missing values display `-`; no unrelated private profile/storage data appears.
4. Click **อนุมัติ**. Expect the custom confirmation identifying the Student/company and explaining forwarding to Head. Cancel once; controls recover. Reopen and confirm: observe loading/disabled controls, single request on rapid clicks, success toast and server refresh.
5. The row disappears from the review queue. Switch to **รอหัวหน้าภาควิชาพิจารณา**, open detail and reload: expect `department_head_review`, Class Advisor history once, and no approve/reject buttons. If deciding from detail, that detail must also reload from server.
6. Student: reload and open current request detail. Expect **ผ่านการอนุมัติจากอาจารย์ที่ปรึกษาแล้ว รอหัวหน้าภาควิชาพิจารณา**. Both advisor IDs remain unchanged. Stop at Head review.
7. Second Student: submit another eligible request. Teacher: refresh review queue, open **ไม่อนุมัติ**. Empty/whitespace reason must prevent submission. Enter a reason and confirm; observe loading, toast and refreshed queue.
8. Filter **ไม่ได้รับการอนุมัติ**, open detail and reload: expect `rejected`, persisted reason/history and no decision controls. Student: reload, open the rejected request from history and verify the same reason and course snapshot. Advisor IDs remain unchanged.
9. At desktop 1440px and mobile 390px, verify readable long names/reasons/courses, no horizontal page overflow, reachable buttons and usable confirmation textarea. Check keyboard Tab/Shift+Tab, Escape/cancel before submit, focus return and inability to dismiss while saving.
10. Check empty filters and pagination when enough own requests exist. Teacher logout leaves the Student session intact. With an expired Teacher session, expect cleared Teacher rows/controls and a sign-in prompt. Foreign Teacher/API refusal and Class A / Project B separation already passed authenticated API/SQL acceptance; no browser PASS is implied.

Read-only PostgreSQL verification after manual actions (replace the Student codes with authorized test accounts):

```sql
BEGIN READ ONLY;
SELECT count(*) AS teacher_count FROM teachers; -- 23
SELECT count(*) AS executed_migrations FROM sequelize_meta; -- 17 after document migration 016
SELECT id, student_id, advisor_teacher_id, coop_advisor_teacher_id
FROM students WHERE student_id IN ('APPROVE_STUDENT_CODE', 'REJECT_STUDENT_CODE');
SELECT r.id, s.student_id, r.status, r.company_name, r.submitted_at
FROM coop_requests r JOIN students s ON s.id = r.student_id
WHERE s.student_id IN ('APPROVE_STUDENT_CODE', 'REJECT_STUDENT_CODE');
SELECT v.actor_role, v.teacher_id, v.from_status, v.to_status,
       v.decision, v.reason, v.created_at
FROM coop_request_reviews v JOIN coop_requests r ON r.id = v.coop_request_id
JOIN students s ON s.id = r.student_id
WHERE s.student_id IN ('APPROVE_STUDENT_CODE', 'REJECT_STUDENT_CODE')
ORDER BY v.created_at, v.id;
SELECT count(*) AS file_count,
       md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY to_jsonb(t)::text), '')) AS fingerprint
FROM student_files t;
ROLLBACK;
```

Expect one submission and one Class Advisor decision per fresh request, `advisor_review -> department_head_review` or `advisor_review -> rejected`; no Staff approval. Files remain **3** / **7d0bf012a44869f32fd415f75b08471c** absent separate file activity. Use migration status CLI to verify **17 executed / 0 pending** (after document migration 016). Manual actions persist their own workflow history; restoring a Teacher credential does not undo them.

The repeatable automated Local runner is `backend/scripts/runLocalClassAdvisorAcceptance.js`. It requires explicit `NODE_ENV=development`, `FITM_LOCAL_CLASS_ADVISOR_ACCEPTANCE=1`, existing `TEACHER_TEST_ID` and owner-only absolute `TEACHER_TEST_PASSWORD_PATH`, exact database `intern_system` and 23 Teachers. It creates only owned temporary Students/requests, uses real password login/HTTP APIs, restores temporary B using the existing helper, deletes owned review rows first because of RESTRICT FKs, and requires all public-table counts/fingerprints to match afterward. It leaves A ready for this manual checklist.
