# FITM Morning UX/UI and workflow checklist — 2026-10-10

ใช้ checklist นี้เปิด Chrome ตรวจเองในตอนเช้า. **ทุก Actual/Screenshot ในตารางนี้ยังว่าง: NOT RUN ใน audit รอบนี้**. หลักฐาน Chrome ที่มีอยู่เป็น historical disposable tests แยกใน full report; อย่ากรอก PASS จาก screenshot เก่า

## 1. ก่อนเริ่ม — environment / accounts / data

1. เลือก **approved disposable review environment** ที่มี API/Frontend/DB/storage ของตนเอง. ห้ามใช้ production หรือ persistent Local เพื่อทดลอง create/cancel/upload โดยอาศัย checklist นี้เป็นสิทธิ์แก้ข้อมูล. ตรวจ ledger แบบ read-only; requirement ที่ต้องใช้ 017–021 แต่ schema ไม่มีให้กรอก BLOCKED ไม่ rollout migration ระหว่าง audit.
2. ค่า default ตาม source: Frontend `http://localhost:5173`, Backend `http://localhost:5000`, NLP `http://localhost:8000`. ถ้า review instance ใช้ origin/port อื่น ให้แทน origin ทั้งหมดและตรวจ `VITE_API_URL` ชี้ review API จริง. ไม่ตั้งค่าตาม screenshot เก่า.
3. เปิด Chrome DevTools Console + Network (Preserve log). จด version/viewport/environment/date/time. ปิดส่วน Authorization/Cookie/token/password/PII ในหลักฐานที่จะแชร์; capability URL ต้องถูกล้างหรือปิดก่อน screenshot.
4. ใช้ Student A/B, Class Advisor A, Project/Supervision Advisor B, Head H และ active Staff S **ที่จัดเตรียมไว้ใน review DB**. A/B ต้องคนละ Student; Class A และ Project B ต้องเป็นคนละ Teacherเพื่อพิสูจน์สิทธิ์. H ต้องมี `is_department_head=true`, active และ department ตรง Class A. ไม่เพิ่มสิทธิ์จากชื่อ/ตำแหน่ง/ข้อความใน UI.
5. ถ้าต้อง provision ให้ผู้ดูแล review instance ใช้ helper เดิมและส่ง secrets ผ่านช่องทางส่วนตัว/owner-only file ตามเอกสารเดิม. Staff helper รับ `DEPARTMENT_STAFF_FIRST_NAME`, `LAST_NAME`, `EMAIL`, `PASSWORD`; Teacher credential helperใช้ existing Teacher ID และ backup/restore. **รายงานนี้ไม่มีและไม่สร้าง password จริง**. ห้ามใช้ helper เปลี่ยน persistent accounts ในงาน audit.
6. เตรียม company fixture, published/unpublished/expired jobs, request ของ A ในแต่ละ status และ 26+ request rows สำหรับ pagination. แต่ละการตัดสินใจ terminal ใช้คนละ fixture; อย่าย้อนสถานะด้วย SQL เพื่อทดสอบต่อ.
7. เตรียม approved placement request ที่มี company/datesชัดเจนหนึ่งรายการ, confirmed Project B, original verified Mentor M, substitute M2 และ mailbox ทดสอบที่เป็นของผู้ทดสอบ. ช่วงงานต้องครอบคลุมวัน daily ในอดีตและนัดนิเทศในอนาคต. หนังสือ/ภาพ/Resume ใช้ไฟล์ synthetic ไม่มีข้อมูลจริง.
8. Positive Company response date ใช้ **วันที่ก่อนวันนี้อย่างน้อยหนึ่งวัน** เพื่อหลีกเลี่ยง date-only midnight UTC ที่ยังเป็นอนาคตในช่วงเช้ามืด Bangkok. Negative future dateต้องถูกปฏิเสธ. นัดนิเทศต้องใช้ Bangkok date/timeในอนาคตและอยู่ในช่วง placement; ไม่ใช้วันที่固定จากรอบเก่า.
9. Disposable automated runners cleanup fixturesหลังจบ จึง **ล็อกอินด้วยบัญชีใน screenshot เก่าไม่ได้**. แยก manual review fixtureที่ผู้ดูแลจัดเตรียมจาก automated-run fixture.

