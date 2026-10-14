# FITM-INTERN — Development Google Login & Secure Account Linking Readiness

วันที่ตรวจ: 14 ตุลาคม 2026 (Asia/Bangkok) ใช้ Local Working Tree เป็นหลัก ไม่ใช้ GitHub Remote แทน Source จริง

## 1. Executive Summary — PARTIAL

**งาน Readiness Audit ที่อนุมัติทำครบแล้ว ระบบยังไม่เปิด Google Login/Linking และ Production Ready: NO** Config, Migration 026, Constraints จริง, Regression, Mock Linking Guards, Build, Mock Browser และ Database Preservation ผ่าน เตรียม Database Backup ใหม่แบบ READ ONLY ภายนอก Repository และตรวจอ่าน Archive ทั้งหมดแล้ว แต่ยังไม่ทำ Restore Test, ไม่เลือก Student เพื่อผูกจริง และไม่ทำ Application Google Provider E2E

| รายการ | สถานะ | หลักฐานสำคัญ |
|---|---|---|
| Google Development Config | PASS | Flags `false/false`; Client ID Backend/Frontend ตรงกัน; Hosted Domain `email.kmutnb.ac.th` |
| Migration / Constraints | PASS | 026 INSTALLED; 24 Executed; 019–021 ยังไม่ Executed; catalog ตรง Migration Source |
| Secure Linking implementation | PASS ใน Source/Mock | ยืนยันทั้ง Google และ Internal Password; ไม่มี email auto-link/actor creation; 12 focused guards ผ่าน |
| Student eligibility | PARTIAL | 4 บัญชีเข้าเกณฑ์เบื้องต้น; 2 มี Profile; ผู้ใช้ยืนยันว่ามีบัญชีเดิมที่เข้าได้ แต่ยังไม่เลือก/Verify เจ้าของผ่าน Backend ในงานนี้ |
| Backup archive | PASS | ใหม่, ACL จำกัด, SHA-256 ตรง, TOC ครบ 35 ตาราง, full archive read ผ่าน |
| Restore / targeted recovery rehearsal | NOT TESTED | ต้องอนุมัติ Database/Cluster ทดสอบแยกก่อน; ไม่มี Restore ทับ Development |
| Regression / Build | PASS | Backend 278, Frontend 368, focused linking 12; 0 FAIL; 26 SKIP; Build PASS |
| Browser | PASS ตามขอบเขต | Mock 9 cases; Live disabled 8 cases; ไม่ใช่ Real Application E2E |
| Application Google Login/Linking จริง | NOT TESTED / BLOCKED ที่ Approval Gate | Flags ยังปิด; Mapping 0; ยังไม่อนุมัติ Identity writes |

## 2. Local Git Status Before/After — PASS

Git ???????: Tracked Modified 32, Untracked 410 ???? Git ???????: Tracked Modified 32, Untracked 451 ???? ????????????????/??????????? 41 ???? ????? Git ????????????????? ???? SHA-256 ??????????? 842 ??????? Environment 3 ????????????????? ????????????????????????????? Artifact scan ????? Client ID ????, private config values ???? JWT shape ?????????????

ไม่ได้แก้ Application Source, Config, README/HANDOFF เดิม, `.env`, Docker Compose, Student Profile หรือ Workflow ใด งานนี้เพิ่มเฉพาะรายงาน/หลักฐานและเครื่องมือทดสอบที่อยู่ใต้ audit directory Backup จริงเก็บนอก Repository ไม่มี Commit/Push/Reset/Clean/Stash/Checkout และไม่ลบ Uncommitted Changes

หลักฐาน: [Git before](evidence/google-dev-linking-readiness-20261014/git-before.txt), [Git after](evidence/google-dev-linking-readiness-20261014/git-after.txt), [preservation](evidence/google-dev-linking-readiness-20261014/preservation.json)

## 3. Source Code Inspection — PASS

ตรวจไฟล์จริง:

- `backend/src/config/oauth.js`, `services/googleToken.service.js`, `services/googleAuth.service.js`, `controllers/googleAuth.controller.js`, `routes/googleAuth.routes.js`, `routes/auth.routes.js`
- `models/googleIdentity.model.js`, `models/googleAuthRequest.model.js`, `models/student.model.js`, `models/index.js`, `db/prepared/google-oauth/026_google_identity_mapping.js`, `db/googleOAuth026.js`, read-only migration storage/discovery
- JWT/RBAC ที่ `middlewares/auth.middleware.js`, `middlewares/teacherAuth.middleware.js`, `services/teacherAuth.service.js`, `services/staffAuth.service.js`; Teacher/Head authentication อยู่ใน `roleWorkflow.routes.js`, Staff อยู่ใน `staffAuth.routes.js`
- `frontend/src/pages/googleLogin.js`, `api/googleAuth.api.js`, `auth/googleSession.js`, `auth/studentAuthStorage.js`, Login scripts/HTML ทั้ง 4 บทบาท, `pages/student_coop.js`, `ui/feedback.js`
- Existing tests, `docker-compose.yml`, Vite/package configuration, README/HANDOFF และรายงานล่าสุดที่ผู้ใช้ระบุ

README/HANDOFF ยังคงมีข้อความก่อนงานติดตั้ง 026/Diagnostic ว่าไม่มี Client ID, ไม่มี 026 และยังไม่ทดสอบ Provider ข้อความเหล่านั้นไม่ใช่สถานะปัจจุบัน ใช้ Source, catalog จริง และรายงาน [Verified Hosted Domain Configuration](FITM_GOOGLE_VERIFIED_HOSTED_DOMAIN_CONFIGURATION_2026-10-14.md) กับ [Diagnostic](FITM_GOOGLE_WORKSPACE_HOSTED_DOMAIN_DIAGNOSTIC.md) แทน โดยรักษาเอกสารเดิมตามขอบเขตนี้

## 4. Google OAuth Configuration Results — PASS

| Config | ผลจริงทั้ง local/runtime ที่เกี่ยวข้อง |
|---|---|
| `GOOGLE_HOSTED_DOMAIN_POLICY` | `required` |
| `GOOGLE_ALLOWED_HOSTED_DOMAINS` | `email.kmutnb.ac.th` เท่านั้น |
| `GOOGLE_ALLOWED_EMAIL_DOMAINS` | `kmutnb.ac.th,email.kmutnb.ac.th` |
| `GOOGLE_LOGIN_ENABLED` | `false` |
| `GOOGLE_ACCOUNT_LINKING_ENABLED` | `false` |
| Backend Google Client ID | ตั้งค่าแล้ว; ปิดบังค่า |
| Frontend Google Client ID | ตรงกับ Backend ทั้งไฟล์และ Container; `VITE_GOOGLE_CLIENT_ID` ไม่ใช่ค่าที่ Login UI อ่านจริง |
| Frontend GIS Client ID | อ่านจาก Backend config endpoint เมื่อเปิดบริการ |
| Role Email Overrides | ไม่ตั้งค่า; ใช้ global list เดิม ไม่มีการเปลี่ยน Policy |
| Frontend Origin / API | `http://localhost:5173` / `http://localhost:5000` |
| Config endpoint | HTTP 200, `enabled:false` ตาม disabled source path |

Source รองรับ GIS, pinned Google JWKS, RSA/RS256 signature, issuer, exact audience, azp เมื่อมี, exp/iat, nonce presence/equality, email_verified และ exact Email/Hosted allowlist Global Hosted Allowlist ถูกใช้กับทุก Role; ไม่ได้ยืนยันว่า Teacher/Head/Staff มี hd เดียวกับ Student

7 Config fixture cases ผ่าน โดยใช้ detached object และ mock claims เท่านั้น ไม่มี process/file/Container Flag เปลี่ยน Actual Token Verification ถูกทดสอบผ่าน synthetic RSA/JWKS ใน existing regression ไม่ส่ง Token หรือ Credential ไป tool outputs

หลักฐาน: [local configuration](evidence/google-dev-linking-readiness-20261014/local-configuration.json), [runtime before/after](evidence/google-dev-linking-readiness-20261014/runtime-after.json), [config fixtures](evidence/google-dev-linking-readiness-20261014/config-validation.json), [health](evidence/google-dev-linking-readiness-20261014/health.json)

