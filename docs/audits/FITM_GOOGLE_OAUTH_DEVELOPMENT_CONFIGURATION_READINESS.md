# FITM-INTERN — Development Configuration & Google Login Readiness

ตรวจวันที่ 11 ตุลาคม 2026 (Asia/Bangkok) จาก Source Code และ Development runtime จริง ผลรวม: **Database Connection PASS / Docker Environment PASS / Google Provider E2E ยังไม่พร้อมและยังไม่ได้ทดสอบ** งานที่อนุญาตเสร็จแล้วและหยุดก่อนเปิด Google Feature Flags

| รายการ | ผล | หลักฐาน / ข้อจำกัด |
|---|---|---|
| Database Connection | PASS | Backend Container เชื่อม `postgres:5432/intern_system` ด้วย Username/Password เดิม; `GET /health/db` ตอบ 200 และ `status:ok` |
| Docker Environment | PASS | Root `.env` ได้รับ `POSTGRES_PASSWORD` เดิมที่ยืนยันแล้ว; Compose resolve สำเร็จโดยไม่มี password-unset warning |
| Google Client Configuration | PASS เฉพาะ local config | Client ID มีค่า รูปแบบถูกต้อง และ Backend/Frontend ตรงกัน; ไม่ได้ยืนยัน ownership หรือ Client settings ใน Google Cloud |
| Google Hosted Domain Readiness | BLOCKED | Policy เป็น `required`; `GOOGLE_ALLOWED_HOSTED_DOMAINS` ยังไม่มีค่า และยังไม่มีหลักฐานยืนยัน `hd` จริง |
| Secure Linking Readiness | IMPLEMENTED / DISABLED | Source Code มีการยืนยันบัญชีเดิมและตรวจ role/identity; Flag ปิดและยังไม่มี Mapping; ไม่ได้ทดสอบ Linking กับข้อมูลจริง |
| Migration 026 | PASS — INSTALLED | พบ `026_google_identity_mapping.js` ใน `public.sequelize_meta` และตาราง Google OAuth ทั้งสองตาราง |
| Regression / Build | PASS | Backend 265 pass / 24 skipped; Frontend 368 pass / 2 skipped; ไม่มี fail; Build ผ่าน |
| Browser Acceptance | PASS ตามขอบเขต | Mock Google 9 กรณี; Live Development ที่ Google ปิด 8 กรณี; Google Provider E2E จริง NOT TESTED |
| Preservation | PASS | PostgreSQL Container, Mounts, Schema digest, Migration Ledger, Row counts/digests ทุกตาราง และไฟล์เดิมคงเดิม |

สิ่งที่ดำเนินการกับ Environment มีเฉพาะ:

- ยืนยัน `database.js` ใช้ `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- ก่อน Recreate พบ `backend/.env` ใช้ `DB_HOST=postgres` แล้ว แต่ Container เดิมยังใช้ `localhost` จึงใช้ค่าปัจจุบันจากไฟล์และ Recreate Backend เพื่อรับค่า
- เติม Root `.env` ที่ยังไม่มีอยู่ ด้วย `POSTGRES_PASSWORD` เดิมจาก Backend หลังตรวจว่าตรงกับ PostgreSQL Container และยืนยัน password authentication จาก Backend ไปยัง `postgres` สำเร็จ รหัสผ่านไม่ได้ถูกแสดงใน stdout หรือหลักฐาน
- เพิ่ม `GOOGLE_HOSTED_DOMAIN_POLICY=required` ให้ชัดเจน โดยคง Policy เดิมที่โค้ดใช้เป็นค่าเริ่มต้น ไม่เปลี่ยนเป็น `email_only` และไม่เติม Hosted Domains ที่ยังยืนยันไม่ได้
- ตรวจว่า Environment Variables เดิมใน Backend คงเดิมก่อนเขียนไฟล์ ยกเว้น `DB_HOST` ที่อนุญาตให้แก้; Database Name/Username/Password, Google Client ID, JWT Secret และ Feature Flags ไม่ถูกเปลี่ยน
- ใช้ `docker compose up -d --no-deps --no-build --force-recreate backend` เฉพาะ Backend; Frontend ไม่ต้อง Recreate เพราะค่าที่ Container ใช้อยู่ตรงกับไฟล์แล้ว; PostgreSQL ไม่ถูก Restart/Recreate และ Volume ไม่ถูกเปลี่ยน
- Root `.env`, `backend/.env`, `frontend/.env` ถูก Git ignore

หลักฐาน: [configuration-change](evidence/google-oauth-development-config/configuration-change.json), [runtime before](evidence/google-oauth-development-config/runtime-before.json), [runtime after](evidence/google-oauth-development-config/runtime-after.json), [Docker Environment](evidence/google-oauth-development-config/docker-environment.json), [HTTP readiness](evidence/google-oauth-development-config/http-readiness.json)

| Google / Application Config | สถานะสุดท้าย |
|---|---|
| Backend `GOOGLE_CLIENT_ID` | SET — ปิดบังค่า; รูปแบบถูกต้อง |
| Frontend `VITE_GOOGLE_CLIENT_ID` | SET — ปิดบังค่า; ตรงกับ Backend แต่ Source Code ไม่ใช้ตัวแปรนี้ |
| Frontend GIS `client_id` | รับจาก Backend `GET /api/auth/google/config` เมื่อบริการเปิดใช้งาน |
| `GOOGLE_ALLOWED_EMAIL_DOMAINS` | `kmutnb.ac.th,email.kmutnb.ac.th` — ตรวจโดเมนแบบตรงตัว |
| `GOOGLE_ALLOWED_EMAIL_DOMAINS_STUDENT` | ไม่ตั้งค่า; ใช้รายการกลาง |
| `GOOGLE_ALLOWED_EMAIL_DOMAINS_TEACHER` | ไม่ตั้งค่า; ใช้รายการกลาง |
| `GOOGLE_ALLOWED_EMAIL_DOMAINS_DEPARTMENT_HEAD` | ไม่ตั้งค่า; ใช้รายการกลาง |
| `GOOGLE_ALLOWED_EMAIL_DOMAINS_DEPARTMENT_STAFF` | ไม่ตั้งค่า; ใช้รายการกลาง |
| `GOOGLE_HOSTED_DOMAIN_POLICY` | `required` — คงนโยบายเดิม |
| `GOOGLE_ALLOWED_HOSTED_DOMAINS` | ABSENT / UNCONFIRMED — ยังไม่เติม |
| `GOOGLE_LOGIN_ENABLED` | `false` ทั้งไฟล์, Compose และ Container |
| `GOOGLE_ACCOUNT_LINKING_ENABLED` | `false` ทั้งไฟล์, Compose และ Container |
| `onboardingEnabled` | `false` ตามโค้ด ไม่มี Environment Flag สำหรับเปิด |
| `FRONTEND_URL` | `http://localhost:5173` |
| `VITE_API_URL` | `http://localhost:5000` — Browser บนเครื่อง Development |
| Backend CORS / Google request Origin | ตรงกับ `http://localhost:5173`; GET ตรวจพบ Allow-Origin และ Allow-Credentials ถูกต้อง |
| Google Config Endpoint | HTTP 200, `enabled:false`; ไม่มี Client ID/Token ถูกบันทึกจาก response |
| Google Cloud Project / Client Type | ผู้ใช้ระบุ `FITM-INTERN-DEV`; ยังไม่ได้ตรวจ Client Type/ownership ใน Cloud Console |
| Authorized JavaScript Origins | ยังยืนยันค่าจริงใน Cloud Console ไม่ได้; ต้องตรวจให้ตรงกับ Frontend URL |
| Audience / Test users / Workspace policy | ยังไม่ได้ตรวจค่าจริงใน Cloud Console |

Frontend ใช้ Google Identity Services แบบ `ux_mode:popup` และ JavaScript callback โค้ดนี้ไม่มี OAuth authorization-code exchange ที่ต้องใช้ `GOOGLE_CLIENT_SECRET` หรือ Backend callback redirect URL

สำหรับ Local Development ต้องตรวจ Authorized JavaScript Origins ให้มี `http://localhost` และ `http://localhost:5173` ตาม [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) การตั้ง Email Allowlist ใน Application เป็นคนละรายการกับ Authorized Domains/Origins ใน Google Cloud; ยังไม่ได้อ้างว่าค่าใน Cloud Console ผ่านแล้ว