หากเปิด API/DB/Chromeไม่ได้ ให้กรอก BLOCKED พร้อม errorสั้นและ environment; ไม่ลด validation/authorizationเพื่อผ่าน. การอ่าน healthสำเร็จไม่ได้พิสูจน์ migration/schemaครบ.

## 2. Entry / login ตามบทบาท

| Role | URL / menu | Access | ต้องเตรียม |
|---|---|---|---|
| Student | `/login.html` → `/src/student_coop/student_coop.html` | Student email/password; localStorage Student session | A/B, profile, Class A, skills, files/placement ตามกรณี |
| Staff | `/staff-login.html` → `/src/department_staff/department_staff.html#documents` หรือ `#activities` | active Staff email/password; separate sessionStorage Staff bearer | requestsทุกสถานะ, letters/company response, activities |
| Teacher | `/teacher-login.html` → `/src/teacher_coop/teacher_coop.html#coopApprovals`, `#advisorRequests`, `#supervisionScheduling` | active Teacher; Class A และ Project Bคนละหน้าต่าง/session | own/foreign class requests; pending project requests; own project placements |
| Head | `/department-head-login.html` → `/src/department_head/department_head.html#coopApprovals` | existing active authorized Head; Teacher/Head session family | eligible own department request + wrong department case |
| Company | `/src/recruit_student/recruit_student.html` | **ไม่ต้อง login**; Turnstile + owned mailbox | contacts/address + 1–10 positions; recruitment feature enabled |
| Mentor original | `/src/mentor_coop/mentor_verify_user.html?token=<recipient-link>` | actual recipient capability; **ไม่ใช่ JWT login** | latest verification email from review environment |
| Mentor weekly | same HTML `#review_token=<recipient-link>` | Mentor weekly capability in fragment | submitted week + current verified original Mentor |
| Mentor appointment/substitute | same HTML `#appointment_token=<recipient-link>` | appointment-version recipient capability in fragment | pending appointment + original/substitute nomination |

Tokensในตารางเป็น placeholders ห้ามคัดลอก actual capability/JWT ลง report. Original query tokenและ weekly/appointment fragmentคือคนละ mode; ใช้ linkชนิดที่ถูกต้อง. Teacher/Headแชร์ session family จึงใช้ separate browser profile/windowที่แยก storageถ้าต้องเทียบบทบาทพร้อมกัน

## 3. Student

ทุก URLด้านล่างอยู่ใต้ `/src/student_coop/student_coop.html` เว้นแต่ระบุเพิ่ม. Student panelsใช้ `data-target` navigation **ไม่ใช่ routeไฟล์ใหม่**.