## 5. Hosted Domain Verification — PASS สำหรับบัญชี Student ที่เคยตรวจ

หลักฐาน Real Provider Diagnostic วันที่ 11 ตุลาคม 2026 เวลา 23:56:52 Asia/Bangkok ยืนยัน **`hd=email.kmutnb.ac.th`**, signature/issuer/audience/azp/expiration/nonce PASS และ email_verified true เป็น Token สำหรับ Client ปัจจุบันในขณะตรวจ ภายใต้ Internal Audience ที่ผู้ใช้ยืนยัน ไม่ได้อนุมานจาก Email Suffix

งานนี้ไม่ขอ Token ใหม่ ไม่เปิด Provider Login และไม่ได้อ่าน Google Cloud configuration ผ่าน API จึงไม่อ้างว่าเพิ่งตรวจ Cloud Console/บัญชีอื่นหรือ App Login ครบแล้ว Token เก่าไม่ใช่ Token ที่จะนำกลับมาใช้ทดสอบ หลังอนุมัติต้องสร้าง Challenge/Nonce และรับ Token ใหม่

หลักฐาน: [sanitized provider result](evidence/google-oauth-hd-diagnostic/provider-result.json), [readiness summary](evidence/google-dev-linking-readiness-20261014/readiness-summary.json)

## 6. Secure Linking Security Audit — PASS ใน Source/Mock; Live SQL Linking NOT TESTED

| Requirement | ผลตรวจ |
|---|---|
| พิสูจน์ Google ownership | Token verify ก่อน identity policy และ request consumption; fresh nonce/request secret ผูก role/purpose |
| พิสูจน์ Internal ownership | ค้นบัญชีเดิมด้วย Email แล้วเรียก comparePassword; ไม่มี Password/ไม่มีบัญชี/ผิด Password ปฏิเสธ |
| ไม่มี Email Auto-Link | ไม่มี mapping จะตอบ GOOGLE_LINK_REQUIRED แม้ Google Email ตรง Internal Email |
| ใช้ Google sub | mapping key เป็น subject + actor_type ตาม Policy/unique index เดิม |
| UUID/Student ID/Profile/Role เดิม | ไม่ create/update Actor/Profile; GoogleIdentity FK ชี้ UUID เดิม; Role มาจาก Actor/DB |
| Google Email ต่าง Internal Email | ยอมรับเฉพาะเมื่อ Google verified identity และ Internal password ownership ผ่านทั้งสองฝั่ง ไม่ต้องใช้ email equality |
| Head authorization | Head ใช้ Teacher identity และตรวจ status/is_department_head/department จาก DB; ตรวจ Head domain policy ซ้ำ |
| Cross-account conflicts | existing subject → อื่น / actor → อีก subject ปฏิเสธ; unique indexes เป็น DB protection; ไม่ overwrite mapping |
| Replay/expired requests | atomic conditional consume เช็ค id/secret_hash/nonce_hash/role/purpose/consumed_at/expiry ภายใน transaction |
| Transaction recovery | failure rollback Mapping และ request consumption; success request ใช้ซ้ำไม่ได้ |
| No-password account | BLOCKED; proposed administrator-assisted process ยังไม่มี bypass และไม่อนุมัติใช้งาน |
| New actor/onboarding | ไม่มี Student/Teacher/Head/Staff auto-create; Google-only Student onboarding ปิด 503 |

Focused tests 12 กรณีเรียก production service ด้วย in-memory models และ verifier fixture ทดสอบ ownership, conflicts, missing password, role/head flag, request secret/nonce/expiry, replay, preserved UUID/Student ID/profile sentinel และ transaction-failure behavior **ไม่ได้ใช้ PostgreSQL** จึงไม่อ้างว่าได้ทดสอบ live lock/concurrency/constraint violations ครั้งนี้ Real catalog ตรวจ constraints แยก ส่วน Google SQL integration tests opt-in ถูก Skip เพื่อไม่สร้าง DB/Migration/Mapping

