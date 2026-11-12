# FITM-INTERN — Safe Development Cleanup / Plan and Execution Report

## Current resolution — immutable policy required / 12 November 2026 01:04 Asia/Bangkok

**CLEANUP: BLOCKED — Deleted Students / Rows / Tables: 0 / 0 / 0. File Deletes: 0.** รอบนี้ตรวจ Source และฐานข้อมูลด้วย REPEATABLE READ READ ONLY, จบด้วย ROLLBACK. ไม่ส่ง DELETE/DDL หรือเริ่ม Writer Transaction; ไม่มี Partial Cleanup. การอนุญาตเดิมให้ลบ50บัญชีไม่ครอบคลุมการแก้/ข้าม Immutable Policy.

### Auth drift: lifecycle evidence, not a baseline waiver

- `backend/src/services/googleAuth.service.js:245–249`: challenge อายุ5นาที; `GoogleAuthRequest.destroy` ล้างเฉพาะ `expires_at < now()` ก่อนสร้าง challenge ใหม่. Model ไม่มี Actor FK และ Live Catalog ไม่พบ FK เข้า/ออก `google_auth_requests`.
- Initial Private Inventory และ Approved Inventory ของแถวเดิมมี Full-row Fingerprint ตรงกัน จึงใช้วันหมดอายุจากหลักฐานเดิมได้: **11 พฤศจิกายน 2026 21:38:15.060 Bangkok**, consumed แล้ว. แถวนี้ไม่อยู่ปัจจุบัน; มี login challenge UUID ใหม่1แถว หมดอายุ **12 พฤศจิกายน 2026 00:41:59.767 Bangkok**. ไม่อนุมานผู้เรียกหรือเวลาลบจริงจาก expires_at และไม่ได้ตรวจ Request Audit Log.
- หลักฐานสอดคล้องกับการล้าง Temporary Auth Challenge ตาม Source. Persistent Protected Rows **187/187** และ Protected Student Owned **62/62** ตรงเดิม; Google Identities/Account Controls/Teacher/Staff/Unknown อยู่ใน baseline comparisons. Extended Protected Baseline ยัง **187/188** เพราะ challenge เดิมหาย; ไม่รายงาน Guard PASS ไม่แก้ Private Manifest/Digests และไม่ลด Safety Guard. ก่อน Cleanup ครั้งถัดไปต้องกำหนดวิธีตรวจ Ephemeral Lifecycle ที่ยืนยันการหมดอายุและรักษา Identity/Protected Auth Data โดยไม่ละทิ้งทั้งตาราง.

### Live immutable functions and dependencies

- Source `backend/src/db/coopAcademicIntegrity.js` และ Live Function `public.coop_academic_immutable()` ปฏิเสธ DELETE/UPDATE ทุกแถวด้วย `RAISE EXCEPTION ... ERRCODE='23514'`; ไม่มีเงื่อนไขสำหรับ Synthetic/Admin/Expired/Parent Deletion.
- `coop_academic_snapshot_immutable` และ `coop_academic_history_immutable` เป็น BEFORE DELETE OR UPDATE, enabled `O` ทั้งคู่. Scope ยังมี **Courses250 + Academic History15**, ครอบคลุม Targets50ครบทุกบัญชี.
- FK จริง: History → Student/Request/Course เป็น **ON DELETE RESTRICT**; Course → Request เป็น **ON DELETE CASCADE**. ลบ History ก่อนก็ถูก Trigger ปฏิเสธ; ลบ Request/Student ก่อนติด RESTRICT หรือ CASCADE ที่ยังเรียก Course Trigger. ไม่มี Dependency Order ที่ลบครบได้ตามนโยบายปัจจุบัน.
- ไม่ Disable/เปลี่ยน Trigger/FK, ไม่ Replication Role, ไม่ใช้ TRUNCATE/DROP/Global CASCADE, ไม่แก้ History/Identity, ไม่ย้าย Parent/Actor เพื่อหลบ Guard และไม่ลบข้อมูลส่วนอื่นก่อนแล้วทิ้ง Immutable Orphans.

### Fresh verification and retained scope

