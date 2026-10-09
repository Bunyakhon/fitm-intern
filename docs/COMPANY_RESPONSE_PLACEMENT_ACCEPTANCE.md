# Company Response → Placement Letter

**Verification update (2026-10-08): PostgreSQL และ real Chrome ผ่านแล้ว** อ่าน [ผล verification ล่าสุด](./COMPANY_RESPONSE_POSTGRES_BROWSER_VERIFICATION.md) สำหรับ counts, migration constraints/concurrency และ browser evidence ข้อมูล NOT RUN/blocked ด้านล่างเป็น baseline ของ implementation ก่อนเริ่ม engine; ไม่ใช่สถานะ verification ล่าสุด Migration 017 ทำงานเฉพาะ disposable databases ไม่ได้รันกับฐานที่มีอยู่

วันที่ 2026-10-08 (Asia/Bangkok) — พัฒนา backend/frontend แล้ว แต่ยังไม่ยืนยัน PostgreSQL integration และ Real Browser Acceptance

## สภาพแวดล้อมและขอบเขต

อ่าน HANDOFF, README, Docker Compose, package ของ backend/frontend, migrations และ models ที่เกี่ยวข้อง, Staff JWT/live guards, Coop Request approval, Cooperation Letter service/template/routes, Staff UI/shared feedback และ tests เดิมก่อนแก้ไข ใช้ Express/Sequelize/PostgreSQL และ Vite multipage เดิม ไม่เปลี่ยน approval workflow หรือ sidebar

Docker Desktop Linux engine ไม่พร้อมใช้งาน และการเชื่อมต่อ PostgreSQL ผ่าน backend configuration ถูกปฏิเสธ จึง **ยืนยันสถานะฐานข้อมูลปัจจุบันไม่ได้** ตัวเลข 17 migrations / 23 tables / 23 Teachers / 1 Head ในเอกสารเดิมเป็นข้อมูลย้อนหลัง ไม่ใช่ผลตรวจครั้งนี้

**ไม่ได้แก้ไขฐานข้อมูลที่มีอยู่ ไม่ได้ execute migration ใด ๆ** ไม่สร้างบัญชีจริง ไม่แตะ student_files/fingerprint, ไม่ commit/push/PR/deploy

## Persistence และกฎธุรกิจ

- เพิ่ม `017_add_company_responses.js` เป็น migration ถัดจาก 016; สร้าง `company_responses` และ `company_response_history` เท่านั้น พร้อม FK RESTRICT, request uniqueness, revision/version uniqueness, status/version/note constraints
- Response มี request, accepted/rejected, responded_at, note, verified Staff actor, version และ timestamps; อ้างอิง generated Cooperation Letter revision ด้วย FK คู่ document/version และ trigger ตรวจว่าเป็น Cooperation Letter ของ request เดียวกัน
- History เป็น append-only; PostgreSQL trigger ปฏิเสธ UPDATE/DELETE และ rollback migration ปฏิเสธเมื่อมีหลักฐาน ไม่มี endpoint ลบประวัติ
- เฉพาะ Staff JWT ที่ผ่าน live active-Staff guard เท่านั้นที่บันทึกได้ ไม่รับ staff_id/actor/request/status approval จาก body
- ทุก mutation ใช้ transaction, recheck Staff, lock Student → request → cooperation → response/placement และ optimistic version; response กับ audit ต้อง commit พร้อมกัน
- ต้องมีคำร้องที่ผ่าน Class Advisor/Head และ Cooperation Letter ที่ generated ก่อนบันทึก response วันที่ต้องถูกต้องและไม่อยู่ในอนาคต
- POST บันทึกครั้งแรก; duplicate คืน 409 ส่วน PUT แก้ไขต้องส่ง version และ correction_reason เก็บค่าทุกฉบับใน history; stale/no-change คืน 409
- เปลี่ยน accepted → rejected ได้ก่อนมี Placement Letter แล้ว eligibility จะเป็น false **เมื่อมี Placement Letter แม้เป็น draft จะห้ามแก้ไข response ทุกกรณี** ด้วย `COMPANY_RESPONSE_LOCKED_BY_PLACEMENT` ไม่ยกเลิกหรือเปลี่ยนเอกสารเงียบ ๆ
- Placement create/edit/generate/regenerate ตรวจ approval, Cooperation Letter ที่ generated และ persisted accepted response บน backend ทุกครั้ง ไม่ใช้ frontend flags เป็นสิทธิ์
- ก่อนติดตั้ง 017 queue/detail และ Cooperation Letter เดิมยังใช้ได้ ส่วน response/placement คืน `COMPANY_RESPONSE_SCHEMA_REQUIRED` และ UI ปิดการบันทึก
- ไม่เปลี่ยน request status/document_issued_at หรือ advisor_teacher_id/coop_advisor_teacher_id; Staff ไม่เป็น approval stage และ Head authorization ยังคงใช้ live is_department_head

