# FITM Student Profile — Phase 2A Schema & Migration Preparation

วันที่ตรวจ 2026-10-10 (Asia/Bangkok). เตรียม Source และตรวจความเข้ากันได้เท่านั้น **ไม่ได้รัน Migration ไม่ได้เปลี่ยน Schema/แถวข้อมูล PostgreSQL** และไม่ได้เปิดความสามารถใหม่ใน Runtime

## หลักฐานและขอบเขต

อ่าน profile.pdf ด้วย PDFParse ได้ 4 หน้า และตรวจ SHA-256 ตรงกับ Inventory เดิม: 7e0279a7479fbf163bdda40dd2dbca1cf514bfd00153bf9d27da7ddc6bea11f8 ไม่คัดลอกค่าบุคคลในตัวอย่าง การตรวจภาพทั้ง 4 หน้าเป็นหลักฐาน Audit เดิม; รอบนี้อ่าน text/โครงสร้างและรายงานเดิม ไม่อ้างว่าได้ทำ visual audit ใหม่

อ่าน PDF_FIELD_INVENTORY, FIELD_MAPPING, MISSING_FIELDS, DATABASE_DESIGN, UXUI_PLAN และ PHASE1_IMPLEMENTATION; ตรวจ Git Status ก่อนแก้ไข และรักษา uncommitted changes เดิมไว้ รวมถึงไฟล์ Internship Logs ที่มีการแก้จากงานก่อนหน้า

ตรวจ Source ของ Models, loader, routes/controllers/API clients, storage/upload/file service, Umzug และ Migration เดิม 22 ไฟล์ (001–021 รวม 007a) โดยไม่ import runner หรือเรียก up/down/status

สคริปต์ auditStudentProfilePhase2A.js ใช้ pg.Client โดยตรง ตั้ง default_transaction_read_only=on, BEGIN READ ONLY, ยืนยัน SHOW transaction_read_only=on, อ่าน catalog/ชื่อ Migration ใน sequelize_meta แล้ว ROLLBACK ไม่ SELECT แถว Student/Profile/File/Request/Account และไม่แสดง credential

ผล Schema จริง: PostgreSQL 16.15, public tables 29 ตาราง, executed 19 Migration (001–018 รวม 007a), 017/018 installed; Pending คือ 019_add_supervision_appointments.js, 020_add_supervision_results.js, 021_add_coop_activities.js ไม่มี prepared schema อยู่ใน DB

หลักฐาน metadata: [Schema snapshot](FITM_STUDENT_PROFILE_PHASE2A_SCHEMA_SNAPSHOT.json). ตาราง/ชนิด/constraints/indexes ที่ตรวจเป็นสถานะ ณ inspected_at เท่านั้น ต้องตรวจซ้ำก่อน Phase 2B

## 1–4. ฟิลด์ที่ใช้ซ้ำ / ฟิลด์ใหม่ / ตารางเดิม / ตารางใหม่

[Field Coverage & Schema Dictionary](FITM_STUDENT_PROFILE_PHASE2A_FIELD_COVERAGE.md) แจกแจงครบ 148 จุด PDF พร้อม Audit status เดิม, แหล่งข้อมูล, ประเภทแผน และ Data Types/Nullable/Defaults/FK/Unique/Indexes/CHECK ทุกคอลัมน์ที่เตรียม

| ประเภทแผน | จำนวนจุด PDF | ความหมาย |
| --- | ---: | --- |
| Existing Column | 24 | ใช้ข้อมูลเดิม รวม age ที่คำนวณจาก birth_date ไม่เก็บคอลัมน์อายุ |
| New Scalar Column | 20 | จุด PDF ที่ต้องใช้คอลัมน์เพิ่มในตารางเดิม; มีช่องซ้ำ เช่น คณะหน้า 1/4 |
| New Relation/Table | 63 | จุดซ้ำตามแถว PDF ใช้ตารางรายการร่วมกัน ไม่สร้างคอลัมน์ตามจำนวนช่อง |
| Existing File Storage | 5 | ใช้ student_files/storage เดิม เพิ่มประเภทและรายละเอียด |
| Existing Workflow | 16 | รักษาขอบเขตและระบุ semantic gap ไม่อ้างว่าใช้แทน PDF ได้ครบ |
| Pending Policy | 20 | ต้องยืนยันความหมาย/การรับรอง/Workflow/ลายเซ็นก่อนพัฒนา |

ประเภทข้างต้นเป็น **แผน** ไม่ใช่ผล Implementation ของฟิลด์ใหม่ Audit เดิมยังคง COMPLETE 24 / PARTIAL 12 / MISSING 96 / DIFFERENT WORKFLOW 16

