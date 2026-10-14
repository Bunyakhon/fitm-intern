# FITM-INTERN — Student Profile Phase 1: Data Integrity Fix

วันที่ดำเนินการ: 2026-10-10 (Asia/Bangkok)

สถานะ: พัฒนา Phase 1 และตรวจ Regression Tests / Existing Tests / Frontend Build แล้ว ไม่มีการเปลี่ยน Schema หรือข้อมูลในฐานข้อมูลจริง หยุดก่อน Phase 2

## ขอบเขตและงานเดิมใน Workspace

อ่าน Field Mapping, Missing Fields, Database Design และ UX/UI Plan ของ Student Profile เป็นข้อมูลประกอบ ใช้เฉพาะข้อเสนอเกี่ยวกับความถูกต้องของการบันทึกและวันเกิด

ตรวจ Git Status ก่อนแก้ไข พบงานเดิมใน student_coop.js/html/css และ Internship Logs รวมถึงเอกสาร Audit ที่ยังไม่อยู่ใน Git เก็บ Snapshot/Diff ไว้เปรียบเทียบ และตรวจว่างานเดิมยังอยู่ก่อนลบ Snapshot ชั่วคราว

ไม่ได้เพิ่ม Profile Fields, 5 Tabs, PDF Import หรือฟังก์ชัน Dashboard อื่น ไม่เปลี่ยน Approval Workflow, Internship Logs หรือ Calendar ที่ซ่อนอยู่ ไม่รัน Migration ไม่ Reset/Drop/Truncate Database และไม่ Commit/Push

## สาเหตุเดิม

1. Modal ส่งครบ 28 properties รวมแท็บที่ซ่อน ค่า blank/missing control ถูกแปลงเป็น null จึงอาจล้างค่าที่ไม่ได้ตั้งใจ
2. Server รองรับการละฟิลด์อยู่แล้ว แต่ไม่มีการตรวจ Snapshot ปัจจุบันก่อน Update ไม่มี Transaction/Lock สำหรับ first-create และไม่ตรวจข้อมูลจาก Browser Tab อื่น
3. Initial GET ล้มเหลวแล้วตั้ง currentStudentProfile=null แต่ยังเปิด Modal ว่างและบันทึกได้
4. หลัง PUT ไม่ใช้ข้อมูลที่ Server ยืนยัน แต่ GET ใหม่แล้วแสดงสำเร็จแม้ Refresh ล้มเหลว การเปิด Modal ซ้ำเติมค่าจาก Server ทับ Draft
5. Snapshot ข้อมูลการศึกษาถูกเก็บก่อน await แล้วเติมกลับ อาจทับการพิมพ์ใหม่ระหว่างรอ API
6. วันเกิดใช้ new Date และตรวจเพียง NaN/อนาคต ทำให้วันที่ล้นเดือน เช่น 2023-02-30 ผ่าน Calendar Validation การเทียบ UTC กับ local midnight ยังขึ้นกับ Timezone ของ Server

## วิธีแก้ไข

### Frontend

- เพิ่ม StudentProfileDraft เก็บ Snapshot ของค่าที่แสดงจริงและ Revision ใช้ Mapping HTML ID → API property ชัดเจน โดยเฉพาะ parent_contact_address และ emergency_contact_*
- เปรียบเทียบค่าที่ Normalize แล้ว ส่งเฉพาะ Dirty Fields ของทั้งสองหมวด Omitted รักษาค่าเดิม; null ล้างค่าที่แก้เป็น blank โดยตั้งใจ; Missing control ไม่ถูกส่ง
- สลับแท็บเปลี่ยน Visibility เหมือนเดิม ปิด/เปิด Modal เก็บ Draft ในหน่วยความจำของหน้า
- ไม่เปิดแก้/บันทึกก่อน Initial GET สำเร็จพร้อม Revision; Refresh ล้มเหลวเก็บข้อมูลและ Draft เดิม
- API Refresh ไม่ Rebase Draft ที่ยัง Dirty อัตโนมัติ เพื่อให้ค่าที่เริ่มแก้กับ Revision ของค่าชุดนั้นสัมพันธ์กัน
- Freeze payload/revision ก่อนส่ง หลัง PUT ใช้ค่าที่ Server ยืนยัน โดยคงการพิมพ์ใหม่ระหว่าง await เป็น Dirty Fields รวมถึงการย้อนค่าเดิมระหว่างส่ง
- Capture ข้อมูลการศึกษาที่ยังไม่บันทึกตอน GET กลับมา ก่อนเติมข้อมูลใหม่ จึงรักษาการพิมพ์ระหว่าง Request
- แยก “บันทึกสำเร็จ” กับ “โหลดข้อมูลซ้ำไม่สำเร็จ”; ไม่ปิด Modal อัตโนมัติเมื่อมี Draft ใหม่
- Request sequence กัน GET เก่าที่กลับมาช้าทับผลใหม่
- 409 เก็บ Draft/Revision เดิม หยุดการบันทึกซ้ำ มีปุ่มโหลดล่าสุดและทิ้ง Draft ซึ่งต้องยืนยันผ่าน shared confirmation เดิมก่อน หากโหลดล้มเหลว Draft ยังอยู่
- beforeunload เตือนเมื่อมี Dirty Fields จริง ไม่เก็บข้อมูลสุขภาพ/ครอบครัวลง localStorage เพื่อทำ Draft ถาวร

