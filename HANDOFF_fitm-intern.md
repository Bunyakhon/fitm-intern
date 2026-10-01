# fitm-intern — HANDOFF (Updated)

### Resume PDF extraction, OCR, and weighted matching — 2026-10-01

- Resume upload remains `POST /api/student-profile/resume` (`resume`, PDF only, 10 MB). On replacement, extraction columns reset before processing. Native `pdf-parse` text is normalized and accepted only when it meets the reusable length/character usability check. OCR runs only when native text is insufficient.
- Backend sends stored PDF bytes to the internal NLP `POST /api/v1/resume-ocr` endpoint with a 20 second abort timeout. The NLP service accepts PDF bytes only, caps size at 10 MB, renders no more than 5 pages at 150 DPI, normalizes/caps text at 20,000 characters, and uses Tesseract `tha+eng`. OCR response contains only text, method, and processed page count; failures are safe HTTP errors and do not log OCR text.
- Added migration `008_add_resume_extraction.js`: nullable `extracted_text`, `extraction_method`, `extraction_status`, `extracted_at`. It was applied to the development PostgreSQL database. StudentFile model has matching attributes and validated method/status strings.
- Upload response returns only original filename, MIME type, file size, extraction status, and method. No extracted text or storage path reaches the frontend. Extraction/OCR failure leaves the uploaded PDF in place and matching falls back to profile signals.
- Matching no longer opens or OCRs the PDF on requests. It reads only the authenticated student's cached `StudentFile.extracted_text` when status is `ready`. NLP v1 keeps `candidate.text`; optional `candidate.resume_text` enables `(profile * 0.65) + (resume * 0.35)` scoring. Profile-only and resume-only inputs retain 100% weight when used alone. `TOP_K=5`, `MIN_SCORE=0.05`, four-decimal rounding, and deterministic tie ordering remain.
- Frontend preserves existing Job Matching cards/progress/skeleton behavior, updates its description, and reports native extraction, OCR, or fallback status without displaying extracted text.
- Changed/added: Backend controller/model/client/migration/matching tests; NLP OCR endpoint, weighted schema/service, dependencies, Dockerfile and matching tests; frontend upload feedback/description; Compose timeout; this handoff. The pre-existing uncommitted UI/API styling, backend package change, and Compose edits were preserved.
- Verification: Backend syntax checks and `backend/test/jobMatching.test.js backend/test/resumeText.test.js`: **16 passed**. Frontend JS syntax and `docker exec intern_frontend npm run build`: **PASS**. `python -m compileall`: **PASS**. Development migration `008`: **APPLIED**. `git diff --check`: **PASS**.
- NLP image rebuild: **PASS**. `tesseract --list-langs` inside `intern_nlp_service`: **eng, tha, osd**. Final targeted container tests (`test_job_matching.py`, `test_resume_matching.py`, `test_resume_ocr.py`): **14 passed**. OCR tests cover invalid PDF safety, the five-page cap, and extracting “PYTHON” from a generated scanned PDF fixture. Weighted tests cover profile/resume combination, min-score-after-weighting, and profile retention when resume tokenization is empty.
- Acceptance closeout (2026-10-01): a one-page image-only Thai/English Resume-like PDF sent through the running NLP endpoint returned `method=ocr`, `page_count=1`, normalized text with Thai characters, and `Windows`, `Network`, `DNS`, and `Hardware`. Native PDF text was empty. `tesseract --list-langs` returned `eng`, `tha`, `osd`; the OCR route invokes `tha+eng`. Runtime Thai and English OCR: **PASS**. OCR request handler emits no OCR content logs.
- Backend targeted tests: **16 passed**. Relevant NLP tests (`test_job_matching.py`, `test_resume_matching.py`, `test_resume_ocr.py`): **14 passed**. Frontend build: **PASS**. Migration `008` appears in `sequelize_meta`; no pending migration. `git diff --check`: **PASS**.
- Authenticated text-PDF upload/persistence and scanned-PDF upload/persistence plus rendered matching remain **PENDING** because no authenticated student session was available. Matching reads ready cached `extracted_text` and has no OCR call; tests cover profile-only, resume-only, missing/failed resume fallback, and 422 when neither source is usable. Repeated live authenticated match requests were not run.
- Thai OCR runtime: **PASS**; English OCR runtime: **PASS**; text PDF native extraction: **PASS** (existing acceptance baseline; authenticated persisted upload still pending); scanned PDF OCR: **PASS** through NLP OCR endpoint; Tesseract languages: **tha + eng**; OCR runtime language: **tha+eng**.
- OCR on every Job Matching request: **NO**; extraction persistence via authenticated upload: **PENDING**; weighted matching: **PASS** (65/35 and single-source cases covered by tests); migration: **008 applied / no pending**.
- Authenticated text-PDF acceptance: **PENDING**; authenticated scanned-PDF acceptance: **PENDING**.
- AI methods: no embeddings, vector DB, or LLM.

