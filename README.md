# CWIE-IT CoopConnect (FITM-INTERN)

แพลตฟอร์มจัดการสหกิจศึกษา สำหรับ Student (`co_op`), Teacher/Class Advisor, Department Head, Department Staff, Company และ Mentor. ใช้ Frontend แบบ multipage, Backend API, PostgreSQL และ NLP/PDF/OCR service; Developer Console เป็นเครื่องมือ Local แยกจากเว็บไซต์หลัก.

Branding ปัจจุบัน (14 พฤศจิกายน 2026): Header ใช้ **CWIE-IT CoopConnect** และคำอธิบาย **ระบบจัดการสหกิจศึกษา** สองบรรทัด พร้อมโลโก้เดิม `/images/logo_kiwi.png`; ลิงก์แบรนด์กลับ `/index.html` และ Browser Title ใช้ `ชื่อหน้า | CWIE-IT CoopConnect`. เปลี่ยนเฉพาะ Branding; เนื้อหา Privacy/Terms ยังรอเจ้าของเอกสารทบทวนชื่อเดิม. **Tests: NOT RUN — USER-OWNED TESTING; PENDING USER VERIFICATION.** รายการไฟล์และ Manual Acceptance สำหรับงานนี้อยู่ใน [Current Handoff](HANDOFF_fitm-intern.md).

## Local Student Data Maintenance — 22 พฤศจิกายน 2026

เครื่องมือ One-shot `backend/scripts/studentDataCleanup.cjs` ใช้ Models/Primary Keys และ Foreign Keys ของฐานจริงสร้างลำดับลบ Student-owned Records โดยไม่ใช้ Email เป็นเกณฑ์. ไม่ถูกเรียกตอน Startup และไม่สร้าง Backup/Dump/Snapshot/Export. ทุกครั้งต้องตรวจ Docker Context ว่าเป็น Local Docker Desktop และ Compose Labels/Bind Mount/Network ว่าตรง Workspace นี้ก่อน; Script ไม่สามารถพิสูจน์ Docker Host Context จากภายใน Container แทนผู้ดำเนินการได้.

Windows CMD หลังตรวจ Project/Target ตามข้างต้นแล้ว (IP ด้านล่างเป็นค่าที่ตรวจจริงวันที่ 22 พฤศจิกายน 2026 ต้องตรวจใหม่เมื่อ Container เปลี่ยน):

```cmd
docker context inspect --format "{{.Endpoints.docker.Host}}"
docker inspect --format "{{json .Config.Labels}}" intern_backend intern_postgres
docker inspect --format "{{json .NetworkSettings.Networks}}" intern_backend intern_postgres
docker inspect --format "{{json .Mounts}}" intern_backend intern_postgres
set "FITM_CLEANUP_SERVER=172.18.0.5"
docker exec intern_backend node scripts/studentDataCleanup.cjs --dry-run --expect-server=%FITM_CLEANUP_SERVER%
```

Execute เป็นคำสั่งแยกที่ต้องระบุ No-backup Confirmation ชัดเจน และตรวจ Actual Environment/Schema/Dependencies ใหม่ภายใน Transaction ที่ Lock Tables ก่อนลบ:

```cmd
docker exec intern_backend node scripts/studentDataCleanup.cjs --execute --expect-server=%FITM_CLEANUP_SERVER% --confirm=DELETE-STUDENT-DATA-NO-BACKUP
```

**ผลปัจจุบัน:** PostgreSQL 16.15 `intern_system`/`public` ยืนยันแล้ว แต่ Student ทั้ง 2 บัญชีติด Course Snapshots 25 รายการที่ `coop_academic_snapshot_immutable` ห้ามลบ. Execute รอบนี้ Rollback ก่อน DELETE (`attemptedDeletes=0`). ไม่มีการปิด Trigger/Foreign Key/Guard หรือแก้ Schema เพื่อให้ผ่าน. Company ทั้ง 3 รายการเชื่อมกับ Job Catalog จึงคงไว้; ไม่ลบ Shared Job Data. รายละเอียด Counts/Protected Comparison อยู่ใน [Current Handoff](HANDOFF_fitm-intern.md).

Script หยุดเมื่อมี Delete Trigger/Unknown Dependency/Shared Actor/Model PK Drift หรือ Target ไม่ตรง; ไม่ถือ Dry-run ว่าลบสำเร็จ. Company ต้องมี FK Link กับ Student-owned Scope และไม่มี Shared Dependents จึงเข้าแผนลบ. หากไม่มี Blocker จึงลบตาม FK Order, เปรียบเทียบเนื้อหา Records ที่ต้องเก็บในหน่วยความจำ และตรวจ Durable Outcome ก่อนลบเฉพาะ Regular Files ใต้ Student Owner Roots ที่ยืนยันได้ โดยข้ามไฟล์ที่ยังมีผู้ใช้อื่นอ้างอิง/Symlinks/Ownership ไม่ชัด. DB และ File Storage ไม่ Atomic ร่วมกัน; ผล Partial/Commit Outcome ไม่ชัดจะรายงานตามจริง ไม่ลบไฟล์เมื่อผล Commit ยังไม่ยืนยัน. Mutation/File Deletion Path ยังไม่ถูกใช้งานจริงในรอบนี้เพราะติด Guard. **Tests: NOT RUN — USER-OWNED TESTING.** ไม่แก้ Password UX/UI หรือ Source Features ของ Week 1.

**Root-cause diagnostics เพิ่มเติม — 22 พฤศจิกายน 2026:** Dry-run/Execute รายงาน `academicRetention` จาก Catalog จริง: Trigger Events/Function Body Match, Named FK Definitions/Actions, Nullability ของ Ownership Columns, จำนวน Request/Snapshot ต่อ Student Group แบบไม่แสดง Identity และจำนวน Shared Academic Catalogs ที่คงไว้. เมื่อพบเส้นทาง Immutable Snapshot → Required Request → Required Student ที่ยืนยันครบ จะระบุ `PENDING DECISION — IMMUTABLE HISTORY RETENTION`; Execute หยุดก่อน DELETE ด้วย `IMMUTABLE_HISTORY_POLICY_DECISION_REQUIRED`. ไม่แก้ Snapshot, ไม่เปลี่ยน Owner ไปยังบัญชีอื่น, ไม่ใช้ Cancel เป็น Account Delete และไม่สร้าง Placeholder Student เพื่อรายงานว่าลบหมด. การถอด Ownership/กำหนด Retention Owner แยกจาก Login Account หรืออนุญาต Purge ต้องเป็น Policy/Schema Decision ในอนาคต ไม่ทำในเครื่องมือนี้.

Source ใหม่ยังไม่ได้รันกับฐานจริง: Docker Inspect รอบสืบสวนล่าสุดถูกปฏิเสธสิทธิ์ จึงไม่ Retry/เปลี่ยนช่องทางเข้าฐานข้อมูล. Counts และผล Execute ข้างต้นเป็นหลักฐานจาก Maintenance รอบก่อนวันที่ 22 พฤศจิกายน 2026 ไม่ใช่ผล Runtime ใหม่. Seeder เดิมระบุ `DEVELOPMENT_RETAIN_DEMO_NO_ROW_DELETE`; Legacy Cleanup ที่เปลี่ยน Trigger Function ไม่ใช่ Lifecycle ที่ใช้ได้ภายใต้ข้อห้ามปัจจุบัน.

## Student Google Authentication / First Login UX — 21 พฤศจิกายน 2026

Student สมัครด้วย Email/Password หรือ Google ตั้งแต่ครั้งแรกได้ตาม Runtime Gates เดิม. Registration Pattern ปัจจุบันคือ `s` + รหัสนักศึกษา 13 หลัก + `@kmutnb.ac.th`; คง `@email.kmutnb.ac.th` เพื่อรองรับบัญชี/Workflow เดิม. รูปแบบอีเมลไม่ใช่หลักฐาน Enrollment หรือ Ownership. Teacher/Head/Staff ยังคง `@itm.kmutnb.ac.th` และ Hosted Domain Policy เดิม.

Google-first สร้าง Student และ Subject Mapping ใน Transaction เดียว; การ Login ครั้งถัดไปใช้ Mapping เดิม ไม่ถาม Password หรือให้เชื่อมซ้ำ. บัญชี Email/Password ที่ยังไม่เชื่อมต้อง Login ก่อน แล้วเชื่อมจาก Account Management ด้วย Current Password + Verified Google + Shared Confirmation; ไม่มี Email Auto-Link. บัญชีที่เชื่อม Google อื่นแล้วได้รับคำแนะนำให้ใช้บัญชีที่เชื่อมไว้.

ชื่อจาก Verified Claims เติมเฉพาะช่องว่าง: ชื่อไทยลง Student ตาม Validator เดิม และชื่ออังกฤษลง StudentProfile เดิม; ไม่แยก Full Name โดยเดา ไม่เปลี่ยน Student ID/ข้อมูลการศึกษา. รูปเดิมมีลำดับก่อนรูป Google; รูป Google ที่ผ่าน HTTPS Provider Host/MIME/Signature/ขนาดไม่เกิน 5 MB จะเก็บใน Private Storage และอ่านผ่าน API เดิม. ไม่มีรูปหรืออ่าน/แสดงไม่ได้ใช้ Avatar เริ่มต้น. Dashboard Refresh หลัง Confirm ใช้ Aggregate/Draft/Revision Flow เดิม. Google Account Status อ่าน Mapping จริง; Schema ไม่มี Provider Email แยก จึงแสดงอีเมลที่ยืนยันเฉพาะหลัง Confirm ในหน้าปัจจุบัน และใช้ข้อความสถานะปลอดภัยหลังเปิดหน้าใหม่.

หน้า First Login Password Change ใช้หัวข้อ/คำอธิบายเดียว และคำแนะนำสั้นว่า “รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร และไม่ซ้ำกับรหัสผ่านเดิม”; ข้อผิดพลาดแสดงเฉพาะเงื่อนไขที่ไม่ผ่าน โดยอธิบายขนาด 72 ไบต์/ภาษาไทยเมื่อเกี่ยวข้อง. คง Eye/Eye-off พร้อม Accessible Labels และ Actions เดิม; ไม่มีปุ่มโหลดสถานะแยก. ถ้า GET Status ขัดข้อง Action เปลี่ยนรหัสจะตรวจสถานะจริงใหม่ก่อนส่ง Password Mutation หรือผู้ใช้ออกจากระบบได้. คง Forced Change, Backend Guards และ Password Policy เดิม.

**Deployment:** ไม่เปิด Flags หรือแก้ `.env` ในงานนี้. Global และ Student Runtime Allowlists ต้องรองรับโดเมนใหม่ด้วย; `GOOGLE_STUDENT_ONBOARDING_ENABLED` ยังจำกัด Development ตามเดิม และ Hosted Domain ต้องผ่าน Allowlist จริง. รูปที่ดาวน์โหลดไม่ได้เป็น Optional Fallback; การดาวน์โหลดอาจเพิ่มเวลาภายใน Transaction สูงสุดประมาณ 5 วินาที. **Tests: NOT RUN — USER-OWNED TESTING.** รายการตรวจรับ/ข้อจำกัดอยู่ใน [Current Handoff](HANDOFF_fitm-intern.md).

## Staff Teacher Management — 21 พฤศจิกายน 2026

เมนู `จัดการข้อมูลอาจารย์` / `#staffTeachers` ใน Staff Workspace ค้นหา ดูรายละเอียด เพิ่ม แก้ชื่อไทย/นามสกุล/คำนำหน้าวิชาการ/สาขา และปิดใช้งานอาจารย์ในภาควิชาของ Staff ที่ตรวจจาก Database. คง Filter/Pagination เดิม; รายละเอียดบัญชี Head อ่านได้เท่านั้น. Email เปลี่ยนได้เฉพาะตอนสร้าง ไม่รับ Password/Department/Role/Permissions จากฟอร์ม. Major เลือกจาก Catalog เดิม (หรือคงค่าเดิมตอนแก้); Title เป็นข้อความ nullable ตาม Teacher Model.

API ใช้ `GET /api/staff/teachers`, `GET /api/staff/teachers/:id`, `GET /api/staff/teachers/options`, `POST /api/staff/teachers`, `PATCH /api/staff/teachers/:id` และ `PATCH /api/staff/teachers/:id/deactivate`. Mutation ตรวจ Live Staff/Central Control/Department ซ้ำใน Transaction. ปิดใช้งานเปลี่ยนเป็น `inactive` และใช้ Central Revocation เมื่อมีตารางเดิม; งาน Advisor/นัดนิเทศที่ยังไม่เสร็จ/กรรมการสอบที่ยังไม่เสร็จ/Active Admin Membership ได้ 409 โดยไม่ย้ายงานหรือลบประวัติ.

**นโยบาย Teacher Password ใหม่ — 21 พฤศจิกายน 2026:** แทนนโยบาย Pending Activation รอบก่อน. Staff สร้าง Teacher ใหม่ด้วยอีเมล `@itm.kmutnb.ac.th` เป็น `active` และ Backend Hash รหัสเริ่มต้นตามนโยบายผู้ใช้ด้วย Model Hook เดิม. Response ไม่คืนรหัส/Hash และระบุ `activation.state=password_change_required`, `login_ready=false` สำหรับการใช้งานปกติ. หลังยืนยัน Credentials ระบบพาไปหน้าเปลี่ยนรหัสครั้งแรก; JWT จำกัดอายุ 15 นาทีและเข้าถึงได้เฉพาะ Account Security/Logout จนเปลี่ยนสำเร็จ. บังคับจาก Hash ที่เก็บใน Database โดยตรง ไม่เพิ่ม Client Flag หรือเปลี่ยน Schema.

Staff Reset ใช้ `POST /api/staff/teachers/:id/reset-password` ผ่าน Confirmation: ตรวจ Scope/Head/Admin, Hash รหัสเริ่มต้นและเพิกถอน Session เดิมใน Transaction โดยไม่เปิดบัญชี Inactive/Central Disabled กลับมา. Teacher ของตนเองใช้ `GET/POST /api/teachers/account-security` และ `POST /api/teachers/account-security/logout`; ต้องยืนยันรหัสปัจจุบัน/รหัสใหม่/ยืนยันรหัสใหม่. เปลี่ยนสำเร็จให้เข้าสู่ระบบใหม่ทุกอุปกรณ์. มีส่วนความปลอดภัยใน Teacher Account เดิม; Head/Staff ไม่ได้สิทธิ์ API นี้เพิ่ม. Google Login/Linking ปฏิเสธระหว่าง Forced Change โดยคง Domain/Signature/Subject Mapping/Confirmation/Flags เดิม.

Create/Password Mutations ต้องมี `admin_account_controls` ตาม Model เดิมสำหรับ Revocation; ถ้า Deployment ไม่มีจะคืน 503 โดยไม่เปลี่ยน Schema หรือข้าม Guard. Application Audit หลัง Commit ไม่เก็บค่า Password/Hash/Token; Durable Staff Audit ยังติด FK ที่อ้างอิง Super Admin เดิม. **Known Risk:** รหัสเริ่มต้นร่วมกันเสี่ยง Account Takeover ก่อนเจ้าของเปลี่ยนรหัส แม้มี Forced Change; ไม่มี Ownership Invitation เพิ่ม จึงไม่รับรอง Production Readiness. **Tests: NOT RUN — USER-OWNED TESTING.** รายการตรวจรับรวมทั้ง 7 Requirements อยู่ใน [Current Handoff](HANDOFF_fitm-intern.md).

## Department Staff Workspace — 16 พฤศจิกายน 2026

หน้า `/src/department_staff/department_staff.html` ใช้รูปแบบ Header/Sidebar/Spacing จาก Department Head และแบ่งงานตาม Hash: `#staffOverview`, `#staffCoopRequests`, `#documents`, `#staffPrerequisiteCatalog`, `#staffJobs`, `#co09Manager`, `#activities`, `#own-account`. ข้อมูลบัญชีและ Google Workspace อยู่เมนูเดียวกัน; ใช้ชื่อ/อักษรย่อจาก Staff Profile จริงและ Logout/Session เดิม. เมนู Catalog แสดงเมื่อ API คืน Program Grants; กรณีไม่มีสิทธิ์หรือโหลดสิทธิ์ไม่ได้แสดงข้อความใน Overview และยังเปิด Hash รายวิชาเพื่อตรวจสถานะ/โหลดใหม่ได้.

Overview แสดงคิวจาก API เดิมสูงสุดหัวข้อละ 5 รายการ ไม่ใช้จำนวนในหน้าเป็นยอดรวม; จำนวนกิจกรรมอ่านจาก `total` ของ API โดยระบุว่ารวมร่าง/เผยแพร่/ยกเลิกที่ยังไม่สิ้นสุด. Job Review ใช้ `/api/staff/job-postings` สำหรับรายการ/รายละเอียด/เผยแพร่/ปฏิเสธ พร้อมเหตุผลและประวัติเดิม; Backend ตรวจสถานะรอพิจารณา การยืนยันอีเมล และวันหมดอายุซ้ำ. เอกสารยังเป็นฉบับตัวอย่างและรักษา Version/Snapshot/Company Response guards เดิม.

**Tests: NOT RUN — USER-OWNED TESTING.** Responsive/Keyboard/Session และ Manual Acceptance S01–S20 ยัง **PENDING USER RESULTS**. Focused Backend/Environment Audit เป็นการอ่าน Source เท่านั้น; Findings และข้อจำกัดอยู่ใน [Current Handoff](HANDOFF_fitm-intern.md). ไม่เปลี่ยน Backend, Environment, Docker, Database หรือ Auth/RBAC Policy ในงานนี้.

## Google OAuth / Staff Account Linking — 14 พฤศจิกายน 2026

**IMPLEMENTED — PENDING USER VERIFICATION. Tests: NOT RUN — USER-OWNED TESTING.** Teacher/Department Head/Department Staff ใช้ `itm.kmutnb.ac.th` เท่านั้น. **Student Domain Contract ส่วนนี้ถูกแทนที่วันที่ 21 พฤศจิกายน 2026** ตามหัวข้อ Student Google Authentication ด้านบน: เพิ่ม `kmutnb.ac.th` พร้อมคง `email.kmutnb.ac.th` เดิม. Runtime allowlists จำกัดเพิ่มเติมได้แต่ขยายเกิน Source Policy ไม่ได้; Domain ไม่ให้บทบาทและไม่สร้างบัญชีบุคลากร. บุคลากรต้องมีบัญชีเว็บไซต์เดิมและ Google subject mapping ที่ยืนยัน ownership แล้ว.

Staff: Login Email/Password เดิม → จัดการบัญชี → ยืนยันรหัสผ่านปัจจุบัน → Google Workspace → ตรวจสองบัญชีใน Shared Confirmation → Confirm จึงสร้าง mapping → สถานะเชื่อมแล้ว. ใช้ `/api/auth/google/staff/{status,challenge,link,link/confirm}` หลัง JWT/Staff guards; Password ตรวจใน challenge ก่อนโหลด GIS, challenge/confirmation ผูกกับ Staff/session และใช้ครั้งเดียว. ไม่เปลี่ยน Email/Password/Role/Session เดิม; คราวต่อไป Google Login กลับ Staff Dashboard. Teacher/Head คง Live Session linking โดยไม่ถาม Password ซ้ำ; Student registration/onboarding/ID extraction เดิมคงไว้.

ผู้ดูแลต้องทบทวน Runtime Configuration เองตามค่าที่ไม่ใช่ความลับด้านล่าง; งานนี้ไม่ได้อ่านหรือแก้ `.env` จริง ไม่เปิด flags และไม่ restart/deploy services:

```env
GOOGLE_ALLOWED_EMAIL_DOMAINS=kmutnb.ac.th,email.kmutnb.ac.th,itm.kmutnb.ac.th
GOOGLE_ALLOWED_EMAIL_DOMAINS_STUDENT=kmutnb.ac.th,email.kmutnb.ac.th
GOOGLE_ALLOWED_EMAIL_DOMAINS_TEACHER=itm.kmutnb.ac.th
GOOGLE_ALLOWED_EMAIL_DOMAINS_DEPARTMENT_HEAD=itm.kmutnb.ac.th
GOOGLE_ALLOWED_EMAIL_DOMAINS_DEPARTMENT_STAFF=itm.kmutnb.ac.th
```

คง `GOOGLE_HOSTED_DOMAIN_POLICY=required` และ Hosted Domain allowlist เดิม; ตัวอย่างยังเป็น `kmutnb.ac.th` แต่ยังไม่มีหลักฐาน `hd` ของบุคลากร `@itm.kmutnb.ac.th` รอบนี้. ห้ามถือ Email Domain เป็นค่า `hd` หรือเพิ่ม allowlist/ใช้ `email_only` เพื่อให้ผ่าน. ถ้า runtime global/role lists เดิมไม่รวม `itm.kmutnb.ac.th` บุคลากรจะยังถูกปฏิเสธอย่างปลอดภัย; การมี mapping เดิมไม่ยกเว้น Domain Policy ใหม่.

**การตรวจ `hd` อย่างปลอดภัยโดยผู้ดูแล:** ใช้บัญชีที่ได้รับอนุญาตใน Local Development และ Local Backend debugger ที่ไม่เปิดออกเครือข่าย; หยุดใน `checkGoogleIdentity` หลัง caller ผ่าน `googleToken.service` verification แล้ว ตรวจเฉพาะ `payload.hd` และ `payload.email_verified` จากคำขอ Google ของบัญชีบุคลากร. ไม่ขยาย/พิมพ์ payload ทั้งก้อน ไม่คัดลอก ID token/JWT/password ไม่เก็บ HAR/request bodies หรือ screenshot ที่มี credentials. ใช้ nonce/session guards เดิมต่อและยกเลิกก่อน Confirm ถ้าต้องการตรวจ claim เท่านั้น; debugger pause อาจทำให้คำขอหมดอายุ ต้องเริ่มใหม่แทนการข้าม guard. บันทึกเฉพาะ `hd`, วันที่ และสถานะ signature/audience/issuer/email verification ที่ตรวจจริง แล้วให้ผู้ดูแลตัดสินใจ allowlist. Diagnostic เก่าเป็น flow สำหรับ Student/flags-off และมีหลักฐานไฟล์เดิม จึงไม่ใช้เป็นหลักฐาน personnel โดยอัตโนมัติหรือรันทับผลเก่า.

Google Login/Linking ตรวจ Central Account Control เดิมก่อนออก JWT/สร้าง mapping; session-bound flows ตรวจ revocation ด้วย `iat` ส่วน login ใหม่ไม่ใช้ `revoked_before` เป็นการปิดบัญชีถาวร. GA-03 ไม่เปลี่ยน: subject หลาย actor ยังคืน `409 AUTH_CONTEXT_AMBIGUOUS`. รายละเอียดไฟล์/ข้อจำกัด/Manual Acceptance Checklist อยู่ใน Current Handoff; Runtime/Provider/Browser/Database persistence และ Concurrency ยังรอผลผู้ใช้.

## Project Advisor Reassignment — Design Proposal — 13 พฤศจิกายน 2026

**ออกแบบแล้ว ยังไม่ได้เปลี่ยน Schema/Service/UI หรือเปิด Reassignment.** แนะนำ **Option B: ขยายตาราง Request เดิม** โดยคง Confirmed/Rejected เป็นประวัติ, เปลี่ยน Unique ให้จำกัดเฉพาะ Pending ต่อนักศึกษา และเพิ่ม Student workflow revision / Request selection revision / Previous advisor รวม 3 ฟิลด์. คง CHECK state/time เดิมและ `confirmed_at` ทุกแถว; อาจารย์ปัจจุบันยังอิง `coop_advisor_teacher_id` ไม่ใช่ทุกแถวที่ status=confirmed. A คงเป็นปัจจุบันระหว่างรอ B และหลัง B ปฏิเสธ; สลับเฉพาะเมื่อ B ยอมรับและ transaction commit. Class Advisor `advisor_teacher_id` ไม่เปลี่ยน.

เปรียบเทียบ Option A/B, DDL Draft ที่ **ไม่ได้รัน**, revision/idempotency/locking, API/Shared Confirmation Modal, ไฟล์ที่จะต้องแก้, installation/rollback และผลกระทบอยู่ใน [Current Handoff](HANDOFF_fitm-intern.md). **Pending Decisions:** Period/unknown NULL, สิทธิ์นิเทศและเอกสารย้อนหลัง, active exam/approval policy และ guard ปิดบัญชีอาจารย์เมื่อ Confirmed กลายเป็น history. ไม่ให้สิทธิ์ใหม่หรือย้าย author/approval/appointment ตามข้อเสนอโดยอัตโนมัติ.

ผลรอบ design นี้: Read-only SQL 9 checks; mock/reference-model 8 tests (371 state paths) และ actual-source confirmed-guard 1 test ผ่าน. ไม่ใช่ผลทดสอบ implementation ใหม่; DDL apply/real concurrency/API/UI/Browser ยัง **NOT TESTED**. **NEXT TASK:** อนุมัติแนวทาง/Policy และมอบหมาย implementation แยกก่อนแก้ Schema; workflow ปัจจุบันยังคง Guard เดิม. งาน Company/Job Filters/NLP ด้านล่างไม่ได้เปลี่ยนในรอบนี้.

## Current Company Fixes / Student Job Filters — 13 พฤศจิกายน 2026

งานรอบนี้แก้ Source ตามผล Company Audit; **ข้อมูลประกาศยังเป็น Development / ไม่ยืนยันเปิดรับจริง**. ผล Audit เดิมอยู่หัวข้อถัดไปและเก็บเป็นประวัติ ไม่ใช่สถานะว่า Source ยังไม่ได้แก้ทั้งหมด.

- **Company visibility (CJA-02):** อ้าง Company ID ตรงหรือผ่าน Job ต้องผ่าน policy เดียวกับ Search; รวม ID/visibility ด้วย AND และตรวจ Job publication/expiry/relationship ซ้ำที่ Backend. Hidden/missing company คืน 404 `COMPANY_UNAVAILABLE` เหมือนกัน; published-job read คืน 404 `JOB_POSTING_UNAVAILABLE`; malformed ID คืน 400 `COOP_REFERENCE_INVALID`, mismatch คืน 400 `JOB_COMPANY_MISMATCH`. คง manual company entry และ owner/RBAC เดิม.
- **คำร้องใหม่ (CJA-01):** เมื่ออ้าง Company ที่มีในระบบ Backend เก็บป้าย synthetic/source-backed/unverified พร้อมที่อยู่ใน `company_address` TEXT เดิม ณ เวลาส่ง และ Company API ส่ง `request_address` ให้ Prefill ตรงกัน. Focal address ที่ตรงหลักฐานใช้ป้ายที่อยู่จากเว็บไซต์บริษัทพร้อมขอบเขตว่าไม่ยืนยันการเปิดรับ; ไม่ใช้ป้าย synthetic เหมารวม. Readers Student/Teacher/Head/Staff/เอกสารใช้ snapshot เดิมจึงคงข้อความนี้. ไม่เปลี่ยน Schema หรือ backfill คำร้องเก่า; structured provenance ยัง Pending Decision. Manual entry ไม่ถูกอ้างว่า verified.
- **Contact display / CJA-08:** แยก `ข้อมูลจำลองสำหรับ Development`, `ข้อมูลติดต่อยังไม่ได้รับการยืนยัน`, source-backed และ `ยังไม่มีข้อมูล`. Focal เป็นข้อมูลติดต่อทั่วไปจากเว็บไซต์บริษัท ไม่ยืนยัน Email Ownership, HR หรือการเปิดรับ; synthetic ไม่มี tel:/mailto:. คง HTTPS/Internth link guards และเพิ่มคำเตือน current hiring ยังไม่ยืนยัน โดยไม่แก้สถานะ Published.
- **ค้นหาประกาศทั้งหมด:** จังหวัดเป็น native searchable datalist จากชุดที่อยู่ไทยเดิม ครบ 77 จังหวัด + `ทุกจังหวัด` มีล้างตัวกรอง; normalize จังหวัด/จ./Bangkok aliases เฉพาะ query/SQL comparison ไม่เขียน DB. เปลี่ยนตัวกรองแล้วกดค้นหาเริ่มหน้า 1, ป้องกัน response เก่าทับผลล่าสุด และคง loading/empty/retry/filtered total/pagination.
- **Filter contract:** `GET /api/job-matches/me/jobs?q=Network&category=information_technology&specialization=network&province=กรุงเทพมหานคร&page=1`. คง category หลัก 5 ค่า; specialization มี 16 ตัวเลือก + default ทุกสายงาน โดย Software/Frontend/Backend/Full Stack/IT Support/Network/System/Cloud-DevOps/Cybersecurity/Database-Data Engineering/Data Analysis/AI-ML/Testing/Mobile/UI-UX ค้นคำและ aliases ใน title/description; `other` ใช้ stored category `other`. นิยามจริงอยู่ [jobSearchFilters.js](backend/src/services/jobSearchFilters.js). ทุกเงื่อนไขรวมด้วย AND, specialization ใช้ title OR description, ไม่ใช่ structured job classification; อาจมีผลทับซ้อน/ขาดบางงานเพราะข้อความต้นทางไม่ครบ. ไม่เติม Skills/แก้ category ใน DB หรือเปลี่ยน NLP ranking.

**Project Advisor Reassignment — PENDING DECISION / BLOCKED:** unique `project_advisor_one_current_per_student` รับเพียงหนึ่ง non-superseded request; `project_advisor_request_state_check` ไม่ให้ superseded เก็บ confirmed_at เดิม. จึงยังทำ pending ใหม่พร้อมเก็บประวัติ confirmed ทั้งหมดไม่ได้ภายใต้ข้อห้ามแก้ Constraints/Schema. คง Dropdown/`ADVISOR_CONFIRMED` guard; ไม่เปิด workflow ที่ Backend ยังไม่รองรับ. ต้องกำหนด schema/history และสิทธิ์เดิม/ใหม่ต่อ Academic/Document/Exam ก่อน; Class Advisor ไม่เปลี่ยน.

**Focused verification ที่อนุญาตเฉพาะรอบนี้:** `node backend/test/companyJobFixes.test.js` 13/13, `node frontend/test/jobMatching.test.js` 14/14, `node frontend/test/coopRequestReadiness.test.js` 4/4 ผ่าน ทั้งหมดใช้ mocks/in-memory fixtures ไม่แก้ข้อมูลจริง; syntax checks ของ 7 source + 3 test JS ผ่าน. Frontend Vite `build({configLoader:'native',build:{write:false,emptyOutDir:false}})` ผ่าน 191 modules/73 outputs ในหน่วยความจำ/0 warnings โดยไม่เปลี่ยน Configuration ถาวร. ไม่อ้างว่าระบบทั้งหมดผ่าน.

**NOT TESTED / Remaining Issues:** Browser desktop/mobile/native keyboard, real authenticated API/DB filtering/concurrency และ advisor reassignment ที่ยัง blocked. ข้อมูลที่รอยืนยัน: 5 source pages เคยระบุปิดรับ, จังหวัดจริง, work mode/ค่าตอบแทน/ตารางงานจำลอง, หน่วย 400 ของ Focal, Skills/Descriptions ที่ตกหล่น และ Email ownership/HR/current hiring; ไม่เปลี่ยน dataset หรือคำร้องเก่าในงานนี้. **NEXT TASK:** ผู้ใช้ทำ Manual Acceptance ของ Browse/Contact/Prefill/Submit; กำหนดขอบเขต schema/policy Advisor และอนุมัติการ reconcile ข้อมูลแยกก่อนเริ่มงานนั้น. รายการไฟล์/ผลทดสอบ/ข้อจำกัดเต็มอยู่ [Handoff](HANDOFF_fitm-intern.md).

## Previous Company / Job Data Audit — 13 พฤศจิกายน 2026

**AUDIT ONLY — ยังไม่พร้อมใช้เป็นข้อมูลประกาศจริงใน Production.** SELECT-only โดย connection read-only พบ **12 Companies / 18 Jobs / 12 Submissions / 0 Job Reviews**. ทั้ง18 Local Publishedแต่ Email Verificationยังไม่มีและ Submissionsยังpending_email_verification; Publishนี้มาจากDevelopment workflow ไม่ใช่หลักฐานว่าบริษัทเปิดรับหรือมหาวิทยาลัยรับรอง. ไม่มีการแก้ Source/Database/Environment ในงานAudit.

**Contact provenance:** 11บริษัท/17งานยังใช้ phone/email/addressตรงSynthetic Fixtures (Email example.test); ใช้ได้เพื่อDevพร้อมป้าย ไม่ใช่ข้อมูลติดต่อจริง. Focal Solutionเท่านั้นที่ข้อมูลติดต่อทั่วไปตรงDB/Source constantsและ[เว็บไซต์บริษัท](https://focalsolution.com/)ที่อ่านรอบนี้ แต่ Email ownership/current hiringยังUNVERIFIED. Modelไม่มีwebsite/company-status/structured-provenancefields; websiteในContact APIมาจากFocal constant. ไม่พบชื่อ/Email/Phoneซ้ำหรือCompany/Submission orphanในข้อมูลปัจจุบัน.

**ปัญหาสำคัญที่ยังไม่ได้แก้:** CJA-01 พบคำร้องเดิม3รายการเก็บที่อยู่ตัวอย่าง/Development; CJA-02 createCoopRequestเส้นทางcompany-onlyไม่ได้ใช้companyVisibilityWhereเหมือนSearch จึงมีSource policy gapสำหรับบริษัทDevที่ถูกซ่อนนอกDevelopment. SourceปัจจุบันยังแสดงContact syntheticเป็นข้อความพร้อมป้ายและไม่สร้างtel:/mailto:ให้; Company/Job IDสัมพันธ์กันและrequest owner guardsยังอยู่ แต่ไม่ใช่ผลทดสอบRBAC.

**Data completeness/currentness:** 17งานไม่มีworkmodesและใช้pay/วันทำงานจำลอง; หน้าแหล่งอย่างน้อย5รายการระบุปิดรับ: [15104](https://internth.com/job/15104), [17213](https://internth.com/job/17213), [10373](https://internth.com/job/10373), [19736](https://internth.com/job/19736), [14165](https://internth.com/job/14165). [Focal16858](https://internth.com/job/16858)ระบุ400บาท/เดือนขณะที่Localยังบอกหน่วยไม่ชัด ต้องreconcileก่อนแก้. ข้อมูลเว็บอาจCached/Crawled ไม่ถือเป็นการยืนยันจากบริษัทโดยตรง.

**ชี้แจง Matching ก่อนหน้า:** Local descriptionsไม่มีExpress/HTML/CSS แต่[12910](https://internth.com/job/12910)ต้นทางมีExpress/JavaScript และ[16633](https://internth.com/job/16633)/[19736](https://internth.com/job/19736)มีJavaScript/HTML/CSS. Datasetเก็บเพียงSkills/Work summaryจึงขาดรายละเอียด; ผลว่างจากCorpus Localเดิมไม่ได้พิสูจน์ว่าทุกต้นทางไม่มีทักษะเหล่านี้. งานนี้ไม่แก้ข้อความประกาศหรือAlgorithmและไม่รันMatchingซ้ำ.

รายงานครบ12บริษัท/18งาน, สถานะContact, Source/Workflow findings CJA-01..08 และข้อเสนอแก้อยู่ใน [Handoff](HANDOFF_fitm-intern.md). **Tests: NOT RUN — USER-OWNED TESTING**; ไม่รันBuild/Browser Automation/health/API tests. เทียบFrontendจากSourceเท่านั้น ยังไม่ได้เปิดBrowserที่Loginจริง. **Remaining Issues/NEXT TASK:** จัดขอบเขตแก้visibility/snapshot provenanceก่อนProduction แล้วจึงreconcileข้อมูลต้นทาง. **Pending Decisions:** เกณฑ์ยืนยันเปิดรับ/การจัดการsnapshotเดิมต้องกำหนดก่อนแก้ ไม่เปลี่ยนนโยบายมหาวิทยาลัยหรือข้อมูลย้อนหลังเอง.

## Previous Student Job Matching — ผลว่างและสถานะวิเคราะห์ — 13 พฤศจิกายน 2026

Browse พบประกาศไม่ได้หมายความว่าทุกประกาศจะผ่าน Matching. รอบนี้ตรวจ PostgreSQL แบบ Read-only พบ 18 ประกาศที่ Published/ไม่หมดอายุ/มี Company และ Description ครบ ทั้งหมดเป็น Development Internth. ใช้ Controller จริงกับ Read-only SQL adapters และ NLP HTTP ที่รันอยู่ พบ Browse total18 (หน้าแรก12), ส่งเข้า NLP18, ผลผ่านเกณฑ์0; เป็นการ replay ตาม Source ไม่ใช่การ Login/เรียก Backend HTTP ด้วยบัญชีผู้ใช้.

Skills mode อ่านชื่อ Computer Skills ที่บันทึกจริง + Related Skills ถ้ามีทุกครั้ง ไม่อ่าน Draft/ไม่ใช้ระดับทักษะเป็น Weight/ไม่ใช้สาขา IT/INE คิดคะแนน. ชุด Express + JavaScript + HTML/CSS ที่ตรวจไม่มีงานผ่าน `0.05`; ข้อความประกาศพบ JavaScript เพียง1รายการ ไม่พบ Express/HTML/CSS เป็นคำตรง. ทดสอบ JavaScript เดี่ยวได้ Software Engineer (Frontend) score0.0861 แต่คะแนนนี้ไม่ใช่คะแนนของชุดทักษะจริง. ผลว่างไม่ได้แปลว่าทุกคะแนนเป็น0 หรือไม่ผ่านคุณสมบัติ; endpoint ไม่ส่งคะแนนต่ำกว่าเกณฑ์กลับมา. ไม่พบหลักฐาน Matching/Tokenization Bug และไม่เปลี่ยน Algorithm/ข้อมูล/เกณฑ์เพื่อบังคับผลลัพธ์.

แก้เฉพาะข้อความใน `frontend/src/pages/student_coop.js` และ `frontend/src/student_coop/student_coop.html`: ใช้ “วิเคราะห์จากทักษะ”, ผลว่างเมื่อมีประกาศแสดง “วิเคราะห์เสร็จแล้ว แต่ยังไม่มีประกาศที่มีคะแนนความสอดคล้องของข้อความถึงเกณฑ์แนะนำ” แบบ info พร้อมชวนตรวจทักษะ/ค้นหาประกาศทั้งหมด. แยก “ยังไม่มีประกาศที่พร้อมวิเคราะห์” จาก NLP Error/Retry และมี Matches จึงแสดง Success. คง TF-IDF/cosine, min_score0.05, top10, ordering/response, Resume/Browse, Development/contact labels และสิทธิ์เขียนคำร้องเดิม; ไม่มีการเติมงานทั่วไปเป็นผลแนะนำ.

**Focused verification:** `node test/jobMatching.test.js` จาก frontend/ **8/8 ผ่าน** (ไฟล์ใหม่, DOM/API/model substitutes ไม่มี DB writes); NLP HTTP inline unittest **8/8 ผ่าน** (case/slash/ทุกSkill/18 unrelated/น้อยกว่า10/top10/stopwords/Thai-English); `python -B nlp-service/tests/test_resume_matching.py` **11/11 ผ่าน**. Frontend Build ด้วย Vite native loader แบบ write:false/emptyOutDir:false ผ่าน **191 modules / 73 outputs / 0 warnings** ไม่เขียน dist หรือแก้ Config ถาวร. ไม่มีการสร้างบัญชี/ประกาศ/Backup/Vault หรือแก้ PostgreSQL.

**Remaining Issues / NEXT TASK:** ผู้ใช้ตรวจ Browser ด้วยบัญชีเดิมว่า Empty State/Retry/Browse ถูกต้อง; ยังไม่ยืนยัน authenticated Backend HTTP/Browser E2E หรือคะแนนย่อยที่ต่ำกว่าเกณฑ์. หลังแก้ UI ผลจากชุดทักษะจริงยังเป็น0ตาม NLP. **Pending Decisions:** ไม่มีเพิ่ม; Alias/semantic matching/แก้ประกาศ/เปลี่ยนเกณฑ์ไม่อยู่ในงานนี้.

## Previous Student Profile — ชื่อฟิลด์รายละเอียดภาษาไทย — 13 พฤศจิกายน 2026

รายละเอียดประวัติที่บันทึกแล้วในหัวข้อ “ข้อมูลส่วนตัว (1)” และ “ติดต่อ / ครอบครัว / ฉุกเฉิน (1)” ใช้ Label ภาษาไทยจาก `workspaceFields` เดียวกับฟอร์มแก้ไข แทนการพึ่ง Label ของฟอร์มเก่าที่หายไปแล้วแสดง Raw API Keys. แก้การเลือก Label 28 legacy fields และแปล English Title ในรายละเอียดอีก 1 ฟิลด์; รวมสองหัวข้อมี Label ไทยครบ **46 ฟิลด์ (24 + 22)** โดยไม่เพิ่ม/ลบ/เรียงฟิลด์ใหม่.

แก้ `frontend/src/pages/studentAccountOverview.js` เท่านั้นในส่วน Production: แปลค่าที่แสดง `male/female` เป็น ชาย/หญิง โดยไม่เปลี่ยน Raw Value, Snapshot หรือ API Payload. ค่า Legacy/ชื่อภาษาอังกฤษ/วันที่/เบอร์/รหัสและค่าว่างแสดงตามเดิม; English Title ในฟอร์มแก้ไขและ Workflow Gender/Prefix ด้านล่างไม่เปลี่ยน. ไม่แก้ CSS/Layout/Backend/Schema/Auth/RBAC.

**Focused verification รอบ Label:** จาก `frontend/` รัน `node test/studentProfileContacts.test.js` **82/82 ผ่าน** (เพิ่ม 3 Cases ในไฟล์เดิม ตรวจ Labels/ค่าครบ/ลำดับ/ไม่มี legacy DOM labels/ไม่ mutate Snapshot และรวม Regression Gender/Prefix/Save/Draft/Payload เดิม). Build ด้วย Vite native loader แบบ `write:false, emptyOutDir:false` ผ่าน **191 modules / 73 outputs / 0 warnings**; ไม่เขียน/ล้าง dist หรือแก้ Config ถาวร. ใช้ DOM/API substitutes ไม่เรียก PostgreSQL หรือแก้ข้อมูลจริง; ไม่รัน Backend/NLP/Database tests.

**Remaining Issues / NEXT TASK:** รอผู้ใช้ตรวจ Browser ด้วยบัญชีเดิม โดยเปิดทั้งสองหัวข้อและดูข้อความ/ค่าที่ 1280/390/320px รวม Gender/Prefix และ Save→Reload. โครงสร้าง DOM และ Responsive CSS คงเดิม แต่ผล Harness ไม่ใช่การยืนยัน Browser rendering หรือ Full System PASS. **Pending Decisions:** ไม่มีเพิ่มสำหรับงาน Label.

## Previous Student Profile — Gender แก้ไขอิสระ — 13 พฤศจิกายน 2026

เปลี่ยน Dropdown เพศด้วยตนเองได้ทั้งชาย→หญิงและหญิง→ชาย โดยคำนำหน้าไทยและ English Title ไม่เปลี่ยน. บันทึกได้แม้ Prefix/Gender ต่างกัน และโหลด Snapshot กลับตามค่าที่บันทึก; Gender (English) ยังสะท้อน `profile.gender` เดียวกับภาษาไทย ไม่มี API field เพิ่ม.

**การเปลี่ยนคำนำหน้ายังคงพฤติกรรมเดิม:** `profileGenderForPrefix()` และ Event Handler เดิมยังปรับ นาย→ชาย, นาง/นางสาว→หญิงเมื่อผู้ใช้เปลี่ยน Prefix จริง. รักษารูปแบบ raw ไทย/อังกฤษและข้อยกเว้นค่าไม่ระบุ/legacy เดิม; ไม่อนุมานเพศใหม่เมื่อเปิดหน้า/Reload/PDF/Review. ข้อกำหนดนี้แทนที่เฉพาะคำเตือนและ Save guard ที่บังคับ Prefix/Gender ให้ตรงกันในประวัติวันที่ 6 พฤศจิกายน 2026.

แก้ `frontend/src/pages/studentProfileWorkspace.js` และ `studentProfileWorkspaceDraft.js` เพื่อลบ `profilePrefixGenderError()`/การปฏิเสธคู่ค่าจาก `identityFeedback()` และ `saveAll()` พร้อมปรับ `frontend/test/studentProfileContacts.test.js`. Draft Preservation, If-Match/Profile Revision, late edits, network/409 handling และ Validation อื่นใช้เดิม. ไม่เปลี่ยน UI/Layout/ตัวเลือก Prefix/Backend/Schema/Auth/RBAC.

**Focused tests ที่รันจริง:** จาก `frontend/` ใช้ `node test/studentProfileContacts.test.js` — **79/79 ผ่าน**. Harness ใช้ Workspace Source จริงกับ DOM/API substitutes และ Backend pure normalizer; ครอบคลุม manual gender ทั้งสองทิศทาง, Prefix mapping เดิม, Save All บน/ล่าง, fresh Workspace read-back, English mirror/Title และ Draft/Validation regressions. ไม่เรียก PostgreSQL/API จริง ไม่สร้างบัญชีหรือไฟล์ข้อมูล.

**Remaining Issues / NEXT TASK:** รอผู้ใช้ตรวจ Browser ด้วยบัญชีเดิม: เปลี่ยนเฉพาะ Gender → Save → Reload แล้ว Prefix/Gender/English Gender/English Title คงค่าถูกต้อง และเปลี่ยน Prefix แล้วยังปรับเพศเดิม. รอบนี้ไม่รัน Build/Browser/live persistence หรือ NLP/Backend ทั้งชุด; ผล Harness ไม่ใช่ Full System หรือ Manual Acceptance. **Pending Decisions:** ไม่มีเพิ่มสำหรับงานนี้; ขอบเขต Public Search ที่ยังรอตัดสินใจด้านล่างคงเดิม.

## Previous HTML / IT Dropdown Verification — 13 พฤศจิกายน 2026

แก้ `frontend/src/student_coop/student_coop.html:741` เพียงบรรทัดเดียว: `</option value="information_technology">` → `</option><option value="information_technology">`. HTML เดิมใช้ closing tag แทน opening option ทำให้ parse5 เตือนและหมวด IT ไม่มี option ที่ถูกต้อง. รักษา `jobBrowserForm`, `name="category"`, values/ข้อความ/ลำดับเดิมและ Event Bindings ทั้งหมด; ไม่แก้ CSS/JavaScript/Backend/NLP/Database หรือ Vite config.

**Dropdown นี้เป็นหมวดหมู่งาน ไม่ใช่สาขานักศึกษา IT/INE:** ค่า IT คือ `information_technology` / “เทคโนโลยีสารสนเทศ”. ตัวเลือกกำหนดใน HTML ไม่ได้โหลดจาก Academic Catalog; ครบ6ค่า `""`, `information_technology`, `engineering`, `design`, `business`, `other`. ไม่มี selected attribute จึงใช้ตัวแรก “ทุกหมวดหมู่” เป็นค่าเริ่มต้น. ผลประกาศจึงค่อยโหลดผ่าน API หลัง Submit.

การเปลี่ยนตัวเลือกยังคงค่าใน Form; เมื่อกดค้นหา `loadJobBrowser(1)` อ่าน FormData → `getPublishedJobs` → `GET /api/job-matches/me/jobs?category=information_technology` พร้อม q/province/page. Controller ยังคง allowlist/400สำหรับค่าปลอม, published/expiry filters และ paginationเดิม. Job category ไม่ถูกแปลงจาก major และใช้ร่วมกันได้สำหรับ Student IT/INE; ไม่มีการเพิ่ม INE เป็น job category หรือแก้รายวิชา/เกณฑ์สหกิจ.

| Focused verification รอบ HTML fix | Actual result | ขอบเขตหลักฐาน |
|---|---|---|
| HTML option/value/default + Dropdown data flow | **7/7 PASS** | ตัวตรวจชั่วคราวในmemoryใช้HTMLและSourceจริงของloadJobBrowser/APIadapter/listPublishedJobs; DOM/FormData/Modelsเป็นsubstitutes ไม่เรียกDatabaseหรือAPIจริง |
| Regression cases | PASS | IT/INEส่งITcategoryเดิม, Submitกลับpage1, ทุกหมวดค่าเดิม, failureรักษาตัวเลือก/Retry/ปล่อยbusy, incomplete response, forgedcategoryถูกปฏิเสธก่อนquery |
| Native Vite build / HTML parser | **PASS:191modules/73assets, warnings0/HTMLwarnings0** | configLoader native + write:false/emptyOutDir:false; ไม่เขียนหรือทับdistเดิม ไม่แก้configถาวร |
| Real Browser / signed-in account / live DB filtering | **NOT TESTED** | ผลข้างต้นไม่ใช่Browser rendering/ManualAcceptanceหรือFullSystemPASS; ไม่รันBackend/NLPทั้งชุดซ้ำ |

การทดสอบไม่ได้สร้างไฟล์ใหม่; ตัวตรวจชั่วคราวรอบแรกติดPowerShell→Node encodingก่อนรันtests และแก้เฉพาะUTF-8ของshell processจึงรัน7casesได้ครบ ไม่แก้Environment files/OS settings. ผลNLP11/Frontend8ในหัวข้อก่อนหน้าเป็นผลคนละรอบ ไม่รวมเป็นผลใหม่.

**Public search proposal:** Referencesเดิม3ตำแหน่งยังอยู่และยังไม่สร้างหน้า. อ่านScope Traceability/Feature Matrix/GAP reportวันที่10ตุลาคมกับMockupในindex.html/index.jsและBackendปัจจุบันแล้ว; ไม่พบต้นฉบับทก.01ในRepository และTraceabilityระบุOFFICIAL SOURCE UNAVAILABLE จึงเป็นข้อเสนอชั่วคราว ไม่ใช่Official Requirementที่รับรองแล้ว. รายละเอียดfilter/ข้อมูลที่Backendมี/APIที่ใช้ซ้ำได้/สิ่งที่ยังต้องตัดสินใจอยู่ใน [Current Handoff](HANDOFF_fitm-intern.md). Protected Student API ใช้เป็นanonymous public endpointตรงๆไม่ได้และไม่เปลี่ยนRBACในงานนี้.

**UPDATED FILES:** รอบนี้แก้เฉพาะstudent_coop.html, README.md, HANDOFF_fitm-intern.md; ไม่เพิ่ม/ลบไฟล์และรักษาBaseline4M/1Uจากงานก่อน → หลัง5M/1U. ไม่สร้างสองprivatefolders/Backup/Restore/บัญชี ไม่Commit/Push. **Remaining Issues / Pending Decisions:** publicsearchต้องยืนยันoriginalscope/publicfields/filtercontracts; Browser/real-account acceptanceยังรอผู้ใช้ และDocker/pgAdminlimitsเดิมไม่ตรวจซ้ำ. **NEXT TASK:** ผู้ใช้ตรวจDropdownจริงในStudentIT/INE; กำหนดขอบเขตpublicsearchก่อนมอบหมายพัฒนา โดยไม่เริ่มหน้า/APIใหม่เอง.

## Previous Confirmed Issue Fixes — 13 พฤศจิกายน 2026 ก่อนแก้ HTML

**FOCUSED FIXES VERIFIED — ไม่ใช่ Full System PASS.** งานนี้แก้เฉพาะ legacy NLP empty vocabulary และ Frontend test harness; ตรวจ Missing Feature/Build/Docker/pgAdmin ตามคำสั่งผู้ใช้. ผล Full System Verification ก่อนแก้ไขอยู่หัวข้อถัดไปและคงเป็นประวัติ แยกจากผลรอบนี้. `.local-db-backups/` และ `.local-dev-accounts/` ยังไม่มีและไม่ได้สร้างกลับ.

| Issue | Root Cause | Fix / disposition | Actual focused result | Status |
|---|---|---|---|---|
| `/api/v1/resume-match` HTTP500 | TF-IDF ยก ValueError เมื่อ preprocessing ลบคำหมดทั้ง corpus | `app/services/matching_service.py` จับเฉพาะ ValueError ที่มี empty vocabulary แล้วให้คะแนน0ต่อjobตามแนวทางเดิมของ job_matching_service; ValueError อื่นยังส่งต่อ | Live Local NLP HTTP tests11/11ผ่าน รวมข้อความปกติ/ว่าง/whitespace/stopwords/punctuation/ไทย/อังกฤษ/ผสม/no jobs และ canonical job-matching regression | FIXED |
| Company-selection harness | Extract เฉพาะ applyCoopCompany ทำให้ helper จริงและ coopRequestSubmitting ไม่อยู่ใน harness scope | `frontend/test/coopRequestReadiness.test.js` extract ตั้งแต่ syncCoopCompanyFieldOwnership และเตรียม state; ตรวจ readOnly/disabled/preserveJob/clearJob/submitting ด้วย Source functions จริง | Readiness4/4 + Academic regression4/4 ผ่าน | FIXED; production JS ไม่เปลี่ยน |
| search_company.html 3 references | ไม่มีหน้าค้นหาสาธารณะใน HTML/Vite entries; homepage searchJobs และ Apply Filter ยังเป็น mockup | ไม่เปลี่ยนลิงก์เป็น placeholder/home redirect และไม่ชี้ไป Student-only dashboard ที่เปลี่ยน audience | Source: index.html:41,125; recruit_student.html:26; index.js:101. ลิงก์เดิมยังค้าง | MISSING FEATURE |
| Frontend Build | Previous default bundled loader พบ spawn EPERM/native dependency bundling errors; host Node24.11.1 รองรับ Vite8.2.2 และ Tailwind4.3.3/native package มีจริง | ใช้ supported configLoader native ผ่าน Vite API แบบ write:false โดยไม่แก้ config/dependencies/security | Build exit0,191modules,73outputassetsในmemory; มี HTML warning1จุด | PASS WITH WARNING; default loader ไม่ได้รันซ้ำ |
| Docker API | Named-pipe permission denied | ไม่เปลี่ยนสิทธิ์/ไม่ข้าม policy; Compose config --quiet ผ่าน | docker compose ps ยังถูกปฏิเสธสิทธิ์ | BLOCKED |
| pgAdmin/login401 | เป็น authentication response; ยังไม่ยืนยัน login contract/session ของ installed image | ไม่จัดเป็น Source Bug/ไม่เปลี่ยน credentials | GET / →302 /browser/; /misc/ping →200; /login →401JSON จาก gunicorn | REACHABLE; authenticated UI NOT TESTED |

NLP fix ไม่เปลี่ยน vectorizer/tokenization/TF-IDF/cosine algorithm, threshold, top_k, sorting, score rounding หรือ response schema. Default threshold เดิมกรองคะแนนศูนย์ออกจึงคืน `{"matches":[]}` เมื่อไม่มี vocabulary. `similarity.py` และ `job_matching_service.py` อ่านประกอบแต่ไม่แก้ เพื่อคงพฤติกรรม callers อื่นและ canonical matching เดิม.

Public company-search **ยังไม่มีปลายทางที่ใช้แทนได้จริง**. การค้นหาที่มี Source ใช้งานอยู่เป็น Student job browser ภายใน `student_coop.html` → `getPublishedJobs` → protected `GET /api/job-matches/me/jobs`; ไม่ใช่หน้าสาธารณะสำหรับผู้ใช้ Homepage/Company. แนวทางงานแยก:กำหนด public audience/ข้อมูลที่เผยแพร่/filter/pagination/RBAC contract ก่อน แล้วใช้โครงสร้างประกาศเดิมและเพิ่ม Vite entry เฉพาะเมื่อได้รับงานพัฒนาหน้าจริง; ไม่เปิด protected API เป็น public เอง. จึงคง HTML/Vite config/UI เดิมทั้งหมดในงานนี้.

**Build warning ที่พบใหม่:** `frontend/src/student_coop/student_coop.html:741` มี `</option value="information_technology">` แทนการปิด option แล้วเปิด option ใหม่ ทำให้ parse5 แจ้ง `end-tag-with-attributes`. Build ยังสำเร็จ แต่ควรแก้ markup หนึ่งจุดและตรวจ IT dropdown ในงานถัดไป. ไม่รวมเป็นเหตุของ EPERM และไม่ได้แก้ markup ในงานแก้ harness นี้.

### Focused Testing รอบแก้ไข

ผู้ใช้อนุญาตเฉพาะ Focused Tests รอบนี้; ไม่ใช้สิทธิ์รอบ Full Verification แทนงานใหม่. Tests รวม **19 PASS / 0 FAIL**: Frontend8 + Live NLP11. Python AST4filesและV8 JS parse3filesผ่าน; ไม่ใช่ Browser rendering/Full Regression/Provider E2E. ไม่ทดสอบหรือเปลี่ยน Development DB/Accounts/Schema/Volumes.

ชุดทดสอบที่รันจริง (Frontend ใช้ cwd frontend; ด้านล่างแสดง path สำหรับ Repository root):

```powershell
node frontend/test/coopRequestReadiness.test.js
node frontend/test/coopAcademic.test.js
python -B nlp-service/tests/test_resume_matching.py
```

NLP test ใหม่ใช้ unittest/urllib จาก Python standard library และ synthetic HTTP bodies ไป `127.0.0.1:8000` เท่านั้น ต้องมี Local NLP service เปิดอยู่แล้ว. ไม่มีการติดตั้ง dependencies/เริ่ม service/สร้างไฟล์ข้อมูล/เชื่อม DB. HTTP contracts ทดสอบกับ service ที่ตอบจริง ไม่ใช้ mocks; host Python ไม่ต้องติดตั้ง FastAPI/scikit-learn สำหรับ test client นี้. ไม่ถือผลนี้เป็น FAQ/PDF/OCR acceptance.

คำสั่ง build ที่รันจริงจาก `frontend/` ใช้ dependency ที่ติดตั้งแล้วและไม่เขียน/ล้าง `frontend/dist`:

```powershell
@'
import { build } from 'vite';
await build({configLoader:'native',build:{write:false,emptyOutDir:false}});
'@ | node --input-type=module
```

`configLoader:native` เป็น option ของ Vite ไม่ใช่การเปลี่ยนเครื่องหรือข้าม security policy. ไม่ monkey-patch child processes, ไม่เพิ่ม permissions/dependencies และไม่แก้ build config เพื่อซ่อน errors. ผลเดิมของ bundled/runner loadersยังเป็นประวัติ ไม่ใช่ผลของ native build รอบนี้.

**UPDATED FILES:** แก้ `nlp-service/app/services/matching_service.py`, `frontend/test/coopRequestReadiness.test.js`, `README.md`, `HANDOFF_fitm-intern.md`; เพิ่ม test fileเดียว `nlp-service/tests/test_resume_matching.py`. รักษา baseline README/Handoffที่Modifiedอยู่แล้ว2ไฟล์. ไม่แก้ productionFrontendJS/HTML/ViteConfig/Auth/RBAC/Environment/Database/Volumes ไม่Backup/Restore/Seed/สร้างบัญชี/Commit/Push.

**REMAINING ISSUES / PENDING DECISIONS:** Public company-search เป็น Missing Featureตามหลักฐาน; ต้องกำหนดขอบเขตหน้า/APIก่อนพัฒนา. HTML option warningยังค้าง; Docker permissionและpgAdminauthenticated UIยังไม่ยืนยัน. ไม่ต้องตัดสินใจ Empty Vocabulary เพิ่ม:ใช้zero-score/finalfilterตามcontractเดิมแล้ว. Browser/real-account workflows/SMTP/Provider/PDF/OCR/production readinessยังไม่ได้ตรวจรอบนี้.

**NEXT TASK:** แก้ HTML option typoและตรวจITdropdownในขอบเขตแยก; พัฒนา public company-searchเมื่อได้รับrequirementชัดเจน; ตรวจDocker/pgAdminในenvironmentที่เข้าถึงได้ตามสิทธิ์. หยุดงานรอบนี้หลังFocusedFixesและเอกสาร ไม่เริ่มfeatureหรือแก้สิทธิ์เอง.

## Previous Development Verification — 13 พฤศจิกายน 2026 ก่อนแก้ไข

**DEVELOPMENT ONLY / PARTIAL VERIFICATION — ยังไม่ผ่านการตรวจทั้งระบบ.** ผู้ใช้ลบ `.local-db-backups/` และ `.local-dev-accounts/` ออกจาก Local Workspace แล้ว; ตรวจ `Test-Path` รอบนี้ไม่พบทั้งสองโฟลเดอร์. ไม่สร้างกลับ ไม่ Backup/Restore/Seeder/สร้างบัญชี/เปลี่ยนข้อมูลจริง. ผู้ใช้อนุญาต safe static/unit/integration/health/read-only DB checks เฉพาะงานนี้ แทนข้อห้ามทดสอบทั่วไปเฉพาะรอบนี้; Manual Acceptance และงานครั้งถัดไปยังเป็น User-Owned Testing ตาม AGENTS.md.

หัวข้อนี้บันทึกผล Full Verification ก่อนแก้ไข; สถานะหลังแก้ไขดู Current HTML / IT Dropdown Verification และผลแก้NLP/Harnessด้านบน. ผลนี้แทนคำกล่าวเรื่องไฟล์ private ที่ยังเก็บอยู่/เปิด credential viewer ได้/จำนวนตาราง/ผล smoke ในหัวข้อที่เก่ากว่า. ประวัติเก็บไว้ตามวันที่ ไม่ใช่หลักฐานว่า archive, vault, receipts หรือ restore databases เดิมยังมีอยู่. คำสั่ง migration/runner ที่ถูกลบในส่วน Historical Project Documentation ไม่ใช่คำสั่งใช้งานปัจจุบัน.

### Architecture / Roles / API ที่มีใน Source

```text
Browser → Vite multipage / Axios → Express API → Sequelize Models → PostgreSQL 16
                                            → Private Storage (intern_storage)
                                            → FastAPI NLP / PDF / OCR
Developer Console บน host แยกจาก Application Super Admin
```

- Frontend: `frontend/vite.config.js`, HTML/CSS/JavaScript, shared feedback/session components. API base คือ `VITE_API_URL`; fallback `http://localhost:5000`.
- Backend: `backend/src/app.js`; startup โหลด Models/Associations และ authenticate ฐานข้อมูล ไม่มี automatic sync/alter/seed. Models + `models/schemaIntegrity.js` + `db/postgresIntegrity.js` เป็น schema contract; ไม่มี migration runner ปัจจุบัน.
- Login หลัก `/login.html` → `POST /api/auth/unified-login`; Backend ระบุ Student/Teacher/Head/Staff และ Super Admin context จาก actor จริง. Head ใช้ Teacher/DB flag/department scope; JWT signature/live actor/RBAC ตรวจที่ Backend. Frontend decoding ไม่ใช่การให้สิทธิ์. Google อยู่เหนือ Email/Password และไม่มี Role Selector.
- API families: `/api/auth`, `/api/student-profile`, `/api/teachers` (รวม dashboard/project-documents/profile image), `/api/department-head`, `/api/staff`, `/api/admin`, `/api/coop-requests`, `/api/student-coop`, `/api/coop-topic-exams`, `/api/internship-logs`, `/api/supervision`, `/api/coop-activities`, `/api/mentors`, `/api/mentor-verification`, `/api/job-submissions`, `/api/job-matches`. ดู routes/controller จริงสำหรับ method/payload; ไม่ใช่ทุก endpoint เปิด anonymous.
- Workflow เดิม: Student → `advisor_review` → Class Advisor → `department_head_review` → Head → `approved`; Staff จัดการเอกสารตาม scope เดิม. Approval ไม่ใช่ Academic Certification; Project Advisor และ Mentor capabilities แยกกัน.
- NLP: Python 3.11 image / FastAPI / Pydantic, TF-IDF + cosine similarity, PyThaiNLP; Chatbot train Logistic Regression จาก FAQ ตอน lifespan startup ในหน่วยความจำ. PyMuPDF/Pillow/pytesseract/Tesseract tha+eng รองรับ PDF/OCR. ไม่มี LLM ใน implementation นี้.
- NLP endpoints: `GET /health`; `POST /api/v1/resume-match`, `/api/v1/job-matches`, `/api/v1/chat`, `/api/v1/resume-ocr`, `/api/v1/profile-pdf`. Backend matching client ใช้ `/job-matches` contract `job-matching.v1`; profile PDF/OCR ใช้ private internal processors. Website Chatbot ใน `frontend/src/pages/index.js:569` ยังตอบข้อความระหว่างพัฒนาด้วย timer ไม่ได้ bridge ไป `/chat`.

### Development Setup / Service Connections

ใช้ Environment เดิมของผู้ใช้; รอบนี้ไม่ได้แก้หรือพิมพ์ค่าลับ. Checkout ใหม่ต้องเตรียม Environment จาก `.env.example` ของแต่ละ service โดยไม่ทับไฟล์เดิม. Root `.env` ใช้ `POSTGRES_PASSWORD`; Backend ใช้ `DB_*`, `JWT_SECRET`, origin/storage/SMTP และ NLP configuration; Frontend ใช้ `VITE_API_URL` และ public values เท่านั้น. ห้ามใส่ secret ใน `VITE_*`.

| Compose service | Container / Local port | Mount / dependencies จาก Compose |
|---|---|---|
| `postgres` | `intern_postgres` / `127.0.0.1:5432` | PostgreSQL 16; `postgres_data:/var/lib/postgresql/data`; มี healthcheck |
| `backend` | `intern_backend` / `127.0.0.1:5000` | `./backend:/app`, isolated node_modules, `intern_storage:/app/storage`; รอ PostgreSQL healthy และ NLP started |
| `frontend` | `intern_frontend` / `127.0.0.1:5173` | `./frontend:/app`, isolated node_modules; depends on Backend |
| `nlp-service` | `intern_nlp_service` / `127.0.0.1:8000` | `nlp-service/app` และ `data`; Uvicorn reload; ไม่ได้กำหนด healthcheck ใน Compose |
| `pgadmin` | `intern_pgadmin` / `127.0.0.1:5050` | `pgadmin_data`; รอ PostgreSQL healthy |

Compose ใช้ default network/service DNS: Backend DB host `postgres`, NLP base `http://nlp-service:8000`. บน host ใช้ Local mapped ports; matching/profile PDF ต้องตั้ง `NLP_SERVICE_BASE_URL` ให้เหมาะกับตำแหน่งรัน. OCR client มี fallback `http://localhost:8000` ต่างจาก matching fallback จึงควรกำหนด NLP base ให้ชัดเจน. ไม่แก้ configuration ในงานนี้.

คำสั่งเริ่ม Development ด้านล่างเป็นคู่มือให้เจ้าของเครื่องใช้เมื่อพร้อม ไม่ใช่คำสั่งที่รันในงานตรวจนี้; ไม่ initialize ฐานข้อมูลหรือสร้างบัญชีให้อัตโนมัติ:

```powershell
# Repository root; ใช้ Environment/ฐานข้อมูลเดิม ไม่ reset/seed
docker compose config --quiet
docker compose up -d postgres nlp-service pgadmin backend frontend

# ทางเลือกบน host เมื่อมี dependencies และ Environment พร้อมแล้ว
npm.cmd --prefix backend run dev
npm.cmd --prefix frontend run dev
# NLP: เข้า nlp-service และใช้ Python environment ที่ติดตั้ง requirements.txt แล้ว
# python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

ห้ามรัน host services ชนกับ ports ของ Compose. Host Node ที่ตรวจคือ 24.11.1, Python 3.14.0; Python ตัวนี้ไม่มี NLP requirements ติดตั้ง จึงยังใช้เริ่ม NLP บน host ไม่ได้. ไม่ติดตั้ง dependencies ในงานนี้. Dockerfiles ประกาศ Backend Node20 / Frontend Node22 / NLP Python3.11; ไม่ยืนยัน runtime versions ภายใน containers เพราะ Docker API ถูกปฏิเสธสิทธิ์.

### ผลตรวจจริงรอบ 13 พฤศจิกายน 2026

| Component | Static Check | Runtime | Integration | Issues / limits |
|---|---|---|---|---|
| Frontend | JS parser ผ่าน; literal relative imports ไม่พบไฟล์ขาด; HTML พบลิงก์ขาด 3 ตำแหน่งไปหน้าเดียว | HTML หลัก 9 URLs ตอบ 200; ไม่ใช่ Browser execution | Unit/DOM substitutes 14 PASS / 1 FAIL | Build BLOCKED; Browser/responsive/session จริง NOT TESTED |
| Backend | โหลด routes/models/associations ใน isolated harness ผ่าน | `/` และ `/health/db` 200; safe suites 33 PASS | Read-only DB และ host-side Backend NLP client ผ่าน | Startup ของ process/container ใหม่และ authenticated business workflows NOT TESTED |
| NLP Service | Python AST 32 files ผ่าน; อ่าน schemas/services/handlers | health/resume-match/chat และ invalid-payload probes ทำงานตามกรณีที่ระบุ | 7 synthetic contract probes: 6 PASS / 1 FAIL รวม actual Backend client จาก host | Legacy `/resume-match` คืน 500 เมื่อไม่มี vocabulary; PDF/OCR execution NOT TESTED |
| PostgreSQL | โหลด 58 Models/Associations; SELECT metadata พบ 58 public tables และไม่ขาด Model columns | PostgreSQL 16.15; `BEGIN READ ONLY` ยืนยัน read-only แล้ว ROLLBACK | Backend health/db และ direct Local connectivity ผ่าน | ไม่ตรวจ account rows; ไม่รับรองชนิด/constraints/triggers/transaction behavior ทั้งหมด |
| Docker Compose | `docker compose config --quiet` exit 0; อ่าน ports/mounts/startup dependencies | `docker compose ps` BLOCKED: named-pipe permission denied | Internal container DNS/network/mount state ไม่ได้ยืนยัน | pgAdmin Local `/login` คืน 401 JSON จึงยังไม่ยืนยันว่า UI ใช้งานได้ |
| Authentication | Unified roles/ambiguity, JWT/live actor/admin guards ผ่านใน mocks; Google อยู่เหนือ form | Anonymous GET ของ Student/Teacher/Head/Staff/Admin `/me` ทั้ง 5 คืน 401; Google config 200 enabled=true/onboardingEnabled=true | ไม่มี real-account login/provider E2E | ไม่เปลี่ยน flags; Google challenge/login และ Admin login อาจบันทึก nonce/audit จึงไม่รัน |

รายละเอียดขอบเขตหลักฐาน:

- V8 parse แบบไม่ execute: **352 JS/CJS/MJS files** (Backend src/tests/scripts, Frontend src/tests/config, Developer Console src); ESM110/CJS242. ตรวจ literal relative JS imports/requires **680 references** ไม่พบ unresolved; ไม่ใช่หลักฐานว่า dynamic paths/ทุก external dependency/ทุก branch ทำงานครบ. `node --check` แบบ child process ถูก `spawn EPERM` จึงใช้ parser ใน process โดยไม่โหลด application.
- HTML literal links/assets: **17 files / 134 references** พบ missing `search_company.html` ที่ `frontend/index.html:41,125` และ `frontend/src/recruit_student/recruit_student.html:26`. Live URL คืน 200 แต่เนื้อหาเหมือน `/index.html` ทุก byteจาก Vite fallback; ไม่ใช่หน้าค้นหาที่มีจริง.
- Existing safe tests รวม **48 tests: 47 PASS / 1 FAIL**. Backend33/33; Frontend14/15. อ่าน Source/side effects ก่อนรัน; mocks/SQL guards ไม่เขียน Development Database. จำนวนนี้ไม่ใช่ Full Regression/Manual Acceptance.
- Frontend FAIL: `frontend/test/coopRequestReadiness.test.js:51` ใช้ `new Function` ตัดเฉพาะ `applyCoopCompany` แต่ไม่เตรียม `syncCoopCompanyFieldOwnership` จึงเกิด ReferenceError. Helper มีจริงใน `student_coop.js:3168` และถูกเรียกที่3196; หลักฐานชี้ test harness ไม่ทัน Source ไม่ใช่การขาด helper ในหน้าเว็บ. ไม่แก้ tests/Source ในงานนี้.
- NLP probes: resume-match valid200/invalid422, job-matches invalid422, chat valid200/invalid422 และ actual `nlpMatching.client.js` จาก host ไป live `/job-matches` ผ่าน schema/id/rank/score assertions. กรณี resume-match ข้อความ `the and` กับประกาศที่เหลือแต่ stopwords คืน **500**: `matching_service.py:16` เรียก `similarity.py:19` โดยไม่มี empty-vocabulary fallback; canonical `/job-matches` มี fallback ใน Source แยกต่างหาก. Chat200 ยืนยันรูปแบบ response ไม่ใช่ FAQ accuracy.
- Frontend build ใช้ Vite build API ของ dependency ที่มีอยู่ ตั้ง `write:false, emptyOutDir:false` เพื่อไม่ทับ `frontend/dist` เดิม. Default config loader ติด `spawn EPERM` และ Tailwind native `.node` dependency ถูกอ่านเป็น UTF-8; การลอง configLoader runner แยกก่อนหน้านั้นติด `require is not defined`. ยังไม่มี build สำเร็จ ไม่เปลี่ยน loader/config/dependencies เพื่อให้ผ่าน.
- Browser smoke/responsive/keyboard/preview/download จริงไม่รัน: subprocess ถูกจำกัด และการเปิด Login แบบ execute JS เมื่อ Google enabled อาจสร้าง challenge ใน DB. ไม่สร้าง temporary browser profile หรือข้อมูลบัญชี. SQL/Development integration suites ที่อาจเขียนข้อมูลถูกข้าม **NOT TESTED** แม้มี rollback; ไม่มีการเปิด opt-in flags.

### Testing Commands ปัจจุบัน

ชุดทดสอบต่อไปนี้รันจริงในรอบนี้ โดยใช้ working directory ของ Backend/Frontend ตามชุดและแต่ละไฟล์ใช้ process แยก; ตัวอย่างด้านล่างเขียน path สำหรับเรียกจาก Repository root (ไม่ใช้ glob รวม SQL suites):

```powershell
node backend/test/securityWaveA.test.js
node backend/test/coopAcademic.test.js
node backend/test/coopTopicExams.test.js
node backend/test/mentorVerificationEmail.test.js
node frontend/test/coopAcademic.test.js
node frontend/test/coopRequestReadiness.test.js
node frontend/test/mentorVerification.test.js
node --test-name-pattern '^(permission,|existing four roles|all admin endpoints|signed admin JWT)' backend/src/services/superAdmin.test.js
node --test-name-pattern '^membership evidence' backend/src/services/teacherAdminGrant.test.js
```

Read-only smoke ที่ใช้ได้จริง: `GET http://127.0.0.1:5000/`, `/health/db`, `/api/auth/google/config`; NLP `GET http://127.0.0.1:8000/health`. การรันซ้ำครั้งถัดไปต้องได้รับสิทธิ์ตาม AGENTS.md ของงานนั้น. Frontend build script ที่มีจริงคือ `npm.cmd --prefix frontend run build` แต่ยังไม่รับรองว่า build ผ่านบนเครื่องมือที่จำกัดสิทธิ์นี้; รอบนี้ใช้ API แบบไม่เขียน output ตามรายละเอียดข้างต้น. ไม่มี `npm test`, migration scripts หรือ isolated runner เก่าตามประวัติให้ถือเป็นคำสั่งปัจจุบัน. `nlp-service/tests/` ไม่มี test source ปัจจุบัน และ pytest/httpx ไม่ได้ประกาศใน requirements; ผล pytest เก่าไม่ใช่ผลรอบนี้.

### ผลกระทบของ Local Folders ที่ลบแล้ว

ไม่พบ runtime dependency จาก Frontend/Backend startup/NLP มายังสองโฟลเดอร์. PostgreSQL และ private storage อยู่คนละ named volume ตาม Compose; credential hashes/roles เป็นข้อมูล DB ไม่ใช่ vault บน host. ไม่ได้ยืนยันรหัสผ่านของบัญชีใดในงานนี้.

| Script / reference | หน้าที่และ path ที่พึ่งพา | ความจำเป็นต่อเว็บ / ผลเมื่อไฟล์หาย |
|---|---|---|
| `backend/src/seeders/prepareDevelopmentAccounts.ps1:6,7,31` + `developmentCredentialVault.ps1:3,34`; JS wrapper `prepareDevelopmentAccounts.js:5` | Viewer/Verify/Fixtures อ่าน DPAPI vault; Apply สามารถสร้าง vault ใหม่ | Development only; viewer/verification เดิมใช้ไม่ได้. **ห้ามรัน Apply/Protect เพื่อสร้างกลับ** |
| `backend/src/seeders/teacherDashboardDemoSafety.js:29,179` ผ่าน `teacherDashboardDemo.js:211` | สร้างชื่อ receipt แบบ database+teacher แล้วอ่านเพื่อ Verify/Apply | Development only; Verify ขาด receipt; Apply อาจสร้าง directory/pending และเปลี่ยน DB จึงไม่รัน |
| `backend/src/seeders/teacherDashboardDemoCompletion.js:199` | ใช้ receiptPath ของ Safety และอ่าน original receipt | Development only; completion เดิมขาดหลักฐานและใช้ต่อไม่ได้ |
| `backend/src/seeders/teacherSearchDemo.js:12,243,253` | อ่าน Teacher Search receipt; Verify บังคับ COMMITTED receipt | Development only; Verify ใช้ไม่ได้; ไม่ replay/recreate fixture |
| `backend/scripts/prepareSyntheticCleanup.cjs:79` | enumerate receipt names จาก directory | Historical maintenance; อ่าน directory ที่หายไม่สำเร็จ; ไม่เกี่ยวกับ API startup |
| `backend/scripts/analyzeSyntheticCleanup.cjs:56` | อ่าน receipt ตาม inventory และเทียบ digest | Historical maintenance; ขาด receipt evidence; ไม่รัน script เพราะมี artifact/storage backup side effects |
| `backend/src/db/prepareSuperAdmin.ps1:24` + `prepareSuperAdminSchema.js:25` และ `prepareTeacherAdminSchema.js:6` | สร้าง/ตรวจ fresh encrypted backup proof ก่อน DDL | Maintenance only; `npm run admin:prepare` สามารถสร้างโฟลเดอร์กลับ จึงห้ามรันในขอบเขตนี้. Runtime Super Admin ไม่อ่าน archive เก่า |
| `docs/testing/COOP_REQUEST_MANUAL_TEST_CHECKLIST.md:9,14` และ README ประวัติ | ลิงก์บัญชี private/คำสั่ง viewer และ archive paths | Checklist59กรณียังอยู่ แต่ prerequisites/private roster/viewer เหล่านี้ใช้ไม่ได้แล้ว; ไม่แก้ checklist นอกสองไฟล์ที่อนุญาต |

Scripts/receipts/keys/Chrome profiles/builds ที่เคยอยู่ภายใน `.local-db-backups/` หายไปพร้อมโฟลเดอร์ตามคำสั่งผู้ใช้. ไม่สามารถใช้เป็น local recovery หรือเรียก private harness เดิมได้อีก; ไม่สร้างทดแทน. การมี script ใน Source ไม่ได้หมายความว่าปัจจุบันยังถูกเรียกอัตโนมัติ. Ignore rules เดิมคงไว้; ไม่เปลี่ยน `.gitignore`.

### Remaining Issues / Pending Decisions / NEXT TASK

1. แก้ test harness ของ company selection ให้เตรียม helper/dependencies ปัจจุบัน แล้วรันทดสอบเฉพาะงานที่อนุญาต.
2. กำหนดและแก้พฤติกรรม empty vocabulary ของ legacy `/resume-match` ให้คืนผลว่างหรือ validation error ตาม contract แทน500; canonical job matching กับ legacy endpoint เป็นคนละเส้นทาง.
3. ตัดสินใจปลายทางลิงก์ `search_company.html` ที่ไม่มีจริง โดยใช้ workflow ที่มีอยู่หรือมอบหมายหน้าใหม่อย่างชัดเจน; ไม่เพิ่ม feature ในงานตรวจนี้.
4. Build/Browser/pgAdmin/container network และ authenticated business flows รวม Upload/Preview/Download/PDF/OCR/Google provider/SMTP/concurrency ยังต้องตรวจใน environment ที่มีสิทธิ์และขอบเขต non-mutating เหมาะสม. ไม่ถือ HTTP200 ของ HTML เป็น UI acceptance.
5. Website Chatbot bridge ยังไม่พัฒนา; การเชื่อมเป็นงาน feature แยก ไม่รวมในการแก้ error ของ NLP. ไม่มี Pending Decision ให้กู้ vault/backup: ผู้ใช้สั่งลบทิ้งและห้ามสร้างกลับแล้ว.

**NEXT TASK:** มอบหมายแก้ confirmed issues ข้างต้นเป็นขอบเขตถัดไป; รอบนี้หยุดที่ verification + documentation. ไม่แก้ Source/RBAC/Schema/Environment/Volumes ไม่สร้างบัญชีหรือเปิด flags ไม่ Commit/Push. ดูรายละเอียดการตรวจรอบนี้ใน [Current Handoff](HANDOFF_fitm-intern.md).

## Teacher/Head Profile — 12 พฤศจิกายน 2026

หน้า Account แก้ชื่อไทย/อังกฤษ, `academic_title` และ `major` จาก Catalog จริงผ่าน `PATCH /api/teachers/me` หรือ `/api/department-head/me`; ตัวเลือกอ่านจาก `GET .../me/profile-options`. ภาควิชายังคงเดิม เพราะมีผลต่อ Authorization Scope และยังไม่มีนโยบาย/Flow อนุมัติการย้ายภาควิชา. Protected Fields และ Google Linking เดิมไม่เปลี่ยน.

รูปใช้ `GET/POST/DELETE .../me/profile-image` ผ่าน Teacher JWT/Live Actor/Owner guards; POST multipart ช่อง `profile_image` เพียงช่องเดียว รองรับ JPG/PNG/WebP≤5MB. DELETE ไม่รับฟิลด์เลือกบัญชี/ไฟล์ ตั้งเฉพาะอ้างอิงของOwnerเป็นNULLในTransactionและคืน `{success:true,data:{deleted:true,profile_image:null}}`; ปุ่มกล้องมุมAvatarเปิดSharedContentModal“จัดการรูปโปรไฟล์”พร้อมPreview/เปลี่ยนรูปสีน้ำเงิน/นำรูปออกแบบGhostแดงและConfirmationซ้อน โดยไม่มีปุ่มลบหรือพื้นที่จัดการรูปถาวรในSummary. สำเร็จแล้วปิดModalและอัปเดตSummary/Header; APIErrorยังคงรูปเดิม. ไฟล์อยู่ Private Storage `teachers/<authenticated actor>/profile` และ Browser อ่านด้วย Authorization Header แล้วสร้าง Blob URL ชั่วคราว ไม่เปิด Public Storage URL/ไม่เก็บ Base64 ใน DB. รูปเดียวใช้ใน Teacher/Head Summary และ Header; รูปเดิมยังเก็บไว้ตามRetentionPolicyทั้งตอนเปลี่ยนและลบการอ้างอิง ไม่ทำPhysicalUnlink/Cleanup.

**Schema status — 12 พฤศจิกายน 2026 เวลา23:44 Asia/Bangkok:** ติดตั้ง nullable `public.teachers.profile_image varchar(255)` ใน Development `intern_system` บน PostgreSQL16.15แล้ว ตามคำสั่งผู้ใช้อนุญาต DDL โดยไม่สร้าง Backup ใหม่. ก่อนติดตั้ง Metadataยืนยันไม่มีคอลัมน์; หลังCommitยืนยันชนิด/ความยาว/Nullable/ไม่มีDefaultตรงModel. เพิ่มคอลัมน์ภายในTransactionด้วยLockTimeout5วินาที/StatementTimeout15วินาที ไม่แก้ข้อมูลบัญชี/Reset/Sync และไม่มีAuto-DDLในStartup. ฐานอื่นยังต้องเพิ่มคอลัมน์ให้ตรงModelก่อนใช้ Backend รุ่นนี้ โดยอ้าง SQL `backend/src/db/teacherProfileImage.sql`; ไม่ถือว่าฐานอื่นติดตั้งแล้ว. รูปเก่า/ไฟล์ที่ผลCommitไม่แน่นอนยังเก็บไว้ ไม่มีRetentionCleanup. Login/Uploadจริงยังรอผู้ใช้ทดสอบ. **Tests: NOT RUN — USER-OWNED TESTING.**

## Teacher Dashboard Action Center — 11 พฤศจิกายน 2026

Dashboard แยก 3 KPI: คำร้อง `advisor_review` ของนักศึกษาที่เป็น Class Advisor, คำขอ `pending` ที่ส่งถึง Teacher และนักศึกษาสหกิจในความดูแลผ่าน `coop_advisor_teacher_id`. กด KPI สองใบแรกเพื่อกรองงาน Pending ใน Action Center; ใบนักศึกษาเปิดเมนูเดิม. งานมีตัวกรองทั้งหมด/คำร้อง/คำขอ หน้าละ5รายการ เปิดรายละเอียดตาม Request ID เดิม และใช้สี Teacher รอบ3. Navbar/Sidebar/Account Menu และเมนูอื่นคงเดิม.

เพิ่ม Read-only `GET /api/teachers/dashboard?type=all|coop|advisor&offset=<multiple-of-5>` ผ่าน Auth/Live Teacher guards เดิม. คืน Safe Teacher Identity, Summary, Task Rows และ Pagination จาก Snapshot เดียว; เรียงวันที่ส่งเก่าสุดก่อน/NULLท้าย/ประเภท/ID ก่อน LIMIT/OFFSET ที่ Database. ไม่เปลี่ยน List API/Sort/PageSize ของเมนูอื่น. ยังไม่มี API นัดนิเทศรวม จึงคงทางลัดดูรายนักศึกษาและแสดงข้อจำกัดอย่างตรงไปตรงมา ไม่มี Mock Calendar/Deadline.

**SOURCE UPDATED / NOT TESTED. Tests: NOT RUN — USER-OWNED TESTING. Database Changes: NONE.** Restart Backend/Reload Frontend ตามปกติเพื่อรับ Route/CSS ใหม่. ดู [Design + Source Notes](docs/development/TEACHER_DASHBOARD_ACTION_CENTER.md) และ [Manual Acceptance 20 ข้อ](docs/testing/TEACHER_DASHBOARD_ACTION_CENTER_MANUAL_ACCEPTANCE.md). Round3 ยังรอ Manual Retest ตามเดิม. **NEXT TASK: User Manual Chrome Acceptance.**

## Previous implementation: Teacher Color Design System + Bugfix Round 3 — 11 พฤศจิกายน 2026

Teacher Workspace ใช้ Modern Academic Blue tokens จาก `teacher_design.css` เฉพาะ Teacher: Search/Save สีน้ำเงิน, Approve/Accept/Complete สีเขียว, Reject สีแดง, Secondary พื้นขาว; Badge ใช้สถานะจริงและสีเดียวกันทั้ง Card/Table พร้อม Focus/Disabled/Loading/Reduced Motion. ดู [Tokens + Contrast Arithmetic](docs/development/TEACHER_COLOR_DESIGN_SYSTEM.md); ยังไม่รับรอง WCAG/Responsive จาก Browser.

แก้ SQL สถานะ Coop ENUM เทียบ text ให้เป็น text ทั้งสองด้าน โดยคง Ownership/Filters/Sort/Pagination/DTO. แยก Error โหลดรายการ/รายละเอียด/บันทึกและใช้ Retry เดิม. Advisor Operational List “ทุกสถานะของคำขอปัจจุบัน” รวม pending/confirmed/rejected เท่านั้นก่อน Count/Pagination; ไม่มี Superseded Filter, confirmed ใช้ “ยืนยันรับเป็นที่ปรึกษาแล้ว”. ประวัติ/Detail/สถานะใน DB และ Accept/Reject เดิมคงไว้. ข้อนี้แทนการแสดง Superseded ใน List จาก Round1–2 ด้านล่าง.

ผลผู้ใช้ล่าสุดตามคำสั่ง Round3: PASS4 / FAIL3 / NOT TESTED3; การแก้ Source ยังไม่เปลี่ยนผลเหล่านี้. **Tests: NOT RUN — USER-OWNED TESTING; Database/Schema/Seed Changes: NONE.** ดู [Audit + Root Cause](docs/audits/TEACHER_UX_COLOR_ROUND3_2026-11-11.md) และ [19-case Manual Retest](docs/testing/TEACHER_UX_COLOR_ROUND3_MANUAL_RETEST.md). **NEXT TASK: User Manual Chrome Retest.**

## Previous: Teacher Bugfix Round 2 — 11 พฤศจิกายน 2026

Teacherคำร้องสหกิจเริ่มที่“ทุกสถานะ (ไม่กรอง)” ค้นชื่อ/รหัส/บริษัท/ตำแหน่งข้ามสถานะภายใต้ClassAdvisorScopeเดิม. DashboardยังเรียกPendingQueueตามเดิม. Advisorใช้Label“คำขอเดิม (มีคำขอใหม่แทน)”สำหรับsuperseded โดยไม่เปลี่ยนStatus/Actions. ทั้งสามเมนูใช้PageSize10(default)/25/50, จำแยกเมนูด้วย`fitm.teacher.list-page-size.<menu>`, เปลี่ยนแล้วกลับหน้า1คงFilters/Sort/View. ListUIใช้`page_size=10|25|50`ที่BackendตรวจAllowlist; LegacyboundedlimitสำหรับDashboardยังใช้ได้และไม่เปลี่ยนPendingQueue. Count/Order/Paginationยังทำที่DBก่อนแบ่งหน้า; Documentsคงขนาดหน้าเดิม.

นักศึกษาในความดูแลเปิดRead-onlySharedModalจากCard/Table/Picker แสดงชื่อ/รหัส/สาขา/ปีภาค/หัวข้อ/บริษัท/Mentor+VerifiedStatusจากDetailจริง ไม่มีAuto-scrollไปInlineForm. PopupแยกStateจากSchedule/ResultForms; ปิดไม่ล้างSelection/Drafts. ปุ่มFooterไปWorkflowเดิมเมื่อผู้ใช้กดเท่านั้น ไม่มีสร้างนัด/ส่งEmailเอง. TeacherDetailเดิมเพิ่มMajor/TopicและAcademicPeriodต่อRequestจากModelsจริง ไม่เดาข้อมูล/ไม่เปลี่ยนStudentOwnerDTO.

ผลผู้ใช้RetestRound1วันที่11พฤศจิกายน2569 **PASS7 / FAIL3**; 7PASSและข้อจำกัดเฉพาะบัญชีคงตามที่รายงาน ไม่ถือSourceรอบ2เป็นผลผ่านใหม่. **Tests: NOT RUN — USER-OWNED TESTING; Database/Schema/Seed Changes: NONE.** ไม่ตรวจDB/API/Browserรอบนี้; CrossTeacherยังNOT VERIFIED. ดู [Round2Findings](docs/audits/TEACHER_BUGFIX_ROUND2_2026-11-11.md) และ [FocusedRetest](docs/testing/TEACHER_BUGFIX_ROUND2_MANUAL_RETEST.md). **NEXT TASK: User Manual Chrome Retest.**

## Teacher Manual Acceptance Bugfix Round 1 — 11 พฤศจิกายน 2026

ผลผู้ใช้53ข้อ: PASS27 / FAIL10 / BLOCKED16; Sourceรอบนี้แก้DashboardTaskให้เปิดRequestที่เลือก, Advisorทุกสถานะ(default)/superseded+Search+ScopedDetail, และนักศึกษาในความดูแลเลือก10(default)/25/50ต่อหน้าด้วยBackendCount. Documentsเพิ่มตัวเลือกไม่ระบุปี (ทุกปี/ทุกภาคยังรวมUnknown) และใช้PDF.jsCanvasในSharedModalแทนNativePDFiframe/Popup. Rendererใช้Libraryที่มีในBackendอยู่แล้ว ผ่านviewer-assetsแบบAllowlist เฉพาะLibrary/Fonts ไม่เปิดPrivateStorage; เอกสารยังผ่านAuthenticatedGET/Ownershipเดิม. ไม่มีPackage/Schema/Seed/Data writes.

TargetedSTU-01ที่อนุญาตโหลดServiceจริงdefault10+หน้าถัดไป8รวม18IDไม่ซ้ำ/total18, มีStructuredPeriod12/Unknown6; Mentor18รายไม่พบDuplicateRelationship/RepeatedNamesในScopeที่อ่าน. Book/Posterชื่อprofile.pdfมีMetadataถูกCategory/OwnerPath ไม่ย้ายไฟล์จากชื่อเพียงอย่างเดียว. หลักฐานนี้ไม่แทนChrome/APIJWT/FileBytesAcceptance. **Tests: NOT RUN — USER-OWNED TESTING** สำหรับการทดสอบอื่น; ยังไม่เปลี่ยนFAIL/BLOCKEDเป็นPASS. ดู [Root Causes / Evidence](docs/audits/TEACHER_BUGFIX_ROUND1_2026-11-11.md) และ [Focused Chrome Retest](docs/testing/TEACHER_BUGFIX_ROUND1_MANUAL_RETEST.md). **NEXT TASK: User Manual Chrome Retest.**

## Teacher Project Documents — 11 พฤศจิกายน 2026

Teacher → เอกสารโครงการ เปิดรายชื่อนักศึกษาสหกิจที่ `coop_advisor_teacher_id` ตรงกับบัญชีอาจารย์ พร้อมค้นหาชื่อ/รหัส/หัวข้อ/บริษัท, ปี/ภาค1–2/IT–INE, Sort, Backend Pagination และ Card/Table Preference แยกเมนู. เลือกนักศึกษาเพื่อโหลดรายละเอียดเล่มโครงการ PDF+Overleaf, โปสเตอร์ PDF/PNG/JPEG+Drive และ CO-09 PDF/ลิงก์/สถานะจริงแบบอ่านอย่างเดียว. Class Advisor หรือ Super Admin อย่างเดียวไม่มีสิทธิ์เข้าถึงเอกสารทุกคน.

เพิ่ม GET-only `/api/teachers/project-documents/students` และ Detail/Preview/Download ภายใต้ Student ID โดยใช้ Teacher JWT เดิมและตรวจ Ownership ทุกคำขอ. ไฟล์ผ่าน Private Storage เดิม, Revision Check, MIME/Size/Signature และ no-store/nosniff/CSP; Frontend โหลดเป็น Blob ผ่าน Authentication และล้างเมื่อปิด/ออกเมนู/Session เปลี่ยน. ไม่เปิด Public Storage หรือส่ง Token ใน URL. List โหลด Summary แบบ Bulk; Detail/Bytes โหลดเมื่อเลือก. ลิงก์ภายนอกใช้ Validator เดิมและสิทธิ์แชร์ของเจ้าของเอกสาร; CO-09 legacy HTTPS แสดงชื่อ Host ตาม Compatibility เดิม.

ปี/ภาคเป็นรอบสหกิจจาก Structured Data เดิม ไม่ใช่ปีของไฟล์: เอกสารปัจจุบันยังไม่มี Historical Academic Period Mapping. ไม่ทราบให้แสดงไม่ระบุ. **Database Changes: NONE; SOURCE UPDATED / PENDING USER TESTING.** ดู [Source Audit](docs/audits/TEACHER_PROJECT_DOCUMENTS_AUDIT_2026-11-11.md) และ [Manual Chrome Acceptance](docs/testing/TEACHER_PROJECT_DOCUMENTS_MANUAL_ACCEPTANCE.md) (ทุกข้อ NOT TESTED). **Tests: NOT RUN — USER-OWNED TESTING.** งาน Search/Filter/Card/Table/Sorting ก่อนหน้ายังรอผู้ใช้ทดสอบเช่นเดิม.

## Teacher Search / Academic Periods — 11 พฤศจิกายน 2026

Teacher → คำร้องสหกิจศึกษา / คำขอเป็นที่ปรึกษา / นักศึกษาในความดูแล เพิ่ม Toolbar ค้นหา ปีการศึกษา ภาคเรียน 1–2 และสาขา IT/INE พร้อมตัวกรองสถานะเดิม ค้นหา/ล้างตัวกรอง และยอดรวมจาก PostgreSQL. คำค้นและตัวกรองทำงานแบบ AND ก่อน Pagination ฝั่ง Backend; ไม่กรองเฉพาะข้อมูลที่โหลดแล้ว. ปีอื่นอ่านจากข้อมูลที่ Teacher มีสิทธิ์เห็น.

ทั้งสามเมนูเพิ่มปุ่ม “รายการ / ตาราง” ข้างจำนวนผลลัพธ์ ใช้ResultSet/Actions/Detailเดิมโดยไม่FetchเพราะสลับView และจดจำแยกเมนูด้วยlocalStorageเฉพาะ`card/table` (เริ่มCardเมื่อยังไม่มีค่าหรืออ่านStorageไม่ได้). Tableเลื่อนภายในContainerบนจอเล็ก. รายชื่อนักศึกษาในความดูแลยังใช้Panelร่วมกับนัดนิเทศ/ผลนิเทศ; Fieldsที่listAPIไม่คืนแสดงไม่ระบุ และเติมบริษัท/พี่เลี้ยงจากDetailเดิมเฉพาะคนที่เปิดดู โดยไม่เรียกDetailเพื่อเติมทุกแถว. ปี/ภาคอ่านจากListDTOตามSortingด้านล่าง. ดู [Manual Card/Table Acceptance](docs/testing/TEACHER_CARD_TABLE_MANUAL_ACCEPTANCE.md). **Card/Table และSearch/Filter/Dataset35คนยังPENDING USER TESTING.**

เพิ่มSort “ใหม่สุดก่อน”(default)/“เก่าสุดก่อน”ข้างCard/Table ทั้งสามเมนู; APIรับเฉพาะ`sort=year_desc|year_asc`และเรียงปี→ภาค→วันที่→IDในPostgreSQLก่อนแบ่งหน้า โดยUnknownอยู่ท้ายเสมอ. เปลี่ยนSortกลับหน้า1โดยคงSearch/Filters/Status/ViewและโหลดBackendใหม่; เปลี่ยนViewอย่างเดียวไม่Fetch. จดจำแยกเมนูด้วย`fitm.teacher.list-sort.<menu>`เฉพาะค่าSort. ปีในDropdownมาจากscopedDBmetadataและเรียงตัวเลขจากมากไปน้อย ไม่มีรายการปีคงที่ในFrontend. Supervisionlistเพิ่ม`academicPeriod`/`academicRequestId`/`academicSubmittedAt`จากรอบสหกิจที่มีStructuredPeriodจริงในการอ่านQueryเดียว; หากมีหลายรอบ เลือกรอบแรกที่ตรงFiltersและทิศSortเพื่อแสดง ไม่เปลี่ยนข้อมูลหรือAssignment. ไม่มีStructuredPeriodคงUnknownและไม่มีวันที่ที่เดาขึ้น. ข้อมูลบริษัท/พี่เลี้ยง/Studentstatusยังมีข้อจำกัดตามเดิม. **Sorting: PENDING USER TESTING; ไม่มีSchema/Seed/Data writesในงานนี้.**

เพิ่ม `coop_academic_periods` และ nullable `academic_period_id` บนคำร้องสหกิจ/คำขอที่ปรึกษา เพื่อเก็บรอบการศึกษาแยกจากชั้นปีของนักศึกษา. ข้อมูลเดิมคง Unknown และจะไม่ตรงตัวกรองปี/ภาคที่ระบุ; ไม่อนุมานหรือ backfill จากรหัส/วันที่. APIs เดิมคงรูปแบบเมื่อไม่ส่ง `metadata=1`; Teacher lists รองรับ `search/year/semester/major` และ opt-in metadata `{rows,total,years,offset,limit}` (Coop อยู่ใน `data`). Supervision คง `students` พร้อม metadata เพิ่มเติม.

Development `intern_system.public` ติดตั้ง additive upgrade และ Seed ชุดใหม่ 35 คนแล้ว (11 พ.ย. 2026): INSERT635 / UPDATE0 / DELETE0, IT19/INE16, ปี2567=10/2568=12/2569=13; SELECT หลัง Commit ยืนยันข้อมูลเดิมไม่เปลี่ยน. แยกจาก Demo15คนเดิม. ดูคำสั่ง ความปลอดภัย และ Manual Acceptance ใน [Teacher Demo](docs/development/TEACHER_DASHBOARD_DEMO.md). ไม่มี migration runner ใหม่หรือการเปลี่ยน Schema ตอน Backend startup; การใช้งาน Source ใหม่ต้อง restart Backend ตามปกติ. **Tests: NOT RUN — USER-OWNED TESTING; UI acceptance รอผู้ใช้ทดสอบ.**

## Student Project — Overleaf / Google Drive — 9 พฤศจิกายน 2026

Student → โครงการสหกิจศึกษา ใช้ CO-09 PDF+Overleaf, เล่มโครงการ PDF+Overleaf และโปสเตอร์ PDF/PNG/JPEG+Google Drive โดยเก็บไฟล์กับ URL แยกกันใน Card เดิม. ใช้ URL parser ตรวจ HTTPS/exact hostname: Overleaf รับ overleaf.com/www.overleaf.com ทุก Path; Poster รับเฉพาะdrive.google.comทุก Path โดยไม่บังคับ File/Folder ID. จำกัด2000ตัวอักษรและไม่รับข้อมูลเข้าสู่ระบบใน URL; ไม่ fetch URL/เชื่อม Drive API/OAuth และไม่บังคับ Public. นักศึกษาตรวจสิทธิ์แชร์เอกสารเอง; รูปแบบ URL ถูกต้องไม่รับรองว่าเปิดเอกสารได้. CO-09 Legacy HTTPS เดิมยังแสดงได้ ไม่ backfill/ย้ายURL และการบันทึกใหม่ต้องOverleaf.

**Development schema installed — Runtime Acceptance PENDING USER TESTING.** ติดตั้ง `coop_project_links` ใน Development intern_system/public แล้วเมื่อ9พฤศจิกายน2026ตาม [Handoff](HANDOFF_fitm-intern.md); ไม่ยืนยัน Target อื่น. Model/integrity และ SQL แบบadditiveแยกจากStudentFile/CO-09เดิม ตาม [Schema guide](docs/database/STUDENT_PROJECT_LINKS_SCHEMA.md); เมื่อไม่มีSchemaคืน503เฉพาะlink API ไม่มีfake success. ไม่ใช้db:init/reset/sync/alterหรือmigration runnerเก่า. [Manual Retest](docs/testing/STUDENT_PROJECT_LINKS_MANUAL_RETEST.md) ทั้ง16กรณียังรอผลผู้ใช้. Book/Posterโหลดลิงก์อัตโนมัติและไม่มีปุ่มReloadแยก; หากGETล้มเหลวแสดงไทยและเก็บร่าง กดบันทึกลิงก์เพื่อลองGETอีกครั้งโดยยังไม่ส่งPUTในคลิกนั้น. Conflictยังยืนยันก่อนแทนร่างผ่านModalเดิม. ไม่อ้างผลChrome/PUTจากการอ่านSourceหรือผลDBในประวัติ.

## Job Cards / Focal Solution — 8 พฤศจิกายน 2026

การ์ดผลเดียวใช้เต็มContainer; หลายผลใช้2คอลัมน์เมื่อDesktopและContainerกว้างพอ ส่วนTablet/Mobileใช้1คอลัมน์. ปุ่มติดต่อ/เขียนคำร้องสูงเท่ากันและเรียงแนวตั้งเมื่อพื้นที่แคบ; Contact SectionขยายในCardและคงShared Confirmationก่อนเปิดฟอร์มเดิม.

**แก้ข้อมูลจริงในDevelopmentแล้วเฉพาะ Internth16858 / Focal Solution / Software Engineer (Frontend):** โทร02-107-1086, อีเมลทั่วไปinfo@focalsolution.com, เว็บไซต์https://focalsolution.com; สำนักงาน416/169 Soi Lad Phrao 87 (Chanthra Suk), Khlong Chaokhun Sing, Wang Thonglang, Bangkok 10310. ตำแหน่งเป็นWFH, จำนวนรับตามต้นทาง2, ทำงาน5วัน/สัปดาห์09:00–18:00, เบี้ยเลี้ยง **400บาท (ต้นทางไม่ระบุหน่วยชัดเจน)**. ไม่อ้างเปิดรับปัจจุบันหรือHRโดยตรง. ที่มาคือข้อมูลที่ผู้ใช้ตรวจสอบแล้วจาก[เว็บไซต์บริษัท](https://focalsolution.com/)และ[ประกาศInternth](https://internth.com/job/16858); รอบนี้ไม่ได้ค้นเว็บ.

API Matching/Browsingเพิ่ม `contact.source`, `email_source_verified`, `phone_source_verified`, `website`, `office_address`, `samples_visible`, `job_information_source` และ `work_schedule`; เก็บprovenanceในdescriptionเดิม ไม่มีSchemaใหม่. แยกหลักฐานเว็บไซต์จากemail verification/account approval. Focalแสดงtel/mailtoจริง; บริษัทDevelopmentอื่นแสดงค่าตัวอย่างเฉพาะDevelopmentพร้อมป้าย “ข้อมูลจำลองสำหรับทดสอบ” ครั้งเดียวและไม่มีtel/mailto. คงProduction fixture guardsเดิม.

Targeted correctionใช้ [correctFocalSolutionDevelopment.js](backend/src/db/correctFocalSolutionDevelopment.js) กับlocaldevelopment `intern_system/public` ผ่านtransaction/identity guards/idempotent updates: ดำเนินการแล้วCompany1/Job1/เพิ่มWFH1, บริษัทอื่นและVerification/Approvalไม่เปลี่ยน. สำหรับการseedDatabaseใหม่ให้เรียกscriptนี้จากbackendด้วย `node src/db/correctFocalSolutionDevelopment.js` หลังseedและก่อนpublisher โดยใช้process env NODE_ENV=development, DB_NAME=intern_system, DB_PORT=5432 และDB_HOSTที่อยู่ในlocalguard; รอบนี้Executeผ่าน127.0.0.1. ไม่ต้องresetหรือseedซ้ำสำหรับฐานปัจจุบัน. PublisherรองรับFocalที่แก้แล้วโดยตรวจpersisted provenance; ไม่ได้รันซ้ำเพื่อทดสอบ.

**Tests: NOT RUN — USER-OWNED TESTING. NEXT TASK: USER MANUAL RETEST.** ผู้ใช้ตรวจDesktop/Tablet/320/390px, Contact/ลิงก์/400บาท/WFH, Top10/Resume และConfirmation→ฟอร์มเดิม; ยังไม่รับรองผลRuntimeหรือResponsiveจากSourceเพียงอย่างเดียว.

## Top 10 Job Matching / Contact / Coop Request — 8 พฤศจิกายน 2026

**Development publication ทำแล้ว:** Execute [publisher](backend/src/db/publishInternthDevelopment.js) กับ `intern_system/public` สำเร็จ เปลี่ยนเฉพาะ **18 Internth jobs → published / updated18 / skipped0 / blocked0 / expiry cleared0**. ใช้manifestจากSeederเดิม ตรวจUUID/Source URL/title/quota/company/submission identityครบก่อนเขียนในtransaction/advisory lock. การPublishไม่เพิ่มบริษัท/งานและไม่เปลี่ยนCompany/Submission/verified_at/review history/University Approval/Partnership. published_atเป็นเวลาปฏิบัติการเผยแพร่ข้อมูลDevelopment ไม่ใช่วันรับรองหรือหลักฐานเปิดรับจริง. ภายหลังแก้เฉพาะFocalตามหัวข้อล่าสุดด้านบน; บริษัทอื่นยังมีcontacts/address/allowance/workdaysจำลองและHiring UNKNOWN.

- **Matching:** TF-IDF+cosineเดิม, threshold0.05/round4decimal/tie-break UUIDเดิม; คืนสูงสุด **10** ผลจริง ไม่เติมให้ครบ. Source=skills ใช้เฉพาะชื่อComputer Skillsที่Saveแล้ว+Related Skills ไม่เติมmajorIT/INE/ชื่อสาขาเข้าcandidate; สาขาแสดงเพื่อการศึกษาเท่านั้นและprogram.used_as_text=false. ไม่เพิ่มSkill Level Weight ไม่เปลี่ยนtokenization/stopwords/NLP/resume processing. source=resumeใช้ข้อความไฟล์เดิม; combinedเดิมคง65:35เมื่อมีทักษะ+Resume.
- **Development boundary:** published/unexpired queryและjob-context selectionยอมรับ18UUIDชุดนี้เฉพาะ localNODE_ENV=development+intern_system+port5432; นอกtargetนี้ยังexcludeUUIDเดิม. ไม่ลดStaff verification/review guardsหรือเปิดProductionให้ข้ามverification. คำสั่งpublicationรอบนี้แทนข้อห้ามให้fixtureเข้าMatching/selectionในหัวข้อประวัติด้านล่างเฉพาะDevelopment datasetนี้.
- **API / Browsing:** คงGET `/api/job-matches/me/source`, POST `/api/job-matches/me`, matching_source/matching_analysis/explanation. development_listingsคืน[]เพื่อcompatibility; UIใช้เฉพาะmatchesในRecommendations. SourceเดิมมีCompany autocompleteแต่ไม่มีgeneral Job Browsing endpoint จึงเพิ่มowner-protectedGET `/api/job-matches/me/jobs?q=&category=&province=&page=` ในrouter/authเดิม คืนjobs/page/limit12/totalจากPostgreSQL ไม่มีscore/rank/NLPcall. ใช้published eligibilityเดียวกัน มีsearch/title-description-company, category/province filters และpagination แยกจากTop10.
- **UX/UI:** หน้าเดิมใช้Skill Chipsแยกสาขา, loading spinner/error/retry/stale guards, Modern Cardsพร้อมอันดับ/ตำแหน่ง/บริษัท/Internth/score×100ปัด **1decimal** และprogressbar เช่น0.7825→78.3%. แสดงชื่อทักษะที่พบและรายละเอียดงานแบบสั้น; เอาformula/raw input/tokenization/weights/debug/ข้อจำกัดหลายย่อหน้าออกจากUIทั่วไป. Backendยังเก็บexplanation/actualinputsเพื่อDeveloper; renderertechnicalเดิมรักษาไฟล์ไว้แต่ไม่ใช้ในหน้าปกติ. Cards/Browsing/contactมีscoped CSS/min-width/wrap/focus/44px controlsสำหรับDesktop/Tablet/Mobile; ไม่เปลี่ยนเมนูอื่น/Branding.
- **Contacts:** Focalมีข้อมูลทั่วไปจากเว็บไซต์บริษัทตามprovenanceที่ผู้ใช้ให้ แยกจากemail verification; ใช้tel/mailtoได้ตามหัวข้อล่าสุด. อีก11บริษัทคงSyntheticพร้อมป้ายรวมในContactเฉพาะDevelopmentและไม่มีลิงก์โทร/ส่งอีเมล. Reserved example/test domainsอื่นยังถือเป็นจำลอง. รายการทั่วไปที่ไม่มีwebsite provenanceยังคืนเฉพาะemailที่มีemail_verified_atและไม่ใช่domainจำลอง; ไม่อ้างเบอร์โทรว่าverifiedโดยไม่มีหลักฐาน. ไม่เทียบemail verificationกับUniversity Approval.
- **Coop Request:** “เขียนคำร้องสหกิจศึกษา” ในRecommendationและBrowsingเปิดShared Confirmationชื่อบริษัท/ตำแหน่ง พร้อมคำแนะนำให้ติดต่อบริษัท. Cancel/Escapeไม่เปลี่ยนDraft/หน้าจอ/สร้างคำร้อง; Confirmโหลดlive published job context แล้วเปิดฟอร์มเดิมพร้อมcompany/job IDsและprefill. เริ่มสร้างคำร้องเฉพาะForm Submit. ไม่มีcheckbox/หลักฐานติดต่อบังคับ; คงAdvisor/Academic/Snapshot/Revision/RBAC/State Machineและerrorจริงเดิม. Contactที่ยังไม่ยืนยันไม่ใช่เหตุปิดปุ่ม.

Source IDs: **2868,15104,8372,17213,9656,10373,10323,12914,12910,16630,16633,16858,19736,12564,13693,2495,9249,14165**. รันpublisherจาก`backend`ด้วย `node src/db/publishInternthDevelopment.js` และprocess env development/DB_NAME=intern_system/localDB_HOST/DB_PORT=5432ตามconfigเดิม; ใช้host127.0.0.1:5432ในการExecuteรอบนี้. Rerunมีidentity guardsและไม่อัปเดตแถวที่published/date/expiryพร้อมอยู่แล้ว แต่ไม่ได้รันซ้ำเพื่อทดสอบ.

**Tests: NOT RUN — USER-OWNED TESTING.** การPublishเป็นexecution evidence ไม่ใช่ผลNLP/API/Browser/Responsive/Submit. ยังไม่ได้เรียกNLPเพื่อดูจำนวนงานที่ผ่านเกณฑ์จริง ไม่มีคะแนนที่สร้างเอง ไม่restart/build/deploy/แก้env/Commit/Push. Pending enhancement: contact provenanceสำหรับบริษัทอื่นนอกFocalและper-skill score attribution; ไม่มีpublication blockerค้าง. **NEXT TASK: USER MANUAL RETEST — TOP 10 JOB MATCHING / CONTACT / COOP REQUEST** ตาม[คู่มือ](docs/testing/JOB_MATCHING_MANUAL_RETEST.md) โดยใช้นโยบายContactล่าสุดด้านบนสำหรับFocalและsamples.

## ประวัติ — Explainable Job Matching ก่อน Top 10 — 8 พฤศจิกายน 2026

ผลแนะนำใช้ **TF-IDF + cosine similarity** จากคำหลัง lowercasing/ลบสัญลักษณ์/ตัดคำไทยอังกฤษ/กรอง stopwords ตาม Source เดิม ไม่ใช่ Semantic Model หรือ LLM. เลือกทักษะใช้ข้อความสาขา + ชื่อ Computer Skills ที่บันทึก + Related Skills; เลือก Resume ใช้ข้อความไฟล์ที่อ่านได้จริง. APIแบบเดิมไม่ระบุsourceและมีทั้งสองแหล่งยังใช้ **0.65×Profile +0.35×Resume**; ไม่เปลี่ยน Algorithm/Weights. IT/INE เป็นข้อความ major ที่ใช้ประกอบ ไม่ใช่ตัวกรองสิทธิ์/การรับรองคุณสมบัติ. ฝั่งประกาศใช้ title/category/description ไม่ใช้ชื่อบริษัท/จังหวัด/เบี้ยเลี้ยงคำนวณคะแนน.

- **Score จริง:** ช่วง0–1 แสดง×100เป็นเปอร์เซ็นต์ความคล้ายข้อความ ไม่ใช่โอกาสได้งาน. ขั้นต่ำ0.05ก่อนปัด, ปัดคะแนน4ตำแหน่ง, เรียงจากมากไปน้อย/UUIDเมื่อเท่ากัน, สูงสุด5รายการ. TF-IDF fitใหม่กับcandidate+ประกาศทั้งหมดต่อรอบ จึงเทียบคะแนนข้ามชุดงานอย่างตรงตัวไม่ได้. ถ้าไม่มีpublished candidatesจะไม่เรียกNLPและไม่มีคะแนนจำลอง; Development previewsไม่มีscore/rankเช่นเดิม.
- **API เพิ่มแบบ additive:** คง `GET /api/job-matches/me/source`/`matching_source`/`matches`/`development_listings`; ผลสำเร็จ `POST /api/job-matches/me` เพิ่ม `matching_analysis` (Algorithm/สูตรเดิม/สาขา/saved vs input skills/แหล่งข้อมูล/ข้อความที่ส่งก่อนตัดคำ/ข้อจำกัด) และ `matches[].explanation` (เหตุผล/ชื่อทักษะที่พบแบบตรง/fieldหลักฐาน/ทักษะอื่น/ข้อความประกาศที่ใช้). Resume responseเพิ่มsaved `matching_source` ด้วยเพื่อแยกข้อมูลที่บันทึกไว้จากข้อมูลที่ใช้จริง; NLP candidateยังเป็นResumeเท่านั้น. ทั้งหมดowner-only/private,no-store ไม่รับDraftหรือเก็บข้อมูลใหม่. กรณีไม่เรียกNLPใช้ computed=false และแยก prepared_input_text จากข้อความที่ส่งจริง.
- **Job Cards:** มีเหตุผลสั้น รายชื่อที่พบตรง และส่วนขยาย “ทำไมระบบแนะนำงานนี้?”; ส่วน “ข้อมูลที่ใช้วิเคราะห์รอบล่าสุด” แยก Profileที่บันทึก/ชื่อที่ส่งก่อนตัดคำ/ข้อความ Profile–Resume จริง. แสดงชื่อและระดับเดิม แต่ระดับไม่ใช้เพิ่มWeight. ตรวจชื่อแบบliteral/case-insensitive/ยุบช่องว่าง/ขอบคำ โดยไม่แปลงaliasหรือเดาsemantic; การตรวจนี้ไม่เข้าRanking/Score. Related Skillsยังเป็นfree text ไม่เดาแยกเป็นRequired Skills. Previewคงป้ายจำลองและอธิบายว่าไม่ได้ส่งคำนวณ.
- **Limitations / Pending Enhancements:** ยังไม่มีtoken/per-skill score contribution, proficiency weighting หรือsemantic alias support. ชื่อที่ส่งเป็นInputอาจถูกตัดคำ/กรองออก; การพบชื่อไม่ยืนยันข้อบังคับ/บริบทปฏิเสธ และไม่พบชื่อไม่ใช่ไม่ผ่านคุณสมบัติ. Skills/Work summaryจากประกาศไม่ใช่คุณสมบัติบังคับที่รับรองแล้ว. คำอธิบายเป็นหลักฐานข้อความและวิธีคำนวณ ไม่ใช่หลักฐานว่าระบบแม่นยำ. ไม่เพิ่ม AI API/Model/Schema/Database writes.

**Tests: NOT RUN — USER-OWNED TESTING. NEXT TASK: USER MANUAL RETEST.** ใช้ [คู่มือตรวจคำอธิบาย/คะแนนและ Expected vs Actual](docs/testing/JOB_MATCHING_MANUAL_RETEST.md) สำหรับงานเกี่ยวข้อง/ไม่เกี่ยวข้อง, exact vs similarity, Inputล่าสุด, Ranking, Resume, Preview, Keyboard/Desktop/Mobile; ผู้ใช้เป็นผู้กรอกผล ไม่รันทดสอบแทนและไม่แก้ข้อมูลเพื่อให้มีคะแนน.

## ประวัติ — Student Computer Skills → Job Matching — 8 พฤศจิกายน 2026

หน้าค้นหาสถานประกอบการอ่านทักษะที่บันทึกแล้วจาก Backend: Computer Skills อยู่ใน `StudentSkill/student_skills` (`category=computer`, `skill_name`, `proficiency`) ส่วน Related Skills ยังคงเป็นข้อความแยกใน `student_profiles.related_skills`. ไม่ใช้ค่าจากฟอร์มหรือ Draft และไม่แก้ข้อมูลทักษะเดิม. ก่อนแก้ หน้าจอและ Matching อ่าน Related Skills เพียงอย่างเดียว จึงไม่เห็น Computer Skills ที่บันทึกใน Profile.

- เพิ่ม owner-only `GET /api/job-matches/me/source` ใช้ Student authentication/actor guard เดิม คืน `{matching_source:{major,related_skills,computer_skills:[{id,skill_name,proficiency,proficiency_label}]}}` พร้อม `Cache-Control: private, no-store`. อ่านเฉพาะสาขา/Related Skills/Computer Skills ของผู้ล็อกอิน ไม่อ่านข้อมูลส่วนตัวอื่นหรือ Language Skills.
- `POST /api/job-matches/me?source=skills` อ่าน projection เดียวกันจาก Database ทุกครั้ง และคืน `matching_source` ในผลสำเร็จเพื่อให้ UI แสดงทักษะชุดที่ใช้วิเคราะห์จริง; คง `matches`/`development_listings` เดิม. `source=resume` ใช้ข้อความ Resume เป็น NLP candidate เดิม และรอบ Explainable Matching เพิ่ม saved projectionเพื่อแสดงบริบทเท่านั้น ไม่บังคับว่าต้องมี Computer Skills/ไม่ใช้ระดับคำนวณคะแนน.
- หน้าเว็บโหลดใหม่ทุกครั้งที่เปิดเมนูค้นหา; หลัง Profile บันทึก/โหลด snapshot สำเร็จจะล้าง snapshot ของ Matching และโหลดอีกครั้งเมื่อเมนูเปิดอยู่. แสดง Computer Skills หลายรายการพร้อมระดับภาษาไทย และแยกข้อความทักษะเพิ่มเติมที่เกี่ยวข้อง. แสดง “ยังไม่ได้ระบุ” เฉพาะเมื่อ Backend คืนว่าไม่มีทักษะทั้งสองประเภท; Loading/Error ไม่อ้างว่าไม่มีข้อมูล. มี sequence/session/save-version guards กัน response เก่าทับข้อมูลใหม่ ไม่เปลี่ยน Draft ใน Profile.
- Matching ใช้สาขา + ชื่อ Computer Skills ที่บันทึกจริง + Related Skills ภายใต้ text limit20,000เดิม; ชื่อ Computer Skills ซ้ำถูกใช้ครั้งเดียวในข้อความโดยไม่แก้ records. ไม่เพิ่ม Algorithm/Weight/Score. ระดับ `very_good/good/moderate/fair` แสดงเป็น ดีมาก/ดี/ปานกลาง/พอใช้ แต่ NLP `job-matching.v1` รับเฉพาะ text/resume_text และยังไม่รองรับ proficiency weighting: **Pending Enhancement** ต้องมีข้อกำหนดก่อนเพิ่ม. Language Skills/Related Skills ใน Profile คงความหมายและข้อมูลเดิม.

**Tests: NOT RUN — USER-OWNED TESTING. NEXT TASK: USER MANUAL RETEST** — ตรวจหลายทักษะ/ระดับ, Save แก้ไข/ลบแล้วกลับเมนู, Draft ที่ยังไม่ Save ไม่ปน, Related Skills อย่างเดียว/ไม่มีทักษะ, IT/INE, error/session/race และ Resume Matching เดิม. ไม่แก้ Schema/Student records/12 Companies/18 Jobs/Approval/RBAC หรือรันทดสอบ/เชื่อมฐานข้อมูลในงานนี้.

## ประวัติ — Internth Development Dataset ก่อน Publication — 8 พฤศจิกายน 2026

ใช้ [Development Seeder](backend/src/db/seedInternthDevelopment.js) นำเข้า Dataset ที่ผู้ใช้ให้มา **12 Companies / 18 Job Listings** พร้อมข้อมูลจำลองที่ผู้ใช้อนุญาต. **รันจริงวันที่ 8 พฤศจิกายน 2026 (Asia/Bangkok): Companies inserted 12 / already exists 0 / skipped 0 / failed 0; Submissions inserted 12; Jobs inserted 18 / already exists 0 / skipped 0 / failed 0.** Sequelize transaction commit สำเร็จใน `intern_system/public` โดยเพิ่มรวม **42 records**; ไม่มี update/delete/DDL. ผลนี้แทนรอบเตรียมข้อมูลก่อนหน้าที่ข้าม 12/18 เพราะ Required Fields ขาด (เก็บประวัติใน Handoff).

- **Models / Tables:** เขียนเฉพาะ `Company → companies` 12, `JobSubmission → job_submissions` 12, `JobPosting → job_postings` 18. แต่ละบริษัทใช้ Company ID และ Submission ID เดียวสำหรับงานของตน; Job.company_id ตรงกับ Submission.company_id. `JobPostingWorkMode → job_posting_work_modes` ไม่เพิ่มข้อมูลเพราะไม่ทราบ work mode; ไม่ audit ทั้งฐานซ้ำ.
- **Required Fields Completed / Synthetic:** เติม email/normalized_email/phone/address_no/district/province ตามตารางข้อมูลจำลองที่ผู้ใช้ส่งใหม่; บ้านเลขที่พร้อมถนนอยู่ใน address_no (ไม่มี street field), กรุงเทพฯ normalize เป็นกรุงเทพมหานคร. Required subdistrict ที่ยังไม่มีในข้อมูลใช้ `แขวงตัวอย่าง (Development)` หรือ `ตำบลตัวอย่าง (Development)` ตามสิทธิ์สร้าง Required Fields จำลองเพิ่มเติม. รหัสไปรษณีย์ไม่มี column จึงเก็บใน description ของงาน/Seeder. Submission ใช้ submitted_email/normalized_submitted_email จำลองเดียวกับบริษัท. Job.compensation_text เก็บอัตรา 7,000–10,000 **บาท/เดือน** ตาม Source ID ที่ผู้ใช้กำหนด พร้อมข้อความ `ข้อมูลจำลองสำหรับ Development`; work_days_per_week=5 เป็น Development estimate. ไม่ใช่ข้อมูลติดต่อ/เงื่อนไขจ้างงานจริง และไม่ส่งข้อความไปช่องทางเหล่านี้.
- **Status / Workflow:** ทั้ง Submission และ Job เริ่ม `pending_email_verification`; Company.email_verified_at, Submission.verified_at, Job.reviewed_at/published_at เป็น NULL. submitted_at/timestamps คือเวลานำเข้า ไม่ใช่วันที่บริษัทลงประกาศจริง. ไม่สร้าง verification tokens/email, company login accounts, reviewer/approval history หรือหลักฐานมหาวิทยาลัย. `pending_review → published` ของงานจริงยังใช้ workflow เดิม; ไม่ approve ข้อมูลจำลอง.
- **Duplicate Prevention:** UUIDv5 URL namespace: Job ID มาจาก `https://internth.com/job/<ID>`; Company/Submission ID มาจาก fixture key คงเดิมใน [Shared Metadata](backend/src/services/internthDevelopmentData.js). Transaction มี advisory lock เฉพาะ importer; ตรวจ Company ID/name/normalized_name/email/normalized_email และ Source UUID/URL marker ใน description ก่อน create. พบ identity conflict ให้ข้าม ไม่รวม/ทับบริษัทเดิมจากชื่ออย่างเดียว. กัน ID/URL ซ้ำใน Dataset; ไม่มี update/delete บน rerun และ PK ป้องกัน UUID ซ้ำ. **ไม่ได้รันซ้ำเพื่อทดสอบ idempotency** ตามคำสั่ง no tests; source URL marker ไม่ใช่ global unique constraint สำหรับ importer อื่น.
- **Source Metadata:** Source Internth, public internship listings, snapshot 8 November 2026; Source Verified ตามข้อมูลค้นที่ผู้ใช้ส่งมาเท่านั้น ไม่ได้ค้นเว็บ/Scrape/ตรวจหน้าประกาศซ้ำ. `Current Hiring Status: UNKNOWN / UNVERIFIED`, `University Approval: NOT VERIFIED`, `Company Partnership: NOT VERIFIED`. Skills/Work เป็นสรุปสำหรับค้นหา/จัดหมวด ไม่ใช่คุณสมบัติบังคับทุกข้อ.
- **Source Storage:** ไม่มี dedicated Source Job ID/URL columns; เก็บ `Source: https://internth.com/job/<ID>` และ Internth Job ID ใน Job.description พร้อม Skills/Work, synthetic label และข้อจำกัด. Source ID→Job UUID/Company UUID อยู่ในผล Execute Seeder และคำนวณซ้ำได้จาก Shared Metadata; mapping ชื่อ/ตำแหน่งด้านล่างคงเดิม. ไม่เพิ่ม Migration/Schema.
- **Existing API / UI:** `POST /api/job-matching/me` คง `matches` ของ published/unexpired jobs จริง และเพิ่ม `development_listings` จาก PostgreSQL เฉพาะ UUID ชุดนี้ใน local `NODE_ENV=development` + `intern_system` + port5432. แสดงเป็นตัวอย่างในเมนูค้นหาเดิมหลังเลือกวิเคราะห์จากทักษะ/Resume และผ่านการตรวจข้อมูลต้นทางเดิม; ไม่ส่งเข้า NLP ไม่สร้าง score/rank ไม่เสนอปุ่มเลือกยื่นคำร้องสำหรับตัวอย่าง. มีป้าย `ข้อมูลจำลองสำหรับ Development`, จำนวนตาม snapshot, สถานะไม่ยืนยัน และลิงก์ Internth. Company search/duplicate API เดิมเพิ่ม marker ให้บริษัทชุดนี้; รายการและที่อยู่ที่เลือกในฟอร์มติดป้ายจำลอง. ไม่ hardcode รายการบริษัทใน Frontend.
- **Production Boundary:** Seeder ปฏิเสธ target ที่ไม่ใช่ local Development; ไม่มี deploy/เขียน Production. นอก Development target, Company search/duplicate ไม่คืน UUID บริษัทชุดนี้ และไม่ส่ง development_listings. Shared published-job eligibility แยก UUID งานจำลองออกจาก matching/selection เสมอ เพื่อไม่ให้กลายเป็นประกาศจริงแม้มีการเปลี่ยน status ภายหลัง. ไม่แก้ Staff review/verification หรือ workflow งานจริง.

| Company (Dataset identity) | Source Job ID — Title (Positions) |
| --- | --- |
| บริษัท อาร์ แอนด์ ดี บีไอ จำกัด | 2868 — Data Analyst (3) |
| บริษัท กรีนวิง จำกัดและบริษัทฯ ในเครือ | 15104 — Data Analyst (1); 8372 — IT Support (2) |
| CloudEngine Digital Co. Ltd | 17213 — Network Engineer (10) |
| บริษัท ไอที สมาร์ท โซลูชั่น จำกัด (ภูเก็ต) | 9656 — Network engineer (2); 10373 — ไอที ซัพพอร์ต (IT SUPPORT) (2) |
| A-HOST Co.,Ltd. | 10323 — Cloud and System Engineer (10) |
| ฝากด้วย โลจิสติกส์ แอนด์ ดิจิทัล แพลตฟอร์ม จำกัด | 12914 — DevOps Engineer (1); 12910 — Back-End Developer (1) |
| INBLACK GAMING CO., LTD. | 16630 — IT Support (Software Tester) (2); 16633 — Front End Developer (2) |
| Focal Solution | 16858 — Software Engineer (Frontend) (2) |
| บริษัท แอคเซลล่า จำกัด | 19736 — Full Stack Developer (1) |
| Cyber Defense Co., Ltd | 12564 — SOC Analyst (1) |
| The Study | 13693 — Motion Graphic Design (1); 2495 — Editor (2) |
| บริษัท สหมงคลฟิล์ม อินเตอร์เนชั่นแนล จำกัด | 9249 — Production (Editor) (2); 14165 — IT Support (2) |

เรียกจากโฟลเดอร์ `backend`: `node src/db/seedInternthDevelopment.js` โดย process environment ต้องเป็น `NODE_ENV=development`, target `DB_NAME=intern_system`, local `DB_HOST` และ `DB_PORT=5432`; credentials ใช้ Backend config เดิมโดยไม่แสดงค่า. การ Execute จริงรอบนี้ใช้ host `127.0.0.1:5432` ตาม Compose ของ `intern_postgres` และ query ยืนยัน `intern_system/public` ใน Sequelize `READ COMMITTED` transaction ก่อน insert. Backend config ปัจจุบันระบุ development/postgres:5432/intern_system ตาม env_file ของ Compose; อ่านเฉพาะ config ไม่เรียก API/health เพื่อยืนยัน runtime. ไม่เรียก authenticate/health checks, sync/init/reset หรือ Application startup. ไม่ใช้ `npm run seed:jobs` สำหรับ Dataset นี้ เพราะ Demo Seeder เดิมสร้าง verified/published synthetic data.

**Pending Decisions / Remaining Issues:** ไม่มี Blocker การนำเข้าค้าง; รายการนี้ยังไม่ verified/published และไม่ใช่ผลจับคู่หรือประกาศที่เปิดรับจริง. การใช้ข้อมูลจริง/ยืนยันอีเมล/รับรอง/เปิดรับต้องมีข้อมูลและงานอนุมัติแยก ห้ามใช้ช่องทางจำลองติดต่อจริง. **Tests: NOT RUN — USER-OWNED TESTING. NEXT TASK: USER MANUAL TESTING** — ผู้ใช้ตรวจ Company search/ป้ายที่อยู่, เมนูค้นหาด้วยทักษะหรือ Resume ที่มีข้อความพร้อม, ตัวอย่าง18งาน/Source URL/เบี้ยเลี้ยงบาทต่อเดือน/วันทำงาน, ไม่มี score/ปุ่มยื่นคำร้องของตัวอย่าง และ published workflow ของงานจริงยังเดิม. UI/API/production exclusion/runtime และ rerun/concurrency ยังไม่ได้ทดสอบ; ไม่มี restart/build/deploy หรือเปลี่ยน env ในงานนี้.

## Student Coop Request — Pre-submission Advisor & Head UI — 8 พฤศจิกายน 2026

ก่อนยื่นคำร้อง แสดง Advisor และ Head แบบ read-only จาก Backend โดยโหลดอัตโนมัติเมื่อเปิดฟอร์ม; แสดง error/missing data เมื่อข้อมูลไม่พร้อม. ไม่มีปุ่มไป Profile, success helper ของ Advisor, สถานะพิจารณา Head หรือปุ่ม Head Refresh ในฟอร์ม. คง Advisor readiness/submit validation เดิม; หาก Head โหลดล้มเหลวให้เปิดฟอร์มใหม่เพื่อโหลดอีกครั้ง.

“วันที่ในแบบฟอร์ม” ใช้ `Intl.DateTimeFormat` ตาม `Asia/Bangkok` ภาษาไทย/ปฏิทินพุทธ คำนวณทุกครั้งที่เปิดฟอร์ม ไม่ส่งใน payload และไม่แทนวันที่อนุมัติ. หลังยื่น ส่วนติดตามยังแสดง `submitted_at` จริง; รายละเอียดคง Review History/ชื่อผู้พิจารณา/ผล/เหตุผล/เวลาจาก Backend รวม Retry/Refresh เดิม. ไม่มี API/Workflow/RBAC/Schema เปลี่ยนรอบนี้. **Tests: NOT RUN — USER-OWNED TESTING; NEXT TASK: USER MANUAL RETEST.** รายละเอียดและข้อจำกัดใน [Current Handoff](HANDOFF_fitm-intern.md).

## Student Coop Request — Delivery Methods & Department Head Data — 8 พฤศจิกายน 2026

Source ปรับส่วนจัดส่งหนังสือให้หัวข้ออยู่ภายในขอบพร้อมระยะห่างและ checkbox ที่เลือกได้หลายวิธี; ตัวเลือกเรียงสามคอลัมน์เมื่อพื้นที่เพียงพอและปรับตามความกว้าง. ส่วนหัวหน้าภาควิชาอ่านข้อมูลผ่าน Backend แยกผู้รับผิดชอบปัจจุบันออกจากผู้พิจารณาจริง; รายละเอียดคำร้องที่ยื่นแล้วมี Loading/Missing/Error/Retry/Refresh ส่วนฟอร์มก่อนยื่นใช้ UX ล่าสุดตามหัวข้อด้านบน. **USER MANUAL RETEST PENDING; Tests: NOT RUN — USER-OWNED TESTING.** ยังไม่ได้ยืนยัน Runtime/Database/Browser ในงานนี้.

- เพิ่ม `GET /api/coop-requests/department-head` สำหรับ Student `co_op` ที่ Login เอง: `{success,data:{resolution,department,current_responsible_head}}`. `resolution`: `resolved`, `missing_advisor_department`, `missing_head`, `ambiguous`. Head projection ส่งเฉพาะ id/academic_title/first_name/last_name/position/department; ไม่ส่ง credentials/email หรือรายชื่อ candidate ทั้งหมด.
- `GET /api/coop-requests/:id` เพิ่ม `data.department_head` รูปแบบเดียวกัน และเพิ่ม `position` ใน `reviews[].teacher`; คง owner-only access/response fields เดิม. ทั้งสอง GET ใช้ `Cache-Control: no-store`. ไม่เปลี่ยน validation, delivery field names/values หรือ create payload.
- ผู้รับผิดชอบมาจาก saved Class Advisor → department → active Teacher ที่เป็น Head และผ่าน account-access guard เดิม. หากมีหลายคน/ไม่มีคนที่ระบุได้ จะไม่เดาชื่อหรือมอบหมายใหม่; Review History ยืนยันผล/เหตุผล/เวลาพิจารณาเท่านั้น ไม่อนุมานจากสถานะ approved. ชื่อ/ตำแหน่งผู้พิจารณาอ่าน Teacher ปัจจุบันที่เชื่อมกับ Review เพราะไม่มี historical name/position snapshot.

ไม่เปลี่ยน A08, Class Advisor Assignment, Academic Eligibility/Snapshot/History, Workflow, RBAC/Auth หรือ Database Records/Schema. **NEXT TASK: USER MANUAL RETEST** ตาม [Current Handoff](HANDOFF_fitm-intern.md).

## Development Workflow & Testing Responsibility

ข้อตกลงมีผล **8 พฤศจิกายน 2026 (Asia/Bangkok)** ตาม [AGENTS.md](AGENTS.md) และ [Project Codex Skill](.agents/skills/fitm-intern-workflow/SKILL.md). กฎนี้แทนคำแนะนำเดิมให้ Codex รัน tests/build/static validation/health เอง รวมคำสั่งในประวัติ README/Handoff; ไม่เปลี่ยน Application behavior.

- **Technology Stack:** Vite, HTML/CSS/JavaScript; Node.js/Express/Sequelize; PostgreSQL 16 (`intern_system`); Email/Password และ Google OAuth. Development ใช้ Windows/VS Code/Docker Desktop; Frontend `http://localhost:5173`, Backend `http://localhost:5000`.
- **Testing Responsibility:** ผู้ใช้ทดสอบระบบและ Manual Acceptance ทั้งหมดเอง เริ่มวันที่ 8 พฤศจิกายน 2026. ใช้ [Manual Acceptance Checklist](docs/testing/COOP_REQUEST_MANUAL_TEST_CHECKLIST.md) **59 กรณี**: Student23/Teacher7/Head7/Staff14/UI-Session8 (S01-IT และ S01-INE แยกกัน). **Manual Acceptance Status: `PENDING USER RESULTS`**; ไม่ถือผล Developer/Automated ในประวัติเป็นการตรวจรับของผู้ใช้.
- **Codex Implementation Policy:** ผู้ใช้ส่ง Bug Reports/Acceptance Results → ChatGPT เตรียมคำสั่งพัฒนาโดยละเอียด → Codex ทำเฉพาะขอบเขตที่อนุมัติ → ผู้ใช้ทดสอบซ้ำ. ไม่ Full Audit/refactor/เพิ่ม Feature/แก้ Workflow อื่นเอง; รักษา API Contract, Schema และ RBAC เว้นแต่จำเป็นตามคำสั่ง.
- **No Questions Policy:** ทำงานอัตโนมัติโดยไม่ถาม clarification/multiple choice/confirmation งานปกติ. อ่าน Source/ข้อตกลงเดิม เลือกวิธีรักษาพฤติกรรมระบบ; นโยบายที่ไม่ชัดบันทึก Pending Decision แล้วทำส่วนอิสระต่อ ไม่เดานโยบายมหาวิทยาลัยหรือข้าม Permission/Security Approval.
- **No Automatic Tests Policy:** Codex ห้ามรัน Unit/Integration/E2E/API/Database tests, Browser Automation/Playwright/Puppeteer, build, lint/typecheck, syntax checks/automated validation และ health checks เว้นแต่ผู้ใช้อนุญาตชัดเจนในงานครั้งนั้น. อ่าน Checklist/ผลผู้ใช้ได้ แต่ห้ามสร้างผลทดสอบ PASS/FAIL/BLOCKED เอง; บันทึก `Tests: NOT RUN — USER-OWNED TESTING` เมื่อไม่ได้รับอนุญาต.
- **Documentation Update Policy:** หลังพัฒนาอัปเดต [Handoff](HANDOFF_fitm-intern.md) พร้อม Implementation/ไฟล์/Workflow/ข้อจำกัด/Tests/Pending Decisions/Remaining Issues/NEXT TASK. README แก้เฉพาะข้อมูลใช้งาน/สถาปัตยกรรมที่เปลี่ยนจริง; Skill แก้เมื่อข้อตกลงเปลี่ยน. รักษาประวัติและข้อมูลทั้งหมด ไม่ reset/clean/stash/ลบงานเดิม/แก้ Secrets/Commit/Push อัตโนมัติ และไม่บันทึก Credentials/Tokens ในเอกสาร.

**NEXT TASK:** `Await user-reported results from the 59-case Manual Acceptance Checklist and fix confirmed issues only.`

## ประวัติ — เตรียม User Manual Acceptance — รายงานวันที่ 7 พฤศจิกายน 2026

**สถานะ superseded วันที่13พฤศจิกายน2026:** Private roster/DPAPI viewer และ backup paths ที่กล่าวถึงในหัวข้อนี้ถูกลบแล้ว. ไม่ใช้คำแนะนำเปิด viewer/เรียก private harness เดิมเป็น prerequisites ปัจจุบัน และห้ามสร้างกลับในงานตรวจนี้. ผลวันที่7–8พฤศจิกายนด้านล่างคงเป็นประวัติ ไม่ใช่ผลตรวจซ้ำ.

เตรียมวันที่ **7 พฤศจิกายน 2026 (Asia/Bangkok)**: Student→Class Advisor→Department Head→Staff Catalog และ Academic Eligibility พร้อมตรวจรับใน Developmentตามรายงานเดิม ไม่ได้รันยืนยันใหม่วันที่8พฤศจิกายน. เปิด [Checklist ภาษาไทย59กรณี](docs/testing/COOP_REQUEST_MANUAL_TEST_CHECKLIST.md) ซึ่งมีขั้นตอน/Expected/ช่องActualและPASS/FAIL/BLOCKED/Screenshot, IT+INE และDesktop/Mobile. **Manual Acceptance: PENDING USER RESULTS; Google INE Login = USER MANUAL TEST PENDING** ตามคำตอบผู้ใช้ ไม่สร้างบัญชี/Passwordใหม่หรือเปลี่ยนtrack/Googleflags. แก้จำนวนจาก58ในข้อความเดิมให้ตรง23+7+7+14+8 โดยไม่เปลี่ยนChecklist.

เริ่มที่ **http://localhost:5173/login.html** ทุกบทบาท ใช้บัญชีเดิมจาก DPAPI credential viewer; คำสั่งเปิดviewer/บัญชีsynthetic/ตัวระบุAdvisor-Headแบบprivateอยู่ในChecklist. ลำดับทดสอบ IT Student9900000000001→Advisorของคนนั้น→Head→Studentรีเฟรช→Staff; ใช้Student9900000000003/5สำหรับReject/Cancel/Catalog. INEใช้Google co_opเดิมโดยเจ้าของLoginเอง; มีmajorINE/activeAdvisor/departmentตรงHead/Googlemapping1actor1พร้อม. INEwebsite9900000000002/4ยังเป็นinternshipไม่เปลี่ยนpolicyให้ผ่าน.

| หน้า | URL |
| --- | --- |
| Student | http://localhost:5173/src/student_coop/student_coop.html |
| Teacher | http://localhost:5173/src/teacher_coop/teacher_coop.html |
| Head | http://localhost:5173/src/department_head/department_head.html |
| Staff | http://localhost:5173/src/department_staff/department_staff.html |

**Staff Mapping ผู้ใช้อนุมัติแล้ว แทนPending/Grants0ด้านล่าง:** `fitm.staff1@example.test` และ `fitm.staff2@example.test` ได้ exact `coop_prerequisite_catalog.manage` ทั้ง **IT+INE** ในDevelopment รวม4activegrants. Deployed APIจริงpermissions/listผ่านทั้งสองบัญชี; CRUDทั้ง2สาขาผ่าน actualroutes/JWT/PGในprivate rollbacktransaction. เพิ่มCLI `backend/src/seeders/grantCoopCatalog.js` Previewdefault/explicitUUID+programs+targetguard/Applyต้องconfirmintern_system; rerunไม่สร้างซ้ำ ไม่autoassignจากdepartment/email.

แก้Bugที่กระทบManualTesting: Student Refresherrorรักษาข้อมูลล่าสุด/Retryและไม่ยื่นใหม่จากstateที่ยังไม่ยืนยัน; แสดงAdvisorผู้พิจารณา/วันที่และReviewHistoryจริง; Teacherhistoryแสดงชื่อผู้พิจารณา; Create/Cancelเตรียมresponseก่อนcommitเพื่อให้readfailurerollback; ล้างjobcontextเมื่อเปลี่ยนบริษัท/กันsearchresponseเก่า; reusefocushelperกับStudentdialogs. TeacherMobileแก้hiddenmenulabelทำให้pageoverflowด้วยCSSpositionเพียงจุดเดียว ไม่เปลี่ยนbranding/เมนู/spacing.

Developmentยัง **PG16.15/56tables/IT5+INE5/Programs2/Grants4**; Requests/Snapshots/Reviews/AcademicState/History0หลังrollbacktests. Schema/ข้อมูลบัญชี/Profile/Catalog/Academicคงเดิม; ต่างเฉพาะGrantที่อนุมัติและGooglechallenge lifecycleจากLoginUIจริง. Backupก่อนGrantใหม่224,474bytes/390TOC/SHA256`641174e810dc2d3f72c805aff2aeb9d0fb6b001e2bfa483d80496d65789b7f95`เก็บprivate `.local-db-backups/manual-prep/20261107/`; ไม่reset/ลบvolumes/แก้.env/dependencies. Backendrebuilt/recreatedเฉพาะบริการที่จำเป็นจากartifact `fitm-manual-prep:20261107`; Frontendใช้bindmount/Viteเดิม.

**Automated/Developer verification ใหม่:** Backend32/32, restoredPostgreSQL14/14, Frontend16/16, DevelopmentrollbackAPI16กลุ่มรวมINEworkflowและทั้ง2Staffจริง CRUD, UnifiedLogin7บัญชีเดิม, Chromeจริง5Dashboard/1280-390-320px, Chrome+mockHTTP19checks/1280-768-390-320px. Buildsผ่าน/Frontend168modules; Models56+associations/syntax/health`/`+`/health/db`200/protectedanonymous401ผ่าน. Manual59cases/GoogleINEProvider/fullpersistedreal-accountworkflowยังรอผู้ใช้ตรวจรับ ไม่ยกผลfixturesเป็นProviderE2E.

**ข้อควรระวัง:** A08liveAdvisor/HeadtransferยังPendingPolicyDecision; approvedไม่ใช่Academiccertification, studyingupdateได้เฉพาะช่วงเดิมก่อนเอกสาร, retakes/แก้เกรดซ้ำรอนโยบาย. approvedยังเป็นactiverequest; ใช้บัญชีทดสอบอีกคนแทนresetเพื่อยื่นซ้ำ. มีChecklistปิดเฉพาะวิชาtestหลังจบ. Actualmobiledevice/LAN/fullregression/productionreadinessไม่ได้ตรวจ; chunk>500kBwarningเดิมยังมี. [Current Handoff](HANDOFF_fitm-intern.md)แยกหลักฐาน/ข้อจำกัดครบ.

**NEXT TASK: USER MANUAL ACCEPTANCE วันที่8พฤศจิกายน2026.** Gitก่อน16M/18U→หลัง17M/21U; แก้9paths+เพิ่ม3paths ไม่มีลบ/Commit/Push และรักษางานเดิมนอกscope.

## ประวัติ — A01 + Prerequisite Catalog Development — 7 พฤศจิกายน 2026

**A01 ทำแล้ว และ Catalog ติดตั้งจริงใน Development intern_system/PG16.15 แล้วตามคำขอรอบนี้.** สถานะนี้แทน Catalog NO-GO/ยังไม่ Deploy ในประวัติด้านล่างเฉพาะงาน Development นี้. Staff จริงยังรอ confirmed account→program grants; รายละเอียดหลักฐานและขอบเขตใน [Current Handoff](HANDOFF_fitm-intern.md).

- Backend ตรวจ Student ที่ล็อกแล้ว + saved `advisor_teacher_id` + Teacher active/live account access/department ก่อนสร้างคำร้อง. Error HTTP400: `CLASS_ADVISOR_REQUIRED`, `CLASS_ADVISOR_NOT_FOUND`, `CLASS_ADVISOR_NOT_ELIGIBLE`; ไม่มี Request/Review ใหม่เมื่อไม่ผ่าน. ไม่ใช้อาจารย์โครงการแทน ไม่รับ Advisor จาก Browser. Student lock ป้องกัน concurrent duplicate; valid submit→advisor_review→Teacher→department_head_review ตาม workflow เดิม.
- GET `/api/coop-requests/class-advisor` (own co_op Student/no-store) คืน `data={ready,advisor,code,message}`; หน้าคำร้องแสดงชื่อ readonly/สถานะ/Retry/ปุ่มไป Profile. Unsaved Advisor ต้อง Save ก่อน; ไป Profile/เปิดฟอร์มใหม่/submit error รักษา draft ในหน้าเดิม. POST ยืนยันใหม่เสมอ. เปลี่ยน Advisor กลาง workflow ยังย้าย live scope ตามเดิม (A08 รอนโยบาย); ไม่สร้าง program→department mapping เอง.
- Development **53→56 tables**, เพิ่ม `coop_prerequisite_catalog_programs`, `coop_prerequisite_catalog_courses`, `coop_prerequisite_catalog_grants`; Programs2, **IT5/INE5 active courses**, Grants0. Installer explicit model-driven/transactional รันซ้ำ seeded0 และ logical schema/data/revisions/timestampsไม่เปลี่ยน ไม่ใช้ startup sync/reset/migration ledger.
- ก่อน DDL สร้าง consistent Backup ใหม่ **215,903bytes/375TOC entries**, SHA256 `493ddcdf7a8c749160b0530e435d28a173f2366212456d1e75a8e7ebd206d1ee`; Restore verified บน disposable PG16.15 แล้ว. Private archive/receiptsอยู่ `.local-db-backups/a01-catalog/20261107/` (Git ignored) เก็บต่อ. Original53tables/119rows fingerprintsตรง; หลังมี131rowsรวม2programs+10courses; Academic tables/functions/triggers/historyคงเดิม/orphan0.
- Staff Catalog UI/API เดิมพร้อมกับ schema ใหม่: exact `coop_prerequisite_catalog.manage` + active IT/INE account grant, รองรับ IT/INE/both, เพิ่ม/แก้/ลำดับ/เปิดปิด/duplicate409/revision409. **active Staff จริง2บัญชียังไม่มี confirmed mapping จึงไม่ได้ provision grantจริง**. Fixture scopesผ่าน isolated tests และ Development rollback transaction; ไม่เดาสิทธิ์จาก department/email.
- Student ใช้ saved major + active DB Catalog/จำนวนจริง/revision. Catalog changes มีผลกับคำร้องใหม่; Original Snapshot/Academic historyไม่เปลี่ยน. Studying gradeNULL ยื่นได้, passed+F reject, failed+F valid; Dropdown A/B+/B/C+/C/D+/D/F. Approval ยังแยก Academic certification และคง update window เดิม.
- Rebuild/recreateเฉพาะ Backend พร้อม anonymous node_modules จาก final artifact `fitm-a01-catalog:20261107`; คง PostgreSQL/Frontend/NLP/named storage volumes. Runtime ใช้ existing Wave A dependencies ชุดที่ทดสอบ ไม่แก้ package/lock/.env หรือทำ dependency audit/remediationเพิ่ม.

**Focused verification ใหม่:** Backend32/32; restored-PostgreSQL A01+Catalog+Academic12/12; Catalog PostgreSQL20/20; Frontend4/4; Development private HTTP/JWT/PG14กลุ่ม (outer transaction+ROLLBACK ไม่มี Fixture/Grantค้าง); Chrome15checksกับ actual UI/API adapters + synthetic identity/mock HTTP ที่1280/768/390/320px. Backend Docker build/Frontend production build168modulesผ่าน; health `/`+`/health/db`200, anonymous protected Advisor/Catalog401. ไม่ใช่ manual real-account Browser/Provider E2E; real historical Requests/Snapshots/Reviews/Academic historyยัง0. Full regression/production readinessไม่ได้ทำ; chunk>500kB warningเดิมยังมี.

**NEXT TASK:** ยืนยัน Staff UUID/program grants แล้ว provisionตามมอบหมายและทำ real-account UI acceptance. A08 transfer policy/Academic criteria/retakes/grade correctionยังรอตัดสิน ไม่เปลี่ยนเอง. Gitก่อน16M/16U→หลัง16M/18U; แก้10paths+เพิ่ม2paths ไม่มีลบ/Commit/Push และรักษางานค้างเดิม.

## ประวัติ — Coop Request Academic Eligibility — 7 พฤศจิกายน 2026

**Academic feature ทำแล้วและติดตั้ง Academic schema เฉพาะส่วนที่อนุมัติใน Development intern_system แล้ว.** ทำต่อจาก Working Tree เดิม ไม่สร้างซ้ำ. Catalog Migration/Staff Grants/Security Runtime Deployment ยังแยกงาน และ Catalog Deployment NO-GO เดิมไม่เปลี่ยน. รายละเอียดไฟล์/หลักฐาน/ข้อจำกัดอยู่ [Current Handoff](HANDOFF_fitm-intern.md).

Student เลือก passed/studying/failed/unselected พร้อม Dropdown A/B+/B/C+/C/D+/D/F; studying/unselected ไม่มีเกรด, passed+F ปฏิเสธ, failed ต้องF. ยื่นได้แม้กำลังศึกษา. อัปเดตเฉพาะวิชา studying เดิมที่ยังไม่เคยรายงานผล ระหว่าง **advisor_review / department_head_review / approved ก่อนออกเอกสาร** และต้องไม่มี document_issued_at/started_at. Legacy submitted/staff_review และ rejected/cancelled/document_issued/in_progress ปิด; ข้อตกลงล่าสุดแทนช่วงเดิมที่กว้างกว่า.

Original Submission Snapshot แยกและ immutable; latest results มาจาก append-only history ที่เก็บ old/new status+grade, actor/time, revision. expected_revision/expected_request_status/operation_id ป้องกัน stale/concurrent writes และ retryซ้ำ. Teacher/Class Advisor และ Head เห็น original/latest/history และสถานะคุณสมบัติแยกจาก approval โดยใช้ advisor_teacher_id/scopeเดิม. Staff อ่านได้ ไม่ได้สิทธิ์รับรองเพิ่ม. Shared Confirm/Toast/draft/session protection คงอยู่.

**Approval ไม่เท่ากับ Academic Certification:** รอผลใช้ pending_grades; เกรดครบใช้ pending_verification รวม failed+F หรือ D/D+. ยังไม่มี auto verified_eligible/verified_ineligible หรือ verifier endpoint/permission เพราะเกณฑ์ขั้นต่ำและผู้มีอำนาจยัง Pending Decision. การแก้เกรดซ้ำ/เรียนซ้ำ/unselected→ผลภายหลังรอนโยบาย.

| Database/API | สถานะ |
| --- | --- |
| Academic installer | backend/src/db/coopAcademicDevelopment.js; explicit target/env guards, transaction/drift/rollback; ไม่รันอัตโนมัติ ไม่ใช้ sync/reset |
| Development | intern_postgres/intern_system/PG16.15; เพิ่ม coop_request_academic_states/history รวม2PK/4FK/2uniqueindexes/2CHECK/4triggers/3functions; snapshot CHECKรับfailed+Fโดยไม่แก้legacy |
| Preservation | 51→53tables; original51tables/119rows counts+keyed fingerprintsตรง; orphan0; states/history0หลังrollback fixtures; Catalog3tablesยังไม่มี/Grant0เพิ่ม |
| GET /api/coop-requests/:id/academic-courses | owning co_op Student; original/latest/history; no-store |
| PATCH /api/coop-requests/:id/academic-courses/:courseCode | status/grade/expected_revision/expected_request_status/operation_id → data={academic,replayed}; no-store |
| Existing Student/Teacher/Head/Staff request APIs | เพิ่ม academic; prerequisite_courses ยังคง Original Snapshot; approval/scopeเดิม |

ก่อน Development DDL สร้าง consistent read-only Backup ใหม่ exit0/SHA/TOC356entries/204,319bytes; SHA256 e711633d062f32a674a4b4943fec91371fc9162ceb0c7906a2f8690411ab168f. เก็บ private ACL/Git-ignored .local-db-backups/academic-development/20261107_110807_b75b3c/ พร้อม receipt/key/TOC ไม่ลบอัตโนมัติ. Fresh archiveนี้ไม่ได้Restoreซ้ำ; isolated testsใช้Backupเดิมที่เคยRestoreverifyและรักษาไว้. Firstinstallเพิ่ม2tables; rerun0 และปรับเฉพาะ exact-known Academic guardให้ตรง3สถานะล่าสุด โดย unknown driftยังreject.

**Focused results:** Backend23/23, Frontend4/4, restored isolated PostgreSQL15/15, Development actual HTTP/JWT/DB rollback-fixture9กลุ่ม และ Browser components/Teacher/Head14checksที่1280/768/390/320ผ่าน. Live Backend root/health200และAcademic no-token401. Syntax/model+associations/UTF8/diff-check/Backend Docker/Frontend production buildผ่าน; chunk-size warningยังมี. ไม่ทำ Full Regression. Unit commands: node --test --test-isolation=none backend/test/coopAcademic.test.js backend/test/phase1.test.js และ node --test --test-isolation=none frontend/test/coopAcademic.test.js. PG suiteต้องexplicit opt-in+fresh restored disposable fitm_academic_test_* เท่านั้น ห้ามชี้intern_system.

**ข้อจำกัด:** Development positive-write APIใช้ private process+transaction/savepointsก่อนROLLBACK ไม่ใช่ real-account full-dashboard E2E; ไม่เหลือfixture. Browserใช้synthetic APIไม่เชื่อมฐานจริง. Requests/Snapshots/Reviewsเดิม0แถว จึงพิสูจน์Legacyเฉพาะsyntheticfixtures. เกณฑ์/ผู้รับรอง/retakeยังPending; A01 missingClassAdvisorนอกscope. ไม่ manualRestart/Deploy; existingnodemonอาจreloadจากsourcebindmount. Gitก่อนContinue16M/16U/0D→หลัง16M/16U/0D (ต้นงานรวม5M/4U/0D); รักษางานค้างเดิม ไม่มีCommit/Push.

**NEXT TASK:** ยืนยัน academic criteria/verifier authority/grade-correction policy และตรวจรับ UI ด้วยบัญชีจริง ก่อนพัฒนาการรับรอง/Document gateตามอนุมัติ. Catalog Migration, Staff Grants และ Security Runtime Deployment แยกรอบ ไม่เริ่มเอง.

## ประวัติ — Isolated Catalog Installer Rehearsal + Security Disposition — 7 พฤศจิกายน 2026

**Installer บน restored isolated PostgreSQL PASS; Development ยัง NO-GO.** ใช้ Backup ที่ผ่าน D01 เดิม Restore ใหม่และเทียบ SHA/TOC/51-table counts+HMAC ก่อนติดตั้งครบ3clones. PostgreSQL3ตัวเป็น Network=none/noports/Mounts=[]/tmpfs; Node runners3ตัวแชร์เฉพาะ namespace ของ PG ทดสอบของตนเอง พร้อม exact-ID/DB/test-environment guards ไม่เปลี่ยน Development env หรือข้าม guard.

ติดตั้ง Catalog3ตาราง/22columns/3PK/4FK/2uniqueindexes/3CHECK, seed IT5+INE5/Programs2/Grants0. Rerun seed0/schema+data unchanged; original51tables/119rows fingerprintsตรงเดิม ยกเว้นเปลี่ยน snapshot CHECK ตาม Source. ผ่าน7target-guard rejection/8drift cases/9constraint rejections และ rollbackหลังเขียน10seeds โดยไม่มี Catalog partial leftovers; intentional partial input ถูก reject. Requests/Snapshots/Reviewsยัง0/0/0 จึงมี **legacy coverage limitation**; ไม่ได้รัน full RBAC/CRUD20/20ใหม่.

Fresh auditยัง **0Critical/0High/4Moderate; production2Moderate**. Runtimeยังdependenciesเก่า: **FIX REQUIRED** ให้ approved WaveA rollout. Minimatch/NodemonและUUID/Sequelizeเสนอ **DEFER WITH MITIGATION / NEEDS APPROVAL** ไม่รับความเสี่ยงแทนเจ้าของ; WaveBเสนอ scoped child updates11.0.1/11.1.1พร้อมcompatibilitytestsแยก ยังไม่อัปเดตใด. รายละเอียด/หลักฐาน/ข้อจำกัด/approvalอยู่หัวข้อ21ใน [Deployment Readiness Audit](docs/audits/COOP_CATALOG_DEV_DEPLOYMENT_READINESS_2026-11-07.md) และ [Current Handoff](HANDOFF_fitm-intern.md).

Cleanupครบเฉพาะ6containersใหม่; Development/Backend/Backup/receiptเดิมคงเดิม ไม่Restart/Deploy/ให้Grant/Commit/Push. แก้เฉพาะ3เอกสาร; Gitก่อน/หลัง **5modified/4untracked/0deleted**. D01 RESOLVED, D02 NEEDS APPROVAL, D03–D06 OPEN (D06 rehearsal subcriteriaผ่าน แต่operational/recovery signoffยังค้าง). **NEXT TASK:** ตัดสินใจ/อนุมัติSecurity remediationหรือrisk acceptanceและruntime rolloutแยก ก่อนทบทวนDevelopment DDL; **NO-GOคงเดิม**.

## ประวัติ — Backup/Restore Rehearsal — 7 พฤศจิกายน 2026

**Backup และ isolated Restore ผ่าน; D01 RESOLVED สำหรับ snapshot นี้ / Deployment ยัง NO-GO.** ยืนยัน `intern_postgres / intern_system / PostgreSQL 16.15` และ Development environment แล้ว สร้าง custom Backup จาก read-only exported snapshot เดียวกับ schema/count/fingerprints เวลา 15:48:44 น. Bangkok โดยไม่แก้ข้อมูลต้นทาง. Dump/copy/TOC exit 0: 204,319 bytes, 356 entries และ SHA-256 ตรงกันทุกจุด.

Restore ด้วย single transaction ลง PostgreSQL container ใหม่ **Network=none / ไม่มี ports / Mounts=[] / tmpfs** เท่านั้น. ตรวจตรงกัน 51 ตาราง/119 แถว, 601 columns, 51 PK/86 FK/132 indexes/123 CHECK; HMAC ตรงทุกตารางและ orphan=0. ความต่าง physical column positions/CHECK cast text ตรวจแยกและยืนยัน logical definitions แล้ว ไม่แก้ Schema เพื่อให้ผ่าน. Legacy Requests/Snapshots/Reviews ยัง 0/0/0 จึงมี coverage limitation; Catalog 3 ตารางยังไม่ติดตั้ง และ CHECK NOT VALID เดิม 2 รายการคงเดิม.

Cleanup เฉพาะ test ID ที่สร้างและยืนยันแล้วสำเร็จ; Source/Backend ไม่ restart และ Development volume คงเดิม. เก็บ Backup/receipt/TOC ไว้ใน private Git-ignored `.local-db-backups/coop-catalog/20261107_084502_56f73258/` โดยตรวจ ACL แล้ว; ไม่ลบ Backup อัตโนมัติ รอเจ้าของกำหนด retention/expiry. ยังไม่รับรอง encryption/offsite copy หรือ global roles/owner/ACL recovery.

รายละเอียด SHA/identity/comparison/ข้อจำกัดอยู่หัวข้อ 20 ใน [Deployment Readiness Audit](docs/audits/COOP_CATALOG_DEV_DEPLOYMENT_READINESS_2026-11-07.md) และ [Current Handoff](HANDOFF_fitm-intern.md). รอบนี้แก้เฉพาะ 3 เอกสาร; Git ก่อน/หลัง **5 modified / 4 untracked / 0 deleted**, งานค้างเดิมคงอยู่. ไม่ติดตั้ง Catalog/ให้ Grant/Deploy Security/Commit/Push. D03–D06 ยัง OPEN, D02 NEEDS APPROVAL; **NEXT TASK:** อนุมัติขอบเขต isolated Installer rehearsal และ Security disposition ก่อนทบทวน Development installation ไม่ถือว่า Backup ผ่านแล้วเป็น GO.

## ประวัติ — Security Remediation Wave A — 7 พฤศจิกายน 2026

**Wave A เสร็จในWorkspace/Artifact — DeploymentยังNO-GO.** อัปเดตครบ9targetsตามแผน: proxy-addr2.0.8, body-parser2.4.0, qs6.16.1, express-rate-limit8.7.3, ip-address10.7.4, multer2.5.0, nodemailer10.1.4, moment2.31.0, brace-expansion5.0.12. คงExpress5.2.1/Sequelize6.37.8และMinimatch/UUID/Nodemonเดิม ไม่มีoverride/majorupgradeอื่น; package.jsonคงเดิม. เพิ่มGit-ignoreexceptionเฉพาะBackendlockเดิมให้ตรวจรับและส่งต่อsecurityversionsได้.

LocalinstalledtreeและbuiltDockerartifactตรวจnpmci/npmls/auditจริง: **13entries(1Critical/5High/7Moderate) → 4Moderate / Critical0 / High0**; production-onlyเหลือ2Moderate. ResidualMinimatch/NodemonและUUID/Sequelizeเป็นWaveBที่ยังDEFERRED ไม่downgrade/overrideอัตโนมัติ. **D03ยังOPEN** ไม่อ้างSecurityPASSทั้งหมด. ExistingrunningBackendยังใช้dependencyvolumeเดิม ไม่ได้Deploy จึงยังไม่ถือว่าruntimeจริงได้รับpatch.

FocusedtestsบนDocker **34/34PASS fail0/skip0**, Localnewtests9/9: HTTP/JWT/RBACกับsyntheticactors/SQLguard, trustproxyfalse/spoofedXFFยังติด429, proxy/mappedIPkey, gzip/JSONerrors/limits, Multerboundary+abortedfilter, Moment/UUID, actualappsmoke และNodemailerstreamtransport. แก้phase1VMfixtureimports2จุดที่พิสูจน์ว่าfailก่อนWaveAด้วย โดยคงassertions/BusinessLogic. BackendDockerbuild/Syntaxผ่าน. FrontendbuildN/Aไม่มีFrontendinputsเปลี่ยน; PGwriteintegration/realaccounts/provider/SMTP/Browser/fullregressionNOTTESTEDรอบนี้.

รายละเอียดก่อน–หลัง/lockSHA/failedtestsที่แก้และข้อจำกัดอยู่หัวข้อ19ใน [Deployment Readiness Audit](docs/audits/COOP_CATALOG_DEV_DEPLOYMENT_READINESS_2026-11-07.md) และ [Current Handoff](HANDOFF_fitm-intern.md). รอบนี้7pathsรวมlock/ignore/tests/3docs, Git **3modified/2untracked → 5modified/4untracked**, ไม่มีลบSource/Commit/Push/Schema/Records/StaffGrant/BackupRestore/Deploy; รักษางานค้างเดิม. **NEXT TASK: Backup/Restore Rehearsal หลังได้รับอนุมัติแยก**; NO-GOไม่เปลี่ยนเพียงเพราะWaveAผ่าน.

## ประวัติ — Catalog NO-GO Preconditions: Security & Backup Planning — 7 พฤศจิกายน 2026

**NO-GO คงเดิม — แผนเสร็จ แต่ยังไม่แก้ Dependencies/Backup/Restore/Deploy.** Reconcile6Findings: **RESOLVED0 / OPEN4 / NEEDS APPROVAL2 / BLOCKED0**. D01BackupRestore/D02Staffmappingรออนุมัติ; D03Security/D04majorNULL/D05Coverage/D06InstallerRecoveryยังOPEN. Read-onlyยืนยันintern_system/PG16.15/targetเดิม, Catalog3ตารางยังไม่มี, Requests/Snapshots/Reviews0/0/0, Staffactive2 และmajorNULL1/Students7. ไม่มีGrantstorage/ไม่มีprovision ไม่อ้างว่าCOUNTgranttableแล้วได้0. RuntimeSourceไม่เรียกInstallerอัตโนมัติ.

Securitytriageใหม่ยัง **13entries: Critical1/High5/Moderate7**. เสนอWaveAแบบtargetedlockrefresh9targetsภายในmajor/rangesเดิม คงExpress5/Sequelize6: proxy-addr2.0.8, body-parser2.4.0, qs6.16.1, rate-limit8.7.3+ip-address>=10.7.4ใน10.x, multer2.5.0, nodemailer10.1.4, moment2.31.0, brace-expansion5.0.12. ตรวจregistry/engines/CJSexports/semverแล้วแต่runtimeรุ่นใหม่ยังNOT TESTED. Minimatch11/UUID11เป็นWaveBที่ต้องอนุมัติแยก ไม่forcedowngrade/overrideอัตโนมัติ. Currenttrustproxyfalseเป็นmitigationของproxy-addr ไม่ใช่resolvedsecurity. ข้อสรุปความเสี่ยงเป็นconditionalstaticassessment ไม่ใช่PoC/Productionaudit.

BackupRestoreRunbookใช้sharedsnapshotสำหรับdump+comparison, privatearchive/SHA/TOC, freshisolatedPG16Networknone/noports/noDevelopmentVolume, restoreatomic, logicalschema/constraints/count/privatefingerprintsและcleanupเฉพาะrecordednewcontainerID. **ไม่ได้สร้างBackup/Restoreหรือexportedsnapshotจริง**; ตารางlegacyว่างต้องคงCoverageLimitation. AcceptanceCriteria/compatibilityrisks/approvalboundariesอยู่หัวข้อ15–18ใน [Deployment Readiness Audit](docs/audits/COOP_CATALOG_DEV_DEPLOYMENT_READINESS_2026-11-07.md) และ [Current Handoff](HANDOFF_fitm-intern.md).

แก้เฉพาะ3เอกสารเดิม Gitก่อน/หลัง **3modified/2untracked/0deleted** เท่าเดิม; source/test/manifest/lockfileและงานค้างอื่นคงเดิม ไม่มีCommit/Push/DatabaseWrite/Grant/Migration. **NEXT TASK:** อนุมัติSecurityWaveAและ/หรือBackupRestoreRehearsalตามขอบเขต แล้วตรวจผลจริงก่อนทบทวนNO-GO; Developmentinstallation/Staffactivationยังต้องอนุมัติแยก.

## ประวัติ — Catalog Development Deployment Readiness — 7 พฤศจิกายน 2026

**Read-only Audit complete — NO-GO ณขณะนี้ / Migration NOT APPLIED / Staff Grants NOT ASSIGNED.** ตรวจจริง `intern_postgres / intern_system / PostgreSQL16.15 / public`, runningEnvironmentdevelopment, ทุกSQLtransactionบังคับread_only=onและROLLBACK. Catalog3ตารางยังไม่มี; legacyCHECKยังอยู่. เปรียบเทียบSourceกับ3ตารางคำร้อง39columns/8FKs/6indexesไม่พบmismatch. LiveRequests/Snapshots/Reviewsอย่างละ0 จึงยังไม่ใช่reallegacyacceptance. Students7 (IT3/INE3/majorNULL1), Staffactive2; ไม่อ่านตัวตน/credentialsและไม่เดาscope.

ตรวจSHA-256ยืนยันInstaller/Test/Backendlockfileตรงartifactที่เคยผ่านisolated20/20; **ไม่ได้รันwriteintegrationใหม่**. Installerมีtransaction/guards/rollbackแต่replaceSnapshotCHECKและมีDDLlocks; ไม่ใช่fullschema/defaults/FKvalidationcertificationหรือpostcommitundo. Backuptools16.15/privatepath+ACLพร้อม แต่freshbackup/restore/rehearsalยังNOT TESTEDและไม่สร้างในรอบนี้.

Read-onlynpm auditยืนยัน **13packageentries: Critical1/High5/Moderate7; direct5/transitive8; prod10/dev3**. Criticalคือproxy-addrซึ่งimpactขึ้นกับtrustproxyconfiguration; ยังไม่พิสูจน์exploitจริง. ไม่fix/upgrade/reinstall/เปลี่ยนlockfile; คำแนะนำdowngradeSequelize/Nodemonต้องreviewแยก. พบ6readinessfindings; ก่อนติดตั้งต้องมีexplicitapproval, freshbackup+verifiedisolatedrestore/rehearsalและsecuritydisposition. StaffUUID/programscopeยัง **PENDING USER APPROVAL** ก่อนactivation. Browser/realaccounts/fullregressionยังNOT TESTED.

รอบนี้เพิ่มเฉพาะ [Deployment Readiness Report](docs/audits/COOP_CATALOG_DEV_DEPLOYMENT_READINESS_2026-11-07.md) และแก้README/[Current Handoff](HANDOFF_fitm-intern.md); รักษาInstaller/Testและงานค้างเดิม. Git **3modified/1untracked → 3modified/2untracked**, ไม่มีลบ/Commit/Push/DatabaseWrite/Grant/Backup/Restore/Deploy. NEXT TASK: **Deployment Approval / Development Migration** ตามpreconditionsในรายงาน ไม่ติดตั้งจริงเองแม้ผลAuditจะเปลี่ยนเป็นGOภายหลัง.

## ประวัติ — Catalog IT/INE Isolated PostgreSQL & Staff RBAC — 7 พฤศจิกายน 2026

**Focused Integration PASS — ยังไม่ติดตั้ง Development.** ทดสอบจริงด้วย PostgreSQL16.15 และ protected HTTP/JWT จาก built Docker image: **20/20 PASS (19 subtests+parent), fail0/skip0**. ครอบคลุมติดตั้ง3ตาราง/seed10วิชา/rerunไม่ซ้ำ, PK/FK/Unique/CHECK, schema drift/NOT VALID/transaction rollback, live Staff Permission `coop_prerequisite_catalog.manage` + IT/INE scope/revocation, Student/Teacher403, CRUD/duplicate/cross-program/concurrent409 และ validation. เกรด A/B+/B/C+/C/D+/D บันทึกได้; F+passed และข้อมูลใหม่ผิดรูปแบบถูกปฏิเสธ. Snapshotคำร้องเดิมรวมlegacy F/free-textไม่เปลี่ยนเมื่อแก้CatalogหรือรันInstallerซ้ำ.

**Isolation evidence:** container `fitm_catalog_test_pg_20261107`, **Network=none / Ports={} / Mounts=[] / PostgreSQL dataในtmpfs**; final DB=`fitm_catalog_test_20261107_image`, `NODE_ENV=test`, loopback`127.0.0.1:5432`ภายในnamespaceทดสอบ ไม่ใช่host Development. Suiteตรวจtarget/allowlist/emptyDBก่อนเขียนและไม่อ่าน`.env`; Fixtures/JWT secretสร้างเฉพาะprocessทดสอบ. ไม่ใช้`intern_system`, ไม่ให้Grantบัญชีจริง, ไม่reset/sync/alter/force และลบเฉพาะcontainerทดสอบหลังเสร็จ.

**แก้รอบนี้:** Installerเพิ่ม explicit test-mode guard, ตรวจPKที่หาย/ผิดและunique indexที่partial/invalid; เพิ่ม `backend/test/coopPrerequisiteCatalogPostgres.test.js` ไฟล์เดียว พร้อมอัปเดตREADME/Handoff. Syntax13ไฟล์, Models/Associations/Routes loading, Backend Docker image build, Frontend production bundleในDocker166modules และdiff/strictUTF-8 **PASS**; health`/`และ`/health/db`HTTP200. Gitก่อนสะอาดที่`aaebbb6` → **3modified/1untracked/0deleted**; ไม่Commit/Pushและไม่แก้A01/Profile/Mentor/Auth/UIอื่น.

**Migration readiness:** ผ่านisolated acceptanceของexplicit model-driven installerแล้ว แต่ **Development installation NOT APPLIED / ต้องอนุมัติแยกก่อน** พร้อมยืนยันtarget, backup/restore, legacy-data preflight และStaff UUID/program grantsที่อนุมัติ. ไม่มีmigration ledger/Umzugใหม่หรือstartup sync. Browser/save+reload/Head display/real accounts/full regression **NOT TESTED** รอบนี้. Buildมีchunk-size warning และnpmรายงาน13dependency vulnerabilitiesที่ยังไม่ได้วิเคราะห์/แก้นอกขอบเขต. NEXT TASKคือการตรวจรับผลและกำหนดงานpreflight/Browserถัดไป ไม่เริ่มติดตั้งจริงเอง.

หลักฐานแยกตามหัวข้อ, Known Issues/Remaining Risks และคำสั่งDockerสำหรับรันซ้ำบนฐานว่างใหม่อยู่ใน [Current Handoff](HANDOFF_fitm-intern.md). ผลด้านบนแทนสถานะDEFERREDของการทดสอบCatalog/RBACในประวัติด้านล่างเฉพาะขอบเขตนี้.

## ประวัติ — รายวิชาก่อนออกสหกิจ / ความเห็นหัวหน้าภาควิชา — 7 พฤศจิกายน 2026

ปรับหัวข้อในฟอร์มและรายละเอียด Student Request เป็น “รายวิชาที่ต้องผ่านเกณฑ์ก่อนออกฝึกปฏิบัติงานสหกิจศึกษา”. ผลการเรียนใช้ Select ตามลำดับ A, B+, B, C+, C, D+, D, F พร้อม Backend/Model Validation สำหรับข้อมูลใหม่; ตามนโยบายที่ผู้ใช้ยืนยัน **F + ผ่านแล้วไม่อนุญาต**, กำลังศึกษาไม่ต้องกรอกเกรด. Snapshot เก่าและเกรดเดิมนอกตัวเลือกยังแสดงได้ ไม่แก้ข้อมูลย้อนหลัง.

เพิ่ม Catalog จากฐานข้อมูลและหน้าจัดการในส่วนคำร้องของ Staff: เพิ่ม/แก้ไข/กำหนดสาขา/เปิด–ปิดวิชา ใช้เฉพาะเจ้าหน้าที่ active ที่มี `coop_prerequisite_catalog.manage` และ Grant แยก IT/INE จาก Backend; **ไม่อิงข้อความ department และไม่ให้สิทธิ์อัตโนมัติ**. จำนวนวิชาของคำร้องใหม่ตาม active Catalog พร้อม Revision; คำร้องเดิมคง Snapshot. Detail แสดงความเห็น Head จาก `coop_request_reviews` และ Teacher Association จริง แยก “รอพิจารณา” ออกจาก “ยังไม่ถึงขั้นตอน” โดยไม่แก้ Workflow อนุมัติ/A01.

**Source implemented / Pending schema installation:** เตรียม `backend/src/db/coopPrerequisiteCatalog.js` เพิ่ม3ตาราง Catalog/Program/Grant และเปลี่ยนเฉพาะ fixed-code CHECK ของ Snapshot เป็น program/code-format CHECK. ยังไม่รัน Migration หรือให้ Grant บัญชีใด. ก่อนติดตั้งใช้ Catalog เดิมผ่าน Backend compatibility fallback; Staff Catalog แจ้งยังไม่พร้อม. คำสั่งติดตั้งแบบ explicit target และขอบเขต API อยู่ใน [Handoff](HANDOFF_fitm-intern.md); ไม่ใช้ db:init/reset/sync เพื่อทดลองงานนี้.

**ตรวจต่อหลังโควตาหมด (7 พฤศจิกายน 2026, Asia/Bangkok):** หัวข้อ/Grade Dropdown+Backend Validation/ความเห็น Head **Implemented ใน Source**. Catalog IT/INE และ RBAC มี Source ครบ แต่สถานะใช้งานจริง **Partial** เพราะ Read-only metadata ยังไม่พบ3ตารางและยังไม่มอบ Grant ใด. **Not Implemented:** ไม่พบฟีเจอร์ในขอบเขตที่ยังไม่มีโค้ด; การติดตั้งและ provision สิทธิ์ยัง **NOT APPLIED** และไม่ถือว่าใช้งานจริงผ่านแล้ว. อ่านหลักฐานแยกส่วนใน [Current Handoff](HANDOFF_fitm-intern.md).

รอบตรวจต่อแก้ `staffPrerequisiteCatalog.js` ให้เพิ่มวิชาในสาขาที่กำลังดู เพื่อใช้ Revision ของสาขาถูกต้อง (การแก้ไขยังย้ายสาขาได้ตามสิทธิ์). ปรับ installer ให้เทียบ expression ของ CHECK ที่มีอยู่และ validate CHECK ก่อนยอมรับ แทนการตรวจชื่อเพียงอย่างเดียว; ไม่ติดตั้ง Schema หรือแก้ข้อมูลจริง. ไม่มีงานรอบก่อนถูกคืน/ลบทิ้ง.

**ผลตรวจ:** Syntax16ไฟล์ JS, การโหลด Models/Associations/Routes โดยไม่เรียก SQL และ Docker Frontend Build **166 modules / 5.68s / exit0 PASS** (มี bundle-size/plugin-timing warnings). Health `/` และ `/health/db` HTTP200; ไม่ใช่หลักฐาน protected API ทำงานครบ. API/Schema ตรวจแบบ Source review และอ่าน metadata แบบ Read-only เท่านั้น. Git **35 modified/24 untracked/0 deleted** ก่อน/หลังเท่าเดิม; รอบตรวจต่อเปลี่ยนเฉพาะ2Source+2เอกสาร อีก812จากBaseline816ไฟล์ byte-identical; UTF-8/diff-check PASS. **Regression/Unit/Integration/Browser/Real Database Write E2E: NOT TESTED / DEFERRED ตามคำสั่งผู้ใช้**; ผล PASS ในประวัติด้านล่างไม่ใช่ผลทดสอบโค้ดใหม่นี้. NEXT TASK: เมื่อผู้ใช้สั่งทดสอบเพิ่มเติมจึงตรวจ Migration/RBAC/Revision/เกรด/Legacy Snapshot บนฐานแยก ก่อนยืนยัน target/backup ติดตั้งและมอบสิทธิ์ให้บัญชีที่ระบุ. ไม่รัน Regression อัตโนมัติเมื่อโควตารีเซ็ต.

## Student Coop Request — Read-only Audit — 6 พฤศจิกายน 2026

ตรวจระบบคำร้องจาก Working Tree, API/Workflow/สิทธิ์, Models และ Development PostgreSQL catalog แบบ Read-only แล้ว ผล **PARTIAL / NEEDS VERIFICATION** ยังไม่รับรอง Production. พบว่า POST ยังสร้าง `advisor_review` ได้เมื่อไม่มี Class Advisor; อาจารย์โครงการ (`coop_advisor_teacher_id`) ไม่ได้สิทธิ์พิจารณาแทน Class Advisor (`advisor_teacher_id`). พบเพิ่มเติมเรื่อง legacy stage, Error/Empty state, approval placeholder, keyboard focus, job/company binding และ policy risks ที่ต้องยืนยันก่อนแก้.

รายงานฉบับเต็มพร้อม API Matrix, State Transition, Findings A01–A14, Roadmap และ Acceptance Checklist: [STUDENT_COOP_REQUEST_AUDIT_2026-11-06.md](docs/audits/STUDENT_COOP_REQUEST_AUDIT_2026-11-06.md). รอบนี้ **ไม่แก้ Logic/UI/Schema/ข้อมูลคำร้อง**; แก้เอกสารเท่านั้น. ผลใหม่: Backend Mock Regression **25/25**, Frontend **97/97**, Audit Mock Probes **13/13**, Chrome + Mock HTTP 4ขนาดจอ และ Docker Build **163 modules PASS**. Catalog compare core44columns/9FK/7indexes/5defaultsตรงSource; Review CHECKสองรายการยัง NOT VALIDตามSource จึงไม่รับรองข้อมูลเก่าทั้งหมด. Real Student→Teacher→Head PostgreSQL write E2E **BLOCKED โดย Read-only scope**; SMTP/real accounts NOT TESTED. Testsที่ผ่านรวมการพิสูจน์ Bugs ไม่ได้แปลว่า Findingsถูกแก้แล้ว.

**Mentor closure:** UI ACCEPTED ตามผลตรวจรับที่ผู้ใช้รายงาน (Verifiedสีเขียว/ข้อมูลครบ/ไม่มีResend/มีEdit+Delete); Automated Testsรันใหม่ผ่านดังข้างต้น. ตรวจหลักฐาน Chrome+Mock รอบก่อนแล้ว แยกจาก Browser Audit คำร้องรอบนี้; ไม่อ้าง SMTP/Gmail/PG E2Eจริง. NEXT TASK “Audit คำร้อง” ทำแล้ว; **Suggested next implementation: A01 ป้องกันยื่นคำร้องเมื่อไม่มี eligible Class Advisor พร้อม focused tests** โดยไม่เดาหรือเปลี่ยนนโยบาย assignment เอง.

ส่วนปัจจุบันนี้ให้ใช้แทนข้อสรุป/คำสั่ง migration-based ในประวัติ READMEเก่า: workflowปัจจุบันเป็น Model-driven initialization ตาม AGENTS/Handoff ไม่รันmigrations/ledger/db:init/resetเพื่อAudit. ประวัติเดิมคงไว้สำหรับ continuity.

## สถานะ Mentor Verification และ Student Mentor Panel — 6 พฤศจิกายน 2026

แก้ Spinner ค้างหลังยืนยันสำเร็จ โดยคืน Loading Class/`aria-busy` ทุกเส้นทางและแสดง Success View แบบอ่านอย่างเดียวจาก `verified` ที่ Server ยืนยัน พร้อมปุ่มปิดหน้าและ Auto Close/Fallback เดิม. หน้ายืนยันใช้การ์ดข้อมูลนักศึกษา/พี่เลี้ยง รองรับ Noto Sans Thai และ Mobile โดยแยก CSS จากหน้าตรวจฝึกงานและนัดนิเทศที่ใช้หน้าเดียวกัน.

Student → ข้อมูลพี่เลี้ยง โหลดสถานะใหม่เมื่อเข้าเมนู/กลับมา Focus/Visible และตรวจทุก 10 วินาทีเฉพาะเมนูที่เปิดอยู่และสถานะ pending. หยุดเมื่อ verified/ออกจากเมนู/ซ่อนแท็บ ไม่ยิง Request ซ้อน; Network Error รักษาข้อมูลเดิมและมี Retry. GET ใช้ `Cache-Control: no-store` ฝั่ง Backend โดยคง JWT/RBAC/API shape/Token expiry และขั้นตอนเพิ่ม/แก้ไข/ลบ/ส่งซ้ำเดิม.

ผลรอบนี้: Docker Frontend Regression **97/97**, Backend Email/Mentor **25/25**, Syntax/Production Build และ Chrome + Mock HTTP ที่ **1280/768/390/320px PASS** รวมยืนยันจากอีกแท็บแล้ว Student เปลี่ยนเป็นสีเขียวเอง. ยังไม่ได้ทดสอบ SMTP/บัญชี Development/PostgreSQL E2E จริง; ไม่แก้ข้อมูลหรือ Schema. รายละเอียด Root Cause/ขอบเขตหลักฐานอยู่ใน [Handoff](HANDOFF_fitm-intern.md).

## สถานะอีเมลยืนยันพี่เลี้ยง — 6 พฤศจิกายน 2026

อีเมลหัวข้อ “ยืนยันข้อมูลพี่เลี้ยงนักศึกษาสหกิจศึกษา” แสดงชื่อ–นามสกุลนักศึกษาพร้อมคำนำหน้าถ้ามี สาขาวิชา และคณะ ในส่วน “ข้อมูลนักศึกษาที่ท่านจะดูแล” ก่อนลิงก์ยืนยัน ทั้ง HTML และ Plain Text. Backend อ่านจาก Student/Profile ผ่าน `Mentor.student_id` เท่านั้น ไม่ใช้ข้อมูลนักศึกษาจาก Request Body; ช่องที่ขาดแสดง “ยังไม่ระบุ” และ Escape ข้อมูลใน HTML.

ครอบคลุมเพิ่ม/แก้ไข/ส่งยืนยันซ้ำผ่านเส้นทางเดิม โดยคง Subject/Token expiry/Verification workflow/API response เดิม. **Mock Email Transport + Mentor regression 24/24 PASS**, ตรวจ SQL projection/ownership/NULL/HTML Escape/log redaction และ HTML Preview 600/390/320px ผ่าน. ยังไม่ได้ส่ง SMTP จริงหรือทดสอบ Gmail client จริง; รายละเอียดอยู่ใน [Handoff](HANDOFF_fitm-intern.md). ไม่มี Schema/ข้อมูลนักศึกษาหรือ UI เมนูอื่นเปลี่ยนในงานนี้.

## สถานะ Student Profile — 6 พฤศจิกายน 2026

ส่วนเลือกวิธีกรอกข้อมูล (กรอกด้วยตนเอง / นำเข้าจาก PDF) ถูกซ่อนจาก UI ชั่วคราว โดยยังคงโค้ดและกระบวนการนำเข้า PDF ไว้สำหรับเปิดใช้งานในอนาคต ปัจจุบันผู้ใช้สามารถกรอกและบันทึกประวัตินักศึกษาด้วยตนเองได้ตามปกติ

คงฟอร์ม 4 Tabs, ปุ่มบันทึกด้านบน/ล่าง, Draft/Revision/409 และ Element IDs ของ PDF Import เดิมไว้ครบ. เปิดกลับโดยนำ `hidden` ออกจาก `#profilePdfImport` ใน `frontend/src/student_coop/student_coop.html`; `#profilePdfBody` ยังคงเปิดผ่านปุ่มนำเข้า PDF ตามเดิม. ไม่เปลี่ยน Backend/Database หรือฟังก์ชัน PDF/OCR. ผลตรวจล่าสุดและข้อจำกัดอยู่ใน [Handoff](HANDOFF_fitm-intern.md).

## สถานะปัจจุบัน — Student Project UX/UI — 6 พฤศจิกายน 2026

ปรับเฉพาะ Student **โครงการสหกิจศึกษา** (`#panel-coop`): Header กระชับ, Advisor/Topic การ์ดเดียว, CO-09/กำหนดสอบเป็นสองคอลัมน์เมื่อพื้นที่พอ, Book/Poster สอง subcards และ Mobile คอลัมน์เดียว. ปุ่มบันทึก/อัปโหลดแยกจากเปิดดู/ดาวน์โหลด พร้อม loading/retry/status จากผลจริง; สถานะอาจารย์ เอกสาร และการสอบแยกกันตามเดิม. ไม่เปลี่ยน Backend/API/Database/RBAC/Staff/Admin/เมนูอื่น.

**Frontend tests12/12 / Build160 modules / Chrome + Mock clients / Responsive1280×800,768×1024,390×844,320×568 PASS.** CSS ใหม่88rules scoped ใต้ panel; Browser ตรวจ1,229องค์ประกอบนอก panel ไม่เปลี่ยน และ manager queue/detail เทียบ baseline ตรงกัน. ภาพ Before/After และหลักฐานแยก mock/real อยู่ใน [Current Handoff](HANDOFF_fitm-intern.md). รอบนี้ไม่ทดสอบ Real API/PostgreSQL E2E ของ UI ใหม่; ผล Deployment ด้านล่างเป็นประวัติของวันที่5พฤศจิกายน.

เพิ่ม `studentCoopProjectView.js`/`student_coop_project.css`; แก้เฉพาะ Student panel/project handlers, optional student view hook ใน controller CO-09, focused test และเอกสาร. Git **39 modified/39 untracked → 39 modified/41 untracked**, ไม่ลบ/Commit/Push และรักษางานค้างเดิม. **NEXT TASK:** รอผู้ใช้ตรวจหน้าจอจริง; Legacy Book/Poster COMMIT uncertainty, Topic lost-update และ Super Admin password recovery ยังเป็นงานแยก ไม่เริ่มเอง.

## ประวัติ — CO-09 Development Deployment / Integration Acceptance — 5 พฤศจิกายน 2026

**DEVELOPMENT SCHEMA INSTALLED / RBAC ACTIVATED / BACKUP-RESTORE PASS / REAL DEVELOPMENT HTTP 6/6 PASS / REAL BROWSER + DEVELOPMENT API + POSTGRESQL 2/2 PASS / ISOLATED POSTGRESQL 11/11 PASS / FOCUSED REGRESSION 22 PASS + 2 SKIP / BUILD PASS.** สถานะนี้แทนที่ DDL/capability BLOCKED ในประวัติรอบก่อน. **SUPER ADMIN LIVE LOGIN NOT VERIFIED** เพราะไม่มี credentials ที่ได้รับอนุญาต และงานนี้ห้าม reset password.

- Target ที่ตรวจจริง: Development PostgreSQL **16.15**, `127.0.0.1:5432 / intern_system.public`; Backend container ต่อ `postgres:5432` ฐานเดียวกัน. ไม่มี Production/Staging/reset/force sync/startup DDL.
- Fresh Backup custom format **186,704 bytes**, header/TOC/checksum/Windows ACL ผ่าน เก็บนอก Git ที่ `%LOCALAPPDATA%/FITM-INTERN/backups/20261105-co09-9e74f6cc/`. Restore ลงฐานใหม่แยกและตรวจ all-table counts/fingerprints/schema objects ผ่านก่อนซ้อมและ Apply จริง. ลบเฉพาะ temporary Restore DB/container dump แล้ว; Host Backup + private receipt ยังเก็บอยู่.
- ติดตั้ง CO-09 ตาม SQL Preview/Models สำเร็จ **5 พ.ย. 2026 เวลา18:40:24 Asia/Bangkok**: **47→51 tables / 554→599 columns / 250→277 constraints / 121→132 indexes / 15 triggers เท่าเดิม**. เพิ่ม 4 ตาราง CO-09 และขยาย existing Super Admin permission CHECK เท่านั้น. Preview ยังคง ROLLBACK ไม่เป็น auto-install script; ห้ามใช้ db:init/reset แทน rollout.
- เพิ่ม `topic-exams.manage` ให้ **Existing Teacher Super Admin membership** ที่ผู้ใช้ระบุ โดยรักษาสิทธิ์เดิมทั้งหมด ไม่ใช้ email bypass/ไม่เพิ่ม Staff role/ไม่สร้าง Admin สำรอง. session_version +1 และ audit เพิ่ม1แถวระบุ explicit authorized Development operation; ไม่อ่านหรือเปลี่ยน credential columns. ต้องใช้ fresh authenticated session ตาม guard เดิม. Staff active role ใช้ policy กลางเดิมได้โดยไม่เปลี่ยนสิทธิ์บัญชี.
- Student PDF10MB/URL/status/reason/Protected Preview/Download และตารางสอบ/กรรมการ/สถานะ ใช้กับ API Development จริงแล้ว. Staff search/review/schedule/edit/reschedule/cancel/complete/history ผ่านจริงกับ controlled fixtures. หลัง save อัปเดต management queue ให้แสดงสถานะ/ห้องล่าสุด โดยคง Draft ของอีกฟอร์ม; queue-load error หลัง acknowledged save ไม่ถูกแจ้งเป็น write failure.
- **Data preservation/cleanup:** หลังทุก run Students7/Profiles6/StudentFiles13/Teachers23/Staff2/Projects0/SuperAdmin1 เท่าเดิม; audit6→7 เป็น grant ที่อนุญาต. CO-09 documents/exams/committee/history **0/0/0/0** หลังล้าง fixtures โดย Schema ยังคงอยู่. 5 runs สร้างเฉพาะ test namespaces รวม15 students/10 teachers/5 staff และลบครบ; private fixture files7ไฟล์/5directories ล้างหลังยืนยัน no references. Inventory referenced/missing/unreferenced **0/0/0**. Business-table fingerprints/schema ตรงหลัง activation.
- **Transient exception:** Browser Login เรียก Google challenge/expiry cleanup ตาม Source/flags เดิม; `google_auth_requests` ก่อน Deployment2→หลังBrowser1แถว. ลบเฉพาะ request IDs ที่ยืนยันว่า Browser test สร้าง; แถว anonymous ที่ระบุ ownership ไม่ได้คงไว้ให้ lifecycle เดิม ไม่ restore expired nonce/ไม่แก้ Google policy. Google identities/ข้อมูลบัญชี/ข้อมูลธุรกิจเดิมไม่เปลี่ยน.

ผลทดสอบรอบนี้แยกหลักฐานชัดเจน:

| หลักฐาน | ผล |
| --- | --- |
| **HTTP API + Real Development PostgreSQL** | Final HTTP-only **6/6 nodes** ผ่าน Normal Unified Login ของ Fixture ใหม่; PDF/invalid MIME/signature/size/URL, protected bytes/download, owner/RBAC, review, concurrent upload/schedule, conflicts, revisions, committee/history/transitions, SQL read-back และ cleanup |
| **Real Browser + Real Development API/PostgreSQL** | Final Browser-only **2/2 nodes**, Chrome156: Login UI จริงของ Student/Staff, actual dashboards/API adapter, upload/URL/preview/hard reload, review/approve/full schedule lifecycle/committee/queue status, offline/error→retry และ SQL read-back. **1280×800 / 768×1024 / 390×844 / 320×568** ไม่มี overflow ทั้งสองบทบาท. ไม่มี Mock API |
| **Isolated PostgreSQL Integration** | **11/11**, รวม Admin/Teacher membership restrictions, atomic rollback, disk/SQL failures, statement timeout และ lost COMMIT acknowledgement. ไม่ inject faults บนฐาน Development |
| **Focused/Synthetic/Regression** | **22 PASS / 2 SKIP**; default Development acceptance SKIP1 เพื่อป้องกันรันโดยไม่อนุญาต |
| **Browser Mock regression** | actual Source กับ synthetic client ตรวจ independent Draft/409/confirm reload/preview/session wipe/4ขนาดจอผ่านหลัง queue fix; แยกจาก Real Development Browser ด้านบน |
| **Build/Static** | Frontend `npm.cmd run build -- --configLoader native` **158 modules PASS**, syntax/UTF-8/diff/source preservation และ live health checks |
| **NOT VERIFIED** | Existing real-user Login/whole-dashboard E2E, Super Admin live Login/Browser, full accessibility/PDF printing และ Legacy Book/Poster upload E2E |

รายละเอียด Source helper, API contracts, private Backup metadata, test guards, known issues และรายชื่อไฟล์อยู่ใน [Current Handoff](HANDOFF_fitm-intern.md). เพิ่ม `backend/src/db/coopTopicExamDevelopment.js`, `backend/test/coopTopicExamsDevelopment.test.js`, `backend/test/helpers/coopTopicExamsBrowser.cjs`; แก้เฉพาะ `frontend/src/pages/coopTopicExams.js` และ README/Handoff. Git **39 modified/36 untracked → 39 modified/39 untracked**, ไม่มีลบ/Commit/Push และรักษางานค้างเดิม.

**Manual Chrome acceptance:** เปิด `http://localhost:5173/login.html` → Student ของตนเอง → โครงการ → PDF/HTTPS URL/Preview/Download/Hard Reload. Staff ที่ได้รับอนุญาตค้นนักศึกษา → ตรวจเอกสาร/เหตุผล → จัดและแก้ตาราง/กรรมการ → เลื่อน/ยกเลิก/จบสอบ → ตรวจ Student Reload และ queue ล่าสุด. ลอง invalid file/เวลา/กรรมการซ้ำ/เวลาซ้อน/409 พร้อม Draft, error→retry และ4ขนาดจอข้างต้น. Super Admin ต้อง Login ปกติด้วย fresh session; **ไม่มีการ reset password ในงานนี้**. Checklist เต็มใน Handoff.

**NEXT TASK:** รอผู้ใช้ตรวจรับ CO-09 ใน Chrome. Recovery บัญชีที่ลืมรหัส, Legacy Book/Poster COMMIT uncertainty และ Project-topic lost-update ยังคงเป็นงานแยก ไม่เริ่มเอง. ไม่เพิ่มคะแนนสอบ/สอบ100%/ข้อกำหนดจำนวนกรรมการหรือ room aliases ที่ยังไม่ยืนยัน.

## ประวัติ — CO-09 Topic Examination Management — 5 พฤศจิกายน 2026

**IMPLEMENTED / ISOLATED POSTGRESQL + REAL HTTP 11/11 PASS / FOCUSED + REGRESSION 22 PASS + 2 OPT-IN SKIP / CHROME MOCK UI PASS / BUILD PASS / BLOCKED PENDING DEVELOPMENT DDL + CAPABILITY GRANT.** Source พร้อมสำหรับตรวจรับ; Development `intern_system.public` ยังไม่มี 4 ตารางใหม่และยังไม่เปิด persistence จริง. ดู [Current Handoff](HANDOFF_fitm-intern.md) สำหรับไฟล์ทั้งหมด ผลตรวจ และข้อจำกัด.

- **Student:** ภายในโครงการสหกิจศึกษาเดิมมี CO-09 Document Card: PDF 10MB/ชื่อ/วันที่/Protected Preview/Download และ HTTPS URL แยกจาก PDF พร้อมสถานะตรวจ/เหตุผล. ถัดลงมาแสดง Exam Card: หัวข้อ/วันเวลา Asia/Bangkok/สถานที่หรือ Meeting URL/สถานะ/กรรมการ/บทบาท/หมายเหตุ. ไม่มีข้อมูลตัวอย่างเมื่อยังไม่จัดตาราง.
- **Staff:** พื้นที่ CO-09 ในหน้าจัดการเอกสารเดิม มีค้นหา/แบ่งหน้า/ตรวจเอกสาร/จัดและแก้ตาราง/เลื่อนหรือยกเลิกพร้อมเหตุผล/จบสอบ/เพิ่มลบกรรมการ Active Teacher Directory/ประวัติกำหนดการ.
- **Super Admin:** Widget/Service/API ร่วมกับ Staff ในเมนูจัดการข้อมูลระบบเดิม ใช้ capability `topic-exams.manage` ผ่าน live server RBAC และ Teacher membership/fresh bound session/environment guard เดิม. ไม่ hardcode อีเมลหรือให้ Staff role แก่ครู. Read-only พบ membership ของบัญชีที่ผู้ใช้ระบุ แต่ยังไม่มี capability ใหม่นี้; ไม่มีการแก้สิทธิ์/บัญชีจริง.
- **เอกสาร:** `missing → pending → needs_revision/approved`; เปลี่ยน PDF/URL แล้วกลับรอตรวจและล้างผลเก่า. URL อย่างเดียวไม่ถือว่าอัปโหลด PDF. **สอบ:** `unscheduled → scheduled/cancelled`; scheduled/rescheduled → scheduled/rescheduled/cancelled/completed; cancelled → scheduled; completed ปิดแก้ตาราง. สถานะแยกจาก Project Advisor; การเลื่อน/ยกเลิกต้องมีเหตุผล.
- **กรรมการ:** One-to-Many Teacher FK + role chair/member/advisor + display_order + unique exam/teacher. ยังไม่ยืนยันจำนวนกรรมการตามกฎวิชาการ จึงไม่ยืมขั้นต่ำ/สูงสุดของการสอบ 100%. Payload cap 100 คนเป็นขอบเขต request เท่านั้น. ยังไม่รวมสอบโครงการ 100%/คะแนนสอบ.
- **Concurrency:** Document/Exam revisions แยก, บังคับ `If-Match: "N"` (เริ่ม `"0"`; missing428/stale409), Transaction/advisory lock กลาง/row locks และ atomic committee/history save. ตรวจเวลาห้อง/กรรมการซ้อนใน active schedules จาก Backend. Free-text room matching normalize case/whitespace/NFKC; ยังไม่มี room alias directory.
- **File safety:** Private immutable UUID files ใต้ `STORAGE_ROOT/co09/<owner>/<uuid>.pdf`; ตรวจ MIME/extension/signature/owner/path/symlink, ไม่ public URL/ไม่ server-fetch URL. Replacement ไม่ทับ/ไม่ลบไฟล์เดิมหรือไฟล์ใหม่เมื่อ Rollback/COMMIT ไม่แน่ชัด. Uncertain ตอบ503 ให้โหลดผลล่าสุดก่อน retry. `node backend/src/db/inspectCo09Storage.js` เป็น read-only count inventory; retained files อาจเป็นรุ่นเก่าหรือ uncertain writes ห้าม auto-delete. ไม่มี automatic garbage collection/recovery UI.

API base `/api/coop-topic-exams` (ทุก route ต้อง Application JWT):

| สิทธิ์ | Method / Path | Contract |
| --- | --- | --- |
| Student owner/co_op | GET `/me` | `{success,data:{student,project,advisor,document,exam}}` |
| Student owner/co_op | POST `/me/document` | multipart `file`, PDF10MB, document If-Match |
| Student owner/co_op | PUT `/me/document-url` | `{document_url}`, HTTPS หรือว่างเพื่อล้าง URL, document If-Match |
| Student owner/co_op | GET `/me/document/preview` หรือ `/download` | Protected PDF bytes, no-store/nosniff/disposition |
| Staff/capable Admin | GET `/manage/students?search=&page=`; GET `/manage/teachers`; GET `/manage/students/:id` | รายการ/active directory/รายละเอียดและประวัติ |
| Staff/capable Admin | PUT `/manage/students/:id/review` | `{review_status,review_reason}`, document If-Match |
| Staff/capable Admin | PUT `/manage/students/:id/schedule` | `{status,starts_at,ends_at,mode,location,meeting_url,notes,reason,committee:[{teacher_id,role}]}`, exam If-Match |
| Staff/capable Admin | GET `/manage/students/:id/document/preview` หรือ `/download` | Protected PDF ตาม capability เท่านั้น |

Mutation ตอบ `{success:true,data:document|exam}` + ETag. เวลาขาเขียนรูปแบบ `YYYY-MM-DDTHH:mm:00+07:00`; validation ปฏิเสธ unknown fields, duplicate/inactive committee, invalid times/transitions และ scheduling conflicts. UI มี Shared Feedback/Retry/Draft/conflict confirmation/session guards. Schema ขาดตอบ `503 CO09_SCHEMA_NOT_READY`; SQL timeout แยก `CO09_TIMEOUT`; COMMIT acknowledgement ไม่แน่ชัดแยก `CO09_COMMIT_UNCERTAIN`.

**Schema plan ยังไม่ Apply:** [SQL Preview](backend/src/db/coopTopicExam.preview.sql) สร้างจาก Sequelize/Integrity โดย `node backend/src/db/coopTopicExamSchema.js` (ไม่ connect DB): 4 ตาราง `coop_topic_documents`, `coop_topic_exams`, `coop_topic_exam_committee_members`, `coop_topic_exam_history` พร้อม FK/index/CHECK และขยาย existing Super Admin permission CHECK เฉพาะ capability ใหม่. ไม่เปลี่ยน `student_files`/Book/Poster ENUM/unique constraints หรือข้อมูลบัญชี. Preview มี target/transaction guards และจบ ROLLBACK; ไม่มี migration runner/ledger/startup sync. ต้องได้รับอนุญาต DDL แยกหลัง preflight/backup/restore; ไม่รัน db:init/reset เพื่อเปิดโมดูล. Grant capability บัญชีจริงยังไม่ทำ.

**ผลตรวจใหม่:** actual PostgreSQL16.15/Express/JWT/RBAC/storage **11/11** บนฐานทดสอบเดิมที่แยกจาก Development และ random disposable schema; public-table fingerprints เดิมตรงและ cleanup เฉพาะ fixtures. ครอบคลุม owner/capabilities/Teacher membership, validation/conflicts/revisions/concurrent writes/history/rollback/upload failures/real SQL timeout/missing-schema 503/lost COMMIT acknowledgement. Focused+regression **22 PASS / 2 SKIP**, syntax และ frontend `npm.cmd run build -- --configLoader native` **158 modules PASS**. Chrome actual Source กับ **Mock API** ผ่านการกรอก/Save/Reload/Review/Preview wiring/Draft/409/session wipe และ 1280/768/390/320 px ไม่มี overflow; **ไม่ใช่ Browser → PostgreSQL หรือ live-account E2E**. Health `/` และ `/health/db` 200; anonymous new routes401.

Focused command: `node --test --test-isolation=none backend/test/coopTopicExams.test.js frontend/test/coopTopicExams.test.js frontend/test/phase1.test.js backend/src/services/superAdmin.test.js backend/src/services/teacherAdminGrant.test.js`. Isolated PostgreSQL: เฉพาะ test process ตั้ง `FITM_CO09_POSTGRES_TESTS=1`, `FITM_CO09_TEST_DATABASE=fitm_profile_accept_20261105_fc1b0c2e` แล้ว `node --test --test-isolation=none backend/test/coopTopicExamsPostgres.test.js`; default SKIP/guard ห้าม intern_system. ไม่สร้าง/reset/drop database.

**Password recovery:** พบเพียง `/api/admin/me/password` ที่ต้องยืนยันรหัสปัจจุบัน; ยังไม่มี authorized forgot-password recovery ของ existing Super Admin membership. `admin:assign-teacher` ไม่ reset membership ที่มีแล้ว. รอบนี้ไม่อ่าน/แสดง/เปลี่ยนรหัสผ่านหรือ hash บัญชีเป้าหมาย. ผู้ดูแลต้องยืนยันเจ้าของและอนุมัติงาน recovery แยก โดยเตรียม atomic Teacher credential + membership stamp/session revocation/audit และทดสอบ isolated ก่อนใช้จริง; ไม่ใช้ test-credential utility ทดลองกับบัญชีนี้.

Git baseline **35 modified/16 untracked/0 deleted → 39 modified/36 untracked/0 deleted**. งานนี้เพิ่ม20/แก้9/ลบ0 ไฟล์; งานค้างเดิมนอกขอบเขตคงเดิม. รักษา Profile/Advisor/Book/Poster/โมดูลอื่น/Auth/.env/Docker/ข้อมูล Development. **Known legacy issues:** Book/Poster COMMIT-uncertainty และ Project-topic lost-update เดิมยังไม่แก้. **NEXT TASK:** รอตรวจรับ Source/SQL Preview และอนุญาต Development DDL/capability assignment ก่อนเปิดใช้งานจริง; Recovery/Legacy safety เป็นงานแยก ไม่เริ่มเอง.

## ประวัติ — Student Profile บันทึกทักษะคอมพิวเตอร์ / ภาษา — 5 พฤศจิกายน 2026

แก้สาเหตุบันทึกสองหมวดไม่ได้จริง: ขั้นลงทะเบียน Model เปลี่ยน default `student_skills.display_order` จากเลข `0` เป็น Sequelize `Literal("0")`; เมื่อฟอร์มไม่ส่ง field ลำดับตาม Contract เดิม ตัวตรวจ `Number.isInteger` จึงปฏิเสธก่อน INSERT และ API คืน 400. ทดสอบแยก computer/language แล้วพบปัญหาทั้งคู่. แก้ `backend/src/models/schemaIntegrity.js` เฉพาะ runtime default นี้ให้เป็น integer `0`; คง SQL default/Schema/API keys/Enum/UI/ลำดับข้อมูลเดิม ไม่รัน DDL หรือเขียนข้อมูลนักศึกษาจริง.

**หลักฐาน Persistence จริง:** PostgreSQL 16.15 บนฐานทดสอบแยกที่มีอยู่ `fitm_profile_accept_20261105_fc1b0c2e` ผ่าน **9/9 Integration test nodes** ด้วย actual Models/JWT/protected HTTP API/transactions/Workspace/API adapter และ SQL read-back. ครอบคลุมแต่ละหมวด/ทั้งคู่, update/optional clear/order, validation, 428/409, rollback ไม่บันทึกบางส่วน, owner isolation และ explicit PDF mapping. Chrome ใช้ Profile HTML/CSS/controller เดิมผ่าน **กรอก → กดบันทึกประวัติ → API จริง → PostgreSQL → รีเฟรชหน้า** รวมสลับแท็บ/แก้ไข/ล้าง/validation/409 และ Responsive 1280/390/320 px. API transport proxy ต่อฐานทดสอบจริง ไม่ใช่ Mock Save. Cleanup เฉพาะ Fixture UUIDs แล้ว fingerprints ของทุกตารางและ Schema ตรงก่อนทดสอบ; หลังผู้ใช้ Reload Window ตรวจ READ ONLY พบ **0 skill fixture markers / 0 reserved fixture accounts** คงค้าง.

Regression/DOM/synthetic **71/71**, syntax และ frontend `npm.cmd run build -- --configLoader native` **154 modules PASS**. ผลทั้งหมดก่อน Reload จบจริงด้วย exit code 0; หลัง Reload ตรวจ Source แล้วไม่แก้ implementation ซ้ำ รันเฉพาะ skills/PDF/four-tab **4/4** และ registered Model default ผ่าน. ยัง **NOT VERIFIED** สำหรับ live-user Save บนบัญชีจริง, full Login/Dashboard browser E2E และ PDF upload/OCR ไฟล์จริง; ไม่ใช้ผลทดสอบจำลองแทนผล PostgreSQL.

เพิ่ม `backend/test/studentProfileSkillsPostgres.test.js`; แก้ `backend/src/models/schemaIntegrity.js`, `frontend/test/studentProfileContacts.test.js`, `README.md`, `HANDOFF_fitm-intern.md` รวม 5 ไฟล์. Git ก่อน **34 modified / 15 untracked / 0 deleted** → หลัง **35 modified / 16 untracked / 0 deleted**; งานเดิมนอกขอบเขต 762 ไฟล์ตรง Baseline. ไม่เปลี่ยน Sidebar/Header/Layout/เมนูอื่น/Auth/RBAC/Schema/PDF source/Frontend production code และไม่ Commit/Push/Reset/Clean/Stash/Checkout. **NEXT TASK:** รอผู้ใช้ตรวจรับในหน้า Profile จริง ไม่เริ่มโมดูลอื่น. รายละเอียดและคำสั่ง opt-in tests อยู่ใน [Current Handoff](HANDOFF_fitm-intern.md).

## ประวัติ — Student Profile อีเมลติดต่อ / ที่อยู่ปัจจุบันอัตโนมัติ — 5 พฤศจิกายน 2026

แก้เฉพาะสองจุดใน Student Profile: ลบอีเมลบัญชีที่แสดงซ้ำใน Contact Card พร้อม JS bindings โดยคงอีเมลใน Student Summary/Account/Login เดิม; เพิ่ม **Read-only Preview ที่อยู่ปัจจุบัน** จากบ้านเลขที่ → ถนน → ตำบล/แขวง → อำเภอ/เขต → จังหวัด → รหัสไปรษณีย์ อัปเดตทันทีเมื่อกรอก/แก้/ลบ ข้ามค่าว่างและไม่แสดง null/undefined หรือช่องว่างซ้ำ. Source/Contract ปัจจุบันไม่มีช่องหมู่/ซอย จึงไม่เพิ่ม Schema หรือ API keys เอง. ที่อยู่ทะเบียนบ้านไม่ถูกนำมาเติมแทน.

Generated text ใช้ `profile.current_address` และ aggregate/Draft/Save All/If-Match/409/validation เดิมเมื่อข้อความเก่าว่างหรือตรงกับ generated baseline ของช่องย่อย. **ข้อความเก่าอิสระที่จับคู่ไม่ได้จะเก็บและแสดงแยกแบบอ่านอย่างเดียว ไม่ถูกเขียนทับด้วย Preview**; บันทึกเฉพาะ structured fields ที่แก้ในกรณีนั้น. หลัง reload ยังคำนวณ Preview จาก current structured row และรักษา legacy text เดิม. เปิดหน้าอย่างเดียวไม่สร้าง row/เขียนค่าใหม่. ข้อตกลงนี้แทนที่การให้พิมพ์ข้อความที่อยู่ปัจจุบันซ้ำกับช่องย่อยในประวัติรอบก่อน; ที่อยู่ทะเบียนบ้านคงเดิม.

ผลตรวจใหม่: **46/46 (Profile38 + regression8)** จาก `node --test --test-isolation=none frontend/test/studentProfileContacts.test.js frontend/test/phase1.test.js` ผ่าน. ครอบคลุม generated input/change/clear/revert/Save/read-back, legacy preservation รวมข้อความใหม่จากอีกหน้าต่างหลัง 409 review, Draft/late typing/409 และ DOM contracts. Syntax และ build จาก frontend `npm.cmd run build -- --configLoader native` **154 modules PASS**. Chrome จริงกับ HTML/CSS/Controller/API adapter จริงและ **API จำลอง** ผ่าน **1280/768/390/320 px**, ไม่มี overflow/form ซ้อน/IDs ซ้ำ/label หรือ ARIA references หาย; ผ่าน Save/fresh GET/page reload/409 และ legacy preservation. Backend health `/` และ `/health/db` 200 เป็น read-only smoke เท่านั้น. **Live-account Backend/PostgreSQL Save และ PDF/OCR E2E ยัง NOT TESTED**.

แก้เพิ่มจาก baseline 6 ไฟล์: `frontend/src/student_coop/student_coop.html`, `frontend/src/pages/student_coop.js`, `frontend/src/pages/studentProfileWorkspace.js`, `frontend/test/studentProfileContacts.test.js`, `HANDOFF_fitm-intern.md`, `README.md`; ไม่มีเพิ่ม/ลบไฟล์. Git ก่อน/หลัง **34 modified / 15 untracked / 0 deleted**, รักษางานเดิมครบ. ไม่แก้ Backend/Database/Auth/CSS/API adapters/เมนูอื่น และไม่ Commit/Push/Reset/Clean. **NEXT TASK: รอผู้ใช้ตรวจรับหน้า Profile จริง**; ไม่เริ่มฟังก์ชันอื่น. รายละเอียดหลักฐานและข้อจำกัดใน [Current Handoff](HANDOFF_fitm-intern.md).

## ประวัติ — Student Profile ติดต่อ / ที่อยู่แยกกัน — 5 พฤศจิกายน 2026

**IMPLEMENTED / FOCUSED TESTS + SYNTAX + BUILD PASS / CHROME FIXTURE PASS (MOCK API) / LIVE BACKEND E2E NOT VERIFIED.** ส่วน Contact เรียงเป็น **ข้อมูลติดต่อ → ที่อยู่ตามทะเบียนบ้าน → ที่อยู่ปัจจุบัน**. ข้อมูลติดต่อรวมโทรศัพท์เดิม, อีเมลบัญชีอ่านอย่างเดียว, LINE/Facebook; แต่ละที่อยู่กรอก Inline ได้ทันที พร้อมบ้านเลขที่/ถนน/ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์และที่อยู่ข้อความเดิมครบ.

ลบปุ่ม “ใช้ที่อยู่เดียวกับทะเบียนบ้าน” พร้อม Handler คัดลอก, ข้อความ “ช่องที่ระบุว่าจำเป็นต้องกรอก ช่องอื่นเว้นว่างได้” และ contact summary ที่แสดงซ้ำ. หัวข้อ “ที่อยู่และโทรศัพท์ที่บันทึกไว้” เดิมเป็น editors จึงย้ายฟิลด์ทั้งหมดเข้าหมวดที่เกี่ยวข้องแทนการลบ. รักษา API keys, required/validation และ hidden legacy adapters เดิม; ไม่แปลงหรือ sync ข้อความเดิมไปทับ structured address. Save All ส่งเฉพาะค่าที่เปลี่ยน และไม่สร้าง/ล้างที่อยู่เมื่อแค่โหลดหน้า. Draft/If-Match/409/late typing/Title/Gender/รูปบนสุด/PDF/Responsive/Noto Sans Thai เดิมยังคงอยู่.

ผลใหม่ **41/41 (Profile33+regression8)** จาก `node --test --test-isolation=none frontend/test/studentProfileContacts.test.js frontend/test/phase1.test.js`; ทดสอบ independent Save/Reload, missing rows, omitted-value preservation, Draft/validation/409 และ DOM contracts ด้วย API จำลอง. Syntax และ Frontend `npm.cmd run build -- --configLoader native` **154 modules PASS**.

**Chrome จริง 1280/768/390/320 px ผ่านใน Profile fixture:** ใช้ HTML/CSS/Controller/API adapter จริงกับข้อมูลสังเคราะห์และ intercept API ทั้งหมด; ตรวจไม่ล้น, grid 2/1 columns, รูปด้านบน, ไม่มี form ซ้อน, IDs/labels/ARIA และ Save/Fresh GET/Page Reload ของที่อยู่ทั้งสองแยกกัน รวม 409→Review→Save. **ไม่ได้ทดสอบ live-account/backend/PostgreSQL E2E หรือ PDF/OCR ไฟล์จริง**. ไม่ส่ง request ถึง Backend/Database และไม่แก้ Auth.

รอบนี้แก้เพิ่ม 6 ไฟล์: `frontend/src/student_coop/student_coop.html`, `frontend/src/pages/studentProfileWorkspace.js`, `frontend/src/pages/student_coop.js`, `frontend/test/studentProfileContacts.test.js`, `HANDOFF_fitm-intern.md`, `README.md`. ไม่มีเพิ่ม/ลบไฟล์; Git ก่อน/หลัง **34 modified / 15 untracked / 0 deleted**, รักษางานค้างเดิมครบ. CSS/field definitions/API adapters/Backend/Database/Sidebar/Header/เมนูอื่นไม่เปลี่ยน และไม่ Commit/Push/Reset/Clean/Stash.

**NEXT TASK: รอผู้ใช้ตรวจรับหน้า Profile จริง** ไม่เริ่มฟังก์ชันอื่น. รายละเอียดหลักฐานและข้อจำกัดอยู่ใน [Current Handoff](HANDOFF_fitm-intern.md); ประวัติ Title Database ด้านล่างยังเก็บไว้ ไม่ใช่ผลตรวจใหม่ของรอบ frontend นี้.

## ประวัติ — English Title Development Persistence Enabled — 5 พฤศจิกายน 2026

**DEVELOPMENT SCHEMA READY / BACKUP + RESTORE PASS / REAL POSTGRESQL + HTTP ACCEPTANCE PASS / BUILD PASS / BROWSER NOT VERIFIED.** เพิ่มเฉพาะ `public.student_profiles.english_prefix varchar(255) NULL` บน Development `127.0.0.1:5432 / intern_system` PostgreSQL 16.15 ตามอนุญาตแล้ว. ไม่มี default/backfill/การแก้ข้อมูลนักศึกษาจริงหรือ Schema อื่น. สถานะนี้แทน Title Persistence BLOCKED / Awaiting Authorization ของ Development ในประวัติด้านล่าง.

ก่อน DDL ทำ read-only preflight, ตรวจ [SQL Preview](backend/src/db/studentProfileEnglishTitle.preview.sql), Backup ใหม่ด้วย pg_dump16 และ Restore ฐานแยกสำเร็จ; ซ้อม DDL และทดสอบก่อน Apply จริง. Backup 185,744 bytes เก็บแบบ private ACL และ Git-ignored ที่ `.local-db-backups/20261105-title-fc1b0c2e/intern_system.dump`; ฐาน Restore `fitm_profile_accept_20261105_fc1b0c2e` ยังคงอยู่พร้อมข้อมูลต้นฉบับครบและล้าง fixtures แล้ว. ไม่ restore ทับฐานเดิม. Preview ยังคง ROLLBACK เพื่อการตรวจทาน; Apply ใช้ transaction/target guards/locks/timeouts และตรวจ preservation ก่อน Commit.

Title (English) **แสดงผลและพร้อมบันทึกจริง**: Mr./Mrs./Miss/Ms./ค่าว่าง รวมค่า legacy ที่ validation เดิมรองรับ; เก็บใน `profile.english_prefix` โดยไม่เดาจากคำนำหน้าไทย. ทดสอบ Save/SQL read-back/Fresh GET/Reload ผ่าน PostgreSQL ฐานแยกครบทุกตัวเลือกและ null/empty/whitespace. Backend ที่รันอยู่ตรวจ metadata จริงพร้อมแล้ว; UI เดิมซ่อนคำเตือนเฉพาะ Title เมื่อ `profile_english_prefix_available === true` จึงไม่ต้องบังคับซ่อนหรือถอด fallback. Gender ไทย/อังกฤษยังใช้ `profile.gender` เดียวและทดสอบ sync/Save/Reload ทั้งสองทิศทางผ่าน. ไม่เขียนข้อมูลนักศึกษาจริงเพื่อทดสอบ.

หลัง Commit ข้อมูลเดิมทั้ง **47 ตาราง** และ Schema objects เดิมครบ: columns **553→554**, constraints **250**, indexes **121**, triggers **15** เท่าเดิม; students **7**, profiles **6**, student files **13** เท่าเดิม. เทียบ row counts และ fingerprints แบบ private ก่อน/หลังโดยตัดเฉพาะคอลัมน์ใหม่ออก. ไม่แตะ Production/Staging, Sidebar/Header/เมนูอื่น/Auth/Workflow อื่น, `.env`, encryption key หรือข้อมูลบัญชี.

ผลรอบนี้: **PostgreSQL/HTTP 19/19 test nodes** ผ่าน โดยใช้บัญชีสังเคราะห์เฉพาะฐานแยก; ครอบคลุม Title/nullable/legacy/omission/validation/owner isolation/atomic rollback/Draft/late typing/If-Match 428/409/review, Gender สองภาษา และ explicit PDF mapping builder ลง DB. รัน opt-in ด้วย `FITM_PROFILE_POSTGRES_TESTS=1`, `FITM_PROFILE_TEST_DATABASE=fitm_profile_accept_20261105_fc1b0c2e` เฉพาะ test process และ `node --test backend/test/studentProfilePostgres.test.js`; default SKIP และไม่ยอมใช้ intern_system เป็น test target. Frontend controller ใช้ synthetic DOM จึงไม่ใช่ Browser E2E.

Focused regression **54/54 (Frontend37+Backend17)** ผ่านด้วย `node --test --test-isolation=none frontend/test/studentProfileContacts.test.js frontend/test/phase1.test.js backend/test/studentProfileContacts.test.js`; รวม DOM/Draft/Save/PDF Preview/Mapping/Confirm/ready-pending guards. Syntax และ Frontend Build **154 modules** ผ่านจาก frontend ด้วย `npm.cmd run build -- --configLoader native`. Backend health/db 200, anonymous protected API 401 และ Student HTML 200. **Browser/Responsive, การ Save ด้วยบัญชีจริง และ PDF/OCR/ไฟล์จริง E2E ยัง NOT VERIFIED**.

รอบนี้แก้เพิ่มเฉพาะ `backend/test/studentProfilePostgres.test.js`, `HANDOFF_fitm-intern.md`, `README.md`; รักษางาน uncommitted เดิม. Git ก่อน/หลัง **34 modified / 15 untracked / 0 deleted**; ไม่ Commit/Push/Reset/Clean/Stash. รายละเอียด Target/Backup/ข้อจำกัดอยู่ใน [Current Handoff](HANDOFF_fitm-intern.md).

หลัง DDL รัน PostgreSQL/HTTP acceptance ซ้ำ **19/19 PASS**, cleanup fixtures ครบ และอ่านตรวจ Schema/ข้อมูลเดิมของ Development อีกครั้งผ่าน.

**NEXT TASK: หยุดรอผู้ใช้ตรวจรับ** ไม่เริ่มฟังก์ชันอื่น. เก็บ Backup/ฐาน Restore ไว้; ไม่ DROP คอลัมน์หรือ restore ทับ live เพื่อย้อนงาน.

## ประวัติ — English Title Persistence Prepared — 5 พฤศจิกายน 2026

**CODE READY / LIVE DATABASE PENDING / FOCUSED SYNTHETIC + STATIC + BUILD PASS / BROWSER NOT VERIFIED.** เตรียมModel/ownerAPI/Validation/Draft/SaveReadBack/PDFสำหรับ `profile.english_prefix` nullablevarchar255 แล้ว; รองรับMr./Mrs./Miss/Ms./ค่าว่าง/ค่าlegacyโดยไม่เดาจากThai prefix. Genderอังกฤษยังเป็นdropdownmirrorของ `gender` เดียว; Layout/HTML/รูป/Inline/CSS/NotoSansThai/เมนูอื่นไม่เปลี่ยน.

Backendตรวจcolumnmetadataจริงและส่ง `profile_english_prefix_available`. ก่อนติดตั้งหรือdefinitionไม่ตรงยังอ่าน/บันทึกProfileส่วนอื่นและสร้างProfileเดิมได้; Titlewrites503และUIยังแสดงBLOCKED/เก็บDraft. เมื่อcolumnพร้อมจริงจึงเปิดPersistenceและซ่อนคำเตือน; ตรวจTitleacknowledgementก่อนSuccess. PDFรองรับexplicitEnglishTitle/AcroFormและConfirmMappingเดิม; pendingSchemaจะข้ามTitleพร้อมเตือนแต่ไม่ปิดImportส่วนอื่น.

Read-onlypreflightรอบนี้ยืนยัน **Development `127.0.0.1:5432 / intern_system.public` PostgreSQL16 ยังไม่มีenglish_prefix**. จึงยังไม่อ้างTitleSaveลงDatabaseจริงผ่าน. เตรียม [SQL Preview](backend/src/db/studentProfileEnglishTitle.preview.sql) เพิ่มnullablecolumnเดียว ไม่มีbackfill/default/Drop/migrationrunner. ไฟล์จบROLLBACKและ**ยังไม่เคยexecute**; ต้องอนุญาตก่อนDDLรวมถึงการทดสอบRestore. แผนBackup→verifiedRestore→preservationchecks→guardedDDL/COMMITอยู่ใน [Current Handoff](HANDOFF_fitm-intern.md).

ผลใหม่ **54/54 (Frontend37+Backend17)**: `node --test --test-isolation=none frontend/test/studentProfileContacts.test.js frontend/test/phase1.test.js backend/test/studentProfileContacts.test.js`; syntheticready/pending/legacy/SaveReadBack/If-Match409/Draft/PDFConfirm/rollback/regressionผ่าน. Syntax/DOM/SQLstatic/PythonhelpersและBuildจากfrontend `npm.cmd run build -- --configLoader native` ผ่าน. Hostไม่มีPyMuPDFและChromeheadlessปิดก่อนDevTools จึงไม่อ้างPDF/OCRหรือBrowserE2Eผ่าน.

**NEXT TASK:** ขออนุญาตBackup+Restoreฐานชั่วคราวและเพิ่ม `student_profiles.english_prefix varchar(255) NULL` บนDevelopmentตามPreviewก่อนลงมือจริง แล้วตรวจAPI/Database/Browserread-backตามหลักฐานจริง. ไม่DDL/reset/สร้างบัญชี/เปลี่ยนAuthหรือเมนูอื่นเอง.

## ประวัติ — Student Profile English Title / Shared Gender — 5 พฤศจิกายน 2026

**FRONTEND IMPLEMENTED / TITLE PERSISTENCE BLOCKED / FOCUSED SYNTHETIC + STATIC + BUILD PASS / BROWSER NOT VERIFIED.** คืน Personal Information (English): Title|Gender → First Name|Last Name. TitleมีMr./Mrs./Miss/Ms. และรักษาค่าเดิมหากsnapshotส่งมา; ไม่จับคู่จากคำนำหน้าไทย. GenderอังกฤษแสดงMale/Female/Unspecified และค่าlegacyตามBackend varchar(32), syncทันทีกับเพศไทยผ่าน `profile.gender` เดียว ไม่มีคอลัมน์หรือAPIfieldเพศซ้ำ. ไทยใช้controlsเดิมวางคำนำหน้า|เพศเหนือชื่อ|นามสกุล. รูปบนสุด/DirectInline/Responsivegrid/NotoSansThai/4+2tabs/Save/Draft/PDF/เลขบัตร/เมนูอื่นคงเดิม.

**Titleบันทึกไม่ได้จริง:** SourceBackend/Schemaยังไม่มีEnglish-prefix field. Titleเป็นDraftในหน้านี้; หากเปลี่ยนแล้วSaveจะหยุดพร้อมBLOCKEDและเก็บทุกDraft ไม่ส่งunsupportedkeyหรือรายงานSuccess. ตั้งTitleกลับค่าเดิมก่อนSaveข้อมูลส่วนอื่น. Gender/ชื่ออังกฤษ/นามสกุลใช้Persistence/APIเดิม; รอบนี้ตรวจSource+syntheticSave/read-back ไม่มีDatabasewritesหรือlive-accountE2E. Backend/Models/API contract/canonicalDraft/PDF files/CSS/Authไม่เปลี่ยน.

ผลใหม่ **35/35 (Profile27+regression8)**: `node --test --test-isolation=none frontend/test/studentProfileContacts.test.js frontend/test/phase1.test.js`; syntax/DOMcontracts/bilingualsync/legacyvalues/TitleBLOCKED/late typing/If-Match409/PDF/baselinechecksผ่าน. Buildจากfrontend: `npm.cmd run build -- --configLoader native` ผ่าน. Chromeheadlessยังปิดก่อนDevToolsจึงไม่อ้างBrowser/ResponsivePASS.

**NEXT TASK:** ManualChrome1280/768/390/320และSave+Reload/PDFจริงตาม [Current Handoff](HANDOFF_fitm-intern.md). มีแผนAdditiveTitle(`english_prefix` nullablevarchar255 + Model/ownerAPI/explicitPDFmapping/guardedrollout) ในHandoffเท่านั้น; **ยังไม่รันDDLหรือแก้Databaseจริง** และต้องได้รับอนุญาตสำหรับDBก่อนดำเนินการ.

## ประวัติ — Student Profile Thai Personal Data / National ID — 5 พฤศจิกายน 2026

**IMPLEMENTED / FOCUSED TESTS + REAL POSTGRESQL/HTTP ROLLBACK ACCEPTANCE + BUILD PASS / BROWSER NOT VERIFIED.** เพศย้ายมา Inlineข้อมูลส่วนตัวไทยพร้อมคำไทยและรักษาvalueเดิม (`male`/`female`/ค่าเดิมอื่น). Englishเหลือชื่อ/นามสกุลสองช่อง. เปิดเลขบัตรประชาชนoptional13หลักพร้อมchecksum validationทั้งFrontend/Backend; ใช้owner APIเดิมเพิ่ม `profile.national_id` และเก็บในสองencryptedcolumnsเดิมด้วยAES-256-GCM ไม่เปลี่ยนSchema/Models/Auth.

Keyสร้างเมื่อSaveIDครั้งแรกที่ `STORAGE_ROOT/keys/student-profile-national-id-v1.key` ภายในpersistentstorageเดิม; ต้องรักษา/สำรองพร้อมข้อมูลเข้ารหัส. Missing/unknown/corrupt keyหรือciphertextตอบ503และไม่เขียนทับข้อมูล. ไม่แสดงIDในLog/Summary/conflictหรือเก็บในAuth Storage. PDF mappingเดิมไม่รับnational-ID fieldใหม่นี้และไม่ส่งค่าไปprocessor.

ลบ “ตัวเลือกเพิ่มเติม”/ปุ่มReload+Discard/listenersและSummaryส่วนตัว+สุขภาพตามคำสั่ง. คงข้อมูลและInlineสุขภาพ/รูป/4+2tabs/Save All/Draft/If-Match/409/Calendar/Close Friends/PDF/เอกสาร/Resumeเดิม. CSS/NotoSansThai/เมนูอื่น/Sidebar/Header/Backendส่วนอื่น/DatabaseSchema/.env/Dockerไม่เปลี่ยน.

ผลใหม่ **46/46 (Frontend32+Backend14)**: `node --test --test-isolation=none frontend/test/studentProfileContacts.test.js frontend/test/phase1.test.js backend/test/studentProfileContacts.test.js`; Syntax/DOM/scope/UTF-8/Baseline checksผ่าน. Buildจากfrontend: `npm.cmd run build -- --configLoader native` ผ่าน. ทดสอบactualPostgreSQL16+isolatedHTTP/JWT+FrontendAPIadapter Save/edit/read-back/encryptedstorage/validation/409/clearผ่านในtransactionที่Rollbackแล้ว; profile/studentfingerprintsเดิมตรง ไม่มีสร้างบัญชี/DDL/committedID/livekey.

**NEXT TASK:** ตรวจChromeจริง1280/768/390/320px, optionalID Save+Reloadที่เจ้าของยินยอม, Responsive/focus/Calendar/PDFจริง ตาม [Current Handoff](HANDOFF_fitm-intern.md). Chromeheadlessยังปิดก่อนDevTools จึง **BROWSER NOT VERIFIED**; ไม่อ้างcommittedreal-accountหรือOCR/ไฟล์จริงE2Eผ่าน.

## ประวัติ — Student Profile Form Refinement — 5 พฤศจิกายน 2026

**IMPLEMENTED WITH ENGLISH-PREFIX LIMITATION / FOCUSED SYNTHETIC + STATIC + BUILD PASS / BROWSER NOT VERIFIED.** ลบ `(ถ้ามี)` จาก Labels เฉพาะ Profile โดยคง Required/Optional/validators เดิม. คำนำหน้าไทยเป็น Dropdown นาย/นาง/นางสาว; เพศเป็น Dropdown ชาย/หญิง/ไม่ประสงค์ระบุ ตาม Backend varchar(32) และรักษาค่า free-text/English ที่โหลดมาโดยไม่แปลงเอง. ไม่มี English-prefix field ใน Backend/Schema/API/PDF จึงแสดง Dropdown Mr./Mrs./Miss/Ms. แบบ disabled พร้อมคำอธิบาย ไม่มีการบันทึกจำลองหรือจับคู่จากคำนำหน้าไทย.

วันเกิดใช้ Popup ขาว/ฟ้า/ขอบ12px เฉพาะ Profile พร้อมเดือนภาษาไทย/ปี ค.ศ. ย้อนหลัง/Selected/Today/keyboard/Escape/visible focus/ล้างวันที่. ไม่เพิ่ม dependency; เก็บ `YYYY-MM-DD` เดิม ใช้ Bangkok today และ UTC calendar arithmetic ป้องกันวันเลื่อน. เปิด/ปิดหรือเปลี่ยนเดือน/ปีไม่เปลี่ยน Draft. นำปุ่ม “โหลดสถานะอาจารย์โครงการล่าสุด” และ handler เฉพาะปุ่มออก; คง Advisor summaries/Project API/workflows/เมนูอื่นเดิม. รูปด้านบน/Inline/4+2tabs/Save All/Draft/If-Match/409/เพื่อนหลายคน/PDF/ไฟล์แยกยังคงเดิม; Backend/Database/Auth/Sidebar/Header/Dependenciesไม่เปลี่ยน.

ผลใหม่ **Frontend31/31 (Profile23+regression8)** พร้อม syntax/DOM contracts/CSS scope/Baseline preservation ผ่าน. รัน root: `node --test --test-isolation=none frontend/test/studentProfileContacts.test.js frontend/test/phase1.test.js`. Build จาก frontend: `npm.cmd run build -- --configLoader native` **154 modules PASS**; default config bundler ติด `spawn EPERM`. Backend health200/anonymous Profile401/Student HTML200. ผลเป็น synthetic/static/build ไม่ใช่ real-account Save/DB integration หรือ Browser.

**NEXT TASK:** ตรวจ Chrome ที่1280/390/320px: Labels/Dropdownค่าเดิม/Calendarเดือนปีและkeyboard/Draft/Save+Reload/PDFเฉพาะmapping/ไม่มีoverflow/Projectเมนูเดิม ตาม [Current Handoff](HANDOFF_fitm-intern.md). Chrome headlessยังปิดก่อนDevTools จึง **BROWSER NOT VERIFIED**. English-prefix persistence ต้องมีงาน Backend/Schema ที่ได้รับอนุญาตแยก; ไม่เริ่มเอง.

## ประวัติ — Student Profile Direct Inline Editing — 5 พฤศจิกายน 2026

**IMPLEMENTED / FOCUSED SYNTHETIC + STATIC + BUILD PASS / BROWSER NOT VERIFIED.** หลังโหลด Profile สำเร็จกรอกข้อมูลทั่วไป Inline ได้ทันที; ลบปุ่มเปิดแก้และฟอร์มที่ผู้ใช้กรอกซ้ำใน Modal. Modalคงไว้สำหรับรูป/Preview พร้อม2tabsเดิมและทางกลับไปข้อมูลติดต่อ. รักษาadapter IDsเป็นhidden stateและDraft/If-Match/validation/owner/Save logicเดิม ไม่ใช่ฟอร์มแก้ไขชุดที่สอง.

ลำดับใหม่: นักศึกษา/บัญชี → ส่วนตัว → ติดต่อ/ที่อยู่ → ครอบครัว/ผู้ปกครอง → ฉุกเฉิน → เพื่อนสนิท → การศึกษา → ทักษะ/ความสามารถ → สุขภาพ/เพิ่มเติมท้ายแท็บการศึกษา/ทักษะ. คง4Main tabsและSection linksตรงตำแหน่งจริง. รูป/Summary/Modern Design/CSSเดิม; อายุreadonlyย้ายเข้าInline. Field/API keys/Required/validatorsเดิมครบ ไม่แก้Backend/DB/API/เมนูอื่น. รูป/PDF/Documents/Resumeยังบันทึกแยก.

ผลใหม่: **Frontend26/26 (Profile18+regression8)**, syntax/HTML+DOM contracts/isolation/Diff/UTF-8และBuild153modules PASS. รันroot: `node --test --test-isolation=none frontend/test/studentProfileContacts.test.js frontend/test/phase1.test.js`; buildจากfrontend: `npm.cmd run build -- --configLoader native`. เป็นsynthetic/static/build; Chromeยังปิดก่อนDevTools ไม่มีVisual/Responsive/real-file E2E PASS.

**NEXT TASK: ผู้ใช้ตรวจDirect Inline/ลำดับ/Save/Draft/รูป/เพื่อนที่1280/768/390/320pxตาม [Current Handoff](HANDOFF_fitm-intern.md) แล้วส่งจุดปรับ.** หยุดก่อนงานอื่น.

## ประวัติ — Student Profile Exact Text-only Design — 5 พฤศจิกายน 2026

**DESIGN IMPLEMENTED / FOCUSED SYNTHETIC + STATIC + BUILD PASS / BROWSER NOT VERIFIED.** สเปกข้อความใหม่แทนภาพ Mockup อย่างสมบูรณ์; ไม่ต้องรอหรือขอภาพอีก. Profile ใช้โทนขาว/ฟ้าและ local tokens เฉพาะ `#panel-profile`, Summary/Photoด้านบนพร้อม major/year/status จาก API และปุ่มเปลี่ยนรูปผ่าน Editor เดิม, segmented entry method, 4 Main tabs/ทางลัดเฉพาะแท็บ/Form Cardเดียว, Desktop2columns/Mobile1column และ Saveจุดเดียวพร้อมสถานะจริง. 2 Modal tabs และข้อมูล/ฟังก์ชันเดิมครบ.

รักษา Draft/If-Match/409/validation/owner/Shared Feedback, เพื่อนหลาย Card/ชื่อเล่น/strict Facebook/Stage Delete/Undo และ PDF/รูป/Documents/Resume lifecycleเดิม. CSS/JSที่เพิ่มจำกัด Profile; Sourceนอก Profile/Sidebar/Global Header/เมนูอื่น/Backend/API/Database/.env ไม่เปลี่ยน.

ผลตรวจใหม่: **Frontend24/24 (Profile16+regression8), syntax/HTML contracts/CSS scope PASS, Build153 modules PASS**. รันจากrootด้วย `node --test --test-isolation=none frontend/test/studentProfileContacts.test.js frontend/test/phase1.test.js`; buildจากfrontend `npm.cmd run build -- --configLoader native`. เป็น synthetic/static/build ไม่ใช่ Visual PASS. Chrome headlessยังออกก่อนDevTools จึงไม่มี screenshot/responsive/real upload acceptance.

**NEXT TASK: ผู้ใช้ตรวจหน้าเว็บจริง1280×800/768×1024/390×844/320×568ตาม [Current Handoff](HANDOFF_fitm-intern.md) แล้วแจ้งจุดปรับ.** ไม่เริ่มโมดูลถัดไปเอง. สถานะ Missing Reference ของประวัติด้านล่างถูกแทนที่โดยสเปกข้อความนี้แล้ว.

## ประวัติ — Student Profile Visual / Photo Placement — 5 พฤศจิกายน 2026

**PARTIAL — PHOTO/SUMMARY IMPLEMENTED / REFERENCE IMAGE MISSING / BROWSER NOT VERIFIED.** ย้ายรูปและ Student Summary จาก disclosure ด้านล่างขึ้นใต้ Profile Header ก่อนวิธีกรอก/Tabs และแสดงทุกแท็บ. ใช้ข้อมูล/Placeholder/Avatar control และ image editor/upload เดิม; Card ย่อได้บนมือถือ ปุ่มเปลี่ยนรูปเห็นได้ และปุ่มเปิด Modal เป็นคำสั่งรอง.

แก้เฉพาะ HTML/CSS ใน Profile และเอกสาร; Source นอก Profile/JS/API/Backend/Database/Sidebar/Header/เมนูอื่นคงเดิม. Original IDs, 4+2 tabs, file inputs และ Workflow เดิมครบตาม static contracts. ผลใหม่ Frontend focused22/22 + syntax/HTML/CSS scope checks + Build153 modules PASS; ไม่ใช่ rendered Visual PASS.

ไฟล์แนบที่ได้รับมีเฉพาะข้อความ ไม่มีภาพ Mockup ให้เทียบ. **NEXT TASK: รับภาพอ้างอิงหรือพาธภาพ แล้วทำส่วน Match Reference ต่อก่อนตรวจรับใน Chrome** ที่ 1280×800/768×1024/390×844/320×568. Chrome headless ยังปิดก่อน DevTools; real upload/focus/overflow/visual acceptance ยังไม่ตรวจ. รายละเอียดไฟล์/Baseline/checklist อยู่ใน [Current Handoff](HANDOFF_fitm-intern.md).

## ประวัติ — Student Profile UX/UI Refinement — 5 พฤศจิกายน 2026

**IMPLEMENTED / FOCUSED SYNTHETIC + STATIC + BUILD PASS / BROWSER NOT VERIFIED.** Profile ใช้ Header และวิธีกรอกเอง/PDF แบบกระชับ เปิดแล้วเริ่มกรอก inline ได้; คง 4 Main tabs + 2 Modal tabs และแสดงทางลัดเฉพาะหัวข้อย่อยของแท็บปัจจุบัน. สรุปข้อมูลเดิม/รูปโปรไฟล์/ทางเข้า Modal เปิดดูได้ในหัวข้อพับเก็บ.

- ปุ่มหลัก “บันทึกประวัติ” จุดเดียวท้ายฟอร์ม พร้อมลิงก์ข้ามจาก Header. Reload/Discard อยู่ในตัวเลือกเพิ่มเติม; Retry เฉพาะ load failure และ Review เฉพาะ revision conflict. Save bar อยู่ใน document flow. ไม่มี autosave; รักษา Draft/If-Match/owner/late response และ confirmation เดิม.
- เพื่อนสนิทหลาย Card ใช้ fields/URL/privacy เดิม; ยืนยันลบเป็น Draft และ Undo คืนได้ทันทีจน Save. PDF Preview/Mapping/Confirm รูป Resume และเอกสารยังบันทึกแยกตาม Lifecycle/API เดิม.
- ผลตรวจใหม่: Frontend Profile14 + regression8 = **22/22**, Backend Profile **12/12** แบบ synthetic/in-memory (ไม่มี DB writes), syntax/static DOM contracts และ Build **153 modules PASS**. รันจาก root: `node --test --test-isolation=none frontend/test/studentProfileContacts.test.js frontend/test/phase1.test.js` และ `node --test --test-isolation=none backend/test/studentProfileContacts.test.js`; build จาก frontend ด้วย `npm.cmd run build -- --configLoader native`.
- รอบนี้แก้เฉพาะ Profile frontend/test และเอกสาร; ไม่เปลี่ยน Database/Backend/API/Auth/Theme/Font/โมดูลอื่น. รายละเอียดไฟล์/Git Baseline/Workflow ใน [Current Handoff](HANDOFF_fitm-intern.md).

**NEXT TASK: Manual Chrome acceptance 1280×800 / 768×1024 / 390×844 / 320×568 ตาม Handoff.** Chrome headless ปิดก่อน DevTools; ยังไม่ยืนยัน rendered UX/overflow/keyboard/focus/real-account save และ PDF/ไฟล์ E2E. ไม่อ้างผล PostgreSQL รอบก่อนเป็นผล UX ใหม่ และไม่เริ่มโมดูลถัดไปเอง.

## ประวัติ — Student Profile Database Finalization — 5 พฤศจิกายน 2026

**DEVELOPMENT SCHEMA READY / BACKUP-RESTORE PASS / REAL POSTGRESQL + ISOLATED HTTP API PASS / BROWSER NOT VERIFIED.** เพิ่มSchemaจริงเฉพาะDevelopment `intern_system.public` PostgreSQL16.15 หลังPreflight/Backup/Restoreผ่านแล้ว: `student_profiles.student_line_id varchar(100)`, `student_facebook varchar(500)` nullable และตารางOne-to-Many `student_close_friends` พร้อมUUID/ownerFK/timestamps/index/CHECKตามModels. ไม่เพิ่ม4single-friend columnsและไม่พบlegacy friend columnsที่ต้องbackfill.

- Backupใหม่custom183,292bytes เก็บในprivateGit-ignored directory พร้อมWindows ACLจำกัด; pg_dump/pg_restore16.15. ทดลองRestoreฐานแยกสำเร็จ ข้อมูล46ตารางตรงก่อนDDL. Archive SHA-256/path/metadataอยู่ใน [Current Handoff](HANDOFF_fitm-intern.md); ห้ามเผยBackupcontents.
- ใช้additiveDDL5statementsภายใต้transaction/locks/timeoutsและตรวจModels/Integrity+preservationก่อนcommit. ตาราง46→47,columns541→553,constraints247→250,indexes119→121,triggers15เท่าเดิม. students7/profiles6/files13คงเดิม;ข้อมูลและSchema objectsเดิมครบ,Social columnsใหม่ยังNULLทุกแถว,ตารางเพื่อน0แถว. ไม่แก้บัญชีจริง/.env/credentials/Compose/Volumes และไม่ใช้init/reset/sync/seed.
- **PASS15actual integration cases (Node16/16testnodes)**: isolatedPostgreSQL+actualExpress/JWT/Owner API,CRUD/read-back/multiple/optional,invalidURL/FK/PK/CHECK,ownerisolation,concurrentIf-Match409,atomicrollback,omitted-listpreservation,privateprojectionsและFrontendAPIadapterต่อHTTPจริง. ใช้syntheticaccountsในฐานRestoreเท่านั้น;cleanupครบและลบฐานทดสอบหลังตรวจlive/cloneSchemaและfull-rowfingerprintsตรงทั้ง47ตาราง. ผลนี้ไม่ใช่BrowserE2Eหรือreal-accountacceptanceบนlive.
- FreshfocusedProfiletests12/13และPhase1/1.5regression17/8PASS;build153modulesPASSด้วย `npm.cmd run build -- --configLoader native`. Livehealth200/anonymousprotectedAPI401/StudentHTML200. **ไม่มีFrontend/UI/Layout/Navigation/Theme/Font/Tabsเปลี่ยนรอบนี้**;รักษางานProfile/Draft/PDF/Resume/Auth/RBACและโมดูลเดิมทั้งหมด.

เพิ่ม `backend/src/db/studentProfileDevelopment.js` เป็นexplicitguardedoperationhelper (ไม่เรียกจากstartup/ไม่ใช่migrationrunner), `backend/test/studentProfilePostgres.test.js` เป็นopt-inisolatedtest. ทดสอบนี้defaultSKIPโดยไม่เปิดDB;ต้องมีฐานRestoreที่อนุมัติและชื่อตรงguardก่อนเปิด FITM_PROFILE_POSTGRES_TESTS/FITM_PROFILE_TEST_DATABASE เฉพาะtestprocess. ฐานชั่วคราวรอบนี้ถูกลบแล้ว ไม่สร้าง/seedใหม่อัตโนมัติ.

**NEXT TASK ของรอบ Database (ประวัติ): Student Profile UX/UI Refinement — ดำเนินการแล้วตามสถานะปัจจุบันด้านบน.** ManualChromeAcceptance1280/768/390/320/Draft/Save/Undo/409/PDFอยู่ในHandoff. Browser/Provider/realaccounts/OCR/ProductionยังNOT VERIFIED;ไม่แก้BrowserEnvironmentหรือChromeprofileรอบนี้.

## ประวัติ — Unified Student Profile / Multiple Close Friends — 5 พฤศจิกายน 2026 (สถานะSchemaแทนที่โดยผลด้านบน)

**IMPLEMENTED SOURCE / FOCUSED SYNTHETIC PASS / LIVE SCHEMA PENDING APPROVAL / BROWSER NOT VERIFIED / POSTGRESQL PERSISTENCE NOT VERIFIED.** งานนี้แทน single-friend columns และการบันทึกทีละหมวดของ Part1 เฉพาะ Profile; ไม่อนุมัติโมดูลถัดไปหรือ DB writes.

- กรอก Profile inline ต่อเนื่องพร้อม Section Navigation และปุ่มบันทึก Aggregate หลักครั้งเดียว, validation/focus/dirty state/review/discard/Draft/If-Match เดิม. รักษา 4 แท็บหลัก +2 Modal tabs; Modal mirror Draft เดียวกับ inline. รูป/Resume/private documents/PDF Import ยังบันทึกตาม Lifecycle/API แยกเดิมและระบุขอบเขตบน Toolbar.
- เพื่อนสนิทหลายคนอยู่ใน `student_close_friends` ผ่าน Sequelize hasMany/owner FK/UUID/index/CHECK; nickname/full_name/phone/line_id/facebook_url optional. เพิ่ม/แก้/ยืนยันลบ/Undo เป็น Draft จนกด Save. Omitted collection ไม่ลบเดิม; transaction/revision/owner checks ใช้ชุดเดิม. ชื่อเล่น (หรือชื่อจริงเมื่อไม่มีชื่อเล่น) เปิด HTTPS Facebook ในแท็บใหม่เฉพาะ exact allowed hosts พร้อม noopener noreferrer; ไม่มี URL เป็นข้อความปกติ ไม่ fetch Facebook.
- `student_profiles` เตรียมเพียง2nullable student social columns; ไม่มี single-friend columns ใน Schema Source ใหม่. API ตรวจ readiness และ block friend writes หากตารางไม่ครบหรือพบ legacy friend columns; ไม่ DROP/ย้ายข้อมูลอัตโนมัติ. Profile เดิมยังใช้ได้โดยไม่ส่งส่วน pending. DDL Preview/แผนรักษาข้อมูลเดิม/ข้อจำกัดอยู่ใน [Current Handoff](HANDOFF_fitm-intern.md); **ยังไม่เปลี่ยน PostgreSQL จริง** และห้ามใช้ init/reset/sync เปิดฟังก์ชัน.
- Owner GET aggregate เพิ่ม close_friends/readiness metadata; PATCH/PUT aggregate รับ explicit create/update/delete พร้อม If-Match และคืน ID receipts. Protected child routes `/api/student-profile/close_friends` ใช้ JWT/live Co-op owner guard เดิม. ไม่เพิ่ม public/Company/Mentor access/log payload/PDF export/NLP transfer. PDF mapping/commit จำกัด relationเดิมโดยชัดแจ้ง.

**ผลใหม่:** Profile Backend12/Frontend13 PASS (in-memory transactions/DOM/API substitutes), focused Phase1/1.5 regression17/8 PASS. Build153modules PASS ด้วย `npm.cmd run build -- --configLoader native`; default loaderติด spawn EPERM/oxide config bundling. HTTP health/delivery200; Chrome probeปิดก่อนDevTools จึงยังไม่มี rendered1280/768/390/320/keyboard/real Browser/PDF acceptance. SQL generation PASS ไม่ใช่ SQL execution หรือ PostgreSQL persistence/concurrency. ไม่เปลี่ยน flags/config/dependencies/accounts/.env ไม่ Commit/Push.

รัน focused tests จาก root: `node backend/test/studentProfileContacts.test.js`, `node frontend/test/studentProfileContacts.test.js`; รายชื่อไฟล์19ไฟล์/Schema Preview/API/ข้อจำกัดและNEXT TASKอยู่ใน Handoff หลัก.

## ประวัติ — Phase 2 Part 1: Student Profile — 4 พฤศจิกายน 2026 (แทนที่เฉพาะ Profile โดยสถานะด้านบน)

**SOURCE IMPLEMENTED / SYNTHETIC TESTS PASS / LIVE SCHEMA PENDING APPROVAL / BROWSER NOT VERIFIED.** ผู้ใช้อนุญาตเริ่มเฉพาะ Student Profile Enhancement แล้ว แทนที่สถานะ `PHASE 2 NOT STARTED` เฉพาะงาน Part 1 นี้; ขอบเขต ทก.01/แผนโมดูลอื่นยังรอการหารือ ไม่เริ่มงานถัดไปเอง.

- เพิ่ม LINE ID/Facebook นักศึกษา และชื่อ-นามสกุล/โทรศัพท์/LINE ID/Facebook เพื่อนสนิทในแท็บติดต่อเดิม ไม่เพิ่มแท็บ; ทุกช่องเป็น optional มีข้อความแจ้งการใช้ข้อมูลและแนะนำแจ้งเจ้าของข้อมูลก่อนบันทึก.
- ใช้ Owner API `/api/student-profile/me` เดิม, allowlist/validation, Draft/Save/Retry, Revision/If-Match และ Shared Feedback. เพิ่มสรุป Class Advisor/Project Advisor ใน Profile โดยใช้ความสัมพันธ์และคำขอเดิม แสดง pending/confirmed/rejected/empty/error แยกกัน ไม่ assign หรือเปลี่ยน approval flow.
- เตรียม **6 nullable columns ใน `student_profiles` เฉพาะ Source/Model definitions**; **ยังไม่เปลี่ยน DB จริง**. Owner API ตรวจ column metadata: ถ้ายังไม่ครบ จะอ่าน/บันทึก Profile เดิมได้ แต่ UI ปิดบันทึกสองหมวดใหม่ และ Backend ตอบ `503 PROFILE_CONTACTS_SCHEMA_PENDING` สำหรับการเขียนฟิลด์ใหม่. หลังได้รับอนุญาตต้องตรวจ target/ข้อมูลเดิม/backup และใช้ additive DDL เฉพาะรายการใน [Current Handoff](HANDOFF_fitm-intern.md); ห้ามใช้ init/reset/sync เพื่อเปิดฟังก์ชัน.
- ฟิลด์ใหม่ excluded จาก legacy/default Model projections และ PDF Import mapping/commit; ไม่ส่งข้อมูลที่บันทึกไป NLP ไม่เพิ่ม public API/log/audit payload/export. รักษา **4 แท็บหลักและ 2 แท็บใน Modal แก้ไขตาม Source จริง** (ข้อความ 5 Tabs ในประวัติคือ document drift), PDF preview/mapping/confirm, Co-op Only/Auth/session, Advisor relationships, Noto Sans Thai ของเว็บและ TH Sarabun New ของเอกสารเดิม.

**ผลตรวจที่รันใหม่:** Contact Backend **7 PASS**, Frontend **6 PASS**; focused Phase1/1.5 regression **17/8 PASS**; syntax **12 JS PASS**; Frontend build **153 modules PASS**. ใช้ actual services/controllers/JWT/Sequelize definitions กับ in-memory persistence และ DOM/API substitutes; ไม่ใช่ PostgreSQL/Provider/Browser E2E. PDF ตรวจ legacy mapping, preview และ privacy guards แบบ synthetic ไม่ได้ยืนยัน OCR/ไฟล์จริง. Responsive CSS เดิมถูกใช้ต่อ; rendered mobile/desktop/keyboard **BROWSER NOT VERIFIED**. ไม่ query/write DB จริง ไม่เปิด flags/restart/provision/commit/push. รายละเอียดไฟล์/DDL/ข้อจำกัดและงานรออนุญาตอยู่ใน Handoff.

รัน focused tests จาก repository root: `node backend/test/studentProfileContacts.test.js` และ `node frontend/test/studentProfileContacts.test.js`.

## ประวัติ — Full Source Audit & Documentation Sync — 4 พฤศจิกายน 2026 ก่อน Phase 2 Part 1

**READ-ONLY SOURCE AUDIT + DOCUMENTATION UPDATE ONLY.** รอบนี้แก้เฉพาะ README/Handoff ไม่แก้ Application/Tests/Database/Config และไม่รัน Tests/Build/Provider Login. Phase 1 และ Phase 1.5 มี implementation อยู่ใน Source; ยังไม่ใช่ Production Ready. ขอบเขต Student คือ **Co-op Only — Option A**: ปิดสิทธิ์ `internship` แต่เก็บข้อมูล/Schema/Shared Code รวม `/api/internship-logs` และ `internship_*` ที่ Co-op ใช้จริง.

**ขอบเขตปริญญานิพนธ์กำลังเปลี่ยน:** ทก.01 ฉบับเก่าเป็น requirement reference ตามวันที่ ไม่ใช่ข้อกำหนดล่าสุดทั้งหมด. ไม่แก้ ทก.01 ไม่เพิ่ม/ตัด Feature และไม่อนุมัติ Roadmap แทนผู้ใช้. สถานะถัดไปคือ **WAITING FOR UPDATED ทก.01 REQUIREMENTS / PHASE 2 NOT STARTED / DEVELOPMENT PLAN PENDING USER DISCUSSION** ซึ่งแทนที่ข้อความรอเริ่ม Phase 2/แผนพัฒนาอัตโนมัติในประวัติ.

### Evidence และสถานะการตรวจ

| ชนิดหลักฐาน | ผลและขอบเขต |
| --- | --- |
| VERIFIED FROM SOURCE | Inventory ทุกกลุ่มใน Repository, เชื่อม UI handlers → API clients → routes/controllers/services → Models, guards, NLP และ infrastructure; static references ไม่พบ literal relative JS imports ที่ปลายทางหาย |
| Static syntax รอบนี้ | JavaScript `node --check` 248 ไฟล์, Python AST 32 ไฟล์, PowerShell parser 4 ไฟล์ ผ่าน; ไม่ execute application modules หรือสร้าง Python bytecode |
| VERIFIED FROM LIVE READ-ONLY QUERY | PostgreSQL 16.15, `intern_system.public`, read-only transaction; snapshot **2026-11-04 20:16:38 Asia/Bangkok** ด้านล่าง; connection ปิดแล้ว |
| Live anonymous health/config GET | Backend `/`, `/health/db`, Frontend Login, NLP `/health` ตอบ 200; Google config enabled/linking/onboarding=true; ไม่เปลี่ยน flags และไม่เรียก challenge/login |
| HISTORICAL EVIDENCE | Phase 1.5 Backend 17/Frontend 8 tests และ build 152 modules จากเวลา 19:33; Console 29 tests จากประวัติเดิม ไม่รันซ้ำใน Audit นี้ |
| VERIFIED FROM TEST EXECUTION รอบนี้ | ไม่มี — ไม่รัน tests/build ที่สร้างไฟล์หรืออาจมี side effects |
| NOT VERIFIED | Real-account/Provider/SMTP, authenticated writes, PostgreSQL concurrency, storage bytes/PDF/OCR/NLP functional integration, Browser/responsive/keyboard และ Production/Staging; Developer Console ไม่ตอบ Local probe รอบนี้ ไม่ restart เพื่อสร้างผลผ่าน |

### Database / Test Data Snapshot

ค่าต่อไปนี้เป็น **Query จริงเวลา 20:16:38** ไม่ใช่ค่าคงที่หรือจำนวน Real-time หลังจากนั้น:

| รายการ | จำนวน |
| --- | ---: |
| Public tables / Actor accounts | 46 / 32 |
| Student รวม / Co-op / Internship | 7 / 5 / 2 |
| Teacher รวม Head / Head membership | 23 / 1 |
| Department Staff | 2 |
| Active Teacher-linked Admin grants / Standalone Admin | 1 / 0 |
| Google identity mappings | 1 |
| Co-op ที่ยังไม่มี Class Advisor | 2 |
| Company / Jobs / Mentor / Cooperative Requests | 0 / 0 / 0 / 0 |
| Daily Logs / Supervision Appointments / Project / Company Evaluation | 0 / 0 / 0 / 0 |

Head/Admin เป็น membership บน Teacher เดิม ไม่เพิ่มผู้ใช้ซ้ำ. 32 คือ Actor accounts ไม่ใช่การรับรองจำนวนบุคคลจริงที่แตกต่างกันทั้งหมด; Mentor/Company records ไม่ใช่ Website Login accounts โดยอัตโนมัติ. รายละเอียด audit ก่อนหน้าเวลา 19:42–19:50 เป็น historical snapshot: Models/aggregate tables 46/46 ตรงกับ DB, FKs 79, Unique constraints16, indexes119/invalid0, columns541; FK definitions68 และชื่อ integrity constraints113/functions12/triggers15 พบครบ. รอบนี้ไม่ได้ทำ full DDL-body comparison ใหม่. CHECK `coop_reviews_reason_check`/`coop_reviews_transition_check` ยังเป็น NOT VALID สองรายการตาม Source definition ไม่ใช่ตารางหาย; ไม่สั่ง repair/validate.

### Current Roles / Features

สถานะต่อไปนี้เป็น **Implementation ตาม Source**. IMPLEMENTED หมายถึงชั้นที่ระบุเชื่อมกันแล้ว ไม่ใช่ E2E PASS; PARTIAL/MOCKUP/NOT IMPLEMENTED ไม่ใช่คำตัดสินว่าจะเพิ่มหรือตัดออกจาก ทก.01 ใหม่. Existing tests หลักอยู่ที่ [Backend Phase 1](backend/test/phase1.test.js), [Frontend Phase 1](frontend/test/phase1.test.js) และ focused Account/Admin/Console suites; coverage ไม่ครอบคลุมทุก business workflow.

| Role / Feature | UI / Handler / API / Backend / DB | Tests ที่มี / Status / สิ่งที่ยังขาด |
| --- | --- | --- |
| Student Register/Login/Google/Dashboard | ครบ; live Co-op eligibility | Focused auth/session/router tests; IMPLEMENTED; real accounts/Provider NOT VERIFIED |
| Student Overview | ครบ; existing owner request API | Binding/error/retry/stale response tests; IMPLEMENTED; data เป็น request snapshot ไม่ใช่ official placement |
| Profile/addresses/education/training/skills/documents | ครบ; aggregate/revision/private files | Fixture/guard coverage บางส่วน; IMPLEMENTED; acknowledgement/signature/national-ID policy ยังรอ ไม่ใช่รับรองสำเนา |
| Profile PDF Import / Resume Upload | ครบ; preview/review/commit + text/OCR services | Guard/fixture บางส่วน; IMPLEMENTED; real PDF/OCR/Storage E2E ยังไม่รับรอง |
| Skills/Resume Job Matching | ครบ; Express → FastAPI | Expired-job regression; IMPLEMENTED; DB ไม่มี Jobs/Resume สำหรับ live matching |
| Company Search / Cooperative Application / Status | ครบ; owner/Co-op guards | Request owner/expiry/route tests; IMPLEMENTED ตาม review/cancel flow; lifecycle หลัง approval ยังไม่รับรองครบ |
| Student documents / official issuance | Staff UI/API/DB มี; Student download flow ไม่ครบ | PARTIAL; HTML development letters ไม่ใช่ official PDF/issuance |
| Project Advisor / Topic / Book / Poster | ครบ; request → Teacher acceptance | Route guards; IMPLEMENTED; confirmed-advisor replacement มีข้อจำกัดเดิม |
| Mentor CRUD/Verification | ครบ; owner + public capability guards | Race/rotation/expiry/rollback tests; IMPLEMENTED; SMTP/DB race จริง NOT VERIFIED |
| Daily Logs / Weekly Review | ครบ; Co-op/approved period/verified Mentor | Capability/guard บางส่วน; PARTIAL สำหรับ compiled logbook/numeric rubric |
| Student/Teacher Supervision1–2/results/images | ครบ; Project Advisor scope | Guard coverage บางส่วน; IMPLEMENTED เชิงบรรยาย; official report/numeric grading ยังขาด |
| Student Company Evaluation | ครบ; five-score feedback | Route coverage; IMPLEMENTED เป็น Student feedback ไม่ใช่ Academic Assessment ของ Teacher |
| Student Account | ดูข้อมูล/Google linking เชื่อมแล้ว | PARTIAL สำหรับ recovery/password workflows; Remember Me/Logout/cross-tab/drafts คงเดิม |
| Student Transfer / Calendar | Transfer มี handler แจ้งยังไม่เชื่อม; Calendar API มีแต่ panel/menu hidden | MOCKUP / PARTIAL ตามลำดับ; ไม่เปิดหรือพัฒนาต่อเอง |
| Teacher Class Advisor / Project Advisor | approval และ accept/reject UI/API/DB ครบ | IMPLEMENTED; ไม่มี requests/relations จริงสำหรับรับรอง E2E |
| Teacher Directory / Account / Assessment / Documents | มี scoped supervision student list และบัญชีอ่านอย่างเดียว | PARTIAL; ไม่ใช่ full directory, academic grading หรือ official documents ทั้งระบบ |
| Head Approval / Teacher Management / Advisor | Approval UI/API ครบ; Teacher list/update มีเฉพาะ Backend | IMPLEMENTED approval / PARTIAL management UI; direct advisor assignment ตอบ 409 โดยตั้งใจ ใช้ Student request/Teacher acceptance |
| Staff Tracking/Cancel/Documents/Company Response/Calendar | UI/API/Service/DB เชื่อมแล้ว | IMPLEMENTED ตามขอบเขต/เอกสาร PARTIAL; ไม่มี current data และ real acceptance |
| Staff Job Publication / Company-Teacher Management / Exam-Scores | Publish/reject API มีแต่ไม่พบ UI caller; modules อื่นไม่ครบ | PARTIAL publication; NOT IMPLEMENTED สำหรับ full management/examination/academic scores; calendar presentation ไม่ใช่ระบบสอบ |
| Mentor Verification/Weekly Review/Appointment | Capability UI/API/DB ครบ ไม่มี Website Password Login | IMPLEMENTED; appointment identity confirmation ไม่ใช่ attendance; numeric student evaluation ยังไม่ครบ |
| Company Recruitment/Email Verification/Owner Portal | Public submission/captcha/email capability มี | IMPLEMENTED submission; publication ต้อง Staff; NOT IMPLEMENTED full Company owner portal |
| Super Admin Accounts/Controls/Permissions/Settings/Audit | UI/API/DB ครบ; Teacher-linked grant | Focused suites; IMPLEMENTED Development-only; fresh password-bound grant/permission checks, ไม่เปิด Google promotion หรือ arbitrary role/Head/Advisor reassignment |
| Homepage Jobs/Search/Filters/Chat | Handler มีแต่ mock arrays/logging/static delayed reply | MOCKUP; ไม่ใช่ Student Matching API หรือ NLP Chatbot integration |

### NLP / Chatbot ที่มีจริง

- Thai/English normalization, dictionary tokenization ผ่าน PyThaiNLP `newmm` และ stopwords; TF-IDF + cosine similarity ใน `nlp-service/app/nlp/matching/`. ไม่มี Sentence Embedding/LLM/vector database implementation ที่พบ.
- Current Dashboard เลือก skills หรือ resume แยกกัน → `/api/job-matches/me?source=...` → NLP `/api/v1/job-matches`. `job_matching_service.py` มีทางเลือกผสมคะแนน profile65%/resume35% เมื่อส่งสองข้อความ; ไม่ใช่การกล่าวว่าทุกปุ่ม UI ใช้ weighted scoring. `/api/v1/resume-matching` ยังมีเป็น API เดิม แต่ไม่พบ current application caller.
- Candidate skills ใช้ `Student.major`/`profile.related_skills`; structured `student_skills` เป็นอีกส่วนใน Profile ไม่พบการนำ child records มารวมตรงใน matching controller ต้องยืนยัน semantics กับ requirements ใหม่.
- Resume ใช้ `pdf-parse` ก่อน OCR fallback ผ่าน PyMuPDF/Tesseract tha+eng; Profile PDF ใช้ AcroForm/text/layout/regex และ OCR ตามกรณี มี worker/time/size budgets. เป็น extraction ตามกฎ ไม่ใช่ trained generic NER. OCR scan/รูปแบบเอกสารหลากหลายยังมีข้อจำกัด.
- FAQ service มี TF-IDF + Logistic Regression, train ตอน startup, confidence threshold/fallback และ dataset **7 intents /31 examples**. NLP API `/api/v1/chat` มี แต่ Homepage ยังไม่ได้เรียก และยังไม่มี authenticated document-status chatbot ที่อ่าน DB ตาม owner.

### Findings / Technical Debt

| ระดับ / ประเภท | หลักฐาน / ผลกระทบ |
| --- | --- |
| High / Potential workflow risk | `coopRequest.controller.js:293–335` ไม่บังคับ Class Advisor ก่อนตั้ง advisor_review; Teacher review ต้องเป็น class advisor (`roleWorkflow.service.js:97`). DB มี Co-op ไม่มี advisor2 จึงเสี่ยงคำร้องไม่มีผู้พิจารณา; ไม่สร้างคำร้องเพื่อทดลอง ต้องยืนยัน prerequisite policy ก่อนแก้ |
| Medium / Confirmed integration gaps | Head management มี API แต่ไม่มี UI caller, Staff job publish/reject เช่นกัน (`roleWorkflow.routes.js:75–84`); Homepage/Transfer mock path ยืนยันจาก handlers ไม่ใช่ตัดสินจาก TODO |
| Medium / Potential operational risk | NLP endpoints ไม่มี Application JWT layer ของตัวเอง; Compose bind loopback แต่ต้องทบทวน boundary ก่อน Production. Resume OCR ขาด overall worker/pixel/time budgets แบบ Profile PDF; Matching รับ jobs list/fit TF-IDF โดยไม่มี count cap ที่พบ ไม่ได้ load-test หรือยืนยัน DoS |
| Medium / Potential diagnostic exposure | `/health/db` ส่ง raw `error.message` เมื่อผิดพลาด (`app.js:57`); health รอบนี้ 200 จึงไม่ทดสอบ failure path |
| Medium / Coverage / deployment debt | Suites เดิมถูกลบ, ไม่มี full business regression ปัจจุบัน; Dockerfiles ใช้ development servers/npm install และ image tags ไม่ใช่ immutable deployment; ไม่มี Production security/rollback acceptance |
| Low / Source/document drift | Comment `roleWorkflow.service.js:86` ว่า Student ไม่มี department ล้าสมัย แต่ scope จริงยังอิง class advisor ตาม policy; migration019/018 messages และ old counts อยู่ใน historical references ไม่ใช่คำสั่งปัจจุบัน |

ไม่พบ Critical bug ที่ยืนยันเพิ่มจากขอบเขต Audit นี้ ไม่ใช่การรับรองว่าไม่มีช่องโหว่. Duplicate legacy JWT issuance ยังอยู่เพื่อ compatibility แต่ Student eligibility รวมศูนย์แล้ว. ไม่พบ Backend cron/queue worker สำหรับ expiry; job availability ตรวจเวลา request ตาม Phase1. Student/role state-machine ที่ยังไม่ครบ, logbook, academic rubrics, transfer, documents และ scope changes เป็นรายการรอหารือ ทก.01 ไม่ใช่งานที่ได้รับอนุมัติ.

### Infrastructure / Setup Boundary

Vite multipage มี **16 build entries** จาก `frontend/vite.config.js`; Frontend มี 17 HTML รวม diagnostic และ Console มีอีก 1 HTML. API clients ใช้ Axios และ role/session adapters. Shared feedback มี modal/toast/loading, ARIA, focus/Escape และ CSS breakpoints/typography tokens แต่ static source ไม่ยืนยัน rendered responsive/accessibility. Backend เป็น Express/Sequelize/JWT, private storage และ Nodemailer; ใช้ transactions/row locks/revision guards ใน modules ที่ระบุ ไม่มี global jobs runner ที่พบ.

Compose เป็น Development: PostgreSQL16, pgAdmin, Backend Node20/nodemon, Frontend Node22/Vite, NLP Python3.11/Uvicorn reload; ports 5432/5050/5000/5173/8000 bind127.0.0.1. NLP `.env` ยังไม่ส่ง/mount เข้า Compose จึงไม่รับค่าจาก Console Save โดยอัตโนมัติ. Backend/Frontend env_file มี precedence ตอน recreate; ไม่เปลี่ยน environment เพื่อ Audit.

Developer Console Source มี loopback/Host-Origin guards, Root แยกจาก DB, scrypt, HttpOnly/SameSite/CSRF/session expiry, masking/reauthentication, AES-GCM backups นอก Git, permission/link checks, preview/version/conflict และ atomic replace. Backup key อยู่ใน private Root store จึงต้องรักษา OS permissions; ไม่ใช่ Application Super Admin. ไม่มีการลอง Save/Restore/Login จริงรอบนี้.

`deploy.sh` ปัจจุบัน **ไม่รัน Migration/Init/Reset** แต่ยังเป็น mutating deployment: git pull, build/up/recreate, renew anonymous volumes และ health/model-projection checks. ห้ามใช้เป็น read-only probe; ไม่ได้รัน. Named DB/Storage volumes ต้องคงไว้; current Source / health ไม่ยืนยัน Production/MFA/HTTPS/backup restore/operational readiness. คู่มือ Setup ที่ยังใช้ได้อยู่ด้านล่าง; คำสั่ง reset/init/provision เป็นคำสั่งมีผลต่อข้อมูล ต้องอนุญาตเฉพาะงาน ห้ามรันตาม historical audit.

รายละเอียดต่อเนื่อง: [Current Handoff](HANDOFF_fitm-intern.md). ก่อน Phase2 ต้องรับ ทก.01 ใหม่และหารือ actor workflows, templates/rubrics, advisor prerequisites, department/data scopes, integration/test data และ acceptance; **ยังไม่มีแผนพัฒนาที่อนุมัติ**.

<details>
<summary>ประวัติ Phase 1.5 — 4 พฤศจิกายน 2026 เวลา19:33; ผล tests/build ด้านล่างไม่ได้รันใหม่ใน Full Audit</summary>

## สถานะงานล่าสุด — Phase 1.5: Co-op Only — 4 พฤศจิกายน 2026

**Option A — Disable Internship: IMPLEMENTED / FOCUSED SYNTHETIC PASS / REAL E2E NOT VERIFIED.** รองรับ Student เฉพาะ `track=co_op`. บัญชี `internship` ถูกปฏิเสธจาก Unified/Legacy/Google Login ที่ออก Student session, Protected Student APIs แม้ถือ JWT เดิมที่ยังไม่หมดอายุ และ Student Dashboard. Backend ใช้ eligibility กลางกับ live Student record ไม่เชื่อ track จาก JWT/Client. การตรวจหลาย Actor ยังคง `409 AUTH_CONTEXT_AMBIGUOUS` ก่อนพิจารณา eligibility ไม่เลือกบัญชีอื่นแทน Internship.

เก็บ Student Internship, historical data, Schema/ENUM ทั้งสองค่า และ Shared Code ไว้ทั้งหมด; ไม่แปลง track ไม่ลบตาราง ไม่เปลี่ยนคิว Teacher/Head/Staff หรือยอดบัญชี Admin. การปิดสิทธิ์ Student ไม่ได้ลบประวัติหรือเปลี่ยน account statistics. `internship_*` และ **`/api/internship-logs` ยังเป็นระบบ Daily Logs/Weekly Mentor Review ของ Co-op** ห้ามลบตามชื่อ.

| ส่วน | สถานะปัจจุบัน | หลักฐานและข้อจำกัด |
| --- | --- | --- |
| Student Auth / Dashboard | Co-op Only; Registration และ Google onboarding สร้าง `co_op` ตามเดิม | Actual controllers/services/JWT และ Dashboard functions กับ synthetic Models/DOM; real accounts/Provider ยัง NOT VERIFIED |
| Protected Student APIs | Profile/PDF, Resume/Matching, company search, requests, Mentor/Advisor, logs, supervision, project/book/poster, evaluation, calendar/account คงอยู่ | Actual routers 18 endpoints ผ่าน JWT middleware กับ substituted handlers/services; ไม่ใช่ functional E2E ของแต่ละโมดูล |
| Public Mentor Verification | อ่าน/แก้ไข/ยืนยันต้องมีเจ้าของ Co-op จาก DB; คง Mentor-first locks/rotation/expiry/rollback | Synthetic capability/concurrency tests; PostgreSQL concurrency และ SMTP จริงยัง NOT VERIFIED |
| Phase 1 Issues 2–4 | Mentor race, expired jobs และ Overview binding คงอยู่ | Focused backend/frontend regression ผ่าน; live workflow/browser ยัง NOT VERIFIED |
| Other Roles / Data | สิทธิ์, ownership/department/advisor scope, Company recruitment และข้อมูลเก่าคงเดิม | Teacher/Head/Staff password/Google sessions ผ่านแบบ synthetic; Super Admin eligibility ตรวจแบบ isolated; ไม่ Query/แก้ Database รอบนี้ |

ผลรอบนี้: Backend **17 PASS /0 FAIL /0 SKIP**, Frontend **8 PASS /0 FAIL /0 SKIP**, JavaScript syntax **10 ไฟล์ PASS**, UTF-8 และ `git diff --check` PASS; Frontend build ด้วย `--configLoader native` **152 modules PASS**. ผลเหล่านี้ไม่ใช่ Production Ready. ประวัติ Phase 1 Issue 1 ที่อนุญาต Internship ถูกแทนที่ด้วย Co-op Only; ไม่ย้อนเปิดสิทธิ์เพื่อให้ positive tests เก่าผ่าน. ดู [Handoff](HANDOFF_fitm-intern.md).

**NEXT TASK: Phase 2 — WAITING FOR USER APPROVAL.** งาน Real PostgreSQL/Browser/Google/SMTP acceptance ยังเหลือ; ไม่เริ่มหรือเปลี่ยน feature flags อัตโนมัติ.

</details>

<details>
<summary>ประวัติสถานะ 16–18 ตุลาคม 2026 — จำนวนบัญชีและผลตรวจเป็น snapshot เดิม ไม่ใช่ผลตรวจปัจจุบัน</summary>

## สถานะงานล่าสุด — 18 ตุลาคม 2026

ระบบ Student เป็นงานหลัก; Teacher/Head/Staff มี workflows รองรับบางส่วน **ยังไม่ถือว่าทั้งสามระบบพัฒนาเสร็จทั้งหมด**. Application `super_admin` รองรับ **Teacher หนึ่งบัญชีสองบทบาท** ผ่าน server-side grant ที่ผูก Teacher ID เดิม ไม่สร้าง Login/Email/Profile/Password ชุดที่สอง. Login ยังเข้า Teacher Dashboard ก่อน แล้วสลับเข้า Admin ได้ด้วย session เดียวเมื่อ Backend ยืนยันสิทธิ์จริง. ไม่มี Role Selector; Admin เปิดเฉพาะ `NODE_ENV=development` และ Production ปิดจนกว่าจะมี Strong Authentication/MFA. ไม่ใช้ Developer Console Root หรือ Google เพื่อยกระดับสิทธิ์.

Local PostgreSQL `127.0.0.1:5432 / intern_system.public` เตรียม4ตาราง Admin จากรอบก่อน และขยาย `super_admins` ให้เก็บ Teacher membership หลังสำรองใหม่/ตรวจ archive+DPAPI สำเร็จ. Student7/Teacher23 (รวม Head1)/Staff2 รวม32 คงเดิม. **Grant และ credential rotation จริงยัง WAITING FOR USER TERMINAL** สำหรับ ผศ.ดร.สุพาภรณ์ ซิ้มเจริญ ที่ตรวจพบเพียง1 Record; SQL/API assignment tests เป็น rollback-only ไม่ใช่การเปิดสิทธิ์จริง. ดู [Handoff](HANDOFF_fitm-intern.md); ข้อความวันที่16 ตุลาคมด้านล่างเป็น snapshot เก่า.

## สถานะปัจจุบันและขอบเขตหลักฐาน — 16 ตุลาคม 2026

อัปเดตเอกสารเท่านั้น (Asia/Bangkok); เทียบ Source เฉพาะส่วนที่เกี่ยวข้องและอ้างผลตรวจเดิมจาก [Handoff](HANDOFF_fitm-intern.md). **ไม่ได้รัน Tests/Build/Browser/HTTP/Database checks ใหม่ในรอบนี้**. ผล PASS ที่ระบุต่อไปเป็นผลเฉพาะขอบเขตในประวัติ ไม่ใช่ Production readiness หรือการรับรองสถานะระบบแบบ Real-time.

| ส่วน | Implementation / หลักฐานล่าสุด | ข้อจำกัด |
| --- | --- | --- |
| Unified Login | รองรับสี่บทบาท, Backend เลือก actor/role และ Shared Middleware ตรวจ live account; deleted-account checks PASS ตามขอบเขต Handoff | Server-side JWT revocation หลัง Logout/เปลี่ยน Password ยังไม่ครอบคลุมทุกกรณี |
| Google / Register | Google-only + mapping, Dashboard linking และ Website Register → JWT → Dashboard มี Source แล้ว | Real-account Register E2E และ Google Provider E2E ของ Flow ล่าสุด NOT TESTED |
| Development CORS | Shared explicit origin allowlist; focused config/controller/isolated/live HTTP checks PASS ในรอบก่อน | ไม่ใช่ Google Provider acceptance และไม่เพิ่ม dev origins อัตโนมัติใน Production |
| Developer Console | Tests 29/29 และ Chrome fixture UI/responsive PASS ในรอบก่อน; **ผู้ใช้รายงานว่าเริ่มใช้งานได้แล้ว** | การใช้งานจริงเป็น user report; real .env Save/Restore, Production/POSIX NOT TESTED โดยผู้พัฒนา |
| Database | หลักฐานล่าสุดจากรอบ Developer Console: 42 ตาราง / 1 record | ไม่ได้ query ซ้ำรอบนี้; 42 ตาราง / 0 records เป็น snapshot หลัง Cleanup เท่านั้น |

อ่าน [เทคโนโลยี](#ระบบและเทคโนโลยี), [Development setup](#development-environment), [Compose services](#บริการและผล-smoke-ล่าสุด), [Schema source](#โครงสร้างและแหล่งกำหนด-schema) และ [ข้อจำกัด](#ข้อจำกัดและงานต่อไป) ประกอบกับสรุปปัจจุบันด้านล่าง. บันทึกวันที่เก่าถูกเก็บเป็นประวัติ; หากขัดกันให้ยึด Source และข้อตกลงล่าสุดใน Handoff.

</details>

## Repository Structure

```text
frontend/          Vite multipage UI, API clients, session adapters, shared UI/fonts
backend/src/       Express routes/services, JWT/RBAC, Sequelize Models และ db initialization
nlp-service/       FastAPI, classical NLP, PDF/OCR และ data directories
dev-env-manager/   Developer Root Console บน host แยกจาก Compose/เว็บหลัก
docs/              Feature references และ historical acceptance/evidence
docker-compose.yml Development services/loopback port mappings
HANDOFF_fitm-intern.md Project continuity, evidence scopes และลำดับงานต่อไป
```

## Authentication Overview

หน้า Login หลักคือ `frontend/login.html` สำหรับ Student, Teacher, Department Head และ Department Staff ไม่มี Role Selector. Email/Password ส่ง `POST /api/auth/unified-login`; Backend พิสูจน์ credentials และสถานะจากบัญชีจริงก่อนคืน actor/role, Application JWT และ Dashboard URL ที่อนุญาต. Head ใช้ Teacher account กับ `is_department_head` และ department; ambiguous context ไม่มี safe default ยังคงปฏิเสธด้วย `409 AUTH_CONTEXT_AMBIGUOUS`. JWT, RBAC, Remember Me, Logout และ Draft Preservation คงเดิม.

Shared Authentication Middleware ตรวจ signature/expiry/claim shape แล้ว lookup live account ทุก protected request ที่ใช้ middleware นี้; deleted/missing account ถูกปฏิเสธ และสถานะ/บทบาทต้องยังอนุญาต. Deleted-account authorization **PASS เฉพาะ focused routes และหลักฐานที่ระบุใน Handoff** ไม่ใช่ JWT revocation coverage ทั้งระบบ. JWT ที่คัดลอกไปของบัญชียังมีสิทธิ์อาจใช้ได้จนหมดอายุหลัง Logout/เปลี่ยน Password ตามข้อจำกัดเดิม.

Student eligibility ปัจจุบันอนุญาตเฉพาะ live `track=co_op` และ workflow status ที่ระบบอนุญาต. Unified Login, Legacy `/api/auth/login`, Google Student session และ Shared JWT middleware ใช้ `authorizeActor` กลาง; Internship JWT เดิมจึงไม่ผ่าน Protected Student APIs. Dashboard `/src/student_coop/student_coop.html` ยังคงเดิม แต่รับเฉพาะ Co-op หลังตรวจ `/api/auth/me`; เมื่อถูกปฏิเสธล้าง session แล้วกลับ `/login.html`, network/5xx คง session และให้ Retry. Remember Me/cross-tab และ draft keys คงเดิม.

## Google OAuth Development Configuration

- CORS และ Google POST Origin Guard ใช้ `backend/src/config/allowedOrigins.js` ร่วมกัน: FRONTEND_URL เป็น explicit origin หลัก และเพิ่ม `http://localhost:5173`, `http://127.0.0.1:5173` เฉพาะ `NODE_ENV=development`. ไม่มี wildcard/สะท้อน Origin ทุกค่า; origin อื่นถูกปฏิเสธ และคง CORS credentials เดิม.
- Production/staging/unset environment ไม่เพิ่ม Development Origins อัตโนมัติ. Backend allowlist ไม่ตั้งค่า Google Cloud Authorized JavaScript Origins ให้เอง; Provider E2E ด้วยบัญชีจริงยัง **NOT TESTED**.
- Frontend อ่าน `/api/auth/google/config`; ต้องมีปุ่ม Google เสมอ และ disabled ไม่โหลด Provider/เรียก challenge/login. Google อยู่เหนือ Email/Password ตามดีไซน์ที่ตกลงไว้. ไม่ใส่ Secret ใน Frontend และไม่เปิด flags/เปลี่ยน domain/hosted-domain/identity policy เอง.
- Token verification, nonce, verified email/domain/hd และ secure subject mapping คงเดิม. Google-only registration ใช้ Student ID จาก `^s([0-9]{13})@email\.kmutnb\.ac\.th$`, สร้าง Student (`password_hash=NULL`) + mapping ภายใน transaction แล้วออก JWT; returning mapped account ใช้ identity เดิม. Development onboarding ยังต้องผ่าน flags และ local DB guard เดิม.
- บัญชีเว็บไซต์ Student เดิมที่ชน email/Student ID ต้อง Email/Password Login → Student Dashboard → จัดการบัญชี → เชื่อม Google; ยืนยัน ownership/รหัสผ่านปัจจุบันและ explicit confirmation. ไม่เชื่อมจากหน้า Login/Register และไม่ Auto-Link จาก email เพียงอย่างเดียว.
- ขั้นตอน Student ด้านบนใช้กับ Co-op เท่านั้น. Google auto และ legacy role=student ตรวจบัญชี mapped จริงก่อนออก JWT; Internship ไม่มีสิทธิ์ session/linking ผ่าน Dashboard. Onboarding ยังคง `co_op`/`pending`, flags/Development guard และ identity policy เดิม ไม่เปิด flags ใน Phase 1.5.

## Student Registration Flow

Website Register รับชื่อ/นามสกุล, university email และ Password/Confirm Password โดยไม่มีช่อง Student ID หรือ Track Selector; normalize email แล้ว Backend ดึงรหัส 13 หลักจาก `^s([0-9]{13})@email\.kmutnb\.ac\.th$` ด้วย helper ร่วมกับ Google และไม่รับ Student ID/track จาก Client. ตรวจ required fields, bounds, password/confirmation และ duplicate email/Student ID ใช้ bcrypt/unique constraints เดิม; รูปแบบ email ไม่ใช่การยืนยัน ownership/Google Verification. Backend สร้าง Student `co_op`/`pending` และ Application session ภายใน transaction แล้วตอบ 201 พร้อม JWT → Frontend ใช้ session adapter เข้า Student Dashboard โดยไม่ Login ซ้ำ (`remember:false`). หากออก JWT ไม่สำเร็จ transaction rollback.

มีปุ่มสมัครด้วย Google ใช้ Google flow ด้านบน; Google-only Co-op Student ไม่ต้องตั้ง Password และ Password Login ปฏิเสธ NULL hash อย่างปลอดภัย. Registration defaults ผ่าน synthetic controller tests ใน Phase 1.5; real-account persistence/Browser/Provider E2E ยัง NOT VERIFIED. งานปรับ Register เพิ่มเติมเป็น backlog ที่ต้องมอบหมายแยก ไม่ใช่งานถัดไปอัตโนมัติ.

## การเปิด Developer Console สำหรับจัดการ .env

`dev-env-manager/` ใช้ Node.js built-ins ไม่มี dependencies เพิ่มสำหรับ Console, bind เฉพาะ **http://127.0.0.1:5379/**. Root Authentication แยกจาก Unified Login/Database ไม่มี Root role ใน PostgreSQL หรือ RBAC ของเว็บหลัก. ผู้ใช้เคยรายงานว่าเริ่มใช้งาน Console ได้แล้ว; เป็น historical user report. Full Audit วันที่4 พ.ย. Local GETไม่ตอบจึงเป็น NOT VERIFIED ไม่ restart/bootstrap หรือเปิด Browser เพื่อสร้างผลผ่าน.

รองรับ Backend/Frontend/NLP `.env` ตาม allowlist ตายตัว, Search/Filter, Unsaved Changes, Change Preview, Validation, Save/Cancel, Secret Masking, encrypted Backup/Restore, Atomic Replace, Conflict Detection, Session Security, CSRF, Rate Limiting และ Restart Notification. ค่า Secret เดิมไม่ส่ง Browser; reauthentication ก่อน Save/Restore และ Backup เก็บนอก Git พร้อม OS permissions. ไม่สั่ง Docker/restart/Database operations และไม่เปิด Production. รายละเอียดความปลอดภัย/ข้อจำกัด conflict กับ external writers อยู่ใน [คู่มือ Console](dev-env-manager/README.md).

จาก Repository root ใน **CMD** (ไม่ใช่ PowerShell):

```cmd
cd dev-env-manager
set NODE_ENV=development
npm.cmd start
```

เปิด **http://127.0.0.1:5379/** ใช้ `127.0.0.1` ไม่ใช่ `localhost`. หากยังไม่เคยตั้ง Root Password ให้รันคำสั่งนี้ **เพียงครั้งแรก ก่อน `npm.cmd start`** หลังตั้ง `NODE_ENV=development` ใน directory เดียวกัน:

```cmd
npm.cmd run bootstrap
```

Root Login แยกจาก Website Login และ Application Super Admin. Bootstrap รับรหัสผ่าน Interactive แบบไม่แสดงขณะพิมพ์. หยุด Service ด้วย **Ctrl+C**. บางค่าต้อง Restart/recreate Service ที่เกี่ยวข้อง; Console ไม่ทำให้อัตโนมัติ และการบันทึก `nlp-service/.env` ยังไม่ทำให้ NLP Docker โหลดค่าทันทีตามข้อจำกัดด้านล่าง. ใช้เฉพาะ Local Development; ไม่บันทึก Password/Secrets ลง README. ดู [คู่มือ Developer Console](dev-env-manager/README.md). ผลเดิม **29/29 automated tests และ Chrome fixture Login/Save/Restore/Logout, responsive1280/768/390/320px PASS** เป็นหลักฐานเก่า ไม่ได้รันทดสอบ Console ซ้ำรอบนี้; Save/Restore `.env` จริงและ Production/POSIX ยัง NOT TESTED.

## Application Super Admin

Queryจริงวันที่4 พ.ย.2026 เวลา20:16:38 พบ **active Teacher-linked membership1 / standalone0**. Grantไม่ใช่บัญชีบุคคลเพิ่มและไม่รับรองว่าทดสอบ privileged Login/Browser แล้ว. คำสั่งเตรียมด้านล่างเป็นคู่มือเมื่อมีงานอนุญาต ไม่ต้อง rerun Grant/rotate credentials เพื่อ Audit; CLIคง idempotency guards เดิม.

ใช้ `http://localhost:5173/login.html` เดิม → Unified Login ตรวจรหัสผ่าน Teacher → Teacher Dashboard → **เข้าสู่ระบบผู้ดูแล** → Super Admin Dashboard → **กลับไปหน้าอาจารย์**. ใช้ Teacher token เดียว ไม่มีการคัดลอก session ไปเป็นบัญชี Admin. ลิงก์ Admin แสดงหลัง `/api/teachers/admin-access` ตรวจสิทธิ์จาก Server เท่านั้น; Teacher อื่น/Student/Staff/Head ไม่ได้สิทธิ์เพิ่ม.

`super_admins.teacher_id` เป็น unique FK ไป Teacher เดิม; แถวที่ผูก Teacher เป็น **grant** ที่ไม่มี email/name/password ของตัวเอง. Audit/Settings อ้าง principal/grant เดิมได้ จึงไม่เพิ่มบุคคลซ้ำในยอดผู้ใช้. เก็บ compatibility สำหรับ standalone rows เดิมแต่ CLI ไม่สร้างบัญชี standalone ใหม่. Membership session มี Teacher claims เดิม + signed grant ID/version อายุ15นาที; Backend ตรวจ live Teacher/password stamp/membership/permission ทุก Admin request. Token ก่อน Grant หรือ token จาก Google ที่ไม่มี password-verified grant evidence ไม่ได้สิทธิ์ใหม่. เปลี่ยนสิทธิ์ต้อง Login ใหม่; Logout/เปลี่ยนรหัสผ่านเพิกถอน session ฝั่ง Server. Remember Me/cross-tab ใช้ adapter เดิม.

เตรียมจาก Repository root ด้วย **Windows CMD**:

```cmd
cd backend
set NODE_ENV=development
npm.cmd run admin:assign-teacher
```

**Schema พร้อมแล้ว ไม่ต้องรัน `admin:prepare` หรือ Seed ซ้ำ.** คำสั่งใหม่ตรวจ Local DB จริงและค้นชื่อไทยที่อนุญาต ต้องพบ Teacher เพียง1คน แสดงชื่อ/สถานะ/Primary Key แล้วให้ผู้ใช้พิมพ์ `GRANT <Teacher ID ที่แสดง>` ใน terminal ด้วยตนเอง. จากนั้นรับ Password ใหม่/Confirm แบบซ่อน และเปลี่ยนรหัสผ่าน Teacher เดิมพร้อมสร้าง Grant/Audit ใน transaction เดียว มี rollback และ preservation checks. หากมี Grant แล้วจะหยุดแบบ idempotent โดยไม่เปลี่ยนรหัสผ่านซ้ำ. `admin:bootstrap` เป็น compatibility alias ไป flow นี้ ไม่รับ Email/ชื่อเพื่อสร้างบุคคลใหม่.

CLI diagnostics (18 ตุลาคม 2026): หากล้มเหลวจะแสดง `BLOCKED [ERROR_CODE] stage=...` พร้อมคำแนะนำคงที่ เช่น `PASSWORD_TOO_SHORT`, `PASSWORD_MISMATCH`, `ENVIRONMENT_BLOCKED`, `SCHEMA_MISMATCH`, `DATABASE_ERROR`; ไม่พิมพ์ exception/SQL/ค่ารหัสผ่าน. รหัสผ่านต้องอย่างน้อย14ตัวอักษร ไม่เกิน72 UTF-8 bytes ไม่มีช่องว่างหัวท้าย/รูปแบบทั่วไปหรือซ้ำ และต่างจากรหัสเดิม. Hidden input รองรับ CR/LF, Backspace และ Ctrl+C เพื่อยกเลิก. หากพบ `DATABASE_CLOSE_ERROR` การ Commit อาจเสร็จแล้ว; รันใหม่จะตรวจ Grant เดิมก่อนและไม่ Rotate ซ้ำ. ส่งเฉพาะรหัสข้อผิดพลาดและ stage เพื่อวิเคราะห์ต่อ ห้ามส่งรหัสผ่าน/Hash/Secret. Focused fixture tests (ไม่เชื่อม DB): จาก `backend` ใช้ `node src/seeders/assignTeacherAdmin.test.js`.

**ต้องเปลี่ยนจาก Initial Password เดิมเป็นรหัสเฉพาะที่แข็งแรงก่อนเปิดสิทธิ์จริง**: อย่างน้อย14ตัวอักษร/ไม่เกิน72 UTF-8 bytes ไม่ใช้รหัสเดิม/รหัสร่วม/Root credential. ไม่รับ Password ผ่าน args/env/pipe/chat และไม่พิมพ์ Password/Hash/JWT ใน log. รหัสเดิมของ Teacher อื่น22คน/Profile/Email/ข้อมูลส่วนตัวไม่เปลี่ยน. Credential Viewer/Vault เดิมไม่อัปเดตรหัสเป้าหมายให้อัตโนมัติหลัง rotation; ใช้รหัสใหม่ที่ตั้งใน terminal. ไม่เปิด Public Register/Google promotion หรือเปลี่ยน OAuth policy.

| ส่วน | ความสามารถ / ขอบเขต |
| --- | --- |
| ภาพรวม | Backendนับ Actor accountsโดยไม่เพิ่ม Teacher-linked grantซ้ำ; Query20:16พบ32และgrant1. Admin active flag/count ไม่ใช่ Student Co-op eligibility จึงยังเก็บ Internship2ในยอดบัญชีเดิม |
| บัญชีผู้ใช้งาน | ตารางทุก Role, search/filter/pagination, รายละเอียดพื้นฐานที่ปลอดภัย; แก้ชื่อ/ชื่ออังกฤษ/ตำแหน่งตาม Model ที่รองรับ |
| สถานะ | Account Control แยกจาก Student workflow status; Teacher/Staff ใช้ native status เดิมร่วมด้วยเพื่อให้ legacy guards/รายชื่อ Advisor สอดคล้อง; ปิดแล้ว tokenเดิมถูกปฏิเสธและไม่กลับมาใช้ได้เมื่อเปิดใหม่; ปฏิเสธปิด Teacher ที่เป็น Head/Advisor/มีคำขอที่ปรึกษา และไม่เปิด native inactive เดิมที่ไม่ได้ปิดผ่าน Admin |
| สิทธิ์ | Server-side permission allowlist ของ membership; ระงับ Admin grant โดยคง Teacher identity ได้เมื่อไม่ใช่ผู้ดูแลคนสุดท้าย; ไม่ย้าย Actor/เปลี่ยน Head/Advisor หรือ bypass ownership |
| ค่าระบบ | `admin.page_size` จำนวนเต็ม10–100 ค่าเริ่มต้น25 มีผลทันทีในการเรียก Account List ถัดไปที่ไม่ระบุ limit; ไม่เปิดแก้ `.env`/Secrets |
| Audit | การแก้ไขสำเร็จและ Audit อยู่ใน transaction เดียวกัน; ประวัติ append-only มี DB trigger, ไม่มี Password/Hash/Token/เอกสารส่วนบุคคล |
| บัญชีของฉัน | แสดง Teacher identity เดิม; เปลี่ยนรหัสผ่าน Teacher เพียงชุดเดียว พร้อมยืนยัน Password ปัจจุบัน/Confirmation แล้ว Login ใหม่ทั้งสองมุมมอง |
| Pending | Student Profile/เอกสารส่วนบุคคล/การย้าย Role/Head/Advisor/CRUD ที่ยังไม่มี Admin workflow ปลอดภัย ไม่เปิด endpoint ข้าม Validation |

ทุก write ต้องมี live permission, Password ปัจจุบัน, explicit confirmation และ `If-Match`; มี rate limits/transaction rollback/last-admin protection. ไม่แก้ Schema ของ Teacher/Student/Staff; ส่วนขยาย `super_admins` เพิ่ม `teacher_id`/`credential_stamp`, FK/unique/check และยอมให้ credential/profile columns ว่างเฉพาะ grant ตาม identity check โดยไม่ลบข้อมูล/fields เดิม. Backup ก่อน DDL เป็น encrypted DPAPI CurrentUser archive ใน `.local-dev-accounts/super-admin-backups/` ที่ Git-ignore; ไม่มี migrations/startup sync/reset. ไม่มี infrastructure/secret management ใน Admin.

Focused tests: `npm.cmd run test:admin-membership` และ `npm.cmd run test:admin`. Default ใช้ isolated tests/SQL SKIP; ตั้ง FITM_ADMIN_SQL_TEST=1 เฉพาะ process เพื่อ SQL rollback-only ก่อน Grant จริง. หากมี Admin/grant จริงแล้ว fixture จะ SKIP เพื่อรักษาบัญชี. ดูผลล่าสุดใน Handoff. Manual acceptance ที่เหลือ: หลังผู้ใช้ทำ CLI ให้ Login ด้วย Teacher email เดิม/รหัสใหม่ → Teacher → Admin → กลับ Teacher, ตรวจ account counts/menus/keyboard/Confirmation/Logout และ responsive1366/768/390/320px. Browser ยัง NOT TESTED เพราะ startup blocker เดิม ไม่อ้าง static/DOM แทน Browser E2E. Production ปิดต่อจนมี Strong Authentication/MFA และ security/operational acceptance.

## Environment Configuration

| ไฟล์ | วิธีโหลด / ข้อควรทราบ |
| --- | --- |
| Root `.env` | Compose interpolation สำหรับ PostgreSQL; ไม่อยู่ใน allowlist ของ Console |
| `backend/.env` | Compose env_file และ dotenv; inherited env อาจมี precedence ต้อง recreate service เมื่อได้รับอนุญาตเพื่อรับค่าใหม่ |
| `frontend/.env` | Compose env_file และ Vite ตอนเริ่ม/build; `VITE_*` เป็นข้อมูลสาธารณะ ห้ามเก็บ Secret |
| `nlp-service/.env` | pydantic-settings อ่านตาม working directory บน host; **Compose ปัจจุบันไม่ได้ส่งหรือ mount ไฟล์นี้ และกำหนด PORT=8000 เอง** |

Console แสดง Pending Restart/คำแนะนำ และสถานะจริง Unknown; ไม่ restart/rebuild/recreate อัตโนมัติ. Save ไฟล์ NLP แล้ว recreate อย่างเดียวยังไม่ทำให้ Container โหลดไฟล์ ต้องมอบหมายงาน integration แยก. รักษา actual `.env`/Secrets และ Docker Volumes; ไม่เปลี่ยนค่าตามเอกสารหรือผลทดสอบเก่าโดยอัตโนมัติ.

## Database / Sequelize

PostgreSQL 16 Development `intern_system.public` ใช้ Sequelize Model-driven initialization ใน `backend/src/db/initialize.js` รวม associations, `models/schemaIntegrity.js`, `db/postgresIntegrity.js`; Backend startup ไม่ force/alter/sync. Student Model รองรับ `password_hash=NULL` สำหรับ Google-only Account โดยไม่ลดข้อกำหนด Password ของ Website Register. ไม่มี migration-based workflow ปัจจุบัน; คำสั่ง migration/ledger ในเอกสารเก่าห้ามนำมารันตาม.

Phase 1.5 ไม่เปลี่ยน Models/ENUM/Schema หรือข้อมูลจริง. `students.track` เก็บ `internship` ได้เพื่อรักษาประวัติ แต่ไม่อนุญาต Student access. ไม่แก้ Student status/track หรือ Admin counts อัตโนมัติ; existing fixtures อาจยังมี Internship สำหรับ negative/preservation checks และไม่ถูกรัน provision/seed ในงานนี้.

**Snapshotปัจจุบันจาก Read-only Query4 พ.ย.2026 เวลา20:16:38: 46 tables /32 Actor accounts** ตามตาราง Auditด้านบน ไม่ใช่จำนวนคงที่. ประวัติ Cleanupเดือนตุลาคม154 records, 42ตาราง/0records และ Consoleรอบหลัง42ตาราง/1record เป็นค่าคนละเวลา ถูกแทนที่สำหรับสถานะปัจจุบันโดย snapshotใหม่นี้; ไม่ลบประวัติ/ข้อมูลที่มีเพิ่มและไม่ใช้ countsเพื่อสั่ง reset.

มี Database dump และ Storage archive นอก Repository ตาม [Full Cleanup Handoff](HANDOFF_fitm-intern.md#current-handoff--full-development-database-cleanup--backup-first--2026-10-16). Database dump ผ่าน restore ลงฐานแยกและ integrity comparison; Storage archive ผ่านการตรวจอ่าน/hash/structure/permissions เทียบต้นฉบับ ไม่ได้ extract ทับ Storage จริง. เป็นหลักฐานเดิม ไม่ได้ตรวจ Backup/Restore ซ้ำรอบนี้. ห้าม Reset/เปลี่ยน Schema/ลบข้อมูลหรือ Volumes โดยไม่มีอนุญาตเฉพาะงาน.

## Security Notes

- Backend เป็นผู้พิสูจน์ signature/actor/role; frontend token-shape checks ไม่แทน Authorization. Logout/cross-tab protection ฝั่ง Browser ไม่ใช่ server-side revocation ของ bearer ที่คัดลอกไป.
- Browser Storage แยกระหว่าง localhost กับ 127.0.0.1 จึงมี session/Remember Me/draft แยกกัน และ cross-tab revocation ไม่ข้ามสอง origins. ไม่ย้าย token ข้าม host อัตโนมัติ.
- ไม่เผย Password/hash/token/Connection Credentials หรือ Secret ใน `.env`/Backup; ไม่ใช้ mock/synthetic/fixture PASS แทน Provider E2E, real-account acceptance หรือ Production Security.

## Next Development Priorities — แผนเดิมวันที่ 16 ตุลาคม 2026

1. **Register Page Improvement — งานแรกเมื่อกลับมาพัฒนา:** รับรายละเอียดจากผู้ใช้และอ่าน Source จริงก่อนแก้ Form/required fields, Student ID/email/password/confirmation, duplicate/errors, loading/success feedback, Google button, responsive/UI เดิม และ Register → JWT → Student Dashboard.
2. **Register E2E:** หลังหน้า Register พร้อมและมีบัญชีที่ได้รับอนุญาต ตรวจ persistence/JWT/redirect/duplicate และ Login หลัง Logout.
3. **Google OAuth E2E:** หลัง Register ผ่าน ตรวจ Google-only creation/Student ID/mapping/JWT/RBAC/Dashboard, Logout/returning Login/no duplicate และ Dashboard linking ด้วยบัญชีมหาวิทยาลัยที่ได้รับอนุญาต.
4. **Other Roles Authentication:** Teacher/Head/Staff Login/JWT/RBAC/Dashboard/Logout เมื่อมีบัญชีที่อนุญาต ห้ามสร้างบัญชีเพื่อให้รายงาน PASS.
5. **Remaining Features:** Remember Me/cross-tab persistence, dynamic workflows, NLP env integration, server-side JWT revocation เมื่อมีข้อกำหนด และงานฝึกงาน/สหกิจคงเหลือตาม Handoff/ลำดับที่ผู้ใช้สั่ง.

ลำดับข้างต้นเป็นประวัติแผนวันที่16 ตุลาคม ไม่ใช่คำสั่งงานปัจจุบัน. Phase1.5แทนที่ขอบเขต Student Internship แล้ว; ผู้ใช้อนุญาตเฉพาะ Phase2 Part1 Student Profile ตามสถานะล่าสุดด้านบน. ขอบเขต ทก.01/แผนพัฒนาส่วนอื่นยังรอหารือ ไม่เริ่ม Register/โมดูลใหม่และไม่อ้าง Teacher/Head/Staffพัฒนาเสร็จทั้งหมด.

## Documentation References

- [AGENTS.md](AGENTS.md) — Repository rules และข้อห้าม
- [HANDOFF_fitm-intern.md](HANDOFF_fitm-intern.md) — สถานะล่าสุด ขอบเขตหลักฐาน ประวัติ และงานต่อไป
- [Developer Console guide](dev-env-manager/README.md) — Bootstrap/Start/Stop, file/secret/backup security และข้อจำกัด
- [เงื่อนไขการใช้งาน](frontend/terms.html) และ [นโยบายความเป็นส่วนตัว](frontend/privacy.html) — เก็บหน้าร่างภาษาไทยไว้ โดย Register ไม่มี Checkbox/ลิงก์ยอมรับแล้ว; รอผู้ดูแลยืนยันผู้รับผิดชอบ ช่องทางติดต่อ ฐานการประมวลผล และระยะเวลาเก็บรักษาก่อนประกาศใช้
- Feature acceptance/manual checklists เดิมยังอยู่ใน [Documentation](#documentation); ผลในเอกสารเหล่านั้นเป็นหลักฐานตามวันที่/ขอบเขตของแต่ละงาน

<details>
<summary>ประวัติ Authentication / Register / Fonts — 14–15 ตุลาคม 2026 (รายละเอียดที่ถูกแทนที่ให้อ่านสรุปปัจจุบันด้านบน)</summary>

## Login / Register / Dashboard Google Account — 15 ตุลาคม 2026

**Flow ล่าสุด:** Google บัญชีใหม่ที่ผ่านนโยบาย Student → atomic Student + mapping → JWT → Dashboard; Google ที่มี mapping → Login → Dashboard. ถ้า email หรือ Student ID ชนบัญชี Student เดิมที่ยังไม่ผูก จะตอบ `409 GOOGLE_DASHBOARD_LINK_REQUIRED` พร้อมแนะนำ Email/Password Login → **จัดการบัญชี → เชื่อมต่อ Google OAuth**. หน้า Login/Register ไม่มีฟอร์ม linking และไม่ออก JWT ให้บัญชีที่ชนกัน. Anonymous Student linking endpoints เดิมถูกปฏิเสธ; personnel backend authentication เดิมคงอยู่.

Website Register คง validation/bcrypt/defaults เดิม แต่สร้างบัญชีและ Application session ใน transaction เดียว → HTTP 201 พร้อม JWT/Student role/URL Dashboard ที่ Backend อนุญาต → frontend ใช้ session adapter เดิมและ redirect เข้า Dashboard. `pending` เป็นสถานะที่ guard เดิมอนุญาต ไม่พบ verification gate แยกใน flow นี้. Register ไม่มี Remember Me เดิม จึงใช้ session storage (`remember:false`); Login Remember Me/cross-tab/Logout/drafts คงเดิม. หากออก JWT ไม่สำเร็จ บัญชีใหม่ rollback.

Dashboard มี Google account panel เพิ่มเฉพาะงานนี้ ใช้ Student JWT + live actor เป็น target, ยืนยันรหัสผ่านปัจจุบันเพื่อรักษา fresh ownership เดิม, Google nonce/token/domain/hd verification และ Shared Confirmation Modal. Challenge อายุ 5 นาทีและ confirmation อายุ 2 นาทีผูกกับ Student ID/JWT เดียวกัน ใช้ครั้งเดียว ตรวจ password/target fingerprints และ identity conflicts ซ้ำก่อนบันทึก. Confirm ไม่ออกหรือเปลี่ยน JWT; refresh linked status แทน. Google-only แสดงเชื่อมแล้วโดยไม่ให้ผูกซ้ำ. API ใหม่อยู่ที่ `/api/auth/google/student/{status,challenge,link,link/confirm}` และต้องผ่าน JWT/Student guards.

**PASS:** actual PostgreSQL/HTTP integration ภายใน rollback transaction โดยฉีด verified claims แบบ mock, Register JWT + token-failure rollback, Google create/return, no-password rejection, Dashboard linking/cross-account/session/replay/conflict/origin/role guards; counts/ค่าข้อมูลเดิมตรงก่อน–หลัง. Headless mock Login/Register/Google panel/Modal 1280/390/320 ผ่าน; Register API mock เข้า Dashboardด้วย session storage และไม่ submit ซ้ำ. Frontend build 134 modules/syntax/health ผ่าน. **NOT TESTED:** Google Provider/บัญชีจริง, full Dashboard workflows, physical mobile/Production และ committed concurrency. ไม่แก้ Schema/Models/env/flags ในรอบนี้. สถานะ “Register → Login” และ Student linking บนหน้า Login ในประวัติถูกแทนที่ด้วยหัวข้อนี้; รายละเอียดไฟล์/ข้อจำกัดอยู่ใน [Handoff](HANDOFF_fitm-intern.md).

## Google-only Student Registration — 15 ตุลาคม 2026

**ปลด Schema blocker แล้ว; Provider acceptance ยัง PARTIAL.** Google ครั้งแรกที่ผ่าน signature/iss/aud/exp/verified email/domain/hd/nonce และ pattern `^s([0-9]{13})@email\.kmutnb\.ac\.th$` จะใช้ 13 หลักเป็น Student ID, ชื่อจาก Google `given_name`/`family_name` และ defaults `co_op`/`pending` สร้าง Student (`password_hash=NULL`) + Google subject mapping ใน transaction เดียว แล้วออก Application JWT เข้า Student Dashboard. ครั้งต่อไปใช้ mapping เดิม. ถ้า Google ไม่ส่งชื่อ/นามสกุลครบ ตอบ `503 GOOGLE_STUDENT_PROFILE_REQUIRED` โดยไม่สร้างข้อมูลสมมติหรือแก้ required fields เพิ่ม. นโยบายนี้ใช้สมัครบัญชี ไม่รับรองสถานะนักศึกษาปัจจุบัน/คุณสมบัติฝึกงาน.

**Development เท่านั้น:** เพิ่ม `GOOGLE_STUDENT_ONBOARDING_ENABLED` ค่าเริ่มต้น false ใน `.env.example`; จะมีผลเมื่อ `NODE_ENV=development` และ target เป็น local PostgreSQL `intern_system` ตาม guard เดิม. Development `backend/.env` ตั้งสองค่านี้เป็น development/true และ recreate เฉพาะ Backend แล้ว; Google Login/Linking flags และ domain/hd เดิมไม่เปลี่ยน. Production/test/ไม่ระบุ environment เปิด onboarding ไม่ได้ แม้ตั้ง flag=true. ไม่เปลี่ยน Production Database.

Email/Password registration ยังบังคับ password/validation/bcrypt เดิม; Google-only ปฏิเสธ Password Login ด้วย 401 โดยไม่ส่ง NULL เข้า bcrypt. บัญชีเว็บไซต์เดิมที่ชน email/Student ID ต้องยืนยัน credentials → Shared Modal → explicit confirmation ตาม secure linking เดิม ไม่มี Auto-Link. ใช้ subject/Student-ID advisory locks และ UNIQUE เดิมป้องกัน duplicate; mapping ล้มเหลว rollback Student. ไม่เปลี่ยน UI/Session/Remember Me/RBAC หรือสร้าง Teacher/Staff.

DDL ที่รันจริง: `ALTER TABLE public.students ALTER COLUMN password_hash DROP NOT NULL;` เฉพาะ PostgreSQL 16 Development. ตรวจ row fingerprints ของ Student เดิม 4 แถวตรงกันก่อน/หลังและคอลัมน์อื่นไม่เปลี่ยน. Model-driven column inspection ผ่านโดยไม่รัน init/reset/sync. **PASS** PostgreSQL integration ภายใน transaction ที่ rollback: creation, hashing/password rejection, linking/replay, unique failures/atomic rollback, JWT/Student guard; lock exclusion สอง connection และ build 133 modules ผ่าน. **NOT TESTED** Google Provider/บัญชีจริง, committed concurrent registration, browser/Production. ไม่คงบัญชีทดสอบไว้. รายละเอียดดู [Handoff](HANDOFF_fitm-intern.md).

Rollback plan (ยังไม่ได้รัน): ปิด onboarding flag ก่อนโดยคง Google Login ของบัญชีเดิม; ตรวจ NULL hashes ใหม่ภายใต้ table lock ใน transaction. รัน `ALTER TABLE public.students ALTER COLUMN password_hash SET NOT NULL;` และคืน Model contract ได้เฉพาะเมื่อไม่มี NULL hash. ถ้ามี Google-only แล้ว ให้คง nullable และกำหนดแผนรองรับบัญชีที่ได้รับอนุญาตก่อน ห้ามสร้างรหัสผ่านทดแทน/ลบบัญชีเพื่อ rollback. สถานะ Schema BLOCKED ในประวัติด้านล่างถูกแทนที่โดยหัวข้อนี้.

## Google Student / Register / TH Sarabun New — 14 ตุลาคม 2026

ขอบเขตฟอนต์ครอบคลุมข้อความที่แอปควบคุม; GIS iframe/Google Provider popup ใช้ฟอนต์และ branding ที่ Google ควบคุม. ไม่ดัดแปลง Provider UI.

**Google Student: PARTIAL — เปิดเฉพาะ Development ตามการยืนยันผู้ใช้แล้ว.** `backend/.env` ตั้ง `GOOGLE_LOGIN_ENABLED=true` และ `GOOGLE_ACCOUNT_LINKING_ENABLED=true`; recreate เฉพาะ Backend. Flags ร่วมครอบคลุมทั้งสี่บทบาทตาม implementation เดิม. ไม่เปิด Production ไม่เพิ่ม domain และไม่เปลี่ยน Hosted Domain/identity policy. Config จริงตอบ enabled/linkingEnabled=true, onboardingEnabled=false. เมื่อ Google ยังไม่มี mapping หน้า Login จะให้พิสูจน์บัญชี KIWI เดิมด้วย credentials แล้วแสดงชื่อ/อีเมล/รหัสนักศึกษาและบัญชี Google ใน Shared Modal ก่อนบันทึก. `POST /api/auth/google/link/confirm` ใช้ receipt อายุสองนาที ใช้ครั้งเดียว ผูกกับบัญชีเป้าหมาย/credentials/subject และตรวจ policy/conflict ซ้ำ; receipt ไม่ใช่ JWT สำหรับ session. ไม่ Auto-Link จากอีเมล ไม่สร้าง Student ใหม่ และคง UUID/Profile เดิม.

**Real Student Email/Password: PASS เฉพาะขั้นที่ตรวจได้หนึ่งบัญชี.** เจ้าของบัญชีกรอกผ่าน Chrome: Dashboard ถูกต้อง, Application JWT HS256/Student/expiry, `/api/auth/me` 200/identity ตรงกัน/safe response, Teacher/Head/Staff APIs 403, ไม่มี token 401, Remember Me=false/session storage, reload recovery และ Logout ล้าง token ผ่าน. Expired signed JWT ได้ 401 ในการตรวจ synthetic แยกต่างหาก. Remember Me=true และ cross-tab รอบบัญชีจริงยัง NOT TESTED. Google Provider E2E **NOT TESTED จนครบ**: UI เคยถึง GOOGLE_LINK_REQUIRED และมี network error บางรอบ; mapping จริงยัง 0 และยังไม่ได้ยืนยัน linking/logout/Google Login/Application session ครบ. synthetic/mock checks ไม่ใช่หลักฐาน Provider E2E. Teacher/Head/Staff Google Provider E2E **NOT TESTED** และไม่มีการสร้างบัญชีเพิ่มเติม. ทดสอบรหัสผ่านและ Provider ผ่าน browser เท่านั้น ไม่ส่ง password/token ทางแชต.

**Register: PARTIAL.** คง required fields, university email, bcrypt, pending/co_op defaults, unique constraints และ redirect `/login.html`. เพิ่ม bounds ให้ตรงกับ Backend รวมรหัสผ่าน UTF-8 ไม่เกิน 72 ไบต์, feedback/retry และป้องกัน submit ซ้ำหลังสำเร็จ; log เฉพาะ status. Browser mock API และ synthetic controller/actual Student hashing hook ผ่าน; ไม่สมัครบัญชีจริงเพื่อทดสอบ. Google-only onboarding ยัง BLOCKED รอนโยบาย Student ID.

**ฟอนต์ Web: TH Sarabun New 1.35 จาก [หน้าเผยแพร่ SIPA](https://www.f0nt.com/release/th-sarabun-new/).** Bundle TTF สี่รูปแบบพร้อม GPL-2.0-or-later และ font-embedding exception ใน `frontend/public/fonts/th-sarabun-new`. Shared `fonts.css` / `--app-font-family` ใช้ผ่าน main.css และ page overrides; คง Font Awesome/SVG และดีไซน์เดิม. ใช้ `font-size-adjust:0.5` เพื่อรักษาสัดส่วนข้อความ และแยก icon metrics. Chrome ตรวจ Login/Register/Home/Mentor/Company และ static Dashboard layouts ที่ 1280/390/320; Company 320 มี overflow 13px เท่ากับ baseline CSS. Dynamic role workflows, physical mobile และ browser อื่นยัง NOT TESTED.

**Print/PDF: PASS เฉพาะกลไกที่มีจริงและตัวอย่าง synthetic.** ระบบสร้าง HTML หนังสือขอความอนุเคราะห์/หนังสือส่งตัว แล้ว Browser Print/Save as PDF; ไม่มี server PDF writer ใน Source ปัจจุบัน. `documentFonts.js` ฝัง WOFF2 ทั้งสี่รูปแบบใน HTML พร้อม CSP `font-src data:` ใช้ใน Docker/offline downloads ได้. ตัดเฉพาะ TrueType hint instructions; ตรวจ glyphs/outlines/cmap/advance metrics ตรงต้นฉบับทุกตัว และแจกต้นฉบับ/ใบอนุญาต/รายละเอียดการแปลงคู่กัน. HTML ตัวอย่าง ~124KB ต่ำกว่า service limit 250KB เดิม. Chrome PDFs ฝัง THSarabunNew/THSarabunNew-Bold จริง อ่านไทย/วรรณยุกต์ได้ อยู่ใน A4; จำนวนหน้าเท่า baseline (1/2 หน้า). เอกสาร generated ที่เก็บไว้ก่อนหน้านี้และประวัติ/hash ไม่ถูกแก้; ฉบับใหม่ใช้ฟอนต์ใหม่. PDF ที่ผู้ใช้อัปโหลดและ NLP extraction ไม่ถูกเปลี่ยน. Official templates/เอกสารประเภทที่ยังไม่ได้ implement ไม่ถือว่าทดสอบผ่าน.

Frontend build 133 modules ผ่าน; Backend syntax และ Backend/DB/NLP HTTP 200. รายละเอียดผลตรวจ/ไฟล์/งานที่ยังต้องทำอยู่ใน [Handoff ล่าสุด](HANDOFF_fitm-intern.md). สถานะปิด Google flags ในประวัติด้านล่างถูกแทนที่เฉพาะ Development โดยการอนุมัติครั้งนี้.

**สถานะล่าสุด — 14 ตุลาคม 2026 (Asia/Bangkok): Development Database ใช้ Sequelize Models แล้ว — PASS.** ตรวจครบ **42 ตาราง / 503 คอลัมน์** และทดสอบสร้าง schema จาก public schema ว่างจริงใน transaction ที่ rollback. เติม 8 ตารางเดิมที่เคยรอ 019–021 โดย **ไม่ reset ข้อมูลเดิม**. ลบ migration source 27 ไฟล์และ automated test suites 89 ไฟล์ พร้อมตัวรันและ fixtures. งานนี้ไม่ยืนยัน full regression หรือ Production readiness.

อ่าน [Handoff ปัจจุบัน](HANDOFF_fitm-intern.md#current-handoff--model-driven-development-database--2026-10-14) สำหรับผลตรวจและรายชื่อไฟล์ที่ลบ. เอกสาร/audit/evidence เก่าคือประวัติ; คำสั่ง migration และ test harness ในเอกสารเหล่านั้นเลิกใช้แล้ว.

## Unified Login — 14 ตุลาคม 2026

`frontend/login.html` เป็นหน้าเข้าสู่ระบบเดียว ไม่มีตัวเลือกบทบาท. ส่งเฉพาะ email/password ไป `POST /api/auth/unified-login`; Backend ตรวจ Student, Teacher และ DepartmentStaff ตาม credentials จริง ตรวจสถานะ และใช้ `Teacher.is_department_head` พร้อม department สำหรับ Head. Response มี Application JWT, role/actor และ URL Dashboard เดิมที่อนุญาต. Endpoint Login เดิมของแต่ละบทบาทยังคงอยู่เพื่อ compatibility; หน้า teacher-login/department-head-login/staff-login redirect ไป `/login.html`.

หาก credentials ยืนยันได้หลายบัญชี จะตอบ `409 AUTH_CONTEXT_AMBIGUOUS` ให้ติดต่อผู้ดูแลระบบ โดยไม่เลือกหรือรวมสิทธิ์. Google อ่าน `/api/auth/google/config` และไม่โหลด provider เมื่อ disabled; เมื่อเปิดตาม configuration เดิม ใช้ `role:auto` ใน challenge/login เพื่อค้นหา Google subject mapping และตรวจ domain/hosted-domain policy ตาม role จริง. Mapping หลาย Actor เป็น **BLOCKED** สำหรับหน้า Login กลาง; ไม่มี default context และไม่เปลี่ยนนโยบาย identity/linking หรือ flags.

Remember Me ใช้ sessionStorage/localStorage ตามการเลือกสำหรับทุกบทบาท คง JWT expiry, generation ที่ยกเลิก session ข้ามแท็บ, session recovery, Logout และ live Backend RBAC. เปลี่ยนบัญชีหรือ Actor จะยกเลิก session เก่า; key ข้อมูลร่างคงเดิม. ลิงก์ลืมรหัสผ่านเดิมไม่มี reset endpoint จึงแสดง shared feedback ให้ติดต่อผู้ดูแลระบบ.

ตรวจครั้งนี้: **PASS** สำหรับ build 133 modules, syntax, in-memory synthetic login ทั้งสี่บทบาท/ambiguity/JWT/RBAC/Remember Me/Logout, Google mapping/disabled/link ownership guards และ Chrome headless ที่ 1280/390/320 px. HTTP Backend `/`, `/health/db` และ Frontend ตอบ 200; unauthorized role APIs ตอบ 401, unified input ว่างตอบ 400, Google disabled challenge ตอบ 503. Login สำเร็จด้วยบัญชีจริงและ Google Provider จริง **NOT TESTED**. ไม่สร้างไฟล์ทดสอบ/audit, ไม่แก้ schema/Models หรือ Student Profile, ไม่รัน migration/reset/commit/push; แก้หน้าที่ป้องกันสิทธิ์เฉพาะ session wiring และ URL Login.

</details>

## ระบบและเทคโนโลยี

ระบบจัดการสหกิจศึกษาสำหรับ Student `co_op`, อาจารย์/Class Advisor หัวหน้าภาควิชา เจ้าหน้าที่ สถานประกอบการ และพี่เลี้ยง. คำร้องใช้ Student → Class Advisor → Department Head; Project Advisor ต้องยืนยันความสัมพันธ์แยกต่างหาก. Shared Student architecture และประวัติ Internship คงอยู่ โดยการปิดสิทธิ์บังคับจาก Backend และ Dashboard admission.

Declarationsปัจจุบัน: Vite ^8.2.2, Tailwind ^4.3.3, JavaScript multipage, Axios ^1.19.0; Express ^5.2.1, Sequelize ^6.37.8, pg/JWT/bcrypt. Dockerfilesใช้ Backend Node20 และ Frontend Node22; ไม่ query runtime patch versions ภายในcontainersรอบนี้. PostgreSQLตรวจจริง16.15. NLPใช้ Python3.11 image, FastAPI0.115.0, scikit-learn1.6.1, PyThaiNLP5.0.4, NumPy2.2.6, PyMuPDF1.24.14, pytesseract0.3.13, Pillow11.0.0 และ Tesseract tha+eng. เป็น classical NLPตามรายละเอียดด้านบน; ไม่พบ embedding/LLM. Umzug/pytest/httpxไม่มีใน declarationsปัจจุบัน. **แก้ข้อมูลlockวันที่13พฤศจิกายน:** `backend/package-lock.json`ถูกtrackจริงตามexceptionใน.gitignore; Frontend lockยังถูกignore. Dependency compatibility testที่รันรอบนี้ตรวจBackend installed versionsเทียบlockผ่านตามรายการในtest ไม่ใช่การรับรองdependenciesทุกpackage/ทุกplatform.

```text
Browser/Vite → Express → Sequelize Models → PostgreSQL 16
                     → private storage / intern_storage
                     → FastAPI NLP/PDF/OCR
```

## โครงสร้างและแหล่งกำหนด schema

- `backend/src/models/*.model.js` และ associations กำหนดตาราง/คอลัมน์หลัก.
- `studentProfileAggregate.schema.js` / `studentProfileAggregate.factories.js` อยู่ใน models และใช้ร่วมกับ runtime Profile validation.
- `models/schemaIntegrity.js` เติม foreign keys, SQL defaults, indexes และข้อกำหนด nullability ของ Models ที่เดิมยังไม่ครบ.
- `db/postgresIntegrity.js` เป็น current initialization contract สำหรับ CHECKs, composite FKs, functions และ triggers ที่ Sequelize Models แสดงโดยตรงไม่ได้.
- `db/initialize.js` สร้าง schema ด้วย Models แล้วติดตั้ง PostgreSQL integrity objects ใน transaction เดียว; ไม่มี migration runner/ledger.
- Startup `app.js` ใช้ authenticate เท่านั้น. ไม่ sync, force หรือ alter อัตโนมัติ.
- `db:migrate*` และ `npm test` ถูกลบจาก backend/package.json. Migration 001–026 (รวม 007a) รวม 27 ไฟล์ถูกลบ และ `sequelize_meta` ถูกลบจาก Development.
- README ใน prepared directories และผลตรวจเก่าเก็บไว้เป็นประวัติ; runtime ไม่ import directory เหล่านั้นแล้ว.

แนวทาง indexes และ schema sync อิง [Sequelize v6](https://sequelize.org/docs/v6/other-topics/indexes/); การตรวจฐานว่างใช้ [PostgreSQL transactional DDL](https://wiki.postgresql.org/wiki/Transactional_DDL_in_PostgreSQL%3A_A_Competitive_Analysis).

## Development environment

เตรียมไฟล์ environment เฉพาะเมื่อยังไม่มี:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
```

Root `.env` ใช้ POSTGRES_PASSWORD; backend ใช้ DB_USER/DB_PASSWORD ที่ตรงกัน, DB_NAME=intern_system, DB_PORT=5432 และ DB_HOST=postgres ใน Compose หรือ 127.0.0.1 บน host. เตรียม JWT_SECRET, FRONTEND_URL, SMTP และ private storage ตาม backend/.env.example. Frontend ใช้ VITE_API_URL; ห้ามใส่ secret ใน VITE variables. NLP client ใน container ใช้ service URL; บน host ใช้ NLP_SERVICE_BASE_URL=http://127.0.0.1:8000.

Environment ปัจจุบันตั้ง `NODE_ENV=development` ใน backend/.env สำหรับ local Development Compose ที่ใช้ nodemon/Vite/Uvicorn reload แล้ว (15 ต.ค. 2026). คำสั่งจัดการ schema **ต้องมี NODE_ENV=development อย่างชัดเจน**; Guard ตรวจชื่อฐานจริง, local host (หรือ postgres ภายใน container), port 5432, dialect, public schema และ PostgreSQL 16; ปฏิเสธ Production, staging, environment ที่ไม่ระบุ และชื่อฐานอื่น. ไม่ใช้ init/reset เพื่อทดลอง Auth.

## Initialize / Reset / ตรวจฐานว่าง

จาก repository root สำหรับ Compose ที่ยังไม่ได้เริ่ม Backend:

```powershell
docker compose config --quiet
docker compose up -d postgres nlp-service
docker compose run --rm --no-deps -e NODE_ENV=development backend npm run db:init
docker compose up -d backend frontend pgadmin
```

สำหรับ stack ที่รันอยู่:

```powershell
docker compose exec -T -e NODE_ENV=development backend npm run db:init
```

`db:init` สร้างตารางที่ขาด รักษาข้อมูลเดิม และตรวจ columns/types/defaults/nullability/ENUM/PK/unique keys/FKs/index predicates/triggers. หากตารางเดิมไม่ตรง Models จะ rollback และแจ้ง drift; ไม่ใช้ alter เพื่อแก้เงียบ ๆ.

คำสั่ง reset ต่อไปนี้ **ลบข้อมูลทุกตารางแอปใน Development intern_system** รวมบัญชีเดิม และไม่ seed ผู้ใช้ให้เอง:

```powershell
docker compose exec -T -e NODE_ENV=development backend npm run db:reset -- --confirm=intern_system
```

การทดสอบสร้าง schema ว่างจริงที่ rollback เสมอและรักษาข้อมูลหลังจบ:

```powershell
docker compose exec -T -e NODE_ENV=development backend npm run db:verify-empty -- --confirm=intern_system
```

Reset/verify-empty drop เฉพาะตารางที่ตรวจว่าเป็นของ Models, ledger เดิม, ENUM และ functions ที่ระบบกำหนด ใช้ RESTRICT เพื่อไม่ cascade ไป schema อื่น. ดำเนินการภายใน transaction; rollback หากพบปัญหา. Force sync ใช้เฉพาะ explicit reset. Verify-empty ยืนยันว่าไม่มี application tables/ENUM/functions ก่อนสร้างใหม่; มี DDL locks ระหว่างตรวจ จึงใช้ตอนหยุดการทำงานของผู้ใช้ Development. ไม่ลบ container หรือ Docker volumes.

บน Windows host จาก `backend`:

```powershell
$env:NODE_ENV='development'
$env:DB_HOST='127.0.0.1'
npm.cmd ci
npm.cmd run db:init
# Reset เฉพาะเมื่อต้องการลบข้อมูล Development จริง:
# npm.cmd run db:reset -- --confirm=intern_system
npm.cmd start
```

Production/Staging schema provisioning ยังไม่ได้ออกแบบหรือทดสอบในงานนี้. `deploy.sh` เลิกเรียก migrations และตรวจอ่าน model projections เท่านั้น; script ยังมี git pull/build/restart และ **ไม่ได้รันในงานนี้**.

## ตารางและความสัมพันธ์ปัจจุบัน

| กลุ่ม | ตารางหลักจาก Model-driven baseline (ไม่ใช่การนับ live DB รอบนี้; Admin extensions ดูหัวข้อ Application Super Admin) |
| --- | --- |
| บัญชีและข้อมูลนักศึกษา | `teachers`, `students`, `department_staffs`, `student_profiles`, `student_addresses`, `student_education_records`, `student_training_records`, `student_skills`, `student_files` |
| บริษัทและประกาศงาน | `companies`, `job_submissions`, `job_postings`, `job_posting_work_modes`, `company_access_tokens`, `job_posting_reviews` |
| คำร้องและโครงการ | `coop_requests`, `coop_request_delivery_methods`, `coop_request_prerequisite_courses`, `coop_request_reviews`, `coop_projects`, `coop_project_advisor_requests` |
| เอกสารและบริษัทตอบรับ | `coop_documents`, `coop_document_revisions`, `company_responses`, `company_response_history`, `company_evaluations` |
| พี่เลี้ยงและบันทึกงานสหกิจ | `mentors`, `mentor_tokens`, `internship_daily_logs`, `internship_weeks`, `internship_week_events`, `internship_review_tokens` |
| นิเทศ | `supervision_appointments`, `supervision_events`, `supervision_tokens`, `supervision_images`, `supervision_results`, `supervision_result_revisions` |
| กิจกรรม | `coop_activities`, `coop_activity_history` |
| Google | `google_identities`, `google_auth_requests` |

Students เชื่อม Teachers สองบทบาท, Profile/Mentor แบบ 1:1 และ child records/files แบบ 1:N. Companies → submissions/postings → work modes/tokens/reviews. Students → requests → prerequisites/delivery/reviews/documents; project/advisor requests และ company evaluation แยกกัน. เอกสาร/response ใช้ version history และ composite FK; files ใช้ supersedes ownership FK. Internship weeks/events/logs, supervision appointments/results/images/revisions และ activities/history คง immutable/transition guards เดิม. Google identities อ้าง Student/Teacher/Staff; Head ใช้ Teacher identity กับ privilege flag เดิม.

## Google OAuth และ Student Profile

**Google implementation มี / provider E2E NOT VERIFIED:** ตาราง google_identities/google_auth_requests อยู่ใน Model-driven schema. Google-only Co-op/nullable password และ Dashboard linkingมี Sourceแล้ว. Public config GETวันที่4 พ.ย.รอบFull Auditตอบ enabled/linking/onboarding=true เป็นค่าที่สังเกตขณะตรวจ ไม่เปลี่ยน flags/domain/identity policy; ไม่ทดลอง Providerหรือสร้างบัญชี. ข้อความ disabled/รอนโยบายในประวัติ14 ต.ค.ไม่ใช่สถานะconfigล่าสุด.

**Student Profile baseline schema/imports มีหลักฐานเดิม / Part1 contact schema รออนุญาต:** Source ปัจจุบันมี 4 แท็บหลัก + 2 แท็บ Modal แก้ไข, aggregate revision, addresses/education/training/skills, private documents, file version/current indexes และ field types เดิม. ผล synthetic Part1 และข้อจำกัด live acceptance ดูสถานะล่าสุดด้านบน. ขอบเขต Phase 1–5 เดิมยัง ACCEPTED WITH LIMITATIONS ตาม [ประวัติ Phase 5](docs/audits/FITM_STUDENT_PROFILE_PHASE5_FINAL_ACCEPTANCE.md); OCR scan มี limited support และ national ID/encryption/acknowledgement/signature ยังมี policy blockers. ไม่เปิด Student Calendar หรือเปลี่ยนเมนู.

## บริการและผล smoke ล่าสุด

ตารางนี้แสดง Compose services และ **ผลตรวจเดิมวันที่ 14 ต.ค.** ไม่ใช่ผลตรวจซ้ำรอบเอกสารนี้. หลักฐาน Developer Console รอบ 16 ต.ค. รายงาน Frontend build 134 modules และ Backend/DB/NLP health ผ่าน; Console รันบน host แยกที่ 127.0.0.1:5379 ไม่ใช่ Compose service. ทุก port mapping ใน Compose ปัจจุบัน bind 127.0.0.1; Root Password/Credential ของ Console แยกจากบริการเหล่านี้.

| Service | Container / port บน 127.0.0.1 | ผลตรวจ 14 ต.ค. 2026 |
| --- | --- | --- |
| PostgreSQL | intern_postgres / 5432 | PASS — Docker healthy, Sequelize connect |
| Backend | intern_backend / 5000 | PASS — restart/startup, / และ /health/db HTTP 200 |
| Frontend | intern_frontend / 5173 | PASS — HTTP 200; Vite build 133 modules |
| NLP | intern_nlp_service / 8000 | PASS — /health HTTP 200, imports และ classifier startup |
| pgAdmin | intern_pgadmin / 5050 | PASS — HTTP 200 |

Compose มี container healthcheck เฉพาะ PostgreSQL; ส่วนอื่นยืนยันด้วย HTTP/startup. Containers เดิมไม่ได้ rebuild images. Frontend build ครั้งแรกถูก sandbox จำกัด subprocess; รันด้วยสิทธิ์ที่จำเป็นแล้วผ่าน.

Auth smoke ในงาน cleanup ก่อนหน้า: Student /me และ Profile /me → 401; Student/Staff login input ว่าง → 400; Teacher login input ว่าง → 401. Google config → 200 enabled=false; challenge/login → 503 GOOGLE_DISABLED. ไม่ใช้บัญชีจริงและไม่สร้างข้อมูลผู้ใช้.

**Snapshot วันที่ 14 ต.ค. ก่อน Full Cleanup:** 42 ตาราง, 503 คอลัมน์, 234 constraints, 112 indexes, 11 functions, 13 triggers. Schema ว่างที่สร้างใหม่ในรอบนั้นมี 230 constraints และ indexes/triggers เท่ากัน เพราะ composite uniqueness บางส่วนสร้างผ่าน unique indexes ของ Models แทน UNIQUE constraints เดิม; ownership/state integrity และ initialization ซ้ำผ่านตามหลักฐานรอบนั้น. Students 4/Teachers 23/Staff 0 เป็นข้อมูลก่อน Cleanup 154 records และไม่ใช่จำนวนปัจจุบัน; ประวัติ 0 → 1 record ล่าสุดดู Database / Sequelize ด้านบน.

## Automated tests หลัง cleanup

**ไม่มี Full Application Regression Coverage.** Suites เดิมถูกลบใน Cleanup ตาม [ประวัติ Handoff](HANDOFF_fitm-intern.md#รายการไฟล์ที่ลบในการ-cleanup-นี้). ภายหลังมี focused suites สำหรับบัญชี/Admin และ Phase 1; Phase 1.5 ปรับ `backend/test/phase1.test.js` และ `frontend/test/phase1.test.js` ให้ตรง Co-op Only โดยรักษา Issues 2–4. ไม่ใช้ `npm test` หรือ runners เก่าที่ถูกลบ.

**Historical execution — Phase1.5 วันที่4 พ.ย.เวลา19:33:** Backend17 PASS/Frontend8 PASS ไม่มีfail/skip. Actual controllers/services/middleware/routersใช้ synthetic Models/transactions/provider; Router checks18 endpointsใช้ substituted business handlers จึงไม่ใช่ Profile/PDF/NLP/ไฟล์/Database E2E. Frontendใช้ functions/storageกับDOM/session substitutes ไม่ใช่Browser. มี Express Promise-like deprecation warningจากVM realm ไม่มีtest failureในรอบนั้น. **Full Auditไม่รัน tests/buildใหม่**; ตรวจsyntax JS248/Python AST32/PowerShell4 และrelative JS importsแบบไม่executeแทน ไม่รวมเป็นRegression PASS.

รันจาก Repository root (ตรวจว่ามีไฟล์จริงแล้ว):

```powershell
node backend/test/phase1.test.js
node frontend/test/phase1.test.js
cd frontend
npm.cmd run build -- --configLoader native
```

**Build152modules/changed-JS10syntaxเป็นผลPhase1.5เดิม ไม่ได้รันใหม่ในFull Audit.** การเลือกCo-op fixtureใน `teacherAdminGrant.test.js` เป็นงานPhase1.5; SQL modeไม่ถูกรันรอบนี้. Commandsข้างต้นตรวจว่ามีไฟล์/scriptsจริง แต่ไม่ได้execute; Console testsสร้างtempfilesและAdmin SQL modeอาจเขียนในtransaction จึงไม่รันเพื่อauditเอกสาร. ต้องใช้isolated/authorized targetเมื่อมีงานacceptance ห้ามเปิดflagsหรือprovisionเพื่อทำให้ผลผ่าน.

ใช้ smoke/manual checks:

```powershell
curl.exe -fsS http://127.0.0.1:5000/health/db
curl.exe -fsS http://127.0.0.1:8000/health
docker compose ps
cd frontend
npm.cmd run build
```

## ข้อจำกัดและงานต่อไป

Full regression, authenticated role workflows, Profile CRUD/PDF/OCR E2E, SMTP acceptance, Google provider E2E, browser/mobile จริง และ Production/Staging deployment **NOT TESTED ในงานนี้**. ไม่รายงาน Full Regression PASS. Schema readiness ไม่ยืนยัน feature acceptance.

**Phase2 Part1 Student Profile: SOURCE IMPLEMENTED / LIVE SCHEMA PENDING APPROVAL.** ขอบเขต ทก.01/แผนโมดูลอื่นยังรอหารือ; รายการmissing/riskไม่ใช่Requirementsใหม่. Runtime acceptanceที่ยังเหลือคือ PostgreSQL concurrency/rollback, authenticated workflows, Browser/session/responsive, Google/SMTP, Storage/PDF/OCR/NLP และProduction. Public Mentor saveยังหมุนtoken; responseหายใช้Student resendเดิม. เก็บInternship history/role queues/Admin counts ไม่แปลงข้อมูล. ไม่เริ่มRegister/โมดูลใหม่ ไม่Commit/Push/Reset/Clean และไม่แก้ทก.01รอบนี้.


## การแก้ไขเฉพาะจุดหลังตรวจ cleanup — 14 ตุลาคม 2026

กู้ข้อความภาษาไทยส่วนที่เสียเป็น `?` จากต้นฉบับในบริบทงาน และเขียนใหม่ตาม Source/ผลตรวจที่ยืนยันได้ บันทึกเป็น UTF-8; ประวัติด้านล่างเก็บไว้ครบ.

ตัวเทียบ CHECK ใน `initialize.js` รักษาวงเล็บ, casts, identifiers และ string literals. หากข้อความนิยามต่างกัน จะให้ PostgreSQL parse ทั้งสอง CHECK บน session-local temporary table ที่ใช้ชนิดคอลัมน์และ collation เดียวกัน แล้วเทียบ canonical expressions. ตารางจริงและ constraints เดิมไม่ถูกแก้. Validation state ต้องตรงกัน; นิยามที่พิสูจน์ความเท่ากันไม่ได้ถือเป็น Schema Drift. ข้อผิดพลาดระหว่าง parse ทำให้ initialization rollback.

Focused verification ผ่าน CHECK เดิม 102 รายการและ integrity definitions รวม 109 รายการ; `(a AND b) OR c` กับ `a AND (b OR c)` ไม่ถูกมองว่าเท่ากัน ตรวจ string literals, whitespace และ NOT VALID ด้วย. ตรวจ Models 503 คอลัมน์ผ่าน และไม่มี temporary probes เหลือ. รอบแก้นี้ไม่รัน db:init/db:reset/db:verify-empty, migration, backup/restore หรือ full regression; ผลสร้าง schema ว่างด้านบนเป็นหลักฐานจากงาน cleanup ก่อนหน้า.

Prepared READMEs ยังมีคำสั่ง migration/installer/backup และชื่อไฟล์เดิมที่เลิกใช้ เป็น historical documentation ไม่มี runtime imports. `docs/audits/evidence/contracts.cjs` ยังอ่าน static-scan เดิมที่มี 112 paths ถูกลบ จึงไม่ใช่ audit generator ที่ใช้กับ Source ปัจจุบันได้โดยตรง. ไม่แก้ historical evidence ในงานนี้; ใช้ README/Handoff ปัจจุบันสำหรับ setup.

Operational scripts ที่ถูกลบ: คู่ `backupGoogleOAuth026.js` / `lib/googleOAuth026Backup.js` ต้องให้ผู้ใช้ตัดสินใจว่าจะเก็บความสามารถ backup/restore ทั่วไปในเครื่องมือใหม่หรือเลิกใช้ทั้งหมด เพราะ implementation เดิมผูกกับ 026/source hash/ledger. `verifyStudentProfileRestore.js` / `lib/studentProfileRestoreVerification.js` เลิกใช้ได้ใน workflow ปัจจุบัน เนื่องจากเป็นการตรวจ archive และ snapshot ของ Phase 2B.2 เดิม. `prepareStudentProfilePhase2AReference.js` เป็น generator ของรายงาน preparation เก่า จัดเป็นเครื่องมือประวัติที่เลิกใช้แล้ว. ทั้งห้าไฟล์ไม่มี runtime caller และไม่มีการ restore/delete เพิ่ม.

## Historical Project Documentation

ส่วนนี้รักษา README เดิมทั้งชุดเป็นประวัติ ไม่ใช่ setup/current status: ตัวเลข through-016/017–021 pending, Profile acceptance pending และ NLP 2 failing tests เป็น snapshots เก่าที่ถูก supersede เฉพาะประเด็นที่มีหลักฐานล่าสุดข้างต้น ผล pytest 30 PASS มาจาก harness ที่เข้า FastAPI lifespan; ไม่ได้หมายความว่า FAQ quality/website chatbot bridge เสร็จแล้ว สถานะ Staff/Teacher/Head/Mentor ที่ไม่มีหลักฐานใหม่ยังคงเดิม

<details>
<summary>README เดิมถึง 10 ตุลาคม 2026 — feature matrix, workflows และ acceptance history</summary>


**Latest investigation — Scenario K date boundary, 2026-10-10: IMPLEMENTED / NEEDS VERIFICATION.** Actual final run `a76f101314ab4cd283c5a1724b9f7e9e` passed Preflight and Cleanup Verification; Cancellation stopped at K (**24 PASS / 1 FAIL**, D passed), and the six dependent stages were BLOCKED. K's Bangkok date-only fixture became `2026-10-10` at `2026-10-09T17:17Z`; the existing API parses it as midnight UTC and correctly rejects that future instant. The previous 28-pass run was before Bangkok midnight. Fixed only the browser fixture to use the current UTC calendar date; all K preservation assertions and production business rules remain intact.

Actual local checks: Backend **202 PASS / 0 FAIL / 17 SKIP**, Frontend **248 PASS / 0 FAIL / 2 SKIP**, date/Company Response regression **27 PASS** (included in Backend), build **123 modules PASS**, JS syntax / three PS parses / diff check PASS. These are local checks, not a new nine-stage acceptance result. New evidence: `logs/staff-cancellation-k-date-fix-20261010/`. [Current failure, comparison, cleanup and verification report](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#scenario-k-date-boundary--2026-10-10). Replay the existing final runner from the repository root in Windows CMD:

```cmd
powershell.exe -NoProfile -File backend\test\runStaffCancellationFinalAcceptance.ps1
```

Older review entries below are historical snapshots. Do not mark VERIFIED until all nine fresh stages pass with exit 0.

**Latest review — 2026-10-10: IMPLEMENTED / NEEDS VERIFICATION.** Actual final run `6d835dc61fc248d7974b63fd4a2a598a` passed **all 28 Cancellation Chrome scenarios**, including J/UI. Documents failed before dismissal because the test expected initial focus on Cancel while the shared modal explicitly focuses Confirm. Corrected the test contract; production modal/cancellation/API behavior is unchanged. Cleanup failed because the Document PowerShell ownership record is missing, not because the validator observed a remaining resource. Reproduced native stderr interrupting the old PowerShell pipeline before child cleanup; the final runner now captures child streams through a tested native-process controller, waits for exit and preserves the real exit code and diagnostics.

New local results: Backend **194 PASS / 0 FAIL / 17 SKIP**, Frontend **248 PASS / 0 FAIL / 2 SKIP**, helper/evidence **46/0/0**, focused DOM **97/0/0**, build **123 modules PASS**, JS syntax / three PowerShell parses / diff check PASS. Docker ownership query was denied in Codex, so the old PostgreSQL resource state remains **UNVERIFIED**; no resource was deleted. All 15 original evidence files retain their hashes. New logs: `logs/staff-cancellation-document-cleanup-fix-20261009/`. [Current Document/cleanup diagnosis, files and limits](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#document-initial-focus-and-native-stderr-cleanup-fix--2026-10-10).

Replay every suite once from the repository root in an authorized ordinary Windows CMD terminal; each invocation creates a fresh GUID evidence directory and keeps previous evidence:

```cmd
powershell.exe -NoProfile -File backend\test\runStaffCancellationFinalAcceptance.ps1
```

Inspect `final-summary.json`, `process-result.json`, browser/ownership cleanup records and suite logs before accepting VERIFIED. Earlier updates below describe prior snapshots.

**Latest acceptance fix — 2026-10-09: 2.3.2 (2) IMPLEMENTED / NEEDS VERIFICATION.** Actual Chrome evidence `logs/staff-cancellation-browser-4ee57f6f59b448de9d9cc45cab350b8b` contains **25 passing scenarios / J failed / UI unexecuted**; D now passes. J used an unregistered Student list URL; corrected to `GET /api/coop-requests/me` and corrected its subsequent cancelled-history check to `PATCH /api/coop-requests/:id/cancel`. Added explicit `C-advisor_review` coverage reporting. Document DOM regression also demonstrated opener focus loss on Back/Escape; document callers now pass their opener to the existing shared modal. No business-rule, authorization, migration or persistent-database changes.

Current executed checks: Backend safe units **188 PASS / 0 FAIL / 17 SKIP**, Frontend **248 PASS / 0 FAIL / 2 SKIP**, build **123 modules PASS**, focused contract/evidence tests **14/0/0**, JavaScript syntax and three PowerShell AST parses PASS. The new one-command runner was refused at script loading by this session's execution policy, exit 1; **no new Chrome/SQL suites or owned resources were started**, and no policy was changed. [Current diagnosis, files, evidence and acceptance rules](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#scenario-j-contract-fix-and-final-acceptance-runner--2026-10-09).

From the repository root in an ordinary Windows CMD terminal already authorized to run the project scripts:

```cmd
powershell.exe -NoProfile -File backend\test\runStaffCancellationFinalAcceptance.ps1
```

It runs preflight → Chrome Cancellation → default Chrome Documents → focused disposable SQL → full disposable Backend → Frontend including disposable saved-data regression → build → evidence validation → cleanup verification. Each invocation owns `logs/staff-cancellation-final-<guid>/`; inspect `final-summary.json`, `test-counts.json` (including explicit optional skips), suite logs, screenshots and cleanup records. Earlier sections below retain historical results.

**Latest Chrome cancellation preparation — 2026-10-09:** Scope **2.3.2 (2) IMPLEMENTED / NEEDS VERIFICATION**; **CHROME E2E IMPLEMENTED — EXECUTION PENDING**. The existing CDP/Node/disposable PostgreSQL runner now supports `-Cancellation` (27 planned subtests) and read-only `-CheckEnvironment`; default document mode remains separate. New executions: Backend units **148 PASS / 0 FAIL / 17 SKIP**, Frontend DOM **233 PASS / 0 FAIL / 2 SKIP**, build **123 modules PASS**, JavaScript syntax **245 files PASS**, PowerShell parse PASS. The user reports earlier focused PostgreSQL **46/0/0** and Full Backend **241/0/1**, exit 0; these are user-supplied historical evidence, not new Codex runs. PowerShell child execution is blocked by execution policy in this session; known Docker/Chrome restrictions were not bypassed. No new SQL/Chrome PASS is claimed. [Matrix, artifacts, manual fallback and exact Windows CMD commands](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#chrome-cancellation-acceptance-preparation--2026-10-09). Earlier sections below are historical snapshots.

**Student cancellation SQL fixture fix — 2026-10-09:** Confirmed the failing owner fixture used `@fixture.invalid`, which the unchanged Student Model rejects. Corrected only its test identity/email to a UUID suffix with `@email.kmutnb.ac.th` and strengthened audit/ownership/integrity assertions. New focused Backend units: **40 PASS / 0 FAIL / 0 SKIP**; Model validation, syntax and diff check PASS. User-reported pre-fix PostgreSQL: **44 PASS / 2 FAIL / 0 SKIP**. Post-fix SQL and Browser Acceptance remain **NOT VERIFIED**, scope **2.3.2 (2) IMPLEMENTED / NEEDS VERIFICATION**; Docker named-pipe access is still denied in Codex. [Root cause and Windows CMD replay](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#student-cancellation-fixture-root-cause-fix--2026-10-09).

**Docker environment follow-up — 2026-10-09:** The user reports Docker Client/Server 29.7.2 and WSL working from ordinary Windows CMD. The current Codex PowerShell session still receives `permission denied` opening `dockerDesktopLinuxEngine`; Docker calls stopped immediately afterward. Local configuration selects the `unelevated` Windows sandbox; restricted-token access is a plausible explanation, not a proven pipe ACL diagnosis. PostgreSQL and Chrome cancellation acceptance remain **NOT VERIFIED**, scope **2.3.2 (2) IMPLEMENTED / NEEDS VERIFICATION**. No application/test changes or new suite execution in this follow-up. See [current session comparison and actual Windows CMD replay commands](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#codex-access-follow-up--2026-10-09).

FITM-INTERN supports student co-op administration: profiles, company/job discovery, requests, project advisors, topics, private project files and student workplace feedback. Several departmental, Mentor and academic-assessment workflows remain unfinished.

**Final acceptance recheck — 2026-10-09:** Backend **144 PASS / 0 FAIL / 17 SKIP**, Frontend **231 PASS / 0 FAIL / 2 SKIP**, build **123 modules PASS**, syntax **242 files PASS**. Existing cancellation source/tests were preserved; no application bug was demonstrated or refactoring performed. Docker Desktop/WSL processes are present, but both Docker named pipes and WSL status enumeration return access denied in this session. Installed Chrome **154.0.8037.98** is confirmed by file metadata; an attempted Chrome smoke command was rejected before execution by automatic approval review (`blocked by policy`), so no Chrome E2E passed. Scope **2.3.2 (2) remains IMPLEMENTED / NEEDS VERIFICATION**. Historical Backend 357 reconciles to **139 unit + 218 integration checks**; current 144 is **139 original + 5 new unit checks**, with all historical root tests still discovered. See [latest diagnosis, count comparison and replay steps](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md#final-acceptance-recheck--2026-10-09).

**Production ready: NO.** Current phase **2026-10-09 Asia/Bangkok**: Department Staff request cancellation — official requirement **2.3.2 (2), IMPLEMENTED / NEEDS VERIFICATION**. Existing Staff document menu now includes request search/status filters/pagination, detail/history and reasoned cancellation with stale status/timestamp checks. Student detail reads the saved reason and actor. Current executed results: Backend **144 PASS / 0 FAIL / 17 SKIP**, Frontend **231 PASS / 0 FAIL / 2 SKIP**, build PASS. Docker engine access is denied in this session; new PostgreSQL cases and real Chrome acceptance are **NOT VERIFIED**. No schema/persistent-data changes. See [cancellation audit and acceptance](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md), [Project Development Status](#project-development-status) and [HANDOFF_fitm-intern.md](./HANDOFF_fitm-intern.md). Earlier calendar SQL/Chrome evidence remains historical. Official university templates/PDF, scoring rubrics, real SMTP and persistent migration rollout remain pending.
The earlier Daily Log / Weekly Mentor Review session implemented and verified disposable PostgreSQL and real Chrome workflows. Students save daily entries and submit complete weeks; verified Mentors review each batch. Historical results: Backend 293 PASS/0 FAIL/0 SKIP; Frontend 184 PASS/0 FAIL/1 existing SKIP; Daily SQL 21 PASS; Daily/Mentor Chrome 12 PASS. Current session results appear below. Persistent migration 018 and real SMTP remain pending. [Earlier implementation and acceptance](docs/DAILY_LOG_WEEKLY_MENTOR_ACCEPTANCE.md).

## Architecture

```text
Browser: Vite multipage HTML/CSS/JavaScript + Axios
  -> Express REST API + JWT / scoped email-verification tokens
     -> Sequelize + Umzug -> PostgreSQL 16
     -> private backend storage / intern_storage volume
     -> FastAPI NLP: PyThaiNLP, TF-IDF/cosine matching, Tesseract OCR
```

Docker Compose provides frontend, backend, PostgreSQL, NLP and pgAdmin. Job ranking and Resume OCR have Express-to-NLP clients. The FastAPI FAQ chatbot is a separate endpoint; the website chatbot currently displays a placeholder response. NLP uses classical models, not an LLM.

| Component | Source | Technology |
| --- | --- | --- |
| Frontend | `frontend/src/pages`, `src/api`, `src/styles` | Vite 8, JavaScript, Tailwind CSS 4, Axios |
| Backend | `backend/src/routes`, `controllers`, `services`, `models` | Node.js, Express 5, Sequelize 6, JWT, Multer, Nodemailer |
| Migrations | `backend/src/db/migrations` | Umzug 3, ledger `sequelize_meta` |
| NLP | `nlp-service/app`, `data/processed/chatbot/faq_seed.json` | FastAPI, PyThaiNLP, scikit-learn, Tesseract |
| Development/runtime | `docker-compose.yml`, component Dockerfiles | Docker / Docker Compose |
| Staging helper | `deploy.sh` | Pull, build, migration and health steps; not run by this audit |

## Roles and canonical workflows

| Role | Current responsibilities and limits |
| --- | --- |
| Student | Password registration/login, own profile, company discovery/matching, requests, prerequisites, Mentor records, project-advisor requests, topic/files and workplace evaluation |
| Teacher | Login/profile, project-advisor queue/accept/reject, own class-advisee request decisions and project-advisee supervision scheduling |
| Department Head | Teacher identity with explicit `is_department_head`, live DB authorization and department scope; login/request-decision dashboard implemented; permitted Teacher administration remains backend only |
| Department Staff | Login/document dashboard, all-state request list/detail/history and eligible cancellation UI; approved document queue, Cooperation Letter drafts/generated dev previews/history; recruitment remains backend only; never a request approval stage |
| Mentor | Single-use profile verification, separate weekly-batch review links and separately scoped original/substitute appointment confirmation; academic scoring remains unfinished |
| Company/Public | Public recruitment form and email verification; no Company management portal |

**Co-op Request:** Student submission -> Class Advisor -> Department Head -> Approved / Rejected. Department Staff may view/history/cancel eligible pending requests and is **not an approval stage**. Legacy `staff_review` is retained for historical compatibility.

**Project Advisor:** Student selects an active Teacher -> pending request -> that Teacher explicitly accepts/rejects. Only acceptance sets `students.coop_advisor_teacher_id`. Pending replacement preserves request history; stale decisions cannot confirm an old selection. Confirmed replacement is a separate unimplemented workflow. The old Head direct-assignment endpoint returns 409.

`advisor_teacher_id` is the separate **class advisor** selected by the Student. Teacher-directory loading failure must preserve it. Project-topic saving works with no advisor, pending, rejected or confirmed advisor.

**Recruitment:** Public form -> Turnstile Siteverify -> transactional Company/submission/jobs/work modes -> verification email -> `pending_review` -> Staff backend publish/reject. Unverified/pending jobs do not appear in Student matching. SMTP failure preserves the submission and supports limited resend recovery; real browser/inbox acceptance remains pending.

## Earlier feature status summary

The full requirements matrix below supersedes these earlier area summaries. Historical WORKING means connected application layers with relevant automated/read-only evidence, and does not establish full official-scope completion or every real-browser interaction.

| Area | Status | Notes |
| --- | --- | --- |
| Student password registration/login | PARTIAL | Real bcrypt/JWT APIs and pages; successful existing-user browser acceptance pending |
| Student authenticated reads / Teacher directory / company search | WORKING | Owner/actor guards, real models and safe directory/search projections |
| Profile, profile image, class-advisor selection | PARTIAL | Real API/storage flows; advisor-preservation regressions pass; complete persistence/browser acceptance still needed |
| Resume | PARTIAL | PDF upload, metadata, replacement, native text and OCR implemented; post-commit retention tests pass; complete browser/SQL/provider acceptance remains |
| Skills/Resume job matching | PARTIAL | Connected to real NLP, published jobs only; expiry filtering omitted |
| Student request create/list/detail/cancel/history | WORKING | Request/delivery/audit persistence and ownership tested |
| IT/INE prerequisite snapshots | WORKING | Five canonical courses, program switching, grades and saved history |
| Complete request approval UI workflow | PARTIAL | Student, Class Advisor and Head decision UI connected; authorized real Local Head HTTP/SQL acceptance passes; real browser acceptance remains pending |
| Project-advisor request workflow | PARTIAL | Student/Teacher UI connected; isolated and Local credential/authenticated HTTP/SQL acceptance pass; real browser acceptance pending |
| Project topic | WORKING | Owner-scoped create/edit/read-back, independent of advisor confirmation |
| Project Book / Poster | WORKING | Private storage, replacement and authenticated Blob preview; real browser/native preview pending |
| Student Company Evaluation | WORKING | Dedicated table, five 1–10 scores, comment, total/average and all eight real context sources; migration 015 applied on Local |
| Student Mentor management / verification | PARTIAL | CRUD, email/resend and token-confirmation page implemented; fresh live acceptance pending |
| Staff request cancellation | IMPLEMENTED / NEEDS VERIFICATION | Existing pending-only API connected to Staff search/detail/shared reason modal; unit/DOM/build pass; current PostgreSQL/Chrome acceptance blocked by Docker permission |
| Staff recruitment / Head Teacher administration | BACKEND ONLY | Authorization and SQL operations tested historically; corresponding administration pages absent |
| Department Head request frontend | PARTIAL | Login/live Head guard, scoped request list/detail/Class history and final approve/reject connected; Local HTTP/SQL acceptance passes; browser and other Head menus remain pending |
| Teacher Class Advisor frontend | PARTIAL | Own request list/detail/course snapshot/history, approve to Head and reasoned reject connected; automated and Local HTTP/SQL acceptance pass; real browser pending |
| Teacher project-advisor frontend | PARTIAL | Login, own queue, accept/reject/reason and refresh implemented; guarded Local credential helper/API acceptance pass; browser acceptance pending |
| Staff frontend | PARTIAL | Login, document queue/search/filter/pagination/detail, metadata/version/history, preview/download/print controls connected; real browser pending |
| Cooperation Letter document processing | PARTIAL | PostgreSQL drafts/frozen snapshots/revisions and authenticated server-rendered dev HTML pass Local HTTP/SQL; approved official template/PDF issuance pending |
| Company Response / Placement Letter | WORKING (development HTML) | Staff response/history and versioned Placement verified on disposable PostgreSQL + real Chrome; completed Cooperation Letter/persisted acceptance required; official PDF and persistent 017 rollout pending |
| Public recruitment through publication | PARTIAL | Submission/verification implemented; inbox acceptance and Staff UI missing |
| Daily Log / Weekly Mentor Review | WORKING (development; disposable verified) | Daily working/nonworking records, weekly snapshots/revisions and verified Mentor capability review pass PostgreSQL + real Chrome; persistent 018 rollout and real SMTP acceptance pending |
| Company transfer / landing jobs and chatbot | MOCK / UI ONLY | DOM/demo behavior; no corresponding persistent end-to-end flow |
| FastAPI FAQ chatbot | BACKEND ONLY | Endpoint runs, but two existing tests fail and document-intent quality needs review; no Express/website bridge |
| Google login button | MOCK / UI ONLY | Placeholder; OAuth callback/account/JWT flow NOT STARTED |
| Supervision visit results 1–2 | WORKING (development; disposable verified) | Confirmed appointment → draft → completed; exactly two private images, retained revisions and Student read-only results |
| Staff activity calendar | WORKING (development; disposable verified) | Monthly/list calendar, drafts/publication/cancellation, Student read-only visibility, duplicate/stale protection and immutable audit; migration 021 persistent rollout pending |
| Academic scores, official document issuance/PDF, Internship Report | NOT STARTED / BLOCKED | Approved templates, scoring rubrics and logbook compilation remain unfinished |
| Production deployment | PARTIAL | Development Compose and staging helper exist; current VM/schema/HTTPS readiness unverified |

Company Evaluation context comes from authenticated Student name/code/major, current owner Mentor name/position, exactly one owner request in `approved/document_issued/in_progress` (company snapshot first, linked Company fallback), that request's work dates, and the evaluation's last saved timestamp. Zero/multiple accepted requests and missing real values display `-`.

Project Book accepts PDF up to 10 MB; Poster accepts PDF/PNG/JPEG up to 10 MB. Server validates extension, MIME, signatures, size, ownership and storage paths. Resume is a separate PDF flow. Files are not served through public storage URLs.

## Local development setup

Use Windows with Git and Docker Desktop/Linux containers, or an equivalent Docker environment. Environment templates now exist at `.env.example`, `backend/.env.example` and `frontend/.env.example`. For a new checkout, copy each template to its corresponding `.env` **only if the destination does not already exist**, then configure private values.

| Environment | Important variable names |
| --- | --- |
| Root / PostgreSQL | `POSTGRES_PASSWORD` |
| Backend / database | `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| Auth / origin / storage | `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `STORAGE_ROOT` |
| Backend -> NLP | `NLP_SERVICE_BASE_URL`, `NLP_SERVICE_TIMEOUT_MS`, `NLP_OCR_TIMEOUT_MS` |
| Email / recruitment | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `RECRUITMENT_SUBMISSION_ENABLED` |
| Turnstile | `TURNSTILE_SECRET_KEY`, `TURNSTILE_EXPECTED_HOSTNAME`, optional `TURNSTILE_EXPECTED_ACTION`, `TURNSTILE_TIMEOUT_MS` |
| Browser | `VITE_API_URL`, `VITE_TURNSTILE_SITE_KEY` |

All `VITE_*` values are public browser configuration. Never put private keys or credentials there. Backend DB settings must match Compose PostgreSQL; `DB_HOST=postgres` is the internal service name. The configured frontend origin must match the browser URL. The latest audit found an unset root `POSTGRES_PASSWORD` interpolation warning in its shell; existing PostgreSQL remained healthy. Configure it before a fresh start/recreation.

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose exec -T backend npm run db:migrate:status
```

These are development setup instructions, not actions performed by the audit. Startup authenticates the DB and does not call Sequelize sync. For a fresh database, review/configure the intended target before applying migrations. For an existing database, inspect its ledger/schema and take a fresh backup before any separately authorized rollout; never reset it or assume another environment has Local's state.

| Service | Container | Main local URL/port |
| --- | --- | --- |
| Frontend | `intern_frontend` | [localhost:5173](http://localhost:5173) |
| Backend | `intern_backend` | [localhost:5000](http://localhost:5000), [DB health](http://localhost:5000/health/db) |
| PostgreSQL | `intern_postgres` | localhost:5432, database `intern_system` |
| NLP | `intern_nlp_service` | [health](http://localhost:8000/health), [API docs](http://localhost:8000/docs) |
| pgAdmin | `intern_pgadmin` | [localhost:5050](http://localhost:5050) |

Main pages: `/login.html`, `/register.html`, `/teacher-login.html`, `/src/teacher_coop/teacher_coop.html`, `/department-head-login.html`, `/src/department_head/department_head.html`, `/staff-login.html`, `/src/department_staff/department_staff.html`, `/src/student_coop/student_coop.html`, `/src/mentor_coop/mentor_verify_user.html`, `/src/recruit_student/recruit_student.html`, `/src/recruit_student/recruit_verify_email.html`. Email-verification links require a current authorized token; do not record/reuse tokens.

Teacher login uses existing `/api/teachers/auth/login` and `/me` APIs. Project-advisor lists/decisions use `/api/teachers/project-advisor-requests`; status filters are pending (default), confirmed and rejected. Separate Teacher sessionStorage preserves the Student session. Local password login and authenticated Student -> Teacher -> Student read-back have now passed with existing faculty; real browser acceptance remains pending.

Teacher **อนุมัติคำร้องสหกิจ** uses existing `/api/teachers/coop-requests` list/detail and `/:id/approve|reject` APIs. Only the authenticated Student class advisor (`advisor_teacher_id`) may decide `advisor_review`; approval stops at `department_head_review`, rejection requires a persisted history reason. Project-advisor identity grants no request approval authority. Shared confirmation/toast/loading and server refresh are used. [Class Advisor Chrome checklist](docs/TEACHER_CLASS_ADVISOR_MANUAL_ACCEPTANCE.md) tracks the pending browser acceptance.

Head login/profile and request actions use existing `/api/department-head` APIs and the Teacher session. Backend requires a live active Teacher with `is_department_head=true` and valid department scope; position/name/email/client flags do not authorize. Only `department_head_review` can become `approved` or `rejected`; named Class approval history is shown and successful decisions reload server state. See [Head Chrome checklist](docs/DEPARTMENT_HEAD_COOP_REQUEST_MANUAL_ACCEPTANCE.md) for authorized account preparation and pending browser acceptance. The request dashboard does not imply all Head menus are complete.

Staff **จัดการเอกสาร** uses existing password login/live Staff guards and a separate session. `/api/staff/document-requests` supplies eligible request search/list/detail; request-owned documents use frozen snapshots, optimistic versions, revisions and authenticated preview/download. The new Company Response form records acceptance/rejection and reasoned corrections with history. Placement creation requires completed Cooperation Letter processing and persisted acceptance; corrections are locked once a Placement draft exists. Both letters remain development HTML and do not set `document_issued`. Schema 016 Cooperation Letter processing remains available before 017 rollout. Official templates/PDF are pending. See [Company Response / Placement acceptance and Chrome checklist](docs/COMPANY_RESPONSE_PLACEMENT_ACCEPTANCE.md).

Local credentials are provisioned explicitly with `npm run dev:teacher-credential` (or `-- restore`). It requires `NODE_ENV=development`, an existing active `TEACHER_TEST_ID`, environment-supplied `TEACHER_TEST_EMAIL` / `TEACHER_TEST_PASSWORD`, and an absolute `TEACHER_TEST_BACKUP_PATH` outside the repository. It updates only email/password hash through the Teacher bcrypt hook, preserves faculty/name/privilege/timestamps, records original values before writing, and refuses stale restore. It never inserts Teachers, changes migrations or runs automatically in production/startup. Current Local account/private recovery instructions and the pending Chrome checklist are in [Teacher manual acceptance](docs/TEACHER_PROJECT_ADVISOR_MANUAL_ACCEPTANCE.md); no plaintext password is stored in the repository.

## Database migrations

**Historical persistent Local verification: 17 executed, through 016**, on 2026-10-07. That session had zero pending migrations at that time. The checkout now includes 017–021; no persistent rollout occurred in the supervision/calendar sessions. This includes 001–009, 007a and 010–016. Historical authorized migration 016 added two tables while preserving earlier application data.

Those are historical persistent counts. On 2026-10-08 migration 017 was verified through apply/rollback/reapply on isolated disposable PostgreSQL: 18 executed / 0 pending there. It has not been applied to existing Local/staging/production databases; their current counts were not inspected by this verification.

| Migration | Purpose |
| --- | --- |
| 007a | Conditional missing-base-table creation; does not repair arbitrary existing schema drift |
| 008–009 | Resume extraction metadata; request Company/Job links |
| 010 | Preserve one canonical StudentFile storage-path UNIQUE, remove redundant equivalent constraints |
| 011 | Explicit Head privilege and role review/audit tables |
| 012 | Persist prerequisite snapshots and direct Advisor -> Head request workflow |
| 013 | CoopProject topic and one current Book/Poster per Student/category |
| 014 | Immutable project-advisor request/history and Teacher confirmation |
| 015 | Dedicated CompanyEvaluation, one editable row per Student |
| 016 | Request-owned documents, frozen snapshots, versions, generated dev content and Staff revision/audit history |
| 017 (disposable verified; persistent rollout pending) | Request-owned Company Responses, generated Cooperation Letter evidence, immutable correction history; Placement reuses 016 document tables |
| 018 (disposable verified; persistent rollout pending) | Daily logs, immutable weekly submission/review snapshots, events and separate Mentor review capabilities |
| 019 (persistent rollout pending) | Supervision appointments, immutable version history, hash-only single-use confirmation capabilities; composite request/Mentor ownership FKs |
| 020 (disposable verified; persistent rollout pending) | Supervision results/images/revisions, exact two-image completion, immutable evidence, version/identity constraints and appointment protection |
| 021 (disposable verified; persistent rollout pending) | Coop activities and immutable named history; publication/private notes, idempotency keys, active duplicate index, protected cancellation/version transitions and populated rollback refusal |

Important FK/unique constraints were checked on Local. StudentFile storage has exactly one canonical storage-path UNIQUE; required Resume/project-category uniqueness remains present. A previous StudentFile fingerprint anomaly is unresolved and outside current scope. The full audit's read-only baseline/final comparison matched all 20 application tables, including three StudentFiles and their current aggregate fingerprint; no rows or files were changed.

Historical Local verification recorded zero Staff accounts, one authorized Head flag on existing faculty **ผศ.ดร.ขนิษฐา นามี**, and 23 Teachers. These counts were not rechecked in this session. Temporary Head acceptance credentials were restored then; manual login needs authorized provisioning with the existing helper. Runtime authority uses the live DB flag and department scope. Current VM migration/schema/availability was not inspected.

## Testing and acceptance

The earlier full repository audit recorded backend **210 passed** / frontend **96 passed + 1 browser skip**, and NLP **14 passed / 2 failed**. Role/document continuations have newer regression, build and Local acceptance evidence in HANDOFF. The NLP limitation is unchanged. Integration checks use guarded disposable databases; real browser evidence is tracked separately.

The two NLP chatbot tests use `TestClient(app)` without entering FastAPI lifespan, leaving the classifier untrained. They remain failing; no source/test fix was made. A running document question also returned a different low-confidence intent and fallback, so endpoint HTTP 200 is not an intent-quality PASS.

```powershell
# Existing isolated backend runner; never point integration tests at persistent Local:
powershell -NoProfile -File backend/test/runIsolatedWorkflow.ps1

# Frontend: provide a guarded disposable COOP_UI_DISPOSABLE_DATABASE_URL
# to include SQL acceptance; otherwise those optional tests skip:
node --test --test-isolation=none frontend/test/*.test.js

npm.cmd --prefix frontend run build -- --configLoader native
git diff --check
```

The existing backend runner does not configure every newer evaluation/advisor/project opt-in. Full current acceptance needs their dedicated disposable URLs and 013/014/015 safety markers; the audit used those additional settings. Never enable `RECRUITMENT_INTEGRATION_TEST` against a persistent DB: the legacy test relies on the configured target rather than a strong disposable-name guard.

NLP tests require installed dependencies and the test directory: `python -m pytest -q -p no:cacheprovider`. The standard NLP image does not include tests; the audit mounted source/tests/FAQ read-only into a disposable, network-disabled container.

The initial audit did not run Chrome. Later disposable sessions verified password login, Staff documents, Daily/Mentor review, supervision/results and the activity calendar with real Chrome. Broader profile/project/native preview acceptance and live company/Mentor inbox acceptance remain pending; see the current verification section and the preserved reports.

## Known limitations and deployment boundary

- Matching and published-job prefill/create check published status but omit expiry eligibility. Current Local has 20 published jobs and none expired, which does not remove the source defect.
- A request can be submitted without a class advisor; an incomplete/unknown major is rejected by prerequisite normalization. Missing class-advisor linkage can strand review authority. No change was made.
- Resume storage/extraction is implemented, but final extraction-status persistence can still return 500 after upload metadata commit; the fixed invariant retains the committed physical file.
- FAQ guidance still needs alignment with development-only documents, implemented weekly log review and pending persistent rollout.
- Authentication/project/evaluation projections avoid password hashes, verification secrets and absolute storage paths. Profile/image responses still return an owner-relative `profile_image` storage reference; `/health/db` can expose a raw DB error message on failure. These need review before production.
- Student login/register and Mentor resend lack the dedicated route rate limits found on role login/recruitment. Student JWTs are stored in localStorage. No observed compromise is claimed.
- Compose/Dockerfiles use Vite, nodemon and Uvicorn reload for development, publish DB/pgAdmin/API/NLP ports, and retain pgAdmin development credential defaults. Only PostgreSQL has a Compose healthcheck.
- `deploy.sh` exists and automatically applies pending migrations. It is not a read-only start/status command and was not executed. No Nginx configuration or current HTTPS/domain setup is supplied in this checkout; previous Nginx/VM success is historical evidence.

Production needs separately planned role UI/workflow completion, provider/browser acceptance, runtime/security configuration, HTTPS, backups/restore verification and deployment validation. No deployment is authorized by this README or the completed audit.

## Documentation

[HANDOFF_fitm-intern.md](./HANDOFF_fitm-intern.md) is the authoritative audit/resume point. Its top section supersedes historical migration counts, Staff-approval rules, Head direct project-advisor assignment and old topic/file/evaluation placeholder descriptions. [Tomorrow's review](docs/NEXT_DAY_DEVELOPMENT_REVIEW.md) lists this session's files, tests and manual steps.

## Project Development Status

**Last verified date:** 2026-10-09 Asia/Bangkok. **Phase:** independent Department Staff activity calendar, preserving previous supervision/log/document workflows. Official supervision PDF and academic scoring remain separate blocked phases. The table is based on current source and actual acceptance runs.

Migration files present: `001_create_companies.js`, `002_create_job_submissions.js`, `003_create_job_postings.js`, `004_create_job_posting_work_modes.js`, `005_create_company_access_tokens.js`, `006_add_company_job_indexes_and_checks.js`, `007_create_department_staffs.js`, `007a_create_missing_base_tables.js`, `008_add_resume_extraction.js`, `009_add_coop_request_company_job_links.js`, `010_cleanup_student_file_schema_drift.js`, `011_add_role_workflow_reviews.js`, `012_coop_prerequisites_and_direct_review.js`, `013_add_coop_projects_and_current_files.js`, `014_add_coop_project_advisor_requests.js`, `015_add_company_evaluations.js`, `016_add_coop_documents.js`, `017_add_company_responses.js`, `018_add_internship_logs.js`, `019_add_supervision_appointments.js`, `020_add_supervision_results.js`, `021_add_coop_activities.js` (22 files including 007a).

| Environment | Migration execution state |
|---|---|
| Owned disposable PostgreSQL | 22 executed / 0 pending through 021; empty UP/DOWN/reapply, injected DDL rollback and populated rollback refusal passed |
| Existing Local | Not modified or inspected this session; historical ledger through 016 only; 017–021 rollout remains pending |
| Staging / production | Not accessed; current execution state unknown |

**Actual calendar-session verification:** full disposable Backend **357 PASS / 0 FAIL / 0 SKIP**; Frontend with actual SQL bridges **215 PASS / 0 FAIL / 1 existing Student-prerequisite browser SKIP**. Calendar PostgreSQL **13 PASS / 0 FAIL / 0 SKIP** (12 scenarios + parent), frontend calendar/controller tests **10 PASS**. Real Chrome calendar **13 PASS**, existing Staff documents **12 PASS**, supervision scheduling/results **24 PASS**, each with **0 FAIL / 0 SKIP**. Build **13 HTML entries / 121 modules PASS**, syntax **238 JS files PASS**, PowerShell parser **0 errors**, diff check PASS. See the [review report](docs/NEXT_DAY_DEVELOPMENT_REVIEW.md) for final logs and limits. Counts overlap and must not be summed.

Calendar APIs use `/api/coop-activities`: Staff `GET/POST /staff`, `GET/PUT /staff/:id`, `POST /staff/:id/cancel`; Student `GET /student` and `/student/:id`. Activity title/category/start/end/status are required; descriptions, locations, https meeting links and separate private Staff notes are optional. All dates display as Asia/Bangkok; API date inputs require +07:00 and end after start. Draft publication is explicit. Published activities cannot return to draft; cancellation keeps previously published information visible with a canceled label. Canceled drafts stay private. Edits and cancellation require the current version and a Staff-only reason. Actor identities come from live authenticated accounts. Idempotent creation retries reuse `creation_key`; normalized identical title/start/end conflicts across active activities. There is no automatic attendance policy, academic deadline, supervision merge, public history or private Student-data projection. Categories are descriptive labels, not academic rules. No existing Staff department/term/cohort relationship was available to reuse, so no invented scope was added.

**Historical supervision-session verification:** Backend 344 PASS; Frontend 205 PASS / 1 existing SKIP; result SQL 21 PASS; scheduling/results Chrome 24 PASS; Daily/Mentor and Staff Chrome 12 PASS each. Those earlier counts remain historical evidence.

Teacher result APIs reuse `/api/supervision`: `GET/PUT /teacher/students/:id/appointments/:appointment/visits/:visit/result`, `POST .../complete`, authenticated `GET .../images/:image`. Student `GET /student/appointments/:appointment/visits/:visit/result` and its image route expose only completed results/current images. Teacher reads revisions and old evidence. A confirmed appointment is required before the first draft; drafts can omit fields/images. Completion requires an actual visit date, descriptive outcome and both images. PNG/JPEG uploads are limited to 5 MB each and checked by extension, MIME, byte signature and size. Atomic draft uploads retain committed historical evidence and clean staged files after rollback. All identity/context comes from the saved canonical appointment. Starting a result protects that appointment from rescheduling; cancelled placements freeze further result writes while preserving history. No numeric rubric or official report wording is invented.

Statuses: VERIFIED = complete behavior for that requirement with relevant acceptance actually passed; IMPLEMENTED / NEEDS VERIFICATION = connected source with required acceptance still incomplete; PARTIAL = missing part of the requirement; UI ONLY = placeholder; NOT STARTED = absent; BLOCKED = named prerequisite missing. No overall completion percentage is inferred. Broader requirements stay PARTIAL even if one subflow passes.

### Full Requirements Status Matrix

| Requirement ID | Role | Feature | Status | Evidence / Implemented Files | Remaining Work |
|---|---|---|---|---|---|
| 2.3.1.1 (1) | Student | Email/password registration/login + Google OAuth | PARTIAL | `backend/src/controllers/auth.controller.js`, `frontend/src/pages/login.js`, `register.js`; password login in Chrome fixtures | Google OAuth placeholder; verify registration browser flow |
| 2.3.1.1 (2) | Student | Personal/academic/family/emergency/class advisor/skills profile | IMPLEMENTED / NEEDS VERIFICATION | `studentProfile.controller.js`, Student/Profile models, `student_coop.js` | Full profile fields and provider/file browser acceptance |
| 2.3.1.1 (3) | Student | Resume upload | IMPLEMENTED / NEEDS VERIFICATION | `upload.middleware.js`, `studentProfile.controller.js`, `resumeText.service.js`, upload tests | Native browser replacement/extraction and live OCR acceptance |
| 2.3.1.1 (4) | Student | Resume-based company/job recommendations | PARTIAL | `jobMatching.controller.js`, `nlpMatching.client.js`, NLP matching; `jobMatching.test.js` | Published job expiry eligibility; end-to-end NLP/browser acceptance |
| 2.3.1.1 (5) | Student | Create/cancel Coop Request | IMPLEMENTED / NEEDS VERIFICATION | `coopRequest.controller.js`, request/course/delivery models; SQL/DOM regressions | Full real Chrome create/cancel through Student form |
| 2.3.1.1 (6) | Student | Track request/cooperation/placement status | PARTIAL | `student_coop.js`, request history/company-response read-back; Staff document APIs | Student cooperation/placement artifact status read-back; official issuance |
| 2.3.1.1 (7) | Student | Manage project advisor | PARTIAL | `coopProjectAdvisor.service.js`, migration 014, Student/Teacher pages and SQL bridge | Confirmed replacement policy/flow; complete Chrome request decision |
| 2.3.1.1 (8) | Student | Verify/acknowledge confirmed project advisor | PARTIAL | `student_coop.js` confirmed-advisor display, request read-back | Persisted explicit Student acknowledgement |
| 2.3.1.1 (9) | Student | Manage examination/project topic | IMPLEMENTED / NEEDS VERIFICATION | `studentCoopProject.service.js`, `coopProject.model.js`, project tests | Native browser topic acceptance; topic is independent of advisor confirmation |
| 2.3.1.1 (10) | Student | Record Mentor email/name/position | IMPLEMENTED / NEEDS VERIFICATION | `mentor.controller.js`, `mentor.model.js`, Student Mentor form | Complete Student CRUD/resend browser acceptance and intended-recipient SMTP |
| 2.3.1.1 (11) | Student | Daily work logs + compiled internship logbook | PARTIAL | Migration 018, `internshipLog.service.js`, `studentInternshipLog.js`, SQL/Chrome evidence | Full logbook compilation/export; weekly review has no numeric rubric |
| 2.3.1.1 (12) | Student | Evaluate company/workplace | IMPLEMENTED / NEEDS VERIFICATION | Migration 015, `companyEvaluation.service.js`, `studentCompanyEvaluation.js`, real SQL/DOM bridge | Native Chrome save/edit/read-back |
| 2.3.1.1 (13) | Student | Upload Project Book | IMPLEMENTED / NEEDS VERIFICATION | `studentCoopProject.service.js`, private authenticated file routes, SQL/DOM tests | Native browser upload/preview; this is not final assessment |
| 2.3.1.1 (14) | Student | Upload Poster | IMPLEMENTED / NEEDS VERIFICATION | Same private project-file service, signature/MIME/ownership tests | Native browser PDF/image preview |
| 2.3.1.1 (15) | Student | Documentation/procedure chatbot | PARTIAL | `nlp-service/app` FAQ endpoint; `frontend/src/pages/index.js` placeholder | NLP lifespan/intent tests and authenticated Express/UI bridge |
| 2.3.1.1 (16) | Student | Search workplaces | IMPLEMENTED / NEEDS VERIFICATION | `coopRequest.controller.js`, company search and frontend matching/search adapters | Complete real browser search/filter acceptance |
| 2.3.2 (1) | Staff | Track requests/cooperation/placement | PARTIAL | `staffDocuments.service.js`, `staffDocuments.js`, `staffCoopRequests.js` all-state request tracking; historical document SQL/Chrome | Current all-state tracking browser acceptance; persistent rollout |
| 2.3.2 (2) | Staff | Cancel eligible requests | IMPLEMENTED / NEEDS VERIFICATION | Existing `roleWorkflow.service.js` API, `staffCoopRequests.js`, shared reason modal, current backend/DOM tests and build; [acceptance](docs/STAFF_COOP_CANCELLATION_ACCEPTANCE.md) | New PostgreSQL/race/rollback and real Chrome acceptance blocked by Docker permission; no new migration |
| 2.3.2 (3) | Staff | Manage cooperation/placement letters | PARTIAL | Migrations 016/017, frozen document revisions, HTML preview/download/history | Approved official templates/PDF and issuance/reissuance policy |
| 2.3.2 (4) | Staff | Document-status chatbot | NOT STARTED | No authenticated document-status chatbot service/UI | Owner/role-scoped status query and UI |
| 2.3.2 (5) | Staff | Manage workplace information | PARTIAL | Recruitment publish/reject in `roleWorkflow.service.js`, job review models | Company CRUD administration UI and corresponding backend |
| 2.3.2 (6) | Staff | Coop activity calendar | VERIFIED | Migration 021; `coopActivity.service.js`, `coopActivities.routes.js`, `coopActivities.js`; real SQL/Chrome acceptance, Staff monthly/list and Student read-only views | Separately authorized persistent migration rollout; real deployment acceptance |
| 2.3.2 (7) | Staff | Manage Teacher information | NOT STARTED | Existing Teacher administration endpoints are Head-only | Staff-scoped authorized administration and UI |
| 2.3.2 (8) | Staff | Manage all Student scores | BLOCKED | No academic score model/workflow | Supplied grading rubrics/maxima and scoring policy; Staff score UI |
| 2.3.3.1 (1) | Teacher | Select Students for supervision/project advising | PARTIAL | Explicit project-advisor request acceptance; `coop_advisor_teacher_id` drives supervision | Independent Teacher student-selection/supervision assignment flow |
| 2.3.3.1 (2) | Teacher | Confirm project advisor relationship | IMPLEMENTED / NEEDS VERIFICATION | Migration 014, advisor service, `teacherCoop.js`, SQL/DOM tests | Real Chrome Student request → Teacher decision → Student read-back |
| 2.3.3.1 (3) | Teacher | Search companies and Students | PARTIAL | Active company search; own class/project queues and paged supervision list | Full Teacher search UI/scoped backend |
| 2.3.3.1 (4) | Teacher | Schedule supervision visits 1–2 | VERIFIED | Migration 019, `supervision.service.js`, `supervision.routes.js`, `teacherSupervision.js`; PostgreSQL 20 / Chrome 13 PASS | Separate persistent rollout; visit results/photos are separate requirements |
| 2.3.3.1 (5) | Teacher | Verify Mentor information before supervision | VERIFIED | Live verified Mentor/stamp validation and Teacher review checkbox, frozen identity; SQL/Chrome PASS | Incorrect personal details require correction/reverification |
| 2.3.3.1 (6) | Teacher | Manage substitute Mentor for unavailable original | VERIFIED | Per-appointment nomination/name/email/position/reason; recipient-only capability/history; SQL/Chrome PASS | Intended-recipient SMTP acceptance; global Mentor reassignment is separate |
| 2.3.3.1 (7) | Teacher | Visit 1 result + two photos | VERIFIED | Migration 020, `supervisionResult.service.js`, `supervisionResult.js`; result SQL 21 / combined Chrome 24 PASS | Separate persistent rollout; official PDF is (8) |
| 2.3.3.1 (8) | Teacher | Visit 1 individual PDF with identity/photos/signature names | BLOCKED | Result/photo data retained; no approved university supervision PDF template | Approved template and authorized PDF rendering/signature policy |
| 2.3.3.1 (9) | Teacher | Visit 2 result + two photos | VERIFIED | Same scoped result/image/revision architecture; independent visit 2 SQL/Chrome PASS | Separate persistent rollout; official PDF is (10) |
| 2.3.3.1 (10) | Teacher | Visit 2 individual PDF with identity/photos/signature names | BLOCKED | Result/photo data retained; no approved university supervision PDF template | Approved template and authorized PDF rendering/signature policy |
| 2.3.3.1 (11) | Teacher | Evaluate Students | BLOCKED | No final Teacher assessment workflow | Defined rubric/maxima and authorized evaluation persistence/UI |
| 2.3.3.1 (12) | Teacher | Evaluate workplaces | NOT STARTED | Student workplace feedback is a separate owner-scoped service | Teacher criteria, authorized workplace evaluation and UI |
| 2.3.3.1 (13) | Teacher | Visit 2 Student evaluation | BLOCKED | Visit 2 descriptive result implemented; no academic assessment model | Supplied rubric/maxima and authorized assessment flow |
| 2.3.3.1 (14) | Teacher | Evaluate logbook/Book/work/Poster/examination | BLOCKED | Private Book/Poster uploads are prerequisites only | Rubrics/maxima, logbook compilation and chair + two committee workflow |
| 2.3.3.1 (15) | Teacher | Personal account management | PARTIAL | Password login and safe GET profile; Teacher page display | Teacher self-edit API/UI (Head self-edit is distinct) |
| 2.3.3.1 (16) | Teacher | Approve/reject Coop Requests | IMPLEMENTED / NEEDS VERIFICATION | Canonical Class Advisor API, `teacherCoopRequests.js`, SQL/DOM regression | Full real Chrome decision acceptance; project advisor grants no Class authority |
| 2.3.3.2 (1) | Head | Search Teachers | PARTIAL | Head-only department-scoped Teacher search API and SQL tests | Head Teacher search dashboard |
| 2.3.3.2 (2) | Head | Search Coop Students | PARTIAL | Department-scoped request list/search in role workflow service | Dedicated Student directory/search UI |
| 2.3.3.2 (3) | Head | Assign Coop advisors | BLOCKED | Existing direct assignment returns 409; explicit Student/Teacher confirmation is canonical | Define Head nomination/assignment policy compatible with accepted relationships |
| 2.3.3.2 (4) | Head | Manage Teachers | PARTIAL | Scoped PATCH Teacher with bcrypt hook and live DB Head flag | Head management dashboard and browser acceptance |
| 2.3.3.2 (5) | Head | Personal account management | PARTIAL | Head GET/PATCH profile service/API | Profile editing dashboard and browser acceptance |
| 2.3.3.2 (6) | Head | Approve/reject requests | IMPLEMENTED / NEEDS VERIFICATION | `departmentHead.js`, canonical department_head_review transitions, SQL/DOM tests | Real Chrome Head decision UI acceptance |
| 2.3.4 (1) | Company | Public jobs/contact/location/category/vacancies/allowance/modes/days/CAPTCHA | IMPLEMENTED / NEEDS VERIFICATION | `jobSubmission.service.js`, recruitment validator/Turnstile, transactional jobs/modes; public form | Live Turnstile/SMTP/browser acceptance and publication UI |
| 2.3.4 (2) | Company | Manage own company information | NOT STARTED | Submission/email verification are not an owner management portal | Scoped Company management capability/account, CRUD/UI |
| 2.3.4 (3) | Company | Verify company information | PARTIAL | Company email verification/lifecycle APIs and tests | Company profile verification policy and real inbox acceptance |
| 2.3.5.1 (1) | Mentor | Review/evaluate daily logs as weekly batches | PARTIAL | Migration 018, weekly Mentor feedback/revision UI and SQL/Chrome tests | Numeric weekly evaluation requires supplied rubric; SMTP/rollout pending |
| 2.3.5.1 (2) | Mentor | Verify personal information | VERIFIED | `mentorToken.service.js`, verification controllers/page; original single-use confirmation and Daily Chrome regression PASS | Real intended-recipient SMTP remains unverified |
| 2.3.5.1 (3) | Mentor | Confirm personal information for supervision appointments | VERIFIED | Appointment-scoped identity checkbox, hash-only/versioned single-use link, `mentorSupervision.js`; SQL/Chrome PASS | Real SMTP and separate persistent rollout |
| 2.3.5.1 (4) | Mentor | Verify substitute Mentor for supervision | VERIFIED | Teacher nomination + substitute recipient's explicit identity/named appointment confirmation; SQL/Chrome PASS | Real SMTP and separate persistent rollout |
| 2.3.5.1 (5) | Mentor | Attendance/behavior/absence/leave/lateness | PARTIAL | Student nonworking reasons only in daily logs | Mentor attendance/behavior recording; no invented penalties |
| 2.3.5.1 (6) | Mentor | Final Student/Book/work/Poster evaluation | BLOCKED | Weekly feedback is separate from final assessment | Defined Mentor rubric/maxima and final evaluation workflow |
| 2.3.6.1 | Academic | Total score: Mentor weekly 20% + final 30%; department Book 10% + Poster 5% + overall work/content 25% + examination 10%, chair + two members | BLOCKED | Exact proportions documented; no invented score engine or committee weighting | Supplied rubrics/maxima/committee aggregation; final assessment sources, assignment and total calculation |

### Additional Development Summary

| Date | Feature | Implementation | Tests | Database Migration | Notes |
|---|---|---|---|---|---|
| 2026-10-07 | Advisor/Class/Head/Staff document workflows | Canonical request approval, advisor confirmation, dev cooperation snapshots | Historical reports retained in HANDOFF | Through 016 historically Local | Original faculty/private storage preserved |
| 2026-10-08 (earlier session) | Company Response / Placement | Persisted acceptance before Placement; dev HTML/history | Historical 268 Backend / 175 Frontend / 12 Staff Chrome | 017 disposable only | No official PDF |
| 2026-10-08 (earlier session) | Daily Log / weekly Mentor review | Daily entries, immutable weekly snapshots/revisions/feedback | Historical 293 Backend / 184 Frontend / 12 Daily Chrome | 018 disposable only | No logbook compilation or numeric assessment |
| 2026-10-08 (earlier session) | Supervision appointments 1–2 | Teacher scheduling/reschedule/history; original/substitute scoped identity confirmation; Student read-back | Historical Backend 320 / Frontend 194 (+1 skip); supervision SQL 20 / Chrome 13 | 019 disposable only | Foundation reused by results |
| 2026-10-08 (previous session) | Supervision results 1–2 | Descriptive drafts/completion, exactly two private images, retained revisions, Student read-only view | Backend 344 / Frontend 205 (+1 skip); result SQL 21 / combined Chrome 24; Daily/Staff Chrome 12 each | New 020, disposable only | No persistent DB changes; official PDF/scoring pending |
| 2026-10-09 | Staff activity calendar — 2.3.2 (6) | Monthly/list views, create/edit/publish/cancel, immutable private history and Student publication visibility | Calendar SQL 13 / frontend 10 / Chrome 13; Staff Chrome 12 / supervision Chrome 24 | New 021, disposable only | Persistent database untouched; no commit/push/deploy |
| 2026-10-09 (current) | Staff request cancellation — 2.3.2 (2) | Search/detail/history, required reason and shared confirmation, stale status/timestamp checks, Student saved reason | Backend 144 PASS/17 SKIP; Frontend 231 PASS/2 SKIP; build PASS; current SQL/Chrome NOT VERIFIED | No migration/schema/data change | Docker access denied; no commit/push/PR/deploy |

### Remaining Tasks

- [x] Visit 1/2 result entry, exactly two private supporting photos, role-scoped read/edit and immutable history — 2.3.3.1 (7)/(9).
- [ ] Separately authorized 017–021 persistent rollout after backup/schema review; intended-recipient Mentor SMTP acceptance.
- [ ] Compile/export internship logbook — remaining portion of 2.3.1.1 (11).
- [x] Independent Staff activity calendar — 2.3.2 (6), including Student read-only published activities.
- [x] Staff request-cancellation UI — 2.3.2 (2), implemented with executable unit/DOM coverage.
- [ ] New cancellation PostgreSQL/race/rollback/Student-readback and real Chrome acceptance; Company/Teacher administration dashboards and account editing.
- [ ] Supply official letter/supervision templates before PDF issuance.
- [ ] Supply academic/weekly/final rubrics, maxima and committee aggregation rules before score calculation.
- [ ] Resolve Head advisor assignment policy, Google OAuth, Company owner portal, chatbot bridge/quality and incomplete browser/provider acceptance shown above.

**Known limits:** existing Local cannot use new migrations until separate authorized rollout; appointment confirmation proves mailbox capability possession plus explicit identity acknowledgement, and does not certify attendance. Confirmation links expire after seven days or at appointment time. Appointment edits require a future existing appointment/current version/reason and are blocked once a result exists. Completed results are immutable; post-completion correction and cancellation workflows require separately defined policy. Incorrect personal details require Teacher correction/reissue or original Mentor reverification before recording. Official PDFs, numeric grading and global Mentor reassignment remain pending. The independent activity calendar does not merge private supervision appointments. Next task: finish Staff cancellation disposable PostgreSQL and real Chrome acceptance when Docker access is available; no current VERIFIED claim.

</details>

## Google Login setup and configurable domains — 2026-10-11

<details>
<summary>Historical setup เท่านั้น — migration/test commands และ Login/linking/onboarding status ด้านล่างถูกแทนที่แล้ว ห้ามใช้เป็น setup ปัจจุบัน</summary>

ใช้ Authentication / Google OAuth Development Configuration / Database ด้านบนและ Handoff สำหรับ workflow ปัจจุบัน; เก็บรายละเอียด/ลิงก์ต้นฉบับด้านล่างเพื่อประวัติ ไม่ใช่คำแนะนำให้เปลี่ยน flags/domains หรือรัน runner ที่ถูกลบ.

Source รองรับ GIS Google Login สำหรับ Student, Teacher, Department Head และ Staff; ตอนนี้ยังปิดใน environment เดิม ดู [Acceptance Report](docs/audits/FITM_GOOGLE_OAUTH_ALL_ROLES_IMPLEMENTATION.md) สำหรับ PASS/BLOCKED/NOT TESTED และ [Prepared Migration/Policy](backend/src/db/prepared/google-oauth/README.md) สำหรับสิ่งที่ต้องอนุมัติ

1. อนุมัติและติดตั้ง **prepared 026 เท่านั้น** หลัง backup/restore verification; ไฟล์อยู่นอก Umzug discovery ห้ามใช้การรัน pending migrations ทั้งหมดแทน ไม่ต้องติดตั้ง 019–021 เพื่อเปิด Google Login
2. จัดเตรียม Google Cloud OAuth client แบบ Web และ Authorized JavaScript Origins ให้ตรง `FRONTEND_URL` (HTTPS หรือ localhost HTTP สำหรับ development) ใส่เฉพาะ Client ID ใน backend configuration ไม่ต้องใช้ client secret สำหรับ GIS flow นี้
3. ตั้ง `GOOGLE_ALLOWED_EMAIL_DOMAINS=kmutnb.ac.th,email.kmutnb.ac.th`, `GOOGLE_HOSTED_DOMAIN_POLICY=required`, `GOOGLE_ALLOWED_HOSTED_DOMAINS=kmutnb.ac.th`; ยืนยันค่า `hd` จากบัญชีมหาวิทยาลัยจริงก่อน rollout หากองค์กรมี `hd` ต่างจาก email domain ให้ใส่ค่า `hd` จริงแยกกัน `email_only` อนุญาตเฉพาะตาม email domain แต่ไม่ยืนยัน Workspace ownership
4. หลัง schema/config พร้อมตั้ง `GOOGLE_LOGIN_ENABLED=true`; ตั้ง `GOOGLE_ACCOUNT_LINKING_ENABLED=true` เฉพาะหลังอนุมัติ ownership policy การผูกบัญชีต้องยืนยัน Google และรหัสผ่านบัญชีเดิม ไม่มี email auto-link ไม่มีการสร้าง Teacher/Staff อัตโนมัติ
5. Restart backend ตามวิธี deploy ที่ได้รับอนุญาต แล้วใช้แต่ละ role portal; Frontend อ่าน Client ID จาก `/api/auth/google/config` Student ใช้ Remember Me เดิม Teacher/Head/Staff ใช้ sessionStorage ไม่มีการเพิ่มอายุ JWT

เพิ่มหรือลด domain โดยแก้ comma-separated backend allowlist แล้ว restart backend; เช่นเพิ่มโดเมนที่ได้รับอนุมัติจริงต่อท้ายรายการโดยไม่แก้ business logic ไม่มี wildcard/subdomain inheritance รายการว่างหรือผิดรูปแบบจะปิดการ Login แบบ fail closed บัญชีที่ผูกแล้วต้องผ่าน policy ปัจจุบันทุกครั้ง

Optional role lists: `GOOGLE_ALLOWED_EMAIL_DOMAINS_STUDENT`, `_TEACHER`, `_DEPARTMENT_HEAD`, `_DEPARTMENT_STAFF` ต้องอยู่ใน global list ด้วย ใช้เพื่อจำกัด domain ของ role ที่ได้รับสิทธิ์จาก DB อยู่แล้ว ไม่ใช้ domain กำหนด role

Google-only นักศึกษาใหม่ยัง BLOCKED: ต้องอนุมัติวิธียืนยัน Student ID และ nullable-password/email/model contract ก่อน API onboarding จึงตอบ 503 โดยไม่สร้างข้อมูล บัญชีเดิมที่ไม่มี password ต้องมี administrator-assisted policy ที่ได้รับอนุมัติ ไม่มี endpoint ข้าม ownership check

ทดสอบ source โดยไม่แก้ Development DB:

```powershell
cd backend
node --test test/*.test.js
node scripts/runGoogleOAuthIntegration.js # creates/removes a fresh synthetic PostgreSQL container only
cd ../frontend
node --test test/*.test.js
npm.cmd run build -- --configLoader runner
cd ../backend
node scripts/verifyGoogleLoginBrowser.js # native Edge with MOCK Google/API; not provider E2E
```

Google E2E จริงยัง NOT TESTED และห้ามตีความผล mock/RSA/isolated SQL เป็น production acceptance

</details>
