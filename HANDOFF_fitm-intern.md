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

---

# LATEST COMPLETED WORK

## Student Coop Request — Backend, PostgreSQL, and Frontend

### Audit before implementation

- The Co-op Request panel was a static empty state. Its create button only showed an informational toast; there was no Co-op Request model, controller, route, API module, or persisted table.
- `backend/src/models/index.js` already autoloads every `*.model.js` file and invokes `associate()` after loading, so it was intentionally not changed. The project uses `sequelize.sync({ alter: true })`; no migration framework or partial unique index was added.
- Student data is read from the existing `Student` and `StudentProfile` models. No student identity, GPA, phone, or email data is duplicated into a request.

### Completed implementation

- Added `CoopRequest` (`coop_requests`) and `CoopRequestDeliveryMethod` (`coop_request_delivery_methods`). Delivery methods are a child table, not a single enum in `coop_requests`; `(coop_request_id, method)` is uniquely constrained and the FK cascades on delete.
- Added `Student.hasMany(CoopRequest, { as: "coopRequests" })`, `CoopRequest.belongsTo(Student, { as: "student" })`, and the request-to-delivery-method associations (`deliveryMethods`).
- Added authenticated APIs under `/api/coop-requests`:
  - `GET /me` — all requests owned by the logged-in student, newest first, with delivery methods.
  - `GET /:id` — owned request detail with delivery methods and the minimum Student/Profile fields needed by the UI.
  - `POST /` — creates the parent request and all selected delivery methods atomically.
  - `PATCH /:id/cancel` — marks an eligible owned request as `cancelled` and sets `cancelled_at`; rows are never deleted.
- The owner always comes from `req.user.id`. Create rejects unsupported/system-managed fields, including `student_id` and `status`.
- Backend validates required trimmed strings and their DB lengths, strict ISO dates, end date not before start date, and delivery methods as a unique allow-listed array of one through three values. Active-request protection returns `409`; a locked Student row serializes concurrent submissions for an owner. A student can create a new request after `rejected` or `cancelled` only.
- Cancellation is allowed only for `submitted`, `staff_review`, `advisor_review`, and `department_head_review`; it is rejected for approved, issued, in-progress, rejected, or already-cancelled requests.
- Replaced the Request panel with live loading, empty, current-request, history, detail, create, and cancel flows. The form uses three multi-select checkboxes, 77 Thai provinces, read-only live Student/Profile values, and read-only system subject/recipient text. It uses shared `showToast()`, `showConfirmModal()`, and API-bound loading guards; no native dialogs or mock request data were added.
- Current request, history, status badges, delivery-method labels, and the five-step stepper render only API values. The detail modal explicitly marks course and review information unavailable because corresponding backends do not exist.

### Files created

- `backend/src/models/coopRequest.model.js`
- `backend/src/models/coopRequestDeliveryMethod.model.js`
- `backend/src/controllers/coopRequest.controller.js`
- `backend/src/routes/coopRequest.routes.js`
- `frontend/src/api/coopRequest.api.js`

### Files modified

- `backend/src/models/student.model.js`
- `backend/src/app.js`
- `frontend/src/student_coop/student_coop.html`
- `frontend/src/pages/student_coop.js`
- `frontend/src/styles/student_coop.css`
- `HANDOFF_fitm-intern.md`

### Database and verification

- PostgreSQL verification confirmed that `coop_requests` and `coop_request_delivery_methods` were created by Sequelize sync. `coop_requests.submitted_at` has the `CURRENT_TIMESTAMP` default. The delivery table has its composite unique index and the expected cascading FK; the request table has the Student FK.
- `node --check` passed for both new models, the controller, route, frontend API module, and `frontend/src/pages/student_coop.js`.
- `git diff --check` passed.
- The province selector check confirms 77 unique Thai province options.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).
- Backend runtime logs report successful database connection, model sync, and server startup after this work.

### Remaining verification

- Browser/API acceptance with an authorized student session remains pending. Do not expose or record a JWT. Exercise empty GET, one/two/three delivery methods, invalid/duplicate delivery methods, duplicate-active `409`, ownership protection, detail, cancellation, repeat cancellation, re-submit after cancellation, and date validation.
- No changes were made to Student Authentication, JWT format, Student Profile API behavior, Teacher selector, Mentor CRUD/verification/token/email flow, Google OAuth, or Job Matching NLP.

# NEXT TASK

Audit Company / Job / Resume / Skills data for Job Matching NLP

---

# LATEST AUDIT

## Company / Job / Resume / Skills Data for Job Matching NLP

### Scope and result

- This was an audit only. No Company, Job, Skill, Resume parser, FastAPI endpoint, matching algorithm, embedding model, score formula, seed data, or integration was created or changed.
- Existing source already contains a classic NLP resume-matching implementation. It was inspected only and is not connected to the Express backend or PostgreSQL data.

### Current data inventory

| Domain | Status | Source of truth / notes | Match-ready now |
| --- | --- | --- | --- |
| Student | REAL | `Student` → `students`; PostgreSQL contains 4 rows. Structured candidate fields include nullable `major`, `year_level`, `gpa`; required `track`; name and email are not suitable matching features by default. | Partial |
| StudentProfile | REAL | `StudentProfile` → `student_profiles`; PostgreSQL contains 2 rows. Nullable free-text `related_skills` and `special_abilities` are the only direct candidate skill inputs. | Partial, unnormalised |
| StudentFile / Resume metadata | REAL schema/API, no current records | `StudentFile` → `student_files`; `file_type=resume`, storage metadata and a one-resume-per-student partial unique index. PostgreSQL currently has 0 rows. | No text input available |
| Company | MISSING | No Company model, table, route, controller, seed, or PostgreSQL table. `CoopRequest.company_name` is a student-provided request snapshot, not company master data or a relation. | No |
| Job posting | MISSING | No Job model, table, route, controller, seed, or PostgreSQL table. | No |
| Skill taxonomy | MISSING | No Skill model/table, job-skill relation, taxonomy, or dictionary. Student skills are free text only. | No |
| CoopRequest | REAL schema/API, no current rows | `coop_requests` exists but has 0 rows and captures a requested company/job-title snapshot only. | No |

### Student and resume findings

- `backend/src/models/student.model.js`: `major`, `year_level`, and `gpa` are nullable; `track` is required enum (`internship`, `co_op`). These are structured profile constraints/context, not extracted skills.
- `backend/src/models/studentProfile.model.js`: nullable `related_skills` and `special_abilities` are `TEXT`; there is no structured skills relation, technical-skill entity, interest field, or validation/normalisation taxonomy.
- `Student.hasOne(StudentProfile, { as: "profile" })` and `Student.hasMany(StudentFile, { as: "files" })` are real associations. Frontend profile editing exposes both skill text fields.
- Resume backend exists: authenticated `POST /api/student-profile/resume`, multipart field `resume`. It identifies owner from `req.user.id`, accepts only `application/pdf`, limits size to 10 MB, writes below `storage/students/<student UUID>/resume/`, and upserts `StudentFile` metadata transactionally.
- The Student dashboard Resume UI remains STATIC: `frontend/src/pages/student_coop.js` validates a selected PDF then says it is not connected to Backend; it does not call the existing endpoint.
- No PDF text extraction, `resume_text` column, parser service, OCR, or extracted-text database record exists. Current PostgreSQL has no `student_files` rows, including no resume metadata.

### Company and Job findings

- Company/Job master data, job description, required skills, required major, minimum GPA, work type, location, allowance, and job posting APIs are all MISSING.
- Landing-page recommended jobs are STATIC/MOCK: the hardcoded `jobs` array in `frontend/src/pages/index.js` is explicitly marked `// Mockup Job`; search/filter actions are also marked mock. They must not be matching input.
- The `nlp-service/tests/test_resume_matching.py` request payload is test-only example data, not a seed or PostgreSQL source. `nlp-service/data` contains only chatbot FAQ seed data and `.gitkeep` placeholders; it contains no jobs, resumes, skills, or embeddings.

### NLP service and integration findings

- `intern_nlp_service` is running and `/health` returned its healthy service response. Docker maps container port 8000 to host port 8000.
- Real FastAPI endpoints are `GET /health`, `POST /api/v1/resume-match`, and `POST /api/v1/chat`.
- Pre-existing resume matching uses PyThaiNLP tokenisation/stopword filtering where installed, a newly fitted TF-IDF vectorizer per request, and cosine similarity. It has no skill extraction, sentence embedding, sentence-transformers dependency, downloaded model, or persisted embedding/vector cache.
- `/api/v1/resume-match` requires caller-supplied plain `resume_text` and `job_postings`; when supplied postings are empty, the service currently returns `[]`. The schema description claiming a `data/processed` fallback does not match the implemented service behavior.
- Existing chatbot trains TF-IDF + Logistic Regression from static `data/processed/chatbot/faq_seed.json` at startup. That FAQ data is unrelated to matching input.
- No Express backend HTTP client, NLP route/service, environment configuration, or frontend API call targets `nlp-service`; Backend ↔ NLP integration is MISSING.

### Critical gaps and recommended order

1. **Critical blocker / NEXT TASK:** implement a real Company and Job Posting data foundation (models, PostgreSQL tables, ownership/admin workflow as decided separately, and APIs) with real job description and eligibility fields. Matching cannot rank jobs without a trusted job corpus.
2. Required MVP after that: connect the existing Resume UI to its already-existing upload API; then add an explicitly authorised PDF-to-text ingestion pipeline and extracted-text persistence.
3. Required MVP after that: define and persist normalised job required skills plus a Student-skill representation/taxonomy; decide how `major`, GPA, track, and location are eligibility filters.
4. Required only after real inputs/integration are available: design the NLP service contract and integrate Express to it. Re-audit or replace the pre-existing TF-IDF matching behavior before exposing any matching result.
5. Optional later: embeddings, explainability, ranking weights, feedback loops, and model/vector persistence.

### Expected future files (not created in this audit)

- Company and Job Posting model/controller/route/API files, plus their association and admin/staff ownership design.
- A frontend API/UI surface for real job postings.
- Resume upload frontend integration, resume text extraction/persistence, Skill/JobSkill data model, and a backend-to-NLP client/service contract.

### Verification performed

- Source audit covered backend models/routes/controllers/upload storage, frontend resume/company/job UI, all `nlp-service` source/data/tests/requirements/Docker configuration, and Compose wiring.
- PostgreSQL inventory: only `students`, `student_profiles`, `student_files`, `coop_requests`, `coop_request_delivery_methods`, mentor tables, and `teachers` exist; no Company/Job/Skill tables exist. Counts queried without reading student content: 4 students, 2 profiles, 0 files, 0 coop requests.
- No secrets, tokens, passwords, or student record contents were inspected or recorded.

# LATEST COMPLETED WORK

## Coop Request UI/UX Polish

### Reason and visual reference

- Audited the live Co-op Request HTML, page logic, stylesheet, shared feedback utility, and existing API client before changing the UI.
- The existing backend/API integration was retained. The original mockup was used only as a visual reference for hierarchy, spacing, card layout, badges, the five-step progress display, history, and modal sections; no example company, job, date, status, or request data was introduced.
- The current-request and history markup had been placed under the Mentor panel even though the live request logic targeted `panel-request`. They are now correctly rendered in the **คำร้องสหกิจศึกษา** panel.

### UI/UX changes

- Current Request is a single card headed by API-backed `company_name — job_title`, province context, an API status badge, a status-specific summary, a two-column request-information grid, and actions permitted by the existing cancellation rule.
- Added one shared `getCoopRequestStatusMeta()` mapping for the API enums. It supplies the Thai label, summary, step, and terminal state to Current Request, History, Detail, and the five-step progress indicator. Rejected/cancelled requests remain terminal and are never presented as completed progress.
- The stepper has completed/current/pending visuals, check marks for completed steps, responsive vertical presentation on small screens, and no fixed mock progress.
- History is rendered only from real API responses and continues to show the real status badge and detail action for each row.
- The create modal retains the existing payload, validation, loading guard, and real read-only student values. It now keeps the footer visible while the modal body scrolls, retains the desktop two-column / mobile one-column form layout, restores focus on close, and supports Escape.
- Detail now presents an API-backed status badge as well as the stepper. Course and review sections remain explicit unavailable states because those backends are not connected.
- CSS changes are scoped to Co-op Request classes in `student_coop.css` and reuse the existing shared tokens and modal/button patterns. No other menu/panel was redesigned.

### Files modified

- `frontend/src/student_coop/student_coop.html`
- `frontend/src/pages/student_coop.js`
- `frontend/src/styles/student_coop.css`
- `HANDOFF_fitm-intern.md`

### Accessibility and verification

- Preserved dialog semantics, `aria-busy`, live feedback, disabled/loading actions, focus restoration, and added Escape support for the Co-op Request modals.
- `node --check frontend/src/pages/student_coop.js` passed.
- `git diff --check` passed.
- Searched `frontend` for native `alert()` / `confirm()` calls; none found.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).
- Browser acceptance remains pending because no authorized student session was used. Verify desktop/tablet/mobile request states, real create/detail/cancel responses, modal scroll/focus, and rejected/cancelled history in a browser when an approved session is available.

### Scope confirmation

- Backend, database, models, routes, API contract, payloads, JWT/ownership rules, duplicate-request rule, cancellation rule, and delivery-method persistence were not changed in this UI/UX polish pass.
- No mock data was added. All request data and statuses render only from the existing API.

# LATEST COMPLETED WORK

## Coop Request UI — Original Mockup Layout Restoration

### Audit and scope

- Audited the live Co-op Request HTML, JS, scoped stylesheet, shared feedback utility, API client, and available git history before rebuilding the layout. The available pre-integration history contained only the earlier empty Request panel; no reusable original request-modal markup/classes were present. The document-form structure below was therefore restored from the original mockup specification while retaining only real API-backed values.
- Backend, database, API contract, JWT/ownership, request payload, duplicate-request rule, cancellation policy, delivery-method persistence, Student Profile APIs, Mentor, verification, and NLP were not changed.

### Rebuilt layout

