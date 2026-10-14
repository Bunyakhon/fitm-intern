# FITM-INTERN — Student Profile Phase 5: Final Acceptance

วันที่ตรวจ: 11 ตุลาคม 2026 (Asia/Bangkok)

## 1. Executive Summary

**คำแนะนำ: ACCEPTED WITH LIMITATIONS สำหรับ Manual Entry และ PDF Import ในรูปแบบที่ยืนยันแล้วบน Development/Test**

Manual Entry 5 Tabs, Text/AcroForm PDF → Preview → เลือก/แก้ค่า → ยืนยัน → PostgreSQL/Private Storage, การแก้ภายหลัง, F5 ของ Edge Windows จริง, Hard Reload, Revision/Concurrency และ Document Ownership ผ่านการทดสอบจริง ข้อมูล Development เดิมไม่เปลี่ยน ไม่มี Critical/High Bug ที่ยังเปิดอยู่ในขอบเขตหลักซึ่งตรวจแล้ว

**PARTIAL / Limited Support:** OCR ภาษาไทย, Checkbox จากภาพ และตารางทักษะสแกน ไม่รับรอง PDF ทุก export/ทุกคุณภาพภาพ ผู้ใช้ต้องตรวจและแก้ค่าดิบก่อนเลือกใช้ ค่าเริ่มต้นเป็นเก็บค่าเดิม/ข้าม ไม่มี Auto-save หรือ Auto-apply

**BLOCKED:** นโยบายเลขบัตรประชาชน การรับรอง และลายเซ็นยังไม่ได้รับการยืนยัน ไม่มีการเปิดฟังก์ชันเหล่านี้ การตรวจรับนี้ไม่ใช่ Production Ready หรือการยืนยันว่ากรอกครบเพื่อยื่นคำร้อง

## 2. Test Environment

ตรวจ Git Status/Diff ก่อนทำงาน และอ่านรายงาน Phase 1, 2A, 2B.2, 3A, 3B, 4 รวม Source/Profile Tests/Auth/Private Storage และต้นแบบ `docs/requirements/profile.pdf` เก็บ SHA-256 ของไฟล์เดิม 541 รายการ ไม่มีไฟล์เดิมถูกลบ; เปลี่ยน Runtime เพียง Profile Client และ Profile PDF Parser

| ส่วน | Environment ที่ใช้จริง |
| --- | --- |
| Frontend | Vite 8.2.2, หน้า Student Dashboard เต็มหน้า ผ่าน loopback port แยกของ QA |
| Backend | Production Auth/Profile routes, controllers, services และ Sequelize ใน HTTP server แยก |
| Browser | Microsoft Edge 155.0.4283.45 บน Windows; headless รอบแรก และหน้าต่างจริงวางนอก Desktop ในรอบ F5 |
| Node | v24.11.1 |
| PostgreSQL | PostgreSQL 16.15; clone เฉพาะ installed schema ด้วย pg_dump/pg_restore ไม่มีแถวจริง |
| NLP | `intern_nlp_service`, Python 3.11, PyMuPDF 1.24.14, Tesseract `tha+eng` ภายในเครื่อง |
| Storage | Private `STORAGE_ROOT` ใน OS temp ของ QA; มีไฟล์สังเคราะห์เท่านั้น |
| บัญชี | สร้าง Student สังเคราะห์ในฐานแยก ผ่าน Password Login ของระบบเดิม |

ทุก Test Database ตรวจชื่อ `fitm_profile_5_<nonce>`, marker และ DB_NAME ก่อนใช้ เชื่อมด้วย Role แยก ไม่เรียก Migration/sync/reset/drop/truncate ไม่ส่งข้อมูลบุคคลไป External OCR/AI ไม่เปลี่ยน Auth/Approval Workflow

ต้นแบบ PDF ตรวจ SHA-256 เดิม `7e0279a7479fbf163bdda40dd2dbca1cf514bfd00153bf9d27da7ddc6bea11f8`, 4 หน้า, geometry ตรง, ไม่มี AcroForm ตรวจ Extraction แบบแสดงเฉพาะ keys/counts ไม่ส่งค่าบุคคลออก Console และไม่ใช้ต้นแบบเขียน Profile/Storage/DB: [Template verification](FITM_STUDENT_PROFILE_PHASE5_TEMPLATE_VERIFICATION.json)

