# FITM Student Profile — Phase 2B.1 Migration Pre-flight & PostgreSQL Integration Test

วันที่ตรวจ: 2026-10-10 (Asia/Bangkok). **ทดสอบ Migration 022–025 บน Temporary PostgreSQL Database แยกจาก intern_system แล้วเท่านั้น** ไม่ติดตั้ง Migration ใดใน Development ไม่เปลี่ยน Backend Business Logic/API Contract/Frontend และไม่ Commit/Push

หลักฐานผลจริงและ Schema metadata ก่อน/หลัง: [POSTGRES_RESULTS.json](FITM_STUDENT_PROFILE_PHASE2B1_POSTGRES_RESULTS.json) มีชื่อฐานทดสอบที่สร้างในรอบล่าสุด, timestamps, ทุก test case, metadata digest, legacy data digest และ SHA-256 ของ Source ที่ทดสอบ ไม่มี credential หรือแถวข้อมูลบุคคลจริง

## 1. สถานะ Migration จริงของ Development — READ-ONLY / PASS

ตรวจ Git Status ก่อนทำงาน อ่านรายงาน Phase 1, Phase 2A Preparation, Field Mapping, Database Design และ Missing Fields; ตรวจ prepared migrations ทั้ง 4 ไฟล์, schema/models/support/associations, Migration History และ Umzug configuration เดิม

ใช้ pg.Client ต่อ intern_system โดย default_transaction_read_only=on และ BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY ตรวจ transaction_read_only=on ทุกครั้ง อ่านเฉพาะ public catalog/enum/constraints/indexes/triggers และ sequelize_meta แล้ว ROLLBACK ไม่มี SELECT แถว Student/Profile/File/Account/Request

| รายการ | สถานะล่าสุด |
| --- | --- |
| PostgreSQL | 16.15 / server_version_num 160015 |
| public tables | 29 |
| Executed | 19 Migration: 001–018 รวม 007a |
| 017 / 018 | Installed |
| 019 / 020 / 021 | Pending ใน Runtime discovery |
| 022 / 023 / 024 / 025 | Prepared เท่านั้น; ไม่อยู่ใน Runtime discovery / ไม่อยู่ใน Development ledger |
| Development metadata ก่อน/หลัง | PASS — SHA-256 ตรงกัน: 4b4a05a5cd8ece4e224581153c8bb6d428acfdaf9426181b98679d362a8ea47e |

Digest ครอบคลุมชื่อ public tables, named column types/defaults/nullability, constraints/validation flags, indexes, enums, triggers และ Migration ledger ไม่ใช่ digest แถวข้อมูลบุคคล การไม่เขียน Development บังคับด้วย read-only connections; ไม่อ่าน PII เพื่อทำ data hash

## 2. Dependency ของ 019–025 และความเสี่ยงการข้าม

| Migration | Dependency ที่พบจาก Source | ผลต่อ Profile / แนวทาง |
| --- | --- | --- |
| 019 supervision appointments | students, teachers, mentors, coop_requests จาก 007a; สร้าง composite owner indexes และ supervision history function | เป็น Workflow นิเทศแยก ไม่ใช่ prerequisite ของ 022–025 |
| 020 supervision results | supervision_appointments และ supervision_history_guard() จาก 019; teachers จาก 007a | **ต้องมี 019 ก่อน 020**; ห้ามข้าม 019 แล้วลง 020 |
| 021 coop activities | department_staffs จาก 007; สร้าง function/triggers ของ activities เอง | ไม่ได้อาศัย 019/020 และไม่ใช่ prerequisite ของ Profile |
| 022 profile scalars | students และ student_profiles จาก 007a | เพิ่มเฉพาะคอลัมน์/CHECK ใหม่; ไม่มี DML/Backfill |
| 023 profile relations | students PK จาก 007a | Owner FK ของ 4 ตาราง; ในเชิง SQL ไม่ต้องใช้คอลัมน์จาก 022 แต่คง order 022→023 เพื่อ review/rollout |
| 024 file enum | enum_student_files_file_type จาก student_files ใน 007a | Append 5 labels; ต้อง commit ก่อน 025 |
| 025 document metadata | student_files(id,student_id,file_type) / enum จาก 007a และ labels จาก 024 | คง storage uniqueness จาก 010 และ old resume/project indexes ตาม baseline ที่ผ่าน 013; ไม่อาศัย supervision/activities |