### Resume PDF text matching — 2026-10-01

- Resume upload endpoint already existed and the current Student Dashboard upload now confirms that extracted text will be included in matching. Success copy: “อัปโหลดเรซูเม่เรียบร้อยแล้ว เรซูเม่จะถูกนำมาร่วมวิเคราะห์ตำแหน่งงาน”. The panel explains fallback to profile fields when no PDF is present. Text-based PDFs only; scanned/image PDFs and OCR are not supported.
- Backend Job Matching candidate is built in this order: `Student.major` + `StudentProfile.related_skills` + extracted Resume PDF text when available. Candidate text is normalized and capped at 20,000 characters while preserving profile text first.
- Backend reads only the authenticated student’s `StudentFile` resume, requires `mime_type === "application/pdf"`, resolves with `resolveStoragePath()`, and checks the resolved file remains in that student’s resume directory. Only plain candidate text is sent to existing NLP; no binary, filename, or storage metadata is sent.
- Missing PDF, unsafe/unreadable PDF, extraction error, or empty extracted text falls back to major + related skills. The safe warning is `Resume text extraction failed; falling back to profile text`. With no usable text anywhere, API retains `422 MATCH_CANDIDATE_TEXT_REQUIRED`.
- Dependency added: `pdf-parse@^2.4.5` (CommonJS API, supports the Node 20 Docker base when Node is >=20.16). Service: `backend/src/services/resumeText.service.js`; text-based PDF extraction only, no OCR.
- Files modified for this work: `backend/package.json`, `backend/package-lock.json`, `backend/src/controllers/jobMatching.controller.js`, `backend/test/jobMatching.test.js`, `frontend/src/student_coop/student_coop.html`, `frontend/src/pages/student_coop.js`, `HANDOFF_fitm-intern.md`. The frontend upload wiring/API file and unrelated UI/dock-compose changes were already uncommitted before this task and were preserved.
- Matching tests: **PASS**, 14 passed, 0 failed using `node --test --test-isolation=none backend/test/jobMatching.test.js` (covers profile-only, extracted resume, resume-only, absent/failed/empty extraction, 422, public response privacy, and published-only filtering).
- Syntax checks for the specified Backend and Frontend files: **PASS**. `git diff --check`: **PASS**.
- `docker exec intern_frontend npm run build`: **PASS** (Vite v8.2.2; existing production inputs still omit the Student Dashboard page, as previously documented).
- Backend image rebuild and `docker compose up -d backend`: **PASS**. The running Backend uses a mounted `node_modules` volume, so `docker exec intern_backend npm install --omit=dev` was also required to expose the lockfile-pinned dependency. Backend syntax checks and `docker exec intern_backend node --test test/jobMatching.test.js`: **PASS**, 14 passed, 0 failed.
- Real authenticated upload → match → rendered results and Resume/profile comparison: **PENDING**; no authorized student session available.
- Backend changed: **YES**. NLP changed: **NO**. Migration added: **NO**. Resume PDF upload endpoint: **EXISTING / CONNECTED**. PDF text extraction: **IMPLEMENTED**. Embeddings, vector DB: **NOT IMPLEMENTED**. OCR: **NOT IMPLEMENTED**.

> ใช้ไฟล์นี้สำหรับเปิด ChatGPT/Codex แชทใหม่และทำงานต่อจากสถานะล่าสุดโดยไม่ย้อนทำงานเดิมซ้ำ

## PROJECT ROOT
C:\Users\suran\Documents\มอส\term31\pre-project\fitm-intern

## CURRENT STATUS