- ตรวจเมื่อ **12 พฤศจิกายน 2026 01:04:05 Bangkok**: PostgreSQL160015, `intern_system/public`, transaction_read_only=on, recovery=false. Protected Student UUID/รหัสตรง1บัญชี; Teachers23/Head1/Staff2/SuperAdmin1/Real-or-Unknown6; Students57/Targets50.
- Candidate Intent **950/950 rows** ตรง Full-row SHA เดิม. Old Full Database Baseline **1175/1176** ตรง; ต่างเฉพาะ challenge เดิมที่หาย มี challenge UUID ใหม่1แถวทำให้จำนวนรวมยัง1176. ไม่มีหลักฐาน Persistent Business/Protected Row เปลี่ยนจาก Snapshot. ไม่มี DELETE จึงไม่มี Post-Cleanup Acceptance หรือ Post-DELETE Orphan Scan; ไม่กล่าวอ้างว่า Cleanup สำเร็จ.
- คำนวณ Manifest SHA-256 และ DB Dump SHA-256 ใหม่ตรงค่าอนุมัติ `5aa8b2cf7aea94d01d5e6e2dbd91af2e6c30ab57b5e4986477e6dcf3836d8128` / `ee0920b59d59eb8f7f774084e26f4040f8ae08f74104a3131b350399a1a626ae`. Archive full readback และ Storage32files verification เป็นหลักฐาน Run ก่อนหน้า00:52–00:54 ไม่ใช่ Restore/Storage Recheck ใหม่. ไม่แก้ Backup/Manifest และไม่ลบไฟล์.
- แก้เฉพาะ Plan/Report นี้และ `HANDOFF_fitm-intern.md`. Git **28M/35U → 28M/35U**; ไม่แก้ Source/Auth/RBAC/Schema/Workflows/Secrets/Seeders/Shared Records, ไม่ Commit/Push.
- **Tests: NOT RUN — USER-OWNED TESTING.** เฉพาะ Read-only Inspection/DB Verification/Backup Hash Verification ที่ได้รับอนุญาต; ไม่รัน Automated Tests/Build/Lint/Syntax/Browser/Health checks.

### Pending Decision / Remaining Issue / NEXT TASK

ต้องเลือก **คงนโยบาย Immutable และเก็บ Targets50** หรือ **อนุมัตินโยบายข้อยกเว้น DELETE เฉพาะ Development Cleanup** สำหรับ Approved UUID50 และ Immutable Descendants265แถว โดยคงการห้าม UPDATE/FK/Protected/Shared/Unknown Guards. ข้อยกเว้นต้องเปลี่ยน Function และ Source Integrity Definition ให้ตรงกันอย่างจำกัด พร้อมตรวจ Manifest/Backup/Protected/Dependencies ใหม่ก่อนลบใน Transaction เดียว; ยังไม่ได้แก้หรือใช้งานข้อยกเว้น. ไม่จำเป็นต้องปิด Trigger หรือเปลี่ยน FK. ความเสี่ยงคือสูญเสีย Synthetic Academic History ถาวร และความผิดพลาดในการจำกัดขอบเขตอาจกระทบประวัติจริง. **STOP ตาม Task6; ไม่มี Cleanup ต่อภายใต้นโยบายเดิม.**

## Previous execution — authorized one-shot / 12 November 2026

**DELETE authorization granted by current user instruction for the unchanged approved scope. EXECUTION STOPPED BY GUARDS / TRANSACTIONS ROLLED BACK / DELETES 0 / FILE DELETES 0.** การขาดสิทธิ์ApplyจากPhaseAไม่ใช่Blockerรอบนี้; ข้อความPhaseAด้านล่างเป็นประวัติก่อนอนุญาต.

| Requested result | Actual result |
|---|---|
| Protected Verification | **FAIL** — extendedProtectedBaselineมีแถวเดิมของ`google_auth_requests`หาย1row; ไม่เปลี่ยนBaselineเพื่อให้ผ่าน |
| Backup | **VERIFIED** — ApprovedManifest/DBDump hashesตรง, Inventory/FileManifest/StorageArchive hashesตรง, freshpg_restoreอ่านทั้งArchiveลง`/dev/null`สำเร็จโดยไม่ExecuteSQL; Storage32filesที่ใช้งานอยู่ตรงCapturedSize/SHA256 |
| Target Students | **50** = Demo15+Synthetic35; ไม่มีProtected/Unknownปะปน |
| Deleted Students / Rows / Tables | **0 / 0 / 0**; ไม่มีDELETEstatementส่งเข้าDB ไม่มีCOMMIT ไม่มีPartialCleanup |
| Immutable Blockers | **BLOCKED** — enabled`O`ทั้งSnapshot/AcademicHistory triggersยังRAISEEXCEPTIONโดยไม่มีเงื่อนไขต่อDELETE/UPDATE, Course250+History15ยังอยู่ครบ |
| Post-Cleanup Verification | **FAIL — Cleanup not executed**; ไม่ใช่ผลว่าข้อมูลเสียจากCleanup. Read-onlydiagnosticหลังRollbackพบProtectedStudentOwned62rowsและCandidate950rowsตรงBaseline; ยังเหลือSynthetic50. Orphan-scanและPost-DELETEchecksไม่ได้ดำเนินการเพราะPreflightหยุดก่อนถึงขั้นนั้น |
| Git Status | **28M/35U → 28M/35U**; รอบนี้แก้เฉพาะReportไฟล์นี้กับHandoffซึ่งเป็นUntracked/Modifiedเดิม; ไม่มีCommit/Push/Source changes |
| Remaining / Next | ทบทวนAuthBaselineDriftและแนวทางรักษาImmutableก่อนงานCleanupครั้งต่อไป; การอนุญาตDELETEไม่อนุญาตให้ข้ามTrigger/แก้History |

