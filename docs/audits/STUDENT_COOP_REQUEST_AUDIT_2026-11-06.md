# Student Coop Request — Read-only Audit — 6 พฤศจิกายน 2026

วันที่ตรวจ: **6 พฤศจิกายน 2026, Asia/Bangkok**. ตรวจ Working Tree ปัจจุบัน ไม่ใช่เฉพาะ HEAD; Baseline **28 modified / 14 untracked / 0 deleted**. งานนี้แก้เฉพาะ README/Handoff และเพิ่มรายงานนี้ ไม่แก้ Logic/UI/Tests/Schema ของระบบคำร้องหรือเมนูอื่น ไม่สร้างคำร้อง/อนุมัติ/ยกเลิก/ส่งอีเมลจริง และไม่ Commit/Push.

## A. Executive Summary

**PARTIAL / NEEDS VERIFICATION — ยังไม่มีหลักฐานเพียงพอให้ประกาศพร้อม Production.** มี Student submit/list/detail/cancel, Company search/duplicate lookup, Published Job lookup, Class Advisor→Head review, history และ transactional writes จริง. ปัญหาสำคัญที่เคยอยู่ใน README **ยังไม่ถูกแก้**: สร้าง `advisor_review` ได้โดยไม่มี Class Advisor และไม่มีผู้พิจารณาที่ผ่าน authorization. ไม่ใช้อาจารย์โครงการมาแทนโดยอัตโนมัติ.

สถานะรวม: **Implemented** ส่วนหลักด้านบน; **Partial** การติดตาม/Feedback/Accessibility และการเชื่อมสถานะหลังอนุมัติ; **Missing** เส้นทาง advance legacy `submitted/staff_review` และ writer ของ `document_issued/in_progress` ใน Source ที่ตรวจ; **Broken behavior** เมื่อโหลด error แล้วแสดงเหมือนไม่มีคำร้อง และข้อความพิจารณาในรายละเอียดไม่สะท้อน approval history; **Needs Verification** นโยบายเปลี่ยน Class Advisor/Staff department scope/เกณฑ์รายวิชา และ real PostgreSQL concurrency/E2E.

ไม่พบหลักฐาน Critical vulnerability จากขอบเขตนี้. พบ **14 Findings**: A01 High confirmed; A08 High potential policy risk; ที่เหลือ Medium/Low ตามรายละเอียด G. การทดสอบที่ผ่านเป็นหลักฐานว่าจำลองพฤติกรรมได้ รวมถึงพฤติกรรมที่เป็น Bug ไม่ได้แปลว่า Findings ได้รับการแก้แล้ว.

### Mentor closure — แยกหลักฐาน

| สถานะ | หลักฐานและข้อจำกัด |
| --- | --- |
| UI ACCEPTED | ผู้ใช้รายงานผลตรวจรับภาพล่าสุดในคำสั่ง: Verified สีเขียว, ข้อมูลครบ, ไม่มี Resend, มี Edit/Delete และจัดวางเป็นระเบียบ. ไม่มีภาพใหม่แนบให้ตรวจซ้ำในรอบ Audit นี้ จึงบันทึกเป็น user-reported visual acceptance. |
| TESTED — ตรวจ Source | `mentor.js:278` คืน Loading ใน finally ทุกเส้นทาง; `studentMentorSync.js:1` ใช้ bounded single-flight timer; `student_coop.js:3689` รักษา Mentor เมื่อ GET fail; `email.service.js:77` มี owner context/HTML+text; `mentor.controller.js:16` อ่าน Student ผ่าน Mentor FK. |
| TESTED — รันใหม่รอบนี้ | Backend Email/Mentor/phase1 **25/25**, Frontend suites **97/97** ใน Docker. ครอบคลุม CRUD/verification handlers, rotation, spinner/aria-busy, no-repeat, status sync, NULL/escape/ownership/log guards โดย Mock/Stream Transport. |
| TESTED — หลักฐาน Browser รอบก่อน | ตรวจพบไฟล์ browser-results/log/ภาพจริงใน OS temp ของงาน Mentor: Chrome + Mock HTTP, 20 layout checks ที่1280/768/390/320, max in-flight1, runtime errors0. เป็นหลักฐานรอบก่อนที่ทบทวน ไม่ใช่ Browser run Mentor ใหม่รอบนี้หรือ SMTP/PG E2E. |
| NOT TESTED | Real SMTP/Gmail, Normal Login ของบัญชี Development, Mentor→PostgreSQL→Student แบบจริง และ auto-close จริงใน Browser ที่อนุญาต; รอบก่อนใช้ close callback/blocked fallback. |
| BLOCKED | Live write E2E ไม่อยู่ในสิทธิ์ Read-only รอบนี้ และไม่มีบัญชี/ผู้รับ Development ที่ระบุ. ไม่สร้างบัญชีหรือเปลี่ยน flags เพื่อให้ผ่าน. |

Phase1 NEXT TASK “Audit คำร้องสหกิจศึกษา” ดำเนินการแล้วในรายงานนี้. Suggested next implementation อยู่ H; ยังไม่เริ่มแก้.

## B. Feature Inventory

| Feature | Frontend | Backend | Database | Test | Status |
| --- | --- | --- | --- | --- | --- |
| หน้า “คำร้องสหกิจศึกษา” / คำอธิบายตามโจทย์ | HTML763–768 | — | — | Source | Implemented |
| Loading / Empty / Error | render/load2721–2831 | GET me | req/delivery | Browser+Mock; A03 | Partial: error ล้างรายการ |
| คำร้องปัจจุบัน / ประวัติ / วันที่ / บริษัท / ช่วงงาน / จัดส่ง | API data, เลือก active ล่าสุด | owner-filter list | request snapshots + child methods | Existing phase1 + probes | Implemented; live persistence not tested |
| Status Badge / 4-step progress | COOP_STATUS_META2380, stepper2694 | enum/state guards | 9 statuses | Browser Approved + source | Implemented; legacy/downstream gaps |
| รายละเอียด / เหตุผล Reject/Cancel | detail2998; reason3025/3029 | reviews/prerequisites/student includes | reviews+courses | Browser A04 | Partial: approval panels hardcoded |
| Student identity read-only | saved Student/Profile, ไม่ส่ง identity ใน payload | req.user.id + live Student | Student/Profile/Teacher FK | ownership probes | Implemented |
| Company search / manual / duplicate hint | debounce250ms; advisory duplicate choices | authenticated companies lookups | companies normalized_name | Browser stale-search A14 + source | Partial: async/job reset issues |
| Published Job entry | ปุ่มจาก job matching; lookup before modal | published/not-expired; company binding | job_postings/company IDs | Existing phase1 expiry tests | Implemented; ไม่มี job dropdown แยกในฟอร์ม |
| Request validation | required/date order/delivery/course grade | strict whitelist/UUID/date/course catalog | model+enum+FK+checks | probes real validators | Implemented; prerequisite policy unresolved |
| Submit / double submit / loading | boolean+disabled+Shared loading | Student row lock+active guard+transaction | request+courses+delivery+review | Browser1 POST, probes | Implemented; ไม่มี pre-submit confirmation |
| Cancel / resubmit | Shared Confirm, allowed states | owner lock/state/history | transactional update+review | probes | Implemented |
| Class Advisor review | teacherCoopRequests shared role view | teacher must equal CLASS advisor | review event | actual service mock probes | Implemented; A01/A02/A08 |
| Head review | same view with Head role/history | active explicit Head + class-advisor department | review event | actual service mock probes | Implemented; real role E2E not tested |
| Staff action | existing Staff screens, no UI changes | read/detail/cancel; approve/forward absent | staff actor+history | probes/service source | Implemented; scope policy A10 |
| Post-approval documents / company response | response read adapter; separate modules | Staff docs consume approved requests | coop_documents/revisions/company_responses | Source only in this scope | Partial request status integration A09 |
| Revision / concurrency | submitting guards; reload after mutations | row locks+stage check; Staff optional expected state/time | no request version field | synthetic schedule, not PG locking | Partial verification |