### Resume PDF Upload Frontend → Backend — 2026-10-01

- Resume PDF upload is connected to the existing authenticated `POST /api/student-profile/resume` endpoint using multipart field `resume` and the shared `apiRequest()` client.
- Frontend validation requires PDF MIME type and `.pdf` extension, with a 10 MB maximum. Duplicate clicks are guarded; the button shows a loading state. Success displays the returned original filename and file size when present, plus the existing toast.
- `400` responses map to safe PDF/size messages; `404` displays the missing-student message; `401` clears existing authentication and redirects to login. Other failures use a generic safe message.
- The panel now describes the upload as connected and states that Job Matching still uses student major and related skills; PDF text extraction is **NOT IMPLEMENTED** and resume content is not used for matching.
- Backend changes: **NONE**. Existing endpoint and file validation are reused.
- Real authenticated PDF upload acceptance: **PENDING**; no authorized student session was available during implementation.
- Files changed for this task: `frontend/src/api/studentProfile.api.js`, `frontend/src/pages/student_coop.js`, `frontend/src/student_coop/student_coop.html`, `HANDOFF_fitm-intern.md`.
- `node --check frontend/src/api/studentProfile.api.js`: **PASS**.
- `node --check frontend/src/pages/student_coop.js`: **PASS**.
- `git diff --check`: **PASS**.
- `docker exec intern_frontend npm run build`: **PASS** (Vite v8.2.2; the existing production inputs still omit the Student Dashboard page, as previously documented).

### Job Matching loading UX — 2026-10-01

- Added a visible 0–100% frontend request-wait indicator with a large percentage and filling bar. It advances to at most 95% while the existing `POST /api/job-matches/me` is pending; only a real successful response starts the final animation to 100% and the “วิเคราะห์เสร็จแล้ว” state. The percentage is explicitly described as waiting feedback, not actual NLP progress.
- Error stops timers below 100%; each new request resets to 0%. Existing request guard, `setButtonLoading()`, supporting Thai text, three skeleton cards, and result/empty/error transitions remain. Timers are cleared on completion/error; reduced-motion shortens the bar transition.
- No additional request, backend/API/ranking/score/PDF logic, or fake delay before response was added. The 300 ms visibility hold starts only after the successful response reaches 100%.
- Changed: `frontend/src/student_coop/student_coop.html`, `frontend/src/pages/student_coop.js`, `frontend/src/styles/student_coop.css`, `HANDOFF_fitm-intern.md`.
- Verification: `node --check frontend/src/pages/student_coop.js`, `git diff --check`, and `docker exec intern_frontend npm run build` all **PASS**.

### CURRENT AUTHORITATIVE STATUS — 2026-10-01

- Job Matching Backend ↔ NLP v1: **PASS**; existing real backend acceptance: **PASS** (unchanged).
- Frontend Job Matching Integration: **IMPLEMENTED**.
- Frontend implementation: **PASS**.
- Static/integration verification against the running local stack: **PASS**; see the follow-up verification below. This does not mark authenticated matching or real browser rendering as verified.
- Static/build verification and mocked DOM/API behavior verification: **PASS**.
- Frontend real authenticated browser/API acceptance: **PENDING**. No authorized Student session or browser tooling was available in this pass; no JWT was accessed or recorded.
- Student Dashboard combines “อัปโหลดเรซูเม่” + “ค้นหาสถานประกอบการ” into one sidebar button “ค้นหาสถานประกอบการ”, targeting `panel-job-matching` through the existing `.sidebar-item[data-target]` pattern. The old search placeholder handler and `panel-resume` target are removed.
- Explicit first search action: “ค้นหาตำแหน่งที่เหมาะกับฉัน”; after a successful response the action becomes “วิเคราะห์ใหม่”. A request guard and the existing shared `setButtonLoading()` prevent concurrent requests.
- `frontend/src/api/jobMatching.api.js` calls `POST /api/job-matches/me` with request body **NONE**. Existing `api/client.js` supplies the Bearer JWT. No manual Authorization header, candidate fields, student ID, NLP options, job list, or direct NLP request was added.
- Matching input remains backend-owned: `Student.major + StudentProfile.related_skills`; `top_k = 5` and `min_score = 0.05` remain unchanged.
- The source summary reuses `currentStudent` / `currentStudentProfile`, refreshes with profile rendering or panel entry, and links to the existing profile panel for edits. Missing values display “ยังไม่ได้ระบุ”.
- Results use only real API responses, preserve backend ordering/rank, display scores as percentages to two decimals, show company/province and every work mode, and render optional fields only when present. Backend strings use `createElement()` / `textContent`.
- Distinct inline loading, result, empty-success, and error states are implemented. `401` uses existing authentication cleanup/redirect; `403`, `404`, `422`, `502`, `503`, `504`, and default errors receive safe Thai messages without internal error details. Failed refreshes clear stale results and unlock retry.
- Resume UI is in the same panel; `resumeFile`, `uploadResumeBtn`, `resumeMessage`, and existing PDF validation/placeholder behavior are preserved. The UI states that resume upload is not backend-connected and Resume PDF is **NOT** used by Job Matching yet.
- Removed the existing successful profile-load console log that printed sensitive Student/Profile data.

