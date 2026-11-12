# Teacher UX/UI Color + Bugfix Round 3 — Source Audit

11 พฤศจิกายน 2569 (Asia/Bangkok). **Audit findings recorded before implementation.** Baseline Local Git **25 Modified / 21 Untracked**; รักษางานเดิมทุกไฟล์. อ่าน AGENTS/Project Skill/Handoff/README/Round1–2 Audit+Retest และ Source ที่เกี่ยวข้อง. รอบนี้ Source Inspection/Contract Review/Git Diff เท่านั้น ไม่ DB/API/Browser/Build/Lint/Syntax Checks. การคำนวณ Contrast จากค่าสีเป็น Design Arithmetic ตามคำสั่งเฉพาะ ไม่ใช่ผลทดสอบ Application.

## User evidence (11 November 2026)

คำสั่ง Round3 รายงาน PASS4: R2-04 AdvisorPageSize, R2-05 StudentPopup, R2-06 PopupClose/Drafts, R2-07 StudentPageSize; FAIL3: R2-01/R2-02CoopLoad และR2-03AdvisorStatusUX; NOT TESTED3: R2-08Mentor/AcademicPeriod, R2-09ResponsivePopup, R2-10Regression. ชื่อกรณีในรายงานผู้ใช้นี้ต่างจากตารางChecklistRound2ที่Codexจัดไว้ จึงเก็บรหัส+ความหมายตามผู้ใช้ล่าสุด ไม่ย้ายผลเข้าแถวChecklistเก่าโดยเดา. CrossTeacher/BrowserContrast/Keyboard/WCAGทั้งระบบยังไม่ยืนยัน.

## Before — source findings

| Area | Evidence | Required change |
|---|---|---|
| Tokens / cascade | `teacher_coop.css:29`และ`teacher_workspace.css:2`มีTeacherTokenหลายชั้น; Primary #2457a7, Border #dfe6f0, Danger/Successแตกต่างจากSharedFeedback; TeacherSearch/View/Documentเพิ่มStylesผ่านModuleภายหลัง | CanonicalTeacherTokens+ScopedComponentVariantsที่specificityชัด โดยไม่แก้GlobalTheme/Logo/NotoSansThai/Navigation/Layoutอื่น |
| Button hierarchy | `teacher_workspace.css:71`classacceptสีน้ำเงิน ใช้ทั้งค้นหา/เปิดเมนู/บันทึก/อนุมัติ; DefaultและFilledใกล้กัน. `.app-confirm-modal__confirm`ในmain.cssเป็นDangerทุกคำยืนยัน | แยกPrimary/Secondary/Success/Danger/Neutral, ให้CallerระบุConfirmationIntent; คงHandlers/Guards/Confirmation/Draftเดิม |
| Status Card/Table | CoopCardมีparentdata-statusแต่TableBadgeไม่มีStatusMetadata; `teacher_workspace.css:88`in_progressเป็นSuccess; unknown/supersededอาจได้Warningพื้นฐาน | SharedSemanticMapping+data-toneบนBadge, in_progressInfo/unknownNeutral/approvalSuccess/rejectionDanger; ใช้ข้อความจริงเสมอ |
| Inputs / focus | Border #dfe6f0เหมาะกับDecorativeCardแต่ไม่เหมาะใช้เป็นขอบเดียวของInteractiveInput; ViewToggleใช้OpacityDisabledต่างจากปุ่มอื่น | แยกDecorativeBorderกับControlBorder, Focus3px+Offset, Active/Disabled/Loadingแยกกัน, Select/Toggle/Toasts/Modalsใช้Tokensเดียวกัน |
| Loading / motion | SharedsetButtonLoadingมีSpinnerแล้ว; SearchToolbarมีแต่setBusyซึ่งรวมModalDisabledด้วย; Feedback/ButtonsมีAnimationหลายแบบ | ใช้LoadingเฉพาะListRequestจริง ไม่แสดงSpinnerเพราะModalเปิด; respectprefers-reduced-motionและคงDoubleSubmitGuards |
| R2-01/R2-02 SQL | `coopRequest.model.js:73`statusเป็นDataTypes.ENUM; Shared`teacherSearch.service.js`ใช้`($status::text IS NULL OR r.status=$status)` ทำให้Parameterเป็นtextแต่เทียบENUMตรง ๆ. Advisorstatusเป็นSTRINGจึงไม่ติดปัญหานี้. ทุกPageSizeผ่านPredicateเดียวกันทั้งCount/Select | CaststatusColumnเป็นtextก่อนComparison คงAllowlist/BoundParams/Ownership/Pagination. เป็นTypeMismatchที่เห็นจากSource; PostgreSQL42883เป็นErrorที่คาดตามชนิดข้อมูล ไม่ใช่Log/ผลDBที่รันในรอบนี้ |
| R2-01/R2-02 diagnostics | `teacherCoopRequests.js:errorText`ใช้“โหลดหรือบันทึก…”ร่วมList/Detail/Decision ทำให้แยกHTTP/ResponseContract/Validationไม่ได้ | แยกList/Detail/SaveMessages, HTTPStatus/400/503/Network/DTOError, Retryเดิมและไม่ล้างRejectionDraftเพราะLoadError |
| R2-03 semantics | ServiceListallรวมsupersededตามRound1–2และUIมีFilterประวัติ; userRound3เปลี่ยนOperationalPolicyชัดเจน | CurrentListรวมเฉพาะpending/confirmed/rejected, เอาHistoryFilterออก, confirmedเท่านั้นใช้ข้อความ“ยืนยันรับเป็นที่ปรึกษาแล้ว”; คงDBHistory/ScopedDetailRead/AcceptRejectTransitions |

