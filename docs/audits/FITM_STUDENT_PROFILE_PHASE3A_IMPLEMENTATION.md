# FITM-INTERN — Student Profile Phase 3A Implementation

วันที่: 11 ตุลาคม 2026 (Asia/Bangkok)  
ขอบเขต: Backend API และ Aggregate Data Integrity สำหรับฟอร์มกรอกเองตาม TGDE-COOP–02  
สถานะ: **PASS สำหรับขอบเขต API ที่ดำเนินการได้; BLOCKED เฉพาะนโยบายเลขบัตรประชาชน การรับรองและลายเซ็น**  
ไม่มีการเริ่ม Phase 3B, UI 5 Tabs หรือ PDF Import/OCR ใหม่

## 1. ตรวจสถานะและรักษางานเดิม

อ่านรายงาน Phase 1, Phase 2A, Phase 2B.2 Installation, Field Mapping, Database Design และ UX/UI Plan แล้ว ตรวจ Git Status/Diff และ Source Code ก่อนดำเนินการต่อจาก Usage Limit โค้ด API/Revision และผล PostgreSQL 28 กรณีที่ค้างอยู่ถูกนำมาตรวจต่อ ไม่เริ่มเขียนใหม่

สาเหตุที่ต้องขยาย Phase 1: /me เดิมมี Partial Update และ If-Match แต่ /student-info และการอัปโหลดรูปยังไม่ใช้ Revision เดียวกัน การเพิ่ม Child Records และเอกสารจึงต้องใช้เจ้าของ Aggregate และ Transaction ร่วมกัน เพื่อป้องกันข้อมูลที่อ่านคนละเวลาและ Lost Updates ข้าม Endpoint

ผลตรวจ Development intern_system แบบ READ ONLY ครั้งสุดท้าย: **PASS**

| รายการ | ผล |
| --- | --- |
| Migration 022–025 | Executed ทั้งสี่รายการ |
| Migration 019–021 | Pending ทั้งสามรายการ |
| Ledger | 23 รายการ; ไม่แก้ Ledger เอง |
| Schema | 33 ตาราง / 398 คอลัมน์ / 169 Constraints / 83 Indexes / 5 Triggers |
| Schema SHA-256 เทียบ Phase 2B.2 | 635c6050d74f89511d9698cd32e8a81423b1a50d652f88fe1cc8380686601a6f ตรงกัน |
| ข้อมูลเดิม 28 ตาราง | จำนวนแถวและ Checksum ของคอลัมน์เดิมตรง Backup Baseline ทุกตาราง |
| students / student_profiles / student_files เดิม | 4 / 2 / 3 แถว |
| ตาราง Child ใหม่ 4 ตารางใน Development | ทุกตารางยัง 0 แถว |
| Prepared Schema/Models/Migration Sources 7 ไฟล์ | SHA-256 ตรงหลักฐาน Phase 2B.1 |
| Migration ที่รันใน Phase 3A | 0 |
| Drop / Reset / Truncate / เปลี่ยนบัญชีนักศึกษาจริง | ไม่ดำเนินการ |

หลักฐาน: [Database Verification](FITM_STUDENT_PROFILE_PHASE3A_DATABASE_VERIFICATION.json) และ [PostgreSQL Integration Results](FITM_STUDENT_PROFILE_PHASE3A_POSTGRES_RESULTS.json)

เทียบ SHA-256 ของไฟล์ 407 รายการกับ Baseline ก่อน Phase 3A พบเปลี่ยนไฟล์เดิมเฉพาะ 12 รายการตามรายชื่อท้ายรายงาน อีก 395 รายการยังเหมือนเดิม รวมโค้ด Internship Logs, HTML/CSS, Sidebar, Workflow และ Source Migration ที่มีงานเดิมค้างใน Git Status งานเดิมทั้งหมดคงไว้ ไม่มี Commit/Push

## 2. API ที่พัฒนาหรือเปลี่ยนแปลง

Prefix ทุก Endpoint: /api/student-profile  
ทุก Endpoint ใช้ Authentication ของนักศึกษาเดิมและ Owner จาก Token ไม่รับ student_id จาก Body