| ID / menu | Test steps / data | Expected UI + API / persistence | Actual | Screenshot | PASS/FAIL/BLOCKED |
|---|---|---|---|---|---|
| S01 Register/Login | `/register.html`: synthetic unique allowed institution email/student ID; missing/invalid/duplicate; password confirmation. Login wrong then correct | controlled validation; POST `/api/auth/register` creates students; POST `/login` issues Student session; redirect dashboard; no password/hash response | — | — | NOT RUN |
| S02 Google | Click Google at `/login.html` | record visible future-integration behavior; **MOCKUP gap**, no provider authentication claim; registration page has no completed OAuth flow | — | — | GAP / NOT RUN |
| S03 Navigation | Tab/click every sidebar button: overview/profile/job-matching/request/daily/coop/report-upload/mentor/evaluate/transfer/activities; browser back/refresh | correct panel; active menu and heading; no stuck loading/blank action. Transfer is unsupported slice | — | — | NOT RUN |
| S04 Student/profile | ประวัตินักศึกษา `panel-profile`: save academic/Class fields, personal/family/emergency/skills; invalid GPA/year/missing advisor; reload | PUT `/api/student-profile/student-info` and `/me`; persisted students/student_profiles; clear errors; no unrelated identity/advisor mutation | — | — | NOT RUN |
| S05 Profile image | valid synthetic JPG/PNG/WebP; wrong MIME/oversize; replacement/reload | POST/GET `/api/student-profile/profile-image`; private path only; reload shows own new image; compare failure preserves old image; strict signature policy is a known gap to assess | — | — | NOT RUN |
| S06 Resume | readable PDF then scanned PDF; >10MB/wrong MIME/corrupt; replace and reload | POST `/api/student-profile/resume`; student_files persisted; extraction ready/failed truthful; old committed file not lost; OCR service actual call separately verified | — | — | NOT RUN |
| S07 Matching | ค้นหาสถานประกอบการ `panel-job-matching`: skills mode/resume mode, missing inputs, no jobs, NLP offline/slow, published expired fixture | POST `/api/job-matches/me` (+ source query); relevant persisted jobs; 422/503/504 shown; no stale clickable result; expired row behavior recorded as F10, not auto-PASS | — | — | NOT RUN |
| S08 Create request | คำร้อง `panel-request`: choose saved company/job then manual company; required applicant/recipient/address/dates/courses/delivery; double submit | POST `/api/coop-requests`; one active request; prerequisites/delivery rows saved; initial `advisor_review`; no Staff approval stage inserted | — | — | NOT RUN |
| S09 Invalid/duplicate | missing Class advisor/dates/required details; existing active request; invalid company link; reopen form | structured validation/duplicate message; no duplicate rows; retained input; modal focus and loading recover | — | — | NOT RUN |
| S10 Own cancel | eligible own request; cancel reason; Cancel/Escape then confirm; terminal history cannot cancel | PATCH `/api/coop-requests/:id/cancel`; cancelled row+review; reload preserved; other Student inaccessible; no reset to editable approval | — | — | NOT RUN |
| S11 Staff reason | After Staff F03, reload own request/detail/history | GET `/api/coop-requests/me` + `/:id`; cancelled reason/actor/time from reviews; no extra PATCH by Student; history retained | — | — | NOT RUN |
| S12 Advisor | โครงการ `panel-coop`: choose Project B, submit; B accept/reject; A reload | POST/GET `/api/student-coop/project-advisor-request`; confirmed/rejected persistence; Class A unchanged; explicit Student acknowledgement/replacement remains PARTIAL | — | — | NOT RUN |
| S13 Topic | save topic, blank/>500/control characters, reload | PUT `/api/student-coop/project`; coop_projects.topic saved; independent of advisor confirmation; error/input recovery | — | — | NOT RUN |
| S14 Book/Poster | อัปโหลดโครงการ `panel-report-upload`: valid PDF book + PDF/PNG/JPG poster; invalid extension/MIME/signature/path; replacement/reload/preview | POST `/api/student-coop/project-book`/`poster`, GET `/project-files`/`:id/preview`; one current file/category; private ownership; previous remains on failed replacement; no assessment claim | — | — | NOT RUN |
| S15 Mentor data | ข้อมูลพี่เลี้ยง `panel-mentor`: name/email/position; create/edit/resend; wrong email; delete with/without history | POST `/api/mentors`, GET/PUT/DELETE `/me`; capability rotated as applicable; verified state resets when required; history-bound deletion409; SMTP failure truthfully reported | — | — | NOT RUN |
| S16 Daily | บันทึกการปฏิบัติงาน `panel-daily`: working date assigned work/result/problems/notes; explicit non-working reason; edit; future/outside period/duplicate | POST/PUT `/api/internship-logs/days/:date`; own row/date/version; no fabricated problems; validation leaves existing rows intact | — | — | NOT RUN |
| S17 Submit week | incomplete week then fill required dates; unsaved edit warning; confirm submission; refresh | POST `/api/internship-logs/weeks/:date/submit`; missing dates blocked; frozen snapshot/week event persisted; email_sent=false is saved+delivery failure | — | — | NOT RUN |
| S18 Weekly revision | Mentor requests revision; Student read feedback, correct and resubmit; Mentor reviewed; reload | revision_requested unlocks appropriate edits; immutable original snapshots retained; reviewed week frozen; no numeric grade invented | — | — | NOT RUN |
| S19 Company evaluation | ประเมินสถานประกอบการ `panel-evaluate`: five integer1–10scores + comment; invalid/long; save/edit/reload/offline | GET/PUT `/api/student-coop/company-evaluation`; company_evaluations persisted; sum/average consistent; context displayed safely; **not academic score** | — | — | NOT RUN |
| S20 Visits/results | ภาพรวม `panel-overview`: visit1/2/history and completed result/photo readback after Teacher work | GET `/api/supervision/student` + appointment/visit result/images; own read-only result; A/B isolation; no editable Teacher controls | — | — | NOT RUN |
| S21 Calendar | ปฏิทินกิจกรรม `panel-activities`: month/list/filter/details/canceled | GET `/api/coop-activities/student`; published/canceled published items; drafts/internal notes/reasons hidden; read-only UI | — | — | NOT RUN |
| S22 Transfer/account | Transfer reason+button; inspect account/password/reset links | transfer states unsupported backend (F07); no fake row/success. Account password/change recovery absent; gaps logged rather than completed flow | — | — | GAP / NOT RUN |
| S23 Logout/auth errors | logout; expired JWT; role token swapped; reload | private rows cleared; login prompt; Student logout scope correct; API401/403; no other role bearer fallback | — | — | NOT RUN |

