from pathlib import Path
from collections import Counter
import json,re
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'docs/audits'
DATE='2026-10-10'

def evidence(fe,be,db,test,ev='E-LOCAL'):
    return [fe,be,db,test,ev]
student={
1:evidence('frontend/login.html; register.html; src/pages/login.js; register.js','backend/src/controllers/auth.controller.js → registerStudent/loginStudent; POST /api/auth/register; /api/auth/login','students (Student); bcrypt hooks','No dedicated Student auth unit suite found; E-DAY/E-SUP login subcases'),
2:evidence('frontend/src/pages/student_coop.js → profile/student info forms','backend/src/controllers/studentProfile.controller.js; GET/PUT /api/student-profile/me; PUT /student-info','students; student_profiles','backend/test/studentAdvisor.test.js; frontend/test/studentAdvisor.test.js'),
3:evidence('frontend/src/pages/student_coop.js; api/studentProfile.api.js → uploadStudentResume','backend/src/middlewares/upload.middleware.js; studentProfile.controller.js → uploadResume; POST /api/student-profile/resume','student_files + private filesystem; extraction columns migration 008','backend/test/resumeUpload.test.js; resumeText.test.js; nlp-service/tests/test_resume_ocr.py'),
4:evidence('frontend/src/pages/student_coop.js → skills/resume matching','backend/src/controllers/jobMatching.controller.js → getMyJobMatches; POST /api/job-matches/me; nlpMatching.client.js → POST /api/v1/job-matches','students; student_profiles; student_files; job_postings; companies; job_posting_work_modes','backend/test/jobMatching.test.js; nlp-service/tests/test_job_matching.py'),
5:evidence('frontend/src/pages/student_coop.js → create/cancel request','backend/src/controllers/coopRequest.controller.js → createCoopRequest/cancelCoopRequest; POST /api/coop-requests; PATCH /api/coop-requests/:id/cancel','coop_requests; coop_request_delivery_methods; coop_request_prerequisite_courses; coop_request_reviews','backend/test/coopDirectWorkflow.test.js; roleWorkflow.database.test.js; frontend/test/studentCoopAcceptance.test.js'),
6:evidence('frontend/src/pages/student_coop.js → request detail/cancellation reason; company response read-back','GET /api/coop-requests/me; /:id; /:id/company-response; coopRequest.controller.js; companyResponse.controller.js','coop_requests; coop_request_reviews; company_responses; coop_documents (Staff only)','frontend/test/companyResponse.test.js; studentCoopAcceptance.test.js; backend/test/roleWorkflow.database.test.js','E-CANCEL / E-DOC'),
7:evidence('frontend/src/pages/student_coop.js → advisor selection','backend/src/services/coopProjectAdvisor.service.js → select/read; POST/GET /api/student-coop/project-advisor-request','coop_project_advisor_requests; students.coop_advisor_teacher_id; teachers; migration 014','backend/test/coopProjectAdvisor.database.test.js; frontend/test/studentCoopProject.test.js'),
8:evidence('frontend/src/pages/student_coop.js → confirmed advisor display','coopProjectAdvisor.service.js → read; GET /api/student-coop/project-advisor-request','coop_project_advisor_requests; students; no explicit acknowledgement field found','frontend/test/studentCoopProject.test.js; backend/test/coopProjectAdvisor.database.test.js'),
9:evidence('frontend/src/pages/student_coop.js → project topic save','backend/src/services/studentCoopProject.service.js → saveTopic; GET/PUT /api/student-coop/project','coop_projects.topic; migration 013','backend/test/studentCoopProject.database.test.js; frontend/test/studentCoopProject.test.js'),
10:evidence('frontend/src/pages/student_coop.js → Mentor form','backend/src/controllers/mentor.controller.js; GET/PUT/DELETE /api/mentors/me; POST /api/mentors','mentors; mentor_tokens; hash-only capabilities','backend/test/roleWorkflow.database.test.js; E-DAY Mentor verification regression'),
11:evidence('frontend/src/pages/studentInternshipLog.js; internshipLogView.js','backend/src/services/internshipLog.service.js → save/submit/overview; /api/internship-logs/days/:date; /weeks/:date/submit','internship_daily_logs; internship_weeks; internship_week_events; internship_review_tokens; migration 018','backend/test/internshipLogs.database.test.js; internshipLogRules.test.js; frontend/test/studentInternshipLog.test.js','E-DAY'),
12:evidence('frontend/src/pages/studentCompanyEvaluation.js','backend/src/services/companyEvaluation.service.js → read/save; GET/PUT /api/student-coop/company-evaluation','company_evaluations; students; mentors; migration 015','backend/test/companyEvaluation.database.test.js; companyEvaluationContext.test.js; frontend/test/studentCompanyEvaluation.test.js'),
13:evidence('frontend/src/pages/student_coop.js → project-book upload/preview','backend/src/services/studentCoopProject.service.js → upload/preview; POST /api/student-coop/project-book; GET /project-files/:id/preview','student_files.file_type=coop_project_book; private project-books storage; migration 013','backend/test/studentCoopProject.database.test.js; frontend/test/studentCoopProject.test.js'),
14:evidence('frontend/src/pages/student_coop.js → poster upload/preview','studentCoopProject.service.js → upload/preview; POST /api/student-coop/poster','student_files.file_type=coop_poster; private posters storage; migration 013','backend/test/studentCoopProject.database.test.js; frontend/test/studentCoopProject.test.js'),
15:evidence('frontend/src/pages/index.js → sendMessage returns development message; no service call','nlp-service/app/api/v1/chatbot.py → POST /api/v1/chat; services/chatbot_service.py; no Express bridge','faq_seed.json; TF-IDF + LogisticRegression in memory; no student document DB query','nlp-service/tests/test_chatbot.py (runtime BLOCKED: pytest missing); static lifespan concern','E-NLP'),
16:evidence('frontend/src/pages/student_coop.js → company picker; public search_company.html absent','backend/src/controllers/coopRequest.controller.js → searchCompanies; GET /api/coop-requests/companies/search','companies; published job_postings; request company snapshots','backend/test/coopRequestCompany.test.js; frontend/test/studentCoopAcceptance.test.js'),
}
staff={
1:evidence('frontend/src/pages/staffDocuments.js; staffCoopRequests.js','backend/src/services/staffDocuments.service.js → list/detail; roleWorkflow.service.js → listRequests; GET /api/staff/coop-requests; /document-requests','coop_requests; coop_request_reviews; coop_documents; company_responses','backend/test/staffDocuments.database.test.js; roleWorkflow.database.test.js; frontend/test/staffDocuments.test.js; staffCoopRequests.test.js','E-CANCEL / E-DOC'),
2:evidence('frontend/src/pages/staffCoopRequests.js → reasoned confirmation; student_coop.js cancellation reason','backend/src/services/roleWorkflow.service.js → reviewRequest; POST /api/staff/coop-requests/:id/cancel','coop_requests; coop_request_reviews; existing migrations 007a/011/012; no new migration','backend/test/roleWorkflow.database.test.js; coopDirectWorkflow.test.js; frontend/test/staffCoopRequests.test.js; studentCoopAcceptance.test.js','E-CANCEL'),
3:evidence('frontend/src/pages/staffDocuments.js → draft/edit/generate/preview/download HTML','backend/src/services/staffDocuments.service.js → mutate/content; /api/staff/document-requests/:id/documents/:type; coopDocumentTemplate.js → renderDevelopmentLetter','coop_documents; coop_document_revisions; company_responses; company_response_history; migrations 016/017','backend/test/staffDocuments.database.test.js; frontend/test/staffDocuments.test.js; companyResponse.test.js','E-DOC'),
4:evidence('No Staff chatbot UI found','No authenticated document-status chatbot route/service found','No chatbot document-status query','No corresponding acceptance found','NONE'),
5:evidence('No Company CRUD dashboard; current Staff page documents/calendar only','roleWorkflow.service.js → listJobs/reviewJob; GET /api/staff/job-postings; POST /:id/publish or /reject; no Company admin CRUD','companies; job_postings; job_posting_reviews','backend/test/recruitmentLifecycle.database.test.js; roleWorkflow.database.test.js'),
6:evidence('frontend/src/pages/coopActivities.js; coopActivityView.js; Staff #activities and Student activity panel','backend/src/services/coopActivity.service.js → list/detail/create/update; /api/coop-activities/staff + /student','coop_activities; coop_activity_history; migration 021','backend/test/coopActivities.database.test.js; frontend/test/coopActivities.test.js; coopActivityView.test.js','E-CAL'),
7:evidence('No Staff Teacher management screen found','GET/PATCH /api/department-head/teachers belongs to Head; no Staff Teacher admin route','teachers exist; no Staff management workflow','No Staff Teacher administration acceptance found','NONE'),
}
teacher={
1:evidence('frontend/src/pages/teacherCoop.js advisor requests; teacherSupervision.js project advisees','coopProjectAdvisor.service.js → list/decide; supervision.service.js → listTeacher; no independent Teacher selection','students.coop_advisor_teacher_id; coop_project_advisor_requests','backend/test/coopProjectAdvisor.database.test.js; supervision.database.test.js'),
2:evidence('frontend/src/pages/teacherCoop.js → advisor accept/reject','coopProjectAdvisor.service.js → decide; POST /api/teachers/project-advisor-requests/:id/accept or /reject','coop_project_advisor_requests; students; teachers; migration 014','backend/test/coopProjectAdvisor.database.test.js; frontend/test/teacherCoop.test.js'),
3:evidence('frontend/src/pages/teacherCoopRequests.js own queues; teacherSupervision.js own advisees','roleWorkflow.service.js → listRequests; supervision.service.js → listTeacher; no full Teacher company directory','students; teachers; coop_requests; companies','backend/test/roleWorkflow.database.test.js; supervision.database.test.js; frontend/test/teacherCoopRequests.test.js'),
4:evidence('frontend/src/pages/teacherSupervision.js; supervisionView.js','backend/src/services/supervision.service.js → save/resend/detail; POST/PUT /api/supervision/teacher/students/:id/visits/:visit','supervision_appointments; supervision_events; supervision_tokens; migration 019','backend/test/supervision.database.test.js; supervisionRules.test.js; frontend/test/supervision.test.js','E-SUP'),
5:evidence('frontend/src/pages/teacherSupervision.js → verified Mentor acknowledgement','supervision.service.js → context/save/live; verified_at stamp checked','mentors; supervision_appointments.snapshot; supervision_events','backend/test/supervision.database.test.js; frontend/test/supervision.test.js','E-SUP'),
6:evidence('frontend/src/pages/teacherSupervision.js → substitute identity + reason','supervision.service.js → save/issue/scope; appointment-only substitute identity; recipient delivery','supervision_appointments.snapshot; supervision_tokens; original mentors row preserved','backend/test/supervision.database.test.js; supervisionRules.test.js; frontend/test/supervision.test.js','E-SUP'),
7:evidence('frontend/src/pages/supervisionResult.js; Teacher result panel','backend/src/services/supervisionResult.service.js → save/complete/image; PUT /api/supervision/teacher/students/:id/appointments/:appointment/visits/:visit/result','supervision_results; supervision_images; supervision_result_revisions; migration 020; two private images','backend/test/supervisionResults.database.test.js; supervisionResultRules.test.js; frontend/test/supervisionResult.test.js','E-RESULT'),
8:evidence('No official visit 1 PDF output','No official supervision PDF renderer/route found','Results/photos available; no PDF issuance record','No official PDF acceptance found','NONE'),
9:evidence('frontend/src/pages/supervisionResult.js → visit 2 independent result','supervisionResult.service.js → save/complete; same route with visit=2 and its own appointment','supervision_results; supervision_images; supervision_result_revisions','backend/test/supervisionResults.database.test.js; frontend/test/supervisionResult.test.js','E-RESULT'),
10:evidence('No official visit 2 PDF output','No official supervision PDF renderer/route found','Results/photos available; no PDF issuance record','No official PDF acceptance found','NONE'),
11:evidence('No final Student academic assessment screen','No final Teacher numeric assessment service/route','No final assessment model found','No numeric assessment acceptance found','NONE'),
12:evidence('No Teacher workplace evaluation form','Student companyEvaluation.service.js is owner-scoped Student feedback, separate requirement','No Teacher workplace assessment model found','No Teacher workplace acceptance found','NONE'),
13:evidence('Descriptive visit 2 result exists; numeric assessment absent','supervisionResult.service.js stores description, not numeric grades','supervision_results; no academic score table','E-RESULT descriptive result only','NONE'),
14:evidence('Book/Poster upload and descriptive results only','No committee/rubric/final artifact assessment route','student_files prerequisites; no grade/committee table','Upload/result tests do not verify final assessment','NONE'),
15:evidence('Teacher login/profile display; no self-edit form','GET /api/teachers/me; no Teacher self PATCH; Head PATCH /me separate','teachers; password_hash hidden by safe profile','backend/test/roleAuth.test.js; roleWorkflow.database.test.js; frontend/test/teacherCoop.test.js'),
16:evidence('frontend/src/pages/teacherCoopRequests.js → Class approval/rejection','roleWorkflow.service.js → authorizeRequest/reviewRequest; POST /api/teachers/coop-requests/:id/approve or /reject','coop_requests; coop_request_reviews; students.advisor_teacher_id (Class A)','backend/test/roleWorkflow.database.test.js; coopDirectWorkflow.test.js; frontend/test/teacherCoopRequests.test.js; manual checklist'),
}
head={
1:evidence('No Head Teacher directory/dashboard form','roleWorkflow.service.js → listTeachers; GET /api/department-head/teachers','teachers; department-scoped active Head','backend/test/roleWorkflow.database.test.js'),
2:evidence('frontend/src/pages/departmentHead.js reuses request queue; no standalone Student directory','GET /api/department-head/coop-requests → listRequests','students; coop_requests; Class advisor department','backend/test/roleWorkflow.database.test.js; frontend/test/departmentHead.test.js'),
3:evidence('No direct Head advisor assignment screen','PATCH /api/department-head/students/:id/coop-advisor → assignProjectAdvisor returns 409 by policy','students.coop_advisor_teacher_id; confirmed explicit advisor request canonical','backend/test/roleWorkflow.database.test.js (blocked assignment test)','NONE'),
4:evidence('No Head Teacher editing dashboard','PATCH /api/department-head/teachers/:id → updateTeacher','teachers; bcrypt hook; live Head flag + department scope','backend/test/roleWorkflow.database.test.js'),
5:evidence('Head identity display; no self-edit dashboard','GET/PATCH /api/department-head/me → profile/updateTeacher(own)','teachers','backend/test/roleWorkflow.database.test.js; frontend/test/departmentHead.test.js'),
6:evidence('frontend/src/pages/departmentHead.js → mountCoopRequestApprovals','POST /api/department-head/coop-requests/:id/approve or /reject; reviewRequest/headStudentScope','coop_requests; coop_request_reviews; teachers.is_department_head','backend/test/roleWorkflow.database.test.js; frontend/test/departmentHead.test.js; E-CANCEL API regression; manual Chrome pending'),
}
company={
1:evidence('frontend/src/recruit_student/recruit_student.html; src/pages/recruitStudent.js public no-login form','jobSubmission.service.js → createPublicJobSubmission; POST /api/job-submissions; captcha.service.js → verifyTurnstileToken','companies; job_submissions; job_postings; job_posting_work_modes; company_access_tokens','backend/test/jobSubmission.test.js; recruitmentSecurity.test.js; jobSubmission.database.test.js'),
2:evidence('No Company owner management portal','No Company own CRUD capability/account route found','companies exist; email capability only verifies submission','No Company management acceptance found','NONE'),
3:evidence('frontend/src/pages/recruitVerifyEmail.js','companyVerification.service.js → verifyCompanyEmail; GET/POST /api/job-submissions/verify-email; resend endpoint','company_access_tokens.token_hash; companies; jobs lifecycle','backend/test/recruitmentLifecycle.database.test.js; recruitmentSecurity.test.js; jobSubmission.test.js'),
}
mentor={
1:evidence('frontend/src/pages/mentorInternshipReview.js','internshipLog.service.js → scope/detail/review; /api/internship-logs/mentor/weeks/:id/review','internship_weeks; internship_week_events; internship_review_tokens','backend/test/internshipLogs.database.test.js; frontend/test/studentInternshipLog.test.js; E-DAY','E-DAY'),
2:evidence('frontend/src/pages/mentor.js original token verification form','mentorVerification.controller.js → verifyMentorToken/updateMentorProfile/confirmMentor; /api/mentor-verification','mentors.verified_at/status; mentor_tokens hash/expiry/used_at','Historical original single-use confirmation through Daily/Supervision Chrome; roleWorkflow.database.test.js','E-DAY / E-SUP'),
3:evidence('frontend/src/pages/mentorSupervision.js identity checkbox','supervision.service.js → scope; POST /api/supervision/mentor/confirm','supervision_appointments; supervision_tokens version/hash/expiry/consumed_at; supervision_events','backend/test/supervision.database.test.js; frontend/test/supervision.test.js','E-SUP'),
4:evidence('frontend/src/pages/mentorSupervision.js substitute recipient confirmation','supervision.service.js → scope; same capability bound to substitute snapshot','supervision_appointments.snapshot.attending_mentor; supervision_tokens; original Mentor unchanged','backend/test/supervision.database.test.js; E-SUP Chrome substitute scenario','E-SUP'),
5:evidence('Student daily non_working reasons; no Mentor attendance/behavior UI','internshipLog.service.js descriptive daily logs; no Mentor absence/late/leave assessment route','internship_daily_logs; no Mentor attendance/penalty model','backend/test/internshipLogRules.test.js only; no full Mentor behavior acceptance','E-DAY'),
6:evidence('Weekly textual feedback only; no final Book/work/Poster scoring','No final Mentor numeric assessment route','No final Mentor assessment table','No final numeric assessment acceptance found','NONE'),
}