### Fresh evidence and root cause

- 12Nov2026ประมาณ00:52–00:54Asia/Bangkok: SELECTยืนยัน`127.0.0.1:5432/intern_system/public`, PG16.15, server172.18.0.3/32, recoveryfalse; Catalog/Columns/FK/TriggerFingerprintตรงApprovedManifest จึงไม่มีหลักฐานSchema/Trigger/FKdrift.
- Countsตรง: Students57/Targets50/Unknown6; Teacher23/Head1/Staff2/SuperAdmin1. ProtectedStudentCodeตรงUUIDเดิมและพบ1บัญชี. ProtectedFileMetadata/StudentData62rowsไม่เปลี่ยน, PhysicalStorageทั้ง32filesไม่เปลี่ยน. ไม่มีเหตุให้สรุปว่าProtectedStudentหรือTeacher/StaffAccountถูกแก้โดยRunนี้.
- SERIALIZABLE READ ONLY preflightตรวจExtendedProtectedBaselineพบ`google_auth_requests`เดิม1row **BASELINE_ROW_MISSING** แล้วROLLBACKทันที. การระบุว่าแถวนี้หมดอายุหรือถูกแทนยังไม่มีหลักฐานเพียงพอ; ไม่เดาสาเหตุและไม่ลบ/สร้าง/ปรับAuthRows. Read-onlydiagnosticใหม่เพื่อระบุRootCauseก็ROLLBACKปิดTransactionแล้ว.
- CandidateIntentทั้ง950rows/18tablesยังตรงFullRowFingerprints; currenttable-rowcountรวม1176. Immutableguardตรวจจริงพบ`coop_academic_snapshot_immutable`/`coop_academic_history_immutable`ทั้งสองenabledOและFunctionยังปฏิเสธDELETE/UPDATEโดยไม่มีเงื่อนไข. จึงมีทั้งBaselineGuardFailureและImmutableBlocker ไม่เริ่มWriterTransactionหรือทดลองDELETEเพื่อให้Triggerยิง.
- ไม่มีRestoreฐานจริงหรือฐานแยก เนื่องจากไม่มีความจำเป็นต้องสร้างDBเพิ่มหลังGuardบังคับหยุด; ArchiveIntegrityตรวจจริงแล้ว การRestoreจริงยังNOTRUN. ไม่มีการเปลี่ยนBackup/ApprovedManifest/Digests/Receipts.
- Private evidenceใหม่อยู่ในArtifactDirectoryเดิม: `one-shot-1794419555147.private.json` (guard/backup/counts/rollback) และ`one-shot-drift-1794419620110.private.json` (minimalchangedkeys+liveTriggerDefinitions). ไม่เผยPII/Credentials/HashesของCredentialsในGit/Chat.
- **Tests: NOT RUN — USER-OWNED TESTING.** PASS/FAIL/VERIFIEDในตารางคือDBVerificationที่ผู้ใช้อนุญาตเฉพาะรอบนี้ ไม่ใช่AutomatedTestSuite/Browser/Build/Lint/Syntax/HealthCheck. Dashboard/Frontend/BackendBusiness/Auth/RBAC/Schema/Seed/Storageเดิมไม่เปลี่ยน. NEXT TASK: ทบทวนBaselineDriftและImmutable-compatible scope; ไม่ขออนุญาตApplyซ้ำและไม่เริ่มงานอื่นเอง.

## Phase A history — 12 November 2026

อัปเดต **12 November 2026 (Asia/Bangkok)**. งานเริ่ม11พฤศจิกายนและข้ามเที่ยงคืน. **PHASE A COMPLETE — REVIEW ONLY. PHASE B BLOCKED / NOT AUTHORIZED. DATABASE DELETES: 0 — PHASE A ONLY. FILE DELETES: 0.**

ผู้ใช้อนุญาต Source Audit, PostgreSQL read-only inspection, FK/trigger analysis, Backup และ Manifest generation เท่านั้น. ไม่มี INSERT/UPDATE/DELETE/DDL/Seeder/Reset/Trigger bypass หรือ DELETEแล้วROLLBACK. Transaction ใช้ REPEATABLE READ READ ONLY; ROLLBACK ปิดเฉพาะ read transaction. ไม่รัน App/API/DB test suites, Browser/Build/Lint/Typecheck/Syntax/Health checks. Backup readback/SELECT baseline comparisons ด้านล่างเป็น Phase A ที่อนุญาต ไม่ใช่ Application Acceptance.

