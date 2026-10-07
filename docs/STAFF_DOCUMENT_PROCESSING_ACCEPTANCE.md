# Department Staff Document Processing acceptance

Date: 2026-10-07, Asia/Bangkok. **Cooperation Letter development flow: PASS. Placement Letter: BLOCKED pending confirmed business prerequisites. Real browser: NOT RUN. Official document/PDF readiness: not established.**

## Source audit and lifecycle decisions

| Audit item | Finding |
| --- | --- |
| Existing Staff frontend | None before this continuation |
| Existing Staff API | Password login/profile, request list/detail/history, eligible pending cancellation and job review; no document processing |
| Existing document persistence | No table/model for either letter; actual Local schema confirmed this |
| Coop Request document fields | Company/recipient/work-period snapshots, statuses `approved`, `document_issued`, `in_progress`, timestamps `document_issued_at` and `started_at` |
| Meaning of `document_issued` | Student UI says placement document issued; no source writes that transition or specifies its prerequisites |
| Cooperation Letter | Student request form explicitly requests it; its approved request/snapshots and canonical Class/Head decisions support a separate document draft |
| Placement Letter | No confirmed creation/issuance prerequisite in models/migrations/routes/tests/docs; Company Acceptance/Response persistence is absent |
| PDF/template | `pdf-parse` reads uploads; no generator or approved official template exists |
| StudentFile/storage | Private upload categories are resume/project book/poster/practice log, not request-owned official letters |
| Necessary schema | One request-owned document per type, frozen snapshot, optimistic version, Staff actors and immutable revision evidence cannot fit existing request/status or StudentFile fields |

Reviewed HANDOFF, README, Compose, Student/Company/Staff/request/review/file models, all migrations 001–015 (including 007a), Staff auth/routes/services/controllers, storage/project file safety, Student request UI/controller, shared feedback and tests. Repository-wide document/letter/PDF/print/company-response searches found no official template or acceptance implementation. FAQ content is general guidance and does not establish a Company Acceptance prerequisite.

Staff remains outside request approval. Cooperation drafts require an accepted request (`approved/document_issued/in_progress`), complete Student/company/recipient/work dates and actual canonical Class/Head approval evidence. Generation uses the **saved document snapshot**, not refreshed Company master or Student identity. Editable metadata: optional manually supplied unique number, issue date, draft signatory name/position and notes. No running-number system is invented.

`draft -> generated` produces a **development HTML artifact**, not an official PDF. Editing generated metadata returns the current document to draft and invalidates its current artifact; prior generated revisions remain accessible. Explicit regenerate creates the next version using the frozen snapshot. Generating a dev artifact does not change `coop_requests.status`, `document_issued_at`, Student status or advisor IDs.

Placement writes return **409 / `PLACEMENT_PREREQUISITE_UNCONFIRMED`**. This is a missing business decision, not a claim that source already requires Company Acceptance. The user was asked whether company response is mandatory or approved request/full data suffices; no rule has been assumed. If response is required, its absent Company Acceptance/Response flow is the concrete next implementation gap. No response is fabricated and no placement PASS claimed.

## API and persistence

All document routes run behind the existing Staff JWT/live active-Staff middleware. Mutations recheck/SHARE-lock Staff in the transaction, lock Student then request consistently with approval services, and lock the current document. Staff scope remains the existing global request-read scope; no creator-only ownership rule or department scope is invented. Body Staff/Student/request/approval/storage identities are rejected.

| Endpoint under `/api/staff` | Behavior |
| --- | --- |
| `GET /document-requests` | Eligible queue; existing offset/limit validation, search by company/code/first/last/full name, request status and cooperation status filters |
| `GET /document-requests/:id` | Actual request/Student snapshots, safe named approval history, documents/revisions, missing fields, placement blocker, template capability |
| `POST /document-requests/:id/documents/cooperation` | Create one draft; duplicate 409 |
| `PUT /document-requests/:id/documents/cooperation` | Edit metadata with required current `version`; stale 409; identical update has no new audit |
| `POST /document-requests/:id/documents/cooperation/generate` | Generate/regenerate with current `version`; concurrent retry 409, one artifact/audit |
| `GET /document-requests/:id/documents/cooperation/preview` | Authenticated current generated artifact; draft 409; optional `?version=N` reads prior generated revision |
| `GET /document-requests/:id/documents/cooperation/download` | Same authenticated persisted bytes as attachment; optional prior version |
| Corresponding placement writes | Fail closed with explicit prerequisite blocker |