### API / Controller / Sequelize

- คง Endpoint และ JSON field types เดิม เพิ่ม profile_revision ที่ Response และรับ If-Match Header
- Revision เป็น SHA-256 ของ Owner, Profile identity, updatedAt และค่า 28 fields ใช้ Metadata เดิม ไม่มีคอลัมน์ใหม่ Normalize ตัวเลข DECIMAL ให้มี Representation เดียวกัน
- Transaction ล็อก Student เจ้าของก่อน แล้ว StudentProfile ด้วย FOR UPDATE ตรวจ Revision และเขียนในชุดเดียวกัน Lock Student ช่วย Serialize first-create
- Revision ไม่ตรงตอบ 409 พร้อมข้อมูลล่าสุดของเจ้าของ ไม่มีการเขียน
- คง Allowlist และ Owner จาก JWT ไม่รับ student_id/id/ชื่อ/อีเมล/อายุ/ข้อมูลอาจารย์/Metadata เป็น Editable Profile
- เทียบค่าที่ส่งกับข้อมูลปัจจุบัน Update เฉพาะค่าที่เปลี่ยน พร้อม Sequelize fields จำกัด Columns ไม่ทำ Full Object Overwrite
- หลัง Update/Create ทำ reload ภายใน Transaction เพื่อยืนยันค่าที่ Database เก็บจริง เช่น DECIMAL ที่ถูกปัดเศษ ก่อนสร้าง Response/Revision
- Body ว่างหรือค่าที่เท่าปัจจุบันไม่ Update และไม่สร้าง Profile เปล่า

### วันเกิด

ตรวจ YYYY-MM-DD, ปีตั้งแต่ 0001, เดือน 1–12 และจำนวนวันจริง ไม่ใช้ Date overflow เป็นตัวตรวจความถูกต้อง

ปีอธิกสุรทิน: หาร 4 ลงตัว และไม่หาร 100 ลงตัว เว้นแต่หาร 400 ลงตัว ดังนั้น 2000-02-29/2024-02-29 ผ่าน; 1900-02-29/2100-02-29/2023-02-30 ไม่ผ่าน

Client/Server ใช้ Calendar date ของ Asia/Bangkok สำหรับ “ไม่เป็นอนาคต” คง DATEONLY / JSON String เดิม อายุยังเป็นค่าคำนวณ

## ไฟล์ที่แก้ไข / เพิ่ม

| ไฟล์ | การเปลี่ยนแปลง |
| --- | --- |
| backend/src/controllers/studentProfile.controller.js | Revision, Conditional Partial Update, Transaction/Lock, Reload และ Calendar Validation |
| backend/src/services/studentProfileIntegrity.js | เพิ่ม Allowlist, Calendar/วันปัจจุบันกรุงเทพฯ และ Revision Token |
| frontend/src/api/studentProfile.api.js | updateMyStudentProfile(data, revision) ส่ง If-Match |
| frontend/src/pages/studentProfileDraft.js | เพิ่ม Mapping, Dirty Patch, Snapshot Acknowledgement และ Client Calendar Validation |
| frontend/src/pages/student_coop.js | เฉพาะการโหลด/แก้/บันทึก Profile, Draft, Conflict และการรักษาข้อมูลระหว่าง Refresh |
| frontend/src/student_coop/student_coop.html | เพิ่มปุ่มโหลดล่าสุดหลัง Conflict ใน Modal เดิม |
| frontend/src/styles/student_coop.css | กฎ hidden ของปุ่ม Conflict เฉพาะ Profile; รักษา CSS ที่แก้ไว้ก่อน |
| backend/test/studentProfileIntegrity.test.js | HTTP Regression Tests ผ่าน Production Router/Auth/Controller |
| backend/test/helpers/studentProfileIntegrityFixture.js | SQL/Transaction จำลองกับข้อมูลปลอดภัย ไม่เชื่อมต่อ Database |
| frontend/test/studentProfileIntegrity.test.js | ทดสอบฟังก์ชันจริงกับ DOM จำลองจาก HTML |
| backend/scripts/verifyStudentProfileBrowser.js | Edge สอง Browser Tabs ผ่าน HTML/ฟังก์ชัน Profile/API Client/Router จริง ใช้ SQL จำลอง |
| docs/audits/FITM_STUDENT_PROFILE_PHASE1_IMPLEMENTATION.md | รายงานนี้ |