| Endpoint | ก่อน Phase 3A | หลัง Phase 3A |
| --- | --- | --- |
| GET /me และ GET / | Profile และ Revision จาก Phase 1 | DTO เดิม พร้อมข้อมูลเพิ่มเติมและ Child Arrays; Revision ครอบคลุม Aggregate |
| PUT /me และ PUT / | Partial Profile พร้อม If-Match | รองรับฟิลด์เดิม 28 และเพิ่มเติม 16; ใช้ Aggregate Revision/Transaction |
| PUT /student-info | บันทึกข้อมูลการศึกษาโดยไม่มี Aggregate If-Match | Partial Academic Update พร้อม If-Match; เพิ่ม department/faculty/last_semester_gpa ที่มี Schema แล้ว |
| POST /profile-image | Upload รูปโดยไม่มี Aggregate If-Match | If-Match ก่อนรับไฟล์; Owner Lock/Revision/Transaction และ Cleanup ที่ตรวจ Commit Outcome |
| GET /profile-image | รูปของเจ้าของ | Private Owner Read; Cache-Control และ nosniff |
| DELETE /profile-image | ไม่มี | ล้างเฉพาะ Reference พร้อม If-Match; เก็บ Bytes เดิม |
| GET /aggregate | ไม่มี | อ่าน Snapshot ของทุกส่วนพร้อม Revision เดียวกัน |
| PATCH และ PUT /aggregate | ไม่มี | Partial Atomic Update หลายตารางด้วย Explicit Child Operations |
| GET /addresses, /education, /training, /skills | ไม่มี | รายการของเจ้าของพร้อม profile_revision |
| GET /{kind}/:id | ไม่มี | อ่านรายการที่เป็นของเจ้าของ; Foreign ID เป็น 404 |
| POST /{kind} | ไม่มี | สร้าง Child Record; 201 พร้อม ID ที่ Server สร้าง |
| PATCH /{kind}/:id | ไม่มี | แก้เฉพาะคอลัมน์ที่ส่งและเป็นของเจ้าของ |
| DELETE /{kind}/:id | ไม่มี | ลบเฉพาะ Child ID ที่ระบุและเป็นของเจ้าของ |
| GET /documents | ไม่มี | Active Profile Documents ของเจ้าของและ Revision |
| POST /documents/:fileType | ไม่มี | Upload เอกสารใหม่แบบ Versioned; Multipart field ชื่อ document |
| PATCH /documents/:id | ไม่มี | แก้ document_label ของเอกสารปัจจุบันเท่านั้น |
| DELETE /documents/:id | ไม่มี | Logical Removal: is_current=false; ไม่ลบ Metadata/Bytes เก่า |
| GET /documents/:id/download | ไม่มี | Authorized Attachment ของเจ้าของ รวม Version เก่าที่เก็บไว้ |
| POST /resume | API เดิมและตัว Extractor เดิม | Contract เดิม; อยู่นอก Profile Aggregate; ไม่เพิ่ม PDF Import/OCR |

kind ใช้ addresses, education, training หรือ skills ตามตารางนี้เท่านั้น

### Contract และความหมาย Partial Update

- Client อ่าน profile_revision จาก GET /me หรือ /aggregate แล้วส่ง Header If-Match ที่ตรงกับ Snapshot ที่เริ่มแก้ไข
- รูปแบบ Token ยังคงเป็น SHA-256 64 ตัวในเครื่องหมายคำพูดแบบเดิม แต่ Scope เปลี่ยนเป็น Aggregate v2; Token จาก Snapshot Phase 1 ต้องโหลดใหม่ก่อนบันทึก
- ไม่ส่งฟิลด์ = รักษาค่าเดิม; ส่ง null = ตั้งใจล้างค่าฟิลด์ที่อนุญาต; Blank String ของฟิลด์เดิมยัง Normalize เป็น null
- ไม่ส่ง Relation Group, ส่ง {} หรือส่ง Array Operations ว่าง = ไม่เปลี่ยน Child Records; ไม่ใช้ Array Replacement
- Child Operations ที่เป็น null หรือเขียน/ลบ ID เดิมซ้ำในคำขอถูกปฏิเสธ ไม่ตีความว่าให้ล้างทั้งหมวด
- PUT /aggregate และ PUT /me เป็น Partial ตาม Contract ที่ระบุ ไม่ทำ Full Object Overwrite
- Payload ที่ส่งค่าเดิมทั้งหมดเป็น No-op เมื่อ Revision ถูกต้อง; ไม่อัปเดต Timestamp/Counter โดยไม่จำเป็น
- ทุก Writer ใน Aggregate ใช้ If-Match; ขาด Header เป็น 428, รูปแบบผิดเป็น 400, Snapshot เก่าเป็น 409 STUDENT_PROFILE_CONFLICT พร้อม Snapshot ล่าสุดของเจ้าของ
- Validation หรือ Ownership ล้มเหลวไม่เขียนข้อมูลบางส่วน; Unique Conflict เป็น 409 และ DB Constraint ผิดเป็น 400
- Response การบันทึกคืน Snapshot หลังเขียนใน Transaction และ profile_revision ใหม่ โดยตอบหลัง Commit สำเร็จ; เก็บ aliases student/data และ student.profile เพื่อ Client เดิม
- Revision เป็น Application Validator ใน JSON ไม่ตั้ง HTTP ETag ของ DTO ทั้งก้อน เพราะ Read-only Workflow/ชื่ออาจารย์ที่แสดงไม่ได้อยู่ใน Scope ที่ใช้ตรวจการแก้ Profile

