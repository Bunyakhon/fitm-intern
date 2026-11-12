# Teacher Search & Filter — Separate Synthetic Dataset — 11 November 2026

อัปเดต 11 พฤศจิกายน 2026 (Asia/Bangkok). งานรอบนี้เพิ่ม Search/Filter จริงใน Teacher ทั้งสามเมนู และผู้ใช้อนุญาต Additive Schema Upgrade/INSERT Synthetic Students ใหม่35คน/Read-only Preflight/Post-Commit SELECT บน Development `intern_system.public` โดยตรง. ไม่อนุญาตรัน Test Suite/Browser/Build/Lint/Syntax/API tests. ส่วน Demo15คนด้านล่างเป็นประวัติวันที่10พฤศจิกายน ไม่ใช่ยอดทั้งหมดของระบบปัจจุบัน.

**Database execution:** PostgreSQL16.15/public/intern_system, Teacher UUID `e9876862-0d5b-4641-8d5f-990ea3f0b146` active/account enabled ยืนยันจาก DB ก่อนเขียน. ก่อนงานมี Students22/CoopRequests18/AdvisorRequests8 ตาม SELECT ปัจจุบัน. ไม่เลือก Teacher จากชื่อและไม่แก้บัญชี/สิทธิ์. Schema และ Seed COMMIT แล้ว; SELECT transactionใหม่หลัง Commit ยืนยัน635แถวและ fingerprint ข้อมูลเดิมที่เกี่ยวข้องทั้งหมดตรง baseline.

| ปีการศึกษา | ภาค 1 (IT / INE) | ภาค 2 (IT / INE) | รวม |
|---|---:|---:|---:|
| 2567 | 5 (3 / 2) | 5 (2 / 3) | 10 |
| 2568 | 6 (3 / 3) | 6 (3 / 3) | 12 |
| 2569 | 8 (4 / 4) | 5 (4 / 1) | 13 |
| รวม | 19 (10 / 9) | 16 (9 / 7) | 35 (IT19 / INE16) |

SELECT แบ่งตามความสัมพันธ์จริง: กลุ่มคำร้อง12 / คำขอที่ปรึกษา11 / นักศึกษาในความดูแล12; ทุกกลุ่มมีหลายปี/ภาคและทั้งสองสาขา. นักศึกษาทั้ง35มี CoopRequest รองรับ Company/Job/Placement จริง จึงมีคำร้องสหกิจรวม35รายการในชุดนี้ รวม23 supporting requests ของอีกสองกลุ่ม; ตัวกรองสถานะอาจแสดง supporting requests ด้วยตาม ownership เดิม ไม่ใช่มีคำร้องในฐานข้อมูลเพียง12รายการ. ยอด Toolbar รวมข้อมูลเดิมที่มีสิทธิ์ด้วย ไม่ hardcode35หรือ12/11/12ใน Frontend.

**INSERT635 / UPDATE0 / DELETE0:** Period6, Students35, Profiles35, Skills35, Education35, Projects35, Companies35, JobSubmissions35, Jobs35, WorkModes35, CoopRequests35, DeliveryMethods35, CourseSnapshots175, AcademicStates35, Mentors23 (verified12/pending11), AdvisorRequests11. SELECT ยืนยัน35ความสัมพันธ์ Student→Request→Company/Job/Project/AcademicState, snapshots175, IT19/INE16, supervised12/advisor11, verified12/pending11. ไม่มี Appointment/Result/Image/ApprovalHistory/VerificationToken/Email ที่ Seeder สร้าง.

## Schema / API / UI