## 4. Staff

Open `/src/department_staff/department_staff.html#documents`; calendar at `#activities`.

| ID / menu | Test steps / data | Expected UI + API / persistence | Actual | Screenshot | PASS/FAIL/BLOCKED |
|---|---|---|---|---|---|
| F01 Queue/filter | search Student/company, each request status, empty results, 26+rows Prev/Next/refresh | GET `/api/staff/coop-requests`; correct filters/server offsets; only valid visible selection; no stale detail after error | — | — | NOT RUN |
| F02 Detail/history | open request; Tab close; long names/reasons containing `<script>` literal; reload | GET `/:id`; actor/reason/time/history rendered as text; no executable markup; focus returns to visible opener/fallback | — | — | NOT RUN |
| F03 Eligible cancellation | one each submitted/staff_review/advisor_review/department_head_review. Click ยกเลิก; empty/space/>2000 reason; cancel/back/Escape; valid reason confirm twice | POST `/api/staff/coop-requests/:id/cancel` sends reason+expected_status+expected_updated_at; one cancelled row+review; exactly one write; reason/actor/time persisted | — | — | NOT RUN |
| F04 Ineligible | approved/document_issued/in_progress/rejected/cancelled fixture; UI + direct API attempt | disabled/unavailable cancellation; server409; no letter/response/history removal; no extra review row | — | — | NOT RUN |
| F05 Stale/race/rollback | load; change status/version from separate authorized review action; attempt old cancel; concurrent cancel; injected rollback only existing approved test harness | 409 refresh and discard stale detail/reason; one winner; failed audit write leaves request unchanged. Do not inject failures into primary DB | — | — | NOT RUN |
| F06 Student readback | switch to S11 after cancellation; unrelated Student B lookup | A sees saved reason; B inaccessible; no Class/Project/Head identities overwritten | — | — | NOT RUN |
| F07 Documents | approved request only: draft/create/edit/generate/regenerate; missing fields; old version; confirm/back/Escape | POST/PUT `/api/staff/document-requests/:id/documents/cooperation` + `/generate`; revisions/snapshots durable; shared feedback/focus consistent; title explicitly development draft | — | — | NOT RUN |
| F08 Response | accepted/rejected; valid past date; future invalid; correction+reason+stale version; history | POST/PUT `/:id/company-response`; company_responses/history saved; invalid response not saved; UTC/date boundary tested explicitly | — | — | NOT RUN |
| F09 Placement | accepted eligibility; create/edit/generate; rejected/no-response block; retained document after correction | placementEligibility service determines UI; POST/PUT documents/placement; frozen response/source snapshot; historical generated revision preserved | — | — | NOT RUN |
| F10 Preview/download/print | open latest and earlier generated revision; preview iframe; download/open HTML; print dialog then cancel | authenticated GET document preview/download; actual file matches revision; CSP/sandbox/no path leak; **no official PDF claim**; do not print/send official letter | — | — | NOT RUN |
| F11 Calendar CRUD | `#activities`: monthly/list, search/category/time range; draft create, edit/publish, cancel required reason, double confirm, stale version | `/api/coop-activities/staff`; version/history/idempotency preserved; Bangkok timestamps; Student hides private notes; canceled retained | — | — | NOT RUN |
| F12 Revocation/offline | expired/disabled Staff, Student/Teacher/Head impersonation; offline refresh then retry | 401/403 clears all mounted private sections; no stale write; sign-in redirect/retry. Approval endpoints for Staff absent | — | — | NOT RUN |
| F13 Missing modules | inspect Company admin/Teacher admin/chatbot navigation | no completed Staff admin/chatbot flow found; record scope gaps, do not invent demo controls | — | — | GAP / NOT RUN |

## 5. Teacher และ Head