Files created: `frontend/src/api/jobMatching.api.js`.

Files modified: `frontend/src/student_coop/student_coop.html`, `frontend/src/pages/student_coop.js`, `frontend/src/styles/student_coop.css`, `HANDOFF_fitm-intern.md`.

Verification commands and results:

- `node --check frontend/src/api/jobMatching.api.js`: **PASS**.
- `node --check frontend/src/pages/student_coop.js`: **PASS**.
- `rg -n '\b(alert|confirm)\s*\(' frontend`: no native dialog calls found.
- `git diff --check`: **PASS**.
- `docker exec intern_frontend npm run build`: **PASS**, Vite v8.2.2.
- Audit found the existing `vite.config.js` production inputs exclude Student Dashboard. Additional build, without writing output or changing configuration: `docker exec intern_frontend node --input-type=module -e "import { build } from 'vite'; import config from './vite.config.js'; config.build.rollupOptions.input = { studentCoop: '/app/src/student_coop/student_coop.html' }; config.build.write = false; await build({ ...config, configFile: false });"`: **PASS**, 14 modules transformed.
- Temporary in-memory `node --input-type=module` VM harness using the current matching source and mocked DOM/API: **PASS** for source summary, loading/busy, concurrent-request guard, safe text/XSS rendering, backend order, score formatting, multiple work modes, empty success, all error statuses/default, malformed success envelope, retry unlock, 401 cleanup/redirect, profile navigation, single sidebar target, and bodyless API call. Fixtures were test-only; no mock jobs were added to the application. Initial harness run hit a Windows stdin Thai-encoding assertion issue; the ASCII-only rerun passed.
- Final `git status --short` / `git diff` review: only the five intended files changed. Backend, NLP, migrations, shared client/feedback/main.css, landing mock data, and Vite config unchanged.

Blockers / next safe task:

- Implementation blocker: **NONE**. Real acceptance awaits an authorized Student browser session. Verify the actual bodyless POST, existing Bearer authentication without exposing the JWT, real results, responsive layout, retries, and profile changes followed by re-analysis.
- Before a production deployment, resolve the pre-existing Vite input omission for Student Dashboard in a separate packaging task; the standard production build does not emit this page. The additional no-write build verifies compilation only.

Deferred issues (unchanged):

- PDF text extraction: **NOT IMPLEMENTED**.
- Skill extraction/taxonomy: **NOT IMPLEMENTED**.
- Embeddings: **NOT IMPLEMENTED**.
- Persisted vectors: **NOT IMPLEMENTED**.
- Vector DB: **NOT IMPLEMENTED**.
- Staff Review, Reviewer FK, Staff Review UI: **DEFERRED**.
- Email transactional outbox: **DEFERRED**.
- Existing unrelated chatbot test failures: **PRE-EXISTING**, **UNRELATED TO JOB MATCHING**, **DEFERRED**. Not rerun or fixed in this frontend task.

### Job Matching Frontend → Express — local stack follow-up (2026-10-01)