ไม่พบชื่อไฟล์ชนกับ Migration เดิม ชื่อ 022–025 ยังเป็น proposed reservation ต้องตรวจซ้ำก่อนใช้จริง Umzug ปัจจุบันค้น *.js เฉพาะ backend/src/db/migrations ส่วน prepared อยู่ backend/src/db/prepared/student-profile-phase2a/migrations จึงไม่ถูกค้นพบ

Source ใช้ relative imports ของ schema/migrationSupport ต้องรักษา bundle paths เมื่อทำ targeted resolver ห้ามคัดลอกเฉพาะ 4 ไฟล์ไปโฟลเดอร์เดิมแล้วรัน ใช้ source ในตำแหน่ง prepared ผ่าน explicit migration list ได้ดังที่ทดสอบ โดยไม่แก้ Runtime discovery

การเลือกเฉพาะ 022–025 ขณะ 019–021 Pending ผ่านได้บน baseline จริงที่สร้างใหม่ แต่ **ไม่ควรใช้ CLI เดิม db:migrate up** เพราะจะติดตั้ง Pending 019–021 ไปด้วย หลัง selective install แล้ว หากใครรัน CLI เดิมภายหลัง 019–021 ก็ยังจะถูกติดตั้ง ต้องบันทึกการเลือก/ระงับ Pending และกำหนด deployment discipline ชัดเจน ไม่แก้ Workflow อื่นในงานนี้

## 3. วิธีสร้าง Test Database และ Schema ตั้งต้น — PASS

ใช้ PostgreSQL 16 server เดียวกันแบบ **คนละ Temporary Database** ตามทางเลือกที่ผู้ใช้อนุญาต ไม่ใช้ schema ชั่วคราวภายใน intern_system และไม่ใช้ Docker/Volume เดิม

- Admin connection ใช้ database postgres เพื่อ CREATE เฉพาะชื่อ fitm_profile_2b1_<random 32 hex> จาก TEMPLATE template0 ไม่ใช่ template ของ Development จึงไม่คัดลอกข้อมูลส่วนบุคคล
- สร้าง login role เฉพาะรอบแบบ NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION ให้เป็น owner ของฐานทดสอบนี้ รหัสสุ่มไม่ถูกแสดงในรายงาน
- ใส่ database comment marker ที่มี nonce และ synthetic-only ตรวจ exact database name + marker ทุก pooled connection ก่อนส่ง queries
- Unit/integration guard ปฏิเสธ intern_system, ชื่อฐานทดสอบอื่น และ marker ว่าง การรัน harness ต้อง explicit FITM_PROFILE_PHASE2B1_TEST=true
- อ่าน credential ภายใน opt-in harness เท่านั้น ไม่ import live config/database.js, models/index.js, app หรือ executable migrate.js และไม่เปลี่ยน .env
- Replay **เฉพาะ 19 filenames ที่ Development ledger ระบุว่าติดตั้งแล้ว** ผ่าน Umzug/SequelizeStorage บนฐานว่าง ไม่รัน 019–021
- ไม่มี raw Development rows ใน fixtures ใช้ Student สังเคราะห์ 3 คน, Profiles 2 แถว, legacy files 4 แถว รวม profile ที่ NULL/ไม่ครบและ Student ที่ยังไม่มี profile

### ความต่างระหว่าง Migration History กับ Schema จริงที่พบ

Replay รอบแรกยังไม่เท่ากับ Development จึงหยุดก่อน 022–025 และ cleanup ฐานทดสอบ พบว่า submitted_at ใน coop_requests/job_postings/job_submissions มี DEFAULT CURRENT_TIMESTAMP ใน Development แต่ Source เดิมใช้ DataTypes.NOW ซึ่ง replay ด้วย QueryInterface แล้วไม่มี DB default