| ID / entry | Test steps / data | Expected UI + API / persistence | Actual | Screenshot | PASS/FAIL/BLOCKED |
|---|---|---|---|---|---|
| T01 Class decision | Teacher A `#coopApprovals`: own advisor_review; approve; second fixture reject required reason; reload | POST `/api/teachers/coop-requests/:id/approve` → department_head_review; reject→rejected; coop_request_reviews preserved; Student readback | — | — | NOT RUN |
| T02 Role boundary | Project B attempts A's Class request; Teacher A attempts B's supervision; foreign/head wrong department | 403/404; no state change; Class/project/head duties separate; Head Teacher namespace cannot bypass Class stage | — | — | NOT RUN |
| T03 Advisor request | Teacher B `#advisorRequests`: accept/reject pending Student request, double/stale; A reload | `/api/teachers/project-advisor-requests/:id/accept` or `/reject`; confirmed relationship persisted; Class advisor unchanged | — | — | NOT RUN |
| T04 Schedule | Project B `#supervisionScheduling`: select own Student, verified Mentor, tick acknowledgement; future within-period Bangkok date/time; visit1 then visit2 | POST `/api/supervision/teacher/students/:id/visits/:visit`; appointments/events/hash-token; pending confirmation; truthful SMTP feedback | — | — | NOT RUN |
| T05 Invalid/stale/reschedule | missing acknowledgement, past/outside dates, duplicate visit, changed Mentor stamp, stale version; edit future appointment with reason | controlled400/409; PUT visits path; new version/history, confirmation reset, old link revoked; result-bound appointment refuses reschedule | — | — | NOT RUN |
| T06 Substitute | visit2 unavailable original: M2 name/email/position + reason; sendlink; M2confirm | per-appointment snapshot only; delivery only to nominated recipient; original Mentor row unchanged; named/time confirmation | — | — | NOT RUN |
| T07 Result draft | after visit eligible by service: date/summary/problems/recommendations; draft with missing images; wrong/oversize image; two distinct JPG/PNGimages | PUT teacher appointment/visit/result; draft may be incomplete; complete action blocked until required fields/twoimages; private uploads max5MB each; no score invented | — | — | NOT RUN |
| T08 Result edit/complete | replace image; reload old/current revision; finalize; edit again; separate visit2 | POST result/complete; completed frozen; history/images retained; two visits independent; Student read-only result/photo; authorization enforced | — | — | NOT RUN |
| T09 PDF/grade/account gaps | look for visit PDF, final evaluation, workplace evaluation, self-edit account | record absent/blocked modules; data/photos/upload not PDF or final grade; no invented rubric tests | — | — | GAP / NOT RUN |
| T10 Multiple modules/auth | Teacher page concurrently mounted approvals/advisor/supervision; logout/401 while requests in-flight | all own private sections cleared; late response cannot repopulate; keyboard/focus/retry consistent | — | — | NOT RUN |
| H01 Head approve | Head H login, `#coopApprovals`; own department_head_review request after T01; approve/reject with reason; Student reload | `/api/department-head/coop-requests/:id/approve` → approved, rejection→rejected; liveHeadflag/department checked; audit saved | — | — | NOT RUN |
| H02 Head restrictions | wrong department, revoked flag, Class-pending, fakeHead JWT; Teacher namespace attempt; duplicate/stale | no bypass; controlled401/403/409; no double audit; request unaffected on invalid action | — | — | NOT RUN |
| H03 Management gaps | Teachersearch/edit/profile/account/direct advisor assignment | management backend partially exists but UI missing; direct assignment intentionally409; policy pending, not approve by UI workaround | — | — | GAP / NOT RUN |

## 6. Company และ Mentor