## R2-01 / R2-02 — root cause and scoped fix

Source chain: Teacher `refresh()` → `getTeacherCoopRequests()` → `GET /api/teachers/coop-requests` → role workflow list → `teacherPage('coop')`. Adapter omits `status` for all; Teacher service defaults omitted status to all and validates real status values. `page_size=10|25|50` is validated before query construction; metadata still uses `{success,data,metadata}` with total/offset/limit/years. Legacy Dashboard limit6 stays compatible. Source does not support blaming page size or all-status allowlist for the remaining Round2 failure.

The common Count and ID selection predicate was `($status::text IS NULL OR r.status=$status)`. The first cast makes the bound parameter text while `CoopRequest.status` is a PostgreSQL ENUM. The query planner must resolve ENUM=text even when the nullable all-status branch is true. This is a concrete source type mismatch affecting all sizes and specific statuses through the same query; PostgreSQL operator resolution would reject that comparison (expected 42883). **No runtime error log, HTTP result or DB query was collected this round.** Actual database schema/runtime may still reveal additional issues during user retest.

Changed comparison to `($status::text IS NULL OR r.status::text=$status::text)`. User values remain bound and service allowlisted. Count/selection use the same filters and ownership, year/semester/date/ID order still precedes LIMIT/OFFSET, hydration reassembles IDs in DB order, and DTO shape is unchanged. No model/schema/data/seed changes. Student and Advisor ownership remain independent.

Teacher frontend now separates list/detail/save errors, distinguishes API list-contract mismatch from HTTP400/404/409/503/other HTTP status/network failure, keeps session handling and existing Retry, and does not clear rejection drafts on errors. Head retains its earlier error behavior. Source update is not proof the user's two cases pass; pending Chrome evidence is sanitized URL/query + HTTP status + safe error/code if failures remain, never tokens/private bytes.

## R2-03 — current request policy

Operational Advisor List now includes only pending/confirmed/rejected at SQL level, before count and pagination. Year metadata uses the same current-record scope. Service accepts all/pending/confirmed/rejected; explicit superseded list queries are rejected rather than returning archival rows. UI filter labels are ทุกสถานะของคำขอปัจจุบัน / รอการยืนยัน / ยืนยันรับเป็นที่ปรึกษาแล้ว / ปฏิเสธแล้ว. Help text explains the three statuses covered by all. No pending-only search restriction.

Confirmed alone uses the requested confirmed label. Historical superseded remains unchanged in DB, with existing owner-scoped detail read and accurate “ประวัติคำขอที่มีรายการใหม่แทน” fallback/date if reached through an existing historical entry point. No new History UI, status conversion, update or delete. Pending-only Accept/Reject guards and transaction transitions stay unchanged. Historical exclusion intentionally lowers current-list totals where superseded rows exist; changing sort/page size alone does not change the current-list total.

