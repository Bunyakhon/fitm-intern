# FITM Student Profile — Phase 2B.2 Restore Verification และ Controlled Installation

วันที่ตรวจ: 2026-10-11 (Asia/Bangkok)

**PASS — ติดตั้งเฉพาะ 022 → 023 → 024 → 025 ใน Development intern_system สำเร็จ; 019–021 ยัง Pending**

อ่านรายงาน Phase 2A, 2B.1 และ 2B.2 เดิม ตรวจ Git Status/Ledger แบบ Read-only ก่อนเริ่ม พิสูจน์ Backup เดิม จากนั้นสร้าง Backup ใหม่และตรวจ Restore ครบก่อนติดตั้งตามที่อนุมัติ ไม่มีการแก้ข้อมูลบัญชีจริง, Restore ทับ Development, แก้ Ledger ด้วย SQL, Migrate All, Commit/Push หรือเริ่ม Phase 3

หลักฐาน: [Installation](FITM_STUDENT_PROFILE_PHASE2B2_RESULTS.json), [Restore Verification](FITM_STUDENT_PROFILE_RESTORE_VERIFICATION.json), [Post-install](FITM_STUDENT_PROFILE_PHASE2B2_POST_INSTALL.json)

## 1. สาเหตุ CHECK Differences 17 จุด

ตัวตรวจเดิมใช้ assert.deepEqual กับ Catalog ซึ่งรวมข้อความ pg_get_constraintdef() จึงตรวจพบความต่างของ SQL Representation หลัง pg_restore การหยุดรอบก่อนถูกต้องขณะยังไม่มีหลักฐานพิสูจน์ความเทียบเท่า

15 จุดเป็น Array Cast: Development แสดง ARRAY[...::character varying]::text[] แต่ Restore แสดง Cast แต่ละสมาชิกเป็น (...::character varying)::text อีก 2 จุดเป็นการจัดกลุ่ม AND/วงเล็บของ company_evaluations_scores_check และ coop_projects_topic_check เกิดจาก PostgreSQL Parse/Deparse DDL ที่ pg_dump ส่งออก ไม่ได้เปลี่ยน Backup/CHECK จริงเพื่อให้ข้อความตรงกัน

ให้ PostgreSQL Parse ทั้งสอง Definition บน TEMP Table เปล่า (LIKE ตารางจริง) ในฐาน Restore เท่านั้น เทียบ conbin Expression Tree โดยละเว้นเฉพาะ :location ซึ่งเป็นตำแหน่งไบต์ของข้อความ SQL เก็บ Type/OID, Cast, Operator, Function, Collation, Constant และ Boolean Logic ทั้งหมด ไม่ใช้การลบช่องว่าง/วงเล็บ/Cast เพื่อสรุปความเทียบเท่า

เทียบ Types/Defaults/Collations/Functions/Constraint Properties ก่อนพิสูจน์ Expression และตรวจ TRUE/FALSE/NULL ด้วยข้อมูลสังเคราะห์ ทั้ง 45 CHECK รวม 5532 กรณีไม่มี Mismatch สอง CHECK ที่เป็น NOT VALID เดิมยังคงสถานะเดิม ไม่มีการปิด Validation

## 2. ผลการจัดประเภท

| กลุ่มของ 17 จุด | จำนวน |
| --- | --- |
| A — EQUIVALENT | 17 |
| B — NOT EQUIVALENT | 0 |
| C — UNVERIFIED | 0 |

ตรวจ CHECK ทั้ง 45 จุดผ่าน รายละเอียด Definition/Validation/Properties/หลักฐานของแต่ละจุดอยู่ภาคผนวกและ JSON

## 3. Verification Script และ Regression

ยอมรับ Definition ที่ต่างได้เฉพาะ Constraint/ตารางที่มีหลักฐาน EQUIVALENT จาก PostgreSQL เท่านั้น จากนั้น Strict Compare Catalog ส่วนอื่น การเปลี่ยน Types/Defaults/Validation/Indexes/Functions/Triggers/Dependencies/สิทธิ์ยังถูกปฏิเสธ ถ้ามี B/C แม้จุดเดียวจะกั้นการติดตั้ง

เพิ่ม Unit Regression 3 รายการ: ละเว้นได้เฉพาะ Source Offset ใน Tree; ยอมรับ Representation เฉพาะที่พิสูจน์แล้วและปฏิเสธ Validation/Index Drift; ตรวจจับ Type/Default/Collation/Function/Trigger/Sequence/Privilege Drift

SQL Regression จริง 7 รายการใน TEMP Table ของฐาน Restore ทุกกรณีตรวจพบ NOT EQUIVALENT:

| กรณีสังเคราะห์ | ผล | Behavior Mismatch |
| --- | --- | --- |
| score upper bound 10 -> 9 | PASS | 1 |
| comparison <= -> >= | PASS | 4 |
| AND -> OR | PASS | 25 |
| allowed purpose changed | PASS | 1 |
| NULL acceptance changed | PASS | 13 |
| NOT VALID status changed | PASS | 0 |
| NO INHERIT property changed | PASS | 0 |

กรณีเปลี่ยน Definition ต้องพบพฤติกรรมต่างกันจริง กรณี NOT VALID/NO INHERIT ตรวจพบความต่างจาก Properties