### Field / Payload Mapping

`frontend/src/pages/student_coop.js:2920`, `backend/src/controllers/coopRequest.controller.js:36,156,262`, `backend/src/services/coopPrerequisites.js:19` เป็น mapping หลัก.

| UI / Field | Payload / DB | Required / Validation |
| --- | --- | --- |
| ชื่อ/รหัส/ปี/GPA/โทร/Email/ผู้ลงชื่อ/อาจารย์ | ไม่ส่ง Student identity; Backendใช้ req.user.id | Display จาก saved Student/Profile; ไม่มีการแก้ผ่าน request API |
| บริษัทที่เลือก | company_id nullable UUID | Company must exist; serverเขียนชื่อ/จังหวัด/ที่อยู่จาก Company ทับข้อมูล body อย่างมีเจตนา |
| ตำแหน่งงานจาก job matching | job_posting_id nullable UUID | Published, expires_at NULL หรือ >now; Companyต้องสัมพันธ์; recheck deadlineหลังรอStudent lock |
| ชื่อบริษัท | company_name VARCHAR255 | required trimmed text; แม้มี company/job ID ก็ต้องส่ง required snapshot strings ก่อน backend resolve |
| จังหวัด | company_province VARCHAR100 | required text; HTMLเป็นจังหวัดตัวเลือก มี fallback option สำหรับ Company ที่สะกดต่าง |
| เรียนถึง | letter_recipient_name VARCHAR255 | required text |
| ตำแหน่ง/หน่วยงานผู้รับ | letter_recipient_position_department VARCHAR255 NULL | optional; blank→NULL |
| ที่อยู่ | company_address TEXT | required; ไม่มี business max length เฉพาะฟิลด์ แต่ express.json default body limit ยังใช้ |
| เริ่ม/สิ้นสุด | work_start_date/work_end_date DATE | YYYY-MM-DDจริง, end>=start; ไม่บังคับ future date/duration ใน Source |
| จัดส่ง | delivery_methods→child rows | 1–3 unique จาก self_submit/postal/email; frontendอ่าน checked checkboxesแม้ fieldอื่น disabled |
| รายวิชา5รายการ | prerequisite_courses→request-owned snapshot | Student.majorต้องตรง IT/INE; codeถูกหลักสูตร/ครบ/ไม่ซ้ำ; status passed/studying/unselected; passedต้องgrade<=10, อีกสองสถานะgradeNULL |
| สถานะ/owner/timestamps/reviewer | ไม่ให้ clientกำหนด | Unsupported input fields→400; initial status advisor_review; submitted_at Server |

ค่าคงที่ชื่อวิชา/สถานะ/stepper/รายชื่อจังหวัดเป็น UI/catalog configuration ที่ใช้จริงและตรวจซ้ำฝั่ง Server ไม่ใช่ fake API records. ข้อความ “หัวหน้าภาควิชาเทคโนโลยีสารสนเทศ” และ placeholder approval เป็น hardcode จริง ต้องแยกจากข้อมูล API; A04 กล่าวถึงส่วนที่แสดงผิดสถานะ.

## C. API Contract Matrix

Source mounts: `backend/src/app.js:78,81`–83. Student routes: `backend/src/routes/coopRequest.routes.js:16`–32; all require signed Application JWT/live actor. Company search/duplicate อยู่ก่อน requireCoopStudent จึงให้ authenticated Student ใช้ได้ ส่วน request/job/company-response ต้อง live co_op; เป็น route order ที่มี existing regression ไม่ตีความเป็น RBAC bypass.

Response abbreviations: **S(data)**=`{success:true,data,...message?}`; **E**=`{success:false,message,...code?}` (middleware บางกรณี message-only). Authentication failures401/403 และ infrastructure500 เป็นข้อร่วม. GETไม่เขียน application data; ไม่มี no-store header ใน request controllers/adapters ปัจจุบัน (ต่างจาก Mentor ที่เพิ่งเพิ่ม).

