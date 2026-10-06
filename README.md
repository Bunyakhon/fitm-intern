# FITM-INTERN

ระบบสนับสนุนงานสหกิจศึกษาของ FITM สำหรับข้อมูลนักศึกษา ผู้แนะนำในสถานประกอบการ คำร้องสหกิจ และการจับคู่งานจากทักษะหรือ Resume โดยยังอยู่ระหว่างพัฒนา workflow ของแต่ละบทบาท

## Project Status

**STAGING / TEST READY**

**PRODUCTION READY: NO**

Staging setup เคยผ่านการตรวจบน private LAN ตามประวัติที่ยืนยันแล้ว ณ 2026-10-06 แต่ **VM ปัจจุบัน powered OFF และเข้าใช้งานไม่ได้ในรอบนี้** สถานะ readiness ไม่ใช่การยืนยัน availability ปัจจุบันหรือความครบถ้วนของทุก workflow

## Main Features

**Implemented** — มีเส้นทางทำงานจริงใน source สำหรับขอบเขตต่อไปนี้:

- สมัครและเข้าสู่ระบบนักศึกษาสหกิจด้วย JWT; อ่าน/แก้ไข profile และรูปประจำตัว
- ค้นหาบริษัท ตรวจชื่อบริษัทซ้ำ และอ่านรายชื่ออาจารย์
- สร้าง อ่านรายละเอียด/ประวัติ และยกเลิกคำร้องสหกิจของตนเอง
- Recruitment สาธารณะ: form หลายตำแหน่งงาน → Turnstile → transaction → อีเมล Brevo → ยืนยันอีเมล → `pending_review`; มีปุ่มส่งอีเมลซ้ำเมื่อการส่งขัดข้อง
- Staff backend: login/profile, ตรวจประกาศและ publish/reject พร้อมประวัติผู้ตัดสินใจ, ตรวจและส่งต่อ/ปฏิเสธคำร้องสหกิจ
- Teacher backend: login/profile และตรวจคำร้องเฉพาะนักศึกษาที่เลือกตนเป็น `advisor_teacher_id`
- Department Head backend: Teacher identity พร้อมสิทธิ์ชัดเจน, profile, ค้นหา/แก้ไขอาจารย์ในภาค, ตั้ง project advisor และตัดสินใจคำร้องขั้นสุดท้าย

**Partial / In Progress:**

- Resume PDF: upload, text extraction และ OCR มี implementation; ยังต้องทดสอบ persistence/OCR ผ่านบัญชีนักศึกษาและ browser
- Job matching: เชื่อม Backend → NLP แล้วและเลือกเฉพาะงาน `published`; Staff publish API มีแล้ว ส่วน landing search/filter และ dashboards ยังต้องเชื่อม frontend
- Mentor CRUD และ token confirmation: มี API/หน้าเว็บ; ต้องทดสอบอีเมลและ valid-token browser flow
- Local Recruitment: Turnstile configured (ผู้ใช้ยืนยัน widget สีเขียว), Brevo connectivity ผ่าน; การ submit และคลิกลิงก์จาก inbox จริงยังต้อง manual acceptance ส่วน VM provider configuration ยังไม่ยืนยันเพราะ offline
- Staff/Teacher/Head dashboards, เอกสาร/PDF และ evaluation ยังต้องพัฒนา; role schema ใหม่ผ่าน isolated tests แต่ยังไม่ได้ apply กับ Local/VM
- Daily log, หัวข้อโครงงาน, book/poster upload และย้ายบริษัทเป็น UI ที่ยังไม่มี persistence; landing job search/chatbot เป็นข้อมูลหรือคำตอบสาธิต
- NLP chatbot/standalone resume matching มี endpoint แต่ยังไม่เชื่อม frontend; Google login เป็น placeholder

## Architecture

```text
Browser
  └─ Nginx (Ubuntu host :80)
       ├─ /              → Frontend (Vite :5173)
       ├─ /api/*         → Backend (Express :5000)
       └─ /health/db     → Backend /health/db
                              ├─ Sequelize → PostgreSQL :5432
                              ├─ HTTP → NLP Service :8000
                              └─ Files → intern_storage volume
```

Backend → NLP ใช้ internal Docker network ผ่าน service `nlp-service` สำหรับ job ranking และ Resume OCR; PostgreSQL ไม่ได้เรียก NLP โดยตรง ส่วน local development เปิด Frontend/Backend ผ่าน port ของแต่ละบริการได้