- Create Modal now uses a document-sized 960px desktop card (safe viewport width, 92vh maximum) with a non-scrolling header/footer and one scrollable middle body.
- Restored card-like sections for: เรื่อง / เรียน; two-column Student information; two-column Company/Workplace form; horizontal delivery checkbox choices; a course table with an honest unavailable row; signer information; advisor unavailable state; and department-head unavailable state.
- All Student and signer values use the real Student/StudentProfile data already loaded by the page. Course and approval sections deliberately contain no example grades, people, approval text, or dates because their backends do not exist.
- Detail Modal uses the same document-section visual language in read-only mode, renders the real request values and delivery methods, includes a clear API-backed status badge and the existing five-step status progress display, and has a persistent Close footer.
- Current Request retains the API-backed company/job header, badge, summary, responsive five-step progress display, information grid, and only the actions permitted by existing business rules. History title, real status badges, and detail actions are retained.

### Responsive and accessibility

- Desktop/tablet use two-column grids where space permits; mobile collapses to one column. Checkbox choices wrap, course/history tables can scroll horizontally, and modal width keeps safe mobile margins.
- Dialog semantics, `aria-busy`, loading buttons, focus restoration, Escape-to-close, and non-scrolling modal header/footer are retained.

### Files modified

- `frontend/src/student_coop/student_coop.html`
- `frontend/src/pages/student_coop.js`
- `frontend/src/styles/student_coop.css`
- `HANDOFF_fitm-intern.md`

### Verification and remaining work

- `node --check frontend/src/pages/student_coop.js` passed.
- `git diff --check` passed.
- `docker exec intern_frontend npm run build` passed (Vite v8.2.2).
- Browser visual verification remains pending: no authorized student browser session was available. When available, verify Create/Detail section sequence, header/footer persistence while scrolling, real status states, desktop/tablet/mobile layout, and live create/detail/cancel flows.

### No mock data confirmation

- No company, student, grade, phone, approval, date, or request mock data was added. Request and status data remain from the existing API, while unavailable backend domains are displayed as unavailable states.

# NEXT TASK

Company / Job Posting implementation — PAUSED pending user decision

---

# LATEST AUDIT

## nlp-service — Job Matching NLP Read-only Technical Audit

### Scope and guardrails

- Read-only audit of `nlp-service/`, root `docker-compose.yml`, and backend/frontend references only. No NLP code, algorithm, package, model, endpoint, backend integration, Company/Job Posting, Resume parser, or mock data was added or changed.
- Existing Co-op Request work remains untouched. Company / Job Posting remains **PAUSED**; Google OAuth remains untouched.
- Runtime check only: `intern_nlp_service` is running and its internal `GET /health` returned `{"status":"ok","service":"nlp-service"}`. No resume/job payload or secret was sent or inspected.

### A. Folder Structure

- `nlp-service/app/main.py`: FastAPI application and lifespan startup.
- `app/api/v1/`: thin routes, `resume_matching.py` and `chatbot.py`.
- `app/schemas/`: Pydantic request/response classes, `resume_matching.py` and `chatbot.py`.
- `app/services/`: endpoint-to-NLP orchestration, `matching_service.py` and `chatbot_service.py`.
- `app/nlp/common/preprocessing.py`: shared Thai/English preprocessing.
- `app/nlp/matching/feature_extraction.py` and `similarity.py`: TF-IDF construction and cosine scoring.
- `app/nlp/chatbot/`: startup-trained intent classifier and response selector.
- `app/core/config.py`, `app/core/logging.py`: settings/path defaults and stdout logging. `app/utils/file_io.py` has generic JSON load/save helpers but is unused by the active matching/chatbot paths.
- `data/raw`, `data/processed`, `data/models`, and `data/embeddings` exist. Apart from the chatbot FAQ seed, they contain `.gitkeep` placeholders only. `tests/` has two API tests. `requirements.txt`, `Dockerfile`, and `README.md` are present.

### B. FastAPI Current Architecture

- `app/main.py` creates one FastAPI app with title from `settings.APP_NAME`, then includes `resume_matching.router` and `chatbot.router` under `/api/v1`.
- Live routes are `GET /health`, `POST /api/v1/resume-match`, and `POST /api/v1/chat`.
- There is **no CORS middleware**, auth middleware, custom exception handler, or payload-size middleware in this service.
- Lifespan startup calls `intent_classifier.load_and_train()` from the FAQ seed before the app is ready. There is no shutdown action.
- `Settings` uses `pydantic-settings` with `.env` support. Source defaults include port `8000`, matching `top_k=5`, minimum score `0.05`, and chatbot confidence `0.35`; no environment value is recorded here.

### C. Resume Matching Current Flow

`POST /api/v1/resume-match` → `post_resume_match()` → `match_resume()` → `rank_jobs()` → `build_vectorizer()`/shared preprocessing → sklearn `cosine_similarity()` → filter, sort, and response schema.

- Route: `app/api/v1/resume_matching.py`; it receives a validated `ResumeMatchRequest`, invokes the synchronous service, and returns `{"matches": [...]}`.
- Service: `app/services/matching_service.py`. It constructs each job text from exactly `position + " " + description`; `id` and `company_name` are output metadata only.
- If `job_postings` is empty, service returns `[]`. The schema description that suggests a `data/processed` fallback is inaccurate; there is no implemented fallback.
- Ranking receives the raw resume string and job-text list, fits vectors jointly for that request, scores, filters raw scores below `0.05`, rounds retained scores to four decimals, stable-sorts descending, then returns request `top_k` or default `5`.

### D. Preprocessing

- **REAL:** `clean_text()` trims, lowercases, removes characters outside Thai, English letters, digits, and whitespace, then normalizes repeated whitespace.
- **REAL:** `tokenize()` uses PyThaiNLP `word_tokenize(cleaned, engine="newmm")` when import succeeds; otherwise only whitespace splitting is used.
- **REAL:** Thai stopwords come from `pythainlp.corpus.thai_stopwords()`. A fixed small English stopword set is also removed.
- **REAL:** punctuation/symbol removal happens before tokenization; Thai and English are passed through the same normalizer/tokenizer pipeline.
- **MISSING:** stemming, lemmatization, language detection, skill extraction, skill normalization, synonym/alias mapping, NER, taxonomy, and dictionary matching.

### E. TF-IDF Implementation

- Library: `sklearn.feature_extraction.text.TfidfVectorizer` in `app/nlp/matching/feature_extraction.py`.
- Configuration is exactly `preprocessor=tokenize_to_string`, `tokenizer=str.split`, `lowercase=False`, and `token_pattern=None`. No explicit n-gram, `min_df`, `max_df`, vocabulary, stop-word, or norm configuration is supplied; sklearn defaults apply where not overridden.
- Matching creates a fresh vectorizer and calls `fit_transform([resume_text] + job_texts)` for every non-empty job request. Resume and jobs therefore share a request-local vocabulary. Matrix shape is `(1 + number_of_jobs, vocabulary_size_after_preprocessing)`.
- **MISSING:** vocabulary/model persistence, cache, corpus prefit, and offline job index. `data/models/matching` and `data/embeddings` are empty placeholders.
- Limitation: vocabulary/IDF varies with the caller-supplied job list, so scores are not directly comparable across requests. If all input becomes empty after preprocessing, sklearn can raise an empty-vocabulary error; no matching-specific recovery is implemented.

### F. Cosine Similarity

- Uses `sklearn.metrics.pairwise.cosine_similarity` in `app/nlp/matching/similarity.py`.
- `tfidf_matrix[0:1]` is the resume vector; `tfidf_matrix[1:]` contains job vectors. Scores are returned in original job order, then the service filters and ranks them.
- With default non-negative TF-IDF vectors, observed mathematical range is 0–1. Scores are not converted to percent; retained response values are rounded to four decimal places.
- There is top-k behavior (`request.top_k` if truthy, otherwise config default 5). No schema bound prevents `0`/negative values; because of `or`, `0` falls back to 5 while a negative value slices from the end. Ties retain caller order because Python sort is stable; there is no secondary tie-breaker.

### G. Resume Input Contract

- Exact input is JSON plain text, not a file: required `resume_text: str`; `job_postings: list[JobPosting]` defaults to `[]`; optional `top_k: int | null` defaults to `null`.
- There is no PDF parsing, OCR, uploaded-file input, resume-section extraction, extracted-text storage, or skills extraction in `nlp-service`.
- Pydantic supplies type/required-field validation, but the schema has no minimum text length, maximum payload size, or numeric range constraints. Missing/malformed schema fields receive FastAPI validation responses; empty strings can reach the NLP path.

### H. Job Posting Input Contract

- Each required job item is exactly `{ "id": string, "company_name": string, "position": string, "description": string }`.
- No `title`, `required_skills`, location, eligibility, company ID relation, or additional field is consumed by the matching service. Only `position` and `description` form TF-IDF text.
- There is no database/job-corpus lookup. Test fixture postings are test-only and the static landing-page jobs are not matching input.

### I. Skills Capability

- **MISSING:** skill extraction code, skill dictionary, normalized skill entity, Thai/English skill strategy, synonyms, aliases, NER, and taxonomy. The only match is lexical overlap after generic text preprocessing.

### J. Embedding Capability

- **MISSING:** sentence-transformers, transformers, torch, tensorflow, BERT/SBERT, `model.encode`, embedding code, downloaded model, cache, and model persistence.
- `data/embeddings/` is only a placeholder directory; configuration names an embeddings path but no active code uses it.

### K. Chatbot Capability

- `POST /api/v1/chat` accepts exactly `{ "message": string }` and responds with `{ "reply": string, "intent": string, "confidence": number }`.
- On FastAPI startup, `IntentClassifier` loads `data/processed/chatbot/faq_seed.json`, builds a Pipeline of the same TF-IDF vectorizer plus `LogisticRegression(max_iter=1000)`, and trains in memory. At request time it returns the best intent/probability and `response_selector` substitutes a fixed fallback below `0.35`.
- The seven FAQ intents and their responses are static seed/training data. Chatbot is separate from resume ranking: it reuses the generic TF-IDF/preprocessing builder but must not supply job corpus, matching features, or ranking decisions.

### L. Data Inventory

| Path | Classification | Finding |
| --- | --- | --- |
| `data/processed/chatbot/faq_seed.json` | SEED / chatbot training | 7 FAQ intents; not a job or resume corpus. |
| `data/raw/` | EMPTY placeholder | `.gitkeep` only. |
| `data/processed/models/` | EMPTY placeholder | no processed matching data. |
| `data/models/chatbot/`, `data/models/matching/` | EMPTY placeholder | no persisted models. |
| `data/embeddings/` | EMPTY placeholder | no vector cache or embeddings. |

- There is **no REAL production matching data**, training job data, resume text, skills data, or mock job corpus under `nlp-service/data`.

### M. Tests

- `tests/test_resume_matching.py`: one FastAPI TestClient API test asserting the test `job1` ranks above a less relevant `job2`.
- `tests/test_chatbot.py`: API test for `required_documents` intent plus a low-confidence reply-presence test.
- **MISSING:** preprocessing unit tests, schema validation/error tests, empty resume/jobs tests, ties/top-k/threshold tests, persistence/model-loading tests, Docker tests, backend-integration tests, and production corpus/quality evaluation.
- Tests were inspected only in this audit; no new test was created or run.

### N. Docker Runtime

- `nlp-service` compose service builds `nlp-service/Dockerfile`, container name `intern_nlp_service`, restart policy `unless-stopped`, host mapping `8000:8000`, and command `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`.
- Bind mounts are `./nlp-service/app:/app/app` and `./nlp-service/data:/app/data`. Dockerfile has `WORKDIR /app`, installs requirements, copies app/data for image builds, exposes 8000, and has equivalent non-reload uvicorn CMD.
- Compose provides only `PORT=8000`; the service has no Compose dependency, healthcheck, internal-only network restriction, auth environment setting, or backend service URL. Port 8000 is publicly published on the host.

### O. Backend Integration

- **MISSING:** repository search found no Express route, controller, client/service, `NLP_SERVICE` configuration, port-8000 reference, fetch/axios call, retry, timeout, or frontend call to Resume Match.
- Therefore, the FastAPI endpoints are independently runnable only; backend/frontend do not expose matching today.

### P. Technical Risks

Facts from source:

- TF-IDF is fitted synchronously for every match request, including Thai tokenization, in a normal synchronous route; there is no batching, cache, preloaded matching model, rate/payload limit, or worker/process configuration.
- Large caller-provided job lists grow preprocessing, vocabulary, sparse matrix, and cosine work linearly or worse in request time/memory.
- Scores depend on the supplied request corpus and lack eligibility/skill semantics. The service has no trusted job corpus or persistence.
- Empty/near-empty normalized text can surface sklearn errors; no local `try/except` maps these to a defined error response.
- Chatbot model is intentionally preloaded per startup, but it retrains from seed on every reload/restart and is not persisted.

Recommendations (not implemented):

- Before any production exposure, define a validated production contract and error policy, bound input sizes/top-k, and decide whether matching uses a versioned corpus/index rather than refitting per caller request.
- Preserve the chatbot as an independent FAQ capability; do not treat its seed/trained classifier as job-matching data or a reusable ranking model.

### Q. Reusable Components

- Reusable with review: FastAPI route/schema/service separation; settings and basic stdout logging; Thai/English normalization; request-local TF-IDF/cosine baseline; startup lifecycle; chatbot's distinct FAQ pipeline; Docker service structure.
- The matching input/output shell is useful as a prototype contract reference only, not a finalized backend contract.

### R. Components That Should Be Replaced or Extended

- Extend/replace before production: caller-supplied job list, per-request vectorizer fitting, unconstrained text/top-k schema, no defined NLP-error response, no observability/privacy policy, no corpus/version persistence, no eligibility rule layer, and no integration client.
- Add only after separate authorization/design: trusted job corpus contract, resume text ingestion, skill taxonomy/normalization, semantics/embedding evaluation, and backend-controlled access/auth.

### S. Recommended Next Step

**Single next task (no implementation yet):** produce and approve a production Job Matching input/eligibility contract: authoritative job-corpus source, exact fields used for matching versus filters, resume-text source and consent, score/error semantics, bounds, and service ownership. This follows directly from the audit because the current endpoint has no trusted corpus, no backend caller, and no eligibility/skill contract. Company / Job Posting implementation remains PAUSED until the user decides it.