Failure ที่ rollback transaction ทำให้ request ยังไม่ consumed จนหมดอายุ; successful request จึงเป็น single-use ตาม Source อัตราคำขอ Google routes จำกัด 40 ต่อ 15 นาทีต่อ IP และข้อผิดพลาดถูก normalize ไม่ส่ง Provider/ORM error/raw credential

หลักฐาน: [focused test source](evidence/google-dev-linking-readiness-20261014/linking-guards.test.cjs), [12 results](evidence/google-dev-linking-readiness-20261014/linking-guards-tests.json), existing `backend/test/googleAuthPostgres.test.js` (reviewed, NOT RUN as SQL integration)

## 7. Student Account Eligibility — PARTIAL

ข้อมูลนำออกจาก PostgreSQL เป็น alias/booleans เท่านั้น ไม่รับ/พิมพ์ Email, UUID, Student ID, Password Hash, Google Subject หรือ PII จริง

| Alias ใน audit นี้ | Status | UUID/Student ID/Email มีตาม schema | Password Hash รูปแบบ bcrypt | Google Mapping | Existing Profile | เกณฑ์เบื้องต้น |
|---|---|---|---|---|---|---|
| S01 | pending | ผ่าน | มี | ไม่มี | ไม่มี | ผ่าน |
| S02 | pending | ผ่าน | มี | ไม่มี | มี | ผ่าน |
| S03 | pending | ผ่าน | มี | ไม่มี | ไม่มี | ผ่าน |
| S04 | pending | ผ่าน | มี | ไม่มี | มี | ผ่าน |

ทั้ง 4 เข้าเกณฑ์เบื้องต้นตาม Source; 2 บัญชีที่มี Profile เหมาะสำหรับตรวจว่าข้อมูล Profile เดิมคงอยู่ **เมื่อผู้ใช้เลือกบัญชีของตนเอง** Alias ใช้รายงานและไม่ได้เป็นการเลือก/อนุมัติบัญชีที่จะผูก บัญชีไม่มี Profile ไม่ถูกสร้าง Profile อัตโนมัติจาก Linking

ไม่พบ Email Verification Column ใน Schema Student จริง จึงระบุ Internal Email Verification ว่า **N/A / NOT IN SCHEMA** `status=pending` เป็น Student workflow status ไม่ใช่หลักฐานยืนยันอีเมล Google email_verified เป็นอีก claim ที่ตรวจใน Token

ผู้ใช้ตอบว่ามี Internal Student Account เดิมและเข้าสู่ระบบด้วย Email/Password ได้ บันทึกเป็น **user-reported** เท่านั้น ไม่มีการทดสอบ Password/Login จริงใน audit นี้ Actual account selection และ Backend ownership proof ยัง NOT TESTED ต้องให้ผู้ใช้เลือกและกรอกข้อมูลเฉพาะในหน้า App หลังอนุมัติ ไม่ส่ง Secrets/PII ในแชต

Teacher เข้าเกณฑ์เบื้องต้น 1; Head/Staff 0 — ไม่สร้างบัญชีเพิ่ม และไม่รับรอง Hosted Domain ของบทบาทเหล่านี้

## 8. Database and Migration Verification — PASS

Target `intern_system` ตรวจผ่าน Client options `default_transaction_read_only=on` และ `BEGIN ... REPEATABLE READ READ ONLY` ไม่มี DDL/DML/runner/seeders

- 026 state **INSTALLED** ผ่าน catalog validation ใน `googleOAuth026.inspect/state`; 24 Executed
- 019–021 ไม่มี ledger entry และยัง Pending ตาม discovery/source เดิม
- ตาราง google_identities/google_auth_requests มีครบและว่างทั้งก่อน/หลัง
- Google identities PK, CHECK exactly one actor FK, nonempty subject, 3 validated FK → students/teachers/department_staffs พร้อม CASCADE actions ตรง Source
- unique `(subject,actor_type)` และ unique student_id/teacher_id/staff_id; request PK/expiry index ตรง Source ไม่มีการลด constraints
- Before/After schema digest, ledger และ whole-row count/digest ของ public tables ทั้ง 35 ตารางตรงกัน รวม Students/Profiles/relationships
- Container IDs, StartedAt, Mounts ของ Backend/Frontend/PostgreSQL เดิมคงเดิม ไม่มี Restart/Recreate หรือ Volume changes ใน audit นี้