- เพิ่ม Model `CoopAcademicPeriod` (`academic_year`, `semester` เฉพาะ1/2) พร้อม unique year+semester/CHECK; nullable FK `academic_period_id` ใน `coop_requests` และ `coop_project_advisor_requests`, indexes ตาม ownership/period. เป็น additive explicit upgrade ที่ `backend/src/db/addCoopAcademicPeriods.js` ใช้ร่วมกับ Model/integrity definitions; ไม่ติดตั้ง migration framework/ledger ไม่ sync/alter/reset/startup DDL. ไม่มี UPDATE/backfill Records เดิม; รอบที่ไม่ทราบคงNULL. Class Advisor และ Coop Advisor ยังแยกกัน.
- Period ผูกต่อคำร้อง ไม่ใช่ Student singleton; นักศึกษาคนเดียวมีหลายคำร้องต่างรอบได้โดยไม่เขียนปีทับประวัติ. Supervised student filter ใช้ EXISTS กับ Placement ที่ approved/document_issued/in_progress โดยปี+ภาค+บริษัทอ้างคำร้องเดียวกัน ไม่ cross-match คนละรอบ และนับนักศึกษาไม่ซ้ำ. Topic ยังใช้ Project ตาม API เดิม ไม่เพิ่มนโยบายหรือฟอร์ม Student.
- API Teacher Coop/Advisor เพิ่ม `search/year/semester/major/metadata=1`; ไม่ส่งmetadataยังคืน Array ตาม contract เดิม. Coop ใช้ `{success,data:{rows,total,years,offset,limit}}`; Advisorใช้metadata object โดยตรง. Supervisionคง`students`และเพิ่ม`total/years/offset/limit`. ตรวจTeacher active/ownership และ Middleware RBACเดิม; SQL bind parameters, escape `%/_/backslash`, trimและILIKE; ไม่ค้น Email/Token/ข้อมูลส่วนตัวอ่อนไหว. คง sort/statusเดิมและทำ count/page/hydrationใน Repeatable Read transaction.
- Toolbarร่วมวางเหนือรายการ: Search/ปี2567–2569และปีอื่นจากDBที่อยู่ในscope/ภาค1–2/IT–INE/สถานะเดิม/ค้นหา/ล้างตัวกรอง. เปลี่ยนSelectหรือค้นหากลับหน้า1. แสดงtotalจากDB, Loading/Empty/Error/Retry, request ticket+session-token guard; ปิดControlsระหว่างโหลดเพื่อไม่ยิงคำขอซ้อน และเก็บ focusในToolbar. Grid4/2/1คอลัมน์ตามพื้นที่; labels/ARIA/Enter/Shared Feedbackเดิม. เก็บSelected Student/DraftผลนิเทศและScheduleระหว่างFilter/Pagination; ไม่แก้Sidebar9เมนู/Popup/ApprovalActions.

## Seeder commands and ownership

คำสั่งที่ใช้จริงจาก Repository root ในงานนี้:

```powershell
node backend/src/seeders/teacherSearchDemo.js --inspect
node backend/src/seeders/teacherSearchDemo.js --apply-schema
node backend/src/seeders/teacherSearchDemo.js --inspect
node backend/src/seeders/teacherSearchDemo.js --apply
node backend/src/seeders/teacherSearchDemo.js --verify-data
```

Markerใหม่ `fitm.teacher-search.v1`, deterministic UUIDs/รหัสจำลองคนละช่วงกับชุดเดิม, receiptแยกใน `.local-dev-accounts/intern_system-teacher-search-v1.json` ซึ่งGit ignoreอยู่แล้ว. ReceiptมีเฉพาะIDs/digests/baseline ไม่เก็บrawrows/credentials. PreflightตรวจSchema/FK/CHECK/indexes/Teacher/catalog/ID+natural-key collisions/Model fields+validators ก่อนเขียน; ใช้normal Model hooksและSerializable transaction/advisory lock/table locks/constraintsตามปกติ. สร้างStudentตามhookเดิมด้วยrandom passwordที่ทิ้งทันที ไม่แจกหรือบันทึกไว้เพื่อLogin; ไม่สร้างหรือแก้บัญชีTeacher/SuperAdmin. ไม่ import Mail/API/App startup. Idempotent branchเมื่อReceipt/plan/ทุกrow/baselineตรงกันคืนno-op; หากข้อมูลถูกใช้หรือเปลี่ยนแล้วให้หยุด ไม่reset/repair/replay. **ไม่ได้รันApplyซ้ำเพื่อทดสอบ.** Pending/uncertain commitเก็บintentและหยุด ไม่ลบหลักฐานอัตโนมัติ; ลบได้เฉพาะpendingที่คำสั่งเป็นเจ้าของหลังทราบRollbackแน่นอน.