## 3. Manual Entry Results

| Tab / Workflow | ผล |
| --- | --- |
| ประวัตินักศึกษา | **PASS:** GET/แก้ฟิลด์อนุญาต/บันทึก/read-back; รูปผ่าน Modal เดิม, If-Match, Private image GET และ unauthenticated 401 |
| ติดต่อ/ครอบครัว/ฉุกเฉิน | **PASS:** ที่อยู่ทะเบียนบ้าน/ปัจจุบัน, ยืนยัน copy เป็น Draft, รักษา postcode ศูนย์นำหน้า/ข้อความที่อยู่เดิม, เปลี่ยนเฉพาะ family dirty fields |
| การศึกษา/ทักษะ | **PASS:** CRUD education/training/computer/language ผ่าน UI และ PostgreSQL; ระดับ proficiency ตาม enum; ค่า legacy health/skills/parent/father ไม่หาย |
| เอกสารประกอบ | **PASS:** ทั้ง 5 ประเภท, supporting label, version/label, authenticated browser download, logical removal และ ownership |
| บัญชีผู้ใช้ | **PASS:** Read-only ไม่เปิด mutation/เลขบัตร/ลายเซ็น ไม่มี password/hash ในข้อมูลบัญชีที่ทดสอบ |
| Draft | **PASS:** สลับ Tab/ปิดเปิด Modal/Refresh API/พิมพ์ระหว่าง save ไม่ทับ Draft; global writer guard กัน save ซ้อน |
| Legacy academic form | **PASS หลังแก้:** Initial Snapshot ให้ Revision ก่อนเปิดกรอก; เมื่อ stale มี HTTP 409 จริง เก็บ Draftและไม่เขียน DB |

Calendar/leap year/GPA/Safe Integer/nullable/allowlists ผ่านชุด Validation เดิม และ API จริงมี invalid date/GPA/unsafe father_age rejection การตั้งใจล้าง null และ omission แยกกัน ไม่มีข้อกำหนดใหม่บังคับกรอก Draft ทุกช่อง

Loading, confirmation, success, conflict/error และ empty child state ถูกใช้ใน workflow ที่รันจริง การพิสูจน์ทุก error/empty combination ของแต่ละ Tab แบบ exhaustively เป็น **PARTIAL**; Initial API failure รายละเอียดอยู่ใน Regression VM/DOM Tests ไม่ถือว่าเป็น Browser outage test ทุกแบบ

## 4. PDF Import Results

**PASS:** Synthetic TGDE-like 4-page Text/AcroForm PDF ผ่าน file selection → upload → local extraction → old/PDF/edit comparison → keep/use/edit/skip → confirmation → PostgreSQL scalar/children + original private PDF → owner download bytes/hash ตรง → fresh page/F5 → manual edit โดยไม่ต้อง upload ใหม่

Preview ไม่มี SQL/file metadata write การยกเลิกเก็บ Manual Draft เดิม ไม่เพิ่มเอกสาร; การเลือก child create/update ไม่ลบรายการเก่า; duplicate create ถูกปฏิเสธพร้อม rollback การส่ง receipt ซ้ำไม่เพิ่ม revision/row/file ส่วน COMMIT สำเร็จแต่ response 500 กู้ด้วย read-only status ไม่ POST ซ้ำอัตโนมัติ

**PASS ด้าน fail-closed:** Wrong student ID, conflicting identity, corrupt/encrypted/active/unsupported/5-page PDF, wrong MIME/extension, >10MB, multiple file parts และ receipt/hash/name mismatch ไม่เปลี่ยน Profile

**PARTIAL สำหรับต้นแบบ export ไทย:** หลังเพิ่มการจับ label ไทย ตัวอย่างต้นแบบยังมี `STUDENT_ID_UNREADABLE` และ address candidate 1 รายการที่ยังไม่ยืนยันค่าจากภาพ ไม่ใช้ candidate นี้เป็นหลักฐาน accuracy; Backend จะปฏิเสธ Preview เมื่อ identity ขัดแย้ง ต้องใช้ข้อมูลสังเคราะห์ที่กรอกตาม export นี้เพิ่มเพื่อยืนยัน mapping ไม่ลดการตรวจ identity เพื่อให้ไฟล์ผ่าน

## 5. OCR / Checkbox Accuracy