## 4. Backup / Restore — PASS

PostgreSQL/pg_dump/pg_restore 16.15; Endpoint localhost:5432, Schema public; ตรวจ Server Address กับ Docker intern_postgres (postgres:16-alpine) ก่อนทำงาน

Backup เดิมยังอยู่และ Hash ไม่เปลี่ยน:

- C:\Users\suran\AppData\Local\fitm-intern-backups\student-profile-phase2b2-457ec906b31049ac930151e25188ad1e\intern_system.before-022-025.dump
- 119226 bytes
- SHA-256: 728faadf3d0b8711c0fb617ba255180551a134e26fd0bd7d29a4a7683bfcc9dc

Restore Backup เดิมซ้ำและพิสูจน์ 17 จุดสำเร็จก่อนสร้าง Backup ใหม่ ไม่มี Development Writes ระหว่างการพิสูจน์

Backup ใหม่ก่อนติดตั้ง:

- C:\Users\suran\AppData\Local\fitm-intern-backups\student-profile-phase2b2-b97beb370dc34cbd93051d92b1fd8f09\intern_system.before-022-025.dump
- 119226 bytes
- SHA-256: 5917d8efc72ebda79da0ea9692943038445bd1dd5656a1333569ea0427cf05f4
- อยู่นอก Repository; ACL เฉพาะ Windows Current User + SYSTEM, Inheritance ปิดและตรวจแล้ว
- Custom Format ผ่าน Binary File Descriptor, Header PGDMP และ pg_restore --list

หยุด intern_backend ชั่วคราว ตรวจไม่มี Active/Idle-in-transaction Connection อื่น ใช้ Advisory Lock และ Restore ลง fitm_profile_2b2_restore_63d12ad8714bdb47bada2cd67b782ca1 ด้วย Role ของรอบนี้, --no-owner --no-privileges --exit-on-error --single-transaction ได้ Exit Code 0 ไม่ใช้ --clean/--create และไม่ Restore ทับ Development

| Recovery Check | ผล / จำนวน |
| --- | --- |
| database | PASS / 1 |
| columns | PASS / 332 |
| indexes | PASS / 72 |
| functions | PASS / 5 |
| triggers | PASS / 5 |
| extensions | PASS / 1 |
| sequences | PASS / 0 |
| relations | PASS / 29 |
| schemas | PASS / 1 |
| types | PASS / 7 |
| views | PASS / 0 |
| policies | PASS / 0 |
| dependencies | PASS / 603 |
| runtime_permissions | PASS / 29 |
| ownership | PASS |
| basic_catalog_and_ledger | PASS |
| all_legacy_data | PASS / 28 ตาราง |

รวม Basic Catalog 29 Tables, 332 Columns/Types/Defaults, 134 Constraints (PK/FK/Unique/45 CHECK), 72 Indexes, 5 Non-internal Triggers, Ledger 19 รายการเท่ากันทั้งหมดหลังยอมรับเฉพาะ CHECK ที่พิสูจน์แล้ว Sequences/Identity Columns=0 ตรวจ State/Metadata แล้วไม่ได้ข้าม

ทั้ง 28 ตารางข้อมูลเก่ามี Count และ SHA-256 เท่ากัน Hash ทำภายใน PostgreSQL และจัดเรียง Row Hash ก่อนรวม ส่งออกเฉพาะ Count/Checksum ไม่มีข้อมูลส่วนบุคคลรายแถวใน Console/รายงาน

ตรวจ Owner Mapping postgres → Restore NOLOGIN Role, Object/Schema/Function ACL, Extensions, Function Properties และ Runtime Privileges ของผู้ใช้เชื่อมต่อ ไม่พบ Custom Object Grants/SECURITY DEFINER ที่เสียความหมายจาก --no-owner/--no-privileges ฐานทดสอบถอน PUBLIC CONNECT เพื่อแยกการทดสอบ

Cleanup เฉพาะฐาน/Role ที่สร้างเอง ตรวจชื่อสุ่ม/OID/Owner/Nonce ก่อน Drop ไม่มี Force Drop หลังติดตั้งพบฐาน/Role ทดสอบค้าง 0 เก็บ Backup ทั้งสองไว้ครบ Backend กลับมาทำงานแล้ว

## 5. Dependencies / Umzug / Migration Status

Prepared Migration/Schema/Models 7 ไฟล์มี SHA-256 ตรง Phase 2B.1; 019–021 ไม่อ้าง Profile Objects ที่เพิ่มใน 022–025 และ 022–025 ไม่ใช้ Supervision/Activity Objects ของ 019–021

| Migration | Dependency | ก่อน | หลัง |
| --- | --- | --- | --- |
| 019_add_supervision_appointments.js | students/teachers/mentors/coop_requests เดิม | Pending | Pending |
| 020_add_supervision_results.js | ต้องมี 019 ก่อน 020 | Pending | Pending |
| 021_add_coop_activities.js | department_staffs เดิม | Pending | Pending |
| 022_prepare_student_profile_scalars.js | students/student_profiles เดิม | Prepared / ไม่มี Ledger | Executed |
| 023_prepare_student_profile_relations.js | students PK | Prepared / ไม่มี Ledger | Executed |
| 024_prepare_student_profile_file_types.js | enum_student_files_file_type เดิม | Prepared / ไม่มี Ledger | Executed |
| 025_prepare_student_profile_document_metadata.js | student_files + Labels ที่ Commit จาก 024 | Prepared / ไม่มี Ledger | Executed |