ปรับเฉพาะfingerprint projectionในSafety/Completion helperของSeederเก่าให้ละnullable periodที่เป็นNULL เพื่ออ่านReceiptก่อนเพิ่มคอลัมน์ได้ต่อ; ค่าperiodที่ไม่NULLยังทำให้fingerprintเปลี่ยน. ไม่แก้Receiptหรือข้อมูลDemo15คนเดิม และไม่รันSeederเก่า.

## Limits / Manual Acceptance

- ข้อมูลทั้งหมดเป็นSynthetic: ชื่อไทย/อังกฤษไม่ซ้ำในชุด บริษัท/ตำแหน่ง/หัวข้อ/เครื่องมือตามITหรือINE ที่อยู่ตามจังหวัด, Contactจำลอง/example.com. ปี/ภาคเป็นค่าที่กำหนดในแผนโดยตรง; วันที่ฝึกสอดคล้องกับรอบ ไม่ใช้วันที่เดาPeriod. ปี2567–2568ใช้สถานะapproved/rejectedตามModel, ปี2569มีpending/advisor_review/approved/in_progress; ไม่มีenum completed จึงไม่ประดิษฐ์Completedหรือผลนิเทศย้อนหลัง.
- GPA/last_semester_gpa/EducationGPA=NULL. Original snapshots5วิชาต่อคนจากCatalogจริงแยกตามสาขา; status=unselected/grade=NULL, LatestตรงOriginalและไม่มีHistoryอัปเดตที่แต่งขึ้น. มีข้อมูลสำหรับแสดงAcademic UI แต่ไม่ใช่Transcript/ผลสอบ/หลักฐานผ่านเกณฑ์ และอาจยังไม่ผ่านGuardบางขั้นที่ต้องมีผลการเรียน. ไม่สร้างประวัติว่าTeacher/Headอนุมัติจริง; สถานะSeedเป็นsimulation. Academic certification policyเดิมยังPending.
- Preflight SELECTครั้งแรกหยุดด้วยSQL25006จากCatalog runtime readerที่ใช้FOR SHAREในread-only transaction; แก้Seederให้SELECTCatalogโดยตรงและwriter lockก่อนอ่านรอบสุดท้าย ไม่มีDB writeจากคำสั่งนั้น. Post-Commit reportครั้งแรกหยุดด้วยSQL42601เพราะalias yearขาดAS; แก้เฉพาะSELECTแล้วอ่านใหม่ยืนยันสำเร็จ ไม่มีINSERTซ้ำหรือDB UPDATE/receipt repairจากการแก้Report.
- หลังBackend restart/Frontend reload ให้ผู้ใช้เปิดทั้งสามเมนู ตรวจค้นไทย/อังกฤษ/ชื่อเต็ม/partial/trim/ตัวพิมพ์ใหญ่เล็ก/อักขระ%และ_เป็นliteral; ผสมปี+ภาค+สาขา+สถานะแบบAND; ล้างตัวกรอง; count/page/resetหน้า1; unknownไม่ตรงปีที่ระบุ; Error/Retry/ไม่มีAPIซ้ำ/Sessionหมดอายุ; Popup/Draft/SelectedStudent/นิเทศไม่หาย; Responsive1280/768/390/320pxและKeyboard. ทดสอบบัญชีTeacherอื่นเพื่อยืนยันownership และApprove→HeadReview/AdvisorAcceptReject/Scheduling1–2/MentorVerification/ResultDraftImagesCompleteตามWorkflowเดิมด้วยตนเอง.

**Tests: NOT RUN — USER-OWNED TESTING.** ดำเนินเฉพาะSchema/SeedจริงและSELECTPreflight/Post-Commitที่ผู้ใช้อนุญาต ไม่รันUnit/Integration/E2E/API/Browser/Build/Lint/Typecheck/Syntax/health checks. **NEXT TASK: USER MANUAL ACCEPTANCE IN CHROME.**

---

# Historical Teacher Demo Dataset — Completed Existing Development Fixtures