ปรับ **เฉพาะ 3 DB defaults ในฐานทดสอบ** ตามค่าที่ตรวจพบจริง แล้วเปรียบเทียบ public schema ทั้ง 29 ตาราง: named column types/lengths/precision/nullability/defaults, constraints, indexes, enum labels/order, triggers และ ledger ตรงกับ Development ก่อนลง 022–025 ไม่มีการแก้ Source Migration เก่าหรือ Development defaults

Physical column ordinal จากประวัติ ALTER บางคอลัมน์ต่างกัน เช่น prefix/profile_image จึงเปรียบเทียบ columns ตามชื่อ ไม่อ้างว่า physical ordinal เหมือนกัน การทดสอบใช้ named columns/Sequelize attrs ไม่มี INSERT ที่อาศัยตำแหน่งคอลัมน์ และไม่ซ่อนความต่าง type/default/FK/index

หลังทดสอบ close pool แล้ว DROP เฉพาะฐานที่ invocation สร้าง ตรวจชื่อ/OID/owner/marker ก่อน cleanup ไม่ใช้ FORCE ไม่ terminate session อื่น ไม่ลบ Docker Volume ไม่ reset intern_system แล้ว DROP เฉพาะ role สุ่มของรอบนั้น ทุก invocation ที่สร้างฐานระหว่างพัฒนา/ทดสอบ cleanup สำเร็จ ตรวจ catalog แบบ read-only ปิดท้าย: test databases ที่มี prefix รอบนี้เหลือ 0 และ test roles เหลือ 0

## 4. ผลทดสอบ Migration 022–025

| รายการ | ผล | หลักฐาน/พฤติกรรม |
| --- | --- | --- |
| 022 SQL/columns/CHECK | PASS | เพิ่ม scalar/default counter, old columns/rows unchanged |
| 023 SQL/tables/PK/FK/unique/index | PASS | เพิ่ม 4 owner relations พร้อม defaults/constraints |
| 024 enum append | PASS | คง 4 old labels และเพิ่ม 5 labels; commit แยก |
| 025 document columns/FK/index | PASS | metadata/new-type scope/same-owner supersedes/RESTRICT; คง legacy indexes |
| Types/nullable/defaults | PASS | ตรวจ catalog ทุกคอลัมน์ใหม่; counter=0, legacy file is_current=true |
| Duplicate direct up | PASS | 022/025 → 42701, 023 → 42P07; transaction rollback ไม่เปลี่ยน Schema/Data/Ledger |
| Duplicate enum up | PASS | IF NOT EXISTS ไม่เพิ่ม labels ซ้ำและไม่เปลี่ยนข้อมูล |
| Umzug up หลังติดตั้งครบ | PASS | [] / no-op ตาม ledger |
| ใช้ new enum label ก่อน commit | PASS | PostgreSQL ปฏิเสธด้วย 55P04; rollback label ที่เพิ่มใน test transaction |
| บังคับ SQL error หลัง DDL สุดท้ายของแต่ละ migration | PASS | actual division by zero 22012; managed transaction rollback ทุก DDL รวม enum; ledger/legacy rows unchanged |
| Re-up หลัง failed transaction | PASS | 022–025 ติดตั้งใหม่หลัง rollback สำเร็จทีละไฟล์ |
| Missing owner / cross-owner supersedes | PASS | PostgreSQL 23503 |
| Duplicate Profile / duplicate current address/file | PASS | PostgreSQL 23505 |
| GPA/ranges/rating/military/conditional license/key pair | PASS | invalid data → 23514 |
| Invalid Gregorian dates / leap years | PASS | 2023-02-30 และ 1900-02-29 → 22008; 2000/2024-02-29 ผ่าน |
| Physical files/encryption/readiness policy | NOT TESTED | ทดสอบ records/bytes datatype เท่านั้น ไม่มี upload/filesystem/encryption service ใหม่ |

Source 022–025/schema/models/support **ไม่ต้องแก้** จากผลทดสอบ ไม่มี DDL ที่ลบ/เขียนทับข้อมูลเดิม พบเฉพาะความต่าง baseline defaults และการคาดผล test NULL ซึ่งแก้ใน harness/tests ใหม่เท่านั้น

## 5. Rollback — แยกชนิดให้ชัดเจน