สร้าง Fixtures พร้อม Expected Values ใน `nlp-service/tests/profile_phase5_fixtures.py` วัดผ่าน production worker จริง 7 กลุ่ม ไม่มี confidence score สมมติ ไม่มีการแก้ค่า OCR อัตโนมัติเพื่อให้คะแนนดีขึ้น

นิยาม: Extraction = จำนวน expected values ที่พบใน output ที่ key ใดก็ได้ / expected count; Mapping = จำนวน correct key+value / values ที่พบ; Correct key+value = ความครบถ้วนที่ตรงค่าแบบ strict / expected count ใช้ชนิดข้อมูลตรงกัน ไม่ตัดช่องว่างในคะแนนหลัก ค่า Thai whitespace-normalized เป็นตัววิเคราะห์แยกเท่านั้น

| Fixture | Correct key+value | Extraction | Mapping เมื่ออ่าน value ได้ | อ่านไม่ได้ | อ่านผิด/format ต่าง | ต้องตรวจแก้เอง |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A Text + approved AcroForm | 38/38 (100%) | 38/38 | 38/38 | 0 | 0 | 0 |
| B สแกนไทยล้วน | 7/15 (46.67%) | 7/15 | 7/7 | 3 | 5 | 8 |
| C สแกนไทย/อังกฤษ | 28/29 (96.55%) | 28/29 | 28/28 | 0 | 1 | 1 |
| D Explicit AcroForm Checkbox | 29/29 (100%) | 29/29 | 29/29 | 0 | 0 | 0 |
| E Text skill grid | 9/9 (100%) | 9/9 | 9/9 | 0 | 0 | 0 |
| F Incomplete blank | 1/1 identity; ไม่มี scalar/child เทียม | 1/1 | 1/1 | 0 | 0 | 0 |
| G Unsupported Template | **PASS:** ปฏิเสธ UNSUPPORTED_TEMPLATE | — | — | — | — | — |

Conditional Mapping 100% ข้างต้นไม่ได้หมายความว่าอ่านไทยได้ครบ 100% กลุ่ม B ยังมีค่า raw ที่เว้นวรรค/อักษรหรือ label อ่านไม่ครบ แม้ normalize whitespace เพื่อวิเคราะห์จะตรง 12/15; C ตรง 29/29 เมื่อวิเคราะห์แบบตัด whitespace แต่ Production เก็บ raw value ให้ review

Checkbox ที่มี expected 2 ค่าใน A/C/D ตรง 2/2 ต่อ fixture ครอบคลุม `[X]` text/scanned marker, military status และ AcroForm checkbox boolean ที่ระบุชื่อฟิลด์ชัดเจน AcroForm มีลำดับความสำคัญเหนือ text candidate ใน fixture D ทดสอบ ambiguous checked Yes+No ว่ามี warning และไม่สร้าง boolean

**PARTIAL:** ไม่ใช่ benchmark shape-only checkbox ภาพทุกรูป/ทุกเครื่องหมาย ตารางสแกนยังไม่มี reliable proficiency-cell mapping และแสดง `OCR_SKILL_GRID_REVIEW_REQUIRED` ภาพไม่ชัด/หมุน/ลายมือและ export หลายรุ่นยังไม่ยืนยัน Preview แสดงคำเตือน OCR/checkbox/skills และให้แก้เอง ค่าเริ่มต้น keep/skip

หลักฐาน: [Accuracy/CPU/RSS/NLP tests](FITM_STUDENT_PROFILE_PHASE5_NLP_RESULTS.json), [ผลก่อนแก้ label](evidence/student-profile-phase5/nlp-before-label-fix.json)

## 6. Browser F5 Results

**PASS ใน Edge Windows จริง:** ส่ง Win32 F5 key messages เฉพาะหนึ่ง Chrome widget ที่ PID ของ QA และ unique window title ตรงกัน ไม่ใช้ Global SendKeys/SendInput ไม่ส่งปุ่มไป Browser ของผู้ใช้ ตรวจ document epoch เปลี่ยน, `PerformanceNavigationTiming.type = reload`, form values ตรง PostgreSQL และ snapshot/revision ไม่มี write เพิ่ม

