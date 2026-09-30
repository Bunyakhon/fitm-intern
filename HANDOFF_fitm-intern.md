# fitm-intern — HANDOFF (Updated)

> ใช้ไฟล์นี้สำหรับเปิด ChatGPT/Codex แชทใหม่และทำงานต่อจากสถานะล่าสุดโดยไม่ย้อนทำงานเดิมซ้ำ

## PROJECT ROOT
C:\Users\suran\Documents\มอส\term31\pre-project\fitm-intern

## CURRENT STATUS

### ทำเสร็จแล้ว
- Student Authentication
- Student Profile
- PostgreSQL persistence
- Mentor Backend CRUD
- MentorToken / SHA-256 / expiry / invalidation
- Public Mentor Verification API
- Mentor Confirm API
- Nodemailer + Brevo SMTP
- Mentor Verification Frontend
- Rename Mentor Verification page + verification-status UI + resend verification email flow
- `node --check` ผ่าน
- `vite build` ใน Docker frontend container ผ่าน
- Student Mentor CRUD Frontend

### Mentor Verification Frontend files
- `frontend/src/mentor_coop/mentor_verify_user.html`
- `frontend/src/pages/mentor.js`
- `frontend/src/api/mentorVerification.api.js`
- `frontend/src/styles/mentor.css`

### Environment note
โปรเจกต์ควร build/dev ผ่าน Docker frontend container เป็นหลัก
Windows sandbox เคยเจอ `spawn EPERM` และปัญหา Rolldown/Tailwind native package แต่ Docker build ผ่าน จึงไม่ใช่ source/dependency ของโปรเจกต์เสีย

# LATEST COMPLETED WORK

## Landing, Login, and Register UX/UI Polish

### Current status and audit

- Audited `frontend/index.html`, `frontend/login.html`, `frontend/register.html`, their existing page modules (`frontend/src/pages/index.js`, `login.js`, `register.js`), `frontend/src/api/auth.api.js`, `frontend/src/styles/main.css`, `index.css`, `auth.css`, and `frontend/src/ui/feedback.js` before making changes.
- Index continues to use its existing `index.js` and `index.css`. Login and Register continue to share the existing `auth.css`; no duplicate page stylesheet or new API module was created.
- Login retains `POST /api/auth/login`, its existing `{ email, password }` payload, JWT storage, and redirect to `/src/student_coop/student_coop.html`. Register retains `POST /api/auth/register`, its existing payload and validation rules, and redirect to `/login.html` after a real successful response.

### UX/UI changes

- `index.html` now has a more polished subtle hero/card entrance, a restrained decorative background shape, and staggered recommended-card animation. The existing navigation, CTA, content, and carousel behavior are preserved. The filter modal now has dialog semantics, initial focus, Escape-to-close, focus restoration, and a short scale-in transition.
- `login.html` and `register.html` now expose required fields more clearly, retain their visible labels and autocomplete attributes, and add stronger focus/valid/error/success feedback. Auth cards use a short entrance transition; motion remains disabled by the shared reduced-motion rule.
- Password show/hide buttons report their pressed state. Login adds a Caps Lock warning only while the password input is being used; no password is logged or persisted outside the existing login request.
- Both auth forms use the existing shared `setButtonLoading()` and `showToast()` utilities for API-bound submit loading and real success/error feedback, while preserving the existing nearby inline message. Forms expose `aria-busy` while their request is pending and use an in-memory request guard to prevent duplicate submission.

### CSS and JS

- Reused from `main.css`: shared spinner/button-loading state, toast UI, disabled-state treatment, focus-visible rule, and global reduced-motion handling.
- Updated `index.css`: landing entrance, card stagger, hero shape, and filter-modal animation only.
- Updated `auth.css`: auth entrance, focus/valid/invalid input states, required indicator, Caps Lock notice, and inline message transition only.
- Updated `index.js`: accessible filter-modal focus/Escape behavior only.
- Updated `login.js` and `register.js`: shared feedback utility calls, submit guards, aria-busy state, password-toggle ARIA state, and Login Caps Lock detection. No endpoint, payload, validation rule, JWT/auth business logic, or redirect rule changed.