อัปเดต 10 พฤศจิกายน 2026 (Asia/Bangkok). **เติมข้อมูลจริงและ PostgreSQL COMMIT แล้ว** บน `intern_system/public` สำหรับ Teacher UUID `e9876862-0d5b-4641-8d5f-990ea3f0b146`.
ใช้ Synthetic Students เดิม15คนตาม marker/UUID เดิม ไม่สร้าง Student ใหม่. คำสั่งผู้ใช้รอบนี้อนุญาต UPDATE Synthetic/INSERT Supporting/Academic Snapshot และ SELECT หลัง Commit โดยตรง รวมการเก็บ immutable rows ไว้ใน Development; แทนข้อจำกัด minimal seed ที่ไม่สร้าง Academic ด้านล่างเฉพาะงานนี้.

## Actual completion result

| กลุ่มข้อมูล | ผลหลัง Commit |
|---|---:|
| Synthetic Students เดิม / มี Academic Data | 15 / 15 |
| Pending Coop A / Pending Advisor B | 5 / 5 |
| Supervised C ใหม่ / รวมเดิม1คน | 5 / 6 |
| Company / Job / Project | 15 / 15 / 15 |
| Mentor verified C / pending B | 5 / 5 |
| Original course snapshots / Academic state / Academic history | 75 / 15 / 15 |
| Submission review history ของ Pending A | 5 |
| Education records / Current addresses / Skills | 15 / 15 / 30 |

**INSERT เพิ่ม175แถว, UPDATE Synthetic เดิม92แถว, รวม Fixture320แถวหลังเติม** (เดิม145แถว).
INSERT: Snapshot75, State15, Academic History15, Submission Review5, Mentor pending5, Education15, Address15, Skill30.
UPDATE: Students15, Profiles15, Jobs15, Projects15, Coop Requests15, Companies12 และ Mentors5.
Companiesอีก3รายมีค่าที่อยู่ตรงแผนแล้วจึงไม่ UPDATE. ไม่มี DELETE/UPDATE Teacher/นักศึกษาจริง/Schema/Trigger/Constraints/Auth/API/Frontend.

ผลล่าสุดรวม75วิชา: **ผ่าน42 / กำลังศึกษา21 / ไม่ผ่าน9 / ยังไม่ระบุ3**. Catalog IT ที่ Active จริงมี5วิชาต่อคน จึงไม่สร้าง8–10วิชาสมมตินอก Catalog.
Snapshot ณวันยื่นเวลา09:00น. มีสถานะดั้งเดิม; Academic History หลังยื่นเวลา09:30–10:12น. แยกผลล่าสุด ไม่แก้ Snapshot ทับ.
ตัวอย่าง `9906990000001`: ระบบฐานข้อมูล060243108 กำลังศึกษา→ผ่าน B; `...0002`: วิเคราะห์และออกแบบระบบ060243112→ผ่าน C+; `...0003`: ระบบฐานข้อมูล060243108→ไม่ผ่าน F. ข้อมูลทั้งหมดเป็น Fixture Simulation ไม่ใช่ผลการเรียนจริง.

## Source mapping / what the pages actually read

| พื้นที่ | แหล่งข้อมูลจริง |
|---|---|
| Coop detail ชื่อ/รหัส/สาขา | `coop_requests.student_id` → `students`; roleWorkflow student projection เดิม |
| บริษัท/ผู้รับหนังสือ/ช่วงฝึก | Snapshot fields ใน `coop_requests`; ข้อมูล Company join ผ่าน `company_id` |
| ตำแหน่ง/รายละเอียดงาน | `job_posting_id` → `job_postings.title/description` |
| รายวิชา ณวันยื่น | `coop_request_prerequisite_courses` ผ่าน `prerequisiteInclude` |
| ผลล่าสุด/จำนวน/ประวัติ | `coop_request_academic_states` + `coop_request_academic_history` → `academicSummary` เดิม |
| ประวัติคำร้อง | `coop_request_reviews` ของ A5: Student Submit new→advisor_review |
| Advisor Request | `coop_project_advisor_requests` pending + `students` + `coop_projects.topic` |
| Supervised Student / นิเทศ | `students.coop_advisor_teacher_id`, approved `coop_requests`, verified `mentors.student_id`; Company ของ Mentor อ้างผ่าน Placement ไม่ใช่คอลัมน์ Mentor |
| Profile ภาษาอังกฤษ/ที่อยู่/การศึกษา/ทักษะ | `student_profiles`, `student_addresses`, `student_education_records`, `student_skills` ของ Student Profile aggregate เดิม; ไม่เพิ่มให้ Teacher API เปิดเผย Fields ที่เดิมไม่คืน |
| Dashboard | API queues/list เดิม5+5/6 ไม่มี Mock หรือ Hardcoded Count ใน UI |

