# ผลติดตั้ง Google OAuth Migration 026 บน Development

วันที่ 11 ตุลาคม 2026 (Asia/Bangkok) — **PASS เฉพาะการติดตั้ง Schema Migration 026** บน `intern_system.public` ตามการอนุมัติแบบมีเงื่อนไข ไม่พบข้อผิดพลาดระหว่าง backup, restore, installation และ verification

รายงานนี้บันทึกผลการติดตั้งจริงต่อจาก [Installation Readiness](FITM_GOOGLE_OAUTH_026_INSTALLATION_READINESS.md) ซึ่งเป็นหลักฐานก่อนติดตั้ง สถานะ Development ที่ระบุว่ายังไม่ติดตั้งในรายงานเดิมจึงเป็นข้อมูล ณ เวลานั้น

## 1. Preflight Results — PASS

- ตรวจ Source Code, Git Status, [Implementation Report](FITM_GOOGLE_OAUTH_ALL_ROLES_IMPLEMENTATION.md), readiness report, migration, models, installer, backup tool และ Umzug discovery ล่าสุดก่อนทำงาน
- SHA-256 ของ `026_google_identity_mapping.js` ตรงกับที่อนุมัติ: `f5dd964e3a2f6757fc0a879a058d015f50535d20efb1ef82153a35e806368061` และ source hashes ทั้ง 12 ไฟล์ตรงกับ readiness certificate ทั้งก่อนติดตั้งและหลัง regression ไม่มีการแก้ Migration 026 หรือ implementation code ในงานนี้
- Read-only preflight ตรงกับ readiness baseline ทุกจุด: ledger 23 รายการ, ตารางข้อมูลเดิม 32 ตาราง (ไม่นับ ledger), Google tables ยังไม่มี, schema และ row counts/digests เดิมตรงกัน
- Target: PostgreSQL 16.15, database `intern_system`, schema `public`, database OID `16384`, cluster system identifier `7679779443735437346`, server `172.18.0.6:5432`, owner/user `postgres`
- Target SHA-256: `027cea2ec9b9c25535d6b2d7790ea886c5e073097fbedc0828507611f9c4bd7d`
- Existing schema SHA-256: `cc8aaf629d2efe68e273dc3da7cc88e3366f1618abcd4f76ee2e38c74ab2b85d`
- Feature flags ปิดทั้ง source configuration และ runtime: Google login disabled, login/linking flags unset-disabled
- ตรวจ PostgreSQL activity ไม่พบ transaction ที่ทำงานหรือ strong schema/advisory locks จาก session อื่น ตรวจ process ไม่พบ Node migration runner อื่น พัก backend เดิมระหว่าง backup และ installation แล้วตรวจซ้ำก่อนติดตั้ง Installer ใช้ advisory lock, ledger lock และ locks ตารางเดิมภายใน transaction เพื่อกันงานชนกัน

หลักฐาน: [preflight](evidence/google-oauth-026-development/preflight.json), [baseline comparison](evidence/google-oauth-026-development/baseline-comparison.json), [activity](evidence/google-oauth-026-development/activity-before.json), [process check](evidence/google-oauth-026-development/process-check.json), [immediate guard](evidence/google-oauth-026-development/immediate-preinstall-guard.json)

## 2. Backup/Restore Evidence — PASS

ทำ backup ของ Development จริงด้วย `pg_dump` custom archive ก่อนติดตั้ง แล้ว restore archive เดียวกันบน PostgreSQL cluster แยก ผ่าน backup CLI ที่ตรวจ source hash และ database target ชัดเจน