## Technology Stack

| ส่วน | เทคโนโลยี |
| --- | --- |
| Frontend | Vite 8, multipage HTML/CSS/JavaScript, Tailwind CSS 4, Axios |
| Backend | Node.js, Express 5, Sequelize 6, Umzug 3, JWT, Multer, Nodemailer |
| Database | PostgreSQL 16 |
| NLP | Python, FastAPI, PyThaiNLP, scikit-learn TF-IDF/cosine, Tesseract OCR; ไม่ใช้ LLM |
| Runtime | Docker, Docker Compose; local pgAdmin สำหรับดูแล DB |
| Staging entry | Nginx บน Ubuntu host |
| Version control | Git / GitHub |

## Repository Structure

```text
backend/
  src/config/         Configuration
  src/controllers/    API handlers
  src/routes/         API routes
  src/models/         Sequelize models
  src/db/migrations/  Umzug migrations
  src/services/       NLP, email, verification services
  src/middlewares/    Auth, upload, rate limiting
  src/seeders/        Teacher/staff setup scripts
  test/               Backend tests
frontend/
  src/api/            Shared Axios client and API modules
  src/pages/          Page logic
  src/styles/         Stylesheets
  src/ui/             Shared feedback UI
nlp-service/
  app/                FastAPI and NLP implementation
  data/               NLP data; sensitive/large files are ignored
  tests/              NLP tests
docker-compose.yml
README.md
HANDOFF_fitm-intern.md
```

Checkout มี `frontend/.env.example` สำหรับชื่อ configuration ของ Vite/Turnstile; ยังไม่มี root/backend examples, `deploy.sh` หรือ Nginx config ข้อมูล deployment ด้านล่างอ้างอิงประวัติ VM ต้องตรวจ revision/ไฟล์จริงก่อนใช้

## Recruitment and Role APIs

Recruitment ไม่ต้อง login: `POST /api/job-submissions` รับ company, 1–10 jobs, work modes และ CAPTCHA. Backend ตรวจ feature gate, rate limit, whitelist และ Cloudflare Siteverify (`success`, configured hostname; action optional และ Local ไม่ได้ตั้งค่า) ก่อนเขียน transaction. Token อีเมลเป็น random 256-bit, เก็บเฉพาะ SHA-256 พร้อม expiry/use-once. Email ใช้ Brevo transport เดียวกับ Mentor และ link ไป `recruit_verify_email.html`; frontend ส่ง `POST /api/job-submissions/verify-email` แล้วงานเข้าสู่ `pending_review` เพื่อรอ Staff.

SMTP failure ตอบ 202 และเก็บ submission; browser ส่งซ้ำผ่าน `POST /api/job-submissions/resend-verification` ด้วย HttpOnly/SameSite cookie ที่ใช้ได้เฉพาะ resend. ตรวจ frontend origin และ rate limit, rotate token ใน transaction; ไม่ส่ง verification token ใน response. Recovery ใช้ same-site hosting เช่น localhost คนละ port; cookie หมดอายุตาม verification TTL หรือ browser session ที่ล้าง cookie ต้องใช้ลิงก์ล่าสุด/ติดต่อผู้ดูแล. GET verification และ resend ด้วย existing valid email token ยังรองรับ compatibility.

| Actor / namespace | APIs available |
| --- | --- |
| Staff | `POST /api/staff/auth/login`, `GET /api/staff/auth/me` (alias `/api/staff/me`); `GET /api/staff/job-postings` and `/:id`, `POST /:id/publish` or `/:id/reject` |
| Teacher | `POST /api/teachers/auth/login`, `GET /api/teachers/me`; directory เดิม `GET /api/teachers` ยังอยู่ |
| Department Head | `POST /api/department-head/auth/login`, `GET/PATCH /api/department-head/me`; `GET /teachers`, `PATCH /teachers/:id`, `PATCH /students/:id/coop-advisor` ภายใต้ namespace นี้ |
| All three role namespaces | `GET /coop-requests`, `GET /coop-requests/:id`, `POST /coop-requests/:id/approve` or `/reject` |