ตรวจ Diff เทียบ Snapshot แล้ว ไฟล์ Internship Logs ที่แก้ค้างอยู่เหมือนก่อนเริ่มงาน การแก้ student_coop.js/html/css รอบนี้อยู่เฉพาะ Profile

## API Contract ก่อนและหลัง

| ประเด็น | ก่อน | หลัง |
| --- | --- | --- |
| GET /api/student-profile/me และ GET alias /api/student-profile/ | success/message/data/student; profile อาจ null | คงข้อมูลเดิม เพิ่ม top-level profile_revision เป็น String รวม double quotes |
| PUT /api/student-profile/me และ PUT alias /api/student-profile/ | JSON 28 fields; UI ส่งครบ ไม่มี Precondition | JSON รูปแบบเดิม UI ส่งเฉพาะ Dirty Fields และต้องส่ง If-Match เท่ากับ Revision ของ Snapshot ที่แก้ |
| ไม่ส่ง field | รักษาค่าเดิมใน Controller | รักษาค่าเดิม; Missing controls ไม่สร้าง null |
| ส่ง null/blank string ที่อนุญาต | Normalize เป็น null | ยังล้างค่าได้; ตรวจ Revision ก่อนเขียน |
| ส่งค่าเดิม/{} | อาจ Update timestamp หรือสร้างแถวเปล่า | ไม่เขียนค่าที่ไม่เปลี่ยน ไม่สร้างแถวเปล่า |
| สำเร็จ | 200 Update / 201 Create พร้อม profile | 200 Update/no-op หรือ 201 Create พร้อม profile และ Revision จากข้อมูลที่ยืนยันแล้ว |
| ไม่มี Revision | บันทึกได้ | 428 PROFILE_REVISION_REQUIRED |
| Revision เก่า | เขียนทับได้ | 409 STUDENT_PROFILE_CONFLICT พร้อม profile/Revision ล่าสุด ไม่มี Write |
| If-Match ผิดรูปแบบ / Field ไม่อนุญาต | Field ไม่อนุญาต 400 | 400; ไม่รับ wildcard/weak validator/list of validators |
| วันเกิด | YYYY-MM-DD/null; บางวันที่ไม่มีจริงผ่าน | ชนิดเดิม; วันที่ไม่มีจริง/อนาคต 400 |
| สิทธิ์/Owner | Student JWT และ Allowlist | คงเดิม ไม่รับ Owner/Read-only fields จาก Body |

ตัวอย่างแก้เฉพาะโทรศัพท์:

~~~http
PUT /api/student-profile/me
Authorization: Bearer <student-token>
If-Match: "<revision-hash-from-GET>"
Content-Type: application/json

{"current_phone":"0000000001"}
~~~

ล้างโรคประจำตัวโดยตั้งใจ: Body {"medical_conditions":null} กับ If-Match ปัจจุบัน ไม่มี birth_date/skills/addresses ร่วมโดยอัตโนมัติ

Frontend/Backend ต้องใช้ Contract นี้ร่วมกัน Client เก่าที่ไม่มี If-Match ได้ 428 เพื่อป้องกัน Write ที่ไม่มีข้อมูลอ้างอิง Header ใหม่นี้จำเป็นต่อการกัน Stale Update ไม่เปลี่ยนชนิดข้อมูลหรือเพิ่ม Profile Fields

## Regression Tests

เพิ่ม Backend 13 กรณี และ Frontend 17 กรณี ผ่านทั้งหมด รวม 30 กรณี มี Subcases เพิ่มในแต่ละ Test