ค่า `hd` ต้องได้รับการยืนยันจาก Workspace administrator หรือ Google ID token ที่ตรวจสอบ signature/issuer/audience แล้ว โดยรายงานเฉพาะ Domain ไม่รับหรือบันทึก Token ในหลักฐาน ค่า `hd` อาจต่างจาก Email Domain และห้ามอนุมานจาก Email Suffix ตาม [Google ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) ขณะนี้ยังไม่มีหลักฐานยืนยัน จึงไม่เติม `kmutnb.ac.th` หรือ `email.kmutnb.ac.th` ลง Hosted Allowlist โดยอัตโนมัติ

ถ้าเปิด `GOOGLE_LOGIN_ENABLED` ขณะ Hosted Allowlist ยังขาด การตรวจ Config จะหยุดด้วย `GOOGLE_CONFIGURATION` ตามโค้ด เป็นข้อจำกัดที่ยังต้องแก้ก่อนขอเปิดบริการ

ตรวจ Migration/Mapping/Account ด้วย PostgreSQL transaction แบบ `REPEATABLE READ READ ONLY` และ connection ที่กำหนด `default_transaction_read_only=on` ไม่เรียก migration runner, seeders, login, challenge, linking หรือ onboarding กับ Development Database

| บทบาท | บัญชีภายในที่ผ่านเงื่อนไขเบื้องต้น | Google Mapping / สถานะทดสอบจริง |
|---|---:|---|
| Student | 4 | ยังไม่มี Mapping; ต้องเลือกบัญชีจริงและยืนยัน Workspace/Ownership ก่อน Linking |
| Teacher | 1 | ยังไม่มี Mapping; ต้องเลือกบัญชีจริงและยืนยัน Workspace/Ownership ก่อน Linking |
| Department Head | 0 | BLOCKED — ไม่มีบัญชี active พร้อมสิทธิ์ Head, Department และ Password Hash ตามเงื่อนไขโค้ด |
| Department Staff | 0 | BLOCKED — ไม่มีบัญชี active พร้อม Password Hash ตามเงื่อนไขโค้ด |

จำนวนข้างต้นเป็นเพียงบัญชีภายในที่เข้าเงื่อนไข status/role/password-hash ไม่ยืนยันว่ารหัสผ่านใช้งานได้จริงหรือบัญชี Google อยู่ภายใต้ Workspace ที่อนุญาต ไม่ได้แสดงอีเมล ชื่อบุคคล Password Hash หรือ Token และไม่ได้สร้าง/แก้บัญชีใด

`google_identities` มี 0 แถว และ `google_auth_requests` มี 0 แถว ก่อนและหลังงาน การเปิด Login อย่างเดียวจึงยังไม่ทำให้ผู้ใช้ที่ไม่มี Mapping เข้าระบบด้วย Google ได้

Secure Linking จาก Source Code รองรับทั้ง 4 บทบาท: ต้องยืนยัน Email/Password บัญชีภายในเดิม, ไม่มี Auto-link ด้วย Email, ใช้ nonce และ request secret ที่เก็บเป็น hash, ผูก role/purpose, จำกัดอายุและใช้ request ครั้งเดียว, ตรวจ Account Status/Head privilege, ตรวจ Collision และทำการเปลี่ยน Mapping ใน transaction โดย Head ใช้ Teacher identity ตรวจ Policy ซ้ำตามบทบาทจริง นโยบายนี้ไม่ได้รับการเปลี่ยนแปลงในงานนี้

Application JWT, RBAC, Remember Me และ Email/Password Login เดิมไม่ได้รับการแก้ไข Regression ครอบคลุมการเก็บ Application Session, Role/Identity mismatch, Redirect validation, Remember Me, Disabled Google ที่รักษา Password Form และ Explicit Linking UI ใน mock fixtures การยืนยัน Login/Linking ด้วยบัญชีจริงยังไม่ได้ทำ