### Loading, feedback, and dialogs

- Login: after a real request begins, the submit button becomes disabled and says `กำลังเข้าสู่ระบบ...`; real success shows inline/toast feedback before the existing redirect, while real errors show inline/toast feedback and restore the button.
- Register: after a real request begins, the submit button becomes disabled and says `กำลังสมัครสมาชิก...`; real success shows inline/toast feedback before the existing redirect, while real errors show inline/toast feedback and restore the button.
- Search over the three page files and modules found no `alert()`, `window.alert()`, `confirm()`, or `window.confirm()` calls.

### Verification results

- `node --check frontend/src/pages/index.js` passed.
- `node --check frontend/src/pages/login.js` passed.
- `node --check frontend/src/pages/register.js` passed.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).
- `git diff --check` passed.
- Browser acceptance: **PENDING**. No browser session or authorized test account was used in this pass, so responsive layouts, animations, and real Login/Register success/error flows still need browser verification.

### Scope

- No Backend, database, migration, API endpoint, request payload, JWT/auth business logic, password hashing, token flow, or Student/Mentor business logic was changed.

## SECURITY
Verification Token ใด ๆ ที่เคยปรากฏใน Chat/Screenshot/Summary เดิม ให้ถือว่า compromised

ห้าม:
- reuse token เก่า
- hardcode token
- ส่ง token ลง Chat
- screenshot ที่เห็น token ใน Address Bar
- console.log(token)
- localStorage/sessionStorage token
- แสดง token ใน DOM

---

# LATEST COMPLETED WORK

## Verification Email Path — Source and Docker Runtime Verification

- The verification URL template is now `/src/mentor_coop/mentor_verify_user.html?token=...`.
- The only URL-path source is `backend/src/services/email.service.js`: `MENTOR_PAGE_PATH` is `/src/mentor_coop/mentor_verify_user.html`; `sendMentorVerificationEmail()` still uses `encodeURIComponent(token)`.
- Repository search found no active `mentor.html` / `/src/mentor_coop/mentor.html` reference outside historical handoff text. `frontend/src/mentor_coop/mentor.html` is absent; `frontend/src/mentor_coop/mentor_verify_user.html` exists.
- The verification page imports `/src/pages/mentor.js` and `/src/styles/mentor.css` correctly.
- Docker Compose runs backend in development mode with a bind mount from `./backend` to `/app` and `npm run dev`; the current `intern_backend` runtime file at `/app/src/services/email.service.js` also contains `mentor_verify_user.html`.
- Therefore, no backend rebuild or restart was needed or performed for this pass: the running container had already mounted the corrected source and nodemon had loaded it. If a prior real email contained `mentor.html`, it originated from an earlier runtime state or an email generated before the corrected mounted source was active; the current runtime has no old path reference.
- No database, migration, PostgreSQL volume, mentor status enum, token model/hash/expiry, public verification controller, Student Mentor CRUD, resend behavior, or verification JS logic was changed.

### Verification results

- `node --check backend/src/services/email.service.js` passed on the host and in `intern_backend`.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).
- `intern_backend` is running and its latest startup log reports a successful database connection, model sync, and server startup.
- Runtime verification was template-only; no verification email was generated and no token, JWT, password, SMTP key, or other secret was printed or recorded.

### Security

- Any verification token exposed in the latest previous test is compromised. Do not reuse, log, store, or add it to source, handoff, or reports. Generate a new verification email for the browser acceptance test.

---

# LATEST COMPLETED WORK