| Method / Path | Authorization / Input | Validation / Response / Errors | Tables | Coverage / Issue |
| --- | --- | --- | --- | --- |
| GET /api/coop-requests/me | Student co_op; ไม่มี body | owner req.user.id; S(array) sorted submitted/created DESC;500 | coop_requests, delivery_methods | existing phase1 owner list + probe; ไม่มี pagination |
| GET /api/coop-requests/:id | Student co_op owner | S(request + student/profile/advisor + courses + reviews);404 non-owner/missing; malformed UUIDอาจ500 | request, delivery, students, student_profiles, teachers, courses, reviews | probe IDOR; A04/A11 |
| POST /api/coop-requests | Student co_op; payloadในตาราง field | 201 S(request);400 validation/job unavailable;404 student/company;409 active/unique;500 storage/read-after-commit | students, companies, jobs, req/courses/delivery/reviews | existing job expiry + probes + BrowserMock; A01/A06/A12 |
| PATCH /api/coop-requests/:id/cancel | Student co_op owner; ไม่มี required body | current early state only;200 S(cancelled request);404 owner miss;400 disallowed state;500 failure | request, review, delivery | owner/state/history probes; no id revision prerequisite |
| GET /api/coop-requests/companies/search?q= | authenticated Student | q<2→200[]; iLike escaped wildcards,20 results; S(company[]) | companies | Source+BrowserMock search; A14 |
| GET /api/coop-requests/companies/duplicate-check?name= | authenticated Student | required <=255; whitespace-normalized/lowercase exact normalized_name;20 results;400/500 | companies | Source; advisory only ไม่สร้าง Company/ห้ามชื่อซ้ำ |
| GET /api/coop-requests/job-postings/:id | Student co_op | published+deadline+Company;S(id/title/company);404 unavailable; malformed IDอาจ500 | job_postings, companies | existing phase1 NULL/expiry/exact deadline tests |
| GET /api/coop-requests/:id/company-response | Student co_op owner | UUID400;404 owner miss;S(response orNULL);409 COMPANY_RESPONSE_SCHEMA_REQUIRED;500 | request, company_responses | controller source; real endpoint not tested |
| GET /api/teachers/coop-requests | active Teacher; JWT Teacher or current Head accepted by Teacher guard | status default advisor_review;limit1–100/offset>=0;class-advisor filter;S(array);400/403 | teachers, requests, students, courses | actual service queue probe |
| GET /api/teachers/coop-requests/:id | same + CLASS advisor ownership | UUID400;403 wrong advisor;404 request;S({request,reviews}) | previous + company/job/delivery/reviews | source + review authorization probes; no live HTTP |
| POST /api/teachers/coop-requests/:id/approve | selected active CLASS advisor | {} or optional reason<=2000; stage advisor_review;S({request,review});400/403/404/409 | teachers,students,requests,reviews | actual service probes; no revision body; A01/A02/A08 |
| POST /api/teachers/coop-requests/:id/reject | same | {reason} nonblank<=2000; stage→rejected; same shapes/errors | same | required reason probe |
| GET /api/department-head/coop-requests | active explicit Head with nonblank department | default department_head_review;scope via Student.classAdvisor.department;status/pagination as Teacher;S(array including reviews) | Teacher/request/student/advisor/course/review | queue/service scope probes |
| GET /api/department-head/coop-requests/:id | same department scope | S({request,reviews});UUID400,403 scope,404 miss | same + company/job/delivery | source/service auth probes |
| POST /api/department-head/coop-requests/:id/approve | scoped Head | {} / optional reason; only department_head_review→approved;S({request,review});400/403/404/409 | teachers,students,requests,reviews | probe full two-stage chain; A08 |
| POST /api/department-head/coop-requests/:id/reject | scoped Head | required reason; same stage→rejected | same | same validator/source; live E2E not tested |
| GET /api/staff/coop-requests | active DepartmentStaff JWT | default all9 statuses; search<=100, limit/offset; S(array + cancellation metadata) | staff,requests,students,courses | source/queue probe; A10 |
| GET /api/staff/coop-requests/:id | active Staff | S({request,reviews,cancellation});UUID400;404 | staff/req/student/company/job/delivery/course/review/actors | source; A10 |
| POST /api/staff/coop-requests/:id/cancel | active Staff | reason required; optional expected_status + exact ISO expected_updated_at must come together;409 stale/not early state;S({request,review}) | staff/student/request/review | stale precondition probe; reason-only backward compatibility |

ไม่มี Student PUT/PATCH edit request, delete request หรือ route advance status หลัง approved ใน router นี้. ไม่มี Staff approve/reject/forward request routes; serviceปฏิเสธ approvalด้วย403. Company response/Staff document generation APIs เป็น downstream โมดูลแยก ไม่สั่งใช้งานรอบนี้. Frontend Student adapterตรงกับ7routesหลักทุก method; company-response adapterแยก; Teacher/Head adaptersส่ง reasonตาม validator. รูปแบบ field timestampsบางส่วนมี createdAt และ created_at: Teacher viewรองรับทั้งสอง ขณะที่ Studentอ่าน reasonsเป็นหลัก.

## D. Workflow / State Transition

`advisor_teacher_id` = **อาจารย์ที่ปรึกษาประจำชั้น** ผู้พิจารณาคำร้อง; `coop_advisor_teacher_id` = **อาจารย์โครงการ/นิเทศ** ไม่ได้สิทธิ์พิจารณาเพียงเพราะเป็น project advisor. Source: `roleWorkflow.service.js:85`–106, `student.model.js:309,325`, `teacherAuth.middleware.js:8`–52. Head scopeใช้ department ของ Class Advisor ปัจจุบัน ไม่ใช้ free-text major และไม่ได้อิง Student.department แม้ aggregate ปัจจุบันมี fieldนั้นแล้ว; commentว่า Studentไม่มีdepartmentเป็นบริบทเก่า ไม่เปลี่ยนนโยบายเอง.

| Current Status | Actor | Action | Next Status | Validation |
| --- | --- | --- | --- | --- |
| ไม่มี active request | Student co_op | submit | advisor_review | whitelist/date/courses, Student UPDATE lock, active7-state check, child history atomically; **ยังไม่ตรวจ Class Advisor** |
| advisor_review | selected active CLASS Teacher | approve | department_head_review | live actor, Student lock, current relationship, Request UPDATE lock, stage recheck |
| advisor_review | selected CLASS Teacher | reject | rejected | above + nonblank reason |
| department_head_review | active explicit scoped Head | approve | approved | current class-advisor department matches Head + stage lock |
| department_head_review | scoped Head | reject | rejected | above + reason |
| submitted/staff_review/advisor_review/department_head_review | owning Student | cancel | cancelled | Request lock+owner+early state; fixed student reason/history |
| same4 early states | active Staff | cancel | cancelled | actor+Student/Request locks, reason, optional stale preconditions |
| submitted/staff_review | Teacher/Head/Staff | approve/forward | **ไม่มีเส้นทางผ่าน** | Teacher stage rejects409; Head stage mismatches; Staff routeไม่มี/403 |
| approved/document_issued/in_progress | Student/Staff | cancel via request APIs | **ไม่อนุญาต** | Student400 / Staff409 |
| approved | Staff documents workflow | generate/edit document | request statusเดิม | document status/versionแยก; ไม่มี request status writerที่พบ |
| approved→document_issued→in_progress | — | request advancement | **Missing writer in inspected Source** | enum/UI/eligibilityรู้จัก แต่ไม่มี transition endpointที่ตรวจพบ |
| rejected/cancelled | owning Student | new submit | advisor_review (new row) | no active request; old historyเก็บไว้ |

Enum9สถานะตรง Frontend/backend/live DB. `submitted/staff_review` เป็น legacy/default states ไม่ใช่ initial stateของ POSTปัจจุบัน. ไม่พบ completed state หรือ re-application lifecycleหลัง in_progress ในขอบเขตนี้ จึงไม่สมมติว่ามี.

## E. UX/UI Audit