## Placement Letter และ Staff UI

ใช้ `coop_documents`/`coop_document_revisions` และ development HTML renderer เดิม มี draft, edit, generate/regenerate, preview/download/print, version และ Staff audit Snapshot เก็บข้อมูลจาก Cooperation Letter ที่ freeze แล้ว พร้อม accepted response ID/version/actor/date และ Cooperation Letter ID/version/hash; regeneration ไม่อ่านข้อมูลต้นทางมาทับ snapshot

หน้าจัดการเอกสารเดิมแสดง response status ใน queue, form เลือกตอบรับ/ปฏิเสธ วันที่ หมายเหตุ เหตุผลแก้ไข รายละเอียดผู้บันทึกและ history มี document selector สำหรับจัดการทั้งสองชนิด และปุ่มเปิด preview ของ revision เดิม ใช้ shared modal/toast/loading ป้องกันกดซ้ำ และ reload backend หลังบันทึก/409

**HTML เหล่านี้เป็น development previews ไม่ใช่เอกสารราชการหรือ official PDF** ไม่ได้เพิ่มรูปแบบหนังสือมหาวิทยาลัยที่ไม่ได้รับการยืนยัน ไม่มีการเปลี่ยนคำร้องเป็น document_issued จากการสร้างตัวอย่าง

## API

เส้นทาง Staff ต่อไปนี้อยู่ใต้ `/api/staff/document-requests/:id` และผ่าน guards เดิม:

| Method / path | พฤติกรรม |
| --- | --- |
| GET `/company-response` | response และ history พร้อม safe Staff name |
| POST `/company-response` | บันทึก accepted/rejected ครั้งแรก |
| PUT `/company-response` | แก้ไขพร้อม version/correction_reason |
| GET `/company-response/history` | immutable history ตาม version |
| GET `/placement-eligibility` | persisted eligibility/code/message |
| GET `/` | detail เพิ่ม response/history/readiness/eligibility |
| POST `/documents/placement` | สร้างร่างเมื่อครบ prerequisites |
| PUT `/documents/placement` | แก้ไขร่างตาม version |
| POST `/documents/placement/generate` | generate หรือ regenerate |
| GET `/documents/placement/preview` | authenticated HTML; รองรับ `?version=N` |
| GET `/documents/placement/download` | authenticated attachment; รองรับ `?version=N` |

`GET /api/staff/document-requests` เพิ่ม safe response summary และ `GET /api/coop-requests/:id/company-response` ให้นักศึกษาอ่านเฉพาะคำร้องของตัวเอง ไม่มี response write endpoint สำหรับนักศึกษา

ตัวอย่าง body ครั้งแรก: `{ "status": "accepted", "responded_at": "2026-10-08", "note": "ได้รับหนังสือตอบรับ" }` การแก้ไขเพิ่ม `version` และ `correction_reason` โดยไม่ส่ง Staff identity

## ผลทดสอบและข้อจำกัด

ผลสุดท้าย:

| Check | PASS | FAIL | SKIP |
| --- | ---: | ---: | ---: |
| Backend suite | 127 | 0 | 13 |
| Frontend suite | 165 | 0 | 2 |
| Targeted backend ใหม่ (รวมอยู่ใน suite) | 19 | 0 | 0 |
| Targeted frontend ใหม่ (รวมอยู่ใน suite) | 9 | 0 | 0 |
| JavaScript syntax (source/scripts/tests) | 181 | 0 | 0 |

Frontend build: **13 pages / 105 modules PASS**; `git diff --check`: **PASS**. Backend SKIP เป็น tests ที่ต้อง opt-in ฐานทดสอบ ส่วน Frontend SKIP คือ browser runtime และ disposable PostgreSQL acceptance ไม่อ้างผล integration ของ baseline เก่าเป็นผลครั้งนี้