- Backup เก็บนอก repository: `C:\Users\suran\.codex\backups\fitm-intern\google-oauth-026\development-20261011T135810Z-8bb878de\026-6ea1a38c427a4eb5.dump`
- ขนาด 135,941 bytes อ่านได้ มี header `PGDMP` และตรวจ SHA-256 ซ้ำหลังเขียน
- Archive SHA-256: `a08abe2d5a5014bf31f0a885f3307c87a2040010e3df0bb34b25d2d89a7198f1`
- Manifest: archive path ต่อท้าย `.manifest.json`; SHA-256 `80ebebb84f443ff5aedeb17ede1bb971143f273e476f3886d03c8eccb7105121`
- Disposable restore database: `fitm_026_restore_dfd4007767ffec4b`, cluster identifier `7695409298819301417` ต่างจาก Development ตรวจชื่อ/label/environment ก่อนสร้างและ cleanup
- หลัง restore: ledger 23 รายการตรงกัน, ทั้ง 32 ตารางมี row counts/digests ตรงกัน, catalog/ownership/ACL/indexes/foreign keys/functions/enums/sequences และ constraints เดิม 169 รายการตรวจผ่าน
- CHECK comparison ใช้ catalog ร่วมกับ server-reparsed expressions บน disposable cluster เพื่อยืนยันความหมายเมื่อ PostgreSQL แสดง expression ต่างรูปหลัง restore ค่า schema hash จึงต่างได้ (`3b2c7225316fcc9274374d94ad56cfd60ad06a5292f2d5df90c2f9d2ac98afa8`) โดยไม่ได้ข้ามการตรวจ CHECK
- Windows ACL ของ private directory ปิด inheritance และอนุญาตเฉพาะผู้ใช้ปัจจุบันกับ SYSTEM ตรวจ ACL ของ archive/manifest ซ้ำแล้ว ไม่มี dump, credentials หรือข้อมูลบุคคลแบบ plaintext ถูกใส่ repository
- Disposable restore container และ anonymous volume ถูก cleanup หลังตรวจผ่าน ไม่ restore ทับ Development

หลักฐาน: [backup evidence](evidence/google-oauth-026-development/backup-evidence.json), [backup ACL](evidence/google-oauth-026-development/backup-acl.json), [cleanup](evidence/google-oauth-026-development/cleanup.json)

## 3. Migration Installation Results — PASS

เรียก tested installer **ครั้งเดียว** เฉพาะ `026_google_identity_mapping.js` ผ่าน Umzug explicit migration name โดย DDL และ ledger อยู่ใน transaction เดียวกัน ไม่เรียก migrate-all และไม่เรียก migration อื่น

คำสั่งที่ดำเนินการแล้วจาก directory `backend` (บันทึกเพื่อ audit; **ไม่ต้องรันซ้ำ**):

```powershell
node scripts/installGoogleOAuth026.js install `
  --database intern_system `
  --source-sha256 f5dd964e3a2f6757fc0a879a058d015f50535d20efb1ef82153a35e806368061 `
  --target-sha256 027cea2ec9b9c25535d6b2d7790ea886c5e073097fbedc0828507611f9c4bd7d `
  --manifest 'C:\Users\suran\.codex\backups\fitm-intern\google-oauth-026\development-20261011T135810Z-8bb878de\026-6ea1a38c427a4eb5.dump.manifest.json' `
  --manifest-sha256 80ebebb84f443ff5aedeb17ede1bb971143f273e476f3886d03c8eccb7105121 `
  --approval migrate026:027cea2ec9b9c25535d6b2d7790ea886c5e073097fbedc0828507611f9c4bd7d
```

Installer คืนสถานะ `INSTALLED`; ตรวจซ้ำด้วย readonly connection ใหม่และ ordinary migration status แล้ว Backend container เดิมกลับสู่ running/unpaused เวลา 21:02:52 น. หลังพักตั้งแต่ 20:56:42 น. ไม่ restart หรือเปลี่ยน flags

หลักฐาน: [installation](evidence/google-oauth-026-development/installation.json), [status](evidence/google-oauth-026-development/status-after.txt), [backend restored](evidence/google-oauth-026-development/maintenance-after.json)

## 4. Schema และ Ledger Verification — PASS