ตาราง students เดิมเพิ่ม department, faculty, last_semester_gpa แบบ nullable และ profile_data_revision BIGINT NOT NULL DEFAULT 0 เป็น metadata ใช้ Student/Account เดิม ไม่มีโมเดลบัญชีซ้ำ

ใช้ first_name/last_name/student_id/email/major/year_level/profile_image/advisors เดิมตามสิทธิ์เดิม ไม่เพิ่มข้อมูล identity ซ้ำ Student.gpa ยังไม่ยืนยันว่าเป็น GPA สะสม จึงคงเดิมและรอ policy ไม่สร้าง cumulative_gpa ที่อาจมีสองแหล่ง ไม่เอา gpa เดิมไปเติม last_semester_gpa

student_profiles เดิมเพิ่ม 18 nullable columns: ชื่ออังกฤษ 2 ช่อง, gender, national_id_ciphertext/key_version, วันที่ออก/หมดอายุบัตร, มีใบขับขี่/เลขที่/ประเภท/วันหมดอายุ, military_status, ที่อยู่/โทรศัพท์บิดาและมารดา, อาชีพ/สถานที่ทำงานผู้ติดต่อฉุกเฉิน

national_id เก็บ encrypted bytes พร้อม key version เป็นคู่ ไม่มี plaintext/duplicate hash/unique identifier ที่ยังไม่มี policy หมายเลขใบขับขี่ยังต้องยืนยันความจำเป็น/การป้องกันก่อนเปิดใช้ gender/license type เป็น nullable text จนมี vocabulary; military_status รองรับสองตัวเลือก PDF served/not_yet_served และ NULL=ยังไม่ทราบ (N/A รอ policy ไม่ใช้ not_yet_served แทน)

| ตารางใหม่ที่มี Source | ความสัมพันธ์ / Constraint | ข้อมูล / พฤติกรรม draft |
| --- | --- | --- |
| student_addresses | Student 1:N, UUID PK, FK student_id DELETE CASCADE / UPDATE RESTRICT; UNIQUE(student_id,address_type) | registered/current; บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์ nullable |
| student_education_records | 1:N; owner/order/id index; ไม่ UNIQUE ต่อระดับ | bachelor/high_vocational/high_school_vocational; สถานศึกษา วุฒิ วิชาเอก GPA ปีจบ nullable; GPA 0–4, CE ปี 1–9999 |
| student_training_records | 1:N; owner/order/id index | หลักสูตร สถาบัน วุฒิ period_text nullable; ไม่จำกัด 5 รายการ ไม่สมมติวันที่จากข้อความ |
| student_skills | 1:N; owner/category/order/id index | computer/language; ชื่อ nullable ใน draft; rating very_good/good/moderate/fair หรือ NULL |

ตารางใหม่ใช้ UUID ที่ Application สร้าง ไม่เปลี่ยน UUID ของ Student เดิม; timestamps ใช้ server-managed timestamptz; display_order DEFAULT 0 และ >=0; อนุญาต draft ไม่สมบูรณ์ ไม่ถือว่า record nullable ผ่าน readiness ของใบสมัคร

กฎ Ownership: JWT owner เป็นแหล่ง student_id เท่านั้น; query/update/delete ต้องมี owner predicate และตรวจ stable UUID; id/student_id/created_at/updated_at/counter/file hashes เป็น read-only ไม่ยอม reparent records; การมี FK ไม่แทน authorization. ไม่มี RLS ใหม่ใน Source

Validation ตอนเปิด API ในอนาคต: trim/ความยาวตาม varchar, GPA 0–4 ไม่เกิน 2 ตำแหน่ง, ปีจบแปลง พ.ศ.→ค.ศ.อย่างชัดเจน, phone ใช้กฎ Phase 1 7–20 digits และชุดเครื่องหมายที่อนุญาต; วันที่ใช้ raw YYYY-MM-DD + isCalendarDate เดิมก่อน ORM เพื่อกัน JS rollover (PostgreSQL DATE ตรวจวันที่จริงอีกชั้น); คู่ ciphertext/key, expiry>=issue เมื่อมีทั้งคู่, has_driving_license=false ต้องไม่มีรายละเอียดใบขับขี่; true ยังบันทึก draft ที่ไม่ครบได้ ไม่เพิ่มกฎอายุ/วันหมดอายุจากการคาดเดา

### การรักษาข้อมูลเดิมและแผน Backfill

