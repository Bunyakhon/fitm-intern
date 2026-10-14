# FITM-INTERN — Google Workspace Hosted Domain Diagnostic

ทดสอบจริงวันที่ 11 ตุลาคม 2026 เวลา 23:56:52 (Asia/Bangkok) โดยผู้ใช้กด Sign in with Google และเลือกบัญชีนักศึกษาด้วยตนเองใน Microsoft Edge ผล: **PASS สำหรับบัญชีนักศึกษาที่ทดสอบ** และยืนยัน **`hd=email.kmutnb.ac.th`** จาก Google ID Token ที่ Backend Verify แล้ว

| รายการ | ผล |
|---|---|
| Google Internal Audience | PASS — Google ออก Token สำหรับ Client เดิม และ Backend ตรวจ Audience ผ่าน ภายใต้ Audience Internal ที่ผู้ใช้ยืนยันไว้ |
| Google ออก ID Token สำหรับ Client นี้ | PASS |
| Signature / Issuer / Audience | PASS / PASS / PASS |
| `azp` | มีค่าและตรวจผ่าน — ไม่แสดงค่า |
| Expiration / Issued At | PASS / PASS |
| Nonce เทียบ Challenge ปัจจุบัน | PASS — เปรียบเทียบ hash จริงและใช้คำขอครั้งเดียว |
| `email_verified` | `true` |
| Student Email Domain | ผ่าน — ไม่แสดง Email |
| Subject Presence | ผ่าน — ไม่แสดง Google Subject |
| `hd` | **`email.kmutnb.ac.th`** |
| Hosted Domain Readiness | CONFIRMED_FOR_TESTED_STUDENT_ACCOUNT |

หลักฐานจริง: [provider-result.json](evidence/google-oauth-hd-diagnostic/provider-result.json) ผลนี้มาจาก Real Google Provider ไม่ใช่ Mock หรือการ Decode JWT อย่างเดียว ไม่ได้อนุมาน Hosted Domain จาก Email Suffix และไม่ใช่การตรวจ Google Cloud configuration ผ่าน Cloud API; สถานะ Internal อาศัยค่าที่ผู้ใช้ยืนยันร่วมกับ Token ที่ Google ออกและ Audience ที่ Backend ตรวจตรงกับ Client ปัจจุบัน ผลของบัญชีเดียวไม่รับรองทุกบัญชี/ทุกบทบาทหรือ Workspace Domain อื่น

เครื่องมือที่ใช้:

- [Google Diagnostic verifier](../../backend/scripts/googleOAuthDiagnostic.js) เป็น standalone CLI ที่ต้องสั่งเปิดโดยตรง รับเฉพาะ `127.0.0.1:5001` ตรวจ Host/Origin และ CORS เป็น `http://localhost:5173` ไม่มี public listener
- [Development page](../../frontend/oauth-hd-diagnostic.html) ใช้ Google Identity Services แบบ popup และ Client ID เดิม กรอกรหัสผ่านบนหน้าของ Googleโดยผู้ใช้เอง ไม่มีการกรอกรหัสผ่านแทนผู้ใช้
- ใช้ [Backend Google Token Verifier เดิม](../../backend/src/services/googleToken.service.js) โดยไม่แก้ไฟล์นี้ ไม่มีการโหลด Sequelize, Database Models, Application Auth Service หรือสร้าง Application JWT/Session
- Challenge/Nonce/Request secret เป็น random values เก็บ hash ใน memory อายุสองนาทีและ consume ก่อน asynchronous verification ป้องกัน replay/concurrent reuse
- ผลที่บันทึกมีเฉพาะ hd, booleans และ verification statuses ไม่มี Email, Subject, Client ID เต็ม, ID Token, Password หรือ Secret ไม่มี Request Body/HAR หรือ Token ใน Browser Storage
- Diagnostic page ไม่อยู่ใน Vite production entrypoints และ Production Build ตรวจแล้วว่าไม่มี Diagnostic

Security Tests ใช้ RSA Token สังเคราะห์และ local HTTP เท่านั้น: **18 PASS / 0 FAIL** รวม wrong audience/issuer/azp, forged signatures, expiration, nonce mismatch, expired challenge, replay/concurrency, Origin/Host/preflight restrictions, request limits, cancellation และ shutdown กับ active HTTP request ผลนี้แยกจาก Real Provider ที่ผู้ใช้ทดสอบ

หลักฐาน: [security-tests](evidence/google-oauth-hd-diagnostic/security-tests.json), [production-build-check](evidence/google-oauth-hd-diagnostic/production-build-check.json), [development instructions](../../backend/scripts/googleOAuthDiagnostic.README.md)