Migration **016_add_coop_documents.js** adds `coop_documents` and `coop_document_revisions`, including FK RESTRICT, request/type uniqueness, optional number uniqueness, version/state/type checks and revision/version uniqueness. Rollback refuses populated evidence. DDL failure is atomic. Explicit CommonJS named exports support both test-image `require` and Local Umzug dynamic import.

Metadata, snapshot, rendered HTML, SHA256, document status/version and audit revision commit together in PostgreSQL. This is the persisted generated content; no external filesystem object or file-replacement cleanup exists. Filename comes only from server UUID/type/version. Authenticated preview/download use UTF-8 HTML, `no-store`, `nosniff`, CSP without scripts/resources/forms and no raw storage path. Template escapes all dynamic values and contains a visible development/official-template notice. UI obtains an authenticated Blob and previews in a sandbox without scripts; Blob URLs are revoked on replacement/detail close/logout. Print uses the browser's preview print capability; actual native printing remains unverified.

## Local acceptance and database safety

- Real running API `http://127.0.0.1:5000`, Local `intern_system`, development-only explicit opt-in. Existing Class Advisor A/password file reused; existing real Head flag preserved and temporary Head credentials provisioned/restored through the original helper. No Teachers created, no valid login JWTs fabricated.
- Temporary Staff account uses production Staff model/bcrypt and a generated in-memory password, then actual Staff password login/profile. Only owned fixture Student/request/document/revision records and this Staff account are removed. Password/hash/token never printed or stored in Git.
- Final Local cooperation **PASS**: Student submit -> Class approve -> real Head approve -> Staff queue/detail -> create/edit/concurrent generate/regenerate -> persisted content/history -> authenticated preview/download -> Student still approved. Exactly 3 request events; both advisor IDs unchanged. Doc revision sequence: create/edit/generate/regenerate/edit/generate, all correct Staff actors.
- Negative **PASS**: anonymous 401; Student/Teacher/Head/revoked Staff 403; rejected/Class-pending/Head-pending writes 409; Staff approval endpoint absent; duplicate/stale conflicts 409; missing required field 400 with structured list; spoofed identities/type/date/version/unknown request denied. Placement blocker 409 creates no placement row.
- Final runner cleaned **5 owned Students**, their requests/document/review/course/delivery rows and the owned Staff account, deleting RESTRICT revisions/reviews first and refusing cleanup if a fixture has StudentFiles. Head credentials restored, real flag remains true; Class A credential unchanged. Local Staff count returns to **0**, so no manual-login Staff credential was retained.
- Before schema extension: **21 tables / 16 executed / 0 pending**. After migration: **23 tables / 17 executed / 0 pending**, two empty new tables; existing **20 application tables** have identical counts/full-row fingerprints and only ledger adds 016. No earlier migration reapplied.
- Before/after acceptance: **all 23 table counts/full-row fingerprints identical**. Teachers **23**, Head **1**, StudentFiles **3 / 7d0bf012a44869f32fd415f75b08471c**; real requests/reviews unchanged; new document tables empty after owned cleanup.
- Safe ignored evidence: `logs/staff-documents-before-schema-20261007.json`, `logs/staff-documents-after-schema-20261007.json`, `logs/staff-documents-local-final-report-20261007.json`, migration/local/final preservation logs. Private final report: `intern_backend:/tmp/fitm-local-staff-documents-IilIDE/report.json`.

Full regression: **Backend 241 PASS / 0 failures / 0 skips; Frontend 166 PASS / 0 failures / 1 existing browser skip**, `logs/staff-documents-full-20261007.log`. New document backend test contributes 15 checks including migration, SQL/HTTP/security/concurrency/rollback and actual Staff UI/modal/API bridge; new Staff DOM suite has 15 checks. DOM is not a browser. Production build has **13 HTML entries**. Final syntax/diff and focused final source recheck are recorded in HANDOFF.

## Manual Chrome checklist — NOT RUN