| กรณีที่กำหนด | ผล / หลักฐาน |
| --- | --- |
| 1. แก้เฉพาะส่วนตัว | ส่ง/เขียนเฉพาะฟิลด์ที่แก้ ตรวจทุกฟิลด์ที่ต้องรักษา |
| 2. แก้เฉพาะติดต่อ | วันเกิด/สุขภาพ/ทักษะ/อื่นๆ เหมือนเดิม; ผ่าน Edge ด้วย |
| 3. แก้ทั้งสองหมวด | เฉพาะ Dirty Fields ทั้งสองหมวด; ผ่าน HTTP/DOM/Edge |
| 4. สลับแท็บก่อนบันทึก | ค่าและ Dirty Fields อยู่; รวมปิด/เปิด Modal |
| 5. Refresh หลังบันทึก | GET ตรง PUT/Revision; Refresh failure แยกข้อความและคงค่าที่ Server ยืนยัน |
| 6. ส่ง Field ที่ไม่แก้ | Full payload ที่เหมือนปัจจุบันไม่ Write; Full payload เก่า 409 |
| 7. ตั้งใจล้างค่า | null เฉพาะช่องที่แก้; Omitted/Missing control ไม่ถูกล้าง |
| 8. วันที่ผิด | ล้นเดือน/ศูนย์/รูปแบบผิด/ปีผิด/อนาคตไม่ Write |
| 9. ปีอธิกสุรทิน | 2000/2024 ผ่าน, 1900/2100 ไม่ผ่าน; Bangkok midnight/Today |
| 10. สอง Browser Tabs | HTTP พร้อมกันมี Write เดียว อีกคำขอ 409; Edge สองแท็บ Snapshot เดียว เก็บ Draft แท็บเก่า |

ตรวจเพิ่ม: Initial GET failure, stale GET response, typing ระหว่าง PUT/GET, failed PUT, ย้อนค่าเดิมระหว่าง PUT, conflict reload/failure, Read-only/Owner spoof, role/401/403, Transaction commit failure และ first-create race

## Existing Tests / Build / Browser

คำสั่งจาก backend:

~~~text
npm.cmd test
node scripts/verifyStudentProfileBrowser.js
~~~

คำสั่งจาก frontend:

~~~text
node --test test/*.test.js
npm.cmd run build
~~~

- Backend: 234 tests, ผ่าน 217, ข้าม 17, ไม่ผ่าน 0 (รวม Helper ที่ Node runner นับเป็นไฟล์ทดสอบ)
- Frontend: 276 tests, ผ่าน 274, ข้าม 2, ไม่ผ่าน 0
- Edge Browser Acceptance: 4 Subcases + Parent test, ผ่าน 5, ข้าม 0, ไม่ผ่าน 0
- Frontend Build: Vite build สำเร็จ, 124 modules transformed
- git diff --check: ผ่าน

Node/Vite ต้องสร้าง subprocess จึงรันนอก Sandbox เฉพาะคำสั่งทดสอบ/Build ตามงานนี้ ไม่มีการแก้ Permission ถาวรหรือ Connection ของ Database

## ข้อจำกัดและปัญหาที่ยังเหลือ

1. ไม่ทดสอบ Write กับ Database/บัญชีนักศึกษาจริง SQL/Row Lock/Commit/Rollback เป็น Test Doubles แม้ HTTP/JWT/Router/Controller/Browser เป็นของจริง ยังต้อง Acceptance บนฐานข้อมูลทดสอบที่ได้รับอนุญาตและมี Schema พร้อมแล้วเพื่อยืนยัน PostgreSQL behavior
2. Database Integration Tests ถูกข้าม ไม่เปิด Flag ที่อาจรัน Migration/เขียนข้อมูล Unit Tests ของ Migration เดิมใช้ Query จำลอง ไม่รัน DDL บน Database
3. Browser Test ใช้ HTML/ฟังก์ชัน Profile/API จริงใน Harness แยก ไม่ใช่ Full Dashboard bootstrap/การ Login บัญชีจริง ไม่อ้างว่าตรวจทุกเมนูหรือ Responsive ทั้งหมด
4. Draft อยู่ในหน่วยความจำ API Refresh/เปลี่ยนแท็บ/ปิด Modal ไม่ทำให้หาย แต่ถ้าผู้ใช้ยืนยัน Hard Reload/ปิด Browser หลัง beforeunload ข้อมูลที่ยังไม่บันทึกไม่อยู่ข้ามหน้า ไม่มี Autosave/Server Draft ใน Phase นี้
5. Revision เป็น Snapshot Validator จากข้อมูลเดิม ไม่ใช่ Monotonic Counter/ประวัติถาวร Version History/Audit ถาวรต้องเสนอ Schema/Contract แยกก่อนพัฒนา
6. Conflict ใช้การยืนยันโหลดล่าสุดและทิ้ง Draft ยังไม่มี UI เปรียบเทียบค่าทีละ Field/Merge อัตโนมัติ ไม่ Rebase ค่าทับข้อมูลใหม่โดยเงียบๆ
7. Fields ใหม่, maxlength/Numeric limits อื่น, เอกสาร/MIME/Privacy policy, Five Tabs และ PDF Import อยู่นอกขอบเขต ไม่มีการพัฒนาเพิ่ม

Phase 1 เสร็จตามขอบเขตโค้ดและการทดสอบที่ไม่เขียนฐานข้อมูลจริง หยุดรอคำสั่งก่อน Phase 2
