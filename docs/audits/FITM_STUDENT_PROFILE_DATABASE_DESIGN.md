# FITM Student Profile — Database Design Proposal

วันที่ตรวจ 2026-10-10. ข้อเสนอเท่านั้น ไม่ใช่ schema ที่มีอยู่จริง ไม่สร้าง/รัน migration ไม่เปลี่ยน model/API/Workflow
Schema ปัจจุบันยืนยันจาก PostgreSQL แบบ read-only; [Field Mapping](FITM_STUDENT_PROFILE_FIELD_MAPPING.md) มีวิธี SELECT และ metadata ของ students/student_profiles/student_files
PDF TGDE-COOP–02 ยืนยันครบ4หน้า; ทก.01: OFFICIAL SCOPE NOT VERIFIED

## โครงสร้างเดิมที่ใช้ซ้ำได้ และไม่ควรสร้างซ้ำ

- Student / public.students เป็นบัญชีและข้อมูลนักศึกษา ไม่ต้องสร้าง student_accounts/users ใหม่; StudentProfile / student_profiles เป็น 1:1 ด้วย student_id UUID unique FK → students.id ไม่ใช่รหัสนักศึกษาทางการ
- StudentFile / student_files มี metadata/storage/owner/FK และ unique path ใช้เป็นฐานเอกสารได้ แต่ enum ปัจจุบันไม่รองรับ Transcript/บัตร/อื่นๆ ต้องขยายชนิดและ upload/read authorization หลังอนุมัติ
- CoopRequest / coop_requests มีบริษัทหนึ่งแห่งและช่วงทำงาน; CoopRequestReview / coop_request_reviews มี actor/decision/reason/timestamp ใช้ผลอนุมัติเดิม ไม่เก็บซ้ำใน Profile
- CoopRequestPrerequisiteCourse / coop_request_prerequisite_courses เป็นผลวิชาก่อนออกสหกิจ ไม่ใช่ประวัติการศึกษาและการฝึกอบรมหลายระดับ
- CoopDocument / coop_documents และ CoopDocumentRevision / coop_document_revisions เป็นหนังสือ cooperation/placement พร้อม snapshot/version; ใช้กลไก snapshot เป็นตัวอย่างได้ แต่ไม่เอามาอ้างว่าอัปโหลดสำเนาบัตรหรือมี digital signature แล้ว
- CoopProjectAdvisorRequest / coop_project_advisor_requests รองรับขอ/ยืนยันอาจารย์โครงการ; Student.coop_advisor_teacher_id เป็นผู้ยืนยันแล้ว ไม่ใช่ nomination ที่ Head ลงชื่อใน TGDE
- Teacher.department / Company.address_no ฯลฯ เป็นข้อมูลเจ้าของคนละประเภท ไม่ควรนำมาแทน student department/address

ตรวจ public 30 tables แล้ว ไม่พบ student_education_records, student_training_records, student_skills, student_addresses, student_application_acknowledgements หรือ signature tables ชื่อที่เสนอต่อไปนี้เป็นชื่อใหม่เชิงออกแบบเท่านั้น

## ตารางช่องว่างและทางเลือก