ข้อดี: heading/descriptionตรงโจทย์, loading/aria-live, current/historyแบ่งชัด, company/date/deliveryจาก API, required labels, native date/select, validationรายวิชา, Spinnerกัน double submit, cancel Shared Confirm, submit success Shared Toast, statusจาก Server, unknown statusไม่ปลอมเป็นapproved, reason Reject/Cancelจาก history, desktop2/mobile1คอลัมน์, tableมี scroll-region label.

ข้อจำกัดที่ยืนยัน: A03 Errorกลับเป็นEmpty; A04 approval placeholderขัดbadge; A05 dialog focusหลุด; A07 selected jobไม่ล้างเมื่อmanual; A14 search stale result. Submit **ไม่มี confirmation/review dialog** (`submitCoopRequestForm:2944` ส่งตรง) และ errorใช้ Inline messageแทน Toast; เป็น UX improvement ไม่ถือว่าฟังก์ชันเสียเพียงเพราะไม่มี Modal. ไม่มี explicit Retry ปุ่มสำหรับรายการ/รายละเอียด; เข้าเมนูใหม่/เปิดรายละเอียดใหม่โหลดได้. ไม่มี Focus/Visible pollingสำหรับคำร้องเทียบกับ Mentor; ต้องกลับเมนูเพื่ออัปเดต ไม่อ้าง Auto Syncที่ไม่มี.

ผู้ใช้เห็น stage/บทบาทถัดไปโดยชื่อบทบาท แต่ current cardไม่ระบุชื่อผู้รับพิจารณา/เวลาคาดหมาย/SLA; ชื่อ Class Advisorเห็นในฟอร์ม/รายละเอียด. Reject reasonต้องเปิด Detail. Cancel/reapplyแจ้งได้ในข้อความแต่ legacy stateค้างไม่มี recovery guide. รายละเอียด approvalควรใช้ review actor/date/reason จริง พร้อม state “ยังไม่พิจารณา” เฉพาะเมื่อไม่มี event.

Browserรอบนี้: Chrome + Mock HTTP + actual request HTML/CSS/scoped handlers/API adapters, synthetic currentStudent (ไม่ผ่าน Normal Login). Detailที่1280/768/390/320 ไม่มี page/modal horizontal overflow และใช้ Noto Sans Thai. Header/footerคงที่ใน dialogยาวทำให้320pxเห็นเนื้อหาทีละส่วน ต้องเลื่อนใน body; ไม่ใช่หลักฐานว่า screen-reader/ทุกสถานะ/ทุกฟอร์มผ่าน. กดTabจากfooterหลุดไปbackgroundยืนยัน A05. ไม่แก้ CSS/UI.

ข้อเสนอ P2: ตรวจและสรุปข้อมูลก่อน Submit, inline field-specific errors+focus, Retryที่รักษาข้อมูล, status refreshเมื่อกลับเมนู/Focusโดยมี guard, review timelineชื่อ/วันที่จริง, เพิ่ม aria-current ให้ stepper, focus trap+inert background, ยืนยัน readonlyCompany fieldsหลัง submission stateคืนค่า. ไม่เพิ่ม UIในรอบนี้.

## F. Security / Database Audit

- **JWT/live RBAC:** `auth.middleware.js:17` เป็นต้นไป verify JWT และ re-read actor/status/role/track; Student routeมี actor+co_op guard, Teacher guardตรวจactive, Head flag+department; ไม่อนุมานจาก Email/JWT frontend. Existing phase1รันใหม่ผ่าน. ไม่ทดสอบโจมตี JWTจริงกับHTTPรอบนี้.
- **Ownership/IDOR:** list where student_id=req.user.id; detail/cancel where id+owner, company-responseเช่นกัน. Mock Studentอีกคน listว่าง/detail/cancel404; Project Advisor/Headต่างdepartmentถูกปฏิเสธ403. เป็น scoped probe ไม่ใช่ full penetration test.
- **Mass assignment/SQLi/XSS:** create whitelistไม่รับstudent_id/status/reviewer; normalization/trimming/UUIDoptional; Sequelize predicates/escaped iLike ไม่ต่อ SQLจากuserinput; DOMข้อมูลใช้textContent/createElement. Role decision whitelistเฉพาะreason. ไม่พบ confirmed SQLi/XSSจากreadpathนี้ แต่ไม่ทำ fuzz/pentestเต็มรูปแบบ.
- **Transactions/races:** createล็อก Studentก่อนตรวจ active และล็อก existing active; job SHARE lock+expiry recheck; children/history commitร่วมกัน. Cancelล็อก owner Request. Reviewล็อก actor SHARE→Student UPDATE→Request UPDATE, reauthorize/stage check; Staff expected_status/timeเป็นoptionalสำหรับlegacyclients. ไม่มี request version/If-Match สำหรับ Student/Teacher/Head. Mock competing reviewพิสูจน์ stage behaviorภายใต้ synthetic transaction serialization ไม่ใช่ PG race proof. ไม่มี active-request partial unique index; application row-lock protocolเป็นguardหลัก ต้องทดสอบจริงใน isolated PG ก่อนรับรอง concurrency.
- **Logging:** controller errorส่ง raw Errorเข้าconsoleที่line213 อาจมี SQL/bind PII; APIใช้fallbackไม่ส่ง raw SQLออก client. ไม่มีการเก็บ JWT/Token/URLในรายงาน/Probe logs. A11เป็น potential disclosure ต้องตรวจlogจริงด้วยข้อมูลสมมติในรอบอนุญาตถัดไป.
- **Department/identity policy:** Class relationเป็น mutable current Student field; scopeหลังย้ายadvisorเปลี่ยนตาม (A08). Staff list/detail/cancelไม่มีdepartment predicate (A10); ไม่ประกาศว่าเป็น IDORจนยืนยัน intended Staff scope. ไม่เปลี่ยน Identity/Assignment policyเอง.

### Live Development catalog — READ ONLY

อ่าน `intern_postgres` / DB `intern_system` / **PostgreSQL16.15** โดย `BEGIN TRANSACTION READ ONLY`, statement_timeout15s, SELECT catalogแล้ว `ROLLBACK`; serverยืนยัน transaction_read_only=on. ไม่เรียก db:init/reset/verify-empty/sync/alter, initializer inspectorที่อาจสร้างtemp relation, seeds, protected business POST หรือ status changes. ไม่อ่านชื่อ/Email/รหัสของบัญชีจริง.

ตรวจ metadata11ตาราง: `coop_requests`, `coop_request_reviews`, `coop_request_prerequisite_courses`, `coop_request_delivery_methods`, `students`, `student_profiles`, `teachers`, `companies`, `job_postings`, `coop_documents`, `company_responses`: **191 columns /61 constraints /25 indexes** ในขอบเขต query. Compare4 core request modelsแบบofflineกับactual catalog: **44 column types/nullability,9 FKs+actions,7 declared indexes,5 defaults ตรงกัน**, missing/mismatch0. Enum request9ค่าและdelivery3ค่าตรงกัน. เป็น core comparison ไม่ใช่ full schema certificationทั้ง191columns/ทั้งระบบ.