## Completion execution / receipt

จาก Repository root:

```powershell
node backend/src/seeders/teacherDashboardDemo.js --complete-fixtures --apply --teacher-id=e9876862-0d5b-4641-8d5f-990ea3f0b146
node backend/src/seeders/teacherDashboardDemo.js --complete-fixtures --verify-data --teacher-id=e9876862-0d5b-4641-8d5f-990ea3f0b146
```

Preconditions: Development configเดิม/loopback5432/PG16/public/Teacher Active/account enabled, original committed receipt/UUID+marker ตรงชุดเดิม, ไม่มีข้อมูลที่ถูกแก้ภายนอกหรือ unfinished receipt. Apply ใช้ Serializable transaction/advisory lock/row locks/Model validation/hooks/FK เดิม, UPDATE เฉพาะ92แถวใน original receipt และ INSERT supporting IDs แบบ deterministic. ตรวจว่า Company/Job ไม่ถูกอ้างโดย Student นอก Fixture; เก็บ Fingerprint Teacher/Studentเดิมไว้.
Receipt ที่ ignored เก็บ `completion.version/spec_digest/rows` เพิ่มจาก145แถวเดิม และปรับ fingerprint ของ Synthetic ที่ได้รับอนุญาตให้เปลี่ยน. ไม่ให้ base `ALREADY_PRESENT_UNCHANGED` ข้าม completion. Snapshot/History ที่มีแล้วใช้ซ้ำเฉพาะ ID/values ตรงกัน ไม่ UPDATE/DELETE; ชุดที่ครบใช้ `ALREADY_COMPLETE_UNCHANGED`.
หากพบ pending receipt/commitไม่แน่ชัด ให้หยุด writer เพื่อสอบสวนด้วย SELECT ไม่ลบหลักฐานหรือ replay โดยอัตโนมัติ. Receipt finalization ไม่ใช่ distributed transaction กับ PostgreSQL.

**Execution evidence รอบนี้:** Apply=`COMPLETION_APPLIED`, PostgreSQL COMMIT สำเร็จ; transactionใหม่ `SET TRANSACTION READ ONLY`=`COMMITTED_COMPLETION_SELECT_VERIFIED`, ตรวจ fingerprint320แถว/TeacherและStudentจริงเดิม1คน/ความสัมพันธ์และ DTO fields ที่ Popup อ่าน. Apply ซ้ำ=`ALREADY_COMPLETE_UNCHANGED`, INSERT0/UPDATE0, ไม่มี Student/Fixture ซ้ำ. นี่คือ Seed Execution/SELECT ที่ผู้ใช้อนุญาต ไม่ใช่ Test Suite หรือ Chrome Acceptance.

## Supported-field limitations / retained workflows

- ไม่มี credit/course transcript/GPA formula ใน Schema/Service ปัจจุบัน จึงไม่ประดิษฐ์หน่วยกิตหรือ GPAX จาก5วิชา prerequisites. ล้าง GPA/last_semester_gpa แบบค่าคงที่ของ Synthetic15คนเป็นNULL; Education GPA=NULL เช่นกัน. ยังไม่ใช่ Transcript ครบหลักสูตร.
- ไม่มีปี/ภาคเรียนแบบ structured ใน Academic Course Schema; บันทึกบริบท2569ภาค2ในข้อความ qualification ของ Education และในเอกสารนี้ ไม่เพิ่มคอลัมน์.
- Project มีเพียง `topic`500อักษร: เก็บหัวข้อ/วัตถุประสงค์/เทคโนโลยีสั้นในช่องเดิมและรายละเอียดใน Job description; ไม่มี English project title/document/status column แยก. ไม่สร้าง CO-09/PDF/ไฟล์สมมติ.
- Mentor ไม่มี phone/department/company_id columns: เก็บแผนก/บริษัทใน position ที่มี และใช้ Placement เชื่อม Company. C5 verifiedพร้อม verified_at เดิม, B5pending/verified_at=NULL, Aยังไม่Placementจึงไม่สร้างMentor. ไม่มี Verification Token/Email/นัดหมายอัตโนมัติ.
- ไม่สร้าง Teacher/Head approval log ปลอมให้ supporting approved B/C; คงประวัติตามที่มี. A5มี submission history และยังรอ Teacher จริง. Bยัง coop advisor=NULL ก่อนAccept; C5คง Coop Advisor เดิม. Academic data ไม่ใช่การรับรองคุณสมบัติออกฝึก; policy pendingเดิมไม่เปลี่ยน.
- Snapshot/Academic History/Reviewเป็นข้อมูลที่อาจ immutable และเก็บต่อใน Developmentตามที่ผู้ใช้ยอมรับ ไม่ทำ row cleanup/reset.