| ข้อมูลใหม่ | ใช้ Table เดิมได้หรือไม่ | Column/Table ที่เสนอ (ยังไม่มี) | เหตุผล | ความเสี่ยง |
| --- | --- | --- | --- | --- |
| ชื่อภาษาอังกฤษ | student_profiles ได้ | english_first_name varchar(255), english_last_name varchar(255) | แยกจากชื่อบัญชีไทยเดิม ไม่ต้องเปลี่ยน auth identity | ห้าม transliterate/เติมค่าอัตโนมัติเป็นความจริง |
| ภาควิชา/คณะ | students ได้ | department / faculty varchar(255) หรือ FK master เมื่อมีทะเบียนที่ยืนยัน | ข้อมูลหลักทางการของนักศึกษา | Teacher.department ใช้ scope authorization อยู่แล้ว ห้ามอนุมาน |
| GPAเทอมล่าสุด | students ได้ | last_semester_gpa numeric(3,2); last_semester_label ถ้ายืนยัน requirement | gpa เดิมไม่แยกเทอม/สะสม | ต้องยืนยัน gpa เดิมก่อนใช้เป็น cumulative; อย่าเขียนทับเป็นเทอม |
| เลขบัตร/วันที่บัตร/เพศ | student_profiles ได้ | national_id_ciphertext bytea + key_version; id_issue_date/id_expiry_date date; gender varchar(32) | ข้อมูล1:1/อ่อนไหว | เลขบัตรไม่ควรเป็นplain publicDTO; policyเพศต้องยืนยัน ไม่อนุมานprefix |
| ใบอนุญาตขับขี่ | student_profiles ได้ | has_driving_license boolean; driving_license_number varchar(64); driving_license_type varchar(100); driving_license_expiry date | ข้อมูลชุดเดียวในPDF | has=false ต้องไม่มีรายละเอียด; nullคือยังไม่ตอบ ไม่ใช่ไม่มี |
| ภาวะทางทหาร | student_profiles ได้ | military_status varchar(32) + CHECK served/not_yet_served | หนึ่งตัวเลือก ไม่ควรเก็บสองbooleanที่ขัดกัน | nullสำหรับยังไม่ตอบ; เพิ่มnot_applicableได้เฉพาะเมื่อpolicyยืนยัน |
| ที่อยู่แยกส่วน | ใช้textเดิมเป็นlegacy/เพิ่มchildtable | student_addresses (student_id,address_type,house_no,road,subdistrict,district,province,postal_code) | 2ที่อยู่โครงสร้างเดียว ไม่เพิ่มคอลัมน์ทะเบียนบ้าน/ปัจจุบันซ้ำ2ชุด | ข้อความเก่าแยกไม่ได้เชื่อถือ; ให้ผู้ใช้ยืนยันไม่parseอัตโนมัติ |
| บิดา/มารดาติดต่อ | student_profiles ได้ | father_address/father_phone/mother_address/mother_phone | PDFแยกคน; parent_contact_address/parent_phoneเดิมรักษาไว้ | ไม่copyผู้ปกครองร่วมให้ทั้งสองคนโดยเดา |
| ผู้ติดต่อฉุกเฉิน | student_profiles ได้ | emergency_contact_occupation/workplace varchar(255) | เติม2ช่องที่ขาด | จำกัดสิทธิ์ข้อมูลบุคคลที่สาม |
| ประวัติการศึกษา | ไม่มีtableที่ตรง; แยก1:N | student_education_records | 3ระดับ×5ช่อง เพิ่มจำนวนได้ | ห้ามใช้Student.major/gpaแทนhistory; ไม่บังคับgraduatedสำหรับกำลังศึกษา |
| อบรม/ดูงาน/ฝึกงานเดิม | ไม่มีtableที่ตรง; แยก1:N | student_training_records | 5แถว×4ช่องและdynamic | อย่าใช้internship_daily_logs/prerequisite_coursesแทน |
| ทักษะและระดับ | TEXTเดิมเก็บต่อ; เพิ่ม1:N | student_skills(category,name,proficiency,display_order) | ข้อมูลรายการกับระดับต้องผูกกัน | ไม่แปลงrelated_skillsเป็นratingหรือทิ้งTEXTที่jobmatchingใช้ |
| เอกสารประกอบ | student_files metadataใช้ซ้ำ | ขยายfile_type + document_label/status/checksum/versionหลังpolicyยืนยัน | ไม่สร้างระบบไฟล์ซ้ำ; MIME/size/ownerร่วมกันได้ | ENUMและuniqueindexต้องประเมิน; ไม่เปิดทุกชนิดผ่านprojectpreviewเดิม |
| รับรองข้อมูลและวันที่ | ไม่ควรเป็นbooleanบนprofile | student_application_acknowledgements + FKคำร้อง + versions/snapshot hash | รับรองข้อมูลชุดใด/เมื่อใด/โดยใครต้องตรวจได้ | การรับรองไม่เท่ากับลายเซ็น; profileแก้หลังรับรองต้องไม่เปลี่ยนหลักฐานเดิม |
| ลายเซ็น/ชื่อ/วันที่ | ไม่มีsignature storageที่ยืนยัน | พิจารณาsignatureartifactอ้างowner/application/documentversion หลังยืนยันวิธีลงนาม | ชื่อข้อความและreviewtimestampไม่ใช่ลายเซ็น | ห้ามสร้างปุ่มลงนามหรือยืนยันว่ามีsignatureก่อนรองรับจริง |
| บริษัทอันดับ1–3 | coop_requestsรองรับหนึ่งบริษัท | coop_request_preferences ถ้าอยู่ในscopeที่อนุมัติ | อันดับเป็น1:Nของใบสมัคร ไม่ใช่profileถาวร | ธุรกิจเดิมยอมคำร้องactiveหนึ่งฉบับ; ห้ามเปลี่ยนแอบแฝง |
| ผลพิจารณาวิชาการ/ประพฤติ/สถาบัน | reviewเดิมมีบางข้อมูล | พิจารณาreviewรายละเอียดรายcriterion/authority หลังapprovalWorkflowอนุมัติ | เป็นข้อมูลผู้พิจารณา | ไม่มีinstitutestage; ห้ามเพิ่มapprovalหรือdeferในprofileAPI |

## ข้อเสนอรายละเอียด Schema (ทุกชื่อในส่วนนี้เป็น PROPOSED)

### 1:1 StudentProfile / Student

ใช้ StudentProfile เก็บค่ารายบุคคลใหม่ที่ optional ใน draft; ไม่ใส่ข้อมูลอนุมัติบริษัท/สถาบัน
UUID PK/default appและunique student_id/FKเดิมรักษา; เพิ่ม revision integer default1 เพื่อ optimistic lock หลังออกแบบcontractร่วม
Scalar ข้างต้นnullableในdraft; เมื่อส่งใบสมัครค่อยตรวจrequiredตามเกณฑ์ที่ยืนยัน ไม่ตั้งNOT NULLทุกช่องพร้อมกันจนทำให้ข้อมูลเก่าเสีย
GPAใช้numeric(3,2) CHECK0–4 สำหรับfieldใหม่; gpaเดิมsourceมีvalidationแต่DBcatalogไม่พบCHECK0–4บนstudents ต้องวางแผนแยกหลังอนุมัติ ไม่เปลี่ยนในaudit
LicenseexpiryและIDdatesเป็นdate ไม่ใช้timestamp; checkissue<=expiryเมื่อทั้งคู่มีค่า วันหมดอายุไม่ผ่านวันนี้ต้องเป็นreadinessconditionตามนโยบาย ไม่เดาว่าเก็บอดีตไม่ได้
has_driving_license=false ให้number/type/expiry=nullอย่างชัดเจนเมื่อผู้ใช้ยืนยันการเปลี่ยน; true ต้องมีข้อมูลตามpolicy; nullคือunknown