| ชนิด | ผล |
| --- | --- |
| Actual failed DDL transaction rollback (022–025) | PASS — catalog, ledger และ old rows เท่าก่อนเริ่ม; re-up หลัง error สำเร็จ |
| Migration down safe refusal | PASS — down ทุก source ปฏิเสธ PRESERVE_DATA โดยไม่ส่ง destructive SQL; Umzug down ไม่ unlog 025 |
| Re-up หลัง refused down | PASS — ledger-controlled no-op ข้อมูล/Schema เดิมยังอยู่ |
| Destructive down เพื่อถอด 022–025 | **NOT TESTED / UNSUPPORTED BY SOURCE** |
| Full reinstall หลัง destructive down | **NOT TESTED** เพราะไม่มี schema down ดังกล่าว |

ไม่อ้างว่าการปฏิเสธ down คือการถอน Schema สำเร็จ Source เดิมตั้งใจให้ application rollback โดยคง additive schema/data/enum labels การ cleanup Temporary Database เป็นการลบ fixture ทั้งก้อนหลังจบทดสอบ ไม่ใช่ production migration rollback

หากต้องการ reversible schema down เป็นเงื่อนไขก่อนติดตั้ง ต้องอนุมัติแผนแยกที่มี backup/dependency/data preservation และทดสอบเพิ่มเติม ไม่เพิ่ม DROP COLUMN/TABLE/rebuild enum เข้า Source โดยพลการ

## 6. ผลตรวจ Synthetic Legacy Data — PASS

ตรวจ digest ของทุก **คอลัมน์เดิม** ของ Student/Profile/File fixtures ที่มีอยู่ก่อน Migration ทีละ 022–025 เทียบก่อน/หลังและเมื่อจำลอง failure ด้วย original IDs/stable order ค่าตรงกัน ไม่ใช้ digest ของข้อมูลนักศึกษาจริง

เก็บครบทั้ง family/parent/emergency fields, phone/address free text, birth_date/numeric values, health, special_abilities/related_skills รวม comma/newline/ข้อความที่ยังไม่มี rating; ไม่มี automatic parse/backfill/duplicate profile

Profile ที่ NULL/ไม่ครบยัง query ได้ และ Student ที่ยังไม่มี Profile ยังไม่มีแถวใหม่จนทดสอบ explicit first-create เส้นทางจริง Cascade ของ relation ทดสอบบน Student สังเคราะห์ที่เพิ่มเพื่อ case นี้เท่านั้น; orphan insert ถูก FK ปฏิเสธ

เพิ่ม education 4 รายการ (รวม bachelor 2 records), training 7 รายการของ owner เดียว (มากกว่า 5), skills ครบ 4 ratings, structured addresses 2 types และ nullable drafts ได้ ไม่ล้าง free text เก่า

legacy files 4 ประเภทเดิมใช้ต่อได้โดยไม่ต้องมี hash/version ใหม่ ใช้ original_name ซ้ำได้เมื่อ storage_path ต่างกัน หลังเพิ่ม new types 5 ประเภทพร้อม supporting_other หลายไฟล์ old file rows/index definitions ไม่เปลี่ยน

ข้อมูลที่ prototype/controller เขียนภายหลังเพื่อทดสอบ concurrency เป็นการแก้ Synthetic fixtures โดยตั้งใจ แยกจาก preservation assertion ณ Migration commit ไม่อ้างว่า test mutations ภายหลังไม่ได้เปลี่ยน fixtures

## 7. Sequelize Compatibility และ Associations — PASS

สร้าง model registry เฉพาะฐานทดสอบจาก live model definers โดยไม่โหลด live registry จาก config จากนั้น merge extensionAttributes ลง existing Student/StudentProfile/StudentFile, refreshAttributes, define four new relation models และ associate ทั้ง existing/new models ตาม Source

ไม่มี Student/Account ซ้ำ ไม่เรียก sync() ไม่เพิ่ม model associations ลง Runtime Query จริงผ่าน Student→profile/files/addresses/education/training/skills JOINs และ relation→Student ผ่าน getStudent สำเร็จ