ผล **Dashboard Manual Acceptance 20/20** เป็นสิ่งที่ผู้ใช้รายงานในคำสั่ง Cleanup นี้ (11–12 November 2026) ไม่ใช่ Codex รันทดสอบ. รักษา Dashboard Source/Logic/UI/Navigation/Round3 fixes และทุก Workflow เดิม.

## 1. Target ที่ยืนยันจากการเชื่อมต่อจริง

- Development config: `NODE_ENV=development`, `DB_HOST=postgres`, port5432, database `intern_system`. Host-side inspectionใช้ `127.0.0.1:5432` ตาม Docker published mapping ที่อ่านจริง ไม่ใช้ DNSชื่อpostgresจากWindowsโดยเดา.
- Live SELECT: database `intern_system`, schema `public`, PostgreSQL **16.15** (`160015`), server `172.18.0.3/32:5432`, read_only `on`, recovery `false`. Docker `intern_postgres` image `postgres:16-alpine`, publishedเฉพาะ127.0.0.1.
- Catalog จริง **58 tables / 97 FKs / 19 user triggers**; incoming/outgoing FK ข้าม schema ที่เกี่ยวกับpublic **0**. ครบ **1,176 rows** ณ Snapshot. Catalog/PK/CompositeFK/ON DELETE/trigger/function definitions เก็บส่วนตัวนอกGit; Models/Associations/Integrity source ใช้ประกอบ ไม่แทนCatalog.
- Read-after-backup comparison: **1,176/1,176 row fingerprints ใน58ตารางตรงกับSnapshot** ณ12Nov00:13:41Bangkok. ใช้SHA-256ของfullrow JSONฝั่งDBรวมcredentialsในdigest โดยไม่ดึง/เผยcredential values. ไม่ใช่การอนุญาตให้ใช้SnapshotเดิมApplyภายหลัง; PhaseBต้องตรวจใหม่.

## 2. Protected sets / account classification

พบรหัส **`6706022510107` เพียงหนึ่งบัญชี** UUID **`aaf35e5d-d7a6-43ef-b86b-afaefb95730a`**. Protected student-owned closure **62 rows** รวม Account/Profile/Addresses/Education/Skills/CloseFriend, GoogleIdentity1, Mentor1+Token1, Requests3, AdvisorRequests3, Project1, Links2, CO091, SnapshotCourses15, Reviews5, DeliveryMethods9, StudentFiles8. ชื่อ/PII/Paths อยู่ในPrivateManifestเท่านั้น ไม่ลงGit. ข้อมูลCredential/National-ID/Personal-fieldsถูกครอบคลุมด้วยfull-row fingerprintและDatabaseBackup.

Physical Storage ของProtected Student **10 files** (8 DB references +2 filesนอกcurrentmetadataที่ยังคงต้องเก็บ); สำรองทุกไฟล์และfingerprintแล้ว. ไม่ถือไฟล์ที่ไม่มีmetadataว่าได้รับอนุญาตให้ลบ. ลิงก์Externalเก็บในDBbackup; ไม่มีการดาวน์โหลด/แก้OverleafหรือDrive.

| Account set | Count | Disposition |
|---|---:|---|
| Studentsทั้งหมด | 57 | ยังอยู่ครบทั้งหมดในPhaseA |
| Explicit Protected Student | 1 | ห้ามแตะทุกกรณี |
| VERIFIED_SYNTHETIC — Teacher Demo15 | 15 | Proposalเท่านั้น; ทั้ง15ติดImmutableBlocker |
| VERIFIED_SYNTHETIC — Teacher Search35 | 35 | Proposalเท่านั้น; ทั้ง35ติดImmutableBlocker |
| VERIFIED_TEST_ACCOUNTเพิ่มเติม | 0 | ไม่มีหลักฐานเพียงพอให้จัดเพิ่ม |
| REAL_OR_UNKNOWN | 6 | เก็บทั้งหมด; ต้องมีหลักฐานและอนุมัติแยกก่อนขยายTarget |
| Teachersทั้งหมด | 23 | เก็บAccount/Credentials/Role/Relationshipsที่ไม่ใช่Targetครบ |
| DepartmentHeads | 1 | เป็นส่วนหนึ่งของTeacher23 ไม่ใช่บัญชีเพิ่ม |
| DepartmentStaffs | 2 | เก็บครบ |
| SuperAdmin Membership | 1 | เก็บMembership/Permissions/SessionMetadataครบ |

`student-roster.private.json` มีชื่อ/รหัส/UUID/category/reasonครบ57คนให้ตรวจภายในเครื่อง. ไม่จำแนกUnknownจากชื่อดูเหมือนtestหรือไม่ใช่ProtectedID. ไม่มีUUIDของUnknownในTarget.