การข้ามปลอดภัยสำหรับ Sources ที่ตรวจ Ordinary Discovery หลังติดตั้งเห็น Executed 23 รายการและ Pending เฉพาะ 019, 020, 021 อนาคตยังติดตั้ง 019 ก่อน 020 ได้ตาม Dependency โดยไม่ชน Profile Objects หากมี Source Migration ใหม่ต้องตรวจ Dependency ของ Source ใหม่นั้นตามปกติ

ใช้ Umzug/QueryInterface/SequelizeStorage เดิม และ up({ migrations: [name] }) ทีละรายการ 022 → 023 → 024 → 025 Ledger บันทึกโดย Umzug เท่านั้น ไม่ใช้ Migrate All/SQL แก้ Ledger Ordinary CLI Discover Prepared Sources ตาม Ledger ไม่ Auto-activate ไฟล์ที่ยังไม่ได้ติดตั้ง

ก่อน/หลังแต่ละ Migration ตรวจ Ledger/ข้อมูลเก่า/Columns/Constraints/Indexes/Triggers เดิมผ่านครบ 024 Commit ก่อน 025

| Catalog | ก่อน | หลัง |
| --- | --- | --- |
| tables | 29 | 33 |
| columns | 332 | 398 |
| indexes | 72 | 83 |
| constraints | 134 | 169 |
| triggers | 5 | 5 |
| ledger | 19 | 23 |

Metadata SHA-256 ก่อน: 4b4a05a5cd8ece4e224581153c8bb6d428acfdaf9426181b98679d362a8ea47e

หลัง: 635c6050d74f89511d9698cd32e8a81423b1a50d652f88fe1cc8380686601a6f ตรง Target ที่ผ่าน PostgreSQL Tests ใน Phase 2B.1

## 6. ตารางและ Columns ใหม่

4 ตารางใหม่รวม 39 Columns ทุกตารางมี UUID PK, student_id FK → students.id แบบ UPDATE RESTRICT / DELETE CASCADE และ Timestamps:

| ตาราง | Columns | Records |
| --- | --- | --- |
| student_addresses | id, student_id, created_at, updated_at, address_type, house_no, road, subdistrict, district, province, postal_code | 0 |
| student_education_records | id, student_id, created_at, updated_at, education_level, institution_name, qualification, major, gpa, graduation_year, display_order | 0 |
| student_training_records | id, student_id, created_at, updated_at, course_name, institution, qualification, period_text, display_order | 0 |
| student_skills | id, student_id, created_at, updated_at, category, skill_name, proficiency, display_order | 0 |

เพิ่ม 27 Columns ในตารางเดิม (รวมทั้งหมด 66):

| ตาราง | Column | Type | Nullable | Default |
| --- | --- | --- | --- | --- |
| students | department | varchar(255) | YES | ไม่มี |
| students | faculty | varchar(255) | YES | ไม่มี |
| students | last_semester_gpa | numeric(3,2) | YES | ไม่มี |
| students | profile_data_revision | bigint | NO | 0 |
| student_profiles | english_first_name | varchar(255) | YES | ไม่มี |
| student_profiles | english_last_name | varchar(255) | YES | ไม่มี |
| student_profiles | gender | varchar(32) | YES | ไม่มี |
| student_profiles | national_id_ciphertext | bytea | YES | ไม่มี |
| student_profiles | national_id_key_version | varchar(80) | YES | ไม่มี |
| student_profiles | national_id_issue_date | date | YES | ไม่มี |
| student_profiles | national_id_expiry_date | date | YES | ไม่มี |
| student_profiles | has_driving_license | boolean | YES | ไม่มี |
| student_profiles | driving_license_number | varchar(64) | YES | ไม่มี |
| student_profiles | driving_license_type | varchar(100) | YES | ไม่มี |
| student_profiles | driving_license_expiry_date | date | YES | ไม่มี |
| student_profiles | military_status | varchar(32) | YES | ไม่มี |
| student_profiles | father_address | text | YES | ไม่มี |
| student_profiles | father_phone | varchar(32) | YES | ไม่มี |
| student_profiles | mother_address | text | YES | ไม่มี |
| student_profiles | mother_phone | varchar(32) | YES | ไม่มี |
| student_profiles | emergency_contact_occupation | varchar(255) | YES | ไม่มี |
| student_profiles | emergency_contact_workplace | varchar(255) | YES | ไม่มี |
| student_files | document_label | varchar(255) | YES | ไม่มี |
| student_files | content_sha256 | char(64) | YES | ไม่มี |
| student_files | document_version | integer | YES | ไม่มี |
| student_files | supersedes_file_id | uuid | YES | ไม่มี |
| student_files | is_current | boolean | NO | TRUE |

CHECK ของ GPA/Revision/วันที่/National ID คู่กัน/License/File Metadata/Relation Values, Unique/Owner Indexes, Composite Owner FK ของ supersedes_file_id และ Partial Unique Index ของเอกสารปัจจุบันผ่านตาม Specifications