Create/read/reload records จริงยืนยัน timestamps, display_order=0, nullable fields เป็น NULL จาก PostgreSQL RETURNING, DECIMAL เป็น string, leading-zero postal code, BIGINT string และ BYTEA Buffer รวม DATEONLY/leap dates/boolean/new family fields ใน transaction ที่ rollback ภายหลัง

StudentProfile uniqueness และ owner FK/index/delete behaviour ทดสอบจริง New file current uniqueness, supersede same owner, version 1/2 preservation และ RESTRICT deletion ผ่าน DB จริง แต่ไม่มีการรับรองว่าสิทธิ์ role หรือการลบ physical files ปลอดภัยจาก FK อย่างเดียว

## 8. Profile Revision ที่ยังเหลือ และ Transaction Design

### ผลของระบบเดิมที่ยืนยันเพิ่มด้วย PostgreSQL

เรียก **Production controller เดิมโดยไม่แก้ Source** ผ่าน isolated Module ที่ inject เฉพาะ test registry ไม่แก้ global require cache หรือโหลด live DB:

- valid body ขาด If-Match → 428; stale → 409 ไม่เขียนทับ; readonly/owner fields → 400
- partial contact update รักษา family/skills; response revision ตรงกับ read-back; invalid date → 400
- SQL connections พร้อมกันใช้ snapshot เดียว: 1 success / 1 conflict ทั้ง existing Profile และ first-create; ไม่มี duplicate

เป็น controller+real SQL test โดยจำลอง req/res และ owner ที่ยืนยันใน fixture **ไม่ใช่ authenticated HTTP/browser test ใหม่** ผล HTTP/auth mocks ของ Phase 1 ยังอยู่ใน Existing Backend Suite ไม่มี API Contract เปลี่ยน

ตรวจด้วย SQL จริงว่า insert training record และ increment profile_data_revision **ไม่เปลี่ยน Phase 1 hash** เพราะ hash เดิมครอบ owner + profile identity/updatedAt/28 fields เท่านั้น Counter ที่เพิ่มใน Schema ไม่ถูกใช้เองโดย controller จึงห้ามเปิด relation write API แล้วอ้างว่ามี aggregate concurrency แล้ว

### Client/Writer Matrix และขอบเขต Revision ที่เสนอ

| Write path | ระบบปัจจุบัน | ขอบเขตที่เสนอ / งานที่ต้องอนุมัติ |
| --- | --- | --- |
| PUT /student-profile/me และ alias / | If-Match บังคับ; client updateMyStudentProfile(data,revision) → student_coop.js frozen dirty payload | คง partial/allowlist/ownership และขยายการคำนวณ token เป็น aggregate ภายหลัง |
| PUT /student-profile/student-info | updateStudentInfo(data) ใน student_coop.js ไม่มี revision; writes major/year_level/gpa/advisor_teacher_id ไม่มี shared transaction | รวมข้อมูลการศึกษาที่เป็น Profile จริง; ปรับ client signature/header, response token, server lock/compare และ draft handling พร้อมกัน |
| POST /student-profile/profile-image | uploadStudentProfileImage(FormData) ไม่มี revision; Student.profile_image + physical replace | ถ้ารูปเป็นส่วน Profile/snapshot ให้รวม revision พร้อม immutable/reference-retention policy และปรับ client/server |
| New profile PDF/documents | ยังไม่มี endpoints; enum/model prepared ไม่ใช่ permission ให้ upload | transcript/ID/student ID/supporting/external profile PDF ที่กระทบ readiness/evidence ต้อง aggregate writer; ไม่พัฒนา PDF import/OCR |
| Education / Training / Skills / Address | ยังไม่มี production API | ทุก create/update/explicit delete ต้อง owner-lock-first และ compare aggregate revision; omitted preserve ไม่ replace arrays |
| Family/Emergency | fields เดิมอยู่ใน /me; fields เพิ่มยังไม่เปิด | อยู่ใน transaction/counter เดียวกับ Profile ไม่สร้าง writer แยกที่ bypass revision |
| Resume upload/extraction | StudentFile.resume แยก ไม่มี update StudentProfile fields; เกี่ยวกับ matching/resume | เสนอเป็น independent file API ถ้าไม่ถูกใช้ใน readiness/ack snapshot; หาก policy ผูกกับ Profile evidence ต้องรวม revision+immutable file version ก่อน |
| Project poster/book/practice-log files, Internship Logs, approval/student status | Workflow เดิมแยกจาก TGDE Profile content | ไม่รวม revision โดยอัตโนมัติ ไม่เปลี่ยน business logic/status ของระบบอื่น |