ยืนยันSyntheticด้วย **Deterministic UUID + Committed Receipt ID + Expected Student Code + Marker Email** ของแต่ละslot ทั้ง50ตรงกัน; ไม่ใช้คำว่า“จำลอง”ในชื่อเป็นเกณฑ์. Receipt markers `fitm.teacher-demo.v1` (145base rows) และ `fitm.teacher-search.v1` (635rows), statusCOMMITTED/databaseintern_system, receipt-fileSHA256อยู่ในManifest. Receiptไม่ใช่หลักฐานว่าWorkflowหลังทดสอบยังไม่เปลี่ยน; Manifestจับcurrentrows+SHAใหม่ รวมบันทึกที่เพิ่มภายหลังผ่านownershipจริง. ไม่Replay Seeder/Repair Receipt.

Protected identity/catalog baselineรวม **188 rows** จาก Studentที่ต้องรักษา/Unknown/Teacher-Staff-SuperAdmin/AccountControls/AdminAudit/GoogleAuthRequests/Catalogs และFK ancestors. แยกAccountจากคำร้องสังเคราะห์ที่อ้างTeacher; ไม่ขยายChildrenของTeacherทุกคนจนรวมSyntheticทั้งหมด. Manifestยังเก็บBaselineครบ1,176rows เพื่อรักษาNonTargetอื่นนอก188นี้ด้วย.

## 3. Rows by table — intent only, not executable

**950 candidate-intent rows ใน18tables; non-target226rows. จำนวนนี้เป็นPreviewของสิ่งที่ผู้ใช้ต้องตรวจ ไม่ใช่Rowsที่ลบได้จริง. PhaseAคงอยู่ครบ1,176rows และ PhaseB executable rows=0 เพราะBlockers.** Protected-ownedเป็น62rowsของนักศึกษาที่ระบุโดยตรง/ต่อเนื่อง ไม่รวมTeacher/Staff/Catalog ancestors.

| Table | Current | Candidate intent | Keep if proposal were permitted | Protected-owned | Immutable candidate |
|---|---:|---:|---:|---:|---:|
| admin_account_controls | 1 | 0 | 1 | 0 | 0 |
| admin_audit_logs | 11 | 0 | 11 | 0 | 0 |
| companies | 62 | 50 | 12 | 0 | 0 |
| company_access_tokens | 0 | 0 | 0 | 0 | 0 |
| company_evaluations | 0 | 0 | 0 | 0 | 0 |
| company_response_history | 0 | 0 | 0 | 0 | 0 |
| company_responses | 0 | 0 | 0 | 0 | 0 |
| coop_academic_periods | 6 | 0 | 6 | 0 | 0 |
| coop_activities | 0 | 0 | 0 | 0 | 0 |
| coop_activity_history | 0 | 0 | 0 | 0 | 0 |
| coop_document_revisions | 0 | 0 | 0 | 0 | 0 |
| coop_documents | 0 | 0 | 0 | 0 | 0 |
| coop_prerequisite_catalog_courses | 10 | 0 | 10 | 0 | 0 |
| coop_prerequisite_catalog_grants | 4 | 0 | 4 | 0 | 0 |
| coop_prerequisite_catalog_programs | 2 | 0 | 2 | 0 | 0 |
| coop_project_advisor_requests | 19 | 16 | 3 | 3 | 0 |
| coop_project_links | 2 | 0 | 2 | 2 | 0 |
| coop_projects | 51 | 50 | 1 | 1 | 0 |
| coop_request_academic_history | 15 | 15 | 0 | 0 | 15 |
| coop_request_academic_states | 50 | 50 | 0 | 0 | 0 |
| coop_request_delivery_methods | 59 | 50 | 9 | 9 | 0 |
| coop_request_prerequisite_courses | 265 | 250 | 15 | 15 | 250 |
| coop_request_reviews | 11 | 6 | 5 | 5 | 0 |
| coop_requests | 53 | 50 | 3 | 3 | 0 |
| coop_topic_documents | 1 | 0 | 1 | 1 | 0 |
| coop_topic_exam_committee_members | 0 | 0 | 0 | 0 | 0 |
| coop_topic_exam_history | 0 | 0 | 0 | 0 | 0 |
| coop_topic_exams | 0 | 0 | 0 | 0 | 0 |
| department_staffs | 2 | 0 | 2 | 0 | 0 |
| google_auth_requests | 1 | 0 | 1 | 0 | 0 |
| google_identities | 1 | 0 | 1 | 1 | 0 |
| internship_daily_logs | 0 | 0 | 0 | 0 | 0 |
| internship_review_tokens | 0 | 0 | 0 | 0 | 0 |
| internship_week_events | 0 | 0 | 0 | 0 | 0 |
| internship_weeks | 0 | 0 | 0 | 0 | 0 |
| job_posting_reviews | 0 | 0 | 0 | 0 | 0 |
| job_posting_work_modes | 51 | 50 | 1 | 0 | 0 |
| job_postings | 68 | 50 | 18 | 0 | 0 |
| job_submissions | 62 | 50 | 12 | 0 | 0 |
| mentor_tokens | 1 | 0 | 1 | 1 | 0 |
| mentors | 34 | 33 | 1 | 1 | 0 |
| student_addresses | 21 | 15 | 6 | 2 | 0 |
| student_close_friends | 1 | 0 | 1 | 1 | 0 |
| student_education_records | 59 | 50 | 9 | 3 | 0 |
| student_files | 21 | 0 | 21 | 8 | 0 |
| student_profiles | 56 | 50 | 6 | 1 | 0 |
| student_skills | 85 | 65 | 20 | 4 | 0 |
| student_training_records | 10 | 0 | 10 | 0 | 0 |
| students | 57 | 50 | 7 | 1 | 0 |
| super_admins | 1 | 0 | 1 | 0 | 0 |
| supervision_appointments | 0 | 0 | 0 | 0 | 0 |
| supervision_events | 0 | 0 | 0 | 0 | 0 |
| supervision_images | 0 | 0 | 0 | 0 | 0 |
| supervision_result_revisions | 0 | 0 | 0 | 0 | 0 |
| supervision_results | 0 | 0 | 0 | 0 | 0 |
| supervision_tokens | 0 | 0 | 0 | 0 | 0 |
| system_settings | 0 | 0 | 0 | 0 | 0 |
| teachers | 23 | 0 | 23 | 0 | 0 |