- Read the requested matching source/HANDOFF and reviewed `git status` / `git diff` before work. Existing wiring was correct; no source rewrite or integration bug fix was needed.
- Express mounts `/api/job-matches`; the router defines authenticated `POST /me`, producing `POST /api/job-matches/me`. The controller queries published jobs only, builds the candidate server-side, calls NLP, validates ranking, and enriches the expected display fields.
- Frontend `.env`, Compose frontend environment, and the Vite-served client resolve Express at `http://localhost:5000`; Dashboard dev URL is `http://localhost:5173/src/student_coop/student_coop.html`. `jobMatching.api.js` delegates to `apiRequest()` with POST only. Existing `client.js` owns the stored student JWT/Bearer header; no frontend NLP call or payload fields were added.
- Existing `intern_frontend`, `intern_backend`, `intern_postgres`, and `intern_nlp_service` were running; PostgreSQL reported healthy. No restart, new container, credential, token, account, seed, or migration was created.
- Read-only live HTTP checks using `node --input-type=module`: Dashboard HTML, page module, API module, and client module all **200**; Express root **200**; Express `/health/db` **200** with status `ok`; NLP `/health` **200**. The served Dashboard includes the matching panel and page entry, and its page module calls the API and result renderer.
- Live CORS check: `OPTIONS http://localhost:5000/api/job-matches/me` with Origin `http://localhost:5173`, requested method POST and header authorization returned **204**; allow-origin, POST, and authorization header checks passed. A bodyless unauthenticated POST returned **401** with the expected CORS allow-origin header.
- Actual current frontend API/client code was evaluated in an in-memory Node VM against live Express, with no stored token and the existing fallback API URL. `getMyJobMatches()` issued POST to the exact Express endpoint; assertions confirmed body `undefined` and no request Content-Type. `apiRequest()` propagated status **401**. Only the Vite-specific `import.meta.env` expression was substituted for this Node check; application source was unchanged. This verifies the live unauthenticated boundary, not an authenticated success response or browser execution.
- `docker exec intern_backend node -e` with a read-only fetch to `http://nlp-service:8000/health`: **200**, verifying Backend → NLP connectivity on the existing Docker network. No matching payload was sent directly to NLP.
- `docker exec intern_backend node --test test/jobMatching.test.js`: **PASS**, 10 tests passed, 0 failed/skipped. Tests cover published filtering, normalized candidate/minimal payload, enrichment, empty results, student authorization, missing student/candidate, invalid NLP results/order, dependency timeout/unavailability, and safe internal failures. They use test dependencies and do not establish a real authenticated PostgreSQL → NLP matching success in this pass.
- `node --check frontend/src/api/jobMatching.api.js`: **PASS**.
- `node --check frontend/src/pages/student_coop.js`: **PASS**.
- `docker exec intern_frontend npm run build`: **PASS**, Vite v8.2.2. The previously recorded Dashboard production-input omission remains unchanged; dev serving was verified above.
- `git diff --check`: **PASS**. Existing uncommitted frontend work is preserved. The pre-existing `docker-compose.yml` diff removes `DB_USER`; this follow-up did not edit or revert that change, and the current running Backend database health check passed.
- Files changed in this follow-up: **`HANDOFF_fitm-intern.md` only**. Backend changed: **NO**. NLP changed: **NO**. Migrations changed: **NO**.
- Frontend implementation: **PASS**. Static/integration verification: **PASS**. Real authenticated browser/API acceptance: **PENDING**. No authorized student session or browser tool was available; no credentials were invented and no JWT was read, printed, or recorded. Real ranked-response rendering in a browser was **NOT VERIFIED** in this follow-up.
- Next safe task: use an authorized Student session to open the Dashboard matching panel and verify the bodyless Bearer POST, actual ranked response/cards, scores/company/province/work modes, and refresh behavior. Preserve the existing deferred issues and the separate production packaging task.

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

# JOB MATCHING BACKEND ↔ NLP v1 — FRONTEND READY

**BACKEND ↔ NLP JOB MATCHING v1: FRONTEND READY**