### Error Handling and Privacy Summary

- Route/service code has no custom `try/except` or `HTTPException`. FastAPI/Pydantic handles malformed request validation (normally 422); empty postings is a normal 200 with `matches: []`; unhandled NLP/file/startup failures use default internal-error behavior.
- Logging records chatbot training path and service readiness only in the active source. Matching code does not explicitly log resume text or job content, but no redaction policy exists.
- There is no auth on this FastAPI service and Compose publishes port 8000. No payload-size limit or privacy retention policy exists. Resume/job text is not persisted by the active matching code, but all processing occurs in memory for the request.

### Dependencies

- FastAPI/runtime: `fastapi==0.115.0`, `uvicorn[standard]==0.30.6`, `pydantic==2.9.2`, `pydantic-settings==2.5.2`.
- NLP/ML: `scikit-learn>=1.6.1`, `pythainlp==5.0.4`, `numpy>=2.0.0`.
- Tests/HTTP: `pytest==8.3.3`, `httpx==0.27.2`.
- No PDF/OCR or embedding dependencies are declared. `numpy` is not directly imported by the checked application source; this is an audit observation only, not a removal recommendation.

### Files Audited

- `nlp-service/app/main.py`; `app/core/{config,logging}.py`; all active API, schema, service, NLP, and utility modules; `data/**`; `tests/**`; `requirements.txt`; `Dockerfile`; `README.md`; root `docker-compose.yml`; and repository search for backend/frontend integration.
- No file was modified other than this handoff document.

---

# LATEST DESIGN CONTRACT

## Production Job Matching Input / Eligibility / Output Contract v1 — Design Only

### Status and boundary

- This is a proposed Backend ↔ NLP contract, **not an implemented API change**. The current `POST /api/v1/resume-match` remains unchanged and still accepts only legacy `resume_text`, `job_postings[]`, and optional `top_k`.
- No source, NLP algorithm, endpoint, model, dependency, embedding, skill extraction, Express client, Company/Job Posting, or mock data was created or modified in this design pass.
- Company / Job Posting remains **PAUSED**. This contract must be reviewed and approved before any implementation begins.

### 1. Contract ownership and processing boundary

- Express Backend is the authoritative source and policy owner: authenticate the student, load only matching-approved Student/Profile/resume-text fields, obtain the trusted job corpus, validate the contract, apply eligibility rules, and call NLP only with minimized data.
- FastAPI NLP receives no JWT, password, email, name, student number, uploaded PDF, or database connection. It processes candidate/job matching inputs and returns ranked results only.
- Backend performs deterministic eligibility before NLP ranking; NLP performs semantic scoring only. A later approved skill subsystem may contribute a separate skill score, but no such subsystem exists now.

### 2. CURRENT source fields versus FUTURE fields

| Field | Source/status | Type and nullability | v1 role | Null handling |
| --- | --- | --- | --- | --- |
| `resume_text` | **FUTURE source**; current NLP field exists but Backend has no extracted resume text | string | required semantic input | blank/missing is invalid; do not substitute PDF metadata or invented text. |
| `major` | **REAL** `Student.major` | `string \| null` | structured eligibility | `null` is unknown; cannot pass a job that declares accepted majors. |
| `year_level` | **REAL** `Student.year_level` | `integer \| null`, model validates 1–4 | context only in v1 | sent for future policy; not scored or filtered in v1. |
| `gpa` | **REAL** `Student.gpa` | `decimal(3,2) \| null`, range 0–4 | structured eligibility | `null` is unknown; cannot pass a job with `minimum_gpa`. |
| `track` | **REAL** `Student.track` | required enum `internship \| co_op` | structured eligibility | must be supplied; no null representation. |
| `related_skills` | **REAL** `StudentProfile.related_skills` | `TEXT \| null` | optional semantic supplement only | omit from composed text if null/blank; it is not a normalized skill list. |
| `special_abilities` | **REAL** `StudentProfile.special_abilities` | `TEXT \| null` | optional, pending product/privacy approval | excluded from v1 semantic text by default; it is not a normalized skill list. |
| `job_id` | **FUTURE production source**; legacy NLP schema has `id` only | non-empty string | required result identity | invalid if missing/blank. |
| `company_name` | **FUTURE production source**; legacy NLP schema has it as output metadata | non-empty string | display metadata, not scoring | invalid if missing/blank. |
| `position` | **FUTURE production source**; legacy NLP consumes it | non-empty string | required semantic text | invalid if missing/blank. |
| `description` | **FUTURE production source**; legacy NLP consumes it | non-empty string | required semantic text | invalid if missing/blank. |
| `required_skills` | **FUTURE** | `string[] \| null` | future skill match, not v1 score | `null` means no maintained skill list; `[]` means explicitly no required skills. |
| `accepted_majors` | **FUTURE** | non-empty `string[] \| null` | structured eligibility | `null` means no configured restriction; empty array is invalid/ambiguous. |
| `minimum_gpa` | **FUTURE** | number `0..4 \| null` | structured eligibility | `null` means no configured threshold. |
| `accepted_tracks` | **FUTURE** | non-empty `("internship" \| "co_op")[] \| null` | structured eligibility | `null` means no configured track restriction; empty array is invalid/ambiguous. |

`StudentProfile` does not explicitly set `allowNull` for its free-text fields; Sequelize therefore permits null. No field above implies that a Job/Skill table already exists.

### 3. Proposed StudentInput schema

The Backend must send a purpose-limited candidate object, never the full Student/Profile record:

```json
{
  "semantic_text": "non-empty composed plain text",
  "major": "string or null",
  "year_level": "integer 1..4 or null",
  "gpa": "number 0..4 or null",
  "track": "internship or co_op",
  "related_skills": "string or null"
}
```

- `semantic_text` is required for a ranked result. Its future source is extracted, authorized resume plain text; current backend only stores resume file metadata, so production matching cannot run until that source is separately approved and implemented.
- `major`, `year_level`, `gpa`, `track`, and `related_skills` are required keys with nullable values where the current model permits null. This distinguishes an explicit unknown value from an omitted/malformed payload.
- `special_abilities` is deliberately absent from v1 input. Product/privacy approval is required before it becomes a FUTURE optional field. It must not silently be treated as job skill evidence.
- `gpa` must be serialized by Backend as a JSON number, not database-decimal string. No personally identifying field is needed for synchronous matching; Backend retains any student-to-request association itself.

### 4. Proposed JobInput schema

```json
{
  "job_id": "non-empty string",
  "company_name": "non-empty string",
  "position": "non-empty string",
  "description": "non-empty string",
  "required_skills": ["future normalized skill"] ,
  "accepted_majors": ["future canonical major"],
  "minimum_gpa": 0.0,
  "accepted_tracks": ["internship", "co_op"]
}
```

- `job_id`, `company_name`, `position`, and `description` are required v1 contract fields, but their authoritative production source is FUTURE because Company/Job Posting is paused.
- `required_skills`, `accepted_majors`, `minimum_gpa`, and `accepted_tracks` are nullable FUTURE fields. They may not be fabricated from static landing-page cards, Co-op Request snapshots, FAQ seed data, or test fixtures.
- Future data-policy rule: nullable eligibility constraint means that the job explicitly has no configured restriction. It must not be used to conceal missing/unreviewed job data.

### 5. Proposed request envelope and text composition

```json
{
  "matching_contract_version": "1.0",
  "student": { "...": "StudentInput" },
  "job_postings": [{ "...": "JobInput" }],
  "top_k": 5
}
```

- `matching_contract_version` is required and exactly `"1.0"`. `top_k` is optional, Backend default `5`, and proposed valid range is `1..50`.
- Candidate semantic text, in fixed documented order: required extracted `resume_text`; then nonblank `related_skills` as a labelled supplement. The Backend owns trimming, omission of absent segments, and provenance; it must not hardcode unverifiable labels or inject profile fields unrelated to matching.
- `special_abilities` is excluded by default. It becomes a FUTURE opt-in only after product/privacy approval and a decision that it is relevant to job recommendation.
- Job semantic text, in fixed documented order: required `position`; required `description`. This deliberately matches the active TF-IDF baseline’s real inputs.
- `required_skills` is **not** appended to semantic text in v1. It has no real source or normalized matching capability today; combining it prematurely would double-count opaque free text. It is reserved for a separately approved future skill scorer.

### 6. Eligibility rules — Backend policy before NLP

| Rule | Hard filter | Weighted-score alternative | v1 recommendation |
| --- | --- | --- | --- |
| Track | Compare `student.track` when job declares `accepted_tracks` | lower score for non-match | **Hard filter.** Placement track is a program constraint, not a semantic preference. |
| Major | Compare canonical major only when job declares `accepted_majors` | lower score for non-match | **Hard filter when declared.** A known mismatch is excluded; no restriction remains eligible. |
| GPA | Compare numeric GPA when job declares `minimum_gpa` | lower score below threshold | **Hard filter when declared.** A published minimum is an eligibility condition, so lowering rank would misrepresent eligibility. |

- Candidate `major`/`gpa` null with a corresponding declared job requirement yields **eligibility unknown**, not a zero score and not a false pass. Default ranked output includes only `eligible` jobs; Backend returns an explicit profile-completion state when nothing can be ranked for this reason.
- Job restriction null means no configured restriction. Known candidate mismatch yields `ineligible` and is excluded before NLP. `year_level` is transmitted for context but has no v1 rule because no real job year-level criterion was identified.
- Weighted structured scoring is rejected for v1 because it would let ineligible jobs appear as recommendations. Revisit only if policy explicitly treats a field as a preference rather than a requirement.

### 7. MatchingResult schema and frontend behavior

```json
{
  "job_id": "string",
  "company_name": "string",
  "position": "string",
  "rank": 1,
  "matching_score": 0.0,
  "semantic_score": 0.0,
  "skill_score": null,
  "major_score": null,
  "gpa_score": null,
  "matched_skills": null,
  "missing_skills": null,
  "reasons": null,
  "eligibility": {
    "status": "eligible",
    "track": "pass or not_applicable",
    "major": "pass or not_applicable",
    "gpa": "pass or not_applicable"
  }
}
```

- `job_id`, `company_name`, `position`, `rank`, `matching_score`, `semantic_score`, and `eligibility` are required for every returned eligible result. Rank starts at 1.
- All numeric scores use internal range `0.0..1.0`, are rounded to four decimal places at the service boundary, and are displayed by Frontend as `0..100%` only. Frontend must not re-rank from rounded values.
- In v1, `matching_score` equals `semantic_score` because only TF-IDF/cosine semantic ranking exists after hard eligibility filtering.
- `skill_score`, `major_score`, and `gpa_score` are required nullable keys in the proposed shape: use `null`, never `0`, when no such score was calculated. `major` and GPA are filters rather than scores in v1.
- `matched_skills`, `missing_skills`, and `reasons` are `null` until an approved skill/explainability capability exists. Empty arrays mean a completed calculation found none and must not be substituted for `null`.
- Frontend shows rank, company, position, formatted overall percentage, and eligibility-safe label. It must hide unavailable breakdowns/explanations, never label null as 0%, and never present an ineligible/unknown job as recommended.

### 8. Error and empty-result contract

| Case | Proposed HTTP status | Code | Required response behavior |
| --- | --- | --- | --- |
| blank/missing `student.semantic_text` | 422 | `INVALID_RESUME_TEXT` | no matching; state that usable extracted text is required. |
| empty `job_postings` | 422 | `EMPTY_JOB_SET` | input/policy error; do not silently use a fallback corpus. |
| malformed/missing required student or job field | 422 | `VALIDATION_ERROR` | include field paths, not confidential source values. |
| invalid bounds/type/enum (GPA, top-k, track) | 422 | `VALIDATION_ERROR` | include field paths and rule. |
| no eligible jobs after policy | 200 | `NO_ELIGIBLE_JOBS` in response metadata | return `matches: []` plus non-sensitive counts/statuses; this is a valid business result, not an NLP failure. |
| candidate data is unknown for all constrained jobs | 200 | `CANDIDATE_PROFILE_INCOMPLETE` in response metadata | return `matches: []`; UI prompts the student to complete required profile fields. |
| unexpected NLP processing failure | 500 | `NLP_PROCESSING_FAILED` | generic safe message/correlation ID only; do not echo resume/job text. |

Proposed common failure shape: `{"matching_contract_version":"1.0","error":{"code":"...","message":"safe user-facing message","fields":[{"path":"...","message":"..."}]}}`. For the two 200 empty outcomes, retain the normal response envelope with `matches: []` and `meta.code`.

### 9. Versioning and rollout rule

- Logical contract identifier is `matching_contract_version: "1.0"`; it protects Backend/NLP compatibility and lets result semantics evolve without guessing from fields.
- The current FastAPI endpoint is not contract v1. At implementation approval, choose and document either a new versioned endpoint or a coordinated replacement only after confirming there are no consumers. Do not silently change the legacy payload.
- Any later change to required fields, score meaning, eligibility semantics, null meaning, or ranking formula requires a new contract version and compatibility decision.

### 10. Unknown requirements and decisions requiring approval

1. Authoritative Company/Job owner, job publication lifecycle, and data-quality review process.
2. Resume text extraction method, storage/retention, consent, and whether a student can preview/correct extracted text.
3. Canonical major vocabulary and whether cross-major jobs are allowed; no mapping exists today.
4. Whether `special_abilities` has a legitimate matching purpose and explicit student consent.
5. Definitions and ownership of `required_skills`, skill taxonomy, aliases, and skill evidence; these are absent today.
6. Final eligibility policy for unknown candidate fields, including whether to show a non-recommendation “complete profile” state exactly as proposed.
7. API route/version rollout and Backend timeout/retry/auth/audit-log policy when integration is authorized.
8. Frontend copy and disclosure for score meaning; a TF-IDF similarity percentage must not be presented as employment suitability or acceptance probability.

### NEXT TASK

**Review and approve Job Matching Contract v1.** Do not start implementation automatically. Company / Job Posting remains **PAUSED**.

### Scope confirmation