## Implemented color / UX

Canonical Teacher-only CSS tokens and primary/secondary/success/danger/neutral variants cover default/hover/pressed/focus/disabled/loading; enabled input borders use #64748B instead of decorative #CBD5E1. Search/save stay blue, accept/approve/complete green, reject red; confirmation intent is opt-in and applied only on Teacher body. Existing Shared spinner/locks/drafts remain. Search spinner tracks list fetching only.

Shared presentation-only status mapping now feeds Card/Table for Coop, Advisor, Students and Documents; scheduling/result readback, Dashboard queues and shared notices use matching semantic colors and real text. Unknown/historical/draft stay neutral, in_progress info. Sidebar hover/active, drawer overlay, dialogs/toasts and view controls use the same palette without changing navigation/header/logo/font. Buttons retain 44px height, icon close targets 44px width, table actions stack, toast reserves close space, text wraps, and existing contained table scrolling remains. Teacher reduced-motion CSS and existing detail scroll calls respect the OS setting.

All selected text pairs documented in [Design Tokens](../development/TEACHER_COLOR_DESIGN_SYSTEM.md) exceed 4.5:1 by direct sRGB arithmetic; enabled boundary pairs exceed 3:1. Decorative border/surface is only 1.48:1 and is not used as sole enabled control boundary. Arithmetic is not a browser computed-style check or whole-page WCAG acceptance. Actual cascade, focus, touch, zoom and responsiveness remain pending manual retest.

## Files and scope

**Added 5:** this audit; `docs/development/TEACHER_COLOR_DESIGN_SYSTEM.md`; `docs/testing/TEACHER_UX_COLOR_ROUND3_MANUAL_RETEST.md`; `frontend/src/styles/teacher_design.css`; `frontend/src/pages/teacherStatus.js`.

**Edited 13 existing paths:** `backend/src/services/teacherSearch.service.js` (baseline untracked), `backend/src/services/coopProjectAdvisor.service.js`; `frontend/src/pages/teacherCoopRequests.js`, `teacherCoop.js`, `teacherSupervision.js`, `teacherProjectDocuments.js` (baseline untracked), `teacherSearchToolbar.js` (baseline untracked), `supervisionView.js`, `supervisionResult.js`; `frontend/src/ui/feedback.js`; `frontend/src/teacher_coop/teacher_coop.html`; `README.md`; `HANDOFF_fitm-intern.md`. No deletions. New tracked modifications only: supervisionView.js, supervisionResult.js, feedback.js. Git **25M/21U → 28M/26U**; all prior work retained.

NOT MODIFIED this round: DB data/schema/models/constraints/seeders, Synthetic35/Demo15/mentors/period values, Auth/JWT/Google/RBAC/SuperAdmin, Dashboard deep-link logic, sidebar/menu structure/navigation controller, approval/decision/supervision business logic, PDF.js/worker/private file endpoints/Student upload/Overleaf/Drive data, dependencies/secrets. Shared JS additions are Teacher-gated or presentation-only. No Commit/Push/Reset/Clean/Stash.

**Tests: NOT RUN — USER-OWNED TESTING.** Source, callers, Git diff/status and UTF-8 text reviewed only; no unit/integration/E2E/API/DB suites, API/DB calls, browser automation, build/lint/typecheck/syntax/health checks or automated application validation. Token arithmetic is the explicitly requested design calculation. No new acceptance PASS/FAIL generated.

Pending Decisions: no new policy decision; the user's Round3 current-list rule supersedes Round1–2 inclusion of superseded. Remaining Issues: R2-01/02 runtime confirmation, R2-03 user acceptance, real contrast/cascade/keyboard/responsive, preserved PASS4 regression, mentor/academic data correctness and cross-teacher access remain unverified this round. Existing academic certification policy is unchanged. See the [19-case focused checklist](../testing/TEACHER_UX_COLOR_ROUND3_MANUAL_RETEST.md).

**NEXT TASK: User Manual Chrome Retest.**