NationalID: APIรับค่าผ่านendpointที่จำกัดสิทธิ์และคืนเพียงmaskedvalue/has_valueโดยปกติ เก็บencrypted bytes/keyversion; ถ้าต้องหาduplicateพิจารณาkeyedlookup digestแยก ไม่ใช้hashธรรมดาของ13digits
ไม่เพิ่มuniqueIDโดยไม่มีข้อกำหนด masteridentity และแผนkeyrotation; ไม่ใส่ค่าจริงลงlogs/errors/snapshotsที่ทุกroleเข้าถึง
การตั้งชื่อnational_id_*นี้เป็นข้อเสนอ ไม่ใช่propertyที่controllerปัจจุบันรับ

### student_addresses — 1:N (จำกัดหนึ่งrecordต่อประเภทปัจจุบัน)

| Columnเสนอ | Type | Null/default | Constraint/เหตุผล |
| --- | --- | --- | --- |
| id | uuid | non-null; PK; appUUIDV4 | record identity |
| student_id | uuid | non-null | FK students.id CASCADE; ownerจากtoken |
| address_type | varchar(16) | non-null | CHECK registered/current; UNIQUE(student_id,address_type) |
| house_no | varchar(100) | nullableในdraft | เลขที่บ้านไม่ใช่numericเพื่อรองรับ/ |
| road | varchar(255) | nullable | ตามPDF; อย่าบังคับบ้านทุกหลังมีถนน |
| subdistrict/district/province | varchar(100)แต่ละcolumn | nullable | อาจใช้mastercodesหลังมีsourceที่ยืนยัน |
| postal_code | char(5) | nullable | validation5digitsไทยเมื่อpolicyใช้ไทย; ไม่ทำเป็นinteger |
| revision | integer | non-null default1 | CASสำหรับupdate |
| created_at/updated_at | timestamptz | non-null server-managed | auditmetadata |

ไม่เพิ่มphoneในtableนี้ในทางเลือกหลัก: ใช้hometown_phone/current_phoneเดิมต่อ และยืนยันความหมายregisteredก่อน เป้าหมายคือต่อaddressrecordเข้ากับphoneแหล่งเดียว ไม่ทำสองแหล่งแล้วเขียนทับกัน
hometown_address/current_addressเดิมยังอยู่และแสดงเป็นlegacyfreeTextสำหรับให้ผู้ใช้ตรวจ/ยืนยัน structuredaddress; rendererของAPIเก่าใช้ข้อความเดิมจนยืนยันswitch
“เหมือนทะเบียนบ้าน”เป็นการcopyค่าหรือreferenceที่ผู้ใช้ยืนยัน ไม่เป็นlivealiasโดยไม่อธิบายผล

### student_education_records — 1:N

| Columnเสนอ | Type | Null/default | Constraint/เหตุผล |
| --- | --- | --- | --- |
| id / student_id | uuid / uuid | non-null | PK / FK students.id CASCADE; indexstudent_id |
| education_level | varchar(32) | non-null | CHECK bachelor/high_vocational/high_school_vocational; ไม่ใช่checkboxหลายอัน |
| institution_name | varchar(255) | requiredสำหรับrecordที่บันทึกสมบูรณ์ | สถานศึกษา |
| qualification | varchar(255) | nullableในdraft | วุฒิ |
| major | varchar(255) | nullableในdraft | วิชาเอกของrecord ไม่ใช่Student.major |
| gpa | numeric(3,2) | nullable | CHECK0–4; optionalเมื่อไม่มีผลการเรียน |
| graduation_year | smallint | nullable | canonicalปีค.ศ.; UIรับพ.ศ.แล้วแปลงอย่างชัดเจน; กำลังเรียนเว้นได้ |
| display_order / revision | integer / integer | 0 /1 | ไม่บังคับหนึ่งrecordต่อlevelถ้าเคยเรียนหลายแห่ง |
| created_at/updated_at | timestamptz | server-managed | ไม่เปลี่ยนโดยinput |

UIเพิ่ม/แก้/ลบรายการด้วยstableid; ไม่ใช้arrayindexเป็นidentity; recordปัจจุบันเสนอprefill major/gpaได้โดยผู้ใช้ยืนยัน แต่ไม่อ้างว่าประวัติเดิมมีครบ
PDFlayoutมี3ระดับ ไม่ควรสร้าง15columnsตายตัวบนstudent_profiles
ถ้าใช้JSONB: ยืดหยุ่นกว่าแต่ต้องเขียนarrayvalidation/version/filter/auditเอง ไม่มีFK/uniqueรายrecord; relationalเหมาะกับquery/รายงาน/ขยายจำนวนเป็นหลัก
JSONBเหมาะกับsnapshotเอกสารณวันลงนาม ไม่ใช่replacehistorysourceoftruth

### student_training_records — 1:N