- No source code was modified other than `HANDOFF_fitm-intern.md`.

---

# CURRENT STATUS — Job Matching Decision Paused

## Job Matching NLP

- The `nlp-service` technical audit is complete. Current real endpoints remain `GET /health`, `POST /api/v1/resume-match`, and `POST /api/v1/chat`.
- Current matching baseline remains PyThaiNLP `newmm` tokenization plus stopword filtering → TF-IDF → cosine similarity → raw-score threshold `0.05` → descending ranking/top-k.
- The active match endpoint still requires caller-supplied `resume_text` and `job_postings[]`, and builds job text from `position + description` only.
- Known limitations remain: per-request TF-IDF fitting; no production job corpus; no PDF text extraction/OCR/resume-text persistence; no skill extraction/taxonomy; no sentence embedding/SBERT; no persisted vectors; and no Express → NLP integration.
- Chatbot remains separate from matching: FAQ seed data, TF-IDF, and Logistic Regression. It is not a matching corpus or skill system.

## Job Matching Contract v1

**Status: REVIEW PENDING / NOT APPROVED FOR IMPLEMENTATION.**

- The preceding Contract v1 section is a design draft only. It is not an approval, final production contract, or authorization to alter the current FastAPI endpoint.
- Draft concepts under review: Backend-owned eligibility before NLP; possible `track`/`major`/`minimum_gpa` eligibility conditions; no PII/JWT/PDF sent to NLP; semantic input based on authorized `resume_text` with optional `related_skills`; `special_abilities` excluded pending a decision; job semantic input `position + description`; future-only `required_skills`; internal score range `0.0–1.0`; and nullable future capability fields such as `skill_score`, `matched_skills`, `missing_skills`, and explanations.
- `matching_contract_version: "1.0"` is a proposal under review, not a live integration contract.

## Job Matching — Decisions Pending

The user will return to decide these items before any implementation:

1. Approve or revise Job Matching Contract v1.
2. Decide final hard-filter policy for track, major, and GPA.
3. Decide whether and how the TF-IDF baseline is used for Matching v1.
4. Decide whether/when Sentence Embedding is introduced.
5. Decide skill extraction and skill-taxonomy design.
6. Decide whether resume pipeline work (frontend upload integration, PDF extraction, and `resume_text`) is authorized and in what order.
7. Decide when Company / Job Posting work returns from pause.

## Company / Job Posting

**PAUSED BY USER.** Do not begin a Company model, Job model, API, UI, job corpus, or related implementation until the user explicitly directs it. It is not a next implementation task.

## Resume Pipeline

| Capability | Status |
| --- | --- |
| Backend resume upload | REAL |
| Frontend resume-upload integration | NOT IMPLEMENTED / STATIC |
| PDF text extraction | MISSING |
| `resume_text` persistence | MISSING |
| Resume parsing | MISSING |

- Resume-pipeline implementation has not been authorized and must not start automatically.

## Coop Request — Source Verification Status

- **Source verified in the current working tree:** `CoopRequest` contains no `job_title` attribute; the Co-op Request controller input allow-list/payload has no `job_title`; and repository search found no `job_title` reference in the Co-op model, controller, route, API module, request page JS/HTML, or request CSS checked in this pass.
- **Source verified in the current working tree:** `Student` has `advisor_teacher_id` → `Teacher` association aliased `advisorTeacher`; Co-op Request detail includes that relation; and the request UI resolves the advisor display from `student.advisorTeacher`, with an explicit not-assigned fallback. It does not use `coopAdvisorTeacher` for this display.
- No runtime database sync, API acceptance, or browser verification was performed in this handoff-only pass. Those verification categories remain separate from the source evidence above; no Co-op Request code was changed in this pass.

## NEXT TASK

**Review pending Job Matching decisions with user before any implementation.**

Company / Job Posting, resume pipeline, Sentence Embedding, and skill extraction are not authorized next tasks.

## Scope Confirmation

- This pass changed only `HANDOFF_fitm-intern.md`.
- No JWT, verification token, password, SMTP key, secret, or personal authentication data was recorded.

---

# CURRENT AUTHORITATIVE STATUS — Company / Job Posting Unpaused

This section supersedes earlier handoff statements that Company / Job Posting is paused.

## Decision and boundary

- **Company / Job Posting is UNPAUSED and is the next active development area.**
- The target architecture is **Company 1 : N JobPosting**. Company identity/contact/address data must be stored once and one company can own multiple independently reviewable job postings. Do not combine a company and position into one record.
- This handoff pass completed the required pre-implementation audit only. It did **not** implement Company, JobPosting, public submission, CAPTCHA, email verification, management links, staff review, or matching.
- Existing dirty Co-op Request files were observed and left untouched. Co-op Request remains out of scope for this area.

## Pre-implementation audit — source and PostgreSQL evidence

### Recruitment page and mock data

- `frontend/index.html` links to `recruit_student.html` and `search_company.html`, but neither file exists in the current working tree. Consequently there is no current `recruit_student.html`, related module, or stylesheet to extend.
- The only current job-card corpus is the four-item `jobs` array in `frontend/src/pages/index.js`, explicitly labelled `Mockup Job`. It is rendered in the landing page only and is not backed by an API or PostgreSQL. It must not become production job data or a matching corpus.

### Company / JobPosting persistence and APIs

- No Company or JobPosting model, table, controller, route, frontend API module, or public job endpoint exists in the audited source.
- The current PostgreSQL `public` schema contains only `students`, `student_profiles`, `student_files`, `teachers`, `mentors`, `mentor_tokens`, `coop_requests`, and `coop_request_delivery_methods`; there is no table or column whose name indicates Company or JobPosting.
- `backend/src/models/index.js` automatically loads `*.model.js`; `backend/src/app.js` currently mounts only auth, student-profile, teacher, mentor, mentor-verification, and Co-op Request routes. Its development startup uses Sequelize `sync({ alter: true })`; no migration framework was found. A production-ready Company/JobPosting implementation must choose and document a safe schema-change strategy before relying on it as the source of truth.
- There is no staff/admin role model or Company/JobPosting approval capability. The existing `staff_review`, `approved`, and `rejected` references belong to the dirty Co-op Request feature, not job-posting review.

### Public-submission security, email, and management capability

- Existing no-login endpoints are only `GET /api/mentor-verification/verify`, `PUT /api/mentor-verification/profile`, and `POST /api/mentor-verification/confirm`; they are Mentor-specific and are not a Company or job-submission foundation.
- The Mentor implementation demonstrates a relevant audited pattern only: cryptographically random token generation, SHA-256 hash persistence, expiry, invalidation of prior unused tokens, and one-time use. It must be reviewed and adapted separately for company email-verification and management capabilities; it must not be repurposed by identifier alone or treated as an approved Company design.
- Nodemailer and the existing email utility are present. Mail delivery requires server-side SMTP and frontend-base-URL configuration. No values, credentials, or raw tokens are recorded here.
- No CAPTCHA provider dependency, server-side CAPTCHA verification, CAPTCHA configuration, rate-limiting dependency, or rate-limiting middleware was found. A client-side pass/fail flag is not acceptable for the intended public form.
- No public management-link token, authorization middleware, route, or lifecycle exists. Any later no-login management link must use a separate secure capability token; never use a public company/job ID, hardcode a token, log it, or record it in this handoff.

### Docker / environment audit

- Docker Compose currently runs PostgreSQL, backend, frontend, pgAdmin, and the NLP service, with development bind mounts. Backend database configuration is environment-based; the frontend has an API-base-url environment setting.
- For a future public Company submission flow, CAPTCHA secret/configuration, SMTP configuration, frontend base URL, database configuration, and a rate-limit backing-store/operation decision must be supplied securely outside source control. Do not place environment values or secrets in this handoff.

## Approved design direction awaiting implementation audit/approval

- The public form is intended to collect Company information once (name, email, phone, address, province) plus one or more JobPosting entries. Each posting must at least support title, category, description, openings, compensation, multi-select work modes (`onsite`, `work_from_home`, `hybrid`), and days per week. The exact persisted schema remains to be audited and approved before implementation.
- Intended progression: public form → backend CAPTCHA verification → validation → rate limiting → pending email verification → company email verification → staff review per JobPosting → published. CAPTCHA alone must never publish a posting.
- Candidate JobPosting lifecycle remains a design direction, not a final enum: `pending_email_verification` → `pending_review` → `published`, plus `rejected`, `withdrawn`, and `expired`.
- One email verification should cover a company submission containing multiple postings; staff may then approve/reject each JobPosting independently.
- After verification, a secure no-login management link is intended to support viewing, adding, editing, and withdrawing that company’s postings. A material edit to a published posting should return it to review; the exact transition policy remains undecided.
- Only `published` JobPosting records may be visible to students, used by job search, or supplied to the future production matching corpus. Matching targets JobPosting, never Company.

## Unchanged related decisions

- **Job Matching Contract v1 remains REVIEW PENDING / NOT APPROVED FOR IMPLEMENTATION.** Do not start NLP, TF-IDF-contract integration, embeddings, skill extraction, or matching implementation in this workstream.
- Resume status is unchanged: backend file upload is real; frontend upload integration, PDF extraction, `resume_text` persistence, and parsing are missing. Resume work is not authorized by this decision.

## NEXT TASK — decision gate before implementation

The requested audit of `recruit_student.html` and Company / JobPosting / public-submission infrastructure is now complete; it established that the named recruitment page and all Company/JobPosting infrastructure are absent, while landing-page jobs are mock-only.

Before any implementation, review this audit and explicitly approve the first implementation scope: the actual entry-page/file strategy, final Company and JobPosting schema, public-form validation, CAPTCHA provider and backend verification contract, rate-limit design, email/management-token lifecycle, staff-review authorization, and migration strategy. No application source changes are authorized by this handoff update.

## Scope confirmation for this pass

- Only `HANDOFF_fitm-intern.md` was modified.
- No Company / JobPosting or application source was implemented, changed, reverted, or deleted.
- No CAPTCHA secret, JWT, password, raw verification/management token, SMTP credential, API secret, or environment secret was recorded.

---

# CURRENT STATUS — Recruitment Frontend Structure

## Delivered frontend files

- `frontend/src/recruit_student/recruit_student.html` is the Vite recruitment page at `/src/recruit_student/recruit_student.html` and imports `/src/styles/main.css`, `/src/styles/recruit.css`, and `/src/pages/recruitStudent.js`.
- `frontend/src/pages/recruitStudent.js` is the Recruitment page controller.
- `frontend/src/styles/recruit.css` now exists.
- `frontend/vite.config.js` declares the existing root pages (`index`, `login`, `register`) plus `recruitStudent` (`src/recruit_student/recruit_student.html`) as production build entries.
- The page follows the existing frontend structure: feature HTML under `src/recruit_student` → page module under `src/pages` → page-specific stylesheet under `src/styles`; it reuses the shared navbar, KIWI logo/brand, footer, typography, color variables, focus treatment, toast UI, and loading-button utility.

## Recruitment form behavior

- The form collects Company information once plus one or more client-side Job Posting cards. A first card is always present; users can add cards, remove any card once more than one exists, and cards are renumbered after removal.
- Client-only incremental keys create unique input IDs and labels; they are not database IDs.
- Validation is client-side only and identifies required Company fields and each invalid Job Posting field independently. A valid form presents an informational shared toast stating that API submission is not active.
- `buildRecruitPayload()` prepares the future shape `{ company, jobPostings }` only. It does not fetch, POST, save to localStorage, generate a Job ID, redirect, or claim a saved submission.
- Compensation is a required text field (`compensation`), work days are integer values `1..7`, and work modes are `onsite`, `work_from_home`, and `hybrid`.

## Explicit implementation boundary

- Backend Company/JobPosting models, routes, controllers, migrations, API modules, CAPTCHA provider/verification, rate limit, email verification, management links, staff review, and job-search API remain **NOT IMPLEMENTED**.
- CAPTCHA is a clear non-interactive placeholder only; it is not a checkbox or a security assertion.
- No native `alert()` or `confirm()` is used by the recruitment page. No `search_company.html` was added.

## Baseline audit note

- The requested historical `recruit_student.html`, `search_company.html`, `style.css`, and `styles.css` were absent from the working tree and Git history at implementation time. The implemented visual baseline therefore follows the current verified KIWI shared system in `main.css` and the existing landing/auth layouts, without copying a legacy stylesheet.

## Next task

- Company / JobPosting Database + Migration Decision Gate. Do not implement that backend work until its schema and migration decision are approved.

---

# CURRENT AUTHORITATIVE STATUS — Frontend File Organization Convention

This section supersedes earlier Recruitment file-location notes where they conflict with this convention.

## Source-audited convention

The current frontend source establishes a responsibility-based pattern:

- Feature HTML is kept under `frontend/src/<feature_name>/`. Verified examples are `frontend/src/mentor_coop/mentor_verify_user.html` and `frontend/src/student_coop/student_coop.html`.
- Page behavior/controller JavaScript is kept under `frontend/src/pages/`. Verified examples are `mentor.js` and `student_coop.js`; both import their API modules and shared feedback utility rather than defining those shared concerns in HTML.
- Backend communication modules are kept under `frontend/src/api/` (for example `mentorVerification.api.js`, `mentor.api.js`, `studentProfile.api.js`, and `coopRequest.api.js`).
- Styles are kept under `frontend/src/styles/` (for example `main.css`, `mentor.css`, `student_coop.css`, and `recruit.css`).
- Reusable UI/feedback utilities are kept under `frontend/src/ui/`; `feedback.js` is the verified shared source of toast, confirmation-modal, and loading-button behavior.

## Approved convention for new frontend features

Use the following as the default after auditing the relevant feature architecture:

```text
frontend/src/<feature_name>/<feature_name>.html
frontend/src/pages/<featurePage>.js
frontend/src/api/<feature>.api.js
frontend/src/styles/<feature>.css
frontend/src/ui/            # shared/reused UI only
```

Responsibilities remain separate:

- HTML: page structure
- `pages`: DOM/page behavior and controller logic
- `api`: backend communication
- `styles`: presentation
- `ui`: reusable feedback and UI utilities