ตัวอย่างบันทึกข้อมูลส่วนตัวอย่างเดียว:

~~~http
PUT /api/student-profile/me
If-Match: "<profile_revision ที่อ่านมา>"
Content-Type: application/json

{"english_first_name":"Synthetic","father_phone":null}
~~~

ตัวอย่างบันทึกหลายตารางพร้อมกัน:

~~~json
{
  "student": {"faculty": "Synthetic Faculty"},
  "profile": {"mother_phone": "0000000003"},
  "addresses": {
    "update": [{"id": "<owned-address-uuid>", "changes": {"road": null}}]
  },
  "education": {
    "create": [{"education_level": "bachelor", "institution_name": "Synthetic"}],
    "update": [{"id": "<owned-education-uuid>", "changes": {"gpa": "3.50"}}],
    "delete": ["<owned-other-education-uuid>"]
  }
}
~~~

IDs ในตัวอย่างเป็น Placeholder ต้องใช้ UUID จริงจาก Response ของเจ้าของ จำกัด 100 Child Operations ต่อคำขอเป็นขอบเขตทางเทคนิค ไม่ใช่จำนวนประวัติสูงสุดของนักศึกษา ไม่บังคับ 5 แถวตามช่องกระดาษ

## 3. ตารางและ Sequelize Models ที่ใช้งาน

| ตารางที่ติดตั้งแล้ว | Sequelize Model | การใช้งาน |
| --- | --- | --- |
| students | Student | Academic Fields, รูป และ profile_data_revision |
| student_profiles | StudentProfile | ข้อมูลส่วนตัวเดิมและเพิ่มเติม; คงสุขภาพ/ครอบครัว/ผู้ปกครอง/ข้อความทักษะเดิม |
| student_files | StudentFile | ระบบ Private Documents และ Metadata/Version เดิมที่ขยายแล้ว |
| student_addresses | StudentAddress | registered/current แยกแถว; Unique ต่อ Owner และ Address Type |
| student_education_records | StudentEducationRecord | หลายรายการและหลายรายการในระดับเดียวกันได้ |
| student_training_records | StudentTrainingRecord | หลายประวัติ; คง period_text ตามโครงสร้างที่ติดตั้ง |
| student_skills | StudentSkill | computer/language และ Proficiency ตาม Schema |

registerStudentProfileAggregate ใช้ Prepared Model Factories เดิมขยาย Attributes ของ Model เดิม 3 ตัวและลงทะเบียน Child Models 4 ตัวตอนโหลด Registry เท่านั้น ไม่ใช้ sync/DDL/Migration มี Models ใน Registry 40 ตัว

ไฟล์ student.model.js, studentProfile.model.js และ studentFile.model.js เดิมไม่ถูกเขียนทับ Attributes เพิ่มเติมถูก Register ใน models/index.js จึงต้องใช้ Registry ของแอปเพื่อเห็นส่วนขยาย

Default Scope ของ Model เดิมยกเว้นคอลัมน์เพิ่มใหม่ เพื่อรักษา Projection ของ Role/Workflow เดิม Owner API เลือก Attributes โดยชัดเจน ส่วน national_id_ciphertext และ national_id_key_version ไม่ถูกเลือกเข้า Owner DTO ไม่ย้ายหรือ Backfill ที่อยู่และข้อความทักษะเดิมเป็น Child Records โดยอัตโนมัติ

16 Profile Fields เพิ่มเติมที่เปิดแก้ไข: english_first_name, english_last_name, gender, national_id_issue_date, national_id_expiry_date, has_driving_license, driving_license_number, driving_license_type, driving_license_expiry_date, military_status, father_address, father_phone, mother_address, mother_phone, emergency_contact_occupation, emergency_contact_workplace

## 4. Aggregate Revision Implementation

Aggregate ประกอบด้วย Editable Academic Fields 7 รายการ, Profile Scalars 44 รายการ, Profile Image Reference, Child Records ทั้ง 4 ประเภท และ Active Profile Document Metadata 5 ประเภท

Read-only Identity/Status/Track, coop_advisor_teacher_id, Teacher Display, Resume, Project Files, Internship Logs และคำร้อง/Approval อยู่ภายนอก Revision Scope การเปลี่ยนชื่ออาจารย์หรือสถานะ Workflow จึงไม่ทำให้ Draft Profile Conflict โดยไม่จำเป็น และ Profile API ไม่เปิดแก้ Read-only Fields เหล่านี้