id UUID PK, student_id UUID FK CASCADE/index, activity_type varchar(24) (training/inspection/apprenticeship เมื่อpolicyยืนยัน), course_name varchar(255), institution_name varchar(255), certificate varchar(255), period_text varchar(255), display_order integer, revision integer, created_at/updated_at timestamptz
PDFให้ช่องPeriodข้อความเดียว ต้องรักษาperiod_text ไม่บังคับแยกstart/endอย่างไม่มีข้อกำหนด; start_date/end_date DATEอาจเป็นProposedEnhancementและcheckorderingเมื่อทั้งคู่มี
recordที่สร้างสมบูรณ์ต้องมีcourse/institution; draftoptionalตามsavepolicy ไม่สร้าง5rowว่างในDBเพียงเพราะPDFมี5ช่อง
อบรม/ดูงาน/ฝึกงานเดิมแชร์schemaนี้ได้ ไม่สร้างthree tablesซ้ำ; internship logปัจจุบันคงอยู่คนละworkflow

### student_skills — 1:N

id UUID PK, student_id UUID FK CASCADE/index, category varchar(16) CHECKcomputer/language, skill_name varchar(255), proficiency varchar(16) CHECKvery_good/good/moderate/fair, display_order integer, revision integer, timestamps
mappinglabelไทย: very_good=ดีมาก, good=ดี, moderate=ปานกลาง, fair=พอใช้; PDFอังกฤษเขียนPoorที่ช่องพอใช้ ไม่เพิ่มระดับexcellentอีกขั้น
ให้proficiencynullableเฉพาะdraft; ก่อนapplicationreadyต้องระบุ1ค่าต่อskillrecordที่ใช้ ไม่มีbooleanดีมาก/ดีพร้อมกัน
พิจารณาunique(student_id,category,normalized_skill_name)หลังยืนยันนิยามชื่อและcollation ไม่ตั้งuniqueที่ทำให้ชื่อภาษาต่างๆปนกันโดยเดา
รักษาspecial_abilities/related_skills TEXTที่มีและjobmatchingbinding แสดงเป็น“ข้อมูลเดิม”จนมีแผนadapter/sync; ไม่splitข้อความแล้วให้ระดับอัตโนมัติ
PDFมี4แถวต่อหมวด: UIdynamicเพิ่มได้ แต่ต้องตัดสินPDFoverflow/continuationpage ไม่ตัดรายการทิ้งเงียบๆ

### student_files — ใช้ metadataเดิม ขยายเฉพาะตามpolicy

enumปัจจุบัน4ค่า: resume,coop_project_book,coop_poster,coop_practice_log_book; เสนอเพิ่มtranscript,national_id_copy,student_id_copy,supporting_other
เพิ่มdocument_labelสำหรับothers; upload_statusหรือvalidation_statusเมื่อมีserverreviewจริง; checksum_sha256 char64/versionเมื่อมีการversionfiles; ไม่แสดง“verified”จากuploadsuccess
ต้องตัดสินเอกสารหลักแต่ละชนิดมีcurrentหนึ่งฉบับหรือหลายฉบับ แล้วออกแบบpartialuniqueindexใหม่; indexresume/projectเดิมห้ามเปลี่ยนความหมาย
StudentFile.hasManyต่อStudentเดิมใช้ซ้ำ; หากneedsimmutablerevisionsค่อยเพิ่มrevisionchildtableที่ผูกStudentFile แทนสร้างdocumentระบบที่2
ไฟล์ต้องอยู่privatestorageภายใต้owner/categoryใหม่ อ่านผ่านauthorizedendpoint queryid+student_id+allowedtype; projectpreviewเดิมจำกัด2ประเภทอยู่แล้ว ไม่เปิดสำเนาบัตรผ่านendpointเดิมเพียงเพิ่มenum
ประเภท/MIME/sizeนโยบายใหม่ต้องได้รับการยืนยัน รองรับ PDF/JPEG/PNGเฉพาะถ้าหน่วยงานยอมรับ; ไม่เปลี่ยนpolicyproject10MiB/profile5MiB/resume10MiBในงานaudit
ตรวจextension+declaredMIME+magicbytes+decodedcontent/scan; UUIDfilename, limitscount/size, ownerpath lexical+realpath, stagedcleanupและDBcommitให้สอดคล้อง; ห้ามpublicURL

### student_application_acknowledgements — append-only หลักฐานต่อใบสมัคร

| Columnเสนอ | Type | Constraint/เหตุผล |
| --- | --- | --- |
| id | uuid | PK |
| student_id | uuid | FK students.id; ownerจากtoken ไม่input |
| coop_request_id | uuid | FK coop_requests.id; non-null เมื่อยืนยันใช้คำร้องเป็นapplicationidentity |
| acknowledgement_type | varchar(32) | information_accuracy / coop_rules |
| statement_version | varchar(40) | รู้ว่ารับรองข้อความฉบับใด |
| accepted_at | timestamptz | server time; ไม่ให้clientปลอมเวลา |
| application_snapshot_sha256 | char(64) | อ้างชุดข้อมูลที่ยอมรับ; hashเองไม่แทนauth |
| profile_revision / document_version | integer | ผูกrevisionของชุดข้อมูลตามdesignจริง |
| revoked_at / superseded_by | timestamptz / uuid | เมื่อpolicyต้องเปลี่ยนการรับรอง ไม่updateaccepted_atเงียบๆ |