- เก็บ 28 Profile fields เดิมทั้งหมด รวมสุขภาพ แพ้ยา ทักษะ free text ผู้ปกครอง และ contact เดิม ไม่ rename/remove/overwrite
- hometown_address/current_address ยังเป็น free text เดิม ส่วน structured address เริ่มไม่มี record ไม่ parse/ตัดข้อความอัตโนมัติ; ให้ผู้ใช้ตรวจและยืนยันก่อนสร้าง record ในงานที่อนุมัติภายหลัง
- hometown_phone ต้องยืนยันความหมายทะเบียนบ้านก่อนใช้; current_phone ใช้ต่อเป็นแหล่งเดียว ไม่เพิ่ม phone ที่อยู่ซ้ำใน relation
- special_abilities/related_skills ไม่แยก comma/newline หรือเดาระดับความสามารถ; ให้ผู้ใช้ยืนยันแต่ละรายการโดยเก็บข้อความต้นฉบับไว้ ไม่มี silent delete เมื่อข้อมูลรายการเริ่มถูกใช้
- education/training ไม่มี backfill จาก Student.major/gpa หรือ prerequisites เพราะความหมายไม่เท่ากัน
- ทุก nullable scalar เริ่ม NULL; relations เริ่ม empty; metadata revision=0/is_current=true เป็น default เฉพาะ metadata ไม่ใช่การเดาข้อมูลบุคคล
- ถ้าภายหลังอนุมัติ Backfill ต้องทำบนสำเนาข้อมูลที่ได้รับอนุญาตก่อน บันทึก count/owner IDs แบบไม่แสดง PII, ตรวจ digest ของคอลัมน์ legacy ก่อนและหลัง, idempotency และ conflicts; backfill ผ่าน owner lock/revision transaction ห้าม upsert ทับค่าที่ผู้ใช้แก้ระหว่างนั้น; ไม่มี Backfill Source หรือการรันใน Phase 2A

## 5. Existing Workflow และ Semantic Gaps

คง coop_requests, coop_request_reviews, coop_documents/revisions, companies, prerequisite courses, coop project/advisor workflow เดิม ไม่มีการเพิ่ม stage หรือคอลัมน์การอนุมัติใน Profile

| ข้อมูล PDF / Audit | ใช้ระบบเดิมและข้อจำกัด |
| --- | --- |
| ชื่อนักศึกษา/โทรศัพท์ในใบสมัคร | request.student/profile เป็นข้อมูลสด ยังไม่ใช่ snapshot ณ วันสมัคร |
| บริษัทที่เลือกอันดับ 1–3 | คำร้องเดิมมีบริษัทหนึ่งแห่ง; search/job matches ไม่ใช่ ranked preferences; Pending Policy |
| บริษัทที่ได้ไปปฏิบัติงาน | ใช้ request.company_id/company_name ของคำร้องที่สถานะถูกต้องตาม Workflow เดิม; ไม่อ้างว่าเป็นผลจัดสรรหลายอันดับ |
| วันเริ่ม/สิ้นสุดงาน | ใช้ coop_requests.work_start_date/work_end_date ไม่ย้ายสิทธิ์แก้มา Profile |
| ความพร้อมวิชาการ/ความประพฤติ | prerequisite courses/ผลอนุมัติรวมไม่ใช่ verdict รายเกณฑ์; reason ของ reviews ไม่ใช่หมายเหตุสองชนิดแยกกัน |
| ผู้รับหนังสือ/ตำแหน่ง | ใช้ coop_requests.letter_recipient_name/letter_recipient_position_department |
| ผู้พิจารณาและเวลาพิจารณา | ใช้ actor_role/teacher_id/department_staff_id/created_at ตามเดิม; ไม่ใช้แทน identity/date ของลายเซ็น |
| หัวหน้าภาค “รอพิจารณา” | approve/reject ไม่ใช่ defer; ไม่แปลง reject.reason เป็นเหตุผลรอ |
| เสนอชื่ออาจารย์นิเทศ | coop_advisor_teacher_id/AdvisorRequest เป็น assignment ที่ยืนยัน ไม่ใช่ nomination ของ Head ตาม PDF |
| ลายเซ็นและผลสถาบัน | signatory_name ในเอกสารไม่ใช่หลักฐานลายเซ็น; institute stage ไม่มีในระบบ ห้ามสมมติกฎ |

ทั้ง 16 DIFFERENT WORKFLOW points คง Audit status ใน coverage รวมถึงจุดที่มี semantic gap งานเติม Workflow เหล่านี้ต้องอนุมัติแยกจาก Profile schema

### การรับรองข้อมูล — หยุดไว้ที่ Pending Policy

schema.js มี proposed design สำหรับ student_profile_acknowledgements และ student_acknowledgement_documents **ไม่มี Migration/Sequelize registration/API ของส่วนนี้** ต้องยืนยัน statement text/version, การแก้ข้อมูลหลังรับรอง, ใบสมัครที่ผูก, snapshot scope, encryption และ retention ก่อน