ทุก Writer ใช้ managed Sequelize Transaction และล็อก Student Owner ด้วย FOR UPDATE ก่อนอ่าน Revision หรือเขียนตารางอื่น ตรวจ Token กับ Snapshot ปัจจุบันภายใน Lock แล้วเขียนเฉพาะ Dirty Values ด้วย fields Allowlist ก่อนเพิ่ม Counter ครั้งเดียวต่อคำขอที่เปลี่ยนข้อมูลจริง GET Snapshot ล็อก Owner ด้วย FOR SHARE และอ่านทุกส่วนใน Transaction เดียวกัน จึงไม่คืนข้อมูลที่เขียนเสร็จเพียงบางตาราง

profile_data_revision เป็น PostgreSQL BIGINT ที่เก็บเป็น Decimal String ใน JavaScript และเพิ่มด้วย BigInt ไม่แปลงเป็น Number ทดสอบค่า 9007199254740993 → 9007199254740994 ได้ตรงจริง Token รวม Counter และค่าปัจจุบันแบบ Canonical รวม Child Records/Active Documents ที่เรียง ID อย่างแน่นอน ค่า DECIMAL ที่เท่ากันทางตัวเลขไม่ถูกถือว่า Dirty เพียงเพราะ Representation ต่างกัน

Concurrent Clients สองตัวที่ใช้ Snapshot เดียวกันผ่านได้หนึ่งตัว อีกตัวได้ 409 ไม่บันทึกทับ การสร้าง Profile ครั้งแรกก็ Serialize ด้วย Owner Lock ก่อนมี Profile Row การแก้ Child หลายรายการที่ล้มเหลวระหว่างทาง Rollback ทุกตารางและ Counter ได้

ขอบเขตนี้รับประกันผ่าน API Writers ที่ตรวจไว้ทั้งหมดใน Source ปัจจุบัน การเขียน SQL หรือเพิ่ม Writer ในอนาคตต้องใช้ Owner Lock/Revision Service เดียวกัน ไม่มีการเพิ่ม Database Trigger เพื่อบังคับ Writer นอกระบบ

## 5. Upload Transaction / Rollback

เอกสารใช้ Private Storage เดิมใต้ students/<owner>/profile-documents รูปใช้พื้นที่ profile เดิม รับ If-Match ก่อน Multer เขียนไฟล์ ตรวจ Mime Allowlist ด้วย Own Property, Extension, Signature Bytes, ขนาดจริง, ชื่อไฟล์, Owner Directory และ Real Path เพื่อป้องกัน Path Escape/Symlink แล้ว Server คำนวณ SHA-256

ประเภท Profile Documents: transcript, national_id_copy, student_id_copy, supporting_other, external_profile_pdf
รับ PDF/JPEG/PNG สูงสุด 10MB หนึ่งไฟล์ต่อคำขอ; external_profile_pdf รับ PDF เท่านั้นและเก็บต้นฉบับ ไม่ Extract/OCR; supporting_other ต้องมีชื่อกำกับ รูป Profile รับ JPEG/PNG/WEBP สูงสุด 5MB ตามขอบเขตเดิม

การ Replace เอกสารสร้าง Metadata Row/UUID/Bytes ชุดใหม่, Increment document_version และอ้าง supersedes_file_id แล้ว Mark Current เดิม false ภายใน Transaction เดียวกัน supporting_other เพิ่มแต่ละรายการอย่างอิสระ Server ไม่รับการกำหนด Hash/Version/Owner/Storage Path จาก Client

Validation/Conflict/Rollback ล้มเหลวลบเฉพาะ Bytes ใหม่ที่ยังไม่ถูกอ้างอิง เก็บ Metadata และ Bytes เดิมทั้งหมด เมื่อ COMMIT acknowledgement ล้มเหลว ให้รอ Owner Lock แล้วตรวจ Durable Reference ก่อนลบ ถ้า PostgreSQL Commit แล้วให้เก็บ Bytes ที่ยังถูกอ้างอิง สำหรับรูปที่ไม่มี History Row ตรวจ Counter เพิ่มเติมเพื่อไม่ลบรูปที่อาจ Commit แล้วและถูกแทนที่ภายหลัง หากยืนยัน Commit Outcome ไม่ได้ให้เก็บ Bytes เพื่อ Reconciliation แทนการเสี่ยงสูญเสียข้อมูล

ทดสอบจริงทั้ง Callback Failure หลังเขียนหลายตาราง, COMMIT ถูกปฏิเสธก่อนส่ง SQL และ COMMIT สำเร็จแล้วแต่ตอบรับล้มเหลว ครอบคลุม Document/Photo ทั้ง Metadata, Counter และ Bytes กรณีตอบรับล้มเหลว HTTP เป็น 500 ได้แม้ Commit สำเร็จแล้ว Client ต้องโหลดสถานะล่าสุดก่อน Retry ไม่ถือว่าไม่มีข้อมูลถูกบันทึก