ต้องยืนยันว่าcoop_requestคือapplicationเดียวกับTGDEก่อนสร้างFK ไม่สร้างCoopApplicationtableเพิ่มโดยอัตโนมัติ ทั้งสองความหมายแยกrecordหรือpolicyยืนยันใช้statementเดียวได้
เก็บsnapshotจริงผ่านกลไกเอกสารที่reuseได้ หลังยืนยันdocument_type/template/visibility; หลักฐานเก่าต้องคงที่แม้StudentProfileเปลี่ยน
signatureartifactเป็นข้อเสนอแยก: document/applicationidentity, authenticatedactor,method,artifactprivatepathถ้ามีไฟล์,time,documenthash/version
ชื่อพิมพ์ลงท้าย/checkboxaccept/reviewcreated_atเพียงอย่างเดียวไม่ใช่หลักฐานลายเซ็น; ต้องยืนยันวิธีและเจ้าของกระบวนการก่อนเพิ่มUX
ลายเซ็นอาจารย์/Head/สถาบันอยู่ในauthorityของWorkflow ไม่ใช่permissionStudentProfile

## Request/Approval design boundary

หน้าที่Student:กรอกprofile/ประวัติ/skills/uploadprivateattachmentsและอ่านapplicationreadiness
หน้าที่request:บริษัทรายการpreferences/ช่วงเวลา/snapshotข้อมูลณสมัคร ตามworkflowที่ยืนยัน
หน้าที่review:ความพร้อม/ความประพฤติ/ผลพิจารณา/ลายเซ็นของผู้พิจารณา
ปัจจุบันreviewRequestในroleWorkflow.service.js:191รองรับteacher→head,approve/reject; Staffcancelเท่านั้น ไม่รองรับinstitutestageหรือdefer
CoopRequestReviewมีactor_role/teacher_id/department_staff_id/decision/reason; ถ้าต้องเพิ่มcriteriondetailsควรผูกreviewเดิมหรือchildrecord ไม่เอา28profileallowlistมารับreviewfields
ข้อเสนอpreference/criterion/institute/signatureยังเป็นscope-dependent P1และต้องหารือ ไม่ใช่คำแนะนำให้แก้BusinessLogicตอนนี้

## Privacy / Validation / Concurrency หลังอนุมัติ

- req.user.idเป็นowner; DTOallowlistตามroleและpurpose; Head/Teacherที่อ่านคำร้องอยู่แล้วไม่ควรได้health/nationalIDcopiesเต็มโดยอัตโนมัติ
- unknownfields400, omittedpreserve, explicitnullclearที่ผู้ใช้ยืนยัน; ส่งเฉพาะdirtyfieldsต่อtab/record; ไม่PUTหลายarrayแล้วreplaceทั้งหมดโดยไม่มีversion
- CASexpectedrevisionบนupdate,409เมื่อเก่า; atomicupsert/rowlockป้องกันfirst-createcollision และเก็บdraftclientเมื่อconflict
- DatesแบบDATEONLYYYYY-MM-DD validatecalendarจริง; คำนวณอายุจากbirth_date; ที่อยู่/phoneเป็นstring; stringlengthตรงcolumn; numberprecision/GPAช่วง0–4
- Ack/Signatureสร้างservertimestamp+snapshotหลังvalidatingapplication/readiness; preserveimmutableevidence ไม่อิงค่าบัญชีสดเพียงอย่างเดียว
- Auditrecordแสดงactor/fieldnames/changedversion/time; อย่าเก็บเลขบัตร/medicaltext/filebody/tokenในlogs
- กำหนดretention/accessreviewและdeleteownershipก่อนเก็บสำเนาเอกสาร; ไม่คัดลอกsecret/ข้อมูลบุคคลไปfixtureหรือรายงาน

## ภาคผนวก: Schemaจริงของโมเดล/ตารางที่เกี่ยวข้อง (ไม่ใช่PROPOSED)

Modelnames: Teacher→teachers; Company→companies; CoopRequest→coop_requests; CoopRequestReview→coop_request_reviews; CoopRequestPrerequisiteCourse→coop_request_prerequisite_courses; CoopProjectAdvisorRequest→coop_project_advisor_requests; CoopDocument→coop_documents; CoopDocumentRevision→coop_document_revisions
สมาคม/fieldmodelอยู่ backend/src/models/<ชื่อ>.model.js; rawcatalogดังต่อไปนี้ยืนยันschemaจริง ไม่อาศัยmodelsync
### public.coop_requests

| Column | PostgreSQL type | Nullable | DB default |
| --- | --- | --- | --- |
| id | uuid | NO | ไม่มี |
| student_id | uuid | NO | ไม่มี |
| company_name | varchar(255) | NO | ไม่มี |
| company_province | varchar(100) | NO | ไม่มี |
| letter_recipient_name | varchar(255) | NO | ไม่มี |
| letter_recipient_position_department | varchar(255) | YES | ไม่มี |
| company_address | text | NO | ไม่มี |
| work_start_date | date | NO | ไม่มี |
| work_end_date | date | NO | ไม่มี |
| status | enum_coop_requests_status | NO | 'submitted'::enum_coop_requests_status |
| submitted_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| cancelled_at | timestamp with time zone | YES | ไม่มี |
| document_issued_at | timestamp with time zone | YES | ไม่มี |
| started_at | timestamp with time zone | YES | ไม่มี |
| created_at | timestamp with time zone | NO | ไม่มี |
| updated_at | timestamp with time zone | NO | ไม่มี |
| company_id | uuid | YES | ไม่มี |
| job_posting_id | uuid | YES | ไม่มี |
### public.coop_request_reviews