No callable browser tool or existing Playwright/Puppeteer configuration was found; none was installed. This checklist does not establish a PASS.

1. Ensure backend `localhost:5000`, frontend `localhost:5173`, read-only migration status **17/0**, Teachers 23/Head 1/files baseline above. Use an authorized active Staff account. Local automated account was cleaned; when a real/manual development Staff identity is authorized, use existing `npm run staff:create` with externally supplied `DEPARTMENT_STAFF_FIRST_NAME`, `DEPARTMENT_STAFF_LAST_NAME`, `DEPARTMENT_STAFF_EMAIL`, `DEPARTMENT_STAFF_PASSWORD`; do not copy a password into docs/logs. Head manual credentials were restored and likewise need the existing Teacher helper if used to prepare a fresh request.
2. Staff login: `http://localhost:5173/staff-login.html`; dashboard: `http://localhost:5173/src/department_staff/department_staff.html`. Verify password clearing/error/rate limit, correct Staff name, independent session and logout preserving Student/Teacher sessions.
3. Prepare an owned authorized Student request through real Student submit -> Class approval -> Head approval. Record both advisor IDs. Verify Staff sees it; search company/code/full name, request filters, cooperation filters, 25-row pagination, empty state, retry/network error and responsive display.
4. Open detail: Student identity/contact, saved company/address/recipient/work period, actual named Class/Head approval/time and canonical history. Missing-data request displays readable missing fields and no enabled write action. Non-approved request cannot be used to create a document by API.
5. Fill optional unique number, valid issue date, optional draft signer/notes. Submit -> custom confirmation -> loading -> success -> server reloaded draft/history. Double click does not duplicate. Verify source identity/approval is not editable.
6. Click **สร้างฉบับตัวอย่าง** -> confirmation/loading/toast -> generated state and history. Unsaved changes must be saved first. Preview shows Thai text, correct frozen snapshot and visible development notice; no undefined/null required fields. Download HTML opens the same generated content; **พิมพ์ฉบับตัวอย่าง** opens native print for preview. PDF export via browser is not a server-generated official PDF.
7. Edit -> current draft/preview invalidated; regenerate -> new version/history. Old generated version remains available via authenticated `preview?version=N`. Another Staff edit makes old-version write return 409 and refreshes UI. Change source fixture data in a controlled test only: old document snapshot remains original.
8. Placement shows its exact prerequisite blocker and disabled create. Direct create returns 409 and no placement record. Do not bypass with a fabricated company response or client flag. Confirm prerequisite with the business owner before enabling this flow.
9. Check Student remains `approved`, three canonical workflow events and unchanged advisor IDs; Staff has no approval/forward control. Test anonymous, Student/Teacher/Head sessions and revoked Staff against document list/detail/create/edit/generate/preview/download.
10. Test desktop/mobile viewport, keyboard focus and modal Tab/Escape, loading buttons, no background double-submit, long Thai text, detail close/Blob cleanup, logout and expired session during in-flight list/detail/preview. Browser focus/CSS/native print/download behavior remains pending until executed.

Read-only SQL evidence:

```sql
SELECT count(*) FROM teachers; -- 23
SELECT count(*) FROM teachers WHERE is_department_head; -- 1
SELECT count(*) FROM sequelize_meta; -- 17
SELECT count(*) FROM student_files; -- 3
SELECT id, student_id, status, document_issued_at FROM coop_requests WHERE id = '<owned_request_uuid>';
SELECT id, coop_request_id, document_type, status, version, created_by, updated_by, generated_at
FROM coop_documents WHERE coop_request_id = '<owned_request_uuid>';
SELECT version, action, status, department_staff_id, created_at
FROM coop_document_revisions WHERE coop_document_id = '<owned_document_uuid>' ORDER BY version;
SELECT actor_role, decision, from_status, to_status, created_at
FROM coop_request_reviews WHERE coop_request_id = '<owned_request_uuid>' ORDER BY created_at;
```

Manual actions persist real workflow/document evidence; do not bulk-delete unrelated records to imitate automated cleanup. Next task: **confirm Placement prerequisites and implement Company Acceptance/Response if required, with approved official templates**. This continuation does not start it and does not commit/push/deploy.