DELETE Document คือ Logical Removal และ DELETE Photo ล้าง Reference เท่านั้น ไม่มี Physical Purge/Retention Cleanup ใหม่ Version เก่ายัง Download ได้เฉพาะเจ้าของที่ Authenticated การยืนยันว่าเอกสารครบ/สำเนารับรองถูกต้อง และนโยบายลบ/เข้าถึง Role อื่นยังไม่ได้กำหนดใน Phase นี้ ขนาด/Mime ข้างต้นเป็น Technical Upload Limits ไม่ใช่การยืนยันว่าสถาบันรับเอกสารนั้นแล้ว

## 6. API Client Compatibility และ Dirty Fields

ค้น Frontend/API Client ที่เรียก /student-info และ /profile-image พบ Adapter ใน studentProfile.api.js และหน้า student_coop.js ปรับเฉพาะจุดที่ต้องส่ง Revision ไม่เพิ่ม UI Tabs หรือเมนู

- Academic Form ส่งเฉพาะฟิลด์ Dirty; การ Refresh จาก API ขณะมี Draft เก็บค่า Draft และ Revision เดิมไว้ เพื่อไม่ Rebase Silent แล้วเขียนทับการเปลี่ยนของอีก Browser Tab
- การเปลี่ยน Advisor เช็ก Active Teacher ใน Transaction เดียวกัน; ไม่ส่ง Advisor ที่ไม่ได้แก้ โดยเฉพาะตอน Directory โหลดไม่สำเร็จ
- หลัง Commit ยอมรับ Revision จาก Response แต่ยังรักษาการพิมพ์ที่เกิดระหว่างรอ API; การ Load Teacher ต่อไม่ทำ Pending Advisor หาย
- รูปจับ Revision ตอนเลือกไฟล์และรักษา Preview ระหว่าง API Refresh Upload ใช้ Revision ที่เลือกไว้; เมื่อ 409 เก็บไฟล์และให้ผู้ใช้ยืนยันโหลดข้อมูลใหม่ก่อนกด Upload อีกครั้ง
- Profile Dirty Fields ของ Phase 1 ยังคงอยู่ขณะเปลี่ยนหมวดและ API Refresh; เมื่อส่วนอื่นเปลี่ยน Aggregate ให้ Draft เดิม Conflict อย่างชัดเจน
- Beforeunload เตือน Profile/Academic Draft และรูปที่เลือกแต่ยังไม่บันทึก ไม่มีการเพิ่มการเก็บ PII Draft ลง Local Storage; Hard Reload ที่ผู้ใช้ยืนยันยังล้าง Draft ในหน่วยความจำได้
- Resume Client และ Contract เดิมไม่มี If-Match เพราะ Upload นี้ไม่เปลี่ยนข้อมูลใน Profile Aggregate
- Client ที่ค้าง Token Phase 1 หรือเรียก Academic/Photo โดยไม่มี If-Match ต้องอ่าน Snapshot ใหม่/เพิ่ม Header; ไม่ปล่อย Legacy Writer ข้าม Revision เพื่อคงความปลอดภัย

ทดสอบ Adapter และฟังก์ชันหน้าเว็บจริงผ่าน VM/DOM Fixtures รวม 6 Aggregate Compatibility Cases ไม่ใช่การ Login/เปิดสอง Browser Tabs จริง

## 7. Validation

| รายการ | ข้อกำหนดที่ใช้ |
| --- | --- |
| วันเกิด/วันที่บัตร/ใบขับขี่ | DATEONLY YYYY-MM-DD ค.ศ. 0001–9999 ตามปฏิทินจริง; Leap/Century Rules; วันเกิดไม่อยู่ในอนาคตตาม Bangkok |
| วันหมดอายุบัตร | ไม่ก่อนวันออกบัตรเมื่อมีทั้งสองค่า; Partial Patch ตรวจรวมค่าปัจจุบัน |
| GPA และ last_semester_gpa | 0–4 ไม่เกินสองตำแหน่ง; รับ Number/String ทศนิยมตาม Contract |
| Integers | Number.isSafeInteger พร้อมช่วงของคอลัมน์; ไม่ Coerce String/Boolean/Fraction/ค่าที่ Precision สูญเสีย |
| ปีการศึกษา/ปีสำเร็จ | year_level 1–4, graduation_year 1–9999 ค.ศ.; ไม่เปลี่ยน Contract ให้รับ พ.ศ. อัตโนมัติ |
| อายุบิดา/มารดาและลำดับ | Positive int32 สำหรับอายุ; display_order 0–2147483647 และห้าม null |
| ส่วนสูง/น้ำหนัก | Number finite >0 ถึง 999.99 ตามคอลัมน์ Numeric เดิม |
| ที่อยู่ | registered/current; Text Length ตาม Schema; postcode เป็น String ยาวไม่เกิน 16 รักษาเลขศูนย์นำหน้า |
| ข้อมูลครอบครัว/ฉุกเฉิน | Text/Phone Validation และ Nullable ตามคอลัมน์เดิม/ที่ติดตั้ง ไม่บังคับกรอกทั้งชุด |
| ระดับการศึกษา | bachelor / high_vocational / high_school_vocational |
| ทักษะและระดับ | computer / language; very_good / good / moderate / fair หรือ null |
| ทหาร/ใบขับขี่ | served/not_yet_served หรือ null; ไม่มีใบขับขี่ต้องล้างรายละเอียดอย่างชัดเจน ไม่ล้างให้เอง |
| Required/Draft | Required เฉพาะ Key ประเภท Child และ Non-null Columns จริง; Profile Draft ยังไม่ต้องกรอกทุกช่อง |
| Read-only | Identity, Student Owner, Revision Counter, Workflow Fields และ File Metadata ที่ Server จัดการแก้ผ่าน Body ไม่ได้ |

