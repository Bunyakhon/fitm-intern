# Teacher Project Advisor: Manual Chrome Acceptance

Status: **NOT RUN by the agent**. No browser MCP/tool or existing Playwright/Puppeteer package/config was available. API/SQL and DOM simulation results are separate evidence. No browser dependency was installed.

## Current Local Teacher

- Existing faculty: **อ.ดร.กาญจน์ ณ ศรีธะ**.
- Teacher ID: `ce1f3537-8438-42f4-baa8-debc8f5f4dd7`.
- Local-only email: `fitm-advisor-local@fixture.invalid`.
- Password is a generated value stored only in `intern_backend:/tmp/fitm-local-teacher-acceptance-iBJdom/teacher-password.txt`, owner-only mode 0600. No plaintext password is in this document, repository or test logs.
- Restore backup: `intern_backend:/tmp/fitm-local-teacher-acceptance-iBJdom/teacher-a-final-restore.json`. Protected Windows copy: `C:\Users\suran\AppData\Local\Temp\fitm-teacher-restore-239a1a1845164701bc1b5063812d38e9\teacher-original.json`.

To put the password on your own clipboard from PowerShell without displaying it in terminal output:

```powershell
docker exec intern_backend cat /tmp/fitm-local-teacher-acceptance-iBJdom/teacher-password.txt | Set-Clipboard
```

Run that only in your own terminal, paste into the Teacher password field and clear the clipboard after use. Do not put the value into documentation, chat or captured logs. The agent did not execute this password-reading command.

## Acceptance preparation

Open separate Chrome profiles/windows for Student and Teacher. Teacher sessionStorage is independent from Student localStorage. Use two authorized development Students with no confirmed project advisor: one for Accept, one for Reject. Existing Local Students were not changed during automated acceptance; its three temporary Students and their requests have been removed. Use your own Student login credentials; no Student password was reset/provided by this task.

Before each flow record the Student's current `advisor_teacher_id`. Check the selected dropdown is **อาจารย์ที่ปรึกษาโครงการ** in **โครงการสหกิจศึกษา**, not the class-advisor field in the profile. Only the project advisor is affected.

## Desktop Accept checklist

1. Student: open `http://localhost:5173/login.html`, sign in and reach `http://localhost:5173/src/student_coop/student_coop.html`.
2. Open **โครงการสหกิจศึกษา**, select **อ.ดร.กาญจน์ ณ ศรีธะ**. Expect **รออาจารย์ยืนยัน**. Reload: pending selection persists; the canonical project advisor must still be null. Topic remains independently editable; no topic change is required for this check.
3. Teacher: open `http://localhost:5173/teacher-login.html`, enter the Local-only email and private password, sign in. Expect `http://localhost:5173/src/teacher_coop/teacher_coop.html` and the same Teacher name.
4. Expect the Student's name/code/major and real topic/date in the pending card. Click **ยอมรับเป็นอาจารย์ที่ปรึกษา**: custom confirmation opens, page actions lock. Cancel once and verify controls recover.
5. Open confirmation again and confirm. Observe loading/disabled controls and success toast/state. Rapid clicks must cause a single decision.
6. Pending list refreshes from the server. Switch to **ยืนยันแล้ว**, then refresh/reload: the request displays confirmed and has no Accept/Reject controls.
7. Student: reload. Expect **อาจารย์ยืนยันแล้ว**, the correct Teacher and locked advisor selection. Check DB below: project advisor equals Teacher A, class advisor is unchanged.

## Desktop Reject checklist

1. Sign in as the second eligible Student, select Teacher A and reload to verify pending.
2. Teacher: refresh pending queue, click **ปฏิเสธ**. Expect a custom modal with a required reason. Empty/whitespace reason must not submit.
3. Enter a development acceptance reason, confirm and observe disabled/loading controls and feedback. Switch to **ปฏิเสธแล้ว** and refresh: rejected status/reason displays, no decision buttons.
4. Student: reload. Expect rejected reason/status, no confirmed advisor. Student may select another active Teacher; expect a new pending request. The previous rejected row becomes superseded history under the existing rules.
5. Check DB: rejection must not set `coop_advisor_teacher_id`; class advisor stays unchanged. Do not clear an accepted advisor directly to manufacture this Reject scenario.

## Mobile and session checks

- Repeat the Teacher queue/modal and Student read-back at desktop width (e.g. 1440px) and Chrome device viewport 390px: readable long text, no horizontal page overflow, reachable controls and usable reason input.
- Verify keyboard Tab/Shift+Tab remains within confirmation, Escape/cancel closes it before submission, focus returns sensibly, and Escape cannot dismiss a submitting modal.
- Teacher logout leaves the Student session intact. After session expiry/invalid session, expect cleared Teacher data and a sign-in prompt, no enabled decision controls. Anonymous API denial and stale/foreign-request refusal already passed Local API acceptance; these are not browser claims.