Student Mentor CRUD Frontend ใช้งานได้แล้วที่เมนู **ข้อมูลพี่เลี้ยง**:
- เปิดเมนูแล้วเรียก `GET /api/mentors/me` ด้วย JWT ผ่าน `apiRequest` เดิม
- แสดง empty state และปิดใช้งานปุ่มแก้ไข/ลบเมื่อยังไม่มีข้อมูล
- เพิ่มข้อมูลผ่าน modal, validation และ `POST /api/mentors`
- แก้ไขโดย preload ข้อมูลจริง และ `PUT /api/mentors/me`
- ลบด้วย confirm dialog และ `DELETE /api/mentors/me`
- หลัง create/update โหลดข้อมูลล่าสุดจาก API; หลัง delete แสดง empty state
- รองรับ loading, empty, ready, saving, success, error และ deleting พร้อมป้องกัน double submit

### Files created
- `frontend/src/api/mentor.api.js`

### Files modified
- `frontend/src/pages/student_coop.js`
- `frontend/src/student_coop/student_coop.html`
- `frontend/src/styles/student_coop.css`

### Verification results
- `node --check frontend/src/pages/student_coop.js` ผ่าน
- `node --check frontend/src/api/mentor.api.js` ผ่าน
- `docker exec intern_frontend npm run build` ผ่าน (Vite v8.2.2)
- ไม่ได้แก้ Backend หรือ Database
- ไม่มี mock data และ request body ไม่มี `student_id`; owner ระบุจาก JWT ที่ `frontend/src/api/client.js` จัดการ

---

# LATEST COMPLETED WORK

## Student Mentor Status UI Render Fix

- The Student mentor card now exposes the resend confirmation UI only when an existing mentor has `status === "pending"`.
- `verified` shows `ยืนยันแล้ว` while the unverified hint and resend button are hidden.
- Missing mentor records continue to show `ยังไม่มีข้อมูลพี่เลี้ยง`; null or unknown statuses show `ไม่ทราบสถานะ`, with no resend control.
- Added a scoped `[hidden]` style so the pending-only hint and resend button remain hidden even though the shared button class sets a display value.
- No backend, database, status enum, or resend API changes were made.

### Files modified
- `frontend/src/pages/student_coop.js`
- `frontend/src/styles/student_coop.css`
- `HANDOFF_fitm-intern.md`

### Verification results
- `node --check frontend/src/pages/student_coop.js` passed.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).

### Next task
- Run a browser/API acceptance test with an authorized student account when available.

---

## Mentor Verification Page Rename, Status, and Resend

- Rename verification page from `frontend/src/mentor_coop/mentor.html` to `frontend/src/mentor_coop/mentor_verify_user.html`
- Backend verification URL now resolves to `/src/mentor_coop/mentor_verify_user.html?token=...`; only the page path string in `backend/src/services/email.service.js` changed.
- Student mentor card now reads the API `status` field directly:
  - `pending` → badge `รอยืนยัน`, explanatory text, and a resend button.
  - `verified` → green badge `ยืนยันแล้ว` and no resend button.
  - unknown/null → safe fallback `ไม่ทราบสถานะ`; it is never guessed as verified.
  - no mentor record → `ยังไม่มีข้อมูลพี่เลี้ยง`.
- Resend reuses `PUT /api/mentors/me` with only the existing mentor's `email`, `first_name`, `last_name`, and `position`. It never sends `student_id`, mentor ID, or a verification token.
- Resend asks for confirmation, prevents duplicate submissions, shows `กำลังส่ง...`, refreshes with `GET /api/mentors/me`, and shows a warning when `verification_email_sent` is `false`.
- No new API, token logic, database change, migration, or status enum was created.

### Files renamed
- `frontend/src/mentor_coop/mentor.html` → `frontend/src/mentor_coop/mentor_verify_user.html`

### Files modified
- `backend/src/services/email.service.js`
- `frontend/src/student_coop/student_coop.html`
- `frontend/src/pages/student_coop.js`
- `frontend/src/styles/student_coop.css`
- `HANDOFF_fitm-intern.md`