| ตาราง | Integrity ที่พบ |
| --- | --- |
| coop_requests | UUID PK, required student FK CASCADE; nullable company/job FKs SET NULL; status enum default submitted; date fields DATE; indexes company/job/status+submitted และ UNIQUE(id,student_id). **ไม่มี DB date-order CHECK หรือ UNIQUE active-owner**; model/controllerตรวจ date/activeแทน |
| delivery_methods | FK CASCADE, enum3, UNIQUE(request_id,method) |
| prerequisite_courses | FK CASCADE, UNIQUE(request_id,course_code), validated program/code และ status/grade CHECK; APIกำหนดครบ5รายการ แต่DBไม่ตรวจจำนวน5ข้ามแถว |
| coop_request_reviews | request/student/teacher/staff FKs RESTRICT, actor consistency CHECK validated; history index; reason/transition CHECKเป็น **NOT VALIDตาม Source** ไม่ใช่ drift. PGยังตรวจ new/changed rows แต่ไม่รับรองexisting rowsทั้งหมด; ไม่มี user triggerของ4core tablesที่ queryพบ |
| students/teachers | nullable Class/Project Teacher FK (SET NULL), Class Advisor index; Teacher active/Head flag/departmentใช้authorize. Live catalog+modelsแสดง2identitiesแยกกัน |
| companies/job_postings | Company identity+normalized lookup; requestเป็นsnapshotพร้อมoptionalFK; job eligibility status/deadline/CompanyตรวจServer |
| documents/company_responses | request-owned document/result version/historyแยก; downstream consumeapproved-family states; ไม่ใช่ตัวอัปเดตrequestenumที่พบ |

**ไม่มี migration table/ledger ใน public catalogที่ค้นพบ**, ตรง model-driven current workflowและcomment `postgresIntegrity.js:1`. README migration-based setupในประวัติเก่าไม่ใช่คำสั่งให้รันปัจจุบัน. ไม่ทำ migration/schema/data mutationระหว่างAudit. ยังไม่ได้ scan real rowsพิสูจน์ legacy violation/orphan/active duplicates จึงไม่อ้างว่าไม่มีข้อมูลผิด.

## G. Findings

### A01 — High — Workflow — Confirmed bug / Mock reproduced

- **Problem/Evidence:** POSTยอมรับไม่มี Class Advisor แล้วสร้างadvisor_review: `backend/src/controllers/coopRequest.controller.js:294,303,324`–336; nullable FK `backend/src/models/student.model.js:309`. Queue/authorityบังคับClass relationที่ `backend/src/services/roleWorkflow.service.js:85,125`.
- **Reproduction:** synthetic co_op Student majorIT, advisor_teacher_idNULL, optionalprojectadvisorมีค่า, ส่งvalidpayload+5courses→201 advisor_review; Teacher/Head approve→403. **Impact:** ไม่มี Teacher queue owner, Headรับช่วงไม่ได้ก่อนถึงstage; ต้อง assign Class Advisorแยกหรือcancel ไม่ใช่ automaticrecovery.
- **Recommended fix:** ตรวจ active/eligible Class Advisorในtransactionก่อนสร้าง; แสดง Inline guidance และทดสอบ no/null/inactive/department/advisorchange cases; กำหนดแผนlegacyแยกไม่สุ่มassign. **Verification:** actual controller+real validators/service with in-memory models PASS reproduction; live incidence NOT TESTED.

### A02 — Medium — Workflow — Confirmed conditional gap

- **Problem/Evidence:** legacy submitted/staff_reviewอยู่ในenum/active set แต่ STAGES.teacherรับเพียงadvisor_review: `roleWorkflow.service.js:20,241`; `coopRequest.model.js:71`; Staffไม่มีforwardที่ `roleWorkflow.routes.js:64`–74. SQLreviewCHECKยังมีteacher-from-submittedเป็นallowanceเก่า (`postgresIntegrity.js:106`).
- **Reproduction:** synthetic requestสองสถานะนี้ + validclassadvisor; Teacherapprove→409, Headยังไม่ใช่stage, Staffapprove403/routeabsent. **Impact:** ถ้ามีlegacy rowsจะไม่เดินหน้าตามปุ่มอนุมัติ; cancelยังได้.
- **Recommended fix:** วางauthorized migration/recovery policyตามข้อมูลจริงก่อนเปลี่ยนstage guards; ไม่bulkadvanceในAudit. **Verification:** mock reproduced; ไม่อ่านrowsจริง จึงไม่ยืนยันว่ามีคำร้องค้างอยู่จริง.

### A03 — Medium — UX/Data state — Confirmed bug / Browser reproduced

- **Problem/Evidence:** `frontend/src/pages/student_coop.js:2822`–2830 ล้างcoopRequestsเมื่อGETerror; render2730/2797แสดงEmpty/emptyhistoryเหมือนไม่เคยยื่น.
- **Reproduction:** โหลดapprovedrequestสำเร็จแล้วGET500/networkerror→rows0และEmptyพร้อมError. **Impact:** ผู้ใช้เข้าใจว่าข้อมูลหายและเริ่มยื่นใหม่; Backend409ยังกันduplicate แต่สร้างความสับสน.
- **Recommended fix:** แยกloaded/error/empty, รักษาlast successfuldata, Retryชัดและไม่เปิดทางสร้างใหม่จากabsenceที่ยังไม่ยืนยัน. **Verification:** VM handlerและChrome Mock500 reproduced; sourceไม่แก้.

### A04 — Medium — Status accuracy — Confirmed bug / Browser reproduced

- **Problem/Evidence:** Detail HTMLมี “ยังไม่มีข้อมูลการพิจารณา” และวันที่ว่างตายตัวที่ `frontend/src/student_coop/student_coop.html:1556`–1557; `student_coop.js:2998`–3061อ่านreviewเฉพาะReject/Cancel ไม่renderapprovalfields.
- **Reproduction:** GETdetail approved + teacher/headapprove events→badgeอนุมัติแล้ว แต่approvalsectionsยังบอกไม่มีข้อมูล. **Impact:** ไม่รู้ใครพิจารณา/เมื่อไร, ข้อมูลสถานะขัดกัน.
- **Recommended fix:** renderactor/date/decision/reasonจากreviewsอย่างปลอดภัย โดยคงplaceholderเฉพาะnoevent. **Verification:** actualHTML/renderer+ChromeMockยืนยัน; ไม่claimDBwrong.