| Column | PostgreSQL type | Nullable | DB default |
| --- | --- | --- | --- |
| id | uuid | NO | ไม่มี |
| from_status | varchar(32) | NO | ไม่มี |
| to_status | varchar(32) | NO | ไม่มี |
| decision | varchar(16) | NO | ไม่มี |
| reason | varchar(2000) | YES | ไม่มี |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| coop_request_id | uuid | NO | ไม่มี |
| actor_role | varchar(32) | NO | ไม่มี |
| teacher_id | uuid | YES | ไม่มี |
| department_staff_id | uuid | YES | ไม่มี |
| student_id | uuid | YES | ไม่มี |
### public.teachers

| Column | PostgreSQL type | Nullable | DB default |
| --- | --- | --- | --- |
| id | uuid | NO | ไม่มี |
| email | varchar(255) | YES | ไม่มี |
| password_hash | varchar(255) | YES | ไม่มี |
| academic_title | varchar(255) | YES | ไม่มี |
| first_name | varchar(255) | NO | ไม่มี |
| last_name | varchar(255) | NO | ไม่มี |
| department | varchar(255) | YES | ไม่มี |
| major | varchar(255) | YES | ไม่มี |
| position | varchar(255) | YES | ไม่มี |
| status | enum_teachers_status | NO | 'active'::enum_teachers_status |
| created_at | timestamp with time zone | NO | ไม่มี |
| updated_at | timestamp with time zone | NO | ไม่มี |
| is_department_head | boolean | NO | false |
### public.companies

| Column | PostgreSQL type | Nullable | DB default |
| --- | --- | --- | --- |
| id | uuid | NO | ไม่มี |
| name | varchar(255) | NO | ไม่มี |
| normalized_name | varchar(255) | NO | ไม่มี |
| email | varchar(254) | NO | ไม่มี |
| normalized_email | varchar(254) | NO | ไม่มี |
| phone | varchar(32) | NO | ไม่มี |
| address_no | varchar(50) | NO | ไม่มี |
| moo | varchar(30) | YES | ไม่มี |
| subdistrict | varchar(100) | NO | ไม่มี |
| district | varchar(100) | NO | ไม่มี |
| province | varchar(100) | NO | ไม่มี |
| email_verified_at | timestamp with time zone | YES | ไม่มี |
| created_at | timestamp with time zone | NO | ไม่มี |
| updated_at | timestamp with time zone | NO | ไม่มี |
### public.coop_request_prerequisite_courses

| Column | PostgreSQL type | Nullable | DB default |
| --- | --- | --- | --- |
| id | uuid | NO | ไม่มี |
| coop_request_id | uuid | NO | ไม่มี |
| program | varchar(3) | NO | ไม่มี |
| course_code | varchar(9) | NO | ไม่มี |
| course_name | varchar(255) | NO | ไม่มี |
| english_name | varchar(255) | YES | ไม่มี |
| status | varchar(16) | NO | ไม่มี |
| grade | varchar(10) | YES | ไม่มี |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
### public.coop_project_advisor_requests

| Column | PostgreSQL type | Nullable | DB default |
| --- | --- | --- | --- |
| id | uuid | NO | ไม่มี |
| student_id | uuid | NO | ไม่มี |
| requested_advisor_teacher_id | uuid | NO | ไม่มี |
| status | varchar(16) | NO | 'pending'::character varying |
| requested_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| confirmed_at | timestamp with time zone | YES | ไม่มี |
| rejected_at | timestamp with time zone | YES | ไม่มี |
| superseded_at | timestamp with time zone | YES | ไม่มี |
| rejection_reason | varchar(2000) | YES | ไม่มี |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
### public.coop_documents

| Column | PostgreSQL type | Nullable | DB default |
| --- | --- | --- | --- |
| id | uuid | NO | ไม่มี |
| coop_request_id | uuid | NO | ไม่มี |
| document_type | varchar(24) | NO | ไม่มี |
| status | varchar(16) | NO | ไม่มี |
| version | integer | NO | ไม่มี |
| document_number | varchar(80) | YES | ไม่มี |
| metadata | jsonb | NO | ไม่มี |
| snapshot | jsonb | NO | ไม่มี |
| template_version | varchar(40) | NO | ไม่มี |
| rendered_html | text | YES | ไม่มี |
| content_sha256 | character | YES | ไม่มี |
| generated_at | timestamp with time zone | YES | ไม่มี |
| created_by | uuid | NO | ไม่มี |
| updated_by | uuid | NO | ไม่มี |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
### public.coop_document_revisions

| Column | PostgreSQL type | Nullable | DB default |
| --- | --- | --- | --- |
| id | uuid | NO | ไม่มี |
| coop_document_id | uuid | NO | ไม่มี |
| version | integer | NO | ไม่มี |
| action | varchar(16) | NO | ไม่มี |
| status | varchar(16) | NO | ไม่มี |
| department_staff_id | uuid | NO | ไม่มี |
| document_number | varchar(80) | YES | ไม่มี |
| metadata | jsonb | NO | ไม่มี |
| snapshot | jsonb | NO | ไม่มี |
| template_version | varchar(40) | NO | ไม่มี |
| rendered_html | text | YES | ไม่มี |
| content_sha256 | character | YES | ไม่มี |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
### Constraints/Indexes ของตารางที่เกี่ยวข้อง