### Verification results
- `node --check frontend/src/pages/student_coop.js` passed.
- `node --check frontend/src/pages/mentor.js` passed.
- `node --check frontend/src/api/mentor.api.js` passed.
- `node --check frontend/src/api/mentorVerification.api.js` passed.
- `node --check backend/src/services/email.service.js` passed.
- Repository search has no active `mentor.html` reference; the only prior handoff reference was updated.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).

### Remaining issue
- ยังไม่ได้ทำ browser/API acceptance test ด้วยบัญชีนักศึกษาจริงที่ได้รับอนุญาต เพราะต้องใช้ session JWT และการส่งอีเมลจริง

---

# LATEST COMPLETED WORK

## Mentor Verification — Student and University Context

- The Mentor Verification page now shows a context box above the mentor form with the system university name, `มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ`, and the name of the student assigned to that mentor.
- `GET /api/mentor-verification/verify?token=...` previously returned only mentor data. The existing endpoint now also returns `data.mentor.student` through the established `Mentor.student_id` → `Student.id` association.
- The Student model was inspected before the query change: its usable name fields are `first_name` and `last_name`; there is no `prefix` field. The API exposes only those two Student fields—no student ID/UUID, email, password, JWT, contact data, GPA, medical data, or other profile fields.
- `frontend/src/pages/mentor.js` renders the name only from `data.mentor.student.first_name` and `last_name`, with normal spacing. If neither usable value is present, it shows `ไม่พบข้อมูลนักศึกษา`; it does not derive a name from email or storage.
- The context remains within `mentorContent`, so it stays visible after confirm while the existing confirmation locking and address-bar token removal behavior are unchanged.

### Files modified

- `backend/src/controllers/mentorVerification.controller.js`
- `frontend/src/mentor_coop/mentor_verify_user.html`
- `frontend/src/pages/mentor.js`
- `frontend/src/styles/mentor.css`
- `HANDOFF_fitm-intern.md`

### Verification results

- `node --check frontend/src/pages/mentor.js` passed.
- `node --check backend/src/controllers/mentorVerification.controller.js` passed.
- `git diff --check` passed.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).
- Browser/API acceptance testing remains pending because it requires a newly generated, authorized verification link. Do not record or reuse its token or any JWT.

### Scope and security

- No database, migration, column, Mentor CRUD, resend/email flow, confirm flow, SHA-256, token generation, expiry, invalidation, consume logic, or transaction logic was changed.
- The GET response uses the minimum necessary Student display data only.

# LATEST COMPLETED WORK

## Frontend UX/UI Polish — Shared Feedback and Mentor Auto-close

### Current status and audit

- Audited all five frontend pages in the repository: `index.html`, `login.html`, `register.html`, `frontend/src/student_coop/student_coop.html`, and `frontend/src/mentor_coop/mentor_verify_user.html` (plus their page modules). The dashboard has existing profile, mentor, daily-log, resume, project, and transfer UI; the login/register pages already use inline request feedback and button disabled/loading states; the Mentor Verification page already has API-bound loading/state UI.
- Audited all frontend styles: `main.css`, `auth.css`, `index.css`, `student_coop.css`, and `mentor.css`. `main.css` previously contained shared tokens, reset, navbar, footer, and responsive styles only. Page-specific CSS remains in its matching file; this pass changed only `mentor.css` for Mentor-only success animation.
- Before the change, the only native dialogs were five occurrences in `frontend/src/pages/student_coop.js`: three `alert()` calls and two `window.confirm()` calls. The final native-dialog search returns no `alert()` or `confirm()` application calls in `frontend`.

### Shared UI and feedback patterns