| กรณี | ผล |
| --- | --- |
| Save manual/PDF → F5 ในหน้าเดิม | PASS |
| เลือก Documents Tab → F5 | PASS; read-back ไม่ย้อนค่าที่บันทึก |
| Browser reload ปกติ | PASS |
| Hard Reload ข้าม cache (`Page.reload ignoreCache=true`) | PASS |
| Unsaved Draft → beforeunload → ยืนยัน Reload | PASS; Draft ในหน่วยความจำหายตามการยืนยัน ค่า DB ที่ saved ยังอยู่ |
| สอง Browser Tabs / stale update | PASS; HTTP 409, Draft อยู่, explicit review ก่อน retry, ไม่มี Lost Update |

Headless F5 shortcut รอบแรกไม่ทำให้ Browser navigate จึงเก็บเป็น NOT TESTED ในหลักฐานรอบนั้น แล้วทดสอบซ้ำกับหน้าต่าง Windows จริงจนผ่าน ไม่ใช้การเปิดหน้าใหม่แทน F5 การกดด้วยมือบน hardware keyboard โดยผู้ใช้ไม่ได้ทำ; F5 ข้างต้นเป็น native Windows message automation

## 7. Login End-to-End Results

**PASS:** หน้า `/login.html` จริง → กรอกอีเมล/รหัสผ่านสังเคราะห์ → POST `/api/auth/login` → server-issued JWT → redirect Student Dashboard → `/api/auth/me` → Profile APIs บนฐานแยก Student passwords ใช้ model hashing/comparePassword เดิม ไม่มี injection token ใน bootstrap ที่อ้างว่า Login UI ผ่าน

บัญชี Synthetic ที่สองใช้ Password Login API เดิมสำหรับ Ownership Tests; invalid bearer ได้ 401 ไม่แก้ Authentication เพื่อให้ผ่าน

**NOT TESTED:** Google OAuth provider round-trip, บัญชีนักศึกษาจริงและ production login หน้า Google button ที่ตรวจยังเป็นข้อความเตรียมเชื่อมต่อเดิม ไม่อ้างว่า OAuth ผ่าน และไม่เปลี่ยน workflow นี้

## 8. PostgreSQL Integration

**PASS:** Production routes/controllers/services/Sequelize และ local NLP บน schema clone ที่ไม่มี real rows Tests ไม่ใช่ mocked SQL Concurrency ใช้ row lock/transaction จริง Fault injection จำกัดเฉพาะ test hooks/HTTP middleware/ENOSPC จำลองใน Synthetic harness

Development `intern_system` ตรวจแบบ READ ONLY:

- 33 tables / 398 columns / 169 constraints / 83 indexes / 5 triggers; ledger 23
- 022–025 Executed; 019–021 Pending; migration executions ใน Phase 5 = 0
- SHA-256 schema `635c6050d74f89511d9698cd32e8a81423b1a50d652f88fe1cc8380686601a6f` ตรง Phase 2B.2/4
- ทั้ง 28 ตารางเดิม count/checksum ของ old-column projection ตรง private recovery manifest ก่อน Phase 2B.2
- ทั้ง 32 data tables ก่อน/หลังแต่ละ runner ไม่เปลี่ยน; students/profiles/files = 4/2/3; child ใหม่ทั้ง 4 ตาราง = 0
- Synthetic databases 10 ฐานจากรอบ QA เก็บไว้ ไม่ Drop; ทุก Role เป็น NOLOGIN/PASSWORD NULL หลังจบ

หลักฐาน: [Browser + PostgreSQL](FITM_STUDENT_PROFILE_PHASE5_BROWSER_RESULTS.json), [Development/roles/source preservation](FITM_STUDENT_PROFILE_PHASE5_DATABASE_VERIFICATION.json)

## 9. Security Assessment