## Read-only DB checks after manual actions

Use pgAdmin or `docker exec -it intern_postgres psql -U postgres -d intern_system`. Replace the Student codes with the actual authorized accounts. No password/hash columns are needed.

```sql
BEGIN READ ONLY;
SELECT count(*) AS faculty_count FROM teachers; -- 23
SELECT count(*) AS executed_migrations FROM sequelize_meta; -- 17 after document migration 016
SELECT id, student_id, advisor_teacher_id, coop_advisor_teacher_id
FROM students WHERE student_id IN ('ACCEPT_STUDENT_CODE', 'REJECT_STUDENT_CODE');
SELECT r.status, r.requested_advisor_teacher_id,
       r.requested_at, r.confirmed_at, r.rejected_at, r.rejection_reason
FROM coop_project_advisor_requests r
JOIN students s ON s.id = r.student_id
WHERE s.student_id IN ('ACCEPT_STUDENT_CODE', 'REJECT_STUDENT_CODE')
ORDER BY r.requested_at;
SELECT count(*) AS student_file_rows,
       md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY to_jsonb(t)::text), '')) AS fingerprint
FROM student_files t;
ROLLBACK;
```

Expected: Accept -> confirmed request / project advisor `ce1f3537-8438-42f4-baa8-debc8f5f4dd7`; Reject -> rejected (or superseded after reselection) / project advisor null; class advisors equal their recorded values. Files remain 3 rows with the task's baseline fingerprint `7d0bf012a44869f32fd415f75b08471c` if no separate file activity occurred. Check migration CLI separately for **17 executed / 0 pending** (after document migration 016).

## Provisioning and restore commands

Helper is manual and development-only; never runs at startup/migration. `TEACHER_TEST_ID` must refer to an existing active Teacher. `TEACHER_TEST_EMAIL`/`TEACHER_TEST_PASSWORD` are supplied through environment variables. Backup must be an absolute path outside the repository and must not already exist. Existing email/hash values are saved before the credential write. Model bcrypt cost 10 is reused; names/status/department/Head privilege/timestamps are preserved.

For a different chosen password, restore the current credential first, then set your own environment values. From the host you can securely prompt and pass the password by environment name rather than command-line value:

```powershell
$taskTeacherSecret = Read-Host 'Local Teacher test password' -AsSecureString
$env:TEACHER_TEST_PASSWORD = [Net.NetworkCredential]::new('', $taskTeacherSecret).Password
$env:TEACHER_TEST_EMAIL = 'fitm-advisor-local@fixture.invalid'
$env:TEACHER_TEST_ID = 'ce1f3537-8438-42f4-baa8-debc8f5f4dd7'
$env:TEACHER_TEST_BACKUP_PATH = '/tmp/teacher-credential-new-original.json'
try {
  docker exec -e NODE_ENV=development -e TEACHER_TEST_ID -e TEACHER_TEST_EMAIL -e TEACHER_TEST_PASSWORD -e TEACHER_TEST_BACKUP_PATH intern_backend npm run dev:teacher-credential
} finally {
  Remove-Item Env:\TEACHER_TEST_PASSWORD
}
```

Restore the **current task's** A credential to its exact original null email/hash:

```powershell
docker exec -e NODE_ENV=development -e TEACHER_TEST_ID=ce1f3537-8438-42f4-baa8-debc8f5f4dd7 -e TEACHER_TEST_BACKUP_PATH=/tmp/fitm-local-teacher-acceptance-iBJdom/teacher-a-final-restore.json intern_backend npm run dev:teacher-credential -- restore
```

Restore refuses to overwrite credentials edited since provisioning and is idempotent when already restored. After reprovisioning with another password, use that invocation's new backup path. If the container backup has been lost, copy the protected Windows backup back to a private container file (mode 0600) before restoring. Restoring Teacher credentials does not undo advisor decisions made during your manual acceptance; those are separate Student workflow records.

Full isolated verification: `powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/runTeacherAdvisorAcceptance.ps1 -FullBackend`. Explicit Local API acceptance runner: `docker exec -e NODE_ENV=development -e FITM_LOCAL_ADVISOR_ACCEPTANCE=1 intern_backend node scripts/runLocalTeacherAdvisorAcceptance.js`; it requires zero login-ready Teachers first (restore this task's A credential before rerunning), preserves 23 faculty, and cleans only its own temporary Students/requests. It leaves one A test credential ready and prints only identifiers/private artifact paths, never passwords/JWTs/hashes.

Record desktop/mobile observations and failures before changing **REAL BROWSER ACCEPTANCE: NOT RUN** to a verified result. Do not call API/SQL results browser acceptance.