This convention keeps HTML out of the frontend root when a feature folder is appropriate, prevents API communication from accumulating in DOM/page modules, keeps styles centralized, and avoids duplicating shared UI.

Feature HTML folder/file names follow the source-established feature naming style. Use snake_case where the feature is named that way (for example `student_coop/` and the approved `recruit_student/`); preserve the current JavaScript naming convention (for example `recruitStudent.js` and `student_coop.js`). API filenames must follow the existing `src/api` convention. Do not bulk-rename existing files solely to make names uniform.

---

# CURRENT AUTHORITATIVE STATUS — Company / JobPosting Database Decision Gate

**Audit/design only, 2026-09-30. This section supersedes earlier Company/JobPosting schema suggestions. It is a proposal awaiting explicit user approval; it does not authorize implementation.**

## 1. Source audit and actual database state

- `backend/src/models/index.js` auto-loads all `*.model.js` files and calls `associate()` after loading. Current model convention is UUID PK, `underscored: true`, explicit plural `tableName`, and `timestamps: true`.
- The runtime PostgreSQL `public` schema was read directly. It contains exactly: `students`, `student_profiles`, `student_files`, `teachers`, `mentors`, `mentor_tokens`, `coop_requests`, and `coop_request_delivery_methods`. There are no `companies`, `job_postings`, `job_posting_work_modes`, Company submission, or Company-token tables. This agrees with the requested current-state assertion.
- The current dirty Co-op Request files are real, loaded by the model autoloader, mounted at `/api/coop-requests`, and present in runtime. They are out of scope and were not changed.
- Recruitment UI is read-only audited: it submits one Company object with name, email, phone, address number, optional moo, subdistrict, district, province, and one-or-more JobPosting cards. The cards use the fixed categories `information_technology`, `business`, `design`, `engineering`, `other`; compensation is free text; work days are `1..7`; work modes are the three fixed values `onsite`, `work_from_home`, and `hybrid`. `buildRecruitPayload()` has no API call.
- `Teacher` exists as a directory/academic entity, but there is no teacher authentication, role/permission middleware, staff/admin identity, or job-review authorization. Do **not** create a guessed `reviewed_by` FK.

## 2. Current schema and migration strategy

- `backend/src/app.js` always runs `sequelize.sync({ alter: true })` after connecting. No migration package, migration folder, migration script, Docker init SQL, or schema-version table exists. Docker runs the backend with a development bind mount and `npm run dev`.
- PostgreSQL confirms a concrete `alter` hazard: the one `student_files.storage_path` uniqueness declaration has accumulated many duplicate unique indexes (`student_files_storage_path_key`, `...key1`, through many numbered variants). This is direct evidence that auto-alter is unsuitable as schema control.
- Current Sequelize models do use PostgreSQL ENUMs for existing status-like fields. New Company/JobPosting lifecycle values should **not** add PostgreSQL ENUMs: adding/removing enum values safely is unnecessarily rigid for a review workflow. Use `VARCHAR(32)` plus a named PostgreSQL `CHECK` constraint, and mirror that allow-list in API validation.

## 3. Company identity and duplicate policy

**Recommendation: option C.** `companies.id` (UUID) is the durable Company identity. `normalized_email` is a verified contact address, **not** a globally unique Company identity.

- One Company can have different HR contacts over time; v1 stores one current contact email. A different HR email for the same Company is an authorized contact change, resets `email_verified_at`, revokes management tokens, and requires verification. A later `company_contacts` table is the extension point if simultaneous multi-contact management is approved.
- The same person/shared inbox can legitimately handle multiple legal companies, so global email uniqueness would reject valid use cases. The same is true for `hr@company.com`; it is a reachable contact/capability recipient, not proof of a unique business identity.
- A public submitter who only knows an email must not silently attach to or mutate an existing Company. It creates a verification-pending submission; duplicate candidates are detected and handled by staff after verification.
- Store normalized name and normalized email for lookup, both non-unique and indexed. Duplicate detection is a soft rule: score/review normalized name + address + phone + verified contact, warn staff, and merge only with an explicit staff process. Database hard uniqueness remains only for technical identities/tokens, never a guessed Company duplicate rule.

## 4. Product decisions proposed for approval

| Decision | Recommendation | Alternative | Reason / impact |
| --- | --- | --- | --- |
| Submission batch | `job_submissions` is one atomic public Company + one-or-more postings batch | direct posting creation | One email verification covers exactly the submitted batch, while each posting remains independently reviewable. |
| Compensation | `compensation_text VARCHAR(500)` | structured/hybrid compensation | Matches approved UI and supports negotiable/unspecified values without inventing pay semantics. Add structured fields only after a search/matching contract. |
| Work days | `SMALLINT` with `1..7` check | textual schedule | Matches actual requirement; a future `job_work_schedules` child table can represent weekdays/hours. |
| Work modes | child table | ARRAY/JSONB/bit flags | Portable Sequelize associations, per-mode checks/indexes, composite uniqueness, and matching/filter extensibility. |
| Category | constrained `VARCHAR(64)` | ENUM or lookup table | Use the current five UI values in a named CHECK; it is easier to migrate than PostgreSQL ENUM. Promote to lookup only when staff-managed categories are needed. |
| Address | separate text fields | normalized Thai location tables | Matches the actual UI; normalize/trim in API and use bounded fields. Province/address lookup tables are premature. |
| PK | UUID everywhere | integer IDs | Aligns with every current model and FK. Authorization still depends on verified capability/role, never ID secrecy. |
| Matching fields | no accepted-major/GPA/skills fields in v1 | add speculative fields now | Job Matching Contract v1 remains review pending. Preserve extension points only. |

## 5. Lifecycle, edit, review, and audit decisions

`job_postings.status` allowed values: `pending_email_verification`, `pending_review`, `published`, `rejected`, `withdrawn`, `expired`.

- Initial batch postings are `pending_email_verification`. A successfully consumed batch verification token transitions every still-pending posting in that batch to `pending_review` in one transaction.
- Staff may publish or reject only from `pending_review`. A rejected posting may be edited and explicitly resubmitted to `pending_review`; the current `rejection_reason` is cleared only as part of that resubmission.
- Company management may withdraw a posting from any non-terminal visible state; staff may withdraw only under a future explicit staff policy. `withdrawn` is a lifecycle state, not deletion.
- `expired` is system-driven when `expires_at <= now`; a scheduled worker/controlled query must apply it. It is not a manual Company action. Until that worker exists, public queries must independently require `expires_at IS NULL OR expires_at > now`.
- Published edits use option A: atomically save the edit and change `published → pending_review`, so changed content is never still live. The original listing temporarily disappears rather than exposing unreviewed content. A revision table can be proposed later if preserving uninterrupted live content is required.
- v1 stores `reviewed_at` and current `rejection_reason`, but defers a status-history table until a real staff actor architecture is defined. This deliberately means v1 cannot provide complete actor-attributed audit history; do not fake it with `teachers` or a generic actor now.

## 6. Token, transaction, and email decisions

- Use one `company_access_tokens` table with `purpose` constrained to `email_verification` or `management_access`. Store only SHA-256 hashes of 32-byte cryptographically random plaintext tokens; `token_hash` is unique. Fields `used_at` and `revoked_at` make consumption/revocation explicit.
- Verification token scope is one `job_submissions` row; management token scope is the Company. Verification expiry: **24 hours**, matching the existing Mentor pattern. Management-link expiry: **30 days**, renewable through a controlled resend flow. These are proposed values requiring approval.
- At issue time, lock the relevant Company/submission and revoke prior unused tokens of the same purpose/scope before creating the successor. At consume time, lock token and target rows, re-check expiry/revocation/use, mark `used_at`, and perform the state transition in one transaction.
- Persist the Company/submission/token transaction first, then send email. Email delivery failure must not roll back a committed submission or token. A rate-limited, CAPTCHA-protected resend may resend the same unexpired unused verification token; after expiry/revocation it creates a replacement and revokes its predecessor. Never put plaintext tokens in logs, DB, API responses, or this handoff.
- Public submit, verification consume, management edits, published-edit re-review, and staff review transitions need explicit transactions. An outbox/delivery-attempt table is a future reliability enhancement, not required in v1.

## 7. Final proposed schema v1 (not created)

### `companies`

| Field | Type | Null/default | Key/index | Validation/reason |
| --- | --- | --- | --- | --- |
| id | UUID | no / UUIDV4 | PK | Existing project convention. |
| name, normalized_name | VARCHAR(255) | no | index `normalized_name` | Name and normalized duplicate-review key; normalized value is application-derived, non-unique. |
| email, normalized_email | VARCHAR(254) | no | index `normalized_email` | Current contact and normalized lookup key; non-unique. |
| phone | VARCHAR(32) | no | — | API normalizes; DB enforces length only. |
| address_no | VARCHAR(50) | no | — | UI-required address part. |
| moo | VARCHAR(30) | yes | — | Optional in current UI. |
| subdistrict, district, province | VARCHAR(100) | no | index `province` | UI-required Thai address text; province supports later browse filtering. |
| email_verified_at | TIMESTAMPTZ | yes | — | Current contact verification evidence; null after contact changes. |
| created_at, updated_at | TIMESTAMPTZ | no | — | Sequelize timestamps. |

### `job_submissions`

| Field | Type | Null/default | Key/index | Validation/reason |
| --- | --- | --- | --- | --- |
| id | UUID | no / UUIDV4 | PK | Immutable public-batch identity. |
| company_id | UUID | no | FK → companies, index | Batch owner; no public authorization follows from it. |
| submitted_email, normalized_submitted_email | VARCHAR(254) | no | index normalized email | Immutable contact snapshot used for verification/audit. |
| verification_status | VARCHAR(32) | no / `pending_email_verification` | named CHECK, index | `pending_email_verification`, `verified`, `expired`, `cancelled`; separate from review/publication state. |
| submitted_at | TIMESTAMPTZ | no / current time | — | Business event, distinct from `created_at`. |
| verified_at, expired_at, cancelled_at | TIMESTAMPTZ | yes | — | Verification lifecycle events. |
| created_at, updated_at | TIMESTAMPTZ | no | — | Sequelize timestamps. |

### `job_postings`

| Field | Type | Null/default | Key/index | Validation/reason |
| --- | --- | --- | --- | --- |
| id | UUID | no / UUIDV4 | PK | Project convention. |
| company_id, submission_id | UUID | no | FK/indexes | Company ownership and originating batch. |
| title | VARCHAR(255) | no | — | API 2..255 trimmed characters. |
| category | VARCHAR(64) | no | CHECK + composite browse index | Current five UI codes only. |
| description | TEXT | no | — | API 20..20,000 characters. |
| quota | SMALLINT | no | CHECK `1..9999` | Positive available places. |
| compensation_text | VARCHAR(500) | no | — | UI-compatible free text; API 1..500. |
| work_days_per_week | SMALLINT | no | CHECK `1..7` | Primary requirement, not a schedule. |
| status | VARCHAR(32) | no / `pending_email_verification` | named CHECK + browse index | Six lifecycle values listed above. |
| submitted_at | TIMESTAMPTZ | no / current time | — | Original public submission event. |
| reviewed_at, published_at, withdrawn_at, expires_at | TIMESTAMPTZ | yes | indexes on expiry/published browse | Lifecycle timestamps; `expires_at` may initially be null pending policy. |
| rejection_reason | TEXT | yes | — | API max 2,000; latest rejection only. |
| created_at, updated_at | TIMESTAMPTZ | no | — | Sequelize timestamps. |

### `job_posting_work_modes`

| Field | Type | Null/default | Key/index | Validation/reason |
| --- | --- | --- | --- | --- |
| id | UUID | no / UUIDV4 | PK | Consistent child-table convention. |
| job_posting_id | UUID | no | FK; unique `(job_posting_id, mode)` | Cascade only when a posting is physically purged. |
| mode | VARCHAR(32) | no | CHECK; index `(mode, job_posting_id)` | `onsite`, `work_from_home`, `hybrid`; supports mode filtering. |
| created_at, updated_at | TIMESTAMPTZ | no | — | Current project convention. |

### `company_access_tokens`

| Field | Type | Null/default | Key/index | Validation/reason |
| --- | --- | --- | --- | --- |
| id | UUID | no / UUIDV4 | PK | Token-record identity only. |
| company_id | UUID | no | FK/index | Capability target. |
| job_submission_id | UUID | yes | FK/index | Required for `email_verification`; null for Company management. Enforce purpose/scope in API and migration CHECK/trigger decision. |
| purpose | VARCHAR(32) | no | CHECK + scope index | `email_verification` or `management_access`. |
| token_hash | CHAR(64) | no | UNIQUE | SHA-256 hex only; plaintext never persists. |
| expires_at | TIMESTAMPTZ | no | index | 24h verification / 30d management proposal. |
| used_at, revoked_at | TIMESTAMPTZ | yes | — | One-time consume / explicit invalidation. |
| created_at, updated_at | TIMESTAMPTZ | no | — | Sequelize timestamps. |

## 8. Relationships and state diagrams

```text
Company 1 ──< JobSubmission 1 ──< JobPosting 1 ──< JobPostingWorkMode
   │                 │
   └──< CompanyAccessToken (management)       JobSubmission ──< CompanyAccessToken (verification)
```

```text
submission verification:
pending_email_verification ──verify──> verified
          │                              │ (atomic batch transition)
          ├──expire──> expired            └── postings: pending_email_verification → pending_review
          └──cancel──> cancelled

posting review/publication:
pending_email_verification → pending_review → published → pending_review (published edit)
                                  │              │
                                  └→ rejected ──resubmit→ pending_review
                                                 └→ withdrawn
published/pending_review → withdrawn; eligible active posting → expired
```

## 9. Index, FK, and deletion decisions