Lists รองรับ `status`, `limit` (1–100), `offset`; Head teacher search รองรับ `q`, exact `department`/`major`, `status` ตามค่าใน DB ไม่บังคับ IT/INE. Mutation body whitelist: approve `{}` หรือ `{reason}`, reject ต้องมี non-empty reason; teacher update รับ first/last name, email, major, department ในภาคเดียวกัน, password ผ่าน bcrypt (8+ characters, ≤72 UTF-8 bytes). Head own profile รับ name/email/password; assignment body `{coop_advisor_teacher_id: "<teacher UUID>"}`.

`Student MAY select advisor_teacher_id` ของอาจารย์ที่มีอยู่และ active. Teacher review ตรวจ relationship นี้จาก DB ณ เวลาตัดสินใจ; การเปลี่ยน class advisor โอนสิทธิ์ตรวจคำร้องที่ยังรอ advisor โดยประวัติเดิมคง actor เดิม. `coop_advisor_teacher_id` แยกต่างหากและ Head ตั้งให้ Co-op student เท่านั้น. Head scope ใช้ภาคของ class advisor เพราะ Student ไม่มี department column; นักศึกษาที่ยังไม่มี class advisor ต้องเลือกก่อนใช้งาน Head workflow.

```text
Teacher: submitted | advisor_review → staff_review (approve) / rejected (reject)
Staff:   staff_review → department_head_review (approve) / rejected (reject)
Head:    department_head_review → approved (approve) / rejected (reject)
Staff job review: pending_review → published / rejected
```

JWT แยก actor/role; Student JWT เดิมยังใช้ได้และ JWT ใหม่ระบุ Student ชัดเจน. Teacher/Head ใช้ Teacher identity เดียวกัน โดย role เป็น `teacher` หรือ `department_head`; Head สามารถทำหน้าที่ class advisor ผ่าน Teacher APIs ได้เฉพาะนักศึกษาที่เลือกตน. Guards ตรวจบัญชี/active และสิทธิ์ Head ใน DB ทุกครั้ง. Free-text `position` ไม่ให้สิทธิ์; migration เริ่ม `is_department_head=false` ทุกบัญชี และไม่มี API ที่ promote role. หลัง migration และเตรียมบัญชีแล้ว ผู้ดูแลกำหนดสิทธิ์ที่ตั้งใจด้วย `node src/seeders/setDepartmentHead.js grant|revoke <teacher UUID>` ใน backend; ไม่ได้ provision/change บัญชีจริงในรอบนี้.

**Activation:** source/API และ isolated acceptance complete; Local ยังมี pending `007a`, `010`, `011`. ต้องใช้ procedure backup/schema review ใน handoff ก่อน normal Umzug rollout และ bootstrap Head ด้วยบัญชีที่ผู้ดูแลเลือก จึงจะใช้ role APIs กับ Local DB ได้. ไม่มี dashboard ในรอบนี้.

## Local Development

พัฒนาหลักบน Windows โดยติดตั้ง Git และ Docker ที่ใช้ Linux containers; Node.js/Python รันใน Docker ได้ ก่อนเริ่มให้ตั้งค่า environment และตรวจ Compose ซึ่งเป็น configuration สำหรับ development

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose exec -T backend npm run db:migrate:status
```

Frontend local: `http://localhost:5173` ตรวจ backend/database ที่ `http://localhost:5000/health/db` และ NLP ที่ `http://localhost:8000/health`

คำสั่ง start ไม่ได้สร้าง schema อัตโนมัติ: backend startup ใช้ `authenticate()` ไม่ใช้ `sync()`. สำหรับ DB ใหม่ต้องตรวจ/วางแผน migration ก่อนใช้งาน ส่วน DB เดิมต้องตรวจ ledger และ schema ก่อนดำเนินการ; โดยเฉพาะ local ที่ 007a pending ทั้งที่มี base tables แล้ว ให้ดู [Development Handoff](./HANDOFF_fitm-intern.md) ก่อน

## Environment Configuration

ใช้ root `.env`, `backend/.env`, `frontend/.env`; ไฟล์จริงถูก gitignore เก็บค่าเฉพาะใน environment ของผู้ดูแล ไม่ใส่ secret ในเอกสารหรือ Git