### A05 — Medium — Accessibility — Confirmed bug / Keyboard reproduced

- **Problem/Evidence:** custom requestdialogsประกาศaria-modal แต่ไม่มีTabtrap/inertbackground; listenersมีEscapeอย่างเดียว (`student_coop.js:2886,3087,3216`; HTML1455,1537). SharedConfirmมีtrapแต่ไม่ครอบสองdialogนี้.
- **Reproduction:** เปิดDetail, focusปุ่มfooterสุดท้าย, Tab→focusไปbackgroundนอกdialogในChrome. **Impact:** keyboard/screenreadercontextหลุด; focusrestoreตอนปิดอย่างเดียวไม่พอ.
- **Recommended fix:** reusable shared dialogfocus lifecycle, Tab/ShiftTabcontainment/inertbackground; keepEscape/returnFocus. **Verification:** browserkeyboardreproduced; fullscreenreader NOT TESTED.

### A06 — Medium — Reliability/API semantics — Confirmed failure path / Mock reproduced

- **Problem/Evidence:** create/cancelcommitก่อนอ่านresponseใหม่ (`coopRequest.controller.js:346`–361,430–445); readfailเข้าจับerror500แม้commitสำเร็จแล้ว.
- **Reproduction:** Mockให้childwrites/commitผ่าน แล้วfindOwnedRequestหลังcommitthrow→HTTP500ทั้งที่requestยังอยู่. **Impact:** ผู้ใช้retryแล้วได้409/ข้อมูลอาจถูกสร้างหรือcancelไปแล้ว; ไม่มีcommit-uncertain UI.
- **Recommended fix:** ส่งacknowledgedmutationresultจากtransaction/แยกrefreshfailure, ทบทวนidempotency/commit-uncertainhandlingโดยไม่ส่งซ้ำแบบblind. **Verification:** synthetic post-commitreadfaultreproduced; actualPGacknowledgement-loss NOT TESTED.

### A07 — Medium — Form mapping — Confirmed source behavior / Mock reproduced

- **Problem/Evidence:** jobentryตั้งselectedCoopJobPostingIdที่ `student_coop.js:3191`–3195; applyCoopCompany/manualที่2868/3163ไม่ล้างjob; POSTresolvejobCompanyที่ `coopRequest.controller.js:278`–288.
- **Reproduction:** เปิดจากjob→เลือกmanual/บริษัทอื่น→jobIDเดิมยังอยู่; manualไม่มีcompanyIDจะถูกServerเติมบริษัทของjobกลับ หรือเลือกบริษัทอื่นแล้ว400mismatch. **Impact:** ข้อมูลบริษัทที่กรอกไม่ตรงสิ่งที่บันทึก/เกิดerrorไม่ชัด.
- **Recommended fix:** clear/explicitlyconfirmjobassociationเมื่อเปลี่ยนบริษัท และclearjobbannerให้ตรงpayload. **Verification:** actualapplyhandlerVMพิสูจน์IDค้าง; ServerbranchตรวจSource, ยังไม่ทดสอบlivejobwrite.

### A08 — High — Authorization policy — Potential risk; behavior reproduced, policy unresolved

- **Problem/Evidence:** review/Head scope อิง Class Advisor ปัจจุบัน (`backend/src/services/roleWorkflow.service.js:85`–106 และ `:227`); Profile write รับ active advisor โดยไม่ผูก request stage (`backend/src/services/studentProfileAggregate.service.js:141`–148). ไม่มี submitted advisor/department binding หรือ review revision ใน request.
- **Reproduction:** TeacherAอนุมัติ→ย้ายClassAdvisorไปTeacherBdepartmentB→HeadBอนุมัติได้ แม้eventแรกมาจากTeacherAdepartmentA. **Impact:** reviewer/departmentauthorityเปลี่ยนกลางworkflow; อาจเป็นสิทธิ์ที่ตั้งใจหรือpolicygap ต้องยืนยันก่อนตัดสินว่าunauthorized.
- **Recommended fix:** ยืนยัน assignment authority/transfer policy แล้วผูกreviewcontextหรือinvalidate/re-reviewอย่างมีประวัติและconcurrencyguard. **Verification:** actualserviceMockreproduced currentbehavior; ไม่เปลี่ยนนโยบาย/บัญชีจริง และไม่ประกาศconfirmedprivilegeescalation.

### A09 — Medium — Integration completeness — Confirmed source gap

- **Problem/Evidence:** enum/UI/eligibilityมีdocument_issued/in_progress (`coopRequest.model.js:78`, `student_coop.js:2407`); globalSourceค้นพบเพียงread/eligibility ไม่มีrequestwriter; `staffDocuments.service.js:6,174`–193จัดการCoopDocumentแยก.
- **Reproduction:** ทบทวนavailabletransitionsหลังHeadapprove: requestจบที่approved; documentgenerationไม่ได้เปลี่ยนrequest.status. **Impact:** badgeขั้นถัดไปอาจไม่เปลี่ยนแม้เอกสารออกแล้ว; ไม่สามารถรับรองworkflowครบถึงเริ่มงาน.
- **Recommended fix:** กำหนดcanonicalownershipของ downstreamstatusและacceptancecriteriaก่อนเชื่อม; ไม่เดาว่าต้องsetprogressจากวันที่อย่างเดียว. **Verification:** source-widewritersearch; ไม่ generateเอกสารจริง/ไม่อ้างliveE2E.

### A10 — Medium — Department scope — Potential policy risk

- **Problem/Evidence:** listRequestsเฉพาะTeacher/HeadกำหนดStudentwhere; Staffไม่มีscopepredicate และauthorizeRequestไม่มีStaffbranch (`roleWorkflow.service.js:98,125`–142,233).
- **Reproduction:** MockStaffdepartmentAเรียกqueueoptionsไม่มีdepartmentfilter; requestDetail/cancelไม่ตรวจStudentdepartment. **Impact:** ถ้าStaffต้องจำกัดภาควิชาอาจเห็น/ยกเลิกข้ามscope; หากintendedcentralStaffอาจถูกต้อง.
- **Recommended fix:** ยืนยันscopecontractกับownerก่อนเพิ่มpredicate/guards และnegative tests. **Verification:** source+mockoptions; ไม่เข้าถึงข้อมูลจริงคนอื่นและไม่ตีความpolicyเอง.

### A11 — Low — Input errors / Logging — Potential disclosure and confirmed validation gap