Photo/academic callers ทั้งหมดที่พบยังไม่มี If-Match จึงไม่เพิ่ม precondition เฉพาะ Server แล้วทำให้ UI เดิมเสีย ต้อง migrate clients/writers ที่อยู่ใน approved scope พร้อมกัน ไม่มีหลักฐาน external clients นอก repo ต้องตรวจเพิ่มก่อน switch

advisor_teacher_id เป็น field ของ student-info ตาม allowedFields เดิม ส่วน coop_advisor_teacher_id/status/approval assignment ต้องคง authority ของ Workflow เดิม ไม่ย้ายสิทธิ์แก้มา Profile ระบุ watchlist ของ Student columns ที่รวม token ให้ชัด ไม่ใช้ Student.updatedAt ทั้งแถวเพราะ Workflow อื่นอาจเปลี่ยน timestamp โดยไม่เปลี่ยน Profile

### Proposed transaction boundary — ยังไม่ใช่ Business Logic ที่เปิดใช้

1. อ่าน aggregate ด้วย consistent snapshot: transaction + owner SHARE lock ก่อนอ่าน children (writers ทุกเส้นทางต้อง owner-lock-first) หรือ REPEATABLE READ ที่ทดสอบให้เหมาะสม ไม่ผสม counter/child data คนละ snapshot
2. Writer อ่าน JWT owner, validate payload shape, เริ่ม transaction, lock students owner FOR UPDATE ก่อน child/file rows แล้วโหลด token ภายใน transaction
3. Compare quoted aggregate SHA-256 กับ If-Match: missing valid-body precondition=428, stale=409 คืน authorized latest revision ไม่มี mutation; invalid body อาจเป็น 400 ตามลำดับ validation เดิม
4. Apply เฉพาะ explicit dirty fields/stable owned IDs; omitted scalar/relation preserve, explicit nullable clear, deletes เป็น IDs ที่ owner ถือ ไม่ถือ empty array เป็น delete-all; validate ownership/readonly/date/type/conditional rules ทั้งก่อนและใน transactionตามข้อมูลปัจจุบัน
5. Atomic SQL increment BIGINT counter ใน transactionเดียวกับ mutations แล้ว reload canonical snapshot/counterก่อนคืน response; อ่าน counterเป็น string/BigInt ไม่ Number Counter ไม่ได้ใช้แทน authorization
6. 28-field Profile, academic/photo/new scalars/relations/profile documents ต้องเข้ากลไกเดียวกันก่อนเปิด write routes หากเลือก DB triggers เป็น defense ต้องออกแบบ scope/owner-lock order/ไม่ bump ซ้ำกับ serviceและทดสอบ direct SQL writers แยก ไม่มี trigger ใหม่ในงานนี้

Token รูปแบบ quoted SHA-256 และ header/body contract เดิมสามารถคงไว้ แต่ algorithm/scope เปลี่ยนต้อง review activation ทุก reader/writer; v1 tab เก่าอาจได้ 409 และต้องเก็บ draftให้ review/reload ไม่ fallback ยอม stale v1 กับ new relations

Files: validate owner/type/MIME/extension/magic/size และเขียน bytes ลง **unique private path ที่ยังไม่มี recordเปิดอ่าน** ก่อน transaction; ใน transaction lock owner/check revision/create immutable version/reference/deactivate previous current/incrementcounter; failure cleanupเฉพาะ new pathของ request หลัง rollback, commitแล้วจึงcleanup old bytesตาม retentionและ snapshot references ต้องมี orphan/crash recovery plan เพราะ filesystemกับDBไม่ใช่ atomic transactionเดียวกัน ห้ามลบ old versionที่รับรองแล้ว

### Prototype เฉพาะใน Test — PASS, Production activation = FALSE