rows=[]
for line in (ROOT/'README.md').read_text(encoding='utf8').splitlines():
    if not line.startswith('| 2.3.'):continue
    cells=[c.strip() for c in line.strip('|').split('|')]
    if len(cells)<6:continue
    sid,role,title,status,_,gap=cells[:6]
    if sid=='2.3.2 (8)':continue
    if sid=='2.3.6.1':
        status='BLOCKED'
        detail=evidence('No academic total-score UI; Student company feedback total is separate','No 50/50 academic score engine / validation / committee aggregation service','No academic assessment/grade/committee model found','No total-score tests found','NONE')
    else:
        n=int(re.search(r'\((\d+)\)',sid).group(1))
        group=student if sid.startswith('2.3.1.') else staff if sid.startswith('2.3.2') else teacher if sid.startswith('2.3.3.1') else head if sid.startswith('2.3.3.2') else company if sid.startswith('2.3.4') else mentor
        detail=group[n]
    if status.startswith('IMPLEMENTED'):status='IMPLEMENTED'
    if sid=='2.3.2 (2)':status='VERIFIED';gap='Verified against final disposable evidence feb769…; primary environment and fresh Chrome not rechecked; do not extend to unrelated scope'
    if sid=='2.3.2 (1)':gap='All-state queue works in final cancellation E2E; official document/placement status and primary rollout still incomplete'
    rows.append({'id':sid,'role':role,'requirement':title,'frontend':detail[0],'backend':detail[1],'database':detail[2],'tests':detail[3],'evidence':detail[4],'status':status,'gap':gap})