| Verification | ผล | ขอบเขต |
|---|---|---|
| Backend `node --test --test-reporter=tap` | 289 tests: 265 PASS, 24 SKIP, 0 FAIL | Unit/mock regression; optional integration ปิด |
| Frontend `node --test --test-reporter=tap` | 370 tests: 368 PASS, 2 SKIP, 0 FAIL | Unit/mock regression |
| Frontend Vite production build | PASS | Output ใน audit build directory ใหม่; ไม่เขียนทับ `frontend/dist` เดิม |
| Headless Edge Mock Google | 9 PASS | 4 บทบาท × Desktop 1440/Mobile 390 และ Disabled Google; Provider/API/Destination สังเคราะห์; ตรวจ Redirect/Session/Remember Me |
| Headless Edge Live Development | 8 PASS | 4 บทบาท × Desktop/Mobile; Flags ปิด; Password Form ใช้งานได้, แสดง Disabled Google, ไม่มี Horizontal Overflow |
| Google Provider E2E จริง | NOT TESTED / WAITING APPROVAL | ไม่มี Provider Login, Linking, Token exchange หรือ Account Creation จริง |
| PostgreSQL integration / concurrency tests | SKIPPED ในงานนี้ | หลีกเลี่ยง migration/schema/data writes; ไม่อ้างผลเก่าว่าเป็นการรันครั้งนี้ |

Regression ใช้ Credentials สังเคราะห์ใน child processes, `DB_HOST/PGHOST=127.0.0.1`, `DB_PORT/PGPORT=1`, Database name สำหรับป้องกันการต่อ Development, `PGOPTIONS=-c default_transaction_read_only=on` และปิด optional integration switches ไม่มีการสร้าง Database ดังกล่าว Build ใช้ Browser Config สังเคราะห์สำหรับค่าที่อาจปรากฏใน artifact เพื่อไม่บันทึก Client ID จริง

Live Browser อนุญาตเฉพาะ GET/HEAD/OPTIONS ไป localhost และบล็อก External Provider/คำขอเปลี่ยนข้อมูล ตรวจพบ 0 Mutating Requests และ 0 Google Provider Requests Screenshots ไม่มีข้อมูลบัญชีจริง

หลักฐาน: [Backend tests](evidence/google-oauth-development-config/backend-tests.json), [Frontend tests](evidence/google-oauth-development-config/frontend-tests.json), [Build](evidence/google-oauth-development-config/frontend-build.json), [Regression guard](evidence/google-oauth-development-config/regression-guard.json), [Mock browser](evidence/google-oauth-development-config/browser-mock/browser-results.json), [Live disabled browser](evidence/google-oauth-development-config/browser-live-disabled/browser-results.json)

Git Before/After: ก่อนงานมี Tracked Modified 32 ไฟล์ และ Untracked เดิม 290 ไฟล์ เมื่อไม่นับรายงาน/หลักฐานใหม่ของงานนี้ สถานะเดิมยังตรงกัน และ SHA-256 ของไฟล์เดิม 722 ไฟล์ตรงกันทั้งหมด ไม่มีไฟล์เดิมเปลี่ยนหรือหายไป ไฟล์ Environment ที่ Git ignore ได้รับการแก้เฉพาะตามรายการด้านบน ไม่มี Commit/Push, Reset, Clean หรือการลบ Uncommitted Changes

หลักฐาน: [Git before](evidence/google-oauth-development-config/git-before.txt), [Git after](evidence/google-oauth-development-config/git-after.txt), [Git preservation](evidence/google-oauth-development-config/git-preservation.json)

สิ่งที่ต้องได้รับการยืนยัน/อนุมัติก่อน Google Provider E2E จริง:

1. ยืนยัน `hd` ที่ต้องอนุญาตจาก Workspace จริง แล้วอนุมัติค่าที่จะใส่ใน `GOOGLE_ALLOWED_HOSTED_DOMAINS`
2. ยืนยัน Web Client, Authorized JavaScript Origins และ Audience/Test-user/Workspace access ใน Google Cloud `FITM-INTERN-DEV`
3. เลือกบัญชีทดสอบ Student/Teacher และเตรียมบัญชี Head/Staff ผ่านผู้มีสิทธิ์ โดยยังไม่อนุมัติให้สร้างหรือแก้บัญชีจากงานนี้
4. อนุมัติเปิด `GOOGLE_LOGIN_ENABLED` และแยกอนุมัติ `GOOGLE_ACCOUNT_LINKING_ENABLED` หากจะทดสอบการผูกบัญชีแรก รวมถึงอนุมัติ Google Provider E2E ที่สร้าง/ใช้ Auth Request และ Identity Mapping จริงตามนโยบายเดิม

งานนี้ไม่ได้เปิด Student Calendar, ไม่แก้ Workflow อื่น, ไม่รัน Migration, ไม่เปลี่ยน Database Schema/Data และหยุดที่ Flags `false/false` หลัง Database Connection ผ่าน
