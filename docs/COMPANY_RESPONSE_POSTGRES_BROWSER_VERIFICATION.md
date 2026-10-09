# PostgreSQL / Real Browser Verification — Company Response → Placement Letter

วันที่ 2026-10-08, Asia/Bangkok. **VERIFIED บน disposable PostgreSQL และ real headless Chrome; พร้อมสำหรับพัฒนาระยะถัดไปของ development workflow** ไม่ใช่การอนุมัติ deploy หรือ official PDF

## Environment และ isolation

Node v24.11.1 / npm 11.6.2, dependencies เดิมพร้อมใช้งาน Docker CLI/Compose พร้อมแต่ engine เริ่มต้นหยุดอยู่ จึงเริ่ม Docker Desktop ที่ติดตั้งอยู่โดยไม่รัน Compose up/reset/migrate Docker Engine 29.7.2 และ cached PostgreSQL 16 image ใช้งานได้

ใช้ฐาน PostgreSQL จริงสองแบบ:

- runner เดิม `runTeacherAdvisorAcceptance.ps1`: network แบบ internal, labeled containers, tmpfs PostgreSQL, source mount read-only และชื่อฐาน/markers สำหรับ disposable tests เท่านั้น
- runner browser ใหม่: PostgreSQL tmpfs container ที่มี ownership label, bind port เฉพาะ 127.0.0.1 แบบสุ่ม, DB `fitm_staff_browser_test`, marker `fitm.a017_disposable=on` และ password/JWT/fixture credentials ที่สร้างใหม่ทุกครั้ง ไม่มี credential hardcode

Browser runner ตรวจ URL host/database/port, query actual database+marker และตรวจ connection ของ Sequelize registry ก่อนสร้าง fixtures ใช้ production Express app, Vite source และ Chrome **154.0.8037.98** ผ่าน CDP พร้อม exclusive temporary profile ไม่มีการใช้ profile หรือ session เดิมของผู้ใช้

Windows script execution ถูกปิดไว้ จึงใช้ `-ExecutionPolicy Bypass` เฉพาะ process ที่รัน script ที่ตรวจแล้ว ไม่เปลี่ยน execution policy ถาวร

**ไม่ได้ connect เพื่อทดสอบ destructive กับฐาน Local/staging/production และไม่ได้แก้ข้อมูลธุรกิจหรือ student_files ที่มีอยู่** Migrations ทำงานเฉพาะฐาน disposable; ไม่มี migration ใดถูก execute บนฐานเดิม Git working tree เดิมถูกเก็บไว้ ไม่ commit/push/PR/deploy

หลังจบ tests ตรวจ `docker ps -a` และ network list ตาม `fitm.test-run` label แล้วว่างทั้งหมด โปรไฟล์ Chrome ที่สร้างสำหรับรอบทดสอบถูกลบครบ API/Vite/browser processes ที่ runner สร้างถูกหยุด ผล screenshot และ generated HTML ของ fixtures อยู่ใน ignored logs

## Migration 017 — VERIFIED

- Prerequisites 001–016 รวม 007a ใช้งานร่วมกันได้; ledger หลัง 017 มี 18 entries / 0 pending ในฐาน disposable
- 017 UP → DOWN บนฐานว่าง → reapply ผ่าน; injected partial DDL failure rollback โดยไม่ทิ้ง table ครึ่งหนึ่ง
- ตรวจสองตารางใหม่, FK ต่อ request/Staff/document, FK คู่ generated revision และ index UNIQUE ของ request กับ history version
- Direct SQL ปฏิเสธ duplicate response/history (23505), invalid status/version/history action (23514), invalid Staff/revision FK (23503), Cooperation Letter ของคนละ request และ revision ที่ไม่ generated
- History UPDATE/DELETE ถูก trigger ปฏิเสธจริง; rollback หลังมีหลักฐานถูกปฏิเสธเพื่อเก็บ history
- Sequelize associations ของ response → request/Staff/Cooperation Letter และ history read-back ผ่านจริง
- Cooperation Letter queue/draft/edit/generate/regenerate/preview/download/history และ Student approved read-back หลัง 017 ผ่าน