ข้อเสนอ: append-only acknowledgement ผูก owner กับ coop_requests เดิมผ่าน composite FK (request_id, student_id) ต้องเพิ่ม UNIQUE(id, student_id) ให้ coop_requests ภายหลัง หากอนุมัติ; statement_type information_accuracy/coop_rules, statement_version, accepted_at จาก server, profile_revision/counter ณ ขณะรับรอง, encrypted minimal snapshot + key version + SHA-256 และรายการ file IDs/version/content hash แบบ same-owner FK RESTRICT

Hash/revision เพียงอย่างเดียวไม่พอ reconstruct ข้อมูลที่รับรอง ต้องมี snapshot ที่อนุมัติ scope หรือ immutable artefact ที่อ้างถึงได้ หากไม่เก็บ snapshot ต้องยอมรับข้อจำกัดหลักฐานก่อน ระบุ timestamp การรับรองเป็นคนละเหตุการณ์กับลายเซ็น ไม่สร้างภาพลายเซ็น/OTP/e-signature/กฎทางกฎหมายเอง

RESTRICT เป็นข้อเสนอเพื่อกันลบหลักฐาน ไม่ใช่นโยบายเก็บตลอดไป ต้องกำหนด retention/deletion/สิทธิ์ถอนรับรองและการลบ Student ก่อนออก DDL ส่วนนี้ และต้องอนุมัติข้อยกเว้นการล้างข้อมูลตามนโยบายด้วย

## 6–7. Migration Source และแผนติดตั้ง