หลักฐาน: [before catalog/data](evidence/google-dev-linking-readiness-20261014/runtime-before.json), [after catalog/data](evidence/google-dev-linking-readiness-20261014/runtime-after.json), [snapshot script](evidence/google-dev-linking-readiness-20261014/read-only-snapshot.cjs)

## 9. Backup and Recovery Readiness — PARTIAL

**เตรียม Backup ใหม่สำเร็จและอ่าน Archive ตรวจครบ แต่ Restore Test/Recovery Rehearsal ยัง NOT TESTED**

Existing `backupGoogleOAuth026.js`/`backupAndRehearse` ทำ dump ตามด้วยสร้าง disposable PostgreSQL/Database และ Restore จึงไม่ได้รันทั้ง CLI เพราะงานนี้ไม่อนุมัติสร้าง Test Database ใช้ขั้นตอน pg_dump custom archive เดิมแบบ read-only แล้วตรวจ Archive แยกโดยไม่ต่อ DB สำหรับ restore

| Check | ผล |
|---|---|
| Source target/cluster | PASS — Docker postgres target ตรง Backend READ ONLY snapshot |
| PostgreSQL/client version | PASS — PostgreSQL 16 และ pg_dump/pg_restore รุ่น 16 ที่มีอยู่จริง |
| Destination | นอก Repo ใต้ `%USERPROFILE%/.codex/backups/fitm-intern/google-dev-linking-readiness/development-20261014-...` |
| Create permission | PASS — สร้างไฟล์ใหม่ได้ตามคำขอ ไม่ overwrite backup เดิม |
| ACL | PASS — inheritance ถูกจำกัดที่ directory; archive ACL ตรวจแล้วเฉพาะ current user/SYSTEM/Administrators |
| Archive format/size | PASS — PGDMP/custom; 141,791 bytes |
| SHA-256 persisted bytes | PASS |
| TOC / TABLE DATA | PASS — ครบ public tables 35 ตาราง รวม ledger และ Google tables |
| Full archive read | PASS — `pg_restore --exit-on-error --file=/dev/null` decompress/parse ครบ ไม่ใช้ --dbname และไม่ execute SQL |
| Restore into separate DB | NOT TESTED — ต้องอนุมัติ Test DB/Cluster แยกก่อน |
| Restore over live DB | ไม่ทำและไม่อนุมัติ |

Backup snapshot นี้ไม่รวม external uploaded files หรือ PostgreSQL cluster globals เก็บ Archive/manifest จริงภายนอก Repo มีเฉพาะ sanitized metadata ใน [backup preparation](evidence/google-dev-linking-readiness-20261014/backup-preparation.json), [ACL](evidence/google-dev-linking-readiness-20261014/backup-acl.json), [backup script](evidence/google-dev-linking-readiness-20261014/prepare-backup.cjs) ไม่อ้างว่า Restore ready เพียงเพราะมีไฟล์หรืออ่าน Archive ผ่าน Backup เก่าก่อนติดตั้ง 026 ไม่ใช่ snapshot ปัจจุบันสำหรับ Linking และไม่ใช่เหตุให้ Restore ทับ live DB

Targeted rollback ที่เสนอหลังอนุมัติเท่านั้น:

1. ก่อนทดสอบจริง refresh backup/baseline และเก็บ test Mapping ID/Actor UUID/subject fingerprint/request IDs ใน private manifest ที่ผู้ใช้อนุมัติ ไม่ใส่ PII/Token ในรายงาน
2. ปิด Login/Linking Flags และ Refresh เฉพาะ Backend เพื่อหยุดคำขอใหม่ก่อน cleanup
3. ตรวจ transaction/row lock โดยเลือก **exact Mapping ID + actor_type + Actor UUID + expected identity fingerprint** ว่าเป็นรายการใหม่ของ test และไม่เคยอยู่ใน baseline; ถ้าไม่ตรงให้หยุด ไม่ลบตาม email/domain/ช่วงเวลาแบบกว้าง
4. หลังอนุมัติ Delete เฉพาะ Mapping รายการนั้นใน transaction โดยไม่ Delete/Update Student/Profile/Student ID/Role; FK ชี้จาก Mapping ไป Actor จึงไม่ต้องลบ Parent
5. Auth Request cleanup ทำเฉพาะ exact test IDs ถ้าได้รับอนุมัติ; ระวัง Source challenge มี global expired-request pruning อยู่แล้ว
6. เทียบ Student/Profile/all unrelated table digests ว่าคงเดิม และ Mapping delta ตรงรายการที่อนุมัติก่อน commit
7. Logout/clear Remember Me ใน test browser/all relevant tabs; issued Application JWT **ไม่ถูก revoke โดยการปิด Flagsหรือลบ Mapping** ต้องแยก session cleanup/expiry (ปัจจุบัน 1d) จาก identity rollback ห้าม rotate JWT Secret ทั้งระบบโดยพลการ

Full restore ใช้ได้เฉพาะ target แยกที่อนุมัติและต้องทดสอบ constraints/data/ledger/source version หลัง restore ห้ามนำ snapshot เก่าทับข้อมูลใหม่ใน live Databaseเพื่อย้อน Mapping เดียว แผนทั้งหมดข้างต้นยังไม่ได้ execute

## 10. Backend Regression — PASS

`node --test --test-reporter=tap`: **302 tests, 278 PASS, 0 FAIL, 24 SKIP** ตรง Baseline 278 PASS Backend ไม่มี regression loss เพิ่ม focused Linking Guards แยก **12 PASS / 0 FAIL / 0 SKIP** ไม่ปะปนกับ baseline count

Child processes ใช้ synthetic credentials, DB/PG host 127.0.0.1 port 1, non-Development Database name และ `PGOPTIONS=-c default_transaction_read_only=on`; ปิด optional integration switches ไม่สร้าง Database และไม่ใช้ค่า credentials จริงใน test output ที่บันทึก

ครอบคลุม Token/JWT signature and claims, Google config/domain policy, secure linking/source guards, RBAC/protected API controls, profile-related regressions ตาม existing suite SQL/Provider integration ที่มี side effects ถูก Skip ไม่รัน migrations หรือ actual Mapping writes

หลักฐาน: [backend results](evidence/google-dev-linking-readiness-20261014/backend-tests.json), [focused guards](evidence/google-dev-linking-readiness-20261014/linking-guards-tests.json), [regression guard](evidence/google-dev-linking-readiness-20261014/regression-guard.json)

## 11. Frontend Regression — PASS

**370 tests, 368 PASS, 0 FAIL, 2 SKIP** ตรง Baseline 368 PASS รวม 26 SKIP ทั้งสอง baseline suites ไม่เปลี่ยน implementation เพื่อให้ผ่าน

ครอบคลุม actual Login HTML mounting, nonce/credential exchange ด้วย mocks, role/token/redirect mismatch, duplicate/cancelled callbacks, fresh challenge for linking, cleared password after attempt, error/conflict feedback, Remember Me checked/unchecked, logout, reload/expiry, cross-tab replacement protection และ related Profile regressions Shared Toast/Action Modal เดิมคงอยู่ ไม่มีเพิ่ม Native window.alert/confirm

Native Edge Mock Google/API: **9 PASS** (4 roles × desktop/mobile + disabled Student form) ตรวจ native click, authorized destination, application session storage, Student Remember Me และ overflow Live Development disabled: **8 PASS** (4 roles × desktop/mobile), Password forms ใช้งานได้, แสดง Google disabled, 0 mutation requests, 0 Provider requests

Mock Browser/DOM tests ไม่ถือเป็น Provider E2E Link/error/conflict UI บางส่วนพิสูจน์ด้วย Node/VM fixtures ไม่ใช่ real Provider interaction/SQL