Test-only coordinator ใช้ real SQL owner FOR UPDATE + aggregate counter/hash ทดสอบสอง connections ที่เขียนคนละ relation ได้ 200/409 และ counterเพิ่มเพียงครั้งเดียว ทดสอบ SQL failure rollbackทั้ง child/counter และค่า BIGINT 9007199254740993→9007199254740994 โดยไม่เสีย precision

ทดสอบ mutation categories personal/family/emergency/academic/photo metadata/file metadata/education/training/skills/address ใน shared boundary; token เปลี่ยนและ stale tokenไม่เรียก mutation callback ตัวอย่างนี้ **ไม่ได้** ทำ HTTP routes, authorization/readiness/input validators/file IO หรือ activate aggregate ใน runtime จึงห้ามถือว่า production writer gapsแก้แล้ว

## 9. ไฟล์ที่เพิ่ม / เปลี่ยนในรอบนี้

เพิ่ม 4 ไฟล์:

- backend/test/helpers/studentProfilePhase2B1Postgres.js — isolated provisioning/read-only audit/catalog/guard/cleanup/targeted Umzug
- backend/test/studentProfilePhase2B1Postgres.test.js — actual PostgreSQL integration + controller/transaction prototypes เฉพาะ Test
- docs/audits/FITM_STUDENT_PROFILE_PHASE2B1_POSTGRES_RESULTS.json — machine-readable metadata/results/source hashes
- docs/audits/FITM_STUDENT_PROFILE_PHASE2B1_PREFLIGHT.md — รายงานนี้

SHA-256 เทียบไฟล์เดิม 279 ไฟล์ใน backend/src/frontend/src/backend/test/frontend/test ก่อน/หลัง **ไม่เปลี่ยน** รวม prepared Source/model/migration และ Phase 1 ไม่มีการแก้ frontend/Runtime/related workflows/.codex/config.toml/.env

## 10. ผล Backend Tests และวิธี Run

| Suite | PASS | FAIL | SKIP / NOT TESTED |
| --- | ---: | ---: | --- |
| Focused PostgreSQL Integration | 30 (29 subtests + parent) | 0 | 0 skipped; ขอบเขต NOT TESTED ตามรายงาน |
| Full Backend Tests รวม Phase 1/2A/2B.1 | 261 จาก 278 tests | 0 | 17 tests ต้อง environment/DB ของระบบอื่น ไม่เปิด |
| Syntax ของ helper/test ใหม่ | PASS (node --check ทั้ง 2 ไฟล์) | 0 | — |
| Frontend Tests/Build รอบนี้ | ไม่รัน | — | NOT TESTED: ไม่มี Frontend/dependency/runtime change; นอกขอบเขต Phase 2B.1 |

~~~powershell
# Working directory: backend
$env:FITM_PROFILE_PHASE2B1_TEST='true'
node --test --test-isolation=none test/studentProfilePhase2B1Postgres.test.js

# Full backend run: เปิดเฉพาะ integration ใหม่ / ปิด opt-in DB suites อื่น
$env:RECRUITMENT_INTEGRATION_TEST='false'
$env:ROLE_BACKEND_INTEGRATION_TEST='false'
$env:STUDENT_FILE_MIGRATION_TEST='false'
# Remove unrelated *DISPOSABLE_DATABASE_URL from this test process environment.
node --test
~~~

คำสั่ง integration นี้สร้างและลบเฉพาะ temporary test DB/role ทุกครั้ง ต้องใช้ local PostgreSQL 16 พร้อมสิทธิ์ provision; ถ้าไม่มีสิทธิ์หรือ guard/schema comparison ไม่ผ่าน จะหยุดก่อน target migrations ไม่ใช้ Development แทน

## 11. ความเสี่ยงก่อนติดตั้งจริง — ยังไม่ถูกแก้ด้วย Schema