Source อยู่ที่ backend/src/db/prepared/student-profile-phase2a/ ซึ่งอยู่นอก glob *.js ของ backend/src/db/migrations และนอก loader backend/src/models/*.model.js ไม่แก้ live model หรือ loader ไม่เพิ่ม require จาก Runtime

| Source filename (proposed order) | สิ่งที่เตรียม |
| --- | --- |
| 022_prepare_student_profile_scalars.js | ADD nullable scalar columns + revision metadata + CHECK ใหม่ ไม่มี DML/Backfill |
| 023_prepare_student_profile_relations.js | CREATE เฉพาะ 4 ตารางใหม่พร้อม owner FK/unique/index/CHECK |
| 024_prepare_student_profile_file_types.js | Append enum 5 ประเภทเท่านั้น; commit แยกก่อน 025 |
| 025_prepare_student_profile_document_metadata.js | เพิ่ม file metadata, same-owner supersedes FK และ indexes เฉพาะประเภทใหม่ |

ทุก up มี Phase 2B guard ปฏิเสธ QueryInterface ปกติก่อน SQL; guard เป็นการป้องกัน accidental use ไม่ใช่ระบบอนุมัติแทนผู้ใช้ ไม่มีคำสั่งติดตั้ง/runner ใหม่ที่พร้อมรันใน Phase นี้ แต่ละ up ใช้ managed transaction, lock_timeout 5s, statement_timeout 60s; failure ต้อง rollback แล้วประเมิน lock window ใหม่ ไม่ retry ติดตั้งอัตโนมัติ

Sequelize source เป็น factories/extension attributes เท่านั้น: merge into existing Student/StudentProfile/StudentFile หลัง Schema พร้อม ไม่สร้าง Student/Account ใหม่ และ append file indexes โดยไม่แทนที่ indexes เดิม Composite FK/CHECK ให้ Migration จัดการ ไม่ใช้ sequelize.sync()

Source ก่อนนำไปใช้ต้องผ่าน review และทดสอบ PostgreSQL สำเนาแบบ disposable ที่ผู้ใช้อนุมัติ ตารางว่างและ legacy fixtures, enum transaction, mixed old/new files, cross-owner FK, rollback/failure, concurrency แยก connections และ ownership; ตอนนี้ไม่มีผล DDL execution จริง

**แผน Phase 2B เมื่อได้รับอนุมัติเท่านั้น**

1. ตรวจ metadata/filename collision/schema drift ใหม่, backup ที่กู้คืนทดสอบได้, ระบุ DB target/maintenance window และขอบเขต PII ที่อนุมัติ ห้ามใช้ schema snapshot ปัจจุบันแทน preflight ล่าสุด
2. ตัดสินใจ Pending 019–021 แยกชัดเจน ไม่มี dependency ของ Profile Source นี้กับ supervision/activities; ห้ามใช้ db:migrate up แบบไม่มีการเลือก เพราะ runner ปัจจุบันจะติดตั้ง Pending ทั้งหมดด้วย ต้อง review targeted runner/Umzug ledger ที่เลือกเฉพาะชื่อที่อนุมัติ หรืออนุมัติ Pending เหล่านั้นแยกก่อน
3. คง bundle/dependency paths และ staged models ไว้นอก Runtime; ติดตั้งเฉพาะ 022→023→024 แล้ว COMMIT 024 ก่อนเริ่ม transaction ของ 025 ห้ามครอบ 024+025 ด้วย transaction ใหญ่เดียวกัน PostgreSQL ไม่อนุญาตใช้ enum value ใหม่ก่อน commit
4. enum append ไม่ rebuild/drop type; 025 CHECK/index มี scope new types; constraint ใส่เฉพาะคอลัมน์ใหม่ซึ่ง legacy เป็น NULL จึงไม่มีการบังคับ clean คอลัมน์เดิม; ข้อมูล file_type เดิมยังผ่าน metadata check ได้ ไม่สั่ง UPDATE ตารางเก่า
5. Index ปกติอาจ block writes โดยเฉพาะ composite unique ของ student_files ต้องประเมินจำนวน rows/locks บนฐานที่อนุมัติ ก่อนเลือก maintenance window หรือแยก CONCURRENTLY migration ภายหลัง (ห้ามใช้ CONCURRENTLY ใน transaction นี้)
6. ตรวจ metadata/constraints/legacy column digests/record counts และ API เดิมก่อนเปิด models; ไม่ใส่ private attrs ใน live model ก่อน DTO/authorization พร้อม
7. เปิด API/write routes ใหม่ได้เมื่อ Revision รวม, role DTOs, file access/version/retention และ clients ครบแล้วเท่านั้น Schema installed อย่างเดียวไม่ให้ความสามารถ concurrency ใหม่

Rollback strategy: **rollback application code และคง additive schema/data** ไม่มี automatic down ที่ drop columns/tables หรือ delete แถว ทุก down throw PRESERVE_DATA โดยไม่เรียก DB enum values ที่เพิ่มแล้วคงไว้ ไม่ rebuild enum เพื่อย้าย/ลบ legacy files ขณะ rollback หากต้องถอด schema จริงต้องขอแผน cleanup/backup/restore แยกและตรวจ dependency/data ไม่ให้ข้อมูลที่เพิ่มหลังเปิดใช้สูญหาย

## 8. Profile Revision และ Phase 1 Compatibility

### ตรวจ Client/API ปัจจุบัน

ค้น updateMyStudentProfile, path student-profile และ HTTP callers ใน frontend/src/tests/backend/scripts ทั้ง API alias / และ /me ใช้ controller เดียวกัน

| จุดเรียก / endpoint | สถานะที่ยืนยัน |
| --- | --- |
| frontend/src/api/studentProfile.api.js → PUT /api/student-profile/me | ต้องมี revision; ส่ง If-Match |
| frontend/src/pages/student_coop.js → updateMyStudentProfile(payload, revision) | ส่ง frozen dirty payload/revision จาก draft; production profile caller ที่พบมีจุดนี้ |
| backend/scripts/verifyStudentProfileBrowser.js | harness import API client เดียวกัน ไม่ bypass revision |
| backend/test studentProfileIntegrity / frontend/test studentProfileIntegrity | missing/precondition/stale paths เป็น negative fixtures ที่ตั้งใจ; ไม่มี legacy production PUT / หรือ /me ที่ขาด revision พบใน repo |
| PUT /api/student-profile/student-info | **Compatibility gap:** updateStudentInfo(data) ส่ง major/year_level/gpa/advisor_teacher_id โดยไม่มี revision; server ไม่ใช้ transaction/owner lock ของ Profile |
| POST profile-image / resume | endpoints แยก ไม่มี If-Match; phase1 hash ไม่ครอบ Student.profile_image/files; ไม่เพิ่ม precondition โดยพลการ |

ไม่มีหลักฐานของ external client ที่อยู่นอก repo จึงยังยืนยันความเข้ากันได้กับ external clients ไม่ได้

Phase 1 /me และ /: body valid แต่ไม่มี If-Match → 428; malformed quoted token → 400; stale → 409 พร้อม latest authorized profile/revision และไม่มี write; unsupported/readonly fields → 400 (validation body ทำก่อน precondition จึง invalid body อาจได้ 400 แม้ไม่มี header ไม่อ้างว่าทุก body ไม่มี header ได้ 428)

Transaction lock Student owner UPDATE ก่อน Profile row UPDATE จึง serialize first-create ได้; compare token ภายใน transaction; update เฉพาะ changed fields ด้วย Sequelize fields option และ reload DB representation ก่อนคืน revision

คง omitted=preserve / null หรือ blank=explicit clear / unchanged=no-op และ date Gregorian/leap century/Bangkok boundary, dirty fields/tab-switch/refresh logic ทุกส่วน ไม่แก้ไฟล์ Phase 1

API contract ก่อนและหลัง Phase 2A **เหมือนเดิม**: GET คืน profile_revision top-level quoted SHA-256; PUT JSON 28 fields allowlist เดิม + If-Match; response shape/code เดิม; ไม่มี relational payload/doc routes ใหม่ Token ปัจจุบัน hash owner + profile id/updatedAt/28 values เท่านั้น

### ข้อเสนอ aggregate revision (ยังไม่ activate)

ใช้ students.profile_data_revision BIGINT เป็น aggregate change counter เพราะ owner มีอยู่ก่อน Profile; อ่านเป็น decimal string ไม่แปลง Number (เกิน safe integer ได้) และไม่รับ counter จาก client ไม่มี writer/trigger ที่เพิ่ม counter ใน Phase 2A; DEFAULT 0 ไม่ได้ป้องกัน lost update จนเปิดกลไกครบ

เสนอ future token เป็น quoted SHA-256 รูปแบบเดิมของ canonical [version tag, owner ID, Phase1 snapshot, aggregate counter, approved academic/profile scalars] ทุก child/file mutation ต้องเปลี่ยน counterใน transaction เดียวกัน Token ไม่เปิดเผยค่า PII; แบบนี้ป้องกันการเปลี่ยนหลายตารางโดยไม่ขยาย body allowlist เดิม แต่เป็นการเปลี่ยนขอบเขต revision ต้องอนุมัติและ roll out พร้อม clients

ทุก writer (28 scalar, new scalars, address/education/training/skills create/update/delete, new profile documents, academic/photo ที่รวมในขอบเขต) ต้อง lock owner UPDATE ก่อนโหลด/validate revision, scope records by owner, compare If-Match ก่อน writes, mutate only explicit dirty fields/stable IDs, increment counter แบบ SQL atomic, reload snapshot/counter ภายใน transaction แล้วคืน tokenหลัง commit

GET aggregate ต้องอ่าน consistent snapshot ด้วย transaction + owner SHARE lock ก่อน child reads (และ writers ทุกเส้นทางต้อง owner-lock-first) หรือ isolation REPEATABLE READ ที่ออกแบบ/ทดสอบให้สอดคล้องกัน ห้ามอ่าน counter/children ต่าง snapshot แล้วสร้าง validator ที่ไม่ตรงข้อมูล

Omitted relation=preserve; empty arrays ห้ามถือว่าลบทุกรายการ; deletes เป็น explicit IDs ของ owner; foreign child ID ต้องปฏิเสธ การเปลี่ยนจากสอง Browser Tabs (แม้ต่างหมวด) ใช้ revisionเดียวกัน: first commit success, second 409 และ rollback child/file/counterทั้งหมด ให้ draftคงอยู่และให้ผู้ใช้ review/rebase

เสนอ DB trigger เป็น defense ต่อ direct SQL/forgotten writer สำหรับ child/academic/profile-document mutation โดยบังคับ immutable ownership/owner-lock order และ increment counter ใน transaction เดียวกัน ต้อง review/test แยกก่อนออก Source ไม่เพิ่ม triggerตอนนี้ ต้องเลือกให้ชัด service+trigger เพื่อไม่ bumpซ้ำ; จำนวน counter increments อาจต่อ row ไม่ควรถือว่า +1 ต่อ request

academic /student-info และ photo writer ที่ยังไม่ versioned เป็น **เงื่อนไขก่อนเปิด aggregate**: ต้องอนุมัติปรับ If-Match/read revision/lock/service ทั้งสองฝั่ง และทดสอบ concurrent writes; การเพิ่ม counterอย่างเดียวหรือเปลี่ยน hash เฉพาะ /me ไม่แก้ช่องนี้ Resume/project/log/approval ไม่ถูกดึงเข้าขอบเขตใหม่โดยอัตโนมัติ ต้องระบุขอบเขตจริงอย่างชัดเจนตาม profile evidence ที่รับรอง

v1 tabs ที่เปิดก่อน switch อาจได้ 409 เมื่อพบ v2 hashแม้ไม่แก้ข้อมูล ให้ refresh/review โดยเก็บ draft; ห้าม fallback ยอมรับ v1 token กับ relation writes เพราะจะข้าม concurrency gate Client ที่ไม่ใช้ /me revision หรือ hardcode algorithm ต้องประเมินเพิ่ม ไม่ออก token format/API ใหม่ใน Phase 2A

Acknowledgement (เมื่อ policy approved) ต้อง lock ownerและowned request, check revision, frozen approved snapshot + fileversion references ใน transactionเดียวกัน; การเพิ่ม acknowledgementเองไม่ควร invalidate snapshotที่เพิ่งรับรองด้วย counter bumpของ profile

## 9. Private Files และข้อมูลส่วนบุคคล

ใช้ student_files เดิมและ private storage เดิม ไม่มี file storage system/public URL ใหม่ enum เพิ่ม transcript/national_id_copy/student_id_copy/supporting_other/external_profile_pdf (ประเภทหลังเป็นการเก็บต้นฉบับอนาคต ไม่ใช่ PDF import/OCR/extraction code)

metadata ใหม่ document_label/content_sha256/document_version/supersedes_file_id nullable สำหรับ legacy; new typesต้องมี hash/version และ otherต้องมี label; hashคำนวณจาก bytesที่ serverรับจริง version/hash/path/is_current ต้อง server-managed การเปลี่ยน is_current ใช้ owner-lock/revision transaction การ supersedeต้อง same owner/type, ตรวจ cycleและversion succession ก่อน writes

single current documentต่อ owner/type สำหรับ transcript/id/student ID/external PDF; otherมีหลายไฟล์ได้ old resume/current project/storage path unique indexes คงเดิมทุกตัว ไม่มี resume log/project endpoint รับประเภทใหม่ใน Phase นี้

ไฟล์ใหม่ต้องใช้ stable immutable row/version/path เมื่อ replace ให้เพิ่ม rowและmark previous current=false; ห้ามใช้การ update same row/delete previous physical file แบบ resume/projectปัจจุบันกับหลักฐานที่เคยรับรอง ต้องมี retention cleanup ที่ตรวจ acknowledgement refs ก่อนลบbytes ห้ามอ้างว่า same-owner FK ป้องกันการลบphysicalfileได้

การเปิด handlers ภายหลังต้อง reuse private owner directory scheme โดย review category allowlistเดิม, reject cross-owner file ID, enforce normalized realpath/root/categoryรวม symlink, validate MIME+extension+magic bytes+size/emptyfile; resume/profile imageปัจจุบันพึ่ง client mimetypeใน middleware ไม่เพียงพอสำหรับเอกสารส่วนบุคคลใหม่ project file serviceมี guardบางส่วนที่นำมาทบทวนใช้ซ้ำได้ ไม่เปลี่ยน serviceเดิมตอนนี้

preview/download ต้อง authenticated endpoint + owner/approved role scope, safe Content-Disposition, no-store และไม่เผย storage_path/raw extracted text/IDใน response/log; hash/versionอาจเผยใน owner DTOเฉพาะจำเป็น ไม่ใช้ public/static URL

ความเสี่ยงของ model activation: Student.toJSON ซ่อนเพียง password/password_hash ส่วน StudentProfile response/includeเลือก attributesไม่ครบทุก route การเพิ่ม ciphertext/key/เลขใบขับขี่หรือ family dataลง live modelโดยไม่มี explicit DTOอาจทำให้ข้อมูลถูกส่งไป roleอื่น ต้องกำหนด allowlisted DTO/role projection ก่อนเปิด live attrs ไม่ถือว่า ciphertextเผยแพร่ได้เพราะเข้ารหัสแล้ว

ลดการเก็บข้อมูล: ไม่เก็บอายุที่เปลี่ยนตามเวลา/ID plaintext/ผล checkboxแทนไฟล์/สำเนาบริษัทหรือreview, ไม่ OCRเอกสารใหม่โดยปริยาย, ไม่ส่ง health/IDfamilydetailsใน snapshotจน policyยืนยันว่าจำเป็น กำหนด encryption key management/rotation/AEAD, masking, retention/deletion/backup access และ access audit โดยไม่ logPII ก่อนเปิดใช้จริง

## 10. รายชื่อไฟล์ที่เพิ่มใน Phase 2A

ไม่มีการแก้ existing runtime/frontend/Phase1 files รอบนี้ เพิ่มเฉพาะ:

- backend/scripts/auditStudentProfilePhase2A.js — catalog/ledger read-only audit
- backend/scripts/prepareStudentProfilePhase2AReference.js — local documentation generator
- backend/src/db/prepared/student-profile-phase2a/README.md
- backend/src/db/prepared/student-profile-phase2a/schema.js
- backend/src/db/prepared/student-profile-phase2a/models.js
- backend/src/db/prepared/student-profile-phase2a/migrationSupport.js
- backend/src/db/prepared/student-profile-phase2a/migrations/022_prepare_student_profile_scalars.js
- backend/src/db/prepared/student-profile-phase2a/migrations/023_prepare_student_profile_relations.js
- backend/src/db/prepared/student-profile-phase2a/migrations/024_prepare_student_profile_file_types.js
- backend/src/db/prepared/student-profile-phase2a/migrations/025_prepare_student_profile_document_metadata.js
- backend/test/studentProfilePhase2APreparation.test.js
- docs/audits/FITM_STUDENT_PROFILE_PHASE2A_SCHEMA_SNAPSHOT.json
- docs/audits/FITM_STUDENT_PROFILE_PHASE2A_FIELD_COVERAGE.md
- docs/audits/FITM_STUDENT_PROFILE_PHASE2A_PREPARATION.md

## 11. ผลการทดสอบ

| การตรวจ | ผล |
| --- | --- |
| Phase 2A preparation tests | 13/13 ผ่าน ด้วย disconnected Sequelize และ mock QueryInterface/transactions |
| Existing Backend Tests รวม Phase 1/2A | 247 tests: PASS 230, SKIP 17, FAIL 0 |
| Existing Frontend Tests รวม Phase 1 | 281 tests: PASS 279, SKIP 2, FAIL 0 |
| Syntax | node --check ผ่านไฟล์ JavaScript ใหม่ทั้งหมด 10 ไฟล์ |
| Existing Source/Test preservation | SHA-256 เทียบไฟล์เดิม 270 ไฟล์ก่อน/หลัง: ไม่เปลี่ยน |
| Schema/ledger metadata ก่อน/หลัง | digest ตรงกัน (ไม่นับ inspected_at); Pending ยังคง 019–021 |
| Git diff --check | ผ่าน; มีเพียงคำเตือน LF→CRLF ของ existing working tree |
| Frontend Build รอบ Phase 2A | ไม่รันซ้ำ เพราะไม่มีการแก้ Frontend/Runtime/dependency; ผล Build ของ Phase 1 ดูรายงานเดิม |

คำสั่งทดสอบที่ใช้:

~~~powershell
# backend: ปิด DB-writing integration flags ใน environment ของ process ทดสอบ
$env:RECRUITMENT_INTEGRATION_TEST='false'
$env:ROLE_BACKEND_INTEGRATION_TEST='false'
$env:STUDENT_FILE_MIGRATION_TEST='false'
node --test
# frontend (separate working directory)
node --test
# focused source/model review โดยไม่ใช้ subprocess isolation
node --test --test-isolation=none test/studentProfilePhase2APreparation.test.js
~~~

Backend/Frontend tests ใช้ mocks/fixtures ตาม suite; database/browser integration tests ที่ต้อง opt-in ถูก Skip ไม่เปิด acceptance scripts ที่เขียนฐานข้อมูลจริง ไม่มีการส่ง DDLไป PostgreSQL

ตรวจ Source/model factories/nullable preservation/no overwrite/owner FK/fileenumcommit order/index scope/transaction error propagation/automatic rollback guard/148 coverage และกฎ education/GPA/proficiency ทดสอบว่า ordinary QueryInterfaceปฏิเสธก่อน SQL

ผล prepared tests ไม่ยืนยัน PostgreSQL DDL execution, FK/index lockจริง, encryption/storage/retention หรือ transaction isolation/deadlockจริง Database testsที่เขียนจริงต้อง disableใน Phaseนี้ ไม่ใช้บัญชีนักศึกษาจริง

## 12. สิ่งที่ต้องอนุมัติและปัญหาที่ยังเหลือ

ต้องได้รับอนุมัติ **Phase 2B** ก่อนติดตั้ง Migrationใด ๆ รวม targetDB/backup/disposabletestDB/selectedmigration names และวิธีจัดการ Pending019–021

ต้องยืนยันความหมาย gpa/hometown, masterคณะภาควิชา, vocabularygender/licensetype/militaryN/A, fieldrequired/readinessและทก.01ต้นฉบับ, policyเอกสารMIME/size/retention/role access/encryption, statement/snapshot/acknowledgement และวิธีลงนามทางกฎหมายแยกต่างหาก ส่วนที่ไม่ยืนยันคง Pending ไม่มีการติดตั้งหรือสมมติข้อความ/กฎ

ก่อนเปิด Runtime ต้องอนุมัติแผน Revisionรวมพร้อมปรับ academic/photo clients/writers, explicit DTOs, owner access guards, fileversionและphysical-retention behavior; ไม่มีสิ่งเหล่านี้เปิดใช้ใน Phase 2A

ยังมีช่อง semantic gapsในหน้า4และลายเซ็นที่ Schema Profileอย่างเดียวแก้ไม่ได้ ต้องอนุมัติงาน Workflowแยก ข้อเสนอ acknowledgementsยังไม่มี DDLเพราะ retention/snapshot policyไม่พร้อม แต่มี design/columns/key/ownershipให้ review

หยุดหลังเตรียม Source/รายงานและตรวจที่ไม่เปลี่ยนฐานข้อมูลนี้ ไม่มีการรัน Migration, Reset/Drop/Truncate, Commit/Push, Frontend UI/5 Tabs/PDFImport/OCR/บัญชี/OAuth/ApprovalWorkflow/Logs/Calendar/เมนูอื่น หรือเริ่ม Phaseถัดไป