| รายการ | ผลตรวจจริง |
| --- | --- |
| Ledger | 23 → 24 เพิ่มเฉพาะ `026_google_identity_mapping.js`; Executed |
| 019–021 | ทั้งสามยัง Pending ไม่มี entry ถูกเพิ่ม และไม่มี schema ของ migrations เหล่านี้ถูกติดตั้ง |
| ตารางเดิม | ทั้ง 32 ตารางยังอยู่ครบ schema เดิมไม่เปลี่ยน |
| ตารางใหม่ | `public.google_identities`, `public.google_auth_requests`, owner `postgres` |
| Primary keys | UUID `id` ทั้งสองตาราง |
| Foreign keys | 3 รายการ: identity → students / teachers / department_staffs; update/delete CASCADE ตาม schema ที่อนุมัติ |
| CHECK | 2 รายการ: subject ไม่ว่าง และเลือก actor/owner FK ตรงชนิดได้เพียงหนึ่งประเภท |
| Unique indexes | subject unique + partial unique student_id / teacher_id / staff_id รวม 4 รายการนอก PK |
| Indexes รวม | 7 รายการ รวม 2 PK และ request expiry index |
| รายละเอียด schema | types/nullability/defaults/collations, constraint validity/actions, index readiness/predicates, ownership/ACL/RLS ตรงกับ installer validator |

`google_identities` มี `id`, `subject`, `actor_type`, `student_id`, `teacher_id`, `staff_id`, `created_at`, `updated_at` ส่วน `google_auth_requests` มี `id`, `secret_hash`, `nonce_hash`, `role`, `purpose`, `expires_at`, `consumed_at` ไม่มีการเปลี่ยนโครงสร้างบัญชีหรือ Student Profile เดิม Head ใช้ Teacher identity ตาม implementation เดิม

ตรวจ catalog บน Development โดยไม่ทดลอง INSERT เพื่อทดสอบ violation กับข้อมูลจริง พฤติกรรม constraints/duplicate/concurrency/recovery มี disposable evidence จาก readiness เดิมที่ตรวจ source hashes แล้ว การติดตั้งครั้งนี้ไม่เกิด failure จึงไม่ได้เรียก recovery บน Development

หลักฐาน: [schema verification](evidence/google-oauth-026-development/verification.json), [postflight](evidence/google-oauth-026-development/postflight.json), [final postflight](evidence/google-oauth-026-development/final-postflight.json), [readiness certificate](evidence/google-oauth-026/readiness.json)

## 5. Data Integrity Checks — PASS

เปรียบเทียบ row counts และ whole-row digests ของตารางเดิมทั้งหมด 32 ตารางก่อนติดตั้ง หลัง commit และหลัง regression ตรงกันทุกตาราง รวม students, teachers (รวมบัญชี Head), department_staffs, student_profiles, student_files และตาราง relationships ทุกชุด ตาราง Staff เดิมไม่มีข้อมูล จึงยืนยันการคงสภาพว่างและ schema เดิม ไม่อ้างว่าทดสอบบัญชี Staff จริง

Existing schema, functions, enums และ sequence state เท่าเดิม ตรวจ FK และ relationships จาก catalog ครบ ไม่พบ schema/data drift ทั้งสอง Google tables ยังว่าง (0 rows) ไม่มี Google account creation/linking และ runtime flags ยังปิด

หลักฐาน: [final integrity](evidence/google-oauth-026-development/final-integrity.json), [final runtime check](evidence/google-oauth-026-development/final-runtime-check.json)

## 6. Regression Test Results — PASS สำหรับชุดที่รัน

รัน `npm.cmd test` ใน child process โดยชี้ DB_HOST/PGHOST ไป `127.0.0.1`, DB_PORT/PGPORT ไป `1`, database ชื่อ `fitm_026_regression_no_database`, credentials สังเคราะห์ และ `PGOPTIONS=-c default_transaction_read_only=on` ปิด optional integration switches ใน process นี้ ไม่แก้ `.env` หรือ Development flags

ผลจริง: **289 tests, pass 265, fail 0, cancelled 0, skipped 24, todo 0, exit code 0** Tests ที่ skipped ต้องใช้ optional disposable SQL/browser environment จึงระบุว่า **NOT TESTED ในการรันครั้งนี้** ไม่อ้างว่าผ่าน การทดสอบชุดนี้ไม่เชื่อมต่อ Development และ readonly final verification หลังทดสอบตรงกับ post-installation ทุกจุด