- Migration History replay default ต่างจาก Development 3 จุด ต้องบันทึกและทำ preflight actual catalogเสมอ ห้ามแก้ defaults Developmentเพื่อให้ตรง testsโดยไม่มีงานแยก
- 019–021 Pending + broad runner อาจติดตั้ง Workflow อื่นโดยไม่ตั้งใจ และ dependency020→019 ต้องคงไว้
- Additive up อนุรักษ์ข้อมูล แต่ **ไม่มี destructive down** หากยอมรับ code rollback + retain schemaไม่ได้ ต้องอนุมัติ rollback designเพิ่มก่อนติดตั้ง
- Normal indexes/composite UNIQUE และ CHECK validation อาจ block writes/ใช้เวลา ต้องวัดบนข้อมูลขนาดที่อนุมัติและเตรียม maintenance window/backup ยังไม่ทดสอบ production-size performance
- DDL commit กับ Umzug ledger write ไม่อยู่ transactionเดียวกันใน storage ปัจจุบัน หาก commit DDLสำเร็จแต่เขียนledgerล้มเหลว ห้าม rerun force/upsert metadataโดยเดา ต้องตรวจcatalog+checksumและกู้ledgerตาม runbookที่อนุมัติ Direct duplicate DDLทดสอบว่าปฏิเสธอย่างปลอดภัย แต่ไม่ได้จำลอง storage/network crashทุกแบบ
- Schema installed ไม่ทำให้ aggregate counter active ช่อง academic/photo/new relation writer ยังมีอยู่ใน production และไม่ควรเปิด APIใหม่ก่อนแก้coordinatedrevision
- Current Profile includes / Student.toJSON ซ่อนเฉพาะ password ต้อง explicit DTO/role projectionก่อน merge private fieldsใน live models การเข้ารหัสไม่ใช่เหตุให้เผย ciphertext/key metadata ผ่าน response
- Private file access/physical immutable version/retention/encryption keys/readiness/ack/legal signatures ยัง Pending Policy ไม่ใช่สิ่งที่ FK/indextestsรับรอง
- ไม่ทดสอบ Student deletionที่มีครบทุก legacyWorkflow/immutable evidence ไม่เปลี่ยน delete behaviourระบบอื่น สินทรัพย์ใหม่/ackต้องมีretentionและowner policyก่อนเปิด writes

## 12. ข้อเสนอ Phase 2B.2 — ต้องรอคำสั่งผู้ใช้

1. อนุมัติ target DB, backup/restore verification, maintenance window และ explicit filenames 022–025 เท่านั้น พร้อมยอมรับ rollback strategyแบบคง additive schema หรืออนุมัติงาน rollbackเพิ่มเติม
2. ตรวจ catalog/history/source SHA-256 ล่าสุดเทียบหลักฐานนี้และไฟล์ collision; ยืนยัน 019–021แยก ไม่เพิ่ม dependencyที่ไม่มีจริงหรือใช้ broad up
3. จัดทำ/review targeted resolver ที่ใช้ current bundle paths และ shared sequelize_meta โดยมี allowlist/target/precondition guard; prepared guardต้อง enableเฉพาะ contextที่อนุมัติ ไม่แก้ live discovery/modelก่อน schemaพร้อม
4. Install 022→023→024 (commit)→025 แยก transactions/verifyledgerต่อไฟล์ ห้ามรวม enum+constraintใน transactionเดียว คง ไม่มี Backfill/legacy rewrite
5. Verify columns/constraints/index validity/enum/ledger/API Profile เดิมและข้อมูลที่ได้รับอนุญาตอ่านก่อนเปิดmodels ให้ private DTOs/role scopeพร้อมก่อน model activation
6. แยก **Schema installation approval** จาก **aggregate API/model/write-route activation** ไม่เปิดnewrelation writesเพียงเพราะ migrationผ่าน อนุมัติการแก้ academic/photo/client contractsและ filepolicyก่อน
7. ไม่ติดตั้ง 019–021 ไม่แก้ workflows/log/calendar/front5tabs/PDF importจากงานนี้ หากต้องการให้ทำส่วนอื่นต้องคำสั่งแยก

สถานะสุดท้าย: **Pre-flight Migration/Sequelize/Legacy preservation/transaction tests PASS; Production aggregate revisionและdestructive schema rollbackยัง NOT TESTED/ไม่เปิดใช้** หยุดรอ Phase 2B.2 ไม่มีการติดตั้ง Development ในรอบนี้
