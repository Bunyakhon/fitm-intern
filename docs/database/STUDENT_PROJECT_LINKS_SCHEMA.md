# Student Project Links — Prepared Additive Schema

วันที่เตรียม: 9 พฤศจิกายน 2026 (Asia/Bangkok). **Development intern_system/public ติดตั้งแล้วในงาน INSTALL COOP PROJECT LINKS วันที่9พฤศจิกายน2026; ดูหลักฐานใน HANDOFF_fitm-intern.md.** รอบแก้ URL/Frontend State ต่อมาตรวจเฉพาะตารางนี้แบบRead-only ไม่มีSchema/Data writes และ Runtime Acceptance ยังPENDING USER TESTING. Target อื่นยังไม่ยืนยัน; ไม่เพิ่ม migration runner/ledger และไม่ใช้ migrations เก่าของโครงการ.

## Scope / Preservation

Model `backend/src/models/coopProjectLink.model.js` เพิ่มตาราง `public.coop_project_links` แยกจาก StudentFile/CoopProject/CoopTopicDocument. ไม่มี column alteration/backfill/record update หรือการย้าย CO-09 URLs. Book/Poster upload/metadata/path/cleanup ไม่ใช้ตารางใหม่นี้.

| Column | Definition |
| --- | --- |
| student_id | UUID, FK students.id, ON UPDATE/DELETE CASCADE ตาม ownership ของข้อมูล Student, composite PK |
| category | VARCHAR(24), composite PK, project-book หรือ poster |
| document_url | VARCHAR(2000), NOT NULL, default empty string, HTTPS/empty CHECK |
| version | INTEGER, NOT NULL, default 1, positive CHECK |
| created_at / updated_at | TIMESTAMPTZ, NOT NULL, CURRENT_TIMESTAMP defaults |

Model/associations และ `coopProjectLinksIntegrity.js` เป็น definitions สำหรับ explicit model-driven initialization ตามโครงการ; import ไม่ apply DDL. SQL up/down เตรียมสำหรับ targeted installation ครั้งนี้ตามคำสั่งผู้ใช้เท่านั้น. ห้ามใช้ db:init/reset/sync/alter เพื่อทดลองฟีเจอร์นี้.

## Apply — สำหรับ Target ที่ได้รับอนุญาตและยังไม่ได้ติดตั้งเท่านั้น

ผู้รับผิดชอบต้องได้รับอนุญาตติดตั้งกับ target นั้นและตรวจ target/backup ก่อนดำเนินการเอง. SQL จำกัด PostgreSQL16 / database intern_system / current_schema public, มี transaction และ timeouts. ใช้ไฟล์จาก repository root:

```text
psql -X -v ON_ERROR_STOP=1 -h <approved-host> -p <approved-port> -U <approved-user> -d intern_system -f backend/src/db/coopProjectLinks.up.sql
```

ไม่ใส่รหัสผ่าน/tokenใน command/report. `up.sql` สร้างตารางใหม่ครั้งเดียว; ถ้ามีตารางชื่อเดียวกันแล้วให้หยุดตรวจ schema drift ไม่รันซ้ำโดยเดาหรือใช้ IF NOT EXISTS กลบความต่าง. ไม่มี grants/account changes หรือ startup auto-install.

เมื่อยังไม่มีตาราง GET/PUT project-links จะตอบ503 `PROJECT_LINKS_SCHEMA_NOT_READY` และ UI แสดง readiness error ไม่แสดง fake success. File upload/CO-09/Topic/Advisor เดิมไม่พึ่งตารางนี้. Development targetข้างต้นติดตั้งแล้ว ห้ามApplyซ้ำโดยเดา; หลังใช้Sourceชุดเดียวกันให้ผู้ใช้ทำManual Retest โดยไม่ถือDBverificationเป็นผลChrome/HTTP/PUTacceptance.

## Reverse ภายหลัง — ไม่ลบข้อมูลที่บันทึกแล้ว

```text
psql -X -v ON_ERROR_STOP=1 -h <approved-host> -p <approved-port> -U <approved-user> -d intern_system -f backend/src/db/coopProjectLinks.down.sql
```