- **Problem/Evidence:** Studentdetail/cancel/joblookupไม่มีparamUUIDnormalization (`coopRequest.controller.js:244,394,405`), DBerrorไป500/rawconsoleที่196–214. SQL/binderrorอาจมีข้อมูลsnapshot.
- **Reproduction plan (ยังไม่รันกับ DB):** ให้ isolated DB หรือ Mock โยน error22P02 จาก malformed id แล้วตรวจ generic500 และ sanitized logs; รอบนี้ตรวจ catch จาก Source เท่านั้น. **Impact:** status ไม่ตรง invalid input และอาจมี PII ใน server logs; ไม่ได้พิสูจน์ PII รั่วจริง.
- **Recommended fix:** validateparams400และใช้sanitizedoperation/errorcode logs ไม่มีbindvalues; เพิ่มnegativeid/logredactiontests. **Verification:** Sourceconfirmed; realserverlogs/actual22P02 NOT TESTED.

### A12 — Low — Prerequisite policy — Potential requirement gap

- **Problem/Evidence:** catalogvalidatesครบ5แต่อนุญาตunselected/gradeNULL (`coopPrerequisites.js:19`–34; `student_coop.js:2958`).
- **Reproduction:** MockvalidITStudentส่ง5unselected→201; ไม่มีGPA/passcount/futuredate gate. **Impact:** ถ้านโยบายต้องผ่านวิชาก่อนยื่น จะยื่นได้ก่อนครบ; ข้อกำหนดปัจจุบันยังไม่ชัดว่าต้องผ่านก่อนยื่นหรือก่อนออกฝึก.
- **Recommended fix:** ระบุpolicyแยกsubmissioneligibility/approval/placement ไม่เพิ่มเกณฑ์เอง. **Verification:** actualvalidatormockreproduced; ไม่ประกาศว่าเป็นbugนโยบายโดยไม่มีข้อกำหนด.

### A13 — Low — Legacy integrity assurance — Needs verification

- **Problem/Evidence:** livecatalogและ `postgresIntegrity.js:106,113` กำหนดreviewtransition/reason CHECKเป็นNOT VALID; ไม่มีlegacydatascanรอบนี้.
- **Reproduction:** SELECTpg_constraintพบconvalidated=falseสองรายการ; **ไม่ได้แปลว่าnewrowsไม่ถูกcheck** หรือพิสูจน์ว่าข้อมูลเก่าผิด.
- **Impact:** ยังรับรองhistoryเดิมทั้งหมดไม่ได้. **Recommended fix:** authorizedread-onlyaggregatevalidationของlegacyrowsก่อนวางแผนvalidateconstraint/repairแยก; ห้ามALTERในAuditนี้. **Verification:** catalogconfirmed; historicalviolations NOT TESTED.

### A14 — Low — Async search correctness — Confirmed bug / Browser reproduced

- **Problem/Evidence:** debouncehandlercapturequeryแต่ไม่มีsequence/abort/ตรวจcurrentqueryก่อนreplaceChildren (`student_coop.js:3145`–3159); duplicateblurมีpatternใกล้เคียง3164.
- **Reproduction:** alpharesponseช้า, พิมพ์betaและbetaresponseกลับก่อน; alphaกลับทีหลัง→inputbetaแต่ผลalpha. **Impact:** อาจเลือกบริษัทผิด/สับสนจากผลเก่า.
- **Recommended fix:** sequenceหรือAbortController+query/currentmodalguard; clearresultเมื่อmanual/close; testout-of-order. **Verification:** ChromeMockHTTPยืนยันsearch; duplicateblurout-of-orderเป็นriskจากSource ยังไม่ได้จำลองแยก.

## H. Prioritized Roadmap

| Priority | งานแนะนำ | เงื่อนไขก่อนเริ่ม / ผลตรวจรับ |
| --- | --- | --- |
| P0 | A01: ป้องกันsubmitไม่มีeligibleClassAdvisor | backendtransaction+frontendguidance+negative tests; no autoassignment/no legacybulkupdate |
| P0 — policy decision | ตกลงA08 authorityเมื่อเปลี่ยนClassAdvisor/department | ยืนยันcontractก่อนเปลี่ยนIdentity/Assignment policy; จากนั้นทดสอบreviewtransfer/rollback |
| P1 | A02legacyrecovery, A06acknowledgedcommit, A04approvaltimeline | แยกauthorizeddatarepairจากlogicchange, preservehistory/owner; snapshot/contextตามpolicy |
| P1 | A07job/companybinding; durableCoopRequesttestcoverage+isolatedPGconcurrency | no-overwrite surprise; actualPGStudentdouble-submit/review/cancel/rollback/reload tests |
| P1 — policy decision | A10Staffscope และA12academiceligibility | กำหนดintendedroles/เกณฑ์ก่อนเพิ่มrestrictions; ไม่เปลี่ยนเอง |
| P2 | A03retain+Retry, A05focus, A14searchrace, review-before-submit, statusrefresh | error/emptyแยก; keyboard+Mobile; Servertruthเสมอ |
| P2 | A09downstreamstatuscontract, A11input/logs, A13legacyintegrityverification | don'tinferstatusfromUI; sanitizedlogs; read-onlyverificationก่อนDDL |
| P3 | SLA/nextreviewername, paginationforStudenthistory, requestidempotency/versionstrategy | ออกแบบร่วมกับworkflowcontract ไม่เพิ่มAPI/Schemaล่วงหน้า |

**Suggested next implementation:** แก้ A01 แบบจำกัดscopeก่อน พร้อม reusable tests ของ create/null/inactive/project-only advisor และ Teacher/Headqueue/authorization. ยังไม่เริ่มimplementationหรือแก้ข้อมูลเก่าในรอบนี้.

## I. Acceptance Criteria / Manual Acceptance Plan

รายการต่อไปนี้เป็น Checklist สำหรับรอบที่มีisolatedtestDB/บัญชีสมมติ/สิทธิ์เขียนชัดเจน **ไม่ใช่ผลPASSของrealE2Eรอบนี้**.