- Public endpoint: `POST /api/job-matches/me`.
- Authentication: required. Send the existing student JWT as `Authorization: Bearer <token>`. Missing/invalid tokens return `401`; authenticated non-student actors return `403`.
- Request body: none. The existing frontend `apiRequest` client can call the path with `{ method: "POST" }`; no request `Content-Type` is required when no body is sent.
- Candidate source: trimmed `Student.major + StudentProfile.related_skills`. At least one must contain usable text; otherwise the backend returns `422`.
- PostgreSQL rule: Express queries `JobPosting` with `status = "published"` only. Non-published jobs never enter the NLP payload. If there are no published jobs, Express returns `200 { "matches": [] }` and does not call NLP.
- Internal NLP endpoint: `POST /api/v1/job-matches`, with `schema_version: "job-matching.v1"`.
- Algorithm: PyThaiNLP `newmm` → stopwords → TF-IDF → cosine similarity.
- Options: `min_score: 0.05`, `top_k: 5`.
- Deterministic ranking: score descending, then `job_posting_id` ascending; rank is 1-based and contiguous. The threshold is applied before `top_k`, scores are finite values in `0..1` rounded to four decimals, and Express rejects duplicate/unknown IDs, malformed ranks/scores/order, or more than five returned matches.
- Express owns PostgreSQL. The NLP service has no PostgreSQL access. NLP returns only `job_posting_id`, `score`, and `rank`; Express safely enriches results from the original published query.

Success response (nullable database-backed display fields remain safely nullable where applicable):

```json
{
  "matches": [
    {
      "job_posting_id": "80605832-7190-4aa4-b43a-ffafdba31165",
      "score": 0.3187,
      "rank": 1,
      "title": "IT Helpdesk Intern",
      "description": "Job description",
      "category": "information_technology",
      "quota": 3,
      "compensation_text": "350 baht/day",
      "work_days_per_week": 5,
      "company": { "name": "Example Company", "province": "Chiang Mai" },
      "workModes": [{ "mode": "onsite" }]
    }
  ]
}
```

- Empty success response: `200 { "matches": [] }`.
- Frontend-relevant errors: `401` missing/invalid/expired JWT (existing auth response); `403 STUDENT_AUTHORIZATION_REQUIRED`; `404 MATCH_STUDENT_NOT_FOUND`; `422 MATCH_CANDIDATE_TEXT_REQUIRED`; `502 NLP_MATCHING_INVALID_RESPONSE`; `503 NLP_MATCHING_UNAVAILABLE`; `504 NLP_MATCHING_TIMEOUT`; `500 JOB_MATCHING_INTERNAL_ERROR`. Responses contain safe messages and no stack traces, secrets, internal URLs, token values, SQL details, or Python exception internals.
- Configuration: backend uses `NLP_SERVICE_BASE_URL` (Compose: `http://nlp-service:8000`) and `NLP_SERVICE_TIMEOUT_MS` (Compose/default: `5000`). The client has an explicit abort timeout and no automatic retry.
- PDF extraction: **NOT IMPLEMENTED**.
- Embeddings/vector DB: **NOT IMPLEMENTED**.
- Frontend integration: **IMPLEMENTED**; see CURRENT AUTHORITATIVE STATUS above. Frontend real acceptance remains **PENDING**.
- Migrations added: **NONE**.
- Real acceptance: **PASS**. Authenticated Student → Express → PostgreSQL published jobs → NLP v1 → deterministic ranking → Express enrichment returned `200`; NLP `/health` returned `200`; 20 usable published fixtures were present; 3 matches were returned; every returned ID belonged to the published query; result count was at most 5; ranks were contiguous; and no internal fields leaked.
- Backend tests: **34 passed, 1 skipped** (the existing opt-in PostgreSQL transaction integration test).
- Targeted NLP Job Matching tests: **7 passed**.
- Full NLP suite: **8 passed, 2 failed**. The two failures remain the pre-existing/unrelated chatbot tests whose test client does not execute classifier-training application lifespan; deferred and unchanged. No Job Matching regression was found.
- `git diff --check`: **PASS**.

## NEXT ACTIVE TASK

Real authenticated Student Dashboard Job Matching acceptance; separately resolve the existing production Vite input omission before deployment.

### Job Matching progress timing refinement — 2026-10-01

- Request-wait progress now eases from 0% toward a 95% ceiling over about five seconds. If the API succeeds sooner, the UI waits out the remaining visual duration before animating to 100%; a slow request holds at 95%.
- Success shows “วิเคราะห์เสร็จแล้ว” at 100% for 400 ms before transitioning to results or the empty state. Errors stop the progress timers and retain the existing error state without reaching 100%.
- Each guarded request resets to 0%. This remains frontend-only feedback; the API call and matching behavior are unchanged.