6AcademicPeriods/PrerequisiteCatalogs/Grantsเก็บไว้เป็นSharedReferenceData ไม่อนุมานว่าเป็นข้อมูลปลอมเพราะสร้างระหว่างDemo. Companies12/Submissions12/Jobs18ที่อยู่นอกReceiptTargetและWorkMode1คงไว้. ในTargetที่เสนอมีCompany50/Submission50/Job50/WorkMode50จากReceipt; ไม่พบOutside-target FK/UUID referenceที่บังคับให้เก็บParentกลุ่มนี้เพิ่มเติมในSnapshotนี้. ต้องตรวจใหม่ก่อนApply ไม่ใช้Markerเพียงอย่างเดียวตัดสินลบSharedData.

StoredFiles/Links/CO09/GoogleIdentityในTarget50 **0**; ที่มีทั้งหมดเป็นProtected/Unknownและเก็บไว้. SupervisionAppointments/Results/Images/Events/Revisions/Tokens, InternshipLogs/Weeks/Events, CompanyResponses/History, GeneratedDocuments/Revisions และTopicExams/History/Committee เป็น0จริง ณSnapshot ไม่ใช่ไม่มีSchema/Workflow.

## 4. Dependency graph / blockers

PrivateManifestมีFKrow-edgesครบทั้งCompositeKeys, logicalUUIDedgesจากSnapshot/Actor/Target fields และรายชื่อTrigger+functionเต็ม. ชื่อ/Paths/ธุรกรรมส่วนบุคคลไม่ใส่รายงานGit. FK declarations: **CASCADE27 / RESTRICT65 / SET NULL5**. Candidate-parent row-reference edges (ไม่ใช่UniqueRows): CASCADE679 / RESTRICT256 / SETNULL100; SETNULL100นี้เป็นTargetChildrenเช่นRequest→Job/Job→Submission ไม่อนุญาตให้ยิงUpdateอ้อม; ถ้าวันหนึ่งทำได้ต้องเรียงChildrenก่อนParentsและตรวจRetainedChild0อีกครั้ง. ไม่ปล่อยCascadeทำงานโดยไม่Manifest.

| Blocker | Candidate rows | Effect |
|---|---:|---|
| `coop_academic_snapshot_immutable` on `coop_request_prerequisite_courses` | 250 | BEFORE DELETE/UPDATE → unconditional RAISE EXCEPTION; CASCADEจากRequestก็ไม่ข้ามTrigger |
| `coop_academic_history_immutable` on `coop_request_academic_history` | 15 | BEFORE DELETE/UPDATE → unconditional RAISE EXCEPTION; มีRESTRICT FKไปRequest/Course/ActorStudent |

**ทั้ง50TargetStudentsมีImmutableDescendants จึง BLOCKED ทั้งชุด**. การเปลี่ยนDeleteOrderไม่แก้ปัญหานี้. ห้ามDisableTriggers/Constraints, session_replication_role, แก้Function/History, DROP/Truncate/Reset หรือเลือกทำเฉพาะส่วนที่ลบได้. Existing6TargetReviewRowsกับTeacher/HeadReviewerเป็นข้อมูลคำร้อง ไม่ใช่การอนุญาตให้ลบAccountAudit11rowsหรือTeacher/Staffใด ๆ. AdminAuditทั้งหมดยังเก็บไว้. Triggerอื่นที่ว่างยังคงอยู่ครบและต้องReinspectก่อนApply.