- [ ] ตรวจtargetเป็นisolatedDB/fixtureaccounts ไม่ใช่ข้อมูลนักศึกษาจริง และกำหนดcleanup/backupตามขอบเขตที่อนุญาต.
- [ ] Studentco_opมีClassAdvisorAactive; ProjectAdvisorBแยกคน; ไม่มีClassAdvisor/มีแต่Bต้องถูกblockก่อนinsertหลังแก้A01.
- [ ] Companysearch/duplicate/manual/publishedjobprefillตรงpayload; เปลี่ยนcompanyแล้วjobcontextไม่ค้าง; out-of-ordersearchไม่ทับqueryใหม่.
- [ ] Required/NULL/length/UUID/dateจริง/end>=start/delivery1–3unique/cross-program/missinggrade/unknownfieldsตรวจครบตามcontract; academiceligibilityตามpolicyที่ยืนยัน.
- [ ] เปิดform/review/submitด้วยKeyboard/Mobile; DoubleClick/Enterซ้ำออก1mutation; spinner/aria-busyคืนค่าทุกทาง; errorรักษาDraft.
- [ ] Submit201→DBมี1request+5courses+delivery+submitreviewครบในtransaction; reloadได้ข้อมูลเดิม; competingPOSTได้1success+1conflictโดยไม่มีduplicateactive.
- [ ] Studentอื่นlistไม่เห็น/detail/cancel404; TeacherBprojectonlyและHeadต่างdepartment403; disabled/revoked/wrongrole/expiredJWTถูกrejectสดจากBackend.
- [ ] TeacherAqueueเห็นadvisor_review; approve→department_head_review+actor/timehistory; Rejectต้องreason; duplicate/concurrentdecisionมีwinnerเดียวและhistoryเดียว; SQLfailureต้องrollback.
- [ ] ScopedHeadqueueเห็นเฉพาะrequestในscopeตามpolicy; approve→approved หรือRejectพร้อมreason; stale/crossdepartmentห้ามผ่าน; profile/advisorchangeระหว่างreviewเป็นไปตามpolicyที่อนุมัติ.
- [ ] Studenttracking/approvaltimelineชื่อวันที่จริง; ไม่มีstatic“ยังไม่พิจารณา”หลังapproval; nofalsesuccessจากGETerror; reconnect/reloadถูกต้อง.
- [ ] Cancelearlystage→cancelled+history; wrongowner/stateปฏิเสธ; resubmitได้หลังterminal; cancel/reviewraceไม่ทิ้งorphan/partialstate; Staffexpectedstate/time409เมื่อstale.
- [ ] legacy submitted/staff_reviewมีrecoveryที่อนุญาตและไม่ยกระดับสิทธิ์; Approved/Issued/InProgress/Completionได้canonicalcontractก่อนทดสอบend-to-end.
- [ ] Mockpost-commitfailure/realisolatedPGconnectionfaultไม่ทำให้clientblindresubmit; errorlogsไม่มีPII/JWT; XSSpayloadเป็นtext; invalidUUID400หลังแก้.
- [ ] DialogTab/ShiftTabอยู่ในdialog, Escape/returnFocus/aria-liveถูกต้อง; 1280/768/390/320pxไม่มีpageoverflow; reducedmotion/screenreaderตรวจแยก.

### Test Results / Evidence Ledger

| Status | การตรวจรอบนี้ | ขอบเขต |
| --- | --- | --- |
| PASS | Backend phase1+mentorVerificationEmail **25/25**,0fail/skip ในDocker | actualmodulesกับmocks/streamtransport; มีjobdeadline/ownerlist/liveguards/Mentorregression; ไม่ใช่requestPGintegration |
| PASS | Frontend4suites **97/97**,0fail/skip ในnetwork-disabled/read-onlyDocker | mentorVerification,phase1,studentProfileContacts,coopTopicExams; ไม่ใช่dedicatedfullrequestE2E |
| PASS | Auditprobes **13/13** ในOS temp | actualrequestcontroller/realprerequisitevalidator/roleWorkflowservice/selectedfrontendhandlersกับin-memorymodels; รวมreproducedfindings, syntheticserializedapprovalไม่ใช่PGlocks |
| PASS | ChromeAudit + MockHTTP | actualscopedrequesthandlers/HTML/CSS/adapters, approveddetail4widths, A03/A04/A05/A14reproduced, submit1POST/Spinnerคืนค่า, runtimeerrors0; syntheticidentity/noLogin |
| PASS | Catalogmetadata/compare | PostgreSQL16.15Readonlyon;44corecolumns/9FK/7indexes/5defaultsตรง; broader191columnmetadata;2NOTVALIDasexpected |
| PASS | Syntax | Docker node --check controllers/coopRequest,services/roleWorkflow,routes/coopRequest; Frontendstudent_coop/coopRequest.api |
| PASS | ProductionBuild | Docker frontend npm run build:163modules,5.18s; bundle-size/plugin-timingwarningsไม่ใช่buildfailure |
| PASS | Git/UTF-8/preservation | แก้README/Handoff+รายงานใหม่เท่านั้น; noDBmutation/Commit/Push; baselinehashตรวจตอนจบ |
| SKIP | ไม่มีskipในsuitesที่รัน | ไม่อ้างว่าintegrationtestsอื่นผ่าน/skipโดยไม่ได้รัน |
| BLOCKED | Real Student→Teacher→Head→DBwriteE2EในDevelopment | prohibitedbyread-onlyscope/noauthorizedtestaccounts; ใช้checklistข้างต้นแทน |
| NOT TESTED | isolatedPostgreSQLrequestlocks/durability/faults,liveprotectedGETaccounts,realhistoryvalidation,SMTP,Gmail,fullscreenreader | ไม่รันdb:init/reset/legacyrunnerจากREADMEประวัติ; existingtopic/profilePGtestsไม่ใช่requestcoverageและอยู่นอกscope |
| FAIL — Functional findings | A01/A03/A04/A05/A06/A07/A14ยังไม่แก้ | Probeassertionsที่PASSคือการพิสูจน์bug/behavior ไม่ใช่acceptanceว่าพฤติกรรมนั้นถูกต้อง |

คำสั่งหลักที่รัน: `docker exec intern_backend node --test test/mentorVerificationEmail.test.js test/phase1.test.js`; Frontendใช้containerแยก`--network none`,mountRepo`/workspace:readonly`,dependenciesจากBackendcontainerreadonly แล้ว`node --test frontend/test/{mentorVerification,phase1,studentProfileContacts,coopTopicExams}.test.js`; `docker exec intern_frontend npm run build`. Scratchprobes/browser/catalogqueryอยู่OS temp ไม่เพิ่มtestsourceหรือcredentialsในRepo. ไม่รัน`npm test`/migrations/ledgerจากเอกสารเก่า.

### Final Preservation

Gitก่อน **28 modified /14 untracked /0 deleted** → หลัง **28 modified /15 untracked /0 deleted**. Baseline806ไฟล์: เปลี่ยนเฉพาะREADME/Handoff อีก **804ไฟล์ byte-identical**; เพิ่มรายงานนี้1ไฟล์ ไม่มีไฟล์หาย/Sourceเปลี่ยน. LiveSQLทุกชุดเป็นREAD ONLY+ROLLBACK ไม่มีbusinesswrite,DDL,reset,seed,volume deletion,CommitหรือPush. GitDiff/UTF-8ตรวจหลังเขียนเอกสารอีกครั้ง. รายงานนี้เป็นผลAudit/แผนแก้ ไม่ใช่authorizationให้เปลี่ยนpolicyหรือdeploy.