หลักฐาน: [regression environment](evidence/google-oauth-026-development/regression-environment.json), [test log](evidence/google-oauth-026-development/regression-tests.txt), [parsed results](evidence/google-oauth-026-development/final-integrity.json)

## 7. Git Status Before/After — PASS

| Git status | Entries | Tracked changes | Untracked |
| --- | --- | --- | --- |
| Before | 293 | 32 | 261 |
| After | 322 | 32 | 290 |

ตรวจ SHA-256 ของไฟล์ที่มีอยู่ก่อนงานนี้ทั้งหมด 695 ไฟล์ รวมงาน tracked/untracked, `backend/.env` และ `.codex/config.toml`: ไม่มีไฟล์เดิมเปลี่ยนหรือลบ Git status ของทุก entry เดิมคงอยู่ครบ ไม่มี Commit/Push/Reset/Clean/Stash

ไฟล์เพิ่มในงานนี้มีเฉพาะรายงานฉบับนี้และหลักฐานใน `docs/audits/evidence/google-oauth-026-development/` ไม่มีการแก้ implementation, Migration 019–021/026, Sequelize models, routes, Student Profile หรือ workflow และไม่มี backup archive ใน repository

หลักฐาน: [git before](evidence/google-oauth-026-development/git-before.txt), [git after](evidence/google-oauth-026-development/git-after.txt), [file/status preservation](evidence/google-oauth-026-development/git-preservation.json)

## 8. สถานะรวมและข้อจำกัด

**PASS — เงื่อนไขติดตั้ง Schema Migration 026 บน Development ผ่านครบ** Preflight, real backup/isolated restore, 026-only installation, schema/ledger verification, data preservation, safe regression และ Git preservation มีหลักฐานจริง

ไม่มี FAIL หรือ BLOCKED ระหว่างดำเนินงาน ไม่เกิด retry หรือ restore ทับ Development การซ้อม recovery จาก readiness เดิมเป็นผล disposable ไม่ใช่ failure ที่เกิดจริงครั้งนี้ Backup เก็บไว้ภายนอก repository พร้อม ACL จำกัด แต่เป็น snapshot ก่อนติดตั้งและไม่รวม PostgreSQL cluster globals หรือไฟล์ upload ภายนอก DB การนำไป restore Development ในอนาคตต้องได้รับอนุมัติแยกและประเมินข้อมูลที่เกิดหลัง backup ก่อน

ข้อจำกัดของ concurrency check: เป็นการตรวจ activity/process ณ เวลานั้นร่วมกับพัก backend และ transaction locks ของ installer ไม่ใช่การปิดสิทธิ์ผู้ดูแลฐานข้อมูลภายนอกทั้งหมด ไม่พบ drift หลัง commit หรือหลัง regression

## 9. Remaining Google OAuth Work — รอคำสั่งแยก

- ยังไม่เปิด Google OAuth/login/linking feature flags และยังไม่สร้าง/ผูกบัญชีจริง
- Account Linking Policy และ New Student Onboarding Policy คงเดิม ไม่ได้รับการเปลี่ยนหรืออนุมัติใช้งานจากการติดตั้ง schema ครั้งนี้
- การยืนยัน Google provider จริง, role flows และ UI end-to-end ใน runtime ที่เปิด OAuth เป็น **NOT TESTED ในงานติดตั้งครั้งนี้** ต้องเตรียมและอนุมัติแยกก่อนเปิดบริการ
- 019–021 ยังคง Pending ฟังก์ชันที่ต้องพึ่ง schema ของ migrations เหล่านั้นยังต้องดำเนินการตามการอนุมัติของงานนั้น ไม่จำเป็นต่อการติดตั้ง 026 และไม่ได้ติดตั้งในงานนี้

จบการดำเนินการเฉพาะ scope ที่อนุมัติ หยุดรอคำสั่งถัดไป