- Created `frontend/src/ui/feedback.js` as the single Vanilla JS feedback utility. It provides `showToast()`, `showConfirmModal()`, and `setButtonLoading()`.
- Added shared toast, confirmation-modal, enter/exit animation, disabled, and reduced-motion styles to `frontend/src/styles/main.css`. Toasts expose an appropriate `role` and `aria-live`; the modal has focus management, Escape-to-cancel, locked confirmation while an action is pending, and does not close on a backdrop click by default for irreversible actions.
- `student_coop.js` now uses info/warning toasts for the three former alerts. Delete mentor and resend verification email now use the shared confirmation modal, retain the existing API calls and inline loading/success/error messages, and show a loading state on the confirmation button to prevent duplicate submission.
- Mentor Verification now loads `main.css`, uses the shared button-loading helper, and asks for custom confirmation before the irreversible mentor confirmation request. Existing API endpoints, payloads, JWT handling, mentor token behavior, and business rules are unchanged.

### Mentor verification success and auto-close

- After a real successful confirmation response, the form and buttons remain disabled, the verification token is removed from the address bar through the existing history replacement flow, a success toast and green check animation are shown, and the page waits 1.8 seconds before one `window.close()` attempt.
- Browsers can reject closing a tab that was not opened by script. If the tab remains open, the status becomes `ยืนยันข้อมูลเรียบร้อยแล้ว สามารถปิดหน้านี้ได้`; there is no redirect to `about:blank`, reload, close loop, or browser workaround.

### Files created or modified in this pass

- Created: `frontend/src/ui/feedback.js`
- Modified: `frontend/src/styles/main.css`, `frontend/src/pages/student_coop.js`, `frontend/src/mentor_coop/mentor_verify_user.html`, `frontend/src/pages/mentor.js`, `frontend/src/styles/mentor.css`, `HANDOFF_fitm-intern.md`
- No page-specific `student_coop.css`, `auth.css`, or `index.css` changes were needed in this pass.

### Verification results

- `node --check frontend/src/ui/feedback.js` passed.
- `node --check frontend/src/pages/student_coop.js` passed.
- `node --check frontend/src/pages/mentor.js` passed.
- `git diff --check` passed.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).

### Remaining issue

- A browser/API acceptance test still requires a newly generated authorized verification link and an authorized student session. Do not record, reuse, or expose a verification token or JWT.
- No Backend, database, migration, API endpoint, request payload, JWT/token logic, status enum, or other business logic was changed in this UX/UI pass. No mock data or hardcoded API success was added.

# LATEST COMPLETED WORK

## Student Coop — Backend-connected Section Audit and UX States

### Audit result

- `frontend/src/student_coop/student_coop.html` has 10 content panels. Three are backend-connected: Overview, Student Profile, and Mentor Information. Seven remain static/mock and were not changed to imply live backend behavior: Resume Upload, Coop Request, Daily Log, Coop Project, Project Upload, Company Evaluation, and Transfer Request.
- Overview (`#panel-overview`) receives student identity/status through `checkAuthentication()` → `getCurrentStudent()` in `frontend/src/api/auth.api.js` → `GET /api/auth/me`. Its cooperative-workplace card is static/empty because no workplace API is called.
- Student Profile (`#panel-profile`) uses `frontend/src/api/studentProfile.api.js`: `GET /api/student-profile/me`, `GET /api/student-profile/profile-image`, `POST /api/student-profile/profile-image`, `PUT /api/student-profile/student-info`, and `PUT /api/student-profile/me`; it also uses `frontend/src/api/teacher.api.js` → `GET /api/teachers` to populate the advisor selector.
- Mentor Information (`#panel-mentor`) uses `frontend/src/api/mentor.api.js`: `GET /api/mentors/me`, `POST /api/mentors`, `PUT /api/mentors/me`, and `DELETE /api/mentors/me`.

### UX work applied to live sections only

- Profile GET now has an inline loading state, `aria-busy`, error feedback, an explicit empty-details message, and a short Student-specific content transition. The teacher selector is disabled with a loading option while its GET is pending and exposes an empty teacher result if none are returned.
- Student information PUT, profile-detail PUT, and profile-image POST have request guards to prevent duplicate submission, disabled loading buttons, inline error/success feedback, real-data refresh after mutation, and success toast feedback. Profile modal closing is blocked while its PUT is pending.
- Mentor already had GET loading/empty/error, create/update/delete/resend pending states, custom confirmation, and guards. This pass adds success toasts after successful create/update/delete/resend responses; all request and refresh behavior is unchanged.
- `frontend/src/styles/student_coop.css` now contains only Student-profile scoped loading/fade styles. Shared toast, modal, spinner, and reduced-motion styling continue to be reused from `frontend/src/styles/main.css`; `frontend/src/ui/feedback.js` was not changed.