ไม่เดา Vocabulary เพศ/ประเภทใบขับขี่หรือ Master คณะ/ภาควิชาใหม่ และไม่เปลี่ยนความหมาย gpa เดิมเป็น GPA สะสมโดยไม่มีหลักฐาน ไม่มีการกำหนดเลขไปรษณีย์ไทย 5 หลักให้ข้อมูลทุกประเทศ

## 8. Security

ใช้ JWT/Student Role Middleware เดิมและ Owner จาก Token ทุก Query ของ Child/Documents มี student_id คู่กับ ID ปฏิเสธ Foreign IDs ด้วย 404 และ Unauthorized/Non-student ด้วย 401/403 ตาม Middleware มี Allowlist ทั้ง Body, Sequelize Attributes และ fields จึงไม่ Mass Assign คีย์อ่อนไหวหรือ Read-only

Private Document DTO ไม่ส่ง storage_path/extracted_text; Download เป็น Authenticated Attachment มี Cache-Control private,no-store และ X-Content-Type-Options nosniff; ไม่มี Public Link หรือระบบไฟล์ใหม่ Owner Snapshot ไม่ส่ง Password/Encrypted National ID/Key Version New Controller ไม่ Echo หรือ Log Raw ORM Error, SQL หรือ Input Values

Sequelize ภายใน Library ยังมี Console Warning เมื่อ COMMIT Error; ในการทดสอบใช้ข้อความสังเคราะห์เท่านั้น ไม่ได้ทดสอบการกรอง Diagnostic Logs ของ Infrastructure จริง ตรวจ Signature เป็น File Type Guard ไม่ใช่ Antivirus/การยืนยันว่า PDF หรือรูปทั้งไฟล์ Decode ได้ ไม่มีการเพิ่ม Document Certification หรือการอ้างว่าผ่านการตรวจสำเนาแล้ว

## 9. ผล Regression / PostgreSQL / Existing Tests / Build

ผลล่าสุดหลังแก้ Safe Integer และ Commit Outcome:

| การตรวจ | PASS | FAIL | SKIP | สถานะ |
| --- | ---: | ---: | ---: | --- |
| Focused Backend Profile/Advisor/Safe Integer | 18 | 0 | 0 | PASS |
| Existing Backend: node --test | 239 | 0 | 19 | PASS เฉพาะชุดที่รัน |
| Existing Frontend: node --test test/*.test.js | 281 | 0 | 2 | PASS เฉพาะชุดที่รัน |
| PostgreSQL Phase 3A Integration Subtests | 31 | 0 | 0 | PASS |
| Frontend: npm run build | — | 0 | — | PASS; Vite Build 634ms |
| git diff --check | — | 0 | — | PASS; มีเพียง LF/CRLF warnings |

Focused Tests ซ้ำอยู่ใน Existing Backend จึงไม่บวกเป็นจำนวน Tests ใหม่อีกครั้ง PostgreSQL 31 คือ Subtests ของ Integration Parent แยกจากชุด Backend ปกติที่ตั้ง Opt-in Parent เป็น SKIP

Backend SKIP 19 เป็นชุด Opt-in Database/Migration/Browser ที่ไม่ได้เปิดเพื่อหลีกเลี่ยงการรัน Migration หรือ Workflow อื่น; Phase 3A PostgreSQL รันแยกผ่าน Harness เฉพาะงานนี้แล้ว Frontend SKIP 2 คือ Real Browser Runtime และ Saved UI/PostgreSQL Acceptance ที่ไม่มี Environment ของชุดนั้น

### PostgreSQL Integration ที่รันจริง

ใช้ PostgreSQL 16.15 จาก Development Container เพื่อ pg_dump เฉพาะ Schema และ pg_restore ลงฐานใหม่ fitm_profile_3a_5e5f6ed0ee990bb046f95d7969444a4e ไม่คัดลอกแถวนักศึกษาจริง ไม่ใช้ Migration หรือ sync

Test Harness ตรวจชื่อ DB/Marker ทุก Connection, ใช้ Role เฉพาะที่ไม่เป็น Superuser และ HTTP Production Router/Auth/Controller/Sequelize จริง สร้างนักศึกษาสังเคราะห์สองคนและ Private Storage ชั่วคราว โดยแยกจาก intern_system ตรวจ Metadata/Ledger และ Checksum ทุก 32 ตารางที่ไม่ใช่ Ledger ของ Development เท่ากันก่อนและหลัง

31 กรณีครอบคลุม:

1. Personal Scalars/Explicit Null และคงสุขภาพ/ครอบครัว/ข้อความทักษะเดิม
2. Registered/Current Addresses แยกกันและ Draft Fields
3. เพิ่ม Education หลายรายการในระดับเดียวกัน
4. แก้ Education แบบ Partial และ null
5. ลบ Education เฉพาะ ID
6. Training CRUD และคง period_text/รายการอื่น
7. Skills CRUD ทั้งสองหมวดและ Nullable Proficiency
8. Read-after-save และ / Alias Revision ตรงกัน
9. 428 Missing และ 400 Malformed If-Match ไม่มี Writes
10. 409 Stale Token พร้อม Current Owner Snapshot
11. Concurrent Academic/Child Clients และ Retry ที่ไม่ Lost Updates
12. Concurrent First Profile Create
13. Rollback หลายตารางเมื่อ Ownership Check รายการท้ายล้มเหลว
14. Rollback เมื่อ DB Unique Constraint ล้มเหลว
15. Foreign Owner/Role และ Mass Assignment
16. No-op/Empty Operations ไม่เปลี่ยน Revision/รายการเดิม
17. Calendar/Leap/GPA/Enums/Conditional Fields/Draft
18. Private Document Version/Hash/Supersedes และเก็บ Bytes เก่า
19. Ownership/Label/Logical Removal ของ Documents
20. Mime/Bytes/Extension/Count/Body และ Cleanup เมื่อ Stale
21. Photo Upload ร่วม Aggregate และ Stale Scalar ถูกปฏิเสธ
22. Resume/Project Metadata ไม่เปลี่ยน Profile Revision
23. ไม่เปิดเผย Private Attributes ผ่าน DTO หรือ Legacy Role Model Includes
24. BIGINT Counter เกิน JavaScript Safe Integer ยังเพิ่มได้ตรง
25. GET รอ Owner Lock และคืน Snapshot หลัง Commit ครบทุกตาราง
26. Unsafe JSON Integers ถูกปฏิเสธโดยไม่มี Scalar/Child/Revision เปลี่ยน
27. Upload Callback Failure ย้อน Old-current/New-version/Counter และลบ Bytes ใหม่
28. Rejected COMMIT ย้อน Document/Photo References และลบ Bytes ใหม่
29. Lost COMMIT Acknowledgement เก็บ Durable Document/Photo และ Bytes ที่ Commit แล้ว
30. Photo Removal ล้าง Reference และเก็บ Bytes เดิม
31. Atomic Aggregate Save สำเร็จโดยแก้เฉพาะค่าที่ส่ง

ฐานทดสอบสังเคราะห์ 3 ฐานจากรอบ 24/28/31 กรณีถูกเก็บไว้ตามข้อห้าม Drop และปิด Login/ล้าง Password ของ Role หลังทดสอบ รายชื่ออยู่ใน Database Verification JSON ไม่เผย Credentials ฐานเหล่านี้ไม่มีข้อมูลจริงจาก Development

### NOT TESTED / ข้อจำกัดหลักฐาน

| รายการ | สถานะและข้อจำกัด |
| --- | --- |
| Login นักศึกษาจริงและแก้ข้อมูลบัญชีจริง | NOT TESTED; ไม่ได้รับอนุญาตและไม่ได้เปลี่ยนข้อมูลจริง |
| สอง Browser Tabs จริง/Manual End-to-end | NOT TESTED; มี Concurrent HTTP PostgreSQL และ VM/DOM Client Regression แทน |
| Production Deployment/Production DB | NOT TESTED |
| Existing Opt-in DB/Migration Suites ที่ข้าม | NOT TESTED ในรอบนี้; ไม่อ้างผล Unit ว่าเท่ากับผล DB ของแต่ละ Workflow |
| Resume Extractor/OCR External Service | NOT TESTED ใน Phase 3A; Mock เฉพาะ Extractor บนข้อมูลสังเคราะห์เพื่อทดสอบ Contract/Revision |
| Antivirus, Full PDF/Image Decoding และ Formal Document Acceptance | NOT TESTED/ยังไม่พัฒนา; Technical Type Guards ไม่ใช่ Certification |
| Storage Permission ของ OS/Role อื่นในระบบจริง | NOT TESTED แบบ End-to-end; Owner API/Private Path Guards ผ่าน Integration |
| Infrastructure Log Sanitization และ DB/Storage Outage เต็มระบบ | NOT TESTED; Injected Transaction/Commit Errors ผ่าน แต่ไม่จำลองทุก Outage |
| Automatic Reconciliation/Purge ของ Bytes ที่ยืนยัน Commit Outcome ไม่ได้ | ยังไม่พัฒนา; เก็บ Bytes ไว้เพื่อไม่สูญเสียข้อมูลจนมี Policy |

## 10. รายชื่อไฟล์ที่เปลี่ยนใน Phase 3A

รายการนี้เทียบกับ Baseline ก่อน Phase 3A ไม่ใช่ทุกไฟล์ที่ Git แสดง Modified/Untracked จากงานก่อนหน้า

- backend/src/config/storage.js
- backend/src/controllers/studentProfile.controller.js
- backend/src/middlewares/upload.middleware.js
- backend/src/models/index.js
- backend/src/routes/studentProfile.routes.js
- backend/test/studentAdvisor.test.js
- backend/test/studentProfileIntegrity.test.js
- backend/test/helpers/studentProfileIntegrityFixture.js
- frontend/src/api/studentProfile.api.js
- frontend/src/pages/student_coop.js
- frontend/test/studentAdvisor.test.js
- frontend/test/studentProfileIntegrity.test.js
- backend/src/controllers/studentProfileAggregate.controller.js
- backend/src/models/registerStudentProfileAggregate.js
- backend/src/services/studentProfileAggregate.service.js
- backend/src/services/studentProfileFiles.service.js
- backend/src/services/studentProfileValidation.js
- backend/test/studentProfileAggregatePostgres.test.js
- backend/test/studentProfileValidation.test.js
- backend/scripts/runStudentProfilePhase3AIntegration.js
- frontend/test/studentProfileAggregateCompatibility.test.js
- docs/audits/FITM_STUDENT_PROFILE_PHASE3A_DATABASE_VERIFICATION.json
- docs/audits/FITM_STUDENT_PROFILE_PHASE3A_POSTGRES_RESULTS.json
- docs/audits/FITM_STUDENT_PROFILE_PHASE3A_IMPLEMENTATION.md

ส่วนที่ทำต่อหลัง Usage Limit: Safe Integer Guard/Regression, Upload Durable Reference Cleanup/Commit Failure Regression, รันชุดตรวจทั้งหมดและ Final Read-only Verification พร้อมรายงาน ส่วน CRUD/Revision/Client ที่ทำไว้ก่อนหน้านี้ถูกตรวจและรักษาไว้

## 11. ปัญหาคงเหลือและความพร้อม Phase 3B

**BLOCKED เฉพาะนโยบายเลขบัตรประชาชน:** Schema เตรียม Ciphertext/Key Version แล้ว แต่ยังไม่มี Encryption Key Management/Rotation/AEAD/Masking/Retention Policy ที่ยืนยัน จึงไม่เปิด Plaintext National ID Write/Decrypt API และไม่ยอมให้ Client เขียน Ciphertext/Key Version เอง ส่วนวันที่บัตรและเอกสารสำเนามี API ตามที่ระบุ

**BLOCKED เฉพาะการรับรองและลายเซ็น:** Audit ระบุว่าต้องอ้างคำร้อง/Statement Version/Frozen Snapshot/File Versions และ Retention/Withdrawal Rules ยังไม่ยืนยัน และไม่มี Acknowledgement/Signature Tables ที่อนุมัติ จึงไม่สร้าง Boolean รับรองหรือระบบคำร้องซ้ำ ไม่ปรับ Approval Workflow หากจะพัฒนาส่วนนี้ต้องยืนยัน Policy แล้วเสนอ Schema/Migration แยกก่อน

ยังต้องยืนยัน Required/Ready-to-Apply Rules, Master/Vocabulary และความหมาย GPA ตามข้อกำหนดจริง รวมถึง Document Acceptance/Retention/Role Access ก่อนประกาศว่ากรอกครบและพร้อมยื่นคำร้อง การบันทึก Draft และ CRUD ที่ทำใน Phase นี้ใช้งานได้โดยไม่บังคับทุกช่อง

Backend พร้อมให้ Phase 3B ใช้ Owner Snapshot, Dirty Partial Update, Revision/Conflict, Child CRUD และ Private Document APIs ในขอบเขตที่ผ่านการทดสอบ ส่วน Policy ที่ BLOCKED ต้องแยกเป็น Pending ใน UI งาน Phase 3A สิ้นสุดและหยุดรอคำสั่ง ไม่เริ่ม Phase 3B