หลักฐาน: [frontend results](evidence/google-dev-linking-readiness-20261014/frontend-tests.json), [mock browser](evidence/google-dev-linking-readiness-20261014/browser-mock/browser-results.json), [live disabled browser](evidence/google-dev-linking-readiness-20261014/browser-live-disabled/browser-results.json)

## 12. Build and Health Check — PASS

Vite production Build ผ่านใน audit directory ใหม่ด้วย Browser config สังเคราะห์ ไม่เขียนทับ dist เดิมหรือเปิด Production `/health/db` HTTP 200 status ok; Google config HTTP 200 enabled false; CORS Origin localhost:5173

Anonymous GET `/api/auth/me`, `/api/teachers/auth/me`, `/api/staff/auth/me` ถูกปฏิเสธ HTTP 401 ไม่มี JWT ถูกส่ง/ออกจากการตรวจนี้ การปฏิเสธ anonymous ไม่ใช่การพิสูจน์ every authorized live role flow ซึ่งยังอยู่ใน mock/regression scope

หลักฐาน: [build](evidence/google-dev-linking-readiness-20261014/frontend-build.json), [health](evidence/google-dev-linking-readiness-20261014/health.json), [protected API checks](evidence/google-dev-linking-readiness-20261014/protected-api-readiness.json)

## 13. Remaining Security Risks — PARTIAL

ไม่พบ confirmed HIGH/CRITICAL ใหม่ใน Source/Constraints/Mock Guards ที่ตรวจ แต่ขอบเขตนี้ไม่ใช่ full penetration test หรือ production acceptance

| ระดับ/ประเภท | ประเด็นจริง | แนวทางก่อนดำเนินการต่อ |
|---|---|---|
| MEDIUM — Development exposure | Backend 5000/Frontend 5173/PostgreSQL 5432 bind 0.0.0.0 และ :: จริง; CORS ไม่ใช่ network access control | ตรวจ/จำกัด reachable network หรืออนุมัติ loopback/firewall scopeก่อนเปิด flags; ไม่ปรับ Compose ใน audit นี้ |
| MEDIUM — Recovery/session gap | Flags/mapping rollback ไม่ revoke stateless Application JWT; logout clears browser storage เท่านั้น; JWT expiry ปัจจุบัน 1d | อนุมัติ recovery/session expectations แยก ไม่ rotate global Secret หรือเปลี่ยน expiry โดยพลการ |
| PARTIAL — Global activation scope | Google Login/Linking flags global ทั้ง 4 roles ไม่มี Student-only/per-account switch | อนุมัติผลกระทบจริงของ global Dev flags และควบคุมผู้เข้าถึงระหว่าง Student test ไม่เปลี่ยน Identity Policy เอง |
| PARTIAL — Ownership | ผู้ใช้รายงานว่ารู้ Password แต่ Backend verification กับบัญชีจริงยังไม่ทำ และยังไม่เลือกบัญชี | ผู้ใช้เลือกบัญชีของตนและกรอก Password เฉพาะหน้า App หลังอนุมัติ |
| NOT TESTED — Restore/concurrency/App E2E | Full archive read ไม่ใช่ restore; live DB lock/constraint races/real App login/link ยังไม่รัน | อนุมัติ isolated restore rehearsal และ scoped Application E2E ก่อนสรุป readiness เพิ่ม |
| BLOCKED/NOT TESTED — Other roles | Head/Staff ไม่มีบัญชีเข้าเกณฑ์; hd ของ Teacher/Head/Staff ไม่ยืนยัน | ไม่สร้างบัญชีหรือเพิ่ม domains โดยพลการ |
| LOW — Browser token exposure surface | Remember Me ใช้ localStorage JWT ตาม implementation เดิม | Scope นี้ตรวจ preservation/expiry/cross-tab ไม่แทน XSS/CSP/production hardening audit; ไม่เปลี่ยน policy |

ข้อจำกัดสำคัญ: การเปิด Login แล้วเปิดหน้า Login จะเรียก challenge อัตโนมัติ **ก่อนกด Google** ทำให้ create auth_requests และ prune expired requests การอนุมัติเปิด Login จึงต้องรับทราบ transient DB writes เหล่านี้ แม้ยังไม่สร้าง Mapping