**Manual Chrome checklist:** ตรวจDashboard5+5/6 → เปิด Popup A5เห็น Snapshot/Latest/Historyต่างกันและ Company/Job/ผู้รับครบ → Pending Advisorมีหัวข้อแตกต่าง/ยังไม่เป็น Coop Advisor → C5มีVerified Mentorตรงบริษัทและสร้างนัดครั้ง1–2ด้วย Workflowเดิม → Studentจริงเดิมยังอยู่. ตรวจ Responsive/Error/Approve/Reject/Accept/Reject/นิเทศด้วยตนเอง; การบันทึกนัดในระบบจริงอาจเข้าสู่ขั้นตอนส่งลิงก์ตาม Workflowเดิมซึ่ง Seeder นี้ไม่ได้เรียก.

**Tests: NOT RUN — USER-OWNED TESTING.** ไม่รัน Unit/E2E/Browser Automation/Build/Lint/Syntax/API Test Suite. **Backup: NOT REQUESTED. Commit/Push Git: NONE. NEXT TASK: USER MANUAL ACCEPTANCE IN CHROME.**

---

# Historical Initial Seed — 10 November 2026 (before completion above)

อัปเดต 10 พฤศจิกายน 2026 (Asia/Bangkok). **COMMITTED AND SELECT-VERIFIED: 5 + 5 + 5.**
ผู้ใช้อนุญาต INSERT Synthetic Data ลง Development intern_system โดยตรงในงานนี้อย่างชัดเจน.
คำสั่งนี้แทนข้อกำหนดเดิมให้ใช้ isolated DB/Approval File/หยุดที่Blueprint เฉพาะ Seeder และงานนี้.
ไม่ได้เปลี่ยน Runtime Authentication, Email Validation, Permissions, Schema หรือ Business Workflow.

## Target / execution

- PostgreSQL Development `intern_system/public`, version16.15; loopback5432 ตาม config backend/.env เดิม.
- Teacher UUID: `e9876862-0d5b-4641-8d5f-990ea3f0b146`, Active/account enabled.
  ใช้ UUID เท่านั้น ไม่เลือกจากชื่อ ไม่แก้ Teacher Account.
- รัน Apply จริงและ PostgreSQL COMMIT สำเร็จ ตามด้วย SELECT จาก transaction ใหม่หลัง Commit.
- Created Synthetic Students15คน, รวม145แถวใน11ตาราง. ข้อมูลเดิมไม่ถูก UPDATE/DELETE.
- Existing Visible ก่อนงาน: pending Coop0 / pending Advisor0 / Supervised1.
  หลังงาน: pending Coop5 / pending Advisor5 / Supervised6 (เดิม1 + ใหม่5).

| Dataset | Requested | Created | Ownership / initial state |
|---|---:|---:|---|
| Coop Requests A | 5 | 5 | Class Advisor → Teacher / advisor_review |
| Advisor Requests B | 5 | 5 | Requested Teacher → Teacher / pending / coop advisor=null |
| Supervised Students C | 5 | 5 | Coop Advisor → Teacher / approved placement + verified Mentor |

## Physical records inserted

| Table | New rows |
|---|---:|
| students | 15 |
| student_profiles | 15 |
| coop_projects | 15 |
| companies | 15 |
| job_submissions | 15 |
| job_postings | 15 |
| job_posting_work_modes | 15 |
| coop_requests | 15 |
| coop_request_delivery_methods | 15 |
| coop_project_advisor_requests | 5 |
| mentors | 5 |
| Total | 145 |