ไม่พบProtected/Unknown-owned rowปะปนในTargetIntent; RetainedChildFKBlocker0, Cross-schemaFK0 ณSnapshot. LogicalUUIDedgeเป็นPotentialRelationshipสำหรับการเก็บ/ทบทวน ไม่ใช่FKใหม่หรือสิทธิ์Cascade. UnattributedGoogleAuthRequest1เก็บทั้งหมด ไม่เดาว่าเป็นSyntheticSession.

## 5. Private artifacts / backup

DirectoryนอกGit (ACLเฉพาะcurrentuser/SYSTEM/Administrators):

`C:\Users\suran\Documents\FITM-INTERN-Backups\cleanup-phase-a-20261112-000024\approved-review`

Manifestเป็น **REVIEW ONLY / apply_authorized=false / apply_ready=false**. ไม่มีความหมายว่าPhaseBอนุมัติแล้ว. ใช้เฉพาะชุดArtifactนี้; Earlier audit/backup snapshotsในParentเป็นDiagnostic history ไม่ใช่Manifestฉบับส่งตรวจ.

| Artifact | Evidence |
|---|---|
| `cleanup-manifest.private.json` | TargetUUID50 + Keys/Fingerprints + Protected/Unknown/IdentityBaselines + Graph/Blockers/Backup |
| `student-roster.private.json` | ชื่อ/รหัส/UUID/classificationครบ57คน; no credentials |
| `file-cleanup.private.json` | File inventory32/refs/hash/keep flags; every delete_authorized=false |
| `inventory.private.json` | Metadata/catalog, identifiers, minimalrelationprojection, full-row digests; no credential values |
| `manifest-digests.private.json` | SHA256ของManifest/FileManifest/Inventory |
| `backup-verification.private.json` | Archive readback + post-audit SELECT baseline comparison, no restore |
| `intern_system.dump` + `backup.toc.txt` | PostgreSQL16.15 custom archive, **304,575 bytes**, fullDatabase schema/data; exported snapshotเดียวกับInventory |
| `student-storage.tar` | **32 files /16,822,784bytes** จากactual `intern_backend:/app/storage` (Docker volume `fitm-intern_intern_storage`); ไม่ใช้Hostbackend/storageแทนโดยเดา |

SHA-256:

```text
Cleanup Manifest: 5aa8b2cf7aea94d01d5e6e2dbd91af2e6c30ab57b5e4986477e6dcf3836d8128
File Manifest:    d2d81ed8565a33881fc4cf26c19353bd7819cb2024f37fd12551a3ea6fbee589
Inventory:        7f6957f21ba5d997f180cacb87adb9a039ea9e0943d19b5da1d0843e2979a2b4
PostgreSQL dump:  ee0920b59d59eb8f7f774084e26f4040f8ae08f74104a3131b350399a1a626ae
Storage archive:  0aa422d07ca1612a6054e829a5166e886c9786f07389d830dcd0ec8906b48473
```

pg_dump exit0/fileexists/nonzero, pg_restore --list และfullarchive readbackลง`/dev/null`เสร็จโดยไม่ExecuteSQL. Storage archiveอ่านคืนแบบStreamครบ32/32entries ตรงCapturedSHA256/Size; file-size metadata mismatch0; MissingPhysicalFiles0. NTFS ACLอ่านจริงเฉพาะSYSTEM/Administrators/currentuser. Backupมีข้อมูลลับและPIIตามธรรมชาติของDatabase จึงห้ามCommit/ส่งขึ้นบริการ/แนบChat.

**Restoreจริง: NOT RUN.** Full Database archiveไม่รวมCluster-global role definitions และต้องมีOriginalDatabaseRoles/Extension prerequisitesในRestoreEnvironment. ไฟล์Storageเป็นBackupแยก ไม่ถูกเก็บในpg_dump; DBsnapshotและFileCaptureไม่เป็นAtomicFilesystemSnapshot จึงต้องเทียบFile+DBdigestsใหม่ก่อนPhaseBและหยุดเมื่อDrift. ไม่รับรองDisasterRecoveryจากการRestoreจริงที่ยังไม่ได้ทำ.

Restore planสำหรับงานที่ได้รับอนุญาตใหม่เท่านั้น: เตรียมPostgreSQL16และrolesเดิม, สร้างDBว่างแยกจาก`intern_system`, ใช้ `pg_restore --exit-on-error --single-transaction --dbname=<approved-empty-target> <private-dump>` โดยไม่ใช้`--clean`บนฐานใช้งาน. กู้Storage archiveไปPrivateVolume/Directoryแยก ตรวจReferencedPaths/ProtectedRows/IdentityMemberships/Digestsก่อนพิจารณาสลับระบบ. ห้ามกู้ทับCurrentDB/CurrentVolumeหรือรันคำสั่งเหล่านี้ในPhaseA.

## 6. Phase B prerequisites — not an Apply implementation