| กลุ่ม | Variable names |
| --- | --- |
| Root / PostgreSQL | `POSTGRES_PASSWORD` |
| Backend runtime / DB | `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| Auth / frontend origin / storage | `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `STORAGE_ROOT` |
| Backend → NLP | `NLP_SERVICE_BASE_URL`, `NLP_SERVICE_TIMEOUT_MS`, `NLP_OCR_TIMEOUT_MS` |
| Recruitment / Email | `RECRUITMENT_SUBMISSION_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Turnstile backend | `TURNSTILE_SECRET_KEY`, `TURNSTILE_EXPECTED_HOSTNAME`, `TURNSTILE_EXPECTED_ACTION`, `TURNSTILE_TIMEOUT_MS` |
| Frontend | `VITE_API_URL`, `VITE_TURNSTILE_SITE_KEY` |

VM รายงานใช้ examples ทั้งสามระดับ; checkout นี้มี frontend example เท่านั้น. Compose local ปัจจุบันมีค่าคงที่ของ DB และ `VITE_API_URL` ใน `environment`; การสร้าง `.env` อย่างเดียวไม่แทนค่าคงที่ใน Compose ต้องตรวจ config ที่ใช้จริงก่อนเริ่มบริการ

`VITE_API_URL` ต้องเป็น base origin ที่ browser เข้าถึงได้ โดย API modules เติม `/api/...` เอง; สำหรับ staging ผ่าน Nginx อย่าเติม `/api` ซ้ำใน base URL หรือใช้ localhost ของเครื่องผู้เปิดเว็บ ตัวแปร `VITE_*` เปิดเผยต่อ browser จึงห้ามเก็บ secret และยังไม่มี Google OAuth environment contract ใน implementation ปัจจุบัน

## Docker Services

| Service / Container | Purpose | Port |
| --- | --- | --- |
| `postgres` / `intern_postgres` | PostgreSQL 16, DB `intern_system` | 5432 |
| `backend` / `intern_backend` | Express API | 5000 |
| `frontend` / `intern_frontend` | Vite development server | 5173 |
| `nlp-service` / `intern_nlp_service` | FastAPI / PyThaiNLP / OCR | 8000 |
| `pgadmin` / `intern_pgadmin` | DB administration ใน local Compose; VM status ไม่ได้ยืนยันบริการนี้ | 5050 → 80 |

Nginx ใช้ host port 80 บน VM และไม่ได้อยู่ใน Compose checkout นี้

## Database Migrations

Umzug อ่านไฟล์ `backend/src/db/migrations/*.js` ตามลำดับชื่อ และ SequelizeStorage บันทึก filename ที่ executed ใน `sequelize_meta`. สถานะ ledger ไม่ได้ยืนยันความตรงกันของ schema

```text
001_create_companies.js
002_create_job_submissions.js
003_create_job_postings.js
004_create_job_posting_work_modes.js
005_create_company_access_tokens.js
006_add_company_job_indexes_and_checks.js
007_create_department_staffs.js
007a_create_missing_base_tables.js
008_add_resume_extraction.js
009_add_coop_request_company_job_links.js
010_cleanup_student_file_schema_drift.js
011_add_role_workflow_reviews.js
```

007a เป็น compatibility/backfill migration สำหรับเติม base-table migration history/schema creation support: สร้างแปด base tables ที่ยังไม่มี แต่ข้ามทั้งตารางหากชื่อนั้นมีอยู่แล้ว จึงไม่ได้ซ่อม schema drift ของตารางเดิม และ `down()` ไม่ลบ base tables

010 ตรวจ actual columns/index signatures และ dependencies ของ `student_files.storage_path`, เก็บ UNIQUE ที่ valid หนึ่งชุด และลบเฉพาะ constraints ที่ซ้ำกันภายใน transaction. Clean DB ที่มีหนึ่งชุดเป็น no-op; ไม่แก้ข้อมูลหรือ `submitted_at` และ `down()` รักษา uniqueness โดยไม่สร้าง duplicates กลับ

011 เพิ่ม `teachers.is_department_head` (false), `coop_request_reviews`, `job_posting_reviews` และ queue/advisor indexes ใน transaction. Audit ใช้ Teacher/Staff FKs แยกพร้อม CHECK ให้ตรง role/transition/reason; reviewer และ review evidence ไม่ถูกลบผ่าน cascade. DOWN ย้อน schema ได้เฉพาะเมื่อไม่มี review history หรือ Head privilege; หากมีจะ refuse และ rollback โดยไม่ลบหลักฐาน.

| Environment | สถานะล่าสุด |
| --- | --- |
| Staging VM (historical evidence only) | เคยยืนยัน **10 executed / 0 pending** และ apply 007a สำเร็จ; **VM schema verification = NOT VERIFIED — VM OFFLINE**; 010 ยังไม่ deploy/apply |
| Local Windows DB (latest read-only check) | **9 executed / 3 pending (007a, 010, 011)**; ยังไม่ได้ apply remediation/role schema |
| Disposable clean DB verification | **12 executed / 0 pending**; 001–011, empty 011 DOWN/UP และ transactional DDL failure ผ่านแล้ว; historical 001–010 rehearsal ยังคง 11/0 |

ตรวจ migration status และ environment schema ก่อน migration operation ห้าม apply 007a โดยตรงตามจำนวน pending อย่างเดียว หลัง backup/schema validation ให้ reconcile 007a ผ่าน Umzug ปกติก่อน 010 ตามลำดับชื่อ; 007a ไม่ซ่อม drift เอง รายละเอียดขั้นตอนอยู่ใน handoff การเพิ่ม 010 ใน source ไม่ได้เปลี่ยน DB จริง และเมื่อ VM รับ revision นี้ pending status จะต้องตรวจใหม่

## Staging Deployment

```text
Windows edit → git push → GitHub → Ubuntu VM → ./deploy.sh → staging test
```

Repository: `git@github.com:Bunyakhon/fitm-intern.git`, branch `main`. VM ตามข้อมูลผู้ดูแล: Ubuntu 26.04.1 LTS, static private LAN IP `192.168.10.137`; ติดตั้ง Git, Docker, Docker Compose, Codex CLI และ Nginx แล้ว ไม่ติดตั้ง Node.js บน host เพราะรันใน Docker

Browser entry ตาม deployment history: **http://192.168.10.137** เป็น private LAN staging address ไม่ใช่ production public endpoint ผลผ่าน API/DB/NLP/Frontend/Nginx/reverse proxy และ browser access จาก Windows เป็น historical evidence เท่านั้น **VM ปัจจุบัน powered OFF** จึงไม่ได้เชื่อมต่อ ตรวจ schema หรือ deploy ในรอบนี้

## deploy.sh

Workflow ตามรายงาน VM: ตรวจ `.env` และ Git working tree → `git pull --ff-only origin main` → `docker compose config --quiet` → build → start PostgreSQL และรอ healthy → `npm run db:migrate` → start containers → `npm run db:migrate:status` → health checks Backend/Database/NLP/Frontend

ใช้ `./deploy.sh` บน VM ที่มี script และตรวจ environment/schema แล้วเท่านั้น Script มีขั้นตอนเขียน schema; ไม่ใช้เป็นคำสั่งเริ่ม local ที่ยังมี migration mismatch. เนื่องจาก script ไม่อยู่ใน checkout นี้ จึงยังไม่ได้ตรวจ source ของ script เทียบกับ workflow ที่รายงาน

## Nginx

| Route | Upstream บน VM |
| --- | --- |
| `/` | Frontend :5173 |
| `/api/*` | Backend :5000 โดยคง `/api` prefix |
| `/health/db` | Backend :5000 `/health/db` |

Nginx รันบน host และเป็น browser entry point; Backend → NLP ใช้ Docker network โดยตรง

## Testing / Verification

ผลล่าสุดวันที่ 2026-10-06: Backend/migration acceptance รันใน isolated Docker/PostgreSQL, frontend build ใหม่; NLP ไม่ได้แก้และไม่ได้รันซ้ำ

| Check | Result |
| --- | --- |
| Backend tests | Full isolated suite **104 passed, 0 failed/skipped**, เปิด integration ทั้งหมด; default Compose suite ข้าม DB opt-ins เพื่อรักษา Local data |
| Recruitment tests | **27 passed**: validation/provider/rate limit, real HTTP/DB verification, safe SMTP recovery, expired/used tokens และ rollback |
| Role tests | **39 passed**: auth/actor separation, application route loading, advisor/department scope, state machine, concurrent actions, audit constraints, safe password reset |
| Migration-specific tests | 010 suite **11 passed**; 011 UP/DOWN/UP, injected DDL rollback, refusal to erase history/privileges และ constraints รวมอยู่ใน role suite |
| Frontend build | **PASS**; seven HTML outputs |
| NLP tests | **14 passed, 2 failed** |

NLP failures เป็น chatbot test setup/lifespan issue: `TestClient` ไม่เริ่ม lifespan training จึงใช้ classifier ที่ยังไม่ train. Running chat endpoint ตอบ HTTP 200 ได้ แต่ test suite ยังไม่ green และยังไม่ได้ยืนยัน intent quality

คำสั่ง verification ที่มีจริง (migration integration จะ skip ตามปกติจนเปิด opt-in บน disposable environment ที่มี safety marker; วิธีทดสอบอยู่ใน handoff):

```powershell
docker compose exec -T backend npm test
docker compose exec -T frontend npm run build
# Full isolated acceptance, requires local backend and postgres:16-alpine images:
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/runIsolatedWorkflow.ps1
```

NLP ใช้ `pytest -q` ใน environment ที่ติดตั้ง dependencies และมี `nlp-service/tests` อยู่ด้วย; standard running container ล่าสุดไม่มี `/app/tests`. Authenticated browser flows, company inbox link click และ resume/OCR persistence ยังต้องมีบัญชีและข้อมูลทดสอบที่เหมาะสม. Isolated runner สร้าง private network/tmpfs DB เฉพาะรอบ, mount source/tests read-only, ไม่ mount .env/storage/Local volumes และลบเฉพาะ resources ที่มี ownership label ของรอบนั้น

## Security Notes

- เก็บ secrets ใน `.env`; ห้าม commit password, JWT secret, SMTP credentials, Turnstile secret หรือ verification/private tokens
- Compose checkout มี development credential defaults ที่ต้องเปลี่ยนก่อนใช้งานจริง; การใส่ `.env` อย่างเดียวไม่ override ค่าคงที่เหล่านี้
- Staging Docker ports อาจยังเปิด `0.0.0.0:5000/5173/8000/5432`; target คือ bind แต่ละ port ที่ `127.0.0.1` ให้ Nginx เป็น entry point และตรวจ pgAdmin ด้วยหากเปิดใช้งาน
- Port lockdown, UFW และ HTTPS/domain ยัง pending; development servers ของ Vite/nodemon/Uvicorn reload ยังไม่ใช่ production deployment
- CORS จำกัด configured FRONTEND_URL origin และอนุญาต credentials สำหรับ resend; parser/workflow errors ไม่เปิด stack/SQL/provider diagnostics. Student เลือก `advisor_teacher_id` ที่ active ได้ และ Teacher approval ตรวจ relationship นี้จริง; JWT ผิดบทบาทไม่ผ่าน privileged guards

## Current Staging Status

Availability ล่าสุด: **VM powered OFF / inaccessible**; `VM schema verification = NOT VERIFIED — VM OFFLINE`. รายการที่ผ่านด้านล่างเป็นประวัติ setup/deployment ที่ยืนยันแล้ว ไม่ใช่ live health checks

| รายการ | สถานะ |
| --- | --- |
| VM availability ในรอบนี้ | OFFLINE — powered OFF |
| Static IP; Git/GitHub SSH | ✅ |
| Docker; Docker Compose | ✅ |
| PostgreSQL healthy; VM migrations (10/0) | ✅ |
| Backend; Frontend; NLP | ✅ |
| deploy.sh; Nginx; Reverse Proxy; browser access จาก Windows | ✅ |
| Test Data / Accounts | Pending |
| Docker Port Lockdown; UFW | Pending |
| SMTP; Cloudflare Turnstile | Pending |
| Google OAuth VM configuration (implementation ยังไม่มี) | Pending |
| HTTPS / Domain | Pending |

## Production Readiness

**PRODUCTION READY: NO** ต้องเตรียม test accounts และยืนยัน browser workflows, reconcile migration/schema ของแต่ละ environment, แก้ NLP test setup, ปิด workflow gaps ที่ต้องใช้จริงและทบทวน role authorization ก่อน production

งาน deployment ที่ยังต้องทำ: port lockdown/UFW, secrets และ CORS/error handling, SMTP/Turnstile, OAuth หากอยู่ใน scope, HTTPS/domain, production frontend serving และ runtime configuration, database/file backup พร้อมทดสอบ restore, monitoring และ production hardening

## Project Documentation

- `README.md`: stable project/deployment overview สำหรับผู้เปิด repository ครั้งแรก
- [Development Handoff](./HANDOFF_fitm-intern.md): current implementation state, audit evidence, backlog และ next task; อ่าน current authoritative section ด้านบนก่อน historical notes