- Required indexes: `companies(normalized_name)`, `companies(normalized_email)`, `companies(province)`; `job_submissions(company_id, verification_status)`; `job_postings(company_id)`, `job_postings(status, category, published_at DESC)`, and `job_postings(expires_at)`; work-mode uniqueness plus `(mode, job_posting_id)`; token lookup/expiry indexes on `token_hash`, `(company_id, purpose)`, `expires_at`. Confirm final query plans after the browse API is designed; do not index every field.
- FK policy: Company → submissions/postings/tokens is `RESTRICT`; submission → postings/tokens is `RESTRICT`; posting → work modes is `CASCADE`. There is no production Company or posting hard-delete path. A future retention purge must explicitly delete dependants in a controlled transaction.
- Do not turn on `paranoid` globally. Company uses no routine delete; JobPosting uses lifecycle status; submissions use verification status; tokens use expiry/revocation and may be purged later under a retention policy.

## 10. Migration decision and implementation plan

**Recommendation: Umzug with Sequelize**, installed only after this gate is approved. Keep migrations in `backend/src/db/migrations/`, a checked-in migration runner/config in `backend/src/db/`, and npm scripts `db:migrate`, `db:migrate:status`, and `db:migrate:undo`.

1. First establish/record a reviewed legacy baseline for the existing eight runtime tables; do not pretend `sync` history is migration history. The many duplicated `student_files` indexes require a separately approved cleanup migration.
2. Replace application startup schema mutation with `sequelize.authenticate()` only. Deploy migrations as a controlled one-off release/CI step before starting application instances. Production must never call `sync()` or `sync({ alter: true })`.
3. For development, remove `alter: true` as well. A disposable empty local database may use an explicitly invoked bootstrap command only until the baseline exists; normal dev/test environments run migrations.
4. After baseline: `001_create_companies`, `002_create_job_submissions`, `003_create_job_postings`, `004_create_job_posting_work_modes`, `005_create_company_access_tokens`, `006_add_company_job_indexes_and_checks`. Names/numbers are illustrative; final ordering follows the approved runner.
5. Down migrations reverse dependants first: token/work-mode → posting → submission → company. Never rollback a populated production release automatically; restore first if data-preserving reversal is not safe.

## 11. Future file plan (after approval only)

```text
backend/src/models/company.model.js
backend/src/models/jobSubmission.model.js
backend/src/models/jobPosting.model.js
backend/src/models/jobPostingWorkMode.model.js
backend/src/models/companyAccessToken.model.js
backend/src/db/migrations/*
backend/src/db/migrate.js
```

Later, separately authorized work would add controllers/routes, CAPTCHA and rate-limit enforcement, email/resend, management access, staff authorization/review, and `frontend/src/api/recruitStudent.api.js`. None exist or are authorized in this pass.

## 12. Risks and open questions

1. Confirm whether one current Company contact in v1 is sufficient, or approve `company_contacts` for multiple simultaneous HR managers.
2. Confirm posting-expiry business policy (required expiry date versus optional/default duration) and the scheduler/operator that transitions rows to `expired`.
3. Confirm who constitutes staff and the future authenticated actor model before adding reviewer attribution/history.
4. Confirm CAPTCHA provider, rate-limit keys/back end, resend limits, and email-delivery operational policy before public endpoints exist.
5. Decide whether 24h verification and 30-day management-link expiry are acceptable.
6. Job Matching Contract v1 is still review pending; accepted majors, minimum GPA, and skills are intentionally absent.

## 13. Decision gate summary

| Decision | Recommended | Alternative | Reason | Impact | APPROVED? |
| --- | --- | --- | --- | --- | --- |
| Company identity | UUID + non-unique verified contact email | global email unique / contacts table | supports shared inboxes and multi-company HR | duplicate review required | WAITING USER |
| Duplicate policy | soft detection + staff review | hard uniqueness | business duplicates are ambiguous | normalized indexes | WAITING USER |
| PK type | UUID | integer | matches all current models | UUID FKs | WAITING USER |
| Submission table | `job_submissions` | direct postings | batch verification boundary | one batch transaction | WAITING USER |
| Compensation | free text | structured/hybrid | current UI/requirements | no numeric filtering yet | WAITING USER |
| Work mode / days | child rows / SMALLINT 1..7 | ARRAY/text schedule | filtering and simple v1 | schedule extension later | WAITING USER |
| Category | checked VARCHAR | ENUM/lookup | current controlled UI, flexible migration | category migration for additions | WAITING USER |
| Job status | six statuses above | fewer states | separates verification/review/lifecycle | explicit transition logic | WAITING USER |
| Status storage | VARCHAR + CHECK | PG ENUM | safer lifecycle evolution | migration-defined checks | WAITING USER |
| Published edits | `published → pending_review` | revision table | no unreviewed live change | listing temporarily hidden | WAITING USER |
| Token model | hashed scoped capability token | reuse Mentor table | separate domain/scopes | new table later | WAITING USER |
| Token expiry | 24h verify / 30d management | other TTLs | bounded capability window | resend required | WAITING USER |
| Transactions/email | commit DB then deliver; resend | rollback on mail failure | preserves recoverable submission | retry controls required | WAITING USER |
| Migration tooling | Umzug | sequelize-cli/custom runner | controlled reversible migrations | package/config after approval | WAITING USER |
| `sync({alter:true})` | remove from normal startup incl. prod | dev-only alter | verified duplicate-index damage | baseline transition | WAITING USER |
| Indexes/FKs/delete | targeted indexes; RESTRICT/CASCADE; lifecycle status | broad indexes/hard delete | preserves records/FK integrity | purge policy later | WAITING USER |
| Soft delete | no global paranoid | paranoid everywhere | lifecycle is clearer | no routine hard delete | WAITING USER |
| Staff reviewer | defer FK/history | teacher/generic FK now | no authenticated staff identity | reviewer attribution pending | WAITING USER |

## Final boundary for this pass

- Company Backend: **NOT IMPLEMENTED**
- JobPosting Backend: **NOT IMPLEMENTED**
- Database Migration: **NOT IMPLEMENTED**
- Recruitment API/CAPTCHA/Staff Review/Job Matching: **NOT IMPLEMENTED**
- Source modified: **HANDOFF only**
- Next task after approval: **Company / JobPosting Database Foundation Implementation**

## Recruitment — completed structure

### Approved target structure

```text
frontend/
└── src/
    ├── api/
    │   └── recruitStudent.api.js       # FUTURE / NOT IMPLEMENTED
    ├── pages/
    │   └── recruitStudent.js
    ├── recruit_student/
    │   └── recruit_student.html
    ├── styles/
    │   └── recruit.css
    └── ui/
        └── feedback.js                 # reuse; do not duplicate
```

- Recruitment HTML target: `frontend/src/recruit_student/recruit_student.html`.
- Recruitment page JavaScript target: `frontend/src/pages/recruitStudent.js`.
- Recruitment styles target: `frontend/src/styles/recruit.css`.
- Recruitment API target, when authorized: `frontend/src/api/recruitStudent.api.js`. It is **NOT IMPLEMENTED** and was not created.

### Current real source status

- Recruitment HTML: `frontend/src/recruit_student/recruit_student.html`.
- Recruitment page JavaScript: `frontend/src/pages/recruitStudent.js`.
- Recruitment CSS exists at the approved shared-style location `frontend/src/styles/recruit.css`.
- Vite's Recruitment entry is `src/recruit_student/recruit_student.html`; the landing-page and Recruitment navbar links both resolve to `/src/recruit_student/recruit_student.html`.
- The former temporary HTML and controller paths no longer exist.
- Recruitment API module is **NOT IMPLEMENTED**. Company/JobPosting Backend, submission API, and CAPTCHA are all **NOT IMPLEMENTED**.

## Recruitment Structure Refactor

**COMPLETED.** The HTML and controller were moved to the approved locations; imports, navigation, and the Vite multi-page entry were updated without changing form behavior. No Recruitment API, Company/JobPosting Backend, submission API, or CAPTCHA implementation was added.

## Scope confirmation

- This pass moved only the Recruitment HTML/controller and updated their required frontend references plus this handoff.
- Existing unrelated dirty frontend/backend application files remain untouched.

---

# CURRENT AUTHORITATIVE STATUS — Company / JobPosting Database Foundation

**Implemented and verified on 2026-09-30.** This section supersedes the earlier “not implemented” database-foundation state only; public submission/security/review flows remain unimplemented.

## Real database foundation

- **Company Database: REAL** — `companies`
- **JobSubmission Database: REAL** — `job_submissions`
- **JobPosting Database: REAL** — `job_postings`
- **JobPostingWorkMode Database: REAL** — `job_posting_work_modes`
- **Company Access Token Database: REAL** — `company_access_tokens`
- **Migration Infrastructure: REAL** — Umzug + Sequelize storage table `sequelize_meta`.

## Files created

- `backend/src/db/migrate.js`
- `backend/src/db/migrations/001_create_companies.js`
- `backend/src/db/migrations/002_create_job_submissions.js`
- `backend/src/db/migrations/003_create_job_postings.js`
- `backend/src/db/migrations/004_create_job_posting_work_modes.js`
- `backend/src/db/migrations/005_create_company_access_tokens.js`
- `backend/src/db/migrations/006_add_company_job_indexes_and_checks.js`
- `backend/src/models/company.model.js`
- `backend/src/models/jobSubmission.model.js`
- `backend/src/models/jobPosting.model.js`
- `backend/src/models/jobPostingWorkMode.model.js`
- `backend/src/models/companyAccessToken.model.js`

## Migration and startup behavior

- `backend/package.json` provides `db:migrate`, `db:migrate:status`, and `db:migrate:undo`.
- `backend/src/app.js` no longer invokes `sequelize.sync()` or `sync({ alter: true })`; startup authenticates then serves the app. Migrations are an explicit deployment/operations step.
- All six migrations are recorded in `sequelize_meta`; a second `db:migrate` run is a no-op with zero pending migrations.
- The migrations create no Company, JobPosting, WorkMode, or token application data.
- A transient race occurred while the old running backend still had auto-sync enabled: it created the new empty tables before migrations 002–005 could record them. The backend was restarted after the startup change; the runner safely adopted those empty matching tables into version history, then applied migration 006. No production data was inserted or removed. A clean temporary database subsequently proved normal up/down behavior independently.

## Schema enforcement verified in PostgreSQL

- UUID PKs, `underscored` columns, timestamps, required/nullability, and the approved `VARCHAR` status fields are real.
- Named CHECK constraints enforce submission status, job status, category, quota `1..9999`, work days `1..7`, work mode, token purpose, token purpose/scope, and token expiry after creation.
- Named indexes include Company normalized-name/email/province lookup; submission company/status; posting Company/browse/expiry; unique posting/work-mode; and token hash/company-purpose/expiry lookup.
- FKs use `RESTRICT` for Company/Submission/Posting audit data and `CASCADE` only from JobPosting to its WorkMode rows. No reviewer FK or matching fields were added.
- Model-loading/association verification passed for Company ↔ JobSubmission, Company ↔ JobPosting, JobSubmission ↔ JobPosting, JobPosting ↔ WorkMode, and Company ↔ AccessToken.

## Rollback verification

- On a newly created empty temporary database, all six migrations ran successfully, then were reverted in dependency-safe reverse order (`006` to `001`). The expected Company/Job tables were absent afterward; only the empty Umzug metadata table remained. The temporary database was then removed.
- The existing development database was not rolled back because it is the active project database; its new tables are empty and migration history is complete.

## Known technical debt

- Existing duplicate unique indexes on `student_files.storage_path` were observed but **not modified**. They require a separately approved cleanup migration.

## Still not implemented

- Recruitment Submission API
- CAPTCHA
- Rate Limiting
- Email Verification Flow / token generation
- Company Management Flow
- Staff Review
- Job Search API
- Job Matching Contract v1 remains **REVIEW PENDING**

## Next task

**Public Recruitment Submission API + server-side validation + transaction.** CAPTCHA, rate limiting, and email verification remain separate dependency-safe phases.

---

# LATEST COMPLETED WORK

## Public Recruitment Submission API — Validation and Atomic Persistence

### Implemented backend contract

- Route: `POST /api/job-submissions`.
- The request is a strict allow-listed `{ company, jobPostings }` JSON object. It creates a new Company for every initial public submission; email is never used to locate and silently reuse a prior Company.
- Validation happens before database work. It trims stored text, normalizes email and derived duplicate-review values, maps only approved fields, and returns HTTP 400 with paths such as `company.email` and `jobPostings[1].title`.
- The service creates Company, JobSubmission, every JobPosting, and its JobPostingWorkMode child rows in one Sequelize transaction. Initial submission/posting states are both `pending_email_verification`.
- No token row, plaintext token, email, management flow, staff-review flow, public listing, CAPTCHA, or rate limiter was added.

### Production security gate

- `RECRUITMENT_SUBMISSION_ENABLED` is checked server-side for every request. It defaults to disabled; only the literal value `true` enables the route for development/integration work.
- When disabled, the route returns HTTP 503 before validation or transaction work. This is a temporary exposure gate, not a CAPTCHA or rate-limit replacement. Public production use remains **DISABLED / NOT SECURITY-READY** until CAPTCHA, rate limiting, and email verification are implemented.

### Files created

- `backend/src/config/recruitment.js`
- `backend/src/routes/jobSubmission.routes.js`
- `backend/src/controllers/jobSubmission.controller.js`
- `backend/src/services/jobSubmission.service.js`
- `backend/src/validators/jobSubmission.validator.js`
- `backend/test/jobSubmission.test.js`
- `backend/test/jobSubmission.database.test.js`

### Files modified

- `backend/src/app.js` mounts `/api/job-submissions`.
- `backend/package.json` exposes the existing Node test command.

### Verification

- `docker exec intern_backend npm test` passed: 9 tests, including validation, mass-assignment/status rejection, one/multiple jobs, work-mode children, disabled route, fake service rollback, and a real PostgreSQL transaction test.
- The PostgreSQL test deliberately throws after confirming 1 Company, 1 JobSubmission, 2 JobPostings, and 3 WorkMode rows inside the transaction. It then verifies all four counts are zero after rollback; no development data was retained.
- A live POST to the running backend while the gate was disabled returned HTTP 503 and no write occurred.
- Migration status: all 6 executed; pending 0.

### Still not implemented

- CAPTCHA and rate limiting
- Email verification token issuance, email delivery, verification endpoint, and resend policy
- Frontend API integration
- Company management, staff review, published search, and job matching

### Next task

**Public Submission Security: CAPTCHA + rate limiting + email verification.**