1. ผู้ใช้ตรวจรายชื่อ/UUID/Rows/KeepSet/Backup และDigestชุดนี้; Unknown6ไม่รวมTargets. **แก้ความขัดแย้งกับImmutablePolicyโดยวิธีที่ได้รับอนุมัติและรักษาIntegrityก่อน**; การตอบ“Apply”อย่างเดียวไม่ทำให้Blockersหาย. เก็บข้อมูลไว้เป็นทางเลือกที่สอดคล้องScopeปัจจุบัน; งานฐานDevelopmentแยกต้องมอบหมายใหม่ ไม่ทำเอง.
2. หากมีเส้นทางที่ทำได้ภายในข้อห้ามจริง ต้องอนุญาตPhaseBใหม่สำหรับTargetManifestที่ระบุ ไม่ใช่อนุญาตลบทุกStudentยกเว้นProtected. ตรวจLiveTarget/BackupHash/SchemaDigest/Receipts/Fingerprints/AllProtectedSets/FileRefsอีกครั้ง; Drift→หยุดและRe-review ไม่Repairข้อมูลเพื่อให้Guardผ่าน.
3. TransactionและLocksที่ป้องกันConcurrentWritesได้จริงบนตารางที่เกี่ยวข้องตามลำดับคงที่ (AdvisoryLockอย่างเดียวไม่พอ), Child-firstตามFKทั้งCASCADE/RESTRICT/SETNULL, UUID/CompositeKeyAllowlistเท่านั้น. Guardพลาด→Rollbackทั้งชุด; ห้ามPartial/UnrestrictedDelete/Truncate/DisableIntegrity. ไม่มีApplySQL/WriterScriptในรอบนี้.
4. หลังCommitที่ได้รับอนุมัติ ต้องSELECTตรวจProtectedStudent/TeacherStaff/SuperAdmin/securityครบทุกfield/row, TargetCounts/Orphans/Schema/TriggersตามManifest. ไม่แก้Dashboardเพื่อทำยอดกลับเท่าDemo.
5. PrivateFileCleanupเป็นงานแยกหลังDBCommitและUserApprovalสำหรับFileManifestล่าสุดเท่านั้น ต้องไม่มีProtected/Shared/Unknown referencesก่อนลบ. PhaseAFileCandidate0; Storageทั้ง32ไฟล์คงเดิม รวมProtected10. ห้ามลบPrivateFilesในDBtransaction.

## 7. Files / responsibility / remaining work

เพิ่ม `backend/scripts/prepareSyntheticCleanup.cjs` (SELECT-only target/catalog/minimal data capture + optional snapshot pg_dump/readback) และ `backend/scripts/analyzeSyntheticCleanup.cjs` (offline dependency manifest + read-only Storage capture/backup). ไม่มีApplyMode; รับexplicitprivateoutputนอกRepo, refuse overwriteสำหรับInventory/Dump, credentialsโหลดจากbackend/.envโดยไม่พิมพ์. PowerShellเตรียมNTFS privateACLก่อนใช้. Scriptsไม่ถูกimportจากApp startup/Seeder. SnapshotปรับCatalogname[]เป็นtext[]หลังพบDriverคืนNameArrayเป็นstring; ไม่มีDBSchemaเปลี่ยน. ข้อผิดพลาดก่อนหน้านี้ไม่มีDBMutationและไม่ยกเป็นผลDryRunสำเร็จ.

แก้ `HANDOFF_fitm-intern.md`; เพิ่มPlanไฟล์นี้. ไม่แก้ README/ProjectSkill/BusinessSource/Frontend/Models/Schema/Seeds/Environment. Git baseline **28M/32U → 28M/35U** (เพิ่ม2scripts+Plan; Handoffเป็นMเดิม). ไม่มีCommit/Push/Reset/Clean/Stash/Checkoutทับ; PrivateArtifactsทั้งหมดอยู่นอกGit.

**Tests: NOT RUN — USER-OWNED TESTING.** RuntimeDashboard20/20มาจากผู้ใช้เท่านั้น. SourceAudit/AuthorizedSELECT/BackupReadbackที่ทำจริงแยกจากTests. Remaining: Manifest review, Unknown-account decisionsหากต้องขยายscope, Immutable policy conflict, Restore exerciseที่ยังไม่อนุญาต และFreshGuardsก่อนPhaseB. ไม่มีPermissionBlockerค้าง; Docker access/นอกRepoBackupผ่านToolApprovalตามขอบเขต ไม่ข้ามระบบสิทธิ์.

**DATABASE DELETES: 0 — PHASE A ONLY. Pending Approval: Phase B ยังไม่อนุมัติและยังBLOCKEDตามIntegrityเดิม. NEXT TASK: ผู้ใช้ตรวจ Manifest และอนุมัติ Phase B เมื่อมีแนวทางที่ไม่ขัดImmutable/Protected requirements.**