Down ล็อกเฉพาะตารางใหม่, ปฏิเสธทันทีหากมีแถวใด ๆ (รวมแถวที่ URL ถูกล้าง), แล้วจึง DROP TABLE RESTRICT เมื่อว่างเท่านั้น. ไม่แตะตารางเดิม. หลังมีการใช้งานแล้ว การเก็บ/ย้อนคืนข้อมูลต้องเป็นงานรักษาข้อมูลที่อนุมัติแยกต่างหาก ไม่ bypass guard นี้. **ไม่ได้รัน down; up รันเฉพาะในงานติดตั้ง Development ก่อนหน้า ไม่รันซ้ำในงานแก้URL/Frontend State.**

## API / Concurrency

- GET `/api/student-coop/project-links/:category`: owning co_op Student, `{link:{category,document_url,version}}`, ETag `"n"`, private/no-store. ไม่มีแถวคืน URLว่าง/version0 โดยไม่ INSERT.
- PUT endpointเดียวกัน: strict `{document_url:string}`, required If-Match `"n"`. Student→Link lock, compare version, URL เปลี่ยนจึงเพิ่ม version; same URL เป็น no-op หลังตรวจ version. URLว่างล้างเฉพาะลิงก์ตามคำสั่งผู้ใช้ ไม่ลบไฟล์/record.
- 400 invalid payload/provider/category; 401/403 auth/ownership; 409 `PROJECT_LINK_CONFLICT`; 428 `PROJECT_LINK_REVISION_REQUIRED`; 503 schema readiness หรือ `PROJECT_LINK_COMMIT_UNCERTAIN`; 500 generic server error. DTO เตรียมก่อน commit ไม่มี follow-up read ที่เปลี่ยน acknowledged write เป็น failure.
- Session จาก JWT/live account access เดิม; ไม่รับ student_id/file_id ใน payload, ไม่เปิด IDOR และไม่เพิ่ม OAuth/API credentials.
- Book/Poster UIโหลดอัตโนมัติ ไม่มีปุ่มReloadแยก. GETfailureเก็บร่างและแสดงข้อความไทย; ปุ่มบันทึกลิงก์ใช้ลองGETใหม่ก่อนเมื่อยังไม่มีbaseline/มีread error โดยไม่ส่งPUTในคลิกนั้น. Conflict/uncertain writeยังต้องreconcileและยืนยันก่อนแทนร่าง ไม่retry PUTอัตโนมัติ.

## URL formats / Legacy

- Overleaf: HTTPS exact hosts `overleaf.com`, `www.overleaf.com`. ไม่จำกัด path เพิ่มเกินคำสั่ง ไม่ตรวจว่าเป็น project/publication จริง.
- Poster: HTTPS exact host `drive.google.com` เท่านั้น ทุก Path/Query โดยไม่บังคับ File ID, Folder ID หรือรูปแบบ Path. Placeholder `https://drive.google.com/...`; ไม่ได้ตรวจสิทธิ์ของเอกสาร.
- ใช้ URL parser ตรวจ protocol/hostname แบบตรงตัวและ canonicalize เฉพาะ explicit save; ไม่ใช้ substring/path regex. Reject non-HTTPS, username/password และ hostname ปลอม. URL limit2000รวมหลัง canonical URL serialization ตามSchemaเดิม; Frontend/Backend ตรวจตรงกัน ไม่ fetch URL.
- CO-09 ใช้ field/schema/If-Match/ETag/review/exam เดิม. เฉพาะ explicit URL save ใหม่ต้อง Overleaf; PDF upload ไม่ตรวจหรือแก้ URL เดิม. การบันทึก URL ยังใช้ pending/review reset ตาม flowเดิม ไม่เปลี่ยนตารางสอบ.
- Legacy CO-09 non-Overleaf: ไม่ backfill/normalize/save อัตโนมัติ; แสดงและเปิดได้หลัง safe HTTPS validation, ไม่ผ่านแสดง plain text. การกด Save legacy URLที่ไม่ใช่Overleafถูกปฏิเสธโดยยังเก็บค่าร่าง/ข้อมูลเดิม; ต้องเปลี่ยนเป็นOverleafหรือ explicitly clear ก่อนบันทึกใหม่.
- ตรวจรูปแบบ URL ไม่ใช่หลักฐานว่าไฟล์มีอยู่/เปิดได้/ได้รับสิทธิ์แชร์. ไม่บังคับ Public. ไม่เก็บค่าลิงก์ส่วนตัวในเอกสารนี้.