---

# LATEST COMPLETED WORK

## Public Recruitment Submission Security

### Security flow and routes

- `POST /api/job-submissions` now executes in this order: feature gate → IP submission limiter → strict request validation (including `captchaToken`) → server-side Cloudflare Turnstile Siteverify → Company/Submission/Posting/WorkMode/token transaction → email delivery after commit.
- `GET /api/job-submissions/verify-email?token=...` consumes a one-time email-verification token. It updates `companies.email_verified_at`, changes the matching submission to `verified`, changes only its `pending_email_verification` postings to `pending_review`, and marks the token used in one transaction.
- `POST /api/job-submissions/resend-verification` is feature-gated and rate-limited. It requires the current, unexpired, unused verification token as an opaque capability; it never accepts `submissionId` alone and never returns a token. It resends the same active verification link rather than creating a public unauthenticated renewal mechanism.

### CAPTCHA and rate limits

- Backend provider: Cloudflare Turnstile. `TURNSTILE_SECRET_KEY` is required at runtime and is never returned, logged, or committed. Siteverify uses native `fetch`, a default 5-second abort timeout, and safely handles malformed/provider/network responses. Optional expected hostname/action claims can be configured with `TURNSTILE_EXPECTED_HOSTNAME` and `TURNSTILE_EXPECTED_ACTION`.
- No CAPTCHA bypass environment flag exists. Tests inject/mimic the CAPTCHA service instead of contacting Cloudflare.
- `express-rate-limit` is scoped only to the recruitment submission/resend endpoints. Defaults are configurable: submission **5 IP requests / 15 minutes** and resend **3 IP requests / 30 minutes**. It returns HTTP 429 with standard rate-limit headers.
- `app.set("trust proxy", true)` was not added. The deployment currently uses Express's default direct-peer IP behaviour; set a specific trusted proxy policy only when the deployment topology is known.

### Token and email policy

- Each public submission atomically creates exactly one `company_access_tokens` row with `purpose = email_verification`, submission scope, SHA-256 hash only, and a configurable 24-hour default lifetime. The plaintext is 32 cryptographically random bytes and exists only in process memory while constructing the email.
- Token insertion failure and later posting failures roll back Company, JobSubmission, JobPosting, WorkMode, and token rows together.
- Verification email uses the existing Nodemailer transport and requires `PUBLIC_BACKEND_URL` to generate the functional backend verification URL. It is sent only after transaction commit.
- If email delivery fails, the committed submission and valid token remain pending; the API safely returns HTTP 202 and does not retry the original submission or disclose the token. No `submissionId`/email-only resend endpoint was introduced.

### Files created

- `backend/src/services/captcha.service.js`
- `backend/src/services/companyVerification.service.js`
- `backend/src/middlewares/recruitmentRateLimit.middleware.js`
- `backend/test/recruitmentSecurity.test.js`

### Files modified

- `backend/src/config/recruitment.js`
- `backend/src/routes/jobSubmission.routes.js`
- `backend/src/controllers/jobSubmission.controller.js`
- `backend/src/services/jobSubmission.service.js`
- `backend/src/services/email.service.js`
- `backend/src/validators/jobSubmission.validator.js`
- `backend/test/jobSubmission.test.js`
- `backend/test/jobSubmission.database.test.js`
- `backend/package.json` and `backend/package-lock.json` (`express-rate-limit` only)

### Verification

- The focused suite covers CAPTCHA missing/invalid/provider failure, submission/resend 429 limits, strict body fields, token hashing and transaction rollback, one/multiple job creation, token consume/replay/expiry/revocation, status transitions, no raw-token response, mocked email success/failure, feature gate, and real PostgreSQL transaction isolation.
- PostgreSQL integration creates and verifies a submission within one outer test transaction, proves its Company/submission/posting/token states, then forces rollback and verifies no Company, Submission, Posting, WorkMode, or token records remain.
- No real CAPTCHA request or email is issued during tests.
- No schema change or migration was created. Migration status remains 6 executed, 0 pending.

### Still not implemented

- Frontend Turnstile widget/token collection and Recruitment API integration
- Company management, staff review, published search, and job matching

### Next task

**Recruitment Frontend Integration**: Turnstile widget, `captchaToken` collection, API client, submission feedback, and verification instructions.

---

# LATEST COMPLETED WORK

## Recruitment Frontend Integration

### Implemented frontend flow

- Recruitment now explicitly renders a Cloudflare Turnstile widget from the official API script. The widget uses `VITE_TURNSTILE_SITE_KEY` only; no Turnstile secret is present in frontend source, markup, Vite configuration, or documentation.
- CAPTCHA values exist only in the `recruitStudent.js` in-memory `captchaToken` variable. They are cleared on expiry/error and the widget is reset after every request that reaches the API. No token, Company, Job, or submission information is persisted in local/session storage, cookies, or URLs.
- Added `frontend/src/api/recruitStudent.api.js`, which reuses the established `VITE_API_URL` base-url convention, posts JSON to `POST /api/job-submissions`, safely parses JSON, and retains status/data/Retry-After information for the page layer. It contains no DOM or toast logic.
- The page submits the exact backend allow-listed Company, one-to-ten JobPosting, work-mode-array, and `captchaToken` payload. The Add Job control is capped at 10 cards.

### UI and lifecycle

- Browser validation remains UX-only. A missing CAPTCHA token blocks the API call with accessible feedback.
- HTTP 201 shows a recorded-success state that asks the Company to check email; it never claims publication. HTTP 202 explicitly says data was recorded but email delivery failed, preserves the form, and disables repeat submission to avoid duplicate records.
- HTTP 400 maps backend field paths to the Company or Job card where possible. CAPTCHA failures (400/403), 429, gate-disabled 503, other 503, 5xx, and network failures receive distinct safe Thai feedback. Backend-provided internals are not shown.
- The submit button has a loading state and in-memory duplicate-submit guard. A completed 201/202 request disables repeat submission for that page session. No resend UI was added because the backend deliberately exposes no frontend-safe resend capability.

### Files created

- `frontend/src/api/recruitStudent.api.js`

### Files modified

- `frontend/src/recruit_student/recruit_student.html`
- `frontend/src/pages/recruitStudent.js`
- `frontend/src/styles/recruit.css`

### Verification

- `node --check frontend/src/pages/recruitStudent.js`, `node --check frontend/src/api/recruitStudent.api.js`, and `node --check frontend/vite.config.js` passed.
- The Vite production build passed. Recruitment output is `frontend/dist/src/recruit_student/recruit_student.html`.
- Static audit confirms no native `alert`/`confirm`, no local/session storage in recruitment code, no frontend Turnstile secret, no hardcoded backend URL in the new API module, and one official Turnstile script/container.
- A live Turnstile challenge and submission acceptance test still needs a configured non-production `VITE_TURNSTILE_SITE_KEY`, matching backend Turnstile secret, explicit `RECRUITMENT_SUBMISSION_ENABLED=true`, and a safe SMTP/test-email setup. No real CAPTCHA token or email was generated during this pass.

### Still not implemented

- Company management, staff review, published search, and job matching
- Email verification user-experience page (the working backend verification endpoint remains server/API-only)

### Next task

**Email Verification User Experience + Staff Review Architecture Audit.** Do not start Staff Review implementation until staff identity/auth and the verification UX decision are audited.

---

# LATEST COMPLETED WORK

## Recruitment Email Verification UX + Staff Review Architecture Audit

### Email verification UX

- The prior company email URL targeted the API directly: `PUBLIC_BACKEND_URL/api/job-submissions/verify-email?token=...`; its browser result was the JSON response from `GET /api/job-submissions/verify-email`.
- Company verification email now targets the Vite frontend page: `FRONTEND_URL/src/recruit_student/recruit_verify_email.html?token=...`. The existing public verify API remains `GET /api/job-submissions/verify-email?token=...` and is called by the page through the existing `recruitStudent.api.js` module.
- The page captures the query token in memory and immediately removes only `token` from the visible URL and history with `history.replaceState()`. It never logs, renders, or persists the token to local/session storage, cookies, IndexedDB, or a DOM attribute.
- UI states are loading, success, invalid, expired, unavailable, and network/server error. Success accurately says the email is confirmed and the postings are awaiting review, not published.
- Exact backend behavior audited: success is `200`; missing/malformed token is `400`; unknown token is `404`; expired token is `410` with `Verification token has expired`; used/revoked/non-pending token is the same `410` response (`Verification token is no longer valid`). The frontend does not invent a used-vs-revoked distinction that the backend does not provide.

### Resend and 202 recovery audit

- `POST /api/job-submissions/resend-verification` requires `{ "token": "<current raw verification capability>" }` in its JSON body. It accepts only a usable, unexpired email-verification token.
- Current resend sends the same valid token again. It does not revoke it or create a replacement token. Expired, used, revoked, or non-pending tokens cannot resend.
- The `202` delivery-failure path remains an open recovery gap: the database transaction and verification token are committed but the submitting organization does not possess the raw token, so it cannot invoke the capability-protected resend endpoint. No raw verification token was returned in the `202` response and no insecure workaround was added.
- Decision options: (A) a separately stored opaque resend capability, (B) a short-lived recovery secret returned only once, (C) a signed recovery capability, (D) an authenticated staff/system retry, and (E) a durable transactional email outbox with retry worker. A+B require new persistence and careful capability UX; C complicates revocation and is not preferred; D is blocked by absent staff auth; E is recommended as the primary recovery path because it preserves delivery intent without exposing a user capability, but requires an outbox schema, worker/monitoring, and a migration. This is an **OPEN DECISION**; no migration was created.

### Staff Review — audit only

| Decision | Current source evidence | Recommendation | Alternative | Needs user approval |
| --- | --- | --- | --- | --- |
| Staff identity source | No DepartmentStaff/User model or staff route exists. `Teacher` is a separate `teachers` entity. | Define a DepartmentStaff account domain. | Generic system users table. | Yes |
| Staff model/table | No staff model/table. `Teacher` has nullable email/password fields but no auth route or role. | Add `DepartmentStaff` + `department_staff` only after approval. | Extend a new generic identity system. | Yes |
| Authentication | `/api/auth/login` queries `Student` only; JWT contains `id`, `student_id`, `email`, `track`. | Implement dedicated staff login/session/JWT foundation. | A generic auth service after identity decision. | Yes |
| Role storage | Current JWT has no role; no role middleware exists. | Store server-managed explicit staff role/permissions. | Teacher `position` only if policy explicitly makes it authoritative. | Yes |
| Authorization middleware | `authenticateToken` verifies a JWT only; all current authenticated routes are student-owned. | Add backend `requireStaffReviewPermission` after staff identity exists. | None; hidden menus/URL secrecy are insufficient. | Yes |
| Reviewer FK | `job_postings` has no `reviewed_by`; no trustworthy staff account table exists. | Add FK to approved staff identity table with review schema. | Defer reviewer attribution (not recommended). | Yes |
| Review routes | No staff review route/controller/service exists. | Future `/api/staff/job-postings`, `/:id`, `/:id/approve`, `/:id/reject` following current Express routing style. | Nested staff router with same resources. | Yes |
| Per-job review | One submission has many `JobPosting`; model status is per posting. | Approve/reject each job posting independently. | None. | No |
| Approve transition | `pending_review`, `published`, `reviewed_at`, `published_at` exist. | `pending_review → published`, set reviewed/published time atomically. | None. | No |
| Reject transition | `rejected`, `reviewed_at`, `rejection_reason` exist. | `pending_review → rejected`, require bounded rejection reason and reviewed time. | None. | No |
| Concurrency | No review implementation/locking exists. | Conditional atomic `UPDATE ... WHERE id = ? AND status = 'pending_review'`, verify affected row; include audit write in one transaction. | Row lock plus status recheck. | No |
| Audit history | No review history table. | Add immutable review-event/audit table if accountability is required. | Rely only on current final-state columns. | Yes |
| Published timestamp | `published_at` exists; it is currently unset by any route. | Set only on successful approve. | None. | No |
| Expiration behavior | `expires_at` and `expired` exist but no scheduler/public search behavior exists. | Define scheduled expiration and public-search filtering together with search design. | Manual staff expiry action. | Yes |

### Identity and dependency findings

- Teacher and Staff are not confirmed as the same entity. Teacher has student-advisor associations and an informational `position`; it has neither a login endpoint nor an authoritative staff role. It must not be treated as a staff reviewer without an explicit domain decision.
- Department Staff frontend is **not implemented**: source inventory contains no staff dashboard, review menu, mock table, placeholder, or staff API module.
- The current Student JWT is insufficient for staff authorization. Therefore a reviewer FK is **not possible safely now**, and the next task must be **Staff Authentication / Authorization Foundation**, not Staff Review Backend API.
- `JobPosting` already contains `reviewed_at`, `published_at`, `rejection_reason`, and `expires_at`; it has no `reviewed_by`. Public Job Search is not implemented. Future matching must consume `published` postings only, never pending/rejected/withdrawn/expired ones.

### Files created

- `frontend/src/recruit_student/recruit_verify_email.html`
- `frontend/src/pages/recruitVerifyEmail.js`

### Files modified

- `frontend/src/api/recruitStudent.api.js`
- `frontend/src/styles/recruit.css`
- `frontend/vite.config.js`
- `backend/src/services/email.service.js`
- `HANDOFF_fitm-intern.md`

### Scope

- No database schema, migration, Staff model/table, Staff API/UI, public job search, or matching code was created.
- Verification passed: `node --check` for the new page/API/Vite config/email service, backend test suite (16 passed, 1 configured integration test skipped), Docker frontend production build, and `git diff --check`. The Vite output includes `dist/src/recruit_student/recruit_verify_email.html`.
- Browser acceptance with a newly generated authorized link remains pending. Do not expose a verification token or JWT during that test.

---

# LATEST COMPLETED WORK

## Department Staff Authentication / Authorization Foundation

### Identity, database, and account provisioning

