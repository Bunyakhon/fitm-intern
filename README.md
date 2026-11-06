# FITM-INTERN (CoopConnect)

แพลตฟอร์มจัดการสหกิจศึกษา สำหรับ Student (`co_op`), Teacher/Class Advisor, Department Head, Department Staff, Company และ Mentor. ใช้ Frontend แบบ multipage, Backend API, PostgreSQL และ NLP/PDF/OCR service; Developer Console เป็นเครื่องมือ Local แยกจากเว็บไซต์หลัก.

## รายวิชาก่อนออกสหกิจ / ความเห็นหัวหน้าภาควิชา — อัปเดต 7 พฤศจิกายน 2026

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

Declarationsปัจจุบัน: Vite ^8.2.2, Tailwind ^4.3.3, JavaScript multipage, Axios ^1.19.0; Express ^5.2.1, Sequelize ^6.37.8, pg/JWT/bcrypt. Dockerfilesใช้ Backend Node20 และ Frontend Node22; ไม่ query runtime patch versions รอบนี้. PostgreSQLตรวจจริง16.15. NLPใช้ Python3.11 image, FastAPI0.115.0, scikit-learn1.6.1, PyThaiNLP5.0.4, NumPy2.2.6, PyMuPDF1.24.14, pytesseract0.3.13, Pillow11.0.0 และ Tesseract tha+eng. เป็น classical NLPตามรายละเอียด Auditด้านบน; ไม่พบ embedding/LLM. Umzug/pytest/httpxไม่มีใน declarationsปัจจุบัน; package-lock.jsonถูกignoreเดิม จึงไม่รับรอง reproducible dependency resolutionจากSourceอย่างเดียว.

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