มี recordsสัมพันธ์/คำร้อง130แถวเพิ่มเติมจากStudent15คน. Coop Requestรวม15 ประกอบด้วย advisor_review5ของกลุ่มA
และ approved10เพื่อรองรับCompany/Placementของกลุ่มB/C ไม่ใช่15คำร้องรอTeacherพิจารณา.

## Fixture design / existing workflows

Marker `fitm.teacher-demo.v1`, plan_version3, deterministic UUIDs; code9906990000001–9906990000015.
Student emails `fitm.teacher-demo.v1.student01@email.kmutnb.ac.th` ถึงstudent15 ตามValidationเดิม.
Company/Mentorใช้example.com, บริษัทมีคำว่าจำลอง, โทร0000000000. ไม่มีการนำข้อมูลติดต่อบุคคลจริงมาใช้.
ระยะปฏิบัติงาน2027-01-04–2027-04-30 ในปีการศึกษา2569ภาค2.

ทั้ง15คนมี Profile, Project และ Company/Job/Requestสัมพันธ์จริง. กลุ่มBมีหัวข้อพร้อมคำอธิบายสั้นในช่อง
`CoopProject.topic` ที่มีอยู่แล้ว (Modelไม่มีdescriptionแยก จึงไม่เพิ่มColumn/API). Job descriptionมีรายละเอียดประกอบ.
Bยังไม่มีcoop_advisor_teacher_idก่อนAccept; หลังAccept Workflowเดิมจะกำหนดให้เอง.
CมีMentor5คน verified เพื่อให้เปิดงานนิเทศได้ตามเงื่อนไขเดิม.

ไม่มีAcademic Snapshot/State/Historyสร้างจากSeeder. ผลการเรียนแสดงpending_gradesตามจริง ไม่แสดงผ่านเกณฑ์ปลอม.
Teacher approvalsเดิมยังส่งไปdepartment_head_review; Advisor Accept/Reject และ Supervision ใช้Service/guardsเดิม.
Dashboard/รายชื่ออ่านAPIเดิม ไม่ใส่Mock/จำนวน5ในFrontend. Summaryคำว่า“อย่างน้อย”ยังคงเดิม.

## Execution commands

รันจากRepository root. Sourceรองรับคำสั่งที่ผู้ใช้อนุญาตให้รันจริงและดำเนินการแล้ว:

```powershell
node backend/src/seeders/teacherDashboardDemo.js --apply --teacher-id=e9876862-0d5b-4641-8d5f-990ea3f0b146
node backend/src/seeders/teacherDashboardDemo.js --verify-data --teacher-id=e9876862-0d5b-4641-8d5f-990ea3f0b146
```

ApplyโหลดDevelopment configเดิม, ตรวจNODE_ENV/database/schema/PG16/liveTarget/TeacherUUID,
ใช้Model validation/hooks และSerializable transaction/advisory lock/Teacher lock. ไม่มี Approval File, Backup,
Database/Volumeใหม่, sync/alter/init/migrate หรือการปิดConstraints/Triggers. `--academic-snapshots` ไม่อนุญาตในApplyรอบนี้.

SeedเรียกModel.createโดยตรง ไม่ import app startup/API/Mail/Notification services และไม่มีการส่งEmailจากSeed.
SMTP/Google flagsเดิมไม่เปลี่ยน. สุ่มStudent passwordในruntimeเพื่อผ่านhookปกติ ไม่แสดงหรือเก็บpassword/hash/token.

## Receipt / idempotency / failure handling

Local metadata receiptอยู่ใน .local-dev-accounts ที่Git ignore อยู่แล้ว; เก็บDB/Teacher/plan digest/UUID/fingerprints
และbaselineของrecordเดิม โดยไม่เก็บcredentialsหรือraw personal row values. ไม่ใช่DatabaseBackupหรือApprovalFile.
FingerprintของDemoใช้ข้อมูลSELECT `to_jsonb` จากPostgreSQL (ตัดpassword_hash) เพื่อไม่ขึ้นกับModel default scope.