rows.append({'id':'USER-S-ACCOUNT','role':'Student','requirement':'จัดการบัญชีตามรายการในคำขอ (ยังไม่ทราบเลขข้อ PDF)','frontend':'frontend/src/pages/student_coop.js profile edit; login.js/logout','backend':'PUT /api/student-profile/student-info; GET /api/auth/me; no password change/recovery endpoint found','database':'students; student_profiles','tests':'backend/test/studentAdvisor.test.js; no complete account-management acceptance','evidence':'E-LOCAL','status':'PARTIAL','gap':'Confirm exact official account operations; email/password recovery/change policy and actual browser acceptance remain pending'})
counts=Counter(r['status']for r in rows)
role_counts={role:dict(Counter(r['status']for r in rows if r['role']==role))for role in sorted(set(r['role']for r in rows))}
(OUT/'evidence/requirement-matrix.json').write_text(json.dumps({'officialSource':'OFFICIAL SOURCE UNAVAILABLE','provisionalRequirementCount':len(rows),'counts':dict(counts),'roles':role_counts,'requirements':rows},ensure_ascii=False,indent=2),encoding='utf8')
md='''# FITM Scope Traceability — 2026-10-10

**OFFICIAL SOURCE UNAVAILABLE.** ไม่พบ PDF/DOC/DOCX ทก.01 ใน workspace หรือ attachment ที่ส่งมาครั้งนี้ จึงยังยืนยันเลขข้อ/จำนวนข้อย่อย/ข้อความครบตามต้นฉบับไม่ได้ ตารางนี้เป็น **provisional matrix** จากรายการในคำขอ + ตารางขอบเขตใน README ปัจจุบัน ไม่ใช่การรับรองว่าตรวจครบ PDF ทุกข้อ

มี 55 รายการจาก README หลังแยก Staff (8) ออกจาก 7 ข้อที่ผู้ใช้ระบุ และเพิ่มรายการ Student account ที่ผู้ใช้ขอแต่ไม่ทราบเลขข้อจริง 1 รายการ รวม 56 แถว provisional ไม่มีการคำนวณเปอร์เซ็นต์ความสำเร็จ

VERIFIED ใช้กับพฤติกรรมที่มีหลักฐาน disposable SQL/Chrome ตรงข้อเท่านั้น; IMPLEMENTED คือมี source/contract/persistence แต่ยังไม่ครบ acceptance; PARTIAL คือมีบางส่วน; MOCKUP คือ UI ไม่มีงานจริง; NOT STARTED คือไม่พบ implementation; BLOCKED คือขาด prerequisite; UNKNOWN คือหลักฐานไม่พอ; OUT OF SCOPE คือเพิ่มเติมที่ยืนยันว่าอยู่นอก scope. การไม่มี PDF ทำให้ **official scope reconciliation UNKNOWN** โดยไม่ลบหลักฐาน implementation ที่ตรวจพบ

## Evidence key

| Key | หลักฐานจริงและข้อจำกัด |
|---|---|
| E-LOCAL | `evidence/backend-in-process-tests.log` 203 PASS/17 SKIP; `frontend-in-process-tests.log` 253 PASS/2 SKIP; safe current units/DOM, SQL opt-ins disabled; not Chrome |
| E-CANCEL | `logs/staff-cancellation-final-feb7697070dd45d28096711142dd7830/`: 9 stages PASS, exit 0, Chrome cancellation 28 scenarios PASS, focused SQL 46 PASS, Backend 426 PASS; audit re-read `evidence/historical-evidence-review.json` |
| E-DOC | Same final run Documents 13 Chrome scenarios PASS; historical `logs/company-response-postgresql-targeted-20261008.log` 25 PASS + `company-response-real-browser-20261008.log` 12 PASS; development HTML letters only |
| E-DAY | `logs/daily-log-postgresql-final-20261008.log` 21 PASS; `daily-log-real-browser-final-20261008.log` 12 PASS; daily/weekly review subflow, not compiled logbook/numeric assessment |
| E-SUP | `logs/supervision-chrome-20261008.log` 13 PASS; final Backend run `supervision-full-regression-final-20261008.log` 320 PASS; 019 scheduling/identity/substitute subflow |
| E-RESULT | `logs/supervision-results-sql-final-20261008.log` 21 PASS; `supervision-results-chrome-final-20261008.log` 24 PASS (combined scheduling/results, overlap with E-SUP); two visits/two photos, no official PDF/grade |
| E-CAL | `logs/activity-chrome-complete-20261009.log` 13 PASS; `activity-full-regression-20261009.log` 357 Backend/215 Frontend PASS, 1 optional Frontend SKIP; earlier calendar failed attempts preserved |
| E-NLP | Static NLP API/algorithm inspected; `evidence/nlp-tests.log` says pytest unavailable. No new runtime PASS. Chatbot tests have a static lifespan setup concern |
| NONE | No relevant positive requirement acceptance found |

All historical runs use fixture data. Real recipient SMTP/CAPTCHA/provider, primary database migration state and fresh browser are not inferred from those runs. Paths below are relative to repository root; API/database details are expanded in [API/database inventory](FITM_API_DATABASE_INVENTORY_2026-10-10.md).

## Requirement matrix

| Scope ID | Requirement | Frontend | Backend | Database | Tests | Evidence | Status | Gap |
|---|---|---|---|---|---|---|---|---|
'''
for r in rows:
    vals=[r[k] for k in ['id','requirement','frontend','backend','database','tests','evidence','status','gap']]
    md+='| '+' | '.join(v.replace('|','\\|').replace('\n',' ')for v in vals)+' |\n'