- **Department Staff Identity: REAL.** `DepartmentStaff` is a dedicated entity and remains separate from `Student`, `Teacher`, and `Mentor`. `Teacher` was not repurposed as a staff account.
- **Department Staff Database: REAL.** Umzug migration `007_create_department_staffs.js` creates `department_staffs` with the project-standard UUID primary key, `first_name`, `last_name`, unique `email` (normalized to lowercase/trim by the model), `password_hash`, `is_active`, and Sequelize timestamps. No JobPosting reviewer field was added.
- Passwords use the existing `bcrypt` dependency and ten salt rounds. The model has a virtual `password` input only, hashes it in a hook, omits `password_hash` in JSON, and never persists plaintext.
- There is no public staff registration. `npm run staff:create` is an explicit operator-run script, requires `DEPARTMENT_STAFF_FIRST_NAME`, `DEPARTMENT_STAFF_LAST_NAME`, `DEPARTMENT_STAFF_EMAIL`, and `DEPARTMENT_STAFF_PASSWORD`, refuses `NODE_ENV=production`, and is not called during server startup. No default credentials are in source or database.

### Login and authorization

- **Staff Login Backend: REAL.** `POST /api/staff/auth/login` accepts only `email` and `password`; success returns a signed JWT and the safe staff profile (`id`, name, email, active state). It never returns `password_hash`.
- **Staff JWT Authentication: REAL.** It uses the existing `JWT_SECRET` and `JWT_EXPIRES_IN` configuration, not a second secret. Server-issued staff claims are `id`, `staff_id`, `email`, `actor_type: department_staff`, and `role: department_staff`.
- **Staff Authorization Middleware: REAL.** `authenticateToken` remains the JWT authentication layer. `requireDepartmentStaff` is a separate authorization middleware: it requires both signed staff claims and an active matching `department_staffs` row, then makes the verified identity available as `req.departmentStaff`.
- A Student JWT cannot meet the staff claim requirements; request body/header role hints are ignored. Mentor capabilities and Teacher records do not produce a staff JWT. A later account deactivation also blocks a previously issued staff token at authorization time.

### Migration and test verification

- Before migration, PostgreSQL counts were `students=4`, `job_postings=0`. Running Umzug created only `department_staffs`; afterwards those counts remained `4` and `0`, and `department_staffs=0` (no account was seeded).
- First migration run executed `007_create_department_staffs.js`; a second `db:migrate` run was a no-op. Migration status is **7 executed, 0 pending**.
- PostgreSQL schema inspection confirmed UUID primary key, unique email, non-null password hash, boolean `is_active` defaulting to true, and timestamp columns.
- Backend tests pass: 24 passed, 1 configured recruitment integration test skipped. The Staff Auth tests cover real bcrypt hashing, safe login response, unknown/wrong/inactive login rejection, staff claims, valid staff authorization, Student JWT and role-spoof rejection, missing/malformed/expired JWT rejection, and inactive-account authorization failure.

### Files created

- `backend/src/models/departmentStaff.model.js`
- `backend/src/db/migrations/007_create_department_staffs.js`
- `backend/src/services/staffAuth.service.js`
- `backend/src/controllers/staffAuth.controller.js`
- `backend/src/routes/staffAuth.routes.js`
- `backend/src/seeders/createDepartmentStaff.js`
- `backend/test/staffAuth.test.js`

### Files modified

- `backend/src/middlewares/auth.middleware.js`
- `backend/src/app.js`
- `backend/package.json`
- `HANDOFF_fitm-intern.md`

### Still not implemented

- Staff Review backend/API, approve/reject transitions, reviewer FK, audit history, and Staff Review UI
- Published Search and Job Matching
- Email outbox / 202 recovery (OPEN / DEFERRED)

### Next task

**Staff Review Backend + Staff Review UI**: review each `pending_review` JobPosting independently through the now-established DepartmentStaff authentication and authorization boundary.

---

# LATEST COMPLETED WORK

## DEVELOPMENT JOB MATCHING SEED

### Scope and data contract

- Added a development-only, fictional IT / Network / Infrastructure corpus: **10 Companies**, **10 verified JobSubmissions**, **20 published JobPostings**, and **28 JobPostingWorkMode rows**.
- The exact seed command is `npm run seed:jobs` (from `backend/`). It refuses `NODE_ENV=production` with `Development seed is disabled in production.` before connecting to PostgreSQL.
- Every demo Company is identified by its reserved `*.example` email. The Company schema has no separate Thai-name field, so the supplied English company name is stored in `companies.name`; Thai display names are deliberately omitted rather than inventing a column.
- JobPosting's current check constraint allows only five categories. All supplied IT/Network/Cloud/Cybersecurity/Data Center/Support/Telecom/IoT domains therefore map truthfully to existing `information_technology`; their detailed technical specialisation remains in `description` rather than adding a schema field.
- Job descriptions preserve matching corpus keywords including Cisco, Router, Switch, VLAN, TCP/IP, DNS, DHCP, VPN, Linux, Windows Server, Active Directory, AWS, Azure, Docker, SIEM, Firewall, IDS/IPS, Fiber Optic, Wi-Fi, VMware, Monitoring, Helpdesk, Hardware, MQTT, Sensor, Gateway, CI/CD, and UPS.

### Safety and lifecycle

- The seed writes directly through Sequelize; it does not call the public submission API, Turnstile, SMTP, or create CompanyAccessToken records.
- It uses one Sequelize transaction for the complete batch. Any error rolls back all newly staged Company, Submission, Posting, and WorkMode writes.
- Idempotency keys use the existing normalized `.example` company email and `(company_id, job title)` pair. A verified demo submission and individual work-mode row are reused if already present. No unique constraint or schema change was added.
- Demo JobSubmissions use the schema-valid `verified` status and set `verified_at`; their postings use the schema-valid `published` status with `reviewed_at` and `published_at`. This is a **development fixture only** and does not bypass the production workflow: Email Verification → Staff Review → Published.

### PostgreSQL verification

- Before seeding: 0 Companies, 0 JobSubmissions, 0 JobPostings, 0 WorkModes.
- First run created exactly 10 Companies, 10 JobSubmissions, 20 JobPostings, and 28 WorkModes. The second run created 0 of each, proving no duplicates.
- Post-seed totals and `.example` demo totals both equal 10 Companies, 10 Submissions, 20 Postings, and 28 WorkModes.
- Demo status distribution: `published = 20`. Category distribution: `information_technology = 20`. Work-mode distribution: `onsite = 16`, `hybrid = 10`, `work_from_home = 2`.
- A live association query returned published demo postings with their `.example` company, `verified` submission, and WorkMode rows. Migration status remains 7 executed, 0 pending.

### Matching readiness

- **JOB MATCHING CORPUS READY: YES** for development ranking tests. The corpus has 20 published, association-complete postings with deliberately different Network, System Administration, Cloud/DevOps, Cybersecurity, Data Center, IT Support, IoT, and Telecom skill profiles.
- No Job Search API, matching contract, TF-IDF/NLP service, embeddings, or frontend was changed in this task.

### Files created / modified

- Created: `backend/src/db/seedJobMatchingDemo.js`
- Modified: `backend/package.json`, `HANDOFF_fitm-intern.md`

### Next task

**Job Matching Integration Using Real PostgreSQL JobPostings.**

---

# CONSOLIDATED CURRENT SOURCE OF TRUTH — PRE-JOB-MATCHING BASELINE

> This section supersedes earlier historical “Next task” statements. It is the authoritative handoff baseline for the next active work area.

## A. Frontend convention and recruitment surface

- Feature HTML: `frontend/src/<feature>/`; page JS: `frontend/src/pages/`; API modules: `frontend/src/api/`; styles: `frontend/src/styles/`; shared UI: `frontend/src/ui/`.
- Recruitment is real at `frontend/src/recruit_student/recruit_student.html`, `frontend/src/pages/recruitStudent.js`, `frontend/src/api/recruitStudent.api.js`, and `frontend/src/styles/recruit.css`.
- Recruitment email verification UX is real at `frontend/src/recruit_student/recruit_verify_email.html` and `frontend/src/pages/recruitVerifyEmail.js`. It captures the token in memory, removes it from the visible URL/history, and calls the API module without persistence.

## B. Recruitment and email-verification status

- Recruitment frontend and backend are **REAL**. `POST /api/job-submissions` has strict server validation, one transaction for Company/Submission/Posting/WorkMode/token staging, backend Turnstile verification, frontend Turnstile, endpoint-specific rate limits, and the explicit `RECRUITMENT_SUBMISSION_ENABLED` feature gate. The gate is false unless its environment value is exactly `true`.
- Verification is **REAL**: a cryptographically random 32-byte raw token is SHA-256 hashed for storage, has a configurable 24-hour default expiry, is one-time, and can be revoked. Email delivery occurs after DB commit.
- Verification route: `GET /api/job-submissions/verify-email?token=...`. Resend route: `POST /api/job-submissions/resend-verification`; it requires the active raw verification capability in the request body, sends no token in a response, and does not create a replacement token.
- Company email links target `FRONTEND_URL/src/recruit_student/recruit_verify_email.html?token=...`, not the API JSON endpoint directly. Verify success transitions the submission to `verified` and only its postings to `pending_review`.
- A SMTP failure after commit returns 202 while the submission remains pending. The **202 recovery gap is OPEN**. The documented recommendation remains a transactional email outbox plus retry worker; it is **DEFERRED** and not implemented.

## C. Database and migration baseline

- Migration framework: **Umzug** with metadata table `sequelize_meta`. Startup uses `sequelize.authenticate()` only; `sync({ alter: true })` is removed from startup.
- Current Company/Recruitment/Auth models and tables include `companies`, `job_submissions`, `job_postings`, `job_posting_work_modes`, `company_access_tokens`, and `department_staffs`.
- Latest migration is `007_create_department_staffs.js`. Runtime migration audit: **7 executed, 0 pending**.

## D. Department Staff authentication

- Department Staff identity/database/login are **REAL** and are separate from Student, Teacher, and Mentor. Login is `POST /api/staff/auth/login`.
- Staff JWTs use the shared signing configuration and contain server-issued `actor_type: department_staff`, `role: department_staff`, `id`, `staff_id`, and email. `requireDepartmentStaff` separately authorizes signed staff claims and an active `department_staffs` record.
- Public staff registration and default credentials: **NONE**. Explicit non-production operator provisioning is `npm run staff:create` with required `DEPARTMENT_STAFF_*` environment variables.
- Staff Review, Staff Review UI, reviewer FK, review history, approve/reject routes, and published-search implementation are **NOT IMPLEMENTED / DEFERRED**. They are not the next active development area.

## E. Development job-matching seed and corpus

- Seed script: `backend/src/db/seedJobMatchingDemo.js`; command: `npm run seed:jobs` from `backend/`. It refuses `NODE_ENV=production`, writes through Sequelize only, uses one transaction, and is idempotent.
- Runtime audit confirms 10 `.example` demo Companies, 10 verified JobSubmissions, 20 published JobPostings, and 28 JobPostingWorkMode rows. A second seed run creates zero rows.
- `.example` is the demo identifier. Published seed data is a **DEVELOPMENT FIXTURE ONLY**; production workflow remains Submission → Email Verification → `pending_review` → Staff Review → `published`.
- Current fixture domains are Network, System Administration, Cloud, Cybersecurity, Data Center, IT Support, IoT, Telecommunications, and DevOps. Descriptions retain corpus terms including Cisco, Router, Switch, VLAN, TCP/IP, DNS, DHCP, VPN, Firewall, Linux, Windows Server, Active Directory, VMware, AWS, Azure, Docker, SIEM, IDS/IPS, Wi-Fi, Fiber, SNMP, MQTT, Raspberry Pi, and CI/CD.
- **MATCHING CORPUS READY: YES** for development. JobPosting's current category constraint maps these fixture rows to `information_technology`; technical specialisation is preserved in descriptions.

## F. Current NLP / matching reality

- Live FastAPI endpoints are `GET /health`, `POST /api/v1/resume-match`, and `POST /api/v1/chat`. Runtime health returned `{"status":"ok","service":"nlp-service"}`.
- Current resume-match input is caller-supplied JSON `resume_text`, `job_postings[]` (`id`, `company_name`, `position`, `description`), and optional `top_k`. Empty `job_postings` returns `[]`; despite an old schema description, there is no `data/processed` job fallback.
- Current algorithm is: Thai/English cleaning → PyThaiNLP `newmm` when installed (whitespace fallback otherwise) → Thai/English stopword filtering → request-local TF-IDF fit across resume plus submitted jobs → cosine similarity → filter scores below `0.05` → descending ranking → requested `top_k` or default `5`.
- Matching has no PostgreSQL JobPosting access, no Express/backend-to-NLP client or route, no skill extraction/taxonomy, no embeddings/SBERT, no persisted vectors, and no vector cache usage. FastAPI itself does not query the project database.
- The backend does have authenticated PDF resume upload metadata (`StudentFile`), but the frontend upload remains static and there is no PDF extraction, OCR, `resume_text` persistence, parser, or extracted-text record. No resume text should be invented from file metadata.

## G. Matching status and Contract v1

- Future production matching corpus must select only `job_postings.status = published` and must exclude `pending_email_verification`, `pending_review`, `rejected`, `withdrawn`, and `expired`. The 20 development published fixtures make Staff Review **not a blocker** for matching development.
- **Job Matching Contract v1: REVIEW PENDING.** It is not approved and the current FastAPI request/response is not Contract v1. Do not silently alter the legacy endpoint.
- Open questions for the next task: exact Contract v1 fields; authorised resume source; PDF-extraction location; corpus fields; whether v1 is TF-IDF-only or includes structured skills; score normalization/threshold; top-k; Express↔NLP API boundary; and whether Express sends selected jobs or NLP queries a database. No preferred architecture is approved by this documentation pass.

## H. Next active development area

```text
Published JobPostings from PostgreSQL
        ↓
Backend integration/service
        ↓
NLP Service
        ↓
matching score/ranking
        ↓
Top JobPostings
        ↓
Frontend
```

**NEXT ACTIVE TASK: Job Matching Integration Using Real PostgreSQL JobPostings.**

Do not substitute Staff Review, Staff Review UI, Email Outbox, or Company Management for this active task. Any Job Matching implementation must first audit and obtain a decision on Contract v1 and the resume-text source.