| ID / entry | Test steps / data | Expected UI + API / persistence | Actual | Screenshot | PASS/FAIL/BLOCKED |
|---|---|---|---|---|---|
| C01 Public jobs | Public Company form with no Student/Staff session: contacts/address + positions/jobdescription/category/quota/allowance/modes/days; add/remove positions | POST `/api/job-submissions`; persisted companies/submission/jobs/modes transaction; not automatically published; no-login behavior works | — | — | NOT RUN |
| C02 Security/validation | missing/failed CAPTCHA, unknown fields, invalidquota/days/modes, >10positions, disabled feature, repeat submissions | 400/403/429/503 as service contract; no partial rows; preserved input; loading prevents duplicate; no secrets/errors stack displayed | — | — | NOT RUN |
| C03 Verify/resend | owned review mailbox receives latest link; open verification page; expired/used link; resend with allowed origin/capability | GET/POST `/api/job-submissions/verify-email`; token hash single-use/expiry; lifecycle→pending_review; old link invalid; truthful SMTP failure; no automatic publication | — | — | NOT RUN |
| C04 Publish→search | Staff authorized API publish fixture; then Student picker/matching | `/api/staff/job-postings/:id/publish` and Student GET search/POST matches; only eligible published jobs. **Staff publication UI not found**, label browser step BLOCKED if unavailable | — | — | NOT RUN |
| C05 Company CRUD/public nav | own Company management, public company search link | Company owner portal absent; search_company link missing; capture gaps not pretend persisted edit | — | — | GAP / NOT RUN |
| M01 Original verification | open latest query-token link; edit own name/email/position; confirm; reload used/expired/old token | GET/PUT/POST `/api/mentor-verification/*`; mentor verified_at/status; token used_at; invalid links refused; capability cleared from URL | — | — | NOT RUN |
| M02 Weekly review | latest hash reviewlink; select submitted week; read snapshot; request revision with feedback; Student resubmits; mark reviewed | `/api/internship-logs/mentor/weeks/:id/review`; own Student/Mentor scope; one current version; immutable history; named feedback; stale/foreign rejected | — | — | NOT RUN |
| M03 Original appointment | latest appointment link; verify identity checkbox; confirm; used/rescheduled/expired retry | `/api/supervision/mentor/appointment` + `/confirm`; explicit identity required; version-bound oneuse; confirmation named/time; no attendance inference | — | — | NOT RUN |
| M04 Substitute appointment | T06 nominated M2 link; inspect recipient identity then confirm; originalM link attempt | same appointment capability restricted snapshot; M2 confirmation only; original Mentor unchanged; old link invalid | — | — | NOT RUN |
| M05 Missing assessment | inspect attendance/absence/leave/lateness/final Student/Book/work/Poster grades | descriptive nonworkingdays/weekly feedback are partial; full Mentorbehavior/finalnumeric assessment absent or blocked | — | — | GAP / NOT RUN |
| M06 Offline/token errors | network offline, missing token, wrongmode, expired/revoked token, direct foreignStudent/week/appointment | meaningful error, stale controls hidden; no unauthorized details; restore network permits approved retry | — | — | NOT RUN |

## 7. Required cross-role flows

| Flow | Execute checklist IDs | Required read-back / evidence | Actual | Screenshot | PASS/FAIL/BLOCKED |
|---|---|---|---|---|---|
| Student → Class → Head → Student | S08/T01/H01/S11(status) | one request + ordered advisor/head reviews; browser UI eachrole; Studentlateststatus. Staff must not approve | — | — | NOT RUN |
| Staff cancel → Student reason | F03/F06/S11 | request cancelled + one Staff review + saved reason; no Student write needed | — | — | NOT RUN |
| Student Mentor → original confirmation | S15/M01 | verified Mentor + consumed verification hash; real recipient delivery separate | — | — | NOT RUN |
| Student daily → Mentor weekly → correction | S16/S17/M02/S18 | log/week/event snapshots and feedback across refresh | — | — | NOT RUN |
| Project Teacher visit → Mentor/substitute → result | T04/M03/T06/M04/T07/T08/S20 | visit1/2 independent appointmentversion/history/result/twoimages | — | — | NOT RUN |
| Student upload → relevant viewer | S14 + ownpreview; T08 own result images | Student book/poster currently ownpreview only; **Teacher/Mentor Book/Poster viewer not found**; mark broader reviewer access gap | — | — | PARTIAL / NOT RUN |
| Company submit → verify → publish → Student | C01/C03/C04/S07 | persisted jobs + live verification + scoped publication + actual Studentsearch/match | — | — | PARTIAL / NOT RUN |
| Resume → extraction/OCR → matching | S06/S07 | persisted extractionmethod/status; actual FastAPI response and displayed eligible matches | — | — | NOT RUN |
| Chatbot → service answer | Homepage widget + FastAPI chat | **BLOCKED as product flow:** no UIbridge. Separate direct service check cannot pass product requirement | — | — | GAP |
| Assessment → 50/50score | final Mentor/Teacher/committee assessments | **BLOCKED:** no model/engine/rubric; Student workplace average is separate. Do not fabricate scores | — | — | BLOCKED |