- Backend suite: tests แบบ unit/HTTP ที่ใช้ model doubles รันได้; PostgreSQL tests opt-in ถูก skip เพราะไม่มี disposable database
- เพิ่ม targeted backend tests ของ response/placement รวมถึง HTTP JWT guards, actors, duplicate/concurrency, audit rollback, corrections, snapshot/version และความเข้ากันได้เมื่อ 017 ยัง pending
- เพิ่ม Staff frontend DOM tests สำหรับ response/correction/history, placement lifecycle, server eligibility, modal/errors/loading/read-back — **DOM simulation ไม่ใช่ real browser**
- เพิ่ม PostgreSQL integration cases ใน `staffDocuments.database.test.js` ครอบคลุม 017 up/down/atomic DDL, authenticated acceptance/correction, immutable history, placement snapshot/version/concurrency; **ยังไม่ได้รันจริง**
- Frontend production build และ `git diff --check` รันได้; logs อยู่ใน `logs/company-response-*-20261008.log`
- Real Browser Acceptance: **NOT RUN** ไม่มี browser tool ที่เรียกใช้ได้ใน session

เมื่อ Docker พร้อม ใช้ runner เดิมกับฐาน disposable ที่มี guard และ tmpfs เท่านั้น:

```powershell
powershell -NoProfile -File backend/test/runTeacherAdvisorAcceptance.ps1 -FullBackend
```

Runner นี้ต้องมี backend image พร้อม dependencies; ไม่ใช้ persistent Local เป็น integration target ส่วนการ rollout 017 ไปฐานที่มีอยู่ต้องได้รับ authorization แยกตามคำสั่งผู้ใช้ ห้ามรัน migration จาก checklist นี้โดยอัตโนมัติ

## Manual Browser Acceptance ที่ยังต้องทำ

1. หลัง disposable PostgreSQL tests ผ่านและมี schema/accounts ที่ได้รับอนุญาต ให้ Student ยื่นคำร้อง → Class Advisor → Head อนุมัติ ตรวจ IDs/status/history เดิม
2. Staff สร้าง Cooperation Letter → generate → บันทึก response accepted → reload ตรวจ response/date/note/actor/history
3. สร้าง Placement draft → edit → generate → preview/download/print → regenerate ตรวจ version และ snapshot เดิม
4. ก่อนมี placement ลองแก้ response accepted → rejected ด้วยเหตุผล ตรวจ history และถูกบล็อก generation
5. หลังมี placement draft/generated ลองแก้ response ผ่าน API ต้อง 409 โดยเอกสาร/response/history ไม่เปลี่ยน
6. ตรวจ anonymous/Student/Teacher/Head/revoked Staff, foreign Student read, duplicate/stale/concurrent requests, missing data/prerequisites
7. ตรวจ desktop/mobile, keyboard/focus, loading/errors, preview revision เก่า, download filename และ native print โดยไม่อ้างว่าเป็น official PDF

## Files

สร้าง:

- `backend/src/controllers/companyResponse.controller.js`
- `backend/src/db/migrations/017_add_company_responses.js`
- `backend/src/models/companyResponse.model.js`
- `backend/src/models/companyResponseHistory.model.js`
- `backend/src/services/companyResponseRules.js`
- `backend/test/companyResponse.test.js`
- `frontend/test/companyResponse.test.js`
- เอกสารนี้

แก้ไข:

- `backend/src/routes/coopRequest.routes.js`, `staffDocuments.routes.js`
- `backend/src/services/staffDocuments.service.js`, `coopDocumentTemplate.js`
- `backend/test/staffDocuments.database.test.js`, `roleWorkflow.database.test.js`
- `backend/scripts/runLocalStaffDocumentsAcceptance.js` (schema expectations หลัง rollout 017 และ error ของ missing response; ไม่ได้ execute script)
- `frontend/src/api/staffDocuments.api.js`
- `frontend/src/pages/staffDocuments.js`
- `frontend/src/department_staff/department_staff.html`
- `frontend/src/styles/staff_documents.css`
- `frontend/test/helpers/staffDocumentsFixture.js`
- `README.md`, `HANDOFF_fitm-intern.md`, `docs/STAFF_DOCUMENT_PROCESSING_ACCEPTANCE.md`

Feature ถัดไปที่แนะนำ: official university templates/PDF พร้อม workflow ยกเลิก/ออกเอกสารใหม่ เพื่อรองรับการเปลี่ยนผลตอบรับหลังมี Placement Letter ทั้งนี้ต้องปิด PostgreSQL/browser acceptance ของงานนี้ก่อน