md+='\n## Provisional counts\n\n| Status | Rows |\n|---|---:|\n'+''.join(f'| {k} | {counts.get(k,0)} |\n'for k in ['VERIFIED','IMPLEMENTED','PARTIAL','MOCKUP','NOT STARTED','BLOCKED','UNKNOWN','OUT OF SCOPE'])
md+='''
## UI slices and scope ambiguity (not extra official requirements)

| Item | Status | Evidence / distinction |
|---|---|---|
| Google OAuth | MOCKUP | `login.js` button only shows future integration message; `backend/src/config/oauth.js` empty; no callback/account linking/JWT provider flow |
| Homepage recommended jobs/search/filter | MOCKUP | `frontend/src/pages/index.js` hardcoded jobs; search/filter log to console; `search_company.html` absent. Student authenticated company picker is a separate implemented feature |
| Homepage chatbot widget | MOCKUP | `index.js → sendMessage` returns fixed development reply after timer; service exists but no UI/API bridge |
| Workplace transfer | MOCKUP; SCOPE UNCONFIRMED | `student_coop.js` displays “ยังไม่ได้เชื่อมต่อ Backend” with success styling; no transfer API found. Do not count as ทก.01 requirement without PDF |
| README Staff 2.3.2 (8), manage all Student scores | BLOCKED; SCOPE UNCONFIRMED | README has 8 Staff rows, while user requests 7; retain as candidate until PDF confirms. No academic score model |
| internship track, dev credential helpers, test process/evidence tooling | ADDITIONAL SCOPE / infrastructure | Existing `track=internship` and helpers are not automatically requirements of coop PDF; no separate completed internship product claim |

## Scoring audit

The **50% company / 50% department** weight is supplied by the user. README additionally describes Mentor weekly 20% + final 30%; Book 10% + Poster 5% + overall work/content 25% + examination 10%, with chair + two members. Those finer details are **README-derived, not independently confirmed against PDF**. No academic score engine, normalized maxima/rubric validation, committee aggregation, grade persistence or final grade display was found. Do not invent maxima or how committee members combine marks. `companyEvaluation.service.js` sums five Student workplace feedback scores and divides by five; that is **not** the academic 50/50 score.

To reconcile official scope later: obtain the original ทก.01, match each actual subclause and weight, resolve Staff (8)/Student account/transfer ambiguity, then revise only a new audit version with explicit evidence. Until then official completeness remains UNKNOWN.
'''
(OUT/f'FITM_SCOPE_TRACEABILITY_{DATE}.md').write_text(md,encoding='utf8')
print(json.dumps({'requirements':len(rows),'counts':dict(counts),'roleCounts':role_counts},ensure_ascii=False))