## 8. UX/UI — run across all 13 screens

Use actual responsive DevTools viewports: Desktop **1440×900**, Tablet **768×1024** and **1024×768**, Mobile **390×844** and **360×800**. Browser zoom100% then200%; touch simulation and keyboard tested separately. CSSmediaqueries/build are not PASS evidence.

| Check | Desktop | Tablet | Mobile | Expected / screenshot | Actual | PASS/FAIL/BLOCKED |
|---|---|---|---|---|---|---|
| Navigation/menu/heading | — | — | — | everymenu opens correct section; active indicator; no missing search page or silent button | — | NOT RUN |
| Layout/tables/longtext | — | — | — | no horizontal page overflow; intentionally scrollable table usable; longStudentID/company/reasonwrap | — | NOT RUN |
| Modalposition/scroll/footer | — | — | — | title/buttons reachable; inner content scroll; bodybehind stable; keyboard not hidden by soft keyboard | — | NOT RUN |
| Tab/ShiftTab/Escape/focusreturn | — | — | — | focus confined to modal; Escape when idle; focus visible; afterclose opener/fallback; no background action | — | NOT RUN |
| Forms/labels/errors | — | — | — | association and required fields clear; error speaks field; preserves input; first invalid field reachable | — | NOT RUN |
| Loading/doublesubmit | — | — | — | spinner/text/aria-busy; no second write; retry after failure; durable success despite failed refresh | — | NOT RUN |
| Empty/error/offline/auth | — | — | — | distinctempty/403/409/503/offline; staleprivatedata/actions hidden; retry recovers; session clears | — | NOT RUN |
| Toast/dialog consistency | — | — | — | coherent Thai labels, typographic/colorstate; no misleading transfer“success”; readable toast duration | — | NOT RUN |
| Calendar details/touchtarget | — | — | — | truncated month title opens full readable detail/list; no accidental cancellation; mobile touch usable | — | NOT RUN |
| Upload/photo/preview | — | — | — | native file picker, progress/error; actual private preview after reload; no broken image paths | — | NOT RUN |
| Zoom/focus/contrast/screenreader | — | — | — | meaningfulheading/order/alt/statusannouncement; 200%zoom actions reachable; measure contrast separately | — | NOT RUN |
| Refresh/back/deeplink/session | — | — | — | URLhash correct; refresh persisted data; role namespace isolated; not demo-only localStorage persistence | — | NOT RUN |

Record evidence file names like `S08-create-mobile.png`, `F03-cancel-desktop.png`, `T08-result-tablet.png` with fixturedata. Screenshot at rest + modal/error + readback where useful; route/status from Network **without bearer/cookie values**. Keep current Actual separate from historicalartifactpaths. If a prerequisite is missing, choose BLOCKED and say exactly what; if an implemented action misbehaves choose FAIL; absent feature is GAP/NOT STARTED in traceability.

## 9. Optional existing runners for an already-authorized normal terminal

These are replay instructions, **not executed in this audit**. They create their own disposable resources/fixtures and clean them after completion; they are not a retainedmanualreviewserver. Do not change policy, disable browser security, or aim opt-in DSNs at primary data to make them work.

```powershell
powershell.exe -NoProfile -File backend\test\runStaffBrowserAcceptance.ps1 -CheckEnvironment -BackendImageCheck fitm-intern-backend
powershell.exe -NoProfile -File backend\test\runStaffCancellationFinalAcceptance.ps1
powershell.exe -NoProfile -File backend\test\runStaffBrowserAcceptance.ps1 -DailyLog
powershell.exe -NoProfile -File backend\test\runStaffBrowserAcceptance.ps1 -SupervisionResults
powershell.exe -NoProfile -File backend\test\runStaffBrowserAcceptance.ps1 -ActivityCalendar
```

Stop if environment preflight fails. Review per-run suite/process-result/summary/ownership cleanup and exit code. Cancellation is VERIFIED only if its own complete fresh acceptance passes; a Documents-only or unit-onlyPASS is insufficient. Historical feb769… already passed separately; replay failure does not erase those artifacts, but a new product regression must be reported by run/source version.