| รายการ | ผลและขอบเขต |
| --- | --- |
| Authentication/Authorization | PASS สำหรับ Student Login, missing/invalid token; role variants มี Regression Tests เดิม |
| BOLA / Ownership | PASS: บัญชีที่สองอ่าน/แก้/ลบ child IDs และ document IDs ของเจ้าของไม่ได้; owner จาก JWT; spoof student_id ไม่เขียน |
| Mass assignment / ID fields | PASS: forbidden profile/owner/metadata/national_id_ciphertext fields 400 |
| Private files | PASS: owner authenticated blob/attachment/image; no public storage_path ใน DTO; foreign download 404; no-store; bytes/hash ตรง |
| Path/MIME/File limits | PASS ภายใน cases ที่ทดสอบ: UUID private paths, name binding/traversal attempts, MIME/extension, multipart duplication, corrupted/encrypted/active/oversize/pages |
| Sensitive Profile logs | PASS หลังแก้: legacy load/photo/academic log เฉพาะ HTTP status; actual browser academic409 ไม่ log private snapshot; backend Profile handlers ไม่ echo/log ORM diagnostics |
| Temporary/staged cleanup | PASS: worker temp directories หายหลังงาน; SQL rollback/ENOSPC ไม่เหลือ staged bytes ใหม่; referenced bytes หลัง COMMIT ไม่ถูกลบ |
| Resource admission | PASS: 2 actual OCR jobs พร้อมกัน; งานที่สาม 503 PDF_PROCESSOR_BUSY |
| Timeout cleanup | PASS unit: kill process group/drain/parent temp cleanup; NOT TESTED actual 45-second timeout ด้วย hostile PDF จริง |
| NLP deployment isolation | PARTIAL: internal processor ไม่มี Student JWT; ใช้ผ่าน authenticated Backend ใน Profile flow แต่ไม่ได้เปลี่ยน Docker/network exposure หรือรับรอง production firewall |

ไม่พบ Critical/High ที่ค้างใน core workflow ที่ยืนยันแล้ว นี่ไม่ใช่ penetration test ทั้งระบบ/antivirus certification ไม่อ้างว่ามี protection ต่อ PDF malware ทุกชนิด

## 10. Data Integrity / Concurrency

**PASS:** Dirty Partial Update, null vs omitted, profile_revision/If-Match, 428 ก่อนรับ commit upload, 409 stale revision, shared aggregate สำหรับ `/me`, `/student-info`, photo/documents และ child records, safe integer rejection, transaction rollback, owner lock, consistent read/status snapshot

ทดสอบ real SQL failure หลัง scalar/child writes แล้วไม่มีข้อมูล/version/revision ค้าง; ENOSPC ก่อน persist ไม่เปลี่ยน DB; actual COMMIT + response failure กู้ได้โดยไม่ duplicate; concurrent same/different receipts มีหนึ่ง writer และ conflict/idempotent replay ตาม contract

Legacy health/family/parent/related_skills และค่าที่ไม่ส่งรักษาไว้ อ่านกลับหลัง save/F5 ตรง ค่า Draft ระหว่าง API refresh/review ไม่ถูก rebase หรือทิ้งโดยอัตโนมัติ ไม่มี Full Object Overwrite

**API Contract ก่อน/หลัง Phase 5 เหมือนเดิม:** ไม่เพิ่ม endpoint/field/schema/policy Authentication และ request/response formats ของ Phase 3A/4 คงเดิม แก้เฉพาะ startup readiness, logging และ parser label/section matching

## 11. UX/UI Responsive

**PASS สำหรับ geometry/keyboard ที่ทดสอบ:** Edge จริงที่ 1440/1366/768/390px; 5 horizontal tabs/default/ARIA/Arrow navigation, dynamic forms/education/training/skill cards, document forms, modal confirmation และ PDF Preview ไม่มี page horizontal overflow ไม่มี Runtime.exceptionThrown

เก็บ 24 screenshots ข้อมูลสังเคราะห์ รอ toast เดิมจบก่อนเก็บ geometry ภาพเพื่อไม่ให้ notification stack บังฟอร์ม: [Desktop](evidence/student-profile-phase5/1440-personal.png), [Tablet](evidence/student-profile-phase5/768-education.png), [Mobile preview](evidence/student-profile-phase5/390-pdf-preview.png)

**NOT TESTED:** มือถือจริง/Touch จริง, Safari/Firefox, screen-reader audit และ exhaustive focus/contrast/WCAG certification การทดสอบ 390px เป็น Desktop Browser Emulation เท่านั้น Shared Feedback Source เดิมไม่ได้เปลี่ยน

## 12. Performance Metrics

วัดจริงกับ Synthetic PDF 4 หน้า ไม่คาดเดาและไม่ทำ load test บน Development Database ตัวเลขเป็นการวัดตัวอย่างหนึ่งรอบ ไม่มี p95/p99 หรือ SLA