| Table | Constraintจริง | Definition |
| --- | --- | --- |
| companies | companies_pkey | PRIMARY KEY (id) |
| coop_document_revisions | coop_document_revisions_action_check | CHECK (((version >= 1) AND ((action)::text = ANY ((ARRAY['create'::character varying, 'edit'::character varying, 'generate'::character varying, 'regenerate'::character varying])::text[])))) |
| coop_document_revisions | coop_document_revisions_coop_document_id_fkey | FOREIGN KEY (coop_document_id) REFERENCES coop_documents(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| coop_document_revisions | coop_document_revisions_department_staff_id_fkey | FOREIGN KEY (department_staff_id) REFERENCES department_staffs(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| coop_document_revisions | coop_document_revisions_pkey | PRIMARY KEY (id) |
| coop_document_revisions | coop_document_revisions_state_check | CHECK (((((status)::text = 'draft'::text) AND ((action)::text = ANY ((ARRAY['create'::character varying, 'edit'::character varying])::text[])) AND (rendered_html IS NULL) AND (content_sha256 IS NULL)) OR (((status)::text = 'generated'::text) AND ((action)::text = ANY ((ARRAY['generate'::character varying, 'regenerate'::character varying])::text[])) AND (rendered_html IS NOT NULL) AND (content_sha256 IS NOT NULL) AND (content_sha256 ~ '^[0-9a-f]{64}$'::text)))) |
| coop_documents | coop_documents_coop_request_id_fkey | FOREIGN KEY (coop_request_id) REFERENCES coop_requests(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| coop_documents | coop_documents_created_by_fkey | FOREIGN KEY (created_by) REFERENCES department_staffs(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| coop_documents | coop_documents_json_check | CHECK (((jsonb_typeof(metadata) = 'object'::text) AND (jsonb_typeof(snapshot) = 'object'::text))) |
| coop_documents | coop_documents_number_check | CHECK (((document_number IS NULL) OR (((document_number)::text = btrim((document_number)::text)) AND ((length((document_number)::text) >= 1) AND (length((document_number)::text) <= 80))))) |
| coop_documents | coop_documents_pkey | PRIMARY KEY (id) |
| coop_documents | coop_documents_state_check | CHECK (((((status)::text = 'draft'::text) AND (generated_at IS NULL) AND (rendered_html IS NULL) AND (content_sha256 IS NULL)) OR (((status)::text = 'generated'::text) AND (generated_at IS NOT NULL) AND (rendered_html IS NOT NULL) AND (length(rendered_html) > 0) AND (content_sha256 IS NOT NULL) AND (content_sha256 ~ '^[0-9a-f]{64}$'::text)))) |
| coop_documents | coop_documents_type_check | CHECK (((document_type)::text = ANY ((ARRAY['cooperation'::character varying, 'placement'::character varying])::text[]))) |
| coop_documents | coop_documents_updated_by_fkey | FOREIGN KEY (updated_by) REFERENCES department_staffs(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| coop_documents | coop_documents_version_check | CHECK ((version >= 1)) |
| coop_project_advisor_requests | coop_project_advisor_requests_pkey | PRIMARY KEY (id) |
| coop_project_advisor_requests | coop_project_advisor_requests_requested_advisor_teacher_id_fkey | FOREIGN KEY (requested_advisor_teacher_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| coop_project_advisor_requests | coop_project_advisor_requests_student_id_fkey | FOREIGN KEY (student_id) REFERENCES students(id) ON UPDATE CASCADE ON DELETE CASCADE |
| coop_project_advisor_requests | project_advisor_request_state_check | CHECK (((((status)::text = 'pending'::text) AND (confirmed_at IS NULL) AND (rejected_at IS NULL) AND (superseded_at IS NULL) AND (rejection_reason IS NULL)) OR (((status)::text = 'confirmed'::text) AND (confirmed_at IS NOT NULL) AND (rejected_at IS NULL) AND (superseded_at IS NULL) AND (rejection_reason IS NULL)) OR (((status)::text = 'rejected'::text) AND (confirmed_at IS NULL) AND (rejected_at IS NOT NULL) AND (superseded_at IS NULL) AND (rejection_reason IS NOT NULL) AND (length(btrim((rejection_reason)::text)) > 0)) OR (((status)::text = 'superseded'::text) AND (confirmed_at IS NULL) AND (superseded_at IS NOT NULL) AND (((rejected_at IS NULL) AND (rejection_reason IS NULL)) OR ((rejected_at IS NOT NULL) AND (rejection_reason IS NOT NULL) AND (length(btrim((rejection_reason)::text)) > 0)))))) |
| coop_project_advisor_requests | project_advisor_request_time_check | CHECK ((((confirmed_at IS NULL) OR (confirmed_at >= requested_at)) AND ((rejected_at IS NULL) OR (rejected_at >= requested_at)) AND ((superseded_at IS NULL) OR (superseded_at >= COALESCE(rejected_at, requested_at))))) |
| coop_request_prerequisite_courses | coop_prerequisites_program_code_check | CHECK (((((program)::text = 'IT'::text) AND ((course_code)::text = ANY ((ARRAY['060243102'::character varying, '060243104'::character varying, '060243108'::character varying, '060243112'::character varying, '060243122'::character varying])::text[]))) OR (((program)::text = 'INE'::text) AND ((course_code)::text = ANY ((ARRAY['060233107'::character varying, '060233112'::character varying, '060233113'::character varying, '060233202'::character varying, '060233204'::character varying])::text[]))))) |
| coop_request_prerequisite_courses | coop_prerequisites_status_grade_check | CHECK (((((status)::text = 'passed'::text) AND (grade IS NOT NULL) AND (length(TRIM(BOTH FROM grade)) > 0)) OR (((status)::text = ANY ((ARRAY['studying'::character varying, 'unselected'::character varying])::text[])) AND (grade IS NULL)))) |
| coop_request_prerequisite_courses | coop_request_prerequisite_courses_coop_request_id_fkey | FOREIGN KEY (coop_request_id) REFERENCES coop_requests(id) ON UPDATE CASCADE ON DELETE CASCADE |
| coop_request_prerequisite_courses | coop_request_prerequisite_courses_pkey | PRIMARY KEY (id) |
| teachers | teachers_email_key | UNIQUE (email) |
| teachers | teachers_pkey | PRIMARY KEY (id) |

| Table | Indexจริง | Definition |
| --- | --- | --- |
| companies | companies_normalized_email_idx | CREATE INDEX companies_normalized_email_idx ON public.companies USING btree (normalized_email) |
| companies | companies_normalized_name_idx | CREATE INDEX companies_normalized_name_idx ON public.companies USING btree (normalized_name) |
| companies | companies_province_idx | CREATE INDEX companies_province_idx ON public.companies USING btree (province) |
| coop_document_revisions | coop_document_revisions_version_unique | CREATE UNIQUE INDEX coop_document_revisions_version_unique ON public.coop_document_revisions USING btree (coop_document_id, version) |
| coop_documents | coop_documents_number_unique | CREATE UNIQUE INDEX coop_documents_number_unique ON public.coop_documents USING btree (document_number) |
| coop_documents | coop_documents_request_type_unique | CREATE UNIQUE INDEX coop_documents_request_type_unique ON public.coop_documents USING btree (coop_request_id, document_type) |
| coop_project_advisor_requests | project_advisor_one_current_per_student | CREATE UNIQUE INDEX project_advisor_one_current_per_student ON public.coop_project_advisor_requests USING btree (student_id) WHERE ((status)::text <> 'superseded'::text) |
| coop_project_advisor_requests | project_advisor_teacher_pending_idx | CREATE INDEX project_advisor_teacher_pending_idx ON public.coop_project_advisor_requests USING btree (requested_advisor_teacher_id, requested_at) WHERE ((status)::text = 'pending'::text) |
| coop_request_prerequisite_courses | coop_prerequisites_request_code_unique | CREATE UNIQUE INDEX coop_prerequisites_request_code_unique ON public.coop_request_prerequisite_courses USING btree (coop_request_id, course_code) |
| teachers | teachers_email_key | CREATE UNIQUE INDEX teachers_email_key ON public.teachers USING btree (email) |

CoopRequestReview actor/transition/reason CHECKจริงแสดงในmappingcatalog; transition/reasonมีNOT VALIDในDBเพื่อlegacyrows ไม่อนุมานว่าlegacyทั้งหมดผ่านvalidation
Teacher.emailunique/CompanyPKและFKที่มีจริงดูข้างต้น; ข้อมูลชื่อcolumnเท่านั้นไม่มีแถวบุคคล
DB UUID idส่วนใหญ่ไม่มีdefaultแม้ModelUUIDV4มี; created_at/updated_atหลายtableไม่มีDBdefaultเพราะtimestampsจากORM ต่างจากreviewcreated_atที่DBมีCURRENT_TIMESTAMP
Migrationmetadata001–018(รวม007a)ยืนยันSELECT;019–021ยังไม่installed ไม่เกี่ยวกับproposedprofilehistorytables
ห้ามนำชื่อproposedtable/columnในรายงานนี้ไปอ้างว่าอยู่ในPostgreSQLแล้ว

## ไฟล์ที่อาจต้องแก้หลังผู้ใช้อนุมัติเท่านั้น

frontend/src/student_coop/student_coop.html, frontend/src/pages/student_coop.js, frontend/src/styles/student_coop.css, frontend/src/api/studentProfile.api.js
backend/src/routes/studentProfile.routes.js, backend/src/controllers/studentProfile.controller.js, backend/src/models/student.model.js, backend/src/models/studentProfile.model.js, backend/src/models/studentFile.model.js, backend/src/models/index.js, backend/src/middlewares/upload.middleware.js, backend/src/config/storage.js
เพิ่มmodel/service/validator/APIclientของhistory/skills/addresses/documentsตามdesignที่อนุมัติและtestsที่จำเป็น
migrationใหม่ในbackend/src/db/migrations/เป็นงานอนาคตเท่านั้น ต้องยืนยันpolicy/rollback/data preservation/schemaก่อนสร้าง
roleWorkflow/coopRequest/coopDocumentแก้เฉพาะเมื่อมีapprovalเปลี่ยนWorkflowแยกต่างหาก; ไม่แก้dashboardrolesอื่นเพื่อทำProfiletabs