## Company Response — VERIFIED

Acceptance และ rejection บันทึกผ่าน actual authentication/API/UI ลง PostgreSQL จริง Staff actor มาจาก verified context Body identity spoof ถูกปฏิเสธ

ตรวจ anonymous/Student/Teacher/Head/revoked Staff, missing request, unapproved request, missing Cooperation Letter, invalid/missing status/date และอนาคต, duplicate/concurrent initial submission, stale/concurrent correction, immutable history, audit failure rollback และ Student owner-only read-back

Concurrent corrections เหลือหนึ่ง current version และหนึ่ง audit event ของ authenticated winner; การแก้ accepted → rejected ก่อนมี placement ปิด eligibility โดยเก็บ acceptance เดิมใน history

## Placement Letter — VERIFIED

Approved request + generated Cooperation Letter + persisted acceptance สร้าง Placement draft/generate ได้ ขาด response/rejected/unapproved/invalid actor ถูกปฏิเสธด้วย business errors ผ่าน direct API

ตรวจ draft/edit/generate/regenerate, frozen Student/company/approval/acceptance evidence, actual Staff actor, current/historical previews/download และ version/revision history การเปลี่ยน source หลังสร้างไม่ทับ snapshot

Concurrent create/generate commit ได้หนึ่ง operation อีกรายการ 409; SQL race ระหว่าง company revocation กับ placement draft เหลือเพียงสถานะสอดคล้อง: rejected + ไม่มี placement หรือ accepted + มี placement โดย correction ถูก 409

**มี Placement draft แล้วแก้ response ไม่ได้** ทดสอบผ่าน browser runner ด้วย direct API ก่อน generation และผ่าน integration อีกครั้งเมื่อ generated ไม่ยกเลิกเอกสารหรือเปลี่ยน accepted response เงียบ ๆ

## Real Browser Acceptance — VERIFIED

Real Chrome ใช้ API และ SQL fixtures จริง ไม่มี DOM model แทน browser ผล **12 PASS / 0 FAIL / 0 SKIP** (parent 1 + 11 scenarios):

1. Password login, Staff identity และ approved queue
2. Cooperation draft/edit/generate และ SQL read-back
3. Invalid response date → backend error อยู่ใน shared modal ไม่มี response ถูกบันทึก
4. Acceptance → corrected rejection → corrected acceptance; persisted versions/history และ backend eligibility
5. Placement draft locks response; edit/generate และ frozen acceptance evidence
6. Real iframe preview, actual downloaded HTML เทียบ SHA256 กับ PostgreSQL และ native `beforeprint` event จากปุ่ม print
7. Regeneration หลังเปลี่ยน source เก็บ snapshot/old revision
8. Company rejection ผ่าน UI และ direct Placement API ถูกบล็อก
9. Desktop 1280×900 / mobile 390×844; ไม่มี horizontal overflow และบันทึก screenshots
10. Loading/disabled feedback ผ่าน latency จริง; offline failure message และ refresh recovery
11. ไม่มี unexpected runtime/console.error/API errors; named associations, request approved status และสอง advisor IDs คงเดิม

HTTP 400 จาก invalid-date test และ network errors จาก deliberate offline test เป็นผลที่ตั้งใจทดสอบ ไม่ถือเป็น unexpected console error Screenshot capture ปิด transient toasts ผ่านปุ่มปิดจริงก่อนเก็บภาพ

Print acceptance ยืนยันการเรียก native browser print event ใน headless Chrome **ไม่ได้ยืนยัน physical printer, interactive desktop print dialog หรือ official document layout** ทุก artifact ยังเป็น development HTML ไม่ได้เพิ่ม production PDF generator

## Regression และ coverage comparison