หลังจบการตรวจ pending Challenge references ถูกล้างและ HTTP Listener ปิด แต่พบ Diagnostic process ยังไม่ออกระหว่าง cleanup จึงปิดเฉพาะ process ที่มี command `googleOAuthDiagnostic.js --start-development-diagnostic` ไม่มี process ของ Application/Docker ถูกปิด ปัจจุบันไม่มี Diagnostic process และไม่มี listener พอร์ต 5001 Source ของเครื่องมือได้รับการปรับให้ปิด active/idle HTTP connections ทั้งหมดตอน shutdown และมี test ยืนยัน ข้อมูล Token ไม่เคยบันทึกและไม่มี retained token reference สำหรับรายงาน; JavaScript string ไม่สามารถรับรองการ zero ทุกสำเนาใน heap ได้ การจบ process เป็นการปล่อย Server memory

หลักฐาน: [cleanup](evidence/google-oauth-hd-diagnostic/cleanup.json)

ตรวจฐานข้อมูลก่อนและหลังด้วย connection/transaction แบบ READ ONLY เท่านั้น: Schema digest, Migration Ledger, Row counts/digests ทุกตารางตรงกัน `google_identities=0` และ `google_auth_requests=0` ไม่มีการสร้าง Mapping หรือ Challenge ใน Database ไม่เรียก Migration/Seeder/Login/Linking/Onboarding และไม่เปลี่ยน Google Cloud Configuration

หลักฐาน: [database before](evidence/google-oauth-hd-diagnostic/database-before.json), [database after](evidence/google-oauth-hd-diagnostic/database-after.json)

Configuration ที่แนะนำสำหรับบัญชีนักศึกษาที่ทดสอบ โดย **ยังไม่ได้แก้ `.env`**:

```dotenv
GOOGLE_HOSTED_DOMAIN_POLICY=required
GOOGLE_ALLOWED_HOSTED_DOMAINS=email.kmutnb.ac.th
```

คง `GOOGLE_ALLOWED_EMAIL_DOMAINS=kmutnb.ac.th,email.kmutnb.ac.th` เดิม Hosted Domain เป็นการตรวจแบบตรงตัวแยกจาก Email Domain ห้ามเพิ่ม `kmutnb.ac.th` เข้า Hosted Allowlist จนกว่าจะได้รับการยืนยันสำหรับบัญชีที่ต้องใช้

Google Login/Linking Flags คง `false/false` ทั้งก่อนและหลัง Hosted Allowlist ยังคงไม่ได้ตั้งค่า ไม่มี Commit/Push หรือการลบ Uncommitted Changes ตรวจ hashes ไฟล์เดิม 759 ไฟล์และ Environment 3 ไฟล์ตรงกับ baseline ทั้งหมด Git Before/After: Tracked Modified 32 → 32, Untracked 327 → 394 เพิ่มเฉพาะ Source/Tests/รายงาน/หลักฐานของงานนี้ 67 ไฟล์ สถานะ Git เดิมทุกไฟล์คงเดิม

หลักฐาน: [Git before](evidence/google-oauth-hd-diagnostic/git-before.txt), [Git after](evidence/google-oauth-hd-diagnostic/git-after.txt), [preservation](evidence/google-oauth-hd-diagnostic/preservation.json)

Remaining Work ที่ต้องรอคำสั่ง:

1. อนุมัติเติม Hosted Allowlist ตาม hd ที่ยืนยันได้ โดยยังคง Policy required
2. อนุมัติเปิด Google Login เฉพาะ Development และทดสอบ Application Login แยกจากการยืนยัน Google Token ครั้งนี้
3. เลือกบัญชีภายในและอนุมัติ Account Linking/Mapping writes แยก หากต้องทดสอบบัญชีที่ยังไม่มี Mapping; ยังไม่มีการสร้างบัญชี Head/Staff
4. ตรวจ Google Account/hd และความพร้อมของ Teacher, Department Head, Department Staff แยก ไม่ขยายผลจากบัญชีนักศึกษานี้
5. หลังอนุมัติ Config จึง Recreate เฉพาะ Backend ที่จำเป็นด้วย --no-deps และคง PostgreSQL Container/Volume เดิม

หยุดที่การยืนยัน Hosted Domain สำเร็จและ Diagnostic ปิดแล้ว รอคำสั่งก่อนแก้ Hosted Allowlist หรือเปิด Google Login/Account Linking จริง