## 14. Application E2E Status — NOT TESTED

Real Google Provider Diagnostic สำหรับบัญชี Student เดิม PASS แต่เป็นการตรวจ Token/hd ที่ไม่มี Mapping/Application JWT ไม่ใช่ real App Login/Linking งานนี้ไม่เรียก workflow ที่เปลี่ยน identity; 9 Mock Browser + 8 Live Disabled cases ไม่ทำให้ App E2E ผ่าน

Application Login ที่มี Mapping, Secure Linking, original UUID/Profile preservation ภายใต้ real transaction, real Remember Me/logout/authorized dashboard และ targeted rollback ยังต้องทดสอบหลังอนุมัติ

## 15. Approval Required — BLOCKED ที่ Gate

| รายการที่จะทำต่อ | ต้องอนุมัติ | ผลกระทบ / การกลับสู่สถานะเดิม |
|---|---|---|
| Isolated restore rehearsal | อนุมัติสร้าง target PostgreSQL/Test Database แยก และใช้ private backup; ห้าม restore live | เขียนเฉพาะ target แยก; validate rows/schema/ledger; cleanupเฉพาะ target ที่ระบุ ไม่แตะ live volumes |
| เปิด GOOGLE_LOGIN_ENABLED | อนุมัติ Dev global flag และ Backend refresh พร้อม Auth Request create/prune | เปิดทั้ง 4 portals ตาม Source; ปิดกลับfalse/refreshเพื่อหยุดคำขอใหม่ แต่ไม่ revoke issued JWT |
| เปิด GOOGLE_ACCOUNT_LINKING_ENABLED | อนุมัติ password ownership policy เดิมสำหรับ Dev global scope | อนุญาต link purpose; ปิดกลับfalseเพื่อหยุดการผูกใหม่ ไม่ย้อน Mapping เดิม |
| Student account selection / real linking | ผู้ใช้เลือก Google/Internal account ของตนและอนุมัติ exact Student Mapping write | ต้องรับ fresh Google token+nonce และ internal password; create Mapping FK ไป UUID เดิม; ไม่แก้ Actor/Profile |
| Mapping cleanup/rollback | อนุมัติ exact test Mapping ID + account association และ optional exact Auth Request cleanup | Transaction/row guards และ verify unrelated data; ห้าม bulk delete/restore live |
| Identity policy/privilege/domain change | ต้องอนุมัติแยก; ไม่อยู่ในงานนี้ | ไม่มีการเปลี่ยน Role/Head flags/constraints/Admin bypass/Teacher domains เพื่อให้ทดสอบผ่าน |

คำขอ Readiness นี้ไม่ใช่การอนุมัติรายการข้างต้น และยังไม่ได้ดำเนินการรายการใด

## 16. Next Recommended Action — PARTIAL / WAITING APPROVAL

ให้ผู้ใช้ระบุบัญชี Student ที่ตนเป็นเจ้าของ **ผ่านหน้า App เมื่อได้รับอนุมัติ ไม่ส่งข้อมูลในแชต** หากต้องการพิสูจน์ Profile preservation ให้ใช้บัญชีของตนที่มี Profile อยู่แล้ว ตรวจ reachable Dev network และอนุมัติ isolated restore rehearsal ก่อนพิจารณา scoped real Google Login/Linking E2E พร้อม expected Mapping/Auth Request delta และ targeted recovery plan

ก่อนเริ่ม writes จริงต้อง refresh backup/baseline ให้ทันสถานะล่าสุด Backup ณ วันนี้มีการตรวจ Archive แล้วแต่ Restore Test ยังไม่ผ่าน จึงยังไม่สรุปว่าทุกเงื่อนไข recovery พร้อม

**หยุดที่ Flags false/false, Mapping 0 และ Account selection ยังว่าง รอคำสั่ง/อนุมัติชัดเจนก่อนเปิด Google Login, Account Linking หรือเขียน Identity จริง**