| งาน | Wall seconds | CPU seconds ของ worker + descendants | Peak descendant RSS |
| --- | ---: | ---: | ---: |
| A Text/AcroForm | 0.447 | 0.316 | 48,952 KiB |
| B OCR ไทย | 3.883 | 7.610 | 134,168 KiB |
| C OCR ไทย/อังกฤษ | 3.511 | 7.352 | 134,512 KiB |
| E Text skill table | 0.338 | 0.252 | 49,404 KiB |

CPU/RSS จาก Linux `resource.getrusage(RUSAGE_CHILDREN)` ของ production worker ที่รันจริง; RSS เป็นค่าสูงสุดของ descendant หนึ่ง process ไม่ใช่ memory รวมทุก process

PDF Browser E2E ยืนยัน import ในรอบสุดท้าย **1.116 วินาที** ตั้งแต่ QA เริ่มเลือก/Extract จน commit/read-back/download verification รวม automated choice/confirmation ไม่ใช่เวลามนุษย์อ่าน Preview

Capacity probe แยก 2 OCR jobs + 1 admission probe: ทั้งสองงาน 200/ocr, งานที่สาม 503; wall 3.343s; CPU container 12.385s หรือ 371.14% เมื่อเทียบหนึ่ง core; memory baseline 728,395,776 bytes และ sampled peak 1,071,394,816 bytes ที่ interval 50ms (67 samples) เป็นทั้ง NLP container รวม application/cache/OCR ไม่ใช่ incremental OCR RAM อย่างเดียว

**PASS:** รองรับ 2 concurrent jobs ที่ยืนยันใน environment นี้ **NOT TESTED:** concurrency มากกว่านี้, long-running saturation, exact instantaneous combined peak, throughput ระยะยาวหรือ production hardware ไม่มีการเพิ่ม capacity หรือ architecture

หลักฐาน: [Worker measurements](FITM_STUDENT_PROFILE_PHASE5_NLP_RESULTS.json), [Bounded HTTP capacity](FITM_STUDENT_PROFILE_PHASE5_CAPACITY_RESULTS.json)

## 13. Regression Tests

Existing Backend/Frontend/NLP suites ผ่าน ตรวจ Source SHA เดิม 541 รายการ: เปลี่ยนเฉพาะ 4 ไฟล์ตามข้อ 18; อีก 537 ไฟล์เหมือนเดิม รวม Sidebar/Logs/Calendar/Approval/OAuth/role dashboards/Feedback และ migration sources

| ระบบเดิม | ผล |
| --- | --- |
| Sidebar/โครงการสหกิจ/Internship Logs | Source unchanged; existing tests PASS; ไม่เขียน/เปลี่ยนเมนู |
| Student Calendar | PASS: `panel-activities` ยัง hidden |
| Resume Upload/API client | Existing contract/regressions PASS; NOT TESTED full browser Resume extraction/write E2E ในรอบนี้ |
| Existing Student Documents | Profile private documents E2E PASS; ไม่แก้ file/account storage ซ้ำ |
| คำร้อง/Staff Calendar/Teacher/Head/Mentor | Source unchanged; existing unit/VM tests PASS; NOT TESTED real full role workflows/DB-writing opt-in suites ที่ข้าม |
| Google OAuth | Source unchanged; provider Login E2E NOT TESTED |
| Shared Feedback | Source unchanged; Profile confirmation/toast interaction PASS |

Skipped DB/migration tests ปิดตามข้อห้าม ไม่ถือว่าชุดทั่วไปผ่านแล้วจึงพิสูจน์ทุก feature DB Integration; Profile integration ของ Phase 5 แยกรันจริง 44 cases

## 14. Bugs ที่พบและแก้ไข