### Files modified in this pass

- `frontend/src/student_coop/student_coop.html`
- `frontend/src/pages/student_coop.js`
- `frontend/src/styles/student_coop.css`
- `HANDOFF_fitm-intern.md`

### Scope and remaining verification

- No Backend, database, migration, endpoint, request payload, JWT/auth flow, mentor token/email flow, or business rule was changed. No mock/static panel was made to simulate a live API.
- `node --check frontend/src/pages/student_coop.js` passed, the frontend native-dialog search found no `alert()` or `confirm()` calls, `git diff --check` passed, and `docker exec intern_frontend npm run build` passed (Vite v8.2.2).
- Browser acceptance testing is pending because it requires an authorized student session. Test live Profile loading/empty/error, image upload, student/profile updates, teacher-list loading/empty/error, and Mentor CRUD/resend with real authorized API responses. Do not record any JWT or verification token.

# LATEST COMPLETED WORK

## Coop Request — Remove Job Title + Use Class Advisor

### Audit and database/model impact

- Audited the Co-op Request model, controller, routes, frontend API module, request UI, Student Profile response, and PostgreSQL before changing the contract.
- PostgreSQL `coop_requests` had a NOT NULL `job_title` column but contained **0 rows** (and therefore no `job_title` values to lose). No other Co-op Request source dependency used that column.
- `job_title` is removed from the `CoopRequest` model. With the existing `sequelize.sync({ alter: true })` development configuration, the next backend sync removes the now-unused column.
- No migration framework was added. Student Profile retains both `advisor_teacher_id` and `coop_advisor_teacher_id` unchanged.

### API and frontend changes

- `POST /api/coop-requests` no longer accepts, validates, trims, requires, or persists `job_title`. The frontend create payload no longer sends it.
- The create modal removes the job-title DOM/input/validation and reflows the remaining workplace fields. Current Request shows only the company/workplace name; its information grid no longer contains a position. History now shows province in place of position, and Detail removes the job-title row.
- Detail response includes the request owner’s real `advisor_teacher_id` relation as `student.advisorTeacher`, restricted to the teacher name fields required by the UI.

### Advisor approval source

- The Create and Detail approval sections show the real class advisor name only from `advisor_teacher_id → advisorTeacher`; if that relation is absent they show `ยังไม่ได้กำหนดอาจารย์ที่ปรึกษาประจำชั้น`.
- `coop_advisor_teacher_id` / `coopAdvisorTeacher` is not used in the Co-op Request approval section. It remains available and unchanged in Student Profile.
- There is no Teacher Approval backend, so the approval result and date remain the explicit unavailable states. No approval status, checkbox, date, or teacher name is fabricated or hardcoded.

### Verification and remaining work

- Source search confirms there is no remaining Co-op Request `job_title` reference in the model, controller, routes, frontend API, request HTML, request JS, or request CSS.
- `node --check` passed for the modified backend model/controller/route and frontend API/page modules; `git diff --check` passed; `docker exec intern_frontend npm run build` passed.
- Restarted `intern_backend`: database connection, Sequelize model sync, and server startup succeeded. PostgreSQL schema verification after sync returned no `coop_requests.job_title` column.
- Browser/API acceptance remains pending an authorised student session: verify create/detail/current/history layouts, class-advisor present/absent states, and real POST/GET behaviour without `job_title`.
- No mock data was added. Company/Job Posting implementation remains **PAUSED**.

# NEXT TASK

## Run browser acceptance for the polished Landing, Login, and Register pages

