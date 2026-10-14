# FITM-INTERN — Verified Google Hosted Domain Configuration

วันที่ 14 ตุลาคม 2026 (Asia/Bangkok) — **PASS สำหรับการตั้งค่า Development ที่อนุมัติ; ความพร้อม Application Login/Linking จริงยัง PARTIAL**

ตรวจ Source Code, Git Status, README, HANDOFF และ [Diagnostic ล่าสุด](FITM_GOOGLE_WORKSPACE_HOSTED_DOMAIN_DIAGNOSTIC.md) ก่อนแก้ไข หลักฐาน Diagnostic วันที่ 11 ตุลาคมยืนยัน `hd=email.kmutnb.ac.th` จาก Token จริงที่ Backend ตรวจ signature/issuer/audience/azp/expiration/nonce แล้ว และ `email_verified=true` ข้อความใน README/HANDOFF ที่ยังระบุว่าไม่มี Client ID/026 และ Provider ยังไม่เคยทดสอบเป็นข้อมูลก่อนงาน Diagnostic/Installation ล่าสุด ไม่ได้แก้เอกสารเดิมในงานนี้

แก้ไฟล์ Configuration เดิมเฉพาะ `backend/.env`: เพิ่ม `GOOGLE_ALLOWED_HOSTED_DOMAINS=email.kmutnb.ac.th` ส่วน `GOOGLE_HOSTED_DOMAIN_POLICY=required` มีอยู่แล้วและคงค่าเดิม ตัวแปร Environment เดิมอื่นทั้งหมดคงเดิม รวม Client ID, Database/JWT/SMTP configuration, Email Allowlist, Flags และ Role Overrides ไม่มีการแก้ Source Code, Compose, Frontend Environment, Workflow หรือเมนู

| รายการ | สถานะ | ผลตรวจ |
|---|---|---|
| Hosted Domain Configuration | PASS | Policy `required`, Hosted Allowlist มีเพียง `email.kmutnb.ac.th` |
| Google Feature Flags | PASS | `GOOGLE_LOGIN_ENABLED=false`, `GOOGLE_ACCOUNT_LINKING_ENABLED=false` ทั้งไฟล์และ Backend Container |
| Config Validation | PASS | Full configuration ผ่านใน detached function argument; ไม่มีการเปิด Flags ใน process/ไฟล์/Container |
| Student Email Allowlist | PASS | `kmutnb.ac.th,email.kmutnb.ac.th` คงเดิมและทำงานแบบตรงตัว |
| Token → Hosted Domain Policy | PASS | `googleAuth.service.js` เรียก `checkGoogleIdentity(await verify(...), cfg, role)` หลัง Token Verification |
| Container Environment | PASS | Compose resolve ผ่าน; Backend Environment ทุกตัวจาก `.env` ตรงกับ Container |
| `/health/db` | PASS | HTTP 200, `status:ok` |
| `/api/auth/google/config` | PASS | HTTP 200, `enabled:false` ตาม disabled path ใน Source |
| Migration 026 / Schema / Data | PASS | 026 อยู่ใน Ledger; Schema digest, Ledger และ row counts/digests ทุกตารางตรงก่อน/หลัง |
| Google Identity/Auth Request | PASS — unchanged | `google_identities=0`, `google_auth_requests=0` |
| Regression | PASS | Backend 278 PASS / 24 SKIP; Frontend 368 PASS / 2 SKIP; 0 FAIL |
| Student Development Login readiness | PARTIAL | Config และหลักฐาน Google Provider ของบัญชีที่ตรวจพร้อม; ไม่มี Mapping และ Login/Linking Flags ยังปิด |
| Secure Account Linking readiness | PARTIAL | Implementation เดิมคงอยู่; ownership/nonce/role policy เดิม; ยังไม่อนุมัติเปิดหรือทดสอบ Mapping writes จริง |
| Application Google Login/Linking E2E | NOT TESTED | ไม่เรียก login/challenge/link/onboard ที่เขียน Development Database |
| Teacher Hosted Domain readiness | NOT TESTED | ยังไม่ยืนยัน `hd` ของบัญชีอาจารย์จริง |
| Head / Staff account readiness | BLOCKED | Read-only query ยังไม่พบบัญชีที่ผ่านเงื่อนไขทั้งสองบทบาท |

Backend แยกการตรวจสองขั้น: `googleToken.service.js` ตรวจความถูกต้องทาง Cryptography ของ Token ส่วน `config/oauth.js` ตรวจ Email, email_verified, Role Allowlist และ Hosted Domain แบบ exact membership ไม่ใช้ Hosted Domain เป็นตัวกำหนด Role บัญชีที่ผูกในอนาคตยังต้องผ่าน Policy ปัจจุบันทุกครั้ง

Config test ใช้ค่าปัจจุบันจาก `.env` โดยเปิด validation path เฉพาะใน object จำลองที่ส่งเป็น argument ให้ `getGoogleConfig` เท่านั้น ไม่เปลี่ยน process.env/Container/ไฟล์จริง จากนั้นใช้ Token RSA สังเคราะห์ผ่าน verifier เดิมก่อนตรวจ identity policy ผ่าน 10 กรณี:

- Student email กับ Verified Hosted Domain ผ่าน
- Email Domain อีกค่าที่มีในรายการกลางเดิมยังผ่าน เมื่อ Hosted Domain ตรง
- Case normalization คงเดิม
- Gmail, suffix spoof และ subdomain ที่ไม่ได้ระบุถูกปฏิเสธด้วย `GOOGLE_DOMAIN`
- `hd=kmutnb.ac.th`, missing hd และ hosted suffix spoof ถูกปฏิเสธด้วย `GOOGLE_HOSTED_DOMAIN`
- `email_verified=false` ถูกปฏิเสธด้วย `GOOGLE_IDENTITY`

Role Email Overrides ทั้ง Student/Teacher/Head/Staff ยังไม่ได้ตั้งค่าและใช้รายการกลางเดิม ไม่เพิ่ม Role Policy หรือ Hosted Domain ใหม่ Global Hosted Allowlist ที่อนุมัตินี้ถูกใช้กับทุกบทบาทตาม Source เดิม จึงยังไม่รับรองบัญชี Teacher/Head/Staff ที่มี hd ต่างออกไป และจะไม่เพิ่ม `kmutnb.ac.th` โดยไม่มีหลักฐาน

Recreate **เฉพาะ Backend** เพราะ Container Environment เดิมยังไม่มี Hosted Allowlist ใช้ `docker compose up -d --no-deps --no-build --force-recreate backend` PostgreSQL และ Frontend มี Container ID/StartedAt เดิม ทุก Mount/Volume เดิมคงเดิม ไม่มีการสร้าง Database, Migration, Seeder, Account หรือ Mapping

Regression ใช้ Child Processes กับ Credentials สังเคราะห์, DB/PG host `127.0.0.1`, port `1`, `PGOPTIONS=-c default_transaction_read_only=on` และปิด optional PostgreSQL/browser integration switches จึงไม่ต่อ Development Database ไม่มีการรัน migration บน Database ใดในงานนี้ ผล SKIP เป็นขอบเขตที่ตั้งใจ ไม่ใช่การยืนยัน Live Integration

ตรวจบัญชีแบบ READ ONLY: Student 4, Teacher 1, Head 0, Staff 0 เป็นจำนวนที่ผ่านเงื่อนไขภายในเบื้องต้น ไม่ยืนยันรหัสผ่านหรือบัญชี Google จริง ไม่แสดง Email, Subject, Client ID เต็ม, Credentials หรือ Token

หลักฐาน:

- [Configuration change](evidence/google-hosted-domain-config-20261014/configuration-change.json), [Config validation](evidence/google-hosted-domain-config-20261014/config-validation.json)
- [Before runtime](evidence/google-hosted-domain-config-20261014/runtime-before.json), [After runtime](evidence/google-hosted-domain-config-20261014/runtime-after.json), [Backend refresh](evidence/google-hosted-domain-config-20261014/container-refresh.json)
- [HTTP readiness](evidence/google-hosted-domain-config-20261014/http-readiness.json), [Backend regression](evidence/google-hosted-domain-config-20261014/backend-tests.json), [Frontend regression](evidence/google-hosted-domain-config-20261014/frontend-tests.json), [Regression guard](evidence/google-hosted-domain-config-20261014/regression-guard.json)
- [Git before](evidence/google-hosted-domain-config-20261014/git-before.txt), [Git after](evidence/google-hosted-domain-config-20261014/git-after.txt), [Preservation](evidence/google-hosted-domain-config-20261014/preservation.json)

ความพร้อมต่อไป: รออนุมัติเปิด Google Login เฉพาะ Development; การทดสอบครั้งแรกไม่มี Mapping จึงต้องเลือกบัญชีภายในและอนุมัติ Secure Linking/Database writes แยกก่อน ภายใต้นโยบาย ownership เดิม Teacher/Head/Staff ต้องมีบัญชีที่เหมาะสมและหลักฐาน hd ของตนเองก่อนขยาย Allowlist Google-only Student onboarding ยังคงปิดและไม่ได้อยู่ในงานนี้

Git Before/After: Tracked Modified 32 → 32, Untracked 395 → 409 เพิ่มเฉพาะรายงาน/หลักฐานใหม่ 14 ไฟล์ ตรวจ hashes ของไฟล์เดิม 827 ไฟล์ตรงกันทั้งหมด Root/Frontend Environment คงเดิม Backend Environment เปลี่ยนเฉพาะ Hosted Allowlist ที่อนุมัติ ไฟล์ `.env` ยังถูก Git ignore

หยุดที่ Flags `false/false` ไม่มี FAIL ในผลตรวจสุดท้าย ไม่ Commit/Push ไม่ลบ Uncommitted Changes และไม่เปลี่ยนข้อมูล PostgreSQL