| Bug | Reproduction / Expected / Actual / Root cause / Fix |
| --- | --- |
| P5-01 Thai template/context labels | Scan Thai fixture → expected preview candidates; actual UNSUPPORTED_TEMPLATE เพราะ OCR เว้นวรรคระหว่างอักษร แต่ template anchors/context/education levels ใช้ regex ตรงคำ → reuse thai_pattern เฉพาะ labels; raw values ไม่ถูกแก้; regression + actual OCR measurement ผ่าน |
| P5-02 ID alias / education heading | Spaced Thai Student ID ไม่ matchตรงขอบ optional regex group; qualification ที่มีคำ ปริญญาตรีถูกนับเป็น section ใหม่และทำให้ record ขาด fields → เพิ่ม label whitespace boundary และแยก field labels ออกจาก level headings; actual worker + regression ผ่าน |
| P5-03 Private console diagnostic | 409 Error มี `.data` aggregate snapshot; legacy Profile console.error ส่ง Error ทั้งก้อน → log เฉพาะ validated HTTP status; getter guard regression และ actual Browser409 ตรวจได้เฉพาะ `{status:409}` |
| P5-04 Legacy academic startup | First auth read → controlsยังว่าง → captureก่อน Profile GET คิดว่าเป็น Dirty Draft → studentInfoRevision ไม่ถูกตั้ง, submitถูกบล็อกก่อน HTTP → ไม่ captureก่อน first aggregate loaded, disable initial editable academic controlsจนได้ snapshot/revision; existing draft/late typing tests + real academic409 ผ่าน |

ไม่เปลี่ยน Schema/Auth/Approval เพื่อแก้ bug ข้างต้น QA issues แก้แยก: รอ Login module พร้อม, Edge guest target limitation, nested test context deadlock, เปิด Photo Modal ก่อน click, เปิด Profile panelหลัง F5, เจาะ PID/titleหนึ่งหน้าต่าง และปรับ VM fixtures ให้เรียก helperจริง ผล FAIL ระหว่างพัฒนาเก็บใน `evidence/student-profile-phase5/attempt-*.json` และ check failure artifact ไม่ลบประวัติ ไม่ใช่ FAIL ค้างรอบสุดท้าย

## 15. Remaining Issues

- OCR Thai ยังอ่านค่าดิบ/label ไม่ครบทุกช่อง ตัวเลข accuracy จำกัดเฉพาะ fixtures ที่กำหนด ไม่ใช่ production corpus
- ตารางสแกน/proficiency และ shape-only checkbox ต้อง manual review/entry; filled official export หลายรุ่นยังไม่ยืนยัน ต้นแบบ masked review ยังมี identity warning/candidate ที่ไม่ควรใช้อัตโนมัติ
- NLP deployment network isolation, infrastructure log/storage permission audit และ formal document acceptance ยังไม่ยืนยันรอบนี้
- Unknown commit outcome ยังใช้ retention เพื่อไม่ลบ durable bytes; automatic reconciliation/purge รอ policy เดิม ไม่มีการเพิ่มระบบใหม่
- ไม่มี autosave/persistent unsaved draft หลังยืนยัน Hard Reload; เป็นพฤติกรรมที่แสดงให้ผู้ใช้ทราบแล้ว

## 16. BLOCKED Policy Items

เลขบัตรประชาชน plaintext/encryption/key rotation/masking/retention, declaration/acknowledgement, digital signature/frozen snapshot, retention/withdrawal rules และ Required/Ready-to-Apply/เอกสารที่ยอมรับตามนโยบาย ต้องอนุมัติแยก ฟิลด์/Workflow เหล่านี้ไม่ได้ถูกเปิด ไม่มี Schema/Migration ใหม่และไม่มี approval duplication

## 17. NOT TESTED Items

Production deployment/DB, real student writes/login/documents, Google OAuth provider, physical mobile/touch/browserอื่น/screen reader, role workflows E2E ที่แยกตามข้อ 13, exhaustive UI failure matrix, hand-filled/rotated/low-resolution PDF corpus, malware/antivirus/fuzzing, actual timeout/resource-exhaustion hostile input, power loss/whole DB-storage outage, infrastructure logging/privacy audit, long-duration load/SLA และการกด F5 ด้วยมือบน hardware keyboard

ไม่ใช้ mock rollback เป็นหลักฐาน PostgreSQL; SQL rollback/concurrency ของ Profile ในรายงานนี้รันจริง Fault injection กล่าวไว้เฉพาะขอบเขตที่ทดสอบ ไม่อ้างว่าจำลอง outage ทุกกรณี

## 18. รายชื่อไฟล์ที่แก้ไข

ไฟล์เดิมเทียบก่อนเริ่ม Phase 5:

- `frontend/src/pages/student_coop.js` — เฉพาะ safe Profile diagnostics / first academic snapshot readiness
- `frontend/test/studentProfileIntegrity.test.js` — VM harness โหลด production diagnostic helper
- `frontend/test/studentProfileAggregateCompatibility.test.js` — VM photo harness โหลด helperจริง
- `nlp-service/app/services/profile_pdf.py` — Thai label/template/context/ID และ education heading fix