Verify desktop, tablet, and mobile layouts; landing/filter-modal keyboard behavior and reduced motion; Login/Register required validation, password show/hide, Login Caps Lock warning, API-bound loading, real success/error feedback, and the existing redirects. Record only pass/fail results; do not record passwords, JWTs, or verification tokens.

---

# CODEX PROMPT — ARCHIVED (completed task)

อ่าน `HANDOFF_fitm-intern.md` ก่อน

งาน Student Mentor CRUD Frontend ด้านล่างเสร็จแล้ว; ใช้เป็นบันทึก requirement เดิมเท่านั้น

สถานะตอนนี้:
- หน้า UI เปิดได้
- ปุ่ม “เพิ่มข้อมูลพี่เลี้ยง”, “แก้ไขข้อมูลพี่เลี้ยง”, “ลบข้อมูลพี่เลี้ยง” มีอยู่แล้ว
- แต่คลิกแล้ว flow ยังไม่ทำงาน
- Email / ชื่อ / นามสกุล / ตำแหน่ง ยังแสดงเป็น -

ให้ตรวจ source code ปัจจุบันก่อน และหาไฟล์จริงที่ควบคุม section นี้
ห้ามเดาชื่อไฟล์ใหม่ถ้ามีของเดิมอยู่แล้ว

ใช้ Backend API ที่มีอยู่แล้วเท่านั้น:
GET    /api/mentors/me
POST   /api/mentors
PUT    /api/mentors/me
DELETE /api/mentors/me

ข้อกำหนด:
- ห้ามแก้ Backend
- ห้ามแก้ Database
- ห้ามสร้าง API ใหม่
- ห้ามใช้ Mock Data
- Student routes ใช้ JWT ตาม pattern เดิมของ project
- ห้ามส่ง owner student_id จาก frontend
- API request ต้องอยู่ใน `frontend/src/api/`
- DOM/UI/event/render ต้องอยู่ใน `frontend/src/pages/` หรือ page logic เดิม
- reuse UI/style เดิมให้มากที่สุด
- ปุ่มเพิ่มต้องเปิด form/modal และ POST ได้จริง
- ปุ่มแก้ไขต้อง preload ข้อมูลและ PUT ได้จริง
- ปุ่มลบต้อง confirm ก่อน DELETE
- หลัง create/update/delete ให้ refresh state จาก API จริง
- รองรับ loading/empty/ready/saving/success/error/deleting
- validate email, first_name, last_name, position
- ป้องกัน double submit
- ถ้าไม่มี Mentor ให้ edit/delete disable หรือซ่อน
- ห้ามแก้ Mentor Verification Frontend ที่ทำเสร็จแล้วถ้าไม่เกี่ยวข้อง

หลังแก้เสร็จ:
1. สรุปไฟล์ที่แก้
2. สรุป flow GET/POST/PUT/DELETE
3. ระบุ API layer ที่ใช้
4. ระบุการจัดการ JWT
5. ระบุ validation/error handling
6. รัน `node --check` กับ JS ที่แก้
7. รัน `vite build` ใน Docker frontend container
8. ยืนยันว่าไม่ได้แก้ Backend/Database
9. ยืนยันว่าไม่มี Mock Data
10. อัปเดต `HANDOFF_fitm-intern.md` ให้สะท้อนสถานะล่าสุดและ NEXT TASK ใหม่ก่อนจบงาน

---

# HANDOFF UPDATE RULE

ตั้งแต่นี้เป็นต้นไป ทุกครั้งที่มีการทำงานหรือเปลี่ยนสถานะในโปรเจกต์ `fitm-intern` ต้องอัปเดต `HANDOFF_fitm-intern.md`

อย่างน้อยต้องอัปเดต:
- สิ่งที่ทำเสร็จแล้ว
- ไฟล์ที่เปลี่ยน
- ผล test/build
- ปัญหาที่ยังเหลือ
- NEXT TASK ล่าสุด