| Check | PASS | FAIL | SKIP |
| --- | ---: | ---: | ---: |
| Backend full integration/regression run | 268 | 0 | 0 |
| PostgreSQL targeted final document suite | 25 | 0 | 0 |
| Frontend full suite รวม disposable SQL bridge | 175 | 0 | 1 |
| Real Chrome Staff acceptance | 12 | 0 | 0 |
| JavaScript syntax | 182 | 0 | 0 |

Frontend build: **13 pages / 105 modules PASS**; PowerShell runner parse: **0 errors**; `git diff --check`: **PASS**

Full backend run เก็บ Staff subtests 22 รายการ ณ เวลาที่ worker อ่านไฟล์ ระหว่าง validation เพิ่มอีกสอง SQL race/correction tests จากนั้นรัน targeted final suite ใหม่ครบ 24 subtests + parent = 25 PASS ดังนั้นทุกกรณีในไฟล์ล่าสุดได้รับการทดสอบแล้ว **ไม่บวก 268+25 เป็นยอด unique tests** เพราะส่วนใหญ่ซ้ำกัน

เทียบ baseline ครั้งก่อน 127 PASS/13 SKIP → backend full 268 PASS/0 SKIP เพราะเปิด PostgreSQL integration และ nested cases จริง Frontend 165 PASS/2 SKIP → 175 PASS/1 SKIP เพราะเปิด SQL bridge SKIP ที่เหลือเป็น `Student Co-op prerequisite real browser runtime checks` เดิม ซึ่งไม่ใช่ Staff Chrome acceptance ที่รันแยกครั้งนี้ ไม่มี coverage ลดโดยไม่ทราบเหตุผล Syntax 181 → 182 เพราะเพิ่ม JS browser runner หนึ่งไฟล์

หลักฐาน:

- `logs/company-response-integration-20261008.log` — full backend/frontend + migration ledger
- `logs/company-response-postgresql-targeted-20261008.log` — final SQL suite
- `logs/company-response-real-browser-20261008.log` — real Chrome version/scenarios/results
- `logs/company-response-verified-build-20261008.log` — build
- `logs/company-response-browser-artifacts-20261008/staff-desktop.png`, `staff-mobile.png` และ downloaded Placement fixture HTML

## Files และ issues

สร้าง:

- `backend/scripts/runDisposableStaffBrowserAcceptance.js`
- `backend/test/runStaffBrowserAcceptance.ps1`
- เอกสารนี้

แก้ไข:

- `backend/test/staffDocuments.database.test.js` — เพิ่ม direct constraint checks และสอง SQL concurrency scenarios
- `HANDOFF_fitm-intern.md`
- `README.md`
- `docs/COMPANY_RESPONSE_PLACEMENT_ACCEPTANCE.md` — เชื่อมผล verification ปัจจุบัน โดยเก็บ baseline เก่าไว้

ไม่พบบั๊กใน Company Response/Placement business implementation ไม่มีการแก้ production code/UI/business rules พบและแก้การส่ง Docker port-format quotes ของ runner ใหม่บน Windows PowerShell โดยเปลี่ยนเป็น JSON metadata parsing

## Readiness / remaining boundary

**พร้อมสำหรับ development phase ถัดไป** ไม่มี blocker ของ disposable SQL หรือ Staff browser acceptance ในรอบนี้ Production readiness และ official PDF เป็นคนละขอบเขต ยังต้อง approved university templates/signatures/layout และ authorization สำหรับ rollout 017 ไปฐานที่มีอยู่ ไม่ได้ provision บัญชีจริงหรือยืนยันข้อมูล live Local/staging/production

รันทวนด้วย Docker และ Chrome ที่มีอยู่:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/runTeacherAdvisorAcceptance.ps1 -FullBackend
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/runStaffBrowserAcceptance.ps1
```

คำสั่งทั้งสองใช้ disposable test databases เท่านั้น ไม่ใช่คำสั่ง rollout และไม่รันโดยอัตโนมัติเมื่อ app เริ่มทำงาน