File Type Enum มีค่าเดิมครบ เพิ่ม transcript, national_id_copy, student_id_copy, supporting_other, external_profile_pdf ไม่มี Backfill/DML ค่าใหม่เริ่ม NULL หรือ Default ตาม Schema

## 7. Records และ Post-install

| ตารางเดิม | ก่อน | หลัง |
| --- | --- | --- |
| companies | 12 | 12 |
| company_access_tokens | 3 | 3 |
| company_evaluations | 1 | 1 |
| company_response_history | 0 | 0 |
| company_responses | 0 | 0 |
| coop_document_revisions | 0 | 0 |
| coop_documents | 0 | 0 |
| coop_project_advisor_requests | 3 | 3 |
| coop_projects | 1 | 1 |
| coop_request_delivery_methods | 6 | 6 |
| coop_request_prerequisite_courses | 5 | 5 |
| coop_request_reviews | 2 | 2 |
| coop_requests | 2 | 2 |
| department_staffs | 0 | 0 |
| internship_daily_logs | 0 | 0 |
| internship_review_tokens | 0 | 0 |
| internship_week_events | 0 | 0 |
| internship_weeks | 0 | 0 |
| job_posting_reviews | 0 | 0 |
| job_posting_work_modes | 32 | 32 |
| job_postings | 22 | 22 |
| job_submissions | 12 | 12 |
| mentor_tokens | 18 | 18 |
| mentors | 2 | 2 |
| student_files | 3 | 3 |
| student_profiles | 2 | 2 |
| students | 4 | 4 |
| teachers | 23 | 23 |

ทั้ง 28 ตารางเดิม Count/Checksum เท่าเดิม; students=4, profiles=2, files=3 ตารางใหม่ 0 Records Ledger เพิ่ม 19 → 23 เฉพาะรายการที่อนุมัติ

หลัง Backend กลับมาทำงานตรวจ Read-only ซ้ำ โดย Hash Projection เฉพาะ Columns เดิมเพื่อแยก Defaults ของ Columns ใหม่ CHECK เดิมทั้ง 45 จุดมี Definition/Properties เดิม Invalid Indexes=0; Duplicate Profile Owners=0; Schema ตรง Target

โหลด 36 Live Model Definers ใน Registry แยก รัน SELECT LIMIT 0 บน Student/StudentProfile/StudentFile ก่อน/หลังรวม Prepared Attributes และ Relations ทั้ง 4 รวม Association Query ผ่าน PostgreSQL จริง ไม่มี sync/DDL/UPDATE/การคืนข้อมูลบัญชีจริง /health/db=200; GET /api/student-profile/me ไม่มี Token=401

Prepared Models ทดสอบแยก ไม่ Activate ใน Live Registry/API และไม่เปิด Aggregate Revision

## 8. Tests / Build / API Contract