Source/QA ใหม่:

- `backend/scripts/runStudentProfilePhase5Integration.js`
- `backend/test/studentProfilePhase5Browser.test.js`
- `backend/scripts/runStudentProfilePhase5Nlp.js`
- `backend/scripts/runStudentProfilePhase5Capacity.js`
- `backend/scripts/runStudentProfilePhase5Checks.js`
- `backend/scripts/verifyStudentProfilePhase5.js`
- `frontend/test/studentProfilePhase5Security.test.js`
- `nlp-service/tests/profile_phase5_fixtures.py`
- `nlp-service/tests/test_profile_phase5.py`

รายงาน/หลักฐานใหม่: รายงานนี้, `FITM_STUDENT_PROFILE_PHASE5_BROWSER_RESULTS.json`, `...CHECK_RESULTS.json`, `...NLP_RESULTS.json`, `...CAPACITY_RESULTS.json`, `...DATABASE_VERIFICATION.json`, `...TEMPLATE_VERIFICATION.json`, `...SYNTAX_RESULTS.json` และโฟลเดอร์ `evidence/student-profile-phase5/` (baseline, screenshots, prior attempts)

ไม่มี Backend business API contract/schema/model/migration source ใหม่ใน Phase นี้ Source และผลเก่าของ Phase 1–4 คงไว้ ไม่ Commit/Push

## 19. Backend / Frontend / NLP Test Counts

| ชุดสุดท้าย | PASS | FAIL | SKIP | CANCEL | สถานะ |
| --- | ---: | ---: | ---: | ---: | --- |
| Backend node --test | 254 | 0 | 22 | 0 | PASS |
| Frontend node --test test/*.test.js | 312 | 0 | 2 | 0 | PASS |
| Existing NLP + profile pytest | 30 | 0 | 0 | 0 | PASS |
| Edge / API / real PostgreSQL subcases | 44 | 0 | 0 | 0 | PASS |
| HTTP NLP bounded capacity probe | 1 | 0 | 0 | 0 | PASS; แยกจาก suitesข้างต้น |
| Frontend build | — | 0 | — | — | PASS; Vite 129 modules, Student 171.27 kB / gzip 42.62 kB |
| Syntax / git diff --check | — | 0 | — | — | PASS; JavaScript 10 / Python 3 |

Browser case counts รวม named checks ที่ nested แล้ว ไม่นับ parent Node suite เป็น case เพิ่ม Backend 22 SKIP เป็น opt-in DB/browser/migration suites; Phase 5 Browser case ซึ่ง skip ในชุดทั่วไปถูกแยกรันจริงแล้ว Frontend 2 SKIP เป็น acceptance DB/browser feature เดิม Regression ที่เพิ่มเป็น Frontend 3 และ NLP 5 tests รวมอยู่ใน counts ไม่บวกซ้ำ

หลักฐาน: [Tests/Build](FITM_STUDENT_PROFILE_PHASE5_CHECK_RESULTS.json), [NLP](FITM_STUDENT_PROFILE_PHASE5_NLP_RESULTS.json), [Browser](FITM_STUDENT_PROFILE_PHASE5_BROWSER_RESULTS.json), [Syntax](FITM_STUDENT_PROFILE_PHASE5_SYNTAX_RESULTS.json)

## 20. Final Acceptance Recommendation

**ACCEPTED WITH LIMITATIONS** — รับขอบเขต Manual Entry, Text/AcroForm Import ที่ทดสอบ, editable preview, PostgreSQL/Private Storage persistence, F5/Hard Reload, aggregate integrity และ ownership ที่ยืนยันบน Test environment ได้ OCR สแกนเป็น Limited Support; policy items เป็น BLOCKED และรายการ NOT TESTED ตามข้อ 17 ต้องไม่ถูกอ้างว่าผ่าน

ไม่มี FAIL ค้างในชุดสุดท้ายหรือ Critical/High Bug ที่พบในขอบเขตหลักซึ่งทดสอบแล้ว ไม่ประกาศ Production Ready ไม่มี Migration/Schema/Auth/Approval/Sidebar/Logs/Calendar/Commit/Push เพิ่ม จบ Phase 5 และหยุดรอคำสั่ง