รันชุดเดิมที่ยังไม่เปลี่ยนพร้อมreceipt → no-op; ชุดไม่ครบ/ชนID/code/email/name/receiptหายหรือข้อมูลเปลี่ยน → หยุด
ไม่overwrite/repairข้อมูลจริง ไม่เปลี่ยนpendingกลับหลังผู้ใช้Approve/Accept. ความไม่แน่นอนระหว่างCommit/receipt
จะเก็บpendingmetadataให้ตรวจ ไม่ retryสร้างข้อมูลอัตโนมัติ. ไม่มีRowCleanup/DELETE/DROP/Truncate.

หลังแก้รูปแบบreceipt รันคำสั่งApplyเดิมซ้ำแล้วได้ `ALREADY_PRESENT_UNCHANGED`, Created0/0/0,
row_count145: เป็นSeed Executionซ้ำที่ไม่มีINSERTเพิ่ม ไม่ใช่ยอดสร้างครั้งแรกซึ่งยืนยันแล้ว5/5/5.

ข้อผิดพลาดที่แก้ในรอบนี้: SELECTครั้งแรกหลังCommitพบreceiptที่สร้างจากModel.createมีรูปแบบต่างจากSELECT
เพราะdefaultScopeตัดบางextension fields. แก้writerให้SELECT readbackก่อนทำfingerprint และแก้receiptเฉพาะรอบที่สร้างนี้
โดย `--verify-data --reconcile-receipt`: ตรวจทุกfixturefield/UUID/created_at=updated_at/recordsเดิมก่อนแก้metadata.
ไม่มีDB UPDATEจากขั้นตอนนี้. จากนั้นรัน --verify-data ปกติอีกครั้งได้ COMMITTED_DATA_PRESENT,
local_receipt_format_reconciled=false. ตัวเลือกreconcileใช้ได้เฉพาะreceiptเก่าที่ยังไม่มีrow_format ไม่รับข้อมูลที่แก้แล้ว.

## SELECT verification result — not a Test Suite

หลังCommitอ่านDBจริงยืนยัน Synthetic Students15, A5, B5, C5, visible5/5/6, row count145,
FK/Ownership/placement/company/job/project/verifiedMentorของชุดเป้าหมาย, Academic Snapshots0.
TeacherเดิมและStudentเดิม1คนตรงกับbaseline. ตรวจfingerprintทุก145แถวจากcommittedreceipt.
การSELECTนี้ได้รับอนุญาตโดยตรงสำหรับSeed ไม่ใช่Unit/API/Browser/Database Test Suite.

## Manual acceptance in Chrome

1. เข้าบัญชีTeacherที่UUIDเป้าหมาย เปิดDashboard; ตรวจรายการรอพิจารณา5+5และนักศึกษาเดิม1+ใหม่5.
2. เปิดคำร้องสหกิจ → advisor_review5 → รายละเอียดชื่อ/บริษัท/ตำแหน่ง/ช่วงฝึกงาน → ทดลองApprove/RejectตามWorkflowเดิม.
3. เปิดคำขอเป็นที่ปรึกษา → pending5 → ตรวจหัวข้อ/คำอธิบาย → ทดลองAccept/Reject; เมื่อAcceptจำนวนSupervisedเพิ่มได้ตามจริง.
4. เปิดนักศึกษาในความดูแล → รวม6ก่อนทำActions → เลือกdemoC5 → ตรวจPlacement/Mentorและใช้นัดนิเทศเดิม.
5. ตรวจนักศึกษาเดิมยังอยู่, บัญชีTeacherอื่นไม่เห็นข้อมูลนอกscope, Automatic Loading/Error Retry/draft/ภาพยังทำงานเดิม.
6. ไม่ต้องกดRefreshข้อมูลปกติ; Sidebar9เมนู/Theme/Drawer/Navigation/Admin accessไม่ได้แก้ในรอบSeedนี้.

**Tests: NOT RUN — USER-OWNED TESTING.** รันเฉพาะSeed ExecutionและSELECT Verificationที่อนุญาต.
ยังไม่รัน Unit/E2E/Build/Lint/Syntax/Browser/API Test Suite และไม่รับรองChrome acceptanceแทนผู้ใช้.
**NEXT TASK: USER MANUAL ACCEPTANCE IN CHROME.**