| ตรวจ | ผล |
| --- | --- |
| Backend node --test | 255: PASS 237 / SKIP 18 / FAIL 0 |
| Frontend node --test test/*.test.js | 276: PASS 274 / SKIP 2 / FAIL 0 |
| Frontend npm run build | PASS |
| Restore Behavior | 45 CHECK / 5532 กรณี / Mismatch 0 |
| SQL Semantic Regression | 7 / 7 PASS |
| Read-only Post-install | PASS |

Phase 1 Tests ผ่าน Partial Update, Unchanged Fields, Explicit Clear, Ownership/Read-only, Date/Leap Year, Profile Revision/If-Match, HTTP 428/409 และ Concurrent Stale Update โดย Fixture สังเคราะห์ Frontend Tests ผ่าน Dirty Fields/สลับแท็บ/API Refresh API Contract รอบนี้ไม่เปลี่ยน: PUT /api/student-profile/me ใช้ Partial Fields และ If-Match จาก profile_revision ยังไม่ใช้ Aggregate Revision

Skip เป็น Integration ที่ต้องเปิด Database/Private Storage/Environment เฉพาะ รอบนี้ปิด Flags ชุดเขียนฐานและไม่มี Disposable Database URL ไม่ทดสอบการเขียนบัญชีจริง Phase 2B.1 PostgreSQL Integration 30 รายการที่เคยผ่านไม่ได้รันซ้ำหลังติดตั้ง เพราะ Harness ต้องการ Baseline ก่อน 022–025 ใช้ Target/Source Hash ตรงกันและ Restore/Post-install Verification จริงแทน

## 9. ไฟล์ที่แก้ไขในรอบนี้

- backend/scripts/installStudentProfilePhase2B2.js — Recovery Gate และ SHA-256 Checksum
- backend/scripts/lib/studentProfileRestoreVerification.js — Catalog/Expression/Behavior Verification
- backend/scripts/verifyStudentProfileRestore.js — Restore Backup เดิมในฐานแยก
- backend/scripts/verifyStudentProfilePhase2B2.js — Read-only Post-install/Sequelize
- backend/test/studentProfileRestoreVerification.test.js — Regression
- docs/audits/FITM_STUDENT_PROFILE_RESTORE_VERIFICATION.json
- docs/audits/FITM_STUDENT_PROFILE_PHASE2B2_RESULTS.json
- docs/audits/FITM_STUDENT_PROFILE_PHASE2B2_POST_INSTALL.json
- docs/audits/FITM_STUDENT_PROFILE_PHASE2B2_INSTALLATION.md

เทียบ SHA-256 กับ Baseline 401 ไฟล์ก่อนรอบนี้: นอกจาก Script/รายงานที่ระบุ ไม่มี Frontend/Controller/Live Models/Migrations เดิม/Prepared Sources เปลี่ยน Worktree มีงานเดิมจาก Phase ก่อนหน้าที่ไม่ Commit รักษาไว้ทั้งหมด

## 10. ข้อจำกัดและปัญหาคงเหลือ

ไม่มี Blocker สำหรับการติดตั้ง 022–025; 17 CHECK เป็น EQUIVALENT และ Recovery ผ่านครบ 019–021 ยัง Pending จึงไม่ยืนยัน Runtime ที่ต้องใช้ Supervision/Activity Tables เหล่านั้น และไม่ติดตั้งเพื่อให้ Tests ที่ Skip ผ่าน

Backup เป็น Logical Database Archive ไม่รวม Cluster Globals/Roles หรือไฟล์ Upload ภายนอก ตรวจ ACL/Role Mapping/Extension ของ Development นี้แล้ว แต่ยังไม่ได้ทดสอบ Full Infrastructure Recovery หรือ Production Role อื่น

Historical Default Drift 3 จุด: job_submissions.submitted_at, job_postings.submitted_at, coop_requests.submitted_at — Source ใช้ DataTypes.NOW แต่ Development CURRENT_TIMESTAMP เป็นข้อค้นพบเดิมจาก Phase 2B.1 ไม่แก้ Source/Default/ข้อมูลเดิมในงานนี้ ไม่เกี่ยวกับ CHECK Differences

Aggregate Revision/Prepared Live API Activation/National ID Encryption-Key Management/Acknowledgement Design/UI/Import ยังอยู่ในงานอนาคตที่ต้องอนุมัติ ไม่พัฒนาในรอบนี้ ไม่ทดสอบ Browser Login/Write บัญชีจริงเพราะไม่มีสิทธิ์เปลี่ยนข้อมูลนักศึกษาจริง

หยุดหลัง Phase 2B.2 รอคำสั่งก่อนเริ่ม Phase 3

## ภาคผนวก — CHECK Differences 17 จุด

Properties จาก pg_constraint เท่ากันทั้ง Development และ Restore; JSON มีอีก 28 CHECK ที่ข้อความไม่ต่าง

### 1. public.company_access_tokens — company_access_tokens_purpose_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK (((purpose)::text = ANY ((ARRAY['email_verification'::character varying, 'management_access'::character varying])::text[])))
```

Restore:

```sql
CHECK (((purpose)::text = ANY (ARRAY[('email_verification'::character varying)::text, ('management_access'::character varying)::text])))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"company_access_tokens","name":"company_access_tokens_purpose_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["purpose"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน a14838807861e13991a96cc69ca592cb6bc927e8b9c129ddab177060a42968a8; 7 กรณี (TRUE=2, FALSE=3, NULL=2), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 2. public.company_evaluations — company_evaluations_scores_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK ((((q1_score >= 1) AND (q1_score <= 10)) AND ((q2_score >= 1) AND (q2_score <= 10)) AND ((q3_score >= 1) AND (q3_score <= 10)) AND ((q4_score >= 1) AND (q4_score <= 10)) AND ((q5_score >= 1) AND (q5_score <= 10))))
```

Restore:

```sql
CHECK (((q1_score >= 1) AND (q1_score <= 10) AND ((q2_score >= 1) AND (q2_score <= 10)) AND ((q3_score >= 1) AND (q3_score <= 10)) AND ((q4_score >= 1) AND (q4_score <= 10)) AND ((q5_score >= 1) AND (q5_score <= 10))))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"company_evaluations","name":"company_evaluations_scores_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["q1_score","q2_score","q3_score","q4_score","q5_score"],"referenced_columns":null}
```

ความต่าง: การจัดกลุ่ม AND/วงเล็บหลัง Parse/Deparse; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน 9bc85daf6fe2782bc53e85108069c4499ef38b80d86e5204c74ef4eb87e011d6; 49 กรณี (TRUE=0, FALSE=23, NULL=26), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 3. public.company_response_history — company_response_history_values_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK ((((status)::text = ANY ((ARRAY['accepted'::character varying, 'rejected'::character varying])::text[])) AND (version >= 1) AND (cooperation_version >= 1) AND ((note IS NULL) OR (length(note) <= 2000))))
```

Restore:

```sql
CHECK ((((status)::text = ANY (ARRAY[('accepted'::character varying)::text, ('rejected'::character varying)::text])) AND (version >= 1) AND (cooperation_version >= 1) AND ((note IS NULL) OR (length(note) <= 2000))))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"company_response_history","name":"company_response_history_values_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["status","version","cooperation_version","note"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน 71d7a223ef5a9963f9c4985e5d6a74513ef26634b8f5e34a22380ede3abd657a; 522 กรณี (TRUE=0, FALSE=489, NULL=33), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 4. public.company_responses — company_responses_values_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK ((((status)::text = ANY ((ARRAY['accepted'::character varying, 'rejected'::character varying])::text[])) AND (version >= 1) AND (cooperation_version >= 1) AND ((note IS NULL) OR (length(note) <= 2000))))
```

Restore:

```sql
CHECK ((((status)::text = ANY (ARRAY[('accepted'::character varying)::text, ('rejected'::character varying)::text])) AND (version >= 1) AND (cooperation_version >= 1) AND ((note IS NULL) OR (length(note) <= 2000))))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"company_responses","name":"company_responses_values_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["status","version","cooperation_version","note"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน 71d7a223ef5a9963f9c4985e5d6a74513ef26634b8f5e34a22380ede3abd657a; 522 กรณี (TRUE=0, FALSE=489, NULL=33), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 5. public.coop_document_revisions — coop_document_revisions_action_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK (((version >= 1) AND ((action)::text = ANY ((ARRAY['create'::character varying, 'edit'::character varying, 'generate'::character varying, 'regenerate'::character varying])::text[]))))
```

Restore:

```sql
CHECK (((version >= 1) AND ((action)::text = ANY (ARRAY[('create'::character varying)::text, ('edit'::character varying)::text, ('generate'::character varying)::text, ('regenerate'::character varying)::text]))))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"coop_document_revisions","name":"coop_document_revisions_action_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["version","action"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน cffdada4edf1a7c2e307b83db15290869bad576dabd7067f655941a31b277973; 39 กรณี (TRUE=4, FALSE=21, NULL=14), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 6. public.coop_document_revisions — coop_document_revisions_state_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK (((((status)::text = 'draft'::text) AND ((action)::text = ANY ((ARRAY['create'::character varying, 'edit'::character varying])::text[])) AND (rendered_html IS NULL) AND (content_sha256 IS NULL)) OR (((status)::text = 'generated'::text) AND ((action)::text = ANY ((ARRAY['generate'::character varying, 'regenerate'::character varying])::text[])) AND (rendered_html IS NOT NULL) AND (content_sha256 IS NOT NULL) AND (content_sha256 ~ '^[0-9a-f]{64}$'::text))))
```

Restore:

```sql
CHECK (((((status)::text = 'draft'::text) AND ((action)::text = ANY (ARRAY[('create'::character varying)::text, ('edit'::character varying)::text])) AND (rendered_html IS NULL) AND (content_sha256 IS NULL)) OR (((status)::text = 'generated'::text) AND ((action)::text = ANY (ARRAY[('generate'::character varying)::text, ('regenerate'::character varying)::text])) AND (rendered_html IS NOT NULL) AND (content_sha256 IS NOT NULL) AND (content_sha256 ~ '^[0-9a-f]{64}$'::text))))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"coop_document_revisions","name":"coop_document_revisions_state_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["status","action","rendered_html","content_sha256"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน 85687595686f543fd3aab6909efe4aaa46ba04bd6af0e4eb539b5034bdc2cba1; 801 กรณี (TRUE=0, FALSE=790, NULL=11), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 7. public.coop_documents — coop_documents_type_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK (((document_type)::text = ANY ((ARRAY['cooperation'::character varying, 'placement'::character varying])::text[])))
```

Restore:

```sql
CHECK (((document_type)::text = ANY (ARRAY[('cooperation'::character varying)::text, ('placement'::character varying)::text])))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"coop_documents","name":"coop_documents_type_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["document_type"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน 7f9984739115f5da2582aa456a704e5e903155efd4af1b76aa9724b709b068dd; 7 กรณี (TRUE=2, FALSE=3, NULL=2), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 8. public.coop_projects — coop_projects_topic_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK ((((length(btrim((topic)::text)) >= 1) AND (length(btrim((topic)::text)) <= 500)) AND ((topic)::text = btrim((topic)::text))))
```

Restore:

```sql
CHECK (((length(btrim((topic)::text)) >= 1) AND (length(btrim((topic)::text)) <= 500) AND ((topic)::text = btrim((topic)::text))))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"coop_projects","name":"coop_projects_topic_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["topic"],"referenced_columns":null}
```

ความต่าง: การจัดกลุ่ม AND/วงเล็บหลัง Parse/Deparse; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน 32d0303483a8cda4d398e7e5da14af6e6b35cf11bb4366f1cb41f306963d8929; 10 กรณี (TRUE=6, FALSE=2, NULL=2), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 9. public.coop_request_prerequisite_courses — coop_prerequisites_program_code_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK (((((program)::text = 'IT'::text) AND ((course_code)::text = ANY ((ARRAY['060243102'::character varying, '060243104'::character varying, '060243108'::character varying, '060243112'::character varying, '060243122'::character varying])::text[]))) OR (((program)::text = 'INE'::text) AND ((course_code)::text = ANY ((ARRAY['060233107'::character varying, '060233112'::character varying, '060233113'::character varying, '060233202'::character varying, '060233204'::character varying])::text[])))))
```

Restore:

```sql
CHECK (((((program)::text = 'IT'::text) AND ((course_code)::text = ANY (ARRAY[('060243102'::character varying)::text, ('060243104'::character varying)::text, ('060243108'::character varying)::text, ('060243112'::character varying)::text, ('060243122'::character varying)::text]))) OR (((program)::text = 'INE'::text) AND ((course_code)::text = ANY (ARRAY[('060233107'::character varying)::text, ('060233112'::character varying)::text, ('060233113'::character varying)::text, ('060233202'::character varying)::text, ('060233204'::character varying)::text])))))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"coop_request_prerequisite_courses","name":"coop_prerequisites_program_code_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["program","course_code"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน f4f00755802c0af3670bcb190bbf0751943bb37d19ee7364768942682cec8d6c; 62 กรณี (TRUE=6, FALSE=35, NULL=21), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 10. public.coop_request_prerequisite_courses — coop_prerequisites_status_grade_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK (((((status)::text = 'passed'::text) AND (grade IS NOT NULL) AND (length(TRIM(BOTH FROM grade)) > 0)) OR (((status)::text = ANY ((ARRAY['studying'::character varying, 'unselected'::character varying])::text[])) AND (grade IS NULL))))
```

Restore:

```sql
CHECK (((((status)::text = 'passed'::text) AND (grade IS NOT NULL) AND (length(TRIM(BOTH FROM grade)) > 0)) OR (((status)::text = ANY (ARRAY[('studying'::character varying)::text, ('unselected'::character varying)::text])) AND (grade IS NULL))))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"coop_request_prerequisite_courses","name":"coop_prerequisites_status_grade_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["status","grade"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน 2ecbcbdbf8ca9c0e60ff97ab0f7dec2c1cd5fc2d01d50a3080fe13ca7909928f; 64 กรณี (TRUE=8, FALSE=44, NULL=12), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 11. public.coop_request_reviews — coop_reviews_actor_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK (((((actor_role)::text = 'student'::text) AND (student_id IS NOT NULL) AND (teacher_id IS NULL) AND (department_staff_id IS NULL)) OR (((actor_role)::text = 'department_staff'::text) AND (department_staff_id IS NOT NULL) AND (teacher_id IS NULL) AND (student_id IS NULL)) OR (((actor_role)::text = ANY ((ARRAY['teacher'::character varying, 'department_head'::character varying])::text[])) AND (teacher_id IS NOT NULL) AND (department_staff_id IS NULL) AND (student_id IS NULL))))
```

Restore:

```sql
CHECK (((((actor_role)::text = 'student'::text) AND (student_id IS NOT NULL) AND (teacher_id IS NULL) AND (department_staff_id IS NULL)) OR (((actor_role)::text = 'department_staff'::text) AND (department_staff_id IS NOT NULL) AND (teacher_id IS NULL) AND (student_id IS NULL)) OR (((actor_role)::text = ANY (ARRAY[('teacher'::character varying)::text, ('department_head'::character varying)::text])) AND (teacher_id IS NOT NULL) AND (department_staff_id IS NULL) AND (student_id IS NULL))))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"coop_request_reviews","name":"coop_reviews_actor_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["actor_role","student_id","teacher_id","department_staff_id"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน 94cc6ad9e92c32ac54940726ffc3f1f916f4058886030502f56076f85e4d9048; 17 กรณี (TRUE=0, FALSE=14, NULL=3), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 12. public.coop_request_reviews — coop_reviews_reason_check

**EQUIVALENT**; Validation Development=false / Restore=false

Development:

```sql
CHECK ((((decision)::text <> ALL ((ARRAY['reject'::character varying, 'cancel'::character varying])::text[])) OR ((reason IS NOT NULL) AND (length(TRIM(BOTH FROM reason)) > 0)))) NOT VALID
```

Restore:

```sql
CHECK ((((decision)::text <> ALL (ARRAY[('reject'::character varying)::text, ('cancel'::character varying)::text])) OR ((reason IS NOT NULL) AND (length(TRIM(BOTH FROM reason)) > 0)))) NOT VALID
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"coop_request_reviews","name":"coop_reviews_reason_check","contype":"c","convalidated":false,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["decision","reason"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน a791d6ad9bd61e5db964e1b56777bd607a2c0d68c6c1bf360a9de7cb4d0e4b92; 27 กรณี (TRUE=18, FALSE=3, NULL=6), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 13. public.coop_request_reviews — coop_reviews_transition_check

**EQUIVALENT**; Validation Development=false / Restore=false

Development:

```sql
CHECK (((((actor_role)::text = 'student'::text) AND ((decision)::text = 'submit'::text) AND ((from_status)::text = 'new'::text) AND ((to_status)::text = 'advisor_review'::text)) OR (((actor_role)::text = ANY ((ARRAY['student'::character varying, 'department_staff'::character varying])::text[])) AND ((decision)::text = 'cancel'::text) AND ((from_status)::text = ANY ((ARRAY['submitted'::character varying, 'advisor_review'::character varying, 'staff_review'::character varying, 'department_head_review'::character varying])::text[])) AND ((to_status)::text = 'cancelled'::text)) OR (((actor_role)::text = 'teacher'::text) AND ((from_status)::text = ANY ((ARRAY['submitted'::character varying, 'advisor_review'::character varying])::text[])) AND ((((decision)::text = 'approve'::text) AND ((to_status)::text = 'department_head_review'::text)) OR (((decision)::text = 'reject'::text) AND ((to_status)::text = 'rejected'::text)))) OR (((actor_role)::text = 'department_head'::text) AND ((from_status)::text = 'department_head_review'::text) AND ((((decision)::text = 'approve'::text) AND ((to_status)::text = 'approved'::text)) OR (((decision)::text = 'reject'::text) AND ((to_status)::text = 'rejected'::text)))))) NOT VALID
```

Restore:

```sql
CHECK (((((actor_role)::text = 'student'::text) AND ((decision)::text = 'submit'::text) AND ((from_status)::text = 'new'::text) AND ((to_status)::text = 'advisor_review'::text)) OR (((actor_role)::text = ANY (ARRAY[('student'::character varying)::text, ('department_staff'::character varying)::text])) AND ((decision)::text = 'cancel'::text) AND ((from_status)::text = ANY (ARRAY[('submitted'::character varying)::text, ('advisor_review'::character varying)::text, ('staff_review'::character varying)::text, ('department_head_review'::character varying)::text])) AND ((to_status)::text = 'cancelled'::text)) OR (((actor_role)::text = 'teacher'::text) AND ((from_status)::text = ANY (ARRAY[('submitted'::character varying)::text, ('advisor_review'::character varying)::text])) AND ((((decision)::text = 'approve'::text) AND ((to_status)::text = 'department_head_review'::text)) OR (((decision)::text = 'reject'::text) AND ((to_status)::text = 'rejected'::text)))) OR (((actor_role)::text = 'department_head'::text) AND ((from_status)::text = 'department_head_review'::text) AND ((((decision)::text = 'approve'::text) AND ((to_status)::text = 'approved'::text)) OR (((decision)::text = 'reject'::text) AND ((to_status)::text = 'rejected'::text)))))) NOT VALID
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"coop_request_reviews","name":"coop_reviews_transition_check","contype":"c","convalidated":false,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["actor_role","decision","from_status","to_status"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน e4dad9f288ad5a18d23fb562c2aa7a1f4419a8a834ebdeb50631e668a9836464; 741 กรณี (TRUE=1, FALSE=716, NULL=24), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 14. public.job_posting_work_modes — job_posting_work_modes_mode_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK (((mode)::text = ANY ((ARRAY['onsite'::character varying, 'work_from_home'::character varying, 'hybrid'::character varying])::text[])))
```

Restore:

```sql
CHECK (((mode)::text = ANY (ARRAY[('onsite'::character varying)::text, ('work_from_home'::character varying)::text, ('hybrid'::character varying)::text])))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"job_posting_work_modes","name":"job_posting_work_modes_mode_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["mode"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน afd1a37c7369aa9805e0a7eaac00a0a562d315471579fbea37094304058afa53; 8 กรณี (TRUE=3, FALSE=3, NULL=2), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 15. public.job_postings — job_postings_category_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK (((category)::text = ANY ((ARRAY['information_technology'::character varying, 'business'::character varying, 'design'::character varying, 'engineering'::character varying, 'other'::character varying])::text[])))
```

Restore:

```sql
CHECK (((category)::text = ANY (ARRAY[('information_technology'::character varying)::text, ('business'::character varying)::text, ('design'::character varying)::text, ('engineering'::character varying)::text, ('other'::character varying)::text])))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"job_postings","name":"job_postings_category_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["category"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน 380b6952a28156da0b7e885c9ca8c95603e8d9a8916f2701cc3d89a555b39af3; 12 กรณี (TRUE=5, FALSE=5, NULL=2), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 16. public.job_postings — job_postings_status_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK (((status)::text = ANY ((ARRAY['pending_email_verification'::character varying, 'pending_review'::character varying, 'published'::character varying, 'rejected'::character varying, 'withdrawn'::character varying, 'expired'::character varying])::text[])))
```

Restore:

```sql
CHECK (((status)::text = ANY (ARRAY[('pending_email_verification'::character varying)::text, ('pending_review'::character varying)::text, ('published'::character varying)::text, ('rejected'::character varying)::text, ('withdrawn'::character varying)::text, ('expired'::character varying)::text])))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"job_postings","name":"job_postings_status_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["status"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน 30c0d0c4a524f277f012f435d7c9910646afef7a6608f26f6d25f49d5d2369c8; 11 กรณี (TRUE=6, FALSE=3, NULL=2), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี

### 17. public.job_submissions — job_submissions_verification_status_check

**EQUIVALENT**; Validation Development=true / Restore=true

Development:

```sql
CHECK (((verification_status)::text = ANY ((ARRAY['pending_email_verification'::character varying, 'verified'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])))
```

Restore:

```sql
CHECK (((verification_status)::text = ANY (ARRAY[('pending_email_verification'::character varying)::text, ('verified'::character varying)::text, ('expired'::character varying)::text, ('cancelled'::character varying)::text])))
```

Properties ทั้งสองฝั่ง:

```json
{"table_name":"job_submissions","name":"job_submissions_verification_status_check","contype":"c","convalidated":true,"condeferrable":false,"condeferred":false,"connoinherit":false,"conislocal":true,"coninhcount":0,"confupdtype":" ","confdeltype":" ","confmatchtype":" ","referenced_table":null,"columns":["verification_status"],"referenced_columns":null}
```

ความต่าง: Array Cast เทียบกับ Cast แต่ละสมาชิกเป็น text; Types/Collations/Operators/Functions/Validation ไม่เปลี่ยน

หลักฐาน: Expression Tree SHA-256 ทั้งสองฝั่งเท่ากัน 8cab4d0dec1c5d2873e2f07616df73f46ec1db3c18c591c30ddf28a0cac55c2b; 9 กรณี (TRUE=4, FALSE=3, NULL=2), Mismatch=0 ผลกระทบต่อการตรวจข้อมูล: ไม่มี
